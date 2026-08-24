<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div :class="$style.root">
		<header v-if="!initializing && (!allowed || consentAccepted)" :class="$style.hero">
			<div :class="$style.heroIcon"><i class="ti ti-mood-search"></i></div>
			<div><h1>{{ copy.title }}</h1><p>{{ copy.intro }}</p></div><div :class="$style.user"><button v-if="allowed && consentAccepted" type="button" :class="[$style.actionButton, $style.iconButton]" :title="copy.showNotice" :aria-label="copy.showNotice" @click="openIntroduction"><i class="ti ti-info-circle"></i></button><span v-if="$i">@{{ $i.username }}</span><MkAvatar v-if="$i" :user="$i" :class="$style.avatar"/></div>
		</header>

		<div v-if="consentAccepted && allowed" :class="$style.notice"><i class="ti ti-info-circle"></i><span>{{ copy.nonMedical }}</span></div>

		<nav v-if="consentAccepted && allowed" :class="$style.tabs" :aria-label="copy.title">
			<button v-for="item in tabs" :key="item.key" type="button" :class="$style.tab" :data-active="activeTab === item.key" :aria-current="activeTab === item.key ? 'page' : undefined" @click="activeTab = item.key">
				<i :class="item.icon"></i>{{ item.label }}
			</button>
		</nav>
		<p v-if="consentAccepted && allowed && activeTab !== 'new' && errorMessage" :class="$style.errorBanner" role="alert">{{ errorMessage }}</p>

		<main>
			<section v-if="initializing" :class="$style.card"><div :class="$style.empty"><i class="ti ti-loader-2"></i><p>{{ copy.loading }}</p></div></section>
			<section v-else-if="!allowed" :class="$style.card"><div :class="$style.unavailable"><i class="ti ti-lock"></i><h2>{{ copy.unavailableTitle }}</h2><p>{{ copy.unavailableBody }}</p><p :class="$style.unavailableHint">{{ copy.unavailableHint }}</p><strong>{{ copy.serverAdmin }}</strong><button type="button" :class="[$style.actionButton, $style.secondaryButton, $style.backButton]" @click="goBack"><i class="ti ti-arrow-left"></i>{{ copy.back }}</button><footer :class="$style.deniedFooter">{{ copy.deniedFooter }}</footer></div></section>
			<section v-else-if="!consentAccepted" :class="$style.introCard"><div :class="$style.introBody"><div :class="$style.introIcon"><i class="ti ti-mood-search"></i></div><h2>{{ copy.beforeStartTitle }}</h2><p :class="$style.introLead">{{ copy.intro }}</p><div :class="$style.medical"><h3><i class="ti ti-alert-triangle"></i>{{ copy.nonMedical }}</h3><p>{{ copy.medicalBody }}</p></div><div :class="$style.infoGrid"><div><b>{{ copy.infoAnalyze }}</b><span>{{ copy.infoAnalyzeBody }}</span></div><div><b>{{ copy.infoSave }}</b><span>{{ copy.infoSaveBody }}</span></div><div><b>{{ copy.infoPersonal }}</b><span>{{ copy.infoPersonalBody }}</span></div><div><b>{{ copy.license }}</b><span>{{ copy.licenseBody }}</span></div></div><button type="button" :class="[$style.actionButton, $style.primaryButton]" @click="acceptConsent">{{ copy.continue }}</button><small :class="$style.introFootnote">{{ copy.beforeStartBody }}</small></div></section>
			<template v-else>
				<section v-if="activeTab === 'new'" :class="$style.card">
					<div v-if="waiting" :class="$style.waiting" aria-live="polite">
						<div :class="$style.waitingIcon"><i class="ti ti-hourglass"></i></div>
						<div><h2>{{ copy.statusWaiting }}</h2><p>{{ copy.waitingBody }}</p><strong>{{ waitingLabel }}</strong></div>
						<button type="button" :class="[$style.actionButton, $style.secondaryButton, $style.subtleButton]" @click="refreshHistory"><i class="ti ti-refresh"></i>{{ copy.refresh }}</button>
					</div>
					<form v-else :class="$style.form" @submit.prevent="createAnalysis">
						<h2>{{ copy.conditionTitle }}</h2>
						<label :class="$style.field"><span>{{ copy.period }}</span><select v-model="conditions.mode"><option value="latest">{{ copy.latest1000 }}</option><option value="period">{{ copy.periodSpecified }}</option></select></label>
						<label v-if="conditions.mode === 'period'" :class="$style.field"><span>{{ copy.period }}</span><select v-model.number="conditions.periodDays"><option value="7">{{ copy.period7 }}</option><option value="30">{{ copy.period30 }}</option><option value="90">{{ copy.period90 }}</option></select></label>
						<label :class="$style.field"><span>{{ copy.visibility }}</span><select v-model="conditions.visibility"><option value="publicHome">{{ copy.visibilityPublicHome }}</option><option value="followers">{{ copy.visibilityFollowers }}</option><option value="all">{{ copy.visibilityAll }}</option></select></label>
						<label v-if="history.length" :class="$style.field"><span>{{ copy.comparisonTarget }}</span><select v-model="newBaseId"><option value="">{{ copy.compareNone }}</option><option v-for="item in history" :key="`new-base-${item.id}`" :value="item.id">{{ formatDate(item.createdAt) }} · {{ conditionLabel(item) }}</option></select></label>
						<label :class="$style.check"><input v-model="conditions.includeReplies" type="checkbox"><span>{{ copy.includeReplies }}</span></label>
						<label :class="$style.check"><input v-model="conditions.includeCw" type="checkbox"><span>{{ copy.includeCw }}</span></label>
						<label :class="$style.check"><input v-model="conditions.saveToHistory" type="checkbox"><span>{{ copy.saveHistory }}</span></label>
						<!-- ⚠️上限を超えると一番古い履歴が消える。保存する前に見える位置へ出す。 -->
						<p v-if="conditions.saveToHistory" :class="$style.limitHint"><i class="ti ti-archive"></i><span>{{ historyLimitNote }}</span></p>
						<div :class="$style.reason"><h3><i class="ti ti-help-circle"></i>{{ copy.reasonTitle }}</h3><p>{{ copy.reasonText }}</p></div>
						<div :class="$style.ratebox"><div><b>{{ copy.analysisInterval }}</b><small>{{ copy.waitingBody }}</small></div><span>{{ serviceReady ? copy.availableNow : copy.serviceUnavailable }}</span></div>
						<p :class="$style.minimumHint"><i class="ti ti-database"></i>{{ copy.minimumNotesHint.replace('{minimum}', String(HATA_EMOTION_ANALYSIS_MIN_NOTES)) }}</p>
						<p v-if="noteCountWarning" :class="$style.warningBanner" role="alert"><i class="ti ti-alert-triangle"></i><span>{{ noteCountWarning }}</span></p>
						<div v-if="!serviceReady" :class="$style.connectionBlock" role="alert"><i class="ti ti-plug-connected-x"></i><span>{{ errorMessage || copy.serviceUnavailable }}</span><button type="button" :class="[$style.actionButton, $style.secondaryButton]" :disabled="checking" @click="refreshHistory"><i class="ti ti-refresh"></i>{{ copy.retryConnection }}</button></div>
						<button type="submit" :class="[$style.actionButton, $style.primaryButton]" :disabled="!canStartAnalysis"><i :class="submitting ? 'ti ti-loader-2' : 'ti ti-sparkles'"></i>{{ submitLabel }}</button>
						<p v-if="errorMessage && serviceReady" :class="$style.error" role="alert">{{ errorMessage }}</p>
					</form>
				</section>

				<section v-else-if="activeTab === 'result'" :class="$style.card">
					<div v-if="selected" :class="$style.result">
						<div :class="$style.resultHeader"><div><span :class="$style.eyebrow">{{ copy.resultSummary }}</span><h2>{{ formatDate(selected.createdAt) }}</h2><p>{{ conditionLabel(selected) }} · {{ copy.analysisVersion }} {{ selected.analysisVersion }}</p></div><div :class="$style.resultActions"><span :class="[$style.status, $style.statusDone]">{{ copy.completed }}</span><button v-if="selected.id && history.length > 1" type="button" :class="[$style.actionButton, $style.secondaryButton, $style.subtleButton]" @click="openComparison(selected)"><i class="ti ti-chart-arrows"></i>{{ copy.comparePrevious }}</button></div></div>
						<div v-if="acceptedCount(selected) === 0" :class="$style.emptyInline">{{ copy.resultNoData }}</div>
						<div v-else :class="$style.resultOverview">
							<section :class="$style.scoreCard"><strong>{{ emotionScore(selected) }}</strong><b>{{ emotionLabel(selected) }}</b><small>{{ copy.nonMedical }}</small></section>
							<div :class="$style.resultGrid"><div :class="$style.resultItem"><span>{{ copy.positiveRate }}</span><strong>{{ positiveRate(selected) }}</strong><small>{{ levelDetail(selected, 'positive') }}</small></div><div :class="$style.resultItem"><span>{{ copy.neutralRate }}</span><strong>{{ neutralRate(selected) }}</strong><small>{{ copy.neutralDescription }}</small></div><div :class="$style.resultItem"><span>{{ copy.negativeRate }}</span><strong>{{ negativeRate(selected) }}</strong><small>{{ levelDetail(selected, 'negative') }}</small></div><div :class="$style.resultItem"><span>{{ copy.emotionalPostRate }}</span><strong>{{ metricValue(selected, 'emotionalPostRate', true) }}</strong></div><div :class="$style.resultItem"><span>{{ copy.calmestHour }}</span><strong>{{ calmestHour(selected) }}</strong></div><div :class="$style.resultItem"><span>{{ copy.analyzedPosts }}</span><strong>{{ metricValue(selected, 'accepted', false, 'input') }}</strong></div></div>
						</div>
						<section v-if="selectedDaily.length" :class="$style.trendSection"><h3>{{ copy.dailyTrend }}</h3><svg :class="$style.resultChart" viewBox="0 0 700 180" preserveAspectRatio="none" :aria-label="copy.dailyTrend"><line x1="0" y1="90" x2="700" y2="90" stroke="currentColor" opacity=".2"/><polyline :points="chartPoints(selected)" fill="none" stroke="var(--MI_THEME-accent)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></section>
						<section v-if="selectedEvidence.length" :class="$style.evidence"><h3>{{ copy.resultReason }}</h3><p>{{ copy.reasonText }}</p><div :class="$style.evidenceGrid"><div v-for="group in selectedEvidence" :key="group.label" :class="$style.evidenceGroup"><b>{{ group.label }}</b><ul><li v-for="item in group.items.slice(0, 8)" :key="`${group.label}-${item.label}`"><span>{{ item.label }}</span><span>{{ evidenceValue(item) }}</span></li></ul></div></div></section>
						<!-- 旗鯖fork(HATAlyze 2.0.0): 感情の8軸。⚠️棒はその分析内での相対値(絶対量ではない)。 -->
						<section v-if="selectedEmotions.length" :class="$style.breakdown">
							<h3>{{ copy.emotionBreakdown }}</h3>
							<p :class="$style.breakdownNote">{{ copy.emotionBreakdownNote }}</p>
							<div :class="$style.statList">
								<div v-for="axis in selectedEmotions" :key="axis.axis" :class="$style.statRow" :data-polarity="axis.polarity">
									<span :class="$style.statLabel">{{ axisLabel(axis.axis) }}</span>
									<span :class="$style.statBar"><i :style="{ width: barWidth(axis.weight, emotionMax) }"></i></span>
									<b :class="$style.statValue">{{ axis.count }}</b>
								</div>
							</div>
						</section>

						<section v-if="selectedTopics.length" :class="$style.breakdown">
							<h3>{{ copy.topicBreakdown }}</h3>
							<div :class="$style.statList">
								<div v-for="topic in selectedTopics" :key="topic.topic" :class="$style.statRow" :data-polarity="topic.averageScore >= 0 ? 'positive' : 'negative'">
									<span :class="$style.statLabel">{{ topic.topic }}</span>
									<span :class="$style.statBar"><i :style="{ width: barWidth(topic.count, topicMax) }"></i></span>
									<b :class="$style.statValue">{{ topic.count }}</b>
								</div>
							</div>
							<p v-if="selectedEngagement?.topTopicByReactions" :class="$style.breakdownNote">
								{{ copy.topTopicByReactions }}: <b>{{ selectedEngagement.topTopicByReactions }}</b>
							</p>
						</section>

						<section v-if="selectedWeekly.length" :class="$style.breakdown">
							<h3>{{ copy.weekdayBreakdown }}</h3>
							<div :class="$style.statList">
								<div v-for="day in selectedWeekly" :key="day.weekday" :class="$style.statRow" :data-polarity="day.averageScore >= 0 ? 'positive' : 'negative'">
									<span :class="$style.statLabel">{{ weekdayLabel(day.weekday) }}</span>
									<span :class="$style.statBar"><i :style="{ width: barWidth(day.count, weekdayMax) }"></i></span>
									<b :class="$style.statValue">{{ day.count }}</b>
								</div>
							</div>
						</section>

						<section v-if="selectedHourly.length" :class="$style.breakdown">
							<h3>{{ copy.hourBreakdown }}</h3>
							<div :class="$style.hourGrid">
								<div v-for="slot in selectedHourly" :key="slot.hour" :class="$style.hourCell" :title="`${slot.hour}: ${slot.count}`">
									<span :class="$style.hourBar" :style="{ height: barWidth(slot.count, hourMax) }" :data-polarity="slot.averageScore >= 0 ? 'positive' : 'negative'"></span>
									<small>{{ hourLabel(slot.hour) }}</small>
								</div>
							</div>
						</section>

						<section v-if="selectedActivity" :class="$style.breakdown">
							<h3>{{ copy.activityTitle }}</h3>
							<div :class="$style.resultGrid">
								<div :class="$style.resultItem"><span>{{ copy.activeDays }}</span><strong>{{ selectedActivity.activeDays }}</strong></div>
								<div :class="$style.resultItem"><span>{{ copy.longestStreak }}</span><strong>{{ selectedActivity.longestStreakDays }}</strong></div>
								<div :class="$style.resultItem"><span>{{ copy.postsPerDay }}</span><strong>{{ decimal(selectedActivity.averagePostsPerActiveDay) }}</strong></div>
								<div :class="$style.resultItem"><span>{{ copy.medianInterval }}</span><strong>{{ decimal(selectedActivity.medianIntervalMinutes, 0) }}</strong></div>
								<div :class="$style.resultItem"><span>{{ copy.busiestHour }}</span><strong>{{ selectedActivity.busiestHour }}</strong></div>
								<div :class="$style.resultItem"><span>{{ copy.busiestWeekday }}</span><strong>{{ weekdayLabel(selectedActivity.busiestWeekday) }}</strong></div>
								<div :class="$style.resultItem"><span>{{ copy.nightPostRate }}</span><strong>{{ percent(selectedActivity.nightPostRate) }}</strong></div>
								<div :class="$style.resultItem"><span>{{ copy.morningPostRate }}</span><strong>{{ percent(selectedActivity.morningPostRate) }}</strong></div>
							</div>
						</section>

						<section v-if="selectedVocabulary" :class="$style.breakdown">
							<h3>{{ copy.vocabularyTitle }}</h3>
							<div :class="$style.resultGrid">
								<div :class="$style.resultItem"><span>{{ copy.averageSentenceLength }}</span><strong>{{ decimal(selectedVocabulary.averageSentenceLength) }}</strong></div>
								<div :class="$style.resultItem"><span>{{ copy.uniqueTokenRatio }}</span><strong>{{ percent(selectedVocabulary.uniqueTokenRatio) }}</strong></div>
								<div :class="$style.resultItem"><span>{{ copy.hashtagPostRate }}</span><strong>{{ percent(selectedVocabulary.hashtagPostRate) }}</strong></div>
								<div :class="$style.resultItem"><span>{{ copy.mentionPostRate }}</span><strong>{{ percent(selectedVocabulary.mentionPostRate) }}</strong></div>
								<div :class="$style.resultItem"><span>{{ copy.urlPostRate }}</span><strong>{{ percent(selectedVocabulary.urlPostRate) }}</strong></div>
								<div :class="$style.resultItem"><span>{{ copy.emojiPostRate }}</span><strong>{{ percent(selectedVocabulary.emojiPostRate) }}</strong></div>
								<div :class="$style.resultItem"><span>{{ copy.questionPostRate }}</span><strong>{{ percent(selectedVocabulary.questionPostRate) }}</strong></div>
								<div :class="$style.resultItem"><span>{{ copy.exclamationPostRate }}</span><strong>{{ percent(selectedVocabulary.exclamationPostRate) }}</strong></div>
							</div>
						</section>

						<!-- ⚠️頻出語は本文由来なので保存していない。いま出した分析のときだけ表示できる。 -->
						<section v-if="showFrequentWords" :class="$style.breakdown">
							<h3>{{ copy.frequentWordsTitle }}</h3>
							<p :class="$style.breakdownNote">{{ copy.frequentWordsNote }}</p>
							<div :class="$style.statList">
								<div v-for="word in localFrequentWords" :key="word.word" :class="$style.statRow">
									<span :class="$style.statLabel">{{ word.word }}</span>
									<span :class="$style.statBar"><i :style="{ width: barWidth(word.count, frequentWordMax) }"></i></span>
									<b :class="$style.statValue">{{ word.count }}</b>
								</div>
							</div>
						</section>

						<div :class="$style.meta"><span>{{ copy.createdAt }}: {{ formatDate(selected.createdAt) }}</span></div>
					</div>
					<div v-else :class="$style.empty"><i class="ti ti-chart-dots"></i><p>{{ copy.emptyHistory }}</p><button type="button" :class="[$style.actionButton, $style.primaryButton]" @click="activeTab = 'new'">{{ copy.start }}</button></div>
				</section>

				<section v-else :class="$style.card">
					<div :class="$style.historyHeader"><div><h2>{{ copy.history }}</h2><p>{{ copy.comparePrompt }}</p><p :class="$style.limitHint"><i class="ti ti-archive"></i><span>{{ historyLimitNote }}</span></p></div><button type="button" :class="[$style.actionButton, $style.secondaryButton, $style.subtleButton]" @click="refreshHistory"><i class="ti ti-refresh"></i>{{ copy.refresh }}</button></div>
					<div v-if="history.length > 1" :class="$style.compareBar"><label>{{ copy.compareBase }}<select v-model="baseId"><option v-for="item in history" :key="`base-${item.id}`" :value="item.id">{{ formatDate(item.createdAt) }} · {{ conditionLabel(item) }}</option></select></label><span aria-hidden="true"><i class="ti ti-arrows-left-right"></i></span><label>{{ copy.compareWith }}<select v-model="compareId"><option v-for="item in history" :key="`compare-${item.id}`" :value="item.id">{{ formatDate(item.createdAt) }} · {{ conditionLabel(item) }}</option></select></label></div>
					<div v-if="comparePair" :class="$style.metrics"><div :class="$style.metric"><span>{{ copy.emotionBalance }}</span><strong>{{ emotionScore(comparePair.current) }}</strong><small>{{ copy.compareDelta }} {{ emotionDelta(comparePair.current, comparePair.baseline) }}</small></div><div :class="$style.metric"><span>{{ copy.positiveRate }}</span><strong>{{ positiveRate(comparePair.current) }}</strong><small>{{ copy.compareDelta }} {{ rateDelta(comparePair.current, comparePair.baseline, 'positive') }}</small></div><div :class="$style.metric"><span>{{ copy.neutralRate }}</span><strong>{{ neutralRate(comparePair.current) }}</strong><small>{{ copy.compareDelta }} {{ rateDelta(comparePair.current, comparePair.baseline, 'neutral') }}</small></div><div :class="$style.metric"><span>{{ copy.analyzedPosts }}</span><strong>{{ metricValue(comparePair.current, 'accepted', false, 'input') }}</strong><small>{{ copy.compareDelta }} {{ acceptedDelta(comparePair.current, comparePair.baseline) }}</small></div></div>
					<div v-if="comparePair && !versionsCompatible(comparePair.current, comparePair.baseline)" :class="$style.versionWarning">{{ copy.versionWarning }}</div>
					<section v-if="comparePair && versionsCompatible(comparePair.current, comparePair.baseline)" :class="$style.trendSection"><h3>{{ copy.dailyTrend }}</h3><div :class="$style.legend"><span><i :class="$style.currentLine"></i>{{ copy.compareWith }}</span><span><i :class="$style.baseLine"></i>{{ copy.compareBase }}</span></div><svg :class="$style.compareChart" viewBox="0 0 700 180" preserveAspectRatio="none" :aria-label="copy.dailyTrend"><line x1="0" y1="90" x2="700" y2="90" stroke="currentColor" opacity=".2"/><polyline :points="chartPoints(comparePair.current)" fill="none" stroke="var(--MI_THEME-accent)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><polyline :points="chartPoints(comparePair.baseline)" fill="none" stroke="var(--MI_THEME-success)" stroke-width="3" stroke-dasharray="7 6" stroke-linecap="round" stroke-linejoin="round"/></svg></section>
					<section v-if="comparePair" :class="$style.insightSection"><h3>{{ copy.comparisonInsights }}</h3><div :class="$style.insightGrid"><article v-for="insight in comparisonInsights" :key="insight.title"><b>{{ insight.title }}</b><span>{{ insight.body }}</span></article></div></section>
					<div v-if="history.length" :class="$style.historyList"><article v-for="item in history" :key="item.id ?? item.createdAt" :class="[$style.historyItem, selected?.id === item.id && $style.historySelected]"><button type="button" :class="$style.historySelectButton" @click="select(item)"><strong>{{ formatDate(item.createdAt) }}</strong><span>{{ conditionLabel(item) }}</span></button><div :class="$style.historySummary"><span>{{ copy.emotionBalance }} <b>{{ emotionScore(item) }}</b></span><span>{{ copy.positiveRate }} <b>{{ positiveRate(item) }}</b></span></div><span :class="[$style.status, $style.statusDone]">{{ copy.completed }}</span><button type="button" :class="[$style.actionButton, $style.iconButton, $style.dangerButton]" :title="copy.delete" :aria-label="copy.delete" @click="remove(item)"><i class="ti ti-trash"></i></button></article></div>
					<div v-else :class="$style.empty"><i class="ti ti-history"></i><p>{{ copy.emptyHistory }}</p></div>
					<button v-if="history.length" type="button" :class="[$style.actionButton, $style.primaryButton, $style.compareButton]" :disabled="!selected" @click="activeTab = 'result'"><i class="ti ti-chart-arrows"></i>{{ copy.compare }}</button>
				</section>
			</template>
		</main>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { HataEmotionAnalysisInputNote, HataEmotionAnalysisSaveScope } from '@/utility/hata-emotion-analysis.js';
