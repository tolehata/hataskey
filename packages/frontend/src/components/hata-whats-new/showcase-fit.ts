// SPDX-License-Identifier: AGPL-3.0-only
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { Ref } from 'vue';

// Desktop shows the complete layout. Mobile fills the width and softly fades
// any lower content beyond the allocated height, without becoming scrollable.
export function useShowcaseFit(figure: Ref<HTMLElement | null>, canvas: Ref<HTMLElement | null>) {
	const availableWidth = ref(870);
	const availableHeight = ref(380);
	const contentHeight = ref(900);
	const mobile = computed(() => availableWidth.value < 550);
	const logicalWidth = computed(() => mobile.value ? 390 : 1100);
	const contentSpace = computed(() => Math.max(0, availableHeight.value - 2));
	const widthScale = computed(() => Math.max(0, (availableWidth.value - 2) / logicalWidth.value));
	const scale = computed(() => mobile.value ? widthScale.value : Math.min(1, widthScale.value, contentSpace.value / contentHeight.value));
	const fullHeight = computed(() => contentHeight.value * scale.value);
	const fadeBottom = computed(() => mobile.value && fullHeight.value > contentSpace.value + .5);
	const viewportStyle = computed(() => ({
		width: `${logicalWidth.value * scale.value + 2}px`,
		height: `${Math.min(fullHeight.value, contentSpace.value) + 2}px`,
	}));
	const canvasStyle = computed(() => ({ width: `${logicalWidth.value}px`, transform: `scale(${scale.value})` }));
	let observer: ResizeObserver | undefined;
	let disposed = false;

	function measure() {
		if (disposed) return;
		const slot = figure.value?.parentElement;
		if (slot?.clientWidth) availableWidth.value = slot.clientWidth;
		if (slot?.clientHeight) availableHeight.value = slot.clientHeight;
		if (canvas.value?.offsetHeight) contentHeight.value = canvas.value.offsetHeight + 1;
	}

	onMounted(() => {
		observer = new ResizeObserver(measure);
		const elements = [figure.value?.parentElement, canvas.value];
		for (const element of elements) if (element) observer.observe(element);
		measure();
		// ResizeObserver also measures font loads and sample cards that change the natural height.
	});
	onBeforeUnmount(() => { disposed = true; observer?.disconnect(); });
	return { mobile, fadeBottom, viewportStyle, canvasStyle };
}
