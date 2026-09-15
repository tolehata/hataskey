/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp, h, nextTick } from 'vue';
import type { entities } from 'cherrypick-js';

const fixtures = vi.hoisted(() => ({
	records: new Map<string, string>(),
	failWrite: false,
	account: { id: 'reporter' },
	api: vi.fn(),
	notify: vi.fn(),
}));
vi.mock('@/i.js', () => ({ $i: fixtures.account }));
vi.mock('@/local-storage.js', () => ({ miLocalStorage: {
	getItemAsJson(key: string) {
		const value = fixtures.records.get(key);
		return value == null ? undefined : JSON.parse(value);
	},
	setItemAsJson(key: string, value: unknown) {
		if (fixtures.failWrite) throw new Error('Storage unavailable');
		fixtures.records.set(key, JSON.stringify(value));
	},
} }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: fixtures.api }));
vi.mock('@/utility/hatady-ui.js', () => ({ hatadyNotify: fixtures.notify }));
vi.mock('@/components/HyDialog.vue', async () => {
	const { defineComponent, h: render } = await import('vue');
	return { default: defineComponent({
		props: { title: String, inert: Boolean, back: Boolean },
		emits: ['closed', 'close', 'back'],
		setup(props, { slots, emit, expose }) {
			expose({ close: () => emit('closed') });
			return () => render('section', { 'data-dialog': props.title, inert: props.inert }, [
				render('button', { type: 'button', 'aria-label': '閉じる', onClick: () => emit('close') }, '閉じる'),
				props.back ? render('button', { type: 'button', onClick: () => emit('back') }, '前へ戻る') : null,
				slots.default?.(),
				render('footer', slots.actions?.()),
			]);
		},
	}) };
});
import HatadyReport from './HatadyReport.vue';

const cleanups: Array<() => void> = [];
const storeKey = 'hataFormDrafts:reporter';
const reference = 'hatady:comment:comment-one';
const draftKey = `hatady-report:target-user:${reference}`;
const otherDraft = { version: 1, updatedAt: Date.now(), data: { text: '別の編集' } };

function seed() {
	fixtures.records.set(storeKey, JSON.stringify({
		[draftKey]: { version: 1, updatedAt: Date.now(), data: { reason: '保存していた理由' } },
		other: otherDraft,
	}));
}

function readDrafts() { return JSON.parse(fixtures.records.get(storeKey) ?? '{}'); }

async function mountReport(initialComment = `${reference}\n対象の返信`) {
	const closed = vi.fn();
	const target = window.document.createElement('div');
	window.document.body.append(target);
	const app = createApp({ render: () => h(HatadyReport, {
		user: { id: 'target-user', name: '相手', username: 'other' } as entities.UserLite,
		initialComment,
		onClosed: closed,
	}) });
	app.mount(target);
	const unmount = () => { app.unmount(); target.remove(); };
	cleanups.push(unmount);
	await nextTick();
	return { target, closed, textarea: target.querySelector('textarea') as HTMLTextAreaElement };
}

async function input(textarea: HTMLTextAreaElement, value: string) {
	textarea.value = value;
	textarea.dispatchEvent(new Event('input', { bubbles: true }));
	await nextTick();
}

async function submit(target: HTMLElement) {
	target.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
	await nextTick();
	await nextTick();
}

async function click(target: HTMLElement, label: string) {
	const button = Array.from(target.querySelectorAll('button')).find(item => item.textContent?.trim() === label);
	if (!button) throw new Error(`Button not found: ${label}`);
	button.click();
	await nextTick();
}

beforeEach(() => {
	fixtures.records.clear();
	fixtures.failWrite = false;
	fixtures.account.id = 'reporter';
	fixtures.api.mockReset();
	fixtures.notify.mockReset();
});
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); });

