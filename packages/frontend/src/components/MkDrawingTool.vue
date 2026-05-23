<!--
SPDX-FileCopyrightText: syuilo and misskey-project & Hata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModal ref="modal" :preferType="'dialog'" @click="onModalClick" @closed="emit('closed')">
	<div :class="[$style.root, { [$style.dark]: darkMode }]" @click.stop>
		<!-- チュートリアル -->
		<div v-if="showTutorial" :class="$style.overlay" @click.stop>
			<div :class="$style.modalBox">
				<div :class="$style.modalHeader"><i class="ti ti-brush"></i><h2>お絵描きツール</h2></div>
				<div :class="$style.modalBody">
					<div :class="$style.warningBanner"><i class="ti ti-alert-triangle"></i><span>ページを離れると作業内容は失われます</span></div>
					<div :class="$style.tutorialGrid">
						<div><i class="ti ti-layers-intersect"></i><strong>レイヤー</strong><p>複数レイヤーで編集</p></div>
						<div><i class="ti ti-wand"></i><strong>フィルター</strong><p>12種類のエフェクト</p></div>
						<div><i class="ti ti-device-desktop"></i><strong>PC操作</strong><p>ホイール:拡大縮小<br>ハンドツール:移動<br>ミニマップ:位置移動</p></div>
						<div><i class="ti ti-device-mobile"></i><strong>スマホ操作</strong><p>2本指:拡大縮小<br>3本指:位置移動</p></div>
					</div>
				</div>
				<button :class="$style.primaryBtn" @click="showTutorial = false">始める</button>
			</div>
		</div>
		<!-- クレジット -->
		<div v-if="showCredits" :class="$style.overlay" @click.stop>
			<div :class="$style.modalBox">
				<div :class="$style.modalHeader"><i class="ti ti-info-circle"></i><h2>クレジット</h2></div>
				<div :class="$style.creditsBody">
					<div :class="$style.creditItem"><span>開発</span><strong>Tolehata</strong></div>
					<div :class="$style.creditItem"><span>デバッグ/協力</span><strong>くりきんとん</strong></div>
				</div>
				<div :class="$style.version">Version 2.4</div>
				<button :class="$style.primaryBtn" @click="showCredits = false">閉じる</button>
			</div>
		</div>
		<!-- 変形ダイアログ -->
		<div v-if="transformMode" :class="$style.overlay" @click.stop>
			<div :class="$style.modalBox">
				<div :class="$style.modalHeader"><i class="ti ti-transform"></i><h2>画像配置</h2></div>
				<div :class="$style.transformBody">
					<div :class="$style.transformPreview"><canvas ref="transformCanvas" width="240" height="180"></canvas></div>
					<div :class="$style.transformSliders">
						<label><span>拡大率</span><input type="range" v-model.number="transform.scale" min="10" max="200" @input="drawTransformPreview"><em>{{ transform.scale }}%</em></label>
						<label><span>回転</span><input type="range" v-model.number="transform.rotation" min="-180" max="180" @input="drawTransformPreview"><em>{{ transform.rotation }}°</em></label>
						<label><span>X位置</span><input type="range" v-model.number="transform.x" min="-500" max="500" @input="drawTransformPreview"><em>{{ transform.x }}</em></label>
						<label><span>Y位置</span><input type="range" v-model.number="transform.y" min="-500" max="500" @input="drawTransformPreview"><em>{{ transform.y }}</em></label>
					</div>
				</div>
				<div :class="$style.modalActions">
					<button @click="cancelTransform">キャンセル</button>
					<button :class="$style.primaryBtn" @click="applyTransform">配置</button>
				</div>
			</div>
		</div>
		<!-- 閉じる確認 -->
		<div v-if="showCloseConfirm" :class="$style.overlay" @click.stop>
			<div :class="$style.modalBox">
				<div :class="$style.modalHeader"><i class="ti ti-alert-triangle"></i><h2>確認</h2></div>
				<p :class="$style.confirmText">閉じると現在の作業内容は<br><strong>全て失われます</strong>。<br>よろしいですか？</p>
				<div :class="$style.confirmBtns">
					<button @click="showCloseConfirm = false">キャンセル</button>
					<button :class="$style.dangerBtn" @click="forceClose">閉じる</button>
				</div>
			</div>
		</div>
		<!-- ヘッダー -->
		<div :class="$style.header">
			<div :class="$style.headerLeft"><i class="ti ti-palette"></i><span :class="$style.appTitle">お絵描き</span></div>
			<div :class="$style.headerCenter">
				<button :class="$style.sizeBtn" @click="showSizeDialog"><i class="ti ti-dimensions"></i>{{ canvasWidth }} × {{ canvasHeight }}</button>
				<div :class="$style.zoomBar">
					<button @click="zoom = Math.max(0.1, zoom - 0.1)"><i class="ti ti-zoom-out"></i></button>
					<span>{{ Math.round(zoom * 100) }}%</span>
					<button @click="zoom = Math.min(5, zoom + 0.1)"><i class="ti ti-zoom-in"></i></button>
					<button @click="zoom = 1; panX = 0; panY = 0"><i class="ti ti-zoom-reset"></i></button>
				</div>
			</div>
			<div :class="$style.headerRight">
				<button @click="showCredits = true" title="クレジット"><i class="ti ti-info-circle"></i></button>
				<button @click="darkMode = !darkMode" :title="darkMode ? 'ライトモード' : 'ダークモード'"><i :class="darkMode ? 'ti ti-sun' : 'ti ti-moon'"></i></button>
				<button :class="$style.closeBtn" @click="onCloseClick" title="閉じる"><i class="ti ti-x"></i></button>
			</div>
		</div>
		<!-- ボディ -->
		<div :class="$style.body">
			<!-- 左パネル -->
			<div :class="$style.leftPanel">
				<div :class="$style.card">
					<h4>ツール</h4>
					<div :class="$style.tools">
						<button v-for="t in tools" :key="t.id" :class="{ [$style.active]: currentTool === t.id }" @click="currentTool = t.id" :title="t.name"><i :class="t.icon"></i></button>
					</div>
				</div>
				<div :class="$style.card">
					<h4>ブラシサイズ <em>{{ brushSize }}px</em></h4>
					<input type="range" v-model.number="brushSize" min="1" max="100">
					<div :class="$style.brushPreview"><div :style="{ width: brushSize + 'px', height: brushSize + 'px', background: color, borderRadius: '50%' }"></div></div>
					<label :class="$style.check"><input type="checkbox" v-model="fillShape">図形を塗りつぶす</label>
				</div>
				<div :class="$style.card">
					<h4>カラー</h4>
					<div :class="$style.colorWheel">
						<div
							ref="hueRing"
							:class="$style.hueRing"
							@pointerdown="onHuePointerDown"
						>
							<div :class="$style.hueHandle" :style="{ transform: `rotate(${hsv.h}deg) translate(var(--hueRadius)) rotate(-${hsv.h}deg)` }"></div>
						</div>
						<div
							ref="svBox"
							:class="$style.svBox"
							:style="{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))` }"
							@pointerdown="onSvPointerDown"
						>
							<div :class="$style.svHandle" :style="{ left: hsv.s + '%', top: (100 - hsv.v) + '%' }"></div>
						</div>
					</div>
					<div :class="$style.colorDisplay"><div :class="$style.colorSwatch" :style="{ background: color }"></div><input type="text" v-model="color" @change="colorToHsv"></div>
				</div>
				<div :class="$style.card">
					<h4>パレット</h4>
					<div :class="$style.palette">
						<button v-for="c in palette" :key="c" :style="{ background: c }" @click="color = c; colorToHsv()"></button>
					</div>
				</div>
			</div>
			<!-- キャンバスエリア -->
			<div :class="$style.canvasArea">
				<div :class="$style.toolbar">
					<div :class="$style.tbGroup">
						<button @click="undo" :disabled="historyIndex <= 0" title="元に戻す"><i class="ti ti-arrow-back-up"></i></button>
						<button @click="redo" :disabled="historyIndex >= history.length - 1" title="やり直し"><i class="ti ti-arrow-forward-up"></i></button>
					</div>
					<div :class="$style.tbGroup">
						<button @click="importImage" title="画像読込"><i class="ti ti-photo-plus"></i></button>
						<button @click="clearLayer" :class="$style.danger" title="クリア"><i class="ti ti-trash"></i></button>
					</div>
					<div v-if="!isMobile" :class="$style.tbGroup">
						<button :class="{ [$style.active]: panMode }" @click="panMode = !panMode" title="ハンドツール（キャンバス移動）"><i class="ti ti-hand-finger"></i></button>
						<button :class="{ [$style.active]: showMinimap }" @click="showMinimap = !showMinimap" title="ミニマップ表示/非表示"><i class="ti ti-map"></i></button>
					</div>
				</div>
				<div v-if="lasso" :class="$style.lassoBar">
					<span>選択範囲を編集中</span>
					<label>拡大: <input type="range" v-model.number="lasso.scale" min="10" max="300">{{ lasso.scale }}%</label>
					<label>回転: <input type="range" v-model.number="lasso.rotation" min="-180" max="180">{{ lasso.rotation }}°</label>
					<button @click="applyLasso">確定</button>
					<button @click="cancelLasso">キャンセル</button>
				</div>
				<div ref="scroller" :class="$style.scroller" @wheel.prevent="onWheel" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
					<div :class="$style.canvasWrap" :style="{ width: canvasWidth * zoom + 'px', height: canvasHeight * zoom + 'px', transform: `translate(${panX}px, ${panY}px)` }">
						<canvas ref="canvas" :class="$style.canvas" :width="canvasWidth" :height="canvasHeight" :style="{ width: canvasWidth * zoom + 'px', height: canvasHeight * zoom + 'px', background: bgMode === 'transparent' ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 16px 16px' : bgMode, cursor: panMode ? (panning ? 'grabbing' : 'grab') : 'crosshair' }" @pointerdown="onPtrDown" @pointermove="onPtrMove" @pointerup="onPtrUp" @pointerleave="onPtrUp"></canvas>
						<canvas ref="previewCanvas" :class="$style.preview" :width="canvasWidth" :height="canvasHeight" :style="{ width: canvasWidth * zoom + 'px', height: canvasHeight * zoom + 'px' }"></canvas>
						<div v-if="lasso" :class="$style.lassoBox" :style="{ left: lasso.x * zoom + 'px', top: lasso.y * zoom + 'px', width: lasso.w * zoom + 'px', height: lasso.h * zoom + 'px', transform: `scale(${lasso.scale / 100}) rotate(${lasso.rotation}deg)` }" @pointerdown.stop="startLassoDrag">
							<canvas ref="lassoCanvas" :width="lasso.w" :height="lasso.h" :style="{ width: '100%', height: '100%' }"></canvas>
						</div>
					</div>
				</div>
				<div v-if="showMinimap && !isMobile" :class="$style.minimap" @pointerdown.stop="onMiniDown" @pointermove.stop="onMiniMove" @pointerup.stop="onMiniUp" @pointerleave.stop="onMiniUp">
					<canvas ref="miniCanvas" width="160" height="100"></canvas>
					<div :class="$style.miniRect" :style="miniRect"></div>
				</div>
			</div>
			<!-- 右パネル -->
			<div :class="$style.rightPanel">
				<div :class="$style.card">
					<h4>レイヤー <button @click="addLayer"><i class="ti ti-plus"></i></button></h4>
					<div :class="$style.layerHint">※上が手前、下が奥</div>
					<div :class="$style.layers">
						<div v-for="(ly, i) in layers" :key="ly.id" :class="[$style.layer, { [$style.active]: i === curLayer }]" @click="curLayer = i">
							<canvas :class="$style.layerThumb" :ref="el => updateThumb(el as HTMLCanvasElement, ly)"></canvas>
							<div :class="$style.layerInfo">
								<span v-if="editingLayerName !== i" :class="$style.layerName" @dblclick="editingLayerName = i">{{ ly.name }}</span>
								<input v-else :class="$style.layerNameInput" v-model="ly.name" @blur="editingLayerName = -1" @keydown.enter="editingLayerName = -1" autofocus>
								<button @click.stop="ly.visible = !ly.visible; composite()"><i :class="ly.visible ? 'ti ti-eye' : 'ti ti-eye-off'"></i></button>
							</div>
							<div :class="$style.layerControls">
								<select :class="$style.blendSelect" v-model="ly.blend" @change="composite()">
									<option value="normal">通常</option><option value="multiply">乗算</option><option value="screen">スクリーン</option><option value="overlay">オーバーレイ</option>
								</select>
								<div :class="$style.layerBtns">
									<button @click.stop="moveLayer(i, -1)" :disabled="i === 0" title="上へ（手前へ）"><i class="ti ti-chevron-up"></i></button>
									<button @click.stop="moveLayer(i, 1)" :disabled="i === layers.length - 1" title="下へ（奥へ）"><i class="ti ti-chevron-down"></i></button>
									<button @click.stop="delLayer(i)" :disabled="layers.length <= 1" title="削除"><i class="ti ti-trash"></i></button>
								</div>
							</div>
							<div :class="$style.opacityRow"><span>透明度</span><input type="range" v-model.number="ly.opacity" min="0" max="1" step="0.01" @input="composite()"><span>{{ Math.round(ly.opacity * 100) }}%</span></div>
						</div>
					</div>
				</div>
				<div :class="$style.card">
					<h4>フィルター</h4>
					<div :class="$style.filters">
						<button v-for="f in filters" :key="f.id" @click="applyFilter(f.id)">{{ f.name }}</button>
					</div>
				</div>
			</div>
		</div>
		<!-- フッター -->
		<div :class="$style.footer">
			<div :class="$style.footerLeft">
				<button @click="showTutorial = true" title="ヘルプ"><i class="ti ti-help"></i></button>
				<div :class="$style.bgPicker">
					<span>背景:</span>
					<button :style="{ background: '#fff' }" :class="{ [$style.sel]: bgMode === 'white' }" @click="setBg('white')"></button>
					<button :style="{ background: '#000' }" :class="{ [$style.sel]: bgMode === 'black' }" @click="setBg('black')"></button>
					<button :class="[$style.checker, { [$style.sel]: bgMode === 'transparent' }]" @click="setBg('transparent')"></button>
				</div>
			</div>
			<div :class="$style.footerCenter">
				<input v-model="fileName" placeholder="ファイル名"><span>.png</span>
			</div>
			<div :class="$style.footerRight">
				<button @click="onCloseClick">キャンセル</button>
				<button :class="$style.saveBtn" @click="saveImage" :disabled="saving"><i class="ti ti-device-floppy"></i>保存</button>
			</div>
		</div>
	</div>
