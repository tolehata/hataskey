/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import type { HataFeedTab } from '@/utility/hatafeed-ui.js';

const fixture = vi.hoisted(() => ({ api: vi.fn(), popup: vi.fn(), staff: true }));
vi.mock('@/router.js', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/utility/hatafeed-tutorial-launcher.js', () => ({ showHataFeedTutorial: vi.fn() }));
vi.mock('@/page.js', () => ({ definePage: vi.fn() }));
vi.mock('@/i.js', () => ({ $i: { id: 'viewer' }, iAmModerator: false }));
vi.mock('@/preferences.js', async () => ({ prefer: { r: { animation: (await import('vue')).ref(false), 'hatafeed.leaves': (await import('vue')).ref(false) } } }));
vi.mock('@/utility/hatasaba-device-prefs.js', async () => ({ hataFeedTheme: (await import('vue')).ref('light') }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: fixture.api }));
vi.mock('@/os.js', () => ({ popup: fixture.popup, popupMenu: vi.fn(), toast: vi.fn(), alert: vi.fn() }));
vi.mock('@/utility/hatafeed.js', async () => ({
	hataFeedUnreadCount: (await import('vue')).ref(0), categoryLabel: { improvement: '改善予定' }, categoryKeys: ['improvement'], staffOnlyCategoryKeys: ['improvement'],
	statusLabel: { open: '受付中', inProgress: '対応中', resolved: '解決済み' }, statusKeys: [], emojiStatusLabel: {}, emojiStatusIcon: {},
}));
vi.mock('@/i18n.js', () => ({ i18n: {
	ts: { _hata: { _hatafeed: { _home: { previous: '前へ', next: '次へ', noPublishedPlans: '公開中の改善予定はありません' } } } },
	tsx: { _hata: { _hatafeed: { _home: { itemCount: ({ count }: { count: string }) => `${count}件` } } } },
} }));
vi.mock('@/components/HataFeedHeader.vue', () => ({ default: { template: '<nav/>' } }));
vi.mock('@/components/HataFeedHome.vue', () => ({ default: { template: '<div/>' } }));
vi.mock('@/components/HataFeedBeta.vue', () => ({ default: { template: '<div/>' } }));
vi.mock('@/components/HataFeedIssue.vue', () => ({ default: { template: '<div/>' } }));
vi.mock('@/components/HataFeedLeaves.vue', () => ({ default: { template: '<div/>' } }));
vi.mock('@/components/HfStatusPill.vue', () => ({ default: { template: '<span/>' } }));
vi.mock('@/components/HfCategoryBadge.vue', () => ({ default: { template: '<span/>' } }));
vi.mock('@/components/HfAvatar.vue', () => ({ default: { template: '<span/>' } }));
vi.mock('@/components/HataFeedRoadmapWizard.vue', () => ({ default: { name: 'HataFeedRoadmapWizard', template: '<div/>' } }));
import HataFeed from './hatafeed.vue';
import { hataFeedProjectId, hataFeedTab } from '@/utility/hatafeed-ui.js';

type Issue = { id: string; number: number; title: string; category: string; status: string; closed: boolean; commentsCount: number; agreementsCount: number };
let issues: Issue[] = [];
const cleanups: Array<() => void> = [];
const issue = (number: number): Issue => ({ id: `plan-${number}`, number, title: `改善予定 ${number}`, category: 'improvement', status: 'open', closed: false, commentsCount: 0, agreementsCount: 0 });

beforeEach(() => {
	issues = [];
	fixture.staff = true;
	hataFeedProjectId.value = null;
	hataFeedTab.value = 'home';
	fixture.popup.mockReset().mockImplementation(() => ({ dispose: vi.fn() }));
	fixture.api.mockReset().mockImplementation(async (endpoint: string, params: Record<string, unknown>) => {
		if (endpoint.endsWith('/available')) return { available: true, isStaff: fixture.staff };
		if (endpoint.endsWith('/projects')) return [{ id: 'project-one', name: 'プロジェクト', isOfficial: false }];
		if (endpoint.endsWith('/notifications')) return { unreadCount: 0 };
		if (endpoint.endsWith('/emoji-quota')) return { limit: 5, remaining: 5 };
		if (endpoint === 'hata/feedback/issues') {
			const filtered = issues.filter(item => (!params.query || item.title.includes(String(params.query))) && (!params.status || item.status === params.status));
			const start = params.untilId ? filtered.findIndex(item => item.id === params.untilId) + 1 : 0;
			return filtered.slice(start, start + Number(params.limit));
		}
		return [];
	});
});
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); hataFeedProjectId.value = null; hataFeedTab.value = 'home'; });

