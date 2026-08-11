<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady): 初回のテーマ選択モーダル。起動アニメの後・チュートリアルの前に表示。
  デザインは Hatask v2 のテーマ選択(.tpickwrap)を流用し、Hatady 用に再構成。
  テーマ: やわらかい紙 / 夜の書斎(エスプレッソ) / Hataskey準拠。
  表示言語は Hataskey 本体の共通言語設定を使い、Hatady 独自の選択UIは持たない。
  「このテーマではじめる」で saveHatadyDisplay に確定保存(全端末同期)し、次(チュートリアル)へ。
-->
<template>
<Teleport to="body">
	<div :class="$style.overlay">
		<div :class="[$style.wrap, 'hatady-scope']" :data-hatady-theme="sel">
			<div :class="$style.cap">WELCOME TO</div>
			<div :class="$style.logo">Hatady</div>
			<div :class="$style.sub">
				{{ copy.lead }}<br>
				<span :class="$style.sub2">{{ copy.subNote }}</span>
			</div>

			<!-- テーマ -->
			<div :class="$style.segLabel">{{ copy.theme }}</div>
			<div :class="$style.grid">
				<button v-for="th in THEMES" :key="th.id" :class="[$style.tpCard, sel === th.id && $style.tpSel]" @click="sel = th.id">
					<div :class="$style.tpPrev" :style="{ background: th.prevBg, color: th.prevFg }">
						<div :class="$style.pl" :style="{ color: th.accent }">Hatady</div>
						<div :class="$style.pb" :style="{ background: th.accent }"></div>
						<div :class="$style.pt"><i :style="{ background: th.prevFg, opacity: .8 }"></i><i :style="{ background: th.prevFg, opacity: .5 }"></i><i :style="{ background: th.accent }"></i></div>
					</div>
					<div :class="$style.tpName">{{ th.label }}<i :class="['ti', 'ti-check', $style.tpCheck]"></i></div>
					<div :class="$style.tpDesc">{{ th.description }}</div>
				</button>
			</div>

			<button :class="$style.go" @click="confirm"><i class="ti ti-arrow-right"></i> {{ copy.start }}</button>
			<div :class="$style.note">{{ copy.saved }}</div>
		</div>
	</div>
</Teleport>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { i18n } from '@/i18n.js';
import { hatadyTheme, saveHatadyDisplay, type HatadyTheme } from '@/utility/hatady-prefs.js';

const emit = defineEmits<{ (ev: 'done'): void; (ev: 'closed'): void }>();
const copy = i18n.ts._hata._hatady._themeSelect;

const sel = ref<HatadyTheme>(hatadyTheme.value);
const saving = ref(false);

const THEMES = [
	{ id: 'paper' as const, label: copy.paper, description: copy.paperDescription, prevBg: '#f4ecdd', prevFg: '#443a2c', accent: '#d9824a' },
	{ id: 'espresso' as const, label: copy.espresso, description: copy.espressoDescription, prevBg: '#211a14', prevFg: '#fbf3e8', accent: '#f0a94e' },
	{ id: 'hataskey' as const, label: copy.hataskey, description: copy.hataskeyDescription, prevBg: 'var(--MI_THEME-bg)', prevFg: 'var(--MI_THEME-fg)', accent: 'var(--MI_THEME-accent)' },
];

async function confirm() {
	if (saving.value) return;
	saving.value = true;
	try {
		await saveHatadyDisplay(sel.value);
	} catch { /* 保存失敗時もフローは進める(ローカルには反映済み) */ } finally {
		saving.value = false;
		emit('done');
	}
}

</script>

<style lang="scss" module>
.overlay {
	position: fixed; inset: 0; z-index: 3200000;
	background: rgba(0, 0, 0, .66); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
	display: flex; align-items: center; justify-content: center; padding: 16px;
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
}
.wrap {
	width: 520px; max-width: calc(100vw - 32px); max-height: 92vh; overflow-y: auto;
	border-radius: 24px; box-shadow: 0 18px 50px -16px rgba(0,0,0,.5);
	background: var(--hy-surface); color: var(--hy-ink);
	padding: 30px 28px 26px; position: relative;
	animation: hyTsIn .5s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes hyTsIn { from { opacity: 0; transform: scale(.92) translateY(12px); } to { opacity: 1; transform: none; } }
.cap { text-align: center; font-weight: 800; letter-spacing: .26em; font-size: 11px; color: var(--hy-muted); }
.logo { font-family: 'Righteous', system-ui, sans-serif; font-size: 36px; text-align: center; line-height: 1.1; color: var(--hy-accent); }
.sub { font-size: 13.5px; color: var(--hy-body); margin: 8px 0 18px; text-align: center; line-height: 1.6; }
.sub2 { display: inline-block; font-size: 11.5px; color: var(--hy-muted); margin-top: 2px; }

.segLabel { font-family: var(--hy-heading); font-weight: 700; font-size: 11.5px; color: var(--hy-ink); margin: 0 0 8px 2px; }

.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px; }
.tpCard { border: 2px solid transparent; border-radius: 16px; padding: 10px; cursor: pointer; background: var(--hy-surface-2); transition: transform .15s, border-color .15s; font-family: inherit; color: inherit; text-align: left; }
.tpCard:hover { transform: translateY(-3px); }
.tpSel { border-color: var(--hy-accent); }
.tpPrev { border-radius: 10px; height: 92px; padding: 10px; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid var(--hy-border); }
.pl { font-family: 'Righteous', system-ui, sans-serif; font-size: 16px; }
.pb { height: 6px; border-radius: 3px; width: 62%; }
.pt { display: flex; gap: 4px; }
.pt i { width: 15px; height: 5px; border-radius: 2px; display: block; }
.tpName { font-weight: 700; font-size: 13px; margin-top: 9px; display: flex; align-items: center; gap: 5px; color: var(--hy-ink); }
.tpCheck { opacity: 0; color: var(--hy-accent); }
.tpSel .tpCheck { opacity: 1; }
.tpDesc { font-size: 10.5px; color: var(--hy-muted); margin-top: 2px; line-height: 1.45; }

.go { display: flex; align-items: center; justify-content: center; gap: 7px; width: 100%; padding: 14px; border: none; border-radius: 14px; background: linear-gradient(90deg,#e0955a,#d9824a); color: #fff; font-family: var(--hy-heading); font-weight: 700; font-size: 14.5px; cursor: pointer; box-shadow: 0 6px 16px rgba(217,130,74,.4); }
.go:hover { filter: brightness(1.05); }
.note { text-align: center; font-size: 11px; color: var(--hy-muted); margin-top: 10px; }
</style>
