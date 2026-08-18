<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only

旗鯖fork: 更新後に1回だけ出す「今回の更新内容」。
	- 中身は utility/hata-whats-new.ts（HATA-CHANGELOG.md の要約）。
	- ⚠️MkUpdated（本家の「更新されました！」）とは別物。あちらは版の告知＋キャッシュ削除、
	  こちらは**何が変わったか**の説明。⚠️同時に開くと重なるので、表示は
	  utility/hata-dialog-queue.ts の待ち行列を通す（呼び出し側の責任）。
	- ⚠️「表示済み」の記録は**閉じられたとき**に付ける（呼び出し側）。先に付けると、
	  MkUpdated のキャッシュ削除による再読み込みで消えたときに二度と出なくなる。
-->
<template>
<MkModal ref="modal" :preferType="'dialog'" :zPriority="'middle'" @click="modal?.close()" @closed="emit('closed')">
	<div :class="[$style.root, { [$style.closing]: closing }]" role="dialog" aria-modal="true" aria-labelledby="hata-whats-new-title">
		<header :class="$style.header">
			<div :class="$style.releaseIdentity">
				<span :class="$style.releaseDot" aria-hidden="true"></span>
				<span>{{ copy.releaseIdentity }}</span>
			</div>
			<div :class="$style.releaseVersion">{{ releaseVersion }}</div>
			<!-- Hataskey fork: ヘッダー左上にハタキュ(treasureFound)を置く。version・storage key・
			     queue・carousel には一切手を入れていない。⚠️寸法はCSSで決めるので :size は属性上の既定値。 -->
			<MkHatakyuIllustration v-if="useHatakyuBranding()" asset="treasureFound" :size="96" :class="$style.headerIllustration"/>
			<div :class="$style.headerText">
				<h1 id="hata-whats-new-title" :class="$style.title">{{ copy.title }}</h1>
				<p :class="$style.headline">{{ whatsNew.headline }}</p>
			</div>
		</header>

		<div ref="itemsViewport" :class="$style.items" @scroll.passive="syncCarouselPosition">
			<article v-for="(item, i) in whatsNew.items" :key="i" :class="$style.item">
				<div :class="$style.preview" :data-preview="item.preview" aria-hidden="true">
					<!-- Hataskey fork: 今回の更新に合わせて作り直したプレビュー。
					     ⚠️文言は持たせない（翻訳漏れで空欄になる事故を作らないため）。形・色・配置だけで伝える。 -->
					<div v-if="item.preview === 'branding'" :class="$style.brandingMock">
						<div :class="$style.brandingBefore"><i class="ti ti-mood-smile"></i><i class="ti ti-alert-circle"></i><i class="ti ti-flag"></i></div>
						<i :class="[$style.brandingArrow, 'ti', 'ti-arrow-right']"></i>
						<div :class="$style.brandingAfter">
							<MkHatakyuIllustration asset="waving" :size="44"/>
							<MkHatakyuIllustration asset="overwhelmed" :size="56"/>
							<MkHatakyuIllustration asset="treasureFound" :size="44"/>
						</div>
					</div>

					<div v-else-if="item.preview === 'hatadyRecord'" :class="$style.recordMock">
						<div :class="$style.recordTabs">
							<span data-active="true"><i class="ti ti-device-gamepad-2"></i></span>
							<span><i class="ti ti-movie"></i></span>
							<span><i class="ti ti-book-2"></i></span>
						</div>
						<div :class="$style.recordStats">
							<b v-for="n in 4" :key="n"><i></i><u></u></b>
						</div>
						<div :class="$style.recordRows">
							<span v-for="n in 3" :key="n"><em></em><u :data-level="n"></u></span>
						</div>
					</div>

					<div v-else-if="item.preview === 'hatadyVisibility'" :class="$style.visibilityMock">
						<div :class="$style.visibilitySheet">
							<span><i class="ti ti-world"></i><u></u></span>
							<span data-active="true"><i class="ti ti-home"></i><u></u><i class="ti ti-check"></i></span>
							<span><i class="ti ti-lock"></i><u></u></span>
						</div>
						<div :class="$style.visibilitySave"><i class="ti ti-device-floppy"></i></div>
					</div>

					<div v-else-if="item.preview === 'hatacordingFix'" :class="$style.cordFixMock">
						<div :class="$style.cordFixNote">
							<span :class="$style.cordFixAvatar"></span>
							<span :class="$style.cordFixLines"><u></u><u></u></span>
						</div>
						<div :class="$style.cordFixSide">
							<div :class="$style.cordFixPopup"><i class="ti ti-world"></i><i class="ti ti-home"></i><i class="ti ti-lock"></i></div>
							<div :class="$style.cordFixGauge"></div>
						</div>
					</div>

					<div v-else-if="item.preview === 'utageBadge'" :class="$style.badgeMock">
						<div :class="$style.badgeBanner"></div>
						<div :class="$style.badgeAvatar"></div>
						<div :class="$style.badgeName"><u></u><u></u></div>
						<div :class="$style.badgeChips">
							<em><i class="ti ti-award"></i></em>
							<em><i class="ti ti-shield-half"></i></em>
						</div>
					</div>

					<div v-else-if="item.preview === 'muteReaction'" :class="$style.muteFixMock">
						<div :class="$style.muteNote">
							<span :class="$style.muteAvatar"></span>
							<span :class="$style.muteLines"><u></u><u></u></span>
						</div>
						<div :class="$style.muteChips">
							<em></em>
							<em data-hidden="true"><i class="ti ti-mood-off"></i></em>
							<em></em>
						</div>
					</div>

					<div v-else-if="item.preview === 'cardMaker'" :class="$style.cardMock">
						<div :class="$style.cardTilt">
							<span :class="$style.cardShine"></span>
							<span :class="$style.cardPhoto"></span>
							<span :class="$style.cardLines"><u></u><u></u></span>
							<i :class="[$style.cardDeco, 'ti', 'ti-sparkles']"></i>
						</div>
					</div>

					<div v-else-if="item.preview === 'hatasabaHome'" :class="$style.homeMock">
						<div :class="$style.homePhone">
							<div :class="$style.homeTabs"><span></span><span data-active="true"></span><span></span></div>
							<div :class="$style.homeBody"><u v-for="n in 3" :key="n"></u></div>
							<div :class="$style.homeNav"><i class="ti ti-home"></i></div>
						</div>
						<i :class="[$style.homeKeep, 'ti', 'ti-lock-check']"></i>
					</div>

					<div v-else-if="item.preview === 'sideStudioFix'" :class="$style.studioMock">
						<div :class="$style.studioSide">
							<span></span>
							<span data-drop="true"></span>
							<span data-dragging="true"><i class="ti ti-grip-vertical"></i></span>
						</div>
						<div :class="$style.studioMain"><u></u><u></u></div>
					</div>

					<div v-else :class="$style.mobileMock">
						<div :class="$style.mobilePhone">
							<div :class="$style.mobilePicker"><i class="ti ti-mood-smile"></i><i class="ti ti-heart"></i><i class="ti ti-thumb-up"></i></div>
							<div :class="$style.mobileNote"><u></u><u></u></div>
							<span :class="$style.mobileTouch"></span>
						</div>
					</div>
				</div>

				<div :class="$style.itemBody">
					<div :class="$style.itemTitle"><i :class="item.icon" aria-hidden="true"></i>{{ item.title }}</div>
					<div :class="$style.itemText">{{ item.text }}</div>
					<button v-if="item.to || item.activateUi" class="_button" :class="$style.itemLink" @click="go(item)">
						{{ item.linkLabel ?? copy.open }} <i class="ti ti-chevron-right"></i>
					</button>
				</div>
			</article>
		</div>
		<nav :class="$style.carouselControls" :aria-label="copy.carouselLabel">
			<button type="button" :disabled="carouselIndex === 0" :aria-label="copy.previousItem" @click="moveCarousel(-1)">&lt;</button>
			<div :class="$style.carouselDots" :aria-label="copy.currentPosition">
				<button v-for="(_, i) in whatsNew.items" :key="i" type="button" :aria-label="copyx.showItem({ number: (i + 1).toString() })" :aria-current="carouselIndex === i ? 'true' : undefined" @click="showCarouselItem(i)"></button>
			</div>
			<span :class="$style.carouselCount">{{ carouselIndex + 1 }} / {{ whatsNew.items.length }}</span>
			<button type="button" :disabled="carouselIndex === whatsNew.items.length - 1" :aria-label="copy.nextItem" @click="moveCarousel(1)">&gt;</button>
		</nav>

		<footer :class="$style.footer">
			<p>
				{{ whatsNew.footer.text }}
				<button v-if="whatsNew.footer.linkUrl" class="_button" :class="$style.footerLink" @click="openReleaseNotes">
					{{ whatsNew.footer.linkLabel }} <i class="ti ti-external-link"></i>
				</button>
			</p>
			<MkButton primary rounded :class="$style.gotIt" :disabled="closing" @click="dismiss">{{ copy.gotIt }}</MkButton>
		</footer>
	</div>
