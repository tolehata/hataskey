<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader backPath="/">
	<div class="_spacer" style="--MI_SPACER-w: 800px;">
		<div class="_gaps">
			<div class="_panel" :class="$style.link">
				<MkA to="/bubble-game">
					<img src="/client-assets/drop-and-fusion/logo.png" style="display: block; max-width: 100%; max-height: 200px; margin: auto;"/>
				</MkA>
			</div>
			<div class="_panel" :class="$style.link">
				<MkA to="/stacking-game" :class="$style.stackingLink">
					<div :class="$style.stackingCard">
						<div :class="$style.stackingEmoji">🏗️</div>
						<div :class="$style.stackingTitle">{{ copy._index.stackingTitle }}</div>
						<div :class="$style.stackingSub">{{ copy._index.stackingDescription }}</div>
					</div>
				</MkA>
			</div>
			<div class="_panel" :class="$style.link">
				<MkA to="/whack-emoji" :class="$style.stackingLink">
					<div :class="$style.stackingCard" style="background: linear-gradient(135deg, #a29bfe22, #6c5ce722, #fd79a822);">
						<div :class="$style.stackingEmoji">🔨</div>
						<div :class="$style.stackingTitle">{{ copy._index.whackTitle }}</div>
						<div :class="$style.stackingSub">{{ copy._index.whackDescription }}</div>
					</div>
				</MkA>
			</div>
			<div class="_panel" :class="$style.link">
				<MkA to="/emoji-shoot" :class="$style.stackingLink">
					<div :class="$style.stackingCard" style="background: linear-gradient(135deg, #ff6b6b22, #ffa50222, #ee5a2422);">
						<div :class="$style.stackingEmoji">🔫</div>
						<div :class="$style.stackingTitle">{{ copy._index.shootTitle }}</div>
						<div :class="$style.stackingSub">{{ copy._index.shootDescription }}</div>
					</div>
				</MkA>
			</div>
			<div class="_panel" :class="$style.link">
				<MkA to="/reversi">
					<img src="/client-assets/reversi/logo.png" style="display: block; max-width: 100%; max-height: 200px; margin: auto;"/>
				</MkA>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';

const copy = i18n.ts._hata._games;

definePage(() => ({
	title: copy._index.pageTitle,
	icon: 'ti ti-device-gamepad',
}));
</script>

<style module>
.link:focus-within {
	outline: 2px solid var(--MI_THEME-focus);
	outline-offset: -2px;
}
.stackingLink { display: block; text-decoration: none; color: inherit; }
.stackingCard { padding: 24px 16px; text-align: center; background: linear-gradient(135deg, #ff6b6b22, #feca5722, #48dbfb22); }
.stackingEmoji { font-size: 3rem; margin-bottom: 8px; }
.stackingTitle { font-size: 1.3rem; font-weight: 900; }
.stackingSub { font-size: .85rem; opacity: .7; margin-top: 4px; }
</style>
