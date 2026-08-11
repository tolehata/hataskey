<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<component :is="prefer.s.enablePullToRefresh ? MkPullToRefresh : 'div'" :refresher="() => reload()">
	<MkLoading v-if="paginator.fetching.value"/>

	<MkError v-else-if="paginator.error.value" @retry="paginator.init()"/>

	<div v-else-if="displayNotifications.length === 0" key="_empty_">
		<slot name="empty"><MkResult type="empty" :text="i18n.ts.noNotifications"/></slot>
	</div>

	<div v-else ref="rootEl">
		<component
			:is="prefer.s.animation ? TransitionGroup : 'div'" :class="[$style.notifications]"
			:enterActiveClass="$style.transition_x_enterActive"
			:leaveActiveClass="$style.transition_x_leaveActive"
			:enterFromClass="$style.transition_x_enterFrom"
			:leaveToClass="$style.transition_x_leaveTo"
			:moveClass="$style.transition_x_move"
			tag="div"
		>
			<div v-for="(notification, i) in displayNotifications" :key="notification.id" :data-scroll-anchor="notification.id" :class="$style.item">
				<div v-if="i > 0 && isSeparatorNeeded(displayNotifications[i - 1].createdAt, notification.createdAt)" :class="$style.date">
					<span><i class="ti ti-chevron-up"></i> {{ getSeparatorInfo(displayNotifications[i - 1].createdAt, notification.createdAt)?.prevText }}</span>
					<span style="height: 1em; width: 1px; background: var(--MI_THEME-divider);"></span>
					<span>{{ getSeparatorInfo(displayNotifications[i - 1].createdAt, notification.createdAt)?.nextText }} <i class="ti ti-chevron-down"></i></span>
				</div>
				<MkHataFeedNotificationGroup v-if="notification.type === 'hataFeed:grouped'" :class="$style.content" :group="notification" :withTime="true"/>
				<MkNote v-else-if="['reply', 'quote', 'mention'].includes(notification.type) && 'note' in notification" :class="$style.content" :note="notification.note" :withHardMute="true" :notification="true"/>
				<XNotification v-else :class="$style.content" :notification="notification" :withTime="true" :full="true"/>
			</div>
		</component>
		<button v-show="paginator.canFetchOlder.value" key="_more_" v-appear="prefer.s.enableInfiniteScroll ? paginator.fetchOlder : null" :disabled="paginator.fetchingOlder.value" class="_button" :class="$style.more" @click="paginator.fetchOlder">
			<div v-if="!paginator.fetchingOlder.value">{{ i18n.ts.loadMore }}</div>
			<MkLoading v-else/>
		</button>
	</div>
</component>
</template>

<script lang="ts" setup>
import { onUnmounted, onMounted, computed, ref, useTemplateRef, TransitionGroup, markRaw, watch } from 'vue';
import * as Misskey from 'cherrypick-js';
import { notificationTypes } from 'cherrypick-js';
import { useInterval } from '@@/js/use-interval.js';
import { useDocumentVisibility } from '@@/js/use-document-visibility.js';
import { getScrollContainer, scrollToTop } from '@@/js/scroll.js';
import XNotification from '@/components/MkNotification.vue';
import MkHataFeedNotificationGroup from '@/components/MkHataFeedNotificationGroup.vue';
import MkNote from '@/components/MkNote.vue';
import { useStream } from '@/stream.js';
import { i18n } from '@/i18n.js';
import MkPullToRefresh from '@/components/MkPullToRefresh.vue';
import { prefer } from '@/preferences.js';
import { store } from '@/store.js';
import { isSeparatorNeeded, getSeparatorInfo } from '@/utility/timeline-date-separate.js';
import { Paginator } from '@/utility/paginator.js';
import { globalEvents } from '@/events.js';
import { groupHataFeedBellNotifications } from '@/utility/hatafeed-bell-group.js';
import { $i } from '@/i.js';
import { miLocalStorage } from '@/local-storage.js';
import { isNotificationFromBot, NOTIFICATION_FILTER_POLICY_NOTICE } from '@/utility/notification-filter.js';

const props = defineProps<{
	excludeTypes?: typeof notificationTypes[number][] | null;
	excludeBots?: boolean;
	notUseGrouped?: boolean;
	showFilterPolicyNotice?: boolean;
}>();

const rootEl = useTemplateRef('rootEl');
const shouldGroupHataFeed = computed(() => prefer.s.useGroupedNotifications && !props.notUseGrouped);

const paginator = shouldGroupHataFeed.value ? markRaw(new Paginator('i/notifications-grouped', {
	limit: 20,
	computedParams: computed(() => ({
		excludeTypes: props.excludeTypes ?? undefined,
		excludeBots: props.excludeBots || undefined,
	})),
})) : markRaw(new Paginator('i/notifications', {
	limit: 20,
	computedParams: computed(() => ({
		excludeTypes: props.excludeTypes ?? undefined,
		excludeBots: props.excludeBots || undefined,
	})),
}));

const filterPolicyNotice = ref<Misskey.entities.Notification | null>(null);
const displayNotifications = computed(() => {
	const sourceNotifications = (paginator.items.value as Misskey.entities.Notification[])
		.filter(notification => !props.excludeBots || !isNotificationFromBot(notification));
	const notifications = shouldGroupHataFeed.value
		? groupHataFeedBellNotifications(sourceNotifications)
		: sourceNotifications;
	return filterPolicyNotice.value == null ? notifications : [filterPolicyNotice.value, ...notifications];
});

