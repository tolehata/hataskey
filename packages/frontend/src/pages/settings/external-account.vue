<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<SearchMarker path="/settings/external-account" label="外部アカウント連携" :keywords="['external', 'shrimpia', 'ohtl', 'oltl', 'timeline', '外部']" icon="ti ti-link">
	<div class="_gaps_m">
		<FormSection first>
			<template #label><i class="ti ti-link"></i> 外部アカウント連携</template>

			<div class="_gaps_s">
				<MkInfo>
					外部サーバーと連携すると、外部サーバーのタイムラインを表示したり、ノートの作成・リアクション・リプライ・リノートができます。
				</MkInfo>

				<MkSwitch :modelValue="externalEnabled" @update:modelValue="onToggleEnabled">
					<template #label>外部アカウント連携を有効にする</template>
				</MkSwitch>
			</div>
		</FormSection>

		<FormSection v-if="externalEnabled">
			<template #label>アカウント連携</template>

			<div v-if="!isLinked" class="_gaps_s">
				<!-- 接続先選択 -->
				<div style="font-size: 0.9em; opacity: 0.8; margin-bottom: 4px;">
					接続先サーバーを選択してください。
				</div>
				<MkSelect v-model="selectedHost" :items="hostOptions">
					<template #label>接続先</template>
				</MkSelect>

				<MkButton :disabled="linking || !selectedHost" primary @click="startMiAuth">
					<i class="ti ti-link"></i> {{ linking ? '連携中...' : '外部アカウントと連携' }}
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
			<template #label>外部タイムライン設定</template>

			<div class="_gaps_s">
				<MkSwitch v-model="enableOHTL">
					<template #label><i class="ti ti-home"></i> 外部ホームタイムライン (OHTL) を表示</template>
					<template #caption>連携先でフォローしているユーザーのノートを表示</template>
				</MkSwitch>

				<MkSwitch v-model="enableOLTL">
					<template #label><i class="ti ti-planet"></i> 外部ローカルタイムライン (OLTL) を表示</template>
					<template #caption>連携先のローカルタイムラインを表示</template>
				</MkSwitch>

				<!-- 旗鯖fork: 外部通知のトースト無効化トグル
				     ONの時、WebSocket接続も行わない(リソース節約、通知バッジ更新も止まる) -->
				<MkSwitch v-model="disableNotificationToast" @update:modelValue="onDisableNotifToastChange">
					<template #label><i class="ti ti-bell-off"></i> 外部通知のポップアップを無効化</template>
					<template #caption>ONの場合、外部アカウントからの通知ポップアップ(トースト)を表示しません。リアルタイム接続も停止するためリソースを節約できます。</template>
				</MkSwitch>
			</div>
		</FormSection>

		<FormSection v-if="externalEnabled && isLinked">
			<template #label><i class="ti ti-star"></i> 外部TLリアクション お気に入り絵文字</template>
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

		<!-- 旗鯖fork: 外部TL絵文字キャッシュの管理 -->
		<FormSection v-if="externalEnabled">
			<template #label><i class="ti ti-photo"></i> 外部TL絵文字キャッシュ</template>
			<div class="_gaps_s">
				<MkInfo>
					外部TLでリアクションするときに表示される絵文字の画像URLを、お使いの端末に一時的に保存しておく仕組みです。<br/>
					同じ外部サーバーに何度もアクセスする際、相手サーバーへの問い合わせを最小限に抑えるために使われます。
				</MkInfo>

				<div style="font-size: 0.9em; line-height: 1.6;">
					<b style="display: block; margin-bottom: 4px;">📦 キャッシュされるもの</b>
					<ul style="margin: 0 0 8px 1.2em; padding: 0; opacity: 0.85;">
						<li>外部サーバーから取得した絵文字の <b>画像URL一覧</b>(画像本体は保存しません)</li>
						<li>最大 <b>10サーバー分</b>まで保持(超えた場合は古いものから自動削除)</li>
						<li>取得から <b>24時間</b>経過すると自動的に再取得</li>
					</ul>
					<b style="display: block; margin-bottom: 4px;">🗑️ クリアボタンを押すと</b>
					<ul style="margin: 0 0 8px 1.2em; padding: 0; opacity: 0.85;">
						<li>上記キャッシュをすべて削除します</li>
						<li>次回ピッカーを開いた時、外部サーバーから絵文字一覧を再取得します</li>
					</ul>
					<b style="display: block; margin-bottom: 4px;">💡 こんな時に使ってください</b>
					<ul style="margin: 0 0 8px 1.2em; padding: 0; opacity: 0.85;">
						<li>絵文字が古い・新しく追加された絵文字が表示されない</li>
						<li>削除された絵文字が表示され続けている</li>
						<li>プライバシー上、保存されている情報を即座に消したい</li>
					</ul>
					<div style="opacity: 0.7; margin-top: 8px;">
						<i class="ti ti-info-circle"></i>
						<b>「最近使った」「お気に入り」の履歴は削除されません。</b>
						あなたが実際に使用した絵文字の記録なので、別途管理されています。
					</div>
				</div>

				<div>
					<MkButton danger @click="clearEmojiCache">
						<i class="ti ti-trash"></i> 絵文字キャッシュをクリア
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
import MkSelect from '@/components/MkSelect.vue';
import FormSection from '@/components/form/section.vue';
import { prefer } from '@/preferences.js';
import { definePage } from '@/page.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import * as os from '@/os.js';
import { genId } from '@/utility/id.js';
import { hostname } from '@@/js/config.js';
import { getExternalFavoriteEmojis, setExternalFavoriteEmojis, removeExternalFavoriteEmoji, getExternalCustomEmojis, clearExternalEmojiCache } from '@/utility/external-api.js';
import type { ExternalCustomEmoji } from '@/utility/external-api.js';