import { definePage } from '@/page.js';
import { useRouter } from '@/router.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
import { miLocalStorage } from '@/local-storage.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import * as os from '@/os.js';
import { analyzeHataEmotion, buildHataEmotionAnalysisSavePayload, canStartHatalyzeAnalysis, classifyHatalyzeFailure, countHataEmotionAnalyzableNotes, getHatalyzeCooldownUntil, HATA_EMOTION_ANALYSIS_MIN_NOTES, HATA_EMOTION_HISTORY_LIMIT, hatalyzeCooldownStorageKey, hatalyzeNoticeStorageKey, hatalyzeNoticeSyncedStorageKey } from '@/utility/hata-emotion-analysis.js';

type EvidenceItem = { label: string; count: number; weight?: number; polarity?: string };
type AnalysisRecord = { id: string | null; createdAt: string; analysisVersion: string; lexiconVersion: string; scope: Record<string, unknown>; source: Record<string, unknown>; summary: Record<string, unknown>; result: Record<string, unknown> };
const copy = i18n.ts._hata._emotionAnalysis;
const copyx = i18n.tsx._hata._emotionAnalysis;
const router = useRouter();
const activeTab = ref<'new' | 'result' | 'history'>('new');
const history = ref<AnalysisRecord[]>([]);
const selected = ref<AnalysisRecord | null>(null);
const submitting = ref(false);
const checking = ref(true);
const consentChecking = ref(true);
const allowed = ref(false);
const serviceReady = ref(false);
const consentAccepted = ref(false);
const errorMessage = ref('');
const noteCountWarning = ref('');
const waitingUntil = ref<number | null>(null);
const now = ref(Date.now());
const submissionPhase = ref<'idle' | 'notes' | 'analysis' | 'create'>('idle');
const conditions = ref({ mode: 'latest' as 'latest' | 'period', periodDays: 30, noteLimit: 1000, visibility: 'publicHome' as 'publicHome' | 'followers' | 'all', includeReplies: false, includeCw: true, saveToHistory: true });
const baseId = ref<string | null>(null);
const compareId = ref<string | null>(null);
const newBaseId = ref<string | null>(null);
let timer: number | undefined;

