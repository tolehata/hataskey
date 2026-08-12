<!--
SPDX-FileCopyrightText: tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div :class="$style.root" :style="rootVars">
		<div :class="[$style.ambient, $style.ambientA]"></div>
		<div :class="[$style.ambient, $style.ambientB]"></div>

		<main :class="$style.content">
			<header :class="$style.hero">
				<div :class="$style.heroIdentity">
					<div :class="$style.heroIcon"><i class="ti ti-id-badge-2"></i></div>
					<div>
						<h1>{{ copy.title }}</h1>
						<p>{{ copy.subtitle }}</p>
					</div>
				</div>
			</header>

			<section :class="$style.controls" :aria-label="copy.appearanceSettings">
				<div :class="$style.segmented">
					<button class="_button" :class="{ [$style.active]: cardStyle === 'standard' }" type="button" @click="cardStyle = 'standard'">
						<i class="ti ti-sparkles"></i>{{ copy.standardDesign }}
					</button>
					<button class="_button" :class="[$style.goldChoice, { [$style.active]: cardStyle === 'gold' }]" type="button" :disabled="!goldUnlocked" @click="selectGold">
						<i :class="goldUnlocked ? 'ti ti-crown' : 'ti ti-lock'"></i>{{ copy.goldDesign }}
					</button>
				</div>

				<div :class="$style.tweaks">
					<div :class="$style.colorField" role="group" :aria-label="copy.accentColor">
						<span>{{ copy.accentColor }}</span>
						<span :class="$style.swatches">
							<button
								v-for="color in accentChoices"
								:key="color"
								class="_button"
								:class="{ [$style.selectedSwatch]: accentColor === color }"
								type="button"
								:style="{ backgroundColor: color }"
								:aria-label="copyx.selectColor({ color })"
								@click="accentColor = color"
							></button>
						</span>
					</div>
					<label :class="$style.opacityField">
						<span>{{ copy.glassOpacity }}</span>
						<input v-model.number="glassOpacity" type="range" min="20" max="90" step="5">
						<output>{{ glassOpacity }}%</output>
					</label>
				</div>
			</section>

			<p v-if="!goldUnlocked" :class="$style.lockHint"><i class="ti ti-lock"></i>{{ copy.goldUnlockHint }}</p>

			<section :class="$style.stage" :aria-label="copy.cardPreview">
				<div
					ref="tiltEl"
					:class="$style.tilt"
					:style="tiltStyle"
					@pointerdown="startTilt"
					@pointermove="moveTilt"
					@pointerup="stopTilt"
					@pointercancel="stopTilt"
					@pointerleave="leaveTilt"
				>
					<article :class="[$style.card, { [$style.gold]: cardStyle === 'gold' }]" :style="cardSurfaceStyle">
						<img v-if="bannerSrc && !bannerFailed" :src="bannerSrc" :class="$style.cardBanner" alt="" @error="bannerFailed = true">
						<div :class="$style.brushed"></div>
						<div :class="$style.shine" :style="shineStyle"></div>
						<div :class="$style.cardLogo">{{ copy.passLabel }}</div>

						<div :class="$style.cardInner">
							<div :class="$style.avatarFrame">
								<img v-if="!avatarFailed" :src="avatarSrc" :class="$style.avatar" alt="" @error="avatarFailed = true">
								<span v-else :class="$style.avatarFallback">{{ avatarFallback }}</span>
								<img
									v-for="decoration in avatarDecorations"
									:key="decoration.id"
									:src="getDecorationSrc(decoration.url)"
									:class="$style.avatarDecoration"
									:style="getDecorationStyle(decoration)"
									alt=""
								>
							</div>
							<div :class="$style.cardInfo">
								<strong>{{ profileName }}</strong>
								<span>{{ profileHandle }}</span>
								<small>{{ joinedDateLabel }}</small>
								<em>{{ memberLabel }}</em>
							</div>
						</div>

						<div :class="$style.qrBox">
							<img v-if="profileCode" :src="profileCode" :alt="copy.profileQrCode">
							<i v-else :class="['ti', 'ti-loader-2', $style.qrLoader]"></i>
						</div>
						<div :class="$style.dots"><i></i><i></i><i></i></div>
					</article>
				</div>
			</section>

			<div :class="$style.tiltControls">
				<p :class="$style.tiltHint"><i class="ti ti-hand-move"></i>{{ copy.tiltHint }}</p>
				<button v-if="deviceTiltSupported" class="_button" :class="[$style.deviceTiltButton, { [$style.active]: deviceTiltEnabled }]" type="button" @click="toggleDeviceTilt">
					<i :class="deviceTiltEnabled ? 'ti ti-device-mobile-check' : 'ti ti-device-mobile-rotated'"></i>
					{{ deviceTiltEnabled ? copy.disableDeviceTilt : copy.enableDeviceTilt }}
				</button>
			</div>

			<div :class="$style.actions">
				<button class="_button" :class="$style.saveButton" type="button" :disabled="saving || !profileCode" @click="saveCard">
					<i :class="saving ? 'ti ti-loader-2' : 'ti ti-download'"></i>
					{{ saving ? copy.saving : copy.saveImage }}
				</button>
			</div>

			<div :class="$style.privacyNote">
				<i class="ti ti-lock"></i>
				<div><strong>{{ copy.privacyTitle }}</strong><span>{{ copy.privacyDescription }}</span></div>
			</div>
		</main>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import QRCodeStyling from 'qr-code-styling';
