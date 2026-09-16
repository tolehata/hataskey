<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<div :class="$style.updatePreview" data-preview-root :data-preview="kind" aria-hidden="true" inert>
	<div v-if="kind === 'vote-setting'" :class="$style.miniSettings">
		<div :class="$style.miniEyebrow"><i class="ti ti-adjustments"></i> タイムライン</div>
		<div :class="$style.miniSettingRow"><strong>LTLの絵文字投票を表示</strong><span :class="$style.miniSwitch"><i></i></span></div>
		<div :class="$style.miniChoicePills"><span>Hataskey UI</span><span>デッキUI</span></div>
	</div>
	<div v-else-if="kind === 'environment'" :class="$style.miniSettings">
		<div :class="$style.miniEyebrow"><i class="ti ti-message-report"></i> 使用環境 <small>任意</small></div>
		<div :class="$style.miniInput"><span>使用端末</span><strong>iPhone</strong></div>
		<div :class="$style.miniInput"><span>OS・バージョン</span><strong>iOS</strong></div>
		<div :class="$style.miniInput"><span>ブラウザ・開き方</span><strong>ホーム画面から起動</strong></div>
	</div>
	<div v-else-if="kind === 'viewport'" :class="$style.miniPhone">
		<div :class="$style.miniPhoneTop"><span>9:41</span><i class="ti ti-battery-3"></i></div>
		<div :class="$style.miniNavbar"><i class="ti ti-menu-2"></i><strong>ホーム</strong><i class="ti ti-search"></i></div>
		<div :class="$style.miniNote"><span :class="$style.miniAvatar"><i class="ti ti-user"></i></span><div><b>今日のひとこと</b><span :class="$style.miniLine"></span><span :class="$style.miniLine" data-short></span></div></div>
		<div :class="$style.miniNavBottom"><i class="ti ti-home"></i><i class="ti ti-bell"></i><i class="ti ti-plus"></i></div>
	</div>
	<div v-else-if="kind === 'intro-back'" :class="[$style.miniSettings, $style.miniGuide]">
		<div :class="$style.miniGuideHead"><span :class="$style.miniRound"><i class="ti ti-arrow-left"></i></span><strong>HataIntro</strong></div>
		<b>気になる画面から、ひとつずつ</b>
		<div :class="$style.miniSearch"><i class="ti ti-search"></i> 知りたいことから探す</div>
	</div>
	<div v-else-if="kind === 'deck'" :class="$style.miniDeck">
		<div :class="$style.miniNavbar"><i class="ti ti-apps"></i><strong>ウィジェット</strong><i class="ti ti-dots"></i></div>
		<div :class="$style.miniWidget"><div><i class="ti ti-note"></i><strong>メモ</strong></div><span :class="$style.miniLine"></span><span :class="$style.miniLine" data-short></span></div>
		<div :class="[$style.miniWidget, $style.miniWidgetSmall]"><i class="ti ti-cloud-sun"></i><strong>今日の天気</strong><span>22°</span></div>
	</div>
</div>
</template>

<script setup lang="ts">
import type { HataWhatsNewCard } from '@/utility/hata-whats-new.js';

defineProps<{ kind: NonNullable<HataWhatsNewCard['preview']> }>();
</script>

<style module src="./release.module.css"></style>