definePage(() => ({ title: copy.title, icon: 'ti ti-mood-search' }));

const tabs = computed(() => [
	{ key: 'new' as const, label: copy.newTab, icon: 'ti ti-plus' },
	{ key: 'result' as const, label: copy.resultTab, icon: 'ti ti-chart-dots' },
	{ key: 'history' as const, label: copy.historyTab, icon: 'ti ti-history' },
]);
const waiting = computed(() => waitingUntil.value !== null && waitingUntil.value > now.value);
const initializing = computed(() => checking.value || consentChecking.value);
const canStartAnalysis = computed(() => canStartHatalyzeAnalysis({ accountId: $i?.id ?? null, serviceReady: serviceReady.value, submitting: submitting.value, waiting: waiting.value }));
const submitLabel = computed(() => submissionPhase.value === 'notes'
	? copy.checkingNotes
	: submissionPhase.value === 'analysis'
		? copy.processingAnalysis
		: submissionPhase.value === 'create'
			? copy.savingAnalysis
			: copy.start);
const waitingLabel = computed(() => {
	const seconds = Math.max(0, Math.ceil(((waitingUntil.value ?? now.value) - now.value) / 1000));
	return copy.waitingRemaining.replace('{minutes}', String(Math.floor(seconds / 60))).replace('{seconds}', String(seconds % 60).padStart(2, '0'));
});
const comparePair = computed(() => {
	if (history.value.length < 2 || baseId.value === '') return null;
	const current = history.value.find(item => item.id === compareId.value) ?? history.value[0];
	const baseline = history.value.find(item => item.id === baseId.value) ?? history.value[1] ?? current;
	return { current, baseline };
});
const comparisonInsights = computed(() => {
	if (!comparePair.value) return [];
	const { current, baseline } = comparePair.value;
	if (!versionsCompatible(current, baseline)) {
		return [{ title: copy.analysisVersion, body: copy.versionWarning }];
	}
	const hourly = strongestHourlyChange(current, baseline);
	const topic = strongestTopicChange(current, baseline);
	return [
		hourly == null ? null : {
			title: copy.hourlyInsightTitle,
			body: interpolate(copy.hourlyInsightBody, { hour: hourRange(hourly.hour), delta: signed(hourly.delta * 100) }),
		},
		topic == null ? null : {
			title: interpolate(copy.topicInsightTitle, { topic: topic.topic }),
			body: interpolate(copy.topicInsightBody, { before: String(Math.round(topic.before * 100)), after: String(Math.round(topic.after * 100)) }),
		},
		{
			title: sameScope(current, baseline) ? copy.conditionMatchTitle : copy.conditionDifferenceTitle,
			body: sameScope(current, baseline) ? copy.conditionMatchBody : copy.conditionDifferenceBody,
		},
	].filter((item): item is { title: string; body: string } => item != null);
});
const selectedEvidence = computed(() => {
	const evidence = selected.value?.result?.evidence as Record<string, EvidenceItem[]> | undefined;
	if (!evidence) return [];
	const words = [...(evidence.phrases ?? []), ...(evidence.shortcodes ?? [])];
	return [{ label: copy.evidencePositive, items: words.filter(item => item.polarity === 'positive' && item.count > 0) }, { label: copy.evidenceNegative, items: words.filter(item => item.polarity === 'negative' && item.count > 0) }, { label: copy.contextCorrection, items: [...(evidence.negations ?? []), ...(evidence.excludedContexts ?? []), ...(evidence.intensifiers ?? [])].filter(item => item.count > 0) }].filter(group => group.items.length);
});
const selectedDaily = computed(() => (selected.value?.result?.daily as Array<{ averageScore?: number }> | undefined) ?? []);

