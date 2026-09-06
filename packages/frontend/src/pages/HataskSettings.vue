<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: Hatask の設定UIを共有コンポーネント化したもの。
  Hatask本体(pages/hatask.vue)と、旗鯖独自機能の設定(settings/hata-custom.vue)の
  両方から os.popup で開ける。設定データは i/registry(scope=['client','hatask'])に
  保存され、Hatask本体と完全に同期する(同じキーを読み書きするため)。
-->
<template>
<!-- 旗鯖fork: 設定画面の右ペインへ埋め込むときは、窓そのものを枠なしへ差し替える。
     ⚠️窓は position: fixed の重ね表示なので、CSSでペインの中へは収められない。
     ⚠️受け口(#header / 本体 / close())は同じ形なので、中身には手を触れない。 -->
<component :is="embedded ? SettingsEmbeddedWindow : MkModalWindow"
	ref="dialog"
	:width="560"
	:height="720"
	:withOkButton="false"
	@close="dialog?.close()"
	@closed="emit('closed')"
>
	<template #header><span class="settingsBrandText">{{ copy.title }}</span></template>

	<div :class="$style.root" :aria-busy="loading || settingsSaving">
		<div v-if="loading" :class="$style.loading">{{ copy.loading }}</div>
		<div v-else-if="!settingsLoaded" :class="$style.loadError">
			<p role="alert">{{ plannerCopy.readFailure }}</p>
			<MkButton rounded @click="loadSettings">{{ plannerCopy.retry }}</MkButton>
		</div>
		<template v-else>
			<p v-if="settingsError" :class="$style.settingsError" role="alert">{{ settingsError }}</p>
			<!-- v2: デザインテーマ選択パネル(「テーマ」カラムからボタン遷移) -->
			<div v-if="view==='theme'" :class="$style.themePanel">
				<div :class="$style.themeHead">
					<button :class="$style.backBtn" @click="view='main'"><i class="ti ti-arrow-left"></i> {{ copy.backToSettings }}</button>
				</div>
				<div :class="$style.label" style="font-size:1.05rem">{{ copy.designTheme }}</div>
				<div :class="$style.desc" style="margin-bottom:12px">{{ copy.designThemeDescription }}</div>
				<!-- v2: 左右スライドで選択(選択中=中央 / 前後=フェードで両脇) -->
				<div :class="$style.themeCarousel">
					<button type="button" :class="$style.carArrow" :disabled="settingsSaving || themeIndex<=0" @click="slideTheme(-1)" :aria-label="copy.previousTheme"><i class="ti ti-chevron-left"></i></button>
					<div :class="$style.carViewport" data-theme-carousel @touchstart.passive="onThemeTouchStart" @touchend.passive="onThemeTouchEnd">
						<button v-for="(t,i) in v2Themes" :key="t.id" type="button" :class="[$style.themeCard, settings.theme===t.id && $style.themeCardOn]" :style="themeCardStyle(i)" :data-theme-card="t.id" :disabled="settingsSaving" :tabindex="Math.abs(i-themeIndex)>1 ? -1 : 0" :aria-pressed="settings.theme===t.id" @click="setV2Theme(t.id)">
							<div :class="$style.themePrev" :style="{ background:t.bg }" aria-hidden="true">
								<div :class="$style.themePrevLogo" :style="{ color:t.accent, fontFamily:t.id==='akatsuki' ? 'Righteous, sans-serif' : t.head }">Hatask</div>
								<div :class="$style.themePrevCard" :style="{ background:t.card, border:t.border, borderRadius:t.radius, boxShadow:t.shadow, color:t.fg }">
									<span :style="{ color:t.accent, fontFamily:t.head, fontWeight:800, fontSize:'1.05rem' }">21:47</span>
								</div>
								<div :class="$style.themePrevCard" :style="{ background:t.card, border:t.border, borderRadius:t.radius, boxShadow:t.shadow, color:t.fg }">
									<span :style="{ fontFamily:t.head, fontWeight:700, fontSize:'.72rem' }">{{ copy.todaySchedule }}</span>
								</div>
							</div>
							<div :class="$style.themeName" :style="{ fontFamily:t.head }">{{ t.name }}</div>
							<div :class="$style.themeJp" :data-theme-description="t.id">{{ t.cardDescription ?? t.description }}</div>
							<div :class="[$style.themeCheck, settings.theme===t.id && $style.themeCheckOn]"><i :class="settings.theme===t.id ? 'ti ti-check' : 'ti ti-circle'"></i> {{ settings.theme===t.id ? copy.selected : copy.select }}</div>
						</button>
					</div>
					<button type="button" :class="$style.carArrow" :disabled="settingsSaving || themeIndex>=v2Themes.length-1" @click="slideTheme(1)" :aria-label="copy.nextTheme"><i class="ti ti-chevron-right"></i></button>
				</div>
				<div :class="$style.carDots">
					<button v-for="t in v2Themes" :key="t.id" type="button" :class="[$style.carDot, settings.theme===t.id && $style.carDotOn]" :disabled="settingsSaving" :aria-pressed="settings.theme===t.id" @click="setV2Theme(t.id)" :aria-label="t.name"></button>
				</div>
				<!-- 外観(ライト/ダーク) -->
				<div :class="$style.card">
					<div :class="$style.label">{{ copy.appearance }}</div>
					<div :class="$style.row"><span>{{ copy.autoAppearance }}</span><button type="button" :class="[$style.sw, settings.autoTheme && $style.swOn]" :disabled="settingsSaving" role="switch" :aria-label="copy.autoAppearance" :aria-checked="settings.autoTheme" @click="toggle('autoTheme')"></button></div>
					<div v-if="!settings.autoTheme" :class="$style.row"><span>{{ copy.darkMode }}</span><button type="button" :class="[$style.sw, settings.darkMode && $style.swOn]" :disabled="settingsSaving" role="switch" :aria-label="copy.darkMode" :aria-checked="settings.darkMode" @click="toggle('darkMode')"></button></div>
				</div>
				<!-- アニメーション -->
				<div :class="$style.card">
					<div :class="$style.label">{{ copy.animation }}</div>
					<div :class="$style.row"><span>{{ copy.animationMotion }}</span><button type="button" :class="[$style.sw, settings.animations!==false && $style.swOn]" :disabled="settingsSaving" role="switch" :aria-label="copy.animationMotion" :aria-checked="settings.animations!==false" @click="toggle('animations')"></button></div>
					<div :class="$style.desc">{{ copy.animationDescription }}</div>
				</div>
				<!-- 旗鯖fork(ハタキュ): このテーマ限定のオプション。
				     ⚠️ハタキュを選んでいないときは出さない(他テーマでは効かない設定なので) -->
				<div v-if="settings.theme==='hatakyu'" :class="$style.card">
					<div :class="$style.label">{{ copy.hatakyuOptions }}</div>
					<div :class="$style.row"><span>{{ copy.hatakyuWind }}</span><button type="button" :class="[$style.sw, settings.hatakyuWind!==false && $style.swOn]" :disabled="settingsSaving" role="switch" :aria-label="copy.hatakyuWind" :aria-checked="settings.hatakyuWind!==false" @click="toggle('hatakyuWind')"></button></div>
					<div :class="$style.desc">{{ copy.hatakyuWindDescription }}</div>
				</div>
			</div>

			<!-- 通常設定リスト -->
			<template v-else>
			<!-- テーマ(デザインテーマへの遷移 + レガシー背景) -->
			<div :class="$style.card">
				<div :class="$style.label">{{ copy.theme }}</div>
				<div :class="$style.desc" style="margin-bottom:10px">{{ copy.themeDescription }}</div>
				<div :class="$style.themeEntry">
					<div style="min-width:0">
						<div :class="$style.themeEntryLabel">{{ copy.designTheme }}</div>
						<div :class="$style.themeEntryVal">{{ currentThemeLabel() }}</div>
					</div>
					<button :class="$style.themeEntryBtn" @click="view='theme'">{{ copy.openThemeSettings }} <i class="ti ti-arrow-right"></i></button>
				</div>
			</div>

			<section v-if="isAkatsuki" :class="[$style.card, $style.akatsukiNav]" data-akatsuki-navigation aria-label="暁のナビゲーション設定">
				<h2 :class="$style.akNavHeading">スマホの下部タブ</h2>
				<p :class="$style.akNavNote">左のつまみをドラッグして並べ替え、各項目の↓から表示する機能を選べます。上から順に、下部タブの左から右へ並びます</p>
				<draggable
					:modelValue="editableAkatsukiTabs"
					:class="$style.akTabList"
					:itemKey="akatsukiTabKey"
					handle="[data-ak-drag]"
					ghostClass="hataskTabDragGhost"
					:animation="0"
					:disabled="settingsSaving"
					role="list"
					aria-label="スマホの下部タブの4枠"
					@update:modelValue="reorderAkatsukiTabs"
				>
					<template #item="{element: tab, index}">
						<div :class="$style.akTabRow" :data-ak-slot="index" :data-tab="tab" role="listitem">
							<button type="button" :class="$style.akDragHandle" data-ak-drag tabindex="-1" :disabled="settingsSaving" :aria-label="navigationChoice(tab).label + 'をドラッグして並べ替え'"><i class="ti ti-grip-vertical" aria-hidden="true"></i></button>
							<span :class="$style.akTabNumber">{{ index+1 }}</span>
							<i :class="[navigationChoice(tab).icon, $style.akTabIcon]" aria-hidden="true"></i>
							<div :class="$style.akTabLabel"><span>{{ navigationChoice(tab).label }}</span><small v-if="isHataskAkatsukiRequiredTab(tab)">常に表示・並べ替えのみ</small></div>
							<button type="button" :class="$style.akTabMenu" :data-ak-menu="tab" :disabled="settingsSaving" aria-haspopup="menu" :aria-label="navigationChoice(tab).label + 'の下部タブ設定'" @click="openAkatsukiTabMenu(tab, $event)"><i class="ti ti-chevron-down" aria-hidden="true"></i></button>
						</div>
					</template>
				</draggable>
				<p :class="$style.akNavNote">ホームとHatask Appは常に表示され、位置だけ変えられます。同じ機能は重複して選べません</p>
				<p :class="$style.akNavNote">設定はアカウントに保存され、スマホ・PCで共通です。PCの左メニューの並びは変わりません</p>
			</section>

			<!-- カレンダー -->
			<div :class="$style.card">
				<div :class="$style.label">{{ copy.calendar }}</div>
				<div :class="$style.row"><span>{{ copy.weekStart }}</span>
					<select :class="$style.sel" :value="settings.weekStart" :disabled="settingsSaving" :aria-label="copy.weekStart" @change="onWeekStart($event)"><option value="mon">{{ copy.monday }}</option><option value="sun">{{ copy.sunday }}</option></select>
				</div>
			</div>

			<!-- きもち記録 -->
			<div :class="$style.card">
				<div :class="$style.label">{{ copy.moodLog }}</div>
					<div :class="$style.row"><span>{{ copy.reminderNotification }}</span><button type="button" :class="[$style.sw, settings.moodRemind && $style.swOn]" :disabled="settingsSaving" role="switch" :aria-label="copy.reminderNotification" :aria-checked="settings.moodRemind" @click="toggle('moodRemind')"></button></div>
				<div :class="$style.desc">{{ copy.moodReminderDescription }}</div>
			</div>

			<!-- データ同期 -->
			<div :class="$style.card">
				<div :class="$style.label">{{ copy.dataSync }}</div>
				<div :class="$style.desc">{{ copy.dataSyncDescription }}</div>
					<div v-for="s in syncItems" :key="s.id" :class="$style.row"><span>{{ s.label }}</span><span :class="[$style.sw, $style.swOn]" aria-hidden="true"></span></div>
			</div>

			<!-- 予定 / Todo 専用。既存IDを上書きしないJSON退避と追加統合。 -->
			<div :class="$style.card">
				<div :class="$style.label">{{ plannerCopy.dataSafety }}</div>
				<div :class="$style.desc">{{ plannerCopy.mergeOnlyWarning }}</div>
				<div :class="$style.safetyActions">
					<MkButton rounded small :disabled="plannerSafetyBusy" @click="exportPlannerData"><i class="ti ti-download" aria-hidden="true"></i> {{ plannerCopy.export }}</MkButton>
					<MkButton rounded small :disabled="plannerSafetyBusy" @click="plannerImportInput?.click()"><i class="ti ti-file-upload" aria-hidden="true"></i> {{ plannerCopy.import }}</MkButton>
					<input ref="plannerImportInput" :class="$style.hiddenInput" type="file" accept="application/json,.json" @change="importPlannerData">
				</div>
				<div v-if="plannerLastBackup" :class="$style.backupMeta"><i class="ti ti-shield-check" aria-hidden="true"></i>{{ plannerTx.lastBackup({ date: plannerLastBackup }) }}</div>
				<div v-if="plannerSafetyMessage" :class="$style.backupMeta" role="status" aria-live="polite">{{ plannerSafetyMessage }}</div>
			</div>

			<!-- 起動時 -->
			<div :class="$style.card">
				<div :class="$style.label">{{ copy.startup }}</div>
					<div :class="$style.row"><span>{{ copy.openOnStartup }}</span><button type="button" :class="[$style.sw, settings.openOnStart && $style.swOn]" :disabled="settingsSaving" role="switch" :aria-label="copy.openOnStartup" :aria-checked="settings.openOnStart" @click="toggle('openOnStart')"></button></div>
			</div>

			<!-- 通知 -->
			<div :class="$style.card">
				<div :class="$style.label">{{ copy.notifications }}</div>
				<div :class="$style.row"><span>{{ copy.sendTestNotification }}</span><MkButton rounded small @click="sendTestNotification">{{ copy.sendTest }}</MkButton></div>
				<div :class="$style.desc">{{ copy.pushNotificationDescription }}</div>
			</div>

			<!-- レートリミット -->
			<div :class="$style.card">
				<div :class="$style.label">{{ copy.rateLimit }}</div>
				<div :class="$style.rlBox">
					<div :class="$style.rlTitle">{{ copy.apiLimit }}</div>
					<table :class="$style.rlTbl">
						<thead><tr><th>{{ copy.operation }}</th><th>{{ copy.limit }}</th><th>{{ copy.period }}</th></tr></thead>
						<tbody>
							<tr><td>{{ copy.createSchedule }}</td><td>{{ tx.times({ count: 30 }) }}</td><td>{{ tx.hours({ count: 1 }) }}</td></tr>
							<tr><td>{{ copy.mood }}</td><td>{{ tx.times({ count: 20 }) }}</td><td>{{ tx.hours({ count: 1 }) }}</td></tr>
							<tr><td>ToDo</td><td>{{ tx.times({ count: 60 }) }}</td><td>{{ tx.hours({ count: 1 }) }}</td></tr>
							<tr><td>{{ copy.search }}</td><td>{{ tx.times({ count: 30 }) }}</td><td>{{ tx.minutes({ count: 1 }) }}</td></tr>
						</tbody>
					</table>
				</div>
			</div>

			<!-- ヘルプ -->
			<div :class="$style.card">
				<div :class="$style.label">{{ copy.help }}</div>
				<div :class="$style.row"><span>{{ copy.showTutorialAgain }}</span><MkButton rounded small @click="reopenTutorial">{{ copy.show }}</MkButton></div>
				<div :class="$style.desc">{{ copy.tutorialDescription }}</div>
			</div>

			<!-- Hatask本体を開く -->
			<div :class="$style.card">
				<div :class="$style.label">{{ copy.openHatask }}</div>
				<div :class="$style.desc">{{ copy.openHataskDescription }}</div>
				<MkButton primary rounded @click="openHatask"><i class="ti ti-external-link"></i> {{ copy.openHatask }}</MkButton>
			</div>

			<div :class="$style.note" role="status">{{ settingsSaving ? plannerCopy.saving : copy.savedNote }}</div>
			</template>
		</template>
	</div>
</component>
</template>

<script lang="ts" setup>
import { ref, shallowRef, computed, nextTick, onMounted } from 'vue';
import draggable from 'vuedraggable';
import type { MenuItem } from '@/types/menu.js';
import SettingsEmbeddedWindow from '@/components/SettingsEmbeddedWindow.vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { useRouter } from '@/router.js';
import * as os from '@/os.js';
import { createHataskPlannerApiStoragePort } from '@/utility/hatask-planner-api.js';
import { createHataskPlannerIntegrity, HATASK_PLANNER_SCOPE, migrateHataskPlannerStorage, normalizeHataskPlannerData, stablePlannerJson, verifyHataskPlannerIntegrity } from '@/utility/hatask-planner-storage.js';
import type { HataskPlannerCollectionKey, HataskPlannerEvent, HataskPlannerRawData, HataskPlannerTemplate } from '@/utility/hatask-planner-storage.js';
import { normalizeHataskPlannerTemplates } from '@/utility/hatask-planner-templates.js';
import { isHataskAkatsukiRequiredTab, moveHataskAkatsukiMobileTab, normalizeHataskAkatsukiMobileTabs, replaceHataskAkatsukiMobileTab } from '@/utility/hatask-akatsuki-navigation.js';
import type { HataskAkatsukiTab } from '@/components/hatask/hatask-akatsuki-types.js';

const emit = defineEmits<{ (ev:'closed'):void; (ev:'reopenTutorial'):void; (ev:'changed', settings:any):void }>();
/**
 * 旗鯖fork: 窓と埋め込みのどちらでも通る参照の型。
 * ⚠️片方の窓の型に固定すると、埋め込みへ差し替えたときに型が合わなくなる。
 *   実際に使うのは close() だけなので、そこだけを約束する。
 */
type SettingsWindowHandle = { close: () => void };
const dialog = shallowRef<SettingsWindowHandle>();
const router = useRouter();
const copy = i18n.ts._hata._hatask._settings;
const tx = i18n.tsx._hata._hatask._settings;
const plannerCopy = i18n.ts._hata._hatask._planner;
const plannerTx = i18n.tsx._hata._hatask._planner;

// Hatask本体と同じ registry スコープ/キーを使うことでデータを共有・同期する
const SCOPE = ['client', 'hatask'];
const defaultSettings: any = {
	darkMode: false,
	autoTheme: true,
	weekStart: 'mon',
	moodRemind: false,
	openOnStart: false,
	theme: 'akatsuki',
	animations: true,
	// 旗鯖fork(ハタキュ): 風を吹かせるか(このテーマ限定・既定ON)。
	//   ⚠️既定を true にしておかないと、初回のトグルが「ONのままON」になって効かなく見える。
	hatakyuWind: true,
};

// 旗鯖fork(v2): デザインテーマ(季/花信/刷)。プレビュー用にライト配色・見出しフォントを持つ。
const v2Themes = computed(() => [
	{ id: 'akatsuki', name: copy.themeAkatsuki, description: copy.themeAkatsukiDescription, cardDescription: copy.themeAkatsukiDescription.replace(/^(朝焼けのグラデーションと、)(?=軽やかな3ペイン$)/u, '$1\n'), bg: 'linear-gradient(168deg,#ffd9c0 0%,#ffeef6 46%,#eaf0ff 100%)', fg: '#2b1f2c', accent: '#b02e56', card: 'rgba(255,255,255,.82)', border: '1px solid rgba(80,50,70,.18)', radius: '12px', shadow: '0 8px 18px -12px rgba(90,50,70,.55)', head: "'Zen Maru Gothic',sans-serif" },
	{ id:'kisetsu', name:copy.themeKisetsu, description:copy.themeKisetsuDescription, bg:'#f4f1ea', fg:'#211d18', accent:'#a8552f', card:'#ffffff', border:'1px solid #ddd7cb', radius:'5px', shadow:'none', head:"'Shippori Mincho B1','Zen Kaku Gothic New',serif" },
	{ id:'kashin', name:copy.themeKashin, description:copy.themeKashinDescription, bg:'#fff5e6', fg:'#25201c', accent:'#ff6b4a', card:'#ffffff', border:'2.5px solid #25201c', radius:'14px', shadow:'3px 3px 0 rgba(37,32,28,.15)', head:"'Zen Maru Gothic',sans-serif" },
	{ id:'suri', name:copy.themeSuri, description:copy.themeSuriDescription, bg:'#efe7d4', fg:'#1a1a2e', accent:'#2a52c0', card:'#ffffff', border:'2.5px solid #1a1a2e', radius:'0', shadow:'3px 3px 0 #ff4f9a', head:"'Zen Kaku Gothic Antique',sans-serif" },
	// 旗鯖fork(ハタキュ): プレビューの地色はコルク、紙はクリーム、アクセントは紙に載る青。
	{ id:'hatakyu', name:copy.themeHatakyu, description:copy.themeHatakyuDescription, bg:'#c9975f', fg:'#3b2a1c', accent:'#1272ec', card:'#fdf6e6', border:'none', radius:'0', shadow:'0 8px 14px -7px rgba(40,24,8,.7)', head:"'Zen Maru Gothic',sans-serif" },
]);
const syncItems = computed(() => [
	{ id: 'schedule', label: copy.syncSchedule },
	{ id: 'mood', label: copy.syncMood },
	{ id: 'todo', label: 'ToDo' },
	{ id: 'meal', label: copy.syncMeal },
	{ id: 'flower', label: copy.syncFlower },
]);

const loading = ref(true);
const settingsLoaded = ref(false);
const settingsSaving = ref(false);
const settingsError = ref('');
const settings = ref<any>({ ...defaultSettings });
// Match Hatask's active theme, including its display-only fallback for empty legacy values.
const isAkatsuki = computed(() => !settings.value.theme || settings.value.theme === 'akatsuki');
const navigationChoices: { id: HataskAkatsukiTab; label: string; shortLabel: string; icon: string }[] = [
	{ id: 'home', label: 'ホーム', shortLabel: 'ホーム', icon: 'ti ti-home' },
	{ id: 'cal', label: 'カレンダー', shortLabel: '予定', icon: 'ti ti-calendar-event' },
	{ id: 'todo', label: 'ToDo', shortLabel: 'ToDo', icon: 'ti ti-checkbox' },
	{ id: 'mood', label: 'きもち', shortLabel: 'きもち', icon: 'ti ti-mood-smile' },
	{ id: 'meal', label: 'ごはん', shortLabel: 'ごはん', icon: 'ti ti-soup' },
	{ id: 'garden', label: 'おはな', shortLabel: 'おはな', icon: 'ti ti-flower' },
	{ id: 'eye', label: 'EYE', shortLabel: 'EYE', icon: 'ti ti-eye' },
	{ id: 'hataskapps', label: 'Hatask App', shortLabel: 'Hatask', icon: 'ti ti-layout-grid' },
	{ id: 'apps', label: 'Hataskey App', shortLabel: 'Apps', icon: 'ti ti-app-window' },
];
const akatsukiTabs = computed(() => normalizeHataskAkatsukiMobileTabs(settings.value.akatsukiMobileTabs, settings.value.akatsukiShortcut));
const pendingAkatsukiTabs = ref<HataskAkatsukiTab[] | null>(null);
const editableAkatsukiTabs = computed(() => pendingAkatsukiTabs.value ?? akatsukiTabs.value);
function akatsukiTabKey(tab: HataskAkatsukiTab): string { return tab; }
function navigationChoice(id: HataskAkatsukiTab) { return navigationChoices.find(choice => choice.id === id) ?? navigationChoices[0]; }

async function saveAkatsukiNavigation(tabs: HataskAkatsukiTab[], preview = false): Promise<void> {
	if (!settingsLoaded.value || settingsSaving.value || !isAkatsuki.value) return;
	if (tabs.every((tab, index) => tab === akatsukiTabs.value[index])) return;
	if (preview) pendingAkatsukiTabs.value = tabs;
	try { await saveSettings({ akatsukiMobileTabs: tabs }); } finally { pendingAkatsukiTabs.value = null; }
}
function reorderAkatsukiTabs(value: unknown): void {
	// A drag may only permute the current four items; never save defaults for an invalid drop.
	if (!Array.isArray(value) || value.length !== 4 || new Set(value).size !== 4 || !value.every(tab => akatsukiTabs.value.includes(tab))) return;
	void saveAkatsukiNavigation([...value], true);
}
async function openAkatsukiTabMenu(tab: HataskAkatsukiTab, event: MouseEvent): Promise<void> {
	if (!settingsLoaded.value || settingsSaving.value || !isAkatsuki.value) return;
	const anchor = event.currentTarget as HTMLElement;
	const region = anchor.closest('[data-akatsuki-navigation]');
	let save: Promise<void> | undefined;
	let destination = tab;
	const menu: MenuItem[] = [];
	if (isHataskAkatsukiRequiredTab(tab)) {
		menu.push({ type: 'label', text: '常に表示・並べ替えのみ' });
	} else {
		menu.push({ type: 'label', text: '表示する機能' });
		for (const choice of navigationChoices.filter(choice => !akatsukiTabs.value.includes(choice.id))) {
			menu.push({ text: choice.label, icon: choice.icon, action: () => {
				destination = choice.id;
				save = saveAkatsukiNavigation(replaceHataskAkatsukiMobileTab(akatsukiTabs.value, akatsukiTabs.value.indexOf(tab), choice.id));
			} });
		}
		menu.push({ type: 'divider' });
	}
	// Reuse the requested dropdown for positioning without drag or custom key bindings.
	menu.push({ type: 'parent', text: '位置を変更', icon: 'ti ti-list-numbers', children: [0, 1, 2, 3].map(index => ({
		text: `${index + 1}番目${index === 0 ? '（左端）' : index === 3 ? '（右端）' : ''}`,
		active: akatsukiTabs.value.indexOf(tab) === index,
		action: () => { save = saveAkatsukiNavigation(moveHataskAkatsukiMobileTab(akatsukiTabs.value, akatsukiTabs.value.indexOf(tab), index)); },
	})) });
	await os.popupMenu(menu, anchor);
	if (!save) return;
	await save;
	await nextTick();
	// The old anchor can be disabled during saving or removed by replacement.
	// Restore only lost focus, never steal it from a control the user moved to.
	if (region?.isConnected && (window.document.activeElement === window.document.body || window.document.activeElement === anchor)) {
		const target = akatsukiTabs.value.includes(destination) ? destination : tab;
		region.querySelector<HTMLButtonElement>(`[data-ak-menu="${target}"]`)?.focus({ preventScroll: true });
	}
}
const plannerImportInput = ref<HTMLInputElement|null>(null);
const plannerSafetyBusy = ref(false);
const plannerSafetyMessage = ref('');
const plannerLastBackup = ref('');
// 旗鯖fork(v2): 設定モーダル内のビュー('main'=通常設定 / 'theme'=デザインテーマ選択)。
const view = ref<'main'|'theme'>('main');
function setV2Theme(id:string) { if (v2Themes.value.some(theme => theme.id === id)) void saveSettings({ theme: id }); }
function currentThemeLabel():string { const t = v2Themes.value.find(x => x.id === (settings.value.theme || 'akatsuki')); return t ? `${t.name} (${t.description})` : copy.themeAkatsuki; }

// 旗鯖fork(v2): テーマ選択カルーセル(左右スライド)。選択中を中央・前後をフェードで両脇に。
const themeIndex = computed(() => { const i = v2Themes.value.findIndex(t => t.id === (settings.value.theme || 'akatsuki')); return i < 0 ? 0 : i; });
function themeCardStyle(i:number) {
	const off = i - themeIndex.value;
	const abs = Math.abs(off);
	return {
		transform: `translateX(${off * 76}%) scale(${off === 0 ? 1 : 0.8})`,
		opacity: abs > 1 ? 0 : (off === 0 ? 1 : 0.4),
		zIndex: String(off === 0 ? 3 : 2 - abs),
		pointerEvents: (abs > 1 ? 'none' : 'auto') as any,
		filter: off === 0 ? 'none' : 'saturate(.7)',
	};
}
function slideTheme(dir:number) { const n = themeIndex.value + dir; if (n >= 0 && n < v2Themes.value.length) setV2Theme(v2Themes.value[n].id); }
let _themeTouchX = 0;
function onThemeTouchStart(e:TouchEvent) { _themeTouchX = e.changedTouches[0].clientX; }
function onThemeTouchEnd(e:TouchEvent) { const dx = e.changedTouches[0].clientX - _themeTouchX; if (Math.abs(dx) > 40) slideTheme(dx < 0 ? 1 : -1); }

async function loadSettings(): Promise<void> {
	loading.value = true;
	settingsLoaded.value = false;
	settingsError.value = '';
	try {
		const value = await misskeyApi('i/registry/get', { key: 'settings', scope: SCOPE });
		if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Hatask settings');
		settings.value = { ...defaultSettings, ...value };
		settingsLoaded.value = true;
	} catch (error) {
		// 未作成だけを初回扱いにする。通信失敗や壊れた値を既定値で上書きしない。
		if ((error as { code?: string } | null)?.code === 'NO_SUCH_KEY') {
			settings.value = { ...defaultSettings };
			settingsLoaded.value = true;
		}
	} finally {
		loading.value = false;
	}
}

onMounted(async () => {
	const [, plannerSnapshot] = await Promise.all([
		loadSettings(),
		loadPlannerSnapshot().catch(() => null),
	]);
	if(plannerSnapshot){
		const dates=plannerCollectionEntries(plannerSnapshot).map(([,collection])=>collection.latestBackupAt).filter((date):date is string=>typeof date==='string').sort();
		plannerLastBackup.value=dates.length?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(dates[dates.length-1])):'';
	}
});

