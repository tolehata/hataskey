<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady P6): 統計深掘り(モーダル)。
  月別学習時間 / 曜日別 / 時間帯別 / 分野推移 / 自己ベスト / 月別読了 を可視化する。
  データは hata/hatady/stats-detail から取得(months 指定・既定6ヶ月)。
  依存ライブラリを増やさず、素の CSS/インライン SVG バーで描画する。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="600"
	:initialHeight="720"
	:canResize="true"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-chart-histogram"></i> {{ copy.title }}</template>

	<div class="hatady-scope" :data-hatady-theme="theme" :class="$style.body">
		<!-- 期間セレクタ -->
		<div :class="$style.rangeRow">
			<button
				v-for="m in RANGES" :key="m"
				:class="[$style.rangeChip, months === m && $style.rangeChipOn]"
				@click="setMonths(m)"
			>{{ i18n.tsx._hata._hatady._statsDetail.rangeMonths({ months: m.toString() }) }}</button>
		</div>

		<div v-if="loading" :class="$style.loading">{{ copy.loading }}</div>
		<template v-else-if="data">
			<!-- 自己ベスト -->
			<div :class="$style.bests">
				<div :class="$style.bestCard"><div :class="$style.bestNum">{{ fmtDur(data.bests.longestSession) }}</div><div :class="$style.bestLbl"><i class="ti ti-clock-play"></i> {{ copy.longestSession }}</div></div>
				<div :class="$style.bestCard"><div :class="$style.bestNum">{{ fmtDur(data.bests.maxDayMinutes) }}</div><div :class="$style.bestLbl"><i class="ti ti-calendar-star"></i> {{ copy.maxDay }}</div></div>
				<div :class="$style.bestCard"><div :class="$style.bestNum">{{ data.bests.longestStreak }}<span :class="$style.bestUnit">{{ copy.dayUnit }}</span></div><div :class="$style.bestLbl"><i class="ti ti-flame"></i> {{ copy.longestStreak }}</div></div>
			</div>

			<!-- 月別学習時間 -->
			<section :class="$style.section">
				<div :class="$style.secHead"><i class="ti ti-chart-bar"></i> {{ copy.monthly }}</div>
				<div v-if="monthlyMax === 0" :class="$style.noData">{{ copy.noData }}</div>
				<div v-else :class="$style.barChart">
					<div v-for="mo in data.monthlyTotals" :key="mo.month" :class="$style.barCol">
						<span :class="$style.barVal">{{ mo.minutes > 0 ? fmtDurShort(mo.minutes) : '' }}</span>
						<span :class="$style.barTrack">
							<span :class="$style.barFill" :style="{ height: pct(mo.minutes, monthlyMax) + '%' }"></span>
						</span>
						<span :class="$style.barLbl">{{ moLabel(mo.month) }}</span>
					</div>
				</div>
			</section>

			<!-- 曜日別 -->
			<section :class="$style.section">
				<div :class="$style.secHead"><i class="ti ti-calendar-week"></i> {{ copy.weekday }}</div>
				<div :class="$style.wdRow">
					<div v-for="(min, i) in data.weekdayMinutes" :key="i" :class="$style.wdCol">
						<span :class="$style.wdTrack"><span :class="$style.wdFill" :style="{ height: pct(min, weekdayMax) + '%', background: i === 0 || i === 6 ? '#d98a5a' : 'var(--hy-accent)' }"></span></span>
						<span :class="$style.wdLbl">{{ weekdayLabels[i] }}</span>
					</div>
				</div>
			</section>

			<!-- 時間帯別 -->
			<section :class="$style.section">
				<div :class="$style.secHead"><i class="ti ti-clock-hour-4"></i> {{ copy.hourly }}</div>
				<div :class="$style.hourRow">
					<span
						v-for="(min, h) in data.hourlyMinutes" :key="h"
						:class="$style.hourCell"
						:style="{ background: heatColor(min, hourlyMax) }"
						:title="`${h}:00 — ${fmtDur(min)}`"
					>{{ h % 6 === 0 ? h : '' }}</span>
				</div>
				<div :class="$style.hourLegend"><span>0</span><span>6</span><span>12</span><span>18</span><span>23</span></div>
			</section>

			<!-- 分野推移 -->
			<section v-if="data.subjectTrend.length" :class="$style.section">
				<div :class="$style.secHead"><i class="ti ti-chart-dots"></i> {{ copy.subjectTrend }}</div>
				<div v-for="(s, si) in data.subjectTrend" :key="s.subject" :class="$style.trendRow">
					<div :class="$style.trendHead">
						<span :class="$style.trendDot" :style="{ background: subjColor(si) }"></span>
						<span :class="$style.trendName">{{ s.subject }}</span>
						<span :class="$style.trendTotal">{{ fmtDur(subjTotal(s)) }}</span>
					</div>
					<div :class="$style.spark">
						<span
							v-for="(mm, mi) in s.monthly" :key="mi"
							:class="$style.sparkBar"
							:style="{ height: pct(mm.minutes, subjectMax) + '%', background: subjColor(si), opacity: mm.minutes > 0 ? 1 : 0.15 }"
							:title="`${moLabel(mm.month)} — ${fmtDur(mm.minutes)}`"
						></span>
					</div>
				</div>
			</section>

			<!-- 月別読了 -->
			<section :class="$style.section">
				<div :class="$style.secHead"><i class="ti ti-book-upload"></i> {{ copy.finished }}</div>
				<div v-if="finishedMax === 0 && pagesMax === 0" :class="$style.noData">{{ copy.noData }}</div>
				<div v-else :class="$style.finRow">
					<div v-for="mo in data.monthlyFinished" :key="mo.month" :class="$style.finCol">
						<span :class="$style.finBooks">{{ mo.books > 0 ? mo.books : '' }}</span>
						<span :class="$style.finTrack"><span :class="$style.finFill" :style="{ height: pct(mo.books, Math.max(1, finishedMax)) + '%' }"></span></span>
						<span :class="$style.finLbl">{{ moLabel(mo.month) }}</span>
					</div>
				</div>
				<div v-if="pagesMax > 0" :class="$style.pagesNote"><i class="ti ti-file-text"></i> {{ i18n.tsx._hata._hatady._statsDetail.totalPagesValue({ label: copy.totalPages, count: numberFormatter.format(totalPages) }) }}</div>
			</section>
		</template>
		<div v-else :class="$style.loading">{{ copy.noData }}</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import { i18n } from '@/i18n.js';
