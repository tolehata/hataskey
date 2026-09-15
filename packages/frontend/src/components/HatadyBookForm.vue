<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<HatadyFormWizard ref="wizard" v-model="values" :title="isEdit ? '本の情報を編集' : '本を加える'" label="本" icon="ti ti-book" :pages="pages" :draftId="`hatady:book:${isEdit ? `edit:${source.id}` : 'create'}`" :embedded="embedded" :restore="restoreDraft" :save="save" :saveLabel="isEdit ? '変更を保存' : 'コレクションに加える'" @done="emit('done', $event)" @closed="emit('closed')" @back="emit('back')"/>
</template>
<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef } from 'vue';
import type { HatadyFormPage, HatadyFormValues } from '@/utility/hatady-form.js';
import HatadyFormWizard from '@/components/HatadyFormWizard.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { formField as f, formTimestamp, localDateTime, optionalPages, saveBookNotes } from '@/utility/hatady-form.js';
const props = withDefaults(defineProps<{ editBook?: any; embedded?: boolean }>(), { embedded: false });
const emit = defineEmits<{ (event: 'done', value: any): void; (event: 'closed'): void; (event: 'back'): void }>();
const wizard = useTemplateRef('wizard'), source = props.editBook, isEdit = source != null;
const api = misskeyApi as unknown as (endpoint: string, payload: Record<string, unknown>) => Promise<any>;
const clone = (value: any) => JSON.parse(JSON.stringify(value));
let notesReady = !isEdit || Array.isArray(source?.bookmarks) && Array.isArray(source?.memos), draftHasNotes = false;
const values = ref<HatadyFormValues>({
	title: source?.title ?? '', author: source?.author ?? '', genre: source?.details?.genre ?? '', totalPages: source?.totalPages ?? '', currentPage: source?.currentPage ?? 0,
	status: source?.status ?? 'want', colorIndex: source?.coverColorIndex ?? null, isFavorite: source?.isFavorite ?? false, isRecommended: source?.isRecommended ?? false,
	visibility: source?.visibility ?? (isEdit ? 'public' : 'private'), description: source?.details?.description ?? '', memo: source?.details?.memo ?? '', finishedAt: source?.finishedAt ? localDateTime(source.finishedAt).slice(0, 10) : '',
	bookmarks: clone(source?.bookmarks ?? []), memos: clone(source?.memos ?? []), _bookmarksBaseline: clone(source?.bookmarks ?? []), _memosBaseline: clone(source?.memos ?? []),
});
const pages: HatadyFormPage[] = [
	{ id: 'basics', title: '気になるひとつを、残そう', fields: [f('title', '本のタイトル', { required: true, maxlength: 512, placeholder: '例：夜を編む庭' }), f('genre', 'ジャンル', { maxlength: 64 }), f('author', '著者', { maxlength: 256 })] },
	{ id: 'status', title: '今、どんな一冊？', fields: [f('status', '今の状態', { type: 'choice', options: [{ value: 'want', label: '読みたい', icon: 'ti ti-bookmark' }, { value: 'reading', label: '読書中', icon: 'ti ti-book' }, { value: 'finished', label: '読了', icon: 'ti ti-check' }, { value: 'tsundoku', label: '積読', icon: 'ti ti-books' }] }), f('isFavorite', 'お気に入り', { type: 'checkbox' }), f('isRecommended', 'おすすめ', { type: 'checkbox' })] },
	{ id: 'details', title: '残したい情報を選ぶ', choices: true, fields: [] },
	...optionalPages('progress', '読書の進み具合', [f('currentPage', '読んだページ', { type: 'number', min: 0, max: 100000 }), f('totalPages', '総ページ数', { type: 'number', min: 1, max: 100000 }), f('finishedAt', '読了日', { type: 'date' })], 'ti ti-book'),
	...optionalPages('bookmarks', 'しおり', [f('bookmarks', 'しおり', { type: 'bookmarks' })], 'ti ti-bookmark'),
	...optionalPages('memos', 'ページのメモ', [f('memos', 'ページのメモ', { type: 'memos' })], 'ti ti-pencil'),
	...optionalPages('description', '作品の紹介', [f('description', '説明', { type: 'textarea', maxlength: 8192 })]),
	...optionalPages('memo', '自分だけのメモ', [f('memo', '自分だけのメモ', { type: 'textarea', maxlength: 8192 })], 'ti ti-lock'),
	...optionalPages('cover', '表紙の色', [f('colorIndex', '表紙の色', { type: 'color' })], 'ti ti-palette'),
	{ id: 'sharing', title: '誰に見せる？', summary: true, fields: [f('visibility', '本の公開範囲', { type: 'visibility' })] },
];

function restoreDraft(draft: HatadyFormValues) {
	draftHasNotes = Array.isArray(draft.bookmarks) || Array.isArray(draft.memos);
	if (draft.savedBookId) notesReady = true;
	return { ...draft, colorIndex: Object.hasOwn(draft, 'colorIndex') ? draft.colorIndex : Object.hasOwn(draft, 'coverColorIndex') ? draft.coverColorIndex : values.value.colorIndex };
}

onMounted(async () => {
	if (notesReady) return;
	try {
		const response = await api('hata/hatady/books/show', { bookId: source.id });
		const untouched = !wizard.value?.hasChanges();
		if (!draftHasNotes) { values.value.bookmarks = clone(response.bookmarks ?? []); values.value.memos = clone(response.memos ?? []); }
		if (!draftHasNotes || !values.value._bookmarksBaseline?.length) values.value._bookmarksBaseline = clone(response.bookmarks ?? []);
		if (!draftHasNotes || !values.value._memosBaseline?.length) values.value._memosBaseline = clone(response.memos ?? []);
		notesReady = true;
		await nextTick(); if (untouched && !wizard.value?.restored) wizard.value?.resetBaseline();
	} catch { /* Saving remains guarded; unread notes can never become an empty replacement. */ }
});

async function save(data: HatadyFormValues) {
	if (!notesReady) throw new Error('一部のしおり・メモを読み込めませんでした。画面を開き直してください');
	const bookId = data.savedBookId || source?.id;
	const payload = {
		title: data.title.trim(), author: data.author.trim() || null, totalPages: data.totalPages === '' || data.totalPages == null ? null : Number(data.totalPages), currentPage: Number(data.currentPage) || 0,
		status: data.status, coverColorIndex: data.colorIndex, isFavorite: data.isFavorite, isRecommended: data.isRecommended, visibility: data.visibility,
		finishedAt: data.finishedAt ? formTimestamp(data.finishedAt, source?.finishedAt) : null,
		details: { ...source?.details, genre: data.genre, description: data.description, memo: data.memo },
	};
	const book = await api(bookId ? 'hata/hatady/books/update' : 'hata/hatady/books/create', { ...payload, ...(bookId ? { bookId } : {}) });
	data.savedBookId = book.id;
	try { await saveBookNotes(data, book.id, api); } catch { throw new Error('一部のしおり・メモを保存できませんでした。入力と保存済みの内容を保ったまま、もう一度保存できます'); }
	return { ...book, bookmarks: data.bookmarks, memos: data.memos };
}

defineExpose({ requestClose: () => wizard.value?.requestClose() });
</script>
