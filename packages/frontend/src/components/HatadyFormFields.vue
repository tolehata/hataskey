<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<div :class="$style.fields">
	<div v-for="field in fields" v-show="!field.when || field.when(values)" :key="field.key" :class="$style.field" :data-field="field.key">
		<HatadyImageAttachments v-if="field.type === 'images'" v-model="values[field.key]" :label="field.label"/>
		<HyVisibility v-else-if="field.type === 'visibility'" v-model="values[field.key]" :label="field.label"/>
		<HyDurationInput v-else-if="field.type === 'duration'" v-model="values[field.key]" :label="field.label" :presets="field.presets"/>
		<template v-else-if="field.type === 'weaponStats'">
			<h4>{{ field.label }}</h4><HyWeaponStatsTable v-model:rows="values.weaponStats" v-model:fields="values.statFields" :weaponSuggestions="field.suggestions ?? []" :copy="weaponCopy"/>
		</template>
		<fieldset v-else-if="field.type === 'choice' || field.type === 'tags'" :class="$style.fieldset">
			<legend>{{ field.label }}<small v-if="!field.required">任意</small></legend>
			<div :class="field.type === 'choice' ? $style.choices : $style.tags">
				<label v-for="option in fieldOptions(field)" :key="option.value" :class="$style.choice">
					<input v-if="field.type === 'choice'" v-model="values[field.key]" type="radio" :name="`${id}-${field.key}`" :value="option.value" :disabled="field.disabled">
					<input v-else v-model="values[field.key]" :name="field.key" type="checkbox" :value="option.value" :disabled="field.disabled">
					<span><i :class="option.icon || 'ti ti-check'" aria-hidden="true"></i>{{ option.label }}</span>
				</label>
			</div>
		</fieldset>
		<label v-else-if="field.type === 'checkbox'" :class="$style.check"><input v-model="values[field.key]" :name="field.key" type="checkbox"><i class="ti ti-check" aria-hidden="true"></i><span>{{ field.label }}</span></label>
		<fieldset v-else-if="field.type === 'color'" :class="$style.fieldset"><legend>{{ field.label }}</legend><div :class="$style.swatches"><button v-for="(colors, index) in HY_COVER_SETS" :key="index" type="button" :aria-label="`表紙の色 ${index + 1}`" :aria-pressed="values[field.key] === index" :class="$style.swatch" :style="{ '--cover': colors[1] }" @click="values[field.key] = values[field.key] === index ? null : index"><i v-if="values[field.key] === index" class="ti ti-check" aria-hidden="true"></i></button></div></fieldset>
		<template v-else-if="field.type === 'bookmarks' || field.type === 'memos'">
			<div v-if="!values[field.key]?.length" :class="$style.empty"><i class="ti ti-bookmark"></i><span>{{ field.type === 'bookmarks' ? 'また読みたいページに、しおりを。' : '心に残ったページを、ひとこと。' }}</span></div>
			<section v-for="(note, index) in values[field.key]" :key="note.id || note.clientId" :class="$style.note">
				<header><h4>{{ field.label }} {{ Number(index) + 1 }}</h4><button type="button" class="hy-icon-button" :aria-label="`${field.label} ${Number(index) + 1}を削除`" @click="values[field.key].splice(Number(index), 1)"><i class="ti ti-trash"></i></button></header>
				<label class="hy-field"><span>ページ</span><input v-model.number="note.page" :required="field.type === 'bookmarks'" :name="`${field.key}-${index}-page`" class="hy-input" type="number" inputmode="numeric" min="0" max="100000" step="1"></label>
				<label v-if="field.type === 'bookmarks'" class="hy-field"><span>しおりの名前</span><input v-model="note.name" :name="`${field.key}-${index}-name`" class="hy-input" maxlength="128"></label>
				<label v-if="field.type === 'bookmarks'" class="hy-field"><span>しおりの色</span><select v-model="note.color" :name="`${field.key}-${index}-color`" class="hy-input"><option v-for="color in bookmarkColors(note.color)" :key="color.key" :value="color.key">{{ color.label }}</option></select></label>
				<label class="hy-field"><span>メモ</span><textarea v-if="field.type === 'bookmarks'" v-model="note.memo" :name="`${field.key}-${index}-memo`" class="hy-input" rows="3" maxlength="2048"></textarea><textarea v-else v-model="note.text" required :name="`${field.key}-${index}-text`" class="hy-input" rows="3" maxlength="4096"></textarea></label>
			</section>
			<button type="button" class="hy-secondary" @click="addNote(field)"><i class="ti ti-plus"></i>{{ field.label }}を追加</button>
		</template>
		<template v-else>
			<label :for="`${id}-${field.key}`" :class="$style.label">{{ field.label }}<small>{{ field.required ? '必須' : '任意' }}</small></label>
			<HyTagInput v-if="field.type === 'list'" v-model="values[field.key]" v-model:pending="values.__listDrafts[field.key]" :maxLength="field.maxlength ?? 512" :inputId="`${id}-${field.key}`" :inputLabel="field.label" :inputName="field.key" :suggestions="field.suggestions ?? []" :ordered="field.ordered" addLabel="追加" removeLabel="削除" :placeholder="field.placeholder ?? ''"/>
			<textarea v-else-if="field.type === 'textarea'" :id="`${id}-${field.key}`" v-model="values[field.key]" :name="field.key" :required="field.required" :disabled="field.disabled" class="hy-input" rows="4" :maxlength="field.maxlength ?? 4096" :placeholder="field.placeholder"></textarea>
			<select v-else-if="field.type === 'select'" :id="`${id}-${field.key}`" v-model="values[field.key]" :name="field.key" :required="field.required" :disabled="field.disabled" class="hy-input"><option v-for="option in fieldOptions(field)" :key="option.value" :value="option.value">{{ option.label }}</option></select>
			<input v-else :id="`${id}-${field.key}`" v-model="values[field.key]" :name="field.key" :required="field.required" :disabled="field.disabled" class="hy-input" :type="field.type || 'text'" :inputmode="field.type === 'number' ? 'numeric' : undefined" :min="field.min" :max="field.max" :step="field.step ?? (field.type === 'time' || field.type === 'datetime-local' ? '0.001' : undefined)" :maxlength="field.maxlength" :placeholder="field.placeholder" :list="field.suggestions?.length ? `${id}-${field.key}-suggest` : undefined">
			<datalist v-if="field.suggestions?.length" :id="`${id}-${field.key}-suggest`"><option v-for="suggestion in field.suggestions" :key="suggestion" :value="suggestion"></option></datalist>
			<button v-if="field.action" type="button" class="hy-secondary" @click="field.action.run()"><i class="ti ti-plus"></i>{{ field.action.label }}</button>
		</template>
	</div>
