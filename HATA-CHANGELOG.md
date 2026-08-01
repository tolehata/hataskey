# HATA-CHANGELOG

旗鯖独自フォーク (Hataskey-Hata) のチェンジログです。  
ベースフォーク CherryPick のチェンジログは [CHANGELOG.md](./CHANGELOG.md) を参照してください。

## hata-12.0

ベースを Misskey **2026.7.0** 相当へ更新する大型アップグレードです。関所方式 (G0〜G13) の選別適用で、上流差分 518 ファイル・319 コミットをファイル単位で取り込みました。マージ方針は「中和方式」(独自実装を本家コードで上書きせず、フォーク実装を base に本家要素を盛り込む) を原則とし、画像ビューワーのみ利用者裁定で本家新実装を優先しています。

### 動作要件の変更 (⚠️必読)

- **Node.js**: Docker イメージを **26.4.0-trixie** へ更新 (最低要件 22.22.2 / 24.17.0 / 26.4.0)
- **CPU**: sharp の要件変更により SSE4.2 非対応の x86_64 CPU では動作しません (現行サーバーは対応確認済み)
- **センシティブ判定 (NSFW検出)**: nsfwjs / TensorFlow / 判定モデル (22MB) を削除。外部サービス sensitive-detector への HTTP 呼び出し方式へ変更されましたが、**旗鯖では detector を立てない運用** (接続先 URL 未設定 = 判定なし・全て非センシティブ扱い)。将来使う場合はコンパネから URL を設定
- **YAMLパーサー厳格化**: 本番 default.yml は影響なし (該当キーはコメントアウト)。cypress 用 yml のフロースタイルはブロックスタイルへ修正済み

### 主な取り込み内容

- **画像ビューワー刷新・動画プレイヤー統合** (本家優先): MkLightbox ベースの新ビューワーへ移行。ホイールズーム・PinP・アップロード前プレビュー対応。photoswipe を完全削除。フォークの二段階センシティブリビール・アニメ画像連動・右クリック無効化 (disableRightClick prop として再設計) は温存。⚠️失われる機能: 動画のタイムライン内インライン再生 (フルスクリーン Lightbox へ統合)・動画の矢印キーシーク
- **ログ基盤刷新**: 構造化属性・エラー正規化・認証情報の自動秘匿・JSON 出力・ドメイン別ログレベル。シャットダウンを installShutdownSignalHandlers (10秒上限) へ一本化 (フォークのグレースフル切断は app.close() 経由で温存)
- **セキュリティ**: API エラー経路の構造化ログを確立し、telemetry(Sentry) へ未秘匿の API パラメータが送信され得た問題を修正。jwa 2.0.1 / jws 4.0.1 へ更新 (Node 26 の SlowBuffer 削除でプッシュ通知/OAuth が実行時クラッシュする問題)。admin/reset-password のチェックを上流の isAdministrator 方式へ強化
- **コントロールパネルから二要素認証を解除できるように** (admin/unset-mfa)
- **URLプレビュー**: 結果の内部キャッシュ、条件一致でサムネイルを隠す urlPreviewSensitiveList (フォークの SSRF 対策は温存)
- **クライアント Fix 群**: チャット IME 確定 Enter 誤送信・メンション色分けの大文字小文字・イベントリスナー解除漏れ (メモリ改善)・非ログイン時トップのスクロール・QR リーダー停止漏れ ほか
- **ツールチェーン**: TypeScript 6.0.2 / vite 8 (rolldown) / vitest 4 / pnpm 11 / sharp 0.35 / storybook 10

### セキュリティ修正 (⚠️アップグレード後の監査で発見・修正)

アップグレード完了後にフォーク独自バックエンド 85 エンドポイントを対象とした監査を実施し、**認証の付け忘れは 0 件**でしたが、**認可 (誰のデータか) の判定漏れ 2 件**を発見して修正しました。いずれも一般ユーザー権限で他人の私的データに到達できる状態でした。

- **HataFeed のコメント系に可視性チェックが無かった問題を修正**: イシュー本体は「セキュリティ対応カテゴリを非スタッフから存在ごと隠す」よう作られていましたが、コメント一覧・コメント投稿・賛同・コメントリアクションだけがその判定を通っていませんでした。イシュー ID を知っていれば、後からセキュリティ対応へ再分類されたイシューの会話を読み続けられる状態でした。`issues/show.ts` が持っていた判定を `FeedbackService.canViewIssue()` / `canViewComment()` として切り出し (挙動は不変)、4 経路すべてから呼ぶようにしています
- **Hatady の内容メモ・しおりが所有者以外に返っていた問題を修正**: `books/show` は学習ログだけを公開範囲で絞り、内容メモとしおりは本の ID だけで引いていました。他人のプロフィールから本を列挙できるため ID の推測すら不要な状態でした。所有者以外へは返さないようにし、あわせて `packBooks` の閲覧者 ID を必須引数化して呼び出し側に必ず判断させるようにしています (所有者本人の表示は不変)
- 単体テスト 13 件を追加 (陽性対照で検出器の生存を確認済み)

### 使い勝手の修正

- **UI 選択画面の下部が見切れて選べない問題を修正**: 画面より中身が高いときにスクロールできるようにしました (モバイルの安全領域にも対応)
- **「みつける」から前の画面に戻れない問題を修正**: HatasabaUI の下部ナビには「みつける」「チャット」が無いにもかかわらず、これらが本家準拠で「根の画面」として扱われ左上の戻るボタンが出ていませんでした。HatasabaUI では実際に下部ナビへ出ている項目だけを根として扱うようにしています
- **ミュートしたユーザーのリアクション非表示が正式機能に**: ベータ機能から「旗鯖独自設定 → 旗鯖全体 → リアクション」へ移動しました (設定値は端末ごとに保存されるため引き継がれます)
- **起動時のダイアログが重なって消える問題を修正**: 更新の案内・ログイン日数などが同時に開き、さらに更新ダイアログを閉じるとキャッシュ削除でページが再読み込みされるため、後続のダイアログが道連れで消えていました。1 つずつ順番に出す仕組みにし、「表示済み」の記録も**実際に閉じられたときだけ**付けるようにしたため、途中で再読み込みが挟まっても残りは次回の起動で出ます (ログイン日数がその日出なくなる問題も解消)
- **「もっと」からマスコットが辿れなくなっていた問題を修正**: 「もっと」はサイドバーに出ている項目を省く作りですが、その判定に本家 UI 用のサイドバー設定を使っていたため、HatasabaUI では**サイドバーにも「もっと」にも出ない**項目が生じていました (実測でマスコットの 1 件)。いま使っている UI のサイドバーで判定するようにしています (サイドバーで非表示にした項目は「もっと」に出ます)
- **「今回の更新内容」の案内を追加**: 更新後に 1 回だけ、旗鯖側で何が変わったかを一覧で表示します

### 花常 (はなつね)

- **帳面の「戻る」で物語が始まってしまう問題を修正**: 月選び・花手帖・設定・名鑑・イベント扉の戻る導線から、未読場面の提示を外しました (未読の取りこぼしは入場時と局の終わりに拾うため従来どおり読めます)
- **物語を読み終えた局に「パズルであそぶ / 物語を読み返す」の選択を追加**: クリア済みの局を月選びから押したときに選べます。街の様子の「たのみごと」から入った場合は従来どおり盤面へ直行します
- 街の様子の投稿を 77 本追加 (計 7,045 本)

### フォーク側の整理

- MkNote.vue は上流の useNote() アーキテクチャ移行を採用せずフォーク実装を据え置き (上流唯一の挙動修正はリファクタ由来回帰の自己修復でフォーク未踏を確認)。移行は別案件
- 2025.4.0 以前の設定移行処理 (pref-migrate.ts) を上流と同様に削除。store.ts の移行済み死にキー約 70 個を削除 (get-note-menu.ts の移行漏れ実バグも修正)
- フォーク実バグの修正: @vue/runtime-core モジュール拡張の誤り (隠れていた型バグ 8 件が判明・修正)・note.vue の未定義変数参照・locale 型定義の欠落キー

### 連合への影響

今回の上流サイクルに ActivityPub 関連コードの変更は 0 件 (差分全 518 ファイルを機械分類して確認)。監査でも、フォーク独自フィールドを AP へ送出・受理する箇所は 0 件と確認済みです。開発環境での総合検証 (G13) は合格 (migration 実DB適用 3 本・実機スモーク・新ビューワー配信・新形式ログ)。⚠️Node 22→26 で OpenSSL が変わるため、HTTP Signatures の実疎通確認は本番展開時に既知の連合先との受配送で実施すること (開発環境には連合先が無いため未実施)。

## hata-11.8

HatasabaUI のグラスモーフィズム基調刷新版「**HatasabaUI 2**」をベータ導入する UI 大型リリースです。ノート面のガラス調・カラム全体の透過統一・独立ウィンドウ化した設定パネル (ライブプレビュー付き) など、視覚と操作の両面を刷新しました。あわせて HatasabaUI デッキ (HatasabaUI 2 デッキ) にクリップ/お気に入りタブ・カラム個別リロード・チャンネル投稿ボタンを追加、チャンネル/プロフィール UI を HatasabaUI 統一のピル型に刷新、管理者向けの全チャンネル一覧タブ、Bot をタイムラインに表示しない設定 (許可アカウント指定可)、Twemoji アセット復活とマスコット最小化位置の恒久化などを行いました。連合 (ActivityPub) への影響はすべての変更でゼロを事前検証済みです (UI/クライアント側と 1 個の管理系エンドポイントのみ、AP 配送経路・ノート生成ロジック・federation queue には一切変更なし)。

### 主要機能: HatasabaUI 2 (グラスモーフィズム刷新) ベータ

HatasabaUI に「HatasabaUI 2」というグラスモーフィズム基調のバリアントを追加しました。ノートカードをテーマ accent 由来のガラス面 + `backdrop-filter` で描画し、上部/下部ナビバーも同じガラス面で統一します。旗鯖設定 → HatasabaUI 2 タブ内の「設定を開く」ボタンから **独立ウィンドウ** を開き、ON/OFF・透過率スライダー (0-100%)・吹き出しモード時の追加ガラス・プロフィールバナー無し時の背景などを個別調整できます。

- **設定はドラッグ可能な `MkWindow`**: 従来のモーダル (裏を触れない) から `MkWindow` に変更し、設定変更中も裏のタイムラインをそのまま操作・視認できるようにしました。「保存」で永続化 + 自動リロード、「初期値に戻す」で全値をリセット。透過率スライダーは値変更中のみ CSS 変数 (`--htk-glass-card-opacity`) を書き換えるライブプレビュー方式で、Firefox の range 入力上のホイールでスクロールを奪われる/値がリセットされる問題も回避しています
- **全ノート含有カラム/タブに透過率が反映**: HatasabaUI 2 有効時、ホーム/ローカル/グローバル/チャンネル/リスト/アンテナ/メンション/ダイレクト/外部 (OHTL/OLTL)/通知/クリップ/お気に入り/トレンドのすべてで、ノートカードが `--htk-glass-card-opacity` に連動して透過します。HatasabaUI 2 デッキ内の全カラムでも同じ挙動を保証
- **`MkNote` の article ガラス CSS を非モジュール tag セレクタでグローバル化**: `:global(html.hataGlassUi) .article` (module) だと Vue SFC のクラスハッシュ + `:global()` の組み合わせで解決されず、`<style>` (非module) の `html.hataGlassUi article` タグセレクタに移動して確実に適用されるようにしました。あわせて `MkStreamingNotesTimeline` の `:not([data-bubble]) article { background: panel !important }` を `html:not(.hataGlassUi)` にスコープし、!important による勝敗で透過が効かなかった問題も解消
- **色味/レイアウトはテーマ変数で追従**: `--MI_THEME-accent` / `--MI_THEME-panel` 経由なのでライト/ダーク切替やテーマ変更にそのまま追従します。透過率は `simpleUi.glassUiCardOpacity` (prefer 同期、default 55%) が boot 経由で `<html>` に注入されます。ON/OFF (`hataGlassUi` / `hataGlassUiBubble`) は端末ローカル (miLocalStorage) — モバイルで重い場合に PC でだけ有効化する運用を想定

### HatasabaUI デッキ (HatasabaUI 2 デッキ)

- **クリップ / お気に入りタブを追加**: これまでカラム未対応だったクリップと i/favorites (お気に入り) をカラムとして追加できるようにしました。`MkStreamingNotesTimeline` は WebSocket ストリーミング前提のため使えず、Paginator + `MkNote` で描画する専用の `MkDeckPaginatedNotes` を新規追加。favorites は要素が `{note}` でラップされているため unwrap 処理付き
- **カラム個別リロード**: 各カラムの三点メニュー/ヘッダのリロードボタンから、そのカラムのタイムラインだけを再取得できます。Paginator を作り直す方式で、内部状態も含めて全リセット
- **チャンネル投稿ボタン再設計**: HatasabaUI 2 デッキ限定のフローティング投稿ボタンを新設。従来デッキUIには表示しません (`showChannelPostFixedButton` を `isHatasabaDeck.value` に限定して二重表示を防止)
- **ウィジェット編集導線の変更**: `hatasaba-deck.vue` / `widgets.vue` からウィジェット追加/編集ダイアログをよりアクセスしやすい位置に移動し、旗鯖 UI からダイレクトに開けるようにしました

