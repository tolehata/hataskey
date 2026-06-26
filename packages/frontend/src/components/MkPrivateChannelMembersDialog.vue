<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: プライベートチャンネルのメンバー管理ダイアログ。
-->

<template>
<MkModalWindow
	ref="dialogEl"
	:width="500"
	:height="600"
	@close="dialogEl?.close()"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-users"></i> メンバー管理</template>

	<MkSpacer :marginMin="14" :marginMax="22">
		<div class="_gaps">
			<div class="_buttonsCenter">
				<MkButton primary rounded @click="addMember"><i class="ti ti-user-plus"></i> メンバーを追加</MkButton>
			</div>

			<MkLoading v-if="fetching"/>
			<div v-else-if="members.length === 0" :class="$style.empty">まだメンバーがいません。</div>
			<div v-else class="_gaps_s">
				<div v-for="u in members" :key="u.id" :class="$style.row">
					<MkAvatar :user="u" :class="$style.avatar" link/>
					<div :class="$style.body">
						<MkUserName :user="u"/>
						<MkAcct :user="u" :class="$style.acct"/>
					</div>
					<span v-if="u.id === ownerId" :class="$style.ownerBadge">作成者</span>
					<MkButton v-else danger rounded small @click="removeMember(u)"><i class="ti ti-user-minus"></i></MkButton>
				</div>
			</div>
		</div>
	</MkSpacer>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue';
import * as Misskey from 'cherrypick-js';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkButton from '@/components/MkButton.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import * as os from '@/os.js';

const props = defineProps<{
	channelId: string;
}>();

const emit = defineEmits<{
	(ev: 'closed'): void;
}>();

const dialogEl = useTemplateRef('dialogEl');

const members = ref<Misskey.entities.UserLite[]>([]);
const ownerId = ref<string | null>(null);
const fetching = ref(true);

async function fetchAll() {
	fetching.value = true;
	try {
		const [channel, list] = await Promise.all([
			misskeyApi('channels/show', { channelId: props.channelId }),
			misskeyApi('channels/members', { channelId: props.channelId, limit: 100 }),
		]);
		ownerId.value = channel.userId;
		members.value = list;
	} finally {
		fetching.value = false;
	}
}

fetchAll();

async function addMember() {
	const u = await os.selectUser({ includeSelf: false, localOnly: true });
	if (u == null) return;
	await os.apiWithDialog('channels/add-member', {
		channelId: props.channelId,
		userId: u.id,
	});
	await fetchAll();
}

async function removeMember(u: Misskey.entities.UserLite) {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: `${u.name ?? u.username} をこのチャンネルから外しますか？`,
	});
	if (canceled) return;
	await os.apiWithDialog('channels/remove-member', {
		channelId: props.channelId,
		userId: u.id,
	});
	await fetchAll();
}
</script>

<style lang="scss" module>
.empty {
	text-align: center;
	opacity: 0.7;
	padding: 24px 0;
}

.row {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 10px;
	border-radius: 8px;
	background: var(--MI_THEME-panel);
}

.avatar {
	width: 38px;
	height: 38px;
	flex-shrink: 0;
}

.body {
	flex: 1;
	min-width: 0;
}

.acct {
	opacity: 0.7;
	font-size: 0.85em;
}

.ownerBadge {
	font-size: 0.8em;
	padding: 2px 8px;
	border-radius: 999px;
	background: var(--MI_THEME-accentedBg);
	color: var(--MI_THEME-accent);
}
</style>
