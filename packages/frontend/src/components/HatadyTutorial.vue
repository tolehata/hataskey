<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady 1j): 初回起動チュートリアル。
  アカウントごとに1回だけ表示(レジストリ)。スキップ/完了どちらでも「見た」扱い。
  完了時に実績「Hatadyへようこそ」を解除する(呼び出し側)。
-->
<template>
<Teleport to="body">
	<div v-if="visible" :class="[$style.overlay, 'hatady-scope']" :data-hatady-theme="theme">
		<div :class="$style.card">
			<div :class="[$style.hero, page.mediaMock && $style.heroMedia]" :style="{ background: page.bg }">
				<div v-if="page.mediaMock" :class="$style.mediaMock" aria-hidden="true">
					<div :class="$style.mockTabs">
						<span>{{ copy.mediaMockBooks }}</span><span :class="$style.mockTabOn">{{ copy.mediaMockMovies }}</span><span>{{ copy.mediaMockGames }}</span>
					</div>
					<div :class="$style.mockShelf">
						<div :class="[$style.mockCover, $style.mockMovie]"><i class="ti ti-movie"></i></div>
						<div :class="$style.mockInfo"><b>{{ copy.mediaMockMovieTitle }}</b><small>{{ copy.mediaMockMovieMeta }}</small><span><i class="ti ti-star-filled"></i><i class="ti ti-star-filled"></i><i class="ti ti-star-filled"></i><i class="ti ti-star-filled"></i><i class="ti ti-star"></i></span></div>
						<button tabindex="-1"><i class="ti ti-calendar-event"></i> {{ copy.mediaMockSchedule }}</button>
					</div>
					<div :class="[$style.mockShelf, $style.mockGameRow]">
						<div :class="[$style.mockCover, $style.mockGame]"><i class="ti ti-device-gamepad-2"></i></div>
						<div :class="$style.mockInfo"><b>{{ copy.mediaMockGameTitle }}</b><small>{{ copy.mediaMockGameMeta }}</small><span :class="$style.mockStats"><em><i class="ti ti-swords"></i> {{ copy.mediaMockMatches }}</em><em><i class="ti ti-chart-bar"></i> {{ copy.mediaMockWinRate }}</em></span></div>
						<button tabindex="-1"><i class="ti ti-chart-dots-3"></i> {{ copy.mediaMockAnalysis }}</button>
					</div>
				</div>
				<i v-else-if="page.icon" :class="['ti', page.icon, $style.heroIcon]"></i>
				<span v-else :class="$style.heroEmoji">{{ page.emoji }}</span>
			</div>
			<div :class="$style.content">
				<div :class="$style.dots">
					<span v-for="(_, i) in pages" :key="i" :class="[$style.dot, i === index && $style.dotOn]"></span>
				</div>
				<div v-if="page.kicker" :class="$style.kicker">{{ page.kicker }}</div>
				<div :class="$style.title">{{ page.title }}</div>
				<div :class="$style.desc" v-html="page.desc"></div>
				<div v-if="page.info" :class="$style.info"><i class="ti ti-info-circle"></i> <span v-html="page.info"></span></div>
				<div :class="$style.footer">
					<button v-if="!isLast" :class="$style.next" @click="next">{{ copy.next }} <i class="ti ti-arrow-right"></i></button>
					<button v-else :class="$style.finish" @click="finish"><i class="ti ti-check"></i> {{ copy.begin }}</button>
				</div>
			</div>
		</div>
	</div>
</Teleport>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { i18n } from '@/i18n.js';
import { hatadyTheme } from '@/utility/hatady-prefs.js';

const emit = defineEmits<{ (ev: 'done'): void; (ev: 'closed'): void }>();
const theme = hatadyTheme;
const copy = i18n.ts._hata._hatady._tutorial;

// 旗鯖fork: 起動アニメ＋テーマ選択の後に出す「最後のひとこと」に集約。
//   コレクションの実画面に近いモック → フォロー境界 → 再実行導線、の3ページ構成。
const pages = computed(() => [
	{
		bg: 'linear-gradient(135deg, color-mix(in srgb, var(--hy-accent) 32%, var(--hy-surface)), color-mix(in srgb, var(--hy-ink) 18%, var(--hy-bg)))', emoji: '', icon: '', mediaMock: true,
		kicker: copy.mediaKicker,
		title: copy.mediaTitle,
		desc: copy.mediaDescription,
		info: copy.mediaInfo,
	},
	{
		bg: 'linear-gradient(135deg,#6a86b0,#455f8a)', emoji: '', icon: 'ti-users-plus', mediaMock: false,
		kicker: copy.followKicker,
		title: copy.followTitle,
		desc: copy.followDescription,
		info: copy.followInfo,
	},
	{
		bg: 'linear-gradient(135deg,#e0955a,#d9824a)', emoji: '', icon: 'ti-refresh', mediaMock: false,
		kicker: '',
		title: copy.revisitTitle,
		desc: copy.revisitDescription,
		info: '',
	},
]);

const index = ref(0);
const visible = ref(true);
const page = computed(() => pages.value[index.value]);
const isLast = computed(() => index.value === pages.value.length - 1);

