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
						<div class="htk-docs-tips-h"><i class="ti ti-bulb"></i> Tips</div>
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

definePage({ title: '旗鯖機能解説', loginRequired: true });

const searchQuery = ref('');
const activeCat = ref('');
const openDoc = ref('');

function toggleDoc(title: string) { openDoc.value = openDoc.value === title ? '' : title; }

function navigateLink(link: string) {
	if (link.startsWith('http')) {
		window.open(link, '_blank');
	} else {
		mainRouter.push(link);
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
			{ iconClass: 'ti ti-layout-dashboard', title: 'Hatask とは', body: `Hataskは旗池2丁目に搭載されたオールインワンのダッシュボードです。<br><br>ホーム画面にはカレンダー、ToDo、きもち記録、お花育成、Hatask Eyeなど複数の機能がまとめられており、左右スワイプやタブで切り替えて使えます。<br><br>ホーム画面のカード配置は設定からカスタマイズ可能です。`, tips: ['ホーム画面のカード順序はドラッグ&ドロップで変更可能', '設定画面から背景テーマ・ダークモードの切替ができます'] },
			{ iconClass: 'ti ti-calendar', title: 'カレンダー・RSVP', body: `月間カレンダーと予定の管理ができます。日をタップすると予定を確認でき、新しい予定の追加も簡単です。<br><br>カレンダー表示と一覧表示の切り替えが可能で、日/週/月ごとの一覧や並べ替えにも対応しています。<br><br><b>RSVP（出欠確認）機能</b>では、予定を「公開」に設定し参加確認を有効にすると、他のユーザーに「行く / 検討中 / 辞退」で回答してもらえます。主催者はダッシュボードで回答状況をリアルタイムに確認でき、締め切り機能もあります。`, tips: ['複数日にまたがる予定も作成可能', 'イベント通知は15分前・30分前・1時間前・1日前から選択可能', 'RSVPの締め切り後でも回答一覧は確認できます'], link: '/hatask' },
			{ iconClass: 'ti ti-checkbox', title: 'ToDo', body: `タスク管理機能です。タスクの追加・完了・編集・削除ができ、期日設定やフォルダ分類にも対応しています。<br><br>並べ替えは「作成日」「期日の昇順・降順」から選べます。量が増えた場合はページ送りで快適に閲覧できます。`, tips: ['フォルダで分類し、タスクをグループ管理できます', '期日超過のタスクは赤くハイライトされます'] },
			{ iconClass: 'ti ti-mood-smile', title: 'きもち記録', body: `日々の気分を5段階で記録・振り返りできるセルフケア機能です。<br><br>きもちの分析機能では、直近7日間の傾向・平均スコア・時間帯別の傾向・インサイトなどが表示されます。<br><br>アーカイブはページ送りで過去の記録を振り返れます。`, tips: ['リマインド通知で記録の習慣化をサポート', '過去の記録を編集・削除することもできます'] },
			{ iconClass: 'ti ti-plant', title: 'お庭（お花育成）', body: `サーバーを使っている時間に応じて、お花が少しずつ成長していきます。<br><br>成長が完了すると名前を付けることができ、コレクションとしてギャラリーに並びます。<br><br>全125種類以上のお花や奇妙なアイテムが用意されており、レアアイテムも存在します。`, tips: ['成長には約8〜32時間かかります', '育て終わった花の名前はギャラリーからいつでも変更可能', 'レアアイテムはランダムで出現します'] },
			{ iconClass: 'ti ti-eye', title: 'Hatask Eye', body: `あなたのサーバー利用状況をもとに、ひとことメッセージを表示する機能です。<br><br>Hatask Eyeはホーム画面にもカードとして表示でき、タップすると専用ページに移動します。` },
		],
	},
	{
		id: 'external', iconClass: 'ti ti-link', label: '外部アカウント連携',
		docs: [
			{ iconClass: 'ti ti-link', title: '外部アカウント連携とは', body: `外部サーバー（旗鯖の別インスタンスやシュリンピアなど）と連携して、旗鯖から直接外部サーバーのタイムラインを見たり、投稿・リアクション・リプライ・リノートができる機能です。<br><br>MiAuth認証で安全にアカウント連携を行います。<br><br><b>接続先の選択肢:</b><ul><li>旗鯖の別インスタンス（旗池2丁目 ↔ 旗池3丁目）</li><li>シュリンピア (mk.shrimpia.network)</li></ul>`, tips: ['旗鯖同士の場合は旗鯖の利用規約が適用されます', '外部サーバーの場合は接続先の規約が適用されます'], link: '/settings/external-account', linkLabel: '連携設定を開く' },
			{ iconClass: 'ti ti-device-tv', title: '外部タイムライン (OHTL / OLTL)', body: `連携後、2種類の外部タイムラインが利用可能になります。<br><br><b>OHTL（外部ホームTL）</b>: 連携先でフォローしているユーザーのノートを表示します。<br><br><b>OLTL（外部ローカルTL）</b>: 連携先のローカルタイムラインを表示します。<br><br>タイムラインタブに追加され、通常のタイムラインと同じ感覚で切り替えて使えます。`, tips: ['外部TLからそのまま投稿・リアクション・リプライ・リノートが可能', 'Hatasaba UIでは＋マークのタブでアクセスできます'], link: '/settings/external-account' },
			{ iconClass: 'ti ti-star', title: 'お気に入りリアクション絵文字', body: `外部TLのリアクションピッカーに表示されるお気に入り絵文字を管理できます。<br><br>よく使う絵文字を登録しておくと、リアクションピッカーの先頭に表示されて素早くリアクションできます。`, link: '/settings/external-account', linkLabel: 'お気に入り絵文字を管理' },
		],
	},
	{
		id: 'ui', iconClass: 'ti ti-palette', label: 'UI・デザイン',
		docs: [
			{ iconClass: 'ti ti-device-mobile', title: 'UI切り替え', body: `旗池2丁目では複数のUIモードを選択できます。<br><br><b>デフォルトUI</b>: CherryPick / Misskey標準のUIです。左サイドバーにナビゲーションが表示されます。<br><br><b>Hatasaba UI</b>: 旗鯖独自のモバイルフレンドリーなUIです。タイムラインに特化したシンプルな画面構成で、スワイプでのタブ切り替えが可能です。<br><br><b>デッキUI</b>: 複数カラムを横に並べて表示するパワーユーザー向けUIです。`, tips: ['Hatasaba UIはスマホでの利用に最適化されています', 'UIモードはいつでも変更できます'], link: '/settings/hata-custom', linkLabel: '旗鯖設定を開く' },
			{ iconClass: 'ti ti-layout-list', title: 'Hatasaba UI', body: `旗鯖オリジナルのタイムライン特化型UIです。<br><br>画面上部のタブでHTL（ホーム）・LTL（ローカル）・GTL（グローバル）をワンタップで切り替えられます。外部アカウント連携時は＋H（外部ホーム）・＋L（外部ローカル）タブも追加されます。<br><br><b>特徴:</b><ul><li>スワイプでタイムライン切り替え</li><li>画面下部のピル型ナビバーから主要機能へアクセス</li><li>スクロール時にナビバーが自動で隠れて画面を広く使えます</li><li>KeepAliveでタブ切り替え時の再読み込みを防止</li></ul>`, tips: ['ドロワーメニューからサイドバーを開けます', '外部TLの通知や投稿もHatasaba UI内のピル型ボタンで操作可能'] },
			{ iconClass: 'ti ti-movie', title: 'タイムラインアニメーション', body: `タイムラインに新しいノートが表示される際のアニメーション方向を変更できます。<br><br><b>上からスライド</b>: 標準的なアニメーション<br><b>左からスライド</b>: デフォルト設定<br><b>右からスライド</b>: 逆方向から登場<br><b>ランダム</b>: 毎回違う方向から飛んでくるので楽しいです`, link: '/settings/hata-custom', linkLabel: '設定を変更する' },
			{ iconClass: 'ti ti-eye-off', title: 'リアクション絵文字の非表示', body: `ノートについたリアクション絵文字を個別に非表示にできます。<br><br><b>PC</b>: リアクション絵文字を右クリック →「この絵文字を非表示」<br><b>スマホ</b>: ノートの「…」メニュー →「リアクション絵文字を非表示」から選択`, link: '/settings/hidden-reactions', linkLabel: '非表示リアクション管理' },
		],
	},
	{
		id: 'tools', iconClass: 'ti ti-tool', label: 'ツール・アプリ',
		docs: [
			{ iconClass: 'ti ti-brush', title: 'お絵かきツール', body: `旗鯖に搭載されたブラウザ上で使える本格お絵かきツールです。Hataskの「旗鯖独自アプリ」や投稿フォームのお絵かきボタンから起動できます。<br><br><b>主な機能:</b><ul><li>ブラシ: サイズ・不透明度を自由に調整可能</li><li>消しゴム: ブラシと同様にサイズ調整可能</li><li>カラーパレット: カラーピッカーで自由な色を選択</li><li>レイヤー管理: 複数レイヤーの追加・削除・並べ替え・表示切替</li><li>アンドゥ / リドゥ: 操作の取り消し・やり直し</li><li>キャンバスサイズ: カスタムサイズに対応</li></ul>`, tips: ['レイヤーを活用すると下書きと清書を分けて描けます', '投稿フォームのお絵かきボタンからも直接起動可能', 'スマホでもタッチ操作で描けます'] },
			{ iconClass: 'ti ti-id', title: 'HATA CARD MAKER（会員証）', body: `旗池2丁目のオリジナルホログラフィック会員証を作成できるWebアプリです。<br><br>MiAuth認証でログインすると、あなたのアカウント情報をもとにカードが自動生成されます。登録日ベースでカードデザインが変化し、長期ユーザーほど特別なデザインが解放されます。`, tips: ['Hataskの「旗鯖独自アプリ」からワンタップで開けます', 'カード画像はダウンロードして自由に使えます'], link: 'https://hatacardcreate.tolehata.net/', linkLabel: 'HATA CARD MAKERを開く' },
			{ iconClass: 'ti ti-mood-search', title: 'HATAlyze（ハタライズ）', body: `Misskeyの投稿を分析して、あなたの思考パターン・感情傾向・パーソナリティタイプを可視化するWebアプリです。Cloudflare Workers上で動作し、MiAuth認証で安全にログインできます。<br><br><b>主な分析内容:</b><ul><li><b>感情傾向分析</b>: 投稿テキストからポジティブ・ネガティブのキーワードを文脈付きで検出し、感情スコアを算出。曜日・時間帯ごとのムード変化も可視化</li><li><b>思考ロジック解析</b>: 文章量・投稿時間帯・連投頻度・CW使用パターンなど9つの角度から思考スタイルを多面的に分析</li><li><b>50種パーソナリティ判定</b>: ポジティブ度・安定度・饒舌度・社交度・技術志向・創作志向・夜型度・連投度の8次元から50タイプに分類</li><li><b>興味関心・食べ物ランキング</b>: 投稿内容から興味のあるトピックや好きな食べ物を自動検出してランキング表示</li><li><b>投稿スタイル分析</b>: 長文型 / 中文型 / 短文型の判定、連投傾向、メディア使用率などを解析</li></ul><br><b>仕組み:</b><br>最大1000件の投稿を取得し、キーワードマッチングベースで自動分析します。分析はすべてブラウザとWorker間で完結し、データは外部に保存されません。<br><br><b>注意:</b> 本ツールは医療目的ではありません。分析結果はあくまで参考・エンターテインメントです。`, tips: ['Hataskの「旗鯖独自アプリ」からワンタップで開けます', '分析結果はSNS共有用の画像として保存できます', '旗鯖メンバー限定の機能です'], link: 'https://kanjo-bunseki.tolehata.net/', linkLabel: 'HATAlyzeを開く' },
			{ iconClass: 'ti ti-door', title: '旗鯖ポータル', body: `旗鯖の各種ツールやリンクにまとめてアクセスできるポータルページです。<br><br>絵文字申請や各種ガイドラインへのリンクなどが集約されています。` },
		],
	},
	{
		id: 'posting', iconClass: 'ti ti-pencil', label: '投稿・フォーム',
		docs: [
			{ iconClass: 'ti ti-brush', title: 'お絵かきボタン', body: `投稿フォームにお絵かきボタンを表示できます。<br><br>ボタンを押すとお絵かきツールが開き、描いた絵をそのまま投稿に添付できます。<br><br>表示/非表示は旗鯖設定から切り替えられます。`, link: '/settings/hata-custom' },
		],
	},
	{
		id: 'other', iconClass: 'ti ti-dots', label: 'その他',
		docs: [
			{ iconClass: 'ti ti-calendar-stats', title: 'ログイン日数・実績', body: `サーバーにログインするたびにカウントされるログイン日数をHataskのホーム画面で確認できます。<br><br>サーバー内のランキングや次の実績までの日数も表示されます。`, link: '/settings/hata-custom' },
			{ iconClass: 'ti ti-search', title: 'Hatask内検索', body: `Hataskのヘッダーにある検索ボタンから、予定・ToDo・きもち記録などをまとめて検索できます。` },
			{ iconClass: 'ti ti-school', title: 'スポットライトチュートリアル', body: `Hataskを初めて開いた時に表示されるインタラクティブなチュートリアルです。<br><br>各画面の主な機能をステップごとにハイライト表示しながら解説します。Hataskの設定画面からいつでも再表示できます。` },
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