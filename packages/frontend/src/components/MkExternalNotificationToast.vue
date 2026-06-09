<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<Transition name="external-toast">
	<div v-if="show" :class="$style.root" :data-type="notificationType" @click="onClick">
		<!-- 旗鯖fork: アバター画像 + リアクション絵文字オーバーレイ -->
		<div :class="$style.iconWrap">
			<img v-if="notification?.user?.avatarUrl" :src="notification.user.avatarUrl" :class="$style.avatar" :alt="notification?.user?.username ?? ''"/>
			<i v-else :class="[$style.icon, iconClass]"></i>
			<div v-if="notificationType === 'reaction' && notification?.reaction" :class="$style.reactionBadge">
				<MkReactionIcon :reaction="notification.reaction" :emojiUrl="reactionEmojiUrl"/>
			</div>
		</div>
		<div :class="$style.body">
			<div :class="$style.title">
				<Mfm :text="displayName" :plain="true" :nyaize="false" :emojiUrls="emojiUrls" :author="author"/><span :class="$style.action">{{ actionLabel }}</span>
			</div>
			<div v-if="text" :class="$style.text">{{ text }}</div>
			<div v-if="hint" :class="$style.hint">{{ hint }}</div>
		</div>
		<button :class="$style.close" @click.stop="onClose"><i class="ti ti-x"></i></button>
	</div>
</Transition>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { mainRouter } from '@/router.js';
import { prefer } from '@/preferences.js';
import { getExternalEmojiUrlMapForHost } from '@/utility/external-api.js';
import MkReactionIcon from '@/components/MkReactionIcon.vue';

const props = defineProps<{
	notification: any;
}>();

const emit = defineEmits<{
	(e: 'close'): void;
}>();

const show = ref(false);
let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

const notificationType = computed(() => props.notification?.type ?? 'unknown');

const iconClass = computed(() => {
	const t = notificationType.value;
	const map: Record<string, string> = {
		'reaction': 'ti ti-mood-smile',
		'reply': 'ti ti-arrow-back-up',
		'mention': 'ti ti-at',
		'renote': 'ti ti-repeat',
		'quote': 'ti ti-quote',
		'follow': 'ti ti-user-plus',
		'receiveFollowRequest': 'ti ti-user-question',
		'followRequestAccepted': 'ti ti-user-check',
		'achievementEarned': 'ti ti-trophy',
		'app': 'ti ti-apps',
		'pollEnded': 'ti ti-chart-bar',
		'note': 'ti ti-pencil',
	};
	return map[t] ?? 'ti ti-bell';
});

// 旗鯖fork: 表示名 (name優先) — MFM対応のため生テキスト
const displayName = computed(() => {
	const n = props.notification;
	return n?.user?.name || n?.user?.username || '誰か';
});

// 旗鯖fork: アクション文言 (表示名の後ろに付く)
const actionLabel = computed(() => {
	const labels: Record<string, string> = {
		'reaction': ' がリアクションしました',
		'reply': ' が返信しました',
		'mention': ' があなたをメンションしました',
		'renote': ' がリノートしました',
		'quote': ' が引用しました',
		'follow': ' にフォローされました',
		'receiveFollowRequest': ' からフォロー申請が届きました',
		'followRequestAccepted': ' がフォロー申請を承認しました',
		'achievementEarned': '実績を獲得しました',
		'app': 'アプリ通知',
		'pollEnded': 'アンケートが終了しました',
		'note': ' が新しいノートを投稿しました',
	};
	return labels[notificationType.value] ?? '外部から通知が届きました';
});

// 旗鯖fork: ユーザー名のMFMカスタム絵文字URLマップ
const emojiUrls = computed(() => {
	const map: Record<string, string> = {};
	if (props.notification?.user?.emojis) Object.assign(map, props.notification.user.emojis);
	return map;
});

// 旗鯖fork: <Mfm> に渡す author。host が null だと MkMfm が emojiUrls を
// 参照せず外部サーバーの絵文字を解決できないため、host(外部サーバー)を補う。
const author = computed(() => {
	const n = props.notification;
	const host = n?.user?.host ?? prefer.s['external.host'] ?? null;
	return { host, emojis: n?.user?.emojis };
});

// 旗鯖fork: リアクション絵文字URL (カスタム絵文字の場合)
const reactionEmojiUrl = computed(() => {
	const n = props.notification;
	if (!n?.reaction) return undefined;
	const m = n.reaction.match(/^:([^:]+):$/);
	if (!m) return undefined;
	const emojiName = m[1];
	const pureName = emojiName.includes('@') ? emojiName.split('@')[0] : emojiName;
	const host = prefer.s['external.host'];
	if (n.note?.reactionEmojis) {
		const e = n.note.reactionEmojis;
		const found = e[emojiName] || e[pureName] || e[`${pureName}@${host}`] || e[`${pureName}@.`];
		if (found) return found;
	}
	if (n.note?.emojis) {
		if (Array.isArray(n.note.emojis)) {
			const f = n.note.emojis.find((e: any) => e.name === pureName || e.name === emojiName);
			if (f?.url) return f.url;
		} else {
			const f = n.note.emojis[pureName] || n.note.emojis[emojiName];
			if (f) return f;
		}
	}
	// 外部サーバーの絵文字キャッシュ (同期版、ホスト指定)
	if (host) {
		const cacheMap = getExternalEmojiUrlMapForHost(host);
		if (cacheMap) {
			const cached = cacheMap[pureName] || cacheMap[emojiName];
			if (cached) return cached;
		}
		return `https://${host}/emoji/${pureName}.webp`;
	}
	return undefined;
});