async function mount(tab: HataFeedTab = 'roadmap') {
	const target = window.document.createElement('div');
	window.document.body.append(target);
	const app = createApp(HataFeed, { initialTab: tab });
	app.component('MkTime', { template: '<time/>' });
	app.component('MkUserName', { template: '<span/>' });
	app.mount(target);
	cleanups.push(() => { app.unmount(); target.remove(); });
	await vi.waitFor(() => expect(target.querySelector('main [role="search"]')).not.toBeNull());
	return target;
}

function buttons(target: HTMLElement, label: string) {
	return [...target.querySelectorAll<HTMLButtonElement>('button')].filter(button => button.textContent?.trim() === label);
}

function addButton(target: HTMLElement) {
	const matches = buttons(target, '改善予定を追加');
	expect(matches).toHaveLength(1);
	expect(matches[0].disabled).toBe(false);
	return matches[0];
}

describe('HataFeed roadmap creation entry', () => {
	test('keeps one reachable entry after the first and second wizard completion', async () => {
		const target = await mount();
		expect(target.textContent).toContain('公開中の改善予定はありません');
		for (let number = 1; number <= 2; number++) {
			addButton(target).click();
			await vi.waitFor(() => expect(fixture.popup).toHaveBeenCalledTimes(number));
			const [component, props, events] = fixture.popup.mock.calls[number - 1];
			expect(component.name).toBe('HataFeedRoadmapWizard');
			expect(props).toEqual({});
			issues.push(issue(number));
			events.done(issues.at(-1));
			events.closed();
			await vi.waitFor(() => expect(target.textContent).toContain(`改善予定 ${number}`));
			expect(fixture.popup.mock.results[number - 1].value.dispose).toHaveBeenCalledOnce();
			addButton(target);
		}
	});

	test('keeps the entry across pagination, page size changes and an empty search without changing the selected project', async () => {
		issues = Array.from({ length: 22 }, (_, index) => issue(index + 1));
		hataFeedProjectId.value = 'project-one';
		const target = await mount();
		addButton(target);
		buttons(target, '次へ')[0].click();
		await vi.waitFor(() => expect(target.textContent).toContain('改善予定 20'));
		addButton(target);
		const select = target.querySelector<HTMLSelectElement>('select')!;
		select.value = '50';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		await vi.waitFor(() => expect(target.textContent).toContain('改善予定 22'));
		addButton(target);
		const input = target.querySelector<HTMLInputElement>('input[type="search"]')!;
		input.value = '該当しない予定';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await nextTick();
		target.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		await vi.waitFor(() => expect(target.textContent).toContain('公開中の改善予定はありません'));
		expect(hataFeedProjectId.value).toBe('project-one');
		expect(fixture.api).toHaveBeenCalledWith('hata/feedback/issues', expect.objectContaining({ projectId: 'project-one', category: 'improvement', limit: 51, query: input.value }));
		addButton(target).click();
		await vi.waitFor(() => expect(fixture.popup).toHaveBeenCalledOnce());
	});

	test.each([
		{ staff: false, tab: 'roadmap' as const },
		{ staff: false, tab: 'issues' as const },
		{ staff: true, tab: 'issues' as const },
	])('does not expose the roadmap entry for staff=$staff on $tab', async ({ staff, tab }) => {
		fixture.staff = staff;
		issues = [issue(1)];
		const target = await mount(tab);
		expect(target.textContent).toContain('改善予定 1');
		expect(buttons(target, '改善予定を追加')).toHaveLength(0);
		expect(fixture.popup).not.toHaveBeenCalled();
	});
});
