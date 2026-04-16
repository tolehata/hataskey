<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div class="_spacer" style="--MI_SPACER-w: 800px;">
		<div :class="$style.root">
			<!-- カウントダウンオーバーレイ -->
			<Transition name="fade">
				<div v-if="countdown > 0" :class="$style.countdownOverlay">
					<div :class="$style.countdownNum">{{ countdown }}</div>
				</div>
			</Transition>

			<!-- ヘッダー -->
			<div :class="$style.header">
				<div :class="$style.scoreBox">
					<div :class="$style.scoreLabel">SCORE</div>
					<div :class="$style.scoreValue">{{ score }}</div>
				</div>
				<div v-if="isEndless" :class="$style.scoreBox">
					<div :class="$style.scoreLabel">LIFE</div>
					<div :class="$style.scoreValue">{{ '❤️'.repeat(lives) }}{{ '🖤'.repeat(MAX_LIVES - lives) }}</div>
				</div>
				<div v-else :class="$style.scoreBox">
					<div :class="$style.scoreLabel">TIME</div>
					<div :class="[$style.scoreValue, timeLeft <= 5 && $style.timeDanger]">{{ timeLeft }}</div>
				</div>
				<div :class="$style.scoreBox">
					<div :class="$style.scoreLabel">Lv</div>
					<div :class="$style.scoreValue">{{ currentLevel }}</div>
				</div>
				<div v-if="aiMode" :class="$style.scoreBox">
					<div :class="$style.scoreLabel">AI</div>
					<div :class="[$style.scoreValue, $style.aiScore]">{{ aiScore }}</div>
				</div>
			</div>

			<!-- ゲームグリッド（AI対戦時はデュアル） -->
			<div :class="aiMode ? $style.dual : undefined">
				<div :class="aiMode ? $style.side : undefined">
					<div v-if="aiMode" :class="$style.sideLabel">あなた ({{ score }})</div>
					<div :class="$style.grid" :style="gridStyle">
						<div v-for="(cell, i) in cells" :key="i"
							:class="[$style.hole, cell.hitGlow && $style.hitGlow, cell.missGlow && $style.missGlow]"
							@pointerdown.prevent="whack(i)">
							<div :class="[$style.mole, cell.visible && $style.moleUp]">
								<img v-if="cell.emoji?.url" :src="cell.emoji.url" :class="$style.moleImg" draggable="false"/>
								<span v-else-if="cell.emoji?.char" :class="$style.moleChar">{{ cell.emoji.char }}</span>
							</div>
							<div :class="$style.holeRing"></div>
						</div>
					</div>
				</div>
				<div v-if="aiMode" :class="$style.side">
					<div :class="[$style.sideLabel, $style.aiSideLabel]">AI ({{ aiScore }})</div>
					<div :class="$style.grid" :style="gridStyle">
						<div v-for="(cell, i) in aiCells" :key="'ai-'+i"
							:class="[$style.hole, cell.hitGlow && $style.hitGlow, cell.missGlow && $style.missGlow]">
							<div :class="[$style.mole, cell.visible && $style.moleUp]">
								<img v-if="cell.emoji?.url" :src="cell.emoji.url" :class="$style.moleImg" draggable="false"/>
								<span v-else-if="cell.emoji?.char" :class="$style.moleChar">{{ cell.emoji.char }}</span>
							</div>
							<div :class="$style.holeRing"></div>
						</div>
					</div>
				</div>
			</div>

			<!-- ゲームオーバー -->
			<Transition name="fade">
				<div v-if="gameOver" :class="$style.overlay">
					<div :class="$style.overCard">
						<div :class="$style.overTitle">{{ isEndless ? 'GAME OVER' : 'TIME UP!' }}</div>
						<div :class="$style.overScore">スコア: {{ score }}</div>
						<div :class="$style.overStats">{{ hits }} hit / {{ misses }} miss</div>
						<div v-if="isEndless" :class="$style.overStats">到達レベル: {{ currentLevel }}</div>
						<div v-if="aiMode" :class="$style.aiResult">
							<span v-if="score > aiScore">🎉 あなたの勝ち！</span>
							<span v-else-if="score < aiScore">😢 AIの勝ち...</span>
							<span v-else>🤝 引き分け！</span>
							<div :class="$style.aiResultScore">AI: {{ aiScore }}</div>
						</div>
						<div v-if="isNewRecord" :class="$style.newRecord">🎉 NEW RECORD!</div>
						<div :class="$style.overBtns">
							<MkButton primary gradate rounded @click="restart"><i class="ti ti-refresh"></i> もう一度</MkButton>
							<MkButton rounded @click="goBack"><i class="ti ti-arrow-left"></i> 戻る</MkButton>
						</div>
					</div>
				</div>
			</Transition>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import MkButton from '@/components/MkButton.vue';
