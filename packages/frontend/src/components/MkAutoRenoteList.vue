<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps">
	<MkInfo>
		{{ i18n.ts._autoRenote.publicWarning }}<br>
		{{ i18n.ts._autoRenote.localOnlyWarning }}<br>
		{{ i18n.ts._autoRenote.stopHelp }}
	</MkInfo>
	<div v-if="!admin && usage" class="_gaps_s">
		<b>{{ i18n.ts._autoRenote.usage }} {{ usage.count }} / {{ usage.limit }}</b>
		<span>{{ usage.month }} (JST)</span>
		<MkInfo v-if="!enabled" warn>{{ i18n.ts._autoRenote.disabled }}</MkInfo>
	</div>
	<div class="_gaps_s">
		<div v-if="admin" class="_gaps_s">
			<MkInput v-model="query" type="search" @enter="applyQuery">
				<template #label>{{ i18n.ts._autoRenote.searchNoteText }}</template>
			</MkInput>
			<MkInfo v-if="queryError" warn role="alert">{{ queryError }}</MkInfo>
			<MkButton type="button" @click="applyQuery()"><i class="ti ti-search"></i> {{ i18n.ts.search }}</MkButton>
		</div>
		<MkSelect v-model="status" :items="statuses"><template #label>{{ i18n.ts._autoRenote.status }}</template></MkSelect>
		<div class="_buttons">
			<MkButton v-if="admin" @click="selectUser"><i class="ti ti-user-search"></i> {{ user ? `@${user.username}` : i18n.ts._autoRenote.userFilter }}</MkButton>
			<MkButton v-if="admin && user" @click="user = null">{{ i18n.ts._autoRenote.clearUserFilter }}</MkButton>
			<MkButton :disabled="loading" @click="load"><i class="ti ti-refresh"></i> {{ i18n.ts._autoRenote.refresh }}</MkButton>
		</div>
	</div>
	<MkLoading v-if="loading"/>
	<MkInfo v-else-if="error" warn role="alert">{{ error }}</MkInfo>
	<p v-else-if="schedules.length === 0">{{ i18n.ts._autoRenote.empty }}</p>
	<div v-else class="_gaps">
		<article v-for="schedule in schedules" :key="schedule.id" class="_panel" :class="$style.schedule" :aria-busy="busyId === schedule.id">
			<div v-if="admin" :class="$style.owner">
				<MkAvatar :user="schedule.user" :class="$style.avatar" link/>
				<MkUserName :user="schedule.user"/>
				<MkAcct :user="schedule.user"/>
			</div>
			<MkNoteSimple v-if="schedule.note" :note="schedule.note"/>
			<p v-else>{{ i18n.ts._autoRenote.noteDeleted }}</p>
			<div :class="$style.details" class="_gaps_s">
				<b>{{ autoRenoteSummary(schedule) }}</b>
				<span>{{ i18n.ts._autoRenote[schedule.status] }}</span>
				<span v-if="schedule.nextRunAt">{{ i18n.ts._autoRenote.nextRun }} {{ formatDate(schedule.nextRunAt) }} (JST)</span>
				<span v-if="schedule.lastRunAt">{{ i18n.ts._autoRenote.lastRun }} {{ formatDate(schedule.lastRunAt) }} (JST)</span>
				<MkInfo v-if="stopExplanation(schedule)" warn>{{ stopExplanation(schedule) }}</MkInfo>
				<p v-if="schedule.adminReason">{{ schedule.adminReason }}</p>
			</div>
			<div v-if="schedule.status !== 'cancelled'" class="_buttons">
				<template v-if="!admin">
					<MkButton small :disabled="busyId != null" @click="edit(schedule)"><i class="ti ti-pencil"></i> {{ i18n.ts.edit }}</MkButton>
					<MkButton v-if="schedule.status === 'active'" small :disabled="busyId != null" @click="run(schedule, 'pause')"><i class="ti ti-player-pause"></i> {{ i18n.ts._autoRenote.pause }}</MkButton>
					<MkButton v-else small primary :disabled="busyId != null || !enabled" @click="run(schedule, 'resume')"><i class="ti ti-player-play"></i> {{ i18n.ts._autoRenote.resume }}</MkButton>
				</template>
				<MkButton small danger :disabled="busyId != null" @click="cancel(schedule)"><i class="ti ti-x"></i> {{ i18n.ts._autoRenote.cancelSchedule }}</MkButton>
			</div>
		</article>
	</div>
	<div class="_buttonsCenter">
		<MkButton :disabled="loading || offset === 0" @click="offset = Math.max(0, offset - pageSize)">{{ i18n.ts._autoRenote.previous }}</MkButton>
		<MkButton :disabled="loading || schedules.length < pageSize" @click="offset += pageSize">{{ i18n.ts._autoRenote.next }}</MkButton>
	</div>
