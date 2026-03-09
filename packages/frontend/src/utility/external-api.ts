/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { prefer } from '@/preferences.js';

export interface ExternalAccount {
	host: string;
	token: string;
	userId: string;
	username: string;
}

export interface ExternalCustomEmoji {
	name: string;
	category: string | null;
	url: string;
	aliases: string[];
	localOnly?: boolean;
	isSensitive?: boolean;
}

/**
 * 外部サーバーのアカウント情報を取得
 */
export function getExternalAccount(): ExternalAccount | null {
	if (!prefer.s['external.enabled']) return null;

	const host = prefer.s['external.host'];
	const token = prefer.s['external.token'];
	const userId = prefer.s['external.userId'];
	const username = prefer.s['external.username'];

	if (!host || !token || !userId || !username) return null;

	return { host, token, userId, username };
}

/**
 * 外部サーバーが連携されているかチェック
 */
export function isExternalAccountLinked(): boolean {
	return getExternalAccount() !== null;
}

/**
 * 外部サーバーAPIを呼び出す（JSON）
 */
export async function callExternalApi<T = any>(
	endpoint: string,
	params: Record<string, any> = {},
	account?: ExternalAccount,
): Promise<T> {
	const acc = account ?? getExternalAccount();
	if (!acc) {
		throw new Error('External account not linked');
	}

	const res = await fetch(`https://${acc.host}/api/${endpoint}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			i: acc.token,
			...params,
		}),
	});

	if (!res.ok) {
		const errorText = await res.text();
		throw new Error(`External API error: ${res.status} - ${errorText}`);
	}

	const text = await res.text();
	return text ? JSON.parse(text) : null;
}

/**
 * 外部サーバーAPIを呼び出す（GET, 認証不要）
 */
export async function callExternalApiGet<T = any>(
	endpoint: string,
	host?: string,
): Promise<T> {
	const h = host ?? getExternalAccount()?.host;
	if (!h) {
		throw new Error('External host not available');
	}

	const res = await fetch(`https://${h}/api/${endpoint}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({}),
	});

	if (!res.ok) {
		const errorText = await res.text();
		throw new Error(`External API (GET) error: ${res.status} - ${errorText}`);
	}

	return res.json();
}

// ===== カスタム絵文字キャッシュ =====
let emojiCache: { host: string; emojis: ExternalCustomEmoji[]; fetchedAt: number } | null = null;
let emojiUrlMapCache: { host: string; map: Record<string, string> } | null = null;
const EMOJI_CACHE_TTL = 30 * 60 * 1000; // 30分

/**
 * 外部サーバーのカスタム絵文字一覧を取得（キャッシュ付き）
 * Misskey/Shrimpia の /api/emojis レスポンス形式に対応:
 *   - { emojis: [...] } (標準 Misskey)
 *   - [...] (直接配列)
 *   - { emojis: { name: url, ... } } (オブジェクト形式)
 */
export async function getExternalCustomEmojis(forceRefresh = false): Promise<ExternalCustomEmoji[]> {
	const acc = getExternalAccount();
	if (!acc) return [];

	const now = Date.now();

	if (
		!forceRefresh &&
		emojiCache &&
		emojiCache.host === acc.host &&
		(now - emojiCache.fetchedAt) < EMOJI_CACHE_TTL
	) {
		return emojiCache.emojis;
	}

	try {
		const res = await fetch(`https://${acc.host}/api/emojis`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		});

		if (!res.ok) {
			throw new Error(`emojis API error: ${res.status}`);
		}

		const data = await res.json();
		let emojis: ExternalCustomEmoji[] = [];

		if (Array.isArray(data)) {
			// 直接配列形式
			emojis = data;
		} else if (data && Array.isArray(data.emojis)) {
			// 標準 { emojis: [...] } 形式
			emojis = data.emojis;
		} else if (data && typeof data.emojis === 'object' && data.emojis !== null) {
			// オブジェクト形式 { emojis: { name: url, ... } }
			emojis = Object.entries(data.emojis).map(([name, url]) => ({
				name,
				url: url as string,
				category: null,
				aliases: [],
			}));
		}

		// 絵文字の URL が相対パスの場合は絶対URLに変換
		for (const emoji of emojis) {
			if (emoji.url && !emoji.url.startsWith('http')) {
				emoji.url = `https://${acc.host}${emoji.url.startsWith('/') ? '' : '/'}${emoji.url}`;
			}
		}

		emojiCache = {
			host: acc.host,
			emojis,
			fetchedAt: now,
		};

		// URLマップキャッシュも更新
		emojiUrlMapCache = null;

		console.log(`[external-api] Loaded ${emojis.length} custom emojis from ${acc.host}`);
		return emojis;
	} catch (err) {
		console.error('[external-api] Failed to fetch custom emojis:', err);
		// キャッシュがあれば古くても返す
		if (emojiCache && emojiCache.host === acc.host) {
			return emojiCache.emojis;
		}
		return [];
	}
}

