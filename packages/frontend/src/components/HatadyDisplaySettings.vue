<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady 1l): 表示設定ウィンドウ。テーマ(やわらかい紙/夜の書斎/hataskey準拠)と
  言語(日本語/English/端末に合わせる)を独立して選ぶ(要件④)。
  変更はウィンドウ内でライブプレビューし、「保存」でサーバー(アカウントレジストリ)へ確定保存して
  全端末で同期する(要件③)。1k の端末間同期の状態(ロールポリシー)も併せて表示する。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="440"
	:initialHeight="640"
	:canResize="true"
	:beforeClose="confirmClose"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-palette"></i> {{ t('title') }}</template>

	<div class="hatady-scope" :data-hatady-theme="editTheme" :class="$style.body">
		<!-- テーマ -->
		<div :class="$style.section">
			<div :class="$style.label"><i class="ti ti-brush"></i> {{ t('theme') }}</div>
			<div :class="$style.themeGrid">
				<button v-for="opt in themeOptions" :key="opt.value" :class="[$style.themeCard, editTheme === opt.value && $style.themeCardOn]" @click="editTheme = opt.value">
					<span :class="$style.themeSwatchWrap" :style="{ background: opt.preview }"><span :class="$style.themeSwatch" :style="{ background: opt.swatch }"></span></span>
					<span :class="$style.themeName">{{ t(opt.labelKey) }} <i v-if="editTheme === opt.value" class="ti ti-check" :class="$style.themeCheck"></i></span>
				</button>
			</div>
			<div :class="$style.hint">{{ t('independentHint') }}</div>
		</div>

		<!-- 言語 -->
		<div :class="$style.section">
			<div :class="$style.label"><i class="ti ti-language"></i> {{ t('language') }}</div>
			<div :class="$style.langList">
				<button v-for="opt in langOptions" :key="opt.value" :class="[$style.langItem, editLang === opt.value && $style.langItemOn]" @click="editLang = opt.value">
					<i v-if="opt.icon" :class="['ti', opt.icon, $style.langIcon]"></i>
					<span :class="$style.langName">{{ opt.labelKey ? t(opt.labelKey) : opt.label }}</span>
					<i :class="['ti', editLang === opt.value ? 'ti-circle-check-filled' : 'ti-circle', $style.langRadio]"></i>
				</button>
			</div>
		</div>

		<!-- 端末間の同期(1k・ロールポリシーで可否) -->
		<div :class="$style.section">
			<div :class="$style.label">
				<i :class="canSync ? 'ti ti-refresh' : 'ti ti-refresh-off'"></i> {{ t('sync') }}
				<span :class="[$style.syncBadge, canSync ? $style.syncBadgeOn : $style.syncBadgeOff]">
					<i :class="canSync ? 'ti ti-cloud-check' : 'ti ti-refresh-off'"></i> {{ canSync ? t('syncEnabled') : t('syncDisabled') }}
				</span>
			</div>
			<template v-if="canSync">
				<div :class="$style.syncMaster">
					<i class="ti ti-cloud" :class="$style.syncMasterIcon"></i>
					<div :class="$style.syncMasterText">
						<div :class="$style.syncMasterTitle">{{ t('syncThisDevice') }}</div>
						<div :class="$style.syncMasterSub">{{ t('syncShareAll') }}</div>
					</div>
					<i class="ti ti-circle-check-filled" :class="$style.syncMasterState"></i>
				</div>
				<div :class="$style.syncItems">
					<div v-for="it in syncItems" :key="it.key" :class="$style.syncItem">
						<i :class="['ti', it.icon]" :style="{ color: it.color }"></i>
						<span :class="$style.syncItemName">{{ t(it.key) }}</span>
						<i class="ti ti-cloud-check" :class="$style.syncItemCheck"></i>
					</div>
				</div>
			</template>
			<div v-else :class="$style.syncBlocked">
				<i class="ti ti-shield-lock" :class="$style.syncBlockedIcon"></i>
				<div>
					<b>{{ t('syncBlockedTitle') }}</b>
					<div :class="$style.syncBlockedSub">{{ t('syncBlockedSub') }}</div>
				</div>
			</div>
		</div>

		<!-- 分野の管理(色指定・削除・付け替え) -->
		<div :class="$style.tutorialSection">
			<button :class="$style.tutorialBtn" @click="openSubjectManager"><i class="ti ti-palette"></i> {{ t('manageSubjects') }}</button>
		</div>

		<!-- チュートリアル再表示 -->
		<div :class="$style.tutorialSection">
			<button :class="$style.tutorialBtn" @click="rerunTutorial"><i class="ti ti-player-play"></i> {{ t('rerunTutorial') }}</button>
		</div>

		<!-- フッター(保存/キャンセル)。MkWindow には footer slot が無いため body 末尾に置く。 -->
		<div :class="$style.footer">
			<button :class="[$style.btn, $style.btnGhost]" :disabled="saving" @click="dialog?.close()">{{ t('cancel') }}</button>
			<button :class="[$style.btn, $style.btnPrimary]" :disabled="saving || !dirty" @click="save"><i class="ti ti-device-floppy"></i> {{ t('save') }}</button>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { computed, ref, useTemplateRef } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import * as os from '@/os.js';
