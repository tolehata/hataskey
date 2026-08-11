<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady 1l): 表示設定ウィンドウ。テーマ(やわらかい紙/夜の書斎/Hataskey準拠)を選ぶ。
  表示言語は Hataskey 本体の共通言語設定をそのまま使い、Hatady 独自の言語選択は持たない。
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
	<template #header><i class="ti ti-palette"></i> {{ copy.title }}</template>

	<div class="hatady-scope" :data-hatady-theme="editTheme" :class="$style.body">
		<!-- テーマ -->
		<div :class="$style.section">
			<div :class="$style.label"><i class="ti ti-brush"></i> {{ copy.theme }}</div>
			<div :class="$style.themeGrid">
				<button v-for="opt in themeOptions" :key="opt.value" :class="[$style.themeCard, editTheme === opt.value && $style.themeCardOn]" @click="editTheme = opt.value">
					<span :class="$style.themeSwatchWrap" :style="{ background: opt.preview }"><span :class="$style.themeSwatch" :style="{ background: opt.swatch }"></span></span>
					<span :class="$style.themeName">{{ opt.label }} <i v-if="editTheme === opt.value" class="ti ti-check" :class="$style.themeCheck"></i></span>
				</button>
			</div>
			<div :class="$style.hint">{{ copy.themeHint }}</div>
		</div>

		<!-- 旗鯖fork: 管理(分野の管理・チュートリアル再実行・記録の書き出し)。端末間同期セクションの上に配置。 -->
		<div :class="$style.section">
			<div :class="$style.label"><i class="ti ti-adjustments"></i> {{ copy.manage }}</div>
			<div :class="$style.manageList">
				<button :class="$style.manageBtn" @click="openSubjectManager">
					<i class="ti ti-palette" :class="$style.manageIcon"></i>
					<span :class="$style.manageName">{{ copy.manageSubjects }}</span>
					<i class="ti ti-chevron-right" :class="$style.manageArrow"></i>
				</button>
				<button :class="$style.manageBtn" @click="rerunTutorial">
					<i class="ti ti-player-play" :class="$style.manageIcon"></i>
					<span :class="$style.manageName">{{ copy.rerunTutorial }}</span>
					<i class="ti ti-chevron-right" :class="$style.manageArrow"></i>
				</button>
				<button :class="$style.manageBtn" @click="doExportAll">
					<i class="ti ti-file-download" :class="$style.manageIcon"></i>
					<span :class="$style.manageName">{{ copy.exportAll }}</span>
					<i class="ti ti-chevron-right" :class="$style.manageArrow"></i>
				</button>
			</div>
		</div>

		<!-- 端末間の同期(1k・ロールポリシーで可否) -->
		<div :class="$style.section">
			<div :class="$style.label">
				<i :class="canSync ? 'ti ti-refresh' : 'ti ti-refresh-off'"></i> {{ copy.sync }}
				<span :class="[$style.syncBadge, canSync ? $style.syncBadgeOn : $style.syncBadgeOff]">
					<i :class="canSync ? 'ti ti-cloud-check' : 'ti ti-refresh-off'"></i> {{ canSync ? copy.syncEnabled : copy.syncDisabled }}
				</span>
			</div>
			<template v-if="canSync">
				<div :class="$style.syncMaster">
					<i class="ti ti-cloud" :class="$style.syncMasterIcon"></i>
					<div :class="$style.syncMasterText">
						<div :class="$style.syncMasterTitle">{{ copy.syncThisDevice }}</div>
						<div :class="$style.syncMasterSub">{{ copy.syncShareAll }}</div>
					</div>
					<i class="ti ti-circle-check-filled" :class="$style.syncMasterState"></i>
				</div>
				<div :class="$style.syncItems">
					<div v-for="it in syncItems" :key="it.key" :class="$style.syncItem">
						<i :class="['ti', it.icon]" :style="{ color: it.color }"></i>
						<span :class="$style.syncItemName">{{ it.label }}</span>
						<i class="ti ti-cloud-check" :class="$style.syncItemCheck"></i>
					</div>
				</div>
			</template>
			<div v-else :class="$style.syncBlocked">
				<i class="ti ti-shield-lock" :class="$style.syncBlockedIcon"></i>
				<div>
					<b>{{ copy.syncBlockedTitle }}</b>
					<div :class="$style.syncBlockedSub">{{ copy.syncBlockedSub }}</div>
				</div>
			</div>
		</div>

		<!-- フッター(保存/キャンセル)。MkWindow には footer slot が無いため body 末尾に置く。 -->
		<div :class="$style.footer">
			<button :class="[$style.btn, $style.btnGhost]" :disabled="saving" @click="dialog?.close()">{{ copy.cancel }}</button>
			<button :class="[$style.btn, $style.btnPrimary]" :disabled="saving || !dirty" @click="save"><i class="ti ti-device-floppy"></i> {{ copy.save }}</button>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { computed, ref, useTemplateRef } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { hatadyTheme, saveHatadyDisplay, type HatadyTheme } from '@/utility/hatady-prefs.js';
