<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div class="_spacer" style="--MI_SPACER-w: 900px;">
		<div :class="$style.root">
			<!-- 待機中 -->
			<div v-if="roomState === 'waiting'" :class="$style.waitingBox">
				<div :class="$style.waitingTitle">対戦相手を待っています...</div>
				<div :class="$style.waitingRoomId">ルームID: {{ roomId }}</div>
				<MkLoading/>
				<MkButton rounded @click="goBack" style="margin-top:16px;"><i class="ti ti-arrow-left"></i> キャンセル</MkButton>
			</div>

			<!-- プレイ中 / 観戦 -->
			<template v-if="roomState === 'playing' || roomState === 'ended'">
				<div v-if="isSpectator" :class="$style.specBadge">👁 観戦中</div>

				<div :class="$style.header">
					<div :class="$style.scoreBox">
						<div :class="$style.scoreLabel">{{ p1Name }}</div>
						<div :class="$style.scoreValue">{{ score1 }}</div>
					</div>
					<div :class="$style.scoreBox">
						<div :class="$style.scoreLabel">VS</div>
						<div :class="$style.scoreValue" style="font-size:1rem;">⚔️</div>
					</div>
					<div :class="$style.scoreBox">
						<div :class="$style.scoreLabel">{{ p2Name }}</div>
						<div :class="[$style.scoreValue, $style.p2Color]">{{ score2 }}</div>
					</div>
				</div>

				<div :class="$style.dual">
					<!-- プレイヤー1 (自分 or 観戦) -->
					<div :class="$style.side">
						<div :class="$style.sideLabel">{{ p1Name }}</div>
						<div ref="p1ContainerEl" :class="$style.gameArea"
							@click="isPlayer1 ? onDrop() : null"
							@mousemove="isPlayer1 ? onMouseMove($event) : null"
							@touchmove.prevent="isPlayer1 ? onTouchMove($event) : null"
							@touchend="isPlayer1 ? onDrop() : null">
							<canvas ref="p1CanvasEl"></canvas>
							<div v-if="isPlayer1 && roomState === 'playing'" :class="$style.guide" :style="{ left: (guideX * 100) + '%' }">
								<div :class="$style.guideLine"></div>
							</div>
						</div>
					</div>

					<!-- プレイヤー2 -->
					<div :class="$style.side">
						<div :class="[$style.sideLabel, $style.p2Color]">{{ p2Name }}</div>
						<div ref="p2ContainerEl" :class="$style.gameArea"
							@click="isPlayer2 ? onDrop() : null"
							@mousemove="isPlayer2 ? onMouseMove($event) : null"
							@touchmove.prevent="isPlayer2 ? onTouchMove($event) : null"
							@touchend="isPlayer2 ? onDrop() : null">
							<canvas ref="p2CanvasEl"></canvas>
							<div v-if="isPlayer2 && roomState === 'playing'" :class="$style.guide" :style="{ left: (guideX * 100) + '%' }">
								<div :class="$style.guideLine"></div>
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
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import * as Matter from 'matter-js';
import MkButton from '@/components/MkButton.vue';
import { mainRouter } from '@/router.js';
import { definePage } from '@/page.js';
import { customEmojis } from '@/custom-emojis.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { useStream } from '@/stream.js';
import { $i } from '@/i.js';

const GW = 300;
const GH = 450;
const PLAT_W = 210;
const PLAT_Y = GH - 24;
const DROP_Y = 45;
const EMOJI_RADIUS = 14;
const EMOJI_RENDER_SIZE = 30;
const COOLTIME = 500;

const UNICODE_EMOJIS = ['🍎','🍊','🍋','🍇','🍓','🍑','🍒','🥝','🍌','🍉','🧁','🍩','🐱','🐶','🐰','🐻','🐼','🐨','🦊','🐸'];

type EmojiItem = { url?: string; char?: string; name: string };

const roomId = new URLSearchParams(window.location.search).get('roomId') || '';
const roomState = ref<'waiting'|'playing'|'ended'>('waiting');
const score1 = ref(0);
const score2 = ref(0);
const blocks1 = ref(0);
const blocks2 = ref(0);
const p1Name = ref('P1');
const p2Name = ref('P2');
const p1Id = ref('');
const p2Id = ref('');
const guideX = ref(0.5);
const resultText = ref('');

