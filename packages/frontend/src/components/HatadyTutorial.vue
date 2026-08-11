<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady 1j): 初回起動チュートリアル(4ページ)。
  アカウントごとに1回だけ表示(レジストリ)。スキップ/完了どちらでも「見た」扱い。
  完了時に実績「Hatadyへようこそ」を解除する(呼び出し側)。
-->
<template>
<Teleport to="body">
	<div v-if="visible" :class="[$style.overlay, 'hatady-scope']" :data-hatady-theme="theme">
		<div :class="$style.card">
			<div :class="$style.hero" :style="{ background: page.bg }">
				<i v-if="page.icon" :class="['ti', page.icon, $style.heroIcon]"></i>
				<span v-else :class="$style.heroEmoji">{{ page.emoji }}</span>
			</div>
			<div :class="$style.content">
				<div :class="$style.dots">
					<span v-for="(_, i) in pages" :key="i" :class="[$style.dot, i === index && $style.dotOn]"></span>
				</div>
				<div v-if="page.kicker" :class="$style.kicker">{{ page.kicker }}</div>
				<div :class="$style.title">{{ page.title }}</div>
				<div :class="$style.desc" v-html="page.desc"></div>
				<div v-if="page.info" :class="$style.info"><i class="ti ti-info-circle"></i> <span v-html="page.info"></span></div>
				<div :class="$style.footer">
					<button v-if="!isLast" :class="$style.next" @click="next">{{ copy.next }} <i class="ti ti-arrow-right"></i></button>
					<button v-else :class="$style.finish" @click="finish"><i class="ti ti-check"></i> {{ copy.begin }}</button>
				</div>
			</div>
		</div>
	</div>
</Teleport>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { i18n } from '@/i18n.js';
import { hatadyTheme } from '@/utility/hatady-prefs.js';

const emit = defineEmits<{ (ev: 'done'): void; (ev: 'closed'): void }>();
const theme = hatadyTheme;
const copy = i18n.ts._hata._hatady._tutorial;

// 旗鯖fork: 起動アニメ＋テーマ選択の後に出す「最後のひとこと」に集約。
//   ① フォローは Hatady の中だけ（始める前に…）→ ② いつでも見返せる、の2ページ構成。
const pages = computed(() => [
	{
		bg: 'linear-gradient(135deg,#6a86b0,#455f8a)', emoji: '', icon: 'ti-users-plus',
		kicker: copy.followKicker,
		title: copy.followTitle,
		desc: copy.followDescription,
		info: copy.followInfo,
	},
	{
		bg: 'linear-gradient(135deg,#e0955a,#d9824a)', emoji: '', icon: 'ti-refresh',
		kicker: '',
		title: copy.revisitTitle,
		desc: copy.revisitDescription,
		info: '',
	},
]);

const index = ref(0);
const visible = ref(true);
const page = computed(() => pages.value[index.value]);
const isLast = computed(() => index.value === pages.value.length - 1);

function next() { if (index.value < pages.value.length - 1) index.value += 1; }
function finish() { emit('done'); }
</script>

<style lang="scss" module>
.overlay {
	position: fixed; inset: 0; z-index: 3200000;
	background: rgba(30, 22, 14, .55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
	display: flex; align-items: center; justify-content: center; padding: 20px;
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
}
.card {
	width: 360px; max-width: 100%;
	background: var(--hy-surface); border-radius: 18px; overflow: hidden;
	box-shadow: 0 20px 60px rgba(0,0,0,.4);
	animation: pop .35s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes pop { from { opacity: 0; transform: scale(.9) translateY(10px); } to { opacity: 1; transform: none; } }
.hero { height: 150px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.heroIcon { font-size: 54px; color: #fff; filter: drop-shadow(0 3px 5px rgba(0,0,0,.2)); }
.heroEmoji { font-size: 46px; filter: drop-shadow(0 3px 5px rgba(0,0,0,.2)); letter-spacing: 4px; }
.content { padding: 20px 22px 22px; }
.dots { display: flex; gap: 5px; margin-bottom: 14px; }
.dot { width: 6px; height: 6px; border-radius: 999px; background: var(--hy-border); transition: all .2s; }
.dotOn { width: 22px; background: var(--hy-accent); }
.kicker { font-size: 11px; font-weight: 800; letter-spacing: .12em; color: var(--hy-accent-ink); margin-bottom: 6px; }
.title { font-family: var(--hy-heading); font-weight: 900; font-size: 19px; color: var(--hy-ink); line-height: 1.4; margin-bottom: 9px; }
.desc { font-size: 13px; line-height: 1.85; color: var(--hy-body); }
.desc :deep(b) { color: var(--hy-accent-ink); }
.info { display: flex; align-items: flex-start; gap: 8px; background: var(--hy-surface-2); border-radius: 9px; padding: 9px 11px; font-size: 11.5px; line-height: 1.6; color: var(--hy-muted); margin-top: 12px; }
.info i { margin-top: 1px; color: var(--hy-accent); }
.footer { display: flex; align-items: center; margin-top: 20px; }
.next, .finish {
	display: inline-flex; align-items: center; justify-content: center; gap: 5px;
	background: linear-gradient(90deg,#e0955a,#d9824a); color: #fff; border: none; border-radius: 999px;
	font-weight: 700; font-family: var(--hy-heading); cursor: pointer; box-shadow: 0 3px 9px rgba(217,130,74,.4);
}
.next { margin-left: auto; padding: 9px 20px; font-size: 13.5px; }
.finish { width: 100%; padding: 11px 20px; font-size: 14px; }
</style>
