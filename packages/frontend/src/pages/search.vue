<!--
SPDX-FileCopyrightText: syuilo and misskey-project / hatacha
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions">
	<div class="_spacer" style="--MI_SPACER-w: 800px;">
		<div class="_gaps">
			<!-- ===== 旗鯖カプセル型 検索バー ===== -->
			<!-- PC/タブレット: ヘッダ直下、スマホ: position fixed で下部に表示 -->
			<div :class="[$style.capsule, { [$style.capsuleMobile]: isSmartphone }]">
				<!-- 検索対象プルダウン -->
				<button
					ref="targetMenuBtn"
					type="button"
					:class="$style.target"
					:aria-label="i18n.ts._search.searchTarget"
					@click="openTargetMenu"
				>
					<i :class="targetIconClass"/>
					<span :class="$style.targetLabel">{{ targetLabel }}</span>
					<i class="ti ti-chevron-down" :class="$style.targetChevron"/>
				</button>

				<!-- 検索チップ入力 -->
				<input
					ref="queryInputEl"
					v-model="searchQuery"
					type="search"
					:class="$style.queryInput"
					:placeholder="queryPlaceholder"
					:autofocus="true"
					@keydown.enter.prevent="onEnter"
				/>

				<!-- クリアボタン(クエリがあるときのみ) -->
				<button
					v-if="searchQuery !== ''"
					type="button"
					:class="$style.clearBtn"
					tabindex="-1"
					aria-label="クリア"
					@click="clearQuery"
				>
					<i class="ti ti-x"/>
				</button>

				<!-- 検索ボタン(テーマカラー) -->
				<button
					type="button"
					:class="$style.searchBtn"
					:aria-label="i18n.ts.search"
					@click="executeSearch"
				>
					<i class="ti ti-search"/>
				</button>

				<!-- オプション(設定)ボタン -->
				<button
					ref="optionsBtn"
					type="button"
					:class="[$style.optionsBtn, { [$style.optionsBtnActive]: optionsOpen }]"
					:aria-label="i18n.ts.options"
					@click="toggleOptions"
				>
					<i class="ti ti-adjustments-horizontal"/>
				</button>
			</div>

			<!-- ===== オプションパネル(展開時) ===== -->
			<div v-if="optionsOpen" :class="$style.optionsPanel" class="_panel">
				<!-- ノート検索オプション -->
				<template v-if="target === 'note'">
					<MkSelect v-model="noteScope" :items="noteScopeDef" small>
						<template #label>{{ i18n.ts._search.searchScope }}</template>
					</MkSelect>

					<div v-if="instance.federation !== 'none' && noteScope === 'server'" :class="$style.subOption">
						<MkInput
							v-model="hostInput"
							:placeholder="i18n.ts._search.serverHostPlaceholder"
							@enter.prevent="executeSearch"
						>
							<template #label>{{ i18n.ts._search.pleaseEnterServerHost }}</template>
							<template #prefix><i class="ti ti-server"/></template>
						</MkInput>
					</div>

					<div v-if="noteScope === 'user'" :class="$style.subOption">
						<div :class="$style.userSelectLabel">{{ i18n.ts._search.pleaseSelectUser }}</div>
						<div v-if="user == null" :class="$style.userSelectButtons">
							<MkButton v-if="$i != null" transparent :class="$style.userSelectButton" @click="selectSelf">
								<div :class="$style.userSelectButtonInner">
									<span><i class="ti ti-plus"/><i class="ti ti-user"/></span>
									<span>{{ i18n.ts.selectSelf }}</span>
								</div>
							</MkButton>
							<MkButton transparent :class="$style.userSelectButton" @click="selectUser">
								<div :class="$style.userSelectButtonInner">
									<span><i class="ti ti-plus"/></span>
									<span>{{ i18n.ts.selectUser }}</span>
								</div>
							</MkButton>
						</div>
						<div v-else :class="$style.userSelected">
							<MkUserCardMini :user="user"/>
							<button type="button" :class="$style.userRemoveBtn" @click="removeUser">
								<i class="ti ti-x"/>
							</button>
						</div>
					</div>
				</template>

				<!-- ユーザー検索オプション -->
				<template v-else-if="target === 'user'">
					<MkSelect v-model="userOrigin" :items="userOriginDef" small @update:modelValue="executeSearch()">
						<template #label>{{ i18n.ts._search.searchScope }}</template>
					</MkSelect>
				</template>

				<!-- イベント検索オプション(CherryPick独自) -->
				<template v-else-if="target === 'event'">
					<MkSelect v-model="userOrigin" :items="userOriginDef" small @update:modelValue="executeSearch()">
						<template #label>{{ i18n.ts._search.searchScope }}</template>
					</MkSelect>
					<div :class="$style.subOption">
						<MkSelect v-model="eventSort" :items="eventSortDef" small>
							<template #label>{{ i18n.ts.sort }}</template>
						</MkSelect>
						<MkInput v-model="eventStartDate" small style="margin-top: 10px;" type="date">
							<template #label>{{ i18n.ts._event.startDate }}</template>
						</MkInput>
						<MkInput v-model="eventEndDate" small style="margin-top: 10px;" type="date">
							<template #label>{{ i18n.ts._event.endDate }}</template>
						</MkInput>
					</div>
				</template>
			</div>

			<!-- ===== 検索結果 ===== -->
			<!-- ノート結果 -->
			<div v-if="target === 'note'">
				<div v-if="!notesSearchAvailable">
					<MkInfo warn>{{ i18n.ts.notesSearchNotAvailable }}</MkInfo>
				</div>
				<MkFoldableSection v-else-if="notePaginator">
					<template #header>{{ i18n.ts.searchResult }}</template>
					<MkNotesTimeline :key="`searchNotes:${searchKey}`" :paginator="notePaginator"/>
				</MkFoldableSection>
			</div>

			<!-- ユーザー結果 -->
			<div v-else-if="target === 'user'">
				<div v-if="!usersSearchAvailable">
					<MkInfo warn>{{ i18n.ts.usersSearchNotAvailable }}</MkInfo>
				</div>
				<MkFoldableSection v-else-if="userPaginator">
					<template #header>{{ i18n.ts.searchResult }}</template>
					<MkUserList :key="`searchUsers:${searchKey}`" :paginator="userPaginator"/>
				</MkFoldableSection>
			</div>

			<!-- イベント結果 -->
			<div v-else-if="target === 'event'">
				<MkFoldableSection v-if="eventPaginator">
					<template #header>{{ i18n.ts.searchResult }}</template>
					<MkNotesTimeline :key="`searchEvents:${searchKey}`" :paginator="eventPaginator" :getDate="eventSort === 'startDate' ? note => note.event?.start : undefined"/>
				</MkFoldableSection>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, markRaw, ref, shallowRef, toRef, useTemplateRef, watch } from 'vue';
