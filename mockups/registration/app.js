/* SPDX-License-Identifier: AGPL-3.0-only */
'use strict';
(() => {
 const $ = (id) => document.getElementById(id);
 const serverName = 'サンプルサーバー';
 const sample = () => ({ username: 'sample_user', email: 'sample@example.com', reason: '日々の出来事や好きな音楽の話を、落ち着いた場所で楽しみたいと思い申請しました。', contacts: '@sample@example.social', relationship: false });
 let application = sample();
 let reviewApplication = sample();
 let mode = 'application';
 let page = 'application';
 let generation = 0;
 let activeDocument = 0;
 let registrationTrigger;
 const motion = window.RegistrationMotion;
 const allConsentIds = ['rules', 'terms', 'policy', 'privacy'];
 let consentIds = [...allConsentIds];
 const linkedDocuments = {
  terms: { control: 'terms', fixture: 'terms.html', label: '利用規約', config: { type: 'sample', url: 'terms.html' }, opened: false },
  policy: { control: 'privacy-policy', fixture: 'privacy-policy.html', label: 'プライバシーポリシー', config: { type: 'sample', url: 'privacy-policy.html' }, opened: false },
 };
 const canAgree = (id) => !linkedDocuments[id] || (!linkedDocuments[id].config.invalid && linkedDocuments[id].opened);
 const agreed = () => consentIds.every((id) => canAgree(id) && $(`agree-${id}`).checked);
 let step = 0;
 let decision = 'pending';
 let notification = 'none';
 let busy = false;
 let format = 'html';
 let emailPreview;
 let dialogTrigger;
 const form = $('application-form');
 const dialog = $('reject-dialog');
 const registrationDialog = $('registration-dialog');
 const fields = ['invitation-code', 'reason', 'contacts', 'username', 'password', 'password-confirm', 'email'];
 const announce = (message) => { $('announcement').textContent = message; };
 function showPage(nextPage, focus = true) {
  const from = $(`${page}-page`);
  page = nextPage;
  document.querySelectorAll('[data-page]').forEach((button) => {
   const selected = button.dataset.page === page;
   button.classList.toggle('active', selected);
   if (selected) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  if (page === 'review') renderReview();
  return motion.swap(from, $(`${page}-page`), { focus: focus ? (page === 'review' ? $('review-page').querySelector('h1') : $(`step-${step}`).querySelector('h2')) : null, scrollToTop: true });
 }
 function showStep(next, focus = true) {
  if (next > 0 && !agreed()) next = 0;
  generation++;
  const from = $(`step-${step}`);
  step = next;
  for (let i = 0; i < 4; i++) {
   const item = document.querySelector(`[data-step="${i}"]`);
   item.classList.toggle('done', i < next);
   if (i === next) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
  }
  if (next === 0) syncDocuments(firstUnconfirmed());
  return motion.swap(from, $(`step-${next}`), { focus: focus && page === 'application' ? $(`step-${next}`).querySelector('h2') : null, scrollToTop: true });
 }
 function firstUnconfirmed() {
  const index = consentIds.findIndex((id) => !canAgree(id) || !$(`agree-${id}`).checked);
  return index < 0 ? consentIds.length - 1 : index;
 }
 function documentState() {
  const firstUnchecked = consentIds.findIndex((id) => !canAgree(id) || !$(`agree-${id}`).checked);
  allConsentIds.forEach((id) => {
   const index = consentIds.indexOf(id);
   const included = index >= 0;
   if (!included) { $(`agree-${id}`).checked = false; setError(`agree-${id}`, ''); }
   const done = $(`agree-${id}`).checked;
   const detail = $(`document-${id}`);
   detail.hidden = !included;
   detail.classList.toggle('confirmed', done);
   detail.classList.toggle('current', included && index === activeDocument);
   $(`document-${id}-status`).textContent = done ? '確認済み' : index === activeDocument ? '確認中' : '次の項目';
   detail.querySelector('summary').setAttribute('aria-disabled', String(!included || (firstUnchecked >= 0 && index > firstUnchecked)));
   $(`agree-${id}`).disabled = !included || !canAgree(id) || (firstUnchecked >= 0 && index > firstUnchecked);
  });
  $('terms-actions').hidden = !agreed();
 }
 async function syncDocuments(index, focus = false) {
  const token = generation;
  activeDocument = index;
  documentState();
  const target = consentIds[index];
  const results = await Promise.all(allConsentIds.map((id) => motion.setExpanded($(`document-${id}`), id === target)));
  const complete = results.every(Boolean) && token === generation;
  if (complete && focus && step === 0 && page === 'application' && !registrationDialog.open) $(`document-${target}`).querySelector('summary').focus();
  return complete;
 }
 function parseDocumentConfig(id) {
  const linked = linkedDocuments[id];
  const type = $(`${linked.control}-setting`).value;
  if (type === 'sample') return { type, url: linked.fixture };
  if (type === 'none') return { type: 'none', url: '' };
  const raw = $(`${linked.control}-url`).value.trim();
  if (!raw) return { type: 'none', url: '' };
  try {
   if (/[\u0000-\u001f\u007f]/.test($(`${linked.control}-url`).value)) throw new Error('control character');
   const url = new URL(raw, 'https://example.com/');
   if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('unsupported URL');
   return { type: 'custom', url: url.href };
  } catch {
   return { type: 'custom', url: '', invalid: true, raw };
  }
 }
 function renderLinkedDocument(id) {
  const linked = linkedDocuments[id];
  const { config } = linked;
  const present = config.type !== 'none';
  const available = present && !config.invalid;
  const link = $(`${id}-link`);
  if (available) link.setAttribute('href', config.url); else link.removeAttribute('href');
  $(`${id}-link-content`).hidden = !available;
  $(`${id}-destination`).textContent = available ? config.url : '';
  $(`${id}-sample-note`).hidden = config.type !== 'sample';
  $(`${id}-unavailable`).hidden = !config.invalid;
  $(`${id}-open-hint`).textContent = config.invalid ? '文書を表示できないため、同意できません。管理者へお問い合わせください。' : linked.opened ? '内容を確認したら同意してください。' : 'リンクを開くとチェックできます。内容を確認したら同意してください。';
  setError(`${linked.control}-url`, config.invalid ? '表示できるHTTP(S)のURLを指定してください。認証情報や制御文字は使用できません。' : '');
 }
 function applyDocumentConfig(id) {
  const linked = linkedDocuments[id];
  $(`${linked.control}-custom`).hidden = $(`${linked.control}-setting`).value !== 'custom';
  const config = parseDocumentConfig(id);
  const previous = linked.config;
  // A repeated application of the same destination keeps its opening and consent record.
  const changed = config.url !== previous.url || Boolean(config.invalid) !== Boolean(previous.invalid) || config.raw !== previous.raw || (config.type === 'none') !== (previous.type === 'none');
  linked.config = config;
  renderLinkedDocument(id);
  if (!changed) return;
  generation++;
  linked.opened = false;
  const affected = allConsentIds.slice(allConsentIds.indexOf(id));
  affected.forEach((key) => { $(`agree-${key}`).checked = false; setError(`agree-${key}`, ''); });
  consentIds = allConsentIds.filter((key) => !linkedDocuments[key] || linkedDocuments[key].config.type !== 'none');
  renderLinkedDocument(id);
  if (step === 3) { documentState(); syncDocuments(firstUnconfirmed()); return; }
  const shouldFocus = page === 'application' && (step > 0 || $('terms-form').contains(document.activeElement));
  showStep(0, false);
  syncDocuments(firstUnconfirmed(), shouldFocus);
  announce(`${linked.label}の設定を変更しました。表示中の項目をご確認ください。`);
 }
 function updateMode() {
  const invitation = mode === 'invitation';
  $('registration-route').textContent = invitation ? '招待コードで登録' : '登録を申請';
  document.querySelector('[data-page="application"]').setAttribute('aria-label', invitation ? '招待コードで登録' : '登録申請');
  document.querySelector('[data-page="application"] span').textContent = invitation ? '招待登録' : '登録申請';
  $('welcome-mode-description').textContent = invitation ? '招待コードを使って、アカウントを登録します。' : '申請内容を管理者が確認し、結果をメールでお知らせします。';
  $('terms-description').textContent = invitation ? '気持ちよく過ごすための約束と、登録情報の取り扱いをご確認ください。' : '気持ちよく過ごすための約束と、申請情報の取り扱いをご確認ください。';
  $('application-privacy').hidden = invitation;
  $('invitation-privacy').hidden = !invitation;
  $('application-fields').hidden = invitation;
  $('invitation-field').hidden = !invitation;
  $('invitation-code').disabled = !invitation;
  $('invitation-code').required = invitation;
  $('relationship').disabled = invitation;
  relationshipChanged();
  $('form-title').textContent = invitation ? 'アカウントを登録しましょう' : 'あなたのことを教えてください';
  $('form-description').textContent = invitation ? '招待コードと、アカウントに使う情報を入力してください。' : '管理者が申請を確認するために必要な情報です。';
  $('email-hint').textContent = invitation ? 'アカウントに関する連絡やセキュリティ通知に使用します。' : '承認・見送りの結果をこのアドレスにお知らせします。\n登録後のセキュリティ通知にも使用されます。';
  $('confirmation-title').textContent = invitation ? 'この内容で登録しますか？' : 'この内容で申請しますか？';
  $('confirmation-description').textContent = invitation ? '招待コードを使ったアカウント登録のデモです。' : '申請内容を管理者が確認し、承認・見送りの結果を登録メールへ通知します。';
  $('submit-application').textContent = invitation ? '登録する →' : '申請する →';
  $('completion-title').textContent = invitation ? '招待登録のデモが完了しました' : '申請を受け付けました';
  $('completion-description').textContent = invitation ? 'この画面はデザインモックです。実際のアカウントは作成されていません。' : 'お申し込みありがとうございます。管理者が内容を確認するまでお待ちください。';
  $('completed-email-label').textContent = invitation ? '登録メールアドレス' : '結果のお知らせ先';
  $('completion-hint').textContent = invitation ? '招待コードの有効性は照合していません。' : '承認・見送りのどちらの場合も、結果をメールでお知らせします。';
  $('completion-step-label').textContent = invitation ? '登録完了' : '受付完了';
  $('open-review').hidden = invitation;
  $('completion-choose').hidden = !invitation;
 }
 function openRegistration() {
  if (busy) return;
  registrationTrigger = document.activeElement;
  motion.openDialog(registrationDialog, { focus: $('choose-invitation') });
 }
 async function chooseRegistration(nextMode) {
  if (busy) return;
  const username = $('username').value, email = $('email').value;
  generation++;
  mode = nextMode;
  form.reset(); $('terms-form').reset(); clearErrors();
  Object.values(linkedDocuments).forEach((linked) => { linked.opened = false; });
  Object.keys(linkedDocuments).forEach(renderLinkedDocument);
  $('username').value = username; $('email').value = email;
  $('confirmation').replaceChildren(); $('completed-email').textContent = '';
  application = { username, email, reason: '', contacts: '', relationship: false };
  updateMode();
  showStep(0, false); showPage('application', false);
  const token = generation;
  const closed = await motion.closeDialog(registrationDialog);
  if (closed && token === generation && page === 'application') $('step-0').querySelector('h2').focus();
  announce(mode === 'invitation' ? '招待コードで登録します。まずサーバールールをご確認ください。' : '登録を申請します。まずサーバールールをご確認ください。');
 }
 function setError(id, message) {
  const element = $(id);
  const error = $(`${id}-error`);
  error.textContent = message;
  error.hidden = !message;
  if (message) element.setAttribute('aria-invalid', 'true'); else element.removeAttribute('aria-invalid');
 }
 function clearErrors() { [...fields, ...allConsentIds.map((id) => `agree-${id}`)].forEach((id) => setError(id, '')); }
 function relationshipChanged() {
  const related = $('relationship').checked;
  $('reason').disabled = related || mode === 'invitation';
  $('contacts').disabled = mode === 'invitation';
  $('reason').required = !related && mode === 'application';
  $('contacts').required = related && mode === 'application';
  $('reason-required').textContent = related ? '入力不要' : '必須';
  $('reason-required').className = related ? 'optional' : 'required';
  $('contacts-required').textContent = related ? '必須' : '任意';
  $('contacts-required').className = related ? 'required' : 'optional';
  $('reason-hint').textContent = related ? '管理者との関係を申告する場合、理由は送信しません。' : 'あなたの言葉で、気軽にお聞かせください。';
  $('contacts-hint').textContent = related ? '管理者があなたを確認できるアカウント名やプロフィールURLなどを入力してください。' : 'SNSのアカウント名やURLは、理由欄ではなく連絡先欄へご入力ください。\n空欄でも申請できます';
  setError('reason', ''); setError('contacts', '');
 }
 function collect() {
  return { relationship: mode === 'application' && $('relationship').checked, reason: mode === 'invitation' || $('relationship').checked ? '' : $('reason').value.trim(), contacts: mode === 'application' ? $('contacts').value.trim() : '', username: $('username').value.trim(), email: $('email').value.trim(), invitationCode: mode === 'invitation' ? $('invitation-code').value.trim() : '' };
 }
 function populateList(container, rows) {
  container.replaceChildren();
  for (const [label, value] of rows) {
   const row = document.createElement('div');
   const term = document.createElement('dt');
   const detail = document.createElement('dd');
   term.textContent = label; detail.textContent = value;
   row.append(term, detail); container.append(row);
  }
 }
 function applicationRows(value, rejected = false) {
  return [['管理者との関係', value.relationship ? '関係があります（フォロワー・知り合いなど）' : '関係の申告なし'], ['登録したい理由', value.relationship ? '管理者との関係を申告しているため入力不要' : value.reason], ['SNSなどの連絡先', rejected ? '削除済み' : value.contacts || '入力なし'], ['ユーザーID', rejected ? '削除済み' : `@${value.username}`], ['メールアドレス', value.email]];
 }
 function renderConfirmation() {
  const rows = mode === 'invitation' ? [['招待コード', application.invitationCode], ['ユーザーID', `@${application.username}`], ['メールアドレス', application.email]] : applicationRows(application);
  populateList($('confirmation'), [...rows, ['パスワード', '設定済み（内容は表示しません）']]);
 }
 function renderEmail() {
  emailPreview = window.RegistrationEmail.render({ serverName, username: reviewApplication.username, theme: $('theme').value });
  $('mail-to').textContent = reviewApplication.email;
  $('mail-subject').textContent = emailPreview.subject;
  $('mail-frame').srcdoc = emailPreview.html;
  $('mail-text').textContent = emailPreview.text;
  $('dialog-recipient').textContent = reviewApplication.email;
  $('dialog-subject').textContent = emailPreview.subject;
  $('dialog-message').textContent = emailPreview.text;
 }
 function renderReview() {
  const rejected = decision === 'rejected';
  $('review-username').textContent = rejected ? 'ユーザーID削除済み' : `@${reviewApplication.username}`;
  $('review-applicant-description').textContent = rejected ? '審査は終了しました' : '登録を希望しています';
  populateList($('review-details'), applicationRows(reviewApplication, rejected));
  $('decision-status').textContent = rejected ? '見送り' : '審査中';
  $('decision-status').classList.toggle('rejected', rejected);
  $('reject').hidden = rejected;
  $('reject').disabled = busy;
  $('retry').hidden = notification !== 'failed';
  $('retry').disabled = busy;
  const box = $('notification-box');
  box.hidden = notification === 'none';
  box.classList.toggle('failed', notification === 'failed');
  $('notification-status').textContent = notification === 'failed' ? '通知に失敗しました（デモ）' : notification === 'sending' ? '通知中（デモ）' : '通知済み（デモ）';
  $('notification-description').textContent = notification === 'failed' ? '見送りは確定しています。メールだけを再送してください。' : notification === 'sending' ? '見送りは確定しています。結果のお知らせを準備しています。' : '登録メールアドレスへ結果を通知しました。';
  renderEmail();
 }
 function sendNotification() {
  if (busy) return;
  busy = true;
  const failedScenario = $('scenario').value === 'failure';
  $('sample').disabled = true; $('reset').disabled = true; $('choose-registration').disabled = true;
  decision = 'rejected';
  notification = 'sending';
  renderReview();
  // Local demonstration only: no network request or email transport.
  window.setTimeout(() => {
   notification = failedScenario ? 'failed' : 'sent';
   busy = false;
   $('sample').disabled = false; $('reset').disabled = false; $('choose-registration').disabled = false;
   renderReview();
   announce(notification === 'failed' ? '見送りは確定しました。通知メールの送信に失敗しました。再送できます。' : '見送りを確定し、通知済みになりました。デモのためメールは送信されていません。');
   (notification === 'failed' ? $('retry') : $('decision-status')).focus();
  }, 500);
 }
 document.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => showPage(button.dataset.page)));
 document.querySelectorAll('[data-go-step]').forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.goStep))));
 allConsentIds.forEach((id) => {
  $('document-' + id).querySelector('summary').addEventListener('click', (event) => {
   event.preventDefault();
   const index = consentIds.indexOf(id);
   if (index < 0) return;
   const first = consentIds.findIndex((key) => !canAgree(key) || !$('agree-' + key).checked);
   if (first >= 0 && index > first) { announce('先に表示中の項目をご確認ください。'); return; }
   generation++; syncDocuments(index);
  });
  $('agree-' + id).addEventListener('change', async () => {
   if (busy) return;
   const index = consentIds.indexOf(id);
   if (index < 0 || $('agree-' + id).disabled || !canAgree(id)) {
    $('agree-' + id).checked = false;
    documentState();
    return;
   }
   const token = ++generation;
   if (!$('agree-' + id).checked) {
    consentIds.slice(index + 1).forEach((key) => { $('agree-' + key).checked = false; setError(`agree-${key}`, ''); });
    await syncDocuments(index);
    return;
   }
   if (index < consentIds.length - 1) {
    const complete = await syncDocuments(index + 1);
    if (complete && token === generation && step === 0 && page === 'application') $('document-' + consentIds[index + 1]).querySelector('summary').focus();
   } else {
    documentState();
    const complete = await motion.setExpanded($(`document-${id}`), false);
    if (complete && token === generation && agreed() && step === 0 && page === 'application') {
     $('terms-actions').querySelector('button[type="submit"]').focus();
     announce('すべての項目の確認が完了しました。「次へ」を押して入力画面へ進んでください。');
    }
   }
  });
 });
 $('terms-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (busy) return;
  let first;
  for (const key of consentIds) {
   const id = `agree-${key}`;
   const message = linkedDocuments[key]?.config.invalid ? '設定された文書を表示できません。管理者へお問い合わせください。' : !canAgree(key) ? 'リンクを開いて内容をご確認ください。' : $(id).checked ? '' : '内容をご確認のうえ、同意してください。';
   setError(id, message);
   if (message && !first) first = $(id).disabled ? $(`document-${key}`).querySelector('summary') : $(id);
  }
  if (first) {
   const token = ++generation;
   syncDocuments(firstUnconfirmed()).then((complete) => {
    if (complete && token === generation && step === 0 && page === 'application') first.focus();
   });
   announce('同意が必要な項目があります。');
  } else showStep(1);
 });
 form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (busy) return;
  if (!agreed()) { showStep(0); return; }
  const value = collect();
  const errors = {
   'invitation-code': mode === 'invitation' && !value.invitationCode ? '招待コードを入力してください。' : '',
   reason: mode === 'application' && !value.relationship && !value.reason ? '登録したい理由を入力してください。' : '',
   contacts: mode === 'application' && value.relationship && !value.contacts ? '管理者があなたを確認できる連絡先を入力してください。' : '',
   username: !/^[a-zA-Z0-9_]{1,20}$/.test(value.username) ? '半角英数字と _ で、1〜20文字のIDを入力してください。' : '',
   password: $('password').value.length < 8 || $('password').value.length > 64 ? '8〜64文字のパスワードを入力してください。' : '',
   'password-confirm': !$('password-confirm').value ? '確認用のパスワードを入力してください。' : $('password-confirm').value !== $('password').value ? 'パスワードが一致していません。' : '',
   email: value.email.length < 5 || value.email.length > 256 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) ? '正しい形式のメールアドレスを入力してください。' : '',
  };
  let first;
  for (const id of fields) { setError(id, errors[id]); if (errors[id] && !first) first = $(id); }
  if (first) { first.focus(); announce('入力内容をご確認ください。'); return; }
  application = value;
  renderConfirmation(); showStep(2);
 });
 $('relationship').addEventListener('change', relationshipChanged);
 [...fields, ...allConsentIds.map((id) => `agree-${id}`)].forEach((id) => $(id).addEventListener('input', () => setError(id, '')));
 $('submit-application').addEventListener('click', () => {
  if (busy || step !== 2) return;
  if (!agreed()) { showStep(0); announce('規約と情報の取り扱いをもう一度ご確認ください。'); return; }
  $('password').value = ''; $('password-confirm').value = '';
  $('completed-email').textContent = application.email;
  if (mode === 'application') { reviewApplication = { ...application }; decision = 'pending'; notification = 'none'; renderReview(); }
  showStep(3); announce(mode === 'invitation' ? '招待登録のデモが完了しました。アカウントの作成や招待コードの照合は行っていません。' : '申請を受け付けました。デザインモックのため送信されていません。');
 });
 $('open-review').addEventListener('click', () => showPage('review'));
 $('reject').addEventListener('click', () => {
  if (busy || decision === 'rejected') return;
  dialogTrigger = document.activeElement;
  renderEmail(); motion.openDialog(dialog, { focus: $('cancel-reject') });
 });
 dialog.addEventListener('cancel', (event) => { event.preventDefault(); motion.closeDialog(dialog); });
 $('cancel-reject').addEventListener('click', () => motion.closeDialog(dialog));
 dialog.addEventListener('close', () => { if (dialogTrigger && !dialogTrigger.hidden) dialogTrigger.focus(); });
 $('confirm-reject').addEventListener('click', () => {
  if (busy || decision === 'rejected') return;
  motion.closeDialog(dialog); sendNotification();
 });
 $('retry').addEventListener('click', () => { if (notification === 'failed') sendNotification(); });
 $('theme').addEventListener('change', () => { document.documentElement.dataset.theme = $('theme').value; renderEmail(); });
 $('viewport').addEventListener('change', () => { $('viewport-shell').dataset.width = $('viewport').value; document.documentElement.dataset.previewWidth = $('viewport').value; });
 document.querySelectorAll('[data-format]').forEach((button) => button.addEventListener('click', () => {
  format = button.dataset.format;
  document.querySelectorAll('[data-format]').forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.format === format)));
  $('mail-frame').hidden = format !== 'html'; $('mail-text').hidden = format !== 'text';
 }));
 $('sample').addEventListener('click', () => {
  if (busy) return;
  const value = sample();
  generation++; if (registrationDialog.open) motion.closeDialog(registrationDialog);
  form.reset(); clearErrors(); relationshipChanged();
  ['reason', 'contacts', 'username', 'email'].forEach((id) => { $(id).value = value[id]; });
  if (mode === 'invitation') $('invitation-code').value = 'SAMPLE-INVITE';
  $('password').value = 'SamplePass123!'; $('password-confirm').value = 'SamplePass123!';
  showStep(agreed() ? 1 : 0, false); showPage('application'); announce('架空のサンプルを入力しました。未確認の文書はリンクを開き、内容を確認して同意してください。');
 });
 $('reset').addEventListener('click', () => {
  if (busy) return;
  generation++; if (dialog.open) motion.closeDialog(dialog); if (registrationDialog.open) motion.closeDialog(registrationDialog);
  form.reset(); $('terms-form').reset(); clearErrors(); relationshipChanged();
  Object.values(linkedDocuments).forEach((linked) => { linked.opened = false; });
  Object.keys(linkedDocuments).forEach(renderLinkedDocument);
  application = sample(); reviewApplication = sample(); decision = 'pending'; notification = 'none';
  $('confirmation').replaceChildren(); $('completed-email').textContent = '';
  showStep(0, false); showPage('application'); renderReview(); announce('入力と審査状態をリセットしました。');
 });
 $('choose-registration').addEventListener('click', openRegistration);
 $('completion-choose').addEventListener('click', openRegistration);
 $('close-registration').addEventListener('click', () => motion.closeDialog(registrationDialog));
 registrationDialog.addEventListener('cancel', (event) => { event.preventDefault(); motion.closeDialog(registrationDialog); });
 registrationDialog.addEventListener('close', () => { if (registrationTrigger?.isConnected && !registrationTrigger.closest('[hidden]')) registrationTrigger.focus(); });
 $('choose-invitation').addEventListener('click', () => chooseRegistration('invitation'));
 $('choose-application').addEventListener('click', () => chooseRegistration('application'));
 Object.entries(linkedDocuments).forEach(([id, linked]) => {
  $(`${linked.control}-setting`).addEventListener('change', () => applyDocumentConfig(id));
  $(`apply-${linked.control}`).addEventListener('click', () => applyDocumentConfig(id));
  $(`${linked.control}-url`).addEventListener('keydown', (event) => {
   if (event.key === 'Enter') { event.preventDefault(); applyDocumentConfig(id); }
  });
  const recordOpening = (event) => {
   if (event.defaultPrevented || (event.type === 'auxclick' ? event.button !== 1 : event.button !== 0)) return;
   if (linked.config.type === 'none' || linked.config.invalid || $(`${id}-link`).getAttribute('href') !== linked.config.url) return;
   linked.opened = true;
   renderLinkedDocument(id); documentState();
   announce(`${linked.label}のリンクを開きました。内容を確認したら同意してください。`);
  };
  $(`${id}-link`).addEventListener('click', recordOpening);
  $(`${id}-link`).addEventListener('auxclick', recordOpening);
  renderLinkedDocument(id);
 });
 $('decision-status').tabIndex = -1;
 updateMode(); documentState(); renderReview(); motion.enhanceDetails();
 registrationTrigger = $('choose-registration');
 motion.openDialog(registrationDialog, { focus: $('choose-invitation') });
})();
