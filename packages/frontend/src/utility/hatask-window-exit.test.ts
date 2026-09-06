/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { parse } from '@vue/compiler-sfc';
import * as ts from 'typescript';
import { describe, expect, test, vi } from 'vitest';

function source(path: string): string { return readFileSync(resolve(process.cwd(), path), 'utf8'); }

function script(path: string): ts.SourceFile {
	const descriptor = parse(source(path), { filename: path }).descriptor;
	if (!descriptor.scriptSetup) throw new Error(`Missing script setup: ${path}`);
	return ts.createSourceFile(path + '.ts', descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

const page = script('src/pages/hatask.vue');
const frame = script('src/components/MkPageWindow.vue');
const di = ts.createSourceFile('di.ts', source('src/di.ts'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

function declaration(file: ts.SourceFile, name: string): ts.VariableDeclaration {
	for (const statement of file.statements) {
		if (!ts.isVariableStatement(statement)) continue;
		const found = statement.declarationList.declarations.find(item => ts.isIdentifier(item.name) && item.name.text === name);
		if (found) return found;
	}
	throw new Error(`Missing variable: ${name}`);
}

function functionNode(file: ts.SourceFile, name: string): ts.FunctionDeclaration {
	const node = file.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === name);
	if (!node || !ts.isFunctionDeclaration(node) || !node.body) throw new Error(`Missing function: ${name}`);
	return node;
}

function callStatement(file: ts.SourceFile, name: string, firstArgument?: string): ts.ExpressionStatement {
	const found = file.statements.find(statement => ts.isExpressionStatement(statement)
		&& ts.isCallExpression(statement.expression)
		&& statement.expression.expression.getText(file) === name
		&& (firstArgument === undefined || (statement.expression.arguments.length > 0 && statement.expression.arguments[0].getText(file) === firstArgument)));
	if (!found || !ts.isExpressionStatement(found)) throw new Error(`Missing call: ${name}(${firstArgument ?? ''})`);
	return found;
}

function evaluate<T>(code: string, context: Record<string, unknown>): T {
	const compiled = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } });
	return runInNewContext(compiled.outputText, context, { timeout: 1000 }) as T;
}

type ExitFunctions = { exitHatask: () => void; handleBack: () => void; goBackToTimeline: () => void; handleAkatsukiAction: (action: { type: 'exit' }) => Promise<void> };

function extractExitFunctions(legacyControl = false): string {
	return ['exitHatask', 'handleBack', 'goBackToTimeline', 'handleAkatsukiAction'].map(name => {
		const node = functionNode(page, name);
		if (!legacyControl || name !== 'exitHatask') return node.getText(page);
		if (!node.body) throw new Error('Missing exit function body');
		const guard = node.body.statements.find(statement => ts.isIfStatement(statement) && statement.expression.getText(page) === 'closePageWindow');
		if (!guard) throw new Error('Missing window close guard for positive control');
		// Mutate the actual AST, not a second implementation: removing only the
		// window guard restores the former return-to-timeline exit behavior.
		const body = ts.factory.updateBlock(node.body, node.body.statements.filter(statement => statement !== guard));
		const legacy = ts.factory.updateFunctionDeclaration(node, node.modifiers, node.asteriskToken, node.name, node.typeParameters, node.parameters, node.type, body);
		return ts.createPrinter().printNode(ts.EmitHint.Unspecified, legacy, page);
	}).join('\n');
}

function fixture(options: { tab?: string; inWindow?: boolean; legacyControl?: boolean; providedClose?: () => void } = {}) {
	const activeTab = { value: options.tab ?? 'home' };
	const route = { value: '/hatask' };
	const operations: string[] = [];
	const cleanupHataskState = vi.fn(() => { operations.push('cleanup'); });
	const closePageWindow = options.inWindow ? vi.fn(() => { operations.push('close'); options.providedClose?.(); }) : null;
	const routeRouter = { push: vi.fn((path: string) => { operations.push(`push:${path}`); route.value = path; }) };
	const functions = evaluate<ExitFunctions>(`${extractExitFunctions(options.legacyControl)}\n({ exitHatask, handleBack, goBackToTimeline, handleAkatsukiAction });`, { activeTab, closePageWindow, cleanupHataskState, routeRouter });
	return { ...functions, activeTab, route, operations, cleanupHataskState, closePageWindow, routeRouter };
}

