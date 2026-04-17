<!--
SPDX-FileCopyrightText: hatacha
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 900px; --MI_SPACER-min: 20px;">
		<!-- ヒーローセクション -->
		<div :class="$style.hero">
			<div :class="$style.heroContent">
				<div :class="$style.heroBadge">
					<i class="ti ti-sparkles"></i>
					<span>What's New</span>
				</div>
				<h1 :class="$style.heroTitle">旗鯖に、<wbr/>新しい体験を。</h1>
				<p :class="$style.heroSubtitle">旗池２丁目で使える最新の独自機能をピックアップしてご紹介します。</p>
			</div>
		</div>

		<!-- カテゴリフィルター -->
		<div :class="$style.filterBar">
			<button v-for="cat in categories" :key="cat.id" :class="[$style.filterBtn, activeCat === cat.id && $style.filterBtnOn]" @click="activeCat = cat.id">
				<i :class="cat.icon"></i>
				<span>{{ cat.label }}</span>
			</button>
		</div>

		<!-- 機能カードグリッド -->
		<div :class="$style.featureGrid">
			<article v-for="(f, idx) in filteredFeatures" :key="f.id" :class="$style.featureCard" :style="{ animationDelay: `${idx * 60}ms`, '--cardAccent': themeColor(f.theme) }">
				<div :class="$style.cardHeader">
					<div :class="$style.cardIcon">
						<i :class="f.icon"></i>
					</div>
					<div :class="$style.cardBadges">
						<span :class="$style.versionBadge">{{ f.version }}</span>
						<span v-if="f.isNew" :class="$style.newBadge">NEW</span>
					</div>
				</div>
				<h2 :class="$style.cardTitle">{{ f.title }}</h2>
				<p :class="$style.cardDesc">{{ f.desc }}</p>
				<div v-if="f.highlights && f.highlights.length" :class="$style.cardHighlights">
					<div v-for="(h, i) in f.highlights" :key="i" :class="$style.highlight">
						<i class="ti ti-check"></i>
						<span>{{ h }}</span>
					</div>
				</div>
				<div v-if="f.link" :class="$style.cardFooter">
					<MkA :to="f.link" :class="$style.cardLink">
						<span>{{ f.linkLabel ?? '使ってみる' }}</span>
						<i class="ti ti-arrow-right"></i>
					</MkA>
				</div>
			</article>
		</div>

		<!-- もっと見るリンク -->
		<div :class="$style.moreLinks">
			<MkA to="/hata-docs" :class="$style.moreLink">
				<i class="ti ti-book"></i>
				<div>
					<div :class="$style.moreLinkTitle">すべての機能を見る</div>
					<div :class="$style.moreLinkDesc">旗鯖の機能解説ページへ</div>
				</div>
				<i class="ti ti-chevron-right"></i>
			</MkA>
			<a href="https://home.tolehata.net/changelog" target="_blank" rel="noopener" :class="$style.moreLink">
				<i class="ti ti-history"></i>
				<div>
					<div :class="$style.moreLinkTitle">更新履歴（チェンジログ）</div>
					<div :class="$style.moreLinkDesc">すべてのバージョンの変更点</div>
				</div>
				<i class="ti ti-external-link"></i>
			</a>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { definePage } from '@/page.js';

definePage(() => ({
	title: '旗鯖新機能',
	icon: 'ti ti-sparkles',
}));

const headerActions = computed(() => []);
const headerTabs = computed(() => []);

// カテゴリ
const activeCat = ref('all');
const categories = [
	{ id: 'all', label: 'すべて', icon: 'ti ti-layout-grid' },
	{ id: 'ui', label: 'UI/UX', icon: 'ti ti-palette' },
	{ id: 'game', label: 'ゲーム', icon: 'ti ti-device-gamepad-2' },
	{ id: 'tool', label: '便利ツール', icon: 'ti ti-tools' },
	{ id: 'federation', label: '外部連携', icon: 'ti ti-world' },
];

// 機能一覧（最新版から）
type Feature = {
	id: string;
	category: string;
	version: string;
	title: string;
	desc: string;
	icon: string;
	theme: 'sky' | 'pink' | 'mint' | 'amber' | 'violet' | 'rose';
	isNew?: boolean;
	highlights?: string[];
	link?: string;
	linkLabel?: string;
};