// ===== 旗鯖fork(HATAlyze 2.0.0): 集計済みなのに出していなかった内訳を表示する =====
type AxisSummary = { axis: string; polarity: 'positive' | 'negative'; count: number; weight: number; averageScore: number };
type GroupedScore = { count: number; averageScore: number };
const resultBlock = <T,>(key: string): T | null => (selected.value?.result?.[key] as T | undefined) ?? null;

const selectedEmotions = computed<AxisSummary[]>(() => (resultBlock<AxisSummary[]>('emotions') ?? []).filter(item => item.count > 0));
const selectedTopics = computed(() => (resultBlock<Array<GroupedScore & { topic: string }>>('topics') ?? []).filter(item => item.count > 0).sort((a, b) => b.count - a.count));
const selectedWeekly = computed(() => (resultBlock<Array<GroupedScore & { weekday: number }>>('weekly') ?? []));
const selectedHourly = computed(() => (resultBlock<Array<GroupedScore & { hour: number }>>('hourly') ?? []));
const selectedActivity = computed(() => resultBlock<Record<string, number>>('activity'));
const selectedVocabulary = computed(() => resultBlock<Record<string, number>>('vocabulary'));
const selectedEngagement = computed(() => resultBlock<{ byLevel: Array<{ level: string; count: number; averageReactions: number }>; topTopicByReactions: string | null }>('engagement'));

/** 棒の長さを出すための、その集計内での最大値。⚠️0除算を避ける。 */
const maxOf = (values: readonly number[]): number => Math.max(1, ...values);
const emotionMax = computed(() => maxOf(selectedEmotions.value.map(item => item.weight)));
const topicMax = computed(() => maxOf(selectedTopics.value.map(item => item.count)));
const weekdayMax = computed(() => maxOf(selectedWeekly.value.map(item => item.count)));
const hourMax = computed(() => maxOf(selectedHourly.value.map(item => item.count)));

function barWidth(value: number, max: number): string { return `${Math.max(0, Math.min(100, (value / max) * 100)).toFixed(1)}%`; }

const axisLabels: Record<string, string> = {
	joy: copy.axisJoy, fun: copy.axisFun, affection: copy.axisAffection, gratitude: copy.axisGratitude,
	anger: copy.axisAnger, sadness: copy.axisSadness, anxiety: copy.axisAnxiety, fatigue: copy.axisFatigue,
};

function axisLabel(axis: string): string { return axisLabels[axis] ?? axis; }

// 2024-01-07 は日曜。曜日名は端末の言語設定に任せる。
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

function weekdayLabel(weekday: number): string { return weekdayFormatter.format(new Date(Date.UTC(2024, 0, 7 + weekday))); }

function percent(value: number | undefined): string { return `${Math.round((value ?? 0) * 100)}%`; }

function decimal(value: number | undefined, digits = 1): string { return (value ?? 0).toFixed(digits); }

function hourLabel(hour: number): string { return `${hour}`; }

/**
 * 頻出語は保存しないので、いま出した分析のときだけ見せられる。
 * ⚠️履歴から選び直した結果には出ない。これは仕様(本文由来の語を保存しないため)。
 */
const localFrequentWords = ref<Array<{ word: string; count: number }>>([]);
const localAnalysisKey = ref<string | null>(null);
const showFrequentWords = computed(() => selected.value != null && selected.value.createdAt === localAnalysisKey.value && localFrequentWords.value.length > 0);
const frequentWordMax = computed(() => maxOf(localFrequentWords.value.map(item => item.count)));
// ⚠️件数は backend の HATALYZE_HISTORY_LIMIT と揃っている必要がある(定数側にも注記あり)。
const historyLimitNote = computed(() => copyx.historyLimitNote({ count: String(HATA_EMOTION_HISTORY_LIMIT) }));
const canUseHint = computed(() => $i?.policies.canUseHatalyze === true || $i?.isModerator === true || $i?.isAdmin === true);

async function refreshHistory() {
	checking.value = true;
	serviceReady.value = false;
	errorMessage.value = '';
	try {
		const response = await misskeyApi('hata/hatask/emotion-analysis/list', {}) as unknown as AnalysisRecord[];
		history.value = Array.isArray(response) ? response : [];
		const latestCreatedAt = history.value[0]?.createdAt;
		if (latestCreatedAt) setCooldown(Math.max(waitingUntil.value ?? 0, new Date(latestCreatedAt).getTime() + 10 * 60 * 1000));
		if (baseId.value === null) baseId.value = history.value[1]?.id ?? history.value[0]?.id ?? null;
		if (!compareId.value) compareId.value = history.value[0]?.id ?? null;
		if (newBaseId.value === null) newBaseId.value = history.value[0]?.id ?? null;
		allowed.value = true;
		serviceReady.value = true;
		if (selected.value) selected.value = history.value.find(item => item.id === selected.value?.id) ?? selected.value;
	} catch (error) {
		const failure = classifyHatalyzeFailure(error, 'history');
		if (failure === 'permission') {
			allowed.value = false;
		} else {
			allowed.value = canUseHint.value;
			errorMessage.value = failure === 'upstreamRateLimit' ? copy.sourceRateLimited : copy.historyFailed;
		}
	} finally { checking.value = false; }
}

async function createAnalysis() {
	if (submitting.value) return;
	if (!canStartAnalysis.value && !serviceReady.value) {
		errorMessage.value = copy.serviceUnavailable;
		return;
	}
	if (!canStartAnalysis.value && waiting.value) return;
	if (!$i) {
		serviceReady.value = false;
		errorMessage.value = copy.serviceUnavailable;
		return;
	}
	const userId = $i.id;
	submitting.value = true; errorMessage.value = ''; noteCountWarning.value = '';
	submissionPhase.value = 'notes';
	try {
		const notes = await loadNotes(userId);
		const analyzableNoteCount = countHataEmotionAnalyzableNotes(notes);
		if (analyzableNoteCount < HATA_EMOTION_ANALYSIS_MIN_NOTES) {
			noteCountWarning.value = copy.insufficientNotes.replace('{count}', String(analyzableNoteCount)).replace('{minimum}', String(HATA_EMOTION_ANALYSIS_MIN_NOTES));
			return;
		}
		submissionPhase.value = 'analysis';
		const analysis = analyzeHataEmotion(notes, { timezoneOffsetMinutes: -new Date().getTimezoneOffset() });
		const scope: HataEmotionAnalysisSaveScope = { mode: conditions.value.mode, periodDays: conditions.value.periodDays, noteLimit: conditions.value.noteLimit, visibility: conditions.value.visibility, includeReplies: conditions.value.includeReplies, includeCw: conditions.value.includeCw, timezoneOffsetMinutes: -new Date().getTimezoneOffset() };
		const payload = buildHataEmotionAnalysisSavePayload(analysis, scope);
		submissionPhase.value = 'create';
		const record = await misskeyApi('hata/hatask/emotion-analysis/create', { ...payload, saveToHistory: conditions.value.saveToHistory }) as unknown as AnalysisRecord;
		selected.value = record;
		// ⚠️頻出語は保存対象外なので、この場でだけ画面に渡す(履歴には残らない)。
		localFrequentWords.value = analysis.frequentWords;
		localAnalysisKey.value = record.createdAt;
		if (record.id) {
			history.value = [record, ...history.value.filter(item => item.id !== record.id)];
			compareId.value = record.id;
			baseId.value = newBaseId.value;
			newBaseId.value = record.id;
		}
		setCooldown(Date.now() + 10 * 60 * 1000);
		activeTab.value = 'result';
	} catch (error) {
		const requestStage = submissionPhase.value === 'create' ? 'create' : 'notes';
		const failure = classifyHatalyzeFailure(error, requestStage);
		if (failure === 'permission') {
			allowed.value = false;
			serviceReady.value = false;
		} else if (failure === 'insufficient') {
			noteCountWarning.value = copy.insufficientNotes.replace('{count}', '0').replace('{minimum}', String(HATA_EMOTION_ANALYSIS_MIN_NOTES));
		} else if (failure === 'hatalyzeCooldown') {
			setCooldown(getHatalyzeCooldownUntil(error));
			errorMessage.value = copy.rateLimited;
		} else if (failure === 'upstreamRateLimit') {
			serviceReady.value = false;
			errorMessage.value = copy.sourceRateLimited;
		} else {
			serviceReady.value = false;
			errorMessage.value = requestStage === 'notes' ? copy.notesFailed : copy.analysisFailed;
		}
	} finally { submitting.value = false; submissionPhase.value = 'idle'; }
}

