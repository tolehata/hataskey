/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick } from 'vue';
import MkAutoRenoteDialog from './MkAutoRenoteDialog.vue';
import type { AutoRenoteSchedule } from '@/utility/auto-renote.js';
import type * as Misskey from 'cherrypick-js';

const mocks = vi.hoisted(() => ({ api: vi.fn(), closeDialog: vi.fn() }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: mocks.api }));
vi.mock('@/i.js', () => ({ $i: { id: 'self' } }));
vi.mock('@/os.js', () => ({}));
vi.mock('@/i18n.js', () => ({ i18n: { ts: {
	save: 'Save', cancel: 'Cancel', preview: 'Preview',
	_autoRenote: {
		title: 'Automatic renotes', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', saveFailed: 'Failed to save',
		publicWarning: 'Public renotes.', localOnlyWarning: 'Local-only notes stay on this server.',
		nextRun: 'Next renote', nextRunAfterResume: 'Next renote if resumed', ineligible: 'Invalid target', _reasons: {},
	},
} } }));
vi.mock('@/components/MkModalWindow.vue', () => ({ default: {
	emits: ['close', 'click', 'esc', 'closed'],
	setup(_: unknown, { expose }: { expose: (value: unknown) => void }) { expose({ close: mocks.closeDialog }); },
	template: '<div><slot name="header"/><slot/></div>',
} }));
vi.mock('@/components/MkButton.vue', () => ({ default: {
	props: ['type', 'disabled'], emits: ['click'],
	template: '<button :type="type" :disabled="disabled" @click="$emit(\'click\', $event)"><slot/></button>',
} }));
vi.mock('@/components/MkInput.vue', () => ({ default: {
	props: ['modelValue', 'type', 'disabled'], emits: ['update:modelValue'],
	template: '<label><slot name="label"/><input :type="type" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', type === \'number\' ? Number($event.target.value) : $event.target.value)"/><slot name="caption"/></label>',
} }));
vi.mock('@/components/MkSelect.vue', () => ({ default: {
	props: ['modelValue', 'items', 'disabled'], emits: ['update:modelValue'],
	template: '<label><slot name="label"/><select :disabled="disabled" :value="modelValue" @change="$emit(\'update:modelValue\', items.find(item => String(item.value) === $event.target.value).value)"><option v-for="item in items" :value="item.value">{{ item.label }}</option></select></label>',
} }));
vi.mock('@/components/MkInfo.vue', () => ({ default: { template: '<div><slot/></div>' } }));
vi.mock('@/components/MkNoteSimple.vue', () => ({ default: { props: ['note'], template: '<div data-note>{{ note.id }}</div>' } }));

const cleanups: (() => void)[] = [];
const timing = { frequency: 'daily' as const, time: '09:00', weekday: 0, day: 1 };
const note = { id: 'original', userId: 'self' } as Misskey.entities.Note;
const schedule = { ...timing, id: 'schedule', noteId: 'original', status: 'paused' } as AutoRenoteSchedule;

function mount(props: Record<string, unknown> = {}) {
	const target = window.document.createElement('div');
	window.document.body.append(target);
	const done = vi.fn();
	const app = createApp({ render: () => h(MkAutoRenoteDialog, { ...props, onDone: done }) });
	app.mount(target);
	let mounted = true;
	const unmount = () => { if (mounted) { mounted = false; app.unmount(); target.remove(); } };
	cleanups.push(unmount);
	return { target, done, unmount, button: (text: string) => [...target.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === text)! };
}

async function settle() {
	for (let i = 0; i < 5; i++) { await Promise.resolve(); await nextTick(); }
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2026-11-04T00:00:00Z'));
	vi.clearAllMocks();
	mocks.api.mockReset().mockImplementation((endpoint, params) => Promise.resolve(endpoint === 'notes/show' ? { ...note, id: params.noteId } : {}));
});
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); vi.useRealTimers(); });

