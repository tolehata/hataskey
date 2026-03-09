<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div>
	<div :class="$style.banner">
		<i class="ti ti-file-description"></i>
	</div>
	<div class="_spacer" style="--MI_SPACER-min: 20px; --MI_SPACER-max: 32px;">
		<form class="_gaps_m" @submit.prevent="onSubmit">

			<!-- 戻るリンク -->
			<button type="button" :class="$style.backLink" @click="emit('back')">
				<i class="ti ti-arrow-left"></i> 戻る
			</button>

			<!-- 1. 登録したい理由 -->
			<div class="_gaps_s">
				<div :class="$style.label">このサーバーに登録したい理由 <span :class="$style.required">*必須</span></div>
				<textarea
					v-model="reason"
					:class="$style.textarea"
					rows="4"
					maxlength="1024"
					placeholder="このサーバーに登録したい理由をお聞かせください"
				></textarea>
				<div :class="$style.charCount">{{ reason.length }} / 1024</div>
			</div>

			<!-- 2. ユーザーID -->
			<MkInput v-model="username" type="text" pattern="^[a-zA-Z0-9_]{1,20}$" :spellcheck="false" autocomplete="username" required @update:modelValue="onChangeUsername">
				<template #label>ユーザーID <span :class="$style.required">*必須</span></template>
				<template #prefix>@</template>
				<template #caption>
					<div><i class="ti ti-alert-triangle ti-fw"></i> {{ i18n.ts.cannotBeChangedLater }}</div>
					<span v-if="usernameState === 'wait'" style="color:#999"><MkLoading :em="true"/> {{ i18n.ts.checking }}</span>
					<span v-else-if="usernameState === 'ok'" style="color: var(--MI_THEME-success)"><i class="ti ti-check ti-fw"></i> {{ i18n.ts.available }}</span>
					<span v-else-if="usernameState === 'unavailable'" style="color: var(--MI_THEME-error)"><i class="ti ti-alert-triangle ti-fw"></i> {{ i18n.ts.unavailable }}</span>
					<span v-else-if="usernameState === 'error'" style="color: var(--MI_THEME-error)"><i class="ti ti-alert-triangle ti-fw"></i> {{ i18n.ts.error }}</span>
					<span v-else-if="usernameState === 'invalid-format'" style="color: var(--MI_THEME-error)"><i class="ti ti-alert-triangle ti-fw"></i> {{ i18n.ts.usernameInvalidFormat }}</span>
				</template>
			</MkInput>

			<!-- 3. パスワード -->
			<MkInput v-model="password" type="password" autocomplete="new-password" required @update:modelValue="onChangePassword">
				<template #label>{{ i18n.ts.password }} <span :class="$style.required">*必須</span></template>
				<template #prefix><i class="ti ti-lock"></i></template>
				<template #caption>
					<span v-if="passwordStrength === 'low'" style="color: var(--MI_THEME-error)"><i class="ti ti-alert-triangle ti-fw"></i> {{ i18n.ts.weakPassword }}</span>
					<span v-if="passwordStrength === 'medium'" style="color: var(--MI_THEME-warn)"><i class="ti ti-check ti-fw"></i> {{ i18n.ts.normalPassword }}</span>
					<span v-if="passwordStrength === 'high'" style="color: var(--MI_THEME-success)"><i class="ti ti-check ti-fw"></i> {{ i18n.ts.strongPassword }}</span>
				</template>
			</MkInput>

			<MkInput v-model="retypedPassword" type="password" autocomplete="new-password" required @update:modelValue="onChangePasswordRetype">
				<template #label>{{ i18n.ts.password }} ({{ i18n.ts.retype }}) <span :class="$style.required">*必須</span></template>
				<template #prefix><i class="ti ti-lock"></i></template>
				<template #caption>
					<span v-if="passwordRetypeState === 'match'" style="color: var(--MI_THEME-success)"><i class="ti ti-check ti-fw"></i> {{ i18n.ts.passwordMatched }}</span>
					<span v-if="passwordRetypeState === 'not-match'" style="color: var(--MI_THEME-error)"><i class="ti ti-alert-triangle ti-fw"></i> {{ i18n.ts.passwordNotMatched }}</span>
				</template>
			</MkInput>

			<!-- 4. メールアドレス -->
			<MkInput v-model="email" type="email" required>
				<template #label>メールアドレス <span :class="$style.required">*必須</span></template>
				<template #prefix><i class="ti ti-mail"></i></template>
				<template #caption>
					<span style="color: var(--MI_THEME-fg); opacity: 0.8;">
						<i class="ti ti-info-circle ti-fw"></i>
						申請が承認された場合、このアドレスに通知が届きます。今後のセキュリティ通知にも使用されます。
					</span>
				</template>
			</MkInput>

			<!-- 5. CAPTCHA（MkSignupDialog.form.vue と完全同一パターン） -->
			<MkCaptcha v-if="instance.enableHcaptcha" ref="hcaptcha" v-model="hCaptchaResponse" :class="$style.captcha" provider="hcaptcha" :sitekey="instance.hcaptchaSiteKey"/>
			<MkCaptcha v-if="instance.enableMcaptcha" ref="mcaptcha" v-model="mCaptchaResponse" :class="$style.captcha" provider="mcaptcha" :sitekey="instance.mcaptchaSiteKey" :instanceUrl="instance.mcaptchaInstanceUrl"/>
			<MkCaptcha v-if="instance.enableRecaptcha" ref="recaptcha" v-model="reCaptchaResponse" :class="$style.captcha" provider="recaptcha" :sitekey="instance.recaptchaSiteKey"/>
			<MkCaptcha v-if="instance.enableTurnstile" ref="turnstile" v-model="turnstileResponse" :class="$style.captcha" provider="turnstile" :sitekey="instance.turnstileSiteKey"/>
			<MkCaptcha v-if="instance.enableTestcaptcha" ref="testcaptcha" v-model="testcaptchaResponse" :class="$style.captcha" provider="testcaptcha" :sitekey="null"/>

			<!-- 6. 同意事項 -->
			<div class="_gaps_s">
				<div :class="$style.label">同意事項</div>

				<div :class="$style.rulesBox">
					<div :class="$style.rulesTitle">サーバールール</div>
					<ol :class="$style.rulesList">
						<li>18歳未満は登録できません</li>
						<li>GDPR（EU一般データ保護規則）に対応していないため、いかなる場合もEU圏内からの登録は受け付けておりません。</li>
						<li>利用規約をよくご確認ください。当サーバーは利用者の意見を反映しつつ、管理者の独断でモデレーションを行います。</li>
					</ol>
				</div>

				<label :class="$style.checkboxLabel">
					<input v-model="agreeRules" type="checkbox" :class="$style.checkbox"/>
					上記のサーバールールに同意します
				</label>
				<label :class="$style.checkboxLabel">
					<input v-model="agreeTos" type="checkbox" :class="$style.checkbox"/>
					<a href="https://misskey.hatachanoima.net/@Hatacha/pages/terms" target="_blank">利用規約</a>に同意します
				</label>
				<label :class="$style.checkboxLabel">
					<input v-model="agreePrivacy" type="checkbox" :class="$style.checkbox"/>
					<a href="https://misskey.hatachanoima.net/@Hatacha/pages/privacy" target="_blank">プライバシーポリシー</a>に同意します
				</label>
			</div>

			<!-- 送信ボタン -->
			<MkButton type="submit" :disabled="shouldDisableSubmitting" large gradate rounded style="margin: 0 auto;">
				<template v-if="submitting">
					<MkLoading :em="true" :colored="false"/>
				</template>
				<template v-else><i class="ti ti-send"></i> 申請を送信する</template>
			</MkButton>
		</form>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import type { Captcha } from '@/components/MkCaptcha.vue';
