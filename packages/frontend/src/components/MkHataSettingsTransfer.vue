<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkWindow
	ref="transferWindow"
	:initialWidth="560"
	:initialHeight="680"
	:canResize="true"
	:closeButton="true"
	:front="true"
	@closed="emit('closed')"
>
	<template #header>
		<span id="hata-settings-transfer-title" :class="$style.windowHeader"><i class="ti ti-arrows-exchange"></i><span>旗鯖独自設定の入出力</span><em>{{ mode === 'export' ? '書き出し' : '読み込み' }}</em></span>
	</template>
	<section
		data-hata-settings-transfer-window
		:class="$style.window"
		role="dialog"
		aria-modal="false"
		aria-labelledby="hata-settings-transfer-title"
		:aria-busy="busy || dedicatedExportBusy != null"
	>
		<div data-hata-settings-transfer-scroll :class="$style.scrollArea">
			<div :class="$style.body">
				<div :class="$style.modeTabs">
					<button type="button" :class="[$style.modeTab, mode === 'export' && $style.modeTabActive]" @click="mode = 'export'"><i class="ti ti-file-export"></i> 書き出す</button>
					<button type="button" :class="[$style.modeTab, mode === 'import' && $style.modeTabActive]" @click="mode = 'import'"><i class="ti ti-file-import"></i> 読み込む</button>
				</div>

				<div :class="$style.notice">
					<i class="ti ti-shield-lock"></i>
					<div><b>アカウントのログイン情報や利用記録は設定ファイルに含みません</b><br>外部アカウントのログイン情報、投稿、ToDo、学習記録、花常の進行、マスコット素材は対象外です。Hatadyの学習記録とHataFeedのイシューは、下の専用ボタンから個別に保存できます。</div>
				</div>

				<template v-if="mode === 'export'">
					<div :class="$style.lead">この端末にだけ保存される設定を先に収集し、同じカテゴリのアカウント設定もまとめます。</div>
					<div :class="$style.categoryList">
						<label v-for="category in categories" :key="category.id" :class="$style.categoryItem">
							<input v-model="selectedExport" type="checkbox" :value="category.id">
							<span :class="$style.checkVisual"><i class="ti ti-check"></i></span>
							<span :class="$style.categoryCopy"><b>{{ category.label }}</b><small>{{ category.description }}</small></span>
						</label>
					</div>
					<div :class="$style.privacyWarning" role="note">
						<i class="ti ti-eye-exclamation"></i>
						<div><b>共有する前に、ファイル内のURLを確認してください</b><br>選んだ設定には、カスタムフォントURL、非公開RSSや署名付きURLなど、利用者が入力したURLが含まれる場合があります。保存先と共有先を確認してから書き出してください。</div>
					</div>
					<section :class="$style.dedicatedExports" aria-labelledby="hata-dedicated-export-title">
						<div :class="$style.dedicatedHeading">
							<i class="ti ti-database-export"></i>
							<div>
								<b id="hata-dedicated-export-title">利用データを個別に書き出す</b>
								<small>設定ファイルとは別の専用ファイルとして保存します。</small>
							</div>
						</div>
						<div :class="$style.dedicatedGrid">
							<button type="button" :class="$style.dedicatedButton" :disabled="busy || dedicatedExportBusy != null" @click="openHatadyExport">
								<span :class="$style.dedicatedIcon"><i :class="['ti', dedicatedExportBusy === 'hatady' ? 'ti-loader-2' : 'ti-school']"></i></span>
								<span :class="$style.dedicatedCopy"><b>Hatady</b><small>期間を選んで学習記録を書き出す</small></span>
								<i class="ti ti-chevron-right" :class="$style.dedicatedArrow"></i>
							</button>
							<button type="button" :class="$style.dedicatedButton" :disabled="busy || dedicatedExportBusy != null" @click="openHataFeedExport">
								<span :class="$style.dedicatedIcon"><i :class="['ti', dedicatedExportBusy === 'hatafeed' ? 'ti-loader-2' : 'ti-message-report']"></i></span>
								<span :class="$style.dedicatedCopy"><b>HataFeed</b><small>対象と内容を選んでイシューを書き出す</small></span>
								<i class="ti ti-chevron-right" :class="$style.dedicatedArrow"></i>
							</button>
						</div>
					</section>
				</template>

				<template v-else>
					<div :class="$style.lead">古い版・新しい版のファイルも、現在わかる項目だけを読み込めます。合わない設定は個別にスキップします。</div>
					<button type="button" :class="$style.fileButton" :disabled="busy" @click="chooseFile"><i class="ti ti-file-search"></i> 設定ファイルを選ぶ</button>

					<div v-if="importFile" :class="$style.fileSummary">
						<div :class="$style.fileTitle"><i class="ti ti-file-check"></i><span><b>{{ importFileName }}</b><small>作成元: {{ importFile.serverVersion }} ／ 形式 {{ importFile.formatVersion }}</small></span></div>
						<div v-if="compatibilityNotice" :class="$style.warning"><i class="ti ti-alert-triangle"></i>{{ compatibilityNotice }}</div>
						<div v-if="unknownCategoryCount > 0" :class="$style.skipNote">この版で分からないカテゴリ {{ unknownCategoryCount }}件はスキップします。</div>
					</div>

					<div v-if="importFile" :class="$style.categoryList">
						<label v-for="category in importableCategories" :key="category.id" :class="$style.categoryItem">
							<input v-model="selectedImport" type="checkbox" :value="category.id">
							<span :class="$style.checkVisual"><i class="ti ti-check"></i></span>
							<span :class="$style.categoryCopy"><b>{{ category.label }}</b><small>{{ category.description }}</small></span>
						</label>
					</div>
				</template>
			</div>
		</div>

		<footer :class="$style.actionBar">
			<div :class="$style.selectionSummary" aria-live="polite">
				<span v-if="mode === 'export'">{{ selectedExport.length }} / {{ categories.length }}カテゴリを選択</span>
				<span v-else-if="importFile">{{ selectedImport.length }} / {{ importableCategories.length }}カテゴリを選択</span>
				<span v-else>設定ファイルを選んでください</span>
			</div>
			<div :class="$style.footerButtons">
				<button type="button" :class="$style.secondaryButton" @click="closeWindow">閉じる</button>
				<button v-if="mode === 'export'" type="button" :class="$style.primaryButton" :disabled="busy || selectedExport.length === 0" @click="doExport"><i class="ti ti-download"></i> 選んだ設定を書き出す</button>
				<button v-else type="button" :class="$style.primaryButton" :disabled="busy || !importFile || selectedImport.length === 0" @click="doImport"><i class="ti ti-device-floppy"></i> 選んだ設定を読み込む</button>
			</div>
		</footer>
	</section>
