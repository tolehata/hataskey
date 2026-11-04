/* SPDX-License-Identifier: AGPL-3.0-only */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { autoRenoteNoteId, bindPostedAutoRenote, canComposeAutoRenote, parseAutoRenoteOptions } from './auto-renote-schedule.js';
import { autoRenoteErrorText, canAutoRenoteNote, registerPostedAutoRenote } from './auto-renote.js';
import type * as Misskey from 'cherrypick-js';

const mocks = vi.hoisted(() => ({ api: vi.fn(), alert: vi.fn(), policies: { canAutoRenote: true, autoRenoteMonthlyLimit: 10, canPublicNote: true } }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: mocks.api }));
vi.mock('@/os.js', () => ({ alert: mocks.alert }));
vi.mock('@/i.js', () => ({ $i: { id: 'owner', policies: mocks.policies } }));
vi.mock('@/i18n.js', () => ({ i18n: { ts: { _autoRenote: {
	partialFailure: 'Posted; schedule failed', disabled: 'Role denied', ineligible: 'Invalid target', invalidSchedule: 'Invalid schedule', scheduleLimit: 'Schedule cap', saveFailed: 'Failed',
	_reasons: { quota: 'Monthly limit', offline: 'Inactive', role: 'Role denied', unavailable: 'Unavailable', error: 'Run failed', admin: 'Admin cancelled' },
} } } }));

const options = { frequency: 'weekly' as const, time: '23:59', weekday: 6, day: 31 };
beforeEach(() => {
	vi.clearAllMocks();
	mocks.api.mockReset().mockResolvedValue({});
	mocks.alert.mockReset().mockResolvedValue(undefined);
	Object.assign(mocks.policies, { canAutoRenote: true, autoRenoteMonthlyLimit: 10, canPublicNote: true });
});

describe('automatic renote form boundaries', () => {
	it('accepts a complete schedule while discarding untrusted target and owner keys', () => {
		expect(parseAutoRenoteOptions({ ...options, userId: 'other', noteId: 'other-note' })).toEqual(options);
	});
	it.each([
		{}, { ...options, frequency: 'yearly' }, { ...options, time: '24:00' }, { ...options, time: '9:00' },
		{ ...options, weekday: 7 }, { ...options, weekday: 0.5 }, { ...options, day: 0 }, { ...options, day: 32 }, { ...options, day: '1' },
	])('rejects malformed saved settings %j', value => {
		expect(parseAutoRenoteOptions(value)).toBeNull();
	});
	it('resolves local note links without confusing remote IDs or other routes', () => {
		expect(autoRenoteNoteId(' ab123 ', 'https://local.test')).toBe('ab123');
		expect(autoRenoteNoteId('https://local.test/notes/ab123?x=1', 'https://local.test')).toBe('ab123');
		expect(autoRenoteNoteId('/notes/ab123', 'https://local.test')).toBe('ab123');
		expect(autoRenoteNoteId('https://remote.test/notes/ab123', 'https://local.test')).toBeNull();
		expect(autoRenoteNoteId('https://local.test/@ab123', 'https://local.test')).toBeNull();
	});
	it.each([
		{ visibility: 'home' }, { visibility: 'followers' }, { visibility: 'specified' },
		{ visibility: 'public', updateMode: true }, { visibility: 'public', external: true },
		{ visibility: 'public', otherAccount: true }, { visibility: 'public', scheduledAt: 123 },
		{ visibility: 'public', saveToDraft: true }, { visibility: 'public', channel: { id: 'channel' } },
	])('does not silently combine automatic renotes with unsupported posting %j', value => {
		expect(canComposeAutoRenote(value)).toBe(false);
	});
	it('allows immediate public posting and gates notes against roles and channel visibility', () => {
		expect(canComposeAutoRenote({ visibility: 'public' })).toBe(true);
		const note = { userId: 'owner', visibility: 'public', channel: null } as Misskey.entities.Note;
		expect(canAutoRenoteNote(note)).toBe(true);
		expect(canAutoRenoteNote({ ...note, visibility: 'home' })).toBe(false);
		expect(canAutoRenoteNote({ ...note, channel: { allowRenoteToExternal: true, isPrivate: true } } as Misskey.entities.Note)).toBe(false);
		mocks.policies.canPublicNote = false;
		expect(canAutoRenoteNote(note)).toBe(false);
	});
	it.each(['another-local-user', 'remote-user', undefined])('does not offer automatic renotes for another author or an unknown owner: %s', userId => {
		expect(canAutoRenoteNote({ userId, visibility: 'public', channel: null } as Misskey.entities.Note)).toBe(false);
	});
	it('allows the signed-in account’s public local-only note', () => {
		expect(canAutoRenoteNote({ userId: 'owner', visibility: 'public', localOnly: true, channel: null } as Misskey.entities.Note)).toBe(true);
	});
});

describe('successful post followed by automatic renote registration', () => {
	it('uses the returned note ID and makes only the schedule request', async () => {
		await registerPostedAutoRenote({ id: 'new-note' } as Misskey.entities.Note, options);
		expect(mocks.api).toHaveBeenCalledExactlyOnceWith('notes/auto-renote/create', { noteId: 'new-note', ...options });
		expect(mocks.alert).not.toHaveBeenCalled();
	});
	it('does not reject or retry a posted note when scheduling and its warning dialog fail', async () => {
		mocks.api.mockRejectedValue(new Error('Schedule denied'));
		mocks.alert.mockRejectedValue(new Error('Dialog destroyed'));
		await expect(registerPostedAutoRenote({ id: 'new-note' } as Misskey.entities.Note, options)).resolves.toBeUndefined();
		expect(mocks.api).toHaveBeenCalledOnce();
		expect(mocks.alert).toHaveBeenCalledExactlyOnceWith({ type: 'warning', text: 'Posted; schedule failed' });
	});
	it('separates repeated posts and never trusts a pending note ID', async () => {
		const create = vi.fn().mockResolvedValue({});
		await bindPostedAutoRenote('first', { ...options, noteId: 'wrong' } as typeof options, create);
		await bindPostedAutoRenote('second', options, create);
		expect(create.mock.calls.map(([value]) => value.noteId)).toEqual(['first', 'second']);
	});
	it('uses the API error reason instead of a generic save error', () => {
		expect(autoRenoteErrorText({ code: 'AUTO_RENOTE_BLOCKED', info: { reason: 'quota' } })).toBe('Monthly limit');
		expect(autoRenoteErrorText({ code: 'TOO_MANY_AUTO_RENOTES' })).toBe('Schedule cap');
		expect(autoRenoteErrorText({ code: 'INVALID_AUTO_RENOTE' })).toBe('Invalid schedule');
		expect(autoRenoteErrorText({ code: 'AUTO_RENOTE_UNAVAILABLE' })).toBe('Invalid target');
	});
});