import tinycolor from 'tinycolor2';
import { host, url } from '@@/js/config.js';
import type { HataCardStyle } from '@/utility/hata-card-maker.js';
import { definePage } from '@/page.js';
import { ensureSignin } from '@/i.js';
import { instance } from '@/instance.js';
import { userName, userPage } from '@/filters/user.js';
import { i18n } from '@/i18n.js';
import { versatileLang } from '@/utility/intl-const.js';
import { getProxiedImageUrl, getStaticImageUrl } from '@/utility/media-proxy.js';
import { calculateHataCardDeviceTilt, isHataCardGoldUnlocked, makeHataCardFileName, normalizeHataCardGlassOpacity } from '@/utility/hata-card-maker.js';
import * as os from '@/os.js';

const $i = ensureSignin();
const copy = i18n.ts._hata._hatask._cardMaker;
const copyx = i18n.tsx._hata._hatask._cardMaker;

definePage(() => ({ title: copy.title, icon: 'ti ti-id-badge-2' }));

const cardStyle = ref<HataCardStyle>('standard');
const accentColor = ref('#4f8ff7');
const glassOpacity = ref(55);
const saving = ref(false);
const avatarFailed = ref(false);
const bannerFailed = ref(false);
const profileCode = ref<string | null>(null);
const tiltX = ref(0);
const tiltY = ref(0);
const shineX = ref(50);
const shineY = ref(50);
const dragging = ref(false);
const deviceTiltSupported = ref(false);
const deviceTiltEnabled = ref(false);
const tiltEl = useTemplateRef('tiltEl');

type DeviceOrientationEventConstructorWithPermission = typeof DeviceOrientationEvent & {
	requestPermission?: () => Promise<'granted' | 'denied'>;
};

let deviceTiltBaseline: { beta: number; gamma: number; angle: number } | null = null;

