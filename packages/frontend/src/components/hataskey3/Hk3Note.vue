<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
Hataskey UI 3: タイムラインのノート。ルーム表示(右端にリアクション列)とスレッド展開を持つ。
-->
<template>
<div
	v-if="!hardMuted"
	ref="rootEl"
	data-scroll-anchor
	:class="$style.root"
	:data-size="size"
	:data-renote="isRenote ? 'true' : undefined"
	:data-linked="linked ?? undefined"
	:data-thread-open="threadOpen ? 'true' : undefined"
	:data-utage="utageActive ? 'true' : undefined"
	@mouseenter="hover = true"
	@mouseleave="hover = false"
	@focusin="hover = true"
	@focusout="onFocusOut"
>
	<svg v-if="utageActive" :class="$style.utageFrame" aria-hidden="true">
		<rect x="0" y="0" width="100%" height="100%" pathLength="100" :class="$style.utageTrack"/>
		<rect x="0" y="0" width="100%" height="100%" pathLength="100" :class="$style.utageBar" :stroke-dasharray="`${utageRemain} 100`"/>
	</svg>
	<span v-if="linked" :class="$style.linkBadge"><component :is="linked === 'quote' ? Quote : Reply" :size="12"/>{{ linked === 'quote' ? copy.quoting : copy.replying }}</span>

	<div v-if="softMuted && !showMuted" :class="$style.muted">
		<span>{{ sensitiveMuted && !wordMuted ? copy.sensitiveNote : copy.mutedNote }}</span>
		<button type="button" :class="$style.mutedButton" @click="showMuted = true">{{ i18n.ts.show }}</button>
	</div>
	<article v-else :class="$style.article" :style="articleStyle">
		<div v-if="isRenote" :class="$style.renotedBy">
			<div :class="$style.renotedSummary">
				<Repeat2 :size="16" :class="$style.renotedIcon"/>
				<MkA :to="userPage(note.user)" :class="$style.renotedName"><MkUserName :user="note.user"/></MkA>
				<MkTime :time="note.createdAt" :class="$style.renotedTime"/>
				<button v-if="isMyRenote" ref="unrenoteButtonEl" type="button" :class="$style.unrenoteButton" :title="i18n.ts.unrenote" :aria-label="i18n.ts.unrenote" :aria-expanded="unrenoteConfirmOpen" :disabled="unrenoteBusy" @click.stop="openUnrenoteConfirm"><Undo2 :size="16"/><span>{{ i18n.ts.unrenote }}</span></button>
			</div>
			<div v-if="unrenoteConfirmOpen" :class="$style.unrenoteConfirm" role="group" :aria-label="copy.unrenoteConfirm" :aria-busy="unrenoteBusy" @keydown.esc.stop.prevent="cancelUnrenoteConfirm">
				<span :class="$style.unrenoteQuestion">{{ copy.unrenoteConfirm }}</span>
				<div :class="$style.unrenoteConfirmActions">
					<button ref="unrenoteCancelEl" type="button" :class="$style.unrenoteCancel" :disabled="unrenoteBusy" @click.stop="cancelUnrenoteConfirm">{{ i18n.ts.cancel }}</button>
					<button type="button" :class="$style.unrenoteConfirmButton" :disabled="unrenoteBusy" @click.stop="unrenote">{{ copy.unrenoteConfirmAction }}</button>
				</div>
			</div>
		</div>
		<div :class="$style.avatarCol">
			<MkAvatar :user="appearNote.user" :class="$style.avatar" link preview/>
			<span v-if="hasThread" :class="$style.threadLine"></span>
		</div>
		<div :class="$style.body">
			<header :class="$style.header">
				<MkA v-user-preview="appearNote.userId" :to="userPage(appearNote.user)" :class="$style.name"><MkUserName :user="appearNote.user"/></MkA>
				<Bot v-if="appearNote.user.isBot" :size="14" :class="$style.muted700"/>
				<span :class="$style.acct">@{{ appearNote.user.username }}<template v-if="appearNote.user.host">@{{ appearNote.user.host }}</template></span>
				<span :class="$style.meta">
					<component :is="visibilityIcon" v-if="visibilityIcon" :size="13"/>
					<GlobeLock v-if="appearNote.localOnly" :size="13"/>
					<MkA :to="notePage(appearNote)" :class="$style.time"><MkTime :time="appearNote.createdAt"/></MkA>
				</span>
			</header>
			<MkA v-if="appearNote.reply" :to="notePage(appearNote.reply)" :class="$style.replyTo">
				<CornerUpLeft :size="13"/><span>@{{ appearNote.reply.user.username }}</span>
				<Mfm v-if="appearNote.reply.text" :text="appearNote.reply.text" :plain="true" :nowrap="true" :author="appearNote.reply.user" :class="$style.replyToText"/>
			</MkA>
			<div v-if="appearNote.cw != null" :class="$style.cw">
				<EyeOff :size="15" :class="$style.muted700"/>
				<Mfm v-if="appearNote.cw !== ''" :text="appearNote.cw" :author="appearNote.user" :nyaize="'respect'" :class="$style.cwText"/>
				<button type="button" :class="$style.cwButton" :title="copy.toggleContent" :aria-pressed="showContent" @click="showContent = !showContent"><component :is="showContent ? EyeOff : Eye" :size="16"/></button>
			</div>
			<template v-if="appearNote.cw == null || showContent">
				<p v-if="appearNote.text || appearNote.isHidden" :class="$style.text">
					<span v-if="appearNote.isHidden" :class="$style.muted700">({{ i18n.ts._ffVisibility.private }})</span>
					<Mfm v-if="appearNote.text" :text="appearNote.text" :author="appearNote.user" :nyaize="'respect'" :emojiUrls="appearNote.emojis" :enableEmojiMenu="true" :enableEmojiMenuReaction="true" class="_selectable"/>
				</p>
				<div v-if="appearNote.files && appearNote.files.length > 0" :class="$style.media">
					<MkMediaList :mediaList="appearNote.files" :user="appearNote.user" :disableRightClick="appearNote.disableRightClick"/>
				</div>
				<MkPoll v-if="appearNote.poll" :noteId="appearNote.id" :multiple="appearNote.poll.multiple" :expiresAt="appearNote.poll.expiresAt" :choices="$appearNote.pollChoices" :author="appearNote.user" :emojiUrls="appearNote.emojis"/>
				<MkA v-if="quoted" :to="notePage(quoted)" :class="$style.quote">
					<MkAvatar :user="quoted.user" :class="$style.quoteAvatar"/>
					<div :class="$style.quoteBody">
						<b :class="$style.quoteName"><MkUserName :user="quoted.user"/></b>
						<span :class="$style.quoteText"><Mfm v-if="quoted.cw != null || quoted.text" :text="quoted.cw ?? quoted.text ?? ''" :plain="true" :author="quoted.user"/><template v-else>{{ copy.attachmentsOnly }}</template></span>
					</div>
				</MkA>
			</template>
			<MkA v-if="appearNote.channel" :to="`/channels/${appearNote.channel.id}`" :class="$style.channel"><Tv :size="13"/>{{ appearNote.channel.name }}</MkA>
			<MkUtageStatus v-if="utageRevivalShown" :note="$appearNote"/>

			<div v-if="!sideReactions && reactions.length > 0" :class="$style.rxInline">
				<div ref="inlineEl" :class="$style.rxInlineList" :style="{ maxHeight: rxOpen && inlineOverflow ? `${inlineOverflow}px` : `${chipHeight}px` }">
					<button v-for="r in reactions" :key="r.reaction" type="button" :class="$style.chip" :data-reaction="r.reaction" :data-mine="r.mine ? 'true' : undefined" :title="r.title" @click="toggleReaction(r.reaction, $event)">
						<span :class="[$style.emojiBox, $style.chipEmoji]"><MkReactionIcon :reaction="r.reaction" :emojiUrl="$appearNote.reactionEmojis[emojiKey(r.reaction)]"/></span>{{ r.count }}
					</button>
					<button v-if="canAddReaction" type="button" :class="$style.chipAdd" :title="copy.addReaction" @click="react($event)"><SmilePlus :size="18"/></button>
				</div>
				<button v-if="inlineOverflow" type="button" :class="$style.chipMore" :data-open="rxOpen ? 'true' : undefined" :title="copy.allReactions" @click="rxOpen = !rxOpen">
					<component :is="rxOpen ? ChevronUp : ChevronDown" :size="16"/>{{ rxOpen ? '' : `+${inlineHidden}` }}
				</button>
			</div>

			<div v-if="size === 'sm'" :class="$style.smActions">
				<button v-for="a in actions" :key="a.id" type="button" :class="$style.smAction" :data-active="a.active ? 'true' : undefined" :title="a.label" @click="a.run($event)"><component :is="a.icon" :size="17"/><span v-if="a.count">{{ a.count }}</span></button>
			</div>

			<button v-if="hasThread" type="button" :class="$style.convButton" :data-open="threadOpen ? 'true' : undefined" :aria-expanded="threadOpen" :title="copy.conversation" @click="toggleThread">
				<span :class="$style.convFaces">
					<MkAvatar v-for="u in participants" :key="u.id" :user="u" :class="$style.convFace"/>
				</span>
				<span :class="$style.convCount"><MessageCircle :size="17"/>{{ appearNote.repliesCount }}</span>
				<ChevronDown :size="18" :class="$style.convChevron"/>
			</button>
		</div>

		<div v-if="sideReactions" ref="sideEl" :class="$style.side">
			<!-- CSS grid だと付与・変更直後の枠が一部しか描かれない環境があるため、位置を明示して並べる。 -->
			<div :class="$style.sideGrid">
				<button v-for="(r, i) in sideList" :key="r.reaction" type="button" :class="$style.sideChip" :style="sideCell(i)" :data-reaction="r.reaction" :data-mine="r.mine ? 'true' : undefined" :title="r.title" @click="toggleReaction(r.reaction, $event)">
					<span :class="[$style.emojiBox, $style.sideEmoji]"><MkReactionIcon :reaction="r.reaction" :emojiUrl="$appearNote.reactionEmojis[emojiKey(r.reaction)]"/></span>
					<span>{{ r.count }}</span>
				</button>
				<button v-if="canAddReaction" type="button" :class="$style.sideAdd" :style="sideCell(sideList.length)" :title="copy.addReaction" @click="react($event)"><SmilePlus :size="18"/></button>
				<button v-if="sideOverflow" type="button" :class="$style.sideMore" :style="sideCell(sideList.length + (canAddReaction ? 1 : 0))" :data-open="rxOpen ? 'true' : undefined" :title="copy.allReactions" @click="rxOpen = !rxOpen">
					<component :is="rxOpen ? ChevronRight : ChevronLeft" :size="15"/>{{ rxOpen ? '' : `+${reactions.length - sideCap}` }}
				</button>
			</div>
		</div>
		<span v-if="appearNote.user.host" :class="$style.host"><Server :size="11"/>{{ appearNote.user.host }}</span>
	</article>

	<div v-if="size === 'lg' && (hover || menuOpen)" :class="$style.hoverBar" :style="{ right: `${sideReactions ? sideWidth + 32 : 12}px` }">
		<button v-for="a in actions" :key="a.id" type="button" :class="$style.hoverAction" :data-active="a.active ? 'true' : undefined" :title="a.label" @click="a.run($event)"><component :is="a.icon" :size="18"/><span v-if="a.count">{{ a.count }}</span></button>
	</div>

	<div v-if="hasThread" :class="$style.tree" :data-open="threadOpen ? 'true' : undefined">
		<div :class="$style.treeInner">
			<div :class="$style.treeList">
				<div v-if="threadLoading" :class="$style.treeLoading"><MkLoading :em="true"/></div>
				<div v-for="(r, i) in replies" :key="r.id" :class="$style.treeRow" :style="{ '--hk3-delay': `${120 + i * 70}ms` }">
					<div :class="$style.treeRail"><span :class="$style.treeRailV"></span><span :class="$style.treeRailH"></span></div>
					<MkAvatar :user="r.user" :class="$style.treeAvatar" link preview/>
					<MkA :to="notePage(r)" :class="$style.treeBubble">
						<span :class="$style.treeHead"><b><MkUserName :user="r.user"/></b><MkTime :time="r.createdAt" :class="$style.treeTime"/></span>
						<span :class="$style.treeText"><Mfm v-if="r.cw != null || r.text" :text="r.cw ?? r.text ?? ''" :author="r.user" :nyaize="'respect'" :emojiUrls="r.emojis"/><template v-else>{{ copy.attachmentsOnly }}</template></span>
					</MkA>
				</div>
				<div :class="$style.treeRow" :style="{ '--hk3-delay': `${120 + replies.length * 70}ms` }">
					<div :class="$style.treeRail"><span :class="[$style.treeRailV, $style.treeRailEnd]"></span><span :class="$style.treeRailH"></span></div>
					<MkAvatar v-if="$i" :user="$i" :class="$style.treeAvatar"/>
					<button type="button" :class="$style.treeReply" @click="reply"><Reply :size="16"/><span>{{ copy.reply }}</span><ArrowDown :size="16"/></button>
				</div>
			</div>
		</div>
	</div>
	<Hk3ConfirmBubble v-if="unreactAnchor" :anchor="unreactAnchor" :text="i18n.ts.cancelReactionConfirm" :okLabel="i18n.ts.ok" :cancelLabel="i18n.ts.cancel" @ok="confirmUnreact" @cancel="unreactAnchor = null"/>