import type * as Misskey from 'cherrypick-js';
import type { MkSelectItem } from '@/components/MkSelect.vue';
import MkInput from '@/components/MkInput.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkButton from '@/components/MkButton.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkFoldableSection from '@/components/MkFoldableSection.vue';
import MkNotesTimeline from '@/components/MkNotesTimeline.vue';
import MkUserList from '@/components/MkUserList.vue';
import MkUserCardMini from '@/components/MkUserCardMini.vue';
import { Paginator } from '@/utility/paginator.js';
import { i18n } from '@/i18n.js';
import { instance } from '@/instance.js';
import { $i } from '@/i.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { useRouter } from '@/router.js';
import { definePage } from '@/page.js';
import { notesSearchAvailable, usersSearchAvailable } from '@/utility/check-permissions.js';
import { deviceKind } from '@/utility/device-kind.js';
import { host as localHost } from '@@/js/config.js';

const props = withDefaults(defineProps<{
	query?: string;
	userId?: string;
	username?: string;
	host?: string | null;
	type?: 'note' | 'user' | 'event';
	origin?: 'combined' | 'local' | 'remote';
}>(), {
	query: '',
	userId: undefined,
	username: undefined,
	host: undefined,
	type: 'note',
	origin: 'combined',
});

const router = useRouter();

// ===== 検索対象 =====
type SearchTarget = 'note' | 'user' | 'event';
const target = ref<SearchTarget>(toRef(props, 'type').value);

