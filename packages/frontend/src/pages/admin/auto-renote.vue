<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<PageWithHeader>
	<div class="_spacer" style="--MI_SPACER-w: 900px;"><MkAutoRenoteList admin/></div>
</PageWithHeader>
</template>
<script setup lang="ts">
import MkAutoRenoteList from '@/components/MkAutoRenoteList.vue';
import { definePage } from '@/page.js';
import { i18n } from '@/i18n.js';
definePage(() => ({ title: i18n.ts._autoRenote.manage, icon: 'ti ti-repeat' }));
</script>