const features: Feature[] = [
	{
		id: 'whats-new',
		category: 'ui',
		version: 'hata-11.1',
		title: '旗鯖新機能ページ',
		desc: '新しく追加された機能をひと目で確認できるページです。このページ自体が新機能！',
		icon: 'ti ti-sparkles',
		theme: 'violet',
		isNew: true,
		highlights: ['カテゴリで絞り込み', '視覚的で楽しい紹介'],
	},
	{
		id: 'bottomsheet',
		category: 'ui',
		version: 'hata-11.1',
		title: 'ボトムシート型ユーザーパネル',
		desc: 'モバイル・タブレットでユーザーアイコンをタップしたときのパネルを、下からスッと出てくる洗練されたボトムシートにリニューアル。',
		icon: 'ti ti-layout-bottombar-expand',
		theme: 'sky',
		isNew: true,
		highlights: ['スムーズなアニメーション', 'スワイプ感あるデザイン', 'スマホ操作に最適化'],
	},
	{
		id: 'font-customize',
		category: 'ui',
		version: 'hata-11.1',
		title: 'UIフォント変更機能',
		desc: '好みのフォントに切り替えて、自分だけの旗鯖を演出。5種類のプリセット + カスタムフォント対応。',
		icon: 'ti ti-typography',
		theme: 'pink',
		isNew: true,
		highlights: ['Zen 角ゴシック / DotGothic16 など5種', '.ttf / .otf / .woff2 アップロード対応', '即時反映'],
		link: '/settings/hata-custom',
		linkLabel: '設定してみる',
	},
	{
		id: 'consent-manager',
		category: 'tool',
		version: 'hata-11.1',
		title: '同意管理システム',
		desc: '外部TL利用やカスタムフォントなどの同意情報をサーバー側で安全に管理。透明性の向上を実現。',
		icon: 'ti ti-shield-check',
		theme: 'mint',
		isNew: true,
		highlights: ['同意履歴の可視化', '管理者向け一覧画面'],
	},
	{
		id: 'external-mfm',
		category: 'federation',
		version: 'hata-11.1',
		title: '外部TLカスタム絵文字対応',
		desc: '外部タイムラインで連合先ユーザーのアカウント名カスタム絵文字が正しく表示されるようになりました。',
		icon: 'ti ti-mood-smile',
		theme: 'amber',
		isNew: true,
		highlights: ['連合先ホストの絵文字自動解決', 'アカウント名のMFM展開'],
	},
	{
		id: 'whack-emoji',
		category: 'game',
		version: 'hata-11.0',
		title: '絵文字叩きゲーム',
		desc: '3×3グリッドに出現する絵文字をタップで撃破！通常モード＆エンドレスモードあり。AI対戦・オンライン対戦にも対応。',
		icon: 'ti ti-target',
		theme: 'rose',
		highlights: ['通常 / エンドレス2モード', 'AI対戦4段階', 'サーバー対戦', 'サーバー内ランキング'],
		link: '/whack-emoji',
		linkLabel: 'プレイする',
	},
	{
		id: 'stacking-tower',
		category: 'game',
		version: 'hata-11.0',
		title: 'つみつみタワー',
		desc: '絵文字を積み上げる物理演算パズル。カスタム絵文字 / Unicode / ミックスの3モードで遊べます。',
		icon: 'ti ti-stack-2',
		theme: 'sky',
		highlights: ['3種類のモード', '物理エンジン搭載', 'AI対戦 & オンライン対戦'],
		link: '/stacking-tower',
		linkLabel: 'プレイする',
	},
	{
		id: 'emoji-shoot',
		category: 'game',
		version: 'hata-11.0',
		title: 'カスタムエモジシュート',
		desc: 'Wave制の絵文字弾幕シューティング。パワーアップアイテムでスコアを伸ばせ！',
		icon: 'ti ti-rocket',
		theme: 'violet',
		highlights: ['長押し連射', '3種のパワーアップ', 'エンドレスWave'],
		link: '/emoji-shoot',
		linkLabel: 'プレイする',
	},
	{
		id: 'hatasaba-ui',
		category: 'ui',
		version: 'hata-10.8',
		title: 'Hatasaba UI',
		desc: '旗鯖オリジナルのUIモード。すりガラス風サイドメニュー、バブルデザイン、カテゴリ別設定など、使いやすさと楽しさを両立。',
		icon: 'ti ti-layout-2',
		theme: 'pink',
		highlights: ['すりガラス風サイドメニュー', '投稿のバブルデザイン', 'ウィジェット縁色'],
	},
	{
		id: 'hatask',
		category: 'tool',
		version: 'hata-10.0',
		title: 'Hatask',
		desc: 'カレンダー・ToDo・気持ち記録・お花育成を統合したオールインワンダッシュボード。端末間同期対応。',
		icon: 'ti ti-eye',
		theme: 'mint',
		highlights: ['カレンダー & RSVP', 'ToDo & 気持ち記録', 'お花育成（125種類以上）', '端末間同期'],
		link: '/hatask',
		linkLabel: '開く',
	},
];