const targetItems: { value: SearchTarget; label: string; icon: string }[] = [
	{ value: 'note', label: i18n.ts.notes, icon: 'ti ti-pencil' },
	{ value: 'user', label: i18n.ts.users, icon: 'ti ti-users' },
	{ value: 'event', label: i18n.ts.events, icon: 'ti ti-calendar' },
];

const targetLabel = computed(() => targetItems.find(t => t.value === target.value)?.label ?? '');
const targetIconClass = computed(() => targetItems.find(t => t.value === target.value)?.icon ?? '');

function openTargetMenu(ev: MouseEvent) {
	const items = targetItems.map(t => ({
		type: 'button' as const,
		text: t.label,
		icon: t.icon,
		active: t.value === target.value,
		action: () => {
			target.value = t.value;
		},
	}));
	os.popupMenu(items, ev.currentTarget ?? ev.target);
}

// ===== 検索クエリ =====
const searchQuery = ref(toRef(props, 'query').value);
const queryInputEl = useTemplateRef('queryInputEl');

const queryPlaceholder = computed(() => {
	switch (target.value) {
		case 'note': return i18n.ts._search.notePlaceholder;
		case 'user': return i18n.ts._search.userPlaceholder;
		case 'event': return i18n.ts._search.eventPlaceholder;
		default: return i18n.ts.search;
	}
});

function clearQuery() {
	searchQuery.value = '';
	queryInputEl.value?.focus();
}

function onEnter() {
	executeSearch();
}

// ===== オプション展開 =====
const optionsOpen = ref(false);

function toggleOptions() {
	optionsOpen.value = !optionsOpen.value;
}

// ===== ノート検索: scope ===== //
const noteSearchableScope = instance.noteSearchableScope ?? 'local';

const noteScopeDef = computed<MkSelectItem[]>(() => {
	const items: MkSelectItem[] = [];
	if (instance.federation !== 'none' && noteSearchableScope === 'global') {
		items.push({ label: i18n.ts._search.searchScopeAll, value: 'all' });
	}
	items.push({ label: instance.federation === 'none' ? i18n.ts._search.searchScopeAll : i18n.ts._search.searchScopeLocal, value: 'local' });
	if (instance.federation !== 'none' && noteSearchableScope === 'global') {
		items.push({ label: i18n.ts._search.searchScopeServer, value: 'server' });
	}
	items.push({ label: i18n.ts._search.searchScopeUser, value: 'user' });
	return items;
});

const hostInput = ref(toRef(props, 'host').value ?? '');
const user = shallowRef<Misskey.entities.UserDetailed | null>(null);

// プロフィール検索ボタン経由で username/userId が指定されたとき、初期化処理
let fetchedUser: Misskey.entities.UserDetailed | null = null;
if (props.userId) {
	fetchedUser = await misskeyApi('users/show', { userId: props.userId }).catch(() => null);
}
if (props.username && fetchedUser == null) {
	fetchedUser = await misskeyApi('users/show', {
		username: props.username,
		...(props.host ? { host: props.host } : {}),
	}).catch(() => null);
}
if (fetchedUser != null) {
	if (!(noteSearchableScope === 'local' && fetchedUser.host != null)) {
		user.value = fetchedUser;
	}
}

const noteScope = ref<'all' | 'local' | 'server' | 'user'>((() => {
	if (user.value != null) return 'user';
	if (noteSearchableScope === 'local') return 'local';
	if (hostInput.value) return 'server';
	return 'all';
})());

// プロフィール検索経由で来た場合は最初からオプションパネルを開く(ユーザーが見えるように)
if (user.value != null) {
	optionsOpen.value = true;
}

function selectSelf() {
	user.value = $i;
}

function selectUser() {
	os.selectUser({
		includeSelf: true,
		localOnly: instance.noteSearchableScope === 'local',
	}).then(_user => {
		user.value = _user;
	});
}

function removeUser() {
	user.value = null;
}

// ===== ユーザー検索: origin ===== //
const userOriginDef = computed<MkSelectItem[]>(() => [
	{ label: i18n.ts.all, value: 'combined' },
	{ label: i18n.ts.local, value: 'local' },
	{ label: i18n.ts.remote, value: 'remote' },
]);
const userOrigin = ref(toRef(props, 'origin').value);

