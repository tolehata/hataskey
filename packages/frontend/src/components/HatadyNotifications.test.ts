/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createApp, h, nextTick } from 'vue';

const fixtures = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: fixtures.api }));
vi.mock('@/os.js', () => ({ confirm: vi.fn() }));
vi.mock('@/i18n.js', () => ({ i18n: {
	ts: { _hata: { _hatady: { _notifications: {
		title: '通知', filterAll: 'すべて', filterReaction: 'リアクション', filterComment: 'コメント', filterFollow: 'フォロー', filterMilestone: '継続・達成', markAllRead: 'すべて既読', empty: '通知はありません',
	} } } },
	tsx: { _hata: { _hatady: { _notifications: {} } } },
} }));
vi.mock('@/utility/hatady-prefs.js', async () => {
	const { ref } = await import('vue');
	return { hatadyTheme: ref('dark') };
});
vi.mock('@/components/HyDialog.vue', async () => {
	const { defineComponent, h: render } = await import('vue');
	return { default: defineComponent({ setup: (_props, { slots }) => () => render('section', [slots.headerActions?.(), slots.default?.()]) }) };
});
vi.mock('@/components/MkReactionIcon.vue', async () => {
	const { defineComponent, h: render } = await import('vue');
	return { default: defineComponent({ setup: () => () => render('span') }) };
});
import HatadyNotifications from './HatadyNotifications.vue';

const cleanups: Array<() => void> = [];

async function settle() { await nextTick(); await Promise.resolve(); await nextTick(); }

beforeEach(() => {
	vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
	fixtures.api.mockReset();
	fixtures.api.mockImplementation(async (endpoint: string) => endpoint === 'hata/hatady/notifications' ? [
		{ id: 'reaction', type: 'mediaReaction', mediaTitle: 'リアクションの作品', reaction: '👍', user: { id: 'one' }, createdAt: '2020-01-01', isRead: false },
		{ id: 'comment', type: 'mediaReply', mediaTitle: 'コメントの作品', mediaCommentText: '返信の内容', user: { id: 'two' }, createdAt: '2020-01-01', isRead: false },
		{ id: 'follow', type: 'follow', user: { id: 'three' }, createdAt: '2020-01-01', isRead: false },
	] : undefined);
});
afterEach(() => {
	cleanups.splice(0).forEach(cleanup => cleanup());
	vi.unstubAllGlobals();
});

test('notification capsule filters preserve media groups and expose only the selected label with all accessible names', async () => {
	const target = window.document.createElement('div');
	window.document.body.append(target);
	const read = vi.fn();
	const app = createApp({ render: () => h(HatadyNotifications, { onRead: read }) });
	app.component('MkAvatar', { render: () => h('span') });
	app.component('MkUserName', { render: () => h('span', '通知した人') });
	app.mount(target);
	cleanups.push(() => { app.unmount(); target.remove(); });
	await settle();
	const group = target.querySelector('[role="group"][aria-label="通知の種類"]')!;
	expect(group).not.toBeNull();
	const buttons = Array.from(group.querySelectorAll('button'));
	expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual(['すべて', 'リアクション', 'コメント', 'フォロー', '継続・達成']);
	expect(buttons.every(button => button.querySelector('i[aria-hidden="true"]'))).toBe(true);
	for (const label of ['リアクション', 'コメント', 'フォロー', '継続・達成', 'すべて']) {
		buttons.find(button => button.getAttribute('aria-label') === label)!.click();
		await settle();
		expect(buttons.filter(button => button.getAttribute('aria-pressed') === 'true').map(button => button.textContent)).toEqual([label]);
		expect(buttons.filter(button => button.getAttribute('aria-pressed') === 'false').every(button => !button.textContent)).toBe(true);
		expect(target.textContent?.includes('リアクションの作品')).toBe(['すべて', 'リアクション'].includes(label));
		expect(target.textContent?.includes('コメントの作品')).toBe(['すべて', 'コメント'].includes(label));
	}
	expect(fixtures.api).toHaveBeenCalledExactlyOnceWith('hata/hatady/notifications', { limit: 100 });
	Array.from(target.querySelectorAll('button')).find(button => button.textContent?.includes('すべて既読'))!.click();
	await settle();
	expect(fixtures.api).toHaveBeenLastCalledWith('hata/hatady/notifications/mark-all-read', {});
	expect(read).toHaveBeenCalledOnce();
});
