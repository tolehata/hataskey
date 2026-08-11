<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<component
	:is="prefer.s.animation ? TransitionGroup : 'div'"
	:enterActiveClass="$style.transition_x_enterActive"
	:leaveActiveClass="$style.transition_x_leaveActive"
	:enterFromClass="$style.transition_x_enterFrom"
	:leaveToClass="$style.transition_x_leaveTo"
	:moveClass="$style.transition_x_move"
	tag="div" :class="$style.root"
>
	<XReaction
		v-for="[reaction, count] in _reactions"
		:key="reaction"
		:reaction="reaction"
		:reactionEmojis="props.reactionEmojis"
		:count="count"
		:isInitial="initialReactions.has(reaction)"
		:noteId="props.noteId"
		:myReaction="props.myReaction"
		:note="props.note"
		:revealMuted="revealMuted"
		@reactionToggled="onMockToggleReaction"
	/>
	<slot v-if="hasMoreReactions" name="more"/>
	<!--
	旗鯖fork(#31): ⚠️ミュートしたユーザーのリアクションを隠したことを、詳細画面でだけ知らせる。
	⚠️一覧(TL)には出さない。⚠️「ここにミュートの人が居る」という印がTLに並ぶと、
	  隠した意味が薄れる（どのノートに誰が反応したかを絞り込めてしまう）。
	⚠️押して初めて中身を出す。既定では出さない。
	-->
	<button
		v-if="props.detailed && mutedHiddenCount > 0"
		type="button"
		:class="[$style.mutedNotice, { [$style.mutedNoticeOn]: revealMuted }]"
		:aria-pressed="revealMuted"
		:title="mutedReactionNotice"
		:aria-label="mutedReactionNotice"
		@click="revealMuted = !revealMuted"
	>
		<i class="ti ti-info-circle"></i>
	</button>
</component>
</template>

<script lang="ts" setup>
import * as Misskey from 'cherrypick-js';
import { computed, inject, watch, ref } from 'vue';
import { TransitionGroup } from 'vue';
import { isSupportedEmoji } from '@@/js/emojilist.js';
import XReaction from '@/components/MkReactionsViewer.reaction.vue';
import { $i } from '@/i.js';
import { prefer } from '@/preferences.js';
import { customEmojisMap } from '@/custom-emojis.js';
import { checkMuted as isEmojiMuted } from '@/utility/emoji-mute.js';
import { isMutedUser } from '@/utility/muted-users.js';
// 旗鯖fork(#31): リアクターを共有ストア経由で取る（間引き・キャッシュはストア側の責任）
import { getMutedReactions, mutedReactionsRevision, requestMutedReactions } from '@/utility/muted-reactions.js';
import { hideMutedReactionsLocal } from '@/utility/hatasaba-device-prefs.js';
import { DI } from '@/di.js';
import { i18n } from '@/i18n.js';

const props = withDefaults(defineProps<{
	noteId: Misskey.entities.Note['id'];
	reactions: Misskey.entities.Note['reactions'];
	reactionEmojis: Misskey.entities.Note['reactionEmojis'];
	myReaction: Misskey.entities.Note['myReaction'];
	note: Misskey.entities.Note;
	maxNumber?: number;
	/** 旗鯖fork(#31): 詳細画面か。⚠️true のときだけ「隠しています」の ⓘ を出す。 */
	detailed?: boolean;
}>(), {
	maxNumber: Infinity,
	detailed: false,
});

const mock = inject(DI.mock, false);

const emit = defineEmits<{
	(ev: 'mockUpdateMyReaction', emoji: string, delta: number): void;
}>();

const initialReactions = new Set(Object.keys(props.reactions));

const _reactions = ref<[string, number][]>([]);
const hasMoreReactions = ref(false);
/** 旗鯖fork(#31): ⓘ を押して中身を出しているか。⚠️保存しない（画面を離れたら元に戻る）。 */
const revealMuted = ref(false);
/** 旗鯖fork(#31): いま隠している件数。⚠️0 のときは ⓘ を出さない。 */
const mutedHiddenCount = ref(0);
const mutedReactionNotice = computed(() => revealMuted.value
	? i18n.ts._hata._reactionVisibility.hideMutedAgain
	: i18n.ts._hata._reactionVisibility.mutedCount.replace('{count}', mutedHiddenCount.value.toString()));

if (props.myReaction && !Object.keys(_reactions.value).includes(props.myReaction)) {
	_reactions.value[props.myReaction] = props.reactions[props.myReaction];
}

function onMockToggleReaction(emoji: string, count: number) {
	if (!mock) return;

	const i = _reactions.value.findIndex((item) => item[0] === emoji);
	if (i < 0) return;

	emit('mockUpdateMyReaction', emoji, (count - _reactions.value[i][1]));
}

function canReact(reaction: string) {
	if (!$i) return false;
	// TODO: CheckPermissions
	return !reaction.match(/@\w/) && (customEmojisMap.has(reaction) || isSupportedEmoji(reaction));
}

watch([
	() => props.reactions,
	() => props.maxNumber,
	hideMutedReactionsLocal,
	// 旗鯖fork(#31): リアクターの取得が届いたら描き直す／ⓘ で表示を切り替えたら描き直す。
	mutedReactionsRevision,
	revealMuted,
], ([newSource, maxNumber]) => {
	/*
	旗鯖fork(#31): ミュートしたユーザーのリアクションを**チップごと**消す。
	⚠️従来は `reactionAndUserPairCache` だけを見ていたが、⚠️**backend はこの項目を
	  ノート作成時のストリーム配信でしか返さない**ので、実際にはほぼ常に空だった
	  （＝「名前は隠れるがリアクションは出る」状態の原因）。
	⚠️そこで `notes/reactions` から取ったリアクターを正とし、ペアキャッシュは
	  「あれば使う」補助に落とす。⚠️取得は共有ストア側で間引く（utility/muted-reactions.ts）。
	⚠️自分のリアクションは隠さない。
	*/
	const mutedDelta: Record<string, number> = {};
	const reactionCount = props.note?.reactionCount
		?? Object.values(newSource).reduce((a, b) => a + b, 0);

	// ⚠️隠す件数は「ⓘ を押しているか」に関係なく数える。
	//   ⚠️押した瞬間に 0 になると ⓘ 自体が消えて、隠す側へ戻せなくなる。
	if (hideMutedReactionsLocal.value) {
		// ①正：サーバーから取ったリアクター（自分の投稿かどうかに関係なく効く）
		requestMutedReactions(props.noteId, reactionCount);
		const entry = getMutedReactions(props.noteId, reactionCount);
		if (entry) {
			for (const [reaction, count] of Object.entries(entry.delta)) {
				if (reaction === props.myReaction) continue;
				mutedDelta[reaction] = count;
			}
		} else if (Array.isArray(props.note?.reactionAndUserPairCache)) {
			// ②補助：作成直後のストリームで来たペアキャッシュ（"userId/reaction" 形式）
			for (const pair of props.note.reactionAndUserPairCache) {
				const sep = pair.indexOf('/');
				if (sep < 0) continue;
				const userId = pair.slice(0, sep);
				const reaction = pair.slice(sep + 1);
				if (reaction === props.myReaction) continue;
				if (isMutedUser(userId)) mutedDelta[reaction] = (mutedDelta[reaction] ?? 0) + 1;
			}
		}
	}
	mutedHiddenCount.value = Object.values(mutedDelta).reduce((a, b) => a + b, 0);

	// ミュート絵文字を除外 + ミュートユーザー分を差し引く(0以下になったチップは出さない)
	// ⚠️ⓘ で開いている間は差し引かない＝素の件数をそのまま出す。
	const appliedDelta = revealMuted.value ? {} : mutedDelta;
	const filteredSource: Record<string, number> = {};
	for (const [reaction, count] of Object.entries(newSource)) {
		if (isEmojiMuted(reaction).value) continue;
		const adjusted = count - (appliedDelta[reaction] ?? 0);
		if (adjusted > 0) filteredSource[reaction] = adjusted;
	}

	let newReactions: [string, number][] = [];
	hasMoreReactions.value = Object.keys(filteredSource).length > maxNumber;

	for (let i = 0; i < _reactions.value.length; i++) {
		const reaction = _reactions.value[i][0];
		if (reaction in filteredSource && filteredSource[reaction] !== 0) {
			_reactions.value[i][1] = filteredSource[reaction];
			newReactions.push(_reactions.value[i]);
		}
	}

	const newReactionsNames = newReactions.map(([x]) => x);
	newReactions = [
		...newReactions,
		...Object.entries(filteredSource)
			.sort(([emojiA, countA], [emojiB, countB]) => {
				if (prefer.s.showAvailableReactionsFirstInNote) {
					if (!canReact(emojiA) && canReact(emojiB)) return 1;
					if (canReact(emojiA) && !canReact(emojiB)) return -1;
					return countB - countA;
				} else {
					return countB - countA;
				}
			})
			.filter(([y], i) => i < maxNumber && !newReactionsNames.includes(y)),
	];

	newReactions = newReactions.slice(0, props.maxNumber);

	if (props.myReaction && !newReactions.map(([x]) => x).includes(props.myReaction)) {
		newReactions.push([props.myReaction, filteredSource[props.myReaction]]);
	}

	_reactions.value = newReactions;
}, { immediate: true, deep: true });
</script>

<style lang="scss" module>
.transition_x_move,
.transition_x_enterActive,
.transition_x_leaveActive {
	transition: opacity 0.2s cubic-bezier(0,.5,.5,1), transform 0.2s cubic-bezier(0,.5,.5,1) !important;
}
.transition_x_enterFrom,
.transition_x_leaveTo {
	opacity: 0;
	transform: scale(0.7);
}
.transition_x_leaveActive {
	position: absolute;
}

/*
旗鯖fork(#31): 「ミュートしたぶんを隠しています」の ⓘ。
⚠️チップと同じ高さに揃える（行が段違いにならないように）。
⚠️既定は控えめな色。押して開いている間だけアクセント色にして、状態が見て分かるようにする。
*/
.mutedNotice {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 38px;
	width: 32px;
	margin: 2px;
	padding: 0;
	border: none;
	border-radius: 6px;
	background: var(--MI_THEME-buttonBg);
	color: var(--MI_THEME-fgTransparentWeak);
	cursor: pointer;
	font-size: 1.1em;
	line-height: 1;
}
.mutedNotice:hover,
.mutedNotice:focus-visible {
	background: var(--MI_THEME-buttonHoverBg);
	color: var(--MI_THEME-fg);
}
.mutedNoticeOn {
	background: color-mix(in srgb, var(--MI_THEME-accent) 16%, transparent);
	color: var(--MI_THEME-accent);
}

.root {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px;

	&:empty {
		display: none;
	}
}
</style>
