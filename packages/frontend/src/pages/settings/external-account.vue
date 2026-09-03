<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<SearchMarker path="/settings/external-account" :label="accountCopy.title" :keywords="externalAccountKeywords" icon="ti ti-link">
	<div class="_gaps_m">
		<FormSection first>
			<template #label><i class="ti ti-link"></i> {{ accountCopy.title }}</template>

			<div class="_gaps_s">
				<MkInfo>
					{{ accountCopy.introduction }}
				</MkInfo>

				<MkSwitch :modelValue="externalEnabled" @update:modelValue="onToggleEnabled">
					<template #label>{{ accountCopy.enable }}</template>
				</MkSwitch>
			</div>
		</FormSection>

		<FormSection v-if="externalEnabled">
			<template #label>{{ accountCopy.linkSection }}</template>

			<div v-if="!isLinked" class="_gaps_s">
				<!-- 接続先選択 -->
				<div style="font-size: 0.9em; opacity: 0.8; margin-bottom: 4px;">
					{{ accountCopy.chooseServer }}
				</div>
				<MkSelect v-model="selectedHost" :items="hostOptions">
					<template #label>{{ accountCopy.destination }}</template>
				</MkSelect>

				<MkButton :disabled="linking || !selectedHost" primary @click="startMiAuth">
					<i class="ti ti-link"></i> {{ linking ? accountCopy.linking : accountCopy.linkAction }}
				</MkButton>
			</div>

			<div v-else class="_gaps_s">
				<MkInfo>
					<i class="ti ti-check"></i> {{ accountCopy.linked }}
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
						<i class="ti ti-unlink"></i> {{ accountCopy.unlink }}
					</MkButton>
				</div>
			</div>
		</FormSection>

		<FormSection v-if="externalEnabled && isLinked">
			<template #label>{{ accountCopy.timelineSettings }}</template>

			<div class="_gaps_s">
				<MkSwitch v-model="enableOHTL">
					<template #label><i class="ti ti-home"></i> {{ accountCopy.showOhtl }}</template>
					<template #caption>{{ accountCopy.ohtlDescription }}</template>
				</MkSwitch>

				<MkSwitch v-model="enableOLTL">
					<template #label><i class="ti ti-planet"></i> {{ accountCopy.showOltl }}</template>
					<template #caption>{{ accountCopy.oltlDescription }}</template>
				</MkSwitch>

				<!-- 旗鯖fork: 外部通知のトースト無効化トグル
				     ONの時、WebSocket接続も行わない(リソース節約、通知バッジ更新も止まる) -->
				<MkSwitch v-model="disableNotificationToast" @update:modelValue="onDisableNotifToastChange">
					<template #label><i class="ti ti-bell-off"></i> {{ accountCopy.disableNotificationPopup }}</template>
					<template #caption>{{ accountCopy.disableNotificationPopupDescription }}</template>
				</MkSwitch>
			</div>
		</FormSection>

		<FormSection v-if="externalEnabled && isLinked">
			<template #label><i class="ti ti-star"></i> {{ accountCopy.favoriteEmojiSection }}</template>
			<div class="_gaps_s">
				<div style="font-size: 0.9em; opacity: 0.8; margin-bottom: 8px;">
					{{ accountCopy.favoriteEmojiDescription }}<br/>
					{{ accountCopy.favoriteEmojiInteraction }}
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
					{{ accountCopy.noFavoriteEmoji }}
				</div>

				<div style="display: flex; gap: 8px; flex-wrap: wrap;">
					<MkButton @click="addExtFavEmojiFromPicker">
						<i class="ti ti-plus"></i> {{ accountCopy.addEmoji }}
					</MkButton>
					<MkButton v-if="extFavEmojis.length > 0" danger @click="clearExtFavEmojis">
						<i class="ti ti-trash"></i> {{ accountCopy.deleteAll }}
					</MkButton>
				</div>
			</div>
		</FormSection>

		<!-- 旗鯖fork: 外部TL絵文字キャッシュの管理 -->
		<FormSection v-if="externalEnabled">
			<template #label><i class="ti ti-photo"></i> {{ accountCopy.emojiCacheSection }}</template>
			<div class="_gaps_s">
				<MkInfo>
					{{ accountCopy.emojiCacheIntroduction }}<br/>
					{{ accountCopy.emojiCachePurpose }}
				</MkInfo>

				<div style="font-size: 0.9em; line-height: 1.6;">
					<b style="display: block; margin-bottom: 4px;">📦 {{ accountCopy.cacheStoredTitle }}</b>
					<ul style="margin: 0 0 8px 1.2em; padding: 0; opacity: 0.85;">
						<li>{{ accountCopy.cacheUrlListBefore }} <b>{{ accountCopy.cacheUrlListName }}</b>{{ accountCopy.cacheUrlListAfter }}</li>
						<li>{{ accountCopy.cacheServerLimitBefore }} <b>{{ accountCopy.cacheServerLimitValue }}</b>{{ accountCopy.cacheServerLimitAfter }}</li>
						<li>{{ accountCopy.cacheDurationBefore }} <b>{{ accountCopy.cacheDurationValue }}</b>{{ accountCopy.cacheDurationAfter }}</li>
					</ul>
					<b style="display: block; margin-bottom: 4px;">🗑️ {{ accountCopy.cacheClearTitle }}</b>
					<ul style="margin: 0 0 8px 1.2em; padding: 0; opacity: 0.85;">
						<li>{{ accountCopy.cacheClearAll }}</li>
						<li>{{ accountCopy.cacheReloadNext }}</li>
					</ul>
					<b style="display: block; margin-bottom: 4px;">💡 {{ accountCopy.cacheUseTitle }}</b>
					<ul style="margin: 0 0 8px 1.2em; padding: 0; opacity: 0.85;">
						<li>{{ accountCopy.cacheUseStale }}</li>
						<li>{{ accountCopy.cacheUseDeleted }}</li>
						<li>{{ accountCopy.cacheUsePrivacy }}</li>
					</ul>
					<div style="opacity: 0.7; margin-top: 8px;">
						<i class="ti ti-info-circle"></i>
						<b>{{ accountCopy.historyKeptTitle }}</b>
						{{ accountCopy.historyKeptDescription }}
					</div>
				</div>

				<div>
					<MkButton danger @click="clearEmojiCache">
						<i class="ti ti-trash"></i> {{ accountCopy.clearCache }}
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
import { getExternalFavoriteEmojis, setExternalFavoriteEmojis, removeExternalFavoriteEmoji, getExternalCustomEmojis, clearExternalEmojiCache, isAllowedExternalHost } from '@/utility/external-api.js';
import type { ExternalCustomEmoji } from '@/utility/external-api.js';
import { i18n } from '@/i18n.js';

