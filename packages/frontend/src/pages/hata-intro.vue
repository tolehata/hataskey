<!--
SPDX-FileCopyrightText: tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader hideHeader>
	<HataIntro :darkMode="store.r.darkMode.value" :animation="prefer.r.animation.value"/>
</PageWithHeader>
</template>

<script lang="ts" setup>
import HataIntro from '@/components/hata-intro/HataIntro.vue';
import { definePage } from '@/page.js';
import { store } from '@/store.js';
import { prefer } from '@/preferences.js';

definePage({ title: 'HataIntro', icon: 'ti ti-book', needWideArea: true });
</script>
