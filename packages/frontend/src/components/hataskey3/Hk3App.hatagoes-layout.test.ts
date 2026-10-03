/* SPDX-License-Identifier: AGPL-3.0-only */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from '@vue/compiler-sfc';
import * as ts from 'typescript';
import { computed, ref } from 'vue';
import { describe, expect, it } from 'vitest';

const filename = 'src/components/hataskey3/Hk3App.vue';
const descriptor = parse(readFileSync(resolve(process.cwd(), filename), 'utf8'), { filename }).descriptor;
const setup = ts.createSourceFile(`${filename}.ts`, descriptor.scriptSetup!.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const names = ['path', 'isHataGoesPage', 'showRightPane', 'isHome', 'deckActive', 'desktopColumns'];
const statements = setup.statements.filter(statement => ts.isVariableStatement(statement)
	&& statement.declarationList.declarations.some(declaration => ts.isIdentifier(declaration.name) && names.includes(declaration.name.text)));
const code = ts.transpileModule(`${statements.map(statement => statement.getText(setup)).join('\n')}\nreturn { isHataGoesPage, showRightPane, desktopColumns };`, {
	compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

describe('UI3 HataGoes desktop layout', () => {
	it('uses the full width on HataGoes and restores the surrounding panes after leaving', () => {
		const route = ref({ path: '/' });
		const bindings = {
			computed,
			mainRouter: { currentRoute: route },
			width: ref(1440),
			RIGHT_PANE_MIN: 1200,
			DECK_MIN: 1200,
			deckMode: ref(false),
		};
		const state = new Function(...Object.keys(bindings), code)(...Object.values(bindings)) as {
			isHataGoesPage: ReturnType<typeof computed<boolean>>;
			showRightPane: ReturnType<typeof computed<boolean>>;
			desktopColumns: ReturnType<typeof computed<string>>;
		};
		expect(state.desktopColumns.value).toBe('64px minmax(0, 1fr) 320px');
		route.value = { path: '/hatagoes' };
		expect(state.isHataGoesPage.value).toBe(true);
		expect(state.showRightPane.value).toBe(false);
		expect(state.desktopColumns.value).toBe('minmax(0, 1fr)');
		route.value = { path: '/hatask' };
		expect(state.showRightPane.value).toBe(true);
		expect(state.desktopColumns.value).toBe('64px minmax(0, 1fr) 320px');

		const template = descriptor.template!.content;
		expect(template).toContain('v-if="!isHataGoesPage" data-hata-collapse-part');
		expect(template).toContain(':mode="isHataGoesPage ? \'full\' : workspaceMode"');
	});
});
