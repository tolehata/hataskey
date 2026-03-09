<!--
SPDX-FileCopyrightText: syuilo and misskey-project & Hata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModal ref="modal" :preferType="'dialog'" @click="close" @closed="emit('closed')">
    <div :class="$style.root" @click.stop>
        <div :class="$style.header">
            <i class="ti ti-gift"></i>
            <h2>ログイン日数</h2>
        </div>

        <div :class="$style.body">
            <div :class="$style.streak">
                <div :class="$style.days">{{ loginDays }}</div>
                <div :class="$style.label">日目</div>
            </div>

            <div v-if="ranking > 0" :class="$style.ranking">
                <i class="ti ti-crown"></i>
                <span>サーバー内 <strong>{{ ranking }}位</strong></span>
            </div>

            <p :class="$style.message">
                {{ getMessage() }}
            </p>

            <div v-if="newAchievement" :class="$style.achievement">
                <i class="ti ti-trophy"></i>
                <span>実績「{{ newAchievement }}」を獲得！</span>
            </div>

            <div :class="$style.nextReward">
                <i class="ti ti-target"></i>
                <span>次の実績まで: <strong>{{ nextRewardDays }}</strong>日</span>
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
import { misskeyApi } from '@/utility/misskey-api.js';

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
    const achievementNames: Record<number, string> = {
        3: 'ログイン3日',
        7: 'ログイン7日',
        15: 'ログイン15日',
        30: 'ログイン30日',
        60: 'ログイン60日',
        100: 'ログイン100日',
        200: 'ログイン200日',
        300: 'ログイン300日',
        400: 'ログイン400日',
        500: 'ログイン500日',
        600: 'ログイン600日',
        700: 'ログイン700日',
        800: 'ログイン800日',
        900: 'ログイン900日',
        1000: 'ログイン1000日',
    };
    return achievementNames[days] || null;
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
    if (days === 1) return 'ようこそ！最初のログインです！';
    if (days < 7) return 'こんにちは！サーバーに慣れてきましたか？';
    if (days < 30) return 'もうすっかり常連ですね！';
    if (days < 100) return 'これからもよろしくお願いします！';
    if (days < 365) return 'すごい...！';
    return '伝説のユーザーです！';
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