</MkModal>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import MkModal from '@/components/MkModal.vue';
import * as os from '@/os.js';
import { uploadFile, chooseDriveFile } from '@/utility/drive.js';
import { getProxiedImageUrl } from '@/utility/media-proxy.js';

const emit = defineEmits<{ (ev: 'closed'): void }>();

const modal = ref<InstanceType<typeof MkModal>>();
const canvas = ref<HTMLCanvasElement>();
const previewCanvas = ref<HTMLCanvasElement>();
const miniCanvas = ref<HTMLCanvasElement>();
const lassoCanvas = ref<HTMLCanvasElement>();
const transformCanvas = ref<HTMLCanvasElement>();
const hueRing = ref<HTMLElement>();
const svBox = ref<HTMLElement>();
const scroller = ref<HTMLElement>();

const canvasWidth = ref(800);
const canvasHeight = ref(600);
const zoom = ref(1);
const darkMode = ref(false);
const showTutorial = ref(true);
const showCredits = ref(false);
const showCloseConfirm = ref(false);
const transformMode = ref(false);
const hasChanges = ref(false);
const saving = ref(false);
const fileName = ref('drawing');
const brushSize = ref(8);
const color = ref('#333333');
const currentTool = ref('pen');
const fillShape = ref(false);
const bgMode = ref<'white' | 'black' | 'transparent'>('white');
const drawing = ref(false);
const miniDragging = ref(false);
const editingLayerName = ref(-1);
const showMinimap = ref(false);
const isMobile = ref(false);
const panMode = ref(false);
const panning = ref(false);

const hsv = reactive({ h: 0, s: 0, v: 20 });
const startPt = reactive({ x: 0, y: 0 });
const lastPt = reactive({ x: 0, y: 0 });
const panStart = reactive({ x: 0, y: 0, panX: 0, panY: 0 });
// 旗鯖fork: ハンドツールをスクロール方式からtransform(translate)方式に変更。スクロールバーの範囲に縛られず自由に移動可能
const panX = ref(0);
const panY = ref(0);
const touch = reactive({ count: 0, pinching: false, panning: false, dist: 0, cx: 0, cy: 0, panX: 0, panY: 0 });
const transform = reactive({ img: null as HTMLImageElement | null, scale: 100, rotation: 0, x: 0, y: 0 });

