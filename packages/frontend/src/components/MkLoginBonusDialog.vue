<!--
SPDX-FileCopyrightText: syuilo and misskey-project & Hata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModal ref="modal" :preferType="'dialog'" @click="close" @closed="emit('closed')">
    <div :class="$style.root" @click.stop>
        <div :class="$style.header">
            <i class="ti ti-gift"></i>
            <h2>{{ copy.title }}</h2>
        </div>

        <div :class="$style.body">
            <div :class="$style.streak">
                <div :class="$style.days">{{ loginDays }}</div>
                <div :class="$style.label">{{ copy.dayUnit }}</div>
            </div>

            <div v-if="ranking > 0" :class="$style.ranking">
                <i class="ti ti-crown"></i>
                <span>{{ copy.serverRankPrefix }} <strong>{{ i18n.tsx._hata._loginBonus.rank({ rank: ranking }) }}</strong></span>
            </div>

            <p :class="$style.message">
                {{ getMessage() }}
            </p>

            <div v-if="newAchievement" :class="$style.achievement">
                <i class="ti ti-trophy"></i>
                <span>{{ i18n.tsx._hata._loginBonus.achievementEarned({ name: newAchievement }) }}</span>
            </div>

            <div :class="$style.nextReward">
                <i class="ti ti-target"></i>
                <span>{{ copy.untilNextAchievement }} <strong>{{ i18n.tsx._hata._loginBonus.days({ days: nextRewardDays }) }}</strong></span>
            </div>
        </div>

        <button :class="$style.closeBtn" @click="close">OK</button>
    </div>
</MkModal>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import MkModal from '@/components/MkModal.vue';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const copy = i18n.ts._hata._loginBonus;

const emit = defineEmits<{
    (ev: 'closed'): void;
}>();

const modal = ref<InstanceType<typeof MkModal>>();
const ranking = ref(0);

// カレンダー削除に伴い、viewYear/viewMonthなどの変数を削除

const loginDays = computed(() => $i?.loggedInDays ?? 0);

const milestones = [3, 7, 15, 30, 60, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

const newAchievement = computed(() => {
    const days = loginDays.value;
    return milestones.includes(days) ? i18n.tsx._hata._loginBonus.loginAchievement({ days }) : null;
});

const nextRewardDays = computed(() => {
    const days = loginDays.value;
    for (const m of milestones) {
        if (days < m) return m - days;
    }
    return 0;
});

// カレンダー計算用ロジック(loggedInDatesSet, canGoPrev, canGoNext, calendarDays, monthlyLoginCount)を削除
// 月移動関数(goPrevMonth, goNextMonth)を削除

function getMessage() {
    const days = loginDays.value;
    if (days === 1) return copy.messageFirst;
    if (days < 7) return copy.messageGettingStarted;
    if (days < 30) return copy.messageRegular;
    if (days < 100) return copy.messageThanks;
    if (days < 365) return copy.messageAmazing;
    return copy.messageLegend;
}

function close() {
    modal.value?.close();
}

onMounted(async () => {
    // ランキングを取得
    try {
        const res = await misskeyApi('hata/login-ranking', {});
        if (res && typeof res.rank === 'number') {
            ranking.value = res.rank;
        }
    } catch (err) {
        console.warn('Login ranking API not available:', err);
        ranking.value = 0;
    }
});
</script>

<style lang="scss" module>
.root {
    background: var(--MI_THEME-panel);
    border-radius: 20px;
    padding: 24px;
    width: 380px;
    max-width: 90vw;
    text-align: center;
}

.header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 20px;

    i {
        font-size: 28px;
        color: #f39c12;
    }

    h2 {
        margin: 0;
        font-size: 20px;
    }
}

.body {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.streak {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 4px;
}

.days {
    font-size: 64px;
    font-weight: 700;
    background: linear-gradient(135deg, #f39c12, #e74c3c);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1;
}

.label {
    font-size: 24px;
    font-weight: 500;
    opacity: 0.7;
}

.ranking {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 16px;
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.2));
    border-radius: 20px;

    i {
        color: #ffd700;
        font-size: 18px;
    }

    strong {
        color: #ffd700;
        font-weight: 700;
    }
}

.message {
    margin: 0;
    font-size: 14px;
    opacity: 0.8;
}

.achievement {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: linear-gradient(135deg, rgba(243, 156, 18, 0.2), rgba(231, 76, 60, 0.2));
    border-radius: 12px;
    border: 1px solid rgba(243, 156, 18, 0.3);

    i {
        color: #f39c12;
        font-size: 20px;
    }

    span {
        font-weight: 500;
    }
}

// カレンダー関連のスタイル(.calendar, .calendarHeader, .calendarWeekdays, .calendarGrid, .calendarDay, .calendarStats)を削除

.nextReward {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    opacity: 0.8;

    i {
        color: var(--MI_THEME-accent);
    }

    strong {
        color: var(--MI_THEME-accent);
    }
}

.closeBtn {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 12px;
    background: var(--MI_THEME-accent);
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 16px;

    &:hover {
        opacity: 0.9;
    }
}
</style>
