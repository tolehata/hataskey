<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 900px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<div class="_gaps_m">

			<!-- 検索フィルタ -->
			<div :class="$style.filterBar">
				<MkInput v-model="searchQuery" :class="$style.searchInput" placeholder="ユーザー名で検索" @update:modelValue="onSearchChange">
					<template #prefix><i class="ti ti-search"></i></template>
				</MkInput>
				<div :class="$style.filterBtns">
					<button :class="[$style.filterBtn, filterMode === 'all' && $style.filterBtnOn]" @click="setFilter('all')">すべて</button>
					<button :class="[$style.filterBtn, filterMode === 'externalTl' && $style.filterBtnOn]" @click="setFilter('externalTl')">外部TL同意済み</button>
					<button :class="[$style.filterBtn, filterMode === 'customFont' && $style.filterBtnOn]" @click="setFilter('customFont')">フォント免責同意済み</button>
				</div>
			</div>

			<!-- 統計 -->
			<div :class="$style.statsRow">
				<div :class="$style.statCard">
					<div :class="$style.statNum">{{ totalCount }}</div>
					<div :class="$style.statLabel">該当ユーザー数</div>
				</div>
			</div>

			<!-- ユーザー一覧 -->
			<MkLoading v-if="loading" />
			<div v-else-if="users.length === 0" :class="$style.emptyMsg">
				<i class="ti ti-mood-empty"></i>
				<span>該当するユーザーがいません</span>
			</div>
			<div v-else :class="$style.userList">
				<div v-for="u in users" :key="u.id" :class="$style.userRow">
					<img v-if="u.avatarUrl" :src="u.avatarUrl" :class="$style.userAvatar" />
					<div v-else :class="[$style.userAvatar, $style.userAvatarPlaceholder]"><i class="ti ti-user"></i></div>
					<div :class="$style.userInfo">
						<div :class="$style.userName">
							<strong>{{ u.name || u.username }}</strong>
							<span :class="$style.userAcct">@{{ u.username }}</span>
						</div>
						<div :class="$style.consentBadges">
							<span v-if="u.hataConsentExternalTl" :class="[$style.badge, $style.badgeGreen]">
								<i class="ti ti-link"></i> 外部TL同意済み
								<span v-if="u.hataConsentExternalTlDate" :class="$style.badgeDate">{{ formatDate(u.hataConsentExternalTlDate) }}</span>
							</span>
							<span v-else :class="[$style.badge, $style.badgeGray]">
								<i class="ti ti-link-off"></i> 外部TL未同意
							</span>
							<span v-if="u.hataConsentCustomFont" :class="[$style.badge, $style.badgeBlue]">
								<i class="ti ti-typography"></i> フォント免責同意済み
								<span v-if="u.hataConsentCustomFontDate" :class="$style.badgeDate">{{ formatDate(u.hataConsentCustomFontDate) }}</span>
							</span>
							<span v-else :class="[$style.badge, $style.badgeGray]">
								<i class="ti ti-typography-off"></i> フォント免責未同意
							</span>
						</div>
					</div>
				</div>
			</div>

			<div v-if="!loading && hasMore" :class="$style.loadMoreWrap">
				<button class="_buttonPrimary" @click="loadMore" style="padding: 8px 24px;">もっと読み込む</button>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import MkInput from '@/components/MkInput.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { definePage } from '@/page.js';

const PAGE_SIZE = 50;

const loading = ref(true);
const searchQuery = ref('');
const filterMode = ref<'all' | 'externalTl' | 'customFont'>('all');

interface ConsentUser {
	id: string;
	username: string;
	name: string | null;
	avatarUrl: string | null;
	hataConsentExternalTl: boolean;
	hataConsentExternalTlDate: string | null;
	hataConsentCustomFont: boolean;
	hataConsentCustomFontDate: string | null;
}

const users = ref<ConsentUser[]>([]);
const totalCount = ref(0);
const hasMore = ref(false);

let searchTimer: ReturnType<typeof setTimeout> | null = null;

