<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady): 連続記録(モーダル)。
  現在の連続・自己ベスト → 次の節目への進捗とマイルストーン一覧 → 過去の連続期間の履歴、を1画面に統合。
  (以前は「連続記録(マイルストーン)」と「連続学習の履歴」で別モーダルだったものを1つにまとめた)
  データは hata/hatady/streaks から取得(current / best / periods[])。日付はユーザーのローカル基準。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="470"
	:initialHeight="720"
	:canResize="true"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-flame"></i> {{ copy.title }}</template>

	<div class="hatady-scope" :data-hatady-theme="theme" :class="$style.body">
		<div v-if="loading" :class="$style.loading">{{ copy.loading }}</div>
		<template v-else>
			<!-- 現在 / 自己ベスト -->
			<div :class="$style.summary">
				<div :class="[$style.sumCard, $style.sumCurrent]">
					<i class="ti ti-flame-filled" :class="$style.sumIcon"></i>
					<div :class="$style.sumNum">{{ data.current }}<span :class="$style.sumUnit">{{ copy.dayUnit }}</span></div>
					<div :class="$style.sumLbl">{{ copy.current }}</div>
				</div>
				<div :class="$style.sumCard">
					<i class="ti ti-trophy" :class="$style.sumIcon"></i>
					<div :class="$style.sumNum">{{ data.best }}<span :class="$style.sumUnit">{{ copy.dayUnit }}</span></div>
					<div :class="$style.sumLbl">{{ copy.best }}</div>
				</div>
			</div>

			<!-- 次の節目への進捗 -->
			<div v-if="next" :class="$style.nextBox">
				<div :class="$style.nextLabel">
					<span><i class="ti ti-target"></i> {{ copy.nextGoal }}: <b>{{ next }}{{ copy.dayUnit }}</b></span>
					<span :class="$style.remain">{{ i18n.tsx._hata._hatady._streaks.remainingDays({ days: (next - data.current).toString() }) }}</span>
				</div>
				<div :class="$style.progressTrack">
					<div :class="$style.progressFill" :style="{ width: nextProgress + '%' }"></div>
				</div>
				<div :class="$style.progressEnds"><span>{{ prev }}{{ copy.dayUnit }}</span><span>{{ next }}{{ copy.dayUnit }}</span></div>
			</div>
			<div v-else :class="$style.allDone"><i class="ti ti-trophy"></i> {{ copy.allDone }}</div>

			<!-- マイルストーン一覧 -->
			<div :class="$style.listHead"><i class="ti ti-flag"></i> {{ copy.milestones }}</div>
			<div :class="$style.list">
				<div v-for="m in MILESTONES" :key="m" :class="[$style.item, data.current >= m && $style.itemDone, m === next && $style.itemNext]">
					<span :class="$style.itemIcon">
						<i v-if="data.current >= m" class="ti ti-circle-check-filled"></i>
						<i v-else-if="m === next" class="ti ti-flame"></i>
						<i v-else class="ti ti-lock"></i>
					</span>
					<div :class="$style.itemInfo">
						<div :class="$style.itemDays">{{ m }}{{ copy.streakSuffix }}</div>
						<div :class="$style.itemState">{{ data.current >= m ? copy.achieved : (m === next ? copy.inProgress : copy.locked) }}</div>
					</div>
					<div v-if="m === next" :class="$style.miniTrack"><div :class="$style.miniFill" :style="{ width: nextProgress + '%' }"></div></div>
					<span v-else-if="data.current >= m" :class="$style.itemPct">100%</span>
				</div>
			</div>

			<!-- 過去の連続期間 -->
			<div :class="$style.listHead"><i class="ti ti-history"></i> {{ copy.history }}</div>
			<div v-if="data.periods.length === 0" :class="$style.empty">
				<i class="ti ti-flame-off" :class="$style.emptyIcon"></i>
				<div>{{ copy.noData }}</div>
			</div>
			<div v-else :class="$style.list">
				<div
					v-for="(p, i) in data.periods" :key="i"
					:class="[$style.item, isCurrentPeriod(p) && $style.itemCurrent]"
				>
					<span :class="$style.itemBadge" :style="{ background: barColor(p.days) }">{{ p.days }}</span>
					<div :class="$style.itemInfo">
						<div :class="$style.itemRange">{{ fmtRange(p.start, p.end) }}</div>
						<div :class="$style.itemMeta">
							<span>{{ p.days }}{{ copy.streakSuffix }}</span>
							<span v-if="isCurrentPeriod(p)" :class="$style.nowTag"><i class="ti ti-player-play"></i> {{ copy.ongoing }}</span>
							<span v-else-if="p.days === data.best" :class="$style.bestTag"><i class="ti ti-trophy"></i> {{ copy.bestTag }}</span>
						</div>
					</div>
					<span :class="$style.itemBar"><span :class="$style.itemFill" :style="{ width: barPct(p.days) + '%', background: barColor(p.days) }"></span></span>
				</div>
			</div>
		</template>
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
const copy = i18n.ts._hata._hatady._streaks;
const dateFormatter = new Intl.DateTimeFormat(versatileLang, { year: 'numeric', month: 'short', day: 'numeric' });