async function select(item: AnalysisRecord) {
	if (!item.id) { selected.value = item; return; }
	try { selected.value = await misskeyApi('hata/hatask/emotion-analysis/show', { analysisId: item.id }) as unknown as AnalysisRecord; } catch { selected.value = item; }
}

async function remove(item: AnalysisRecord) {
	if (!item.id) return;
	const confirmation = await os.confirm({ type: 'warning', title: copy.delete, text: copy.deleteConfirm });
	if (confirmation.canceled) return;
	try { await misskeyApi('hata/hatask/emotion-analysis/delete', { analysisId: item.id }); history.value = history.value.filter(candidate => candidate.id !== item.id); if (selected.value?.id === item.id) selected.value = null; } catch { errorMessage.value = copy.deleteFailed; }
}

function formatDate(value?: string) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'; }

function conditionLabel(item: AnalysisRecord) { return `${String(item.scope?.mode === 'latest' ? copy.latest1000 : `${item.scope?.periodDays ?? conditions.value.periodDays}${copy.days}`)} / ${visibilityLabel(String(item.scope?.visibility ?? conditions.value.visibility))}`; }

function visibilityLabel(value: string) { return value === 'all' ? copy.visibilityAll : value === 'followers' ? copy.visibilityFollowers : copy.visibilityPublicHome; }

function metricValue(item: AnalysisRecord, key: string, percent = false, group?: string) { const source = group === 'input' ? item.result?.input : group ? item.result?.[group] : item.summary; const value = Number((source as Record<string, unknown> | undefined)?.[key] ?? 0); return `${(percent ? value * 100 : value).toFixed(percent ? 0 : 1)}${percent ? '%' : ''}`; }

function acceptedCount(item: AnalysisRecord) { return Number((item.result?.input as Record<string, unknown> | undefined)?.accepted ?? 0); }

function levels(item: AnalysisRecord) { return (item.summary?.levels as Record<string, unknown> | undefined) ?? {}; }

function levelRate(item: AnalysisRecord, kind: 'positive' | 'neutral' | 'negative') {
	const total = acceptedCount(item);
	if (!total) return 0;
	const itemLevels = levels(item);
	const value = kind === 'positive'
		? Number(itemLevels.positive ?? 0) + Number(itemLevels.strong_positive ?? 0)
		: kind === 'negative'
			? Number(itemLevels.negative ?? 0) + Number(itemLevels.strong_negative ?? 0)
			: Number(itemLevels.neutral ?? 0);
	return value / total;
}

function positiveRate(item: AnalysisRecord) { return `${Math.round(levelRate(item, 'positive') * 100)}%`; }

function neutralRate(item: AnalysisRecord) { return `${Math.round(levelRate(item, 'neutral') * 100)}%`; }

function negativeRate(item: AnalysisRecord) { return `${Math.round(levelRate(item, 'negative') * 100)}%`; }

function levelDetail(item: AnalysisRecord, kind: 'positive' | 'negative') {
	const itemLevels = levels(item);
	return kind === 'positive'
		? `${copy.strongPositiveShort} ${Number(itemLevels.strong_positive ?? 0)}${copy.posts} · ${copy.positiveShort} ${Number(itemLevels.positive ?? 0)}${copy.posts}`
		: `${copy.negativeShort} ${Number(itemLevels.negative ?? 0)}${copy.posts} · ${copy.strongNegativeShort} ${Number(itemLevels.strong_negative ?? 0)}${copy.posts}`;
}

function emotionScoreNumber(item: AnalysisRecord) { return Number(item.summary?.averageScore ?? 0) * 100; }

function emotionScore(item: AnalysisRecord) { const value = emotionScoreNumber(item); return `${value > 0 ? '+' : ''}${value.toFixed(1)}`; }

function emotionLabel(item: AnalysisRecord) { const value = emotionScoreNumber(item); return value > 30 ? copy.strongPositive : value > 5 ? copy.positive : value < -30 ? copy.strongNegative : value < -5 ? copy.negative : copy.neutral; }

function signed(value: number, suffix = '') { return `${value > 0 ? '+' : ''}${value.toFixed(suffix ? 0 : 1)}${suffix}`; }

function emotionDelta(current: AnalysisRecord, baseline: AnalysisRecord) { return signed(emotionScoreNumber(current) - emotionScoreNumber(baseline)); }

function rateDelta(current: AnalysisRecord, baseline: AnalysisRecord, kind: 'positive' | 'neutral') { return signed((levelRate(current, kind) - levelRate(baseline, kind)) * 100, '%'); }

function acceptedDelta(current: AnalysisRecord, baseline: AnalysisRecord) { return signed(acceptedCount(current) - acceptedCount(baseline), copy.posts); }

function versionsCompatible(current: AnalysisRecord, baseline: AnalysisRecord) { return current.analysisVersion === baseline.analysisVersion && current.lexiconVersion === baseline.lexiconVersion && current.result?.formatVersion === baseline.result?.formatVersion; }

function evidenceValue(item: EvidenceItem) { const weight = Number(item.weight ?? 0); return weight > 0 ? `${item.count}${copy.posts} · ${copy.weight} ${weight.toFixed(1)}` : `${item.count}${copy.posts}`; }

function chartPoints(item: AnalysisRecord) { const daily = (item.result?.daily as Array<{ averageScore?: number }> | undefined) ?? []; const values = daily.slice(-14).map(day => Number(day.averageScore ?? 0)); return values.map((value, index) => `${(index / Math.max(1, values.length - 1)) * 680 + 10},${90 - Math.max(-1, Math.min(1, value)) * 70}`).join(' '); }

function hourRange(hour: number) { return interpolate(copy.hourRange, { start: String(hour), end: String((hour + 1) % 24) }); }

function calmestHour(item: AnalysisRecord) {
	const hourly = (item.result?.hourly as Array<{ hour?: number; count?: number; averageScore?: number }> | undefined) ?? [];
	const calmest = hourly.filter(entry => Number(entry.count ?? 0) > 0).sort((a, b) => Math.abs(Number(a.averageScore ?? 0)) - Math.abs(Number(b.averageScore ?? 0)) || Number(b.count ?? 0) - Number(a.count ?? 0))[0];
	return calmest == null ? copy.noComparableData : hourRange(Number(calmest.hour ?? 0));
}

function strongestHourlyChange(current: AnalysisRecord, baseline: AnalysisRecord) {
	const currentHourly = (current.result?.hourly as Array<{ hour?: number; count?: number; averageScore?: number }> | undefined) ?? [];
	const baselineHourly = new Map(((baseline.result?.hourly as Array<{ hour?: number; count?: number; averageScore?: number }> | undefined) ?? []).map(entry => [Number(entry.hour ?? 0), entry]));
	return currentHourly
		.filter(entry => Number(entry.count ?? 0) > 0 && Number(baselineHourly.get(Number(entry.hour ?? 0))?.count ?? 0) > 0)
		.map(entry => ({ hour: Number(entry.hour ?? 0), delta: Number(entry.averageScore ?? 0) - Number(baselineHourly.get(Number(entry.hour ?? 0))?.averageScore ?? 0) }))
		.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0] ?? null;
}

function strongestTopicChange(current: AnalysisRecord, baseline: AnalysisRecord) {
	const currentTotal = Math.max(1, acceptedCount(current));
	const baselineTotal = Math.max(1, acceptedCount(baseline));
	const currentTopics = new Map(((current.result?.topics as Array<{ topic?: string; count?: number }> | undefined) ?? []).map(entry => [String(entry.topic ?? ''), Number(entry.count ?? 0) / currentTotal]));
	const baselineTopics = new Map(((baseline.result?.topics as Array<{ topic?: string; count?: number }> | undefined) ?? []).map(entry => [String(entry.topic ?? ''), Number(entry.count ?? 0) / baselineTotal]));
	return [...new Set([...currentTopics.keys(), ...baselineTopics.keys()])]
		.filter(topic => topic.length > 0)
		.map(topic => ({ topic, before: baselineTopics.get(topic) ?? 0, after: currentTopics.get(topic) ?? 0 }))
		.sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before))[0] ?? null;
}

