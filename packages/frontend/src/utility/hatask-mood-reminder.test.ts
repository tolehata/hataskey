/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { parse } from '@vue/compiler-sfc';
import * as ts from 'typescript';
import { ref } from 'vue';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createHataskMoodReminderPatch, isHataskMoodReminderTimeZone } from '@/utility/hatask-mood-reminder.js';

function deviceTimeZone(timeZone: string): void {
	const options = Intl.DateTimeFormat().resolvedOptions();
	vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ ...options, timeZone });
}

afterEach(() => vi.restoreAllMocks());

describe('Hatask mood reminder preferences', () => {
	test('初めて設定画面で有効にした場合は時刻と端末の地域をまとめて保存できる', () => {
		deviceTimeZone('America/New_York');
		const current = Object.freeze({ theme: 'koke', moodRemind: false });
		const change = Object.freeze({ moodRemind: true });
		expect({ ...current, ...createHataskMoodReminderPatch(current, change) }).toEqual({
			theme: 'koke', moodRemind: true,
			moodRemindTimes: ['昼 12:00', '寝る前 23:00'], moodRemindTimeZone: 'America/New_York',
		});
		expect(current.moodRemind).toBe(false);
	});

	test('既存の時刻選択と明示的な未選択を初期値で置き換えない', () => {
		deviceTimeZone('Asia/Tokyo');
		for (const moodRemindTimes of [[], ['朝 8:00']]) {
			const current = Object.freeze({ moodRemindTimes: Object.freeze(moodRemindTimes) });
			const next = { ...current, ...createHataskMoodReminderPatch(current, { moodRemind: true }) };
			expect(next.moodRemindTimes).toEqual(moodRemindTimes);
		}
	});

	test('別の端末で時刻を変更した場合は新しい地域を記録し、渡された配列を変更しない', () => {
		deviceTimeZone('Europe/London');
		const current = Object.freeze({ moodRemindTimeZone: 'Asia/Tokyo', moodRemindTimes: ['朝 8:00'] });
		const times = Object.freeze(['夜 20:00']);
		const next = createHataskMoodReminderPatch(current, { moodRemindTimes: times });
		expect(next).toEqual({ moodRemindTimeZone: 'Europe/London', moodRemindTimes: ['夜 20:00'] });
		expect(next.moodRemindTimes).not.toBe(times);
		expect(current.moodRemindTimes).toEqual(['朝 8:00']);
	});

	test('テーマなど他の設定変更では既存の地域も未設定の地域も変えない', () => {
		deviceTimeZone('America/New_York');
		for (const current of [{ moodRemindTimeZone: 'Asia/Tokyo' }, {}]) {
			expect(createHataskMoodReminderPatch(current, { theme: 'suri' })).toEqual({ theme: 'suri' });
		}
	});

	test('端末の地域が欠落・不正・取得失敗の場合は既存サーバーの既定地域に揃える', () => {
		for (const timeZone of ['', 'Invalid/Zone', '+09:00']) {
			deviceTimeZone(timeZone);
			expect(createHataskMoodReminderPatch({}, { moodRemind: true }).moodRemindTimeZone).toBe('Asia/Tokyo');
			vi.restoreAllMocks();
		}
		vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(() => { throw new Error('Unavailable zone'); });
		expect(createHataskMoodReminderPatch({}, { moodRemind: false }).moodRemindTimeZone).toBe('Asia/Tokyo');
	});

	test('設定の持ち運びでは実在する地域名を許可し、不正な地域や非文字列を拒否する', () => {
		for (const value of ['Asia/Tokyo', 'America/New_York', 'Europe/London', 'UTC']) expect(isHataskMoodReminderTimeZone(value)).toBe(true);
		for (const value of ['', 'Invalid/Zone', '+09:00', '-05:00', '+0900', '+9:99', null, {}, 9]) expect(isHataskMoodReminderTimeZone(value)).toBe(false);
	});
});

