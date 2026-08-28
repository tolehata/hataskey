<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only

旗鯖fork: 設定画面の右ペインへ埋め込むための「枠なし窓」。

⚠️MkWindow / MkModalWindow / MkModal はどれも position: fixed の重ね表示で、
  CSS では right ペインの中に収められない。そこで**窓そのものを差し替える**。
  受け口（#header / 本体 / #footer / close()）を既存の窓と同じ形に揃えてあるので、
  各画面は `<component :is="...">` の付け替えだけで埋め込みへ回せる。

⚠️窓側の props（initialWidth・canResize・withOkButton など）は、埋め込みでは
  意味を持たないが**受け取れないと Vue が属性としてDOMへ落とす**ので、
  ここで明示的に受け取って捨てる。
-->

<template>
<section :class="$style.root">
	<header v-if="$slots.header" :class="$style.head">
		<h2 :class="$style.title"><slot name="header"></slot></h2>
	</header>
	<div :class="$style.body">
		<slot></slot>
	</div>
	<footer v-if="$slots.footer" :class="$style.foot">
		<slot name="footer"></slot>
	</footer>
</section>
</template>

<script setup lang="ts">
defineProps<{
	// MkWindow 由来
	initialWidth?: number;
	initialHeight?: number;
	canResize?: boolean;
	closeButton?: boolean;
	mini?: boolean;
	front?: boolean;
	contextmenu?: unknown;
	buttonsLeft?: unknown;
	buttonsRight?: unknown;
	beforeClose?: () => boolean | Promise<boolean>;
	// MkModalWindow 由来
	withOkButton?: boolean;
	withCloseButton?: boolean;
	okButtonDisabled?: boolean;
	panelClass?: string;
	width?: number;
	height?: number;
	// MkModal 由来
	preferType?: string;
	disableBgBlur?: boolean;
}>();

const emit = defineEmits<{
	closed: [];
	close: [];
	ok: [];
}>();

/**
 * ⚠️各画面は `dialog.value?.close()` で自分を閉じる。埋め込みでも同じ呼び方が
 *   通るようにしておかないと、画面内の「閉じる」「保存して閉じる」が黙って効かなくなる。
 *   埋め込みでは窓を消す代わりに、閉じたい意思を親へ伝える。
 */
function close(): void {
	emit('close');
	emit('closed');
}

defineExpose({ close });
</script>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	min-width: 0;
	min-block-size: 0;
}

/* ⚠️見出しは右ペインの中で「窓の題名」ではなく節の見出しとして振る舞う。
   窓のときのような枠線や閉じるボタンは持たせない。 */
.head {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-block-end: 14px;
	padding-block-end: 12px;
	border-block-end: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent));
}

.title {
	margin: 0;
	min-width: 0;
	overflow: hidden;
	color: var(--MI_THEME-fg);
	font-size: 1.05rem;
	font-weight: 800;
	line-height: 1.3;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.body {
	min-width: 0;
	min-block-size: 0;
}

/* ⚠️窓のときは本体が独自にスクロールしていた。埋め込みでは右ペインが
   スクロールを持つので、中の高さ固定・内部スクロールを解除する。 */
.body :deep([data-embedded-scroll]) {
	max-block-size: none;
	overflow: visible;
}

.foot {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 8px;
	margin-block-start: 14px;
	padding-block-start: 12px;
	border-block-start: 1px solid var(--settings-border, color-mix(in srgb, var(--MI_THEME-divider) 78%, transparent));
}
</style>
