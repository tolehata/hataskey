<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="meta" :class="$style.root">
	<MkFeaturedPhotos :class="$style.bg"/>
	<!-- 左上: ブランドロゴ (Hataskey + A fork of CherryPick) -->
	<div :class="$style.logoWrapper">
		<!-- 1段目: Hataskey (Righteous フォント、アクセント色、大きく) -->
		<h1 :class="$style.brandName">Hataskey</h1>
		<!-- 2段目: A fork of CherryPick(ロゴ) -->
		<div :class="$style.brandSub">
			<span :class="$style.brandSubText">A fork of</span>
			<img :src="cherrypicksvg" :class="$style.brandSubLogo" alt="CherryPick"/>
		</div>
	</div>
	<div :class="$style.contents">
		<MkVisitorDashboard/>
	</div>
</div>
</template>

<script lang="ts" setup>
import MkFeaturedPhotos from '@/components/MkFeaturedPhotos.vue';
import cherrypicksvg from '/client-assets/cherrypick.svg';
import MkVisitorDashboard from '@/components/MkVisitorDashboard.vue';
import { instance as meta } from '@/instance.js';
</script>

<style lang="scss" module>
/* ===== Righteous フォント宣言 (Hataskey ブランド名用、OFL ライセンス) ===== */
@font-face {
	font-family: 'Righteous';
	font-style: normal;
	font-weight: 400;
	font-display: swap;
	src: url('/client-assets/Righteous-Regular.woff2') format('woff2');
}

.root {
	height: 100cqh;
	overflow: auto;
	overscroll-behavior: contain;
}

.bg {
	position: fixed;
	top: 0;
	right: 0;
	width: 100vw;
	height: 100vh;
}

/* ===== ロゴラッパ ===== */
.logoWrapper {
	position: fixed;
	top: 36px;
	left: 36px;
	flex: auto;
	user-select: none;
	pointer-events: none;
	/* mix-blend-mode は brandSub 側にのみ適用(Hataskey はアクセント色で出したいので除外) */

	@media (max-width: 450px) {
		top: 24px;
		left: 24px;
	}
}

/* 1段目: Hataskey ブランド名(Righteousフォント、判子色) */
.brandName {
	margin: 0 0 6px 0;
	padding: 0;
	font-family: 'Righteous', system-ui, sans-serif;
	font-size: 48px;
	font-weight: 400;
	line-height: 1;
	letter-spacing: 0.02em;
	color: var(--MI_THEME-accent);
	/* テキストに微妙なシャドウで背景画像上での視認性確保 */
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);

	@media (max-width: 450px) {
		font-size: 36px;
	}
}

/* 2段目: A fork of CherryPick(ロゴ) */
.brandSub {
	display: flex;
	align-items: center;
	gap: 8px;
	/* 旗鯖fork: 背景に薄白の半透明レイヤーを敷いて、シェイプ装飾の上でも視認性を確保 */
	color: var(--MI_THEME-fg);
	background: color-mix(in srgb, var(--MI_THEME-panel) 60%, transparent);
	backdrop-filter: blur(8px);
	padding: 4px 10px;
	border-radius: 999px;
	width: max-content;
}

.brandSubText {
	font-size: 0.8em;
	letter-spacing: 0.12em;
	opacity: 0.85;
}

.brandSubLogo {
	width: 80px;
	flex-shrink: 0;

	@media (max-width: 450px) {
		width: 64px;
	}
}

.contents {
	position: relative;
	width: min(430px, calc(100% - 32px));
	margin: auto;
	padding: 100px 0 100px 0;
}
</style>
