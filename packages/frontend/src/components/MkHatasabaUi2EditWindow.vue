<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: HatasabaUI 2 の設定ウィンドウ。

- MkWindow ベースのフローティングウィンドウ (裏で HatasabaUI を見ながらリアルタイムに調整可)
- 上部/下部/プロフィール ぼかしや吹き出し、透過率スライダーをまとめて表示
- **バッファ + 明示保存** モデル。編集中の値はローカル ref に貯め、閉じても勝手に永続化しない
- 保存ボタンで一括 commit + localStorage 反映
- 初期値ボタンで default に戻す (ローカル ref のみ、閉じるか保存するまで永続化しない)
- ドラッグ中の透過率スライダーはローカル ref → CSS 変数だけを直接書き換えてライブプレビュー
  (prefer.commit は保存ボタン押下時のみ)
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="560"
	:initialHeight="720"
	:canResize="true"
	:closeButton="true"
	@closed="onWindowClosed"
>
	<template #header><i class="ti ti-sparkles" style="margin-right:.5em;"></i>HatasabaUI 2 の設定</template>

	<div class="_spacer" style="--MI_SPACER-min: 12px; --MI_SPACER-max: 20px;">
		<div :class="$style.hint">
			<i class="ti ti-info-circle"></i>
			<div>
				このウィンドウは<b>開いたまま HatasabaUI 全体を見比べられる</b>ように設計されています。編集中の値はプレビューとして即時反映されますが、<b>「保存」ボタンを押すまで永続化されません</b>。
			</div>
		</div>

		<!-- ===== 透過率スライダー (最上位) ===== -->
		<FormSection first>
			<template #label>ガラス面の透過率</template>
			<div v-if="!editedGlassUi" :class="$style.warnBanner">
				<i class="ti ti-info-circle"></i>HatasabaUI 2 が有効なときのみ機能します。
			</div>
			<div :class="$style.opacityDesc">
				ノートカード面と上部/下部ナビバーの<b>不透明度</b>を調整します。数字が大きいほど不透明パネル、小さいほど透け感が強くなります。既定 55%。
			</div>
			<div :class="$style.opacityRow">
				<!-- 旗鯖fork: v-model と @input を併用。v-model がバッファの ref を更新し、
				     @input が同期的に CSS 変数を書き換えてライブプレビューする。 -->
				<input
					type="range"
					min="0" max="100" step="1"
					v-model.number="editedOpacity"
					:disabled="!editedGlassUi"
					:class="$style.opacityRange"
					@wheel.prevent
					@input="onOpacityInput"
				/>
				<div :class="$style.opacityValue">{{ editedOpacity }}%</div>
				<button :class="$style.smallBtn" :disabled="!editedGlassUi || editedOpacity === 55" @click="setOpacity(55)" v-tooltip="'既定値 (55%) に戻す'"><i class="ti ti-restore"></i></button>
			</div>
		</FormSection>

		<!-- ===== HatasabaUI 2 有効化 / 吹き出し ===== -->
		<FormSection>
			<template #label>HatasabaUI 2</template>
			<div :class="$style.hataUi2Desc">
				<b>HatasabaUI 2</b> は、HatasabaUI 全体のデザインの統一をしつつ、使いやすく目に優しい UI デザインを目指して実装されています。<br>
				初回はデフォルトで有効です。<b>この端末にだけ</b>保存されます。
			</div>
			<!-- 旗鯖fork: v-model と @update:modelValue を併用。ref 更新と同時に <html> クラスを
			     即時反映してライブプレビュー。 -->
			<MkSwitch v-model="editedGlassUi" @update:modelValue="v => setGlassUi(v)">
				<template #label>HatasabaUI 2 を有効にする</template>
				<template #caption>ノート・プロフィール・リアクション・タブ・上部/下部ナビバーを、統一された半透明＋ぼかしのデザインで表示します。「ぼかし効果を減らす」設定を有効にしている場合は不透明な面にフォールバックします。</template>
			</MkSwitch>
			<MkSwitch v-if="editedGlassUi" v-model="editedGlassUiBubble" @update:modelValue="v => setGlassUiBubble(v)" style="margin-top: 12px;">
				<template #label>吹き出しデザインを表示する</template>
				<template #caption>HatasabaUI 2 のノートを、吹き出し（本文の枠＋＜の口）付きの表示にします。既定オフ（吹き出しなし・角丸カードのみ）です。<b>この端末にだけ</b>保存されます。</template>
			</MkSwitch>
		</FormSection>

		<!-- ===== 背景ヘッダー画像のぼかし ===== -->
		<FormSection>
			<template #label>背景ヘッダー画像のぼかし</template>
			<div v-if="!editedGlassUi" :class="$style.warnBanner">
				<i class="ti ti-info-circle"></i>これらの設定は HatasabaUI 2 が有効なときのみ機能します。
			</div>
			<MkSwitch v-model="editedNormalNoBannerBg" :disabled="!editedGlassUi">
				<template #label>通常タイムラインの背景ヘッダー画像のぼかしを使用しない</template>
				<template #caption>HatasabaUI 2 有効時、通常タイムライン背景にプロフィールのヘッダー画像のぼかしを敷きません。単色背景となり描画負荷が軽減されます。<br><b>※ この設定はライブプレビューされません (保存後・再描画で反映)。</b></template>
			</MkSwitch>
			<MkSwitch v-model="editedProfileNoBannerBg" @update:modelValue="v => setProfileNoBannerBg(v)" :disabled="!editedGlassUi">
				<template #label>プロフィールページのヘッダー画像のぼかしを使用しない</template>
				<template #caption>HatasabaUI 2 有効時、プロフィールカード背後のぼかしレイヤを描画しません。プロフィールカードは不透明パネルに戻り視認性が上がります。</template>
			</MkSwitch>
		</FormSection>
	</div>

	<!-- 旗鯖fork: MkWindow は #footer スロットを持たないため、body 末尾に footer を配置 -->
	<div :class="$style.footer">
		<MkButton :class="$style.resetBtn" @click="resetToDefault"><i class="ti ti-restore"></i> 初期値に戻す</MkButton>
		<div :class="$style.footerRight">
			<span v-if="hasChanges" :class="$style.unsavedTag"><i class="ti ti-alert-circle"></i> 未保存の変更あり</span>
			<MkButton @click="closeWithoutSave">閉じる</MkButton>
			<MkButton primary :disabled="!hasChanges" @click="save"><i class="ti ti-device-floppy"></i> 保存</MkButton>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { ref, computed, watch, useTemplateRef } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import MkButton from '@/components/MkButton.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import FormSection from '@/components/form/section.vue';
