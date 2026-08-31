/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { load } from 'js-yaml';

const page = readFileSync(resolve(process.cwd(), 'src/pages/hatask.vue'), 'utf8');
const journal = readFileSync(resolve(process.cwd(), 'src/components/hatask/HataskJournal.vue'), 'utf8');

describe('Hatask journal integration', () => {
	test('カレンダー・Todoの入力欄は共通の1アイコンで呼び出しと保存につながる', () => {
		const captures = Array.from(page.matchAll(/<HataskQuickCapture\b[\s\S]*?\/>/gu), match => match[0]);
		expect(captures).toHaveLength(2);
		for (const kind of ['event', 'todo']) {
			const capture = captures.find(source => source.includes(`mode="${kind}"`));
			expect(capture).toContain(':templateLabel="plannerCopy.templateLibrary"');
			expect(capture).toContain(`@template="openPlannerCaptureTemplates('${kind}', $event)"`);
		}
		const menu = page.slice(page.indexOf('function openPlannerCaptureTemplates('), page.indexOf('const plannerTemplateLabels='));
		expect(menu).toContain('templateKindFilter.value = \'todo\'');
		expect(menu).toContain('plannerTodoView.value = \'templates\'');
		expect(menu).toContain('showEventTemplates.value = true');
		expect(menu).toContain('kind === \'todo\' ? saveTodoCaptureAsTemplate() : saveEventCaptureAsTemplate()');
		const eventTools = page.slice(page.indexOf('const eventCaptureTools='), page.indexOf('function removeEventCaptureChip('));
		const todoTools = page.slice(page.indexOf('const todoCaptureTools='), page.indexOf('function plannerTodoPriorityLabel('));
		expect(eventTools + todoTools).not.toContain('showLabel:true');
		expect(eventTools + todoTools).not.toContain('ti ti-template');
	});
	test('既存Registryキーを維持し、取得失敗・非配列データへの上書きを防止する', () => {
		expect(page).toContain('dataLoaded.value && loadedKeys.has(key) && journalValidKeys.value.includes(key)');
		expect(page).toContain('loadedKeys.has(\'moods\') && Array.isArray(loadResults[2].value)');
		expect(page).toContain('loadedKeys.has(\'meals\') && Array.isArray(loadResults[7].value)');
		expect(page).toContain('loadedKeys.has(HATASK_MEAL_TEMPLATE_KEY) && Array.isArray(loadResults[8].value)');
		expect(page).toContain('target.value = await persistJournalChange(target.value, change, next => registrySet(key, next))');
		expect(page).toContain(':entries="moodJournalRows"');
		expect(page).toContain(':entries="mealJournalRows"');
		expect(page).toContain('(m.note ?? \'\').toLowerCase()');
	});
	test('モバイル・小窓でもタブ切り替えで書きかけをアンマウントしない', () => {
		expect(page).toContain('v-show="activeTab===\'mood\'" class="htk-tabpage htk-journal-page"');
		expect(page).toContain('v-show="activeTab===\'meal\'" class="htk-tabpage htk-journal-page"');
		expect(journal).toContain('container-type: inline-size');
		expect(journal).toContain('@container (max-width: 560px)');
		expect(journal).toContain('box-sizing: border-box; width: 100%; min-width: 0; min-height: 44px; max-width: 100%');
		expect(journal).toContain('.root[data-motion=\'false\']');
		expect(journal).toContain('@media (prefers-reduced-motion: reduce)');
		expect(journal).not.toContain('translateY(');
	});
	test('新しい文言は日本語・英語・簡体字で同じキーを持つ', () => {
		const dictionaries = ['ja-JP', 'en-US', 'zh-CN'].map(language => {
			const locale = load(readFileSync(resolve(process.cwd(), `../../locales/${language}.yml`), 'utf8')) as { _hata: { _hatask: { _journal: Record<string, string> } } };
			return locale._hata._hatask._journal;
		});
		expect(Object.keys(dictionaries[0]).length).toBeGreaterThan(30);
		for (const dictionary of dictionaries) {
			expect(Object.keys(dictionary).sort()).toEqual(Object.keys(dictionaries[0]).sort());
			expect(Object.values(dictionary).every(value => value.trim().length > 0)).toBe(true);
		}
	});

	const getTokens = (theme: string, dark: boolean): Record<string, string> => {
		const selector = `.htk-root[data-theme="${theme}"]${dark ? '[data-mode="dark"]' : ''},.htk-modal-ov[data-theme="${theme}"]${dark ? '[data-mode="dark"]' : ''}{`;
		const start = page.indexOf(selector);
		if (start < 0) throw new Error(`Missing theme ${theme} ${dark}`);
		const block = page.slice(start + selector.length, page.indexOf('}', start));
		return Object.fromEntries(Array.from(block.matchAll(/--([\w-]+):\s*([^;]+);/gu), match => [match[1], match[2].trim()]));
	};
	const resolveColor = (name: string, tokens: Record<string, string>): string => {
		const value = tokens[name];
		if (!value) throw new Error(`Missing token: ${name}`);
		return value.startsWith('var(--') ? resolveColor(value.slice(6, -1), tokens) : value;
	};
	const luminance = (color: string): number => {
		const hex = color.length === 4 ? '#' + Array.from(color.slice(1)).map(char => char + char).join('') : color;
		if (!/^#[0-9a-f]{6}$/iu.test(hex)) throw new Error(`Unsupported color ${color}`);
		const values = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
		return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
	};
	for (const theme of ['kisetsu', 'kashin', 'suri', 'hatakyu']) {
		for (const dark of [false, true]) {
			test(`${theme} ${dark ? 'dark' : 'light'} の通常ラベルと選択ラベルのトークン比率を確認する`, () => {
				const tokens = { 'on-accent': '#fff', ...getTokens(theme, false), ...(dark ? getTokens(theme, true) : {}) };
				for (const [foreground, background] of [['fg-2', 'surface'], ['on-accent', 'accent']]) {
					const fg = luminance(resolveColor(foreground, tokens)); const bg = luminance(resolveColor(background, tokens));
					expect((Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05)).toBeGreaterThanOrEqual(4.5);
				}
			});
		}
	}
});
