<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady 1b): 学習を記録するコンポーザー。
  何を学んだか + 分野 + 任意の本(ページ進捗) + 学習時間 + 開始時刻 + メモ +
  この分野の得意/苦手/興味 + 公開範囲。保存で hata/hatady/logs/create に記録する。
  Hatady のテーマ(hatady-scope)で themed。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="640"
	:initialHeight="720"
	:canResize="true"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-pencil-plus"></i> {{ isEdit ? t('editTitle') : t('record') }}</template>

	<div class="hatady-scope" :data-hatady-theme="theme" :class="$style.body">
		<!-- 何を学んだ -->
		<div :class="$style.field">
			<label :class="$style.label">{{ t('whatLabel') }} <span :class="$style.req">*</span></label>
			<input v-model="title" :class="$style.input" :placeholder="t('whatPh')">
		</div>

		<!-- 分野 -->
		<div :class="$style.field">
			<label :class="$style.label">{{ t('subjectLabel') }} <span :class="$style.req">*</span></label>
			<div :class="$style.chipRow">
				<button v-for="s in subjectChoices" :key="s" :class="[$style.subjectChip, subject === s && $style.subjectChipOn]" :style="subject === s ? { background: pal(s).bg, color: pal(s).fg, borderColor: pal(s).accent } : undefined" @click="subject = s">{{ s }}</button>
				<button :class="[$style.subjectChip, $style.subjectAdd]" @click="addSubject"><i class="ti ti-plus"></i> {{ t('add') }}</button>
			</div>
		</div>

		<!-- 本(任意) -->
		<div :class="$style.field">
			<label :class="$style.label">{{ t('bookLabel') }} <span :class="$style.optional">({{ t('optional') }})</span></label>
			<div v-if="selectedBook" :class="$style.bookChip">
				<HyBookCover :title="selectedBook.title" :author="selectedBook.author" :width="32"/>
				<div :class="$style.bookInfo"><div :class="$style.bookTitle">{{ selectedBook.title }}</div><div :class="$style.bookAuthor">{{ selectedBook.author }}</div></div>
				<div :class="$style.pageBox">p. <input v-model.number="pageFrom" type="number" :class="$style.pageInput"> <i class="ti ti-arrow-right"></i> <input v-model.number="pageTo" type="number" :class="$style.pageInput"></div>
				<button :class="$style.bookClear" @click="clearBook"><i class="ti ti-x"></i></button>
			</div>
			<button v-else :class="$style.bookPick" @click="chooseBookAction($event)"><i class="ti ti-books"></i> {{ t('bookPick') }}</button>
		</div>

		<!-- 時間 -->
		<div :class="$style.row">
			<div :class="$style.field">
				<label :class="$style.label">{{ t('durationLabel') }}</label>
				<div :class="$style.inlineInput"><i class="ti ti-clock"></i> <input v-model.number="durationMinutes" type="number" min="0" :class="$style.numInput"> {{ t('min') }}</div>
			</div>
			<div :class="$style.field">
				<label :class="$style.label">{{ t('startLabel') }}</label>
				<input v-model="studiedAtLocal" type="datetime-local" :class="$style.input">
			</div>
		</div>

		<!-- メモ -->
		<div :class="$style.field">
			<label :class="$style.label">{{ t('memoLabel') }}</label>
			<textarea v-model="body" :class="$style.textarea" :placeholder="t('memoPh')" rows="3"></textarea>
		</div>

		<!-- タグ + 公開範囲 -->
		<div :class="$style.tagRow">
			<span :class="$style.tagLead">{{ t('tagLead') }}</span>
			<button v-for="tg in HY_TAGS" :key="tg.key" :class="[$style.tagChip, tag === tg.key && $style.tagChipOn]" :style="tag === tg.key ? { background: tg.bg, color: tg.fg, borderColor: tg.fg } : undefined" @click="tag = tag === tg.key ? null : tg.key">
				<i :class="['ti', tg.icon]"></i> {{ lang === 'en' ? tg.en : tg.ja }}
			</button>
			<button :class="[$style.visChip, visibility !== 'private' && $style.visChipOn]" :title="t('visHint')" @click="cycleVis">
				<i :class="visibility === 'public' ? 'ti ti-world' : (visibility === 'followers' ? 'ti ti-users' : 'ti ti-lock')"></i>
				{{ visibility === 'public' ? t('public') : (visibility === 'followers' ? t('followersOnly') : t('private')) }}
			</button>
		</div>

		<!-- フッター -->
		<div :class="$style.footer">
			<button :class="[$style.btn, $style.btnGhost]" :disabled="saving" @click="dialog?.close()">{{ t('cancel') }}</button>
			<button :class="[$style.btn, $style.btnPrimary]" :disabled="saving || !title.trim() || !subject.trim()" @click="submit"><i class="ti ti-check"></i> {{ isEdit ? t('updateBtn') : t('submit') }}</button>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { ref, useTemplateRef, onMounted } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import HyBookCover from '@/components/HyBookCover.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { hySubjectPalette, HY_TAGS } from '@/utility/hatady.js';
