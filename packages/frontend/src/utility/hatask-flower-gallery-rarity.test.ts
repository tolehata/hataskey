/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, test, vi } from 'vitest';
import { createHataskGrowingFlower } from './hatask-flower-growth.js';
import { findHataskFlora, floraData, generateFlowerName, isRareHataskFlower, localizeFloraName } from './hatask-flora.js';

vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: vi.fn() }));
vi.mock('@/utility/intl-const.js', () => ({ versatileLang: 'ja-JP' }));

const page = readFileSync(`${process.cwd()}/src/pages/hatask.vue`, 'utf8');
const script = page.match(/<script lang="ts" setup>([\s\S]*?)<\/script>/u)![1];

// Execute the page's real handlers; only the dialog, Registry, and network boundaries are replaced.
function handler(name: string, bindings: Record<string, unknown>): (...args: unknown[]) => Promise<unknown> {
	const ast = ts.createSourceFile('hatask.ts', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
	if (!declaration) throw new Error(`Missing page handler: ${name}`);
	const source = declaration.getText(ast).replace('await import(\'@/components/MkDialog.vue\').then(module => module.default)', 'await loadInputDialog()');
	const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
	return new Function(...Object.keys(bindings), `${code}; return ${name};`)(...Object.values(bindings));
}

function fixture(growing: ReturnType<typeof createHataskGrowingFlower>) {
	const gallery = { value: [] as Record<string, unknown>[] };
	const flower = { value: growing };
	const rare = floraData.find(item => item.name === '流星花')!;
	const registrySet = vi.fn().mockResolvedValue(undefined);
	const syncFlowerGallery = vi.fn().mockResolvedValue(undefined);
	const inputText = vi.fn().mockResolvedValue({ canceled: false, result: '窓辺のお花' });
	const bindings = {
		flower, gallery, findHataskFlora, generateFlowerName, localizeFloraName,
		activeTab: { value: 'garden' }, hataskPageActive: true,
		flowerDataWritable: { value: true }, flowerDialogOpen: { value: false },
		createHataskGrowingFlower, pickRandomFlora: () => rare,
		generateId: () => 'harvested-id', registrySet, syncFlowerGallery,
		syncHataskFlowerCount: vi.fn().mockResolvedValue(undefined),
		copy: {}, inputFlowerName: inputText, os: { inputText, toast: vi.fn() },
	};
	const harvest = handler('harvestFlower', bindings);
	return { ...bindings, inputText, harvest, rename: handler('renameFlower', bindings), handleHarvest: handler('handleFlowerHarvest', { ...bindings, harvestFlower: harvest }) };
}

function inputFixture(activeTab = { value: 'garden' }) {
	let events: { done: (result: { canceled: boolean; result?: string }) => void; closed: () => void } | undefined;
	const dispose = vi.fn();
	const loadInputDialog = vi.fn().mockResolvedValue({});
	const popup = vi.fn((_component: unknown, _props: unknown, handlers: NonNullable<typeof events>) => {
		events = handlers;
		return { dispose };
	});
	return {
		activeTab, dispose, loadInputDialog, popup,
		input: handler('inputFlowerName', { activeTab, hataskPageActive: true, loadInputDialog, os: { popup } }),
		finish() {
			if (!events) throw new Error('Flower name dialog did not open');
			events.done({ canceled: false, result: '窓辺のお花' });
			events.closed();
		},
	};
}

const nameInputProps = { title: '収穫', text: '名前', default: 'お花', minLength: 1, maxLength: 80 };

describe('Hatask flower harvest and rarity integration', () => {
	test.each(['garden', 'eye'])('%s の収穫ボタンから名前入力を開き、満開の花だけを保存する', async tab => {
		const growing = createHataskGrowingFlower({ emoji: '☄️', name: '流星花', rare: true });
		const f = fixture({ ...growing, progress: 100, totalMinutes: growing.targetMinutes });
		f.activeTab.value = tab;
		const dialog = inputFixture(f.activeTab);
		f.inputText.mockImplementation(dialog.input);
		const operation = f.handleHarvest();
		await Promise.resolve();
		expect(dialog.popup).toHaveBeenCalledOnce();
		expect(f.flowerDialogOpen.value).toBe(true);
		dialog.finish();
		await operation;
		expect(f.gallery.value[0]).toMatchObject({ emoji: '☄️', name: '窓辺のお花' });
		expect(f.registrySet).toHaveBeenCalledTimes(2);
		expect(f.flowerDialogOpen.value).toBe(false);
		expect(page).toContain('@click="handleFlowerHarvest">{{copy.harvestFlower}}');
	});

	test.each(['home', 'todo'])('%s からは収穫用の名前入力を開かない', async tab => {
		const f = inputFixture({ value: tab });
		await expect(f.input(nameInputProps)).resolves.toEqual({ canceled: true });
		expect(f.loadInputDialog).not.toHaveBeenCalled();
		expect(f.popup).not.toHaveBeenCalled();
	});

	test('入力部品の読込中や名前入力中にタブが変わったら収穫を取り消す', async () => {
		const loading = inputFixture({ value: 'eye' });
		const beforeOpen = loading.input(nameInputProps);
		loading.activeTab.value = 'garden';
		await expect(beforeOpen).resolves.toEqual({ canceled: true });
		expect(loading.popup).not.toHaveBeenCalled();
		const opened = inputFixture({ value: 'eye' });
		const beforeClose = opened.input(nameInputProps);
		await Promise.resolve();
		expect(opened.popup).toHaveBeenCalledOnce();
		opened.activeTab.value = 'garden';
		opened.finish();
		await expect(beforeClose).resolves.toEqual({ canceled: true });
		expect(opened.dispose).toHaveBeenCalledOnce();
	});

	test('名前入力中に育成中の花が差し替わったら新しい花を収穫しない', async () => {
		const f = fixture(createHataskGrowingFlower({ emoji: '☄️', name: '流星花', now: 1000, rare: true }));
		const operation = f.harvest();
		const replacement = createHataskGrowingFlower({ emoji: '💎', name: '宝石フラワー', now: 2000, rare: true });
		f.flower.value = replacement;
		await operation;
		expect(f.flower.value).toBe(replacement);
		expect(f.gallery.value).toEqual([]);
		expect(f.registrySet).not.toHaveBeenCalled();
	});

	test.each(['loading', 'dialog', 'growing'] as const)('%s の間は Eye の収穫ボタンから二重操作しない', async state => {
		const growing = createHataskGrowingFlower({ emoji: '☄️', name: '流星花', rare: true });
		const f = fixture({ ...growing, progress: state === 'growing' ? 99 : 100 });
		f.activeTab.value = 'eye';
		f.flowerDataWritable.value = state !== 'loading';
		f.flowerDialogOpen.value = state === 'dialog';
		await f.handleHarvest();
		expect(f.inputText).not.toHaveBeenCalled();
		expect(f.registrySet).not.toHaveBeenCalled();
	});

	test('品種IDを持つ花は収穫・改名後も同じ品種として保存し、次のレア花を長時間で育てる', async () => {
		const species = floraData.find(item => item.speciesId != null)!;
		const f = fixture(createHataskGrowingFlower({ emoji: species.emoji, name: generateFlowerName(species), speciesId: species.speciesId }));
		await f.harvest();
		expect(f.gallery.value[0]).toMatchObject({ speciesId: species.speciesId, name: '窓辺のお花' });
		expect(findHataskFlora(f.gallery.value[0])).toBe(species);
		expect(f.flower.value).toMatchObject({ emoji: '☄️', rare: true });
		expect(f.flower.value.targetMinutes).toBeGreaterThanOrEqual(2880);
		expect(f.flower.value.targetMinutes).toBeLessThanOrEqual(5760);
		expect(f.registrySet).toHaveBeenCalledWith('gallery', f.gallery.value);
		expect(f.registrySet).toHaveBeenCalledWith('flower', f.flower.value);
		f.inputText.mockResolvedValueOnce({ canceled: false, result: '大切な一輪' });
		await f.rename(f.gallery.value[0]);
		expect(f.gallery.value[0]).toMatchObject({ speciesId: species.speciesId, name: '大切な一輪' });
		expect(f.syncFlowerGallery).toHaveBeenLastCalledWith([f.gallery.value[0]]);
	});

	test('同じ絵文字の旧品種を先頭一致で別の花にせず、確定できない花言葉は補わない', async () => {
		const f = fixture(createHataskGrowingFlower({ emoji: '🌸', name: '利用者がつけた名前' }));
		await f.harvest();
		expect(f.gallery.value[0].hanakotoba).toBe('');
		expect(f.gallery.value[0]).not.toHaveProperty('speciesId');
	});

	test('収穫ダイアログを取り消すと育成中の花とギャラリーを保存し直さない', async () => {
		const initial = createHataskGrowingFlower({ emoji: '☄️', name: '流星花', rare: true });
		const f = fixture(initial);
		f.inputText.mockResolvedValueOnce({ canceled: true, result: '' });
		await f.harvest();
		expect(f.flower.value).toBe(initial);
		expect(f.gallery.value).toEqual([]);
		expect(f.registrySet).not.toHaveBeenCalled();
	});

	test('改名を保存できない場合は元の表示名と品種を維持する', async () => {
		const f = fixture(createHataskGrowingFlower({ emoji: '☄️', name: '流星花', rare: true }));
		await f.harvest();
		const original = { ...f.gallery.value[0] };
		f.registrySet.mockRejectedValueOnce(new Error('offline'));
		f.inputText.mockResolvedValueOnce({ canceled: false, result: '保存できない名前' });
		await expect(f.rename(f.gallery.value[0])).rejects.toThrow('offline');
		expect(f.gallery.value[0]).toEqual(original);
		expect(f.syncFlowerGallery).toHaveBeenCalledTimes(1);
	});

	test('改名済みの取得済みレア花も、みんなのお花と同じ判定で枠を表示できる', () => {
		const oldRare = { emoji: '💎', name: '大切な思い出' };
		expect(isRareHataskFlower(oldRare)).toBe(true);
		expect(isRareHataskFlower({ emoji: '🌼', name: '宝石フラワー' })).toBe(false);
	});
});