</MkModal>
</template>

<script lang="ts" setup>
import { computed, ref, useTemplateRef } from 'vue';
import type { HataWhatsNewItem } from '@/utility/hata-whats-new.js';
import MkModal from '@/components/MkModal.vue';
import MkButton from '@/components/MkButton.vue';
import MkHatakyuIllustration from '@/components/MkHatakyuIllustration.vue';
import { useHatakyuBranding } from '@/utility/hatakyu-assets.js';
import { getHataWhatsNewDisplayVersion, HATA_WHATS_NEW as whatsNew } from '@/utility/hata-whats-new.js';
import { mainRouter } from '@/router.js';
import { ensureSignin } from '@/i.js';
import { miLocalStorage } from '@/local-storage.js';
import { setHatacordingUiEnabled } from '@/utility/hatacording-ui.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';

const copy = i18n.ts._hata._whatsNew._window;
const copyx = i18n.tsx._hata._whatsNew._window;
const modal = useTemplateRef('modal');
const itemsViewport = useTemplateRef('itemsViewport');
const carouselIndex = ref(0);
const closing = ref(false);
const releaseVersion = computed(() => getHataWhatsNewDisplayVersion(whatsNew.version));
const $i = ensureSignin();

const emit = defineEmits<{
	(ev: 'closed'): void;
}>();

async function go(item: HataWhatsNewItem) {
	if (item.activateUi === 'hatacording') {
		if (!$i.policies.canUseHatacordingUi) {
			await os.alert({ type: 'warning', text: copy.uiUnavailable });
			return;
		}
		setHatacordingUiEnabled($i.id, true);
		miLocalStorage.setItem('ui', 'hatacording');
		miLocalStorage.setItem('ui_setup_completed', 'true');
		modal.value?.close();
		window.location.assign('/');
		return;
	}
	if (item.to == null) return;
	// ⚠️先に閉じる。開いたまま遷移すると、行き先の上に幕が残る。
	modal.value?.close();
	mainRouter.push(item.to);
}

function dismiss() {
	if (closing.value) return;
	closing.value = true;
	window.setTimeout(() => modal.value?.close(), 260);
}

function showCarouselItem(index: number) {
	const viewport = itemsViewport.value;
	const item = viewport?.children.item(index) as HTMLElement | null;
	const firstItem = viewport?.children.item(0) as HTMLElement | null;
	if (viewport == null || item == null || firstItem == null) return;
	carouselIndex.value = index;
	viewport.scrollTo({ left: item.offsetLeft - firstItem.offsetLeft, behavior: 'smooth' });
}

function moveCarousel(direction: -1 | 1) {
	showCarouselItem(Math.max(0, Math.min(whatsNew.items.length - 1, carouselIndex.value + direction)));
}

function syncCarouselPosition() {
	const viewport = itemsViewport.value;
	if (viewport == null) return;
	const children = [...viewport.children] as HTMLElement[];
	const firstOffset = children[0]?.offsetLeft ?? 0;
	let nearestIndex = 0;
	let nearestDistance = Number.POSITIVE_INFINITY;
	for (const [index, item] of children.entries()) {
		const distance = Math.abs(item.offsetLeft - firstOffset - viewport.scrollLeft);
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearestIndex = index;
		}
	}
	carouselIndex.value = nearestIndex;
}

// ⚠️外部リンクは別タブへ。閉じない（読み終えて戻ってきたときに案内が残っている方がよい）。
function openReleaseNotes() {
	if (whatsNew.footer.linkUrl == null) return;
	window.open(whatsNew.footer.linkUrl, '_blank', 'noopener,noreferrer');
}
</script>

<style lang="scss" module>
@font-face {
	font-family: 'HataWhatsNewRighteous';
	font-style: normal;
	font-weight: 400;
	font-display: swap;
	src: url('/client-assets/Righteous-Regular.woff2') format('woff2');
}

.root {
	position: relative;
	box-sizing: border-box;
	width: 100%;
	max-width: 1180px;
	margin-inline: auto;
	max-height: calc(100dvh - 32px);
	overflow-y: auto;
	overscroll-behavior: contain;
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 18px;
	box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
	container-type: inline-size;
}

.header {
	display: grid;
	/* Hataskey fork: 1列目をハタキュ用に足した(元は `1fr auto` の2列)。 */
	grid-template-columns: auto 1fr auto;
	gap: 14px 20px;
	padding: 24px 24px 20px;
	border-bottom: 1px solid var(--MI_THEME-divider);
}

/* Hataskey fork: 装飾イラストは独立した列に置き、両方の行(識別子/バージョン行 + タイトル行)に
 * またがせて縦中央に配置する。既存の releaseIdentity/releaseVersion/headerText の配置・順序は変更しない。 */
.headerIllustration {
	grid-row: 1 / 3;
	grid-column: 1;
	align-self: start;
	justify-self: start;
	width: 96px;
	height: auto;
}

@container (max-width: 520px) {
	/* ⚠️狭い幅では隠さず縮める(ブランド表示なので消したくない)。 */
	.headerIllustration {
		width: 64px;
	}
}

