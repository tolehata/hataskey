<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div class="_spacer" style="--MI_SPACER-w: 900px;">
		<div :class="$style.root">
			<!-- ヘッダー -->
			<div :class="$style.header">
				<div :class="$style.scoreBox">
					<div :class="$style.scoreLabel">YOU</div>
					<div :class="$style.scoreValue">{{ playerScore }}</div>
				</div>
				<div :class="$style.scoreBox">
					<div :class="$style.scoreLabel">VS</div>
					<div :class="$style.scoreValue" style="font-size:1rem;">{{ aiLabel }}</div>
				</div>
				<div :class="$style.scoreBox">
					<div :class="$style.scoreLabel">AI</div>
					<div :class="[$style.scoreValue, $style.aiColor]">{{ aiScore }}</div>
				</div>
			</div>

			<!-- デュアルゲームエリア -->
			<div :class="$style.dual">
				<!-- プレイヤー側 -->
				<div :class="$style.side">
					<div :class="$style.sideLabel">あなた</div>
					<div ref="playerContainerEl" :class="[$style.gameArea, { [$style.gameOverShake]: playerDead }]"
						@click="onDrop" @mousemove="onMouseMove" @touchmove.prevent="onTouchMove" @touchend="onDrop">
						<canvas ref="playerCanvasEl"></canvas>
						<div v-if="!playerDead && ready" :class="$style.guide" :style="guideStyle">
							<div :class="$style.guideLine"></div>
							<div :class="$style.guidePreview">
								<img v-if="currentEmoji?.url" :src="currentEmoji.url" :class="$style.guideImg"/>
								<span v-else-if="currentEmoji?.char" :class="$style.guideChar">{{ currentEmoji.char }}</span>
							</div>
						</div>
					</div>
				</div>

				<!-- AI側 -->
				<div :class="$style.side">
					<div :class="[$style.sideLabel, $style.aiColor]">AI ({{ aiLabel }})</div>
					<div ref="aiContainerEl" :class="[$style.gameArea, { [$style.gameOverShake]: aiDead }]">
						<canvas ref="aiCanvasEl"></canvas>
					</div>
				</div>
			</div>

			<!-- 結果オーバーレイ -->
			<Transition name="fade">
				<div v-if="gameEnded" :class="$style.overlay">
					<div :class="$style.overCard">
						<div :class="$style.overTitle">{{ resultTitle }}</div>
						<div :class="$style.overScoreRow">
							<div>あなた: <b>{{ playerScore }}</b></div>
							<div>AI: <b>{{ aiScore }}</b></div>
						</div>
						<div :class="$style.overBlocks">あなた: {{ playerBlocks }}個 / AI: {{ aiBlocks }}個</div>
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
import { misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';

const GW = 300;
const GH = 450;
const PLAT_W = 210;
const PLAT_Y = GH - 24;
const DROP_Y = 45;
const EMOJI_RADIUS = 14;
const EMOJI_RENDER_SIZE = 30;
const COOLTIME = 500;

const UNICODE_EMOJIS = ['🍎','🍊','🍋','🍇','🍓','🍑','🍒','🥝','🍌','🍉','🫐','🥭','🍍','🥥','🧁','🍩','🍪','🎂','🍰','🧀','🌮','🍕','🍔','🍟','🌭','🥐','🍙','🍘','🍡','🥟','🐱','🐶','🐰','🐻','🐼','🐨','🦊','🐸'];

type EmojiItem = { url?: string; char?: string; name: string; score: number };

// AI難易度パラメータ
function getAiParams(level: string) {
	switch (level) {
		case 'easy': return { dropInterval: 2500, accuracy: 0.3, label: 'よわい' };
		case 'hard': return { dropInterval: 1500, accuracy: 0.6, label: 'むずかしい' };
		case 'extreme': return { dropInterval: 900, accuracy: 0.85, label: 'つよすぎる' };
		case 'insane': return { dropInterval: 600, accuracy: 0.95, label: 'エグい' };
		default: return { dropInterval: 2000, accuracy: 0.4, label: 'よわい' };
	}
}

// ===== Refs =====
const playerContainerEl = ref<HTMLElement|null>(null);
const playerCanvasEl = ref<HTMLCanvasElement|null>(null);
const aiContainerEl = ref<HTMLElement|null>(null);
const aiCanvasEl = ref<HTMLCanvasElement|null>(null);

const playerScore = ref(0);
const aiScore = ref(0);
const playerBlocks = ref(0);
const aiBlocks = ref(0);
const playerDead = ref(false);
const aiDead = ref(false);
const gameEnded = ref(false);
const ready = ref(false);
const guideXRatio = ref(0.5);
const currentEmoji = ref<EmojiItem|null>(null);
const nextEmoji = ref<EmojiItem|null>(null);

const aiLevel = ref('easy');
const aiLabel = ref('よわい');

// Matter.js instances
let pEngine: Matter.Engine, pRender: Matter.Render, pRunner: Matter.Runner;
let aEngine: Matter.Engine, aRender: Matter.Render, aRunner: Matter.Runner;
let pDropped = new Set<number>();
let aDropped = new Set<number>();
let emojiPool: EmojiItem[] = [];
let lastDrop = 0;
let aiDropTimer: ReturnType<typeof setInterval>|null = null;
let autoDropTimer: ReturnType<typeof setTimeout>|null = null;

// 難易度に応じた落下間隔（プレイヤー・AI共通で公平）
function getDropIntervalMs(): number {
	const params = getAiParams(aiLevel.value);
	// easy:5000ms, hard:3500ms, extreme:2500ms, insane:1800ms
	switch (aiLevel.value) {
		case 'easy': return 5000;
		case 'hard': return 3500;
		case 'extreme': return 2500;
		case 'insane': return 1800;
		default: return 4000;
	}
}
let pAnimTex = new Map<number, { img: HTMLImageElement }>();
let aAnimTex = new Map<number, { img: HTMLImageElement }>();
let pRafId = 0, aRafId = 0;

const guideStyle = computed(() => ({ left: (guideXRatio.value * 100) + '%' }));
const resultTitle = computed(() => {
	if (playerDead.value && aiDead.value) {
		// 両方死亡→スコア比較
		if (playerScore.value > aiScore.value) return '🎉 あなたの勝ち！';
		if (aiScore.value > playerScore.value) return '😢 AIの勝ち...';
		return '🤝 引き分け！';
	}
	if (playerDead.value && !aiDead.value) return '😢 AIの勝ち...';
	if (aiDead.value && !playerDead.value) return '🎉 あなたの勝ち！';
	// タイムアウトで終了（両方生存）→スコア比較
	if (playerScore.value > aiScore.value) return '🎉 あなたの勝ち！';
	if (aiScore.value > playerScore.value) return '😢 AIの勝ち...';
	return '🤝 引き分け！';
});

function buildPool() {
	const pool: EmojiItem[] = [];
	// 本家の絵文字系ゲームに倣い、カスタム絵文字は使用せず Unicode 絵文字のみを使用する
	for (const c of UNICODE_EMOJIS) pool.push({ char: c, name: c, score: 10 });
	if (pool.length === 0) {
		for (const c of UNICODE_EMOJIS.slice(0, 20)) pool.push({ char: c, name: c, score: 10 });
	}
	emojiPool = pool;
}

function pickEmoji(): EmojiItem { return emojiPool[Math.floor(Math.random() * emojiPool.length)]; }

function createEmojiTexture(char: string): string {
	const canvas = document.createElement('canvas');
	const s = EMOJI_RENDER_SIZE * 2;
	canvas.width = s; canvas.height = s;
	const ctx = canvas.getContext('2d')!;
	ctx.font = `${s * 0.7}px serif`;
	ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
	ctx.fillText(char, s / 2, s / 2);
	return canvas.toDataURL();
}

function createPhysicsWorld(containerEl: HTMLElement, canvasEl: HTMLCanvasElement): { engine: Matter.Engine; render: Matter.Render; runner: Matter.Runner } {
	const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.2 }, enableSleeping: true });
	const render = Matter.Render.create({
		element: containerEl, canvas: canvasEl, engine,
		options: { width: GW, height: GH, wireframes: false, background: 'transparent', pixelRatio: window.devicePixelRatio || 1, showSleeping: false } as any,
	});

	// 台
	Matter.Composite.add(engine.world, Matter.Bodies.rectangle(GW / 2, PLAT_Y, PLAT_W, 12, {
		isStatic: true, label: 'platform', chamfer: { radius: 3 },
		render: { fillStyle: '#888', strokeStyle: '#666', lineWidth: 2 },
	}));
	// 壁
	const wo: Matter.IChamferableBodyDefinition = { isStatic: true, label: 'wall', render: { fillStyle: 'transparent', strokeStyle: 'transparent' } };
	Matter.Composite.add(engine.world, [
		Matter.Bodies.rectangle(-50, GH / 2, 100, GH * 2, wo),
		Matter.Bodies.rectangle(GW + 50, GH / 2, 100, GH * 2, wo),
	]);
	// 天井
	Matter.Composite.add(engine.world, Matter.Bodies.rectangle(GW / 2, -50, GW * 2, 100, {
		isStatic: true, label: 'ceiling', render: { fillStyle: 'transparent', strokeStyle: 'transparent' },
	}));
	// 床センサー
	Matter.Composite.add(engine.world, Matter.Bodies.rectangle(GW / 2, GH + 50, GW * 3, 100, {
		isStatic: true, label: 'floor', isSensor: true, render: { fillStyle: 'transparent', strokeStyle: 'transparent' },
	}));

	const runner = Matter.Runner.create({ delta: 1000 / 60 });
	Matter.Render.run(render);
	Matter.Runner.run(runner, engine);

	return { engine, render, runner };
}

