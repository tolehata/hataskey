/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export type TimelineHighlightPoint = { y: number; density: number };

export type TimelineHighlightSpineNode = {
	position: number;
	radius: number;
	opacity: number;
	radiusSlope: number;
	opacitySlope: number;
};

export type TimelineHighlightSpineGeometry = {
	height: number;
	nodes: TimelineHighlightSpineNode[];
};

export type TimelineHighlightSpineTransition = {
	from: TimelineHighlightSpineGeometry;
	to: TimelineHighlightSpineGeometry;
};

export const HIGHLIGHT_SPINE_WIDTH = 20;
export const HIGHLIGHT_SPINE_MIN_RADIUS = 0.85;
export const HIGHLIGHT_SPINE_MAX_RADIUS = 3.8;

const center = HIGHLIGHT_SPINE_WIDTH / 2;
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const rounded = (value: number): number => Number(value.toFixed(5));

export function createTimelineHighlightSpine(points: readonly TimelineHighlightPoint[], requestedHeight: number): TimelineHighlightSpineGeometry {
	const height = Number.isFinite(requestedHeight) ? Math.max(0, requestedHeight) : 0;
	if (height === 0) return { height, nodes: [] };

	const samples = points
		.filter(point => Number.isFinite(point.y) && Number.isFinite(point.density))
		.map(point => ({ y: clamp(point.y, 0, height), density: clamp(point.density, 0, 1) }))
		.sort((a, b) => a.y - b.y);
	const unique: TimelineHighlightPoint[] = [];
	for (const sample of samples) {
		const previous = unique.at(-1);
		if (previous?.y === sample.y) previous.density = Math.max(previous.density, sample.density);
		else unique.push(sample);
	}
	if (unique.length === 0) unique.push({ y: 0, density: 0 });

	const node = (position: number, density: number): TimelineHighlightSpineNode => ({
		position,
		radius: Math.min(height / 2, HIGHLIGHT_SPINE_MIN_RADIUS + density * (HIGHLIGHT_SPINE_MAX_RADIUS - HIGHLIGHT_SPINE_MIN_RADIUS)),
		opacity: density === 0 ? 0 : 0.24 + density * 0.76,
		radiusSlope: 0,
		opacitySlope: 0,
	});
	const first = node(0, unique[0].density);
	const last = node(1, unique[unique.length - 1].density);
	const span = height - first.radius - last.radius;
	const interior = span > 0 ? unique.flatMap(sample => {
		const position = (sample.y - first.radius) / span;
		return position > 0 && position < 1 ? [node(position, sample.density)] : [];
	}) : [];
	return { height, nodes: [first, ...interior, last] };
}

function nodeY(geometry: TimelineHighlightSpineGeometry, node: TimelineHighlightSpineNode): number {
	const first = geometry.nodes[0];
	const last = geometry.nodes[geometry.nodes.length - 1];
	return first.radius + Math.max(0, geometry.height - first.radius - last.radius) * node.position;
}

function hermite(a: number, b: number, aSlope: number, bSlope: number, span: number, t: number): { value: number; slope: number } {
	const t2 = t * t;
	const t3 = t2 * t;
	return {
		value: (2 * t3 - 3 * t2 + 1) * a + (t3 - 2 * t2 + t) * span * aSlope + (-2 * t3 + 3 * t2) * b + (t3 - t2) * span * bSlope,
		slope: (6 * t2 - 6 * t) * a / span + (3 * t2 - 4 * t + 1) * aSlope + (-6 * t2 + 6 * t) * b / span + (3 * t2 - 2 * t) * bSlope,
	};
}

/** Preserve both the curve and its tangent when inserting stations for a morph. */
export function sampleTimelineHighlightSpine(geometry: TimelineHighlightSpineGeometry, position: number): TimelineHighlightSpineNode {
	const nodes = geometry.nodes;
	const bounded = clamp(position, 0, 1);
	if (nodes.length === 0) return { position: bounded, radius: 0, opacity: 0, radiusSlope: 0, opacitySlope: 0 };
	const exact = nodes.find(node => node.position === bounded);
	if (exact) return { ...exact };
	const index = nodes.findIndex(node => node.position > bounded);
	if (index <= 0) return { ...nodes[index === 0 ? 0 : nodes.length - 1], position: bounded };
	const a = nodes[index - 1];
	const b = nodes[index];
	const span = b.position - a.position;
	const t = (bounded - a.position) / span;
	const radius = hermite(a.radius, b.radius, a.radiusSlope, b.radiusSlope, span, t);
	const opacity = hermite(a.opacity, b.opacity, a.opacitySlope, b.opacitySlope, span, t);
	return { position: bounded, radius: radius.value, opacity: opacity.value, radiusSlope: radius.slope, opacitySlope: opacity.slope };
}

