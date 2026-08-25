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
			<article v-for="(item, i) in whatsNew.items" :key="i" :class="$style.item" :style="{ '--i': i }">
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

					<!-- 旗鯖fork: hata-12.2 の案内を書いたあとに入った変更のプレビュー。
					     ⚠️モック内の文字は言語に依らないもの(記号・アイコン)にする。画面文言を直書きしない。 -->
					<div v-else-if="item.preview === 'hatalyze'" :class="$style.hatalyzeMock">
						<div :class="$style.hatalyzeAxes">
							<span v-for="n in 6" :key="n"><em></em><i><b></b></i></span>
						</div>
						<div :class="$style.hatalyzeHours"><u v-for="n in 24" :key="n"></u></div>
					</div>

					<div v-else-if="item.preview === 'hatakyuTheme'" :class="$style.hatakyuMock">
						<div :class="$style.hatakyuBoard">
							<span :class="$style.hatakyuPaper" style="--r:-4deg;--i:0"><i></i><u></u><u></u></span>
							<span :class="$style.hatakyuPaper" style="--r:3deg;--i:1"><i></i><u></u><u></u></span>
							<span :class="$style.hatakyuPaper" style="--r:-2deg;--i:2"><i></i><u></u><u></u></span>
							<em :class="$style.hatakyuLeaf"></em>
							<em :class="$style.hatakyuLeaf"></em>
						</div>
					</div>

					<div v-else-if="item.preview === 'hatadyExport'" :class="$style.exportMock">
						<div :class="$style.exportPanel">
							<div :class="$style.exportRow"><span data-on="true"><i class="ti ti-movie"></i></span><span><i class="ti ti-device-gamepad-2"></i></span></div>
							<div :class="$style.exportRow"><span data-on="true">.txt</span><span>.json</span></div>
						</div>
						<i :class="[$style.exportArrow, 'ti', 'ti-arrow-right']"></i>
						<div :class="$style.exportFile"><i class="ti ti-file-text"></i><u></u><u></u></div>
					</div>

					<div v-else-if="item.preview === 'foldable'" :class="$style.foldMock">
						<div :class="$style.foldDevice">
							<div :class="$style.foldMain"><u></u><u></u><u></u></div>
							<span :class="$style.foldHinge"></span>
							<div :class="$style.foldSide"><em></em><em></em></div>
						</div>
					</div>

					<div v-else-if="item.preview === 'uiMotion'" :class="$style.popupMock">
						<div :class="$style.popupCard">
							<div :class="$style.popupBanner"></div>
							<span :class="$style.popupAvatar"></span>
							<div :class="$style.popupLines"><u></u><u></u></div>
							<div :class="$style.popupChips"><span></span><span></span><span></span></div>
						</div>
						<span :class="$style.popupArc"></span>
					</div>

					<div v-else-if="item.preview === 'langFix'" :class="$style.langMock">
						<div :class="$style.langCard">
							<span :class="$style.langDate">08/25</span>
							<span :class="$style.langSwap"><b :class="$style.langBefore">Sunday</b><b :class="$style.langAfter">日曜日</b></span>
						</div>
					</div>

					<div v-else-if="item.preview === 'externalDdoskey'" :class="$style.ddoskeyMock">
						<div :class="$style.ddoskeyPanel">
							<div :class="$style.ddoskeyHead"><i class="ti ti-plug-connected"></i><u></u></div>
							<div :class="$style.ddoskeyList">
								<span :class="$style.ddoskeyRow"><em></em><u></u></span>
								<span :class="$style.ddoskeyRow"><em></em><u></u></span>
								<!-- ⚠️ここだけ文字を出す。ホスト名は翻訳されないので空欄事故にならない。 -->
								<span :class="[$style.ddoskeyRow, $style.ddoskeyNew]"><em></em><b :class="$style.ddoskeyHost">ddoskey.com</b><i :class="[$style.ddoskeyCheck, 'ti', 'ti-circle-check']"></i></span>
							</div>
						</div>
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

/* 旗鯖fork: 開いたときにカードを左上から右下へ順に出す。
   ⚠️並び(DOM順)がそのまま読み順なので、番号 --i の遅延だけで左上→右下になる。
     段数は画面幅で1〜3列と変わるが、どの列数でも順序は崩れない。
   ⚠️`both` を付けて、遅延中も開始時の状態を保つ（付けないと全部出てから引っ込む）。 */
@keyframes hwnItemIn { from { opacity: 0; transform: translate3d(-7px, 11px, 0) scale(.985); } to { opacity: 1; transform: none; } }