const profileName = computed(() => userName($i));
const profileHandle = computed(() => `@${$i.username}@${host}`);
const profileUrl = computed(() => userPage($i, undefined, true));
const goldUnlocked = computed(() => isHataCardGoldUnlocked($i.createdAt));
const avatarFallback = computed(() => profileName.value.trim().slice(0, 1).toUpperCase() || '?');
const avatarSrc = computed(() => getProxiedImageUrl($i.avatarUrl, 'avatar', true));
const bannerSrc = computed(() => $i.bannerUrl ? getProxiedImageUrl($i.bannerUrl, 'preview', true) : null);
const avatarDecorations = computed(() => $i.avatarDecorations);
const memberLabel = computed(() => copyx.memberLabel({ server: instance.name ?? host }));
const joinedDateLabel = computed(() => {
	const date = new Date($i.createdAt);
	if (!Number.isFinite(date.getTime())) return '';
	const formatted = new Intl.DateTimeFormat(versatileLang, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
	return copyx.registeredOn({ date: formatted });
});
const accentChoices = computed(() => {
	const values = [accentColor.value, '#4f8ff7', '#6abf8b', '#9b7bf0', '#e76f9a'];
	return [...new Set(values.map(color => tinycolor(color).toHexString()))];
});

const rootVars = computed(() => ({
	'--maker-accent': accentColor.value,
}));

const cardSurfaceStyle = computed(() => {
	const opacity = normalizeHataCardGlassOpacity(glassOpacity.value);
	if (cardStyle.value === 'gold') {
		return {
			background: `linear-gradient(155deg, ${tinycolor.mix('#16151a', '#d4af37', Math.min(opacity, 60)).toHexString()} 0%, #101014 55%, ${tinycolor.mix('#16151a', '#d4af37', Math.min(opacity * 0.6, 35)).toHexString()} 100%)`,
		};
	}
	return {
		background: `linear-gradient(155deg, ${tinycolor.mix('#ffffff', accentColor.value, opacity * 0.32).toHexString()} 0%, rgba(255,255,255,${opacity / 100}) 55%, ${tinycolor.mix('#ffffff', accentColor.value, opacity * 0.18).toHexString()} 100%)`,
	};
});

const tiltStyle = computed(() => ({
	transform: `rotateX(${tiltX.value}deg) rotateY(${tiltY.value}deg)`,
	transition: dragging.value ? 'none' : deviceTiltEnabled.value ? 'transform .12s ease-out' : 'transform .55s cubic-bezier(.2,.8,.2,1)',
}));

const shineStyle = computed(() => ({
	background: `radial-gradient(circle at ${shineX.value}% ${shineY.value}%, rgba(255,255,255,${cardStyle.value === 'gold' ? 0.16 : 0.58}) 0%, transparent 55%)`,
}));

function selectGold() {
	if (goldUnlocked.value) cardStyle.value = 'gold';
}

function updateTilt(clientX: number, clientY: number) {
	const rect = tiltEl.value?.getBoundingClientRect();
	if (rect == null) return;
	const dx = Math.max(-1, Math.min(1, (clientX - rect.left - rect.width / 2) / (rect.width / 2)));
	const dy = Math.max(-1, Math.min(1, (clientY - rect.top - rect.height / 2) / (rect.height / 2)));
	tiltX.value = -dy * 10;
	tiltY.value = dx * 10;
	shineX.value = 50 + dx * 35;
	shineY.value = 50 + dy * 35;
}

function startTilt(event: PointerEvent) {
	dragging.value = true;
	(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	updateTilt(event.clientX, event.clientY);
}

function moveTilt(event: PointerEvent) {
	if (event.pointerType !== 'mouse' && !dragging.value) return;
	updateTilt(event.clientX, event.clientY);
}

function resetTilt() {
	dragging.value = false;
	tiltX.value = 0;
	tiltY.value = 0;
	shineX.value = 50;
	shineY.value = 50;
}

function stopTilt(event: PointerEvent) {
	const target = event.currentTarget as HTMLElement;
	if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
	resetTilt();
}

function leaveTilt(event: PointerEvent) {
	if (event.pointerType === 'mouse' && !dragging.value) resetTilt();
}

function screenAngle(): number {
	const legacyOrientation = typeof window.orientation === 'number' ? window.orientation : 0;
	const screenOrientation = (window.screen as unknown as { orientation?: { angle?: number } }).orientation;
	const angle = screenOrientation?.angle ?? legacyOrientation;
	return ((angle % 360) + 360) % 360;
}

function onDeviceOrientation(event: DeviceOrientationEvent) {
	if (!deviceTiltEnabled.value || dragging.value || event.beta == null || event.gamma == null) return;
	const angle = screenAngle();
	if (deviceTiltBaseline == null || deviceTiltBaseline.angle !== angle) {
		deviceTiltBaseline = { beta: event.beta, gamma: event.gamma, angle };
		return;
	}

	const target = calculateHataCardDeviceTilt(event.beta - deviceTiltBaseline.beta, event.gamma - deviceTiltBaseline.gamma, angle);
	tiltX.value += (target.x - tiltX.value) * 0.24;
	tiltY.value += (target.y - tiltY.value) * 0.24;
	shineX.value = 50 + tiltY.value * 3.5;
	shineY.value = 50 - tiltX.value * 3.5;
}

function stopDeviceTilt() {
	window.removeEventListener('deviceorientation', onDeviceOrientation);
	deviceTiltEnabled.value = false;
	deviceTiltBaseline = null;
	resetTilt();
}

async function toggleDeviceTilt() {
	if (deviceTiltEnabled.value) {
		stopDeviceTilt();
		return;
	}

	try {
		const orientationEvent = window.DeviceOrientationEvent as DeviceOrientationEventConstructorWithPermission | undefined;
		if (orientationEvent?.requestPermission != null) {
			const permission = await orientationEvent.requestPermission();
			if (permission !== 'granted') {
				os.toast(copy.deviceTiltPermissionDenied);
				return;
			}
		}
		deviceTiltBaseline = null;
		deviceTiltEnabled.value = true;
		window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true });
	} catch (error) {
		console.error(error);
		os.toast(copy.deviceTiltPermissionDenied);
	}
}

function getDecorationSrc(decorationUrl: string) {
	return getProxiedImageUrl(decorationUrl, 'preview', true);
}

function getDecorationStyle(decoration: (typeof $i.avatarDecorations)[number]) {
	const scaleX = decoration.flipH ? -1 : 1;
	return {
		rotate: decoration.angle ? `${decoration.angle * 360}deg` : undefined,
		scale: scaleX === 1 ? undefined : `${scaleX} 1`,
		translate: decoration.offsetX || decoration.offsetY ? `${(decoration.offsetX ?? 0) * 100}% ${(decoration.offsetY ?? 0) * 100}%` : undefined,
		transform: decoration.scale && decoration.scale !== 1 ? `scale(${decoration.scale})` : undefined,
		opacity: decoration.opacity ?? 1,
	};
}

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('invalid image result'));
		reader.onerror = () => reject(reader.error ?? new Error('image read failed'));
		reader.readAsDataURL(blob);
	});
}

