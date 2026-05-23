<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-FileCopyrightText: noridev and cherrypick-project
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 800px;">
		<div class="_gaps_m">
			<!-- 旗鯖fork: プライバシー保護サマリパネル (rejected ステータス時に表示) -->
			<div v-if="status === 'rejected' && summary" :class="$style.summaryPanel">
				<div :class="$style.summaryHeader">
					<i class="ti ti-shield-lock"></i>
					<span>却下済み申請の個人情報の管理状況</span>
				</div>
				<div :class="$style.summaryGrid">
					<div :class="$style.summaryItem">
						<div :class="$style.summaryValue">{{ summary.cleanedCount }}</div>
						<div :class="$style.summaryLabel">個人情報削除済み</div>
						<div :class="$style.summaryDesc">ID・パスワード情報を削除済み (メールは保持中の場合あり)</div>
					</div>
					<div :class="$style.summaryItem">
						<div :class="$style.summaryValue">{{ summary.emailRetainedCount }}</div>
						<div :class="$style.summaryLabel">メール保持中</div>
						<div :class="$style.summaryDesc">同一メールからの連続申請拒否のため一定期間保持 (90日経過で自動削除)</div>
					</div>
					<div v-if="summary.legacyCount > 0" :class="[$style.summaryItem, $style.summaryItemWarning]">
						<div :class="$style.summaryValue">{{ summary.legacyCount }}</div>
						<div :class="$style.summaryLabel">⚠️ 旧仕様の未クリーンアップ</div>
						<div :class="$style.summaryDesc">旧仕様で却下された申請で、まだ個人情報が残っているもの</div>
					</div>
				</div>
				<div v-if="summary.legacyCount > 0" :class="$style.summaryActions">
					<MkButton danger rounded @click="runLegacyCleanup">
						<i class="ti ti-trash"></i> 既存データを一括クリーンアップ ({{ summary.legacyCount }}件)
					</MkButton>
					<MkButton rounded @click="runLegacyCleanupDryRun">
						<i class="ti ti-eye"></i> Dry-run (削除予定の確認のみ)
					</MkButton>
				</div>
			</div>

			<MkSelect v-model="status" :items="statusItems">
				<template #label>ステータス</template>
			</MkSelect>

			<div v-if="items.length === 0 && !loading" :class="$style.empty">
				<div :class="$style.emptyIcon"><i class="ti ti-inbox"></i></div>
				<p>{{ status === 'pending' ? '承認待ちの申請はありません' : '該当する申請はありません' }}</p>
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
							<span v-else :class="[$style.username, $style.usernameDeleted]">@(削除済み)</span>
						</div>
						<div :class="$style.cardDate">{{ formatDate(item.createdAt) }}</div>
					</div>

					<!-- 旗鯖fork: 個人情報の削除状態バッジ (rejected の時のみ表示) -->
					<div v-if="item.status === 'rejected'" :class="$style.privacyBadges">
						<span v-if="item.username === null" :class="[$style.privacyBadge, $style.privacyBadgeDeleted]">
							<i class="ti ti-check"></i> ID・パスワード削除済み
							<span v-if="item.personalDataDeletedAt" :class="$style.privacyBadgeDate">({{ formatDate(item.personalDataDeletedAt) }})</span>
						</span>
						<span v-else :class="[$style.privacyBadge, $style.privacyBadgeWarning]">
							<i class="ti ti-alert-triangle"></i> ID・パスワード未削除 (旧仕様)
						</span>
						<span v-if="item.email !== null" :class="[$style.privacyBadge, $style.privacyBadgeRetained]">
							<i class="ti ti-clock"></i> メール保持中
							<span v-if="item.rejectedAt" :class="$style.privacyBadgeDate">(却下後{{ daysSinceRejection(item.rejectedAt) }}日経過 / 90日で自動削除)</span>
						</span>
						<span v-else :class="[$style.privacyBadge, $style.privacyBadgeDeleted]">
							<i class="ti ti-check"></i> メール削除済み
						</span>
					</div>

					<div :class="$style.cardBody">
						<div v-if="item.email" :class="$style.cardField">
							<div :class="$style.cardFieldLabel">メールアドレス</div>
							<div :class="$style.cardFieldValue">{{ item.email }}</div>
						</div>
						<div v-else-if="item.status === 'rejected'" :class="$style.cardField">
							<div :class="$style.cardFieldLabel">メールアドレス</div>
							<div :class="[$style.cardFieldValue, $style.cardFieldValueDeleted]">(削除済み)</div>
						</div>
						<div :class="$style.cardField">
							<div :class="$style.cardFieldLabel">登録したい理由</div>
							<div :class="$style.cardFieldValue">{{ item.reason }}</div>
						</div>
					</div>

					<div v-if="status === 'pending'" :class="$style.cardActions">
						<MkButton primary rounded @click="approve(item)">
							<i class="ti ti-check"></i> 承認
						</MkButton>
						<MkButton danger rounded @click="reject(item)">
							<i class="ti ti-x"></i> 却下
						</MkButton>
					</div>
					<div v-else :class="$style.cardStatus">
						<span v-if="item.status === 'approved'" :class="$style.statusApproved"><i class="ti ti-check"></i> 承認済み</span>
						<span v-if="item.status === 'rejected'" :class="$style.statusRejected"><i class="ti ti-x"></i> 却下済み</span>
					</div>
				</div>
			</div>

			<div v-if="hasMore" :class="$style.more">
				<MkButton rounded @click="loadMore">もっと読み込む</MkButton>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import MkButton from '@/components/MkButton.vue';
import MkSelect from '@/components/MkSelect.vue';
import { definePage } from '@/page.js';

const LIMIT = 20;

