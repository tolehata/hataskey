/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { computed, inject, onActivated, onDeactivated, onUnmounted, ref, shallowRef, toValue, watchEffect } from 'vue';
import type { InjectionKey, MaybeRefOrGetter } from 'vue';

export type HataskeyTimelineNewNotes = {
	text: string;
	icon: string;
	show: () => void | Promise<void>;
};

export function createHataskeyTimelineNewNotes(activeKey: MaybeRefOrGetter<string | null>) {
	const current = shallowRef<{ owner: symbol; key: string; notice: HataskeyTimelineNewNotes } | null>(null);
	return {
		activeKey: computed(() => toValue(activeKey)),
		notice: computed(() => current.value?.key === toValue(activeKey) ? current.value.notice : null),
		update(owner: symbol, key: string | undefined, notice: HataskeyTimelineNewNotes | null) {
			if (key != null && key === toValue(activeKey) && notice != null) {
				current.value = { owner, key, notice };
			} else if (current.value?.owner === owner) {
				current.value = null;
			}
		},
	};
}

export const hataskeyTimelineNewNotesKey: InjectionKey<ReturnType<typeof createHataskeyTimelineNewNotes>> = Symbol('hataskey-timeline-new-notes');

/** 新着キューは元のタイムラインが保持し、表示中のタイムラインだけがナビバーを使う。 */
export function useHataskeyTimelineNewNotes(key: MaybeRefOrGetter<string | undefined>, notice: MaybeRefOrGetter<HataskeyTimelineNewNotes | null>) {
	const context = inject(hataskeyTimelineNewNotesKey, null);
	const active = ref(true);
	const owner = Symbol('timeline');
	const integrated = computed(() => context != null && active.value && toValue(key) != null && toValue(key) === context.activeKey.value);

	watchEffect(() => {
		context?.update(owner, toValue(key), integrated.value ? toValue(notice) : null);
	});
	onActivated(() => { active.value = true; });
	onDeactivated(() => { active.value = false; });
	onUnmounted(() => context?.update(owner, undefined, null));

	return integrated;
}
