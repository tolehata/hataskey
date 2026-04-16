<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<SearchMarker path="/settings/hata-custom" label="旗鯖独自機能" :keywords="['hata', 'custom', 'simple', 'widget', 'timeline', 'font']" icon="ti ti-flag">
    <div class="_gaps_m">
        <MkFeatureBanner icon="/client-assets/package_3d.png" color="#e74040">
            旗鯖独自の機能設定です。カテゴリごとに設定を管理できます。
        </MkFeatureBanner>

        <div :class="$style.catTabs">
            <button v-for="cat in categories" :key="cat.id" :class="[$style.catTab, activeCat === cat.id && $style.catTabOn]" @click="activeCat = cat.id">
                <i :class="cat.icon"></i> {{ cat.label }}
            </button>
        </div>

        <!-- ===== 旗鯖全体 ===== -->
        <template v-if="activeCat === 'general'">
        <FormSection first>
            <template #label>外部アカウント連携</template>
            <FormLink to="/settings/external-account">
                <template #icon><i class="ti ti-link"></i></template>
                外部アカウント連携設定
                <template #suffix><span v-if="isExternalLinked" :class="$style.linkedBadge"><i class="ti ti-check"></i> 連携済み</span></template>
            </FormLink>
        </FormSection>
        <FormSection>
            <template #label>UI変更</template>
            <button class="_buttonPrimary" @click="openUiSetup" style="width:100%;padding:12px;font-weight:bold;">
                <i class="ti ti-wand"></i> UI選択画面を開く
            </button>
        </FormSection>
        <FormSection>
            <template #label>リアクション</template>
            <FormLink to="/settings/hidden-reactions">
                <template #icon><i class="ti ti-eye-off"></i></template>
                非表示リアクション管理
                <template #suffix><span v-if="hiddenReactionCount > 0" :class="$style.countBadge">{{ hiddenReactionCount }}件</span></template>
            </FormLink>
            <MkSwitch v-model="hideMutedUserReactions">
                <template #label>ミュートしたユーザーのリアクションを非表示にする</template>
                <template #caption>ミュートとブロック設定でミュートしたユーザーのリアクションが、自分や他の人のノートに表示されなくなります（リアルタイム受信分）。</template>
            </MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>タイムライン</template>
            <div style="font-weight:bold;margin-bottom:8px;">新規ノートのアニメーション方向</div>
            <MkRadios v-model="timelineAnimationDirection">
                <option value="top">上からスライド</option>
                <option value="left">左からスライド</option>
                <option value="right">右からスライド</option>
                <option value="random">ランダム</option>
            </MkRadios>
        </FormSection>
        <FormSection>
            <template #label>投稿フォーム</template>
            <MkSwitch v-model="showHashtagButtonInPostForm"><template #label>ハッシュタグボタンを表示</template></MkSwitch>
            <MkSwitch v-model="showDrawingButtonInPostForm"><template #label>お絵かきボタンを表示</template></MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>ログイン日数</template>
            <MkSwitch v-model="showLoginBonusPopup"><template #label>ログイン日数のポップアップを表示</template></MkSwitch>
        </FormSection>
        </template>

        <!-- ===== フォント ===== -->
        <template v-if="activeCat === 'font'">
        <FormSection first>
            <template #label>UIフォント選択</template>
            <div style="font-size:.85em;opacity:.7;margin-bottom:12px;">
                UI全体のフォントを変更できます。すべてのプリセットフォントは SIL Open Font License 1.1 で提供されており、
                Google Fonts CDN から直接読み込まれます。サーバーにフォントデータは保存されません。
            </div>
            <div :class="$style.fontGrid">
                <button
                    v-for="preset in fontPresets"
                    :key="preset.id"
                    :class="[$style.fontCard, fontId === preset.id && $style.fontCardOn]"
                    @click="onFontChange(preset.id)"
                >
                    <div :class="$style.fontSample" :style="{ fontFamily: preset.family + ', sans-serif' }">
                        旗鯖へようこそ！ The quick brown fox
                    </div>
                    <div :class="$style.fontSampleSub" :style="{ fontFamily: preset.family + ', sans-serif' }">
                        あいうえお かきくけこ ABCDEFG 0123456789
                    </div>
                    <div :class="$style.fontName">{{ preset.label }}</div>
                    <div :class="$style.fontMeta">
                        <span :class="$style.fontLicense"><i class="ti ti-license"></i> {{ preset.license }}</span>
                        <span :class="$style.fontAuthor">{{ preset.author }}</span>
                    </div>
                </button>

                <!-- システムフォント -->
                <button
                    :class="[$style.fontCard, fontId === 'system' && $style.fontCardOn]"
                    @click="onFontChange('system')"
                >
                    <div :class="$style.fontSample">旗鯖へようこそ！ The quick brown fox</div>
                    <div :class="$style.fontSampleSub">あいうえお かきくけこ ABCDEFG 0123456789</div>
                    <div :class="$style.fontName">システムフォント</div>
                    <div :class="$style.fontMeta">
                        <span :class="$style.fontLicense">OS標準フォントを使用</span>
                    </div>
                </button>
            </div>
        </FormSection>

        <FormSection>
            <template #label>カスタムフォント（ドライブから）</template>
            <div style="font-size:.85em;opacity:.7;margin-bottom:12px;">
                ドライブにアップロードしたフォントファイル（.ttf, .otf, .woff2）を使用できます。<br>
                使用には免責事項への同意が必要です。
            </div>
            <div v-if="fontId === 'custom' && customFontName" :class="$style.customFontStatus">
                <i class="ti ti-typography"></i>
                現在のカスタムフォント: <strong>{{ customFontName }}</strong>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="_buttonPrimary" @click="openDrivePicker" style="padding:10px 20px;font-weight:bold;">
                    <i class="ti ti-upload"></i> ドライブからフォントを選択
                </button>
                <button class="_buttonGradate" @click="resetToDefault" style="padding:10px 20px;">
                    <i class="ti ti-arrow-back"></i> 既定に戻す
                </button>
            </div>
            <div v-if="customFontConsent" :class="$style.consentNote">
                <i class="ti ti-check"></i> フォント免責事項に同意済み
            </div>
        </FormSection>
        </template>

        <!-- ===== Hatasaba UI ===== -->
        <template v-if="activeCat === 'simpleUi'">
        <FormSection first>
            <template #label>上部ナビバー（タイムラインタブ）</template>
            <div style="font-size:.85em;opacity:.7;margin-bottom:8px;">表示するタブとその順番を設定します。</div>
            <div :class="$style.reorderList">
                <div v-for="(item, idx) in topNavItems" :key="item.id" :class="$style.reorderItem">
                    <MkSwitch v-model="item.visible" style="margin:0;flex-shrink:0;transform:scale(.8);transform-origin:left center;" @update:modelValue="saveTopNav" />
                    <i :class="[item.icon, $style.reorderIcon]"></i>
                    <span :class="$style.reorderLabel">{{ item.label }}</span>
                    <div :class="$style.reorderBtns">
                        <button :class="$style.reorderBtn" :disabled="idx===0" @click="moveArr(topNavItems,idx,-1);saveTopNav()">▲</button>
                        <button :class="$style.reorderBtn" :disabled="idx===topNavItems.length-1" @click="moveArr(topNavItems,idx,1);saveTopNav()">▼</button>
                    </div>
                </div>
            </div>
        </FormSection>
        <FormSection>
            <template #label>下部ナビバー</template>
            <div style="font-size:.85em;opacity:.7;margin-bottom:8px;">表示する項目（最大4つ）と順番を設定します。</div>
            <div :class="$style.reorderList">
                <div v-for="(item, idx) in bottomNavItems" :key="item.id" :class="$style.reorderItem">
                    <MkSwitch v-model="item.visible" style="margin:0;flex-shrink:0;transform:scale(.8);transform-origin:left center;" @update:modelValue="saveBottomNav" />
                    <i :class="[item.icon, $style.reorderIcon]"></i>
                    <span :class="$style.reorderLabel">{{ item.label }}</span>
                    <div :class="$style.reorderBtns">
                        <button :class="$style.reorderBtn" :disabled="idx===0" @click="moveArr(bottomNavItems,idx,-1);saveBottomNav()">▲</button>
                        <button :class="$style.reorderBtn" :disabled="idx===bottomNavItems.length-1" @click="moveArr(bottomNavItems,idx,1);saveBottomNav()">▼</button>
                    </div>
                </div>
            </div>
            <div v-if="bottomNavItems.filter(i=>i.visible).length > 4" style="color:#e74040;font-size:.85em;margin-top:6px;">
                <i class="ti ti-alert-triangle"></i> 最大4つまで表示できます。超過分は非表示になります。
            </div>
        </FormSection>
        <FormSection>
            <template #label>サイドメニューの並び替え</template>
            <div style="font-size:.85em;opacity:.7;margin-bottom:8px;">PC/タブレットのサイドバーとモバイルのドロワーに反映されます。</div>
            <div :class="$style.reorderList">
                <div v-for="(item, idx) in sidebarItems" :key="item.id" :class="$style.reorderItem">
                    <i :class="[item.icon, $style.reorderIcon]"></i>
                    <span :class="$style.reorderLabel">{{ item.label }}</span>
                    <div :class="$style.reorderBtns">
                        <button :class="$style.reorderBtn" :disabled="idx===0" @click="moveArr(sidebarItems,idx,-1);saveSidebar()">▲</button>
                        <button :class="$style.reorderBtn" :disabled="idx===sidebarItems.length-1" @click="moveArr(sidebarItems,idx,1);saveSidebar()">▼</button>
                    </div>
                </div>
            </div>
        </FormSection>
        </template>
        <template v-if="activeCat === 'accessibility'">
        <FormSection first>
            <template #label>ノートの間隔</template>
            <div style="font-size:.85em;opacity:.7;margin-bottom:12px;">タイムラインの投稿同士の間隔を調整します。即座に反映されます。</div>
            <div :class="$style.spacingOptions">
                <button v-for="opt in spacingOptions" :key="opt.value" :class="[$style.spacingCard, noteSpacing === opt.value && $style.spacingCardOn]" @click="noteSpacing = opt.value">
                    <div :class="$style.spacingPreview">
                        <div :class="$style.spacingBubble" :style="{ margin: opt.previewMargin }"></div>
                        <div :class="$style.spacingBubble" :style="{ margin: opt.previewMargin }"></div>
                        <div :class="$style.spacingBubble" :style="{ margin: opt.previewMargin }"></div>
                    </div>
                    <div :class="$style.spacingLabel">{{ opt.label }}</div>
                </button>
            </div>
            <MkSwitch v-model="classicNoteSpacing">
                <template #label>従来のMisskey風の投稿間隔を使用する</template>
                <template #caption>ONにするとタイムラインの投稿間隔が従来のMisskeyと同じ間隔になります。</template>
            </MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>表示効果</template>
            <MkSwitch v-model="glassEffect">
                <template #label>すりガラス効果を有効にする</template>
                <template #caption>サイドメニューとウィジェットの背景にバナー画像のすりガラス表示を適用します。OFFにすると単色背景になり、描画負荷が軽減されます。</template>
            </MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>ウィジェット</template>
            <MkSwitch v-model="widgetBorder">
                <template #label>ウィジェットにテーマカラーの縁色を表示</template>
                <template #caption>ウィジェットにアクセントカラーの縁を表示します（PC・モバイル両方）</template>
            </MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>タイムライン操作</template>
            <MkSwitch v-model="directProfile">
                <template #label>アバタークリックで直接プロフィールへ</template>
                <template #caption>ONにするとユーザーパネルを経由せず、直接プロフィールページに遷移します。Hatasaba UIでは上部の戻るボタンでタイムラインに戻れます。</template>
            </MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>吹き出し表示</template>
            <MkSwitch v-model="disableBubbleInDeck">
                <template #label>デッキUIで吹き出し表示を無効にする</template>
                <template #caption>ONにするとデッキUIではタイムラインの吹き出しデザインが適用されず、標準のカード表示になります。</template>
            </MkSwitch>
            <MkSwitch v-model="disableBubbleInDefault">
                <template #label>Misskey UIで吹き出し表示を無効にする</template>
                <template #caption>ONにするとMisskey UI（デフォルトUI）ではタイムラインの吹き出しデザインが適用されず、標準のカード表示になります。</template>
            </MkSwitch>
        </FormSection>
        </template>
    </div>