</MkWindow>
</template>

<script lang="ts" setup>
import { computed, ref, useTemplateRef } from 'vue';
import type { HataSettingsCategoryId, HataSettingsTransferFile } from '@/utility/hata-settings-transfer.js';
import MkWindow from '@/components/MkWindow.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import {
	applyHataSettingsTransfer,
	createHataSettingsTransfer,
	downloadHataSettingsTransfer,
	getVersionMismatchMessage,
	HATA_SETTINGS_CATEGORIES,
	HATA_SETTINGS_TRANSFER_MAX_BYTES,
	HATA_SETTINGS_TRANSFER_VERSION,
	parseHataSettingsTransfer,
} from '@/utility/hata-settings-transfer.js';

const emit = defineEmits<{ (ev: 'closed'): void }>();
const transferWindow = useTemplateRef<InstanceType<typeof MkWindow>>('transferWindow');
const categories = HATA_SETTINGS_CATEGORIES;
const mode = ref<'export' | 'import'>('export');
const busy = ref(false);
const selectedExport = ref<HataSettingsCategoryId[]>(categories.map(category => category.id));
const selectedImport = ref<HataSettingsCategoryId[]>([]);
const importFile = ref<HataSettingsTransferFile | null>(null);
const importFileName = ref('');
const unknownCategoryCount = ref(0);
const dedicatedExportBusy = ref<'hatady' | 'hatafeed' | null>(null);