import { prefer } from '@/preferences.js';
import { PREF_DEF } from '@/preferences/def.js';
import {
	glassUiLocal, setGlassUiLocal,
	glassUiBubbleLocal, setGlassUiBubbleLocal,
} from '@/utility/hatasaba-device-prefs.js';
import * as os from '@/os.js';

const emit = defineEmits<{
	(ev: 'closed'): void;
	(ev: 'done', value: { saved: boolean }): void;
}>();

const dialog = useTemplateRef('dialog');

// ===== 現在値スナップショット (初期値・比較用) =====
const snapshot = {
	glassUi: glassUiLocal.value,
	glassUiBubble: glassUiBubbleLocal.value,
	normalNoBannerBg: prefer.r['simpleUi.normalNoBannerBg'].value,
	profileNoBannerBg: prefer.r['simpleUi.profileNoBannerBg'].value,
	opacity: prefer.r['simpleUi.glassUiCardOpacity'].value as number,
};

// ===== 編集バッファ =====
const editedGlassUi = ref(snapshot.glassUi);
const editedGlassUiBubble = ref(snapshot.glassUiBubble);
const editedNormalNoBannerBg = ref(snapshot.normalNoBannerBg);
const editedProfileNoBannerBg = ref(snapshot.profileNoBannerBg);
const editedOpacity = ref<number>(snapshot.opacity);

const hasChanges = computed(() =>
	editedGlassUi.value !== snapshot.glassUi
	|| editedGlassUiBubble.value !== snapshot.glassUiBubble
	|| editedNormalNoBannerBg.value !== snapshot.normalNoBannerBg
	|| editedProfileNoBannerBg.value !== snapshot.profileNoBannerBg
	|| editedOpacity.value !== snapshot.opacity,
);

