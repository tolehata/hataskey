/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/*
 * 旗鯖fork: 天気エフェクト(weatherEffect) — 雨。
 *
 * 雪(本家由来の WeatherEffect, WebGL)とは別に、雨は 2D Canvas で自前実装する。
 * 理由: 「地面でのバウンド」「窓を伝う雫の垂れ下がり」は 2D Canvas の方が素直に書ける。
 *
 * 雪と同じ方針で、TLのDOMには一切触らず body 直下に position:fixed の canvas を1枚置く。
 * マネージャからは雪と同じ render() / fadeIn() / fadeOut() / stop() で扱えるようにする。
 *
 * 【健康配慮 — 最優先・コードでハードガード】
 *   - 強い明滅・点滅・コントラストの急変は行わない(雷は実装しない)。
 *   - 地面の飛沫は低頻度・低コントラスト・小サイズに抑える(チカチカさせない)。
 *   - 窓の雫はゆっくりした動きのみ(明滅とは無縁)。
 *   - prefers-reduced-motion: reduce のとき描画しない。
 *   - document.hidden(タブ非アクティブ)時は描画停止。
 *   - 透過度・粒子数に上限を設ける。
 */

export class RainEffect {
	// ===== 健康配慮のハードガード定数(安易に変更しないこと) =====
	private static readonly MAX_DROPS = 320;        // 降る雨の粒の上限
	private static readonly MAX_TRICKLES = 14;      // 窓の雫の同時上限
	private static readonly MAX_SPLASHES = 40;      // 飛沫の同時上限
	private static readonly FADE_MS = 2000;         // フェード時間(滑らかに)
	private static readonly RAIN_ALPHA = 0.58;      // 降る雨の最大不透明度
	private static readonly TRICKLE_ALPHA = 0.22;   // 窓の雫の最大不透明度
	private static readonly SPLASH_ALPHA = 0.18;    // 飛沫の最大不透明度(最も控えめ)
	// =========================================================

	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private raf = 0;
	private destroyed = false;
	private lastTs = 0;

	private widthCss = 0;
	private heightCss = 0;
	private dpr = 1;

	private onWindowResize: () => void;
	private reducedMotionMql: MediaQueryList;

	// 降る雨
	private drops: {
		x: number; y: number; len: number; speed: number; alpha: number;
		drift: number;     // 横方向の基本速度(粒ごとに左右ランダム = 風向きの個体差)
		swayPhase: number; // 揺らぎの位相
		swaySpeed: number; // 揺らぎの速さ
		swayAmp: number;   // 揺らぎの強さ(横方向の振れ幅)
	}[] = [];

	// 地面/着地点の飛沫(短命)
	private splashes: {
		x: number; y: number; vx: number; vy: number; life: number; maxLife: number;
	}[] = [];

	// 窓を伝う雫(ゆっくり垂れ下がる)
	private trickles: {
		x: number; y: number; r: number; speed: number; wobble: number;
		alpha: number; trail: number; // trail = 軌跡の濃さ
	}[] = [];

	constructor() {
		const canvas = window.document.createElement('canvas');
		Object.assign(canvas.style, {
			position: 'fixed',
			top: '0',
			left: '0',
			width: '100vw',
			height: '100vh',
			background: 'transparent',
			'pointer-events': 'none',
			'z-index': '2147483647',
			opacity: '0',
			transition: `opacity ${RainEffect.FADE_MS}ms ease`,
		});
		const ctx = canvas.getContext('2d');
		if (ctx == null) throw new Error('Failed to get 2D context for rain');
		this.canvas = canvas;
		this.ctx = ctx;

		window.document.body.append(canvas);

		this.onWindowResize = () => this.resize();
		window.addEventListener('resize', this.onWindowResize);

		this.reducedMotionMql = window.matchMedia('(prefers-reduced-motion: reduce)');

		this.resize();
		this.initDrops();
	}

	private get reducedMotion(): boolean {
		return this.reducedMotionMql.matches;
	}

