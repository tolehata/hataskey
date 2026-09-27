<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<Hk3App/>
	<XCommon/>
</div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import { instanceName } from '@@/js/config.js';
import XCommon from './_common_/common.vue';
import type { PageMetadata } from '@/page.js';
import Hk3App from '@/components/hataskey3/Hk3App.vue';
import { provideMetadataReceiver, provideReactiveMetadata } from '@/page.js';
import { mainRouter } from '@/router.js';
import { DI } from '@/di.js';

const pageMetadata = ref<PageMetadata | null>(null);

function restoreHomeMetadata() {
	pageMetadata.value = { title: instanceName, icon: 'ti ti-home' };
	window.document.title = instanceName;
}

watch(() => mainRouter.currentRoute.value.path, path => {
	if (path === '/') restoreHomeMetadata();
}, { immediate: true, flush: 'post' });

provide(DI.router, mainRouter);
provideMetadataReceiver((metadataGetter) => {
	if (mainRouter.currentRoute.value.path === '/') {
		restoreHomeMetadata();
		return;
	}
	pageMetadata.value = metadataGetter();
	if (pageMetadata.value) {
		window.document.title = `${pageMetadata.value.title} | ${instanceName}`;
	}
});
provideReactiveMetadata(pageMetadata);

// Hataskey UI 2 のグラス表示は <html> のクラスで全体のノート・パネルを差し替えるため、
// UI3 の表示中は外しておく(ほかの処理が付け直しても、UI3 の間はすぐ外す)。
const GLASS_CLASS = 'hataGlassUi';
let glassObserver: MutationObserver | null = null;

function removeGlassClass() {
	if (window.document.documentElement.classList.contains(GLASS_CLASS)) window.document.documentElement.classList.remove(GLASS_CLASS);
}

onMounted(() => {
	removeGlassClass();
	window.document.documentElement.dataset.hk3Ui = 'true';
	glassObserver = new MutationObserver(removeGlassClass);
	glassObserver.observe(window.document.documentElement, { attributes: true, attributeFilter: ['class'] });
});
onBeforeUnmount(() => {
	glassObserver?.disconnect();
	delete window.document.documentElement.dataset.hk3Ui;
});
</script>

<style lang="scss" module>
.root {
	display: flex;
	width: 100%;
	height: var(--MI-viewport-height, 100dvh);
	min-width: 0;
	min-height: 0;
	overflow: hidden;
}
</style>

<style>
/* 共通の読み込み表示(右上の回転アイコン)は UI3 の右上の操作と重なるため、UI3 では上端の細い帯(Hk3App)に置き換える。 */
html[data-hk3-ui] #wait {
	display: none;
}
</style>