### Bot をタイムラインに表示しない設定 (許可アカウント指定可)

旗鯖設定 → 旗鯖全体タブに **「Bot 投稿の非表示」** セクションを追加しました。ONにすると、`isBot: true` なユーザーの投稿がタイムラインから消えます。例外的に表示したい bot は「許可アカウント」から個別に追加できます (`os.selectUser` によるユーザー検索ダイアログから追加/削除)。

- **親配列レベルで事前フィルタする実装**: `MkStreamingNotesTimeline` の v-for に渡す前に `visibleItems` computed で除外します。MkNote 内部の v-if で消すとセパレータ/広告 wrapper 等の親 div が残ってバラバラ高さの空白として見えてしまうため、配列レベルで詰めます。MkNote 側の `hideAsBot` 判定は通知/引用/埋め込み等この経路を通らない場所の防御として残しています
- **appearNote 経由の判定**: renote/quote ケースも `getAppearNote(note)` を通してから `.user.isBot` を見るため、bot を renote した通常ユーザーの場合は表示、通常ユーザーが bot を renote した場合は非表示、bot 自身のオリジナル投稿は非表示、と MkNote の appearNote ロジックと一致します
- **prefer 経由でマルチデバイス同期**: `simpleUi.hideBotsInTimeline` / `simpleUi.botAllowlist` は prefer 保存のため、1 端末で設定すれば他端末にも自動反映されます

### チャンネル / プロフィール UI をピル型に統一

- **チャンネル画面**: 検索/最新/ピン留め/カテゴリ 等のタブや、投稿一覧/ピン留めノート/フィード、ノート/リプライ/クリップ 等の切替を HatasabaUI 統一のピル型 (`MkTab` 拡張) に刷新しました。`MkTab.vue` にピル型バリアントを追加し、色/形/spacing を統一
- **プロフィール画面**: `index.timeline.vue` / `index.vue` / `notes.vue` のタブもピル型に統一。既存の CherryPick 標準タブの選択肢は残しつつ、旗鯖の UI トーン (背景 `accentedBg` / 角丸大きめ) に沿ったピル型を優先

### 管理者向け機能

- **全チャンネル一覧タブ**: `admin/channels/list` エンドポイントを新規追加 (`requireModerator` + `read:admin:channels` スコープ)。`packages/cherrypick-js/src/consts.ts` にスコープを登録。フロントの `pages/channels.vue` に管理者/モデレーター専用の「すべてのチャンネル」タブを追加し、通常ユーザーには表示しません
- **サブ管理者 UI の表示改善**: `channel-editor.vue` でサブ管理者一覧の表示を整理し、権限付与状態を分かりやすく表示

### バグ修正

- **Twemoji アセット欠落と `MkEmoji` のリアクティブ化**: `packages/backend/package.json` に `@discordapp/twemoji` 依存を明示的に追加 (transitive 依存喪失によるアセット欠落を根本修正)。`MkEmoji.vue` の絵文字画像パス生成を computed 化して、絵文字設定変更 (Twemoji↔ネイティブ切替等) がリアクティブに反映されるようにしました
- **フローティングマスコットの最小化位置**: 「最小化位置を設定」機能で座標が破綻して画面外に飛ぶケースがあったため、最小化位置を右下固定に統一しました。設定 UI からも該当項目を削除
- **HatasabaUI 2 の colorBar (チャンネル色縦バー) がリアクションを貫通する問題**: `mask-image: linear-gradient(to bottom, black 0%, black 55%, transparent 90%)` によるフェードアウトで修正 (DOM 構造は変えずに視覚的に消す)。あわせてアバターに重ならないよう HatasabaUI 2 モードでは `left: -10px` シフト + `border-radius: 20px` でノート外形と揃える
- **従来デッキUIで新規チャンネル投稿ボタンが二重表示される問題**: `showChannelPostFixedButton` を HatasabaUI 2 デッキ限定に変更
- **Bot 非表示時に空白が残る問題**: MkNote 内 v-if だけでは親 wrapper (セパレータ/広告) が残ってバラバラ高さの空白として見えるため、`MkStreamingNotesTimeline` の v-for に渡す前に `visibleItems` computed で除外する実装に変更
- **HatasabaUI 2 の日付セパレータ前後で白背景が残る問題**: `data-hatasaba-spacer="on"` ラッパの `> div > div` に対して `background: transparent` を強制し、MkNote root panel bg 残渣を除去

### 機能改善 / 要望対応

- **`MkHatasabaUiEditDialog` / `MkSidebarEditDialog` を非モーダル化 (`MkModalWindow` → `MkWindow`)**: 「並び替え中に裏の実際のサイドバー/ナビを見比べたい」というユーザー要望に対応。`MkWindow` には footer slot が無いため footer 相当を body 末尾に統合
- **旗鯖設定タブ再編**: HatasabaUI 2 タブは「設定を開く」ボタン 1 個に集約 (独立ウィンドウ経由でアクセス)。旗鯖全体タブに Bot 非表示設定を追加。並び替え設定の書き出しモーダルも `MkWindow` 化
- **`.dockerignore` に `**/node_modules` (全階層) を追加**: サブパッケージの node_modules がホスト側からコンテナに紛れ込むケースを防止。11.7.7 の Dockerfile / .dockerignore 恒久対策の追加分

### 連合への影響 (事前検証済み: ゼロ)

11.8 のすべての変更は UI/フロントエンドと 1 個の管理系エンドポイント (`admin/channels/list` — 単純な `channels` テーブル SELECT) + Twemoji 依存追加のみで、ActivityPub 連合経路 (ノート生成/配送/受信、リアクション、フォロー、Undo、リノート、Announce 等) には一切触れていません。旗鯖独自の utage / private channel / hata-secure 系 visibility にも変更なし。

## hata-11.7.7

本家 Misskey 2026.6.0 のリリース全 29 項目 (General/Client/Server) を取り込みする追従リリースです。本家機能取り込み 21 件、既反映/非該当でスキップ 14 件、旗鯖独自実装統合 1 件、死コード掃除 3 件を行いました。あわせて、Dockerfile / .dockerignore に潜在していた本番ビルド時の `var LANGS` 反映漏れ問題 (BuildKit `COPY --link` キャッシュバグ起因) を恒久対策しました。連合 (ActivityPub) への影響はすべての変更でゼロを事前検証済みです (本家由来の連合修正は旗鯖独自実装と整合確認、旗鯖独自フィールド・通知・配信経路はいずれも変更なし)。

### 本家 Misskey 2026.6.0 からの取り込み (Client Feat/Enhance)