</div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import * as Misskey from 'cherrypick-js';
import { ArrowDown, Bot, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CornerUpLeft, Ellipsis, Eye, EyeOff, House, Lock, Mail, MessageCircle, Quote, Repeat2, Reply, GlobeLock, Server, SmilePlus, Tv, Undo2 } from '@lucide/vue';
import type { Component } from 'vue';
import MkMediaList from '@/components/MkMediaList.vue';
import MkPoll from '@/components/MkPoll.vue';
import MkReactionIcon from '@/components/MkReactionIcon.vue';
import Hk3ConfirmBubble from './Hk3ConfirmBubble.vue';
import MkUtageStatus from '@/components/MkUtageStatus.vue';
import * as os from '@/os.js';
import * as sound from '@/utility/sound.js';
import { $i } from '@/i.js';
import { globalEvents } from '@/events.js';
import { i18n } from '@/i18n.js';
import { prefer } from '@/preferences.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { reactionPicker } from '@/utility/reaction-picker.js';
import { getNoteMenu, getRenoteMenu } from '@/utility/get-note-menu.js';
import { noteEvents, useNoteCapture } from '@/composables/use-note-capture.js';
import { checkWordMute } from '@/utility/check-word-mute.js';
import { getAppearNote } from '@/utility/get-appear-note.js';
import { pleaseLogin } from '@/utility/please-login.js';
import { notePage } from '@/filters/note.js';
import { userPage } from '@/filters/user.js';

