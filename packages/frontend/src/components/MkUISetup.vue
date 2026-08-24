<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only

旗鯖fork: UI 選択ダイアログ (リデザイン案 1a「コマンドセンター / ダークガラス」)。
	- Hataskey UI (ui='simple') を唯一の推奨=デフォルトとしてヒーローで大きく提示し、
	  「通常表示」と「高機能デッキ」を1つのUIで両立できることを2機能プレビューで訴求する。
	- Misskey UI (ui='default') / 従来のデッキUI (ui='deck') は「非推奨」として
	  折りたたみ (disclosure) の中に退避する。
	- 配色はユーザー設定のテーマカラー (--MI_THEME-accent) を起点に color-mix で派生。
	  緑等のハードコードは持たない。
	- ワードマーク「Hataskey UI」のみ Righteous (同梱・OFL)。日本語は継承フォント。
	- 選択・保存・リロードの既存ロジック (miLocalStorage + location.reload) は変更しない。
-->
<template>
<MkModal ref="modal" :preferType="'dialog'" :disableBgBlur="true" @click="close" @closed="emit('closed')">
	<div :class="$style.root" role="dialog" aria-modal="true" aria-labelledby="mkuisetup-title">
		<!-- ===== ヘッダー ===== -->
		<header :class="$style.header">
			<div :class="$style.headerText">
				<div :class="$style.headerEyebrow">{{ i18n.tsx._hata._uiSetup.hereIs({ instance: instanceName }) }}</div>
				<h1 id="mkuisetup-title" :class="$style.headerTitle">{{ copy.question }}</h1>
			</div>
		</header>

		<!-- ===== ヒーロー: Hataskey UI ===== -->
		<div :class="$style.hero">
			<div :class="$style.heroBadge">{{ copy.default }}</div>

			<div :class="$style.heroTop">
				<h2 :class="$style.wordmark">Hataskey UI</h2>
			</div>
			<p :class="$style.heroLead"><b :class="$style.heroLeadStrong">{{ copy.heroLead }}</b>{{ copy.heroLeadSuffix }}</p>

			<!-- 2機能プレビュー (装飾のため aria-hidden) -->
			<div :class="$style.features">
				<!-- 通常表示 -->
				<div :class="$style.feature">
					<div :class="$style.featPreview" aria-hidden="true">
						<div :class="$style.phone">
							<!-- 上部ピルナビ -->
							<div :class="$style.phonePill">
								<i class="ti ti-planet" :class="$style.phonePillIcon"></i>
								<div :class="$style.phonePillActive"><i class="ti ti-home"></i></div>
								<i class="ti ti-flame" :class="$style.phonePillIcon"></i>
								<i class="ti ti-list" :class="$style.phonePillIcon"></i>
								<i class="ti ti-device-tv" :class="$style.phonePillIcon"></i>
							</div>
							<!-- ノート1 -->
							<div :class="$style.phoneNote">
								<div :class="[$style.phoneAvatar, $style.phoneAvatarA]"></div>
								<div :class="$style.noteBody">
									<div :class="$style.noteHead"><span :class="$style.bar" style="width:32px;opacity:.5"></span><span :class="$style.bar" style="width:20px;opacity:.22"></span><span :class="[$style.bar, $style.barPush]" style="width:15px;opacity:.15"></span></div>
									<span :class="$style.bar" style="width:100%;opacity:.2"></span>
									<span :class="$style.bar" style="width:64%;opacity:.16"></span>
									<div :class="$style.noteActions"><i class="ti ti-arrow-back-up"></i><i class="ti ti-repeat"></i><i class="ti ti-mood-smile"></i><i class="ti ti-quote"></i><i class="ti ti-dots"></i></div>
								</div>
							</div>
							<!-- ノート2 -->
							<div :class="$style.phoneNote">
								<div :class="[$style.phoneAvatar, $style.phoneAvatarB]"></div>
								<div :class="$style.noteBody">
									<div :class="$style.noteHead"><span :class="$style.bar" style="width:28px;opacity:.5"></span><span :class="$style.bar" style="width:22px;opacity:.22"></span><span :class="[$style.bar, $style.barPush]" style="width:15px;opacity:.15"></span></div>
									<span :class="$style.bar" style="width:90%;opacity:.2"></span>
									<div :class="$style.noteActions"><i class="ti ti-arrow-back-up"></i><i class="ti ti-repeat"></i><i class="ti ti-mood-smile"></i><i class="ti ti-quote"></i><i class="ti ti-dots"></i></div>
								</div>
							</div>
							<!-- 下部ナビ + 投稿FAB -->
							<div :class="$style.phoneBottom">
								<div :class="$style.phoneNav">
									<i class="ti ti-menu-2"></i>
									<i class="ti ti-search"></i>
									<div :class="$style.phoneNavActive"><i class="ti ti-home"></i></div>
									<i class="ti ti-bell"></i>
									<i class="ti ti-eye"></i>
								</div>
								<div :class="$style.phoneFab"><i class="ti ti-pencil"></i></div>
							</div>
						</div>
					</div>
					<div :class="$style.featMeta">
						<div :class="$style.featLabel"><i class="ti ti-device-mobile" :class="$style.featLabelIcon"></i>{{ copy.normal }}</div>
						<div :class="$style.featDesc">{{ copy.normalDescription }}</div>
					</div>
				</div>

				<!-- 高機能デッキ (モバイルでは表示領域節約のため折りたたみ) -->
				<div :class="[$style.feature, $style.featureDeck]">
					<div :class="[$style.featPreview, { [$style.featPreviewCollapsed]: !deckPreviewOpen }]" aria-hidden="true">
						<div :class="$style.deckWrap">
							<div :class="$style.deckCol">
								<div :class="$style.deckColHead"><i class="ti ti-home" :class="$style.deckColHeadIcon"></i><span :class="$style.bar" style="width:26px;opacity:.28"></span></div>
								<span :class="$style.bar" style="width:100%;opacity:.16"></span><span :class="$style.bar" style="width:70%;opacity:.13"></span><span :class="$style.bar" style="width:90%;opacity:.15"></span><span :class="$style.bar" style="width:55%;opacity:.12"></span>
							</div>
							<div :class="$style.deckCol">
								<div :class="$style.deckColHead"><i class="ti ti-world" :class="$style.deckColHeadIcon"></i><span :class="$style.bar" style="width:22px;opacity:.28"></span></div>
								<span :class="$style.bar" style="width:80%;opacity:.15"></span><span :class="$style.bar" style="width:100%;opacity:.16"></span><span :class="$style.bar" style="width:60%;opacity:.12"></span><span :class="$style.bar" style="width:85%;opacity:.14"></span>
							</div>
							<div :class="$style.deckCol">
								<div :class="$style.deckColHead"><i class="ti ti-bell" :class="$style.deckColHeadIcon"></i><span :class="$style.bar" style="width:18px;opacity:.28"></span></div>
								<span :class="$style.bar" style="width:70%;opacity:.13"></span><span :class="$style.bar" style="width:90%;opacity:.15"></span><span :class="$style.bar" style="width:50%;opacity:.11"></span>
							</div>
						</div>
					</div>
					<div :class="$style.featMeta">
						<button type="button" :class="$style.deckLabelBtn" :aria-expanded="deckPreviewOpen" @click="deckPreviewOpen = !deckPreviewOpen">
							<span :class="$style.featLabel"><i class="ti ti-columns" :class="$style.featLabelIcon"></i>{{ copy.advancedDeck }}<span :class="$style.newBadge">NEW</span><i class="ti ti-chevron-down" :class="[$style.deckChev, { [$style.deckChevOpen]: deckPreviewOpen }]"></i></span>
						</button>
						<div :class="$style.featDesc">{{ copy.advancedDeckDescription }}</div>
					</div>
				</div>
			</div>

			<!-- 主 CTA -->
			<button :class="$style.cta" @click="select('simple')">
				<i class="ti ti-arrow-right" :class="$style.ctaIcon"></i>{{ copy.continueHatasaba }}
			</button>
		</div>

		<!-- ===== 通常候補: HataSNSCordUI（Hataskey UIの次に常時表示） ===== -->
		<section :class="$style.cordChoice" aria-labelledby="hata-sns-cord-ui-title">
			<div :class="$style.cordChoiceInner">
				<div :class="$style.cordChoiceIntro">
					<img
						:class="$style.cordChoiceMascot"
						src="/client-assets/hatacording/mascot-shiba-v1.webp"
						alt=""
						width="72"
						height="72"
						decoding="async"
						draggable="false"
						aria-hidden="true"
					>
					<div>
						<div id="hata-sns-cord-ui-title" :class="$style.cordChoiceWordmark">HataSNSCordUI</div>
						<p>{{ copy.hatacordingDescription }}</p>
					</div>
				</div>

				<div :class="$style.cordMock" aria-hidden="true">
					<div :class="$style.cordMockLeft">
						<div :class="$style.cordMockServer"><span :class="$style.cordMockServerIcon"></span><b>Hataskey</b><SlidersHorizontal :size="8"/></div>
						<div :class="$style.cordMockNav"><span :class="$style.cordMockNavActive"><Home :size="9"/>{{ copy.home }}</span><span><Globe2 :size="9"/>{{ copy.local }}</span><span><Search :size="9"/>{{ copy.search }}</span><span><Bell :size="9"/>{{ copy.notifications }}</span></div>
						<div :class="$style.cordMockCollections"><span><List :size="8"/>{{ copy.list }}</span><span><Radio :size="8"/>{{ copy.antenna }}</span></div>
						<div :class="$style.cordMockAccount"><UserRound :size="9"/><span>{{ copy.mockUser }}</span></div>
					</div>
					<div :class="$style.cordMockCenter">
						<div :class="$style.cordMockTitle"><span><Home :size="8"/>{{ copy.home }}</span><span :class="$style.cordMockStatus">● {{ i18n.tsx._hata._uiSetup.activeUsers({ count: 42 }) }}</span></div>
						<div :class="$style.cordMockFeed">
							<div :class="$style.cordMockOther"><span :class="$style.cordMockAvatar"></span><div><b>{{ copy.mockFlorist }}</b><i></i><i></i><small>↩︎ · ↻ · ♡ · •••</small></div></div>
							<div :class="$style.cordMockOwn"><div><b>{{ copy.mockUser }}</b><i></i><small>↩︎ · ↻ · ♡ · •••</small></div></div>
							<div :class="$style.cordMockOther"><span :class="[$style.cordMockAvatar, $style.cordMockAvatarAlt]"></span><div><b>{{ copy.mockCourier }}</b><i></i><i></i><small>↩︎ · ↻ · ♡ · •••</small></div></div>
						</div>
						<div :class="$style.cordMockComposer"><Star :size="8"/><CloudUpload :size="8"/><span>{{ copy.whatsHappening }}</span><ArrowUp :size="9"/></div>
					</div>
					<div :class="$style.cordMockRight">
						<div :class="$style.cordMockTabs"><span>{{ copy.noteDetails }}</span><span>{{ copy.notifications }}</span><Plus :size="8"/></div>
						<div :class="$style.cordMockDetail"><span :class="$style.cordMockProfile"></span><b>{{ copy.noteInformation }}</b><i></i><i></i><div><Bell :size="10"/><small>{{ copy.subpaneHint }}</small></div></div>
					</div>
				</div>

				<button :class="$style.cordChoiceCta" @click="selectHatacording"><MessageSquareText :size="17"/><span>{{ copy.useHatacording }}</span><ChevronRight :size="17"/></button>
			</div>
		</section>

		<!-- ===== 折りたたみ: その他のUI (非推奨) ===== -->
		<div :class="$style.disc">
			<button :class="$style.discToggle" :aria-expanded="showOthers" @click="showOthers = !showOthers">
				<i class="ti ti-chevron-down" :class="[$style.discChev, { [$style.discChevOpen]: showOthers }]"></i>
				<span :class="$style.discToggleText">{{ copy.otherUiWarning }}</span>
				<span :class="$style.depBadge">{{ copy.notRecommended }}</span>
			</button>
			<div :class="[$style.discBody, { [$style.discBodyOpen]: showOthers }]">
				<div :class="$style.discInner">
					<!-- Misskey UI -->
					<button :class="$style.depCard" @click="selectDeprecated('default')">
						<div :class="$style.depThumb" aria-hidden="true">
							<div :class="$style.depThumbSidebar"></div>
							<div :class="$style.depThumbBody"><span :class="$style.bar" style="width:100%;opacity:.16"></span><span :class="$style.bar" style="width:70%;opacity:.12"></span><span :class="$style.bar" style="width:85%;opacity:.13"></span></div>
						</div>
						<div :class="$style.depInfo">
							<div :class="$style.depTitleRow"><span :class="$style.depTitle">Misskey UI</span><span :class="$style.depBadgeSolid">{{ copy.notRecommended }}</span></div>
							<div :class="$style.depDesc">{{ copy.misskeyDescription }}</div>
						</div>
						<span :class="$style.depSelect">{{ copy.select }} <i class="ti ti-chevron-right"></i></span>
					</button>
					<!-- 従来のデッキUI -->
					<button :class="$style.depCard" @click="selectDeprecated('deck')">
						<div :class="$style.depThumb" aria-hidden="true">
							<span :class="$style.depThumbCol" style="opacity:.14"></span><span :class="$style.depThumbCol" style="opacity:.12"></span><span :class="$style.depThumbCol" style="opacity:.1"></span>
						</div>
						<div :class="$style.depInfo">
							<div :class="$style.depTitleRow"><span :class="$style.depTitle">{{ copy.legacyDeck }}</span><span :class="$style.depBadgeSolid">{{ copy.notRecommended }}</span></div>
							<div :class="$style.depDesc">{{ copy.legacyDeckDescription }}</div>
						</div>
						<span :class="$style.depSelect">{{ copy.select }} <i class="ti ti-chevron-right"></i></span>
					</button>
				</div>
			</div>
		</div>

		<!-- ===== キャンセル ===== -->
		<div :class="$style.cancelArea">
			<button class="_button" :class="$style.cancelButton" @click="close">{{ copy.cancel }}</button>
		</div>
	</div>
