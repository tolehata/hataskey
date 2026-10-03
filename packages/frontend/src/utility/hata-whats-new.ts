/* SPDX-License-Identifier: AGPL-3.0-only */
// The version remains aligned with package.json; boot records it only on close.
import type { HataskPlannerTheme } from '@/components/hatask/hatask-planner-types.js';
export type HataWhatsNewCard = { id: string; label: string; icon: string; title: string; preview?: 'note-actions' | 'emoji-changes'; text?: string[]; points?: string[]; link?: { label: string; url: string } };
export type HataWhatsNewGroup = { label: string; title: string; feature?: 'hatagoes' | 'ui-s' | 'ui-s-2' | 'recipes' | 'flowers'; scene?: 0 | 1 | 2 | 3; cards: HataWhatsNewCard[] };
export type HataWhatsNewStory = HataWhatsNewGroup & { id: string };
export const HATA_WHATS_NEW: { version: string; groups: HataWhatsNewGroup[] } = {
	version: '2026.10.0-hata.12.8.2',
	groups: [
		{
			label: 'HataGoes', title: '三つが、ひとつに。そして、進む。', feature: 'hatagoes', cards: [
				{ id: 'hatagoes-motion', label: 'HataGoes', icon: 'ti ti-player-play', title: 'HataGoes' },
			],
		},
		{
			label: 'リリースノート', title: '詳細はリリースノートをご確認ください', cards: [
				{ id: 'release-notes', label: 'リリースノート', icon: 'ti ti-notes', title: '詳細はリリースノートをご確認ください', link: { label: 'リリースノートを開く', url: 'https://github.com/tolehata/hataskey/blob/master/HATA-CHANGELOG.md#hata-1282' } },
			],
		},
	] satisfies HataWhatsNewGroup[],
};
export const HATA_WHATS_NEW_THEMES: { id: HataskPlannerTheme; name: string; description: string }[] = [
	{
		'id': 'akatsuki',
		'name': '暁',
		'description': '朝焼けのグラデーションと、軽やかな3ペイン',
	},
	{
		'id': 'koke',
		'name': '苔',
		'description': '苔の緑と、やわらかな光',
	},
	{
		'id': 'kisetsu',
		'name': '季',
		'description': '生成りの紙、明朝、静かな罫線',
	},
	{
		'id': 'kashin',
		'name': '花信',
		'description': '丸い輪郭、コーラルと黄の差し色',
	},
	{
		'id': 'suri',
		'name': '刷',
		'description': '紙とインク、青とピンク、くっきりした輪郭',
	},
	{
		'id': 'hatakyu',
		'name': 'ハタキュ',
		'description': 'ハタキュのイラスト、コルク、クリーム色の紙',
	},
];
export function getHataWhatsNewStories(_bodyHeight: number): HataWhatsNewStory[] {
	return HATA_WHATS_NEW.groups.map(group => ({ ...group, id: group.cards[0].id }));
}
export function getHataWhatsNewDisplayVersion(version: string): string {
	const match = version.match(/-hata\.(\d+(?:\.\d+)+)$/);
	return match == null ? version : `hata-${match[1]}`;
}
