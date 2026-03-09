<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<SearchMarker path="/settings/external-account" label="シュリンピア連携" :keywords="['external', 'shrimpia', 'ohtl', 'oltl', 'timeline']" icon="ti ti-link">
	<div class="_gaps_m">
		<FormSection first>
			<template #label>🦐 シュリンピア連携</template>

			<div class="_gaps_s">
				<MkInfo>
					Shrimpiaと連携するとシュリンピアのタイムラインを表示したり、ノートの作成・リアクション・リプライ・リノートができます。
				</MkInfo>

				<MkSwitch :modelValue="externalEnabled" @update:modelValue="onToggleEnabled">
					<template #label>シュリンピア連携を有効にする</template>
				</MkSwitch>
			</div>
		</FormSection>

		<FormSection v-if="externalEnabled">
			<template #label>シュリンピアアカウント連携</template>

			<div v-if="!isLinked" class="_gaps_s">
				<div style="font-size: 0.9em; opacity: 0.8;">
					シュリンピアアカウントへMiAuthを使用して安全に認証します。
				</div>

				<MkButton :disabled="linking" primary @click="startMiAuth">
					<i class="ti ti-link"></i> {{ linking ? 'シュリンピアと連携中...' : 'シュリンピアアカウントと連携' }}
				</MkButton>
			</div>

			<div v-else class="_gaps_s">
				<MkInfo>
					<i class="ti ti-check"></i> 連携済み
				</MkInfo>

				<div :class="$style.linkedAccount">
					<div :class="$style.linkedAccountInfo">
						<div :class="$style.linkedAccountHost">
							<i class="ti ti-server"></i> {{ externalHost }}
						</div>
						<div :class="$style.linkedAccountUser">
							<i class="ti ti-user"></i> @{{ externalUsername }}
						</div>
					</div>
					<MkButton danger @click="unlinkAccount">
						<i class="ti ti-unlink"></i> 連携解除
					</MkButton>
				</div>
			</div>
		</FormSection>

		<FormSection v-if="externalEnabled && isLinked">
			<template #label>シュリンピアタイムライン設定</template>

			<div class="_gaps_s">
				<MkSwitch v-model="enableOHTL">
					<template #label>🦐 外部ホームタイムライン (OHTL) を表示</template>
					<template #caption>シュリンピアでフォローしているユーザーのノートを表示</template>
				</MkSwitch>

				<MkSwitch v-model="enableOLTL">
					<template #label>🦐 外部ローカルタイムライン (OLTL) を表示</template>
					<template #caption>シュリンピアのローカルタイムラインを表示</template>
				</MkSwitch>
			</div>
		</FormSection>

		<FormSection v-if="externalEnabled && isLinked">
			<template #label>🦐 外部TLリアクション お気に入り絵文字</template>
			<div class="_gaps_s">
				<div style="font-size: 0.9em; opacity: 0.8; margin-bottom: 8px;">
					外部TLのリアクションピッカーで表示されるお気に入り絵文字を管理します。<br/>
					リアクションピッカーでは絵文字を右クリック/長押しでもお気に入りに追加・削除できます。
				</div>

				<div v-if="extFavEmojis.length > 0" :class="$style.emojiGrid">
					<div
						v-for="(emoji, idx) in extFavEmojis"
						:key="emoji + idx"
						:class="$style.emojiItem"
					>
						<img v-if="emoji.startsWith(':')" :src="getCustomEmojiUrl(emoji)" :alt="emoji" :class="$style.emojiItemImg"/>
						<span v-else :class="$style.emojiItemUnicode">{{ emoji }}</span>
						<button class="_button" :class="$style.emojiRemoveBtn" @click="removeExtFavEmoji(idx)">
							<i class="ti ti-x"></i>
						</button>
					</div>
				</div>
				<div v-else style="opacity: 0.5; font-size: 0.9em; padding: 8px 0;">
					お気に入り絵文字はまだありません
				</div>

				<div style="display: flex; gap: 8px; flex-wrap: wrap;">
					<MkButton @click="addExtFavEmojiFromPicker">
						<i class="ti ti-plus"></i> 絵文字を追加
					</MkButton>
					<MkButton v-if="extFavEmojis.length > 0" danger @click="clearExtFavEmojis">
						<i class="ti ti-trash"></i> 全て削除
					</MkButton>
				</div>
			</div>
		</FormSection>
	</div>
