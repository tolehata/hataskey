<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<HatadyFormWizard ref="wizard" v-model="values" :title="isEdit ? '記録を編集' : '今日の記録'" :label="type.label" :icon="type.icon" :pages="pages" :draftId="draftId" :embedded="embedded" :restore="restoreDraft" :save="save" :saveLabel="isEdit ? '変更を保存' : '記録を保存'" @done="emit('done', $event)" @closed="emit('closed')" @back="emit('back')"/>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import type { HatadyFormPage, HatadyFormValues } from '@/utility/hatady-form.js';
import type { HatadyMediaWork } from '@/utility/hatady-media.js';
import HatadyFormWizard from '@/components/HatadyFormWizard.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { HATADY_ACTIVITY_CHOICES, HATADY_RECORD_TAGS, hatadySeconds } from '@/utility/hatady-ui.js';
import { formField as f, formTimestamp, localDateTime, optionalPages, recordAttachmentPatch, restoreLegacyTime } from '@/utility/hatady-form.js';
import { hySubjects, loadHySubjects, saveHySubject } from '@/utility/hatady-subjects.js';
import * as os from '@/os.js';
const props = withDefaults(defineProps<{ editLog?: any; kind?: 'study' | 'exercise' | 'work'; work?: HatadyMediaWork | null; embedded?: boolean }>(), { embedded: false, work: null });
const emit = defineEmits<{ (event: 'done', value: any): void; (event: 'closed'): void; (event: 'back'): void }>();
const wizard = useTemplateRef('wizard'), source = props.editLog, isEdit = source != null, kind = props.kind ?? source?.kind ?? 'study';
const type = HATADY_ACTIVITY_CHOICES.find(choice => choice.value === kind) ?? HATADY_ACTIVITY_CHOICES[0];
const draftId = isEdit ? `hatady:log:edit:${source.id}` : kind === 'study' ? 'hatady:log:create' : `hatady:log:${kind}:create`;
const books = ref<any[]>([]), works = ref<HatadyMediaWork[]>([]);
const values = ref<HatadyFormValues>({
	title: source?.title ?? props.work?.title ?? '', subject: source?.subject ?? props.work?.details?.genre ?? '', bookId: source?.bookId ?? source?.book?.id ?? '', selectedBook: source?.book ?? null,
	mediaWorkId: source?.mediaWorkId ?? props.work?.id ?? '', pageFrom: source?.pageFrom ?? '', pageTo: source?.pageTo ?? '',
	durationSeconds: source ? hatadySeconds(source) : null, date: localDateTime(source?.studiedAt).slice(0, 10), startedAt: source && Object.hasOwn(source, 'startedAt') ? source.startedAt ?? '' : source?.studiedAt ? localDateTime(source.studiedAt).slice(11) : '',
	files: [...(source?.files ?? [])],
	body: source?.body ?? '', tags: Array.isArray(source?.tags) ? [...source.tags] : source?.tag ? [source.tag] : [], visibility: source?.visibility ?? (source?.isPublic === false ? 'private' : 'public'),
	calories: source?.details?.calories ?? '', place: source?.details?.place ?? '', nextStep: source?.details?.nextStep ?? '', note: source?.details?.note ?? '', pages: source?.details?.pages ?? '', spoiler: source?.details?.spoiler ?? false,
});
const subjects = computed(() => [...new Set([values.value.subject, ...hySubjects.value.map(item => item.name), 'プログラミング', '数学', '英語', '読書', '歴史'])].filter(Boolean));
const pages = computed<HatadyFormPage[]>(() => [
	{ id: 'basics', title: kind === 'exercise' ? 'どんな運動をした？' : kind === 'work' ? 'どの作業を進めた？' : '今日は、何を学んだ？', fields: [
		...(kind === 'work' ? [f('mediaWorkId', '作業', { type: 'select', options: [{ value: '', label: '作業を選ぶ' }, ...works.value.map(work => ({ value: work.id, label: work.title }))], action: { label: '作業を登録', run: addWork } })] : []),
		f('title', kind === 'exercise' ? '運動の種類' : kind === 'work' ? '今日取り組んだこと' : '学んだこと・読んだ本', { required: true, maxlength: 512, placeholder: kind === 'exercise' ? '例：ウォーキング' : kind === 'work' ? '例：トップページを整えた' : '例：気になった一節をノートに' }),
		...(kind !== 'exercise' ? [f('subject', '分野', { required: kind === 'study', maxlength: 64, suggestions: subjects.value, action: kind === 'study' ? { label: '分野を管理', run: manageSubjects } : undefined })] : []),
	] },
	...(kind === 'study' ? [{ id: 'book', title: '本と一緒に残す？', fields: [f('bookId', '本', { type: 'select', options: [{ value: '', label: '本を選ばずに記録' }, ...books.value.map(book => ({ value: book.id, label: book.title }))], action: { label: '本を登録', run: addBook } }), f('pageFrom', '読み始めたページ', { type: 'number', min: 0, max: 100000, when: data => !!data.bookId }), f('pageTo', '読み終えたページ', { type: 'number', min: 0, max: 100000, when: data => !!data.bookId })] }] : []),
	{ id: 'body', title: 'ひとこと、残そう', fields: [f('body', '内容・感想', { type: 'textarea', placeholder: '感じたことを、ひとこと。' }), f('files', '画像', { type: 'images', maxItems: 16 }), f('spoiler', 'ネタバレを含む', { type: 'checkbox' })] },
	{ id: 'time', title: 'どのくらい取り組んだ？', fields: [f('durationSeconds', kind === 'exercise' ? '運動時間' : kind === 'work' ? '作業時間' : '取り組んだ時間', { type: 'duration', min: 0, step: 1, presets: kind === 'exercise' ? [5, 15, 30, 60] : [15, 30, 60, 120] }), f('startedAt', '開始時刻', { type: 'time', step: '0.001' }), ...(kind === 'exercise' ? [f('calories', '消費カロリー（kcal）', { type: 'number', min: 0, max: 1000000, step: 1 })] : [])] },
	...(kind === 'work' ? [{ id: 'progress', title: '進み具合と次の一歩', fields: [f('tags', '作業の状態', { type: 'tags', options: HATADY_RECORD_TAGS.filter(tag => ['progress', 'smooth', 'blocked', 'review', 'doneDay', 'doneAll'].includes(tag.value)) }), f('nextStep', '次にやること', { maxlength: 240 })] }] : []),
	{ id: 'tags', title: 'どんな記録になった？', fields: [f('tags', 'この記録につけるタグ', { type: 'tags', options: HATADY_RECORD_TAGS.filter(tag => ['strength', 'weak', 'interest', 'effort', 'recommend', ...(kind === 'study' ? ['movie', 'game'] : [])].includes(tag.value)) })] },
	{ id: 'details', title: '詳しく残すことを選ぼう', choices: true, fields: [] },
	...optionalPages('context', '場所と補足', [f('place', '場所', { maxlength: 120 }), ...(kind === 'study' ? [f('pages', '読んだページの補足', { maxlength: 60 })] : []), f('note', '補足', { type: 'textarea', maxlength: 8192 })], 'ti ti-map-pin'),
	{ id: 'sharing', title: '記録日と公開範囲', fields: [f('date', '記録日', { type: 'date', required: true }), f('visibility', '記録の公開範囲', { type: 'visibility' })], description: '「自分のみ」の記録も、モデレーターは閲覧できます。' },
	{ id: 'review', title: 'この内容で残す', summary: true, fields: [] },
]);

