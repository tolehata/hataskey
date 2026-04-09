<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div class="_spacer" style="--MI_SPACER-w: 600px;">
		<div :class="$style.root">
			<div class="_gaps">
				<div class="_panel" :class="$style.hero">
					<div :class="$style.heroInner">
						<div :class="$style.heroTitle">🔫 カスタムエモジシュート</div>
						<div :class="$style.heroSub">絵文字の弾幕を撃ちまくれ！</div>
					</div>
				</div>

				<div class="_panel" :class="$style.menuCard">
					<div class="_gaps" style="padding: 20px;">
						<MkButton primary gradate large rounded inline @click="startGame('normal')">
							<i class="ti ti-player-play"></i> ノーマルモード
						</MkButton>
						<MkButton large rounded inline @click="startGame('debuff')" style="background: linear-gradient(135deg, #ff6b6b, #e74040); color: #fff; border: none;">
							<i class="ti ti-skull"></i> デバフモード
						</MkButton>
						<div style="font-size:.8rem;opacity:.5;text-align:center;">デバフモード: スペシャルがデバフに！移動鈍化・巨大化・左右反転が降り注ぐ</div>
					</div>
				</div>

				<!-- ノーマルランキング -->
				<div class="_panel" :class="$style.menuCard">
					<div class="_gaps_s" style="padding: 16px;">
						<b>🏆 ランキング（ノーマル）</b>
						<div v-if="rankingLoading" style="text-align:center;padding:16px;"><MkLoading/></div>
						<div v-else-if="ranking.length === 0" style="text-align:center;padding:16px;opacity:.5;">まだ記録がありません</div>
						<div v-else :class="$style.rankList">
							<div v-for="(r, i) in ranking" :key="r.id" :class="$style.rankItem">
								<div :class="[$style.rankNum, i < 3 && $style.rankTop]">{{ i + 1 }}</div>
								<div :class="$style.rankAvatar"><img v-if="r.user?.avatarUrl" :src="r.user.avatarUrl" :class="$style.rankAvatarImg"/></div>
								<div :class="$style.rankInfo">
									<div :class="$style.rankName"><MkUserName v-if="r.user" :user="r.user"/><span v-else>???</span></div>
									<div :class="$style.rankMeta">Wave {{ r.wave }} / {{ r.kills }} kills</div>
								</div>
								<div :class="$style.rankScore">{{ r.score }}</div>
							</div>
						</div>
					</div>
				</div>

				<!-- デバフランキング -->
				<div class="_panel" :class="$style.menuCard">
					<div class="_gaps_s" style="padding: 16px;">
						<b>💀 ランキング（デバフ）</b>
						<div v-if="debuffRankingLoading" style="text-align:center;padding:16px;"><MkLoading/></div>
						<div v-else-if="debuffRanking.length === 0" style="text-align:center;padding:16px;opacity:.5;">まだ記録がありません</div>
						<div v-else :class="$style.rankList">
							<div v-for="(r, i) in debuffRanking" :key="r.id" :class="$style.rankItem">
								<div :class="[$style.rankNum, i < 3 && $style.rankTop]">{{ i + 1 }}</div>
								<div :class="$style.rankAvatar"><img v-if="r.user?.avatarUrl" :src="r.user.avatarUrl" :class="$style.rankAvatarImg"/></div>
								<div :class="$style.rankInfo">
									<div :class="$style.rankName"><MkUserName v-if="r.user" :user="r.user"/><span v-else>???</span></div>
									<div :class="$style.rankMeta">Wave {{ r.wave }} / {{ r.kills }} kills</div>
								</div>
								<div :class="$style.rankScore">{{ r.score }}</div>
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

const ranking = ref<any[]>([]);
const rankingLoading = ref(false);
const debuffRanking = ref<any[]>([]);
const debuffRankingLoading = ref(false);

async function fetchRanking() {
	rankingLoading.value = true;
	try { ranking.value = await misskeyApi('emoji-shoot/ranking', { mode: 'normal' }) as any; }
	catch { ranking.value = []; }
	finally { rankingLoading.value = false; }
}

async function fetchDebuffRanking() {
	debuffRankingLoading.value = true;
	try { debuffRanking.value = await misskeyApi('emoji-shoot/ranking', { mode: 'debuff' }) as any; }
	catch { debuffRanking.value = []; }
	finally { debuffRankingLoading.value = false; }
}

function startGame(mode: string) { mainRouter.push(`/emoji-shoot/play?mode=${mode}`); }

onMounted(() => { fetchRanking(); fetchDebuffRanking(); });
definePage(() => ({ title: 'カスタムエモジシュート', icon: 'ti ti-rocket' }));
</script>

<style lang="scss" module>
.root { max-width: 500px; margin: 0 auto; }
.hero { padding: 24px; text-align: center; background: linear-gradient(135deg, #ff6b6b, #ffa502); border-radius: 16px; }
.heroInner { }
.heroTitle { font-size: 1.6rem; font-weight: 900; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,.2); margin-bottom: 6px; }
.heroSub { font-size: .9rem; color: rgba(255,255,255,.85); }
.menuCard { border-radius: 14px; overflow: hidden; text-align: center; }
.rankList { display: flex; flex-direction: column; gap: 4px; }
.rankItem { display: flex; align-items: center; gap: 8px; padding: 8px 4px; border-bottom: 1px solid color-mix(in srgb, var(--MI_THEME-divider) 50%, transparent); &:last-child { border-bottom: none; } }
.rankNum { width: 24px; text-align: center; font-weight: 900; font-size: .85rem; opacity: .5; }
.rankTop { opacity: 1; color: var(--MI_THEME-accent); }
.rankAvatar { flex-shrink: 0; }
.rankAvatarImg { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
.rankInfo { flex: 1; min-width: 0; text-align: left; }
.rankName { font-weight: 600; font-size: .9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rankMeta { font-size: .7rem; opacity: .5; }
.rankScore { font-weight: 900; font-size: 1rem; color: var(--MI_THEME-accent); }
</style>
