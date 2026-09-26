<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
Hataskey UI 3: タイムライン。タブ・表示フィルタ・LIVE切替・新着バナーを持ち、新しい順に並べる。
-->
<template>
<div :class="$style.root" :data-compact="compact ? 'true' : undefined">
	<header data-hata-collapse-part :class="$style.navbar">
		<div ref="navEl" :class="$style.nav" @click="onNavClick">
			<div v-if="!compact" :class="$style.navSpacer"></div>
			<div :class="$style.tabs">
				<button
					v-for="t in tabs"
					:key="t.id"
					type="button"
					:class="$style.tab"
					:data-active="t.id === tab ? 'true' : undefined"
					:aria-pressed="t.id === tab"
					:title="t.label"
					:data-external="t.external ? 'true' : undefined"
					@click.stop="onTabClick(t.id)"
				>
					<i :class="[t.icon, $style.tabIcon]" aria-hidden="true"></i>
					<span v-if="t.id === tab">{{ t.label }}</span>
				</button>
			</div>
			<div :class="$style.navEnd">
				<!-- 表示の切り替え(リノート・ファイル・センシティブ・LIVE)を「…」の一覧にまとめる。 -->
				<div ref="optionsWrapEl" :class="$style.optionsWrap">
					<button type="button" :class="$style.live" :data-on="optionsOpen || live ? 'true' : undefined" :aria-expanded="optionsOpen" aria-haspopup="menu" :aria-label="i18n.ts.options" :title="i18n.ts.options" @click.stop="optionsOpen = !optionsOpen">
						<Ellipsis :size="20"/>
					</button>
					<Transition :name="motion() ? 'hk3-options' : ''">
						<div v-if="optionsOpen" :class="$style.options" role="menu" @click.stop>
							<button v-for="f in filters" :key="f.key" type="button" role="menuitemcheckbox" :aria-checked="f.on" :class="$style.option" :data-on="f.on ? 'true' : undefined" @click="toggleFilter(f.key)">
								<component :is="f.icon" :size="18"/><span>{{ f.label }}</span><span :class="$style.optionCheck"><Check v-if="f.on" :size="16"/></span>
							</button>
							<button type="button" role="menuitemcheckbox" :aria-checked="live" :class="$style.option" :data-on="live ? 'true' : undefined" :disabled="tab === 'trending' || isExternalTab" @click="toggleLive">
								<component :is="live ? Zap : ZapOff" :size="18"/><span>{{ copy.realtime }}</span><span :class="$style.optionCheck"><Check v-if="live" :size="16"/></span>
							</button>
							<button type="button" role="menuitem" :class="$style.option" @click="openRssSettings"><Rss :size="18"/><span>{{ copy._rss.settings }}</span></button>
						</div>
					</Transition>
				</div>
			</div>
		</div>
		<div v-if="emojiVoteRound && emojiVoteAnchor" :class="$style.voteNavbar">
			<MkLtlEmojiVote
				:key="`hk3-emoji-vote:${emojiVoteRound.id}`"
				:round="emojiVoteRound"
				:choice="emojiVoteChoice"
				:now="emojiVoteNow"
				:phase="emojiVotePhase"
				:declined="emojiVoteDeclined"
				:active="emojiVoteActive"
				:effectTarget="voteEffectsEl"
				:submitting="emojiVoteSubmitting"
				:voteError="emojiVoteError"
				:canVote="!!$i"
				:claimEffect="claimEmojiVoteEffect"
				navbar
				@vote="voteEmoji"
				@dismiss="dismissEmojiVote"
			/>
		</div>
	</header>

	<div :class="$style.scrollWrap">
		<div v-if="emojiVoteActive" ref="voteEffectsEl" :class="$style.voteEffects" aria-hidden="true"></div>
		<div ref="scrollEl" :class="$style.scroll">
			<div data-hata-collapse-part :class="$style.bannerStack" :data-rss="rssEnabled ? 'true' : undefined">
				<Hk3RssReader v-if="rssEnabled" :interrupted="bannerOn" :paused="rssEffectPaused" :compact="compact" :motion="motionEnabled" @settings="openRssSettings"/>
				<button v-if="bannerShown" ref="bannerEl" type="button" :class="$style.banner" :data-kind="bannerToast ? 'toast' : 'queue'" :tabindex="bannerOn ? undefined : -1" :inert="!bannerOn" :aria-hidden="!bannerOn || undefined" @click="onBannerClick">
					<span ref="flashEl" :class="$style.flash" aria-hidden="true"></span>
					<span ref="flash2El" :class="$style.flash2" aria-hidden="true"></span>
					<span v-if="bannerToast" :key="bannerToast.id" ref="bannerContentEl" :class="$style.bannerContent">
						<Hk3PostSuccess v-if="bannerToast.icon === 'send'" :key="bannerToast.id" :text="bannerToast.text" :motion="prefer.r.animation.value"/>
						<template v-else>
							<span :class="$style.bannerLead">
								<MkAvatar v-if="bannerToast.user" :user="bannerToast.user" :class="[$style.bannerFace, bannerToast.welcome && $style.bannerWelcomeFace]" :isToastAvatar="!!bannerToast.welcome"/>
								<img v-if="bannerToast.emojiUrl" :src="bannerToast.emojiUrl" alt="" :class="$style.bannerEmoji" decoding="async"/>
								<MkNoteActionAnimation v-if="bannerNoteAction" :key="bannerToast.id" :action="bannerNoteAction" :motion="motion()" :class="$style.bannerAction"/>
								<component :is="toastIcon(bannerToast.icon)" v-else-if="!bannerToast.user && !bannerToast.emojiUrl" :size="18" :class="$style.bannerIcon"/>
							</span>
							<span :class="$style.bannerText"><Hk3WelcomeText v-if="bannerToast.welcome" :text="bannerToast.text" :motion="motionEnabled" :active="currentToast?.id === bannerToast.id"/><Mfm v-else :text="bannerToast.text" :plain="true" :nowrap="true" :nyaize="false" :author="bannerToastAuthor ?? undefined" :emojiUrls="bannerToastEmojiUrls"/></span>
						</template>
					</span>
					<span v-else key="queue" ref="bannerContentEl" :class="$style.bannerContent">
						<span :class="$style.rise"><ArrowUp :size="compact ? 18 : 20" :class="$style.riseIcon"/></span>
						<template v-if="bannerExternalText">
							<span ref="facesEl" :class="$style.faces">
								<img v-for="avatar in bannerExternalAvatars" :key="avatar.id" :src="avatar.url" alt="" :class="$style.face" referrerpolicy="no-referrer" decoding="async"/>
							</span>
							<span :class="$style.bannerText"><Mfm :text="bannerExternalText" :plain="true" :nowrap="true" :nyaize="false" :author="bannerExternalNotice?.author ?? undefined" :emojiUrls="bannerExternalNotice?.emojiUrls"/></span>
						</template>
						<template v-else>
							<span ref="facesEl" :class="$style.faces">
								<MkAvatar v-for="n in bannerFaces" :key="n.id" :user="n.user" :class="$style.face"/>
							</span>
							<span ref="qcountEl" :class="$style.qcount">{{ bannerCount }}</span>
						</template>
					</span>
				</button>
			</div>

			<!-- 外部アカウントのタイムラインは、Hataskey UI と同じ外部TL部品で表示する。 -->
			<MkExternalTimeline v-if="isExternalTab && externalHost && externalToken" :key="tab" :src="tab === 'ohtl' ? 'ohtl' : 'oltl'" :newNotesNavbarKey="`hk3:${tab}`" :host="externalHost" :token="externalToken" :sound="true" :simpleUi="true" :hataskeyUi="true" :class="$style.external"/>
			<template v-else>
				<div v-if="loading && notes.length === 0" :class="$style.state"><MkLoading/></div>
				<div v-else-if="error && notes.length === 0" :class="$style.state">
					<span>{{ copy.loadFailed }}</span>
					<button type="button" :class="$style.retry" @click="reload()">{{ copy.retry }}</button>
				</div>
				<div v-else-if="notes.length === 0" :class="$style.state">{{ copy.noNotes }}</div>

				<div ref="listEl" data-hata-collapse-items :class="$style.list">
					<Hk3Note
						v-for="note in notes"
						:key="note.id"
						:data-note-removal-id="note.id"
						:note="note"
						:size="compact ? 'sm' : 'lg'"
						:linked="linkKindFor(note)"
						:inLocal="tab === 'local'"
						:hideSensitive="!filterState.withSensitive"
					/>
				</div>
				<div v-if="notes.length > 0" ref="sentinelEl" :class="$style.sentinel">
					<MkLoading v-if="loadingMore" :em="true"/>
					<button v-else-if="loadMoreFailed" type="button" :class="$style.retry" @click="loadMore">{{ copy.loadOlderFailed }}</button>
					<span v-else-if="!hasMore" :class="$style.end">{{ copy.endOfTimeline }}</span>
				</div>
			</template>
		</div>
	</div>
	<div data-hata-collapse-part :class="$style.composer" :data-position="prefer.r.hataskeyUi3ComposerPosition.value"><slot/></div>