import { hatadyTheme, hatadyLang, saveHatadyDisplay, type HatadyTheme, type HatadyLang } from '@/utility/hatady-prefs.js';
import { $i } from '@/i.js';

const emit = defineEmits<{ (ev: 'closed'): void }>();
const dialog = useTemplateRef('dialog');

// 未保存の変更があるまま閉じようとしたら確認する(保存は下部の保存ボタン)。
async function confirmClose(): Promise<boolean> {
	if (!dirty.value) return true;
	const { canceled } = await os.confirm({
		type: 'warning',
		title: t('unsavedTitle'),
		text: t('unsavedText'),
	});
	return !canceled; // OK=閉じる(変更破棄) / キャンセル=閉じない
}

// 分野の管理(色指定・削除・付け替え)モーダルを開く。
async function openSubjectManager() {
	const { dispose } = os.popup((await import('@/components/HatadySubjectManager.vue')).default, {}, {
		changed: () => { /* 反映は各画面のリロードで行う */ },
		closed: () => dispose(),
	});
}

// チュートリアルを再度実行する(初回フラグに関係なく表示・実績は付与しない)。
async function rerunTutorial() {
	const { dispose } = os.popup((await import('@/components/HatadyTutorial.vue')).default, {}, {
		done: () => dispose(),
		closed: () => dispose(),
	});
}

// バッファ編集: ウィンドウ内はプレビューのみ。保存でサーバーへ確定 → 全端末同期。
const editTheme = ref<HatadyTheme>(hatadyTheme.value);
const editLang = ref<HatadyLang>(hatadyLang.value);
const saving = ref(false);
const dirty = computed(() => editTheme.value !== hatadyTheme.value || editLang.value !== hatadyLang.value);

// 端末間同期の可否はロールポリシー(canUseHatadySync)で制御(要件③)。既定は許可。
const canSync = computed<boolean>(() => ($i as any)?.policies?.canUseHatadySync !== false);
const syncItems = [
	{ key: 'syncItemTimeline', icon: 'ti-timeline-event', color: '#517f4f' },
	{ key: 'syncItemShelf', icon: 'ti-books', color: '#8a5a2e' },
	{ key: 'syncItemProfile', icon: 'ti-user', color: '#45688f' },
	{ key: 'syncItemDisplay', icon: 'ti-palette', color: '#8a5a91' },
];

