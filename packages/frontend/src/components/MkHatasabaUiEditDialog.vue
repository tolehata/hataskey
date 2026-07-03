<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: HatasabaUI 設定モーダル。旧 hata-custom.vue の「Hatasaba UI」タブに散らばっていた
7 セクションをここに集約する。設計方針は MkSidebarEditDialog と同じで、上部/下部ナビの
並び替え・表示/非表示は「バッファに一度貯めて明示保存」形式にすることで、本番で発生していた
「並び替えがリロードでリセットされる」問題(watch(deep) 自動保存 の race か、途中で発火して
中途半端な配列で prefer.commit されていた等の候補)を根本的に断つ。
-->
<template>
<MkModalWindow
	ref="dialog"
	:width="640"
	:height="820"
	@close="closeWithoutSave"
	@closed="emit('closed')"
>
	<template #header>HatasabaUI の設定</template>

	<div class="_spacer" style="--MI_SPACER-min: 16px; --MI_SPACER-max: 24px;">
		<div :class="$style.hint">
			<i class="ti ti-info-circle"></i>
			<div>
				HatasabaUI に関する設定をここにまとめました。<br>
				上部/下部ナビバーの<b>並び替えと表示/非表示は編集後に「保存」ボタンを押すとサーバーに反映</b>されます (ログイン中の全端末に同期)。それ以外の項目は変更即時反映です。
			</div>
		</div>

		<!-- ===== 1. トレンドタブ / メニュー位置 / デッキ表示 (即時) ===== -->
		<FormSection first>
			<template #label>基本</template>
			<MkSwitch v-model="showTrendingTab">
				<template #label>トレンドタブを表示する</template>
				<template #caption>上部ナビバーの最右に「トレンド」タブを表示します。過去 7 日間で反応が多かった投稿をランダム順で表示する発見系タイムラインです。</template>
			</MkSwitch>
			<MkSwitch v-model="topNavMode">
				<template #label>メニューを画面上部に表示する</template>
				<template #caption>ON にすると、左のサイドバーの代わりに画面上部へ横並びナビバーを表示します。デスクトップ表示でのみ有効。</template>
			</MkSwitch>
			<MkSwitch v-model="deckIgnoreWidthModel">
				<template #label>画面幅に関係なくデッキを表示する</template>
				<template #caption>通常デッキはデスクトップ幅 (1100px 以上) でのみ有効ですが、ON で画面幅に関係なくデッキモードを適用します。<b>この設定は端末ごとに保存され、他の端末には同期されません。</b></template>
			</MkSwitch>
			<div :class="$style.subActions">
				<button class="_button" :class="$style.subBtn" @click="onReplayDeckTutorial"><i class="ti ti-refresh"></i> デッキUIチュートリアルをもう一度</button>
			</div>
		</FormSection>

		<!-- ===== 2. 上部ナビバー (バッファ保存) ===== -->
		<FormSection>
			<template #label>上部ナビバー (タイムラインタブ)</template>
			<div :class="$style.reorderHead">
				<div :class="$style.reorderHint">表示するタブとその順番を設定します。編集後、下の「保存」ボタンで確定します。</div>
				<button :class="$style.resetBtn" @click="resetTopNav"><i class="ti ti-restore"></i> 並び順を初期化</button>
			</div>
			<draggable
				v-model="editedTopNav"
				:class="$style.reorderList"
				itemKey="id"
				handle=".htkNavDragHandle"
				ghostClass="htkNavDragGhost"
				:animation="150"
			>
				<template #item="{element: item, index: idx}">
					<div :class="[$style.reorderItem, item.visible === false ? $style.reorderItemHidden : '']">
						<button :class="['htkNavDragHandle', $style.handle]" v-tooltip="'ドラッグで並び替え'" tabindex="-1"><i class="ti ti-grip-vertical"></i></button>
						<MkSwitch
							:modelValue="item.visible !== false"
							:class="$style.reorderToggle"
							@update:modelValue="v => setTopNavVisible(idx, v)"
						/>
						<i :class="[item.icon, $style.reorderIcon]"></i>
						<span :class="$style.reorderLabel">{{ item.label }}</span>
					</div>
				</template>
			</draggable>
		</FormSection>

		<!-- ===== 3. 下部ナビバー (モバイルのみ有効・バッファ保存) ===== -->
		<FormSection>
			<template #label>下部ナビバー (モバイル)</template>
			<!-- 下部ナビが現在このデバイスで表示されない場合はグレーアウトして操作不可 -->
			<div v-if="!isBottomNavVisible" :class="$style.disabledNote">
				<i class="ti ti-device-desktop"></i>
				<div>下部ナビバーは<b>モバイル (縦型/狭い画面)</b> のときのみ表示されます。現在の画面ではプレビュー・編集できません。<br>スマートフォンでこのモーダルを開くと編集できます。</div>
			</div>
			<fieldset :class="[$style.bottomNavFieldset, !isBottomNavVisible ? $style.bottomNavFieldsetDisabled : '']" :disabled="!isBottomNavVisible">
				<div :class="$style.reorderHead">
					<div :class="$style.reorderHint">表示する項目 (最大 4 つ) と順番を設定します。編集後、下の「保存」ボタンで確定します。</div>
					<button :class="$style.resetBtn" :disabled="!isBottomNavVisible" @click="resetBottomNav"><i class="ti ti-restore"></i> 並び順を初期化</button>
				</div>
				<draggable
					v-model="editedBottomNav"
					:class="$style.reorderList"
					itemKey="id"
					handle=".htkNavDragHandle"
					ghostClass="htkNavDragGhost"
					:animation="150"
					:disabled="!isBottomNavVisible"
				>
					<template #item="{element: item, index: idx}">
						<div :class="[$style.reorderItem, item.visible === false ? $style.reorderItemHidden : '']">
							<button :class="['htkNavDragHandle', $style.handle]" v-tooltip="'ドラッグで並び替え'" tabindex="-1"><i class="ti ti-grip-vertical"></i></button>
							<MkSwitch
								:modelValue="item.visible !== false"
								:class="$style.reorderToggle"
								@update:modelValue="v => setBottomNavVisible(idx, v)"
							/>
							<i :class="[item.icon, $style.reorderIcon]"></i>
							<span :class="$style.reorderLabel">{{ item.label }}</span>
						</div>
					</template>
				</draggable>
				<div v-if="editedBottomNav.filter(i => i.visible !== false).length > 4" :class="$style.warning">
					<i class="ti ti-alert-triangle"></i> 最大 4 つまで表示できます。超過分は非表示になります。
				</div>
			</fieldset>
		</FormSection>

		<!-- ===== 4. サイドメニュー ===== -->
		<FormSection>
			<template #label>サイドメニュー (サイドバー / ドロワー)</template>
			<div :class="$style.reorderHint" style="margin-bottom:10px;">
				並び替え・表示/非表示は<b>専用モーダル</b>で行います。ドラッグでグループ越え可・明示保存でサーバー同期。
			</div>
			<button class="_buttonPrimary" :class="$style.openSidebarBtn" @click="openSidebarEditDialog"><i class="ti ti-edit"></i> サイドバーを編集する</button>
		</FormSection>
	</div>

	<template #footer>
		<div :class="$style.footer">
			<div :class="$style.footerLeft">
				<span v-if="hasNavChanges" :class="$style.unsavedTag"><i class="ti ti-alert-circle"></i> 未保存の変更あり</span>
			</div>
			<div :class="$style.footerRight">
				<MkButton @click="closeWithoutSave">閉じる</MkButton>
				<MkButton primary :disabled="!hasNavChanges" @click="saveNav"><i class="ti ti-device-floppy"></i> 保存</MkButton>
			</div>
		</div>
	</template>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount, useTemplateRef } from 'vue';