async function generateProfileCode(): Promise<string> {
	// 「もっと！ → 二次元コード」と同じ配色・サーバーアイコン・形状を使う。
	// カード側だけ独自装飾へ分岐させず、既存UIの見慣れた意匠を正本にする。
	const themeColor = tinycolor(instance.themeColor ?? 'rgb(255, 188, 220)').toHsl();
	const dark = tinycolor(`hsl(${themeColor.h}, 100, 18)`).toRgbString();
	const code = new QRCodeStyling({
		width: 600,
		height: 600,
		margin: 42,
		type: 'canvas',
		data: profileUrl.value,
		image: instance.iconUrl ? getStaticImageUrl(instance.iconUrl) : '/favicon.ico',
		qrOptions: {
			typeNumber: 0,
			mode: 'Byte',
			errorCorrectionLevel: 'H',
		},
		imageOptions: {
			hideBackgroundDots: true,
			imageSize: 0.3,
			margin: 16,
			crossOrigin: 'anonymous',
		},
		dotsOptions: { type: 'dots', color: dark },
		cornersDotOptions: { type: 'dot', color: dark },
		cornersSquareOptions: { type: 'extra-rounded', color: dark },
		backgroundOptions: { color: '#ffffff' },
	});
	const blob = await code.getRawData('png') as Blob | null;
	if (blob == null) throw new Error('two-dimensional code generation failed');
	return blobToDataUrl(blob);
}

async function generateProfileCodeImage() {
	try {
		profileCode.value = await generateProfileCode();
	} catch (error) {
		console.error(error);
		os.alert({ type: 'error', title: copy.qrFailedTitle, text: copy.qrFailed });
	}
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
	const r = Math.min(radius, width / 2, height / 2);
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + width, y, x + width, y + height, r);
	ctx.arcTo(x + width, y + height, x, y + height, r);
	ctx.arcTo(x, y + height, x, y, r);
	ctx.arcTo(x, y, x + width, y, r);
	ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.crossOrigin = 'anonymous';
		image.decoding = 'async';
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error(`image load failed: ${new URL(src, url).origin}`));
		image.src = src;
	});
}

function drawCover(ctx: CanvasRenderingContext2D, image: CanvasImageSource & { width: number; height: number }, x: number, y: number, width: number, height: number) {
	const scale = Math.max(width / image.width, height / image.height);
	const sourceWidth = width / scale;
	const sourceHeight = height / scale;
	ctx.drawImage(image, (image.width - sourceWidth) / 2, (image.height - sourceHeight) / 2, sourceWidth, sourceHeight, x, y, width, height);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
	if (ctx.measureText(text).width <= maxWidth) return text;
	let result = text;
	while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) result = result.slice(0, -1);
	return `${result}…`;
}