.releaseIdentity { grid-column: 2; align-self: center; display: inline-flex; align-items: center; gap: 8px; font: 700 0.72em/1 ui-monospace, monospace; letter-spacing: .12em; opacity: .66; }
.releaseDot { width: 8px; height: 8px; border-radius: 50%; background: var(--MI_THEME-accent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--MI_THEME-accent) 13%, transparent); }
.releaseVersion { grid-column: 3; align-self: center; font: 600 .75em/1 ui-monospace, monospace; opacity: .58; }
/* Hataskey fork: 3列目(装飾イラスト)を追加したため、タイトル行がその列の下へ回り込んで
 * 重ならないよう、既存の 1〜2列目までに収める。 */
.headerText { grid-column: 2 / 4; min-width: 0; }
.title { margin: 0; font-size: clamp(1.45em, 4cqw, 2em); line-height: 1.15; font-weight: 800; letter-spacing: -.025em; }

.headline {
	margin: 7px 0 0;
	font-size: 0.92em;
	line-height: 1.55;
	opacity: 0.72;
}

.items { display: grid; grid-template-columns: 1fr; gap: 14px; padding: 18px; }

.item {
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 14px;
	background: color-mix(in srgb, var(--MI_THEME-panel) 94%, var(--MI_THEME-fg));
}

.preview { height: 148px; position: relative; overflow: hidden; background: var(--MI_THEME-bg); border-bottom: 1px solid var(--MI_THEME-divider); }
.itemBody { display: flex; flex: 1; flex-direction: column; min-width: 0; padding: 15px 16px 14px; }
.itemTitle { display: flex; align-items: flex-start; gap: 7px; font-weight: 750; font-size: 0.93em; line-height: 1.45; }
.itemTitle > i { flex: none; margin-top: 2px; color: var(--MI_THEME-accent); }
.itemText { margin-top: 3px; font-size: 0.85em; line-height: 1.65; opacity: 0.75; }

.itemLink {
	align-self: flex-start;
	margin-top: auto;
	padding-top: 9px;
	border-bottom: 1px solid transparent;
	font-size: 0.83em;
	font-weight: 700;
	color: var(--MI_THEME-accent);
}
.itemLink:hover { border-bottom-color: currentColor; }

/* 実画面のデザイン言語を縮小して再現した各プレビュー。 */

