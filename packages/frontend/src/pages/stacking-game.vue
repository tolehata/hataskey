<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div class="_spacer" style="--MI_SPACER-w: 800px;">
		<div :class="$style.root">
			<div class="_gaps">
				<div class="_panel" :class="$style.hero">
					<div :class="$style.heroInner">
						<div :class="$style.heroTitle">🏗️ つみつみタワー</div>
						<div :class="$style.heroSub">絵文字を積み上げてハイスコアを目指そう！</div>
					</div>
				</div>

				<div class="_panel" :class="$style.menuCard">
					<div class="_gaps" style="padding: 20px;">
						<MkButton primary gradate large rounded inline @click="startGame">
							<i class="ti ti-player-play"></i> ソロプレイ
						</MkButton>
					</div>
				</div>

				<!-- AI対戦 -->
				<div class="_panel" :class="$style.menuCard">
					<div class="_gaps" style="padding: 20px;">
						<div style="font-weight:bold;">🤖 AI対戦</div>
						<div style="font-size:.85rem;opacity:.7;">AIと横並びで対決！先に崩した方が負け</div>
						<div :class="$style.modeList">
							<button :class="[$style.modeBtn, aiLevel === 'easy' && $style.modeBtnOn]" @click="aiLevel = 'easy'">
								<span :class="$style.modeEmoji">🐣</span>
								<span :class="$style.modeName">よわい</span>
							</button>
							<button :class="[$style.modeBtn, aiLevel === 'hard' && $style.modeBtnOn]" @click="aiLevel = 'hard'">
								<span :class="$style.modeEmoji">🤖</span>
								<span :class="$style.modeName">むずかしい</span>
							</button>
							<button :class="[$style.modeBtn, aiLevel === 'extreme' && $style.modeBtnOn]" @click="aiLevel = 'extreme'">
								<span :class="$style.modeEmoji">👹</span>
								<span :class="$style.modeName">つよすぎる</span>
							</button>
							<button :class="[$style.modeBtn, aiLevel === 'insane' && $style.modeBtnOn]" @click="aiLevel = 'insane'">
								<span :class="$style.modeEmoji">💀</span>
								<span :class="$style.modeName">エグい</span>
							</button>
						</div>
						<MkButton primary rounded inline @click="startAiGame">
							<i class="ti ti-swords"></i> AI対戦スタート
						</MkButton>
					</div>
				</div>

				<!-- サーバー対戦 -->
				<div class="_panel" :class="$style.menuCard">
					<div class="_gaps" style="padding: 20px;">
						<div style="font-weight:bold;">⚔️ サーバー対戦</div>
						<div style="font-size:.85rem;opacity:.7;">他のユーザーとリアルタイムで対決！観戦もできます</div>
						<MkButton primary rounded inline @click="goLobby">
							<i class="ti ti-door-enter"></i> ロビーに入る
						</MkButton>
					</div>
				</div>

				<div class="_panel" :class="$style.menuCard">
					<div class="_gaps_s" style="padding: 16px;">
						<div><b> 遊び方</b></div>
						<ol :class="$style.howTo">
							<li>サーバーの絵文字が上から落ちてきます</li>
							<li>左右に動かして落とす位置を決めましょう</li>
							<li>タップ/クリックで絵文字を落とします</li>
							<li>絵文字が台から落ちるとゲームオーバー</li>
							<li>たくさん積み上げてハイスコアを目指そう！</li>
						</ol>
					</div>
				</div>

				<!-- ランキング -->
				<div class="_panel" :class="$style.menuCard">
					<div class="_gaps_s" style="padding: 16px;">
						<div style="display:flex;align-items:center;justify-content:space-between;">
							<b> ランキング</b>
						</div>

						<div v-if="rankingLoading" style="text-align:center;padding:16px;opacity:.5;">
							<MkLoading/>
						</div>
						<div v-else-if="ranking.length === 0" style="text-align:center;padding:16px;opacity:.5;">
							まだ記録がありません
						</div>
						<div v-else :class="$style.rankList">
							<div v-for="(r, i) in ranking" :key="r.id" :class="$style.rankItem">
								<div :class="[$style.rankNum, i < 3 && $style.rankTop]">{{ i + 1 }}</div>
								<div :class="$style.rankAvatar">
									<img v-if="r.user?.avatarUrl" :src="r.user.avatarUrl" :class="$style.rankAvatarImg"/>
								</div>
								<div :class="$style.rankInfo">
									<div :class="$style.rankName"><MkUserName v-if="r.user" :user="r.user"/><span v-else>???</span></div>
									<div :class="$style.rankMeta">{{ r.blockCount }}個積み上げ</div>
								</div>
								<div :class="$style.rankScore">{{ r.score }}</div>
							</div>
						</div>
					</div>
				</div>

				<!-- 自分のスコア履歴 -->
				<div class="_panel" :class="$style.menuCard">
					<div class="_gaps_s" style="padding: 16px;">
						<div><b>あなたの記録</b></div>
						<div v-if="myScoresLoading" style="text-align:center;padding:12px;opacity:.5;">
							<MkLoading/>
						</div>
						<div v-else-if="myScores.length === 0" style="text-align:center;padding:12px;opacity:.5;">
							まだプレイしていません
						</div>
						<div v-else :class="$style.myScoreList">
							<div v-for="s in myScores" :key="s.id" :class="$style.myScoreItem">
								<div :class="$style.myScoreVal">{{ s.score }}</div>
								<div :class="$style.myScoreMeta">
									<span>{{ s.blockCount }}個</span>
									<span :class="$style.myScoreDate">{{ formatDate(s.createdAt) }}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue';