async function drawAvatarDecorations(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, avatarSize: number) {
	for (const decoration of avatarDecorations.value) {
		try {
			const image = await loadImage(getDecorationSrc(decoration.url));
			const scale = decoration.scale ?? 1;
			const drawSize = avatarSize * 2 * scale;
			ctx.save();
			ctx.globalAlpha = decoration.opacity ?? 1;
			ctx.translate(centerX + (decoration.offsetX ?? 0) * avatarSize, centerY + (decoration.offsetY ?? 0) * avatarSize);
			ctx.rotate((decoration.angle ?? 0) * Math.PI * 2);
			ctx.scale(decoration.flipH ? -1 : 1, 1);
			ctx.drawImage(image, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
			ctx.restore();
		} catch {
			// 装飾だけ取得できない場合も、カード本体の保存は継続する。
		}
	}
}

async function renderCardCanvas(): Promise<HTMLCanvasElement> {
	const width = 1080;
	const height = 664;
	const radius = 48;
	const canvas = window.document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (ctx == null) throw new Error('canvas context unavailable');
	const isGold = cardStyle.value === 'gold';
	const opacity = normalizeHataCardGlassOpacity(glassOpacity.value);

	roundedRectPath(ctx, 0, 0, width, height, radius);
	ctx.clip();
	const background = ctx.createLinearGradient(0, 0, width, height);
	if (isGold) {
		background.addColorStop(0, tinycolor.mix('#16151a', '#d4af37', Math.min(opacity, 60)).toHexString());
		background.addColorStop(0.55, '#101014');
		background.addColorStop(1, tinycolor.mix('#16151a', '#d4af37', Math.min(opacity * 0.6, 35)).toHexString());
	} else {
		background.addColorStop(0, tinycolor.mix('#ffffff', accentColor.value, opacity * 0.32).toHexString());
		background.addColorStop(0.55, tinycolor.mix('#ffffff', accentColor.value, (100 - opacity) * 0.08).toHexString());
		background.addColorStop(1, tinycolor.mix('#ffffff', accentColor.value, opacity * 0.18).toHexString());
	}
	ctx.fillStyle = background;
	ctx.fillRect(0, 0, width, height);

	if (bannerSrc.value != null && !bannerFailed.value) {
		try {
			const banner = await loadImage(bannerSrc.value);
			ctx.save();
			ctx.globalAlpha = isGold ? 0.08 : 0.13;
			ctx.filter = `blur(6px) grayscale(${isGold ? 0.6 : 0.25})${isGold ? ' brightness(.7)' : ''}`;
			drawCover(ctx, banner, -12, -12, width + 24, height + 24);
			ctx.restore();
		} catch {
			// バナーが取得できなくても、残りのプロフィール情報で保存する。
		}
	}

	ctx.save();
	ctx.globalAlpha = isGold ? 0.05 : 0.12;
	for (let y = 0; y < height; y += 4) {
		ctx.fillStyle = y % 8 === 0 ? (isGold ? '#d4af37' : '#ffffff') : (isGold ? '#ffffff' : '#758195');
		ctx.fillRect(0, y, width, 1);
	}
	ctx.restore();

	const shine = ctx.createRadialGradient(width * shineX.value / 100, height * shineY.value / 100, 0, width * shineX.value / 100, height * shineY.value / 100, width * 0.56);
	shine.addColorStop(0, isGold ? 'rgba(231,199,102,.20)' : 'rgba(255,255,255,.62)');
	shine.addColorStop(1, 'rgba(255,255,255,0)');
	ctx.fillStyle = shine;
	ctx.fillRect(0, 0, width, height);

	const avatarSize = 184;
	const avatarX = 66;
	const avatarY = (height - avatarSize) / 2;
	try {
		const avatar = await loadImage(avatarSrc.value);
		ctx.save();
		ctx.beginPath();
		ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
		ctx.clip();
		drawCover(ctx, avatar, avatarX, avatarY, avatarSize, avatarSize);
		ctx.restore();
	} catch {
		ctx.fillStyle = isGold ? '#29251e' : tinycolor(accentColor.value).lighten(30).toHexString();
		ctx.beginPath();
		ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = isGold ? '#e7c766' : '#ffffff';
		ctx.font = '800 72px system-ui, sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(avatarFallback.value, avatarX + avatarSize / 2, avatarY + avatarSize / 2);
	}
	ctx.strokeStyle = isGold ? 'rgba(231,199,102,.62)' : 'rgba(255,255,255,.88)';
	ctx.lineWidth = 6;
	ctx.beginPath();
	ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2);
	ctx.stroke();
	await drawAvatarDecorations(ctx, avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize);

	const textX = avatarX + avatarSize + 44;
	ctx.textAlign = 'left';
	ctx.textBaseline = 'alphabetic';
	ctx.fillStyle = isGold ? '#f5ecd2' : '#1c2434';
	ctx.font = '800 42px system-ui, sans-serif';
	ctx.fillText(fitText(ctx, profileName.value, 560), textX, height / 2 - 52);
	ctx.fillStyle = isGold ? 'rgba(231,199,102,.78)' : 'rgba(35,43,58,.68)';
	ctx.font = '24px ui-monospace, SFMono-Regular, Menlo, monospace';
	ctx.fillText(fitText(ctx, profileHandle.value, 560), textX, height / 2 - 6);
	ctx.font = '20px ui-monospace, SFMono-Regular, Menlo, monospace';
	ctx.fillText(joinedDateLabel.value, textX, height / 2 + 36);

	ctx.font = '800 19px system-ui, sans-serif';
	const badgeText = memberLabel.value;
	const badgeWidth = Math.min(400, ctx.measureText(badgeText).width + 54);
	roundedRectPath(ctx, textX, height / 2 + 66, badgeWidth, 52, 26);
	ctx.fillStyle = isGold ? 'rgba(231,199,102,.20)' : tinycolor(accentColor.value).setAlpha(0.15).toRgbString();
	ctx.fill();
	ctx.strokeStyle = isGold ? 'rgba(231,199,102,.46)' : tinycolor(accentColor.value).setAlpha(0.34).toRgbString();
	ctx.lineWidth = 2;
	ctx.stroke();
	ctx.fillStyle = isGold ? '#e7c766' : accentColor.value;
	ctx.fillText(fitText(ctx, badgeText, badgeWidth - 42), textX + 25, height / 2 + 100);

	ctx.textAlign = 'right';
	ctx.fillStyle = isGold ? 'rgba(231,199,102,.66)' : 'rgba(35,43,58,.43)';
	ctx.font = '800 28px system-ui, sans-serif';
	ctx.fillText(copy.passLabel, width - 44, 62);

	if (profileCode.value != null) {
		const qr = await loadImage(profileCode.value);
		const qrSize = 150;
		const qrX = width - qrSize - 38;
		const qrY = height - qrSize - 34;
		ctx.save();
		roundedRectPath(ctx, qrX, qrY, qrSize, qrSize, 18);
		ctx.clip();
		ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
		ctx.restore();
	}

	ctx.strokeStyle = isGold ? 'rgba(231,199,102,.46)' : 'rgba(255,255,255,.72)';
	ctx.lineWidth = 2;
	roundedRectPath(ctx, 1, 1, width - 2, height - 2, radius - 1);
	ctx.stroke();
	return canvas;
}