// ===== ライブプレビュー =====
// 旗鯖fork: watch({immediate:false}) だと初回の変化を拾えないケース (Firefox の
// range input の @input が watch の flush まで DOM 更新を待つ等) があるため、
// 直接 @input / @update:modelValue から即時呼び出しで CSS 変数 / <html> クラスを書き換える。
// 保存押下まで prefer.commit しない (バッファのみ)。
// (キャンセルや閉じる時は snapshot 値に戻して視覚も元通り)
function onOpacityInput(e: Event) {
	const raw = Number((e.target as HTMLInputElement).value);
	if (!Number.isFinite(raw)) return;
	const n = Math.max(0, Math.min(100, Math.round(raw)));
	editedOpacity.value = n;
	document.documentElement.style.setProperty('--htk-glass-card-opacity', n + '%');
}
function setOpacity(n: number) {
	if (!Number.isFinite(n)) return;
	const v = Math.max(0, Math.min(100, Math.round(n)));
	editedOpacity.value = v;
	document.documentElement.style.setProperty('--htk-glass-card-opacity', v + '%');
}
function setGlassUi(v: boolean) {
	editedGlassUi.value = !!v;
	document.documentElement.classList.toggle('hataGlassUi', !!v);
}
function setGlassUiBubble(v: boolean) {
	editedGlassUiBubble.value = !!v;
	document.documentElement.classList.toggle('hataGlassUiBubble', !!v);
}
function setProfileNoBannerBg(v: boolean) {
	editedProfileNoBannerBg.value = !!v;
	document.documentElement.classList.toggle('hataProfileNoBannerBg', !!v);
}
// 旗鯖fork: normalNoBannerBg は simple.vue の timelineGlassBg computed が prefer.r 経由で読むため、
// バッファだけではライブプレビューできない (保存で prefer.commit → simple.vue 側の computed 更新)。
// UI の caption で「保存後に反映」と明示している。

// ===== 初期値に戻す =====
async function resetToDefault() {
	const c = await os.confirm({
		type: 'warning',
		title: '初期値に戻す',
		text: 'HatasabaUI 2 のすべての設定を初期値に戻します (この操作は保存前です — 「保存」を押さない限り永続化されません)',
	});
	if (c.canceled) return;
	editedGlassUi.value = true; // 自動 ON がデフォルト挙動
	editedGlassUiBubble.value = false;
	editedNormalNoBannerBg.value = (PREF_DEF['simpleUi.normalNoBannerBg'].default as boolean);
	editedProfileNoBannerBg.value = (PREF_DEF['simpleUi.profileNoBannerBg'].default as boolean);
	editedOpacity.value = (PREF_DEF['simpleUi.glassUiCardOpacity'].default as number);
}

// ===== 保存 =====
function save() {
	if (!hasChanges.value) {
		dialog.value?.close();
		return;
	}
	try {
		// glassUi / glassUiBubble は端末ローカル (miLocalStorage + <html> クラス反映)
		if (editedGlassUi.value !== snapshot.glassUi) setGlassUiLocal(editedGlassUi.value);
		if (editedGlassUiBubble.value !== snapshot.glassUiBubble) setGlassUiBubbleLocal(editedGlassUiBubble.value);
		// prefer 系はサーバー同期
		if (editedNormalNoBannerBg.value !== snapshot.normalNoBannerBg) prefer.commit('simpleUi.normalNoBannerBg', editedNormalNoBannerBg.value);
		if (editedProfileNoBannerBg.value !== snapshot.profileNoBannerBg) prefer.commit('simpleUi.profileNoBannerBg', editedProfileNoBannerBg.value);
		if (editedOpacity.value !== snapshot.opacity) {
			const n = Math.max(0, Math.min(100, Math.round(editedOpacity.value)));
			prefer.commit('simpleUi.glassUiCardOpacity', n);
		}
		os.success('HatasabaUI 2 の設定を保存しました。ページを再読み込みします...');
		emit('done', { saved: true });
		// 旗鯖fork: 保存後に即座にリロード。ライブプレビューで裏で書き換えた <html> クラス・
		// CSS 変数と、実際の prefer 値との間の齟齬を確実に解消 (フルリロードで全描画を刷新)。
		// 短い遅延でトーストの成功メッセージが視認できるようにする。
		setTimeout(() => { window.location.reload(); }, 300);
		// dialog.value?.close(); ← リロードするので不要
	} catch (err) {
		os.alert({
			type: 'error',
			title: '保存に失敗しました',
			text: 'もう一度お試しください。' + (err instanceof Error ? `\n\n詳細: ${err.message}` : ''),
		});
	}
}

