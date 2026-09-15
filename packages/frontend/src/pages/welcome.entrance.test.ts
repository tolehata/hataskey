/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createApp, defineComponent, h, nextTick, reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { instance as productionInstance } from '@/instance.js';
import WelcomeFederation from './welcome.entrance.federation.vue';
import WelcomeServerNotes from './welcome.entrance.notes.vue';
import WelcomeEntrance from './welcome.entrance.hataskey.vue';
import type { Component } from 'vue';
import type { entities } from 'cherrypick-js';

type MockMeta = {
	name: string | null;
	iconUrl: string | null;
	backgroundImageUrl: string | null;
	repositoryUrl: string | null;
	impressumUrl: string | null;
	tosUrl: string | null;
	privacyPolicyUrl: string | null;
	federation: 'all' | 'none' | 'specified';
	policies: { ltlAvailable: boolean };
	clientOptions: { showTimelineForVisitor: boolean };
};

const instance = productionInstance as unknown as MockMeta;

const mocks = vi.hoisted(() => ({
	api: vi.fn<(endpoint: string, params: Record<string, unknown>, token: string | null, signal: AbortSignal) => Promise<entities.Note[] | { pong: number }>>(),
	get: vi.fn<(endpoint: string, params: Record<string, unknown>) => Promise<entities.FederationInstance[]>>(),
	measure: vi.fn(),
	mount: vi.fn(),
	destroy: vi.fn(),
	clockUpdate: vi.fn(),
	federationModeUpdate: vi.fn(),
	controllerOptions: undefined as Record<string, unknown> | undefined,
	eventOn: vi.fn(),
	eventOff: vi.fn(),
}));

vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: mocks.api, misskeyApiGet: mocks.get }));
vi.mock('@/instance.js', async () => {
	const { reactive: makeReactive } = await import('vue');
	return { instance: makeReactive<MockMeta>({
		name: '実サーバー', iconUrl: null, backgroundImageUrl: null, repositoryUrl: null,
		impressumUrl: null, tosUrl: null, privacyPolicyUrl: null,
		federation: 'all', policies: { ltlAvailable: true }, clientOptions: { showTimelineForVisitor: true },
	}) };
});
vi.mock('@@/js/config.js', () => ({ url: 'https://server.test', instanceName: 'server.test', lang: 'ja-JP', version: 'test-version', basedMisskeyVersion: 'test-base' }));
vi.mock('@/i18n.js', () => ({ i18n: {
	ts: { impressum: '運営者情報', termsOfService: '利用規約', privacyPolicy: 'プライバシーポリシー', syncDeviceDarkMode: '端末と同期' },
	tsx: { switchDarkModeManuallyWhenSyncEnabledConfirm: () => '同期を解除しますか' },
} }));
vi.mock('@/preferences.js', async () => {
	const { ref } = await import('vue');
	return { prefer: { r: { syncDeviceDarkMode: ref(false), animation: ref(true) }, commit: vi.fn() } };
});
vi.mock('@/store.js', async () => {
	const { ref } = await import('vue');
	return { store: { r: { darkMode: ref(false) }, set: vi.fn() } };
});
vi.mock('@/events.js', () => ({ globalEvents: { on: mocks.eventOn, off: mocks.eventOff } }));
vi.mock('@/local-storage.js', () => ({ miLocalStorage: { setItem: vi.fn() } }));
vi.mock('@/router.js', () => ({ mainRouter: { push: vi.fn() } }));
vi.mock('@/os.js', () => ({ popup: vi.fn(), confirm: vi.fn() }));
vi.mock('@/components/MkSigninDialog.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkSignupBranchDialog.vue', () => ({ default: { render: () => null } }));
vi.mock('./welcome.entrance.hatask-preview.vue', () => ({ default: { render: () => null } }));
vi.mock('./welcome.entrance.hatady-preview.vue', () => ({ default: { render: () => null } }));
vi.mock('./welcome.entrance.hatafeed-preview.vue', () => ({ default: { render: () => null } }));
vi.mock('./welcome.entrance.hataskey.js', () => ({
	HataskeyWelcomeController: class {
		root = null;
		destroyed = false;
		constructor(options: Record<string, unknown>) { mocks.controllerOptions = options; }
		mount = mocks.mount;
		destroy = () => { this.destroyed = true; mocks.destroy(); };
		requestMeasure = mocks.measure;
		updateHataskClock = mocks.clockUpdate;
		setFederationMode = mocks.federationModeUpdate;
		setLanguage = vi.fn();
		applyColorMode = vi.fn();
	},
}));
vi.mock('@/components/global/MkA.vue', async () => {
	const { defineComponent: component, h: element } = await import('vue');
	return { default: component({
		props: { to: { type: String, required: true }, behavior: String },
		setup: (props, { slots }) => () => element('a', { href: props.to }, slots.default?.()),
	}) };
});
vi.mock('@/components/global/MkMfm.js', async () => {
	const { defineComponent: component, h: element } = await import('vue');
	return { default: component({
		props: { text: String, plain: Boolean, nowrap: Boolean, author: Object, emojiUrls: Object },
		setup: props => () => element('span', { 'data-mfm-plain': String(props.plain), 'data-mfm-nowrap': String(props.nowrap) }, props.text),
	}) };
});
vi.mock('@/components/global/MkUserName.vue', async () => {
	const { defineComponent: component, h: element } = await import('vue');
	return { default: component({
		props: { user: { type: Object, required: true } },
		setup: props => () => element('span', props.user.name ?? props.user.username),
	}) };
});
vi.mock('@/components/global/MkTime.vue', async () => {
	const { defineComponent: component, h: element } = await import('vue');
	return { default: component({ props: { time: String }, setup: props => () => element('time', { datetime: props.time }, props.time) }) };
});
vi.mock('@/filters/user.js', () => ({
	acct: (user: entities.UserLite) => user.host == null ? user.username : `${user.username}@${user.host}`,
	userPage: (user: entities.UserLite) => `/@${user.username}`,
}));

