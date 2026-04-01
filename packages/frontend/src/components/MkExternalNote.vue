<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<article :class="$style.root">
	<!-- アバター（吹き出しの外） -->
	<MkA v-if="note.user" :class="$style.avatar" :to="`https://${host}/@${note.user.username}`" target="_blank">
		<img :class="$style.avatarImg" :src="note.user.avatarUrl" :alt="note.user.username"/>
	</MkA>
	<div :class="$style.main">
		<!-- 吹き出し矢印 -->
		<div :class="$style.bubbleArrow"></div>
		<!-- 吹き出し本体 -->
		<div :class="$style.bubbleBody">
			<div :class="$style.header">
				<div :class="$style.headerBody">
					<div :class="$style.headerTop">
						<span :class="$style.name">
							{{ note.user?.name || note.user?.username }}
						</span>
						<span :class="$style.username">
							@{{ note.user?.username }}@{{ host }}
						</span>
					</div>
					<div :class="$style.headerBottom">
						<MkA :to="`https://${host}/notes/${note.id}`" target="_blank" :class="$style.time">
							<MkTime :time="note.createdAt"/>
						</MkA>
						<span :class="$style.externalBadge" :title="'外部サーバー: ' + host">
							🔗
						</span>
						<span v-if="visibilityInfo" :class="$style.visibilityBadge" :title="visibilityInfo.label">
							<i :class="visibilityInfo.icon"></i>
						</span>
						<span v-if="localOnlyBadge" :class="$style.visibilityBadge" :title="localOnlyBadge.label">
							<i :class="localOnlyBadge.icon"></i>
						</span>
					</div>
				</div>
			</div>

		<div v-if="note.cw != null" :class="$style.cw">
			<span>{{ note.cw }}</span>
			<button :class="$style.cwButton" @click="showContent = !showContent">
				{{ showContent ? '隠す' : '続きを見る' }}
			</button>
		</div>

		<div v-show="note.cw == null || showContent" :class="$style.content">
			<div v-if="note.text" :class="$style.text">
				<Mfm
					:key="`mfm-${emojiMapReady}`"
					:text="note.text"
					:author="mfmAuthor"
					:nyaize="false"
					:emojiUrls="mergedEmojiUrls"
				/>
			</div>

			<!-- ファイル表示（画像・動画・音声対応） -->
			<div v-if="note.files && note.files.length > 0" :class="$style.files">
				<div v-for="file in note.files" :key="file.id" :class="$style.file">
					<!-- 画像: クリックで拡大表示 -->
					<img
						v-if="isImage(file)"
						:src="file.thumbnailUrl || file.url"
						:alt="file.name"
						:class="$style.fileImg"
						loading="lazy"
						@click="openImage(file)"
					/>
					<!-- 動画 -->
					<video
						v-else-if="isVideo(file)"
						:src="file.url"
						:class="$style.fileVideo"
						controls
						preload="metadata"
						:poster="file.thumbnailUrl"
					/>
					<!-- 音声 -->
					<div v-else-if="isAudio(file)" :class="$style.fileAudio">
						<i class="ti ti-music"></i>
						<span :class="$style.fileAudioName">{{ file.name }}</span>
						<audio :src="file.url" controls preload="metadata" :class="$style.audioPlayer"/>
					</div>
					<!-- その他 -->
					<a v-else :href="file.url" target="_blank" :class="$style.fileOther">
						<i class="ti ti-file"></i>
						{{ file.name }}
					</a>
				</div>
			</div>

			<div v-if="note.renote" :class="$style.renote">
				<div :class="$style.renoteHeader">
					<i class="ti ti-repeat"></i> リノート
				</div>
				<MkExternalNote :note="note.renote" :host="host" :token="token" :class="$style.renoteNote"/>
			</div>
		</div>

		<!-- リアクション表示 -->
		<div v-if="reactionsEntries.length > 0" :class="$style.reactions">
			<button
				v-for="[reaction, count] in reactionsEntries"
				:key="reaction"
				:class="[$style.reaction, { [$style.myReaction]: myReaction === reaction }]"
				@click="toggleReaction(reaction)"
				@mouseenter="onReactionMouseEnter($event, reaction, count)"
				@mouseleave="onReactionMouseLeave()"
				@touchstart.passive="onReactionTouchStart($event, reaction, count)"
				@touchend.passive="onReactionTouchEnd()"
				@touchcancel.passive="onReactionTouchEnd()"
				@contextmenu.prevent
			>
				<MkReactionIcon :reaction="reaction" :emojiUrl="getEmojiUrl(reaction)" style="pointer-events: none;"/>
				<span :class="$style.reactionCount">{{ count }}</span>
			</button>
			<button ref="reactionAddBtnEl" :class="$style.reactionAdd" @click="openReactionPicker">
				<i class="ti ti-plus"></i>
			</button>
		</div>
		<!-- リアクションユーザーツールチップ (独自実装: 外部絵文字対応) -->
		<Teleport to="body">
			<div v-if="reactionTipVisible" class="ext-reaction-tip" data-ext-tl="reaction-tip" :style="reactionTipStyle" @click="hideReactionTip" @touchstart.passive="hideReactionTip">
				<div class="ext-reaction-tip-emoji">
					<img v-if="reactionTipEmojiUrl" :src="reactionTipEmojiUrl" class="ext-reaction-tip-emoji-img"/>
					<span v-else class="ext-reaction-tip-emoji-text">{{ reactionTipReaction }}</span>
					<div v-if="reactionTipShortcode" class="ext-reaction-tip-shortcode">{{ reactionTipShortcode }}</div>
				</div>
				<div class="ext-reaction-tip-users">
					<div v-if="reactionTipUsers.length === 0" class="ext-reaction-tip-loading">読み込み中...</div>
					<div v-for="u in reactionTipUsers" :key="u.id" class="ext-reaction-tip-user">
						<img :src="u.avatarUrl" class="ext-reaction-tip-avatar"/>
						<span class="ext-reaction-tip-name">{{ u.name || u.username }}</span>
					</div>
					<div v-if="reactionTipCount > 10" class="ext-reaction-tip-more">+{{ reactionTipCount - 10 }}</div>
				</div>
			</div>
		</Teleport>

		<div :class="$style.footer">
			<button :class="$style.footerButton" @click="reply" :title="i18n.ts.reply">
				<i class="ti ti-arrow-back-up"></i>
				<span v-if="note.repliesCount > 0" :class="$style.footerCount">{{ note.repliesCount }}</span>
			</button>
			<button :class="$style.footerButton" @click="showRenoteMenu" :title="i18n.ts.renote">
				<i class="ti ti-repeat"></i>
				<span v-if="note.renoteCount > 0" :class="$style.footerCount">{{ note.renoteCount }}</span>
			</button>
			<button ref="reactionBtnEl" :class="[$style.footerButton, { [$style.reacted]: myReaction }]" @click="openReactionPicker" :title="i18n.ts.reaction">
				<i class="ti ti-mood-plus"></i>
				<span v-if="totalReactionCount > 0" :class="$style.footerCount">
					{{ totalReactionCount }}
				</span>
			</button>
			<button :class="$style.footerButton" @click="showNoteMenu" :title="'メニュー'">
				<i class="ti ti-dots"></i>
			</button>
		</div>
		</div>
	</div>
