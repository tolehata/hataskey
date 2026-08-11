<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady P4): 自分の学習データを横断検索(モーダル)。
  ログ / 本 / 本の内容メモ / しおりメモ を1つの検索窓でまとめて検索する。
  データは hata/hatady/search から取得(2文字以上・種別フィルタ可)。
  結果クリックで対応する本の詳細を開く(本/メモ/しおり)か、その日のマイログへジャンプ(ログ)。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="520"
	:initialHeight="680"
	:canResize="true"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-search"></i> {{ copy.title }}</template>

	<div class="hatady-scope" :data-hatady-theme="theme" :class="$style.body">
		<!-- 検索バー(通常のノート検索と同じカプセル型。対象種別はバー内のプルダウンに内包) -->
		<div :class="$style.capsule">
			<button ref="scopeBtn" type="button" :class="$style.target" :aria-label="copy.scope" @click="openScopeMenu">
				<i :class="['ti', scopeIcon]"></i>
				<span :class="$style.targetLabel">{{ scopeLabel }}</span>
				<i class="ti ti-chevron-down" :class="$style.targetChevron"></i>
			</button>
			<input
				ref="inputEl"
				v-model="query"
				type="search"
				:class="$style.queryInput"
				:placeholder="copy.placeholder"
				@input="onInput"
				@keydown.enter.prevent="runSearch(true)"
			>
			<button v-if="query" type="button" :class="$style.clearBtn" tabindex="-1" :aria-label="copy.clear" @click="query = ''; results = null;"><i class="ti ti-x"></i></button>
			<button type="button" :class="$style.searchBtn" :aria-label="copy.title" @click="runSearch(true)"><i class="ti ti-search"></i></button>
		</div>

		<!-- 結果 -->
		<div :class="$style.results">
			<div v-if="query.trim().length < 2" :class="$style.hint">
				<i class="ti ti-keyboard" :class="$style.hintIcon"></i>
				<div>{{ copy.hint }}</div>
			</div>
			<div v-else-if="loading" :class="$style.loading">{{ copy.loading }}</div>
			<div v-else-if="totalCount === 0" :class="$style.empty">
				<i class="ti ti-mood-empty" :class="$style.hintIcon"></i>
				<div>{{ copy.noResults }}</div>
			</div>
			<template v-else>
				<!-- ログ -->
				<section v-if="results && results.logs.length" :class="$style.group">
					<div :class="$style.groupHead"><i class="ti ti-notebook"></i> {{ copy.logs }} <span :class="$style.groupCount">{{ results.logs.length }}</span></div>
					<button v-for="log in results.logs" :key="log.id" :class="$style.row" @click="jumpToLog(log)">
						<span :class="$style.rowIcon" :style="{ background: '#eadfce' }"><i class="ti ti-pencil"></i></span>
						<span :class="$style.rowMain">
							<span :class="$style.rowTitle" v-html="hl(log.title || copy.untitled)"></span>
							<span :class="$style.rowSub">
								<span v-if="log.subject" :class="$style.rowTag" v-html="hl(log.subject)"></span>
								{{ fmtDate(log.studiedAt) }}<span v-if="log.body"> · </span><span v-if="log.body" v-html="hl(snippet(log.body))"></span>
							</span>
						</span>
						<i class="ti ti-chevron-right" :class="$style.rowGo"></i>
					</button>
				</section>

				<!-- 本 -->
				<section v-if="results && results.books.length" :class="$style.group">
					<div :class="$style.groupHead"><i class="ti ti-book"></i> {{ copy.books }} <span :class="$style.groupCount">{{ results.books.length }}</span></div>
					<button v-for="b in results.books" :key="b.id" :class="$style.row" @click="openBook(b.id)">
						<HyBookCover :title="b.title" :author="b.author" :width="30"/>
						<span :class="$style.rowMain">
							<span :class="$style.rowTitle" v-html="hl(b.title)"></span>
							<span :class="$style.rowSub"><span v-if="b.author" v-html="hl(b.author)"></span><span v-if="b.status" :class="$style.statusPill">{{ statusLabel(b.status) }}</span></span>
						</span>
						<i class="ti ti-chevron-right" :class="$style.rowGo"></i>
					</button>
				</section>

				<!-- 本の内容メモ -->
				<section v-if="results && results.bookMemos.length" :class="$style.group">
					<div :class="$style.groupHead"><i class="ti ti-note"></i> {{ copy.bookMemos }} <span :class="$style.groupCount">{{ results.bookMemos.length }}</span></div>
					<button v-for="m in results.bookMemos" :key="m.id" :class="$style.row" @click="openBook(m.bookId)">
						<span :class="$style.rowIcon" :style="{ background: '#e5ecd8' }"><i class="ti ti-note"></i></span>
						<span :class="$style.rowMain">
							<span :class="$style.rowTitle" v-html="hl(snippet(m.text, 60))"></span>
							<span :class="$style.rowSub"><i class="ti ti-book-2"></i> {{ m.book?.title || copy.inBook }}<span v-if="m.page != null"> · {{ i18n.tsx._hata._hatady._search.pageNumber({ page: m.page.toString() }) }}</span></span>
						</span>
						<i class="ti ti-chevron-right" :class="$style.rowGo"></i>
					</button>
				</section>

				<!-- しおりメモ -->
				<section v-if="results && results.bookmarks.length" :class="$style.group">
					<div :class="$style.groupHead"><i class="ti ti-bookmark"></i> {{ copy.bookmarks }} <span :class="$style.groupCount">{{ results.bookmarks.length }}</span></div>
					<button v-for="bm in results.bookmarks" :key="bm.id" :class="$style.row" @click="openBook(bm.bookId)">
						<span :class="$style.rowIcon" :style="{ background: bmColor(bm.color) }"><i class="ti ti-bookmark-filled"></i></span>
						<span :class="$style.rowMain">
							<span :class="$style.rowTitle" v-html="hl(bm.name || snippet(bm.memo || '', 60) || copy.untitled)"></span>
							<span :class="$style.rowSub"><i class="ti ti-book-2"></i> {{ bm.book?.title || copy.inBookmark }}<span v-if="bm.memo && bm.name"> · </span><span v-if="bm.memo && bm.name" v-html="hl(snippet(bm.memo, 40))"></span><span v-if="bm.page != null"> · {{ i18n.tsx._hata._hatady._search.pageNumber({ page: bm.page.toString() }) }}</span></span>
						</span>
						<i class="ti ti-chevron-right" :class="$style.rowGo"></i>
					</button>
				</section>
			</template>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import HyBookCover from '@/components/HyBookCover.vue';