function dropEmoji(engine: Matter.Engine, dropX: number, item: EmojiItem, droppedSet: Set<number>, animTexMap: Map<number, { img: HTMLImageElement }>, onScore: () => void) {
	let spriteTexture: string;
	let spriteXScale: number, spriteYScale: number;
	let isAnimated = false;

	if (item.url) {
		isAnimated = /\.(gif|apng)(\?|$)/i.test(item.url) || item.url.includes('animated');
		spriteTexture = item.url;
		spriteXScale = EMOJI_RENDER_SIZE / 128;
		spriteYScale = EMOJI_RENDER_SIZE / 128;
	} else {
		spriteTexture = createEmojiTexture(item.char!);
		spriteXScale = EMOJI_RENDER_SIZE / (EMOJI_RENDER_SIZE * 2);
		spriteYScale = EMOJI_RENDER_SIZE / (EMOJI_RENDER_SIZE * 2);
	}

	const body = Matter.Bodies.circle(dropX, DROP_Y, EMOJI_RADIUS, {
		label: 'emoji', restitution: 0.1, friction: 0.8, frictionStatic: 1.5, frictionAir: 0.015, density: 0.004,
		render: isAnimated ? { fillStyle: 'transparent', strokeStyle: 'transparent' } : {
			sprite: { texture: spriteTexture, xScale: spriteXScale, yScale: spriteYScale },
		},
	});

	Matter.Composite.add(engine.world, body);

	if (item.url && !isAnimated) {
		const img = new Image();
		img.onload = () => {
			const natMax = Math.max(img.naturalWidth, img.naturalHeight, 1);
			const scale = EMOJI_RENDER_SIZE / natMax;
			if (body.render.sprite) { body.render.sprite.xScale = scale; body.render.sprite.yScale = scale; }
		};
		img.src = item.url;
	}

	if (isAnimated && item.url) {
		const img = new Image(); img.src = item.url;
		animTexMap.set(body.id, { img });
	}

	setTimeout(() => { droppedSet.add(body.id); }, 700);

	const scoreCheck = () => {
		if (body.isSleeping && body.position.y < PLAT_Y) { onScore(); Matter.Events.off(engine, 'afterUpdate', scoreCheck); }
		if (body.position.y > GH + 30) { Matter.Events.off(engine, 'afterUpdate', scoreCheck); }
	};
	Matter.Events.on(engine, 'afterUpdate', scoreCheck);
}

