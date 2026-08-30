/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createApp, defineComponent, h, nextTick } from 'vue';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/components/HataskEmoji.vue', async () => {
	const { defineComponent: defineMockComponent, h: renderNode } = await import('vue');
	return { default: defineMockComponent({ props: { emoji: { type: String, default: '' } }, setup: props => () => renderNode('span', { 'data-test-emoji': '' }, props.emoji) }) };
});

import HataskTodoPlanner from './HataskTodoPlanner.vue';
import type { App } from 'vue';
import type { HataskTodoItem, HataskTodoLabels } from './hatask-planner-types.js';

type Mounted = { app: App<Element>; container: HTMLDivElement };
const mounted: Mounted[] = [];

const labels: HataskTodoLabels = {
	todo: 'やること',
	viewSelector: '表示',
	views: { today: '今日', upcoming: 'これから', overdue: '期限切れ', priority: '優先', all: 'すべて', completed: '完了済み', templates: 'テンプレート' },
	search: 'やることを検索',
	searchPlaceholder: '検索',
	addTask: '追加',
	filters: '絞り込み',
	loading: '読み込み中',
	empty: 'やることはありません',
	readOnly: '読み取り専用',
	priorities: { none: 'なし', low: '低', medium: '中', high: '高' },
	completeTask: title => `${title}を完了`,
	reopenTask: title => `${title}を未完了へ戻す`,
	editTask: title => `${title}を編集`,
	archiveTask: title => `${title}を保管`,
	restoreTask: title => `${title}を復元`,
	deleteTask: title => `${title}を削除`,
	moveUp: title => `${title}を上へ`,
	moveDown: title => `${title}を下へ`,
	subtaskProgress: (completed, total) => `小項目 ${completed}/${total}`,
	sort: '並び順',
	sortOptions: { manual: '手動順', dueAsc: '期限が近い順', priority: '優先度順', createdDesc: '新しく作った順' },
	folders: 'フォルダ',
	selectedCount: count => `${count}件を選択中`,
	bulkComplete: '完了',
	bulkMove: '移動',
	bulkDue: '期限',
	bulkPriority: '優先度',
	bulkArchive: 'アーカイブ',
	clearSelection: '選択を解除',
	addFolder: 'フォルダを追加',
	manageFolder: name => `${name}を管理`,
	moreActions: title => `${title}のその他の操作`,
	moreViews: 'その他',
	reorderViews: 'タブを並び替え',
	reorderView: name => `${name}を並び替え`,
};

const items: HataskTodoItem[] = [
	{
		id: 'todo-1',
		text: '資料を仕上げる',
		done: false,
		priority: 'high',
		dueLabel: '今日 18:00',
		recurrenceLabel: '毎週',
		subtasks: [{ id: 'sub-1', text: '確認', done: true }, { id: 'sub-2', text: '送信', done: false }],
	},
	{
		id: 'todo-2',
		text: '記録を見直す',
		done: true,
		priority: 'none',
		archivedAt: '2026-08-29T00:00:00.000Z',
		archivedLabel: '8月29日に保管',
	},
];

