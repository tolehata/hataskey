/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

(() => {
  'use strict';

  const palettes = {
    light: {
      background: '#eef1fc', surface: '#f6f9ff', text: '#577096',
      muted: '#49617f', accent: '#305f96', pale: '#e4effd', border: '#dfdfdf',
      header: '#6ba5e3',
    },
    dark: {
      background: '#1c1c25', surface: '#23232f', text: '#eceff4',
      muted: '#b9c6dc', accent: '#ffc5e6', pale: '#302b3c', border: '#3f3f50',
      header: '#ffc5e6',
    },
  };
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => entities[character]);
  const textBlock = (value) => String(value).replace(/\r\n?/g, '\n');
  const htmlLines = (value) => escapeHtml(textBlock(value)).replace(/\n/g, '<br>');

  // Match the production renderer: keep paragraphs and break after Japanese sentences.
  function sentenceLines(value) {
    const text = textBlock(value);
    return text.replace(/。[」』）】〉》”’]*/g, (punctuation, offset) =>
      /^[^\S\n]*(?:\n|$)/u.test(text.slice(offset + punctuation.length)) ? punctuation : `${punctuation}\n`,
    );
  }

  /** Fixed rejection notice only. No review comments, private notes, or sending side effects. */
  function render({ serverName = 'サンプルサーバー', username = 'sora_note', theme = 'light' } = {}) {
    const name = String(serverName);
    const subject = `【${name}】登録申請の審査結果について`;
    if (/[\r\n\u0000-\u001f\u007f]/u.test(subject)) {
      throw new TypeError('subject must be a single line without control characters');
    }
    const mode = theme === 'dark' ? 'dark' : 'light';
    const p = palettes[mode];
    const website = 'https://example.com';
    const category = '登録のお知らせ';
    const title = '登録申請についてのお知らせ';
    const preheader = '登録申請の審査結果をお知らせします。';
    const intro = [
      `${name}への登録申請、ありがとうございます。`,
      '審査の結果、今回は登録を見送ることとなりました。この申請によるアカウントは作成されません。',
    ];
    const account = `@${String(username)}`;
    const deliveryNote = 'このメールは登録申請で入力されたアドレスへお届けしています。';
    const proseStyle = `color:${p.text};font-size:16px;line-height:1.85;line-break:strict;word-break:normal;overflow-wrap:break-word;`;
    const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'none'; connect-src 'none'; img-src 'none'; font-src 'none'; form-action 'none'; base-uri 'none'">
<meta name="color-scheme" content="${mode}"><meta name="supported-color-schemes" content="${mode}">
<title>${escapeHtml(subject)}</title>
<style>@media screen and (max-width:640px){.email-shell{width:100%!important}.mobile-pad{padding-left:24px!important;padding-right:24px!important}.mobile-title{font-size:24px!important}}</style>
</head><body style="margin:0;padding:0;background:${p.background};font-family:'LINE Seed JP','Pretendard JP','Hiragino Kaku Gothic ProN','Yu Gothic',Meiryo,Arial,sans-serif;color:${p.text};">
<div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${p.background};"><tr><td align="center" style="padding:36px 12px 44px;">
<!--[if mso]><table role="presentation" width="600" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-shell" style="width:100%;max-width:600px;table-layout:fixed;background:${p.surface};border:1px solid ${p.border};border-radius:16px;">
<tr><td class="mobile-pad" style="padding:28px 36px 27px;border-top:4px solid ${p.header};border-bottom:1px solid ${p.border};"><div style="color:${p.text};font-family:Righteous,'LINE Seed JP','Pretendard JP',Arial,sans-serif;font-size:22px;font-weight:800;letter-spacing:-.03em;line-height:1.35;line-break:strict;word-break:normal;overflow-wrap:break-word;">${htmlLines(name)}</div></td></tr>
<tr><td class="mobile-pad" style="padding:36px 36px 10px;"><span style="display:inline-block;padding:7px 11px;border-radius:999px;background:${p.pale};color:${p.accent};font-size:11px;font-weight:700;letter-spacing:.08em;line-height:1.4;">${escapeHtml(category)}</span></td></tr>
<tr><td class="mobile-pad" style="padding:5px 36px 17px;"><h1 class="mobile-title" style="margin:0;color:${p.text};font-size:30px;font-weight:800;letter-spacing:-.035em;line-height:1.4;line-break:strict;word-break:normal;overflow-wrap:break-word;text-wrap:pretty;"><span style="display:inline-block;max-width:100%;vertical-align:top;">登録申請についての</span><span style="display:inline-block;max-width:100%;vertical-align:top;">お知らせ</span></h1></td></tr>
<tr><td class="mobile-pad" style="padding:0 36px 10px;">${intro.map((paragraph) => `<p style="margin:0 0 18px;${proseStyle}">${htmlLines(sentenceLines(paragraph))}</p>`).join('')}</td></tr>
<tr><td class="mobile-pad" style="padding:8px 36px 26px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="table-layout:fixed;border:1px solid ${p.border};border-radius:12px;background:${p.surface};"><tr><td style="padding:20px 22px 16px;"><div style="color:${p.muted};font-size:12px;line-height:1.5;letter-spacing:.04em;">申請したユーザーID</div><div style="padding-top:5px;color:${p.text};font-size:15px;line-height:1.7;font-weight:600;overflow-wrap:anywhere;word-break:break-all;">${htmlLines(account)}</div></td></tr></table></td></tr>
<tr><td class="mobile-pad" style="padding:0 36px 26px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${p.pale};border-radius:12px;"><tr><td style="padding:20px 22px;"><div style="color:${p.accent};font-size:13px;line-height:1.5;font-weight:700;">このメールについて</div><div style="padding-top:6px;color:${mode === 'dark' ? p.text : p.muted};font-size:14px;line-height:1.75;line-break:strict;word-break:normal;overflow-wrap:break-word;">${htmlLines(deliveryNote)}</div></td></tr></table></td></tr>
<tr><td class="mobile-pad" style="padding:24px 36px 28px;border-top:1px solid ${p.border};color:${p.muted};font-size:12px;line-height:1.8;"><div style="margin-bottom:5px;line-break:strict;word-break:normal;overflow-wrap:break-word;">${htmlLines(name)}</div><div style="overflow-wrap:anywhere;word-break:break-all;">${escapeHtml(website)}</div></td></tr>
</table><!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
    const text = [
      preheader, category, title, ...intro.map(sentenceLines), `申請したユーザーID: ${account}`,
      `このメールについて\n${deliveryNote}`, `${name}\n${website}`,
    ].map(textBlock).join('\n\n');
    return { subject, html, text };
  }

  window.RegistrationEmail = Object.freeze({ render });
})();
