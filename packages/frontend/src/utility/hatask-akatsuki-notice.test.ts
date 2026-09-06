/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { parse } from '@vue/compiler-sfc';
import * as ts from 'typescript';
import { computed, ref } from 'vue';
import { describe, expect, test, vi } from 'vitest';
import type { ComputedRef, Ref } from 'vue';

const filename = 'src/pages/hatask.vue';
const descriptor = parse(readFileSync(resolve(process.cwd(), filename), 'utf8'), { filename }).descriptor;
if (!descriptor.scriptSetup) throw new Error('Missing Hatask script setup');
const page = ts.createSourceFile(filename + '.ts', descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

function functionNode(name: string): ts.FunctionDeclaration & { body: ts.Block } {
	const node = page.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === name);
	if (!node || !ts.isFunctionDeclaration(node) || !node.body) throw new Error(`Missing function: ${name}`);
	return node as ts.FunctionDeclaration & { body: ts.Block };
}

function declaration(name: string, statements: ts.NodeArray<ts.Statement> = page.statements): string {
	for (const statement of statements) {
		if (!ts.isVariableStatement(statement)) continue;
		const node = statement.declarationList.declarations.find(item => ts.isIdentifier(item.name) && item.name.text === name);
		if (node) return `${statement.declarationList.flags & ts.NodeFlags.Const ? 'const' : 'let'} ${node.getText(page)};`;
	}
	throw new Error(`Missing variable: ${name}`);
}

function lifecycle(name: string): ts.Block {
	const statement = page.statements.find(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText(page) === name);
	if (!statement || !ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) throw new Error(`Missing lifecycle: ${name}`);
	const callback = statement.expression.arguments.at(0);
	if (!callback || !ts.isArrowFunction(callback) || !ts.isBlock(callback.body)) throw new Error(`Missing lifecycle callback: ${name}`);
	return callback.body;
}

function statementMatching(statements: ts.NodeArray<ts.Statement>, pattern: RegExp): ts.Statement {
	const matches = statements.filter(statement => pattern.test(statement.getText(page)));
	if (matches.length !== 1) throw new Error(`Expected one source statement for ${pattern}, found ${matches.length}`);
	return matches[0];
}

