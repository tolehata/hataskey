<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady): 記録の書き出しダイアログ。
  学習記録は期間を選んで人間にも読みやすい .txt、映画・ゲームは作品と記録を
  将来の読込にも拡張できる版付き .json として出力する。現時点では書き出し専用。
  実処理は utility/hatady-export.ts。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="430"
	:initialHeight="520"
	:canResize="true"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-file-download"></i> {{ copy.title }}</template>

	<div class="hatady-scope" :data-hatady-theme="theme" :class="$style.body">
		<div :class="$style.label"><i class="ti ti-package-export"></i> {{ copy.exportTarget }}</div>
		<div :class="$style.targets" role="group" :aria-label="copy.exportTarget">
			<button :class="[$style.target, target === 'learning' && $style.targetOn]" @click="target = 'learning'">
				<i class="ti ti-school"></i><span><b>{{ copy.learningLogs }}</b><small>{{ copy.learningLogsFormat }}</small></span>
			</button>
			<button :class="[$style.target, target === 'media' && $style.targetOn]" @click="target = 'media'">
				<i class="ti ti-library"></i><span><b>{{ copy.mediaRecords }}</b><small>{{ copy.mediaRecordsFormat }}</small></span>
			</button>
		</div>

		<template v-if="target === 'learning'">
		<div :class="$style.label"><i class="ti ti-calendar-search"></i> {{ copy.period }}</div>
		<div :class="$style.presets">
			<button
				v-for="p in PRESETS" :key="p.key"
				:class="[$style.chip, mode === p.key && $style.chipOn]"
				@click="setMode(p.key)"
			>{{ p.label }}</button>
		</div>

		<!-- 期間を指定 -->
		<div v-if="mode === 'custom'" :class="$style.rangeField">
			<input v-model="sinceInput" type="date" :class="$style.date" :aria-label="copy.from">
			<span :class="$style.tilde">〜</span>
			<input v-model="untilInput" type="date" :class="$style.date" :aria-label="copy.to">
		</div>

		<!-- 対象期間の確認 -->
		<div :class="$style.summary">
			<i class="ti ti-info-circle"></i>
			<span>{{ summaryText }}</span>
		</div>
		<div :class="$style.hint">{{ copy.hint }}</div>
		</template>
		<template v-else>
			<div :class="$style.summary">
				<i class="ti ti-shield-check"></i>
				<span>{{ copy.mediaSummary }}</span>
			</div>
			<div :class="$style.hint">{{ copy.mediaHint }}</div>
		</template>

		<div :class="$style.footer">
			<button :class="[$style.btn, $style.btnGhost]" :disabled="exporting" @click="dialog?.close()">{{ copy.cancel }}</button>
			<button :class="[$style.btn, $style.btnPrimary]" :disabled="exporting || !valid" @click="run">
				<i :class="['ti', exporting ? 'ti-loader-2 ' + $style.spin : 'ti-file-download']"></i>
				{{ copy.export }}
			</button>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { versatileLang } from '@@/js/intl-const.js';
import MkWindow from '@/components/MkWindow.vue';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { hatadyTheme } from '@/utility/hatady-prefs.js';
import { exportHatadyLogs, exportHatadyMediaArchive } from '@/utility/hatady-export.js';

const emit = defineEmits<{ (ev: 'closed'): void }>();
const dialog = ref<any>(null);
const theme = hatadyTheme;
const copy = i18n.ts._hata._hatady._exportDialog;

type Mode = 'all' | 'thisMonth' | 'lastMonth' | 'last30' | 'custom';
type ExportTarget = 'learning' | 'media';
const PRESETS = [
	{ key: 'all' as const, label: copy.all },
	{ key: 'thisMonth' as const, label: copy.thisMonth },
	{ key: 'lastMonth' as const, label: copy.lastMonth },
	{ key: 'last30' as const, label: copy.last30 },
	{ key: 'custom' as const, label: copy.custom },
];

const mode = ref<Mode>('all');
const target = ref<ExportTarget>('learning');
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
	if (target.value === 'media') return true;
	if (mode.value === 'all') return true;
	const { since, until } = range.value;
	if (since == null && until == null) return false;
	if (since != null && until != null && since > until) return false;
	return true;
});

const summaryText = computed(() => {
	if (mode.value === 'all') return copy.summaryAll;
	const { since, until } = range.value;
	if (since != null && until != null && since > until) return copy.invalidRange;
	if (since == null && until == null) return copy.pickDate;
	const f = (ms: number) => {
		return new Intl.DateTimeFormat(versatileLang, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(ms));
	};
	const from = since != null ? f(since) : copy.beginning;
	const to = until != null ? f(until) : copy.today;
	return i18n.tsx._hata._hatady._exportDialog.summaryRange({ from, to });
});