</SearchMarker>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkRadios from '@/components/MkRadios.vue';
import FormSection from '@/components/form/section.vue';
import FormLink from '@/components/form/link.vue';
import MkFeatureBanner from '@/components/MkFeatureBanner.vue';
import * as os from '@/os.js';
import { miLocalStorage } from '@/local-storage.js';
import { prefer } from '@/preferences.js';
import { definePage } from '@/page.js';
import { getHiddenReactions, hiddenReactionsVersion } from '@/utility/hidden-reactions.js';
import { HATA_FONT_PRESETS, applyHataFont, type HataFontId } from '@/scripts/hata-font-manager.js';
import { chooseDriveFile } from '@/utility/drive.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const categories = [
    { id: 'general', icon: 'ti ti-flag', label: '旗鯖全体' },
    { id: 'font', icon: 'ti ti-typography', label: 'フォント' },
    { id: 'simpleUi', icon: 'ti ti-device-mobile', label: 'Hatasaba UI' },
    { id: 'accessibility', icon: 'ti ti-accessible', label: 'アクセシビリティ' },
];
const activeCat = ref('general');

// フォントタブに切り替えたらプリロード開始
watch(activeCat, (v) => {
    if (v === 'font') preloadAllFonts();
});

// LS helpers (旗鯖全体設定用 — これらは元々LocalStorage)
function useLSBool(key: string, def: boolean) {
    const s = miLocalStorage.getItem(key);
    const v = ref(s !== null ? s === 'true' : def);
    watch(v, n => miLocalStorage.setItem(key, String(n)));
    return v;
}
function useLSStr(key: string, def: string) {
    const v = ref(miLocalStorage.getItem(key) || def);
    watch(v, n => miLocalStorage.setItem(key, n));
    return v;
}

