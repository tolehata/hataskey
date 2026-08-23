<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady 1i): 本を追加 — 手入力。表紙はタイトルから自動生成し、色は手動で選べる。
  デザイン案 1i に準拠(左:表紙ライブプレビュー+色選択 / 右:タイトル・著者・総ページ・状態)。
  保存で hata/hatady/books/create に登録し、作成した本を done で返す。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="640"
	:initialHeight="520"
	:canResize="false"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-books"></i> {{ isEdit ? t('editBook') : t('addBook') }}</template>

	<div class="hatady-scope" :data-hatady-theme="theme" :class="$style.body">
		<div :class="$style.grid">
			<!-- 左: 表紙(自動生成 + 色選択) -->
			<div :class="$style.coverCol">
				<label :class="$style.label">{{ t('coverLabel') }} <span :class="$style.auto">{{ t('auto') }}</span></label>
				<div :class="$style.coverWrap">
					<HyBookCover :title="title || t('untitled')" :author="author || null" :width="103" :colorIndex="colorIndex" showTitle/>
				</div>
				<div :class="$style.coverHint">{{ t('coverHint') }}</div>
				<div :class="$style.swatches">
					<button
						v-for="(c, i) in swatchColors" :key="i"
						:class="[$style.swatch, colorIndex === i && $style.swatchOn]"
						:style="{ background: c }"
						@click="colorIndex = colorIndex === i ? null : i"
					></button>
				</div>
			</div>

			<!-- 右: フォーム -->
			<div :class="$style.formCol">
				<div :class="$style.field">
					<label :class="$style.label">{{ t('titleLabel') }}</label>
					<input v-model="title" :class="[$style.input, $style.serif]" :placeholder="t('titlePh')" autofocus>
				</div>
				<div :class="$style.field">
					<label :class="$style.label">{{ t('authorLabel') }} <span :class="$style.optional">({{ t('optional') }})</span></label>
					<input v-model="author" :class="$style.input" :placeholder="t('authorPh')">
				</div>
				<div :class="$style.row">
					<div :class="$style.field">
						<label :class="$style.label">{{ t('pagesLabel') }} <span :class="$style.optional">({{ t('optional') }})</span></label>
						<input v-model.number="totalPages" type="number" min="1" :class="$style.input" placeholder="260">
					</div>
					<!-- 状態は本の詳細モーダル側で指定するため、編集モードでは重複を避けて非表示。 -->
					<div v-if="!isEdit" :class="$style.field">
						<label :class="$style.label">{{ t('statusLabel') }}</label>
						<div :class="$style.selectWrap">
							<select v-model="status" :class="$style.select">
								<option value="reading">{{ t('status_reading') }}</option>
								<option value="finished">{{ t('status_finished') }}</option>
								<option value="tsundoku">{{ t('status_tsundoku') }}</option>
								<option value="want">{{ t('status_want') }}</option>
							</select>
							<i class="ti ti-chevron-down" :class="$style.selectIcon"></i>
						</div>
					</div>
				</div>
				<div :class="$style.genHint"><i class="ti ti-sparkles"></i> {{ t('genHint') }}</div>
			</div>
		</div>

		<div :class="$style.footer">
			<button :class="[$style.btn, $style.btnGhost]" :disabled="saving" @click="dialog?.close()">{{ t('cancel') }}</button>
			<button :class="[$style.btn, $style.btnPrimary]" :disabled="saving || !title.trim()" @click="submit"><i class="ti ti-check"></i> {{ isEdit ? t('updateBtn') : t('submit') }}</button>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import HyBookCover from '@/components/HyBookCover.vue';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { HY_COVER_SETS } from '@/utility/hatady.js';
import { hatadyTheme } from '@/utility/hatady-prefs.js';
import { useHataFormDraft } from '@/utility/hata-form-draft.js';

const props = defineProps<{ editBook?: any }>();
const emit = defineEmits<{ (ev: 'done', v: any): void; (ev: 'closed'): void }>();
const dialog = useTemplateRef('dialog');
const theme = hatadyTheme;
const copy = i18n.ts._hata._hatady._bookForm;

const isEdit = props.editBook != null;
const eb = props.editBook;

const title = ref(eb?.title ?? '');
const author = ref(eb?.author ?? '');
const totalPages = ref<number | null>(eb?.totalPages ?? null);
const status = ref<'reading' | 'finished' | 'want' | 'tsundoku'>(eb?.status ?? 'reading');
const colorIndex = ref<number | null>(eb?.coverColorIndex ?? null);
const saving = ref(false);
type BookDraft = { title: string; author: string; totalPages: number | null; status: 'reading' | 'finished' | 'want' | 'tsundoku'; colorIndex: number | null };
const { clearDraft } = useHataFormDraft<BookDraft>({
	id: `hatady:book:${isEdit ? `edit:${eb.id}` : 'create'}`,
	capture: () => ({ title: title.value, author: author.value, totalPages: totalPages.value, status: status.value, colorIndex: colorIndex.value }),
	restore: draft => {
		title.value = typeof draft.title === 'string' ? draft.title : '';
		author.value = typeof draft.author === 'string' ? draft.author : '';
		totalPages.value = typeof draft.totalPages === 'number' ? draft.totalPages : null;
		if (draft.status === 'reading' || draft.status === 'finished' || draft.status === 'want' || draft.status === 'tsundoku') status.value = draft.status;
		colorIndex.value = typeof draft.colorIndex === 'number' ? draft.colorIndex : null;
	},
	isMeaningful: draft => draft.title.trim().length > 0 || draft.author.trim().length > 0 || draft.totalPages != null || draft.colorIndex != null,
});