function restoreDraft(draft: HatadyFormValues) {
	const restored = restoreLegacyTime(draft);
	if (!Object.hasOwn(restored, 'bookId') && Object.hasOwn(restored, 'selectedBook')) restored.bookId = restored.selectedBook?.id ?? '';
	return restored;
}

watch(() => values.value.bookId, (id, previous) => { const book = books.value.find(item => item.id === id); if (book) values.value.selectedBook = book; if (id !== previous && book && values.value.pageFrom === '') values.value.pageFrom = book.currentPage ?? ''; });
watch(() => values.value.mediaWorkId, id => { const work = works.value.find(item => item.id === id); if (work && !values.value.title) values.value.title = work.title; });
onMounted(async () => {
	if (kind === 'study') {
		loadHySubjects().catch(() => {});
		books.value = await (misskeyApi as any)('hata/hatady/books', { limit: 100 }).catch(() => []);
		if (source?.book && !books.value.some(book => book.id === source.book.id)) books.value.unshift(source.book);
		if (values.value.selectedBook?.id && !books.value.some(book => book.id === values.value.selectedBook.id)) books.value.unshift(values.value.selectedBook);
	}
	if (kind === 'work') {
		const response = await (misskeyApi as any)('hata/hatady/media/works/list', { kind: 'work', limit: 100 }).catch(() => []);
		works.value = Array.isArray(response) ? response : response.items ?? [];
		if (props.work && !works.value.some(work => work.id === props.work!.id)) works.value.unshift(props.work);
	}
});

