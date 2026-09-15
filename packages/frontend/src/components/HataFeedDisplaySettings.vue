<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<component
	:is="embedded ? 'section' : MkWindow"
	class="hatady-scope hatafeed-scope" :class="$style.surface" :data-hatady-theme="hataFeedTheme" :data-embedded="embedded" :data-motion="prefer.r.animation.value"
	v-bind="embedded ? {} : { initialWidth: 650, initialHeight: null, autoHeight: true, canResize: true, centerTitle: true }" @closed="emit('closed')"
>
	<template v-if="!embedded" #header>HataFeed の設定</template>
	<div :class="$style.content">
		<section :class="$style.themeGroup" aria-labelledby="hatafeed-theme-label" data-settings-search-group-id="settings.group.hatafeed-theme">
			<h2 id="hatafeed-theme-label" :class="$style.title">テーマ</h2>
			<div :class="$style.carousel" aria-label="HataFeed のテーマ">
				<button type="button" class="hf-icon" aria-label="前のテーマ" :disabled="themeIndex === 0" @click="move(-1)"><i class="ti ti-chevron-left" aria-hidden="true"></i></button>
				<div :class="$style.viewport" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd" @touchcancel="touchStart = null" @click.capture="guardSwipeClick">
					<button
						v-for="(theme, index) in themes" :key="theme.value" type="button" :class="$style.card" :style="{ '--offset': index - themeIndex }"
						:aria-label="theme.label" :aria-pressed="theme.value === hataFeedTheme" :aria-hidden="Math.abs(index - themeIndex) > 1" :tabindex="Math.abs(index - themeIndex) > 1 ? -1 : 0" @click="choose(theme.value)"
					>
						<span class="hatady-scope" :class="$style.preview" :data-hatady-theme="theme.value" aria-hidden="true"><b>HataFeed</b><span><i :class="theme.icon"></i>イシュー</span><span :class="$style.previewRows"><i></i><i></i><i></i></span></span>
						<strong>{{ theme.label }}</strong><small>{{ theme.value === hataFeedTheme ? '選択中' : '選ぶ' }}</small>
					</button>
				</div>
				<button type="button" class="hf-icon" aria-label="次のテーマ" :disabled="themeIndex === themes.length - 1" @click="move(1)"><i class="ti ti-chevron-right" aria-hidden="true"></i></button>
			</div>
			<div :class="$style.dots" role="group" aria-label="テーマを選ぶ">
				<button v-for="theme in themes" :key="theme.value" type="button" class="hf-icon" :aria-label="theme.label" :aria-pressed="theme.value === hataFeedTheme" @click="choose(theme.value)"><span :data-active="theme.value === hataFeedTheme"></span></button>
			</div>
		</section>
		<label :class="$style.toggle"><span>背景に若葉のアニメーションを表示する</span><input type="checkbox" aria-label="背景に若葉のアニメーションを表示する" :checked="leaves" @change="setLeaves"></label>
		<HataFeedProjectSettings @changed="emit('projectsChanged')"/>
		<section :class="$style.tutorials" aria-label="チュートリアル">
			<h2 :class="$style.title">チュートリアル</h2>
			<button type="button" class="hy-secondary" @click="rerunTutorial($event, 'initial')"><i class="ti ti-book" aria-hidden="true"></i>HataFeedの使い方<i class="ti ti-chevron-right" aria-hidden="true"></i></button>
			<button type="button" class="hy-secondary" @click="rerunTutorial($event, 'update')"><i class="ti ti-sparkles" aria-hidden="true"></i>新しくなったHataFeed<i class="ti ti-chevron-right" aria-hidden="true"></i></button>
		</section>
		<p v-if="error" role="alert">{{ error }}</p>
	</div>
</component>
</template>

<script setup lang="ts">
import { computed, onActivated, onDeactivated, onUnmounted, ref } from 'vue';
import type { HataFeedTheme } from '@/utility/hatasaba-device-prefs.js';
import type { HataFeedTutorialKind } from '@/utility/hatafeed-tutorial-content.js';
import MkWindow from '@/components/MkWindow.vue';
import HataFeedProjectSettings from '@/components/HataFeedProjectSettings.vue';
import { hataFeedTheme, setHataFeedTheme } from '@/utility/hatasaba-device-prefs.js';
import { prefer } from '@/preferences.js';
import { iAmModerator } from '@/i.js';
import { showHataFeedTutorial } from '@/utility/hatafeed-tutorial-launcher.js';
import '@/components/hatafeed-ui.css';

withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });
const emit = defineEmits<{ closed: []; projectsChanged: [] }>();
const themes: { value: HataFeedTheme; label: string; icon: string }[] = [
	{ value: 'light', label: 'ライト', icon: 'ti ti-sun' },
	{ value: 'dark', label: 'ダーク', icon: 'ti ti-moon' },
	{ value: 'paper', label: 'ペーパー', icon: 'ti ti-book' },
	{ value: 'espresso', label: 'エスプレッソ', icon: 'ti ti-coffee' },
];
const themeIndex = computed(() => themes.findIndex(theme => theme.value === hataFeedTheme.value));
const leaves = prefer.r['hatafeed.leaves'];
const error = ref('');
let touchStart: { x: number; y: number } | null = null;
let swipedUntil = 0;

function choose(theme: HataFeedTheme) {
	try { setHataFeedTheme(theme); error.value = ''; } catch { error.value = 'テーマを保存できませんでした'; }
}

function move(direction: number) {
	const theme = themes[themeIndex.value + direction];
	if (theme) choose(theme.value);
}

function setLeaves(event: Event) { prefer.commit('hatafeed.leaves', (event.target as HTMLInputElement).checked); }

function onTouchStart(event: TouchEvent) {
	const point = event.touches[0];
	touchStart = event.touches.length === 1 ? { x: point.clientX, y: point.clientY } : null;
}

function onTouchEnd(event: TouchEvent) {
	const start = touchStart;
	touchStart = null;
	if (!start || !event.changedTouches[0]) return;
	const dx = event.changedTouches[0].clientX - start.x;
	const dy = event.changedTouches[0].clientY - start.y;
	if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) { move(dx < 0 ? 1 : -1); swipedUntil = Date.now() + 500; }
}

function guardSwipeClick(event: MouseEvent) {
	if (Date.now() < swipedUntil) { event.preventDefault(); event.stopPropagation(); }
}

let tutorialActive = true;
let stopTutorial: (() => void) | undefined;

async function rerunTutorial(event: MouseEvent, kind: HataFeedTutorialKind) {
	const stop = await showHataFeedTutorial({ kind, replay: true, isStaff: iAmModerator, isActive: () => tutorialActive, anchorElement: event.currentTarget as HTMLElement });
	if (!stop) return;
	if (tutorialActive) stopTutorial = stop;
	else stop?.();
}

function stopOwnedTutorial() { tutorialActive = false; stopTutorial?.(); }

onActivated(() => { tutorialActive = true; });
onDeactivated(stopOwnedTutorial);
onUnmounted(stopOwnedTutorial);
</script>

<style module>
.surface[data-embedded='true'] { height: auto; min-height: 0; overflow: visible; overscroll-behavior: auto; background: transparent; }
.content { display: grid; gap: 18px; padding: 24px; text-align: center; }
.surface[data-embedded='true'] .content { padding: 12px 0; }
.themeGroup { display: grid; gap: 18px; }
.title { margin: 0; font-size: 18px; }
.carousel { display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px; align-items: center; }
.viewport { position: relative; height: 250px; overflow: clip; touch-action: pan-y; }
.card { position: absolute; top: 12px; left: 50%; width: min(230px, 85%); display: grid; gap: 8px; padding: 12px; border: 1px solid var(--hy-border); border-radius: 22px; color: var(--hy-ink); background: var(--hy-surface); transform: translateX(calc(-50% + var(--offset) * 85%)) scale(.8); transition: transform .25s, opacity .25s; cursor: pointer; }
.card[aria-pressed='true'] { transform: translateX(-50%); border-color: var(--hy-accent); box-shadow: 0 0 0 2px var(--hy-accent); z-index: 2; }
.card[aria-hidden='true'] { visibility: hidden; }
.preview { display: grid; gap: 12px; min-height: 130px; padding: 14px; border: 1px solid var(--hy-border); border-radius: 14px; text-align: left; background: var(--hy-bg); color: var(--hy-ink); }
.preview b { font-family: 'Hatady Brand', sans-serif; font-size: 20px; color: var(--hy-accent); }
.previewRows { display: flex; gap: 6px; }
.previewRows i { width: 30%; height: 25px; border-radius: 8px; background: var(--hy-surface); }
.dots { display: flex; justify-content: center; }
.dots span { width: 7px; height: 7px; border-radius: 999px; background: var(--hy-border); }
.dots span[data-active='true'] { width: 22px; background: var(--hy-accent); }
.toggle { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 48px; padding: 14px; border: 1px solid var(--hy-border); border-radius: 16px; }
.toggle input { flex: none; width: 20px; height: 20px; accent-color: var(--hy-accent); }
.tutorials { display: grid; gap: 10px; }
.tutorials h2 { margin-bottom: 4px; }
.tutorials button { width: 100%; min-height: 44px; }
.surface[data-motion='false'] .card { transition: none; }
@media (prefers-reduced-motion: reduce) { .card { transition: none; } }
</style>
