/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp, h, nextTick, Suspense } from 'vue';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { instance as productionInstance } from '@/instance.js';
import SignupBranch from './MkSignupBranchDialog.vue';
import RegistrationApplication from './MkRegistrationApplication.vue';
import RegistrationApplications from '@/pages/admin/registration-applications.vue';
import Moderation from '@/pages/admin/moderation.vue';
import type { Component } from 'vue';

type MockMeta = {
	disableRegistration: boolean;
	serverRules: string[];
	tosUrl: string | null;
	privacyPolicyUrl: string | null;
	enableHcaptcha: boolean;
	enableMcaptcha: boolean;
	enableRecaptcha: boolean;
	enableTurnstile: boolean;
	enableTestcaptcha: boolean;
};

const instance = productionInstance as unknown as MockMeta;
const mocks = vi.hoisted(() => ({ api: vi.fn(), confirm: vi.fn(), alert: vi.fn(), update: vi.fn(), fetchInstance: vi.fn() }));

vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: mocks.api }));
vi.mock('@/os.js', () => ({ confirm: mocks.confirm, alert: mocks.alert, apiWithDialog: mocks.update }));
vi.mock('@/instance.js', async () => {
	const { reactive } = await import('vue');
	return { instance: reactive<MockMeta>({
		disableRegistration: true, serverRules: [], tosUrl: null, privacyPolicyUrl: null,
		enableHcaptcha: false, enableMcaptcha: false, enableRecaptcha: false, enableTurnstile: false, enableTestcaptcha: false,
	}), fetchInstance: mocks.fetchInstance };
});
vi.mock('@/i18n.js', () => {
	const words = new Proxy({}, { get: (_, key) => String(key) });
	const phrases = new Proxy({}, { get: (_, key) => () => String(key) });
	return { i18n: {
		ts: {
			_hata: { _common: words, _registrationApplications: { _application: words, _admin: words,
				acceptApplications: '申請による登録を受け付ける', openRegistrationConfirm: '登録を一般開放しますか？',
				openRegistrationActive: '現在は登録を一般開放中です', managementPaused: '受付済みの申請は保管されます', registrationModeChanged: '登録方法が変更されました',
			} },
			_serverSettings: { _userGeneratedContentsVisibilityForVisitor: words },
		},
		tsx: { _hata: { _registrationApplications: { _admin: phrases } } },
	} };
});
vi.mock('@/page.js', () => ({ definePage: vi.fn() }));
vi.mock('@/utility/hatakyu-assets.js', () => ({ useHatakyuBranding: () => false }));
vi.mock('@/components/MkButton.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkInput.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkInfo.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkCaptcha.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkHatakyuIllustration.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkModalWindow.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkSignupDialog.form.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkSignupDialog.rules.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkSwitch.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkSelect.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkTextarea.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkFolder.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/form/link.vue', () => ({ default: { render: () => null } }));
vi.mock('@/pages/admin/server-rules.vue', () => ({ default: { render: () => null } }));

type BranchSetup = {
	step: string;
	isAcceptedServerRule: boolean;
	goApplication: () => void;
	goInviteCode: () => void;
	acceptRules: () => void;
	backFromRules: () => void;
	onApplicationComplete: () => void;
};
type ApplicationSetup = {
	applicationsEnabled: boolean;
	serverRules: string[];
	tosUrl: string | undefined;
	privacyPolicyUrl: string | undefined;
	reason: string;
	additionalContacts: string;
	username: string;
	usernameState: string | null;
	password: string;
	passwordRetypeState: string | null;
	email: string;
	agreeRules: boolean;
	agreeTos: boolean;
	agreePrivacy: boolean;
	shouldDisableSubmitting: boolean;
	onSubmit: () => Promise<void>;
	onChangeUsername: () => void;
};
type AdminSetup = {
	applicationsEnabled: boolean;
	status: string;
	items: { id: string }[];
	summary: unknown;
	headerActions: unknown[];
	loading: boolean;
	actionBusy: boolean;
	hasMore: boolean;
	load: () => Promise<void>;
	loadMore: () => Promise<void>;
	loadSummary: () => Promise<void>;
	approve: (item: { id: string; username: string }) => Promise<void>;
	reject: (item: { id: string; username: string }) => Promise<void>;
	runLegacyCleanup: () => Promise<void>;
	runLegacyCleanupDryRun: () => Promise<void>;
};
type ModerationSetup = {
	acceptApplications: boolean;
	savingRegistrationMode: boolean;
	onChange_acceptApplications: (value: boolean) => Promise<void>;
};