const props = withDefaults(defineProps<{
	note: Misskey.entities.Note;
	size?: 'lg' | 'sm';
	linked?: 'reply' | 'quote' | null;
	inLocal?: boolean;
	hideSensitive?: boolean;
}>(), {
	size: 'lg',
	linked: null,
	inLocal: false,
	hideSensitive: false,
});

const copy = i18n.ts._hata._hataskeyUi3;
const note = props.note;
const isRenote = Misskey.note.isPureRenote(note);
const isMyRenote = isRenote && $i?.id === note.userId;
const appearNote = getAppearNote(note) ?? note;
const { $note: $appearNote, subscribe: subscribeNoteCapture } = useNoteCapture({ note: appearNote, parentNote: note });

const rootEl = shallowRef<HTMLElement | null>(null);
const sideEl = shallowRef<HTMLElement | null>(null);
const inlineEl = shallowRef<HTMLElement | null>(null);
const hover = ref(false);
const menuOpen = ref(false);
const unrenoteBusy = ref(false);
const unrenoteConfirmOpen = ref(false);
const unrenoteButtonEl = shallowRef<HTMLButtonElement | null>(null);
const unrenoteCancelEl = shallowRef<HTMLButtonElement | null>(null);
const showContent = ref(false);
const showMuted = ref(false);
const rxOpen = ref(false);
const sideRows = ref(2);
const inlineOverflow = ref(0);
const inlineHidden = ref(0);
const threadOpen = ref(false);
const threadLoading = ref(false);
const replies = ref<Misskey.entities.Note[]>([]);
const now = ref(Date.now());

const hardMuted = computed(() => $i != null && checkWordMute(note, $i, $i.hardMutedWords ?? []) !== false);
const wordMuted = computed(() => $i != null && checkWordMute(note, $i, $i.mutedWords ?? []) !== false);
// 「センシティブを表示」が無効のときも一覧からは消さず、通常UIと同じく畳んで見せる。
const sensitiveMuted = computed(() => props.hideSensitive && (appearNote.files ?? []).some(file => file.isSensitive));
const softMuted = computed(() => wordMuted.value || sensitiveMuted.value);
const quoted = computed(() => (!isRenote && appearNote.renote) ? appearNote.renote : null);
const hasThread = computed(() => (appearNote.repliesCount ?? 0) > 0);
const sideReactions = computed(() => props.size === 'lg');
const chipHeight = computed(() => props.size === 'sm' ? 34 : 38);

function emojiKey(reaction: string): string {
	return reaction.replace(/:/g, '').replace(/@\.$/, '');
}

const visibilityIcon = computed<Component | null>(() => ({ public: null, home: House, followers: Lock, specified: Mail } as Record<string, Component | null>)[appearNote.visibility] ?? null);

type ReactionEntry = { reaction: string; count: number; mine: boolean; title: string };
const reactions = computed<ReactionEntry[]>(() => Object.entries($appearNote.reactions)
	.filter(([, count]) => count > 0)
	.sort((a, b) => b[1] - a[1])
	.map(([reaction, count]) => ({ reaction, count, mine: $appearNote.myReaction === reaction, title: `${reaction.replace(/^:(.+?)(@\.)?:$/, ':$1:')} ${count}` })));