async function run() {
	if (exporting.value || !valid.value) return;
	exporting.value = true;
	try {
		if (target.value === 'media') {
			const result = await exportHatadyMediaArchive();
			os.toast(i18n.tsx._hata._hatady._exportDialog.exportedMediaCount({ works: result.works, sessions: result.sessions }));
		} else {
			const { count } = await exportHatadyLogs({ sinceDate: range.value.since, untilDate: range.value.until });
			os.toast(i18n.tsx._hata._hatady._exportDialog.exportedCount({ count }));
		}
		dialog.value?.close();
	} catch {
		os.alert({ type: 'error', text: copy.exportFailed });
	} finally {
		exporting.value = false;
	}
}

</script>

<style lang="scss" module>
.body {
	/*
	 * このダイアログは Hatady 本体を経由せず、旗鯖設定から単独で遅延読込される。
	 * hatady.vue のグローバルCSSチャンクへ依存させず、ここだけでテーマを成立させる。
	 */
	--hy-heading: 'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', system-ui, sans-serif;
	--hy-serif: 'Noto Serif JP', 'Hiragino Mincho ProN', serif;
	padding: 20px;
	display: flex; flex-direction: column;
	background: var(--hy-bg, var(--MI_THEME-bg)); color: var(--hy-body, var(--MI_THEME-fg));
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
	min-height: 100%; box-sizing: border-box; container-type: inline-size;
}

.body[data-hatady-theme="paper"] {
	--hy-bg: #f4ecdd;
	--hy-surface: #fffdf8;
	--hy-surface-2: #f7efdf;
	--hy-ink: #443a2c;
	--hy-body: #5d4f3d;
	--hy-muted: #a2937c;
	--hy-accent: #d9824a;
	--hy-accent-ink: #b8632f;
	--hy-border: rgba(96, 70, 35, .13);
	--hy-header-bg: #fffdf8;
	--hy-chip-bg: #f4ecdd;
}

.body[data-hatady-theme="espresso"] {
	--hy-bg: #211a14;
	--hy-surface: #2f251c;
	--hy-surface-2: #271f17;
	--hy-ink: #fbf3e8;
	--hy-body: #ecdcc6;
	--hy-muted: #cbb79a;
	--hy-accent: #f0a94e;
	--hy-accent-ink: #f4bd72;
	--hy-border: rgba(255, 255, 255, .12);
	--hy-header-bg: #2b2119;
	--hy-chip-bg: rgba(255, 255, 255, .07);
}

.body[data-hatady-theme="hataskey"] {
	--hy-bg: var(--MI_THEME-bg);
	--hy-surface: var(--MI_THEME-panel);
	--hy-surface-2: var(--MI_THEME-bg);
	--hy-ink: var(--MI_THEME-fg);
	--hy-body: var(--MI_THEME-fg);
	--hy-muted: color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent);
	--hy-accent: var(--MI_THEME-accent);
	--hy-accent-ink: var(--MI_THEME-accent);
	--hy-border: var(--MI_THEME-divider);
	--hy-header-bg: var(--MI_THEME-panel);
	--hy-chip-bg: var(--MI_THEME-buttonBg, var(--MI_THEME-bg));
}
.label { display: flex; align-items: center; gap: 6px; font-family: var(--hy-heading); font-size: 12.5px; font-weight: 700; color: var(--hy-ink); margin-bottom: 10px; }
.label i { color: var(--hy-accent); }

.targets { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 18px; }
.target {
	display: flex; align-items: center; gap: 9px; min-width: 0; padding: 11px 12px;
	background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 12px;
	color: var(--hy-body); text-align: left; cursor: pointer; font-family: inherit;
}
.target > i { flex: 0 0 auto; font-size: 20px; color: var(--hy-muted); }
.target > span { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.target b { color: var(--hy-ink); font-family: var(--hy-heading); font-size: 12.5px; }
.target small { color: var(--hy-muted); font-size: 10.5px; }
.targetOn { border-color: var(--hy-accent); background: color-mix(in srgb, var(--hy-accent) 10%, var(--hy-surface)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--hy-accent) 35%, transparent); }
.targetOn > i { color: var(--hy-accent); }

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

@container (max-width: 360px) {
	.targets { grid-template-columns: 1fr; }
}
</style>