</SearchMarker>
</template>

<script lang="ts" setup>
import { ref, computed, defineAsyncComponent, onMounted } from 'vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkButton from '@/components/MkButton.vue';
import MkInfo from '@/components/MkInfo.vue';
import FormSection from '@/components/form/section.vue';
import { prefer } from '@/preferences.js';
import { definePage } from '@/page.js';
import * as os from '@/os.js';
import { genId } from '@/utility/id.js';
import { getExternalFavoriteEmojis, setExternalFavoriteEmojis, removeExternalFavoriteEmoji, getExternalCustomEmojis } from '@/utility/external-api.js';
import type { ExternalCustomEmoji } from '@/utility/external-api.js';

const MkExternalReactionPicker = defineAsyncComponent(() => import('@/components/MkExternalReactionPicker.vue'));

const externalEnabled = prefer.model('external.enabled');
const externalHost = prefer.model('external.host');
const externalToken = prefer.model('external.token');
const externalUserId = prefer.model('external.userId');
const externalUsername = prefer.model('external.username');
const enableOHTL = prefer.model('external.enableOHTL');
const enableOLTL = prefer.model('external.enableOLTL');

const linking = ref(false);

const isLinked = computed(() => {
	return externalToken.value != null && externalUserId.value != null;
});

// ===== 有効化トグル（免責ポップアップ付き） =====
async function onToggleEnabled(newValue: boolean) {
	if (newValue) {
		// 有効にする場合は免責事項を表示
		const { canceled } = await os.actions({
			type: 'warning',
			title: 'シュリンピア連携の免責事項',
			text: 'この機能を有効にしてシュリンピアにアクセスし、いかなる損害を被ったとしても旗鯖は責任を負いません。\n\nまた、シュリンピアアカウントを使用し、シュリンピアに対して行った行為はシュリンピアの各種規約が適用され、旗鯖の利用規約・プライバシーポリシーの適用外となります。\n\n連携前に、シュリンピアの各種利用規約をご確認ください。',
			actions: [
				{
					value: 'ok',
					text: 'わかりました（このボタンを押すと、機能が有効になります）',
					primary: true,
				},
				{
					value: 'cancel',
					text: '今はやめておく',
				},
			],
		});

		if (canceled) return;

		externalEnabled.value = true;
	} else {
		externalEnabled.value = false;
	}
}

async function startMiAuth() {
	linking.value = true;

	try {
		// MiAuth用のセッションIDを生成
		const sessionId = genId();
		
		// ホスト名は固定でシュリンピア
		const host = 'mk.shrimpia.network';
		const callbackUrl = `${window.location.origin}/settings/external-account?miauth=${sessionId}`;
		const permissions = ['read:account', 'read:following', 'write:notes', 'write:reactions', 'read:notifications'].join(',');
		
		const miAuthUrl = `https://${host}/miauth/${sessionId}?name=${encodeURIComponent('旗鯖連携')}&callback=${encodeURIComponent(callbackUrl)}&permission=${permissions}`;

		// セッションIDをローカルストレージに保存
		localStorage.setItem('miauth_session', sessionId);
		localStorage.setItem('miauth_host', host);

		// ホスト名を保存
		externalHost.value = host;

		// MiAuth画面を開く
		window.location.href = miAuthUrl;
	} catch (err) {
		console.error('MiAuth error:', err);
		os.alert({
			type: 'error',
			text: '連携の開始に失敗しました',
		});
		linking.value = false;
	}
}

async function unlinkAccount() {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: 'シュリンピアとの連携を解除しますか？',
	});

	if (canceled) return;

	externalToken.value = null;
	externalUserId.value = null;
	externalUsername.value = null;

	os.success();
}

// ===== 外部TL お気に入り絵文字管理 =====
const extFavEmojis = ref<string[]>([]);
const extCustomEmojis = ref<ExternalCustomEmoji[]>([]);

function loadExtFavEmojis() {
	extFavEmojis.value = getExternalFavoriteEmojis();
}

