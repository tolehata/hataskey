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
						<div v-for="(slot, i) in slots" :key="i"
							:class="[$style.hole, slot.hitGlow && $style.hitGlow, slot.missGlow && $style.missGlow]"
							@pointerdown.prevent="whack(i)">
							<div :class="[$style.mole, moleAt(i) && $style.moleUp]">
								<img v-if="moleAt(i)?.emoji?.url" :src="moleAt(i)!.emoji.url" :class="$style.moleImg" draggable="false"/>
								<span v-else-if="moleAt(i)?.emoji?.char" :class="$style.moleChar">{{ moleAt(i)!.emoji.char }}</span>
							</div>
							<div :class="$style.holeRing"></div>
						</div>
					</div>
				</div>
				<div v-if="aiMode" :class="$style.side">
					<div :class="[$style.sideLabel, $style.aiSideLabel]">AI ({{ aiScore }})</div>
					<div :class="$style.grid" :style="gridStyle">
						<div v-for="(slot, i) in aiSlots" :key="'ai-'+i"
							:class="[$style.hole, slot.hitGlow && $style.hitGlow, slot.missGlow && $style.missGlow]">
							<div :class="[$style.mole, aiMoleAt(i) && $style.moleUp]">
								<img v-if="aiMoleAt(i)?.emoji?.url" :src="aiMoleAt(i)!.emoji.url" :class="$style.moleImg" draggable="false"/>
								<span v-else-if="aiMoleAt(i)?.emoji?.char" :class="$style.moleChar">{{ aiMoleAt(i)!.emoji.char }}</span>
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

// 旗鯖fork: 絵文字基準の再構成
// 表示枠(スロット)は演出状態だけを持つ軽量な存在にし、
// 「画面に存在する絵文字」を Mole エンティティとして配列で管理する。
// スロットは CSS Grid の格子(1fr)で配置されるため、位置を座標で持たず
// スロット番号で管理する。これによりプレイ中にウィンドウサイズが変わっても
// 座標計算がなく描画が崩れない。
interface Slot {
	hitGlow: boolean;
	missGlow: boolean;
	hitGlowTimer: ReturnType<typeof setTimeout> | null;
	missGlowTimer: ReturnType<typeof setTimeout> | null;
}

interface Mole {
	id: number; // エンティティの一意ID
	slot: number; // 表示中のスロット番号 (0..CELL_COUNT-1)
	emoji: EmojiItem;
	phase: 'up' | 'grace'; // up=表示中(叩ける) / grace=引っ込んだ直後の猶予(まだ叩ける)
	upTimer: ReturnType<typeof setTimeout> | null; // up→grace への遷移タイマー
	graceTimer: ReturnType<typeof setTimeout> | null; // grace→消滅 への遷移タイマー
	aiHitTried: boolean; // AI専用: 既に叩く試行をしたか
}

let nextMoleId = 0;

