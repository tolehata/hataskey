<template>
<PageWithHeader>
<div class="htk-docs-root" :data-mode="themeMode" ref="rootEl">
	<div class="htk-docs-bg"><div class="htk-docs-orb a"></div><div class="htk-docs-orb b"></div></div>
	<div class="htk-docs-content">
		<h1 class="htk-docs-title"><i class="ti ti-book"></i> 旗池2丁目 機能解説</h1>

		<div class="htk-docs-search">
			<input class="htk-docs-inp" v-model="searchQuery" placeholder="機能を検索...">
		</div>

		<div class="htk-docs-cats">
			<button :class="['htk-docs-cat',!activeCat&&'on']" @click="activeCat=''">すべて</button>
			<button v-for="c in categories" :key="c.id" :class="['htk-docs-cat',activeCat===c.id&&'on']" @click="activeCat=activeCat===c.id?'':c.id">
				<i :class="c.iconClass"></i> {{c.label}}
			</button>
		</div>

		<div v-for="cat in filteredCategories" :key="cat.id">
			<div v-if="cat.docs.length" class="htk-docs-cat-hdr"><i :class="cat.iconClass"></i> {{cat.label}}</div>
			<div v-for="doc in cat.docs" :key="doc.title" class="htk-docs-card" @click="toggleDoc(doc.title)">
				<div class="htk-docs-card-hdr">
					<i :class="doc.iconClass"></i>
					<span class="htk-docs-card-title">{{doc.title}}</span>
					<span class="htk-docs-chev"><i :class="openDoc===doc.title?'ti ti-chevron-up':'ti ti-chevron-down'"></i></span>
				</div>
				<div v-if="openDoc===doc.title" class="htk-docs-card-body" @click.stop>
					<div v-html="doc.body"></div>
					<div v-if="doc.tips&&doc.tips.length" class="htk-docs-tips">
						<div class="htk-docs-tips-h"><i class="ti ti-bulb"></i> ヒント</div>
						<ul><li v-for="(t,i) in doc.tips" :key="i">{{t}}</li></ul>
					</div>
					<a v-if="doc.link" :href="doc.link.startsWith('http')?doc.link:undefined" @click.prevent="navigateLink(doc.link)" class="htk-docs-link">{{doc.linkLabel||'設定を開く'}} →</a>
				</div>
			</div>
		</div>

		<div class="htk-docs-footer">
			※ここでは旗池2丁目独自の機能のみを記載しています。CherryPick / Misskey 本体の機能については公式ドキュメントをご参照ください。
		</div>
	</div>
</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { definePage } from '@/page.js';
import { mainRouter } from '@/router.js';

definePage({ title: '旗鯖機能解説' });

const searchQuery = ref('');
const activeCat = ref('');
const openDoc = ref('');

function toggleDoc(title: string) { openDoc.value = openDoc.value === title ? '' : title; }

function navigateLink(link: string) {
	if (link.startsWith('http')) {
		window.open(link, '_blank');
	} else {
		mainRouter.push(link as Parameters<typeof mainRouter.push>[0]);
	}
}

// Detect theme
const themeMode = computed(() => {
	const cs = window.getComputedStyle(document.documentElement);
	const bg = cs.getPropertyValue('--MI_THEME-bg').trim() || '';
	const m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
	if (m) return (parseInt(m[1])*299+parseInt(m[2])*587+parseInt(m[3])*114)/1000<128?'dark':'light';
	return 'dark';
});

