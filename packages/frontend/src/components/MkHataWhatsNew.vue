<!-- SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
The caller keeps the dialog queue and records the displayed version on closed.
-->
<template>
<MkModal ref="modal" preferType="dialog" zPriority="middle" @click="dismiss" @esc="dismiss" @close="stop" @opened="startOpening" @closed="emit('closed')">
	<section ref="releaseRoot" :class="$style.releasePanel" data-release-opening-shell :data-opening="!contentReady" :data-page="page" :data-motion="motion" :data-arrival="arrival" :data-mode="mode" role="dialog" aria-modal="true" aria-labelledby="hata-whats-new-title">
		<ReleaseOpening v-if="opened && !contentReady" ref="opening" :motion="motion"/>
		<header :class="$style.releaseHeader">
			<div :class="$style.releaseHeading" data-release-heading><MkHatakyuIllustration v-if="useHatakyuBranding()" :class="$style.releaseMascot" asset="treasureFound" :size="40"/><h1 id="hata-whats-new-title">{{ copy.title }}<wbr><span style="white-space: nowrap;">(hata-12.7)</span></h1></div>
			<button :class="$style.closeButton" aria-label="更新案内を閉じる" @click="dismiss"><i class="ti ti-x" aria-hidden="true"></i></button>
		</header>

		<div ref="pageBody" :class="$style.releaseBody" :inert="!contentReady" :aria-hidden="!contentReady" role="region" aria-label="更新内容の本文">
			<section v-if="opened && contentReady && page === 1" :class="[$style.introPage, $style.storyPage]" data-story="hatask">
				<div :class="$style.introCopy" data-reveal="lead">
					<div :class="$style.productHeading"><span :class="$style.productWordmark">Hatask <span :class="$style.productVersion">V3.1</span></span><span :class="$style.productEdition">暁のデザインを他テーマに拡張</span></div>
					<h2 ref="pageTitle" tabindex="-1">いつもの毎日を、<wbr>好きな見た目で。</h2>
					<p>予定も、やることも、日々の記録も。あなたに合うテーマで。<br>新たに「苔」デザインが追加されました。</p>
				</div>
				<div data-reveal="stage"><HataskShowcase :theme="theme" :mode="mode" :motion="motion"/></div>
				<div :class="$style.themeSection" data-reveal="support">
					<div :class="$style.themeChoices" role="group" aria-label="Hataskのテーマをプレビュー">
						<button v-for="item in themes" :key="item.id" :data-theme-choice="item.id" :aria-pressed="theme === item.id" @click="theme = item.id">
							<span>{{ item.name }}</span><span v-if="item.id === 'koke'" :class="$style.newLabel">NEW</span><i v-if="theme === item.id" class="ti ti-check" aria-hidden="true"></i>
						</button>
					</div>
					<p :class="$style.themeDescription" role="status">{{ selectedTheme.description }}</p>
				</div>
			</section>

			<section v-else-if="opened && contentReady && page === 2" :class="[$style.introPage, $style.storyPage]" data-story="hatady">
				<div :class="$style.introCopy" data-reveal="lead">
					<div :class="$style.productHeading"><span :class="$style.productWordmark">Hatady <span :class="$style.productVersion">V2.0</span></span><span :class="$style.productEdition">全面リデザイン</span></div>
					<h2 ref="pageTitle" tabindex="-1">積み重ねが、<wbr>ひと目で。</h2>
					<p>ホームからプロフィールまで。記録を楽しむ画面が、新しくなりました。</p>
				</div>
				<div data-reveal="stage"><HatadyShowcase :mode="mode" :motion="motion"/></div>
				<div :class="$style.featureNotes" data-reveal="support">
					<div><i class="ti ti-layout-dashboard" aria-hidden="true"></i><span><strong>見渡せるホーム</strong><small>記録と積み重ねを、ひとつに。</small></span></div>
					<div><i class="ti ti-plus" aria-hidden="true"></i><span><strong>記録は「＋」から</strong><small>読書も映画も、同じ入り口。</small></span></div>
					<div><i class="ti ti-books" aria-hidden="true"></i><span><strong>作品のそばに記録</strong><small>好きな作品と、これまでの日々。</small></span></div>
				</div>
			</section>

			<section v-else-if="opened && contentReady && page === 3" :class="[$style.introPage, $style.storyPage]" data-story="hatafeed">
				<div :class="$style.introCopy" data-reveal="lead">
					<div :class="$style.productHeading"><span :class="$style.productWordmark">HataFeed <span :class="$style.productVersion">V3.0</span></span><span :class="$style.productEdition">全面リデザイン</span></div>
					<h2 ref="pageTitle" tabindex="-1">声を届けて、<wbr>変化を見渡す。</h2>
					<p>改善予定も、絵文字申請も、最近の動きも。<br>状況がひと目でわかる、新しいホームへ。</p>
				</div>
				<div data-reveal="stage"><HataFeedShowcase :mode="mode" :motion="motion"/></div>
				<div :class="$style.featureNotes" data-reveal="support">
					<div><i class="ti ti-layout-dashboard" aria-hidden="true"></i><span><strong>状況をひと目で</strong><small>改善予定と、申請のその後。</small></span></div>
					<div><i class="ti ti-plus" aria-hidden="true"></i><span><strong>報告・申請は「＋」</strong><small>伝えたいことを、順番に。</small></span></div>
					<div><i class="ti ti-route" aria-hidden="true"></i><span><strong>これからを知る</strong><small>ロードマップも、同じ場所に。</small></span></div>
				</div>
			</section>

			<section v-else-if="opened && contentReady && page === 4" :class="[$style.introPage, $style.storyPage]" data-story="hataintro">
				<div :class="$style.introCopy" data-reveal="lead">
					<div :class="$style.productHeading"><span :class="$style.productWordmark">HataIntro</span><span :class="$style.productEdition">使い方ガイド</span></div>
					<h2 ref="pageTitle" tabindex="-1">使い方が、<wbr>見てわかる。</h2>
					<p>はじめての操作も、使い慣れてからの疑問も。<br>画面の見本を触りながら、必要な使い方を確かめられます。</p>
				</div>
				<div data-reveal="stage"><HataIntroShowcase :mode="mode" :motion="motion"/></div>
				<div :class="$style.featureNotes" data-reveal="support">
					<div><i class="ti ti-search" aria-hidden="true"></i><span><strong>言葉から探す</strong><small>機能名が分からなくても。</small></span></div>
					<div><i class="ti ti-hand-click" aria-hidden="true"></i><span><strong>見本で試す</strong><small>手順と動きを、その場で。</small></span></div>
					<div><i class="ti ti-book" aria-hidden="true"></i><span><strong>詳しく確かめる</strong><small>仕組みや注意点まで。</small></span></div>
				</div>
			</section>

			<section v-else-if="opened && contentReady" :key="currentStory.id" :class="[$style.updatesPage, $style.storyPage]" data-story="updates" :data-summary="currentStory.id" :data-single="currentStory.cards?.length === 1">
				<div :class="$style.updatesHeading" data-reveal="lead"><p :class="$style.eyebrow">{{ currentStory.label }}</p><h2 ref="pageTitle" tabindex="-1">{{ currentStory.title }}</h2></div>
				<article v-for="(card, index) in currentStory.cards" :key="card.id" :class="$style.updateCard" :data-digest="!card.preview" :data-change-id="card.id" :data-reveal="index === 0 ? 'stage' : 'support'">
					<NotificationPreview v-if="card.preview === 'notification'" :motion="motion"/>
					<div v-else-if="card.preview === 'cleanup'" :class="$style.cleanupPreview" aria-hidden="true"><span :class="$style.archiveSheet"><i class="ti ti-speakerphone"></i><span></span><span></span></span><span :class="$style.cleanNote"><i class="ti ti-circle-check"></i><b>いま必要な案内を。</b></span></div>
					<div :class="$style.updateCopy">
						<div :class="$style.digestLabel"><i v-if="!card.preview" :class="card.icon" aria-hidden="true"></i><span :class="$style.updateLabel">{{ card.label }}</span></div>
						<h3>{{ card.title }}</h3>
						<p v-if="card.text"><template v-for="(line, lineIndex) in card.text" :key="line"><br v-if="lineIndex">{{ line }}</template></p>
						<ul v-else :class="$style.digestPoints"><li v-for="point in card.points" :key="point">{{ point }}</li></ul>
					</div>
				</article>
			</section>
		</div>

		<footer :class="$style.releaseFooter" :inert="!contentReady" :aria-hidden="!contentReady">
			<button v-if="page > 1" :class="[$style.backButton, $style.pageArrow]" aria-label="戻る" :disabled="changing" @click="move(page - 1)"><i class="ti ti-arrow-left" aria-hidden="true"></i></button>
			<div :class="$style.stepCaption" aria-live="polite"><span>{{ currentStory.label }}</span><div :class="$style.stepTrack" aria-hidden="true"><i v-for="n in totalPages" :key="n" :data-current="page === n"></i></div><small>{{ page }} / {{ totalPages }}</small></div>
			<button v-if="page < totalPages" :class="[$style.primaryButton, $style.pageArrow]" aria-label="次へ" :disabled="changing" @click="move(page + 1)"><i class="ti ti-arrow-right" aria-hidden="true"></i></button>
			<button v-else :class="$style.primaryButton" @click="dismiss">{{ copy.gotIt }}<i class="ti ti-check" aria-hidden="true"></i></button>
		</footer>
	</section>