const MkExternalReactionPicker = defineAsyncComponent(() => import('@/components/MkExternalReactionPicker.vue'));
const accountCopy = i18n.ts._hata._externalAccount;
const accountCopyx = i18n.tsx._hata._externalAccount;
const externalAccountKeywords = ['external', 'ohtl', 'oltl', 'timeline', accountCopy.searchKeyword];

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
const HATACHI_2 = 'misskey.hatachanoima.net';
// 旗鯖fork: 外部サーバー(旗鯖以外。接続先の規約が適用される)
const LES_REQUIN = 'mi.les-requin.net';
const KIGOTEI = 'ddoskey.com';
const BEARBEAR = 'xiapopisland.top';
const JUICE_SERVER = 'mk-juice.dev';

const hostOptions = computed(() => {
	const options: { value: string; label: string }[] = [];
	const currentHost = hostname;

	// 旗池2丁目（自分自身でなければ追加）
	if (currentHost !== HATACHI_2) {
		options.push({ value: HATACHI_2, label: `旗池2丁目 (${HATACHI_2})` });
	}

	// 旗鯖fork: さめすきーとチョリソリング(外部サーバー。接続先の規約が適用される)
	if (currentHost !== LES_REQUIN) {
		options.push({ value: LES_REQUIN, label: `さめすきーとチョリソリング (${LES_REQUIN})` });
	}

	// 旗鯖fork: 㐂五亭（Sharkey。Misskey互換APIとMiAuthを利用）
	if (currentHost !== KIGOTEI) {
		options.push({ value: KIGOTEI, label: `㐂五亭 (${KIGOTEI})` });
	}

	if (currentHost !== BEARBEAR) {
		options.push({ value: BEARBEAR, label: `BearBear (${BEARBEAR})` });
	}

	if (currentHost !== JUICE_SERVER) {
		options.push({ value: JUICE_SERVER, label: `Juice Server (${JUICE_SERVER})` });
	}

	return options;
});

