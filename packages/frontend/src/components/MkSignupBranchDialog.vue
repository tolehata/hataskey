<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-FileCopyrightText: noridev and cherrypick-project
SPDX-FileCopyrightText: Tolehata and hatasaba-project
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

	<div style="overflow-x: clip;">
		<Transition
			mode="out-in"
			:enterActiveClass="$style.transition_x_enterActive"
			:leaveActiveClass="$style.transition_x_leaveActive"
			:enterFromClass="$style.transition_x_enterFrom"
			:leaveToClass="$style.transition_x_leaveTo"
		>
			<!-- ステップ1: 分岐選択 -->
			<div v-if="step === 'branch'" key="branch" :class="$style.container">
				<div :class="$style.branchMessage">
					<MkHatakyuIllustration v-if="useHatakyuBranding()" asset="waving" :size="72" style="margin: 0 auto;"/><i v-else class="ti ti-user-plus" :class="$style.branchIcon"></i>
					<p>{{ copy.haveInviteCode }}</p>
				</div>
				<div :class="$style.branchButtons">
					<MkButton primary full rounded @click="goInviteCode">
						<i class="ti ti-ticket"></i> {{ copy.haveInviteCodeYes }}
					</MkButton>
					<MkButton full rounded @click="goApplication">
						<i class="ti ti-pencil"></i> {{ copy.haveInviteCodeNo }}
					</MkButton>
				</div>
			</div>

			<!-- ステップ2a: 通常登録（申請制のときは招待コード登録） -->
			<div v-else-if="step === 'invite'" key="invite">
				<XServerRules v-if="!isAcceptedServerRule" @done="acceptRules" @cancel="backFromRules"/>
				<XSignup v-else :autoSet="autoSet" @signup="onSignup" @signupEmailPending="onSignupEmailPending"/>
			</div>

			<!-- ステップ2b: 申請登録フォーム -->
			<div v-else-if="step === 'application'" key="application">
				<MkRegistrationApplication
					@complete="onApplicationComplete"
					@back="backFromApplication"
				/>
			</div>

			<!-- ステップ3: 申請完了メッセージ -->
			<div v-else-if="step === 'applicationComplete'" key="complete" :class="$style.container">
				<div :class="$style.completeMessage">
					<MkHatakyuIllustration v-if="useHatakyuBranding()" asset="treasureFound" :size="72" style="margin: 0 auto;"/><i v-else class="ti ti-circle-check" :class="$style.completeIcon"></i>
					<h3>{{ copy.applicationComplete }}</h3>
					<p :class="$style.completionDescription">{{ copy.applicationCompleteDescription }}</p>
					<div :class="$style.notice">
						<ul>
							<li>{{ copy.reviewTime }}</li>
							<li>{{ copy.noRejectionEmail }}</li>
							<li>{{ copy.criteriaNotPublic }}</li>
						</ul>
					</div>
					<div :class="$style.completeButton">
						<MkButton primary rounded @click="onClose">{{ i18n.ts.close }}</MkButton>
					</div>
				</div>
			</div>
		</Transition>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, useTemplateRef, ref, watch } from 'vue';
import * as Misskey from 'cherrypick-js';
import XSignup from '@/components/MkSignupDialog.form.vue';
import XServerRules from '@/components/MkSignupDialog.rules.vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkButton from '@/components/MkButton.vue';
import MkRegistrationApplication from '@/components/MkRegistrationApplication.vue';
import MkHatakyuIllustration from '@/components/MkHatakyuIllustration.vue';
import { useHatakyuBranding } from '@/utility/hatakyu-assets.js';
import { i18n } from '@/i18n.js';
import { instance } from '@/instance.js';

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
const applicationMode = computed(() => instance.disableRegistration === true);
const step = ref<'branch' | 'invite' | 'application' | 'applicationComplete'>(applicationMode.value ? 'branch' : 'invite');
const isAcceptedServerRule = ref(false);
const copy = i18n.ts._hata._common;

// A settings refresh can change the registration mode while this dialog is open.
// Re-enter the matching rules flow rather than keeping a stale application form.
watch(applicationMode, enabled => {
	if (step.value === 'applicationComplete') return;
	isAcceptedServerRule.value = false;
	step.value = enabled ? 'branch' : 'invite';
}, { flush: 'sync' });

onMounted(() => {
	window.document.documentElement.setAttribute('data-hata-signup-modal-open', 'true');
});

onUnmounted(() => {
	window.document.documentElement.removeAttribute('data-hata-signup-modal-open');
});

function goInviteCode() {
	step.value = 'invite';
}

function goApplication() {
	if (!applicationMode.value) return;
	step.value = 'application';
}

function acceptRules() {
	if (step.value === 'invite') isAcceptedServerRule.value = true;
}

function backFromRules() {
	isAcceptedServerRule.value = false;
	if (applicationMode.value) step.value = 'branch';
	else onClose();
}

function backFromApplication() {
	isAcceptedServerRule.value = false;
	step.value = applicationMode.value ? 'branch' : 'invite';
}

function onClose() {
	emit('cancelled');
	dialog.value?.close();
}

function onSignup(res: Misskey.entities.SignupResponse) {
	emit('done', res);
	dialog.value?.close();
}

function onSignupEmailPending() {
	dialog.value?.close();
}

function onApplicationComplete() {
	if (applicationMode.value && step.value === 'application') step.value = 'applicationComplete';
}
</script>

<style lang="scss" module>
.completionDescription {
	white-space: pre-line;
}

.container {
	padding: 24px;
}

.branchMessage {
	text-align: center;
	margin-bottom: 20px;

	p {
		font-size: 1.1em;
		margin: 8px 0 0;
	}
}

.branchIcon {
	font-size: 40px;
	color: var(--MI_THEME-accent);
}

.branchButtons {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.completeMessage {
	text-align: center;

	h3 {
		margin: 16px 0 8px;
	}

	p {
		color: var(--MI_THEME-fg);
		line-height: 1.6;
	}
}

/* 旗鯖fork: 完了画面の「閉じる」ボタンを中央寄せ (MkButton は block 幅のため text-align では中央化されない) */
.completeButton {
	display: flex;
	justify-content: center;
	margin-top: 16px;
}

.completeIcon {
	font-size: 48px;
	color: var(--MI_THEME-success);
}

.notice {
	background: var(--MI_THEME-bg);
	border-radius: 8px;
	padding: 16px;
	margin: 16px 0;
	text-align: left;
	font-size: 0.9em;

	ul {
		margin: 0;
		padding-left: 20px;
		line-height: 1.8;
	}
}

.transition_x_enterActive,
.transition_x_leaveActive {
	transition: opacity 0.3s cubic-bezier(0,0,.35,1), transform 0.3s cubic-bezier(0,0,.35,1);
}
.transition_x_enterFrom {
	opacity: 0;
	transform: translateX(50px);
}
.transition_x_leaveTo {
	opacity: 0;
	transform: translateX(-50px);
}
</style>
