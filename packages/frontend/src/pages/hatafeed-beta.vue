<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: HataFeed のベータ機能ページ。新機能を試せる場(中身は今後追加)。
-->
<template>
<MkStickyContainer>
	<template #header><MkPageHeader :title="'ベータ機能を試す'" :icon="'ti ti-flask'"/></template>
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

			<!-- 旗鯖fork(#31): ミュートユーザーのリアクション非表示は正式機能へ昇格し、
			     旗鯖独自設定 → 旗鯖全体 → リアクション に移動した。
			     ⚠️ここに案内を残す（前の場所を覚えている人が迷子になるため）。
			     HatasabaUI 2 と吹き出しデザインのトグルも同様に HatasabaUI 2 タブへ移動済み。 -->
			<div :class="$style.toggleSection">
				<div :class="$style.toggleHead"><i class="ti ti-arrow-right-circle"></i> 正式機能になりました</div>
				<button :class="$style.featureCard" @click="router.push('/settings/hata-custom')">
					<i class="ti ti-mood-off" :class="$style.featureIcon"></i>
					<div :class="$style.featureBody">
						<div :class="$style.featureTitle">ミュートしたユーザーのリアクションを隠す</div>
						<div :class="$style.featureDesc">ベータを卒業しました。設定は「旗鯖独自設定 → 旗鯖全体 → リアクション」にあります。</div>
					</div>
					<i class="ti ti-chevron-right" :class="$style.featureArrow"></i>
				</button>
			</div>
		</div>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import MkInfo from '@/components/MkInfo.vue';
import { definePage } from '@/page.js';
import { useRouter } from '@/router.js';
import { hataBetaFeatures } from '@/utility/hatafeed.js';

const router = useRouter();

// 旗鯖fork: HatasabaUI 2 / 吹き出し / ミュートリアクション非表示 はいずれも正式機能へ昇格し、
// 旗鯖独自設定へ移動した。ここには移動先への案内だけを残している。

// 旗鯖fork: 左上の戻るボタン(MkPageHeader 標準)があるので、右上に重複する
// 戻る action は置かない(帯が下の UI に被って邪魔になるため廃止)。

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
