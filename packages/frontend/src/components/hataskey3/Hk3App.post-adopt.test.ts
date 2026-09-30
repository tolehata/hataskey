/* SPDX-License-Identifier: AGPL-3.0-only */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from '@vue/compiler-sfc';
import * as ts from 'typescript';
import { effectScope, nextTick, ref, shallowRef, watch } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

const filename = 'src/components/hataskey3/Hk3App.vue';
const descriptor = parse(readFileSync(resolve(process.cwd(), filename), 'utf8'), { filename }).descriptor;
const setup = ts.createSourceFile(`${filename}.ts`, descriptor.scriptSetup!.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const selected = setup.statements.filter(statement =>
	(ts.isFunctionDeclaration(statement) && statement.name?.text === 'interceptPostForm') ||
	(ts.isVariableStatement(statement) && statement.declarationList.declarations.some(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === 'pendingAdopt')) ||
	(ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression) && statement.expression.expression.getText(setup) === 'watch' && statement.getText(setup).includes('pendingAdopt')),
);
const code = ts.transpileModule(`${selected.map(statement => statement.getText(setup)).join('\n')}\nreturn { interceptPostForm };`, {
	compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

function mount(options: { mobile: boolean; home: boolean; deck: boolean; composer?: { adopt: (request: unknown) => boolean } }) {
	const postDirect = vi.fn();
	const composerRef = shallowRef(options.composer ?? null);
	const isHome = ref(options.home);
	const isMobile = ref(options.mobile);
	const deckActive = ref(options.deck);
	const composeWindowOpen = ref(false);
	const timelineVisible = ref(true);
	const drawerOpen = ref(true);
	const mobileDockRef = ref({ closeMenu: vi.fn() });
	const closeMobilePane = vi.fn();
	const mainRouter = { pushByPath: vi.fn(() => { isHome.value = true; }) };
	const scope = effectScope();
	const bindings = { watch, nextTick, composerRef, isHome, isMobile, deckActive, composeWindowOpen, timelineVisible, drawerOpen, mobileDockRef, closeMobilePane, mainRouter, sidePageSession: ref(null), sidePage: { restoreForComposer: vi.fn() }, hk3CanAdoptPostForm: () => true, os: { postDirect } };
	const state = scope.run(() => new Function(...Object.keys(bindings), code)(...Object.values(bindings))) as { interceptPostForm: (request: unknown) => boolean };
	cleanups.push(() => scope.stop());
	return { ...state, composerRef, composeWindowOpen, postDirect };
}

describe('UI S post form fallback after delayed adoption', () => {
	it('opens the standard form when a mobile return-home adoption is rejected', async () => {
		const adopt = vi.fn(() => false);
		const view = mount({ mobile: true, home: false, deck: false, composer: { adopt } });
		const request = { reply: { id: 'reply' } };
		expect(view.interceptPostForm(request)).toBe(true);
		await nextTick(); await nextTick();
		expect(adopt).toHaveBeenCalledWith(request);
		expect(view.postDirect).toHaveBeenCalledOnce();
		expect(view.postDirect).toHaveBeenCalledWith(request);
	});

	it('opens the standard form if the deck window has no composer on the next tick', async () => {
		const view = mount({ mobile: false, home: true, deck: true });
		const request = { renote: { id: 'quote' } };
		expect(view.interceptPostForm(request)).toBe(true);
		expect(view.composeWindowOpen.value).toBe(true);
		await nextTick();
		expect(view.postDirect).toHaveBeenCalledWith(request);
	});
});
