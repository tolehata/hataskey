<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(HataFeed 2a/3a): 通知パネル。ツールバーのベルから開く。
  種類フィルタ(ソート)と前後ページ送り(< 〇 >)をこのパネルに集約。
  表示形態は MkModal が自動で切替える:
    - PC / タブレット → ベルにアンカーした吹き出し(popup、右上に出る)
    - スマホ        → 画面下からのドロワー(drawer、全画面寄り)
  anchorElement(ベル)を渡すのが肝。渡すことで touch スマホ以外は popup になる。
  popup は transparentBg で背後をぼかさず、HataFeedの内容を見比べられるようにする。
-->
<template>
<MkModal
	ref="modal"
	v-slot="{ type, maxHeight }"
	:zPriority="'middle'"
	:anchorElement="anchorElement"
	:anchor="{ x: 'right', y: 'bottom' }"
	:transparentBg="true"
	:disableBgBlur="true"
	@click="modal?.close()"
	@esc="modal?.close()"
	@closed="emit('closed')"
>
	<div
		data-hatacording-hatafeed-notifications
		class="_popup _shadow"
		:class="[$style.panel, { [$style.drawer]: type === 'drawer' }]"
		:style="{ maxHeight: maxHeight ? maxHeight + 'px' : undefined, width: type === 'drawer' ? undefined : '360px' }"
	>
		<div :class="$style.header">
			<span :class="$style.title"><i class="ti ti-bell"></i> {{ copy.title }}</span>
			<button v-if="unreadCount > 0" :class="$style.readBtn" @click="markAllRead"><i class="ti ti-checks"></i> {{ copy.markRead }}</button>
			<button :class="$style.closeBtn" @click="modal?.close()"><i class="ti ti-x"></i></button>
		</div>

		<div :class="$style.bar">
			<button :class="[$style.filterBtn, filter && $style.filterBtnOn]" @click="openFilter"><i class="ti ti-filter"></i> {{ filter ? (notifTypeLabel[filter] ?? filter) : copy.all }} <i class="ti ti-chevron-down" :class="$style.filterCaret"></i></button>
		</div>

		<div v-if="loading" :class="$style.state">{{ copy.loading }}</div>
		<div v-else-if="items.length === 0" :class="$style.state">
			<i class="ti ti-bell-off" :class="$style.stateIcon"></i>
			<div>{{ filter ? copy.noNotificationsOfType : copy.noNotifications }}</div>
		</div>
		<div v-else :class="$style.list">
			<!-- 旗鯖fork(通知グルーピング): 本体 reaction:grouped の流儀で、同種・同一対象の通知を1行にまとめる。
			     count===1 は従来どおりの単一行。count>1 はまとめ行で、クリックで下に個別行を展開する。 -->
			<template v-for="g in groups" :key="g.key">
				<button
					:class="[$style.row, !g.isRead && $style.rowUnread, g.count > 1 && $style.groupRow]"
					@click="g.count > 1 ? toggle(g.key) : onClick(g.items[0])"
				>
					<i :class="['ti', notifIcon(g.type), $style.rowIcon]"></i>
					<div :class="$style.rowBody">
						<HataFeedNotificationBody :class="$style.rowMsg" :text="g.count > 1 ? groupSummary(g) : notificationDisplayMessage(g.items[0])"/>
						<div :class="$style.rowMeta">
							<template v-if="g.count > 1">
								<span :class="$style.avatars">
									<HfAvatar v-for="a in g.actors.slice(0, 3)" :key="a.id" :user="a" :size="16" :stack="true"/>
								</span>
								<span :class="$style.rowActor">{{ copyx.itemCount({ count: g.count.toString() }) }}</span>
							</template>
							<template v-else>
								<HfAvatar v-if="g.items[0].actor" :user="g.items[0].actor" :size="16"/>
								<span v-if="g.items[0].actor" :class="$style.rowActor">{{ g.items[0].actor.name ?? g.items[0].actor.username }}</span>
							</template>
							<MkTime :class="$style.rowTime" :time="g.createdAt" mode="relative"/>
							<i v-if="g.count > 1" class="ti" :class="[expanded.has(g.key) ? 'ti-chevron-up' : 'ti-chevron-down', $style.expandCaret]"></i>
						</div>
					</div>
				</button>
				<div v-if="g.count > 1 && expanded.has(g.key)" :class="$style.children">
					<button
						v-for="n in g.items"
						:key="n.id"
						:class="[$style.row, $style.childRow, !n.isRead && $style.rowUnread]"
						@click="onClick(n)"
					>
						<i :class="['ti', notifIcon(n.type), $style.rowIcon]"></i>
						<div :class="$style.rowBody">
							<HataFeedNotificationBody :class="$style.rowMsg" :text="notificationDisplayMessage(n)"/>
							<div :class="$style.rowMeta">
								<HfAvatar v-if="n.actor" :user="n.actor" :size="16"/>
								<span v-if="n.actor" :class="$style.rowActor">{{ n.actor.name ?? n.actor.username }}</span>
								<MkTime :class="$style.rowTime" :time="n.createdAt" mode="relative"/>
							</div>
						</div>
					</button>
				</div>
			</template>
		</div>

		<div v-if="page > 0 || hasNext" :class="$style.pager">
			<button :class="$style.pagerBtn" :disabled="page === 0" @click="prevPage"><i class="ti ti-chevron-left"></i></button>
			<span :class="$style.pagerPage">{{ page + 1 }}</span>
			<button :class="$style.pagerBtn" :disabled="!hasNext" @click="nextPage"><i class="ti ti-chevron-right"></i></button>
		</div>
	</div>
