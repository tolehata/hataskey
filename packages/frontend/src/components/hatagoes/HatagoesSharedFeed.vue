<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<div ref="root" class="hgsf" :style="{ '--feed-height': `${surfaceHeight}px` }">
	<div class="hgsf-intro"><span class="hgsf-kicker"><i class="ti ti-users" aria-hidden="true"></i> みんなのきょう</span><h2>日々のひとこまを、もう少し。</h2><p>みんなの本、おはな、ごはん、イシュー。</p><button v-if="items.length" type="button" class="hgsf-stack" @click="toFeed"><span><i :class="items[0].icon" aria-hidden="true"></i> {{ items[0].label }}</span><strong>{{ items[0].title }}</strong><small>下へスクロールして見る <i class="ti ti-arrow-down" aria-hidden="true"></i></small></button></div>
	<div ref="cards" class="hgsf-cards">
		<article v-for="(item, index) in items" :key="item.id" class="hgsf-card" :data-source="item.source">
			<i :class="['hgsf-art', item.icon]" aria-hidden="true"></i><span class="hgsf-pos">{{ index + 1 }}<template v-if="ended"> / {{ items.length }}</template></span>
			<span class="hgsf-tag"><i :class="item.icon" aria-hidden="true"></i>{{ item.label }}<b>· {{ item.app }}</b></span>
			<div class="hgsf-author"><MkAvatar v-if="item.user" class="hgsf-avatar" :user="item.user" :showIndicator="false"/><span v-else class="hgsf-avatar hgsf-anonymous"><i class="ti ti-user" aria-hidden="true"></i></span><span><strong>{{ item.user?.name || item.user?.username || '投稿者' }}</strong><time v-if="validDate(item.date)" :datetime="item.date">{{ dateLabel(item.date) }}</time></span></div>
			<HataskEmoji v-if="item.emoji" class="hgsf-flower" :emoji="item.emoji"/>
			<h2>{{ item.title }}</h2>
			<details v-if="item.spoiler && item.body" class="hgsf-body"><summary>ネタバレを含む記録を見る</summary><p>{{ item.body }}</p></details><p v-else-if="item.body" class="hgsf-body">{{ item.body }}</p>
			<div v-if="item.chips.length" class="hgsf-chips"><span v-for="chip in item.chips" :key="chip">{{ chip }}</span></div>
			<div class="hgsf-actions"><button type="button" @click="emit('navigate', item.path)"><span><i :class="item.icon" aria-hidden="true"></i> {{ actionLabels[item.source] }}</span><i class="ti ti-arrow-up-right" aria-hidden="true"></i></button></div>
		</article>
	</div>
	<div ref="sentinel" class="hgsf-tail">
		<p v-if="loading" role="status">読み込み中…</p>
		<template v-else-if="errors.length"><p role="alert">{{ errors.map(source => sourceLabels[source]).join('・') }}を読み込めませんでした。</p><button type="button" @click="load">再試行</button></template>
		<template v-else-if="ended"><i class="ti ti-circle-check" aria-hidden="true"></i><p>{{ items.length ? 'いま見られる記録は、ここまで。' : '共有された記録はまだありません。' }}</p><button type="button" @click="scrollToTop">ホームへ戻る <i class="ti ti-arrow-up" aria-hidden="true"></i></button></template>
		<button v-else type="button" @click="load">続きを見る <i class="ti ti-arrow-down" aria-hidden="true"></i></button>
	</div>
</div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { HatagoesFeedItem, HatagoesFeedSource } from '@/utility/hatagoes-shared-feed.js';
import MkAvatar from '@/components/global/MkAvatar.vue';
import HataskEmoji from '@/components/HataskEmoji.vue';
import { createHatagoesFeedPager } from '@/utility/hatagoes-shared-feed.js';

