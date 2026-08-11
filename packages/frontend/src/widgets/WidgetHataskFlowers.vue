<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
Hataskの育成中の花と直近のギャラリーを、通常UI・HatasabaUIデッキ共通で表示する。
-->
<template>
<MkContainer :naked="widgetProps.transparent" :showHeader="widgetProps.showHeader">
	<template #icon><i class="ti ti-flower"></i></template>
	<template #header>{{ copy.title }}</template>
	<template #func="{ buttonStyleClass }">
		<button class="_button" :class="buttonStyleClass" :aria-label="copy.openHatask" @click="goHatask"><i class="ti ti-external-link"></i></button>
	</template>

	<div :class="$style.root">
		<button type="button" :class="$style.growing" @click="goHatask">
			<span
				:class="$style.progressRing"
				:style="{ '--flower-progress': `${flower.progress * 3.6}deg` }"
				role="progressbar"
				:aria-label="copy.growthProgress"
				:aria-valuenow="flower.progress"
				aria-valuemin="0"
				aria-valuemax="100"
			>
				<span :class="$style.progressInner">{{ flower.emoji }}</span>
			</span>
			<span :class="$style.growingText">
				<span :class="$style.kicker">{{ copy.nowGrowing }}</span>
				<strong :class="$style.flowerName">{{ growingFlowerName }}</strong>
				<span :class="$style.progressText">{{ flower.progress }}%<span aria-hidden="true"> ・ </span>{{ remainingText }}</span>
			</span>
		</button>

		<div :class="$style.divider"></div>
		<div :class="$style.collectionHead">
			<span>{{ copy.bloomedFlowers }}</span>
			<span :class="$style.count">{{ i18n.tsx._hata._hatask._flowerWidget.flowerCount({ count: totalCount }) }}</span>
		</div>
		<div v-if="flowers.length" :class="$style.flowerList">
			<button v-for="item in flowers" :key="item.id" type="button" :class="$style.flowerChip" :title="localizeFloraName(item.name)" @click="goHatask">
				<span :class="$style.flowerEmoji">{{ item.emoji }}</span>
				<span :class="$style.chipName">{{ localizeFloraName(item.name) }}</span>
			</button>
		</div>
		<div v-else :class="$style.empty">{{ copy.growingFirstFlower }}</div>
	</div>
</MkContainer>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useWidgetPropsManager } from './widget.js';
import type { WidgetComponentEmits, WidgetComponentExpose, WidgetComponentProps } from './widget.js';
import type { FormWithDefault, GetFormResultType } from '@/utility/form.js';
import type { HataskFlower } from '@/utility/hatask-flower-widget.js';
import MkContainer from '@/components/MkContainer.vue';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { useRouter } from '@/router.js';
import { countFlowerGallery, normalizeFlowerGallery, normalizeGrowingFlower } from '@/utility/hatask-flower-widget.js';
import { localizeFloraName } from '@/utility/hatask-flora.js';

const name = 'hataskFlowers';
const SCOPE = ['client', 'hatask'];
const copy = i18n.ts._hata._hatask._flowerWidget;

const widgetPropsDef = {
	transparent: { type: 'boolean', default: false },
	showHeader: { type: 'boolean', default: true },
	maxItems: {
		type: 'enum',
		default: '5',
		label: copy.listCount,
		enum: [
			{ label: i18n.tsx._hata._hatask._flowerWidget.flowerCount({ count: 3 }), value: '3' },
			{ label: i18n.tsx._hata._hatask._flowerWidget.flowerCount({ count: 5 }), value: '5' },
			{ label: i18n.tsx._hata._hatask._flowerWidget.flowerCount({ count: 8 }), value: '8' },
		],
	},
} satisfies FormWithDefault;

type WidgetProps = GetFormResultType<typeof widgetPropsDef>;

const props = defineProps<WidgetComponentProps<WidgetProps>>();
const emit = defineEmits<WidgetComponentEmits<WidgetProps>>();
const { widgetProps, configure } = useWidgetPropsManager(name, widgetPropsDef, props, emit);
const router = useRouter();