type Period = { start: string; end: string; days: number };
const loading = ref(true);
const data = ref<{ current: number; best: number; periods: Period[] }>({ current: 0, best: 0, periods: [] });

onMounted(async () => {
	try {
		data.value = await misskeyApi('hata/hatady/streaks', { tzOffset: hatadyTzOffset() });
	} catch { /* 失敗時は空表示 */ } finally {
		loading.value = false;
	}
});

// ===== マイルストーン(節目) =====
const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
const next = computed(() => MILESTONES.find(m => m > data.value.current) ?? null);
const prev = computed(() => {
	const done = MILESTONES.filter(m => m <= data.value.current);
	return done.length ? done[done.length - 1] : 0;
});
const nextProgress = computed(() => {
	if (!next.value) return 100;
	const span = next.value - prev.value;
	if (span <= 0) return 0;
	return Math.min(100, Math.max(0, Math.round(((data.value.current - prev.value) / span) * 100)));
});

// ===== 過去の連続期間 =====
// 現在進行中の連続期間か(current>0 かつ最も新しい=先頭で日数一致)。
function isCurrentPeriod(p: Period): boolean {
	return data.value.current > 0 && data.value.periods[0] === p && p.days === data.value.current;
}

// 'YYYY-MM-DD' → Date。
function parse(k: string): Date { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function fmtRange(start: string, end: string): string {
	const s = parse(start); const e = parse(end);
	const same = start === end;
	const startLabel = dateFormatter.format(s);
	if (same) return startLabel;
	return i18n.tsx._hata._hatady._streaks.dateRange({ start: startLabel, end: dateFormatter.format(e) });
}
function barPct(days: number): number {
	const max = Math.max(1, data.value.best);
	return Math.min(100, Math.max(6, Math.round((days / max) * 100)));
}
function barColor(days: number): string {
	if (days >= 30) return '#d9824a';
	if (days >= 14) return '#e0a15a';
	if (days >= 7) return '#c9a55a';
	if (days >= 3) return '#9bb37a';
	return '#a7a29a';
}

</script>

<style lang="scss" module>
.body {
	padding: 20px;
	background: var(--hy-bg); color: var(--hy-body);
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
	min-height: 100%; box-sizing: border-box;
}
.loading { text-align: center; color: var(--hy-muted); padding: 40px 0; font-size: 13px; }

/* サマリ */
.summary { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
.sumCard { text-align: center; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 14px; padding: 16px 10px; }
.sumCurrent { border-color: var(--hy-accent); box-shadow: 0 2px 12px rgba(217,130,74,.15); }
.sumIcon { font-size: 24px; color: var(--hy-muted); }
.sumCurrent .sumIcon { color: var(--hy-accent); filter: drop-shadow(0 2px 4px rgba(217,130,74,.35)); }
.sumNum { font-family: var(--hy-heading); font-weight: 900; font-size: 34px; color: var(--hy-accent-ink); line-height: 1.1; margin-top: 2px; }
.sumUnit { font-size: 15px; margin-left: 3px; }
.sumLbl { font-size: 11.5px; color: var(--hy-muted); margin-top: 2px; }

/* 次の節目 */
.nextBox { background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 14px; padding: 15px 16px; margin-bottom: 18px; }
.nextLabel { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--hy-ink); margin-bottom: 10px; }
.nextLabel i { color: var(--hy-accent); }
.remain { font-size: 12px; font-weight: 700; color: var(--hy-accent-ink); }
.progressTrack { height: 12px; border-radius: 999px; background: var(--hy-border); overflow: hidden; }
.progressFill { height: 100%; border-radius: 999px; background: linear-gradient(90deg,#f0b46a,#d9824a); transition: width .5s cubic-bezier(.34,1.2,.64,1); }
.progressEnds { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--hy-muted); margin-top: 5px; }
.allDone { display: flex; align-items: center; gap: 8px; background: var(--hy-surface); border: 1px solid var(--hy-accent); border-radius: 14px; padding: 14px 16px; margin-bottom: 18px; font-size: 13px; color: var(--hy-accent-ink); font-weight: 700; }
.allDone i { font-size: 20px; }

/* 見出し・一覧(マイルストーン / 履歴 共通) */
.listHead { display: flex; align-items: center; gap: 7px; font-family: var(--hy-heading); font-weight: 800; font-size: 13.5px; color: var(--hy-ink); margin-bottom: 12px; }
.listHead i { color: var(--hy-accent); }
.list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 22px; }
.empty { display: flex; flex-direction: column; align-items: center; text-align: center; color: var(--hy-muted); padding: 30px 0; font-size: 13px; }
.emptyIcon { font-size: 30px; margin-bottom: 8px; opacity: .6; }
.item { display: flex; align-items: center; gap: 12px; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 11px; padding: 10px 13px; }

/* マイルストーン行 */
.itemDone { border-left: 4px solid #5a9a5a; }
.itemNext { border-left: 4px solid var(--hy-accent); box-shadow: 0 2px 10px rgba(217,130,74,.15); }
.itemIcon { font-size: 20px; flex-shrink: 0; color: var(--hy-muted); }
.itemDone .itemIcon { color: #5a9a5a; }
.itemNext .itemIcon { color: var(--hy-accent); }
.itemDays { font-family: var(--hy-heading); font-weight: 900; font-size: 15px; color: var(--hy-ink); }
.itemState { font-size: 11px; color: var(--hy-muted); }
.itemPct { font-size: 12px; font-weight: 700; color: #5a9a5a; }
.miniTrack { width: 90px; height: 7px; border-radius: 999px; background: var(--hy-border); overflow: hidden; flex-shrink: 0; }
.miniFill { height: 100%; border-radius: 999px; background: linear-gradient(90deg,#f0b46a,#d9824a); }

/* 履歴行 */
.itemCurrent { border-left: 4px solid var(--hy-accent); }
.itemBadge { flex-shrink: 0; width: 34px; height: 34px; border-radius: 9px; color: #fff; font-family: var(--hy-heading); font-weight: 900; font-size: 14px; display: flex; align-items: center; justify-content: center; }
.itemInfo { flex: 1; min-width: 0; }
.itemRange { font-size: 13px; font-weight: 700; color: var(--hy-ink); }
.itemMeta { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--hy-muted); margin-top: 2px; }
.nowTag { display: inline-flex; align-items: center; gap: 3px; color: var(--hy-accent-ink); font-weight: 700; }
.bestTag { display: inline-flex; align-items: center; gap: 3px; color: #b8860b; font-weight: 700; }
.itemBar { width: 64px; height: 6px; border-radius: 999px; background: var(--hy-border); overflow: hidden; flex-shrink: 0; }
.itemFill { display: block; height: 100%; border-radius: 999px; }
</style>
