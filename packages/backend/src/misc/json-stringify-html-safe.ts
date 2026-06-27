/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// 旗鯖fork: 本家 2026.6.0 から取り込み (OAuth2 認可画面 HtmlTemplateService 依存)。
// ClientServerService.ts は引き続き htmlescape パッケージを使用するが、本家の
// HtmlTemplateService / views/*.tsx 系は本ユーティリティを使う。

const ESCAPE_LOOKUP = {
	'&': '\\u0026',
	'>': '\\u003e',
	'<': '\\u003c',
	' ': '\\u2028',
	' ': '\\u2029',
} as Record<string, string>;

const ESCAPE_REGEX = /[&><  ]/g;

export function htmlSafeJsonStringify(obj: any): string {
	return JSON.stringify(obj).replace(ESCAPE_REGEX, x => ESCAPE_LOOKUP[x]);
}
