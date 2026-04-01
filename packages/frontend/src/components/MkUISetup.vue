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
                <div :class="$style.cardIcon"><i class="ti ti-device-mobile"></i></div>
                <div :class="$style.cardTitle">Hata UI</div>
                <div :class="$style.cardDesc">
                    旗鯖オリジナルのUIです。端末を問わず利用でき、旗鯖ならではのUI体験ができます。
                </div>
            </button>

            <button :class="$style.optionCard" @click="select('default')">
                <div :class="$style.cardIcon"><i class="ti ti-layout-navbar"></i></div>
                <div :class="$style.cardTitle">Misskey UI</div>
                <div :class="$style.cardDesc">
                    MisskeyのUIを使用できます。ただし、旗鯖は多くのMisskey機能をカスタマイズしているため意図しない動作が発生することがあります。
                </div>
            </button>

            <button :class="$style.optionCard" @click="select('deck')">
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
    miLocalStorage.setItem('ui', type);
    miLocalStorage.setItem('ui_setup_completed', 'true');
    location.reload();
};
</script>

<style lang="scss" module>
.root {
    background-color: rgba(0, 0, 0, 0.65) !important;
    backdrop-filter: blur(24px) !important;
    -webkit-backdrop-filter: blur(24px) !important;
    color: #fff !important;
    border-radius: 24px;
    padding: 32px;
    width: 100%;
    max-width: 900px;
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

.cancelArea {
    margin-top: 24px;
    text-align: center;
}

.cancelButton {
    padding: 8px 24px;
    background: transparent !important;
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