</MkModal>
</template>

<script lang="ts" setup>
import { ref, computed, useTemplateRef, onMounted } from 'vue';
import type { HataFeedEmojiRequest, HataFeedNotif } from '@/utility/hatafeed.js';
import MkModal from '@/components/MkModal.vue';
import HfAvatar from '@/components/HfAvatar.vue';
import HataFeedNotificationBody from '@/components/HataFeedNotificationBody.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { useRouter } from '@/router.js';
import { markHataFeedNotificationsRead, notifIcon, notifTypeLabel, groupHataFeedNotifications, groupSummary, notificationDisplayMessage } from '@/utility/hatafeed.js';
import { i18n } from '@/i18n.js';

const props = defineProps<{ anchorElement?: HTMLElement | null }>();
const emit = defineEmits<{ (ev: 'closed'): void; (ev: 'read', unreadCount: number): void }>();
const modal = useTemplateRef('modal');
const router = useRouter();
const copy = i18n.ts._hata._hatafeed._notifications;
const copyx = i18n.tsx._hata._hatafeed._notifications;

const PAGE_SIZE = 8;
const items = ref<HataFeedNotif[]>([]);
const unreadCount = ref(0);
const loading = ref(true);
const filter = ref<string | null>(null);
const page = ref(0);
const cursors = ref<(string | undefined)[]>([undefined]); // cursors[i] = page i を取得する untilId
const hasNext = ref(false);

// 旗鯖fork(通知グルーピング): 取得済みの通知を同種・同一対象でまとめた表示単位。
const groups = computed(() => groupHataFeedNotifications(items.value));
// 旗鯖fork(通知グルーピング): 展開中のグループ key 集合(Set は再代入して反応させる)。
const expanded = ref<Set<string>>(new Set());

function toggle(key: string) {
	const next = new Set(expanded.value);
	if (next.has(key)) next.delete(key);
	else next.add(key);
	expanded.value = next;
}

