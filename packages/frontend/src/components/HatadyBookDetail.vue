<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady 1c/1m): 本の詳細(モーダル)。
  表紙・書誌 + 読書の記録(進捗ページ・状態) + 編集/削除 + 紐づく学習ログ。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="640"
	:initialHeight="680"
	:canResize="true"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-book"></i> {{ t('title') }}</template>

	<div class="hatady-scope" :data-hatady-theme="theme" :class="$style.body">
		<div v-if="loading" :class="$style.loading">{{ t('loading') }}</div>
		<template v-else-if="book">
			<!-- ヘッダー: 表紙 + 書誌 -->
			<div :class="$style.head">
				<HyBookCover :title="book.title" :author="book.author" :colorIndex="book.coverColorIndex" :width="96" showTitle/>
				<div :class="$style.meta">
					<div :class="$style.bookTitle">{{ book.title }}</div>
					<div v-if="book.author" :class="$style.bookAuthor">{{ book.author }}</div>
					<div :class="$style.statusRow">
						<span :class="$style.statusChip" :style="statusStyle(book.status)">{{ t('status_' + book.status) }}</span>
						<span v-if="book.totalPages" :class="$style.pages">{{ book.currentPage }} / {{ book.totalPages }} p</span>
					</div>
					<div v-if="book.progress != null" :class="$style.progressWrap">
						<span :class="$style.progressBar"><span :class="$style.progressFill" :style="{ width: book.progress + '%' }"></span></span>
						<span :class="$style.progressText">{{ book.progress }}%</span>
					</div>
				</div>
			</div>

			<!-- 読書の記録(1m): 進捗ページ・状態(本人のみ) -->
			<div v-if="isMine" :class="$style.record">
				<div :class="$style.recordTitle"><i class="ti ti-bookmark"></i> {{ t('readingRecord') }}</div>
				<div v-if="book.totalPages" :class="$style.sliderRow">
					<input v-model.number="pageInput" type="range" min="0" :max="book.totalPages" :class="$style.slider">
					<span :class="$style.sliderPct">{{ pagePct }}%</span>
				</div>
				<div :class="$style.recordRow">
					<label :class="$style.recordLabel">{{ t('currentPage') }}</label>
					<input v-model.number="pageInput" type="number" min="0" :class="$style.pageInput">
					<span v-if="book.totalPages" :class="$style.recordTotal">/ {{ book.totalPages }}</span>
					<button :class="$style.recordSave" :disabled="saving" @click="saveProgress">{{ t('save') }}</button>
				</div>
				<div :class="$style.statusBtns">
					<button v-for="s in statuses" :key="s" :class="[$style.statusBtn, book.status === s && $style.statusBtnOn]" :disabled="saving" @click="setStatus(s)">{{ t('status_' + s) }}</button>
				</div>
			</div>

			<!-- しおり -->
			<div :class="$style.bmSection">
				<div :class="$style.bmHead"><i class="ti ti-bookmark"></i> {{ t('bookmarks') }} <span v-if="bookmarks.length">{{ bookmarks.length }}</span></div>
				<div v-if="bookmarks.length" :class="$style.bmList">
					<div v-for="bm in bookmarks" :key="bm.id" :class="$style.bmItem" :style="{ borderLeftColor: bmColor(bm.color) }">
						<span :class="$style.bmTag" :style="{ background: bmColor(bm.color) }"><i class="ti ti-bookmark-filled"></i></span>
						<div :class="$style.bmInfo">
							<div :class="$style.bmName">{{ bm.name || t('noName') }}</div>
							<div :class="$style.bmPage">p.{{ bm.page }}</div>
						</div>
						<button v-if="isMine" :class="$style.bmDel" @click="deleteBookmark(bm)"><i class="ti ti-x"></i></button>
					</div>
				</div>
				<div v-else-if="!isMine" :class="$style.bmEmpty">{{ t('noBookmarks') }}</div>
				<!-- 追加フォーム(本人のみ) -->
				<div v-if="isMine" :class="$style.bmAdd">
					<input v-model.number="newBmPage" type="number" min="0" :max="book.totalPages ?? undefined" :placeholder="t('page')" :class="$style.bmPageInput">
					<input v-model="newBmName" :placeholder="t('bmNamePh')" :class="$style.bmNameInput">
					<div :class="$style.bmColors">
						<button v-for="c in HY_BOOKMARK_COLORS" :key="c.key" :class="[$style.bmColor, newBmColor === c.key && $style.bmColorOn]" :style="{ background: c.color }" @click="newBmColor = c.key"></button>
					</div>
					<button :class="$style.bmAddBtn" :disabled="saving" @click="addBookmark"><i class="ti ti-plus"></i></button>
				</div>
			</div>

			<!-- モデレーター/管理者による削除(他人の本) -->
			<div v-if="!isMine && isModerator" :class="$style.actions">
				<button :class="[$style.actionBtn, $style.danger]" @click="modDeleteBook"><i class="ti ti-shield-x"></i> {{ t('modDelete') }}</button>
			</div>

			<!-- 操作(本人のみ) -->
			<div v-if="isMine" :class="$style.actions">
				<button :class="[$style.actionBtn, book.isFavorite && $style.favOn]" @click="toggleFlag('isFavorite')"><i :class="book.isFavorite ? 'ti ti-star-filled' : 'ti ti-star'"></i> {{ t('favorite') }}</button>
				<button :class="[$style.actionBtn, book.isRecommended && $style.recOn]" @click="toggleFlag('isRecommended')"><i :class="book.isRecommended ? 'ti ti-thumb-up-filled' : 'ti ti-thumb-up'"></i> {{ t('recommend') }}</button>
				<button :class="$style.actionBtn" @click="openEdit"><i class="ti ti-pencil"></i> {{ t('edit') }}</button>
				<button :class="[$style.actionBtn, $style.danger]" @click="removeBook"><i class="ti ti-trash"></i> {{ t('delete') }}</button>
			</div>

			<!-- 紐づく学習ログ -->
			<div :class="$style.logsHead"><i class="ti ti-notebook"></i> {{ t('relatedLogs') }} <span v-if="logs.length">{{ logs.length }}</span></div>
			<div v-if="logs.length === 0" :class="$style.logsEmpty">{{ t('noLogs') }}</div>
			<div v-else :class="$style.logs">
				<button v-for="log in logs" :key="log.id" :class="$style.logCard" :style="{ borderLeftColor: palAccent(log.subject) }" @click="emit('openLog', log.id)">
					<div :class="$style.logTop">
						<HySubjectBadge :subject="log.subject"/>
						<span :class="$style.logTime">{{ fmtWhen(log.studiedAt) }} · {{ fmtDuration(log.durationMinutes) }}</span>
					</div>
					<div :class="$style.logTitle">{{ log.title }}</div>
				</button>
			</div>
		</template>
		<div v-else :class="$style.loading">{{ t('notFound') }}</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import HyBookCover from '@/components/HyBookCover.vue';