// ===== イベント検索 ===== //
const eventSortDef = computed<MkSelectItem[]>(() => [
	{ label: i18n.ts._event.startDate, value: 'startDate' },
	{ label: i18n.ts.reverseChronological, value: 'createdAt' },
]);
const eventSort = ref<string>('startDate');
const eventStartDate = ref<string | null>(null);
const eventEndDate = ref<string | null>(null);

// ===== Paginator ===== //
const searchKey = ref(0);
const notePaginator = shallowRef<Paginator<'notes/search'> | null>(null);
const userPaginator = shallowRef<Paginator<'users/search'> | null>(null);
const eventPaginator = shallowRef<Paginator<'notes/events/search'> | null>(null);

const fixHostIfLocal = (hostStr: string | null | undefined) => {
	if (!hostStr || hostStr === localHost) return '.';
	return hostStr;
};

async function executeSearch() {
	const query = searchQuery.value.toString().trim();
	if (!query && target.value !== 'event') return;

	// ===== AP lookup / @mention / #tag のショートカット ===== //
	if (query.startsWith('https://') && !query.includes(' ')) {
		const confirm = await os.confirm({ type: 'info', text: i18n.ts.lookupConfirm });
		if (!confirm.canceled) {
			const promise = misskeyApi('ap/show', { uri: query });
			os.promiseDialog(promise, null, null, i18n.ts.fetchingAsApObject);
			const res = await promise;
			if (res.type === 'User') {
				router.push('/@:acct/:page?', {
					params: { acct: `${res.object.username}@${res.object.host}` },
				});
			} else if (res.type === 'Note') {
				router.push('/notes/:noteId/:initialTab?', {
					params: { noteId: res.object.id },
				});
			}
			return;
		}
	}

	if (query.length > 1 && !query.includes(' ')) {
		if (query.startsWith('@')) {
			const confirm = await os.confirm({ type: 'info', text: i18n.ts.lookupConfirm });
			if (!confirm.canceled) {
				router.pushByPath(`/${query}`);
				return;
			}
		}
		if (query.startsWith('#')) {
			const confirm = await os.confirm({ type: 'info', text: i18n.ts.openTagPageConfirm });
			if (!confirm.canceled) {
				router.push('/tags/:tag', { params: { tag: query.substring(1) } });
				return;
			}
		}
	}

	// ===== 対象別の検索 ===== //
	if (target.value === 'note') {
		const params: any = { query };
		if (noteScope.value === 'user') {
			if (user.value == null) return;
			params.host = fixHostIfLocal(user.value.host);
			params.userId = user.value.id;
		} else if (instance.federation !== 'none' && noteScope.value === 'server') {
			let trimmedHost = hostInput.value?.trim();
			if (!trimmedHost) return;
			if (trimmedHost.startsWith('https://') || trimmedHost.startsWith('http://')) {
				try { trimmedHost = new URL(trimmedHost).host; } catch (err) { /* empty */ }
			}
			params.host = fixHostIfLocal(trimmedHost);
		} else if (instance.federation === 'none' || noteScope.value === 'local') {
			params.host = '.';
		}
		notePaginator.value = markRaw(new Paginator('notes/search', { limit: 10, params }));
	} else if (target.value === 'user') {
		userPaginator.value = markRaw(new Paginator('users/search', {
			limit: 10,
			offsetMode: true,
			params: {
				query,
				origin: instance.federation === 'none' ? 'local' : userOrigin.value,
			},
		}));
	} else if (target.value === 'event') {
		eventPaginator.value = markRaw(new Paginator('notes/events/search', {
			limit: 10,
			offsetMode: true,
			params: {
				query: query || undefined,
				sortBy: eventSort.value,
				sinceDate: eventStartDate.value ? (new Date(eventStartDate.value)).getTime() : undefined,
				untilDate: eventEndDate.value ? (new Date(eventEndDate.value)).getTime() + 1000 * 3600 * 24 : undefined,
				origin: userOrigin.value,
			},
		}));
	}

	searchKey.value++;
}

// 対象が変わったときに、結果はリセット(混乱回避)
watch(target, () => {
	notePaginator.value = null;
	userPaginator.value = null;
	eventPaginator.value = null;
});

// ===== レスポンシブ ===== //
const isSmartphone = deviceKind === 'smartphone';

const headerActions = computed(() => []);

definePage(() => ({
	title: i18n.ts.search,
	icon: 'ti ti-search',
}));
</script>

