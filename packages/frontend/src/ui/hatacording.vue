<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<HatacordingUi/>
	<XCommon/>
</div>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, provide, ref } from 'vue';
import { instanceName } from '@@/js/config.js';
import XCommon from './_common_/common.vue';
import type { PageMetadata } from '@/page.js';
import { provideMetadataReceiver, provideReactiveMetadata } from '@/page.js';
import { mainRouter } from '@/router.js';
import { DI } from '@/di.js';

const HatacordingUi = defineAsyncComponent(() => import('@/pages/hatacording-ui.vue'));
const pageMetadata = ref<PageMetadata | null>(null);

provide(DI.router, mainRouter);
provideMetadataReceiver((metadataGetter) => {
	pageMetadata.value = metadataGetter();
	if (pageMetadata.value) {
		window.document.title = `${pageMetadata.value.title} | ${instanceName}`;
	}
});
provideReactiveMetadata(pageMetadata);
</script>

<style lang="scss" module>
.root {
	display: flex;
	width: 100%;
	height: 100dvh;
	min-width: 0;
	min-height: 0;
	overflow: hidden;
}
</style>
