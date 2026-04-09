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
						<div :class="$style.heroTitle">🔨 絵文字叩きゲーム</div>
						<div :class="$style.heroSub">出てくる絵文字を素早くたたこう！</div>
					</div>
				</div>

				<div class="_panel" :class="$style.menuCard">
					<div class="_gaps" style="padding: 20px;">
						<div style="font-weight:bold;">難易度を選択</div>
						<div :class="$style.diffList">
							<button v-for="d in 10" :key="d" :class="[$style.diffBtn, selectedDiff === d && $style.diffBtnOn]" @click="selectedDiff = d">
								{{ d }}
							</button>
						</div>
						<div :class="$style.diffDesc">
							<span v-if="selectedDiff <= 3">🟢 かんたん — ゆっくりペースで出現</span>
							<span v-else-if="selectedDiff <= 6">🟡 ふつう — そこそこの速さ</span>
							<span v-else-if="selectedDiff <= 8">🟠 むずかしい — 素早い反射神経が必要</span>
							<span v-else>🔴 超上級 — 一瞬の判断力が試される！</span>
						</div>

						<div style="border-top: 1px solid var(--MI_THEME-divider); padding-top: 12px; margin-top: 8px;">
							<div style="font-weight:bold; margin-bottom: 8px;">ゲームモード</div>
							<div :class="$style.diffList">
								<button :class="[$style.diffBtn, { [$style.diffBtnOn]: gameMode === 'normal' }]" style="width:auto;padding:6px 14px;" @click="gameMode = 'normal'">⏱️ 通常</button>
								<button :class="[$style.diffBtn, { [$style.diffBtnOn]: gameMode === 'endless' }]" style="width:auto;padding:6px 14px;" @click="gameMode = 'endless'">♾️ エンドレス</button>
							</div>
							<div v-if="gameMode === 'endless'" style="font-size:.8rem;opacity:.6;margin-top:4px;">
								叩くたびに時間が回復！スコアを稼ぐほど長く遊べます
							</div>
						</div>

						<div style="border-top: 1px solid var(--MI_THEME-divider); padding-top: 12px; margin-top: 8px;">
							<div style="font-weight:bold; margin-bottom: 8px;">AI対戦</div>
							<div :class="$style.diffList">
								<button :class="[$style.diffBtn, { [$style.diffBtnOn]: aiLevel === '' }]" style="width:auto;padding:6px 10px;" @click="aiLevel = ''">🚫 なし</button>
								<button :class="[$style.diffBtn, { [$style.diffBtnOn]: aiLevel === 'easy' }]" style="width:auto;padding:6px 10px;" @click="aiLevel = 'easy'">🐣 よわい</button>
								<button :class="[$style.diffBtn, { [$style.diffBtnOn]: aiLevel === 'hard' }]" style="width:auto;padding:6px 10px;" @click="aiLevel = 'hard'">🤖 むずかしい</button>
								<button :class="[$style.diffBtn, { [$style.diffBtnOn]: aiLevel === 'extreme' }]" style="width:auto;padding:6px 10px;" @click="aiLevel = 'extreme'">👹 つよすぎる</button>
								<button :class="[$style.diffBtn, { [$style.diffBtnOn]: aiLevel === 'insane' }]" style="width:auto;padding:6px 10px;" @click="aiLevel = 'insane'">💀 エグい</button>
							</div>
						</div>

						<MkButton primary gradate large rounded inline @click="startGame" style="margin-top: 12px;">
							<i class="ti ti-player-play"></i> ゲームスタート
						</MkButton>
					</div>
				</div>

				<!-- サーバー対戦 -->
				<div class="_panel" :class="$style.menuCard">
					<div class="_gaps" style="padding: 20px;">
						<div style="font-weight:bold;">⚔️ サーバー対戦</div>
						<div style="font-size:.85rem;opacity:.7;">他のユーザーとリアルタイムでスコアを競おう！観戦もできます</div>
						<MkButton primary rounded inline @click="goLobby">
							<i class="ti ti-door-enter"></i> ロビーに入る
						</MkButton>
					</div>
				</div>

				<div class="_panel" :class="$style.menuCard">
					<div class="_gaps_s" style="padding: 16px;">
						<div><b> 遊び方</b></div>
						<ol :class="$style.howTo">
							<li>制限時間30秒でスタート</li>
							<li>穴から出てくる絵文字をクリック/タップで叩きます</li>
							<li>叩くとスコアが加算！難易度が高いほどスコアも高い</li>
							<li>出てこないマスを叩くとミス（減点）</li>
							<li>時間切れでゲームオーバー、ハイスコアを目指そう！</li>
						</ol>
					</div>
				</div>

				<!-- ランキング -->
				<div class="_panel" :class="$style.menuCard">
					<div class="_gaps_s" style="padding: 16px;">
						<div style="display:flex;align-items:center;justify-content:space-between;">
							<b> ランキング</b>
							<div :class="$style.rankDiffTabs">
								<button v-for="d in [1,3,5,7,10]" :key="d" :class="[$style.rankDiffTab, rankDiff === d && $style.rankDiffTabOn]" @click="rankDiff = d; fetchRanking();">
									Lv{{ d }}
								</button>
							</div>
						</div>
						<div v-if="rankingLoading" style="text-align:center;padding:16px;opacity:.5;"><MkLoading/></div>
						<div v-else-if="ranking.length === 0" style="text-align:center;padding:16px;opacity:.5;">まだ記録がありません</div>
						<div v-else :class="$style.rankList">
							<div v-for="(r, i) in ranking" :key="r.id" :class="$style.rankItem">
								<div :class="[$style.rankNum, i < 3 && $style.rankTop]">{{ i + 1 }}</div>
								<div :class="$style.rankAvatar">
									<img v-if="r.user?.avatarUrl" :src="r.user.avatarUrl" :class="$style.rankAvatarImg"/>
								</div>
								<div :class="$style.rankInfo">
									<div :class="$style.rankName"><MkUserName v-if="r.user" :user="r.user"/><span v-else>???</span></div>
									<div :class="$style.rankMeta">{{ r.hits }}hit / {{ r.misses }}miss</div>
								</div>
								<div :class="$style.rankScore">{{ r.score }}</div>
							</div>
						</div>
					</div>
				</div>

				<!-- 自分の記録 -->
				<div class="_panel" :class="$style.menuCard">
					<div class="_gaps_s" style="padding: 16px;">
						<div><b>♾️ エンドレスランキング</b></div>
						<div v-if="endlessRankingLoading" style="text-align:center;padding:12px;opacity:.5;"><MkLoading/></div>
						<div v-else-if="endlessRanking.length === 0" style="text-align:center;padding:12px;opacity:.5;">まだ記録がありません</div>
						<div v-else :class="$style.rankList">
							<div v-for="(r, i) in endlessRanking" :key="r.id" :class="$style.rankItem">
								<div :class="[$style.rankNum, i < 3 && $style.rankTop]">{{ i + 1 }}</div>
								<div :class="$style.rankAvatar">
									<img v-if="r.user?.avatarUrl" :src="r.user.avatarUrl" :class="$style.rankAvatarImg"/>
								</div>
								<div :class="$style.rankInfo">
									<div :class="$style.rankName"><MkUserName v-if="r.user" :user="r.user"/><span v-else>???</span></div>
									<div :class="$style.rankMeta">{{ r.hits }}hit / {{ r.misses }}miss</div>
								</div>
								<div :class="$style.rankScore">{{ r.score }}</div>
							</div>
						</div>
					</div>
				</div>

				<!-- 自分の記録 -->
				<div class="_panel" :class="$style.menuCard">
					<div class="_gaps_s" style="padding: 16px;">
						<div><b> あなたの記録</b></div>
						<div v-if="myScoresLoading" style="text-align:center;padding:12px;opacity:.5;"><MkLoading/></div>
						<div v-else-if="myScores.length === 0" style="text-align:center;padding:12px;opacity:.5;">まだプレイしていません</div>
						<div v-else :class="$style.myScoreList">
							<div v-for="s in myScores" :key="s.id" :class="$style.myScoreItem">
								<div :class="$style.myScoreVal">{{ s.score }}</div>
								<div :class="$style.myScoreMeta">
									<span>Lv{{ s.difficulty }}</span>
									<span>{{ s.hits }}hit</span>
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
import { ref, onMounted } from 'vue';
import MkButton from '@/components/MkButton.vue';
import { mainRouter } from '@/router.js';
import { definePage } from '@/page.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const selectedDiff = ref(5);
const rankDiff = ref(5);
const gameMode = ref('normal');
const aiLevel = ref('');
const ranking = ref<any[]>([]);
const rankingLoading = ref(false);
const myScores = ref<any[]>([]);
const myScoresLoading = ref(false);
const endlessRanking = ref<any[]>([]);
const endlessRankingLoading = ref(false);