const MkExternalReactionPicker = defineAsyncComponent(() => import('@/components/MkExternalReactionPicker.vue'));

const externalEnabled = prefer.model('external.enabled');
const externalHost = prefer.model('external.host');
const externalToken = prefer.model('external.token');
const externalUserId = prefer.model('external.userId');
const externalUsername = prefer.model('external.username');
const externalAvatarUrl = prefer.model('external.avatarUrl');
const enableOHTL = prefer.model('external.enableOHTL');
const enableOLTL = prefer.model('external.enableOLTL');
// 旗鯖fork: 外部通知のトースト無効化トグル (ON時はWSも接続しない)
const disableNotificationToast = prefer.model('external.disableNotificationToast');

// トグル切替時にWSストリームを再起動 (ON→OFF: 接続開始、OFF→ON: 切断)
async function onDisableNotifToastChange() {
	const { restartExternalNotificationStream } = await import('@/utility/external-notification-stream.js');
	restartExternalNotificationStream();
}

const linking = ref(false);

const isLinked = computed(() => {
	return externalToken.value != null && externalUserId.value != null;
});

// ===== 接続先候補 =====
// 現在のインスタンスに応じて、接続先候補を動的に生成
const HATACHI_3 = 'o.hata.blog';
const HATACHI_2 = 'misskey.hatachanoima.net';
const SHRIMPIA = 'mk.shrimpia.network';

const isHatachi3 = computed(() => hostname === HATACHI_3);
const isHatachi2 = computed(() => hostname === HATACHI_2);

const hostOptions = computed(() => {
	const options: { value: string; label: string }[] = [];
	const currentHost = hostname;

	// 旗池2丁目（自分自身でなければ追加）
	if (currentHost !== HATACHI_2) {
		options.push({ value: HATACHI_2, label: `旗池2丁目 (${HATACHI_2})` });
	}

	// 旗池3丁目（自分自身でなければ追加）
	if (currentHost !== HATACHI_3) {
		options.push({ value: HATACHI_3, label: `旗池3丁目 (${HATACHI_3})` });
	}

	// シュリンピアは常に選択肢に含める（自分自身でなければ）
	if (currentHost !== SHRIMPIA) {
		options.push({ value: SHRIMPIA, label: `シュリンピア (${SHRIMPIA})` });
	}

	return options;
});

const selectedHost = ref(hostOptions.value.length > 0 ? hostOptions.value[0].value : '');

// 選択中のホストが旗鯖かどうか
function isHataSaba(host: string): boolean {
	return host === HATACHI_2 || host === HATACHI_3;
}

// ===== 有効化トグル =====
async function onToggleEnabled(newValue: boolean) {
	if (newValue) {
		externalEnabled.value = true;
	} else {
		externalEnabled.value = false;
	}
}