const text = computed(() => {
	const n = props.notification;
	if (n?.note?.text) {
		const t = n.note.text;
		return t.length > 60 ? t.slice(0, 60) + '…' : t;
	}
	if (n?.reaction) return n.reaction;
	return '';
});

// 旗鯖fork: フォロー許可リクエスト・セキュリティ系通知は連携先での対応が必要
const hint = computed(() => {
	const t = notificationType.value;
	if (t === 'receiveFollowRequest' || t === 'followRequestAccepted') {
		return '※ フォロー申請の対応は連携先サーバーで行ってください';
	}
	if (t === 'app') {
		// セキュリティ系のアプリ通知も含めて、連携先確認案内
		return '※ 詳細は連携先サーバーで確認してください';
	}
	return '';
});

function onClick() {
	// クリックで外部通知ページに遷移
	onClose();
	mainRouter.push('/my/external-notifications');
}

function onClose() {
	show.value = false;
	if (autoCloseTimer) {
		clearTimeout(autoCloseTimer);
		autoCloseTimer = null;
	}
	// 退場アニメーション後に親通知
	setTimeout(() => emit('close'), 300);
}

onMounted(() => {
	// 次のフレームで表示開始 (transition を効かせる)
	requestAnimationFrame(() => {
		show.value = true;
	});
	// 6秒後に自動で閉じる
	autoCloseTimer = setTimeout(() => onClose(), 6000);
});

onUnmounted(() => {
	if (autoCloseTimer) clearTimeout(autoCloseTimer);
});
</script>

<style lang="scss" module>
.root {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 12px 14px;
	min-width: 260px;
	max-width: 340px;
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	border-left: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 70%, #4a9eff); /* 外部=青寄り */
	border-radius: 10px;
	box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
	cursor: pointer;
	transition: transform .15s, box-shadow .15s;
}
.root:hover {
	transform: translateY(-1px);
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}
.icon {
	flex-shrink: 0;
	width: 32px;
	height: 32px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: color-mix(in srgb, var(--MI_THEME-accent) 12%, transparent);
	color: var(--MI_THEME-accent);
	font-size: 1.1em;
}
/* 旗鯖fork: アバター + リアクション絵文字オーバーレイ */
.iconWrap {
	flex-shrink: 0;
	position: relative;
	width: 32px;
	height: 32px;
}
.avatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	object-fit: cover;
}
.reactionBadge {
	position: absolute;
	right: -3px;
	bottom: -3px;
	width: 18px;
	height: 18px;
	border-radius: 50%;
	background: var(--MI_THEME-panel);
	border: 1.5px solid var(--MI_THEME-panel);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 11px;
	box-shadow: 0 1px 3px rgba(0,0,0,.15);
	overflow: hidden;
}
.reactionBadge :deep(img),
.reactionBadge :deep(.mk-emoji),
.reactionBadge :deep(span) {
	width: 13px !important;
	height: 13px !important;
	max-width: 13px !important;
	max-height: 13px !important;
	object-fit: contain;
	font-size: 11px !important;
	line-height: 1 !important;
	margin: 0 !important;
}
.action {
	font-weight: 400;
	opacity: 0.85;
}
.body {
	flex: 1;
	min-width: 0;
}
.title {
	font-weight: 700;
	font-size: 0.9em;
	color: var(--MI_THEME-fg);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.text {
	margin-top: 2px;
	font-size: 0.82em;
	color: var(--MI_THEME-fg);
	opacity: 0.85;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.hint {
	margin-top: 4px;
	font-size: 0.75em;
	color: var(--MI_THEME-warn, #e67e22);
	opacity: 0.95;
	white-space: normal;
	line-height: 1.3;
}
.close {
	flex-shrink: 0;
	background: transparent;
	border: none;
	color: var(--MI_THEME-fg);
	opacity: 0.5;
	cursor: pointer;
	padding: 0;
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
}
.close:hover {
	opacity: 1;
}

/* Transition: 右からスライドイン */
:global(.external-toast-enter-from) { transform: translateX(100%); opacity: 0; }
:global(.external-toast-enter-to) { transform: translateX(0); opacity: 1; }
:global(.external-toast-enter-active) { transition: transform .25s, opacity .25s; }
:global(.external-toast-leave-from) { transform: translateX(0); opacity: 1; }
:global(.external-toast-leave-to) { transform: translateX(100%); opacity: 0; }
:global(.external-toast-leave-active) { transition: transform .25s, opacity .25s; }
</style>