function closeWindow() {
	transferWindow.value?.close();
}

type HataFeedProject = {
	id: string;
	name: string;
	isOfficial?: boolean;
};

const importableCategories = computed(() => {
	const file = importFile.value;
	return file == null ? [] : categories.filter(category => Object.hasOwn(file.categories, category.id));
});
const compatibilityNotice = computed(() => {
	if (!importFile.value) return null;
	const messages: string[] = [];
	const server = getVersionMismatchMessage(importFile.value);
	if (server) messages.push(server);
	if (importFile.value.formatVersion !== HATA_SETTINGS_TRANSFER_VERSION) {
		messages.push(`設定形式が現在の ${HATA_SETTINGS_TRANSFER_VERSION} と異なるため、一部を読み込めない場合があります。`);
	}
	return messages.length > 0 ? messages.join('\n') : null;
});

async function doExport() {
	busy.value = true;
	try {
		const file = await createHataSettingsTransfer(selectedExport.value);
		downloadHataSettingsTransfer(file);
		os.toast('選んだ旗鯖独自設定を書き出しました');
	} catch (error) {
		console.error(error);
		os.alert({ type: 'error', text: '設定ファイルを作成できませんでした。' });
	} finally {
		busy.value = false;
	}
}

async function openHatadyExport() {
	if (dedicatedExportBusy.value != null) return;
	dedicatedExportBusy.value = 'hatady';
	try {
		const { dispose } = os.popup((await import('@/components/HatadyExportDialog.vue')).default, {}, {
			closed: () => dispose(),
		});
	} catch (error) {
		console.error(error);
		os.alert({ type: 'error', title: 'Hatadyの書き出し画面を開けませんでした', text: '再読み込みして、もう一度お試しください。' });
	} finally {
		dedicatedExportBusy.value = null;
	}
}

async function openHataFeedExport() {
	if (dedicatedExportBusy.value != null) return;
	dedicatedExportBusy.value = 'hatafeed';
	try {
		const availability = await misskeyApi('hata/feedback/available', {}) as { available: boolean; isStaff: boolean };
		if (!availability.available) {
			await os.alert({ type: 'info', title: 'HataFeedを利用できません', text: '現在のロールではHataFeedが解放されていません。' });
			return;
		}

		const projects = await misskeyApi('hata/feedback/projects', {
			mine: !availability.isStaff,
			limit: 100,
		}) as unknown as HataFeedProject[];
		const exportableProjects = projects.filter(project => !project.isOfficial);
		const items = [
			...(availability.isStaff ? [{ value: '__official__', label: 'Hataskey（公式）' }] : []),
			...exportableProjects.map(project => ({ value: project.id, label: project.name })),
		];

		if (items.length === 0) {
			await os.alert({
				type: 'info',
				title: '書き出せるHataFeedがありません',
				text: 'HataFeedでは、自分が作成したプロジェクトのイシューを書き出せます。',
			});
			return;
		}

		const selection = items.length === 1
			? { canceled: false as const, result: items[0].value }
			: await os.select<string>({
				title: 'HataFeedの書き出し対象',
				text: '書き出すHataFeedを選んでください。',
				items,
			});
		if (selection.canceled) return;

		const project = exportableProjects.find(candidate => candidate.id === selection.result) ?? null;
		if (selection.result !== '__official__' && project == null) {
			await os.alert({ type: 'error', title: '書き出し対象を確認できませんでした', text: 'HataFeedの一覧を読み直して、もう一度お試しください。' });
			return;
		}
		const projectId = selection.result === '__official__' ? null : (project?.id ?? null);
		const projectName = selection.result === '__official__' ? 'Hataskey' : project?.name;
		if (projectName == null || (selection.result !== '__official__' && projectId == null)) {
			await os.alert({ type: 'error', title: '書き出し対象を確認できませんでした', text: 'HataFeedの一覧を読み直して、もう一度お試しください。' });
			return;
		}
		const { dispose } = os.popup((await import('@/components/HataFeedExportWindow.vue')).default, {
			projectId,
			projectName,
		}, {
			closed: () => dispose(),
		});
	} catch (error) {
		console.error(error);
		os.alert({ type: 'error', title: 'HataFeedの書き出し画面を開けませんでした', text: '権限や通信状態を確認して、もう一度お試しください。' });
	} finally {
		dedicatedExportBusy.value = null;
	}
}