// フィルタリング
const filteredFeatures = computed(() => {
	if (activeCat.value === 'all') return features;
	return features.filter(f => f.category === activeCat.value);
});

// きらめき装飾の位置をランダム化
// カードテーマ色（CSS変数として渡す）
const themeColorMap: Record<string, string> = {
	sky: '#0ea5e9',
	pink: '#ec4899',
	mint: '#10b981',
	amber: '#f59e0b',
	violet: '#8b5cf6',
	rose: '#f43f5e',
};
function themeColor(theme: string): string {
	return themeColorMap[theme] ?? themeColorMap.sky;
}
</script>

<style lang="scss" module>
/* ===== ヒーロー ===== */
.hero {
	position: relative;
	padding: 56px 24px 64px;
	margin-bottom: 32px;
	border-radius: 24px;
	background: linear-gradient(135deg,
		color-mix(in srgb, var(--MI_THEME-accent) 18%, var(--MI_THEME-panel)) 0%,
		color-mix(in srgb, var(--MI_THEME-accent) 6%, var(--MI_THEME-panel)) 100%
	);
	overflow: hidden;
	text-align: center;
}

.heroContent {
	position: relative;
	z-index: 1;
}

.heroBadge {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 6px 14px;
	font-size: 0.8em;
	font-weight: 600;
	color: var(--MI_THEME-accent);
	background: color-mix(in srgb, var(--MI_THEME-accent) 15%, var(--MI_THEME-panel));
	border-radius: 100px;
	margin-bottom: 16px;
}

.heroTitle {
	font-size: 2.2em;
	font-weight: 800;
	line-height: 1.3;
	margin: 0 0 12px;
	letter-spacing: -0.02em;
}

.heroSubtitle {
	font-size: 0.95em;
	opacity: 0.75;
	margin: 0;
	line-height: 1.7;
}

/* ===== フィルターバー ===== */
.filterBar {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	margin-bottom: 24px;
	padding: 4px;
}

.filterBtn {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 8px 16px;
	font-size: 0.9em;
	font-weight: 500;
	color: var(--MI_THEME-fg);
	background: var(--MI_THEME-panel);
	border: 1.5px solid var(--MI_THEME-divider);
	border-radius: 100px;
	cursor: pointer;
	transition: all 0.2s ease;

	&:hover {
		border-color: var(--MI_THEME-accent);
		transform: translateY(-1px);
	}
}

.filterBtnOn {
	color: var(--MI_THEME-fgOnAccent);
	background: var(--MI_THEME-accent);
	border-color: var(--MI_THEME-accent);
}

/* ===== 機能カードグリッド ===== */
.featureGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: 20px;
	margin-bottom: 40px;
}

.featureCard {
	position: relative;
	padding: 24px;
	border-radius: 20px;
	background: var(--MI_THEME-panel);
	border: 1.5px solid var(--MI_THEME-divider);
	transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease;
	overflow: hidden;
	animation: cardFadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;

	&:hover {
		transform: translateY(-4px);
		box-shadow: 0 12px 40px color-mix(in srgb, var(--cardAccent, var(--MI_THEME-accent)) 20%, transparent);
	}

	/* 装飾用背景 */
	&::before {
		content: "";
		position: absolute;
		top: -40px;
		right: -40px;
		width: 120px;
		height: 120px;
		border-radius: 50%;
		background: var(--cardAccent, var(--MI_THEME-accent));
		opacity: 0.08;
		transition: transform 0.5s ease;
	}

	&:hover::before {
		transform: scale(1.3);
	}
}

