<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-FileCopyrightText: noridev and cherrypick-project
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div>
	<div :class="$style.banner">
		<MkHatakyuIllustration v-if="useHatakyuBranding()" asset="showingId" :size="64" style="margin: 0 auto;"/><i v-else class="ti ti-file-description"></i>
	</div>
	<div class="_spacer" style="--MI_SPACER-min: 20px; --MI_SPACER-max: 32px;">
		<MkInfo v-if="!applicationsEnabled" warn>{{ i18n.ts._hata._registrationApplications.registrationModeChanged }}</MkInfo>
		<form v-else class="_gaps_m" @submit.prevent="onSubmit">

			<!-- 戻るリンク -->
			<button type="button" :class="$style.backLink" @click="emit('back')">
				<i class="ti ti-arrow-left"></i> {{ copy.back }}
			</button>

			<!-- 1. 登録したい理由 -->
			<div class="_gaps_s">
				<div :class="$style.label">{{ copy.reasonLabel }} <span :class="$style.required">{{ copy.required }}</span></div>
				<textarea
					v-model="reason"
					:class="$style.textarea"
					rows="4"
					maxlength="1024"
					:placeholder="copy.reasonPlaceholder"
				></textarea>
				<div :class="$style.charCount">{{ reason.length }} / 1024</div>
			</div>

			<div class="_gaps_s">
				<label :for="contactsId" :class="$style.label">{{ copy.contactsLabel }} <span :class="$style.optional">({{ i18n.ts.optional }})</span></label>
				<textarea
					:id="contactsId"
					v-model="additionalContacts"
					:class="$style.textarea"
					rows="3"
					maxlength="1024"
					:disabled="submitting"
					:spellcheck="false"
					autocomplete="off"
					:placeholder="copy.contactsPlaceholder"
					:aria-describedby="`${contactsId}-hint`"
				></textarea>
				<div :id="`${contactsId}-hint`" :class="$style.fieldHint">{{ copy.contactsHint }}</div>
			</div>

			<!-- 2. ユーザーID -->
			<MkInput v-model="username" type="text" pattern="^[a-zA-Z0-9_]{1,20}$" :spellcheck="false" autocomplete="username" required @update:modelValue="onChangeUsername">
				<template #label>{{ copy.usernameLabel }} <span :class="$style.required">{{ copy.required }}</span></template>
				<template #prefix>@</template>
				<template #caption>
					<div><i class="ti ti-alert-triangle ti-fw"></i> {{ i18n.ts.cannotBeChangedLater }}</div>
					<span v-if="usernameState === 'wait'" style="color:#999"><MkLoading :em="true"/> {{ i18n.ts.checking }}</span>
					<span v-else-if="usernameState === 'ok'" style="color: var(--MI_THEME-success)"><i class="ti ti-check ti-fw"></i> {{ i18n.ts.available }}</span>
					<span v-else-if="usernameState === 'unavailable'" style="color: var(--MI_THEME-error)"><i class="ti ti-alert-triangle ti-fw"></i> {{ copy.usernameUnavailable }}</span>
					<span v-else-if="usernameState === 'error'" style="color: var(--MI_THEME-error)"><i class="ti ti-alert-triangle ti-fw"></i> {{ i18n.ts.error }}</span>
					<span v-else-if="usernameState === 'invalid-format'" style="color: var(--MI_THEME-error)"><i class="ti ti-alert-triangle ti-fw"></i> {{ i18n.ts.usernameInvalidFormat }}</span>
				</template>
			</MkInput>

			<!-- 3. パスワード -->
			<MkInput v-model="password" type="password" autocomplete="new-password" required @update:modelValue="onChangePassword">
				<template #label>{{ i18n.ts.password }} <span :class="$style.required">{{ copy.required }}</span></template>
				<template #prefix><i class="ti ti-lock"></i></template>
				<template #caption>
					<span v-if="passwordStrength === 'low'" style="color: var(--MI_THEME-error)"><i class="ti ti-alert-triangle ti-fw"></i> {{ i18n.ts.weakPassword }}</span>
					<span v-if="passwordStrength === 'medium'" style="color: var(--MI_THEME-warn)"><i class="ti ti-check ti-fw"></i> {{ i18n.ts.normalPassword }}</span>
					<span v-if="passwordStrength === 'high'" style="color: var(--MI_THEME-success)"><i class="ti ti-check ti-fw"></i> {{ i18n.ts.strongPassword }}</span>
				</template>
			</MkInput>

			<MkInput v-model="retypedPassword" type="password" autocomplete="new-password" required @update:modelValue="onChangePasswordRetype">
				<template #label>{{ i18n.ts.password }} ({{ i18n.ts.retype }}) <span :class="$style.required">{{ copy.required }}</span></template>
				<template #prefix><i class="ti ti-lock"></i></template>
				<template #caption>
					<span v-if="passwordRetypeState === 'match'" style="color: var(--MI_THEME-success)"><i class="ti ti-check ti-fw"></i> {{ i18n.ts.passwordMatched }}</span>
					<span v-if="passwordRetypeState === 'not-match'" style="color: var(--MI_THEME-error)"><i class="ti ti-alert-triangle ti-fw"></i> {{ i18n.ts.passwordNotMatched }}</span>
				</template>
			</MkInput>

			<!-- 4. メールアドレス -->
			<MkInput v-model="email" type="email" required @update:modelValue="onEmailChange">
				<template #label>{{ copy.emailLabel }} <span :class="$style.required">{{ copy.required }}</span></template>
				<template #prefix><i class="ti ti-mail"></i></template>
				<template #caption>
					<!-- 旗鯖fork: メアド重複エラー表示 (送信時にサーバーから EMAIL_ALREADY_EXISTS が返ったら表示) -->
					<div v-if="emailUnavailable" style="color: var(--MI_THEME-error);">
						<i class="ti ti-alert-triangle ti-fw"></i>
						{{ copy.emailUnavailable }}
					</div>
					<span style="color: var(--MI_THEME-fg); opacity: 0.8;">
						<i class="ti ti-info-circle ti-fw"></i>
						{{ copy.emailDescription }}
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
			<div v-if="serverRules.length > 0 || tosUrl || privacyPolicyUrl" class="_gaps_s">
				<div :class="$style.label">{{ copy.agreements }}</div>

				<div v-if="serverRules.length > 0" :class="$style.rulesBox">
					<div :class="$style.rulesTitle">{{ copy.serverRules }}</div>
					<ol :class="$style.rulesList">
						<!-- Server rules use the same administrator-authored markup as MkSignupDialog.rules. -->
						<!-- eslint-disable-next-line vue/no-v-html -->
						<li v-for="(rule, index) in serverRules" :key="index" v-html="rule"></li>
					</ol>
				</div>

				<label v-if="serverRules.length > 0" :class="$style.checkboxLabel">
					<input v-model="agreeRules" type="checkbox" :class="$style.checkbox"/>
					{{ copy.agreeRules }}
				</label>
				<label v-if="tosUrl" :class="$style.checkboxLabel">
					<input v-model="agreeTos" type="checkbox" :class="$style.checkbox"/>
					<a :href="tosUrl" target="_blank" rel="noopener noreferrer">{{ copy.terms }}</a>{{ copy.agreeDocumentSuffix }}
				</label>
				<label v-if="privacyPolicyUrl" :class="$style.checkboxLabel">
					<input v-model="agreePrivacy" type="checkbox" :class="$style.checkbox"/>
					<a :href="privacyPolicyUrl" target="_blank" rel="noopener noreferrer">{{ copy.privacyPolicy }}</a>{{ copy.agreeDocumentSuffix }}
				</label>
			</div>

			<!-- 旗鯖fork: プライバシー情報の取り扱い説明 (送信前の最終確認) -->
			<div :class="$style.privacyNotice">
				<div :class="$style.privacyNoticeHeader">
					<i class="ti ti-info-circle"></i>
					<span>{{ copy.privacyHandling }}</span>
				</div>
				<div :class="$style.privacyNoticeBody">
					<div :class="$style.privacyNoticeSection">
						<div :class="$style.privacyNoticeSectionTitle"><i class="ti ti-shield-lock"></i><span>{{ copy.contactsHandling }}</span></div>
						<p>{{ copy.contactsDeletion }}</p>
					</div>
					<div :class="$style.privacyNoticeSection">
						<div :class="$style.privacyNoticeSectionTitle">
							<i class="ti ti-check" :class="$style.privacyIconApproved"></i>
							<span>{{ copy.ifApproved }}</span>
						</div>
						<p>{{ copy.approvedEmailUse }}</p>
					</div>

					<div :class="$style.privacyNoticeSection">
						<div :class="$style.privacyNoticeSectionTitle">
							<i class="ti ti-x" :class="$style.privacyIconRejected"></i>
							<span>{{ copy.ifRejected }}</span>
						</div>
						<ul>
							<li>{{ copy.rejectedCredentialsDeletedBefore }}<strong>ID</strong>{{ copy.rejectedCredentialsDeletedMiddle }}<strong>{{ i18n.ts.password }}</strong>{{ copy.rejectedCredentialsDeletedAfter }}</li>
							<li><strong>{{ copy.emailLabel }}</strong>{{ copy.rejectedEmailRetention }}</li>
							<li>{{ copy.noRejectionEmail }}</li>
						</ul>
					</div>

					<div :class="$style.privacyNoticeWarning">
						<i class="ti ti-info-circle"></i>
						<span>{{ copy.emailReuseWarning }}</span>
					</div>
				</div>
			</div>

			<!-- 送信ボタン -->
			<MkButton type="submit" :disabled="shouldDisableSubmitting" large gradate rounded style="margin: 0 auto;">
				<template v-if="submitting">
					<MkLoading :em="true" :colored="false"/>
				</template>
				<template v-else><i class="ti ti-send"></i> {{ copy.submit }}</template>
			</MkButton>
		</form>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, computed, onBeforeUnmount, useId, watch } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkInfo from '@/components/MkInfo.vue';