</div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import type * as Misskey from 'cherrypick-js';
import type { AutoRenoteSchedule, AutoRenoteStatus } from '@/utility/auto-renote.js';
import MkInfo from '@/components/MkInfo.vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkNoteSimple from '@/components/MkNoteSimple.vue';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { autoRenoteErrorText, autoRenoteSummary, editAutoRenote } from '@/utility/auto-renote.js';
import * as os from '@/os.js';

const props = defineProps<{ admin?: boolean }>();
const schedules = ref<AutoRenoteSchedule[]>([]);
const usage = ref<{ month: string; count: number; limit: number } | null>(null);
const enabled = ref(false);
const loading = ref(true);
const error = ref('');
const busyId = ref<string | null>(null);
const status = ref<AutoRenoteStatus | 'all'>('all');
const user = ref<Misskey.entities.UserDetailed | null>(null);
const query = ref('');
const appliedQuery = ref('');
const queryError = ref('');
const offset = ref(0);
const pageSize = 20;
let requestSerial = 0;
const statuses = [
	{ value: 'all' as const, label: i18n.ts._autoRenote.all },
	...(['active', 'paused', 'quota', 'offline', 'role', 'unavailable', 'cancelled', 'error'] as const).map(value => ({ value, label: i18n.ts._autoRenote[value] })),
];

function stopExplanation(schedule: AutoRenoteSchedule): string | null {
	const reason = schedule.stopReason ?? schedule.status;
	const reasons = i18n.ts._autoRenote._reasons;
	return Object.hasOwn(reasons, reason) ? reasons[reason as keyof typeof reasons] : null;
}

function formatDate(date: string): string {
	return new Intl.DateTimeFormat(window.document.documentElement.lang || 'ja-JP', {
		year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo',
	}).format(new Date(date));
}

async function load() {
	const serial = ++requestSerial;
	loading.value = true;
	error.value = '';
	try {
		const params = { limit: pageSize, offset: offset.value, status: status.value === 'all' ? undefined : status.value };
		if (props.admin) {
			const result = await misskeyApi('admin/auto-renote/list', { ...params, userId: user.value?.id, query: appliedQuery.value || undefined });
			if (serial !== requestSerial) return;
			schedules.value = result.schedules;
		} else {
			const result = await misskeyApi('notes/auto-renote/list', params);
			if (serial !== requestSerial) return;
			schedules.value = result.schedules;
			usage.value = result.usage;
			enabled.value = result.enabled;
		}
	} catch {
		if (serial === requestSerial) error.value = i18n.ts._autoRenote.loadFailed;
	} finally {
		if (serial === requestSerial) loading.value = false;
	}
}

function applyQuery(event?: KeyboardEvent) {
	if (event?.isComposing) return;
	event?.preventDefault();
	queryError.value = '';
	const text = query.value.trim();
	if (text.length > 200) {
		queryError.value = i18n.ts._autoRenote.searchTooLong;
		return;
	}
	appliedQuery.value = text;
	if (offset.value !== 0) offset.value = 0;
	else void load();
}

async function selectUser() {
	user.value = await os.selectUser({ localOnly: true, includeSelf: true });
}

async function edit(schedule: AutoRenoteSchedule) {
	if (busyId.value != null) return;
	busyId.value = schedule.id;
	try {
		if (await editAutoRenote({ note: schedule.note, schedule })) await load();
	} finally {
		busyId.value = null;
	}
}

async function run(schedule: AutoRenoteSchedule, action: 'pause' | 'resume' | 'cancel', reason?: string) {
	if (busyId.value != null) return;
	busyId.value = schedule.id;
	try {
		if (props.admin && action === 'cancel') {
			await misskeyApi('admin/auto-renote/cancel', { scheduleId: schedule.id, reason });
		} else {
			await misskeyApi(`notes/auto-renote/${action}`, { scheduleId: schedule.id });
		}
		await load();
	} catch (err) {
		await os.alert({ type: 'error', text: autoRenoteErrorText(err) });
	} finally {
		busyId.value = null;
	}
}

async function cancel(schedule: AutoRenoteSchedule) {
	if (props.admin) {
		const result = await os.inputText({ title: i18n.ts._autoRenote.adminReason, text: i18n.ts._autoRenote.cancelConfirm, maxLength: 500 });
		if (!result.canceled) await run(schedule, 'cancel', result.result ?? '');
	} else {
		const result = await os.confirm({ type: 'warning', text: i18n.ts._autoRenote.cancelConfirm });
		if (!result.canceled) await run(schedule, 'cancel');
	}
}

watch([status, user], () => {
	if (offset.value !== 0) offset.value = 0;
	else void load();
});
watch(offset, () => { void load(); }, { immediate: true });
onBeforeUnmount(() => { requestSerial++; });
</script>

<style module lang="scss">
.schedule {
	padding: 20px;
	display: flex;
	flex-direction: column;
	gap: 16px;
	min-width: 0;
	overflow-wrap: anywhere;
}
.owner {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
}
.avatar { width: 28px; height: 28px; }
.details { font-size: 0.9em; }
</style>
