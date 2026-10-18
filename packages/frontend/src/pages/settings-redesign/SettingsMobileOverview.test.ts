/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createApp, defineComponent, h, nextTick, ref } from 'vue';
import type { App } from 'vue';
import { afterEach, describe, expect, test, vi } from 'vitest';
const config = vi.hoisted(() => ({ ui: 'simple' }));
vi.mock('@@/js/config.js', async importOriginal => ({
	...await importOriginal<typeof import('@@/js/config.js')>(),
	get ui() { return config.ui; },
}));
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
import { destinationForId } from './settings-destinations.js';

const mounted: Array<{ app: App<Element>; container: HTMLDivElement }> = [];

afterEach(() => {
	for (const item of mounted.splice(0)) {
		item.app.unmount();
		item.container.remove();
	}
	config.ui = 'simple';
});

describe('settings mobile overview', () => {
	test('compact rootは専用overviewにし、主要導線だけを表示する', () => {
		// Legacy overview behavior remains covered independently; the shell now uses 2b/3a.
		expect(shellSource).toContain('<SettingsBentoNavigation');
		expect(shellSource).not.toContain('<SettingsMobileOverview');
		expect(overviewSource).toContain('i18n.ts._hata._settingsRedesign');
		expect(overviewSource).toContain('copy.frequentlyUsedSettings');
		expect(overviewSource).toContain('copy.mobile.recommendedInUse');
		expect(overviewSource).toContain('Hataskey UI');
		expect(overviewSource).toContain('copy.mobile.allCategories');
		// 旗鯖fork: ⚠️「いまの値をすぐ変える」の節は外した。分類一覧より先に出る割に
		//   読まれず、モバイルの上下幅だけを食っていた。戻すときは節ごと戻すこと。
		expect(overviewSource).not.toContain('valueItems');
		expect(overviewSource).not.toContain('changeCurrentValues');
		expect(overviewSource).not.toContain('<details v-for');
		expect(overviewSource).toContain('openCategory(section.id)');
		expect(overviewSource).toContain('openCategory(null)');
		expect(overviewSource).toContain('emit(\'legacy\')');
		expect(overviewSource).toContain('.legacyPill');
		expect(overviewSource).toContain(':aria-label="item.label"');
		expect(overviewSource).toContain('emit(\'select\', item)');
		expect(overviewSource).toMatch(/\.quickItem\s*\{[^}]*background:\s*var\(--settings-surface,/);
	});

	test('新カテゴリ選択は先頭設定のpopupを自動起動せずカテゴリURLへ移動する', () => {
		const start = shellSource.indexOf('async function selectBentoCategory(id: string)');
		const end = shellSource.indexOf('function openBentoDestination', start);
		expect(start).toBeGreaterThan(-1);
		const handler = shellSource.slice(start, end);
		expect(handler).toContain('`/settings?category=${category.id}`');
		expect(handler).not.toContain('goToSetting(');
		expect(handler).not.toContain('openSettingsPopup(');
	});
	test('全端末のrootは一覧にし、旧glassUiの直URLも維持する', () => {
		expect(shellSource).not.toContain('SETTINGS_DEFAULT_ROUTE');
		expect(shellSource).toContain("currentPath.value === '/settings' && requestedBentoCategoryId.value == null && embeddedPopup.value == null");
		expect(shellSource).toContain("if (activeNavigationTarget.value?.route !== currentPath.value) activeHataCustomCategory.value = 'glassUi';");
	});
	test('旧overview部品のfeatureと互換行を残し、新shellへ二重mountしない', () => {
		expect(overviewSource).toContain('id="settings-mobile-feature"');
		expect(overviewSource).toContain('.deprecated .categories');
		expect(shellSource).not.toContain('<SettingsMobileOverview');
	});
	test.each([
		{ ui: 'simple', title: 'Hataskey UI', badge: '使用中・推奨', description: 'ナビ・透過率・吹き出し・デッキの表示をまとめて調整します', destinationId: 'hataskey-ui', preview: true },
		{ ui: 'hataskey3', title: 'Hataskey UI S', badge: '使用中', description: 'Hataskey UIの良さはそのまま、シンプルで遊び心のあるUIです。', destinationId: 'hataskey-ui-s', preview: false },
		{ ui: 'deck', title: 'Hataskey UI', badge: '推奨', description: 'ナビ・透過率・吹き出し・デッキの表示をまとめて調整します', destinationId: 'hataskey-ui', preview: true },
	])('mobile feature card follows the current $ui UI', async ({ ui, title, badge, description, destinationId, preview }) => {
		config.ui = ui;
		const select = vi.fn();
		const featureItem = destinationForId(destinationId)!;
		const app = createApp(defineComponent({
			setup() {
				return () => h(SettingsMobileOverview, { quickItems: [], featureItem, sections: [], onSelect: select });
			},
		}));
		const container = window.document.createElement('div');
		window.document.body.append(container);
		app.mount(container);
		mounted.push({ app, container });
		await nextTick();
		const card = container.querySelector<HTMLElement>('#settings-mobile-feature')?.closest('section');
		expect(card?.querySelector('h2')?.textContent).toBe(title);
		expect(card?.querySelector('[class*="featureBadge"]')?.textContent).toBe(badge);
		expect(card?.querySelector('p')?.textContent).toBe(description);
		expect(card?.querySelector('[class*="featurePreview"]') != null).toBe(preview);
		card?.querySelector<HTMLButtonElement>('[class*="featureLink"]')?.click();
		await nextTick();
		expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: destinationId, route: featureItem.route }));
	});
	test('active category keeps a softer hierarchy while ordinary action rows use 48px targets', () => {
		expect(overviewSource).toContain('.category.itemActive, .category.itemActive:hover');
		expect(overviewSource).toContain('background: color-mix(in srgb, var(--MI_THEME-accent) 14%, var(--settings-surface, var(--MI_THEME-panel))) !important');
		expect(overviewSource).toContain('.categoryLinks button { display: flex; box-sizing: border-box; width: 100%; min-height: 48px;');
		expect(overviewSource).toContain('.categoryBack { display: inline-flex; min-height: 48px;');
		expect(overviewSource).toContain('.legacyPill { display: inline-flex; min-height: 48px;');
		expect(overviewSource).toContain('.featureLink { display: flex; min-width: 0; flex: 1; min-height: 48px;');
	});

	test('現在のカテゴリはmanifestの明示された遷移先を優先し、一意なrouteだけをfallbackにする', () => {
		expect(shellSource).toMatch(/const navSections(?:\s*:[^=]+)?\s*=\s*settingsDestinationSections\.map\(/u);
		expect(shellSource).toContain('const primaryDestinationCountByRoute = computed(() =>');
		expect(shellSource).toContain('const currentFullPath = computed(() =>');
		expect(shellSource).toContain('const currentDestinationId = computed(() =>');
		expect(shellSource).toContain('const activeNavigationItemIds = computed(() =>');
		expect(shellSource).toContain('primaryDestinationCountByRoute.value.get(item.route) === 1');
		expect(shellSource).toContain('return explicitIds.size > 0 ? explicitIds : routeOnlyIds;');
		expect(shellSource).toContain('for (const id of activeNavigationItemIds.value)');
		expect(shellSource).toContain('bentoCategoryForDestination(id)');
	});
	test('通常routeも根拠のある別route関連を末尾へ出し、旧設定導線を残す', () => {
		expect(shellSource).toContain('relatedSourcesForSettingsNavigationV2');
		expect(shellSource).toContain('related.route === currentPath.value');
		expect(shellSource).not.toContain('if (items.length === 3) return items;');
		expect(shellSource).toContain('copy.legacySettings');
		expect(shellSource).toContain('emit(\'openLegacy\')');
	});

	test('旧実装由来の項目も新カテゴリから既存destinationへ接続する', () => {
		expect(shellSource).toContain('function openBentoDestination(id: string, event?: MouseEvent)');
		expect(shellSource).toContain('const destination = destinationForId(id);');
		expect(shellSource).toContain('const accepted = await goToSetting(destination);');
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
					quickItems: [], featureItem: target, sections: [category], activeCategoryId: activeCategoryId.value, onSelect: select,
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

	test('mobileのquick・feature・カテゴリはactivationを落とさずselectする', async () => {
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
					quickItems: [], featureItem: glassTarget, sections: [], onSelect: select, onPreview: preview,
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
					quickItems: [], featureItem: glassTarget, sections: [],
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
					quickItems: [], featureItem: glassTarget, sections: [], legacyLabel: '旧設定', onLegacy: legacy,
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
