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
				<p :class="$style.heroSubtitle">{{ displayServerName }}で使える最新の独自機能をピックアップしてご紹介します。</p>
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

				<!-- メディア（図解） -->
				<div v-if="f.media === 'navbar-active-tab'" :class="$style.cardMedia">
					<div :class="$style.demoNavbar">
						<div :class="[$style.demoTab, $style.demoTabActive]">
							<i class="ti ti-home"></i>
							<span>ホーム</span>
						</div>
						<div :class="$style.demoTab"><i class="ti ti-message"></i></div>
						<div :class="$style.demoTab"><i class="ti ti-bell"></i></div>
						<div :class="$style.demoTab"><i class="ti ti-list"></i></div>
						<div :class="$style.demoTab"><i class="ti ti-antenna"></i></div>
					</div>
					<div :class="$style.demoCaption">アクティブなタブだけアイコン+ラベルを併記</div>
				</div>
				<div v-else-if="f.media === 'misskey-update'" :class="$style.cardMedia">
					<div :class="$style.demoVersionBox">
						<div :class="$style.demoVersionRow">
							<i class="ti ti-package"></i>
							<span :class="$style.demoVersionLabel">本家 Misskey</span>
							<span :class="$style.demoVersionTag">2026.5.1</span>
						</div>
						<div :class="$style.demoVersionArrow">
							<i class="ti ti-arrow-down"></i>
						</div>
						<div :class="$style.demoVersionRow">
							<i class="ti ti-flag"></i>
							<span :class="$style.demoVersionLabel">{{ displayServerName }}</span>
							<span :class="[$style.demoVersionTag, $style.demoVersionTagAccent]">hata-11.3</span>
						</div>
					</div>
				</div>

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
import { instance } from '@/instance.js';
import { instanceName } from '@@/js/config.js';

// 旗鯖fork: 表示用のサーバー名
// 優先順: 管理者が設定した instance.name → 設定ファイル(config)の instanceName
// → ハードコードフォールバック
const displayServerName = computed(() => instance.name || instanceName || 'Hataskey');

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
	{ id: 'update', label: '総合アップデート', icon: 'ti ti-package' },
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
	media?: 'navbar-active-tab' | 'misskey-update';
};