import draggable from 'vuedraggable';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkButton from '@/components/MkButton.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import FormSection from '@/components/form/section.vue';
import { prefer } from '@/preferences.js';
import { getInitialPrefValue } from '@/preferences/manager.js';
import { deckIgnoreWidth, setDeckIgnoreWidth } from '@/utility/hatasaba-device-prefs.js';
import { miLocalStorage } from '@/local-storage.js';
import * as os from '@/os.js';

const emit = defineEmits<{
	(ev: 'closed'): void;
	(ev: 'done', value: { saved: boolean }): void;
}>();

const dialog = useTemplateRef('dialog');

// ===== 即時反映系 =====
const showTrendingTab = computed({
	get: () => prefer.r['simpleUi.showTrendingTab'].value,
	set: (v: boolean) => prefer.commit('simpleUi.showTrendingTab', v),
});
const topNavMode = computed({
	get: () => prefer.r['simpleUi.topNavMode'].value,
	set: (v: boolean) => prefer.commit('simpleUi.topNavMode', v),
});
const deckIgnoreWidthModel = computed({
	get: () => deckIgnoreWidth.value,
	set: (v: boolean) => setDeckIgnoreWidth(v),
});

// ===== ナビ (バッファ保存) =====
// 旗鯖fork: 現在値を deep clone してバッファに置き、明示保存まで prefer.commit しない。
// 旧実装 (hata-custom.vue) の watch(deep) 自動保存だと、下部ナビの並び替え・非表示状態が
// 本番ユーザーでリロード時にリセットされていた (再現困難な race 状態が疑われる)。
// バッファ化 + 明示保存 でこの窓を閉じる。
const editedTopNav = ref<any[]>(JSON.parse(JSON.stringify(prefer.s['simpleUi.topNav'] ?? [])));
const editedBottomNav = ref<any[]>(JSON.parse(JSON.stringify(prefer.s['simpleUi.bottomNav'] ?? [])));
const initialTopNavSnapshot = JSON.stringify(editedTopNav.value);
const initialBottomNavSnapshot = JSON.stringify(editedBottomNav.value);

