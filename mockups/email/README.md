# Hataskey UI メールとモック

**通常の Hataskey UI を基準に、現行の送信処理へ接続したテンプレートです。デプロイ・実メール送信は行っていません。**

メールのヘッダーと文中のサーバー名は、`EmailService` が `meta.name` から渡す運用中のサーバー名（未設定時はホスト名）を表示します。既定のモック名「サンプルサーバー」は表示確認用の架空の名称です。ギャラリー外枠の「Hataskey email lab」はデザインプレビューツールの名称です。

現行の13送信経路を網羅した15ケース（残り日数／時間、SMTPテストを含む）、現在停止中の通知2ケース、表示確認6ケースの計23ケースを用意しています。各ケースに日本語・英語、ライト・ダークがあり、92通りのHTMLと46通りのテキストを生成します。自由入力の管理者メール本文・表示名・通報内容は言語切り替えでも翻訳しません。

## 開く・再生成する

リポジトリのルートから、Node.js 24以上で実行します。SMTP・データベース・アプリ本体のビルドは不要です。

```sh
node mockups/email/generate.mjs
python3 -m http.server 4187 --bind 127.0.0.1 --directory mockups/email
```

[ローカルプレビュー](http://127.0.0.1:4187/) を開きます。検索、680/375/320pxの表示幅、明暗、日本語／英語、HTML／テキスト、画像なしの表示に対応しています。画面が指定幅より狭い場合は実際の表示幅を示します。HTML・テキストを個別に保存できます。

`generated/` に各HTML・テキストと `catalog.json`、`assets/` に既存のRighteousフォントとライセンスを生成します。これらは生成物としてGitの対象外です。フォントはギャラリー専用で、送信候補のHTMLに外部フォントの通信はありません。プレビュー内のリンクは無効化し、画像の外部取得とスクリプトはCSPで遮断します。

サーバー名の前には32pxのサーバーアイコンを配置します。通常ケースのプレビューには `server-icon.svg` の仮アイコンを埋め込んだ `previewHtml` を用い、画像オフではアイコンの列も省きます。保存用HTMLは検証済みのHTTP(S)画像URLを保持し、埋め込みSVGを本番メールへ渡しません。「独自のサーバー名・アイコン取得失敗」は画像を取得できない場合の確認用です。

## デザインの根拠

- 通常UIの識別: `packages/frontend/src/components/MkUISetup.vue` の `simple` と `packages/frontend/src/ui/simple.vue`。
- 通常UIは `--MI_THEME-*` を使うため、モックの色は `boot/common.ts` が選ぶ既定の `packages/frontend-shared/themes/l-cherrypick.json5` / `d-cherrypick.json5` に基づきます。利用者・サーバー固有のテーマを取得したものではありません。
- ライト: 背景 `#eef1fc`、面 `#f6f9ff`、本文 `#577096`、アクセント `#6ba5e3`。リンクとボタンは可読性のため濃い青 `#305f96` に調整。ダーク: 背景 `#1c1c25`、面 `#23232f`、本文 `#eceff4`、アクセント `#ffc5e6`。
- `style.scss` の基本角丸12px、`simple.vue` の丸いナビゲーション、`MkButton.vue` のピル型ボタンとゆったりした操作領域をメールへ適用。本文は LINE Seed JP / Pretendard JP / 日本語システムフォントへのフォールバックです。
- カテゴリ、見出し、説明、必要情報、主操作、注意事項、フッターの順に整理。メールアドレス確認と再設定では代替URLを併記し、登録前・アカウント削除後などは不要な設定導線を省きます。
- 定型見出しは「パスワードを」「再設定しましょう。」など意味のまとまりを優先し、画面幅に応じてまとまりの間で折り返します。固定改行は入れず、まとまり自体が画面より長い場合は内部の折り返しを許容します。本文は句点「。」ごとに改行し、自由入力も含めて既存の段落・空行を保持します。HTML・テキスト版に同じ改行を反映します。行内は日本語の禁則処理と通常の単語境界を優先し、URL・長いIDははみ出しを防ぐため途中でも折り返します。

## ケースと接続先

以下のパスは `packages/backend/src/` からの相対パスです。

| ケース | 現行の送信元 | 差し替え入力 |
| --- | --- | --- |
| 新規登録 | `server/api/SignupApiService.ts` | `signup`、既存の登録完了URL |
| 登録申請の承認 | `server/api/endpoints/admin/approve-registration.ts` | `registration-approved`、username |
| メールアドレス確認 | `server/api/endpoints/i/update-email.ts` | `verify-email`、既存の検証URL |
| パスワード再設定 | `server/api/endpoints/request-reset-password.ts` | `reset-password`、既存の再設定URL |
| ログイン通知 | `server/api/SigninService.ts` | `login` |
| 投稿・ドライブの削除 | `queue/processors/TruncateAccountProcessorService.ts` | `account-truncated` |
| アカウント削除 | `queue/processors/DeleteAccountProcessorService.ts` | `account-deleted` |
| 運営宛の通報 | `core/AbuseReportNotificationService.ts` | `abuse-report`、comment |
| キュー経由の通報 | `queue/processors/ReportAbuseProcessorService.ts` | `abuse-report-forwarded`、comment |
| 活動確認（日／時間） | `queue/processors/CheckModeratorsActivityProcessorService.ts` | `moderator-inactive`、remaining、unit |
| 招待制への変更 | 同上 | `invitation-only`、inactiveDays |
| パブリック投稿の無効化 | 同上 | `public-note-disabled`、inactiveDays |
| 管理者メール・SMTPテスト | `server/api/endpoints/admin/send-email.ts` | `admin-message`、subject、text |
| フォロー・リクエスト（停止中） | `core/NotificationService.ts` のコメント部分 | `follow` / `follow-request`、表示名、アカウント、プロフィールURL |

表示確認には長文、長いURL、長い英数字・特殊文字、HTML文字列の通報、独自サーバー名・取得できないアイコン、空の本文を含みます。実在するメールアドレス・認証トークン・個人情報は使っていません。

## 送信処理への接続

- `EmailService.sendTemplateEmail(to, input, locale?)` は種類別の入力から完成済みHTML・テキストを生成します。既存の13送信経路のうち定型12経路が使用します。
- `EmailService.sendEmail(to, subject, html, text)` は管理者メールの既存シグネチャを保持します。HTML断片を `sanitize-html` の既定ポリシーで安全化し、新レイアウト内に表示します。許可された書式・リンクは保持し、テキスト本文は独立した入力を使用します。
- どちらも共通の配送メソッドを使い、既存の `enableEmail`、送信者・宛先、SMTP認証、TLS、プロキシ、成功ログとエラーの再送出を維持します。完成済みのHTMLを旧ラッパーへ渡す処理はありません。

```ts
await emailService.sendTemplateEmail(profile.email, {
  kind: 'reset-password',
  url: link,
}, profile.lang);
```

テンプレートは `core/email/hataskey-email-content.ts`、描画は `core/email/render-hataskey-email.ts` にあります。一般の動的な値はHTMLエスケープし、操作URLは絶対HTTP(S)のみ許可します。管理者HTMLの `htmlBody` も描画時に必ず安全化し、属性のURLを触らずにテキスト部分へ句点改行を適用します。

送信言語は取得済みの受信者プロフィールの言語を優先し、未指定時はサーバーの先頭言語、両方未設定時は日本語です。`ja` / `ja-JP` 等は日本語、それ以外は英語へフォールバックします。登録前やサーバーアドレス宛てはサーバー言語を使います。以前の日英併記本文も、同じ情報を含む受信者向けの単一言語テンプレートへ置き換えています。管理者の件名・本文や通報内容などの自由入力は翻訳しません。

サーバー名は `meta.name || config.host`、アイコンは `meta.iconUrl`（相対URLはサーバー基準で解決）、未設定・不正なアイコンURLは `/favicon.ico` を使います。横長の `logoImageUrl` はサーバーアイコンには使用しません。以前の候補で使った `EmailBrand.logoUrl` は互換入力として残していますが、本番接続では `iconUrl` を使用します。

本番の描画はOS設定に合わせた暗色用CSSを含みます。プレビューでは `theme: 'light' | 'dark'` を明示しています。SMTPに渡す直前に `juice` でスタイルをインライン化します。

宛先、検証済みメール条件、通報の送信設定、トークン生成／有効期限、承認時の `emailSent`、各呼び出し元の非同期実行と失敗時の扱いは既存どおりです。モデレーターへのアプリ内お知らせ・Webhookも変更しません。停止中のフォロー系は接続しません。

切り替え後の実メールクライアント確認は、管理画面のSMTPテストを使い、Gmail・Outlook・Apple Mail等でアイコン、暗色、狭い画面幅とリンクを確認してください。この作業では実送信していません。

## 確認

```sh
node --test mockups/email/email.test.mjs
node --check mockups/email/gallery.js
node node_modules/typescript/lib/tsc.js --ignoreConfig --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext packages/backend/src/core/email/render-hataskey-email.ts packages/backend/src/core/email/hataskey-email-content.ts
pnpm --filter backend exec vitest run --config vitest.config.ts test/unit/HataskeyEmailService.test.ts
```

送信元との対応、92通りの生成、HTMLエスケープ、危険なURLとヘッダー改行の拒否、テキスト版の情報維持、アカウント状態別のフッター、画像なし表示を確認します。`HataskeyEmailService.test.ts` はSMTPをモックし、実送信せずに送信設定・無効時の抑止・言語選択・アイコンのフォールバック・管理者HTMLの安全化・失敗の伝播を確認します。登録承認や通報・モデレーター通知の既存テストも新しい送信メソッドに対応しています。レイアウトはテーブルとインラインCSSが中心で、外部CSS・JavaScript・Webフォントに依存しません。

Gmail・Outlook・Apple Mailの実機受信試験、OutlookのWord描画、クライアントによる強制色反転は未確認です。角丸と暗色メディアクエリの適用状況はクライアントによって異なるため、実配送への接続時に確認します。本番メールの送信・設定変更・デプロイは行っていません。