import { i18n } from '@/i18n.js';
import { hatadyTheme } from '@/utility/hatady-prefs.js';
import { versatileLang } from '@/utility/intl-const.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import * as os from '@/os.js';

const props = defineProps<{ initialQuery?: string }>();
const emit = defineEmits<{ (ev: 'closed'): void; (ev: 'jumpLog', studiedAt: string): void }>();
const dialog = ref<any>(null);
const theme = hatadyTheme;
const copy = i18n.ts._hata._hatady._search;
const dateFormatter = new Intl.DateTimeFormat(versatileLang, { year: 'numeric', month: 'short', day: 'numeric' });

type Results = { logs: any[]; books: any[]; bookMemos: any[]; bookmarks: any[] };
const TYPES = [
	{ key: 'logs', icon: 'ti-notebook' },
	{ key: 'books', icon: 'ti-book' },
	{ key: 'bookMemos', icon: 'ti-note' },
	{ key: 'bookmarks', icon: 'ti-bookmark' },
] as const;
type TypeKey = typeof TYPES[number]['key'];

const inputEl = ref<HTMLInputElement | null>(null);
const scopeBtn = ref<HTMLElement | null>(null);
const query = ref(props.initialQuery ?? '');
// 検索対象(通常のノート検索と同様、バー内プルダウンで単一選択)。'all' は全種別。
const scope = ref<'all' | TypeKey>('all');
const results = ref<Results | null>(null);
const loading = ref(false);

const totalCount = computed(() => {
	const r = results.value;
	return r ? r.logs.length + r.books.length + r.bookMemos.length + r.bookmarks.length : 0;
});
const typeLabel = (key: TypeKey): string => ({ logs: copy.logs, books: copy.books, bookMemos: copy.bookMemos, bookmarks: copy.bookmarks })[key];
const scopeLabel = computed(() => scope.value === 'all' ? copy.scopeAll : typeLabel(scope.value));
const scopeIcon = computed(() => scope.value === 'all' ? 'ti-search' : (TYPES.find(x => x.key === scope.value)?.icon ?? 'ti-search'));

function openScopeMenu() {
	const mk = (key: 'all' | TypeKey, icon: string) => ({
		text: key === 'all' ? copy.scopeAll : typeLabel(key),
		icon: `ti ${icon}`,
		active: scope.value === key,
		action: () => { scope.value = key; if (query.value.trim().length >= 2) runSearch(true); },
	});
	os.popupMenu([
		mk('all', 'ti-search'),
		...TYPES.map(ty => mk(ty.key, ty.icon)),
	], scopeBtn.value as HTMLElement);
}

let debounceId: ReturnType<typeof setTimeout> | null = null;
let seq = 0;

function onInput() {
	if (debounceId) clearTimeout(debounceId);
	debounceId = setTimeout(() => runSearch(false), 300);
}

async function runSearch(immediate: boolean) {
	if (debounceId) { clearTimeout(debounceId); debounceId = null; }
	const q = query.value.trim();
	if (q.length < 2) { results.value = null; return; }
	const mySeq = ++seq;
	loading.value = true;
	try {
		const res = await misskeyApi('hata/hatady/search', {
			query: q,
			types: scope.value === 'all' ? null : [scope.value],
			limit: 20,
		}) as Results;
		if (mySeq === seq) results.value = res;
	} catch {
		if (mySeq === seq) results.value = { logs: [], books: [], bookMemos: [], bookmarks: [] };
	} finally {
		if (mySeq === seq) loading.value = false;
	}
}