import { hatadyTheme, hatadyLang } from '@/utility/hatady-prefs.js';

const props = defineProps<{ editLog?: any }>();
const emit = defineEmits<{ (ev: 'done', v: any): void; (ev: 'closed'): void }>();
const dialog = useTemplateRef('dialog');
const theme = hatadyTheme;
const lang = hatadyLang;

const isEdit = props.editLog != null;
const editLog = props.editLog;

const title = ref(editLog?.title ?? '');
const subject = ref(editLog?.subject ?? '');
const subjectChoices = ref<string[]>(['プログラミング', '数学', '英語', '読書', '歴史']);
const selectedBook = ref<any>(editLog?.book ?? null);
const pageFrom = ref<number | null>(editLog?.pageFrom ?? null);
const pageTo = ref<number | null>(editLog?.pageTo ?? null);
const durationMinutes = ref<number>(editLog?.durationMinutes ?? 30);
const body = ref(editLog?.body ?? '');
const tag = ref<string | null>(editLog?.tag ?? null);
// 公開範囲: public=全体 / followers=フォロワー限定 / private=自分のみ。
type Vis = 'public' | 'followers' | 'private';
const VIS_ORDER: Vis[] = ['public', 'followers', 'private'];
const initVis: Vis = (editLog?.visibility === 'public' || editLog?.visibility === 'followers' || editLog?.visibility === 'private')
	? editLog.visibility
	: (editLog ? (editLog.isPublic ? 'public' : 'private') : 'public');
const visibility = ref<Vis>(initVis);
function cycleVis() { visibility.value = VIS_ORDER[(VIS_ORDER.indexOf(visibility.value) + 1) % VIS_ORDER.length]; }
const saving = ref(false);
const myBooks = ref<any[]>([]);

// datetime-local 用のローカル文字列(既定=今 / 編集時は元の学習時刻)。
function nowLocal(): string {
	const d = new Date();
	d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
	return d.toISOString().slice(0, 16);
}
function toLocal(iso: string): string {
	const d = new Date(iso);
	d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
	return d.toISOString().slice(0, 16);
}
const studiedAtLocal = ref(editLog?.studiedAt ? toLocal(editLog.studiedAt) : nowLocal());
if (editLog?.subject && !subjectChoices.value.includes(editLog.subject)) subjectChoices.value.unshift(editLog.subject);

const DICT: Record<string, { ja: string; en: string }> = {
	record: { ja: '学習を記録', en: 'Record study' },
	whatLabel: { ja: '何を学んだ？', en: 'What did you study?' },
	whatPh: { ja: '例: 「命名」と「関数の分割」を読み進めた', en: 'e.g. Read through "Naming" and "Functions"' },
	subjectLabel: { ja: '分野', en: 'Subject' },
	add: { ja: '追加', en: 'Add' },
	bookLabel: { ja: '本', en: 'Book' },
	optional: { ja: '任意', en: 'optional' },
	bookPick: { ja: '本を選ぶ / 追加', en: 'Pick or add a book' },
	durationLabel: { ja: '学習時間', en: 'Duration' },
	min: { ja: '分', en: 'min' },
	startLabel: { ja: '開始時刻', en: 'Started at' },
	memoLabel: { ja: 'メモ・気づき', en: 'Notes' },
	memoPh: { ja: '気づいたこと・次にやることなど', en: 'What you noticed, next steps, etc.' },
	tagLead: { ja: 'この分野は', en: 'This subject is' },
	public: { ja: 'サーバー全体に公開', en: 'Public' },
	followersOnly: { ja: 'フォロワーのみ', en: 'Followers only' },
	private: { ja: '自分のみ', en: 'Private' },
	visHint: { ja: 'クリックで公開範囲を切替(全体→フォロワー→自分のみ)', en: 'Click to change visibility' },
	cancel: { ja: 'キャンセル', en: 'Cancel' },
	submit: { ja: '記録する', en: 'Record' },
	editTitle: { ja: '学習を編集', en: 'Edit study' },
	updateBtn: { ja: '更新する', en: 'Update' },
};
function t(key: string): string { return DICT[key]?.[lang.value === 'en' ? 'en' : 'ja'] ?? key; }
function pal(s: string) { return hySubjectPalette(s); }