type PlannerCollectionSnapshot={exists:boolean;updatedAt:string|null;revision:string|null;value:unknown;hash?:string;backupCount?:number;latestBackupAt?:string|null};
type PlannerApiSnapshot={
	version:number;
	collections:Record<HataskPlannerCollectionKey,PlannerCollectionSnapshot>&{templates?:PlannerCollectionSnapshot};
};

function plannerCollectionEntries(snapshot:PlannerApiSnapshot):Array<[string,PlannerCollectionSnapshot]>{
	return Object.entries(snapshot.collections).filter((entry):entry is [string,PlannerCollectionSnapshot]=>entry[1]!=null);
}

const plannerStoragePort=createHataskPlannerApiStoragePort((endpoint,params)=>misskeyApi(endpoint as never,params as never));

async function loadPlannerSnapshot():Promise<PlannerApiSnapshot>{
	return await misskeyApi('hatask/planner/get' as never,{} as never) as PlannerApiSnapshot;
}

async function preparePlannerImportStorage():Promise<PlannerApiSnapshot>{
	// 取り込みより先に必ず既存3コレクションを再読込し、移行前原本のshadow作成と
	// 正規化後の完全性検証を完了させる。blocked/failed時は一切取り込まない。
	await plannerStoragePort.refresh();
	const migration=await migrateHataskPlannerStorage(plannerStoragePort,{scope:HATASK_PLANNER_SCOPE});
	if(migration.status!=='noop'&&migration.status!=='migrated'){
		const detail=migration.issues[0]?.detail??migration.stage??'planner migration failed';
		throw new Error(detail);
	}
	return await plannerStoragePort.refresh() as PlannerApiSnapshot;
}

