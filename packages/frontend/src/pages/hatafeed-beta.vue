<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: HataFeed のベータ機能ページ。新機能を試せる場(中身は今後追加)。
-->
<template>
<MkStickyContainer>
	<template #header><MkPageHeader :title="'ベータ機能を試す'" /></template>
	<MkSpacer :contentMax="800">
		<div :class="$style.root">
			<div :class="$style.hero">
				<FlaskConical :size="32" :class="$style.heroIcon" />
				<div :class="$style.heroTitle">ベータ機能</div>
			</div>

			<MkInfo warn>
				この機能はベータ版であり、正しく機能するとは限りません。何か問題が発生した場合は、お気軽にイシューを立てていただきますよう、よろしくお願いします。
			</MkInfo>

			<!-- 旗鯖fork: ベータ機能一覧(hataBetaFeatures と同期) -->
			<div v-if="hataBetaFeatures.length === 0" :class="$style.empty">
				<Sparkles :size="48" :class="$style.emptyIcon" />
				<div>現在、試せるベータ機能はありません。</div>
				<div :class="$style.emptySub">新しい機能が用意され次第、ここに表示されます。</div>
			</div>
			<button v-for="f in hataBetaFeatures" :key="f.id" type="button" :class="$style.featureCard" @click="openFeature(f.route)">
				<component :is="getLucideComponent(f.icon)" :size="28" :class="$style.featureIcon" />
				<div :class="$style.featureBody">
					<div :class="$style.featureTitle">{{ f.title }}</div>
					<div :class="$style.featureDesc">{{ f.desc }}</div>
				</div>
				<ChevronRight :size="24" :class="$style.featureArrow" />
			</button>

			<div :class="$style.toggleSection">
				<div :class="$style.toggleHead"><Clock :size="18" /> 投稿</div>
				<div :class="$style.toggleCard">
					<MkSwitch v-model="postDelayEnabledModel">
						<template #label>投稿前にカウントダウンする</template>
						<template #caption>投稿ボタンを押してから送信まで猶予を作ります。待機中は投稿フォームの枠が残り時間を示し、「取り消す」「今すぐ投稿」を選べます。この端末だけに保存されます。</template>
					</MkSwitch>
					<div v-if="postDelayEnabledModel" :class="$style.delayOptions">
						<div :class="$style.delayLabel">待機する時間</div>
						<div :class="$style.presets" aria-label="待機時間の早選び">
							<button v-for="seconds in POST_SEND_DELAY_PRESETS" :key="seconds" class="_button" :class="[$style.preset, postDelaySecondsModel === seconds && $style.presetActive]" @click="postDelaySecondsModel = seconds">{{ seconds }}秒</button>
						</div>
					</div>
					<div :class="$style.localNote"><Smartphone :size="16" /> 通常投稿・返信・引用が対象です。編集、予約投稿、下書き、外部アカウント投稿には適用しません。</div>
				</div>
			</div>

			<!-- 旗鯖fork(#31): ミュートユーザーのリアクション非表示は正式機能へ昇格し、
			     旗鯖独自設定 → 旗鯖全体 → リアクション に移動した。
			     ⚠️ここに案内を残す（前の場所を覚えている人が迷子になるため）。
			     HatasabaUI 2 と吹き出しデザインのトグルも同様に HatasabaUI 2 タブへ移動済み。 -->
			<div :class="$style.toggleSection">
				<div :class="$style.toggleHead"><ArrowRightCircle :size="18" /> 正式機能になりました</div>
				<button :class="$style.featureCard" @click="router.push('/settings/hata-custom')">
					<Frown :size="28" :class="$style.featureIcon" />
					<div :class="$style.featureBody">
						<div :class="$style.featureTitle">ミュートしたユーザーのリアクションを隠す</div>
						<div :class="$style.featureDesc">ベータを卒業しました。設定は「旗鯖独自設定 → 旗鯖全体 → リアクション」にあります。</div>
					</div>
					<ChevronRight :size="24" :class="$style.featureArrow" />
				</button>
			</div>
		</div>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { FlaskConical, Sparkles, ChevronRight, Clock, Smartphone, ArrowRightCircle, Frown, Code } from '@lucide/vue';
import MkInfo from '@/components/MkInfo.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import { definePage } from '@/page.js';
import { useRouter } from '@/router.js';
import { hataBetaFeatures } from '@/utility/hatafeed.js';
import {
	POST_SEND_DELAY_PRESETS,
	postSendDelayEnabled,
	postSendDelaySeconds,
	setPostSendDelayEnabled,
	setPostSendDelaySeconds,
} from '@/utility/post-send-delay.js';

const router = useRouter();

const postDelayEnabledModel = computed({
	get: () => postSendDelayEnabled.value,
	set: setPostSendDelayEnabled,
});
const postDelaySecondsModel = computed({
	get: () => postSendDelaySeconds.value,
	set: setPostSendDelaySeconds,
});

// 旗鯖fork: HatasabaUI 2 / 吹き出し / ミュートリアクション非表示 はいずれも正式機能へ昇格し、
// 旗鯖独自設定へ移動した。ここには移動先への案内だけを残している。

// 旗鯖fork: 左上の戻るボタン(MkPageHeader 標準)があるので、右上に重複する
// 戻る action は置かない(帯が下の UI に被って邪魔になるため廃止)。

function getLucideComponent(name: string) {
	if (name === 'Code') return Code;
	return FlaskConical;
}

function openFeature(route: string) {
	router.push(route as never);
}

definePage(() => ({
	title: 'ベータ機能を試す',
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
.featureIcon { color: var(--MI_THEME-accent); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.featureBody { flex: 1; min-width: 0; }
.featureTitle { font-weight: 700; }
.featureDesc { font-size: .85em; opacity: .7; margin-top: 2px; }
.featureArrow { opacity: .4; }

/* 旗鯖fork: トグル式ベータ設定 */
.toggleSection { margin-top: 6px; }
.toggleHead { font-weight: 700; font-size: .9em; opacity: .8; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.toggleCard { background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); border-radius: 14px; padding: 16px 18px; }
.delayOptions { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
.delayLabel { font-size: .84em; font-weight: 700; opacity: .78; }
.presets { display: flex; flex-wrap: wrap; gap: 7px; }
.preset { min-width: 54px; padding: 7px 11px; border: 1px solid var(--MI_THEME-divider); border-radius: 999px; background: var(--MI_THEME-bg); font-weight: 700; }
.presetActive { color: var(--MI_THEME-fgOnAccent); border-color: var(--MI_THEME-accent); background: var(--MI_THEME-accent); }
.localNote { margin-top: 14px; font-size: .82em; line-height: 1.6; opacity: .72; }
</style>
