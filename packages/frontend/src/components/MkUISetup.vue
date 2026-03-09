<template>
<MkModal ref="modal" :preferType="'dialog'" @click="close" @closed="emit('closed')">
    <div :class="$style.root">
        <header :class="$style.header">
            <i class="ti ti-settings-spark" :class="$style.headerIcon"></i>
            <h1 :class="$style.headerTitle">Welcome to {{ instanceName }}</h1>
            <p :class="$style.headerDesc">利用するインターフェースを選択してください。</p>
        </header>

        <div :class="$style.optionsGrid">
            <button :class="$style.optionCard" @click="select('simple')">
                <div :class="[$style.badge, $style.badgeRec]">Recommended for Mobile</div>
                <div :class="$style.cardIcon"><i class="ti ti-device-mobile"></i></div>
                <div :class="$style.cardTitle">モダンシンプルUI</div>
                <div :class="$style.cardDesc">
                    旗鯖標準のUIです。スマホではこのUIの使用を強く推奨します。
                </div>
            </button>

            <button :class="$style.optionCard" @click="select('default')">
                <div :class="[$style.badge, $style.badgeStd]">Standard</div>
                <div :class="$style.cardIcon"><i class="ti ti-layout-navbar"></i></div>
                <div :class="$style.cardTitle">デフォルトUI</div>
                <div :class="$style.cardDesc">
                    Misskeyの標準的なUIです。PC/タブレットでの使用をおすすめします。<br>
                    <span :class="$style.warn">なお、スマホでも使用できますが、表示に不具合を生じる場合があります。</span>
                </div>
            </button>

            <button :class="$style.optionCard" @click="select('deck')">
                <div :class="[$style.badge, $style.badgePc]">PC Power User</div>
                <div :class="$style.cardIcon"><i class="ti ti-columns"></i></div>
                <div :class="$style.cardTitle">デッキUI</div>
                <div :class="$style.cardDesc">
                    複数のカラムを並べて表示します。<br>
                    PCでのリアルタイム監視に最適です。
                </div>
            </button>
        </div>

        <div :class="$style.cancelArea">
            <button class="_button" :class="$style.cancelButton" @click="close">キャンセル</button>
        </div>
    </div>
</MkModal>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import MkModal from '@/components/MkModal.vue';
import { instanceName } from '@@/js/config.js';
import { miLocalStorage } from '@/local-storage.js';

const emit = defineEmits<{
    (e: 'closed'): void;
}>();

const modal = ref<InstanceType<typeof MkModal>>();

const close = () => {
    modal.value?.close();
};

const select = (type: 'simple' | 'default' | 'deck') => {
    // 1. 設定を保存
    miLocalStorage.setItem('ui', type);
    miLocalStorage.setItem('ui_setup_completed', 'true');
    location.reload();
};
</script>

<style lang="scss" module>
.root {
    /* 背景を半透明の黒、ぼかし効果 */
    background-color: rgba(0, 0, 0, 0.65) !important;
    backdrop-filter: blur(24px) !important;
    -webkit-backdrop-filter: blur(24px) !important;
    color: #fff !important;
    
    border-radius: 24px;
    padding: 32px;
    width: 100%;
    max-width: 900px;
    /* 外枠 */
    border: 2px solid rgba(255, 255, 255, 0.2) !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.header {
    text-align: center;
    margin-bottom: 28px;
    color: #fff !important;
}

.headerIcon {
    display: block;
    font-size: 3em;
    color: var(--accent);
    margin-bottom: 12px;
}

.headerTitle {
    font-size: 1.6em;
    margin: 0 0 8px 0;
    font-weight: bold;
    color: #fff !important;
}

.headerDesc {
    opacity: 0.9;
    margin: 0;
    line-height: 1.5;
    font-size: 0.95em;
    color: rgba(255, 255, 255, 0.9) !important;
}

.optionsGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
}

.optionCard {
    position: relative;
    background-color: rgba(255, 255, 255, 0.08) !important;
    
    /* ★修正: 枠線を太く、はっきりと表示 (2px solid) */
    border: 2px solid rgba(255, 255, 255, 0.4) !important;
    
    color: #fff !important;
    border-radius: 16px;
    padding: 28px 20px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    user-select: none;
    -webkit-tap-highlight-color: transparent;

    &:hover,
    &:active {
        /* ホバー時はアクセントカラーの枠線にする */
        border-color: var(--accent) !important;
        background-color: rgba(255, 255, 255, 0.15) !important;
        transform: translateY(-2px);
    }
}

.cardIcon {
    font-size: 2.5em;
    margin-bottom: 14px;
    color: var(--accent);
}

.cardTitle {
    font-size: 1.15em;
    font-weight: bold;
    margin-bottom: 8px;
    color: #fff !important;
}

.cardDesc {
    font-size: 0.85em;
    opacity: 0.9;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.9) !important;
}

.warn {
    display: block;
    margin-top: 8px;
    color: #ff6b6b !important;
    font-weight: bold;
    font-size: 0.9em;
}

.badge {
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 0.65em;
    padding: 3px 8px;
    border-radius: 99px;
    font-weight: bold;
    color: #fff !important;
}

.badgeRec { background: var(--accent); }
.badgeStd { background: #666; }
.badgePc { background: #555; }

.cancelArea {
    margin-top: 24px;
    text-align: center;
}

.cancelButton {
    padding: 8px 24px;
    background: transparent !important;
    /* キャンセルボタンにも薄い枠線を追加 */
    border: 1px solid rgba(255, 255, 255, 0.5) !important;
    color: #fff !important;

    &:hover {
        background: rgba(255, 255, 255, 0.1) !important;
    }
}

@media (max-width: 600px) {
    .root {
        padding: 24px 16px;
    }

    .optionsGrid {
        grid-template-columns: 1fr;
    }

    .optionCard {
        padding: 20px 16px 16px;
    }

    .headerTitle {
        font-size: 1.3em;
    }

    .cardIcon {
        font-size: 2em;
    }
}
</style>