function sameScope(current: AnalysisRecord, baseline: AnalysisRecord) {
	const keys = ['mode', 'periodDays', 'noteLimit', 'visibility', 'includeReplies', 'includeCw'] as const;
	return keys.every(key => current.scope?.[key] === baseline.scope?.[key]);
}

function interpolate(template: string, values: Record<string, string>) {
	return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, value), template);
}

function openComparison(item: AnalysisRecord) {
	compareId.value = item.id;
	baseId.value = history.value.find(candidate => candidate.id !== item.id && sameScope(item, candidate))?.id ?? history.value.find(candidate => candidate.id !== item.id)?.id ?? null;
	activeTab.value = 'history';
}

function accountStorageKey(kind: 'notice' | 'cooldown') {
	return kind === 'notice' ? hatalyzeNoticeStorageKey($i?.id ?? 'signed-out') : hatalyzeCooldownStorageKey($i?.id ?? 'signed-out');
}

const noticeRegistryScope = ['client', 'hatalyze'];
const noticeRegistryKey = 'noticeAcceptedV1';

async function syncNoticeAcceptance(accountId: string): Promise<void> {
	try {
		await misskeyApi('i/registry/set', { scope: noticeRegistryScope, key: noticeRegistryKey, value: true });
		miLocalStorage.setItem(hatalyzeNoticeSyncedStorageKey(accountId), '1');
	} catch { /* Local account-scoped state remains authoritative until Registry is reachable. */ }
}

async function loadNoticeAcceptance(): Promise<void> {
	const accountId = $i?.id;
	if (!accountId) {
		consentAccepted.value = false;
		return;
	}
	const localAccepted = miLocalStorage.getItem(hatalyzeNoticeStorageKey(accountId)) === '1';
	consentAccepted.value = localAccepted;
	if (localAccepted) {
		if (miLocalStorage.getItem(hatalyzeNoticeSyncedStorageKey(accountId)) !== '1') void syncNoticeAcceptance(accountId);
		return;
	}
	try {
		const remoteAccepted = await misskeyApi('i/registry/get', { scope: noticeRegistryScope, key: noticeRegistryKey }) as unknown;
		if (remoteAccepted === true) {
			consentAccepted.value = true;
			miLocalStorage.setItem(hatalyzeNoticeStorageKey(accountId), '1');
			miLocalStorage.setItem(hatalyzeNoticeSyncedStorageKey(accountId), '1');
		}
	} catch { /* Missing key or unavailable Registry means the notice has not been confirmed on this device. */ }
}

function setCooldown(value: number) {
	waitingUntil.value = Number.isFinite(value) ? value : null;
	try {
		if (waitingUntil.value == null || waitingUntil.value <= Date.now()) miLocalStorage.removeItem(accountStorageKey('cooldown'));
		else miLocalStorage.setItem(accountStorageKey('cooldown'), String(waitingUntil.value));
	} catch { /* Storage unavailable: the server-side limit remains authoritative. */ }
}

function acceptConsent() {
	consentAccepted.value = true;
	activeTab.value = 'new';
	try {
		miLocalStorage.setItem(accountStorageKey('notice'), '1');
		if ($i) void syncNoticeAcceptance($i.id);
	} catch { /* The notice will be shown again if storage is unavailable. */ }
}

function openIntroduction() { consentAccepted.value = false; noteCountWarning.value = ''; errorMessage.value = ''; }

function goBack() { router.push('/hatask'); }

watch(conditions, () => { noteCountWarning.value = ''; }, { deep: true });

async function loadNotes(userId: string): Promise<HataEmotionAnalysisInputNote[]> {
	const target = conditions.value.noteLimit;
	const cutoff = conditions.value.mode === 'period' ? Date.now() - conditions.value.periodDays * 24 * 60 * 60 * 1000 : null;
	const collected: HataEmotionAnalysisInputNote[] = [];
	let untilId: string | undefined;
	for (let page = 0; page < 10 && collected.length < target; page++) {
		const response = await misskeyApi('users/notes', { userId, limit: Math.min(100, target - collected.length), withReplies: conditions.value.includeReplies, withRenotes: false, ...(untilId ? { untilId } : {}) });
		const notes = response as Array<Record<string, unknown>>;
		if (!notes.length) break;
		for (const note of notes) {
			const createdAt = String(note.createdAt ?? '');
			if (cutoff !== null && Date.parse(createdAt) < cutoff) return collected;
			const hasOwnContent = (
				(typeof note.text === 'string' && note.text.length > 0) ||
				(typeof note.cw === 'string' && note.cw.length > 0) ||
				(Array.isArray(note.files) && note.files.length > 0)
			);
			if ((note.renoteId || note.renote) && !hasOwnContent) continue;
			const visibility = String(note.visibility ?? 'public');
			if (conditions.value.visibility === 'publicHome' && !['public', 'home'].includes(visibility)) continue;
			if (conditions.value.visibility === 'followers' && !['public', 'home', 'followers'].includes(visibility)) continue;
			collected.push({ id: String(note.id), createdAt, text: typeof note.text === 'string' ? note.text : '', cw: conditions.value.includeCw && typeof note.cw === 'string' ? note.cw : '', reactionCount: Number(note.reactionCount ?? 0), repliesCount: Number(note.repliesCount ?? 0), renoteCount: Number(note.renoteCount ?? 0), files: Array.isArray(note.files) ? note.files : [] });
		}
		untilId = String(notes[notes.length - 1].id ?? '');
		if (!untilId || notes.length < 100) break;
	}
	return collected.slice(0, target);
}

onMounted(() => {
	try {
		const storedCooldown = Number(miLocalStorage.getItem(accountStorageKey('cooldown')));
		if (Number.isFinite(storedCooldown) && storedCooldown > Date.now()) waitingUntil.value = storedCooldown;
	} catch { /* Storage unavailable: history and the server still enforce the limit. */ }
	timer = window.setInterval(() => { now.value = Date.now(); }, 1000);
	void Promise.all([loadNoticeAcceptance(), refreshHistory()]).finally(() => { consentChecking.value = false; });
});
onBeforeUnmount(() => { if (timer) window.clearInterval(timer); });
</script>