describe('Hataskの明示終了と従来の戻る操作', () => {
	test.each(['home', 'cal', 'todo'])('ウィンドウの%sからの明示終了はcloseだけを呼び、routeとタブを変更しない', async tab => {
		const current = fixture({ tab, inWindow: true });
		await current.handleAkatsukiAction({ type: 'exit' });
		expect(current.operations).toEqual(['close']);
		expect(current.closePageWindow).toHaveBeenCalledTimes(1);
		expect(current.cleanupHataskState).not.toHaveBeenCalled();
		expect(current.routeRouter.push).not.toHaveBeenCalled();
		expect(current.route.value).toBe('/hatask');
		expect(current.activeTab.value).toBe(tab);
	});

	test('通常ページのホームでは従来どおりcleanupの後にタイムラインへ遷移する', async () => {
		const current = fixture();
		await current.handleAkatsukiAction({ type: 'exit' });
		expect(current.operations).toEqual(['cleanup', 'push:/']);
		expect(current.routeRouter.push).toHaveBeenCalledTimes(1);
		expect(current.route.value).toBe('/');
	});

	test.each(['cal', 'todo', 'mood', 'meal', 'garden', 'eye', 'hataskapps', 'apps'])('通常ページの%sでは明示終了でもまずホームへ戻す', async tab => {
		const current = fixture({ tab });
		await current.handleAkatsukiAction({ type: 'exit' });
		expect(current.activeTab.value).toBe('home');
		expect(current.operations).toEqual([]);
		expect(current.route.value).toBe('/hatask');
		await current.handleAkatsukiAction({ type: 'exit' });
		expect(current.operations).toEqual(['cleanup', 'push:/']);
	});

	test.each([false, true])('旧テーマの戻る操作は閉窓へ変えず、非home→home→timelineを保つ（window=%s）', inWindow => {
		const current = fixture({ tab: 'cal', inWindow });
		current.handleBack();
		expect(current.activeTab.value).toBe('home');
		expect(current.operations).toEqual([]);
		current.handleBack();
		expect(current.operations).toEqual(['cleanup', 'push:/']);
		if (current.closePageWindow) expect(current.closePageWindow).not.toHaveBeenCalled();
	});

	test('window close分岐を外した旧挙動はroute変更として検出できる', async () => {
		const legacy = fixture({ inWindow: true, legacyControl: true });
		await legacy.handleAkatsukiAction({ type: 'exit' });
		expect(legacy.operations).toEqual(['cleanup', 'push:/']);
		expect(legacy.route.value).toBe('/');
		expect(legacy.closePageWindow).not.toHaveBeenCalled();
		const current = fixture({ inWindow: true });
		await current.handleAkatsukiAction({ type: 'exit' });
		expect(current.operations).toEqual(['close']);
		expect(current.route.value).toBe('/hatask');
	});

	test('暁のactionと旧テーマの戻るボタンを別々の既存入口へ結線する', () => {
		const markup = parse(source('src/pages/hatask.vue')).descriptor.template?.content;
		if (!markup) throw new Error('Missing Hatask template');
		const fragment = window.document.createElement('template'); fragment.innerHTML = markup;
		expect(fragment.content.querySelector('HataskAkatsukiLayout')?.getAttribute('@action')).toBe('handleAkatsukiAction');
		const buttons = [...fragment.content.querySelectorAll('button')];
		expect(buttons.filter(button => button.getAttribute('@click') === 'handleBack')).toHaveLength(2);
	});
});