	private resize() {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		this.widthCss = vw;
		this.heightCss = vh;
		this.dpr = Math.min(window.devicePixelRatio || 1, 2);
		this.canvas.width = Math.max(1, Math.round(vw * this.dpr));
		this.canvas.height = Math.max(1, Math.round(vh * this.dpr));
		this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
	}

	private rand(min: number, max: number) {
		return min + Math.random() * (max - min);
	}

	private initDrops() {
		this.drops = [];
		const n = Math.min(RainEffect.MAX_DROPS, Math.round(this.widthCss / 3));
		for (let i = 0; i < n; i++) {
			this.drops.push(this.spawnDrop(true));
		}
	}

	private spawnDrop(initial: boolean) {
		return {
			x: this.rand(0, this.widthCss),
			y: initial ? this.rand(0, this.heightCss) : this.rand(-this.heightCss * 0.3, 0),
			len: this.rand(14, 30),
			speed: this.rand(11, 18),
			alpha: this.rand(0.4, 1),
			// 横方向の基本速度。左右ランダムで、粒ごとに違う風向きを持たせる(-1.4〜+1.4)。
			drift: this.rand(-1.4, 1.4),
			// 落下中の揺らぎ(sinで微妙に左右にふらつく)。
			swayPhase: this.rand(0, Math.PI * 2),
			swaySpeed: this.rand(0.04, 0.1),
			swayAmp: this.rand(0.2, 0.8),
		};
	}

	private spawnSplash(x: number) {
		if (this.splashes.length >= RainEffect.MAX_SPLASHES) return;
		// 着地点から左右に小さく跳ねる飛沫を2〜3個
		const count = Math.floor(this.rand(2, 4));
		for (let i = 0; i < count; i++) {
			this.splashes.push({
				x,
				y: this.heightCss - this.rand(0, 2),
				vx: this.rand(-1.2, 1.2),
				vy: this.rand(-2.5, -1),
				life: 0,
				maxLife: this.rand(12, 22),
			});
		}
	}

	private maybeSpawnTrickle() {
		if (this.trickles.length >= RainEffect.MAX_TRICKLES) return;
		// 低確率で窓に新しい雫が付着する
		if (Math.random() > 0.012) return;
		this.trickles.push({
			x: this.rand(this.widthCss * 0.05, this.widthCss * 0.95),
			y: this.rand(0, this.heightCss * 0.4),
			r: this.rand(1.5, 3.5),
			speed: 0,
			wobble: this.rand(-0.3, 0.3),
			alpha: this.rand(0.5, 1),
			trail: this.rand(0.3, 0.7),
		});
	}

	public render() {
		this.lastTs = 0;
		if (this.raf) window.cancelAnimationFrame(this.raf);
		this.raf = window.requestAnimationFrame(this.update);
		return this;
	}