describe('Hatady report submission and explicit drafts', () => {
	test('a failed submission retains input and stored drafts, and only a successful retry clears its own draft and notifies', async () => {
		seed();
		const storedBefore = fixtures.records.get(storeKey);
		fixtures.api.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
		const { target, textarea, closed } = await mountReport();
		expect(textarea.value).toBe('保存していた理由');
		await input(textarea, '確認してほしい理由');
		await submit(target);
		expect(target.querySelector('[role="alert"]')?.textContent).toContain('送信できませんでした');
		expect(textarea.value).toBe('確認してほしい理由');
		expect(fixtures.records.get(storeKey)).toBe(storedBefore);
		expect(closed).not.toHaveBeenCalled();
		expect(fixtures.notify).not.toHaveBeenCalled();
		await submit(target);
		expect(fixtures.api).toHaveBeenLastCalledWith('users/report-abuse', {
			userId: 'target-user', comment: `${reference}\n対象の返信\n\n確認してほしい理由`,
		});
		expect(readDrafts()).toEqual({ other: otherDraft });
		expect(fixtures.notify).toHaveBeenCalledExactlyOnceWith('通報を送信しました');
		expect(closed).toHaveBeenCalledTimes(1);
	});

	test('closing keeps the editor mounted and saves only through the explicit draft choice', async () => {
		const { target, textarea, closed } = await mountReport();
		await input(textarea, '途中の理由');
		expect(fixtures.records.size).toBe(0);
		await click(target, '戻る');
		expect(target.querySelector('textarea')).toBe(textarea);
		expect(target.querySelector('[data-dialog="通報"]')?.hasAttribute('inert')).toBe(true);
		await click(target, '編集に戻る');
		expect(textarea.value).toBe('途中の理由');
		expect(closed).not.toHaveBeenCalled();
		await click(target, '戻る');
		await click(target, '端末に下書きを保存して閉じる');
		expect(readDrafts()[draftKey].data.reason).toBe('途中の理由');
		expect(fixtures.api).not.toHaveBeenCalled();
		expect(closed).toHaveBeenCalledTimes(1);
	});

	test('after successful reporting, a failed draft cleanup keeps the sent form open and retries deletion without resending', async () => {
		seed();
		const storedBefore = fixtures.records.get(storeKey);
		fixtures.api.mockResolvedValue(undefined);
		const { target, textarea, closed } = await mountReport();
		fixtures.failWrite = true;
		await submit(target);
		expect(fixtures.api).toHaveBeenCalledTimes(1);
		expect(closed).not.toHaveBeenCalled();
		expect(textarea.disabled).toBe(true);
		expect(target.querySelector('button[type="submit"]')).toBeNull();
		expect(target.querySelector('[role="alert"]')?.textContent).toBe('通報を送信しましたが、端末の下書きを削除できませんでした');
		expect(fixtures.notify).toHaveBeenCalledExactlyOnceWith('通報を送信しましたが、端末の下書きを削除できませんでした');
		await submit(target);
		await click(target, '閉じる');
		await click(target, '前へ戻る');
		await click(target, '端末の下書きを削除して閉じる');
		expect(closed).not.toHaveBeenCalled();
		expect(fixtures.records.get(storeKey)).toBe(storedBefore);
		expect(fixtures.api).toHaveBeenCalledTimes(1);
		fixtures.failWrite = false;
		await click(target, '端末の下書きを削除して閉じる');
		expect(readDrafts()).toEqual({ other: otherDraft });
		expect(closed).toHaveBeenCalledTimes(1);
		expect(fixtures.api).toHaveBeenCalledTimes(1);
	});

	test('explicit discard removes a restored draft while retaining other drafts', async () => {
		seed();
		const { target, textarea, closed } = await mountReport();
		await input(textarea, '');
		await click(target, '戻る');
		await click(target, '下書きを破棄して閉じる');
		expect(readDrafts()).toEqual({ other: otherDraft });
		expect(fixtures.api).not.toHaveBeenCalled();
		expect(closed).toHaveBeenCalledTimes(1);
	});

	test('a long quoted reply preserves its target ID and leaves room for a reason within the API limit', async () => {
		fixtures.api.mockResolvedValue(undefined);
		const { target, textarea } = await mountReport(`${reference}\n${'あ'.repeat(2048)}`);
		expect(textarea.maxLength).toBeGreaterThan(1000);
		await input(textarea, '理由'.repeat(1024).slice(0, textarea.maxLength));
		await submit(target);
		const payload = fixtures.api.mock.calls[0][1];
		expect(payload.comment.startsWith(`${reference}\n`)).toBe(true);
		expect(payload.comment.length).toBe(2048);
	});
});