const cleanups = new Set<() => void>();

// Run real SFC setup/computed/watch logic with a minimal render; this is not browser layout QA.
function mountSetup<T>(component: Component, props: Record<string, unknown> = {}) {
	let setup!: T;
	const subject = { ...component, render: (...args: unknown[]) => { setup = args[3] as T; return h('div'); } };
	const container = window.document.createElement('div');
	window.document.body.append(container);
	const app = createApp({ render: () => h(Suspense, null, { default: () => h(subject, props) }) });
	app.mount(container);
	const unmount = () => {
		if (!cleanups.delete(unmount)) return;
		app.unmount();
		container.remove();
	};
	cleanups.add(unmount);
	return { get state() { return setup; }, unmount };
}

function deferred<T>() {
	let resolvePromise!: (value: T) => void;
	let rejectPromise!: (reason: unknown) => void;
	const promise = new Promise<T>((resolve, reject) => { resolvePromise = resolve; rejectPromise = reject; });
	return { promise, resolve: resolvePromise, reject: rejectPromise };
}

async function flush() {
	await Promise.resolve();
	await nextTick();
	await Promise.resolve();
	await nextTick();
}

function validApplication(state: ApplicationSetup) {
	state.reason = ' このサーバーで交流したいです ';
	state.username = 'new_member';
	state.usernameState = 'ok';
	state.password = 'sample-password';
	state.passwordRetypeState = 'match';
	state.email = ' member@example.test ';
	state.agreeRules = true;
	state.agreeTos = true;
	state.agreePrivacy = true;
}

beforeEach(() => {
	vi.clearAllMocks();
	Object.assign(instance, {
		disableRegistration: true, serverRules: [], tosUrl: null, privacyPolicyUrl: null,
		enableHcaptcha: false, enableMcaptcha: false, enableRecaptcha: false, enableTurnstile: false, enableTestcaptcha: false,
	});
	mocks.api.mockReset().mockImplementation(async (endpoint: string) => {
		if (endpoint === 'admin/meta') return {
			...instance, sensitiveWords: [], prohibitedWords: [], prohibitedWordsForNameOfUser: [], hiddenTags: [], preservedUsernames: [],
			blockedHosts: [], silencedHosts: [], mediaSilencedHosts: [], trustedLinkUrlPatterns: [], bubbleInstances: [],
		};
		if (endpoint === 'admin/cleanup-legacy-rejected-registrations') return { cleanedCount: 1, alreadyCleanedCount: 2, emailRetainedCount: 3, executedAt: '2026-08-31T00:00:00Z' };
		if (endpoint === 'username/available') return { available: true };
		return [];
	});
	mocks.confirm.mockReset().mockResolvedValue({ canceled: false });
	mocks.update.mockReset().mockImplementation(async (_endpoint: string, data: { disableRegistration: boolean }) => { instance.disableRegistration = data.disableRegistration; });
	mocks.fetchInstance.mockReset().mockImplementation(async () => instance);
});

afterEach(() => { for (const unmount of cleanups) unmount(); });

