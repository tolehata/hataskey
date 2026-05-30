# HATA-CHANGELOG

旗鯖独自フォーク (Hataskey-Hata) のチェンジログです。  
ベースフォーク CherryPick のチェンジログは [CHANGELOG.md](./CHANGELOG.md) を参照してください。

## hata-11.4

hata-11.3 でブランド統一・Misskey 2026.5.2〜5.4 取り込みという大きな整備を行った直後のリリースとして、利用者体験を細かく整える方向の更新になります。新機能としてメンテナンスお知らせ向けに**進捗バー (4段階)** を追加したほか、hata-11.3 の積み残しだった複数のバグ修正と HatasabaUI の体験改善を中心に取り込みました。本家 Misskey からの追加取り込みはありません (前リリースで 2026.5.4 まで追従済み)。

### 新機能

- **メンテナンスお知らせに進捗バー (4段階) を追加**: メンテナンスカテゴリ (`icon === 'maintenance'`) のお知らせに、4段階の進捗バーをオプションで表示できるようにしました。各段階のラベルは管理者が自由に設定でき (例「サーバー停止」「DBバックアップ」「適用」「再開」)、コンパネ上で各段階に「完了」チェックを順に入れていくことで進捗を可視化できます。利用者画面では ●━●━○━○ のステップインジケーター型で表示し、完了済みは accent 色塗りつぶし + ✓、未完了は枠線+番号、現在進行中 (最後の完了の次) は accent 色のパルスアニメーションで強調されます。表示はお知らせ一覧画面 (`/my/announcements`) のメンテナンス枠とお知らせダイアログ (`MkAnnouncementDialog`) の2箇所、加えて詳細画面 (`/announcements/:id`) にも実装しています。
  - DB: `announcement` テーブルに `progressSteps` (jsonb, `string[4] | null`) と `progressCompleted` (jsonb, `boolean[4] | null`) の2カラムを追加。マイグレーション `1780000000000-add-maintenance-progress-to-announcement.js`。両カラムとも nullable / default null のため既存お知らせには影響なし
  - API: `admin/announcements/create` と `admin/announcements/update` の paramDef に2フィールドを追加 (`minItems: 4, maxItems: 4`)。`icon === 'maintenance'` 以外のときは自動的に null に強制 (カテゴリ変更で maintenance から外れた場合もクリアされる)
  - Schema: `packedAnnouncementSchema` (`/models/json-schema/announcement.ts`) にもレスポンス型として追加
  - フロント: 共通コンポーネント `MkAnnouncementProgress.vue` を新規作成し、コンパネ・一覧 (ピン留め枠とメンテナンスハイライト枠の両方)・詳細・ダイアログから呼び出す形に統一。「現在進行中」の判定は「最後の完了済みステップの次のステップ」で、チェックを飛ばしても矛盾なく動く実装

### バグ修正

- **リアクション通知の重複表示・欠落を修正**: `notifications-grouped.ts` のリアクション通知グルーピング処理が、直前1件としか比較しない「隣接比較方式」だったため、同じノートへのリアクションが時系列で飛び石になると複数グループに分裂していました。結果として (1) 同じ投稿のリアクション通知が重複表示される、(2) 分裂したグループが `slice(limit)` で切られて末尾のリアクションが欠落する、という2つの症状が出ていました。リアクションだけ「全体集約方式」に書き直し、`noteId` ごと→`notifierId` ごとの2段で集約してから時系列順に1グループ=1エントリで出力するように変更しました。renote/note のグルーピングは Misskey 標準の隣接比較を維持しています (これらは問題なし)。hata-11.3 で追加した `reaction:groupedByUser` 機能は維持されます
- **ノートヘッダーの外部サーバーラベルが日時の下に表示される問題を修正**: `MkNoteHeader.vue` で `MkInstanceTicker` (外部サーバーラベル) が日時 `info` ブロックの後ろに別 div として置かれており、かつ属性指定が `:style="$style.info"` (CSSクラス名を `:style` に誤指定、正しくは `:class`) になっていたため、ラベルが日時の下に縦並びで表示されていました。ラベルを日時の左に配置するように DOM を組み替え、`.section:last-child` を `flex-direction: row; align-items: center; gap: 0.5em` の横並びに修正、`.ticker` クラスを新設しました
- **ノートヘッダーでロール無しユーザーの表示名と @id の間が不自然に空く問題を修正**: `MkNoteHeader.vue` の `badgeRoles` の表示条件が `v-if="note.user.badgeRoles"` だけで、空配列 `[]` も JS の truthy 判定に引っかかるため、ロールが無いユーザーでも空の div が描画され、`margin-right: .5em` の余白だけが残っていました。`v-if="note.user.badgeRoles && note.user.badgeRoles.length > 0"` に変更し、空配列のときは描画しないように
- **リアクション非表示メニューがモバイルの長押しで出ない問題を修正**: `MkReactionsViewer.reaction.vue` で、リアクションを長押しで開くメニュー (`stealReaction` 関数、`openEmojiMenu` から 500ms ディレイで呼ばれる) に「このリアクションを非表示/表示」項目が無く、右クリック (`menu` 関数) 側にしか実装されていませんでした。モバイルでは長押ししか使えないため、利用者には「絵文字ミュートしか出ない=非表示機能が消滅した」ように見えていました。長押し側メニューにも同項目を追加し、PC/モバイルで揃えました (`hidden-reactions.ts`・設定画面の管理リンク・`menu` 関数自体は元から正常に存在しており、長押しメニューへの項目追加漏れが原因でした)
- **HatasabaUI サイドメニューの並び替えが画面に反映されない問題を修正**: `hata-custom.vue` の `moveArr` 関数が配列の分割代入 `[arr[idx], arr[ni]] = [arr[ni], arr[idx]]` で要素を入れ替えていましたが、Vue 3 のリアクティビティはインデックス直接代入を検知できないため、▲▼ボタンで並び替えても画面が再描画されませんでした。`splice` ベースの入れ替えに変更
- **HatasabaUI 設定の「トレンドタブを表示する」トグルがクリックで反応しない問題を修正**: `hata-custom.vue` の `showTrendingTab` computed が getter で非リアクティブな `prefer.s['simpleUi.showTrendingTab']` を参照していたため、Vue の依存追跡が効かず、トグルしても画面が再描画されず (リロードしないと反映されない) 状態でした。`prefer.r['simpleUi.showTrendingTab'].value` (リアクティブ ref) に変更し、即時反映するように

### UI/UX 改善

- **ギャラリーページのタブを共通ピル型デザインに統一**: hata-11.3 でピル型タブに統一した10ページの一覧から漏れていたギャラリーページ (`gallery/index.vue`) も他ページと同じピル型タブに刷新しました。`PageWithHeader` の `:tabs="[]"` で旧ヘッダタブを無効化し、body 上部に共通仕様のピル型タブ (sticky top:0, backdrop blur, accent active state) を実装。ログイン状態での `headerTabs` / `headerTabsWhenNotLogin` 出し分けは維持しています
- **トレンドタブを通常タブの右端 (外部TLの左) に移動**: HatasabaUI 上部タブの並び順を「通常タブ... → トレンド → 外部ホーム → 外部ローカル」に変更しました。従来は `visibleTopTabs` でトレンドタブを配列先頭に固定していたのを末尾配置に変更し、外部TL (ohtl/oltl) は後段の `tabOrder` で `push` されるため、結果としてトレンドが「通常タブの右端、外部TLの左」の位置に収まります
- **サイドメニュー並び替えをグループ内限定に + グループラベル表示**: HatasabaUI サイドメニューの並び替え設定で、従来はグループ (基本 / Hatask / 発見・交流 / もっと) をまたいで自由に動かせていましたが、表示側のグループ強制再分類との組み合わせでラベル位置が崩れる懸念があったため、**グループ枠を固定とし、並び替えは各グループ内でのみ可能**に変更しました。`canMoveSidebar(idx, dir)` で隣接要素のグループを比較し、別グループなら境界として ▲▼ ボタンを `disabled` に。並び替えリストにグループラベル (`isSidebarGroupHead` / `sidebarGroupLabelOf`) を表示し、どの項目がどのグループに属するか可視化しています
- **サイドメニュー下部 (投稿/アカウント) を固定化、メニュースクロールで隠れないように**: 従来は `sidebarInner` 全体が `overflow-y: auto` で、メニュー項目が増えると下部の「ノート」ボタンとアカウント表示も一緒にスクロールして隠れていました。`sidebarInner` を `overflow: hidden` に変更し、メニュー群を新設の `.sbScroll` (`flex:1; min-height:0; overflow-y:auto`) でラップ、`.sbBottom` (投稿+アカウント) は `flex-shrink: 0` で外側に固定する3層構成 (ロゴ上部固定 / メニュースクロール / 下部固定) にしました。PC のサイドバーとモバイルのドロワー両方に適用
- **サイドメニューに「メッセージ」を追加 (既存ユーザー含む全員に反映)**: HatasabaUI サイドメニュー基本グループに「メッセージ」(`ti ti-messages`) を通知の直後に追加しました。`def.ts` のデフォルト変更だけでは保存済み `simpleUi.sidebar` を持つ既存ユーザーに反映されないため、`sidebarGroups` computed で「`sidebarOrder` に `chat` が無ければ基本グループの通知直後に動的注入する」方式 (トレンドタブと同じ手法) を採用しています。`def.ts` に `chat` がある新規ユーザーは `sidebarOrder` に持つため二重注入されません。クリック (`goToChat`) / 未読ドット (`hasUnreadChat`) / アクティブ判定 (`isChatPage`) は既存実装を流用

### その他