</article>
</template>

<script lang="ts" setup>
import { ref, computed, defineAsyncComponent, reactive, onMounted, useTemplateRef } from 'vue';
import MkReactionIcon from '@/components/MkReactionIcon.vue';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { getExternalEmojiUrlMap, getExternalAccount } from '@/utility/external-api.js';
import { addExternalRecentReaction } from '@/utility/external-api.js';

const MkExternalReactionPicker = defineAsyncComponent(() => import('@/components/MkExternalReactionPicker.vue'));

const props = defineProps<{
	note: any;
	host: string;
	token: string;
}>();

const emit = defineEmits<{
	(ev: 'reactionChanged', noteId: string, reaction: string | null, oldReaction: string | null): void;
	(ev: 'noteDeleted', noteId: string): void;
}>();

const showContent = ref(false);
const myReaction = ref<string | null>(props.note.myReaction || null);
const reactionBtnEl = useTemplateRef('reactionBtnEl');
const reactionAddBtnEl = useTemplateRef('reactionAddBtnEl');

// 自分のノートかどうか判定
const isMine = computed(() => {
	const ext = getExternalAccount();
	return ext != null && props.note.userId === ext.userId;
});

// リアクションをリアクティブに管理（元のnote.reactionsをコピー）
const reactions = reactive<Record<string, number>>(
	{ ...(props.note.reactions || {}) },
);

