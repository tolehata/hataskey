<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<div :class="$style.featureMock" data-feature-mock :data-feature="feature" :data-motion="motion" aria-hidden="true" inert>
	<UiSPreview v-if="feature === 'ui-s'"/>
	<FlowerPreview v-else-if="feature === 'flowers'" :motion="motion"/>
	<div v-else-if="feature === 'recipes'" :class="$style.recipeScreen">
		<div :class="$style.recipeFlow"><span :class="$style.flowIntro">紹介する</span><i class="ti ti-arrow-right"></i><span :class="$style.flowCook">作る</span><i class="ti ti-arrow-right"></i><span :class="$style.flowRecord">記録する</span></div>
		<div :class="$style.recipeGrid">
			<div :class="[$style.recipePane, $style.recipeIntro]"><div :class="$style.recipeArt"><div :class="$style.artGlow"></div><div :class="$style.bowl"><span></span><i></i><em></em></div><div :class="$style.recipeLeaf">✦</div></div><div :class="$style.recipeOverview"><small><span :class="$style.brandWord">Hatask</span> レシピ · あたたかい一皿</small><strong>野菜たっぷりのスープ</strong><span><i class="ti ti-users"></i> 2人分 <i class="ti ti-clock"></i> 20分</span></div></div>
			<div :class="[$style.recipePane, $style.recipeCook]"><div :class="$style.recipePaneTitle"><i class="ti ti-chef-hat"></i><strong>材料と作り方</strong><small>2人分</small></div><p><b>材料</b> トマト 1個 · 玉ねぎ ½個 · にんじん ½本</p><div :class="$style.recipeStep"><span>1</span> 野菜を切って鍋で煮る</div><div :class="$style.recipeStep"><span>2</span> 味を整えて、できあがり</div><div :class="$style.timer"><i class="ti ti-hourglass"></i><span>工程タイマー</span><b>03:00</b></div></div>
			<div :class="[$style.recipePane, $style.recipeRecord]"><span :class="$style.recordIcon"><i class="ti ti-check"></i></span><div><small><span :class="$style.brandWord">Hatady</span> 料理記録</small><b>野菜スープを作りました</b><span>今日の一皿を、あとから見返せます</span></div></div>
		</div>
	</div>