function makeAnimLoop(engine: Matter.Engine, render: Matter.Render, texMap: Map<number, { img: HTMLImageElement }>): () => number {
	let rafId = 0;
	function loop() {
		if (!render?.canvas) return;
		const ctx = render.context as CanvasRenderingContext2D;
		if (!ctx) { rafId = requestAnimationFrame(loop); return; }
		for (const [bodyId, tex] of texMap) {
			const body = Matter.Composite.allBodies(engine.world).find(b => b.id === bodyId);
			if (!body) { texMap.delete(bodyId); continue; }
			ctx.save();
			ctx.translate(body.position.x, body.position.y);
			ctx.rotate(body.angle);
			const h = EMOJI_RENDER_SIZE / 2;
			ctx.drawImage(tex.img, -h, -h, EMOJI_RENDER_SIZE, EMOJI_RENDER_SIZE);
			ctx.restore();
		}
		rafId = requestAnimationFrame(loop);
	}
	rafId = requestAnimationFrame(loop);
	return () => rafId;
}

// ===== AI ドロップロジック =====
let aiLastDropTime = 0;

function getAiDropX(accuracy: number): number {
	const bodies = Matter.Composite.allBodies(aEngine.world).filter(b => b.label === 'emoji');
	const platLeft = (GW - PLAT_W) / 2;
	const platRight = (GW + PLAT_W) / 2;

	if (bodies.length === 0) {
		// 最初: 台の中央付近から安定して始める
		return GW / 2 + (Math.random() - 0.5) * 30;
	}

	// 最も高い位置を取得
	const highestY = Math.min(...bodies.map(b => b.position.y));

	// ミス判定: accuracyが低いほどランダムに落とす
	if (Math.random() > accuracy) {
		return platLeft + 20 + Math.random() * (PLAT_W - 40);
	}

	// 戦術を選択
	const strategy = Math.random();
	const leftBodies = bodies.filter(b => b.position.x < GW / 2);
	const rightBodies = bodies.filter(b => b.position.x >= GW / 2);

	if (strategy < 0.35) {
		// 戦術1: 壁スタック - 少ない方の端に寄せる
		const targetSide = leftBodies.length <= rightBodies.length ? 'left' : 'right';
		if (targetSide === 'left') {
			const x = leftBodies.length > 0
				? leftBodies.reduce((b, c) => c.position.y < b.position.y ? c : b).position.x
				: platLeft + EMOJI_RADIUS + 8;
			return x + (Math.random() - 0.5) * 8;
		} else {
			const x = rightBodies.length > 0
				? rightBodies.reduce((b, c) => c.position.y < b.position.y ? c : b).position.x
				: platRight - EMOJI_RADIUS - 8;
			return x + (Math.random() - 0.5) * 8;
		}
	} else if (strategy < 0.65) {
		// 戦術2: バランス補正 - 低い方に落とす
		const leftMinY = leftBodies.length > 0 ? Math.min(...leftBodies.map(b => b.position.y)) : PLAT_Y;
		const rightMinY = rightBodies.length > 0 ? Math.min(...rightBodies.map(b => b.position.y)) : PLAT_Y;
		if (leftMinY > rightMinY + 25) {
			return platLeft + 20 + Math.random() * (PLAT_W / 2 - 30);
		} else if (rightMinY > leftMinY + 25) {
			return GW / 2 + Math.random() * (PLAT_W / 2 - 30);
		}
		// 均等→最も安定な位置（台の中央寄り）
		return GW / 2 + (Math.random() - 0.5) * PLAT_W * 0.4;
	} else {
		// 戦術3: 最も高いスタックの上に積む
		const highest = bodies.reduce((b, c) => c.position.y < b.position.y ? c : b);
		const jitter = (1 - accuracy) * 25;
		return highest.position.x + (Math.random() - 0.5) * jitter;
	}
}