const statusItems = [
	{ value: 'pending', label: '承認待ち' },
	{ value: 'approved', label: '承認済み' },
	{ value: 'rejected', label: '却下済み' },
] as const;

const status = ref<'pending' | 'approved' | 'rejected'>('pending');
const items = ref<any[]>([]);
const loading = ref(false);
const hasMore = ref(false);

// 旗鯖fork: rejected サマリ統計
const summary = ref<{ cleanedCount: number; emailRetainedCount: number; legacyCount: number } | null>(null);

async function load() {
	loading.value = true;
	items.value = [];
	try {
		const res = await (misskeyApi as any)('admin/registration-applications', {
			status: status.value,
			limit: LIMIT,
			offset: 0,
		});
		items.value = res;
		hasMore.value = res.length >= LIMIT;

		// rejected の場合、サマリも取得
		if (status.value === 'rejected') {
			await loadSummary();
		} else {
			summary.value = null;
		}
	} catch (err) {
		console.error('[registration-applications] load error:', err);
	} finally {
		loading.value = false;
	}
}

async function loadSummary() {
	try {
		// dry-run でサマリ統計だけ取得
		const res = await (misskeyApi as any)('admin/cleanup-legacy-rejected-registrations', {
			execute: false,
		});
		summary.value = {
			cleanedCount: res.alreadyCleanedCount,
			emailRetainedCount: res.emailRetainedCount,
			legacyCount: res.cleanedCount, // dry-run なので「クリーンアップ予定数」= 旧仕様未処理数
		};
	} catch (err) {
		console.error('[registration-applications] summary error:', err);
		summary.value = null;
	}
}

async function loadMore() {
	try {
		const res = await (misskeyApi as any)('admin/registration-applications', {
			status: status.value,
			limit: LIMIT,
			offset: items.value.length,
		});
		items.value = [...items.value, ...res];
		hasMore.value = res.length >= LIMIT;
	} catch (err) {
		console.error('[registration-applications] loadMore error:', err);
	}
}

watch(status, () => load(), { immediate: true });

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
	const { canceled } = await os.confirm({
		type: 'info',
		title: '申請の承認',
		text: `@${item.username} の登録申請を承認しますか？\nアカウントが作成され、承認メールが送信されます。`,
	});
	if (canceled) return;

	try {
		await (misskeyApi as any)('admin/approve-registration', {
			applicationId: item.id,
		});
		os.alert({ type: 'success', text: `@${item.username} の申請を承認しました。` });
		items.value = items.value.filter(x => x.id !== item.id);
	} catch (err: any) {
		console.error('[registration-applications] approve error:', err);
		os.alert({ type: 'error', text: err?.message || 'エラーが発生しました。' });
	}
}

async function reject(item: any) {
	const { canceled } = await os.confirm({
		type: 'warning',
		title: '申請の却下',
		text: `@${item.username} の登録申請を却下しますか？\n\n却下されると、ID・パスワード情報は即時削除されます。\nメールアドレスは同一メールからの連続申請を拒否するため、90日間保持されます。\n却下メールは送信されません。`,
	});
	if (canceled) return;

	try {
		await (misskeyApi as any)('admin/reject-registration', {
			applicationId: item.id,
		});
		os.alert({ type: 'success', text: `@${item.username} の申請を却下しました。\nID・パスワード情報は削除済みです。` });
		items.value = items.value.filter(x => x.id !== item.id);
	} catch (err: any) {
		console.error('[registration-applications] reject error:', err);
		os.alert({ type: 'error', text: err?.message || 'エラーが発生しました。' });
	}
}

// 旗鯖fork: 既存データのクリーンアップ (Dry-run)
async function runLegacyCleanupDryRun() {
	try {
		const res = await (misskeyApi as any)('admin/cleanup-legacy-rejected-registrations', {
			execute: false,
		});
		os.alert({
			type: 'info',
			title: 'クリーンアップ確認 (Dry-run)',
			text: `クリーンアップ対象: ${res.cleanedCount}件\n既にクリーンアップ済み: ${res.alreadyCleanedCount}件\nメール保持中: ${res.emailRetainedCount}件\n\n実際の削除は実行されていません。`,
		});
	} catch (err: any) {
		console.error('[cleanup-legacy] dry-run error:', err);
		os.alert({ type: 'error', text: err?.message || 'エラーが発生しました。' });
	}
}

// 旗鯖fork: 既存データのクリーンアップ (実削除)
async function runLegacyCleanup() {
	const { canceled } = await os.confirm({
		type: 'warning',
		title: '既存データの一括クリーンアップ',
		text: `旧仕様で却下された申請のID・パスワード情報を一括削除します。\n\n対象: ${summary.value?.legacyCount || 0}件\n\nこの操作は取り消せません。続行しますか？`,
	});
	if (canceled) return;

	try {
		const res = await (misskeyApi as any)('admin/cleanup-legacy-rejected-registrations', {
			execute: true,
		});
		os.alert({
			type: 'success',
			title: 'クリーンアップ完了',
			text: `${res.cleanedCount}件のID・パスワード情報を削除しました。\nメール保持中の申請: ${res.emailRetainedCount}件\n\n削除実行日時: ${formatDate(res.executedAt)}`,
		});
		// リロード
		await load();
	} catch (err: any) {
		console.error('[cleanup-legacy] execute error:', err);
		os.alert({ type: 'error', text: err?.message || 'エラーが発生しました。' });
	}
}

const headerActions = computed(() => [{
	icon: 'ti ti-refresh',
	text: '再読み込み',
	handler: () => load(),
}]);
const headerTabs = computed(() => []);

definePage(() => ({
	title: '登録申請管理',
	icon: 'ti ti-file-description',
}));
</script>

<style lang="scss" module>
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
	word-break: break-all;
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