onMounted(async () => {
	myBooks.value = await misskeyApi('hata/hatady/books', { limit: 50 }).catch(() => []);
});

async function addSubject() {
	const { canceled, result } = await os.inputText({ title: t('subjectLabel'), placeholder: '例: 統計' });
	if (canceled || !result?.trim()) return;
	const s = result.trim();
	if (!subjectChoices.value.includes(s)) subjectChoices.value.push(s);
	subject.value = s;
}

// まず「本を選ぶ / 本を追加」を選択させ、それぞれのフローへ分岐する(メニューはボタンにアンカー)。
function chooseBookAction(ev: MouseEvent) {
	const anchor = (ev.currentTarget ?? ev.target) as HTMLElement;
	const en = lang.value === 'en';
	const items: any[] = [];
	if (myBooks.value.length > 0) {
		items.push({ text: en ? 'Pick a book' : '本を選ぶ', icon: 'ti ti-books', action: () => pickExistingBook(anchor) });
	}
	items.push({ text: en ? 'Add a book' : '本を追加', icon: 'ti ti-plus', action: () => addBook() });
	os.popupMenu(items, anchor);
}

// 既存の本から選ぶ(メニューはボタンにアンカー)。
function pickExistingBook(anchor: HTMLElement) {
	const items: any[] = myBooks.value.map(b => ({
		text: b.title + (b.author ? ` / ${b.author}` : ''),
		action: () => { selectedBook.value = b; pageFrom.value = b.currentPage || null; },
	}));
	os.popupMenu(items, anchor);
}

async function addBook() {
	// デザイン案 1i の専用モーダル(表紙プレビュー+色選択)で本を追加する。
	const { dispose } = os.popup((await import('@/components/HatadyBookForm.vue')).default, {}, {
		done: (book: any) => {
			myBooks.value.unshift(book);
			selectedBook.value = book;
			pageFrom.value = book.currentPage || null;
		},
		closed: () => dispose(),
	});
}

function clearBook() { selectedBook.value = null; pageFrom.value = null; pageTo.value = null; }

async function submit() {
	if (!title.value.trim() || !subject.value.trim()) return;
	saving.value = true;
	try {
		if (isEdit) {
			// 編集: 対応フィールド(タイトル/分野/タグ/メモ/時間/公開範囲)を更新する。
			const payload: Record<string, unknown> = {
				logId: editLog.id,
				title: title.value.trim(),
				subject: subject.value.trim(),
				durationMinutes: Number(durationMinutes.value) || 0,
				visibility: visibility.value,
				tag: tag.value ?? null,
				body: body.value.trim() || null,
			};
			const log = await misskeyApi('hata/hatady/logs/update', payload);
			os.success();
			emit('done', log);
			dialog.value?.close();
			return;
		}
		// バックエンドの ajv は nullable を解さず null を弾くため、任意項目は null を送らず「省略」する。
		//   数値入力は v-model.number が空時に "" を返すので Number 化して不正値を防ぐ。
		const payload: Record<string, unknown> = {
			title: title.value.trim(),
			subject: subject.value.trim(),
			durationMinutes: Number(durationMinutes.value) || 0,
			visibility: visibility.value,
		};
		if (tag.value) payload.tag = tag.value;
		if (body.value.trim()) payload.body = body.value.trim();
		if (selectedBook.value?.id) payload.bookId = selectedBook.value.id;
		if (pageFrom.value != null && (pageFrom.value as unknown) !== '') payload.pageFrom = Number(pageFrom.value);
		if (pageTo.value != null && (pageTo.value as unknown) !== '') payload.pageTo = Number(pageTo.value);
		if (studiedAtLocal.value) {
			const d = new Date(studiedAtLocal.value);
			if (!isNaN(d.getTime())) payload.studiedAt = d.toISOString();
		}
		const log = await misskeyApi('hata/hatady/logs/create', payload);
		os.success();
		emit('done', log);
		dialog.value?.close();
	} finally {
		saving.value = false;
	}
}
</script>