function isAiSafeToDropNow(): boolean {
	const bodies = Matter.Composite.allBodies(aEngine.world).filter(b => b.label === 'emoji');
	if (bodies.length === 0) return true;

	// 動いている（まだ落ち着いてない）ボディが多い場合は待つ
	const movingBodies = bodies.filter(b => {
		const speed = Math.sqrt(b.velocity.x ** 2 + b.velocity.y ** 2);
		return speed > 1.5;
	});
	if (movingBodies.length > 2) return false;

	// スタックの高さが危険域（DROP_Y付近）なら少し待つ
	const highestY = Math.min(...bodies.map(b => b.position.y));
	if (highestY < DROP_Y + 40) return false;

	return true;
}

function startAiDrops() {
	const params = getAiParams(aiLevel.value);
	const interval = getDropIntervalMs();
	aiDropTimer = setInterval(() => {
		if (gameEnded.value || aiDead.value) return;
		if (!isAiSafeToDropNow()) return;
		const item = pickEmoji();
		const rawX = getAiDropX(params.accuracy);
		const dropX = Math.max(EMOJI_RADIUS + 5, Math.min(GW - EMOJI_RADIUS - 5, rawX));
		dropEmoji(aEngine, dropX, item, aDropped, aAnimTex, () => {
			aiScore.value += item.score;
			aiBlocks.value++;
		});
	}, interval);
}