const props = defineProps<{ active: boolean; revision: number }>();
const emit = defineEmits<{ navigate: [path: string]; feedState: [active: boolean] }>();
const root = ref<HTMLElement>();
const cards = ref<HTMLElement>();
const sentinel = ref<HTMLElement>();
const items = ref<HatagoesFeedItem[]>([]);
const loading = ref(false), ended = ref(false), errors = ref<HatagoesFeedSource[]>([]);
const surfaceHeight = ref(650);
const actionLabels: Record<HatagoesFeedSource, string> = { activity: '記録を見る', book: '本をひらく', flower: 'おはなを見る', recipe: 'レシピをひらく', issue: 'イシューを見る' };
const sourceLabels: Record<HatagoesFeedSource, string> = { activity: '記録', book: '本', flower: 'おはな', recipe: 'レシピ', issue: 'イシュー' };
const validDate = (value: string) => !!value && Number.isFinite(Date.parse(value));
const dateLabel = (value: string) => new Date(value).toLocaleString('ja-JP', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
let pager = createHatagoesFeedPager(), generation = 0, loadedRevision = -1;
let scrollRoot: HTMLElement | undefined;
let observer: IntersectionObserver | undefined, resizeObserver: ResizeObserver | undefined;
let frame = 0, feedActive = false, mounted = false;

function scrollToTop() { scrollRoot?.scrollTo({ top: 0, behavior: 'smooth' }); }

function toFeed() { if (scrollRoot && cards.value) scrollRoot.scrollTo({ top: scrollRoot.scrollTop + cards.value.getBoundingClientRect().top - scrollRoot.getBoundingClientRect().top, behavior: 'smooth' }); }

defineExpose({ scrollToTop });

function measure() {
	frame = 0;
	if (!scrollRoot || !root.value || !cards.value) return;
	surfaceHeight.value = scrollRoot.clientHeight;
	const bounds = scrollRoot.getBoundingClientRect(), listBounds = cards.value.getBoundingClientRect();
	const active = props.active && items.value.length > 0 && listBounds.top <= bounds.top + bounds.height * 0.4 && root.value.getBoundingClientRect().bottom > bounds.top;
	if (active !== feedActive) { feedActive = active; emit('feedState', active); }
}

function onScroll() { if (!frame) frame = requestAnimationFrame(measure); }

function connect() {
	let parent = root.value?.parentElement;
	while (parent && !/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) parent = parent.parentElement;
	if (!parent) return;
	scrollRoot = parent;
	scrollRoot.addEventListener('scroll', onScroll, { passive: true });
	resizeObserver = new ResizeObserver(onScroll); resizeObserver.observe(scrollRoot);
	observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting) && props.active && !loading.value && !ended.value && !errors.value.length) void load(); }, { root: scrollRoot, rootMargin: '300px 0px' });
	if (sentinel.value) observer.observe(sentinel.value);
	measure();
}

async function load() {
	if (!props.active || loading.value || ended.value) return;
	const current = generation;
	loading.value = true;
	try {
		const result = await pager.load();
		if (current !== generation) return;
		items.value.push(...result.items); errors.value = result.errors; ended.value = result.ended;
	} finally { if (current === generation) loading.value = false; }
	await nextTick(); measure();
}

function refresh() {
	if (!mounted || !props.active || loadedRevision === props.revision) return;
	loadedRevision = props.revision; generation++; pager = createHatagoesFeedPager(); items.value = []; errors.value = []; ended.value = false; loading.value = false;
	void load();
}

watch(() => [props.active, props.revision], () => { refresh(); onScroll(); });
onMounted(() => { mounted = true; connect(); refresh(); });
onUnmounted(() => { mounted = false; generation++; observer?.disconnect(); resizeObserver?.disconnect(); scrollRoot?.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame); emit('feedState', false); });
</script>

