<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<component :is="prefer.s.enablePullToRefresh ? MkPullToRefresh : 'div'" :refresher="reload">
	<MkLoading v-if="fetching"/>

	<MkError v-else-if="error" @retry="init()"/>

	<div v-else-if="notes.length === 0" key="_empty_">
		<slot name="empty"><MkResult type="empty" :text="i18n.ts.noNotes"/></slot>
	</div>

	<div v-else ref="rootEl">
		<transition
			:enterActiveClass="prefer.s.animation ? $style.transition_new_enterActive : ''"
			:leaveActiveClass="prefer.s.animation ? $style.transition_new_leaveActive : ''"
		>
			<div
				v-if="queuedCount > 0 && ['default', 'count'].includes(prefer.s.newNoteReceivedNotificationBehavior)"
				:class="[$style.new2, { [$style.reduceAnimation]: !prefer.s.animation }]"
			>
				<button class="_buttonPrimary" :class="$style.newButton2" @click="releaseQueue()">
					<i class="ti ti-arrow-up"></i>
					<I18n v-if="prefer.s.newNoteReceivedNotificationBehavior === 'count'" :src="i18n.ts.newNoteRecivedCount" textTag="span">
						<template #n>{{ queuedCount }}</template>
					</I18n>
					<span v-else-if="prefer.s.newNoteReceivedNotificationBehavior === 'default'">{{ i18n.ts.newNoteRecived }}</span>
				</button>
			</div>
		</transition>

		<component
			:is="prefer.s.animation ? TransitionGroup : 'div'"
			:class="[$style.notes, { [$style.noGap]: noGap, '_gaps': !noGap }]"
			:enterActiveClass="$style.transition_x_enterActive"
			:leaveActiveClass="$style.transition_x_leaveActive"
			:enterFromClass="$style.transition_x_enterFrom"
			:leaveToClass="$style.transition_x_leaveTo"
			:moveClass="$style.transition_x_move"
			tag="div"
		>
			<MkExternalNote
				v-for="note in displayedNotes"
				:ref="el => setNoteRef(note.id, el)"
				:key="note.id"
				:class="$style.note"
				:note="note"
				:host="host"
				:token="token"
				:data-scroll-anchor="note.id"
				@reactionChanged="onNoteReactionChanged"
				@noteDeleted="onNoteDeleted"
			/>
		</component>

		<button v-show="canFetchOlder" key="_more_" v-appear="prefer.s.enableInfiniteScroll ? fetchOlder : null" :disabled="fetchingOlder" class="_button" :class="$style.more" @click="fetchOlder">
			<div v-if="!fetchingOlder">{{ i18n.ts.loadMore }}</div>
			<MkLoading v-else :inline="true"/>
		</button>
	</div>

</component>
	<!-- 外部TL用ボトムバー & 通知パネル: contain:strict回避のため document.body に直接マウント (スクリプト側で管理) -->
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted, onActivated, onDeactivated, TransitionGroup, shallowRef } from 'vue';
import MkPullToRefresh from '@/components/MkPullToRefresh.vue';
import MkExternalNote from '@/components/MkExternalNote.vue';
import { prefer } from '@/preferences.js';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import * as sound from '@/utility/sound.js';
import * as os from '@/os.js';
import { preloadExternalEmojiMap, callExternalApi, getExternalAccount } from '@/utility/external-api.js';
import { cleanupStaleUiElements } from '@/utility/ui-cleanup.js';

const props = withDefaults(defineProps<{
	src: 'ohtl' | 'oltl';
	host: string;
	token: string;
	sound?: boolean;
	simpleUi?: boolean;
}>(), {
	sound: false,
	simpleUi: false,
});

const noGap = !prefer.s.showGapBetweenNotesInTimeline;

const notes = shallowRef<any[]>([]);
const queuedNotes = shallowRef<any[]>([]);
const fetching = ref(true);
const fetchingOlder = ref(false);
const isActive = ref(true); // KeepAlive対応: コンポーネントがアクティブかどうか
const error = ref(false);
const canFetchOlder = ref(true);

// スクロール位置が最上部かどうか（リアルタイムTL更新用）
const isAtTop = ref(true);
const SCROLL_TOP_THRESHOLD = 50; // px以内なら「最上部」とみなす

const queuedCount = computed(() => queuedNotes.value.length);
const displayedNotes = computed(() => notes.value);

