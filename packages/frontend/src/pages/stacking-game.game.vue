<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div class="_spacer" style="--MI_SPACER-w: 800px;">
		<div :class="$style.root">
			<div :class="$style.header">
				<div :class="$style.scoreBox">
					<div :class="$style.scoreLabel">SCORE</div>
					<div :class="$style.scoreValue">{{ score }}</div>
				</div>
				<div :class="$style.scoreBox">
					<div :class="$style.scoreLabel">BEST</div>
					<div :class="$style.scoreValue">{{ highScore }}</div>
				</div>
				<div :class="$style.scoreBox">
					<div :class="$style.scoreLabel">NEXT</div>
					<div :class="$style.nextPreview">
						<img v-if="nextEmoji?.url" :src="nextEmoji.url" :class="$style.nextImg"/>
						<span v-else-if="nextEmoji?.char" :class="$style.nextChar">{{ nextEmoji.char }}</span>
					</div>
				</div>
			</div>

			<div ref="containerEl" :class="[$style.gameArea, { [$style.gameOverShake]: isGameOver }]"
				@click="onDrop" @mousemove="onMouseMove" @touchmove.prevent="onTouchMove" @touchend="onDrop">
				<canvas ref="canvasEl"></canvas>
				<div v-if="!isGameOver && ready" :class="$style.guide" :style="{ left: guideX + 'px' }">
					<div :class="$style.guideLine"></div>
					<div :class="$style.guidePreview" :style="{ width: nextRenderSize + 'px', height: nextRenderSize + 'px' }">
						<img v-if="nextEmoji?.url" :src="nextEmoji.url" :class="$style.guideImg"/>
						<span v-else-if="nextEmoji?.char" :class="$style.guideChar" :style="{ fontSize: (nextRenderSize * 0.75) + 'px' }">{{ nextEmoji.char }}</span>
					</div>
				</div>
				<!-- ゲームオーバーライン -->
				<div :class="$style.dangerLine"></div>
			</div>

			<Transition name="fade">
				<div v-if="isGameOver" :class="$style.overlay">
					<div :class="$style.overCard">
						<div :class="$style.overTitle">GAME OVER</div>
						<div :class="$style.overScore">スコア: {{ score }}</div>
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
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import * as Matter from 'matter-js';
import MkButton from '@/components/MkButton.vue';
import { mainRouter } from '@/router.js';
import { definePage } from '@/page.js';
import { miLocalStorage } from '@/local-storage.js';
import { customEmojis } from '@/custom-emojis.js';

// ===== 定数 =====
const W = 400;
const H = 600;
const PLAT_W = 280;
const PLAT_Y = H - 30;
const DROP_Y = 60;
const DANGER_Y = 90;
const COOLTIME = 450;
const EMOJI_SIZE = 40; // 統一サイズ

// Unicode絵文字プール
const UNICODE_EMOJIS = ['🍎','🍊','🍋','🍇','🍓','🍑','🍒','🥝','🍌','🍉','🫐','🥭','🍍','🥥','🧁','🍩','🍪','🎂','🍰','🧀','🌮','🍕','🍔','🍟','🌭','🥐','🍙','🍘','🍡','🥟','🐱','🐶','🐰','🐻','🐼','🐨','🦊','🐸','🐧','🐥','🦄','🐝','🐞','🐙','🦑','🐠','🐳','🦋','🌸','🌺','🌻','🌹','🪻','💎','⭐','🔥','❄️','🌈','☀️','🌙'];

type EmojiItem = { url?: string; char?: string; name: string; size: number; score: number; naturalW?: number; naturalH?: number };

// ===== refs =====
const containerEl = ref<HTMLElement|null>(null);
const canvasEl = ref<HTMLCanvasElement|null>(null);
const score = ref(0);
const highScore = ref(parseInt(miLocalStorage.getItem('stackingGameHighScore') || '0', 10));
const isGameOver = ref(false);
const isNewRecord = ref(false);
const ready = ref(false);
const guideX = ref(W / 2);
const nextEmoji = ref<EmojiItem|null>(null);
const nextRenderSize = ref(40);