function next() { if (index.value < pages.value.length - 1) index.value += 1; }

function finish() { emit('done'); }
</script>

<style lang="scss" module>
.overlay {
	position: fixed; inset: 0; z-index: 3200000;
	background: rgba(30, 22, 14, .55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
	display: flex; align-items: center; justify-content: center; padding: 20px;
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
}
.card {
	width: 360px; max-width: 100%;
	background: var(--hy-surface); border-radius: 18px; overflow: hidden;
	box-shadow: 0 20px 60px rgba(0,0,0,.4);
	animation: pop .35s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes pop { from { opacity: 0; transform: scale(.9) translateY(10px); } to { opacity: 1; transform: none; } }
.hero { height: 150px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.heroMedia { height: 230px; padding: 14px; box-sizing: border-box; }
.heroIcon { font-size: 54px; color: #fff; filter: drop-shadow(0 3px 5px rgba(0,0,0,.2)); }
.heroEmoji { font-size: 46px; filter: drop-shadow(0 3px 5px rgba(0,0,0,.2)); letter-spacing: 4px; }
.mediaMock { width: min(310px, 100%); padding: 10px; border: 1px solid var(--hy-border); border-radius: 14px; color: var(--hy-ink); background: color-mix(in srgb, var(--hy-surface) 96%, transparent); box-shadow: 0 10px 28px color-mix(in srgb, var(--hy-ink) 24%, transparent); }
.mockTabs { display: grid; grid-template-columns: repeat(3,1fr); gap: 4px; padding: 3px; border-radius: 999px; background: var(--hy-surface-2); color: var(--hy-muted); font-size: 9px; font-weight: 800; text-align: center; }
.mockTabs span { padding: 4px 5px; border-radius: 999px; }
.mockTabOn { background: var(--hy-surface); color: var(--hy-accent-ink); box-shadow: 0 1px 4px color-mix(in srgb, var(--hy-ink) 16%, transparent); }
.mockShelf { display: grid; grid-template-columns: 42px minmax(0,1fr) auto; align-items: center; gap: 9px; margin-top: 9px; }
.mockCover { display: grid; place-items: center; width: 42px; height: 58px; border-radius: 7px; color: #fff; box-shadow: 0 4px 9px rgba(55,29,12,.2); }
.mockMovie { background: linear-gradient(145deg,#35526e,#8d5e6a); }
.mockGame { height: 42px; background: linear-gradient(145deg,#3f6b59,#8c7442); }
.mockGameRow { margin-top: 7px; padding-top: 7px; border-top: 1px solid color-mix(in srgb, var(--hy-border) 65%, transparent); }
.mockCover i { font-size: 20px; }
.mockInfo { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.mockInfo b, .mockInfo small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mockInfo b { font-family: var(--hy-heading); font-size: 11px; }
.mockInfo small { color: var(--hy-muted); font-size: 8.5px; }
.mockInfo span { display: flex; gap: 1px; color: var(--hy-accent); font-size: 8px; }
.mockInfo .mockStats { gap: 7px; color: var(--hy-accent-ink); }
.mockStats em { display: inline-flex; align-items: center; gap: 2px; font-style: normal; }
.mockShelf button { display: inline-flex; align-items: center; gap: 3px; border: 0; border-radius: 999px; padding: 6px 8px; background: var(--hy-accent); color: #fff; font-size: 8.5px; font-weight: 800; pointer-events: none; }
.content { padding: 20px 22px 22px; }
.dots { display: flex; gap: 5px; margin-bottom: 14px; }
.dot { width: 6px; height: 6px; border-radius: 999px; background: var(--hy-border); transition: all .2s; }
.dotOn { width: 22px; background: var(--hy-accent); }
.kicker { font-size: 11px; font-weight: 800; letter-spacing: .12em; color: var(--hy-accent-ink); margin-bottom: 6px; }
.title { font-family: var(--hy-heading); font-weight: 900; font-size: 19px; color: var(--hy-ink); line-height: 1.4; margin-bottom: 9px; }
.desc { font-size: 13px; line-height: 1.85; color: var(--hy-body); }
.desc :deep(b) { color: var(--hy-accent-ink); }
.info { display: flex; align-items: flex-start; gap: 8px; background: var(--hy-surface-2); border-radius: 9px; padding: 9px 11px; font-size: 11.5px; line-height: 1.6; color: var(--hy-muted); margin-top: 12px; }
.info i { margin-top: 1px; color: var(--hy-accent); }
.footer { display: flex; align-items: center; margin-top: 20px; }
.next, .finish {
	display: inline-flex; align-items: center; justify-content: center; gap: 5px;
	background: linear-gradient(90deg,#e0955a,#d9824a); color: #fff; border: none; border-radius: 999px;
	font-weight: 700; font-family: var(--hy-heading); cursor: pointer; box-shadow: 0 3px 9px rgba(217,130,74,.4);
}
.next { margin-left: auto; padding: 9px 20px; font-size: 13.5px; }
.finish { width: 100%; padding: 11px 20px; font-size: 14px; }
</style>