// ===== 外部サーバーの絵文字URLマップ（非同期で取得） =====
const externalEmojiUrlMap = ref<Record<string, string>>({});
// 絵文字キャッシュの読み込み完了フラグ（初回レンダリング問題対策）
const emojiMapReady = ref(false);

onMounted(async () => {
	try {
		externalEmojiUrlMap.value = await getExternalEmojiUrlMap();
	} catch (err) {
		console.error('[MkExternalNote] Failed to load external emoji map:', err);
	} finally {
		emojiMapReady.value = true;
	}
});

// ===== MFM用 author（外部ホストを設定） =====
// 外部サーバーから取得したノートでは note.user.host = null だが、
// MkMfmが自サーバーの絵文字DBを参照してしまうのを防ぐため、
// host を明示的に設定する
// ===== 投稿種別（visibility）バッジ =====
const visibilityInfo = computed(() => {
	const v = props.note.visibility;
	if (!v || v === 'public') return null; // public は表示不要
	const map: Record<string, { icon: string; label: string }> = {
		home: { icon: 'ti ti-home', label: 'ホーム' },
		followers: { icon: 'ti ti-lock', label: 'フォロワー' },
		specified: { icon: 'ti ti-mail', label: 'ダイレクト' },
	};
	const info = map[v];
	if (!info) return null;
	// localOnly の場合はアイコンを追加表示
	if (props.note.localOnly) {
		return { icon: info.icon, label: info.label + ' (連合なし)' };
	}
	return info;
});

// localOnly のみ（public + localOnly）の場合も表示
const localOnlyBadge = computed(() => {
	if (props.note.localOnly && (!props.note.visibility || props.note.visibility === 'public')) {
		return { icon: 'ti ti-rocket-off', label: '連合なし' };
	}
	return null;
});

const mfmAuthor = computed(() => ({
	...props.note.user,
	host: props.note.user?.host || props.host,
}));

// ===== 絵文字URL マッピング =====
// Proxy を使用: マップに無い絵文字でも外部サーバーの直URLをフォールバック返却。
// これにより MkCustomEmoji が自サーバーの /emoji/ パスや /proxy/ 経由を使わず、
// 外部サーバーから直接絵文字を取得する。
const mergedEmojiUrls = computed(() => {
	const map: Record<string, string> = {};

	// 外部サーバーの全絵文字キャッシュ
	Object.assign(map, externalEmojiUrlMap.value);

	// note付属 emojis
	if (props.note.emojis) {
		if (Array.isArray(props.note.emojis)) {
			for (const emoji of props.note.emojis) {
				if (emoji.name && emoji.url) {
					map[emoji.name] = emoji.url;
				}
			}
		} else {
			Object.assign(map, props.note.emojis);
		}
	}

	// reactionEmojis
	if (props.note.reactionEmojis) {
		Object.assign(map, props.note.reactionEmojis);
	}

	// Proxy: マップに無い絵文字名でも外部サーバーの直URLを返す
	return new Proxy(map, {
		get(target, prop: string) {
			if (prop in target) return target[prop];
			// 外部サーバーの絵文字直URL（/emoji/{name}.webp）をフォールバック
			return `https://${props.host}/emoji/${prop}.webp`;
		},
		has(target, prop: string) {
			// emojiUrls[name] の存在チェック（in演算子）で常にtrueを返す
			return true;
		},
	});
});

// ===== リアクション一覧（ソート済み） =====
const reactionsEntries = computed(() => {
	return Object.entries(reactions)
		.filter(([, count]) => count > 0)
		.sort((a, b) => b[1] - a[1]);
});