</MkModal>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, useTemplateRef, watch } from 'vue';
import HataskShowcase from './hata-whats-new/HataskShowcase.vue';
import HatadyShowcase from './hata-whats-new/HatadyShowcase.vue';
import HataFeedShowcase from './hata-whats-new/HataFeedShowcase.vue';
import HataIntroShowcase from './hata-whats-new/HataIntroShowcase.vue';
import ReleaseOpening from './hata-whats-new/ReleaseOpening.vue';
import NotificationPreview from './hata-whats-new/NotificationPreview.vue';
import { createReveal } from './hata-whats-new/reveal.js';
import type { HataskPlannerTheme } from '@/components/hatask/hatask-planner-types.js';
import { getHataWhatsNewStories, HATA_WHATS_NEW_THEMES as themes } from '@/utility/hata-whats-new.js';
import MkHatakyuIllustration from '@/components/MkHatakyuIllustration.vue';
import MkModal from '@/components/MkModal.vue';
import { createHataskeyNotificationToasts, hataskeyNotificationToastsKey } from '@/utility/hataskey-notification-toast.js';
import { useHatakyuBranding } from '@/utility/hatakyu-assets.js';
import { prefer } from '@/preferences.js';
import { store } from '@/store.js';
import { i18n } from '@/i18n.js';