<style lang="scss" module>
/* ===== カプセル型検索バー ===== */
.capsule {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 6px 6px 6px 12px;
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 999px;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	transition: border-color 0.15s, box-shadow 0.15s;
}

.capsule:focus-within {
	border-color: var(--MI_THEME-accent);
	box-shadow: 0 0 0 3px color(from var(--MI_THEME-accent) srgb r g b / 0.15);
}

/* スマホでは画面下部に固定 */
.capsuleMobile {
	position: fixed;
	left: 12px;
	right: 12px;
	bottom: calc(env(safe-area-inset-bottom, 0px) + 88px); /* mobile-footer-menu (約68px) の上に余白を確保 */
	z-index: 100;
	background: var(--MI_THEME-panel);
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* 検索対象プルダウン */
.target {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 6px 10px;
	background: transparent;
	border: none;
	border-radius: 999px;
	font-size: 14px;
	color: var(--MI_THEME-fg);
	cursor: pointer;
	white-space: nowrap;
	transition: background 0.1s;
}

.target:hover {
	background: color(from var(--MI_THEME-fg) srgb r g b / 0.06);
}

.targetLabel {
	font-weight: 500;
}

.targetChevron {
	font-size: 0.75em;
	opacity: 0.6;
}

/* 入力欄 */
.queryInput {
	flex: 1;
	min-width: 0;
	padding: 8px 4px;
	background: transparent;
	border: none;
	outline: none;
	color: var(--MI_THEME-fg);
	font-size: 15px;
	font-family: inherit;
}

.queryInput::placeholder {
	color: var(--MI_THEME-fgMuted, color(from var(--MI_THEME-fg) srgb r g b / 0.5));
}

/* クリアボタン */
.clearBtn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	background: transparent;
	border: none;
	border-radius: 50%;
	color: var(--MI_THEME-fg);
	opacity: 0.55;
	cursor: pointer;
	transition: opacity 0.1s, background 0.1s;
}

.clearBtn:hover {
	opacity: 1;
	background: color(from var(--MI_THEME-fg) srgb r g b / 0.08);
}

/* 検索ボタン(テーマカラー) */
.searchBtn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	background: var(--MI_THEME-accent);
	border: none;
	border-radius: 50%;
	color: var(--MI_THEME-fgOnAccent, #fff);
	cursor: pointer;
	transition: filter 0.1s, transform 0.05s;
}

.searchBtn:hover {
	filter: brightness(1.08);
}

.searchBtn:active {
	transform: scale(0.96);
}

/* オプションボタン */
.optionsBtn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	background: transparent;
	border: none;
	border-radius: 50%;
	color: var(--MI_THEME-fg);
	opacity: 0.7;
	cursor: pointer;
	transition: opacity 0.1s, background 0.1s;
}

.optionsBtn:hover {
	opacity: 1;
	background: color(from var(--MI_THEME-fg) srgb r g b / 0.08);
}

.optionsBtnActive {
	background: color(from var(--MI_THEME-accent) srgb r g b / 0.15);
	color: var(--MI_THEME-accent);
	opacity: 1;
}

/* ===== オプションパネル ===== */
.optionsPanel {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 16px;
	border-radius: var(--MI-radius);
}

.subOption {
	background: color(from var(--MI_THEME-fg) srgb r g b / 0.04);
	border-radius: var(--MI-radius);
	padding: var(--MI-margin);
}

.userSelectLabel {
	font-size: 0.85em;
	padding: 0 0 8px;
	user-select: none;
}

.userSelectButtons {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 12px;
}

.userSelectButton {
	width: 100%;
	height: 100%;
	padding: 12px;
	border: 2px dashed color(from var(--MI_THEME-fg) srgb r g b / 0.4);
}

.userSelectButtonInner {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
}

.userSelected {
	display: grid;
	grid-template-columns: 1fr auto;
	align-items: center;
	gap: 8px;
}

.userRemoveBtn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	background: transparent;
	border: none;
	border-radius: 50%;
	color: var(--MI_THEME-error, #ff2a2a);
	cursor: pointer;
	transition: background 0.1s;
}

.userRemoveBtn:hover {
	background: color(from var(--MI_THEME-error, #ff2a2a) srgb r g b / 0.1);
}
</style>