/**
 * 外部サーバーの絵文字名→URL マッピングを取得（キャッシュ付き）
 * MkMfmの emojiUrls に渡すためのマップ
 * エイリアスも含めて登録する
 */
export async function getExternalEmojiUrlMap(): Promise<Record<string, string>> {
	const acc = getExternalAccount();
	if (!acc) return {};

	// キャッシュがあればそのまま返す
	if (emojiUrlMapCache && emojiUrlMapCache.host === acc.host) {
		return emojiUrlMapCache.map;
	}

	const emojis = await getExternalCustomEmojis();
	const map: Record<string, string> = {};
	for (const emoji of emojis) {
		if (emoji.name && emoji.url) {
			map[emoji.name] = emoji.url;
			// エイリアスも登録
			if (emoji.aliases && Array.isArray(emoji.aliases)) {
				for (const alias of emoji.aliases) {
					if (alias && !map[alias]) {
						map[alias] = emoji.url;
					}
				}
			}
		}
	}

	emojiUrlMapCache = { host: acc.host, map };
	return map;
}

/**
 * 外部サーバーの絵文字キャッシュを事前読み込み
 * MkExternalTimeline のマウント時に呼び出し、
 * 個々の MkExternalNote が onMounted で取得する前にキャッシュを温めておく
 */
export async function preloadExternalEmojiMap(): Promise<void> {
	try {
		await getExternalEmojiUrlMap();
	} catch (err) {
		console.error('[external-api] Failed to preload emoji map:', err);
	}
}

/**
 * カスタム絵文字キャッシュをクリア
 */
export function clearExternalEmojiCache(): void {
	emojiCache = null;
	emojiUrlMapCache = null;
}

/**
 * 外部サーバーにファイルをアップロード（multipart/form-data）
 */
export async function uploadFileToExternal(
	file: File | Blob,
	options?: {
		name?: string;
		folderId?: string;
		isSensitive?: boolean;
		force?: boolean;
		comment?: string;
	},
	account?: ExternalAccount,
): Promise<any> {
	const acc = account ?? getExternalAccount();
	if (!acc) {
		throw new Error('External account not linked');
	}

	const formData = new FormData();
	formData.append('i', acc.token);
	formData.append('file', file, options?.name);

	if (options?.name) formData.append('name', options.name);
	if (options?.folderId) formData.append('folderId', options.folderId);
	if (options?.isSensitive !== undefined) formData.append('isSensitive', String(options.isSensitive));
	if (options?.force !== undefined) formData.append('force', String(options.force));
	if (options?.comment) formData.append('comment', options.comment);

	const res = await fetch(`https://${acc.host}/api/drive/files/create`, {
		method: 'POST',
		body: formData,
	});

	if (!res.ok) {
		const errorText = await res.text();
		throw new Error(`External file upload error: ${res.status} - ${errorText}`);
	}

	return res.json();
}

/**
 * 自鯖のドライブファイルを外部サーバーにアップロード
 * ファイルをfetchしてからアップロードする
 */
export async function uploadDriveFileToExternal(
	driveFile: { id: string; url: string; name: string; type: string; isSensitive: boolean; comment?: string | null },
	account?: ExternalAccount,
): Promise<any> {
	// 自鯖のファイルをfetch
	const response = await fetch(driveFile.url);
	if (!response.ok) {
		throw new Error(`Failed to fetch file: ${driveFile.url}`);
	}

	const blob = await response.blob();

	// 外部サーバーにアップロード
	return uploadFileToExternal(blob, {
		name: driveFile.name,
		isSensitive: driveFile.isSensitive,
		comment: driveFile.comment ?? undefined,
	}, account);
}

