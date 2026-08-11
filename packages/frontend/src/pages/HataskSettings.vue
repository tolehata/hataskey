<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: Hatask の設定UIを共有コンポーネント化したもの。
  Hatask本体(pages/hatask.vue)と、旗鯖独自機能の設定(settings/hata-custom.vue)の
  両方から os.popup で開ける。設定データは i/registry(scope=['client','hatask'])に
  保存され、Hatask本体と完全に同期する(同じキーを読み書きするため)。
-->
<template>
<MkModalWindow
	ref="dialog"
	:width="560"
	:height="720"
	:withOkButton="false"
	@close="dialog?.close()"
	@closed="emit('closed')"
>
	<template #header>{{ copy.title }}</template>

	<div :class="$style.root">
		<div v-if="loading" :class="$style.loading">{{ copy.loading }}</div>
		<template v-else>
			<!-- v2: デザインテーマ選択パネル(「テーマ」カラムからボタン遷移) -->
			<div v-if="view==='theme'" :class="$style.themePanel">
				<div :class="$style.themeHead">
					<button :class="$style.backBtn" @click="view='main'"><i class="ti ti-arrow-left"></i> {{ copy.backToSettings }}</button>
				</div>
				<div :class="$style.label" style="font-size:1.05rem">{{ copy.designTheme }}</div>
				<div :class="$style.desc" style="margin-bottom:12px">{{ copy.designThemeDescription }}</div>
				<!-- v2: 左右スライドで選択(選択中=中央 / 前後=フェードで両脇) -->
				<div :class="$style.themeCarousel">
					<button type="button" :class="$style.carArrow" :disabled="themeIndex<=0" @click="slideTheme(-1)" :aria-label="copy.previousTheme"><i class="ti ti-chevron-left"></i></button>
					<div :class="$style.carViewport" @touchstart.passive="onThemeTouchStart" @touchend.passive="onThemeTouchEnd">
						<button v-for="(t,i) in v2Themes" :key="t.id" type="button" :class="[$style.themeCard, settings.theme===t.id && $style.themeCardOn]" :style="themeCardStyle(i)" @click="setV2Theme(t.id)">
							<div :class="$style.themePrev" :style="{ background:t.bg }" aria-hidden="true">
								<div :class="$style.themePrevLogo" :style="{ color:t.accent, fontFamily:t.head }">Hatask</div>
								<div :class="$style.themePrevCard" :style="{ background:t.card, border:t.border, borderRadius:t.radius, boxShadow:t.shadow, color:t.fg }">
									<span :style="{ color:t.accent, fontFamily:t.head, fontWeight:800, fontSize:'1.05rem' }">21:47</span>
								</div>
								<div :class="$style.themePrevCard" :style="{ background:t.card, border:t.border, borderRadius:t.radius, boxShadow:t.shadow, color:t.fg }">
									<span :style="{ fontFamily:t.head, fontWeight:700, fontSize:'.72rem' }">{{ copy.todaySchedule }}</span>
								</div>
							</div>
							<div :class="$style.themeName" :style="{ fontFamily:t.head }">{{ t.name }}</div>
							<div :class="$style.themeJp">{{ t.description }}</div>
							<div :class="[$style.themeCheck, settings.theme===t.id && $style.themeCheckOn]"><i :class="settings.theme===t.id ? 'ti ti-check' : 'ti ti-circle'"></i> {{ settings.theme===t.id ? copy.selected : copy.select }}</div>
						</button>
					</div>
					<button type="button" :class="$style.carArrow" :disabled="themeIndex>=v2Themes.length-1" @click="slideTheme(1)" :aria-label="copy.nextTheme"><i class="ti ti-chevron-right"></i></button>
				</div>
				<div :class="$style.carDots">
					<button v-for="(t,i) in v2Themes" :key="t.id" type="button" :class="[$style.carDot, settings.theme===t.id && $style.carDotOn]" @click="setV2Theme(t.id)" :aria-label="t.name"></button>
				</div>
				<!-- 外観(ライト/ダーク) -->
				<div :class="$style.card">
					<div :class="$style.label">{{ copy.appearance }}</div>
					<div :class="$style.row"><span>{{ copy.autoAppearance }}</span><button :class="[$style.sw, settings.autoTheme && $style.swOn]" @click="toggle('autoTheme')"></button></div>
					<div :class="$style.row" v-if="!settings.autoTheme"><span>{{ copy.darkMode }}</span><button :class="[$style.sw, settings.darkMode && $style.swOn]" @click="toggle('darkMode')"></button></div>
				</div>
				<!-- アニメーション -->
				<div :class="$style.card">
					<div :class="$style.label">{{ copy.animation }}</div>
					<div :class="$style.row"><span>{{ copy.animationMotion }}</span><button :class="[$style.sw, settings.animations!==false && $style.swOn]" @click="toggle('animations')"></button></div>
					<div :class="$style.desc">{{ copy.animationDescription }}</div>
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

			<!-- カレンダー -->
			<div :class="$style.card">
				<div :class="$style.label">{{ copy.calendar }}</div>
				<div :class="$style.row"><span>{{ copy.weekStart }}</span>
					<select :class="$style.sel" :value="settings.weekStart" @change="onWeekStart($event)"><option value="mon">{{ copy.monday }}</option><option value="sun">{{ copy.sunday }}</option></select>
				</div>
			</div>

			<!-- きもち記録 -->
			<div :class="$style.card">
				<div :class="$style.label">{{ copy.moodLog }}</div>
				<div :class="$style.row"><span>{{ copy.reminderNotification }}</span><button :class="[$style.sw, settings.moodRemind && $style.swOn]" @click="toggle('moodRemind')"></button></div>
				<div :class="$style.desc">{{ copy.moodReminderDescription }}</div>
			</div>

			<!-- データ同期 -->
			<div :class="$style.card">
				<div :class="$style.label">{{ copy.dataSync }}</div>
				<div :class="$style.desc">{{ copy.dataSyncDescription }}</div>
				<div :class="$style.row" v-for="s in syncItems" :key="s.id"><span>{{ s.label }}</span><button :class="[$style.sw, $style.swOn]"></button></div>
			</div>

			<!-- 起動時 -->
			<div :class="$style.card">
				<div :class="$style.label">{{ copy.startup }}</div>
				<div :class="$style.row"><span>{{ copy.openOnStartup }}</span><button :class="[$style.sw, settings.openOnStart && $style.swOn]" @click="toggle('openOnStart')"></button></div>
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

			<div :class="$style.note">{{ copy.savedNote }}</div>
			</template>
		</template>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { ref, shallowRef, computed, onMounted } from 'vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { useRouter } from '@/router.js';