// ===== ノートコンポーネントのref管理（リアクション更新用） =====
const noteRefs = new Map<string, InstanceType<typeof MkExternalNote>>();

function setNoteRef(noteId: string, el: any) {
	if (el) {
		noteRefs.set(noteId, el);
	} else {
		noteRefs.delete(noteId);
	}
}

let streamConnection: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let pollingTimer: ReturnType<typeof setInterval> | null = null;

// ===== ノートキャプチャ（リアクション等のリアルタイム更新）=====
const capturedNoteIds = new Set<string>();

function captureNote(noteId: string) {
	if (capturedNoteIds.has(noteId)) return;
	if (!streamConnection || streamConnection.readyState !== WebSocket.OPEN) return;

	capturedNoteIds.add(noteId);
	streamConnection.send(JSON.stringify({
		type: 'subNote',
		body: { id: noteId },
	}));
}

function uncaptureNote(noteId: string) {
	capturedNoteIds.delete(noteId);
	if (!streamConnection || streamConnection.readyState !== WebSocket.OPEN) return;

	streamConnection.send(JSON.stringify({
		type: 'unsubNote',
		body: { id: noteId },
	}));
}

function captureDisplayedNotes() {
	for (const note of notes.value) {
		captureNote(note.id);
		// リノートの場合は元ノートもキャプチャ
		if (note.renote && !note.text) {
			captureNote(note.renote.id);
		}
	}
}

// ===== ノートイベント処理 =====
// 自分が行ったリアクション操作を追跡（ストリームからの重複カウントを防ぐ）
const pendingReactionKeys = new Set<string>();

// リアクション文字列の正規化（:name@.: → :name: 等、形式の違いを吸収）
function normalizeReaction(reaction: string): string {
	return reaction.replace(/@\./g, '');
}

function addPendingReaction(noteId: string, reaction: string, delta: number) {
	const key = `${noteId}:${normalizeReaction(reaction)}:${delta > 0 ? '+' : '-'}`;
	pendingReactionKeys.add(key);
	// 10秒後に自動クリア（ストリームが来なかった場合の安全弁）
	setTimeout(() => pendingReactionKeys.delete(key), 10000);
}

function consumePendingReaction(noteId: string, reaction: string, delta: number): boolean {
	const key = `${noteId}:${normalizeReaction(reaction)}:${delta > 0 ? '+' : '-'}`;
	if (pendingReactionKeys.has(key)) {
		pendingReactionKeys.delete(key);
		return true; // 自分の操作 → スキップ
	}
	return false;
}

// 自分の外部アカウントのuserIdを取得
function getMyExternalUserId(): string | null {
	const ext = getExternalAccount();
	return ext?.userId ?? null;
}

/** MkExternalNoteからのリアクション変更通知 → ペンディングキーを登録 */
function onNoteReactionChanged(noteId: string, reaction: string | null, oldReaction: string | null) {
	if (reaction) addPendingReaction(noteId, reaction, 1);
	if (oldReaction) addPendingReaction(noteId, oldReaction, -1);
}

function onNoteDeleted(noteId: string) {
	notes.value = notes.value.filter(n => n.id !== noteId);
	uncaptureNote(noteId);
	noteRefs.delete(noteId);
}