describe('automatic renote editor actions', () => {
	it('cancels without submitting or creating a schedule', async () => {
		const view = mount({ note });
		view.button('Cancel').click();
		await settle();
		expect(mocks.closeDialog).toHaveBeenCalledOnce();
		expect(mocks.api).not.toHaveBeenCalled();
		expect(view.done).not.toHaveBeenCalled();
	});

	it('returns pending composer options without making a note or schedule request', async () => {
		const view = mount({ composer: true });
		view.button('Save').click();
		await settle();
		expect(view.done).toHaveBeenCalledExactlyOnceWith(timing);
		expect(mocks.api).not.toHaveBeenCalled();
	});

	it('keeps a note-menu target fixed and preserves the editor on save failure', async () => {
		const view = mount({ note });
		expect(view.target.querySelector('input:not([type])')).toBeNull();
		mocks.api.mockRejectedValueOnce(new Error('Denied'));
		view.button('Save').click();
		await settle();
		expect(mocks.api).toHaveBeenCalledExactlyOnceWith('notes/auto-renote/create', { noteId: 'original', ...timing });
		expect(mocks.closeDialog).not.toHaveBeenCalled();
		expect(view.target.textContent).toContain('Failed to save');
		view.button('Save').click();
		await settle();
		expect(view.done).toHaveBeenCalledOnce();
	});

	it('previews a changed target without saving and updates only after Save', async () => {
		const view = mount({ note, schedule });
		const input = view.target.querySelector<HTMLInputElement>('input:not([type])')!;
		input.value = 'replacement';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
		mocks.api.mockResolvedValueOnce({ ...note, id: 'replacement' });
		view.button('Preview').click();
		await settle();
		expect(mocks.api).toHaveBeenCalledExactlyOnceWith('notes/show', { noteId: 'replacement' });
		expect(view.done).not.toHaveBeenCalled();
		expect(view.target.querySelector('[data-note]')?.textContent).toBe('replacement');
		view.button('Save').click();
		await settle();
		expect(mocks.api).toHaveBeenLastCalledWith('notes/auto-renote/update', { scheduleId: 'schedule', noteId: 'replacement', ...timing });
	});

	it('clears the old preview immediately and ignores an earlier lookup after another edit', async () => {
		const view = mount({ note, schedule });
		const input = view.target.querySelector<HTMLInputElement>('input:not([type])')!;
		input.value = 'first';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
		expect(view.target.querySelector('[data-note]')).toBeNull();
		let complete!: (value: { id: string }) => void;
		mocks.api.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
		view.button('Preview').click();
		await settle();
		input.value = 'second';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
		complete({ id: 'first' });
		await settle();
		expect(view.target.querySelector('[data-note]')).toBeNull();
		view.button('Save').click();
		await settle();
		expect(mocks.api).toHaveBeenLastCalledWith('notes/auto-renote/update', { scheduleId: 'schedule', noteId: 'second', ...timing });
	});

	it('does not create a schedule for a note owned by someone else', async () => {
		const view = mount({ note: { ...note, userId: 'other' } });
		view.button('Save').click();
		await settle();
		expect(mocks.api).not.toHaveBeenCalled();
		expect(view.done).not.toHaveBeenCalled();
		expect(view.target.textContent).toContain('Invalid target');
	});

	it('rejects another owner in both preview and Save without updating the schedule', async () => {
		const view = mount({ note, schedule });
		const input = view.target.querySelector<HTMLInputElement>('input:not([type])')!;
		input.value = 'someoneelse';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
		mocks.api.mockResolvedValue({ id: 'someoneelse', userId: 'other' });
		view.button('Preview').click();
		await settle();
		expect(view.target.querySelector('[data-note]')).toBeNull();
		expect(view.target.textContent).toContain('Invalid target');
		view.button('Save').click();
		await settle();
		expect(mocks.api.mock.calls.map(([endpoint]) => endpoint)).toEqual(['notes/show', 'notes/show']);
		expect(view.done).not.toHaveBeenCalled();
		expect(mocks.closeDialog).not.toHaveBeenCalled();
	});
});

describe('automatic renote next date preview', () => {
	function date(target: HTMLElement) { return target.querySelector('time')?.dateTime; }

	function input(target: HTMLElement, type: string, value: string) {
		const control = target.querySelector<HTMLInputElement>(`input[type="${type}"]`)!;
		control.value = value;
		control.dispatchEvent(new Event('input', { bubbles: true }));
	}

	function select(target: HTMLElement, index: number, value: string) {
		const control = target.querySelectorAll('select')[index];
		control.value = value;
		control.dispatchEvent(new Event('change', { bubbles: true }));
	}

	it('shows the JST next date and starts the local-only explanation on a new line', () => {
		const view = mount({ composer: true });
		expect(date(view.target)).toBe('2026-11-05T00:00:00.000Z');
		expect(view.target.querySelector('time')?.textContent).toContain('09:00');
		expect(view.target.querySelector('time')?.textContent).toContain('(JST)');
		const breakElement = view.target.querySelector('br')!;
		expect(breakElement.previousSibling?.textContent).toBe('Public renotes.');
		expect(breakElement.nextSibling?.textContent).toBe('Local-only notes stay on this server.');
	});

	it('updates the next date for time, weekly weekday, and monthly day changes', async () => {
		const view = mount({ composer: true });
		input(view.target, 'time', '10:00');
		await settle();
		expect(date(view.target)).toBe('2026-11-04T01:00:00.000Z');
		select(view.target, 0, 'weekly');
		await settle();
		select(view.target, 1, '5');
		await settle();
		expect(date(view.target)).toBe('2026-11-06T01:00:00.000Z');
		select(view.target, 0, 'monthly');
		await settle();
		input(view.target, 'number', '31');
		await settle();
		expect(date(view.target)).toBe('2026-12-31T01:00:00.000Z');
		input(view.target, 'time', '');
		await settle();
		expect(view.target.querySelector('time')).toBeNull();
	});

	it('uses an unchanged active schedule server date, then previews the edited timing', async () => {
		const view = mount({ note, schedule: { ...schedule, status: 'active', nextRunAt: '2026-11-06T00:00:00Z' } });
		expect(date(view.target)).toBe('2026-11-06T00:00:00.000Z');
		input(view.target, 'time', '10:00');
		await settle();
		expect(date(view.target)).toBe('2026-11-04T01:00:00.000Z');
	});

	it('labels stopped schedules as a resume estimate instead of an active schedule', () => {
		const view = mount({ note, schedule: { ...schedule, nextRunAt: '2026-11-06T00:00:00Z' } });
		expect(view.target.querySelector('[aria-live]')?.textContent).toContain('Next renote if resumed');
		expect(date(view.target)).toBe('2026-11-05T00:00:00.000Z');
	});

	it('advances at the minute boundary, refreshes after returning, and removes its timer', async () => {
		vi.setSystemTime(new Date('2026-11-03T23:59:59Z'));
		const view = mount({ composer: true });
		expect(date(view.target)).toBe('2026-11-04T00:00:00.000Z');
		await vi.advanceTimersByTimeAsync(1000);
		await settle();
		expect(date(view.target)).toBe('2026-11-05T00:00:00.000Z');
		vi.setSystemTime(new Date('2026-11-06T00:00:00Z'));
		window.document.dispatchEvent(new Event('visibilitychange'));
		await settle();
		expect(date(view.target)).toBe('2026-11-07T00:00:00.000Z');
		view.unmount();
		expect(vi.getTimerCount()).toBe(0);
	});
});