function checkGameEnd() {
	if (!gameEnded.value && playerDead.value && aiDead.value) {
		gameEnded.value = true;
		if (aiDropTimer) { clearInterval(aiDropTimer); aiDropTimer = null; }
		if (autoDropTimer) { clearTimeout(autoDropTimer); autoDropTimer = null; }
		submitScore();
	} else if (!gameEnded.value && (playerDead.value || aiDead.value)) {
		if (autoDropTimer) { clearTimeout(autoDropTimer); autoDropTimer = null; }
		setTimeout(() => {
			if (!gameEnded.value) {
				gameEnded.value = true;
				if (aiDropTimer) { clearInterval(aiDropTimer); aiDropTimer = null; }
				submitScore();
			}
		}, 5000);
	}
}

function submitScore() {
	if ($i) {
		misskeyApi('stacking-game/register', {
			score: playerScore.value,
			blockCount: playerBlocks.value,
		}).catch(() => {});
	}
}

// ===== 初期化 =====
async function initGame() {
	// クリーンアップ
	if (pEngine) { Matter.Render.stop(pRender); Matter.Runner.stop(pRunner); Matter.Engine.clear(pEngine); }
	if (aEngine) { Matter.Render.stop(aRender); Matter.Runner.stop(aRunner); Matter.Engine.clear(aEngine); }
	if (pRafId) cancelAnimationFrame(pRafId);
	if (aRafId) cancelAnimationFrame(aRafId);
	if (aiDropTimer) { clearInterval(aiDropTimer); aiDropTimer = null; }
	if (autoDropTimer) { clearTimeout(autoDropTimer); autoDropTimer = null; }
	pAnimTex.clear(); aAnimTex.clear();

	const params = new URLSearchParams(window.location.search);
	aiLevel.value = params.get('ai') || 'easy';
	const ap = getAiParams(aiLevel.value);
	aiLabel.value = ap.label;

	playerScore.value = 0; aiScore.value = 0;
	playerBlocks.value = 0; aiBlocks.value = 0;
	playerDead.value = false; aiDead.value = false;
	gameEnded.value = false; ready.value = false;
	pDropped = new Set(); aDropped = new Set();
	lastDrop = 0; guideXRatio.value = 0.5;

	buildPool();

	// プレイヤー物理世界
	const p = createPhysicsWorld(playerContainerEl.value!, playerCanvasEl.value!);
	pEngine = p.engine; pRender = p.render; pRunner = p.runner;

	Matter.Events.on(pEngine, 'collisionStart', (ev) => {
		for (const pair of ev.pairs) {
			const labels = [pair.bodyA.label, pair.bodyB.label];
			if (labels.includes('floor')) {
				const other = pair.bodyA.label === 'floor' ? pair.bodyB : pair.bodyA;
				if (other.label === 'emoji' && pDropped.has(other.id)) {
					playerDead.value = true;
					checkGameEnd();
				}
			}
		}
	});

	// AI物理世界
	const a = createPhysicsWorld(aiContainerEl.value!, aiCanvasEl.value!);
	aEngine = a.engine; aRender = a.render; aRunner = a.runner;

	Matter.Events.on(aEngine, 'collisionStart', (ev) => {
		for (const pair of ev.pairs) {
			const labels = [pair.bodyA.label, pair.bodyB.label];
			if (labels.includes('floor')) {
				const other = pair.bodyA.label === 'floor' ? pair.bodyB : pair.bodyA;
				if (other.label === 'emoji' && aDropped.has(other.id)) {
					aiDead.value = true;
					checkGameEnd();
				}
			}
		}
	});

	// アニメーションループ
	const pGetRaf = makeAnimLoop(pEngine, pRender, pAnimTex);
	const aGetRaf = makeAnimLoop(aEngine, aRender, aAnimTex);

	currentEmoji.value = pickEmoji();
	nextEmoji.value = pickEmoji();

	nextTick(() => {
		ready.value = true;
		startAiDrops();
		resetAutoDropTimer();
	});
}

