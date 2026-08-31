<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-FileCopyrightText: noridev and cherrypick-project
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 800px;">
		<MkInfo v-if="!applicationsEnabled"><strong>{{ modeCopy.openRegistrationActive }}</strong><br>{{ modeCopy.managementPaused }}</MkInfo>
		<div v-else class="_gaps_m">
			<!-- 旗鯖fork: プライバシー保護サマリパネル (rejected ステータス時に表示) -->
			<div v-if="status === 'rejected' && summary" :class="$style.summaryPanel">
				<div :class="$style.summaryHeader">
					<i class="ti ti-shield-lock"></i>
					<span>{{ copy.rejectedPrivacySummary }}</span>
				</div>
				<div :class="$style.summaryGrid">
					<div :class="$style.summaryItem">
						<div :class="$style.summaryValue">{{ summary.cleanedCount }}</div>
						<div :class="$style.summaryLabel">{{ copy.personalDataDeleted }}</div>
						<div :class="$style.summaryDesc">{{ copy.personalDataDeletedDescription }}</div>
					</div>
					<div :class="$style.summaryItem">
						<div :class="$style.summaryValue">{{ summary.emailRetainedCount }}</div>
						<div :class="$style.summaryLabel">{{ copy.emailRetained }}</div>
						<div :class="$style.summaryDesc">{{ copy.emailRetainedDescription }}</div>
					</div>
					<div v-if="summary.legacyCount > 0" :class="[$style.summaryItem, $style.summaryItemWarning]">
						<div :class="$style.summaryValue">{{ summary.legacyCount }}</div>
						<div :class="$style.summaryLabel">⚠️ {{ copy.legacyNotCleaned }}</div>
						<div :class="$style.summaryDesc">{{ copy.legacyNotCleanedDescription }}</div>
					</div>
				</div>
				<div v-if="summary.legacyCount > 0" :class="$style.summaryActions">
					<MkButton danger rounded :disabled="loading || actionBusy" @click="runLegacyCleanup">
						<i class="ti ti-trash"></i> {{ copyx.cleanupExisting({ count: summary.legacyCount.toString() }) }}
					</MkButton>
					<MkButton rounded :disabled="loading || actionBusy" @click="runLegacyCleanupDryRun">
						<i class="ti ti-eye"></i> {{ copy.dryRunOnly }}
					</MkButton>
				</div>
			</div>

			<MkSelect v-model="status" :items="statusItems" :disabled="loading || actionBusy">
				<template #label>{{ copy.status }}</template>
			</MkSelect>

			<div v-if="items.length === 0 && !loading" :class="$style.empty">
				<div :class="$style.emptyIcon"><i class="ti ti-inbox"></i></div>
				<p>{{ status === 'pending' ? copy.noPending : copy.noMatching }}</p>
			</div>

			<div v-if="loading" :class="$style.empty">
				<MkLoading/>
			</div>

			<div v-else class="_gaps_s">
				<div v-for="item in items" :key="item.id" :class="$style.card">
					<div :class="$style.cardHeader">
						<div :class="$style.cardUser">
							<i class="ti ti-user"></i>
							<span v-if="item.username" :class="$style.username">@{{ item.username }}</span>
							<span v-else :class="[$style.username, $style.usernameDeleted]">@({{ copy.deleted }})</span>
						</div>
						<div :class="$style.cardDate">{{ formatDate(item.createdAt) }}</div>
					</div>

					<!-- 旗鯖fork: 個人情報の削除状態バッジ (rejected の時のみ表示) -->
					<div v-if="item.status === 'rejected'" :class="$style.privacyBadges">
						<span v-if="item.username === null" :class="[$style.privacyBadge, $style.privacyBadgeDeleted]">
							<i class="ti ti-check"></i> {{ copy.credentialsDeleted }}
							<span v-if="item.personalDataDeletedAt" :class="$style.privacyBadgeDate">({{ formatDate(item.personalDataDeletedAt) }})</span>
						</span>
						<span v-else :class="[$style.privacyBadge, $style.privacyBadgeWarning]">
							<i class="ti ti-alert-triangle"></i> {{ copy.credentialsNotDeleted }}
						</span>
						<span v-if="item.email !== null" :class="[$style.privacyBadge, $style.privacyBadgeRetained]">
							<i class="ti ti-clock"></i> {{ copy.emailRetained }}
							<span v-if="item.rejectedAt" :class="$style.privacyBadgeDate">({{ copyx.rejectedDays({ count: daysSinceRejection(item.rejectedAt).toString() }) }})</span>
						</span>
						<span v-else :class="[$style.privacyBadge, $style.privacyBadgeDeleted]">
							<i class="ti ti-check"></i> {{ copy.emailDeleted }}
						</span>
					</div>

					<div :class="$style.cardBody">
						<div v-if="item.status === 'pending' && item.additionalContacts" :class="$style.contactsField">
							<div :class="$style.cardFieldLabel">{{ copy.contactsLabel }}</div>
							<div :class="$style.cardFieldValue">{{ item.additionalContacts }}</div>
							<p :class="$style.contactsHint">{{ copy.contactsHandling }}</p>
						</div>
						<div v-if="item.email" :class="$style.cardField">
							<div :class="$style.cardFieldLabel">{{ copy.emailAddress }}</div>
							<div :class="$style.cardFieldValue">{{ item.email }}</div>
						</div>
						<div v-else-if="item.status === 'rejected'" :class="$style.cardField">
							<div :class="$style.cardFieldLabel">{{ copy.emailAddress }}</div>
							<div :class="[$style.cardFieldValue, $style.cardFieldValueDeleted]">({{ copy.deleted }})</div>
						</div>
						<div :class="$style.cardField">
							<div :class="$style.cardFieldLabel">{{ copy.reason }}</div>
							<div :class="$style.cardFieldValue">{{ item.reason }}</div>
						</div>
					</div>

					<div v-if="status === 'pending'" :class="$style.cardActions">
						<MkButton primary rounded :disabled="actionBusy" @click="approve(item)">
							<i class="ti ti-check"></i> {{ copy.approve }}
						</MkButton>
						<MkButton danger rounded :disabled="actionBusy" @click="reject(item)">
							<i class="ti ti-x"></i> {{ copy.reject }}
						</MkButton>
					</div>
					<div v-else :class="$style.cardStatus">
						<span v-if="item.status === 'approved'" :class="$style.statusApproved"><i class="ti ti-check"></i> {{ copy.approved }}</span>
						<span v-if="item.status === 'rejected'" :class="$style.statusRejected"><i class="ti ti-x"></i> {{ copy.rejected }}</span>
					</div>
				</div>
			</div>

			<div v-if="hasMore" :class="$style.more">
				<MkButton rounded :disabled="loading || actionBusy" @click="loadMore">{{ copy.loadMore }}</MkButton>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, watch, computed, onBeforeUnmount } from 'vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import MkButton from '@/components/MkButton.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkInfo from '@/components/MkInfo.vue';