const selectedHost = ref(hostOptions.value.length > 0 ? hostOptions.value[0].value : '');

// 選択中のホストが旗鯖かどうか
function isHataSaba(host: string): boolean {
	return host === HATACHI_2;
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
	if (!host || !isAllowedExternalHost(host)) return;

	// 接続先に応じた免責事項ポップアップを表示
	if (isHataSaba(host)) {
		// 旗鯖同士の場合
		const { canceled, result } = await os.actions({
			type: 'info',
			title: accountCopy.hataLinkTitle,
			text: accountCopy.hataLinkDescription,
			actions: [
				{ value: 'ok', text: accountCopy.startLink, primary: true },
				{ value: 'cancel', text: accountCopy.cancel },
			],
		});
		if (canceled || result === 'cancel') return;
	} else {
		// 旗鯖以外の外部サーバーの場合
		const { canceled, result } = await os.actions({
			type: 'warning',
			title: accountCopy.externalDisclaimerTitle,
			text: accountCopyx.externalDisclaimer({ host }),
			actions: [
				{ value: 'ok', text: accountCopy.understoodStart, primary: true },
				{ value: 'cancel', text: accountCopy.notNow },
			],
		});
		if (canceled || result === 'cancel') return;
	}

	linking.value = true;

	try {
		const sessionId = genId();
		const callbackUrl = `${window.location.origin}/settings/external-account?miauth=${sessionId}`;
		const permissions = ['read:account', 'read:following', 'write:notes', 'write:reactions', 'read:notifications'].join(',');

		const miAuthUrl = `https://${host}/miauth/${sessionId}?name=${encodeURIComponent(accountCopy.miAuthApplicationName)}&callback=${encodeURIComponent(callbackUrl)}&permission=${permissions}`;

		localStorage.setItem('miauth_session', sessionId);
		localStorage.setItem('miauth_host', host);

		externalHost.value = host;
		window.location.href = miAuthUrl;
	} catch (err) {
		console.error('MiAuth error:', err);
		os.alert({ type: 'error', text: accountCopy.startFailed });
		linking.value = false;
	}
}

async function unlinkAccount() {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: accountCopy.unlinkConfirm,
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
		title: accountCopy.clearCacheConfirmTitle,
		text: accountCopy.clearCacheConfirmText,
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

	if (!savedSession || !savedHost || sessionParam !== savedSession || !isAllowedExternalHost(savedHost)) {
		console.error('Invalid MiAuth session');
		localStorage.removeItem('miauth_session');
		localStorage.removeItem('miauth_host');
		return;
	}

	url.searchParams.delete('miauth');
	window.history.replaceState({}, '', url.toString());

	try {
		const res = await window.fetch(`https://${savedHost}/api/miauth/${savedSession}/check`, {
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
		os.alert({ type: 'error', text: accountCopy.completeFailed });
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
	title: accountCopy.title,
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