function plannerRawData(snapshot:PlannerApiSnapshot):HataskPlannerRawData{
	return{todos:snapshot.collections.todos.value,folders:snapshot.collections.folders.value,events:snapshot.collections.events.value};
}

function downloadJson(filename:string,value:unknown):void{
	const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});
	const url=URL.createObjectURL(blob);
	const link=window.document.createElement('a');
	link.href=url;link.download=filename;link.click();
	window.setTimeout(()=>URL.revokeObjectURL(url),0);
}

async function exportPlannerData():Promise<void>{
	plannerSafetyBusy.value=true;plannerSafetyMessage.value='';
	try{
		const snapshot=await loadPlannerSnapshot();
		const raw=plannerRawData(snapshot);
		const normalized=normalizeHataskPlannerData(raw);
		const normalizedTemplates=normalizeHataskPlannerTemplates(snapshot.collections.templates?.value??[]);
		if(normalizedTemplates.invalidCount>0)throw new TypeError('Invalid Hatask planner templates');
		const exportedAt=new Date();
		downloadJson(`hatask-planner-${exportedAt.toISOString().slice(0,10)}.json`,{
			format:'hatask-planner-export',version:1,exportedAt:exportedAt.toISOString(),
			data:{...raw,templates:normalizedTemplates.templates},
			integrity:normalized.issues.length===0?createHataskPlannerIntegrity(normalized.data):null,
			issues:normalized.issues,
			server: { version:snapshot.version, collections:Object.fromEntries(plannerCollectionEntries(snapshot).map(([key,value])=>[key,{updatedAt:value.updatedAt,hash:value.hash,backupCount:value.backupCount,latestBackupAt:value.latestBackupAt}])) },
		});
		plannerSafetyMessage.value=plannerCopy.dataExported;
	}catch(error){
		console.error('Hatask planner export failed:',error);
		plannerSafetyMessage.value=plannerCopy.dataExportFailed;
	}finally{plannerSafetyBusy.value=false}
}

