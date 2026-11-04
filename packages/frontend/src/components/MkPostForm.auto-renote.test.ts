/* SPDX-License-Identifier: AGPL-3.0-only */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { AutoRenoteOptions } from '@/utility/auto-renote-schedule.js';
import { bindPostedAutoRenote } from '@/utility/auto-renote-schedule.js';

const options: AutoRenoteOptions = { frequency: 'monthly', time: '12:30', weekday: 0, day: 31 };

/** Run the real request and its success handler up to unrelated post achievements. */
function requestSource(file: string) {
	const source = readFileSync(resolve(process.cwd(), `src/components/${file}`), 'utf8').match(/<script[^>]*>([\s\S]*?)<\/script>/)![1];
	const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
	const post = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'post') as ts.FunctionDeclaration;
	const declarations = post.body!.statements.filter(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(decl => ['submittedAutoRenote', 'request'].includes(decl.name.getText(ast))));
	let callback: ts.ArrowFunction | undefined;

	function visit(node: ts.Node) {
		if (ts.isCallExpression(node) && node.expression.getText(ast) === 'request.then') callback = node.arguments[0] as ts.ArrowFunction;
		ts.forEachChild(node, visit);
	}

	visit(post);
	expect(declarations).toHaveLength(2);
	expect(callback).toBeDefined();
	const body = callback!.body as ts.Block;
	const nextTick = body.statements.findIndex(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText(ast) === 'nextTick');
	expect(nextTick).toBeGreaterThan(0);
	return declarations.map(node => node.getText(ast)).join('\n') + '\noutput = request.then(async (createdNote) => {' + body.statements.slice(0, nextTick).map(node => node.getText(ast)).join('\n') + '\n});';
}

function submit(file: string, input: { updating?: boolean; postFails?: boolean; scheduleFails?: boolean; poison?: boolean } = {}) {
	const api = vi.fn(async () => {
		if (input.postFails) throw new Error('Post failed');
		return { createdNote: { id: 'returned-note' } };
	});
	const scheduleApi = vi.fn(async () => {
		if (input.scheduleFails) throw new Error('Schedule failed');
		return {};
	});
	const pending = ref<AutoRenoteOptions | null>({ ...options });
	const clear = vi.fn(() => { pending.value = null; });
	const emit = vi.fn();
	const context = {
		autoRenote: pending, props: { updateMode: input.updating, freezeAfterPosted: false },
		postData: { text: 'hello', noteId: input.updating ? 'edited-note' : undefined }, token: undefined,
		misskeyApi: api, posted: ref(false), submitMotionState: ref('idle'),
		registerPostedAutoRenote: (note: { id: string }, value: AutoRenoteOptions) => bindPostedAutoRenote(note.id, value, scheduleApi),
		clear, waitForSubmitMotion: () => Promise.resolve(), globalEvents: { emit }, output: undefined,
	};
	let source = requestSource(file);
	if (input.poison) source = source.replace('await registerPostedAutoRenote(createdNote, submittedAutoRenote)', 'Promise.resolve()');
	runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
	return { api, scheduleApi, pending, clear, emit, promise: context.output as unknown as Promise<void> };
}

describe.each(['MkPostForm.vue', 'MkPostFormSimple.vue'])('%s automatic renote post binding', file => {
	it('rechecks captured credentials and the outgoing audience after the send delay', async () => {
		const source = readFileSync(resolve(process.cwd(), `src/components/${file}`), 'utf8').match(/<script[^>]*>([\s\S]*?)<\/script>/)![1];
		const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
		const post = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'post') as ts.FunctionDeclaration;
		const guard = post.body!.statements.find(node => ts.isIfStatement(node) && node.expression.getText(ast).startsWith('autoRenote.value && (token'));
		expect(guard).toBeDefined();
		const externalBranch = post.body!.statements.find(node => ts.isIfStatement(node) && node.expression.getText(ast) === 'useExternalAccount.value');
		if (externalBranch) expect(guard!.pos).toBeLessThan(externalBranch.pos);
		for (const change of [{ token: 'captured-other-account-token' }, { channelId: 'plugin-channel' }, { visibility: 'home' }, { allowed: false }]) {
			const alert = vi.fn();
			const context = {
				autoRenote: ref(options), token: 'token' in change ? change.token : undefined,
				postData: { visibility: 'visibility' in change ? change.visibility : 'public', channelId: 'channelId' in change ? change.channelId : undefined },
				autoRenoteAllowed: () => !('allowed' in change) || change.allowed,
				posting: ref(true), submitMotionState: ref('sending'), os: { alert },
				i18n: { ts: { _autoRenote: { composeUnavailable: 'Stop' } } }, output: undefined,
			};
			const code = `output = (async () => { ${guard!.getText(ast)} return 'sent'; })();`;
			runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
			await expect(context.output).resolves.toBeUndefined();
			expect(alert).toHaveBeenCalledExactlyOnceWith({ type: 'warning', text: 'Stop' });
			expect(context.posting.value).toBe(false);
		}
	});

	it('binds only to the returned ID after successful creation, then clears the pending settings', async () => {
		const view = submit(file);
		await view.promise;
		expect(view.api).toHaveBeenCalledExactlyOnceWith('notes/create', expect.objectContaining({ text: 'hello' }), undefined);
		expect(view.scheduleApi).toHaveBeenCalledExactlyOnceWith({ ...options, noteId: 'returned-note' });
		expect(view.pending.value).toBeNull();
	});
	it('retains settings after a failed post without registering anything', async () => {
		const view = submit(file, { postFails: true });
		await expect(view.promise).rejects.toThrow('Post failed');
		expect(view.pending.value).toEqual(options);
		expect(view.scheduleApi).not.toHaveBeenCalled();
		expect(view.clear).not.toHaveBeenCalled();
	});
	it('does not repost or preserve a duplicate draft after a schedule failure', async () => {
		const view = submit(file, { scheduleFails: true });
		await view.promise;
		expect(view.api).toHaveBeenCalledOnce();
		expect(view.scheduleApi).toHaveBeenCalledOnce();
		expect(view.pending.value).toBeNull();
		expect(view.emit).toHaveBeenCalledExactlyOnceWith('notePosted', { id: 'returned-note' });
	});
	it('does not register a schedule from note editing', async () => {
		const view = submit(file, { updating: true });
		await view.promise;
		expect(view.api).toHaveBeenCalledWith('notes/update', expect.objectContaining({ noteId: 'edited-note' }), undefined);
		expect(view.scheduleApi).not.toHaveBeenCalled();
	});
	it('positive control detects a removed successful-post registration call', async () => {
		const view = submit(file, { poison: true });
		await view.promise;
		expect(() => expect(view.scheduleApi).toHaveBeenCalledExactlyOnceWith({ ...options, noteId: 'returned-note' })).toThrow();
	});
});