import MkCaptcha from '@/components/MkCaptcha.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { instance } from '@/instance.js';
import { i18n } from '@/i18n.js';

const emit = defineEmits<{
	(ev: 'complete'): void;
	(ev: 'back'): void;
}>();

// --- CAPTCHA refs（MkSignupDialog.form.vue と同一パターン）---
const hcaptcha = ref<Captcha | undefined>();
const mcaptcha = ref<Captcha | undefined>();
const recaptcha = ref<Captcha | undefined>();
const turnstile = ref<Captcha | undefined>();
const testcaptcha = ref<Captcha | undefined>();

// --- フォーム値 ---
const reason = ref('');
const username = ref('');
const password = ref('');
const retypedPassword = ref('');
const email = ref('');
const agreeRules = ref(false);
const agreeTos = ref(false);
const agreePrivacy = ref(false);
const submitting = ref(false);

// --- CAPTCHA レスポンス ---
const hCaptchaResponse = ref<string | null>(null);
const mCaptchaResponse = ref<string | null>(null);
const reCaptchaResponse = ref<string | null>(null);
const turnstileResponse = ref<string | null>(null);
const testcaptchaResponse = ref<string | null>(null);

// --- ユーザー名チェック ---
const usernameState = ref<null | 'wait' | 'ok' | 'unavailable' | 'error' | 'invalid-format'>(null);
const usernameAbortController = ref<null | AbortController>(null);

