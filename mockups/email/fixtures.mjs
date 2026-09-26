/* SPDX-License-Identifier: AGPL-3.0-only */

export const brand = { name: 'サンプルサーバー', url: 'https://hataskey.example.invalid', iconUrl: 'https://hataskey.example.invalid/server-icon.png' };
const endpoint = 'packages/backend/src/server/api/endpoints/';
const core = 'packages/backend/src/core/';
const queue = 'packages/backend/src/queue/processors/';
const sample = (id, label, group, source, input, notes = '', status = 'active', extra = {}) => ({ id, label, group, source, input, notes, status, ...extra });

// Fictional addresses/tokens only. These fixtures never access an account or SMTP.
export const fixtures = [
	sample('signup', '新規登録の確認', '登録・アカウント', 'packages/backend/src/server/api/SignupApiService.ts', { kind: 'signup', url: `${brand.url}/signup-complete/preview-signup-code` }, '登録前なので、ログインが必要なメール設定リンクは表示しません。'),
	sample('registration-approved', '登録申請の承認', '登録・アカウント', `${endpoint}admin/approve-registration.ts`, { kind: 'registration-approved', username: 'haru' }, '承認された申請のメールアドレスとユーザーIDを使用。却下時のメールは現状存在しません。'),
	sample('verify-email', 'メールアドレスの確認', '登録・アカウント', `${endpoint}i/update-email.ts`, { kind: 'verify-email', url: `${brand.url}/verify-email/preview-verification-code` }),
	sample('reset-password', 'パスワードの再設定', 'セキュリティ', `${endpoint}request-reset-password.ts`, { kind: 'reset-password', url: `${brand.url}/reset-password/preview-reset-token-do-not-use` }, '有効期間30分は reset-password.ts の検証条件に基づきます。トークンはモック専用です。'),
	sample('login', '新しいログイン', 'セキュリティ', 'packages/backend/src/server/api/SigninService.ts', { kind: 'login' }, '現行のメールにないIPアドレス・端末・位置情報は追加していません。'),
	sample('account-truncated', '投稿・ドライブの削除完了', '登録・アカウント', `${queue}TruncateAccountProcessorService.ts`, { kind: 'account-truncated' }, 'アカウント自体の削除とは別の処理です。'),
	sample('account-deleted', 'アカウントの削除完了', '登録・アカウント', `${queue}DeleteAccountProcessorService.ts`, { kind: 'account-deleted' }, '削除済みのため、メール設定やログインを促すボタンを設けません。'),
	sample('abuse-report', '通報の受信（運営宛）', '運営・モデレーション', `${core}AbuseReportNotificationService.ts`, { kind: 'abuse-report', comment: '同じ内容の投稿が短時間に繰り返されています。\n関連する投稿の状況をご確認ください。' }, '現在の件名は New Abuse Report。通知対象の運営メンバーとサーバーのメールアドレスに送信されます。'),
	sample('abuse-report-forwarded', '通報の受信（キュー経由）', '運営・モデレーション', `${queue}ReportAbuseProcessorService.ts`, { kind: 'abuse-report-forwarded', comment: '公開投稿に個人情報と思われる内容が含まれています。\n確認をお願いします。' }, '現在の件名は New abuse report。通報用アドレス／サーバーアドレスと送信可否の設定を維持します。'),
	sample('moderator-inactive-days', '活動確認のお願い（日数）', '運営・モデレーション', `${queue}CheckModeratorsActivityProcessorService.ts`, { kind: 'moderator-inactive', remaining: 2, unit: 'days' }, '現行の asDays !== 0 分岐。停止・切り替え条件のロジックは変更しません。'),
	sample('moderator-inactive-hours', '活動確認のお願い（時間）', '運営・モデレーション', `${queue}CheckModeratorsActivityProcessorService.ts`, { kind: 'moderator-inactive', remaining: 6, unit: 'hours' }, '現行の asDays === 0 分岐。'),
	sample('invitation-only', '招待制への切り替え', '運営・モデレーション', `${queue}CheckModeratorsActivityProcessorService.ts`, { kind: 'invitation-only', inactiveDays: 7 }),
	sample('public-note-disabled', 'パブリック投稿の無効化', '運営・モデレーション', `${queue}CheckModeratorsActivityProcessorService.ts`, { kind: 'public-note-disabled', inactiveDays: 7 }, '「招待制の解除」ではなく、パブリック投稿が無効になった通知です。'),
	sample('admin-message', '管理者からのメール', '管理者メール', `${endpoint}admin/send-email.ts`, { kind: 'admin-message', subject: 'サーバーメンテナンスのお知らせ', text: 'いつもご利用いただき、ありがとうございます。\n\nサーバーのメンテナンスを予定しています。詳細はサーバーのお知らせをご確認ください。\n\nご協力をお願いいたします。' }, '本文は自由入力です。このモックはプレーンテキストの例です。管理者APIのHTML入力は安全化して同じレイアウトに表示します。'),
	sample('test-email', 'SMTPのテストメール', '管理者メール', 'packages/frontend/src/pages/admin/email-settings.vue', { kind: 'admin-message', subject: 'Test email', text: 'Yo' }, '現行画面から送られる実際の件名 Test email と本文 Yo を維持した短文ケース。admin/send-email を経由します。'),
	sample('follow', 'フォロー通知', '停止中の通知（参考）', `${core}NotificationService.ts`, { kind: 'follow', displayName: 'はる', account: '@haru@example.invalid', profileUrl: `${brand.url}/@haru@example.invalid` }, '現行実装はコメントアウトされています。今回の準備で有効化しません。', 'reference'),
	sample('follow-request', 'フォローリクエスト', '停止中の通知（参考）', `${core}NotificationService.ts`, { kind: 'follow-request', displayName: 'こはる', account: '@koharu', profileUrl: `${brand.url}/@koharu` }, '現行実装はコメントアウトされています。今回の準備で有効化しません。', 'reference'),
	sample('long-content', '長い件名・本文・改行', '表示の確認', `${endpoint}admin/send-email.ts`, { kind: 'admin-message', subject: 'これからも心地よくご利用いただくための、サーバー運営からの大切なお知らせ', text: '日々の投稿や会話を通じて、この場所を一緒につくってくださり、ありがとうございます。\n\n' + '長いお知らせでも、文章が読みやすく自然に折り返されることを確認します。'.repeat(16) + '\n\n最後までお読みいただき、ありがとうございます。' }, '長文を切り捨てず表示します。', 'edge'),
	sample('long-url', '長い認証URL', '表示の確認', `${endpoint}request-reset-password.ts`, { kind: 'reset-password', url: `${brand.url}/reset-password/${'preview0'.repeat(32)}?from=email&mode=confirmation` }, '長いURLと & を含むクエリを、HTMLとテキストで確認します。', 'edge'),
	sample('unbroken-text', '長い英数字・特殊文字', '表示の確認', `${endpoint}admin/approve-registration.ts`, { kind: 'registration-approved', username: 'preview_'.repeat(24) }, '320px幅でもアイコンの隣でサーバー名が折り返され、ユーザーIDが横にはみ出さないことを確認します。', 'edge', { brand: { ...brand, name: 'SampleCommunity'.repeat(6) + ' & <friends>' } }),
	sample('untrusted-report', '通報本文のHTML文字列', '表示の確認', `${core}AbuseReportNotificationService.ts`, { kind: 'abuse-report', comment: '<script>alert("preview")</script>\n<a href="javascript:alert(1)">リンクのような入力</a>\n<img src=x onerror=alert(1)>\nA & B / "quoted" / <タグ>' }, '構造化テンプレートは本文を文字列としてエスケープします。コードやリンクとして実行しません。', 'edge'),
	sample('custom-brand', '独自のサーバー名・アイコン取得失敗', '表示の確認', `${core}EmailService.ts`, { kind: 'registration-approved', username: 'sora' }, 'アイコンは取得できない架空のURLです。読み込み失敗・画像オフでもサーバー名と操作を確認できます。', 'edge', { brand: { name: 'そらの広場', url: 'https://community.example.invalid', iconUrl: 'https://community.example.invalid/icon.png' } }),
	sample('empty-message', '本文が空の管理者メール', '表示の確認', `${endpoint}admin/send-email.ts`, { kind: 'admin-message', subject: '空の本文の確認', text: '' }, '入力の空文字を許可する現在のAPIに対応します。', 'edge'),
];