function chooseFile() {
	const input = window.document.createElement('input');
	input.type = 'file';
	input.accept = '.json,application/json';
	input.onchange = async () => {
		const file = input.files?.[0];
		if (!file) return;
		if (file.size > HATA_SETTINGS_TRANSFER_MAX_BYTES) {
			os.alert({ type: 'error', text: '設定ファイルが大きすぎます（1MBまで）。' });
			return;
		}
		try {
			const parsed = parseHataSettingsTransfer(await file.text());
			const warnings: string[] = [];
			const serverWarning = getVersionMismatchMessage(parsed.file);
			if (serverWarning) warnings.push(serverWarning);
			if (parsed.file.formatVersion !== HATA_SETTINGS_TRANSFER_VERSION) warnings.push(`設定形式も現在の ${HATA_SETTINGS_TRANSFER_VERSION} と異なります。`);
			if (warnings.length > 0) {
				const { canceled } = await os.confirm({
					type: 'warning',
					title: '異なるバージョンの設定ファイル',
					text: `${warnings.join('\n\n')}\n\n互換性のある設定だけを読み込む準備を続けますか？`,
				});
				if (canceled) return;
			}
			importFile.value = parsed.file;
			importFileName.value = file.name;
			unknownCategoryCount.value = parsed.unknownCategories.length;
			selectedImport.value = importableCategories.value.map(category => category.id);
		} catch (error) {
			console.error(error);
			os.alert({ type: 'error', title: '読み込めません', text: '旗鯖独自設定のファイルとして確認できませんでした。元のファイルを選び直してください。' });
		}
	};
	input.click();
}

async function doImport() {
	if (!importFile.value) return;
	const labels = categories.filter(category => selectedImport.value.includes(category.id)).map(category => category.label);
	const { canceled } = await os.confirm({
		type: 'warning',
		title: '設定を読み込みますか？',
		text: `次の設定を現在の内容へ上書きします。\n${labels.join('、')}\n\n選んでいないカテゴリは変更しません。`,
	});
	if (canceled) return;
	busy.value = true;
	try {
		const result = await applyHataSettingsTransfer(importFile.value, selectedImport.value);
		const skippedDetails = result.skipped.slice(0, 8).map(item => `・${item.category} / ${item.key}: ${item.reason}`).join('\n');
		await os.alert({
			type: result.skipped.length > 0 ? 'warning' : 'success',
			title: '設定を読み込みました',
			text: `適用: ${result.applied}件\nスキップ: ${result.skipped.length}件${skippedDetails ? `\n\n${skippedDetails}` : ''}${result.skipped.length > 8 ? '\n・ほかの項目' : ''}`,
		});
		const reload = await os.confirm({ type: 'info', title: '画面へ反映', text: '端末設定をすべて反映するため、いま再読み込みしますか？' });
		if (!reload.canceled) window.location.reload();
	} catch (error) {
		console.error(error);
		os.alert({ type: 'error', text: '設定の読み込み中にエラーが発生しました。適用できた項目は保持されています。' });
	} finally {
		busy.value = false;
	}
}
</script>

