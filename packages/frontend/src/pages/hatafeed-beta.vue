<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: HataFeed のベータ機能ページ。新機能を試せる場(中身は今後追加)。
-->
<template>
<MkStickyContainer>
	<template #header><MkPageHeader :actions="headerActions" :title="'ベータ機能を試す'" :icon="'ti ti-flask'"/></template>
	<MkSpacer :contentMax="800">
		<div :class="$style.root">
			<div :class="$style.hero">
				<i class="ti ti-flask-2" :class="$style.heroIcon"></i>
				<div :class="$style.heroTitle">ベータ機能</div>
			</div>

			<MkInfo warn>
				この機能はベータ版であり、正しく機能するとは限りません。何か問題が発生した場合は、お気軽にイシューを立てていただきますよう、よろしくお願いします。
			</MkInfo>

			<!-- 旗鯖fork: ベータ機能一覧(hataBetaFeatures と同期) -->
			<div v-if="hataBetaFeatures.length === 0" :class="$style.empty">
				<i class="ti ti-sparkles" :class="$style.emptyIcon"></i>
				<div>現在、試せるベータ機能はありません。</div>
				<div :class="$style.emptySub">新しい機能が用意され次第、ここに表示されます。</div>
			</div>
			<button v-for="f in hataBetaFeatures" :key="f.id" :class="$style.featureCard" @click="router.push(f.route)">
				<i :class="[f.icon, $style.featureIcon]"></i>
				<div :class="$style.featureBody">
					<div :class="$style.featureTitle">{{ f.title }}</div>
					<div :class="$style.featureDesc">{{ f.desc }}</div>
				</div>
				<i class="ti ti-chevron-right" :class="$style.featureArrow"></i>
			</button>

			<!-- 旗鯖fork(#31): トグル式のベータ設定（この端末のみ） -->
			<div :class="$style.toggleSection">
				<div :class="$style.toggleHead"><i class="ti ti-settings"></i> ベータ設定（この端末のみ）</div>
				<div :class="$style.toggleCard">
					<MkSwitch v-model="hideMutedReactions">
						<template #label>ミュートしたユーザーのリアクションを隠す</template>
						<template #caption>ミュートした人が付けたリアクションを、ノート上に表示しないようにします（最近付けられたリアクションが対象です）。この設定は<b>この端末にだけ</b>保存され、ほかの端末には引き継がれません。</template>
					</MkSwitch>
				</div>
			</div>
		</div>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { computed, watch } from 'vue';
import MkInfo from '@/components/MkInfo.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import { definePage } from '@/page.js';
import { useRouter } from '@/router.js';
import { hataBetaFeatures } from '@/utility/hatafeed.js';
import { hideMutedReactionsLocal, setHideMutedReactionsLocal } from '@/utility/hatasaba-device-prefs.js';

const router = useRouter();

// 旗鯖fork(#31): ミュートユーザーのリアクション非表示（端末ローカル・ベータ）。
const hideMutedReactions = computed({
	get: () => hideMutedReactionsLocal.value,
	set: (v: boolean) => setHideMutedReactionsLocal(v),
});
// OFF→ON時にミュートリストを即座に取得（取りこぼし防止）。
watch(hideMutedReactions, async (newVal) => {
	if (newVal) {
		const { fetchMutedUsers, invalidateMutedUsers } = await import('@/utility/muted-users.js');
		invalidateMutedUsers();
		fetchMutedUsers();
	}
});

const headerActions = computed(() => [{
	icon: 'ti ti-arrow-left',
	text: 'HataFeedへ',
	handler: () => { router.push('/hatafeed'); },
}]);

definePage(() => ({
	title: 'ベータ機能を試す',
	icon: 'ti ti-flask',
}));
</script>

<style lang="scss" module>
.root { display: flex; flex-direction: column; gap: 18px; }
.hero { display: flex; align-items: center; gap: 12px; padding: 8px 2px; }
.heroIcon { font-size: 2rem; color: var(--MI_THEME-accent); }
.heroTitle { font-size: 1.4rem; font-weight: 700; }
.empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 48px 0; text-align: center; opacity: .8; }
.emptyIcon { font-size: 2.4rem; opacity: .4; }
.emptySub { font-size: .85em; opacity: .6; }

/* 旗鯖fork: ベータ機能カード */
.featureCard {
	display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; color: inherit;
	background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); border-radius: 14px;
	padding: 16px 18px; cursor: pointer; transition: all .15s;
}
.featureCard:hover { border-color: var(--MI_THEME-accent); transform: translateY(-1px); }
.featureIcon { font-size: 1.8rem; color: var(--MI_THEME-accent); flex-shrink: 0; }
.featureBody { flex: 1; min-width: 0; }
.featureTitle { font-weight: 700; }
.featureDesc { font-size: .85em; opacity: .7; margin-top: 2px; }
.featureArrow { opacity: .4; }

/* 旗鯖fork: トグル式ベータ設定 */
.toggleSection { margin-top: 6px; }
.toggleHead { font-weight: 700; font-size: .9em; opacity: .8; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.toggleCard { background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); border-radius: 14px; padding: 16px 18px; }
</style>
