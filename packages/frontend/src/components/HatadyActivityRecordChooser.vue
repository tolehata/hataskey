<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<HyDialog ref="dialog" title="今日は、何をした？" :bare="hasForm" :back="stage === 'works'" @close="requestClose" @back="back" @closed="emit('closed')">
	<div v-if="stage === 'categories'" :class="$style.types" :data-direction="direction">
		<button v-for="option in HATADY_ACTIVITY_CHOICES" :key="option.value" type="button" :class="$style.type" @click="selectKind(option.value)"><i :class="option.icon" aria-hidden="true"></i><span><strong>{{ option.label }}</strong><small>{{ descriptions[option.value] }}</small></span></button>
	</div>
	<section v-else-if="stage === 'works'" :class="$style.works" :data-direction="direction">
		<h3>{{ selectedKind === 'movie' ? 'どの映画を観た？' : 'どのゲームで遊んだ？' }}</h3>
		<form :class="$style.search" @submit.prevent="applySearch"><label :class="$style.searchInput"><i class="ti ti-search" aria-hidden="true"></i><input v-model="queryDraft" name="work-search" aria-label="作品を検索" placeholder="作品を探す" maxlength="256"></label><button type="submit" class="hy-secondary">検索</button></form>
		<button type="button" class="hy-secondary" @click="stage = 'create'"><i class="ti ti-plus" aria-hidden="true"></i>作品を登録</button>
		<p v-if="loading" :class="$style.state" role="status">読み込み中</p>
		<p v-else-if="error" :class="$style.state" role="alert">{{ error }}<button type="button" class="hy-secondary" @click="loadWorks()">再読み込み</button></p>
		<p v-else-if="!works.length" :class="$style.state">{{ query ? '条件に合う作品はありません' : '作品を登録して、今日の記録を残そう' }}</p>
		<div :class="$style.workList"><button v-for="work in works" :key="work.id" type="button" :class="$style.work" @click="selectWork(work)"><HyMediaCover :kind="work.kind" :title="work.title" :subtitle="work.creator || work.developer" :colorIndex="work.coverColorIndex" :width="48"/><span><strong>{{ work.title }}</strong><small>{{ work.creator || work.developer || work.publisher }}</small></span><i class="ti ti-chevron-right" aria-hidden="true"></i></button></div>
		<button v-if="hasMore && !loading" type="button" class="hy-secondary" @click="loadWorks(true)">さらに表示</button>
	</section>
	<HatadyComposer v-else-if="stage === 'composer'" ref="composer" :kind="composerKind" embedded @done="emit('done', $event)" @back="back" @closed="dialog?.close()"/>
	<HatadyMediaSessionForm v-else-if="stage === 'session' && selectedWork" ref="session" :work="selectedWork" embedded @done="emit('done', $event)" @back="back" @closed="dialog?.close()"/>
	<HatadyMediaWorkForm v-else-if="stage === 'create'" ref="workForm" :kind="mediaKind" embedded @done="createdWork = $event" @back="back" @closed="finishWorkCreation"/>
</HyDialog>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef } from 'vue';
import type { HatadyMediaWork } from '@/utility/hatady-media.js';
import HyDialog from '@/components/HyDialog.vue';
import HyMediaCover from '@/components/HyMediaCover.vue';
import HatadyComposer from '@/components/HatadyComposer.vue';
import HatadyMediaSessionForm from '@/components/HatadyMediaSessionForm.vue';
import HatadyMediaWorkForm from '@/components/HatadyMediaWorkForm.vue';
import { HATADY_ACTIVITY_CHOICES } from '@/utility/hatady-ui.js';
import { normalizeMediaWorks } from '@/utility/hatady-media.js';
import { misskeyApi } from '@/utility/misskey-api.js';
const emit = defineEmits<{ (event: 'done', value: any): void; (event: 'closed'): void }>();
const dialog = useTemplateRef('dialog'), composer = useTemplateRef('composer'), session = useTemplateRef('session'), workForm = useTemplateRef('workForm');
const stage = ref<'categories' | 'works' | 'composer' | 'session' | 'create'>('categories'), selectedKind = ref('study'), selectedWork = ref<HatadyMediaWork | null>(null), createdWork = ref<HatadyMediaWork | null>(null);
const direction = ref(1), works = ref<HatadyMediaWork[]>([]), queryDraft = ref(''), query = ref(''), loading = ref(false), hasMore = ref(false), error = ref('');
let requestId = 0;
const hasForm = computed(() => ['composer', 'session', 'create'].includes(stage.value));
const composerKind = computed(() => selectedKind.value === 'exercise' ? 'exercise' : selectedKind.value === 'work' ? 'work' : 'study');
const mediaKind = computed(() => selectedKind.value === 'movie' ? 'movie' : 'game');
const descriptions: Record<string, string> = { study: '学んだこと、読んだ本', movie: '観た作品と感想', game: '遊んだ時間やできごと', exercise: '運動の種類と時間', work: '同じ作業に、日々の記録を' };