import * as os from '@/os.js';

const emit = defineEmits<{ (ev:'closed'):void; (ev:'reopenTutorial'):void; (ev:'changed', settings:any):void }>();
const dialog = shallowRef<InstanceType<typeof MkModalWindow>>();
const router = useRouter();
const copy = i18n.ts._hata._hatask._settings;
const tx = i18n.tsx._hata._hatask._settings;

// Hatask本体と同じ registry スコープ/キーを使うことでデータを共有・同期する
const SCOPE = ['client', 'hatask'];
const defaultSettings: any = {
	darkMode: false,
	autoTheme: true,
	weekStart: 'mon',
	moodRemind: false,
	openOnStart: false,
	theme: 'kisetsu',
	animations: true,
};

// 旗鯖fork(v2): デザインテーマ(季/花信/刷)。プレビュー用にライト配色・見出しフォントを持つ。
const v2Themes = computed(() => [
	{ id:'kisetsu', name:copy.themeKisetsu, description:copy.themeKisetsuDescription, bg:'#f4f1ea', fg:'#211d18', accent:'#a8552f', card:'#ffffff', border:'1px solid #ddd7cb', radius:'5px', shadow:'none', head:"'Shippori Mincho B1','Zen Kaku Gothic New',serif" },
	{ id:'kashin', name:copy.themeKashin, description:copy.themeKashinDescription, bg:'#fff5e6', fg:'#25201c', accent:'#ff6b4a', card:'#ffffff', border:'2.5px solid #25201c', radius:'14px', shadow:'3px 3px 0 rgba(37,32,28,.15)', head:"'Zen Maru Gothic',sans-serif" },
	{ id:'suri', name:copy.themeSuri, description:copy.themeSuriDescription, bg:'#efe7d4', fg:'#1a1a2e', accent:'#2a52c0', card:'#ffffff', border:'2.5px solid #1a1a2e', radius:'0', shadow:'3px 3px 0 #ff4f9a', head:"'Zen Kaku Gothic Antique',sans-serif" },
]);
const syncItems = computed(() => [
	{ id: 'schedule', label: copy.syncSchedule },
	{ id: 'mood', label: copy.syncMood },
	{ id: 'todo', label: 'ToDo' },
	{ id: 'meal', label: copy.syncMeal },
	{ id: 'flower', label: copy.syncFlower },
]);