.item {
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;
	animation: hwnItemIn .44s cubic-bezier(.2,.9,.2,1) both;
	animation-delay: calc(var(--i, 0) * 38ms + 40ms);
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
.itemLink:hover { border-bottom-color: currentColor; }.muteAvatar { width: 42px; height: 42px; flex: none; border-radius: 50%; background: color-mix(in srgb, var(--MI_THEME-accent) 38%, var(--MI_THEME-bg)); }

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

/* =====================================================================
   旗鯖fork: 更新案内のプレビューの見た目と動き。
   ⚠️動きは「実物と同じ緩急・同じ時間」にする。合わせないと、案内で見た印象と
     実際に触ったときの印象がずれる。実物の値は以下から取っている:
       ハタキュ  … pages/hatask.vue の hkSway 6.5s / hkGust 1.9s cubic-bezier(.33,.1,.24,.98)
                   揺れ幅は ±0.55deg。⚠️大きく揺らさない(実物はごく僅か)
       棒グラフ  … HatadyStatsDetail.vue の barRise .54s cubic-bezier(.2,.9,.2,1)
                   ⚠️transform-origin は center bottom(下から生える)
       出現      … MkModal.vue の transform .26s cubic-bezier(.2,.9,.2,1)
       読込中    … MkHataPostSubmitVisual.vue の hataSubmitArc .72s linear
   ⚠️動かすのは transform と opacity だけ。16個が同時に動くので幅や背景位置は変えない。
   ⚠️元から transform を持つ要素はキーフレームに元の変形を含める(含めないと傾きが消える)。
   ⚠️末尾の prefers-reduced-motion で全部止める。
   ===================================================================== */

/* --- 実物と同じ緩急 --- */
@keyframes hwnRise { from { opacity: 0; transform: scaleY(.18); } to { opacity: 1; transform: scaleY(1); } }
@keyframes hwnGrowBar { from { transform: scaleX(.12); } to { transform: scaleX(1); } }
@keyframes hwnEnter { from { opacity: 0; transform: translateY(8px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes hwnPopIn { 0% { opacity: 0; transform: scale(.72); } 62% { opacity: 1; transform: scale(1.06); } 100% { opacity: 1; transform: scale(1); } }
@keyframes hwnArrowNudge { 0%, 100% { transform: translateX(-2px); opacity: .6; } 50% { transform: translateX(3px); opacity: 1; } }
@keyframes hwnSoftPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: .84; } }
@keyframes hwnShineSweep { 0% { transform: translateX(-120%); } 55%, 100% { transform: translateX(120%); } }
@keyframes hwnFadeCycle { 0%, 40% { opacity: 1; } 55%, 85% { opacity: .16; } 100% { opacity: 1; } }
@keyframes hwnRipple { 0% { transform: scale(.4); opacity: .5; } 70% { transform: scale(1.6); opacity: 0; } 100% { transform: scale(1.6); opacity: 0; } }
@keyframes hwnArc { to { transform: rotate(360deg); } }
@keyframes hwnHeat { from { opacity: 0; transform: scale(.5); } to { opacity: 1; transform: scale(1); } }

/* ハタキュ: 常時のゆれは実物と同じ ±0.55deg。⚠️元の rotate(var(--r)) を保つ。 */
@keyframes hwnPaperSway { 0%, 100% { transform: rotate(var(--r, 0deg)); } 50% { transform: rotate(calc(var(--r, 0deg) + .55deg)); } }
/* ハタキュ: 突風。実物 hkGust と同じ折れ点。 */
@keyframes hwnPaperGust {
	0%, 62% { transform: rotate(var(--r, 0deg)); }
	66% { transform: rotate(calc(var(--r, 0deg) + 2.4deg)); }
	72% { transform: rotate(calc(var(--r, 0deg) - 1.5deg)); }
	78% { transform: rotate(calc(var(--r, 0deg) + .8deg)); }
	84% { transform: rotate(calc(var(--r, 0deg) - .34deg)); }
	90% { transform: rotate(calc(var(--r, 0deg) + .12deg)); }
	100% { transform: rotate(var(--r, 0deg)); }
}
/* ハタキュ: 落ち葉。実物 hkDrift と同じ考え方(横切って消える)。 */
@keyframes hwnLeafDrift { 0%, 58% { opacity: 0; transform: translate(0, 0) rotate(0); } 64% { opacity: .9; } 100% { opacity: 0; transform: translate(120px, 26px) rotate(220deg); } }

/* ===== 既存モックの動き ===== */
.brandingBefore > i { animation: hwnFadeCycle 4s ease-in-out infinite; }
.brandingBefore > i:nth-child(2) { animation-delay: .2s; }
.brandingBefore > i:nth-child(3) { animation-delay: .4s; }
.brandingArrow { animation: hwnArrowNudge 2.4s ease-in-out infinite; }
.brandingAfter > * { animation: hwnPopIn 3.6s cubic-bezier(.2,.9,.2,1) infinite; }
.brandingAfter > *:nth-child(2) { animation-delay: .28s; }
.brandingAfter > *:nth-child(3) { animation-delay: .56s; }

/* ⚠️統計の棒は実物と同じく下から生やす。 */
.recordStats > b > u { transform-origin: center bottom; animation: hwnRise .54s cubic-bezier(.2,.9,.2,1) infinite alternate; animation-duration: 3s; }
.recordStats > b:nth-child(2) > u { animation-delay: .12s; }
.recordStats > b:nth-child(3) > u { animation-delay: .24s; }
.recordStats > b:nth-child(4) > u { animation-delay: .36s; }
.recordRows > span > u { transform-origin: left center; animation: hwnGrowBar 3.4s cubic-bezier(.2,.9,.2,1) infinite alternate; }
.recordRows > span:nth-child(2) > u { animation-delay: .18s; }
.recordRows > span:nth-child(3) > u { animation-delay: .36s; }

.visibilitySheet > span[data-active="true"] { animation: hwnSoftPulse 2.8s ease-in-out infinite; }
.visibilitySave { animation: hwnPopIn 2.8s cubic-bezier(.2,.9,.2,1) infinite; animation-delay: .5s; }

.cordFixNote { animation: hwnSoftPulse 3.2s ease-in-out infinite; }
.cordFixGauge { animation: hwnArc 6s linear infinite; }
.cordFixPopup { animation: hwnEnter 3.2s cubic-bezier(.2,.9,.2,1) infinite; }

.badgeChips > em { animation: hwnPopIn 3.4s cubic-bezier(.2,.9,.2,1) infinite; }
.badgeChips > em:last-child { animation-delay: .3s; }
.badgeAvatar { animation: hwnSoftPulse 4s ease-in-out infinite; }

.muteChips > em[data-hidden="true"] { animation: hwnFadeCycle 3.6s ease-in-out infinite; }
.muteChips > em:first-child { animation: hwnSoftPulse 3.6s ease-in-out infinite; }

.cardShine { animation: hwnShineSweep 3.6s ease-in-out infinite; }
@keyframes hwnCardTilt { 0%, 100% { transform: rotate(-7deg); } 50% { transform: rotate(-3.5deg); } }
.cardTilt { animation: hwnCardTilt 4.4s ease-in-out infinite; }
.cardDeco { animation: hwnSoftPulse 3s ease-in-out infinite; }

.homeNav { animation: hwnSoftPulse 2.6s ease-in-out infinite; }
.homeKeep { animation: hwnSoftPulse 2.6s ease-in-out infinite; animation-delay: .3s; }

@keyframes hwnDragMove { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-26px); } }
.studioSide > span[data-dragging="true"] { animation: hwnDragMove 3.2s cubic-bezier(.2,.9,.2,1) infinite; }
.studioSide > span[data-drop="true"] { animation: hwnSoftPulse 3.2s ease-in-out infinite; }

