<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div class="_spacer" style="--MI_SPACER-w: 500px;">
		<div :class="$style.root">
			<div :class="$style.header">
				<div :class="$style.scoreBox">
					<div :class="$style.scoreLabel">SCORE</div>
					<div :class="$style.scoreValue">{{ score }}</div>
				</div>
				<div :class="$style.scoreBox">
					<div :class="$style.scoreLabel">WAVE</div>
					<div :class="$style.scoreValue">{{ wave }}</div>
				</div>
				<div :class="$style.scoreBox">
					<div :class="$style.scoreLabel">LIFE</div>
					<div :class="$style.scoreValue">{{ '❤️'.repeat(lives) }}{{ '🖤'.repeat(MAX_LIVES - lives) }}</div>
				</div>
				<div v-if="isDebuffMode" :class="[$style.scoreBox, $style.debuffBadge]">
					<div :class="$style.scoreLabel">MODE</div>
					<div :class="$style.scoreValue" style="font-size:.8rem;color:#e74040;">DEBUFF</div>
				</div>
			</div>

			<div v-if="activeEffects.length > 0" :class="$style.powerBar">
				<span v-for="(p, i) in activeEffects" :key="i" :class="[$style.powerBadge, p.isDebuff && $style.debuffPowerBadge]">{{ p.icon }} {{ p.remaining }}s</span>
			</div>

			<div ref="canvasWrapEl" :class="$style.canvasWrap"
				@pointerdown.prevent="onPointerDown"
				@pointerup.prevent="onPointerUp"
				@pointermove.prevent="onPointerMove">
				<canvas ref="canvasEl" :class="$style.canvas"></canvas>
			</div>

			<Transition name="fade">
				<div v-if="gameOver" :class="$style.overlay">
					<div :class="$style.overCard">
						<div :class="$style.overTitle">GAME OVER</div>
						<div :class="$style.overScore">スコア: {{ score }}</div>
						<div :class="$style.overStats">Wave {{ wave }} / {{ kills }} kills</div>
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
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import MkButton from '@/components/MkButton.vue';
import { mainRouter } from '@/router.js';
import { definePage } from '@/page.js';
import { miLocalStorage } from '@/local-storage.js';
import { customEmojis } from '@/custom-emojis.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';

const CW = 400;
const CH = 600;
const MAX_LIVES = 3;
const PLAYER_SIZE = 36;
const BASE_BULLET_SPEED = 9;
const BULLET_SIZE = 7;
const BASE_SHOOT_INTERVAL = 180;

type EmojiData = { url?: string; char?: string; img?: HTMLImageElement };

// === 全スペシャル定義（8種） ===
type EffectType = 'rapid' | 'spread' | 'shield' | 'magnet' | 'piercing' | 'slow' | 'giant' | 'mirror';

const EFFECT_DEFS: Record<EffectType, { icon: string; duration: number; color: string; desc: string; isDebuff: boolean }> = {
	// バフ（通常モード）
	rapid:    { icon: '⚡', duration: 8,  color: '#ffd700', desc: '連射速度UP', isDebuff: false },
	spread:   { icon: '🔱', duration: 10, color: '#00bfff', desc: '3方向発射', isDebuff: false },
	shield:   { icon: '🛡️', duration: 6,  color: '#7cfc00', desc: 'ダメージ無効', isDebuff: false },
	magnet:   { icon: '🧲', duration: 8,  color: '#ff69b4', desc: 'アイテム吸引', isDebuff: false },
	piercing: { icon: '💎', duration: 7,  color: '#e0aaff', desc: '弾が貫通', isDebuff: false },
	// デバフ（デバフモードではこれらが降ってくる）
	slow:     { icon: '🐌', duration: 6,  color: '#ff6347', desc: '移動速度低下', isDebuff: true },
	giant:    { icon: '🎈', duration: 7,  color: '#ff4500', desc: '自機が巨大化', isDebuff: true },
	mirror:   { icon: '🪞', duration: 5,  color: '#9370db', desc: '左右反転', isDebuff: true },
};

