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
					<i class="ti ti-user-plus" :class="$style.branchIcon"></i>
					<p>招待コードをお持ちですか？</p>
				</div>
				<div :class="$style.branchButtons">
					<MkButton primary full rounded @click="goInviteCode">
						<i class="ti ti-ticket"></i> はい、招待コードを持っています
					</MkButton>
					<MkButton full rounded @click="goApplication">
						<i class="ti ti-pencil"></i> いいえ、持っていません
					</MkButton>
				</div>
			</div>

			<!-- ステップ2a: 従来の招待コード登録 -->
			<div v-else-if="step === 'invite'" key="invite">
				<XServerRules v-if="!isAcceptedServerRule" @done="isAcceptedServerRule = true" @cancel="step = 'branch'; isAcceptedServerRule = false"/>
				<XSignup v-else :autoSet="autoSet" @signup="onSignup" @signupEmailPending="onSignupEmailPending"/>
			</div>

			<!-- ステップ2b: 申請登録フォーム -->
			<div v-else-if="step === 'application'" key="application">
				<MkRegistrationApplication
					@complete="onApplicationComplete"
					@back="step = 'branch'"
				/>
			</div>

			<!-- ステップ3: 申請完了メッセージ -->
			<div v-else-if="step === 'applicationComplete'" key="complete" :class="$style.container">
				<div :class="$style.completeMessage">
					<i class="ti ti-circle-check" :class="$style.completeIcon"></i>
					<h3>必要な入力はすべて完了しました</h3>
					<p>申請が承認された場合、承認のメールが届き、記入されたID名でログインできるようになります。</p>
					<div :class="$style.notice">
						<ul>
							<li>申請の承認には2〜3日ほどかかる場合があります。</li>
							<li>申請が承認されなかった場合、メールは送信されません。</li>
							<li>なお、申請の承認基準は公開していません。</li>
						</ul>
					</div>
					<MkButton primary rounded @click="onClose">閉じる</MkButton>
				</div>
			</div>
		</Transition>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { useTemplateRef, ref } from 'vue';
import * as Misskey from 'cherrypick-js';
import XSignup from '@/components/MkSignupDialog.form.vue';
import XServerRules from '@/components/MkSignupDialog.rules.vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkButton from '@/components/MkButton.vue';
import MkRegistrationApplication from '@/components/MkRegistrationApplication.vue';
import { i18n } from '@/i18n.js';

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
const step = ref<'branch' | 'invite' | 'application' | 'applicationComplete'>('branch');
const isAcceptedServerRule = ref(false);

function goInviteCode() {
	step.value = 'invite';
}

function goApplication() {
	step.value = 'application';
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
	step.value = 'applicationComplete';
}
</script>

<style lang="scss" module>
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
