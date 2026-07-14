<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady 1j): 初回起動チュートリアル(4ページ)。
  アカウントごとに1回だけ表示(レジストリ)。スキップ/完了どちらでも「見た」扱い。
  完了時に実績「Hatadyへようこそ」を解除する(呼び出し側)。
-->
<template>
<Teleport to="body">
	<div v-if="visible" :class="[$style.overlay, 'hatady-scope']" :data-hatady-theme="theme" @click.self="skip">
		<div :class="$style.card">
			<div :class="$style.hero" :style="{ background: page.bg }">
				<i v-if="page.icon" :class="['ti', page.icon, $style.heroIcon]"></i>
				<span v-else :class="$style.heroEmoji">{{ page.emoji }}</span>
			</div>
			<div :class="$style.content">
				<div :class="$style.dots">
					<span v-for="(_, i) in pages" :key="i" :class="[$style.dot, i === index && $style.dotOn]"></span>
				</div>
				<div :class="$style.title">{{ page.title }}</div>
				<div :class="$style.desc" v-html="page.desc"></div>
				<div v-if="page.info" :class="$style.info"><i class="ti ti-info-circle"></i> <span v-html="page.info"></span></div>
				<div :class="$style.footer">
					<template v-if="!isLast">
						<button :class="$style.skip" @click="skip">{{ t('skip') }}</button>
						<button :class="$style.next" @click="next">{{ index === 0 ? t('start') : t('nextBtn') }} <i class="ti ti-arrow-right"></i></button>
					</template>
					<button v-else :class="$style.finish" @click="finish"><i class="ti ti-check"></i> {{ t('begin') }}</button>
				</div>
			</div>
		</div>
	</div>
</Teleport>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import * as os from '@/os.js';
import { hatadyTheme, hatadyLang } from '@/utility/hatady-prefs.js';

const emit = defineEmits<{ (ev: 'done'): void; (ev: 'closed'): void }>();
const theme = hatadyTheme;
const lang = hatadyLang;
const en = computed(() => lang.value === 'en');

const DICT: Record<string, { ja: string; en: string }> = {
	skip: { ja: 'スキップ', en: 'Skip' },
	skippedTitle: { ja: 'チュートリアルをスキップしました', en: 'Tutorial skipped' },
	skippedText: { ja: 'あとから Hatady の設定（表示設定 → チュートリアルを再度実行）から、いつでもチュートリアルを実行できます。', en: 'You can replay the tutorial anytime from Hatady settings (Display settings → Replay tutorial).' },
	start: { ja: 'はじめる', en: 'Start' },
	nextBtn: { ja: '次へ', en: 'Next' },
	begin: { ja: 'Hatady を始める', en: 'Start Hatady' },
};
function t(key: string): string { return DICT[key]?.[en.value ? 'en' : 'ja'] ?? key; }

const pages = computed(() => [
	{
		bg: 'linear-gradient(135deg,#f0b46a,#d9824a)', emoji: '📖', icon: '',
		title: en.value ? 'Welcome to Hatady' : 'Hatady へようこそ',
		desc: en.value
			? '"hata + study." A gentle study journal to record the books you read and what you learn — and look back like turning pages.'
			: '「hata + study」。<br>これは、読んでいる本や学んだことを、本のページをめくるように<b>やわらかく記録</b>して振り返れる学習ノートツールです',
		info: '',
	},
	{
		bg: 'linear-gradient(135deg,#7ba97f,#4e7d4a)', emoji: '', icon: 'ti-pencil-plus',
		title: en.value ? 'Record what you learn' : '学んだことを記録しよう',
		desc: en.value
			? 'Note the subject, book, study time and memo, and it stacks up on a <b>daily timeline</b>. Tag your <b>strengths, weak spots and interests</b> to see your tendencies. Keep it up and your streak grows.'
			: '分野・読んだ本・学習時間・メモを残すと、<b>日付ごとのタイムライン</b>に積み上がります。<br><b>得意・苦手・興味</b>のタグで自分の傾向も見えてきます。毎日続けると連続記録が伸びます',
		info: '',
	},
	{
		bg: 'linear-gradient(135deg,#e0955a,#c96f8a)', emoji: '👏🎉🧠', icon: '',
		title: en.value ? 'Share your learning' : 'みんなと学びを共有',
		desc: en.value
			? 'You can make logs public server-wide and cheer each other on with <b>custom emoji</b> reactions and comments. Peek at others\' study for inspiration.'
			: '学びはサーバー全体に公開でき、<b>カスタム絵文字</b>でお互いにリアクションしたりコメントで応援し合えます。<br>他の人の学習を覗いて刺激をもらいましょう',
		info: '',
	},
	{
		bg: 'linear-gradient(135deg,#6a86b0,#455f8a)', emoji: '', icon: 'ti-users-plus',
		title: en.value ? 'Follows stay inside Hatady' : 'フォローは Hatady の中だけ',
		desc: en.value
			? 'Hatady follows are <b>independent from your hataskey follows</b>. Following someone here does not affect your hataskey timeline. <b>Study connections stay within Hatady.</b>'
			: 'Hatady のフォローは <b>hataskey 本体のフォローとは独立</b>しています。ここで誰かをフォローしても、hataskey のタイムラインには影響しません。<b>学びのつながりは Hatady の中で完結</b>します',
		info: en.value
			? 'Likewise, people you follow on the server do not automatically appear in Hatady.'
			: '逆に、サーバーでフォローしている人が Hatady でも表示されるわけではありません',
	},
]);

const index = ref(0);
const visible = ref(true);
const page = computed(() => pages.value[index.value]);
const isLast = computed(() => index.value === pages.value.length - 1);

function next() { if (index.value < pages.value.length - 1) index.value += 1; }
// スキップ時は「あとから設定で再実行できる」ことを案内してから閉じる。
//   オーバーレイ(z-index が高い)を先に隠さないと案内ダイアログが背面に出て操作できないため、先に非表示にする。
async function skip() {
	visible.value = false;
	await os.alert({ type: 'info', title: t('skippedTitle'), text: t('skippedText') });
	emit('done');
}
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
.title { font-family: var(--hy-heading); font-weight: 900; font-size: 19px; color: var(--hy-ink); line-height: 1.4; margin-bottom: 9px; }
.desc { font-size: 13px; line-height: 1.85; color: var(--hy-body); }
.desc :deep(b) { color: var(--hy-accent-ink); }
.info { display: flex; align-items: flex-start; gap: 8px; background: var(--hy-surface-2); border-radius: 9px; padding: 9px 11px; font-size: 11.5px; line-height: 1.6; color: var(--hy-muted); margin-top: 12px; }
.info i { margin-top: 1px; color: var(--hy-accent); }
.footer { display: flex; align-items: center; margin-top: 20px; }
.skip { background: none; border: none; font-size: 12.5px; font-weight: 600; color: var(--hy-muted); cursor: pointer; }
.skip:hover { color: var(--hy-body); }
.next, .finish {
	display: inline-flex; align-items: center; justify-content: center; gap: 5px;
	background: linear-gradient(90deg,#e0955a,#d9824a); color: #fff; border: none; border-radius: 999px;
	font-weight: 700; font-family: var(--hy-heading); cursor: pointer; box-shadow: 0 3px 9px rgba(217,130,74,.4);
}
.next { margin-left: auto; padding: 9px 20px; font-size: 13.5px; }
.finish { width: 100%; padding: 11px 20px; font-size: 14px; }
</style>
