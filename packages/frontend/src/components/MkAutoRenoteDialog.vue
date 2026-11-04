<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModalWindow ref="dialog" :width="520" :height="650" @close="onClose" @click="onClose" @esc="onClose" @closed="emit('closed')">
	<template #header><i class="ti ti-repeat"></i> {{ i18n.ts._autoRenote.title }}</template>
	<form class="_spacer _gaps" @submit.prevent="save">
		<MkNoteSimple v-if="targetNote" :note="targetNote" :enableNoteClick="false"/>
		<template v-if="schedule">
			<MkInput v-model="targetInput" :disabled="saving" required>
				<template #label>{{ i18n.ts._autoRenote.targetNoteId }}</template>
				<template #caption>{{ i18n.ts._autoRenote.targetNoteHelp }}</template>
			</MkInput>
			<MkButton type="button" :disabled="saving || resolving" @click="resolveTarget">{{ i18n.ts.preview }}</MkButton>
		</template>
		<MkInfo warn>{{ i18n.ts._autoRenote.publicWarning }}<br>{{ i18n.ts._autoRenote.localOnlyWarning }}</MkInfo>
		<MkSelect v-model="frequency" :items="frequencies" :disabled="saving">
			<template #label>{{ i18n.ts._autoRenote.frequency }}</template>
		</MkSelect>
		<MkSelect v-if="frequency === 'weekly'" v-model="weekday" :items="weekdays" :disabled="saving">
			<template #label>{{ i18n.ts._autoRenote.weekday }}</template>
		</MkSelect>
		<MkInput v-if="frequency === 'monthly'" v-model="day" type="number" :min="1" :max="31" :step="1" required :disabled="saving">
			<template #label>{{ i18n.ts._autoRenote.day }}</template>
		</MkInput>
		<MkInput v-model="time" type="time" required :disabled="saving">
			<template #label>{{ i18n.ts._autoRenote.time }}</template>
		</MkInput>
		<div :class="$style.nextRun" aria-live="polite">
			<span>{{ schedule && schedule.status !== 'active' ? i18n.ts._autoRenote.nextRunAfterResume : i18n.ts._autoRenote.nextRun }}</span>
			<time v-if="nextRunAt" :datetime="nextRunAt.toISOString()">{{ formattedNextRun }} (JST)</time>
			<span v-else>—</span>
		</div>
		<div class="_gaps_s" :class="$style.help">
			<p>{{ i18n.ts._autoRenote.stopHelp }}</p>
			<p>{{ i18n.ts._autoRenote.monthlyHelp }}</p>
			<p v-if="schedule && schedule.status !== 'active'">{{ i18n.ts._autoRenote.stoppedEdit }}</p>
		</div>
		<MkInfo v-if="error" warn role="alert">{{ error }}</MkInfo>
		<div class="_buttonsCenter">
			<MkButton type="submit" primary :disabled="saving">{{ i18n.ts.save }}</MkButton>
			<MkButton type="button" :disabled="saving" @click="onClose">{{ i18n.ts.cancel }}</MkButton>
		</div>
	</form>
</MkModalWindow>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import type * as Misskey from 'cherrypick-js';
import type { AutoRenoteSchedule } from '@/utility/auto-renote.js';
import type { AutoRenoteOptions } from '@/utility/auto-renote-schedule.js';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkInput from '@/components/MkInput.vue';
import MkButton from '@/components/MkButton.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkNoteSimple from '@/components/MkNoteSimple.vue';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { autoRenoteErrorText, autoRenoteWeekdays } from '@/utility/auto-renote.js';
import { parseAutoRenoteOptions, autoRenoteNoteId, nextAutoRenoteAt } from '@/utility/auto-renote-schedule.js';