function resetAutoDropTimer() {
	if (autoDropTimer) { clearTimeout(autoDropTimer); autoDropTimer = null; }
	if (playerDead.value || gameEnded.value || !ready.value) return;
	const interval = getDropIntervalMs();
	autoDropTimer = setTimeout(() => {
		if (!playerDead.value && !gameEnded.value && ready.value) {
			onDrop();
		}
	}, interval);
}

function onDrop() {
	if (playerDead.value || gameEnded.value || !ready.value) return;
	const now = Date.now();
	if (now - lastDrop < COOLTIME) return;
	lastDrop = now;

	const item = currentEmoji.value!;
	const dropX = guideXRatio.value * GW;

	dropEmoji(pEngine, dropX, item, pDropped, pAnimTex, () => {
		playerScore.value += item.score;
		playerBlocks.value++;
	});

	currentEmoji.value = nextEmoji.value;
	nextEmoji.value = pickEmoji();

	// 自動落下タイマーをリセット
	resetAutoDropTimer();
}

function onMouseMove(e: MouseEvent) {
	if (playerDead.value || gameEnded.value || !playerContainerEl.value) return;
	const rect = playerContainerEl.value.getBoundingClientRect();
	guideXRatio.value = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
}
function onTouchMove(e: TouchEvent) {
	if (playerDead.value || gameEnded.value || !playerContainerEl.value || !e.touches[0]) return;
	const rect = playerContainerEl.value.getBoundingClientRect();
	guideXRatio.value = Math.max(0.05, Math.min(0.95, (e.touches[0].clientX - rect.left) / rect.width));
}

function restart() { initGame(); }
function goBack() { mainRouter.push('/stacking-game'); }

