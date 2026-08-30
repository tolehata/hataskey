/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createApp, defineComponent, h, nextTick, ref } from 'vue';
import { afterEach, describe, expect, test, vi } from 'vitest';
import HataskQuickCapture from './HataskQuickCapture.vue';
import type { App } from 'vue';

type Mounted = { app: App<Element>; container: HTMLDivElement };
const mounted: Mounted[] = [];

function mountCapture(options: Record<string, unknown> = {}) {
	const handlers = {
		submit: vi.fn(),
		tool: vi.fn(),
		chip: vi.fn(),
		removeChip: vi.fn(),
		collapse: vi.fn(),
		update: vi.fn(),
	};
	const model = ref('');
	const app = createApp(defineComponent({
		setup() {
			return () => h(HataskQuickCapture, {
				mode: 'event',
				modelValue: model.value,
				label: '予定をすぐ追加',
				placeholder: '予定名を入力',
				submitLabel: '予定を追加',
				chipLabel: '選択中の予定設定',
				toolLabel: '予定の入力設定',
				removeChipLabel: label => `${label}を外す`,
				chips: [
					{ id: 'date', label: '今日', icon: 'ti ti-calendar', actionLabel: '日付を変更', actionIcon: 'ti ti-pencil' },
					{ id: 'priority', label: '優先', icon: 'ti ti-flag' },
				],
				tools: [
					{ id: 'templates', label: 'テンプレートを使う', icon: 'ti ti-template', active: true, showLabel: true, tone: 'accent' },
					{ id: 'template', label: 'テンプレートに保存', icon: 'ti ti-bookmark-plus', showLabel: true, tone: 'neutral' },
					{ id: 'details', label: '詳細設定', icon: 'ti ti-adjustments' },
				],
				onSubmit: handlers.submit,
				onTool: handlers.tool,
				onChip: handlers.chip,
				onRemoveChip: handlers.removeChip,
				onCollapse: handlers.collapse,
				'onUpdate:modelValue': (value: string) => {
					model.value = value;
					handlers.update(value);
				},
				...options,
			});
		},
	}));
	const container = window.document.createElement('div');
	window.document.body.append(container);
	app.mount(container);
	mounted.push({ app, container });
	return { container, handlers };
}

afterEach(() => {
	for (const item of mounted.splice(0)) {
		item.app.unmount();
		item.container.remove();
	}
});

describe('HataskQuickCapture', () => {
	test('明示的に閉じるまで展開を保ち、設定ピルをその場で操作できる', async () => {
		const { container, handlers } = mountCapture();
		const root = container.querySelector<HTMLElement>('section');
		const input = container.querySelector<HTMLInputElement>('input');

		expect(root?.dataset.open).toBe('false');
		expect(container.querySelector('[aria-label="日付を変更"]')).toBeNull();

		input?.focus();
		await nextTick();
		expect(root?.dataset.open).toBe('true');
		expect(container.querySelector('[aria-label="テンプレートを使う"]')?.textContent).toContain('テンプレートを使う');
		expect(container.querySelector('[aria-label="テンプレートに保存"]')?.textContent).toContain('テンプレートに保存');
		(container.querySelector('[aria-label="日付を変更"]') as HTMLButtonElement).click();
		(container.querySelector('[aria-label="優先を外す"]') as HTMLButtonElement).click();
		(container.querySelector('[aria-label="詳細設定"]') as HTMLButtonElement).click();
		expect(handlers.chip).toHaveBeenCalledWith('date');
		expect(handlers.removeChip).toHaveBeenCalledWith('priority');
		expect(handlers.tool).toHaveBeenCalledWith('details');

		const outside = window.document.createElement('button');
		window.document.body.append(outside);
		outside.focus();
		await nextTick();
		expect(root?.dataset.open).toBe('true');
		outside.remove();

		input?.focus();
		input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await nextTick();
		expect(root?.dataset.open).toBe('false');
		expect(handlers.collapse).toHaveBeenCalledTimes(1);
	});

	test('入力値を親へ返し、空欄では追加を実行しない', async () => {
		const { container, handlers } = mountCapture();
		const input = container.querySelector<HTMLInputElement>('input');
		const submit = container.querySelector<HTMLButtonElement>('[aria-label="予定を追加"]');
		expect(submit?.disabled).toBe(true);

		if (input == null) throw new Error('capture input was not rendered');
		input.value = '打ち合わせ 明日 10:00';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await nextTick();
		expect(handlers.update).toHaveBeenCalledWith('打ち合わせ 明日 10:00');
		expect(submit?.disabled).toBe(false);
		submit?.click();
		expect(handlers.submit).toHaveBeenCalledTimes(1);
	});
});
