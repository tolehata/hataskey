/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { parse } from '@vue/compiler-sfc';
import ts from 'typescript';
import { describe, expect, test, vi } from 'vitest';
import { isSharedHataskEvent, hataskEventVisibilityIcon, hataskEventVisibilityLabel } from './hatask-event-audience.js';
import { normalizeHataskPlannerData } from './hatask-planner-storage.js';
import { normalizeHataskPlannerTemplates } from './hatask-planner-templates.js';

const filename = `${process.cwd()}/src/pages/hatask.vue`;
const setup = parse(readFileSync(filename, 'utf8')).descriptor.scriptSetup;
if (!setup) throw new Error('Missing Hatask script');
const source = setup.content;
const ast = ts.createSourceFile('hatask.ts', source, ts.ScriptTarget.Latest, true);

function execute(names: string[], bindings: Record<string, unknown>, prefix = ''): Record<string, (...args: unknown[]) => unknown> {
	const functions = names.map(name => {
		const node = ast.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === name);
		if (!node) throw new Error(`Missing real parent function: ${name}`);
		return node.getText(ast);
	});
	const js = ts.transpileModule(`${prefix}\n${functions.join('\n')}\n({${names.join(',')}})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
	return runInNewContext(js, { isSharedHataskEvent, ...bindings });
}

function event(visibility = 'specified') {
	return { id: 'local', title: '限定の予定', emoji: '📅', date: '2030-09-10', dateEnd: '2030-09-10', timeStart: '10:00', timeEnd: '11:00', color: '#123456', visibility, visibleUserIds: ['member'], rsvp: true, allDay: false, notify: false, notifyTimings: [], recurrence: { frequency: 'none', interval: 1 }, archivedAt: null };
}

describe('selected event data and notifications', () => {
	test('normalization preserves selected recipients, old events and old templates', () => {
		const raw = { todos: [], folders: [], events: [event(), { ...event('private'), id: 'private' }, { ...event('public'), id: 'public' }] };
		const before = JSON.stringify(raw);
		const result = normalizeHataskPlannerData(raw);
		expect(result.data.events).toMatchObject([{ visibility: 'specified', visibleUserIds: ['member'] }, { visibility: 'private' }, { visibility: 'public' }]);
		expect(result.issues).toEqual([]);
		expect(JSON.stringify(raw)).toBe(before);
		const templates = normalizeHataskPlannerTemplates([{ id: 'members', kind: 'members', name: '集まり', payload: { visibleUserIds: ['member'] } }, { id: 'old', kind: 'event', name: '以前', payload: { title: '残す' } }]);
		expect(templates.invalidCount).toBe(0);
		expect(templates.templates).toHaveLength(2);
		expect(normalizeHataskPlannerTemplates([{ id: 'bad', kind: 'members', name: '', payload: { visibleUserIds: [] } }]).invalidCount).toBe(1);
	});
	test('specified events keep their visibility label and shared storage classification', () => {
		expect(isSharedHataskEvent(event())).toBe(true);
		expect(hataskEventVisibilityLabel('specified', { public: '公開', private: '非公開' }, '指定したメンバー')).toBe('指定したメンバー');
		expect(hataskEventVisibilityIcon('specified')).toBe('ti ti-users');
	});
	test.each(['specified', 'public', 'private'])('%s creation stores the right audience and only public events announce to the timeline', async visibility => {
		const events = { value: [] as Array<ReturnType<typeof event> & { publicSyncState?: string }> };
		const newEvent = { value: event(visibility) };
		const api = vi.fn();
		const registrySet = vi.fn();
		const runtime = execute(['addEvent', 'eventApiPayload'], {
			plannerReadOnly: { value: false }, editingEvent: { value: null }, newEvent, events,
			generateId: () => 'new', isValidPlannerEventInput: () => true, registrySet,
			resetEventEditor: vi.fn(), scheduleEventNotifications: vi.fn(), processPublicEventOutbox: async () => { events.value[0].publicSyncState = undefined; },
			loadSharedEvents: vi.fn(), misskeyApi: api, os: { toast: vi.fn() }, copy: {}, plannerCopy: {},
			copyx: { rsvpAnnouncement: () => '公開案内' },
		});
		expect(await runtime.addEvent()).toBe(true);
		expect(events.value[0]).toMatchObject({ visibility, visibleUserIds: visibility === 'specified' ? ['member'] : [] });
		expect(api.mock.calls.some(([endpoint]) => endpoint === 'notes/create')).toBe(visibility === 'public');
		if (visibility === 'specified') {
			expect(runtime.eventApiPayload(events.value[0])).toMatchObject({ visibility: 'specified', visibleUserIds: ['member'] });
			expect(registrySet).toHaveBeenCalledWith('events', expect.arrayContaining([expect.objectContaining({ visibility: 'specified' })]));
		}
	});
	test('empty member selection cannot save or announce', async () => {
		const api = vi.fn(); const write = vi.fn();
		const runtime = execute(['addEvent'], { plannerReadOnly: { value: false }, editingEvent: { value: null }, newEvent: { value: { ...event(), visibleUserIds: [] } }, misskeyApi: api, registrySet: write, plannerCopy: { eventMembersRequired: '指定してください' }, os: { toast: vi.fn() } });
		expect(await runtime.addEvent()).toBe(false);
		expect(api).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
	});
	test.each([['public', 'specified', 'updating'], ['specified', 'public', 'updating'], ['specified', 'private', 'deleting']])('%s to %s preserves the linked event and queues %s', async (before, after, operation) => {
		const previous = { ...event(before), serverEventId: 'server', serverEventRevision: 'revision' };
		const events = { value: [previous] as Array<ReturnType<typeof event> & { publicSyncState?: string }> }; const api = vi.fn(); const queued: Array<Record<string, unknown>> = [];
		const runtime = execute(['addEvent'], {
			plannerReadOnly: { value: false }, editingEvent: { value: previous }, newEvent: { value: event(after) }, events,
			isValidPlannerEventInput: () => true, registrySet: vi.fn(), resetEventEditor: vi.fn(), scheduleEventNotifications: vi.fn(),
			processPublicEventOutbox: async () => { queued.push({ ...events.value[0] }); events.value[0].publicSyncState = undefined; },
			loadSharedEvents: vi.fn(), misskeyApi: api, os: { toast: vi.fn() }, copy: {}, plannerCopy: {},
		});
		expect(await runtime.addEvent()).toBe(true);
		expect(queued[0]).toMatchObject({ id: 'local', serverEventId: 'server', publicSyncState: operation });
		if (after === 'private') expect(queued[0]).toMatchObject({ visibility: before, pendingVisibility: 'private' });
		else expect(queued[0]).toMatchObject({ visibility: after, visibleUserIds: after === 'specified' ? ['member'] : [] });
		expect(api).not.toHaveBeenCalled();
	});
	test('member template saves an independent snapshot without saving an event', async () => {
		const ids = ['member']; const save = vi.fn();
		const runtime = execute(['saveEventMemberTemplate'], { generateId: () => 'template', plannerTemplatePosition: () => 0, plannerTemplates: { value: [] }, savePlannerTemplates: save });
		await runtime.saveEventMemberTemplate('いつものメンバー', ids);
		ids.push('another');
		expect(save.mock.calls[0][0][0]).toMatchObject({ kind: 'members', payload: { visibleUserIds: ['member'] } });
	});
	test('a new draft clears the previous audience', () => {
		const newEvent = { value: event() };
		const runtime = execute(['resetEventEditor'], { newEvent, editingEvent: { value: event() }, selectedDateStr: { value: '2030-09-10' }, showEventDetails: { value: true }, showEventTemplates: { value: false }, eventCaptureEditor: { value: null } });
		runtime.resetEventEditor();
		expect(newEvent.value).toMatchObject({ visibility: 'private', visibleUserIds: [] });
	});
	test('revocation and failed refresh remove received RSVP and closing notices', async () => {
		const former = { ...event(), userId: 'organizer', rsvpClosed: true, rsvpResponses: [{ userId: 'viewer', status: 'going' }] };
		const sharedEvents = { value: [former] };
		const closedRsvpNotifs = { value: [{ eventId: 'local' }] };
		const api = vi.fn().mockResolvedValue([]);
		const runtime = execute(['loadSharedEvents', 'checkClosedRsvps'], {
			$i: { id: 'viewer' }, sharedEvents, closedRsvpNotifs, dismissedRsvpNotifs: { value: [] }, misskeyApi: api,
			viewingEvent: { value: null }, closeEventDetail: vi.fn(), allCalendarEvents: { value: [] }, reconcileOwnedEventIds: vi.fn(), processPublicEventOutbox: vi.fn(), console: { warn: vi.fn() },
		}, 'let sharedEventRequest=0;');
		await runtime.loadSharedEvents();
		expect(sharedEvents.value).toEqual([]); expect(closedRsvpNotifs.value).toEqual([]);
		sharedEvents.value = [former]; closedRsvpNotifs.value = [{ eventId: 'local' }];
		api.mockRejectedValue(new Error('offline'));
		await runtime.loadSharedEvents();
		expect(sharedEvents.value).toEqual([]); expect(closedRsvpNotifs.value).toEqual([]);
	});
});
