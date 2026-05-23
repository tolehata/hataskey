<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div class="_spacer" style="--MI_SPACER-w: 900px;">
		<div :class="$style.root">
			<!-- 待機中 -->
			<div v-if="roomState === 'waiting'" :class="$style.waitBox">
				<div :class="$style.waitTitle">対戦相手を待っています...</div>
				<div :class="$style.waitMeta">Lv{{ difficulty }} / ルームID: {{ roomId }}</div>
				<MkLoading/>
				<MkButton rounded @click="goBack" style="margin-top:16px;"><i class="ti ti-arrow-left"></i> キャンセル</MkButton>
			</div>

			<!-- カウントダウン -->
			<Transition name="fade">
				<div v-if="countdown > 0 && roomState === 'playing'" :class="$style.countdownOverlay">
					<div :class="$style.countdownNum">{{ countdown }}</div>
				</div>
			</Transition>

			<!-- プレイ中 / 終了 -->
			<template v-if="roomState === 'playing' || roomState === 'ended'">
				<div v-if="isSpectator" :class="$style.specBadge">👁 観戦中</div>

				<div :class="$style.header">
					<div :class="$style.scoreBox">
						<div :class="$style.scoreLabel">{{ p1Name }}</div>
						<div :class="$style.scoreValue">{{ score1 }}</div>
					</div>
					<div :class="$style.scoreBox">
						<div :class="$style.scoreLabel">TIME</div>
						<div :class="[$style.scoreValue, timeLeft <= 5 && $style.timeDanger]">{{ timeLeft }}</div>
					</div>
					<div :class="$style.scoreBox">
						<div :class="$style.scoreLabel">{{ p2Name }}</div>
						<div :class="[$style.scoreValue, $style.p2Color]">{{ score2 }}</div>
					</div>
				</div>

				<!-- デュアルグリッド -->
				<div :class="$style.dual">
					<div :class="$style.side">
						<div :class="$style.sideLabel">{{ p1Name }}</div>
						<div :class="$style.grid">
							<div v-for="(cell, i) in myCells" :key="'p1-'+i"
								:class="[$style.hole, cell.hitGlow && $style.hitGlow, cell.missGlow && $style.missGlow]"
								@pointerdown.prevent="isPlayer1 ? whack(i) : null">
								<div :class="[$style.mole, cell.visible && $style.moleUp]">
									<img v-if="cell.emoji?.url" :src="cell.emoji.url" :class="$style.moleImg" draggable="false"/>
									<span v-else-if="cell.emoji?.char" :class="$style.moleChar">{{ cell.emoji.char }}</span>
								</div>
								<div :class="$style.holeRing"></div>
							</div>
						</div>
					</div>
					<div :class="$style.side">
						<div :class="[$style.sideLabel, $style.p2Color]">{{ p2Name }}</div>
						<div :class="$style.grid">
							<div v-for="(cell, i) in opCells" :key="'p2-'+i"
								:class="[$style.hole, cell.hitGlow && $style.hitGlow, cell.missGlow && $style.missGlow]"
								@pointerdown.prevent="isPlayer2 ? whack(i) : null">
								<div :class="[$style.mole, cell.visible && $style.moleUp]">
									<img v-if="cell.emoji?.url" :src="cell.emoji.url" :class="$style.moleImg" draggable="false"/>
									<span v-else-if="cell.emoji?.char" :class="$style.moleChar">{{ cell.emoji.char }}</span>
								</div>
								<div :class="$style.holeRing"></div>
							</div>
						</div>
					</div>
				</div>

				<!-- 結果 -->
				<Transition name="fade">
					<div v-if="roomState === 'ended'" :class="$style.overlay">
						<div :class="$style.overCard">
							<div :class="$style.overTitle">{{ resultText }}</div>
							<div :class="$style.overScoreRow">
								<div>{{ p1Name }}: <b>{{ score1 }}</b></div>
								<div>{{ p2Name }}: <b>{{ score2 }}</b></div>
							</div>
							<div :class="$style.overBtns">
								<MkButton rounded @click="goBack"><i class="ti ti-arrow-left"></i> ロビーに戻る</MkButton>
							</div>
						</div>
					</div>
				</Transition>
			</template>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import MkButton from '@/components/MkButton.vue';
