<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady): 初回起動 紹介アニメーション(4シーン)。
  初回起動用に定義されたモーション仕様を Vue3 へ忠実移植。
  transform / opacity のみ・外部ライブラリ不使用。
  ① ロゴ＋キャッチ → ② コンセプト(紙めくり) → ③ 機能紹介3枚 → ④ CTA、④→①ループ。
  ◀▶・ドットでジャンプ、下部の ▷/II で一時停止/再開。「はじめる」で次(テーマ選択)へ。
  スキップボタンは無し(初回フローの一部として必ず通す)。
  prefers-reduced-motion もしくはアプリのアニメOFF設定時は自動送りせず最終状態で静止表示。
-->
<template>
<Teleport to="body">
	<div :class="[$style.overlay, 'hatady-scope']" :data-hatady-theme="theme">
		<div :class="$style.stage" :style="stageTokens" :data-hy-reduced="reduced ? '1' : '0'">
			<!-- 罫線の地 -->
			<div :class="$style.ruled"></div>
			<!-- ページ送り矢印 -->
			<button :class="[$style.arrow, $style.arrowL]" :title="t('prev')" @click="prev"><i class="ti ti-chevron-left"></i></button>
			<button :class="[$style.arrow, $style.arrowR]" :title="t('next')" @click="next"><i class="ti ti-chevron-right"></i></button>

			<!-- ===== Scene 1: ロゴ＋キャッチ ===== -->
			<div v-if="scene === 1" :key="'s1-' + runKey" :class="$style.scene" style="align-items:center;justify-content:center;text-align:center;padding:30px 26px 108px;gap:14px;">
				<div :class="$style.logoMark" style="animation:hyMark .75s cubic-bezier(.34,1.56,.64,1) both;"><i class="ti ti-book-2"></i></div>
				<div :class="$style.wordmark" style="animation:hyFadeUp .6s cubic-bezier(.22,.9,.3,1) .34s both;">Hatady</div>
				<div :class="$style.tagline" style="animation:hyFade .6s ease .6s both;">hata ＋ study</div>
				<div :class="$style.catch" style="animation:hyFadeUp .7s cubic-bezier(.22,.9,.3,1) .86s both;">学びを、一冊のノートに。</div>
			</div>

			<!-- ===== Scene 2: コンセプト一文(紙めくり) ===== -->
			<div v-else-if="scene === 2" :key="'s2-' + runKey" :class="$style.scene" style="padding:0;overflow:hidden;">
				<div v-if="!reduced" :class="$style.flipPaper" style="animation:hyFlip .82s cubic-bezier(.62,.02,.34,1) both;"></div>
				<div :class="$style.sceneInner" style="align-items:center;justify-content:center;text-align:center;padding:34px 30px 104px;gap:16px;">
					<div :class="$style.kicker" style="animation:hyFadeUp .5s ease .55s both;">— CONCEPT —</div>
					<div :class="$style.conceptBody" style="animation:hyFadeUp .8s cubic-bezier(.22,.9,.3,1) .68s both;">読んでいる本や学んだことを、<br>本のページをめくるように<br><b>やわらかく記録</b>して振り返る。</div>
				</div>
			</div>

			<!-- ===== Scene 3: 機能紹介3枚 ===== -->
			<div v-else-if="scene === 3" :key="'s3-' + runKey" :class="[$style.scene, $style.sceneFeatures]">
				<div style="text-align:center;animation:hyFadeUp .5s ease 0s both;">
					<div :class="$style.featKicker">FEATURES</div>
					<div :class="$style.featTitle">Hatady でできること</div>
				</div>
				<div :class="$style.cardsWrap">
					<!-- マイログ -->
					<div :class="$style.fcard" style="animation:hyCardIn .55s cubic-bezier(.22,.9,.3,1) 0s both;">
						<div :class="$style.fcardHead">
							<span :class="$style.fcardIcon"><i class="ti ti-pencil"></i></span>
							<span :class="$style.fcardName">マイログ</span>
							<span :class="$style.fcardFlame">🔥 24</span>
						</div>
						<div :class="$style.fcardDesc">学びを時系列で記録。ヒートマップで継続を可視化。</div>
						<div style="display:flex;justify-content:center;gap:3px;margin-top:2px;max-width:100%;">
							<div v-for="(col, ci) in heatColumns" :key="ci" style="display:flex;flex-direction:column;gap:3px;">
								<span v-for="(cell, ri) in col" :key="ri" :style="cell"></span>
							</div>
						</div>
					</div>
					<!-- 本棚 -->
					<div :class="$style.fcard" style="animation:hyCardIn .55s cubic-bezier(.22,.9,.3,1) .16s both;">
						<div :class="$style.fcardHead">
							<span :class="$style.fcardIcon"><i class="ti ti-books"></i></span>
							<span :class="$style.fcardName">本棚</span>
						</div>
						<div :class="$style.fcardDesc">自動生成カバーの本。しおりで栞のページを記録。</div>
						<div style="position:relative;display:flex;align-items:flex-end;justify-content:center;gap:6px;padding:8px 2px 12px;max-width:100%;">
							<div v-for="(bk, bi) in books" :key="bi" style="position:relative;">
								<span v-if="bk.hasRibbon" :style="bk.ribbonStyle"></span>
								<span :style="bk.coverStyle"><span :style="bk.titleStyle">{{ bk.title }}</span></span>
							</div>
							<span :class="$style.shelfBar"></span>
						</div>
					</div>
					<!-- 見つける -->
					<div :class="$style.fcard" style="animation:hyCardIn .55s cubic-bezier(.22,.9,.3,1) .32s both;">
						<div :class="$style.fcardHead">
							<span :class="$style.fcardIcon"><i class="ti ti-compass"></i></span>
							<span :class="$style.fcardName">見つける</span>
						</div>
						<div :class="$style.fcardDesc">みんなの学習を覗いて、刺激をもらう。</div>
						<div style="display:flex;flex-direction:column;gap:7px;">
							<div v-for="(f, fi) in feedRows" :key="fi" :style="f.rowStyle">
								<span :style="f.avatarStyle"></span>
								<div style="min-width:0;flex:1;text-align:left;">
									<div style="display:flex;align-items:center;gap:6px;">
										<span :class="$style.feedName">{{ f.name }}</span>
										<span :style="f.badgeStyle">{{ f.subject }}</span>
									</div>
									<div :class="$style.feedBody">{{ f.body }}</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- ===== Scene 4: CTA ===== -->
			<div v-else :key="'s4-' + runKey" :class="$style.scene" style="align-items:center;justify-content:center;text-align:center;padding:30px 28px 108px;gap:14px;">
				<div :class="$style.ink" :style="reduced ? { opacity: .4 } : { animation: 'hyInk 1.1s cubic-bezier(.3,.7,.3,1) .1s both' }"></div>
				<div :class="$style.ctaMark" :style="anim('hyPop .6s cubic-bezier(.34,1.56,.64,1) .15s both')"><i class="ti ti-book-2"></i></div>
				<div :class="$style.ctaHead" :style="anim('hyFadeUp .6s cubic-bezier(.22,.9,.3,1) .4s both')">さあ、最初のページを<br>開こう。</div>
				<div :class="$style.ctaSub" :style="anim('hyFadeUp .6s ease .58s both')">あなたの学びを、今日からここに記録していきます。</div>
			</div>

			<!-- ===== フッター: ドット / 一時停止 / はじめる ===== -->
			<div :class="$style.footer">
				<div style="display:flex;gap:6px;align-items:center;">
					<span v-for="n in 4" :key="n" :class="[$style.dot, scene === n && $style.dotOn]" @click="goTo(n)"></span>
				</div>
				<div style="display:flex;gap:10px;align-items:center;">
					<button v-if="!reduced" :class="$style.pauseBtn" :title="paused ? t('resume') : t('pause')" @click="togglePause"><i :class="['ti', paused ? 'ti-player-play-filled' : 'ti-player-pause-filled']"></i></button>
					<button :class="$style.startBtn" @click="start">{{ t('start') }} <i class="ti ti-arrow-right"></i></button>
				</div>
			</div>
		</div>
	</div>
</Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { hatadyTheme, hatadyEffectiveLang } from '@/utility/hatady-prefs.js';
import { prefer } from '@/preferences.js';

const emit = defineEmits<{ (ev: 'start'): void; (ev: 'closed'): void }>();
const theme = hatadyTheme;
const lang = hatadyEffectiveLang;

// アニメOFF: アプリ設定(アニメ無効) or OS の prefers-reduced-motion。
let osReduce = false;
try { osReduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { /* noop */ }
const reduced = computed(() => !prefer.s.animation || osReduce);

// PC/モバイルでヒートマップ列数・本の大きさを変える(初期幅で判定)。
const pc = ref(true);

const scene = ref<1 | 2 | 3 | 4>(1);
const paused = ref(false);
const runKey = ref(0);
let runId = 0;
const timers: ReturnType<typeof setTimeout>[] = [];

const DURATION: Record<number, number> = { 1: 4200, 2: 5200, 3: 5400, 4: 4600 };

function clear() { timers.forEach(t => clearTimeout(t)); timers.length = 0; }
function arm(n: number) {
	if (reduced.value) return; // 動きOFF: 自動送りなし
	const my = runId;
	const dur = DURATION[n] || 4600;
	timers.push(setTimeout(() => { if (my === runId) goTo(n >= 4 ? 1 : n + 1); }, dur));
}
function goTo(n: number) {
	clear();
	runId += 1;
	runKey.value += 1;
	paused.value = false;
	scene.value = n as 1 | 2 | 3 | 4;
	arm(n);
}
function next() { goTo(scene.value >= 4 ? 1 : scene.value + 1); }
function prev() { goTo(scene.value <= 1 ? 4 : scene.value - 1); }
function pause() { clear(); runId += 1; paused.value = true; }
function resume() { runId += 1; paused.value = false; arm(scene.value); }
function togglePause() { if (paused.value) resume(); else pause(); }

function start() { clear(); emit('start'); }

// reduced 用: reduced のときは animation を付けない。
function anim(str: string): Record<string, string> { return reduced.value ? {} : { animation: str }; }

onMounted(() => {
	// 3枚横並び(カード幅)に本棚5冊が収まる幅の目安 820px を境に PC/モバイル扱いを切替。
	try { pc.value = window.innerWidth > 820; } catch { /* noop */ }
	goTo(1);
});
onUnmounted(() => clear());

// ===== ステージのテーマ拡張トークン(グローバル .hatady-scope に無い --hy-page / --hy-heat0) =====
const stageTokens = computed<Record<string, string>>(() => {
	if (theme.value === 'espresso') return { '--hy-page': '#2b2119', '--hy-heat0': 'rgba(255,255,255,.06)' };
	if (theme.value === 'hataskey') return { '--hy-page': 'var(--MI_THEME-bg)', '--hy-heat0': 'color-mix(in srgb, var(--MI_THEME-fg) 8%, transparent)' };
	return { '--hy-page': '#fbf3e2', '--hy-heat0': 'rgba(96,70,35,.09)' };
});

// ===== ヒートマップ(波状点灯) =====
const HEAT = ['var(--hy-heat0)', '#eddcc4', '#eaca9d', '#e0a465', '#d9824a'];
const heatColumns = computed(() => {
	const cols = pc.value ? 12 : 11, rows = 7, cs = pc.value ? 13 : 9;
	const out: Record<string, string>[][] = [];
	for (let c = 0; c < cols; c++) {
		const colArr: Record<string, string>[] = [];
		for (let r = 0; r < rows; r++) {
			let lv = (c * 3 + r * 5 + (c % 4) + (r % 3) * 2) % 5;
			if (c > cols - 4 && lv < 2) lv++;
			if ((c + r) % 7 === 0) lv = Math.max(lv, 3);
			const delay = (0.55 + (c + r) * 0.04).toFixed(2);
			colArr.push({ width: cs + 'px', height: cs + 'px', borderRadius: '2px', background: HEAT[lv], animation: `hyCell .42s cubic-bezier(.34,1.56,.64,1) ${delay}s both` });
		}
		out.push(colArr);
	}
	return out;
});

// ===== 本(1冊ずつ立ち上がる)＋しおり =====
const COVERS = [['#5a8a6a', '#3f6e4f'], ['#b57f4a', '#8a5a2e'], ['#45688f', '#2f4a6b'], ['#8a5a91', '#5f3a66'], ['#c07a4a', '#9a5730']];
const BT = ['夜と霧', '思考の整理学', '数学ガール', '独学の技法', 'Grammar in Use'];
const books = computed(() => {
	const bw = pc.value ? 32 : 30, bh = Math.round(bw * 1.36);
	return BT.map((title, i) => {
		const d = (0.85 + i * 0.13).toFixed(2);
		const g = COVERS[i % COVERS.length];
		return {
			title, hasRibbon: i === 2,
			coverStyle: { width: bw + 'px', height: bh + 'px', borderRadius: '2px 3px 3px 2px', background: `linear-gradient(135deg,${g[0]},${g[1]})`, boxShadow: '1px 2px 5px rgba(0,0,0,.28)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: pc.value ? '6px 6px 8px' : '4px 4px 5px', boxSizing: 'border-box', transformOrigin: 'bottom center', position: 'relative', animation: `hyBook .5s cubic-bezier(.34,1.5,.6,1) ${d}s both` } as Record<string, string>,
			titleStyle: { fontFamily: "'Noto Serif JP',serif", fontWeight: '600', fontSize: pc.value ? '7px' : '6.5px', lineHeight: '1.22', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.4)', display: '-webkit-box', WebkitLineClamp: '4', WebkitBoxOrient: 'vertical', overflow: 'hidden' } as Record<string, string>,
			ribbonStyle: { position: 'absolute', top: '-8px', left: pc.value ? '10px' : '9px', width: pc.value ? '7px' : '6px', height: pc.value ? '22px' : '19px', background: '#e08a3c', zIndex: '4', borderRadius: '2px 2px 0 0', clipPath: 'polygon(0 0,100% 0,100% 100%,50% 78%,0 100%)', boxShadow: '0 1px 2px rgba(0,0,0,.3)', animation: 'hyRibbon .6s cubic-bezier(.34,1.5,.6,1) 1.5s both' } as Record<string, string>,
		};
	});
});

// ===== みんなの学習フィード =====
const SUB = [{ s: '読書', c: '#8a5a91', bg: '#ece0ec' }, { s: '数学', c: '#45688f', bg: '#e3ebf3' }];
const FN = ['@mika', '@ren'], AV = ['#c07a4a', '#5a8a6a'], FB = ['『夜と霧』3章。極限での意味づけに触れた。', '線形代数、固有値の直感がやっと掴めた回。'];
const feedRows = computed(() => [0, 1].map(i => {
	const d = (1.0 + i * 0.16).toFixed(2);
	return {
		name: FN[i], subject: SUB[i].s, body: FB[i],
		rowStyle: { display: 'flex', gap: '8px', alignItems: 'flex-start', padding: pc.value ? '8px 9px' : '7px 8px', background: 'var(--hy-surface-2)', borderRadius: '9px', borderLeft: `3px solid ${SUB[i].c}`, animation: `hyFeed .5s cubic-bezier(.22,.9,.3,1) ${d}s both` },
		avatarStyle: { width: pc.value ? '22px' : '18px', height: pc.value ? '22px' : '18px', borderRadius: '999px', background: AV[i], flexShrink: '0' },
		badgeStyle: { display: 'inline-flex', alignItems: 'center', fontSize: pc.value ? '9px' : '8px', fontWeight: '700', padding: '1px 7px', borderRadius: '999px', background: SUB[i].bg, color: SUB[i].c },
	};
}));

const DICT: Record<string, { ja: string; en: string }> = {
	start: { ja: 'はじめる', en: 'Start' },
	prev: { ja: '前のページ', en: 'Previous' },
	next: { ja: '次のページ', en: 'Next' },
	pause: { ja: '一時停止', en: 'Pause' },
	resume: { ja: '再開', en: 'Resume' },
};
function t(key: string): string { return DICT[key]?.[lang.value] ?? key; }
</script>

<style lang="scss" module>
.overlay {
	position: fixed; inset: 0; z-index: 3200000;
	background: rgba(30, 22, 14, .62); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
	display: flex; align-items: center; justify-content: center; padding: 18px;
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
}
.stage {
	position: relative; overflow: hidden;
	width: min(940px, 94vw); height: min(86vh, 600px);
	border-radius: 20px;
	background: var(--hy-bg); color: var(--hy-body);
	box-shadow: 0 30px 70px -20px rgba(40,26,12,.5), 0 6px 18px rgba(40,26,12,.2);
	border: 1px solid rgba(0,0,0,.06);
}
.ruled { position: absolute; inset: 0; background-image: repeating-linear-gradient(transparent, transparent 31px, var(--hy-border) 31px, var(--hy-border) 32px); opacity: .45; pointer-events: none; z-index: 1; }

.arrow { position: absolute; top: 50%; transform: translateY(-50%); z-index: 46; width: 38px; height: 38px; border-radius: 999px; display: flex; align-items: center; justify-content: center; background: var(--hy-surface); border: 1px solid var(--hy-border); color: var(--hy-body); font-size: 20px; cursor: pointer; box-shadow: 0 3px 10px rgba(40,26,12,.18); opacity: .94; }
.arrowL { left: 8px; }
.arrowR { right: 8px; }

.scene, .sceneInner { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; }
.sceneInner { z-index: 5; }

/* Scene1 */
.logoMark { width: 78px; height: 78px; border-radius: 20px; background: linear-gradient(135deg,#e79b5e,#d9824a); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 40px; box-shadow: 0 12px 28px rgba(217,130,74,.42); }
.wordmark { font-family: 'Righteous', cursive; font-size: 56px; line-height: 1; color: var(--hy-accent); letter-spacing: .02em; }
.tagline { font-size: 12px; font-weight: 700; letter-spacing: .32em; color: var(--hy-muted); text-transform: uppercase; }
.catch { font-family: var(--hy-heading); font-weight: 700; font-size: 20px; color: var(--hy-ink); margin-top: 6px; }

/* Scene2 */
.flipPaper { position: absolute; inset: 0; transform-origin: left center; background: var(--hy-page); background-image: repeating-linear-gradient(transparent, transparent 27px, var(--hy-border) 27px, var(--hy-border) 28px); box-shadow: 16px 0 34px -8px rgba(0,0,0,.28); z-index: 3; backface-visibility: hidden; pointer-events: none; }
.kicker { font-size: 11px; font-weight: 800; letter-spacing: .3em; color: var(--hy-accent-ink); }
.conceptBody { font-family: var(--hy-serif); font-size: 24px; line-height: 2; color: var(--hy-ink); max-width: 620px; }
.conceptBody b { color: var(--hy-accent-ink); font-weight: 700; }

/* Scene3 */
.sceneFeatures { align-items: center; justify-content: center; padding: 18px 40px 108px; gap: 14px; }
.featKicker { font-size: 11px; font-weight: 800; letter-spacing: .26em; color: var(--hy-accent-ink); }
.featTitle { font-family: var(--hy-heading); font-weight: 900; font-size: 20px; color: var(--hy-ink); margin-top: 3px; }
.cardsWrap { display: flex; gap: 13px; width: 100%; max-width: 880px; align-items: stretch; }
.fcard { flex: 1; min-width: 0; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 14px; padding: 15px 15px 16px; box-shadow: 0 3px 10px rgba(96,70,35,.09); display: flex; flex-direction: column; gap: 9px; }
.fcardHead { display: flex; align-items: center; gap: 8px; }
.fcardIcon { width: 24px; height: 24px; border-radius: 7px; background: color-mix(in srgb, var(--hy-accent) 16%, transparent); color: var(--hy-accent-ink); display: flex; align-items: center; justify-content: center; font-size: 15px; }
.fcardName { font-family: var(--hy-heading); font-weight: 800; font-size: 14px; color: var(--hy-ink); }
.fcardFlame { margin-left: auto; font-size: 12px; font-weight: 800; color: var(--hy-accent); }
.fcardDesc { font-size: 11px; line-height: 1.55; color: var(--hy-muted); }
.shelfBar { position: absolute; left: -4px; right: -4px; bottom: 2px; height: 4px; border-radius: 2px; background: var(--hy-border); }
.feedName { font-family: var(--hy-heading); font-weight: 800; font-size: 11px; color: var(--hy-ink); }
.feedBody { font-size: 10px; line-height: 1.5; color: var(--hy-body); margin-top: 3px; }

/* Scene4 */
.ink { position: absolute; left: 50%; top: 42%; width: 440px; height: 440px; margin-left: -220px; margin-top: -220px; border-radius: 999px; background: radial-gradient(circle, color-mix(in srgb, var(--hy-accent) 34%, transparent) 0%, transparent 68%); filter: blur(6px); z-index: 1; pointer-events: none; }
.ctaMark { width: 70px; height: 70px; border-radius: 18px; background: linear-gradient(135deg,#e79b5e,#d9824a); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 36px; box-shadow: 0 10px 24px rgba(217,130,74,.4); position: relative; z-index: 2; }
.ctaHead { font-family: var(--hy-heading); font-weight: 900; font-size: 27px; color: var(--hy-ink); text-align: center; line-height: 1.5; position: relative; z-index: 2; }
.ctaSub { font-size: 14px; color: var(--hy-body); text-align: center; line-height: 1.7; max-width: 340px; position: relative; z-index: 2; }

/* Footer */
.footer { position: absolute; left: 0; right: 0; bottom: 0; z-index: 45; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 14px 0 16px; background: linear-gradient(to top, var(--hy-bg) 58%, transparent); }
.dot { height: 6px; width: 6px; border-radius: 999px; background: var(--hy-border); transition: all .3s; cursor: pointer; }
.dotOn { width: 22px; background: var(--hy-accent); }
.pauseBtn { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 999px; background: var(--hy-surface); border: 1px solid var(--hy-border); color: var(--hy-body); font-size: 18px; cursor: pointer; box-shadow: 0 3px 10px rgba(40,26,12,.14); }
.startBtn { display: inline-flex; align-items: center; gap: 7px; background: linear-gradient(90deg,#e0955a,#d9824a); color: #fff; border: none; border-radius: 999px; padding: 11px 30px; font-family: var(--hy-heading); font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 6px 16px rgba(217,130,74,.42); }
.startBtn:hover { filter: brightness(1.05); }

/* 狭い画面: 機能カードを縦積み(3枚横並びだと本棚5冊が収まらないため) */
@media (max-width: 820px) {
	.cardsWrap { flex-direction: column; gap: 11px; max-width: 100%; }
}
/* モバイル: ステージを縦長に・見出しを縮小 */
@media (max-width: 700px) {
	.stage { width: 94vw; height: min(88vh, 720px); border-radius: 26px; }
	.wordmark { font-size: 46px; }
	.conceptBody { font-size: 20px; }
	.ctaHead { font-size: 23px; }
	/* 機能3枚は縦積みでステージ高を超えやすい。上端で始めてはみ出しはスクロール可(=ちぎれ防止)、
	   併せてカードを詰めて多くの端末で1画面に収める。 */
	.sceneFeatures { justify-content: flex-start; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 16px 14px 96px; gap: 9px; }
	.featTitle { font-size: 18px; }
	.fcard { padding: 11px 12px 12px; gap: 6px; }
	.fcardDesc { font-size: 10.5px; }
}
</style>

<!-- 旗鯖fork: 起動アニメ用 @keyframes(transform/opacity のみ・GPU合成)。
     module 化するとハッシュ名になりインライン animation から参照できないため、あえてグローバル。 -->
<style lang="scss">
@keyframes hyFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes hyFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes hyPop { from { opacity: 0; transform: scale(.72); } to { opacity: 1; transform: none; } }
@keyframes hyMark { 0% { opacity: 0; transform: scale(.5) rotate(-8deg); } 60% { opacity: 1; transform: scale(1.08) rotate(2deg); } 100% { opacity: 1; transform: none; } }
@keyframes hyCell { from { opacity: 0; transform: scale(.3); } to { opacity: 1; transform: none; } }
@keyframes hyBook { 0% { opacity: 0; transform: translateY(24px) rotate(-16deg); } 60% { opacity: 1; } 100% { opacity: 1; transform: none; } }
@keyframes hyRibbon { 0% { opacity: 0; transform: translateY(-32px); } 55% { opacity: 1; transform: translateY(3px); } 100% { opacity: 1; transform: none; } }
@keyframes hyCardIn { from { opacity: 0; transform: translateY(26px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes hyFlip { 0% { transform: rotateY(6deg); } 100% { transform: rotateY(-168deg); } }
@keyframes hyInk { 0% { opacity: 0; transform: scale(0); } 45% { opacity: .55; } 100% { opacity: .4; transform: scale(1); } }
@keyframes hyFeed { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: none; } }
/* 動きOFF: 配下の全アニメ停止し最終状態で静止 */
[data-hy-reduced="1"] * { animation: none !important; }
</style>