// ===== リアクション合計 =====
const totalReactionCount = computed(() => {
	return Object.values(reactions).reduce((a, b) => a + b, 0);
});

// ===== ファイル種別判定 =====
function isImage(file: any): boolean {
	return file.type?.startsWith('image/') ?? false;
}

function isVideo(file: any): boolean {
	return file.type?.startsWith('video/') ?? false;
}

function isAudio(file: any): boolean {
	return file.type?.startsWith('audio/') ?? false;
}

// ===== 画像拡大表示 =====
function openImage(file: any) {
	window.open(file.url, '_blank');
}

// ===== 外部API呼び出し =====
async function callExternalApi(endpoint: string, params: Record<string, any> = {}) {
	const res = await fetch(`https://${props.host}/api/${endpoint}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ i: props.token, ...params }),
	});
	if (!res.ok) throw new Error(`External API error: ${res.status}`);
	const text = await res.text();
	return text ? JSON.parse(text) : null;
}

// ===== リプライ =====
async function reply() {
	os.post({
		externalReply: {
			id: props.note.id,
			text: props.note.text,
			cw: props.note.cw,
			user: {
				id: props.note.user.id,
				username: props.note.user.username,
				host: props.note.user.host ?? props.host,
				name: props.note.user.name,
				avatarUrl: props.note.user.avatarUrl,
			},
			createdAt: props.note.createdAt,
		},
		initialUseExternalAccount: true,
	});
}

// ===== リノート =====
async function renote() {
	const { canceled } = await os.confirm({
		type: 'question',
		text: '外部サーバーでリノートしますか？',
	});
	if (canceled) return;

	try {
		await callExternalApi('notes/create', { renoteId: props.note.id });
		os.success();
	} catch (err) {
		console.error('Renote error:', err);
		os.alert({ type: 'error', text: 'リノートに失敗しました' });
	}
}

async function quote() {
	os.post({
		externalRenote: {
			id: props.note.id,
			text: props.note.text,
			cw: props.note.cw,
			user: {
				id: props.note.user.id,
				username: props.note.user.username,
				host: props.note.user.host ?? props.host,
				name: props.note.user.name,
				avatarUrl: props.note.user.avatarUrl,
			},
			createdAt: props.note.createdAt,
		},
		initialUseExternalAccount: true,
	});
}

function showRenoteMenu(ev: MouseEvent) {
	os.popupMenu([
		{ text: 'リノート', icon: 'ti ti-repeat', action: renote },
		{ text: '引用', icon: 'ti ti-quote', action: quote },
	], ev.currentTarget ?? ev.target);
}

// ===== リアクション =====
/**
 * 外部TL専用リアクションピッカーを開く（ボタンをアンカーとしてポップアップ表示）
 */
function openReactionPicker(ev?: MouseEvent) {
	// クリックされたボタン要素をアンカーに使用
	const anchorEl = (reactionAddBtnEl.value ?? reactionBtnEl.value ?? (ev?.currentTarget as HTMLElement | null)) as HTMLElement | null;

	const { dispose } = os.popup(MkExternalReactionPicker, {
		anchorElement: anchorEl,
	}, {
		done: async (reaction: string) => {
			if (!reaction) return;
			await applyReaction(reaction);
		},
		closed: () => dispose(),
	});
}

/**
 * リアクションを適用（既存リアクションがあれば先に削除）
 */
/**
 * リアクションを適用（既存リアクションがあれば先に削除）
 */
let reactionProcessing = false;
async function applyReaction(reaction: string) {
	if (reactionProcessing) return;
	reactionProcessing = true;
	try {
		// 既にリアクション済みなら先に削除
		if (myReaction.value) {
			await callExternalApi('notes/reactions/delete', { noteId: props.note.id });
			// ローカルカウント更新
			if (reactions[myReaction.value] != null) {
				reactions[myReaction.value]--;
				if (reactions[myReaction.value] <= 0) {
					delete reactions[myReaction.value];
				}
			}
		}

		await callExternalApi('notes/reactions/create', {
			noteId: props.note.id,
			reaction: reaction,
		});

		// ローカルカウント更新
		const oldReaction = myReaction.value;
		myReaction.value = reaction;
		reactions[reaction] = (reactions[reaction] || 0) + 1;

		emit('reactionChanged', props.note.id, reaction, oldReaction);
		addExternalRecentReaction(reaction);
	} catch (err) {
		console.error('Reaction error:', err);
		os.alert({ type: 'error', text: 'リアクションに失敗しました' });
	} finally {
		reactionProcessing = false;
	}
}

/**
 * 既存リアクションのトグル
 */
async function toggleReaction(reaction: string) {
	if (reactionProcessing) return;
	if (myReaction.value === reaction) {
		// 自分のリアクションを取り消し（確認ダイアログ）
		const { canceled } = await os.confirm({
			type: 'warning',
			text: 'リアクションを取り消しますか？',
		});
		if (canceled) return;
		reactionProcessing = true;
		try {
			await callExternalApi('notes/reactions/delete', { noteId: props.note.id });
			if (reactions[reaction] != null) {
				reactions[reaction]--;
				if (reactions[reaction] <= 0) {
					delete reactions[reaction];
				}
			}
			const old = myReaction.value;
			myReaction.value = null;
			emit('reactionChanged', props.note.id, null, old);
		} catch (err) {
			console.error('Unreaction error:', err);
		} finally {
			reactionProcessing = false;
		}
	} else {
		// 別のリアクションに変更
		await applyReaction(reaction);
	}
}

// ===== リアクションしたユーザーのツールチップ表示 (独自実装) =====
let reactionTooltipTimer: ReturnType<typeof setTimeout> | null = null;
const reactionTipVisible = ref(false);
const reactionTipStyle = ref<Record<string, string>>({});
const reactionTipReaction = ref('');
const reactionTipEmojiUrl = ref<string | undefined>(undefined);
const reactionTipUsers = ref<any[]>([]);
const reactionTipCount = ref(0);
const reactionTipShortcode = ref('');
let reactionTipHideTimer: ReturnType<typeof setTimeout> | null = null;

function onReactionMouseEnter(ev: MouseEvent, reaction: string, count: number) {
	if (reactionTooltipTimer) clearTimeout(reactionTooltipTimer);
	const el = ev.currentTarget as HTMLElement;
	reactionTooltipTimer = setTimeout(() => {
		showReactionUsers(el, reaction, count);
	}, 300);
}

function onReactionMouseLeave() {
	if (reactionTooltipTimer) {
		clearTimeout(reactionTooltipTimer);
		reactionTooltipTimer = null;
	}
	// タッチ操作中のツールチップは消さない（touchEndで3秒後に消す）
	if (!reactionTipHideTimer) {
		hideReactionTip();
	}
}

function onReactionTouchStart(ev: TouchEvent, reaction: string, count: number) {
	if (reactionTooltipTimer) clearTimeout(reactionTooltipTimer);
	const el = ev.currentTarget as HTMLElement;
	reactionTooltipTimer = setTimeout(() => {
		showReactionUsers(el, reaction, count);
	}, 400);
}

function onReactionTouchEnd() {
	if (reactionTooltipTimer) {
		clearTimeout(reactionTooltipTimer);
		reactionTooltipTimer = null;
	}
	// On touch, keep tooltip visible for 3 seconds so users can read it
	if (reactionTipVisible.value) {
		if (reactionTipHideTimer) clearTimeout(reactionTipHideTimer);
		reactionTipHideTimer = setTimeout(() => {
			hideReactionTip();
		}, 3000);
	}
}

function hideReactionTip() {
	reactionTipVisible.value = false;
	reactionTipUsers.value = [];
	reactionTipShortcode.value = '';
	if (reactionTipHideTimer) { clearTimeout(reactionTipHideTimer); reactionTipHideTimer = null; }
}

async function showReactionUsers(anchorEl: HTMLElement, reaction: string, count: number) {
	try {
		// ツールチップの位置をアンカー要素の上に配置
		const rect = anchorEl.getBoundingClientRect();
		reactionTipStyle.value = {
			position: 'fixed',
			left: Math.max(8, Math.min(rect.left + rect.width / 2 - 170, window.innerWidth - 348)) + 'px',
			top: Math.max(8, rect.top - 8) + 'px',
			transform: 'translateY(-100%)',
			zIndex: '1000000',
		};
		reactionTipReaction.value = reaction;
		reactionTipEmojiUrl.value = getEmojiUrl(reaction);
		reactionTipCount.value = count;
		reactionTipShortcode.value = reaction.startsWith(':') ? reaction : '';
		reactionTipVisible.value = true;
		reactionTipUsers.value = []; // ロード中

		const res = await callExternalApi('notes/reactions', {
			noteId: props.note.id,
			type: reaction,
			limit: 10,
		});
		if (!reactionTipVisible.value) return; // 既に閉じてたら中断
		const users = (Array.isArray(res) ? res : []).map((x: any) => x.user).filter(Boolean);
		if (users.length < 1) {
			hideReactionTip();
			return;
		}
		reactionTipUsers.value = users;
	} catch (err) {
		console.warn('[MkExternalNote] Failed to fetch reaction users:', err);
		hideReactionTip();
	}
}

// ===== 外部からのリアクション更新 =====
function updateReaction(newReaction: string, delta: number) {
	if (delta > 0) {
		reactions[newReaction] = (reactions[newReaction] || 0) + delta;
	} else {
		if (reactions[newReaction] != null) {
			reactions[newReaction] += delta;
			if (reactions[newReaction] <= 0) {
				delete reactions[newReaction];
			}
		}
	}
}

// ===== 絵文字URL取得（リアクション表示用） =====
function getEmojiUrl(reaction: string): string | undefined {
	// カスタム絵文字 :name: 形式
	const match = reaction.match(/^:([^:]+):$/);
	if (!match) return undefined;

	const emojiName = match[1];
	// @ 以降を除去（:name@host: → name）
	const pureName = emojiName.includes('@') ? emojiName.split('@')[0] : emojiName;

	// 1. note付属の reactionEmojis から検索（複数パターン）
	const emojis = props.note.reactionEmojis;
	if (emojis) {
		const found = emojis[emojiName]
			|| emojis[pureName]
			|| emojis[`${pureName}@${props.host}`]
			|| emojis[`${pureName}@.`]
			|| emojis[reaction];
		if (found) return found;
	}

	// 2. note付属の emojis からも検索
	if (props.note.emojis) {
		if (Array.isArray(props.note.emojis)) {
			const found = props.note.emojis.find((e: any) => e.name === pureName || e.name === emojiName);
			if (found?.url) return found.url;
		} else {
			const found = props.note.emojis[pureName] || props.note.emojis[emojiName];
			if (found) return found;
		}
	}

	// 3. 外部サーバーの絵文字キャッシュから検索
	const cached = externalEmojiUrlMap.value[pureName] || externalEmojiUrlMap.value[emojiName];
	if (cached) return cached;

	// 4. フォールバック: 外部サーバーのプロキシURL
	return `https://${props.host}/emoji/${pureName}.webp`;
}

function openInExternal() {
	window.open(`https://${props.host}/notes/${props.note.id}`, '_blank');
}

// ===== ノート削除 =====
async function deleteNote() {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: 'このノートを削除しますか？この操作は取り消せません。',
	});
	if (canceled) return;

	try {
		await callExternalApi('notes/delete', { noteId: props.note.id });
		os.success();
		emit('noteDeleted', props.note.id);
	} catch (err) {
		console.error('[MkExternalNote] Delete error:', err);
		os.alert({ type: 'error', text: 'ノートの削除に失敗しました' });
	}
}

