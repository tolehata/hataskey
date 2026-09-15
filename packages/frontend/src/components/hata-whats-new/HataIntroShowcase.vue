<!-- SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
The guide's opening sections use the live guide styles, without search or storage effects.
-->
<template>
<figure ref="figure" :class="$style.showcase" :data-arrival="arrival" data-hataintro-showcase aria-hidden="true">
	<div :class="$style.showcaseViewport" data-hataintro-viewport :data-format="mobile ? 'mobile' : 'desktop'" :data-fade-bottom="fadeBottom" :style="viewportStyle">
		<div ref="canvas" :class="$style.showcaseCanvas" data-hataintro-canvas :style="canvasStyle" inert>
			<div class="hata-intro" data-theme="system" :style="{ colorScheme: mode }">
				<div class="hg-main">
					<section class="hg-hero" data-hataintro-panel>
						<div><div class="hg-eyebrow"><i class="ti ti-book" aria-hidden="true"></i><span class="hg-brand">HataIntro</span></div><h1>気になる画面から、ひとつずつ</h1><p class="hg-intro">ログインしたばかりの人も、操作に迷った人も。<br>開く場所・手順・画面の見方を、必要なところだけ読めるよ</p></div>
					</section>
					<div class="hg-search-form" data-hataintro-panel>
						<label :for="searchId">知りたいことから探す</label>
						<div class="hg-search-box"><input :id="searchId" type="search" placeholder="例：絵文字、公開範囲、映画 記録" readonly><button type="button" class="hg-search-submit" aria-label="ガイドを検索"><i class="ti ti-search" aria-hidden="true"></i></button></div>
						<p class="hg-search-hint">機能名が分からなくても、「取り消し」「保存」などの言葉で探せるよ</p>
					</div>
					<section class="hg-start" data-hataintro-panel>
						<div><div class="hg-eyebrow">最初はここから</div><h2>まずは、流れてくるノートを見よう</h2><p>投稿を読むだけでも大丈夫。<br>気になったら絵文字で反応して、書きたくなったときに公開範囲を確かめよう</p><button type="button" class="hg-btn hg-btn-primary">タイムラインの見方へ <i class="ti ti-arrow-right" aria-hidden="true"></i></button></div>
						<ol class="hg-start-list"><li v-for="(label, index) in ['読む場所を知る', '絵文字で気持ちを伝える', '投稿する前に、届く相手を確認']" :key="label"><span class="hg-number">{{ index + 1 }}</span><button type="button" class="hg-link">{{ label }} <i class="ti ti-arrow-right" aria-hidden="true"></i></button></li></ol>
					</section>
				</div>
			</div>
		</div>
	</div>
</figure>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { createReveal } from './reveal.js';
import { useShowcaseFit } from './showcase-fit.js';

const props = defineProps<{ mode: 'light' | 'dark'; motion: boolean; revision?: number }>();
const figure = ref<HTMLElement | null>(null);
const canvas = ref<HTMLElement | null>(null);
const searchId = useId();
const { mobile, fadeBottom, viewportStyle, canvasStyle } = useShowcaseFit(figure, canvas);
const reveal = createReveal();
const arrival = ref('settled');
let entranceRevision = 0;

async function enter() {
	const ticket = ++entranceRevision;
	await nextTick();
	if (!figure.value) return;
	arrival.value = props.motion && !window.document.hidden ? 'arriving' : 'settled';
	const panels = [...figure.value.querySelectorAll<HTMLElement>('[data-hataintro-panel]')];
	await reveal.play(panels.map((element, index) => ({ element, delay: 190 + index * 100, duration: 620, y: 18, scale: .98 })), props.motion);
	if (ticket === entranceRevision) arrival.value = 'settled';
}

function settle() { entranceRevision++; reveal.cancel(); arrival.value = 'settled'; }

function visibility() { if (window.document.hidden) settle(); }

watch(() => props.motion, enabled => { if (!enabled) settle(); });
watch(() => props.revision, () => { void enter(); });
onMounted(() => { window.document.addEventListener('visibilitychange', visibility); void enter(); });
onBeforeUnmount(() => { settle(); window.document.removeEventListener('visibilitychange', visibility); });
</script>

<style module src="./release.module.css"></style>
<style src="../hata-intro/hata-intro.css"></style>