function selectKind(kind: string) { selectedKind.value = kind; direction.value = 1; if (kind === 'movie' || kind === 'game') { stage.value = 'works'; works.value = []; query.value = ''; queryDraft.value = ''; loadWorks(); } else stage.value = 'composer'; }

function selectWork(work: HatadyMediaWork) { selectedWork.value = work; direction.value = 1; stage.value = 'session'; }

function applySearch() { query.value = queryDraft.value.trim(); loadWorks(); }

async function loadWorks(append = false) {
	if (append && loading.value) return;
	const current = ++requestId, previous = append ? works.value : [], untilId = previous.at(-1)?.id;
	loading.value = true; error.value = '';
	try {
		const page = normalizeMediaWorks(await (misskeyApi as any)('hata/hatady/media/works/list', { kind: mediaKind.value, sort: 'updatedAt', order: 'desc', limit: 100, ...(query.value ? { query: query.value } : {}), ...(untilId ? { untilId } : {}) }));
		if (current !== requestId) return;
		const seen = new Set(previous.map(work => work.id)), added = page.filter(work => !seen.has(work.id));
		works.value = [...previous, ...added]; hasMore.value = page.length === 100 && added.length > 0;
	} catch { if (current === requestId) error.value = '作品を読み込めませんでした'; } finally { if (current === requestId) loading.value = false; }
}

function back() { direction.value = -1; if (stage.value === 'session' || stage.value === 'create') stage.value = 'works'; else stage.value = 'categories'; }

function requestClose() { if (stage.value === 'composer') composer.value?.requestClose(); else if (stage.value === 'session') session.value?.requestClose(); else if (stage.value === 'create') workForm.value?.requestClose(); else dialog.value?.close(); }

function finishWorkCreation() { if (createdWork.value) { works.value.unshift(createdWork.value); selectWork(createdWork.value); createdWork.value = null; } else dialog.value?.close(); }

onBeforeUnmount(() => { requestId++; });
</script>
<style lang="scss" module>
.types { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; animation: enter .2s ease-out; }
.type { display: flex; align-items: center; gap: 14px; min-width: 0; min-height: 94px; padding: 16px; border: 1px solid var(--hy-border); border-radius: 20px; background: var(--hy-surface); color: var(--hy-ink); text-align: left; cursor: pointer; }
.type:last-child { grid-column: 1 / -1; }
.type > i { flex: none; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; background: var(--hy-soft); color: var(--hy-accent); font-size: 23px; }
.type > span { display: grid; gap: 5px; }
.type strong { font-size: 16px; }
.type small { color: var(--hy-muted); font-size: 12px; line-height: 1.5; }
.type:hover, .work:hover { background: var(--hy-soft); border-color: var(--hy-accent); }
.type:focus-visible, .work:focus-visible { outline: 3px solid var(--hy-accent); outline-offset: 3px; }
.works { display: grid; gap: 18px; animation: enter .2s ease-out; }
.works h3 { margin: 0; font-size: 20px; }
.works > button { justify-self: center; }
.search { display: flex; gap: 8px; min-width: 0; }
.searchInput { display: flex; align-items: center; flex: 1; gap: 8px; min-width: 0; padding: 0 14px; border: 1px solid var(--hy-border); border-radius: 16px; background: var(--hy-surface-2); }
.searchInput:focus-within { outline: 2px solid var(--hy-accent); }
.searchInput input { flex: 1; min-width: 0; width: 100%; min-height: 46px; border: 0; outline: 0; background: transparent; color: var(--hy-ink); font: inherit; }
.workList { display: grid; gap: 10px; }
.work { display: flex; align-items: center; gap: 14px; min-width: 0; padding: 14px; border: 1px solid var(--hy-border); border-radius: 18px; background: var(--hy-surface); color: var(--hy-ink); text-align: left; cursor: pointer; }
.work > span { display: grid; gap: 5px; flex: 1; min-width: 0; }
.work strong { font-size: 15px; overflow-wrap: anywhere; }
.work small { font-size: 12px; color: var(--hy-muted); }
.state { display: grid; justify-items: center; gap: 12px; text-align: center; color: var(--hy-muted); font-size: 14px; }
.types[data-direction="-1"], .works[data-direction="-1"] { animation-name: leave; }
@keyframes enter { from { opacity: .4; transform: translateX(12px); } }
@keyframes leave { from { opacity: .4; transform: translateX(-12px); } }
@container hy-dialog (max-width: 400px) { .type { gap: 9px; padding: 12px; } .type strong { font-size: 14px; } .type > i { width: 36px; height: 40px; } }
@media (prefers-reduced-motion: reduce) { .types, .works { animation: none; } }
</style>
