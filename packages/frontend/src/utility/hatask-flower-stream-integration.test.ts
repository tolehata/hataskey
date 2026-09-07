/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { EventEmitter } from 'eventemitter3';
import ts from 'typescript';
import { effectScope, nextTick, ref, watch } from 'vue';
import { afterEach, describe, expect, test, vi } from 'vitest';

const page = readFileSync(`${process.cwd()}/src/pages/hatask.vue`, 'utf8');
const script = page.match(/<script lang="ts" setup>([\s\S]*?)<\/script>/u)?.[1];
if (script == null) throw new Error('Missing Hatask page script');
const ast = ts.createSourceFile('hatask.ts', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const text = (node: ts.Node): string => node.getText(ast);
const functionSource = (name: string): string => {
	const node = ast.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
	if (!node) throw new Error(`Missing Hatask function: ${name}`);
	return text(node);
};
const variableSource = (name: string): string => {
	const node = ast.statements.find(item => ts.isVariableStatement(item) && item.declarationList.declarations.some(declaration => declaration.name.getText(ast) === name));
	if (!node) throw new Error(`Missing Hatask variable: ${name}`);
	return text(node);
};

function hookSource(name: string, include: (statement: string) => boolean): string {
	const statements = ast.statements.flatMap(node => {
		if (!ts.isExpressionStatement(node) || !ts.isCallExpression(node.expression) || node.expression.expression.getText(ast) !== name) return [];
		const callback = node.expression.arguments.at(0);
		if (!callback || !ts.isArrowFunction(callback) || !ts.isBlock(callback.body)) return [];
		return callback.body.statements.map(text).filter(include);
	});
	if (!statements.length) throw new Error(`Missing flower lifecycle statements: ${name}`);
	return statements.join('\n');
}

type Row = { id: string; name: string; emoji: string; harvestedAt: string; user: { id: string } };
type Response = { items: Row[]; total: number; totalPages: number; myVisibility: 'public' | 'followers' | 'private' };
type Pending = { params: { page: number; limit: number; order: string }; resolve: (value: Response) => void; reject: (error: Error) => void };
type Popup = { kind: 'community' | 'activity' | 'personal'; showing: { value: boolean } };
const response = (id: string, total = 1, visibility: Response['myVisibility'] = 'public'): Response => ({
	items: [{ id, name: id, emoji: '🌼', harvestedAt: '2026-09-08T01:00:00.000Z', user: { id: `${id}-owner` } }],
	total, totalPages: Math.ceil(total / 12), myVisibility: visibility,
});
const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup(); });

async function settle(): Promise<void> { for (let index = 0; index < 4; index++) { await Promise.resolve(); await nextTick(); } }