import HySubjectBadge from '@/components/HySubjectBadge.vue';
import { $i } from '@/i.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { hySubjectPalette, HY_BOOKMARK_COLORS, hyBookmarkColor } from '@/utility/hatady.js';
import { hatadyTheme, hatadyLang } from '@/utility/hatady-prefs.js';

const props = defineProps<{ bookId: string }>();
const emit = defineEmits<{ (ev: 'changed'): void; (ev: 'openLog', logId: string): void; (ev: 'closed'): void }>();
const dialog = ref<any>(null);
const theme = hatadyTheme;
const lang = hatadyLang;

const book = ref<any>(null);
const logs = ref<any[]>([]);
const bookmarks = ref<any[]>([]);
const isMine = ref(false);
const isModerator = computed(() => !!(($i as any)?.isModerator || ($i as any)?.isAdmin));
const loading = ref(true);
const saving = ref(false);
const pageInput = ref<number | null>(null);
// しおり追加フォーム
const newBmPage = ref<number | null>(null);
const newBmName = ref('');
const newBmColor = ref('orange');
function bmColor(key: string | null): string { return hyBookmarkColor(key); }
const statuses = ['reading', 'finished', 'want'] as const;
const pagePct = computed(() => {
	const total = book.value?.totalPages;
	if (!total) return 0;
	return Math.min(100, Math.round(((Number(pageInput.value) || 0) / total) * 100));
});

