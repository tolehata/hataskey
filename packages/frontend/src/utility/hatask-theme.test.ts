/* SPDX-License-Identifier: AGPL-3.0-only */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileStyleAsync, parse } from '@vue/compiler-sfc';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { getHataskHatakyuStyle } from './hatask-theme.js';

vi.mock('@/preferences.js', () => ({ prefer: { r: { 'hataBranding.useHatakyu': { value: true } } } }));

const base = resolve(process.cwd(), 'src/components/hatask');
const skins = readFileSync(resolve(base, 'hatask-themes.scss'), 'utf8');
const source = readFileSync(resolve(process.cwd(), 'src/pages/hatask.vue'), 'utf8');
const layoutSource = readFileSync(resolve(base, 'HataskAkatsukiLayout.vue'), 'utf8');
const pageScopedStyle = parse(source).descriptor.styles.find(style => style.scoped);
if (!pageScopedStyle) throw new Error('Missing page styles');
const pageStyle = pageScopedStyle.content;
const layoutStyle = parse(layoutSource).descriptor.styles[0].content;
let css: string;
beforeAll(async () => {
	const outputs = await Promise.all([
		compileStyleAsync({ source: skins, filename: resolve(base, 'hatask-themes.scss'), id: 'skins', preprocessLang: 'scss' }),
		compileStyleAsync({ source: pageStyle, filename: 'hatask.vue', id: 'data-v-page', scoped: true, preprocessLang: 'scss' }),
		compileStyleAsync({ source: layoutStyle, filename: 'HataskAkatsukiLayout.vue', id: 'data-v-layout', scoped: true, preprocessLang: 'scss' }),
	]);
	for (const result of outputs) expect(result.errors).toEqual([]);
	css = outputs.map(result => result.code).join('\n');
});