const hasNavChanges = computed(() =>
	JSON.stringify(editedTopNav.value) !== initialTopNavSnapshot
	|| JSON.stringify(editedBottomNav.value) !== initialBottomNavSnapshot,
);

function setTopNavVisible(idx: number, visible: boolean) {
	editedTopNav.value = editedTopNav.value.map((it, i) => i === idx ? { ...it, visible } : it);
}
function setBottomNavVisible(idx: number, visible: boolean) {
	editedBottomNav.value = editedBottomNav.value.map((it, i) => i === idx ? { ...it, visible } : it);
}

async function resetTopNav() {
	const c = await os.confirm({ type: 'warning', title: '初期値に戻す', text: '上部ナビバーの並び順と表示状態を初期値に戻します。よろしいですか?' });
	if (c.canceled) return;
	editedTopNav.value = JSON.parse(JSON.stringify(getInitialPrefValue('simpleUi.topNav')));
}
async function resetBottomNav() {
	const c = await os.confirm({ type: 'warning', title: '初期値に戻す', text: '下部ナビバーの並び順と表示状態を初期値に戻します。よろしいですか?' });
	if (c.canceled) return;
	editedBottomNav.value = JSON.parse(JSON.stringify(getInitialPrefValue('simpleUi.bottomNav')));
}

async function saveNav() {
	if (!hasNavChanges.value) return;
	try {
		prefer.commit('simpleUi.topNav', JSON.parse(JSON.stringify(editedTopNav.value)));
		prefer.commit('simpleUi.bottomNav', JSON.parse(JSON.stringify(editedBottomNav.value)));
		os.success('ナビバーの設定をサーバーに保存しました。ログイン中の全端末で反映されます。');
		emit('done', { saved: true });
		dialog.value?.close();
	} catch (err) {
		os.alert({
			type: 'error',
			title: '保存に失敗しました',
			text: 'もう一度お試しいただくか、しばらくしてからやり直してください。' + (err instanceof Error ? `\n\n詳細: ${err.message}` : ''),
		});
	}
}

async function closeWithoutSave() {
	if (hasNavChanges.value) {
		const c = await os.confirm({
			type: 'warning',
			title: '変更を破棄しますか?',
			text: 'ナビバーに保存していない変更があります。閉じると変更は失われます。',
		});
		if (c.canceled) return;
	}
	emit('done', { saved: false });
	dialog.value?.close();
}

// ===== 下部ナビ現在表示中判定 (グレーアウト条件) =====
// simple.vue と同じロジックで、下部ナビが実際にこのデバイスで表示されるかを判定。
// 表示条件: !isDesktop (画面幅 < 1100px) または deckIgnoreWidth かつ deckMode。
// HatasabaUI (ui='simple') 前提。他 UI では下部ナビ自体が存在しないため無効化する。
const DESKTOP_THRESHOLD = 1100;
const windowWidth = ref(typeof window === 'undefined' ? DESKTOP_THRESHOLD : window.innerWidth);
function onResize() { windowWidth.value = window.innerWidth; }
onMounted(() => { window.addEventListener('resize', onResize, { passive: true }); });
onBeforeUnmount(() => { window.removeEventListener('resize', onResize); });

const isHatasabaUi = computed(() => miLocalStorage.getItem('ui') === 'simple');
const isDeckModeOn = computed(() => (prefer.r['simpleUi.deckMode']?.value as boolean | undefined) === true);
const isDesktop = computed(() => (deckIgnoreWidth.value && isDeckModeOn.value) ? true : windowWidth.value >= DESKTOP_THRESHOLD);
const isBottomNavVisible = computed(() => isHatasabaUi.value && !isDesktop.value);

// ===== サイドメニュー編集モーダル起動 =====
async function openSidebarEditDialog() {
	const { dispose } = os.popup(
		(await import('@/components/MkSidebarEditDialog.vue')).default,
		{},
		{
			done: () => { /* noop */ },
			closed: () => dispose(),
		},
	);
}

