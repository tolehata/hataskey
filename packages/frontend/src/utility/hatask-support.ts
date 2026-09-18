/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Endpoints } from 'cherrypick-js';

/** Display metadata only. Effective permissions always come from the server. */
export const SUPPORT_POLICIES = [
	{ key: 'driveCapacityMb', name: 'ドライブ容量', icon: 'cloud', type: 'capacity', description: '画像や動画、ファイルを保存できる容量が増えます' },
	{ key: 'canMakePrivateChannel', name: 'プライベートチャンネル', icon: 'lock', type: 'boolean', enabledLabel: '作成できます', disabledLabel: '作成できません', description: '参加者を限定したチャンネルを作成できます' },
	{ key: 'hataSideStudioProfileLimit', name: 'HataSideStudio', icon: 'layout-sidebar-left-expand', type: 'count', unit: '件', description: '保存できるサイドメニューのレイアウトが増えます' },
	{ key: 'favoriteFolderLimit', name: 'お気に入りフォルダ', icon: 'folders', type: 'count', unit: '個', description: 'お気に入りを整理できるフォルダ数が増えます。\n親フォルダと子フォルダを合わせた上限です' },
	{ key: 'canCreateFavoriteSubfolders', name: 'お気に入りの子フォルダ', icon: 'folder-plus', type: 'boolean', enabledLabel: '作成できます', disabledLabel: '作成できません', description: 'お気に入りフォルダの中に子フォルダを作成できます。\n親・子の最大2階層まで整理できます' },
	{ key: 'avatarDecorationLimit', name: 'アバターデコレーション', icon: 'sparkles', type: 'count', unit: '個', description: 'アバターに同時に付けられる飾りが増えます' },
	{ key: 'hatadyBookLimit', name: 'Hatadyの本棚', icon: 'books', type: 'count', unit: '冊', description: '本棚に登録できる本の上限が増えます' },
	{ key: 'canUseHatadySync', name: 'Hatadyの端末間データ同期', icon: 'devices', type: 'boolean', enabledLabel: '同期できます', disabledLabel: '同期できません', description: 'Hatadyの表示設定などを、\n同じアカウントの端末間で共有できます' },
	{ key: 'canUseMascot', name: 'マスコット機能', icon: 'mood-smile', type: 'boolean', enabledLabel: '利用できます', disabledLabel: '利用できません', description: '好きな画像でマスコットを表示し、\n表情やセリフを設定できます' },
	{ key: 'mascotMaxExpressions', name: 'マスコットの最大表情数', icon: 'mood-smile', type: 'count', unit: '表情 / キャラクター', description: '1キャラクターあたりに登録できる、\n通常の表情の上限が増えます' },
	{ key: 'mascotMaxPhrases', name: 'マスコットの最大文言数', icon: 'message-circle', type: 'count', unit: '件 / キャラクター', description: '1キャラクターあたりに登録できる、\n通常のセリフの上限が増えます。表情ごとの上限ではありません' },
	{ key: 'mascotMaxCharacters', name: 'マスコットの最大キャラクター数', icon: 'users', type: 'count', unit: '体', description: '登録して切り替えられる、\nマスコットキャラクターの総数が増えます' },
	{ key: 'canUseHatacordingUi', name: 'HataSNSCordUIの利用', icon: 'layout-grid', type: 'boolean', enabledLabel: '利用できます', disabledLabel: '利用できません', description: 'HataSNSCordUIに切り替えて利用できます' },
	{ key: 'hatacordingUiRateLimit', name: 'HataSNSCordUIの専用レートリミット', icon: 'gauge', type: 'hourly', description: 'HataSNSCordUIからのAPI操作に適用する、1時間あたりの共通枠です。\n投稿だけでなくデータの取得なども数え、一般APIの枠とは別に適用されます' },
	{ key: 'canBypassHatacordingUiRateLimit', name: 'HataSNSCordUIの専用枠の免除', icon: 'shield-check', type: 'boolean', enabledLabel: '専用枠を免除', disabledLabel: '専用枠を適用', description: 'HataSNSCordUI専用の1時間枠だけを免除します。\n一般APIの枠とは別で、API固有の制限や権限確認は維持されます' },
	{ key: 'rateLimitFactor', name: 'APIの利用制限', icon: 'gauge', type: 'rate', description: '一般APIの回数上限・最短間隔が緩和されます。機能ごとの専用制限は別に適用されます' },
] as const;