// ===== MiAuth =====
async function startMiAuth() {
	const host = selectedHost.value;
	if (!host) return;

	// 接続先に応じた免責事項ポップアップを表示
	if (isHataSaba(host)) {
		// 旗鯖同士の場合
		const { canceled, result } = await os.actions({
			type: 'info',
			title: '旗鯖間アカウント連携',
			text: 'お使いの別の旗鯖アカウントへ接続します。\n\n旗鯖同士のご利用の場合は利用規約とプライバシーポリシーは旗鯖と同様の規約が適用されます。',
			actions: [
				{ value: 'ok', text: '連携を開始する', primary: true },
				{ value: 'cancel', text: 'キャンセル' },
			],
		});
		if (canceled || result === 'cancel') return;
	} else {
		// シュリンピア等の外部サーバーの場合
		const { canceled, result } = await os.actions({
			type: 'warning',
			title: '外部サーバー連携の免責事項',
			text: `この機能を有効にして ${host} にアクセスし、いかなる損害を被ったとしても旗鯖は責任を負いません。\n\nまた、外部アカウントを使用し、外部サーバーに対して行った行為は外部サーバーの各種規約が適用され、旗鯖の利用規約・プライバシーポリシーの適用外となります。\n\n連携前に、接続先の各種利用規約をご確認ください。`,
			actions: [
				{ value: 'ok', text: 'わかりました（連携を開始する）', primary: true },
				{ value: 'cancel', text: '今はやめておく' },
			],
		});
		if (canceled || result === 'cancel') return;
	}

	linking.value = true;

	try {
		const sessionId = genId();
		const callbackUrl = `${window.location.origin}/settings/external-account?miauth=${sessionId}`;
		const permissions = ['read:account', 'read:following', 'write:notes', 'write:reactions', 'read:notifications'].join(',');

		const miAuthUrl = `https://${host}/miauth/${sessionId}?name=${encodeURIComponent('旗鯖連携')}&callback=${encodeURIComponent(callbackUrl)}&permission=${permissions}`;

		localStorage.setItem('miauth_session', sessionId);
		localStorage.setItem('miauth_host', host);

		externalHost.value = host;
		window.location.href = miAuthUrl;
	} catch (err) {
		console.error('MiAuth error:', err);
		os.alert({ type: 'error', text: '連携の開始に失敗しました' });
		linking.value = false;
	}
}

async function unlinkAccount() {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: '外部アカウントとの連携を解除しますか？',
	});

	if (canceled) return;

	externalToken.value = null;
	externalUserId.value = null;
	externalUsername.value = null;
	externalAvatarUrl.value = null;

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

/**
 * 外部TL絵文字キャッシュをクリア
 * - 現サーバーの絵文字一覧キャッシュ(emojiCache)
 * - ホストごとの絵文字URLマップ(externalEmojiUrlMap)
 * - 履歴/お気に入りは保持(ユーザーの能動的選択履歴のため)
 */
async function clearEmojiCache() {
	const { canceled } = await os.confirm({
		type: 'warning',
		title: '外部TL絵文字キャッシュをクリアしますか?',
		text: '保存されている外部サーバーの絵文字URL一覧をすべて削除します。\n\n' +
			'次回ピッカーを開いた時に外部サーバーから絵文字一覧を再取得します。\n' +
			'(相手サーバーへのリクエストが1回発生します)\n\n' +
			'「最近使った」「お気に入り」の履歴は保持されます。',
	});
	if (canceled) return;
	clearExternalEmojiCache();
	os.success();
}

function getCustomEmojiUrl(reaction: string): string {
	const match = reaction.match(/^:([^:]+):$/);
	if (!match) return '';
	const name = match[1];
	const emoji = extCustomEmojis.value.find(e => e.name === name);
	return emoji?.url ?? '';
}

function addExtFavEmojiFromPicker(ev: MouseEvent) {
	// 旗鯖fork: anchorElement を渡してボタン周辺にピッカーを表示する
	// (これがないと画面右サイドや下端にデフォルト位置で表示されてしまう)
	const anchor = ev.currentTarget as HTMLElement;
	const { dispose } = os.popup(MkExternalReactionPicker, {
		anchorElement: anchor,
	}, {
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

	url.searchParams.delete('miauth');
	window.history.replaceState({}, '', url.toString());

	try {
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

		externalHost.value = savedHost;
		externalToken.value = data.token;
		externalUserId.value = data.user.id;
		externalUsername.value = data.user.username;
		externalAvatarUrl.value = data.user.avatarUrl ?? null;

		localStorage.removeItem('miauth_session');
		localStorage.removeItem('miauth_host');

		// 外部TL同意をサーバーに記録
		prefer.commit('hataConsent.externalTl', true);
		prefer.commit('hataConsent.externalTlDate', new Date().toISOString());
		misskeyApi('hata/consent/update', { type: 'externalTl', agree: true }).catch(console.error);

		os.success();
	} catch (err) {
		console.error('MiAuth callback error:', err);
		os.alert({ type: 'error', text: '連携の完了に失敗しました' });
	}
}

onMounted(async () => {
	handleMiAuthCallback();
	loadExtFavEmojis();
	if (isLinked.value) {
		// 既存ユーザー対策: 連携済みなのに同意フラグが立っていない場合は自動で記録
		if (!prefer.s['hataConsent.externalTl']) {
			prefer.commit('hataConsent.externalTl', true);
			prefer.commit('hataConsent.externalTlDate', new Date().toISOString());
			misskeyApi('hata/consent/update', { type: 'externalTl', agree: true }).catch(console.error);
		}
		try {
			extCustomEmojis.value = await getExternalCustomEmojis();
		} catch (e) {
			// ignore
		}
	}
});

definePage({
	title: '外部アカウント連携',
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
