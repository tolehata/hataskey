<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
Hatady の活動記録入口。学習・映画鑑賞・ゲームプレイを選び、媒体記録では対象作品を選ぶ。
-->
<template>
<MkWindow :initialWidth="680" :initialHeight="680" :canResize="true" @closed="emit('closed')">
	<template #header><i class="ti ti-pencil-plus"></i> {{ copy.recordActivity }}</template>
	<div class="hatady-scope" :data-hatady-theme="theme" :class="$style.body">
		<header :class="$style.intro">
			<h2>{{ copy.chooseRecordType }}</h2>
			<p>{{ copy.chooseRecordTypeDescription }}</p>
		</header>

		<div :class="$style.typeGrid">
			<button type="button" :class="[$style.typeCard, $style.studyCard]" @click="emit('study')">
				<span :class="$style.typeIcon"><i class="ti ti-notebook"></i></span>
				<span><b>{{ copy.recordStudy }}</b><small>{{ copy.recordStudyDescription }}</small></span>
				<i class="ti ti-chevron-right" :class="$style.chevron"></i>
			</button>
			<button type="button" :class="[$style.typeCard, selectedKind === 'movie' && $style.typeCardOn]" @click="selectKind('movie')">
				<span :class="$style.typeIcon"><i class="ti ti-movie"></i></span>
				<span><b>{{ copy.recordMovie }}</b><small>{{ copy.recordMovieDescription }}</small></span>
				<i class="ti ti-chevron-right" :class="$style.chevron"></i>
			</button>
			<button type="button" :class="[$style.typeCard, selectedKind === 'game' && $style.typeCardOn]" @click="selectKind('game')">
				<span :class="$style.typeIcon"><i class="ti ti-device-gamepad-2"></i></span>
				<span><b>{{ copy.recordGame }}</b><small>{{ copy.recordGameDescription }}</small></span>
				<i class="ti ti-chevron-right" :class="$style.chevron"></i>
			</button>
		</div>

		<section v-if="selectedKind" :class="$style.workSection">
			<div :class="$style.sectionHead">
				<div><h3>{{ selectedKind === 'movie' ? copy.selectMovie : copy.selectGame }}</h3><p>{{ copy.selectWorkDescription }}</p></div>
				<button type="button" :class="$style.addButton" @click="emit('createWork', selectedKind)"><i class="ti ti-plus"></i> {{ selectedKind === 'movie' ? mediaCopy.addMovie : mediaCopy.addGame }}</button>
			</div>
			<form :class="$style.searchRow" @submit.prevent="applySearch">
				<i class="ti ti-search"></i>
				<input v-model="queryDraft" :placeholder="mediaCopy.searchPlaceholder" maxlength="256">
				<button type="submit">{{ mediaCopy.search }}</button>
			</form>
			<div v-if="loading" :class="$style.state">{{ copy.loading }}</div>
			<div v-else-if="works.length === 0" :class="$style.empty">
				<i :class="['ti', selectedKind === 'movie' ? 'ti-movie-off' : 'ti-device-gamepad-off']"></i>
				<b>{{ copy.noMatchingWorks }}</b>
				<span>{{ copy.createWorkFirst }}</span>
			</div>
			<div v-else :class="$style.workGrid">
				<button v-for="work in works" :key="work.id" type="button" :class="$style.workCard" @click="emit('session', work)">
					<HyMediaCover :kind="work.kind" :title="work.title" :subtitle="work.creator || work.developer" :colorIndex="work.coverColorIndex" :width="64"/>
					<span :class="$style.workBody"><b>{{ work.title }}</b><small>{{ work.creator || work.developer || work.publisher || copy.creatorUnknown }}</small><em>{{ statusLabel(work) }}</em></span>
					<i class="ti ti-chevron-right" :class="$style.chevron"></i>
				</button>
			</div>
			<button v-if="hasMore && !loading" type="button" :class="$style.more" @click="loadWorks(true)"><i class="ti ti-chevron-down"></i> {{ mediaCopy.loadMore }}</button>
		</section>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import HyMediaCover from '@/components/HyMediaCover.vue';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { hatadyTheme } from '@/utility/hatady-prefs.js';
import { hatadyMediaCopy, mediaStatusCopyKey, normalizeMediaWorks } from '@/utility/hatady-media.js';
import type { HatadyMediaKind, HatadyMediaWork } from '@/utility/hatady-media.js';

const emit = defineEmits<{
	(ev: 'study'): void;
	(ev: 'session', work: HatadyMediaWork): void;
	(ev: 'createWork', kind: HatadyMediaKind): void;
	(ev: 'closed'): void;
}>();

const theme = hatadyTheme;
const copy = i18n.ts._hata._hatady._home;
const mediaCopy = hatadyMediaCopy();
const selectedKind = ref<HatadyMediaKind | null>(null);
const works = ref<HatadyMediaWork[]>([]);
const queryDraft = ref('');
const query = ref('');
const loading = ref(false);
const hasMore = ref(false);
let requestId = 0;