const flower = ref<HataskFlower>(normalizeGrowingFlower(null));
const rawGallery = ref<unknown>([]);
const growingFlowerName = computed(() => localizeFloraName(flower.value.name));
const flowers = computed(() => normalizeFlowerGallery(rawGallery.value, Number(widgetProps.maxItems), copy.unnamedFlower));
const totalCount = computed(() => countFlowerGallery(rawGallery.value));
let refreshTimer: number | null = null;

const remainingText = computed(() => {
	if (flower.value.progress >= 100) return copy.flowerBloomed;
	const minutes = Math.max(0, 1200 - flower.value.totalMinutes);
	if (minutes < 60) return copy.bloomingSoon;
	return i18n.tsx._hata._hatask._flowerWidget.hoursRemaining({ hours: Math.ceil(minutes / 60) });
});

async function loadFlowers(): Promise<void> {
	const [flowerResult, galleryResult] = await Promise.allSettled([
		misskeyApi('i/registry/get', { key: 'flower', scope: SCOPE }),
		misskeyApi('i/registry/get', { key: 'gallery', scope: SCOPE }),
	]);
	if (flowerResult.status === 'fulfilled') flower.value = normalizeGrowingFlower(flowerResult.value);
	if (galleryResult.status === 'fulfilled') {
		rawGallery.value = galleryResult.value;
	}
}

function goHatask(): void {
	router.push('/hatask');
}

function onVisibilityChange(): void {
	if (!window.document.hidden) void loadFlowers();
}

onMounted(() => {
	void loadFlowers();
	refreshTimer = window.setInterval(() => void loadFlowers(), 60 * 1000);
	window.document.addEventListener('visibilitychange', onVisibilityChange);
});

onUnmounted(() => {
	if (refreshTimer != null) window.clearInterval(refreshTimer);
	window.document.removeEventListener('visibilitychange', onVisibilityChange);
});

defineExpose<WidgetComponentExpose>({
	name,
	configure,
	get id() {
		return props.widget?.id ?? null;
	},
});
</script>

<style lang="scss" module>
.root {
	padding: 10px;
	container-type: inline-size;
}

.growing {
	display: grid;
	grid-template-columns: 68px minmax(0, 1fr);
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 2px;
	border: 0;
	color: var(--MI_THEME-fg);
	background: transparent;
	text-align: left;
	cursor: pointer;
}

.progressRing {
	display: grid;
	place-items: center;
	width: 64px;
	height: 64px;
	border-radius: 50%;
	background: conic-gradient(var(--MI_THEME-accent) var(--flower-progress), color-mix(in srgb, var(--MI_THEME-accent) 13%, var(--MI_THEME-panel)) 0);
}

.progressInner {
	display: grid;
	place-items: center;
	width: 50px;
	height: 50px;
	border-radius: 50%;
	background: var(--MI_THEME-panel);
	font-size: 27px;
}

.growingText { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.kicker { color: var(--MI_THEME-accent); font-size: 0.64em; font-weight: 800; letter-spacing: 0.1em; }
.flowerName { overflow: hidden; font-size: 0.96em; text-overflow: ellipsis; white-space: nowrap; }
.progressText { font-size: 0.73em; opacity: 0.66; }
.divider { height: 1px; margin: 9px 0 7px; background: var(--MI_THEME-divider); }
.collectionHead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-size: 0.73em; font-weight: 700; }
.count { color: var(--MI_THEME-accent); font-variant-numeric: tabular-nums; }
.flowerList { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 5px; }
.flowerChip { min-width: 0; padding: 5px 2px 4px; border: 1px solid color-mix(in srgb, var(--MI_THEME-accent) 16%, var(--MI_THEME-divider)); border-radius: 10px; color: var(--MI_THEME-fg); background: color-mix(in srgb, var(--MI_THEME-accent) 7%, var(--MI_THEME-panel)); cursor: pointer; }
.flowerChip:hover { border-color: color-mix(in srgb, var(--MI_THEME-accent) 45%, var(--MI_THEME-divider)); }
.flowerEmoji { display: block; font-size: 1.25em; line-height: 1.2; }
.chipName { display: block; overflow: hidden; margin-top: 2px; font-size: 0.58em; text-overflow: ellipsis; white-space: nowrap; }
.empty { padding: 4px 2px; font-size: 0.72em; opacity: 0.55; text-align: center; }

@container (max-width: 250px) {
	.flowerList { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (prefers-reduced-motion: reduce) {
	.flowerChip { transition: none; }
}
</style>
