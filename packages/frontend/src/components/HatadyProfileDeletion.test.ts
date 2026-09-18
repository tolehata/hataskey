/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, expect, test, vi } from 'vitest';
import { createApp, h, nextTick, ref } from 'vue';

const fixture = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: fixture.api }));
vi.mock('@/os.js', () => ({}));
vi.mock('@/utility/hatady.js', () => ({ HY_BANNER_PRESETS: [] }));
vi.mock('@/utility/hatady-ui.js', () => ({
	hatadyDuration: () => '30分', hatadyNotify: vi.fn(), HATADY_RECORD_TAGS: [], HATADY_ACTIVITY_CHOICES: [],
}));
vi.mock('@/utility/hatady-prefs.js', async () => ({
	hatadyTheme: (await import('vue')).ref('paper'), hatadyTzOffset: () => 540,
}));
vi.mock('@/i18n.js', () => ({ i18n: {
	ts: { _hata: { _hatady: { _profile: { title: 'プロフィール', loading: '読込中', notFound: '読込できません', noPosts: '記録はありません' } } } },
	tsx: { _hata: { _hatady: { _profile: {} } } },
} }));
vi.mock('@/components/HyDialog.vue', async () => {
	const { defineComponent, h: render } = await import('vue');
	return { default: defineComponent({
		props: { title: String },
		setup(props, { slots }) { return () => render('section', { 'data-dialog': props.title }, slots.default?.()); },
	}) };
});
vi.mock('@/components/HatadyActivityCard.vue', async () => {
	const { defineComponent, h: render } = await import('vue');
	return { default: defineComponent({
		props: { activity: Object }, emits: ['deleted'],
		setup(props, { emit }) {
			return () => render('button', { 'data-record': props.activity?.id, onClick: () => emit('deleted') }, props.activity?.study.title);
		},
	}) };
});
vi.mock('@/components/HatadyProfileDesign.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/HyBookCover.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/HyMediaCover.vue', () => ({ default: { render: () => null } }));
import HatadyProfile from './HatadyProfile.vue';

const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); });

async function settle() {
	for (let i = 0; i < 6; i++) { await nextTick(); await Promise.resolve(); }
}

test('a profile response started before deletion cannot restore the record after the newer reload fails', async () => {
	const activity = {
		id: 'log-one', type: 'study', isMine: true, occurredAt: new Date().toISOString(),
		study: { id: 'log-one', title: '削除した記録', userId: 'viewer' },
	};
	const profile = {
		user: { id: 'viewer', username: 'viewer' }, isMe: true, activities: [activity], books: [],
		followingCount: 0, followersCount: 0, totalSeconds: 1800,
		design: { hidden: ['traits', 'shelf', 'work'] },
	};
	// Keep the pre-deletion server snapshot separate from the component's local removal.
	const staleProfile = structuredClone(profile);
	let resolveOld!: (value: typeof profile) => void;
	const oldResponse = new Promise<typeof profile>(resolve => { resolveOld = resolve; });
	let reads = 0;
	fixture.api.mockReset().mockImplementation((endpoint: string) => {
		if (endpoint === 'hata/hatady/media/works/list') return Promise.resolve([]);
		if (endpoint !== 'hata/hatady/users/show') throw new Error(`Unexpected API: ${endpoint}`);
		reads++;
		if (reads === 1) return Promise.resolve(profile);
		if (reads === 2) return oldResponse;
		return Promise.reject(new Error('Latest reload failed'));
	});
	const userId = ref<string | undefined>(undefined);
	const host = window.document.createElement('div');
	window.document.body.append(host);
	const app = createApp({ render: () => h(HatadyProfile, { inline: true, userId: userId.value }) });
	app.component('MkAvatar', { render: () => null });
	app.component('MkUserName', { render: () => null });
	app.mount(host);
	cleanups.push(() => { app.unmount(); host.remove(); });
	await settle();
	expect(host.textContent).toContain('削除した記録');
	host.querySelector<HTMLButtonElement>('button[data-recorded="true"]')!.click();
	await settle();
	// The day popup stays available while the profile's next response is pending.
	userId.value = 'viewer';
	await settle();
	expect(reads).toBe(2);
	const deleteButton = host.querySelector<HTMLButtonElement>('button[data-record="log-one"]');
	expect(deleteButton).not.toBeNull();
	deleteButton!.click();
	await settle();
	expect(reads).toBe(3);
	expect(host.textContent).toContain('読込できません');
	expect(host.textContent).not.toContain('削除した記録');
	resolveOld(staleProfile);
	await settle();
	expect(host.textContent).toContain('読込できません');
	expect(host.querySelector('[data-record="log-one"]')).toBeNull();
	expect(host.textContent).not.toContain('削除した記録');
});
