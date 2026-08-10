<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<XColumn :column="column" :isStacked="isStacked" :menu="menu" :refresher="reload">
	<template #header><i class="ti ti-bell" style="margin-right: 8px;"></i>{{ column.name || i18n.ts._deck._columns.notifications }}</template>

	<MkStreamingNotificationsTimeline ref="notificationsComponent" :excludeTypes="resolvedExcludeTypes" :showFilterPolicyNotice="hasConfiguredFilter"/>
</XColumn>
</template>

<script lang="ts" setup>
import { computed, onMounted, useTemplateRef } from 'vue';
import XColumn from './column.vue';
import type { Column } from '@/deck.js';
import { updateColumn } from '@/deck.js';
import MkStreamingNotificationsTimeline from '@/components/MkStreamingNotificationsTimeline.vue';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { hasConfiguredNotificationFilter, migrateNotificationFilterSnapshot, resolveNotificationFilter } from '@/utility/notification-filter.js';

const props = defineProps<{
	column: Column;
	isStacked: boolean;
}>();

const notificationsComponent = useTemplateRef('notificationsComponent');
const resolvedExcludeTypes = computed(() => resolveNotificationFilter(
	props.column.excludeTypes,
	props.column.notificationFilterKnownTypes,
).excludeTypes);
const hasConfiguredFilter = computed(() => hasConfiguredNotificationFilter(
	props.column.excludeTypes,
	props.column.notificationFilterKnownTypes,
));

onMounted(() => {
	const migrated = migrateNotificationFilterSnapshot(props.column.excludeTypes, props.column.notificationFilterKnownTypes);
	if (migrated == null) return;
	updateColumn(props.column.id, {
		notificationFilterKnownTypes: migrated.knownTypes,
	});
});

async function reload() {
	await notificationsComponent.value?.reload();
}

async function func() {
	const { dispose } = await os.popupAsyncWithDialog(import('@/components/MkNotificationSelectWindow.vue').then(x => x.default), {
		excludeTypes: props.column.excludeTypes,
		knownTypes: props.column.notificationFilterKnownTypes,
	}, {
		done: async (res) => {
			const { excludeTypes, knownTypes } = res;
			updateColumn(props.column.id, {
				excludeTypes: excludeTypes,
				notificationFilterKnownTypes: knownTypes,
			});
		},
		closed: () => dispose(),
	});
}

const menu = [{
	icon: 'ti ti-pencil',
	text: i18n.ts.notificationSetting,
	action: func,
}];
</script>