async function saveCard() {
	if (saving.value || profileCode.value == null) return;
	saving.value = true;
	resetTilt();
	await nextTick();
	try {
		await window.document.fonts.ready;
		const canvas = await renderCardCanvas();
		const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
		if (blob == null) throw new Error('PNG encode failed');
		const objectUrl = URL.createObjectURL(blob);
		const anchor = window.document.createElement('a');
		anchor.href = objectUrl;
		anchor.download = makeHataCardFileName($i.username, cardStyle.value);
		anchor.rel = 'noopener';
		anchor.click();
		window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
		os.toast(copy.saved);
	} catch (error) {
		console.error(error);
		os.alert({ type: 'error', title: copy.saveFailedTitle, text: copy.saveFailed });
	} finally {
		saving.value = false;
	}
}

onMounted(() => {
	const themeAccent = tinycolor(window.getComputedStyle(window.document.documentElement).getPropertyValue('--MI_THEME-accent').trim());
	if (themeAccent.isValid()) accentColor.value = themeAccent.toHexString();
	glassOpacity.value = normalizeHataCardGlassOpacity(glassOpacity.value);
	deviceTiltSupported.value = 'DeviceOrientationEvent' in window && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
	generateProfileCodeImage();
});

onUnmounted(() => {
	window.removeEventListener('deviceorientation', onDeviceOrientation);
});
</script>

<style lang="scss" module>
.root {
	position: relative;
	min-height: 100dvh;
	overflow: hidden;
	container-type: inline-size;
	/* この画面には文字入力欄が無い。Chromeがボタン操作位置へ残す
	   テキストキャレットを描画させず、フォーカスリングは維持する。 */
	caret-color: transparent;
	color: var(--MI_THEME-fg);
	background:
		radial-gradient(circle at 14% -8%, color-mix(in srgb, var(--maker-accent) 17%, transparent), transparent 43%),
		radial-gradient(circle at 92% 106%, color-mix(in srgb, var(--maker-accent) 12%, transparent), transparent 46%),
		var(--MI_THEME-bg);
}

.ambient {
	position: absolute;
	width: 300px;
	height: 300px;
	border-radius: 50%;
	background: color-mix(in srgb, var(--maker-accent) 18%, transparent);
	filter: blur(72px);
	pointer-events: none;
}

.ambientA { top: -120px; left: -100px; animation: floatA 12s ease-in-out infinite; }
.ambientB { right: -120px; bottom: -130px; animation: floatB 14s ease-in-out infinite; }

.content {
	position: relative;
	z-index: 1;
	display: flex;
	width: min(100% - 32px, 780px);
	margin: 0 auto;
	box-sizing: border-box;
	flex-direction: column;
	align-items: center;
	gap: 22px;
	padding: 38px 0 80px;
}

.hero {
	display: flex;
	width: 100%;
	align-items: center;
	justify-content: flex-start;
	gap: 18px;
}

.heroIdentity { display: flex; min-width: 0; align-items: center; gap: 14px; }
.heroIcon { display: grid; width: 50px; height: 50px; flex: 0 0 50px; place-items: center; border-radius: 16px; color: var(--maker-accent); background: color-mix(in srgb, var(--maker-accent) 16%, var(--MI_THEME-panel)); font-size: 24px; }
.hero h1 { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: .02em; }
.hero p { margin: 3px 0 0; opacity: .66; font-size: 13px; line-height: 1.55; }

.controls {
	display: flex;
	width: 100%;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 12px;
	box-sizing: border-box;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 18px;
	background: color-mix(in srgb, var(--MI_THEME-panel) 88%, transparent);
	user-select: none;
}

