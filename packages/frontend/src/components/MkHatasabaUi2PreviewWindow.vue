<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only

Read-only preview for the permanent Hataskey UI settings surface. The editor
is deliberately supplied by its owner, so this window never creates another
draft or writes a setting while it is open.
-->

<template>
<!-- 旗鯖fork: ⚠️MkModal を素の <div> で包まないこと。
     包むと器が画面いっぱいに広がらず、中身が画面外の下へ落ちる。 -->
<!-- 旗鯖fork: ⚠️必ず body へ逃がすこと。
     設定シェル(.scope の container-type)と _pageContainer(contain) が
     position: fixed の基準を作るため、ここに置いたままだと
     画面中央ではなく「その箱の中」に配置され、左寄り＋余白だらけになる。
     ⚠️preferType は dialog を明示。auto だと PC で
     「押したボタンの近くに出すポップアップ型」が選ばれる。 -->
<Teleport to="body">
<MkModal ref="dialog" preferType="dialog" :zPriority="'middle'" @click="close" @closed="emit('closed')">
	<div :class="$style.sheet" :data-motion-enabled="motionEnabled ? 'true' : 'false'" @click.stop>
			<header :class="$style.sheetHeader">
				<h2><i class="ti ti-eye" aria-hidden="true"></i><span v-if="previewTitle.before">{{ previewTitle.before }}</span><span v-if="previewTitle.brand" class="settingsBrand">{{ previewTitle.brand }}</span><span>{{ previewTitle.after }}</span></h2>
				<button type="button" :class="$style.sheetClose" :aria-label="copy.ui2.preview.close" @click="close"><i class="ti ti-x" aria-hidden="true"></i></button>
			</header>
		<main :class="$style.preview" :aria-label="copy.ui2.preview.dialogLabel">
			<p :class="$style.liveNotice" role="status"><i class="ti ti-sparkles" aria-hidden="true"></i>{{ copy.ui2.preview.liveNotice }}</p>
			<section :class="$style.appPreview" :data-glass="editor.draft.editedGlassUi ? 'on' : 'off'" :data-bubble="editor.draft.editedGlassUiBubble ? 'on' : 'off'" :data-deck="deckPreview ? 'on' : 'off'" :style="{ '--preview-opacity': `${editor.draft.editedOpacity}%` }" :aria-label="copy.ui2.preview.appPreviewLabel">
				<header :class="$style.appHeader">
					<strong><i class="ti ti-sparkles" aria-hidden="true"></i><span class="settingsBrand">Hataskey</span></strong>
					<nav :class="$style.topNav" :aria-label="copy.ui2.preview.timelineTabsLabel">
						<span v-for="item in previewTopNav" :key="item.id"><i :class="item.icon" aria-hidden="true"></i>{{ editor.navDisplayLabel(item) }}</span>
						<span v-if="editor.draft.editedShowTrendingTab"><i class="ti ti-flame" aria-hidden="true"></i>{{ copy.ui2.preview.trend }}</span>
					</nav>
				</header>
				<div :class="$style.previewBody">
					<aside :class="$style.sideNav" :aria-label="copy.ui2.preview.sideMenuLabel">
						<span><i class="ti ti-home" aria-hidden="true"></i>{{ copy.ui2.preview.home }}</span>
						<span><i class="ti ti-bell" aria-hidden="true"></i>{{ copy.ui2.preview.notifications }}</span>
						<span><i class="ti ti-layout-dashboard" aria-hidden="true"></i>{{ copy.ui2.preview.sideStudio }}</span>
					</aside>
					<section :class="$style.timeline" :aria-label="copy.ui2.preview.notePreviewLabel">
						<header :class="$style.timelineHeader"><span>{{ copy.ui2.preview.home }}</span><span :class="$style.modeBadge"><i :class="deckPreview ? 'ti ti-columns' : 'ti ti-layout-navbar'" aria-hidden="true"></i>{{ deckPreview ? copy.ui2.preview.deckMode : copy.ui2.preview.standardMode }}</span></header>
						<article :class="$style.note">
							<div :class="$style.noteAvatar" aria-hidden="true"><i class="ti ti-flag-3"></i></div>
						<div :class="$style.noteContent"><strong>{{ copy.ui2.preview.sampleUserName }}</strong><span>@hataike</span><p>{{ copy.ui2.preview.sampleNoteOne }}</p><small><i class="ti ti-message-circle" aria-hidden="true"></i> 2 <i class="ti ti-repeat" aria-hidden="true"></i> 1 <i class="ti ti-heart" aria-hidden="true"></i> 7</small></div>
						</article>
						<article :class="[$style.note, $style.secondaryNote]">
							<div :class="$style.noteAvatar" aria-hidden="true"><i class="ti ti-cloud"></i></div>
							<div :class="$style.noteContent"><strong><span class="settingsBrand">Hataskey</span></strong><span>{{ copy.ui2.preview.timeline }}</span><p>{{ copy.ui2.preview.sampleNoteTwo }}</p></div>
						</article>
					</section>
				</div>
			</section>
			<footer :class="$style.footer"><span>{{ copy.ui2.preview.footerNotice }}</span><button type="button" @click="close"><i class="ti ti-x" aria-hidden="true"></i>{{ copy.ui2.preview.close }}</button></footer>
	</main>
	</div>
