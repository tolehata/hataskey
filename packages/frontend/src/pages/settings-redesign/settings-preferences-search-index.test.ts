/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
vi.mock('@/i18n.js', async () => {
	const fs = await import('node:fs');
	const path = await import('node:path');
	const yaml = await import('js-yaml');
	const { I18n } = await import('@@/js/i18n.js');
	const locale = yaml.load(fs.readFileSync(path.resolve(process.cwd(), '../../locales/ja-JP.yml'), 'utf8'));
	return { i18n: new I18n(locale as any) };
});
import {
	canonicalSearchIdForDescriptor,
	generatedPreferenceSearchId,
	preferenceAuxiliaryControls,
	preferenceControls,
	settingsInventoryKeys,
} from './settings-preferences-catalog.js';
import {
	isRedesignedPreferenceSearchId,
	mergeRedesignedPreferenceSearchItems,
	preferenceDestinationForSearchTarget,
	redesignedPreferenceStableIdAliases,
	settingsDestinationCatalogItemsV2,
	suppressLegacyPreferenceSearchMarkers,
} from './settings-preferences-search-index.js';
import type { SearchIndexItem } from '@/utility/inapp-search.js';
import type { SettingsControlCatalogItemV2 } from '@/utility/settings-control-search-v2.js';
import { assertSettingsCatalogRelationsV2, buildSettingsCatalogV2, getRelatedSettingsV2, searchSettingsV2 } from '@/utility/settings-search-v2.js';

const metadata = {
	persistence: 'test fixture: legacy preference generator metadata',
	saveMode: 'test fixture: immediate legacy preference model',
	availability: 'test fixture: all settings layouts',
	owner: 'test fixture: legacy preferences',
	applicableUi: 'test fixture: all UIs',
} as const;

function generatedLegacyControls(): SettingsControlCatalogItemV2[] {
	const controls = settingsInventoryKeys.map((key, index) => ({
		stableId: `settings.control.legacy-${index}`,
		route: '/settings/preferences',
		label: `Legacy ${key}`,
		aliases: [key],
		preferenceKeys: [key],
		legacyMarkerParentId: `legacy-marker-${index}`,
		legacyMarkerAncestorIds: [`legacy-marker-${index}`],
		persistence: 'profile' as const,
		saveMode: 'immediate' as const,
		availability: 'all' as const,
		owner: 'core' as const,
		applicableUi: 'all' as const,
		metadataEvidence: metadata,
		relatedHostId: `settings.control.legacy-${index}`,
		sourceFile: 'src/pages/settings/preferences.vue',
		sourceLine: index + 1,
		destructive: false,
	}));
	const animation = controls.find(control => control.preferenceKeys[0] === 'animation');
	if (animation == null) throw new Error('animation fixture is missing');
	return [...controls, { ...animation, stableId: 'settings.control.legacy-animation-duplicate', sourceLine: controls.length + 1 }];
}

function legacyMarkers(): SearchIndexItem[] {
	return settingsInventoryKeys.map((key, index) => ({
		id: `legacy-marker-${index}`,
		path: '/settings/preferences',
		label: `Legacy marker ${key}`,
		keywords: [key],
		texts: [],
	}));
}