function handleNoteEvent(noteId: string, type: string, body: any) {
	switch (type) {
		case 'reacted': {
			const { reaction, emoji, userId } = body;
			const myUserId = getMyExternalUserId();
			// 自分が行ったリアクションのストリームイベントはスキップ（既にローカル更新済み）
			// pendingReactionキー照合 または userId照合（フォールバック）
			const isPending = consumePendingReaction(noteId, reaction, 1);
			const isMyReaction = myUserId != null && userId === myUserId;
			if (isPending || isMyReaction) {
				// ただしemoji URLの登録だけは行う
				const note = notes.value.find(n => n.id === noteId || (n.renote && !n.text && n.renote.id === noteId));
				if (note && emoji?.url) {
					const targetNote = (note.renote && !note.text && note.renote.id === noteId) ? note.renote : note;
					if (!targetNote.reactionEmojis) targetNote.reactionEmojis = {};
					targetNote.reactionEmojis[reaction.replace(/^:|:$/g, '')] = emoji.url;
				}
				break;
			}
			// 他人のリアクション → 通常通りカウント更新
			const note = notes.value.find(n => n.id === noteId || (n.renote && !n.text && n.renote.id === noteId));
			if (note) {
				const targetNote = (note.renote && !note.text && note.renote.id === noteId) ? note.renote : note;
				if (!targetNote.reactions) targetNote.reactions = {};
				targetNote.reactions[reaction] = (targetNote.reactions[reaction] || 0) + 1;

				// reactionEmojisにURLを追加（カスタム絵文字の場合）
				if (emoji && emoji.url) {
					if (!targetNote.reactionEmojis) targetNote.reactionEmojis = {};
					const emojiName = reaction.replace(/^:|:$/g, '');
					targetNote.reactionEmojis[emojiName] = emoji.url;
				}

				// コンポーネント側にも反映
				const noteRef = noteRefs.get(note.id);
				if (noteRef && typeof noteRef.updateReaction === 'function') {
					noteRef.updateReaction(reaction, 1);
				}

				// shallowRefなので参照更新をトリガー
				notes.value = [...notes.value];
			}
			break;
		}
		case 'unreacted': {
			const { reaction, userId } = body;
			const myUserId = getMyExternalUserId();
			// 自分が行ったリアクション解除のストリームイベントはスキップ
			const isPending = consumePendingReaction(noteId, reaction, -1);
			const isMyReaction = myUserId != null && userId === myUserId;
			if (isPending || isMyReaction) break;
			const note = notes.value.find(n => n.id === noteId || (n.renote && !n.text && n.renote.id === noteId));
			if (note) {
				const targetNote = (note.renote && !note.text && note.renote.id === noteId) ? note.renote : note;
				if (targetNote.reactions && targetNote.reactions[reaction]) {
					targetNote.reactions[reaction]--;
					if (targetNote.reactions[reaction] <= 0) {
						delete targetNote.reactions[reaction];
					}
				}

				const noteRef = noteRefs.get(note.id);
				if (noteRef && typeof noteRef.updateReaction === 'function') {
					noteRef.updateReaction(reaction, -1);
				}

				notes.value = [...notes.value];
			}
			break;
		}
		case 'deleted': {
			// ノート削除
			notes.value = notes.value.filter(n => n.id !== noteId);
			uncaptureNote(noteId);
			break;
		}
		case 'pollVoted': {
			// 投票更新（必要に応じて）
			break;
		}
	}
}

async function init() {
	// host/token が未設定なら何もしない
	if (!props.host || !props.token) {
		fetching.value = false;
		error.value = true;
		console.error('[ExternalTL] host or token is not set');
		return;
	}

	fetching.value = true;
	error.value = false;

	try {
		const endpoint = props.src === 'ohtl' ? 'notes/timeline' : 'notes/local-timeline';
		const res = await fetchFromExternal(endpoint, { limit: 20 });
		notes.value = res;
		canFetchOlder.value = res.length >= 20;

		// 表示中のノートをキャプチャ
		captureDisplayedNotes();
	} catch (err) {
		console.error('External timeline fetch error:', err);
		error.value = true;
	} finally {
		fetching.value = false;
	}
}

async function fetchOlder() {
	if (fetchingOlder.value || notes.value.length === 0) return;

	fetchingOlder.value = true;

	try {
		const lastNote = notes.value[notes.value.length - 1];
		const endpoint = props.src === 'ohtl' ? 'notes/timeline' : 'notes/local-timeline';
		const res = await fetchFromExternal(endpoint, {
			limit: 20,
			untilId: lastNote.id,
		});

		notes.value = [...notes.value, ...res];
		canFetchOlder.value = res.length >= 20;

		// 新しく読み込んだノートもキャプチャ
		for (const note of res) {
			captureNote(note.id);
		}
	} catch (err) {
		console.error('External timeline fetch older error:', err);
	} finally {
		fetchingOlder.value = false;
	}
}

// ===== 新着ポーリング（WebSocketの補助） =====
async function pollNewNotes() {
	if (!props.host || !props.token || notes.value.length === 0) return;

	try {
		const firstNote = notes.value[0];
		const endpoint = props.src === 'ohtl' ? 'notes/timeline' : 'notes/local-timeline';
		const res = await fetchFromExternal(endpoint, {
			limit: 20,
			sinceId: firstNote.id,
		});

		if (res.length === 0) return;

		// 重複除外
		const existingIds = new Set(notes.value.map(n => n.id));
		const queuedIds = new Set(queuedNotes.value.map(n => n.id));
		const newNotes = res.filter((n: any) => !existingIds.has(n.id) && !queuedIds.has(n.id));

		if (newNotes.length === 0) return;

		// 新しい順にソート
		newNotes.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

		queuedNotes.value = [...newNotes, ...queuedNotes.value];

		if (props.sound && newNotes.length > 0) {
			sound.playMisskeySfx('note');
		}
	} catch (err) {
		console.error('[ExternalTL] Poll new notes error:', err);
	}
}

