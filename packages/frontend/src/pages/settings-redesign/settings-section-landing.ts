/* SPDX-License-Identifier: AGPL-3.0-only */

/** Choose a default only when the user opens a category, never for a tab or search target. */
export function sectionLandingItem<T extends { id: string }>(section: { id: string; items: readonly T[] }, ui: string | null): T | undefined {
	if (section.id === 'hataskey-ui' && ui === 'hataskey3') {
		return section.items.find(item => item.id === 'hataskey-ui-s') ?? section.items[0];
	}
	return section.items[0];
}