const BUFF_TYPES: EffectType[] = ['rapid', 'spread', 'shield', 'magnet', 'piercing'];
const DEBUFF_TYPES: EffectType[] = ['slow', 'giant', 'mirror'];

interface Enemy { x: number; y: number; vx: number; vy: number; size: number; emoji: EmojiData; hp: number; maxHp: number; score: number; }
interface Bullet { x: number; y: number; vx: number; vy: number; pierce: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; emoji: EmojiData; size: number; }
interface Item { x: number; y: number; vy: number; type: EffectType; size: number; }
interface ActiveEffect { type: EffectType; icon: string; remaining: number; isDebuff: boolean; timerId: ReturnType<typeof setInterval>; }

const canvasEl = ref<HTMLCanvasElement | null>(null);
const canvasWrapEl = ref<HTMLElement | null>(null);
const score = ref(0);
const wave = ref(1);
const kills = ref(0);
const lives = ref(MAX_LIVES);
const gameOver = ref(false);
const isNewRecord = ref(false);
const isDebuffMode = ref(false);
const activeEffects = reactive<ActiveEffect[]>([]);

let ctx: CanvasRenderingContext2D | null = null;
let rafId = 0;
let playerX = CW / 2;
let playerEmoji: EmojiData = { char: '🚀' };
let playerImg: HTMLImageElement | null = null;
let playerImgLoaded = false;
let enemies: Enemy[] = [];
let bullets: Bullet[] = [];
let particles: Particle[] = [];
let items: Item[] = [];
let emojiPool: EmojiData[] = [];
let waveEnemiesRemaining = 0;
let waveSpawnTimer = 0;
let gameStarted = false;
let pointerX = CW / 2;
let pointerDown = false;
let lastShootTime = 0;
let shieldActive = false;
let magnetActive = false;
let piercingActive = false;
let slowActive = false;
let giantActive = false;
let mirrorActive = false;

// 枠外でもポインター追跡するためのグローバルハンドラ
let globalMoveHandler: ((e: PointerEvent) => void) | null = null;
let globalUpHandler: ((e: PointerEvent) => void) | null = null;

function buildPool() {
	const pool: EmojiData[] = [];
	const emojis = customEmojis.value;
	if (emojis.length > 0) {
		const shuffled = [...emojis].sort(() => Math.random() - 0.5).slice(0, 60);
		for (const e of shuffled) { const img = new Image(); img.src = e.url; pool.push({ url: e.url, img }); }
	}
	const fb = ['👾','👻','💀','🤖','👽','🦠','🎃','😈','🐉','🦇','🕷️','🔥','💣','⚡','🌀','☄️'];
	for (const c of fb) pool.push({ char: c });
	emojiPool = pool;
	if (emojis.length > 0) {
		const pe = emojis[Math.floor(Math.random() * emojis.length)];
		playerImg = new Image(); playerImg.onload = () => { playerImgLoaded = true; }; playerImg.src = pe.url;
		playerEmoji = { url: pe.url, img: playerImg };
	}
}

function pickEnemy(): EmojiData { return emojiPool[Math.floor(Math.random() * emojiPool.length)]; }

function getWaveParams(w: number) {
	return {
		enemyCount: 4 + w * 2 + Math.floor(w * w * 0.08),
		spawnInterval: Math.max(4, 35 - w * 1.5),
		enemySpeed: 0.4 + w * 0.1 + Math.min(w * 0.02, 1.5),
		enemyHp: 1 + Math.floor(w / 3),
		enemySize: Math.min(44, 26 + w * 1.2),
		itemChance: Math.min(0.3, 0.08 + w * 0.008),
	};
}