import { hatadyTheme, hatadyTzOffset } from '@/utility/hatady-prefs.js';
import { versatileLang } from '@/utility/intl-const.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const emit = defineEmits<{ (ev: 'closed'): void }>();
const dialog = ref<any>(null);
const theme = hatadyTheme;
const copy = i18n.ts._hata._hatady._statsDetail;
const monthFormatter = new Intl.DateTimeFormat(versatileLang, { month: 'short' });
const weekdayFormatter = new Intl.DateTimeFormat(versatileLang, { weekday: 'narrow' });
const numberFormatter = new Intl.NumberFormat(versatileLang);
const weekdayLabels = Array.from({ length: 7 }, (_, i) => weekdayFormatter.format(new Date(2024, 0, 7 + i)));

type Data = {
	monthlyTotals: { month: string; minutes: number; count: number }[];
	weekdayMinutes: number[];
	hourlyMinutes: number[];
	subjectTrend: { subject: string; monthly: { month: string; minutes: number }[] }[];
	bests: { longestSession: number; maxDayMinutes: number; longestStreak: number };
	monthlyFinished: { month: string; books: number; pages: number }[];
};
const RANGES = [3, 6, 12] as const;
const months = ref(6);
const loading = ref(true);
const data = ref<Data | null>(null);

const SUBJ_COLORS = ['#d9824a', '#5a9a8a', '#c9a55a', '#8a7ab3', '#c96a7a'];