describe('登録ダイアログのモード分岐', () => {
	test('一般開放は分岐を省き、規則を確認して通常登録へ進む', () => {
		instance.disableRegistration = false;
		const item = mountSetup<BranchSetup>(SignupBranch);
		expect(item.state.step).toBe('invite');
		expect(item.state.isAcceptedServerRule).toBe(false);
		item.state.goApplication();
		expect(item.state.step).toBe('invite');
		item.state.acceptRules();
		expect(item.state.isAcceptedServerRule).toBe(true);
	});

	test('申請制は招待コードと申請の分岐を維持する（陽性対照）', () => {
		const item = mountSetup<BranchSetup>(SignupBranch);
		expect(item.state.step).toBe('branch');
		item.state.goApplication();
		expect(item.state.step).toBe('application');
		item.state.goInviteCode();
		expect(item.state.step).toBe('invite');
	});

	test('開いている間の切替は前の同意を破棄し、遅れた申請完了を受けない', () => {
		const item = mountSetup<BranchSetup>(SignupBranch);
		item.state.goApplication();
		instance.disableRegistration = false;
		expect(item.state.step).toBe('invite');
		item.state.onApplicationComplete();
		expect(item.state.step).toBe('invite');
		item.state.acceptRules();
		instance.disableRegistration = true;
		expect(item.state.step).toBe('branch');
		expect(item.state.isAcceptedServerRule).toBe(false);
	});

	test('申請完了後の案内は切替後も保ち、一般開放の規則キャンセルは閉じる', () => {
		const done = mountSetup<BranchSetup>(SignupBranch);
		done.state.goApplication();
		done.state.onApplicationComplete();
		instance.disableRegistration = false;
		expect(done.state.step).toBe('applicationComplete');
		const onCancelled = vi.fn();
		const open = mountSetup<BranchSetup>(SignupBranch, { onCancelled });
		open.state.backFromRules();
		expect(onCancelled).toHaveBeenCalledOnce();
	});
});

