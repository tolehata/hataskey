<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<HyDialog ref="dialog" :title="title" :back="currentIndex > 0 || embedded" :busy="saving" :embedded="embedded" :inert="closePrompt" @close="requestClose" @back="back" @closed="emit('closed')">
	<div :class="$style.progress"><div><span><i :class="icon" aria-hidden="true"></i>{{ label }}</span><small>{{ currentIndex + 1 }} / {{ route.length }}</small></div><progress :value="currentIndex + 1" :max="route.length" aria-label="入力の進み具合"></progress></div>
	<p v-if="error" ref="errorBox" role="alert" tabindex="-1" :class="$style.error">{{ error }}</p>
	<form ref="form" novalidate @submit.prevent="next">
		<fieldset :disabled="saving || hasSaved" :class="$style.formBody">
			<section v-for="page in pages" v-show="page.id === currentPage" :key="page.id" :inert="page.id !== currentPage" :data-page="page.id" :data-direction="direction" :class="$style.page" :aria-labelledby="`${id}-${page.id}`">
				<h3 :id="`${id}-${page.id}`" tabindex="-1">{{ page.title }}</h3>
				<p v-if="page.description" :class="$style.description">{{ page.description }}</p>
				<div v-if="page.choices" :class="$style.extras">
					<label v-for="group in groups" :key="group.id" :class="$style.extra"><input v-model="selectedGroups" name="optional-pages" type="checkbox" :value="group.id"><span><i :class="group.icon" aria-hidden="true"></i><span><strong>{{ group.title }}</strong><small>{{ groupHasValue(group.id) ? '入力あり' : '任意' }}</small></span><i class="ti ti-check" aria-hidden="true"></i></span></label>
				</div>
				<template v-if="page.summary">
					<div :class="$style.summary"><i :class="icon" aria-hidden="true"></i><div><small>{{ label }}</small><strong>{{ values.title || summaryTitle || label }}</strong></div></div>
					<MkMediaList v-if="values.files?.length" :mediaList="values.files"/>
					<dl v-if="summaryFacts.length" :class="$style.facts"><template v-for="fact in summaryFacts" :key="fact.key"><dt>{{ fact.label }}</dt><dd>{{ fact.value }}</dd></template></dl>
				</template>
				<HatadyFormFields v-model="values" :fields="page.fields"/>
			</section>
		</fieldset>
	</form>
	<template #actions>
		<button v-if="currentIndex > 0 || embedded" type="button" class="hy-secondary" :disabled="saving || hasSaved" @click="back"><i class="ti ti-arrow-left" aria-hidden="true"></i>戻る</button>
		<button type="button" class="hy-primary" :disabled="saving" @click="next">{{ saving ? '保存中' : currentIndex === route.length - 1 ? saveLabel : '次へ' }}<i :class="currentIndex === route.length - 1 ? 'ti ti-check' : 'ti ti-arrow-right'" aria-hidden="true"></i></button>
	</template>
</HyDialog>
<HatadyDraftPrompt v-if="closePrompt" :busy="saving" :error="draftError" @save="closeWithDraft(true)" @discard="closeWithDraft(false)" @return="returnToEditing"/>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId, useTemplateRef } from 'vue';
import type { HatadyFormPage, HatadyFormValues } from '@/utility/hatady-form.js';
import HyDialog from '@/components/HyDialog.vue';
import HatadyDraftPrompt from '@/components/HatadyDraftPrompt.vue';
import MkMediaList from '@/components/MkMediaList.vue';
import HatadyFormFields from '@/components/HatadyFormFields.vue';
import { commitFormLists, formValidation, initialFormGroups, meaningfulField } from '@/utility/hatady-form.js';
import { useHataFormDraft } from '@/utility/hata-form-draft.js';
import { HATADY_RECORD_TAGS, hatadyDuration, hatadyNotify } from '@/utility/hatady-ui.js';