function pageScript(filename: string): ts.SourceFile {
	const descriptor = parse(readFileSync(resolve(process.cwd(), filename), 'utf8'), { filename }).descriptor;
	if (!descriptor.scriptSetup) throw new Error(`Missing script setup: ${filename}`);
	return ts.createSourceFile(filename + '.ts', descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

const journalPage = pageScript('src/pages/hatask.vue');
const settingsPage = pageScript('src/pages/HataskSettings.vue');

function saveFixture(surface: 'journal' | 'settings', saved: Record<string, unknown> = { moodRemind: false, theme: 'koke' }) {
	const page = surface === 'journal' ? journalPage : settingsPage;
	const name = surface === 'journal' ? 'saveJournalReminder' : 'saveSettings';
	const declaration = page.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
	if (!declaration) throw new Error(`Missing save handler: ${name}`);
	const settings = ref({ ...saved });
	const saving = ref(false);
	const loaded = ref(true);
	const loadedKeys = new Set(['settings']);
	const write = vi.fn(async (_value: unknown): Promise<void> => undefined);
	const emit = vi.fn();
	const error = ref('');
	const alert = vi.fn();
	const compiled = ts.transpileModule(`${declaration.getText(page)}\n${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } });
	const save = runInNewContext(compiled.outputText, {
		settings, settingsSaving: saving, journalReminderSaving: saving, settingsLoaded: loaded, loadedKeys,
		createHataskMoodReminderPatch, settingsError: error, emit, SCOPE: ['client', 'hatask'],
		copy: { saveFailure: 'save failed' }, i18n: { ts: { _hata: { _hatask: { _journal: { saveFailure: 'save failed' } } } } }, os: { alert },
		registrySet: (key: string, value: unknown) => { expect(key).toBe('settings'); return write(value); },
		misskeyApi: (endpoint: string, params: { key: string; value: unknown; scope: string[] }) => {
			expect(endpoint).toBe('i/registry/set');
			expect(params.key).toBe('settings');
			expect(params.scope).toEqual(['client', 'hatask']);
			return write(params.value);
		},
	}) as (patch: Record<string, unknown>) => Promise<void>;
	return { save, settings, saving, loaded, loadedKeys, write, emit, error, alert };
}

describe.each(['journal', 'settings'] as const)('%s reminder save integration', surface => {
	test('サーバーで保存が完了するまで変更を確定せず、保存後に時刻と地域を反映する', async () => {
		deviceTimeZone('America/New_York');
		const state = saveFixture(surface);
		let finish!: () => void;
		state.write.mockImplementation(() => new Promise<void>(resolveValue => { finish = resolveValue; }));
		const saving = state.save({ moodRemind: true });
		expect(state.settings.value).toEqual({ moodRemind: false, theme: 'koke' });
		expect(state.saving.value).toBe(true);
		expect(state.emit).not.toHaveBeenCalled();
		await state.save({ moodRemind: false });
		expect(state.write).toHaveBeenCalledTimes(1);
		finish();
		await saving;
		expect(state.settings.value).toEqual({ moodRemind: true, theme: 'koke', moodRemindTimes: ['昼 12:00', '寝る前 23:00'], moodRemindTimeZone: 'America/New_York' });
		expect(state.saving.value).toBe(false);
		if (surface === 'settings') expect(state.emit).toHaveBeenCalledWith('changed', state.settings.value);
	});

	test('保存失敗時は有効状態・時刻・地域と他の設定を保持する', async () => {
		deviceTimeZone('Europe/London');
		const before = { moodRemind: true, moodRemindTimes: ['夜 20:00'], moodRemindTimeZone: 'Asia/Tokyo', theme: 'suri' };
		const state = saveFixture(surface, before);
		state.write.mockRejectedValue(new Error('Network failure'));
		await state.save({ moodRemind: false });
		expect(state.settings.value).toEqual(before);
		expect(state.saving.value).toBe(false);
		expect(state.emit).not.toHaveBeenCalled();
		if (surface === 'settings') expect(state.error.value).toBe('save failed');
		else expect(state.alert).toHaveBeenCalledWith({ type: 'error', text: 'save failed' });
	});

	test('設定を取得できていない場合は保存しない', async () => {
		const state = saveFixture(surface);
		state.loaded.value = false;
		state.loadedKeys.clear();
		await state.save({ moodRemind: true });
		expect(state.write).not.toHaveBeenCalled();
		expect(state.settings.value).toEqual({ moodRemind: false, theme: 'koke' });
	});
});

function clientNotificationDestinations(page: ts.SourceFile): string[] {
	const destinations: string[] = [];
	const visit = (node: ts.Node): void => {
		if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'sendNotification') {
			const link = node.arguments[3];
			destinations.push(link && ts.isStringLiteral(link) ? link.text : 'unknown');
		}
		ts.forEachChild(node, visit);
	};
	visit(page);
	return destinations;
}

test('クライアントからは予定通知だけを作成し、気持ち通知を二重送信しない', () => {
	expect(clientNotificationDestinations(journalPage)).toEqual(['/hatask?notice=calendar']);
	const broken = ts.createSourceFile('old-client.ts', journalPage.text + '\nsendNotification("title", "body", undefined, "/hatask?notice=mood");', ts.ScriptTarget.Latest, true);
	expect(clientNotificationDestinations(broken)).toContain('/hatask?notice=mood');
});
