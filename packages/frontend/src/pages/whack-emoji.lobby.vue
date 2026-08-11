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
					<div :class="$style.heroTitle">⚔️ {{ copy.title }}</div>
					<div :class="$style.heroSub">{{ copy.description }}</div>
				</div>

				<div class="_panel" :class="$style.card">
					<div class="_gaps" style="padding: 20px;">
						<div style="font-weight:bold;">{{ common._rooms.createRoom }}</div>
						<div :class="$style.diffRow">
							<span style="font-size:.85rem;">{{ copy.difficulty }}:</span>
							<div :class="$style.diffBtns">
								<button v-for="d in 10" :key="d" :class="[$style.diffBtn, diff === d && $style.diffBtnOn]" @click="diff = d">{{ d }}</button>
							</div>
						</div>
						<MkButton primary gradate rounded @click="createRoom" :disabled="creating">
							<i class="ti ti-plus"></i> {{ creating ? common._rooms.creating : common._rooms.createNewRoom }}
						</MkButton>
					</div>
				</div>

				<div class="_panel" :class="$style.card">
					<div class="_gaps_s" style="padding: 16px;">
						<div style="display:flex;align-items:center;justify-content:space-between;">
							<b>🏠 {{ common._rooms.waitingRooms }}</b>
							<button :class="$style.refreshBtn" @click="fetchRooms"><i class="ti ti-refresh"></i></button>
						</div>
						<div v-if="loading" style="text-align:center;padding:16px;"><MkLoading/></div>
						<div v-else-if="rooms.length === 0" style="text-align:center;padding:16px;opacity:.5;">{{ common._rooms.noWaitingRooms }}</div>
						<div v-else :class="$style.roomList">
							<div v-for="room in rooms" :key="room.id" :class="$style.roomItem">
								<div :class="$style.roomAvatar">
									<img v-if="room.host1?.avatarUrl" :src="room.host1.avatarUrl" :class="$style.roomAvatarImg"/>
								</div>
								<div :class="$style.roomInfo">
									<div :class="$style.roomName"><MkUserName v-if="room.host1" :user="room.host1"/><span v-else>???</span></div>
									<div :class="$style.roomMeta">{{ commonx.levelShort({ level: String(room.difficulty) }) }}</div>
								</div>
								<MkButton v-if="isMyRoom(room)" rounded small @click="goToMyRoom(room.id)">
									<i class="ti ti-clock"></i> {{ common._rooms.waiting }}
								</MkButton>
								<MkButton v-else primary rounded small @click="joinRoom(room.id)">
									<i class="ti ti-door-enter"></i> {{ common._rooms.join }}
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
import { useRouter } from '@/router.js';
import { definePage } from '@/page.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import * as os from '@/os.js';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';

const router = useRouter();
const common = i18n.ts._hata._games._common;
const commonx = i18n.tsx._hata._games._common;
const copy = i18n.ts._hata._games._whack._lobby;

const rooms = ref<any[]>([]);
const loading = ref(false);
const creating = ref(false);
const diff = ref(5);

function isMyRoom(room: any): boolean {
	return $i != null && room.host1Id === $i.id;
}

async function fetchRooms() {
	loading.value = true;
	try {
		const result = await misskeyApi('whack-emoji/rooms', {});
		rooms.value = Array.isArray(result) ? result : [];
	} catch { rooms.value = []; }
	finally { loading.value = false; }
}

async function createRoom() {
	creating.value = true;
	try {
		const room = await misskeyApi('whack-emoji/create-room', { difficulty: diff.value }) as any;
		router.pushByPath(`/whack-emoji/battle?roomId=${room.id}`);
	} catch { os.alert({ type: 'error', text: common._rooms.createFailed }); }
	finally { creating.value = false; }
}

async function joinRoom(roomId: string) {
	try {
		await misskeyApi('whack-emoji/join-room', { roomId });
		router.pushByPath(`/whack-emoji/battle?roomId=${roomId}`);
	} catch (e: any) {
		const code = e?.code || e?.info?.code || '';
		if (code === 'CANNOT_JOIN_OWN_ROOM') {
			os.alert({ type: 'warning', text: common._rooms.cannotJoinOwnRoom });
		} else if (code === 'NO_SUCH_ROOM') {
			os.alert({ type: 'error', text: common._rooms.roomNotFound });
			fetchRooms();
		} else {
			os.alert({ type: 'error', text: common._rooms.roomFullOrEnded });
			fetchRooms();
		}
	}
}

function goToMyRoom(roomId: string) {
	router.pushByPath(`/whack-emoji/battle?roomId=${roomId}`);
}

onMounted(() => { fetchRooms(); });
definePage(() => ({ title: copy.pageTitle, icon: 'ti ti-swords' }));
</script>

<style lang="scss" module>
.root { max-width: 500px; margin: 0 auto; }
.hero { padding: 24px; text-align: center; background: linear-gradient(135deg, #a29bfe, #6c5ce7); border-radius: 16px; }
.heroTitle { font-size: 1.5rem; font-weight: 900; color: #fff; margin-bottom: 4px; }
.heroSub { font-size: .9rem; color: rgba(255,255,255,.8); }
.card { border-radius: 14px; overflow: hidden; text-align: center; }
.diffRow { display: flex; align-items: center; gap: 8px; justify-content: center; flex-wrap: wrap; }
.diffBtns { display: flex; gap: 4px; flex-wrap: wrap; }
.diffBtn { width: 32px; height: 32px; border-radius: 8px; border: 2px solid var(--MI_THEME-divider); background: var(--MI_THEME-panel); cursor: pointer; font-weight: 700; font-size: .85rem; display: flex; align-items: center; justify-content: center; transition: all .15s; }
.diffBtnOn { border-color: var(--MI_THEME-accent); background: var(--MI_THEME-accentedBg); color: var(--MI_THEME-accent); }
.refreshBtn { background: none; border: 1.5px solid var(--MI_THEME-divider); border-radius: 8px; padding: 4px 8px; cursor: pointer; }
.roomList { display: flex; flex-direction: column; gap: 4px; }
.roomItem { display: flex; align-items: center; gap: 10px; padding: 10px 4px; border-bottom: 1px solid color-mix(in srgb, var(--MI_THEME-divider) 50%, transparent); &:last-child { border-bottom: none; } }
.roomAvatar { flex-shrink: 0; }
.roomAvatarImg { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
.roomInfo { flex: 1; min-width: 0; text-align: left; }
.roomName { font-weight: 600; font-size: .9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.roomMeta { font-size: .75rem; opacity: .5; }
</style>