function mountTodo(options: Record<string, unknown> = {}) {
	const handlers = {
		view: vi.fn(),
		search: vi.fn(),
		sort: vi.fn(),
		filter: vi.fn(),
		complete: vi.fn(),
		moveUp: vi.fn(),
		moveDown: vi.fn(),
		edit: vi.fn(),
		archive: vi.fn(),
		restore: vi.fn(),
		remove: vi.fn(),
		addFolder: vi.fn(),
		manageFolder: vi.fn(),
		mobileOrder: vi.fn(),
		dropTarget: vi.fn(),
		bulk: vi.fn(),
	};
	const app = createApp(defineComponent({
		setup() {
			return () => h(HataskTodoPlanner, {
				theme: 'suri',
				view: 'today',
				items,
				labels,
				filters: [{ id: 'folder:work', kind: 'folder', label: '作業', active: false, count: 8, color: '#1677aa' }],
				viewCounts: { today: 1, all: 2, completed: 1 },
				mobileTabOrder: ['today', 'upcoming', 'all', 'completed', 'more'],
				'onUpdate:view': handlers.view,
				'onUpdate:searchQuery': handlers.search,
				'onUpdate:sort': handlers.sort,
				onToggleFilter: handlers.filter,
				onComplete: handlers.complete,
				onMoveUp: handlers.moveUp,
				onMoveDown: handlers.moveDown,
				onEdit: handlers.edit,
				onArchive: handlers.archive,
				onRestore: handlers.restore,
				onDelete: handlers.remove,
				onAddFolder: handlers.addFolder,
				onManageFolder: handlers.manageFolder,
				'onUpdate:mobileTabOrder': handlers.mobileOrder,
				onDropTarget: handlers.dropTarget,
				onBulkAction: handlers.bulk,
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

describe('HataskTodoPlanner', () => {
	test('優先度・小項目・保管状態を表示し、操作を親へ通知する', async () => {
		const { container, handlers } = mountTodo();
		await nextTick();
		const root = container.querySelector<HTMLElement>('[data-hatask-component="todo"]');
		expect(root?.dataset.hataskTheme).toBe('suri');
		expect(container.querySelector('[data-todo-id="todo-1"]')?.getAttribute('data-priority')).toBe('high');
		expect(container.querySelector('progress')?.getAttribute('value')).toBe('1');

		const checkbox = container.querySelector<HTMLInputElement>('[aria-label="資料を仕上げるを完了"]');
		checkbox?.click();
		(container.querySelector('[aria-label="これから"]') as HTMLButtonElement).click();
		(container.querySelector('[aria-label="作業"]') as HTMLButtonElement).click();
		(container.querySelector('[aria-label="資料を仕上げるのその他の操作"]') as HTMLButtonElement).click();
		await nextTick();
		(container.querySelector('[aria-label="資料を仕上げるを下へ"]') as HTMLButtonElement).click();
		(container.querySelector('[aria-label="資料を仕上げるを編集"]') as HTMLButtonElement).click();
		(container.querySelector('[aria-label="資料を仕上げるを保管"]') as HTMLButtonElement).click();
		(container.querySelector('[aria-label="記録を見直すを復元"]') as HTMLButtonElement).click();

		const search = container.querySelector<HTMLInputElement>('input[type="search"]');
		if (search == null) throw new Error('search input was not rendered');
		search.value = '資料';
		search.dispatchEvent(new Event('input', { bubbles: true }));

		expect(handlers.complete).toHaveBeenCalledWith(items[0], true);
		expect(handlers.view).toHaveBeenCalledWith('upcoming');
		expect(handlers.filter).toHaveBeenCalledWith('folder:work');
		expect(handlers.moveDown).toHaveBeenCalledWith(items[0], 0);
		expect(handlers.edit).toHaveBeenCalledWith(items[0]);
		expect(handlers.archive).toHaveBeenCalledWith(items[0]);
		expect(handlers.restore).toHaveBeenCalledWith(items[1]);
		expect(handlers.search).toHaveBeenCalledWith('資料');
	});

	test('並べ替えにはドラッグ不要の上下ボタンがあり、端では無効になる', async () => {
		const { container } = mountTodo();
		await nextTick();
		(container.querySelector('[aria-label="資料を仕上げるのその他の操作"]') as HTMLButtonElement).click();
		await nextTick();
		expect(container.querySelector<HTMLButtonElement>('[aria-label="資料を仕上げるを上へ"]')?.disabled).toBe(true);
		expect(container.querySelector<HTMLButtonElement>('[aria-label="資料を仕上げるを下へ"]')?.disabled).toBe(false);
		(container.querySelector('[aria-label="記録を見直すのその他の操作"]') as HTMLButtonElement).click();
		await nextTick();
		expect(container.querySelector<HTMLButtonElement>('[aria-label="記録を見直すを下へ"]')?.disabled).toBe(true);
	});

	test('並び順は文字列ボタンでなくアイコンメニューから選べる', async () => {
		const { container, handlers } = mountTodo();
		await nextTick();
		(container.querySelector('[aria-label="並び順: 手動順"]') as HTMLButtonElement).click();
		await nextTick();
		const option = [...container.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')].find(button => button.textContent.includes('期限が近い順'));
		if (option == null) throw new Error('due date sort option was not rendered');
		option.click();
		expect(handlers.sort).toHaveBeenCalledWith('dueAsc');
	});

	test('モバイル用タブケースは受信箱を含まず、その他を含めてキーボードでも並び替えられる', async () => {
		const { container, handlers } = mountTodo();
		await nextTick();
		const tabs = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
		expect(tabs.map(tab => tab.textContent.trim())).toEqual(['今日', 'これから', 'すべて', '完了済み', 'その他']);
		expect(container.textContent).not.toContain('受信箱');

		(container.querySelector('[aria-label="タブを並び替え"]') as HTMLButtonElement).click();
		await nextTick();
		const today = container.querySelector<HTMLButtonElement>('[aria-label="今日を並び替え"]');
		if (today == null) throw new Error('reorderable today tab was not rendered');
		today.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		await nextTick();
		expect(handlers.mobileOrder).toHaveBeenCalledWith(['upcoming', 'today', 'all', 'completed', 'more']);
		expect([...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')].map(tab => tab.textContent.trim())).toEqual(['これから', '今日', 'すべて', '完了済み', 'その他']);
	});

	test('タッチ長押し後のclickで選択が解除されず、アイコン一括操作にも名前がある', async () => {
		vi.useFakeTimers();
		try {
			const { container } = mountTodo();
			await nextTick();
			const row = container.querySelector<HTMLElement>('[data-todo-id="todo-1"]');
			if (row == null) throw new Error('todo row was not rendered');
			const pointerDown = new Event('pointerdown', { bubbles: true });
			Object.defineProperties(pointerDown, {
				pointerType: { value: 'touch' },
				clientX: { value: 10 },
				clientY: { value: 10 },
			});
			row.dispatchEvent(pointerDown);
			vi.advanceTimersByTime(380);
			await nextTick();
			row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			await nextTick();

			expect(row.dataset.selected).toBe('true');
			expect(container.querySelector('[role="toolbar"]')?.getAttribute('aria-label')).toBe('1件を選択中');
			expect(container.querySelector('[aria-label="完了"]')).not.toBeNull();
			expect(container.querySelector('[aria-label="移動"]')).not.toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});

	test('読み取り専用時は状態を伝え、完了・編集・削除を無効にする', async () => {
		const { container, handlers } = mountTodo({ readOnly: true });
		await nextTick();
		expect(container.textContent).toContain(labels.readOnly);
		expect(container.querySelectorAll('[role="status"]')).toHaveLength(0);
		expect(container.querySelector<HTMLInputElement>('[aria-label="資料を仕上げるを完了"]')?.disabled).toBe(true);
		expect(container.querySelector<HTMLButtonElement>('[aria-label="資料を仕上げるを編集"]')?.disabled).toBe(true);
		(container.querySelector('[aria-label="資料を仕上げるのその他の操作"]') as HTMLButtonElement).click();
		await nextTick();
		const remove = container.querySelector<HTMLButtonElement>('[aria-label="資料を仕上げるを削除"]');
		expect(remove?.disabled).toBe(true);
		remove?.click();
		expect(handlers.remove).not.toHaveBeenCalled();
	});

	test('読み込み表示は親のライブリージョンと重複せず、busy状態だけを公開する', async () => {
		const { container } = mountTodo({ loading: true });
		await nextTick();
		const root = container.querySelector<HTMLElement>('[data-hatask-component="todo"]');
		expect(root?.getAttribute('aria-busy')).toBe('true');
		expect(container.textContent).toContain(labels.loading);
		expect(container.querySelectorAll('[role="status"]')).toHaveLength(0);
	});
});