function mergePlannerCollection<T extends {id:string}>(current:T[],incoming:T[]):{value:T[];added:number;collisions:number}{
	const currentById=new Map(current.map(item=>[item.id,item]));
	const value=[...current];let added=0;let collisions=0;
	for(const item of incoming){
		const existing=currentById.get(item.id);
		if(existing){if(stablePlannerJson(existing)!==stablePlannerJson(item))collisions++;continue}
		value.push(item);currentById.set(item.id,item);added++;
	}
	return{value,added,collisions};
}

async function importPlannerData(event:Event):Promise<void>{
	const input=event.target as HTMLInputElement;
	const file=input.files?.[0];
	input.value='';
	if(!file)return;
	plannerSafetyBusy.value=true;plannerSafetyMessage.value='';
	try{
		const parsed=JSON.parse(await file.text()) as {data?:unknown};
		const source=(parsed&&typeof parsed==='object'&&parsed.data!=null?parsed.data:parsed) as HataskPlannerRawData&{templates?:unknown};
		const incoming=normalizeHataskPlannerData(source);
		if(incoming.issues.length)throw new TypeError(incoming.issues[0].message);
		const incomingTemplates=normalizeHataskPlannerTemplates(source.templates??[]);if(incomingTemplates.invalidCount>0)throw new TypeError('Invalid Hatask planner templates');
		const {canceled}=await os.confirm({type:'warning',text:plannerCopy.mergeOnlyWarning});
		if(canceled)return;

		const before=await preparePlannerImportStorage();
		const current=normalizeHataskPlannerData(plannerRawData(before));
		if(current.issues.length)throw new TypeError(current.issues[0].message);
		const currentTemplates=normalizeHataskPlannerTemplates(before.collections.templates?.value??[]);if(currentTemplates.invalidCount>0)throw new TypeError('Invalid stored Hatask planner templates');
		// インポートした公開予定のserverEventIdは所有確認前に操作へ使わない。原値は別名で保持する。
		const safeIncomingEvents:HataskPlannerEvent[]=incoming.data.events.map((eventItem):HataskPlannerEvent=>{
			if(eventItem.visibility!=='public'&&!eventItem.publicSyncState)return eventItem;
			const item={
				...eventItem,
				...(eventItem.serverEventId?{importedServerEventId:eventItem.serverEventId}:{}),
				...(eventItem.publicSyncState?{importedPublicSyncState:eventItem.publicSyncState}:{}),
				publicSyncState:'unlinked' as const,
			};
			delete item.serverEventId;delete item.serverEventRevision;delete item.pendingVisibility;
			return item;
		});
			const merges={
				todos:mergePlannerCollection(current.data.todos,incoming.data.todos),
				folders:mergePlannerCollection(current.data.folders,incoming.data.folders),
				events:mergePlannerCollection(current.data.events,safeIncomingEvents),
				templates:mergePlannerCollection<HataskPlannerTemplate>(currentTemplates.templates,incomingTemplates.templates),
			};
			let added=0;let collisions=0;
			const changes=(['todos','folders','events','templates'] as const).flatMap(key=>{
				added+=merges[key].added;collisions+=merges[key].collisions;
				const expectedRevision=key==='templates'
					? before.collections.templates?.revision??null
					: before.collections[key].revision;
				return merges[key].added===0?[]:[{collection:key,expectedRevision,value:merges[key].value}];
			});
			if(added===0){plannerSafetyMessage.value=plannerCopy.dataNoChanges;return}
			// 全revisionの照合後に1 transactionで反映し、途中適用を作らない。
			await misskeyApi('hatask/planner/commit-batch' as never,{changes} as never);
			const after=await loadPlannerSnapshot();
			const expectedData={todos:merges.todos.value,folders:merges.folders.value,events:merges.events.value};
			const verification=verifyHataskPlannerIntegrity(createHataskPlannerIntegrity(expectedData),plannerRawData(after));
			if(!verification.ok)throw new Error(verification.issues[0]?.detail??'planner import verification failed');
			const afterTemplates=normalizeHataskPlannerTemplates(after.collections.templates?.value??[]);if(afterTemplates.invalidCount>0||stablePlannerJson(afterTemplates.templates)!==stablePlannerJson(merges.templates.value))throw new Error('planner template import verification failed');
		plannerSafetyMessage.value=plannerTx.dataImported({count:String(added),collisions:String(collisions)});
	}catch(error){
		console.error('Hatask planner import failed:',error);
		plannerSafetyMessage.value=plannerCopy.dataImportFailed;
	}finally{plannerSafetyBusy.value=false}
}