import { mainRouter } from '@/router.js';
import { definePage } from '@/page.js';
import { miLocalStorage } from '@/local-storage.js';
import { customEmojis } from '@/custom-emojis.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';

const BASE_DURATION = 30;
const GRID_COLS = 3;
const GRID_ROWS = 3;
const CELL_COUNT = GRID_COLS * GRID_ROWS;
const EMOJI_DISPLAY_SIZE = 56;
const MAX_LIVES = 3;

// エンドレスのレベルアップ閾値（累計ヒット数）
const LEVEL_UP_THRESHOLDS = [0, 5, 12, 22, 35, 50, 70, 95, 125, 160];

type EmojiItem = { url?: string; char?: string; name: string };

interface Cell {
	visible: boolean;
	emoji: EmojiItem | null;
	hitGlow: boolean;
	missGlow: boolean;
	graceHittable: boolean;
	occupied: boolean; // 絵文字が完全に消えるまでtrue（重複スポーン防止）
	timer: ReturnType<typeof setTimeout> | null;
	graceTimer: ReturnType<typeof setTimeout> | null;
	spawnId: number; // 各スポーンのユニークID（タイマー競合防止）
}

let nextSpawnId = 0;

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

function getAiParams(level: string) {
	switch (level) {
		case 'easy': return { hitRate: 0.3, reactionMs: 1200, label: 'よわい' };
		case 'hard': return { hitRate: 0.6, reactionMs: 600, label: 'むずかしい' };
		case 'extreme': return { hitRate: 0.85, reactionMs: 300, label: 'つよすぎる' };
		case 'insane': return { hitRate: 0.95, reactionMs: 150, label: 'エグい' };
		default: return { hitRate: 0.5, reactionMs: 800, label: 'ふつう' };
	}
}

// ===== refs =====
const score = ref(0);
const hits = ref(0);
const misses = ref(0);
const timeLeft = ref(BASE_DURATION);
const gameOver = ref(false);
const isNewRecord = ref(false);
const difficulty = ref(5);
const currentLevel = ref(1); // エンドレスでは動的に変化
const countdown = ref(0);
const gameStarted = ref(false);
const lives = ref(MAX_LIVES);

const aiMode = ref('');
const aiScore = ref(0);
let aiTimer: ReturnType<typeof setInterval> | null = null;
let aiSpawnTimer: ReturnType<typeof setInterval> | null = null;

const isEndless = ref(false);

const cells = reactive<Cell[]>(
	Array.from({ length: CELL_COUNT }, () => ({
		visible: false, emoji: null, hitGlow: false, missGlow: false,
		graceHittable: false, occupied: false, timer: null, graceTimer: null,
		spawnId: 0,
	}))
);

// AI独自の盤面
const aiCells = reactive<Cell[]>(
	Array.from({ length: CELL_COUNT }, () => ({
		visible: false, emoji: null, hitGlow: false, missGlow: false,
		graceHittable: false, occupied: false, timer: null, graceTimer: null,
		spawnId: 0,
	}))
);

let emojiPool: EmojiItem[] = [];
let spawnTimer: ReturnType<typeof setInterval> | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const gridStyle = computed(() => ({
	gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
	gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
}));