describe('申請フォームのサーバー設定とモード競合', () => {
	test.each(['', ' \n '])('任意の連絡先が空（%j）でも送信できる', async contact => {
		const item = mountSetup<ApplicationSetup>(RegistrationApplication);
		validApplication(item.state);
		item.state.additionalContacts = contact;
		expect(item.state.shouldDisableSubmitting).toBe(false);
		await item.state.onSubmit();
		expect(mocks.api).toHaveBeenCalledWith('registration/apply', expect.objectContaining({ additionalContacts: undefined }), null);
	});

	test('連絡先は改行を保った文字列で送り、送信成功後はフォームから消す', async () => {
		const item = mountSetup<ApplicationSetup>(RegistrationApplication);
		validApplication(item.state);
		item.state.additionalContacts = '  @private@example.test\nhttps://social.example.test/user  ';
		await item.state.onSubmit();
		expect(mocks.api).toHaveBeenCalledWith('registration/apply', expect.objectContaining({ additionalContacts: '@private@example.test\nhttps://social.example.test/user' }), null);
		expect(item.state.additionalContacts).toBe('');
	});

	test('連絡先の1024文字を許可し、上限超過は送信しない', async () => {
		const item = mountSetup<ApplicationSetup>(RegistrationApplication);
		validApplication(item.state);
		item.state.additionalContacts = 'a'.repeat(1024);
		expect(item.state.shouldDisableSubmitting).toBe(false);
		item.state.additionalContacts += 'b';
		expect(item.state.shouldDisableSubmitting).toBe(true);
		await item.state.onSubmit();
		expect(mocks.api).not.toHaveBeenCalled();
	});

	test('送信失敗なら連絡先を再編集でき、エラー内容をコンソールへ出さない', async () => {
		const item = mountSetup<ApplicationSetup>(RegistrationApplication);
		validApplication(item.state);
		item.state.additionalContacts = '@private@example.test';
		const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			mocks.api.mockRejectedValueOnce({ code: 'INTERNAL_ERROR', additionalContacts: item.state.additionalContacts });
			await item.state.onSubmit();
			expect(item.state.additionalContacts).toBe('@private@example.test');
			expect(item.state.shouldDisableSubmitting).toBe(false);
			expect(logged).not.toHaveBeenCalled();
		} finally { logged.mockRestore(); }
	});

	test.each(['mode', 'unmount'])('%sで申請画面を離れたら任意の連絡先を破棄する', action => {
		const item = mountSetup<ApplicationSetup>(RegistrationApplication);
		const state = item.state;
		state.additionalContacts = '@private@example.test';
		if (action === 'mode') instance.disableRegistration = false;
		else item.unmount();
		expect(state.additionalContacts).toBe('');
	});

	test('他サーバーの規則とURLを使い、規約が空なら不要な同意でブロックしない', () => {
		const item = mountSetup<ApplicationSetup>(RegistrationApplication);
		validApplication(item.state);
		item.state.agreeRules = item.state.agreeTos = item.state.agreePrivacy = false;
		expect(item.state.shouldDisableSubmitting).toBe(false);
		instance.serverRules = ['他サーバーの規則'];
		instance.tosUrl = 'https://other.example.test/terms';
		instance.privacyPolicyUrl = 'https://other.example.test/privacy';
		expect(item.state.serverRules).toEqual(['他サーバーの規則']);
		expect(item.state.tosUrl).toBe('https://other.example.test/terms');
		expect(item.state.privacyPolicyUrl).toBe('https://other.example.test/privacy');
		expect(item.state.shouldDisableSubmitting).toBe(true);
	});

	test('サーバー規則と規約URLの変更は同期的に再同意を要求する', () => {
		instance.serverRules = ['規則'];
		instance.tosUrl = 'https://other.example.test/terms';
		instance.privacyPolicyUrl = 'https://other.example.test/privacy';
		const item = mountSetup<ApplicationSetup>(RegistrationApplication);
		validApplication(item.state);
		expect(item.state.shouldDisableSubmitting).toBe(false);
		instance.serverRules.push('追加規則');
		instance.tosUrl += '/updated';
		instance.privacyPolicyUrl += '/updated';
		expect([item.state.agreeRules, item.state.agreeTos, item.state.agreePrivacy]).toEqual([false, false, false]);
		expect(item.state.shouldDisableSubmitting).toBe(true);
	});

	test('HTTP以外のポリシーURLをリンクにしない（有効URLの陽性対照付き）', () => {
		const item = mountSetup<ApplicationSetup>(RegistrationApplication);
		instance.tosUrl = 'https://other.example.test/terms';
		expect(item.state.tosUrl).toBe(instance.tosUrl);
		instance.tosUrl = 'javascript:alert(1)';
		instance.privacyPolicyUrl = 'data:text/html,unsafe';
		expect(item.state.tosUrl).toBeUndefined();
		expect(item.state.privacyPolicyUrl).toBeUndefined();
	});

	test('一般開放では送信とユーザー名照会を止める', async () => {
		instance.disableRegistration = false;
		const item = mountSetup<ApplicationSetup>(RegistrationApplication);
		validApplication(item.state);
		item.state.onChangeUsername();
		await item.state.onSubmit();
		expect(item.state.shouldDisableSubmitting).toBe(true);
		expect(mocks.api).not.toHaveBeenCalled();
	});

	test('申請制では匿名資格で申請を送信して完了する（陽性対照）', async () => {
		const onComplete = vi.fn();
		const item = mountSetup<ApplicationSetup>(RegistrationApplication, { onComplete });
		validApplication(item.state);
		await item.state.onSubmit();
		expect(mocks.api).toHaveBeenCalledWith('registration/apply', expect.objectContaining({ username: 'new_member', reason: 'このサーバーで交流したいです', email: 'member@example.test' }), null);
		expect(onComplete).toHaveBeenCalledOnce();
	});

	test('モード切替後の申請応答を完了として表示しない', async () => {
		const pending = deferred<void>();
		mocks.api.mockReturnValueOnce(pending.promise);
		const onComplete = vi.fn();
		const item = mountSetup<ApplicationSetup>(RegistrationApplication, { onComplete });
		validApplication(item.state);
		const sending = item.state.onSubmit();
		instance.disableRegistration = false;
		pending.resolve();
		await sending;
		expect(onComplete).not.toHaveBeenCalled();
	});

	test.each([true, false])('受付停止エラーで再取得し、再取得成功=%sのときだけ戻す', async refreshed => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			mocks.api.mockRejectedValueOnce({ code: 'REGISTRATION_APPLICATIONS_DISABLED' });
			mocks.fetchInstance.mockImplementationOnce(async () => {
				if (!refreshed) throw new Error('offline');
				instance.disableRegistration = false;
				return instance;
			});
			const onBack = vi.fn();
			const item = mountSetup<ApplicationSetup>(RegistrationApplication, { onBack });
			validApplication(item.state);
			await item.state.onSubmit();
			expect(mocks.fetchInstance).toHaveBeenCalledWith(true);
			expect(item.state.applicationsEnabled).toBe(false);
			expect(onBack).toHaveBeenCalledTimes(refreshed ? 1 : 0);
			await item.state.onSubmit();
			expect(mocks.api).toHaveBeenCalledOnce();
		} finally { spy.mockRestore(); }
	});

	test('古いユーザー名照会は中止され、不正な新しい入力を上書きしない', async () => {
		const pending = deferred<{ available: boolean }>();
		mocks.api.mockReturnValueOnce(pending.promise);
		const item = mountSetup<ApplicationSetup>(RegistrationApplication);
		item.state.username = 'old_name';
		item.state.onChangeUsername();
		const signal = mocks.api.mock.calls[0][3] as AbortSignal;
		item.state.username = 'bad!';
		item.state.onChangeUsername();
		expect(signal.aborted).toBe(true);
		pending.resolve({ available: true });
		await flush();
		expect(item.state.usernameState).toBe('invalid-format');
	});
});

