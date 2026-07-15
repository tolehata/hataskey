<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady): 学習記録の書き出し(期間指定)ダイアログ。
  すべての期間 / 今月 / 先月 / 過去30日 / 期間を指定 から選び、人間にも読みやすい .txt を出力する。
  実処理は utility/hatady-export.ts の exportHatadyLogs()。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="430"
	:initialHeight="470"
	:canResize="true"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-file-download"></i> {{ t('title') }}</template>

	<div class="hatady-scope" :data-hatady-theme="theme" :class="$style.body">
		<div :class="$style.label"><i class="ti ti-calendar-search"></i> {{ t('period') }}</div>
		<div :class="$style.presets">
			<button
				v-for="p in PRESETS" :key="p.key"
				:class="[$style.chip, mode === p.key && $style.chipOn]"
				@click="setMode(p.key)"
			>{{ t(p.key) }}</button>
		</div>

		<!-- 期間を指定 -->
		<div v-if="mode === 'custom'" :class="$style.rangeField">
			<input v-model="sinceInput" type="date" :class="$style.date" :aria-label="t('from')">
			<span :class="$style.tilde">〜</span>
			<input v-model="untilInput" type="date" :class="$style.date" :aria-label="t('to')">
		</div>

		<!-- 対象期間の確認 -->
		<div :class="$style.summary">
			<i class="ti ti-info-circle"></i>
			<span>{{ summaryText }}</span>
		</div>
		<div :class="$style.hint">{{ t('hint') }}</div>

		<div :class="$style.footer">
			<button :class="[$style.btn, $style.btnGhost]" :disabled="exporting" @click="dialog?.close()">{{ t('cancel') }}</button>
			<button :class="[$style.btn, $style.btnPrimary]" :disabled="exporting || !valid" @click="run">
				<i :class="['ti', exporting ? 'ti-loader-2 ' + $style.spin : 'ti-file-download']"></i>
				{{ t('export') }}
			</button>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import * as os from '@/os.js';
import { hatadyTheme, hatadyEffectiveLang } from '@/utility/hatady-prefs.js';
import { exportHatadyLogs } from '@/utility/hatady-export.js';

const emit = defineEmits<{ (ev: 'closed'): void }>();
const dialog = ref<any>(null);
const theme = hatadyTheme;
const lang = hatadyEffectiveLang;

type Mode = 'all' | 'thisMonth' | 'lastMonth' | 'last30' | 'custom';
const PRESETS = [
	{ key: 'all' as const },
	{ key: 'thisMonth' as const },
	{ key: 'lastMonth' as const },
	{ key: 'last30' as const },
	{ key: 'custom' as const },
];

const mode = ref<Mode>('all');
const sinceInput = ref('');
const untilInput = ref('');
const exporting = ref(false);