function formatDate(iso: string): string {
	const d = new Date(iso);
	return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function fetchRanking() {
	rankingLoading.value = true;
	try {
		ranking.value = await misskeyApi('whack-emoji/ranking', { difficulty: rankDiff.value }) as any;
	} catch { ranking.value = []; }
	finally { rankingLoading.value = false; }
}

async function fetchMyScores() {
	myScoresLoading.value = true;
	try {
		myScores.value = await misskeyApi('whack-emoji/my-scores', { limit: 10 }) as any;
	} catch { myScores.value = []; }
	finally { myScoresLoading.value = false; }
}

async function fetchEndlessRanking() {
	endlessRankingLoading.value = true;
	try {
		endlessRanking.value = await misskeyApi('whack-emoji/endless-ranking', {}) as any;
	} catch { endlessRanking.value = []; }
	finally { endlessRankingLoading.value = false; }
}

function startGame() {
	let url = `/whack-emoji/play?difficulty=${selectedDiff.value}`;
	if (gameMode.value === 'endless') url += '&endless=1';
	if (aiLevel.value) url += `&ai=${aiLevel.value}`;
	mainRouter.push(url);
}

function goLobby() {
	mainRouter.push('/whack-emoji/lobby');
}

onMounted(() => { fetchRanking(); fetchMyScores(); fetchEndlessRanking(); });

definePage(() => ({ title: '絵文字叩きゲーム', icon: 'ti ti-hammer' }));
</script>

<style lang="scss" module>
.root { max-width: 500px; margin: 0 auto; }
.hero { background: linear-gradient(135deg, #a29bfe, #6c5ce7); border-radius: 16px; overflow: hidden; }
.heroInner { padding: 32px 24px; text-align: center; }
.heroTitle { font-size: 1.8rem; font-weight: 900; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,.2); margin-bottom: 8px; }
.heroSub { font-size: .95rem; color: rgba(255,255,255,.85); }
.menuCard { border-radius: 14px; overflow: hidden; text-align: center; }
.diffList { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.diffBtn {
	width: 40px; height: 40px; border-radius: 10px; border: 2px solid var(--MI_THEME-divider);
	background: var(--MI_THEME-panel); cursor: pointer; font-family: inherit; font-weight: 700; font-size: .95rem;
	transition: all .15s; display: flex; align-items: center; justify-content: center;
	&:hover { border-color: color-mix(in srgb, var(--MI_THEME-accent) 40%, var(--MI_THEME-divider)); }
}
.diffBtnOn { border-color: var(--MI_THEME-accent); background: var(--MI_THEME-accentedBg); color: var(--MI_THEME-accent); }
.diffDesc { font-size: .85rem; opacity: .7; min-height: 1.5em; }
.howTo { text-align: left; font-size: .9em; line-height: 1.8; padding-left: 1.2em; margin: 0; }

.rankDiffTabs { display: flex; gap: 4px; }
.rankDiffTab { padding: 3px 8px; border-radius: 6px; border: 1.5px solid var(--MI_THEME-divider); background: var(--MI_THEME-panel); cursor: pointer; font-size: .75rem; font-weight: 600; transition: all .15s; }
.rankDiffTabOn { border-color: var(--MI_THEME-accent); background: var(--MI_THEME-accentedBg); }
.rankList { display: flex; flex-direction: column; gap: 2px; }
.rankItem { display: flex; align-items: center; gap: 10px; padding: 8px 4px; border-bottom: 1px solid color-mix(in srgb, var(--MI_THEME-divider) 50%, transparent); &:last-child { border-bottom: none; } }
.rankNum { width: 24px; text-align: center; font-weight: 900; font-size: .9rem; opacity: .5; }
.rankTop { opacity: 1; color: var(--MI_THEME-accent); font-size: 1.1rem; }
.rankAvatar { flex-shrink: 0; }
.rankAvatarImg { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
.rankInfo { flex: 1; min-width: 0; text-align: left; }
.rankName { font-weight: 600; font-size: .9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rankMeta { font-size: .75rem; opacity: .5; }
.rankScore { font-weight: 900; font-size: 1.1rem; color: var(--MI_THEME-accent); font-variant-numeric: tabular-nums; }

.myScoreList { display: flex; flex-direction: column; gap: 4px; }
.myScoreItem { display: flex; align-items: center; justify-content: space-between; padding: 6px 4px; border-bottom: 1px solid color-mix(in srgb, var(--MI_THEME-divider) 50%, transparent); &:last-child { border-bottom: none; } }
.myScoreVal { font-weight: 900; font-size: 1.1rem; color: var(--MI_THEME-accent); font-variant-numeric: tabular-nums; }
.myScoreMeta { display: flex; gap: 8px; font-size: .75rem; opacity: .6; }
.myScoreDate { }
</style>
