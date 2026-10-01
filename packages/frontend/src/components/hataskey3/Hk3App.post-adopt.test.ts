/* SPDX-License-Identifier: AGPL-3.0-only */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from '@vue/compiler-sfc';
import * as ts from 'typescript';
import { computed, effectScope, nextTick, ref, shallowRef, watch } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hk3CanAdoptPostForm } from './hk3-state.js';
import { useHk3SidePage } from './use-hk3-side-page.js';

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
const hatadyDeclaration = setup.statements.find(statement => ts.isVariableStatement(statement)
	&& statement.declarationList.declarations.some(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === 'isHatadyTimeline'))!;
const hatadyCode = ts.transpileModule(`${hatadyDeclaration.getText(setup)}\nreturn isHatadyTimeline;`, {
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
	const bindings = { watch, nextTick, composerRef, isHome, isMobile, deckActive, composeWindowOpen, timelineVisible, drawerOpen, mobileDockRef, closeMobilePane, mainRouter, sidePageSession: ref(null), sidePage: { restoreForComposer: vi.fn() }, hk3CanAdoptPostForm, os: { postDirect } };
	const state = scope.run(() => new Function(...Object.keys(bindings), code)(...Object.values(bindings))) as { interceptPostForm: (request: unknown) => boolean };
	cleanups.push(() => scope.stop());
	return { ...state, composerRef, composeWindowOpen, postDirect };
}

describe('UI S post form fallback after delayed adoption', () => {
	it('declines a direct reply before mobile navigation or draft adoption so os.post opens the standard form', () => {
		const adopt = vi.fn(() => true);
		const view = mount({ mobile: true, home: false, deck: false, composer: { adopt } });
		const request = { reply: { id: 'direct', visibility: 'specified', visibleUserIds: ['recipient'] } };
		expect(view.interceptPostForm(request)).toBe(false);
		expect(adopt).not.toHaveBeenCalled();
		expect(view.composeWindowOpen.value).toBe(false);
		expect(view.postDirect).not.toHaveBeenCalled();
	});

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

describe('UI S Hatady composer in a side-page session', () => {
	it('keeps the record action while Hatady is visible in split mode and restores note composer for other timelines', () => {
		const route = ref('/');
		const isHome = computed(() => route.value === '/');
		const deckActive = ref(false);
		const timelineRef = shallowRef<{ mobileNavigation: { active: string } } | null>({ mobileNavigation: { active: 'hatady' } });
		const router = { getCurrentFullPath: () => route.value, pushByPath: (path: string) => { route.value = path; } };
		const scope = effectScope();
		const sidePage = scope.run(() => useHk3SidePage({ router, currentRoute: () => route.value, isHome: () => isHome.value, isMobile: () => false, isDesktopDeck: () => false }))!;
		const timelineVisible = sidePage.timelineVisible;
		const isHatadyTimeline = scope.run(() => new Function('computed', 'timelineVisible', 'timelineRef', 'deckActive', hatadyCode)(computed, timelineVisible, timelineRef, deckActive)) as ReturnType<typeof computed<boolean>>;
		cleanups.push(() => scope.stop());

		expect(isHatadyTimeline.value).toBe(true);
		route.value = '/hatask';
		expect(sidePage.sidebarNavigated('/hatask')).toBe(true);
		expect(sidePage.mode.value).toBe('split');
		expect(isHatadyTimeline.value).toBe(true);
		timelineRef.value = { mobileNavigation: { active: 'local' } };
		expect(isHatadyTimeline.value).toBe(false);
		timelineRef.value = { mobileNavigation: { active: 'hatady' } };
		expect(sidePage.toggle()).toBe(true);
		expect(sidePage.mode.value).toBe('full');
		expect(isHatadyTimeline.value).toBe(false);
		expect(sidePage.toggle()).toBe(true);
		expect(isHatadyTimeline.value).toBe(true);
		expect(sidePage.close()).toBe(true);
		deckActive.value = true;
		expect(isHatadyTimeline.value).toBe(false);

		const template = descriptor.template!.content;
		expect(template).toContain('<Hk3Composer v-show="!isHatadyTimeline"');
		expect(template).toContain('<button v-if="isHatadyTimeline"');
	});
});