// ウィンドウ内の文言は編集中の言語でプレビュー。
const effectiveLang = computed<'ja' | 'en'>(() => {
	if (editLang.value === 'auto') return (navigator.language ?? 'ja').toLowerCase().startsWith('ja') ? 'ja' : 'en';
	return editLang.value as 'ja' | 'en';
});
const DICT: Record<string, { ja: string; en: string }> = {
	title: { ja: '表示設定', en: 'Display' },
	theme: { ja: 'テーマ', en: 'Theme' },
	language: { ja: '言語', en: 'Language' },
	independentHint: { ja: 'テーマと言語はそれぞれ独立して選べます。保存で全端末に同期します。', en: 'Theme and language are chosen independently. Saving syncs to all devices.' },
	themePaper: { ja: 'やわらかい紙', en: 'Soft paper' },
	themeEspresso: { ja: '夜の書斎', en: 'Night study' },
	themeHataskey: { ja: 'hataskey準拠', en: 'Match hataskey' },
	langAuto: { ja: '端末の設定に合わせる', en: 'Match device' },
	sync: { ja: '端末間の同期', en: 'Sync across devices' },
	syncEnabled: { ja: '有効', en: 'On' },
	syncDisabled: { ja: '無効', en: 'Off' },
	syncThisDevice: { ja: 'この端末を同期する', en: 'Sync this device' },
	syncShareAll: { ja: '全端末でデータを共有します', en: 'Share your data across all devices' },
	syncBlockedTitle: { ja: 'お使いのアカウントでは端末間共有が無効になっています', en: 'Cross-device sync is disabled for your account' },
	syncBlockedSub: { ja: 'この端末にのみ保存されます。', en: 'Data is stored on this device only.' },
	syncItemTimeline: { ja: '学習ログ・タイムライン', en: 'Study logs & timeline' },
	syncItemShelf: { ja: '本棚・読書の進捗', en: 'Shelf & reading progress' },
	syncItemProfile: { ja: 'プロフィール・得意/苦手/興味', en: 'Profile & strengths/weaks/interests' },
	syncItemDisplay: { ja: 'テーマ・言語などの表示設定', en: 'Theme, language & display settings' },
	cancel: { ja: 'キャンセル', en: 'Cancel' },
	save: { ja: '保存', en: 'Save' },
	rerunTutorial: { ja: 'チュートリアルを再度実行', en: 'Replay tutorial' },
	manageSubjects: { ja: '分野を管理', en: 'Manage subjects' },
	unsavedTitle: { ja: '未保存の変更があります', en: 'Unsaved changes' },
	unsavedText: { ja: '変更を保存するには、ページ下部の「保存」ボタンを押してください。保存せずに閉じますか？', en: 'To keep your changes, press the Save button at the bottom. Close without saving?' },
};
function t(key: string): string { return DICT[key]?.[effectiveLang.value] ?? key; }

const themeOptions = [
	{ value: 'paper' as const, labelKey: 'themePaper', preview: 'linear-gradient(135deg,#f4ecdd,#e7dcc7)', swatch: '#d9824a' },
	{ value: 'espresso' as const, labelKey: 'themeEspresso', preview: 'linear-gradient(135deg,#2b2119,#3a2e23)', swatch: '#f0a94e' },
	{ value: 'hataskey' as const, labelKey: 'themeHataskey', preview: 'linear-gradient(135deg,#eef2f4,#dfe6ea)', swatch: '#34a1c9' },
];
const langOptions = [
	{ value: 'ja' as const, label: '日本語', labelKey: null as string | null, icon: null as string | null },
	{ value: 'en' as const, label: 'English', labelKey: null as string | null, icon: null as string | null },
	{ value: 'auto' as const, label: '', labelKey: 'langAuto', icon: 'ti-device-desktop-cog' },
];

async function save() {
	saving.value = true;
	try {
		await saveHatadyDisplay(editTheme.value, editLang.value);
		os.success();
		dialog.value?.close();
	} catch {
		os.alert({ type: 'error', text: t('title') + ': ' + '保存に失敗しました。' });
	} finally {
		saving.value = false;
	}
}
</script>

<style lang="scss" module>
.body {
	padding: 20px;
	display: flex;
	flex-direction: column;
	gap: 20px;
	background: var(--hy-bg);
	color: var(--hy-body);
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
	min-height: 100%;
	box-sizing: border-box;
}
.section { }
.label { display: flex; align-items: center; gap: 6px; font-family: var(--hy-heading); font-size: 12.5px; font-weight: 700; color: var(--hy-ink); margin-bottom: 10px; }
.label i { color: var(--hy-accent); }
.hint { font-size: 10.5px; color: var(--hy-muted); margin-top: 8px; line-height: 1.6; }