// 旗鯖fork: 指定カーソルから1ページ分取得。通知APIに type 絞りが無いため、フィルタ時は
//   多めに取得してクライアント側で type 一致を抽出する簡易実装。
async function fetchPage(untilId: string | undefined) {
	loading.value = true;
	try {
		const limit = (filter.value ? PAGE_SIZE * 4 : PAGE_SIZE) + 1;
		const res = await misskeyApi('hata/feedback/notifications', { limit, untilId });
		// ⚠️表示した時点でバッジを消す。ただし「どれが新しいか」は消さないので、
		//   この一覧の未読表示は取得時の状態のまま残る。
		unreadCount.value = res.unreadCount;
		if (res.unreadCount > 0) {
			void markHataFeedNotificationsRead();
			emit('read', 0);
		}
		let list = res.notifications as unknown as HataFeedNotif[];
		if (filter.value) list = list.filter(n => n.type === filter.value);
		hasNext.value = list.length > PAGE_SIZE;
		items.value = list.slice(0, PAGE_SIZE);
		expanded.value = new Set(); // 旗鯖fork: ページ切替時は展開状態をリセット(key が別ページと混ざらないように)。
	} finally {
		loading.value = false;
	}
}

async function reload() {
	page.value = 0;
	cursors.value = [undefined];
	await fetchPage(undefined);
}

async function nextPage() {
	if (!hasNext.value) return;
	const lastId = items.value[items.value.length - 1]?.id;
	page.value += 1;
	cursors.value[page.value] = lastId;
	await fetchPage(lastId);
}

async function prevPage() {
	if (page.value === 0) return;
	page.value -= 1;
	await fetchPage(cursors.value[page.value]);
}

function openFilter(ev: MouseEvent) {
	const present = [...new Set(items.value.map(n => n.type))];
	os.popupMenu([
		{ text: copy.all, active: filter.value === null, action: () => { filter.value = null; reload(); } },
		...present.map(t => ({
			text: notifTypeLabel[t] ?? t,
			active: filter.value === t,
			action: () => { filter.value = t; reload(); },
		})),
	], (ev.currentTarget ?? ev.target) as HTMLElement);
}

async function markAllRead() {
	await misskeyApi('hata/feedback/notifications/read', {});
	unreadCount.value = 0;
	items.value = items.value.map(n => ({ ...n, isRead: true }));
	emit('read', 0);
}

const readingNotificationIds = new Set<string>();

async function markRead(n: HataFeedNotif) {
	if (n.isRead || readingNotificationIds.has(n.id)) return;
	readingNotificationIds.add(n.id);
	try {
		await misskeyApi('hata/feedback/notifications/read', { notificationId: n.id });
		items.value = items.value.map(item => item.id === n.id ? { ...item, isRead: true } : item);
		unreadCount.value = Math.max(0, unreadCount.value - 1);
		emit('read', unreadCount.value);
	} finally {
		readingNotificationIds.delete(n.id);
	}
}

// 旗鯖fork(#38): 絵文字申請通知は処理状況を確認してから開く。
async function handleEmojiRequestNotif(requestId: string) {
	try {
		const list = await misskeyApi('hata/feedback/emoji-requests', { id: requestId, limit: 1 }) as unknown as HataFeedEmojiRequest[];
		const r = list[0];
		if (!r) { os.alert({ type: 'info', title: copy.requestNotFoundTitle, text: copy.requestNotFoundText }); return; }
		if (r.status === 'pending') {
			os.alert({ type: 'info', title: copy.requestPendingTitle, text: copyx.requestPendingText({ name: r.name }) });
			return;
		}
		os.alert({ type: 'info', title: copy.requestProcessedTitle, text: copyx.requestProcessedText({ name: r.name }) });
	} catch {
		os.alert({ type: 'error', title: copy.errorTitle, text: copy.requestStatusFailed });
	}
}

async function onClick(n: HataFeedNotif) {
	try {
		await markRead(n);
	} catch {
		// 既読更新に失敗しても、通知先を読む動線は妨げない。
	}
	const feedbackId = n.feedbackId;
	if (typeof feedbackId === 'string') {
		router.push('/hatafeed/:issueId', { params: { issueId: feedbackId } });
		modal.value?.close();
	} else if (n.emojiRequestId) {
		handleEmojiRequestNotif(n.emojiRequestId);
	}
}

onMounted(reload);
</script>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	box-sizing: border-box;
}
/* スマホ: 画面下からのドロワー(全画面寄り)。横幅いっぱい・上端だけ角丸。 */
.drawer {
	width: 100%;
	border-radius: 24px 24px 0 0;
}

