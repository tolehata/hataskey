<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModalWindow ref="dialog" :width="380" :height="430" :withOkButton="false" :withCloseButton="true" @close="dialog?.close()" @closed="emit('closed')">
	<template #header><span :class="$style.heading"><Gauge :size="18"/> APIのひと息メーター</span></template>
	<div :class="$style.body">
		<template v-if="effectiveStatus">
			<div :class="$style.hero">
				<div :class="$style.ring" :data-level="level" :style="ringStyle" role="img" :aria-label="`レートリミット残量 ${effectiveStatus.remaining}/${effectiveStatus.limit}`">
					<div :class="$style.ringInner"><strong>{{ percentage }}</strong><span>%</span></div>
				</div>
				<div :class="$style.heroCopy"><strong>{{ availabilityMessage }}</strong><span>1時間の共通枠 {{ effectiveStatus.limit }} 回のうち</span></div>
			</div>

			<section :class="$style.meterSection">
				<div :class="$style.meterLabel"><span>残りのレートリミット</span><b>{{ effectiveStatus.remaining }} / {{ effectiveStatus.limit }}</b></div>
				<div :class="$style.progress" role="progressbar" aria-label="残りのレートリミット" aria-valuemin="0" :aria-valuemax="effectiveStatus.limit" :aria-valuenow="effectiveStatus.remaining"><span :style="{ width: `${percentage}%` }"></span></div>
			</section>

			<div :class="$style.resetCard">
				<TimerReset :size="20"/>
				<div><strong>{{ resetMessage }}</strong><span>{{ resetClock }}</span></div>
			</div>
		</template>
		<div v-else :class="$style.waiting">
			<Gauge :size="34"/><strong>最初のAPI操作を待っています</strong><span>タイムラインの更新などを行うと、サーバーから実際の残量を受け取ります。</span>
		</div>

		<p :class="$style.note"><Info :size="16"/><span>HataSNSCordUIからサーバーへ送るAPI操作の共通枠です。受信するだけのリアルタイム配信や、通常UI・外部アプリ・連合処理には適用されません。</span></p>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import { Gauge, Info, TimerReset } from '@lucide/vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import { getEffectiveHatacordingRateLimit, hatacordingRateLimitSnapshot } from '@/utility/hatacording-rate-limit.js';

const emit = defineEmits<{
	(ev: 'closed'): void;
}>();

const dialog = useTemplateRef('dialog');
const now = ref(Date.now());
let clockTimer: number | null = null;

const effectiveStatus = computed(() => getEffectiveHatacordingRateLimit(hatacordingRateLimitSnapshot.value, now.value));
const percentage = computed(() => effectiveStatus.value == null ? 0 : Math.round(effectiveStatus.value.remaining / effectiveStatus.value.limit * 100));
const level = computed(() => percentage.value <= 20 ? 'low' : percentage.value <= 45 ? 'medium' : 'normal');
const ringStyle = computed(() => ({ '--rate-progress': `${percentage.value * 3.6}deg` }));
const secondsUntilReset = computed(() => effectiveStatus.value == null ? 0 : Math.max(0, Math.ceil((effectiveStatus.value.resetAt - now.value) / 1000)));
const resetReached = computed(() => effectiveStatus.value != null && effectiveStatus.value.resetAt <= now.value);
const availabilityMessage = computed(() => {
	if (effectiveStatus.value == null) return '';
	if (resetReached.value) return '次の操作で残量を再計測';
	if (effectiveStatus.value.remaining >= effectiveStatus.value.limit) return '利用する準備ができています';
	return `まだ ${effectiveStatus.value.remaining} 回活用できます`;
});
const resetMessage = computed(() => {
	if (secondsUntilReset.value === 0) return '新しい計測枠へ切り替わる時刻です';
	const hours = Math.floor(secondsUntilReset.value / 3600);
	const minutes = Math.floor((secondsUntilReset.value % 3600) / 60);
	const seconds = secondsUntilReset.value % 60;
	if (hours > 0) return `あと ${hours}時間${minutes > 0 ? `${minutes}分` : ''}で操作枠が復活`;
	if (minutes > 0) return `あと ${minutes}分${seconds > 0 ? `${seconds}秒` : ''}で操作枠が復活`;
	return `あと ${seconds}秒で操作枠が復活`;
});
const resetClock = computed(() => {
	if (effectiveStatus.value == null || secondsUntilReset.value === 0) return '次のAPI操作から新しい計測区間になります';
	return `${new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(effectiveStatus.value.resetAt))} ごろ復活`;
});

