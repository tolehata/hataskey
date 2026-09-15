<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<HyDialog
	ref="dialog"
	:title="goal ? '目標を編集' : '次の目標'"
	:busy="busy"
	:inert="prompt"
	@close="requestClose"
	@closed="emit('closed')"
>
	<form class="hy-form" @submit.prevent="save">
		<label class="hy-field">
			<span>目標</span>
			<input v-model="form.title" class="hy-input" maxlength="256" placeholder="今月は本を1冊読み終える" required/>
		</label>
		<label class="hy-field">
			<span>
				ひとこと
				<small>任意</small>
			</span>
			<textarea v-model="form.description" class="hy-input" maxlength="2048" rows="3"></textarea>
		</label>
		<div class="hy-field">
			<span>期間</span>
			<HyCapsule v-model="form.termType" :options="terms" label="目標の期間"/>
		</div>
		<label class="hy-field">
			<span>
				期限
				<small>任意</small>
			</span>
			<input v-model="form.targetDate" class="hy-input" type="date"/>
		</label>
		<div class="hy-field">
			<span>達成の目安</span>
			<HyCapsule v-model="form.metricType" :options="metrics" label="達成の目安"/>
		</div>
		<label v-if="form.metricType" class="hy-field">
			<span>目標 {{ unit }}</span>
			<input
				v-model.number="form.metricTarget"
				class="hy-input"
				type="number"
				inputmode="numeric"
				min="1"
				step="1"
				required
			/>
		</label>
		<p v-if="form.metricType" class="hy-muted">勉強・読書の記録から進み具合を表示します</p>
		<p v-if="error" class="hy-error" role="alert">{{ error }}</p>
	</form>
	<template #actions>
		<button class="hy-secondary" :disabled="busy" @click="requestClose">閉じる</button>
		<button class="hy-primary" :disabled="busy || !valid" @click="save">
			{{ goal ? '保存する' : '目標を作る' }}
		</button>
	</template>
</HyDialog>
<HatadyDraftPrompt
	v-if="prompt"
	title="目標の編集をどうする？"
	description="途中の目標を、端末に下書きとして残せます。"
	:error="draftError"
	@save="leave(true)"
	@discard="leave(false)"
	@return="prompt = false"
/>
</template>
<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import HyDialog from '@/components/HyDialog.vue';
import HyCapsule from '@/components/HyCapsule.vue';
import HatadyDraftPrompt from '@/components/HatadyDraftPrompt.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { useHataFormDraft } from '@/utility/hata-form-draft.js';
import { hatadyNotify } from '@/utility/hatady-ui.js';
import { localDateKey } from '@/utility/hatady-home.js';
const props = defineProps<{ goal?: any }>();
const emit = defineEmits<{ (e: 'closed'): void; (e: 'done'): void }>();
const dialog = ref<any>(),
	busy = ref(false),
	prompt = ref(false),
	error = ref(''),
	draftError = ref('');
const form = reactive({
	title: props.goal?.title || '',
	description: props.goal?.description || '',
	termType: props.goal?.termType || 'short',
	targetDate: props.goal?.targetDate ? localDateKey(new Date(props.goal.targetDate)) : '',
	metricType: props.goal?.metricType || '',
	metricTarget: props.goal?.metricTarget ?? null,
});
const terms = [
	{ value: 'short', label: '短期', icon: 'ti ti-bolt' },
	{ value: 'long', label: '長期', icon: 'ti ti-mountain' },
];
const metrics = [
	{ value: '', label: '自分で達成', icon: 'ti ti-check' },
	{ value: 'minutes', label: '時間', icon: 'ti ti-clock' },
	{ value: 'logs', label: '記録数', icon: 'ti ti-notebook' },
	{ value: 'books', label: '読了数', icon: 'ti ti-books' },
];
const unit = computed(() => (form.metricType === 'minutes' ? '分' : form.metricType === 'logs' ? '件' : '冊'));
const valid = computed(
	() => form.title.trim() && (!form.metricType || (Number.isInteger(form.metricTarget) && form.metricTarget > 0)),
);
const draft = useHataFormDraft({
	id: `hatady-goal:${props.goal?.id || 'new'}`,
	autoSave: false,
	capture: () => ({ ...form }),
	restore: (d) => Object.assign(form, d),
	isMeaningful: () => true,
});

function requestClose() {
	if (busy.value) return;
	if (draft.hasChanges()) {
		prompt.value = true;
		draftError.value = '';
	} else dialog.value?.close();
}

function leave(save: boolean) {
	if (!(save ? draft.saveDraft() : draft.clearDraft())) {
		draftError.value = '端末の下書きを更新できませんでした';
		return;
	}
	prompt.value = false;
	if (save) hatadyNotify('下書きを保存しました');
	dialog.value?.close();
}

async function save() {
	if (busy.value || !valid.value) return;
	busy.value = true;
	error.value = '';
	try {
		const payload = {
			title: form.title.trim(),
			description: form.description.trim() || null,
			termType: form.termType,
			targetDate: form.targetDate ? new Date(`${form.targetDate}T23:59:59.999`).getTime() : null,
			metricType: form.metricType || null,
			metricTarget: form.metricType ? form.metricTarget : null,
		};
		await (misskeyApi as any)(
			props.goal ? 'hata/hatady/goals/update' : 'hata/hatady/goals/create',
			props.goal ? { goalId: props.goal.id, ...payload } : payload,
		);
		if (!draft.clearDraft()) hatadyNotify('目標を保存しましたが、端末の下書きを削除できませんでした');
		else hatadyNotify('目標を保存しました');
		emit('done');
		dialog.value?.close();
	} catch {
		error.value = '目標を保存できませんでした';
	} finally {
		busy.value = false;
	}
}
</script>