import MkButton from '@/components/MkButton.vue';
import { mainRouter } from '@/router.js';
import { definePage } from '@/page.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const aiLevel = ref('easy');

// ランキング
const ranking = ref<any[]>([]);
const rankingLoading = ref(false);

// 自分のスコア
const myScores = ref<any[]>([]);
const myScoresLoading = ref(false);

function formatDate(iso: string): string {
	const d = new Date(iso);
	return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function fetchRanking() {
	rankingLoading.value = true;
	try {
		ranking.value = await misskeyApi('stacking-game/ranking', {}) as any;
	} catch (e) {
		console.error('Failed to fetch ranking:', e);
		ranking.value = [];
	} finally {
		rankingLoading.value = false;
	}
}

async function fetchMyScores() {
	myScoresLoading.value = true;
	try {
		myScores.value = await misskeyApi('stacking-game/my-scores', { limit: 10 }) as any;
	} catch (e) {
		console.error('Failed to fetch my scores:', e);
		myScores.value = [];
	} finally {
		myScoresLoading.value = false;
	}
}

function startGame() {
	mainRouter.push('/stacking-game/play');
}

function startAiGame() {
	mainRouter.push(`/stacking-game/ai?ai=${aiLevel.value}`);
}

function goLobby() {
	mainRouter.push('/stacking-game/lobby');
}

onMounted(() => {
	fetchRanking();
	fetchMyScores();
});

definePage(() => ({
	title: 'つみつみタワー',
	icon: 'ti ti-building',
}));
</script>

<style lang="scss" module>
.root { max-width: 500px; margin: 0 auto; }
.hero {
	background: linear-gradient(135deg, var(--MI_THEME-accent), color-mix(in srgb, var(--MI_THEME-accent) 60%, #ff8800));
	border-radius: 16px; overflow: hidden;
}
.heroInner { padding: 32px 24px; text-align: center; }
.heroTitle { font-size: 1.8rem; font-weight: 900; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,.2); margin-bottom: 8px; }
.heroSub { font-size: .95rem; color: rgba(255,255,255,.85); }
.menuCard { border-radius: 14px; overflow: hidden; text-align: center; }
.modeList { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.modeBtn {
	display: flex; flex-direction: column; align-items: center; gap: 4px;
	padding: 12px 16px; border-radius: 12px; border: 2px solid var(--MI_THEME-divider);
	background: var(--MI_THEME-panel); cursor: pointer; font-family: inherit; transition: all .2s;
	&:hover { border-color: color-mix(in srgb, var(--MI_THEME-accent) 40%, var(--MI_THEME-divider)); }
}
.modeBtnOn { border-color: var(--MI_THEME-accent); background: var(--MI_THEME-accentedBg); }
.modeEmoji { font-size: 1.8rem; }
.modeName { font-size: .8rem; font-weight: 600; }
.howTo { text-align: left; font-size: .9em; line-height: 1.8; padding-left: 1.2em; margin: 0; }

// ランキング
.rankList { display: flex; flex-direction: column; gap: 2px; }
.rankItem {
	display: flex; align-items: center; gap: 10px; padding: 8px 4px;
	border-bottom: 1px solid color-mix(in srgb, var(--MI_THEME-divider) 50%, transparent);
	&:last-child { border-bottom: none; }
}
.rankNum { width: 24px; text-align: center; font-weight: 900; font-size: .9rem; opacity: .5; }
.rankTop { opacity: 1; color: var(--MI_THEME-accent); font-size: 1.1rem; }
.rankAvatar { flex-shrink: 0; }
.rankAvatarImg { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
.rankInfo { flex: 1; min-width: 0; text-align: left; }
.rankName { font-weight: 600; font-size: .9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rankMeta { font-size: .75rem; opacity: .5; }
.rankScore { font-weight: 900; font-size: 1.1rem; color: var(--MI_THEME-accent); font-variant-numeric: tabular-nums; }

// 自分のスコア
.myScoreList { display: flex; flex-direction: column; gap: 4px; }
.myScoreItem {
	display: flex; align-items: center; justify-content: space-between; padding: 6px 4px;
	border-bottom: 1px solid color-mix(in srgb, var(--MI_THEME-divider) 50%, transparent);
	&:last-child { border-bottom: none; }
}
.myScoreVal { font-weight: 900; font-size: 1.1rem; color: var(--MI_THEME-accent); font-variant-numeric: tabular-nums; }
.myScoreMeta { display: flex; gap: 8px; font-size: .75rem; opacity: .6; }
.myScoreDate { }
</style>