const mountBody = lifecycle('onMounted');
const mountSettingsStatements = [
	declaration('defaultSettings', mountBody.statements),
	declaration('loadResults', mountBody.statements),
	statementMatching(mountBody.statements, /^if \(loadResults\[5\]/u).getText(page),
	statementMatching(mountBody.statements, /^settings\.value = \{ \.\.\.defaultSettings,/u).getText(page),
	statementMatching(mountBody.statements, /^hataskIntroductionReady = true;/u).getText(page),
	statementMatching(mountBody.statements, /^showHataskIntroduction\(\);$/u).getText(page),
];

function sourceFunctions(removeReadGuard = false): string {
	return ['registryGet', 'registrySet', 'saveSettings', 'acceptLoadedHataskSettings', 'chooseAkatsukiNotice', 'showHataskIntroduction', 'closeHataskIntroduction', 'startTutFromTheme', 'skipTutTheme', 'cleanupHataskState'].map(name => {
		const node = functionNode(name);
		if (!removeReadGuard || name !== 'showHataskIntroduction') return node.getText(page);
		const guard = node.body.statements[0];
		if (!ts.isIfStatement(guard) || !guard.expression.getText(page).includes('!loadedKeys.has(\'settings\')')) throw new Error('Missing read guard for positive control');
		// Remove the actual first guard to demonstrate that a failed read would otherwise open onboarding.
		const body = ts.factory.updateBlock(node.body, node.body.statements.filter(statement => statement !== guard));
		const mutant = ts.factory.updateFunctionDeclaration(node, node.modifiers, node.asteriskToken, node.name, node.typeParameters, node.parameters, node.type, body);
		return ts.createPrinter().printNode(ts.EmitHint.Unspecified, mutant, page);
	}).join('\n');
}

type Settings = Record<string, unknown>;
type PopupProps = {
	active: ComputedRef<boolean>;
	animation: ComputedRef<boolean>;
	mode: Ref<string>;
	ownerActive: Ref<boolean>;
	onChoose: (apply: boolean) => Promise<boolean>;
};
type State = {
	settings: Ref<Settings>;
	loadedKeys: Set<string>;
	showTutorial: Ref<boolean>;
	showTutTheme: Ref<boolean>;
	tutThemeStandalone: Ref<boolean>;
	tutStep: Ref<number>;
	tutThemes: ComputedRef<Array<{ id: string }>>;
	owner: Ref<boolean> | null;
	active: boolean;
	ready: boolean;
	saving: boolean;
	handled: boolean;
	loadFromMount: () => Promise<void>;
	activate: () => void;
	deactivate: () => void;
	unmount: () => void;
	acceptLoadedHataskSettings: (value: unknown) => boolean;
	chooseAkatsukiNotice: (apply: boolean) => Promise<boolean>;
	showHataskIntroduction: () => void;
	closeHataskIntroduction: () => void;
	startTutFromTheme: () => void;
	skipTutTheme: () => void;
};

function deferred<T>() {
	let succeed: (value: T) => void = () => { throw new Error('Deferred promise not initialized'); };
	let fail: (reason: unknown) => void = () => { throw new Error('Deferred promise not initialized'); };
	const promise = new Promise<T>((resolveValue, rejectValue) => { succeed = resolveValue; fail = rejectValue; });
	return { promise, succeed, fail };
}

function fixture(options: { settings?: unknown; removeReadGuard?: boolean } = {}) {
	const saved = { theme: 'kisetsu', tutorialDone: true, v2Onboarded: true, animations: true, akatsukiNoticeShown: false, hatakyuNoticeShown: false, customPreference: { keep: ['saved'] } };
	const readSettings = vi.fn(async (): Promise<unknown> => Object.hasOwn(options, 'settings') ? options.settings : saved);
	const writeSettings = vi.fn(async (_value: unknown): Promise<void> => undefined);
	const misskeyApi = vi.fn(async (endpoint: string, params: { key: string; scope: string[]; value?: unknown }) => {
		if (endpoint === 'i/registry/get') return params.key === 'settings' ? readSettings() : undefined;
		if (endpoint === 'i/registry/set' && params.key === 'settings') return writeSettings(params.value);
		throw new Error(`Unexpected API: ${endpoint}/${params.key}`);
	});
	const popups: Array<{ component: unknown; props: PopupProps; events: { closed: () => void }; dispose: ReturnType<typeof vi.fn> }> = [];
	const popup = vi.fn((component: unknown, props: PopupProps, events: { closed: () => void }) => {
		const dispose = vi.fn();
		popups.push({ component, props, events, dispose });
		return { dispose };
	});
	const toast = vi.fn();
	const playBoot = vi.fn();
	const pendingTicks: Array<() => unknown> = [];
	const nextTick = vi.fn((callback: () => unknown) => { pendingTicks.push(callback); return Promise.resolve(); });
	const prefer = { r: { animation: ref(true) } };
	const themeMode = ref('light');
	const noticeComponent = Symbol('HataskAkatsukiNotice');
	const variables = ['SCOPE', 'loadedKeys', 'settings', 'hataskPageActive', 'hataskIntroductionReady', 'akatsukiNoticeHandled', 'akatsukiNoticeSaving', 'akatsukiNoticeOwner', 'showTutorial', 'showTutTheme', 'tutThemeStandalone', 'tutStep', 'tutThemes', 'isAkatsuki'].map(name => declaration(name)).join('\n');
	// Execute the actual relevant mount/activation statements, leaving unrelated clocks, flowers and network subscriptions outside this fixture.
	const activation = lifecycle('onActivated').statements.slice(0, 2).map(statement => statement.getText(page)).join('\n');
	const code = `${variables}\n${sourceFunctions(options.removeReadGuard)}
	async function loadFromMount() { ${mountSettingsStatements.join('\n')} }
	function activate() { ${activation} }
	function deactivate() { ${lifecycle('onDeactivated').statements.map(statement => statement.getText(page)).join('\n')} }
	function unmount() { ${lifecycle('onBeforeUnmount').statements.map(statement => statement.getText(page)).join('\n')} }
	({ settings, loadedKeys, showTutorial, showTutTheme, tutThemeStandalone, tutStep, tutThemes,
		get owner() { return akatsukiNoticeOwner; }, get active() { return hataskPageActive; },
		get ready() { return hataskIntroductionReady; }, get saving() { return akatsukiNoticeSaving; }, get handled() { return akatsukiNoticeHandled; },
		loadFromMount, activate, deactivate, unmount, acceptLoadedHataskSettings, chooseAkatsukiNotice, showHataskIntroduction, closeHataskIntroduction, startTutFromTheme, skipTutTheme });`;
	const compiled = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } });
	const state = runInNewContext(compiled.outputText, {
		ref, computed, nextTick, prefer, themeMode, misskeyApi, HataskAkatsukiNotice: noticeComponent,
		isPlannerCollectionKey: () => false, defaultFlower: {}, HATASK_MEAL_TEMPLATE_KEY: 'meal-templates',
		copy: { themeSet: 'テーマを設定しました' },
		i18n: { ts: { _hata: { _hatask: { _settings: {}, _akatsukiNotice: { applied: '暁を適用しました' } } } } },
		os: { popup, toast }, playBoot,
		closeEventDetail: vi.fn(), closeBlankCalendarActions: vi.fn(), hatakMascotActive: ref(true), stopMascotCardRotation: vi.fn(), hkStopWind: vi.fn(),
		hfTimer: null, eqPollTimer: null, eqStream: null, showMobileNav: ref(true), navProtectionObserver: null, navVisibilityTimer: null,
		['document']: { body: { dataset: {} }, querySelectorAll: () => [] },
	}, { timeout: 1000 }) as State;

	async function flushTicks() {
		for (let iteration = 0; pendingTicks.length > 0; iteration++) {
			if (iteration > 20) throw new Error('Unbounded introduction requeue');
			for (const callback of pendingTicks.splice(0)) await callback();
		}
	}

	return { state, readSettings, writeSettings, misskeyApi, popups, popup, toast, playBoot, prefer, themeMode, noticeComponent, flushTicks };
}