<style lang="scss" module>
.body {
	padding: 20px;
	display: flex;
	flex-direction: column;
	gap: 16px;
	background: var(--hy-bg);
	color: var(--hy-body);
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
	min-height: 100%;
	box-sizing: border-box;
}
.field { display: flex; flex-direction: column; }
.row { display: flex; gap: 14px; }
.row .field { flex: 1; }
.label { font-family: var(--hy-heading); font-size: 12px; font-weight: 700; color: var(--hy-ink); margin-bottom: 7px; }
.req { color: #d9534f; }
.optional { font-weight: 500; color: var(--hy-muted); }
.input, .textarea, .inlineInput, .numInput {
	background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 10px;
	padding: 11px 13px; font-size: 14px; color: var(--hy-ink); font-family: inherit; outline: none;
}
.input:focus, .textarea:focus { border-color: var(--hy-accent); }
.textarea { resize: vertical; line-height: 1.7; }
.inlineInput { display: flex; align-items: center; gap: 8px; font-weight: 700; }
.inlineInput i { color: var(--hy-accent); }
.numInput { width: 80px; padding: 4px 8px; text-align: right; }

.chipRow { display: flex; flex-wrap: wrap; gap: 7px; }
.subjectChip { font-size: 12px; font-weight: 700; padding: 5px 13px; border-radius: 999px; background: var(--hy-chip-bg); color: var(--hy-muted); border: 1.5px solid transparent; cursor: pointer; }
.subjectChipOn { }
.subjectAdd { border-style: dashed; border-color: var(--hy-border); color: var(--hy-muted); }

.bookChip { display: flex; align-items: center; gap: 11px; background: var(--hy-chip-bg); border: 1px solid var(--hy-border); border-radius: 10px; padding: 10px 12px; }
.bookInfo { flex: 1; min-width: 0; }
.bookTitle { font-family: var(--hy-serif); font-weight: 600; font-size: 13px; color: var(--hy-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bookAuthor { font-size: 11px; color: var(--hy-muted); }
.pageBox { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--hy-ink); background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 8px; padding: 4px 9px; }
.pageInput { width: 46px; background: none; border: none; color: var(--hy-ink); text-align: center; font-weight: 700; outline: none; }
.bookClear { background: none; border: none; color: var(--hy-muted); cursor: pointer; }
.bookPick { display: inline-flex; align-items: center; gap: 7px; background: var(--hy-chip-bg); border: 1px dashed var(--hy-border); border-radius: 10px; padding: 11px 14px; color: var(--hy-muted); cursor: pointer; font-size: 13px; align-self: flex-start; }
.bookPick:hover { border-color: var(--hy-accent); color: var(--hy-accent); }

.tagRow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tagLead { font-family: var(--hy-heading); font-size: 12px; font-weight: 700; color: var(--hy-ink); }
.tagChip { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; padding: 4px 11px; border-radius: 999px; background: var(--hy-chip-bg); color: var(--hy-muted); border: 1.5px solid transparent; cursor: pointer; }
.tagChipOn { }
.visChip { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; padding: 5px 12px; border-radius: 999px; background: var(--hy-chip-bg); border: 1px solid var(--hy-border); color: var(--hy-body); cursor: pointer; }
.visChipOn { color: #4e7d4a; }

.footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: auto; padding-top: 6px; }
.btn {
	display: inline-flex; align-items: center; gap: 6px;
	border-radius: 999px; padding: 9px 22px;
	font-weight: 700; font-family: var(--hy-heading); font-size: 14px;
	cursor: pointer; border: 1.5px solid transparent; transition: filter .15s, opacity .15s;
}
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btnGhost { background: var(--hy-surface); color: var(--hy-ink); border-color: var(--hy-border); }
.btnGhost:not(:disabled):hover { filter: brightness(0.96); }
.btnPrimary { background: linear-gradient(90deg, #e0955a, #d9824a); color: #fff; box-shadow: 0 2px 8px rgba(217,130,74,.35); }
.btnPrimary:not(:disabled):hover { filter: brightness(1.05); }
</style>
