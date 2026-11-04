/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Keys } from '@/local-storage.js';
import type { PreferencesManager } from '@/preferences/manager.js';

type Preferences = Pick<PreferencesManager, 'cloudReady' | 'profile' | 's' | 'commit' | 'getMatchedRecordOf'>;
type Storage = {
	getItem: (key: Keys) => string | null;
	setItem: (key: Keys, value: string) => void;
};

function scopeOf(preferences: Preferences): string {
	const scope = preferences.getMatchedRecordOf('welcomeBackToast')[0];
	return JSON.stringify([scope.server ?? null, scope.account ?? null, scope.device ?? null]);
}

/** 歓迎メッセージを一度だけ有効にし、移行後の選択は保持する。 */
export async function migrateWelcomeBackToast(preferences: Preferences, storage: Storage): Promise<void> {
	const profileId = preferences.profile.id;
	const scope = scopeOf(preferences);
	const cloudReady = preferences.cloudReady;
	const stillCurrent = () => preferences.profile.id === profileId
		&& scopeOf(preferences) === scope && preferences.cloudReady === cloudReady;

	await cloudReady;
	if (!stillCurrent()) return;

	// 共有設定は別アカウントでも同じ完了印を使い、再度有効化しない。
	const marker: Keys = `hata_welcome_back_toast_migrated:${JSON.stringify([profileId, scope])}`;
	if (storage.getItem(marker) === '1') return;

	if (!preferences.s.welcomeBackToast) {
		await preferences.commit('welcomeBackToast', true);
	}
	if (!stillCurrent()) return;
	storage.setItem(marker, '1');
}