// ===== 破棄して閉じる =====
// バッファに未保存変更があれば確認、破棄時はライブプレビューを snapshot に戻す
async function closeWithoutSave() {
	if (hasChanges.value) {
		const c = await os.confirm({
			type: 'warning',
			title: '変更を破棄しますか?',
			text: '保存していない変更があります。閉じると変更は失われ、開いた時の状態に戻ります。',
		});
		if (c.canceled) return;
	}
	// ライブプレビューで書き換えていた CSS 変数 / <html> クラスを snapshot に戻す
	restoreLivePreviewToSnapshot();
	emit('done', { saved: false });
	dialog.value?.close();
}

// MkWindow の close ボタン (X) 経由の閉じ処理
function onWindowClosed() {
	// snapshot に戻す (破棄扱い)
	restoreLivePreviewToSnapshot();
	emit('done', { saved: false });
	emit('closed');
}

function restoreLivePreviewToSnapshot() {
	document.documentElement.classList.toggle('hataGlassUi', snapshot.glassUi);
	document.documentElement.classList.toggle('hataGlassUiBubble', snapshot.glassUiBubble);
	document.documentElement.classList.toggle('hataProfileNoBannerBg', snapshot.profileNoBannerBg);
	document.documentElement.style.setProperty('--htk-glass-card-opacity', snapshot.opacity + '%');
}
</script>

<style lang="scss" module>
.hint {
	display: flex;
	gap: 10px;
	padding: 10px 12px;
	border-radius: 10px;
	background: var(--MI_THEME-accentedBg);
	color: var(--MI_THEME-fg);
	font-size: .82em;
	line-height: 1.55;
	margin-bottom: 12px;

	> i {
		flex-shrink: 0;
		color: var(--MI_THEME-accent);
		font-size: 1.1em;
		margin-top: 2px;
	}
}
.warnBanner {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: .82em;
	color: var(--MI_THEME-warn);
	margin-bottom: 8px;
	padding: 6px 10px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 8px;
	background: var(--MI_THEME-panel);
}
.opacityDesc, .hataUi2Desc {
	font-size: .85em;
	opacity: .8;
	margin-bottom: 10px;
	line-height: 1.55;
}
.opacityRow {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 4px 2px;
}
.opacityRange {
	flex: 1;
	min-width: 0;
	accent-color: var(--MI_THEME-accent);
	&:disabled { opacity: .4; cursor: not-allowed; }
}
.opacityValue {
	min-width: 3.2em;
	text-align: right;
	font-variant-numeric: tabular-nums;
	font-size: .95em;
	font-weight: 600;
	color: var(--MI_THEME-fg);
}
.smallBtn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px; height: 32px;
	border-radius: 999px;
	border: 1px solid var(--MI_THEME-divider);
	background: var(--MI_THEME-panel);
	color: var(--MI_THEME-fg);
	cursor: pointer;
	flex-shrink: 0;
	transition: background .15s, border-color .15s, opacity .15s;
	&:hover:not(:disabled) { background: var(--MI_THEME-accentedBg); border-color: var(--MI_THEME-accent); }
	&:disabled { opacity: .35; cursor: not-allowed; }
}

.footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
	padding: 12px 16px;
	border-top: 1px solid var(--MI_THEME-divider);
	flex-wrap: wrap;
	position: sticky;
	bottom: 0;
	background: var(--MI_THEME-panel);
}
.resetBtn { font-size: .85em; }
.footerRight {
	display: flex;
	gap: 8px;
	align-items: center;
	margin-left: auto;
}
.unsavedTag {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	color: #e74040;
	font-size: .82em;
	> i { margin-right: 2px; }
}
</style>