const loading = ref(true);
const settings = ref<any>({ ...defaultSettings });
// 旗鯖fork(v2): 設定モーダル内のビュー('main'=通常設定 / 'theme'=デザインテーマ選択)。
const view = ref<'main'|'theme'>('main');
function setV2Theme(id:string) { settings.value.theme = id; saveSettings(); }
function currentThemeLabel():string { const t = v2Themes.value.find(x => x.id === (settings.value.theme || 'kisetsu')); return t ? `${t.name} (${t.description})` : copy.themeKisetsu; }

// 旗鯖fork(v2): テーマ選択カルーセル(左右スライド)。選択中を中央・前後をフェードで両脇に。
const themeIndex = computed(() => { const i = v2Themes.value.findIndex(t => t.id === (settings.value.theme || 'kisetsu')); return i < 0 ? 0 : i; });
function themeCardStyle(i:number) {
	const off = i - themeIndex.value;
	const abs = Math.abs(off);
	return {
		transform: `translateX(calc(-50% + ${off * 76}%)) scale(${off === 0 ? 1 : 0.8})`,
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

async function registryGet<T>(key:string, fb:T):Promise<T> {
	try { const v = await misskeyApi('i/registry/get', { key, scope: SCOPE }); return (v != null ? v : fb) as T; } catch { return fb; }
}
async function registrySet(key:string, value:unknown):Promise<void> {
	try { await misskeyApi('i/registry/set', { key, value, scope: SCOPE }); } catch { /* noop */ }
}

onMounted(async () => {
	const s = await registryGet<any>('settings', { ...defaultSettings });
	settings.value = { ...defaultSettings, ...s };
	loading.value = false;
});

async function saveSettings() {
	// 旗鯖fork(v2): 変更を親(hatask.vue)へ即時通知して裏の画面にライブ反映させる。
	emit('changed', { ...settings.value });
	await registrySet('settings', settings.value);
}

function toggle(key:string) { settings.value[key] = !settings.value[key]; saveSettings(); }
function onWeekStart(ev:Event) { settings.value.weekStart = (ev.target as HTMLSelectElement).value; saveSettings(); }

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
</script>

<style lang="scss" module>
.root { display:flex; flex-direction:column; gap:14px; padding:18px 20px 22px; }
.loading { padding:40px 0; display:flex; justify-content:center; }
.card { background: var(--MI_THEME-panel); border:1px solid var(--MI_THEME-divider); border-radius:14px; padding:14px 16px; }
.label { font-size:.95rem; font-weight:700; margin-bottom:10px; }
.desc { font-size:.8rem; opacity:.65; line-height:1.6; margin-top:4px; }
.note { font-size:.8rem; opacity:.6; text-align:center; padding:4px 0 2px; }
.row { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:7px 0; font-size:.9rem; }
.sel { background: var(--MI_THEME-bg); color: var(--MI_THEME-fg); border:1px solid var(--MI_THEME-divider); border-radius:8px; padding:6px 10px; font-family:inherit; }
.bgPicker { display:flex; gap:14px; flex-wrap:wrap; }
.bgOpt { width:48px; height:48px; border-radius:12px; cursor:pointer; border:2px solid transparent; transition:border-color .15s, transform .15s; }
.bgOpt:hover { transform:translateY(-2px); }
.bgOptOn { border-color: var(--MI_THEME-accent); }
.bgLabel { font-size:.72rem; opacity:.7; margin-top:4px; }
/* トグルスイッチ */
.sw { width:44px; height:24px; background: var(--MI_THEME-divider); border-radius:12px; cursor:pointer; position:relative; transition:background .3s; border:1px solid var(--MI_THEME-divider); flex-shrink:0; }
.sw::after { content:''; position:absolute; width:18px; height:18px; background:#fff; border-radius:50%; top:2px; left:2px; transition:left .25s cubic-bezier(0.34,1.56,0.64,1); box-shadow:0 1px 3px rgba(0,0,0,.2); }
.swOn { background: var(--MI_THEME-accent); border-color: var(--MI_THEME-accent); }
.swOn::after { left:22px; }
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
.carViewport { position:relative; flex:1; min-width:0; height:238px; overflow:hidden; touch-action:pan-y; }
.carArrow { flex:0 0 auto; width:38px; height:38px; border-radius:999px; border:1px solid var(--MI_THEME-divider); background: var(--MI_THEME-buttonBg); color: var(--MI_THEME-fg); cursor:pointer; display:inline-flex; align-items:center; justify-content:center; font-size:1.25rem; transition:all .15s; &:hover:not(:disabled){ background: var(--MI_THEME-buttonHoverBg); border-color: var(--MI_THEME-accent); } &:disabled{ opacity:.32; cursor:not-allowed; } }
.themeCard { position:absolute; left:50%; top:4px; width:min(180px,74%); margin:0; display:flex; flex-direction:column; align-items:stretch; gap:6px; padding:10px 10px 12px; background: var(--MI_THEME-panel); border:2px solid var(--MI_THEME-divider); border-radius:14px; cursor:pointer; font-family:inherit; text-align:center; transition:transform .38s cubic-bezier(.4,0,.2,1), opacity .38s, filter .38s, border-color .2s; will-change:transform,opacity; }
.themeCardOn { border-color: var(--MI_THEME-accent); box-shadow:0 0 0 3px color-mix(in srgb, var(--MI_THEME-accent) 22%, transparent); }
.carDots { display:flex; justify-content:center; gap:7px; margin-top:6px; }
.carDot { width:8px; height:8px; border-radius:999px; border:none; background: var(--MI_THEME-divider); cursor:pointer; padding:0; transition:all .25s; }
.carDotOn { background: var(--MI_THEME-accent); width:22px; }
.themePrev { border-radius:9px; padding:10px 9px; display:flex; flex-direction:column; gap:6px; overflow:hidden; box-shadow:inset 0 0 0 1px rgba(0,0,0,.06); }
.themePrevLogo { font-size:1.15rem; line-height:1; text-align:left; }
.themePrevCard { padding:6px 8px; text-align:left; line-height:1; }
.themeName { font-size:1.15rem; font-weight:800; margin-top:2px; }
.themeJp { font-size:.72rem; opacity:.65; }
.themeCheck { display:inline-flex; align-items:center; justify-content:center; gap:4px; font-size:.76rem; font-weight:700; opacity:.6; margin-top:2px; > i { font-size:1em; } }
.themeCheckOn { opacity:1; color: var(--MI_THEME-accent); }

@media (max-width:520px) {
	.carViewport { height:224px; }
	.themeCard { width:min(168px,72%); }
	.carArrow { width:34px; height:34px; }
	.themeEntry { flex-wrap:wrap; }
	.themeEntryBtn { width:100%; justify-content:center; }
}
</style>