// ===== パラメータ取得 =====
function getDifficulty(): number {
	return Math.max(1, Math.min(10, parseInt(new URLSearchParams(window.location.search).get('difficulty') || '5', 10)));
}
function getAiMode(): string { return new URLSearchParams(window.location.search).get('ai') || ''; }
function getEndless(): boolean { return new URLSearchParams(window.location.search).get('endless') === '1'; }
function getHighScoreKey(): string {
	return isEndless.value ? 'whackEmojiHighScore_endless' : `whackEmojiHighScore_${difficulty.value}`;
}

// ===== エンドレス: レベル計算 =====
function calcEndlessLevel(): number {
	const h = hits.value;
	for (let i = LEVEL_UP_THRESHOLDS.length - 1; i >= 0; i--) {
		if (h >= LEVEL_UP_THRESHOLDS[i]) return Math.min(i + 1, 10);
	}
	return 1;
}

// ===== 絵文字プール =====
function buildPool() {
	const pool: EmojiItem[] = [];
	const emojis = customEmojis.value;
	if (emojis.length > 0) {
		const shuffled = [...emojis].sort(() => Math.random() - 0.5).slice(0, 50);
		for (const e of shuffled) pool.push({ url: e.url, name: e.name });
	}
	const fallback = ['🐹','🐰','🦊','🐻','🐼','🐨','🐸','🐵','🐱','🐶','🐷','🐮','🦁','🐯','🐺','🐲','🐴','🦄','🐙','🐳'];
	for (const c of fallback) pool.push({ char: c, name: c });
	emojiPool = pool;
}

function pickEmoji(): EmojiItem { return emojiPool[Math.floor(Math.random() * emojiPool.length)]; }

// ===== セルを完全にクリアする =====
function clearCell(cell: Cell) {
	cell.visible = false;
	cell.graceHittable = false;
	cell.emoji = null;
	cell.spawnId = 0;
	if (cell.timer) { clearTimeout(cell.timer); cell.timer = null; }
	if (cell.graceTimer) { clearTimeout(cell.graceTimer); cell.graceTimer = null; }
	// occupiedはアニメーション完了後に解放（CSS transition 150ms + 余裕）
	setTimeout(() => { cell.occupied = false; }, 200);
}

// ===== ゲームロジック =====
function spawnMole() {
	if (gameOver.value || !gameStarted.value) return;
	const lvl = isEndless.value ? currentLevel.value : difficulty.value;
	const params = getDiffParams(lvl);
	const visibleCount = cells.filter(c => c.visible).length;
	if (visibleCount >= params.maxVisible) return;

	// occupied（表示中 or grace中 or 消えアニメ中）でないセルだけ選ぶ
	const freeCells = cells.map((c, i) => ({ c, i })).filter(x => !x.c.occupied);
	if (freeCells.length === 0) return;

	const target = freeCells[Math.floor(Math.random() * freeCells.length)];
	const cell = target.c;
	const sid = ++nextSpawnId;
	cell.emoji = pickEmoji();
	cell.visible = true;
	cell.occupied = true;
	cell.spawnId = sid;

	cell.timer = setTimeout(() => {
		if (cell.spawnId !== sid) return; // 既に別のスポーンに入れ替わっている
		cell.visible = false;
		cell.graceHittable = true;
		cell.timer = null;

		// エンドレス: 押しそびれた場合もライフ減少
		if (isEndless.value) {
			lives.value--;
			misses.value++;
			cell.missGlow = true;
			const missSid = sid;
			setTimeout(() => { if (cell.spawnId === missSid) cell.missGlow = false; }, 500);
			if (lives.value <= 0) { endGame(); return; }
		}

		cell.graceTimer = setTimeout(() => {
			if (cell.spawnId !== sid) return;
			cell.graceHittable = false;
			cell.emoji = null;
			cell.occupied = false;
			cell.spawnId = 0;
			cell.graceTimer = null;
		}, 200);
	}, params.visibleDuration);
}

