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
				<div v-if="!isGameOver && ready" :class="$style.guide" :style="guideStyle">
					<div :class="$style.guideLine"></div>
					<div :class="$style.guidePreview" :style="{ width: guidePreviewPx + 'px', height: guidePreviewPx + 'px' }">
						<img v-if="currentEmoji?.url" :src="currentEmoji.url" :class="$style.guideImg"/>
						<span v-else-if="currentEmoji?.char" :class="$style.guideChar" :style="{ fontSize: (guidePreviewPx * 0.75) + 'px' }">{{ currentEmoji.char }}</span>
					</div>
				</div>
				<div :class="$style.dangerLine" :style="dangerLineStyle"></div>
			</div>

			<Transition name="fade">
				<div v-if="isGameOver" :class="$style.overlay">
					<div :class="$style.overCard">
						<div :class="$style.overTitle">GAME OVER</div>
						<div :class="$style.overScore">スコア: {{ score }}</div>
						<div :class="$style.overBlocks">{{ blockCount }}個積み上げ</div>
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
import { misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';

const GW = 400;
const GH = 600;
const PLAT_W = 280;
const PLAT_Y = GH - 30;
const DROP_Y = 60;
const DANGER_Y = 90;
const COOLTIME = 450;
const EMOJI_RADIUS = 18;
const EMOJI_RENDER_SIZE = 38;

const UNICODE_EMOJIS = ['🍎','🍊','🍋','🍇','🍓','🍑','🍒','🥝','🍌','🍉','🫐','🥭','🍍','🥥','🧁','🍩','🍪','🎂','🍰','🧀','🌮','🍕','🍔','🍟','🌭','🥐','🍙','🍘','🍡','🥟','🐱','🐶','🐰','🐻','🐼','🐨','🦊','🐸','🐧','🐥','🦄','🐝','🐞','🐙','🦑','🐠','🐳','🦋','🌸','🌺','🌻','🌹','🪻','💎','⭐','🔥','❄️','🌈','☀️','🌙'];

type EmojiItem = { url?: string; char?: string; name: string; score: number; textureUrl?: string };

const containerEl = ref<HTMLElement|null>(null);
const canvasEl = ref<HTMLCanvasElement|null>(null);
const score = ref(0);
const highScore = ref(parseInt(miLocalStorage.getItem('stackingGameHighScore') || '0', 10));
const isGameOver = ref(false);
const isNewRecord = ref(false);
const ready = ref(false);
const guideXRatio = ref(0.5);
const currentEmoji = ref<EmojiItem|null>(null);
const nextEmoji = ref<EmojiItem|null>(null);
const blockCount = ref(0);

let engine: Matter.Engine;
let render: Matter.Render;
let runner: Matter.Runner;
let lastDrop = 0;
let dropped = new Set<number>();
let emojiPool: EmojiItem[] = [];
// 全ボディの描画情報を管理（スプライトを使わず自前描画で統一サイズ化）
let bodyTextures = new Map<number, { img: HTMLImageElement }>();

const containerWidth = ref(GW);
let resizeObserver: ResizeObserver | null = null;

function getScale(): number {
	return containerWidth.value / GW;
}

const guideStyle = computed(() => ({ left: (guideXRatio.value * 100) + '%' }));
const guidePreviewPx = computed(() => EMOJI_RENDER_SIZE * getScale());
const dangerLineStyle = computed(() => ({ top: ((DANGER_Y / GH) * 100) + '%' }));

// カスタム絵文字を固定サイズcanvasにプリレンダリング（スケーリング問題を回避）
const TEX_SIZE = EMOJI_RENDER_SIZE * 2;

async function buildPool() {
	const pool: EmojiItem[] = [];
	// 本家の絵文字系ゲームに倣い、カスタム絵文字は使用せず Unicode 絵文字のみを使用する
	const shuffled = [...UNICODE_EMOJIS].sort(() => Math.random() - 0.5).slice(0, 40);
	for (const c of shuffled) pool.push({ char: c, name: c, score: 10 });
	if (pool.length === 0) {
		for (const c of UNICODE_EMOJIS.slice(0, 20)) pool.push({ char: c, name: c, score: 10 });
	}

	// Unicode絵文字はcanvasテクスチャURLに変換
	for (const item of pool) {
		if (item.char && !item.url) {
			item.textureUrl = createEmojiTexture(item.char);
		}
	}

	emojiPool = pool;
}

function pickNext(): EmojiItem { return emojiPool[Math.floor(Math.random() * emojiPool.length)]; }

function createEmojiTexture(char: string): string {
	const canvas = document.createElement('canvas');
	canvas.width = TEX_SIZE; canvas.height = TEX_SIZE;
	const ctx = canvas.getContext('2d')!;
	ctx.font = `${TEX_SIZE * 0.7}px serif`;
	ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
	ctx.fillText(char, TEX_SIZE / 2, TEX_SIZE / 2);
	return canvas.toDataURL();
}

function animationLoop() {
	if (!render?.canvas) return;
	const ctx = render.context as CanvasRenderingContext2D;
	if (!ctx) return;

	// 全絵文字ボディを統一サイズで描画
	for (const [bodyId, tex] of bodyTextures) {
		const body = Matter.Composite.allBodies(engine.world).find(b => b.id === bodyId);
		if (!body) { bodyTextures.delete(bodyId); continue; }
		ctx.save();
		ctx.translate(body.position.x, body.position.y);
		ctx.rotate(body.angle);
		const half = EMOJI_RENDER_SIZE / 2;
		ctx.drawImage(tex.img, -half, -half, EMOJI_RENDER_SIZE, EMOJI_RENDER_SIZE);
		ctx.restore();
	}
}

async function initGame() {
	if (engine) { Matter.Render.stop(render); Matter.Runner.stop(runner); Matter.Engine.clear(engine); }
	bodyTextures.clear();
	score.value = 0; isGameOver.value = false; isNewRecord.value = false; ready.value = false;
	dropped = new Set(); blockCount.value = 0; lastDrop = 0; guideXRatio.value = 0.5;

	await buildPool();

	engine = Matter.Engine.create({ gravity: { x: 0, y: 1.2 }, enableSleeping: true });
	// pixelRatio は常に 1 に固定。canvas は CSS で DOM サイズにフィットさせるので
	// devicePixelRatio を渡すと内部解像度と物理座標がずれてスケーリング崩壊する。
	render = Matter.Render.create({
		element: containerEl.value!, canvas: canvasEl.value!, engine,
		options: { width: GW, height: GH, wireframes: false, background: 'transparent', pixelRatio: 1, showSleeping: false } as any,
	});

	// 台
	Matter.Composite.add(engine.world, Matter.Bodies.rectangle(GW / 2, PLAT_Y, PLAT_W, 14, {
		isStatic: true, label: 'platform', chamfer: { radius: 4 },
		render: { fillStyle: '#888', strokeStyle: '#666', lineWidth: 2 },
	}));
	// 壁
	const wo: Matter.IChamferableBodyDefinition = { isStatic: true, label: 'wall', render: { fillStyle: 'transparent', strokeStyle: 'transparent' } };
	Matter.Composite.add(engine.world, [
		Matter.Bodies.rectangle(-50, GH / 2, 100, GH * 2, wo),
		Matter.Bodies.rectangle(GW + 50, GH / 2, 100, GH * 2, wo),
	]);
	// 天井（跳ね返し）
	Matter.Composite.add(engine.world, Matter.Bodies.rectangle(GW / 2, -50, GW * 2, 100, {
		isStatic: true, label: 'ceiling', render: { fillStyle: 'transparent', strokeStyle: 'transparent' },
	}));
	// 床センサー
	Matter.Composite.add(engine.world, Matter.Bodies.rectangle(GW / 2, GH + 60, GW * 3, 120, {
		isStatic: true, label: 'floor', isSensor: true, render: { fillStyle: 'transparent', strokeStyle: 'transparent' },
	}));

	Matter.Events.on(engine, 'collisionStart', (ev) => {
		for (const pair of ev.pairs) {
			const labels = [pair.bodyA.label, pair.bodyB.label];
			if (labels.includes('floor')) {
				const other = pair.bodyA.label === 'floor' ? pair.bodyB : pair.bodyA;
				if (other.label === 'emoji' && dropped.has(other.id)) gameOver();
			}
		}
	});

	runner = Matter.Runner.create({ delta: 1000 / 60 });
	Matter.Render.run(render); Matter.Runner.run(runner, engine);

	// afterRender で絵文字を重ね描き（独立 RAF だと描画タイミングがずれる）
	Matter.Events.on(render, 'afterRender', animationLoop);
	currentEmoji.value = pickNext();
	nextEmoji.value = pickNext();
	nextTick(() => {
		ready.value = true;
	});
}

function gameOver() {
	if (isGameOver.value) return;
	isGameOver.value = true;
	if (score.value > highScore.value) {
		highScore.value = score.value; isNewRecord.value = true;
		miLocalStorage.setItem('stackingGameHighScore', String(score.value));
	}
	if ($i) {
		misskeyApi('stacking-game/register', { score: score.value, blockCount: blockCount.value })
			.catch(e => console.error('Failed to register score:', e));
	}
}

function onDrop() {
	if (isGameOver.value || !ready.value) return;
	const now = Date.now();
	if (now - lastDrop < COOLTIME) return;
	lastDrop = now;

	const item = currentEmoji.value!;
	const dropX = guideXRatio.value * GW;

	// 全ボディをスプライトなし（透明）で作成し、animationLoopで統一サイズ描画
	const body = Matter.Bodies.circle(dropX, DROP_Y, EMOJI_RADIUS, {
		label: 'emoji', restitution: 0.1, friction: 0.8, frictionStatic: 1.5, frictionAir: 0.015, density: 0.004,
		render: { fillStyle: 'transparent', strokeStyle: 'transparent' },
	});

	Matter.Composite.add(engine.world, body);

	// 画像をロードしてbodyTexturesに登録
	const img = new Image();
	if (item.url) {
		img.src = item.url;
	} else if (item.textureUrl) {
		img.src = item.textureUrl;
	} else {
		img.src = createEmojiTexture(item.char || '?');
	}
	bodyTextures.set(body.id, { img });

	setTimeout(() => { dropped.add(body.id); }, 700);

	const scoreCheck = () => {
		if (body.isSleeping && body.position.y < PLAT_Y) { score.value += item.score; Matter.Events.off(engine, 'afterUpdate', scoreCheck); }
		if (body.position.y > GH + 30) { Matter.Events.off(engine, 'afterUpdate', scoreCheck); }
	};
	Matter.Events.on(engine, 'afterUpdate', scoreCheck);

	blockCount.value++;
	currentEmoji.value = nextEmoji.value;
	nextEmoji.value = pickNext();
}

function onMouseMove(e: MouseEvent) {
	if (isGameOver.value || !containerEl.value) return;
	const rect = containerEl.value.getBoundingClientRect();
	guideXRatio.value = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
}
function onTouchMove(e: TouchEvent) {
	if (isGameOver.value || !containerEl.value || !e.touches[0]) return;
	const rect = containerEl.value.getBoundingClientRect();
	guideXRatio.value = Math.max(0.05, Math.min(0.95, (e.touches[0].clientX - rect.left) / rect.width));
}

function restart() { initGame(); }
function goBack() { mainRouter.push('/stacking-game'); }

onMounted(() => {
	initGame();
	if (containerEl.value) {
		containerWidth.value = containerEl.value.clientWidth;
		resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				containerWidth.value = entry.contentRect.width;
			}
		});
		resizeObserver.observe(containerEl.value);
	}
});
onUnmounted(() => {
	resizeObserver?.disconnect();
	if (render) Matter.Render.stop(render);
	if (runner) Matter.Runner.stop(runner);
	if (engine) Matter.Engine.clear(engine);
	bodyTextures.clear();
});

