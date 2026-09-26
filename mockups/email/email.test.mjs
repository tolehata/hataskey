/* SPDX-License-Identifier: AGPL-3.0-only */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHataskeyEmail } from '../../packages/backend/src/core/email/hataskey-email-content.ts';
import { renderHataskeyEmail } from '../../packages/backend/src/core/email/render-hataskey-email.ts';
import { brand, fixtures } from './fixtures.mjs';

test('every currently active sending case has a mock, with both moderator warning units', async () => {
	const mapping = new Map([
		['signup', 'packages/backend/src/server/api/SignupApiService.ts'],
		['registration-approved', 'packages/backend/src/server/api/endpoints/admin/approve-registration.ts'],
		['verify-email', 'packages/backend/src/server/api/endpoints/i/update-email.ts'],
		['reset-password', 'packages/backend/src/server/api/endpoints/request-reset-password.ts'],
		['login', 'packages/backend/src/server/api/SigninService.ts'],
		['account-truncated', 'packages/backend/src/queue/processors/TruncateAccountProcessorService.ts'],
		['account-deleted', 'packages/backend/src/queue/processors/DeleteAccountProcessorService.ts'],
		['abuse-report', 'packages/backend/src/core/AbuseReportNotificationService.ts'],
		['abuse-report-forwarded', 'packages/backend/src/queue/processors/ReportAbuseProcessorService.ts'],
		['moderator-inactive', 'packages/backend/src/queue/processors/CheckModeratorsActivityProcessorService.ts'],
		['invitation-only', 'packages/backend/src/queue/processors/CheckModeratorsActivityProcessorService.ts'],
		['public-note-disabled', 'packages/backend/src/queue/processors/CheckModeratorsActivityProcessorService.ts'],
		['admin-message', 'packages/backend/src/server/api/endpoints/admin/send-email.ts'],
	]);
	for (const [kind, source] of mapping) {
		assert.ok(fixtures.some(f => f.status === 'active' && f.input.kind === kind && f.source === source), kind);
		const sendMethod = kind === 'admin-message' ? /this\.emailService\.sendEmail\(/ : /this\.emailService\.sendTemplateEmail\(/;
		assert.match(await readFile(new URL(`../../${source}`, import.meta.url), 'utf8'), sendMethod);
	}
	assert.deepEqual(fixtures.filter(f => f.input.kind === 'moderator-inactive').map(f => f.input.unit).sort(), ['days', 'hours']);
	assert.deepEqual(fixtures.filter(f => f.status === 'reference').map(f => f.input.kind).sort(), ['follow', 'follow-request']);
	assert.equal(new Set(fixtures.map(f => f.id)).size, fixtures.length);
});

test('all case/locale/theme combinations render complete content without active HTML', () => {
	for (const fixture of fixtures) for (const lang of ['ja', 'en']) for (const theme of ['light', 'dark']) {
		const message = createHataskeyEmail(fixture.input, fixture.brand ?? brand, lang);
		const result = renderHataskeyEmail(message, fixture.brand ?? brand, { theme });
		assert.equal(result.subject, message.subject);
		assert.ok(result.html.startsWith('<!doctype html>'));
		assert.ok(result.html.includes(`lang="${lang}"`));
		assert.doesNotMatch(result.html, /<(?:script|iframe|form)\b|<[^>]*\son(?:click|error|load)=|href="javascript:/i);
		assert.ok(Buffer.byteLength(result.html) < 100_000, `${fixture.id}: keep review email under 100 KB`);
		for (const value of [message.title, ...message.intro, ...(message.details ?? []).flatMap(d => [d.label, d.value]), message.quote?.text, message.notice?.text, message.closing].filter(Boolean)) {
			assert.ok(result.text.replaceAll('\n', '').includes(value.replace(/\r\n?|\n/g, '')), `${fixture.id}: missing text ${value}`);
		}
		if (message.action) {
			assert.ok(result.text.includes(message.action.url));
			assert.ok(result.html.includes(message.action.url.replaceAll('&', '&amp;')));
		}
	}
});

test('all user-controlled fields are escaped, including brand and link query strings', () => {
	const payload = '"><script>alert(1)</script><img src=x onerror=alert(1)> & \'quoted\'';
	const message = {
		subject: payload, preheader: payload, category: payload, title: payload, titleParts: [payload], intro: [payload],
		details: [{ label: payload, value: payload }], quote: { label: payload, text: payload },
		notice: { title: payload, text: payload }, closing: payload,
		action: { label: payload, url: `${brand.url}/confirm?a=1&b=2` },
	};
	const { html, text } = renderHataskeyEmail(message, { ...brand, name: payload });
	assert.doesNotMatch(html, /<script>|<img src=x|<[^>]* onerror=/);
	assert.ok(html.includes('&lt;script&gt;'));
	assert.ok(html.includes('/confirm?a=1&amp;b=2'));
	assert.ok(text.includes(payload));
});

test('Japanese prose breaks after sentences while preserving existing lines and closing quotes', () => {
	const prose = '一文目。二文目。\n\n「三文目。」四文目。\r\n終わり。';
	const expected = '一文目。\n二文目。\n\n「三文目。」\n四文目。\n終わり。';
	const message = {
		subject: '件名。変更なし', preheader: 'Preview', category: 'Category', title: '見出し。変更なし', intro: [prose],
		quote: { label: '引用', text: prose }, notice: { title: '注意', text: prose }, closing: prose,
		details: [{ label: '識別子', value: '識別子。変更なし' }],
	};
	const result = renderHataskeyEmail(message, { ...brand, name: 'サーバー。変更なし' });
	assert.equal(result.text.split(expected).length - 1, 4);
	assert.equal(result.html.split(expected.replaceAll('\n', '<br>')).length - 1, 4);
	for (const value of [message.title, message.details[0].value, 'サーバー。変更なし']) assert.ok(result.text.includes(value));
	assert.equal(result.subject, message.subject);
	assert.doesNotMatch(result.html, /。<br>」|終わり。<br>/);
	assert.ok(renderHataskeyEmail({ ...message, lang: 'en' }, brand).text.includes(expected));
	assert.ok(renderHataskeyEmail({ ...message, lang: 'en', intro: ['First sentence. Second sentence.'] }, brand).text.includes('First sentence. Second sentence.'));
});

test('legacy HTML is sanitized and sentence formatting touches escaped text only', () => {
	const message = {
		subject: '件名。保持', preheader: 'Preview', category: 'Category', title: '見出し', intro: ['独立したテキスト。次の文。'],
		htmlBody: '<p>一文目。二文目。\n三文目。<b>&amp; &lt;安全&gt;</b><a href="https://example.invalid/?sentence=。&amp;x=1" onclick="alert(1)">リンク</a><a href="javascript:alert(1)">危険</a></p><script>alert(1)</script><img src="https://example.invalid/image.png" onerror="alert(1)">',
	};
	const result = renderHataskeyEmail(message, brand, { images: false });
	assert.ok(result.html.includes('<p>一文目。<br>二文目。<br>三文目。<b>&amp; &lt;安全&gt;</b>'));
	assert.ok(result.html.includes('href="https://example.invalid/?sentence=。&amp;x=1"'));
	assert.doesNotMatch(result.html, /<script|<img|onclick=|onerror=|javascript:|&amp;amp;|&amp;lt;/);
	assert.ok(!result.html.includes('独立したテキスト'));
	assert.ok(result.text.includes('独立したテキスト。\n次の文。'));
	assert.ok(!result.text.includes('一文目'));
	assert.equal(result.subject, message.subject);
});

test('unsafe or ambiguous URLs and injected mail headers are rejected before rendering', () => {
	const message = createHataskeyEmail({ kind: 'login' }, brand);
	for (const url of ['javascript:alert(1)', 'data:text/html,test', '//example.invalid', '/local', 'https://user:secret@example.invalid', 'https://example.invalid/\nheader', 'not a url']) {
		assert.throws(() => renderHataskeyEmail({ ...message, action: { label: 'Open', url } }, brand), TypeError);
		assert.throws(() => renderHataskeyEmail(message, { ...brand, url }), TypeError);
		assert.throws(() => renderHataskeyEmail(message, { ...brand, iconUrl: url }), TypeError);
		assert.throws(() => renderHataskeyEmail(message, { ...brand, iconUrl: undefined, logoUrl: url }), TypeError);
	}
	assert.throws(() => renderHataskeyEmail({ ...message, subject: 'Hello\r\nBcc: injected@example.invalid' }, brand), TypeError);
});

test('account lifecycle footers and reset expiry match actual usable actions', async () => {
	for (const kind of ['signup', 'reset-password', 'account-deleted']) {
		const message = createHataskeyEmail({ kind, url: `${brand.url}/preview` }, brand);
		const rendered = renderHataskeyEmail(message, brand);
		assert.doesNotMatch(rendered.html, /href="[^\"]*\/settings\/email"/);
		assert.ok(!rendered.text.includes('/settings/email'));
	}
	const deleted = createHataskeyEmail({ kind: 'account-deleted' }, brand);
	assert.equal(deleted.action, undefined);
	const reset = createHataskeyEmail({ kind: 'reset-password', url: `${brand.url}/preview` }, brand);
	assert.ok(reset.details.some(item => item.value.includes('30')));
	const endpoint = await readFile(new URL('../../packages/backend/src/server/api/endpoints/reset-password.ts', import.meta.url), 'utf8');
	assert.match(endpoint, /1000 \* 60 \* 30/);
});

test('missing images preserve brand and essential message; active case inputs never invent login data', () => {
	const message = createHataskeyEmail({ kind: 'login' }, brand);
	const result = renderHataskeyEmail(message, { ...brand, logoUrl: `${brand.url}/logo.png` }, { images: false });
	assert.doesNotMatch(result.html, /<img\b/);
	assert.ok(result.html.includes(brand.name));
	assert.equal(message.details, undefined);
});

test('forced preview themes are deterministic while delivery can follow system appearance', () => {
	const message = createHataskeyEmail({ kind: 'login' }, brand);
	for (const theme of ['light', 'dark']) {
		const { html } = renderHataskeyEmail(message, brand, { theme });
		assert.ok(html.includes(`name="color-scheme" content="${theme}"`));
		assert.ok(!html.includes('prefers-color-scheme'));
	}
	assert.ok(renderHataskeyEmail(message, brand).html.includes('prefers-color-scheme'));
});

test('preview templates have no delivery dependency or side effect', async () => {
	for (const filename of ['render-hataskey-email.ts', 'hataskey-email-content.ts']) {
		const source = await readFile(new URL(`../../packages/backend/src/core/email/${filename}`, import.meta.url), 'utf8');
		assert.doesNotMatch(source, /from ['"](?:nodemailer|@nestjs|node:)|\bfetch\(|\.sendMail\(/);
	}
});