import { $i } from '@/i.js';

const emit = defineEmits<{ (ev: 'closed'): void }>();
const dialog = useTemplateRef('dialog');
const copy = i18n.ts._hata._hatady._displaySettings;

// 未保存の変更があるまま閉じようとしたら確認する(保存は下部の保存ボタン)。
async function confirmClose(): Promise<boolean> {
	if (!dirty.value) return true;
	const { canceled } = await os.confirm({
		type: 'warning',
		title: copy.unsavedTitle,
		text: copy.unsavedText,
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
//   旗鯖fork: 起動アニメ →(はじめる)→ チュートリアル の順で、初回と同じ紹介を再生する。
//   (テーマ選択はこの表示設定ウィンドウ内で変更できるため、再生フローには挟まない)
async function rerunTutorial() {
	const { dispose } = os.popup((await import('@/components/HatadyStartupAnime.vue')).default, {}, {
		start: () => { dispose(); rerunTutorialOnly(); },
		closed: () => dispose(),
	});
}
async function rerunTutorialOnly() {
	const { dispose } = os.popup((await import('@/components/HatadyTutorial.vue')).default, {}, {
		done: () => dispose(),
		closed: () => dispose(),
	});
}

// 旗鯖fork: 学習記録の書き出し。期間(すべて/今月/先月/過去30日/指定)はダイアログで選ぶ。
async function doExportAll() {
	const { dispose } = os.popup((await import('@/components/HatadyExportDialog.vue')).default, {}, {
		closed: () => dispose(),
	});
}

// バッファ編集: ウィンドウ内はプレビューのみ。保存でサーバーへ確定 → 全端末同期。
const editTheme = ref<HatadyTheme>(hatadyTheme.value);
const saving = ref(false);
const dirty = computed(() => editTheme.value !== hatadyTheme.value);

// 端末間同期の可否はロールポリシー(canUseHatadySync)で制御(要件③)。既定は許可。
const canSync = computed<boolean>(() => ($i as any)?.policies?.canUseHatadySync !== false);
const syncItems = [
	{ key: 'syncItemTimeline', label: copy.syncItemTimeline, icon: 'ti-timeline-event', color: '#517f4f' },
	{ key: 'syncItemShelf', label: copy.syncItemShelf, icon: 'ti-books', color: '#8a5a2e' },
	{ key: 'syncItemProfile', label: copy.syncItemProfile, icon: 'ti-user', color: '#45688f' },
	{ key: 'syncItemDisplay', label: copy.syncItemDisplay, icon: 'ti-palette', color: '#8a5a91' },
];

const themeOptions = [
	{ value: 'paper' as const, label: copy.themePaper, preview: 'linear-gradient(135deg,#f4ecdd,#e7dcc7)', swatch: '#d9824a' },
	{ value: 'espresso' as const, label: copy.themeEspresso, preview: 'linear-gradient(135deg,#2b2119,#3a2e23)', swatch: '#f0a94e' },
	{ value: 'hataskey' as const, label: copy.themeHataskey, preview: 'linear-gradient(135deg,#eef2f4,#dfe6ea)', swatch: '#34a1c9' },
];

async function save() {
	saving.value = true;
	try {
		await saveHatadyDisplay(editTheme.value);
		os.success();
		dialog.value?.close();
	} catch {
		os.alert({ type: 'error', text: copy.saveFailed });
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

/* 管理 */
.manageList { display: flex; flex-direction: column; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 11px; overflow: hidden; }
.manageBtn { display: flex; align-items: center; gap: 11px; background: transparent; border: none; border-bottom: 1px solid var(--hy-border); padding: 12px 15px; font-size: 13px; font-weight: 700; color: var(--hy-ink); cursor: pointer; font-family: var(--hy-heading); text-align: left; }
.manageBtn:last-child { border-bottom: none; }
.manageBtn:hover { background: rgba(217,130,74,.07); }
.manageBtn:disabled { opacity: .55; cursor: progress; }
.manageIcon { font-size: 17px; color: var(--hy-accent); flex-shrink: 0; }
.manageName { flex: 1; }
.manageArrow { font-size: 15px; color: var(--hy-muted); }
.spin { animation: hy-ds-spin .8s linear infinite; }
@keyframes hy-ds-spin { to { transform: rotate(360deg); } }

/* フッター */
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