@keyframes cardFadeIn {
	from { opacity: 0; transform: translateY(20px); }
	to { opacity: 1; transform: translateY(0); }
}

/* カードテーマ色 */
.cardTheme_sky   { --cardAccent: #0ea5e9; }
.cardTheme_pink  { --cardAccent: #ec4899; }
.cardTheme_mint  { --cardAccent: #10b981; }
.cardTheme_amber { --cardAccent: #f59e0b; }
.cardTheme_violet{ --cardAccent: #8b5cf6; }
.cardTheme_rose  { --cardAccent: #f43f5e; }

.cardHeader {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 16px;
}

.cardIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 52px;
	height: 52px;
	font-size: 1.6em;
	color: #fff;
	background: var(--cardAccent, var(--MI_THEME-accent));
	border-radius: 16px;
	box-shadow: 0 6px 16px color-mix(in srgb, var(--cardAccent, var(--MI_THEME-accent)) 40%, transparent);
}

.cardBadges {
	display: flex;
	gap: 6px;
	flex-direction: column;
	align-items: flex-end;
}

.versionBadge {
	font-size: 0.7em;
	font-weight: 600;
	padding: 3px 10px;
	background: color-mix(in srgb, var(--MI_THEME-fg) 8%, transparent);
	border-radius: 100px;
	color: var(--MI_THEME-fg);
	opacity: 0.7;
}

.newBadge {
	font-size: 0.7em;
	font-weight: 800;
	padding: 3px 10px;
	background: var(--cardAccent, var(--MI_THEME-accent));
	color: #fff;
	border-radius: 100px;
	letter-spacing: 0.05em;
	animation: newPulse 2s ease-in-out infinite;
}

@keyframes newPulse {
	0%, 100% { transform: scale(1); }
	50% { transform: scale(1.08); }
}

.cardTitle {
	font-size: 1.2em;
	font-weight: 800;
	margin: 0 0 8px;
	line-height: 1.4;
	letter-spacing: -0.01em;
}

.cardDesc {
	font-size: 0.88em;
	line-height: 1.7;
	opacity: 0.75;
	margin: 0 0 16px;
}

.cardHighlights {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin-bottom: 16px;
}

.highlight {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 0.82em;
	color: var(--MI_THEME-fg);

	> i {
		color: var(--cardAccent, var(--MI_THEME-accent));
		font-size: 0.9em;
		flex-shrink: 0;
	}
}

.cardFooter {
	padding-top: 12px;
	border-top: 1px solid var(--MI_THEME-divider);
}

.cardLink {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-size: 0.88em;
	font-weight: 600;
	color: var(--cardAccent, var(--MI_THEME-accent));
	text-decoration: none;
	transition: gap 0.2s ease;

	&:hover {
		gap: 10px;
	}
}

/* ===== もっと見るリンク ===== */
.moreLinks {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	gap: 12px;
	padding: 24px 0;
	border-top: 1px solid var(--MI_THEME-divider);
}

.moreLink {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 18px 20px;
	background: var(--MI_THEME-panel);
	border: 1.5px solid var(--MI_THEME-divider);
	border-radius: 16px;
	text-decoration: none;
	color: var(--MI_THEME-fg);
	transition: all 0.2s ease;

	&:hover {
		border-color: var(--MI_THEME-accent);
		transform: translateY(-2px);
	}

	> i:first-child {
		font-size: 1.4em;
		color: var(--MI_THEME-accent);
		flex-shrink: 0;
	}

	> i:last-child {
		margin-left: auto;
		opacity: 0.5;
	}

	> div {
		flex: 1;
		min-width: 0;
	}
}

.moreLinkTitle {
	font-size: 0.95em;
	font-weight: 700;
	margin-bottom: 2px;
}

.moreLinkDesc {
	font-size: 0.78em;
	opacity: 0.6;
}

@media (max-width: 500px) {
	.hero { padding: 40px 20px 48px; }
	.heroTitle { font-size: 1.7em; }
	.featureGrid { grid-template-columns: 1fr; gap: 16px; }
	.featureCard { padding: 20px; }
}
</style>
