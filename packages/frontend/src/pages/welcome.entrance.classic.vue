<!--
SPDX-FileCopyrightText: syuilo and misskey-project / hatacha
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="meta" :class="$style.root">
	<MkFeaturedPhotos :class="$style.bg"/>
	<XTimeline :class="$style.tl"/>
	<div :class="$style.shape1"></div>
	<div :class="$style.shape2"></div>
	<!-- 旗鯖fork: Hataskey ブランドロゴ (Righteous フォント) + A fork of CherryPick -->
	<div :class="$style.logoWrapper">
		<!-- 1段目: Hataskey (Righteous フォント、判子色、大きく) -->
		<h1 :class="$style.brandName">Hataskey</h1>
		<!-- 2段目: A fork of CherryPick (ロゴ) -->
		<div :class="$style.brandSub">
			<span :class="$style.brandSubText">A fork of</span>
			<img :src="cherrypicksvg" :class="$style.brandSubLogo" alt="CherryPick"/>
		</div>
	</div>
	<div :class="$style.contents">
		<MkVisitorDashboard/>
	</div>
	<div v-if="instances && instances.length > 0" :class="$style.federation">
		<MkMarqueeText :duration="40">
			<MkA v-for="instance in instances" :key="instance.id" :class="$style.federationInstance" :to="`/instance-info/${instance.host}`" behavior="window">
				<!--<MkInstanceCardMini :instance="instance"/>-->
				<img v-if="instance.iconUrl" :class="$style.federationInstanceIcon" :src="getInstanceIcon(instance)" alt=""/>
				<span class="_monospace">{{ instance.host }}</span>
			</MkA>
		</MkMarqueeText>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import * as Misskey from 'cherrypick-js';
import XTimeline from './welcome.timeline.vue';
import MkMarqueeText from '@/components/MkMarqueeText.vue';
import MkFeaturedPhotos from '@/components/MkFeaturedPhotos.vue';
import cherrypicksvg from '/client-assets/cherrypick.svg';
import { misskeyApiGet } from '@/utility/misskey-api.js';
import MkVisitorDashboard from '@/components/MkVisitorDashboard.vue';
import { getProxiedImageUrl } from '@/utility/media-proxy.js';
import { instance as meta } from '@/instance.js';

const instances = ref<Misskey.entities.FederationInstance[]>();

function getInstanceIcon(instance: Misskey.entities.FederationInstance): string {
	if (!instance.iconUrl) {
		return '';
	}

	return getProxiedImageUrl(instance.iconUrl, 'preview');
}

misskeyApiGet('federation/instances', {
	sort: '+pubSub',
	limit: 20,
	blocked: false,
}).then(_instances => {
	instances.value = _instances;
});
</script>

<style lang="scss" module>
.root {
	height: 100cqh;
	overflow: auto;
	overscroll-behavior: contain;
}

.bg {
	position: fixed;
	top: 0;
	right: 0;
	width: 80vw; // 100%からshapeの幅を引いている
	height: 100vh;
}

.tl {
	position: fixed;
	top: 0;
	bottom: 0;
	right: 64px;
	margin: auto;
	padding: 128px 0;
	width: 500px;
	height: calc(100% - 256px);
	overflow: hidden;
	-webkit-mask-image: linear-gradient(0deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 128px, rgba(0,0,0,1) calc(100% - 128px), rgba(0,0,0,0) 100%);
	mask-image: linear-gradient(0deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 128px, rgba(0,0,0,1) calc(100% - 128px), rgba(0,0,0,0) 100%);

	@media (max-width: 1200px) {
		display: none;
	}
}

.shape1 {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: var(--MI_THEME-accent);
	clip-path: polygon(0% 0%, 45% 0%, 20% 100%, 0% 100%);
}
.shape2 {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: var(--MI_THEME-accent);
	clip-path: polygon(0% 0%, 25% 0%, 35% 100%, 0% 100%);
	opacity: 0.5;
}

/* ===== 旗鯖fork: Righteous フォント宣言 (Hataskey ブランド名用、OFL ライセンス) ===== */
@font-face {
	font-family: 'Righteous';
	font-style: normal;
	font-weight: 400;
	font-display: swap;
	src: url('/client-assets/Righteous-Regular.woff2') format('woff2');
}

/* ===== 旗鯖fork: ロゴラッパ ===== */
.logoWrapper {
	position: fixed;
	top: 36px;
	left: 36px;
	flex: auto;
	user-select: none;
	pointer-events: none;

	@media (max-width: 450px) {
		top: 24px;
		left: 24px;
	}
}

/* 1段目: Hataskey ブランド名 (Righteous フォント、判子色) */
.brandName {
	margin: 0 0 6px 0;
	padding: 0;
	font-family: 'Righteous', system-ui, sans-serif;
	font-size: 48px;
	font-weight: 400;
	line-height: 1;
	letter-spacing: 0.02em;
	color: var(--MI_THEME-accent);
	/* 旗鯖fork: 背景シェイプ上での視認性確保
	   - text-stroke で背景色 1px の縁取り(文字輪郭をはっきりさせる)
	   - paint-order で stroke を fill の後ろに描画(文字本体が前面に)
	   - ソフトな text-shadow で立体感を加える */
	-webkit-text-stroke: 1px var(--MI_THEME-bg);
	text-stroke: 1px var(--MI_THEME-bg);
	paint-order: stroke fill;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);

	@media (max-width: 450px) {
		font-size: 36px;
	}
}

/* 2段目: A fork of CherryPick (ロゴ) */
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
	margin-left: 128px;
	padding: 100px 0 100px 0;

	@media (max-width: 1200px) {
		margin: auto;
	}
}

.federation {
	position: fixed;
	bottom: 16px;
	left: 0;
	right: 0;
	margin: auto;
	background: color(from var(--MI_THEME-panel) srgb r g b / 0.5);
	-webkit-backdrop-filter: var(--MI-blur, blur(15px));
	backdrop-filter: var(--MI-blur, blur(15px));
	border-radius: 999px;
	overflow: clip;
	width: 800px;
	padding: 8px 0;

	@media (max-width: 900px) {
		display: none;
	}
}

.federationInstance {
	display: inline-flex;
	align-items: center;
	vertical-align: bottom;
	padding: 6px 12px 6px 6px;
	margin: 0 10px 0 0;
	background: var(--MI_THEME-panel);
	border-radius: 999px;
}

.federationInstanceIcon {
	display: inline-block;
	width: 20px;
	height: 20px;
	margin-right: 5px;
	border-radius: 999px;
}
</style>