const MIN_POLLING_INTERVAL = 1000 * 10;
const POLLING_INTERVAL =
	prefer.s.pollingInterval === 1 ? MIN_POLLING_INTERVAL * 1.5 * 1.5 :
	prefer.s.pollingInterval === 2 ? MIN_POLLING_INTERVAL * 1.5 :
	prefer.s.pollingInterval === 3 ? MIN_POLLING_INTERVAL :
	MIN_POLLING_INTERVAL;

if (!store.s.realtimeMode) {
	useInterval(async () => {
		paginator.fetchNewer({
			toQueue: false,
		});
	}, POLLING_INTERVAL, {
		immediate: false,
		afterMounted: true,
	});
}

function isTop() {
	if (scrollContainer == null) return true;
	if (rootEl.value == null) return true;
	const scrollTop = scrollContainer.scrollTop;
	const tlTop = rootEl.value.offsetTop - scrollContainer.offsetTop;
	return scrollTop <= tlTop;
}

function releaseQueue() {
	paginator.releaseQueue();
	if (rootEl.value != null) scrollToTop(rootEl.value);
}

let scrollContainer: HTMLElement | null = null;

function onScrollContainerScroll() {
	if (isTop()) {
		paginator.releaseQueue();
	}
}

watch(rootEl, (el) => {
	if (el && scrollContainer == null) {
		scrollContainer = getScrollContainer(el);
		if (scrollContainer == null) return;
		scrollContainer.addEventListener('scroll', onScrollContainerScroll, { passive: true }); // ほんとはscrollendにしたいけどiosが非対応
	}
}, { immediate: true });

const visibility = useDocumentVisibility();
let isPausingUpdate = false;

watch(visibility, () => {
	if (visibility.value === 'hidden') {
		isPausingUpdate = true;
	} else { // 'visible'
		isPausingUpdate = false;
		if (isTop()) {
			releaseQueue();
		}
	}
});

function onNotification(notification: Misskey.entities.Notification) {
	const excludedTypes: readonly string[] | undefined = props.excludeTypes ?? undefined;
	const isMuted = (excludedTypes?.includes(notification.type) ?? false)
		|| (props.excludeBots === true && isNotificationFromBot(notification));
	if (isMuted || window.document.visibilityState === 'visible') {
		if (store.s.realtimeMode) {
			useStream().send('readNotification');
		}
	}

	if (!isMuted) {
		if (isTop() && !isPausingUpdate) {
			paginator.prepend(notification);
		} else {
			paginator.enqueue(notification);
		}
	}
}

function reload() {
	return paginator.reload();
}

let connection: Misskey.IChannelConnection<Misskey.Channels['main']> | null = null;

onMounted(() => {
	if (props.showFilterPolicyNotice && $i != null) {
		const noticeKey = `hataNotificationFilterPolicyNoticeShown:${$i.id}` as const;
		if (miLocalStorage.getItem(noticeKey) == null) {
			filterPolicyNotice.value = {
				id: NOTIFICATION_FILTER_POLICY_NOTICE.id,
				createdAt: new Date().toISOString(),
				type: 'app',
				header: NOTIFICATION_FILTER_POLICY_NOTICE.header,
				body: NOTIFICATION_FILTER_POLICY_NOTICE.body,
				icon: null,
				link: null,
			} as Misskey.entities.Notification;
			miLocalStorage.setItem(noticeKey, '1');
		}
	}

	paginator.init();

	if (paginator.computedParams) {
		watch(paginator.computedParams, () => {
			paginator.reload();
		}, { immediate: false, deep: true });
	}

	if (store.s.realtimeMode) {
		connection = useStream().useChannel('main');
		connection.on('notification', onNotification);
		connection.on('notificationFlushed', reload);

		globalEvents.on('reloadNotification', () => reload());
	}
});

onUnmounted(() => {
	if (connection) connection.dispose();
	if (scrollContainer != null) {
		scrollContainer.removeEventListener('scroll', onScrollContainerScroll);
	}
});

defineExpose({
	reload,
});
</script>

<style lang="scss" module>
.transition_x_move {
	transition: transform 0.7s cubic-bezier(0.23, 1, 0.32, 1);
}

.transition_x_enterActive {
	transition: transform 0.7s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.7s cubic-bezier(0.23, 1, 0.32, 1);

	&.content,
	.content {
		/* Skip Note Rendering有効時、TransitionGroupで通知を追加するときに一瞬がくっとなる問題を抑制する */
		content-visibility: visible !important;
	}
}

.transition_x_leaveActive {
	transition: height 0.2s cubic-bezier(0,.5,.5,1), opacity 0.2s cubic-bezier(0,.5,.5,1);
}

.transition_x_enterFrom {
	opacity: 0;
	transform: translateY(max(-64px, -100%));
}

@supports (interpolate-size: allow-keywords) {
	.transition_x_enterFrom {
		interpolate-size: allow-keywords; // heightのtransitionを動作させるために必要
		height: 0;
	}
}

.transition_x_leaveTo {
	opacity: 0;
}

.notifications {
	container-type: inline-size;
	background: var(--MI_THEME-panel);
}

.item {
	border-bottom: solid 0.5px var(--MI_THEME-divider);
}

.date {
	display: flex;
	font-size: 85%;
	align-items: center;
	justify-content: center;
	gap: 1em;
	padding: 8px 8px;
	margin: 0 auto;
	border-bottom: solid 0.5px var(--MI_THEME-divider);
}

.more {
	display: block;
	width: 100%;
	box-sizing: border-box;
	padding: 16px;
	background: var(--MI_THEME-panel);
	border-top: solid 0.5px var(--MI_THEME-divider);
}
</style>
