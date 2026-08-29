<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<MkModal ref="modal" v-slot="{ type }" :anchorElement="anchorElement" :zPriority="'high'" motionPreset="postform" @click="modal?.close()" @closed="emit('closed')" @esc="modal?.close()">
	<section :class="[$style.root, type === 'drawer' && $style.drawer]" :data-color-mode="colorMode" role="dialog" :aria-label="i18n.ts.visibility">
		<header :class="$style.header"><strong>{{ i18n.ts.visibility }}</strong><span>{{ audienceLabel }}</span></header>
		<div :class="$style.grid" role="radiogroup" :aria-label="i18n.ts.visibility">
			<button v-for="item in choices" :key="item.value" type="button" role="radio" :aria-checked="currentVisibility === item.value" :class="$style.choice" @click="choose(item.value)">
				<span :class="$style.icon"><component :is="item.icon" :size="18"/></span>
				<span :class="$style.copy"><b>{{ item.label }}</b><small>{{ item.description }}</small></span>
				<span :class="$style.check" aria-hidden="true"></span>
			</button>
		</div>
		<div :class="$style.options">
			<button type="button" role="switch" :aria-checked="!localOnlyState" :disabled="currentVisibility === 'specified'" :class="$style.option" @click="toggleLocalOnly">
				<component :is="federationIcon" :size="17"/><span>{{ federateLabel }}</span><span :class="$style.track" aria-hidden="true"><i></i></span>
			</button>
			<button type="button" role="switch" :aria-checked="rememberState" :class="$style.option" @click="toggleRemember">
				<component :is="rememberIcon" :size="17"/><span>{{ rememberLabel }}</span><span :class="$style.track" aria-hidden="true"><i></i></span>
			</button>
		</div>
	</section>
</MkModal>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import { AtSign, Globe2, History, Home, Lock, RadioTower } from '@/components/hatacording-icons/index.js';
import MkModal from '@/components/MkModal.vue';
import { i18n } from '@/i18n.js';

type Visibility = 'public' | 'home' | 'followers' | 'specified';

const props = defineProps<{
	anchorElement: HTMLElement;
	colorMode: 'theme' | 'light' | 'dark';
	currentVisibility: Visibility;
	localOnly: boolean;
	remember: boolean;
	audienceLabel: string;
	federateLabel: string;
	rememberLabel: string;
	labels: Record<Visibility, string>;
}>();
const emit = defineEmits<{
	(ev: 'changeVisibility', value: Visibility): void;
	(ev: 'changeLocalOnly', value: boolean): void;
	(ev: 'changeRemember', value: boolean): void;
	(ev: 'closed'): void;
}>();
const modal = useTemplateRef('modal');
const localOnlyState = ref(false);
const rememberState = ref(false);
const publicIcon = Globe2;
const homeIcon = Home;
const followersIcon = Lock;
const directIcon = AtSign;
const federationIcon = RadioTower;
const rememberIcon = History;
const choices = computed(() => [
	{ value: 'public' as const, icon: publicIcon, label: props.labels.public, description: i18n.ts._visibility.publicDescription },
	{ value: 'home' as const, icon: homeIcon, label: props.labels.home, description: i18n.ts._visibility.homeDescription },
	{ value: 'followers' as const, icon: followersIcon, label: props.labels.followers, description: i18n.ts._visibility.followersDescription },
	{ value: 'specified' as const, icon: directIcon, label: props.labels.specified, description: i18n.ts._visibility.specifiedDescription },
]);

watch(() => props.localOnly, value => { localOnlyState.value = value; }, { immediate: true });
watch(() => props.remember, value => { rememberState.value = value; }, { immediate: true });

function choose(value: Visibility): void {
	emit('changeVisibility', value);
	nextTick(() => modal.value?.close());
}

function toggleLocalOnly(): void {
	localOnlyState.value = !localOnlyState.value;
	emit('changeLocalOnly', localOnlyState.value);
}

function toggleRemember(): void {
	rememberState.value = !rememberState.value;
	emit('changeRemember', rememberState.value);
}
</script>

