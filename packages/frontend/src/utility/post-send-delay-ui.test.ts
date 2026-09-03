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
			expect(vue).not.toContain('postDelayFrame');
			expect(vue).not.toContain('postDelay.frameStyle.value');
			expect(vue).toContain(':cancelLabel="i18n.ts._hata._postDelay.cancel"');
			expect(vue).toContain(':sendNowLabel="i18n.ts._hata._postDelay.sendNow"');
			expect(vue).toContain('<MkHataPostDelayStatus v-if="postDelay.active.value" compact');
			expect(vue.indexOf('await postDelay.begin(postSendDelaySeconds.value)')).toBeLessThan(vue.indexOf('const request: Promise<Misskey.entities.Note | null>'));
		});
	}

	test('公開範囲別の枠色と周回枠はカウント中に描画せず、操作ロックだけを維持する', () => {
		const vue = source('src/components/MkPostForm.vue');
		expect(vue).toContain('if (postDelay.active.value) return undefined;');
		expect(vue).toContain('boxShadow: `inset 0 0 0 ${w}px ${color}`');
		expect(vue).not.toContain('.postDelayFrame');
		expect(vue).toContain('.postDelayActive > :not(.postDelayStatus)');
	});

	test('通常投稿フォームの待機操作は中央に収め、送信ボタンの外寸を固定する', () => {
		const status = source('src/components/MkHataPostDelayStatus.vue');
		const submitVisual = source('src/components/MkHataPostSubmitVisual.vue');
		for (const component of ['src/components/MkPostForm.vue', 'src/components/MkPostFormSimple.vue']) {
			const vue = source(component);
			expect(vue).toMatch(/\.postDelayStatus\s*\{[^}]*left:\s*50%;[^}]*width:\s*min\(330px,/s);
			expect(vue).toMatch(/\.postDelayStatus\s*\{[^}]*box-sizing:\s*border-box;[^}]*overflow:\s*hidden;/s);
			expect(vue).toMatch(/\.postDelayStatus\s*\{[^}]*--hata-delay-base-transform:\s*translateX\(-50%\);[^}]*transform:\s*var\(--hata-delay-base-transform\);/s);
			expect(vue).toMatch(/\.submitInner\s*\{[^}]*width:\s*90px;[^}]*min-width:\s*90px;/s);
			expect(vue).toMatch(/\.submitInner, \.submitInnerMenu\s*\{[^}]*display:\s*flex;[^}]*height:\s*34px;[^}]*align-items:\s*center;[^}]*line-height:\s*1;/s);
		}
		expect(status).toContain(".root[data-compact='true']");
		expect(status).not.toContain(".root[data-compact='true']{display:grid;width:100%");
		expect(status).toMatch(/\.cancel,.sendNow\{[^}]*width:auto;[^}]*min-width:0;/);
		expect(status).toContain('data-send-status-count');
		expect(status).toMatch(/\.phrase\{[^}]*align-items:center;[^}]*line-height:1\.35;/);
		expect(status).toMatch(/\.digit\{[^}]*height:100%;[^}]*place-items:center;[^}]*line-height:1/);
		expect(submitVisual).toContain('data-send-count');
		expect(submitVisual).toMatch(/\.root:not\(\.iconOnly\)\{width:100%;min-width:0;max-width:100%\}/);
		expect(submitVisual).toMatch(/\.root\[data-state='countdown'\] \.state\{gap:4px\}/);
		expect(submitVisual).toMatch(/\.root\[data-state='countdown'\] \.label\{[^}]*font-size:\.78em;[^}]*text-overflow:clip/);
		expect(submitVisual).toMatch(/\.countdown\{[^}]*width:1\.6em;[^}]*flex:0 0 1\.6em/);
		expect(submitVisual).toContain(":key=\"countdownSeconds\"");
		expect(status).toContain('.hata-delay-status-complete-leave-to');
		expect(status).toContain('translateY(-14px)');
		expect(status).toContain('.hata-delay-status-cancel-leave-to');
	});

	test('通常投稿ダイアログだけ待機カプセルをフォーム直下へ出す', () => {
		const dialog = source('src/components/MkPostFormDialog.vue');
		const form = source('src/components/MkPostForm.vue');
		expect(dialog).toContain(':postDelayStatusTarget="postDelayStatusTarget"');
		expect(dialog).toMatch(/<MkPostForm[\s\S]*?\/>\s*<div ref="postDelayStatusTarget"/u);
		expect(form).toContain('<Teleport :to="props.postDelayStatusTarget ?? \'body\'" :disabled="props.postDelayStatusTarget == null">');
		expect(form).toMatch(/\.postDelayStatusExternal\s*\{[^}]*position:\s*relative;[^}]*left:\s*auto;[^}]*bottom:\s*auto;[^}]*--hata-delay-base-transform:\s*none;/su);
	});

	test('各投稿UIは通常投稿の上部トーストだけを省き、文脈付き通知と成功表示を保つ', () => {
		for (const component of ['src/components/MkPostForm.vue', 'src/components/MkPostFormSimple.vue']) {
			const vue = source(component);
			expect(vue).not.toContain('os.toast(i18n.ts.posted, \'posted\')');
			expect(vue).toContain('if (replyTargetNote.value) os.toast(i18n.ts.replied, \'reply\');');
			expect(vue).toContain('else if (renoteTargetNote.value) os.toast(i18n.ts.quoted, \'quote\');');
			expect(vue).toContain('else if (props.updateMode) os.toast(i18n.ts.noteEdited, \'edited\');');
			expect(vue).toContain('submitMotionState.value = \'success\';');
		}
		const cord = source('src/pages/hatacording-ui.vue');
		expect(cord).not.toContain('copy.posted, \'posted\'');
		expect(cord).toContain('if (composerContext.value?.kind === \'reply\') os.toast(copy.replied, \'reply\');');
		expect(cord).toContain('else if (composerContext.value?.kind === \'quote\') os.toast(copy.quoted, \'quote\');');
		expect(cord).toContain('submitMotionState.value = \'success\';');
	});

	test('HataSNSCordUIは待機中にプレビューを畳み、周回枠を描画しない', () => {
		const page = source('src/pages/hatacording-ui.vue');
		expect(page).toContain("v-if=\"draftText.trim().length > 0 && submitMotionState === 'idle'\"");
		expect(page).toContain(':name="animationEnabled ? \'hatacording-composer-preview\' : \'\'"');
		// ⚠️公開範囲の色枠は廃止した（hatacording-ui-source.test.ts が正本）。
		expect(page).toContain('<div :class="$style.postFormPill">');
		expect(page).not.toContain('$style.delayActive');
		expect(page).not.toContain('postDelay.frameStyle.value');
		expect(page).not.toContain('.delayActive::before');
		expect(page).toContain('`hata-delay-status-${postDelay.exitMode.value}`');
	});

	test('HataFeedベータ画面では3・5・10秒だけを選べ、任意秒数の入力欄を置かない', () => {
		const beta = source('src/pages/hatafeed-beta.vue');
		const utility = source('src/utility/hatafeed.ts');
		expect(beta).toContain('{{ copy.enableCountdown }}');
		expect(beta).toContain('{{ copy.countdownDescription }}');
		expect(beta).toContain('v-for="seconds in POST_SEND_DELAY_PRESETS"');
		expect(beta).not.toContain('<MkInput');
		expect(beta).not.toContain('POST_SEND_DELAY_MIN_SECONDS');
		expect(beta).not.toContain('POST_SEND_DELAY_MAX_SECONDS');
		expect(utility).toContain("{ id: 'post-send-delay', title: copy.postCountdown }");
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