const STATUS_COLORS: Record<string, { background: string; color: string }> = {
	reading: { background: 'rgba(217,130,74,.16)', color: '#b45f27' },
	finished: { background: 'rgba(107,142,90,.18)', color: '#4d6b3c' },
	want: { background: 'rgba(120,120,120,.16)', color: '#6b6b6b' },
};
function statusStyle(s: string) { return STATUS_COLORS[s] ?? STATUS_COLORS.reading; }

const DICT: Record<string, { ja: string; en: string }> = {
	title: { ja: '本の詳細', en: 'Book detail' },
	loading: { ja: '読み込み中…', en: 'Loading…' },
	notFound: { ja: '本が見つかりません。', en: 'Book not found.' },
	status_reading: { ja: '読書中', en: 'Reading' },
	status_finished: { ja: '読了', en: 'Finished' },
	status_want: { ja: '積読', en: 'To read' },
	readingRecord: { ja: '読書の記録', en: 'Reading record' },
	currentPage: { ja: '今のページ', en: 'Current page' },
	save: { ja: '保存', en: 'Save' },
	favorite: { ja: 'お気に入り', en: 'Favorite' },
	recommend: { ja: 'おすすめ', en: 'Recommend' },
	bookmarks: { ja: 'しおり', en: 'Bookmarks' },
	noBookmarks: { ja: 'しおりはありません。', en: 'No bookmarks.' },
	noName: { ja: '(無名のしおり)', en: '(untitled)' },
	page: { ja: 'ページ', en: 'Page' },
	bmNamePh: { ja: 'しおりの名前(任意)', en: 'Bookmark name (optional)' },
	edit: { ja: '編集', en: 'Edit' },
	delete: { ja: '削除', en: 'Delete' },
	deleteConfirm: { ja: 'この本を本棚から削除しますか？(紐づく学習記録は残ります)', en: 'Remove this book? (Linked logs are kept)' },
	modDelete: { ja: 'モデレーターとして削除', en: 'Delete as moderator' },
	modDeleteConfirm: { ja: 'モデレーターとしてこの本を削除しますか？(所有者の本棚から削除されます)', en: 'Delete this book as a moderator? (It will be removed from the owner\'s shelf)' },
	titleLabel: { ja: 'タイトル', en: 'Title' },
	authorLabel: { ja: '著者', en: 'Author' },
	pagesLabel: { ja: '総ページ数', en: 'Total pages' },
	coverColor: { ja: '表紙の色', en: 'Cover color' },
	cancel: { ja: 'キャンセル', en: 'Cancel' },
	relatedLogs: { ja: 'この本の学習', en: 'Study on this book' },
	noLogs: { ja: 'この本の学習記録はまだありません。', en: 'No study logs for this book yet.' },
};
function t(key: string): string { return DICT[key]?.[lang.value === 'en' ? 'en' : 'ja'] ?? key; }
function palAccent(subject: string): string { return hySubjectPalette(subject).accent; }
function fmtDuration(min: number): string {
	if (min < 60) return lang.value === 'en' ? `${min}m` : `${min}分`;
	const h = Math.floor(min / 60); const m = min % 60;
	return lang.value === 'en' ? `${h}h ${m}m` : `${h}時間${m}分`;
}
function fmtWhen(iso: string): string {
	const d = new Date(iso);
	return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

async function reload() {
	loading.value = true;
	try {
		const res = await misskeyApi('hata/hatady/books/show', { bookId: props.bookId }).catch(() => null) as any;
		if (res) {
			book.value = res.book;
			logs.value = res.logs ?? [];
			bookmarks.value = res.bookmarks ?? [];
			isMine.value = res.isMine;
			pageInput.value = res.book.currentPage ?? 0;
		}
	} finally {
		loading.value = false;
	}
}

async function saveProgress() {
	if (!book.value) return;
	saving.value = true;
	try {
		const b = await misskeyApi('hata/hatady/books/update', { bookId: book.value.id, currentPage: Number(pageInput.value) || 0 });
		book.value = b;
		emit('changed');
	} finally {
		saving.value = false;
	}
}

async function addBookmark() {
	if (!book.value) return;
	saving.value = true;
	try {
		const payload: Record<string, unknown> = { bookId: book.value.id, page: Number(newBmPage.value) || 0, color: newBmColor.value };
		if (newBmName.value.trim()) payload.name = newBmName.value.trim();
		const bm = await misskeyApi('hata/hatady/bookmarks/create', payload);
		// ページ順に挿入。
		bookmarks.value = [...bookmarks.value, bm].sort((a, b) => a.page - b.page);
		newBmPage.value = null;
		newBmName.value = '';
		emit('changed');
	} finally {
		saving.value = false;
	}
}

async function deleteBookmark(bm: any) {
	await misskeyApi('hata/hatady/bookmarks/delete', { bookmarkId: bm.id }).catch(() => {});
	bookmarks.value = bookmarks.value.filter(x => x.id !== bm.id);
	emit('changed');
}

async function toggleFlag(key: 'isFavorite' | 'isRecommended') {
	if (!book.value) return;
	saving.value = true;
	try {
		const b = await misskeyApi('hata/hatady/books/update', { bookId: book.value.id, [key]: !book.value[key] });
		book.value = b;
		emit('changed');
	} finally {
		saving.value = false;
	}
}

async function setStatus(s: string) {
	if (!book.value) return;
	saving.value = true;
	try {
		const b = await misskeyApi('hata/hatady/books/update', { bookId: book.value.id, status: s });
		book.value = b;
		emit('changed');
	} finally {
		saving.value = false;
	}
}

// 編集は本の新規作成と同じ 1i デザインのフォーム(編集モード)を開く。
async function openEdit() {
	if (!book.value) return;
	const { dispose } = os.popup((await import('@/components/HatadyBookForm.vue')).default, {
		editBook: book.value,
	}, {
		done: (b: any) => { book.value = { ...book.value, ...b }; emit('changed'); },
		closed: () => dispose(),
	});
}

async function removeBook() {
	if (!book.value) return;
	const { canceled } = await os.confirm({ type: 'warning', text: t('deleteConfirm') });
	if (canceled) return;
	await misskeyApi('hata/hatady/books/delete', { bookId: book.value.id }).catch(() => {});
	os.success();
	emit('changed');
	dialog.value?.close();
}

// モデレーター/管理者による他ユーザーの本の削除。
async function modDeleteBook() {
	if (!book.value) return;
	const { canceled } = await os.confirm({ type: 'warning', text: t('modDeleteConfirm') });
	if (canceled) return;
	await misskeyApi('hata/hatady/admin/delete-book', { bookId: book.value.id }).catch(() => {});
	os.success();
	emit('changed');
	dialog.value?.close();
}

onMounted(reload);
</script>

<style lang="scss" module>
.body {
	padding: 20px 22px;
	background: var(--hy-bg); color: var(--hy-body);
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
	min-height: 100%; box-sizing: border-box;
}
.loading { opacity: .6; padding: 40px 0; text-align: center; }

.head { display: flex; gap: 18px; margin-bottom: 18px; }
.head > :first-child { box-shadow: 2px 3px 10px rgba(96,70,35,.2); border-radius: 4px; flex-shrink: 0; }
.meta { flex: 1; min-width: 0; }
.bookTitle { font-family: var(--hy-serif); font-weight: 600; font-size: 18px; color: var(--hy-ink); line-height: 1.4; }
.bookAuthor { font-size: 13px; color: var(--hy-muted); margin-top: 3px; }
.statusRow { display: flex; align-items: center; gap: 10px; margin: 11px 0 8px; }
.statusChip { font-size: 12px; font-weight: 700; padding: 3px 12px; border-radius: 999px; }
.pages { font-size: 12px; color: var(--hy-muted); }
.progressWrap { display: flex; align-items: center; gap: 8px; max-width: 260px; }
.progressBar { flex: 1; height: 6px; border-radius: 999px; background: var(--hy-border); overflow: hidden; display: block; }
.progressFill { display: block; height: 100%; border-radius: 999px; background: var(--hy-accent); }
.progressText { font-size: 11px; font-weight: 700; color: var(--hy-accent-ink); }

.record { background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 12px; padding: 14px 16px; margin-bottom: 14px; }
.recordTitle { font-family: var(--hy-heading); font-weight: 700; font-size: 13px; color: var(--hy-ink); margin-bottom: 11px; }
.recordTitle i { color: var(--hy-accent); }
.sliderRow { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.slider { flex: 1; accent-color: var(--hy-accent); height: 6px; cursor: pointer; }
.sliderPct { font-size: 12.5px; font-weight: 700; color: var(--hy-accent-ink); min-width: 40px; text-align: right; }
.recordRow { display: flex; align-items: center; gap: 9px; margin-bottom: 11px; }
.recordLabel { font-size: 12.5px; color: var(--hy-body); }
.pageInput { width: 90px; background: var(--hy-bg); border: 1px solid var(--hy-border); border-radius: 8px; padding: 7px 10px; color: var(--hy-ink); font-size: 14px; outline: none; }
.pageInput:focus { border-color: var(--hy-accent); }
.recordTotal { font-size: 12.5px; color: var(--hy-muted); }
.recordSave { margin-left: auto; background: var(--hy-accent); color: #fff; border: none; border-radius: 999px; padding: 7px 16px; font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: var(--hy-heading); }
.recordSave:disabled { opacity: .5; }
.statusBtns { display: flex; gap: 7px; }
.statusBtn { flex: 1; background: var(--hy-bg); border: 1.5px solid var(--hy-border); border-radius: 999px; padding: 7px 12px; font-size: 12px; font-weight: 700; color: var(--hy-body); cursor: pointer; font-family: var(--hy-heading); }
.statusBtnOn { background: var(--hy-accent); color: #fff; border-color: transparent; }

.editForm { background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 12px; padding: 16px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.fLabel { font-family: var(--hy-heading); font-size: 12px; font-weight: 700; color: var(--hy-ink); }
.input { background: var(--hy-bg); border: 1px solid var(--hy-border); border-radius: 8px; padding: 9px 12px; color: var(--hy-ink); font-size: 14px; outline: none; font-family: inherit; }
.input:focus { border-color: var(--hy-accent); }
.swatches { display: flex; gap: 6px; flex-wrap: wrap; }
.swatch { width: 22px; height: 22px; border-radius: 5px; border: 2px solid var(--hy-surface); box-shadow: 0 0 0 1px var(--hy-border); cursor: pointer; padding: 0; }
.swatchOn { box-shadow: 0 0 0 2px var(--hy-accent); }
.editActions { display: flex; justify-content: flex-end; gap: 8px; }

/* しおり */
.bmSection { background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 12px; padding: 14px 16px; margin-bottom: 14px; }
.bmHead { font-family: var(--hy-heading); font-weight: 700; font-size: 13px; color: var(--hy-ink); margin-bottom: 11px; }
.bmHead i { color: var(--hy-accent); }
.bmList { display: flex; flex-direction: column; gap: 7px; margin-bottom: 11px; }
.bmItem { display: flex; align-items: center; gap: 10px; background: var(--hy-bg); border: 1px solid var(--hy-border); border-left: 4px solid; border-radius: 8px; padding: 7px 10px; }
.bmTag { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; color: #fff; font-size: 12px; flex-shrink: 0; }
.bmInfo { flex: 1; min-width: 0; }
.bmName { font-size: 12.5px; font-weight: 700; color: var(--hy-ink); }
.bmPage { font-size: 11px; color: var(--hy-muted); }
.bmDel { background: none; border: none; color: var(--hy-muted); cursor: pointer; font-size: 15px; }
.bmDel:hover { color: #c0563a; }
.bmEmpty { font-size: 12px; color: var(--hy-muted); margin-bottom: 4px; }
.bmAdd { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.bmPageInput { width: 74px; background: var(--hy-bg); border: 1px solid var(--hy-border); border-radius: 8px; padding: 7px 9px; color: var(--hy-ink); font-size: 13px; outline: none; }
.bmNameInput { flex: 1; min-width: 120px; background: var(--hy-bg); border: 1px solid var(--hy-border); border-radius: 8px; padding: 7px 10px; color: var(--hy-ink); font-size: 13px; outline: none; font-family: inherit; }
.bmPageInput:focus, .bmNameInput:focus { border-color: var(--hy-accent); }
.bmColors { display: flex; gap: 4px; }
.bmColor { width: 20px; height: 20px; border-radius: 999px; border: 2px solid var(--hy-surface); box-shadow: 0 0 0 1px var(--hy-border); cursor: pointer; padding: 0; }
.bmColorOn { box-shadow: 0 0 0 2px var(--hy-ink); }
.bmAddBtn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 999px; background: var(--hy-accent); color: #fff; border: none; cursor: pointer; font-size: 16px; }
.bmAddBtn:disabled { opacity: .5; }

.actions { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
.actionBtn { display: inline-flex; align-items: center; gap: 6px; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 10px; padding: 9px 16px; font-size: 13px; font-weight: 700; color: var(--hy-ink); cursor: pointer; font-family: var(--hy-heading); }
.actionBtn:hover { border-color: var(--hy-accent); }
.danger { color: #c0563a; }
.danger:hover { border-color: #c0563a; }
.favOn { color: #d9a441; border-color: #d9a441; }
.recOn { color: var(--hy-accent-ink); border-color: var(--hy-accent); }

.btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 8px 18px; font-weight: 700; font-family: var(--hy-heading); font-size: 13px; cursor: pointer; border: 1.5px solid transparent; }
.btn:disabled { opacity: .5; }
.btnGhost { background: transparent; color: var(--hy-body); }
.btnPrimary { background: linear-gradient(90deg,#e0955a,#d9824a); color: #fff; box-shadow: 0 2px 8px rgba(217,130,74,.35); }

.logsHead { font-family: var(--hy-heading); font-weight: 700; font-size: 14px; color: var(--hy-ink); margin-bottom: 12px; }
.logsHead i { color: var(--hy-accent); }
.logsEmpty { font-size: 12.5px; color: var(--hy-muted); }
.logs { display: flex; flex-direction: column; gap: 9px; }
.logCard { width: 100%; text-align: left; cursor: pointer; background: var(--hy-surface); border: 1px solid var(--hy-border); border-left: 4px solid; border-radius: 10px; padding: 11px 13px; transition: border-color .12s; }
.logCard:hover { border-color: var(--hy-accent); }
.logTop { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.logTime { margin-left: auto; font-size: 11px; color: var(--hy-muted); }
.logTitle { font-size: 13.5px; font-weight: 700; color: var(--hy-ink); line-height: 1.4; }
</style>