- **旗鯖新機能ページ (`hata-whats-new.vue`) に hata-11.3 までの主要トピックと Misskey 2026.5.2〜5.4 取り込みを追補**: hata-11.3 リリース時点で `hata-whats-new.vue` のカード掲載が一部の主要機能に追いついていなかったため、9 枚のカードを追加して利用者向けの履歴を整えました
  - Misskey 取り込み: `misskey-2026.5.4` (CVE5件のセキュリティ修正) / `misskey-2026.5.2-5.3` (Unicode 17.0 / テーマプレビュー改善 / RSA署名高速化)
  - hata-11.3 新機能の追補: ごはん記録機能 (`meal-log`) / 登録申請プライバシー保護 (`registration-privacy`) / お絵描きツール v2.4 (`drawing-tool-v24`、ダークモード文字視認性・カラーパレット改善・レイヤー表示トグル修正・プレビュー高解像度化) / 独自ゲームの Unicode 統一 (`games-unicode-only`、絵文字たたきの同時/重複出現バグ修正含む) / ノートヘッダーレイアウト (`note-header-layout`) / 実績「神様コンプレックス」(`achievement-hatacha`) / 自動送信メールの韓国語除去 (`email-no-korean`)
- **`package.json` のバージョン表記を更新**: `2026.5.4-hata.11.3` → `2026.5.4-hata.11.4` に更新。`basedMisskeyVersion` (`2026.5.4`) と `codename` (`2026.7`) は変更なし

## hata-11.3

このリリースで、旗鯖fork のブランド名を **CherryPick-Hata から Hataskey に正式移行**しました。
旗鯖fork は当初 CherryPick の派生として始まり、CherryPick をベースにした独自フォークとして
独自機能・独自UIを積み重ねてきましたが、hata-11.3 から「Hataskey」を正式なブランド名として位置づけます。
リポジトリ名 (`cherrypick-hata` / `misskey-hata`) は Forgejo 上では当面維持しますが、
UI 表記・ドキュメント・ロゴはすべて Hataskey ブランドに統一されます。

また、**`misskey-hata` (Misskey 純正系派生) は hata-11.3 以降の保守を終了**し、
開発リソースを `Hataskey-Hata` (CherryPick 系派生) に集約します。
旗鯖の独自機能は今後 Hataskey-Hata (CherryPick 系派生) で引き続き提供されます。

CherryPick 側はベースバージョン (Misskey 2025.10.2 相当) との差異が大きいため、
本家 Misskey 2026.5.1 のうち**バグ修正で CherryPick 独自実装と整合する3件のみ**を
厳選して cherry-pick しました。

### バグ修正 (本家由来)

