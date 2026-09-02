/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

function frontendSource(path: string): string {
	return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function gardenMarkup(source: string): HTMLElement {
	const markup = source.match(/<!-- ========== GARDEN ========== -->([\s\S]*?)<!-- 旗鯖fork\(ハタキュ\): Eye/u)?.[1];
	if (!markup) throw new Error('Hatask garden template was not found');
	const fragment = window.document.createElement('template');
	fragment.innerHTML = markup;
	const garden = fragment.content.querySelector<HTMLElement>('.htk-garden-page');
	if (!garden) throw new Error('Hatask garden layout root was not found');
	return garden;
}

function expectGardenGroups(garden: HTMLElement): void {
	const groups = Array.from(garden.children);
	expect(groups.map(group => group.getAttribute('data-garden-group'))).toEqual(['personal', 'community']);
	const [personal, community] = groups;
	const headings = (group: Element) => Array.from(group.querySelectorAll('.htk-sec-title')).map(heading => heading.textContent.match(/\{\{copy\.(\w+)\}\}/u)?.[1]);
	expect(headings(personal)).toEqual(['currentFlower', 'flowerGallery']);
	expect(headings(community)).toEqual(['communityFlowerGallery', 'communityFlowerActivity']);
	expect(personal.firstElementChild?.classList.contains('hk-pin')).toBe(true);
	expect(personal.firstElementChild?.getAttribute('v-if')).toBe('isHatakyu');
	for (const group of groups) {
		expect(group.classList.contains('htk-garden-stack')).toBe(true);
		expect(group.getAttribute(':class')).toBe('isHatakyu?\'hk-panels\':undefined');
	}
}

describe('Hatask deck window layout contract', () => {
	test('PCのカレンダーは親の全列を使い、ハタキュToDoにも共通レイアウトを使う', () => {
		const source = frontendSource('src/pages/hatask.vue');
		expect(source).toContain('.htk-calendar-page > .htk-planner-shell{grid-column:1/-1;grid-row:1}');
		const todo = source.match(/<div v-if="activeTab==='todo'"[^>]+>/u)?.[0];
		expect(todo).toContain('class="htk-tabpage htk-todo-page"');
		const legacyGrid = /hk-panels|htk-panels/u;
		expect(legacyGrid.test('<div class="hk-panels">')).toBe(true);
		expect(legacyGrid.test(todo ?? '')).toBe(false);
	});

	test('モバイルタブは横切り捨てせず、ソートは既存の画面端補正メニューを使う', () => {
		const todo = frontendSource('src/components/hatask/HataskTodoPlanner.vue');
		const calendar = frontendSource('src/components/hatask/HataskCalendarPlanner.vue');
		expect(todo).toContain('v-if="reorderMode || isMobileTabActive(tab)"');
		expect(todo).toMatch(/\.mobileTabs\{[^}]*flex-wrap:wrap[^}]*border-radius:999px/u);
		expect(todo).toContain('await os.popupMenu(');
		expect(calendar).toContain('@container (max-width: 720px)');
		expect(calendar).toContain('.filters button[data-active="false"] .filterText { display: none; }');
	});

	test('きもち・ごはんは狭幅の従来配置を保ち、PCだけ見出しと入力を一体化する', () => {
		const journal = frontendSource('src/components/hatask/HataskJournal.vue');
		expect(journal).toMatch(/\.toolbar \{ display: flex;[^}]*flex-wrap: wrap;/u);
		expect(journal).toMatch(/\.tabs \{ display: flex;[^}]*overflow-x: auto;/u);
		expect(journal).toContain('@container (min-width: 760px)');
		expect(journal).toMatch(/@container \(min-width: 760px\) \{[\s\S]*?\.captureArea \{[^}]*background: var\(--surface\);[^}]*\}[\s\S]*?\.toolbar \{ display: grid; grid-template-columns: minmax\(96px, 1fr\) auto minmax\(96px, 1fr\); \}/u);
		expect(journal).toMatch(/@container \(min-width: 760px\) \{[\s\S]*?\.tabs \{[^}]*justify-self: center;/u);
	});

	test('Hataskだけ作業向けの初期寸法を使い、呼び出し側の明示寸法は上書きしない', () => {
		const osSource = frontendSource('src/os.ts');
		const windowSource = frontendSource('src/components/MkPageWindow.vue');
		expect(osSource).toContain('? { width: 760, height: 720 }');
		expect(osSource).toContain('initialWidth: options?.initialWidth ?? initialSize.width');
		expect(osSource).toContain('initialHeight: options?.initialHeight ?? initialSize.height');
		expect(windowSource).toContain(':initialWidth="initialWidth ?? 500"');
		expect(windowSource).toContain(':initialHeight="initialHeight ?? 500"');
	});

	test('小窓では標準ページ見出しを重ねず、Hatask自身の幅で一列化する', () => {
		const source = frontendSource('src/pages/hatask.vue');
		expect(source).toContain('<PageWithHeader :hideHeader="inPageWindow">');
		expect(source).toContain('container-name:hatask-root');
		expect(source).toMatch(/@container hatask-root \(max-width:900px\)\{[\s\S]*?\.htk-panels\{grid-template-columns:minmax\(0,1fr\)\}/u);
		expect(source).toMatch(/@container hatask-root \(max-width:640px\)\{[\s\S]*?\.htk-nav\.htk-nav-top\{overflow-x:auto/u);
	});

	test('クイック入力の選択パネルを枠内へ収め、開閉時に縦方向へ二重移動させない', () => {
		const pageSource = frontendSource('src/pages/hatask.vue');
		const captureSource = frontendSource('src/components/hatask/HataskQuickCapture.vue');
		expect(pageSource).toMatch(/\.htk-capture-detail\{box-sizing:border-box;width:min\(100%,760px\);min-width:0;margin:0 auto 14px;/u);
		expect(pageSource).toContain(':deep(.htk-capture-detail-enter-active),:deep(.htk-capture-detail-leave-active){transition:opacity .16s ease}');
		expect(pageSource).toContain(':deep(.htk-capture-detail-enter-from),:deep(.htk-capture-detail-leave-to){opacity:0}');
		expect(pageSource).not.toContain('transform:translateY(-8px) scale(.985)');
		expect(captureSource).toContain('transition: opacity .16s ease;');
		expect(captureSource).not.toContain('transform: translateY(-5px) scale(.985);');
	});

	test('カレンダーの詳細予定カードを隣のカレンダー高へ引き伸ばさない', () => {
		const source = frontendSource('src/pages/hatask.vue');
		expect(source).toContain('class="htk-tabpage htk-calendar-page"');
		expect(source).toContain('.htk-calendar-page{align-items:start}');
	});

	test('カレンダー詳細はドラフトを残したまま閉じられるモーダルで表示する', () => {
		const source = frontendSource('src/pages/hatask.vue');
		expect(source).toMatch(/<Teleport to="body">\s*<div\s+v-if="showEventDetails"[\s\S]*?class="htk-lg htk-modal-c htk-event-editor htk-event-editor-modal"/u);
		expect(source).toContain('role="dialog"');
		expect(source).toContain('aria-modal="true"');
		expect(source).toContain('@click.self="closeEventDetailsModal"');
		expect(source).toContain('@keydown.esc.stop.prevent="closeEventDetailsModal"');
		const closeHandler = source.match(/function closeEventDetailsModal\(\): void \{([\s\S]*?)\n\}\s*function clockPlusMinutes/u)?.[1];
		expect(closeHandler).toContain('showEventDetails.value = false');
		expect(closeHandler).not.toContain('newEvent.value=');
		expect(closeHandler).not.toContain('editingEvent.value=');
		expect(closeHandler).not.toContain('resetEventEditor');
		expect(source).toContain('max-height:min(88dvh,780px)');
	});

	test('PCのハタキュToDoだけ入力と残件表示を横に並べる', () => {
		const source = frontendSource('src/pages/hatask.vue');
		expect(source).toContain('<div class="htk-todo-capture-row">');
		expect(source).toContain('htk-capture-companion-desktop');
		expect(source).toContain('htk-capture-companion-mobile');
		expect(source).toMatch(/@container hatask-root \(min-width:901px\)\{[\s\S]*?\.htk-root\[data-theme="hatakyu"\] \.htk-todo-capture-row\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(190px,260px\)/u);
		expect(source).toContain('.htk-root[data-theme="hatakyu"] .htk-capture-companion-mobile{display:none}');
		expect(source).toContain('.htk-capture-companion-desktop{display:none}');
	});

	test('ハタキュのお庭でも並び替えと花カードの間隔を保つ', () => {
		const source = frontendSource('src/pages/hatask.vue');
		expect(source).toMatch(/\.htk-root\[data-theme="hatakyu"\] \.htk-gal-sort\{margin-bottom:12px\}/u);
	});

	test('ハタキュのお庭は左右独立で積み、みんなのお花情報をギャラリー直下に置く', () => {
		const source = frontendSource('src/pages/hatask.vue');
		expectGardenGroups(gardenMarkup(source));
		const stackRule = source.match(/\.htk-root\[data-theme="hatakyu"\] \.htk-garden-page > \.htk-garden-stack\{([^}]+)\}/u)?.[1];
		expect(stackRule).toContain('display:grid');
		expect(stackRule).toContain('grid-template-columns:minmax(0,1fr)');
		expect(stackRule).toContain('align-content:start');
		expect(stackRule).toContain('align-items:start');
		expect(stackRule).toContain('min-width:0');
		// 入れ子のhk-panelsの直下に従来のカードを残し、紙・画鋲・揺れの既存セレクタを使う。
		expect(source).toContain('.htk-root[data-theme="hatakyu"] .hk-panels > .htk-lg::after');
		expect(source).toContain('.htk-root[data-theme="hatakyu"][data-anim="on"] .hk-panels > .htk-lg');
	});

	test('お庭の他テーマは従来の4枚グリッドを保ち、小窓では同じ読み順の一列になる', () => {
		const source = frontendSource('src/pages/hatask.vue');
		const garden = gardenMarkup(source);
		expect(garden.getAttribute(':class')).toContain('isHatakyu?\'hk-panels\':\'htk-panels\'');
		expect(source).toContain('.htk-garden-stack{display:contents}');
		expect(source).toMatch(/@container hatask-root \(max-width:900px\)\{[^}]*\}[\s\S]*?\.hk-panels\{ grid-template-columns:minmax\(0,1fr\) \}/u);
		const cards = Array.from(garden.querySelectorAll('.htk-garden-stack > .htk-lg'));
		expect(cards).toHaveLength(4);
		expect(cards.map(card => card.querySelector('.htk-sec-title')?.textContent.match(/\{\{copy\.(\w+)\}\}/u)?.[1])).toEqual(['currentFlower', 'flowerGallery', 'communityFlowerGallery', 'communityFlowerActivity']);
		// グループの移動だけで、取得失敗時の再試行や開花・公開範囲の操作を失わない。
		const clickHandlers = Array.from(garden.querySelectorAll('button')).map(button => button.getAttribute('@click'));
		expect(clickHandlers).toContain('harvestFlower');
		expect(clickHandlers).toContain('updateFlowerVisibility(option.value)');
		expect(clickHandlers.filter(handler => handler === 'loadCommunityFlowers')).toHaveLength(2);
	});

	test('お花情報が個人側へ混ざる回帰を陽性対照で検出する', () => {
		const garden = gardenMarkup(frontendSource('src/pages/hatask.vue'));
		expectGardenGroups(garden);
		const personal = garden.querySelector('[data-garden-group="personal"]');
		const community = garden.querySelector('[data-garden-group="community"]');
		const activity = community?.lastElementChild;
		if (!personal || !activity) throw new Error('Garden positive control target was not found');
		personal.append(activity);
		expect(() => expectGardenGroups(garden)).toThrow();
	});
});