async function load() {
	loading.value = true;
	try {
		data.value = await misskeyApi('hata/hatady/stats-detail', { months: months.value, tzOffset: hatadyTzOffset() });
	} catch { data.value = null; } finally { loading.value = false; }
}
function setMonths(m: number) { if (months.value === m) return; months.value = m; load(); }
onMounted(load);

const monthlyMax = computed(() => Math.max(0, ...(data.value?.monthlyTotals.map(m => m.minutes) ?? [0])));
const weekdayMax = computed(() => Math.max(1, ...(data.value?.weekdayMinutes ?? [0])));
const hourlyMax = computed(() => Math.max(1, ...(data.value?.hourlyMinutes ?? [0])));
const subjectMax = computed(() => {
	let mx = 0;
	for (const s of data.value?.subjectTrend ?? []) for (const mm of s.monthly) mx = Math.max(mx, mm.minutes);
	return Math.max(1, mx);
});
const finishedMax = computed(() => Math.max(0, ...(data.value?.monthlyFinished.map(m => m.books) ?? [0])));
const pagesMax = computed(() => Math.max(0, ...(data.value?.monthlyFinished.map(m => m.pages) ?? [0])));
const totalPages = computed(() => (data.value?.monthlyFinished.reduce((a, b) => a + b.pages, 0) ?? 0));

function subjTotal(s: Data['subjectTrend'][number]): number { return s.monthly.reduce((a, b) => a + b.minutes, 0); }
function subjColor(i: number): string { return SUBJ_COLORS[i % SUBJ_COLORS.length]; }
function pct(v: number, max: number): number { return max <= 0 ? 0 : Math.max(v > 0 ? 4 : 0, Math.round((v / max) * 100)); }
function heatColor(v: number, max: number): string {
	if (v <= 0) return 'var(--hy-border)';
	const r = Math.min(1, v / max);
	// 薄い→濃いアクセント。
	const a = 0.18 + r * 0.82;
	return `rgba(217,130,74,${a.toFixed(2)})`;
}
function moLabel(mk: string): string {
	const [y, m] = mk.split('-').map(Number);
	return monthFormatter.format(new Date(y, m - 1, 1));
}
function fmtDur(min: number): string {
	if (min <= 0) return i18n.tsx._hata._hatady._statsDetail.durationMinutes({ minutes: '0' });
	const h = Math.floor(min / 60); const m = min % 60;
	if (h > 0 && m > 0) return i18n.tsx._hata._hatady._statsDetail.durationHoursMinutes({ hours: h.toString(), minutes: m.toString() });
	if (h > 0) return i18n.tsx._hata._hatady._statsDetail.durationHours({ hours: h.toString() });
	return i18n.tsx._hata._hatady._statsDetail.durationMinutes({ minutes: m.toString() });
}
function fmtDurShort(min: number): string {
	const h = Math.floor(min / 60);
	if (h >= 1) return i18n.tsx._hata._hatady._statsDetail.durationHoursShort({ hours: h.toString() });
	return i18n.tsx._hata._hatady._statsDetail.durationMinutesShort({ minutes: min.toString() });
}
</script>

<style lang="scss" module>
.body {
	padding: 18px 20px 24px;
	background: var(--hy-bg); color: var(--hy-body);
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
	min-height: 100%; box-sizing: border-box;
}
.loading { text-align: center; color: var(--hy-muted); padding: 40px 0; font-size: 13px; }
.noData { text-align: center; color: var(--hy-muted); padding: 18px 0; font-size: 12px; }