const emit = defineEmits<{ closed: [] }>();
const copy = i18n.ts._hata._whatsNew._window;
const modal = useTemplateRef('modal');
const releaseRoot = useTemplateRef('releaseRoot');
const pageTitle = useTemplateRef('pageTitle');
const pageBody = useTemplateRef('pageBody');
const opening = useTemplateRef('opening');
const noteBodyHeight = ref(600);
const stories = computed(() => getHataWhatsNewStories(noteBodyHeight.value));
const pageId = ref('hatask');
const page = computed(() => Math.max(0, stories.value.findIndex(story => story.id === pageId.value || story.cards?.some(card => card.id === pageId.value))) + 1);
const totalPages = computed(() => stories.value.length);
const currentStory = computed(() => stories.value[page.value - 1]);
const opened = ref(true);
const contentReady = ref(false);
const changing = ref(true);
const arrival = ref('settled');
const theme = ref<HataskPlannerTheme>('akatsuki');
const selectedTheme = computed(() => themes.find(item => item.id === theme.value) ?? themes[0]);
const mode = computed(() => store.r.darkMode.value ? 'dark' : 'light');
const media = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = ref(media.matches);
const motion = computed(() => opened.value && prefer.r.animation.value && !reduced.value);
const reveal = createReveal();
// A preview must never claim the live application's notification surface.
const notificationContext = createHataskeyNotificationToasts(computed(() => false), computed(() => false));
provide(hataskeyNotificationToastsKey, notificationContext);
let bodyObserver: ResizeObserver | undefined;
let transitionRevision = 0;
let entranceRevision = 0;
let disposed = false;
let openingStarted = false;

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
	arrival.value = motion.value && !window.document.hidden ? 'arriving' : 'settled';
	await reveal.play([
		...(initial ? [
			{ element: releaseRoot.value?.querySelector<HTMLElement>('header') ?? null, duration: 440, y: 5 },
			{ element: releaseRoot.value?.querySelector('footer') ?? null, delay: 420, duration: 440, y: 5 },
		] : []),
		{ element: pageBody.value?.querySelector<HTMLElement>('[data-reveal="lead"]') ?? null, duration: 480, y: 10 },
		{ element: pageBody.value?.querySelector<HTMLElement>('[data-reveal="stage"]') ?? null, delay: 110, duration: 650, y: 0, scale: .988 },
		{ element: pageBody.value?.querySelector<HTMLElement>('[data-reveal="support"]') ?? null, delay: 570, duration: 480, y: 8 },
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
	notificationContext.clear();
}

function dismiss() { if (!opened.value) return; stop(); modal.value?.close(); }

function settle() {
	entranceRevision++;
	opening.value?.cancel();
	reveal.cancel();
	arrival.value = 'settled';
	if (!contentReady.value) void startOpening();
}

function visibility() { if (window.document.hidden) settle(); }

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
<style lang="scss" src="./hatask/hatask-fonts.scss"></style>
