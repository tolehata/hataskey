/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref } from 'vue';
const storage = vi.hoisted(() => ({ records: new Map<string, string>(), failRead: false, failWrite: false, account: { id: 'one' } }));
vi.mock('@/i.js', () => ({ $i: storage.account }));
vi.mock('@/local-storage.js', () => ({ miLocalStorage: {
	getItemAsJson(key: string) { if (storage.failRead) throw new Error('read failed'); const value = storage.records.get(key); return value == null ? undefined : JSON.parse(value); },
	setItemAsJson(key: string, value: unknown) { if (storage.failWrite) throw new Error('quota'); storage.records.set(key, JSON.stringify(value)); },
} }));
import { useHataFormDraft } from './hata-form-draft.js';
const unmounts: Array<() => void> = [];

function editor(autoSave?: boolean, id = 'hatady:log:create') {
	const value = ref('');
	let draft!: ReturnType<typeof useHataFormDraft<{ text: string }>>;
	const app = createApp(defineComponent({ setup() { draft = useHataFormDraft({ id, autoSave, capture: () => ({ text: value.value }), restore: data => { value.value = data.text; }, isMeaningful: data => data.text.length > 0 }); return () => h('div'); } }));
	const target = window.document.createElement('div'); window.document.body.append(target); app.mount(target);
	let disposed = false;
	const unmount = () => { if (!disposed) { disposed = true; app.unmount(); target.remove(); } };
	unmounts.push(unmount);
	return { draft, value, unmount };
}

function store() { return JSON.parse(storage.records.get('hataFormDrafts:one') || '{}'); }

beforeEach(() => { storage.records.clear(); storage.failRead = false; storage.failWrite = false; storage.account.id = 'one'; });
afterEach(() => { unmounts.splice(0).forEach(unmount => unmount()); vi.useRealTimers(); });

describe('account-local manual Hatady drafts', () => {
	test('manual mode saves only on explicit choice and never on unmount', async () => {
		vi.useFakeTimers(); const first = editor(false); first.value.value = '途中の入力'; await nextTick(); await vi.advanceTimersByTimeAsync(1000);
		expect(first.draft.hasChanges()).toBe(true); expect(storage.records.size).toBe(0);
		expect(first.draft.saveDraft()).toBe(true); expect(store()['hatady:log:create'].data.text).toBe('途中の入力');
		first.value.value = '保存していない変更'; first.unmount();
		expect(store()['hatady:log:create'].data.text).toBe('途中の入力');
	});
	test('an old key restores, discard removes it, and unmount cannot recreate it', () => {
		storage.records.set('hataFormDrafts:one', JSON.stringify({ 'hatady:log:create': { version: 1, updatedAt: Date.now(), data: { text: '旧下書き' } }, other: { version: 1, updatedAt: Date.now(), data: { text: '別の下書き' } } }));
		const current = editor(false); expect(current.value.value).toBe('旧下書き'); expect(current.draft.restored.value).toBe(true);
		expect(current.draft.clearDraft()).toBe(true); current.unmount();
		expect(store()).toEqual({ other: { version: 1, updatedAt: expect.any(Number), data: { text: '別の下書き' } } });
	});
	test('failed storage writes leave the editor dirty and recover on retry', () => {
		const current = editor(false); current.value.value = '失いたくない'; storage.failWrite = true;
		expect(current.draft.saveDraft()).toBe(false); expect(current.draft.clearDraft()).toBe(false); expect(current.draft.hasChanges()).toBe(true);
		storage.failWrite = false; expect(current.draft.saveDraft()).toBe(true); expect(store()['hatady:log:create'].data.text).toBe('失いたくない');
	});
	test('unreadable stores cannot overwrite unrelated drafts', () => {
		storage.records.set('hataFormDrafts:one', '{broken'); const current = editor(false); current.value.value = '新しい入力';
		expect(current.draft.saveDraft()).toBe(false); expect(current.draft.clearDraft()).toBe(false); expect(storage.records.get('hataFormDrafts:one')).toBe('{broken');
	});
	test('resume after clear allows a new edit and account switches retain the original owner', () => {
		const current = editor(false); current.value.value = '前の入力'; expect(current.draft.clearDraft({ resume: true })).toBe(true); expect(current.draft.hasChanges()).toBe(false);
		storage.account.id = 'two'; current.value.value = '新しい入力'; expect(current.draft.saveDraft()).toBe(true);
		expect(store()['hatady:log:create'].data.text).toBe('新しい入力'); expect(storage.records.has('hataFormDrafts:two')).toBe(false);
	});
	test('legacy callers retain automatic save and the existing delay', async () => {
		vi.useFakeTimers(); const current = editor(undefined, 'hatafeed:old'); current.value.value = '自動保存'; await nextTick();
		await vi.advanceTimersByTimeAsync(599); expect(storage.records.size).toBe(0);
		await vi.advanceTimersByTimeAsync(1); expect(store()['hatafeed:old'].data.text).toBe('自動保存');
	});
});