const p1ContainerEl = ref<HTMLElement|null>(null);
const p1CanvasEl = ref<HTMLCanvasElement|null>(null);
const p2ContainerEl = ref<HTMLElement|null>(null);
const p2CanvasEl = ref<HTMLCanvasElement|null>(null);

const isPlayer1 = computed(() => $i?.id === p1Id.value);
const isPlayer2 = computed(() => $i?.id === p2Id.value);
const isSpectator = computed(() => !isPlayer1.value && !isPlayer2.value);
const myPlayerNum = computed(() => isPlayer1.value ? 1 : isPlayer2.value ? 2 : 0);

let p1Engine: Matter.Engine, p1Render: Matter.Render, p1Runner: Matter.Runner;
let p2Engine: Matter.Engine, p2Render: Matter.Render, p2Runner: Matter.Runner;
let connection: any = null;
let lastDrop = 0;
let p1Dropped = new Set<number>();
let p2Dropped = new Set<number>();
let emojiPool: EmojiItem[] = [];

function buildPool() {
	const pool: EmojiItem[] = [];
	const emojis = customEmojis.value;
	if (emojis.length > 0) {
		const shuffled = [...emojis].sort(() => Math.random() - 0.5).slice(0, 40);
		for (const e of shuffled) pool.push({ url: e.url, name: e.name });
	}
	for (const c of UNICODE_EMOJIS) pool.push({ char: c, name: c });
	emojiPool = pool;
}

function pickEmoji(): EmojiItem { return emojiPool[Math.floor(Math.random() * emojiPool.length)]; }

function createEmojiTexture(char: string): string {
	const c = document.createElement('canvas');
	const s = EMOJI_RENDER_SIZE * 2;
	c.width = s; c.height = s;
	const ctx = c.getContext('2d')!;
	ctx.font = `${s * 0.7}px serif`;
	ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
	ctx.fillText(char, s / 2, s / 2);
	return c.toDataURL();
}

function createPhysics(container: HTMLElement, canvas: HTMLCanvasElement) {
	const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.2 }, enableSleeping: true });
	const render = Matter.Render.create({
		element: container, canvas, engine,
		options: { width: GW, height: GH, wireframes: false, background: 'transparent', pixelRatio: window.devicePixelRatio || 1 } as any,
	});
	Matter.Composite.add(engine.world, Matter.Bodies.rectangle(GW/2, PLAT_Y, PLAT_W, 12, {
		isStatic: true, label: 'platform', chamfer: { radius: 3 },
		render: { fillStyle: '#888', strokeStyle: '#666', lineWidth: 2 },
	}));
	const wo = { isStatic: true, label: 'wall', render: { fillStyle: 'transparent', strokeStyle: 'transparent' } } as any;
	Matter.Composite.add(engine.world, [
		Matter.Bodies.rectangle(-50, GH/2, 100, GH*2, wo),
		Matter.Bodies.rectangle(GW+50, GH/2, 100, GH*2, wo),
		Matter.Bodies.rectangle(GW/2, -50, GW*2, 100, { isStatic: true, label: 'ceiling', render: { fillStyle: 'transparent', strokeStyle: 'transparent' } }),
		Matter.Bodies.rectangle(GW/2, GH+50, GW*3, 100, { isStatic: true, label: 'floor', isSensor: true, render: { fillStyle: 'transparent', strokeStyle: 'transparent' } }),
	]);
	const runner = Matter.Runner.create({ delta: 1000/60 });
	Matter.Render.run(render); Matter.Runner.run(runner, engine);
	return { engine, render, runner };
}

