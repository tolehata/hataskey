<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady): 分野(subject)の管理モーダル。
  分野の一覧表示・色指定(プリセット＋カスタム)・削除(別分野への付け替え)・追加を行う。
  色は本人のクライアント内でのみ反映される個人設定。
  PC/タブレット/スマホを問わず見やすいよう、1列リスト＋折り返しで構成し、既存の Hatady テーマに調和させる。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="560"
	:initialHeight="640"
	:canResize="true"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-palette"></i> {{ t('title') }}</template>

	<div class="hatady-scope" :data-hatady-theme="theme" :class="$style.body">
		<div :class="$style.intro"><i class="ti ti-info-circle"></i> {{ t('intro') }}</div>

		<!-- 追加 -->
		<div :class="$style.addRow">
			<input v-model="newName" :class="$style.addInput" :placeholder="t('addPh')" :maxlength="128" @keydown.enter="addSubject">
			<button :class="$style.addBtn" :disabled="!canAdd || busy" @click="addSubject"><i class="ti ti-plus"></i> {{ t('add') }}</button>
		</div>

		<div v-if="loading" :class="$style.loading">{{ t('loading') }}</div>
		<div v-else-if="subjects.length === 0" :class="$style.empty">{{ t('empty') }}</div>
		<div v-else :class="$style.list">
			<div v-for="s in subjects" :key="s.name" :class="$style.item">
				<div :class="$style.itemMain">
					<span :class="$style.swatch" :style="{ background: pal(s.name).accent }"></span>
					<div :class="$style.itemInfo">
						<div :class="$style.itemName">{{ s.name }}</div>
						<div :class="$style.itemMeta">{{ s.logCount }}{{ t('count') }}<span v-if="s.color" :class="$style.customTag"><i class="ti ti-brush"></i> {{ t('custom') }}</span></div>
					</div>
					<button :class="[$style.iconBtn, editingName === s.name && $style.iconBtnOn]" :title="t('color')" @click="toggleEdit(s)"><i class="ti ti-palette"></i></button>
					<button :class="[$style.iconBtn, $style.danger]" :title="t('delete')" :disabled="busy" @click="removeSubject(s)"><i class="ti ti-trash"></i></button>
				</div>
				<!-- 色エディタ(1つずつ展開) -->
				<div v-if="editingName === s.name" :class="$style.editor">
					<div :class="$style.swatchRow">
						<button
							v-for="c in PRESET_COLORS" :key="c"
							:class="[$style.presetSwatch, (editColor || '').toLowerCase() === c && $style.presetOn]"
							:style="{ background: c }"
							:title="c"
							@click="editColor = c"
						></button>
					</div>
					<div :class="$style.editorRow">
						<MkColorInput v-model="editColor" :class="$style.colorInput"/>
						<span :class="$style.editorSpacer"></span>
						<button :class="$style.textBtn" :disabled="busy" @click="resetColor(s)"><i class="ti ti-restore"></i> {{ t('auto') }}</button>
						<button :class="$style.saveBtn" :disabled="busy || !editColor" @click="applyColor(s)"><i class="ti ti-check"></i> {{ t('save') }}</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { ref, computed, useTemplateRef, onMounted } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import MkColorInput from '@/components/MkColorInput.vue';
import * as os from '@/os.js';
import { hySubjectPalette } from '@/utility/hatady.js';
import { hySubjects, loadHySubjects, saveHySubject, deleteHySubject, type HySubjectRow } from '@/utility/hatady-subjects.js';
import { hatadyTheme, hatadyLang } from '@/utility/hatady-prefs.js';

const emit = defineEmits<{ (ev: 'changed'): void; (ev: 'closed'): void }>();
const dialog = useTemplateRef('dialog');
const theme = hatadyTheme;
const lang = hatadyLang;

const subjects = hySubjects;
const loading = ref(true);
const busy = ref(false);
const newName = ref('');
const editingName = ref<string | null>(null);
const editColor = ref<string>('#517f4f');

// プリセット配色(Hatady の分野パレットに調和した色群)。
const PRESET_COLORS = ['#517f4f', '#bd6a3d', '#45688f', '#8a5a91', '#a97e2e', '#3f8a8a', '#c0563a', '#d9a441', '#6b8e5a', '#7a5ad0'];

const canAdd = computed(() => {
	const n = newName.value.trim();
	return n.length > 0 && !subjects.value.some(s => s.name === n);
});