<style lang="scss" module>
.root { max-width: 1180px; margin: 0 auto; padding: 20px clamp(16px, 4vw, 40px) 60px; color: var(--MI_THEME-fg); }
.hero { display: flex; align-items: center; gap: 16px; padding: 16px 0 24px; }
.heroIcon, .introIcon { display: grid; place-items: center; width: 54px; height: 54px; flex: 0 0 auto; border-radius: 18px; color: var(--MI_THEME-fgOnAccent); background: linear-gradient(145deg, var(--MI_THEME-accent), color-mix(in srgb, var(--MI_THEME-accent) 65%, #a46bff)); font-size: 28px; }
.hero h1 { margin: 0; font-size: clamp(1.4rem, 4vw, 2rem); }
.hero p, .resultHeader p, .historyHeader p { margin: 5px 0 0; color: var(--MI_THEME-fgTransparent); }
.user { display: flex; align-items: center; gap: 10px; margin-left: auto; color: var(--MI_THEME-fgTransparent); font-size: .8rem; }
.avatar { width: 34px; height: 34px; border-radius: 50%; }
.notice { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 12px; background: color-mix(in srgb, var(--MI_THEME-warn) 12%, transparent); font-size: .88rem; line-height: 1.6; }
.notice i { margin-top: 2px; color: var(--MI_THEME-warn); }
.tabs { display: flex; width: fit-content; max-width: 100%; gap: 5px; margin: 16px 0 12px; padding: 4px; overflow-x: auto; border: 1px solid color-mix(in srgb, var(--MI_THEME-fg) 13%, transparent); border-radius: 999px; background: color-mix(in srgb, var(--MI_THEME-fg) 6%, transparent); }
.tab { min-height: 38px; padding: 0 15px; border: 1px solid transparent; border-radius: 999px; background: transparent; color: var(--MI_THEME-fgTransparent); font: inherit; font-size: .86rem; font-weight: 700; white-space: nowrap; cursor: pointer; transition: color .16s ease, background-color .16s ease, border-color .16s ease, box-shadow .16s ease, transform .16s ease; }
.tab i { margin-right: 6px; }
.tab:hover { color: var(--MI_THEME-fg); background: color-mix(in srgb, var(--MI_THEME-fg) 7%, transparent); }
.tab:focus-visible { outline: 2px solid var(--MI_THEME-accent); outline-offset: 2px; }
.tab[data-active="true"] { border-color: color-mix(in srgb, var(--MI_THEME-accent) 82%, var(--MI_THEME-fg) 8%); background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); box-shadow: 0 3px 10px color-mix(in srgb, var(--MI_THEME-accent) 28%, transparent), inset 0 0 0 1px color-mix(in srgb, var(--MI_THEME-fgOnAccent) 16%, transparent); }
.tab[data-active="true"]:hover { background: color-mix(in srgb, var(--MI_THEME-accent) 88%, var(--MI_THEME-fg) 12%); color: var(--MI_THEME-fgOnAccent); }
.actionButton { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 40px; padding: 9px 17px; border: 1px solid transparent; border-radius: 12px; font: inherit; font-size: .84rem; font-weight: 750; line-height: 1.25; cursor: pointer; transition: transform .15s ease, box-shadow .15s ease, background-color .15s ease, border-color .15s ease, color .15s ease, opacity .15s ease; }
.actionButton:hover:not(:disabled) { transform: translateY(-1px); }
.actionButton:active:not(:disabled) { transform: translateY(0); }
.actionButton:focus-visible { outline: 2px solid var(--MI_THEME-accent); outline-offset: 2px; }
.actionButton:disabled { opacity: .52; cursor: not-allowed; }
.primaryButton { border-color: color-mix(in srgb, var(--MI_THEME-accent) 82%, transparent); background: linear-gradient(135deg, var(--MI_THEME-accent), color-mix(in srgb, var(--MI_THEME-accent) 72%, #7b61ff)); color: var(--MI_THEME-fgOnAccent); box-shadow: 0 5px 14px color-mix(in srgb, var(--MI_THEME-accent) 24%, transparent); }
.primaryButton:hover:not(:disabled) { box-shadow: 0 7px 18px color-mix(in srgb, var(--MI_THEME-accent) 32%, transparent); }
.secondaryButton { border-color: color-mix(in srgb, var(--MI_THEME-fg) 16%, transparent); background: color-mix(in srgb, var(--MI_THEME-panel) 92%, var(--MI_THEME-accent) 8%); color: var(--MI_THEME-fg); box-shadow: 0 2px 8px color-mix(in srgb, #000 8%, transparent); }
.secondaryButton:hover:not(:disabled) { border-color: color-mix(in srgb, var(--MI_THEME-accent) 48%, transparent); background: color-mix(in srgb, var(--MI_THEME-accent) 10%, var(--MI_THEME-panel)); }
.iconButton { width: 40px; min-width: 40px; padding: 0; border-radius: 50%; border-color: color-mix(in srgb, var(--MI_THEME-fg) 15%, transparent); background: color-mix(in srgb, var(--MI_THEME-panel) 92%, transparent); color: var(--MI_THEME-fg); }
.dangerButton { color: var(--MI_THEME-error); }
.dangerButton:hover:not(:disabled) { border-color: color-mix(in srgb, var(--MI_THEME-error) 48%, transparent); background: color-mix(in srgb, var(--MI_THEME-error) 10%, var(--MI_THEME-panel)); }
.card, .introCard { padding: clamp(18px, 4vw, 30px); border: 1px solid color-mix(in srgb, var(--MI_THEME-fg) 12%, transparent); border-radius: 18px; background: color-mix(in srgb, var(--MI_THEME-panel) 90%, transparent); box-shadow: 0 12px 36px color-mix(in srgb, #000 8%, transparent); }
.introCard { min-height: 560px; display: grid; place-items: center; background: radial-gradient(circle at 50% 0, color-mix(in srgb, var(--MI_THEME-accent) 16%, transparent), transparent 44%), var(--MI_THEME-bg); }
.introBody { width: min(680px, 100%); text-align: center; }
.introIcon { width: 58px; height: 58px; margin: 0 auto 16px; }
.introBody h2 { margin: 0; font-size: 1.7rem; }
.introLead { margin: 7px 0 20px; color: var(--MI_THEME-fgTransparent); font-size: .86rem; }
.medical { padding: 16px; border: 2px solid var(--MI_THEME-warn); border-radius: 14px; background: color-mix(in srgb, var(--MI_THEME-warn) 10%, transparent); text-align: center; }
.medical h3 { display: flex; align-items: center; justify-content: center; gap: 7px; margin: 0 0 6px; font-size: 1rem; }
.medical p { margin: 0; font-size: .8rem; line-height: 1.7; }
.infoGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0 20px; }
.infoGrid > div { padding: 13px; border: 1px solid color-mix(in srgb, var(--MI_THEME-fg) 12%, transparent); border-radius: 12px; background: color-mix(in srgb, var(--MI_THEME-panel) 85%, transparent); text-align: center; }
.infoGrid b, .infoGrid span { display: block; }
.infoGrid b { font-size: .78rem; }
.infoGrid span, .introFootnote { margin-top: 4px; color: var(--MI_THEME-fgTransparent); font-size: .7rem; line-height: 1.55; }
.introFootnote { display: block; margin-top: 10px; }
.form { display: grid; gap: 18px; }
.form h2, .result h2, .historyHeader h2 { margin: 0; font-size: 1.2rem; }
.field { display: grid; gap: 7px; font-weight: 600; }
.field select { width: 100%; box-sizing: border-box; padding: 11px 12px; border: 1px solid color-mix(in srgb, var(--MI_THEME-fg) 18%, transparent); border-radius: 10px; background: var(--MI_THEME-bg); color: var(--MI_THEME-fg); }
.check { display: flex; align-items: center; gap: 10px; }
.check input { accent-color: var(--MI_THEME-accent); }
.reason { padding: 14px; border-radius: 12px; background: color-mix(in srgb, var(--MI_THEME-accent) 8%, transparent); font-size: .88rem; line-height: 1.6; }
.reason h3 { margin: 0 0 4px; font-size: .92rem; }
.reason h3 i { margin-right: 6px; color: var(--MI_THEME-accent); }
.reason p, .error { margin: 0; }
.error { color: var(--MI_THEME-error); }
.errorBanner { margin: 0 0 12px; padding: 11px 13px; border: 1px solid var(--MI_THEME-error); border-radius: 10px; background: color-mix(in srgb, var(--MI_THEME-error) 9%, transparent); color: var(--MI_THEME-error); font-size: .82rem; }
.minimumHint { display: flex; align-items: center; gap: 7px; margin: 0; color: var(--MI_THEME-fgTransparent); font-size: .76rem; line-height: 1.55; }
.minimumHint i { color: var(--MI_THEME-accent); }
.warningBanner { display: flex; align-items: flex-start; gap: 9px; margin: 0; padding: 12px 14px; border: 1px solid color-mix(in srgb, var(--MI_THEME-warn) 72%, transparent); border-radius: 12px; background: color-mix(in srgb, var(--MI_THEME-warn) 12%, var(--MI_THEME-panel)); color: var(--MI_THEME-fg); font-size: .84rem; line-height: 1.6; }
.warningBanner i { margin-top: 2px; color: var(--MI_THEME-warn); }
.connectionBlock { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 13px 14px; border: 1px solid color-mix(in srgb, var(--MI_THEME-error) 48%, transparent); border-radius: 12px; background: color-mix(in srgb, var(--MI_THEME-error) 9%, var(--MI_THEME-panel)); font-size: .84rem; line-height: 1.55; }
.connectionBlock > i { color: var(--MI_THEME-error); font-size: 1.2rem; }
.ratebox { display: flex; justify-content: space-between; gap: 14px; padding: 12px 13px; border: 1px solid color-mix(in srgb, var(--MI_THEME-accent) 30%, transparent); border-radius: 11px; background: color-mix(in srgb, var(--MI_THEME-accent) 8%, transparent); }
.ratebox b, .ratebox small { display: block; }
.ratebox small { margin-top: 3px; color: var(--MI_THEME-fgTransparent); font-size: .7rem; }
.ratebox > span { color: var(--MI_THEME-success); font-size: .75rem; font-weight: 700; white-space: nowrap; }
.waiting { display: flex; align-items: center; gap: 14px; }
.waiting h2 { margin: 0 0 6px; }
.waiting p { margin: 0 0 8px; color: var(--MI_THEME-fgTransparent); }
.waitingIcon { color: var(--MI_THEME-accent); font-size: 32px; }
.subtleButton { margin-left: auto; white-space: nowrap; }
.resultHeader, .historyHeader { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.resultHeader p { font-size: .78rem; }
.resultActions { display: flex; align-items: center; gap: 8px; }
.resultActions .subtleButton { margin-left: 0; }
.eyebrow { color: var(--MI_THEME-fgTransparent); font-size: .72rem; }
.status { display: inline-flex; padding: 5px 9px; border-radius: 999px; font-size: .78rem; white-space: nowrap; }
.statusDone { background: color-mix(in srgb, var(--MI_THEME-success) 18%, transparent); }
.resultOverview { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 14px; margin: 20px 0; }
.scoreCard { display: grid; place-items: center; align-content: center; min-height: 210px; padding: 18px; border: 1px solid color-mix(in srgb, var(--MI_THEME-fg) 12%, transparent); border-radius: 14px; background: color-mix(in srgb, var(--MI_THEME-panel) 85%, transparent); text-align: center; }
.scoreCard strong { color: var(--MI_THEME-accent); font-size: 3rem; line-height: 1; }
.scoreCard b { margin-top: 10px; font-size: 1rem; }
.scoreCard small { margin-top: 8px; color: var(--MI_THEME-fgTransparent); font-size: .68rem; line-height: 1.55; }
.resultGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.resultItem, .metric { padding: 14px; border: 1px solid color-mix(in srgb, var(--MI_THEME-fg) 10%, transparent); border-radius: 14px; background: color-mix(in srgb, var(--MI_THEME-fg) 5%, transparent); }
.resultItem span, .metric span, .meta, .historyItem span { display: block; color: var(--MI_THEME-fgTransparent); font-size: .8rem; }
.resultItem strong, .metric strong { display: block; margin-top: 6px; font-size: 1.3rem; }
.resultItem small { display: block; margin-top: 5px; color: var(--MI_THEME-fgTransparent); font-size: .68rem; line-height: 1.5; }
.metric small { display: block; margin-top: 5px; color: var(--MI_THEME-success); font-size: .7rem; }
.meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 18px; }
.historyList { display: grid; gap: 8px; margin: 20px 0; }
.historyItem { display: flex; align-items: center; gap: 12px; padding: 9px; border: 1px solid transparent; border-radius: 12px; background: color-mix(in srgb, var(--MI_THEME-fg) 5%, transparent); }
.historySelectButton { flex: 1; padding: 5px; border: 0; background: none; color: inherit; text-align: left; cursor: pointer; }
.historySelectButton strong, .historySelectButton span { display: block; }
.historySelectButton:focus-visible { outline: 2px solid var(--MI_THEME-accent); outline-offset: 2px; }
.historySelected { border-color: var(--MI_THEME-accent); }
.historySummary { display: flex; flex-wrap: wrap; gap: 10px; min-width: 210px; }
.historySummary span { white-space: nowrap; }
.historySummary b { color: var(--MI_THEME-fg); }
.empty { padding: 38px 12px; color: var(--MI_THEME-fgTransparent); text-align: center; }
.emptyInline { margin-top: 20px; padding: 22px 14px; border-radius: 12px; background: color-mix(in srgb, var(--MI_THEME-fg) 6%, transparent); color: var(--MI_THEME-fgTransparent); text-align: center; }
.empty i { color: var(--MI_THEME-accent); font-size: 34px; }
.empty p { margin: 10px 0 18px; }
.compareButton { display: block; margin-left: auto; }
.unavailable { padding: 30px 8px; text-align: center; }
.unavailable > i { color: var(--MI_THEME-warn); font-size: 38px; }
.unavailable h2 { margin: 12px 0 8px; }
.unavailable p { max-width: 560px; margin: 0 auto 12px; line-height: 1.7; }
.unavailableHint { color: var(--MI_THEME-fgTransparent); font-size: .88rem; }
.unavailable strong { display: block; margin-top: 20px; color: var(--MI_THEME-accent); }
.backButton { display: block; margin: 22px auto 0; }
.deniedFooter { margin-top: 34px; padding-top: 14px; border-top: 1px solid color-mix(in srgb, var(--MI_THEME-fg) 12%, transparent); color: var(--MI_THEME-fgTransparent); font-size: .75rem; }
.compareBar { display: grid; grid-template-columns: minmax(0, 1fr) 30px minmax(0, 1fr); align-items: end; gap: 10px; margin: 20px 0 14px; }
.compareBar label { display: grid; gap: 6px; color: var(--MI_THEME-fgTransparent); font-size: .76rem; font-weight: 700; }
.compareBar select { min-height: 40px; padding: 0 11px; border: 1px solid color-mix(in srgb, var(--MI_THEME-fg) 18%, transparent); border-radius: 10px; background: var(--MI_THEME-bg); color: var(--MI_THEME-fg); }
.compareBar > span { display: grid; place-items: center; height: 34px; color: var(--MI_THEME-fgTransparent); }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
.evidence, .trendSection { margin-top: 14px; padding: 16px; border: 1px solid color-mix(in srgb, var(--MI_THEME-fg) 12%, transparent); border-radius: 14px; background: color-mix(in srgb, var(--MI_THEME-panel) 85%, transparent); }
.insightSection { margin-top: 14px; padding: 16px; border: 1px solid color-mix(in srgb, var(--MI_THEME-fg) 12%, transparent); border-radius: 14px; background: color-mix(in srgb, var(--MI_THEME-panel) 85%, transparent); }
.insightSection h3 { margin: 0 0 10px; font-size: 1rem; }
.insightGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.insightGrid article { padding: 12px; border-radius: 11px; background: color-mix(in srgb, var(--MI_THEME-accent) 7%, transparent); }
.insightGrid b, .insightGrid span { display: block; }
.insightGrid b { margin-bottom: 5px; font-size: .82rem; }
.insightGrid span { color: var(--MI_THEME-fgTransparent); font-size: .72rem; line-height: 1.6; }
.evidence h3, .trendSection h3 { margin: 0 0 6px; font-size: 1rem; }
.evidence > p { margin: 0 0 14px; color: var(--MI_THEME-fgTransparent); font-size: .8rem; line-height: 1.6; }
.evidenceGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px; }
.evidenceGroup { padding: 13px; border-radius: 11px; background: color-mix(in srgb, var(--MI_THEME-fg) 6%, transparent); }
.evidenceGroup > b { display: block; margin-bottom: 8px; font-size: .82rem; }
.evidenceGroup ul { display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }
.evidenceGroup li { display: flex; justify-content: space-between; gap: 10px; font-size: .76rem; }
.evidenceGroup li span:last-child { color: var(--MI_THEME-fgTransparent); font-variant-numeric: tabular-nums; white-space: nowrap; }
.versionWarning { padding: 11px 13px; border: 1px solid var(--MI_THEME-warn); border-radius: 10px; background: color-mix(in srgb, var(--MI_THEME-warn) 10%, transparent); font-size: .78rem; }
.legend { display: flex; gap: 14px; margin: 8px 0 6px; color: var(--MI_THEME-fgTransparent); font-size: .7rem; }
.legend i { display: inline-block; width: 14px; height: 3px; margin: 0 5px 2px 0; border-radius: 999px; }
.currentLine { background: var(--MI_THEME-accent); }
.baseLine { background: var(--MI_THEME-success); }
.compareChart, .resultChart { display: block; width: 100%; height: 180px; border-radius: 10px; background: repeating-linear-gradient(to bottom, transparent 0, transparent 44px, color-mix(in srgb, var(--MI_THEME-fg) 10%, transparent) 45px); }
@media (max-width: 720px) {
	.root { padding-top: 8px; }
	.user span { display: none; }
	.user { gap: 7px; }
	.waiting { align-items: flex-start; flex-wrap: wrap; }
	.subtleButton { margin-left: 46px; }
	.resultHeader, .historyHeader { display: grid; }
	.resultActions { flex-wrap: wrap; }
	.historyHeader .subtleButton { margin-left: 0; }
	.infoGrid, .metrics, .resultOverview, .insightGrid { grid-template-columns: 1fr; }
	.historyItem { align-items: flex-start; flex-wrap: wrap; }
	.historySummary { width: 100%; min-width: 0; padding-left: 5px; }
	.ratebox { flex-direction: column; }
	.connectionBlock { grid-template-columns: auto minmax(0, 1fr); }
	.connectionBlock button { grid-column: 1 / -1; }
	.compareBar { grid-template-columns: 1fr; }
	.compareBar > span { display: none; }
}
@media (max-width: 420px) {
	.infoGrid, .resultGrid { grid-template-columns: 1fr; }
	.tab { padding-inline: 12px; }
}
@media (prefers-reduced-motion: reduce) {
	.root *, .root *::before, .root *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}

/* ===== 旗鯖fork(HATAlyze 2.0.0): 内訳の表示 ===== */
.breakdown { margin-top: 18px; }
.breakdown h3 { margin: 0 0 6px; font-size: .95rem; }
.breakdownNote { margin: 0 0 10px; font-size: .78rem; opacity: .7; line-height: 1.6; }
.statList { display: flex; flex-direction: column; gap: 6px; }
.statRow { display: grid; grid-template-columns: minmax(72px, 8em) 1fr auto; align-items: center; gap: 10px; font-size: .84rem; }
.statLabel { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.statBar { display: block; height: 8px; border-radius: 999px; background: color-mix(in srgb, var(--MI_THEME-fg) 8%, transparent); overflow: hidden; }
.statBar i { display: block; height: 100%; border-radius: inherit; background: var(--MI_THEME-accent); }
/* ⚠️否定側は色で区別する。棒の長さは「量」であって良し悪しではない。 */
.statRow[data-polarity='negative'] .statBar i { background: color-mix(in srgb, var(--MI_THEME-fg) 45%, var(--MI_THEME-accent)); }
.statValue { font-variant-numeric: tabular-nums; opacity: .8; }
.hourGrid { display: grid; grid-template-columns: repeat(24, 1fr); gap: 2px; align-items: end; height: 96px; }
.hourCell { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 3px; min-width: 0; }
.hourCell small { font-size: .55rem; opacity: .55; }
.hourBar { display: block; width: 100%; min-height: 2px; border-radius: 3px 3px 0 0; background: var(--MI_THEME-accent); }
.hourBar[data-polarity='negative'] { background: color-mix(in srgb, var(--MI_THEME-fg) 45%, var(--MI_THEME-accent)); }
@media (max-width: 500px) {
	.hourCell small { display: none; }
	.statRow { grid-template-columns: minmax(60px, 6em) 1fr auto; }
}

.limitHint { display: flex; align-items: center; gap: 6px; margin: 6px 0 0; font-size: .78rem; opacity: .72; line-height: 1.6; }
.limitHint i { flex-shrink: 0; }
</style>
