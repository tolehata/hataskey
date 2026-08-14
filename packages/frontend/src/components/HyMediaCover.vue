<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
Hatady の映画・ゲーム用の自動生成カバー。外部画像を取得せず、作品名から同じ配色を再現する。
-->
<template>
<span
	:class="[$style.root, kind === 'movie' ? $style.movie : $style.game, showTitle && $style.withText]"
	:style="{ width: `${width}px`, height: `${height}px`, background: gradient }"
	:title="title"
>
	<span :class="$style.texture" aria-hidden="true"></span>
	<i :class="['ti', kind === 'movie' ? 'ti-movie' : 'ti-device-gamepad-2', $style.mark]" aria-hidden="true"></i>
	<template v-if="showTitle">
		<span :class="$style.title">{{ title }}</span>
		<span v-if="subtitle" :class="$style.subtitle">{{ subtitle }}</span>
	</template>
</span>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type { HatadyMediaKind } from '@/utility/hatady-media.js';
import { hyCoverGradient } from '@/utility/hatady.js';

const props = withDefaults(defineProps<{
	kind: HatadyMediaKind;
	title: string;
	subtitle?: string | null;
	width?: number;
	showTitle?: boolean;
	colorIndex?: number | null;
}>(), {
	subtitle: null,
	width: 92,
	showTitle: true,
	colorIndex: null,
});

const height = computed(() => Math.round(props.width * (props.kind === 'movie' ? 1.46 : 1.12)));
const gradient = computed(() => hyCoverGradient(`${props.kind}:${props.title}`, props.colorIndex));
</script>

<style lang="scss" module>
.root {
	position: relative;
	display: inline-flex;
	flex: 0 0 auto;
	box-sizing: border-box;
	flex-direction: column;
	justify-content: flex-end;
	overflow: hidden;
	padding: 10px;
	color: #fff;
	box-shadow: 0 4px 14px rgba(54, 41, 26, .22);
 isolation: isolate;
}
.movie { border-radius: 8px; }
.game { border-radius: 12px; }
.texture {
	position: absolute;
	inset: 0;
	z-index: -1;
	background:
		radial-gradient(circle at 80% 14%, rgba(255,255,255,.2), transparent 34%),
		linear-gradient(165deg, transparent 45%, rgba(0,0,0,.24));
}
.movie .texture::after {
	content: '';
	position: absolute;
	left: 0;
	right: 0;
	top: 8px;
	height: 4px;
	background: repeating-linear-gradient(90deg, rgba(255,255,255,.36) 0 5px, transparent 5px 10px);
}
.game .texture::after {
	content: '';
	position: absolute;
	width: 52%;
	aspect-ratio: 1;
	right: -16%;
	top: -24%;
	border: 1px solid rgba(255,255,255,.26);
	border-radius: 50%;
	box-shadow: 0 0 0 12px rgba(255,255,255,.06), 0 0 0 25px rgba(255,255,255,.04);
}
.mark {
	position: absolute;
	top: 14px;
	right: 13px;
	font-size: 22px;
	opacity: .84;
	text-shadow: 0 1px 4px rgba(0,0,0,.3);
}
.title {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 3;
	overflow: hidden;
	font-family: var(--hy-heading);
	font-size: 12px;
	font-weight: 800;
	line-height: 1.35;
	text-shadow: 0 1px 3px rgba(0,0,0,.55);
}
.subtitle {
	margin-top: 4px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 9px;
	opacity: .82;
	text-shadow: 0 1px 3px rgba(0,0,0,.55);
}
</style>
