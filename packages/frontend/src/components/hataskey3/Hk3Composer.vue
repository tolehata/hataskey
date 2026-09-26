<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
Hataskey UI 3: 画面下の投稿欄。返信・引用・チャンネルの文脈、注釈、投票、添付、公開範囲を扱う。
-->
<template>
<div ref="rootEl" :class="$style.root" :data-compact="compact ? 'true' : undefined" :data-menu="menuPlacement">
	<div v-if="toolsOpen" :class="$style.toolsMenu" role="menu">
		<button v-for="tool in tools" :key="tool.id" type="button" role="menuitemcheckbox" :aria-checked="tool.active" :class="$style.toolItem" :data-active="tool.active ? 'true' : undefined" @click="runTool(tool.id, $event)"><component :is="tool.icon" :size="18"/>{{ tool.label }}</button>
	</div>

	<div :class="$style.ctxWrap" :data-open="context ? 'true' : undefined">
		<div :class="$style.ctxClip">
			<div ref="ctxEl" :class="$style.ctx" :data-kind="shownContext?.kind">
				<div :class="$style.ctxHead">
					<component :is="shownContext?.kind === 'quote' ? Quote : shownContext?.kind === 'channel' ? Tv : Reply" :size="16" :class="$style.ctxIcon"/>
					<b :class="$style.ctxKind">{{ shownContext?.kind === 'quote' ? copy.quote : shownContext?.kind === 'channel' ? copy.channel : copy.reply }}</b>
					<MkAvatar v-if="shownContext?.note" :user="shownContext.note.user" :class="$style.ctxAvatar"/>
					<b :class="$style.ctxName"><MkUserName v-if="shownContext?.note" :user="shownContext.note.user"/><template v-else-if="shownContext?.channel">{{ shownContext.channel.name }}</template></b>
					<button type="button" :class="$style.ctxClear" :title="copy.clearContext" @click="clearContext"><X :size="16"/></button>
				</div>
				<span v-if="shownContext?.note" :class="$style.ctxText"><Mfm :text="shownContext.note.cw ?? shownContext.note.text ?? ''" :plain="true" :author="shownContext.note.user"/></span>
			</div>
		</div>
	</div>

	<div v-if="!composerChannel && visibility === 'specified'" :class="$style.recipients">
		<span :class="$style.recipientsLabel"><AtSign :size="14"/>{{ copy.recipients }}</span>
		<button v-for="user in visibleUsers" :key="user.id" type="button" :class="$style.recipient" :title="copy.removeRecipient" @click="removeVisibleUser(user)"><MkAvatar :user="user" :class="$style.recipientAvatar"/><MkUserName :user="user"/><X :size="13"/></button>
		<button type="button" :class="$style.recipientAdd" @click="pickMention"><Plus :size="14"/>{{ copy.addRecipient }}</button>
	</div>

	<div v-if="cwEnabled" :class="$style.cwRow">
		<EyeOff :size="16"/>
		<input v-model="cwText" maxlength="100" :placeholder="copy.cwPlaceholder" :class="$style.cwInput"/>
	</div>

	<div v-if="pollEnabled" :class="$style.poll">
		<div v-for="(_, index) in pollChoices" :key="index" :class="$style.pollRow">
			<input v-model="pollChoices[index]" :placeholder="i18n.tsx._hata._hataskeyUi3.pollChoice({ number: (index + 1).toString() })" :class="$style.pollInput"/>
			<button v-if="pollChoices.length > 2" type="button" :class="$style.iconBtn" :title="i18n.ts.remove" @click="pollChoices.splice(index, 1)"><X :size="15"/></button>
		</div>
		<div :class="$style.pollFoot">
			<button v-if="pollChoices.length < 10" type="button" :class="$style.textBtn" @click="pollChoices.push('')"><Plus :size="15"/>{{ copy.addPollChoice }}</button>
			<label :class="$style.check"><input v-model="pollMultiple" type="checkbox"/>{{ copy.pollMultiple }}</label>
			<label :class="$style.check">{{ copy.pollDeadline }}
				<select v-model="pollExpiredAfterUnit" :class="$style.select">
					<option v-if="pollExpiresAt != null" value="original">{{ new Date(pollExpiresAt).toLocaleString(versatileLang) }}</option>
					<option value="infinite">{{ copy.pollNoDeadline }}</option>
					<option value="hour">{{ copy.pollOneHour }}</option>
					<option value="day">{{ copy.pollOneDay }}</option>
					<option value="week">{{ copy.pollOneWeek }}</option>
				</select>
			</label>
		</div>
	</div>

	<MkEventEditor v-if="event" v-model="event" @destroyed="event = null"/>
	<XPostFormAttaches v-model="draftFiles" @detach="removeDraftFile" @changeSensitive="updateDraftFileSensitive" @changeName="updateDraftFileName"/>
	<MkHataPostDelayStatus v-if="postDelay.active.value" :class="$style.delay" :pattern="i18n.ts._hata._postDelay.countdown" :seconds="postDelay.remainingSeconds.value" :progress="postDelay.progress.value" :cancelLabel="i18n.ts._hata._postDelay.cancel" :sendNowLabel="i18n.ts._hata._postDelay.sendNow" @cancel="cancelPostDelay" @sendNow="postDelay.sendNow()"/>

	<section v-if="!compact && draftText.trim().length > 0 && sendState === 'idle'" :class="$style.preview">
		<span :class="$style.previewLabel"><Eye :size="13"/>{{ copy.preview }}</span>
		<div :class="$style.previewBody"><Mfm :text="draftText" :author="$i ?? undefined" :nyaize="'respect'"/></div>
	</section>

	<div v-if="editingNote" :class="$style.editing">
		<Pencil :size="15"/><b>{{ i18n.ts.edit }}</b>
		<button type="button" :class="$style.ctxClear" :title="i18n.ts.cancel" @click="cancelEditing"><X :size="16"/></button>
	</div>
	<div :class="$style.pill" :style="pillStyle" :data-focused="focused ? 'true' : undefined" :data-waiting="postDelay.active.value ? 'true' : undefined">
		<span v-if="postDelay.active.value" :class="$style.delayRail" aria-hidden="true"><span :style="{ transform: `scaleX(${postDelay.progress.value})` }"></span></span>
		<textarea
			ref="inputEl"
			v-model="draftText"
			rows="1"
			:class="$style.input"
			:placeholder="placeholder"
			@input="resizeInput"
			@focus="focused = true"
			@blur="focused = false"
			@keydown.ctrl.enter.prevent="submit"
			@keydown.meta.enter.prevent="submit"
		></textarea>
		<div :class="$style.row">
			<button type="button" :class="$style.iconBtn" :data-active="toolsOpen ? 'true' : undefined" :title="copy.postTools" :aria-expanded="toolsOpen" @click="toolsOpen = !toolsOpen; visMenuOpen = false"><LayoutGrid :size="18"/></button>
			<button type="button" :class="$style.iconBtn" :title="copy.attach" @click="openAttachmentMenu"><Paperclip :size="18"/></button>
			<button type="button" :class="$style.iconBtn" :data-active="cwEnabled ? 'true' : undefined" :title="copy.cw" :aria-pressed="cwEnabled" @click="cwEnabled = !cwEnabled"><EyeOff :size="18"/></button>
			<template v-if="!compact">
				<span :class="$style.sep"></span>
				<template v-for="(slot, index) in shortcutSlots" :key="index">
					<button v-if="slot" :ref="el => setSlotRef(index, el)" type="button" :class="$style.shortcut" :data-active="slot.active ? 'true' : undefined" :title="slot.label" @click="runTool(slot.id, $event)"><component :is="slot.icon" :size="15"/></button>
					<button v-else :ref="el => setSlotRef(index, el)" type="button" :class="[$style.shortcut, $style.shortcutEmpty]" :title="copy.addShortcut" :aria-label="copy.addShortcut" @click="chooseShortcut(index, $event)"><Plus :size="15"/></button>
				</template>
			</template>
			<button v-if="emojiPosition === 'afterShortcuts'" type="button" :class="$style.iconBtn" :title="copy.emoji" @click="openEmojiPicker"><Smile :size="18"/></button>
			<span :class="$style.spacer"></span>
			<button v-if="emojiPosition === 'beforeVisibility'" type="button" :class="$style.iconBtn" :title="copy.emoji" @click="openEmojiPicker"><Smile :size="18"/></button>
			<div :class="$style.visWrap">
				<button type="button" :class="$style.visBtn" :data-open="visMenuOpen ? 'true' : undefined" :title="copy.visibility" :disabled="composerChannel != null" @click="visMenuOpen = !visMenuOpen; toolsOpen = false">
					<component :is="currentVisibility.icon" :size="15"/><span v-if="!compact" :class="$style.btnLabel">{{ currentVisibility.label }}</span><ChevronUp :size="13" :class="$style.visChevron"/>
				</button>
				<div v-if="visMenuOpen" :class="$style.visMenu" role="menu">
					<button v-for="v in visibilityOptions" :key="v.value" type="button" role="menuitemradio" :aria-checked="v.value === visibility" :class="$style.visItem" :data-active="v.value === visibility ? 'true' : undefined" @click="setVisibility(v.value)"><component :is="v.icon" :size="16"/><span>{{ v.label }}</span><Check v-if="v.value === visibility" :size="15"/></button>
				</div>
			</div>
			<button type="button" :class="$style.fedBtn" :data-local="effectiveLocalOnly ? 'true' : undefined" :title="effectiveLocalOnly ? copy.localOnlyTitle : copy.federateTitle" :disabled="composerChannel != null" @click="toggleLocalOnly">
				<component :is="effectiveLocalOnly ? GlobeLock : Rocket" :size="15"/><span v-if="!compact" :class="$style.btnLabel">{{ effectiveLocalOnly ? copy.localOnly : copy.federate }}</span>
			</button>
			<div :class="$style.meter" :title="copy.remaining" :data-over="overLimit ? 'true' : undefined">
				<span :class="$style.meterFill" :style="{ height: `${Math.min(100, characterCount / maxLength * 100)}%` }"></span>
				<span :class="$style.odo">
					<span v-for="(d, i) in odometer" :key="i" :class="$style.odoDigit" :style="{ opacity: d.visible ? 1 : 0 }"><span :class="$style.odoReel" :style="{ transform: `translateY(${-d.value * 14}px)`, transitionDelay: `${(odometer.length - 1 - i) * 40}ms` }"><span v-for="g in 10" :key="g">{{ g - 1 }}</span></span></span>
				</span>
			</div>
			<button type="button" :class="$style.send" :data-state="sendState" :title="postDelay.active.value ? copy.cancelWait : copy.post" :disabled="!postDelay.active.value && !canSubmit" @click="postDelay.active.value ? cancelPostDelay() : submit()">
				<LoaderCircle v-if="sendState === 'sending'" :size="19" :class="$style.spin"/>
				<Check v-else-if="sendState === 'success'" :size="19"/>
				<span v-else-if="sendState === 'countdown'" :class="$style.sendCount" :style="{ '--hk3-delay-progress': postDelay.progress.value }">
					<Transition :name="reducedMotion ? '' : 'hk3-count'"><span :key="postDelay.remainingSeconds.value" :class="$style.sendDigit">{{ postDelay.remainingSeconds.value }}</span></Transition>
					<X :size="17" :class="$style.sendCancel"/>
				</span>
				<SendHorizontal v-else :size="19"/>
			</button>
		</div>
	</div>
	<Hk3ShortcutGuide v-if="guideAnchor" :anchor="guideAnchor" :text="copy.shortcutGuide" :okLabel="i18n.ts.ok" @close="guideAnchor = null"/>
