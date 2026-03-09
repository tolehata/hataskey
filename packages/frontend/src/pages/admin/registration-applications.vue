<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 800px;">
		<div class="_gaps_m">
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
							<span :class="$style.username">@{{ item.username }}</span>
						</div>
						<div :class="$style.cardDate">{{ formatDate(item.createdAt) }}</div>
					</div>
					<div :class="$style.cardBody">
						<div :class="$style.cardField">
							<div :class="$style.cardFieldLabel">メールアドレス</div>
							<div :class="$style.cardFieldValue">{{ item.email }}</div>
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
	} catch (err) {
		console.error('[registration-applications] load error:', err);
	} finally {
		loading.value = false;
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
		text: `@${item.username} の登録申請を却下しますか？\n※却下メールは送信されません。`,
	});
	if (canceled) return;

	try {
		await (misskeyApi as any)('admin/reject-registration', {
			applicationId: item.id,
		});
		os.alert({ type: 'success', text: `@${item.username} の申請を却下しました。` });
		items.value = items.value.filter(x => x.id !== item.id);
	} catch (err: any) {
		console.error('[registration-applications] reject error:', err);
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
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	padding: 40px 0;
	color: var(--MI_THEME-fg);
	opacity: 0.6;

	p {
		margin: 0;
	}
}

.emptyIcon {
	font-size: 40px;
	margin-bottom: 12px;
}

.card {
	background: var(--MI_THEME-panel);
	border-radius: var(--MI-radius);
	padding: 20px;
	border: 1px solid var(--MI_THEME-divider);
}

.cardHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
}

.cardUser {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 1.1em;
	font-weight: bold;
}

.username {
	color: var(--MI_THEME-accent);
}

.cardDate {
	font-size: 0.85em;
	opacity: 0.6;
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-bottom: 16px;
}

.cardFieldLabel {
	font-size: 0.8em;
	opacity: 0.6;
	margin-bottom: 2px;
}

.cardFieldValue {
	font-size: 0.95em;
	line-height: 1.5;
	white-space: pre-wrap;
	word-break: break-word;
}

.cardActions {
	display: flex;
	gap: 8px;
	justify-content: flex-end;
}

.cardStatus {
	text-align: right;
	font-size: 0.9em;
}

.statusApproved {
	color: var(--MI_THEME-success);
}

.statusRejected {
	color: var(--MI_THEME-error);
}

.more {
	text-align: center;
	padding: 8px 0;
}
</style>