import { mainRouter } from '@/router.js';
import { definePage } from '@/page.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { useStream } from '@/stream.js';
import { $i } from '@/i.js';

const GAME_DURATION = 30;
const CELL_COUNT = 9;
type EmojiItem = { url?: string; char?: string; name: string };
interface Cell { visible: boolean; emoji: EmojiItem | null; hitGlow: boolean; missGlow: boolean; graceHittable: boolean; timer: ReturnType<typeof setTimeout> | null; }
function makeCell(): Cell { return { visible: false, emoji: null, hitGlow: false, missGlow: false, graceHittable: false, timer: null }; }

function getDiffParams(diff: number) {
	const t = (diff - 1) / 9;
	return {
		spawnInterval: Math.round(1200 - t * 900),
		visibleDuration: Math.round(2000 - t * 1500),
		maxVisible: Math.min(Math.floor(1 + t * 3), 4),
		scorePerHit: 10 + (diff - 1) * 5,
		missPenalty: Math.round(5 + t * 10),
	};
}

const roomId = new URLSearchParams(window.location.search).get('roomId') || '';
const roomState = ref<'waiting'|'playing'|'ended'>('waiting');
const difficulty = ref(5);
const score1 = ref(0);
const score2 = ref(0);
const timeLeft = ref(GAME_DURATION);
const countdown = ref(0);
const p1Name = ref('P1');
const p2Name = ref('P2');
const p1Id = ref('');
const p2Id = ref('');
const resultText = ref('');
const gameStarted = ref(false);

const myCells = reactive<Cell[]>(Array.from({ length: CELL_COUNT }, makeCell));
const opCells = reactive<Cell[]>(Array.from({ length: CELL_COUNT }, makeCell));

const isPlayer1 = computed(() => $i?.id === p1Id.value);
const isPlayer2 = computed(() => $i?.id === p2Id.value);
const isSpectator = computed(() => !isPlayer1.value && !isPlayer2.value);
const isMyTurn = computed(() => isPlayer1.value || isPlayer2.value);

let connection: any = null;
let emojiPool: EmojiItem[] = [];
let spawnTimer: ReturnType<typeof setInterval> | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let myScore = 0;
let myHits = 0;

function buildPool() {
	const pool: EmojiItem[] = [];
	// 本家の絵文字系ゲームに倣い、カスタム絵文字は使用せず Unicode 絵文字のみを使用する
	const fb = ['🐹','🐰','🦊','🐻','🐼','🐨','🐸','🐵','🐱','🐶','🐷','🐮','🦁','🐯','🐺','🐲','🐴','🦄','🐙','🐳'];
	for (const c of fb) pool.push({ char: c, name: c });
	emojiPool = pool;
}

function pickEmoji(): EmojiItem { return emojiPool[Math.floor(Math.random() * emojiPool.length)]; }

// ===== 自分のゲームロジック =====
function spawnMole() {
	if (!gameStarted.value || roomState.value !== 'playing') return;
	if (!isMyTurn.value) return;
	const cells = isPlayer1.value ? myCells : opCells;
	const params = getDiffParams(difficulty.value);
	const visibleCount = cells.filter(c => c.visible).length;
	if (visibleCount >= params.maxVisible) return;
	const emptyCells = cells.map((c, i) => ({ c, i })).filter(x => !x.c.visible && !x.c.graceHittable);
	if (emptyCells.length === 0) return;
	const target = emptyCells[Math.floor(Math.random() * emptyCells.length)];
	const cell = target.c;
	cell.emoji = pickEmoji();
	cell.visible = true;
	cell.timer = setTimeout(() => {
		cell.visible = false;
		cell.graceHittable = true;
		setTimeout(() => { cell.graceHittable = false; cell.emoji = null; }, 200);
		cell.timer = null;
	}, params.visibleDuration);
}