// 並び替えヘルパー
function moveArr(arr: any[], idx: number, dir: number) {
    const ni = idx + dir; if (ni < 0 || ni >= arr.length) return;
    [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
}

// ===== フォント設定 =====
const fontId = prefer.model('hataFont.id');
const customFontUrl = prefer.model('hataFont.customUrl');
const customFontName = prefer.model('hataFont.customName');
const customFontConsent = prefer.model('hataFont.customFontConsent');

const fontPresets = HATA_FONT_PRESETS;
const fontsPreloaded = ref(false);

// フォントタブを開いた時にすべてのプリセットフォントをプリロード
function preloadAllFonts() {
    if (fontsPreloaded.value) return;
    for (const preset of HATA_FONT_PRESETS) {
        if (preset.googleFontsQuery) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${preset.googleFontsQuery}&display=swap`;
            link.dataset.hataPreview = preset.id;
            document.head.appendChild(link);
        }
    }
    fontsPreloaded.value = true;
}

function onFontChange(id: HataFontId) {
    fontId.value = id;
    applyHataFont();
}

async function openDrivePicker() {
    // 免責事項の同意確認
    if (!customFontConsent.value) {
        const { canceled } = await os.confirm({
            type: 'warning',
            title: 'フォント使用に関する免責事項',
            text: [
                '自前のフォントを使用する場合、以下の事項に同意する必要があります。',
                '',
                '・使用しようとしているフォントのライセンスを確認し、使用条件に違反していないことを確認してください。',
                '・ライセンスに違反したフォントを使用し、何らかの不利益を被ったとしても、サーバー管理者は一切の責任を負いません。',
                '・フォントの表示品質や互換性についてもサーバー管理者は保証しません。',
                '',
                '同意しますか？',
            ].join('\n'),
        });
        if (canceled) return;
        customFontConsent.value = true;
        prefer.commit('hataConsent.customFont', true);
        prefer.commit('hataConsent.customFontDate', new Date().toISOString());
        // サーバーに同意を記録
        misskeyApi('hata/consent/update', { type: 'customFont', agree: true }).catch(console.error);
    }

    // ドライブファイルピッカーを開く
    const files = await chooseDriveFile({ multiple: false }).catch(() => []);
    if (files.length > 0) {
        const file = files[0];
        customFontUrl.value = file.url;
        customFontName.value = file.name.replace(/\.(ttf|otf|woff2?|eot)$/i, '');
        fontId.value = 'custom';
        applyHataFont();
    }
}

function resetToDefault() {
    fontId.value = 'zen-kaku';
    customFontUrl.value = '';
    customFontName.value = '';
    applyHataFont();
}

// ===== 旗鯖全体 =====
const showHashtagButtonInPostForm = useLSBool('showHashtagButtonInPostForm', true);
const showDrawingButtonInPostForm = useLSBool('showDrawingButtonInPostForm', true);
const showLoginBonusPopup = useLSBool('showLoginBonusPopup', true);
const timelineAnimationDirection = prefer.model('timelineAnimationDirection');
const timelineAnimationOptions = [
    { value: 'top', label: '上からスライド' }, { value: 'left', label: '左からスライド' },
    { value: 'right', label: '右からスライド' }, { value: 'random', label: 'ランダム' },
];
const openUiSetup = async () => {
    const { defineAsyncComponent: dac } = await import('vue');
    os.popup(dac(() => import('@/components/MkUISetup.vue')), {}, {}, 'closed');
};
const isExternalLinked = computed(() => prefer.s['external.enabled'] && prefer.s['external.token'] != null);
const hiddenReactionCount = computed(() => { hiddenReactionsVersion.value; return getHiddenReactions().length; });
const hideMutedUserReactions = prefer.model('hideMutedUserReactions');

// ===== シンプルUI（prefer同期） =====
const topNavItems = ref([...prefer.s['simpleUi.topNav']]);
function saveTopNav() { prefer.commit('simpleUi.topNav', [...topNavItems.value]); }
watch(topNavItems, saveTopNav, { deep: true });

const bottomNavItems = ref([...prefer.s['simpleUi.bottomNav']]);
function saveBottomNav() { prefer.commit('simpleUi.bottomNav', [...bottomNavItems.value]); }
watch(bottomNavItems, saveBottomNav, { deep: true });

const sidebarItems = ref([...prefer.s['simpleUi.sidebar']]);
function saveSidebar() { prefer.commit('simpleUi.sidebar', [...sidebarItems.value]); }
watch(sidebarItems, saveSidebar, { deep: true });

const widgetBorder = prefer.model('simpleUi.widgetBorder');
const glassEffect = prefer.model('simpleUi.glassEffect');
const directProfile = prefer.model('simpleUi.directProfile');
const noteSpacing = prefer.model('simpleUi.noteSpacing');
const disableBubbleInDeck = prefer.model('simpleUi.disableBubbleInDeck');
const disableBubbleInDefault = prefer.model('simpleUi.disableBubbleInDefault');
const classicNoteSpacing = prefer.model('simpleUi.classicNoteSpacing');

const spacingOptions = [
    { value: 'compact', label: '詰める', previewMargin: '2px 0' },
    { value: 'moderate', label: 'ほどよく', previewMargin: '5px 0' },
    { value: 'wide', label: '広め', previewMargin: '10px 0' },
];

definePage({ title: '旗鯖独自機能', icon: 'ti ti-flag' });
</script>

<style lang="scss" module>
.linkedBadge { color: var(--MI_THEME-success); font-size: 0.9em; }
.countBadge { opacity: 0.7; font-size: 0.9em; }
.catTabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
.catTab {
    padding:8px 16px; border-radius:20px; border:1px solid var(--MI_THEME-divider);
    background:transparent; color:var(--MI_THEME-fg); font-family:inherit; font-size:.85rem;
    font-weight:500; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all .2s;
    &:hover { background:var(--MI_THEME-accentedBg); }
}
.catTabOn { background:var(--MI_THEME-accentedBg); color:var(--MI_THEME-accent); border-color:var(--MI_THEME-accent); font-weight:600; }
.reorderList { display:flex; flex-direction:column; gap:4px; }
.reorderItem { display:flex; align-items:center; gap:8px; padding:8px 12px; background:var(--MI_THEME-panel); border-radius:10px; border:1px solid var(--MI_THEME-divider); }
.reorderIcon { font-size:1rem; opacity:.6; width:20px; text-align:center; }
.reorderLabel { flex:1; font-size:.88rem; font-weight:500; }
.reorderBtns { display:flex; gap:2px; }
.reorderBtn {
    width:28px; height:28px; border-radius:6px; border:1px solid var(--MI_THEME-divider);
    background:transparent; color:var(--MI_THEME-fg); font-size:.65rem; cursor:pointer;
    display:flex; align-items:center; justify-content:center; transition:all .15s; font-family:inherit;
    &:hover:not(:disabled) { background:var(--MI_THEME-accentedBg); }
    &:disabled { opacity:.2; cursor:default; }
}
.spacingOptions { display:flex; gap:8px; flex-wrap:wrap; }
.spacingCard {
    flex:1; min-width:80px; padding:12px 8px 10px; border-radius:12px; border:2px solid var(--MI_THEME-divider);
    background:var(--MI_THEME-panel); cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:8px;
    transition:all .2s; font-family:inherit;
    &:hover { border-color:color-mix(in srgb, var(--MI_THEME-accent) 40%, var(--MI_THEME-divider)); }
}
.spacingCardOn { border-color:var(--MI_THEME-accent); background:var(--MI_THEME-accentedBg); }
.spacingPreview {
    width:100%; display:flex; flex-direction:column; align-items:stretch;
    background:color-mix(in srgb, var(--MI_THEME-fg) 5%, transparent); border-radius:8px; padding:6px;
    min-height:60px; justify-content:center;
}
.spacingBubble {
    height:10px; border-radius:6px;
    background:color-mix(in srgb, var(--MI_THEME-fg) 15%, transparent);
}
.spacingLabel { font-size:.82rem; font-weight:600; color:var(--MI_THEME-fg); }

/* ===== フォント設定 ===== */
.fontGrid { display: flex; flex-direction: column; gap: 8px; }
.fontCard {
    display: flex; flex-direction: column; gap: 6px; padding: 14px 16px;
    border-radius: 12px; border: 2px solid var(--MI_THEME-divider);
    background: var(--MI_THEME-panel); cursor: pointer; text-align: left;
    transition: all .2s; font-family: inherit;
    &:hover { border-color: color-mix(in srgb, var(--MI_THEME-accent) 40%, var(--MI_THEME-divider)); }
}
.fontCardOn { border-color: var(--MI_THEME-accent); background: var(--MI_THEME-accentedBg); }
.fontSample { font-size: 1.4em; line-height: 1.5; margin-bottom: 2px; }
.fontSampleSub { font-size: 0.92em; line-height: 1.4; opacity: 0.6; margin-bottom: 6px; }
.fontName { font-size: .88rem; font-weight: 600; }
.fontMeta { display: flex; flex-direction: column; gap: 2px; }
.fontLicense { font-size: .72rem; opacity: .5; display: flex; align-items: center; gap: 4px; }
.fontAuthor { font-size: .72rem; opacity: .4; }
.customFontStatus {
    padding: 10px 14px; border-radius: 10px; margin-bottom: 8px;
    background: var(--MI_THEME-accentedBg); font-size: .88rem;
    display: flex; align-items: center; gap: 6px;
}
.consentNote {
    margin-top: 8px; font-size: .82rem; opacity: .6;
    display: flex; align-items: center; gap: 4px; color: var(--MI_THEME-success);
}
</style>