function getDiffParams(diff: number) {
	const t = (diff - 1) / 9;
	return {
		// 最低 500ms 確保 (高難易度でも視認可能な最小間隔)
		spawnInterval: Math.max(500, Math.round(1200 - t * 700)),
		// 最低 700ms 表示 (反応する余裕を残す)
		visibleDuration: Math.max(700, Math.round(2000 - t * 1300)),
		// 最大 3個まで (4個同時は視認・操作困難につき緩和)
		maxVisible: Math.min(Math.floor(1 + t * 2), 3),
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

const isEndless = ref(false);

// 表示枠(スロット)。演出状態のみを持つ
function makeSlots(): Slot[] {
	return Array.from({ length: CELL_COUNT }, () => ({
		hitGlow: false, missGlow: false, hitGlowTimer: null, missGlowTimer: null,
	}));
}

const slots = reactive<Slot[]>(makeSlots());
const aiSlots = reactive<Slot[]>(makeSlots());

// 画面に存在する絵文字エンティティ
const moles = reactive<Mole[]>([]);
const aiMoles = reactive<Mole[]>([]);

// テンプレートからスロット番号で「そこに居る絵文字」を引くためのヘルパー
function moleAt(slot: number): Mole | undefined {
	return moles.find(m => m.slot === slot);
}
function aiMoleAt(slot: number): Mole | undefined {
	return aiMoles.find(m => m.slot === slot);
}

let emojiPool: EmojiItem[] = [];
// 旗鯖fork: 一定間隔の setInterval ではなく、1回出すごとに次回をジッター付きで予約する
// 自己再帰スケジューラに変更。これにより「複数スロットからの完全に同時刻の一斉出現」が
// 構造的に発生しなくなる(出現は必ず時間差になる)。
let spawnScheduleTimer: ReturnType<typeof setTimeout> | null = null;
let aiSpawnScheduleTimer: ReturnType<typeof setTimeout> | null = null;
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
	// 本家の絵文字系ゲームに倣い、カスタム絵文字は使用せず Unicode 絵文字のみを使用する
	const fallback = ['🐹','🐰','🦊','🐻','🐼','🐨','🐸','🐵','🐱','🐶','🐷','🐮','🦁','🐯','🐺','🐲','🐴','🦄','🐙','🐳'];
	for (const c of fallback) pool.push({ char: c, name: c });
	emojiPool = pool;
}

function pickEmoji(): EmojiItem { return emojiPool[Math.floor(Math.random() * emojiPool.length)]; }

// ===== エフェクト制御ヘルパー（スロット単位） =====
function triggerHitGlow(slot: Slot, durationMs = 500) {
	if (slot.hitGlowTimer) { clearTimeout(slot.hitGlowTimer); slot.hitGlowTimer = null; }
	slot.hitGlow = true;
	slot.hitGlowTimer = setTimeout(() => {
		slot.hitGlow = false;
		slot.hitGlowTimer = null;
	}, durationMs);
}
function triggerMissGlow(slot: Slot, durationMs = 500) {
	if (slot.missGlowTimer) { clearTimeout(slot.missGlowTimer); slot.missGlowTimer = null; }
	slot.missGlow = true;
	slot.missGlowTimer = setTimeout(() => {
		slot.missGlow = false;
		slot.missGlowTimer = null;
	}, durationMs);
}

// ===== 絵文字エンティティのライフサイクル =====
// あるmoleを配列から取り除く（タイマーも確実に解放）
function removeMole(list: Mole[], mole: Mole) {
	if (mole.upTimer) { clearTimeout(mole.upTimer); mole.upTimer = null; }
	if (mole.graceTimer) { clearTimeout(mole.graceTimer); mole.graceTimer = null; }
	const idx = list.indexOf(mole);
	if (idx !== -1) list.splice(idx, 1);
}

// 空いている（どのmoleも居ない）スロット番号の一覧を返す。
// 1つのスロットには同時に1つの絵文字しか存在できないため、これで
// 「同じスロットへの重なり出現」が構造的に発生しない。
function freeSlotIndices(list: Mole[]): number[] {
	const occupied = new Set(list.map(m => m.slot));
	const free: number[] = [];
	for (let i = 0; i < CELL_COUNT; i++) {
		if (!occupied.has(i)) free.push(i);
	}
	return free;
}

// 次回出現までの待ち時間を、spawnInterval を基準に ±25% のジッターを載せて返す。
// これにより「複数スロットからの完全に同時刻の一斉出現」が起きなくなる。
function nextSpawnDelay(intervalMs: number): number {
	const jitter = intervalMs * 0.25;
	return Math.max(150, Math.round(intervalMs - jitter + Math.random() * jitter * 2));
}

// ===== ゲームロジック（プレイヤー） =====
function spawnMole() {
	if (gameOver.value || !gameStarted.value) return;
	const lvl = isEndless.value ? currentLevel.value : difficulty.value;
	const params = getDiffParams(lvl);

	// 同時表示数の上限（A方式: 複数同時出現は許容するが上限で抑える）
	if (moles.length >= params.maxVisible) return;

	const free = freeSlotIndices(moles);
	if (free.length === 0) return;

	const slotIndex = free[Math.floor(Math.random() * free.length)];
	const slot = slots[slotIndex];
	// このスロットに残っている過去の演出をリセット（新しい絵文字と混ざらないように）
	if (slot.missGlowTimer) { clearTimeout(slot.missGlowTimer); slot.missGlowTimer = null; slot.missGlow = false; }
	if (slot.hitGlowTimer) { clearTimeout(slot.hitGlowTimer); slot.hitGlowTimer = null; slot.hitGlow = false; }

	const mole: Mole = {
		id: ++nextMoleId,
		slot: slotIndex,
		emoji: pickEmoji(),
		phase: 'up',
		upTimer: null,
		graceTimer: null,
		aiHitTried: false,
	};
	moles.push(mole);

	mole.upTimer = setTimeout(() => {
		// 押しそびれ（時間切れ）
		// ★ phaseを変える前に missGlow を発火し、空スロットが光って見える誤認を防ぐ
		if (isEndless.value) {
			triggerMissGlow(slot);
			lives.value--;
			misses.value++;
			if (lives.value <= 0) {
				removeMole(moles, mole);
				endGame();
				return;
			}
		}
		mole.phase = 'grace';
		mole.upTimer = null;
		mole.graceTimer = setTimeout(() => {
			removeMole(moles, mole);
		}, 200);
	}, params.visibleDuration);
}

// 自己再帰スケジューラ: 1回出すごとに次回をジッター付きで予約する
function scheduleNextSpawn() {
	if (gameOver.value || !gameStarted.value) return;
	const lvl = isEndless.value ? currentLevel.value : difficulty.value;
	const params = getDiffParams(lvl);
	spawnScheduleTimer = setTimeout(() => {
		spawnMole();
		scheduleNextSpawn(); // 次回は最新のレベルの間隔で予約される
	}, nextSpawnDelay(params.spawnInterval));
}

function whack(slotIndex: number) {
	if (gameOver.value || !gameStarted.value) return;
	const slot = slots[slotIndex];
	const lvl = isEndless.value ? currentLevel.value : difficulty.value;
	const params = getDiffParams(lvl);

	const mole = moleAt(slotIndex); // up でも grace でも叩ける（猶予期間を維持）
	if (mole) {
		// ヒット
		removeMole(moles, mole);
		score.value += params.scorePerHit;
		hits.value++;

		// エンドレス: レベル更新（スケジューラはタイマーを作り直さず、次回予約で新間隔を使う）
		if (isEndless.value) {
			const newLvl = calcEndlessLevel();
			if (newLvl !== currentLevel.value) {
				currentLevel.value = newLvl;
			}
		}

		triggerHitGlow(slot);
	} else {
		// ミス（空叩き）
		misses.value++;

		if (isEndless.value) {
			lives.value--;
			if (lives.value <= 0) { endGame(); return; }
		} else {
			score.value = Math.max(0, score.value - params.missPenalty);
		}

		triggerMissGlow(slot);
	}
}

// ===== AI（独自盤面でプレイ） =====
function aiSpawnMole() {
	if (gameOver.value || !gameStarted.value) return;
	const lvl = isEndless.value ? currentLevel.value : difficulty.value;
	const params = getDiffParams(lvl);

	if (aiMoles.length >= params.maxVisible) return;

	const free = freeSlotIndices(aiMoles);
	if (free.length === 0) return;

	const slotIndex = free[Math.floor(Math.random() * free.length)];
	const slot = aiSlots[slotIndex];
	if (slot.missGlowTimer) { clearTimeout(slot.missGlowTimer); slot.missGlowTimer = null; slot.missGlow = false; }
	if (slot.hitGlowTimer) { clearTimeout(slot.hitGlowTimer); slot.hitGlowTimer = null; slot.hitGlow = false; }

	const mole: Mole = {
		id: ++nextMoleId,
		slot: slotIndex,
		emoji: pickEmoji(),
		phase: 'up',
		upTimer: null,
		graceTimer: null,
		aiHitTried: false,
	};
	aiMoles.push(mole);

	// 時間切れ（AIが叩けなかった）
	mole.upTimer = setTimeout(() => {
		triggerMissGlow(slot);
		mole.phase = 'grace';
		mole.upTimer = null;
		mole.graceTimer = setTimeout(() => {
			removeMole(aiMoles, mole);
		}, 200);
	}, params.visibleDuration);

	// AIが叩く試行
	const ai = getAiParams(aiMode.value);
	const reactionDelay = ai.reactionMs + Math.random() * ai.reactionMs * 0.5;
	setTimeout(() => {
		if (gameOver.value || mole.aiHitTried || mole.phase !== 'up') return;
		mole.aiHitTried = true;
		if (Math.random() < ai.hitRate) {
			// ヒット
			const curLvl = isEndless.value ? currentLevel.value : difficulty.value;
			const curParams = getDiffParams(curLvl);
			aiScore.value += curParams.scorePerHit;
			triggerHitGlow(slot);
			removeMole(aiMoles, mole);
		}
		// hitRate に失敗 → 何もしない。upTimer で時間切れ処理される
	}, reactionDelay);
}

function scheduleNextAiSpawn() {
	if (gameOver.value || !gameStarted.value || !aiMode.value) return;
	const lvl = isEndless.value ? currentLevel.value : difficulty.value;
	const params = getDiffParams(lvl);
	aiSpawnScheduleTimer = setTimeout(() => {
		aiSpawnMole();
		scheduleNextAiSpawn();
	}, nextSpawnDelay(params.spawnInterval));
}

function startAi() {
	if (!aiMode.value) return;
	scheduleNextAiSpawn();
}

function stopAi() {
	if (aiSpawnScheduleTimer) { clearTimeout(aiSpawnScheduleTimer); aiSpawnScheduleTimer = null; }
	for (const mole of [...aiMoles]) removeMole(aiMoles, mole);
}

// ===== タイマー =====
function endGame() {
	gameOver.value = true;
	gameStarted.value = false;
	if (spawnScheduleTimer) { clearTimeout(spawnScheduleTimer); spawnScheduleTimer = null; }
	if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
	stopAi();

	for (const mole of [...moles]) removeMole(moles, mole);
	for (const slot of slots) resetSlot(slot);

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
	scheduleNextSpawn();

	if (!isEndless.value) {
		countdownTimer = setInterval(() => {
			timeLeft.value--;
			if (timeLeft.value <= 0) endGame();
		}, 1000);
	}

	if (aiMode.value) startAi();
}

// スロットの演出状態とタイマーを初期化する
function resetSlot(slot: Slot) {
	slot.hitGlow = false;
	slot.missGlow = false;
	if (slot.hitGlowTimer) { clearTimeout(slot.hitGlowTimer); slot.hitGlowTimer = null; }
	if (slot.missGlowTimer) { clearTimeout(slot.missGlowTimer); slot.missGlowTimer = null; }
}

// ===== 初期化 =====
function initGame() {
	if (spawnScheduleTimer) { clearTimeout(spawnScheduleTimer); spawnScheduleTimer = null; }
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

	// 全mole(タイマー含む)を破棄
	for (const mole of [...moles]) removeMole(moles, mole);
	for (const mole of [...aiMoles]) removeMole(aiMoles, mole);
	// 全スロットの演出を初期化
	for (const slot of slots) resetSlot(slot);
	for (const slot of aiSlots) resetSlot(slot);

	buildPool();
	startCountdown();
}

function restart() { initGame(); }
function goBack() { mainRouter.push('/whack-emoji'); }

onMounted(() => { initGame(); });
onUnmounted(() => {
	if (spawnScheduleTimer) clearTimeout(spawnScheduleTimer);
	if (countdownTimer) clearInterval(countdownTimer);
	stopAi();
	for (const mole of [...moles]) removeMole(moles, mole);
	for (const slot of slots) resetSlot(slot);
	for (const slot of aiSlots) resetSlot(slot);
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
