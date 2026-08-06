/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export type HataProfileBadgeUser = {
	id: string;
	host: string | null;
	utageSuccessCount?: number;
	utageInterruptionCount?: number;
	hataskFlowerCount?: number;
	showUtageSuccessCount?: boolean;
	showUtageInterruptionCount?: boolean;
	showHataskFlowerCount?: boolean;
};

export type HataProfileBadge = {
	key: 'utageSuccess' | 'utageInterruption' | 'hataskFlower';
	label: string;
	count: number;
	unit: string;
	icon: string;
	description: string;
};

function isShown(user: HataProfileBadgeUser, currentUserId: string | null, count: number | undefined, setting: boolean | undefined): boolean {
	if (user.host != null) return false;
	if (user.id === currentUserId) return setting !== false;
	return typeof count === 'number';
}

function safeCount(value: number | undefined): number {
	return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function getHataProfileBadges(user: HataProfileBadgeUser, currentUserId: string | null): HataProfileBadge[] {
	const badges: HataProfileBadge[] = [];

	if (isShown(user, currentUserId, user.utageSuccessCount, user.showUtageSuccessCount)) {
		badges.push({
			key: 'utageSuccess',
			label: '宴の成功',
			count: safeCount(user.utageSuccessCount),
			unit: '回',
			icon: 'ti ti-confetti',
			description: '15分間、誰にも反応されずに宴を成功させた回数',
		});
	}

	if (isShown(user, currentUserId, user.utageInterruptionCount, user.showUtageInterruptionCount)) {
		badges.push({
			key: 'utageInterruption',
			label: '宴の阻止',
			count: safeCount(user.utageInterruptionCount),
			unit: '回',
			icon: 'ti ti-shield-x',
			description: 'ほかの人の宴へ反応し、阻止した回数',
		});
	}

	if (isShown(user, currentUserId, user.hataskFlowerCount, user.showHataskFlowerCount)) {
		badges.push({
			key: 'hataskFlower',
			label: '育てたお花',
			count: safeCount(user.hataskFlowerCount),
			unit: '輪',
			icon: 'ti ti-flower',
			description: 'Hatask のお庭で咲かせたお花の数',
		});
	}

	return badges;
}