describe('Hatask theme replacement', () => {
	test.each([
		['koke', '#f8fbf4', '#213025', '24px', '#7a8f70', '#819475'],
		['kisetsu', '#fffdf8', '#242018', '6px', '#baae98', '#6c5d46'],
		['kashin', '#fffdf7', '#292231', '22px', '#655347', '#aa94a4'],
		['suri', '#fffdf6', '#20202f', '0px', '#1a1a2e', '#c3b8d0'],
		['hatakyu', '#fdf6e6', '#332b22', '3px', '#b4996d', '#9a7953'],
	])('%s uses its new palette through the shared layout in both modes', (theme, light, dark, radius, lightRule, darkRule) => {
		const style = window.document.createElement('style'); style.textContent = css; window.document.head.append(style);
		const root = window.document.createElement('div'); root.className = 'htk-root'; root.dataset.theme = theme; root.setAttribute('data-v-page', '');
		const layout = window.document.createElement('section'); layout.className = 'htk-akatsuki-layout'; layout.dataset.enabled = 'true'; layout.setAttribute('data-v-layout', ''); layout.setAttribute('data-v-page', '');
		root.append(layout); window.document.body.append(root);
		try {
			for (const mode of ['light', 'dark']) {
				root.dataset.mode = mode; layout.dataset.mode = mode;
				const rootTokens = getComputedStyle(root); const tokens = getComputedStyle(layout);
				expect(rootTokens.getPropertyValue('--surface').trim()).toBe(mode === 'light' ? light : dark);
				expect(tokens.getPropertyValue('--surface').trim()).toBe(mode === 'light' ? light : dark);
				expect(tokens.getPropertyValue('--card-radius').trim()).toBe(radius);
				for (const target of [rootTokens, tokens]) {
					expect(target.getPropertyValue('--bg-image')).toContain('-gradient(');
					expect(target.getPropertyValue('--rule2').trim()).toBe(mode === 'light' ? lightRule : darkRule);
				}
				if (mode === 'dark' || theme === 'kashin') expect(rootTokens.getPropertyValue('--on-accent').trim()).not.toBe('#fff');
			}
		} finally { root.remove(); style.remove(); }
	});

	test.each(['light', 'dark'])('苔の%s配色は分離したダイアログにも届き、文字と操作を読み取れる', mode => {
		const contrast = (a: string, b: string) => {
			const luminance = (hex: string) => {
				expect(hex).toMatch(/^#[\da-f]{6}$/iu);
				const rgb = [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
					.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
				return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
			};
			const [darker, lighter] = [luminance(a), luminance(b)].sort((x, y) => x - y);
			return (lighter + .05) / (darker + .05);
		};
		expect(contrast('#ffffff', '#accb99')).toBeLessThan(4.5);
		const style = window.document.createElement('style'); style.textContent = css; window.document.head.append(style);
		const host = window.document.createElement('div'); window.document.body.append(host);
		host.innerHTML = `<div class="htk-root"></div><div class="htk-modal-ov"></div><div class="htk-event-details-theme"></div><div class="htk-theme-preview"></div><div class="htk-theme-action"></div><div data-hatask-support></div><div data-hatask-ranking></div><div data-hatask-theme="koke" data-hatask-mode="${mode}"></div>`;
		try {
			for (const element of host.querySelectorAll<HTMLElement>(':scope > div')) {
				element.dataset.theme = 'koke'; element.dataset.mode = mode;
				const tokens = getComputedStyle(element);
				const color = (name: string) => tokens.getPropertyValue(name).trim();
				expect(color('--surface')).toBe(mode === 'light' ? '#f8fbf4' : '#213025');
				const backgrounds = ['--bg', '--surface', '--rail-paper', '--aside-paper'].map(color);
				backgrounds.push(...(color('--bg-image').match(/#[\da-f]{6}/giu) ?? []));
				for (const background of backgrounds) {
					for (const foreground of ['--fg', '--fg-2', '--fg-3']) expect(contrast(color(foreground), background), foreground).toBeGreaterThanOrEqual(4.5);
				}
				for (const [foreground, background] of [['--on-accent', '--accent'], ['--htk-on-ink', '--accent-ink'], ['--on-accent2', '--accent2']]) {
					expect(contrast(color(foreground), color(background))).toBeGreaterThanOrEqual(4.5);
				}
				expect(contrast('#ffffff', color('--hak-badge-bg'))).toBeGreaterThanOrEqual(4.5);
				expect(contrast(color('--accent-ink'), color('--surface'))).toBeGreaterThanOrEqual(3);
				expect(contrast(color('--rule2'), color('--surface'))).toBeGreaterThanOrEqual(3);
			}
		} finally { host.remove(); style.remove(); }
	});

	test('old dedicated layouts and page swipes are removed while the saved IDs remain', () => {
		const template = parse(source).descriptor.template?.content;
		if (!template) throw new Error('Missing page template');
		expect(template).toContain(':enabled="true"');
		const hasLegacy = (value: string) => /\b(?:o1[abdk]|hk-panels|hk-wind|htkTouchStart)\b/u.test(value);
		expect(hasLegacy(`${source}\n<div class="o1k"/>`)).toBe(true);
		expect(hasLegacy(source)).toBe(false);
		expect(template.match(/<HataskAkatsukiLayout\b/gu)).toHaveLength(1);
		expect(source).toContain('settings.value = { ...defaultSettings, ...settings.value }');
	});

	test('all production home and navigation icons receive existing Hatakyu illustrations', async () => {
		const art = readFileSync(resolve(base, 'hatask-hatakyu.scss'), 'utf8');
		const compiled = await compileStyleAsync({ source: art, filename: 'hatask-hatakyu.scss', id: 'art', preprocessLang: 'scss' });
		expect(compiled.errors).toEqual([]);
		const icons = [...new Set([...layoutSource.slice(0, layoutSource.indexOf('const recordActions:')).matchAll(/icon: 'ti (ti-[\w-]+)'/gu), ...readFileSync(resolve(process.cwd(), 'src/utility/hatask-akatsuki.ts'), 'utf8').matchAll(/icon: 'ti (ti-[\w-]+)'/gu)].map(match => match[1]))];
		const root = window.document.createElement('div'); root.className = 'htk-root'; root.dataset.theme = 'hatakyu';
		const button = window.document.createElement('button'); button.className = 'hak-focus-option'; root.append(button);
		const icon = window.document.createElement('i'); button.append(icon);
		const stylesheet = compiled.rawResult?.root;
		if (!stylesheet) throw new Error('Missing compiled illustration styles');
		const covered = (name: string) => {
			icon.className = `ti ${name}`;
			const stickers: string[] = []; const painted: string[] = [];
			stylesheet.walkRules(rule => {
				if (!rule.selector.includes('::after') && rule.selectors.some(selector => icon.matches(selector))) rule.walkDecls('--hatakyu-sticker', decl => { stickers.push(decl.value); });
				if (rule.selector.includes('::after') && rule.selectors.some(selector => icon.matches(selector.replace('::after', '')))) painted.push(rule.selector);
			});
			return painted.length > 0 && stickers.some(value => value.startsWith('var(--hatakyu-'));
		};
		expect(covered('ti-unknown-positive-control')).toBe(false);
		for (const name of icons) expect(covered(name), name).toBe(true);
		const assets = getHataskHatakyuStyle();
		for (const value of Object.values(assets)) {
			const path = String(value).match(/^url\("\/client-assets\/(hatakyu\/[^"?]+)"\)$/u)?.[1];
			if (!path) throw new Error(`Invalid asset URL: ${String(value)}`);
			expect(existsSync(resolve(process.cwd(), 'assets', path)), path).toBe(true);
		}
	});
});