function spawnEnemy() {
	if (waveEnemiesRemaining <= 0) return;
	waveEnemiesRemaining--;
	const wp = getWaveParams(wave.value);
	const emoji = pickEnemy();
	const size = wp.enemySize;
	const x = size / 2 + Math.random() * (CW - size);
	const pattern = Math.random();
	let vx = 0, vy = wp.enemySpeed;
	if (pattern < 0.25) { vx = (Math.random() - 0.5) * 2.5; }
	else if (pattern < 0.4) { vx = (Math.random() - 0.5) * 3; vy = wp.enemySpeed * 1.6; }
	else if (pattern < 0.55 && wave.value >= 3) { vx = Math.sin(Date.now() * 0.003) * 2; vy = wp.enemySpeed * 0.7; }
	enemies.push({ x, y: -size, vx, vy, size, emoji, hp: wp.enemyHp, maxHp: wp.enemyHp, score: 10 * wp.enemyHp });
}

function spawnItem(x: number, y: number) {
	let pool: EffectType[];
	if (isDebuffMode.value) {
		// デバフモード: バフ30% + デバフ70%
		pool = Math.random() < 0.3 ? BUFF_TYPES : DEBUFF_TYPES;
	} else {
		// ノーマルモード: バフのみ（デバフは出現しない）
		pool = BUFF_TYPES;
	}
	const type = pool[Math.floor(Math.random() * pool.length)];
	items.push({ x, y, vy: 1.5, type, size: 22 });
}

function activateEffect(type: EffectType) {
	const def = EFFECT_DEFS[type];
	const existing = activeEffects.find(p => p.type === type);
	if (existing) { existing.remaining = def.duration; return; }
	const eff: ActiveEffect = {
		type, icon: def.icon, remaining: def.duration, isDebuff: def.isDebuff,
		timerId: setInterval(() => {
			eff.remaining--;
			if (eff.remaining <= 0) {
				clearInterval(eff.timerId);
				const idx = activeEffects.indexOf(eff);
				if (idx >= 0) activeEffects.splice(idx, 1);
				clearEffectFlag(type);
			}
		}, 1000),
	};
	activeEffects.push(eff);
	setEffectFlag(type, true);
}

function setEffectFlag(type: EffectType, on: boolean) {
	switch (type) {
		case 'shield': shieldActive = on; break;
		case 'magnet': magnetActive = on; break;
		case 'piercing': piercingActive = on; break;
		case 'slow': slowActive = on; break;
		case 'giant': giantActive = on; break;
		case 'mirror': mirrorActive = on; break;
	}
}
function clearEffectFlag(type: EffectType) { setEffectFlag(type, false); }

function nextWave() {
	wave.value++;
	const wp = getWaveParams(wave.value);
	waveEnemiesRemaining = wp.enemyCount;
	waveSpawnTimer = 0;
}

function circleHit(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
	const dx = ax - bx, dy = ay - by;
	return dx * dx + dy * dy < (ar + br) * (ar + br);
}

function explode(x: number, y: number, emoji: EmojiData, count = 6) {
	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2;
		const speed = 1.5 + Math.random() * 3;
		particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 25 + Math.random() * 15, emoji, size: 6 + Math.random() * 10 });
	}
}

function getShootInterval(): number {
	const base = activeEffects.some(p => p.type === 'rapid') ? BASE_SHOOT_INTERVAL * 0.4 : BASE_SHOOT_INTERVAL;
	return base;
}

function getBulletSpread(): number {
	return activeEffects.some(p => p.type === 'spread') ? 3 : 1;
}

function getPlayerSize(): number {
	return giantActive ? PLAYER_SIZE * 1.8 : PLAYER_SIZE;
}

function getMoveSpeed(): number {
	return slowActive ? 0.06 : 0.15;
}

function shootBullet() {
	if (gameOver.value || !gameStarted) return;
	const now = Date.now();
	if (now - lastShootTime < getShootInterval()) return;
	lastShootTime = now;
	const py = CH - 40;
	const spread = getBulletSpread();
	const pierce = piercingActive;
	if (spread === 1) {
		bullets.push({ x: playerX, y: py, vx: 0, vy: -BASE_BULLET_SPEED, pierce });
	} else {
		for (const a of [-0.2, 0, 0.2]) {
			bullets.push({ x: playerX, y: py, vx: Math.sin(a) * BASE_BULLET_SPEED, vy: -Math.cos(a) * BASE_BULLET_SPEED, pierce });
		}
	}
}