function userFixture(overrides: Partial<entities.UserLite> = {}): entities.UserLite {
	return {
		id: 'user-1', name: '投稿者', username: 'visitor', host: null,
		avatarUrl: 'https://server.test/avatar.png', avatarBlurhash: null, avatarDecorations: [],
		isLocked: false, emojis: {}, onlineStatus: 'unknown', ...overrides,
	};
}

function noteFixture(overrides: Partial<entities.Note> = {}): entities.Note {
	return {
		id: 'note1', createdAt: '2026-08-31T00:00:00.000Z', text: '公開された実投稿', cw: null,
		userId: 'user-1', user: userFixture(), visibility: 'public', reactionAcceptance: null,
		reactionEmojis: {}, reactions: {}, reactionCount: 0, renoteCount: 0, repliesCount: 0,
		hasDeliveryTargets: false, ...overrides,
	};
}

function serverFixture(id: string, host = `${id}.test`): entities.FederationInstance {
	return {
		id, host, firstRetrievedAt: '2026-08-31T00:00:00.000Z', usersCount: 1, notesCount: 1,
		followingCount: 1, followersCount: 1, isNotResponding: false, isSuspended: false,
		suspensionState: 'none', isBlocked: false, softwareName: null, softwareVersion: null,
		openRegistrations: null, name: null, description: null, maintainerName: null,
		maintainerEmail: null, isSilenced: false, isMediaSilenced: false, iconUrl: null,
		faviconUrl: null, themeColor: null, infoUpdatedAt: null, latestRequestReceivedAt: null,
	};
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}

const cleanup = new Set<() => void>();

function mount(component: Component, props: Record<string, unknown> = {}) {
	const container = window.document.createElement('div');
	window.document.body.append(container);
	const app = createApp(defineComponent({ setup: () => () => h(component, { ...props }) }));
	app.mount(container);
	const unmount = () => {
		if (!cleanup.delete(unmount)) return;
		app.unmount();
		container.remove();
	};
	cleanup.add(unmount);
	return { container, unmount };
}