.studyMock { height: 100%; color: #443a2c; background: #f4ecdd; font-family: 'Zen Maru Gothic', system-ui, sans-serif; }
.studyHeader { display: flex; height: 31px; align-items: center; gap: 8px; padding: 0 10px; border-bottom: 1px solid rgba(96,70,35,.13); background: #fffdf8; font-size: 7px; }.studyHeader > i { display: grid; width: 17px; height: 17px; place-items: center; border-radius: 5px; color: #fff; background: #d9824a; }.studyHeader > b { color: #d9824a; font-family: 'HataWhatsNewRighteous', cursive; font-size: 13px; font-weight: 400; letter-spacing: .03em; }.studyHeader > em { margin-left: auto; padding: 4px 7px; border-radius: 7px; color: #fff; background: #d9824a; font-style: normal; }
.studyStats { display: grid; grid-template-columns: repeat(3, 1fr); margin: 7px 9px 5px; overflow: hidden; border: 1px solid rgba(96,70,35,.13); border-radius: 8px; background: #fffdf8; }.studyStats b { padding: 5px 7px; border-left: 1px solid rgba(96,70,35,.13); font-size: 8px; }.studyStats b:first-child { border: 0; }.studyStats small { display: block; margin-top: 1px; color: #a2937c; font-size: 5px; font-weight: 500; }
.studyContent { position: relative; margin: 0 9px; padding: 6px 8px; border: 1px solid rgba(96,70,35,.13); border-radius: 8px; background: #fffdf8; font-size: 6px; }.studyContent > strong { font-size: 8px; }.studyTimeline { display: flex; align-items: center; gap: 5px; margin-top: 5px; }.studyTimeline > i { width: 6px; height: 6px; border-radius: 50%; background: #d9824a; }.studyTimeline small { display: block; color: #a2937c; }.studyHeat { position: absolute; right: 7px; top: 7px; display: grid; grid-template: repeat(4, 5px) / repeat(7, 5px); gap: 2px; }.studyHeat span { border-radius: 1px; background: #eadfcb; }.studyHeat span[data-level="1"], .studyHeat span[data-level="2"] { background: #efc39e; }.studyHeat span[data-level="3"], .studyHeat span[data-level="4"] { background: #d9824a; }

.hataskMock { height: 100%; color: #453f34; background: #f3eee4; font-family: 'Zen Maru Gothic', system-ui, sans-serif; }.hataskHeader { display: grid; grid-template-columns: 24px minmax(0, 1fr) 24px; height: 32px; place-items: center; border-bottom: 1px solid #ded7c4; background: #fbf8f1; }.hataskHeader b { font-family: 'HataWhatsNewRighteous', system-ui, sans-serif; font-size: 14px; font-weight: 400; letter-spacing: .02em; }.hataskBody { display: grid; min-width: 0; grid-template-columns: minmax(0, 1.35fr) minmax(52px, .8fr); gap: 7px; padding: 7px 9px 4px; }.hataskCalendar { display: grid; min-width: 0; overflow: hidden; box-sizing: border-box; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; padding: 6px; border: 1px solid #ded7c4; border-radius: 6px; background: #fffdf8; }.hataskCalendar strong { grid-column: 1 / -1; min-width: 0; overflow: hidden; font-size: 6px; letter-spacing: .14em; }.hataskCalendar span { display: grid; min-width: 0; width: 100%; height: 10px; overflow: hidden; place-items: center; border-radius: 3px; font-size: 5px; font-variant-numeric: tabular-nums; line-height: 1; }.hataskCalendar span[data-marked="true"] { color: #fff; background: #a8552f; }.flowerProgress { display: flex; min-width: 0; flex-direction: column; align-items: center; gap: 2px; padding: 5px; border: 1px solid #ded7c4; border-radius: 6px; background: #fffdf8; }.flowerProgress > span { font-size: 6px; letter-spacing: .12em; }.flowerProgress > div { display: grid; width: 35px; height: 35px; place-items: center; border: 4px solid #e0dccf; border-top-color: #a8552f; border-right-color: #a8552f; border-radius: 50%; }.flowerProgress > div b { font-size: 16px; }.flowerProgress small { max-width: 100%; overflow: hidden; font-size: 5px; text-overflow: ellipsis; white-space: nowrap; }.hataskTabs { display: flex; justify-content: space-around; margin: 0 9px; padding: 4px; border-radius: 7px; color: #8f806c; background: #fffdf8; font-size: 8px; }.hataskTabs i:last-child { color: #a8552f; }

.cordUiMock { display:grid;height:100%;grid-template-columns:64px minmax(0,1fr) 79px;color:#e9edf5;background:#11151d;font-family:'Noto Sans JP',system-ui,sans-serif; }.cordUiMock > aside { display:flex;min-width:0;flex-direction:column;gap:2px;padding:5px;border-right:1px solid #2b3240;background:#171c26; }.cordUiMock > aside > div { display:flex;align-items:center;gap:3px;height:20px;overflow:hidden;font-size:5px;white-space:nowrap; }.cordUiMock > aside > div i { display:grid;width:15px;height:15px;flex:0 0 15px;place-items:center;border-radius:4px;color:#fff;background:#6c78e6;font-size:7px; }.cordUiMock > aside span { display:flex;align-items:center;gap:4px;padding:4px;border-radius:4px;font-size:5px;white-space:nowrap; }.cordUiMock > aside span.active { color:#bfc6ff;background:#272e43; }.cordUiMock > aside em { height:1px;margin:2px;background:#303746; }.cordUiMock > main { display:flex;min-width:0;flex-direction:column;padding-bottom:5px;background:linear-gradient(155deg,#121720,#171b25); }.cordUiMock > main > header { display:grid;height:25px;grid-template-columns:1fr auto;align-content:center;padding:0 7px;border-bottom:1px solid #2b3240;font-size:6px; }.cordUiMock > main > header small { color:#7fd6a9;font-size:4px; }.cordUiMock > main > header i { grid-column:1/-1;width:45%;height:2px;margin-top:2px;border-radius:2px;background:#343c4c; }.cordUiMock > main > div { display:flex;max-width:78%;align-items:flex-end;gap:3px;margin:5px 6px 0; }.cordUiMock > main > div.right { align-self:flex-end; }.cordUiMock > main > div > i { width:10px;height:10px;flex:0 0 10px;border-radius:50%;background:#8790a6; }.cordUiMock > main > div.right > i { background:#6c78e6; }.cordUiMock > main > div > span { display:grid;gap:3px;padding:5px 6px;border-radius:7px 7px 7px 2px;background:#252c39; }.cordUiMock > main > div.right > span { border-radius:7px 7px 2px;background:#333b50; }.cordUiMock > main > div b { font-size:5px;font-weight:500; }.cordUiMock > main > div small { color:#aeb5c5;font-size:4px; }.cordUiMock > main > footer { display:grid;height:21px;margin:auto 6px 0;grid-template-columns:15px 1fr 15px;align-items:center;padding:0 4px;border:1px solid #394257;border-radius:999px;background:#202633;font-size:5px; }.cordUiMock > main > footer i { color:#b4bbcb;font-size:7px; }.cordUiMock > main > footer span { opacity:.6; }.cordUiMock > main > footer b { display:grid;width:13px;height:13px;place-items:center;border-radius:50%;color:#fff;background:#6c78e6;font-size:8px; }.cordUiMock > section { min-width:0;border-left:1px solid #2b3240;background:#171c26; }.cordUiMock > section > header { display:flex;height:24px;align-items:center;gap:3px;padding:0 5px;border-bottom:1px solid #2b3240;font-size:5px; }.cordUiMock > section > header b { flex:1; }.cordUiMock > section > div { display:grid;gap:4px;margin:6px;padding:6px;border:1px solid #303849;border-radius:6px;background:#202632; }.cordUiMock > section > div i { width:18px;height:18px;border-radius:50%;background:#6c78e6; }.cordUiMock > section > div b { font-size:6px; }.cordUiMock > section > div span { height:3px;border-radius:2px;background:#3d4658; }.cordUiMock > section > div span:nth-of-type(2) { width:65%; }.cordUiMock > section > div small { margin-top:3px;color:#aeb5c5;font-size:4px;line-height:1.4; }
.cordUiMock > aside span[data-active='true'] { color:#bfc6ff;background:#272e43; }
.cordUiMock > main > div[data-side='right'] { align-self:flex-end; }
.cordUiMock > main > div[data-side='right'] > i { background:#6c78e6; }
.cordUiMock > main > div[data-side='right'] > span { border-radius:7px 7px 2px;background:#333b50; }

.hanaawaseMock { position: relative; display: grid; grid-template-columns: .75fr 1.25fr; grid-template-rows: 1fr 31px; height: 100%; padding: 9px; box-sizing: border-box; color: #f4efe3; background: #171410; font-family: 'Noto Serif JP', serif; }.hanaawaseMock::before { position: absolute; inset: 0; background: radial-gradient(circle at 17% 24%, rgba(201,160,78,.16), transparent 34%); content: ''; }.hanaHeading { z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }.hanaHeading > span { color: #c9a04e; font-size: 18px; }.hanaHeading > b { font-size: 17px; letter-spacing: .12em; }.hanaHeading > small { margin-top: 4px; color: #b8ad99; font-size: 5px; }.hanaMenu { z-index: 1; display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; align-content: center; }.hanaMenu > span { display: grid; grid-template-columns: 22px 1fr; align-items: center; padding: 5px; border: 1px solid rgba(201,160,78,.28); border-radius: 6px; background: rgba(23,20,16,.72); }.hanaMenu > span:first-child { grid-column: 1 / -1; border-color: #c9a04e; }.hanaMenu i { grid-row: 1 / 3; color: #c9a04e; font-style: normal; text-align: center; }.hanaMenu b { font-size: 7px; }.hanaMenu small { color: #b8ad99; font-size: 5px; }.hanaTown { z-index: 1; grid-column: 1 / -1; display: flex; align-items: center; gap: 5px; padding: 6px 8px; border-top: 1px solid rgba(201,160,78,.22); color: #b8ad99; font-size: 6px; }.hanaTown i { width: 17px; height: 17px; border-radius: 50%; background: #625849; }.hanaTown i:first-of-type { margin-left: auto; }

.uiMock { display: grid; grid-template-columns: 25px repeat(3, 1fr); gap: 5px; height: 100%; padding: 7px; box-sizing: border-box; background: color-mix(in srgb, var(--MI_THEME-accent) 7%, var(--MI_THEME-bg)); }.uiMock nav { display: flex; flex-direction: column; align-items: center; gap: 11px; padding: 9px 0; border-radius: 8px; color: var(--MI_THEME-fg); background: var(--MI_THEME-panel); font-size: 9px; }.uiMock nav i:first-child { color: var(--MI_THEME-accent); }.uiColumn { display: flex; min-width: 0; flex-direction: column; gap: 5px; padding: 7px 5px; border: 1px solid var(--MI_THEME-divider); border-radius: 8px; background: var(--MI_THEME-panel); }.uiColumn > b { padding-bottom: 4px; border-bottom: 1px solid var(--MI_THEME-divider); font-size: 6px; }.uiColumn > span { display: grid; grid-template-columns: 12px 1fr; gap: 4px; height: 24px; padding: 4px; border-radius: 5px; background: var(--MI_THEME-bg); }.uiColumn > span i { width: 11px; height: 11px; border-radius: 50%; background: var(--MI_THEME-accent); opacity: .5; }.uiColumn > span em { height: 4px; border-radius: 3px; background: var(--MI_THEME-fg); opacity: .15; }

.feedMock { height: 100%; padding: 7px 9px; box-sizing: border-box; color: var(--MI_THEME-fg); background: var(--MI_THEME-bg); }.feedToolbar { display: flex; align-items: center; gap: 7px; height: 23px; }.feedToolbar > b { font-family: 'Righteous', system-ui, sans-serif; font-size: 11px; }.feedToolbar > span { display: flex; flex: 1; align-items: center; gap: 4px; padding: 4px 6px; border: 1px solid var(--MI_THEME-divider); border-radius: 6px; opacity: .65; font-size: 5px; }.feedToolbar > i { color: var(--MI_THEME-accent); }.feedTabs { display: flex; gap: 13px; padding: 5px 2px; border-bottom: 1px solid var(--MI_THEME-divider); font-size: 6px; }.feedTabs b { color: var(--MI_THEME-accent); }.feedActions { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin: 5px 0; }.feedActions > span { padding: 4px; border: 1px solid var(--MI_THEME-accent); border-radius: 5px; color: var(--MI_THEME-accent); background: var(--MI_THEME-panel); font-size: 5px; text-align: center; }.issueRow { display: flex; align-items: center; gap: 6px; padding: 4px 2px; border-top: 1px solid var(--MI_THEME-divider); }.issueRow > span { width: 6px; height: 6px; border-radius: 50%; background: #2b6fc0; }.issueRow > span[data-state="2"] { background: #b6791f; }.issueRow > span[data-state="3"] { background: #1f8a5b; }.issueRow div { flex: 1; }.issueRow b, .issueRow em { display: block; font-size: 5px; font-style: normal; }.issueRow em { margin-top: 1px; opacity: .55; }.issueRow > i { font-size: 7px; opacity: .4; }

.betaMock { height:100%;padding:10px 12px;box-sizing:border-box;color:#e9ecf4;background:linear-gradient(145deg,#171b2c,#20213c); }.betaTop { display:flex;align-items:center;gap:7px;padding-bottom:8px;border-bottom:1px solid rgba(222,230,255,.18);font-size:8px; }.betaTop > i { color:#8ed3ff;font-size:14px; }.betaTop > b { font-size:10px; }.betaTop > span { margin-left:auto;padding:3px 6px;border:1px solid rgba(142,211,255,.48);border-radius:999px;color:#8ed3ff;background:rgba(92,168,236,.15);font:700 5px/1 ui-monospace,monospace;letter-spacing:.12em; }.betaCards { display:grid;gap:6px;margin-top:8px; }.betaCards > div { display:flex;align-items:center;gap:7px;padding:8px;border:1px solid rgba(222,230,255,.18);border-radius:7px;background:rgba(255,255,255,.07); }.betaCards > div > i:first-child { display:grid;width:20px;height:20px;place-items:center;border-radius:6px;color:#0e1930;background:#8ed3ff;font-size:10px; }.betaCards span { display:grid;gap:1px;flex:1;min-width:0; }.betaCards b { overflow:hidden;font-size:6px;text-overflow:ellipsis;white-space:nowrap; }.betaCards small { color:#c0c7da;font-size:5px; }.betaCards > div > i:last-child { font-size:8px;opacity:.55; }.betaCards em { padding:3px 5px;border-radius:999px;color:#123525;background:#80dfae;font:700 5px/1 ui-monospace,monospace;font-style:normal; }

.privateChannelMock { height:100%;padding:10px 12px;box-sizing:border-box;color:var(--MI_THEME-fg);background:linear-gradient(145deg,color-mix(in srgb,var(--MI_THEME-accent) 10%,var(--MI_THEME-bg)),var(--MI_THEME-bg)); }.privateChannelTop { display:flex;align-items:center;gap:7px;padding-bottom:8px;border-bottom:1px solid var(--MI_THEME-divider);font-size:8px; }.privateChannelTop > i { display:grid;width:20px;height:20px;place-items:center;border-radius:6px;color:#fff;background:var(--MI_THEME-accent);font-size:10px; }.privateChannelTop > b { font-size:10px; }.privateChannelTop > span { margin-left:auto;padding:3px 6px;border:1px solid var(--MI_THEME-divider);border-radius:999px;font-size:5px;opacity:.72; }.privateChannelBody { display:grid;gap:3px;margin-top:8px;padding:8px;border:1px solid var(--MI_THEME-divider);border-radius:8px;background:var(--MI_THEME-panel); }.privateChannelBody > b { font-size:8px; }.privateChannelBody > small { font-size:5px;opacity:.62; }.privateChannelBody > div { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin-top:4px; }.privateChannelBody > div > span { display:grid;gap:2px;padding:5px 4px;border-radius:5px;background:var(--MI_THEME-bg);font-size:5px;text-align:center; }.privateChannelBody > div > span > i { color:var(--MI_THEME-accent);font-size:8px; }.privateChannelBody > div > span:last-child > i { color:var(--MI_THEME-warn); }

.sideStudioMock { height:100%;color:#e9e8f4;background:#12121a;font-family:system-ui,sans-serif; }
.sideStudioBar { display:grid;grid-template-columns:18px auto 1fr 20px;align-items:center;gap:5px;height:28px;padding:0 8px;border-bottom:1px solid #343343;background:#1a1924;font-size:6px; }.sideStudioBar > b { color:#a99cff;font-family:'HataWhatsNewRighteous',system-ui,sans-serif;font-size:11px;font-weight:400; }.sideStudioBar > span { justify-self:end;padding:3px 6px;border:1px solid #45435a;border-radius:999px;background:#222130; }
.sideStudioBody { display:grid;grid-template-columns:minmax(0,1.1fr) minmax(72px,.9fr);gap:6px;height:calc(100% - 28px);padding:6px;box-sizing:border-box; }.sideStudioPreview,.sideStudioInspector { min-width:0;border:1px solid #363548;border-radius:7px;background:#1c1b27;overflow:hidden; }.sideStudioPreview { padding:5px; }.sideStudioServer { display:grid;grid-template-columns:18px 1fr 15px;align-items:center;gap:4px;padding:3px;border-bottom:1px solid #363548;font-size:6px; }.sideStudioServer > i:first-child { display:grid;width:17px;height:17px;place-items:center;border-radius:5px;color:#fff;background:#7668dc; }.sideStudioGroup { display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-top:5px;padding:4px;border:1px solid #4d496b;border-radius:6px;background:linear-gradient(145deg,#28263a,#201f2d); }.sideStudioGroup > small { grid-column:1/-1;color:#aaa7bf;font-size:5px; }.sideStudioGroup > span { display:flex;align-items:center;gap:3px;padding:4px;border-radius:4px;background:#302e43;font-size:5px; }.sideStudioGroup > em { grid-column:1/-1;display:grid;grid-template-columns:18px 1fr;align-items:center;padding:5px;border-radius:5px;background:linear-gradient(135deg,#6c5bd3,#3d68b2);font-size:5px;font-style:normal; }.sideStudioGroup > em > i { grid-row:1/3;font-size:10px; }.sideStudioGroup > em small { font-size:4px;opacity:.76; }
.sideStudioInspector { display:flex;flex-direction:column;gap:5px;padding:6px; }.sideStudioInspector > strong { font-size:7px; }.sideStudioInspector > small { color:#aaa7bf;font-size:5px; }.sideStudioInspector > div { display:grid;grid-template-columns:1fr repeat(3,12px);align-items:center;gap:3px;padding:5px;border:1px solid #363548;border-radius:5px;background:#232230; }.sideStudioInspector > div b { font-size:5px; }.sideStudioInspector > div span { height:5px;border-radius:999px;background:#7668dc; }.sideStudioInspector > div i { width:10px;height:10px;border-radius:3px;background:#7668dc; }.sideStudioInspector > div i:nth-last-child(2) { background:#d96f9c; }.sideStudioInspector > div i:last-child { background:#53a89e; }

.profileMock { position: relative; height: 100%; overflow: hidden; background: var(--MI_THEME-panel); }.profileCover { height: 57px; background: linear-gradient(145deg, color-mix(in srgb, var(--MI_THEME-accent) 55%, #6d87a8), color-mix(in srgb, var(--MI_THEME-accent) 16%, var(--MI_THEME-bg))); }.profileCover::after { position: absolute; top: 38px; right: 0; left: 0; height: 22px; background: linear-gradient(to bottom, transparent, var(--MI_THEME-panel)); content: ''; }.profileAvatar { position: absolute; top: 38px; left: 13px; width: 35px; height: 35px; border: 3px solid var(--MI_THEME-panel); border-radius: 50%; background: var(--MI_THEME-accent); }.profileName { margin: 9px 0 9px 56px; }.profileName b, .profileName small { display: block; }.profileName b { font-size: 8px; }.profileName small { opacity: .55; font-size: 5px; }.profileBadges { display: flex; justify-content: center; gap: 4px; }.profileBadges span { display: grid; grid-template-columns: auto auto; gap: 1px 3px; padding: 4px 6px; border: 1px solid color-mix(in srgb, var(--badge-color, var(--MI_THEME-accent)) 48%, transparent); border-radius: 7px; color: var(--badge-color, var(--MI_THEME-accent)); background: linear-gradient(135deg, color-mix(in srgb, var(--badge-color, var(--MI_THEME-accent)) 18%, var(--MI_THEME-panel)), color-mix(in srgb, var(--badge-color, var(--MI_THEME-accent)) 7%, var(--MI_THEME-panel))); font-size: 5px; }.profileBadges span:nth-child(2) { --badge-color: var(--MI_THEME-warn); }.profileBadges span:nth-child(3) { --badge-color: #e573a5; }.profileBadges i { grid-row: 1 / 3; align-self: center; font-size: 9px; }.profileBadges b { font-size: 5px; }

.viewerMock { display: flex; flex-direction: column; height: 100%; color: #fff; background: #111318; }.viewerTop { display: flex; align-items: center; gap: 11px; padding: 7px 10px; background: rgba(0,0,0,.55); font-size: 7px; }.viewerTop span { margin-right: auto; }.viewerImage { position: relative; display: grid; flex: 1; place-items: center; color: #dce8ff; background: radial-gradient(circle, #33445c, #171a20 70%); }.viewerImage > i { font-size: 29px; }.viewerImage > span { position: absolute; top: 50%; display: grid; width: 22px; height: 22px; place-items: center; border-radius: 50%; color: #fff; background: rgba(0,0,0,.52); font-size: 9px; }.viewerImage > span:first-of-type { left: 8px; }.viewerImage > span:last-of-type { right: 8px; }.viewerControls { display: flex; align-items: center; gap: 8px; padding: 7px 10px; background: rgba(0,0,0,.55); }.viewerControls i { font-size: 8px; opacity: .8; }.viewerControls span { flex: 1; height: 3px; border-radius: 2px; background: rgba(255,255,255,.25); }

.muteMock { display: flex; gap: 11px; height: 100%; align-items: flex-start; padding: 22px 18px; box-sizing: border-box; background: var(--MI_THEME-panel); }.muteAvatar { width: 42px; height: 42px; flex: none; border-radius: 50%; background: color-mix(in srgb, var(--MI_THEME-accent) 38%, var(--MI_THEME-bg)); }.muteBody { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 4px; padding-top: 1px; }.muteBody b { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.muteBody b small { margin-left: 4px; opacity: .55; font-size: 8px; font-weight: 400; }.muteBody > span { font-size: 10px; line-height: 1.5; }.muteBody div { display: flex; gap: 6px; margin-top: 3px; }.muteBody i { padding: 5px 9px; border-radius: 999px; background: var(--MI_THEME-bg); font-style: normal; font-size: 9px; line-height: 1; }.muteBody i[data-muted] { opacity: .28; text-decoration: line-through; }.muteMock > i { flex: none; font-size: 12px; opacity: .5; }

.externalMock, .securityMock { height: 100%; padding: 10px 12px; box-sizing: border-box; background: var(--MI_THEME-bg); }.settingsTitle { display: flex; align-items: center; gap: 7px; margin-bottom: 7px; font-size: 8px; }.settingsTitle b { font-size: 10px; }.serverRow, .securityRows > span { display: flex; align-items: center; gap: 8px; margin-top: 5px; padding: 7px 9px; border: 1px solid var(--MI_THEME-divider); border-radius: 8px; background: var(--MI_THEME-panel); }.serverRow > i:first-child { display: grid; width: 22px; height: 22px; place-items: center; border-radius: 6px; color: var(--MI_THEME-accent); background: var(--MI_THEME-accentedBg); }.serverRow span { flex: 1; }.serverRow b, .serverRow small { display: block; font-size: 6px; }.serverRow small { margin-top: 2px; opacity: .55; }.serverRow > em { padding: 4px 7px; border-radius: 999px; color: #fff; background: var(--MI_THEME-accent); font-size: 5px; font-style: normal; }.securityRows { display: grid; gap: 5px; }.securityRows > span { margin: 0; padding: 7px 9px; }.securityRows > span > i:first-child { color: var(--MI_THEME-accent); }.securityRows b { flex: 1; font-size: 7px; }.securityRows em { color: var(--MI_THEME-success); font-size: 6px; font-style: normal; }

.languageMock { height: 100%; padding: 11px 12px; box-sizing: border-box; background: linear-gradient(150deg, color-mix(in srgb, var(--MI_THEME-accent) 10%, var(--MI_THEME-bg)), var(--MI_THEME-bg) 72%); }
.languageTitle { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; }
.languageTitle > i { display: grid; width: 24px; height: 24px; flex: none; place-items: center; border-radius: 8px; color: #fff; background: var(--MI_THEME-accent); font-size: 12px; }
.languageTitle span { min-width: 0; }
.languageTitle b, .languageTitle small { display: block; }
.languageTitle b { font-size: 9px; }
.languageTitle small { margin-top: 2px; overflow: hidden; opacity: .58; font-size: 5px; text-overflow: ellipsis; white-space: nowrap; }
.languageChoices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
.languageChoices > span { display: grid; min-width: 0; grid-template-columns: 18px minmax(0, 1fr); grid-template-rows: auto auto; align-items: center; gap: 1px 5px; padding: 8px 6px; border: 1px solid var(--MI_THEME-divider); border-radius: 8px; background: var(--MI_THEME-panel); }
.languageChoices > span[data-active='true'] { border-color: color-mix(in srgb, var(--MI_THEME-accent) 72%, var(--MI_THEME-divider)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--MI_THEME-accent) 12%, transparent); }
.languageChoices i { grid-row: 1 / 3; display: grid; width: 18px; height: 18px; place-items: center; border-radius: 6px; color: var(--MI_THEME-accent); background: var(--MI_THEME-accentedBg); font-size: 6px; font-style: normal; font-weight: 800; }
.languageChoices b { min-width: 0; overflow: hidden; font-size: 6px; text-overflow: ellipsis; white-space: nowrap; }
.languageChoices small { opacity: .55; font-size: 5px; }

.carouselControls { display: none; }

.footer {
	display: flex;
	align-items: center;
	gap: 18px;
	position: sticky;
	bottom: 0;
	padding: 14px 18px;
	border-top: 1px solid var(--MI_THEME-divider);
	background: color-mix(in srgb, var(--MI_THEME-panel) 94%, transparent);
	backdrop-filter: blur(12px);
	box-shadow: 0 -10px 25px rgba(0,0,0,.05);
}
.footer p {
	flex: 1;
	margin: 0;
	font-size: 0.83em;
	line-height: 1.7;
	opacity: 0.75;
}

.footerLink {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	margin-left: 4px;
	padding: 0;
	font-size: 1em;
	font-weight: 700;
	color: var(--MI_THEME-accent);
}

.gotIt { flex: none; min-width: 120px; }
.closing { pointer-events: none; animation: hata-whats-new-slide-down .26s cubic-bezier(.22,.8,.24,1) forwards; }

@keyframes hata-whats-new-slide-down {
	to { opacity: 0; transform: translateY(56px); }
}

@container (min-width: 620px) {
	.items { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@container (min-width: 940px) {
	.items { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@container (max-width: 520px) {
	.header { padding: 19px 18px 16px; }
	.items {
		display: flex;
		gap: 10px;
		overflow-x: auto;
		overflow-y: hidden;
		padding: 12px 12px 7px;
		scroll-behavior: smooth;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		touch-action: pan-x pan-y;
	}
	.items::-webkit-scrollbar { display: none; }
	.item { flex: 0 0 100%; scroll-snap-align: start; scroll-snap-stop: always; }
	.carouselControls {
		display: grid;
		grid-template-columns: 38px minmax(0, 1fr) auto 38px;
		align-items: center;
		gap: 8px;
		padding: 1px 13px 11px;
	}
	.carouselControls > button {
		display: grid;
		width: 36px;
		height: 36px;
		place-items: center;
		border: 1px solid var(--MI_THEME-divider);
		border-radius: 50%;
		color: var(--MI_THEME-fg);
		background: var(--MI_THEME-panel);
		font: 800 16px/1 ui-monospace, monospace;
		cursor: pointer;
	}
	.carouselControls > button:disabled { opacity: .28; cursor: default; }
	.carouselDots { display: flex; min-width: 0; justify-content: center; gap: 5px; }
	.carouselDots button {
		width: 6px;
		height: 6px;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: color-mix(in srgb, var(--MI_THEME-fg) 22%, transparent);
		transition: width .18s ease, background-color .18s ease;
		cursor: pointer;
	}
	.carouselDots button[aria-current="true"] { width: 17px; background: var(--MI_THEME-accent); }
	.carouselCount { font: 650 9px/1 ui-monospace, monospace; opacity: .52; white-space: nowrap; }
	.footer { align-items: stretch; flex-direction: column; gap: 9px; }
	.gotIt { width: 100%; }
}
/* ===== Hataskey fork: 今回の更新内容のプレビュー ===== */
/* ⚠️枠は 148px 高。各モックは中身が溢れても隠れるよう overflow:hidden の中で組む。 */
.brandingMock { height: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0 10px; background: linear-gradient(135deg, #eef3ff, #f7eefc); }
.brandingBefore { display: flex; flex-direction: column; gap: 6px; opacity: .38; }
.brandingBefore > i { width: 24px; height: 24px; border-radius: 50%; display: grid; place-content: center; font-size: 13px; color: #5a6076; background: #fff; }
.brandingArrow { color: #8a93b2; font-size: 14px; }
.brandingAfter { display: flex; align-items: center; gap: 4px; }

.recordMock { height: 100%; display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; background: #eef3fb; }
.recordTabs { display: flex; gap: 5px; }
.recordTabs > span { width: 30px; height: 20px; border-radius: 999px; display: grid; place-content: center; font-size: 12px; color: #7a89a6; background: #fff; }
.recordTabs > span[data-active="true"] { color: #fff; background: #3f6fd0; }
.recordStats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
.recordStats > b { display: flex; flex-direction: column; gap: 3px; padding: 5px; border-radius: 7px; background: #fff; }
.recordStats > b > i { width: 60%; height: 5px; border-radius: 999px; background: #cddaee; }
.recordStats > b > u { width: 85%; height: 8px; border-radius: 3px; background: #3f6fd0; opacity: .8; }
.recordRows { display: flex; flex-direction: column; gap: 4px; }
.recordRows > span { display: flex; align-items: center; gap: 5px; }
.recordRows > span > em { width: 16px; height: 8px; border-radius: 3px; background: #b6c8e4; }
.recordRows > span > u { height: 8px; border-radius: 999px; background: #7fa3dd; }
.recordRows > span > u[data-level="1"] { width: 62%; }
.recordRows > span > u[data-level="2"] { width: 44%; }
.recordRows > span > u[data-level="3"] { width: 72%; }

.visibilityMock { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; background: #edf4ee; }
.visibilitySheet { width: 74%; display: flex; flex-direction: column; gap: 4px; padding: 7px; border-radius: 10px; background: #fff; box-shadow: 0 4px 12px rgba(60, 90, 65, .12); }
.visibilitySheet > span { display: flex; align-items: center; gap: 6px; padding: 5px 7px; border-radius: 7px; font-size: 12px; color: #4d7a55; }
.visibilitySheet > span > u { flex: 1; height: 6px; border-radius: 999px; background: #d8e6da; }
.visibilitySheet > span[data-active="true"] { color: #fff; background: #4d7a55; }
.visibilitySheet > span[data-active="true"] > u { background: rgba(255, 255, 255, .55); }
.visibilitySave { width: 30px; height: 22px; border-radius: 999px; display: grid; place-content: center; font-size: 12px; color: #fff; background: #4d7a55; }

.cordFixMock { height: 100%; display: flex; align-items: center; gap: 9px; padding: 0 12px; background: #262a35; }
/* 宴の枠がノートの外側に付くようになったことを、外周のアクセント枠で示す。 */
.cordFixNote { flex: 1; display: flex; gap: 7px; padding: 9px; border-radius: 11px; background: #333846; outline: 2px solid #ffc65c; outline-offset: 3px; }
.cordFixAvatar { width: 22px; height: 22px; border-radius: 50%; flex: none; background: #5d6478; }
.cordFixLines { flex: 1; display: flex; flex-direction: column; gap: 5px; justify-content: center; }
.cordFixLines > u { height: 6px; border-radius: 999px; background: #565e73; }
.cordFixLines > u:last-child { width: 60%; }
.cordFixSide { display: flex; flex-direction: column; align-items: center; gap: 7px; }
.cordFixPopup { display: flex; flex-direction: column; gap: 3px; padding: 5px; border-radius: 8px; background: #3c4353; color: #cdd6ea; font-size: 11px; }
.cordFixGauge { width: 26px; height: 26px; border-radius: 50%; background: conic-gradient(#6fa8ff 0 68%, #454c5e 68% 100%); }

.badgeMock { height: 100%; position: relative; background: #fbf6ec; overflow: hidden; }
.badgeBanner { height: 46px; background: linear-gradient(120deg, #e0b769, #d68f5a); }
.badgeAvatar { position: absolute; top: 30px; left: 14px; width: 34px; height: 34px; border-radius: 50%; border: 3px solid #fbf6ec; background: #c9a06a; }
.badgeName { position: absolute; top: 72px; left: 14px; display: flex; flex-direction: column; gap: 4px; }
.badgeName > u { height: 6px; border-radius: 999px; background: #ddcbb0; }
.badgeName > u:first-child { width: 62px; }
.badgeName > u:last-child { width: 40px; }
.badgeChips { position: absolute; right: 12px; bottom: 12px; display: flex; gap: 6px; }
.badgeChips > em { width: 26px; height: 26px; border-radius: 50%; display: grid; place-content: center; font-size: 13px; color: #fff; background: #d8a13c; box-shadow: 0 2px 6px rgba(160, 120, 50, .3); }
.badgeChips > em:last-child { background: #9a7bd0; }

.muteFixMock { height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 9px; padding: 0 14px; background: #f5eff5; }
.muteNote { display: flex; gap: 8px; }
.muteAvatar { width: 24px; height: 24px; border-radius: 50%; flex: none; background: #cbb8cd; }
.muteLines { flex: 1; display: flex; flex-direction: column; gap: 5px; justify-content: center; }
.muteLines > u { height: 6px; border-radius: 999px; background: #d9c9da; }
.muteLines > u:last-child { width: 55%; }
.muteChips { display: flex; gap: 6px; padding-left: 32px; }
.muteChips > em { width: 30px; height: 17px; border-radius: 999px; background: #b98fb9; }
.muteChips > em[data-hidden="true"] { color: #9a879b; background: #e6dce6; display: grid; place-content: center; font-size: 10px; }

.cardMock { height: 100%; display: grid; place-content: center; background: linear-gradient(160deg, #e8edfa, #f2eaf7); }
.cardTilt { position: relative; width: 108px; height: 68px; padding: 9px; border-radius: 10px; display: flex; gap: 8px; overflow: hidden; background: linear-gradient(135deg, #5b8def, #9b6fe0); transform: rotate(-7deg); box-shadow: 0 8px 18px rgba(70, 80, 150, .3); }
.cardShine { position: absolute; inset: -40% -20% auto; height: 180%; background: linear-gradient(105deg, transparent 42%, rgba(255, 255, 255, .38) 50%, transparent 58%); }
.cardPhoto { width: 26px; height: 26px; border-radius: 6px; background: rgba(255, 255, 255, .78); }
.cardLines { flex: 1; display: flex; flex-direction: column; gap: 5px; padding-top: 3px; }
.cardLines > u { height: 5px; border-radius: 999px; background: rgba(255, 255, 255, .72); }
.cardLines > u:last-child { width: 58%; background: rgba(255, 255, 255, .45); }
/* 位置ずれを直した装飾アイコンなので、角にきっちり収まっていることを見せる。 */
.cardDeco { position: absolute; right: 7px; bottom: 6px; font-size: 13px; color: #fff8d0; }

.homeMock { height: 100%; position: relative; display: grid; place-content: center; background: #eef2fb; }
.homePhone { width: 82px; height: 116px; display: flex; flex-direction: column; gap: 6px; padding: 8px; border-radius: 12px; background: #fff; box-shadow: 0 5px 14px rgba(60, 80, 140, .16); }
.homeTabs { display: flex; gap: 4px; }
.homeTabs > span { flex: 1; height: 5px; border-radius: 999px; background: #ccd8ec; }
.homeTabs > span[data-active="true"] { background: #3f6fd0; }
.homeBody { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.homeBody > u { height: 7px; border-radius: 999px; background: #e0e7f4; }
.homeBody > u:last-child { width: 64%; }
.homeNav { display: grid; place-content: center; padding-top: 2px; font-size: 14px; color: #3f6fd0; border-top: 1px solid #e6ecf7; }
/* 「押しても選んだタブが変わらない」ことを鍵アイコンで示す。 */
.homeKeep { position: absolute; top: 16px; right: 20px; font-size: 15px; color: #3f6fd0; opacity: .55; }

.studioMock { height: 100%; display: flex; gap: 9px; padding: 12px; background: #f1eef8; }
.studioSide { width: 46%; display: flex; flex-direction: column; gap: 6px; }
.studioSide > span { height: 20px; border-radius: 6px; background: #d3c9e9; }
.studioSide > span[data-drop="true"] { background: transparent; border: 2px dashed #7d63c9; }
.studioSide > span[data-dragging="true"] { display: grid; place-content: center; color: #fff; background: #7d63c9; box-shadow: 0 4px 10px rgba(90, 60, 160, .3); font-size: 12px; }
.studioMain { flex: 1; display: flex; flex-direction: column; gap: 6px; padding: 8px; border-radius: 8px; background: #e2dbf2; }
.studioMain > u { height: 7px; border-radius: 999px; background: #cfc5e6; }
.studioMain > u:last-child { width: 62%; }

.mobileMock { height: 100%; display: grid; place-content: center; background: #eaf4f1; }
.mobilePhone { position: relative; width: 92px; height: 116px; display: flex; flex-direction: column; justify-content: flex-end; gap: 7px; padding: 9px; border-radius: 13px; background: #fff; box-shadow: 0 5px 14px rgba(50, 110, 100, .16); }
.mobilePicker { display: flex; justify-content: center; gap: 5px; padding: 5px 6px; border-radius: 999px; background: #4f9184; color: #fff; font-size: 12px; box-shadow: 0 4px 10px rgba(50, 110, 100, .25); }
.mobileNote { display: flex; flex-direction: column; gap: 5px; }
.mobileNote > u { height: 6px; border-radius: 999px; background: #dceae6; }
.mobileNote > u:last-child { width: 58%; }
.mobileTouch { position: absolute; left: 20px; bottom: 22px; width: 26px; height: 26px; border-radius: 50%; border: 2px solid #4f9184; opacity: .5; }

</style>
