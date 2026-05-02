/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * hata-font-manager.ts
 * フォント変更機能のユーティリティ
 * - Google Fontsプリセット読み込み
 * - ドライブからの自前フォント読み込み（免責事項同意必須）
 */

import { prefer } from '@/preferences.js';
import { watch } from 'vue';

export type HataFontId = 'zen-kaku' | 'm-plus-1p' | 'dotgothic16' | 'train-one' | 'ibm-plex-sans-jp' | 'custom' | 'system';

export interface HataFontDef {
	id: HataFontId;
	label: string;
	family: string;
	googleFontsQuery: string | null; // null = system or custom
	weights: string;
	license: string;
	author: string;
	sampleText: string;
}

export const HATA_FONT_PRESETS: HataFontDef[] = [
	{
		id: 'zen-kaku',
		label: 'Zen 角ゴシック Antique（既定）',
		family: "'Zen Kaku Gothic Antique'",
		googleFontsQuery: 'Zen+Kaku+Gothic+Antique:wght@300;400;500;700',
		weights: '300;400;500;700',
		license: 'SIL Open Font License 1.1',
		author: 'The Zen Project Authors (Yoshimichi Ohira)',
		sampleText: 'あいうえお ABC 123',
	},
	{
		id: 'm-plus-1p',
		label: 'M PLUS 1p',
		family: "'M PLUS 1p'",
		googleFontsQuery: 'M+PLUS+1p:wght@300;400;500;700',
		weights: '300;400;500;700',
		license: 'SIL Open Font License 1.1',
		author: 'The M+ Project Authors (Coji Morishita)',
		sampleText: 'あいうえお ABC 123',
	},
	{
		id: 'dotgothic16',
		label: 'DotGothic16（ドット）',
		family: "'DotGothic16'",
		googleFontsQuery: 'DotGothic16',
		weights: '400',
		license: 'SIL Open Font License 1.1',
		author: 'The DotGothic16 Project Authors (Fontworks)',
		sampleText: 'あいうえお ABC 123',
	},
	{
		id: 'train-one',
		label: 'Train One（装飾）',
		family: "'Train One'",
		googleFontsQuery: 'Train+One',
		weights: '400',
		license: 'SIL Open Font License 1.1',
		author: 'The Train Project Authors (Fontworks)',
		sampleText: 'あいうえお ABC 123',
	},
	{
		id: 'ibm-plex-sans-jp',
		label: 'IBM Plex Sans JP',
		family: "'IBM Plex Sans JP'",
		googleFontsQuery: 'IBM+Plex+Sans+JP:wght@300;400;500;700',
		weights: '300;400;500;700',
		license: 'SIL Open Font License 1.1',
		author: 'IBM Corp.',
		sampleText: 'あいうえお ABC 123',
	},
];

const FALLBACK_STACK = ", 'Hiragino Kaku Gothic Pro', 'BIZ UDGothic', Roboto, HelveticaNeue, Arial, sans-serif";

let currentLinkEl: HTMLLinkElement | null = null;
let currentCustomStyleEl: HTMLStyleElement | null = null;

/**
 * Google Fonts の <link> タグを <head> に挿入
 *
 * SECURITY: query はプリセット由来のはずだが、念の為制御文字や URL 区切り文字を除外。
 */