describe('redesigned preferences search index', () => {
	test('100 legacy containers and 18 auxiliary controls are each materialized exactly once', () => {
		expect(preferenceControls).toHaveLength(100);
		expect(preferenceAuxiliaryControls).toHaveLength(18);
		expect(settingsInventoryKeys).toHaveLength(118);
		const merged = mergeRedesignedPreferenceSearchItems(generatedLegacyControls());
		const preferenceDescriptors = merged.filter(item => item.route === '/settings/preferences');
		expect(preferenceDescriptors).toHaveLength(118);
		expect(new Set(preferenceDescriptors.map(item => item.preferenceKeys[0])).size).toBe(118);
		expect(new Set(preferenceDescriptors.map(item => item.stableId)).size).toBe(118);
		for (const key of settingsInventoryKeys) {
			const descriptor = preferenceDescriptors.find(item => item.preferenceKeys[0] === key);
			expect(descriptor?.stableId, key).toBe(generatedPreferenceSearchId(key));
			expect(descriptor?.legacyMarkerParentId, key).toMatch(/^legacy-marker-/u);
		}
	});

	test('runtime-generated legacy ids all rewrite to the 118 canonical preference controls', () => {
		const generated = generatedLegacyControls();
		const aliases = redesignedPreferenceStableIdAliases(generated);
		expect(aliases.size).toBe(generated.length);
		expect(new Set(aliases.values()).size).toBe(settingsInventoryKeys.length);
		for (const item of generated) expect(aliases.get(item.stableId)).toBe(generatedPreferenceSearchId(item.preferenceKeys[0]!));
		expect(aliases.get('settings.control.legacy-animation-duplicate')).toBe(generatedPreferenceSearchId('animation'));
		const unknown = { ...generated[0]!, stableId: 'settings.control.legacy-unknown', aliases: ['fixture.unknown'], preferenceKeys: ['fixture.unknown'], storageRefs: [] };
		expect(() => redesignedPreferenceStableIdAliases([unknown])).toThrow(/not represented exactly once/u);
		const multiKey = { ...generated[0]!, stableId: 'settings.control.legacy-multi', preferenceKeys: [settingsInventoryKeys[0]!, settingsInventoryKeys[1]!] };
		expect(() => redesignedPreferenceStableIdAliases([multiKey])).toThrow(/not represented exactly once/u);
		const duplicate = { ...generated[0]! };
		expect(() => redesignedPreferenceStableIdAliases([generated[0]!, duplicate])).toThrow(/duplicate legacy preference descriptor id/u);
	});

	test('legacy runtime ids are inferred from aliases and storage evidence', () => {
		const base = generatedLegacyControls()[0]!;
		const special = (overrides: Partial<SettingsControlCatalogItemV2>): SettingsControlCatalogItemV2 => ({
			...base,
			...overrides,
		});
		const dataSaverKeys = [
			'dataSaver.media',
			'dataSaver.avatar',
			'dataSaver.disableUrlPreview',
			'dataSaver.urlPreviewThumbnail',
			'dataSaver.code',
		] as const;
		const generated = [
			special({
				stableId: 'settings.control.lang-iirt1l',
				preferenceKeys: [],
				aliases: ['lang'],
				storageRefs: [{ kind: 'local', key: 'lang' }],
			}),
			special({
				stableId: 'settings.control.useboldfont-1hpnn4z',
				preferenceKeys: [],
				aliases: ['useBoldFont'],
				storageRefs: [{ kind: 'local', key: 'useBoldFont' }],
			}),
			special({
				stableId: 'settings.control.usesystemfont-1nx4imd',
				preferenceKeys: [],
				aliases: ['useSystemFont'],
				storageRefs: [{ kind: 'local', key: 'useSystemFont' }],
			}),
			...dataSaverKeys.map((key, index) => special({
				stableId: `settings.control.data-saver-${index}`,
				preferenceKeys: ['dataSaver'],
				aliases: [key],
				storageRefs: [{ kind: 'pref', key: 'dataSaver' }],
			})),
			special({
				stableId: 'settings.group.src-pages-settings-preferences-vue-pu703b',
				preferenceKeys: [],
				aliases: ['i18n.ts.additionalEmojiDictionary'],
				storageRefs: [{ kind: 'pizzax', store: 'base', key: 'additionalUnicodeEmojiIndexes', scope: 'device' }],
				isGroup: true,
			}),
			special({
				stableId: 'settings.control.i18n-ts-enableall-1fiasic',
				preferenceKeys: [],
				aliases: ['i18n.ts.enableAll'],
				storageRefs: [{ kind: 'pref', key: 'dataSaver' }],
			}),
			special({
				stableId: 'settings.control.i18n-ts-disableall-1y966ue',
				preferenceKeys: [],
				aliases: ['i18n.ts.disableAll'],
				storageRefs: [{ kind: 'pref', key: 'dataSaver' }],
			}),
		];
		const aliases = redesignedPreferenceStableIdAliases(generated);

		expect(aliases.get('settings.control.lang-iirt1l')).toBe(generatedPreferenceSearchId('lang'));
		expect(aliases.get('settings.control.useboldfont-1hpnn4z')).toBe(generatedPreferenceSearchId('useBoldFont'));
		expect(aliases.get('settings.control.usesystemfont-1nx4imd')).toBe(generatedPreferenceSearchId('useSystemFont'));
		for (const [index, key] of dataSaverKeys.entries()) {
			expect(aliases.get(`settings.control.data-saver-${index}`)).toBe(generatedPreferenceSearchId(key));
		}
		expect(aliases.get('settings.group.src-pages-settings-preferences-vue-pu703b')).toBe(generatedPreferenceSearchId('additionalUnicodeEmojiIndexes'));
		expect(aliases.get('settings.control.i18n-ts-enableall-1fiasic')).toBe('settings.destination.misskey-data-saver');
		expect(aliases.get('settings.control.i18n-ts-disableall-1y966ue')).toBe('settings.destination.misskey-data-saver');

		const collision = special({
			stableId: 'settings.control.alias-collision',
			preferenceKeys: ['lang'],
			aliases: ['lang', 'i18n.ts.enableAll'],
			storageRefs: [{ kind: 'local', key: 'lang' }],
		});
		expect(redesignedPreferenceStableIdAliases([collision]).get(collision.stableId)).toBe(generatedPreferenceSearchId('lang'));

		const storageFreeEnableAll = special({
			stableId: 'settings.control.i18n-ts-enableall-without-storage',
			preferenceKeys: [],
			aliases: ['i18n.ts.enableAll'],
			storageRefs: [],
		});
		expect(() => redesignedPreferenceStableIdAliases([storageFreeEnableAll])).toThrow();

		const ambiguousBulkAction = special({
			stableId: 'settings.control.bulk-data-saver-ambiguous',
			preferenceKeys: [],
			aliases: ['i18n.ts.enableAll', 'i18n.ts.disableAll'],
			storageRefs: [{ kind: 'pref', key: 'dataSaver' }],
		});
		expect(() => redesignedPreferenceStableIdAliases([ambiguousBulkAction])).toThrow();
	});

	test('the legacy page generator cannot make a dynamic new-surface setting disappear', () => {
		const merged = mergeRedesignedPreferenceSearchItems([]);
		expect(merged).toHaveLength(118);
		const catalog = buildSettingsCatalogV2([], merged, undefined, settingsDestinationCatalogItemsV2());
		for (const key of settingsInventoryKeys) {
			const stableId = generatedPreferenceSearchId(key);
			expect(catalog.byStableId.get(stableId)?.controlId, key).toBe(stableId);
			expect(searchSettingsV2(catalog, key).results.some(result => result.stableId === stableId), key).toBe(true);
			expect(preferenceDestinationForSearchTarget(catalog.byStableId.get(stableId)!), key).not.toBeNull();
			expect(isRedesignedPreferenceSearchId(stableId), key).toBe(true);
		}
	});

	test('CherryPick-owned controls keep their product category even when their destination is shared', () => {
		const catalog = buildSettingsCatalogV2([], mergeRedesignedPreferenceSearchItems([]), undefined, settingsDestinationCatalogItemsV2());
		const cherryKeys = preferenceControls.filter(control => control.cherry).map(control => control.key);
		expect(cherryKeys).toHaveLength(36);
		for (const key of cherryKeys) {
			const descriptor = catalog.byStableId.get(generatedPreferenceSearchId(key));
			expect(descriptor?.categoryId, key).toBe('cherrypick');
			expect(descriptor?.owner, key).toBe('cherrypick');
		}
		for (const control of preferenceAuxiliaryControls.filter(control => 'cherry' in control && control.cherry === true)) {
			const descriptor = catalog.byStableId.get(generatedPreferenceSearchId(control.key));
			expect(descriptor?.categoryId, control.key).toBe('cherrypick');
			expect(descriptor?.owner, control.key).toBe('cherrypick');
		}
	});

	test('manifest destinationと明示source mapが、旧markerではない関連fallbackの正本になる', () => {
		const destinations = settingsDestinationCatalogItemsV2();
		// ⚠️56件から52件へ。テーマの管理・インストールを2件、項目0件の重複だった
		//   misskey-search と Hataskey UI切り替えを各1件落とした分。
		expect(destinations).toHaveLength(52);
		expect(new Set(destinations.map(item => item.destinationId)).size).toBe(52);
		for (const destination of destinations) expect(destination.label.trim(), destination.destinationId).not.toBe('');
		const mappedSources = [
			['src/pages/settings/accounts.vue', 'account-switch', 'account-profiles', '/settings/accounts'],
			['src/pages/settings/avatar-decoration.vue', 'account-avatar', 'account-profile', '/settings/avatar-decoration'],
			['src/pages/settings/cherrypick.vue', 'cherrypick-settings', 'cherrypick-display', '/settings/cherrypick'],
			['src/pages/settings/connect.vue', 'account-connect', 'account-apps', '/settings/connect'],
			['src/pages/settings/privacy.vue', 'account-privacy', 'account-security', '/settings/privacy'],
			['src/pages/settings/profile.vue', 'account-profile', 'account-avatar', '/settings/profile'],
			['src/pages/settings/drive.vue', 'account-drive', 'account-drive-cleaner', '/settings/drive'],
			['src/pages/settings/deck.vue', 'misskey-deck', 'misskey-navbar', '/settings/deck'],
			['src/pages/settings/hata-custom.vue', 'hataskey-ui', 'hata-settings-transfer', '/settings/hata-custom'],
			['src/pages/settings/hidden-reactions-manage.vue', 'timeline-hidden-reactions', 'timeline-display', '/settings/hidden-reactions'],
			['src/pages/settings/notifications.vue', 'notifications-page', 'notifications-sounds', '/settings/notifications'],
			['src/pages/settings/timeline.vue', 'timeline-display', 'timeline-note-display', '/settings/timeline'],
		] as const;
		const retained = mergeRedesignedPreferenceSearchItems(mappedSources.map(([sourceFile, _destinationId, _relationDestinationId, route], index) => ({
			stableId: `settings.control.source-${index}`, route, label: `source ${index}`, aliases: [], preferenceKeys: [], legacyMarkerAncestorIds: [],
			persistence: 'profile', saveMode: 'immediate', availability: 'all', owner: 'core', applicableUi: 'all', metadataEvidence: metadata,
			relatedHostId: `settings.control.source-${index}`, sourceFile, sourceLine: index + 1, destructive: false,
		} satisfies SettingsControlCatalogItemV2)));
		for (const [sourceFile, destinationId, relationDestinationId] of mappedSources) {
			const item = retained.find(item => item.sourceFile === sourceFile);
			expect(item?.destinationId).toBe(destinationId);
			expect(item?.relationDestinationId).toBe(relationDestinationId);
		}
		for (const key of settingsInventoryKeys) {
			const item = retained.find(item => item.preferenceKeys[0] === key)!;
			expect(item.destinationId, key).toBe(preferenceDestinationForSearchTarget(item));
			expect(item.relationDestinationId, key).toBeTruthy();
			expect(item.relationDestinationId, key).not.toBe(item.destinationId);
		}
	});

	test('legacy preference markers remain lookup-compatible but cannot be returned by the redesigned search', () => {
		const catalog = buildSettingsCatalogV2(legacyMarkers(), mergeRedesignedPreferenceSearchItems(generatedLegacyControls()), undefined, settingsDestinationCatalogItemsV2());
		const markers = catalog.descriptors.filter(item => item.source === 'legacy' && item.route === '/settings/preferences');
		const source = catalog.byStableId.get(generatedPreferenceSearchId(settingsInventoryKeys[0]!))!;
		expect(source.related.length).toBeGreaterThan(0);
		const beforeTotal = source.relatedTotal!;
		const marker = markers[0]!;
		source.related = [...source.related, { stableId: marker.stableId, kind: 'fallback', reason: 'fixture', weight: 0 }];
		source.relatedIds = source.related.map(relation => relation.stableId);
		source.relatedTotal = beforeTotal + 1;
		suppressLegacyPreferenceSearchMarkers(catalog);
		expect(markers).toHaveLength(118);
		for (const descriptor of markers) {
			expect(descriptor.searchable).toBe(false);
			expect(descriptor.related).toEqual([]);
		}
		expect(source.relatedIds).not.toContain(marker.stableId);
		expect(source.relatedTotal).toBe(beforeTotal);
		expect(catalog.descriptors.some(descriptor => descriptor.source === 'destination' && descriptor.route === '/settings/preferences' && descriptor.searchable)).toBe(false);
		expect(catalog.descriptors.every(descriptor => !descriptor.relatedIds.some(id => markers.some(markerDescriptor => markerDescriptor.stableId === id)))).toBe(true);
		for (const key of settingsInventoryKeys) {
			const control = catalog.byStableId.get(generatedPreferenceSearchId(key));
			expect(control?.anchor, key).toMatch(/^legacy-marker-/u);
			expect(canonicalSearchIdForDescriptor(control!, catalog.descriptors), key).toBe(generatedPreferenceSearchId(key));
		}
	});

	test('production merge keeps every searchable control related while legacy markers and navigation-only destinations stay out of direct search', () => {
		const catalog = buildSettingsCatalogV2(legacyMarkers(), mergeRedesignedPreferenceSearchItems(generatedLegacyControls()), undefined, settingsDestinationCatalogItemsV2());
		suppressLegacyPreferenceSearchMarkers(catalog);
		assertSettingsCatalogRelationsV2(catalog);
		const zeroRelated = catalog.descriptors.filter(descriptor => descriptor.source === 'control' && descriptor.searchable && !descriptor.destructive && descriptor.related.length === 0);
		expect(zeroRelated).toHaveLength(0);
		const legacyMarkersInRelations = new Set(catalog.descriptors.filter(descriptor => descriptor.source === 'legacy' && descriptor.route === '/settings/preferences').map(descriptor => descriptor.stableId));
		expect(catalog.descriptors.every(descriptor => descriptor.relatedIds.every(id => !legacyMarkersInRelations.has(id)))).toBe(true);
		for (const descriptor of catalog.descriptors) {
			for (const related of getRelatedSettingsV2(catalog, descriptor.stableId)) {
				expect(related.destructive).not.toBe(true);
				expect(related.searchable || related.source === 'destination').toBe(true);
				expect(related.source === 'destination' && descriptor.route === related.route && descriptor.destinationId != null && descriptor.destinationId === related.destinationId).toBe(false);
			}
		}
		const destination = catalog.descriptors.find(descriptor => descriptor.source === 'destination')!;
		expect(searchSettingsV2(catalog, destination.label).results.some(result => result.stableId === destination.stableId)).toBe(false);
	});
});