const tools = [
	{ id: 'pen', name: 'ペン', icon: 'ti ti-pencil' },
	{ id: 'eraser', name: '消しゴム', icon: 'ti ti-eraser' },
	{ id: 'fill', name: '塗りつぶし', icon: 'ti ti-paint-filled' },
	{ id: 'line', name: '直線', icon: 'ti ti-line' },
	{ id: 'rect', name: '四角', icon: 'ti ti-square' },
	{ id: 'circle', name: '円', icon: 'ti ti-circle' },
	{ id: 'blur', name: 'ぼかし', icon: 'ti ti-blur' },
	{ id: 'lasso', name: '投げ縄', icon: 'ti ti-lasso' },
	{ id: 'crop', name: '切り抜き', icon: 'ti ti-crop' },
];

const filters = [
	{ id: 'gray', name: 'グレー' }, { id: 'sepia', name: 'セピア' }, { id: 'invert', name: '反転' },
	{ id: 'bright+', name: '明るく' }, { id: 'bright-', name: '暗く' }, { id: 'contrast+', name: 'コントラスト+' },
	{ id: 'contrast-', name: 'コントラスト-' }, { id: 'saturate+', name: '彩度+' }, { id: 'saturate-', name: '彩度-' },
	{ id: 'blur', name: 'ぼかし' }, { id: 'sharpen', name: 'シャープ' }, { id: 'noise', name: 'ノイズ' },
];

const palette = ['#000000', '#ffffff', '#ff0000', '#ff8800', '#ffff00', '#88ff00', '#00ff00', '#00ff88', '#00ffff', '#0088ff', '#0000ff', '#8800ff', '#ff00ff', '#ff0088', '#888888', '#cccccc'];

type Layer = { id: number; name: string; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; visible: boolean; opacity: number; blend: string };
const layers = ref<Layer[]>([]);
const curLayer = ref(0);
let nextLayerId = 1;

const history = ref<ImageData[][]>([]);
const historyIndex = ref(-1);

const lassoPath = ref<{ x: number; y: number }[]>([]);
const lasso = ref<{ x: number; y: number; w: number; h: number; scale: number; rotation: number; data: ImageData; pts: { x: number; y: number }[] } | null>(null);
const draggingLasso = ref(false);

const previewCtx = computed(() => previewCanvas.value?.getContext('2d'));

const miniRect = computed(() => {
	if (!scroller.value || !canvasWidth.value) return {};
	const vw = scroller.value.clientWidth, vh = scroller.value.clientHeight;
	const cw = canvasWidth.value * zoom.value, ch = canvasHeight.value * zoom.value;
	// transform方式: canvasは中央配置 + (panX,panY)。ビューポート左上が指すcanvas座標 = cw/2 - vw/2 - panX
	const viewLeft = cw / 2 - vw / 2 - panX.value;
	const viewTop = ch / 2 - vh / 2 - panY.value;
	return { left: (viewLeft / cw) * 160 + 'px', top: (viewTop / ch) * 100 + 'px', width: Math.min(160, (vw / cw) * 160) + 'px', height: Math.min(100, (vh / ch) * 100) + 'px' };
});

onMounted(() => {
	// モバイル判定
	isMobile.value = window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window;
	// PC版のみミニマップをデフォルトで表示
	showMinimap.value = !isMobile.value;

	const c = document.createElement('canvas'); c.width = canvasWidth.value; c.height = canvasHeight.value;
	const ctx = c.getContext('2d', { willReadFrequently: true })!;
	ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
	layers.value = [{ id: nextLayerId++, name: 'レイヤー1', canvas: c, ctx, visible: true, opacity: 1, blend: 'normal' }];
	composite(); saveHistory();
});

function getLayer() { return layers.value[curLayer.value]; }

function addLayer() {
	const c = document.createElement('canvas'); c.width = canvasWidth.value; c.height = canvasHeight.value;
	const newId = nextLayerId++;
	// 現在のレイヤーの上（手前）に挿入
	layers.value.splice(curLayer.value, 0, { id: newId, name: `レイヤー${newId}`, canvas: c, ctx: c.getContext('2d', { willReadFrequently: true })!, visible: true, opacity: 1, blend: 'normal' });
	composite(); saveHistory();
}

function delLayer(i: number) { if (layers.value.length <= 1) return; layers.value.splice(i, 1); if (curLayer.value >= layers.value.length) curLayer.value = layers.value.length - 1; composite(); saveHistory(); }

function moveLayer(i: number, dir: number) {
	const ni = i + dir;
	if (ni < 0 || ni >= layers.value.length) return;
	const tmp = layers.value[i];
	layers.value[i] = layers.value[ni];
	layers.value[ni] = tmp;
	curLayer.value = ni;
	composite(); saveHistory();
}

function blendToOp(b: string) { return b === 'multiply' ? 'multiply' : b === 'screen' ? 'screen' : b === 'overlay' ? 'overlay' : 'source-over'; }

function composite() {
	if (!canvas.value) return;
	const ctx = canvas.value.getContext('2d')!;
	ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
	// 【修正】レイヤーを逆順で描画（配列の最後=奥、最初=手前）
	for (let i = layers.value.length - 1; i >= 0; i--) {
		const ly = layers.value[i];
		if (!ly.visible) continue;
		ctx.globalAlpha = ly.opacity;
		ctx.globalCompositeOperation = blendToOp(ly.blend);
		ctx.drawImage(ly.canvas, 0, 0);
	}
	ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
	updateMinimap(); hasChanges.value = true;
}

function updateMinimap() {
	if (!miniCanvas.value || !canvas.value) return;
	const mx = miniCanvas.value.getContext('2d')!;
	mx.clearRect(0, 0, 160, 100);
	mx.drawImage(canvas.value, 0, 0, 160, 100);
}

function updateThumb(el: HTMLCanvasElement | null, ly: Layer) { if (el) { const dpr = window.devicePixelRatio || 1; const w = 60, h = 40; if (el.width !== w * dpr || el.height !== h * dpr) { el.width = w * dpr; el.height = h * dpr; } const x = el.getContext('2d')!; x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.clearRect(0, 0, el.width, el.height); x.drawImage(ly.canvas, 0, 0, el.width, el.height); } }

watch([curLayer, layers], () => { nextTick(() => { layers.value.forEach((ly, i) => { const el = document.querySelectorAll('.' + $style.layerThumb)[i] as HTMLCanvasElement; updateThumb(el, ly); }); }); }, { deep: true });

function saveHistory() {
	const data = layers.value.map(ly => ly.ctx.getImageData(0, 0, canvasWidth.value, canvasHeight.value));
	history.value = history.value.slice(0, historyIndex.value + 1);
	history.value.push(data);
	if (history.value.length > 50) history.value.shift();
	historyIndex.value = history.value.length - 1;
}

function undo() { if (historyIndex.value > 0) { historyIndex.value--; restoreHistory(); } }
function redo() { if (historyIndex.value < history.value.length - 1) { historyIndex.value++; restoreHistory(); } }

function restoreHistory() {
	const data = history.value[historyIndex.value];
	if (!data) return;
	while (layers.value.length < data.length) { const c = document.createElement('canvas'); c.width = canvasWidth.value; c.height = canvasHeight.value; layers.value.push({ id: nextLayerId++, name: `レイヤー${nextLayerId}`, canvas: c, ctx: c.getContext('2d', { willReadFrequently: true })!, visible: true, opacity: 1, blend: 'normal' }); }
	while (layers.value.length > data.length) layers.value.pop();
	data.forEach((img, i) => layers.value[i].ctx.putImageData(img, 0, 0));
	composite();
}

function colorToHsv() { const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color.value); if (!m) return; const r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; hsv.v = mx * 100; hsv.s = mx ? (d / mx) * 100 : 0; if (!d) hsv.h = 0; else if (mx === r) hsv.h = ((g - b) / d + (g < b ? 6 : 0)) * 60; else if (mx === g) hsv.h = ((b - r) / d + 2) * 60; else hsv.h = ((r - g) / d + 4) * 60; }
function hsvToColor() { const h = hsv.h / 360, s = hsv.s / 100, v = hsv.v / 100; let r = 0, g = 0, b = 0; const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s); switch (i % 6) { case 0: r = v; g = t; b = p; break; case 1: r = q; g = v; b = p; break; case 2: r = p; g = v; b = t; break; case 3: r = p; g = q; b = v; break; case 4: r = t; g = p; b = v; break; case 5: r = v; g = p; b = q; break; } color.value = '#' + [r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); }
function updateHueFromEvent(e: PointerEvent) {
	if (!hueRing.value) return;
	const r = hueRing.value.getBoundingClientRect();
	const cx = r.left + r.width / 2;
	const cy = r.top + r.height / 2;
	// 中心からの角度を算出 (0deg=右、時計回り)。CSS conic-gradientの起点(上=0)に合わせて+90度補正
	let deg = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI + 90;
	if (deg < 0) deg += 360;
	hsv.h = deg;
	hsvToColor();
}
function onHueMove(e: PointerEvent) { updateHueFromEvent(e); }
function onHueUp() { window.removeEventListener('pointermove', onHueMove); window.removeEventListener('pointerup', onHueUp); }
function onHuePointerDown(e: PointerEvent) {
	// SVボックス内のクリックはhueリング操作にしない(svのpointerdownが先に拾う)
	if (svBox.value && e.target && svBox.value.contains(e.target as Node)) return;
	e.preventDefault();
	updateHueFromEvent(e);
	window.addEventListener('pointermove', onHueMove);
	window.addEventListener('pointerup', onHueUp);
}