async function saveSettings(patch: Record<string, unknown>): Promise<void> {
	if (!settingsLoaded.value || settingsSaving.value) return;
	const nextSettings = { ...settings.value, ...patch };
	settingsSaving.value = true;
	settingsError.value = '';
	try {
		await misskeyApi('i/registry/set', { key: 'settings', value: nextSettings, scope: SCOPE });
		settings.value = nextSettings;
		// 保存できた値だけを親へ通知する。失敗時は最後に取得・保存できた選択を保つ。
		emit('changed', { ...nextSettings });
	} catch {
		settingsError.value = copy.saveFailure;
	} finally {
		settingsSaving.value = false;
	}
}

function toggle(key:string) { void saveSettings({ [key]: !settings.value[key] }); }
function onWeekStart(ev:Event) {
	const select = ev.target as HTMLSelectElement;
	const value = select.value;
	select.value = settings.value.weekStart;
	if (value === 'mon' || value === 'sun') void saveSettings({ weekStart: value });
}

function openHatask() { dialog.value?.close(); router.push('/hatask'); }

// 旗鯖fork(#37): チュートリアル再表示。
//   Hatask本体内で開いた場合は親(hatask.vue)が emit を受けて reopenTutorial を実行する。
//   旗鯖独自設定から開いた場合は Hatask へ遷移してから手動で再表示してもらう必要がある。
function reopenTutorial() {
	emit('reopenTutorial');
	dialog.value?.close();
	// Hatask以外のページから開いた場合は遷移する(イベントを誰も拾わない場合のフォールバック)
	if (!router.currentRoute.value.path.startsWith('/hatask')) {
		router.push('/hatask');
	}
}