const categories = [
	{
		id: 'hatask', iconClass: 'ti ti-layout-dashboard', label: 'Hatask',
		docs: [
			{ iconClass: 'ti ti-layout-dashboard', title: 'Hataskとは', body: '予定、やること、気分、食事、お花など、毎日の記録を一か所にまとめられるツールです。<br><br>画面上部の項目を選ぶか左右に動かして、使いたい機能へ切り替えられます。', tips: ['見た目や暗い配色への切り替えは設定から変更できます'], link: '/hatask', linkLabel: 'Hataskを開く' },
			{ iconClass: 'ti ti-calendar', title: 'カレンダー・出欠確認', body: '月ごとの予定を見たり、新しい予定を登録したりできます。一覧表示へ切り替え、日・週・月ごとに確認することもできます。<br><br>予定を公開して参加確認を有効にすると、ほかの利用者が「行く・検討中・辞退」で回答できます。主催者は回答状況と締め切りを確認できます。', tips: ['複数日にまたがる予定も作れます', '予定のお知らせ時刻を選べます'], link: '/hatask', linkLabel: 'カレンダーを開く' },
			{ iconClass: 'ti ti-checkbox', title: 'やることリスト', body: 'やることの追加・完了・編集・削除ができます。期限やフォルダーを設定し、作成日や期限順で並べて確認できます。', tips: ['期限を過ぎた項目は赤く表示されます', '項目が増えるとページを分けて表示します'], link: '/hatask', linkLabel: 'やることリストを開く' },
			{ iconClass: 'ti ti-mood-smile', title: 'きもち記録', body: 'その日の気分を5段階で記録し、最近の傾向を振り返れます。過去7日間の平均や、記録した時間帯ごとの傾向も確認できます。', tips: ['過去の記録はあとから編集・削除できます', '記録を促すお知らせも設定できます'], link: '/hatask', linkLabel: 'きもち記録を開く' },
			{ iconClass: 'ti ti-bowl', title: 'ごはん記録', body: '朝・昼・夜・間食について「食べられた・少しだけ・食べられなかった」から選び、必要なら理由や短いメモを残せます。<br><br>量やカロリーを計算したり、結果に点数を付けたりはしません。どの状態も責めず、穏やかに振り返るための機能です。', tips: ['体調の不安が続くときは医療機関へご相談ください', '右上の「!」から説明を読み返せます'], link: '/hatask', linkLabel: 'ごはん記録を開く' },
			{ iconClass: 'ti ti-plant', title: 'お庭（お花育成）', body: '旗鯖を使っている時間に応じて、お花が少しずつ育ちます。咲いた花には名前を付けられ、これまでのお花の一覧に加わります。<br><br>ホームのウィジェットでも、育成中の花の進み具合と咲いた花をコンパクトに確認できます。', tips: ['育て終えた花の名前はあとから変更できます', '珍しい花や少し変わった品も登場します'], link: '/hatask', linkLabel: 'お庭を開く' },
			{ iconClass: 'ti ti-eye', title: 'Hatask Eye', body: '旗鯖の利用状況をもとに、ひとことメッセージを表示します。Hataskのホームにも置け、選ぶと詳しい画面へ移動します。', link: '/hatask', linkLabel: 'Hatask Eyeを開く' },
			{ iconClass: 'ti ti-palette', title: 'Hataskの見た目', body: '落ち着いた「季」、明るいカード調の「花信」、紙もの風の「刷」から見た目を選べます。見た目を変えても、予定や記録はそのまま残ります。', tips: ['初回の案内または旗鯖独自設定から変更できます'], link: '/settings/hata-custom', linkLabel: 'Hataskの設定を開く' },
		],
	},
	{
		id: 'hatady', iconClass: 'ti ti-book-2', label: 'Hatady（学習・読書記録）',
		docs: [
			{ iconClass: 'ti ti-book-2', title: 'Hatadyとは', body: '勉強や読書を自分のペースで記録する場所です。「マイログ」「みんなの学習」「本棚」から、記録を残したり公開された学びを読んだり、本を整理したりできます。', tips: ['記録ごとに公開する相手を選べます', '自分だけの記録としても使えます'], link: '/hatady', linkLabel: 'Hatadyを開く' },
			{ iconClass: 'ti ti-notebook', title: '学習記録と本棚', body: '題材、科目、かかった時間、短いメモを残せます。読書ではページ数や進み具合も記録できます。<br><br>本棚は「読書中・読み終えた・積読・読みたい」に分け、追加日や名前などで並べられます。', tips: ['記録はあとから編集できます'] },
			{ iconClass: 'ti ti-bookmark', title: 'しおり・メモ・学習題材', body: '本の気になったページにしおりとメモを残せます。学習題材を登録すると、同じ題材の記録をあとから探しやすくなります。' },
			{ iconClass: 'ti ti-chart-line', title: '目標と振り返り', body: '学習時間、記録数、読んだ本の数、続けた日数をまとめて確認できます。日ごとの活動や科目ごとの時間も見られるため、無理のない目標づくりに使えます。', tips: ['続けた日数は競争ではなく振り返りの目安です'] },
			{ iconClass: 'ti ti-users', title: 'みんなの学習', body: '公開された学習記録を、新しい順・注目順・フォロー中に分けて読めます。気になる記録にはリアクションやコメントを送れます。', tips: ['非公開の記録はほかの人に表示されません'] },
			{ iconClass: 'ti ti-settings', title: '見た目・言語・書き出し', body: '3種類の見た目と、日本語・英語・自動の表示言語を選べます。これまでの記録は文章ファイルとして手元に保存できます。', link: '/settings/hata-custom', linkLabel: 'Hatadyの設定を開く' },
		],
	},
	{
		id: 'external', iconClass: 'ti ti-link', label: '外部アカウント連携',
		docs: [
			{ iconClass: 'ti ti-link', title: '外部アカウント連携とは', body: '別の旗鯖アカウントや「さめすきーとチョリソリング」のアカウントを今見ている旗鯖へつなぎ、接続先の投稿を読んだり、投稿・返信・リアクション・リノートをしたりできます。<br><br>連携時は接続先の確認画面で許可する内容を確かめます。接続先の利用規約も事前にご確認ください。', tips: ['旗池3丁目とシュリンピアへの連携は終了しました', '以前この2サーバーを利用していた場合、更新時にログイン情報と絵文字の一時保存データを削除します'], link: '/settings/external-account', linkLabel: '連携設定を開く' },
			{ iconClass: 'ti ti-device-tv', title: '外部の投稿を見る', body: '連携先でフォローしている人の投稿と、連携先全体の公開投稿を別々に表示できます。HatasabaUIでは「＋H」「＋L」から切り替えられます。', tips: ['表示する項目は連携設定で個別に切り替えられます'], link: '/settings/external-account', linkLabel: '連携設定を開く' },
			{ iconClass: 'ti ti-star', title: 'お気に入りのリアクション絵文字', body: '外部の投稿でよく使う絵文字をお気に入りへ入れると、絵文字を選ぶ画面の先頭からすぐ使えます。', link: '/settings/external-account', linkLabel: 'お気に入り絵文字を管理' },
			{ iconClass: 'ti ti-bell-ringing', title: '外部アカウントの通知', body: '連携先で届いた通知を旗鯖でも受け取れます。新しい通知は画面の端に表示され、専用ページでまとめて確認できます。', link: '/my/external-notifications', linkLabel: '外部通知を開く' },
		],
	},
	{
		id: 'ui', iconClass: 'ti ti-palette', label: '画面・見た目',
		docs: [
			{ iconClass: 'ti ti-device-mobile', title: '画面の種類を選ぶ', body: '標準の画面、旗鯖独自のHatasabaUI、複数の列を並べるデッキ画面から選べます。HatasabaUIはスマートフォンでも操作しやすい構成です。', link: '/settings/hata-custom', linkLabel: '画面の設定を開く' },
			{ iconClass: 'ti ti-layout-list', title: 'HatasabaUI', body: '投稿を見ることを中心にした旗鯖独自の画面です。上部の項目や左右スワイプで、ホーム・ローカル・グローバルなどを切り替えられます。スワイプで切り替えたくない場合は設定で止められます。<br><br>HatasabaUI 2の見た目もこの画面に統合されており、カードをすりガラス風にするか、透け具合をどの程度にするかを選べます。通常表示とデッキ表示の両方に反映されます。', tips: ['パソコンでは上部メニューと左メニューを選べます', '設定用の小窓を開いたまま見た目を確かめられます'], link: '/settings/hata-custom', linkLabel: 'HatasabaUIの設定を開く' },
			{ iconClass: 'ti ti-columns', title: 'HatasabaUIのデッキ表示', body: 'パソコンでは、ホーム、ローカル、通知、リスト、チャンネル、クリップ、お気に入りなどを複数の列に並べられます。列ごとに内容を更新でき、チャンネルの列からそのチャンネルへ直接投稿できます。', tips: ['投稿一覧が広がりすぎないよう、列の中だけで表示します'] },
			{ iconClass: 'ti ti-movie', title: '新しい投稿が現れる動き', body: '新しい投稿が表示される方向を、上・左・右・毎回ランダムから選べます。動きが気になる場合は、端末の「視差効果を減らす」設定も利用できます。', link: '/settings/hata-custom', linkLabel: '動きの設定を開く' },
			{ iconClass: 'ti ti-eye-off', title: 'リアクション絵文字の非表示', body: '見たくないリアクション絵文字を個別に隠せます。パソコンでは絵文字を右クリック、スマートフォンでは投稿の「…」メニューから設定できます。ミュートした人が付けたリアクションをまとめて隠すこともできます。', link: '/settings/hata-custom', linkLabel: '表示を管理する' },
			{ iconClass: 'ti ti-robot', title: 'Bot投稿の非表示', body: '自動投稿を行うBotアカウントの投稿を、タイムラインから隠せます。表示を許可する例外も選べますが、候補にはBotアカウントだけが表示され、通常アカウントは追加できません。<br><br>通常の人がBotの投稿をリノートした場合も隠し、Botが通常の人の投稿をリノートした場合は元の投稿を表示します。', tips: ['通知画面や投稿単体の画面では隠しません'], link: '/settings/hata-custom', linkLabel: 'Bot表示を設定する' },
			{ iconClass: 'ti ti-cloud-rain', title: '天気の背景演出', body: '投稿に雨・雪・晴れ・風・夜のあいさつなどの言葉があると、背景に控えめな演出を表示できます。雨粒、日差し、葉、流れ星などが画面に現れます。<br><br>強い点滅や雷のような演出は使いません。初期状態では無効で、動きが苦手な場合はいつでも止められます。', tips: ['演出を表示する長さも選べます', '体調に違和感があればすぐに無効にしてください'], link: '/settings/hata-custom', linkLabel: '背景演出を設定する' },
		],
	},
	{
		id: 'tools', iconClass: 'ti ti-tool', label: '便利なツール',
		docs: [
			{ iconClass: 'ti ti-brush', title: 'お絵かきツール', body: '旗鯖の画面内で絵を描けます。線の太さ・色・透明さを変え、複数の層に分けて描いたり、直前の操作を取り消したりできます。スマートフォンの指操作にも対応しています。', tips: ['投稿フォームのお絵かきボタンから開くと、描いた絵をそのまま添付できます'] },
			{ iconClass: 'ti ti-id', title: 'HATA CARD MAKER（会員証）', body: '旗池2丁目の会員証風画像を作れる外部ツールです。旗鯖のアカウントで許可すると、利用者名や登録日をもとにカードを作ります。', tips: ['完成した画像は保存できます'], link: 'https://hatacardcreate.tolehata.net/', linkLabel: '会員証を作る' },
			{ iconClass: 'ti ti-mood-search', title: 'HATAlyze（ハタライズ）', body: '自分の公開投稿から、よく使う言葉、投稿する時間帯、文章の長さ、気分の傾向などを振り返る外部ツールです。結果は娯楽としてお楽しみください。医療的な判断には使えません。', tips: ['結果は共有用の画像として保存できます', '取得した投稿を分析結果以外の目的で保存しません'], link: 'https://kanjo-bunseki.tolehata.net/', linkLabel: 'HATAlyzeを開く' },
			{ iconClass: 'ti ti-door', title: '旗鯖ポータル', body: '旗鯖の各種ツール、絵文字申請、ガイドラインなどへの入口をまとめたページです。' },
		],
	},
	{
		id: 'posting', iconClass: 'ti ti-pencil', label: '投稿・チャンネル',
		docs: [
			{ iconClass: 'ti ti-brush', title: '投稿フォームのお絵かきボタン', body: '投稿を書く画面からお絵かきツールを開き、描いた絵をそのまま添付できます。ボタンが不要な場合は旗鯖独自設定で隠せます。', link: '/settings/hata-custom', linkLabel: '表示を設定する' },
			{ iconClass: 'ti ti-palette', title: '投稿範囲ごとの枠色', body: '公開、ホーム、フォロワー、ダイレクトのどこへ投稿するかに応じて、投稿フォームの枠色を変えられます。投稿先の選び間違いに気づきやすくするための機能で、色は自分で選べます。', link: '/settings/hata-custom', linkLabel: '枠色を設定する' },
			{ iconClass: 'ti ti-lock', title: 'プライベートチャンネル', body: '招待されたメンバーだけが内容を見られるチャンネルです。作成者と副管理者はメンバーを追加・除外でき、追加や除外は本人へ通知されます。あいことばを使って参加する方法もあります。<br><br>内容が外へ出ないよう、チャンネル外へのリノートや引用はできません。一度プライベートにしたチャンネルは公開へ戻せません。', tips: ['作成には管理者から付与された権限が必要です', '参加していない人には投稿内容を表示しません'], link: '/channels', linkLabel: 'チャンネルを開く' },
			{ iconClass: 'ti ti-confetti', title: '宴（うたげ）チャレンジ', body: '「宴」「うたげ」「utage」を含む投稿をローカルへ出すと、15分間のチャレンジが始まります。誰からも反応されずに逃げ切ると成功、途中でリアクション・返信・リノートを受けると失敗です。', tips: ['初回に遊び方を表示します', '成功回数はプロフィールで確認できます'] },
		],
	},
	{
		id: 'games', iconClass: 'ti ti-device-gamepad-2', label: 'ゲーム',
		docs: [
			{ iconClass: 'ti ti-device-gamepad-2', title: 'Hataskey Gamesとは', body: '旗鯖のゲームをまとめたページです。各ゲームへの入口があり、対応するゲームでは記録をほかの利用者と比べられます。', link: '/games', linkLabel: 'ゲーム一覧を開く' },
			{ iconClass: 'ti ti-flower', title: '花常（はなつね）', body: '花を並べて消すパズルと、花屋を舞台にした物語を楽しむゲームです。12か月の物語、町の人の投稿、たのみごと、花手帖、期間限定イベントがあります。', tips: ['音量や環境音はゲーム内で調整できます', '使用素材のクレジットもゲーム内で確認できます'], link: '/hanaawase', linkLabel: '花常へ' },
			{ iconClass: 'ti ti-building', title: 'つみつみタワー', body: '絵文字を積み上げて高さを競うゲームです。一人で遊ぶほか、強さを選んでコンピューターとも対戦できます。', link: '/stacking-game', linkLabel: 'つみつみタワーで遊ぶ' },
			{ iconClass: 'ti ti-hammer', title: '絵文字叩きゲーム', body: '次々に現れる絵文字を時間内に叩くゲームです。時間内の得点を競う遊び方、押しそびれるまで続く遊び方、コンピューターとの対戦があります。', link: '/whack-emoji', linkLabel: '絵文字叩きで遊ぶ' },
			{ iconClass: 'ti ti-rocket', title: 'カスタムエモジシュート', body: '迫ってくる絵文字を撃ち落とすゲームです。進むほど相手が増え、通常とは違う不利な条件が付く遊び方も選べます。', link: '/emoji-shoot', linkLabel: 'エモジシュートで遊ぶ' },
		],
	},
	{
		id: 'other', iconClass: 'ti ti-dots', label: 'その他',
		docs: [
			{ iconClass: 'ti ti-news', title: '更新内容の案内', body: '新しい版へ更新したあと、ログインして最初に旗鯖を開いたときに、主な新機能と変更点をまとめた案内が一度表示されます。<br><br>閉じたあとに読み返すときは、「もっと！」を開き、「ヘルプ」内の「直近の更新内容」を選んでください。', tips: ['案内の各ボタンから、紹介している機能へ直接移動できます'] },
			{ iconClass: 'ti ti-calendar-stats', title: 'ログイン日数・実績', body: '旗鯖へログインした日数や、次の節目までの日数をHataskのホームで確認できます。', link: '/hatask', linkLabel: 'Hataskを開く' },
			{ iconClass: 'ti ti-search', title: 'Hatask内検索', body: 'Hataskの検索ボタンから、予定、やること、きもち記録などをまとめて探せます。' },
			{ iconClass: 'ti ti-school', title: 'Hataskの初回案内', body: 'Hataskを初めて開いたとき、画面の主な場所を順番に案内します。設定からいつでも再表示できます。', link: '/settings/hata-custom', linkLabel: 'Hataskの設定を開く' },
			{ iconClass: 'ti ti-speakerphone', title: 'お知らせの絞り込み', body: 'お知らせを「現在・過去」や、情報・警告・完了・メンテナンスなどの種類で絞り込めます。メンテナンスのお知らせは見落とさないよう常に表示します。', link: '/announcements', linkLabel: 'お知らせを開く' },
		],
	},
	{
		id: 'mascot', iconClass: 'ti ti-mood-happy', label: 'マスコット',
		docs: [
			{ iconClass: 'ti ti-mood-happy', title: 'マスコット機能とは', body: '好きなキャラクター画像を画面に表示し、表情やセリフを設定できます。複数のキャラクターを登録して切り替えられます。', tips: ['画像はドライブから選べます', '利用には管理者から付与された権限が必要な場合があります'], link: '/mascot', linkLabel: 'マスコット設定を開く' },
			{ iconClass: 'ti ti-drag-drop', title: '画面上での表示', body: 'マスコットを好きな位置へ動かし、最小化、左右反転、透明さ、ぼかしを調整できます。位置は次回も引き継がれます。' },
			{ iconClass: 'ti ti-mood-smile', title: '表情とセリフ', body: '複数の表情と、それぞれに合うセリフを登録できます。表情には、跳ねる・揺れる・回るなどの動きも付けられます。吹き出しの位置、大きさ、向き、文字色も選べます。' },
			{ iconClass: 'ti ti-refresh', title: '表情とセリフの自動切り替え', body: '表示中の表情やセリフを、5秒から30分までの間隔で自動的に切り替えられます。' },
			{ iconClass: 'ti ti-bell', title: '通知・誕生日の演出', body: '通知が届いたときや誕生日に、専用の表情とセリフを表示できます。通知用の表情は2種類まで登録できます。' },
			{ iconClass: 'ti ti-home', title: 'Hataskホームのマスコット', body: 'Hataskのホームにマスコットをカードとして置けます。画面上のマスコットと二重にならないよう自動で調整します。', link: '/hatask', linkLabel: 'Hataskを開く' },
			{ iconClass: 'ti ti-file-import', title: '設定の保存と読み込み', body: 'マスコットの設定をファイルとして保存し、別の端末で読み込めます。バックアップにも使えます。', link: '/mascot', linkLabel: 'マスコット設定を開く' },
		],
	},
	{
		id: 'feedback', iconClass: 'ti ti-message-report', label: 'HataFeed（意見・不具合報告）',
		docs: [
			{ iconClass: 'ti ti-message-report', title: 'HataFeedとは', body: '旗鯖の不具合報告、要望、改善案、絵文字の申請をまとめて受け付ける場所です。投稿された話題は種類・状態・投稿者で絞り込み、返信やリアクションで話し合えます。特定の返信へ返事を付けたり、大切な返信や確認が必要な返信に印を付けたりもできます。<br><br>進行予定、お知らせ、絵文字申請も同じ画面から切り替えられます。自分の投稿への反応は通知で受け取れます。安全に関わる報告はスタッフだけが見られる場所で扱います。', tips: ['報告番号を選ぶと該当する内容へ直接移動できます', '絵文字申請は完成イメージを確認してから送信できます'], link: '/hatafeed', linkLabel: 'HataFeedを開く' },
		],
	},
	{
		id: 'bousai', iconClass: 'ti ti-activity', label: '地震・津波情報',
		docs: [
			{ iconClass: 'ti ti-activity', title: '地震・津波情報を見る', body: '気象庁が発表した地震情報と津波情報を、地図と一覧で確認できます。震源、最大震度、市区町村ごとの震度、発表中の津波警報・注意報、お住まいの都道府県で観測された地震を表示します。<br><br>地震が起きる前の緊急地震速報は扱いません。発表済みの情報だけを表示します。', tips: ['情報提供は気象庁とP2P地震情報です', 'ウィジェットやHatasabaUIのデッキにも置けます'], link: '/earthquake', linkLabel: '地震・津波情報を開く' },
			{ iconClass: 'ti ti-bell', title: '地震・津波の通知', body: '選んだ震度以上の地震、またはお住まいの都道府県で揺れが観測された地震を端末へ通知できます。津波警報・注意報の発表と解除も通知します。<br><br>都道府県名は通常この端末だけに保存します。地域だけの通知を有効にしたときに限り、通知の判定に必要な都道府県名を旗鯖へ保存します。市区町村や現在地は送りません。', link: '/earthquake', linkLabel: '通知を設定する' },
		],
	},
	{
		id: 'beta', iconClass: 'ti ti-flask', label: 'お試し機能',
		docs: [
			{ iconClass: 'ti ti-flask', title: '開発中の機能を試す', body: 'HataFeedから、完成前の機能を試せます。現在は、CやC++の短いプログラムを書いて自分の端末内で動かせる遊び場があります。', tips: ['正しく動かない場合はHataFeedでお知らせください'], link: '/hatafeed', linkLabel: 'HataFeedを開く' },
		],
	},
];

