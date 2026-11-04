/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import {
	createTimelineHighlightSpine,
	createTimelineHighlightSpineTransition,
	HIGHLIGHT_SPINE_MAX_RADIUS,
	HIGHLIGHT_SPINE_MIN_RADIUS,
	interpolateTimelineHighlightSpine,
	sampleTimelineHighlightSpine,
	timelineHighlightSpinePath,
	timelineHighlightSpinesEqual,
	timelineHighlightSpineStops,
} from './timeline-highlight-spine.js';
import type { TimelineHighlightSpineGeometry } from './timeline-highlight-spine.js';

const positions = Array.from({ length: 101 }, (_, index) => index / 100);

function expectSameCurve(a: TimelineHighlightSpineGeometry, b: TimelineHighlightSpineGeometry): void {
	expect(a.height).toBeCloseTo(b.height, 10);
	for (const position of positions) {
		const left = sampleTimelineHighlightSpine(a, position);
		const right = sampleTimelineHighlightSpine(b, position);
		expect(left.radius).toBeCloseTo(right.radius, 9);
		expect(left.radiusSlope).toBeCloseTo(right.radiusSlope, 8);
		expect(left.opacity).toBeCloseTo(right.opacity, 9);
	}
}

describe('ハイライトの連続した密度曲線', () => {
	test('一つの閉じた輪郭で盛り上がりを描き、元の密度の幅を保つ', () => {
		const geometry = createTimelineHighlightSpine([
			{ y: 15, density: 0 }, { y: 50, density: 1 }, { y: 85, density: 0 },
		], 100);
		const path = timelineHighlightSpinePath(geometry);
		expect(path.match(/M /g)).toHaveLength(1);
		expect(path.match(/Z/g)).toHaveLength(1);
		expect(path.match(/A /g)).toHaveLength(2);
		expect(geometry.nodes[2].radius).toBe(HIGHLIGHT_SPINE_MAX_RADIUS);
		expect(geometry.nodes[1].radius).toBe(HIGHLIGHT_SPINE_MIN_RADIUS);
		for (const position of positions) {
			const sample = sampleTimelineHighlightSpine(geometry, position);
			expect(sample.radius).toBeGreaterThanOrEqual(HIGHLIGHT_SPINE_MIN_RADIUS - 1e-10);
			expect(sample.radius).toBeLessThanOrEqual(HIGHLIGHT_SPINE_MAX_RADIUS + 1e-10);
		}
	});

	test('区間の端で接線がそろい、同じ密度は幅も濃さも一定になる', () => {
		const geometry = createTimelineHighlightSpine([
			{ y: 20, density: 0.5 }, { y: 40, density: 0.5 }, { y: 80, density: 0.5 },
		], 100);
		const radius = geometry.nodes[0].radius;
		for (const position of positions) {
			const sample = sampleTimelineHighlightSpine(geometry, position);
			expect(sample.radius).toBeCloseTo(radius, 10);
			expect(sample.radiusSlope).toBeCloseTo(0, 9);
		}
		expect(timelineHighlightSpineStops(geometry).every(stop => Math.abs(stop.opacity - 0.62) < 1e-10)).toBe(true);
		const different = createTimelineHighlightSpine([{ y: 20, density: 0 }, { y: 80, density: 1 }], 100);
		for (const node of different.nodes) expect(node.radiusSlope).toBe(0);
		const a = different.nodes[1];
		const b = different.nodes[2];
		const quarter = sampleTimelineHighlightSpine(different, a.position + (b.position - a.position) / 4);
		expect(quarter.radius).toBeCloseTo(a.radius + (b.radius - a.radius) * 0.15625, 10);
		expect(quarter.opacity).toBeCloseTo(0.15625, 10);
	});

	test('密度の濃さも曲線と同じ補間を使い、上下端まで単調なoffsetになる', () => {
		const geometry = createTimelineHighlightSpine([{ y: 20, density: 0 }, { y: 80, density: 1 }], 100);
		const stops = timelineHighlightSpineStops(geometry);
		expect(stops[0]).toEqual({ offset: 0, opacity: 0 });
		expect(stops[stops.length - 1]).toEqual({ offset: 1, opacity: 1 });
		for (let index = 1; index < stops.length; index++) expect(stops[index].offset).toBeGreaterThanOrEqual(stops[index - 1].offset);
		const quarter = stops.find(stop => Math.abs(stop.offset - 0.35) < 1e-8);
		expect(quarter?.opacity).toBeCloseTo(0.15625, 10);
	});

	test('0件の時間は基線の幅を保持し、密度部分だけ透明になる', () => {
		const geometry = createTimelineHighlightSpine([{ y: 20, density: 0 }, { y: 80, density: 0 }], 100);
		expect(geometry.nodes.every(node => node.radius === HIGHLIGHT_SPINE_MIN_RADIUS && node.opacity === 0)).toBe(true);
		expect(timelineHighlightSpinePath(geometry)).not.toBe('');
	});

	test('空データ・順序違い・重複座標・不正値・短い高さでも有限の輪郭になる', () => {
		const points = [{ y: 80, density: 3 }, { y: -20, density: -1 }, { y: 80, density: 0.2 }, { y: Number.NaN, density: 1 }];
		for (const height of [0, -20, Number.NaN, 0.5, 100]) {
			const geometry = createTimelineHighlightSpine(points, height);
			expect(timelineHighlightSpinePath(geometry)).not.toMatch(/NaN|Infinity|undefined/);
			expect(timelineHighlightSpineStops(geometry).every(stop => Number.isFinite(stop.offset) && Number.isFinite(stop.opacity))).toBe(true);
		}
		const zero = createTimelineHighlightSpine([], 0);
		expect(timelineHighlightSpinePath(zero)).toBe('');
		expect(timelineHighlightSpineStops(zero)).toEqual([]);
		const empty = createTimelineHighlightSpine([], 100);
		expect(empty.nodes.every(node => node.opacity === 0)).toBe(true);
		expect(points[0]).toEqual({ y: 80, density: 3 });
	});

	test('点数と高さが違っても補間の開始・終了の曲線を保つ', () => {
		const from = createTimelineHighlightSpine([{ y: 20, density: 0 }, { y: 50, density: 1 }, { y: 80, density: 0.2 }], 100);
		const to = createTimelineHighlightSpine([{ y: 20, density: 0.4 }, { y: 110, density: 0.8 }, { y: 150, density: 0.1 }, { y: 250, density: 1 }], 300);
		const transition = createTimelineHighlightSpineTransition(from, to)!;
		expectSameCurve(from, interpolateTimelineHighlightSpine(transition, 0));
		expectSameCurve(to, interpolateTimelineHighlightSpine(transition, 1));
		const middle = interpolateTimelineHighlightSpine(transition, 0.5);
		expect(middle.height).toBe(200);
		for (const position of positions) {
			const sample = sampleTimelineHighlightSpine(middle, position);
			expect(sample.radius).toBeGreaterThanOrEqual(HIGHLIGHT_SPINE_MIN_RADIUS - 1e-10);
			expect(sample.radius).toBeLessThanOrEqual(HIGHLIGHT_SPINE_MAX_RADIUS + 1e-10);
		}
	});

	test('移動途中の曲線を次の補間の開始形にできる', () => {
		const from = createTimelineHighlightSpine([{ y: 20, density: 0.1 }, { y: 80, density: 1 }], 100);
		const to = createTimelineHighlightSpine([{ y: 40, density: 0.8 }, { y: 200, density: 0.2 }], 240);
		const first = createTimelineHighlightSpineTransition(from, to)!;
		const current = interpolateTimelineHighlightSpine(first, 0.42);
		const final = createTimelineHighlightSpine([{ y: 10, density: 0 }, { y: 60, density: 1 }, { y: 110, density: 0.5 }], 120);
		const replacement = createTimelineHighlightSpineTransition(current, final)!;
		expectSameCurve(current, interpolateTimelineHighlightSpine(replacement, 0));
		expectSameCurve(final, interpolateTimelineHighlightSpine(replacement, 1));
	});

	test('拡縮を60回中断しても現在の輪郭から続き、補間点が増えない', () => {
		const makeGeometry = (iteration: number): TimelineHighlightSpineGeometry => {
			const height = 360 + (iteration % 11) * 13;
			return createTimelineHighlightSpine(Array.from({ length: 24 }, (_, index) => ({
				y: (index + 0.5) / 24 * height,
				density: (Math.sin(index * 0.3 + iteration * 0.08) + 1) / 2,
			})), height);
		};
		let current = makeGeometry(0);
		const nodeCount = current.nodes.length;
		for (let iteration = 1; iteration <= 60; iteration++) {
			const next = makeGeometry(iteration);
			const transition = createTimelineHighlightSpineTransition(current, next)!;
			expectSameCurve(current, interpolateTimelineHighlightSpine(transition, 0));
			current = interpolateTimelineHighlightSpine(transition, 0.18);
			expect(current.nodes).toHaveLength(nodeCount);
			for (let index = 1; index < current.nodes.length; index++) {
				expect(current.nodes[index].position).toBeGreaterThan(current.nodes[index - 1].position);
			}
		}
	});

	test('同じ目標形と高さ0を判別し、細かい密度曲線も補間できる', () => {
		const points = [{ y: 20, density: 0.5 }];
		const first = createTimelineHighlightSpine(points, 100);
		expect(timelineHighlightSpinesEqual(first, createTimelineHighlightSpine(points, 100))).toBe(true);
		expect(timelineHighlightSpinesEqual(first, createTimelineHighlightSpine(points, 110))).toBe(false);
		expect(createTimelineHighlightSpineTransition(first, createTimelineHighlightSpine([], 0))).toBeNull();
		const dense = createTimelineHighlightSpine(Array.from({ length: 300 }, (_, index) => ({ y: index + 5, density: index % 2 })), 310);
		const transition = createTimelineHighlightSpineTransition(first, dense)!;
		expectSameCurve(first, interpolateTimelineHighlightSpine(transition, 0));
		expectSameCurve(dense, interpolateTimelineHighlightSpine(transition, 1));
	});
});