const values = defineModel<HatadyFormValues>({ required: true });
const props = withDefaults(defineProps<{ title: string; label: string; icon: string; pages: HatadyFormPage[]; draftId: string; embedded?: boolean; saveLabel?: string; summaryTitle?: string; restore?: (draft: HatadyFormValues) => HatadyFormValues; save: (values: HatadyFormValues) => Promise<any> }>(), { embedded: false, saveLabel: '保存する', summaryTitle: '' });
const emit = defineEmits<{ (event: 'done', value: any): void; (event: 'closed'): void; (event: 'back'): void }>();
const dialog = useTemplateRef('dialog'), form = useTemplateRef('form'), errorBox = useTemplateRef('errorBox'), id = useId();
const currentPage = ref(props.pages[0]?.id ?? ''), selectedGroups = ref(initialFormGroups(props.pages, values.value));
values.value.__listDrafts ??= {};
const hasSaved = ref(false);
const saving = ref(false), error = ref(''), closePrompt = ref(false), draftError = ref(''), direction = ref(1);
const scrolls: Record<string, number> = {};
let exitToBack = false, returnFocus: HTMLElement | null = null, savedResult: any;
const route = computed(() => props.pages.filter(page => (!page.when || page.when(values.value)) && (!page.group || selectedGroups.value.includes(page.group))));
const currentIndex = computed(() => Math.max(0, route.value.findIndex(page => page.id === currentPage.value)));
const groups = computed(() => {
	const used = new Set<string>();
	return props.pages.flatMap(page => {
		if (!page.group || used.has(page.group) || page.when && !page.when(values.value)) return [];
		used.add(page.group);
		return [{ id: page.group, title: page.title.replace(/（\d+\/\d+）$/, ''), icon: page.icon || 'ti ti-notes' }];
	});
});

function groupHasValue(group: string): boolean { return props.pages.some(page => page.group === group && page.fields.some(field => meaningfulField(values.value[field.key]))); }

const draft = useHataFormDraft<HatadyFormValues>({
	id: props.draftId, autoSave: false,
	capture: () => ({ ...values.value, __wizard: { page: currentPage.value, selected: [...selectedGroups.value] } }),
	restore: stored => {
		Object.assign(values.value, props.restore ? props.restore(stored) : stored);
		values.value.__listDrafts ??= {};
		const navigation = stored.__wizard;
		selectedGroups.value = Array.isArray(navigation?.selected) ? navigation.selected.filter((group: string) => props.pages.some(page => page.group === group)) : initialFormGroups(props.pages, values.value);
		currentPage.value = route.value.some(page => page.id === navigation?.page) ? navigation.page : props.pages[0].id;
	},
	isMeaningful: () => true,
});
const summaryFacts = computed(() => {
	const used = new Set<string>();
	return props.pages.flatMap(page => page.summary || page.when && !page.when(values.value) ? [] : page.fields.flatMap(field => {
		const value = values.value[field.key];
		if (used.has(field.key) || field.key === 'title' || !meaningfulField(value) || field.when && !field.when(values.value)) return [];
		used.add(field.key);
		if (field.type === 'images') return [{ key: field.key, label: field.label, value: `${value.length}枚` }];
		if (field.type === 'weaponStats' || field.type === 'bookmarks' || field.type === 'memos') return [{ key: field.key, label: field.label, value: `${Array.isArray(value) ? value.length : 0}件` }];
		const display = field.type === 'duration' ? hatadyDuration(Number(value)) : Array.isArray(value) ? value.map(item => field.options?.find(option => option.value === item)?.label ?? HATADY_RECORD_TAGS.find(tag => tag.value === item)?.label ?? String(item)).join('・') : field.options?.find(option => option.value === String(value))?.label ?? (field.type === 'visibility' ? ({ public: '公開', followers: 'フォロワーのみ', private: '自分のみ' } as Record<string, string>)[value] ?? String(value) : typeof value === 'boolean' ? 'あり' : String(value));
		return [{ key: field.key, label: field.label, value: display }];
	}));
});

