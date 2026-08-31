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
import type { AtRule, Document, Root, Rule } from 'postcss';

// Source/DOM contracts only: these assertions do not measure rendered line boxes,
// browser layout, pixel positions, or the visual smoothness of an animation.
const sourcePath = resolve(process.cwd(), 'src/pages/welcome.entrance.hataskey.vue');
const source = readFileSync(sourcePath, 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/pages/welcome.entrance.hataskey.css'), 'utf8');
const scope = '[data-hataskey-entrance]';
const geometryProperty = /^(?:position|display|float|clear|inset(?:-.+)?|top|right|bottom|left|(?:min-|max-)?(?:width|height|inline-size|block-size)|margin(?:-.+)?|padding(?:-.+)?|border(?:-.+)?|line-height|vertical-align|font(?:-.+)?|letter-spacing|white-space|grid(?:-.+)?|place(?:-.+)?|align(?:-.+)?|justify(?:-.+)?)$/;

function parseTemplate(markup: string): DocumentFragment {
	const parsed = parseSfc(markup, { filename: sourcePath });
	assert.deepEqual(parsed.errors, [], 'welcome SFC must parse');
	assert.ok(parsed.descriptor.template, 'welcome SFC must contain a template');
	const template = window.document.createElement('template');
	template.innerHTML = parsed.descriptor.template.content;
	return template.content;
}

function conditions(rule: Rule): { name: string; params: string }[] {
	const result: { name: string; params: string }[] = [];
	for (let parent: AtRule | Document | Root | Rule | undefined = rule.parent; parent; parent = parent.parent) {
		if (parent.type !== 'atrule') continue;
		const atRule = parent as AtRule;
		result.push({ name: atRule.name, params: atRule.params });
	}
	return result;
}

function baseRule(styles: Root, className: string): Rule {
	const matches: Rule[] = [];
	styles.walkRules(rule => {
		if (conditions(rule).length === 0 && rule.selectors.includes(`${scope} .${className}`)) matches.push(rule);
	});
	assert.equal(matches.length, 1, `expected one base rule for ${className}`);
	return matches[0];
}

function declarations(rule: Rule): Record<string, string> {
	const result: Record<string, string> = {};
	rule.walkDecls(declaration => { result[declaration.prop] = declaration.value; });
	return result;
}

// This deliberately compares source declarations, not a simulated CSS engine.
// All matching symbol rules are inspected, including any responsive override.
// Geometry may not vary between ready/playing/done or reduced-motion states.
function symbolGeometry(styles: Root, element: Element, reduced: boolean): Record<string, string> {
	const result: Record<string, string> = {};
	styles.walkRules(rule => {
		if (!rule.selector.includes('.symbol')) return;
		const context = conditions(rule);
		if (context.some(condition => condition.name.endsWith('keyframes'))) return;
		if (!reduced && context.some(condition => /prefers-reduced-motion\s*:\s*reduce/.test(condition.params))) return;
		if (!rule.selectors.some(selector => element.matches(selector))) return;
		rule.walkDecls(declaration => {
			if (geometryProperty.test(declaration.prop)) result[declaration.prop] = declaration.value;
		});
	});
	const inlineStyle = element.getAttribute('style');
	if (inlineStyle) {
		parseCss(`target{${inlineStyle}}`).walkDecls(declaration => {
			if (geometryProperty.test(declaration.prop)) result[declaration.prop] = declaration.value;
		});
	}
	return result;
}

function assertSymbolLayout(stylesSource: string, markup = source): void {
	const styles = parseCss(stylesSource);
	// Happy DOM may retain matches() results after an ancestor attribute changes
	// in a detached fragment. Each state gets fresh nodes before any CSS matching.
	const variants = ['ready', 'playing', 'done'].map(state => {
		const template = parseTemplate(markup);
		for (const heading of template.querySelectorAll('[data-symbol-heading]')) heading.setAttribute('data-symbol-state', state);
		return { state, swaps: Array.from(template.querySelectorAll('.symbol-swap,.symbol-capsule-swap')) };
	});
	const swaps = variants[0].swaps;
	assert.ok(swaps.length > 0, 'symbol swap targets must exist');
	for (const [index, swap] of swaps.entries()) {
		const heading = swap.closest('[data-symbol-heading]');
		const text = swap.querySelector('.symbol-text,.symbol-capsule-copy');
		const icon = swap.querySelector('.symbol-icon,.symbol-capsule-form');
		assert.ok(heading && text && icon, 'every swap must retain its heading, text and decorative layer');
		const initialSwap = symbolGeometry(styles, swap, false);
		const initialText = symbolGeometry(styles, text, false);
		const initialIcon = symbolGeometry(styles, icon, false);
		assert.equal(initialSwap.position, 'relative', 'text-sized swap must own the decorative layer');
		assert.equal(initialSwap.display, 'inline-block', 'swap must not derive its baseline from a grid icon');
		assert.equal(initialSwap['vertical-align'], 'baseline', 'swap must align with neighboring text');
		assert.equal(initialSwap['white-space'], 'nowrap', 'a symbol word must stay together');
		assert.equal(initialSwap['min-height'], undefined, 'mascot height must not reserve a different line box');
		assert.equal(initialText.display, 'inline-block', 'visible or hidden text must stay in flow');
		assert.equal(initialText.position, undefined, 'text must not be absolutely positioned');
		assert.equal(initialText['line-height'], 'inherit', 'text must keep the surrounding line height');
		assert.equal(initialIcon.position, 'absolute', 'decorative symbols must never determine text geometry');
		assert.equal(initialIcon['min-width'], undefined, 'icon minimum width must not return');
		assert.equal(initialIcon['min-height'], undefined, 'icon minimum height must not return');
		if (icon.classList.contains('symbol-icon')) {
			assert.equal(initialIcon.inset, '0', 'icon must center within the text-sized containing block');
		} else {
			assert.equal(initialIcon['inset-inline'], '0');
			assert.equal(initialIcon.top, '50%');
			assert.equal(initialIcon.height, '.66em');
			assert.equal(initialIcon['margin-top'], '-.33em', 'capsule centering must not compete with transform motion');
		}
		for (const { state, swaps: stateSwaps } of variants) {
			const stateSwap = stateSwaps[index];
			const stateText = stateSwap.querySelector('.symbol-text,.symbol-capsule-copy');
			const stateIcon = stateSwap.querySelector('.symbol-icon,.symbol-capsule-form');
			assert.ok(stateText && stateIcon);
			for (const reduced of [false, true]) {
				assert.deepEqual(symbolGeometry(styles, stateSwap, reduced), initialSwap, `swap geometry must remain stable in ${state}, reduced=${reduced}`);
				assert.deepEqual(symbolGeometry(styles, stateText, reduced), initialText, `text geometry must remain stable in ${state}, reduced=${reduced}`);
				const currentIcon = symbolGeometry(styles, stateIcon, reduced);
				assert.equal(currentIcon.position, 'absolute', 'decorative layer must remain out of flow in every state');
				// Reduced motion may remove only the absolutely-positioned decoration.
				delete currentIcon.display;
				const expectedIcon = { ...initialIcon };
				delete expectedIcon.display;
				assert.deepEqual(currentIcon, expectedIcon, 'decoration geometry must not change when animation finishes');
			}
		}
	}
}

function assertHatadyPhrases(stylesSource: string, markup = source): void {
	const template = parseTemplate(markup);
	const copy = template.querySelector('#hatady h2 .symbol-copy[data-symbol-lang="ja"]');
	assert.ok(copy, 'Japanese Hatady heading must exist');
	const phrases = Array.from(copy.querySelectorAll(':scope > .symbol-phrase'));
	assert.deepEqual(phrases.map(phrase => phrase.textContent), ['学びも、', '本も、', 'ゲームも、', '映画も。'], 'all four Japanese phrases must keep their particles and punctuation');
	for (const node of Array.from(copy.childNodes)) {
		if (node.nodeName === 'BR') break;
		if (node.nodeType === 3 && !node.textContent?.trim()) continue;
		assert.ok(phrases.includes(node as Element), 'no orphaned particle may sit between the phrase wrappers');
	}
	assert.equal(phrases[3].querySelector('[data-symbol-last]')?.textContent, '映画', 'film animation and its trailing particle must share a wrapper');
	const phraseStyle = declarations(baseRule(parseCss(stylesSource), 'symbol-phrase'));
	assert.equal(phraseStyle.display, 'inline-block');
	assert.equal(phraseStyle['white-space'], 'nowrap');
}

function assertFooterLayout(stylesSource: string, markup = source): void {
	const styles = parseCss(stylesSource);
	const template = parseTemplate(markup);
	const footer = template.querySelector('.join-acknowledgement');
	assert.ok(footer, 'project acknowledgement footer must exist');
	assert.equal(footer.querySelectorAll('.join-ack-brand,.join-ack-copy,.join-ack-version').length, 3);
	assert.equal(declarations(baseRule(styles, 'join-acknowledgement'))['text-align'], 'center');
	assert.equal(declarations(baseRule(styles, 'join-ack-brand'))['justify-content'], 'center');
	assert.equal(declarations(baseRule(styles, 'join-ack-copy')).margin, '0 auto');
	assert.ok([undefined, 'center'].includes(declarations(baseRule(styles, 'join-ack-version'))['text-align']), 'version must inherit or specify centered text');
	const breaks = footer.querySelectorAll('.join-ack-copy > br.mobile-copy-break');
	assert.equal(breaks.length, 1, 'thanks must have exactly one mobile-only line break');
	assert.equal(breaks[0].previousElementSibling?.textContent, 'HataskeyはCherryPickのフォークで、CherryPickはMisskeyのフォークです。');
	assert.equal(breaks[0].nextElementSibling?.textContent, '両プロジェクトへ深く感謝します。', 'mobile break must be immediately before thanks');
	assert.equal(breaks[0].nextElementSibling.nextElementSibling?.tagName, 'BR', 'the existing final sentence break must remain');
	const breakRules: Rule[] = [];
	styles.walkRules(rule => {
		if (rule.selectors.includes(`${scope} .mobile-copy-break`)) breakRules.push(rule);
	});
	assert.equal(breakRules.length, 2, 'mobile break must have only its base and narrow-container display rules');
	const hiddenRule = breakRules.find(rule => conditions(rule).length === 0);
	const mobileRule = breakRules.find(rule => conditions(rule).length !== 0);
	assert.ok(hiddenRule && mobileRule);
	assert.equal(declarations(hiddenRule).display, 'none', 'desktop must not add the mobile break');
	assert.equal(declarations(mobileRule).display, 'block');
	assert.deepEqual(conditions(mobileRule).map(condition => ({ ...condition, params: condition.params.replace(/\s+/g, '') })), [
		{ name: 'container', params: 'hataskey-entrance(max-width:600px)' },
	], 'the thanks break must be limited to the 600px entrance container');
}

function changeBaseDeclaration(className: string, property: string, value: string): string {
	const styles = parseCss(css);
	const rule = baseRule(styles, className);
	let changed = false;
	rule.walkDecls(property, declaration => {
		declaration.value = value;
		changed = true;
	});
	assert.ok(changed, `positive control must change ${className}.${property}`);
	return styles.toString();
}

function assertDeviceControlsOnly(markup: string): void {
	const template = parseTemplate(markup);
	const controls = template.querySelector('#ui .device-mode-controls');
	assert.ok(controls, 'the preview device controls must remain');
	assert.equal(controls.children.length, 1, 'the removed demo helper must not remain beside the switch');
	assert.deepEqual(Array.from(controls.querySelectorAll('button'), button => button.getAttribute('data-dev')), ['pc', 'mobile']);
	assert.equal(template.querySelector('#ui textarea')?.getAttribute('placeholder'), 'これはデモです。試しに何か書いてみましょう。', 'the composer itself must keep its demo hint');
}

describe('welcome entrance source layout contracts', () => {
	test('削除した投稿案内を戻さず、端末切り替えと入力欄のヒントを残す', () => {
		assertDeviceControlsOnly(source);
	});

	test('陽性対照：端末切り替えの下に案内文を戻すと検出する', () => {
		const mutated = source.replace('<div class="device-mode-controls">', '<div class="device-mode-controls"><span>ノートを投稿してみてください。3秒カウントダウンも、新着の流れ込みも動きます</span>');
		expect(mutated).not.toBe(source);
		expect(() => assertDeviceControlsOnly(mutated)).toThrow('removed demo helper');
	});

	test('アイコンとカプセルを文字の行ボックスから分離し、全再生状態で文字寸法を保つ', () => {
		assertSymbolLayout(css);
	});

	test('Hatadyの四つの句を保ち、映画と「も。」を同じ改行不可の単位に置く', () => {
		assertHatadyPhrases(css);
	});

	test('末尾全体を中央揃えにし、感謝文直前だけ600px以下で改行する', () => {
		assertFooterLayout(css);
	});

	test.each([
		['旧inline-gridの復活', () => changeBaseDeclaration('symbol-swap', 'display', 'inline-grid')],
		['アイコンのインフロー化', () => changeBaseDeclaration('symbol-icon', 'position', 'static')],
		['カプセル図形のインフロー化', () => changeBaseDeclaration('symbol-capsule-form', 'position', 'static')],
		['文字の絶対配置', () => `${css}\n${scope} .symbol-text{position:absolute}`],
		['ハタキュ固有の高さの復活', () => `${css}\n${scope} .symbol-hatakyu{min-height:1.52em}`],
		['アイコン固有の最小幅の復活', () => `${css}\n${scope} .symbol-icon{min-width:1.18em}`],
		['完了時だけの行高変更', () => `${css}\n${scope} [data-symbol-state="done"] .symbol-text{line-height:1}`],
		['reduced-motionだけの高さ変更', () => `${css}\n@media(prefers-reduced-motion:reduce){${scope} .symbol-hatakyu{min-height:1em}}`],
	] as const)('陽性対照：%sを検出する', (_name, mutate) => {
		const mutated = mutate();
		expect(mutated).not.toBe(css);
		expect(() => assertSymbolLayout(mutated)).toThrow();
	});

	test('陽性対照：映画の「も。」を句の外へ出すと検出する', () => {
		const mutated = source.replace('data-symbol-last="">映画</span></span>も。</span>', 'data-symbol-last="">映画</span></span></span>も。');
		expect(mutated).not.toBe(source);
		expect(() => assertHatadyPhrases(css, mutated)).toThrow();
	});

	test('陽性対照：句の改行不可を外すと検出する', () => {
		expect(() => assertHatadyPhrases(changeBaseDeclaration('symbol-phrase', 'white-space', 'normal'))).toThrow();
	});

	test('陽性対照：末尾を左揃えへ戻すと検出する', () => {
		expect(() => assertFooterLayout(changeBaseDeclaration('join-acknowledgement', 'text-align', 'left'))).toThrow();
	});

	test('陽性対照：感謝文のモバイル改行を外すと検出する', () => {
		const mutated = source.replace('<br class="mobile-copy-break"><span data-en=" Thank you to both projects.">', '<span data-en=" Thank you to both projects.">');
		expect(mutated).not.toBe(source);
		expect(() => assertFooterLayout(css, mutated)).toThrow();
	});

	test('陽性対照：感謝文の改行を820pxまで広げると検出する', () => {
		const styles = parseCss(css);
		let changed = false;
		styles.walkRules(rule => {
			if (rule.selectors.includes(`${scope} .mobile-copy-break`) && rule.parent?.type === 'atrule') {
				(rule.parent as AtRule).params = 'hataskey-entrance (max-width:820px)';
				changed = true;
			}
		});
		expect(changed).toBe(true);
		expect(() => assertFooterLayout(styles.toString())).toThrow();
	});
});
