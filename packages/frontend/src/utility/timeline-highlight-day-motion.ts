/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

type DayMotionOptions = {
	stage: () => HTMLElement | null;
	scene: () => HTMLElement | null;
	motion: () => boolean;
};

type SavedStyle = ReturnType<typeof saveStyle>;
type SceneState = {
	element: HTMLElement;
	style: SavedStyle;
	opacity: string;
	transform: string;
};

const EASING = 'cubic-bezier(.2,.75,.15,1)';

/** Save only owned properties so unrelated reactive styles remain untouched. */
function saveStyle(element: HTMLElement, properties: string[]) {
	const saved = properties.map(property => ({
		property,
		value: element.style.getPropertyValue(property),
		priority: element.style.getPropertyPriority(property),
	}));
	return {
		restore(only?: string) {
			for (const { property, value, priority } of saved) {
				if (only != null && property !== only) continue;
				if (value) element.style.setProperty(property, value, priority);
				else element.style.removeProperty(property);
			}
		},
	};
}

function computedStyle(element: HTMLElement): CSSStyleDeclaration {
	return (element.ownerDocument.defaultView ?? window).getComputedStyle(element);
}

function sceneState(element: HTMLElement): SceneState {
	const computed = computedStyle(element);
	return {
		element,
		style: saveStyle(element, ['opacity', 'transform']),
		opacity: computed.opacity || '1',
		transform: computed.transform || 'none',
	};
}

function offsetTransform(transform: string, amount: number): string {
	return `translateX(${amount}px)${transform === 'none' ? '' : ` ${transform}`}`;
}

/** getBoundingClientRect measures the border box; CSS height may measure the content box. */
function cssHeight(element: HTMLElement, borderHeight: number): string {
	const computed = computedStyle(element);
	const extra = computed.boxSizing === 'border-box' ? 0 :
		[computed.paddingTop, computed.paddingBottom, computed.borderTopWidth, computed.borderBottomWidth]
			.reduce((sum, value) => sum + (Number.parseFloat(value) || 0), 0);
	return `${Math.max(0, borderHeight - extra)}px`;
}

/** Hold one real scene across a day request; the caller owns data, inertness and focus. */
export function createTimelineHighlightDayMotion(options: DayMotionOptions) {
	let held: { stage: HTMLElement; style: SavedStyle; scene: SceneState; direction: -1 | 1 } | null = null;
	let generation = 0;
	let resolvePending: (() => void) | null = null;
	const animations = new Set<Animation>();
	let entering = false;

	function interrupt(restore: boolean) {
		generation++;
		resolvePending?.();
		resolvePending = null;
		for (const animation of animations) animation.cancel();
		animations.clear();
		entering = false;
		if (restore && held) {
			held.style.restore();
			held.scene.style.restore();
			held = null;
		}
	}

	function animate(element: HTMLElement, frames: Keyframe[], duration: number) {
		const animation = element.animate(frames, { duration, easing: EASING, fill: 'forwards' });
		animations.add(animation);
		// Always observe cancellation, including an exception while starting another animation.
		void animation.finished.catch(() => {});
		return animation;
	}

	function waitFor(current: Animation[], restore: boolean): Promise<void> {
		const ownGeneration = generation;
		return new Promise(resolve => {
			resolvePending = resolve;
			void Promise.allSettled(current.map(animation => animation.finished)).then(() => {
				if (generation !== ownGeneration) return;
				resolvePending = null;
				if (restore) interrupt(true);
				resolve();
			});
		});
	}

	function leave(direction: -1 | 1): Promise<void> {
		const stage = options.stage();
		const scene = options.scene();
		if (!stage || !scene) {
			interrupt(true);
			return Promise.resolve();
		}
		// Read the animated frame before cancelling it; repeated clicks start from this frame.
		const height = cssHeight(stage, stage.getBoundingClientRect().height);
		const computed = computedStyle(scene);
		const from = { opacity: computed.opacity || '1', transform: computed.transform || 'none' };
		const sameScene = held?.stage === stage && held.scene.element === scene;
		interrupt(!sameScene);
		held ??= { stage, style: saveStyle(stage, ['height', 'overflow-x', 'overflow-y']), scene: sceneState(scene), direction };
		held.direction = direction;
		stage.style.setProperty('height', height);
		stage.style.setProperty('overflow-x', 'hidden');
		stage.style.setProperty('overflow-y', 'hidden');
		const to = { opacity: '0', transform: offsetTransform(held.scene.transform, -direction * 8) };
		scene.style.setProperty('opacity', to.opacity);
		scene.style.setProperty('transform', to.transform);
		if (!options.motion() || typeof scene.animate !== 'function') return Promise.resolve();
		try {
			return waitFor([animate(scene, [from, to], 150)], false);
		} catch {
			interrupt(false);
			return Promise.resolve();
		}
	}

	/** Call after committing the new scene and awaiting the framework's DOM update. */
	function enter(): Promise<void> {
		const stage = options.stage();
		const scene = options.scene();
		if (!held || !stage || !scene || held.stage !== stage) {
			interrupt(true);
			return Promise.resolve();
		}
		const height = cssHeight(stage, stage.getBoundingClientRect().height);
		const computed = computedStyle(scene);
		const current = entering && held.scene.element === scene
			? { opacity: computed.opacity || '1', transform: computed.transform || 'none' }
			: null;
		interrupt(false);
		if (held.scene.element !== scene) {
			held.scene.style.restore();
			held.scene = sceneState(scene);
		}
		// Temporarily release height to measure the new natural layout, then hold the old height.
		held.style.restore('height');
		const naturalHeight = cssHeight(stage, stage.getBoundingClientRect().height);
		stage.style.setProperty('height', height);
		const target = { opacity: held.scene.opacity, transform: held.scene.transform };
		const from = current ?? { opacity: '0', transform: offsetTransform(target.transform, held.direction * 8) };
		scene.style.setProperty('opacity', target.opacity);
		scene.style.setProperty('transform', target.transform);
		if (!options.motion() || typeof stage.animate !== 'function' || typeof scene.animate !== 'function') {
			interrupt(true);
			return Promise.resolve();
		}
		entering = true;
		try {
			return waitFor([
				animate(stage, [{ height }, { height: naturalHeight }], 260),
				animate(scene, [from, target], 260),
			], true);
		} catch {
			interrupt(true);
			return Promise.resolve();
		}
	}

	return { leave, enter, cancel: () => interrupt(true), finish: () => interrupt(true) };
}