onMounted(() => { initGame(); });
onUnmounted(() => {
	if (pRafId) cancelAnimationFrame(pRafId);
	if (aRafId) cancelAnimationFrame(aRafId);
	if (pEngine) { Matter.Render.stop(pRender); Matter.Runner.stop(pRunner); Matter.Engine.clear(pEngine); }
	if (aEngine) { Matter.Render.stop(aRender); Matter.Runner.stop(aRunner); Matter.Engine.clear(aEngine); }
	if (aiDropTimer) clearInterval(aiDropTimer);
	if (autoDropTimer) clearTimeout(autoDropTimer);
	pAnimTex.clear(); aAnimTex.clear();
});

definePage(() => ({ title: 'つみつみタワー vs AI', icon: 'ti ti-robot' }));
</script>

<style lang="scss" module>
.root { max-width: 700px; margin: 0 auto; position: relative; }

.header { display: flex; justify-content: center; gap: 10px; margin-bottom: 10px; }
.scoreBox { background: var(--MI_THEME-panel); border-radius: 12px; padding: 6px 16px; text-align: center; border: 1.5px solid var(--MI_THEME-divider); min-width: 70px; }
.scoreLabel { font-size: .6rem; font-weight: 700; opacity: .5; letter-spacing: .1em; }
.scoreValue { font-size: 1.3rem; font-weight: 900; color: var(--MI_THEME-accent); font-variant-numeric: tabular-nums; }
.aiColor { color: #e74040 !important; }

.dual { display: flex; gap: 8px; }
.side { flex: 1; min-width: 0; }
.sideLabel { text-align: center; font-weight: 700; font-size: .85rem; margin-bottom: 6px; padding: 4px 0; border-radius: 8px; background: var(--MI_THEME-panel); }

.gameArea {
	position: relative; width: 100%; aspect-ratio: 300 / 450;
	background: color-mix(in srgb, var(--MI_THEME-panel) 90%, var(--MI_THEME-fg));
	border-radius: 12px; border: 2px solid var(--MI_THEME-divider);
	overflow: hidden; cursor: crosshair; touch-action: none;
	canvas { width: 100% !important; height: 100% !important; display: block; }
}
.gameOverShake { animation: shake .5s ease; }
@keyframes shake { 0%,100% { transform: translateX(0); } 10%,30%,50%,70%,90% { transform: translateX(-3px); } 20%,40%,60%,80% { transform: translateX(3px); } }

.guide { position: absolute; top: 0; bottom: 0; transform: translateX(-50%); pointer-events: none; z-index: 10; }
.guideLine { width: 2px; height: 100%; margin: 0 auto; position: absolute; top: 0; left: 50%; transform: translateX(-50%); background: repeating-linear-gradient(to bottom, color-mix(in srgb, var(--MI_THEME-accent) 35%, transparent) 0, color-mix(in srgb, var(--MI_THEME-accent) 35%, transparent) 6px, transparent 6px, transparent 12px); }
.guidePreview { position: relative; top: 12px; left: 50%; transform: translateX(-50%); opacity: .6; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }
.guideImg { width: 100%; height: 100%; object-fit: contain; }
.guideChar { font-size: 1.3rem; line-height: 1; }

.overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,.55); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; }
.overCard { background: var(--MI_THEME-panel); border-radius: 20px; padding: 28px 24px; text-align: center; box-shadow: 0 8px 48px rgba(0,0,0,.3); max-width: 320px; width: 90%; }
.overTitle { font-size: 1.5rem; font-weight: 900; margin-bottom: 12px; }
.overScoreRow { display: flex; justify-content: center; gap: 24px; font-size: 1.1rem; margin-bottom: 6px; }
.overBlocks { font-size: .85rem; opacity: .6; margin-bottom: 12px; }
.overBtns { display: flex; flex-direction: column; gap: 8px; align-items: center; }
</style>

<style>
.fade-enter-active { transition: opacity .3s ease; }
.fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