function whack(index: number) {
	if (gameOver.value || !gameStarted.value) return;
	const cell = cells[index];
	const lvl = isEndless.value ? currentLevel.value : difficulty.value;
	const params = getDiffParams(lvl);

	if (cell.visible || cell.graceHittable) {
		// ヒット
		const hitSid = cell.spawnId;
		clearCell(cell);
		score.value += params.scorePerHit;
		hits.value++;

		// エンドレス: レベル更新
		if (isEndless.value) {
			const newLvl = calcEndlessLevel();
			if (newLvl !== currentLevel.value) {
				currentLevel.value = newLvl;
				// スポーン間隔を更新
				if (spawnTimer) clearInterval(spawnTimer);
				const newParams = getDiffParams(newLvl);
				spawnTimer = setInterval(spawnMole, newParams.spawnInterval);
			}
		}

		cell.hitGlow = true;
		setTimeout(() => { if (cell.spawnId === 0 || cell.spawnId === hitSid) cell.hitGlow = false; }, 500);
	} else {
		// ミス（空叩き）
		misses.value++;

		if (isEndless.value) {
			lives.value--;
			if (lives.value <= 0) { endGame(); return; }
		} else {
			score.value = Math.max(0, score.value - params.missPenalty);
		}

		const missSid = cell.spawnId;
		cell.missGlow = true;
		setTimeout(() => { if (cell.spawnId === missSid) cell.missGlow = false; }, 500);
	}
}

// ===== AI（独自盤面でプレイ） =====
function aiClearCell(cell: Cell) {
	cell.visible = false;
	cell.graceHittable = false;
	cell.emoji = null;
	cell.spawnId = 0;
	if (cell.timer) { clearTimeout(cell.timer); cell.timer = null; }
	if (cell.graceTimer) { clearTimeout(cell.graceTimer); cell.graceTimer = null; }
	setTimeout(() => { cell.occupied = false; }, 200);
}

function aiSpawnMole() {
	if (gameOver.value || !gameStarted.value) return;
	const lvl = isEndless.value ? currentLevel.value : difficulty.value;
	const params = getDiffParams(lvl);
	const visibleCount = aiCells.filter(c => c.visible).length;
	if (visibleCount >= params.maxVisible) return;

	const freeCells = aiCells.map((c, i) => ({ c, i })).filter(x => !x.c.occupied);
	if (freeCells.length === 0) return;

	const target = freeCells[Math.floor(Math.random() * freeCells.length)];
	const cell = target.c;
	const sid = ++nextSpawnId;
	cell.emoji = pickEmoji();
	cell.visible = true;
	cell.occupied = true;
	cell.spawnId = sid;

	// AIが叩くかどうかを判定
	const ai = getAiParams(aiMode.value);
	const reactionDelay = ai.reactionMs + Math.random() * ai.reactionMs * 0.5;

	cell.timer = setTimeout(() => {
		// 時間切れ: もぐらが引っ込む前にAIが叩けなかった
		if (cell.spawnId !== sid) return;
		if (!cell.visible) return; // 既にAIが叩いた
		cell.visible = false;
		cell.graceHittable = false;
		// AI押しそびれ = ミス演出
		cell.missGlow = true;
		setTimeout(() => { if (cell.spawnId === sid) cell.missGlow = false; }, 500);
		cell.graceTimer = setTimeout(() => {
			if (cell.spawnId !== sid) return;
			cell.emoji = null;
			cell.occupied = false;
			cell.spawnId = 0;
			cell.graceTimer = null;
		}, 200);
		cell.timer = null;
	}, params.visibleDuration);

	// AIが叩く試行
	setTimeout(() => {
		if (gameOver.value || cell.spawnId !== sid || !cell.visible) return;
		if (Math.random() < ai.hitRate) {
			// ヒット
			const curLvl = isEndless.value ? currentLevel.value : difficulty.value;
			const curParams = getDiffParams(curLvl);
			aiScore.value += curParams.scorePerHit;
			if (cell.timer) { clearTimeout(cell.timer); cell.timer = null; }
			cell.visible = false;
			cell.hitGlow = true;
			setTimeout(() => { if (cell.spawnId === sid) cell.hitGlow = false; }, 500);
			cell.graceTimer = setTimeout(() => {
				if (cell.spawnId !== sid) return;
				cell.emoji = null;
				cell.occupied = false;
				cell.spawnId = 0;
				cell.graceTimer = null;
			}, 200);
		}
		// hitRateに失敗 → 何もしない。timerで時間切れ処理される
	}, reactionDelay);
}