import { fetchInstance, instance } from '@/instance.js';
import { definePage } from '@/page.js';
import { i18n } from '@/i18n.js';

const LIMIT = 20;
const copy = i18n.ts._hata._registrationApplications._admin;
const copyx = i18n.tsx._hata._registrationApplications._admin;
const modeCopy = i18n.ts._hata._registrationApplications;
const modeUnavailable = ref(false);
const applicationsEnabled = computed(() => instance.disableRegistration === true && !modeUnavailable.value);

const statusItems = [
	{ value: 'pending', label: copy.pending },
	{ value: 'approved', label: copy.approved },
	{ value: 'rejected', label: copy.rejected },
];

const status = ref<'pending' | 'approved' | 'rejected'>('pending');
const items = ref<any[]>([]);
const loading = ref(false);
const hasMore = ref(false);
const actionBusy = ref(false);
let revision = 0;
let disposed = false;
let readRequest: AbortController | undefined;

// 旗鯖fork: rejected サマリ統計
const summary = ref<{ cleanedCount: number; emailRetainedCount: number; legacyCount: number } | null>(null);

function isCurrent(version: number) {
	return !disposed && applicationsEnabled.value && version === revision;
}

function clearContacts() {
	for (const item of items.value) item.additionalContacts = null;
}

async function handleError(err: any) {
	if (disposed || err?.name === 'AbortError') return;
	if (err?.code === 'REGISTRATION_APPLICATIONS_DISABLED') {
		modeUnavailable.value = true;
		try {
			const meta = await fetchInstance(true);
			if (!disposed && meta.disableRegistration === true) modeUnavailable.value = false;
		} catch { /* Keep operations blocked until the registration mode is known. */ }
		return;
	}
	os.alert({ type: 'error', text: err?.message || copy.errorOccurred });
}