const props = defineProps<{
	note?: Misskey.entities.Note | null;
	schedule?: AutoRenoteSchedule;
	draft?: AutoRenoteOptions | null;
	composer?: boolean;
}>();
const emit = defineEmits<{ done: [value: AutoRenoteOptions]; closed: [] }>();
const initial = props.schedule ?? props.draft;
const frequency = ref<AutoRenoteOptions['frequency']>(initial?.frequency ?? 'daily');
const time = ref(initial?.time ?? '09:00');
const weekday = ref(initial?.weekday ?? 0);
const day = ref(initial?.day ?? 1);
const saving = ref(false);
const error = ref('');
const targetInput = ref(props.schedule?.noteId ?? props.note?.id ?? '');
const targetNote = ref(props.note ?? null);
const resolving = ref(false);
const now = ref(Date.now());
let nextRunTimer: number | undefined;
let resolveSerial = 0;
const dialog = useTemplateRef('dialog');
const frequencies = (['daily', 'weekly', 'monthly'] as const).map(value => ({ value, label: i18n.ts._autoRenote[value] }));
const weekdays = autoRenoteWeekdays();
const nextRunAt = computed(() => {
	const value = parseAutoRenoteOptions({ frequency: frequency.value, time: time.value, weekday: weekday.value, day: day.value });
	if (!value) return null;
	const schedule = props.schedule;
	if (schedule?.status === 'active' && schedule.nextRunAt &&
		autoRenoteNoteId(targetInput.value, window.location.origin) === schedule.noteId &&
		value.frequency === schedule.frequency && value.time === schedule.time && value.weekday === schedule.weekday && value.day === schedule.day) {
		const savedNextRun = new Date(schedule.nextRunAt);
		if (savedNextRun.getTime() > now.value) return savedNextRun;
	}
	return nextAutoRenoteAt(value, new Date(now.value));
});
const formattedNextRun = computed(() => nextRunAt.value ? new Intl.DateTimeFormat(window.document.documentElement.lang || 'ja-JP', {
	year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo',
}).format(nextRunAt.value) : '');

function refreshNow() {
	if (nextRunTimer != null) window.clearTimeout(nextRunTimer);
	now.value = Date.now();
	nextRunTimer = window.setTimeout(refreshNow, 60_000 - now.value % 60_000);
}

onMounted(() => {
	refreshNow();
	window.document.addEventListener('visibilitychange', refreshNow);
});

watch(targetInput, value => {
	resolveSerial++;
	resolving.value = false;
	error.value = '';
	if (autoRenoteNoteId(value, window.location.origin) !== targetNote.value?.id) targetNote.value = null;
}, { flush: 'sync' });
onBeforeUnmount(() => {
	resolveSerial++;
	if (nextRunTimer != null) window.clearTimeout(nextRunTimer);
	window.document.removeEventListener('visibilitychange', refreshNow);
});

function onClose() {
	if (!saving.value) {
		resolveSerial++;
		dialog.value?.close();
	}
}

async function resolveTarget() {
	const serial = ++resolveSerial;
	resolving.value = true;
	error.value = '';
	try {
		const id = autoRenoteNoteId(targetInput.value, window.location.origin);
		if (!id) throw new Error('Invalid note link');
		const note = await misskeyApi('notes/show', { noteId: id });
		if (!$i || note.userId !== $i.id) throw new Error('Invalid target owner');
		if (serial === resolveSerial) targetNote.value = note;
	} catch {
		if (serial === resolveSerial) {
			targetNote.value = null;
			error.value = i18n.ts._autoRenote.ineligible;
		}
	} finally {
		if (serial === resolveSerial) resolving.value = false;
	}
}

async function save() {
	if (saving.value) return;
	const value = parseAutoRenoteOptions({ frequency: frequency.value, time: time.value, weekday: weekday.value, day: day.value });
	if (!value) {
		error.value = i18n.ts._autoRenote.invalidSchedule;
		return;
	}
	saving.value = true;
	resolveSerial++;
	resolving.value = false;
	error.value = '';
	try {
		if (!props.composer) {
			if (props.schedule) {
				const noteId = autoRenoteNoteId(targetInput.value, window.location.origin);
				if (!noteId) {
					error.value = i18n.ts._autoRenote.ineligible;
					return;
				}
				const note = targetNote.value?.id === noteId ? targetNote.value : await misskeyApi('notes/show', { noteId });
				if (!$i || note.userId !== $i.id) {
					error.value = i18n.ts._autoRenote.ineligible;
					return;
				}
				await misskeyApi('notes/auto-renote/update', { scheduleId: props.schedule.id, noteId, ...value });
			} else if (props.note) {
				if (!$i || props.note.userId !== $i.id) {
					error.value = i18n.ts._autoRenote.ineligible;
					return;
				}
				await misskeyApi('notes/auto-renote/create', { noteId: props.note.id, ...value });
			} else {
				throw new Error('Missing auto-renote target');
			}
		}
		emit('done', value);
		dialog.value?.close();
	} catch (err) {
		error.value = autoRenoteErrorText(err);
	} finally {
		saving.value = false;
	}
}
</script>

<style module lang="scss">
.nextRun {
	display: flex;
	flex-direction: column;
	gap: 4px;
	font-size: 0.9em;
	time { font-weight: bold; }
}
.help {
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 0.9em;
	line-height: 1.6;
	p { margin: 0; }
}
</style>