definePage(() => ({ title: 'つみつみタワー', icon: 'ti ti-building' }));
</script>

<style lang="scss" module>
.root { max-width: 420px; margin: 0 auto; position: relative; }
.header { display: flex; justify-content: center; gap: 10px; margin-bottom: 10px; }
.scoreBox { background: var(--MI_THEME-panel); border-radius: 12px; padding: 6px 16px; text-align: center; border: 1.5px solid var(--MI_THEME-divider); min-width: 70px; }
.scoreLabel { font-size: .65rem; font-weight: 700; opacity: .5; letter-spacing: .1em; }
.scoreValue { font-size: 1.3rem; font-weight: 900; color: var(--MI_THEME-accent); font-variant-numeric: tabular-nums; }
.nextPreview { display: flex; align-items: center; justify-content: center; height: 36px; }
.nextImg { width: 32px; height: 32px; object-fit: contain; }
.nextChar { font-size: 1.6rem; line-height: 1; }
.gameArea {
	position: relative; width: 100%; max-width: 420px; aspect-ratio: 400 / 600;
	background: color-mix(in srgb, var(--MI_THEME-panel) 90%, var(--MI_THEME-fg));
	border-radius: 16px; border: 2px solid var(--MI_THEME-divider);
	overflow: hidden; cursor: crosshair; touch-action: none;
	canvas { width: 100% !important; height: 100% !important; display: block; }
}
.gameOverShake { animation: shake .5s ease; }
@keyframes shake { 0%,100% { transform: translateX(0); } 10%,30%,50%,70%,90% { transform: translateX(-4px); } 20%,40%,60%,80% { transform: translateX(4px); } }
.dangerLine { position: absolute; left: 10%; right: 10%; height: 2px; background: repeating-linear-gradient(90deg, rgba(255,60,60,.35) 0, rgba(255,60,60,.35) 8px, transparent 8px, transparent 16px); pointer-events: none; }
.guide { position: absolute; top: 0; bottom: 0; transform: translateX(-50%); pointer-events: none; z-index: 10; }
.guideLine { width: 2px; height: 100%; margin: 0 auto; position: absolute; top: 0; left: 50%; transform: translateX(-50%); background: repeating-linear-gradient(to bottom, color-mix(in srgb, var(--MI_THEME-accent) 35%, transparent) 0, color-mix(in srgb, var(--MI_THEME-accent) 35%, transparent) 6px, transparent 6px, transparent 12px); }
.guidePreview { position: relative; top: 16px; left: 50%; transform: translateX(-50%); opacity: .65; display: flex; align-items: center; justify-content: center; }
.guideImg { width: 100%; height: 100%; object-fit: contain; }
.guideChar { line-height: 1; }
.overlay { position: absolute; inset: 0; z-index: 100; background: rgba(0,0,0,.55); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; border-radius: 16px; }
.overCard { background: var(--MI_THEME-panel); border-radius: 20px; padding: 28px 24px; text-align: center; box-shadow: 0 8px 48px rgba(0,0,0,.3); max-width: 260px; width: 90%; }
.overTitle { font-size: 1.5rem; font-weight: 900; color: #e74040; margin-bottom: 10px; }
.overScore { font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; }
.overBlocks { font-size: .85rem; opacity: .6; margin-bottom: 6px; }
.newRecord { font-size: 1rem; font-weight: 700; color: var(--MI_THEME-accent); margin-bottom: 14px; animation: pulse 1s infinite; }
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
.overBtns { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; align-items: center; }
</style>

<style>
.fade-enter-active { transition: opacity .3s ease; }
.fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