async function load() {
	const version = ++revision;
	readRequest?.abort();
	clearContacts();
	items.value = [];
	summary.value = null;
	hasMore.value = false;
	loading.value = false;
	if (!isCurrent(version)) return;
	readRequest = new AbortController();
	loading.value = true;
	try {
		const res = await (misskeyApi as any)('admin/registration-applications', {
			status: status.value,
			limit: LIMIT,
			offset: 0,
		}, undefined, readRequest.signal);
		if (!isCurrent(version)) return;
		items.value = res;
		hasMore.value = res.length >= LIMIT;

		// rejected の場合、サマリも取得
		if (status.value === 'rejected') {
			await loadSummary(version);
		} else {
			summary.value = null;
		}
	} catch (err) {
		if (isCurrent(version)) await handleError(err);
	} finally {
		if (version === revision) loading.value = false;
	}
}

async function loadSummary(version = revision) {
	if (!isCurrent(version)) return;
	try {
		// dry-run でサマリ統計だけ取得
		const res = await (misskeyApi as any)('admin/cleanup-legacy-rejected-registrations', {
			execute: false,
		}, undefined, readRequest?.signal);
		if (!isCurrent(version)) return;
		summary.value = {
			cleanedCount: res.alreadyCleanedCount,
			emailRetainedCount: res.emailRetainedCount,
			legacyCount: res.cleanedCount, // dry-run なので「クリーンアップ予定数」= 旧仕様未処理数
		};
	} catch (err) {
		if (isCurrent(version)) {
			summary.value = null;
			await handleError(err);
		}
	}
}

async function loadMore() {
	const version = revision;
	if (!isCurrent(version) || loading.value || actionBusy.value || !hasMore.value) return;
	loading.value = true;
	try {
		const res = await (misskeyApi as any)('admin/registration-applications', {
			status: status.value,
			limit: LIMIT,
			offset: items.value.length,
		}, undefined, readRequest?.signal);
		if (!isCurrent(version)) return;
		items.value = [...items.value, ...res];
		hasMore.value = res.length >= LIMIT;
	} catch (err) {
		if (isCurrent(version)) await handleError(err);
	} finally {
		if (version === revision) loading.value = false;
	}
}

watch(() => instance.disableRegistration, () => { modeUnavailable.value = false; });
watch([status, applicationsEnabled], () => load(), { immediate: true, flush: 'sync' });
onBeforeUnmount(() => { disposed = true; revision++; readRequest?.abort(); clearContacts(); });

