<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<HyDialog ref="dialog" title="通報" back :busy="busy" :inert="prompt" @back="requestClose" @close="requestClose" @closed="emit('closed')">
	<div :class="$style.person"><i class="ti ti-flag" aria-hidden="true"></i><strong>{{ user.name || user.username }}さんの内容</strong></div>
	<blockquote v-if="excerpt" :class="$style.excerpt">{{ excerpt }}</blockquote>
	<form :id="formId" class="hy-form" @submit.prevent="send">
		<label class="hy-field">
			<span>通報の理由・詳細</span>
			<span :class="$style.inputBox">
				<textarea v-model="reason" class="hy-input" rows="5" :maxlength="maxReasonLength" :disabled="busy || sent" required placeholder="問題だと感じた点や、確認してほしいことを書いてください。"></textarea>
				<small :class="$style.counter">{{ reason.length }} / {{ maxReasonLength }}</small>
			</span>
		</label>
		<p v-if="error" class="hy-error" role="alert">{{ error }}</p>
	</form>
	<template #actions>
		<button v-if="!sent" type="button" class="hy-secondary" :disabled="busy" @click="requestClose">戻る</button>
		<button v-if="sent" type="button" class="hy-primary" :disabled="busy" @click="closeSentReport">端末の下書きを削除して閉じる</button>
		<button v-else type="submit" :form="formId" class="hy-primary" :disabled="busy || !reason.trim() || reason.length > maxReasonLength"><i class="ti ti-flag" aria-hidden="true"></i>通報する</button>
	</template>
</HyDialog>
<HatadyDraftPrompt v-if="prompt" title="書きかけの通報をどうする？" description="理由の下書きを端末に残して、あとで続きを書けます。" :error="draftError" @save="leave(true)" @discard="leave(false)" @return="prompt = false"/>
</template>

<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue';
import type * as Misskey from 'cherrypick-js';
import HyDialog from '@/components/HyDialog.vue';
import HatadyDraftPrompt from '@/components/HatadyDraftPrompt.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { useHataFormDraft } from '@/utility/hata-form-draft.js';
import { hatadyNotify } from '@/utility/hatady-ui.js';

const props = defineProps<{ user: Misskey.entities.UserLite; initialComment?: string }>();
const emit = defineEmits<{ (event: 'closed'): void }>();
const dialog = useTemplateRef('dialog');
const formId = useId();
const reason = ref('');
const busy = ref(false);
const sent = ref(false);
const prompt = ref(false);
const error = ref('');
const draftError = ref('');
const reference = computed(() => props.initialComment?.split('\n')[0] ?? '');
const hasReference = computed(() => reference.value.startsWith('hatady:'));
// 対象 ID は本文の先頭に維持し、長い引用だけを抑えて理由の入力枠を確保する。
const excerpt = computed(() => (hasReference.value ? props.initialComment?.slice(reference.value.length + 1) : props.initialComment)?.slice(0, 512) ?? '');
const context = computed(() => [hasReference.value ? reference.value : '', excerpt.value].filter(Boolean).join('\n'));
const maxReasonLength = computed(() => Math.max(0, 2048 - context.value.length - (context.value ? 2 : 0)));
const draft = useHataFormDraft({
	id: `hatady-report:${props.user.id}:${reference.value || 'user'}`,
	autoSave: false,
	capture: () => ({ reason: reason.value }),
	restore: (value) => {
		if (typeof value?.reason !== 'string') throw new Error('Invalid report draft');
		reason.value = value.reason;
	},
	isMeaningful: () => true,
});

function requestClose() {
	if (busy.value) return;
	if (sent.value) {
		closeSentReport();
	} else if (draft.hasChanges() || draft.restored.value) {
		draftError.value = '';
		prompt.value = true;
	} else dialog.value?.close();
}

function closeSentReport(): boolean {
	if (!draft.clearDraft()) {
		error.value = '通報を送信しましたが、端末の下書きを削除できませんでした';
		return false;
	}
	error.value = '';
	dialog.value?.close();
	return true;
}

function leave(save: boolean) {
	if (!(save ? draft.saveDraft() : draft.clearDraft())) {
		draftError.value = '端末の下書きを更新できませんでした。入力内容は残っています';
		return;
	}
	prompt.value = false;
	if (save) hatadyNotify('下書きを保存しました');
	dialog.value?.close();
}

async function send() {
	if (busy.value || sent.value || !reason.value.trim() || reason.value.length > maxReasonLength.value) return;
	busy.value = true;
	error.value = '';
	try {
		await misskeyApi('users/report-abuse', {
			userId: props.user.id,
			comment: context.value ? `${context.value}\n\n${reason.value}` : reason.value,
		});
		sent.value = true;
		if (closeSentReport()) hatadyNotify('通報を送信しました');
		else hatadyNotify('通報を送信しましたが、端末の下書きを削除できませんでした');
	} catch {
		error.value = '通報を送信できませんでした。入力内容は残っています';
	} finally {
		busy.value = false;
	}
}
</script>

<style module>
.person { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.excerpt { margin: 0 0 22px; padding: 16px; border-radius: 16px; background: var(--hy-surface); color: var(--hy-muted); white-space: pre-wrap; overflow-wrap: anywhere; }
.inputBox { position: relative; display: block; }
.inputBox textarea { display: block; width: 100%; padding-bottom: 38px; }
.counter { position: absolute; right: 14px; bottom: 12px; color: var(--hy-muted); font-variant-numeric: tabular-nums; pointer-events: none; }
</style>