function updateSvFromEvent(e: PointerEvent) {
	if (!svBox.value) return;
	const r = svBox.value.getBoundingClientRect();
	hsv.s = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
	hsv.v = Math.min(100, Math.max(0, (1 - (e.clientY - r.top) / r.height) * 100));
	hsvToColor();
}
function onSvMove(e: PointerEvent) { updateSvFromEvent(e); }
function onSvUp() { window.removeEventListener('pointermove', onSvMove); window.removeEventListener('pointerup', onSvUp); }
function onSvPointerDown(e: PointerEvent) {
	e.preventDefault();
	e.stopPropagation();
	updateSvFromEvent(e);
	window.addEventListener('pointermove', onSvMove);
	window.addEventListener('pointerup', onSvUp);
}

function onWheel(e: WheelEvent) {
	// マウスホイールでズーム（Ctrl不要）
	e.preventDefault();
	const delta = e.deltaY > 0 ? -0.1 : 0.1;
	zoom.value = Math.max(0.1, Math.min(10, zoom.value + delta));
}

function onTouchStart(e: TouchEvent) {
	touch.count = e.touches.length;
	if (e.touches.length === 2) {
		// 2本指: ピンチズーム
		e.preventDefault(); touch.pinching = true; touch.panning = false;
		const t0 = e.touches[0], t1 = e.touches[1];
		touch.dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
		touch.cx = (t0.clientX + t1.clientX) / 2; touch.cy = (t0.clientY + t1.clientY) / 2;
		touch.panX = panX.value; touch.panY = panY.value;
	} else if (e.touches.length >= 3) {
		// 3本指: キャンバス移動
		e.preventDefault(); touch.panning = true; touch.pinching = false;
		const t0 = e.touches[0], t1 = e.touches[1], t2 = e.touches[2];
		touch.cx = (t0.clientX + t1.clientX + t2.clientX) / 3;
		touch.cy = (t0.clientY + t1.clientY + t2.clientY) / 3;
		touch.panX = panX.value; touch.panY = panY.value;
	}
}

function onTouchMove(e: TouchEvent) {
	if (e.touches.length === 2 && touch.pinching) {
		// 2本指: ピンチズーム
		e.preventDefault();
		const t0 = e.touches[0], t1 = e.touches[1];
		const newDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
		const newCx = (t0.clientX + t1.clientX) / 2, newCy = (t0.clientY + t1.clientY) / 2;
		const scale = newDist / touch.dist;
		if (Math.abs(scale - 1) > 0.02) { zoom.value = Math.max(0.1, Math.min(10, zoom.value * scale)); touch.dist = newDist; }
		panX.value = touch.panX + (newCx - touch.cx);
		panY.value = touch.panY + (newCy - touch.cy);
		touch.panX = panX.value; touch.panY = panY.value;
		touch.cx = newCx; touch.cy = newCy;
	} else if (e.touches.length >= 3 && touch.panning) {
		// 3本指: キャンバス移動
		e.preventDefault();
		const t0 = e.touches[0], t1 = e.touches[1], t2 = e.touches[2];
		const newCx = (t0.clientX + t1.clientX + t2.clientX) / 3;
		const newCy = (t0.clientY + t1.clientY + t2.clientY) / 3;
		panX.value = touch.panX + (newCx - touch.cx);
		panY.value = touch.panY + (newCy - touch.cy);
	}
}

function onTouchEnd(e: TouchEvent) {
	touch.count = e.touches.length;
	if (e.touches.length < 2) { touch.pinching = false; }
	if (e.touches.length < 3) { touch.panning = false; }
}

function onMiniDown(e: PointerEvent) { miniDragging.value = true; onMiniMove(e); }
function onMiniMove(e: PointerEvent) {
	if (!miniDragging.value || !miniCanvas.value || !scroller.value) return;
	const r = miniCanvas.value.getBoundingClientRect();
	const xx = Math.min(1, Math.max(0, (e.clientX - r.left) / 160)), yy = Math.min(1, Math.max(0, (e.clientY - r.top) / 100));
	const cw = canvasWidth.value * zoom.value, ch = canvasHeight.value * zoom.value;
	// クリックしたcanvas上の点(xx,yy)をビューポート中央に持ってくる pan を算出
	panX.value = cw / 2 - xx * cw;
	panY.value = ch / 2 - yy * ch;
}
function onMiniUp() { miniDragging.value = false; }

async function showSizeDialog() {
	const { canceled, result } = await os.form('キャンバスサイズ', { width: { type: 'number', label: '幅', default: canvasWidth.value }, height: { type: 'number', label: '高さ', default: canvasHeight.value } });
	if (canceled) return;
	const w = Math.max(100, Math.min(4096, result.width)), h = Math.max(100, Math.min(4096, result.height));
	for (const ly of layers.value) { const tmp = document.createElement('canvas'); tmp.width = ly.canvas.width; tmp.height = ly.canvas.height; tmp.getContext('2d')!.drawImage(ly.canvas, 0, 0); ly.canvas.width = w; ly.canvas.height = h; ly.ctx.drawImage(tmp, 0, 0); }
	canvasWidth.value = w; canvasHeight.value = h;
	composite(); saveHistory();
}

function setBg(mode: 'white' | 'black' | 'transparent') { bgMode.value = mode; composite(); hasChanges.value = true; }

function getPos(e: PointerEvent) {
	if (!canvas.value) return { x: 0, y: 0 };
	const r = canvas.value.getBoundingClientRect();
	return { x: (e.clientX - r.left) * (canvasWidth.value / r.width), y: (e.clientY - r.top) * (canvasHeight.value / r.height) };
}

function onPtrDown(e: PointerEvent) {
	// PC版: ハンドツールモードの場合
	if (panMode.value && e.pointerType === 'mouse') {
		panning.value = true;
		panStart.x = e.clientX;
		panStart.y = e.clientY;
		panStart.panX = panX.value;
		panStart.panY = panY.value;
		return;
	}

	if (touch.pinching || touch.panning || touch.count >= 2 || lasso.value) return;
	const ly = getLayer(); if (!ly) return;
	drawing.value = true;
	const p = getPos(e);
	startPt.x = p.x; startPt.y = p.y; lastPt.x = p.x; lastPt.y = p.y;
	if (currentTool.value === 'pen') { ly.ctx.beginPath(); ly.ctx.moveTo(p.x, p.y); }
	else if (currentTool.value === 'eraser') { ly.ctx.save(); ly.ctx.globalCompositeOperation = 'destination-out'; ly.ctx.beginPath(); ly.ctx.moveTo(p.x, p.y); }
	else if (currentTool.value === 'lasso') { lassoPath.value = [p]; }
	else if (currentTool.value === 'fill') { floodFill(Math.floor(p.x), Math.floor(p.y)); composite(); saveHistory(); drawing.value = false; }
}

function onPtrMove(e: PointerEvent) {
	// PC版: ハンドツールモードの場合
	if (panMode.value && panning.value && e.pointerType === 'mouse') {
		panX.value = panStart.panX + (e.clientX - panStart.x);
		panY.value = panStart.panY + (e.clientY - panStart.y);
		return;
	}

	if (!drawing.value || touch.pinching || touch.panning) return;
	const ly = getLayer(); if (!ly) return;
	const p = getPos(e);
	if (currentTool.value === 'pen') {
		ly.ctx.strokeStyle = color.value; ly.ctx.lineWidth = brushSize.value; ly.ctx.lineCap = 'round'; ly.ctx.lineJoin = 'round';
		ly.ctx.lineTo(p.x, p.y); ly.ctx.stroke(); ly.ctx.beginPath(); ly.ctx.moveTo(p.x, p.y); composite();
	} else if (currentTool.value === 'eraser') {
		ly.ctx.lineWidth = brushSize.value; ly.ctx.lineCap = 'round';
		ly.ctx.lineTo(p.x, p.y); ly.ctx.stroke(); ly.ctx.beginPath(); ly.ctx.moveTo(p.x, p.y); composite();
	} else if (currentTool.value === 'blur') { applyBlurStroke(lastPt.x, lastPt.y, p.x, p.y); composite(); }
	else if (currentTool.value === 'lasso') { lassoPath.value.push(p); drawLassoPreview(); }
	else if (['line', 'rect', 'circle', 'crop'].includes(currentTool.value)) { drawShapePreview(p); }
	lastPt.x = p.x; lastPt.y = p.y;
}

