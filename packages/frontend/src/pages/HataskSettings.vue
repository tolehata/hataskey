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
	<template #header>Hatask の設定</template>

	<div :class="$style.root">
		<div v-if="loading" :class="$style.loading">読み込み中…</div>
		<template v-else>
			<!-- 背景テーマ -->
			<div :class="$style.card">
				<div :class="$style.label">背景テーマ</div>
				<div :class="$style.bgPicker">
					<div v-for="bg in bgThemes" :key="bg.id" style="text-align:center">
						<div :class="[$style.bgOpt, settings.bgTheme===bg.id && $style.bgOptOn]" :style="{ background: bg.gradient }" @click="setBg(bg.id)"></div>
						<div :class="$style.bgLabel">{{ bg.label }}</div>
					</div>
				</div>
			</div>

			<!-- 外観 -->
			<div :class="$style.card">
				<div :class="$style.label">外観（ライト / ダーク）</div>
				<div :class="$style.row"><span>自動（端末の設定に従う）</span><button :class="[$style.sw, settings.autoTheme && $style.swOn]" @click="toggle('autoTheme')"></button></div>
				<div :class="$style.row" v-if="!settings.autoTheme"><span>ダークモード</span><button :class="[$style.sw, settings.darkMode && $style.swOn]" @click="toggle('darkMode')"></button></div>
				<div :class="$style.desc">ライトは白基調＋黒文字、ダークは黒基調＋白文字になります。背景のアニメーションは共通です。</div>
			</div>

			<!-- カレンダー -->
			<div :class="$style.card">
				<div :class="$style.label">カレンダー</div>
				<div :class="$style.row"><span>週の始まり</span>
					<select :class="$style.sel" :value="settings.weekStart" @change="onWeekStart($event)"><option value="mon">月曜</option><option value="sun">日曜</option></select>
				</div>
			</div>

			<!-- ホーム画面: セクション表示と並び替え(統合) -->
			<div :class="$style.card">
				<div :class="$style.label">ホーム画面 - セクション表示と並び替え</div>
				<div :class="$style.desc">トグルで表示/非表示、ドラッグ（☰）または上下ボタンで順番を変更できます。</div>
				<div :class="$style.reorderList">
					<div v-for="(sec,idx) in sectionOrder" :key="sec"
						:class="[$style.reorderItem, { [$style.dragover]: dragOverIdx===idx && dragSecIdx!==null, [$style.dragging]: dragSecIdx===idx }]"
						draggable="true"
						@dragstart="onSecDragStart(idx)" @dragover="onSecDragOver(idx,$event)" @drop="onSecDrop(idx)" @dragend="onSecDragEnd">
						<span :class="$style.handle">☰</span>
						<span :class="$style.reorderLabel">{{ sectionLabels[sec] || sec }}</span>
						<button :class="[$style.sw, isSectionVisible(sec) && $style.swOn]" style="margin-right:8px" @click="toggleSectionVisible(sec)"></button>
						<div :class="$style.reorderBtns">
							<button :class="$style.reorderBtn" :disabled="idx===0" @click="moveSectionUp(idx)">▲</button>
							<button :class="$style.reorderBtn" :disabled="idx===sectionOrder.length-1" @click="moveSectionDown(idx)">▼</button>
						</div>
					</div>
				</div>
			</div>

			<!-- データ同期 -->
			<div :class="$style.card">
				<div :class="$style.label">データ同期</div>
				<div :class="$style.desc">お使いの旗鯖アカウントに紐づけて同期します。</div>
				<div :class="$style.row" v-for="s in ['予定','きもち','ToDo','ごはん','お花']" :key="s"><span>{{ s }}</span><button :class="[$style.sw, $style.swOn]"></button></div>
			</div>

			<!-- 起動時 -->
			<div :class="$style.card">
				<div :class="$style.label">起動時</div>
				<div :class="$style.row"><span>アプリ起動時にHataskを表示</span><button :class="[$style.sw, settings.openOnStart && $style.swOn]" @click="toggle('openOnStart')"></button></div>
			</div>

			<!-- Hatask本体を開く(チュートリアル等、本体に依存する操作はこちらから) -->
			<div :class="$style.card">
				<div :class="$style.label">Hatask を開く</div>
				<div :class="$style.desc">チュートリアルの再表示やテスト通知など、一部の操作は Hatask の画面から行えます。</div>
				<MkButton primary rounded @click="openHatask"><i class="ti ti-external-link"></i> Hatask を開く</MkButton>
			</div>

			<div :class="$style.note">変更は保存され、次に Hatask を開いたときに反映されます。</div>
		</template>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { ref, shallowRef, onMounted } from 'vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkButton from '@/components/MkButton.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { mainRouter } from '@/router.js';

const emit = defineEmits<{ (ev:'closed'):void }>();
const dialog = shallowRef<InstanceType<typeof MkModalWindow>>();