/* 期間 */
.rangeRow { display: flex; justify-content: center; gap: 7px; margin-bottom: 18px; }
.rangeChip { background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 999px; padding: 5px 14px; font-size: 12px; font-weight: 700; color: var(--hy-muted); cursor: pointer; font-family: var(--hy-heading); }
.rangeChip:hover { border-color: var(--hy-accent); }
.rangeChipOn { background: var(--hy-accent); border-color: var(--hy-accent); color: #fff; }

/* 自己ベスト */
.bests { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
.bestCard { text-align: center; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 13px; padding: 14px 8px; }
.bestNum { font-family: var(--hy-heading); font-weight: 900; font-size: 22px; color: var(--hy-accent-ink); }
.bestUnit { font-size: 13px; margin-left: 2px; }
.bestLbl { display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 10.5px; color: var(--hy-muted); margin-top: 3px; }
.bestLbl i { color: var(--hy-accent); }

/* セクション */
.section { margin-bottom: 22px; }
.secHead { display: flex; align-items: center; gap: 7px; font-family: var(--hy-heading); font-weight: 800; font-size: 13px; color: var(--hy-ink); margin-bottom: 12px; }
.secHead i { color: var(--hy-accent); }

/* 月別バー */
.barChart { display: flex; align-items: flex-end; gap: 6px; height: 130px; }
.barCol { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; min-width: 0; }
.barVal { font-size: 9.5px; color: var(--hy-muted); height: 14px; }
.barTrack { width: 100%; max-width: 34px; flex: 1; display: flex; align-items: flex-end; background: linear-gradient(var(--hy-surface), var(--hy-surface)); border-radius: 6px 6px 0 0; }
.barFill { width: 100%; background: linear-gradient(180deg, #f0b46a, #d9824a); border-radius: 6px 6px 0 0; transition: height .4s cubic-bezier(.34,1.2,.64,1); min-height: 0; }
.barLbl { font-size: 10px; color: var(--hy-muted); margin-top: 5px; white-space: nowrap; }

/* 曜日 */
.wdRow { display: flex; gap: 8px; height: 90px; }
.wdCol { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
.wdTrack { width: 60%; max-width: 26px; flex: 1; display: flex; align-items: flex-end; }
.wdFill { width: 100%; border-radius: 5px 5px 0 0; transition: height .4s; }
.wdLbl { font-size: 11px; color: var(--hy-muted); margin-top: 5px; }

/* 時間帯 */
.hourRow { display: grid; grid-template-columns: repeat(24, 1fr); gap: 3px; }
.hourCell { aspect-ratio: 1; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: var(--hy-muted); }
.hourLegend { display: flex; justify-content: space-between; font-size: 9px; color: var(--hy-muted); margin-top: 4px; padding: 0 2px; }

/* 分野推移 */
.trendRow { margin-bottom: 12px; }
.trendHead { display: flex; align-items: center; gap: 7px; font-size: 12px; margin-bottom: 5px; }
.trendDot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.trendName { font-weight: 700; color: var(--hy-ink); flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.trendTotal { font-size: 11px; color: var(--hy-muted); }
.spark { display: flex; align-items: flex-end; gap: 3px; height: 34px; }
.sparkBar { flex: 1; border-radius: 3px 3px 0 0; min-height: 2px; transition: height .4s; }

/* 読了 */
.finRow { display: flex; align-items: flex-end; gap: 6px; height: 96px; }
.finCol { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
.finBooks { font-size: 11px; font-weight: 800; color: var(--hy-accent-ink); height: 15px; }
.finTrack { width: 100%; max-width: 30px; flex: 1; display: flex; align-items: flex-end; }
.finFill { width: 100%; background: linear-gradient(180deg, #8ab38a, #5a9a5a); border-radius: 5px 5px 0 0; transition: height .4s; }
.finLbl { font-size: 10px; color: var(--hy-muted); margin-top: 5px; }
.pagesNote { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--hy-muted); margin-top: 10px; }
.pagesNote i { color: var(--hy-accent); }
</style>
