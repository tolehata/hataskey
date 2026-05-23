<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div class="_spacer" style="--MI_SPACER-w: 600px;">
		<div :class="$style.root">
			<div class="_gaps">
				<div class="_panel" :class="$style.hero">
					<div :class="$style.heroTitle">⚔️ サーバー対戦ロビー</div>
					<div :class="$style.heroSub">他のユーザーと積みゲームで対戦！</div>
				</div>

				<!-- ルーム作成 -->
				<div class="_panel" :class="$style.card">
					<div class="_gaps" style="padding: 20px;">
						<div style="font-weight:bold;">ルームを作成</div>
						<MkButton primary gradate rounded @click="createRoom" :disabled="creating">
							<i class="ti ti-plus"></i> {{ creating ? '作成中...' : '新しいルームを作る' }}
						</MkButton>
					</div>
				</div>

				<!-- 待機中ルーム一覧 -->
				<div class="_panel" :class="$style.card">
					<div class="_gaps_s" style="padding: 16px;">
						<div style="display:flex;align-items:center;justify-content:space-between;">
							<b>🏠 待機中のルーム</b>
							<button :class="$style.refreshBtn" @click="fetchRooms"><i class="ti ti-refresh"></i></button>
						</div>
						<div v-if="loading" style="text-align:center;padding:16px;"><MkLoading/></div>
						<div v-else-if="rooms.length === 0" style="text-align:center;padding:16px;opacity:.5;">
							待機中のルームはありません
						</div>
						<div v-else :class="$style.roomList">
							<div v-for="room in rooms" :key="room.id" :class="$style.roomItem">
								<div :class="$style.roomAvatar">
									<img v-if="room.host1?.avatarUrl" :src="room.host1.avatarUrl" :class="$style.roomAvatarImg"/>
								</div>
								<div :class="$style.roomInfo">
									<div :class="$style.roomName"><MkUserName v-if="room.host1" :user="room.host1"/><span v-else>???</span></div>
								</div>
								<MkButton v-if="isMyRoom(room)" rounded small @click="goToMyRoom(room.id)">
									<i class="ti ti-clock"></i> 待機中
								</MkButton>
								<MkButton v-else primary rounded small @click="joinRoom(room.id)">
									<i class="ti ti-door-enter"></i> 参加
								</MkButton>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import MkButton from '@/components/MkButton.vue';
import { mainRouter } from '@/router.js';
import { definePage } from '@/page.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import * as os from '@/os.js';
import { $i } from '@/i.js';

const rooms = ref<any[]>([]);
const loading = ref(false);
const creating = ref(false);

function isMyRoom(room: any): boolean {
	return $i != null && room.host1Id === $i.id;
}

async function fetchRooms() {
	loading.value = true;
	try {
		const result = await misskeyApi('stacking-game/rooms', {});
		rooms.value = Array.isArray(result) ? result : [];
	} catch { rooms.value = []; }
	finally { loading.value = false; }
}

async function createRoom() {
	creating.value = true;
	try {
		const room = await misskeyApi('stacking-game/create-room', {}) as any;
		mainRouter.push(`/stacking-game/battle?roomId=${room.id}`);
	} catch (e) {
		os.alert({ type: 'error', text: 'ルーム作成に失敗しました' });
	} finally { creating.value = false; }
}

async function joinRoom(roomId: string) {
	try {
		await misskeyApi('stacking-game/join-room', { roomId });
		mainRouter.push(`/stacking-game/battle?roomId=${roomId}`);
	} catch (e: any) {
		const code = e?.code || e?.info?.code || '';
		if (code === 'CANNOT_JOIN_OWN_ROOM') {
			os.alert({ type: 'warning', text: '自分が作成したルームには参加できません' });
		} else if (code === 'NO_SUCH_ROOM') {
			os.alert({ type: 'error', text: 'ルームが見つかりません' });
			fetchRooms();
		} else {
			os.alert({ type: 'error', text: 'ルームは既に満員か終了しています' });
			fetchRooms();
		}
	}
}

function goToMyRoom(roomId: string) {
	mainRouter.push(`/stacking-game/battle?roomId=${roomId}`);
}

onMounted(() => { fetchRooms(); });

definePage(() => ({ title: 'つみつみタワー - ロビー', icon: 'ti ti-swords' }));
</script>

<style lang="scss" module>
.root { max-width: 500px; margin: 0 auto; }
.hero { padding: 24px; text-align: center; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 16px; }
.heroTitle { font-size: 1.5rem; font-weight: 900; color: #fff; margin-bottom: 4px; }
.heroSub { font-size: .9rem; color: rgba(255,255,255,.8); }
.card { border-radius: 14px; overflow: hidden; text-align: center; }
.refreshBtn { background: none; border: 1.5px solid var(--MI_THEME-divider); border-radius: 8px; padding: 4px 8px; cursor: pointer; transition: all .15s; &:hover { border-color: var(--MI_THEME-accent); } }
.roomList { display: flex; flex-direction: column; gap: 4px; }
.roomItem { display: flex; align-items: center; gap: 10px; padding: 10px 4px; border-bottom: 1px solid color-mix(in srgb, var(--MI_THEME-divider) 50%, transparent); &:last-child { border-bottom: none; } }
.roomAvatar { flex-shrink: 0; }
.roomAvatarImg { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
.roomInfo { flex: 1; min-width: 0; text-align: left; }
.roomName { font-weight: 600; font-size: .9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.roomMeta { font-size: .75rem; opacity: .5; }
</style>