function startPolling(interval: number) {
	stopPolling();
	pollingTimer = setInterval(() => {
		pollNewNotes();
	}, interval);
}

function stopPolling() {
	if (pollingTimer) {
		clearInterval(pollingTimer);
		pollingTimer = null;
	}
}

async function reload() {
	queuedNotes.value = [];
	// 全キャプチャ解除
	for (const id of capturedNoteIds) {
		uncaptureNote(id);
	}
	capturedNoteIds.clear();
	noteRefs.clear();
	await init();
}

function releaseQueue() {
	const released = queuedNotes.value;
	notes.value = [...released, ...notes.value];
	queuedNotes.value = [];

	// 新しいノートもキャプチャ
	for (const note of released) {
		captureNote(note.id);
	}
}

async function fetchFromExternal(endpoint: string, params: Record<string, any> = {}): Promise<any[]> {
	const res = await fetch(`https://${props.host}/api/${endpoint}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			i: props.token,
			...params,
		}),
	});

	if (!res.ok) {
		throw new Error(`External API error: ${res.status}`);
	}

	return res.json();
}

function connectStream() {
	if (!props.host || !props.token) return;

	const channel = props.src === 'ohtl' ? 'homeTimeline' : 'localTimeline';

	try {
		streamConnection = new WebSocket(`wss://${props.host}/streaming?i=${props.token}`);

		streamConnection.onopen = () => {
			console.log('[ExternalTL] Stream connected');
			reconnectAttempts = 0;

			streamConnection?.send(JSON.stringify({
				type: 'connect',
				body: {
					channel: channel,
					id: 'external-tl',
				},
			}));

			// ストリーム接続後に表示中ノートを再キャプチャ
			captureDisplayedNotes();

			// ストリーム接続時はポーリング間隔を長くする（60秒）
			startPolling(60000);
		};

		streamConnection.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);

				if (data.type === 'channel' && data.body.id === 'external-tl') {
					if (data.body.type === 'note') {
						const note = data.body.body;

						// 重複チェック
						if (notes.value.some(n => n.id === note.id) || queuedNotes.value.some(n => n.id === note.id)) {
							return;
						}

						// スクロール最上部にいる場合はリアルタイムでTLに追加
						if (isAtTop.value) {
							notes.value = [note, ...notes.value];
							captureNote(note.id);
							if (note.renote && !note.text) {
								captureNote(note.renote.id);
							}
						} else {
							queuedNotes.value = [note, ...queuedNotes.value];
						}

						if (props.sound) {
							sound.playMisskeySfx('note');
						}
					}
				}

				// ノートイベント（リアクション等）
				if (data.type === 'noteUpdated') {
					const { id, type, body } = data.body;
					handleNoteEvent(id, type, body);
				}
			} catch (err) {
				console.error('[ExternalTL] Stream message parse error:', err);
			}
		};

		streamConnection.onerror = (err) => {
			console.error('[ExternalTL] Stream error:', err);
		};

		streamConnection.onclose = () => {
			console.log('[ExternalTL] Stream disconnected');

			// 切断時はポーリング頻度を上げる（15秒）
			startPolling(15000);

			// 指数バックオフで再接続（最大60秒）
			const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 60000);
			reconnectAttempts++;

			if (reconnectTimer) clearTimeout(reconnectTimer);
			reconnectTimer = setTimeout(() => {
				connectStream();
			}, delay);
		};
	} catch (err) {
		console.error('[ExternalTL] Stream connection error:', err);
		startPolling(15000);
	}
}

function disconnectStream() {
	if (reconnectTimer) {
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}
	if (streamConnection) {
		streamConnection.close();
		streamConnection = null;
	}
}

/**
 * 旧Teleport/Hataskの残骸をクリーンアップ（後方互換）
 */
function cleanupTeleportedElements() {
	document.querySelectorAll<HTMLElement>('[data-ext-tl]').forEach(el => el.remove());
	document.querySelectorAll<HTMLElement>('.ext-reaction-tip').forEach(el => el.remove());
	document.querySelectorAll<HTMLElement>('.ext-tl-side-menu-btn').forEach(el => el.remove());
}

