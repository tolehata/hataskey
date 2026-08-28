/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 旗鯖fork: ポップアップを開くだけの項目が、右ペインまで遷移させないことを見張る。
 *
 * ⚠️MkA は自前で `@click.prevent="nav"` を持ち、nav() が router.pushByPath(to) を
 *   必ず走らせる。親側に `@click.prevent` を書いても、それはリンクの既定動作を
 *   止めるだけで MkA 自身の処理は止まらない。両方が同じ要素に乗るため、
 *   ポップアップ項目を MkA で描くと「ポップアップが開くのに右ペインが
 *   /settings/hata-custom (Hataskey UI 設定) へ飛ぶ」ことになる。
 *   これは実際に起きた不具合なので、描き方が MkA へ戻ったら落とす。
 */

import { describe, expect, test, vi } from 'vitest';
vi.mock('@/i18n.js', async () => {
	const fs = await import('node:fs');
	const path = await import('node:path');
	const yaml = await import('js-yaml');
	const { I18n } = await import('@@/js/i18n.js');
	const locale = yaml.load(fs.readFileSync(path.resolve(process.cwd(), '../../locales/ja-JP.yml'), 'utf8'));
	return { i18n: new I18n(locale as any) };
});
import shellSource from './index.vue?raw';
import { settingsDestinations } from './settings-destinations.js';
import mkaSource from '@/components/global/MkA.vue?raw';

describe('settings redesign popup navigation', () => {
	test('MkAは自前でrouter遷移する（この前提が崩れたら本テストの理由が消える）', () => {
		// ⚠️陽性対照。MkA が遷移しなくなったなら、この見張り自体を見直すこと。
		expect(mkaSource).toContain('router.pushByPath(props.to');
		expect(mkaSource).toContain('@click.prevent="nav"');
	});

	test('ポップアップを開く項目は左ペインでbutton、それ以外はMkAで描く', () => {
		// 描画箇所は2つ（常時表示のクイック項目 / タブレット幅）。
		// ⚠️通常幅の左ペインは大分類だけを持つようになり、項目を描かない。
		const rendered = shellSource.match(/:is="opensSettingsPopup\(item\) \? 'button' : 'MkA'"/gu) ?? [];
		expect(rendered).toHaveLength(2);

		// ⚠️ボタンには to を渡さない。属性として出てしまうため。
		expect(shellSource).toContain('return opensSettingsPopup(item) ? { type: \'button\' as const } : { to: item.route };');
		expect(shellSource).toContain('return item.activation?.kind === \'popup\';');
	});

	test('右ペインの兄弟タブは常にbuttonで、MkAを混ぜない', () => {
		// ⚠️兄弟タブにはポップアップを開くだけの項目も並ぶ。MkA で描くと
		//   同じ不具合（ポップアップが開くのに右ペインも遷移する）が戻る。
		const start = shellSource.indexOf('<nav');
		const tabsStart = shellSource.indexOf(':class="$style.siblingTabs"');
		const tabsEnd = shellSource.indexOf('</nav>', tabsStart);
		expect(start).toBeGreaterThan(-1);
		expect(tabsStart).toBeGreaterThan(-1);
		const tabs = shellSource.slice(tabsStart, tabsEnd);
		expect(tabs).toContain('v-for="item in siblingTabs"');
		expect(tabs).toContain('type="button"');
		expect(tabs).not.toContain('MkA');
		expect(tabs).not.toContain(':to=');
		expect(tabs).toContain('@click="goToSetting(item)"');
	});

	test('左ペインの項目描画に、to付きの素のMkAが残っていない', () => {
		// ⚠️`:to="item.route"` を持つ v-for の MkA が復活したら、この不具合が戻る。
		const offenders = shellSource.match(/<MkA v-for="item in [^"]+"[^>]*:to="item\.route"/gu) ?? [];
		expect(offenders).toHaveLength(0);
	});

	test('ポップアップで開く行き先が実際に存在する', () => {
		const popups = settingsDestinations.filter(item => item.activation?.kind === 'popup');
		// 現状: Hatask / Hatady / 天気・地震 / マスコット / UIセットアップ / 設定の引っ越し
		expect(popups.length).toBeGreaterThanOrEqual(6);
		// ⚠️ポップアップ項目の route は共有の /settings/hata-custom なので、
		//   route だけで遷移先を決めてはいけない。
		expect(popups.every(item => item.route === '/settings/hata-custom')).toBe(true);
	});
});
