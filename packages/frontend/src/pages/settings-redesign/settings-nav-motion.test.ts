/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createSettingsNavMotion } from './settings-nav-motion.js';

function fixture() {
	const nav = window.document.createElement('aside');
	const main = window.document.createElement('main');
	window.document.body.append(nav, main);
	let navWidth = 272;
	let mainWidth = 800;
	let mainLeft = 300;
	let enabled = true;
	vi.spyOn(window, 'getComputedStyle').mockImplementation(element => ({ paddingInline: element === nav ? navWidth === 64 ? '6px' : '12px' : '0px' }) as CSSStyleDeclaration);
	vi.spyOn(nav, 'getBoundingClientRect').mockImplementation(() => ({ width: navWidth, left: 6 }) as DOMRect);
	vi.spyOn(main, 'getBoundingClientRect').mockImplementation(() => ({ width: mainWidth, left: mainLeft }) as DOMRect);
	const running: { cancel: ReturnType<typeof vi.fn>; finish: () => void; finished: Promise<void> }[] = [];
	const animate = () => {
		let finish!: () => void;
		const finished = new Promise<void>(resolve => { finish = resolve; });
		const animation = { cancel: vi.fn(() => finish()), finish: () => finish(), finished };
		running.push(animation);
		return animation as unknown as Animation;
	};
	const navAnimate = vi.fn<HTMLElement['animate']>(animate);
	const mainAnimate = vi.fn<HTMLElement['animate']>(animate);
	nav.animate = navAnimate;
	main.animate = mainAnimate;
	const controller = createSettingsNavMotion({ nav: () => nav, main: () => main, enabled: () => enabled, nextTick: () => Promise.resolve() });
	const size = (width: number) => { navWidth = width; mainWidth = 1072 - width; mainLeft = width + 28; };
	return { nav, main, controller, size, running, navAnimate, mainAnimate, disable: () => { enabled = false; } };
}

afterEach(() => { window.document.body.replaceChildren(); vi.restoreAllMocks(); });

describe('settings left pane motion', () => {
	test('左右を同じ曲線で動かし、最終値は先に確定する', async () => {
		const f = fixture();
		const update = vi.fn(() => f.size(64));
		const pending = f.controller.transition(update);
		expect(update).toHaveBeenCalledOnce();
		await Promise.resolve();
		expect(f.navAnimate.mock.calls[0][0]).toEqual([{ width: '272px', paddingInline: '12px' }, { width: '64px', paddingInline: '6px' }]);
		expect(f.mainAnimate.mock.calls[0][0]).toEqual([{ width: '800px', transform: 'translateX(208px)' }, { width: '1008px', transform: 'translateX(0)' }]);
		expect(f.navAnimate.mock.calls[0][1]).toEqual(f.mainAnimate.mock.calls[0][1]);
		f.running.forEach(animation => animation.finish());
		await pending;
		expect(f.running.every(animation => animation.cancel.mock.calls.length === 1)).toBe(true);
	});
	test('途中の実測位置から反転し、古い完了通知で新しい動きを消さない', async () => {
		const f = fixture();
		const first = f.controller.transition(() => f.size(64));
		await Promise.resolve();
		f.size(180);
		const second = f.controller.transition(() => f.size(272));
		await Promise.resolve();
		expect(f.navAnimate.mock.calls[1][0]).toEqual([{ width: '180px', paddingInline: '12px' }, { width: '272px', paddingInline: '12px' }]);
		await first;
		expect(f.running[2].cancel).not.toHaveBeenCalled();
		f.running.slice(2).forEach(animation => animation.finish());
		await second;
	});
	test('同一フレームの連打では最後のレイアウトだけを描画する', async () => {
		const f = fixture();
		const first = f.controller.transition(() => f.size(64));
		const second = f.controller.transition(() => f.size(272));
		await first;
		await Promise.resolve();
		expect(f.navAnimate).toHaveBeenCalledTimes(1);
		f.running.forEach(animation => animation.finish());
		await second;
	});
	test('動きを減らす場合も状態更新を飛ばさない', async () => {
		const f = fixture(); f.disable();
		const update = vi.fn(() => f.size(64));
		await f.controller.transition(update);
		expect(update).toHaveBeenCalledOnce();
		expect(f.navAnimate).not.toHaveBeenCalled();
	});
	test('非表示ペインや幅の変わらない詳細切り替えはアニメーションしない', async () => {
		const f = fixture();
		await f.controller.transition(() => {});
		await f.controller.transition(() => f.size(0));
		expect(f.navAnimate).not.toHaveBeenCalled();
	});
	test('リサイズ・画面離脱時には補間を解除して最終レイアウトに戻す', async () => {
		const f = fixture();
		const pending = f.controller.transition(() => f.size(64));
		await Promise.resolve();
		f.controller.cancel();
		await pending;
		expect(f.running.every(animation => animation.cancel.mock.calls.length === 1)).toBe(true);
	});
});