// ===== メニュー =====
function showNoteMenu(ev: MouseEvent) {
	const items: any[] = [];

	if (isMine.value) {
		items.push({
			text: '削除',
			icon: 'ti ti-trash',
			danger: true,
			action: deleteNote,
		});
		items.push({ type: 'divider' });
	}

	items.push({
		text: '外部サイトで開く',
		icon: 'ti ti-external-link',
		action: openInExternal,
	});

	os.popupMenu(items, ev.currentTarget ?? ev.target);
}

// expose for parent (MkExternalTimeline) to call
defineExpose({
	updateReaction,
});
</script>

<style lang="scss" module>
.root {
	padding: 10px 10px 6px;
	font-size: 0.95em;
	display: flex;
	align-items: flex-start;
	gap: 0;
}

.avatar {
	flex-shrink: 0;
	margin-top: 2px;
	margin-right: 0;
}

.avatarImg {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	object-fit: cover;
}

.main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	position: relative;
}

.bubbleArrow {
	position: absolute;
	top: 12px;
	left: -8px;
	width: 0;
	height: 0;
	border-top: 7px solid transparent;
	border-bottom: 7px solid transparent;
	border-right: 8px solid color-mix(in srgb, var(--MI_THEME-panel) 85%, var(--MI_THEME-fg));
	z-index: 1;
}