onMounted(() => {
	clockTimer = window.setInterval(() => { now.value = Date.now(); }, 1000);
});

onBeforeUnmount(() => {
	if (clockTimer != null) window.clearInterval(clockTimer);
});
</script>

<style lang="scss" module>
.heading { display:flex;align-items:center;gap:7px }
.body { display:flex;min-height:100%;box-sizing:border-box;flex-direction:column;gap:18px;padding:22px;background:var(--MI_THEME-bg);color:var(--MI_THEME-fg) }
.hero { display:flex;align-items:center;justify-content:center;gap:20px;padding:10px 0 3px }
.ring { --ring-color:var(--MI_THEME-accent);display:grid;position:relative;width:92px;height:92px;flex:0 0 92px;place-items:center;border-radius:50%;background:conic-gradient(from -90deg,var(--ring-color) 0 var(--rate-progress),color-mix(in srgb,var(--MI_THEME-divider) 72%,transparent) var(--rate-progress) 360deg);box-shadow:0 8px 24px color-mix(in srgb,var(--ring-color) 16%,transparent) }
.ring::before { content:"";position:absolute;inset:8px;border-radius:50%;background:var(--MI_THEME-panel) }
.ring[data-level='medium'] { --ring-color:#d79621 }
.ring[data-level='low'] { --ring-color:#e45c64 }
.ringInner { display:flex;position:relative;align-items:baseline;z-index:1 }
.ringInner strong { font-size:1.65rem;font-variant-numeric:tabular-nums;line-height:1 }
.ringInner span { margin-left:2px;font-size:.7rem;opacity:.62 }
.heroCopy { display:flex;min-width:0;flex-direction:column;gap:4px }
.heroCopy strong { font-size:1rem }
.heroCopy span { font-size:.78rem;opacity:.62 }
.meterSection { display:flex;flex-direction:column;gap:8px }
.meterLabel { display:flex;justify-content:space-between;gap:12px;font-size:.82rem }
.meterLabel b { font-variant-numeric:tabular-nums }
.progress { height:9px;overflow:hidden;border-radius:999px;background:color-mix(in srgb,var(--MI_THEME-divider) 72%,transparent) }
.progress span { display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,color-mix(in srgb,var(--MI_THEME-accent) 70%,#4fd1a1),var(--MI_THEME-accent));transition:width .24s ease }
.resetCard { display:flex;align-items:center;gap:11px;padding:12px 13px;border:1px solid var(--MI_THEME-divider);border-radius:13px;background:var(--MI_THEME-panel) }
.resetCard>div { display:flex;min-width:0;flex-direction:column;gap:3px }
.resetCard strong { font-size:.84rem }
.resetCard span { font-size:.72rem;opacity:.62 }
.waiting { display:flex;min-height:180px;align-items:center;justify-content:center;flex-direction:column;gap:8px;text-align:center }
.waiting strong { font-size:.95rem }
.waiting span { max-width:290px;font-size:.78rem;line-height:1.65;opacity:.66 }
.note { display:flex;align-items:flex-start;gap:8px;margin:auto 0 0;padding:11px;border-radius:12px;background:color-mix(in srgb,var(--MI_THEME-accent) 9%,var(--MI_THEME-panel));font-size:.7rem;line-height:1.6 }
.note svg { flex:0 0 auto;margin-top:2px;color:var(--MI_THEME-accent) }
@media (prefers-reduced-motion:reduce) { .progress span { transition:none } }
</style>