export function timelineHighlightSpinesEqual(a: TimelineHighlightSpineGeometry, b: TimelineHighlightSpineGeometry): boolean {
	return a.height === b.height && a.nodes.length === b.nodes.length && a.nodes.every((node, index) => {
		const other = b.nodes[index];
		return node.position === other.position && node.radius === other.radius && node.opacity === other.opacity && node.radiusSlope === other.radiusSlope && node.opacitySlope === other.opacitySlope;
	});
}

export function createTimelineHighlightSpineTransition(from: TimelineHighlightSpineGeometry, to: TimelineHighlightSpineGeometry): TimelineHighlightSpineTransition | null {
	if (from.nodes.length === 0 || to.nodes.length === 0) return null;
	// A resize moves existing samples. Keep their correspondence so a stream of
	// interrupted ResizeObserver updates does not accumulate additional stations.
	if (from.nodes.length === to.nodes.length) return { from, to };
	const positions = [...new Set([...from.nodes, ...to.nodes].map(node => node.position))].sort((a, b) => a - b);
	return {
		from: { height: from.height, nodes: positions.map(position => sampleTimelineHighlightSpine(from, position)) },
		to: { height: to.height, nodes: positions.map(position => sampleTimelineHighlightSpine(to, position)) },
	};
}

export function interpolateTimelineHighlightSpine(transition: TimelineHighlightSpineTransition, progress: number): TimelineHighlightSpineGeometry {
	const t = clamp(progress, 0, 1);
	const { from, to } = transition;
	return {
		height: from.height + (to.height - from.height) * t,
		nodes: from.nodes.map((node, index) => {
			const target = to.nodes[index];
			return {
				position: node.position + (target.position - node.position) * t,
				radius: node.radius + (target.radius - node.radius) * t,
				opacity: node.opacity + (target.opacity - node.opacity) * t,
				radiusSlope: node.radiusSlope + (target.radiusSlope - node.radiusSlope) * t,
				opacitySlope: node.opacitySlope + (target.opacitySlope - node.opacitySlope) * t,
			};
		}),
	};
}

export function timelineHighlightSpinePath(geometry: TimelineHighlightSpineGeometry): string {
	const { nodes } = geometry;
	if (nodes.length === 0 || geometry.height === 0) return '';
	const point = (node: TimelineHighlightSpineNode, side: number): string => `${rounded(center + side * node.radius)} ${rounded(nodeY(geometry, node))}`;
	const edge = (items: TimelineHighlightSpineNode[], side: number): string => items.slice(1).map((next, index) => {
		const previous = items[index];
		const distance = next.position - previous.position;
		const y = nodeY(geometry, previous);
		const nextY = nodeY(geometry, next);
		return `C ${rounded(center + side * (previous.radius + previous.radiusSlope * distance / 3))} ${rounded(y + (nextY - y) / 3)} ${rounded(center + side * (next.radius - next.radiusSlope * distance / 3))} ${rounded(nextY - (nextY - y) / 3)} ${point(next, side)}`;
	}).join(' ');
	const first = nodes[0];
	const last = nodes[nodes.length - 1];
	return `M ${point(first, 1)} ${edge(nodes, 1)} A ${rounded(last.radius)} ${rounded(last.radius)} 0 0 1 ${point(last, -1)} ${edge([...nodes].reverse(), -1)} A ${rounded(first.radius)} ${rounded(first.radius)} 0 0 1 ${point(first, 1)} Z`;
}

export function timelineHighlightSpineStops(geometry: TimelineHighlightSpineGeometry): { offset: number; opacity: number }[] {
	const { nodes, height } = geometry;
	if (nodes.length === 0 || height === 0) return [];
	const stops = [{ offset: 0, opacity: nodes[0].opacity }];
	const firstRadius = nodes[0].radius;
	const visibleSpan = Math.max(0, height - firstRadius - nodes[nodes.length - 1].radius);
	for (let index = 0; index < nodes.length - 1; index++) {
		const a = nodes[index];
		const b = nodes[index + 1];
		for (let step = 0; step < 8; step++) {
			const t = step / 8;
			const distance = b.position - a.position;
			const position = a.position + distance * t;
			const opacity = hermite(a.opacity, b.opacity, a.opacitySlope, b.opacitySlope, distance, t).value;
			stops.push({ offset: clamp((firstRadius + visibleSpan * position) / height, 0, 1), opacity: clamp(opacity, 0, 1) });
		}
	}
	const last = nodes[nodes.length - 1];
	stops.push({ offset: clamp(nodeY(geometry, last) / height, 0, 1), opacity: last.opacity }, { offset: 1, opacity: last.opacity });
	return stops;
}
