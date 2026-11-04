/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick } from 'vue';
import MkAutoRenoteList from './MkAutoRenoteList.vue';

const mocks = vi.hoisted(() => ({ api: vi.fn(), selectUser: vi.fn() }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: mocks.api }));
vi.mock('@/os.js', () => ({ selectUser: mocks.selectUser }));
vi.mock('@/utility/auto-renote.js', () => ({ autoRenoteSummary: () => 'Daily 09:00', autoRenoteErrorText: () => 'Error', editAutoRenote: vi.fn() }));
vi.mock('@/i18n.js', () => ({ i18n: { ts: {
	search: 'Search', _autoRenote: {
		searchNoteText: 'Search note text', searchTooLong: 'Maximum 200 characters',
		previous: 'Previous', next: 'Next', userFilter: 'User', clearUserFilter: 'Clear user', refresh: 'Reload',
		all: 'All', active: 'Active', cancelled: 'Cancelled', loadFailed: 'Load failed', _reasons: {},
	},
} } }));
vi.mock('@/components/MkButton.vue', () => ({ default: {
	props: ['type', 'disabled'], emits: ['click'],
	template: '<button :type="type" :disabled="disabled" @click="$emit(\'click\', $event)"><slot/></button>',
} }));
vi.mock('@/components/MkInput.vue', () => ({ default: {
	props: ['modelValue', 'type'], emits: ['update:modelValue', 'enter'],
	template: '<label><slot name="label"/><input :type="type" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown.enter="$emit(\'enter\', $event)"/></label>',
} }));
vi.mock('@/components/MkSelect.vue', () => ({ default: {
	props: ['modelValue', 'items'], emits: ['update:modelValue'],
	template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in items" :value="item.value">{{ item.label }}</option></select>',
} }));
vi.mock('@/components/MkInfo.vue', () => ({ default: { template: '<div><slot/></div>' } }));
vi.mock('@/components/MkNoteSimple.vue', () => ({ default: { props: ['note'], template: '<div data-note>{{ note.id }}</div>' } }));

const cleanups: (() => void)[] = [];

function mount(admin: boolean) {
	const target = window.document.createElement('div');
	window.document.body.append(target);
	const app = createApp({ render: () => h(MkAutoRenoteList, { admin }) });
	for (const name of ['MkLoading', 'MkAvatar', 'MkUserName', 'MkAcct']) app.component(name, { render: () => null });
	app.mount(target);
	cleanups.push(() => { app.unmount(); target.remove(); });
	return {
		target,
		button: (text: string) => {
			const found = [...target.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === text);
			if (!found) throw new Error(`Missing button: ${text}`);
			return found;
		},
		query: (text: string) => {
			const input = target.querySelector<HTMLInputElement>('input[type="search"]');
			if (!input) throw new Error('Missing search input');
			input.value = text;
			input.dispatchEvent(new Event('input', { bubbles: true }));
			return input;
		},
	};
}

function schedule(id: string) {
	return { id, status: 'cancelled', stopReason: null, user: { id: 'user', username: 'user' }, note: { id } };
}

async function settle() {
	for (let i = 0; i < 5; i++) { await Promise.resolve(); await nextTick(); }
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.api.mockReset().mockResolvedValue({ schedules: [], enabled: true, usage: { month: '2026-11', count: 0, limit: 10 } });
	mocks.selectUser.mockResolvedValue({ id: 'selected-user', username: 'selected' });
});
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); });

describe('admin automatic renote note-text search', () => {
	it('offers search only to the admin list and never sends a query to the owner endpoint', async () => {
		const view = mount(false);
		await settle();
		expect(view.target.querySelector('input[type="search"]')).toBeNull();
		expect(mocks.api).toHaveBeenCalledExactlyOnceWith('notes/auto-renote/list', { limit: 20, offset: 0, status: undefined });
	});

	it('applies on Search or Enter, resets pagination, and retains the user and status filters', async () => {
		mocks.api.mockResolvedValue({ schedules: Array.from({ length: 20 }, (_, index) => schedule(`note${index}`)) });
		const view = mount(true);
		await settle();
		view.button('User').click();
		await settle();
		const status = view.target.querySelector('select');
		if (!status) throw new Error('Missing status selector');
		status.value = 'active';
		status.dispatchEvent(new Event('change', { bubbles: true }));
		await settle();
		view.button('Next').click();
		await settle();
		expect(mocks.api).toHaveBeenLastCalledWith('admin/auto-renote/list', expect.objectContaining({ offset: 20 }));
		mocks.api.mockClear();
		view.query('  flower  ');
		await settle();
		expect(mocks.api).not.toHaveBeenCalled();
		view.button('Search').click();
		await settle();
		expect(mocks.api).toHaveBeenCalledExactlyOnceWith('admin/auto-renote/list', { limit: 20, offset: 0, status: 'active', userId: 'selected-user', query: 'flower' });
		view.query('').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
		await settle();
		expect(mocks.api).toHaveBeenLastCalledWith('admin/auto-renote/list', { limit: 20, offset: 0, status: 'active', userId: 'selected-user', query: undefined });
	});

	it('discards an older search result after a newer search completes', async () => {
		const view = mount(true);
		await settle();
		let oldResult!: (value: unknown) => void;
		mocks.api.mockImplementationOnce(() => new Promise(resolve => { oldResult = resolve; }));
		view.query('old');
		view.button('Search').click();
		await settle();
		mocks.api.mockResolvedValueOnce({ schedules: [schedule('new-result')] });
		view.query('new');
		view.button('Search').click();
		await settle();
		expect(view.target.querySelector('[data-note]')?.textContent).toBe('new-result');
		oldResult({ schedules: [schedule('old-result')] });
		await settle();
		expect(view.target.querySelector('[data-note]')?.textContent).toBe('new-result');
	});

	it('rejects an oversized query and ignores Enter during Japanese composition', async () => {
		const view = mount(true);
		await settle();
		mocks.api.mockClear();
		view.query('あ'.repeat(201));
		view.button('Search').click();
		await settle();
		expect(view.target.textContent).toContain('Maximum 200 characters');
		expect(mocks.api).not.toHaveBeenCalled();
		view.query('花').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true, bubbles: true }));
		await settle();
		expect(mocks.api).not.toHaveBeenCalled();
	});
});