function pal(name: string) { return hySubjectPalette(name); }

const DICT: Record<string, { ja: string; en: string }> = {
	title: { ja: '分野の管理', en: 'Manage subjects' },
	intro: { ja: '分野ごとに色を指定したり、不要な分野を削除できます。色はあなたの画面にのみ反映されます。', en: 'Set a color per subject or delete unused ones. Colors apply only to your own view.' },
	addPh: { ja: '新しい分野を追加', en: 'Add a new subject' },
	add: { ja: '追加', en: 'Add' },
	loading: { ja: '読み込み中…', en: 'Loading…' },
	empty: { ja: '分野がありません。学習を記録するか、上から追加してください。', en: 'No subjects yet. Record a study or add one above.' },
	count: { ja: '件', en: '' },
	custom: { ja: '色指定', en: 'custom' },
	color: { ja: '色を指定', en: 'Set color' },
	delete: { ja: '削除', en: 'Delete' },
	auto: { ja: '自動に戻す', en: 'Auto' },
	save: { ja: '保存', en: 'Save' },
};
function t(key: string): string { return DICT[key]?.[lang.value === 'en' ? 'en' : 'ja'] ?? key; }
function en(): boolean { return lang.value === 'en'; }

async function addSubject() {
	const n = newName.value.trim();
	if (!n || !canAdd.value || busy.value) return;
	busy.value = true;
	try {
		await saveHySubject(n, null);
		newName.value = '';
		emit('changed');
	} finally {
		busy.value = false;
	}
}

function toggleEdit(s: HySubjectRow) {
	if (editingName.value === s.name) { editingName.value = null; return; }
	editingName.value = s.name;
	// 既存の指定色があればそれを、無ければ現在の自動色を初期値にする。
	editColor.value = s.color ?? pal(s.name).accent;
}

async function applyColor(s: HySubjectRow) {
	if (!editColor.value || busy.value) return;
	busy.value = true;
	try {
		await saveHySubject(s.name, editColor.value);
		editingName.value = null;
		emit('changed');
	} finally {
		busy.value = false;
	}
}

async function resetColor(s: HySubjectRow) {
	if (busy.value) return;
	busy.value = true;
	try {
		await saveHySubject(s.name, null);
		editingName.value = null;
		emit('changed');
	} finally {
		busy.value = false;
	}
}

async function removeSubject(s: HySubjectRow) {
	if (busy.value) return;
	const others = subjects.value.filter(x => x.name !== s.name);
	let reassignTo: string | null = null;

	if (s.logCount > 0 && others.length > 0) {
		// 付け替え先を選ばせる(この分野が付いたログを別分野へ移す)。
		const sel = await os.select({
			title: en() ? `Delete "${s.name}"` : `「${s.name}」を削除`,
			text: en()
				? `${s.logCount} log(s) use this subject. Choose a subject to reassign them to.`
				: `この分野の学習記録が ${s.logCount} 件あります。付け替え先の分野を選んでください。`,
			items: others.map(x => ({ value: x.name, label: `${x.name}${x.logCount > 0 ? `（${x.logCount}${t('count')}）` : ''}` })),
		});
		if (sel.canceled || sel.result == null) return;
		reassignTo = String(sel.result);
	} else {
		// 付け替え先が無い or ログ0件 → 確認のみ(ログはそのまま残り、色は自動に戻る)。
		const c = await os.confirm({
			type: 'warning',
			title: en() ? `Delete "${s.name}"` : `「${s.name}」を削除`,
			text: s.logCount > 0
				? (en() ? `${s.logCount} log(s) keep this subject name; only the color setting is removed.` : `この分野の学習記録 ${s.logCount} 件はそのまま残り、色指定のみ解除されます。`)
				: (en() ? 'Delete this subject?' : 'この分野を削除しますか？'),
		});
		if (c.canceled) return;
	}

	busy.value = true;
	try {
		const r = await deleteHySubject(s.name, reassignTo);
		if (reassignTo != null) {
			os.success();
		}
		if (editingName.value === s.name) editingName.value = null;
		emit('changed');
	} finally {
		busy.value = false;
	}
}

onMounted(async () => {
	loading.value = true;
	try {
		await loadHySubjects();
	} finally {
		loading.value = false;
	}
});
</script>

