/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ref } from 'vue';

const STORAGE_KEY = 'hiddenReactions';

interface HiddenReaction {
	noteId: string;
	reaction: string;
	timestamp: number;
}

/**
 * リアクティブな変更通知用カウンター
 * hide/unhide操作のたびにインクリメントされ、computedの再評価をトリガーする
 */
export const hiddenReactionsVersion = ref(0);

/**
 * 非表示リアクションを取得
 */
export function getHiddenReactions(): HiddenReaction[] {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return [];
		return JSON.parse(stored);
	} catch {
		return [];
	}
}

/**
 * リアクションを非表示に追加
 */
export function hideReaction(noteId: string, reaction: string): void {
	const hidden = getHiddenReactions();
	
	// 既に存在する場合は追加しない
	if (hidden.some(h => h.noteId === noteId && h.reaction === reaction)) {
		return;
	}
	
	hidden.push({
		noteId,
		reaction,
		timestamp: Date.now(),
	});
	
	// 古いデータを削除（30日以上前）
	const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
	const filtered = hidden.filter(h => h.timestamp > thirtyDaysAgo);
	
	localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
	hiddenReactionsVersion.value++;
}

/**
 * リアクションが非表示かチェック
 */
export function isReactionHidden(noteId: string, reaction: string): boolean {
	const hidden = getHiddenReactions();
	return hidden.some(h => h.noteId === noteId && h.reaction === reaction);
}

/**
 * 特定のノートの非表示リアクションを削除
 */
export function unhideReaction(noteId: string, reaction: string): void {
	const hidden = getHiddenReactions();
	const filtered = hidden.filter(h => !(h.noteId === noteId && h.reaction === reaction));
	localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
	hiddenReactionsVersion.value++;
}

/**
 * ノートのリアクションオブジェクトから非表示のものを除外
 */
export function filterHiddenReactions(noteId: string, reactions: Record<string, number>): Record<string, number> {
	const filtered: Record<string, number> = {};
	
	for (const [reaction, count] of Object.entries(reactions)) {
		if (!isReactionHidden(noteId, reaction)) {
			filtered[reaction] = count;
		}
	}
	
	return filtered;
}