describe('Hatask暁の案内と設定読込', () => {
	test('読込成功と準備完了を待って、既存設定を保持した案内を一つだけ開く', async () => {
		const current = fixture();
		current.state.showHataskIntroduction();
		expect(current.popup).not.toHaveBeenCalled();
		await current.state.loadFromMount();
		expect(current.state.ready).toBe(true);
		expect(current.state.loadedKeys.has('settings')).toBe(true);
		expect(current.state.settings.value).toMatchObject({ theme: 'kisetsu', customPreference: { keep: ['saved'] } });
		expect(current.popups).toHaveLength(1);
		expect(current.popups[0].component).toBe(current.noticeComponent);
		expect(current.popups[0].props.onChoose).toBe(current.state.chooseAkatsukiNotice);
		expect(current.popups[0].props.ownerActive).toBe(current.state.owner);
		expect(current.popups[0].props.mode).toBe(current.themeMode);
		expect(current.popups[0].props.active.value).toBe(false);
		current.state.showHataskIntroduction();
		expect(current.popups).toHaveLength(1);
		expect(current.writeSettings).not.toHaveBeenCalled();
	});

	test('通信失敗の既定値を成功扱いせず、案内・オンボード・保存を止める（陽性対照付き）', async () => {
		for (const removeReadGuard of [true, false]) {
			const current = fixture({ removeReadGuard });
			current.readSettings.mockRejectedValue(new Error('offline'));
			await current.state.loadFromMount();
			expect(current.state.loadedKeys.has('settings')).toBe(false);
			expect(current.state.showTutTheme.value).toBe(removeReadGuard);
			expect(current.popup).not.toHaveBeenCalled();
			await expect(current.state.chooseAkatsukiNotice(true)).resolves.toBe(false);
			expect(current.writeSettings).not.toHaveBeenCalled();
		}
	});

	test.each([null, undefined, [], 'broken', 1, false].map(value => ({ value })))('不正な読込値 $value はsettingsを置換せず書込み権限を取り消す', ({ value }) => {
		const { state, writeSettings } = fixture();
		const before = state.settings.value;
		state.loadedKeys.add('settings');
		expect(state.acceptLoadedHataskSettings(value)).toBe(false);
		expect(state.settings.value).toBe(before);
		expect(state.loadedKeys.has('settings')).toBe(false);
		expect(writeSettings).not.toHaveBeenCalled();
	});

	test.each([null, []].map(settings => ({ settings })))('読込成功印がない値を拒否し、実registryGetから$settingsを受けても案内を出さない', async ({ settings }) => {
		const current = fixture({ settings });
		expect(current.state.acceptLoadedHataskSettings({ theme: 'suri' })).toBe(false);
		await current.state.loadFromMount();
		expect(current.state.loadedKeys.has('settings')).toBe(false);
		expect(current.popup).not.toHaveBeenCalled();
		expect(current.state.showTutTheme.value).toBe(false);
		await expect(current.state.chooseAkatsukiNotice(false)).resolves.toBe(false);
		expect(current.writeSettings).not.toHaveBeenCalled();
	});

	test('NO_SUCH_KEYは新規利用の正常な既定値としてテーマ選択だけを出す', async () => {
		const current = fixture();
		current.readSettings.mockRejectedValue({ code: 'NO_SUCH_KEY' });
		await current.state.loadFromMount();
		expect(current.state.loadedKeys.has('settings')).toBe(true);
		expect(current.state.settings.value.theme).toBe('akatsuki');
		expect(current.state.showTutTheme.value).toBe(true);
		expect(current.state.tutThemeStandalone.value).toBe(false);
		expect(current.popup).not.toHaveBeenCalled();
		expect(current.writeSettings).not.toHaveBeenCalled();
	});

	test.each([
		{ tutorialDone: false, v2Onboarded: false, standalone: false },
		{ tutorialDone: true, v2Onboarded: false, standalone: true },
	])('未導入の場合は既存テーマ選択を優先する（standalone=$standalone）', async ({ tutorialDone, v2Onboarded, standalone }) => {
		const current = fixture({ settings: { theme: 'kashin', tutorialDone, v2Onboarded } });
		await current.state.loadFromMount();
		expect(current.state.showTutTheme.value).toBe(true);
		expect(current.state.tutThemeStandalone.value).toBe(standalone);
		expect(current.popup).not.toHaveBeenCalled();
		current.state.startTutFromTheme();
		expect(current.state.settings.value).toMatchObject({ theme: 'kashin', v2Onboarded: true, akatsukiNoticeShown: true, hatakyuNoticeShown: true });
		expect(current.state.showTutorial.value).toBe(!standalone);
		expect(current.state.showTutTheme.value).toBe(false);
		current.state.showHataskIntroduction();
		expect(current.popup).not.toHaveBeenCalled();
	});

	test('導入スキップでも既存テーマを保ち、暁の二重案内を抑止する', async () => {
		const current = fixture({ settings: { theme: 'hatakyu', tutorialDone: false } });
		await current.state.loadFromMount();
		current.state.skipTutTheme();
		expect(current.state.settings.value).toMatchObject({ theme: 'hatakyu', tutorialDone: true, v2Onboarded: true, akatsukiNoticeShown: true, hatakyuNoticeShown: true });
		expect(current.state.showTutTheme.value).toBe(false);
		expect(current.state.showTutorial.value).toBe(false);
		current.state.showHataskIntroduction();
		expect(current.popup).not.toHaveBeenCalled();
	});

	test('既読と表示中チュートリアルを尊重し、設定済みの5テーマを残す', async () => {
		const themes = ['akatsuki', 'kisetsu', 'kashin', 'suri', 'hatakyu'];
		for (const theme of themes) {
			const current = fixture({ settings: { theme, tutorialDone: true, v2Onboarded: true, akatsukiNoticeShown: true } });
			await current.state.loadFromMount();
			expect(current.state.settings.value.theme).toBe(theme);
			expect(current.state.tutThemes.value.map(item => item.id)).toEqual(themes);
			expect(current.popup).not.toHaveBeenCalled();
			current.state.settings.value.akatsukiNoticeShown = false;
			current.state.showTutorial.value = true;
			current.state.showHataskIntroduction();
			expect(current.popup).not.toHaveBeenCalled();
		}
	});

	test('案内へ渡す明暗・動き設定は本体と連動する', async () => {
		const current = fixture();
		await current.state.loadFromMount();
		const props = current.popups[0].props;
		expect(props.animation.value).toBe(true);
		current.prefer.r.animation.value = false;
		expect(props.animation.value).toBe(false);
		current.prefer.r.animation.value = true;
		current.state.settings.value.animations = false;
		expect(props.animation.value).toBe(false);
		current.themeMode.value = 'dark';
		expect(props.mode.value).toBe('dark');
	});
});

