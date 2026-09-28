<!-- SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
The caller keeps the dialog queue and records the displayed version on closed.
-->
<template>
<MkModal ref="modal" preferType="dialog" zPriority="middle" :motionPreset="modalMotionPreset" @click="dismiss" @esc="dismiss" @close="stop" @opened="startOpening" @closed="onClosed">
	<section ref="releaseRoot" :class="$style.releasePanel" data-release-opening-shell :data-opening="!contentReady" :data-page="page" :data-motion="motion" :data-arrival="arrival" :data-mode="mode" :inert="!opened" :aria-hidden="!opened" role="dialog" aria-modal="true" aria-labelledby="hata-whats-new-title">
		<ReleaseOpening v-if="opened && !contentReady" ref="opening" :motion="motion"/>
		<header :class="$style.releaseHeader">
			<div :class="$style.releaseHeading" data-release-heading><MkHatakyuIllustration v-if="useHatakyuBranding()" :class="$style.releaseMascot" asset="treasureFound" :size="40"/><h1 id="hata-whats-new-title">{{ copy.title }}<wbr><span style="white-space: nowrap;">({{ displayVersion }})</span></h1></div>
			<button :class="$style.closeButton" aria-label="更新案内を閉じる" @click="dismiss"><i class="ti ti-x" aria-hidden="true"></i></button>
		</header>

		<div ref="pageBody" :class="$style.releaseBody" :data-feature="currentStory.feature" :inert="!contentReady" :aria-hidden="!contentReady" role="region" aria-label="更新内容の本文">
			<section v-if="(opened || closing) && contentReady" :key="currentStory.id" :class="[currentStory.feature ? $style.featurePage : $style.updatesPage, $style.storyPage]" data-story="updates" :data-feature="currentStory.feature" :data-summary="currentStory.id" :data-single="currentStory.cards.length === 1">
				<div :class="$style.updatesHeading" data-reveal="lead">
					<template v-if="currentStory.feature === 'ui-s-2' && currentStory.scene === 0"><p :class="$style.eyebrow">正式リリース</p><h2 ref="pageTitle" :class="$style.uiSBrandTitle" aria-label="Hataskey UI S 2" tabindex="-1"><span v-for="(word, wordIndex) in uiSBrandWords" :key="word" :class="$style.uiSBrandLine" aria-hidden="true"><span v-for="(character, charIndex) in Array.from(word)" :key="charIndex" :class="$style.uiSBrandChar" :style="{ animationDelay: `${(uiSBrandWords.slice(0, wordIndex).join('').length + wordIndex + charIndex) * 80}ms` }">{{ character }}</span></span></h2><p :class="$style.uiSTagline"><span>美しさと利便性を追求、</span><wbr><span>S(Special)な体験を</span></p><p :class="$style.featureLead">PCでも、モバイルでも。タイムラインを見ながら、次のアクションへ。</p></template>
					<template v-else-if="currentStory.feature === 'ui-s-2'"><p :class="$style.eyebrow">SCENE 0{{ (currentStory.scene ?? 0) + 1 }} · HATASKEY UI S 2</p><h2 ref="pageTitle" tabindex="-1"><span v-if="currentStory.scene === 1">並べて見て、<br><em>そのまま集中。</em></span><span v-else-if="currentStory.scene === 2">指を置いて、<br><em>行き先を選ぶ。</em></span><span v-else>探すのも、書くのも。<br><em>ここから。</em></span></h2><p :class="$style.sceneLead"><template v-if="currentStory.scene === 1"><span>左に開いたページ、右に残るタイムライン。</span><span>左右矢印で広げ、×でホームへ。</span></template><template v-else-if="currentStory.scene === 2"><span>ホームを長押しして、タイムラインの一覧へ。</span><span>指を滑らせ、行き先で離します。</span></template><template v-else><span>ドックの検索から、同じケースの中へ。</span><span>閉じれば、いつもの投稿フォームに戻ります。</span></template></p></template>
				<template v-else><p :class="[$style.eyebrow, { [$style.brandLabel]: isBrandLabel }]">{{ currentStory.label }}</p><h2 ref="pageTitle" tabindex="-1"><template v-if="currentStory.feature === 'recipes'"><span :class="$style.featureWord">紹介して、</span><span :class="$style.featureWord">作って、</span><span :class="$style.featureWord">記録する。</span></template><template v-else-if="currentStory.feature === 'flowers'"><span :class="$style.featureWord">日々をためて、</span><span :class="$style.featureWord">花を咲かせる。</span></template><template v-else>{{ currentStory.title }}</template></h2></template>
				</div>
				<nav v-if="currentStory.feature === 'ui-s-2'" :class="$style.sceneTabs" aria-label="Hataskey UI S 2の章" data-chapter-nav data-reveal="chapters"><button v-for="(chapter, index) in uiS2Chapters" :key="chapter.id" type="button" :aria-current="chapter.id === currentStory.id ? 'step' : undefined" :disabled="changing" @click="move(index + 1)"><span>0{{ index + 1 }}</span>{{ index === 0 ? '新しい景色' : chapter.label }}</button></nav>
				<div v-if="currentStory.feature" :class="$style.featureStage" data-reveal="stage">
					<UiS2Feature v-if="currentStory.feature === 'ui-s-2'" :scene="currentStory.scene ?? 0" :motion="motion"/>
					<FeatureStory v-else :feature="legacyFeature" :motion="motion"/>
					<p v-if="currentStory.feature === 'recipes'" :class="$style.recipeDisclaimer">説明用のサンプルです。このレシピの使用により生じた損害について、サーバーソフトウェア開発者およびサーバー運営者は責任を負いません。</p>
				</div>
				<div v-if="currentStory.feature" :class="$style.featureHighlights" data-reveal="support">
					<article v-for="card in currentStory.cards" :key="card.id" :class="$style.featureHighlight" :data-change-id="card.id">
						<div :class="$style.digestLabel"><i :class="card.icon" aria-hidden="true"></i><span :class="$style.updateLabel">{{ card.label }}</span></div>
						<h3>{{ card.title }}</h3><ul :class="$style.digestPoints"><li v-for="point in card.points" :key="point">{{ point }}</li></ul>
					</article>
				</div>
				<template v-else>
					<article v-for="(card, index) in currentStory.cards" :key="card.id" :class="$style.updateCard" :data-digest="!card.preview" :data-change-id="card.id" :data-reveal="index === 0 ? 'stage' : 'support'">
						<UpdatePreview v-if="card.preview" :kind="card.preview"/>
						<div :class="$style.updateCopy">
							<div :class="$style.digestLabel"><i v-if="!card.preview" :class="card.icon" aria-hidden="true"></i><span :class="$style.updateLabel">{{ card.label }}</span></div>
							<h3>{{ card.title }}</h3>
							<p v-if="card.text"><template v-for="(line, lineIndex) in card.text" :key="line"><br v-if="lineIndex">{{ line }}</template></p>
							<ul v-else :class="$style.digestPoints"><li v-for="point in card.points" :key="point">{{ point }}</li></ul>
							<a v-if="card.link" :href="card.link.url" target="_blank" rel="noopener noreferrer">{{ card.link.label }}</a>
						</div>
					</article>
				</template>
			</section>
		</div>

		<footer :class="$style.releaseFooter" :inert="!contentReady" :aria-hidden="!contentReady">
			<button v-if="page > 1" :class="[$style.backButton, $style.pageArrow]" aria-label="戻る" :disabled="changing" @click="move(page - 1)"><i class="ti ti-arrow-left" aria-hidden="true"></i></button>
			<div :class="$style.stepCaption" aria-live="polite"><span :class="{ [$style.brandLabel]: isBrandLabel }">{{ currentStory.label }}</span><div :class="$style.stepTrack" aria-hidden="true"><i v-for="n in totalPages" :key="n" :data-current="page === n"></i></div><small>{{ page }} / {{ totalPages }}</small></div>
			<button v-if="page < totalPages" :class="[$style.primaryButton, $style.pageArrow]" aria-label="次へ" :disabled="changing" @click="move(page + 1)"><i class="ti ti-arrow-right" aria-hidden="true"></i></button>
			<button v-else :class="$style.primaryButton" @click="dismiss">{{ copy.gotIt }}<i class="ti ti-check" aria-hidden="true"></i></button>
		</footer>
	</section>
