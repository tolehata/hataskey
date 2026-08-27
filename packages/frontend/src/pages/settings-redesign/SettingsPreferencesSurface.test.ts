/* SPDX-License-Identifier: AGPL-3.0-only */
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/i18n.js', async () => {
	const fs = await import('node:fs');
	const path = await import('node:path');
	const yaml = await import('js-yaml');
	const { I18n } = await import('@@/js/i18n.js');
	const locale = yaml.load(fs.readFileSync(path.resolve(process.cwd(), '../../locales/ja-JP.yml'), 'utf8'));
	return { i18n: new I18n(locale as any) };
});
import surfaceSource from './SettingsPreferencesSurface.vue?raw';
import modelsSource from './settings-preferences-models.ts?raw';
import {
	assertPreferenceInventory,
	canonicalSearchIdForPreferenceKey,
	destinationForPreferenceKey,
	destinationForSearchDescriptor,
	generatedPreferenceSearchId,
	legacyDescriptorIdsForPreferenceKey,
	preferenceAuxiliaryControls,
	preferenceContainerKeys,
	preferenceControls,
	preferenceDestinationIds,
	searchIdForPreferenceKey,
	settingsInventoryKeys,
} from './settings-preferences-catalog.js';

import { destinationForId } from './settings-destinations.js';
import legacySource from '@/pages/settings/preferences.vue?raw';
const unique = (values: string[]) => [...new Set(values)];
const oldContainers = unique([...legacySource.matchAll(/<MkPreferenceContainer\s+k="([^"]+)"/gu)].map(match => match[1]));
const oldModels = unique([...legacySource.matchAll(/prefer\.model\(\s*['"]([^'"]+)['"]/gu)].map(match => match[1]));

describe('redesigned preferences inventory', () => {
	it('keeps the exact old 100-container inventory, with animation de-duplicated', () => {
		expect(oldContainers).toHaveLength(100);
		expect(preferenceContainerKeys).toHaveLength(100);
		expect(new Set(preferenceContainerKeys)).toEqual(new Set(oldContainers));
	});

	it('keeps every explicit legacy model and the special animation inversion', () => {
		expect(oldModels).toHaveLength(102);
		expect(new Set(oldModels)).toEqual(new Set([...preferenceContainerKeys, 'externalNavigationWarning', 'overridedDeviceKind']));
		expect(modelsSource).toContain('prefer.model(\'animation\', value => !value, value => !value)');
		expect(modelsSource).toContain('prefer.model(\'chat.sendOnEnter\')');
		expect(modelsSource).toContain('prefer.model(\'chat.showSenderName\')');
		expect(modelsSource).toContain('Boolean(controls.squareAvatars.value)');
		expect(modelsSource).toContain('if (fontSizeBefore.value == null)');
	});

	it('has one manifest destination for all 118 settings and auxiliary controls', () => {
		expect(preferenceControls).toHaveLength(100);
		expect(settingsInventoryKeys).toHaveLength(118);
		assertPreferenceInventory(preferenceControls, preferenceAuxiliaryControls);
		for (const item of [...preferenceControls, ...preferenceAuxiliaryControls]) expect(preferenceDestinationIds).toContain(item.destinationId);
	});

	it('keeps the inventory detector live for duplicate, missing, and unknown input', () => {
		expect(() => assertPreferenceInventory([...preferenceControls, preferenceControls[0]], preferenceAuxiliaryControls)).toThrow(/duplicate/iu);
		expect(() => assertPreferenceInventory(preferenceControls.slice(1), preferenceAuxiliaryControls)).toThrow(/missing/iu);
		expect(() => assertPreferenceInventory([...preferenceControls, { key: 'fixture.unknown', destinationId: 'display-general' }], preferenceAuxiliaryControls)).toThrow(/unknown/iu);
	});

	it('has explicit translated labels and captions rather than raw preference keys', () => {
		expect(preferenceControls.every(control => control.label.length > 0)).toBe(true);
		expect(preferenceAuxiliaryControls).toHaveLength(18);
		expect(preferenceAuxiliaryControls.every(control => control.label.length > 0 && Array.isArray(control.caption))).toBe(true);
		expect(surfaceSource).not.toContain('labelForKey');
		expect(surfaceSource).not.toContain('?? key');
		expect(preferenceControls.filter(control => control.cherry).map(control => destinationForId(control.destinationId)?.categoryId)).toEqual(Array(preferenceControls.filter(control => control.cherry).length).fill('cherrypick'));
	});

	it('uses one generated canonical DOM id even for duplicate legacy descriptors', () => {
		const descriptors = [
			{ stableId: 'settings.control.animation-accessibility', route: '/settings/preferences', source: 'control', preferenceKeys: ['animation'] },
			{ stableId: 'settings.control.animation-performance', route: '/settings/preferences', source: 'control', preferenceKeys: ['animation'] },
			{ stableId: 'settings.control.reply-target', route: '/settings/preferences', source: 'control', preferenceKeys: ['showReplyTargetNote'] },
		];
		expect(legacyDescriptorIdsForPreferenceKey('animation', descriptors)).toHaveLength(2);
		expect(canonicalSearchIdForPreferenceKey('animation', descriptors)).toBe(generatedPreferenceSearchId('animation'));
		expect(searchIdForPreferenceKey('animation', descriptors)).toBe(generatedPreferenceSearchId('animation'));
		expect(destinationForSearchDescriptor({ preferenceKeys: ['animation'] })).toBe('misskey-accessibility');
		expect(destinationForPreferenceKey('externalNavigationWarning')).toBe('cherrypick-external-navigation');
	});

	it('preserves range, options, previews, and progressive-disclosure conditions', () => {
		const byKey = new Map(preferenceControls.map(control => [control.key, control]));
		expect(byKey.get('pollingInterval')).toMatchObject({ kind: 'range', min: 1, max: 3 });
		expect(byKey.get('fontSize')).toMatchObject({ kind: 'range', min: 1, max: 19 });
		expect(byKey.get('numberOfPageCache')).toMatchObject({ kind: 'range', min: 1, max: 10 });
		expect(byKey.get('notificationPosition')?.options).toEqual(['leftTop', 'rightTop', 'leftBottom', 'rightBottom']);
		expect(byKey.get('defaultNoteVisibility')?.options).toEqual(['public', 'home', 'followers', 'specified']);
		expect(byKey.get('showingAnimatedImages')?.options).toEqual(['always', 'interaction', 'inactive']);
		expect(surfaceSource).toContain('control.key === \'smoothTransitionAnimations\'');
		expect(surfaceSource).toContain('control.key === \'removeModalBgColorForBlur\'');
		expect(surfaceSource).toContain('key === \'animatedMfm\'');
		expect(surfaceSource).toContain('fontSizePreview');
		expect(surfaceSource).toContain('emojiPreview');
		expect(surfaceSource).toContain('mfmPreview');
	});
});