</div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, shallowRef, watch } from 'vue';
import { ArrowUp, AtSign, Ellipsis, Bell, ChartBar, Check, Clock, Paperclip, Pencil, SmilePlus, Star, Trash2, Eye, Filter, Heart, Image, Moon, Quote, Repeat2, Reply, Rss, SendHorizontal, Sun, UserPlus, Zap, ZapOff } from '@lucide/vue';
import * as Misskey from 'cherrypick-js';
import Hk3Note from './Hk3Note.vue';
import Hk3PostSuccess from './Hk3PostSuccess.vue';
import Hk3RssReader from './Hk3RssReader.vue';
import Hk3WelcomeText from './Hk3WelcomeText.vue';
import { dismissHk3Toast, hk3ComposerLink, hk3PostedNote, hk3Toasts, pushHk3Toast } from './hk3-state.js';
import type { Component } from 'vue';
import type { HataskeyTimelineNewNotes } from '@/utility/hataskey-timeline-new-notes.js';
import type { Hk3Toast } from './hk3-state.js';
import MkExternalTimeline from '@/components/MkExternalTimeline.vue';
import MkLtlEmojiVote from '@/components/MkLtlEmojiVote.vue';
import MkNoteActionAnimation from '@/components/MkNoteActionAnimation.vue';
import { useLtlEmojiVote } from '@/utility/ltl-emoji-vote.js';
import { getLtlEmojiVoteAnchor } from '@/utility/ltl-emoji-vote-anchor.js';
import { createHataskeyTimelineNewNotes, hataskeyTimelineNewNotesKey } from '@/utility/hataskey-timeline-new-notes.js';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import { store } from '@/store.js';
import { prefer } from '@/preferences.js';
import { useStream } from '@/stream.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { deepMerge } from '@/utility/merge.js';
import { miLocalStorage } from '@/local-storage.js';
import { getExternalEmojiUrlMapForHost } from '@/utility/external-api.js';
import { useGlobalEvent } from '@/events.js';
import { useNoteRemoval } from '@/composables/use-note-removal.js';
import { isHataskeyTimelineAllowed } from '@/utility/hataskey-timeline-availability.js';
import { mainRouter } from '@/router.js';

withDefaults(defineProps<{
	compact?: boolean;
}>(), {
	compact: false,
});

type TabId = 'following' | 'local' | 'social' | 'mixed' | 'trending' | 'ohtl' | 'oltl';
type FilterKey = 'withRenotes' | 'onlyFiles' | 'withSensitive';

const copy = i18n.ts._hata._hataskeyUi3;
const PAGE = 20;
const QUEUE_MAX = 99;

// 外部アカウント連携が有効で、外部TLの表示を選んでいるときだけ外部のホーム/ローカルを並べる。
const externalLinked = computed(() => prefer.r['external.enabled'].value && prefer.r['external.token'].value != null);
const externalHost = computed(() => prefer.r['external.host'].value || '');
const externalToken = computed(() => prefer.r['external.token'].value || '');
// 並び順と表示は、設定の「上部ナビバー」(Hataskey UI と共通)に従う。トレンドはその右、外部TLは最後に並べる。
// アイコンも Hataskey UI の上部ナビバーと同じもの(設定に保存されたアイコン)を使い、見慣れた形で見分けられるようにする。
const BASE_TABS: Record<'following' | 'local' | 'social' | 'mixed', { label: string; icon: string }> = {
	following: { label: copy.tabHome, icon: 'ti ti-home' },
	local: { label: copy.tabLocal, icon: 'ti ti-planet' },
	social: { label: copy.tabSocial, icon: 'ti ti-users' },
	mixed: { label: copy.tabGlobal, icon: 'ti ti-universe' },
};
const configuredTabs = computed(() => (prefer.r['simpleUi.topNav'].value as { id: string; icon?: string; visible?: boolean }[])
	.filter((item): item is { id: keyof typeof BASE_TABS; icon?: string; visible?: boolean } => item.visible !== false && item.id in BASE_TABS)
	.map(item => ({ id: item.id as TabId, label: BASE_TABS[item.id].label, icon: item.icon || BASE_TABS[item.id].icon })));