</MkModal>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import ReleaseOpening from './hata-whats-new/ReleaseOpening.vue';
import FeatureStory from './hata-whats-new/FeatureStory.vue';
import UiS2Feature from './hata-whats-new/UiS2Feature.vue';
import UpdatePreview from './hata-whats-new/UpdatePreview.vue';
import { createReveal } from './hata-whats-new/reveal.js';
import { getHataWhatsNewStories, getHataWhatsNewDisplayVersion, HATA_WHATS_NEW } from '@/utility/hata-whats-new.js';
import MkHatakyuIllustration from '@/components/MkHatakyuIllustration.vue';
import MkModal from '@/components/MkModal.vue';
import { useHatakyuBranding } from '@/utility/hatakyu-assets.js';
import { prefer } from '@/preferences.js';
import { store } from '@/store.js';
import { i18n } from '@/i18n.js';

const emit = defineEmits<{ closed: [] }>();
const copy = i18n.ts._hata._whatsNew._window;
const displayVersion = getHataWhatsNewDisplayVersion(HATA_WHATS_NEW.version);
const modal = useTemplateRef('modal');
const releaseRoot = useTemplateRef('releaseRoot');
const pageTitle = useTemplateRef('pageTitle');
const pageBody = useTemplateRef('pageBody');
const opening = useTemplateRef('opening');
const noteBodyHeight = ref(600);
const stories = computed(() => getHataWhatsNewStories(noteBodyHeight.value));
const pageId = ref(HATA_WHATS_NEW.groups[0].cards[0].id);
const page = computed(() => Math.max(0, stories.value.findIndex(story => story.id === pageId.value || story.cards.some(card => card.id === pageId.value))) + 1);
const totalPages = computed(() => stories.value.length);
const currentStory = computed(() => stories.value[page.value - 1]);
const uiS2Chapters = computed(() => stories.value.filter(story => story.feature === 'ui-s-2'));
const uiSBrandWords = ['Hataskey', 'UI S', '2'];
const legacyFeature = computed<'ui-s' | 'recipes' | 'flowers'>(() => currentStory.value.feature === 'recipes' || currentStory.value.feature === 'flowers' ? currentStory.value.feature : 'ui-s');
const isBrandLabel = computed(() => ['Hataskey UI S 2', 'HataFeed', 'Hatask'].includes(currentStory.value.label));
const opened = ref(true);
const closing = ref(false);
const contentReady = ref(false);
const changing = ref(true);
const arrival = ref('settled');
const mode = computed(() => store.r.darkMode.value ? 'dark' : 'light');
const media = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = ref(media.matches);
const documentVisible = ref(!window.document.hidden);
const motion = computed(() => opened.value && prefer.r.animation.value && !reduced.value && documentVisible.value);
const modalMotionPreset = computed<'none' | 'dissolve' | undefined>(() => !prefer.r.animation.value || reduced.value || !documentVisible.value ? 'none' : contentReady.value ? 'dissolve' : undefined);
const reveal = createReveal();
let bodyObserver: ResizeObserver | undefined;
let transitionRevision = 0;
let entranceRevision = 0;
let disposed = false;
let openingStarted = false;
let closedEmitted = false;

