<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModalWindow
	ref="dialog"
	:width="500"
	:height="600"
	@close="onClose"
	@closed="emit('closed')"
>
	<template #header>{{ i18n.ts.signup }}</template>

	<div :class="{ [$style.noMotion]: !prefer.r.animation.value }" style="overflow-x: clip;">
		<Transition
			mode="out-in"
			:enterActiveClass="$style.transition_x_enterActive"
			:leaveActiveClass="$style.transition_x_leaveActive"
			:enterFromClass="$style.transition_x_enterFrom"
			:leaveToClass="$style.transition_x_leaveTo"
		>
			<div v-if="instance.registrationClosed" class="_spacer">{{ i18n.ts._hata._registrationApplications.closedMessage }}</div>
			<div v-else ref="stages" :class="$style.stages">
				<XServerRules v-show="!isAcceptedServerRule" @done="acceptRules" @cancel="onClose" @update:agreed="onAgreedUpdate"/>
				<XSignup v-if="signupVisited" v-show="isAcceptedServerRule" :autoSet="autoSet" :agreementsAccepted="isAcceptedServerRule" @back="isAcceptedServerRule = false" @signup="onSignup" @signupEmailPending="onSignupEmailPending"/>
			</div>
		</Transition>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { nextTick, useTemplateRef, ref, watch } from 'vue';
import * as Misskey from 'cherrypick-js';
import XSignup from '@/components/MkSignupDialog.form.vue';
import XServerRules from '@/components/MkSignupDialog.rules.vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import { i18n } from '@/i18n.js';
import { instance } from '@/instance.js';
import { prefer } from '@/preferences.js';
import { focusRegistrationElement } from '@/utility/registration-consent.js';

const props = withDefaults(defineProps<{
	autoSet?: boolean;
}>(), {
	autoSet: false,
});

const emit = defineEmits<{
	(ev: 'done', res: Misskey.entities.SignupResponse): void;
	(ev: 'cancelled'): void;
	(ev: 'closed'): void;
}>();

const dialog = useTemplateRef('dialog');

const isAcceptedServerRule = ref(false);
const signupVisited = ref(false);
const stages = useTemplateRef<HTMLDivElement>('stages');

watch([() => instance.registrationClosed, () => instance.disableRegistration], () => { isAcceptedServerRule.value = false; signupVisited.value = false; });
watch(isAcceptedServerRule, () => {
	void nextTick(() => {
		const visible = Array.from(stages.value?.children ?? []).find(element => (element as HTMLElement).style.display !== 'none');
		const target = Array.from(visible?.querySelectorAll<HTMLElement>('h2, button') ?? []).find(element => {
			let current: HTMLElement | null = element;
			while (current && current !== visible) { if (current.style.display === 'none' || current.inert) return false; current = current.parentElement; }
			return true;
		});
		if (target?.matches('h2')) target.tabIndex = -1;
		focusRegistrationElement(target, { scrollToTop: true });
	});
});

function acceptRules() {
	if (instance.registrationClosed) return;
	signupVisited.value = true;
	isAcceptedServerRule.value = true;
}

function onAgreedUpdate(value: boolean) { if (!value) isAcceptedServerRule.value = false; }

function onClose() {
	emit('cancelled');
	dialog.value?.close();
}

function onSignup(res: Misskey.entities.SignupResponse) {
	if (instance.registrationClosed) return;
	emit('done', res);
	dialog.value?.close();
}

function onSignupEmailPending() {
	if (instance.registrationClosed) return;
	dialog.value?.close();
}
</script>

<style lang="scss" module>
.stages > * { animation: stageIn 260ms ease both; }
.noMotion .stages > * { animation: none; }
.noMotion .transition_x_enterActive, .noMotion .transition_x_leaveActive { transition: none; }
@keyframes stageIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.transition_x_enterActive,
.transition_x_leaveActive {
	transition: opacity 260ms cubic-bezier(0,0,.35,1), transform 260ms cubic-bezier(0,0,.35,1);
}
.transition_x_enterFrom {
	opacity: 0;
	transform: translateX(50px);
}
.transition_x_leaveTo {
	opacity: 0;
	transform: translateX(-50px);
}
@media (prefers-reduced-motion: reduce) { .stages > * { animation: none; } .transition_x_enterActive, .transition_x_leaveActive { transition: none; } }
</style>