function onPtrUp(e: PointerEvent) {
	// PC版: ハンドツールモードの場合
	if (panMode.value && panning.value) {
		panning.value = false;
		return;
	}

	if (!drawing.value) return;
	const ly = getLayer(); if (!ly) return;
	const p = getPos(e);
	if (currentTool.value === 'eraser') ly.ctx.restore();
	if (currentTool.value === 'lasso') { if (lassoPath.value.length > 2) createLasso(ly); lassoPath.value = []; clearPreview(); }
	else if (currentTool.value === 'line') { ly.ctx.strokeStyle = color.value; ly.ctx.lineWidth = brushSize.value; ly.ctx.lineCap = 'round'; ly.ctx.beginPath(); ly.ctx.moveTo(startPt.x, startPt.y); ly.ctx.lineTo(p.x, p.y); ly.ctx.stroke(); composite(); saveHistory(); }
	else if (currentTool.value === 'rect') { if (fillShape.value) { ly.ctx.fillStyle = color.value; ly.ctx.fillRect(startPt.x, startPt.y, p.x - startPt.x, p.y - startPt.y); } else { ly.ctx.strokeStyle = color.value; ly.ctx.lineWidth = brushSize.value; ly.ctx.strokeRect(startPt.x, startPt.y, p.x - startPt.x, p.y - startPt.y); } composite(); saveHistory(); }
	else if (currentTool.value === 'circle') { const rr = Math.hypot(p.x - startPt.x, p.y - startPt.y); ly.ctx.beginPath(); ly.ctx.arc(startPt.x, startPt.y, rr, 0, Math.PI * 2); if (fillShape.value) { ly.ctx.fillStyle = color.value; ly.ctx.fill(); } else { ly.ctx.strokeStyle = color.value; ly.ctx.lineWidth = brushSize.value; ly.ctx.stroke(); } composite(); saveHistory(); }
	else if (currentTool.value === 'crop') { const xx = Math.min(startPt.x, p.x), yy = Math.min(startPt.y, p.y), ww = Math.abs(p.x - startPt.x), hh = Math.abs(p.y - startPt.y); if (ww > 10 && hh > 10) doCrop(xx, yy, ww, hh); }
	else if (['pen', 'eraser', 'blur'].includes(currentTool.value)) { saveHistory(); }
	clearPreview(); drawing.value = false;
}

function drawLassoPreview() { if (!previewCtx.value) return; clearPreview(); previewCtx.value.strokeStyle = '#0af'; previewCtx.value.lineWidth = 2; previewCtx.value.setLineDash([6, 4]); previewCtx.value.beginPath(); if (lassoPath.value.length) { previewCtx.value.moveTo(lassoPath.value[0].x, lassoPath.value[0].y); for (const pt of lassoPath.value) previewCtx.value.lineTo(pt.x, pt.y); } previewCtx.value.stroke(); previewCtx.value.setLineDash([]); }

function drawShapePreview(p: { x: number; y: number }) {
	if (!previewCtx.value) return; clearPreview();
	const isCrop = currentTool.value === 'crop';
	previewCtx.value.strokeStyle = isCrop ? '#0af' : color.value; previewCtx.value.fillStyle = color.value; previewCtx.value.lineWidth = isCrop ? 2 : brushSize.value;
	if (isCrop) previewCtx.value.setLineDash([6, 4]);
	if (currentTool.value === 'line') { previewCtx.value.beginPath(); previewCtx.value.moveTo(startPt.x, startPt.y); previewCtx.value.lineTo(p.x, p.y); previewCtx.value.stroke(); }
	else if (currentTool.value === 'rect' || currentTool.value === 'crop') { if (fillShape.value && !isCrop) previewCtx.value.fillRect(startPt.x, startPt.y, p.x - startPt.x, p.y - startPt.y); else previewCtx.value.strokeRect(startPt.x, startPt.y, p.x - startPt.x, p.y - startPt.y); }
	else if (currentTool.value === 'circle') { const rr = Math.hypot(p.x - startPt.x, p.y - startPt.y); previewCtx.value.beginPath(); previewCtx.value.arc(startPt.x, startPt.y, rr, 0, Math.PI * 2); if (fillShape.value) previewCtx.value.fill(); else previewCtx.value.stroke(); }
	previewCtx.value.setLineDash([]);
}

function clearPreview() { previewCtx.value?.clearRect(0, 0, canvasWidth.value, canvasHeight.value); }

function applyBlurStroke(x1: number, y1: number, x2: number, y2: number) {
	const ly = getLayer(); if (!ly) return;
	const dist = Math.hypot(x2 - x1, y2 - y1), steps = Math.max(1, Math.floor(dist / 4));
	for (let i = 0; i <= steps; i++) { const t = i / steps; blurAt(ly, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, brushSize.value); }
}

function blurAt(ly: Layer, cx: number, cy: number, size: number) {
	const rr = Math.ceil(size);
	const sx = Math.max(0, Math.floor(cx - rr)), sy = Math.max(0, Math.floor(cy - rr));
	const sw = Math.min(rr * 2, canvasWidth.value - sx), sh = Math.min(rr * 2, canvasHeight.value - sy);
	if (sw <= 0 || sh <= 0) return;
	const img = ly.ctx.getImageData(sx, sy, sw, sh), d = img.data, w = img.width, h = img.height;
	const out = new Uint8ClampedArray(d), k = Math.max(1, Math.floor(size / 6));
	for (let yy = k; yy < h - k; yy++) { for (let xx = k; xx < w - k; xx++) { let tr = 0, tg = 0, tb = 0, ta = 0, cnt = 0; for (let ky = -k; ky <= k; ky++) { for (let kx = -k; kx <= k; kx++) { const i = ((yy + ky) * w + (xx + kx)) * 4; tr += d[i]; tg += d[i + 1]; tb += d[i + 2]; ta += d[i + 3]; cnt++; } } const i = (yy * w + xx) * 4; out[i] = tr / cnt; out[i + 1] = tg / cnt; out[i + 2] = tb / cnt; out[i + 3] = ta / cnt; } }
	for (let i = 0; i < d.length; i++) d[i] = out[i];
	ly.ctx.putImageData(img, sx, sy);
}

function floodFill(fx: number, fy: number) {
	const ly = getLayer(); if (!ly || fx < 0 || fx >= canvasWidth.value || fy < 0 || fy >= canvasHeight.value) return;
	const img = ly.ctx.getImageData(0, 0, canvasWidth.value, canvasHeight.value), d = img.data, w = canvasWidth.value;
	const idx = (fy * w + fx) * 4;
	const tr = d[idx], tg = d[idx + 1], tb = d[idx + 2], ta = d[idx + 3];
	const fc = hexToRgb(color.value);
	if (tr === fc[0] && tg === fc[1] && tb === fc[2]) return;
	const stack: [number, number][] = [[fx, fy]], visited = new Set<number>(), tol = 32;
	while (stack.length) {
		const [px, py] = stack.pop()!, key = py * w + px;
		if (visited.has(key) || px < 0 || px >= w || py < 0 || py >= canvasHeight.value) continue;
		const i = key * 4;
		if (Math.abs(d[i] - tr) > tol || Math.abs(d[i + 1] - tg) > tol || Math.abs(d[i + 2] - tb) > tol || Math.abs(d[i + 3] - ta) > tol) continue;
		visited.add(key);
		d[i] = fc[0]; d[i + 1] = fc[1]; d[i + 2] = fc[2]; d[i + 3] = 255;
		stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
	}
	ly.ctx.putImageData(img, 0, 0);
}

function hexToRgb(hex: string): [number, number, number] { const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0]; }

function doCrop(cx: number, cy: number, cw: number, ch: number) {
	const tmp = document.createElement('canvas'); tmp.width = canvasWidth.value; tmp.height = canvasHeight.value;
	const tx = tmp.getContext('2d')!;
	if (bgMode.value !== 'transparent') { tx.fillStyle = bgMode.value === 'white' ? '#fff' : '#000'; tx.fillRect(0, 0, tmp.width, tmp.height); }
	// 【修正】切り抜き時も逆順で描画
	for (let i = layers.value.length - 1; i >= 0; i--) {
		const ly = layers.value[i];
		if (!ly.visible) continue;
		tx.globalAlpha = ly.opacity;
		tx.globalCompositeOperation = blendToOp(ly.blend);
		tx.drawImage(ly.canvas, 0, 0);
	}
	const nc = document.createElement('canvas'); nc.width = cw; nc.height = ch;
	nc.getContext('2d')!.drawImage(tmp, cx, cy, cw, ch, 0, 0, cw, ch);
	layers.value = [{ id: nextLayerId++, name: 'レイヤー1', canvas: nc, ctx: nc.getContext('2d', { willReadFrequently: true })!, visible: true, opacity: 1, blend: 'normal' }];
	curLayer.value = 0; canvasWidth.value = cw; canvasHeight.value = ch;
	composite(); saveHistory();
}

