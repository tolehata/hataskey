<template>
<SearchMarker path="/settings/hata-custom" label="旗鯖独自機能" :keywords="['hata', 'custom', 'tolehata', 'timeline', 'animation', 'reaction']" icon="ti ti-flag">
    <div class="_gaps_m">

        <MkFeatureBanner icon="/client-assets/package_3d.png" color="#e74040">
            旗鯖独自の機能設定です。シンプルTL、タイムラインアニメーション、投稿フォームのカスタマイズなどを行えます。
        </MkFeatureBanner>

        <FormSection first>
            <template #label>シュリンピア連携</template>
            <FormLink to="/settings/external-account">
                <template #icon><i class="ti ti-link"></i></template>
                シュリンピア連携設定
                <template #suffix>
                    <span v-if="isExternalLinked" :class="$style.linkedBadge">
                        <i class="ti ti-check"></i> 連携済みです
                    </span>
                </template>
            </FormLink>
        </FormSection>



        <FormSection>
            <template #label>UI変更</template>
            
            <div class="_gaps_s">
                <div style="font-size: 0.9em; opacity: 0.8; margin-bottom: 8px;">
                    UIモード切り替えモーダルを開きます。
                </div>
                
                <button class="_buttonPrimary" @click="openUiSetup" style="width: 100%; padding: 12px; font-weight: bold;">
                    <i class="ti ti-wand"></i> UI選択画面を開く
                </button>
            </div>
        </FormSection>

        <FormSection>
            <template #label>リアクション</template>
            <div class="_gaps_s">
                <MkInfo>
                    ノートについたリアクション絵文字を個別に非表示にできます。<br/>
                    <b>PC:</b> リアクション絵文字を右クリック → 「この絵文字を非表示」<br/>
                    <b>スマホ/タブレット:</b> ノートの「…」メニュー → 「リアクション絵文字を非表示」から選択<br/><br/>
                    絵文字のミュート管理は <MkA to="/settings/mute-block" :class="$style.inlineLink">ミュートとブロック</MkA> から管理できます。
                </MkInfo>

                <FormLink to="/settings/hidden-reactions">
                    <template #icon><i class="ti ti-eye-off"></i></template>
                    非表示リアクション管理
                    <template #suffix>
                        <span v-if="hiddenReactionCount > 0" :class="$style.countBadge">{{ hiddenReactionCount }}件</span>
                    </template>
                </FormLink>
            </div>
        </FormSection>

        <FormSection>
            <template #label>タイムライン</template>
            <div class="_gaps_s">
                <div style="font-weight: bold; margin-bottom: 8px;">新規ノートのアニメーション方向</div>
                <div style="font-size: 0.9em; opacity: 0.7; margin-bottom: 12px;">タイムラインに新しいノートが追加される際のアニメーション方向を選択します</div>
                <MkRadios v-model="timelineAnimationDirection">
                    <option value="top">上からスライド</option>
                    <option value="left">左からスライド</option>
                    <option value="right">右からスライド</option>
                    <option value="random">ランダム</option>
                </MkRadios>
            </div>
        </FormSection>

        <FormSection>
            <template #label>投稿フォーム</template>
            <MkSwitch v-model="showHashtagButtonInPostForm">
                <template #label>ハッシュタグボタンを表示</template>
                <template #caption>投稿フォームにハッシュタグボタンを表示します</template>
            </MkSwitch>

            <MkSwitch v-model="showDrawingButtonInPostForm">
                <template #label>お絵かきボタンを表示</template>
                <template #caption>投稿フォームにお絵かきボタンを表示します</template>
            </MkSwitch>
        </FormSection>

        <FormSection>
            <template #label>ログイン日数</template>
            <MkSwitch v-model="showLoginBonusPopup">
                <template #label>ログイン日数のポップアップを表示</template>
                <template #caption>毎日最初のログイン時にログイン日数のポップアップを表示します</template>
            </MkSwitch>
        </FormSection>

    </div>
</SearchMarker>
</template>

<script lang="ts" setup>
import { computed, ref, watch, onMounted } from 'vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkRadios from '@/components/MkRadios.vue';
import MkInfo from '@/components/MkInfo.vue';
import FormSection from '@/components/form/section.vue';
import FormLink from '@/components/form/link.vue';
import MkFeatureBanner from '@/components/MkFeatureBanner.vue';
import * as os from '@/os.js';
import { miLocalStorage } from '@/local-storage.js';
import { prefer } from '@/preferences.js';
import { definePage } from '@/page.js';
import { getHiddenReactions, hiddenReactionsVersion } from '@/utility/hidden-reactions.js';


// ▼▼▼ ヘルパー関数: LocalStorageとrefを同期させる ▼▼▼
function useLocalStorageBool(key: string, defaultValue: boolean) {
    const stored = miLocalStorage.getItem(key);
    const val = ref(stored !== null ? stored === 'true' : defaultValue);
    watch(val, (newVal) => {
        miLocalStorage.setItem(key, String(newVal));
    });
    return val;
}

function useLocalStorageString(key: string, defaultValue: string) {
    const val = ref(miLocalStorage.getItem(key) || defaultValue);
    watch(val, (newVal) => {
        miLocalStorage.setItem(key, newVal);
    });
    return val;
}
// ▲▲▲ ヘルパー関数ここまで ▲▲▲

// 各設定項目を LocalStorage にバインド
const showHashtagButtonInPostForm = useLocalStorageBool('showHashtagButtonInPostForm', true);
const showDrawingButtonInPostForm = useLocalStorageBool('showDrawingButtonInPostForm', true);
const showLoginBonusPopup = useLocalStorageBool('showLoginBonusPopup', true);

const timelineAnimationDirection = useLocalStorageString('timelineAnimationDirection', 'left');

// UIセットアップモーダルを開く
const openUiSetup = async () => {
    const { defineAsyncComponent: dac } = await import('vue');
    os.popup(dac(() => import('@/components/MkUISetup.vue')), {}, {}, 'closed');
};

// 外部アカウント連携（prefer.s経由）
const isExternalLinked = computed(() => {
    return prefer.s['external.enabled'] && prefer.s['external.token'] != null;
});

// リアクション件数
const hiddenReactionCount = computed(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    hiddenReactionsVersion.value;
    return getHiddenReactions().length;
});

onMounted(async () => {
});

definePage({
    title: '旗鯖独自機能',
    icon: 'ti ti-flag',
});
</script>

<style lang="scss" module>
.linkedBadge {
    color: var(--MI_THEME-success);
    font-size: 0.9em;
}

.countBadge {
    opacity: 0.7;
    font-size: 0.9em;
}

.inlineLink {
    color: var(--MI_THEME-accent);

    &:hover {
        text-decoration: underline;
    }
}

</style>