describe('管理申請一覧の受付停止', () => {
	test.each(['approve', 'reject'] as const)('%s後は表示から任意の連絡先も破棄する', async action => {
		const row = { id: 'pending-contacts', username: 'member', status: 'pending', additionalContacts: '@private@example.test' };
		mocks.api.mockResolvedValueOnce([row]);
		const item = mountSetup<AdminSetup>(RegistrationApplications);
		await flush();
		await item.state[action](row);
		expect(row.additionalContacts).toBeNull();
		expect(item.state.items).toEqual([]);
	});

	test.each(['approve', 'reject'] as const)('%sの応答が失敗しても確定済みの申請を再取得して古い連絡先を消す', async action => {
		const row = { id: 'pending-contacts', username: 'member', additionalContacts: '@private@example.test' };
		mocks.api.mockResolvedValueOnce([row]);
		const item = mountSetup<AdminSetup>(RegistrationApplications);
		await flush();
		mocks.api.mockRejectedValueOnce(new Error('response unavailable')).mockResolvedValueOnce([]);
		await item.state[action](row);
		expect(mocks.api).toHaveBeenLastCalledWith('admin/registration-applications', { status: 'pending', limit: 20, offset: 0 }, undefined, expect.any(AbortSignal));
		expect(row.additionalContacts).toBeNull();
		expect(item.state.items).toEqual([]);
	});

	test.each(['mode', 'unmount'])('管理画面を%sで離れると表示済み連絡先も破棄する', async action => {
		const row = { id: 'pending-contacts', username: 'member', additionalContacts: '@private@example.test' };
		mocks.api.mockResolvedValueOnce([row]);
		const item = mountSetup<AdminSetup>(RegistrationApplications);
		await flush();
		if (action === 'mode') instance.disableRegistration = false;
		else item.unmount();
		expect(row.additionalContacts).toBeNull();
	});

	test('一般開放時は全操作・一覧とサマリ取得を停止する', async () => {
		instance.disableRegistration = false;
		const item = mountSetup<AdminSetup>(RegistrationApplications);
		const row = { id: 'pending-1', username: 'member' };
		await item.state.load();
		await item.state.loadMore();
		await item.state.loadSummary();
		await item.state.approve(row);
		await item.state.reject(row);
		await item.state.runLegacyCleanup();
		await item.state.runLegacyCleanupDryRun();
		expect(item.state.headerActions).toEqual([]);
		expect(mocks.confirm).not.toHaveBeenCalled();
		expect(mocks.api).not.toHaveBeenCalled();
	});

	test('申請制では一覧と承認・却下・cleanupを実行できる（陽性対照）', async () => {
		const item = mountSetup<AdminSetup>(RegistrationApplications);
		await flush();
		expect(mocks.api).toHaveBeenCalledWith('admin/registration-applications', { status: 'pending', limit: 20, offset: 0 }, undefined, expect.any(AbortSignal));
		const row = { id: 'pending-1', username: 'member' };
		await item.state.approve(row);
		await item.state.reject(row);
		await item.state.runLegacyCleanupDryRun();
		await item.state.runLegacyCleanup();
		expect(mocks.api).toHaveBeenCalledWith('admin/approve-registration', { applicationId: row.id });
		expect(mocks.api).toHaveBeenCalledWith('admin/reject-registration', { applicationId: row.id });
		expect(mocks.api).toHaveBeenCalledWith('admin/cleanup-legacy-rejected-registrations', { execute: false });
		expect(mocks.api).toHaveBeenCalledWith('admin/cleanup-legacy-rejected-registrations', { execute: true });
	});

	test('OFF切替時は一覧を隠し、遅い一覧応答を捨て、ONで再取得する', async () => {
		const pending = deferred<{ id: string }[]>();
		mocks.api.mockReturnValueOnce(pending.promise);
		const item = mountSetup<AdminSetup>(RegistrationApplications);
		const signal = mocks.api.mock.calls[0][3] as AbortSignal;
		instance.disableRegistration = false;
		expect(signal.aborted).toBe(true);
		pending.resolve([{ id: 'pending-1' }]);
		await flush();
		expect(item.state.items).toEqual([]);
		expect(item.state.headerActions).toEqual([]);
		mocks.api.mockResolvedValueOnce([{ id: 'pending-preserved' }]);
		instance.disableRegistration = true;
		await flush();
		expect(item.state.items).toEqual([{ id: 'pending-preserved' }]);
		expect(mocks.api).toHaveBeenCalledTimes(2);
	});

	test.each(['approve', 'reject', 'runLegacyCleanup'] as const)('%s確認中にOFFになったら書き込みを発行しない', async action => {
		const item = mountSetup<AdminSetup>(RegistrationApplications);
		await flush();
		mocks.api.mockClear();
		const confirmation = deferred<{ canceled: boolean }>();
		mocks.confirm.mockReturnValueOnce(confirmation.promise);
		const acting = item.state[action]({ id: 'pending-1', username: 'member' });
		instance.disableRegistration = false;
		confirmation.resolve({ canceled: false });
		await acting;
		expect(mocks.api).not.toHaveBeenCalled();
		expect(item.state.actionBusy).toBe(false);
	});

	test('受付停止APIエラーで一覧を伏せ、再取得失敗でも操作を復活させない', async () => {
		mocks.api.mockRejectedValueOnce({ code: 'REGISTRATION_APPLICATIONS_DISABLED' });
		mocks.fetchInstance.mockRejectedValueOnce(new Error('offline'));
		const item = mountSetup<AdminSetup>(RegistrationApplications);
		await flush();
		expect(mocks.fetchInstance).toHaveBeenCalledWith(true);
		expect(item.state.applicationsEnabled).toBe(false);
		expect(item.state.items).toEqual([]);
		await item.state.load();
		expect(mocks.api).toHaveBeenCalledOnce();
	});

	test('アンマウント後の一覧応答で表示データを更新しない', async () => {
		const pending = deferred<{ id: string }[]>();
		mocks.api.mockReturnValueOnce(pending.promise);
		const item = mountSetup<AdminSetup>(RegistrationApplications);
		const state = item.state;
		item.unmount();
		pending.resolve([{ id: 'late' }]);
		await flush();
		expect(state.items).toEqual([]);
	});
});