const allTabs = computed<{ id: TabId; label: string; icon: string; external?: boolean }[]>(() => [
	...configuredTabs.value,
	...(prefer.r['simpleUi.showTrendingTab'].value ? [{ id: 'trending' as const, label: copy.tabTrending, icon: 'ti ti-flame' }] : []),
	...(externalLinked.value && prefer.r['external.enableOHTL'].value ? [{ id: 'ohtl' as const, label: copy.tabExternalHome, icon: 'ti ti-home', external: true }] : []),
	...(externalLinked.value && prefer.r['external.enableOLTL'].value ? [{ id: 'oltl' as const, label: copy.tabExternalLocal, icon: 'ti ti-planet', external: true }] : []),
]);
const tabs = computed(() => allTabs.value.filter(t => t.external || isHataskeyTimelineAllowed(t.id)));
const storedTab = miLocalStorage.getItem('hataskeyUi3Tab') as TabId | null;
const tab = ref<TabId>(storedTab && tabs.value.some(t => t.id === storedTab) ? storedTab : (tabs.value.some(t => t.id === 'local') ? 'local' : 'following'));
const live = ref(miLocalStorage.getItem('hataskeyUi3Live') === 'true');
const isExternalTab = computed(() => tab.value === 'ohtl' || tab.value === 'oltl');
// 外部TLの新着はその部品がキューを持つ。ここでは知らせだけ受け取り、上部の新着バナーで出す。
const externalNewNotes = createHataskeyTimelineNewNotes(() => isExternalTab.value ? `hk3:${tab.value}` : null);
provide(hataskeyTimelineNewNotesKey, externalNewNotes);
const externalNotice = externalNewNotes.notice;
// 連携を解除した・外部TLを非表示にした場合は、残っているタブへ戻す。
watch(tabs, list => {
	if (!list.some(t => t.id === tab.value)) void onTabClick(list.some(t => t.id === 'local') ? 'local' : 'following');
});

