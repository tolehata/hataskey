<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<div :class="$style.updatePreview" data-preview-root :data-preview="kind" aria-hidden="true" inert>
	<div v-if="kind === 'note-actions'" :class="[$style.miniSettings, $style.miniActionPreview]">
		<div :class="$style.miniActionPill"><div :class="$style.miniActionNotice"><span :class="$style.miniActionIcon"><i class="ti ti-file-description"></i><i class="ti ti-paperclip"></i></span><span><strong>クリップに追加しました</strong><small>あとで読む</small></span><i class="ti ti-x"></i></div><div :class="$style.miniActionNav"><i class="ti ti-user"></i><span><i class="ti ti-home"></i> ホーム</span><i class="ti ti-users"></i><i class="ti ti-world"></i></div></div>
		<div :class="$style.miniActionPost"><span :class="$style.miniAvatar">は</span><div><b>旗茶</b><p>あとで読みたいノートを、ひとつ。</p><small><i class="ti ti-star"></i> お気に入り <i class="ti ti-paperclip"></i> クリップ</small></div></div>
	</div>
	<div v-else-if="kind === 'emoji-changes'" :class="[$style.miniSettings, $style.miniEmojiPreview]">
		<div :class="$style.miniEyebrow"><i class="ti ti-mood-smile"></i> 絵文字の変更申請</div>
		<div :class="$style.miniEmojiCurrent"><span>🌼</span><div><b>:flower_hello:</b><small>承認済み</small></div></div>
		<div :class="$style.miniEmojiOptions"><span><i class="ti ti-photo"></i> 画像を更新</span><span><i class="ti ti-trash"></i> 取り下げ</span></div>
		<div :class="$style.miniEmojiStatus"><i class="ti ti-clock"></i> 審査中の申請を確認できます</div>
	</div>
</div>
</template>

<script setup lang="ts">
import type { HataWhatsNewCard } from '@/utility/hata-whats-new.js';

defineProps<{ kind: NonNullable<HataWhatsNewCard['preview']> }>();
</script>

<style module src="./release.module.css"></style>
