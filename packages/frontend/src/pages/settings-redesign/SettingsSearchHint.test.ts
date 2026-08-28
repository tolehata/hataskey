/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { createSearchHintController } from './settings-search-hint.js';

// ⚠️process.cwd() 基準。new URL(import.meta.url) は Vite に書き換えられて
//   ファイルとして読めなくなる。
const shellSource = readFileSync(resolve(process.cwd(), 'src/pages/settings-redesign/index.vue'), 'utf8');

function makeClock() {
	let now = 0;
	let seq = 1;
	const timers = new Map<number, { at: number; fn: () => void }>();
	return {
		setTimer: (fn: () => void, ms: number) => {
			const id = seq++;
			timers.set(id, { at: now + ms, fn });
			return id;
		},
		clearTimer: (id: number) => { timers.delete(id); },
		advance: (ms: number) => {
			const target = now + ms;
			for (;;) {
				const due = [...timers.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
				if (due == null) break;
				timers.delete(due[0]);
				now = due[1].at;
				due[1].fn();
			}
			now = target;
		},
	};
}

function setup(eligible: () => boolean = () => true) {
	const clock = makeClock();
	const seen: boolean[] = [];
	const controller = createSearchHintController({
		idleMs: 15000,
		visibleMs: 8000,
		eligible,
		onChange: (v) => seen.push(v),
		setTimer: clock.setTimer,
		clearTimer: clock.clearTimer,
	});
	return { clock, seen, controller };
}

describe('設定の検索案内', () => {
	test('15秒なにも変わらなければ案内を出し、8秒で見出しへ戻す', () => {
		const { clock, controller } = setup();
		controller.restart();

		clock.advance(14999);
		expect(controller.visible()).toBe(false); // まだ出さない

		clock.advance(1);
		expect(controller.visible()).toBe(true);

		clock.advance(7999);
		expect(controller.visible()).toBe(true);

		clock.advance(1);
		expect(controller.visible()).toBe(false);
	});

	test('戻したあとは、また15秒待ってから出す（続けざまに出さない）', () => {
		const { clock, controller } = setup();
		controller.restart();
		clock.advance(23000); // 出して、戻すところまで
		expect(controller.visible()).toBe(false);

		clock.advance(14999);
		expect(controller.visible()).toBe(false);
		clock.advance(1);
		expect(controller.visible()).toBe(true);
	});

	test('数え直すと待ち時間は最初から', () => {
		const { clock, controller } = setup();
		controller.restart();
		clock.advance(14000);
		controller.restart(); // 設定をいじった
		clock.advance(14999);
		expect(controller.visible()).toBe(false);
		clock.advance(1);
		expect(controller.visible()).toBe(true);
	});

	test('出ている最中に設定をいじったら、すぐ見出しへ戻す', () => {
		const { clock, controller } = setup();
		controller.restart();
		clock.advance(15000);
		expect(controller.visible()).toBe(true);
		controller.restart();
		expect(controller.visible()).toBe(false);
	});

	test('出してよい場面でなければ、いつまで待っても出さない', () => {
		const { clock, controller } = setup(() => false);
		controller.restart();
		clock.advance(600000);
		expect(controller.visible()).toBe(false);
	});

	test('待っているあいだに画面が広くなったら出さない', () => {
		let eligible = true;
		const clock = makeClock();
		const controller = createSearchHintController({
			idleMs: 15000, visibleMs: 8000,
			eligible: () => eligible,
			onChange: () => {},
			setTimer: clock.setTimer, clearTimer: clock.clearTimer,
		});
		controller.restart();
		clock.advance(14000);
		eligible = false; // 窓を広げた
		clock.advance(2000);
		expect(controller.visible()).toBe(false);
	});

	test('片付けたら出さない。ただし数え直せばまた動く', () => {
		const { clock, controller } = setup();
		controller.restart();
		controller.stop();
		clock.advance(600000);
		expect(controller.visible()).toBe(false);

		// ⚠️永久停止にしてはいけない。keep-alive で画面へ戻ったとき、
		//   二度と案内が出なくなる。
		controller.restart();
		clock.advance(15000);
		expect(controller.visible()).toBe(true);
	});

	test('見え方が変わったときだけ知らせる', () => {
		const { clock, seen, controller } = setup();
		controller.restart();
		expect(seen).toEqual([]); // 変わっていないので黙っている
		clock.advance(15000);
		clock.advance(8000);
		expect(seen).toEqual([true, false]);
	});
});

describe('画面への繋ぎ込み', () => {
	// ⚠️時計が正しくても、画面から呼ばなければ何も起きない。
	//   実際に一度、起動時に数え始めておらず「いつまでも変わらない」状態になった。
	test('狭さと現在の画面を見て数え直す（起動直後も含む）', () => {
		expect(shellSource).toContain('watch([compact, currentPage], () => searchHintController.restart(), { immediate: true });');
	});

	test('設定の値そのものを見張る（refのまま JSON にしても依存は登録されない）', () => {
		expect(shellSource).toContain('Object.values(prefer.r).map(entry => entry.value)');
		expect(shellSource).not.toContain('JSON.stringify(prefer.r)');
	});

	test('画面を離れるときに片付ける', () => {
		expect(shellSource).toContain('searchHintController.stop();');
	});
});