export type SupportPolicyKey = typeof SUPPORT_POLICIES[number]['key'];
export type SupportPolicyDefinition = typeof SUPPORT_POLICIES[number];

/** Narrow, generated display-only API projection; never grants permissions. */
export type SupportSnapshot = Endpoints['hatask/support/show']['res']['benefits'][number]['current'];

export function supportPolicyDefinition(key: string): SupportPolicyDefinition | undefined {
	return SUPPORT_POLICIES.find(policy => policy.key === key);
}

export function formatSupportSnapshot(key: string, snapshot: SupportSnapshot | null | undefined, _baseline?: SupportSnapshot | null): string {
	const policy = supportPolicyDefinition(key);
	if (!policy || !snapshot) return '未設定';
	if (snapshot.unlimited && policy.type === 'hourly') return '専用の1時間枠を免除';
	if (snapshot.unlimited && policy.type === 'rate') return '一般APIの制限を免除';
	const value = snapshot.value;
	if (policy.type === 'boolean') return typeof value !== 'boolean' ? '未設定' : value ? policy.enabledLabel : policy.disabledLabel;
	if (typeof value !== 'number' || !Number.isFinite(value)) return '未設定';
	if (policy.type === 'capacity') return value >= 1024 ? `${number(value / 1024)} GB` : `${number(value)} MB`;
	if (policy.type === 'hourly') return Number.isInteger(value) && value >= 1 && value <= 1000 ? `${number(value)} 回 / 1時間` : '未設定';
	if (policy.type === 'rate') {
		if (value <= 0) return '一般APIの制限を免除';
		const multiplier = snapshot.rateMultiplier;
		if (multiplier == null || !Number.isFinite(multiplier) || multiplier <= 0) return `設定値 ${number(value)}`;
		return multiplier === 1 ? '標準の制限' : `回数上限 ${number(multiplier)}倍相当`;
	}
	return `${number(value)} ${policy.unit}`;
}

function number(value: number): string {
	return value.toLocaleString('ja-JP', { maximumFractionDigits: 2 });
}

export function supportSnapshotCondition(snapshot: SupportSnapshot | null | undefined): string | null {
	return snapshot?.condition === 'mascotUnavailable' ? 'マスコット機能は利用できません' : snapshot?.condition === 'snsUiUnavailable' ? 'HataSNSCordUIは利用できません' : null;
}

export function supportBenefitHeading(key: string, title: string): readonly string[] {
	const breaks: Partial<Record<SupportPolicyKey, readonly string[]>> = {
		canMakePrivateChannel: ['プライベート', 'チャンネル'],
		favoriteFolderLimit: ['お気に入り', 'フォルダ'],
		canCreateFavoriteSubfolders: ['お気に入りの', '子フォルダ'],
		avatarDecorationLimit: ['アバター', 'デコレーション'],
		mascotMaxPhrases: ['マスコットの', '最大文言数'],
		mascotMaxCharacters: ['マスコットの', '最大キャラクター数'],
	};
	return title === supportPolicyDefinition(key)?.name ? (breaks[key as SupportPolicyKey] ?? [title]) : [title];
}

/** Conservative sizing budget for the existing Japanese and Latin fonts. */
export function supportTextWidthBudget(text: string): number {
	return Array.from(text).reduce((width, char) => width + (/\s/u.test(char) ? 0.45 : char.charCodeAt(0) < 128 ? 0.85 : 1.2), 0.5);
}

export function supportHttpsUrl(value: string | null | undefined): string | null {
	if (!value?.trim()) return null;
	try {
		const parsed = new URL(value);
		return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : null;
	} catch {
		return null;
	}
}

/** Only reveal the tail after three complete cards; retain shadow gutters. */
export function supportDisclosureHeights(gridHeight: number, thirdCardBottom: number, gutter = 32): { expanded: number; collapsed: number } {
	const expanded = Math.max(0, Math.ceil(gridHeight + gutter));
	return { expanded, collapsed: Math.min(expanded, Math.max(0, Math.ceil(thirdCardBottom + gutter)) + 12 + 64) };
}
