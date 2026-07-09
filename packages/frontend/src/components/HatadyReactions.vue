<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady 1d/1g): 学習ログ / コメントのリアクション表示 + 操作。
  リアクションは hataskey 共通の絵文字ピッカー(reactionPicker)で任意に選べる(要件⑤・♡固定でない)。
  1ユーザー1対象1リアクション。ピルをクリックで付与/取消。カスタム絵文字は MkReactionIcon で描画。
-->
<template>
<span :class="$style.root">
	<button
		v-for="(count, emoji) in reactionsLocal" :key="emoji"
		:class="[$style.pill, myReactionLocal === emoji && $style.pillOn]"
		@click="toggle(emoji)"
	>
		<MkReactionIcon :class="$style.icon" :reaction="String(emoji)"/>
		<span :class="$style.count">{{ count }}</span>
	</button>
	<button ref="addEl" :class="$style.add" @click="openPicker"><i class="ti ti-mood-plus"></i></button>
</span>
</template>

<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue';
import MkReactionIcon from '@/components/MkReactionIcon.vue';
import { reactionPicker } from '@/utility/reaction-picker.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const props = defineProps<{
	target: { logId?: string | null; commentId?: string | null };
	reactions: Record<string, number>;
	myReaction: string | null;
}>();

const emit = defineEmits<{ (ev: 'changed', v: { reactions: Record<string, number>; myReaction: string | null }): void }>();

// 楽観的更新用のローカル状態。
const reactionsLocal = ref<Record<string, number>>({ ...props.reactions });
const myReactionLocal = ref<string | null>(props.myReaction);
const addEl = useTemplateRef('addEl');

function apply(reactions: Record<string, number>, mine: string | null) {
	// 0 件になった絵文字は消す。
	for (const k of Object.keys(reactions)) if (reactions[k] <= 0) delete reactions[k];
	reactionsLocal.value = reactions;
	myReactionLocal.value = mine;
	emit('changed', { reactions: { ...reactions }, myReaction: mine });
}

function localApplyReact(emoji: string) {
	const r = { ...reactionsLocal.value };
	const prev = myReactionLocal.value;
	if (prev) r[prev] = (r[prev] ?? 1) - 1; // 既存を1減らす
	r[emoji] = (r[emoji] ?? 0) + 1;
	apply(r, emoji);
}
function localApplyUnreact() {
	const r = { ...reactionsLocal.value };
	const prev = myReactionLocal.value;
	if (prev) r[prev] = (r[prev] ?? 1) - 1;
	apply(r, null);
}

async function toggle(emoji: string) {
	if (myReactionLocal.value === emoji) {
		localApplyUnreact();
		await misskeyApi('hata/hatady/reactions/delete', { ...cleanTarget() }).catch(() => {});
	} else {
		localApplyReact(emoji);
		await misskeyApi('hata/hatady/reactions/create', { ...cleanTarget(), reaction: emoji }).catch(() => {});
	}
}

function openPicker() {
	reactionPicker.show(addEl.value ?? null, null, async (reaction) => {
		localApplyReact(reaction);
		await misskeyApi('hata/hatady/reactions/create', { ...cleanTarget(), reaction }).catch(() => {});
	});
}

// null のキーを送らない(ajv 対策)。
function cleanTarget(): Record<string, string> {
	const t: Record<string, string> = {};
	if (props.target.commentId) t.commentId = props.target.commentId;
	else if (props.target.logId) t.logId = props.target.logId;
	return t;
}
</script>

<style lang="scss" module>
.root { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.pill {
	display: inline-flex; align-items: center; gap: 4px;
	padding: 2px 9px; border-radius: 999px;
	background: var(--hy-chip-bg); border: 1.5px solid transparent;
	font-size: 12px; font-weight: 700; color: var(--hy-body); cursor: pointer;
	transition: all .12s;
}
.pill:hover { border-color: var(--hy-border); }
.pillOn { background: color-mix(in srgb, var(--hy-accent) 18%, transparent); border-color: var(--hy-accent); color: var(--hy-accent-ink); }
.icon { height: 1.3em; }
.count { line-height: 1; }
.add {
	display: inline-flex; align-items: center; justify-content: center;
	width: 26px; height: 24px; border-radius: 999px;
	background: var(--hy-chip-bg); border: 1px solid var(--hy-border); color: var(--hy-body);
	cursor: pointer; transition: all .12s;
}
.add:hover { background: var(--hy-accent); color: #fff; border-color: transparent; }
</style>