</div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { AtSign, CalendarPlus, ChartBar, Check, ChevronUp, Code, Eye, EyeOff, Globe, Hash, House, LayoutGrid, LoaderCircle, Lock, Mail, Maximize2, Palette, Paperclip, Pencil, Plus, Quote, Reply, Rocket, GlobeLock, SendHorizontal, Smile, Heart, Tv, X } from '@lucide/vue';
import type * as Misskey from 'cherrypick-js';
import type { Component } from 'vue';
import type { PostFormProps } from '@/types/post-form.js';
import XPostFormAttaches from '@/components/MkPostFormAttaches.vue';
import MkEventEditor from '@/components/MkEventEditor.vue';
import MkHataPostDelayStatus from '@/components/MkHataPostDelayStatus.vue';
import * as os from '@/os.js';
import { $i, incNotesCount, notesCount } from '@/i.js';
import { i18n } from '@/i18n.js';
import { versatileLang } from '@/utility/intl-const.js';
import { instance } from '@/instance.js';
import { prefer } from '@/preferences.js';
import { store } from '@/store.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { chooseDriveFile, chooseFileFromPcAndUpload, chooseFileFromUrl } from '@/utility/drive.js';
import { emojiPicker } from '@/utility/emoji-picker.js';
import { mfmFunctionPicker } from '@/utility/mfm-function-picker.js';
import { createPostSendDelayController, postSendDelayEnabled, postSendDelaySeconds } from '@/utility/post-send-delay.js';
import { Autocomplete } from '@/utility/autocomplete.js';
import { deepClone } from '@/utility/clone.js';
import { getPluginHandlers } from '@/plugin.js';
import { globalEvents } from '@/events.js';
import { claimAchievement } from '@/utility/achievements.js';
import { hk3CanAdoptPostForm, hk3ComposerLink, hk3PostedNote, pushHk3Toast } from './hk3-state.js';
import { HK3_COMPOSER_TOOL_IDS, hk3ComposerToolLabel, normalizeHk3ComposerShortcuts } from './hk3-composer-tools.js';
import type { Hk3ComposerToolId } from './hk3-composer-tools.js';
import Hk3ShortcutGuide from './Hk3ShortcutGuide.vue';

const props = withDefaults(defineProps<{
	compact?: boolean;
	// デッキの投稿窓・カラムでは上に開くと枠からはみ出すため、メニューを下へ開く。
	menuPlacement?: 'up' | 'down';
}>(), {
	compact: false,
	menuPlacement: 'up',
});