function dropEmojiToEngine(engine: Matter.Engine, dropX: number, item: EmojiItem, droppedSet: Set<number>) {
	let tex: string;
	let sx: number, sy: number;
	if (item.url) {
		tex = item.url; sx = EMOJI_RENDER_SIZE / 128; sy = sx;
	} else {
		tex = createEmojiTexture(item.char!); sx = 0.5; sy = 0.5;
	}
	const body = Matter.Bodies.circle(dropX, DROP_Y, EMOJI_RADIUS, {
		label: 'emoji', restitution: 0.1, friction: 0.8, frictionStatic: 1.5, frictionAir: 0.015, density: 0.004,
		render: { sprite: { texture: tex, xScale: sx, yScale: sy } },
	});
	Matter.Composite.add(engine.world, body);
	if (item.url) {
		const img = new Image();
		img.onload = () => {
			const n = Math.max(img.naturalWidth, img.naturalHeight, 1);
			const s = EMOJI_RENDER_SIZE / n;
			if (body.render.sprite) { body.render.sprite.xScale = s; body.render.sprite.yScale = s; }
		};
		img.src = item.url;
	}
	setTimeout(() => { droppedSet.add(body.id); }, 700);
}

function setupFloorDetection(engine: Matter.Engine, droppedSet: Set<number>, playerNum: number) {
	Matter.Events.on(engine, 'collisionStart', (ev) => {
		for (const pair of ev.pairs) {
			const labels = [pair.bodyA.label, pair.bodyB.label];
			if (labels.includes('floor')) {
				const other = pair.bodyA.label === 'floor' ? pair.bodyB : pair.bodyA;
				if (other.label === 'emoji' && droppedSet.has(other.id)) {
					// 自分が死んだ → サーバーに通知
					if (myPlayerNum.value === playerNum && connection) {
						connection.send('dead', {});
					}
				}
			}
		}
	});
}

// ===== WebSocket接続 =====
function connectToRoom() {
	connection = useStream().useChannel('stackingGameRoom', { roomId });

	connection.on('started', (data: any) => {
		roomState.value = 'playing';
		if (data.host2Id) p2Id.value = data.host2Id;
		fetchRoomAndInit();
	});

	connection.on('drop', (data: any) => {
		// 相手のドロップを自分の画面に反映
		if (data.userId === p1Id.value && !isPlayer1.value) {
			const item: EmojiItem = data.emojiUrl ? { url: data.emojiUrl, name: data.emojiName } : { char: data.emojiChar, name: data.emojiName };
			dropEmojiToEngine(p1Engine, data.dropX * GW, item, p1Dropped);
		} else if (data.userId === p2Id.value && !isPlayer2.value) {
			const item: EmojiItem = data.emojiUrl ? { url: data.emojiUrl, name: data.emojiName } : { char: data.emojiChar, name: data.emojiName };
			dropEmojiToEngine(p2Engine, data.dropX * GW, item, p2Dropped);
		}
	});

	connection.on('scoreUpdate', (data: any) => {
		if (data.userId === p1Id.value) { score1.value = data.score; blocks1.value = data.blocks; }
		else if (data.userId === p2Id.value) { score2.value = data.score; blocks2.value = data.blocks; }
	});

	connection.on('ended', (data: any) => {
		roomState.value = 'ended';
		if (data.winner === 1) resultText.value = `🎉 ${p1Name.value} の勝ち！`;
		else if (data.winner === 2) resultText.value = `🎉 ${p2Name.value} の勝ち！`;
		else resultText.value = '🤝 引き分け！';
	});

	connection.on('canceled', () => {
		roomState.value = 'ended';
		resultText.value = 'ルームがキャンセルされました';
	});
}

async function fetchRoomAndInit() {
	const room = await misskeyApi('stacking-game/rooms', { roomId }) as any;
	if (!room) return;

	p1Id.value = room.host1Id;
	p2Id.value = room.host2Id || '';
	p1Name.value = room.host1?.name || room.host1?.username || 'P1';
	p2Name.value = room.host2?.name || room.host2?.username || 'P2';
	roomState.value = room.state as any;
	score1.value = room.score1;
	score2.value = room.score2;

	if (room.state === 'playing' || room.state === 'ended') {
		await nextTick();
		initPhysics();
	}
}

function initPhysics() {
	if (!p1ContainerEl.value || !p1CanvasEl.value || !p2ContainerEl.value || !p2CanvasEl.value) return;
	buildPool();

	const p1 = createPhysics(p1ContainerEl.value, p1CanvasEl.value);
	p1Engine = p1.engine; p1Render = p1.render; p1Runner = p1.runner;
	setupFloorDetection(p1Engine, p1Dropped, 1);

	const p2 = createPhysics(p2ContainerEl.value, p2CanvasEl.value);
	p2Engine = p2.engine; p2Render = p2.render; p2Runner = p2.runner;
	setupFloorDetection(p2Engine, p2Dropped, 2);
}

