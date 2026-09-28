<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<div><slot/></div>
</template>

<script lang="ts" setup>
import { computed, provide } from 'vue';

const props = defineProps<{ omitHeaderTitle: boolean; omitHeaderBack?: boolean }>();

// Keep this provider mounted so changing the pane presentation never remounts its RouterView.
provide('shouldOmitHeaderTitle', computed(() => props.omitHeaderTitle));
provide('shouldOmitHeaderBack', computed(() => props.omitHeaderBack ?? false));
</script>