function fixture() {
	const state = {
		communityFlowers: ref(response('cached').items), communityFlowerTotal: ref(30), communityFlowerTotalPages: ref(3),
		communityFlowerPage: ref(1), communityFlowerOrder: ref<'newest' | 'oldest'>('newest'),
		communityFlowersLoading: ref(false), communityFlowersError: ref(false), flowerVisibility: ref('public'),
		dataLoaded: ref(true), activeTab: ref('garden'), mutedUsersRevision: ref(0), selectedCommunityFlowerId: ref<string | null>('cached'),
	};
	const popup: Popup = { kind: 'community', showing: { value: true } };
	const pending: Pending[] = [];
	const request = vi.fn((endpoint: string, params: Pending['params']) => {
		expect(endpoint).toBe('hatask/flowers/list');
		return new Promise<Response>((resolve, reject) => pending.push({ params, resolve, reject }));
	});
	const localEvents = new EventEmitter();
	const main = new EventEmitter();
	const connection = new EventEmitter();
	const fixtureDocument = Object.assign(new EventTarget(), { hidden: false });
	const fixtureWindow = Object.assign(new EventTarget(), { ['document']: fixtureDocument });
	const bindings = {
		...state, initialPopup: popup, misskeyApi: request, ['document']: fixtureDocument, ['window']: fixtureWindow, console: { warn: vi.fn() },
		useGlobalEvent: (name: string, callback: () => void) => localEvents.on(name, callback),
		useStream: () => Object.assign(connection, { useChannel: () => Object.assign(main, { dispose: () => main.removeAllListeners() }) }),
	};
	const registrations = ast.statements.filter(node => ts.isExpressionStatement(node) && (
		/^watch\(mutedUsersRevision,/u.test(text(node)) || /^useGlobalEvent\('userBlockingChanged',/u.test(text(node)) ||
		/^flowerMainConnection\.on\(/u.test(text(node)) || /^useStream\(\)\.on\('_connected_', invalidateCommunityFlowers\)/u.test(text(node)) ||
		/^watch\(\[activeTab, communityFlowerPage, communityFlowerOrder\]/u.test(text(node))
	)).map(text);
	expect(registrations).toHaveLength(6);
	const source = [
		'let hataskPageActive = true; let activeFlowerPopup = initialPopup;',
		'function cleanupHataskState() { hataskPageActive = false; }',
		...['communityFlowerRequestSequence', 'skipNextCommunityFlowerWatch', 'flowerMainConnection'].map(variableSource),
		...['normalizeFlowerDate', 'stableHarvestedAt', 'closeFlowerDetail', 'invalidateCommunityFlowers', 'loadCommunityFlowers'].map(functionSource),
		...registrations,
		hookSource('onMounted', value => value.includes('addEventListener') && value.includes('invalidateCommunityFlowers')),
		`function activate() { ${hookSource('onActivated', value => value.includes('hataskPageActive = true') || value === 'invalidateCommunityFlowers();')} }`,
		`function deactivate() { ${hookSource('onDeactivated', value => value === 'cleanupHataskState();' || value === 'invalidateCommunityFlowers();')} }`,
		`function unmount() { ${hookSource('onUnmounted', value => value.includes('flowerMainConnection.dispose') || value.includes('invalidateCommunityFlowers'))} }`,
		'return { load: loadCommunityFlowers, invalidate: invalidateCommunityFlowers, activate, deactivate, unmount, setPopup(value) { activeFlowerPopup = value; } };',
	].join('\n');
	const code = ts.transpileModule(`function setup() { ${source} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
	const scope = effectScope();
	const api = scope.run(() => new Function(...Object.keys(bindings), 'watch', `${code}; return setup();`)(...Object.values(bindings), watch)) as {
		load: () => Promise<void>; invalidate: () => void; activate: () => void; deactivate: () => void; unmount: () => void; setPopup: (value: Popup) => void;
	};
	cleanups.push(() => { api.unmount(); scope.stop(); localEvents.removeAllListeners(); });
	return { ...api, state, popup, pending, request, localEvents, main, connection, fixtureDocument, fixtureWindow };
}

describe('Hatask flower stream request invalidation', () => {
	test.each(['mute', 'block', 'follow', 'unfollow', 'reconnect'] as const)('%s の変更後は一覧・花壇選択・詳細を破棄して認可済みの1ページ目を取得する', async event => {
		const f = fixture();
		if (event === 'mute') f.state.mutedUsersRevision.value++;
		else if (event === 'block') f.localEvents.emit('userBlockingChanged', { userId: 'cached-owner' });
		else if (event === 'reconnect') f.connection.emit('_connected_');
		else f.main.emit(event, { id: 'cached-owner' });
		await nextTick();
		expect(f.state.communityFlowers.value).toEqual([]);
		expect(f.state.communityFlowerTotal.value).toBe(0);
		expect(f.state.selectedCommunityFlowerId.value).toBeNull();
		expect(f.popup.showing.value).toBe(false);
		expect(f.pending).toHaveLength(1);
		expect(f.pending[0].params).toEqual({ page: 1, limit: 12, order: 'newest' });
		expect(f.state.communityFlowersLoading.value).toBe(true);
		f.pending[0].resolve(response('authorized', 28));
		await settle();
		expect(f.state.communityFlowers.value.map(item => item.id)).toEqual(['authorized']);
		expect(f.state.communityFlowerTotal.value).toBe(28);
	});

	test('旧応答の完了や失敗は新しい一覧・公開範囲・loading状態を変更しない', async () => {
		const f = fixture();
		const oldest = f.load();
		const older = f.load();
		f.invalidate();
		f.pending[0].resolve(response('blocked-old', 30, 'private'));
		f.pending[1].reject(new Error('old failure'));
		await Promise.all([oldest, older]);
		expect(f.state.communityFlowers.value).toEqual([]);
		expect(f.state.flowerVisibility.value).toBe('public');
		expect(f.state.communityFlowersLoading.value).toBe(true);
		expect(f.state.communityFlowersError.value).toBe(false);
		f.pending[2].resolve(response('current', 24, 'followers'));
		await settle();
		expect(f.state.communityFlowers.value.map(item => item.id)).toEqual(['current']);
		expect(f.state.flowerVisibility.value).toBe('followers');
		expect(f.state.communityFlowersLoading.value).toBe(false);
	});

	test('非表示化で処理中応答を破棄し、KeepAlive復帰後にだけ再取得する', async () => {
		const f = fixture();
		const old = f.load();
		f.deactivate();
		f.localEvents.emit('userBlockingChanged', { userId: 'cached-owner' });
		f.pending[0].resolve(response('old'));
		await old;
		expect(f.request).toHaveBeenCalledTimes(1);
		expect(f.state.communityFlowers.value).toEqual([]);
		f.activate();
		expect(f.request).toHaveBeenCalledTimes(2);
		f.pending[1].resolve(response('resumed'));
		await settle();
		expect(f.state.communityFlowers.value[0].id).toBe('resumed');
	});

	test('裏タブ・未読込・別Hataskタブでは再取得を待ち、フォーカス復帰で最新情報に戻す', async () => {
		const f = fixture();
		f.state.communityFlowerPage.value = 2;
		await nextTick();
		f.pending[0].resolve(response('second-page', 30));
		await settle();
		f.fixtureDocument.hidden = true;
		f.fixtureDocument.dispatchEvent(new Event('visibilitychange'));
		f.state.mutedUsersRevision.value++;
		await nextTick();
		expect(f.request).toHaveBeenCalledTimes(1);
		f.fixtureDocument.hidden = false;
		f.state.dataLoaded.value = false;
		f.fixtureWindow.dispatchEvent(new Event('focus'));
		expect(f.request).toHaveBeenCalledTimes(1);
		f.state.dataLoaded.value = true;
		f.state.activeTab.value = 'home';
		await nextTick();
		f.fixtureWindow.dispatchEvent(new Event('focus'));
		expect(f.request).toHaveBeenCalledTimes(1);
		f.state.activeTab.value = 'garden';
		await nextTick();
		f.pending[1].resolve(response('before-focus'));
		await settle();
		f.fixtureWindow.dispatchEvent(new Event('focus'));
		expect(f.state.communityFlowers.value).toEqual([]);
		expect(f.request).toHaveBeenCalledTimes(3);
		f.pending[2].resolve(response('focused'));
		await settle();
		expect(f.state.communityFlowers.value[0].id).toBe('focused');
	});

	test('一覧の再取得に失敗しても古い花を復活させず、再試行の最新応答だけを適用する', async () => {
		const f = fixture();
		f.invalidate();
		f.pending[0].reject(new Error('offline'));
		await settle();
		expect(f.state.communityFlowers.value).toEqual([]);
		expect(f.state.communityFlowersError.value).toBe(true);
		expect(f.state.communityFlowersLoading.value).toBe(false);
		const retry = f.load();
		expect(f.state.communityFlowersError.value).toBe(false);
		f.pending[1].resolve(response('retried'));
		await retry;
		expect(f.state.communityFlowers.value[0].id).toBe('retried');
	});

	test('関係変更によるページ初期化は二重取得せず、自分のお花の詳細を閉じない', async () => {
		const f = fixture();
		f.state.communityFlowerPage.value = 3;
		await nextTick();
		f.pending[0].resolve(response('third-page', 30));
		await settle();
		const own: Popup = { kind: 'personal', showing: { value: true } };
		f.setPopup(own);
		f.invalidate();
		await nextTick();
		expect(f.pending).toHaveLength(2);
		expect(f.state.communityFlowerPage.value).toBe(1);
		expect(own.showing.value).toBe(true);
		f.pending[1].resolve(response('new-first', 24));
		await settle();
	});

	test('ページ上限が縮んだ場合は有効な最終ページを取り直し、最初の応答を表示しない', async () => {
		const f = fixture();
		f.state.communityFlowerPage.value = 3;
		await nextTick();
		f.pending[0].resolve(response('wrong-page', 13));
		await settle();
		expect(f.pending).toHaveLength(2);
		expect(f.pending[1].params.page).toBe(2);
		expect(f.state.communityFlowers.value.map(item => item.id)).toEqual(['cached']);
		f.pending[1].resolve(response('valid-last-page', 13));
		await settle();
		expect(f.state.communityFlowers.value[0].id).toBe('valid-last-page');
	});
});
