<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<div :class="$style.updatePreview" data-preview-root :data-preview="kind" aria-hidden="true" inert>
	<div v-if="kind === 'favorites'" :class="[$style.miniSettings, $style.miniFavorites]">
		<div :class="$style.miniEyebrow"><i class="ti ti-star"></i> お気に入り <small><i class="ti ti-folder-plus"></i></small></div>
		<div :class="$style.miniFolderTabs"><span data-selected><i class="ti ti-star"></i> すべて <small>6</small></span><span><i class="ti ti-folder" data-color="rose"></i></span><span><i class="ti ti-folder" data-color="green"></i></span></div>
		<div :class="$style.miniFolderRow"><i class="ti ti-grip-vertical"></i><i class="ti ti-folder-filled" data-color="rose"></i><strong>あとで読む</strong><small>3</small></div>
		<div :class="$style.miniFolderRow" data-child><i class="ti ti-corner-down-right"></i><i class="ti ti-folder" data-color="rose"></i><strong>週末の読書</strong><small>1</small></div>
		<div :class="$style.miniFolderRow"><i class="ti ti-grip-vertical"></i><i class="ti ti-folder-filled" data-color="green"></i><strong>暮らし</strong><small>2</small></div>
	</div>
	<div v-else-if="kind === 'favorite-deck'" :class="[$style.miniSettings, $style.miniFavoriteDeck]">
		<div :class="$style.miniDeckHeader"><i class="ti ti-star"></i><strong>お気に入り</strong><i class="ti ti-refresh"></i><i class="ti ti-folders"></i></div>
		<div :class="$style.miniFolderTabs"><span><i class="ti ti-star"></i></span><span data-selected><i class="ti ti-folder"></i> あとで読む <small>3</small></span><span><i class="ti ti-arrows-horizontal"></i></span></div>
		<div :class="$style.miniNote"><span :class="$style.miniAvatar">ま</span><div><b>まどか <small>18分前</small></b><p :class="$style.miniNoteText">小さなメモから、<br>文章を育てる。</p><span :class="$style.miniSavedFolder"><i class="ti ti-folder"></i> あとで読む <i class="ti ti-chevron-down"></i></span></div></div>
	</div>
	<div v-else-if="kind === 'record-images'" :class="$style.miniSettings">
		<div :class="$style.miniEyebrow"><i class="ti ti-book"></i> 読書の記録 <small>今日</small></div>
		<strong :class="$style.miniRecordTitle">夜を編む庭</strong><p :class="$style.miniNoteText">好きな一節を、写真と一緒に。</p>
		<div :class="$style.miniPhotos"><span><i class="ti ti-book-2"></i><small>読書の時間</small></span><span><i class="ti ti-plant-2"></i><small>窓辺の一枚</small></span></div>
		<div :class="$style.miniRecordFooter"><span><i class="ti ti-clock"></i> 30分</span><span><i class="ti ti-photo"></i> 画像 2枚</span><i class="ti ti-dots"></i></div>
	</div>
	<div v-else-if="kind === 'record-search'" :class="$style.miniSettings">
		<div :class="$style.miniSearch"><i class="ti ti-search"></i><strong>読書</strong><i class="ti ti-x"></i></div>
		<div :class="$style.miniSearchResult"><span :class="$style.miniBook"><i class="ti ti-book-2"></i></span><div><strong>夜を編む庭</strong><small>本 · 今日の記録</small></div><i class="ti ti-chevron-right"></i></div>
		<div :class="$style.miniStreak"><span><i class="ti ti-flame"></i> 連続記録</span><strong>4日</strong><div><i v-for="day in 7" :key="day" :data-filled="day < 5"></i></div></div>
	</div>
	<div v-else-if="kind === 'mood-reminder'" :class="$style.miniSettings">
		<div :class="$style.miniEyebrow"><i class="ti ti-bell"></i> 気持ち記録のリマインダー</div>
		<div :class="$style.miniReminderTime"><strong>23:00</strong><span>寝る前</span><span :class="$style.miniSwitch"><i></i></span></div>
		<div :class="$style.miniReminderNotice"><span :class="$style.miniAvatar"><i class="ti ti-mood-smile"></i></span><div><b>今日の気持ちを記録しませんか？</b><small>Hatask · 今の気持ちを、ひとこと。</small></div></div>
	</div>
	<div v-else-if="kind === 'timeline'" :class="$style.miniSettings">
		<div :class="$style.miniEyebrow"><i class="ti ti-layout-list"></i> タイムライン</div>
		<div :class="$style.miniFolderTabs"><span data-selected><i class="ti ti-home"></i> ホーム</span><span><i class="ti ti-world"></i> ローカル</span></div>
		<div :class="$style.miniNote"><span :class="$style.miniAvatar">こ</span><div><b>こはる <small>たった今</small></b><p :class="$style.miniNoteText">いつもの場所で、<br>今日の話を。</p></div></div>
	</div>
	<div v-else-if="kind === 'registration'" :class="$style.miniSettings">
		<div :class="$style.miniEyebrow"><i class="ti ti-door"></i> 登録受付 <small>管理</small></div>
		<div :class="$style.miniRegistrationState"><span :class="$style.miniAvatar"><i class="ti ti-player-pause"></i></span><div><strong>新規登録を一時停止中</strong><small>受付方法を保ったまま、再開できます。</small></div></div>
		<div :class="$style.miniReviewRow"><i class="ti ti-users"></i><span>スタッフの確認</span><strong><i class="ti ti-check"></i> 賛成</strong></div>
		<div :class="$style.miniReviewRow"><i class="ti ti-shield-check"></i><span>鯖缶の最終確認</span><small>承認待ち</small></div>
	</div>
	<div v-else-if="kind === 'utage'" :class="$style.miniSettings">
		<div :class="$style.miniEyebrow"><i class="ti ti-world"></i> ローカルタイムライン</div>
		<div :class="$style.miniUtageWord"><i class="ti ti-confetti"></i><strong>宴</strong><span>挑戦中</span></div>
		<div :class="$style.miniProgress"><span></span></div>
		<div :class="$style.miniRecordFooter"><span><i class="ti ti-eye"></i> みんなに見える宣言</span><span>15分</span></div>
	</div>
</div>
</template>

<script setup lang="ts">
import type { HataWhatsNewCard } from '@/utility/hata-whats-new.js';

defineProps<{ kind: NonNullable<HataWhatsNewCard['preview']> }>();
</script>

<style module src="./release.module.css"></style>