function createLasso(ly: Layer) {
	const pts = lassoPath.value;
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	for (const p of pts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
	const w = Math.ceil(maxX - minX), h = Math.ceil(maxY - minY);
	if (w < 5 || h < 5) return;
	const tc = document.createElement('canvas'); tc.width = w; tc.height = h;
	const tx = tc.getContext('2d')!;
	tx.save();
	tx.beginPath(); tx.moveTo(pts[0].x - minX, pts[0].y - minY);
	for (const p of pts) tx.lineTo(p.x - minX, p.y - minY);
	tx.closePath(); tx.clip();
	tx.drawImage(ly.canvas, -minX, -minY);
	tx.restore();
	ly.ctx.save(); ly.ctx.globalCompositeOperation = 'destination-out';
	ly.ctx.beginPath(); ly.ctx.moveTo(pts[0].x, pts[0].y);
	for (const p of pts) ly.ctx.lineTo(p.x, p.y);
	ly.ctx.closePath(); ly.ctx.fill(); ly.ctx.restore();
	composite();
	lasso.value = { x: minX, y: minY, w, h, scale: 100, rotation: 0, data: tx.getImageData(0, 0, w, h), pts: [...pts] };
	nextTick(() => { if (lassoCanvas.value) lassoCanvas.value.getContext('2d')!.putImageData(lasso.value!.data, 0, 0); });
}

function startLassoDrag(e: PointerEvent) { draggingLasso.value = true; document.addEventListener('pointermove', onLassoDrag); document.addEventListener('pointerup', stopLassoDrag); }
function onLassoDrag(e: PointerEvent) { if (!draggingLasso.value || !lasso.value) return; lasso.value.x += e.movementX / zoom.value; lasso.value.y += e.movementY / zoom.value; }
function stopLassoDrag() { draggingLasso.value = false; document.removeEventListener('pointermove', onLassoDrag); document.removeEventListener('pointerup', stopLassoDrag); }

function applyLasso() {
	if (!lasso.value) return;
	const ly = getLayer(); if (!ly) return;
	const cx = lasso.value.x + lasso.value.w / 2, cy = lasso.value.y + lasso.value.h / 2;
	ly.ctx.save(); ly.ctx.translate(cx, cy); ly.ctx.rotate(lasso.value.rotation * Math.PI / 180); ly.ctx.scale(lasso.value.scale / 100, lasso.value.scale / 100); ly.ctx.translate(-cx, -cy);
	const tc = document.createElement('canvas'); tc.width = lasso.value.w; tc.height = lasso.value.h;
	tc.getContext('2d')!.putImageData(lasso.value.data, 0, 0);
	ly.ctx.drawImage(tc, lasso.value.x, lasso.value.y); ly.ctx.restore();
	composite(); saveHistory(); lasso.value = null;
}

function cancelLasso() {
	if (!lasso.value) return;
	const ly = getLayer(); if (!ly) return;
	const tc = document.createElement('canvas'); tc.width = lasso.value.w; tc.height = lasso.value.h;
	tc.getContext('2d')!.putImageData(lasso.value.data, 0, 0);
	let minX = Infinity, minY = Infinity;
	for (const p of lasso.value.pts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); }
	ly.ctx.drawImage(tc, minX, minY);
	composite(); lasso.value = null;
}

function applyFilter(id: string) {
	const ly = getLayer(); if (!ly) return;
	const img = ly.ctx.getImageData(0, 0, canvasWidth.value, canvasHeight.value), d = img.data;
	switch (id) {
		case 'gray': for (let i = 0; i < d.length; i += 4) { const g = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114; d[i] = d[i + 1] = d[i + 2] = g; } break;
		case 'sepia': for (let i = 0; i < d.length; i += 4) { const rr = d[i], gg = d[i + 1], bb = d[i + 2]; d[i] = Math.min(255, rr * 0.393 + gg * 0.769 + bb * 0.189); d[i + 1] = Math.min(255, rr * 0.349 + gg * 0.686 + bb * 0.168); d[i + 2] = Math.min(255, rr * 0.272 + gg * 0.534 + bb * 0.131); } break;
		case 'invert': for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; } break;
		case 'bright+': for (let i = 0; i < d.length; i += 4) { d[i] = Math.min(255, d[i] + 30); d[i + 1] = Math.min(255, d[i + 1] + 30); d[i + 2] = Math.min(255, d[i + 2] + 30); } break;
		case 'bright-': for (let i = 0; i < d.length; i += 4) { d[i] = Math.max(0, d[i] - 30); d[i + 1] = Math.max(0, d[i + 1] - 30); d[i + 2] = Math.max(0, d[i + 2] - 30); } break;
		case 'contrast+': for (let i = 0; i < d.length; i += 4) { d[i] = Math.min(255, Math.max(0, (d[i] - 128) * 1.2 + 128)); d[i + 1] = Math.min(255, Math.max(0, (d[i + 1] - 128) * 1.2 + 128)); d[i + 2] = Math.min(255, Math.max(0, (d[i + 2] - 128) * 1.2 + 128)); } break;
		case 'contrast-': for (let i = 0; i < d.length; i += 4) { d[i] = (d[i] - 128) * 0.8 + 128; d[i + 1] = (d[i + 1] - 128) * 0.8 + 128; d[i + 2] = (d[i + 2] - 128) * 0.8 + 128; } break;
		case 'saturate+': case 'saturate-': const ss = id === 'saturate+' ? 1.3 : 0.7; for (let i = 0; i < d.length; i += 4) { const gray = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114; d[i] = Math.min(255, Math.max(0, gray + (d[i] - gray) * ss)); d[i + 1] = Math.min(255, Math.max(0, gray + (d[i + 1] - gray) * ss)); d[i + 2] = Math.min(255, Math.max(0, gray + (d[i + 2] - gray) * ss)); } break;
		case 'blur': applyFullBlur(ly); return;
		case 'sharpen': applySharpen(img); break;
		case 'noise': for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 60; d[i] = Math.min(255, Math.max(0, d[i] + n)); d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n)); d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n)); } break;
	}
	ly.ctx.putImageData(img, 0, 0); composite(); saveHistory();
}

function applyFullBlur(ly: Layer) {
	const img = ly.ctx.getImageData(0, 0, canvasWidth.value, canvasHeight.value), d = img.data, w = canvasWidth.value, h = canvasHeight.value;
	const out = new Uint8ClampedArray(d), k = 3;
	for (let yy = k; yy < h - k; yy++) { for (let xx = k; xx < w - k; xx++) { let tr = 0, tg = 0, tb = 0, ta = 0, cnt = 0; for (let ky = -k; ky <= k; ky++) { for (let kx = -k; kx <= k; kx++) { const i = ((yy + ky) * w + (xx + kx)) * 4; tr += d[i]; tg += d[i + 1]; tb += d[i + 2]; ta += d[i + 3]; cnt++; } } const i = (yy * w + xx) * 4; out[i] = tr / cnt; out[i + 1] = tg / cnt; out[i + 2] = tb / cnt; out[i + 3] = ta / cnt; } }
	for (let i = 0; i < d.length; i++) d[i] = out[i];
	ly.ctx.putImageData(img, 0, 0); composite(); saveHistory();
}

function applySharpen(img: ImageData) {
	const d = img.data, w = img.width, h = img.height, out = new Uint8ClampedArray(d);
	const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
	for (let yy = 1; yy < h - 1; yy++) { for (let xx = 1; xx < w - 1; xx++) { for (let c = 0; c < 3; c++) { let sum = 0; for (let ky = -1; ky <= 1; ky++) { for (let kx = -1; kx <= 1; kx++) { sum += d[((yy + ky) * w + (xx + kx)) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)]; } } out[(yy * w + xx) * 4 + c] = Math.min(255, Math.max(0, sum)); } } }
	for (let i = 0; i < d.length; i++) d[i] = out[i];
}

function clearLayer() {
	os.confirm({ type: 'warning', text: '現在のレイヤーを消去しますか？' }).then(({ canceled }) => {
		if (canceled) return;
		const ly = getLayer(); if (!ly) return;
		ly.ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
		composite(); saveHistory();
	});
}