onMounted(async () => {
	// 既存ユーザー対策: 外部TL表示中なのに同意フラグが立っていない場合は自動で記録
	if (!prefer.s['hataConsent.externalTl']) {
		prefer.commit('hataConsent.externalTl', true);
		prefer.commit('hataConsent.externalTlDate', new Date().toISOString());
		misskeyApi('hata/consent/update', { type: 'externalTl', agree: true }).catch(console.error);
	}
	// 前回の外部TL/Hataskの残骸をクリーンアップ（UI切り替え対策）
	try {
		delete document.body.dataset.hataskActive;
		document.querySelectorAll<HTMLElement>('.htk-nav-mobile').forEach(el => el.remove());
		document.querySelectorAll<HTMLElement>('.htk-nav-pad').forEach(el => el.remove());
		document.querySelectorAll<HTMLElement>('[data-htask-hidden]').forEach(el => {
			el.style.removeProperty('display');
			delete el.dataset.htaskHidden;
		});
		// 古い外部TLのフローティング要素も掃除
		document.querySelectorAll<HTMLElement>('.ext-tl-side-menu-btn').forEach(el => el.remove());
		document.querySelectorAll<HTMLElement>('.ext-reaction-tip').forEach(el => el.remove());
	} catch {}
	// 絵文字キャッシュを先行ロード（ノート取得前にキャッシュを確実に温める）
	await preloadExternalEmojiMap();
	init();
	connectStream();
	// 初期ポーリング開始（30秒間隔、ストリーム接続後に調整される）
	startPolling(30000);
	// 外部通知ポーリング開始（既読直後はスキップ）
	fetchExtNotifCountGuarded();
	extNotifPollTimer = setInterval(fetchExtNotifCountGuarded, 60000);
	// Simple UI からのイベントリスナー（KeepAlive時はonActivated/onDeactivatedで管理）
	if (props.simpleUi) {
		window.addEventListener('ext-tl-open-notif', onExtTlOpenNotif);
		window.addEventListener('ext-tl-post', onExtTlPost);
	}
});

onUnmounted(() => {
	disconnectStream();
	stopPolling();
	capturedNoteIds.clear();
	noteRefs.clear();
	if (extNotifPollTimer) { clearInterval(extNotifPollTimer); extNotifPollTimer = null; }
	isActive.value = false;
	// 通知パネル除去
	removeNotifPanel();
	// Teleportされた要素を手動で確実に削除（Vue破棄後も残る場合がある）
	cleanupTeleportedElements();
	// Simple UI イベントリスナー解除
	if (props.simpleUi) {
		window.removeEventListener('ext-tl-open-notif', onExtTlOpenNotif);
		window.removeEventListener('ext-tl-post', onExtTlPost);
	}
});

// KeepAlive対応: タブ切り替え時のアクティブ/非アクティブ制御
onActivated(() => {
	isActive.value = true;
	// 直近既読時はガード関数経由で fetch スキップ → バッジ復活防止
	fetchExtNotifCountGuarded();
	// KeepAlive再活性化時にイベントリスナーを再登録（二重防止のため先にremove）
	if (props.simpleUi) {
		window.removeEventListener('ext-tl-open-notif', onExtTlOpenNotif);
		window.removeEventListener('ext-tl-post', onExtTlPost);
		window.addEventListener('ext-tl-open-notif', onExtTlOpenNotif);
		window.addEventListener('ext-tl-post', onExtTlPost);
	}
});

onDeactivated(() => {
	isActive.value = false;
	showExtNotifPanel.value = false;
	// 通知パネル除去
	removeNotifPanel();
	// Teleportされた要素を手動で確実に削除
	cleanupTeleportedElements();
	// KeepAlive非活性化時にイベントリスナーを解除（二重投稿防止）
	if (props.simpleUi) {
		window.removeEventListener('ext-tl-open-notif', onExtTlOpenNotif);
		window.removeEventListener('ext-tl-post', onExtTlPost);
	}
});

// ========== External Notifications ==========
const showExtNotifPanel = ref(false);
const extNotifications = ref<any[]>([]);
const extNotifLoading = ref(false);
const extNotifUnread = ref(0);
let extNotifPollTimer: ReturnType<typeof setInterval> | null = null;