- **ドライブ/ユーザーページのスクロール位置記憶**: `composables/use-scroll-position-keeper.ts` を本家アルゴリズムに更新し、anchorContainerLocalY によるピクセル正確な復元・`savedScrollTop` フォールバック・`pointerdown` での同期キャプチャに対応しました。`pages/drive.vue` に `scrollContainer` ref + composable 呼び出しを追加、`MkDrive.vue` の `XFolder`/`XFile` に `:data-scroll-anchor` を付与。`pages/user/files.vue` は既存の汎用 keeper で composable 更新だけで本家同等の挙動になります
- **絵文字メニューから直接パレットに追加**: `utility/emoji-palette.ts` を新規追加 (本家から無改変コピー)。`MkCustomEmoji.vue` (カスタム絵文字)・`MkEmoji.vue` (Unicode絵文字)・`MkReactionsViewer.reaction.vue` (リアクション) の絵文字メニューに「絵文字パレットに追加」項目を追加しました。旗鯖の `menu` (右クリック) と `stealReaction` (長押し) の 2 系統メニュー両方に対応し、`canToggle` ゲートで一貫した挙動。`MkCustomEmoji.vue` は本家にない `isLocal` ガードで旗鯖独自のリモート絵文字インポート機構との両立を確保
- **ジョブキュー管理画面からキューの一時停止/再開**: `QueueService` に `queuePause` / `queueResume` を追加 (BullMQ `queue.pause()` / `queue.resume()`)。新規エンドポイント `admin/queue/pause` / `admin/queue/resume` を追加 (`requireModerator` + `write:admin:queue` スコープ)。`types.ts` の `moderationLogTypes` と `ModerationLogPayloads` に `pauseQueue` / `resumeQueue` を追記。`pages/admin/job-queue.vue` のコメントアウトされていた Pause/Resume ボタンを有効化。`QUEUE_TYPES` に旗鯖独自 `utageResolve` も含まれており、独自キューも一時停止/再開対象になります
- **アンテナのタイムラインから個別ノート削除**: 新規エンドポイント `antennas/remove-note` を追加。フロントは `events.ts` / `MkStreamingNotesTimeline.vue` / `MkNote.vue` / `pages/antenna-timeline.vue` / `utility/get-note-menu.ts` に統合。`FanoutTimelineService.remove` メソッドを追加 (本家由来、Redis `LREM` で list から個別 noteId を削除)。旗鯖の `MkStreamingNotesTimeline` の `noteRemovedFromAntenna` ハンドラは `src === 'antenna'` ガード付きで HatasabaUI deck の他コンテキスト/utage への影響なし
- **ノート検索の投稿日時範囲指定 (#16035)**: backend の `notes/search` paramDef と `SearchService` (searchByLike + searchByMeiliSearch) に `rangeStartAt` / `rangeEndAt` を追加。フロントは旗鯖独自カプセル型検索 UI (`pages/search.vue`、681 行) のノート検索オプションに `datetime-local` 入力 2 つ (postFrom / postTo) を統合し、executeSearch の `notePaginator` params で `rangeStartAt` / `rangeEndAt` を渡すよう拡張しました。本家由来の `search.note.vue` への適用はファイル自体が旗鯖独自実装で未使用化していたため、旗鯖独自検索ページに直接統合する形に変更

### 本家 Misskey 2026.6.0 からの取り込み (Client Fix)

- **URLプレビューの `Invalid URL` 表示**: `MkYouTubePlayer.vue` でプレイヤーが読み込まれるまでの間 `Invalid URL` と一瞬表示される問題を修正
- **周年実績アイコンの表示** (#17482): `utility/achievements.ts` の `passedSinceAccountCreated1/2/3` の画像パスを `0031-20e3` / `0032-20e3` / `0033-20e3` → `31-20e3` / `32-20e3` / `33-20e3` に修正 (CDN/assets 側に該当画像が無く 1/2/3 周年実績が表示されない状態の解消)
- **アクセストークン発行ダイアログのタイトル**: `pages/settings/connect.vue` のダイアログタイトルが「確認コード」になっていた問題を修正。新規 `accessToken` キーを `ja-JP.yml` / `en-US.yml` に追加し、旧 `token` キーは他箇所の利用懸念から温存
- **「D」キーでダークモード切替時の `syncDeviceDarkMode` バイパス**: `boot/main-boot.ts` の `d` ショートカットハンドラを `syncDeviceDarkMode` 確認フローでラップしました
- **メンションサジェストのアイコン崩れ**: `MkAutocomplete.vue` の `.avatar` ブロックに `object-fit: cover` を追加し、画像サイズによってアイコンが崩れる問題を修正
- **ノート下書きリセット時の未アップロードファイル添付解除**: `composables/use-uploader.ts` に `reset()` を追加 (`revokeObjectURL` / `abortAll` / `items.value` クリア)。`MkPostForm.vue` の `clear()` 末尾で `uploader.reset()` を呼ぶよう変更

### 本家 Misskey 2026.6.0 からの取り込み (Server Enhance/Fix)

- **URLプレビューのデフォルト UA にサーバー URL を含める**: `UrlPreviewService.ts` で、`urlPreviewUserAgent` 管理画面設定が無い場合のデフォルト UA を `SummalyBot (<server-url>; ...)` 形式に変更し、外部サイトから旗鯖が発信元であることを判別できるようにしました
- **リモートノートクリーニングジョブのパフォーマンス改善**: `CleanRemoteNotesProcessorService.ts` で `enabled` / `maxDuration` / `newestLimit` を `getConfig()` クロージャ化しループ毎に再評価できるよう変更。これによりジョブ実行中の管理画面 OFF が即時反映され、長時間ジョブ中の基準日も現在時刻に追随します。あわせて `candidateNotesQuery` をファクトリ関数化し、CTE 内 base 部分の LIMIT が各イテレーションの `currentLimit` を反映するよう修正 (以前は初回 `currentLimit=100` が固定バインドされ適応バッチサイズが実効化していなかった)
- **センシティブメディア自動検出の依存解決失敗修正**: `AiService.ts` の `nsfwjs` / `systeminformation` のトップレベル import を動的 import に変更し、optionalDependencies 解決失敗時に AiService 全体が壊れない構造に。モデルパスも `pathToFileURL` で URL 化して OS 差異を吸収
- **起動/停止失敗を misskey logger 経由で報告**: `StreamingApiServerService.ts` の `detach()` を Promise 化し `wss.close()` の完了を await できるよう変更。旗鯖独自の `clients.forEach(terminate)` (close ハング防止) は維持して本家 Promise 化と併用。EACCES/EADDRINUSE/`enableShutdownHooks` は既存実装で対応済み
- **フォロワー限定ノートを `specified` (指名/ダイレクト) で引用した時の visibility 保護** (PR#15961): `NoteCreateService.ts` L544-553 で、旧 `data.visibility = 'followers'` (無条件書換) を `if (data.visibility === 'public' || data.visibility === 'home') data.visibility = 'followers'` に修正。`specified` で引用した場合はユーザー意図通り `specified` を維持するよう変更しました。旗鯖独自の utage / private channel / hata-secure 系 visibility は同 switch で触れていないため非影響
- **`FanoutTimelineService.remove` メソッド追加**: アンテナ TL 個別削除エンドポイントが要求するメソッド。Redis `LREM` で list から個別 noteId を削除。本家由来の `@bindThis` 付き

### 旗鯖独自実装 (本家機能の旗鯖 UI 統合)

- **`search.vue` のノート検索オプションに期間指定 UI を統合**: 本家 PR#16035 は子コンポーネント方式の `search.note.vue` に期間指定を追加する形でしたが、旗鯖は `4ab4021f7c` (11.5 メジャー) で旗鯖独自カプセル型検索バー UI へ統合済み (`pages/search.vue`、681 行) のため、`search.note.vue` への取り込みは UI に反映されない死コード化していました。旗鯖独自検索ページ側に `rangeStartAt` / `rangeEndAt` の `ref` 宣言・`subOption` div + datetime-local 入力 2 つ・`executeSearch` の `notePaginator` params への引き渡しを追加し、旗鯖カプセル型検索バーから期間指定によるノート検索が機能するようにしました
- **`canUseTranslator` ポリシー残骸の DB クリーンアップ** (`1784200000000-drop-translator-policy.js`): 11.7.6 の `DropTranslatorSettings1784100000000` は `meta` テーブルの 10 カラム削除のみで、`meta.policies` / `role.policies` JSON カラムに過去 version から保存された `canUseTranslator` / `canUseAutoTranslate` キーが残り続け `/api/meta` レスポンスに `policies.canUseTranslator: true` が返ってしまっていました。新規マイグレで JSON マイナス演算子 (`-`) を使い両テーブルから該当キーを除去。適用後は `MetaService` の in-memory キャッシュリフレッシュのため `docker compose restart web` が必要

### スキップ (旗鯖が先取り取り込み済み・非該当)

調査の結果、以下 14 項目は旗鯖の既取り込み実装と同等以上だったためスキップしました。

- **AP image に width/height を含める**: 旗鯖の `ApRendererService.ts:184` `renderDocument()` で既に width/height/sensitive を出力済み
- **Inbox actor 検証**: 旗鯖の `ActivityPubServerService.ts:186-194` で本家より厳格な検証 (`!activity.type` / `!signature.keyId` も検査) 実装済み
- **リモートノートのメンション数制限** (#17576): 旗鯖の `ApNoteService.ts:184` (`apMentionRawCount`) + `NoteCreateService.ts:639` (`effectiveMentionCount`) で実装済み
- **TOTP リプレイ防止**: 11.7.5 で取り込み済み (Redis NX SET + window=1)
- **SSRF URL preview 硬化**: 11.7.5 で取り込み済み
- **OAuth2 Token Grant 入力検証** (PR#17580): 旗鯖の `OAuth2ProviderService.ts:276` で `firstValue` 型ガード・L286 `parseUrlEncodedParameters`・L302 `toRequestParameters` の型サニタイズ完備済み
- **`MemoryKVCache` GC 修正**: 旗鯖 `misc/cache.ts` は本家 2026.6.0 と完全一致
- **`PerUserDriveChart` の userId null クラッシュ修正** (#17498): 旗鯖の `per-user-drive.ts` は既に `if (file.userId == null) return;` ガード実装済み
- **`@tensorflow/tfjs-node` を bundle external 化**: 旗鯖は backend を swc トランスパイルのみで動かしており rolldown bundle 構成自体を持たないため非該当
- **パスキー登録完了時のダイアログ入力値**: 旗鯖 master に `eae405a951` で取り込み済み (`2fa.vue` の `addSecurityKey` が `auth2.result.password/token` を使用)
- **画像アップロード時のフレームキャプション付与**: 親機能 `ImageFrameRenderer` (PR#16725) が旗鯖未取り込みのため対象なし。フレーム機能取り込み時に同時適用
- **CherryPick UI 色 (Cherry-picked from MisskeyIO#1243)**: `vite.config.ts` に lightningcss + `Features.LightDark` exclude + `build.target=chrome130/firefox132/safari18.2` が既に取り込み済み
- **アンテナ管理画面の細部 UI 改善**: 旗鯖独自 HatasabaUI とのレイアウト衝突回避のためスキップ
- **未実装の `canUseTranslator` 関連 UI 残置**: 11.7.6 で UI ごと削除済みのため非該当

### Dockerfile / .dockerignore 恒久対策

11.7.7 デプロイ前検証で、`base.pug` に追加した `var LANGS = !{JSON.stringify(langs)}` (本家 2026.6 系の frontend `boot.js` が要求するグローバル) がコンテナ内 `built/views/base.pug` に反映されない事象が発生しました。根本原因の特定と恒久対策を行っています。

- **`.dockerignore` に `packages/*/built` を追加**: `built/` だけだと Docker context ルートの `./built/` しか除外されず、`packages/backend/built/` 等のサブパッケージ built は context に含まれていました。その結果 Dockerfile 末尾の `COPY . ./` でホスト側の古い `packages/backend/built/views/base.pug` がコンテナ内の native-builder 製の新しい base.pug を上書きしていました
- **Dockerfile から `COPY --link` を全削除 (21 箇所)**: Docker BuildKit の `COPY --link` レイヤーキャッシュバグで src の変更が反映されないケースがあるため、本番リリースの正確性を優先して通常 `COPY` に変更しました。ビルド時間は約 +2 分増ですが、本番運用では問題ない範囲
- **build 前 clean + 強制 touch + 検証ステップを Dockerfile に追加**: `find packages -path "*/src/*" -type f \( -name "*.pug" -o -name "*.css" -o -name "*.html" \) -exec touch {} +` でテンプレファイルの mtime を build 時刻に更新 (swc の `-D` フラグが mtime-based skip するケースの回避)。`rm -rf built packages/*/built` で残骸を完全削除。最後に `grep -c "var LANGS" packages/backend/built/server/web/views/base.pug` で反映確認 (反映漏れがあれば Docker build 自体が失敗する設計でフェイルセーフ)

### 死コード掃除

- **`search.note.vue` / `search.user.vue` / `search.event.vue` 削除 (合計 735 行)**: CherryPick の `search.vue` (85 行) は子コンポーネント方式で `XNote` / `XUser` / `XEvent` を import していましたが、旗鯖は `4ab4021f7c` (11.5) でカプセル型検索バー UI を独自実装し `search.vue` を 681 行の単独実装に統合。子コンポーネント方式を捨てたため、これら 3 ファイルは router からも他コンポーネントからも参照されない完全な死コードとして残っていました。CherryPick が将来 `search.note.vue` 等を更新した場合は削除済みのため `add/modify` 衝突として検知でき、旗鯖独自 `search.vue` への手動同期忘れを防げる利点もあります。`search.stories.impl.ts` は `search.vue` 用なので残します

### バグ修正

- **`FanoutTimelineService.remove` メソッド不在による typecheck エラー**: アンテナ TL 個別削除エンドポイント (`antennas/remove-note.ts`) が `FanoutTimelineService.remove` を呼んでいるが旗鯖既存実装にはメソッドが存在せず、`Property 'remove' does not exist on type 'FanoutTimelineService'` でビルド失敗していたため、本家 2026.6.0 の実装 (`@bindThis` + Redis `LREM`) を旗鯖に追加しました
- **ユーザーページの宴成功バッジの初回アナウンス吹き出しがリロード毎に再表示される問題**: `pages/user/home.vue` が参照していた `prefer.s['simpleUi.utageBadgeTipShown']` が `preferences/def.ts` に未定義だったため、常時 undefined となり表示判定 `!undefined === true` で毎回出てしまっていた問題を修正。`prefer.commit` も def 不在のため dismiss 状態が保存されない状態だった。`simpleUi.collapseAnnounceShown` と同形式 (`default: false`) で `simpleUi.utageBadgeTipShown` を `def.ts` に追加。これでマルチデバイス同期 prefer として通算 1 回 dismiss すれば恒久的に再表示されなくなります
- **モバイル版 hatafeed のイシュー一覧が解決済みボタン押下後に横長レイアウト崩壊する問題**: container query の grid item に `min-width: 0` が無く子要素の自然サイズで grid が広がり、解決済みを含む結果セットで子要素自然サイズが container の inline-size を 850px 超に押し上げ `@container (max-width: 850px)` の 1 カラム化が外れて 2 カラム化されたまま戻らない問題を修正。`.colsCt` に `container-name: hatafeedCols` を明示し意図しない container マッチを防止、`.cols > *` と `.issueList` / `.issueCard` に `min-width: 0` / `max-width: 100%` を強制、`.issueTitle` に `overflow-wrap: anywhere` を追加して長文折返しを保証
- **モバイル版 Hatask ホーム画面のカードが横に見切れる問題**: `htk-dash` の grid item が `min-width: auto` (デフォルト) で子要素の自然サイズで grid が広がり、画面幅を超えて全カードが横に見切れていた問題を修正。`htk-dash` の `min-width: 0`、`htk-dash > *` の `min-width: 0; max-width: 100%`、`.htk-dash .htk-lg` の `overflow: hidden`、内部 `htk-gc` の `overflow-wrap: anywhere; word-break: break-word` を追加。地震情報 / HataFeed カード単体は内部で overflow 制御済みでしたが、親 grid の崩壊で同様に見切れていたものも併せて解消
- **モバイル/低スペック端末で Hatask ホーム下部スクロール時のチカチカ・ガタガタを抑制**: `background-size: 200% 200%` + `background-position` アニメ (`htkBgFlow` 25-30s、GPU 合成不可で毎フレーム CPU reflow) と 4 個の `htk-orbA/B/C/D` (500/420/300/250px、22-32s)、`htk-tut-particles` (12 個 + 6s 個別 animation) の同時稼働で、低スペック端末ではフレーム落ちによるチカチカが発生していました。`@media (prefers-reduced-motion: reduce)` でアクセシビリティ設定時に全アニメを停止、`@media (hover: none) and (pointer: coarse)` でタッチ端末 (モバイル / タブレット) では `htkBgFlow` と orb 4 個・particles を停止 (`background-size: 100% 100%` に固定、`will-change: auto`) して reflow 連鎖を抑制
- **HatasabaUI サイドバーの ON/OFF 設定が別端末/別ブラウザでアクセスする度に強制リセットされる本番不具合**: `boot/common.ts` の `hata_sidebar_v3_migrated` マイグレが `miLocalStorage` (端末ローカル) フラグで判定していたが、`simpleUi.sidebar` 自体は `prefer` (マルチデバイス同期) のため、新端末/シークレットモードで開くたびにマイグレが走りユーザー設定をデフォルト値で完全上書きしていました。「sidebar の中身が新形式 (group プロパティを持つ) ならマイグレ済み」と判定するロジックに変更し、端末を跨いでも prefer 経由で正しく skip されるようにします。あわせて今後のサイドバーマイグレ設計指針コメントを `boot/common.ts` に追加 (強制リセット型は新規追加禁止 / 新機能は v4 同様 insertAfter 方式 / `visible:false` の項目は復活させない / 旧 id リネームは mapping で表示・順序保持)
- **「もっと!から HataFeed と地震・津波情報が確認できるようになりました」案内が別端末で再表示される本番不具合**: 旧実装は `miLocalStorage('hatafeedIntroShown')` の端末ローカルフラグで判定していたため、別端末/別ブラウザ/シークレットウィンドウで「不定期に再表示」されるとユーザー報告されていた問題を修正。`preferences/def.ts` に `simpleUi.hatafeedIntroShown` (default: false) を追加し、表示判定と dismiss 保存を prefer (マルチデバイス同期) 経由に切り替え。既存ユーザー保護のため `miLocalStorage` も互換チェック・書き込みを残し、各端末で 1 回 dismiss すれば以降全端末で恒久 skip
- **旗鯖ポータルのアイコンがサイドバー本体と設定 UI で不一致**: サイドバー本体 (`ui/simple.vue`) は `SIDEBAR_ICON_OVERRIDES` マップで新アイコン (`ti ti-icons`) に上書きしていましたが、設定 → 旗鯖独自機能 → HatasabaUI → サイドバー ON/OFF UI (`settings/hata-custom.vue`) は保存値の旧アイコン (`ti ti-home-2`) をそのまま表示していたため不整合がありました。`utility/sidebar-icon-overrides.ts` に override マップを共有ユーティリティとして切り出し、サイドバー本体と設定 UI 双方で参照することで完全同期。`preferences/def.ts` の `portal` デフォルトアイコンも `ti ti-icons` に統一 (新規ユーザー対応)
- **HataFeed コメントのリアクションがショートコード文字列 + 割れた画像で表示される問題**: `components/HataFeedIssue.vue` が `<MkEmoji :emoji="emoji"/>` (Unicode 絵文字専用) でリアクションを描画していたため、`:shortcode:` 形式のカスタム絵文字が来るとショートコード文字列がそのまま表示され、画像読み込みエラーの割れた写真アイコンが並ぶ状態になっていました。Misskey 標準の `<MkReactionIcon :reaction="emoji"/>` (内部で `:` 始まりなら `MkCustomEmoji`、それ以外なら `MkEmoji` に自動分岐) に置換して修正
- **通知フィルタ設定 UI で「地震・津波情報」のラベルが空白になる問題**: `cherrypick-js` の `notificationTypes` に `earthquake` (地震・津波通知) が含まれているが、`locales/ja-JP.yml` / `en-US.yml` の `_notification._types` セクションにラベル定義が漏れていたため、`MkNotificationSelectWindow` の `i18n.ts._notification._types[ntype]` が空文字列を返して MkSwitch のラベル部分が空白になっていた問題を修正。両言語に `earthquake` ラベルを追加 (ja: "地震・津波情報" / en: "Earthquake / Tsunami info")

### 機能改善 / 要望対応

- **HataFeed のイシュー作成ウィザードを非モーダル化 (`MkModalWindow` → `MkWindow`)**: 「再現手順を確認するために裏のページを触りながらイシューを書きたい」「項目数が多く全て覚えるのが困難」というユーザー要望 (特にデッキ UI 使用者) に対応。`MkWindow` は移動・リサイズ可能で裏のページがそのまま操作できるため、機能を触りながらでもイシューを記入できるようになります
- **HatasabaUI サイドバーから「メッセージ」「リロード」を非表示・並び替えできるように**: 旧実装は `ui/simple.vue` で chat (メッセージ) を動的注入、reload (リロード) をテンプレート内ハードコードボタンとして表示していたため、設定 UI のサイドバー編集一覧に表示されず、ユーザーが ON/OFF・並び替えできない状態でした。両方を通常の `simpleUi.sidebar` 項目として扱うよう変更:
    - `preferences/def.ts` のデフォルト構成に `reload` (group: 'more') を追加 (chat は既存)
    - `boot/common.ts` に v5 マイグレを追加 (insertAfter 方式・設計指針通り)。既存ユーザーの sidebar に chat が無ければ通知の直後、reload が無ければ「もっと」の直後に挿入。ユーザーが既に非表示にしている場合は復活させない
    - `ui/simple.vue` の chat 動的注入と reload ハードコードボタン (サイドメニュー / 上部ナビバー) を削除。`sidebarItemClick` の id→action マップに `reload: () => reloadPage()` を追加してクリックでページリロード
    - `settings/hata-custom.vue` の `REQUIRED_SIDEBAR_IDS` から chat/reload を除外。通常項目と同じく ON/OFF・並び替え可能に

### 連合への影響 (事前検証済み: ゼロ)

11.7.7 で行ったすべての変更について、ActivityPub 連合先・他サーバーへの影響をゼロと事前検証しました。

- **本家 Server Enhance/Fix の取り込み**: AP width/height・Inbox actor 検証・メンション制限・TOTP・SSRF・OAuth2・MemoryKVCache・DriveChart・tfjs はいずれも旗鯖が既に取り込み済みで動作確認済み。今回新規取り込みの UrlPreview UA 変更は連合トラフィック非該当 (URL プレビュー外部 fetch 時のみ)、`AiService` 動的 import 化は内部実装の差し替えで AP 経路に影響なし、`StreamingApiServerService.detach()` Promise 化は WebSocket close 待機の改善で配送経路に影響なし
- **`NoteCreateService` のフォロワー限定指名引用 visibility 保護** (PR#15961): visibility 計算ロジックの厳密化で、旗鯖の utage/private channel/hata-secure 系 visibility (異なる switch case で処理) には触れていません。本家と完全同等動作
- **`FanoutTimelineService.remove`**: Redis `LREM` でローカルタイムライン list から個別 noteId を削除する操作のみ。AP 経路への送出はなし
- **旗鯖独自フィールド**: `utageStatus` / `utageSuccessCount` / `canAccessHataFeed` / `canMakePrivateChannel` などは引き続き AP renderer に含まれず、REST API/WS 限定のまま

## hata-11.7.6

復旧・整理リリース。11.7.5 時点で本家 Misskey 2026.6.0 取り込み途中に残った欠落ファイル・欠落依存・TypeORM v1 互換問題を完全解消し、`pnpm --filter backend build` から SDK 再生成までの一連の build パスを健全な状態に戻しました。あわせて、本家リファクタとの方向性違いから死コード化していた CherryPick 由来の Friendly UI を完全に削除し、外部API依存の翻訳機能 (DeepL/Google/CTAv3/LibreTranslate) を完全撤去しました。連合 (ActivityPub) への影響はすべての変更でゼロを事前検証済みです (旗鯖独自フィールド・通知・配信経路はいずれも変更なし)。本家 Misskey からの追加取り込みはありません。

### 復旧 (backend が build → start できる状態へ)

- **欠落ファイル補完**: 本家から取り込み損ねていた起動・テスト系ファイルを補完しました
  - `packages/backend/scripts/compile_config.js` を no-op で新規作成 (旗鯖の `config.ts` は YAML を直接読むため compile-config 自体は不要ですが、`package.json` scripts の `pnpm compile-config &&` 接頭辞との互換維持のために配置)
  - `packages/backend/vitest.config.{ts,unit.ts,e2e.ts,fed.ts}` 4 本を本家準拠で新規作成
- **TypeORM v1 互換修正 (`models/_.ts`)**: TypeORM 1.0.0 で内部 deep path import の対象ファイルが削除/改名されていた問題を修正しました
  - `PostgresConnectionOptions` → `PostgresDataSourceOptions` (v1 で改名)
  - `RelationCountLoader` import を削除 (v1 で完全廃止、旗鯖は `@RelationCount` デコレータ未使用のため機能影響なし)
  - `QueryDeepPartialEntity` を `typeorm` root から import (deep path 不要に)
  - `RawSqlResultsToEntityTransformer` の ctor を 5→4 引数に縮小 (v1 の暗黙的破壊的変更に追従)
- **欠落依存追加**: 本家コードで実際に import しているのに `package.json` から漏れていた依存を一括補完しました
  - 認証: `argon2` (パスワードハッシュ、17 ファイル使用)
  - HTML 解析: `jsdom` + `@types/jsdom` / `parse5` / `happy-dom`
  - SSR/テンプレ: `pug` + `@types/pug` / `@fastify/view` / `htmlescape` + `@types/htmlescape`
  - 監視/ログ: `cli-highlight` (postgres SQL 色付け) / `redis-info` (Queue Redis INFO パース)
  - ロック: `redis-lock` (AppLockService の AP オブジェクトロック)
  - ビルド: `@swc/cli` / `@swc/core` (backend ビルドコマンド)
  - MFM: `mfc-js@0.1.0` (CherryPick 独自 MFM パーサ、backend で 11 ファイル import されていたが宣言漏れ)
  - SDK: cherrypick-js に `@simplewebauthn/server@13.3.0` (`entities.ts` が型参照)

### 機能修復

- **新規 Passkey 登録の修復**: `WebAuthnService.ts` の `attestationType: 'indirect'` を `'none'` に修正しました。`SimpleWebAuthn` v13.0.0 で `'indirect'` は無効値となり、新規 Passkey 登録がランタイム拒否される可能性があった状態を解消しました。既存 Passkey の認証には影響しません
- **Meilisearch 起動の修復**: `meilisearch` v0.58.0 で `MeiliSearch` → `Meilisearch` に改名されていたのに追従し、`GlobalModule.ts` / `SearchService.ts` / `HealthServerService.ts` の import・型・コンストラクタを更新しました
- **Summaly URL プレビューの修復**: `@misskey-dev/summaly/built/summary.js` というサブパスが v5 で存在しなくなっていた問題を、root export からの取得に修正しました
- **`@simplewebauthn/types` (deprecated) からの脱却**: v12.0.0 は npm 上で deprecated 表記。`@simplewebauthn/server` v13.3 に統合された再エクスポートに置換しました (backend 4 ファイル + cherrypick-js 1 ファイル + test 2 ファイル)

### 翻訳機能 (外部 API 依存) を完全撤去

旗鯖は外部翻訳サービス (DeepL/Google/CTAv3/LibreTranslate) を提供しない方針へ移行しました。撤去前から依存パッケージ (`@google-cloud/translate` / `@vitalets/google-translate-api`) が `package.json` から欠落しており実質動作していなかったため、関連コードを全件削除しました。連合への影響はゼロです (`packages/backend/src/core/activitypub/` 配下に translate 参照は存在せず、ローカル完結のフローでした)。

- **Backend**: `endpoints/notes/translate.ts` / `notes/polls/translate.ts` / `users/translate.ts` を削除、`endpoint-list.ts` から 3 行除外。`Meta` テーブルの 10 カラム (`translatorType` / `deeplAuthKey` / `deeplIsPro` / `ctav3*` / `libreTranslate*`) を削除する DROP マイグレーション (`1784100000000-drop-translator-settings.js`) を追加。`RoleService` の `canUseTranslator` / `canUseAutoTranslate` policy と `MetaEntityService.translatorAvailable` を削除
- **SDK (cherrypick-js)**: `consts.ts` から関連定数を削除し、`api.json` 再生成で `autogen/{types,endpoint,entities,apiClientJSDoc}.ts` から翻訳エンドポイント定義を自動消失させました
- **Frontend**: `MkNote.vue` / `MkNoteDetailed.vue` / `MkSubNoteContent.vue` / `MkPoll.vue` の翻訳ボタン UI と `translate` 関数・各種 ref を撤去。`pages/admin/external-services.vue` から翻訳サービス設定 UI (provider/DeepL/CTAv3/LibreTranslate) 全体を削除。`pages/admin/roles{vue,editor.vue}` の policy UI、`pages/settings/preferences.vue` の翻訳設定、`pages/user/home.vue` のプロフィール翻訳ボタン、`utility/get-note-menu.ts` の translate メニュー (ブラウザ標準 Translator API ルートを含む) を削除。`preferences/def.ts` / `store.ts` / `pref-migrate.ts` から関連キーを削除
- **i18n**: `ja-JP.yml` / `en-US.yml` から関連 10 キー (`translateNote` / `translate` / `translatedFrom` / `translateProfile` / `useAutoTranslate` / `useAutoTranslateDescription` / `showTranslateButtonInNote` / `canUseTranslator` / `canUseAutoTranslate` / `canUseAutoTranslateDescription`) を削除

### Friendly UI (CherryPick 由来) を完全削除

11.3 以降 `isFriendly()=ref(false)` のシムで機能無効化していた CherryPick 由来の Friendly UI を、死コードとして残置していたため完全に削除しました。連合・認証への影響ゼロを事前検証済みです (バックエンド・連合・OAuth・WebAuthn 配下で参照ゼロ確認)。1657 行を削除し、14 ファイルを変更しています。

- **削除ファイル**: `ui/friendly.vue` / `ui/friendly/navbar.vue` / `ui/friendly/mobile-footer-menu-friendly.vue` / `utility/is-friendly.ts`
- **分岐削除**: `MkPageHeader.vue` (11 箇所 + CSS `.lowerFriendly`) / `MkStickyContainer.vue` + CSS `.showElTl` / `MkStreamingNotesTimeline.vue` + CSS `.showElTab` / `CPPageHeader.vue` / `MkAvatar.vue` (`showDecorationWithFloatingBtn` 撤去) / `timeline.vue` / `chat/room.vue` + CSS `.isFriendly`
- **設定削除**: `store.ts` / `preferences/def.ts` / `pref-migrate.ts` から `friendlyUiEnableNotificationsArea` / `friendlyUiShowAvatarDecorationsInNavBtn` を削除
- **残置**: `boot/{common,main-boot}.ts` の旧 `ui='friendly'` クリーンアップは旧クライアント移行保険として残置 (3〜6 ヶ月後に Phase 4 で別 PR)

### 死コード掃除

- **GCP Logging 撤去**: `@google-cloud/logging` が既に `package.json` から消滅済みで起動失敗のはずだったため、`GlobalModule.ts` / `LoggerService.ts` / `logger.ts` / `di-symbols.ts` / `config.ts` 全箇所から `cloudLogging` 関連を完全削除しました。ログ出力は `console.log` → stdout で継続するため観測性は失われません
- **Dead deps 5 本削除**: `@kitajs/html` / `@kitajs/ts-html-plugin` (本家 React 移行用、旗鯖は pug 維持) / `rolldown` (旗鯖は esbuild/swc 維持、vite が transitive で確保) / `simple-oauth2` + `@types/simple-oauth2` (コード参照ゼロ) を `package.json` から削除しました
- **`backend/test/e2e/oauth.ts` 削除**: `simple-oauth2` 残骸 + `vitest.config.e2e.ts` 不在で既に動作不能だったため削除しました
- **`mfm-js@0.26.0` 削除**: backend では 1 ファイルも import されていない dead dep だったため削除しました (実利用は `mfc-js` で、こちらは backend に正しく追加)

### セキュリティ

- **`hata/consent/update` に `secure: true` 追加**: 法的同意フラグ (`hataConsentExternalTl` / `hataConsentCustomFont` / `hataConsentMascot` および各々の日時) の改ざんを防ぐため、3rd party アプリトークン経由での書き換えを拒否するようにしました。これらの同意フラグはマスコット機能の二次創作・盗用責任の所在やカスタムフォントのライセンス責任の所在の証拠として機能するため、Web セッション (native token) からの操作のみを正規とする方針です
- **admin/registration 系 4 エンドポイントに `secure: true` 追加**: `admin/approve-registration` / `admin/reject-registration` / `admin/registration-applications` / `admin/cleanup-legacy-rejected-registrations` の meta に `secure: true` を追加し、`IEndpointMeta` の判別共用体型の不適合を解消すると同時に 3rd party トークン経由での承認操作を不可としました

### バグ修正

- **`ChannelEntityService.ts:224` の型注釈**: `members.map` の `m` の型を `MiChannelMember` から `{ channelId: string }` に変更し、上流 `findBy` の戻り型との union 不一致を解消しました
- **`SearchService.ts:100` の null チェック**: `meilisearchNoteIndex?.updateSettings(...)` のように optional chain を追加し、`Object is possibly 'null'` 型エラーを解消しました

### 内部変更

- **`basedMisskeyVersion` を 2026.6.0 に同期**: `package.json` (root) と `packages/cherrypick-js/package.json` の `basedMisskeyVersion` をそれぞれ `2026.5.4` → `2026.6.0`、`2025.10.2` (置き去り) → `2026.6.0` に更新しました。11.7.5 で Misskey 2026.6.0 のセキュリティ修正・OAuth2 リファクタを取り込み済みのため、表記としても正確になります
- **新規マイグレーション**: `1784100000000-drop-translator-settings.js` (Meta テーブルから翻訳設定 10 カラムを DROP)。down マイグレーションも用意しています (ただし DROP COLUMN は本番では実質ロールバック不可なので、適用前に `pg_dump -t meta` でバックアップ推奨)
- **`package.json` のバージョン表記を更新**: `2026.5.4-hata.11.7` → `2026.6.0-hata.11.7` に更新。`basedMisskeyVersion` (`2026.6.0`) と `codename` (`2026.10`) に変更しました

### 連合への影響 (事前検証済み: ゼロ)

11.7.6 で行ったすべての変更について、ActivityPub 連合先・他サーバーへの影響をゼロと事前検証しました。

- **WebAuthn 関連**: 認証はすべてローカル機能で、`ApRendererService` / `ApDeliverManagerService` には触れていません。`attestationType` の変更は新規 Passkey 登録時のオプションで、既存登録キーの検証 (`verifyAuthenticationResponse`) は credentialID/publicKey/counter ベースのため影響なし
- **翻訳機能撤去**: `packages/backend/src/core/activitypub/` 配下に translate 参照ゼロ。翻訳結果は旗鯖クライアントへの返却のみで、リモートユーザーのプロフィール翻訳結果を再連合する経路もありません
- **Friendly UI 削除**: バックエンドおよび `test-federation` 配下で `friendly` 参照ゼロ。JSON-LD カスタムコンテキスト (`_misskey_friendly` 等) も存在しません
- **Meilisearch リネーム**: 検索クライアント名の変更のみで、AP 受信 Note のインデックス I/O 形式は無変化
- **Summaly パス修正**: ローカルでの URL プレビュー取得経路のみ
- **旗鯖独自フィールド**: `utageStatus` / `utageSuccessCount` / `canAccessHataFeed` / `canMakePrivateChannel` などは引き続き AP renderer に含まれず、REST API/WS 限定のままです

## hata-11.7.5

本家 Misskey 2026.6.0 のセキュリティ修正・バグ修正・パフォーマンス改善を選別取り込みする追従リリースです。Critical 4 件 + High/Medium 多数の合計 22 件をバックポートし、あわせて旗鯖独自のレートリミット強化・N+1 解消・各種パフォーマンス改善を実施しました。TypeORM を v0.3 → v1.0.0 にアップグレードしています。

### 本家 Misskey 2026.6.0 からの取り込み (セキュリティ)

- **【Critical】TOTP 再利用防止 + 検証ウィンドウを window:1 に厳格化** (`759ccfe2ea`): 一度使った 6 桁の TOTP コードを Redis NX SET で再利用防止し、認証時の許容ウィンドウを ±1 に絞りました
- **【Critical】UrlPreview の SSRF/Open Redirect 対策強化** (`26e2092b73`): `UrlPreviewService` で agent (http/https) を無条件設定するように修正し、`allowedPrivateNetworks` 設定を経由しない経路を解消しました
- **【Critical】inbox activity の actor 不在で TypeError ではなく 400 を返す** (`4f1f64dc89`): `ActivityPubServerService` の inbox エンドポイントで、actor が無い activity に対して TypeError ではなく早期 400 応答を返すようにしました
- **【Critical】esbuild 0.28.1 への更新** (`02b67fcf3a`): セキュリティ脆弱性修正のため `cherrypick-js` / `sw` の esbuild を 0.28.1 に更新しました

### 本家 Misskey 2026.6.0 からの取り込み (OAuth2 リファクタ)

- **oauth2orize を削除し OAuth2 実装を独自に書き直し** (`cd7a137456`, `1f40bedef1`, `7bdead988c`, #17415 + follow-up + Token Grant 修正): メンテナンス停止した oauth2orize 依存を排除し、Token Grant エンドポイントのバリデーションを修正しました

### 本家 Misskey 2026.6.0 からの取り込み (バグ修正・改善)

- パスキー登録完了時の認証ダイアログの入力値が使われていない問題を修正 (`eae405a951`)
- サーバー全体のアップロードサイズ上限とロールポリシーのアップロードサイズ上限に関する修正 (`965c146161`)
- CSS `light-dark()` が適用されない問題を修正 (`4b974dc8ac`)
- consolidate index creation logic + RecoverNotePinFavoriteIndexes migration (`ee1691fbd4`, `d24d07d4c0`, `e7212087e1`)
- コンパネからパスワードリセットした時のエラーをダイアログ表示に修正 (`7c576dd744`)
- ActivityPub 画像添付に width/height メタデータを追加 (`bad4f35745`)
- リモートのノートのメンション数制限を実際に解決できたユーザー数に修正 (`a0fc7c8b67`)
- 自ホストでのユーザープロフィール URL ルックアップを修正 (`e6529252f1`)
- MemoryKVCache のキャッシュ GC 処理を修正 (`33226c0dec`)
- PerUserDriveChart.update で userId が null のシステム所有ファイルをスキップ (`496da0f5e6`)
- 削除対象ノート検索処理の一部クエリを簡略化 (`59f3517ce1`)
- fastify listen/ready/close エラーを logger 経由に (`ea2c19504d`)

### 内部変更

- **TypeORM v0.3 → v1.0.0 移行**: select/relations を配列形式からオブジェクト形式に書き換え (43 件)、ネスト relations をオブジェクト構造に変換 (4 件) するなど、TypeORM v1 の判別共用体型に追従しました。`postgres.ts` に `invalidWhereValuesBehavior: { null: 'ignore', undefined: 'ignore' }` を追加し、v0.3 系の null/undefined 挙動を維持しています
- **基底 Misskey 取り込み済み**: `package.json` の取り込み済み PR は #17389/#17401/#17422/#17499/#17511/#17512/#17513/#17522/#17539/#17558/#17563/#17566/#17576/#17577/#17580/#17581/#17415

### 旗鯖独自のパフォーマンス改善

- **Note/Feedback/Channel の pack を packMany でバッチ化して N+1 解消** (`1a714699cc`): 大量ノート表示時の DB クエリを劇的に削減
- **ChannelService/UtageService にキャッシュ追加 + FeedbackService bulk + Earthquake WS 早期 filter** (`8184ee37b6`)
- **CustomEmoji の alias bulk 更新を 10 件チャンク並列に** (`027a6a1148`)
- **RSS 並列 fetch / 正規表現キャッシュ / ObjectURL 解放 / WS ポーリング制御** (`9758fe03cb`, frontend 側のパフォーマンス改善)

### セキュリティ修正

- **【High】旗鯖独自エンドポイント 13 本にレートリミットを追加** (`3344657c9f`): 旗鯖独自エンドポイント (HataFeed/Earthquake/Hatask 系) にレートリミット (`limit`) を追加し、連打・スパム・DDoS 緩和を実施しました

### その他

- **`package.json` のバージョン表記を更新**: `2026.5.4-hata.11.7` を維持 (11.7 系のパッチリリースのため major.minor は据え置き)

## hata-11.7

旗鯖独自フォークとしては過去最大級の大型リリースです。フィードバック基盤 **HataFeed**、**気象庁発表の地震・津波情報ビューア**、**プライベートチャンネル**、Hatask ホームの全面リニューアル、HatasabaUI デッキの本格実装、ベータ機能 (C/C++ プレイグラウンド) などを同時投入しています。地震・津波情報ビューアは気象庁発表の情報をそのまま表示・通知する設計です (出典: 気象庁 / P2P地震情報、**緊急地震速報 EEW は非対応**)。気象業務法第17条・第23条に配慮し、旗鯖が独自に予報・警報・速報を発する形式は採っていません。あわせて、HataFeed 系エンドポイントへのレートリミット追加、絵文字申請 URL の危険プロトコル弾き、HataFeed イシューのカテゴリ書き換え攻撃防止など、複数のセキュリティ修正を行いました。本家 Misskey からの追加取り込みはありません。

### 新機能

- **HataFeed (フィードバックセンター) を追加**: 旗鯖への不具合報告・要望・改善提案などをまとめて受け付ける旗鯖独自のフィードバック基盤です。カテゴリ別のイシュー投稿、コメントによる会話 (リアクション・特定コメントへの返信スレッド・重要/?マーク・コメント操作)、受付終了/解決済みのステータス管理 (クローズされたイシューは「みんなの動き」に明記)、旗鯖以外も扱えるプロジェクト (ジャンル・リポジトリ URL・色管理・サスペンド)、絵文字申請、自分のイシューへの反応のベル通知 (1 ページ 5 件・前後ページ送り) などを備えます。イシュー番号 `#N` はリンク化され、セキュリティ対応カテゴリはスタッフのみ閲覧・作成できる内部限定扱いです。利用はロール (`canAccessHataFeed`) で制御します
  - **個別イシュー画面のリデザイン**: モバイル/PC 両対応の縦動線にリデザインし、コード提出オプション (コード片) を添付できるようにしました
  - **プロジェクト管理 UI**: プロジェクトの編集・削除・色管理 UI、ジャンル設定、リポジトリ URL の追加に対応しました
  - **ベータ機能**: HataFeed 内に開発中の機能を試せる場所を用意しました。現在は「**C/C++ プレイグラウンド** (JSCPP を用いたブラウザ内実行・サーバーに送られません)」と「**ミュートユーザーのリアクション非表示** (端末ローカルに保存・他端末には同期されません)」が利用でき、ベータ機能の数は HataFeed ボタンにバッジ表示されます
- **地震・津波情報ビューアを追加 (出典: 気象庁 / P2P地震情報)**: **気象庁が発表した情報を表示・通知する**旗鯖独自の防災機能です。**緊急地震速報 (EEW) は扱いません**。日本地図 (パン・ズーム対応、地点をタップすると Natural Earth / 国土数値情報をオンデマンド読込して**市区町村レベル**で震度色分け)、同一地震の第○報を自動でまとめる一覧、最新地震を流す電光掲示板、発表中の津波情報 (解除で自動消去)、お住いの都道府県付近の地震、を表示します。サーバーが P2PQuake の WebSocket に常時接続して新着を検知し、開いているページ/カラムへリアルタイム配信するほか、**プッシュ通知** (「一定の震度以上」または「お住いの都道府県で揺れたら」、アプリを閉じていても届く) に対応します。お住いの都道府県は原則この端末にのみ保存され、**「居住地のみ通知」を有効にしたときだけ**通知判定のため都道府県名のみがサーバーに保存されます (オプトイン明示)。HatasabaUI デッキのカラムや、都道府県フィルター付きウィジェットとしても配置できます
- **プライベートチャンネルを追加**: 旗鯖独自のメンバー制チャンネル機能です。閲覧をメンバーに限定し、外部 (Misskey 機能の) リノートを抑制します。あいことば (キーフレーズ) での参加、副管理者 (`moderatorUserIds`) によるメンバー管理、`canMakePrivateChannel` ロールポリシーでの作成制限に対応しました。閲覧権限が無い場合はノート単体取得 (`notes/show`) でも存在ごと隠す (`NO_SUCH_NOTE`) ことで参照リークを防ぎます
- **Hatask ホームに HataFeed 通知タイル・地震タイルを追加**: Hatask のホーム画面に HataFeed 通知タイル (未読バッジ・処理済み判定) と地震タイル (リアルタイム接続表示・電光掲示板) を追加しました。地震タイルには「気象庁発表の情報を表示します」と明示し、独自警報化と誤認されない設計にしています。タイルの並び・表示/非表示は設定から変更できます
- **Hatask 設定を HataskSettings.vue に統合**: Hatask 関連の全設定を `HataskSettings.vue` に一本化し、ホーム画面のタイル並び・表示切替・チュートリアル再表示などを集約しました
- **HatasabaUI デッキ (`ui:simple` + `simpleUi.deckMode`) を本格実装**: 11.6 で導入した HatasabaUI デッキを、`profile → slots → frames → tabs` の 3 階層モデルで本格実装しました。タイル並び・列幅・タブ並び・タブ名・タブ色・タブごとの通知フィルタを編集でき、`profile` 単位で保存・切替できます (`simpleUi.deckProfilesV2`)
  - **新カラム種別**: 地震・津波カラム (`earthquake-column`)・外部通知カラム (`external-notifications-column`) を追加しました
  - **タブ操作の改善**: タブの横スクロール、タブクリックで該当カラムの最上部に戻る、左右スワイプでタブ切替、タブ内スクロールをページ横スクロールへ連鎖、に対応しました
  - **カラム幅 (px) 指定**: スロット幅を px で直接指定できるようにしました
  - **「画面幅に関係なくデッキ表示」トグル**: 端末ローカル設定 (`hatasabaDeckIgnoreWidth`) として、画面幅にかかわらずデッキ表示を強制するトグルを追加しました (プロファイルには同期しません)
  - **通知カラムに通知フィルタ**: デッキの通知カラムごとに表示する通知タイプを絞り込めるようにしました (`tab.excludeTypes`)
- **ベータ: C/C++ プレイグラウンドを追加**: HataFeed のベータ機能として JSCPP を用いた C/C++ のブラウザ内プレイグラウンドを追加しました。コードはサーバーに送られず、Web Worker (`cpp-runner.ts`) で実行されます
- **ベータ: ミュートユーザーのリアクション非表示を追加**: HataFeed のベータ機能として、**ミュートしているユーザーのリアクションを非表示にできるように**しました。端末ローカルに保存され、他端末には同期されません
- **天気エフェクトに「一度発火したノートは再発火しない」を追加**: 11.6 で追加した天気エフェクトについて、一度演出が発火したノートを永続記録 (`weather-effect-seen.ts`) し、リロードや戻り表示時に再発火しないようにしました
- **HatasabaUI サイドメニュー / 上部メニューの拡張**: 左サイドメニューの縮小時に**メニューチップ (ツールチップ) をホバーで表示**するようにしました。サイドメニューに「HataFeed」「地震・津波情報」「リロード」を追加し、上部メニューにも「リロード」を追加しています。また、HatasabaUI デッキ用のお知らせ吹き出しを個別に無効化できるトグルを追加しました
- **HatasabaUI 新機能案内ポップアップ (クリック非遷移)**: 「もっと！」から HataFeed と気象庁発表の地震・津波情報が確認できることを案内する吹き出しを追加しました。**気象業務法上の安全性に配慮し、クリックでは遷移せず案内のみ**を行います (端末ごと 1 回表示)
- **投稿フォームの公開範囲を枠色で示すアクセシビリティ設定**: 投稿フォームの枠色を投稿範囲 (公開/ホーム/フォロワー/ダイレクト) に応じて変更できるようにしました (`postFormVisibilityBorder.*`、デフォルト OFF)
- **新通知タイプ**: HataFeed 通知 (`hataFeed`)・地震通知 (`earthquake`) を専用通知タイプとして追加し、通知フィルタで個別に ON/OFF できるようにしました。SDK (`cherrypick-js`) の `notificationTypes` 定数にも反映済みです
- **新ロールポリシー**: `canAccessHataFeed`・`canMakePrivateChannel`・`canRequestRemoteEmoji`・`emojiRequestLimit` を追加しました
- **絵文字叩きゲームの調整**: 絵文字の出現スピードを改善 (速く) しました

### 改善

- **電光掲示板を `MkEarthquakeTicker.vue` に共通化**: 電光掲示板コンポーネントを新設・共通化しました。`ResizeObserver` で枠内に収まるときはスクロールせず固定表示し、ウィンドウサイズの変更に**リロード無しで追従**します。最終報を受信したときは最終報のみを表示するように切り替えます
- **Hatask ホームのタイル高さ揃え**: PC でホーム画面のタイルの上下幅が統一されない問題を `grid-auto-rows: 1fr` で解消しました
- **HataFeed 絵文字申請カラムをスタッフ向け順序に**: スタッフ向けの並びとして、絵文字申請カラムを通知カラムより上に並べ替えました
- **HataFeed 絵文字申請通知の改善**: すでに処理済みの絵文字申請通知をクリックすると「処理済み」アラートを表示するようにしました
- **HataFeed 会話**: 会話への**リアクション通知**、特定コメントへの**返信スレッド**、コメントごとの**重要/?マーク・削除・コピー**操作に対応しました
- **HataFeed イシューに「コード提出」オプション + セキュリティ可視性制限**: コード片の添付に対応するとともに、セキュリティカテゴリイシューの可視性をスタッフのみに制限しました
- **HataFeed プロジェクト概要ボタン / ジャンル / リポジトリ URL**: プロジェクトの概要モーダル、ジャンル、リポジトリ URL の表示に対応しました
- **HataFeed 会話内のイシュー番号 (`#N`) をリンク化**: 会話本文中の `#N` を該当イシューへのリンクに変換します
- **タイムライン日付セパレータの調整**: HatasabaUI デッキでは日付を詰めて表示し、スマホでは日付の表示/非表示をトグルできるようにしました (`simpleUi.showTimelineDateOnMobile`)。ノート間隔の `compact` を廃止し Misskey 準拠の挙動に揃えています
- **HatasabaUI デッキ最上部に「最新のノートです」案内**: 先頭のノートがタブバーに密着しないよう、最上部にメッセージとスペーサーを表示するようにしました
- **チャンネル一覧の初期タブをフォロー中チャンネルに**: ログイン時はチャンネル一覧の初期タブを `following` にして、フォロー中チャンネルへ素早くアクセスできるようにしました
- **チャンネル一覧に「あいことばで参加」ボタンを追加**: プライベートチャンネルにあいことばで参加するための入口を追加しました
- **サーバーダウン時の接続不可アイコンを変更**: 接続不可アイコンを犬 (`ti-icon`) に変更しました
- **「もっと！」メニュー位置の案内**: HatasabaUI の「もっと！」案内アロー位置を、「もっと！」メニュー直下に表示するよう改善しました

### バグ修正

- **通知が来ない不具合を修正**: `markNotified` の呼び出し位置の不備で通知が来ないことがある不具合を修正しました
- **HataFeed 通知クリックで空白ページに飛ぶ不具合を修正**: HataFeed 通知をクリックすると空白ページに遷移してしまう不具合を修正しました
- **CSS Modules の動的キー解決不可によるセクション非表示を修正**: `unwind-css-module-class-name` の制約で動的キー (`$style[var]`) が解決されずセクションが非表示になる不具合を、静的キー分岐に書き直して修正しました
- **宴の枠の下枠が途切れる不具合を修正**: 吹き出し ON 時の宴枠を `outline` で、吹き出し OFF (デッキ等の四角ノート) 時は `.article[data-utage-square]` の `inset box-shadow` で描画するようにし、`overflow: clip` に切られないように修正しました
- **デッキ⇔通常表示の切替時の表示バグを修正**: 新デッキと通常表示を切り替えたときに表示が崩れる不具合を修正しました
- **デッキでアンテナ/チャンネルの初期表示が出ない不具合を修正**: 初回表示時にアンテナ/チャンネルの中身が読み込まれない不具合を修正しました
- **カラム間スクロールで縦スクロールしてしまう不具合を修正**: デッキ列を横スクロールしている際に意図せず縦スクロールしてしまう不具合を修正しました
- **宴カウントのチュートリアルポップアップがウィンドウ外に出る / 残留する不具合を修正**: 宴成功バッジのチュートリアルポップアップがウィンドウ外に表示される、またウィンドウを閉じても残留する不具合をそれぞれ修正しました
- **サーバーアイコンが長方形になる不具合を修正**: サーバーアイコンが用途によって長方形に潰れて表示される不具合を修正しました
- **天気エフェクトの `requestClear` の実装漏れを修正**: 天気エフェクトの `requestClear` の実装漏れを修正し、マネージャーに追加しました

### セキュリティ修正

- **【High】HataFeed イシューのカテゴリ書き換え攻撃を修正**: `hata/feedback/issues/update` で、個別 Issue モデレーター権限を持つ一般ユーザーが `category` を `security` / `improvement` に書き換えて隠蔽できた不具合を修正しました。スタッフ専用カテゴリへの変更はスタッフのみ可とするチェックを追加しています
- **【Medium】絵文字申請の危険プロトコル混入を防止**: HataFeed の絵文字申請 (`HataFeedEmojiApprove.vue` ほか) で、リモートURL に `javascript:` / `data:` などの危険プロトコルが混入することを防ぐようにしました。`http://` / `https://` のみを受理し、フロントエンド・バックエンドの双方で検証しています
- **【Medium】HataFeed 系 15 エンドポイントにレートリミット追加**: HataFeed 系エンドポイント (connect/notification/作成等) に `limit` を追加し、連打やスパムを防ぐようにしました

### 法令・規約への配慮

- **気象業務法第 17 条 (予報業務) / 第 23 条 (警報制限) への配慮**: 旗鯖の地震・津波情報ビューアは、**気象庁が発表した情報をそのまま表示・伝達するビューア**として設計しています。旗鯖が独自に予報・警報・速報を発する構造は採っていません。**緊急地震速報 (EEW) は扱いません**
- **新機能案内ポップアップの文言と非遷移化**: HatasabaUI の新機能案内ポップアップは「気象庁発表の情報を表示します」と明示し、クリックでは遷移しない案内のみとしました
- **Hatask ホームの地震タイルの出典明示**: Hatask ホームの地震タイルにも「気象庁発表の情報を表示します」と明示しました
- **出典の明示**: 気象庁 / P2P地震情報 / Natural Earth (都道府県境界) / 国土数値情報 (市区町村境界) を、設定画面・出典欄に明示しています
- **居住地のプライバシー**: お住いの都道府県は**端末ローカル保存が原則**で、「居住地のみ通知」をオンにした場合のみ通知判定のために都道府県名のみがサーバーに送信されます (オプトイン)

### 内部変更

- **新規バックエンドサービス**: `EarthquakeService` (P2PQuake WebSocket 接続・配信)・`FeedbackService` (HataFeed)・`ChannelService` (プライベートチャンネル閲覧権限) を新設しました
- **新規エンティティ**: `FeedbackProject` / `FeedbackIssue` / `FeedbackIssueModerator` / `FeedbackComment` / `FeedbackCommentReaction` / `FeedbackAgree` / `FeedbackEmojiRequest` / `FeedbackNotification` / `EarthquakeNotification` / `ChannelMember` を追加しました
- **マイグレーション追加**: HataFeed / Earthquake / プライベートチャンネル関連のマイグレーション (`1783000000000` 〜 `1784000000000`) を追加しました
- **DI 配線整理**: `CoreModule` / `RepositoryModule` / `postgres.ts` / `di-symbols.ts` / `endpoint-list.ts` に新サービス・エンティティ・エンドポイントを登録しました
- **SDK (cherrypick-js) 更新**: `notificationTypes` に `hataFeed` / `earthquake` を、`rolePolicies` に `canAccessHataFeed` / `canMakePrivateChannel` / `canRequestRemoteEmoji` / `emojiRequestLimit` を追加。Streaming 型に `earthquakeEvent` ペイロードを追加しました
- **Hatask ホームのデータ移行**: `boot/common.ts` に新タイル (`feedbackNotif` / `earthquake`) を既存ユーザーのホームに追加する移行を追加しました (端末ごと一度のみ実行)

### その他

- **`package.json` のバージョン表記を更新**: `2026.5.4-hata.11.6` → `2026.5.4-hata.11.7` に更新。`basedMisskeyVersion` (`2026.5.4`) と `codename` (`2026.7`) は変更なし


## hata-11.6

マスコット機能の本格実装と、タイムラインの天気エフェクト、HatasabaUIでのデッキ表示対応という3つの大きな表現系機能を主軸とした、機能拡張・改善リリースです。マスコットは好きな画像を立ち絵として画面に表示し、表情・セリフ・モーション・通知連携・誕生日演出などを設定できる旗鯖独自機能です。天気エフェクトはノート本文の言葉に応じて雨・雪・日差し・強風・流れ星などの演出を背景に表示し、光過敏症に配慮して強い明滅を一切行わない設計としており、 HatasabaUI の表示モード切替やナビゲーション周りの拡張、多数のバグ修正・UI 調整も含みます。本家 Misskey からの追加取り込みはありません。

### 新機能

- **マスコット機能を追加**: 好きな画像を立ち絵キャラクターとして画面に表示できる旗鯖独自機能です。キャラクターは複数登録でき切り替え可能で、設定はマスコット専用ページから行います。利用はロール (権限) で制御でき、設定画面に画像サイズ制限を明記しています。表示画像はドライブから選択し、画像データは IndexedDB (フォールバック時 localStorage) にキャッシュしてオフラインでも表示できるようにしています
  - **フローティング表示**: マスコットを画面上に浮遊表示し、ドラッグで自由に移動 (位置は保存)・最小化・左右反転・透過度調整・ぼかし調整ができます。その場で各種調整できる簡易設定パネルを備え、表示の ON/OFF はいつでも切り替えられます
  - **表情とセリフ (文言)**: キャラクターに複数の表情と対応するセリフを登録できます。表情には動き (なし/バウンス/シェイク/スウェイ/スピン) とその強さを設定でき、セリフはフキダシで表示。フキダシの位置・大きさ・向き・文字色も個別に調整できます
  - **表情・文言の自動切替**: 表示中のマスコットの表情・セリフを一定間隔 (プリセットまたは手動で 5秒〜30分) で自動的に切り替えられます。設定は専用ページとフローティング表示で共通です
  - **通知・誕生日の演出**: 通知時に専用の表情・セリフを表示できます。通知用表情は2種類まで登録でき通知時にランダムで切り替わり、Hatask の通知や外部アカウントの通知とも連携します。あなた自身の誕生日・キャラクター自身の誕生日に合わせた特別な表情も設定できます
  - **Hatask ホームのマスコットカード**: Hatask のホーム画面にマスコットをカードとして表示できます。フローティング表示と連動して二重表示にならないよう自動調整します
  - **.hmtk インポート / エクスポート**: マスコット設定を `.hmtk` 形式で書き出し・読み込みでき、設定のバックアップや端末間の移行に使えます
  - **設定ミスのガード**: 画像未指定・誕生日の月日未入力など設定に不備がある場合は保存ボタンをグレーアウトし、理由を表示します
- **天気エフェクトを追加**: タイムラインのノート本文に天気や挨拶の言葉が含まれていると、画面背景に演出を表示する遊び要素です (デフォルト OFF、旗鯖設定から有効化)。雨・大雨・雪・日差し・強風・流れ星の全6種に対応し、「晴れ」「雨」などの天気語のほか「おはよう」で日差し、「おやすみ」「いい夜」で流れ星といった挨拶でも発動します
  - **UI 連動演出**: 雨・大雨のときはノートボタン・投稿フォーム・ナビバーの上に水が当たって伝い落ち、マウスを動かすと周囲の雨を弾けます。日差しのときはマウスカーソルに光源と反対向きの影がつき、光源からの距離で影が減衰します。強風のときは流れる葉がサイドメニュー等の縁に引っかかってくるくる回ります。対象 UI 要素は `data-cy-open-post-form` 等のセレクタで取得し、要素の位置を定期取得して当たり判定を行います
  - **演出の長さ設定**: 「長め (該当ノートがある間ずっと)」「短め (約10秒)」を選べます。「おはよう」「おやすみ」などの挨拶由来の演出は設定に関わらず約10秒で自動的に消えます
  - **光過敏症への配慮**: 強い明滅・点滅・閃光は一切行わず、雷のような演出も実装していません。OS の「視差効果を減らす」(`prefers-reduced-motion`) 設定に追従し、タブ非アクティブ時は描画を停止します。各エフェクトは TL の DOM に触れず body 直下の `position: fixed` な canvas として描画するため、タイムラインのレイアウトに影響しません
- **HatasabaUI の表示モード・ナビゲーション拡張**: デスクトップで通常表示とデッキ表示をワンタップで切り替えられるようにし、ナビゲーションを上部メニュー / 左サイドメニューから選べるようにしました。左サイドメニューは手動で縮小・拡大できます。デッキ表示中はノート間隔を「詰める」に強制して情報密度を上げ、HatasabaUI デッキ用のお知らせ吹き出しは個別に無効化できるトグルを追加しました
- **HatasabaUI のお知らせ吹き出しとサイドメニュー操作改善**: 新機能を案内するお知らせ吹き出しを追加し、サイドメニューの縮小/拡大ボタンを再配置しました
- **宴チャレンジの成功回数をプロフィールに追加**: 宴 (うたげ) チャレンジに成功した回数を、ユーザー詳細 (`utageSuccessCount`) として集計しプロフィールに表示できるようにしました。`UtageSession` を `userId` + `status: 'succeeded'` で集計するだけのマイグレーション不要な実装で、取得失敗時は 0 にフォールバックします。両カラムにインデックスがあるため集計は高速です。なおこの値は ActivityPub の Person オブジェクトには含まれず、連合先には配信されません
- **未処理の登録申請インジケーターを追加 (管理者向け)**: 承認制登録の運用時、未処理の登録申請があるとコントロールパネルにインジケーターと警告を表示し、申請の見落としを防ぎます
- **ページタイトル二重表示を解消するトグルを追加**: HatasabaUI でページタイトルが二重に表示される場合に解消できるトグル (`simpleUi.showPageHeader`) を追加しました
- **サイドメニューのスクロールバーを非表示化**: サイドメニューのスクロールバーを隠し、続きがある時は上下のフェードで示すようにしました

### バグ修正

- **フォロワー限定ノートのメンション通知が生成されない不具合を修正**: フォロワー限定ノートでメンション通知が null 参照により生成されない不具合を修正しました
- **宴セッションが作成に失敗する不具合を修正**: `note.createdAt` の廃止に伴い宴セッションの作成が失敗していた不具合を、バックエンド側で修正しました
- **存在しない API 呼び出しによるクラッシュを修正**: ユーザーメニューのミュート/ブロック、および HatasabaUI の未読通知フォールバックが、存在しない `os.api` を呼び出してクラッシュする不具合をそれぞれ修正しました
- **削除済みメニュー項目が残る問題を修正**: 削除済みのメニュー項目 (`hataWhatsNew` 等) やサイドバー項目 (`whatsNew` 等) が、既存ユーザーのサイドメニュー・HatasabaUI ナビバーに残ってしまう問題を、描画時に除去するよう修正しました
- **通知クリックで Hatask ページに遷移しない問題を修正**: Hatask 関連の通知をクリックしても Hatask ページに遷移しない問題を修正しました
- **パネルヘッダーの操作ボタンのズレを修正**: パネルヘッダーの操作ボタンが `contain` 配下で `sticky` が効かずずれる不具合を、flex レイアウトで修正しました
- **HatasabaUI デッキのウィジェット枠線を修正**: HatasabaUI デッキでウィジェット枠線が反映されない問題を修正し、OFF 時には灰色枠を表示するようにしました
- **天気エフェクトの初期化・表示まわりの修正**: タイムラインの setup 初期化順序エラー (paginator 初期化前のアクセスによる setup クラッシュ) を修正したほか、初回チュートリアルがタブ/UI 切替時に再表示される問題を防止しました。通常の雨が細すぎる問題・大雨のスマホでの密度過多・伝う雫が背景色に埋もれる視認性の問題・日差しが白背景で見えにくい問題なども順次調整しています
- **マスコット設定まわりの修正**: 設定ボタンが表示ページへの遷移になっていたのを設定ポップアップに修正し、利用不可/同意画面を中央寄せにしてヘッダーに利用規約ボタンを追加しました。通知用表情の説明文から絵文字を削除し、フローティングのモーション参照切れも修正しています
- **スマホで宴成功バッジ吹き出しの座標ズレを修正**: スマホで宴成功バッジの吹き出しを画面下部シート表示にすることで座標ズレを回避しました
- **通知アイコンの表示統一**: Hatask 通知アイコンの背景円サイズを、アバター付き通知と統一しました

### UI/UX 改善

- **マスコット設定のレイアウト調整**: キャラ切替カードをモバイルでは最上部、デスクトップでは最右列の先頭に移動し、名前+削除ボタンも右列 (PC)/最上部 (スマホ) の先頭に配置しました
- **戻るボタンのアイコン統一**: ページヘッダー・タイトルバー・ウィンドウの戻るボタンを `chevron-left` に統一しました
- **UI モード切替チップの文言変更**: HatasabaUI の UI モード切替チップの「シンプル表示」を「通常表示」に変更しました
- **マスコット設定ヘッダーのボタン統一**: 設定ヘッダーの利用規約ボタンを `MkButton` に置き換え、完了ボタンと形を統一しました

### その他

- **ブランディングの調整**: favicon / apple-touch-icon をサーバーアイコン (`iconUrl` / 動的生成) に連動させ、Service Worker の空通知のソフトウェア名表記を Hataskey に変更しました。また、実績 (achievement) の文言を Hataskey 表記に統一し、デッキ UI チュートリアルの実績解除を修正しました
- **ソース開示ポップアップの判定 URL を修正**: AGPL ソース開示ポップアップの無改変判定 URL を `tolehata/hataskey` に修正しました
- **HTML コメントのビルド時除去**: pug 内のアスキーアート (AA) コメントを、出力対象 (`//`) からビルド時に除去される形式 (`//-`) に変更しました
- **セキュリティ・連合監査を実施**: 今回の追加機能 (宴成功回数のバックエンド集計・天気エフェクトのフロント実装) について、SQL インジェクション・XSS・危険な DOM API・N+1・ActivityPub への情報漏洩などを監査し、致命的な問題がないことを確認しました。宴成功回数は連合先に配信されず、天気エフェクトは完全にクライアントサイドで動作します (コード変更なし)
- **機能解説 (旗鯖機能解説) を更新**: 「マスコット」カテゴリを新設し、天気エフェクト・HatasabaUI のデッキ表示・宴成功回数・登録申請インジケーターなど今回追加した機能の解説を追加しました
- **UI 選択モーダルの調整**: UI 選択モーダル (`MkUISetup`) で Misskey UI のカードを小型化し、「非推奨」バッジを表示するようにしました。旗鯖は多くの Misskey 機能をカスタマイズしているため、HatasabaUI の利用を推奨する意図です
- **`package.json` のバージョン表記を更新**: `2026.5.4-hata.11.5` → `2026.5.4-hata.11.6` に更新。`basedMisskeyVersion` (`2026.5.4`) と `codename` (`2026.7`) は変更なし

## hata-11.5

外部アカウント連携機能の本格実装を主軸とした機能拡張リリースです。連携先サーバーの通知をリアルタイムに受け取れるようにし (WebSocket 化・トースト通知・専用ページ)、加えてローカルタイムライン上で遊べる新要素「宴 (うたげ) チャレンジ」を追加しました。あわせて、プロフィールタブのピル化・各検索ボックスのカプセル型化など UI デザインの統一を進めています。本家 Misskey からの追加取り込みはありません。また、開発リポジトリを Forgejo (code.tolehata.net) から GitHub へ移行しました。

### 新機能

- **宴 (うたげ) チャレンジを追加**: 本文に「宴」「うたげ」「ぅたげ」「utage」を含むローカルノートをローカルタイムライン (LTL) に投稿すると、そのノートが15分間明滅する遊び要素です。「反応されたら負け」のチキンレースで、誰にも反応 (リアクション・リプライ・リノート) されずに15分逃げ切れたら緑色で「成功」、途中で誰かに反応されたら赤色で「失敗...」と表示されます。
  - 演出はフロント完結。LTL 表示中フラグを `provide`/`inject` で `MkStreamingNotesTimeline` → `MkNote` に伝達し、LTL に表示されているときだけ明滅します。リアクションは `useNoteCapture` の reactive な `reactionCount` を見てリアルタイム判定するため、リロード不要で投稿者・反応者・閲覧者すべての画面で同時に結果が反映されます。投稿から6時間経過で通常ノートに戻ります
  - 明滅・結果表示は吹き出し本体 (`.bubbleBody`) の枠線 (`outline`) の色を強弱させる形で実装 (親要素の `overflow: clip` に切られないよう `box-shadow` ではなく `outline` を使用)。結果バッジは縁取り (`text-shadow`) でライト・ダーク両テーマで読めるようにしています
  - 初回投稿時にチュートリアル (`MkTip`) を表示。複数の宴ノートが同時に表示されても画面内で1つだけ出るよう、モジュールスコープで表示権を管理しています
- **外部アカウントの通知をリアルタイム受信**: 連携した外部サーバーの通知を旗鯖の画面上でリアルタイムに受け取れるようにしました。WebSocket による購読で新着通知をトースト表示し、専用の通知ページ (`/external-notifications`) で一覧を確認できます。外部TLタブや Hatasaba UI のピル型ボタンからアクセスできます。あわせて、外部通知メニューの UI 統合・通知表示の改善・管理者保護機能を追加しています

### バグ修正

- **拡張プロフィールのメニュー操作時にポップアップが閉じる問題を修正**: ユーザーポップアップ (`MkUserPopup`) でメニューを開くとホバー判定が外れてポップアップごと閉じてしまう問題を、メニュー表示中フラグ (`menuShowing`) で抑止するよう修正しました。あわせて吹き出し装飾の一部を整理しています
- **管理者ミュート文言の日本語化・アバター位置・フォントの修正**: 管理者ミュート関連の文言を日本語化し、`MkNote` のアバター位置 (`margin-top`) を調整、Righteous フォントまわりの表示を修正しました

### UI/UX 改善

- **チャンネルカラーの線をノートカードの枠線に沿わせる**: チャンネル投稿ノートで左端にまっすぐな縦線で表示していたチャンネルカラーを、ノートカードの角丸の枠線に沿った形 (`border-left` + `border-radius`) に変更しました
- **プロフィールページのタブをピルケース型に**: プロフィールの概要/ノート/ファイル等のタブを、お知らせ・グループ・チャットと統一したピルケース型に変更しました。タブが多いため、マウスホイール (縦回転) を横スクロールに変換する処理を追加しています。重複していたユーザーメニューはプロフィール本体側に集約しました
- **検索ボックスのカプセル型化**: メッセージ (チャット) の検索ボックスをカプセル型 (角丸) に、チャンネルページの検索ボックスを検索ページと同様の「検索ボタンを内包した一体型カプセル」にリデザインしました (検索機能・絞り込み項目は維持)
- **お知らせの種類フィルター・グループタブのピル化・設定プロフィールボタンの再設計**: お知らせページに種類 (情報・警告・エラー・完了・メンテナンス) での絞り込みフィルターを追加し、グループタブをピル型に、設定画面のプロフィールボタンを再設計しました
- **Hatask の機能改善・各種UI調整**: Hatask Eye の AI 利用に関する注記追加、紫系テーマの既定追加、ごはん記録セクションの追加、カード並び替えと表示/非表示の統合、トレンドチュートリアルの追加、ノート下部へのティッカー移動など、Hatask まわりを中心に細かな改善を行いました

### その他

- **開発リポジトリを Forgejo から GitHub へ移行**: ソースコードの参照先・リポジトリ URL 表記を `code.tolehata.net` (Forgejo) から GitHub (`github.com/tolehata/hataskey`) へ移行しました
- **旗鯖新機能ページ (hata-whats-new) を削除**: 役目を終えた「旗鯖新機能」ページと、サイドバー定義・ルート・Hatask 内ボタンなどの遷移導線をすべて削除しました
- **機能解説 (旗鯖機能解説) を更新**: バブルゲームの解説を削除し、今回追加・改善した「宴チャレンジ」「お知らせの種類フィルター」「外部アカウントの通知」の解説を追加しました
- **外部TL・外部通知機能のセキュリティ監査を実施**: 今回実装した外部連携機能について、SSRF (バックエンドのプライベートIP遮断)・XSS・認証情報の取り扱い・レート制限などを監査し、致命的な問題がないことを確認しました (コード変更なし)
- **`package.json` のバージョン表記を更新**: `2026.5.4-hata.11.4.5` → `2026.5.4-hata.11.5` に更新。`basedMisskeyVersion` (`2026.5.4`) と `codename` (`2026.7`) は変更なし

## hata-11.4.5

hata-11.4 リリース直後に発見した複数のバグ修正と、HatasabaUI サイドメニューの体験改善、旗鯖の設定方針に基づく一部設定の固定化などをまとめたパッチリリースです。本家 Misskey からの追加取り込みはありません。

### バグ修正

- **メンテナンス進捗バーの設定が端末ごとに同期されない問題を修正**: hata-11.4 で実装したメンテお知らせの進捗バー機能で、`admin/announcements/list` エンドポイントの res schema と return マッピングに `progressSteps` / `progressCompleted` を含め忘れていました。DB には正常に保存されていたものの、list エンドポイントが返さないため、コンパネで設定保存しても他端末で同じお知らせを開くと進捗バーフィールドが「無い」状態でロードされ、トグルがオフ表示されていました。`list.ts` の res schema に2フィールド追加 (`array, nullable: true`) と return マッピングに `progressSteps: announcement.progressSteps ?? null` / `progressCompleted: announcement.progressCompleted ?? null` を追加して同期するように修正しました。DB に保存済みのデータはそのまま反映されるためデータ消失はありません
- **ノートヘッダーの外部サーバーラベルが日時より垂直方向に少し下にズレて表示される問題を修正**: hata-11.4 で `MkInstanceTicker` を日時の左に配置するレイアウト変更 (`MkNoteHeader.vue`) を入れた際、`MkInstanceTicker` 自身の `.root` に元々設定されていた `margin-top: 5px` (旧レイアウトの「日時の下に別行で表示」時の縦間隔用) が残っており、中央位置から 5px 下にオフセットされて表示されていました。`MkNoteHeader.vue` の `.ticker` 内に `> :global(*) { margin-top: 0; }` を追加して子コンポーネントの top margin を打ち消し、垂直方向の中央揃えが正しく効くように修正しました。MkNoteDetailed (別行表示のまま) には影響しない局所修正です

### UI/UX 改善

- **MisskeyUI / Deck UI のトレンドタブ位置を HatasabaUI と統一**: hata-11.4 で HatasabaUI のトレンドタブを通常タブの右端 (外部TLの左) に移動しましたが、MisskeyUI (`timeline.vue`) と Deck UI (`tl-column.vue`) のトレンドタブが左端のままだったため、すべてのUIで一貫した並び「通常タブ → トレンド → 外部TL」になるよう統一しました。MisskeyUI では `headerTabs` / `headerTabsWhenNotLogin` の配列順を変更してトレンドを通常タブ・リスト・アンテナ・チャンネルの後・外部TLの前に配置。Deck UI では従来トレンド列の表示用ロジック (`column.tl === 'trending'` の `v-else-if` など) は存在していたものの、列タイプ選択メニュー (`setType`) の `items` 配列に trending が含まれておらず**新規列として作れない**状態だったため、選択肢に追加して `bubble` の直後・`ohtl` の前に配置しました
- **HatasabaUI サイドメニューに表示/非表示トグルを追加**: サイドメニューの並び替え設定で、各項目を個別に表示/非表示に切り替えられるようにしました。トグルOFFの項目はサイドバーから非表示になり、並び替え画面ではグレーアウト (opacity: .45) で残ります (再表示可能)。タイムライン / 通知 / お知らせ / フォロー申請 / もっと の5つは必須項目として常に表示扱いとなり、トグルの代わりに鍵アイコン (`ti-lock`) が表示されてトグル不可になります (設定は元々サイドバー並び替え対象外)。既存ユーザー設定との互換性のため、`visible` フィールドが無い項目は表示 (`true`) として扱います。描画側 (`simple.vue`) でも `visible === false` の項目を除外する処理を入れていますが、必須項目はそこでも強制表示されるため、誤って `visible: false` で保存された場合の保険になっています
- **上部ナビバー・下部ナビバー・サイドメニューに「並び替えを初期化」ボタンを追加**: 3つの並び替えセクションそれぞれに、並び順と表示状態を `def.ts` のデフォルトに戻すボタンを追加しました。クリック時に確認ダイアログを表示し、OKを選択した場合のみ初期化されます。実装は `getInitialPrefValue('simpleUi.xxx')` で正規のデフォルト値を取得し JSON deep clone で代入する形 (新規ユーザーと完全に同じ初期状態に戻る)
- **「柔らかい転換アニメーション」設定を強制ONに固定**: 設定 → 環境設定 → パフォーマンスの「柔らかい転換アニメーション」を、旗鯖では常時ONに固定する方針に変更しました。設定画面のトグルは `:disabled="true"` で操作不可となり、視覚的には常時ON状態で表示、説明文に「※旗鯖では常時オンに固定されています」の注記を追加。また、過去にユーザーが OFF (preference値 `true`) で保存していた場合に備えて、起動時 (`main-boot.ts`) に `prefer.commit('smoothTransitionAnimations', false)` で強制的に上書きする処理を入れ、UIと実際の挙動が一致するようにしています

### その他

- **設定 → 環境設定 → CherryPick の説明文を修正**: `_cherrypick.functionDescription` の文言が hata-11.3 のブランディング一括置換の際に誤って「Hataskeyが追加する独自機能を有効または無効にします。」と置換されていました。このセクションは CherryPick 由来の独自機能をまとめた設定枠であるため、本来の意味に戻して「**CherryPick**が追加する独自機能を有効または無効にします。」に修正しました。なお、サーバー名やようこそ画面など、旗鯖のブランドを示す箇所の「Hataskey」表記はそのままです
- **`package.json` のバージョン表記を更新**: `2026.5.4-hata.11.4` → `2026.5.4-hata.11.4.5` に更新。`basedMisskeyVersion` (`2026.5.4`) と `codename` (`2026.7`) は変更なし

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
- **メンテナンス進捗バーの設定が端末ごとに同期されない問題を修正**: 上記の新機能「メンテお知らせの進捗バー」を実装した際、`admin/announcements/list` エンドポイントの res schema と return マッピングに `progressSteps` / `progressCompleted` を含め忘れていたため、コンパネで設定保存しても他端末で同じお知らせを開くとフィールドが「無い」状態でロードされ、進捗バーのトグルがオフ表示されていました (DB には正常に保存されている状態)。`list.ts` の res schema に2フィールド追加 (`array, nullable: true`)、return マッピングに `progressSteps: announcement.progressSteps ?? null` / `progressCompleted: announcement.progressCompleted ?? null` を追加して同期するように修正しました。DB に保存済みのデータはそのまま反映されるためデータ消失なし

### UI/UX 改善

- **ギャラリーページのタブを共通ピル型デザインに統一**: hata-11.3 でピル型タブに統一した10ページの一覧から漏れていたギャラリーページ (`gallery/index.vue`) も他ページと同じピル型タブに刷新しました。`PageWithHeader` の `:tabs="[]"` で旧ヘッダタブを無効化し、body 上部に共通仕様のピル型タブ (sticky top:0, backdrop blur, accent active state) を実装。ログイン状態での `headerTabs` / `headerTabsWhenNotLogin` 出し分けは維持しています
- **トレンドタブを通常タブの右端 (外部TLの左) に移動**: HatasabaUI 上部タブの並び順を「通常タブ... → トレンド → 外部ホーム → 外部ローカル」に変更しました。従来は `visibleTopTabs` でトレンドタブを配列先頭に固定していたのを末尾配置に変更し、外部TL (ohtl/oltl) は後段の `tabOrder` で `push` されるため、結果としてトレンドが「通常タブの右端、外部TLの左」の位置に収まります
- **MisskeyUI / Deck UI のトレンドタブ位置も同じ並びに統一**: 上記の HatasabaUI 変更に合わせて、MisskeyUI (`timeline.vue`) と Deck UI (`tl-column.vue`) のトレンドタブ位置も「通常タブ群の右端、外部TLの左」に統一しました。MisskeyUI では `headerTabs` / `headerTabsWhenNotLogin` の配列順を変更してトレンドを通常タブ・リスト・アンテナ・チャンネルの後・外部TLの前に。Deck UI では従来トレンド列の表示用ロジック (`column.tl === 'trending'` の v-else-if など) は存在していたものの、列タイプ選択メニュー (`setType`) の `items` 配列に trending が含まれておらず**新規列として作れない**状態だったため、選択肢に追加して `bubble` の直後・`ohtl` の前に配置しました
- **サイドメニュー並び替えをグループ内限定に + グループラベル表示**: HatasabaUI サイドメニューの並び替え設定で、従来はグループ (基本 / Hatask / 発見・交流 / もっと) をまたいで自由に動かせていましたが、表示側のグループ強制再分類との組み合わせでラベル位置が崩れる懸念があったため、**グループ枠を固定とし、並び替えは各グループ内でのみ可能**に変更しました。`canMoveSidebar(idx, dir)` で隣接要素のグループを比較し、別グループなら境界として ▲▼ ボタンを `disabled` に。並び替えリストにグループラベル (`isSidebarGroupHead` / `sidebarGroupLabelOf`) を表示し、どの項目がどのグループに属するか可視化しています
- **サイドメニュー下部 (投稿/アカウント) を固定化、メニュースクロールで隠れないように**: 従来は `sidebarInner` 全体が `overflow-y: auto` で、メニュー項目が増えると下部の「ノート」ボタンとアカウント表示も一緒にスクロールして隠れていました。`sidebarInner` を `overflow: hidden` に変更し、メニュー群を新設の `.sbScroll` (`flex:1; min-height:0; overflow-y:auto`) でラップ、`.sbBottom` (投稿+アカウント) は `flex-shrink: 0` で外側に固定する3層構成 (ロゴ上部固定 / メニュースクロール / 下部固定) にしました。PC のサイドバーとモバイルのドロワー両方に適用
- **サイドメニューに「メッセージ」を追加 (既存ユーザー含む全員に反映)**: HatasabaUI サイドメニュー基本グループに「メッセージ」(`ti ti-messages`) を通知の直後に追加しました。`def.ts` のデフォルト変更だけでは保存済み `simpleUi.sidebar` を持つ既存ユーザーに反映されないため、`sidebarGroups` computed で「`sidebarOrder` に `chat` が無ければ基本グループの通知直後に動的注入する」方式 (トレンドタブと同じ手法) を採用しています。`def.ts` に `chat` がある新規ユーザーは `sidebarOrder` に持つため二重注入されません。クリック (`goToChat`) / 未読ドット (`hasUnreadChat`) / アクティブ判定 (`isChatPage`) は既存実装を流用
- **サイドメニューに表示/非表示トグルを追加**: サイドメニューの並び替え設定で、各項目を個別に表示/非表示に切り替えられるようにしました。トグルOFFの項目はサイドバーから非表示になり、並び替え画面ではグレーアウトで残ります (再表示可能)。タイムライン / 通知 / お知らせ / フォロー申請 / もっと の5つは必須項目として常に表示扱いとなり、トグルの代わりに鍵アイコン (`ti-lock`) が表示されてトグル不可になります (設定は元々サイドバー並び替え対象外)。既存ユーザー設定との互換性のため、`visible` フィールドが無い項目は表示 (`true`) として扱います。描画側 (`simple.vue`) でも `visible === false` の項目を除外する処理を入れていますが、必須項目はそこでも強制表示されるため、誤って `visible: false` で保存された場合の保険になっています
- **上部ナビバー・下部ナビバー・サイドメニューに「並び替えを初期化」ボタンを追加**: 3つの並び替えセクションそれぞれに、並び順と表示状態を `def.ts` のデフォルトに戻すボタンを追加しました。クリック時に確認ダイアログを表示し、OKを選択した場合のみ初期化されます。実装は `getInitialPrefValue('simpleUi.xxx')` で正規のデフォルト値を取得し JSON deep clone で代入する形 (新規ユーザーと完全に同じ初期状態に戻る)

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
