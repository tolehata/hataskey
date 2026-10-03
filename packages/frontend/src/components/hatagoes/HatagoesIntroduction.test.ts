/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick, reactive, watch } from 'vue';
import HatagoesIntroduction from './HatagoesIntroduction.vue';

const replayMotion = vi.hoisted(() => vi.fn());

vi.mock('./HatagoesDialog.vue', async () => {
	const { defineComponent, h, nextTick, watch } = await import('vue');
	return { default: defineComponent({ props: { open: Boolean }, emits: ['closed'], setup(props, { slots, emit }) {
		watch(() => props.open, visible => { if (!visible) void nextTick(() => emit('closed')); });
		return () => props.open ? h('div', { 'data-dialog': '' }, slots.default?.()) : null;
	} }) };
});
vi.mock('./motion/HatagoesStoryMotion.vue', async () => {
	const { defineComponent, h } = await import('vue');
	return { default: defineComponent({ props: { active: Boolean, loop: Boolean, mode: String, showCharacter: Boolean }, emits: ['complete'], setup(props, { emit, expose }) {
		expose({ replay: replayMotion });
		return () => h('button', { type: 'button', 'data-story-active': String(props.active), 'data-story-mode': props.mode, onClick: () => emit('complete') }, '再生完了');
	} }) };
});

let cleanup: (() => void) | undefined;
afterEach(() => { cleanup?.(); cleanup = undefined; replayMotion.mockClear(); });

describe('HataGoes introduction dialog', () => {
	test('skip, completion and replay keep the final action and close event in order', async () => {
		const launcher = window.document.createElement('button');
		const target = window.document.createElement('div');
		window.document.body.append(launcher, target);
		launcher.focus();
		const state = reactive({ open: true, active: true, mode: 'dark' as 'light' | 'dark' });
		const finish = vi.fn(() => { state.open = false; });
		const closed = vi.fn();
		const app = createApp(defineComponent({ render: () => h(HatagoesIntroduction, { ...state, onFinish: finish, onClosed: closed }) }));
		app.mount(target);
		cleanup = () => { app.unmount(); target.remove(); launcher.remove(); };
		await nextTick();
		expect(target.querySelector('[role="dialog"]')?.getAttribute('data-mode')).toBe('dark');
		expect(target.querySelector('[data-story-active]')?.getAttribute('data-story-active')).toBe('true');
		expect(target.querySelector('#hatagoes-introduction-title')?.textContent).toBe('HataGoes へようこそ');
		expect(target.querySelector('p')).toBeNull();
		expect(target.textContent).toContain('スキップ');
		expect(target.textContent).not.toContain('はじめる');
		expect(target.textContent).not.toContain('もう一度');
		expect(target.textContent).not.toContain('3つのアプリを、ひとつのアプリに。');
		const button = (label: string) => [...target.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.trim() === label);
		expect(button('再生')).toBeUndefined();
		expect(button('一時停止')).toBeUndefined();
		expect(button('最初から')).toBeUndefined();
		button('再生完了')?.click(); await nextTick();
		expect(target.textContent).toContain('はじめる');
		expect(target.textContent).not.toContain('スキップ');
		expect(button('もう一度')?.querySelector('.ti-reload')).not.toBeNull();
		expect(target.querySelector('[data-story-active]')?.getAttribute('data-story-active')).toBe('false');
		button('もう一度')?.click(); await nextTick();
		expect(replayMotion).toHaveBeenCalledOnce();
		expect(target.querySelector('[data-story-active]')?.getAttribute('data-story-active')).toBe('true');
		expect(target.textContent).toContain('スキップ');
		expect(target.textContent).not.toContain('はじめる');
		button('再生完了')?.click(); await nextTick();
		button('はじめる')?.click(); await nextTick(); await nextTick();
		expect(finish).toHaveBeenCalledOnce();
		expect(closed).toHaveBeenCalledOnce();
		expect(window.document.activeElement).toBe(launcher);
		state.mode = 'light'; state.open = true; await nextTick();
		expect(target.querySelector('[role="dialog"]')?.getAttribute('data-mode')).toBe('light');
		expect(target.textContent).toContain('スキップ');
		expect(target.textContent).not.toContain('はじめる');
		expect(target.querySelector('[data-story-active]')?.getAttribute('data-story-active')).toBe('true');
		button('スキップ')?.click(); await nextTick(); await nextTick();
		expect(finish).toHaveBeenCalledTimes(2);
		expect(closed).toHaveBeenCalledTimes(2);
	});
});