// ===== 自分のドロップ =====
let myScore = 0;
let myBlocks = 0;

function onDrop() {
	if (roomState.value !== 'playing') return;
	const now = Date.now();
	if (now - lastDrop < COOLTIME) return;
	lastDrop = now;

	const item = pickEmoji();
	const dropX = guideX.value;
	const engine = isPlayer1.value ? p1Engine : p2Engine;
	const droppedSet = isPlayer1.value ? p1Dropped : p2Dropped;

	dropEmojiToEngine(engine, dropX * GW, item, droppedSet);
	myScore += 10;
	myBlocks++;

	if (isPlayer1.value) { score1.value = myScore; blocks1.value = myBlocks; }
	else { score2.value = myScore; blocks2.value = myBlocks; }

	// サーバーに通知
	if (connection) {
		connection.send('drop', {
			dropX,
			emojiName: item.name,
			emojiUrl: item.url || undefined,
			emojiChar: item.char || undefined,
		});
		connection.send('scoreUpdate', { score: myScore, blocks: myBlocks });
	}
}

function onMouseMove(e: MouseEvent) {
	if (roomState.value !== 'playing') return;
	const container = isPlayer1.value ? p1ContainerEl.value : p2ContainerEl.value;
	if (!container) return;
	const rect = container.getBoundingClientRect();
	guideX.value = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
}

function onTouchMove(e: TouchEvent) {
	if (roomState.value !== 'playing' || !e.touches[0]) return;
	const container = isPlayer1.value ? p1ContainerEl.value : p2ContainerEl.value;
	if (!container) return;
	const rect = container.getBoundingClientRect();
	guideX.value = Math.max(0.05, Math.min(0.95, (e.touches[0].clientX - rect.left) / rect.width));
}

function goBack() { mainRouter.push('/stacking-game/lobby'); }

onMounted(async () => {
	await fetchRoomAndInit();
	connectToRoom();
});

onUnmounted(() => {
	if (connection) connection.dispose();
	if (p1Render) Matter.Render.stop(p1Render);
	if (p1Runner) Matter.Runner.stop(p1Runner);
	if (p1Engine) Matter.Engine.clear(p1Engine);
	if (p2Render) Matter.Render.stop(p2Render);
	if (p2Runner) Matter.Runner.stop(p2Runner);
	if (p2Engine) Matter.Engine.clear(p2Engine);
});

definePage(() => ({ title: 'つみつみタワー - 対戦', icon: 'ti ti-swords' }));
</script>

<style lang="scss" module>
.root { max-width: 700px; margin: 0 auto; position: relative; }
.waitingBox { text-align: center; padding: 40px 20px; }
.waitingTitle { font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; }
.waitingRoomId { font-size: .8rem; opacity: .5; margin-bottom: 16px; }
.specBadge { text-align: center; padding: 6px; font-weight: 700; font-size: .85rem; background: var(--MI_THEME-accentedBg); border-radius: 8px; margin-bottom: 8px; }
.header { display: flex; justify-content: center; gap: 10px; margin-bottom: 10px; }
.scoreBox { background: var(--MI_THEME-panel); border-radius: 12px; padding: 6px 16px; text-align: center; border: 1.5px solid var(--MI_THEME-divider); min-width: 70px; }
.scoreLabel { font-size: .6rem; font-weight: 700; opacity: .5; letter-spacing: .1em; }
.scoreValue { font-size: 1.3rem; font-weight: 900; color: var(--MI_THEME-accent); font-variant-numeric: tabular-nums; }
.p2Color { color: #e74040 !important; }
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
.guide { position: absolute; top: 0; bottom: 0; transform: translateX(-50%); pointer-events: none; z-index: 10; }
.guideLine { width: 2px; height: 100%; position: absolute; top: 0; left: 50%; transform: translateX(-50%); background: repeating-linear-gradient(to bottom, color-mix(in srgb, var(--MI_THEME-accent) 35%, transparent) 0, color-mix(in srgb, var(--MI_THEME-accent) 35%, transparent) 6px, transparent 6px, transparent 12px); }
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