const filteredCategories = computed(() => {
	const q = searchQuery.value.toLowerCase().trim();
	const catFilter = activeCat.value;
	let filtered = categories;
	if (catFilter) filtered = filtered.filter(c => c.id === catFilter);
	if (!q) return filtered;
	return filtered.map(cat => ({
		...cat,
		docs: cat.docs.filter(doc =>
			doc.title.toLowerCase().includes(q) ||
			doc.body.toLowerCase().includes(q) ||
			(doc.tips && doc.tips.some(t => t.toLowerCase().includes(q))),
		),
	})).filter(cat => cat.docs.length > 0);
});
</script>

<style lang="scss" scoped>
.htk-docs-root{position:relative;min-height:100dvh;overflow:hidden;color:var(--MI_THEME-fg)}
.htk-docs-root[data-mode="dark"]{color:rgba(255,255,255,.92)}
.htk-docs-root[data-mode="light"]{color:rgba(0,0,0,.88)}
.htk-docs-bg{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none}
.htk-docs-orb{position:absolute;border-radius:50%;filter:blur(80px);opacity:.18;animation:htkDocFloat 20s ease-in-out infinite}
.htk-docs-orb.a{width:350px;height:350px;background:rgba(232,168,124,.4);top:-60px;left:-40px}
.htk-docs-orb.b{width:300px;height:300px;background:rgba(133,205,202,.35);bottom:-50px;right:-30px;animation-delay:-8s}
@keyframes htkDocFloat{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,-25px)}}
.htk-docs-content{position:relative;z-index:1;max-width:720px;margin:0 auto;padding:20px 16px 40px}
.htk-docs-title{font-size:1.3rem;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.htk-docs-search{margin-bottom:14px}
.htk-docs-inp{width:100%;padding:10px 16px;border-radius:14px;border:1px solid var(--MI_THEME-divider);background:color-mix(in srgb,var(--MI_THEME-panel) 80%,transparent);color:inherit;font-size:.9rem;outline:none;box-sizing:border-box}
.htk-docs-cats{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.htk-docs-cat{padding:5px 12px;border-radius:20px;border:1px solid var(--MI_THEME-divider);background:transparent;color:inherit;font-size:.78rem;cursor:pointer;transition:all .2s;font-family:inherit;display:flex;align-items:center;gap:4px}
.htk-docs-cat.on{background:var(--MI_THEME-accentedBg);color:var(--MI_THEME-accent);border-color:var(--MI_THEME-accent)}
.htk-docs-cat-hdr{font-size:.88rem;font-weight:700;margin:18px 0 8px;display:flex;align-items:center;gap:6px;opacity:.7}
.htk-docs-card{border-radius:14px;border:1px solid var(--MI_THEME-divider);background:color-mix(in srgb,var(--MI_THEME-panel) 60%,transparent);backdrop-filter:blur(8px);margin-bottom:8px;overflow:hidden;cursor:pointer;transition:all .2s}
.htk-docs-card:hover{background:color-mix(in srgb,var(--MI_THEME-panel) 80%,transparent)}
.htk-docs-card-hdr{display:flex;align-items:center;gap:8px;padding:12px 14px;font-weight:600;font-size:.88rem}
.htk-docs-card-title{flex:1}
.htk-docs-chev{opacity:.4;font-size:.85em}
.htk-docs-card-body{padding:0 14px 14px;font-size:.84rem;line-height:1.65;cursor:default}
.htk-docs-card-body :deep(ul){margin:6px 0;padding-left:20px}
.htk-docs-card-body :deep(li){margin:3px 0;font-size:.82rem}
.htk-docs-tips{margin-top:10px;padding:10px;border-radius:10px;background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.15)}
.htk-docs-tips-h{font-weight:600;font-size:.8rem;margin-bottom:5px;display:flex;align-items:center;gap:4px;color:rgba(255,215,0,.8)}
.htk-docs-tips ul{margin:0;padding-left:18px}
.htk-docs-tips li{font-size:.78rem;margin:2px 0;opacity:.8}
.htk-docs-link{display:inline-block;margin-top:8px;padding:5px 14px;border-radius:10px;background:var(--MI_THEME-accentedBg);color:var(--MI_THEME-accent);font-size:.8rem;font-weight:600;text-decoration:none;cursor:pointer;transition:all .2s}
.htk-docs-link:hover{opacity:.8}
.htk-docs-footer{margin-top:24px;font-size:.72rem;opacity:.4;text-align:center;line-height:1.5}
</style>