<style lang="scss" module>
.window {
	box-sizing: border-box;
	width: 100%;
	height: 100%;
	min-height: 0;
	display: grid;
	grid-template-rows: minmax(0, 1fr) auto;
	overflow: hidden;
	background: var(--MI_THEME-bg);
}

.windowHeader {
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 8px;
}

.windowHeader > i { flex: 0 0 auto; color: var(--MI_THEME-accent); }
.windowHeader > span { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.windowHeader > em { flex: 0 0 auto; padding: 2px 7px; border-radius: 9999px; color: var(--MI_THEME-accent); background: var(--MI_THEME-accentedBg); font-size: .72em; font-style: normal; font-weight: 800; }

.scrollArea {
	min-height: 0;
	overflow: auto;
	overscroll-behavior: contain;
	scrollbar-gutter: stable;
	background: var(--MI_THEME-bg);
}

.body { padding:clamp(14px,3%,20px); display:flex; flex-direction:column; gap:16px; color:var(--MI_THEME-fg); }
.modeTabs { display:grid; grid-template-columns:1fr 1fr; gap:6px; padding:5px; border-radius:9999px; background:var(--MI_THEME-bg); }
.modeTab { min-height:40px; border:0; border-radius:9999px; color:inherit; background:transparent; cursor:pointer; font:inherit; font-weight:700; }
.modeTabActive { color:var(--MI_THEME-accent); background:var(--MI_THEME-panel); box-shadow:0 2px 12px rgba(0,0,0,.08); }
.notice { display:flex; gap:10px; align-items:flex-start; padding:12px 14px; border:1px solid color-mix(in srgb,var(--MI_THEME-accent) 28%,var(--MI_THEME-divider)); border-radius:14px; background:var(--MI_THEME-accentedBg); font-size:.84em; line-height:1.6; }
.notice > i { color:var(--MI_THEME-accent); font-size:1.25em; margin-top:2px; }
.privacyWarning { display:flex; gap:10px; align-items:flex-start; padding:12px 14px; border:1px solid color-mix(in srgb,var(--MI_THEME-warn) 38%,var(--MI_THEME-divider)); border-radius:14px; color:var(--MI_THEME-fg); background:color-mix(in srgb,var(--MI_THEME-warn) 9%,var(--MI_THEME-panel)); font-size:.82em; line-height:1.6; }
.privacyWarning > i { flex:0 0 auto; color:var(--MI_THEME-warn); font-size:1.25em; margin-top:2px; }
.lead { font-size:.86em; line-height:1.65; opacity:.8; }
.categoryList { display:flex; flex-direction:column; gap:8px; }
.categoryItem { display:flex; align-items:center; gap:11px; padding:11px 13px; border:1px solid var(--MI_THEME-divider); border-radius:13px; background:var(--MI_THEME-panel); cursor:pointer; }
.categoryItem > input { position:absolute; opacity:0; pointer-events:none; }
.checkVisual { width:22px; height:22px; flex:0 0 auto; display:grid; place-items:center; border:2px solid var(--MI_THEME-divider); border-radius:7px; color:transparent; transition:.15s ease; }
.categoryItem > input:checked + .checkVisual { color:var(--MI_THEME-accent); border-color:var(--MI_THEME-accent); background:var(--MI_THEME-accentedBg); }
.categoryItem > input:focus-visible + .checkVisual { outline:2px solid var(--MI_THEME-accent); outline-offset:2px; }
.categoryCopy { display:flex; flex-direction:column; gap:2px; min-width:0; }
.categoryCopy small { opacity:.67; line-height:1.4; }
.primaryButton, .secondaryButton, .fileButton { min-height:42px; padding:9px 15px; border:0; border-radius:12px; cursor:pointer; font:inherit; font-weight:800; }
.primaryButton { color:var(--MI_THEME-accent); background:var(--MI_THEME-accentedBg); box-shadow:0 0 0 1px color-mix(in srgb,var(--MI_THEME-accent) 30%,transparent) inset; }
.secondaryButton { color:var(--MI_THEME-fg); background:var(--MI_THEME-buttonBg); }
.fileButton { width:100%; color:var(--MI_THEME-fg); background:var(--MI_THEME-panel); border:1px dashed var(--MI_THEME-accent); }
.primaryButton:disabled, .secondaryButton:disabled, .fileButton:disabled { opacity:.45; cursor:not-allowed; }
.fileSummary { display:flex; flex-direction:column; gap:9px; padding:13px; border-radius:14px; background:var(--MI_THEME-bg); }
.fileTitle { display:flex; gap:10px; align-items:center; }
.fileTitle > i { color:var(--MI_THEME-accent); font-size:1.3em; }
.fileTitle > span { display:flex; flex-direction:column; min-width:0; }
.fileTitle b { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.fileTitle small { opacity:.65; }
.warning { display:flex; gap:8px; white-space:pre-line; padding:10px; border-radius:10px; color:var(--MI_THEME-warn); background:color-mix(in srgb,var(--MI_THEME-warn) 10%,transparent); font-size:.8em; line-height:1.55; }
.skipNote { font-size:.78em; opacity:.7; }
.dedicatedExports { display:flex; flex-direction:column; gap:11px; padding-top:2px; }
.dedicatedHeading { display:flex; align-items:flex-start; gap:10px; }
.dedicatedHeading > i { flex:0 0 auto; margin-top:2px; color:var(--MI_THEME-accent); font-size:1.25em; }
.dedicatedHeading > div { display:flex; flex-direction:column; gap:2px; min-width:0; }
.dedicatedHeading small { opacity:.67; line-height:1.45; }
.dedicatedGrid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr)); gap:9px; }
.dedicatedButton { min-width:0; min-height:68px; display:grid; grid-template-columns:34px minmax(0,1fr) 18px; align-items:center; gap:9px; padding:11px; border:1px solid var(--MI_THEME-divider); border-radius:14px; color:var(--MI_THEME-fg); background:var(--MI_THEME-panel); cursor:pointer; text-align:left; font:inherit; transition:border-color .15s ease,background .15s ease,transform .15s ease; }
.dedicatedButton:not(:disabled):hover { border-color:var(--MI_THEME-accent); background:var(--MI_THEME-accentedBg); transform:translateY(-1px); }
.dedicatedButton:focus-visible { outline:2px solid var(--MI_THEME-accent); outline-offset:2px; }
.dedicatedButton:disabled { opacity:.55; cursor:not-allowed; }
.dedicatedIcon { width:34px; height:34px; display:grid; place-items:center; border-radius:11px; color:var(--MI_THEME-accent); background:var(--MI_THEME-accentedBg); font-size:1.15em; }
.dedicatedCopy { min-width:0; display:flex; flex-direction:column; gap:2px; }
.dedicatedCopy b { line-height:1.25; }
.dedicatedCopy small { min-width:0; opacity:.67; font-size:.75em; line-height:1.35; overflow-wrap:anywhere; }
.dedicatedArrow { opacity:.45; justify-self:end; }
.dedicatedButton .ti-loader-2 { animation:dedicated-spin .8s linear infinite; }
@keyframes dedicated-spin { to { transform:rotate(360deg); } }

.actionBar {
	min-width: 0;
	min-height: 66px;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 10px 14px max(10px, env(safe-area-inset-bottom, 0px));
	border-top: 1px solid var(--MI_THEME-divider);
	background: var(--MI_THEME-windowHeader);
	-webkit-backdrop-filter: var(--MI-blur, blur(15px));
	backdrop-filter: var(--MI-blur, blur(15px));
}

.selectionSummary { flex: 1 1 120px; min-width: 0; color: color-mix(in srgb, var(--MI_THEME-fg) 72%, transparent); font-size: .78em; line-height: 1.4; }
.footerButtons { flex: 1 1 300px; min-width: 0; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.footerButtons > button { flex: 1 1 auto; }
</style>