function selectKind(kind: HatadyMediaKind) {
	if (selectedKind.value === kind) return;
	selectedKind.value = kind;
	works.value = [];
	queryDraft.value = '';
	query.value = '';
	loadWorks();
}

function applySearch() {
	query.value = queryDraft.value.trim();
	loadWorks();
}

async function loadWorks(append = false) {
	if (!selectedKind.value || (append && loading.value)) return;
	const currentRequest = ++requestId;
	const kind = selectedKind.value;
	loading.value = true;
	try {
		const previous = append ? works.value : [];
		const untilId = append ? previous.at(-1)?.id : undefined;
		const page = normalizeMediaWorks(await misskeyApi('hata/hatady/media/works/list' as never, {
			kind,
			sort: 'updatedAt',
			order: 'desc',
			limit: 100,
			...(query.value ? { query: query.value } : {}),
			...(untilId ? { untilId } : {}),
		} as never));
		if (currentRequest !== requestId) return;
		const seen = new Set(previous.map(work => work.id));
		const added = page.filter(work => !seen.has(work.id));
		works.value = append ? [...previous, ...added] : page;
		hasMore.value = page.length === 100 && added.length > 0;
	} catch {
		if (currentRequest === requestId) {
			if (!append) works.value = [];
			hasMore.value = false;
		}
	} finally {
		if (currentRequest === requestId) loading.value = false;
	}
}

function statusLabel(work: HatadyMediaWork): string {
	return String(mediaCopy.status?.[mediaStatusCopyKey(work.kind, work.status)] ?? work.status);
}
</script>

<style lang="scss" module>
.body { min-height: 100%; box-sizing: border-box; padding: 22px; container-type: inline-size; background: var(--hy-bg); color: var(--hy-body); font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif; }
.intro h2, .sectionHead h3 { margin: 0; color: var(--hy-ink); font-family: var(--hy-heading); }
.intro h2 { font-size: 18px; }
.intro p, .sectionHead p { margin: 5px 0 0; color: var(--hy-muted); font-size: 12px; line-height: 1.6; }
.typeGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
.typeCard { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 10px; min-width: 0; padding: 14px; border: 1px solid var(--hy-border); border-radius: 14px; background: var(--hy-surface); color: var(--hy-ink); text-align: left; cursor: pointer; }
.typeCard:hover, .typeCardOn { border-color: var(--hy-accent); background: color-mix(in srgb, var(--hy-accent) 9%, var(--hy-surface)); }
.typeIcon { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; background: color-mix(in srgb, var(--hy-accent) 14%, var(--hy-surface)); color: var(--hy-accent-ink); font-size: 18px; }
.typeCard b, .typeCard small { display: block; min-width: 0; }
.typeCard b { font-family: var(--hy-heading); font-size: 13px; }
.typeCard small { margin-top: 4px; color: var(--hy-muted); font-size: 10.5px; line-height: 1.45; }
.chevron { color: var(--hy-muted); }
.workSection { margin-top: 22px; padding-top: 19px; border-top: 1px solid var(--hy-border); }
.sectionHead { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
.sectionHead h3 { font-size: 15px; }
.addButton, .searchRow button, .more { display: inline-flex; align-items: center; justify-content: center; gap: 5px; border: 0; border-radius: 999px; background: var(--hy-accent); color: #fff; font-weight: 700; cursor: pointer; }
.addButton { flex: 0 0 auto; padding: 8px 13px; }
.searchRow { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px; margin-top: 14px; padding: 6px 7px 6px 11px; border: 1px solid var(--hy-border); border-radius: 12px; background: var(--hy-surface); }
.searchRow i { color: var(--hy-muted); }
.searchRow input { min-width: 0; padding: 6px 0; border: 0; outline: none; background: transparent; color: var(--hy-ink); font: inherit; }
.searchRow button { padding: 7px 13px; }
.state, .empty { padding: 30px 12px; text-align: center; color: var(--hy-muted); }
.empty { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.empty > i { font-size: 28px; }
.empty b { color: var(--hy-ink); }
.empty span { font-size: 11px; }
.workGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 13px; }
.workCard { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 10px; min-width: 0; padding: 10px; border: 1px solid var(--hy-border); border-radius: 12px; background: var(--hy-surface); color: var(--hy-ink); text-align: left; cursor: pointer; }
.workCard:hover { border-color: var(--hy-accent); }
.workBody { min-width: 0; }
.workBody b, .workBody small, .workBody em { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.workBody b { font-family: var(--hy-serif); font-size: 12.5px; }
.workBody small { margin-top: 3px; color: var(--hy-muted); font-size: 10.5px; }
.workBody em { margin-top: 5px; color: var(--hy-accent-ink); font-size: 9.5px; font-style: normal; font-weight: 700; }
.more { width: 100%; margin-top: 12px; padding: 9px; background: var(--hy-surface); color: var(--hy-ink); border: 1px solid var(--hy-border); }
@container (max-width: 580px) {
	.typeGrid { grid-template-columns: 1fr; }
	.workGrid { grid-template-columns: 1fr; }
	.sectionHead { align-items: flex-start; flex-direction: column; }
}
</style>