function formatDate(iso: string | null): string {
	if (!iso) return '';
	const d = new Date(iso);
	return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

async function fetchUsers(reset = true) {
	loading.value = true;
	try {
		const result = await misskeyApi('admin/hata/consent-list', {
			limit: PAGE_SIZE,
			offset: reset ? 0 : users.value.length,
			filter: filterMode.value,
			username: searchQuery.value || null,
		});
		if (reset) {
			users.value = result.users;
		} else {
			users.value.push(...result.users);
		}
		totalCount.value = result.total;
		hasMore.value = users.value.length < result.total;
	} catch (err) {
		console.error('Failed to load consent data:', err);
	} finally {
		loading.value = false;
	}
}

function loadMore() {
	fetchUsers(false);
}

function setFilter(mode: 'all' | 'externalTl' | 'customFont') {
	filterMode.value = mode;
	fetchUsers(true);
}

function onSearchChange() {
	if (searchTimer) clearTimeout(searchTimer);
	searchTimer = setTimeout(() => fetchUsers(true), 400);
}

onMounted(() => {
	fetchUsers();
});

const headerActions = computed(() => [{
	icon: 'ti ti-refresh',
	text: '更新',
	handler: () => fetchUsers(true),
}]);

const headerTabs = computed(() => []);

definePage({
	title: '同意管理',
	icon: 'ti ti-shield-check',
});
</script>

<style lang="scss" module>
.filterBar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.searchInput { flex: 1; min-width: 200px; }
.filterBtns { display: flex; gap: 4px; flex-wrap: wrap; }
.filterBtn {
	padding: 6px 14px; border-radius: 20px; border: 1px solid var(--MI_THEME-divider);
	background: transparent; color: var(--MI_THEME-fg); font-family: inherit; font-size: .82rem;
	cursor: pointer; transition: all .2s;
	&:hover { background: var(--MI_THEME-accentedBg); }
}
.filterBtnOn { background: var(--MI_THEME-accentedBg); color: var(--MI_THEME-accent); border-color: var(--MI_THEME-accent); font-weight: 600; }
.statsRow { display: flex; gap: 12px; flex-wrap: wrap; }
.statCard {
	flex: 1; min-width: 120px; padding: 16px; border-radius: 12px;
	background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); text-align: center;
}
.statNum { font-size: 1.8em; font-weight: 700; color: var(--MI_THEME-accent); }
.statLabel { font-size: .82rem; opacity: .7; margin-top: 4px; }
.emptyMsg { padding: 40px; text-align: center; opacity: .5; display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: .9rem; }
.userList { display: flex; flex-direction: column; gap: 6px; }
.userRow {
	display: flex; align-items: center; gap: 12px; padding: 12px 16px;
	background: var(--MI_THEME-panel); border-radius: 12px; border: 1px solid var(--MI_THEME-divider);
}
.userAvatar { width: 40px; height: 40px; flex-shrink: 0; border-radius: 50%; object-fit: cover; }
.userAvatarPlaceholder {
	display: flex; align-items: center; justify-content: center;
	background: var(--MI_THEME-accentedBg); color: var(--MI_THEME-accent); font-size: 1.2em;
}
.userInfo { flex: 1; min-width: 0; }
.userName { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
.userAcct { font-size: .82rem; opacity: .5; }
.consentBadges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.badge {
	display: inline-flex; align-items: center; gap: 4px;
	padding: 2px 10px; border-radius: 12px; font-size: .75rem; font-weight: 500;
}
.badgeGreen { background: color-mix(in srgb, var(--MI_THEME-success) 15%, transparent); color: var(--MI_THEME-success); }
.badgeBlue { background: color-mix(in srgb, var(--MI_THEME-accent) 15%, transparent); color: var(--MI_THEME-accent); }
.badgeGray { background: color-mix(in srgb, var(--MI_THEME-fg) 8%, transparent); color: var(--MI_THEME-fg); opacity: .5; }
.badgeDate { font-size: .68rem; opacity: .7; margin-left: 2px; }
.loadMoreWrap { text-align: center; padding: 12px; }
</style>