describe('モデレーション設定の登録モード', () => {
	test('OFFへの変更をキャンセルしたら申請制を保ち、設定APIを呼ばない', async () => {
		mocks.confirm.mockResolvedValueOnce({ canceled: true });
		const item = mountSetup<ModerationSetup>(Moderation);
		await flush();
		await item.state.onChange_acceptApplications(false);
		expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', text: '登録を一般開放しますか？' }));
		expect(mocks.update).not.toHaveBeenCalled();
		expect(item.state.acceptApplications).toBe(true);
		expect(item.state.savingRegistrationMode).toBe(false);
	});

	test('OFFはfalseで一般開放、ONはtrueで申請制に保存する', async () => {
		const item = mountSetup<ModerationSetup>(Moderation);
		await flush();
		await item.state.onChange_acceptApplications(false);
		expect(mocks.update).toHaveBeenLastCalledWith('admin/update-meta', { disableRegistration: false });
		expect(item.state.acceptApplications).toBe(false);
		await item.state.onChange_acceptApplications(true);
		expect(mocks.update).toHaveBeenLastCalledWith('admin/update-meta', { disableRegistration: true });
		expect(item.state.acceptApplications).toBe(true);
		expect(mocks.confirm).toHaveBeenCalledOnce();
	});

	test('保存失敗では画面の設定を戻し、多重送信も防ぐ', async () => {
		const pending = deferred<void>();
		mocks.update.mockReturnValueOnce(pending.promise);
		const item = mountSetup<ModerationSetup>(Moderation);
		await flush();
		const saving = item.state.onChange_acceptApplications(false);
		await flush();
		await item.state.onChange_acceptApplications(false);
		expect(mocks.update).toHaveBeenCalledOnce();
		pending.reject(new Error('save failed'));
		await expect(saving).rejects.toThrow('save failed');
		expect(item.state.acceptApplications).toBe(true);
		expect(item.state.savingRegistrationMode).toBe(false);
	});
});