async function flush() {
	await Promise.resolve();
	await nextTick();
	await Promise.resolve();
	await nextTick();
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.controllerOptions = undefined;
	mocks.api.mockReset().mockResolvedValue([]);
	mocks.get.mockReset().mockResolvedValue([]);
	instance.name = '実サーバー';
	instance.iconUrl = null;
	instance.backgroundImageUrl = null;
	instance.repositoryUrl = null;
	instance.impressumUrl = null;
	instance.tosUrl = null;
	instance.privacyPolicyUrl = null;
	instance.federation = 'all';
	instance.policies.ltlAvailable = true;
	instance.clientOptions.showTimelineForVisitor = true;
});

afterEach(() => {
	for (const unmount of cleanup) unmount();
});

describe('ログイン前の実投稿プレビュー', () => {
 test('読み込み状態を表示し、明示的なゲスト資格で取得した実投稿とリアクションへ置き換える', async () => {
  const pending = deferred<entities.Note[]>();
  mocks.api.mockReturnValueOnce(pending.promise);
  const onResize = vi.fn();
  const item = mount(WelcomeServerNotes, { language: 'ja', onResize });
  expect(item.container.querySelector('[data-status="loading"]')).not.toBeNull();
  expect(mocks.api).toHaveBeenCalledWith('notes/local-timeline', { limit: 100, withRenotes: false }, null, expect.any(AbortSignal));
  pending.resolve([noteFixture({ reactions: { '🌼': 3 }, reactionCount: 3 })]);
  await flush();
  expect(item.container.querySelector('.welcome-notes-heading h3')?.textContent).toBe('サーバーの投稿公開');
  expect(item.container.querySelector('.welcome-note-body p')?.textContent).toBe('公開された実投稿');
  expect(item.container.querySelector('.welcome-reaction')?.textContent).toBe('🌼3');
  expect(onResize).toHaveBeenCalled();
  expect(mocks.api.mock.calls.every(call => call[2] === null)).toBe(true);
 });

 test.each([[false, true], [true, false], [false, false]])('LTL=%s / ゲスト表示=%s では取得も表示もしない', async (ltl, show) => {
  instance.policies.ltlAvailable = ltl;
  instance.clientOptions.showTimelineForVisitor = show;
  const item = mount(WelcomeServerNotes, { language: 'ja' });
  await flush();
  expect(mocks.api).not.toHaveBeenCalled();
  expect(item.container.querySelector('.hero-server-notes')).toBeNull();
 });

 test('実投稿を2コピーし、複製を読み上げ・操作から除外する', async () => {
  mocks.api.mockResolvedValueOnce([noteFixture(), noteFixture({ id: 'note2' })]);
  const item = mount(WelcomeServerNotes, { language: 'en' });
  await flush();
  const groups = item.container.querySelectorAll<HTMLElement>('.welcome-notes-group');
  expect(groups).toHaveLength(2);
  expect(groups[0].hasAttribute('aria-hidden')).toBe(false);
  expect(groups[0].inert).toBe(false);
  expect(groups[1].getAttribute('aria-hidden')).toBe('true');
  expect(groups[1].inert).toBe(true);
  expect(item.container.querySelector('.welcome-notes-window')?.getAttribute('aria-label')).toBe('Server notes');
  expect(item.container.querySelector('.public-note-avatar img')?.getAttribute('src')).toBe('https://server.test/avatar.png');
  expect(item.container.querySelector('time')?.getAttribute('datetime')).toBe('2026-08-31T00:00:00.000Z');
  expect(item.container.querySelector('.welcome-note-meta a')?.getAttribute('href')).toBe('https://server.test/notes/note1');
  const toggle = item.container.querySelector<HTMLButtonElement>('.welcome-notes-heading button')!;
  toggle.click(); await flush();
  expect(item.container.querySelectorAll('.welcome-notes-group')).toHaveLength(1);
  expect(toggle.getAttribute('aria-pressed')).toBe('true');
 });

 test('CWは明示的に開くまで本文を渡さず、空のCWでも本文へフォールバックしない', async () => {
  mocks.api.mockResolvedValueOnce([
   noteFixture({ id: 'cw', cw: '<img src=x onerror=alert(1)>', text: '隠すべき本文' }),
   noteFixture({ id: 'emptycw', cw: '', text: '空CWの内部本文' }),
  ]);
  const item = mount(WelcomeServerNotes, { language: 'ja' });
  await flush();
  const warnings = item.container.querySelectorAll<HTMLDetailsElement>('.public-note-warning');
  expect(warnings[0].textContent).toBe('<img src=x onerror=alert(1)>');
  expect(warnings[0].querySelector('img')).toBeNull();
  expect(warnings[1].textContent).toBe('内容の注意書き');
  expect(item.container.textContent).not.toContain('隠すべき本文');
  expect(item.container.textContent).not.toContain('空CWの内部本文');
  warnings[0].open = true;
  warnings[0].dispatchEvent(new Event('toggle'));
  await flush();
  expect(warnings[0].textContent).toContain('隠すべき本文');
 });

 test('取得失敗・空応答を架空投稿で補完せず、局所的な状態を表示する', async () => {
  mocks.api.mockRejectedValueOnce(new Error('unavailable'));
  const failed = mount(WelcomeServerNotes, { language: 'ja' });
  await flush();
  expect(failed.container.querySelector('[data-status="error"]')).not.toBeNull();
  expect(failed.container.querySelector('.public-note')).toBeNull();
  const empty = mount(WelcomeServerNotes, { language: 'ja' });
  await flush();
  expect(empty.container.querySelector('[data-status="empty"]')).not.toBeNull();
  expect(empty.container.querySelector('.public-note')).toBeNull();
 });

 test('許可撤回でabortし、再許可後の投稿を古い応答で上書きしない', async () => {
  const stale = deferred<entities.Note[]>(), fresh = deferred<entities.Note[]>();
  let latestCalls = 0;
  mocks.api.mockImplementation((endpoint, params) => endpoint === 'notes/local-timeline' && !params.withFiles ? (++latestCalls === 1 ? stale.promise : fresh.promise) : Promise.resolve([]));
  const item = mount(WelcomeServerNotes, { language: 'ja' });
  const signal = mocks.api.mock.calls[0][3];
  instance.clientOptions.showTimelineForVisitor = false;
  await flush();
  expect(signal.aborted).toBe(true);
  expect(item.container.querySelector('.hero-server-notes')).toBeNull();
  instance.clientOptions.showTimelineForVisitor = true;
  await flush();
  expect(latestCalls).toBe(2);
  fresh.resolve([noteFixture({ text: '新しい応答' })]);
  await flush();
  stale.resolve([noteFixture({ text: '古い応答' })]);
  await flush();
  expect(item.container.querySelector('.welcome-note-body p')?.textContent).toBe('新しい応答');
 });

 test('アンマウント後はabortしてresizeをemitしない', async () => {
  const pending = deferred<entities.Note[]>();
  mocks.api.mockReturnValueOnce(pending.promise);
  const onResize = vi.fn();
  const item = mount(WelcomeServerNotes, { language: 'ja', onResize });
  const signal = mocks.api.mock.calls[0][3];
  item.unmount();
  expect(signal.aborted).toBe(true);
  pending.resolve([noteFixture()]);
  await flush();
  expect(onResize).not.toHaveBeenCalled();
 });

 test('言語propの更新だけでは再取得せず見出しを更新する', async () => {
  mocks.api.mockResolvedValueOnce([noteFixture()]);
  const props = reactive({ language: 'ja' as 'ja' | 'en' });
  const item = mount(WelcomeServerNotes, props);
  await flush();
  const calls = mocks.api.mock.calls.length;
  props.language = 'en';
  await flush();
  expect(item.container.querySelector('.welcome-notes-heading h3')?.textContent).toBe('Server notesPublic');
  expect(mocks.api).toHaveBeenCalledTimes(calls);
 });
});

