/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ref } from 'vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';

const mutedUserIds = ref<Set<string>>(new Set());
let fetched = false;
let fetchPromise: Promise<void> | null = null;

export async function fetchMutedUsers(): Promise<void> {
	if (!$i) return;
	if (fetched) return;
	if (fetchPromise) return fetchPromise;

	fetchPromise = (async () => {
		try {
			const ids = new Set<string>();
			let untilId: string | undefined;
			// ページネーションで全件取得（最大500件）
			for (let i = 0; i < 5; i++) {
				const res = await misskeyApi('mute/list', {
					limit: 100,
					...(untilId ? { untilId } : {}),
				});
				if (!res || res.length === 0) break;
				for (const m of res) {
					// サーバー管理者・モデレーターはモデレーションのためミュート対象から除外
					if (m.mutee && (m.mutee.isAdmin || m.mutee.isModerator)) continue;
					if (m.muteeId) ids.add(m.muteeId);
				}
				if (res.length < 100) break;
				untilId = res[res.length - 1].id;
			}
			mutedUserIds.value = ids;
			fetched = true;
		} catch {
			// APIエラー時は空のまま
		} finally {
			fetchPromise = null;
		}
	})();

	return fetchPromise;
}

export function isMutedUser(userId: string): boolean {
	return mutedUserIds.value.has(userId);
}

export function invalidateMutedUsers(): void {
	fetched = false;
	mutedUserIds.value = new Set();
}

export { mutedUserIds };
