/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const shellSource = source('src/pages/settings-redesign/index.vue');
const surfaceSource = source('src/pages/settings-redesign/HatasabaUi2SettingsSurface.vue');
const bodySource = source('src/components/HatasabaUi2SettingsBody.vue');
const gatewaySource = source('src/pages/settings-redesign/gateway.vue');
const viteConfigSource = source('vite.config.ts');

describe('Hataskey UI permanent surface shell integration', () => {
	test('desktop default replaces the legacy glassUi wrapper with the exact permanent editor body', () => {
		expect(shellSource).toContain('<HatasabaUi2SettingsSurface');
		expect(shellSource).toContain('v-if="isHatasabaUi2SurfaceActive"');
		expect(shellSource).toContain('<div v-else :class="$style.legacyContent" @click.capture="onLegacyContentClickCapture"><NestedRouterView/></div>');
		expect(shellSource).toContain('currentPath.value === \'/settings/hata-custom\' && activeHataCustomCategory.value === \'glassUi\'');
		const replace = shellSource.indexOf('router.replace(\'/settings/hata-custom\')');
		const activate = shellSource.indexOf('await activateHataCustomCategory(\'glassUi\', revision)', replace);
		expect(replace).toBeGreaterThan(-1);
		expect(activate).toBeGreaterThan(replace);
		expect(surfaceSource).toContain('mode="permanent"');
		expect(bodySource).toContain('<h2 id="hatasaba-ui2-title"><span class="settingsBrand">Hataskey UI</span></h2>');
		expect(bodySource).toContain('copy.ui2.permanentDescriptionSave');
		expect(viteConfigSource).toContain('filePath: \'src/components/HatasabaUi2SettingsBody.vue\'');
		expect(viteConfigSource).toContain('popup: \'hatasaba-ui2\'');
	});

	test('mobile root stays an overview and its Hataskey UI selection enters the shared draft surface', () => {
		expect(shellSource).toContain('v-if="compact && currentPage?.route.name == null"');
		expect(shellSource).toContain(':featureItem="hataCustomGlassUiItem"');
		expect(shellSource).toContain('@select="goToSetting"');
		expect(shellSource).toContain('const hataCustomGlassUiItem = destinationForId(\'hataskey-ui\')!');
		expect(surfaceSource).toContain('const editor = useHatasabaUi2Draft();');
		expect(bodySource).toContain('if (props.editor.save()) emit(\'saved\');');
	});

	test('an unsaved draft cancels every owned route, category, top, and legacy escape until discard succeeds', () => {
		const requestGuard = shellSource.indexOf('if (!await requestSurfaceDiscardBeforeNavigation(target)) return false;');
		const routePush = shellSource.indexOf('pushShellRoute(path);', requestGuard);
		expect(requestGuard).toBeGreaterThan(-1);
		expect(routePush).toBeGreaterThan(requestGuard);
		expect(shellSource).toContain('if (isHatasabaUi2SurfaceActive.value && category !== \'glassUi\' && !await requestSurfaceDiscard()) return;');
		expect(shellSource).toContain('async function requestOpenLegacy() {\n\tif (!await requestSurfaceDiscard()) return;\n\temit(\'openLegacy\');');
		// ⚠️確認を待つ間に別の画面へ移っていることがあるため、設定にいるときだけ押す。
		//   無条件に押すと、行こうとした先から設定へ引き戻してしまう。
		expect(shellSource).toContain('async function goSettingsTop() {\n\tif (!await requestSurfaceDiscard()) return;');
		expect(shellSource).toContain('if (!isSettingsFullPath(router.getCurrentFullPath())) return;\n\tpushShellRoute(\'/settings\');');
		expect(shellSource).toContain('router.getCurrentFullPath() !== fullPath');
		expect(shellSource).toContain('@click.prevent="goToSetting(profileNavigationItem)"');
		expect(shellSource).toContain('async function runShellAction(id: string)');
		expect(shellSource).toContain('if (!await requestSurfaceDiscard()) return;');
		expect(shellSource).toContain('await settingsShellActions[id as SettingsShellActionId]();');
		expect(surfaceSource).toContain('return editor.discard();');
		expect(surfaceSource).toContain('editor.restoreLivePreviewToSnapshot();');
	});

	test('surface close, save, and side-studio events are shell-owned without changing draft persistence semantics', () => {
		expect(shellSource).toContain('@close="onSurfaceClose"');
		expect(shellSource).toContain('@saved="onSurfaceSaved"');
		expect(shellSource).toContain('@sideStudio="onSurfaceSideStudio"');
		expect(shellSource).toContain('async function onSurfaceClose() {');
		expect(shellSource).toContain('await goSettingsTop();');
		expect(shellSource).toContain('function onSurfaceSaved() {\n\tactiveNavigationTarget.value = null;');
		expect(shellSource).toContain('async function onSurfaceSideStudio() {\n\tif (!await requestSurfaceDiscard()) return;');
		expect(shellSource).toContain('settingsSurfaceLeaveGuard.allowNextNavigation(\'/hata-side-studio\');');
		expect(shellSource).toContain('mainRouter.push(\'/hata-side-studio\');');
		expect(surfaceSource).toContain('@sideStudio="emit(\'sideStudio\')"');
		expect(surfaceSource).not.toContain('prefer.commit(');
	});

	test('the old-settings gateway remains available only after the shell grants the guarded escape', () => {
		expect(shellSource).toContain('@click="requestOpenLegacy"');
		expect(gatewaySource).toContain('<section v-else ref="redesignedRegion"');
		expect(gatewaySource).toContain('<SettingsRedesign @openLegacy="openLegacy"/>');
		expect(gatewaySource).toContain('<section v-if="isLegacyMode" ref="legacyRegion"');
		expect(gatewaySource).toContain('<LegacySettings/>');
		expect(gatewaySource).toContain('function openLegacy() {\n\tisLegacyMode.value = true;');
	});
});