/* テーマカード */
.themeGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.themeCard { background: var(--hy-surface); border: 2px solid transparent; border-radius: 11px; padding: 4px; cursor: pointer; color: inherit; }
.themeCardOn { border-color: var(--hy-accent); }
.themeSwatchWrap { display: flex; align-items: center; justify-content: center; height: 52px; border-radius: 8px; border: 1px solid var(--hy-border); }
.themeSwatch { width: 22px; height: 22px; border-radius: 6px; }
.themeName { display: block; font-size: 11px; font-weight: 700; color: var(--hy-ink); text-align: center; margin-top: 5px; }
.themeCheck { color: var(--hy-accent); }

/* 言語リスト */
.langList { display: flex; flex-direction: column; gap: 8px; }
.langItem { display: flex; align-items: center; gap: 11px; background: var(--hy-surface); border: 2px solid transparent; border-radius: 10px; padding: 11px 14px; cursor: pointer; color: var(--hy-body); }
.langItemOn { border-color: var(--hy-accent); }
.langIcon { font-size: 18px; color: var(--hy-muted); }
.langName { flex: 1; font-size: 13.5px; font-weight: 600; color: var(--hy-ink); text-align: left; }
.langItemOn .langName { font-weight: 700; }
.langRadio { font-size: 19px; color: var(--hy-muted); }
.langItemOn .langRadio { color: var(--hy-accent); }

/* 端末間の同期 */
.syncBadge { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; border-radius: 999px; padding: 3px 10px; }
.syncBadgeOn { color: #4e7d4a; background: #dcecd5; }
.syncBadgeOff { color: var(--hy-muted); background: var(--hy-chip-bg); }
.syncMaster { display: flex; align-items: center; gap: 12px; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 11px; padding: 13px 15px; margin-bottom: 12px; }
.syncMasterIcon { font-size: 22px; color: var(--hy-accent); }
.syncMasterText { flex: 1; min-width: 0; }
.syncMasterTitle { font-family: var(--hy-heading); font-weight: 700; font-size: 14px; color: var(--hy-ink); }
.syncMasterSub { font-size: 11.5px; color: var(--hy-muted); }
.syncMasterState { font-size: 22px; color: var(--hy-accent); flex-shrink: 0; }
.syncItems { background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 11px; overflow: hidden; }
.syncItem { display: flex; align-items: center; gap: 11px; padding: 11px 15px; border-bottom: 1px solid var(--hy-border); }
.syncItem:last-child { border-bottom: none; }
.syncItem i:first-child { font-size: 17px; }
.syncItemName { flex: 1; font-size: 12.5px; color: var(--hy-ink); }
.syncItemCheck { font-size: 16px; color: #4e7d4a; }
.syncBlocked { display: flex; gap: 11px; align-items: flex-start; background: #f7ecd6; border: 1px solid #e2c79a; border-radius: 11px; padding: 13px 15px; }
.syncBlockedIcon { font-size: 20px; color: #b58a3c; flex-shrink: 0; margin-top: 1px; }
.syncBlocked b { font-size: 12.5px; line-height: 1.6; color: #8a6a2e; }
.syncBlockedSub { font-size: 11.5px; color: var(--hy-muted); margin-top: 3px; }

/* フッター */
.tutorialSection { padding-top: 4px; }
.tutorialBtn { display: inline-flex; align-items: center; gap: 7px; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 10px; padding: 9px 15px; font-size: 13px; font-weight: 700; color: var(--hy-ink); cursor: pointer; font-family: var(--hy-heading); }
.tutorialBtn:hover { border-color: var(--hy-accent); color: var(--hy-accent); }
.tutorialBtn i { color: var(--hy-accent); }
.footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: auto; padding-top: 6px; }
.btn {
	display: inline-flex; align-items: center; gap: 6px;
	border-radius: 999px; padding: 9px 22px;
	font-weight: 700; font-family: var(--hy-heading); font-size: 14px;
	cursor: pointer; border: 1.5px solid transparent; transition: filter .15s, opacity .15s;
}
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btnGhost { background: var(--hy-surface); color: var(--hy-ink); border-color: var(--hy-border); }
.btnGhost:not(:disabled):hover { filter: brightness(0.96); }
.btnPrimary { background: linear-gradient(90deg, #e0955a, #d9824a); color: #fff; box-shadow: 0 2px 8px rgba(217,130,74,.35); }
.btnPrimary:not(:disabled):hover { filter: brightness(1.05); }
</style>