function loadGoogleFont(query: string): void {
	// 既存のフォントlinkを除去
	if (currentLinkEl) {
		currentLinkEl.remove();
		currentLinkEl = null;
	}

	// URL に注入されると望ましくない文字を弾く
	if (typeof query !== 'string' || query.length === 0 || query.length > 200) return;
	if (/[\u0000-\u001F"'`<>\\#?&]/.test(query)) return;

	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = `https://fonts.googleapis.com/css2?family=${query}&display=swap`;
	link.id = 'hata-google-font';
	document.head.appendChild(link);
	currentLinkEl = link;
}

/**
 * 自鯖ドライブと同じ origin (location.origin) のフォント URL のみ許可。
 * これにより
 *   - SSRF / トラッキング用の外部 URL を弾く
 *   - data:, javascript:, blob:, vbscript: 等の危険スキームを弾く
 */
function isSafeFontUrl(url: unknown): url is string {
	if (typeof url !== 'string') return false;
	if (url.length === 0 || url.length > 2048) return false;
	if (/[\u0000-\u001F"'`<>\\]/.test(url)) return false;
	try {
		const u = new URL(url, location.origin);
		// 同 origin のみ許可 (自鯖ドライブを想定)
		if (u.origin !== location.origin) return false;
		// http/https のみ
		if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
		return true;
	} catch {
		return false;
	}
}

/** font-family 名は英数字 + 一部記号のみ許可 */
function sanitizeFontName(name: unknown): string {
	if (typeof name !== 'string' || name.length === 0) return 'HataCustomFont';
	// CSS 文字列リテラル内に直接書く想定のため、引用符・改行・バックスラッシュ・コメント記号を除外
	const cleaned = name.replace(/[^\w\s\-\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, '').trim();
	if (cleaned.length === 0) return 'HataCustomFont';
	return cleaned.slice(0, 64);
}

/**
 * ドライブURLから自前フォントを @font-face で読み込む
 *
 * SECURITY:
 *  - url は同 origin のみ許可 (CSS injection / SSRF 防止)
 *  - fontName は英数字 + 日本語のみ許可 (CSS 文字列エスケープのため)
 */
function loadCustomFont(url: string, fontName: string): void {
	if (currentCustomStyleEl) {
		currentCustomStyleEl.remove();
		currentCustomStyleEl = null;
	}

	if (!isSafeFontUrl(url)) {
		console.warn('[hata-font-manager] Refused to load font from unsafe URL');
		return;
	}
	const safeName = sanitizeFontName(fontName);

	const style = document.createElement('style');
	style.id = 'hata-custom-font';
	// safeName / url ともにサニタイズ済みだが、念のため CSS リテラルコンテキストで使用
	style.textContent = `
@font-face {
	font-family: '${safeName}';
	src: url('${url}');
	font-display: swap;
}
`;
	document.head.appendChild(style);
	currentCustomStyleEl = style;
}

/**
 * html要素の font-family を変更
 */
function applyFontFamily(family: string): void {
	document.documentElement.style.fontFamily = family + FALLBACK_STACK;
}

/**
 * フォント設定を適用（起動時 & 設定変更時に呼ばれる）
 */
export function applyHataFont(): void {
	const fontId = prefer.s['hataFont.id'] as HataFontId;
	const customUrl = prefer.s['hataFont.customUrl'] as string;
	const customName = prefer.s['hataFont.customName'] as string;
	const customConsent = prefer.s['hataFont.customFontConsent'] as boolean;

	// 既存のカスタムフォントスタイルを除去
	if (currentCustomStyleEl) {
		currentCustomStyleEl.remove();
		currentCustomStyleEl = null;
	}

	if (fontId === 'system') {
		// システムフォント：Google Fonts読み込みを除去
		if (currentLinkEl) {
			currentLinkEl.remove();
			currentLinkEl = null;
		}
		document.documentElement.style.removeProperty('font-family');
		return;
	}

	if (fontId === 'custom') {
		if (!customConsent || !customUrl || !isSafeFontUrl(customUrl)) {
			// 同意なし / URL未設定 / URL不正 → 既定フォントへフォールバック
			const defaultPreset = HATA_FONT_PRESETS[0];
			if (defaultPreset.googleFontsQuery) loadGoogleFont(defaultPreset.googleFontsQuery);
			applyFontFamily(defaultPreset.family);
			return;
		}
		// ドライブからカスタムフォント読み込み
		if (currentLinkEl) {
			currentLinkEl.remove();
			currentLinkEl = null;
		}
		const safeName = sanitizeFontName(customName || 'HataCustomFont');
		loadCustomFont(customUrl, safeName);
		applyFontFamily(`'${safeName}'`);
		return;
	}

	// プリセットフォント
	const preset = HATA_FONT_PRESETS.find(f => f.id === fontId);
	if (!preset) return;

	if (preset.googleFontsQuery) {
		loadGoogleFont(preset.googleFontsQuery);
	}
	applyFontFamily(preset.family);
}

/**
 * フォント設定の変更を監視して自動適用する
 */
export function initHataFontWatcher(): void {
	// 初回適用
	applyHataFont();

	// prefer変更を監視
	watch(() => prefer.s['hataFont.id'], () => applyHataFont());
	watch(() => prefer.s['hataFont.customUrl'], () => applyHataFont());
	watch(() => prefer.s['hataFont.customName'], () => applyHataFont());
	watch(() => prefer.s['hataFont.customFontConsent'], () => applyHataFont());
}