	private update = (ts: number) => {
		if (this.destroyed) return;
		this.raf = window.requestAnimationFrame(this.update);

		// タブ非アクティブ時は描画しない
		if (document.hidden) { this.lastTs = ts; return; }
		// reduced-motion 時は静止(描画しない=何も動かない)
		if (this.reducedMotion) {
			this.ctx.clearRect(0, 0, this.widthCss, this.heightCss);
			this.lastTs = ts;
			return;
		}

		const dt = this.lastTs === 0 ? 16 : Math.min(ts - this.lastTs, 50);
		this.lastTs = ts;
		const k = dt / 16.67; // 60fps正規化

		const ctx = this.ctx;
		ctx.clearRect(0, 0, this.widthCss, this.heightCss);

		// ---- 降る雨 ----
		ctx.lineCap = 'round';
		ctx.lineWidth = 1.6;
		for (const d of this.drops) {
			// この粒の今フレームの横移動量 = 風向き(drift) + 揺らぎ(sin)
			d.swayPhase += d.swaySpeed * k;
			const horiz = (d.drift + Math.sin(d.swayPhase) * d.swayAmp) * k;

			ctx.strokeStyle = `rgba(174,194,224,${RainEffect.RAIN_ALPHA * d.alpha})`;
			ctx.beginPath();
			ctx.moveTo(d.x, d.y);
			// 線の向きを実際の進行方向(横移動 + 落下)に合わせて斜めに引く。
			// 横の振れを少し強調(×3)して、斜めの傾きが見えるようにする。
			ctx.lineTo(d.x - horiz * 3, d.y - d.len);
			ctx.stroke();

			d.y += d.speed * k;
			d.x += horiz;
			// 横に流れすぎたら反対側へ回り込ませる(画面外に溜まらないように)
			if (d.x < -20) d.x = this.widthCss + 20;
			if (d.x > this.widthCss + 20) d.x = -20;
			if (d.y > this.heightCss) {
				// 地面で跳ねる
				this.spawnSplash(d.x);
				Object.assign(d, this.spawnDrop(false));
			}
		}

		// ---- 地面の飛沫 ----
		for (let i = this.splashes.length - 1; i >= 0; i--) {
			const s = this.splashes[i];
			s.life += k;
			s.x += s.vx * k;
			s.y += s.vy * k;
			s.vy += 0.18 * k; // 重力で落ちる
			const t = 1 - s.life / s.maxLife;
			if (t <= 0) { this.splashes.splice(i, 1); continue; }
			ctx.fillStyle = `rgba(174,194,224,${RainEffect.SPLASH_ALPHA * t})`;
			ctx.beginPath();
			ctx.arc(s.x, s.y, 1.1, 0, Math.PI * 2);
			ctx.fill();
		}

		// ---- 窓を伝う雫 ----
		this.maybeSpawnTrickle();
		for (let i = this.trickles.length - 1; i >= 0; i--) {
			const tr = this.trickles[i];
			// 雫は溜まってから滑り落ちる: 速度が遅いうちは微増、閾値を超えると加速
			tr.speed += this.rand(0, 0.05) * k;
			// たまに一気に滑り出す
			if (Math.random() < 0.01) tr.speed += this.rand(0.5, 1.5);
			tr.speed = Math.min(tr.speed, 4.5);
			tr.y += tr.speed * k;
			tr.x += tr.wobble * tr.speed * 0.15 * k; // 滑りながら少し横に揺れる

			// 軌跡(細い筋)を残す
			ctx.strokeStyle = `rgba(174,194,224,${RainEffect.TRICKLE_ALPHA * tr.alpha * tr.trail * 0.5})`;
			ctx.lineWidth = tr.r * 0.5;
			ctx.beginPath();
			ctx.moveTo(tr.x, tr.y);
			ctx.lineTo(tr.x - tr.wobble * tr.speed * 0.15 * k, tr.y - tr.speed * k - 2);
			ctx.stroke();

			// 雫本体
			ctx.fillStyle = `rgba(190,208,232,${RainEffect.TRICKLE_ALPHA * tr.alpha})`;
			ctx.beginPath();
			ctx.ellipse(tr.x, tr.y, tr.r * 0.8, tr.r * 1.15, 0, 0, Math.PI * 2);
			ctx.fill();

			if (tr.y > this.heightCss + 5) {
				this.trickles.splice(i, 1);
			}
		}
	};

	public fadeIn() {
		if (this.destroyed) return;
		window.requestAnimationFrame(() => {
			if (this.destroyed) return;
			this.canvas.style.opacity = '1';
		});
	}

	public fadeOut(onComplete?: () => void) {
		if (this.destroyed) { onComplete?.(); return; }
		this.canvas.style.opacity = '0';
		window.setTimeout(() => onComplete?.(), RainEffect.FADE_MS + 50);
	}

	public stop() {
		if (this.destroyed) return;
		this.destroyed = true;
		if (this.raf) window.cancelAnimationFrame(this.raf);
		window.removeEventListener('resize', this.onWindowResize);
		this.canvas.remove();
	}
}