.mobilePicker > i { animation: hwnPopIn 3.2s cubic-bezier(.2,.9,.2,1) infinite; }
.mobilePicker > i:nth-child(2) { animation-delay: .16s; }
.mobilePicker > i:nth-child(3) { animation-delay: .32s; }
.mobileTouch { animation: hwnRipple 2.4s ease-out infinite; }

/* ===== HATAlyze: 実物の内訳(ラベル+棒+件数)と時間帯の並びを写す ===== */
.hatalyzeMock { height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 9px; padding: 12px 14px; background: #eef1fb; }
.hatalyzeAxes { display: flex; flex-direction: column; gap: 5px; }
.hatalyzeAxes > span { display: flex; align-items: center; gap: 7px; }
.hatalyzeAxes > span > em { width: 26px; height: 5px; border-radius: 999px; background: #b9c2e4; flex: none; }
.hatalyzeAxes > span > i { flex: 1; height: 7px; border-radius: 999px; background: #dbe0f4; overflow: hidden; }
.hatalyzeAxes > span > i > b { display: block; height: 100%; border-radius: inherit; background: #4a63c8; transform-origin: left center; }
.hatalyzeAxes > span:nth-child(1) > i > b { width: 88%; }
.hatalyzeAxes > span:nth-child(2) > i > b { width: 66%; }
.hatalyzeAxes > span:nth-child(3) > i > b { width: 47%; }
.hatalyzeAxes > span:nth-child(4) > i > b { width: 34%; background: #8f9ace; }
.hatalyzeAxes > span:nth-child(5) > i > b { width: 24%; background: #8f9ace; }
.hatalyzeAxes > span:nth-child(6) > i > b { width: 14%; background: #8f9ace; }
.hatalyzeAxes > span > i > b { animation: hwnGrowBar .54s cubic-bezier(.2,.9,.2,1) infinite alternate; animation-duration: 3.2s; }
.hatalyzeAxes > span:nth-child(2) > i > b { animation-delay: .08s; }
.hatalyzeAxes > span:nth-child(3) > i > b { animation-delay: .16s; }
.hatalyzeAxes > span:nth-child(4) > i > b { animation-delay: .24s; }
.hatalyzeAxes > span:nth-child(5) > i > b { animation-delay: .32s; }
.hatalyzeAxes > span:nth-child(6) > i > b { animation-delay: .4s; }
/* ⚠️実物の時間帯グリッドと同じ24本。下端から立ち上がる。 */
.hatalyzeHours { display: grid; grid-template-columns: repeat(24, 1fr); gap: 1px; align-items: end; height: 26px; }
.hatalyzeHours > u { display: block; border-radius: 1px 1px 0 0; background: #6f83d6; transform-origin: center bottom; animation: hwnHeat .34s cubic-bezier(.2,.9,.2,1) both; }
.hatalyzeHours > u:nth-child(3n) { height: 40%; background: #9aa6dd; }
.hatalyzeHours > u:nth-child(3n+1) { height: 72%; }
.hatalyzeHours > u:nth-child(3n+2) { height: 24%; background: #b6bfe6; }
.hatalyzeHours > u:nth-child(1) { animation-delay: 0s; } .hatalyzeHours > u:nth-child(2) { animation-delay: .03s; }
.hatalyzeHours > u:nth-child(3) { animation-delay: .06s; } .hatalyzeHours > u:nth-child(4) { animation-delay: .09s; }
.hatalyzeHours > u:nth-child(5) { animation-delay: .12s; } .hatalyzeHours > u:nth-child(6) { animation-delay: .15s; }
.hatalyzeHours > u:nth-child(7) { animation-delay: .18s; } .hatalyzeHours > u:nth-child(8) { animation-delay: .21s; }
.hatalyzeHours > u:nth-child(n+9) { animation-delay: .24s; }

/* ===== ハタキュ: 木枠+コルク+画鋲留めの紙+落ち葉。動きは実物と同じ値 ===== */
.hatakyuMock { height: 100%; display: grid; place-content: stretch; padding: 10px; background: linear-gradient(160deg, #8a6440, #6b4a2f); }
.hatakyuBoard { position: relative; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 6px; overflow: hidden; background-color: #c9975f;
	background-image: radial-gradient(rgba(120, 80, 40, .42) 1.2px, transparent 1.3px), radial-gradient(rgba(255, 225, 180, .28) 1px, transparent 1.1px);
	background-size: 9px 9px, 15px 15px; background-position: 0 0, 5px 7px; box-shadow: inset 0 0 22px rgba(60, 40, 20, .45); }
.hatakyuPaper { position: relative; width: 26%; height: 66%; padding: 9px 5px 0; border-radius: 1px; background: #fdf6e6; transform: rotate(var(--r, 0deg)); transform-origin: 50% 4px; box-shadow: 0 5px 10px -5px rgba(40, 24, 8, .75);
	animation: hwnPaperSway 6.5s ease-in-out infinite, hwnPaperGust 9s cubic-bezier(.33,.1,.24,.98) infinite;
	animation-delay: calc(var(--i, 0) * .42s), calc(var(--i, 0) * 45ms); }
.hatakyuPaper > i { position: absolute; top: -4px; left: 50%; width: 9px; height: 9px; margin-left: -4.5px; border-radius: 50%; background: radial-gradient(circle at 32% 28%, #fff 10%, #e0483c 50%, #8c2118); box-shadow: 0 2px 3px rgba(0, 0, 0, .4); }
.hatakyuPaper > u { display: block; height: 4px; margin: 0 auto 4px; border-radius: 999px; background: #ddcba6; }
.hatakyuPaper > u:first-of-type { width: 82%; }
.hatakyuPaper > u:last-of-type { width: 54%; }
.hatakyuLeaf { position: absolute; top: 26%; left: -12px; width: 8px; height: 8px; border-radius: 60% 10% 60% 10%; background: #e8c07a; opacity: 0; animation: hwnLeafDrift 9s ease-out infinite; }
.hatakyuLeaf:last-child { top: 62%; width: 6px; height: 6px; background: #cf9a58; animation-delay: .25s; }

/* ===== Hatadyの書き出し: 種別と形式を選んでファイルになる ===== */
.exportMock { height: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 12px; background: #eef6f1; }
.exportPanel { display: flex; flex-direction: column; gap: 6px; }
.exportRow { display: flex; gap: 5px; }
.exportRow > span { min-width: 34px; padding: 4px 7px; border-radius: 6px; display: grid; place-content: center; font-size: 10px; font-weight: 700; color: #4a7c62; background: #fff; border: 1px solid #cfe3d8; }
.exportRow > span[data-on="true"] { color: #fff; background: #2f7a58; border-color: #2f7a58; }
.exportRow > span > i { font-size: 13px; }
.exportArrow { font-size: 15px; color: #7fa894; animation: hwnArrowNudge 2.2s ease-in-out infinite; }
.exportFile { width: 46px; padding: 8px 6px; border-radius: 6px; display: flex; flex-direction: column; align-items: center; gap: 4px; background: #fff; border: 1px solid #cfe3d8; box-shadow: 0 4px 10px rgba(50, 100, 75, .12); animation: hwnEnter 3.2s cubic-bezier(.2,.9,.2,1) infinite; }
.exportFile > i { font-size: 16px; color: #2f7a58; }
.exportFile > u { display: block; width: 70%; height: 3px; border-radius: 999px; background: #d5e7dd; }
.exportRow > span[data-on="true"] { animation: hwnSoftPulse 3.2s ease-in-out infinite; }

/* ===== 折りたたみ: 開いた本体の中で右カラムが立ち上がる ===== */
.foldMock { height: 100%; display: grid; place-content: center; background: #eef2f7; }
.foldDevice { position: relative; width: 150px; height: 96px; display: flex; gap: 6px; padding: 8px; border-radius: 10px; background: #fff; box-shadow: 0 6px 16px rgba(60, 80, 130, .18); }
.foldHinge { position: absolute; top: 8px; bottom: 8px; left: 50%; width: 1px; background: repeating-linear-gradient(#c9d5e6 0 3px, transparent 3px 6px); }
.foldMain { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.foldMain > u { display: block; height: 7px; border-radius: 999px; background: #dbe3ee; }
.foldMain > u:last-child { width: 62%; }
.foldSide { width: 42px; display: flex; flex-direction: column; gap: 6px; padding: 5px; border-radius: 6px; background: #eaf0f8; animation: hwnEnter 4s cubic-bezier(.2,.9,.2,1) infinite; }
.foldSide > em { display: block; height: 14px; border-radius: 4px; background: #c2d1e5; }
.foldSide > em:last-child { height: 22px; }

/* ===== UIの動き: 実物のポップアップの構成 + 読込中の弧 ===== */
.popupMock { position: relative; height: 100%; display: grid; place-content: center; background: #f6eef4; }
.popupCard { position: relative; width: 132px; padding: 0 0 10px; border-radius: 10px; overflow: hidden; background: #fff; box-shadow: 0 6px 16px rgba(120, 80, 120, .18); animation: hwnEnter 3.6s cubic-bezier(.2,.9,.2,1) infinite; }
.popupBanner { height: 34px; background: linear-gradient(120deg, #c98bb4, #8b7ec9); }
.popupAvatar { position: absolute; top: 20px; left: 10px; width: 26px; height: 26px; border-radius: 50%; border: 2px solid #fff; background: #d9c3d6; animation: hwnPopIn 3.6s cubic-bezier(.2,.9,.2,1) infinite; animation-delay: .12s; }
.popupLines { margin: 10px 10px 0 42px; display: flex; flex-direction: column; gap: 4px; }
.popupLines > u { display: block; height: 5px; border-radius: 999px; background: #e3d2e0; animation: hwnEnter 3.6s cubic-bezier(.2,.9,.2,1) infinite; }
.popupLines > u:first-child { width: 58%; background: #b98cad; }
.popupLines > u:last-child { animation-delay: .16s; }
.popupChips { display: flex; gap: 4px; margin: 8px 10px 0; }
.popupChips > span { flex: 1; height: 11px; border-radius: 4px; background: #ecdeea; animation: hwnEnter 3.6s cubic-bezier(.2,.9,.2,1) infinite; }
.popupChips > span:nth-child(2) { animation-delay: .12s; }
.popupChips > span:nth-child(3) { animation-delay: .24s; }
/* ⚠️実物の送信中の弧と同じ .72s linear。 */
.popupArc { position: absolute; right: 16px; bottom: 14px; width: 14px; height: 14px; border: 2px solid rgba(155, 110, 150, .3); border-top-color: #9b6e96; border-radius: 50%; box-sizing: border-box; animation: hwnArc .72s linear infinite; }

/* ===== 言語: 日付の曜日が英語から切り替わる ===== */
.langMock { height: 100%; display: grid; place-content: center; background: #fdf3e7; }
.langCard { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; background: #fff; box-shadow: 0 5px 14px rgba(150, 110, 60, .16); }
.langDate { font-size: 15px; font-weight: 700; color: #7a4f1e; font-variant-numeric: tabular-nums; }
.langSwap { position: relative; display: grid; min-width: 58px; height: 20px; place-items: center; }
.langSwap > b { grid-area: 1 / 1; font-size: 13px; font-weight: 700; }
.langBefore { color: #c8a677; animation: hwnFadeCycle 3.4s ease-in-out infinite; }
.langAfter { color: #7a4f1e; opacity: 0; animation: hwnLangIn 3.4s cubic-bezier(.2,.9,.2,1) infinite; }
@keyframes hwnLangIn { 0%, 45% { opacity: 0; transform: translateY(5px); } 60%, 92% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateY(5px); } }

/* ===== 外部アカウント連携: 接続先の一覧に1件増える ===== */
.ddoskeyMock { height: 100%; display: grid; place-content: center; background: #edf6f2; }
.ddoskeyPanel { width: 152px; padding: 8px 10px 10px; border-radius: 10px; background: #fff; box-shadow: 0 6px 16px rgba(40, 110, 90, .16); animation: hwnEnter 3.8s cubic-bezier(.2,.9,.2,1) infinite; }
.ddoskeyHead { display: flex; align-items: center; gap: 6px; padding-bottom: 7px; border-bottom: 1px solid #e0ece7; }
.ddoskeyHead > i { font-size: 12px; color: #2f8f74; animation: hwnSoftPulse 3.2s ease-in-out infinite; }
.ddoskeyHead > u { display: block; flex: 1; height: 5px; border-radius: 999px; background: #d8e9e2; }
.ddoskeyList { display: flex; flex-direction: column; gap: 5px; margin-top: 7px; }
.ddoskeyRow { display: flex; align-items: center; gap: 6px; padding: 4px 6px; border-radius: 6px; background: #f4f9f7; box-sizing: border-box; }
.ddoskeyRow > em { width: 7px; height: 7px; flex: none; border-radius: 50%; background: #bfd8d0; }
.ddoskeyRow > u { display: block; height: 5px; border-radius: 999px; background: #d8e9e2; }
.ddoskeyRow:first-child > u { width: 54%; }
.ddoskeyRow:nth-child(2) > u { width: 72%; }
/* ⚠️増えた1件。既定は見える状態にしておき、動きだけを足す（動きを止めても消えないように）。 */
.ddoskeyNew { background: #e2f4ec; box-shadow: inset 0 0 0 1px #7cc7ac; animation: hwnRowIn 3.8s cubic-bezier(.2,.9,.2,1) infinite; }
.ddoskeyNew > em { background: #2f8f74; }
.ddoskeyHost { font-size: 10px; font-weight: 700; color: #22705a; }
.ddoskeyCheck { margin-left: auto; font-size: 12px; color: #2f8f74; animation: hwnPopIn 3.8s cubic-bezier(.2,.9,.2,1) infinite; animation-delay: .38s; }
@keyframes hwnRowIn { 0%, 20% { opacity: 0; transform: translateX(12px); } 38%, 100% { opacity: 1; transform: none; } }

/* ⚠️動きを減らす設定では全部止める。装飾なので、止めても意味は伝わる。
     ⚠️langAfter は既定で opacity:0 のため、止めるときは見えるように戻す。 */
@media (prefers-reduced-motion: reduce) {
	.preview *, .preview, .item { animation: none !important; }
	.langAfter { opacity: 1 !important; }
	.langBefore { opacity: .35 !important; }
}
</style>