async function fetchExtNotifCount() {
	try {
		const notifs = await callExternalApi('i/notifications', { limit: 20, markAsRead: false });
		if (!Array.isArray(notifs)) { extNotifUnread.value = 0; return; }
		// 旗鯖fork: 外部鯖の markAsRead 反映に遅延があるため、isRead フラグは信頼しない。
		// localStorage の extNotifLastReadAt を唯一の判定基準とし、それより新しい通知のみカウント。
		// これにより「閲覧直後にバッジが消えるが、5秒経過後の再マウントで復活する」問題を回避。
		// (新しい通知が実際に来た場合は、その createdAt が lastReadTime より新しいので正しくカウントされる)
		const lastReadTs = localStorage.getItem('extNotifLastReadAt');
		const lastReadTime = lastReadTs ? new Date(lastReadTs).getTime() : 0;
		extNotifUnread.value = notifs.filter((n: any) => {
			if (lastReadTime && new Date(n.createdAt).getTime() <= lastReadTime) return false;
			return true;
		}).length;
	} catch { extNotifUnread.value = 0; }
	// Emit count to simple UI
	if (props.simpleUi) window.dispatchEvent(new CustomEvent('ext-tl-notif-count', { detail: extNotifUnread.value }));
}

// 直近で既読化した直後 (5秒以内) は fetch をスキップ
// → タブ切り替え/定期ポーリングでバッジが瞬間的に復活する問題を防ぐ
function fetchExtNotifCountGuarded() {
	const lastReadTs = localStorage.getItem('extNotifLastReadAt');
	const lastReadTime = lastReadTs ? new Date(lastReadTs).getTime() : 0;
	const RECENT_READ_GUARD_MS = 5000;
	if (Date.now() - lastReadTime > RECENT_READ_GUARD_MS) {
		fetchExtNotifCount();
	}
}

async function toggleExternalNotifications() {
	if (notifPanelEl) { removeNotifPanel(); return; }
	showExtNotifPanel.value = true;
	createNotifPanel();
	// Mark as read
	try {
		await callExternalApi('notifications/mark-all-as-read', {});
		localStorage.setItem('extNotifLastReadAt', new Date().toISOString());
		extNotifUnread.value = 0;
		if (props.simpleUi) window.dispatchEvent(new CustomEvent('ext-tl-notif-count', { detail: 0 }));
	} catch {}
}

async function fetchExternalNotifications() {
	extNotifLoading.value = true;
	try {
		const notifs = await callExternalApi('i/notifications', { limit: 30 });
		extNotifications.value = Array.isArray(notifs) ? notifs : [];
	} catch (e) {
		extNotifications.value = [];
		console.warn('Failed to fetch external notifications:', e);
	} finally { extNotifLoading.value = false; }
}

function formatExtNotifTime(ts: string): string {
	const d = new Date(ts);
	const now = new Date();
	const diff = now.getTime() - d.getTime();
	if (diff < 60000) return '今';
	if (diff < 3600000) return `${Math.floor(diff/60000)}分前`;
	if (diff < 86400000) return `${Math.floor(diff/3600000)}時間前`;
	return `${d.getMonth()+1}/${d.getDate()}`;
}

// ========== Mobile: Hide standard footer, show side menu button ==========
// ===== Programmatic Notification Panel =====
let notifPanelEl: HTMLElement | null = null;

/** contain:strict を持つ UI ルートコンテナを探す */
function findUiRoot(): HTMLElement {
	const app = document.querySelector('#cherrypick_app') || document.querySelector('#misskey_app');
	if (app?.firstElementChild) {
		const child = app.firstElementChild as HTMLElement;
		const cs = getComputedStyle(child);
		if (cs.contain && (cs.contain === 'strict' || cs.contain.includes('layout'))) {
			return child;
		}
	}
	return document.body;
}

function createNotifPanel() {
	if (notifPanelEl) { removeNotifPanel(); }

	const overlay = document.createElement('div');
	overlay.className = 'ext-notif-overlay';
	overlay.dataset.extTl = '1';

	const panel = document.createElement('div');
	panel.className = 'ext-notif-panel';

	const header = document.createElement('div');
	header.className = 'ext-notif-header';
	header.innerHTML = '<span>外部アカウント通知</span><button class="ext-notif-close"><i class="ti ti-x"></i></button>';

	panel.appendChild(header);

	const body = document.createElement('div');
	body.className = 'ext-notif-body';
	body.innerHTML = '<div class="ext-notif-loading">読み込み中...</div>';
	panel.appendChild(body);

	overlay.appendChild(panel);

	// Close on overlay click
	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) removeNotifPanel();
	});
	header.querySelector('.ext-notif-close')?.addEventListener('click', () => removeNotifPanel());

	// UIルートコンテナ内にマウント
	findUiRoot().appendChild(overlay);
	notifPanelEl = overlay;

	// Load notifications
	renderNotifPanel(body);
}