// ===== ゲームループ =====
function update() {
	if (!ctx || gameOver.value) return;

	// プレイヤー移動（mirror反転対応）
	let targetX = pointerX;
	if (mirrorActive) targetX = CW - pointerX;
	playerX += (targetX - playerX) * getMoveSpeed();
	const ps = getPlayerSize();
	playerX = Math.max(ps / 2, Math.min(CW - ps / 2, playerX));

	if (pointerDown) shootBullet();

	const wp = getWaveParams(wave.value);
	waveSpawnTimer++;
	if (waveSpawnTimer >= wp.spawnInterval && waveEnemiesRemaining > 0) { spawnEnemy(); waveSpawnTimer = 0; }

	bullets = bullets.filter(b => { b.x += b.vx; b.y += b.vy; return b.y > -10 && b.y < CH + 10 && b.x > -10 && b.x < CW + 10; });

	for (const e of enemies) {
		e.x += e.vx; e.y += e.vy;
		if (wave.value >= 3 && Math.random() < 0.01) e.vx += (Math.random() - 0.5) * 0.5;
		if (e.x < e.size / 2) { e.x = e.size / 2; e.vx *= -1; }
		if (e.x > CW - e.size / 2) { e.x = CW - e.size / 2; e.vx *= -1; }
	}

	// アイテム移動 + マグネット吸引
	const py = CH - 40;
	items = items.filter(it => {
		if (magnetActive) {
			const dx = playerX - it.x, dy = py - it.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist > 5) { it.x += (dx / dist) * 3; it.y += (dy / dist) * 3; }
		} else { it.y += it.vy; }
		return it.y < CH + 30;
	});

	// 弾→敵
	for (let i = bullets.length - 1; i >= 0; i--) {
		const b = bullets[i];
		for (let j = enemies.length - 1; j >= 0; j--) {
			const e = enemies[j];
			if (circleHit(b.x, b.y, BULLET_SIZE / 2, e.x, e.y, e.size / 2)) {
				if (!b.pierce) bullets.splice(i, 1);
				e.hp--;
				if (e.hp <= 0) {
					score.value += e.score;
					kills.value++;
					explode(e.x, e.y, e.emoji);
					if (Math.random() < wp.itemChance) spawnItem(e.x, e.y);
					enemies.splice(j, 1);
				}
				break;
			}
		}
	}

	// プレイヤー→アイテム拾得
	for (let i = items.length - 1; i >= 0; i--) {
		const it = items[i];
		if (circleHit(playerX, py, ps / 2, it.x, it.y, it.size)) { activateEffect(it.type); items.splice(i, 1); }
	}

	// 敵→プレイヤー衝突 & 画面下
	for (let i = enemies.length - 1; i >= 0; i--) {
		const e = enemies[i];
		if (circleHit(playerX, py, ps / 2, e.x, e.y, e.size / 2)) {
			explode(e.x, e.y, e.emoji); enemies.splice(i, 1);
			if (!shieldActive) { lives.value--; if (lives.value <= 0) { endGame(); return; } }
			continue;
		}
		if (e.y > CH + e.size) {
			enemies.splice(i, 1);
			if (!shieldActive) { lives.value--; if (lives.value <= 0) { endGame(); return; } }
		}
	}

	particles = particles.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--; p.size *= 0.97; return p.life > 0 && p.size > 0.5; });

	if (waveEnemiesRemaining <= 0 && enemies.length === 0) nextWave();

	draw();
	rafId = requestAnimationFrame(update);
}