function formatDate(dateStr: string): string {
	const d = new Date(dateStr);
	return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 旗鯖fork: 却下後の経過日数を計算
function daysSinceRejection(rejectedAt: string): number {
	const rejected = new Date(rejectedAt);
	const now = new Date();
	const diffMs = now.getTime() - rejected.getTime();
	return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

async function approve(item: any) {
	const version = revision;
	if (!isCurrent(version) || actionBusy.value || loading.value) return;
	actionBusy.value = true;
	try {
		const { canceled } = await os.confirm({
			type: 'info',
			title: copy.approveApplication,
			text: copyx.approveConfirm({ username: item.username }),
		});
		if (canceled || !isCurrent(version)) return;
		await (misskeyApi as any)('admin/approve-registration', {
			applicationId: item.id,
		});
		item.additionalContacts = null;
		if (!isCurrent(version)) return;
		os.alert({ type: 'success', text: copyx.approvedSuccess({ username: item.username }) });
		items.value = items.value.filter(x => x.id !== item.id);
	} catch (err: any) {
		if (isCurrent(version)) {
			await handleError(err);
			// The decision may have committed even if its email or response failed.
			if (isCurrent(version)) await load();
		}
	} finally {
		actionBusy.value = false;
	}
}

async function reject(item: any) {
	const version = revision;
	if (!isCurrent(version) || actionBusy.value || loading.value) return;
	actionBusy.value = true;
	try {
		const { canceled } = await os.confirm({
			type: 'warning',
			title: copy.rejectApplication,
			text: copyx.rejectConfirm({ username: item.username }),
		});
		if (canceled || !isCurrent(version)) return;
		await (misskeyApi as any)('admin/reject-registration', {
			applicationId: item.id,
		});
		item.additionalContacts = null;
		if (!isCurrent(version)) return;
		os.alert({ type: 'success', text: copyx.rejectedSuccess({ username: item.username }) });
		items.value = items.value.filter(x => x.id !== item.id);
	} catch (err: any) {
		if (isCurrent(version)) {
			await handleError(err);
			if (isCurrent(version)) await load();
		}
	} finally {
		actionBusy.value = false;
	}
}

// 旗鯖fork: 既存データのクリーンアップ (Dry-run)
async function runLegacyCleanupDryRun() {
	const version = revision;
	if (!isCurrent(version) || actionBusy.value || loading.value) return;
	actionBusy.value = true;
	try {
		const res = await (misskeyApi as any)('admin/cleanup-legacy-rejected-registrations', {
			execute: false,
		});
		if (!isCurrent(version)) return;
		os.alert({
			type: 'info',
			title: copy.cleanupDryRunTitle,
			text: copyx.cleanupDryRunResult({ target: res.cleanedCount.toString(), cleaned: res.alreadyCleanedCount.toString(), retained: res.emailRetainedCount.toString() }),
		});
	} catch (err: any) {
		if (isCurrent(version)) await handleError(err);
	} finally {
		actionBusy.value = false;
	}
}

// 旗鯖fork: 既存データのクリーンアップ (実削除)
async function runLegacyCleanup() {
	const version = revision;
	if (!isCurrent(version) || actionBusy.value || loading.value) return;
	actionBusy.value = true;
	try {
		const { canceled } = await os.confirm({
			type: 'warning',
			title: copy.cleanupExistingTitle,
			text: copyx.cleanupConfirm({ count: (summary.value?.legacyCount || 0).toString() }),
		});
		if (canceled || !isCurrent(version)) return;
		const res = await (misskeyApi as any)('admin/cleanup-legacy-rejected-registrations', {
			execute: true,
		});
		if (!isCurrent(version)) return;
		os.alert({
			type: 'success',
			title: copy.cleanupComplete,
			text: copyx.cleanupCompleteResult({ cleaned: res.cleanedCount.toString(), retained: res.emailRetainedCount.toString(), executedAt: formatDate(res.executedAt) }),
		});
		// リロード
		await load();
	} catch (err: any) {
		if (isCurrent(version)) await handleError(err);
	} finally {
		actionBusy.value = false;
	}
}

const headerActions = computed(() => applicationsEnabled.value && !loading.value && !actionBusy.value ? [{
	icon: 'ti ti-refresh',
	text: copy.reload,
	handler: () => load(),
}] : []);
const headerTabs = computed(() => []);

definePage(() => ({
	title: copy.title,
	icon: 'ti ti-file-description',
}));
</script>

<style lang="scss" module>
.contactsField {
	display: grid;
	gap: 8px;
	min-width: 0;
}

.contactsHint {
	margin: 8px 0 0;
	font-size: 0.85em;
	line-height: 1.7;
	overflow-wrap: anywhere;
}

.empty {
	text-align: center;
	padding: 64px 16px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.emptyIcon {
	font-size: 48px;
	margin-bottom: 16px;
}

.card {
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	border-radius: var(--MI-radius);
	padding: 16px;
}

.cardHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
	padding-bottom: 12px;
	border-bottom: 1px solid var(--MI_THEME-divider);
}

.cardUser {
	display: flex;
	align-items: center;
	gap: 6px;
}

.username {
	font-weight: bold;
	font-size: 1.1em;
}

.usernameDeleted {
	color: var(--MI_THEME-fgTransparentWeak);
	font-style: italic;
}

.cardDate {
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 0.9em;
}

/* 旗鯖fork: プライバシー保護バッジ群 */
.privacyBadges {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-bottom: 12px;
	padding: 8px;
	background: var(--MI_THEME-bg);
	border-radius: 6px;
}

.privacyBadge {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 4px 10px;
	border-radius: 999px;
	font-size: 0.85em;
	font-weight: 500;
}

.privacyBadgeDeleted {
	background: color-mix(in srgb, var(--MI_THEME-success) 20%, transparent);
	color: var(--MI_THEME-success);
	border: 1px solid color-mix(in srgb, var(--MI_THEME-success) 40%, transparent);
}

.privacyBadgeRetained {
	background: color-mix(in srgb, var(--MI_THEME-warn) 20%, transparent);
	color: var(--MI_THEME-warn);
	border: 1px solid color-mix(in srgb, var(--MI_THEME-warn) 40%, transparent);
}

.privacyBadgeWarning {
	background: color-mix(in srgb, var(--MI_THEME-error) 20%, transparent);
	color: var(--MI_THEME-error);
	border: 1px solid color-mix(in srgb, var(--MI_THEME-error) 40%, transparent);
}

.privacyBadgeDate {
	margin-left: 4px;
	opacity: 0.7;
	font-weight: 400;
	font-size: 0.9em;
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-bottom: 12px;
}

.cardField {
	display: flex;
	gap: 8px;
}

.cardFieldLabel {
	min-width: 100px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 0.9em;
}

.cardFieldValue {
	flex: 1;
	min-width: 0;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.cardFieldValueDeleted {
	color: var(--MI_THEME-fgTransparentWeak);
	font-style: italic;
}

.cardActions {
	display: flex;
	gap: 8px;
	justify-content: flex-end;
}

.cardStatus {
	display: flex;
	justify-content: flex-end;
}

.statusApproved {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	color: var(--MI_THEME-success);
}

.statusRejected {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	color: var(--MI_THEME-error);
}

.more {
	text-align: center;
}

/* 旗鯖fork: サマリパネル */
.summaryPanel {
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	border-radius: var(--MI-radius);
	padding: 16px;
}

.summaryHeader {
	display: flex;
	align-items: center;
	gap: 8px;
	font-weight: bold;
	font-size: 1.1em;
	margin-bottom: 12px;
	padding-bottom: 12px;
	border-bottom: 1px solid var(--MI_THEME-divider);

	> i {
		color: var(--MI_THEME-accent);
	}
}

.summaryGrid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 12px;
	margin-bottom: 12px;
}

.summaryItem {
	padding: 12px;
	background: var(--MI_THEME-bg);
	border-radius: 8px;
	border: 1px solid var(--MI_THEME-divider);
}

.summaryItemWarning {
	border-color: var(--MI_THEME-error);
	background: color-mix(in srgb, var(--MI_THEME-error) 10%, var(--MI_THEME-bg));
}

.summaryValue {
	font-size: 2em;
	font-weight: bold;
	color: var(--MI_THEME-accent);
	line-height: 1;
	margin-bottom: 4px;
}

.summaryItemWarning .summaryValue {
	color: var(--MI_THEME-error);
}

.summaryLabel {
	font-weight: 500;
	margin-bottom: 4px;
}

.summaryDesc {
	font-size: 0.85em;
	color: var(--MI_THEME-fgTransparentWeak);
	line-height: 1.4;
}

.summaryActions {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}
</style>
