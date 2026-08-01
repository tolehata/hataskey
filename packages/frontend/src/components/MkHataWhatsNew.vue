<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only

旗鯖fork: 更新後に1回だけ出す「今回の更新内容」。
	- 中身は utility/hata-whats-new.ts（HATA-CHANGELOG.md の要約）。
	- ⚠️MkUpdated（本家の「更新されました！」）とは別物。あちらは版の告知＋キャッシュ削除、
	  こちらは**何が変わったか**の説明。⚠️同時に開くと重なるので、表示は
	  utility/hata-dialog-queue.ts の待ち行列を通す（呼び出し側の責任）。
	- ⚠️「表示済み」の記録は**閉じられたとき**に付ける（呼び出し側）。先に付けると、
	  MkUpdated のキャッシュ削除による再読み込みで消えたときに二度と出なくなる。
-->
<template>
<MkModal ref="modal" :preferType="'dialog'" :zPriority="'middle'" @click="modal?.close()" @closed="emit('closed')">
	<div :class="$style.root" role="dialog" aria-modal="true" aria-labelledby="hata-whats-new-title">
		<header :class="$style.header">
			<div :class="$style.chip" aria-hidden="true"><i class="ti ti-sparkles"></i></div>
			<div :class="$style.headerText">
				<div :class="$style.eyebrow">{{ whatsNew.version }}</div>
				<h1 id="hata-whats-new-title" :class="$style.title">今回の更新内容</h1>
			</div>
		</header>

		<p :class="$style.headline">{{ whatsNew.headline }}</p>

		<div :class="$style.items">
			<div v-for="(item, i) in whatsNew.items" :key="i" :class="$style.item">
				<i :class="[item.icon, $style.itemIcon]" aria-hidden="true"></i>
				<div :class="$style.itemBody">
					<div :class="$style.itemTitle">{{ item.title }}</div>
					<div :class="$style.itemText">{{ item.text }}</div>
					<button v-if="item.to" class="_button" :class="$style.itemLink" @click="go(item.to)">
						設定を開く <i class="ti ti-chevron-right"></i>
					</button>
				</div>
			</div>
		</div>

		<MkButton primary rounded full :class="$style.gotIt" @click="modal?.close()">わかった</MkButton>
	</div>
</MkModal>
</template>

<script lang="ts" setup>
import { useTemplateRef } from 'vue';
import MkModal from '@/components/MkModal.vue';
import MkButton from '@/components/MkButton.vue';
import type { HataWhatsNewItem } from '@/utility/hata-whats-new.js';
import { HATA_WHATS_NEW as whatsNew } from '@/utility/hata-whats-new.js';
import { mainRouter } from '@/router.js';

const modal = useTemplateRef('modal');

const emit = defineEmits<{
	(ev: 'closed'): void;
}>();

function go(to: HataWhatsNewItem['to']) {
	if (to == null) return;
	// ⚠️先に閉じる。開いたまま遷移すると、行き先の上に幕が残る。
	modal.value?.close();
	mainRouter.push(to);
}
</script>

<style lang="scss" module>
.root {
	margin: auto;
	position: relative;
	box-sizing: border-box;
	width: 100%;
	max-width: 480px;
	padding: 26px 24px 22px;
	/* ⚠️中身が画面より高いと下端のボタンが押せなくなる（MkUISetup と同じ事故）。 */
	max-height: calc(100dvh - 32px);
	overflow-y: auto;
	overscroll-behavior: contain;
	background: var(--MI_THEME-panel);
	border-radius: var(--MI-radius);
}

.header {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 14px;
}

.chip {
	display: grid;
	place-items: center;
	flex: none;
	width: 42px;
	height: 42px;
	border-radius: 14px;
	font-size: 20px;
	color: var(--MI_THEME-accent);
	background: color-mix(in srgb, var(--MI_THEME-accent) 14%, transparent);
}

.headerText { min-width: 0; }
.eyebrow { font-size: 0.78em; opacity: 0.6; }
.title { margin: 0; font-size: 1.25em; font-weight: 700; }

.headline {
	margin: 0 0 16px;
	font-size: 0.92em;
	line-height: 1.7;
	opacity: 0.85;
}

.items { display: flex; flex-direction: column; gap: 12px; }

.item {
	display: flex;
	gap: 12px;
	padding: 13px 14px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 12px;
}

.itemIcon {
	flex: none;
	margin-top: 2px;
	font-size: 1.3em;
	color: var(--MI_THEME-accent);
}

.itemBody { min-width: 0; }
.itemTitle { font-weight: 700; font-size: 0.95em; }
.itemText { margin-top: 3px; font-size: 0.85em; line-height: 1.65; opacity: 0.75; }

.itemLink {
	margin-top: 7px;
	padding: 0;
	font-size: 0.83em;
	font-weight: 700;
	color: var(--MI_THEME-accent);
}

.gotIt { margin-top: 18px; }
</style>
