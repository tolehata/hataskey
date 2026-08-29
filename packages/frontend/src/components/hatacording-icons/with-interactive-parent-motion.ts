/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue';
import type { Component } from 'vue';

type AnimatedIconHandle = {
	startAnimation?: () => void;
	stopAnimation?: () => void;
};

const INTERACTIVE_PARENT_SELECTOR = 'button, a[href], [role="button"], [role="menuitem"], [role="tab"]';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const TOUCH_RESET_DELAY = 2400;

function motionIsEnabled(host: HTMLElement): boolean {
	if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return false;
	if (window.document.documentElement.dataset.hatacordingAnimation === 'false') return false;
	return host.closest('[data-animation="false"]') == null;
}

/**
 * pqoqubbw/icons の公開制御APIを、実際の操作面である親ボタンへ接続する。
 * アイコン自体は装飾のままにし、フォーカス順を増やさない。
 */
export function withInteractiveParentMotion(icon: Component): Component {
	return defineComponent({
		name: 'HatacordingInteractiveIcon',
		inheritAttrs: false,
		props: {
			size: {
				type: Number,
				default: 28,
			},
		},
		setup(props, { attrs }) {
			const host = ref<HTMLElement | null>(null);
			const iconInstance = ref<AnimatedIconHandle | null>(null);
			let interactiveParent: HTMLElement | null = null;
			let touchResetTimer: number | null = null;

			function stopTouchResetTimer(): void {
				if (touchResetTimer == null) return;
				window.clearTimeout(touchResetTimer);
				touchResetTimer = null;
			}

			function startAnimation(): void {
				const currentHost = host.value;
				if (currentHost == null || !motionIsEnabled(currentHost)) {
					iconInstance.value?.stopAnimation?.();
					return;
				}
				iconInstance.value?.startAnimation?.();
			}

			function stopAnimation(): void {
				stopTouchResetTimer();
				iconInstance.value?.stopAnimation?.();
			}

			function handlePointerDown(event: PointerEvent): void {
				if (event.pointerType === 'mouse') return;
				startAnimation();
				stopTouchResetTimer();
				touchResetTimer = window.setTimeout(() => {
					touchResetTimer = null;
					iconInstance.value?.stopAnimation?.();
				}, TOUCH_RESET_DELAY);
			}

			onMounted(() => {
				interactiveParent = host.value?.closest<HTMLElement>(INTERACTIVE_PARENT_SELECTOR) ?? null;
				if (interactiveParent == null) return;
				interactiveParent.addEventListener('mouseenter', startAnimation);
				interactiveParent.addEventListener('mouseleave', stopAnimation);
				interactiveParent.addEventListener('focusin', startAnimation);
				interactiveParent.addEventListener('focusout', stopAnimation);
				interactiveParent.addEventListener('pointerdown', handlePointerDown);
			});

			onBeforeUnmount(() => {
				stopTouchResetTimer();
				if (interactiveParent == null) return;
				interactiveParent.removeEventListener('mouseenter', startAnimation);
				interactiveParent.removeEventListener('mouseleave', stopAnimation);
				interactiveParent.removeEventListener('focusin', startAnimation);
				interactiveParent.removeEventListener('focusout', stopAnimation);
				interactiveParent.removeEventListener('pointerdown', handlePointerDown);
			});

			return () => h('span', {
				...attrs,
				ref: host,
				'data-hatacording-animated-icon': '',
				'data-hatacording-animated-icon-host': '',
				'aria-hidden': 'true',
			}, [h(icon, { ref: iconInstance, size: props.size })]);
		},
	});
}