<style lang="scss" module>
.root{width:min(330px,calc(100vw - 24px));padding:10px;border:1px solid color-mix(in srgb,var(--MI_THEME-accent) 22%,var(--MI_THEME-divider));border-radius:20px;background:var(--MI_THEME-panel);color:var(--MI_THEME-fg);box-shadow:0 22px 54px var(--MI_THEME-shadow);box-sizing:border-box}.root[data-color-mode='light']{--MI_THEME-bg:#f3f5f8;--MI_THEME-panel:#fff;--MI_THEME-fg:#1c2430;--MI_THEME-divider:#d6dce5;--MI_THEME-hover:rgb(16 24 40 / 7%);--MI_THEME-shadow:rgb(16 24 40 / 16%);--MI_THEME-fgOnAccent:#fff;color-scheme:light}.root[data-color-mode='dark']{--MI_THEME-bg:#0f1218;--MI_THEME-panel:#181c25;--MI_THEME-fg:#edf1f7;--MI_THEME-divider:#343b49;--MI_THEME-hover:rgb(255 255 255 / 8%);--MI_THEME-shadow:rgb(0 0 0 / 42%);--MI_THEME-fgOnAccent:#fff;color-scheme:dark}.drawer{width:100%;padding:12px 12px max(12px,env(safe-area-inset-bottom));border-radius:20px 20px 0 0}.header{display:flex;align-items:center;justify-content:space-between;padding:3px 4px 9px}.header strong{font-size:.82rem}.header span{color:var(--MI_THEME-fg);font-size:.66rem;opacity:.58}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.choice{display:grid;position:relative;min-width:0;grid-template-columns:34px minmax(0,1fr);align-items:center;gap:8px;padding:9px;border:1px solid var(--MI_THEME-divider);border-radius:14px;background:var(--MI_THEME-bg);color:var(--MI_THEME-fg);font:inherit;text-align:left;cursor:pointer;transition:border-color .18s ease,background-color .18s ease,transform .2s cubic-bezier(.16,1,.3,1)}.choice:hover,.choice:focus-visible{border-color:color-mix(in srgb,var(--MI_THEME-accent) 55%,var(--MI_THEME-divider));background:color-mix(in srgb,var(--MI_THEME-accent) 7%,var(--MI_THEME-bg));transform:translateY(-1px)}.choice[aria-checked='true']{border-color:var(--MI_THEME-accent);background:color-mix(in srgb,var(--MI_THEME-accent) 11%,var(--MI_THEME-bg));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--MI_THEME-accent) 22%,transparent)}.icon{display:grid;width:34px;height:34px;place-items:center;border-radius:11px;background:color-mix(in srgb,var(--MI_THEME-fg) 7%,transparent);color:color-mix(in srgb,var(--MI_THEME-fg) 65%,transparent)}.choice[aria-checked='true'] .icon{background:var(--MI_THEME-accent);color:var(--MI_THEME-fgOnAccent)}.copy{min-width:0}.copy b,.copy small{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.copy b{font-size:.72rem}.copy small{margin-top:2px;font-size:.59rem;opacity:.58}.check{position:absolute;top:6px;right:6px;width:7px;height:7px;border-radius:50%;background:var(--MI_THEME-accent);opacity:0;transform:scale(.4);transition:opacity .16s,transform .22s cubic-bezier(.16,1,.3,1)}.choice[aria-checked='true'] .check{opacity:1;transform:none}.options{display:grid;gap:2px;margin-top:8px;padding-top:8px;border-top:1px solid var(--MI_THEME-divider)}.option{display:flex;width:100%;align-items:center;gap:8px;padding:7px 5px;border:0;border-radius:10px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}.option:hover{background:var(--MI_THEME-hover)}.option:disabled{opacity:.45;cursor:not-allowed}.option>span:nth-child(2){min-width:0;flex:1;font-size:.68rem}.track{position:relative;width:28px;height:16px;flex:0 0 28px;border-radius:999px;background:color-mix(in srgb,var(--MI_THEME-fg) 18%,transparent);transition:background-color .18s ease}.track i{position:absolute;top:3px;left:3px;width:10px;height:10px;border-radius:50%;background:var(--MI_THEME-panel);box-shadow:0 1px 3px color-mix(in srgb,#000 28%,transparent);transition:transform .22s cubic-bezier(.16,1,.3,1)}.option[aria-checked='true'] .track{background:var(--MI_THEME-accent)}.option[aria-checked='true'] .track i{transform:translateX(12px)}
@media(prefers-reduced-motion:reduce){.choice,.check,.track,.track i{transition:none}}
</style>