async function renderNotifPanel(body: HTMLElement) {
	try {
		await fetchExternalNotifications();
		body.textContent = '';
		if (extNotifications.value.length === 0) {
			const empty = document.createElement('div');
			empty.className = 'ext-notif-empty';
			empty.textContent = '通知はありません';
			body.appendChild(empty);
			return;
		}
		const list = document.createElement('div');
		list.className = 'ext-notif-list';
		for (const n of extNotifications.value) {
			const item = document.createElement('div');
			item.className = 'ext-notif-item' + (!n.isRead ? ' ext-notif-unread' : '');

			// アバター: src 属性として安全な URL のみ
			if (n.user?.avatarUrl && typeof n.user.avatarUrl === 'string'
				&& /^https?:\/\//i.test(n.user.avatarUrl) && n.user.avatarUrl.length <= 2048) {
				const img = document.createElement('img');
				img.className = 'ext-notif-avatar';
				img.src = n.user.avatarUrl;
				img.referrerPolicy = 'no-referrer';
				img.alt = '';
				item.appendChild(img);
			}

			const content = document.createElement('div');
			content.className = 'ext-notif-content';

			const userEl = document.createElement('div');
			userEl.className = 'ext-notif-user';
			// textContent でエスケープ
			userEl.textContent = n.user?.name || n.user?.username || '';
			content.appendChild(userEl);

			const typeEl = document.createElement('div');
			typeEl.className = 'ext-notif-type';
			let typeText = n.type;
			switch (n.type) {
				case 'follow': typeText = 'フォローされました'; break;
				case 'mention': typeText = 'メンションされました'; break;
				case 'reply': typeText = '返信されました'; break;
				case 'renote': typeText = 'リノートされました'; break;
				case 'quote': typeText = '引用されました'; break;
				case 'reaction': typeText = `リアクション: ${typeof n.reaction === 'string' ? n.reaction : ''}`; break;
				case 'followRequestAccepted': typeText = 'フォローリクエストが承認されました'; break;
				case 'receiveFollowRequest': typeText = 'フォローリクエストが届きました'; break;
			}
			typeEl.textContent = typeText;
			content.appendChild(typeEl);

			if (n.note && typeof n.note.text === 'string') {
				const noteEl = document.createElement('div');
				noteEl.className = 'ext-notif-note-text';
				noteEl.textContent = n.note.text.slice(0, 80);
				content.appendChild(noteEl);
			}

			const timeEl = document.createElement('div');
			timeEl.className = 'ext-notif-time';
			timeEl.textContent = formatExtNotifTime(n.createdAt);
			content.appendChild(timeEl);

			item.appendChild(content);
			list.appendChild(item);
		}
		body.appendChild(list);
	} catch {
		body.textContent = '';
		const fail = document.createElement('div');
		fail.className = 'ext-notif-empty';
		fail.textContent = '読み込みに失敗しました';
		body.appendChild(fail);
	}
}

function removeNotifPanel() {
	showExtNotifPanel.value = false;
	if (notifPanelEl) {
		notifPanelEl.remove();
		notifPanelEl = null;
	}
}

function openExternalPostForm() {
	if (!isActive.value) return; // KeepAlive非活性時は無視（二重投稿防止）
	os.post({
		initialUseExternalAccount: true,
	});
}

// Simple UI イベントハンドラ（isActiveガード付き）
function onExtTlOpenNotif() {
	if (!isActive.value) return;
	toggleExternalNotifications();
}

function onExtTlPost() {
	if (!isActive.value) return;
	openExternalPostForm();
}

defineExpose({
	reloadTimeline: reload,
});
</script>

<style lang="scss" module>
.transition_new_enterActive,
.transition_new_leaveActive {
	transform: translateY(-64px);
}

.transition_x_move {
	transition: transform 0.7s cubic-bezier(0.23, 1, 0.32, 1);
}

