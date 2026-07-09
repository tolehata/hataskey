<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady): 連続記録のマイルストーン画面(モーダル)。
  現在の連続日数と、各節目(3/7/14/30/50/100/200/365日)への進捗をバーで可視化する。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="460"
	:initialHeight="640"
	:canResize="true"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-flame"></i> {{ t('title') }}</template>

	<div class="hatady-scope" :data-hatady-theme="theme" :class="$style.body">
		<!-- 現在の連続日数 -->
		<div :class="$style.hero">
			<div :class="$style.flame"><i class="ti ti-flame-filled"></i></div>
			<div :class="$style.streakNum">{{ streak }}<span :class="$style.streakUnit">{{ t('days') }}</span></div>
			<div :class="$style.streakSub">{{ t('currentStreak') }}</div>
		</div>

		<!-- 次の目標への進捗バー -->
		<div v-if="next" :class="$style.nextBox">
			<div :class="$style.nextLabel">
				<span><i class="ti ti-target"></i> {{ t('nextGoal') }}: <b>{{ next }}{{ t('days') }}</b></span>
				<span :class="$style.remain">{{ t('remain').replace('{n}', String(next - streak)) }}</span>
			</div>
			<div :class="$style.progressTrack">
				<div :class="$style.progressFill" :style="{ width: nextProgress + '%' }"></div>
			</div>
			<div :class="$style.progressEnds"><span>{{ prev }}{{ t('days') }}</span><span>{{ next }}{{ t('days') }}</span></div>
		</div>
		<div v-else :class="$style.allDone"><i class="ti ti-trophy"></i> {{ t('allDone') }}</div>

		<!-- 全マイルストーン一覧 -->
		<div :class="$style.list">
			<div v-for="m in MILESTONES" :key="m" :class="[$style.item, streak >= m && $style.itemDone, m === next && $style.itemNext]">
				<span :class="$style.itemIcon">
					<i v-if="streak >= m" class="ti ti-circle-check-filled"></i>
					<i v-else-if="m === next" class="ti ti-flame"></i>
					<i v-else class="ti ti-lock"></i>
				</span>
				<div :class="$style.itemInfo">
					<div :class="$style.itemDays">{{ m }}{{ t('daysStreak') }}</div>
					<div :class="$style.itemState">{{ streak >= m ? t('achieved') : (m === next ? t('inProgress') : t('locked')) }}</div>
				</div>
				<!-- 進行中の節目にはミニ進捗バー -->
				<div v-if="m === next" :class="$style.miniTrack"><div :class="$style.miniFill" :style="{ width: nextProgress + '%' }"></div></div>
				<span v-else-if="streak >= m" :class="$style.itemPct">100%</span>
			</div>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import { hatadyTheme, hatadyLang } from '@/utility/hatady-prefs.js';

const props = defineProps<{ streak: number }>();
const emit = defineEmits<{ (ev: 'closed'): void }>();
const dialog = ref<any>(null);
const theme = hatadyTheme;
const lang = hatadyLang;

const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
const streak = computed(() => Math.max(0, props.streak ?? 0));
const next = computed(() => MILESTONES.find(m => m > streak.value) ?? null);
const prev = computed(() => {
	const done = MILESTONES.filter(m => m <= streak.value);
	return done.length ? done[done.length - 1] : 0;
});
const nextProgress = computed(() => {
	if (!next.value) return 100;
	const span = next.value - prev.value;
	if (span <= 0) return 0;
	return Math.min(100, Math.max(0, Math.round(((streak.value - prev.value) / span) * 100)));
});

const DICT: Record<string, { ja: string; en: string }> = {
	title: { ja: '連続記録', en: 'Study streak' },
	days: { ja: '日', en: 'd' },
	currentStreak: { ja: '現在の連続記録', en: 'Current streak' },
	nextGoal: { ja: '次の目標', en: 'Next goal' },
	remain: { ja: 'あと{n}日', en: '{n} days to go' },
	allDone: { ja: 'すべての節目を達成しました！素晴らしい継続です🔥', en: 'All milestones achieved! Amazing streak 🔥' },
	daysStreak: { ja: '日連続', en: '-day streak' },
	achieved: { ja: '達成済み', en: 'Achieved' },
	inProgress: { ja: '挑戦中', en: 'In progress' },
	locked: { ja: '未達成', en: 'Locked' },
};
function t(key: string): string { return DICT[key]?.[lang.value === 'en' ? 'en' : 'ja'] ?? key; }
</script>

<style lang="scss" module>
.body {
	padding: 22px;
	background: var(--hy-bg); color: var(--hy-body);
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
	min-height: 100%; box-sizing: border-box;
}

/* hero */
.hero { text-align: center; margin-bottom: 20px; }
.flame { font-size: 46px; color: var(--hy-accent); filter: drop-shadow(0 3px 6px rgba(217,130,74,.35)); }
.streakNum { font-family: var(--hy-heading); font-weight: 900; font-size: 44px; color: var(--hy-accent-ink); line-height: 1.1; margin-top: 4px; }
.streakUnit { font-size: 18px; margin-left: 4px; }
.streakSub { font-size: 12.5px; color: var(--hy-muted); }

/* 次の目標 */
.nextBox { background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 14px; padding: 15px 16px; margin-bottom: 18px; }
.nextLabel { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--hy-ink); margin-bottom: 10px; }
.nextLabel i { color: var(--hy-accent); }
.remain { font-size: 12px; font-weight: 700; color: var(--hy-accent-ink); }
.progressTrack { height: 12px; border-radius: 999px; background: var(--hy-border); overflow: hidden; }
.progressFill { height: 100%; border-radius: 999px; background: linear-gradient(90deg,#f0b46a,#d9824a); transition: width .5s cubic-bezier(.34,1.2,.64,1); }
.progressEnds { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--hy-muted); margin-top: 5px; }
.allDone { display: flex; align-items: center; gap: 8px; background: var(--hy-surface); border: 1px solid var(--hy-accent); border-radius: 14px; padding: 14px 16px; margin-bottom: 18px; font-size: 13px; color: var(--hy-accent-ink); font-weight: 700; }
.allDone i { font-size: 20px; }

/* 一覧 */
.list { display: flex; flex-direction: column; gap: 8px; }
.item { display: flex; align-items: center; gap: 12px; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 11px; padding: 11px 14px; opacity: .7; }
.itemDone { opacity: 1; border-left: 4px solid #5a9a5a; }
.itemNext { opacity: 1; border-left: 4px solid var(--hy-accent); box-shadow: 0 2px 10px rgba(217,130,74,.15); }
.itemIcon { font-size: 20px; flex-shrink: 0; color: var(--hy-muted); }
.itemDone .itemIcon { color: #5a9a5a; }
.itemNext .itemIcon { color: var(--hy-accent); }
.itemInfo { flex: 1; min-width: 0; }
.itemDays { font-family: var(--hy-heading); font-weight: 900; font-size: 15px; color: var(--hy-ink); }
.itemState { font-size: 11px; color: var(--hy-muted); }
.itemPct { font-size: 12px; font-weight: 700; color: #5a9a5a; }
.miniTrack { width: 90px; height: 7px; border-radius: 999px; background: var(--hy-border); overflow: hidden; flex-shrink: 0; }
.miniFill { height: 100%; border-radius: 999px; background: linear-gradient(90deg,#f0b46a,#d9824a); }
</style>