</MkModal>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { ArrowUp, Bell, ChevronRight, CloudUpload, Globe2, Home, List, MessageSquareText, Plus, Radio, Search, SlidersHorizontal, Star, UserRound } from '@lucide/vue';
import { instanceName } from '@@/js/config.js';
import MkModal from '@/components/MkModal.vue';
import { miLocalStorage } from '@/local-storage.js';
import { ensureSignin } from '@/i.js';
import { i18n } from '@/i18n.js';
import { setHatacordingUiEnabled } from '@/utility/hatacording-ui.js';
import * as os from '@/os.js';

const emit = defineEmits<{
	(e: 'closed'): void;
}>();

const modal = ref<InstanceType<typeof MkModal>>();
const $i = ensureSignin();
const copy = i18n.ts._hata._uiSetup;

// 旗鯖fork: 非推奨UI (Misskey UI / 従来デッキ) の折りたたみ開閉状態。
const showOthers = ref(false);
// 旗鯖fork: モバイルで高機能デッキのプレビューを折りたたむ(表示領域節約)。
//   既定は閉。デスクトップでは CSS 側で常に展開表示するためこの値は無視される。
const deckPreviewOpen = ref(false);

const close = () => {
	modal.value?.close();
};

const select = (type: 'simple' | 'default' | 'deck') => {
	miLocalStorage.setItem('ui', type);
	miLocalStorage.setItem('ui_setup_completed', 'true');
	window.location.reload();
};