<style lang="scss" module>
.body {
	padding: 18px 20px 22px;
	background: var(--hy-bg);
	color: var(--hy-body);
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
	min-height: 100%;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	gap: 14px;
}
.intro {
	display: flex;
	gap: 8px;
	font-size: 12px;
	line-height: 1.6;
	color: var(--hy-muted);
	background: var(--hy-surface);
	border: 1px solid var(--hy-border);
	border-radius: 10px;
	padding: 10px 12px;
}
.intro > i { flex-shrink: 0; color: var(--hy-accent); margin-top: 1px; }

.addRow { display: flex; gap: 8px; }
.addInput {
	flex: 1; min-width: 0;
	background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 10px;
	padding: 10px 13px; font-size: 14px; color: var(--hy-ink); font-family: inherit; outline: none;
}
.addInput:focus { border-color: var(--hy-accent); }
.addBtn {
	flex: 0 0 auto; display: inline-flex; align-items: center; gap: 5px;
	background: var(--hy-accent); color: #fff; border: none; border-radius: 999px;
	padding: 9px 18px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: var(--hy-heading);
}
.addBtn:disabled { opacity: .45; cursor: not-allowed; }

.loading, .empty { font-size: 13px; color: var(--hy-muted); text-align: center; padding: 24px 0; }

.list { display: flex; flex-direction: column; gap: 8px; }
.item {
	background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 12px;
	padding: 11px 13px; display: flex; flex-direction: column; gap: 10px;
}
.itemMain { display: flex; align-items: center; gap: 11px; }
.swatch {
	flex: 0 0 auto; width: 26px; height: 26px; border-radius: 8px;
	box-shadow: 0 0 0 1px var(--hy-border), inset 0 1px 2px rgba(255,255,255,.3);
}
.itemInfo { flex: 1; min-width: 0; }
.itemName { font-family: var(--hy-heading); font-weight: 700; font-size: 14px; color: var(--hy-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.itemMeta { display: flex; align-items: center; gap: 8px; margin-top: 2px; font-size: 11px; color: var(--hy-muted); }
.customTag { display: inline-flex; align-items: center; gap: 3px; color: var(--hy-accent-ink); font-weight: 700; }
.iconBtn {
	flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
	width: 34px; height: 34px; border-radius: 9px;
	background: var(--hy-bg); border: 1px solid var(--hy-border); color: var(--hy-body);
	cursor: pointer; font-size: 16px;
}
.iconBtn:hover:not(:disabled) { border-color: var(--hy-accent); color: var(--hy-accent); }
.iconBtn:disabled { opacity: .5; cursor: not-allowed; }
.iconBtnOn { border-color: var(--hy-accent); color: var(--hy-accent); background: var(--hy-chip-bg); }
.danger:hover:not(:disabled) { border-color: #c0563a; color: #c0563a; }

/* 色エディタ */
.editor { display: flex; flex-direction: column; gap: 10px; padding-top: 2px; border-top: 1px dashed var(--hy-border); }
.swatchRow { display: flex; flex-wrap: wrap; gap: 7px; padding-top: 8px; }
.presetSwatch {
	width: 26px; height: 26px; border-radius: 999px; cursor: pointer; padding: 0;
	border: 2px solid var(--hy-surface); box-shadow: 0 0 0 1px var(--hy-border);
}
.presetOn { box-shadow: 0 0 0 2px var(--hy-ink); }
.editorRow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.colorInput { flex: 1 1 160px; min-width: 140px; }
.editorSpacer { flex: 1; }
.textBtn {
	display: inline-flex; align-items: center; gap: 4px;
	background: var(--hy-bg); border: 1px solid var(--hy-border); border-radius: 999px;
	padding: 7px 14px; font-size: 12px; font-weight: 700; color: var(--hy-body); cursor: pointer; font-family: var(--hy-heading);
}
.textBtn:disabled { opacity: .5; cursor: not-allowed; }
.saveBtn {
	display: inline-flex; align-items: center; gap: 4px;
	background: var(--hy-accent); color: #fff; border: none; border-radius: 999px;
	padding: 7px 16px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: var(--hy-heading);
}
.saveBtn:disabled { opacity: .5; cursor: not-allowed; }

@media (max-width: 500px) {
	.body { padding: 14px 14px 18px; }
	.colorInput { flex-basis: 100%; }
	.editorSpacer { display: none; }
}
</style>
