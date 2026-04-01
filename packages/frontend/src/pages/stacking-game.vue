<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div class="_spacer" style="--MI_SPACER-w: 800px;">
		<div :class="$style.root">
			<div class="_gaps">
				<div class="_panel" :class="$style.hero">
					<div :class="$style.heroInner">
						<div :class="$style.heroTitle">🏗️ つみつみタワー</div>
						<div :class="$style.heroSub">絵文字を積み上げてハイスコアを目指そう！</div>
					</div>
				</div>

				<div class="_panel" :class="$style.menuCard">
					<div class="_gaps" style="padding: 20px;">
						<div style="font-weight:bold;">モードを選択</div>
						<div :class="$style.modeList">
							<button v-for="m in modes" :key="m.id" :class="[$style.modeBtn, selectedMode === m.id && $style.modeBtnOn]" @click="selectedMode = m.id">
								<span :class="$style.modeEmoji">{{ m.emoji }}</span>
								<span :class="$style.modeName">{{ m.label }}</span>
							</button>
						</div>
						<MkButton primary gradate large rounded inline @click="startGame">
							<i class="ti ti-player-play"></i> ゲームスタート
						</MkButton>
					</div>
				</div>

				<div class="_panel" :class="$style.menuCard">
					<div class="_gaps_s" style="padding: 16px;">
						<div><b>🎮 遊び方</b></div>
						<ol :class="$style.howTo">
							<li>サーバーの絵文字が上から落ちてきます</li>
							<li>左右に動かして落とす位置を決めましょう</li>
							<li>タップ/クリックで絵文字を落とします</li>
							<li>絵文字が台から落ちるとゲームオーバー</li>
							<li>たくさん積み上げてハイスコアを目指そう！</li>
						</ol>
					</div>
				</div>

				<div v-if="highScore > 0" class="_panel" :class="$style.menuCard">
					<div style="padding:16px;text-align:center;">
						<div style="opacity:.6;font-size:.85rem;">🏆 ハイスコア</div>
						<div style="font-size:1.5rem;font-weight:900;color:var(--MI_THEME-accent);">{{ highScore }}</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import MkButton from '@/components/MkButton.vue';
import { mainRouter } from '@/router.js';
import { definePage } from '@/page.js';
import { miLocalStorage } from '@/local-storage.js';

const modes = [
	{ id: 'custom', emoji: '😺', label: 'カスタム絵文字' },
	{ id: 'unicode', emoji: '🍎', label: 'Unicode絵文字' },
	{ id: 'mix', emoji: '🎲', label: 'ミックス' },
];
const selectedMode = ref('custom');
const highScore = ref(parseInt(miLocalStorage.getItem('stackingGameHighScore') || '0', 10));

function startGame() {
	mainRouter.push(`/stacking-game/play?mode=${selectedMode.value}`);
}

definePage(() => ({
	title: 'つみつみタワー',
	icon: 'ti ti-building',
}));
</script>

<style lang="scss" module>
.root { max-width: 500px; margin: 0 auto; }
.hero {
	background: linear-gradient(135deg, var(--MI_THEME-accent), color-mix(in srgb, var(--MI_THEME-accent) 60%, #ff8800));
	border-radius: 16px; overflow: hidden;
}
.heroInner { padding: 32px 24px; text-align: center; }
.heroTitle { font-size: 1.8rem; font-weight: 900; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,.2); margin-bottom: 8px; }
.heroSub { font-size: .95rem; color: rgba(255,255,255,.85); }
.menuCard { border-radius: 14px; overflow: hidden; text-align: center; }
.modeList { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.modeBtn {
	display: flex; flex-direction: column; align-items: center; gap: 4px;
	padding: 12px 16px; border-radius: 12px; border: 2px solid var(--MI_THEME-divider);
	background: var(--MI_THEME-panel); cursor: pointer; font-family: inherit; transition: all .2s;
	&:hover { border-color: color-mix(in srgb, var(--MI_THEME-accent) 40%, var(--MI_THEME-divider)); }
}
.modeBtnOn { border-color: var(--MI_THEME-accent); background: var(--MI_THEME-accentedBg); }
.modeEmoji { font-size: 1.8rem; }
.modeName { font-size: .8rem; font-weight: 600; }
.howTo { text-align: left; font-size: .9em; line-height: 1.8; padding-left: 1.2em; margin: 0; }
</style>