describe('ログイン前の連合帯', () => {
	test.each(['none', 'specified'] as const)('連合モード%sでは取得も表示もしない', async federation => {
		instance.federation = federation;
		const item = mount(WelcomeFederation);
		await flush();
		expect(mocks.get).not.toHaveBeenCalled();
		expect(item.container.querySelector('.federation-belt')).toBeNull();
	});

	test('取得完了までは隠し、実ホストを2行の複製ループへ表示する', async () => {
		const pending = deferred<entities.FederationInstance[]>();
		mocks.get.mockReturnValueOnce(pending.promise);
		const onResize = vi.fn();
		const item = mount(WelcomeFederation, { onResize });
		expect(item.container.querySelector('.federation-belt')).toBeNull();
		expect(mocks.get).toHaveBeenCalledWith('federation/instances', { sort: '+pubSub', limit: 20, blocked: false });
		pending.resolve(['one', 'two', 'three', 'four'].map(id => serverFixture(id)));
		await flush();
		const tracks = item.container.querySelectorAll('.federation-track');
		expect(tracks).toHaveLength(2);
		expect(tracks[1].classList.contains('is-reverse')).toBe(true);
		for (const track of tracks) {
			const groups = track.querySelectorAll<HTMLElement>('.federation-group');
			expect(groups).toHaveLength(2);
			expect(groups[0].inert).toBe(false);
			expect(groups[1].inert).toBe(true);
			expect(groups[1].getAttribute('aria-hidden')).toBe('true');
			expect(groups[0].textContent).toBe(groups[1].textContent);
		}
		expect(item.container.querySelector('.federation-server')?.getAttribute('href')).toBe('/instance-info/one.test');
		expect(onResize).toHaveBeenCalledOnce();
	});

	test('取得失敗・空応答では架空ホストを表示しない', async () => {
		mocks.get.mockRejectedValueOnce(new Error('unavailable'));
		const failed = mount(WelcomeFederation);
		await flush();
		expect(failed.container.querySelector('.federation-belt')).toBeNull();
		const empty = mount(WelcomeFederation);
		await flush();
		expect(empty.container.querySelector('.federation-belt')).toBeNull();
	});

	test('all以外へ切り替える前の後着応答はallへ戻した後の一覧へ混ぜない', async () => {
		const stale = deferred<entities.FederationInstance[]>();
		const fresh = deferred<entities.FederationInstance[]>();
		mocks.get.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
		const item = mount(WelcomeFederation);
		instance.federation = 'specified';
		await flush();
		expect(mocks.get).toHaveBeenCalledOnce();
		expect(item.container.querySelector('.federation-belt')).toBeNull();
		instance.federation = 'all';
		await flush();
		expect(mocks.get).toHaveBeenCalledTimes(2);
		fresh.resolve([serverFixture('fresh')]);
		await flush();
		stale.resolve([serverFixture('stale')]);
		await flush();
		expect(item.container.querySelector('.federation-server')?.textContent).toBe('fresh.test');
		expect(item.container.textContent).not.toContain('stale.test');
	});

	test('アンマウント後に応答してもresizeをemitしない', async () => {
		const pending = deferred<entities.FederationInstance[]>();
		mocks.get.mockReturnValueOnce(pending.promise);
		const onResize = vi.fn();
		const item = mount(WelcomeFederation, { onResize });
		item.unmount();
		pending.resolve([serverFixture('late')]);
		await flush();
		expect(onResize).not.toHaveBeenCalled();
	});
});