</div>
</template>
<script setup lang="ts">
import UiSPreview from './UiSPreview.vue';
import FlowerPreview from './FlowerPreview.vue';
defineProps<{ feature: 'ui-s' | 'recipes' | 'flowers'; motion: boolean }>();
</script>
<style module>
.featureMock { width:100%; max-width:850px; height:322px; margin-inline:auto; overflow:hidden; border:1px solid var(--MI_THEME-divider); border-radius:22px; background:var(--MI_THEME-panel); color:var(--MI_THEME-fg); box-shadow:0 18px 44px color-mix(in srgb, var(--MI_THEME-fg) 8%, transparent); font-family:'Zen Kaku Gothic New',system-ui,sans-serif; font-size:12px; line-height:1.45; }
.featureMock[data-feature='ui-s'] { height:380px; border-radius:4px; }
.featureMock[data-feature='flowers'] { height:auto; border-radius:24px; font-family:'LINE Seed JP',system-ui,sans-serif; }
.featureMock * { box-sizing:border-box; }
.featureMock :global(.ti) { display:inline-grid; place-items:center; width:1.25em; }
.brandWord { font-family:Righteous,sans-serif; font-weight:400; font-synthesis:none; }
.recipeScreen { display:flex; flex-direction:column; height:100%; padding:13px 18px 16px; background:linear-gradient(145deg,color-mix(in srgb,#db9d55 12%,var(--MI_THEME-panel)),var(--MI_THEME-panel) 54%); }
.recipeFlow { display:flex; align-items:center; gap:9px; margin:0 0 10px; color:var(--MI_THEME-fgMuted); font-size:12px; font-weight:700; }
.recipeFlow > span { padding:3px 10px; border-radius:99px; background:var(--MI_THEME-panel); border:1px solid var(--MI_THEME-divider); color:var(--MI_THEME-fg); }
.recipeFlow :global(.ti) { font-size:11px; color:var(--MI_THEME-fgMuted); }
.recipeGrid { display:grid; grid-template-columns:1.05fr 1fr; grid-template-rows:1fr 58px; gap:10px; flex:1; min-height:0; }
.recipePane { min-width:0; border:1px solid var(--MI_THEME-divider); border-radius:14px; background:var(--MI_THEME-panel); overflow:hidden; }
.recipeIntro { grid-row:1 / 3; display:grid; grid-template-rows:1fr auto; }
.recipeArt { position:relative; min-height:0; display:grid; place-items:center; overflow:hidden; background:radial-gradient(circle at 50% 44%,#f8dea6,#e7a46b 58%,#bf7755); }
.artGlow { position:absolute; width:190px; height:190px; border:2px solid #fff5; border-radius:50%; box-shadow:0 0 0 20px #fff2,0 0 0 42px #fff1; }
.bowl { position:relative; width:155px; height:122px; border-radius:50%; background:#fff8eb; box-shadow:0 8px 16px #653b3255,inset 0 0 0 10px #fdfaf4; transform:rotate(-10deg); }
.bowl::before { content:''; position:absolute; inset:16px; border-radius:50%; background:radial-gradient(circle at 38% 34%,#f9ce6c,#d57743 65%,#a95331); }
.bowl span,.bowl i,.bowl em { position:absolute; z-index:1; width:20px; height:12px; border-radius:80% 20% 80% 20%; background:#629756; box-shadow:17px 22px 0 #e9c46b,-24px 36px 0 #71a963; }
.bowl span { top:45px; left:45px; transform:rotate(24deg); }.bowl i { top:30px; left:92px; transform:rotate(75deg); }.bowl em { top:67px; left:88px; transform:rotate(-45deg); }
.recipeLeaf { position:absolute; right:22px; top:16px; color:#fff6; font-size:34px; }
.recipeOverview { display:grid; gap:2px; padding:8px 15px; }
.recipeOverview small { color:var(--MI_THEME-accent); font-size:10px; font-weight:700; }
.recipeOverview strong { font-size:17px; }
.recipeOverview > span { color:var(--MI_THEME-fgMuted); font-size:11px; }
.recipeCook { padding:10px 13px; }
.recipePaneTitle { display:flex; align-items:center; gap:7px; margin-bottom:7px; color:var(--MI_THEME-accent); }
.recipePaneTitle strong { font-size:13px; }.recipePaneTitle small { margin-left:auto; font-size:10px; color:var(--MI_THEME-fgMuted); }
.recipeCook p { margin:0 0 7px; font-size:11px; }.recipeCook p b { margin-right:7px; }
.recipeStep { margin:5px 0; font-size:11px; }.recipeStep span { display:inline-grid; place-items:center; width:17px; height:17px; margin-right:5px; border-radius:50%; background:var(--MI_THEME-accentedBg); color:var(--MI_THEME-accent); font-weight:700; }
.timer { display:flex; align-items:center; gap:7px; margin-top:8px; padding:5px 8px; border-radius:8px; background:var(--MI_THEME-accentedBg); color:var(--MI_THEME-accent); font-size:11px; }.timer b { margin-left:auto; font:700 14px/1.2 monospace; }
.recipeRecord { display:flex; align-items:center; gap:9px; padding:7px 11px; }.recordIcon { display:grid; place-items:center; flex:none; width:26px; height:26px; border-radius:50%; background:#5c9875; color:#fff; }.recipeRecord > div { display:grid; gap:1px; }.recipeRecord small { color:var(--MI_THEME-accent); font-size:10px; }.recipeRecord b { font-size:11px; }.recipeRecord div span { color:var(--MI_THEME-fgMuted); font-size:10px; }
/* Every word and step is readable before and after the finite entrance. */
.featureMock[data-motion='true'] .flowIntro,.featureMock[data-motion='true'] .flowCook,.featureMock[data-motion='true'] .flowRecord { animation:stepFocus 580ms ease-out both; }
.featureMock[data-motion='true'] .flowCook { animation-delay:520ms; }.featureMock[data-motion='true'] .flowRecord { animation-delay:1040ms; }
.featureMock[data-motion='true'] .recipeIntro { animation:panelFocus 650ms ease-out both; }.featureMock[data-motion='true'] .recipeCook { animation:panelFocus 650ms 520ms ease-out both; }.featureMock[data-motion='true'] .recipeRecord { animation:panelFocus 650ms 1040ms ease-out both; }
@keyframes stepFocus { 0% { transform:translateY(5px); opacity:.45; } 100% { transform:none; opacity:1; } }
@keyframes panelFocus { 0% { box-shadow:0 0 0 0 var(--MI_THEME-accent); } 45% { box-shadow:0 0 0 3px color-mix(in srgb,var(--MI_THEME-accent) 45%,transparent); } 100% { box-shadow:0 0 0 0 var(--MI_THEME-accent); } }
@container release (max-width:620px) {
 .featureMock[data-feature='ui-s'] { height:410px; border-radius:4px; }
 .featureMock[data-feature="recipes"] { height:auto; min-height:452px; } .recipeScreen { padding:12px; height:auto; min-height:452px; }.recipeFlow { gap:4px; justify-content:center; margin-bottom:7px; font-size:11px; }.recipeFlow > span { padding:3px 5px; }
 .recipeGrid { display:grid; grid-template-columns:1fr; grid-template-rows:auto auto auto; gap:9px; flex:none; }
 .recipeIntro { grid-row:auto; display:grid; grid-template-columns:1fr; grid-template-rows:140px auto; }.recipeArt { min-height:140px; }.artGlow { width:80px; height:80px; }.bowl { transform:scale(.55) rotate(-10deg); }.recipeLeaf { display:none; }.recipeOverview { align-content:center; gap:3px; padding:10px 12px; }.recipeOverview strong { font-size:14px; }.recipeOverview small,.recipeOverview > span { font-size:12px; }
 .recipeCook { padding:11px 12px; }.recipePaneTitle { margin-bottom:7px; }.recipeCook p { margin-bottom:7px; font-size:12px; }.recipeStep { margin:5px 0; font-size:12px; }.timer { margin-top:9px; padding:6px 8px; font-size:12px; }
 .recipeRecord { padding:8px 11px; }.recordIcon { width:28px; height:28px; }.recipeRecord small,.recipeRecord b,.recipeRecord div span { font-size:12px; }
}
@media (prefers-reduced-motion:reduce) { .featureMock * { animation:none !important; } }
</style>
