<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<HatadyFormWizard ref="wizard" v-model="values" :title="isEdit ? '記録を編集' : '今日の記録'" :label="workKind === 'movie' ? '映画' : 'ゲーム'" :icon="workKind === 'movie' ? 'ti ti-movie' : 'ti ti-device-gamepad-2'" :summaryTitle="workTitle" :pages="pages" :draftId="draftId" :embedded="embedded" :restore="restoreDraft" :save="save" :saveLabel="isEdit ? '変更を保存' : '記録を保存'" @done="emit('done', $event)" @closed="emit('closed')" @back="emit('back')"/>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue';
import type { HatadyMediaWork, HatadyMediaSession, HatadyMediaSessionKind, HatadyMediaSuggestions } from '@/utility/hatady-media.js';
import type { HatadyFormPage, HatadyFormValues } from '@/utility/hatady-form.js';
import HatadyFormWizard from '@/components/HatadyFormWizard.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { collectMediaSessionSuggestions, normalizeMediaSessions } from '@/utility/hatady-media.js';
import { HATADY_RECORD_TAGS, hatadySeconds } from '@/utility/hatady-ui.js';
import { formField as f, formTimestamp, localDateTime, restoreLegacyTime } from '@/utility/hatady-form.js';
import { initialSessionDetails, sessionDetailPages, sessionDetailsPayload, SESSION_TYPE_OPTIONS } from '@/utility/hatady-session-form.js';
const props = withDefaults(defineProps<{ work: HatadyMediaWork | null; editSession?: HatadyMediaSession; embedded?: boolean }>(), { embedded: false });
const emit = defineEmits<{ (event: 'done', value: HatadyMediaSession): void; (event: 'closed'): void; (event: 'back'): void }>();
const wizard = useTemplateRef('wizard'), source = props.editSession, isEdit = source != null;
const workKind = props.work?.kind === 'movie' || source?.kind === 'movie_viewing' ? 'movie' : 'game';
const workTitle = props.work?.title ?? String(source?.workSnapshot?.title ?? '作品の記録');
const draftId = isEdit ? `hatady:media-session:edit:${source.id}` : `hatady:media-session:create:${props.work?.id}`;
const values = ref<HatadyFormValues>({
	...initialSessionDetails(source), sessionKind: source?.kind ?? (workKind === 'movie' ? 'movie_viewing' : 'game_play'),
	date: localDateTime(source?.occurredAt).slice(0, 10), startedAt: source && Object.hasOwn(source, 'startedAt') ? source.startedAt ?? '' : source?.occurredAt ? localDateTime(source.occurredAt).slice(11) : '',
	durationSeconds: source ? hatadySeconds(source) : workKind === 'movie' && props.work?.runtimeMinutes != null ? props.work.runtimeMinutes * 60 : null,
	note: source?.note ?? '', noteSpoiler: source?.noteSpoiler ?? false, tags: [...(source?.tags ?? [])], visibility: source?.visibility ?? 'private',
	viewingMode: source?.details?.viewingMode ?? props.work?.viewingMode ?? '', __results: {},
});
const suggestions = ref<HatadyMediaSuggestions>({});
const pages = computed<HatadyFormPage[]>(() => [
	...(workKind === 'game' ? [{ id: 'type', title: 'どんなふうに遊んだ？', description: workTitle, fields: [f('sessionKind', '記録の種類', { type: 'choice', required: true, disabled: isEdit, options: SESSION_TYPE_OPTIONS })] }] : []),
	{ id: 'note', title: 'ひとこと、残そう', description: workTitle, fields: [f('note', '内容・感想', { type: 'textarea', placeholder: '感じたことを、ひとこと。' }), f('noteSpoiler', 'ネタバレを含む', { type: 'checkbox' })] },
	{ id: 'time', title: 'どのくらい取り組んだ？', fields: [f('durationSeconds', workKind === 'movie' ? '鑑賞時間' : 'プレイ時間', { type: 'duration', min: 0, step: 1, presets: workKind === 'movie' ? [30, 60, 90, 120] : [15, 30, 60, 120] }), f('startedAt', '開始時刻', { type: 'time', step: '0.001' })] },
	{ id: 'tags', title: 'どんな記録になった？', fields: [f('tags', 'この記録につけるタグ', { type: 'tags', options: HATADY_RECORD_TAGS.filter(tag => ['strength', 'weak', 'interest', 'effort', 'recommend'].includes(tag.value)) })] },
	{ id: 'details', title: '詳しく残すことを選ぼう', choices: true, fields: [] },
	...sessionDetailPages(workKind, suggestions.value),
	{ id: 'sharing', title: '記録日と公開範囲', fields: [f('date', '記録日', { type: 'date', required: true }), f('visibility', '記録の公開範囲', { type: 'visibility' })], description: '「自分のみ」の記録も、モデレーターは閲覧できます。' },
	{ id: 'review', title: 'この内容で残す', summary: true, fields: [] },
]);
let restoring = false;

function restoreDraft(stored: HatadyFormValues) { restoring = true; nextTick(() => { restoring = false; }); return { ...restoreLegacyTime(stored), __results: stored.__results ?? {} }; }

watch(() => values.value.sessionKind, (kind, previous) => { if (restoring) return; values.value.__results[previous] = values.value.result; values.value.result = values.value.__results[kind] ?? ''; });
onMounted(async () => { if (props.work?.id) suggestions.value = collectMediaSessionSuggestions(normalizeMediaSessions(await (misskeyApi as any)('hata/hatady/media/sessions/list', { workId: props.work.id, limit: 100 }).catch(() => []))); });

async function save(data: HatadyFormValues) {
	const kind: HatadyMediaSessionKind = source?.kind ?? data.sessionKind;
	return await (misskeyApi as any)(isEdit ? 'hata/hatady/media/sessions/update' : 'hata/hatady/media/sessions/create', {
		...(isEdit ? { sessionId: source.id } : { workId: props.work?.id, kind }),
		occurredAt: formTimestamp(data.date, source?.occurredAt), durationSeconds: data.durationSeconds, startedAt: data.startedAt || null,
		note: data.note.trim() || null, noteSpoiler: data.noteSpoiler, tags: [...new Set(data.tags)], visibility: data.visibility,
		details: sessionDetailsPayload(workKind, kind, data, source?.details ?? {}),
	});
}

defineExpose({ requestClose: () => wizard.value?.requestClose() });
</script>