function whack(index: number) {
	if (!gameStarted.value || roomState.value !== 'playing' || !isMyTurn.value) return;
	const cells = isPlayer1.value ? myCells : opCells;
	const cell = cells[index];
	const params = getDiffParams(difficulty.value);
	let isHit = false;

	if (cell.visible || cell.graceHittable) {
		cell.visible = false;
		cell.graceHittable = false;
		if (cell.timer) { clearTimeout(cell.timer); cell.timer = null; }
		cell.emoji = null;
		myScore += params.scorePerHit;
		myHits++;
		isHit = true;
		cell.hitGlow = true;
		setTimeout(() => { cell.hitGlow = false; }, 500);
	} else {
		myScore = Math.max(0, myScore - params.missPenalty);
		cell.missGlow = true;
		setTimeout(() => { cell.missGlow = false; }, 500);
	}

	if (isPlayer1.value) score1.value = myScore;
	else score2.value = myScore;

	if (connection) {
		connection.send('whack', { cellIndex: index, isHit });
		connection.send('scoreUpdate', { score: myScore, hits: myHits });
	}
}

// ===== 3カウント → ゲーム開始 =====
function startCountdown() {
	countdown.value = 3;
	const iv = setInterval(() => {
		countdown.value--;
		if (countdown.value <= 0) {
			clearInterval(iv);
			beginPlay();
		}
	}, 800);
}

function beginPlay() {
	gameStarted.value = true;
	if (isMyTurn.value) {
		const params = getDiffParams(difficulty.value);
		spawnTimer = setInterval(spawnMole, params.spawnInterval);
	}
	countdownTimer = setInterval(() => {
		timeLeft.value--;
		if (timeLeft.value <= 0) {
			if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
			if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null; }
			// ホスト（P1）がタイムアップを通知
			if (isPlayer1.value && connection) {
				connection.send('timeUp', {});
			}
		}
	}, 1000);
}

// ===== WebSocket =====
function connectToRoom() {
	connection = useStream().useChannel('whackEmojiRoom', { roomId });

	connection.on('started', (data: any) => {
		roomState.value = 'playing';
		if (data.host2Id) p2Id.value = data.host2Id;
		fetchRoom().then(() => startCountdown());
	});

	connection.on('whack', (data: any) => {
		// 相手の叩きを自分の画面に反映
		if (data.userId === p1Id.value && !isPlayer1.value) {
			const cell = myCells[data.cellIndex];
			if (cell) {
				if (data.isHit) { cell.hitGlow = true; setTimeout(() => { cell.hitGlow = false; }, 500); }
				else { cell.missGlow = true; setTimeout(() => { cell.missGlow = false; }, 500); }
			}
		} else if (data.userId === p2Id.value && !isPlayer2.value) {
			const cell = opCells[data.cellIndex];
			if (cell) {
				if (data.isHit) { cell.hitGlow = true; setTimeout(() => { cell.hitGlow = false; }, 500); }
				else { cell.missGlow = true; setTimeout(() => { cell.missGlow = false; }, 500); }
			}
		}
	});

	connection.on('scoreUpdate', (data: any) => {
		if (data.userId === p1Id.value) score1.value = data.score;
		else if (data.userId === p2Id.value) score2.value = data.score;
	});

	connection.on('ended', (data: any) => {
		roomState.value = 'ended';
		if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null; }
		if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
		if (data.winner === 1) resultText.value = `🎉 ${p1Name.value} の勝ち！`;
		else if (data.winner === 2) resultText.value = `🎉 ${p2Name.value} の勝ち！`;
		else resultText.value = '🤝 引き分け！';
	});
}

async function fetchRoom() {
	const room = await misskeyApi('whack-emoji/rooms', { roomId }) as any;
	if (!room) return;
	p1Id.value = room.host1Id;
	p2Id.value = room.host2Id || '';
	p1Name.value = room.host1?.name || room.host1?.username || 'P1';
	p2Name.value = room.host2?.name || room.host2?.username || 'P2';
	difficulty.value = room.difficulty;
	roomState.value = room.state as any;
	score1.value = room.score1;
	score2.value = room.score2;
}

function goBack() { mainRouter.push('/whack-emoji/lobby'); }

onMounted(async () => {
	buildPool();
	await fetchRoom();
	connectToRoom();
	if (roomState.value === 'playing') startCountdown();
});

onUnmounted(() => {
	if (connection) connection.dispose();
	if (spawnTimer) clearInterval(spawnTimer);
	if (countdownTimer) clearInterval(countdownTimer);
	for (const cell of [...myCells, ...opCells]) {
		if (cell.timer) clearTimeout(cell.timer);
	}
});