// Hatask本体と同じ registry スコープ/キーを使うことでデータを共有・同期する
const SCOPE = ['client', 'hatask'];
const bgThemes = [
	{id:'purple',label:'パープル',gradient:'linear-gradient(145deg,#3a3744,#534e60)'},
	{id:'ocean',label:'オーシャン',gradient:'linear-gradient(145deg,#2d6a8f,#5bc0be)'},
	{id:'forest',label:'フォレスト',gradient:'linear-gradient(145deg,#2d5a27,#6bbd67)'},
	{id:'night',label:'ナイト',gradient:'linear-gradient(145deg,#0f0c29,#302b63)'},
];
const defaultSectionOrder = ['clock','eye','apps','loginDays','flower','events','mood','meal'];
const sectionLabels:Record<string,string> = {clock:'日時表示',eye:'Hatask Eye',apps:'旗鯖独自アプリ',loginDays:'ログイン日数',flower:'お花',events:'直近の予定',mood:'今週のきもち',meal:'ごはん記録'};
const sectionVisibilityKey:Record<string,string> = {clock:'showClock',eye:'showEye',apps:'showApps',loginDays:'showLoginDays',flower:'showFlower',events:'showEvents',mood:'showMoodSummary',meal:'showMealSection'};
const defaultSettings:any = { bgTheme:'ocean', darkMode:false, autoTheme:true, weekStart:'mon', showClock:true, showEvents:true, showFlower:true, showMoodSummary:true, showMealSection:true, openOnStart:false };

const loading = ref(true);
const settings = ref<any>({ ...defaultSettings });
const sectionOrder = ref<string[]>([...defaultSectionOrder]);

async function registryGet<T>(key:string, fb:T):Promise<T> {
	try { const v = await misskeyApi('i/registry/get', { key, scope: SCOPE }); return (v != null ? v : fb) as T; } catch { return fb; }
}
async function registrySet(key:string, value:unknown):Promise<void> {
	try { await misskeyApi('i/registry/set', { key, value, scope: SCOPE }); } catch { /* noop */ }
}

onMounted(async () => {
	const s = await registryGet<any>('settings', { ...defaultSettings });
	settings.value = { ...defaultSettings, ...s };
	// sectionOrder は settings 内に保存されている。妥当性を担保しつつ復元。
	const saved = Array.isArray(settings.value.sectionOrder) ? settings.value.sectionOrder : null;
	if (saved) {
		const valid = saved.filter((x:string) => defaultSectionOrder.includes(x));
		const missing = defaultSectionOrder.filter(x => !valid.includes(x));
		sectionOrder.value = [...valid, ...missing];
	} else {
		sectionOrder.value = [...defaultSectionOrder];
	}
	loading.value = false;
});

async function saveSettings() { await registrySet('settings', settings.value); }

function toggle(key:string) { settings.value[key] = !settings.value[key]; saveSettings(); }
function onWeekStart(ev:Event) { settings.value.weekStart = (ev.target as HTMLSelectElement).value; saveSettings(); }
function setBg(id:string) { settings.value.bgTheme = id; saveSettings(); }

function isSectionVisible(sec:string):boolean { const k = sectionVisibilityKey[sec]; if (!k) return true; return settings.value[k] !== false; }
function toggleSectionVisible(sec:string) { const k = sectionVisibilityKey[sec]; if (!k) return; settings.value[k] = settings.value[k] === false ? true : false; saveSettings(); }

function persistOrder() { settings.value.sectionOrder = [...sectionOrder.value]; saveSettings(); }
function moveSectionUp(idx:number) { if (idx<=0) return; const a=[...sectionOrder.value]; [a[idx-1],a[idx]]=[a[idx],a[idx-1]]; sectionOrder.value=a; persistOrder(); }
function moveSectionDown(idx:number) { if (idx>=sectionOrder.value.length-1) return; const a=[...sectionOrder.value]; [a[idx],a[idx+1]]=[a[idx+1],a[idx]]; sectionOrder.value=a; persistOrder(); }
function moveSection(from:number,to:number) { if (from===to||from<0||to<0||from>=sectionOrder.value.length||to>=sectionOrder.value.length) return; const a=[...sectionOrder.value]; const [m]=a.splice(from,1); a.splice(to,0,m); sectionOrder.value=a; persistOrder(); }

const dragSecIdx = ref<number|null>(null);
const dragOverIdx = ref<number|null>(null);
function onSecDragStart(idx:number){ dragSecIdx.value=idx; }
function onSecDragOver(idx:number,ev:DragEvent){ ev.preventDefault(); dragOverIdx.value=idx; }
function onSecDrop(idx:number){ if(dragSecIdx.value!==null) moveSection(dragSecIdx.value, idx); dragSecIdx.value=null; dragOverIdx.value=null; }
function onSecDragEnd(){ dragSecIdx.value=null; dragOverIdx.value=null; }

function openHatask() { dialog.value?.close(); mainRouter.push('/hatask'); }
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
/* 並び替えリスト */
.reorderList { display:flex; flex-direction:column; gap:5px; margin-top:8px; }
.reorderItem { display:flex; align-items:center; gap:8px; padding:8px 10px; background: var(--MI_THEME-bg); border:1px solid var(--MI_THEME-divider); border-radius:10px; font-size:.85rem; }
.dragging { opacity:.45; }
.dragover { outline:2px solid var(--MI_THEME-accent); outline-offset:1px; }
.handle { opacity:.5; cursor:grab; }
.reorderLabel { flex:1; }
.reorderBtns { display:flex; gap:2px; }
.reorderBtn { width:26px; height:24px; border:none; border-radius:6px; background: var(--MI_THEME-buttonBg); color: var(--MI_THEME-fg); cursor:pointer; &:hover{ background: var(--MI_THEME-buttonHoverBg); } &:disabled{ opacity:.3; cursor:not-allowed; } }
</style>