function draw() {
	if (!ctx) return;
	ctx.clearRect(0, 0, CW, CH);

	// 弾（貫通時は色変更）
	for (const b of bullets) {
		ctx.fillStyle = b.pierce ? '#e0aaff' : '#ffd700';
		ctx.shadowColor = b.pierce ? '#e0aaff' : '#ffd700'; ctx.shadowBlur = 6;
		ctx.beginPath(); ctx.arc(b.x, b.y, BULLET_SIZE / 2, 0, Math.PI * 2); ctx.fill();
	}
	ctx.shadowBlur = 0;

	for (const e of enemies) {
		if (e.emoji.img && e.emoji.img.complete) { ctx.drawImage(e.emoji.img, e.x - e.size / 2, e.y - e.size / 2, e.size, e.size); }
		else if (e.emoji.char) { ctx.font = `${e.size * 0.8}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(e.emoji.char, e.x, e.y); }
		if (e.maxHp > 1) {
			const bw = e.size * 0.8, bh = 3, bx = e.x - bw / 2, by = e.y + e.size / 2 + 2;
			ctx.fillStyle = 'rgba(255,0,0,0.5)'; ctx.fillRect(bx, by, bw, bh);
			ctx.fillStyle = '#0f0'; ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
		}
	}

	for (const it of items) {
		const def = EFFECT_DEFS[it.type];
		ctx.font = `${it.size}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
		ctx.fillText(def.icon, it.x, it.y);
		ctx.beginPath(); ctx.arc(it.x, it.y, it.size * 0.8, 0, Math.PI * 2);
		ctx.strokeStyle = def.isDebuff ? '#ff4444' : def.color; ctx.lineWidth = def.isDebuff ? 2.5 : 1.5;
		ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.3; ctx.stroke(); ctx.globalAlpha = 1;
	}

	for (const p of particles) {
		ctx.globalAlpha = Math.min(1, p.life / 12);
		if (p.emoji.img && p.emoji.img.complete) { ctx.drawImage(p.emoji.img, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
		else if (p.emoji.char) { ctx.font = `${p.size}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.emoji.char, p.x, p.y); }
		ctx.globalAlpha = 1;
	}

	const playerY = CH - 40;
	const ps = getPlayerSize();
	if (playerImgLoaded && playerImg) { ctx.drawImage(playerImg, playerX - ps / 2, playerY - ps / 2, ps, ps); }
	else { ctx.font = `${ps * 0.8}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(playerEmoji.char || '🚀', playerX, playerY); }

	if (shieldActive) {
		ctx.beginPath(); ctx.arc(playerX, playerY, ps * 0.7, 0, Math.PI * 2);
		ctx.strokeStyle = '#7cfc00'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.008) * 0.3; ctx.stroke(); ctx.globalAlpha = 1;
	}
	if (mirrorActive) {
		ctx.fillStyle = 'rgba(147,112,219,0.15)'; ctx.fillRect(0, 0, CW, CH);
	}
}

function screenToCanvas(e: PointerEvent): number {
	if (!canvasWrapEl.value) return CW / 2;
	const rect = canvasWrapEl.value.getBoundingClientRect();
	return Math.max(0, Math.min(CW, (e.clientX - rect.left) * (CW / rect.width)));
}

function onPointerDown(e: PointerEvent) {
	if (gameOver.value || !gameStarted) return;
	pointerX = screenToCanvas(e);
	pointerDown = true;
	shootBullet();
	// 枠外追跡用グローバルハンドラ登録
	if (!globalMoveHandler) {
		globalMoveHandler = (ev: PointerEvent) => { pointerX = screenToCanvas(ev); };
		globalUpHandler = () => { pointerDown = false; removeGlobalHandlers(); };
		window.addEventListener('pointermove', globalMoveHandler);
		window.addEventListener('pointerup', globalUpHandler);
	}
}

function onPointerUp() { pointerDown = false; removeGlobalHandlers(); }

function onPointerMove(e: PointerEvent) {
	if (gameOver.value || !canvasWrapEl.value) return;
	pointerX = screenToCanvas(e);
}

function removeGlobalHandlers() {
	if (globalMoveHandler) { window.removeEventListener('pointermove', globalMoveHandler); globalMoveHandler = null; }
	if (globalUpHandler) { window.removeEventListener('pointerup', globalUpHandler); globalUpHandler = null; }
}

function endGame() {
	gameOver.value = true; gameStarted = false;
	removeGlobalHandlers();
	const key = isDebuffMode.value ? 'emojiShootHighScore_debuff' : 'emojiShootHighScore';
	const prev = parseInt(miLocalStorage.getItem(key) || '0', 10);
	if (score.value > prev) { miLocalStorage.setItem(key, String(score.value)); isNewRecord.value = true; }
	for (const p of activeEffects) clearInterval(p.timerId);
	activeEffects.splice(0);
	shieldActive = false; magnetActive = false; piercingActive = false;
	slowActive = false; giantActive = false; mirrorActive = false;
	if ($i) {
		misskeyApi('emoji-shoot/register', {
			score: score.value, wave: wave.value, kills: kills.value,
			mode: isDebuffMode.value ? 'debuff' : 'normal',
		}).catch(() => {});
	}
}

function initGame() {
	score.value = 0; wave.value = 1; kills.value = 0;
	lives.value = MAX_LIVES; gameOver.value = false; isNewRecord.value = false;
	playerX = CW / 2; pointerX = CW / 2; pointerDown = false;
	enemies = []; bullets = []; particles = []; items = [];
	lastShootTime = 0;
	shieldActive = false; magnetActive = false; piercingActive = false;
	slowActive = false; giantActive = false; mirrorActive = false;
	for (const p of activeEffects) clearInterval(p.timerId);
	activeEffects.splice(0);
	isDebuffMode.value = new URLSearchParams(window.location.search).get('mode') === 'debuff';
	buildPool();
	const wp = getWaveParams(1);
	waveEnemiesRemaining = wp.enemyCount; waveSpawnTimer = 0;
	if (canvasEl.value) { canvasEl.value.width = CW; canvasEl.value.height = CH; ctx = canvasEl.value.getContext('2d'); }
	gameStarted = true;
	if (rafId) cancelAnimationFrame(rafId);
	rafId = requestAnimationFrame(update);
}

function restart() { initGame(); }
function goBack() { mainRouter.push('/emoji-shoot'); }

onMounted(() => { initGame(); });
onUnmounted(() => {
	if (rafId) cancelAnimationFrame(rafId);
	removeGlobalHandlers();
	for (const p of activeEffects) clearInterval(p.timerId);
});
definePage(() => ({ title: 'カスタムエモジシュート', icon: 'ti ti-rocket' }));
</script>

<style lang="scss" module>
.root { max-width: 420px; margin: 0 auto; position: relative; }
.header { display: flex; justify-content: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
.scoreBox { background: var(--MI_THEME-panel); border-radius: 12px; padding: 5px 12px; text-align: center; border: 1.5px solid var(--MI_THEME-divider); min-width: 50px; }
.scoreLabel { font-size: .5rem; font-weight: 700; opacity: .5; letter-spacing: .1em; }
.scoreValue { font-size: 1rem; font-weight: 900; color: var(--MI_THEME-accent); font-variant-numeric: tabular-nums; }
.debuffBadge { border-color: #e74040; }
.powerBar { display: flex; justify-content: center; gap: 5px; margin-bottom: 5px; flex-wrap: wrap; }
.powerBadge { font-size: .7rem; font-weight: 700; padding: 2px 7px; border-radius: 12px; background: var(--MI_THEME-accentedBg); color: var(--MI_THEME-accent); }
.debuffPowerBadge { background: #fee2e2; color: #e74040; }
.canvasWrap { position: relative; width: 100%; aspect-ratio: 400 / 600; background: linear-gradient(180deg, #0a0a2e 0%, #1a1a4e 50%, #0d0d3a 100%); border-radius: 16px; border: 2px solid var(--MI_THEME-divider); overflow: hidden; cursor: crosshair; touch-action: none; }
.canvas { width: 100%; height: 100%; display: block; }
.overlay { position: absolute; inset: 0; z-index: 100; background: rgba(0,0,0,.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; border-radius: 16px; }
.overCard { background: var(--MI_THEME-panel); border-radius: 20px; padding: 28px 24px; text-align: center; box-shadow: 0 8px 48px rgba(0,0,0,.3); max-width: 280px; width: 90%; }
.overTitle { font-size: 1.5rem; font-weight: 900; color: #ff6b6b; margin-bottom: 10px; }
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
