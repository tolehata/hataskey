import { describe, expect, test } from 'vitest';
import { DEFAULT_POLICIES, normalizeHatacordingUiRateLimit, normalizeHatacordingUiSubpaneMaxTabs } from '@/core/RoleService.js';
import { packedRolePoliciesSchema } from '@/models/json-schema/role.js';

describe('HataSNSCordUI role policy', () => {
	test('is enabled by default and allows three subpane tabs', () => {
		expect(DEFAULT_POLICIES.canAccessHataFeed).toBe(false);
		expect(DEFAULT_POLICIES.canUseHatacordingUi).toBe(true);
		expect(DEFAULT_POLICIES.hatacordingUiSubpaneMaxTabs).toBe(3);
		expect(DEFAULT_POLICIES.hatacordingUiRateLimit).toBe(500);
		expect(DEFAULT_POLICIES.canBypassHatacordingUiRateLimit).toBe(false);
	});

	test('clamps the aggregated UI-wide rate limit to 1-1000', () => {
		expect(normalizeHatacordingUiRateLimit([0])).toBe(1);
		expect(normalizeHatacordingUiRateLimit([250, 750])).toBe(750);
		expect(normalizeHatacordingUiRateLimit([2000])).toBe(1000);
		expect(normalizeHatacordingUiRateLimit([Number.NaN, 'broken'])).toBe(500);
	});

	test('clamps the aggregated tab limit to 1-5', () => {
		expect(normalizeHatacordingUiSubpaneMaxTabs([0])).toBe(1);
		expect(normalizeHatacordingUiSubpaneMaxTabs([2, 4])).toBe(4);
		expect(normalizeHatacordingUiSubpaneMaxTabs([99])).toBe(5);
		expect(normalizeHatacordingUiSubpaneMaxTabs([Number.NaN, 'broken'])).toBe(3);
	});

	test('exposes the HataFeed and HataSNSCordUI policies through the API schema', () => {
		expect(packedRolePoliciesSchema.properties).toHaveProperty('canAccessHataFeed');
		expect(packedRolePoliciesSchema.properties).toHaveProperty('canUseHatacordingUi');
		expect(packedRolePoliciesSchema.properties).toHaveProperty('hatacordingUiSubpaneMaxTabs');
		expect(packedRolePoliciesSchema.properties).toHaveProperty('hatacordingUiRateLimit');
		expect(packedRolePoliciesSchema.properties).toHaveProperty('canBypassHatacordingUiRateLimit');
	});
});