// リアクションが付いた・増えた・自分のものに変わったときは、その絵文字をふんわり膨らませて知らせる。
const reactionMotion = () => prefer.s.animation && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
watch(() => reactions.value.map(r => `${r.reaction}\u0000${r.count}\u0000${r.mine ? 1 : 0}`).join('\u0001'), (_now, before) => {
	if (!reactionMotion()) return;
	const previous = new Map((before ?? '').split('\u0001').filter(Boolean).map(entry => {
		const [reaction, count, mine] = entry.split('\u0000');
		return [reaction, { count: Number(count), mine: mine === '1' }] as const;
	}));
	const grown = reactions.value.filter(r => {
		const old = previous.get(r.reaction);
		return old == null || r.count > old.count || (r.mine && !old.mine);
	}).map(r => r.reaction);
	if (grown.length === 0) return;
	void nextTick(() => {
		for (const button of rootEl.value?.querySelectorAll<HTMLElement>('[data-reaction]') ?? []) {
			if (!grown.includes(button.dataset.reaction ?? '')) continue;
			button.animate([
				{ opacity: 0.4, transform: 'scale(0.86)' },
				{ opacity: 1, transform: 'scale(1.04)', offset: 0.6 },
				{ opacity: 1, transform: 'scale(1)' },
			], { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
			button.firstElementChild?.animate([
				{ transform: 'translateY(4px) scale(0.5)', opacity: 0 },
				{ transform: 'translateY(-2px) scale(1.18)', opacity: 1, offset: 0.55 },
				{ transform: 'translateY(0) scale(1)', opacity: 1 },
			], { duration: 520, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)' });
		}
	});
});

// 右端のリアクション列: 本文の高さに収まる行数×2列を基本とし、溢れたら「+N」で横に広げる。
const SIDE_COLS = 2;
const sideCapacity = computed(() => sideRows.value * SIDE_COLS);
// 自分のリアクションが付いている間は、絵文字の横の追加ボタンを出さない(変更は他の絵文字を押す)。
const canAddReaction = computed(() => !$appearNote.myReaction);
const sideFitsAll = computed(() => reactions.value.length + (canAddReaction.value ? 1 : 0) <= sideCapacity.value);
const sideCap = computed(() => sideFitsAll.value ? reactions.value.length : Math.max(0, sideCapacity.value - (canAddReaction.value ? 2 : 1)));
const sideOverflow = computed(() => !sideFitsAll.value);
const sideList = computed(() => rxOpen.value ? reactions.value : reactions.value.slice(0, sideCap.value));
const sideCols = computed(() => {
	if (!rxOpen.value || !sideOverflow.value) return SIDE_COLS;
	return Math.max(SIDE_COLS, Math.ceil((reactions.value.length + (canAddReaction.value ? 2 : 1)) / sideRows.value));
});
const sideWidth = computed(() => sideCols.value * 58 + 10);

// 縦に sideRows 個ずつ詰めて、あふれたら左の列から右へ並べる。
function sideCell(index: number) {
	return { left: `${Math.floor(index / sideRows.value) * 58}px`, top: `${(index % sideRows.value) * 56}px` };
}

const articleStyle = computed(() => ({
	gridTemplateColumns: sideReactions.value ? `44px minmax(0, 1fr) ${sideWidth.value}px` : `${props.size === 'sm' ? 36 : 44}px minmax(0, 1fr)`,
}));

// 宴(うたげ): ローカルTLで進行中の宴ノートは、残り時間を枠のゲージとして描く。
const UTAGE_WINDOW_MS = 15 * 60 * 1000;
const utageActive = computed(() => props.inLocal && appearNote.user.host == null && ($appearNote.utageStatus === 'running' || $appearNote.utageStatus === 'reviving'));
const utageRemain = computed(() => {
	const expiresAt = Date.parse($appearNote.utageExpiresAt ?? '');
	if (!Number.isFinite(expiresAt)) return 100;
	return Math.max(0, Math.min(100, (expiresAt - now.value) / UTAGE_WINDOW_MS * 100));
});
// 復活チャンスの状況表示は、通常のノートと同じく復活の記録があるときだけ出す(進行中の宴には付けない)。
const UTAGE_EXPIRE_MS = 6 * 60 * 60 * 1000;
const utageRevivalShown = computed(() => props.inLocal
	&& appearNote.user.host == null
	&& $appearNote.utageStatus != null
	&& $appearNote.utageRevival != null
	&& Date.now() - new Date(appearNote.createdAt).getTime() < UTAGE_EXPIRE_MS);
let utageTimer: number | null = null;
watch(utageActive, active => {
	if (utageTimer != null) window.clearInterval(utageTimer);
	utageTimer = active ? window.setInterval(() => { now.value = Date.now(); }, 1000) : null;
}, { immediate: true });

const participants = computed(() => {
	const seen = new Set<string>();
	const users: Misskey.entities.UserLite[] = [];
	for (const user of [appearNote.user, ...replies.value.map(r => r.user)]) {
		if (seen.has(user.id)) continue;
		seen.add(user.id);
		users.push(user);
	}
	return users.slice(0, 4);
});

type Action = { id: string; label: string; icon: Component; count?: number | string; active?: boolean; run: (ev: MouseEvent) => void };
const actions = computed<Action[]>(() => {
	const list: Action[] = [
		{ id: 'reply', label: copy.reply, icon: Reply, count: appearNote.repliesCount || '', active: props.linked === 'reply', run: () => reply() },
		{ id: 'renote', label: i18n.ts.renote, icon: Repeat2, count: appearNote.renoteCount || '', run: ev => renote(ev) },
		{ id: 'quote', label: i18n.ts.quote, icon: Quote, active: props.linked === 'quote', run: () => quote() },
	];
	// 標準表示(lg)では右のリアクション列に追加ボタンを置く。列に収まりきらず展開が要るほど多いときだけ、操作バーにも出す。
	const reactInBar = sideReactions.value ? sideOverflow.value && canAddReaction.value : reactions.value.length === 0;
	if (reactInBar) list.push({ id: 'react', label: copy.addReaction, icon: SmilePlus, run: ev => react(ev) });
	list.push({ id: 'more', label: i18n.ts.more, icon: Ellipsis, run: ev => showMenu(ev) });
	return list;
});

function onFocusOut(ev: FocusEvent) {
	if (!rootEl.value?.contains(ev.relatedTarget as Node | null)) hover.value = false;
}

function reply() {
	pleaseLogin();
	if (!$i) return;
	void os.post({ reply: appearNote, channel: appearNote.channel });
}

function quote() {
	pleaseLogin();
	if (!$i) return;
	void os.post({ renote: appearNote, channel: appearNote.channel?.isPrivate ? appearNote.channel : undefined });
}

async function renote(ev: MouseEvent) {
	pleaseLogin();
	if (!$i) return;
	const anchor = ev.currentTarget as HTMLElement;
	const { menu } = await getRenoteMenu({ note, renoteButton: shallowRef<HTMLElement | null>(anchor) });
	menuOpen.value = true;
	os.popupMenu(menu, anchor).finally(() => { menuOpen.value = false; });
	subscribeNoteCapture();
}

function showMenu(ev: MouseEvent) {
	const anchor = ev.currentTarget as HTMLElement;
	const { menu, cleanup } = getNoteMenu({ note, viewTextSource: ref(false), noNyaize: ref(false) });
	menuOpen.value = true;
	os.popupMenu(menu, anchor).finally(() => {
		menuOpen.value = false;
		cleanup();
	});
}

async function openUnrenoteConfirm() {
	if (unrenoteBusy.value || unrenoteConfirmOpen.value) return;
	unrenoteConfirmOpen.value = true;
	await nextTick();
	unrenoteCancelEl.value?.focus();
}

function cancelUnrenoteConfirm() {
	if (unrenoteBusy.value || !unrenoteConfirmOpen.value) return;
	unrenoteConfirmOpen.value = false;
	void nextTick(() => unrenoteButtonEl.value?.focus());
}

async function unrenote() {
	if (!unrenoteConfirmOpen.value || unrenoteBusy.value || !$i || $i.id !== note.userId || !Misskey.note.isPureRenote(note)) return;
	unrenoteBusy.value = true;
	try {
		await os.apiWithDialog('notes/delete', { noteId: note.id });
		globalEvents.emit('noteDeleted', note.id);
	} catch {
		// apiWithDialog がエラーを表示する。失敗時は帯を残して再試行できるようにする。
		unrenoteBusy.value = false;
	}
}

function createReaction(reaction: string) {
	sound.playMisskeySfx('reaction');
	misskeyApi('notes/reactions/create', { noteId: appearNote.id, reaction }).then(() => {
		noteEvents.emit(`reacted:${appearNote.id}`, { userId: $i!.id, reaction });
	});
}

async function changeReaction(reaction: string, confirmed = false) {
	const oldReaction = $appearNote.myReaction;
	if (oldReaction) {
		if (!confirmed) {
			const confirm = await os.confirm({ type: 'warning', text: oldReaction !== reaction ? i18n.ts.changeReactionConfirm : i18n.ts.cancelReactionConfirm });
			if (confirm.canceled) return;
		}
		await misskeyApi('notes/reactions/delete', { noteId: appearNote.id });
		noteEvents.emit(`unreacted:${appearNote.id}`, { userId: $i!.id, reaction: oldReaction });
		if (oldReaction !== reaction) createReaction(reaction);
		return;
	}
	createReaction(reaction);
}

function react(ev: MouseEvent) {
	pleaseLogin();
	if (!$i) return;
	if (appearNote.reactionAcceptance === 'likeOnly') {
		void changeReaction('❤️');
		return;
	}
	const anchor = ev.currentTarget as HTMLElement;
	reactionPicker.show(anchor, note, async reaction => {
		if (prefer.s.confirmOnReact) {
			const confirm = await os.confirm({ type: 'question', text: i18n.tsx.reactAreYouSure({ emoji: reaction.replace('@.', '') }) });
			if (confirm.canceled) return;
		}
		await changeReaction(reaction);
	});
}

function toggleReaction(reaction: string, ev: MouseEvent) {
	pleaseLogin();
	if (!$i) return;
	// 他サーバーのカスタム絵文字はこのサーバーから付けられないため、ピッカーで代わりを選んでもらう。
	const remoteCustom = reaction.startsWith(':') && !reaction.endsWith('@.:');
	if (remoteCustom && $appearNote.myReaction !== reaction) {
		react(ev);
		return;
	}
	// 自分のリアクションを外すときは、その絵文字を起点にした吹き出しで確かめる。
	if ($appearNote.myReaction === reaction) {
		unreactAnchor.value = ev.currentTarget as HTMLElement;
		return;
	}
	void changeReaction(reaction);
}

const unreactAnchor = shallowRef<HTMLElement | null>(null);

function confirmUnreact() {
	const reaction = $appearNote.myReaction;
	unreactAnchor.value = null;
	if (reaction) void changeReaction(reaction, true);
}

async function toggleThread() {
	threadOpen.value = !threadOpen.value;
	if (!threadOpen.value || replies.value.length > 0 || threadLoading.value) return;
	threadLoading.value = true;
	try {
		replies.value = (await misskeyApi('notes/replies', { noteId: appearNote.id, limit: 10 })).slice().reverse();
	} catch {
		threadOpen.value = false;
	} finally {
		threadLoading.value = false;
	}
}

function measure() {
	const side = sideEl.value;
	if (side) {
		const rows = Math.max(1, Math.floor((side.clientHeight + 14) / 56));
		if (rows !== sideRows.value) sideRows.value = rows;
	}
	const inline = inlineEl.value;
	if (inline && inline.children.length > 0) {
		const first = inline.children[0] as HTMLElement;
		const hidden = Array.from(inline.children).filter(child => (child as HTMLElement).offsetTop > first.offsetTop + 2).length;
		const over = inline.scrollHeight > first.offsetHeight + 2;
		inlineOverflow.value = over ? inline.scrollHeight : 0;
		inlineHidden.value = hidden;
	}
}

let resizeObserver: ResizeObserver | null = null;
let measureFrame = 0;

function scheduleMeasure() {
	window.cancelAnimationFrame(measureFrame);
	measureFrame = window.requestAnimationFrame(measure);
}

onMounted(() => {
	resizeObserver = new ResizeObserver(scheduleMeasure);
	if (rootEl.value) resizeObserver.observe(rootEl.value);
	scheduleMeasure();
});
watch(reactions, () => nextTick(scheduleMeasure));

onBeforeUnmount(() => {
	resizeObserver?.disconnect();
	window.cancelAnimationFrame(measureFrame);
	if (utageTimer != null) window.clearInterval(utageTimer);
});
</script>

<style lang="scss" module>
.root {
	position: relative;
	border-bottom: 1px solid var(--hk3-divider);
	background: transparent;
	transition: background 380ms ease, box-shadow 380ms ease;

	&[data-thread-open] { background: var(--hk3-surface); }
	&[data-linked] { background: var(--hk3-accent-100); box-shadow: inset 0 0 0 2px var(--hk3-accent); }
	&[data-utage] { background: var(--hk3-accent-100); }
}

.utageFrame {
	// 線は矩形の辺を中心に描かれるため、線幅の半分だけ内側に置き、4辺とも同じ太さで要素内に収める。
	position: absolute;
	inset: 2px;
	width: calc(100% - 4px);
	height: calc(100% - 4px);
	overflow: visible;
	pointer-events: none;
	z-index: 2;
}

.utageTrack, .utageBar {
	fill: none;
	stroke-width: 4;
}

.utageTrack { stroke: var(--hk3-accent-200); }
.utageBar { stroke: var(--hk3-accent); transition: stroke-dasharray 1s linear; }

.linkBadge {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 2;
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 3px 8px;
	background: var(--hk3-accent);
	color: var(--hk3-bg);
	font-size: 11px;
	font-weight: 800;
}

.muted {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 14px 20px;
	color: var(--hk3-neutral-700);
	font-size: 13px;
}

.mutedButton {
	height: 30px;
	padding: 0 12px;
	border: 1px solid var(--hk3-divider);
	background: transparent;
	color: var(--hk3-text);
	font: inherit;
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;

	&:hover { border-color: var(--hk3-accent); }
}

.article {
	position: relative;
	display: grid;
	column-gap: 12px;
	row-gap: 8px;
	padding: 18px 20px;
	transition: grid-template-columns 480ms cubic-bezier(0.22, 1, 0.36, 1);

	.root[data-size="sm"] & { padding: 12px 14px; }
}

.renotedBy {
	grid-column: 1 / -1;
	min-width: 0;
	box-sizing: border-box;
	margin: -18px -20px 0;
	padding: 0 14px;
	border: 1px solid var(--hk3-renote-border);
	border-left: 3px solid var(--hk3-renote-accent);
	background: var(--hk3-renote-bg);
	font-size: 12px;
	color: var(--hk3-renote-fg);

	.root[data-size="sm"] & { margin: -12px -14px 0; padding: 0 10px; }
}

.renotedSummary {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
	min-height: 36px;
}

.renotedIcon {
	width: 18px;
	flex: none;
	color: var(--hk3-renote-accent);
}

.renotedName {
	flex: 0 1 auto;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: inherit;
	font-weight: 700;
}

.renotedTime { margin-left: auto; flex: none; white-space: nowrap; }

.unrenoteButton {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: none;
	min-height: 28px;
	gap: 5px;
	padding: 2px 7px;
	border: 1px solid var(--hk3-renote-border);
	border-radius: 6px;
	background: var(--hk3-bg);
	color: inherit;
	cursor: pointer;
	font: inherit;
	white-space: nowrap;

	&:hover, &:focus-visible { border-color: var(--hk3-renote-fg); }
	&:disabled { opacity: 0.5; cursor: wait; }
}

.unrenoteConfirm {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8px 12px;
	min-width: 0;
	padding: 8px 0;
	border-top: 1px solid var(--hk3-renote-border);
}

.unrenoteQuestion {
	flex: 1 1 180px;
	min-width: 0;
	font-weight: 600;
}

.unrenoteConfirmActions {
	display: flex;
	flex: 1 1 180px;
	justify-content: flex-end;
	gap: 8px;
	min-width: 0;
}

.unrenoteCancel, .unrenoteConfirmButton {
	min-height: 32px;
	padding: 5px 12px;
	border: 1px solid var(--hk3-renote-border);
	border-radius: 6px;
	cursor: pointer;
	font: inherit;
	font-weight: 600;
	white-space: normal;

	&:disabled { opacity: 0.5; cursor: wait; }
	&:focus-visible { outline: 2px solid var(--hk3-renote-accent); outline-offset: 2px; }
}

.unrenoteCancel {
	background: var(--hk3-bg);
	color: var(--hk3-renote-fg);
}

.unrenoteConfirmButton {
	background: var(--hk3-renote-fg);
	color: var(--hk3-bg);
}

.avatarCol {
	display: flex;
	flex-direction: column;
	align-items: center;
	align-self: stretch;
}

.avatar {
	width: 44px;
	height: 44px;
	flex: none;
	border-radius: 0 !important;

	:global(img), :global(.indicator) { border-radius: 0 !important; }

	.root[data-size="sm"] & { width: 36px; height: 36px; }
}

.threadLine {
	flex: 1;
	width: 2px;
	margin-top: 6px;
	margin-bottom: -18px;
	background: var(--hk3-neutral-500);
	opacity: 0;
	transform: scaleY(0);
	transform-origin: top;
	transition: opacity 260ms ease, transform 420ms cubic-bezier(0.22, 1, 0.36, 1);

	.root[data-thread-open] & { opacity: 1; transform: scaleY(1); }
	.root[data-size="sm"] & { margin-bottom: -12px; }
}

.body {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
}

.header {
	display: flex;
	align-items: baseline;
	gap: 8px;
	min-width: 0;
}

.name {
	flex: none;
	max-width: 60%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--hk3-text);
	font-weight: 700;
	font-size: 15px;

	.root[data-size="sm"] & { font-size: 14px; }
}

.acct {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 12px;
	color: var(--hk3-neutral-700);
}

.meta {
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: 6px;
	flex: none;
	font-size: 12px;
	color: var(--hk3-neutral-700);
	white-space: nowrap;
}

.time {
	color: inherit;
	font-variant-numeric: tabular-nums;
}

.muted700 { color: var(--hk3-neutral-700); flex: none; }

.replyTo {
	display: flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
	font-size: 12px;
	color: var(--hk3-neutral-700);
}

.replyToText {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	opacity: 0.8;
}

.cw {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
}

.cwText {
	font-size: 15px;
	.root[data-size="sm"] & { font-size: 14px; }
}

.cwButton {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 28px;
	border: 1px solid var(--hk3-divider);
	background: transparent;
	color: var(--hk3-text);
	cursor: pointer;

	&:hover { border-color: var(--hk3-accent); color: var(--hk3-accent-700); }
}

.text {
	margin: 0;
	font-size: 15px;
	line-height: 1.7;
	text-wrap: pretty;
	white-space: pre-wrap;
	overflow-wrap: anywhere;

	.root[data-size="sm"] & { font-size: 14px; }
}

.media {
	max-width: 480px;
}

.quote {
	display: grid;
	grid-template-columns: 26px minmax(0, 1fr);
	gap: 10px;
	padding: 10px 12px;
	border: 1px solid var(--hk3-divider);
	background: var(--hk3-surface);
	color: var(--hk3-text);

	&:hover { border-color: var(--hk3-accent); text-decoration: none; }
}

.quoteAvatar {
	width: 26px;
	height: 26px;
	border-radius: 0 !important;
	:global(img) { border-radius: 0 !important; }
}

.quoteBody {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.quoteName { font-size: 13px; }

.quoteText {
	font-size: 13px;
	line-height: 1.55;
	color: var(--hk3-neutral-800);
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.channel {
	align-self: flex-start;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-size: 12px;
	color: var(--hk3-accent-700);
}

.rxInline {
	display: flex;
	align-items: flex-start;
	gap: 6px;
	min-width: 0;
}

.rxInlineList {
	flex: 0 1 auto;
	min-width: 0;
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	overflow: hidden;
	transition: max-height 520ms cubic-bezier(0.22, 1, 0.36, 1);
}

.chip, .chipAdd, .chipMore {
	flex: none;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 38px;
	border: 1px solid var(--hk3-divider);
	background: var(--hk3-surface);
	color: var(--hk3-text);
	cursor: pointer;
	font: inherit;
	font-size: 14px;
	font-weight: 700;
	font-variant-numeric: tabular-nums;

	.root[data-size="sm"] & { height: 34px; }
	&:hover { border-color: var(--hk3-accent); }
}

.chip {
	gap: 8px;
	padding: 0 12px;

	&[data-mine] { background: var(--hk3-accent); border-color: var(--hk3-accent); color: var(--hk3-bg); }
}

.chipEmoji {
	--hk3-emoji: 20px;
	.root[data-size="sm"] & { --hk3-emoji: 16px; }
}

.chipAdd {
	width: 38px;
	padding: 0;
	border-style: dashed;
	background: transparent;
	color: var(--hk3-accent-700);
	transition: border-color 160ms ease, background 160ms ease;

	.root[data-size="sm"] & { width: 34px; }
	&:hover { border-style: solid; background: var(--hk3-accent-100); }
	&:active { background: var(--hk3-accent-200); }
}

.chipMore {
	gap: 4px;
	padding: 0 10px;
	border-color: var(--hk3-text);
	background: var(--hk3-bg);
	font-size: 13px;
	font-weight: 800;

	&[data-open] { background: var(--hk3-text); color: var(--hk3-bg); }
}

.smActions {
	position: relative;
	display: flex;
	gap: 2px;
	margin-left: -10px;
}

.smAction, .hoverAction {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 44px;
	height: 40px;
	border: 0;
	background: transparent;
	color: var(--hk3-neutral-800);
	cursor: pointer;
	font: inherit;
	font-size: 12px;
	font-variant-numeric: tabular-nums;

	&[data-active] { color: var(--hk3-accent-700); }
	&:hover { background: var(--hk3-accent-100); color: var(--hk3-accent-700); }
}

.smAction {
	gap: 5px;
	padding: 0 10px;
}

.convButton {
	align-self: flex-start;
	display: flex;
	align-items: center;
	gap: 12px;
	min-height: 44px;
	padding: 6px 12px 6px 6px;
	border: 1px solid var(--hk3-divider);
	background: var(--hk3-bg);
	color: var(--hk3-text);
	cursor: pointer;
	font: inherit;
	text-align: left;
	transition: background 260ms ease, border-color 260ms ease;

	&[data-open] { background: var(--hk3-accent-100); border-color: var(--hk3-accent); }
	&:hover { border-color: var(--hk3-accent); }
}

.convFaces {
	display: flex;
	flex: none;
}

.convFace {
	width: 28px;
	height: 28px;
	margin-right: -6px;
	border: 2px solid var(--hk3-bg);
	border-radius: 0 !important;
	box-sizing: border-box;
	:global(img) { border-radius: 0 !important; }
}

.convCount {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin-left: 6px;
	flex: none;
	font-size: 14px;
	font-weight: 800;
	color: var(--hk3-accent-700);
}

.convChevron {
	flex: none;
	color: var(--hk3-neutral-700);
	transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);

	.convButton[data-open] & { transform: rotate(180deg); }
}

.side {
	position: relative;
	align-self: stretch;
	min-height: 100px;
	border-left: 1px solid var(--hk3-divider);
}

.sideGrid {
	position: absolute;
	top: -4px;
	bottom: -4px;
	left: 8px;
	right: 0;
	overflow: hidden;
}

.sideChip, .sideAdd, .sideMore {
	position: absolute;
	// 並び順が変わったときは、跳ばずに新しい位置へ滑らかに移る。
	transition: left 280ms cubic-bezier(0.22, 1, 0.36, 1), top 280ms cubic-bezier(0.22, 1, 0.36, 1), background 200ms ease, border-color 200ms ease, color 200ms ease;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 52px;
	height: 50px;
	padding: 0 4px;
	border: 1px solid var(--hk3-divider);
	background: var(--hk3-surface);
	color: var(--hk3-text);
	cursor: pointer;
	font: inherit;
	font-size: 13px;
	font-weight: 700;
	font-variant-numeric: tabular-nums;

	&:hover { border-color: var(--hk3-accent); }
}

.sideChip {
	flex-direction: column;
	gap: 2px;

	&[data-mine] { background: var(--hk3-accent); border-color: var(--hk3-accent); color: var(--hk3-bg); }
}

.sideEmoji {
	--hk3-emoji: 20px;
}

// リアクションの絵文字は、画像・Unicode・読み込み失敗時の代替のどれでも同じ正方形の枠に収める。
// 付与・変更で描き直された直後も、画像の元の大きさで枠からはみ出して一部だけ見えることがないようにする。
.emojiBox {
	flex: none;
	display: inline-grid;
	place-items: center;
	width: var(--hk3-emoji);
	height: var(--hk3-emoji);
	overflow: visible;
	font-size: calc(var(--hk3-emoji) * 0.9);
	line-height: 1;

	> :global(*) {
		display: block;
		max-width: calc(var(--hk3-emoji) * 2);
		max-height: var(--hk3-emoji);
		width: auto;
		height: var(--hk3-emoji) !important;
		object-fit: contain;
		vertical-align: middle;
		transform: none !important;
		margin: 0;
	}
}

.sideAdd {
	padding: 0;
	border-style: dashed;
	background: transparent;
	color: var(--hk3-accent-700);
	transition: border-color 160ms ease, background 160ms ease;

	&:hover { border-style: solid; background: var(--hk3-accent-100); }
	&:active { background: var(--hk3-accent-200); }
}

.sideMore {
	gap: 3px;
	padding: 0;
	border-color: var(--hk3-text);
	background: var(--hk3-bg);
	font-size: 12px;
	font-weight: 800;

	&[data-open] { background: var(--hk3-text); color: var(--hk3-bg); }
}

.host {
	position: absolute;
	right: 16px;
	bottom: 14px;
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 6px;
	background: var(--hk3-neutral-200);
	color: var(--hk3-neutral-800);
	font-size: 11px;
	font-weight: 700;
	pointer-events: none;

	.root[data-size="sm"] & { position: static; grid-column: 2; justify-self: start; }
}

// ノートごとの操作バーは本文に重ねず、ノートの上端の区切り線にまたがせる(下半分は上余白18pxの中に収まる)。
// 一覧の先頭のノートは上が切れるため、下端の区切り線にまたがせる。
.hoverBar {
	position: absolute;
	top: -17px;
	z-index: 6;

	.root:first-child > & { top: auto; bottom: -17px; }
	.root[data-renote] > & { top: auto; bottom: -17px; }
	display: flex;
	background: var(--hk3-bg);
	border: 1px solid var(--hk3-divider);
	box-shadow: var(--hk3-shadow-md);
}

.hoverAction {
	height: 32px;
	gap: 6px;
	padding: 0 12px;
	border-right: 1px solid var(--hk3-divider);

	&:last-child { border-right: 0; }
}

.tree {
	display: grid;
	grid-template-rows: 0fr;
	transition: grid-template-rows 520ms cubic-bezier(0.22, 1, 0.36, 1);

	&[data-open] { grid-template-rows: 1fr; }
}

.treeInner {
	overflow: hidden;
	min-height: 0;
}

.treeList {
	display: flex;
	flex-direction: column;
	padding: 0 20px 16px;

	.root[data-size="sm"] & { padding: 0 14px 12px; }
}

.treeLoading {
	padding: 8px 0 8px 54px;
}

.treeRow {
	display: grid;
	grid-template-columns: 44px 30px minmax(0, 1fr);
	column-gap: 10px;
	opacity: 0;
	transform: translateY(-10px);
	transition: opacity 340ms ease 0ms, transform 460ms cubic-bezier(0.22, 1, 0.36, 1) 0ms;

	.root[data-size="sm"] & { grid-template-columns: 36px 30px minmax(0, 1fr); }

	.tree[data-open] & {
		opacity: 1;
		transform: translateY(0);
		transition-delay: var(--hk3-delay), var(--hk3-delay);
	}
}

.treeRail { position: relative; }

.treeRailV {
	position: absolute;
	left: calc(50% - 1px);
	top: 0;
	bottom: 0;
	width: 2px;
	background: var(--hk3-neutral-500);
}

.treeRailEnd { bottom: auto; height: 25px; }

.treeRailH {
	position: absolute;
	left: calc(50% - 1px);
	top: 23px;
	width: calc(50% + 11px);
	height: 2px;
	background: var(--hk3-neutral-500);
}

.treeAvatar {
	margin-top: 9px;
	width: 30px;
	height: 30px;
	border-radius: 0 !important;
	:global(img) { border-radius: 0 !important; }
}

.treeBubble {
	margin: 6px 0;
	padding: 8px 12px;
	display: flex;
	flex-direction: column;
	gap: 3px;
	min-width: 0;
	background: var(--hk3-bg);
	border: 1px solid var(--hk3-divider);
	color: var(--hk3-text);

	&:hover { border-color: var(--hk3-accent); text-decoration: none; }
}

.treeHead {
	display: flex;
	align-items: baseline;
	gap: 8px;
	font-size: 13px;
}

.treeTime {
	margin-left: auto;
	font-size: 12px;
	color: var(--hk3-neutral-700);
	font-variant-numeric: tabular-nums;
}

.treeText {
	font-size: 14px;
	line-height: 1.6;
	text-wrap: pretty;
	overflow-wrap: anywhere;
}

.treeReply {
	margin-top: 6px;
	display: flex;
	align-items: center;
	gap: 10px;
	height: 40px;
	padding: 0 12px;
	border: 1px solid var(--hk3-divider);
	background: var(--hk3-bg);
	color: var(--hk3-neutral-700);
	cursor: pointer;
	font: inherit;
	font-size: 14px;
	text-align: left;

	span { flex: 1; }
	&:hover { border-color: var(--hk3-accent); color: var(--hk3-accent-700); }
}

@media (prefers-reduced-motion: reduce) {
	.root, .article, .threadLine, .tree, .treeRow, .convChevron, .rxInlineList, .sideChip, .sideAdd, .sideMore { transition: none !important; }
}
</style>
