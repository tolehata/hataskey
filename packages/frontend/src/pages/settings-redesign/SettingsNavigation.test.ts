/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { compileScript, parse } from '@vue/compiler-sfc';
import { describe, expect, test } from 'vitest';
import destinationsSource from './settings-destinations.ts?raw';
import shellSource from './index.vue?raw';

describe('settings redesign navigation contract', () => {
	test('shell SFC parses and compiles, including each navigation section only once', () => {
		const parsed = parse(shellSource, { filename: 'settings-redesign/index.vue' });
		expect(parsed.errors).toEqual([]);
		expect(() => compileScript(parsed.descriptor, { id: 'settings-redesign-index' })).not.toThrow();
		expect(shellSource).not.toMatch(/items: \[\s*items: \[/u);
	});

	test('検索close payloadはselectだけoriginへ戻さず、Tabはorigin基準で前後へ出す', () => {
		expect(shellSource).toContain('function closeSearch(event: SettingsSearchCloseEvent)');
		expect(shellSource).toContain('if (event.reason === \'select\') return;');
		expect(shellSource).toContain('if (event.reason === \'tab\')');
		expect(shellSource).toContain('focusAdjacentTo(origin, event.direction ?? \'next\')');
		expect(shellSource).toContain('if (!focusElement(origin)) focusElement(searchButtonEl.value);');
	});

	test('検索結果はdiscard拒否またはactivation失敗ならpanelを閉じず、承認後だけselect closeする', () => {
		expect(shellSource).toContain('@select="onSearchSelect"');
		expect(shellSource).toContain('async function goToSetting(request: SettingsSearchNavigationTargetV2): Promise<boolean>');
		expect(shellSource).toContain('if (!await requestSurfaceDiscardBeforeNavigation(target)) return false;');
		expect(shellSource).toContain('const navigated = await scheduleNavigationTargetActivation(target, revision, opener);');
		expect(shellSource).toContain('if (navigated) setNavigationNotice(target);');
		expect(shellSource).toContain('return navigated;');
		expect(shellSource).toContain('async function onSearchSelect(target: SettingsSearchNavigationTargetV2)');
		expect(shellSource).toContain('if (await goToSetting(target)) closeSearch({ reason: \'select\' });');
		expect(shellSource).toContain('async function scheduleNavigationTargetActivation(target: SettingsSearchNavigationTargetV2, revision: number, opener: HTMLElement | null): Promise<boolean>');
		expect(shellSource).toContain('if (!activated || revision !== navigationRevision) {');
		expect(shellSource).toContain('return false;');
		expect(shellSource).toContain('const focused = await focusControlAfterNavigation(focusTarget);');
		expect(shellSource).toContain('return focused;');
		expect(shellSource).toContain('const markerFocused = await focusLegacyMarkerAfterNavigation(target.anchor, revision);');
		expect(shellSource).toContain('if (!markerFocused) {');
	});

	test('条件未充足の到達後だけ通知を表示し、stableId由来の設定名とlocale文面を使う', () => {
		expect(shellSource).toContain('<Teleport to="body">');
		expect(shellSource).toContain('<Transition');
		expect(shellSource).toContain('<SettingsNavigationNotice');
		expect(shellSource).toContain('navigationNoticeEnterActive');
		expect(shellSource).toContain('navigationNoticeLeaveActive');
		expect(shellSource).toContain('navigationNoticeLeaveTo');
		expect(shellSource).toContain('@dismiss="clearNavigationNotice"');
		expect(shellSource).toContain('v-if="navigationNoticeMessage != null"');
		expect(shellSource).toContain(':dismissLabel="copy.searchPrerequisite.dismiss"');
		expect(shellSource).toContain(':motionEnabled="motionEnabled"');
		expect(shellSource).toContain('navigationNoticeZIndex');
		expect(shellSource).toContain('os.claimZIndex(\'high\')');
		expect(shellSource).toContain('pointer-events: none');
		expect(shellSource).toContain('safe-area-inset-top');
		expect(shellSource).toContain('descriptorForNavigationTarget');
		expect(shellSource).toContain('if (target.stableId != null)');
		expect(shellSource).toContain('...(descriptor?.unmet ?? [])');
		expect(shellSource).toContain('...(descriptor?.activation?.unmet ?? [])');
		expect(shellSource).toContain('if (navigated) setNavigationNotice(target);');
		expect(shellSource).toContain('navigationNoticeMessage.value = null;');
		expect(shellSource).not.toContain('prefer.commit');
	});

	test('route→typed category→popup→allow-listed reveal→control の順で同一routeにもactivationを実行する', () => {
		const route = shellSource.indexOf('pushShellRoute(path);');
		const schedule = shellSource.indexOf('function scheduleNavigationTargetActivation(target: SettingsSearchNavigationTargetV2, revision: number, opener: HTMLElement | null)');
		const scheduleCall = shellSource.indexOf('scheduleNavigationTargetActivation(target, revision, opener);', route);
		const activate = shellSource.indexOf('const activated = await activateNavigationTarget(target, revision, opener);', schedule);
		const focus = shellSource.indexOf('const focused = await focusControlAfterNavigation(focusTarget);', activate);
		expect(route).toBeGreaterThan(-1);
		expect(scheduleCall).toBeGreaterThan(route);
		expect(schedule).toBeGreaterThan(-1);
		expect(activate).toBeGreaterThan(schedule);
		expect(focus).toBeGreaterThan(activate);
		expect(shellSource).toContain('function activationSteps(activation: SettingsActivation)');
		expect(shellSource).toContain('for (const step of steps)');
		expect(shellSource).toContain('if (step.kind === \'category\')');
		expect(shellSource).toContain('if (step.kind === \'popup\')');
		expect(shellSource).toContain('if (!await activateSettingsReveal(step.id, revision)) return false;');
		expect(shellSource).toContain('if (activationHasUnmetPrerequisite) continue;');
		expect(shellSource).toContain('if (stepOrder < previousStepOrder) return false;');
		expect(shellSource).toContain('if (activeSettingsPopup != null) return activeSettingsPopup.popup === popup;');
		expect(shellSource).toContain('if (step.id === \'glassUi\' && isHatasabaUi2SurfaceActive.value)');
		expect(shellSource).toContain('waiting for the old DOM here would otherwise incur a 2500ms timeout');
	});

	test('hashなし旧hata-custom直URLは常設glassUi、既知hashは一度だけcatalog activationへ渡す', () => {
		expect(shellSource).toContain('const initiallyOpenHatasabaUi2Surface = isHataCustomPath(router.getCurrentFullPath())');
		expect(shellSource).toContain('initiallyOpenHatasabaUi2Surface ? \'glassUi\' : null');
		expect(shellSource).toContain('function syncHataCustomRoutePresentation()');
		expect(shellSource).toContain('const descriptor = catalog.value.byLegacyId.get(legacyId);');
		expect(shellSource).toContain('if (descriptor.activation == null) {');
		expect(shellSource).toContain('activeHataCustomCategory.value = null;');
		expect(shellSource).toContain('appliedHataCustomDeepLink === fullPath');
		expect(shellSource).toContain('const target: SettingsSearchNavigationTargetV2 = {');
		expect(shellSource).toContain('closeIrrelevantSettingsPopup(target);');
		expect(shellSource).toContain('scheduleNavigationTargetActivation(target, revision, null);');
		expect(shellSource).toContain('syncHataCustomRoutePresentation();');
	});

	test('常設glassUiから別カテゴリへは旧wrapperを先に再mountしてからexact category buttonを押す', () => {
		const remount = shellSource.indexOf('if (category !== \'glassUi\' && isHatasabaUi2SurfaceActive.value)');
		const setCategory = shellSource.indexOf('activeHataCustomCategory.value = category;', remount);
		const waitForButton = shellSource.indexOf('const button = await waitForExactNavigationElement', remount);
		expect(remount).toBeGreaterThan(-1);
		expect(setCategory).toBeGreaterThan(remount);
		expect(waitForButton).toBeGreaterThan(setCategory);
		expect(shellSource).toContain('await nextTick();\n		if (revision !== navigationRevision) return false;');
	});

	test('related popup navigation retains only the same bridge and closes a different one without opener focus', () => {
		expect(shellSource).toContain('function popupForNavigationTarget(target: SettingsSearchNavigationTargetV2)');
		expect(shellSource).toContain('function closeIrrelevantSettingsPopup(target: SettingsSearchNavigationTargetV2)');
		expect(shellSource).toContain('closeSettingsPopup(active, false);');
		expect(shellSource).toContain('function closeSettingsPopup(state: ActiveSettingsPopup, restoreOpener = true)');
		expect(shellSource).toContain('if (restoreOpener) restorePopupOpener(state.opener);');
		expect(shellSource).toContain('closeIrrelevantSettingsPopup(target);');
	});

	test('legacy領域のdirect launcherは新shellのcaptureで止め、bridgeへ一度だけ渡す', () => {
		expect(shellSource).toContain('@click.capture="onLegacyContentClickCapture"');
		expect(shellSource).toContain('function onLegacyContentClickCapture(event: MouseEvent)');
		expect(shellSource).toContain('[data-settings-popup-launcher]');
		expect(shellSource).toContain('event.stopPropagation();');
		expect(shellSource).toContain('void openSettingsPopup(popup, launcher);');
		expect(shellSource).toContain('restorePopupOpener(state.opener);');
	});

	test('body全体を2500msだけ監視し、disabled controlはheading/rootへ退避する', () => {
		expect(shellSource).toContain('import { waitForSettingsNavigationFocus } from \'./settings-navigation-focus.js\';');
		expect(shellSource).toContain('const waiter = waitForSettingsNavigationFocus({');
		expect(shellSource).toContain('find: () => exactNavigationElement(Array.from(window.document.querySelectorAll<HTMLElement>(`[${attribute}]`))');
		expect(shellSource).toContain('isCurrent: () => revision === controlFocusRevision && targetNavigationRevision === navigationRevision');
		expect(shellSource).toContain('getControlFallbackFocusTarget(target)');
		expect(shellSource).toContain('!element.closest(\'[data-settings-related]\')');
		expect(shellSource).toContain('scroll-margin-block: 96px');
		expect(shellSource).toContain('cancelPendingNavigation();');
		expect(shellSource).toContain('focusTarget.kind === \'group\' ? \'data-settings-search-group-id\' : \'data-settings-search-id\'');
		expect(shellSource).toContain('function exactNavigationElement(elements: HTMLElement[])');
		expect(shellSource).toContain('[data-settings-reveal-id]');
		expect(shellSource).toContain('[data-in-app-search-marker-id]');
		expect(shellSource).toContain('async function focusLegacyMarkerAfterNavigation(markerId: string, revision: number): Promise<boolean>');
	});

	test('folder disclosure targetはroute変更・focus完了・timeoutで消費して残さない', () => {
		expect(shellSource).toContain('const activeTarget = activeTargetForNavigation(target, focusTarget);');
		expect(shellSource).toContain('activeNavigationTarget.value = activeTarget;');
		expect(shellSource).toContain('if (activeTarget != null) clearActiveNavigationTarget(activeTarget);');
		expect(shellSource).toContain('window.setTimeout(() => clearActiveNavigationTarget(target), 2500)');
		expect(shellSource).toContain('function activeNavigationTargetMatchesCurrentPath()');
		expect(shellSource).toContain('if (!activeNavigationTargetMatchesCurrentPath()) activeNavigationTarget.value = null;');
		expect(shellSource).toContain('if (event.isTrusted) {\n			cancelPendingNavigation();\n			activeNavigationTarget.value = null;');
	});

	test('Hataskey category navとcurrent valueは実在category/popupへ向ける', () => {
		for (const category of ['glassUi', 'font', 'hatask', 'hatady', 'mascot', 'earthquake', 'general']) {
			expect(destinationsSource).toContain('category: \'' + category + '\'');
		}
		expect(shellSource).toContain('popup: \'hatasaba-ui2\'');
		expect(shellSource).toContain('glassUiBubbleLocal.value ? i18n.ts.on : i18n.ts.off');
		expect(shellSource).toContain('noteGap ? copy.values.spread : copy.values.compact');
		expect(shellSource).toContain('copyx.values.bottomNavigationCount({ count: visibleBottomNavigationCount, max: HATASABA_BOTTOM_NAV_MAX })');
		expect(shellSource).toContain('await initIntlString(true)');
		expect(shellSource).toContain('controlId: preferenceNavigationTargets.density');
		expect(shellSource).toContain('controlId: preferenceNavigationTargets.postForm');
		expect(shellSource).toContain('controlId: preferenceNavigationTargets.chat');
	});

	test('same-route preference shortcutはcatalog読込時にexact-one・route・設定キーをfail-fast検証する', () => {
		for (const [name, preferenceKey] of [
			['density', 'showGapBetweenNotesInTimeline'],
			['noteDisplay', 'showReplyTargetNote'],
			['postForm', 'showFixedPostForm'],
			['chat', 'chat.sendOnEnter'],
		]) {
			expect(shellSource).toContain(`${name}: generatedPreferenceSearchId('${preferenceKey}')`);
			expect(shellSource).toContain(`{ controlId: preferenceNavigationTargets.${name}, preferenceKey: '${preferenceKey}' }`);
		}
		expect(shellSource).toContain('function assertPreferenceNavigationTargets(nextCatalog: ReturnType<typeof buildSettingsCatalogV2>)');
		expect(shellSource).toContain('descriptor.source === \'control\'');
		expect(shellSource).toContain('descriptor.controlId === controlId');
		expect(shellSource).toContain('match.route !== \'/settings/preferences\'');
		expect(shellSource).toContain('!match.preferenceKeys.includes(preferenceKey)');
		const build = shellSource.indexOf('const nextCatalog = buildSettingsCatalogV2(');
		const assertion = shellSource.indexOf('assertPreferenceNavigationTargets(nextCatalog);', build);
		const assign = shellSource.indexOf('catalog.value = nextCatalog;', assertion);
		expect(build).toBeGreaterThan(-1);
		expect(assertion).toBeGreaterThan(build);
		expect(assign).toBeGreaterThan(assertion);
	});

	test('3つの表示範囲pillと破壊的実操作は検索実行から分離する', () => {
		for (const key of ['all', 'frequent', 'deviceOnly']) expect(shellSource).toContain(`label: copy.filters.${key}`);
		expect(shellSource).toContain('activeSettingsFilter = filter.id');
		expect(shellSource).toContain('const visibleNavSections = computed<NavSection[]>');
		expect(shellSource).toContain('searchId: \'settings.shell.clear-cache\'');
		expect(shellSource).toContain('searchId: \'settings.shell.logout\'');
		expect(shellSource).toContain('searchId: \'settings.shell.logout-all\'');
		expect(shellSource).toContain('data-settings-search-destructive="true"');
		expect(shellSource).toContain('@click="runShellAction(item.id)"');
		expect(shellSource).toContain('function navigationPathForTarget(target: SettingsSearchNavigationTargetV2, focusTarget: NavigationFocusTarget | null)');
		expect(shellSource).toContain('focusTarget.id === \'settings.shell.logout\'');
		expect(shellSource).toContain('!compact.value && currentPath.value.startsWith(\'/settings/\')');
	});

	test('よく使う設定はprimary判定と分離し、6つのquick導線と現行IAの明示4件だけを残す', () => {
		const promotedBlock = shellSource.match(/const frequentNavigationItemIds = new Set\(\[([\s\S]*?)\]\);/u)?.[1] ?? '';
		const promotedIds = [...promotedBlock.matchAll(/'([^']+)'/gu)].map(match => match[1]);
		const navItemIds = [...destinationsSource.matchAll(/destination\('([^']+)'/gu)].map(match => match[1]);
		expect(promotedIds).toEqual([
			'hataskey-ui',
			'display-theme',
			'timeline-display',
			'account-profile',
		]);
		expect(navItemIds.length).toBeGreaterThan(promotedIds.length);
		for (const id of promotedIds) expect(destinationsSource).toContain('destination(\'' + id + '\'');
		expect(shellSource).toContain('isQuickItem || frequentNavigationItemIds.has(item.id)');
		expect(shellSource).not.toContain('isQuickItem || item.primary === true');
		const quickBlock = shellSource.match(/const quickItems: NavItem\[\] = \[([\s\S]*?)\];/u)?.[1] ?? '';
		const quickIds = [...quickBlock.matchAll(/destinationForId\('([^']+)'\)!/gu)].map(match => match[1]);
		expect(quickIds).toEqual(['notifications-page', 'notifications-sounds', 'display-theme', 'account-mute', 'account-drive', 'account-security']);
	});

	test('tablet navは専用Hataskey UI行を除く現行8カテゴリとicon-only quick gridを保ち、各カテゴリをdrill-inできる', () => {
		expect(shellSource).toContain('@container (max-width: 900px)');
		expect(shellSource).toContain('.quickGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }');
		expect(shellSource).toContain('.quickItem > span { display: none; }');
		expect(shellSource).toContain(':aria-label="item.label"');
		expect(shellSource).toContain('const tabletNavSections = computed<NavSection[]>');
		for (const label of ['copy.nav.appearance', 'copy.nav.timelineAndPosts', 'copy.catalog.categories.notificationSound', 'copy.nav.hataTools', 'copy.nav.cherrypick', 'copy.nav.data', 'copy.nav.misskey', 'label: \'HataSNSCordUI\'']) {
			expect(destinationsSource).toContain(label);
		}
		expect(shellSource).toContain('<button v-for="section in tabletNavSections"');
		expect(shellSource).toContain('openTabletNavigationSection(section.id)');
		expect(shellSource).toContain('tabletActiveNavigationSection.items');
		expect(shellSource).toContain('min-height: 48px');
	});

	test('tablet drill-in restores keyboard focus to the exact opening category and moves it to the detail back button', () => {
		expect(shellSource).toContain(':data-settings-tablet-category-id="section.id"');
		expect(shellSource).toContain('ref="tabletSectionBackEl"');
		expect(shellSource).toContain('function tabletCategoryButton(id: string)');
		expect(shellSource).toContain('async function openTabletNavigationSection(id: string | null)');
		const drillIn = shellSource.indexOf('async function openTabletNavigationSection(id: string | null)');
		const state = shellSource.indexOf('tabletNavigationSection.value = id;', drillIn);
		const tick = shellSource.indexOf('await nextTick();', state);
		const detailFocus = shellSource.indexOf('focusElement(tabletSectionBackEl.value);', tick);
		const returnFocus = shellSource.indexOf('focusElement(tabletCategoryButton(previousId));', detailFocus);
		expect(state).toBeGreaterThan(drillIn);
		expect(tick).toBeGreaterThan(state);
		expect(detailFocus).toBeGreaterThan(tick);
		expect(returnFocus).toBeGreaterThan(detailFocus);
	});

	test('破壊的shell actionはUI2ドラフトのdiscard承認後だけ既存confirmationへ渡す', () => {
		const actionStart = shellSource.indexOf('async function runShellAction(id: string)');
		const discard = shellSource.indexOf('if (!await requestSurfaceDiscard()) return;', actionStart);
		const action = shellSource.indexOf('await settingsShellActions[id as SettingsShellActionId]();', discard);
		expect(actionStart).toBeGreaterThan(-1);
		expect(discard).toBeGreaterThan(actionStart);
		expect(action).toBeGreaterThan(discard);
	});

	test('compact and tablet surface hierarchy follows the mock instead of retaining desktop cards', () => {
		expect(shellSource).toContain('v-if="!isHatasabaUi2SurfaceActive" ref="searchButtonEl"');
		expect(shellSource).toContain('[$style.contentCard, { [$style.contentCardSurfaceActive]: isHatasabaUi2SurfaceActive }]');
		expect(shellSource).toContain('.contentCard.contentCardSurfaceActive { min-height: 0; border: 0; border-radius: 0; padding: 0; background: transparent; box-shadow: none; }');
		expect(shellSource).toContain('.nav { border: 0; border-radius: 0; padding: 0; background: transparent; box-shadow: none; }');
		expect(shellSource).toContain('.compactHeader { display: block; border-bottom: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); background: var(--settings-surface, var(--MI_THEME-panel)); }');
		expect(shellSource).toContain('.compactHeader .searchTrigger { width: 100%; margin-top: 10px; background: var(--settings-bg, var(--MI_THEME-bg)); box-shadow: none; }');
		// 旗鯖fork: ⚠️選択中は塗りつぶさない。Hataskey UI の上部タブと同じく
		//   アクセント色の文字＋淡い下地で示す。
		expect(shellSource).toContain('.tabletPrimaryLink.navLinkActive { border-color: var(--MI_THEME-accent); background: color-mix(in srgb, var(--MI_THEME-accent) 12%, transparent); color: var(--MI_THEME-accent); font-weight: 750; }');
		expect(shellSource).toContain('.tabletCategoryLink, .tabletSectionBack, .navLink { background: var(--settings-surface, var(--MI_THEME-panel)); }');
	});

	test('desktop二ペインは独立scrollで、現在カテゴリだけをaccordion展開できる', () => {
		expect(shellSource).toContain('ref="navEl"');
		expect(shellSource).toContain('grid-template-rows: auto minmax(0, 1fr)');
		expect(shellSource).toContain('box-sizing: border-box');
		expect(shellSource).toContain('block-size: calc(100cqh - (var(--MI-stickyTop, 0px) + var(--MI-stickyBottom, 0px)))');
		expect(shellSource).toContain('.layout { min-block-size: 0; display: grid; grid-template-columns: minmax(226px, 272px) minmax(0, 1fr); align-items: stretch; gap: 22px; overflow: clip; padding: 0 22px 24px; }');
		expect(shellSource).toContain('.nav { min-block-size: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding: 14px; padding-inline-end: 20px; }');
		expect(shellSource).toContain('.main { min-width: 0; min-block-size: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding-inline-end: 8px; outline: 0; }');
		expect(shellSource).toContain('const expandedDesktopNavigationSectionIds = ref<Set<string>>(new Set(activeNavigationSectionIds.value));');
		expect(shellSource).toContain('watch(activeNavigationSectionIds, activeIds => {');
		expect(shellSource).toContain('expandedDesktopNavigationSectionIds.value = new Set(activeIds);');
		expect(shellSource).toContain(':open="expandedDesktopNavigationSectionIds.has(section.id)"');
		expect(shellSource).toContain('@toggle="onDesktopNavigationSectionToggle(section.id, $event)"');
		expect(shellSource).toContain('function onDesktopNavigationSectionToggle(id: string, event: Event)');
		expect(shellSource).toContain('const isExpanded = expandedDesktopNavigationSectionIds.value.has(id);');
		expect(shellSource).toContain('if (details.open === isExpanded) return;');
		expect(shellSource).toContain('const next = details.open');
		expect(shellSource).toContain('? new Set([id])');
		expect(shellSource).toContain(': new Set(expandedDesktopNavigationSectionIds.value);');
		expect(shellSource).toContain('if (!details.open) next.delete(id);');
		expect(shellSource).toContain('const nav = navEl.value;');
		expect(shellSource).toContain('nav.scrollTo({ top: Math.max(0, top), behavior: motionEnabled.value ? \'smooth\' : \'auto\' });');
		expect(shellSource).toContain('ti ti-chevron-right');
		expect(shellSource).toContain('.navSection[open] > .sectionTitle > i:last-child { transform: rotate(90deg); }');
		expect(shellSource).not.toContain(':open="true"');
	});

	test('通常の左nav遷移だけは右pane先頭へ戻し、検索controlとanchorの中心focusを保つ', () => {
		const schedule = shellSource.indexOf('async function scheduleNavigationTargetActivation(target: SettingsSearchNavigationTargetV2, revision: number, opener: HTMLElement | null)');
		const control = shellSource.indexOf('if (focusTarget != null) {', schedule);
		const controlFocus = shellSource.indexOf('const focused = await focusControlAfterNavigation(focusTarget);', control);
		const ordinary = shellSource.indexOf('if (target.anchor == null) {', controlFocus);
		const scrollTop = shellSource.indexOf('mainEl.value?.scrollTo({ top: 0, behavior: \'auto\' });', ordinary);
		const ordinaryFocus = shellSource.indexOf('mainEl.value?.focus({ preventScroll: true });', scrollTop);
		const anchorFocus = shellSource.indexOf('const markerFocused = await focusLegacyMarkerAfterNavigation(target.anchor, revision);', ordinaryFocus);
		expect(schedule).toBeGreaterThan(-1);
		expect(control).toBeGreaterThan(schedule);
		expect(controlFocus).toBeGreaterThan(control);
		expect(ordinary).toBeGreaterThan(controlFocus);
		expect(scrollTop).toBeGreaterThan(ordinary);
		expect(ordinaryFocus).toBeGreaterThan(scrollTop);
		expect(anchorFocus).toBeGreaterThan(ordinaryFocus);
	});

	test('desktop profile横のHataskey導線は廃止し、tablet導線と操作buttonの高さは保つ', () => {
		expect(shellSource).not.toContain('$style.hataEntry');
		expect(shellSource).toContain('<MkA :to="hataCustomGlassUiItem.route" :class="[$style.navLink, $style.tabletPrimaryLink, { [$style.navLinkActive]: isActive(hataCustomGlassUiItem) }]"');
		expect(shellSource).toContain('.uiPill { min-height: 36px; padding: 6px 10px;');
		expect(shellSource).toContain('.legacyTop { min-height: 44px; padding: 8px 14px; }');
	});

	test('サービス連携は専用surfaceを開き、関連導線はページ末尾だけに集約する', () => {
		expect(shellSource).toContain('import SettingsServiceConnectionSurface from \'./SettingsServiceConnectionSurface.vue\';');
		expect(shellSource).toContain('const isServiceConnectionSurfaceActive = computed(() => currentPath.value === \'/settings/connect\');');
		expect(shellSource).toContain('v-else-if="isServiceConnectionSurfaceActive"');
		expect(shellSource).toContain('<SettingsServiceConnectionSurface');
		expect(shellSource).toContain('inlineRelated: false');
		expect(shellSource).toContain('\'/settings/profile\': [\'/settings/avatar-decoration\']');
		expect(shellSource).toContain('pageOwnedRelatedRoutes[currentPath.value]?.includes(related.route) === true');
	});

	test('compact overview preview waits for the route-mounted permanent surface and never opens a second draft', () => {
		const previewStart = shellSource.indexOf('async function openHatasabaUi2Preview()');
		const navigate = shellSource.indexOf('await goToSetting(hataCustomGlassUiItem);', previewStart);
		const wait = shellSource.indexOf('const surface = await waitForHatasabaUi2Surface();', previewStart);
		const open = shellSource.indexOf('surface?.openPreview();', previewStart);
		expect(previewStart).toBeGreaterThan(-1);
		expect(navigate).toBeGreaterThan(previewStart);
		expect(wait).toBeGreaterThan(navigate);
		expect(open).toBeGreaterThan(wait);
		expect(shellSource).toContain('function waitForHatasabaUi2Surface(): Promise<HatasabaUi2SurfaceHandle | null>');
		expect(shellSource).toContain('watch(() => [isHatasabaUi2SurfaceActive.value, hatasabaSurface.value], check, { flush: \'post\' });');
		expect(shellSource).toContain('timeout = window.setTimeout(() => finish(null), 2500);');
		expect(shellSource).toContain('return isHatasabaUi2SurfaceActive.value ? hatasabaSurface.value ?? null : null;');
	});

	test('navigation item IDs are fail-fast unique and the shared profile target is not duplicated in account navigation', () => {
		expect(shellSource).toContain('import { assertUniqueNavigationIds } from \'./settings-navigation-ids.js\';');
		expect(shellSource).toContain('assertUniqueNavigationIds(navSections);');
		expect(shellSource).toContain('const profileNavigationItem = destinationForId(\'account-profile\')!');
		expect(shellSource).toContain('@click.prevent="goToSetting(profileNavigationItem)"');
		expect(destinationsSource.match(/destination\('account-profile'/gu)).toHaveLength(1);
		expect(destinationsSource.match(/destination\('account-plugins'/gu)).toHaveLength(1);
	});

	test('removed preference control ids are rewritten at catalog construction and both navigation lookup entry points', () => {
		expect(shellSource).toContain('redesignedPreferenceStableIdAliases(generatedControlItems)');
		expect(shellSource).toContain('canonicalStableIdForCatalogV2(catalog.value, request.stableId)');
		expect(shellSource).toContain('canonicalStableIdForCatalogV2(catalog.value, request.controlId)');
		expect(shellSource).toContain('canonicalStableIdForCatalogV2(catalog.value, target.stableId)');
		expect(shellSource).toContain('canonicalStableIdForCatalogV2(catalog.value, target.controlId)');
		const loadStart = shellSource.indexOf('async function loadCatalog()');
		const tryStart = shellSource.indexOf('\ttry {', loadStart);
		const merge = shellSource.indexOf('const controlItems = mergeRedesignedPreferenceSearchItems(generatedControlItems);', loadStart);
		const aliases = shellSource.indexOf('const stableIdAliases = redesignedPreferenceStableIdAliases(generatedControlItems);', merge);
		const destinations = shellSource.indexOf('const destinationItems = settingsDestinationCatalogItemsV2();', aliases);
		const build = shellSource.indexOf('buildSettingsCatalogV2(legacyItems, controlItems, settingsCatalogPresentation, destinationItems, stableIdAliases)', destinations);
		const catchStart = shellSource.indexOf('} catch (error) {', build);
		const errorState = shellSource.indexOf('catalogState.value = \'error\';', catchStart);
		expect(tryStart).toBeGreaterThan(loadStart);
		expect(merge).toBeGreaterThan(tryStart);
		expect(aliases).toBeGreaterThan(merge);
		expect(destinations).toBeGreaterThan(aliases);
		expect(build).toBeGreaterThan(destinations);
		expect(catchStart).toBeGreaterThan(build);
		expect(errorState).toBeGreaterThan(catchStart);
	});
});
