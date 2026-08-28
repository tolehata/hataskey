/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createApp, defineComponent, h, nextTick, ref } from 'vue';
import type { App } from 'vue';
import { afterEach, describe, expect, test, vi } from 'vitest';
vi.mock('@/i18n.js', async () => {
	const fs = await import('node:fs');
	const path = await import('node:path');
	const yaml = await import('js-yaml');
	const { I18n } = await import('@@/js/i18n.js');
	const locale = yaml.load(fs.readFileSync(path.resolve(process.cwd(), '../../locales/ja-JP.yml'), 'utf8'));
	return { i18n: new I18n(locale as any) };
});
import overviewSource from './SettingsMobileOverview.vue?raw';
import shellSource from './index.vue?raw';
import SettingsMobileOverview from './SettingsMobileOverview.vue';

const mounted: Array<{ app: App<Element>; container: HTMLDivElement }> = [];

afterEach(() => {
	for (const item of mounted.splice(0)) {
		item.app.unmount();
		item.container.remove();
	}
});

describe('settings mobile overview', () => {
	test('compact rootは専用overviewにし、主要導線と安全な値要約だけを表示する', () => {
		expect(shellSource).toContain('<SettingsMobileOverview');
		expect(shellSource).toContain(':sections="mobileOverviewSections"');
		expect(shellSource).toContain(':deprecatedSections="mobileDeprecatedSections"');
		expect(shellSource).toContain(':activeCategoryId="compactNavigationSection"');
		expect(shellSource).toContain('@openCategory="openCompactNavigationSection"');
		expect(shellSource).toContain(':legacyLabel="copy.legacySettings"');
		expect(shellSource).toContain('v-show="!compact || currentPage?.route.name == null"');
		expect(shellSource).toContain('v-show="!compact || currentPage?.route.name != null"');
		expect(shellSource).toContain('border-radius: 26px;');
		expect(shellSource).toContain('border: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent));');
		expect(shellSource).not.toContain('.scope { border-radius: 0; border-inline: 0; }');
		expect(shellSource).toContain('prefer.r[\'simpleUi.glassUiCardOpacity\']?.value');
		expect(shellSource).toContain('prefer.r.showGapBetweenNotesInTimeline?.value');
		expect(shellSource).toContain('getVisibleBottomNav(prefer.r[\'simpleUi.bottomNav\'].value');
		expect(shellSource).toContain('HATASABA_BOTTOM_NAV_MAX');
		expect(shellSource).toContain('glassUiBubbleLocal.value ? i18n.ts.on : i18n.ts.off');
		expect(shellSource).toContain('noteGap ? copy.values.spread : copy.values.compact');
		expect(shellSource).not.toContain('showPageTabBarBottom?.value');
		expect(overviewSource).toContain('i18n.ts._hata._settingsRedesign');
		expect(overviewSource).toContain('copy.frequentlyUsedSettings');
		expect(overviewSource).toContain('copy.mobile.recommendedInUse');
		expect(overviewSource).toContain('Hataskey UI');
		expect(overviewSource).toContain('copy.mobile.changeCurrentValues');
		expect(overviewSource).toContain('copy.mobile.allCategories');
		expect(overviewSource).not.toContain('<details v-for');
		expect(overviewSource).toContain('openCategory(section.id)');
		expect(overviewSource).toContain('openCategory(null)');
		expect(overviewSource).toContain('emit(\'legacy\')');
		expect(overviewSource).toContain('.legacyPill');
		expect(overviewSource).toContain(':aria-label="item.label"');
		expect(overviewSource).toContain('emit(\'select\', item)');
		expect(overviewSource).toMatch(/\.quickItem\s*\{[^}]*background:\s*var\(--settings-surface,/);
	});

	test('desktop rootはプロフィールを既定表示にし、tabletは常時行から下位一覧へdrill-inする', () => {
		// 旗鯖fork: ⚠️設定を開いた既定はプロフィール。Hataskey UI は
		//   /settings/hata-custom を直接開いたときの画面として残る。
		expect(shellSource).toContain("const SETTINGS_DEFAULT_ROUTE = '/settings/profile';");
		expect(shellSource).toContain('router.replace(SETTINGS_DEFAULT_ROUTE);');
		// ⚠️左ペインは大分類だけを持つ縦の錠剤リスト。折りたたみへ戻さない。
		expect(shellSource).toContain(':class="$style.sectionPills"');
		expect(shellSource).toContain('v-for="section in visibleNavSections"');
		expect(shellSource).not.toContain('<details v-for="section in visibleNavSections"');
		// 旗鯖fork: ⚠️タブレット専用の作りは廃止した。PC と同じ姿に揃える。
		expect(shellSource).not.toContain('tabletNavSections');
		expect(shellSource).not.toContain('openTabletNavigationSection');
		expect(shellSource).toContain('@container (max-width: 900px)');
		expect(shellSource).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
		// 旗鯖fork: ⚠️既定の行き先を変えても、/settings/hata-custom を直接開いたときは
		//   これまで通り Hataskey UI が出ること。判定は経路の同期側が持つ。
		expect(shellSource).toContain("if (activeNavigationTarget.value?.route !== currentPath.value) activeHataCustomCategory.value = 'glassUi';");
		// 旗鯖fork: ⚠️幅で作りを分けないこと。タブレット専用の枝は廃止した。
		expect(shellSource).not.toContain('<template v-if="tablet">');
		expect(shellSource).not.toContain('<details');
	});

	test('mobileカテゴリはmanifestのHataskey UIを重複させず、Misskey UIを互換行へ分ける', () => {
		expect(shellSource).toContain('const mobileOverviewSections = computed<SettingsOverviewSection[]>(() => navSections.filter(section => section.id !== \'hataskey-ui\' && section.id !== \'misskey-ui\'));');
		expect(shellSource).toContain('const mobileDeprecatedSections = computed<SettingsOverviewSection[]>(() => navSections.filter(section => section.id === \'misskey-ui\'));');
		expect(overviewSource).toContain('<h2 id="settings-mobile-feature"><span class=\"settingsBrand\">Hataskey UI</span></h2>');
		expect(overviewSource).toContain('settingsBrand');
		expect(overviewSource).toContain('.deprecated .categories');
	});
	test('active category keeps a softer hierarchy while ordinary action rows use 48px targets', () => {
		expect(overviewSource).toContain('.category.itemActive, .category.itemActive:hover');
		expect(overviewSource).toContain('background: color-mix(in srgb, var(--MI_THEME-accent) 14%, var(--settings-surface, var(--MI_THEME-panel))) !important');
		expect(overviewSource).toContain('.categoryLinks button { display: flex; box-sizing: border-box; width: 100%; min-height: 48px;');
		expect(overviewSource).toContain('.categoryBack { display: inline-flex; min-height: 48px;');
		expect(overviewSource).toContain('.legacyPill { display: inline-flex; min-height: 48px;');
		expect(overviewSource).toContain('.featureLink { display: flex; min-width: 0; flex: 1; min-height: 48px;');
	});

	test('navigation counts and active route checks use precomputed indexes', () => {
		expect(shellSource).toContain('const navigationCatalogIndex = computed<NavigationCatalogIndex>');
		expect(shellSource).toContain('const navigationScopeCounts = computed(() =>');
		expect(shellSource).toContain('const primaryDestinationCountByRoute = computed(() =>');
		expect(shellSource).toContain('const currentFullPath = computed(() =>');
		expect(shellSource).toContain('const currentDestinationId = computed(() =>');
		expect(shellSource).toContain('const activeNavigationItemIds = computed(() =>');
		expect(shellSource).toContain('const activeNavigationSectionIds = computed(() =>');
		expect(shellSource).toContain('return activeNavigationItemIds.value.has(item.id);');
		expect(shellSource).not.toContain('function destinationIdFromCurrentUrl()');
		expect(shellSource).not.toContain('section.items.some(item => isActive(item))');
		const isActiveStart = shellSource.indexOf('function isActive(item: NavItem)');
		const isActiveEnd = shellSource.indexOf('\n}', isActiveStart);
		expect(isActiveStart).toBeGreaterThan(-1);
		expect(isActiveEnd).toBeGreaterThan(isActiveStart);
		expect(shellSource.slice(isActiveStart, isActiveEnd)).not.toContain('settingsDestinations.filter');
	});

	test('通常routeも根拠のある別route関連を末尾へ出し、旧設定導線を残す', () => {
		expect(shellSource).toContain('relatedSourcesForSettingsNavigationV2');
		expect(shellSource).toContain('related.route === currentPath.value');
		expect(shellSource).not.toContain('if (items.length === 3) return items;');
		expect(shellSource).toContain('copy.legacySettings');
		expect(shellSource).toContain('emit(\'openLegacy\')');
	});

	test('desktop/tabletのCherryPickとMisskey UI関連はモックどおりaccent/deprecatedで区別する', () => {
		expect(shellSource).toContain(':data-settings-nav-section="section.id"');
		// ⚠️CherryPick と Misskey UI の区別は錠剤リストでも保つ。
		expect(shellSource).toContain('[$style.sectionPillCherrypick]: section.id === \'cherrypick\'');
		expect(shellSource).toContain('[$style.sectionPillDeprecated]: section.id === \'misskey-ui\'');
		expect(shellSource).toContain('.sectionPillCherrypick { color: var(--MI_THEME-accent); }');
		expect(shellSource).toContain('.sectionPillDeprecated { opacity: .68; }');
	});

	test('mobile category rows use right chevrons, preserve sub-items, and repair keyboard focus across the drill-in swap', async () => {
		const select = vi.fn();
		const openCategory = vi.fn();
		const category = {
			id: 'appearance', label: '表示密度とノート', description: '説明', icon: 'ti ti-palette',
			items: [{ id: 'density', label: '密度', route: '/settings/preferences', icon: 'ti ti-layout-distribute-vertical' }],
		};
		const target = { id: 'glass', label: 'Hataskey UI', route: '/settings/hata-custom', icon: 'ti ti-sparkles' };
		const app = createApp(defineComponent({
			setup() {
				const activeCategoryId = ref<string | null>(null);
				return () => h(SettingsMobileOverview, {
					quickItems: [], featureItem: target, valueItems: [], sections: [category], activeCategoryId: activeCategoryId.value, onSelect: select,
					onOpenCategory: (id: string | null) => {
						openCategory(id);
						activeCategoryId.value = id;
					},
				});
			},
		}));
		const container = window.document.createElement('div');
		window.document.body.append(container);
		app.mount(container);
		mounted.push({ app, container });
		await nextTick();
		expect(container.querySelectorAll('details')).toHaveLength(0);
		const categoryButton = container.querySelector<HTMLButtonElement>('[data-settings-mobile-category-id="appearance"]');
		categoryButton?.focus();
		// Native Enter activation ends in the same click path as a pointer click.
		categoryButton?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		categoryButton?.click();
		await nextTick();
		await nextTick();
		expect(openCategory).toHaveBeenCalledWith('appearance');
		const backButton = container.querySelector<HTMLButtonElement>('[class*="categoryBack"]');
		expect(window.document.activeElement).toBe(backButton);
		expect(container.textContent).toContain('密度');
		[...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('密度'))?.click();
		await nextTick();
		expect(select).toHaveBeenCalledWith(expect.objectContaining({ route: '/settings/preferences' }));

		backButton?.click();
		await nextTick();
		await nextTick();
		expect(window.document.activeElement).toBe(container.querySelector('[data-settings-mobile-category-id="appearance"]'));
		expect(overviewSource).toContain('const categoryButtonEls = new Map<string, HTMLButtonElement>();');
		expect(overviewSource).toContain('watch(activeCategory, async (nextCategory, previousCategory) => {');
		expect(overviewSource).toContain('categoryBackEl.value?.focus({ preventScroll: true });');
		expect(overviewSource).toContain('categoryButtonEls.get(previousCategory.id)?.focus({ preventScroll: true });');
	});

	test('設定シェルはアプリ設定とOS設定の両方でモーションを停止する', () => {
		expect(shellSource).toContain(':data-motion-enabled="motionEnabled ? \'true\' : \'false\'"');
		expect(shellSource).toContain('prefer.r.animation?.value !== false && !prefersReducedMotion.value');
		expect(shellSource).toContain('reducedMotionQuery.addEventListener(\'change\', syncReducedMotion)');
		expect(shellSource).toContain('reducedMotionQuery.removeEventListener(\'change\', syncReducedMotion)');
		expect(shellSource).toContain('.scope[data-motion-enabled=\'false\']');
		expect(shellSource).toContain(':deep(*)');
	});

	test('mobileのquick・feature・現在値・カテゴリはactivationを落とさずselectする', async () => {
		const select = vi.fn();
		const glassTarget = {
			id: 'glass',
			label: 'Hataskey UI',
			route: '/settings/hata-custom',
			icon: 'ti ti-sparkles',
			activation: { kind: 'hata-custom-category' as const, category: 'glassUi' as const },
		};
		const app = createApp(defineComponent({
			setup() {
				return () => h(SettingsMobileOverview, {
					quickItems: [glassTarget],
					featureItem: glassTarget,
					valueItems: [{ ...glassTarget, id: 'opacity', label: '透過率', value: '55%' }],
					sections: [{ id: 'appearance', label: '見た目', description: '説明', icon: 'ti ti-palette', items: [glassTarget] }],
					onSelect: select,
				});
			},
		}));
		const container = window.document.createElement('div');
		window.document.body.append(container);
		app.mount(container);
		mounted.push({ app, container });
		await nextTick();

		const quick = container.querySelector<HTMLButtonElement>('[aria-label="Hataskey UI"]');
		quick?.click();
		await nextTick();
		expect(select).toHaveBeenCalledWith(expect.objectContaining({
			route: '/settings/hata-custom',
			activation: { kind: 'hata-custom-category', category: 'glassUi' },
		}));
	});

	test('feature cardの48px previewは同一surfaceへpreviewイベントだけを渡し、設定値を変更しない', async () => {
		const preview = vi.fn();
		const select = vi.fn();
		const glassTarget = {
			id: 'glass', label: 'Hataskey UI', route: '/settings/hata-custom', icon: 'ti ti-sparkles',
			activation: { kind: 'hata-custom-category' as const, category: 'glassUi' as const },
		};
		const app = createApp(defineComponent({
			setup() {
				return () => h(SettingsMobileOverview, {
					quickItems: [], featureItem: glassTarget, valueItems: [], sections: [], onSelect: select, onPreview: preview,
				});
			},
		}));
		const container = window.document.createElement('div');
		window.document.body.append(container);
		app.mount(container);
		mounted.push({ app, container });
		await nextTick();
		container.querySelector<HTMLButtonElement>('[aria-label="プレビューを開く"]')?.click();
		await nextTick();
		expect(preview).toHaveBeenCalledTimes(1);
		expect(select).not.toHaveBeenCalled();
		expect(overviewSource).toContain('flex: 0 0 48px; width: 48px; height: 48px');
	});

	test('端末とログインの実操作はactionイベントだけを発行し、検索selectへ混ぜない', async () => {
		const select = vi.fn();
		const action = vi.fn();
		const glassTarget = {
			id: 'glass', label: 'Hataskey UI', route: '/settings/hata-custom', icon: 'ti ti-sparkles',
			activation: { kind: 'hata-custom-category' as const, category: 'glassUi' as const },
		};
		const app = createApp(defineComponent({
			setup() {
				return () => h(SettingsMobileOverview, {
					quickItems: [], featureItem: glassTarget, valueItems: [], sections: [],
					destructiveItems: [{ id: 'logout', searchId: 'settings.shell.logout', label: 'ログアウト', icon: 'ti ti-logout' }],
					onSelect: select, onAction: action,
				});
			},
		}));
		const container = window.document.createElement('div');
		window.document.body.append(container);
		app.mount(container);
		mounted.push({ app, container });
		await nextTick();

		container.querySelector<HTMLButtonElement>('[data-settings-search-id="settings.shell.logout"]')?.click();
		await nextTick();
		expect(action).toHaveBeenCalledWith('logout');
		expect(select).not.toHaveBeenCalled();
		expect(overviewSource).toContain('data-settings-search-destructive="true"');
	});

	test('末尾の小さな旧設定pillはlegacyイベントだけを発行する', async () => {
		const legacy = vi.fn();
		const glassTarget = {
			id: 'glass', label: 'Hataskey UI', route: '/settings/hata-custom', icon: 'ti ti-sparkles',
			activation: { kind: 'hata-custom-category' as const, category: 'glassUi' as const },
		};
		const app = createApp(defineComponent({
			setup() {
				return () => h(SettingsMobileOverview, {
					quickItems: [], featureItem: glassTarget, valueItems: [], sections: [], legacyLabel: '旧設定', onLegacy: legacy,
				});
			},
		}));
		const container = window.document.createElement('div');
		window.document.body.append(container);
		app.mount(container);
		mounted.push({ app, container });
		await nextTick();
		[...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('旧設定'))?.click();
		await nextTick();
		expect(legacy).toHaveBeenCalledTimes(1);
	});
});