// 色見本は表紙グラデーションの濃色側を使う。
const swatchColors = HY_COVER_SETS.map(s => s[1]);

function t(key: string): string { return (copy as unknown as Record<string, string>)[key] ?? key; }

async function submit() {
	if (!title.value.trim()) return;
	saving.value = true;
	try {
		if (isEdit) {
			// 編集: 未指定でも null を明示送信して消せるように(update は nullable を扱う)。
			const payload = {
				bookId: eb.id,
				title: title.value.trim(),
				status: status.value,
				author: author.value.trim() || null,
				totalPages: (totalPages.value != null && (totalPages.value as unknown) !== '') ? Number(totalPages.value) : null,
				coverColorIndex: colorIndex.value,
			};
			const book = await misskeyApi('hata/hatady/books/update', payload);
			clearDraft();
			os.success();
			emit('done', book);
			dialog.value?.close();
			return;
		}
		// 任意項目は null を送らず省略(バックエンドの ajv が null を弾くため)。
		const payload = {
			title: title.value.trim(),
			status: status.value,
			author: author.value.trim() || undefined,
			totalPages: totalPages.value != null && (totalPages.value as unknown) !== '' ? Number(totalPages.value) : undefined,
			coverColorIndex: colorIndex.value ?? undefined,
		};
		const book = await misskeyApi('hata/hatady/books/create', payload);
		clearDraft();
		os.success();
		emit('done', book);
		dialog.value?.close();
	} finally {
		saving.value = false;
	}
}
</script>

<style lang="scss" module>
.body {
	padding: 0;
	display: flex;
	flex-direction: column;
	background: var(--hy-bg);
	color: var(--hy-body);
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
	min-height: 100%;
	box-sizing: border-box;
}
.grid {
	flex: 1;
	display: grid;
	grid-template-columns: 128px 1fr;
	gap: 20px;
	padding: 20px;
}
.label { display: block; font-family: var(--hy-heading); font-size: 12px; font-weight: 700; color: var(--hy-ink); margin-bottom: 7px; }
.auto { font-weight: 600; color: var(--hy-accent-ink); font-size: 11px; }
.optional { font-weight: 500; color: var(--hy-muted); font-size: 11px; }

/* 左: 表紙 */
.coverCol { display: flex; flex-direction: column; }
.coverWrap { display: flex; justify-content: center; }
.coverHint { font-size: 10.5px; color: var(--hy-muted); text-align: center; line-height: 1.5; margin-top: 8px; }
.swatches { display: flex; gap: 6px; justify-content: center; margin-top: 9px; flex-wrap: wrap; }
.swatch { width: 18px; height: 18px; border-radius: 4px; border: 2px solid var(--hy-surface); cursor: pointer; padding: 0; box-shadow: 0 0 0 1px var(--hy-border); }
.swatchOn { box-shadow: 0 0 0 2px var(--hy-accent); }

/* 右: フォーム */
.formCol { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.field { display: flex; flex-direction: column; min-width: 0; }
.row { display: flex; gap: 14px; }
.row .field { flex: 1; }
.input {
	background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 9px;
	padding: 10px 12px; font-size: 14px; color: var(--hy-ink); font-family: inherit; outline: none; width: 100%; box-sizing: border-box;
}
.input:focus { border-color: var(--hy-accent); }
.input::placeholder { color: var(--hy-muted); }
.serif { font-family: var(--hy-serif); font-weight: 600; }
.selectWrap { position: relative; }
.select {
	appearance: none; -webkit-appearance: none;
	background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 9px;
	padding: 10px 32px 10px 12px; font-size: 13.5px; color: var(--hy-ink); font-family: inherit; outline: none; width: 100%; box-sizing: border-box; cursor: pointer;
}
.select:focus { border-color: var(--hy-accent); }
.selectIcon { position: absolute; right: 11px; top: 50%; transform: translateY(-50%); font-size: 14px; color: var(--hy-muted); pointer-events: none; }
.genHint { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--hy-muted); line-height: 1.6; }
.genHint i { color: var(--hy-accent); }

/* フッター */
.footer {
	display: flex; align-items: center; gap: 10px;
	padding: 14px 20px; border-top: 1px solid var(--hy-border); background: var(--hy-surface-2);
}
.btn {
	display: inline-flex; align-items: center; gap: 6px;
	border-radius: 999px; padding: 9px 22px;
	font-weight: 700; font-family: var(--hy-heading); font-size: 14px;
	cursor: pointer; border: 1.5px solid transparent; transition: filter .15s, opacity .15s;
}
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btnGhost { margin-left: auto; background: transparent; color: var(--hy-body); border-color: transparent; }
.btnGhost:not(:disabled):hover { color: var(--hy-ink); }
.btnPrimary { background: linear-gradient(90deg, #e0955a, #d9824a); color: #fff; box-shadow: 0 3px 9px rgba(217,130,74,.4); }
.btnPrimary:not(:disabled):hover { filter: brightness(1.05); }
</style>