function startAi() {
	if (!aiMode.value) return;
	const lvl = isEndless.value ? currentLevel.value : difficulty.value;
	const params = getDiffParams(lvl);
	aiSpawnTimer = setInterval(aiSpawnMole, params.spawnInterval);
}

function stopAi() {
	if (aiTimer) { clearInterval(aiTimer); aiTimer = null; }
	if (aiSpawnTimer) { clearInterval(aiSpawnTimer); aiSpawnTimer = null; }
	for (const cell of aiCells) { aiClearCell(cell); }
}

// ===== タイマー =====
function endGame() {
	gameOver.value = true;
	gameStarted.value = false;
	if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null; }
	if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
	stopAi();

	for (const cell of cells) { clearCell(cell); }

	const key = getHighScoreKey();
	const prev = parseInt(miLocalStorage.getItem(key) || '0', 10);
	if (score.value > prev) {
		miLocalStorage.setItem(key, String(score.value));
		isNewRecord.value = true;
	}

	if ($i) {
		misskeyApi('whack-emoji/register', {
			score: score.value,
			difficulty: isEndless.value ? 0 : difficulty.value, // エンドレスはdifficulty=0で保存
			hits: hits.value,
			misses: misses.value,
		}).catch(e => console.error('Failed to register score:', e));
	}
}

// ===== 3カウント → 開始 =====
function startCountdown() {
	countdown.value = 3;
	const iv = setInterval(() => {
		countdown.value--;
		if (countdown.value <= 0) { clearInterval(iv); beginPlay(); }
	}, 800);
}

function beginPlay() {
	gameStarted.value = true;
	const lvl = isEndless.value ? currentLevel.value : difficulty.value;
	const params = getDiffParams(lvl);
	spawnTimer = setInterval(spawnMole, params.spawnInterval);

	if (!isEndless.value) {
		countdownTimer = setInterval(() => {
			timeLeft.value--;
			if (timeLeft.value <= 0) endGame();
		}, 1000);
	}

	if (aiMode.value) startAi();
}

// ===== 初期化 =====
function initGame() {
	if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null; }
	if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
	stopAi();

	difficulty.value = getDifficulty();
	aiMode.value = getAiMode();
	isEndless.value = getEndless();
	score.value = 0; hits.value = 0; misses.value = 0;
	timeLeft.value = BASE_DURATION;
	gameOver.value = false; isNewRecord.value = false;
	gameStarted.value = false; aiScore.value = 0; countdown.value = 0;
	lives.value = MAX_LIVES;
	currentLevel.value = isEndless.value ? 1 : difficulty.value;

	for (const cell of cells) {
		cell.visible = false; cell.emoji = null;
		cell.hitGlow = false; cell.missGlow = false;
		cell.graceHittable = false; cell.occupied = false;
		cell.spawnId = 0;
		if (cell.timer) { clearTimeout(cell.timer); cell.timer = null; }
		if (cell.graceTimer) { clearTimeout(cell.graceTimer); cell.graceTimer = null; }
	}
	for (const cell of aiCells) { aiClearCell(cell); }

	buildPool();
	startCountdown();
}

function restart() { initGame(); }
function goBack() { mainRouter.push('/whack-emoji'); }

onMounted(() => { initGame(); });
onUnmounted(() => {
	if (spawnTimer) clearInterval(spawnTimer);
	if (countdownTimer) clearInterval(countdownTimer);
	stopAi();
	for (const cell of cells) {
		if (cell.timer) clearTimeout(cell.timer);
		if (cell.graceTimer) clearTimeout(cell.graceTimer);
	}
	for (const cell of aiCells) { aiClearCell(cell); }
});

definePage(() => ({ title: '絵文字叩きゲーム', icon: 'ti ti-hammer' }));
</script>