</MkModal>
</Teleport>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import type { HatasabaUi2Draft } from '@/composables/use-hatasaba-ui2-draft.js';
import MkModal from '@/components/MkModal.vue';
import { i18n } from '@/i18n.js';

const props = withDefaults(defineProps<{
	editor: HatasabaUi2Draft;
	motionEnabled?: boolean;
}>(), {
	motionEnabled: true,
});
const emit = defineEmits<{ closed: [] }>();
const dialog = useTemplateRef('dialog');
const copy = i18n.ts._hata._settingsRedesign;
const previewBrand = 'Hataskey UI';
const previewTitle = computed(() => {
	const title = copy.ui2.preview.title;
	const index = title.indexOf(previewBrand);
	if (index < 0) return { before: '', brand: '', after: title };
	return {
		before: title.slice(0, index),
		brand: previewBrand,
		after: title.slice(index + previewBrand.length),
	};
});
const deckPreview = computed(() => props.editor.draft.editedTopNavMode || props.editor.draft.editedDeckIgnoreWidth);
const previewTopNav = computed(() => {
	const visible = props.editor.draft.editedTopNav.filter(item => item.visible !== false).slice(0, 4);
	return visible.length > 0 ? visible : [
		{ id: 'home', icon: 'ti ti-home', label: copy.ui2.preview.home },
		{ id: 'local', icon: 'ti ti-planet', label: copy.ui2.preview.local },
	];
});

function close(): void {
	dialog.value?.close();
}
</script>