function removeExtFavEmoji(index: number) {
	const emoji = extFavEmojis.value[index];
	if (!emoji) return;
	removeExternalFavoriteEmoji(emoji);
	loadExtFavEmojis();
}

function clearExtFavEmojis() {
	setExternalFavoriteEmojis([]);
	loadExtFavEmojis();
}

function getCustomEmojiUrl(reaction: string): string {
	const match = reaction.match(/^:([^:]+):$/);
	if (!match) return '';
	const name = match[1];
	const emoji = extCustomEmojis.value.find(e => e.name === name);
	return emoji?.url ?? '';
}

function addExtFavEmojiFromPicker() {
	const { dispose } = os.popup(MkExternalReactionPicker, {}, {
		done: (reaction: string) => {
			if (!reaction) return;
			const list = getExternalFavoriteEmojis().filter(e => e !== reaction);
			list.push(reaction);
			setExternalFavoriteEmojis(list);
			loadExtFavEmojis();
		},
		closed: () => dispose(),
	});
}

// MiAuthコールバック処理
async function handleMiAuthCallback() {
	const url = new URL(window.location.href);
	const sessionParam = url.searchParams.get('miauth');
	
	if (!sessionParam) return;

	const savedSession = localStorage.getItem('miauth_session');
	const savedHost = localStorage.getItem('miauth_host');

	if (!savedSession || !savedHost || sessionParam !== savedSession) {
		console.error('Invalid MiAuth session');
		return;
	}

	// URLからパラメータを削除
	url.searchParams.delete('miauth');
	window.history.replaceState({}, '', url.toString());

	try {
		// MiAuthトークンを取得
		const res = await fetch(`https://${savedHost}/api/miauth/${savedSession}/check`, {
			method: 'POST',
		});

		if (!res.ok) {
			throw new Error('Failed to verify MiAuth');
		}

		const data = await res.json();

		if (!data.ok || !data.token || !data.user) {
			throw new Error('Invalid MiAuth response');
		}

		// トークンとユーザー情報を保存
		externalHost.value = savedHost;
		externalToken.value = data.token;
		externalUserId.value = data.user.id;
		externalUsername.value = data.user.username;

		// ローカルストレージをクリーンアップ
		localStorage.removeItem('miauth_session');
		localStorage.removeItem('miauth_host');

		os.success();
	} catch (err) {
		console.error('MiAuth callback error:', err);
		os.alert({
			type: 'error',
			text: '連携の完了に失敗しました',
		});
	}
}

// コンポーネントマウント時にコールバックを処理 & 絵文字をロード
onMounted(async () => {
	handleMiAuthCallback();
	loadExtFavEmojis();
	if (isLinked.value) {
		try {
			extCustomEmojis.value = await getExternalCustomEmojis();
		} catch (e) {
			// ignore
		}
	}
});

definePage({
	title: 'シュリンピア連携',
	icon: 'ti ti-link',
});
</script>

<style lang="scss" module>
.linkedAccount {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px;
	background: var(--MI_THEME-panel);
	border-radius: 8px;
}

.linkedAccountInfo {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.linkedAccountHost {
	font-weight: bold;
	display: flex;
	align-items: center;
	gap: 8px;
}

.linkedAccountUser {
	opacity: 0.7;
	display: flex;
	align-items: center;
	gap: 8px;
}

.emojiGrid {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	padding: 8px 0;
}

.emojiItem {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 42px;
	height: 42px;
	border-radius: 8px;
	background: var(--MI_THEME-bg);

	&:hover {
		.emojiRemoveBtn {
			opacity: 1;
		}
	}
}

.emojiItemImg {
	width: 32px;
	height: 32px;
	object-fit: contain;
}

.emojiItemUnicode {
	font-size: 1.5em;
	line-height: 1;
}

.emojiRemoveBtn {
	position: absolute;
	top: -4px;
	right: -4px;
	width: 18px;
	height: 18px;
	border-radius: 50%;
	background: var(--MI_THEME-accent);
	color: var(--MI_THEME-fgOnAccent);
	font-size: 0.6em;
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0;
	transition: opacity 0.15s;
	cursor: pointer;
}
</style>