.segmented { display: inline-flex; flex: 0 0 auto; gap: 4px; padding: 4px; border: 1px solid var(--MI_THEME-divider); border-radius: 999px; background: var(--MI_THEME-bg); }
.segmented button { display: inline-flex; align-items: center; gap: 7px; padding: 9px 17px; border-radius: 999px; color: var(--MI_THEME-fg); font-size: 13px; font-weight: 700; opacity: .68; }
.segmented button.active { color: var(--MI_THEME-fgOnAccent); background: var(--maker-accent); opacity: 1; }
.segmented button.goldChoice.active { color: #241c05; background: linear-gradient(120deg, #caa646, #e7c766); }
.segmented button:disabled { cursor: not-allowed; opacity: .36; }

.tweaks { display: flex; min-width: 0; align-items: center; justify-content: flex-end; gap: 18px; }
.colorField, .opacityField { display: flex; align-items: center; gap: 9px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.swatches { display: flex; gap: 5px; }
.swatches button { width: 22px; height: 22px; border: 2px solid color-mix(in srgb, var(--MI_THEME-fg) 14%, transparent); border-radius: 50%; box-shadow: inset 0 0 0 2px var(--MI_THEME-panel); }
.swatches button.selectedSwatch { border-color: var(--MI_THEME-fg); transform: scale(1.08); }
.opacityField input { width: 92px; accent-color: var(--maker-accent); }
.opacityField output { min-width: 33px; font-variant-numeric: tabular-nums; text-align: right; }
.lockHint { display: inline-flex; align-items: center; gap: 6px; margin: -10px 0 0; opacity: .58; font-size: 12px; }

.stage { display: grid; width: 100%; min-height: 390px; place-items: center; perspective: 1400px; }
.tilt { width: min(560px, 92cqw); aspect-ratio: 1 / .615; cursor: grab; transform-style: preserve-3d; touch-action: pan-y; user-select: none; }
.tilt:active { cursor: grabbing; }
.card { position: relative; width: 100%; height: 100%; overflow: hidden; border: 1px solid rgba(255,255,255,.68); border-radius: 26px; box-shadow: 0 30px 60px -24px color-mix(in srgb, var(--maker-accent) 42%, transparent), inset 0 1px 0 rgba(255,255,255,.7); color: #1c2434; }
.card.gold { border-color: rgba(231,199,102,.44); box-shadow: 0 30px 60px -22px rgba(0,0,0,.62), inset 0 1px 0 rgba(255,255,255,.08); color: #f5ecd2; }
.cardBanner { position: absolute; inset: -10px; width: calc(100% + 20px); height: calc(100% + 20px); object-fit: cover; opacity: .13; filter: blur(4px) grayscale(.25); }
.gold .cardBanner { opacity: .08; filter: blur(4px) grayscale(.6) brightness(.7); }
.brushed { position: absolute; inset: 0; background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,.08) 3px 4px); pointer-events: none; }
.gold .brushed { background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(231,199,102,.035) 3px 4px); }
.shine { position: absolute; z-index: 1; inset: 0; pointer-events: none; }
.cardLogo { position: absolute; z-index: 3; top: 18px; right: 22px; color: rgba(35,43,58,.42); font-size: 15px; font-weight: 800; letter-spacing: .13em; }
.gold .cardLogo { color: rgba(231,199,102,.62); }
.cardInner { position: relative; z-index: 2; display: flex; height: 100%; align-items: center; gap: 22px; padding: 26px 30px; box-sizing: border-box; }
.avatarFrame { position: relative; width: 92px; height: 92px; flex: 0 0 92px; border: 3px solid rgba(255,255,255,.82); border-radius: 50%; box-shadow: 0 8px 18px rgba(0,0,0,.18); }
.gold .avatarFrame { border-color: rgba(231,199,102,.58); }
.avatar, .avatarFallback { position: absolute; z-index: 0; inset: 0; width: 100%; height: 100%; overflow: hidden; border-radius: 50%; object-fit: cover; }
.avatarFallback { display: grid; place-items: center; color: #fff; background: var(--maker-accent); font-size: 34px; font-weight: 800; }
.avatarDecoration { position: absolute; z-index: 1; top: -50%; left: -50%; width: 200%; pointer-events: none; }
.cardInfo { min-width: 0; flex: 1; padding-right: 58px; }
.cardInfo strong, .cardInfo span, .cardInfo small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cardInfo strong { font-size: 22px; font-weight: 800; }
.cardInfo span { margin-top: 5px; color: rgba(35,43,58,.66); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
.cardInfo small { margin-top: 8px; color: rgba(35,43,58,.58); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10.5px; }
.gold .cardInfo span, .gold .cardInfo small { color: rgba(231,199,102,.76); }
.cardInfo em { display: inline-block; max-width: min(100%, 250px); overflow: hidden; margin-top: 12px; padding: 5px 14px; border: 1px solid color-mix(in srgb, var(--maker-accent) 32%, transparent); border-radius: 999px; color: var(--maker-accent); background: color-mix(in srgb, var(--maker-accent) 16%, white); font-size: 10.5px; font-style: normal; font-weight: 800; letter-spacing: .08em; text-overflow: ellipsis; white-space: nowrap; }
.gold .cardInfo em { border-color: rgba(231,199,102,.42); color: #e7c766; background: rgba(231,199,102,.18); }
.qrBox { position: absolute; z-index: 3; right: 18px; bottom: 16px; display: grid; width: 78px; height: 78px; overflow: clip; place-items: center; border-radius: 12px; background: #fff; box-shadow: 0 8px 20px rgba(0,0,0,.16); }
.qrBox img { width: 100%; height: 100%; }
.qrLoader { color: var(--maker-accent); animation: spin 1s linear infinite; }
.dots { position: absolute; z-index: 2; right: 108px; bottom: 26px; display: flex; gap: 5px; }
.dots i { width: 5px; height: 5px; border-radius: 50%; background: #78808c; }
.gold .dots i { background: #d4af37; box-shadow: 0 0 6px rgba(212,175,55,.3); }

.tiltControls { display: flex; align-items: center; justify-content: center; gap: 10px; margin: -13px 0 0; }
.tiltHint { display: inline-flex; align-items: center; gap: 7px; margin: 0; opacity: .55; font-size: 12.5px; }
.deviceTiltButton { display: inline-flex; align-items: center; gap: 6px; padding: 7px 11px; border: 1px solid var(--MI_THEME-divider); border-radius: 999px; color: var(--MI_THEME-fg); background: color-mix(in srgb, var(--MI_THEME-panel) 88%, transparent); font-size: 11.5px; font-weight: 700; }
.deviceTiltButton.active { border-color: color-mix(in srgb, var(--maker-accent) 55%, transparent); color: var(--maker-accent); background: color-mix(in srgb, var(--maker-accent) 13%, var(--MI_THEME-panel)); }
.actions { display: flex; justify-content: center; }
.saveButton { display: inline-flex; align-items: center; gap: 9px; padding: 13px 30px; border-radius: 999px; color: var(--MI_THEME-fgOnAccent); background: linear-gradient(100deg, var(--maker-accent), color-mix(in srgb, var(--maker-accent) 62%, #7a4de0)); box-shadow: 0 14px 30px -12px color-mix(in srgb, var(--maker-accent) 62%, transparent); font-size: 14px; font-weight: 800; }
.saveButton:disabled { cursor: wait; opacity: .56; }
.saveButton i.ti-loader-2 { animation: spin 1s linear infinite; }
.privacyNote { display: flex; width: min(100%, 600px); align-items: flex-start; gap: 10px; padding: 13px 16px; box-sizing: border-box; border: 1px solid var(--MI_THEME-divider); border-radius: 14px; background: color-mix(in srgb, var(--MI_THEME-panel) 82%, transparent); }
.privacyNote > i { margin-top: 2px; color: var(--maker-accent); }
.privacyNote strong, .privacyNote span { display: block; }
.privacyNote strong { font-size: 12px; }
.privacyNote span { margin-top: 2px; opacity: .62; font-size: 11px; line-height: 1.55; }

@keyframes floatA { 50% { transform: translate(12px, -16px); } }
@keyframes floatB { 50% { transform: translate(-15px, 12px); } }
@keyframes spin { to { transform: rotate(360deg); } }

@container (max-width: 650px) {
	.content { width: min(100% - 20px, 780px); padding-top: 24px; }
	.hero { align-items: center; }
	.heroIcon { width: 42px; height: 42px; flex-basis: 42px; border-radius: 13px; font-size: 21px; }
	.hero h1 { font-size: 18px; }
	.hero p { font-size: 12px; }
	.controls { flex-direction: column; align-items: stretch; }
	.segmented { align-self: center; }
	.tweaks { justify-content: space-between; }
	.stage { min-height: 63cqw; }
	.cardInner { gap: 14px; padding: 18px; }
	.avatarFrame { width: 70px; height: 70px; flex-basis: 70px; }
	.cardInfo { padding-right: 38px; }
	.cardInfo strong { font-size: 17px; }
	.cardInfo span { margin-top: 3px; font-size: 10px; }
	.cardInfo small { margin-top: 5px; font-size: 8px; }
	.cardInfo em { margin-top: 8px; padding: 4px 10px; font-size: 8px; }
	.cardLogo { top: 13px; right: 14px; font-size: 11px; }
	.qrBox { right: 12px; bottom: 11px; width: 58px; height: 58px; border-radius: 9px; }
	.dots { right: 78px; bottom: 18px; }
}

@container (max-width: 430px) {
	.tweaks { flex-direction: column; align-items: stretch; }
	.colorField, .opacityField { justify-content: space-between; }
	.segmented { width: 100%; box-sizing: border-box; }
	.segmented button { flex: 1; justify-content: center; padding-inline: 10px; }
	.cardInner { gap: 10px; padding: 13px; }
	.avatarFrame { width: 56px; height: 56px; flex-basis: 56px; border-width: 2px; }
	.cardInfo { padding-right: 29px; }
	.cardInfo strong { font-size: 14px; }
	.cardInfo span { font-size: 8px; }
	.cardInfo small { font-size: 7px; }
	.cardInfo em { max-width: 132px; margin-top: 5px; padding: 3px 7px; font-size: 6.5px; }
	.cardLogo { top: 9px; right: 10px; font-size: 8px; }
	.qrBox { right: 7px; bottom: 7px; width: 45px; height: 45px; border-radius: 7px; }
	.dots { right: 58px; bottom: 13px; gap: 3px; }
	.dots i { width: 3px; height: 3px; }
	.tiltControls { flex-direction: column; gap: 7px; }
}

@media (prefers-reduced-motion: reduce) {
	.ambient, .qrLoader, .saveButton i { animation: none !important; }
	.tilt { transition: none !important; transform: none !important; }
}
</style>