const features: Feature[] = [
	{
		id: 'meal-log',
		category: 'feature',
		version: 'hata-11.3',
		title: 'Hatask に「ごはん記録」を追加',
		desc: 'hatask に、毎日の食事を軽く振り返れる「ごはん」タブを追加しました。朝・昼・夜・間食ごとに「食べれた / 少しだけ / 食べれなかった」の3段階で記録でき、理由やひとことも残せます。カロリー計算や達成率、連続記録のスコア化は一切行わず、3段階はすべて中立に扱います。摂食に悩む方への配慮として、体型・体重・カロリーに触れる選択肢は置いておらず、初回表示時には医療目的ではない旨の免責ダイアログを表示します。サマリーは記録した行為そのものを中立に労うメッセージのみで、判定的な声かけや通知は一切行いません。',
		icon: 'ti ti-bowl',
		theme: 'amber',
		isNew: true,
		highlights: [
			'朝・昼・夜・間食 × 食べれた/少しだけ/食べれなかったの3段階で記録',
			'カロリー計算・達成率・連続記録スコア化は一切なし',
			'体型・体重・カロリーに触れる選択肢は置かない設計',
			'初回表示時に医療目的ではない旨の免責ダイアログを表示',
		],
	},
	{
		id: 'registration-privacy',
		category: 'enhance',
		version: 'hata-11.3',
		title: '登録申請のプライバシー保護を大幅強化',
		desc: '登録申請が拒否されたとき、利用者の個人情報を即座に削除する仕組みを整えました。ID・パスワードは拒否時に即削除、メールアドレスは連続申請の悪用を防ぐため最大90日間だけ保持して自動削除されます。申請フォームにはプライバシーの取り扱いを説明するボックスを追加し、メールアドレスの重複も即座に検出してエラー表示するようになりました。管理者向けには、却下済み申請の個人情報削除状態が一目で分かるバッジと、旧仕様データの一括クリーンアップ機能も追加しています。',
		icon: 'ti ti-shield-lock',
		theme: 'violet',
		isNew: true,
		highlights: [
			'拒否時に ID・パスワードを即座に削除 (メールは90日で自動削除)',
			'メールアドレスの重複・形式不備を申請時にチェック',
			'申請フォームにプライバシーの取り扱い説明ボックスを追加',
			'管理画面で削除状態を色付きバッジで可視化、旧データのクリーンアップ機能も追加',
		],
	},
	{
		id: 'drawing-tool-v24',
		category: 'tool',
		version: 'hata-11.3',
		title: 'お絵描きツールを v2.4 に更新',
		desc: 'お絵描きツールに、地味だけど使いやすさに直結する4つの改善を入れました。ダークモード時のウィンドウの文字が読みづらかった問題を修正し、カラーパレットを少し選びやすくしました。レイヤーの表示/非表示トグルが効いていなかった不具合も修正し、レイヤープレビューは高解像度化してどのレイヤーに何が描かれているかが分かりやすくなりました。',
		icon: 'ti ti-palette',
		theme: 'pink',
		isNew: true,
		highlights: [
			'ダークモード時のウィンドウ文字を読みやすく修正',
			'カラーパレットから色を選びやすく',
			'レイヤーの表示/非表示が機能していなかった不具合を修正',
			'レイヤープレビューを高解像度化',
		],
	},
	{
		id: 'games-unicode-only',
		category: 'game',
		version: 'hata-11.3',
		title: 'Hataskey ゲームの絵文字を Unicode に統一',
		desc: 'つみつみタワー・絵文字たたき・カスタム絵文字シュートの独自ゲーム3種を、Unicode 絵文字のみで動くように刷新しました。これまであった「カスタム絵文字モード / Unicode モード / ミックス」の切り替えを廃止し、どの環境でも同じ見た目で遊べるようになっています。あわせて、絵文字たたきゲームでは、レベル(出現頻度)が上がったときに同じマスに絵文字が重なったり、複数のマスから同時にぴったり同じ瞬間に絵文字が出てしまう不具合も修正しました。',
		icon: 'ti ti-device-gamepad-2',
		theme: 'sky',
		isNew: true,
		highlights: [
			'3種のゲームすべて Unicode 絵文字のみで動作',
			'つみつみタワーの絵文字モード切り替えを廃止 (ランキングは統合に)',
			'絵文字たたきの同時出現・重複出現の不具合を修正',
			'絵文字たたきの「通常 / エンドレス」、絵文字シュートの「ノーマル / デバフ」、つみつみの AI 難易度は維持',
		],
	},
	{
		id: 'note-header-layout',
		category: 'ui',
		version: 'hata-11.3',
		title: 'ノートヘッダーのアカウント名を表示名の横に',
		desc: 'タイムライン上のノートで、これまで表示名の下に縦に並んでいたアカウント名 (@id) を、表示名や各種バッジと同じ横一列に並べるようにしました。「表示名 → バッジ → @id」が1行で読み取れるようになり、ノートヘッダーが少しコンパクトになっています。横幅が足りないときは @id 側が省略される動きはそのままです。',
		icon: 'ti ti-text-recognition',
		theme: 'lavender',
		isNew: true,
		highlights: [
			'表示名・バッジ・@id が横一列に',
			'ノートヘッダーがコンパクトに',
			'横幅不足時は @id が省略され、表示名は最後まで残る',
		],
	},
	{
		id: 'achievement-hatacha',
		category: 'feature',
		version: 'hata-11.3',
		title: '実績「神様コンプレックス (Hataskey)」を追加',
		desc: '名前を hatacha に変更すると解除される実績を追加しました。既存の syuilo (Misskey 開発者) ・ noridev (CherryPick 開発者) と並ぶ、Hataskey 開発者ジョークの3段目です。',
		icon: 'ti ti-trophy',
		theme: 'rose',
		isNew: true,
		highlights: [
			'名前を hatacha に変更すると解除',
			'Misskey / CherryPick / Hataskey の各開発者ジョークが3段揃い',
		],
	},
	{
		id: 'email-no-korean',
		category: 'fix',
		version: 'hata-11.3',
		title: '自動送信メールから韓国語表記を除去',
		desc: 'サーバーから自動で送られる一部のメール (新しいログインがあったときのセキュリティ通知、モデレーター向けの管理通知3通) が、CherryPick の韓国語フォーク由来の名残で「英語 / 日本語 / 韓国語」の3言語併記になっていました。日本語サーバー利用者には不要な韓国語部分を除去し、英語 + 日本語の2言語に統一しています。海外からの不正アクセス時にも警告内容が伝わるよう、英語表記は残しています。',
		icon: 'ti ti-mail',
		theme: 'mint',
		isNew: true,
		highlights: [
			'ログイン通知メール・モデレーター向け管理通知メール 4通が対象',
			'英語 + 日本語の2言語に統一',
			'パスワードリセット等の他メールは元々2言語のみで変更なし',
		],
	},
	{
		id: 'pill-style-tabs',
		category: 'ui',
		version: 'hata-11.3',
		title: '通知やみつけるなど6ページのタブが新デザインに',
		desc: '通知、フォロー申請、チャンネル、お知らせ、みつける、メッセージのページのタブを、ふんわり浮いたボタン型(ピル型)に統一しました。スクロールしても上部に追従するので、タブ切り替えがいつでもしやすくなっています。',
		icon: 'ti ti-layout-grid',
		theme: 'lavender',
		isNew: true,
		highlights: [
			'角丸ボタンの新デザインで6ページのタブを統一',
			'スクロールしても画面上部に追従',
			'背景がふんわり半透明で本文と馴染む',
		],
	},
	{
		id: 'notification-improvements',
		category: 'enhance',
		version: 'hata-11.3',
		title: '通知の見やすさが大幅にアップ',
		desc: '横長のカスタム絵文字が潰れて見えなかった問題を解消、同じ人がたくさんの投稿にリアクションしてくれた時はまとめて1つの通知にして見やすく、通知ページの「新規投稿」タブは廃止してすっきりさせました。',
		icon: 'ti ti-bell',
		theme: 'amber',
		isNew: true,
		highlights: [
			'横長のカスタム絵文字も潰れず綺麗に表示',
			'同じ人からの複数リアクションを1つの通知にまとめ',
			'通知ページの「新規投稿」タブを廃止',
		],
	},
	{
		id: 'hatask-notification-evolution',
		category: 'enhance',
		version: 'hata-11.3',
		title: 'hatask の通知をタップすると該当ページにジャンプ',
		desc: 'カレンダーの予定通知や、きもち記録のリマインド通知に、分かりやすい絵文字アイコンが表示されるようになりました。さらに通知をタップすると、hatask のそのページにすぐ飛べるようになって便利になっています。',
		icon: 'ti ti-heart',
		theme: 'mint',
		isNew: true,
		highlights: [
			'カレンダー通知に 📅 アイコン、きもち記録通知に ♡ アイコン',
			'通知タップでカレンダー/きもちページに直接ジャンプ',
			'hatask の他の機能でも今後同じ仕組みで遷移できるように',
		],
	},
	{
		id: 'hataskey-brand-login',
		category: 'ui',
		version: 'hata-11.3',
		title: 'ブランド名「Hataskey」とログインページのロゴ刷新',
		desc: '旗鯖fork のブランド名を「Hataskey」として正式に位置づけ、ログインページ左上のロゴを2段構成に刷新しました。1段目に「Hataskey」をテーマカラーで大きく、2段目に「A fork of [CherryPickロゴ]」を控えめに配置。背景のシェイプ装飾の上でもしっかり読めるよう、文字に細い縁取りとやわらかい影を加えて視認性を確保しています。',
		icon: 'ti ti-sparkles',
		theme: 'mint',
		isNew: true,
		highlights: [
			'ログインページ左上に Hataskey ブランドロゴを2段構成で表示',
			'1段目「Hataskey」はテーマカラー、2段目「A fork of CherryPick」は控えめ',
			'背景のシェイプ上でも読めるよう、縁取り+やわらか影で視認性を確保',
			'Righteous フォント(SIL OFL 1.1)を同梱して読み込み',
		],
	},
	{
		id: 'about-page-brand-logo',
		category: 'ui',
		version: 'hata-11.3',
		title: 'about-misskey ページのブランドロゴ刷新',
		desc: '「Hataskeyについて」ページの一番上の表示を、ログイン画面と同じ Hataskey ロゴに統一しました。サーバーアイコン未設定時に表示される単色アイコンは、ホーム画面に追加した際のアプリアイコンなどで引き続き使われます。',
		icon: 'ti ti-typography',
		theme: 'lavender',
		isNew: true,
		highlights: ['Righteousフォントとテーマアクセント色のブランド文字ロゴに統一', 'ログインページと一貫したデザイン体験', '@font-face をscope内に追加して about-misskey でも Righteous フォントを利用可能に'],
	},
	{
		id: 'hatasaba-ui-fixed-post-form',
		category: 'fix',
		version: 'hata-11.3',
		title: 'Hatasaba UI で投稿フォーム表示が機能しない問題を修正',
		desc: 'Hatasaba UI で「タイムライン上部に投稿フォームを表示する」設定をONにしても投稿フォームが現れない不具合を修正しました。設定通りに、画面上部に投稿フォームが固定表示されるようになります。',
		icon: 'ti ti-pencil',
		theme: 'sky',
		isNew: true,
		highlights: ['timelineContainer 直下に MkPostForm を挿入', '外部TL(ohtl/oltl)タブでは非表示にする条件を併せて追加', '通常 Misskey UI と同じ挙動に統一'],
	},
	{
		id: 'announcement-i18n-fix',
		category: 'fix',
		version: 'hata-11.3',
		title: 'お知らせページの見出しが空表示になる問題を修正',
		desc: 'お知らせページの「メンテナンス情報」「最新のお知らせ」といったセクション見出しが空っぽに表示される不具合を解消しました。各セクションのタイトルが正しく表示されます。',
		icon: 'ti ti-megaphone',
		theme: 'pink',
		isNew: true,
		highlights: ['maintenance / _announcement.latest / pinned / category系 / pin操作系 を追加', 'メンテナンス選択時の説明文(MkInfo)が正常に表示されるように', '管理者・利用者の両ページで文言欠落が解消'],
	},
	{
		id: 'legacy-icon-migrate',
		category: 'fix',
		version: 'hata-11.3',
		title: '旧 CherryPick アイコンが残存するサーバーの自動修正',
		desc: '以前 CherryPick のキャラクターアイコンをそのままサーバーアイコンとして表示していたサーバーで、サーバー更新時に Hataskey の自動生成アイコンへ切り替わるようになりました。管理者の方が独自に設定したカスタムアイコンには影響しません。',
		icon: 'ti ti-arrow-back-up',
		theme: 'mint',
		isNew: true,
		highlights: ['対象は about-icon.png / cherrypick-icon を URL に含む iconUrl のみ', '管理者の任意設定アイコンは保護される', 'マイグレ後は ホスト名から決定論的に生成される単色SVGが表示される'],
	},
	{
		id: 'misskey-2026.5.4',
		category: 'update',
		version: 'hata-11.3',
		title: 'Misskey 2026.5.4 セキュリティ修正取り込み',
		desc: '本家 Misskey の最新セキュリティ修正5件を取り込みました。連合経由で偽のアクティビティが受け入れられてしまう脆弱性や、ダイレクトメッセージ・お知らせの権限チェック不備、悪意あるテーマで画面が固まる問題などが解消されています。利用者の操作は不要です。',
		icon: 'ti ti-shield-check',
		theme: 'mint',
		isNew: true,
		highlights: [
			'JSON-LD 署名検証の堅牢化 (TOCTOU・特殊キー処理)',
			'ダイレクトメッセージとお知らせの権限チェック追加',
			'テーマ参照の循環・過剰再帰によるフリーズ防止',
			'5件の CVE すべてに対応済み',
		],
		media: 'misskey-update',
	},
	{
		id: 'misskey-2026.5.2-5.3',
		category: 'update',
		version: 'hata-11.3',
		title: 'Misskey 2026.5.2 / 5.3 改善取り込み',
		desc: '最新の絵文字（Unicode 17.0）や、テーマプレビューを試したあと元に戻せるようになる改善などを取り込みました。サーバー側では署名処理が高速化され、ベース表記も Misskey 2026.5.4 へ更新されています。',
		icon: 'ti ti-mood-smile',
		theme: 'sky',
		isNew: true,
		highlights: [
			'Unicode 17.0 の新絵文字に対応 (Fluent Emoji も更新)',
			'テーマのプレビュー時にリロード無しで元のテーマに戻せるように',
			'投稿通知を設定したユーザーをリストで表示できるように',
			'サーバー側で RSA 署名処理を高速化 (slacc / Rust 実装)',
			'リスト編集で自分のアカウントが検索結果に出ない問題などを修正',
		],
		media: 'misskey-update',
	},
	{
		id: 'misskey-2026.5.1',
		category: 'update',
		version: 'hata-11.3',
		title: 'Misskey 2026.5.1 修正取り込み',
		desc: '本家 Misskey 最新版から、通知の遅延・取りこぼしや、管理者向けロール設定画面の動きが改善される修正を取り込みました。フォロワー限定の投稿が通知されない、特定の条件で通知が10秒ほど遅れるといった問題が解消されています。',
		icon: 'ti ti-bug-off',
		theme: 'mint',
		isNew: true,
		highlights: ['ULID環境での通知遅延（約10秒）の解消', 'フォロワー限定投稿でメンションされた人に通知が飛ぶように修正', 'ロール設定画面でアサイン/解除がリロードなしで反映されるように'],
		media: 'misskey-update',
	},
	{
		id: 'search-redesign',
		category: 'ui',
		version: 'hata-11.3',
		title: '検索メニューのデザイン刷新',
		desc: 'タブ切り替えからプルダウン切り替えに変更し、検索バーをカプセル型デザインに刷新しました。PC・タブレットではヘッダ直下、スマホでは画面下部に固定表示されます。',
		icon: 'ti ti-search',
		theme: 'pink',
		isNew: true,
		highlights: ['検索対象 (ノート / ユーザー / イベント) はバー内のプルダウンで切替', 'テーマカラーの検索ボタン + オプションボタンを横並び配置', 'プロフィール画面の🔍ボタンからの検索フローも維持'],
	},
	{
		id: 'announcements-redesign',
		category: 'ui',
		version: 'hata-11.3',
		title: 'お知らせメニューのデザイン刷新 + メンテナンス情報',
		desc: 'お知らせをカテゴリ別 (警告 / 成功 / 情報 / エラー / メンテナンス) で整理表示。最新お知らせとメンテナンス情報をトップでハイライトし、過去のお知らせも同様に分類されます。',
		icon: 'ti ti-speakerphone',
		theme: 'mint',
		isNew: true,
		highlights: ['カテゴリ別の整理表示で目的のお知らせを見つけやすく', 'メンテナンス情報はトップに赤枠で目立つ表示', 'コントロールパネルから「メンテナンス」種別で作成可能 (ピン留め機能は次バージョン予定)'],
	},
	{
		id: 'announcements-pin',
		category: 'feature',
		version: 'hata-11.3',
		title: 'お知らせのピン留め機能',
		desc: '任意のお知らせを📌でピン留めできるようになりました。ピン留めしたお知らせはお知らせメニューのトップ(メンテナンス情報の上)に専用セクションで表示されます。',
		icon: 'ti ti-pin',
		theme: 'pink',
		isNew: true,
		highlights: ['複数件のピン留めに対応', '↑↓ボタンで並び替え可能', 'preferences保存なのでアカウント間で同期', '各お知らせカード右上のピンアイコンで操作', '削除されたお知らせのピン留めは自動でクリーンアップ'],
	},
	{
		id: 'external-emoji-picker-smart',
		category: 'federation',
		version: 'hata-11.3',
		title: '外部TL絵文字ピッカーをスマート化',
		desc: '「最近使った」絵文字が読み込みエラーアイコンになる不具合を解消し、相手サーバーへの API リクエスト量を大幅に削減しました。',
		icon: 'ti ti-mood-smile',
		theme: 'sky',
		isNew: true,
		highlights: ['履歴・お気に入りに絵文字のホスト名と画像URLも保存(別サーバー切替でも復元)', 'ホストごとの絵文字URLマップを永続キャッシュ(24h TTL + 最大10ホストLRU)', '/api/emojis 取得をカスタムタブ開いた時のみに遅延化', '3段階フォールバック解決でAPI呼び出しゼロを最優先', '設定画面に「外部TL絵文字キャッシュをクリア」ボタンを追加'],
	},
	{
		id: 'friendly-ui-removed',
		category: 'fix',
		version: 'hata-11.3',
		title: 'Friendly UI の全面廃止',
		desc: 'ウィンドウサイズの変更や設定操作の拍子で意図せず Friendly UI が表示されてしまう問題への根本対策として、旗鯖fork では Friendly UI を全面廃止しました。',
		icon: 'ti ti-eraser',
		theme: 'pink',
		isNew: true,
		highlights: ['friendly.vue とその関連ファイルを削除', 'main-boot.ts の UI フォールバックを simple に変更', 'localStorage の "friendly" 値を毎boot時に "simple" へ自動クリーンアップ', '設定画面の「Friendly UI」セクション(3項目)を削除', 'isFriendly() は常に false を返すため、参照側コードは安全に dead branch 化'],
	},
	{
		id: 'support-menu-removed',
		category: 'ui',
		version: 'hata-11.3',
		title: 'CherryPick支援メニューをサイドバーから撤去',
		desc: 'サイドバーをスッキリさせるため、支援関連メニューはサーバーアイコンから開く「サーバー情報」ページに集約しました。CherryPick や Misskey 本家への寄付、スポンサー一覧などはこれまで通りアクセスできます。',
		icon: 'ti ti-trash',
		theme: 'pink',
		isNew: true,
		highlights: ['サイドバーから「CherryPickを支援する」項目を撤去', 'store.ts のサイドバーデフォルトから "support" を除外', '既存ユーザー設定からも自動クリーンアップ', '支援への導線は about-misskey に集約'],
	},
	{
		id: 'fix-more-menu-hata-docs',
		category: 'ui',
		version: 'hata-11.3',
		title: '「もっと!」メニュー残留問題を修正',
		desc: 'hata-11.0 で旗鯖機能解説ボタンをサイドバーから「もっと!」/「ヘルプ」内に移設した際、環境によっては「もっと!」メニュー内にボタンが残留してしまう問題がありました。今回の更新で残留したボタンが自動的に除去されます。',
		icon: 'ti ti-eraser',
		theme: 'pink',
		highlights: ['「もっと!」メニュー内の旗鯖機能解説ボタンを自動除去', '保存済みのサイドバー設定からも自動的にクリーンアップ', '旗鯖機能解説ページはヘルプメニュー (?) から引き続きアクセス可能'],
	},
	{
		id: 'misskey-2026.5.0',
		category: 'update',
		version: 'hata-11.2',
		title: 'Misskey 2026.5.0 対応',
		desc: '本家 Misskey から各種バグ修正を取り込みました。連合サーバー経由で届くノートの表示や、公開範囲を絞った通知の挙動、ブロック済みサーバーからの受信処理など、見えにくい部分の安定性が向上しています。',
		icon: 'ti ti-package',
		theme: 'mint',
		highlights: ['本家由来のバグ修正を多数取り込み', 'ActivityPub 連合周りの安定性向上', '管理系ページの表示不具合修正'],
	},
	{
		id: 'navbar-active-tab',
		category: 'ui',
		version: 'hata-11.2',
		title: 'Hatasaba UI 上部ナビバー機能改良',
		desc: '上部ナビバーで現在開いているタブだけ、アイコンとテキストの両方を表示するようになりました。今どの画面を見ているかが、ひと目で分かります。',
		icon: 'ti ti-layout-navbar',
		theme: 'pink',
		highlights: ['アクティブタブのみアイコン+ラベル併記', 'ピル形状で幅可変', '視認性アップ'],
		media: 'navbar-active-tab',
	},
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
		desc: '画面全体の文字フォントを好みのものに切り替えて、自分だけの旗鯖を演出できます。あらかじめ用意された5種類から選ぶこともでき、自分でフォントを指定することもできます。',
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
		desc: '外部TL利用やカスタムフォント表示など、利用にあたって同意が必要な機能をサーバー側でまとめて管理するようになりました。どの機能について同意したかが分かりやすく、いつでも確認・取り消しができます。',
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
		desc: '次々と襲ってくる絵文字の大群を撃ち落とすシューティングゲーム。ウェーブを重ねるごとに難易度が上がり、パワーアップアイテムを集めてハイスコアを目指しましょう！',
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

/* ===== カードメディア（図解） ===== */
.cardMedia {
	margin: 0 -4px 16px;
	padding: 14px 12px 12px;
	background: color-mix(in srgb, var(--cardAccent, var(--MI_THEME-accent)) 6%, transparent);
	border-radius: 14px;
	border: 1px solid color-mix(in srgb, var(--cardAccent, var(--MI_THEME-accent)) 16%, transparent);
}

/* --- 上部ナビバーデモ --- */
.demoNavbar {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	padding: 8px 10px;
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	box-shadow: 0 2px 8px color-mix(in srgb, var(--MI_THEME-fg) 6%, transparent);
}

.demoTab {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	padding: 7px 10px;
	font-size: 0.78em;
	color: color-mix(in srgb, var(--MI_THEME-fg) 60%, transparent);
	border-radius: 100px;
	background: transparent;
	transition: all 0.3s ease;

	> i {
		font-size: 1.1em;
	}
}

.demoTabActive {
	color: var(--cardAccent);
	background: color-mix(in srgb, var(--cardAccent) 14%, transparent);
	font-weight: 600;
	padding-right: 14px;

	> span {
		display: inline;
	}
}

.demoCaption {
	margin-top: 10px;
	text-align: center;
	font-size: 0.75em;
	opacity: 0.7;
	color: var(--MI_THEME-fg);
}

/* --- バージョン更新図 --- */
.demoVersionBox {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 8px;
}

.demoVersionRow {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px 14px;
	background: var(--MI_THEME-panel);
	border-radius: 10px;

	> i {
		font-size: 1.1em;
		color: var(--cardAccent);
		flex-shrink: 0;
	}
}

.demoVersionLabel {
	flex: 1;
	font-size: 0.85em;
	font-weight: 600;
}

.demoVersionTag {
	font-size: 0.78em;
	font-weight: 700;
	font-family: ui-monospace, "SF Mono", Menlo, monospace;
	padding: 3px 10px;
	background: color-mix(in srgb, var(--MI_THEME-fg) 8%, transparent);
	border-radius: 100px;
	letter-spacing: 0.02em;
}

.demoVersionTagAccent {
	background: var(--cardAccent);
	color: #fff;
}

.demoVersionArrow {
	display: flex;
	justify-content: center;
	color: var(--cardAccent);
	font-size: 1.1em;
	opacity: 0.6;
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
