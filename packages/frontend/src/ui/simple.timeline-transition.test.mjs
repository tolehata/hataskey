/* SPDX-License-Identifier: AGPL-3.0-only */
import { test } from 'vitest';
import * as Vue from 'vue';
import { parse, compileTemplate } from '@vue/compiler-sfc';
import simpleSource from './simple.vue?raw';

const assert = process.getBuiltinModule('assert/strict');

test('normal UI keeps its composer and timeline after repeated tab transitions and page/deck hiding', async () => {
	const descriptor = parse(simpleSource).descriptor;
	let transition;
	let wrapper;
	function visit(node, parent) {
		if (node.type === 1 && node.tag === 'Transition' && node.loc.source.includes('@beforeLeave="prepareTimelineLeave"')) {
			transition = node;
			wrapper = parent;
		}
		for (const child of node.children ?? []) visit(child, node);
	}
	visit(descriptor.template.ast, null);
	assert.ok(transition, 'find the actual timeline transition');
	assert.equal(wrapper?.tag, 'div', 'a stable wrapper controls page/deck visibility');
	assert.match(wrapper.loc.source, /^<div v-show="!isPageView && !deckActive"/);
	assert.doesNotMatch(transition.loc.source.split('\n')[1], /v-show=/, 'the keyed transition child is not persisted');
	const compiled = compileTemplate({
		source: wrapper.loc.source,
		filename: 'simple.vue',
		id: 'timeline-transition',
		compilerOptions: { mode: 'function', prefixIdentifiers: true },
	});
	assert.deepEqual(compiled.errors, []);
	assert.doesNotMatch(compiled.code, /persisted:/);

	let mounted = 0;
	const errors = [];
	const timers = [];
	const Timeline = {
		props: ['src'],
		setup(props) {
			const loaded = Vue.ref(false);
			mounted++;
			Vue.onMounted(() => timers.push(setTimeout(() => { loaded.value = true; }, 12)));
			return () => Vue.h('div', { 'data-mounted-timeline': '', 'data-src': props.src }, loaded.value ? 'notes' : 'loading');
		},
	};
	const state = Vue.reactive({
		tab: 'local', withRenotes: true, withSensitive: true, onlyFiles: false,
		newNotesMotionEnabled: true, isPageView: false, deckActive: false,
		showFixedPostForm: true, isExternalTab: false, isHatadyTab: false, timelineSlideDirection: 1,
		timelineGlassBg: false, punchBusy: false, normalLtlVoteActive: false,
		nativeNavbarVisible: false, ltlEmojiVoteEffects: null, ltlEmojiVoteNavbarTarget: null,
		externalHost: null, externalToken: null,
		$style: {
			timelineEnterActive: 'enter', timelineLeaveActive: 'leave', timelineEnterFrom: 'from',
			timelineEnterTo: 'to', timelineLeaveFrom: 'to', timelineLeaveTo: 'from', timelineContainer: 'tl',
		},
		prepareTimelineLeave: () => {}, onTouchStart: () => {}, onTouchMove: () => {},
		onTouchEnd: () => {}, onTouchCancel: () => {},
	});
	const app = Vue.createApp({ setup: () => state, render: new Function('Vue', compiled.code)(Vue) });
	app.config.globalProperties.$style = state.$style;
	app.config.warnHandler = () => {};
	app.config.errorHandler = error => errors.push(String(error));
	app.component('MkPostForm', { render: () => Vue.h('textarea') });
	for (const name of ['MkStreamingNotesTimeline', 'MkExternalTimeline', 'MkTrendingTimeline', 'MkHatadyTimeline']) app.component(name, Timeline);
	const host = document.createElement('div');
	document.body.append(host);
	app.mount(host);
	try {
		for (let i = 0; i < 12; i++) {
			state.tab = ['local', 'following', 'social', 'mixed'][i % 4];
			await Vue.nextTick();
			await new Promise(resolve => setTimeout(resolve, 2));
		}
		state.tab = 'local';
		await new Promise(resolve => setTimeout(resolve, 1000));
		await Vue.nextTick();
		assert.deepEqual(errors, []);
		assert.ok(mounted > 1, 'keyed transitions finish');
		const wrapperEl = host.firstElementChild;
		const textarea = host.querySelector('textarea');
		assert.ok(textarea, 'the fixed composer is visible after repeated switches');
		assert.equal(host.querySelector('[data-mounted-timeline]')?.textContent, 'notes');
		assert.equal(host.querySelector('[data-mounted-timeline]')?.getAttribute('data-src'), 'local');
		textarea.value = 'unfinished draft';
		state.tab = 'hatady'; state.isHatadyTab = true;
		await new Promise(resolve => setTimeout(resolve, 500));
		await Vue.nextTick();
		assert.equal(host.querySelector('textarea'), textarea, 'Hatady keeps the fixed composer mounted');
		assert.equal(textarea.value, 'unfinished draft');
		assert.equal(textarea.closest('[inert]') != null, true, 'Hatady cannot focus the hidden note composer');
		state.tab = 'local'; state.isHatadyTab = false;
		await new Promise(resolve => setTimeout(resolve, 500));
		await Vue.nextTick();
		const mountedBeforeHide = mounted;
		for (const key of ['isPageView', 'deckActive']) {
			state[key] = true;
			await Vue.nextTick();
			assert.equal(wrapperEl.style.display, 'none', `${key} hides the timeline`);
			assert.equal(host.querySelector('textarea'), textarea);
			state[key] = false;
			await Vue.nextTick();
			assert.notEqual(wrapperEl.style.display, 'none', `${key} restores the timeline`);
			assert.equal(host.querySelector('textarea'), textarea);
			assert.equal(textarea.value, 'unfinished draft');
			assert.equal(mounted, mountedBeforeHide, `${key} does not remount the timeline`);
		}
	} finally {
		app.unmount();
		for (const timer of timers) clearTimeout(timer);
		host.remove();
	}
});