.bubbleBody {
	background: color-mix(in srgb, var(--MI_THEME-panel) 85%, var(--MI_THEME-fg));
	border-radius: 16px;
	border: 1.5px solid color-mix(in srgb, var(--MI_THEME-divider) 80%, transparent);
	padding: 12px 14px;
	box-shadow: 0 1px 8px rgba(0,0,0,.06);
	transition: box-shadow .2s ease, border-color .2s ease;
	display: flex;
	flex-direction: column;
	gap: 8px;

	&:hover {
		box-shadow: 0 3px 16px rgba(0,0,0,.12);
		border-color: color-mix(in srgb, var(--MI_THEME-accent) 30%, var(--MI_THEME-divider));
	}
}

.header {
	display: flex;
	gap: 8px;
}

.headerBody {
	flex: 1;
	min-width: 0;
}

.headerTop {
	display: flex;
	align-items: baseline;
	gap: 8px;
	flex-wrap: wrap;
}

.name {
	font-weight: bold;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.username {
	opacity: 0.7;
	font-size: 0.9em;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.headerBottom {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 2px;
}

.time {
	font-size: 0.85em;
	opacity: 0.7;

	&:hover {
		text-decoration: underline;
	}
}

.externalBadge {
	font-size: 0.9em;
	cursor: help;
}

.visibilityBadge {
	font-size: 0.8em;
	opacity: 0.6;
	cursor: help;

	> i {
		font-size: 0.9em;
	}
}

.cw {
	padding: 8px 12px;
	background: var(--MI_THEME-buttonBg);
	border-radius: 8px;
}

.cwButton {
	margin-left: 8px;
	padding: 4px 12px;
	font-size: 0.9em;
	background: var(--MI_THEME-accent);
	color: var(--MI_THEME-fgOnAccent);
	border: none;
	border-radius: 4px;
	cursor: pointer;

	&:hover {
		opacity: 0.9;
	}
}

.content {
	// empty
}

.text {
	line-height: 1.6;
	word-wrap: break-word;
	overflow-wrap: break-word;
}

// ===== ファイル表示 =====
.files {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 8px;
	margin-top: 8px;
}

.file {
	border-radius: 8px;
	overflow: hidden;
}

.fileImg {
	width: 100%;
	height: auto;
	max-height: 300px;
	object-fit: cover;
	cursor: zoom-in;
	transition: opacity 0.2s;

	&:hover {
		opacity: 0.85;
	}
}

.fileVideo {
	width: 100%;
	max-height: 400px;
	border-radius: 8px;
	background: #000;
}

.fileAudio {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 12px;
	background: var(--MI_THEME-buttonBg);
	border-radius: 8px;

	> i {
		font-size: 1.2em;
		opacity: 0.7;
	}
}

.fileAudioName {
	font-size: 0.85em;
	opacity: 0.8;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.audioPlayer {
	width: 100%;
	height: 36px;
}

.fileOther {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 12px;
	background: var(--MI_THEME-buttonBg);
	color: var(--MI_THEME-fg);
	text-decoration: none;
	border-radius: 8px;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

// ===== リノート =====
.renote {
	margin-top: 8px;
	padding: 8px;
	background: var(--MI_THEME-bg);
	border-radius: 8px;
	border: 1px solid var(--MI_THEME-divider);
}

.renoteHeader {
	font-size: 0.85em;
	opacity: 0.7;
	margin-bottom: 8px;
}

.renoteNote {
	padding: 0;
}

// ===== リアクション =====
.reactions {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin-top: 4px;
	user-select: none;
	-webkit-user-select: none;
	-webkit-touch-callout: none;
}

.reaction {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 4px 8px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 6px;
	background: var(--MI_THEME-buttonBg);
	cursor: pointer;
	font-size: 0.9em;
	transition: all 0.2s;
	user-select: none;
	-webkit-user-select: none;
	-webkit-touch-callout: none;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.myReaction {
	background: color-mix(in srgb, var(--MI_THEME-accent) 15%, transparent);
	border-color: var(--MI_THEME-accent);
	color: var(--MI_THEME-accent);
}

.reactionCount {
	font-size: 0.85em;
	min-width: 1em;
	text-align: center;
}

.reactionAdd {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border: 1px dashed var(--MI_THEME-divider);
	border-radius: 6px;
	background: none;
	cursor: pointer;
	opacity: 0.5;
	transition: all 0.2s;

	&:hover {
		opacity: 1;
		background: var(--MI_THEME-buttonBg);
		border-style: solid;
	}
}

// ===== フッター =====
.footer {
	display: flex;
	gap: 16px;
	margin-top: 4px;
}

// ===== モバイル対応 =====
@container (max-width: 700px) {
	.root {
		padding: 8px 6px 5px;
	}
	.avatarImg {
		width: 36px;
		height: 36px;
	}
	.bubbleBody {
		padding: 10px 12px;
		border-radius: 14px;
	}
	.bubbleArrow {
		top: 10px;
	}
}

.footerButton {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 8px 12px;
	font-size: 0.9em;
	color: var(--MI_THEME-fg);
	opacity: 0.7;
	background: none;
	border: none;
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s ease;

	&:hover {
		opacity: 1;
		background: var(--MI_THEME-buttonBg);
	}

	&.reacted {
		color: var(--MI_THEME-accent);
		opacity: 1;
	}
}

.footerCount {
	font-size: 0.85em;
}
</style>

<!-- グローバルスタイル: Teleport先のbodyに適用するため非module -->
<style lang="scss">
.ext-reaction-tip {
	background: var(--MI_THEME-panel, rgba(18, 18, 28, 0.95));
	border: 1px solid var(--MI_THEME-divider, rgba(255, 255, 255, 0.12));
	border-radius: 12px;
	padding: 10px 12px;
	backdrop-filter: blur(16px);
	-webkit-backdrop-filter: blur(16px);
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
	display: flex;
	gap: 10px;
	max-width: 340px;
	pointer-events: auto;
	animation: ext-reaction-tip-in 0.15s ease-out;
	color: var(--MI_THEME-fg, #fff);
}

@keyframes ext-reaction-tip-in {
	from { opacity: 0; transform: translateY(calc(-100% + 6px)); }
	to { opacity: 1; transform: translateY(-100%); }
}

.ext-reaction-tip-emoji {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding-right: 8px;
	border-right: 1px solid var(--MI_THEME-divider, rgba(255, 255, 255, 0.1));
	gap: 4px;
}

.ext-reaction-tip-emoji-img {
	width: 60px;
	height: 60px;
	object-fit: contain;
}

.ext-reaction-tip-emoji-text {
	font-size: 46px;
	line-height: 1;
}

.ext-reaction-tip-shortcode {
	font-size: 0.75em;
	opacity: 0.6;
	word-break: break-all;
	text-align: center;
	max-width: 90px;
	line-height: 1.3;
}

.ext-reaction-tip-users {
	flex: 1;
	min-width: 0;
	font-size: 0.95em;
}

.ext-reaction-tip-loading {
	opacity: 0.5;
	font-size: 0.85em;
	padding: 4px 0;
}

.ext-reaction-tip-user {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 3px 0;
	line-height: 24px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.ext-reaction-tip-avatar {
	width: 24px;
	height: 24px;
	border-radius: 50%;
	flex-shrink: 0;
}

.ext-reaction-tip-name {
	overflow: hidden;
	text-overflow: ellipsis;
}

.ext-reaction-tip-more {
	padding: 2px 0;
	opacity: 0.6;
	font-size: 0.9em;
}
</style>