async function manageSubjects() { const { dispose } = os.popup((await import('@/components/HatadySubjectManager.vue')).default, {}, { changed: () => loadHySubjects().catch(() => {}), closed: () => dispose() }); }

async function addBook() { const { dispose } = os.popup((await import('@/components/HatadyBookForm.vue')).default, {}, { done: (book: any) => { books.value.unshift(book); values.value.selectedBook = book; values.value.bookId = book.id; }, closed: () => dispose() }); }

async function addWork() { const { dispose } = os.popup((await import('@/components/HatadyMediaWorkForm.vue')).default, { kind: 'work' }, { done: (work: HatadyMediaWork) => { works.value.unshift(work); values.value.mediaWorkId = work.id; if (!values.value.title) values.value.title = work.title; }, closed: () => dispose() }); }

async function save(data: HatadyFormValues) {
	const tags = [...new Set<string>(data.tags)], legacyTag = tags.find(tag => ['strength', 'weak', 'interest', 'movie', 'game'].includes(tag)) ?? null;
	const payload = {
		...recordAttachmentPatch(data.files, source),
		...(isEdit ? { logId: source.id } : {}), kind, title: data.title.trim(), subject: (kind === 'exercise' ? source?.subject || '運動' : data.subject).trim() || '作業',
		tags, tag: legacyTag, body: data.body.trim() || null, visibility: data.visibility, durationSeconds: data.durationSeconds, startedAt: data.startedAt || null,
		studiedAt: formTimestamp(data.date, source?.studiedAt), bookId: kind === 'study' && data.bookId ? data.bookId : null, mediaWorkId: kind === 'work' && data.mediaWorkId ? data.mediaWorkId : null,
		pageFrom: data.bookId && data.pageFrom !== '' && data.pageFrom != null ? Number(data.pageFrom) : null, pageTo: data.bookId && data.pageTo !== '' && data.pageTo != null ? Number(data.pageTo) : null,
		details: { ...source?.details, place: data.place, note: data.note, spoiler: data.spoiler, ...(kind === 'exercise' ? { calories: data.calories === '' || data.calories == null ? null : Number(data.calories) } : kind === 'work' ? { nextStep: data.nextStep } : { pages: data.pages }) },
	};
	const result = await (misskeyApi as any)(isEdit ? 'hata/hatady/logs/update' : 'hata/hatady/logs/create', payload);
	if (kind === 'study') saveHySubject(data.subject.trim(), null).catch(() => {});
	return result;
}

defineExpose({ requestClose: () => wizard.value?.requestClose() });
</script>