let engine: Matter.Engine;
let render: Matter.Render;
let runner: Matter.Runner;
let lastDrop = 0;
let dropped = new Set<number>();
let checkTimer: ReturnType<typeof setInterval>|null = null;
let emojiPool: EmojiItem[] = [];
let blockCount = 0;

// ===== モード取得 =====
function getMode(): string {
	const params = new URLSearchParams(window.location.search);
	return params.get('mode') || 'custom';
}

// ===== 絵文字プール構築 =====
async function buildPool() {
	const mode = getMode();
	const pool: EmojiItem[] = [];

	if (mode === 'custom' || mode === 'mix') {
		const emojis = customEmojis.value;
		const shuffled = [...emojis].sort(() => Math.random() - 0.5).slice(0, 80);
		const sizePromises = shuffled.map(async (e) => {
			const natural = await getImageNaturalSize(e.url);
			return { url: e.url, name: e.name, size: EMOJI_SIZE, score: 10, naturalW: natural.w, naturalH: natural.h };
		});
		const loaded = await Promise.all(sizePromises);
		for (const r of loaded) {
			pool.push({ url: r.url, name: r.name, size: EMOJI_SIZE, score: r.score, naturalW: r.naturalW, naturalH: r.naturalH });
		}
	}

	if (mode === 'unicode' || mode === 'mix') {
		const shuffled = [...UNICODE_EMOJIS].sort(() => Math.random() - 0.5).slice(0, 40);
		for (const c of shuffled) {
			pool.push({ char: c, name: c, size: EMOJI_SIZE, score: 10 });
		}
	}

	if (pool.length === 0) {
		for (const c of UNICODE_EMOJIS.slice(0, 20)) {
			pool.push({ char: c, name: c, size: EMOJI_SIZE, score: 10 });
		}
	}

	emojiPool = pool;
}

function pickNext(): EmojiItem {
	return emojiPool[Math.floor(Math.random() * emojiPool.length)];
}