<style scoped lang="scss">
.hgsf { --hgo-fg: var(--fg, var(--MI_THEME-fg)); --hgo-muted: var(--fg-2, var(--MI_THEME-fg)); --hgo-accent: var(--accent, var(--MI_THEME-accent)); --hgo-on-accent: var(--on-accent, var(--MI_THEME-fgOnAccent)); --hgo-line: var(--rule, var(--MI_THEME-divider)); --hgo-panel: var(--surface, var(--MI_THEME-panel)); --hgo-bg: var(--bg, var(--MI_THEME-bg)); --hgo-soft: color-mix(in srgb, var(--hgo-accent) 8%, var(--hgo-panel)); color: var(--hgo-fg); min-width: 0; }
.hgsf-intro { padding: 28px 0 34px; max-width: 640px; margin: auto; text-align: center; }
.hgsf-kicker { display: inline-flex; align-items: center; gap: 8px; color: var(--hgo-muted); font-size: 12px; font-weight: 800; }
.hgsf-intro h2 { margin: 12px 0 8px; font-size: 23px; }
.hgsf-intro p { color: var(--hgo-muted); font-size: 13px; }
.hgsf-stack { display: flex; flex-direction: column; gap: 14px; width: 100%; margin-top: 24px; padding: 24px; color: var(--hgo-fg); background: var(--hgo-soft); border: 1px solid var(--hgo-line); border-radius: 24px; text-align: left; box-shadow: 0 8px 0 -2px color-mix(in srgb, var(--hgo-accent) 22%, var(--hgo-bg)), 0 16px 0 -5px color-mix(in srgb, var(--hgo-accent) 12%, var(--hgo-bg)); }
.hgsf-stack > span, .hgsf-stack small { font-size: 12px; color: var(--hgo-muted); }
.hgsf-stack strong { font-size: 19px; line-height: 1.4; }
.hgsf-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.hgsf-card { --feed-accent: var(--hgo-accent); position: relative; isolation: isolate; min-width: 0; min-height: 470px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: flex-end; gap: 14px; overflow: hidden; padding: 28px 24px; color: var(--hgo-fg); background: color-mix(in srgb, var(--feed-accent) 13%, var(--hgo-panel)); border: 1px solid var(--hgo-line); border-radius: 26px; scroll-snap-align: start; scroll-snap-stop: always; }
.hgsf-card[data-source='flower'], .hgsf-card[data-source='recipe'] { background: var(--hgo-accent); color: var(--hgo-on-accent); }
.hgsf-card[data-source='book'] { background: var(--hgo-soft); }
.hgsf-art { position: absolute; z-index: -1; right: -40px; top: 70px; font-size: 250px; opacity: .12; pointer-events: none; }
.hgsf-pos { position: absolute; right: 20px; top: 22px; font-size: 11px; opacity: .7; font-variant-numeric: tabular-nums; }
.hgsf-tag { align-self: flex-start; display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 6px 12px; border: 1.5px solid currentColor; border-radius: 999px; font-size: 12px; font-weight: 800; }
.hgsf-tag b { font: 400 12px Righteous, sans-serif; }
.hgsf-author { display: flex; align-items: center; gap: 10px; font-size: 14px; }
.hgsf-avatar { flex: none; width: 38px; height: 38px; border-radius: 50%; border: 2px solid currentColor; box-sizing: border-box; }
.hgsf-anonymous { display: grid; place-items: center; }
.hgsf-author > span:last-child { display: flex; flex-direction: column; gap: 3px; }
.hgsf-author time { font-size: 12px; opacity: .8; }
.hgsf-card h2 { margin: 0; font-size: 28px; line-height: 1.3; letter-spacing: -.01em; overflow-wrap: anywhere; }
.hgsf-flower { align-self: flex-start; font-size: 66px; line-height: 1.1; }
.hgsf-body { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 15px; line-height: 1.75; max-height: 9em; overflow-y: auto; }
.hgsf-body p { margin: 8px 0 0; }
.hgsf-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.hgsf-chips span { min-height: 28px; display: inline-flex; align-items: center; padding: 0 10px; border-radius: 999px; background: color-mix(in srgb, currentColor 10%, transparent); font-size: 12px; font-weight: 800; }
.hgsf-actions button { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 52px; gap: 12px; padding: 0 18px; border: 2px solid currentColor; border-radius: 999px; color: inherit; background: transparent; font-size: 15px; font-weight: 800; }
.hgsf-actions span { display: inline-flex; align-items: center; gap: 8px; }
.hgsf-tail { min-height: 160px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 12px; padding: 24px; color: var(--hgo-muted); text-align: center; scroll-snap-align: start; }
.hgsf-tail > i { font-size: 30px; }
.hgsf-tail button { padding: 10px 18px; border-radius: 999px; border: 1px solid var(--hgo-line); background: var(--hgo-panel); color: var(--hgo-fg); }
.hgsf button { cursor: pointer; font-family: inherit; transition: transform 180ms, background 180ms; }
.hgsf button:active { transform: scale(.97); }
.hgsf button:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
@container (max-width: 900px) { .hgsf-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@container (max-width: 720px) {
	.hgsf-intro { padding: 26px 4px 38px; }
	.hgsf-cards { display: flex; flex-direction: column; gap: 0; margin: 0 -14px; }
	.hgsf-card { min-height: var(--feed-height); border-radius: 0; border: 0; padding: 90px 22px 34px; }
	.hgsf-art { top: 70px; right: -48px; font-size: 300px; }
	.hgsf-card h2 { font-size: 30px; }
	.hgsf-tag { margin-top: auto; }
	.hgsf-tail { min-height: calc(var(--feed-height) / 2); }
}
</style>
