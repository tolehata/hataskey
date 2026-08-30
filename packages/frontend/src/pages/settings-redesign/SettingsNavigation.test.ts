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
		expect(shellSource).toContain('if (!focusElement(origin)) focusElement(searchAnchorEl.value);');
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

	test('Hataskey category navは実在category/popupへ向ける', () => {
		for (const category of ['glassUi', 'font', 'hatask', 'hatady', 'mascot', 'earthquake', 'general']) {
			expect(destinationsSource).toContain('category: \'' + category + '\'');
		}
		// ⚠️popup を指す記述は「いまの値をすぐ変える」節にしかなく、節ごと外した。
		//   受け口そのものは残っているので、そちらを見る。
		expect(shellSource).toContain("value === 'hatasaba-ui2'");
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

	test('幅で作りを変えず、左ペインは大分類・詳細・帯の3つの姿を持つ', () => {
		// 旗鯖fork: ⚠️タブレット専用の下位一覧は廃止した。PC と同じ姿に揃える。
		//   ⚠️戻すと「左に項目一覧・右上に同じ項目のタブ」の二重表示に逆戻りする。
		expect(shellSource).not.toContain('tabletNavSections');
		expect(shellSource).not.toContain('openTabletNavigationSection');
		expect(shellSource).not.toContain('tabletActiveNavigationSection');
		expect(shellSource).not.toContain('data-settings-tablet-category-id');

		expect(shellSource).toContain("type SettingsNavPaneMode = 'categories' | 'detail' | 'rail';");
		expect(shellSource).toContain("const navPaneMode = ref<SettingsNavPaneMode>('categories');");
		expect(shellSource).toContain("<div v-if=\"navPaneMode === 'rail'\" :class=\"$style.rail\" data-settings-nav-rail>");
		expect(shellSource).toContain("<nav v-if=\"navPaneMode === 'categories'\" key=\"categories\"");
		expect(shellSource).toContain('key="detail"');
	});

	test('分類を選んだら帯へ畳み、帯から2つの入口で取り戻せる', () => {
		// 旗鯖fork: ⚠️分類を選んでも自動では畳まないこと。隣の分類へ移りたいだけなのに
		//   毎回開き直すことになり、かえって手数が増える。畳むのは利用者の操作で。
		const open = shellSource.indexOf('async function openNavigationSection(section: NavSection): Promise<void> {');
		expect(open).toBeGreaterThan(-1);
		expect(shellSource.slice(open, open + 600)).not.toContain("navPaneMode.value = 'rail';");
		expect(shellSource).toContain('data-settings-nav-collapse');
		// ⚠️開いた直後に左ペインを動かさないこと。プロフィール行が画面外へ隠れる。
		expect(shellSource).toContain('let sectionRevealArmed = false;');

		// ⚠️帯には「大分類へ戻る」と「この分類の項目を開く」の2つ。
		expect(shellSource).toContain('data-settings-nav-rail-action="categories"');
		expect(shellSource).toContain('data-settings-nav-rail-action="detail"');
		// ⚠️項目が1つだけの分類では詳細の入口を出さない。同じ画面しか並ばない。
		expect(shellSource).toContain('data-settings-nav-rail-action="detail"');
		// ⚠️押せない飾りを帯に置かないこと。光っているのに反応せず戸惑わせる。
		expect(shellSource).not.toContain('$style.railMark');
		// ⚠️畳んだときは器ごと細くすること。
		expect(shellSource).toContain(".layout[data-nav-mode='rail'] { grid-template-columns: 64px minmax(0, 1fr); }");
		// ⚠️grid-template-columns に transition を掛けないこと。トラックの形が違って
		//   補間できず、値が古いまま張り付いて畳めなくなる（実測で確認）。
		expect(shellSource).not.toContain('transition: grid-template-columns');
		// ⚠️詳細を開いたら見出しへ焦点を移す。
		expect(shellSource).toContain('void nextTick(() => focusElement(navDetailBackEl.value));');
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
		// 旗鯖fork: ⚠️狭い幅の詳細ページでは検索窓を虫眼鏡へ畳む。
		// 旗鯖fork: ⚠️狭い幅の詳細ページでは検索窓を虫眼鏡へ畳む。
		expect(shellSource).toContain('const compactSearchCollapsed = computed(() => compact.value && currentPage.value?.route.name != null);');
		// ⚠️v-if で出し入れしないこと。Transition の leave が終わらず、窓が
		//   `leave-from` のまま画面に残り続けた（実測: 3秒待っても消えない）。
		//   ⚠️常に置いて、CSSだけで畳む。
		expect(shellSource).toContain(':data-collapsed="compactSearchCollapsed ? \'true\' : \'false\'"');
		expect(shellSource).toContain(".compactHeader .searchTrigger[data-collapsed='true'] { min-height: 0; height: 0;");
		expect(shellSource).toContain(".compactSearchIcon[data-collapsed='false'] { width: 0;");
		expect(shellSource).not.toContain('settings-search-expand');
		expect(shellSource).not.toContain('settings-search-shrink');
		expect(shellSource).toContain('[$style.contentCard, { [$style.contentCardSurfaceActive]: isHatasabaUi2SurfaceActive }]');
		expect(shellSource).toContain('.contentCard.contentCardSurfaceActive { min-height: 0; border: 0; border-radius: 0; padding: 0; background: transparent; box-shadow: none; }');
		expect(shellSource).toContain('.nav { border: 0; border-radius: 0; padding: 0; background: transparent; box-shadow: none; }');
		expect(shellSource).toContain('.compactHeader { display: block; border-bottom: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent)); background: var(--settings-surface, var(--MI_THEME-panel)); }');
		expect(shellSource).toContain('.compactHeader .searchTrigger { width: 100%; margin-top: 10px; background: var(--settings-bg, var(--MI_THEME-bg)); box-shadow: none; }');
		// 旗鯖fork: ⚠️選択中は塗りつぶさない。Hataskey UI の上部タブと同じく
		//   アクセント色の文字＋淡い下地で示す。
		expect(shellSource).toContain('.detailBack, .navLink { background: var(--settings-surface, var(--MI_THEME-panel)); }');
	});

	test('desktop二ペインは独立scrollで、左は大分類の錠剤リスト・右は兄弟タブを持つ', () => {
		expect(shellSource).toContain('ref="navEl"');
		expect(shellSource).toContain('grid-template-rows: auto minmax(0, 1fr)');
		expect(shellSource).toContain('box-sizing: border-box');
		expect(shellSource).toContain('block-size: calc(100cqh - (var(--MI-stickyTop, 0px) + var(--MI-stickyBottom, 0px)))');
		expect(shellSource).toContain('.layout { min-block-size: 0; display: grid; grid-template-columns: minmax(226px, 272px) minmax(0, 1fr); align-items: stretch; gap: 22px; overflow: clip; padding: 0 22px 24px; }');
		// 旗鯖fork: ⚠️左右の余白は同じ幅にすること。非対称だと中身の中央が
		//   器の中央から3pxずれ、見出しが左寄せに見える（実測: ずれ -3px）。
		expect(shellSource).toContain('.nav { min-block-size: 0; overflow-y: auto; overscroll-behavior: contain; padding: 14px 20px; }');
		expect(shellSource).toContain('.main { min-width: 0; min-block-size: 0; overflow-y: auto; overscroll-behavior: contain; padding-inline-end: 8px; outline: 0; }');
		// 旗鯖fork: ⚠️スクロールバーは出さない（手本は Hataskey UI のサイドメニュー）。
		//   ⚠️2つの仕組みを両方書くこと。片方だけだと片方のブラウザで出たままになる。
		expect(shellSource).toContain('.nav, .main {\n\tscrollbar-width: none;\n}');
		expect(shellSource).toContain('.nav::-webkit-scrollbar, .main::-webkit-scrollbar {');
		// 旗鯖fork: ⚠️左ペインは大分類だけを持つ。折りたたみ(details)は廃止した。
		//   ⚠️分類の中の項目を左にも出すと、同じ項目が2階層へ重複する。
		expect(shellSource).not.toContain('<details');
		expect(shellSource).not.toContain('expandedDesktopNavigationSectionIds');
		expect(shellSource).not.toContain('onDesktopNavigationSectionToggle');
		expect(shellSource).toContain(':class="$style.sectionPills"');
		expect(shellSource).toContain('@click="openNavigationSection(section)"');
		expect(shellSource).toContain('async function openNavigationSection(section: NavSection): Promise<void> {');
		expect(shellSource).toContain('requestedSectionId.value = section.id;');
		expect(shellSource).toContain('if (item != null) await goToSetting(item);');

		// ⚠️選んでいる分類は、経路と選択要求の両方から決める。
		//   経路だけだとポップアップ項目で分類が動かず、選択要求だけだと
		//   検索から直接飛んだときに左が追従しない。
		expect(shellSource).toContain('const activeSectionId = computed<string | null>(() => {');
		expect(shellSource).toContain('const [activeId] = activeNavigationSectionIds.value;');
		expect(shellSource).toContain('if (activeId != null) return activeId;');
		expect(shellSource).toContain('if (requestedSectionId.value != null) return requestedSectionId.value;');

		// ⚠️右ペインの兄弟タブは、選んでいる分類の項目そのもの。
		expect(shellSource).toContain('const siblingTabs = computed<NavItem[]>(() => activeNavSection.value?.items ?? []);');
		expect(shellSource).toContain('v-if="siblingTabs.length > 1"');
		expect(shellSource).toContain(':data-stuck="siblingTabsStuck ? \'true\' : \'false\'"');

		// ⚠️目印は .main の直下。カードの中だと sticky が抜けた時点で消える。
		expect(shellSource).toContain('ref="siblingTabsSentinel"');
		expect(shellSource).toContain('}, { root: mainEl.value ?? null, threshold: 0 });');

		// ⚠️選択中は塗りつぶさない。アクセント色の文字＋淡い下地で示す。
		expect(shellSource).toContain('.sectionPill[data-active=\'true\'], .sectionPill[data-active=\'true\']:hover { background: color-mix(in srgb, var(--MI_THEME-accent) 12%, transparent); color: var(--MI_THEME-accent); font-weight: 800; box-shadow: inset 3px 0 0 var(--MI_THEME-accent); }');
		// 旗鯖fork: ⚠️兄弟タブはアクセントの補色。本文の操作と同じ色にしないこと。
		//   ⚠️相対色構文が効かない環境ではアクセント色へ落ちる（落ちても壊れない）。
		expect(shellSource).toContain('.siblingTabs { --hata-tab-accent: var(--MI_THEME-accent); }');
		expect(shellSource).toContain('@supports (color: hsl(from red h s l))');
		expect(shellSource).toContain('--hata-tab-accent: hsl(from var(--MI_THEME-accent) calc(h + 180) s l);');
		expect(shellSource).toContain('color: var(--hata-tab-accent); font-weight: 750;');

		// ⚠️選んだ分類が左ペインの外に居るときだけ寄せる。毎回動かさない。
		expect(shellSource).toContain('function revealActiveSectionPill(id: string) {');
		expect(shellSource).toContain('} else {');
		expect(shellSource).toContain('nav.scrollTo({ top: Math.max(0, top), behavior: motionEnabled.value ? \'smooth\' : \'auto\' });');
	});

	test('右ペインの中身は差し替えず、常に置いたままにする', () => {
		// 旗鯖fork: ⚠️Transition で右ペインごと差し替えないこと。
		//   ⚠️ウィンドウの最大化を切り替えると幅の判定(compact)が反転し、鍵が変わって
		//   出入りの遷移が走る。その遷移が終わらないと**右ペインが白いまま二度と
		//   描かれなくなり、左から何を選んでも白いまま**になる（実際に起きた）。
		expect(shellSource).not.toContain('settings-page-forward');
		expect(shellSource).not.toContain("compact ? currentPath : 'settings-pane'");
		// ⚠️動きは使い捨てのアニメーションで出す。途中で止まっても中身は残る。
		expect(shellSource).toContain(':data-page-enter="pageEnterDirection ?? undefined"');
		expect(shellSource).toContain("@keyframes settingsPageForward");
		expect(shellSource).toContain(".contentCard[data-page-enter='forward'] { animation: settingsPageForward 240ms");
	});

	test('絞り込みは1つの錠剤ケースで、畳むボタンは独立した丸にする', () => {
		// 旗鯖fork: ⚠️並のボタンを横に並べただけだと、幅が足りない環境で2段に折り返す。
		expect(shellSource).toContain('data-settings-filter-case');
		expect(shellSource).toContain('.filterPills { display: flex; min-width: 0; max-width: 100%; align-items: center; gap: 2px; flex-wrap: nowrap;');
		// ⚠️選択中は塗りつぶさない。
		expect(shellSource).toContain(".filter[data-active='true'], .filter[data-active='true']:hover { background: color-mix(in srgb, var(--MI_THEME-accent) 12%, transparent); color: var(--MI_THEME-accent); font-weight: 800; }");
		// ⚠️畳むボタンはケースの外。
		expect(shellSource).toContain('<div :class="$style.filterRow">');
		expect(shellSource).toContain('data-settings-nav-collapse');
	});

	test('1つの宣言の中で同じ指定を二度書かない', () => {
		// 旗鯖fork: ⚠️1行に詰めた宣言へ後から足すと、同じ指定が二重に入りやすい。
		//   ⚠️CSSは後勝ちなので、前に書いた指定が黙って打ち消される。
		//   実際に .quickItem で `text-align: center` の後ろに `text-align: start` が
		//   残り、⚠️札の文字が中央にならなかった。
		const styleStart = shellSource.indexOf('<style lang="scss" module>');
		expect(styleStart).toBeGreaterThan(-1);
		const style = shellSource.slice(styleStart);

		// ⚠️陽性対照。検出器が実際に二重を見つけられること。
		const duplicatesIn = (declaration: string): string[] => {
			const seen = new Map<string, number>();
			for (const part of declaration.split(';')) {
				const name = part.split(':')[0]?.trim();
				// ⚠️入れ子(&:hover や > i)の中身は別の宣言なので数えない。
				if (name == null || name === '' || name.includes('{') || name.includes('}') || name.startsWith('&') || name.startsWith('>')) continue;
				seen.set(name, (seen.get(name) ?? 0) + 1);
			}
			return [...seen].filter(([, count]) => count > 1).map(([name]) => name);
		};
		expect(duplicatesIn('color: red; color: blue')).toEqual(['color']);
		expect(duplicatesIn('color: red; background: blue')).toEqual([]);

		const offenders: string[] = [];
		for (const line of style.split('\n')) {
			const open = line.indexOf('{');
			if (open < 0 || !line.trimStart().startsWith('.')) continue;
			const selector = line.slice(0, open).trim();
			// ⚠️入れ子より手前、最初の & や > が現れるまでを見る。
			const body = line.slice(open + 1).split('&')[0].split('> ')[0];
			for (const name of duplicatesIn(body)) offenders.push(`${selector}: ${name}`);
		}
		expect(offenders).toEqual([]);
	});

	test('シェルのどこでホイールを回しても、近い方のペインが動く', () => {
		// 旗鯖fork: ⚠️器が低いとき（窓を最大化から通常サイズへ戻したときなど）、
		//   ヘッダー帯にはスクロールできる祖先が1つも無く、ホイールが完全に無反応になる。
		//   ⚠️スクロールバーは動くのにホイールだけ死ぬ、という状態がこれだった
		//   （実測: 窓450px / シェル415px / ヘッダー63px の上では祖先なし）。
		expect(shellSource).toContain('@wheel="onShellWheel"');
		expect(shellSource).toContain('function onShellWheel(ev: WheelEvent) {');

		// ⚠️すでにスクロールできる場所の上では何もしないこと（二重に動いて飛ぶ）。
		const handler = shellSource.slice(shellSource.indexOf('function onShellWheel(ev: WheelEvent) {'));
		expect(handler).toContain("if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1) return;");
		// ⚠️端まで来ているときは外側へ渡す。
		expect(handler).toContain('if (next === pane.scrollTop) return;');
		// ⚠️横ホイールには手を出さない。
		expect(handler).toContain('if (ev.deltaY === 0 || Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) return;');
		// ⚠️横位置だけで選ばないこと。狭い幅では左右ペインが縦に積まれる。
		expect(handler).toContain('const dy = Math.max(box.top - ev.clientY, 0, ev.clientY - box.bottom);');
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
		// ⚠️タブレット専用の Hataskey UI 行は廃止。大分類の錠剤へ一本化した。
		expect(shellSource).not.toContain('tabletPrimaryLink');
		expect(shellSource).toContain('.uiPill { min-height: 36px; padding: 6px 10px;');
		expect(shellSource).toContain('.legacyTop { min-height: 44px; padding: 8px 14px; }');
	});

	test('tabletの戻るbuttonはdiscard後に設定外へ出し、mobile rootも同じguardを使う', () => {
		expect(shellSource).toMatch(/<button v-if="tablet"[^>]*:class="\$style\.compactBack"[^>]*:aria-label="i18n\.ts\.goBack"[^>]*@click="goSettingsBack">/);
		expect(shellSource).toContain('<i class="ti ti-chevron-left" aria-hidden="true"></i>');
		const backStart = shellSource.indexOf('async function goSettingsBack() {');
		const compactStart = shellSource.indexOf('async function goCompactBack() {');
		const exitRoute = shellSource.indexOf('pushShellRoute(settingsExitRoute());', backStart);
		expect(backStart).toBeGreaterThan(-1);
		expect(compactStart).toBeGreaterThan(backStart);
		expect(shellSource.slice(backStart, compactStart)).toContain('if (!await requestSurfaceDiscard()) return;');
		expect(shellSource.slice(backStart, compactStart)).toContain('if (!isSettingsFullPath(router.getCurrentFullPath())) return;');
		expect(exitRoute).toBeGreaterThan(backStart);
		expect(shellSource.slice(compactStart)).toContain('await goSettingsBack();');
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