definePage(() => ({ title: '絵文字叩き - 対戦', icon: 'ti ti-swords' }));
</script>

<style lang="scss" module>
.root { max-width: 750px; margin: 0 auto; position: relative; }
.waitBox { text-align: center; padding: 40px 20px; }
.waitTitle { font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; }
.waitMeta { font-size: .8rem; opacity: .5; margin-bottom: 16px; }
.countdownOverlay { position: absolute; inset: 0; z-index: 200; background: rgba(0,0,0,.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; border-radius: 16px; }
.countdownNum { font-size: 6rem; font-weight: 900; color: #fff; text-shadow: 0 4px 24px rgba(0,0,0,.5); animation: countPop .6s ease; }
@keyframes countPop { 0% { transform: scale(2); opacity: 0; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); } }
.specBadge { text-align: center; padding: 6px; font-weight: 700; font-size: .85rem; background: var(--MI_THEME-accentedBg); border-radius: 8px; margin-bottom: 8px; }
.header { display: flex; justify-content: center; gap: 8px; margin-bottom: 10px; }
.scoreBox { background: var(--MI_THEME-panel); border-radius: 12px; padding: 6px 14px; text-align: center; border: 1.5px solid var(--MI_THEME-divider); min-width: 65px; }
.scoreLabel { font-size: .55rem; font-weight: 700; opacity: .5; letter-spacing: .1em; }
.scoreValue { font-size: 1.2rem; font-weight: 900; color: var(--MI_THEME-accent); font-variant-numeric: tabular-nums; }
.p2Color { color: #e74040 !important; }
.timeDanger { color: #e74040 !important; animation: timePulse .5s infinite; }
@keyframes timePulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
.dual { display: flex; gap: 8px; }
.side { flex: 1; min-width: 0; }
.sideLabel { text-align: center; font-weight: 700; font-size: .8rem; margin-bottom: 6px; padding: 4px 0; border-radius: 8px; background: var(--MI_THEME-panel); }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px; background: color-mix(in srgb, var(--MI_THEME-panel) 90%, var(--MI_THEME-fg)); border-radius: 12px; border: 2px solid var(--MI_THEME-divider); aspect-ratio: 1 / 1; }
.hole { position: relative; border-radius: 50%; background: radial-gradient(ellipse at center, color-mix(in srgb, var(--MI_THEME-bg) 80%, #000) 40%, color-mix(in srgb, var(--MI_THEME-bg) 50%, #000) 100%); overflow: visible; cursor: pointer; user-select: none; aspect-ratio: 1 / 1; display: flex; align-items: center; justify-content: center; transition: transform .1s; &:active { transform: scale(.92); } }
.hitGlow { box-shadow: 0 0 16px 6px rgba(255, 215, 0, .7); .holeRing { border-color: #ffd700 !important; } }
.missGlow { box-shadow: 0 0 16px 6px rgba(59, 130, 246, .6); .holeRing { border-color: #3b82f6 !important; } }
.mole { position: absolute; inset: 10%; display: flex; align-items: center; justify-content: center; transform: translateY(100%); opacity: 0; transition: transform .15s cubic-bezier(.34,1.56,.64,1), opacity .1s; pointer-events: none; }
.moleUp { transform: translateY(0); opacity: 1; }
.moleImg { width: 48px; height: 48px; object-fit: contain; pointer-events: none; }
.moleChar { font-size: 2rem; line-height: 1; pointer-events: none; }
.holeRing { position: absolute; inset: 0; border-radius: 50%; border: 3px solid color-mix(in srgb, var(--MI_THEME-divider) 60%, transparent); pointer-events: none; transition: border-color .2s; }
.overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,.55); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; }
.overCard { background: var(--MI_THEME-panel); border-radius: 20px; padding: 28px 24px; text-align: center; box-shadow: 0 8px 48px rgba(0,0,0,.3); max-width: 320px; width: 90%; }
.overTitle { font-size: 1.5rem; font-weight: 900; margin-bottom: 12px; }
.overScoreRow { display: flex; justify-content: center; gap: 24px; font-size: 1.1rem; margin-bottom: 12px; }
.overBtns { display: flex; flex-direction: column; gap: 8px; align-items: center; }
</style>

<style>
.fade-enter-active { transition: opacity .3s ease; }
.fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