function isClosed() { return disposed || !opened.value; }

function syncMotion() { reduced.value = media.matches; }

// Start after MkModal's own entrance; keep its first child stable for focus
// trapping and outside-click handling throughout this decorative sequence.
async function startOpening() {
	if (isClosed() || openingStarted) return;
	openingStarted = true;
	const ticket = transitionRevision;
	await nextTick();
	if (isClosed() || ticket !== transitionRevision) return;
	await opening.value?.play();
	if (isClosed() || ticket !== transitionRevision) return;
	contentReady.value = true;
	changing.value = false;
	await nextTick();
	if (isClosed()) return;
	focusTitle();
	void enter(true);
}

async function enter(initial = false) {
	const ticket = ++entranceRevision;
	await nextTick();
	if (isClosed() || !contentReady.value) return;
	const uiS2 = currentStory.value.feature === 'ui-s-2';
	arrival.value = motion.value && !window.document.hidden ? 'arriving' : 'settled';
	await reveal.play([
		...(initial ? [
			{ element: releaseRoot.value?.querySelector<HTMLElement>('header') ?? null, duration: 440, y: 5 },
			{ element: releaseRoot.value?.querySelector('footer') ?? null, delay: 420, duration: 440, y: 5 },
		] : []),
		{ element: pageBody.value?.querySelector<HTMLElement>('[data-reveal="lead"]') ?? null, duration: 480, y: 10 },
		{ element: pageBody.value?.querySelector<HTMLElement>('[data-reveal="chapters"]') ?? null, delay: 100, duration: 480, y: 8 },
		{ element: pageBody.value?.querySelector<HTMLElement>('[data-reveal="stage"]') ?? null, delay: uiS2 ? 300 : 110, duration: 650, y: 0, scale: .988 },
		{ element: pageBody.value?.querySelector<HTMLElement>('[data-reveal="support"]') ?? null, delay: uiS2 ? 800 : 570, duration: 480, y: 8 },
	], motion.value);
	if (ticket === entranceRevision) arrival.value = 'settled';
}