describe('MkPageWindowからの終了ハンドラー注入と閉鎖ライフサイクル', () => {
	test('実DI宣言・provide・injectから既存windowEl.closeまで同じコールバックを結線する', () => {
		const initializer = declaration(di, 'DI').initializer;
		if (!initializer || !ts.isObjectLiteralExpression(initializer)) throw new Error('Missing DI object');
		const property = initializer.properties.find(item => ts.isPropertyAssignment(item) && item.name.getText(di) === 'pageWindowClose');
		if (!property || !ts.isPropertyAssignment(property)) throw new Error('Missing page window close key');
		expect(property.initializer.getText(di)).toMatch(/Symbol\(\)\s+as\s+InjectionKey<\(\)\s*=>\s*void>/u);
		const DI = evaluate<{ pageWindowClose: symbol }>(`const DI = ${initializer.getText(di)}; DI;`, {});
		expect(typeof DI.pageWindowClose).toBe('symbol');
		const provided = new Map<symbol, unknown>();
		const windowClose = vi.fn();
		const exposed = vi.fn();
		const unmountCallbacks: Array<() => void> = [];
		const openingWindowsCount = { value: 2 };
		evaluate(`${functionNode(frame, 'close').getText(frame)}\n${callStatement(frame, 'provide', 'DI.pageWindowClose').getText(frame)}\n${callStatement(frame, 'defineExpose').getText(frame)}\n${callStatement(frame, 'onUnmounted').getText(frame)}`, {
			DI, windowEl: { value: { ['close']: windowClose } }, openingWindowsCount,
			provide: (key: symbol, value: unknown) => provided.set(key, value),
			defineExpose: exposed,
			onUnmounted: (callback: () => void) => unmountCallbacks.push(callback),
		});
		const variable = declaration(page, 'closePageWindow');
		const inject = vi.fn((key: symbol, fallback: null) => provided.get(key) ?? fallback);
		const injected = evaluate<(() => void) | null>(`const ${variable.getText(page)}; closePageWindow;`, { DI, inject });
		expect(inject).toHaveBeenCalledWith(DI.pageWindowClose, null);
		expect(injected).toBe(provided.get(DI.pageWindowClose));
		expect(exposed).toHaveBeenCalledWith({ ['close']: injected });
		if (!injected) throw new Error('Missing provided close callback');
		const current = fixture({ tab: 'todo', inWindow: true, providedClose: injected });
		current.exitHatask();
		expect(windowClose).toHaveBeenCalledTimes(1);
		expect(current.route.value).toBe('/hatask');
		expect(current.cleanupHataskState).not.toHaveBeenCalled();
		expect(openingWindowsCount.value).toBe(2);
		expect(unmountCallbacks).toHaveLength(1);
		unmountCallbacks[0]();
		expect(openingWindowsCount.value).toBe(1);
	});

	test('注入先がない通常ページではnullを使い、window ref欠落時のcloseも安全に終わる', () => {
		const variable = declaration(page, 'closePageWindow');
		const injected = evaluate<unknown>(`const ${variable.getText(page)}; closePageWindow;`, { DI: { pageWindowClose: Symbol() }, inject: (_key: symbol, fallback: unknown) => fallback });
		expect(injected).toBeNull();
		expect(() => evaluate(`${functionNode(frame, 'close').getText(frame)}\nclose();`, { windowEl: { value: null } })).not.toThrow();
	});

	test('閉窓のclosed通知とHataskの既存unmount cleanupを早期に横取りしない', () => {
		const template = parse(source('src/components/MkPageWindow.vue')).descriptor.template?.content;
		if (!template) throw new Error('Missing page window template');
		const fragment = window.document.createElement('template'); fragment.innerHTML = template;
		const closedExpression = fragment.content.querySelector('MkWindow')?.getAttribute('@closed');
		if (!closedExpression) throw new Error('Missing original window closed event');
		const emit = vi.fn();
		const windowClose = vi.fn();
		evaluate(`${functionNode(frame, 'close').getText(frame)}\nclose();`, { windowEl: { value: { ['close']: windowClose } }, emit });
		expect(windowClose).toHaveBeenCalledTimes(1);
		expect(emit).not.toHaveBeenCalled();
		evaluate(closedExpression, { emit });
		expect(emit).toHaveBeenCalledWith('closed');
		const cleanupHataskState = vi.fn();
		let beforeUnmount: (() => void) | undefined;
		evaluate(callStatement(page, 'onBeforeUnmount').getText(page), { cleanupHataskState, onBeforeUnmount: (callback: () => void) => { beforeUnmount = callback; } });
		expect(cleanupHataskState).not.toHaveBeenCalled();
		if (!beforeUnmount) throw new Error('Missing Hatask unmount callback');
		beforeUnmount();
		expect(cleanupHataskState).toHaveBeenCalledTimes(1);
	});
});