.header { display: flex; align-items: center; gap: 8px; padding: 12px 14px 8px; }
.title { display: inline-flex; align-items: center; gap: 6px; font-weight: 800; font-size: .95em; }
.title i { color: var(--MI_THEME-accent); }
.readBtn {
	margin-left: auto;
	display: inline-flex; align-items: center; gap: 5px;
	background: none; border: 1px solid var(--MI_THEME-divider); color: inherit;
	border-radius: 999px; padding: 4px 11px; font-size: .78em; font-weight: 700; cursor: pointer;
}
.readBtn:hover { border-color: var(--MI_THEME-accent); color: var(--MI_THEME-accent); }
.closeBtn {
	display: inline-flex; align-items: center; justify-content: center;
	width: 28px; height: 28px; border-radius: 999px;
	background: none; border: none; color: inherit; opacity: .6; cursor: pointer;
}
.closeBtn:hover { opacity: 1; background: var(--MI_THEME-bg); }
/* header に readBtn が無い時も close は右端に */
.header .closeBtn:first-of-type:not(:first-child) { }

.bar { padding: 0 14px 8px; }
.filterBtn {
	display: inline-flex; align-items: center; gap: 5px;
	background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); color: inherit;
	border-radius: 999px; padding: 5px 12px; font-size: .8em; font-weight: 600; cursor: pointer;
}
.filterBtn:hover { border-color: var(--MI_THEME-accent); }
.filterBtnOn { background: var(--MI_THEME-accent); color: #fff; border-color: var(--MI_THEME-accent); }
.filterCaret { font-size: .85em; opacity: .7; }

.state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 36px 0; opacity: .6; text-align: center; }
.stateIcon { font-size: 2rem; opacity: .5; }

.list { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; padding: 0 10px 6px; }
.row {
	display: flex; gap: 10px; align-items: flex-start;
	width: 100%; text-align: left; color: inherit; background: none; border: none;
	padding: 10px; border-radius: 10px; cursor: pointer;
	transition: background .12s;
}
.row:hover { background: var(--MI_THEME-bg); }
.rowUnread { background: color-mix(in srgb, var(--MI_THEME-accent) 8%, transparent); }
.rowIcon { font-size: 1.05rem; color: var(--MI_THEME-accent); margin-top: 2px; flex-shrink: 0; }
.rowBody { flex: 1; min-width: 0; }
.rowMsg { font-size: .86em; line-height: 1.5; }
.rowMeta { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.rowActor { font-size: .74em; opacity: .7; }
.rowTime { font-size: .72em; opacity: .5; margin-left: auto; }

/* 旗鯖fork(通知グルーピング): まとめ行。重ねアバター + 「N件」 + 展開キャレット。 */
.groupRow .rowMsg { font-weight: 700; }
.avatars { display: inline-flex; align-items: center; }
.expandCaret { font-size: .8em; opacity: .5; margin-left: 4px; }
/* 展開された個別行のコンテナ。左に軽いインデントと縦線で親子関係を示す。 */
.children {
	display: flex; flex-direction: column; gap: 4px;
	margin: 2px 0 4px 14px; padding-left: 8px;
	border-left: 2px solid var(--MI_THEME-divider);
}
.childRow { padding: 8px 10px; }
.childRow .rowMsg { font-size: .82em; opacity: .92; }

.pager { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0 12px; }
.pagerBtn {
	width: 34px; height: 34px; border-radius: 999px;
	border: 1px solid var(--MI_THEME-divider); background: var(--MI_THEME-panel); color: inherit; cursor: pointer;
	display: inline-flex; align-items: center; justify-content: center;
}
.pagerBtn:hover:not(:disabled) { border-color: var(--MI_THEME-accent); color: var(--MI_THEME-accent); }
.pagerBtn:disabled { opacity: .35; cursor: default; }
.pagerPage { min-width: 2em; text-align: center; font-weight: 700; }
</style>