<style lang="scss" module>
.sheet {
	/* ⚠️モバイルで画面からはみ出さないこと。幅も高さも画面を上限にする。 */
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	inline-size: min(680px, calc(100dvw - 24px));
	/* ⚠️高さは中身なり。上限だけ画面に合わせる。
	   固定の高さを与えると、中身が短いときに下へ大きな空白ができる。 */
	/* ⚠️高さは中身なり。上限だけ画面に合わせる。
	   ⚠️align-self を付けないと、器の flex に引き伸ばされて
	   中身の下に大きな余白ができる。 */
	block-size: auto;
	align-self: center;
	/* ⚠️器は flex(row) で justify-content が normal(左詰め)。
	   これが無いと画面の左端に寄る。中央へ寄せるための指定。 */
	margin-inline: auto;
	max-block-size: calc(100dvh - 24px);
	border-radius: var(--MI-radius);
	/* 旗鯖fork: ⚠️必ず不透明にすること。透けると背景の設定画面が見えて読みづらい。 */
	background: var(--MI_THEME-panel);
	/* ⚠️角丸からはみ出した子の背景を切る。ここが無いと角だけ下地が覗く。 */
	overflow: hidden;
	box-shadow: 0 18px 48px color-mix(in srgb, var(--MI_THEME-fg) 22%, transparent);
	container-type: inline-size;
}
.sheetHeader {
	position: sticky;
	inset-block-start: 0;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding: 12px 14px;
	border-block-end: 1px solid var(--MI_THEME-divider);
	background: var(--MI_THEME-panel);
}
.sheetHeader h2 { display: flex; align-items: center; gap: .4em; margin: 0; font-size: 1rem; }
.sheetClose {
	display: grid;
	width: 40px;
	height: 40px;
	flex: none;
	place-items: center;
	/* ⚠️ボタン既定の枠と字面を打ち消す。 */
	appearance: none;
	border: 0;
	border-radius: 50%;
	background: transparent;
	color: var(--MI_THEME-fg);
	cursor: pointer;
	font: inherit;
	font-size: 1.1rem;
}
.sheetClose:hover { background: var(--MI_THEME-buttonHoverBg); }
.sheet[data-motion-enabled='false'] :deep(*) { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
/* 旗鯖fork: ⚠️下地はここで敷く。透明だと背景の設定画面が透けて読みづらい。
   ⚠️align-content: start を付けないと、中身が短いときに
   grid が余った高さを配り、最後の行の下に大きな空白が残る。 */
.preview { display: grid; align-content: start; gap: 12px; padding: 16px 16px 14px; background: var(--MI_THEME-panel); color: var(--MI_THEME-fg); }
.liveNotice { display: flex; align-items: flex-start; gap: 7px; margin: 0; padding: 10px 12px; border: 1px solid color-mix(in srgb, var(--MI_THEME-accent) 30%, var(--MI_THEME-divider)); border-radius: 14px; background: color-mix(in srgb, var(--MI_THEME-accentedBg) 62%, var(--MI_THEME-panel)); font-size: .8rem; line-height: 1.55; }
.liveNotice > i { color: var(--MI_THEME-accent); font-size: 1rem; }
.appPreview { overflow: hidden; border: 1px solid color-mix(in srgb, var(--MI_THEME-divider) 72%, transparent); border-radius: 20px; background: var(--MI_THEME-panel); box-shadow: 0 10px 28px color-mix(in srgb, var(--MI_THEME-shadow) 16%, transparent); }
.appPreview[data-glass='on'] { background: color-mix(in srgb, var(--MI_THEME-panel) var(--preview-opacity), var(--MI_THEME-bg)); backdrop-filter: var(--MI-blur, blur(18px)); }
.appHeader { display: flex; min-height: 52px; align-items: center; gap: 14px; border-bottom: 1px solid color-mix(in srgb, var(--MI_THEME-divider) 72%, transparent); padding: 8px 14px; background: color-mix(in srgb, var(--MI_THEME-panel) 86%, transparent); }
.appHeader strong { display: inline-flex; align-items: center; gap: 6px; color: var(--MI_THEME-accent); font-size: .88rem; }
.topNav { display: flex; min-width: 0; flex: 1; align-items: center; gap: 5px; overflow: hidden; }
.topNav span, .modeBadge { display: inline-flex; min-height: 30px; align-items: center; gap: 4px; overflow: hidden; border-radius: 999px; padding: 5px 9px; background: color-mix(in srgb, var(--MI_THEME-bg) 58%, var(--MI_THEME-panel)); color: var(--MI_THEME-fg); font-size: .68rem; line-height: 1; text-overflow: ellipsis; white-space: nowrap; }
.topNav span:first-child { background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); }
.previewBody { display: grid; grid-template-columns: 132px minmax(0, 1fr); min-height: 310px; }
.sideNav { display: grid; align-content: start; gap: 5px; border-right: 1px solid color-mix(in srgb, var(--MI_THEME-divider) 72%, transparent); padding: 12px 9px; background: color-mix(in srgb, var(--MI_THEME-bg) 52%, transparent); }
.sideNav span { display: flex; min-height: 38px; align-items: center; gap: 7px; border-radius: 12px; padding: 7px 9px; font-size: .72rem; line-height: 1.35; }
.sideNav span:first-child { background: color-mix(in srgb, var(--MI_THEME-accent) 16%, transparent); color: var(--MI_THEME-accent); font-weight: 800; }
.timeline { min-width: 0; padding: 12px; }
.timelineHeader { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; font-size: .84rem; font-weight: 800; }
.modeBadge { background: color-mix(in srgb, var(--MI_THEME-accentedBg) 84%, var(--MI_THEME-panel)); color: var(--MI_THEME-accent); font-weight: 700; }
.note { display: flex; gap: 10px; margin-top: 8px; border: 1px solid color-mix(in srgb, var(--MI_THEME-divider) 68%, transparent); border-radius: 16px; padding: 12px; background: color-mix(in srgb, var(--MI_THEME-panel) 90%, transparent); }
.appPreview[data-bubble='on'] .noteContent { border-radius: 14px; padding: 8px 10px; background: color-mix(in srgb, var(--MI_THEME-accentedBg) 40%, var(--MI_THEME-panel)); }
.appPreview[data-deck='on'] .previewBody { grid-template-columns: 92px minmax(0, 1fr); }
.appPreview[data-deck='on'] .sideNav span { justify-content: center; padding-inline: 5px; font-size: 0; }
.appPreview[data-deck='on'] .sideNav i { font-size: 1rem; }
.noteAvatar { display: grid; width: 32px; height: 32px; flex: none; place-items: center; border-radius: 50%; background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); }
.secondaryNote .noteAvatar { background: color-mix(in srgb, var(--MI_THEME-fg) 24%, var(--MI_THEME-panel)); color: var(--MI_THEME-fg); }
.noteContent { min-width: 0; flex: 1; }
.noteContent strong, .noteContent span { display: inline-block; }
.noteContent strong { margin-right: 6px; font-size: .76rem; }
.noteContent span, .noteContent small { color: var(--MI_THEME-fgTransparentWeak); font-size: .66rem; }
.noteContent p { margin: 6px 0 8px; font-size: .75rem; line-height: 1.6; }
.noteContent small { display: flex; align-items: center; gap: 3px; }
.footer { display: flex; min-height: 44px; align-items: center; justify-content: space-between; gap: 10px; color: var(--MI_THEME-fgTransparentWeak); font-size: .75rem; }
.footer button { display: inline-flex; min-block-size: 44px; align-items: center; gap: 6px; border: 1px solid var(--MI_THEME-divider); border-radius: 999px; padding: 8px 14px; background: var(--MI_THEME-panel); color: var(--MI_THEME-fg); cursor: pointer; font: inherit; font-size: .8rem; font-weight: 700; }
.footer button:hover { border-color: var(--MI_THEME-accent); background: var(--MI_THEME-accentedBg); }
.footer button:focus-visible { outline: 3px solid color-mix(in srgb, var(--MI_THEME-accent) 54%, transparent); outline-offset: 3px; }
@container (max-width: 500px) { .preview { padding: 12px; } .appHeader { align-items: flex-start; flex-direction: column; } .topNav { width: 100%; } .previewBody, .appPreview[data-deck='on'] .previewBody { grid-template-columns: 1fr; } .sideNav, .appPreview[data-deck='on'] .sideNav { display: flex; border-right: 0; border-bottom: 1px solid color-mix(in srgb, var(--MI_THEME-divider) 72%, transparent); overflow: hidden; } .sideNav span, .appPreview[data-deck='on'] .sideNav span { flex: 1; justify-content: center; font-size: .66rem; } .footer { align-items: stretch; flex-direction: column; } .footer button { justify-content: center; } }
@media (prefers-reduced-motion: reduce) { .sheet :deep(*) { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
</style>