/**
 * 複数のドライブファイルを外部サーバーにアップロード
 */
export async function uploadDriveFilesToExternal(
	driveFiles: Array<{ id: string; url: string; name: string; type: string; isSensitive: boolean; comment?: string | null }>,
	account?: ExternalAccount,
): Promise<string[]> {
	const uploadedFileIds: string[] = [];

	for (const file of driveFiles) {
		const uploaded = await uploadDriveFileToExternal(file, account);
		uploadedFileIds.push(uploaded.id);
	}

	return uploadedFileIds;
}

/**
 * 外部サーバーにノートを投稿
 */
export async function postToExternal(params: {
	text?: string | null;
	cw?: string | null;
	visibility?: string;
	localOnly?: boolean;
	replyId?: string;
	renoteId?: string;
	fileIds?: string[];
	poll?: any;
}): Promise<{ createdNote: any }> {
	return callExternalApi('notes/create', {
		text: params.text,
		cw: params.cw,
		visibility: params.visibility ?? 'public',
		localOnly: params.localOnly ?? false,
		replyId: params.replyId,
		renoteId: params.renoteId,
		fileIds: params.fileIds,
		poll: params.poll,
	});
}

/**
 * 外部サーバーにリアクションを追加
 */
export async function addExternalReaction(noteId: string, reaction: string): Promise<void> {
	await callExternalApi('notes/reactions/create', {
		noteId,
		reaction,
	});
}

/**
 * 外部サーバーのリアクションを削除
 */
export async function removeExternalReaction(noteId: string): Promise<void> {
	await callExternalApi('notes/reactions/delete', {
		noteId,
	});
}

/**
 * 外部サーバーでリノート
 */
export async function renoteToExternal(noteId: string): Promise<{ createdNote: any }> {
	return callExternalApi('notes/create', {
		renoteId: noteId,
	});
}

// ===== グローバル状態: 外部TL閲覧中フラグ =====
import { ref } from 'vue';

/**
 * 現在外部TL（OHTL/OLTL）を閲覧中かどうか。
 * timeline.vue で set され、os.post() をラップする箇所で参照される。
 */
export const isViewingExternalTL = ref(false);

// ===== 外部TL用 お気に入り絵文字 =====
const EXT_FAV_EMOJIS_KEY = 'externalFavoriteEmojis';

/**
 * 外部TL用お気に入り絵文字リストを取得
 */
export function getExternalFavoriteEmojis(): string[] {
	try {
		const stored = localStorage.getItem(EXT_FAV_EMOJIS_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

/**
 * 外部TL用お気に入り絵文字リストを保存
 */
export function setExternalFavoriteEmojis(emojis: string[]): void {
	localStorage.setItem(EXT_FAV_EMOJIS_KEY, JSON.stringify(emojis));
}

/**
 * お気に入り絵文字を追加（先頭に追加、重複は移動）
 */
export function addExternalFavoriteEmoji(emoji: string): void {
	const list = getExternalFavoriteEmojis().filter(e => e !== emoji);
	list.unshift(emoji);
	// 最大50個まで
	setExternalFavoriteEmojis(list.slice(0, 50));
}

/**
 * お気に入り絵文字を削除
 */
export function removeExternalFavoriteEmoji(emoji: string): void {
	setExternalFavoriteEmojis(getExternalFavoriteEmojis().filter(e => e !== emoji));
}

// ===== 外部TL よく使うリアクション履歴 =====
const EXT_RECENT_REACTIONS_KEY = 'externalRecentReactions';

/**
 * よく使うリアクション履歴を取得
 */
export function getExternalRecentReactions(): string[] {
	try {
		const stored = localStorage.getItem(EXT_RECENT_REACTIONS_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

/**
 * よく使うリアクション履歴に追加（先頭に追加、重複は移動、最大30件）
 */
export function addExternalRecentReaction(reaction: string): void {
	const list = getExternalRecentReactions().filter(e => e !== reaction);
	list.unshift(reaction);
	localStorage.setItem(EXT_RECENT_REACTIONS_KEY, JSON.stringify(list.slice(0, 30)));
}