// --- パスワード ---
const passwordStrength = ref<'' | 'low' | 'medium' | 'high'>('');
const passwordRetypeState = ref<null | 'match' | 'not-match'>(null);

// --- 送信可否 ---
const shouldDisableSubmitting = computed((): boolean => {
	return submitting.value ||
		reason.value.trim().length === 0 ||
		usernameState.value !== 'ok' ||
		passwordRetypeState.value !== 'match' ||
		password.value.length < 8 ||
		!email.value.includes('@') ||
		!agreeRules.value ||
		!agreeTos.value ||
		!agreePrivacy.value ||
		(instance.enableHcaptcha && !hCaptchaResponse.value) ||
		(instance.enableMcaptcha && !mCaptchaResponse.value) ||
		(instance.enableRecaptcha && !reCaptchaResponse.value) ||
		(instance.enableTurnstile && !turnstileResponse.value) ||
		(instance.enableTestcaptcha && !testcaptchaResponse.value);
});

function getPasswordStrength(source: string): number {
	let strength = 0;
	let power = 0.018;
	if (/[a-zA-Z]/.test(source) && /[0-9]/.test(source)) power += 0.020;
	if (/[a-z]/.test(source) && /[A-Z]/.test(source)) power += 0.015;
	if (/[!\x22\#$%&@'()*+,-./_]/.test(source)) power += 0.02;
	strength = power * source.length;
	return Math.max(0, Math.min(1, strength));
}

function onChangeUsername(): void {
	if (username.value === '') {
		usernameState.value = null;
		return;
	}

	if (!username.value.match(/^[a-zA-Z0-9_]+$/)) {
		usernameState.value = 'invalid-format';
		return;
	}

	if (usernameAbortController.value != null) {
		usernameAbortController.value.abort();
	}
	usernameState.value = 'wait';
	usernameAbortController.value = new AbortController();

	misskeyApi('username/available', {
		username: username.value,
	}, undefined, usernameAbortController.value.signal).then(result => {
		usernameState.value = result.available ? 'ok' : 'unavailable';
	}).catch((err) => {
		if (err.name !== 'AbortError') {
			usernameState.value = 'error';
		}
	});
}

function onChangePassword(): void {
	if (password.value === '') {
		passwordStrength.value = '';
		return;
	}

	const s = getPasswordStrength(password.value);
	passwordStrength.value = s > 0.7 ? 'high' : s > 0.3 ? 'medium' : 'low';
}

function onChangePasswordRetype(): void {
	if (retypedPassword.value === '') {
		passwordRetypeState.value = null;
		return;
	}

	passwordRetypeState.value = password.value === retypedPassword.value ? 'match' : 'not-match';
}

function resetCaptcha() {
	hCaptchaResponse.value = null;
	mCaptchaResponse.value = null;
	reCaptchaResponse.value = null;
	turnstileResponse.value = null;
	testcaptchaResponse.value = null;
	hcaptcha.value?.reset?.();
	mcaptcha.value?.reset?.();
	recaptcha.value?.reset?.();
	turnstile.value?.reset?.();
	testcaptcha.value?.reset?.();
}

async function onSubmit(): Promise<void> {
	if (submitting.value || shouldDisableSubmitting.value) return;
	submitting.value = true;

	try {
		await (misskeyApi as any)('registration/apply', {
			username: username.value,
			password: password.value,
			reason: reason.value.trim(),
			email: email.value.trim(),
			'hcaptcha-response': hCaptchaResponse.value,
			'm-captcha-response': mCaptchaResponse.value,
			'g-recaptcha-response': reCaptchaResponse.value,
			'turnstile-response': turnstileResponse.value,
			'testcaptcha-response': testcaptchaResponse.value,
		});

		emit('complete');
	} catch (err: any) {
		submitting.value = false;
		resetCaptcha();

		console.error('[registration/apply] Error:', err);

		const code = err?.code;
		if (code === 'USERNAME_ALREADY_EXISTS') {
			usernameState.value = 'unavailable';
			os.alert({ type: 'error', text: 'このユーザーIDは既に使用されています。' });
		} else if (code === 'CAPTCHA_FAILED') {
			os.alert({ type: 'error', text: 'CAPTCHA認証に失敗しました。もう一度お試しください。' });
		} else if (code === 'RATE_LIMIT_EXCEEDED') {
			os.alert({ type: 'error', text: '申請の送信回数が上限に達しました。しばらくお待ちください。' });
		} else if (code === 'UNKNOWN_API_ENDPOINT') {
			os.alert({ type: 'error', text: 'APIエンドポイントが見つかりません。バックエンドの再ビルドが必要です。' });
		} else {
			os.alert({ type: 'error', text: `${i18n.ts.somethingHappened} (${code || 'unknown'})` });
		}
		return;
	}

	submitting.value = false;
}
</script>

<style lang="scss" module>
.banner {
	padding: 16px;
	text-align: center;
	font-size: 26px;
	background-color: var(--MI_THEME-accentedBg);
	color: var(--MI_THEME-accent);
}

.captcha {
	margin: 16px 0;
}

.backLink {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	color: var(--MI_THEME-accent);
	background: none;
	border: none;
	cursor: pointer;
	font-size: 0.9em;

	&:hover {
		text-decoration: underline;
	}
}

.label {
	font-weight: bold;
	font-size: 0.95em;
}

.required {
	color: var(--MI_THEME-error);
	font-size: 0.8em;
}

.textarea {
	width: 100%;
	padding: 10px 12px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 6px;
	background: var(--MI_THEME-panel);
	color: var(--MI_THEME-fg);
	font-size: 1em;
	resize: vertical;
	box-sizing: border-box;
	font-family: inherit;

	&:focus {
		border-color: var(--MI_THEME-accent);
		outline: none;
	}
}

.charCount {
	text-align: right;
	font-size: 0.8em;
	opacity: 0.6;
}

.checkboxLabel {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
	font-size: 0.95em;

	a {
		color: var(--MI_THEME-accent);
		text-decoration: underline;
	}
}

.rulesBox {
	background: var(--MI_THEME-bg);
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 8px;
	padding: 16px;
}

.rulesTitle {
	font-weight: bold;
	font-size: 0.95em;
	margin-bottom: 8px;
}

.rulesList {
	margin: 0;
	padding-left: 24px;
	line-height: 1.7;
	font-size: 0.9em;
}

.checkbox {
	width: 18px;
	height: 18px;
	accent-color: var(--MI_THEME-accent);
}
</style>