async function go(page: string, forward: boolean): Promise<void> {
	if (dialog.value?.bodyEl) scrolls[currentPage.value] = dialog.value.bodyEl.scrollTop;
	direction.value = forward ? 1 : -1; currentPage.value = page; error.value = '';
	await nextTick();
	const section = form.value?.querySelector<HTMLElement>(`[data-page="${CSS.escape(page)}"]`);
	section?.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
	if (dialog.value?.bodyEl) dialog.value.bodyEl.scrollTop = forward ? 0 : scrolls[page] ?? 0;
}

async function validate(all = false): Promise<boolean> {
	const pages = props.pages.filter(page => (!page.when || page.when(values.value)) && (all || page.id === currentPage.value));
	for (const page of pages) {
		const section = form.value?.querySelector<HTMLElement>(`[data-page="${CSS.escape(page.id)}"]`);
		const badInput = Array.from(section?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input,textarea,select') ?? []).find(input => { const field = page.fields.find(item => item.key === input.closest<HTMLElement>('[data-field]')?.dataset.field); return !input.disabled && (!field?.when || field.when(values.value)) && !input.checkValidity(); });
		const invalid = page.fields.map(field => ({ field, message: formValidation(field, values.value) })).find(item => item.message);
		if (!badInput && !invalid) continue;
		if (page.group && !selectedGroups.value.includes(page.group)) selectedGroups.value.push(page.group);
		await go(page.id, false);
		error.value = invalid?.message || '入力した値を確認してください';
		await nextTick();
		if (badInput) { badInput.focus(); badInput.reportValidity(); } else section?.querySelector<HTMLElement>(`[data-field="${CSS.escape(invalid!.field.key)}"] input,[data-field="${CSS.escape(invalid!.field.key)}"] textarea,[data-field="${CSS.escape(invalid!.field.key)}"] select`)?.focus();
		return false;
	}
	return true;
}

async function next(): Promise<void> {
	if (saving.value) return;
	if (window.document.activeElement instanceof HTMLElement) window.document.activeElement.blur();
	commitFormLists(props.pages, values.value);
	if (currentIndex.value < route.value.length - 1) { if (await validate()) await go(route.value[currentIndex.value + 1].id, true); return; }
	if (!hasSaved.value && !await validate(true)) return;
	saving.value = true; error.value = '';
	try {
		if (!hasSaved.value) { savedResult = await props.save(values.value); hasSaved.value = true; }
		if (!draft.clearDraft()) { error.value = '保存は完了しましたが、端末の下書きを削除できませんでした。もう一度保存ボタンを押すと削除を再試行します'; return; }
		hatadyNotify('保存しました'); emit('done', savedResult); dialog.value?.close();
	} catch (reason) {
		error.value = (reason as { code?: string } | null)?.code === 'INVALID_HATADY_ATTACHMENTS'
			? '添付した画像を確認してください。削除済みの画像は添付を外してから保存できます。入力内容は残っています'
			: reason instanceof Error && reason.message.startsWith('一部') ? reason.message : '保存できませんでした。入力内容は残っています';
	} finally { saving.value = false; }
}

async function back(): Promise<void> {
	if (saving.value) return;
	if (currentIndex.value) await go(route.value[currentIndex.value - 1].id, false);
	else requestClose(true);
}

function requestClose(toBack = false): void {
	if (saving.value || closePrompt.value) return;
	if (hasSaved.value) { next(); return; }
	returnFocus = window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null;
	if (window.document.activeElement instanceof HTMLElement) window.document.activeElement.blur();
	exitToBack = toBack;
	if (!draft.hasChanges()) { finishClose(); return; }
	draftError.value = ''; closePrompt.value = true;
}

function finishClose(): void { if (exitToBack) emit('back'); else dialog.value?.close(); }

function closeWithDraft(save: boolean): void {
	if (!(save ? draft.saveDraft() : draft.clearDraft())) { draftError.value = save ? '端末に下書きを保存できませんでした。編集内容は残っています' : '端末の下書きを削除できませんでした'; return; }
	closePrompt.value = false;
	if (save) hatadyNotify('下書きを保存しました');
	finishClose();
}

async function returnToEditing(): Promise<void> { closePrompt.value = false; await nextTick(); returnFocus?.focus({ preventScroll: true }); }

onMounted(() => { if (!route.value.some(page => page.id === currentPage.value)) currentPage.value = route.value[0].id; });
defineExpose({ requestClose, hasChanges: draft.hasChanges, restored: draft.restored, resetBaseline: draft.resetBaseline });
</script>

<style lang="scss" module>
.progress { margin-bottom: 22px; color: var(--hy-muted); font-size: 13px; }
.progress > div { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px; }
.progress span { display: flex; align-items: center; gap: 9px; }
.progress i { display: grid; place-items: center; flex: none; width: 42px; height: 42px; border-radius: 14px; background: var(--hy-soft); color: var(--hy-accent); font-size: 21px; }
.progress small { font-variant-numeric: tabular-nums; }
.progress progress { display: block; width: 100%; height: 5px; border: 0; border-radius: 99px; overflow: hidden; accent-color: var(--hy-accent); }
.progress progress::-webkit-progress-bar { background: var(--hy-soft); }
.progress progress::-webkit-progress-value { background: var(--hy-accent); border-radius: 99px; }
.formBody { min-width: 0; border: 0; padding: 0; margin: 0; }
.page { display: grid; gap: 22px; min-width: 0; animation: forward .2s ease-out; }
.page[data-direction="-1"] { animation-name: backward; }
.page h3 { margin: 0; font-size: 20px; line-height: 1.5; }
.description { margin: 0; font-size: 14px; line-height: 1.7; color: var(--hy-muted); }
.error { margin: 0 0 18px; padding: 14px; background: var(--hy-soft); border: 1px solid var(--hy-accent); border-radius: 14px; font-size: 14px; line-height: 1.7; }
.extras { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; }
.extra { position: relative; cursor: pointer; min-width: 0; }
.extra input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.extra > span { display: flex; height: 100%; box-sizing: border-box; align-items: center; gap: 10px; min-height: 76px; padding: 14px; border: 1px solid var(--hy-border); border-radius: 18px; }
.extra > span > span { flex: 1; min-width: 0; display: grid; gap: 4px; }
.extra strong { font-size: 14px; }
.extra small { font-size: 12px; color: var(--hy-muted); }
.extra i { font-size: 21px; }
.extra i:last-child { visibility: hidden; }
.extra input:checked + span { background: var(--hy-soft); color: var(--hy-accent); border-color: var(--hy-accent); }
.extra input:checked + span > i:last-child { visibility: visible; }
.extra input:focus-visible + span { outline: 3px solid var(--hy-accent); outline-offset: 3px; }
.summary { display: flex; align-items: center; gap: 16px; padding: 18px; border-radius: 20px; background: var(--hy-soft); }
.summary > i { font-size: 30px; color: var(--hy-accent); }
.summary > div { min-width: 0; display: grid; gap: 5px; }
.summary strong { font-size: 20px; overflow-wrap: anywhere; }
.summary small { font-size: 13px; color: var(--hy-muted); }
.facts { display: grid; grid-template-columns: minmax(90px,1fr) minmax(0,2fr); gap: 10px 14px; margin: 0; font-size: 13px; line-height: 1.6; }
.facts dt { color: var(--hy-muted); }
.facts dd { margin: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
@keyframes forward { from { opacity: .3; transform: translateX(12px); } to { opacity: 1; transform: none; } }
@keyframes backward { from { opacity: .3; transform: translateX(-12px); } to { opacity: 1; transform: none; } }
@container hy-dialog (max-width: 560px) { .extras { grid-template-columns: 1fr; } .page { gap: 20px; } }
@media (prefers-reduced-motion: reduce) { .page { animation: none; } }
</style>