async function importImage() {
	try {
		const files = await chooseDriveFile({ multiple: false });
		if (!files || !files[0]?.url) return;
		const url = getProxiedImageUrl(files[0].url, undefined, true);
		const img = new Image(); img.crossOrigin = 'anonymous';
		await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('load failed')); img.src = url; });
		transform.img = img; transform.scale = 100; transform.rotation = 0; transform.x = 0; transform.y = 0;
		transformMode.value = true;
		nextTick(() => drawTransformPreview());
	} catch (e) { console.error(e); os.alert({ type: 'error', text: '画像の読み込みに失敗しました' }); }
}

function drawTransformPreview() {
	if (!transformCanvas.value || !transform.img) return;
	const x = transformCanvas.value.getContext('2d')!;
	x.clearRect(0, 0, 240, 180); x.fillStyle = '#ddd'; x.fillRect(0, 0, 240, 180);
	x.save(); x.translate(120 + transform.x * 0.15, 90 + transform.y * 0.15);
	x.rotate(transform.rotation * Math.PI / 180); x.scale(transform.scale / 100, transform.scale / 100);
	const w = transform.img.width, h = transform.img.height, sc = Math.min(200 / w, 140 / h);
	x.drawImage(transform.img, -w * sc / 2, -h * sc / 2, w * sc, h * sc); x.restore();
}

function applyTransform() {
	if (!transform.img) return;
	const ly = getLayer(); if (!ly) return;
	ly.ctx.save(); ly.ctx.translate(canvasWidth.value / 2 + transform.x, canvasHeight.value / 2 + transform.y);
	ly.ctx.rotate(transform.rotation * Math.PI / 180); ly.ctx.scale(transform.scale / 100, transform.scale / 100);
	ly.ctx.drawImage(transform.img, -transform.img.width / 2, -transform.img.height / 2); ly.ctx.restore();
	composite(); saveHistory(); transformMode.value = false; transform.img = null;
}

function cancelTransform() { transformMode.value = false; transform.img = null; }

async function saveImage() {
	if (saving.value) return;
	saving.value = true;
	try {
		const out = document.createElement('canvas'); out.width = canvasWidth.value; out.height = canvasHeight.value;
		const x = out.getContext('2d')!;
		if (bgMode.value !== 'transparent') { x.fillStyle = bgMode.value === 'white' ? '#fff' : '#000'; x.fillRect(0, 0, out.width, out.height); }
		// 【修正】保存時も逆順で描画
		for (let i = layers.value.length - 1; i >= 0; i--) {
			const ly = layers.value[i];
			if (!ly.visible) continue;
			x.globalAlpha = ly.opacity;
			x.globalCompositeOperation = blendToOp(ly.blend);
			x.drawImage(ly.canvas, 0, 0);
		}
		const blob = await new Promise<Blob | null>(r => out.toBlob(r, 'image/png'));
		if (!blob) throw new Error('blob failed');
		const file = new File([blob], (fileName.value || 'drawing') + '.png', { type: 'image/png' });
		const { filePromise } = uploadFile(file, { name: file.name });
		await filePromise;
		os.success(); hasChanges.value = false; modal.value?.close();
	} catch (e) { console.error(e); os.alert({ type: 'error', text: '保存に失敗しました' }); }
	finally { saving.value = false; }
}

function onModalClick() { onCloseClick(); }
function onCloseClick() { if (hasChanges.value) showCloseConfirm.value = true; else modal.value?.close(); }
function forceClose() { showCloseConfirm.value = false; modal.value?.close(); }
</script>