// 旗鯖fork: 非推奨UIは誤タップ防止と方針周知のため、確認を挟んでから選択する。
const selectDeprecated = async (type: 'default' | 'deck') => {
	const label = type === 'default' ? 'Misskey UI' : copy.legacyDeck;
	const { canceled } = await os.confirm({
		type: 'warning',
		title: i18n.tsx._hata._uiSetup.switchConfirm({ ui: label }),
		text: copy.deprecatedWarning,
	});
	if (canceled) return;
	select(type);
};

const selectHatacording = async () => {
	if (!$i.policies.canUseHatacordingUi) {
		await os.alert({ type: 'warning', text: copy.unavailable });
		return;
	}
	setHatacordingUiEnabled($i.id, true);
	miLocalStorage.setItem('ui', 'hatacording');
	miLocalStorage.setItem('ui_setup_completed', 'true');
	window.location.assign('/');
};
</script>

<style lang="scss" module>
.root {
	/* 旗鯖fork: テーマのアクセントを起点に派生色を定義 (緑等のハードコードは持たない)。 */
	--htkAccent: var(--MI_THEME-accent);
	--htkAccentLt: color-mix(in srgb, var(--MI_THEME-accent) 62%, #fff);

	position: relative;
	width: 100%;
	max-width: 720px;
	margin-inline: auto;
	box-sizing: border-box;
	padding: 34px 34px 26px;
	border-radius: 28px;
	/* 旗鯖fork: 中身が画面より高いと下端(非推奨UIの折りたたみ)が見切れて選べなくなる。
	   ⚠️`dvh` を使う（`vh` だとモバイルのアドレスバー分だけ足りず、同じ見切れが残る）。
	   ⚠️`overscroll-behavior: contain` が無いと、末尾で背後のタイムラインが動く。 */
	max-height: calc(100dvh - 32px);
	overflow-y: auto;
	overscroll-behavior: contain;
	color: #fff;
	/* 旗鯖fork: 入力欄のない専用UIでクリック位置へテキストキャレットを残さない。 */
	caret-color: transparent;
	/* 動くタイムラインを背面ぼかしへ再合成すると Chrome で背景が点滅する。
	   十分に不透明な面へ置き換え、UI選択窓の視認性は維持する。 */
	background: rgba(12, 14, 18, 0.96);
	-webkit-backdrop-filter: none;
	backdrop-filter: none;
	border: 1px solid rgba(255, 255, 255, 0.13);
	box-shadow: 0 30px 70px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

/* ===== ヘッダー ===== */
.header {
	display: flex;
	align-items: center;
	margin-bottom: 22px;
}
.headerText { flex: 1; min-width: 0; }
.headerEyebrow {
	font-family: "Space Grotesk", ui-monospace, monospace;
	font-size: 12px;
	line-height: 1;
	letter-spacing: 0.14em;
	text-transform: uppercase;
	color: rgba(255, 255, 255, 0.55);
}
.headerTitle {
	margin: 5px 0 0;
	font-size: 25px;
	line-height: 1.1;
	font-weight: 900;
	color: #fff;
}

/* ===== ヒーロー ===== */
.hero {
	position: relative;
	border-radius: 22px;
	padding: 24px;
	background: linear-gradient(160deg, color-mix(in srgb, var(--htkAccent) 20%, transparent), color-mix(in srgb, var(--htkAccent) 5%, transparent));
	border: 1.5px solid color-mix(in srgb, var(--htkAccent) 60%, transparent);
	box-shadow:
		0 0 0 1px color-mix(in srgb, var(--htkAccent) 18%, transparent),
		0 18px 44px color-mix(in srgb, var(--htkAccent) 28%, transparent),
		inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
.heroBadge {
	position: absolute;
	top: 16px;
	right: 16px;
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 11px;
	border-radius: 999px;
	background: var(--htkAccent);
	color: #fff;
	font-size: 11px;
	line-height: 1;
	font-weight: 700;
	box-shadow: 0 4px 14px color-mix(in srgb, var(--htkAccent) 50%, transparent);
}
.heroTop {
	display: flex;
	align-items: baseline;
	gap: 10px;
	margin-bottom: 3px;
}
.wordmark {
	margin: 0;
	font-family: "Righteous", system-ui, sans-serif;
	font-weight: 400;
	font-size: 30px;
	line-height: 1;
	letter-spacing: 0.01em;
	color: var(--htkAccentLt);
}
.heroLead {
	margin: 0 0 20px;
	font-size: 13.5px;
	line-height: 1.6;
	color: rgba(255, 255, 255, 0.82);
	max-width: 560px;
}
.heroLeadStrong { color: var(--htkAccentLt); font-weight: 700; }

/* ===== 2機能プレビュー ===== */
.features {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 14px;
}
.feature {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 15px;
	border-radius: 16px;
	background: rgba(0, 0, 0, 0.28);
	border: 1px solid rgba(255, 255, 255, 0.1);
}
.featPreview {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 248px;
	padding: 6px 0 2px;
}
.featMeta { min-width: 0; }
.featLabel {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 14px;
	line-height: 1;
	font-weight: 700;
	color: #fff;
}
.featLabelIcon { font-size: 15px; color: var(--htkAccentLt); }
.newBadge {
	font-family: "Space Grotesk", ui-monospace, monospace;
	font-size: 9px;
	line-height: 1;
	letter-spacing: 0.06em;
	padding: 3px 6px;
	border-radius: 5px;
	background: color-mix(in srgb, var(--htkAccent) 24%, transparent);
	color: var(--htkAccentLt);
}
.featDesc {
	margin-top: 5px;
	font-size: 11.5px;
	line-height: 1.5;
	color: rgba(255, 255, 255, 0.7);
}
/* デッキの折りたたみトグル。デスクトップでは非操作(ラベルとして振る舞う)、
   シェブロンも隠す。モバイルのメディアクエリで操作可能・シェブロン表示に切り替える。 */
.deckLabelBtn {
	display: block;
	width: 100%;
	margin: 0;
	padding: 0;
	border: none;
	background: none;
	text-align: left;
	cursor: default;
	color: inherit;
}
.deckChev {
	display: none;
	flex: none;
	margin-left: auto;
	font-size: 16px;
	color: rgba(255, 255, 255, 0.6);
	transition: transform 0.3s ease;
}
.deckChevOpen { transform: rotate(180deg); }

/* --- スマホ風モック --- */
.phone {
	width: 152px;
	height: 238px;
	box-sizing: border-box;
	padding: 10px 9px;
	border-radius: 26px;
	display: flex;
	flex-direction: column;
	gap: 7px;
	overflow: hidden;
	background: linear-gradient(180deg, #eef2fa, #e2e8f4);
	border: 1px solid rgba(255, 255, 255, 0.6);
	box-shadow: 0 14px 30px rgba(15, 22, 45, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}
.phonePill {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 5px;
	padding: 5px 7px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.75);
	border: 1px solid rgba(255, 255, 255, 0.85);
	box-shadow: 0 3px 8px rgba(20, 30, 60, 0.1);
}
.phonePillIcon { font-size: 10px; color: #9aa3b8; }
.phonePillActive {
	display: flex;
	align-items: center;
	gap: 3px;
	padding: 3px 6px;
	border-radius: 999px;
	background: color-mix(in srgb, var(--htkAccent) 15%, #fff);

	> i { font-size: 10px; color: var(--htkAccent); }
}
.phoneNote {
	display: flex;
	gap: 7px;
	padding: 8px;
	border-radius: 15px;
	background: rgba(255, 255, 255, 0.63);
	border: 1px solid rgba(255, 255, 255, 0.73);
	box-shadow: 0 2px 6px rgba(20, 30, 60, 0.06);
}
.phoneAvatar { width: 22px; height: 22px; border-radius: 7px; flex: none; }
.phoneAvatarA { background: linear-gradient(150deg, var(--htkAccent), color-mix(in srgb, var(--htkAccent) 30%, #2fb8a6)); }
.phoneAvatarB { background: linear-gradient(150deg, color-mix(in srgb, var(--htkAccent) 70%, #7a5ad0), #2fb8a6); }
.noteBody { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.noteHead { display: flex; align-items: center; gap: 4px; }
.noteActions {
	display: flex;
	align-items: center;
	gap: 9px;
	margin-top: 2px;
	color: rgba(38, 52, 86, 0.38);

	> i { font-size: 9px; }
}
/* スマホモック内の骨組みバー (濃色 = ノート本文) */
.phone .bar { background: rgba(38, 52, 86, 1); }
.bar {
	display: block;
	height: 4px;
	border-radius: 2px;
	background: rgba(255, 255, 255, 1);
}
.noteHead .bar { height: 5px; border-radius: 3px; }
.barPush { margin-left: auto; }
.phoneBottom { margin-top: auto; display: flex; align-items: center; gap: 6px; }
.phoneNav {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: space-around;
	padding: 6px 5px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.75);
	border: 1px solid rgba(255, 255, 255, 0.85);
	box-shadow: 0 4px 10px rgba(20, 30, 60, 0.12);

	> i { font-size: 12px; color: #9aa3b8; }
}
.phoneNavActive {
	width: 22px;
	height: 22px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: color-mix(in srgb, var(--htkAccent) 17%, #fff);

	> i { font-size: 12px; color: var(--htkAccent); }
}
.phoneFab {
	flex: none;
	width: 33px;
	height: 33px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--htkAccent);
	box-shadow: 0 4px 12px color-mix(in srgb, var(--htkAccent) 50%, transparent);

	> i { font-size: 14px; color: #fff; }
}

/* --- デッキ風モック --- */
.deckWrap { display: flex; gap: 6px; width: 220px; height: 196px; }
.deckCol {
	flex: 1;
	min-width: 0;
	box-sizing: border-box;
	padding: 6px;
	display: flex;
	flex-direction: column;
	gap: 5px;
	overflow: hidden;
	border-radius: 11px;
	background: rgba(20, 26, 16, 0.9);
	border: 1px solid rgba(255, 255, 255, 0.1);
}
.deckColHead {
	display: flex;
	align-items: center;
	gap: 4px;
	padding-bottom: 4px;
	border-bottom: 1px solid rgba(255, 255, 255, 0.09);
}
.deckColHeadIcon { font-size: 9px; color: var(--htkAccentLt); }
/* デッキ内の骨組みバー (白系) */
.deckCol .bar { background: rgba(255, 255, 255, 1); }

/* ===== 主 CTA ===== */
.cta {
	margin-top: 18px;
	width: 100%;
	border: none;
	border-radius: 15px;
	padding: 15px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	cursor: pointer;
	font-size: 15px;
	line-height: 1;
	font-weight: 700;
	color: #fff;
	background: var(--htkAccent);
	background: linear-gradient(150deg, var(--htkAccent), color-mix(in srgb, var(--htkAccent) 78%, #000));
	box-shadow: 0 10px 26px color-mix(in srgb, var(--htkAccent) 42%, transparent);
	transition: transform 0.16s ease, box-shadow 0.2s ease, filter 0.16s ease;

	&:hover { transform: translateY(-2px); }
	&:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
}
.ctaIcon { font-size: 17px; }

/* ===== 折りたたみ ===== */
.disc { margin-top: 16px; }
.discToggle {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
	padding: 12px 4px;
	border: none;
	background: none;
	cursor: pointer;
	text-align: left;
	color: rgba(255, 255, 255, 0.55);
	font-size: 13px;
	line-height: 1.3;
	font-weight: 500;
	user-select: none;

	&:hover { color: rgba(255, 255, 255, 0.8); }
	&:focus-visible { outline: 2px solid rgba(255, 255, 255, 0.5); outline-offset: 2px; border-radius: 8px; }
}
.discToggleText { flex: 1; min-width: 0; }
.discChev { flex: none; font-size: 16px; transition: transform 0.3s ease; }
.discChevOpen { transform: rotate(180deg); }
.depBadge {
	flex: none;
	font-family: "Space Grotesk", ui-monospace, monospace;
	font-size: 10px;
	line-height: 1;
	padding: 3px 6px;
	border-radius: 5px;
	background: rgba(200, 90, 70, 0.22);
	color: rgb(240, 168, 152);
}
.discBody {
	overflow: hidden;
	max-height: 0;
	opacity: 0;
	transition: max-height 0.32s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s;
}
.discBodyOpen { max-height: 420px; opacity: 1; }
.discInner {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 6px 2px 4px;
}
.depCard {
	display: flex;
	align-items: center;
	gap: 13px;
	width: 100%;
	padding: 12px 14px;
	border-radius: 14px;
	background: rgba(255, 255, 255, 0.03);
	border: 1px dashed rgba(255, 255, 255, 0.16);
	cursor: pointer;
	text-align: left;
	transition: all 0.18s ease;

	&:hover { background: rgba(255, 255, 255, 0.07); border-color: rgba(255, 255, 255, 0.28); }
	&:focus-visible { outline: 2px solid rgba(255, 255, 255, 0.5); outline-offset: 2px; }
}
.depThumb {
	flex: none;
	width: 58px;
	height: 42px;
	box-sizing: border-box;
	display: flex;
	gap: 4px;
	padding: 5px;
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.06);
	border: 1px solid rgba(255, 255, 255, 0.1);
	opacity: 0.7;
}
.depThumbSidebar { width: 11px; border-radius: 3px; background: rgba(255, 255, 255, 0.18); }
.depThumbBody { flex: 1; display: flex; flex-direction: column; gap: 3px; justify-content: center; }
.depThumbBody .bar { background: rgba(255, 255, 255, 1); }
.depThumbCol { flex: 1; border-radius: 2px; background: rgba(255, 255, 255, 1); }
.depInfo { flex: 1; min-width: 0; }
.depTitleRow { display: flex; align-items: center; gap: 8px; }
.depTitle { font-size: 13.5px; line-height: 1; font-weight: 700; color: rgba(255, 255, 255, 0.85); }
.depBadgeSolid {
	font-family: "Space Grotesk", ui-monospace, monospace;
	font-size: 9px;
	line-height: 1;
	padding: 3px 7px;
	border-radius: 999px;
	background: rgba(200, 90, 70, 0.9);
	color: #fff;
}
.depDesc {
	margin-top: 4px;
	font-size: 11px;
	line-height: 1.5;
	color: rgba(255, 255, 255, 0.55);
}
.depSelect {
	flex: none;
	display: flex;
	align-items: center;
	gap: 2px;
	white-space: nowrap;
	font-size: 12px;
	line-height: 1;
	font-weight: 600;
	color: rgba(255, 255, 255, 0.5);

	> i { font-size: 12px; }
}

/* ===== HataSNSCordUI: faithful three-pane mock ===== */
.cordChoice {
	margin-top: 14px;
	padding: 14px;
	border: 1px solid color-mix(in srgb, var(--htkAccent) 34%, rgba(255, 255, 255, .12));
	border-radius: 18px;
	background: color-mix(in srgb, var(--htkAccent) 7%, rgba(255, 255, 255, .025));
}

.cordChoiceInner {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cordChoiceIntro {
	display: flex;
	align-items: center;
	gap: 12px;
	padding-inline: 2px;
}

.cordChoiceMascot {
	width: 72px;
	height: 72px;
	flex: 0 0 72px;
	border: 1px solid color-mix(in srgb, var(--htkAccent) 34%, rgba(255, 255, 255, .18));
	border-radius: 18px;
	object-fit: cover;
	box-shadow: 0 8px 22px rgba(0, 0, 0, .28);
	user-select: none;
	pointer-events: none;
}

.cordChoiceIntro > div {
	min-width: 0;
	flex: 1;
}

.cordChoiceIntro p {
	margin: 4px 0 0;
	color: rgba(255, 255, 255, .58);
	font-size: 11px;
	line-height: 1.55;
}

.cordChoiceWordmark {
	color: #fff;
	font-family: 'Righteous', system-ui, sans-serif;
	font-size: 21px;
	line-height: 1.1;
	letter-spacing: .01em;
}

.cordMock {
	display: grid;
	grid-template-columns: 24% minmax(0, 1fr) 27%;
	height: 196px;
	overflow: hidden;
	border: 1px solid color-mix(in srgb, var(--htkAccent) 30%, rgba(255, 255, 255, .14));
	border-radius: 15px;
	background: #10141d;
	box-shadow: 0 12px 30px rgba(0, 0, 0, .28);
	color: #e9edf5;
	font-family: system-ui, sans-serif;
	font-size: 6px;
}

.cordMock svg {
	stroke-width: 1.8;
}

.cordMockLeft,
.cordMockRight {
	display: flex;
	min-width: 0;
	flex-direction: column;
	background: #181d27;
}

.cordMockLeft {
	border-right: 1px solid #303746;
}

.cordMockRight {
	border-left: 1px solid #303746;
}

.cordMockServer {
	display: flex;
	height: 27px;
	align-items: center;
	gap: 4px;
	padding: 0 6px;
	border-bottom: 1px solid #303746;
}

.cordMockServer b {
	min-width: 0;
	flex: 1;
	overflow: hidden;
	font-family: 'Righteous', system-ui, sans-serif;
	font-size: 8px;
	font-weight: 400;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cordMockServerIcon {
	width: 13px;
	height: 13px;
	flex: 0 0 13px;
	border-radius: 4px;
	background: linear-gradient(145deg, var(--htkAccentLt), var(--htkAccent));
}

.cordMockNav,
.cordMockCollections {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 6px 5px 0;
}

.cordMockNav span,
.cordMockCollections span {
	display: flex;
	height: 15px;
	align-items: center;
	gap: 4px;
	padding: 0 5px;
	border-radius: 5px;
	color: #aeb7c7;
}

.cordMockNavActive {
	background: color-mix(in srgb, var(--htkAccent) 20%, transparent);
	color: var(--htkAccentLt) !important;
}

.cordMockCollections {
	margin-top: 3px;
	padding-top: 5px;
	border-top: 1px solid #2b3240;
}

.cordMockAccount {
	display: flex;
	height: 25px;
	align-items: center;
	gap: 4px;
	margin-top: auto;
	padding: 0 7px;
	border-top: 1px solid #303746;
	color: #d7ddea;
}

.cordMockCenter {
	display: flex;
	min-width: 0;
	flex-direction: column;
	background: #111620;
}

.cordMockTitle {
	display: flex;
	height: 27px;
	align-items: center;
	justify-content: space-between;
	padding: 0 7px;
	border-bottom: 1px solid #303746;
	background: #171c26;
}

.cordMockTitle span {
	display: flex;
	align-items: center;
	gap: 3px;
}

.cordMockStatus {
	color: #6ed2a5;
	font-size: 5px;
}

.cordMockFeed {
	display: flex;
	min-height: 0;
	flex: 1;
	flex-direction: column;
	gap: 6px;
	padding: 8px;
}

.cordMockOther,
.cordMockOwn {
	display: flex;
	width: 82%;
	align-items: flex-start;
	gap: 4px;
}

.cordMockOther > div,
.cordMockOwn > div {
	display: flex;
	min-width: 0;
	flex: 1;
	flex-direction: column;
	gap: 3px;
	padding: 5px 6px;
	border: 1px solid #353d4d;
	border-radius: 7px 7px 7px 2px;
	background: #1d2330;
}

.cordMockOwn {
	align-self: flex-end;
}

.cordMockOwn > div {
	border-color: color-mix(in srgb, var(--htkAccent) 52%, #353d4d);
	border-radius: 7px 7px 2px;
	background: color-mix(in srgb, var(--htkAccent) 22%, #1d2330);
}

.cordMockOther b,
.cordMockOwn b {
	font-size: 5.5px;
}

.cordMockOther i,
.cordMockOwn i,
.cordMockDetail i {
	display: block;
	height: 2px;
	border-radius: 999px;
	background: rgba(255, 255, 255, .38);
}

.cordMockOther i:nth-of-type(2) {
	width: 66%;
}

.cordMockOther small,
.cordMockOwn small {
	color: #9ca6b8;
	font-size: 5px;
	letter-spacing: .1em;
}

.cordMockAvatar {
	width: 12px;
	height: 12px;
	flex: 0 0 12px;
	border-radius: 50%;
	background: linear-gradient(145deg, #ef9da9, #8b6ad7);
}

.cordMockAvatarAlt {
	background: linear-gradient(145deg, #69b9dc, #4f7ccf);
}

.cordMockComposer {
	display: flex;
	height: 22px;
	align-items: center;
	gap: 4px;
	margin: 0 7px 6px;
	padding: 0 6px;
	border: 1px solid #3a4354;
	border-radius: 999px;
	background: #202632;
}

.cordMockComposer span {
	min-width: 0;
	flex: 1;
	color: #8f99aa;
}

.cordMockTabs {
	display: flex;
	height: 27px;
	align-items: center;
	gap: 5px;
	padding: 0 5px;
	border-bottom: 1px solid #303746;
}

.cordMockTabs span:first-child {
	padding-block: 8px 6px;
	border-bottom: 1px solid var(--htkAccentLt);
	color: var(--htkAccentLt);
}

.cordMockTabs svg {
	margin-left: auto;
}

.cordMockDetail {
	display: flex;
	align-items: center;
	flex-direction: column;
	gap: 6px;
	padding: 18px 8px;
	text-align: center;
}

.cordMockProfile {
	width: 22px;
	height: 22px;
	border-radius: 50%;
	background: linear-gradient(145deg, var(--htkAccentLt), var(--htkAccent));
}

.cordMockDetail i {
	width: 86%;
}

.cordMockDetail i:nth-of-type(2) {
	width: 58%;
}

.cordMockDetail div {
	display: flex;
	align-items: center;
	gap: 4px;
	margin-top: 8px;
	padding: 5px;
	border-radius: 6px;
	background: #202632;
	color: #adb6c5;
}

.cordChoiceCta {
	display: grid;
	width: 100%;
	align-items: center;
	grid-template-columns: 20px minmax(0, 1fr) 20px;
	gap: 7px;
	padding: 11px 14px;
	border: 1px solid color-mix(in srgb, var(--htkAccent) 55%, transparent);
	border-radius: 12px;
	background: color-mix(in srgb, var(--htkAccent) 17%, rgba(255, 255, 255, .03));
	color: #fff;
	font: inherit;
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
	transition: background-color .18s ease, transform .18s ease;
}

.cordChoiceCta span {
	min-width: 0;
	text-align: center;
}

.cordChoiceCta:hover {
	background: color-mix(in srgb, var(--htkAccent) 27%, rgba(255, 255, 255, .04));
	transform: translateY(-1px);
}

.cordChoiceCta:focus-visible {
	outline: 2px solid #fff;
	outline-offset: 3px;
}

.cordChoiceCta svg {
	justify-self: center;
}

/* ===== キャンセル ===== */
.cancelArea { margin-top: 14px; text-align: center; }
.cancelButton {
	padding: 9px 24px;
	border-radius: 11px;
	background: transparent !important;
	border: 1px solid rgba(255, 255, 255, 0.28) !important;
	color: rgba(255, 255, 255, 0.75) !important;
	font-size: 13px;
	font-weight: 500;

	&:hover { background: rgba(255, 255, 255, 0.1) !important; }
}

/* ===== レスポンシブ ===== */
@media (max-width: 600px) {
	/* 旗鯖fork: モバイルは余白が効くので更に詰め、下端は安全領域の分だけ足す。 */
	.root {
		padding: 22px 16px calc(18px + env(safe-area-inset-bottom, 0px));
		border-radius: 22px;
		max-height: calc(100dvh - 16px);
	}
	.headerTitle { font-size: 21px; }
	.hero { padding: 20px 16px; }

	/* 旗鯖fork: 細長端末(ZFold 等)で「デフォルト」バッジが Righteous ワードマークに
	   被さるため、モバイルでは絶対配置をやめ通常フロー(ワードマークの上)に置く。 */
	.heroBadge {
		position: static;
		display: inline-flex;
		margin-bottom: 12px;
	}
	.wordmark { font-size: 26px; }
	.heroLead { margin-bottom: 14px; }

	/* 旗鯖fork: モバイルは2機能を縦積み。プレビューは縮小し、負マージンで占有高さを
	   詰めて全体の間延びを防ぐ。 */
	.features { grid-template-columns: 1fr; gap: 12px; }
	.feature { padding: 12px; }
	.featPreview { height: auto; padding: 2px 0; overflow: hidden; }

	/* 旗鯖fork: モバイルでは高機能デッキを折りたたみ表示にして領域節約。
	   ラベルを上・プレビューを下に並べ替え、既定は閉。 */
	.featureDeck .featMeta { order: 1; }
	.featureDeck .featPreview { order: 2; margin-top: 12px; }
	.featureDeck .featPreviewCollapsed { display: none; }
	.deckLabelBtn { cursor: pointer; }
	.deckChev { display: inline-flex; }
	.phone {
		transform: scale(0.8);
		transform-origin: center;
		margin: -24px -15px; /* scale(0.8) で縮んだ分の余白を回収 */
	}
	.deckWrap {
		width: 100%;
		max-width: 190px;
		height: 150px;
		margin: 0 auto;
	}

	.depCard { gap: 10px; padding: 11px 12px; }
	.depSelect { display: none; }
	.cordChoice { padding: 12px; }
	.cordChoiceIntro { gap: 10px; }
	.cordChoiceMascot { width: 56px; height: 56px; flex-basis: 56px; border-radius: 14px; }
	.cordMock { grid-template-columns: 25% minmax(0, 1fr); height: 182px; }
	.cordMockRight { display: none; }
}
</style>

<style>
/* 旗鯖fork: ワードマーク用 Righteous (同梱・OFL)。他ページと同じセルフホスト方式。 */
@font-face {
	font-family: 'Righteous';
	font-style: normal;
	font-weight: 400;
	font-display: swap;
	src: url('/client-assets/Righteous-Regular.woff2') format('woff2');
}
</style>