const notes = ref<Misskey.entities.Note[]>([]);
const queue = ref<Misskey.entities.Note[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const hasMore = ref(true);
const loadMoreFailed = ref(false);
const error = ref(false);

const navEl = shallowRef<HTMLElement | null>(null);
const scrollEl = shallowRef<HTMLElement | null>(null);
const listEl = shallowRef<HTMLElement | null>(null);
const removal = useNoteRemoval(() => listEl.value);
const sentinelEl = shallowRef<HTMLElement | null>(null);
const bannerEl = shallowRef<HTMLElement | null>(null);
const bannerContentEl = shallowRef<HTMLElement | null>(null);
const flashEl = shallowRef<HTMLElement | null>(null);
const flash2El = shallowRef<HTMLElement | null>(null);
const facesEl = shallowRef<HTMLElement | null>(null);
const qcountEl = shallowRef<HTMLElement | null>(null);

const filterState = computed(() => store.r.tl.value.filter);

// ===== LTL の絵文字投票 =====
// Hataskey UI と同じ投票ストアを使い、投票・演出の「1回だけ」は UI をまたいで共有される。
const VOTE_TRIGGER = '絵文字を選ぶぞ';
const voteEffectsEl = shallowRef<HTMLElement | null>(null);
const emojiVoteActive = computed(() => tab.value === 'local' && prefer.r.ltlEmojiVoteEnabled.value);
const {
	round: emojiVoteRound, choice: emojiVoteChoice, now: emojiVoteNow, phase: emojiVotePhase,
	submitting: emojiVoteSubmitting, voteError: emojiVoteError, declined: emojiVoteDeclined,
	refresh: refreshEmojiVote, vote: voteEmoji, dismiss: dismissEmojiVote, claimEffect: claimEmojiVoteEffect,
} = useLtlEmojiVote(emojiVoteActive);
const emojiVoteAnchor = computed(() => emojiVoteActive.value && emojiVotePhase.value !== 'idle' && !loading.value
	? getLtlEmojiVoteAnchor([...queue.value, ...notes.value], emojiVoteRound.value?.noteId, $i, {
		mutedWords: [...($i?.mutedWords ?? []), ...($i?.hardMutedWords ?? [])],
		withSensitive: filterState.value.withSensitive,
	}) : null);
// 届いた(まだ新着バナーに溜まっている分も含む)開始の合図から、進行中の回を読み込む。
watch(() => emojiVoteActive.value
	? [...queue.value, ...notes.value].filter(note => note.text?.trim() === VOTE_TRIGGER).map(note => note.id).join(',')
	: '', ids => {
	if (ids) void refreshEmojiVote(ids.split(',')[0]);
});
// 「…」一覧。外側を押す・Esc・タブ切り替えで閉じる。
const optionsOpen = ref(false);
const optionsWrapEl = shallowRef<HTMLElement | null>(null);

function onOptionsPointerDown(ev: PointerEvent) {
	if (!optionsOpen.value) return;
	if (optionsWrapEl.value?.contains(ev.target as Node | null)) return;
	optionsOpen.value = false;
}

function onOptionsKeydown(ev: KeyboardEvent) {
	if (ev.key === 'Escape') optionsOpen.value = false;
}

watch(optionsOpen, open => {
	if (open) {
		window.document.addEventListener('pointerdown', onOptionsPointerDown, true);
		window.document.addEventListener('keydown', onOptionsKeydown);
	} else {
		window.document.removeEventListener('pointerdown', onOptionsPointerDown, true);
		window.document.removeEventListener('keydown', onOptionsKeydown);
	}
});
watch(tab, () => { optionsOpen.value = false; });
onBeforeUnmount(() => {
	window.document.removeEventListener('pointerdown', onOptionsPointerDown, true);
	window.document.removeEventListener('keydown', onOptionsKeydown);
});

const filters = computed(() => ([
	{ key: 'withRenotes' as const, label: i18n.ts.showRenotes, icon: Repeat2 },
	{ key: 'onlyFiles' as const, label: i18n.ts.fileAttachedOnly, icon: Image },
	{ key: 'withSensitive' as const, label: i18n.ts.withSensitive, icon: Eye },
]).map(f => ({ ...f, on: filterState.value[f.key] === true })));

function linkKindFor(note: Misskey.entities.Note): 'reply' | 'quote' | null {
	const link = hk3ComposerLink.value;
	if (link == null) return null;
	const target = Misskey.note.isPureRenote(note) ? note.renoteId : note.id;
	return target === link.noteId ? link.kind : null;
}

const currentToast = computed(() => hk3Toasts.value[0] ?? null);
const hasQueued = computed(() => queue.value.length > 0 || externalNotice.value != null);
const bannerOn = computed(() => currentToast.value != null || hasQueued.value);
const rssEnabled = computed(() => prefer.r.hataskeyUi3RssEnabled.value);
const timelineCollapsing = ref(false);
const rssEffectPaused = computed(() => timelineCollapsing.value || (!!emojiVoteAnchor.value && ['rain', 'leaving'].includes(emojiVotePhase.value)));

function openRssSettings() {
	optionsOpen.value = false;
	mainRouter.pushByPath('/settings/preferences?destination=hataskey-ui-s#hataskey-ui-s-rss-heading');
}

// 消える演出の間も直前の内容を描き続けるため、表示状態と最後の中身を別に持つ。
const bannerShown = ref(false);
const lastToast = shallowRef<Hk3Toast | null>(null);
const lastQueue = shallowRef<Misskey.entities.Note[]>([]);
const lastKind = ref<'toast' | 'queue'>('queue');
watch(currentToast, toast => {
	if (toast) {
		lastToast.value = toast;
		lastKind.value = 'toast';
	} else if (hasQueued.value) lastKind.value = 'queue';
}, { immediate: true });
watch(queue, notes => {
	if (notes.length === 0) return;
	lastQueue.value = notes;
	if (currentToast.value == null) lastKind.value = 'queue';
}, { immediate: true });
const bannerToast = computed(() => currentToast.value ?? (bannerOn.value || lastKind.value !== 'toast' ? null : lastToast.value));
const bannerNoteAction = computed<'favorite' | 'clip' | 'edit' | 'delete' | null>(() => {
	switch (bannerToast.value?.icon) {
		case 'star': return 'favorite';
		case 'clip': return 'clip';
		case 'pencil': return 'edit';
		case 'trash': return 'delete';
		default: return null;
	}
});
const bannerToastAuthor = computed(() => {
	const toast = bannerToast.value;
	if (toast?.user) return { ...toast.user, host: toast.user.host ?? toast.emojiHost ?? null };
	// MkMfm は author.host が null の場合 emojiUrls を参照しない。
	if (toast?.emojiUrl) return { host: window.location.host } as Misskey.entities.UserLite;
	return undefined;
});
const bannerToastEmojiUrls = computed(() => {
	const toast = bannerToast.value;
	const host = bannerToastAuthor.value?.host;
	const urls: Record<string, string> = { ...(host ? getExternalEmojiUrlMapForHost(host) : null), ...toast?.user?.emojis };
	// 絵文字追加のお知らせは URL を持つが、文言内の :name: は辞書を持たない。
	const addedName = toast?.emojiUrl ? toast.text.match(/:([^:\s]+):/u)?.[1] : null;
	if (addedName && toast?.emojiUrl) urls[addedName] = toast.emojiUrl;
	return urls;
});
const bannerQueue = computed(() => queue.value.length > 0 ? queue.value : lastQueue.value);
const bannerFaces = computed(() => bannerQueue.value.slice(0, 3));
const bannerCount = computed(() => bannerQueue.value.length);
// 外部TLの新着は件数などの文言を外部TL側が作る。消える演出の間も直前の文言を残す。
const lastExternalNotice = shallowRef<HataskeyTimelineNewNotes | null>(null);
watch(externalNotice, notice => {
	if (notice) {
		lastExternalNotice.value = notice;
		if (currentToast.value == null) lastKind.value = 'queue';
	} else if (queue.value.length > 0) lastExternalNotice.value = null;
});
watch(queue, notes => { if (notes.length > 0) lastExternalNotice.value = null; });
const bannerExternalNotice = computed(() => externalNotice.value ?? (queue.value.length > 0 ? null : lastExternalNotice.value));
const bannerExternalText = computed(() => bannerExternalNotice.value?.text ?? null);
const bannerExternalAvatars = computed(() => bannerExternalNotice.value?.avatars ?? []);

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const systemReducedMotion = ref(motionQuery.matches);
const motionEnabled = computed(() => prefer.r.animation.value && !systemReducedMotion.value);
const motion = () => motionEnabled.value;

function onMotionChange(event: MediaQueryListEvent) { systemReducedMotion.value = event.matches; }

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

const TOAST_ICONS: Record<Hk3Toast['icon'], Component> = {
	bell: Bell, heart: Heart, reply: Reply, repeat: Repeat2, quote: Quote, userPlus: UserPlus, mention: AtSign, poll: ChartBar,
	zap: Zap, zapOff: ZapOff, sun: Sun, moon: Moon, send: SendHorizontal, check: Check, filter: Filter,
	star: Star, clip: Paperclip, pencil: Pencil, trash: Trash2, clock: Clock, smile: SmilePlus,
};

function toastIcon(icon: Hk3Toast['icon']): Component {
	return TOAST_ICONS[icon] ?? Bell;
}

// ===== 取得 =====
async function fetchPage(untilId?: string, offset = 0): Promise<Misskey.entities.Note[]> {
	const filter = store.s.tl.filter;
	const params = { limit: PAGE, untilId, withRenotes: filter.withRenotes, withFiles: filter.onlyFiles ? true : undefined };
	switch (tab.value) {
		case 'following': return await misskeyApi('notes/timeline', params);
		case 'local': return await misskeyApi('notes/local-timeline', params);
		case 'social': return await misskeyApi('notes/hybrid-timeline', params);
		case 'mixed': return await misskeyApi('notes/global-timeline', params);
		case 'trending': return await misskeyApi('notes/trending', { limit: PAGE, offset, seed: trendingSeed });
		default: return [];
	}
}

// トレンドは同じ seed で並び順を固定し、続きの読み込みで重複・抜けが出ないようにする。
let trendingSeed = 1;
let loadSeq = 0;

async function reload() {
	removal.cancelAll();
	const seq = ++loadSeq;
	trendingSeed = Math.floor(Math.random() * 2147483646) + 1;
	loading.value = true;
	error.value = false;
	queue.value = [];
	loadMoreFailed.value = false;
	disconnect();
	if (isExternalTab.value) {
		notes.value = [];
		loading.value = false;
		return;
	}
	try {
		const result = await fetchPage();
		if (seq !== loadSeq) return;
		notes.value = result;
		// タイムラインは件数が上限未満でも続きがあることがある。空になった時だけ終端とする。
		hasMore.value = result.length > 0;
		connect();
	} catch (err) {
		if (seq !== loadSeq) return;
		console.error('Hataskey UI 3 timeline failed', err);
		error.value = true;
		notes.value = [];
	} finally {
		if (seq === loadSeq) loading.value = false;
	}
}

async function loadMore() {
	if (loadingMore.value || loading.value || !hasMore.value || notes.value.length === 0) return;
	loadingMore.value = true;
	const seq = loadSeq;
	try {
		const oldest = notes.value[notes.value.length - 1];
		const result = await fetchPage(tab.value === 'trending' ? undefined : oldest.id, notes.value.length);
		if (seq !== loadSeq) return;
		const known = new Set(notes.value.map(note => note.id));
		notes.value.push(...result.filter(note => !known.has(note.id)));
		// タイムラインは件数が上限未満でも続きがあることがある。空になった時だけ終端とする。
		hasMore.value = result.length > 0;
		loadMoreFailed.value = false;
	} catch {
		// 一時的な失敗で「これより前は無い」と誤って伝えないよう、再試行を促す。
		loadMoreFailed.value = true;
	} finally {
		loadingMore.value = false;
	}
}

// ===== ストリーム =====
const stream = useStream();
let connection: { dispose: () => void } | null = null;

function connect() {
	if (tab.value === 'trending' || tab.value === 'ohtl' || tab.value === 'oltl') return;
	const filter = store.s.tl.filter;
	const channel = ({ following: 'homeTimeline', local: 'localTimeline', social: 'hybridTimeline', mixed: 'globalTimeline' } as const)[tab.value];
	const channelConnection = stream.useChannel(channel, { withRenotes: filter.withRenotes, withFiles: filter.onlyFiles ? true : undefined });
	channelConnection.on('note', onStreamNote);
	connection = channelConnection;
}

function disconnect() {
	connection?.dispose();
	connection = null;
}

function isKnown(id: string): boolean {
	return notes.value.some(note => note.id === id) || queue.value.some(note => note.id === id);
}

function onStreamNote(note: Misskey.entities.Note) {
	if (isKnown(note.id)) return;
	// LIVE中でも、読み進めている位置を動かさないよう、スクロール中の新着はバナーへ回す。
	if (live.value && (scrollEl.value?.scrollTop ?? 0) < 8) {
		notes.value.unshift(note);
		return;
	}
	queue.value = [note, ...queue.value].slice(0, QUEUE_MAX);
}

// 削除されたノート(自分の削除・ストリームの削除通知)は、その純リノートも含めて一覧と新着待ちから外す。
useGlobalEvent('noteDeleted', noteId => {
	const keep = (note: Misskey.entities.Note) => note.id !== noteId && !(note.renoteId === noteId && Misskey.note.isPureRenote(note));
	for (const note of notes.value.filter(note => !keep(note))) {
		removal.remove(note.id, () => { notes.value = notes.value.filter(item => item.id !== note.id); });
	}
	queue.value = queue.value.filter(keep);
});

watch(hk3PostedNote, note => {
	if (note == null || isKnown(note.id) || tab.value === 'trending') return;
	notes.value.unshift(note);
	hk3PostedNote.value = null;
	scrollEl.value?.scrollTo({ top: 0, behavior: motion() ? 'smooth' : 'auto' });
});

// ===== 操作 =====
function scrollTop() {
	scrollEl.value?.scrollTo({ top: 0, behavior: motion() ? 'smooth' : 'auto' });
}

function onNavClick(ev: MouseEvent) {
	if ((ev.target as HTMLElement).closest('button')) return;
	scrollTop();
}

let switching = false;

async function onTabClick(id: TabId) {
	if (id === tab.value) {
		scrollTop();
		return;
	}
	if (switching) return;
	switching = true;
	try {
		await hideList();
		tab.value = id;
		miLocalStorage.setItem('hataskeyUi3Tab', id);
		scrollEl.value?.scrollTo({ top: 0 });
		await reload();
		await nextTick();
		revealList(60);
	} finally {
		switching = false;
	}
}

function listChildren(): HTMLElement[] {
	return Array.from(listEl.value?.children ?? []).slice(0, 8) as HTMLElement[];
}

async function hideList(): Promise<void> {
	if (!motion()) return;
	const els = listChildren();
	if (els.length === 0) return;
	const anims = els.map((el, i) => el.animate([
		{ opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0 0 0 0)' },
		{ opacity: 0, transform: 'translateY(-20px)', clipPath: 'inset(0 0 100% 0)' },
	], { duration: 280, delay: (els.length - 1 - i) * 30, easing: 'cubic-bezier(0.64, 0, 0.78, 0)', fill: 'forwards' }));
	await Promise.allSettled(anims.map(a => a.finished));
	window.requestAnimationFrame(() => anims.forEach(a => a.cancel()));
}

function revealList(step: number) {
	if (!motion()) return;
	listChildren().forEach((el, i) => el.animate([
		{ opacity: 0, transform: 'translateY(-24px)', clipPath: 'inset(0 0 100% 0)' },
		{ opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0 0 0 0)' },
	], { duration: 560, delay: i * step, easing: EASE_OUT, fill: 'backwards' }));
}

function toggleFilter(key: FilterKey) {
	const next = !store.s.tl.filter[key];
	store.set('tl', deepMerge({ filter: { [key]: next } }, store.s.tl));
	const label = filters.value.find(f => f.key === key)?.label ?? '';
	pushHk3Toast({ icon: 'filter', text: i18n.tsx._hata._hataskeyUi3.filterChanged({ filter: label, state: next ? copy.on : copy.off }) });
	if (key !== 'withSensitive') void reload();
}

function toggleLive() {
	live.value = !live.value;
	miLocalStorage.setItem('hataskeyUi3Live', live.value ? 'true' : 'false');
	if (live.value && queue.value.length > 0) flushQueue();
	pushHk3Toast({ icon: live.value ? 'zap' : 'zapOff', text: live.value ? copy.liveOn : copy.liveOff });
}

function flushQueue() {
	const added = queue.value.length;
	const known = new Set(notes.value.map(note => note.id));
	notes.value = [...queue.value.filter(note => !known.has(note.id)), ...notes.value];
	queue.value = [];
	scrollTop();
	if (!motion()) return;
	void nextTick(() => {
		(Array.from(listEl.value?.children ?? []) as HTMLElement[]).slice(0, added).forEach((el, i) => el.animate(
			[{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'translateY(0)' }],
			{ duration: 460, delay: 120 + i * 60, easing: EASE_OUT, fill: 'backwards' },
		));
	});
}

function onBannerClick() {
	const toast = currentToast.value;
	if (toast) {
		toast.onClick?.();
		dismissHk3Toast(toast.id);
		return;
	}
	const external = externalNotice.value;
	if (external) {
		void external.show();
		scrollTop();
		return;
	}
	flushQueue();
}

// ===== バナー演出 =====
function bannerFlash(delay = 0) {
	if (!motion()) return;
	track(flashEl.value?.animate([
		{ clipPath: 'inset(0 50% 0 50%)', opacity: 0.55 },
		{ clipPath: 'inset(0 0% 0 0%)', opacity: 0.3, offset: 0.55 },
		{ clipPath: 'inset(0 0% 0 0%)', opacity: 0 },
	], { duration: 720, delay, easing: EASE_OUT, fill: 'backwards' }));
	track(flash2El.value?.animate([
		{ clipPath: 'inset(0 50% 0 50%)', opacity: 0 },
		{ clipPath: 'inset(0 50% 0 50%)', opacity: 0.22, offset: 0.2 },
		{ clipPath: 'inset(0 0% 0 0%)', opacity: 0 },
	], { duration: 820, delay: delay + 140, easing: EASE_OUT, fill: 'backwards' }));
}

// 素早い切り替え(テーマの連続変更など)では演出を重ねず、最新の表示へ即座に置き換える。
const QUICK_SWAP_MS = 320;
let lastBannerChangeAt = 0;
let bannerAnimations: Animation[] = [];
let bannerRevision = 0;

function stopBannerAnimations() {
	for (const animation of bannerAnimations) animation.cancel();
	bannerAnimations = [];
}

function track(animation: Animation | undefined): Animation | undefined {
	if (animation) {
		bannerAnimations.push(animation);
		void animation.finished.catch(() => {}).then(() => {
			bannerAnimations = bannerAnimations.filter(item => item !== animation);
		});
	}
	return animation;
}

function quickChange(): boolean {
	const now = performance.now();
	const quick = now - lastBannerChangeAt < QUICK_SWAP_MS;
	lastBannerChangeAt = now;
	return quick;
}

watch(bannerOn, async on => {
	const revision = ++bannerRevision;
	const quick = quickChange();
	stopBannerAnimations();
	// RSS owns the standing banner height. Notices crossfade over it instead of
	// collapsing the article reader or restarting its reading timer.
	if (rssEnabled.value) {
		if (on) {
			const entering = !bannerShown.value;
			bannerShown.value = true;
			await nextTick();
			if (revision !== bannerRevision || !bannerOn.value || !entering || quick || !motion()) return;
			track(bannerEl.value?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' }));
		} else {
			const el = bannerEl.value;
			if (el && motion()) {
				const welcome = bannerToast.value?.welcome;
				const exit = track(el.animate(welcome ? [{ opacity: 1, offset: 0 }, { opacity: 1, offset: .86 }, { opacity: 0 }] : [{ opacity: 1 }, { opacity: 0 }], { duration: welcome ? 580 : 180, easing: 'ease-in', fill: 'forwards' }));
				try { await exit?.finished; } catch { return; }
				if (revision !== bannerRevision || bannerOn.value) return;
				exit?.cancel();
			}
			bannerShown.value = false;
		}
		return;
	}
	if (on) {
		const entering = !bannerShown.value;
		bannerShown.value = true;
		if (!entering || quick || !motion()) return;
		await nextTick();
		if (revision !== bannerRevision || !bannerOn.value || !bannerShown.value) return;
		const el = bannerEl.value;
		if (!el) return;
		track(el.animate([
			{ height: '0px', transform: 'translateY(-100%)', opacity: 0, clipPath: 'inset(100% 0 0 0)' },
			{ height: `${el.offsetHeight}px`, transform: 'translateY(0)', opacity: 1, clipPath: 'inset(0 0 0 0)' },
		], { duration: 460, easing: EASE_OUT }));
		bannerFlash(180);
		return;
	}
	const el = bannerEl.value;
	if (!el || quick || !motion()) {
		bannerShown.value = false;
		return;
	}
	// 高さも畳んで、下のノートが跳ねずに上がってくるようにする。
	const exit = track(el.animate([
		{ height: `${el.offsetHeight}px`, opacity: 1 },
		{ height: '0px', opacity: 0 },
	], { duration: 420, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' }));
	track(bannerContentEl.value?.animate([
		{ transform: 'translateY(0) scale(1)', opacity: 1, filter: 'blur(0)' },
		{ transform: 'translateY(-40%) scale(0.92)', opacity: 0, filter: 'blur(2px)' },
	], { duration: 300, easing: 'cubic-bezier(0.55, 0, 0.8, 0.2)', fill: 'forwards' }));
	try {
		await exit?.finished;
	} catch {
		return; // 表示し直しで取り消された
	}
	if (revision !== bannerRevision || bannerOn.value) return;
	bannerShown.value = false;
	bannerAnimations = [];
	navEl.value?.animate([
		{ boxShadow: 'inset 0 -4px 0 var(--hk3-accent)' },
		{ boxShadow: 'inset 0 0 0 transparent' },
	], { duration: 520, easing: 'ease-out' });
}, { immediate: true });

watch([motionEnabled, rssEnabled], () => {
	bannerRevision++;
	stopBannerAnimations();
	bannerShown.value = bannerOn.value;
});

watch(() => currentToast.value?.id ?? (hasQueued.value ? 'queue' : null), async (key, prev) => {
	if (key == null || prev == null || key === prev) return;
	if (quickChange() || !motion()) {
		stopBannerAnimations();
		return;
	}
	await nextTick();
	if (key !== (currentToast.value?.id ?? (hasQueued.value ? 'queue' : null)) || !bannerShown.value) return;
	if (currentToast.value?.icon === 'send') {
		bannerFlash();
		return;
	}
	track(bannerContentEl.value?.animate([
		{ transform: 'translateY(14px)', opacity: 0, filter: 'blur(2px)' },
		{ transform: 'translateY(0)', opacity: 1, filter: 'blur(0)' },
	], { duration: 420, easing: EASE_OUT }));
	bannerFlash();
});

watch(() => queue.value.length, async (count, prev) => {
	if (count <= (prev ?? 0) || !motion()) return;
	await nextTick();
	if (count !== queue.value.length || !bannerOn.value || !bannerShown.value) return;
	const first = facesEl.value?.firstElementChild as HTMLElement | null | undefined;
	first?.animate([
		{ transform: 'translateX(-14px) scale(0.3)', opacity: 0, marginLeft: '-26px' },
		{ transform: 'translateX(0) scale(1)', opacity: 1, marginLeft: '0px' },
	], { duration: 520, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)' });
	qcountEl.value?.animate([
		{ transform: 'translateY(8px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 },
	], { duration: 380, easing: EASE_OUT });
});

// ===== 無限スクロール =====
let observer: IntersectionObserver | null = null;
watch(sentinelEl, el => {
	observer?.disconnect();
	if (!el) return;
	observer = new IntersectionObserver(entries => {
		if (entries.some(entry => entry.isIntersecting)) void loadMore();
	}, { root: scrollEl.value, rootMargin: '600px 0px' });
	observer.observe(el);
});

let collapseObserver: MutationObserver | null = null;
onMounted(() => {
	motionQuery.addEventListener('change', onMotionChange);
	const root = scrollEl.value?.closest('[data-hk3-theme]');
	if (root) {
		const update = () => { timelineCollapsing.value = root.hasAttribute('data-hata-timeline-collapse-active'); };
		collapseObserver = new MutationObserver(update);
		collapseObserver.observe(root, { attributes: true, attributeFilter: ['data-hata-timeline-collapse-active'] });
		update();
	}
	void reload();
});

onBeforeUnmount(() => {
	loadSeq++;
	disconnect();
	observer?.disconnect();
	collapseObserver?.disconnect();
	motionQuery.removeEventListener('change', onMotionChange);
	bannerRevision++;
	stopBannerAnimations();
});

defineExpose({ scrollTop, reload });
</script>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
	flex: 1;
}

.navbar {
	position: relative;
	z-index: 7;
	flex: none;
	min-width: 0;
}

.nav {
	display: flex;
	align-items: stretch;
	height: 58px;
	flex: none;
	border-bottom: 2px solid var(--hk3-divider);

	.root[data-compact] & { height: 54px; border-top: 2px solid var(--hk3-divider); }
}

.navSpacer {
	flex: 1 1 0;
	min-width: 0;
	border-right: 1px solid var(--hk3-divider);
}

.tabs {
	display: flex;
	align-items: stretch;

	.root[data-compact] & {
		flex: 1;
		justify-content: safe center;
		overflow-x: auto;
		min-width: 0;
		scrollbar-width: none;
	}
}

.tabIcon {
	font-size: 20px;
	line-height: 20px;
}

.tab {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	min-width: 56px;
	padding: 0 18px;
	border: 0;
	border-right: 1px solid var(--hk3-divider);
	background: transparent;
	color: var(--hk3-text);
	cursor: pointer;
	font: inherit;
	font-size: 14px;
	font-weight: 700;
	white-space: nowrap;
	position: relative;

	&[data-active] { background: var(--hk3-accent-100); color: var(--hk3-accent-800); box-shadow: inset 0 -3px 0 var(--hk3-accent); }
	&:hover { background: var(--hk3-accent-100); }

	.root[data-compact] & { flex: none; gap: 6px; min-width: 50px; padding: 0 14px; font-size: 13px; }
}

// 外部TLのタブは印を付けず、アイコンの色で見分ける。
.tab[data-external] > .tabIcon {
	color: var(--hk3-external, #3d8fd1);
}

.external {
	min-height: 100%;

	// 外部TLのノートも UI3 のノートと同じく、角のない行を区切り線で並べる。
	:global([data-external-timeline-ui]) {
		gap: 0 !important;
		padding: 0 !important;
		background: var(--hk3-bg);
	}

	:global([data-external-timeline-ui] > *) {
		margin: 0 !important;
		padding: 16px 20px !important;
		border: 0 !important;
		border-bottom: 1px solid var(--hk3-divider) !important;
		border-radius: 0 !important;
		background: var(--hk3-bg) !important;
		box-shadow: none !important;
		backdrop-filter: none !important;
		color: var(--hk3-text);
		transition: background 160ms ease;

		&:hover { background: var(--hk3-surface) !important; }
	}

	:global([data-external-timeline-ui] button) {
		border-radius: 0 !important;
	}
}

.navEnd {
	flex: 1 1 0;
	min-width: 0;
	display: flex;
	justify-content: flex-end;
	align-items: stretch;

	.root[data-compact] & { flex: none; }
}

.live {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	min-width: 58px;
	padding: 0 18px;
	border: 0;
	border-left: 2px solid var(--hk3-divider);
	background: transparent;
	color: var(--hk3-neutral-700);
	cursor: pointer;
	font: inherit;
	font-size: 13px;
	font-weight: 800;
	letter-spacing: 0.06em;

	&[data-on] { background: var(--hk3-accent); color: var(--hk3-bg); }
	&:disabled { opacity: 0.45; cursor: default; }
	.root[data-compact] & { width: 54px; min-width: 54px; padding: 0; }
}

.optionsWrap {
	position: relative;
	display: flex;
	align-items: stretch;
}

.options {
	position: absolute;
	top: calc(100% + 2px);
	right: 0;
	z-index: 30;
	width: min(260px, calc(100vw - 24px));
	padding: 6px;
	display: flex;
	flex-direction: column;
	gap: 2px;
	background: var(--hk3-bg);
	border: 2px solid var(--hk3-text);
	box-shadow: var(--hk3-shadow-lg);
	transform-origin: top right;
}

.option {
	display: flex;
	align-items: center;
	gap: 10px;
	height: 44px;
	padding: 0 12px;
	border: 0;
	background: transparent;
	color: var(--hk3-text);
	cursor: pointer;
	font: inherit;
	font-size: 14px;
	font-weight: 700;
	text-align: left;

	> span:first-of-type { flex: 1; min-width: 0; }
	&[data-on] { color: var(--hk3-accent-800); background: var(--hk3-accent-100); }
	&:hover:not(:disabled) { background: var(--hk3-accent-100); }
	&:disabled { opacity: 0.45; cursor: default; }
}

.optionCheck {
	display: grid;
	place-items: center;
	width: 16px;
	flex: none;
	color: var(--hk3-accent);
}

:global(.hk3-options-enter-active), :global(.hk3-options-leave-active) { transition: opacity 160ms ease, transform 200ms cubic-bezier(0.22, 1, 0.36, 1); }
:global(.hk3-options-enter-from), :global(.hk3-options-leave-to) { opacity: 0; transform: translateY(-6px) scale(0.97); }

.scrollWrap {
	order: 2;
	position: relative;
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
}

.composer {
	flex: none;
	min-width: 0;
	order: 3;
	&[data-position="top"] {
		order: 1;
		border-bottom: 2px solid var(--hk3-divider);
		> :global(*) { border-top: 0; }
	}
}

// 投票結果の紙吹雪・絵文字の雨は、スクロールに流されないようタイムラインの表示領域に重ねる。
.voteEffects {
	position: absolute;
	inset: 0;
	z-index: 6;
	overflow: hidden;
	pointer-events: none;
}

.bannerStack {
	position: sticky;
	top: 0;
	z-index: 5;
	&[data-rss] > .banner {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 1;
	}
}

.voteNavbar {
	max-height: min(50dvh, 420px);
	overflow-y: auto;
	overscroll-behavior: contain;
	border-bottom: 1px solid var(--hk3-divider);
	background: var(--hk3-surface);
	color: var(--hk3-text);

	// UI3 の角のない面に揃える。
	:global(*) { border-radius: 0 !important; }
}

.scroll {
	position: relative;
	flex: 1;
	min-height: 0;
	overflow: auto;
	// スクロールバーの有無でノートの中心が左へずれないよう、両端を同じ幅にする。
	scrollbar-gutter: stable both-edges;
	overscroll-behavior: contain;
}

.banner {
	position: relative;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	height: 48px;
	padding: 0 20px;
	border: 0;
	background: var(--hk3-accent);
	color: var(--hk3-bg);
	cursor: pointer;
	font: inherit;
	font-size: 15px;
	font-weight: 800;
	overflow: hidden;
	transition: background 260ms ease;

	&[data-kind="toast"] { background: var(--hk3-text); }
	&:hover { background: var(--hk3-accent-600); }
	&[data-kind="toast"]:hover { background: var(--hk3-neutral-800); }
	.root[data-compact] & { height: 44px; padding: 0 16px; gap: 8px; font-size: 14px; }
}

.flash, .flash2 {
	position: absolute;
	inset: 0;
	opacity: 0;
	pointer-events: none;
}

.flash { background: var(--hk3-bg); }
.flash2 { background: var(--hk3-text); }

.bannerContent {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	min-width: 0;
	[data-kind='toast'] & {
		--banner-lead-width: 26px;
		width: 100%;
		display: grid;
		grid-template-columns: minmax(var(--banner-lead-width), 1fr) minmax(0, max-content) minmax(var(--banner-lead-width), 1fr);
		&:has(.bannerAction), &:has(.bannerEmoji) { --banner-lead-width: 56px; }
		> .bannerText { grid-column: 2; }
		> :only-child { grid-column: 1 / -1; justify-self: center; }
	}
}

.bannerLead {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 6px;
	min-width: 0;
	grid-column: 1;
}

.bannerFace, .face {
	width: 26px;
	height: 26px;
	flex: none;
	border: 2px solid var(--hk3-bg);
	border-radius: 0 !important;
	box-sizing: border-box;
	object-fit: cover;
	:global(img) { border-radius: 0 !important; }
}

.bannerWelcomeFace {
	border: 0;
	border-radius: 50% !important;
	overflow: hidden;
	:global(img) { border-radius: 50% !important; }
}

.face {
	margin-right: -6px;
	border-color: var(--hk3-accent);
}

.bannerIcon { flex: none; }

.bannerAction {
	--hata-toast-fg: var(--hk3-bg);
	--MI_THEME-accent: var(--hk3-accent);
	--MI_THEME-accentedBg: var(--hk3-accent-100);
	--MI_THEME-fgOnAccent: var(--hk3-bg);
	flex: none;
	position: relative;
	top: -3px;
}

/* Favorite's visible center (~29px) sits below the 44px frame center (22px). */
.bannerAction[data-action='favorite'] { top: -7px; }

.bannerEmoji {
	height: 26px;
	max-width: 52px;
	flex: none;
	object-fit: contain;
}

.bannerText {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.rise {
	display: inline-flex;
	width: 20px;
	height: 20px;
	overflow: hidden;
	flex: none;
}

.riseIcon {
	display: block;
	animation: hk3Rise 1.1s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}

@keyframes hk3Rise {
	0% { transform: translateY(70%); opacity: 0; }
	35% { opacity: 1; }
	65% { opacity: 1; }
	100% { transform: translateY(-70%); opacity: 0; }
}

.faces { display: flex; flex: none; }

.qcount {
	display: inline-block;
	margin-left: 8px;
	font-variant-numeric: tabular-nums;
}

.state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
	min-height: 200px;
	padding: 32px 20px;
	color: var(--hk3-neutral-700);
	font-size: 14px;
}

.retry {
	height: 36px;
	padding: 0 16px;
	border: 1px solid var(--hk3-divider);
	background: transparent;
	color: var(--hk3-text);
	cursor: pointer;
	font: inherit;
	font-weight: 700;

	&:hover { border-color: var(--hk3-accent); }
}

.list {
	display: flex;
	flex-direction: column;
}

.sentinel {
	display: grid;
	place-items: center;
	min-height: 64px;
	padding: 12px;
}

.end {
	font-size: 12px;
	color: var(--hk3-neutral-600);
}

@media (prefers-reduced-motion: reduce) {
	.riseIcon { animation: none; }
}
</style>
