/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseSfc } from '@vue/compiler-sfc';
import { parse as parseCss } from 'postcss';
import { describe, expect, test } from 'vitest';
import { HataskeyWelcomeController } from './welcome.entrance.hataskey.js';
import type { Root, Rule } from 'postcss';

// These are source contracts, including the surrounding client's actual icon
// rules and the real controller's generated markup. They do not simulate font
// rendering, line boxes, computed styles or CSS animation.
const source = readFileSync(resolve(process.cwd(), 'src/pages/welcome.entrance.hataskey.vue'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/pages/welcome.entrance.hataskey.css'), 'utf8');
const globalScss = readFileSync(resolve(process.cwd(), 'src/style.scss'), 'utf8');
const scope = '[data-hataskey-entrance]';
const homeIcon = `${scope} .symbol-home .symbol-icon>i`;
const homeGlyph = `${homeIcon}::before`;
const mediaIcon = `${scope} .symbol-media .symbol-icon>i`;
const mediaGlyph = `${mediaIcon}::before`;
const mediaLayer = `${scope} .symbol-media .symbol-icon`;
const recordButton = `${scope} .hatady-section button[style*="background:linear-gradient"][style*="color:#fff"]`;
const accentBadges = [
	`${scope} .hatady-section [style*="background:linear-gradient"][style*="color:#fff"]`,
	`${scope} .hatady-section [style*="background:var(--hyAccent)"][style*="color:#fff"]`,
];

function declarations(rule: Rule): Record<string, string> {
	const result: Record<string, string> = {};
	// The SCSS .ti block has a nested pseudo-element. Keep its font size separate
	// from the element's font size instead of folding both into one declaration.
	for (const node of rule.nodes) {
		if (node.type === 'decl') result[node.prop] = node.value;
	}
	return result;
}

function styleFor(styles: Root, selector: string): Record<string, string> {
	const matches: Rule[] = [];
	styles.walkRules(rule => {
		if (rule.selectors.includes(selector)) matches.push(rule);
	});
	assert.ok(matches.length <= 1, `${selector} must not acquire state-dependent geometry`);
	if (!matches.length) return {};
	assert.equal(matches[0].parent?.type, 'root', `${selector} must apply at every viewport size and animation state`);
	return declarations(matches[0]);
}

function nativeIconStyles(): { icon: Record<string, string>; glyph: Record<string, string> } {
	const block = globalScss.match(/^\.ti\s*\{[\s\S]*?^\}/m)?.[0];
	assert.ok(block, 'native .ti source must be inspected, not an isolated mock stylesheet');
	const styles = parseCss(block);
	const icon = styles.nodes.find((node): node is Rule => node.type === 'rule' && node.selector === '.ti');
	assert.ok(icon);
	const glyph = icon.nodes.find((node): node is Rule => node.type === 'rule' && node.selector === '&::before');
	assert.ok(glyph, 'native pseudo-element scaling must be included in this regression check');
	return { icon: declarations(icon), glyph: declarations(glyph) };
}

function inEm(value: string, inheritedEm: number): number {
	const match = value.match(/^(\d*\.?\d+)(em|%)$/);
	assert.ok(match, `unexpected icon sizing expression: ${value}`);
	return Number(match[1]) * inheritedEm / (match[2] === '%' ? 100 : 1);
}

function headingIconMetrics(stylesSource: string, iconSelector = mediaIcon): { boxWidth: number; glyphEm: number } {
	const styles = parseCss(stylesSource);
	const native = nativeIconStyles();
	// These selectors deliberately increase in specificity: .ti, the ordinary
	// welcome symbol, then the heading-specific reset. Source order is irrelevant.
	const icon = {
		...native.icon,
		...styleFor(styles, `${scope} .symbol-icon>i`),
		...styleFor(styles, iconSelector),
	};
	const glyph = { ...native.glyph, ...styleFor(styles, `${iconSelector}::before`) };
	const iconEm = inEm(icon['font-size'], 1);
	return {
		boxWidth: inEm(icon.width, iconEm),
		glyphEm: inEm(glyph['font-size'], iconEm),
	};
}

function assertSingleCharacterIcon(stylesSource: string, iconSelector = mediaIcon): void {
	const { boxWidth, glyphEm } = headingIconMetrics(stylesSource, iconSelector);
	assert.ok(boxWidth <= 1, `icon element exceeds the one-character text slot: ${boxWidth}em`);
	assert.ok(glyphEm <= 1, `Tabler pseudo-element exceeds the one-character text slot: ${glyphEm}em`);
}

function withoutRule(selector: string): string {
	const styles = parseCss(css);
	let removed = false;
	styles.walkRules(rule => {
		if (!rule.selectors.includes(selector)) return;
		rule.remove();
		removed = true;
	});
	assert.ok(removed, `positive control must actually remove ${selector}`);
	return styles.toString();
}

function changedDeclaration(selector: string, property: string, value: string): string {
	const styles = parseCss(css);
	let changed = false;
	styles.walkRules(rule => {
		if (!rule.selectors.includes(selector)) return;
		rule.walkDecls(property, declaration => {
			declaration.value = value;
			changed = true;
		});
	});
	assert.ok(changed, `positive control must actually change ${selector} ${property}`);
	return styles.toString();
}

function mediaCenterOffsets(stylesSource: string): number[] {
	const styles = parseCss(stylesSource);
	const layer = {
		...styleFor(styles, `${scope} .symbol-icon`),
		...styleFor(styles, mediaLayer),
	};
	assert.equal(layer.display, 'grid');
	const alignment = layer['justify-items'] ?? layer['place-items'];
	assert.ok(alignment === 'end' || alignment === 'center', 'unexpected media icon alignment');
	const { boxWidth } = headingIconMetrics(stylesSource);
	// CJK slot widths for 本 / ゲーム / 映画. Every icon must share the center
	// of the text it replaces; the visible particle stays in its stable text slot.
	return [1, 3, 2].map(slotWidth => alignment === 'center' ? 0 : (slotWidth - boxWidth) / 2);
}

function assertCenteredAlignment(stylesSource: string): void {
	assert.deepEqual(mediaCenterOffsets(stylesSource), [0, 0, 0], 'media icons must share the center of their text slot');
	assert.equal(styleFor(parseCss(stylesSource), mediaLayer)['transform-origin'], 'center', 'media icons must exit around the center of their text slot');
}

function hatadyFixture(language = 'ja'): HTMLElement {
	const parsed = parseSfc(source);
	assert.deepEqual(parsed.errors, []);
	assert.ok(parsed.descriptor.template);
	const root = window.document.createElement('div');
	root.setAttribute('data-hataskey-entrance', '');
	root.innerHTML = parsed.descriptor.template.content;
	const body = root.querySelector<HTMLElement>('#hatady .hatady-body');
	assert.ok(body, 'the real Hatady body ref must be present');
	const controller = new HataskeyWelcomeController();
	controller.lang = language;
	controller.hatadyBodyRef(body);
	// renderHatady only updates this body; mounting would start unrelated timers.
	controller.renderHatady();
	return root;
}

function assertButtonOnlySelector(selector: string, root: HTMLElement): void {
	const matches = [...root.querySelectorAll(selector)];
	assert.ok(matches.every(element => element.tagName === 'BUTTON'), 'white record text must not recolor a badge or header icon');
	assert.equal(matches.length, 2, 'both the header and generated-body record buttons must match');
	assert.ok(matches[0].closest('.hatady-header'));
	assert.ok(matches[1].closest('.hatady-body'));
}

function assertRecordTreatment(stylesSource: string): void {
	const styles = parseCss(stylesSource);
	const rules: Rule[] = [];
	styles.walkRules(rule => {
		if (rule.selectors.includes(recordButton)) rules.push(rule);
	});
	assert.equal(rules.length, 1, 'record buttons must have one scoped white-text override');
	assert.equal(rules[0].parent?.type, 'root', 'record treatment must apply at every size and theme');
	const properties = new Map(rules[0].nodes.filter(node => node.type === 'decl').map(node => [node.prop, node]));
	assert.equal(properties.get('color')?.value, '#fff', 'record text must be white');
	assert.ok(properties.get('color')?.important, 'white text must override the existing important accent contrast rule');
	assert.ok(properties.get('background')?.important, 'the readable background must override both inline gradients');
	assertButtonOnlySelector(recordButton, hatadyFixture());
}

function recordContrastRatios(stylesSource: string, dark: boolean, system: boolean, brightness: number): number[] {
	const styles = parseCss(stylesSource);
	const variables: Record<string, string> = {};
	// The general welcome palette and Hatady palette extend the same selector.
	// Merge these declarations in source order without relaxing geometry checks.
	styles.walkRules(rule => {
		if (rule.selectors.includes(`${scope}[data-color-mode]`)) Object.assign(variables, declarations(rule));
	});
	if (dark) {
		const selector = `${scope}[data-color-mode="${system ? 'system' : 'dark'}"]`;
		styles.walkRules(rule => {
			if (rule.selectors.includes(selector)) Object.assign(variables, declarations(rule));
		});
	}
	const background = styleFor(styles, recordButton).background;
	const mixes = [...background.matchAll(/color-mix\(in srgb,var\(--hyAccent\) (\d+)%,var\(--hyOnAccent\)\)/g)];
	assert.equal(mixes.length, 2, 'both gradient endpoints must use the existing Hatady contrast tokens');
	const rgb = (token: string) => {
		assert.match(token, /^#[\da-f]{6}$/i);
		return [1, 3, 5].map(offset => Number.parseInt(token.slice(offset, offset + 2), 16) / 255);
	};
	const accent = rgb(variables['--hyAccent']);
	const onAccent = rgb(variables['--hyOnAccent']);
	return mixes.map(mix => {
		const proportion = Number(mix[1]) / 100;
		const channels = accent.map((value, index) => Math.min(1, (value * proportion + onAccent[index] * (1 - proportion)) * brightness));
		const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
		const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
		return 1.05 / (luminance + 0.05);
	});
}

function assertReadableRecordText(stylesSource: string, dark: boolean, system: boolean, brightness: number): void {
	assert.ok(recordContrastRatios(stylesSource, dark, system, brightness).every(ratio => ratio >= 4.5), 'white record text must retain 4.5:1 contrast at both gradient endpoints');
}

describe('Hatask / Hatady heading-icon sizing and spacing in the native client', () => {
	test('本の一文字枠内にアイコン要素とTabler疑似要素の両方を収める', () => {
		assertSingleCharacterIcon(css);
		expect(headingIconMetrics(css)).toEqual({ boxWidth: 1, glyphEm: 1 });
	});

	test.each([homeIcon, mediaIcon])('見出し専用リセットを全幅・全再生状態に適用する: %s', iconSelector => {
		const styles = parseCss(css);
		expect(styleFor(styles, iconSelector)).toEqual({
			display: 'block', width: '1em', height: '1em', 'font-size': '1em', 'line-height': '1', 'vertical-align': '0',
		});
		expect(styleFor(styles, `${iconSelector}::before`)).toEqual({ display: 'block', 'font-size': '1em', 'line-height': '1' });
	});

	test('ホームも文字と同じ1emとし、1.18倍と本体128%の二重拡大を打ち消す', () => {
		assertSingleCharacterIcon(css, homeIcon);
		expect(headingIconMetrics(css, homeIcon)).toEqual({ boxWidth: 1, glyphEm: 1 });
	});

	test('本・ゲーム・映画はそれぞれの文字枠の中央へ配置し、中央を支点に退場する', () => {
		assertCenteredAlignment(css);
		const styles = parseCss(css);
		expect(styleFor(styles, `${scope} .symbol-icon`)).toMatchObject({ position: 'absolute', inset: '0' });
		expect(styleFor(styles, `${scope} .symbol-text`)).toMatchObject({ display: 'inline-block', 'line-height': 'inherit' });
		expect(styleFor(styles, `${scope} .symbol-text`).position).toBeUndefined();
	});

	test('アニメーションの最終語と助詞を同じ改行不可の句に残す', () => {
		const parsed = parseSfc(source);
		assert.deepEqual(parsed.errors, []);
		assert.ok(parsed.descriptor.template);
		const template = window.document.createElement('template');
		template.innerHTML = parsed.descriptor.template.content;
		const copy = template.content.querySelector('#hatady [data-symbol-lang="ja"]');
		assert.ok(copy);
		const phrases = [...copy.querySelectorAll(':scope > .symbol-phrase')];
		expect(phrases.map(phrase => phrase.textContent)).toEqual(['学びも、', '本も、', 'ゲームも、', '映画も。']);
		expect(phrases.slice(1).map(phrase => phrase.querySelector('.symbol-media .symbol-icon>i')?.className)).toEqual([
			'ti ti-book-2', 'ti ti-device-gamepad-2', 'ti ti-movie',
		]);
		expect(phrases[3].querySelector('[data-symbol-last]')?.textContent).toBe('映画');
		expect(styleFor(parseCss(css), `${scope} .symbol-phrase`)['white-space']).toBe('nowrap');
	});

	test('陽性対照：要素のリセットを外すと本体の幅1.28emとwelcomeの拡大率を検出する', () => {
		const mutated = withoutRule(mediaIcon);
		expect(headingIconMetrics(mutated).boxWidth).toBeCloseTo(1.5104);
		expect(() => assertSingleCharacterIcon(mutated)).toThrow('icon element exceeds');
	});

	test('陽性対照：疑似要素のリセットを外すと本体の128%拡大を検出する', () => {
		const mutated = withoutRule(mediaGlyph);
		expect(headingIconMetrics(mutated).glyphEm).toBeCloseTo(1.28);
		expect(() => assertSingleCharacterIcon(mutated)).toThrow('Tabler pseudo-element exceeds');
	});

	test('陽性対照：ホームの要素リセットを外すと1.5104emの大きな家アイコンを検出する', () => {
		const mutated = withoutRule(homeIcon);
		expect(headingIconMetrics(mutated, homeIcon).boxWidth).toBeCloseTo(1.5104);
		expect(() => assertSingleCharacterIcon(mutated, homeIcon)).toThrow('icon element exceeds');
	});

	test('陽性対照：ホームの疑似要素リセットを外すと128%の拡大を検出する', () => {
		const mutated = withoutRule(homeGlyph);
		expect(headingIconMetrics(mutated, homeIcon).glyphEm).toBeCloseTo(1.28);
		expect(() => assertSingleCharacterIcon(mutated, homeIcon)).toThrow('Tabler pseudo-element exceeds');
	});

	test('陽性対照：右寄せにするとゲーム・映画の中心が1・0.5emずれることを検出する', () => {
		const mutated = changedDeclaration(mediaLayer, 'justify-items', 'end');
		expect(mediaCenterOffsets(mutated)).toEqual([0, 1, 0.5]);
		expect(() => assertCenteredAlignment(mutated)).toThrow('media icons must share the center of their text slot');
	});

	test('陽性対照：右端を支点にすると中央基準ではない退場を検出する', () => {
		const mutated = changedDeclaration(mediaLayer, 'transform-origin', 'right center');
		expect(() => assertCenteredAlignment(mutated)).toThrow('media icons must exit around the center of their text slot');
	});
});

describe('Hatady record button source contrast and scope', () => {
	test.each(['ja', 'en'])('静的ヘッダーと動的本文の記録ボタンを両方白字へ上書きする: %s', language => {
		assertRecordTreatment(css);
		const root = hatadyFixture(language);
		assertButtonOnlySelector(recordButton, root);
		expect(root.querySelector('.hatady-body button')?.textContent).toBe(language === 'en' ? 'Record' : '記録する');
	});

	test('ヘッダーアイコン・通知数・本文の本アイコンは既存のアクセント対比色を保つ', () => {
		const root = hatadyFixture();
		const badges = [...root.querySelectorAll(accentBadges.join(','))].filter(element => element.tagName !== 'BUTTON');
		expect(badges.length).toBeGreaterThanOrEqual(3);
		for (const badge of badges) expect(badge.matches(recordButton)).toBe(false);
		for (const selector of accentBadges) expect(styleFor(parseCss(css), selector).color).toBe('var(--hyOnAccent)');
	});

	test.each([
		['light', false, false], ['dark', true, false], ['system-light', false, true], ['system-dark', true, true],
	] as const)('既存テーマ変数で白字と背景の対比を通常時・hover時とも保つ: %s', (_mode, dark, system) => {
		const hover = styleFor(parseCss(css), `${scope} .hWelcome-state-68:hover`).filter;
		expect(hover).toBe('brightness(1.05)');
		assertReadableRecordText(css, dark, system, 1);
		assertReadableRecordText(css, dark, system, 1.05);
	});

	test('陽性対照：白字の上書きを削除すると既存の暗色importantルールへの逆戻りを検出する', () => {
		expect(() => assertRecordTreatment(withoutRule(recordButton))).toThrow('record buttons must have one scoped white-text override');
	});

	test('陽性対照：whiteのimportantを外すと既存の対比色ルールに負けることを検出する', () => {
		const styles = parseCss(css);
		let changed = false;
		styles.walkRules(rule => {
			if (!rule.selectors.includes(recordButton)) return;
			rule.walkDecls('color', declaration => {
				declaration.important = false;
				changed = true;
			});
		});
		assert.ok(changed);
		expect(() => assertRecordTreatment(styles.toString())).toThrow('white text must override the existing important accent contrast rule');
	});

	test('陽性対照：button限定を外すとヘッダーアイコンまで白字になる対象拡大を検出する', () => {
		expect(() => assertButtonOnlySelector(recordButton.replace(' button[', ' ['), hatadyFixture())).toThrow('white record text must not recolor a badge or header icon');
	});

	test('陽性対照：明るいアクセント色だけへ戻すとダークテーマの白字対比不足を検出する', () => {
		const mutated = changedDeclaration(recordButton, 'background', 'linear-gradient(90deg,color-mix(in srgb,var(--hyAccent) 100%,var(--hyOnAccent)),color-mix(in srgb,var(--hyAccent) 100%,var(--hyOnAccent)))');
		expect(() => assertReadableRecordText(mutated, true, false, 1.05)).toThrow('white record text must retain 4.5:1 contrast');
	});
});