async function openBook(bookId: string | null) {
	if (!bookId) return;
	const { dispose } = os.popup((await import('@/components/HatadyBookDetail.vue')).default, { bookId }, { closed: () => dispose() });
}
function jumpToLog(log: any) {
	emit('jumpLog', log.studiedAt);
	dialog.value?.close?.();
}

// 検索語ハイライト(HTMLエスケープ後に <mark> を挿入)。
function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function hl(text: string): string {
	const q = query.value.trim();
	const safe = escapeHtml(text ?? '');
	if (q.length < 2) return safe;
	const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return safe.replace(new RegExp(`(${esc})`, 'gi'), '<mark>$1</mark>');
}
function snippet(s: string, max = 80): string {
	const one = (s ?? '').replace(/\s+/g, ' ').trim();
	return one.length > max ? one.slice(0, max) + '…' : one;
}
function fmtDate(iso: string): string {
	return dateFormatter.format(new Date(iso));
}
function statusLabel(st: string): string {
	return ({ reading: copy.statusReading, finished: copy.statusFinished, want: copy.statusWant, tsundoku: copy.statusTsundoku } as Record<string, string>)[st] ?? st;
}
function bmColor(key: string | null): string {
	const m: Record<string, string> = { red: '#f2c4bd', orange: '#f4d3b0', yellow: '#f2e6ad', green: '#cfe6c2', blue: '#c3d8ee', purple: '#d9cdec', pink: '#f3cbe0' };
	return (key && m[key]) || '#eadfce';
}

onMounted(async () => {
	await nextTick();
	inputEl.value?.focus();
	if (query.value.trim().length >= 2) runSearch(true);
});

</script>

<style lang="scss" module>
.body {
	display: flex; flex-direction: column;
	height: 100%;
	background: var(--hy-bg); color: var(--hy-body);
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
	box-sizing: border-box;
}

/* 検索バー(カプセル型: 対象プルダウン + 入力 + クリア + 検索ボタン) */
.capsule { display: flex; align-items: center; gap: 4px; margin: 16px 18px 12px; padding: 5px 6px 5px 8px; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 999px; transition: border-color .15s, box-shadow .15s; }
.capsule:focus-within { border-color: var(--hy-accent); box-shadow: 0 0 0 3px rgba(217,130,74,.15); }
.target { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; background: transparent; border: none; border-radius: 999px; font-size: 12.5px; color: var(--hy-ink); cursor: pointer; white-space: nowrap; font-family: var(--hy-heading); font-weight: 700; }
.target:hover { background: rgba(0,0,0,.05); }
.target > i:first-child { color: var(--hy-accent); }
.targetLabel { font-weight: 700; }
.targetChevron { font-size: .72em; opacity: .6; }
.queryInput { flex: 1; min-width: 0; padding: 8px 4px; background: transparent; border: none; outline: none; color: var(--hy-ink); font-size: 14.5px; font-family: inherit; }
.queryInput::placeholder { color: var(--hy-muted); }
.clearBtn { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; background: transparent; border: none; border-radius: 50%; color: var(--hy-muted); cursor: pointer; }
.clearBtn:hover { background: rgba(0,0,0,.06); color: var(--hy-ink); }
.searchBtn { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; background: var(--hy-accent); border: none; border-radius: 50%; color: #fff; cursor: pointer; flex-shrink: 0; transition: filter .1s, transform .05s; }
.searchBtn:hover { filter: brightness(1.08); }
.searchBtn:active { transform: scale(.96); }

/* 結果 */
.results { flex: 1; overflow-y: auto; padding: 8px 18px 18px; }
.hint, .loading, .empty { display: flex; flex-direction: column; align-items: center; text-align: center; color: var(--hy-muted); padding: 40px 16px; font-size: 13px; }
.hintIcon { font-size: 32px; margin-bottom: 10px; opacity: .5; }

.group { margin-bottom: 16px; }
.groupHead { display: flex; align-items: center; gap: 7px; font-family: var(--hy-heading); font-weight: 800; font-size: 12.5px; color: var(--hy-ink); margin-bottom: 8px; }
.groupHead i { color: var(--hy-accent); }
.groupCount { margin-left: auto; font-size: 11px; color: var(--hy-muted); background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 999px; padding: 1px 8px; }

.row { display: flex; align-items: center; gap: 11px; width: 100%; text-align: left; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 11px; padding: 10px 12px; margin-bottom: 6px; cursor: pointer; font-family: inherit; }
.row:hover { border-color: var(--hy-accent); }
.rowIcon { flex-shrink: 0; width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #8a6a4a; font-size: 15px; }
.rowMain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.rowTitle { font-size: 13px; font-weight: 700; color: var(--hy-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rowSub { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--hy-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rowTag { background: var(--hy-bg); border: 1px solid var(--hy-border); border-radius: 5px; padding: 0 5px; font-weight: 700; }
.statusPill { background: var(--hy-bg); border: 1px solid var(--hy-border); border-radius: 999px; padding: 0 7px; font-weight: 700; }
.rowGo { color: var(--hy-muted); flex-shrink: 0; }
.rowTitle :global(mark), .rowSub :global(mark) { background: rgba(217,130,74,.28); color: inherit; border-radius: 3px; padding: 0 1px; }
</style>