// ===== Matter.jsテクスチャ用canvas生成（Unicode絵文字用） =====
function createEmojiTexture(char: string, size: number): string {
	const canvas = document.createElement('canvas');
	const s = size * 2;
	canvas.width = s;
	canvas.height = s;
	const ctx = canvas.getContext('2d')!;
	ctx.font = `${s * 0.75}px serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(char, s / 2, s / 2);
	return canvas.toDataURL();
}

// ===== カスタム絵文字画像の元サイズを取得 =====
function getImageNaturalSize(url: string): Promise<{ w: number; h: number }> {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
		img.onerror = () => resolve({ w: EMOJI_SIZE, h: EMOJI_SIZE });
		img.src = url;
	});
}

// ===== ゲーム初期化 =====
async function initGame() {
	if (engine) { Matter.Render.stop(render); Matter.Runner.stop(runner); Matter.Engine.clear(engine); }
	if (checkTimer) clearInterval(checkTimer);

	score.value = 0;
	isGameOver.value = false;
	isNewRecord.value = false;
	ready.value = false;
	dropped = new Set();
	blockCount = 0;
	lastDrop = 0;
	guideX.value = W / 2;

	await buildPool();

	engine = Matter.Engine.create({
		gravity: { x: 0, y: 1.0 },
		enableSleeping: true,
	});

	render = Matter.Render.create({
		element: containerEl.value!,
		canvas: canvasEl.value!,
		engine,
		options: {
			width: W, height: H,
			wireframes: false,
			background: 'transparent',
			pixelRatio: window.devicePixelRatio || 1,
			showSleeping: false,
		} as any,
	});

	// 台
	Matter.Composite.add(engine.world, Matter.Bodies.rectangle(W / 2, PLAT_Y, PLAT_W, 14, {
		isStatic: true, label: 'platform',
		chamfer: { radius: 4 },
		render: { fillStyle: '#888', strokeStyle: '#666', lineWidth: 2 },
	}));

	// 壁（透明）
	const wallOpts: Matter.IChamferableBodyDefinition = { isStatic: true, label: 'wall', render: { fillStyle: 'transparent', strokeStyle: 'transparent' } };
	Matter.Composite.add(engine.world, [
		Matter.Bodies.rectangle(-50, H / 2, 100, H * 2, wallOpts),
		Matter.Bodies.rectangle(W + 50, H / 2, 100, H * 2, wallOpts),
	]);

	// 床センサー
	Matter.Composite.add(engine.world, Matter.Bodies.rectangle(W / 2, H + 60, W * 3, 120, {
		isStatic: true, label: 'floor', isSensor: true,
		render: { fillStyle: 'transparent', strokeStyle: 'transparent' },
	}));

	// 衝突→ゲームオーバー
	Matter.Events.on(engine, 'collisionStart', (ev) => {
		for (const pair of ev.pairs) {
			const labels = [pair.bodyA.label, pair.bodyB.label];
			if (labels.includes('floor')) {
				const other = pair.bodyA.label === 'floor' ? pair.bodyB : pair.bodyA;
				if (other.label === 'emoji' && dropped.has(other.id)) {
					gameOver();
				}
			}
		}
	});

	runner = Matter.Runner.create({ delta: 1000 / 60 });
	Matter.Render.run(render);
	Matter.Runner.run(runner, engine);

	// 上限ライン超えチェック
	checkTimer = setInterval(() => {
		if (isGameOver.value) return;
		for (const body of Matter.Composite.allBodies(engine.world)) {
			if (body.label === 'emoji' && dropped.has(body.id) && body.position.y < DANGER_Y && body.speed < 0.5) {
				gameOver();
				return;
			}
		}
	}, 250);

	nextEmoji.value = pickNext();
	nextRenderSize.value = nextEmoji.value.size;
	nextTick(() => { ready.value = true; });
}

function gameOver() {
	if (isGameOver.value) return;
	isGameOver.value = true;
	if (checkTimer) clearInterval(checkTimer);
	if (score.value > highScore.value) {
		highScore.value = score.value;
		isNewRecord.value = true;
		miLocalStorage.setItem('stackingGameHighScore', String(score.value));
	}
}

function onDrop() {
	if (isGameOver.value || !ready.value) return;
	const now = Date.now();
	if (now - lastDrop < COOLTIME) return;
	lastDrop = now;

	const item = nextEmoji.value!;
	const s = item.size;

	// spriteテクスチャ＆スケール計算
	let spriteTexture: string;
	let spriteScale: number;
	if (item.url) {
		spriteTexture = item.url;
		const natMax = Math.max(item.naturalW || EMOJI_SIZE, item.naturalH || EMOJI_SIZE);
		spriteScale = s / natMax;
	} else {
		spriteTexture = createEmojiTexture(item.char!, EMOJI_SIZE);
		spriteScale = s / (EMOJI_SIZE * 2);
	}

	// 四角形ボディ（角丸）で安定した積み上げ
	const body = Matter.Bodies.rectangle(guideX.value, DROP_Y, s, s, {
		label: 'emoji',
		restitution: 0.05,
		friction: 0.9,
		frictionStatic: 2.0,
		frictionAir: 0.02,
		density: 0.003,
		chamfer: { radius: 4 },
		render: {
			sprite: {
				texture: spriteTexture,
				xScale: spriteScale,
				yScale: spriteScale,
			},
		},
	});

	// 回転を適度に抑制（積み上げやすいが自然な動きは残す）
	Matter.Body.setInertia(body, body.inertia * 3);

	Matter.Composite.add(engine.world, body);

	// 一定時間後にdroppedに追加（落下判定用）
	setTimeout(() => {
		dropped.add(body.id);
	}, 700);

	// スコア加算（安定したら）
	const scoreCheck = () => {
		if (body.isSleeping && body.position.y < PLAT_Y) {
			score.value += item.score;
			Matter.Events.off(engine, 'afterUpdate', scoreCheck);
		}
		if (body.position.y > H + 30) {
			Matter.Events.off(engine, 'afterUpdate', scoreCheck);
		}
	};
	Matter.Events.on(engine, 'afterUpdate', scoreCheck);

	blockCount++;
	nextEmoji.value = pickNext();
	nextRenderSize.value = nextEmoji.value.size;
}

function onMouseMove(e: MouseEvent) {
	if (isGameOver.value || !containerEl.value) return;
	const rect = containerEl.value.getBoundingClientRect();
	guideX.value = Math.max(20, Math.min(W - 20, (e.clientX - rect.left) * (W / rect.width)));
}
function onTouchMove(e: TouchEvent) {
	if (isGameOver.value || !containerEl.value || !e.touches[0]) return;
	const rect = containerEl.value.getBoundingClientRect();
	guideX.value = Math.max(20, Math.min(W - 20, (e.touches[0].clientX - rect.left) * (W / rect.width)));
}

function restart() { initGame(); }
function goBack() { mainRouter.push('/stacking-game'); }

onMounted(() => { initGame(); });
onUnmounted(() => {
	if (checkTimer) clearInterval(checkTimer);
	if (render) Matter.Render.stop(render);
	if (runner) Matter.Runner.stop(runner);
	if (engine) Matter.Engine.clear(engine);
});

definePage(() => ({ title: 'つみつみタワー', icon: 'ti ti-building' }));
</script>

<style lang="scss" module>
.root { max-width: 420px; margin: 0 auto; position: relative; }

.header { display: flex; justify-content: center; gap: 10px; margin-bottom: 10px; }
.scoreBox {
	background: var(--MI_THEME-panel); border-radius: 12px; padding: 6px 16px; text-align: center;
	border: 1.5px solid var(--MI_THEME-divider); min-width: 70px;
}
.scoreLabel { font-size: .65rem; font-weight: 700; opacity: .5; letter-spacing: .1em; }
.scoreValue { font-size: 1.3rem; font-weight: 900; color: var(--MI_THEME-accent); font-variant-numeric: tabular-nums; }
.nextPreview { display: flex; align-items: center; justify-content: center; height: 36px; }
.nextImg { width: 32px; height: 32px; object-fit: contain; }
.nextChar { font-size: 1.6rem; line-height: 1; }

.gameArea {
	position: relative; width: 100%; aspect-ratio: 400 / 600;
	background: color-mix(in srgb, var(--MI_THEME-panel) 90%, var(--MI_THEME-fg));
	border-radius: 16px; border: 2px solid var(--MI_THEME-divider);
	overflow: hidden; cursor: crosshair; touch-action: none;
	canvas { width: 100% !important; height: 100% !important; }
}
.gameOverShake { animation: shake .5s ease; }
@keyframes shake {
	0%,100% { transform: translateX(0); }
	10%,30%,50%,70%,90% { transform: translateX(-4px); }
	20%,40%,60%,80% { transform: translateX(4px); }
}

.dangerLine {
	position: absolute; top: 15%; left: 10%; right: 10%; height: 2px;
	background: repeating-linear-gradient(90deg, rgba(255,60,60,.35) 0, rgba(255,60,60,.35) 8px, transparent 8px, transparent 16px);
	pointer-events: none;
}

.guide { position: absolute; top: 0; bottom: 0; transform: translateX(-50%); pointer-events: none; z-index: 10; }
.guideLine {
	width: 2px; height: 100%; margin: 0 auto; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
	background: repeating-linear-gradient(to bottom, color-mix(in srgb, var(--MI_THEME-accent) 35%, transparent) 0, color-mix(in srgb, var(--MI_THEME-accent) 35%, transparent) 6px, transparent 6px, transparent 12px);
}
.guidePreview {
	position: relative; top: 16px; left: 50%; transform: translateX(-50%); opacity: .65;
	display: flex; align-items: center; justify-content: center;
}
.guideImg { width: 100%; height: 100%; object-fit: contain; }
.guideChar { line-height: 1; }

.overlay {
	position: absolute; inset: 0; z-index: 100; background: rgba(0,0,0,.55);
	backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
	display: flex; align-items: center; justify-content: center; border-radius: 16px;
}
.overCard {
	background: var(--MI_THEME-panel); border-radius: 20px; padding: 28px 24px; text-align: center;
	box-shadow: 0 8px 48px rgba(0,0,0,.3); max-width: 260px; width: 90%;
}
.overTitle { font-size: 1.5rem; font-weight: 900; color: #e74040; margin-bottom: 10px; }
.overScore { font-size: 1.1rem; font-weight: 700; margin-bottom: 6px; }
.newRecord { font-size: 1rem; font-weight: 700; color: var(--MI_THEME-accent); margin-bottom: 14px; animation: pulse 1s infinite; }
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
.overBtns { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
</style>

<style>
.fade-enter-active { transition: opacity .3s ease; }
.fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