import type { Captcha } from '@/components/MkCaptcha.vue';
import MkCaptcha from '@/components/MkCaptcha.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { fetchInstance, instance } from '@/instance.js';
import MkHatakyuIllustration from '@/components/MkHatakyuIllustration.vue';
import { useHatakyuBranding } from '@/utility/hatakyu-assets.js';
import { i18n } from '@/i18n.js';

const copy = i18n.ts._hata._registrationApplications._application;
const modeUnavailable = ref(false);
const applicationsEnabled = computed(() => instance.disableRegistration === true && !modeUnavailable.value);
const serverRules = computed(() => instance.serverRules ?? []);

function policyUrl(value: string | null | undefined): string | undefined {
	if (!value?.trim()) return undefined;
	try {
		const url = new URL(value, window.location.origin);
		return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
	} catch { return undefined; }
}

const tosUrl = computed(() => policyUrl(instance.tosUrl));
const privacyPolicyUrl = computed(() => policyUrl(instance.privacyPolicyUrl));
let disposed = false;
let modeVersion = 0;

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
const additionalContacts = ref('');
const contactsId = useId();
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

watch(() => instance.disableRegistration, () => { modeUnavailable.value = false; });
watch(applicationsEnabled, () => {
	modeVersion++;
	usernameAbortController.value?.abort();
	if (!applicationsEnabled.value) additionalContacts.value = '';
}, { flush: 'sync' });
watch(() => JSON.stringify(serverRules.value), () => { agreeRules.value = false; }, { flush: 'sync' });
watch(tosUrl, () => { agreeTos.value = false; }, { flush: 'sync' });
watch(privacyPolicyUrl, () => { agreePrivacy.value = false; }, { flush: 'sync' });
onBeforeUnmount(() => { disposed = true; usernameAbortController.value?.abort(); additionalContacts.value = ''; });