<style lang="scss" module>
.root { max-width: 800px; margin: 0 auto; position: relative; }
.dual { display: flex; gap: 10px; }
.side { flex: 1; min-width: 0; }
.sideLabel { text-align: center; font-weight: 700; font-size: .8rem; margin-bottom: 6px; padding: 4px 0; border-radius: 8px; background: var(--MI_THEME-panel); }
.aiSideLabel { color: #e74040; }

.header { display: flex; justify-content: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.scoreBox { background: var(--MI_THEME-panel); border-radius: 12px; padding: 6px 14px; text-align: center; border: 1.5px solid var(--MI_THEME-divider); min-width: 60px; }
.scoreLabel { font-size: .6rem; font-weight: 700; opacity: .5; letter-spacing: .1em; }
.scoreValue { font-size: 1.2rem; font-weight: 900; color: var(--MI_THEME-accent); font-variant-numeric: tabular-nums; }
.aiScore { color: #e74040 !important; }
.timeDanger { color: #e74040 !important; animation: timePulse .5s infinite; }
@keyframes timePulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }

.countdownOverlay { position: absolute; inset: 0; z-index: 200; background: rgba(0,0,0,.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; border-radius: 16px; }
.countdownNum { font-size: 6rem; font-weight: 900; color: #fff; text-shadow: 0 4px 24px rgba(0,0,0,.5); animation: countPop .6s ease; }
@keyframes countPop { 0% { transform: scale(2); opacity: 0; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); } }

.grid { display: grid; gap: 12px; padding: 16px; background: color-mix(in srgb, var(--MI_THEME-panel) 90%, var(--MI_THEME-fg)); border-radius: 16px; border: 2px solid var(--MI_THEME-divider); aspect-ratio: 1 / 1; }

.hole { position: relative; border-radius: 50%; background: radial-gradient(ellipse at center, color-mix(in srgb, var(--MI_THEME-bg) 80%, #000) 40%, color-mix(in srgb, var(--MI_THEME-bg) 50%, #000) 100%); overflow: visible; cursor: pointer; user-select: none; -webkit-user-select: none; transition: transform .1s; aspect-ratio: 1 / 1; display: flex; align-items: center; justify-content: center; &:active { transform: scale(.92); } }
.hitGlow { box-shadow: 0 0 20px 8px rgba(255, 215, 0, .7), inset 0 0 10px rgba(255, 215, 0, .3); .holeRing { border-color: #ffd700 !important; } }
.missGlow { box-shadow: 0 0 20px 8px rgba(59, 130, 246, .6), inset 0 0 10px rgba(59, 130, 246, .3); .holeRing { border-color: #3b82f6 !important; } }

.mole { position: absolute; inset: 10%; display: flex; align-items: center; justify-content: center; transform: translateY(100%); opacity: 0; transition: transform .15s cubic-bezier(.34,1.56,.64,1), opacity .1s; pointer-events: none; }
.moleUp { transform: translateY(0); opacity: 1; }
.moleImg { width: 56px; height: 56px; object-fit: contain; pointer-events: none; }
.moleChar { font-size: 2.8rem; line-height: 1; pointer-events: none; }

.holeRing { position: absolute; inset: 0; border-radius: 50%; border: 3px solid color-mix(in srgb, var(--MI_THEME-divider) 60%, transparent); pointer-events: none; transition: border-color .2s; }

.aiResult { margin: 8px 0; font-size: 1.1rem; font-weight: 700; }
.aiResultScore { font-size: .85rem; opacity: .6; margin-top: 4px; }

.overlay { position: absolute; inset: 0; z-index: 100; background: rgba(0,0,0,.55); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; border-radius: 16px; }
.overCard { background: var(--MI_THEME-panel); border-radius: 20px; padding: 28px 24px; text-align: center; box-shadow: 0 8px 48px rgba(0,0,0,.3); max-width: 280px; width: 90%; }
.overTitle { font-size: 1.5rem; font-weight: 900; color: #6c5ce7; margin-bottom: 10px; }
.overScore { font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; }
.overStats { font-size: .85rem; opacity: .6; margin-bottom: 4px; }
.newRecord { font-size: 1rem; font-weight: 700; color: var(--MI_THEME-accent); margin-bottom: 14px; animation: pulse 1s infinite; }
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
.overBtns { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; align-items: center; }
</style>

<style>
.fade-enter-active { transition: opacity .3s ease; }
.fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