describe('暁の選択保存と独立popupの寿命', () => {
	test('保存成功まではテーマ・既読を変えず、連打を止めてから適用する', async () => {
		const current = fixture();
		await current.state.loadFromMount();
		const pending = deferred<void>();
		current.writeSettings.mockReturnValueOnce(pending.promise);
		const before = current.state.settings.value;
		const result = current.state.chooseAkatsukiNotice(true);
		expect(current.state.saving).toBe(true);
		expect(current.state.settings.value).toBe(before);
		expect(current.state.settings.value).toMatchObject({ theme: 'kisetsu', akatsukiNoticeShown: false });
		expect(current.writeSettings).toHaveBeenCalledWith({ ...before, theme: 'akatsuki', akatsukiNoticeShown: true, hatakyuNoticeShown: true });
		await expect(current.state.chooseAkatsukiNotice(false)).resolves.toBe(false);
		await expect(current.state.chooseAkatsukiNotice(true)).resolves.toBe(false);
		expect(current.writeSettings).toHaveBeenCalledTimes(1);
		expect(current.playBoot).not.toHaveBeenCalled();
		pending.succeed();
		await expect(result).resolves.toBe(true);
		expect(current.state.saving).toBe(false);
		expect(current.state.settings.value).toMatchObject({ theme: 'akatsuki', akatsukiNoticeShown: true, customPreference: { keep: ['saved'] } });
		expect(current.playBoot).toHaveBeenCalledTimes(1);
		expect(current.toast).toHaveBeenCalledWith('暁を適用しました');
		current.popups[0].events.closed();
		expect(current.popups[0].dispose).toHaveBeenCalledTimes(1);
		expect(current.state.owner).toBeNull();
		current.state.showHataskIntroduction();
		expect(current.popups).toHaveLength(1);
	});

	test('適用失敗で既読にせず同じ案内から再試行できる', async () => {
		const current = fixture();
		await current.state.loadFromMount();
		current.writeSettings.mockRejectedValueOnce(new Error('offline'));
		await expect(current.state.chooseAkatsukiNotice(true)).resolves.toBe(false);
		expect(current.state.settings.value).toMatchObject({ theme: 'kisetsu', akatsukiNoticeShown: false });
		expect(current.state.handled).toBe(false);
		expect(current.state.saving).toBe(false);
		expect(current.popups[0].dispose).not.toHaveBeenCalled();
		await expect(current.state.chooseAkatsukiNotice(true)).resolves.toBe(true);
		expect(current.writeSettings).toHaveBeenCalledTimes(2);
		expect(current.playBoot).toHaveBeenCalledTimes(1);
	});

	test('今のテーマを維持する選択は保存失敗でも閉鎖を妨げず、この滞在中は再表示しない', async () => {
		const current = fixture();
		await current.state.loadFromMount();
		current.writeSettings.mockRejectedValueOnce(new Error('offline'));
		await expect(current.state.chooseAkatsukiNotice(false)).resolves.toBe(false);
		expect(current.state.settings.value).toMatchObject({ theme: 'kisetsu', akatsukiNoticeShown: false });
		expect(current.state.handled).toBe(true);
		expect(current.state.saving).toBe(false);
		current.popups[0].events.closed();
		expect(current.popups[0].dispose).toHaveBeenCalledTimes(1);
		expect(current.state.owner).toBeNull();
		current.state.showHataskIntroduction();
		current.state.deactivate();
		current.state.activate();
		await current.flushTicks();
		expect(current.popups).toHaveLength(1);
		expect(current.playBoot).not.toHaveBeenCalled();
	});

	test('今のテーマを維持する保存では5テーマと独自設定を一切変えない', async () => {
		for (const theme of ['akatsuki', 'kisetsu', 'kashin', 'suri', 'hatakyu']) {
			const current = fixture({ settings: { theme, tutorialDone: true, v2Onboarded: true, customPreference: { saved: true } } });
			await current.state.loadFromMount();
			const before = current.state.settings.value;
			await expect(current.state.chooseAkatsukiNotice(false)).resolves.toBe(true);
			expect(current.writeSettings).toHaveBeenCalledWith({ ...before, akatsukiNoticeShown: true, hatakyuNoticeShown: true });
			expect(current.state.settings.value).toMatchObject({ theme, akatsukiNoticeShown: true, customPreference: { saved: true } });
			expect(current.misskeyApi).toHaveBeenLastCalledWith('i/registry/set', { key: 'settings', value: current.state.settings.value, scope: ['client', 'hatask'] });
			expect(current.playBoot).not.toHaveBeenCalled();
			expect(current.toast).not.toHaveBeenCalled();
		}
	});

	test('暁が選択済みなら既読だけを保存し、不要な再起動演出を出さない', async () => {
		const current = fixture({ settings: { theme: 'akatsuki', tutorialDone: true, v2Onboarded: true } });
		await current.state.loadFromMount();
		expect(current.popups[0].props.active.value).toBe(true);
		await expect(current.state.chooseAkatsukiNotice(true)).resolves.toBe(true);
		expect(current.state.settings.value.akatsukiNoticeShown).toBe(true);
		expect(current.playBoot).not.toHaveBeenCalled();
		expect(current.toast).not.toHaveBeenCalled();
	});

	test('読み込み中に離脱した場合は完了後も案内を開かず、復帰後に開く', async () => {
		const current = fixture();
		const read = deferred<unknown>();
		current.readSettings.mockReturnValueOnce(read.promise);
		const loading = current.state.loadFromMount();
		current.state.deactivate();
		read.succeed({ theme: 'suri', tutorialDone: true, v2Onboarded: true });
		await loading;
		expect(current.state.ready).toBe(true);
		expect(current.state.active).toBe(false);
		expect(current.popup).not.toHaveBeenCalled();
		current.state.activate();
		expect(current.popups).toHaveLength(1);
		expect(current.state.settings.value.theme).toBe('suri');
	});

	test('急なKeepAlive復帰は退場中popupのclosedまで待ち、新しいownerへ引き継ぐ', async () => {
		const current = fixture();
		await current.state.loadFromMount();
		const first = current.popups[0];
		current.state.deactivate();
		expect(first.props.ownerActive.value).toBe(false);
		expect(first.dispose).not.toHaveBeenCalled();
		await expect(current.state.chooseAkatsukiNotice(true)).resolves.toBe(false);
		current.state.activate();
		expect(current.popups).toHaveLength(1);
		first.events.closed();
		expect(first.dispose).toHaveBeenCalledTimes(1);
		expect(current.state.owner).toBeNull();
		await current.flushTicks();
		expect(current.popups).toHaveLength(2);
		expect(current.popups[1].props.ownerActive).not.toBe(first.props.ownerActive);
		expect(current.popups[1].props.ownerActive.value).toBe(true);
		expect(first.props.ownerActive.value).toBe(false);
	});

	test.each([true, false])('離脱後に保存が完了しても演出せず、保存成功=%sに従って復帰時の案内を決める', async success => {
		const current = fixture();
		await current.state.loadFromMount();
		const pending = deferred<void>();
		current.writeSettings.mockReturnValueOnce(pending.promise);
		const result = current.state.chooseAkatsukiNotice(true);
		current.state.deactivate();
		current.popups[0].events.closed();
		if (success) pending.succeed();
		else pending.fail(new Error('offline'));
		await expect(result).resolves.toBe(success);
		expect(current.playBoot).not.toHaveBeenCalled();
		expect(current.toast).not.toHaveBeenCalled();
		expect(current.state.settings.value.theme).toBe(success ? 'akatsuki' : 'kisetsu');
		current.state.activate();
		await current.flushTicks();
		expect(current.popups).toHaveLength(success ? 1 : 2);
	});

	test.each([true, false])('保存待ちの急復帰では再表示を抑え、完了後だけ再判定する（成功=%s）', async success => {
		const current = fixture();
		await current.state.loadFromMount();
		const pending = deferred<void>();
		current.writeSettings.mockReturnValueOnce(pending.promise);
		const result = current.state.chooseAkatsukiNotice(true);
		current.state.deactivate();
		current.popups[0].events.closed();
		current.state.activate();
		await current.flushTicks();
		expect(current.state.saving).toBe(true);
		expect(current.popups).toHaveLength(1);
		if (success) pending.succeed();
		else pending.fail(new Error('offline'));
		await expect(result).resolves.toBe(success);
		await current.flushTicks();
		expect(current.popups).toHaveLength(success ? 1 : 2);
		expect(current.playBoot).not.toHaveBeenCalled();
		expect(current.toast).not.toHaveBeenCalled();
	});

	test('本体unmountはownerだけを無効化し、閉鎖完了時にpopupをdisposeする', async () => {
		const current = fixture();
		await current.state.loadFromMount();
		const first = current.popups[0];
		current.state.unmount();
		expect(current.state.active).toBe(false);
		expect(first.props.ownerActive.value).toBe(false);
		expect(first.dispose).not.toHaveBeenCalled();
		first.events.closed();
		await current.flushTicks();
		expect(first.dispose).toHaveBeenCalledTimes(1);
		expect(current.state.owner).toBeNull();
		expect(current.popups).toHaveLength(1);
		expect(current.writeSettings).not.toHaveBeenCalled();
	});

	test('mount・activation・cleanupの実入口が読込と独立popupの寿命へ結線される', () => {
		const mount = mountBody.getText(page);
		expect(mount.indexOf('registryGet(\'settings\', defaultSettings)')).toBeLessThan(mount.indexOf('acceptLoadedHataskSettings(loadResults[5].value)'));
		expect(mount.indexOf('acceptLoadedHataskSettings(loadResults[5].value)')).toBeLessThan(mount.indexOf('hataskIntroductionReady = true'));
		expect(mount.indexOf('hataskIntroductionReady = true')).toBeLessThan(mount.indexOf('showHataskIntroduction()'));
		expect(lifecycle('onActivated').statements[0].getText(page)).toBe('hataskPageActive = true;');
		expect(lifecycle('onActivated').statements[1].getText(page)).toBe('showHataskIntroduction();');
		expect(functionNode('cleanupHataskState').body.statements[0].getText(page)).toBe('closeHataskIntroduction();');
		for (const name of ['onDeactivated', 'onBeforeUnmount', 'onUnmounted']) expect(lifecycle(name).statements[0].getText(page)).toBe('cleanupHataskState();');
		expect(functionNode('startTutFromTheme').getText(page)).toMatch(/settings\.value\.akatsukiNoticeShown\s*=\s*true/u);
		expect(functionNode('skipTutTheme').getText(page)).toMatch(/settings\.value\.akatsukiNoticeShown\s*=\s*true/u);
	});
});