type Visibility = 'public' | 'home' | 'followers' | 'specified';
type Channel = { id: string; name: string; isPrivate?: boolean };
type ComposerContext = { kind: 'reply' | 'quote' | 'channel'; note?: Misskey.entities.Note; channel: Channel | null };
type ToolId = Hk3ComposerToolId;
type SendState = 'idle' | 'countdown' | 'sending' | 'success' | 'failure';

const copy = i18n.ts._hata._hataskeyUi3;
const MkDrawingTool = defineAsyncComponent(() => import('@/components/MkDrawingTool.vue'));

const rootEl = shallowRef<HTMLElement | null>(null);
const inputEl = shallowRef<HTMLTextAreaElement | null>(null);
const ctxEl = shallowRef<HTMLElement | null>(null);
const draftText = ref('');
const draftFiles = ref<Misskey.entities.DriveFile[]>([]);
const cwEnabled = ref(false);
const cwText = ref('');
const pollEnabled = ref(false);
const pollChoices = ref(['', '']);
const pollMultiple = ref(false);
const pollExpiresAt = ref<number | null>(null);
const pollExpiredAfterUnit = ref<'original' | 'infinite' | 'hour' | 'day' | 'week'>('infinite');
const event = ref<any | null>(null);
const reactionAcceptance = ref<Misskey.entities.Note['reactionAcceptance']>(null);
const visibility = ref<Visibility>((prefer.s.rememberNoteVisibility ? store.s.visibility : prefer.s.defaultNoteVisibility) as Visibility);
const localOnly = ref<boolean>(prefer.s.rememberNoteVisibility ? store.s.localOnly : prefer.s.defaultNoteLocalOnly);
const visibleUsers = ref<Misskey.entities.UserLite[]>([]);
const context = ref<ComposerContext | null>(null);
// 「編集」で開いたときの元ノート。送信は新規投稿ではなく、このノートの更新になる。
const editingNote = shallowRef<Misskey.entities.Note | null>(null);
const lastContext = ref<ComposerContext | null>(null);
const toolsOpen = ref(false);
const visMenuOpen = ref(false);
const focused = ref(false);
const submitting = ref(false);
const sendState = ref<SendState>('idle');
const postDelay = createPostSendDelayController();
const reducedMotion = computed(() => !prefer.r.animation.value);

// 公開範囲ごとに枠の色を変える(投稿フォームの設定を共有)。レイアウトを動かさないよう内側の影で描き、送信待ちの間は進捗表示に譲る。
const pillStyle = computed(() => {
	if (postDelay.active.value || !prefer.r['postFormVisibilityBorder.enabled'].value) return undefined;
	const width = prefer.r['postFormVisibilityBorder.width'].value;
	const colorKey = composerChannel.value ? 'public' : visibility.value;
	const color = prefer.r[`postFormVisibilityBorder.color.${colorKey}`].value;
	return { borderColor: color, boxShadow: `inset 0 0 0 ${Math.max(0, width - 1)}px ${color}` };
});
let autocomplete: Autocomplete | null = null;

const shownContext = computed(() => context.value ?? lastContext.value);
const composerChannel = computed(() => context.value?.channel ?? null);
const effectiveVisibility = computed<Visibility>(() => composerChannel.value ? 'public' : visibility.value);
const effectiveLocalOnly = computed(() => composerChannel.value ? true : localOnly.value);
const maxLength = computed(() => instance.maxNoteTextLength ?? 3000);
const characterCount = computed(() => Array.from(draftText.value).length);
const overLimit = computed(() => characterCount.value > maxLength.value);
const canSubmit = computed(() => !submitting.value && !overLimit.value && (draftText.value.trim().length > 0 || draftFiles.value.length > 0 || pollEnabled.value || event.value != null));
const placeholder = computed(() => {
	if (context.value?.kind === 'reply' && context.value.note) return i18n.tsx._hata._hataskeyUi3.replyTo({ name: context.value.note.user.name || context.value.note.user.username });
	if (context.value?.kind === 'quote') return copy.quotePlaceholder;
	if (composerChannel.value) return i18n.tsx._hata._hataskeyUi3.postToChannel({ name: composerChannel.value.name });
	return copy.whatsHappening;
});

// 残り文字数は桁ごとのリールで表す。先頭のゼロは隠し、変化した桁だけが下位から順に回る。
const odometer = computed(() => {
	const digits = String(maxLength.value).length;
	const text = String(Math.abs(maxLength.value - characterCount.value)).padStart(digits, '0');
	const lead = text.search(/[1-9]/);
	return text.split('').map((ch, i) => ({ value: Number(ch), visible: lead === -1 ? i === digits - 1 : i >= lead }));
});

const visibilityOptions: { value: Visibility; label: string; icon: Component }[] = [
	{ value: 'public', label: i18n.ts._visibility.public, icon: Globe },
	{ value: 'home', label: i18n.ts._visibility.home, icon: House },
	{ value: 'followers', label: i18n.ts._visibility.followers, icon: Lock },
	{ value: 'specified', label: i18n.ts._visibility.specified, icon: Mail },
];
const currentVisibility = computed(() => composerChannel.value
	? { label: copy.channel, icon: Tv }
	: visibilityOptions.find(v => v.value === visibility.value) ?? visibilityOptions[0]);

const TOOL_ICONS: Record<ToolId, Component> = {
	poll: ChartBar, mention: AtSign, hashtag: Hash, event: CalendarPlus, mfm: Code, drawing: Palette, reactionAcceptance: Heart, full: Maximize2,
};
// 投稿機能メニュー用(本体の popupMenu は Tabler アイコン名で描く)。
const TOOL_MENU_ICONS: Record<ToolId, string> = {
	poll: 'ti ti-chart-bar', mention: 'ti ti-at', hashtag: 'ti ti-hash', event: 'ti ti-calendar-plus', mfm: 'ti ti-code', drawing: 'ti ti-palette', reactionAcceptance: 'ti ti-heart', full: 'ti ti-arrows-maximize',
};
const tools = computed(() => HK3_COMPOSER_TOOL_IDS.filter(id => !editingNote.value || (id !== 'poll' && id !== 'full')).map(id => ({ id, label: hk3ComposerToolLabel(id), icon: TOOL_ICONS[id], active: isToolActive(id) })));

// よく使う機能のショートカット2枠。未設定の枠は＋で、押すと機能を選べる。
// 絵文字ボタンの位置。既定はショートカットのすぐ右、設定で公開範囲のすぐ左へ移せる。
const emojiPosition = computed(() => prefer.r.hataskeyUi3ComposerEmojiPosition.value === 'beforeVisibility' ? 'beforeVisibility' : 'afterShortcuts');
const shortcuts = computed(() => normalizeHk3ComposerShortcuts(prefer.r.hataskeyUi3ComposerShortcut1.value, prefer.r.hataskeyUi3ComposerShortcut2.value));
const shortcutSlots = computed(() => shortcuts.value.map(id => id == null ? null : tools.value.find(tool => tool.id === id) ?? null));
const slotEls: (HTMLElement | null)[] = [];
const guideAnchor = shallowRef<HTMLElement | null>(null);

