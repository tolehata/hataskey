/*
 * SPDX-FileCopyrightText: tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
	calculateHataCardDeviceTilt,
	HATA_CARD_GOLD_UNLOCK_AGE_MS,
	isHataCardGoldUnlocked,
	makeHataCardFileName,
	normalizeHataCardGlassOpacity,
} from './hata-card-maker.js';

const frontendRoot = resolve(process.cwd());
const readFrontendFile = (path: string) => readFileSync(resolve(frontendRoot, path), 'utf8');

describe('カードメーカー', () => {
	test('利用開始から365日でゴールドデザインを解放する', () => {
		const now = Date.parse('2026-08-12T00:00:00.000Z');
		expect(isHataCardGoldUnlocked(new Date(now - HATA_CARD_GOLD_UNLOCK_AGE_MS).toISOString(), now)).toBe(true);
		expect(isHataCardGoldUnlocked(new Date(now - HATA_CARD_GOLD_UNLOCK_AGE_MS + 1).toISOString(), now)).toBe(false);
		expect(isHataCardGoldUnlocked('invalid', now)).toBe(false);
	});

	test('透明度と保存ファイル名を安全な範囲へ正規化する', () => {
		expect(normalizeHataCardGlassOpacity(8)).toBe(20);
		expect(normalizeHataCardGlassOpacity(57)).toBe(55);
		expect(normalizeHataCardGlassOpacity(120)).toBe(90);
		expect(makeHataCardFileName('../旗茶 / test', 'gold')).toBe('hata-card-gold-旗茶-test.png');
	});

	test('端末の向きに合わせて傾き軸を切り替え、最大角度を制限する', () => {
		expect(calculateHataCardDeviceTilt(15, 9, 0)).toEqual({ x: -5, y: 3 });
		expect(calculateHataCardDeviceTilt(15, 9, 90)).toEqual({ x: 3, y: 5 });
		expect(calculateHataCardDeviceTilt(15, 9, 270)).toEqual({ x: -3, y: -5 });
		expect(calculateHataCardDeviceTilt(99, -99, 0)).toEqual({ x: -10, y: -10 });
	});

	test('内部ページとしてログイン済み情報とローカル依存だけを使う', () => {
		const page = readFrontendFile('src/pages/hata-card-maker.vue');
		const router = readFrontendFile('src/router.definition.ts');
		const hatask = readFrontendFile('src/pages/hatask.vue');
		expect(page).toContain('const $i = ensureSignin();');
		expect(page).toContain('import QRCodeStyling from \'qr-code-styling\';');
		expect(page).toContain('getProxiedImageUrl($i.avatarUrl, \'avatar\', true)');
		expect(page).not.toMatch(/miauth|concrnt\/resolve|html2canvas|cdn\.jsdelivr|fonts\.googleapis/i);
		expect(router).toMatch(/path: '\/hatask\/card-maker',[\s\S]*?loginRequired: true/);
		expect(hatask).toContain('routeRouter.push(\'/hatask/card-maker\')');
	});

	test('非入力画面のキャレット残置を防ぎ、端末傾きと装飾コードを結線する', () => {
		const page = readFrontendFile('src/pages/hata-card-maker.vue');
		expect(page).toContain('caret-color: transparent;');
		expect(page).toContain('role="group" :aria-label="copy.accentColor"');
		expect(page).not.toContain('<label :class="$style.colorField">');
		expect(page).not.toContain('copy.hataskTool');
		expect(page).not.toContain('copy.localProfileNotice');
		expect(page).toContain('window.addEventListener(\'deviceorientation\', onDeviceOrientation');
		expect(page).toContain('orientationEvent.requestPermission()');
		expect(page).toContain("image: instance.iconUrl ? getStaticImageUrl(instance.iconUrl) : '/favicon.ico'");
		expect(page).toContain('imageSize: 0.3');
		expect(page).toContain('dotsOptions: { type: \'dots\', color: dark }');
		expect(page).toContain('cornersSquareOptions: { type: \'extra-rounded\', color: dark }');
		expect(page).toContain('errorCorrectionLevel: \'H\'');
		expect(page).not.toContain('$style.qrCorners');
		expect(page).not.toContain('$style.qrSignal');
		expect(page).not.toContain('conic-gradient(from 35deg');
	});
});