describe('登録設定のテンプレート契約', () => {
	test('任意連絡先は関連付けたラベル・説明を持ち、管理側もプレーンテキストで表示する', () => {
		const root = resolve(process.cwd(), 'src');
		const admin = readFileSync(resolve(root, 'pages/admin/registration-applications.vue'), 'utf8');
		const application = readFileSync(resolve(root, 'components/MkRegistrationApplication.vue'), 'utf8');
		expect(application).toContain('<label :for="contactsId"');
		expect(application).toContain(':aria-describedby="`${contactsId}-hint ${contactsId}-purpose`"');
		expect(application).toContain('copy.contactsDeletion');
		expect(application).toContain('copy.contactsSeparation');
		expect(application).toContain('copy.contactsBackupNotice');
		expect(admin).toContain('v-if="item.status === \'pending\' && item.additionalContacts"');
		expect(admin).toContain('{{ item.additionalContacts }}');
		const unsafeRendering = /v-html="[^"]*additionalContacts|<Mfm[^>]*additionalContacts/;
		expect(unsafeRendering.test('<div v-html="item.additionalContacts"/>')).toBe(true);
		expect(unsafeRendering.test(admin)).toBe(false);
	});

	test('受付停止説明・操作領域の分離とサーバー固有ポリシー参照を保つ', () => {
		const root = resolve(process.cwd(), 'src');
		const admin = readFileSync(resolve(root, 'pages/admin/registration-applications.vue'), 'utf8');
		const application = readFileSync(resolve(root, 'components/MkRegistrationApplication.vue'), 'utf8');
		const moderation = readFileSync(resolve(root, 'pages/admin/moderation.vue'), 'utf8');
		expect(admin).toContain('<MkInfo v-if="!applicationsEnabled">');
		expect(admin).toContain('modeCopy.managementPaused');
		expect(admin).toContain('<div v-else class="_gaps_m">');
		expect(application).toContain(':href="tosUrl"');
		expect(application).toContain(':href="privacyPolicyUrl"');
		expect(application).toContain('v-for="(rule, index) in serverRules"');
		const fixedPolicyPattern = /misskey\.hatachanoima\.net|copy\.rule(?:Age|Gdpr|Moderation)/u;
		expect(fixedPolicyPattern.test('href="https://misskey.hatachanoima.net/policy"')).toBe(true);
		expect(fixedPolicyPattern.test(application)).toBe(false);
		expect(moderation).toContain(':modelValue="acceptApplications" :disabled="savingRegistrationMode"');
	});
});