function setSlotRef(index: number, el: unknown) {
	slotEls[index] = el instanceof HTMLElement ? el : null;
}

function chooseShortcut(index: number, ev: MouseEvent) {
	const used = new Set(shortcuts.value.filter((id): id is ToolId => id != null));
	os.popupMenu([
		{ type: 'label', text: copy.chooseShortcut },
		...HK3_COMPOSER_TOOL_IDS.filter(id => !used.has(id) && (!editingNote.value || (id !== 'poll' && id !== 'full'))).map(id => ({
			type: 'button' as const,
			icon: TOOL_MENU_ICONS[id],
			text: hk3ComposerToolLabel(id),
			action: () => { void setShortcut(index, id); },
		})),
	], ev.currentTarget as HTMLElement);
}

async function setShortcut(index: number, id: ToolId) {
	prefer.commit(index === 0 ? 'hataskeyUi3ComposerShortcut1' : 'hataskeyUi3ComposerShortcut2', id);
	// 初めて選んだときだけ、変更方法をその枠を起点に案内する(アカウントごとに1回)。
	if (prefer.s.hataskeyUi3ShortcutGuideShown) return;
	prefer.commit('hataskeyUi3ShortcutGuideShown', true);
	await nextTick();
	const anchor = slotEls[index];
	if (anchor && anchor.offsetParent != null) guideAnchor.value = anchor;
}

function isToolActive(id: ToolId): boolean {
	if (id === 'poll') return pollEnabled.value;
	if (id === 'event') return event.value != null;
	if (id === 'reactionAcceptance') return reactionAcceptance.value != null;
	return false;
}

function runTool(id: ToolId, ev: MouseEvent) {
	const anchor = ev.currentTarget as HTMLElement;
	toolsOpen.value = false;
	if (editingNote.value && (id === 'poll' || id === 'full')) return;
	switch (id) {
		case 'poll':
			pollEnabled.value = !pollEnabled.value;
			if (pollChoices.value.length < 2) pollChoices.value = ['', ''];
			break;
		case 'mention': void pickMention(); break;
		case 'hashtag':
			draftText.value += draftText.value && !draftText.value.endsWith(' ') ? ' #' : '#';
			void nextTick(() => inputEl.value?.focus());
			break;
		case 'event':
			event.value = event.value == null ? { title: '', start: Date.now(), end: null, metadata: {} } : null;
			break;
		case 'mfm':
			if (inputEl.value) mfmFunctionPicker(anchor, inputEl.value, draftText);
			break;
		case 'drawing': openDrawingTool(); break;
		case 'reactionAcceptance': void selectReactionAcceptance(); break;
		case 'full': openFullComposer(); break;
	}
}

function resizeInput() {
	const el = inputEl.value;
	if (!el) return;
	el.style.height = 'auto';
	const max = props.compact ? 120 : 160;
	el.style.height = `${Math.max(42, Math.min(max, el.scrollHeight))}px`;
	el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
}

watch(draftText, () => { void nextTick(resizeInput); }, { flush: 'post' });