</div>
</template>

<script setup lang="ts">
import { useId } from 'vue';
import type { HatadyFormField, HatadyFormValues } from '@/utility/hatady-form.js';
import { HATADY_RECORD_TAGS } from '@/utility/hatady-ui.js';
import { HY_COVER_SETS } from '@/utility/hatady.js';
import HatadyImageAttachments from '@/components/HatadyImageAttachments.vue';
import HyVisibility from '@/components/HyVisibility.vue';
import HyDurationInput from '@/components/HyDurationInput.vue';
import HyTagInput from '@/components/HyTagInput.vue';
import HyWeaponStatsTable from '@/components/HyWeaponStatsTable.vue';
const values = defineModel<HatadyFormValues>({ required: true });
defineProps<{ fields: HatadyFormField[] }>();
const id = useId();
const weaponCopy = { statFieldsLabel: '記録する成績', fieldLabels: { kills: 'キル', deaths: 'デス', assists: 'アシスト', specials: 'スペシャル', rescues: '救助' }, weaponLabel: '武器', weaponPlaceholder: '武器の名前', addRow: '武器を追加', removeRow: 'この武器を削除', totalLabel: '合計', pickAtLeastOne: '記録する成績を選んでください' };

function fieldOptions(field: HatadyFormField) {
	const options = [...(field.options ?? [])], selected = Array.isArray(values.value[field.key]) ? values.value[field.key] : [values.value[field.key]];
	for (const value of selected) if (value != null && !(field.type === 'tags' && HATADY_RECORD_TAGS.some(tag => tag.value === value)) && !options.some(option => option.value === String(value))) options.push({ value: String(value), label: String(value) || '未設定' });
	return options;
}

function bookmarkColors(selected: string) {
	const options = [{ key: 'red', label: '赤' }, { key: 'orange', label: '橙' }, { key: 'yellow', label: '黄' }, { key: 'green', label: '緑' }, { key: 'blue', label: '青' }, { key: 'purple', label: '紫' }, { key: 'pink', label: '桃' }];
	if (selected && !options.some(option => option.key === selected)) options.push({ key: selected, label: selected });
	return options;
}

function addNote(field: HatadyFormField) { (values.value[field.key] ??= []).push({ clientId: crypto.randomUUID(), page: '', name: '', color: 'orange', memo: '', text: '' }); }
</script>

<style lang="scss" module>
.fields, .field { display: grid; gap: 10px; min-width: 0; }
.fields { gap: 22px; }
.label, .fieldset > legend { font-size: 14px; font-weight: 700; }
.label small, .fieldset > legend small { margin-left: 7px; font-size: 12px; font-weight: 400; color: var(--hy-muted); }
.fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
.fieldset > legend { padding: 0; margin-bottom: 10px; }
.choices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.tags { display: flex; flex-wrap: wrap; gap: 8px; }
.choice { position: relative; cursor: pointer; min-width: 0; }
.choice input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.choice span { display: flex; align-items: center; gap: 8px; min-height: 48px; box-sizing: border-box; padding: 12px; border: 1px solid var(--hy-border); border-radius: 16px; font-size: 14px; overflow-wrap: anywhere; }
.choice i { font-size: 20px; flex: none; }
.tags .choice span { border-radius: 999px; min-height: 44px; padding: 9px 12px; }
.choice input:checked + span { background: var(--hy-soft); color: var(--hy-accent); border-color: var(--hy-accent); font-weight: 700; }
.choice input:focus-visible + span { outline: 3px solid var(--hy-accent); outline-offset: 3px; }
.check { display: flex; align-items: center; gap: 8px; min-height: 44px; font-size: 14px; cursor: pointer; }
.check input { width: 18px; height: 18px; accent-color: var(--hy-accent); }
.swatches { display: flex; flex-wrap: wrap; gap: 8px; }
.swatch { width: 44px; height: 44px; padding: 0; border: 4px solid var(--hy-surface); border-radius: 50%; background: var(--cover); color: white; cursor: pointer; }
.swatch[aria-pressed="true"] { outline: 2px solid var(--hy-accent); outline-offset: 1px; }
.swatch:focus-visible { outline: 3px solid var(--hy-accent); outline-offset: 3px; }
.note { display: grid; gap: 16px; padding: 16px; border: 1px solid var(--hy-border); border-radius: 20px; }
.note header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.field h4 { margin: 0; font-size: 14px; }
.empty { display: flex; gap: 10px; justify-content: center; align-items: center; padding: 20px 14px; background: var(--hy-soft); border-radius: 18px; color: var(--hy-muted); font-size: 14px; }
</style>