function pad(n: number): string { return n.toString().padStart(2, '0'); }
function toInput(d: Date): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
// YYYY-MM-DD → その日の 00:00 のエポックms(終端は exportHatadyLogs 側で日末まで含める)。
function dayStartMs(v: string): number | null {
	if (!v) return null;
	const [y, m, d] = v.split('-').map(Number);
	if (!y || !m || !d) return null;
	return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

// プリセット選択時は日付欄も埋めて、何が対象かを目に見えるようにする。
function setMode(m: Mode) {
	mode.value = m;
	const now = new Date();
	if (m === 'thisMonth') {
		sinceInput.value = toInput(new Date(now.getFullYear(), now.getMonth(), 1));
		untilInput.value = toInput(new Date(now.getFullYear(), now.getMonth() + 1, 0));
	} else if (m === 'lastMonth') {
		sinceInput.value = toInput(new Date(now.getFullYear(), now.getMonth() - 1, 1));
		untilInput.value = toInput(new Date(now.getFullYear(), now.getMonth(), 0));
	} else if (m === 'last30') {
		const s = new Date(now); s.setDate(s.getDate() - 29);
		sinceInput.value = toInput(s);
		untilInput.value = toInput(now);
	} else if (m === 'all') {
		sinceInput.value = ''; untilInput.value = '';
	}
}

const range = computed<{ since: number | null; until: number | null }>(() => {
	if (mode.value === 'all') return { since: null, until: null };
	return { since: dayStartMs(sinceInput.value), until: dayStartMs(untilInput.value) };
});
// 「期間を指定」は少なくとも片方の日付が要る。開始>終了は不可。
const valid = computed(() => {
	if (mode.value === 'all') return true;
	const { since, until } = range.value;
	if (since == null && until == null) return false;
	if (since != null && until != null && since > until) return false;
	return true;
});

const summaryText = computed(() => {
	if (mode.value === 'all') return t('summaryAll');
	const { since, until } = range.value;
	if (since != null && until != null && since > until) return t('invalidRange');
	if (since == null && until == null) return t('pickDate');
	const f = (ms: number) => {
		const d = new Date(ms);
		return lang.value === 'en'
			? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
			: `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
	};
	const a = since != null ? f(since) : t('beginning');
	const b = until != null ? f(until) : t('today');
	return `${a} 〜 ${b}`;
});

async function run() {
	if (exporting.value || !valid.value) return;
	exporting.value = true;
	try {
		const { count } = await exportHatadyLogs({ sinceDate: range.value.since, untilDate: range.value.until, lang: lang.value });
		os.toast(lang.value === 'en' ? `Exported ${count} entries.` : `${count}件を書き出しました。`);
		dialog.value?.close();
	} catch {
		os.alert({ type: 'error', text: lang.value === 'en' ? 'Export failed.' : '書き出しに失敗しました。' });
	} finally {
		exporting.value = false;
	}
}

const DICT: Record<string, { ja: string; en: string }> = {
	title: { ja: '記録の書き出し', en: 'Export records' },
	period: { ja: '対象の期間', en: 'Period' },
	all: { ja: 'すべての期間', en: 'All time' },
	thisMonth: { ja: '今月', en: 'This month' },
	lastMonth: { ja: '先月', en: 'Last month' },
	last30: { ja: '過去30日', en: 'Last 30 days' },
	custom: { ja: '期間を指定', en: 'Custom' },
	from: { ja: '開始日', en: 'From' },
	to: { ja: '終了日', en: 'To' },
	summaryAll: { ja: 'これまでのすべての学習記録を書き出します。', en: 'Exports all of your study records.' },
	pickDate: { ja: '開始日か終了日を選んでください。', en: 'Pick a start or end date.' },
	invalidRange: { ja: '開始日が終了日より後になっています。', en: 'The start date is after the end date.' },
	beginning: { ja: '最初', en: 'the beginning' },
	today: { ja: '今日', en: 'today' },
	hint: { ja: '人間にも読みやすい .txt 形式で、日付ごとにまとめて出力します。', en: 'Exports a human-readable .txt grouped by day.' },
	cancel: { ja: 'キャンセル', en: 'Cancel' },
	export: { ja: '書き出す', en: 'Export' },
};
function t(key: string): string { return DICT[key]?.[lang.value] ?? key; }
</script>

<style lang="scss" module>
.body {
	padding: 20px;
	display: flex; flex-direction: column;
	background: var(--hy-bg); color: var(--hy-body);
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
	min-height: 100%; box-sizing: border-box;
}
.label { display: flex; align-items: center; gap: 6px; font-family: var(--hy-heading); font-size: 12.5px; font-weight: 700; color: var(--hy-ink); margin-bottom: 10px; }
.label i { color: var(--hy-accent); }

.presets { display: flex; flex-wrap: wrap; gap: 7px; }
.chip { background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 999px; padding: 6px 14px; font-size: 12px; font-weight: 700; color: var(--hy-muted); cursor: pointer; font-family: var(--hy-heading); }
.chip:hover { border-color: var(--hy-accent); }
.chipOn { background: var(--hy-accent); border-color: var(--hy-accent); color: #fff; }

.rangeField { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
.date { flex: 1; min-width: 0; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 10px; padding: 9px 11px; font-size: 13px; color: var(--hy-ink); font-family: inherit; }
.date:focus { border-color: var(--hy-accent); outline: none; }
.tilde { color: var(--hy-muted); font-size: 12px; flex-shrink: 0; }

.summary { display: flex; align-items: flex-start; gap: 8px; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 10px; padding: 10px 12px; font-size: 12px; line-height: 1.6; color: var(--hy-ink); margin-top: 16px; }
.summary i { color: var(--hy-accent); margin-top: 1px; flex-shrink: 0; }
.hint { font-size: 11px; color: var(--hy-muted); line-height: 1.6; margin-top: 8px; }

.footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: auto; padding-top: 16px; }
.btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 9px 20px; font-weight: 700; font-family: var(--hy-heading); font-size: 13.5px; cursor: pointer; border: 1.5px solid transparent; }
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btnGhost { background: var(--hy-surface); color: var(--hy-ink); border-color: var(--hy-border); }
.btnPrimary { background: linear-gradient(90deg, #e0955a, #d9824a); color: #fff; box-shadow: 0 2px 8px rgba(217,130,74,.35); }
.btnPrimary:not(:disabled):hover { filter: brightness(1.05); }
.spin { animation: hy-exp-spin .8s linear infinite; }
@keyframes hy-exp-spin { to { transform: rotate(360deg); } }
</style>