// 旗鯖fork(#37): Hatask本体から移植したテスト通知
async function sendTestNotification() {
	try { await misskeyApi('notifications/test-notification', {}); os.toast(copy.testNotificationSent); }
	catch { os.toast(copy.testNotificationFailed); }
}

/** 旗鯖fork: true なら窓の枠を持たず、設定画面の右ペインの中身として描く。 */
defineProps<{ embedded?: boolean }>();
</script>

<style lang="scss" module>
.root { container-type:inline-size; display:flex; flex-direction:column; gap:14px; padding:18px 20px 22px; }
.loadError { display:grid; justify-items:center; gap:12px; padding:24px 0; text-align:center; }
.settingsError { margin:0; padding:12px 14px; border:1px solid var(--MI_THEME-divider); border-radius:12px; color:var(--MI_THEME-fg); background:var(--MI_THEME-panel); font-size:.85rem; line-height:1.6; }
.root[aria-busy='true'] button:disabled, .root[aria-busy='true'] select:disabled { cursor:wait; opacity:.5; }
.loading { padding:40px 0; display:flex; justify-content:center; }
.card { background: var(--MI_THEME-panel); border:1px solid var(--MI_THEME-divider); border-radius:14px; padding:14px 16px; }
.label { font-size:.95rem; font-weight:700; margin-bottom:10px; }
.desc { font-size:.8rem; opacity:.65; line-height:1.6; margin-top:4px; }
.note { font-size:.8rem; opacity:.6; text-align:center; padding:4px 0 2px; }
.safetyActions { display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:12px; }
.hiddenInput { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
.backupMeta { display:flex; align-items:flex-start; justify-content:center; gap:6px; margin-top:10px; color:var(--MI_THEME-fg); font-size:.78rem; line-height:1.55; text-align:center; overflow-wrap:anywhere; }
.row { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:7px 0; font-size:.9rem; }
.sel { background: var(--MI_THEME-bg); color: var(--MI_THEME-fg); border:1px solid var(--MI_THEME-divider); border-radius:8px; padding:6px 10px; font-family:inherit; }
.bgPicker { display:flex; gap:14px; flex-wrap:wrap; }
.bgOpt { width:48px; height:48px; border-radius:12px; cursor:pointer; border:2px solid transparent; transition:border-color .15s, transform .15s; }
.bgOpt:hover { transform:translateY(-2px); }
.bgOptOn { border-color: var(--MI_THEME-accent); }
.bgLabel { font-size:.72rem; opacity:.7; margin-top:4px; }
/* トグルスイッチ。見た目は24px、操作領域は44pxを確保する。 */
.sw { width:48px; height:44px; padding:0; background:transparent; border:0; border-radius:22px; cursor:pointer; position:relative; flex-shrink:0; }
.sw::before { content:''; position:absolute; width:44px; height:24px; top:10px; left:2px; box-sizing:border-box; background:var(--MI_THEME-divider); border:1px solid var(--MI_THEME-divider); border-radius:12px; transition:background .2s,border-color .2s; }
.sw::after { content:''; position:absolute; width:18px; height:18px; background:#fff; border-radius:50%; top:13px; left:5px; transition:left .2s cubic-bezier(0.34,1.56,0.64,1); box-shadow:0 1px 3px rgba(0,0,0,.2); }
.swOn::before { background:var(--MI_THEME-accent); border-color:var(--MI_THEME-accent); }
.swOn::after { left:25px; }
.sw:not(button) { cursor:default; }
.sw:focus-visible { outline:3px solid var(--MI_THEME-accent); outline-offset:2px; }
/* 旗鯖fork(#37): レートリミット表 */
.rlBox { background: var(--MI_THEME-bg); border:1px solid var(--MI_THEME-divider); border-radius:10px; padding:10px 14px; }
.rlTitle { font-size:.82rem; font-weight:700; margin-bottom:6px; opacity:.8; }
.rlTbl { width:100%; border-collapse:collapse; font-size:.82rem; }
.rlTbl th, .rlTbl td { padding:4px 8px; text-align:left; border-bottom:1px solid var(--MI_THEME-divider); }
.rlTbl thead th { opacity:.7; font-weight:600; }
.rlTbl tbody tr:last-child td { border-bottom:none; }

/* 旗鯖fork(v2): デザインテーマへの遷移エントリ(テーマカード内) */
.subLabel { font-size:.78rem; font-weight:700; opacity:.6; margin:14px 0 8px; }
.themeEntry { display:flex; align-items:center; justify-content:space-between; gap:12px; background: var(--MI_THEME-bg); border:1px solid var(--MI_THEME-divider); border-radius:10px; padding:12px 14px; }
.themeEntryLabel { font-size:.9rem; font-weight:700; }
.themeEntryVal { font-size:.8rem; opacity:.7; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.themeEntryBtn { flex-shrink:0; display:inline-flex; align-items:center; gap:5px; background: var(--MI_THEME-accent); color:#fff; border:none; border-radius:999px; padding:9px 16px; font-size:.85rem; font-weight:700; cursor:pointer; font-family:inherit; min-height:40px; transition:filter .15s; > i { font-size:1em; } &:hover { filter:brightness(1.06); } }

/* 旗鯖fork(v2): デザインテーマ選択パネル */
.themePanel { display:flex; flex-direction:column; gap:14px; }
.themeHead { display:flex; align-items:center; }
.backBtn { display:inline-flex; align-items:center; gap:6px; background: var(--MI_THEME-buttonBg); color: var(--MI_THEME-fg); border:1px solid var(--MI_THEME-divider); border-radius:999px; padding:8px 15px; font-size:.85rem; font-weight:700; cursor:pointer; font-family:inherit; min-height:40px; &:hover { background: var(--MI_THEME-buttonHoverBg); } > i { font-size:1.05em; } }
/* v2: テーマ選択カルーセル(左右スライド) */
.themeCarousel { display:flex; align-items:center; gap:6px; margin:2px 0; }
/* All cards share one grid cell: translated cards still reserve their content height. */
.carViewport { position:relative; flex:1; min-width:0; display:grid; grid-template-columns:minmax(0,1fr); align-items:start; justify-items:center; padding:8px; overflow:hidden; touch-action:pan-y; }
.carArrow { flex:0 0 auto; width:38px; height:38px; border-radius:999px; border:1px solid var(--MI_THEME-divider); background: var(--MI_THEME-buttonBg); color: var(--MI_THEME-fg); cursor:pointer; display:inline-flex; align-items:center; justify-content:center; font-size:1.25rem; transition:all .15s; &:hover:not(:disabled){ background: var(--MI_THEME-buttonHoverBg); border-color: var(--MI_THEME-accent); } &:disabled{ opacity:.32; cursor:not-allowed; } }
.themeCard { grid-area:1 / 1; box-sizing:border-box; width:min(200px,100%); min-width:0; margin:0; display:flex; flex-direction:column; align-items:stretch; gap:6px; padding:10px 10px 12px; background: var(--MI_THEME-panel); border:2px solid var(--MI_THEME-divider); border-radius:14px; cursor:pointer; font-family:inherit; text-align:center; transition:transform .38s cubic-bezier(.4,0,.2,1), opacity .38s, filter .38s, border-color .2s; will-change:transform,opacity; }
.themeCardOn { border-color: var(--MI_THEME-accent); box-shadow:0 0 0 3px color-mix(in srgb, var(--MI_THEME-accent) 22%, transparent); }
.carDots { display:flex; justify-content:center; flex-wrap:wrap; gap:0; margin-top:0; }
.carDot { width:44px; height:44px; display:grid; place-items:center; border-radius:999px; border:none; background:transparent; cursor:pointer; padding:0; }
.carDot::after { content:''; width:8px; height:8px; border-radius:999px; background:var(--MI_THEME-divider); transition:width .25s,background-color .25s; }
.carDotOn::after { background:var(--MI_THEME-accent); width:22px; }
.carDot:focus-visible, .themeCard:focus-visible { outline:3px solid var(--MI_THEME-accent); outline-offset:2px; }
.themePrev { border-radius:9px; padding:10px 9px; display:flex; flex-direction:column; gap:6px; overflow:hidden; box-shadow:inset 0 0 0 1px rgba(0,0,0,.06); }
.themePrevLogo { font-size:1.15rem; line-height:1; text-align:left; }
.themePrevCard { padding:6px 8px; text-align:left; line-height:1; }
.themeName { font-size:1.15rem; font-weight:800; margin-top:2px; }
.themeJp { font-size:.72rem; line-height:1.6; opacity:.65; white-space:pre-line; overflow-wrap:anywhere; }
.themeCheck { display:inline-flex; align-items:center; justify-content:center; gap:4px; font-size:.76rem; font-weight:700; opacity:.6; margin-top:2px; > i { font-size:1em; } }
.themeCheckOn { opacity:1; color: var(--MI_THEME-accent); }

/* 暁モックの選択ピルと下部ナビの形。外側の設定画面・旧4テーマは変えない。 */
.akatsukiNav { color:var(--MI_THEME-fg); font-family:'Zen Kaku Gothic New',system-ui,sans-serif; }
.akNavHeading { margin:22px 0 0; padding-bottom:10px; border-bottom:1px solid var(--MI_THEME-divider); font-family:'Zen Maru Gothic',system-ui,sans-serif; font-size:12px; font-weight:800; letter-spacing:.08em; }
.akNavHeading:first-child { margin-top:0; }
.akNavNote { margin:10px 0 0; color:var(--MI_THEME-fg); font-size:12px; line-height:1.75; text-wrap:pretty; }
.akTabList { display:grid; gap:8px; margin-top:16px; }
.akTabRow { display:flex; align-items:center; gap:8px; min-width:0; min-height:60px; padding:4px 6px; border:1px solid var(--MI_THEME-divider); border-radius:14px; background:var(--MI_THEME-panel); }
.akDragHandle, .akTabMenu { flex:0 0 44px; width:44px; height:44px; display:grid; place-items:center; padding:0; border:0; border-radius:10px; background:transparent; color:var(--MI_THEME-fg); font-size:20px; cursor:pointer; }
.akDragHandle { cursor:grab; touch-action:none; }
.akDragHandle:active { cursor:grabbing; }
.akDragHandle:disabled, .akTabMenu:disabled { opacity:.5; cursor:default; }
.akTabMenu:hover:not(:disabled) { background:var(--MI_THEME-buttonHoverBg); }
.akTabMenu:focus-visible { outline:3px solid var(--MI_THEME-accent); outline-offset:2px; }
.akTabNumber { flex:0 0 1em; font-size:11px; color:var(--MI_THEME-fgMuted); text-align:center; }
.akTabIcon { flex:0 0 22px; text-align:center; font-size:20px; }
.akTabLabel { flex:1; min-width:0; display:grid; gap:3px; font-size:13px; font-weight:700; overflow-wrap:anywhere; }
.akTabLabel > small { color:var(--MI_THEME-fgMuted); font-size:10px; font-weight:400; }
.akTabRow:global(.hataskTabDragGhost) { opacity:.35; outline:2px dashed var(--MI_THEME-accent); }

@container (max-width:520px) {
	.themeCard { width:min(192px,100%); }
	.carArrow { width:34px; height:34px; }
	.themeEntry { flex-wrap:wrap; }
	.themeEntryBtn { width:100%; justify-content:center; }
}
@media (prefers-reduced-motion:reduce) {
	.themeCard, .carArrow, .carDot::after, .sw::before, .sw::after { transition:none; }
}
</style>