.transition_x_enterActive {
	transition: transform 0.7s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.7s cubic-bezier(0.23, 1, 0.32, 1);
}

.transition_x_leaveActive {
	transition: height 0.2s cubic-bezier(0,.5,.5,1), opacity 0.2s cubic-bezier(0,.5,.5,1);
}

.transition_x_enterFrom {
	opacity: 0;
	transform: translateY(max(-64px, -100%));
}

.transition_x_leaveTo {
	opacity: 0;
}

.notes {
	container-type: inline-size;

	&.noGap {
		background: var(--MI_THEME-panel);

		.note {
			border-bottom: solid 0.5px var(--MI_THEME-divider);
		}
	}

	&:not(.noGap) {
		background: var(--MI_THEME-bg);

		.note {
			background: var(--MI_THEME-panel);
			border-radius: var(--MI-radius);
		}
	}
}

.new2 {
	position: sticky;
	top: calc(var(--MI-stickyTop, 0px) + 8px);
	z-index: 1000;
	width: 100%;
	margin: calc(-0.675em - 8px) 0;
	transition: opacity 0.5s, transform 0.5s;

	&:first-child {
		margin-top: calc(-0.675em - 8px - var(--MI-margin));
	}

	&.reduceAnimation {
		transition: opacity 0s, transform 0s;
	}
}

.newButton2 {
	display: block;
	margin: var(--MI-margin) auto 0 auto;
	padding: 8px 16px;
	border-radius: 32px;

	> i {
		margin-right: 5px;
	}
}

.more {
	display: block;
	width: 100%;
	box-sizing: border-box;
	padding: 16px;
	background: var(--MI_THEME-panel);
}

</style>

<!-- 通知パネル: グローバルスタイル -->
<style lang="scss">
/* ===== Programmatic Notification Panel ===== */
.ext-notif-overlay {
	position: fixed;
	inset: 0;
	z-index: 1500;
	background: rgba(0,0,0,.4);
	backdrop-filter: blur(4px);
	-webkit-backdrop-filter: blur(4px);
	display: flex;
	align-items: flex-end;
	justify-content: center;
	padding: 0 0 env(safe-area-inset-bottom, 0px);
}
.ext-notif-panel {
	width: 100%;
	max-width: 480px;
	max-height: 70vh;
	background: color-mix(in srgb, var(--MI_THEME-panel) 85%, transparent);
	backdrop-filter: blur(24px) saturate(1.4);
	-webkit-backdrop-filter: blur(24px) saturate(1.4);
	border-radius: 20px 20px 0 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}
.ext-notif-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px 12px;
	font-weight: 700;
	font-size: .95rem;
	color: var(--MI_THEME-fg);
	border-bottom: 1px solid color-mix(in srgb, var(--MI_THEME-fg) 8%, transparent);
}
.ext-notif-close {
	background: none;
	border: none;
	color: var(--MI_THEME-fg);
	font-size: 1.2em;
	cursor: pointer;
	opacity: .5;
	&:hover { opacity: 1; }
}
.ext-notif-loading, .ext-notif-empty {
	padding: 32px 20px;
	text-align: center;
	color: color-mix(in srgb, var(--MI_THEME-fg) 50%, transparent);
	font-size: .85rem;
}
.ext-notif-list {
	overflow-y: auto;
	flex: 1;
}
.ext-notif-item {
	display: flex;
	gap: 10px;
	padding: 10px 16px;
	border-bottom: 1px solid color-mix(in srgb, var(--MI_THEME-fg) 5%, transparent);
}
.ext-notif-unread {
	background: color-mix(in srgb, var(--MI_THEME-accent) 6%, transparent);
}
.ext-notif-avatar {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	flex-shrink: 0;
	object-fit: cover;
}
.ext-notif-content {
	flex: 1;
	min-width: 0;
}
.ext-notif-user {
	font-weight: 600;
	font-size: .85rem;
	color: var(--MI_THEME-fg);
}
.ext-notif-type {
	font-size: .8rem;
	color: color-mix(in srgb, var(--MI_THEME-fg) 65%, transparent);
}
.ext-notif-note-text {
	font-size: .78rem;
	color: color-mix(in srgb, var(--MI_THEME-fg) 50%, transparent);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.ext-notif-time {
	font-size: .7rem;
	color: color-mix(in srgb, var(--MI_THEME-fg) 35%, transparent);
	margin-top: 2px;
}
</style>