watch(context, (next, prev) => {
	if (next) lastContext.value = next;
	hk3ComposerLink.value = next?.note && next.kind !== 'channel' ? { kind: next.kind, noteId: next.note.id } : null;
	if (next && prev && next !== prev && ctxEl.value?.animate && prefer.s.animation) {
		ctxEl.value.animate([{ transform: 'translateY(10px)', opacity: 0.3 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
	}
});

function clearContext() {
	context.value = null;
}

function mentionUser(user: Misskey.entities.UserLite) {
	const mention = `@${user.username}${user.host ? `@${user.host}` : ''}`;
	if (!draftText.value.includes(mention)) draftText.value = `${draftText.value}${draftText.value ? ' ' : ''}${mention} `;
	if (visibility.value === 'specified' && !visibleUsers.value.some(u => u.id === user.id)) visibleUsers.value.push(user);
}

async function pickMention() {
	try {
		const user = await os.selectUser({ includeSelf: true, localOnly: localOnly.value });
		if (visibility.value === 'specified' && !visibleUsers.value.some(u => u.id === user.id)) visibleUsers.value.push(user);
		else mentionUser(user);
	} catch { /* 選択の取り消し */ }
}

function removeVisibleUser(user: Misskey.entities.UserLite) {
	visibleUsers.value = visibleUsers.value.filter(u => u.id !== user.id);
}

function setVisibility(value: Visibility) {
	visibility.value = value;
	visMenuOpen.value = false;
	persistRememberedVisibility();
}

function toggleLocalOnly() {
	if (composerChannel.value) return;
	localOnly.value = !localOnly.value;
	persistRememberedVisibility();
}

function persistRememberedVisibility() {
	if (!prefer.s.rememberNoteVisibility || composerChannel.value) return;
	store.set('visibility', visibility.value);
	store.set('localOnly', localOnly.value);
}

function openEmojiPicker(ev: MouseEvent) {
	const input = inputEl.value;
	const start = input?.selectionStart ?? draftText.value.length;
	const end = input?.selectionEnd ?? start;
	emojiPicker.show(ev.currentTarget as HTMLElement, emoji => {
		draftText.value = `${draftText.value.slice(0, start)}${emoji}${draftText.value.slice(end)}`;
		void nextTick(() => {
			const caret = start + emoji.length;
			inputEl.value?.focus();
			inputEl.value?.setSelectionRange(caret, caret);
		});
	});
}

function openAttachmentMenu(ev: MouseEvent) {
	const addFiles = async (loader: () => Promise<Misskey.entities.DriveFile[]>) => {
		try { draftFiles.value.push(...await loader()); } catch { /* 選択・アップロードの取り消し */ }
	};
	os.popupMenu([
		{ type: 'button', icon: 'ti ti-upload', text: i18n.ts.upload, action: () => addFiles(() => chooseFileFromPcAndUpload({ multiple: true })) },
		{ type: 'button', icon: 'ti ti-cloud', text: i18n.ts.fromDrive, action: () => addFiles(() => chooseDriveFile({ multiple: true })) },
		{ type: 'button', icon: 'ti ti-link', text: i18n.ts.fromUrl, action: () => addFiles(async () => [await chooseFileFromUrl()]) },
	], ev.currentTarget as HTMLElement);
}

function removeDraftFile(id: string) { draftFiles.value = draftFiles.value.filter(file => file.id !== id); }

function updateDraftFileSensitive(file: Misskey.entities.DriveFile, isSensitive: boolean) {
	const target = draftFiles.value.find(item => item.id === file.id);
	if (target) target.isSensitive = isSensitive;
}

function updateDraftFileName(file: Misskey.entities.DriveFile, name: string) {
	const target = draftFiles.value.find(item => item.id === file.id);
	if (target) target.name = name;
}

function openDrawingTool() {
	const { dispose } = os.popup(MkDrawingTool, { canAttach: true }, {
		done: (file: Misskey.entities.DriveFile) => {
			if (draftFiles.value.some(item => item.id === file.id)) return;
			if (draftFiles.value.length >= 16) {
				void os.alert({ type: 'warning', text: i18n.ts._hata._drawingTool.attachmentLimit });
				return;
			}
			draftFiles.value.push(file);
		},
		closed: () => dispose(),
	});
}

async function selectReactionAcceptance() {
	const selected = await os.select({
		title: i18n.ts.reactionAcceptance,
		items: [
			{ value: null, label: i18n.ts.all },
			{ value: 'likeOnlyForRemote' as const, label: i18n.ts.likeOnlyForRemote },
			{ value: 'nonSensitiveOnly' as const, label: i18n.ts.nonSensitiveOnly },
			{ value: 'nonSensitiveOnlyForLocalLikeOnlyForRemote' as const, label: i18n.ts.nonSensitiveOnlyForLocalLikeOnlyForRemote },
			{ value: 'likeOnly' as const, label: i18n.ts.likeOnly },
		],
		default: reactionAcceptance.value ?? null,
	});
	if (!selected.canceled) reactionAcceptance.value = selected.result;
}

function openFullComposer() {
	void os.postDirect({
		initialText: draftText.value,
		initialCw: cwEnabled.value ? cwText.value : undefined,
		initialFiles: draftFiles.value,
		initialVisibility: effectiveVisibility.value,
		initialLocalOnly: effectiveLocalOnly.value,
		initialVisibleUsers: visibleUsers.value as Misskey.entities.UserDetailed[],
		reply: context.value?.kind === 'reply' ? context.value.note : undefined,
		renote: context.value?.kind === 'quote' ? context.value.note : undefined,
		channel: composerChannel.value as Misskey.entities.Channel | null ?? undefined,
	}).then(() => clearComposer());
}

function clearComposer() {
	draftGeneration++;
	draftText.value = '';
	draftFiles.value = [];
	cwEnabled.value = false;
	cwText.value = '';
	pollEnabled.value = false;
	pollChoices.value = ['', ''];
	pollMultiple.value = false;
	pollExpiresAt.value = null;
	pollExpiredAfterUnit.value = 'infinite';
	event.value = null;
	reactionAcceptance.value = null;
	context.value = null;
	lastContext.value = null;
	editingNote.value = null;
	if (visibility.value === 'specified') visibleUsers.value = [];
}

let draftGeneration = 0;

/** 「削除して編集」「編集」: 元ノートの内容を投稿欄に戻す。 */
function restoreFromNote(init: Misskey.entities.Note, channel: Channel | null, updateMode: boolean) {
	const generation = draftGeneration;
	draftText.value = init.text ?? '';
	cwEnabled.value = init.cw != null;
	cwText.value = init.cw ?? '';
	if (!channel) {
		visibility.value = init.visibility as Visibility;
		localOnly.value = init.localOnly ?? false;
	}
	draftFiles.value = [...(init.files ?? [])];
	// 編集では投票を変えられないため、削除して編集のときだけ戻す。
	if (init.poll && !updateMode) {
		pollEnabled.value = true;
		pollChoices.value = init.poll.choices.map(choice => choice.text);
		pollMultiple.value = init.poll.multiple;
		const originalExpiry = init.poll.expiresAt ? new Date(init.poll.expiresAt).getTime() : null;
		pollExpiresAt.value = originalExpiry != null && originalExpiry > Date.now() ? originalExpiry : null;
		pollExpiredAfterUnit.value = pollExpiresAt.value == null ? 'infinite' : 'original';
	}
	const initEvent = (init as Misskey.entities.Note & { event?: { title: string; start: string | number; end: string | number | null; metadata: unknown } | null }).event;
	if (initEvent) {
		event.value = {
			title: initEvent.title,
			start: typeof initEvent.start === 'string' ? new Date(initEvent.start).getTime() : initEvent.start,
			end: typeof initEvent.end === 'string' ? new Date(initEvent.end).getTime() : initEvent.end,
			metadata: initEvent.metadata,
		};
	}
	reactionAcceptance.value = init.reactionAcceptance;
	visibleUsers.value = [];
	if (init.visibility === 'specified' && init.visibleUserIds?.length) {
		void misskeyApi('users/show', { userIds: init.visibleUserIds }).then(users => {
			if (generation === draftGeneration) visibleUsers.value = users;
		}).catch(error => {
			if (generation !== draftGeneration) return;
			console.error('Hataskey UI 3 recipients load failed', error);
			void os.alert({ type: 'error', text: i18n.ts._hata._externalTimeline._userPopup.loadFailed });
		});
	}
	editingNote.value = updateMode ? init : null;
	void nextTick(resizeInput);
}

function cancelEditing() {
	clearComposer();
}

function isAnnoyingMfm(text: string): boolean {
	return text.includes('$[x2') || text.includes('$[x3') || text.includes('$[x4') || text.includes('$[scale') || text.includes('$[position');
}

async function confirmWarnings(): Promise<boolean> {
	if (cwEnabled.value && cwText.value.trim() === '') {
		await os.alert({ type: 'warning', text: copy.cwRequired });
		return false;
	}
	if (prefer.s.showNoAltTextWarning && draftFiles.value.some(file => file.comment == null || file.comment.length === 0)) {
		const confirm = await os.actions({
			type: 'warning',
			text: copy.noAltText,
			actions: [
				{ value: 'post' as const, text: copy.postAnyway },
				{ value: 'cancel' as const, text: i18n.ts.goBack, primary: true },
			],
		});
		if (confirm.canceled || confirm.result === 'cancel') return false;
	}
	const warningText = cwEnabled.value ? cwText.value : draftText.value;
	if (effectiveVisibility.value === 'public' && isAnnoyingMfm(warningText)) {
		const confirm = await os.actions({
			type: 'warning',
			text: i18n.ts.thisPostMayBeAnnoying,
			actions: [
				{ value: 'home' as const, text: i18n.ts.thisPostMayBeAnnoyingHome },
				{ value: 'post' as const, text: i18n.ts.thisPostMayBeAnnoyingIgnore },
				{ value: 'cancel' as const, text: i18n.ts.thisPostMayBeAnnoyingCancel },
			],
		});
		if (confirm.canceled || confirm.result === 'cancel') return false;
		if (confirm.result === 'home') visibility.value = 'home';
	}
	return true;
}

function wait(ms: number) {
	return new Promise<void>(resolve => window.setTimeout(resolve, prefer.s.animation ? ms : 0));
}

function cancelPostDelay() {
	postDelay.cancel();
	sendState.value = 'idle';
}

async function submit() {
	if (!canSubmit.value || sendState.value !== 'idle') return;
	if (!composerChannel.value && visibility.value === 'specified' && visibleUsers.value.length === 0) {
		await os.alert({ type: 'warning', text: copy.recipientRequired });
		return;
	}
	const choices = pollChoices.value.map(value => value.trim()).filter(Boolean);
	if (pollEnabled.value && choices.length < 2) {
		await os.alert({ type: 'warning', text: copy.pollNeedsTwo });
		return;
	}
	if (!await confirmWarnings()) return;

	const expiredAfter = { original: null, infinite: null, hour: 3_600_000, day: 86_400_000, week: 604_800_000 }[pollExpiredAfterUnit.value];
	const submittedContext = context.value;
	let postData: Record<string, any> | null = {
		text: draftText.value === '' ? null : draftText.value,
		fileIds: draftFiles.value.length > 0 ? draftFiles.value.map(file => file.id) : undefined,
		visibility: effectiveVisibility.value,
		visibleUserIds: !composerChannel.value && visibility.value === 'specified' ? visibleUsers.value.map(user => user.id) : undefined,
		localOnly: effectiveLocalOnly.value,
		cw: cwEnabled.value ? cwText.value : null,
		channelId: composerChannel.value?.id,
		replyId: submittedContext?.kind === 'reply' ? submittedContext.note?.id : undefined,
		renoteId: submittedContext?.kind === 'quote' ? submittedContext.note?.id : undefined,
		poll: pollEnabled.value ? { choices, multiple: pollMultiple.value, expiresAt: pollExpiredAfterUnit.value === 'original' ? pollExpiresAt.value : null, expiredAfter } : undefined,
		event: event.value,
		reactionAcceptance: reactionAcceptance.value,
	};

	for (const interruptor of getPluginHandlers('note_post_interruptor')) {
		try {
			postData = await interruptor.handler(deepClone(postData)) as Record<string, any> | null;
		} catch (error) {
			console.error('Hataskey UI 3 plugin interruptor failed', error);
		}
	}
	if (postData == null || typeof postData !== 'object') {
		await os.alert({ type: 'error', text: copy.pluginInvalidPost });
		return;
	}

	const editing = editingNote.value;
	if (postSendDelayEnabled.value && !editing) {
		sendState.value = 'countdown';
		if (!await postDelay.begin(postSendDelaySeconds.value)) {
			sendState.value = 'idle';
			return;
		}
	}

	submitting.value = true;
	sendState.value = 'sending';
	try {
		if (editing) {
			const fileIds = Array.isArray(postData.fileIds) ? postData.fileIds : draftFiles.value.map(file => file.id);
			const originalPoll = editing.poll ? {
				choices: editing.poll.choices.map(choice => choice.text),
				multiple: editing.poll.multiple,
				// 期限切れの投票も、選択肢を変えなければ更新サービス側で維持される。
				expiresAt: editing.poll.expiresAt && new Date(editing.poll.expiresAt).getTime() > Date.now() ? new Date(editing.poll.expiresAt).getTime() : null,
				expiredAfter: null,
			} : null;
			await misskeyApi('notes/update', {
				noteId: editing.id,
				text: postData.text ?? '',
				cw: postData.cw ?? null,
				fileIds: fileIds.length > 0 || editing.files?.length ? fileIds : undefined,
				poll: originalPoll,
				event: postData.event ?? null,
				disableRightClick: editing.disableRightClick ?? false,
			} as any);
			sendState.value = 'success';
			pushHk3Toast({ icon: 'pencil', text: i18n.ts.noteEdited });
			clearComposer();
			await wait(900);
			return;
		}
		const result = await misskeyApi('notes/create', postData as any);
		const created = result.createdNote;
		if (created) {
			globalEvents.emit('notePosted', created);
			hk3PostedNote.value = created;
		}
		persistRememberedVisibility();
		incNotesCount();
		if (notesCount === 1) claimAchievement('notes1');
		const posted = String(postData.text ?? '').toLowerCase();
		if ((posted.includes('love') || posted.includes('❤')) && (posted.includes('cherrypick') || posted.includes('hataskey'))) claimAchievement('iLoveCherryPick');
		if (submittedContext?.kind === 'quote' && submittedContext.note?.userId === $i?.id && posted.length > 0) claimAchievement('selfQuote');
		const now = new Date();
		if (now.getHours() <= 3) claimAchievement('postedAtLateNight');
		if (now.getMinutes() === 0 && now.getSeconds() === 0) claimAchievement('postedAt0min0sec');
		sendState.value = 'success';
		pushHk3Toast({
			icon: submittedContext?.kind === 'reply' ? 'reply' : submittedContext?.kind === 'quote' ? 'quote' : 'send',
			text: (submittedContext?.kind === 'reply' ? copy.replied : submittedContext?.kind === 'quote' ? copy.quoted : copy.posted) + (effectiveLocalOnly.value && !composerChannel.value ? copy.localOnlySuffix : ''),
		});
		clearComposer();
		await wait(900);
	} catch (error) {
		console.error('Hataskey UI 3 post failed', error);
		sendState.value = 'failure';
		await os.alert({ type: 'error', text: copy.postFailed });
	} finally {
		submitting.value = false;
		sendState.value = 'idle';
	}
}

/** MkNote・ノート詳細などからの返信・引用要求を、この投稿欄で受け取る。 */
function adopt(request: PostFormProps): boolean {
	if (!hk3CanAdoptPostForm(request)) return false;
	if (request.initialNote) clearComposer();
	else draftGeneration++;

	const source = request.reply ?? request.renote ?? null;
	const channel = (request.channel ?? source?.channel ?? null) as Channel | null;
	if (request.reply) context.value = { kind: 'reply', note: request.reply, channel };
	else if (request.renote) context.value = { kind: 'quote', note: request.renote, channel };
	else if (channel) context.value = { kind: 'channel', channel };

	if (request.initialNote) restoreFromNote(request.initialNote, channel, request.updateMode === true);

	if (request.initialText) draftText.value = draftText.value.trim().length === 0 ? request.initialText : `${draftText.value} ${request.initialText}`;
	if (request.initialCw !== undefined) {
		cwEnabled.value = true;
		cwText.value = request.initialCw;
	}
	if (request.initialFiles?.length) {
		const known = new Set(draftFiles.value.map(file => file.id));
		draftFiles.value.push(...request.initialFiles.filter(file => !known.has(file.id)));
	}
	if (!channel && request.initialVisibility) visibility.value = request.initialVisibility as Visibility;
	if (!channel && request.initialLocalOnly !== undefined) localOnly.value = request.initialLocalOnly;
	if (request.initialVisibleUsers?.length) visibleUsers.value = [...request.initialVisibleUsers];
	if (request.specified) {
		visibility.value = 'specified';
		if (!visibleUsers.value.some(user => user.id === request.specified!.id)) visibleUsers.value.push(request.specified);
	}
	if (request.mention && !request.reply && !request.renote && !channel) mentionUser(request.mention);
	focus();
	return true;
}

function focus() {
	void nextTick(() => {
		inputEl.value?.focus({ preventScroll: true });
		resizeInput();
	});
}

function onDocumentPointerDown(ev: PointerEvent) {
	if (!toolsOpen.value && !visMenuOpen.value) return;
	const target = ev.target as Node | null;
	if (target && rootEl.value?.contains(target)) return;
	toolsOpen.value = false;
	visMenuOpen.value = false;
}

onMounted(() => {
	if (inputEl.value) autocomplete = new Autocomplete(inputEl.value, draftText);
	resizeInput();
	window.document.addEventListener('pointerdown', onDocumentPointerDown, true);
});

onBeforeUnmount(() => {
	autocomplete?.detach();
	autocomplete = null;
	postDelay.cancel();
	hk3ComposerLink.value = null;
	window.document.removeEventListener('pointerdown', onDocumentPointerDown, true);
});

defineExpose({ adopt, focus });
</script>

<style lang="scss" module>
.root {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 12px 20px 16px;
	border-top: 2px solid var(--hk3-divider);
	background: var(--hk3-bg);
	color: var(--hk3-text);

	&[data-compact] { padding: 8px 10px 10px; }
}

.toolsMenu, .visMenu {
	position: absolute;
	z-index: 20;
	padding: 6px;
	display: flex;
	flex-direction: column;
	gap: 2px;
	background: var(--hk3-bg);
	border: 1px solid var(--hk3-divider);
	box-shadow: var(--hk3-shadow-lg);
}

.toolsMenu {
	left: 10px;
	bottom: calc(100% - 4px);
	width: 240px;
	gap: 4px;

	.root[data-menu="down"] & { top: calc(100% - 4px); bottom: auto; }
}

.toolItem, .visItem {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 0 12px;
	border: 0;
	background: transparent;
	color: var(--hk3-text);
	cursor: pointer;
	font: inherit;
	font-size: 13px;
	font-weight: 700;
	text-align: left;

	&[data-active] { background: var(--hk3-accent-100); color: var(--hk3-accent-800); }
	&:hover { background: var(--hk3-accent-100); color: var(--hk3-accent-800); }
}

.toolItem { height: 46px; }
.visItem { height: 44px; span { flex: 1; } }

.ctxWrap {
	display: grid;
	grid-template-rows: 0fr;
	margin-bottom: -8px;
	transition: grid-template-rows 440ms cubic-bezier(0.22, 1, 0.36, 1), margin-bottom 440ms cubic-bezier(0.22, 1, 0.36, 1);

	&[data-open] { grid-template-rows: 1fr; margin-bottom: 0; }
}

.ctxClip {
	overflow: hidden;
	min-height: 0;
}

.ctx {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 6px 6px 8px 10px;
	background: var(--hk3-accent-100);
	border: 1px solid var(--hk3-accent-300);
	opacity: 0;
	transform: translateY(14px);
	transition: opacity 280ms ease, transform 440ms cubic-bezier(0.22, 1, 0.36, 1);

	.ctxWrap[data-open] & { opacity: 1; transform: translateY(0); }
}

.ctxHead {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
}

.ctxIcon { color: var(--hk3-accent-700); flex: none; }
.ctxKind { font-size: 12px; color: var(--hk3-accent-800); flex: none; }

.ctxAvatar {
	width: 22px;
	height: 22px;
	margin-left: 4px;
	flex: none;
	border-radius: 0 !important;
	:global(img) { border-radius: 0 !important; }
}

.ctxName {
	flex: 1;
	min-width: 0;
	font-size: 13px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.ctxClear {
	width: 30px;
	height: 30px;
	border: 0;
	background: transparent;
	color: var(--hk3-accent-800);
	cursor: pointer;
	display: grid;
	place-items: center;

	&:hover { background: var(--hk3-accent-200); }
}

.ctxText {
	font-size: 13px;
	line-height: 1.5;
	color: var(--hk3-neutral-800);
	padding: 0 0 0 24px;
	display: -webkit-box;
	-webkit-line-clamp: 1;
	-webkit-box-orient: vertical;
	overflow: hidden;

	.ctx[data-kind="quote"] & {
		padding: 6px 10px;
		background: var(--hk3-bg);
		border: 1px solid var(--hk3-accent-300);
		-webkit-line-clamp: 2;
	}
}

.recipients {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
}

.recipientsLabel {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
	font-weight: 700;
	color: var(--hk3-neutral-700);
}

.recipient, .recipientAdd {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	height: 30px;
	padding: 0 8px;
	border: 1px solid var(--hk3-divider);
	background: transparent;
	color: var(--hk3-text);
	cursor: pointer;
	font: inherit;
	font-size: 12px;

	&:hover { border-color: var(--hk3-accent); }
}

.recipientAvatar {
	width: 20px;
	height: 20px;
	border-radius: 0 !important;
	:global(img) { border-radius: 0 !important; }
}

.cwRow {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 0 10px;
	border: 1px solid var(--hk3-divider);
	background: var(--hk3-surface);
	color: var(--hk3-neutral-700);
}

.cwInput, .pollInput {
	flex: 1;
	min-width: 0;
	height: 36px;
	border: 0;
	background: transparent;
	color: var(--hk3-text);
	font: inherit;
	font-size: 14px;
	outline: none;
}

.poll {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 8px 10px;
	border: 1px solid var(--hk3-divider);
	background: var(--hk3-surface);
}

.pollRow {
	display: flex;
	align-items: center;
	gap: 4px;
	border-bottom: 1px solid var(--hk3-divider);
}

.pollFoot {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 12px;
	padding-top: 4px;
}

.check {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-size: 12px;
	font-weight: 700;
}

.select {
	height: 28px;
	border: 1px solid var(--hk3-divider);
	background: var(--hk3-bg);
	color: var(--hk3-text);
	font: inherit;
	font-size: 12px;
}

.textBtn {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	height: 28px;
	padding: 0 8px;
	border: 1px solid var(--hk3-divider);
	background: transparent;
	color: var(--hk3-text);
	cursor: pointer;
	font: inherit;
	font-size: 12px;
	font-weight: 700;

	&:hover { border-color: var(--hk3-accent); }
}

.preview {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 8px 12px;
	background: var(--hk3-surface);
	max-height: 120px;
	overflow: auto;
}

.previewLabel {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 11px;
	font-weight: 700;
	color: var(--hk3-neutral-700);
}

.previewBody {
	font-size: 14px;
	line-height: 1.6;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.pill {
	display: grid;
	gap: 6px;
	padding: 8px 8px 8px 12px;
	border: 1px solid var(--hk3-divider);
	background: var(--hk3-bg);
	transition: border-color 200ms ease, box-shadow 200ms ease;

	&[data-focused] { border-color: var(--hk3-accent); box-shadow: var(--hk3-shadow-md); }
}

.input {
	width: 100%;
	min-height: 42px;
	max-height: 160px;
	height: 42px;
	padding: 10px 0 6px;
	border: 0;
	background: transparent;
	resize: none;
	font: inherit;
	font-size: 15px;
	line-height: 1.55;
	color: var(--hk3-text);
	outline: none;
	box-sizing: border-box;

	&::placeholder { color: var(--hk3-neutral-600); }
	.root[data-compact] & { max-height: 120px; }
}

.row {
	display: flex;
	align-items: center;
	gap: 4px;
	min-width: 0;
}

.iconBtn {
	width: 36px;
	height: 36px;
	flex: none;
	border: 0;
	background: transparent;
	color: var(--hk3-neutral-800);
	cursor: pointer;
	display: grid;
	place-items: center;

	&[data-active] { background: var(--hk3-accent-100); color: var(--hk3-accent-800); }
	&:hover { background: var(--hk3-accent-100); color: var(--hk3-accent-800); }
	.root[data-compact] & { width: 32px; }
}

.sep {
	width: 1px;
	height: 20px;
	margin: 0 4px;
	background: var(--hk3-divider);
	flex: none;
}

.shortcut {
	width: 30px;
	height: 30px;
	flex: none;
	border: 1px solid var(--hk3-divider);
	background: transparent;
	color: var(--hk3-neutral-800);
	cursor: pointer;
	display: grid;
	place-items: center;

	&[data-active] { background: var(--hk3-accent-100); color: var(--hk3-accent-800); border-color: var(--hk3-accent); }
	&:hover { border-color: var(--hk3-accent); }
}

.shortcut + .shortcut { margin-left: 4px; }

.shortcutEmpty {
	border-style: dashed;
	color: var(--hk3-accent-700);

	&:hover { border-style: solid; background: var(--hk3-accent-100); }
}

.spacer { flex: 1; min-width: 0; }

.visWrap { position: relative; flex: none; }

.visBtn, .fedBtn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	height: 32px;
	padding: 0 10px;
	flex: none;
	border: 1px solid var(--hk3-divider);
	background: transparent;
	color: var(--hk3-text);
	cursor: pointer;
	font: inherit;
	font-size: 12px;
	font-weight: 700;
	white-space: nowrap;
	transition: background 200ms ease, color 200ms ease, border-color 200ms ease;

	&:hover:not(:disabled) { border-color: var(--hk3-accent); }
	&:disabled { opacity: 0.45; cursor: default; }
	.root[data-compact] & { padding: 0 7px; }
}

.visBtn[data-open] { border-color: var(--hk3-accent); }
.visChevron { color: var(--hk3-neutral-700); }

.visMenu {
	bottom: calc(100% + 6px);
	right: 0;
	width: 220px;

	.root[data-menu="down"] & { top: calc(100% + 6px); bottom: auto; }
}

.fedBtn[data-local] {
	background: var(--hk3-text);
	color: var(--hk3-bg);
	border-color: var(--hk3-text);
}

.meter {
	position: relative;
	width: 46px;
	height: 32px;
	flex: none;
	border: 1px solid var(--hk3-divider);
	display: grid;
	place-items: center;
	overflow: hidden;
	box-sizing: border-box;
	color: var(--hk3-neutral-800);

	&[data-over] { color: var(--hk3-bg); }
	.root[data-compact] & { width: 40px; }
}

.meterFill {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	background: var(--hk3-accent-100);
	transition: height 200ms ease;

	.meter[data-over] & { background: var(--hk3-accent); }
}

.odo {
	position: relative;
	display: flex;
	height: 14px;
	font-size: 11px;
	font-weight: 700;
	line-height: 14px;
	font-variant-numeric: tabular-nums;
}

.odoDigit {
	display: block;
	width: 7px;
	height: 14px;
	overflow: hidden;
	transition: opacity 300ms ease;
}

.odoReel {
	display: flex;
	flex-direction: column;
	transition: transform 460ms cubic-bezier(0.22, 1, 0.36, 1);

	span { display: block; height: 14px; text-align: center; }
}

.send {
	width: 44px;
	height: 40px;
	flex: none;
	border: 0;
	background: var(--hk3-accent);
	color: var(--hk3-bg);
	cursor: pointer;
	display: grid;
	place-items: center;
	transition: background 220ms ease;

	&[data-state="success"] { background: var(--hk3-text); }
	&:hover:not(:disabled) { background: var(--hk3-accent-600); }
	&:disabled { opacity: 0.45; cursor: default; }
}

.spin { animation: hk3Spin 0.8s linear infinite; }

.editing {
	display: flex;
	align-items: center;
	gap: 8px;
	height: 34px;
	padding: 0 4px 0 12px;
	border: 1px solid var(--hk3-accent);
	background: var(--hk3-accent-100);
	color: var(--hk3-accent-800);
	font-size: 13px;

	> b { flex: 1; min-width: 0; }
}

// 送信待ち: ボタンに残り秒数と進み具合の輪、ホバーで取り消しの×を出す。
.sendCount {
	position: relative;
	display: grid;
	place-items: center;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: conic-gradient(var(--hk3-bg) calc(var(--hk3-delay-progress) * 360deg), color-mix(in srgb, var(--hk3-bg) 30%, transparent) 0);
	overflow: hidden;

	&::before {
		content: '';
		position: absolute;
		inset: 2px;
		border-radius: 50%;
		background: var(--hk3-accent);
	}
}

.sendDigit, .sendCancel {
	position: relative;
	grid-area: 1 / 1;
	font-size: 13px;
	font-weight: 800;
	font-variant-numeric: tabular-nums;
	line-height: 1;
}

.sendCancel { opacity: 0; transition: opacity 140ms ease; }
.send:hover .sendCancel, .send:focus-visible .sendCancel { opacity: 1; }
.send:hover .sendDigit, .send:focus-visible .sendDigit { opacity: 0; }

:global(.hk3-count-enter-active), :global(.hk3-count-leave-active) { transition: opacity 160ms ease, transform 220ms cubic-bezier(0.16, 1, 0.3, 1); }
:global(.hk3-count-enter-from) { opacity: 0; transform: translateY(70%); }
:global(.hk3-count-leave-to) { opacity: 0; transform: translateY(-70%); }

.pill { position: relative; }

.pill[data-waiting] { border-color: var(--hk3-accent); }

.delayRail {
	position: absolute;
	left: -1px;
	right: -1px;
	top: -1px;
	height: 3px;
	overflow: hidden;
	background: color-mix(in srgb, var(--hk3-accent) 22%, transparent);
	pointer-events: none;

	> span {
		display: block;
		height: 100%;
		background: var(--hk3-accent);
		transform-origin: left center;
		transition: transform 120ms linear;
	}
}

// 送信待ちの案内は UI3 の角のない面に揃える。
.delay {
	padding: 8px 10px 8px 12px;
	border: 1px solid var(--hk3-accent);
	background: var(--hk3-surface);
	color: var(--hk3-text);
	font-size: 13px;

	:global(button) { border-radius: 0 !important; }
}

@keyframes hk3Spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
	.ctxWrap, .ctx, .odoReel, .odoDigit { transition: none !important; }
	.spin { animation: none; }
	.delayRail > span, .sendCancel { transition: none; }
}

// デッキの投稿窓(560px)のような狭い置き場所でも、送信ボタンが枠からはみ出さないよう段階的に詰める。
.pill { container-type: inline-size; }

@container (max-width: 600px) {
	.btnLabel { display: none; }
	.visBtn, .fedBtn { padding: 0 7px; }
	.iconBtn { width: 32px; }
}

@container (max-width: 420px) {
	.sep, .shortcut { display: none; }
}

// デッキのカラム(幅300px前後)でも、送信ボタンまで枠内に収める。
@container (max-width: 360px) {
	.row { gap: 2px; }
	.iconBtn { width: 30px; height: 32px; }
	.visBtn, .fedBtn { padding: 0 6px; gap: 3px; }
	.visChevron { display: none; }
	.meter { width: 38px; }
	.send { width: 38px; height: 36px; }
}

@container (max-width: 300px) {
	.meter { display: none; }
}
</style>