type EntranceSetup = {
	serverName: string;
	serverLoginLabel: string;
	serverIcon: string;
	serverBackground: string;
	legalLinks: { href: string; label: string; icon: string }[];
};

// 巨大なデモやアニメーションはmountせず、実SFCのsetup・computed・watchを使う。
// 表示検査の対象は実メタから作られる値。入口全体のレイアウト検査ではない。
function mountMetadata() {
	return mount({
		...WelcomeEntrance,
		render: (...args: unknown[]) => {
			const setup = args[3] as EntranceSetup;
			return h('section', { 'data-background': setup.serverBackground }, [
				h('h1', setup.serverName), h('button', setup.serverLoginLabel),
				h('img', { src: setup.serverIcon }),
				...setup.legalLinks.map(link => h('a', { href: link.href }, link.label)),
			]);
		},
	});
}

describe('実入口SFCのサーバーメタ連携', () => {
	beforeEach(() => { instance.policies.ltlAvailable = false; });
	test('公開pingを一度だけ使って時計を同期し、連合設定をコントローラーへ渡す', async () => {
		instance.federation = 'specified';
		mocks.api.mockResolvedValueOnce({ pong: Date.now() });
		const item = mountMetadata();
		await flush();
		expect(mocks.api).toHaveBeenCalledOnce();
		expect(mocks.api).toHaveBeenCalledWith('ping', {}, null, expect.any(AbortSignal));
		expect(mocks.controllerOptions?.federationMode).toBe('specified');
		expect(mocks.controllerOptions?.now).toBeTypeOf('function');
		expect(mocks.clockUpdate).toHaveBeenCalledOnce();
		item.unmount();
	});

	test('後着したサーバーメタの連合設定をコントローラーへ反映する', async () => {
		const item = mountMetadata();
		await flush();
		instance.federation = 'specified';
		await flush();
		expect(mocks.federationModeUpdate).toHaveBeenLastCalledWith('specified');
		instance.federation = 'none';
		await flush();
		expect(mocks.federationModeUpdate).toHaveBeenLastCalledWith('none');
		item.unmount();
	});

	test('アンマウント時に未完了の時計同期をabortし、後着応答を反映しない', async () => {
		const pending = deferred<{ pong: number }>();
		mocks.api.mockReturnValueOnce(pending.promise);
		const item = mountMetadata();
		await flush();
		const signal = mocks.api.mock.calls[0][3];
		item.unmount();
		expect(signal.aborted).toBe(true);
		pending.resolve({ pong: Date.now() });
		await flush();
		expect(mocks.clockUpdate).not.toHaveBeenCalled();
	});

	test('実サーバー名・アイコン・背景・規約を表示し、メタ更新へ追従する', async () => {
		instance.name = '旗池テスト';
		instance.iconUrl = 'https://server.test/instance.png';
		instance.backgroundImageUrl = 'https://server.test/banner.png';
		instance.tosUrl = 'https://server.test/terms';
		const item = mountMetadata();
		await flush();
		expect(item.container.querySelector('h1')?.textContent).toBe('旗池テスト');
		expect(item.container.querySelector('button')?.textContent).toBe('旗池テストにログイン');
		expect(item.container.querySelector('img')?.getAttribute('src')).toBe('https://server.test/instance.png');
		expect(item.container.querySelector('section')?.getAttribute('data-background')).toBe('url("https://server.test/banner.png")');
		expect(item.container.querySelector('a')?.getAttribute('href')).toBe('https://server.test/terms');
		instance.name = '更新後のサーバー';
		await flush();
		expect(item.container.querySelector('button')?.textContent).toBe('更新後のサーバーにログイン');
		expect(mocks.measure).toHaveBeenCalled();
	});

	test('HTML入りの名前はテキストにし、非HTTPのメタURLを出力しない', async () => {
		instance.name = '<img src=x onerror=alert(1)>';
		instance.iconUrl = 'javascript:alert(1)';
		instance.backgroundImageUrl = 'data:text/html,unsafe';
		instance.tosUrl = 'javascript:alert(1)';
		instance.impressumUrl = 'data:text/html,unsafe';
		instance.privacyPolicyUrl = 'https://server.test/privacy';
		const item = mountMetadata();
		await flush();
		expect(item.container.querySelector('h1')?.textContent).toBe('<img src=x onerror=alert(1)>');
		expect(item.container.querySelector('h1 img')).toBeNull();
		expect(item.container.querySelector('img')?.getAttribute('src')).toBe('/favicon.ico');
		expect(item.container.querySelector('section')?.getAttribute('data-background')).toBe('none');
		expect(Array.from(item.container.querySelectorAll('a'), node => node.getAttribute('href'))).toEqual(['https://server.test/privacy']);
		item.unmount();
		expect(mocks.destroy).toHaveBeenCalledOnce();
		expect(mocks.eventOff).toHaveBeenCalledWith('themeChanging', expect.any(Function));
	});
});