<style lang="scss" module>
.root { display: flex; flex-direction: column; width: 98vw; max-width: 1800px; height: 94vh; background: var(--MI_THEME-panel); border-radius: 20px; overflow: hidden; &.dark { background: #1a1a1a; color: #f0f0f0; .leftPanel, .rightPanel, .header, .footer, .toolbar, .card { background: #222; border-color: #333; } } }
.overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); }
.modalBox { background: var(--MI_THEME-panel); color: var(--MI_THEME-fg); border-radius: 20px; padding: 28px; text-align: center; max-width: 90vw; max-width: 480px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
.modalHeader { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 20px; i { font-size: 28px; color: var(--MI_THEME-accent); } h2 { margin: 0; font-size: 20px; } }
.modalBody { text-align: left; }
.warningBanner { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #fff3cd; border-radius: 12px; margin-bottom: 20px; i { color: #856404; font-size: 20px; } span { color: #856404; font-size: 13px; } }
.tutorialGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; div { background: var(--MI_THEME-bg); padding: 16px; border-radius: 12px; i { font-size: 24px; color: var(--MI_THEME-accent); display: block; margin-bottom: 8px; } strong { display: block; margin-bottom: 4px; } p { margin: 0; font-size: 12px; opacity: 0.7; } } }
.primaryBtn { width: 100%; padding: 14px; border: none; border-radius: 12px; background: var(--MI_THEME-accent); color: #fff; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 20px; &:hover { opacity: 0.9; } }
.dangerBtn { width: 100%; padding: 14px; border: none; border-radius: 12px; background: #e74c3c; color: #fff; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 10px; &:hover { opacity: 0.9; } }
.creditsBody { margin: 20px 0; }
.creditItem { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--MI_THEME-divider); span { opacity: 0.6; } strong { color: var(--MI_THEME-accent); } }
.version { margin-top: 16px; opacity: 0.5; font-size: 12px; }
.transformBody { display: flex; flex-direction: column; gap: 16px; }
.transformPreview { display: flex; justify-content: center; canvas { border-radius: 12px; border: 1px solid var(--MI_THEME-divider); } }
.transformSliders { label { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 13px; span { width: 80px; } input { flex: 1; } em { width: 50px; text-align: right; font-style: normal; opacity: 0.6; } } }
.modalActions { display: flex; gap: 12px; margin-top: 20px; button { flex: 1; padding: 12px; border: none; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; &:first-child { background: var(--MI_THEME-buttonBg); color: var(--MI_THEME-fg); } } }
.confirmText { margin: 20px 0; opacity: 0.8; line-height: 1.6; strong { color: #e74c3c; } }
.confirmBtns { display: flex; flex-direction: column; gap: 10px; button { padding: 14px; border: none; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 500; &:first-child { background: var(--MI_THEME-buttonBg); color: var(--MI_THEME-fg); } } }
.header { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--MI_THEME-divider); gap: 16px; }
.headerLeft { display: flex; align-items: center; gap: 8px; i { font-size: 22px; color: var(--MI_THEME-accent); } }
.appTitle { font-weight: 700; font-size: 16px; }
.headerCenter { display: flex; align-items: center; gap: 16px; flex: 1; justify-content: center; }
.sizeBtn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: var(--MI_THEME-bg); border: none; border-radius: 10px; color: var(--MI_THEME-fg); cursor: pointer; font-size: 13px; &:hover { background: var(--MI_THEME-buttonHoverBg); } }
.zoomBar { display: flex; align-items: center; gap: 4px; background: var(--MI_THEME-bg); padding: 4px; border-radius: 10px; button { width: 32px; height: 32px; border: none; border-radius: 8px; background: transparent; color: var(--MI_THEME-fg); cursor: pointer; &:hover { background: var(--MI_THEME-buttonHoverBg); } } span { min-width: 50px; text-align: center; font-size: 12px; } }
.headerRight { display: flex; gap: 4px; button { width: 36px; height: 36px; border: none; border-radius: 10px; background: transparent; color: var(--MI_THEME-fg); cursor: pointer; &:hover { background: var(--MI_THEME-buttonHoverBg); } i { font-size: 18px; } } }
.closeBtn { &:hover { background: #e74c3c !important; color: #fff !important; } }
.body { display: flex; flex: 1; overflow: hidden; }
.leftPanel, .rightPanel { flex-direction: column; width: 220px; padding: 12px; overflow-y: auto; display: flex; gap: 12px; background: var(--MI_THEME-bg); }
.leftPanel { border-right: 1px solid var(--MI_THEME-divider); }
.rightPanel { border-left: 1px solid var(--MI_THEME-divider); width: 280px; }
.card { background: var(--MI_THEME-panel); border-radius: 14px; padding: 14px; h4 { margin: 0 0 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.6; display: flex; justify-content: space-between; align-items: center; em { font-style: normal; color: var(--MI_THEME-accent); } button { background: none; border: none; color: var(--MI_THEME-fg); cursor: pointer; padding: 2px 6px; border-radius: 6px; &:hover { background: var(--MI_THEME-buttonHoverBg); } } } }
.tools { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; button { aspect-ratio: 1; border: none; border-radius: 10px; background: var(--MI_THEME-bg); color: var(--MI_THEME-fg); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; &:hover { background: var(--MI_THEME-buttonHoverBg); } &.active { background: var(--MI_THEME-accent); color: #fff; } i { font-size: 18px; } } }
input[type="range"] { width: 100%; height: 6px; -webkit-appearance: none; background: var(--MI_THEME-divider); border-radius: 3px; outline: none; &::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; background: var(--MI_THEME-accent); border-radius: 50%; cursor: pointer; } }
.brushPreview { display: flex; justify-content: center; align-items: center; height: 50px; margin-top: 10px; background: var(--MI_THEME-bg); border-radius: 10px; }
.check { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 12px; cursor: pointer; }
.colorWheel { position: relative; width: 200px; height: 200px; margin: 0 auto 12px; }
.hueRing {
	--hueRadius: 88px;
	position: relative;
	width: 200px;
	height: 200px;
	border-radius: 50%;
	background: conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
	/* 中央をくり抜いてリング状に */
	-webkit-mask: radial-gradient(circle, transparent 64px, #000 65px);
	mask: radial-gradient(circle, transparent 64px, #000 65px);
	cursor: crosshair;
	touch-action: none;
}
.hueHandle {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 16px;
	height: 16px;
	margin: -8px 0 0 -8px;
	border-radius: 50%;
	background: transparent;
	border: 3px solid #fff;
	box-shadow: 0 0 0 1px rgba(0,0,0,0.4);
	pointer-events: none;
}
.svBox {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 96px;
	height: 96px;
	transform: translate(-50%, -50%);
	border-radius: 8px;
	cursor: crosshair;
	touch-action: none;
	/* リングのmaskの影響を受けないように別レイヤー扱い */
	-webkit-mask: none;
	mask: none;
}
.svHandle {
	position: absolute;
	width: 12px;
	height: 12px;
	margin: -6px 0 0 -6px;
	border-radius: 50%;
	background: transparent;
	border: 2px solid #fff;
	box-shadow: 0 0 0 1px rgba(0,0,0,0.5);
	pointer-events: none;
}
.colorDisplay { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.colorSwatch { width: 36px; height: 36px; border-radius: 10px; border: 2px solid var(--MI_THEME-divider); }
.colorDisplay input { flex: 1; padding: 10px; border: 1px solid var(--MI_THEME-divider); border-radius: 8px; background: var(--MI_THEME-bg); color: var(--MI_THEME-fg); font-family: monospace; font-size: 13px; }
.palette { display: flex; flex-wrap: wrap; gap: 6px; button { width: 24px; height: 24px; border: 2px solid transparent; border-radius: 6px; cursor: pointer; &:hover { transform: scale(1.15); border-color: var(--MI_THEME-fg); } } }
.canvasArea { flex: 1; flex-direction: column; display: flex; overflow: hidden; background: #4a4a4a; position: relative; }
.toolbar { display: flex; gap: 8px; padding: 10px; background: var(--MI_THEME-panel); border-bottom: 1px solid var(--MI_THEME-divider); flex-wrap: wrap; }
.tbGroup { display: flex; gap: 2px; background: var(--MI_THEME-bg); padding: 4px; border-radius: 10px; button { padding: 8px 10px; border: none; border-radius: 8px; background: transparent; color: var(--MI_THEME-fg); cursor: pointer; &:hover { background: var(--MI_THEME-buttonHoverBg); } &:disabled { opacity: 0.3; cursor: not-allowed; } &.danger:hover { background: #e74c3c; color: #fff; } &.active { background: var(--MI_THEME-accent); color: #fff; } i { font-size: 16px; } } }
.lassoBar { display: flex; align-items: center; gap: 16px; padding: 10px 16px; background: #fff8e1; border-bottom: 1px solid #ffca28; font-size: 12px; label { display: flex; align-items: center; gap: 8px; input { width: 100px; } } button { padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 500; } }
.scroller { flex: 1; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; }
.canvasWrap { position: relative; flex-shrink: 0; }
.canvas { display: block; background: #fff; box-shadow: 0 4px 24px rgba(0,0,0,0.3); touch-action: none; }
.preview { position: absolute; top: 0; left: 0; pointer-events: none; }
.lassoBox { position: absolute; border: 2px dashed #0af; cursor: move; transform-origin: center; canvas { display: block; } }
.minimap { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.8); border-radius: 10px; padding: 6px; cursor: pointer; touch-action: none; canvas { display: block; border-radius: 6px; } }
.miniRect { position: absolute; border: 2px solid #ff6b6b; background: rgba(255,107,107,0.15); border-radius: 2px; pointer-events: none; }
.layers { display: flex; flex-direction: column; gap: 8px; max-height: 350px; overflow-y: auto; }
.layerHint { font-size: 10px; opacity: 0.5; margin-bottom: 8px; text-align: center; }
.layer { display: flex; flex-direction: column; gap: 8px; padding: 10px; background: var(--MI_THEME-bg); border-radius: 12px; cursor: pointer; border: 2px solid transparent; &:hover { background: var(--MI_THEME-buttonHoverBg); } &.active { border-color: var(--MI_THEME-accent); } }
.layerThumb { width: 60px; height: 40px; border-radius: 6px; border: 1px solid var(--MI_THEME-divider); background: #fff; }
.layerInfo { display: flex; align-items: center; gap: 8px; }
.layerName { font-size: 13px; font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.layerNameInput { flex: 1; padding: 4px 8px; border: 1px solid var(--MI_THEME-accent); border-radius: 6px; background: var(--MI_THEME-panel); color: var(--MI_THEME-fg); font-size: 13px; }
.layerControls { display: flex; flex-direction: column; gap: 6px; }
.blendSelect { padding: 6px 8px; font-size: 11px; border: 1px solid var(--MI_THEME-divider); border-radius: 6px; background: var(--MI_THEME-panel); color: var(--MI_THEME-fg); width: 100%; }
.layerBtns { display: flex; gap: 4px; button { flex: 1; padding: 6px; border: none; border-radius: 6px; background: var(--MI_THEME-bg); color: var(--MI_THEME-fg); cursor: pointer; font-size: 12px; &:hover { background: var(--MI_THEME-buttonHoverBg); } &:disabled { opacity: 0.3; cursor: not-allowed; } } }
.opacityRow { display: flex; align-items: center; gap: 8px; span { font-size: 11px; min-width: 35px; opacity: 0.7; } input { flex: 1; } }
.filters { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; button { padding: 8px 6px; border: none; border-radius: 8px; background: var(--MI_THEME-bg); color: var(--MI_THEME-fg); cursor: pointer; font-size: 11px; &:hover { background: var(--MI_THEME-buttonHoverBg); } } }
.footer { display: flex; align-items: center; padding: 12px 16px; border-top: 1px solid var(--MI_THEME-divider); gap: 16px; }
.footerLeft { display: flex; align-items: center; gap: 12px; button { width: 36px; height: 36px; border: none; border-radius: 10px; background: var(--MI_THEME-bg); color: var(--MI_THEME-fg); cursor: pointer; } }
.bgPicker { display: flex; align-items: center; gap: 6px; font-size: 12px; button { width: 24px; height: 24px; border: 2px solid transparent; border-radius: 6px; cursor: pointer; &.sel { border-color: var(--MI_THEME-accent); } } }
.checker { background: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%); background-size: 8px 8px; background-position: 0 0, 0 4px, 4px -4px, -4px 0; }
.footerCenter { flex: 1; display: flex; align-items: center; gap: 6px; input { flex: 1; max-width: 200px; padding: 10px 14px; border: 1px solid var(--MI_THEME-divider); border-radius: 10px; background: var(--MI_THEME-bg); color: var(--MI_THEME-fg); font-size: 14px; } span { font-size: 14px; opacity: 0.6; } }
.footerRight { display: flex; gap: 10px; button { padding: 10px 20px; border: none; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; &:first-child { background: var(--MI_THEME-bg); color: var(--MI_THEME-fg); } } }
.saveBtn { background: var(--MI_THEME-accent) !important; color: #fff !important; display: flex; align-items: center; gap: 8px; &:disabled { opacity: 0.5; } i { font-size: 16px; } }
@media (max-width: 1024px) { .root { width: 100vw; height: 100vh; max-width: none; border-radius: 0; } .leftPanel, .rightPanel { width: 200px; } }
@media (max-width: 768px) { .leftPanel, .rightPanel { display: none; } .headerCenter { display: none; } .appTitle { display: none; } .footer { flex-wrap: wrap; justify-content: center; } .footerCenter { order: -1; width: 100%; justify-content: center; } }
</style>