async function move(next: number) {
	if (isClosed() || changing.value || next < 1 || next > totalPages.value) return;
	const destinationId = stories.value[next - 1].id;
	const ticket = ++transitionRevision;
	changing.value = true;
	entranceRevision++;
	await reveal.play([{ element: pageBody.value?.firstElementChild as HTMLElement, duration: 150, x: next > page.value ? -12 : 12, y: 0, exit: true }], motion.value);
	if (isClosed() || ticket !== transitionRevision) return;
	pageId.value = destinationId;
	await nextTick();
	if (isClosed()) return;
	if (pageBody.value) pageBody.value.scrollTop = 0;
	pageTitle.value?.focus({ preventScroll: true });
	changing.value = false;
	void enter();
}

function stop() {
	transitionRevision++;
	entranceRevision++;
	opened.value = false;
	changing.value = false;
	arrival.value = 'settled';
	opening.value?.cancel();
	reveal.cancel();
	bodyObserver?.disconnect();
}

function dismiss() {
	if (!opened.value) return;
	closing.value = contentReady.value && motion.value;
	stop();
	modal.value?.close();
}

function onClosed() {
	closing.value = false;
	if (closedEmitted) return;
	closedEmitted = true;
	emit('closed');
}

function settle() {
	entranceRevision++;
	opening.value?.cancel();
	reveal.cancel();
	arrival.value = 'settled';
	if (!contentReady.value) void startOpening();
}

function visibility() { documentVisible.value = !window.document.hidden; if (!documentVisible.value) settle(); }

function focusTitle() { if (opened.value && contentReady.value) pageTitle.value?.focus({ preventScroll: true }); }

watch(motion, enabled => { if (!enabled) settle(); });
onMounted(() => {
	bodyObserver = new ResizeObserver(() => { if (pageBody.value?.clientHeight) noteBodyHeight.value = pageBody.value.clientHeight; });
	if (pageBody.value) { bodyObserver.observe(pageBody.value); if (pageBody.value.clientHeight) noteBodyHeight.value = pageBody.value.clientHeight; }
	media.addEventListener('change', syncMotion);
	window.document.addEventListener('visibilitychange', visibility);
	if (!motion.value || window.document.hidden) void startOpening();
});
onBeforeUnmount(() => { disposed = true; stop(); media.removeEventListener('change', syncMotion); window.document.removeEventListener('visibilitychange', visibility); });
</script>
<style module src="./hata-whats-new/release.module.css"></style>
<style lang="scss">
@use "./hatask/hatask-fonts.scss";
</style>