// 旗鯖fork: メアド重複検出フラグ (送信時にサーバーから EMAIL_ALREADY_EXISTS が返った時に true)
// メアドが変更されたら false にリセットする
const emailUnavailable = ref(false);

function onEmailChange() {
	if (emailUnavailable.value) {
		emailUnavailable.value = false;
	}
}

// --- パスワード ---
const passwordStrength = ref<'' | 'low' | 'medium' | 'high'>('');
const passwordRetypeState = ref<null | 'match' | 'not-match'>(null);

// --- 送信可否 ---
const shouldDisableSubmitting = computed((): boolean => {
	return !applicationsEnabled.value || submitting.value ||
		reason.value.trim().length === 0 ||
		additionalContacts.value.length > 1024 ||
		usernameState.value !== 'ok' ||
		passwordRetypeState.value !== 'match' ||
		password.value.length < 8 ||
		!email.value.includes('@') ||
		(serverRules.value.length > 0 && !agreeRules.value) ||
		(Boolean(tosUrl.value) && !agreeTos.value) ||
		(Boolean(privacyPolicyUrl.value) && !agreePrivacy.value) ||
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
	usernameAbortController.value?.abort();
	usernameAbortController.value = null;
	if (!applicationsEnabled.value) return;
	if (username.value === '') {
		usernameState.value = null;
		return;
	}

	if (!username.value.match(/^[a-zA-Z0-9_]{1,20}$/)) {
		usernameState.value = 'invalid-format';
		return;
	}

	usernameState.value = 'wait';
	const controller = new AbortController();
	const checkedUsername = username.value;
	usernameAbortController.value = controller;
	const isCurrent = () => !disposed && applicationsEnabled.value && !controller.signal.aborted && usernameAbortController.value === controller && username.value === checkedUsername;

	misskeyApi('username/available', {
		username: checkedUsername,
	}, undefined, controller.signal).then(result => {
		if (isCurrent()) usernameState.value = result.available ? 'ok' : 'unavailable';
	}).catch((err) => {
		if (isCurrent() && err.name !== 'AbortError') {
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
	const version = modeVersion;

	try {
		await (misskeyApi as any)('registration/apply', {
			username: username.value,
			password: password.value,
			reason: reason.value.trim(),
			additionalContacts: additionalContacts.value.trim() || undefined,
			email: email.value.trim(),
			'hcaptcha-response': hCaptchaResponse.value,
			'm-captcha-response': mCaptchaResponse.value,
			'g-recaptcha-response': reCaptchaResponse.value,
			'turnstile-response': turnstileResponse.value,
			'testcaptcha-response': testcaptchaResponse.value,
		}, null);

		additionalContacts.value = '';
		if (!disposed && applicationsEnabled.value && version === modeVersion) emit('complete');
	} catch (err: any) {
		if (disposed) return;
		submitting.value = false;
		resetCaptcha();

		const code = err?.code;
		if (code === 'REGISTRATION_APPLICATIONS_DISABLED') {
			modeUnavailable.value = true;
			let refreshed = false;
			await fetchInstance(true).then(() => { refreshed = true; }).catch(() => { /* Keep the stale form blocked if the refresh fails. */ });
			if (!disposed) {
				os.alert({ type: 'info', text: i18n.ts._hata._registrationApplications.registrationModeChanged });
				if (refreshed) emit('back');
			}
		} else if (code === 'USERNAME_ALREADY_EXISTS') {
			usernameState.value = 'unavailable';
			os.alert({ type: 'error', text: copy.usernameUnavailableAlert });
		} else if (code === 'EMAIL_ALREADY_EXISTS') {
			// 旗鯖fork: メアド重複時はフィールド下にも赤字表示し、モーダルでも通知
			emailUnavailable.value = true;
			os.alert({ type: 'error', text: copy.emailUnavailable });
		} else if (code === 'INVALID_EMAIL') {
			os.alert({ type: 'error', text: copy.invalidEmail });
		} else if (code === 'CAPTCHA_FAILED') {
			os.alert({ type: 'error', text: copy.captchaFailed });
		} else if (code === 'RATE_LIMIT_EXCEEDED') {
			os.alert({ type: 'error', text: copy.rateLimitExceeded });
		} else if (code === 'UNKNOWN_API_ENDPOINT') {
			os.alert({ type: 'error', text: copy.unknownApiEndpoint });
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

.optional {
	font-size: 0.85em;
	font-weight: normal;
}

.fieldHint {
	font-size: 0.9em;
	line-height: 1.7;
	overflow-wrap: anywhere;
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
		outline: 2px solid var(--MI_THEME-accent);
		outline-offset: 2px;
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

/* 旗鯖fork: プライバシー情報の取り扱い説明ボックス (送信前の最終確認) */
.privacyNotice {
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	border-radius: var(--MI-radius);
	overflow: hidden;
}

.privacyNoticeHeader {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 12px 16px;
	background: color-mix(in srgb, var(--MI_THEME-accent) 12%, transparent);
	color: var(--MI_THEME-accent);
	font-weight: bold;
	font-size: 0.95em;
	border-bottom: 1px solid var(--MI_THEME-divider);

	> i {
		font-size: 1.1em;
	}
}

.privacyNoticeBody {
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 14px;
	font-size: 0.9em;
	line-height: 1.7;
}

.privacyNoticeSection {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.privacyNoticeSectionTitle {
	display: flex;
	align-items: center;
	gap: 6px;
	font-weight: 500;
}

.privacyIconApproved {
	color: var(--MI_THEME-success);
}

.privacyIconRejected {
	color: var(--MI_THEME-error);
}

.privacyNoticeSection p {
	margin: 0;
	padding-left: 22px;
}

.privacyNoticeSection ul {
	margin: 0;
	padding-left: 22px;
	list-style-position: inside;
}

.privacyNoticeSection ul li {
	margin-bottom: 4px;
}

.privacyNoticeSection strong {
	color: var(--MI_THEME-accent);
	font-weight: 600;
}

.privacyNoticeWarning {
	display: flex;
	gap: 8px;
	padding: 10px 12px;
	background: color-mix(in srgb, var(--MI_THEME-warn) 12%, transparent);
	border: 1px solid color-mix(in srgb, var(--MI_THEME-warn) 30%, transparent);
	border-radius: 6px;
	color: var(--MI_THEME-warn);
	font-size: 0.85em;
	line-height: 1.5;

	> i {
		flex-shrink: 0;
		margin-top: 2px;
	}
}
</style>
