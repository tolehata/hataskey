/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('post send delay UI wiring', () => {
	for (const component of ['src/components/MkPostForm.vue', 'src/components/MkPostFormSimple.vue']) {
		test(`${component} は既存の notes/create の直前で端末内カウントを行う`, () => {
			const vue = source(component);
			expect(vue).toContain('from \'@/utility/post-send-delay.js\'');
			expect(vue).toContain('await postDelay.begin(postSendDelaySeconds.value)');
			expect(vue).toContain(':class="$style.postDelayFrame"');
			expect(vue).toContain('取り消す');
			expect(vue).toContain('今すぐ投稿');
			expect(vue.indexOf('await postDelay.begin(postSendDelaySeconds.value)')).toBeLessThan(vue.lastIndexOf('misskeyApi(props.updateMode ? \'notes/update\' : \'notes/create\''));
		});
	}

	test('公開範囲別の枠色はカウント中に隠して二重枠にしない', () => {
		const vue = source('src/components/MkPostForm.vue');
		expect(vue).toContain('if (postDelay.active.value) return undefined;');
		expect(vue).toContain('boxShadow: `inset 0 0 0 ${w}px ${color}`');
		expect(vue).toContain('.postDelayFrame');
	});

	test('HataFeedベータ画面では3・5・10秒だけを選べ、任意秒数の入力欄を置かない', () => {
		const beta = source('src/pages/hatafeed-beta.vue');
		const utility = source('src/utility/hatafeed.ts');
		expect(beta).toContain('投稿前にカウントダウンする');
		expect(beta).toContain('v-for="seconds in POST_SEND_DELAY_PRESETS"');
		expect(beta).not.toContain('<MkInput');
		expect(beta).not.toContain('POST_SEND_DELAY_MIN_SECONDS');
		expect(beta).not.toContain('POST_SEND_DELAY_MAX_SECONDS');
		expect(utility).toContain('{ id: \'post-send-delay\', title: \'投稿前カウントダウン\' }');
		expect(utility).not.toContain('{ id: \'mute-reactions\', title:');
	});

	test('待機は端末ローカル設定で、設定の持ち運びにも2項目を含める', () => {
		const storage = source('src/local-storage.ts');
		const transfer = source('src/utility/hata-settings-transfer.ts');
		expect(storage).toContain('\'hataPostDelayEnabled\'');
		expect(storage).toContain('\'hataPostDelaySeconds\'');
		expect(transfer).toContain('localKeys: [\'hataPostDelayEnabled\', \'hataPostDelaySeconds\']');
	});
});