- ID生成アルゴリズムにULIDを使用している場合に通知が約10秒遅延する問題を修正 (#17358)
- 公開範囲がフォロワーの投稿が通知されない問題を修正 (#17363)
- ロール設定画面でロールをアサイン/アサイン解除した際、リロードしなくても画面に反映されるよう修正 (#17365)

### 本家由来の取り込み (Misskey 2026.5.2〜2026.5.4)

本家 Misskey の 2026.5.2〜2026.5.4 から、CherryPick 独自実装と整合する変更を厳選して手作業で移植しました。テーマ機能のクラス化リファクタ (ThemeManager 化) に依存する変更は影響範囲が大きいため、本リリースでは見送っています。

#### セキュリティ対応 (2026.5.4 由来)

旗鯖独自実装に合わせて手作業移植しました。詳細は非公開とします。

- ActivityPub JSON-LD 署名検証まわりの堅牢化 (コンテキストキャッシュの凍結・禁止ディレクティブ拒否・キャッシュ上限)
- Inbox 処理における LD-Signature 検証順序の見直し
- チャットルーム情報の閲覧権限チェックを追加
- アナウンス取得時の権限ガードを修正
- テーマ参照の循環参照・過剰再帰の防止

#### 基盤改善 (2026.5.2 由来)

- RSA 署名処理を `slacc` (Rust 実装) へ移行し、スレッドプールへオフロード可能に
  - `slacc` を 0.0.10 → 0.1.5 に更新 (既存の単語ミュート・絵文字インポート機能への影響なしを確認済み)
  - `config` に `threadPoolSize` オプションを追加 (デフォルト `1`)
- Unicode 17.0 の絵文字に対応 (`@misskey-dev/emoji-data` 17.0.3 へ移行)
  - 絵文字判定の正規表現・絵文字リスト・言語別インデックスをパッケージ提供のものに切り替え
  - 旗鯖独自の絵文字カラースタイル変換 (`forceColorizeEmoji`) は維持
- フロントエンドのロケールインライナーのビルド失敗を修正 (空ソースコードの取り扱い)

#### その他の修正 (2026.5.2 由来)

- リスト編集のユーザー追加で自分自身を選択できるように修正
- デッキのアンテナ・リストカラムから開く編集ウィンドウのリンク誤りを修正
- ポップアウト時のウィンドウサイズ計算を整理
- ドライブのファイル更新時に一覧へ変更が即時反映されるように (`driveFilesUpdated` イベント発火)
- `MkInput` に `throttle` オプションを追加 (数値指定にも対応)


### 旗鯖独自機能改善

- **旗鯖新機能ページ更新**: hata-11.3 対応カードを追加しました
- **外部TL関連UIの絵文字整理**: デッキUIのカラム選択肢・タイムライン名、タイムラインページのヘッダタブ・案内メッセージから不要な🦐絵文字を削除しました
- **「もっと!」メニュー残留問題の修正**: hata-11.0 で旗鯖機能解説ボタンをサイドバーから「もっと!」/「ヘルプ」内に移設した際、navbar 定義 (`hataDocs`) が残ったままだったため、環境によって「もっと!」メニュー内に旗鯖機能解説ボタンが残留する問題が発生していました。navbar 定義を削除し、既存ユーザーのサイドバー設定 (`prefer.s.menu` / `prefer.s['simpleUi.sidebar']`) からも自動的に `hataDocs` を除去するマイグレーション処理 (`hata_docs_cleanup_migrated`) を追加しました。なお、旗鯖機能解説ページ自体はヘルプメニュー (`?` アイコン) から引き続きアクセス可能です
- **検索メニューのデザイン刷新**: タブで対象を切り替える方式から、検索バー内のプルダウンで切り替える方式に変更しました。検索バーは左右が丸みを帯びたカプセル型デザインで、プルダウン (検索対象) → 検索チップ → 検索ボタン (テーマカラー) → オプションボタン の順に配置しています。PC・タブレットではヘッダ直下に、スマホでは画面下部に固定表示されます。プロフィール画面の🔍ボタンからの特定ユーザー検索フロー、AP lookup、@mention/#tag のショートカットなど既存機能はすべて維持しています
- **お知らせメニューのデザイン刷新**: お知らせ一覧をカテゴリ別に整理表示するようにしました。現在のお知らせタブでは、メンテナンス情報があれば赤字でトップに、続いて最新のお知らせをハイライト表示し、その他をカテゴリ別に分類します。過去のお知らせも同じくカテゴリ別に整理されます 
- **コントロールパネル: メンテナンス種別を追加**: お知らせ作成画面の種類に「メンテナンス」(`maintenance` / 🔧 アイコン) を追加しました。システム上の扱いは通常のアクティブと変わりませんが、利用者向けのお知らせメニューでは赤枠+赤字でトップに表示されるため、計画停止やインフラ更新の周知に活用できます
- **お知らせのピン留め機能**: 任意のお知らせを📌でピン留めできるようになりました。ピン留めしたお知らせは、お知らせメニューのトップ(メンテナンス情報よりさらに上)に専用セクションで表示されます。複数件のピン留めに対応し、↑↓ボタンで並び替えも可能です。設定はpreferencesに保存されるため、同じアカウントで別端末からアクセスしても同期されます。各お知らせカード右上のピンアイコンで操作してください。なお、管理者により削除されたお知らせのピン留めIDは、お知らせメニューを開いた際に自動でクリーンアップされます
- **新着お知らせポップアップに種別アイコンと一覧への遷移ボタンを追加**: 新着お知らせのポップアップ (`MkAnnouncementDialog.vue`) のヘッダーに表示される種別アイコンに、これまで抜けていた「メンテナンス」(`maintenance` / `ti ti-tool` + 赤色) を追加しました。お知らせ作成画面 (`admin/announcements.vue`) およびお知らせメニューでは既にメンテナンス種別を表示していたため、ポップアップ側もそれに揃えて 5 種別 (info / warning / error / success / maintenance) すべてを表示するようになりました。あわせて、ポップアップのフッターに「お知らせ」一覧画面 (`/announcements`) へ遷移するボタンを追加しました。遷移には (モーダルから inject 経由のルーターコンテキストが届かない可能性を考慮して) `useRouter()` ではなくグローバルの `mainRouter` を直接使用しています。なお、この遷移ボタンは既読化を伴いません (お知らせの既読化は従来どおり「閉じる」ボタンでのみ行います)。これは、既読確認が必要なお知らせ (`needConfirmationToRead`) を遷移操作で意図せず既読にしてしまわないための配慮です
- **ブランド名「Hataskey」の導入とログインページロゴ刷新**: 旗鯖fork (Hataskey-Hata (CherryPick版) / Hataskey-Hata (Misskey版)) のブランド名を「Hataskey」として正式に位置づけ、ログインページ左上のブランドロゴを2段構成に刷新しました。1段目に Google Fonts の Righteous フォント(SIL Open Font License 1.1)で「Hataskey」をテーマカラー(判子色)で大きく表示、2段目に「A fork of [CherryPick/Misskey ロゴ]」を控えめに配置します。Righteous フォントは `packages/frontend/assets/Righteous-Regular.woff2` として同梱(OFL ライセンステキストは `packages/frontend/assets/fonts/Righteous-OFL.txt`)、Web フォント (`@font-face` + `font-display: swap`) として読み込まれます。背景シェイプ装飾上での視認性のため、1段目には微小な text-shadow、2段目には `mix-blend-mode: difference` を適用しています
- **CherryPick 支援関連メニューのサイドバー撤去**: 旗鯖fork ではサイドバー(と「もっと!」メニュー)から「CherryPick を支援する」項目を撤去しました。支援関連の導線はサーバーアイコン → サーバー情報(`/about-misskey`)に集約しています(CherryPick への寄付ボタン・Misskey 本家への寄付・スポンサー一覧などはこちらから引き続きアクセス可能)。`store.ts` のサイドバーデフォルトから `'support'` を除外し、既存ユーザー向けに `prefer.s.menu` および `prefer.s['simpleUi.sidebar']` から自動的に `'support'` を除去するマイグレーション処理(`hata_support_cleanup_migrated`)を追加しています
- **MkPreview のサンプル表記を Hataskey に変更**: 設定画面等で利用されるプレビューコンポーネントのサンプルラジオボタンとデフォルト文字列を「CherryPick」→「Hataskey」に変更しました(`Hataskey makes you happy.`)。ラジオの `value` 等内部識別子(`cherrypick`)は本家整合性のため維持しています
- **Friendly UI の全面廃止**: 旗鯖fork (Hataskey-Hata (CherryPick版)) では Friendly UI を全面廃止しました。ウィンドウサイズの変更や設定操作の拍子で意図せず Friendly UI が表示されてしまう問題への根本対策です
  - `ui/friendly.vue` および `ui/friendly/` ディレクトリ配下のファイル(navbar.vue / mobile-footer-menu-friendly.vue)を削除
  - `main-boot.ts` の UI フォールバック(`switch` の `default:`)を `friendly.vue` から `simple.vue` に変更。既存の `'friendly'` 値も同じく `simple` で受ける
  - `boot/common.ts` に毎boot時のクリーンアップ処理を追加: `localStorage.getItem('ui') === 'friendly'` なら強制的に `'simple'` に書き換え
  - `utility/is-friendly.ts` を「常に `ref(false)` を返す」に変更。多数のコンポーネント(MkPageHeader / MkStickyContainer / MkStreamingNotesTimeline / common.vue 等)が参照しているため、関数自体は後方互換のために残存
  - `_common_/common.vue` から `XNavbarFriendly` の参照と import を削除
  - 設定画面(`settings/cherrypick.vue`)の「Friendly UI」セクション全体(friendlyUiEnableNotificationsArea / enableLongPressOpenAccountMenu / friendlyUiShowAvatarDecorationsInNavBtn の3項目)を削除
  - `timeline.vue` の Friendly UI 切替メニューと関連 ref / watch を削除
  - `preferences/def.ts` および `store.ts` / `pref-migrate.ts` の関連キー定義自体は、マイグレーション処理との整合性のため残存(設定値も保持されますが UI からはアクセスできません)
- **Hataskey ブランド統一の徹底**: 旗鯖fork全体で「Hataskey」ブランドを統一的に表記するよう、複数箇所のリバートと文言修正を実施しました
  - サーバー情報ページ(about.overview.vue): バージョン表示ラベルを `CherryPick` → `Hataskey` に。Tarballダウンロードリンクを撤去
  - i18n: `poweredByMisskeyDescription` を `"{name}は、オープンソースのプラットフォームHataskeyのサーバーのひとつです。"` に変更
  - i18n: `thisIsModifiedVersion` を `"{name}はオリジナルのHataskeyを改変したバージョンを使用しています。"` に変更
  - i18n: `_aboutMisskey.about` を `"Hataskeyは、Misskey/CherryPickをベースに2025年から開発中のカスタマイズオープンソースのソフトウェアです。"` に変更
  - i18n: `_aboutMisskey._cherrypick.donate` を `"CherryPick(ベースソフトウェア)に寄付"` に変更(ベースソフトウェアであることを明示)
- **実績(Achievement)文言の Hataskey 化**: ログイン継続実績などの文言を旗鯖fork独自に変更しました
- **about-misskey ページのブランドアイコン刷新**: 旧 `<img instance.iconUrl>` + プレーンアイコンフォールバック表示を廃止し、ログインページと同じ Hataskey ブランドロゴ表示(Righteousフォント+テーマアクセント色)に統一しました。@font-face 宣言を scope 内に追加して about-misskey 単体でも Righteous フォントを利用可能にしています。ランダムカラーアイコン(プレーン単色SVG)機能自体は PWA manifest 等の他箇所では引き続き使用されます
- **既存サーバーの旧 CherryPick アイコン置換マイグレ追加**: 1777000000000-migrate-legacy-cherrypick-icon-url-to-null.js を新規追加しました。`Meta.iconUrl` が `about-icon.png` または `cherrypick-icon` を含む値(=旧CherryPick由来のキャラクターアイコン)に設定されているサーバーで、値を `NULL` にリセットして動的アイコン(プレーン単色SVG)に切り替えます。管理者が独自に設定したカスタムアイコンには影響しません
- **Hatasaba UI(simple.vue)のタイムライン上部投稿フォーム表示を修正**: 設定値の取得処理(`prefer.model('showFixedPostForm')`)と設定UI(タイムラインオプションメニューのトグル)は実装済みでしたが、設定値を反映する `<MkPostForm v-if=...>` 自体がテンプレートに存在せず、トグルをONにしても投稿フォームが表示されない不具合がありました。`timelineContainer` 直下、`<KeepAlive>` の手前に `MkPostForm` を挿入し、外部TL(ohtl/oltl)では非表示とする条件(`!isExternalTab`)を併せて追加しました。これで通常 UI と同じ挙動になります
- **お知らせページの見出し文言が表示されない問題を修正**: ja-JP.yml に未定義だった旗鯖fork独自の i18n キーを追加しました
  - トップレベル `maintenance: "メンテナンス情報"`(利用者向けお知らせの分類見出し)
  - `_announcement.latest: "最新のお知らせ"`
  - `_announcement.pinned: "ピン留めされたお知らせ"`
  - `_announcement.pin/unpin/movePinUp/movePinDown`(ピン操作系)
  - `_announcement.categoryInfo/Warning/Success/Error/Maintenance`(アイコン分類)
  - `_announcement.maintenanceNote`(管理者向けお知らせ作成画面でメンテナンス選択時に表示される説明文)
- **hata-whats-new ページ: サーバー名動的化 + カテゴリ調整**: ヒーローセクションのサブタイトル(`...で使える最新の独自機能を…`)と、Misskey 2026.5.1 修正取り込みカード内のデモバージョン表記を、ハードコードの `旗池２丁目` / `旗鯖2丁目` から `{{ displayServerName }}`(`instance.name || instanceName || 'Hataskey'`)に動的化しました。これにより別サーバーで運用する場合にも自動的に正しいサーバー名が反映されます。また「外部TL絵文字ピッカーをスマート化」カードを `fix` カテゴリから `federation`(外部連携)カテゴリに移動しました
- **ログインページ視認性改善とデザイン刷新**: 「A fork of」ラベルが背景装飾に潰れて見えなくなる問題を、半透明パネル背景+`backdrop-filter: blur` + 角丸ピル形状で改善しました。また右上にライト/ダーク切替ボタンを追加(`store.darkMode` を直接切替、テーマシステムが反応)、PC/タブレット幅では `MkVisitorDashboard` の主カードとサブカード群が横並びになるよう CSS Grid(`min-width: 900px` でグリッド化)を導入しました。連合サーバーの横スクロールは本家から削除された `MkMarqueeText` 依存を解消し、自前の CSS keyframes アニメーション(40秒で一周、リストを2回繰り返し、ホバーで一時停止)で再実装しています
- **OpenAPI ドキュメントの Hataskey 化**: `packages/backend/src/server/api/openapi/gen-spec.ts` の `info.title` を `CherryPick API` → `Hataskey API`、`externalDocs.url` を Forgejo(`code.tolehata.net/hatacha/cherrypick-hata`)、各エンドポイントの Source code リンクを Forgejo の URL 構造(`/src/branch/master/...`)に変更しました
- **新規セットアップ時のリポジトリURL初期値が CherryPick のままになる問題を修正**: `packages/backend/src/models/json-schema/meta.ts` の `repositoryUrl` / `feedbackUrl` のデフォルト値が GitHub 本家URLのままで、API応答時に Meta.ts のDBデフォルト(Hataskey URL)を上書きしていた問題を修正。3箇所(Meta.ts エンティティ / json-schema スキーマ / 既存DBマイグレ 1775/1776)すべてで Hataskey URL に統一されました
- **Hataskey Games ページのタイトル統一**: ナビバーから遷移後のページタイトル/ヘッダが「Misskey Games」のままになっていた問題を修正しました。`packages/frontend/src/pages/games.vue` の `definePage` 内 `title` を `Misskey Games` → `Hataskey Games` に変更し、ナビバー(`navbar.ts`)のラベルと整合させています
- **外部TL絵文字ピッカーをスマート化**: 外部TL用リアクションピッカーの「最近使った」絵文字が読み込みエラーアイコンになる不具合を解消し、相手サーバーへの API リクエスト量も大幅削減しました
  - 履歴・お気に入りに **絵文字のホスト名と画像URLも一緒に保存** する構造拡張(`{ reaction, host, url, addedAt }`)。`getExternalRecentReactions()` / `getExternalFavoriteEmojis()` は `string[]` を返す後方互換APIを維持しつつ、内部的には `*Detailed()` 経由で URL を保持。旧データ(`string[]` 形式)も自動マイグレーション
  - **ホストごとの絵文字URLマップを永続キャッシュ**(`externalEmojiUrlMap`)。24時間TTL + 最大10ホストLRU管理。別の外部サーバーに切り替えても、24h以内に取得済みのホストはAPIを呼ばずに絵文字を表示
  - **`/api/emojis` の取得を遅延化**: ピッカー起動時の無条件取得をやめ、「カスタムタブを開いた時」「検索を開始した時」のみ取得(`ensureCustomEmojisLoaded()`)。履歴/お気に入りだけ使うユーザーはピッカー開閉でAPI呼び出し0
  - **3段階フォールバック解決**: 画像URL取得は (1)履歴/お気に入りに保存された URL → (2) ホスト別URLマップ → (3) 現サーバー絵文字一覧 の順で API ゼロを最優先
  - **URL未解決時のフォールバック表示**: 壊れた画像アイコンの代わりに `:name:` テキストを半透明・モノスペースで表示(`.unresolvedEmoji`)
  - **設定画面に「外部TL絵文字キャッシュをクリア」ボタンを追加**: ユーザーが明示的にキャッシュ管理可能。確認ダイアログ付き、履歴・お気に入り自体は保持される旨を明記
  - 著作権配慮: URL文字列のみ保存(画像実体は保存しない)、TTL/LRUによる自動的なデータ寿命管理
- **ブランド表記漏れの追加修正**: hata-11.3 のブランド統一作業で見落としていた以下の表記を Hataskey 化しました
  - `locales/ja-JP.yml` の `aboutMisskey` ラベル: `"CherryPickについて"` → `"Hataskeyについて"`(サーバー情報ページから about-misskey への遷移ボタン、および about-misskey ページのヘッダタイトルに反映)
  - `locales/ja-JP.yml` の `_achievements._types._notes1.flavor`: `"良いCherryPickライフを！"` → `"良いHataskeyライフを！"`(初回ノート投稿実績の flavor テキスト)
- **UI 文言の Hataskey 化一斉対応**: `locales/ja-JP.yml` 内のユーザー目に触れる UI 文言を多数 Hataskey 化しました。ベースソフトウェア名・本家バージョン参照・他ソフト例示など、文脈的に CherryPick 表記を維持すべき箇所は意図的に残しています
  - 通知・ダイアログ系: `cherrypickMigrated` / `youAreRunningBetaClient` / `youAreRunningUpToDateClient` / `newVersionOfClientAvailable` / `misskeyUpdated` / `didYouLikeMisskey` / `pleaseDonate` / `goToMisskey` / `installCompleted` / `howWillYouUseMisskey`
  - 設定・操作系: `renoteConfirmDescription` / `useSoundOnlyWhenActive` / `scratchpadDescription` / `sendErrorReportsDescription` / `summaryProxyDescription` / `otherOption4` / `featureWarn` / `cherrypickBanner` / `functionDescription`
  - 説明文・チュートリアル系: `introMisskey` / `initialPasswordForSetupDescription` / `flagAsBotDescription` / `i18nInfo` / `repositoryUrlDescription`(URL も Forgejo へ差し替え) / `youCanContinueTutorial` / 各種チュートリアル description / `_selfXssPrevention.description3` / `_emojiPalette.dummy` / `driveFileDurationWarnDescription` / `_signupRoles.text1`
  - 実績: `_login1000.flavor` / `_client60min.title` / `_tutorialCompleted.title`
- **`setNameToHatacha` 実績の新設**: 名前を `hatacha` に設定すると解除される実績「神様コンプレックス（Hataskey）」を新規追加しました。既存の `setNameToSyuilo`(syuilo)・`setNameToNoriDev`(noridev) と並列に配置し、Misskey / CherryPick / Hataskey 各派生の開発者ジョークを3段構えで揃えます
  - `locales/ja-JP.yml`: `_setNameToHatacha` エントリを `_setNameToNoriDev` の直後に追加
  - `packages/frontend/src/utility/achievements.ts`: 実績名リストとアイコン定義を追加(既存 noridev と同じ /fluent-emoji/1f36e.png + 同配色)
  - `packages/frontend/src/pages/settings/profile.vue`: `profile.name === 'hatacha'` で `claimAchievement('setNameToHatacha')` を発火
  - `packages/backend/src/models/UserProfile.ts`: 実績名リストに追加
  - `packages/cherrypick-js/src/autogen/types.ts`: `AchievementName` union 型に追加(2箇所)
- **ピル型タブで10ページのナビを統一**: 通知 / フォロー申請 / チャンネル / お知らせ / みつける (explore) / メッセージ (chat/home) / サーバー情報 (`about.vue`、概要・絵文字・連合・チャート) / Play (`flash/flash-index.vue`) / クリップ一覧 (`my-clips/index.vue`、マイクリップ・お気に入り) / ページ一覧 (`pages.vue`、人気・自分のページ・いいねしたページ) のタブUIを、PageWithHeader のヘッダタブから body 上部のピル型タブに刷新しました。各ページとも `PageWithHeader` の `:tabs="[]"` でヘッダタブを非表示にし、`<div :class="$style.htkPillTabs">` + `<button v-for>` ループでピル型タブを実装。共通スタイル仕様 (sticky top:0, z-index:50, color-mix半透明背景 + backdrop-filter:blur(12px), border-radius:999px, hover で accentedBg, active で accent + fgOnAccent, 横スクロール対応) を各ページの `<style module>` (または `<style scoped>`) に直書きしています。チャンネルページとページ一覧は `$i ? headerTabs : headerTabsWhenNotLogin` でログイン状態に応じてタブ数を動的切替(チャンネル 5/2、ページ一覧は非ログイン時「人気」のみ。ページ一覧はピル描画用に `pillTabs` computed を追加)、フォロー申請ページは既存の `<style scoped>` 形式に合わせて `class="htk-pill-tab"` 形式で実装しています。なお、プロフィール (`user/index.vue`) はバナー / アバターと一体化した `:user` 付き専用ヘッダーのため、ピル化するとレイアウトが干渉する恐れがあり、本リリースでは見送っています
- **通知ページから「新規投稿」タブを廃止**: 通知ページのタブ構成を「全て / メンション / 指名」の3タブに簡素化しました。`newNote` タブのテンプレート分岐、`newNoteExcludeTypes` computed、`headerTabs` 配列の該当エントリを削除。新規投稿の確認はホームタイムラインで十分という判断です
- **横長カスタム絵文字でのリアクション表示崩れを修正**: 単独リアクション通知のサブアイコン枠 (アバター右下の小さな円) と、リアクショングルーピング一覧 (`reactionsItemReaction`) の両方で、横長のカスタム絵文字が円形 20x20px 枠に潰されていた問題を修正。`subIcon_reaction` バリアントクラスを `notification.type === 'reaction'` 時に追加で適用し、`width: auto; min-width: 20px; max-width: 60px; border-radius: 6px;` で角丸長方形化、`object-fit: contain` で枠内収まりを保証しています
- **hatask 通知のアイコンを文字 (絵文字) ベース化**: hatask の通知 (カレンダー予定 / きもち記録リマインダー) のアイコン枠が空白になる問題を、`MkNotification.vue` 側で `type === 'app' && !notification.icon && header マッチ` の分岐を追加して解決しました。header に「カレンダー / イベント / スケジュール / 予定」が含まれる場合は 📅 を、「きもち / 感情 / 気分 / ムード / 記録」が含まれる場合は ♡ を、円形背景 (それぞれ `--MI_THEME-accent` / `--eventReactionHeart`) の中に文字として表示します。サーバーアイコン URL フォールバックは採用していません (header 文字列で十分判定可能)
- **アプリ通知 (type: 'app') にクリック時遷移先 (link) を追加**: `notifications/create` API に `link` パラメータを追加し、`/` 始まりの相対パスのみを許可する validation (`INVALID_LINK` エラーで絶対URLや `javascript:` / `//` を拒否) を実装しました。`Notification.ts` の `app` type に `customLink: string | null` フィールドを追加、`NotificationEntityService` のレスポンスに `link` フィールドを含め、`MkNotification.vue` で `notification.link` がある場合は本文を `<MkA :to="notification.link">` でラップしてクリック可能化 (`.appLink` クラスで hover 時 `--MI_THEME-accentedBg` 背景に)。`hatask.vue` の `sendNotification` 関数に `link` パラメータを追加し、カレンダー通知に `/hatask?tab=cal`、感情記録通知に `/hatask?tab=mood` を渡しています。`hatask.vue` 側の `onMounted` 冒頭で `URLSearchParams` を読み取って初期 activeTab を URL クエリから設定する処理も追加(軽量実装、本格的な URL ⇔ tab 双方向同期は実装せず)。Notification は Redis Stream 保存のためマイグレーション不要、`NotificationService.ts` も `data` 引数の型推論で自動対応のため変更不要
- **新規グループ通知タイプ `reaction:groupedByUser` を追加**: 同じユーザーから複数ノートへのリアクションを集約する新規グループタイプを実装しました。`Notification.ts` に新型を追加 (`notifierId` + `reactions: { noteId, reaction, createdAt }[]`)、`types.ts` の `groupedNotificationTypes` に `'reaction:groupedByUser'` を追加、`notifications-grouped.ts` の集約ループに新ロジックを追加 (隣接する同じ notifierId / 異なる noteId のリアクションを集約)。優先順位は「同じノートへの複数ユーザーリアクション (既存 `reaction:grouped`) → 優先」「prev が既に `groupedByUser` に組み込み済みなら新規エントリ化する保護ガード」を実装し、ハイブリッドシナリオでの破壊を防いでいます。フロント側 (`MkNotification.vue`) は新型のアイコン (ユーザーアバター)、ヘッダー (ユーザー名 + 「が N 個のノートにリアクションしました」)、本文 (各リアクション + ノート要約を縦並びで MkA リンク化) を実装。日本語ハードコードを避けるため `locales/ja-JP.yml` に `reactedToMultipleNotes` キーを追加し、`locales/index.d.ts` にも応急的に型定義を追加 (本来は `generateDTS.js` で自動生成されるため、`pnpm build` 時に再生成されて衝突なく上書きされます)。`packages/cherrypick-js/src/autogen/types.ts` には新型を手動追加 (`pnpm update-autogen-code` で正規再生成可能)
- **旗鯖新機能ページにこのバージョンの利用者向けカード3件を追加 + 既存ログイン関連カード整理**: ピル型タブ統一、通知の見やすさ改善、hatask 通知進化の3カードを `hata-whats-new.vue` の features 配列先頭に追加しました。技術用語を避け、利用者目線で「何が変わったか」「何が嬉しいか」を伝える文章にしています。また既存の `welcome-redesign-board` カード(回覧板リデザインは白紙撤回)を削除し、`login-page-redesign-2` カードと `hataskey-brand` カードを `hataskey-brand-login` 統合カード 1個にまとめました(2段ロゴ + text-stroke 視認性確保の現状を1カードで表現)
- **登録申請システムのプライバシー保護・重複チェック拡張**: 登録申請が拒否された際の利用者プライバシー保護と、連続申請の悪用防止を目的に登録申請システムを大幅に改修しました。旗鯖は本家 Misskey の `signup` (即時アカウント発行) ではなく独自の `registration/apply` (管理者承認制) を使っており、申請レコードがそのまま DB に長期保存される性質上、特に却下された申請者の個人情報保護が運用上の課題でした
  - **モデル拡張 (nullable 化 + 削除日時記録)**: `registration_application` テーブルの `username` / `hashedPassword` / `email` カラムを NOT NULL から NULL 許可に変更し、新規カラム `personalDataDeletedAt` (個人情報削除実行日時) を追加。マイグレーション `1778000000000-nullable-and-deleted-at-registration-app.js` を追加 (misskey-hata 側は `1775000000000`)
  - **拒否時の個人情報即時削除**: `admin/reject-registration.ts` を改修し、申請拒否時に `username` と `hashedPassword` を即座に null セット、`personalDataDeletedAt` に削除日時を記録します。`email` のみは同一メールアドレスからの連続申請を拒否するため CleanProcessor の既存ルール (rejected レコード 90日保持) に従って自動削除されます
  - **メールアドレス重複チェック追加**: `registration/apply.ts` に `EMAIL_ALREADY_EXISTS` エラー (`a0000001-0001-0001-0001-000000000007`) を追加。pending または rejected で email が残ってるレコードと重複する申請を拒否します。これにより「ID を変えて連続申請してくる嫌がらせ」もメールアドレスで縛れます
  - **メールアドレス形式検証**: `INVALID_EMAIL` エラー (`...000006`) を追加し、制御文字・空白・複数 @ を弾く正規表現バリデーション (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) を実装。`username` 最大長を 20 文字、`password` を 8〜64 文字 (bcrypt 72バイト制限考慮)、`email` を 5〜256 文字に paramDef レベルで厳格化
  - **username 重複チェック拡張**: `pending` だけでなく `rejected` (旧仕様未クリーンアップで username が残ってるレコード) も重複扱いに含めるよう変更。新仕様で reject された ID は他人 (本人含む) が即座に再利用可能 (username = null になってるので重複検索にヒットしない)、旧仕様データは一括クリーンアップ完了まで重複扱い、というハイブリッド挙動
  - **`username/available` API のリアルタイム検証拡張**: `registration_application` の pending / rejected (username 残存時) もチェック対象に追加 (`exist3` 判定)。申請フォームの ID 入力欄での「既に申請中のIDか、既に使用されているIDです。」赤字メッセージ表示にリアルタイム連動するようになりました
  - **既存データ一括クリーンアップ API の新規追加**: `admin/cleanup-legacy-rejected-registrations.ts` を新規追加。旧仕様 (今回の改修前) で reject された rejected レコードに残ってる username / hashedPassword を一括で削除する管理者向け API。`execute: false` で dry-run (件数確認のみ)、`execute: true` で実削除。レスポンスに `cleanedCount` / `alreadyCleanedCount` / `emailRetainedCount` を含めて状況可視化
  - **コンパネ UI 拡張 (サマリパネル + 状態バッジ + クリーンアップボタン)**: `admin/registration-applications.vue` を大幅刷新。却下済みタブで上部にプライバシー保護サマリパネル (削除済み件数 / メール保持中件数 / 旧仕様未クリーンアップ件数 + 該当時のみクリーンアップボタン表示)、各申請カードに個人情報削除状態バッジ (緑「ID・パスワード削除済み + 削除日時」/ 黄「メール保持中 + 却下後N日経過 / 90日で自動削除」/ 赤「ID・パスワード未削除 (旧仕様)」)、旧仕様データの一括クリーンアップボタン (dry-run + 実行確認モーダル付き) を追加。`admin/registration-applications.ts` のレスポンスに `personalDataDeletedAt` / `rejectedAt` を追加
  - **申請フォーム改善 (プライバシー情報ボックス + メアド赤字エラー)**: `MkRegistrationApplication.vue` の送信ボタン直前にプライバシー情報の取り扱い説明ボックスを新規追加 (`ti ti-info-circle` ℹ️ アイコン、承認時のメール用途 / 拒否時の ID パスワード即時削除 + メアド 90日保持 / 重複時の注意を整理)。メアド入力欄に重複エラー表示用 caption を追加し、サーバーから `EMAIL_ALREADY_EXISTS` が返ったら `emailUnavailable.value = true` で赤字メッセージ表示 + モーダル通知。メアド変更時は自動クリア (`onEmailChange`)。`USERNAME_ALREADY_EXISTS` / `EMAIL_ALREADY_EXISTS` / `INVALID_EMAIL` のエラーコードハンドリングを追加し、それぞれ適切な日本語メッセージを表示
  - **申請完了画面のシンプル化**: `MkSignupBranchDialog.vue` の申請完了画面を 3 行 (承認 2-3 日 / 承認されなければメール送信なし / 基準非公開) のシンプル形式に整理。プライバシーの詳細はフォーム送信前のプライバシー情報ボックスで案内する形に集約し、完了画面の冗長感を解消
  - **セキュリティ対策の継承と新規措置**: 既存の `registration/apply` のレート制限「1IP / 1時間 2回」をそのまま維持。これにより大量メールアドレスを使った検証攻撃 (アカウント存在チェックの脆弱性) は実用上困難。新規追加 API (`reject-registration` 改修版 / `cleanup-legacy-rejected-registrations` / `registration-applications` 改修版) はすべて `requireModerator: true` で保護され、一般ユーザーからは叩けません。XSS / SQL Injection / CSRF についても監査済み (Vue 自動エスケープ + TypeORM パラメータバインディング + Misskey 標準保護機構を継承)
  - **misskey-hata 側にも同等の変更を適用**: マイグレーション番号を `1775000000000` に変更し、入力検証の厳格性 (`username: 20` / `password: 8-64` / `email: 5+` + 正規表現) を misskey-hata と完全統一。両 fork の登録申請関連実装はマイグレ番号と SDK パッケージ名 (`cherrypick-js` vs `misskey-js`) の差を除いて完全に同一動作仕様
  - **ライセンス表記の整理 (SPDX-FileCopyrightText の細分化)**: 今回追加・改修した 10 ファイルについて、ファイルの著作権実態に合わせて SPDX 表記を整理しました。Type 1 (本家コードを含む派生著作物 = 8 ファイル) は hataskey-hata では `syuilo and misskey-project` + `noridev and cherrypick-project` + `Tolehata and hatasaba-project` の 3 者並列、misskey-hata では `syuilo and misskey-project` + `Tolehata and hatasaba-project` の 2 者並列。Type 2 (完全新規著作物 = 2 ファイル: `cleanup-legacy-rejected-registrations.ts` と マイグレーション) は両 fork とも `Tolehata and hatasaba-project` のみ。これにより「どこまでがオリジナルなのか」がファイル単位で明確化されました
- **Hatask に食事記録 (ごはん記録) 機能を追加**: hatask の「きもち」記録と並列で、食事の記録を補助する meal タブを新設しました。1 件の記録は「いつのごはん (朝 / 昼 / 夜 / 間食)」「食べれたか (食べれた / 少しだけ / 食べれなかった の 3 段階)」「理由 (任意・複数選択 + 自由記述)」「ひとこと (任意)」で構成されます。**摂食障害への配慮を設計制約とし**、カロリー計算・数値管理・達成率や連続記録のスコア化・グラフ化は一切行わず、3 段階はすべて中立・等価に表示します (「食べれなかった」を赤やバツで強調しない)。理由チップは「少しだけ」「食べれなかった」を選んだときだけ任意で表示し (「食べれた」では理由を聞かない)、体型・体重・カロリーに触れる選択肢は置いていません。サマリーは記録した行為そのものを中立に労うメッセージのみで、食事状況を判定した能動的な声かけ・通知は行いません。本機能は医療目的ではない旨の免責ダイアログを meal タブの初回表示時に必ず表示し (既読フラグ `mealDisclaimerShown` を registry settings に同期)、以降は右上の「!」マークからいつでも再表示できます。データは registry (`meals`、scope `['client','hatask']`) に保存し、エクスポート機能は設けていません
- **ノートヘッダーのアカウント名を表示名の横に配置**: `MkNoteHeader.vue` で、これまで表示名の下段に縦積みされていたアカウント名 (@id) を、表示名・各種バッジ (鍵 / Bot / Proxy / ロール) と同じ横並び (`align-items: baseline`) コンテナの末尾に移動しました。「表示名 → バッジ → @id」が横一列に並びます。`.username` の `flex-shrink: 9999999` は維持しているため、横幅が足りない場合は @id が先に省略されて表示名が残ります。テンプレートの 1 要素の移動のみで、スクリプト・スタイル定義は変更していません
- **独自ゲームのカスタム絵文字使用を全廃し Unicode 絵文字のみに統一**: 本家 Misskey の絵文字系ゲームがカスタム絵文字を使わないのに倣い、Hataskey の独自ゲーム 3 種 (つみつみタワー / 絵文字たたき / カスタム絵文字シュート) からカスタム絵文字の参照 (`@/custom-emojis.js`) を全削除し、Unicode 絵文字のみで動作するようにしました。各ゲームの `buildPool()` を Unicode 絵文字プール生成に書き換え (絵文字シュートのプレイヤー機体は固定の 🚀 を使用)、未使用となった import を除去しています。なお hata-11.0 で実装した「カスタム絵文字 / Unicode / ミックス」の 3 モード対応は、このリリースで撤去されました
- **つみつみタワーから「絵文字モード」(gameMode) を UI / API / DB から完全撤去**: 上記のカスタム絵文字全廃に伴い、つみつみタワーに残っていた絵文字モード (custom / unicode / mix) の概念を全廃しました。フロントではモード選択 UI・ランキングのモード切替タブ・マイスコアのモード表示を撤去し、ゲーム起動 URL とスコア登録 API から `mode` / `gameMode` を除去。バックエンドでは `StackingGameRecord` / `StackingGameRoom` エンティティから `gameMode` カラムを削除、`StackingGameRoomService` の `createRoom` 引数・`packRoom` から除去、register / ranking / my-scores / create-room の各エンドポイントから `gameMode` のバリデーション・許可リスト・絞り込みを削除しました。ランキングは全レコードからユーザー別ベストスコアを集計する単一の統合ランキングになります。マイグレーション `1779000000000-remove-stacking-game-mode.js` を追加し、両テーブルから `gameMode` カラムを DROP します (down でカラムは復活できますが、過去スコアの元のモード値は復元できません)。AI 対戦のスコアも通常スコアと区別なく記録されるようになりました。**※ 本家由来の bubble-game の `gameMode` は対象外で、一切変更していません**
- **絵文字たたき / 絵文字シュートのルールモードは維持**: 上記の撤去対象は「絵文字の種類を選ぶモード」のみです。絵文字たたきの「通常 / エンドレス」、絵文字シュートの「ノーマル / デバフ」(`EmojiShootRecord.mode`)、つみつみタワーの AI 難易度選択 (`aiLevel`: よわい / むずかしい / つよすぎる / エグい) は、絵文字の種類とは無関係なゲームルールのモードのため、いずれもそのまま維持しています
- **絵文字叩きゲームを「絵文字基準」の設計に再構成し、同時出現の不具合を修正**: 絵文字叩きゲームの内部設計を、従来の「セル(穴)ごとに状態とタイマーを持つ」方式から、「画面に存在する絵文字をエンティティ(Mole)の配列で管理し、セルは表示枠に徹する」絵文字基準の方式に作り変えました。これに伴い、レベル(出現頻度)が上がったときに発生していた 2 つの不具合を修正しています。(1) 同じセルに絵文字が重なって出現する問題は、絵文字が存在しない空きセルからのみ出現させることで構造的に解消しました。(2) 複数のセルから完全に同じ瞬間に一斉出現する問題は、出現処理を一定間隔の `setInterval` から「1 回出すごとに次回をジッター(±25%)付きで予約する自己再帰スケジューラ」に変更することで解消しました。同時に複数体が出ること自体は難易度表現として残し、上限 (`maxVisible`) で抑えています。AI 対戦側の盤面も同じ絵文字基準の設計に揃えています。<br>また、絵文字の表示位置はピクセル座標を一切持たず、CSS Grid の格子 (`repeat(3, 1fr)` + `aspect-ratio`) にスロット番号で配置する方式としたため、プレイ中にウィンドウサイズが変わっても描画が崩れません。押しそびれ猶予 (grace) ・ライフ・スコア・各種演出・AI の反応挙動・エンドレスのレベル計算など、既存の手触りは維持しています
- **お絵かきツールを Version 2.4 に更新**: お絵かきツールのバージョン表記を 2.3 から 2.4 に更新しました
- **旗鯖機能解説 (`/hata-docs`) に新機能の解説を追加**: 機能解説ページに「ごはん記録」の項目を追加したほか、新たに「ゲーム」カテゴリを設け、Hataskey Games の概要・つみつみタワー・絵文字叩きゲーム・カスタムエモジシュート・(本家由来の) バブルゲームの各解説を追加しました
- **ベース Misskey バージョン表記を 2026.5.4 に更新**: 本家 Misskey 2026.5.1〜2026.5.4 の変更を取り込んだことを反映し、`package.json` の `basedMisskeyVersion` を `2025.10.2` → `2026.5.4` に更新しました (この値はビルド時に `built/meta.json` 経由でフロントへ注入されるため、DB マイグレーションは不要)。あわせて、サーバー情報ページ (`about-misskey.vue`) の `v{basedMisskeyVersion} (Based on Misskey)` クリック時のリンク先を、アンカーが効くか不確実だった `blob/develop/CHANGELOG.md#...` から、実在が確実な本家 Releases の該当タグ (`https://github.com/misskey-dev/misskey/releases/tag/2026.5.4`) に変更しました
- **自動送信メールの定型文から韓国語を除去 (英語 + 日本語に統一)**: CherryPick が韓国語フォーク (NoriDev) 由来であることの名残で、サーバーから自動送信される一部の通知メールの定型文が「英語 / 日本語 / 韓国語」の 3 言語併記になっていました。日本語サーバーとして不要な韓国語部分を除去し、英語 + 日本語の 2 言語に統一しました。対象は (1) 新しいログインがあった際のセキュリティ通知メール (`SigninService.ts`、件名 `New login / ログインがありました`)、(2) モデレーター不在に関する管理者向け通知メール 3 通 (`CheckModeratorsActivityProcessorService.ts`: モデレーター不在の警告 / 招待制への自動変更 / パブリック投稿の自動無効化) です。あわせて、韓国語専用だった時間表記の変数 (`timeVariantKo`) も未使用となるため削除しました。英語表記は、海外からの不正アクセス時にも警告内容が伝わるよう残しています。なお、パスワードリセット・メールアドレス認証・アカウント削除・通報通知などの他の自動送信メールは元々英語 + 日本語のみで韓国語を含んでいなかったため、変更していません (バックエンドのメール送信系ファイル全体を走査し、韓国語の残存がないことを確認済み)

### このforkでは以下の本家由来の更新は取り込んでいません

CherryPick 独自実装との衝突・整合性検証コストの観点から以下を見送りました:

- **Announce ロック修正 (#17356)**: CherryPick 独自リレー判定ロジック (`appLockService.getApLock` / `fromRelay` 分岐) と衝突。再実装が必要なため別タスク化
- **canCreateChannel ロールポリシー (#17121)**: CherryPick 独自フロント UI (`MkFolder` 形式) で書き直しが必要なため別タスク化
- **summaly 更新 (#17355)**: ライブラリバージョン整合の検証コスト回避のため見送り
- **MkNoteDetailed 公開範囲表示改善 (#17374)**: CherryPick 側で 2025年1月に独自取り込み済み (`bd4ee30f6b`)
- **パスキーライブラリ更新 (#17354)**: CherryPick の argon2 独自実装と完全衝突するため見送り (2FA への影響回避)
- `chore(deps)` 各種、GitHub Actions / Crowdin 翻訳更新、CHANGELOG/バージョン bump
- テーマプレビュー機能のクラス化リファクタ (ThemeManager 化) およびそれに依存するコンポーネント変更 (`MkCropperDialog` / `MkFolder` / `MkFoldableSection` / `MkAnalogClock` の色取得方式変更など)。次回、ビルド検証を行いながら対応予定
- 5.1 で本家が追加した `canCreateChannel` ロールポリシー等は、hata-11.3 既存方針どおり CherryPick 独自 UI との整合検証コストの観点から引き続き見送り

## hata-11.2
 
CherryPick 側はベースバージョン (Misskey 2025.10.2 相当) との差異が大きいため、
本家 2026.5.0 のうち**バグ修正のみ**を厳選して取り込みました。
機能追加 (アバターデコレーションカテゴリ等) は対象外です。
 
### バグ修正 (本家由来)
 
- `/api-doc` にアクセスできない問題を修正 (#17267)
- `alsoKnownAs` を array / string 両形式でサポート (#17275)
- ID生成アルゴリズムにULIDを使用している場合の不具合を修正 (#17310)
- ノート通知で公開範囲が考慮されていない問題を修正 (#17335)
- ブロックしたサーバーからの Inbox ジョブが蓄積し続ける問題を修正 (#17336)
- 存在しないリモートアカウントに対する Delete アクティビティの取扱いを改善 (#17294)
- `RoleService.getAdministratorIds` でユーザーIDが重複する問題を修正 (#17334)
- meilisearch 設定下での `noteSearchableScope` 値誤りを修正 (#17341)
- `activity.actor` を `getApId(activity.actor)` で正規化 (#17340)
- `robots.txt` の内容を調整 (`customRobotsTxt` 優先は維持) (#17165)
- inbox jobs の role-based validation 再試行を防止 (#17167)
- ドライブへの画像アップロード時にファイル名の変更が無視される不具合を修正 (#17302)
- 連合が無効化されたサーバーで Instance Ticker 設定が空欄表示される問題を修正 (#17303)
- `bannerUrl` が空の場合に `/about` ページで `/null` へのアクセスが発生する問題を修正 (#17299)
- リレー Announce 取扱いの一部を取り込み: `RelayService.isRelayActor` ヘルパー追加 (#17308 部分取り込み)
### セキュリティ対応
 
旗鯖独自実装に対する複数のセキュリティ修正を適用しました。詳細は非公開とします。
 
### 旗鯖独自機能改善
 
- 通知バッジの件数表示化
- 外部TLバッジ復活問題の修正
- 外部リアクションピッカーの全面改修
- 絵文字叩きゲームの修正
- 上部ナビバーのアクティブタブ強調
- 旗鯖機能解説の移設 (サイドバー → 「もっと!」/「ヘルプ」内)

## hata-11.0 (2026/04/09)

### 新機能 — ゲーム
- つみつみタワー: 絵文字を積み上げてハイスコアを目指す物理演算パズルゲームを実装しました。カスタム絵文字/Unicode絵文字/ミックスの3モードに対応しています
- 絵文字叩きゲーム: 3x3グリッドに出現する絵文字を素早くタップして撃破するアクションゲームを実装しました。通常モード（30秒制限）とエンドレスモード（ライフ3制 + レベル自動上昇Lv1→10）に対応しています
- カスタムエモジシュート: Wave制の絵文字弾幕シューティングゲームを実装しました。長押し連射、パワーアップアイテム（⚡連射速度UP / 🔱3方向発射 / 🛡️シールド）、エンドレスWaveシステムに対応しています
- AI対戦: つみつみタワーと絵文字叩きゲームで4段階（よわい/むずかしい/つよすぎる/エグい）のAI対戦を実装しました
- サーバー対戦: WebSocket（Redis pub/sub経由）を使ったリアルタイム対戦機能を実装しました。ロビー・観戦・通信切断時の自動敗北処理に対応しています
- ランキング: 全ゲームでサーバー内ランキングを実装しました

### 新機能 — その他
- フォント変更: UIフォントを M PLUS Rounded 1c に変更しました（Google Fonts CDN経由）
- Forgejo CI: リント（ESLint / TypeCheck）とビルドチェックのワークフローを整備しました（手動実行）
- ミュートユーザーリアクション非表示: ミュートしたユーザーのリアクションを非表示にするオプションを追加しました（旗鯖独自設定から切り替え可能）。サーバー管理者・モデレーターは除外されます

### 改善
- 外部アカウント連携: 免責ポップアップのキャンセルが機能しない問題を修正、「シュリンピア連携」→「外部アカウント連携」に名称変更
- ランキングのカスタム絵文字表示: ユーザー名のカスタム絵文字が画像として正しく表示されるようになりました

### バグ修正
- GlobalEventServiceで@bindThisデコレータが重複していた問題を修正
- MkReactionsViewer.reaction.vueでpreferのimportが重複していた問題を修正
- ServerModuleにStackingGameRoomChannelServiceとWhackEmojiRoomChannelServiceが未登録だった問題を修正
- universal.vueでtempUI変数のスコープが不正でReferenceErrorが発生する問題を修正

### 削除
- BGM機能の削除: 開発中につみつみタワーへ仮実装されていたBGM機能を削除しました

---

## hata-10.8 (2026/04/07)

### 新機能・改善
- シンプルUIの全面リニューアル: 上部ナビバーにリスト・チャンネル・アンテナボタンを追加し、主要機能へのアクセスを改善しました。PC/タブレット表示時は左にサイドバー、右にウィジェットバーを常時表示するようにしました
- オリジナルサイドメニュー: モバイルではすりガラス風バナー背景付きのオリジナルスライド式サイドメニューを導入しました。サイドバーにTL設定やリアルタイムモード切り替えも追加しました
- オリジナルユーザーパネル: タイムラインのアバターやユーザー名クリックで、プロフィール情報・最近のノート・フォロー/ミュート/ブロック操作が行えるオリジナルパネルが表示されるようになりました。シンプルUIではサイドパネル、標準UI・デッキUIではドラッグ移動可能なポップアップとして表示されます
- 投稿の吹き出し（バブル）デザイン: タイムラインの投稿を吹き出しデザインに変更し、アイコンが呟いているような見た目にしました。デッキUIではノート間に区切り線も追加しました
- ウィジェットのテーマカラー縁色: ウィジェットにテーマカラーに合わせたglow風の縁色を追加しました。旗鯖独自設定からON/OFFを切り替えられます
- 旗鯖独自設定の拡充: 設定画面に「旗鯖全体」「シンプルUI」のカテゴリタブを導入し、ナビバーの並び替えや表示/非表示設定をプロファイル同期対応で追加しました
- 管理者メニュー: 管理者/モデレーターのユーザーには、サイドバーにコントロールパネルへのボタンが表示されるようになりました
- HATAlyzeの統合: Hataskの独自アプリグリッドにHATAlyze（性格診断）へのボタンを追加し、旗鯖機能解説ページにも詳細な解説を追加しました
- ホームアイコン再タップでトップへ: ホームアイコンを再タップすると、タイムラインの一番上にスムーズスクロールで戻るようになりました
- 新規ユーザーのデフォルトUI変更: 新規ユーザーのデフォルトUIをシンプルUIに変更しました
- ノート本文の間隔表示: showGapBodyOfTheNoteをデフォルトでONに変更しました

### バグ修正
- Hatask: チュートリアルの最後に空白ページが表示される問題、RSVP・みんなの予定が表示されない問題を修正しました
- ユーザーパネル: アバタークリックでパネルが開かない問題、カスタム絵文字が表示されない問題、自分自身をフォロー/ミュート/ブロックできる問題、ポップアップ外クリックで閉じない問題などを修正しました
- サイドメニュー: 「もっと！」が開かない問題、ポップアップが背後に隠れる問題、アイコンと名前の位置ずれ、モバイルでオリジナルメニューが使われない問題を修正しました
- レイアウト: 投稿のアイコンと本文のずれ、ウィジェット縁色が適用されない問題、デスクトップでナビバーが中央にならない問題、不要な下部ナビバーが表示される問題を修正しました
- 吹き出しデザイン: テンプレート破損によるビルド失敗、Safariでのスクロールバー残留、外部ノートへの不要なスタイル適用、チャンネルTLでバブルが表示されない問題を修正しました
- その他: リアルタイムモードOFF時のエラー、設定の並び替えが即座に反映されない問題、ログインボーナスポップアップが設定を無視する問題を修正しました

---

## hata-10.0 (2026/03/09)

### セキュリティ
- Misskey 2026.3.1のセキュリティ修正を適用
  - WebSocketチャンネル（アンテナ・チャットルーム等）の認可チェック強化
  - HTTP署名検証バイパスの修正
  - noteStreamにvisibilityチェックを追加（フォロワー限定・ダイレクト投稿のイベント漏洩防止）
  - `/admin/get-user-ips` のアクセス権限を管理者のみに変更
  - インポート系エンドポイントにファイル所有権チェックを追加

### 機能改善
- アップデート後の「リリースノートを見る」ボタンの遷移先を旗鯖独自リポジトリに変更
- シンプルUIで検索・通知ページに遷移した際にナビバーが消えてしまう問題を修正
- 旗鯖独自設定での、投稿フォームのハッシュタグボタン・お絵描きボタンの表示/非表示設定が反映されない問題を修正
- Hataskの「起動時に表示する」オプションが機能するように修正

### バグ修正
- Hataskの気持ち記録やお花などのデータが環境によって消失・不整合になる問題を修正

## hata-0.9 (2026/02/28) — メジャーアップデート

### 新機能 — Hatask（オールインワンダッシュボード）
- Hatask: カレンダー・ToDo・メンタル記録・お花育成・Hatask Eyeを統合したオールインワンダッシュボードを実装しました
- カレンダー・RSVP: シンプルかつ使いやすいカレンダーを実装しました。公開範囲を公開に指定した場合、その予定にほかのユーザーが参加するかどうかを確認できる参加確認機能が利用できます。リマインド機能にも対応しています
- ToDo: フォルダー分けに対応したToDoリスト機能を実装しました
- きもち記録: メンタルヘルス機能を実装しました。3件気分を登録すると、時間帯や日別などによって感情分析が行われます。リマインド機能にも対応しています
- お庭（お花育成）: サーバーの利用時間に応じて花が成長（約8〜32時間）するバーチャルガーデンを実装しました。125種類以上のお花やレアアイテムを内包し、ランダムな命名にも対応しています
- Hatask Eye: サーバー利用状況に基づくひとことメッセージを表示する便利機能を実装しました。10000通りのフレーズを搭載しています
- Hatask内検索: 予定・ToDo・感情記録を一つの検索窓から横断検索できる機能を実装しました
- スポットライトチュートリアル: Hataskがはじめての方向けに、視覚的にわかりやすいチュートリアルを実装しました
- 端末間同期: Hatask内のデータは旗鯖アカウントで自動同期されます。個別に同期をやめることも可能です

### 新機能 — シュリンピア連携
- 外部アカウント連携: シュリンピア以外の予期せぬ連携を防止する改善を実装しました
- 外部タイムライン: ノートのリアルタイム自動更新に対応しました。過去ノート閲覧時は自動更新が行われない仕組みも実装しました
- リアクション機能: リアクション同期が不十分だった点を改善しました
- 外部TL専用絵文字ピッカー: シンプルUIに合わせた新しい外部TL専用の絵文字ピッカーを実装しました
- お気に入りリアクション絵文字: 外部TLのリアクションピッカーに表示するお気に入り絵文字の登録・管理機能を実装しました
- 外部通知: 既読タイムスタンプによる未読判定付きの通知画面を整備しました

### 新機能 — UI・デザイン
- Hata-Modernデザイン: シンプルUI、hataskなどの多くの旗鯖独自機能で、シンプルかつ機能性が高いデザインを新たに採用しました
- シンプルTLの全面リライト: Hata-Modernデザインを採用し、ナビバーを整理して画面の情報量を増やす新デザインを採用しました
- 外部TL用ボトムバー: 外部TL専用の下部ナビバーを新たに実装しました（シンプルUI、デッキUI専用）
- UI切り替えモーダル文言変更: より分かりやすい文言に変更しました

### 新機能 — その他
- hata-docs: 旗鯖の全機能解説ページを整備しました
- 登録申請システム: 招待コードを持っていないユーザーでもサーバーへの参加申請を送信できる仕組みを追加しました。管理者用の申請管理画面では申請の確認・承認・却下が行えます。CAPTCHA認証・レートリミット・自動クリーンアップにも対応しています

### 改善
- お絵かきツール統合: 既存のお絵かきツールをHatask「旗鯖独自アプリ」からワンタップ起動する形に統合しました
- HATA CARD MAKER統合: 既存のカードメーカーをHatask「旗鯖独自アプリ」からワンタップ起動する形に統合しました
- ログイン日数機能統合: 既存のログイン日数機能をHataskホーム画面のコンポーネントとして融合しました
- リアクション絵文字非表示 モバイル対応: PC限定だった機能をモバイル端末でも利用可能に拡張しました
- 連携UI見直し: ボタン一つで連携完了できるよう改善しました
- 注意事項表示: シュリンピア接続時に注意事項を表示するように改善しました
- ナビバーテーマ追従: ライト/ダークモードに臨機応変に対応するように改善しました
- ボトムバー残留修正: 別画面遷移時にボトムバーを自動非表示にする機能を追加しました

### 修正
- リアクション二重カウント防止: 外部TLでリアクションカウンターが余計に1増える問題を解決しました
- リアクションAPI多重呼び出し防止: 誤リアクション/連続リアクション防止の仕組みを整備しました
- タッチ/マウス統一: リアクションツールチップがモバイル/PCの双方で利用可能になるよう修正しました
- モバイル長押し対策: リアクションツールチップホールド時の絵文字選択問題を修正しました
- 絵文字Proxyフォールバック: 絵文字が404で取得できない問題を改善しました
- ツールチップnullエラー修正: ツールチップが表示されないことがある問題を修正しました
- Teleport要素マーキング: UI切り替え時の要素残留問題を修正しました
- KeepAlive対応強化: 投稿フォームが二重で開く問題を修正しました
- スワイプナビゲーション改善: 意図しないスワイプを減らす対策を追加しました
- ダークモード修正: hataskのライトモードとの相性問題を解決しました
- ナビ残留修正: 下部ナビバーの残留問題を対策しました
- Eyeページ下部: ナビバーに隠れるコンテンツ閲覧問題を改善しました
- フッター復元修正: 複雑な遷移時にナビバーが消滅する問題を改善しました
- hata-docsリンク修正: リンク先への遷移問題を修正しました
- UIクリーンアップ強化: 不要な要素の自動クリーンアップを修正しました

### 削除
- cardMachine: サイドバーから削除（Hatask内からアクセスするため）
- drawing: サイドバーから削除（同上）
- loginBonus: サイドバーから削除（Hataskホーム画面に融合のため）
- support移動: 「CherryPickを支援」を「もっとみる」に移動しました

---

## hata-0.8 (2026/02/13)

### 新機能
- シンプルUIに外部タイムライン（OHTL/OLTL）を追加: シュリンピア連携済みの場合、シンプルUIのヘッダーに🦐H（ホームTL）/🦐L（ローカルTL）タブが表示されます。外部TLを有効化（OHTL/OLTL）の個別設定に対応しており、不要なタブを非表示にできます。スワイプ操作でも外部TLへ切り替え可能です
- リアクション非表示機能: PCではノートのリアクション絵文字を右クリック →「このリアクションを非表示」で、特定のリアクションをノート単位で非表示にできます。スマートフォン・タブレットでは現段階では完全な対応ができていません。非表示データは30日間保持され、期限が過ぎると自動的に復元されます
- 非表示リアクション管理ページ（新規）: 設定 → 旗鯖独自機能 → リアクション から、非表示にしたリアクションの一覧を確認・管理できます。ノートごとにグループ化された非表示リアクションの個別復元・一括復元が可能です。件数バッジで非表示中のリアクション数を設定画面上で確認できます

### 改善
- 旗鯖独自機能設定ページの整理: 「リアクション」セクションを新設し、リアクション関連の設定をまとめました。リアクション絵文字ミュートへの案内リンクを追加（「ミュートとブロック」の絵文字ミュートタブへ誘導）

---

## hata-0.7 (2026/02/11)

### 新機能
- Modern Simple UIの実装: スマホ操作に特化した、超軽量かつ高速なインターフェースを追加しました。左右スワイプでのTL切り替えや、タブ型UIに対応しています
- 新しいUI切り替え体験 (UI Switcher): デザインを一新したUI選択画面を実装しました。グラスモーフィズム（すりガラス風）デザインを採用し、選択後に即座に設定が反映される機敏性を備えています

### 改善
- ログイン日数確認機能の改善: 独自設定の保存方式を変更しました
- 起動ロジックの刷新: アプリ起動時にUIモードを判定する仕組みに変更し、既存UIとの干渉を防ぎつつ動作を軽量化しました

### 修正・変更
- ノート表示のデザイン更新（Misskey v202512.2相当）: Renoteヘッダーのレイアウト整理（アバター位置の視認性向上）や、削除されたRenoteの表示に対応しました
- UI切り替えボタンの挙動修正: ナビバーのアイコンをクリックした際、メニューを経由せずに即座に独自のUI選択画面が開くように変更しました
- 外部タイムラインの更新間隔を見直し、よりリアルタイムにTL情報を取得するようになりました。さらに、画像をクリックすると別タブで画像が展開されるようになりました

---

## hata-0.6 (2026/02/06)

### バグ修正
- ログインポップアップのオンオフ設定が反映されない問題を修正: 設定でオフにしてもポップアップが表示される不具合を解消しました
- タイムラインのアニメーション方向設定が反映されない問題を修正: 左/右/ランダムに変更しても常に上からのアニメーションになる不具合を解消しました

### 新機能
- サイドメニューに「カードメーカー」を追加: 旗鯖ポータルと同様に外部リンクとしてアクセスできます
- 管理者向け[BETA]：改変チェック機能を追加: コントロールパネル内でCherryPick本家との差分を確認できます。改変箇所の一覧、影響ファイル、変更行数などを表示

---

## hata-0.55 (2026/02/01)

### ログイン日数機能の改善
- ポップアップ表示設定の追加: 毎日最初のログイン時に表示されるログイン日数のポップアップをオン/オフできるようになりました
  - 設定場所: 設定 → 旗鯖独自機能 → ログイン日数 → 「ログイン日数のポップアップを表示」

---

## hata-0.5 (2026/01/28)

### シュリンピア連携機能
旗池２丁目でShrimpiaの投稿をウォッチ、および投稿作成・リアクション・リプライ・引用ができる機能を追加しました。

- 投稿フォームのアカウントメニューにシュリンピアアカウント（🦐）を追加
- シュリンピアアカウント選択時はアバターに🦐バッジを表示
- シュリンピアタイムラインのノートへのリプライが自鯖内で完結
- ファイル添付対応：自鯖ドライブのファイルを外部サーバーにアップロードして投稿可能（画像のみ）
- デッキUI、MisskeyUIでの使用をサポート

---

## hata-0.4 (2026/01/12)

### お絵描き機能の改善 (v2.3)
- レイヤー描画順序の修正
- マウスホイールで拡大/縮小
- ハンドツールボタン追加
- 2本指ピンチで拡大/縮小（スマホ）
- ミニマップ表示/非表示トグル追加

### ログイン日数機能の改善
- カレンダー月移動の修正
- ランキング機能追加

### タイムラインアニメーション機能
- 上からスライド（従来のデフォルト）
- 左からスライド / 右からスライド / ランダム

---

## hata-0.2 (2026/01/09)

### お絵描きツール v2.2
- 基本ツール: ペン、消しゴム、塗りつぶし、図形ツール、ぼかしブラシ、投げ縄、切り抜き
- レイヤー機能: 複数レイヤー、透明度、合成モード
- カラー機能: HSVカラーピッカー、16色パレット、HEXコード
- フィルター機能（12種類）

### ログイン日数 v1.0
- 累計ログイン日数の表示
- 月別カレンダー表示
- 実績連携（3〜1000日で自動解放）

---

## hata-0.1 (2026/01/03)

### 追加された機能
- ノート表示のオプション: クリックで詳細を開く機能のON/OFF切り替え
- 投稿フォームのオプション: ハッシュタグ/イベントボタンの表示切り替え
- 旗鯖ポータルへのリンク: サイドメニューに追加
- 旗鯖独自機能設定ページ: 設定画面に追加