// ===== デッキUIチュートリアル再表示 =====
function onReplayDeckTutorial() {
	// hata-custom.vue の replayDeckTutorial と同じ振る舞い (localStorage フラグを外して再表示させる)。
	miLocalStorage.removeItem('hatasabaDeckTutorialDone');
	prefer.commit('simpleUi.deckTutorialDone', false);
	os.success('チュートリアルフラグをリセットしました。次にデッキUIを表示するとチュートリアルが再度表示されます。');
}
</script>

<style lang="scss" module>
.hint {
	display: flex;
	gap: 10px;
	padding: 12px 14px;
	border-radius: 12px;
	background: var(--MI_THEME-accentedBg);
	color: var(--MI_THEME-fg);
	font-size: .84em;
	line-height: 1.55;
	margin-bottom: 16px;

	> i {
		flex-shrink: 0;
		color: var(--MI_THEME-accent);
		font-size: 1.15em;
		margin-top: 2px;
	}
}

.subActions {
	margin-top: 12px;
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}
.subBtn {
	padding: 8px 14px;
	font-size: .88em;
	border-radius: 999px;
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	cursor: pointer;
	&:hover { background: var(--MI_THEME-accentedBg); border-color: var(--MI_THEME-accent); }
	> i { margin-right: 6px; }
}

.reorderHead {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 10px;
	flex-wrap: wrap;
}
.reorderHint {
	flex: 1;
	min-width: 180px;
	font-size: .85em;
	opacity: .75;
	line-height: 1.5;
}
.resetBtn {
	padding: 6px 12px;
	font-size: .82em;
	border-radius: 999px;
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	cursor: pointer;
	white-space: nowrap;
	&:hover:not(:disabled) { background: var(--MI_THEME-accentedBg); border-color: var(--MI_THEME-accent); }
	&:disabled { opacity: .4; cursor: not-allowed; }
	> i { margin-right: 4px; }
}

.reorderList {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.reorderItem {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 10px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 12px;
	background: var(--MI_THEME-panel);
	transition: opacity .15s;
}
.reorderItemHidden { opacity: .42; }
.handle {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border: none;
	background: none;
	color: var(--MI_THEME-fgTransparentWeak, var(--MI_THEME-fg));
	cursor: grab;
	border-radius: 8px;
	flex-shrink: 0;

	&:hover { background: var(--MI_THEME-bg); }
	&:active { cursor: grabbing; }
}
.reorderToggle {
	flex-shrink: 0;
	transform: scale(.85);
	transform-origin: left center;
	margin: 0;
}
.reorderIcon {
	font-size: 1.1em;
	color: var(--MI_THEME-fg);
	flex-shrink: 0;
	width: 1.4em;
	text-align: center;
}
.reorderLabel {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.warning {
	margin-top: 8px;
	padding: 6px 10px;
	color: #e74040;
	font-size: .85em;
	border-radius: 8px;
	background: color-mix(in srgb, #e74040 12%, transparent);
}

.disabledNote {
	display: flex;
	gap: 10px;
	padding: 10px 12px;
	border-radius: 10px;
	background: var(--MI_THEME-panel);
	border: 1px dashed var(--MI_THEME-divider);
	color: var(--MI_THEME-fg);
	font-size: .83em;
	line-height: 1.55;
	margin-bottom: 10px;

	> i {
		flex-shrink: 0;
		color: var(--MI_THEME-fgTransparentWeak, var(--MI_THEME-fg));
		font-size: 1.15em;
		margin-top: 2px;
	}
}
.bottomNavFieldset {
	border: none;
	padding: 0;
	margin: 0;
}
.bottomNavFieldsetDisabled { opacity: .45; pointer-events: none; }

.openSidebarBtn {
	padding: 10px 20px;
	font-weight: bold;
	> i { margin-right: 6px; }
}

.footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
	padding: 12px 16px;
	border-top: 1px solid var(--MI_THEME-divider);
	flex-wrap: wrap;
}
.footerLeft {
	flex: 1;
	min-width: 0;
	font-size: .82em;
	color: var(--MI_THEME-warn, var(--MI_THEME-fg));
	> .unsavedTag > i { margin-right: 4px; }
}
.unsavedTag {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	color: #e74040;
}
.footerRight {
	display: flex;
	gap: 8px;
}
</style>

<style>
/* 旗鯖fork: vuedraggable の ghost クラスは scoped CSS Modules では当たらないため global で定義 */
.htkNavDragGhost {
	opacity: .35;
	background: var(--MI_THEME-accentedBg) !important;
}
</style>
