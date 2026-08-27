<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<SearchMarker path="/settings/profiles" :label="i18n.ts._preferencesProfile.manageProfiles" :keywords="['profile', 'settings', 'preferences', 'manage']" icon="ti ti-settings-cog">
	<div class="_gaps">
		<!-- 旗鯖fork: 1件も無いと画面が真っ白になり、何をすればよいか分からなかった。 -->
		<div v-if="backups.length === 0" class="_gaps_s">
			<MkResult type="empty" :text="hataCopy.emptyProfilesTitle"/>
			<p style="margin: 0; opacity: .75; font-size: .9em; line-height: 1.6;">{{ hataCopy.emptyProfilesText }}</p>
			<MkButton primary @click="goAutoBackupSettings">{{ hataCopy.emptyProfilesLink }}</MkButton>
		</div>
		<MkFolder v-for="backup in backups" v-else :key="backup.name">
			<template #label>{{ backup.name }}</template>
			<MkButton danger @click="del(backup)">{{ i18n.ts.delete }}</MkButton>
		</MkFolder>
	</div>
</SearchMarker>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import type { MenuItem } from '@/types/menu.js';
import MkButton from '@/components/MkButton.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkResult from '@/components/global/MkResult.vue';
import { mainRouter } from '@/router.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { prefer } from '@/preferences.js';
import { deleteCloudBackup, listCloudBackups } from '@/preferences/utility.js';

const backups = await listCloudBackups();

// 旗鯖fork: 自動バックアップの設定は環境設定の中にある。
const hataCopy = i18n.ts._hata._settingsRedesign.gateway;

function goAutoBackupSettings() {
	mainRouter.push('/settings/preferences');
}

function del(backup) {
	deleteCloudBackup(backup.name);
}

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePage(() => ({
	title: i18n.ts._preferencesProfile.manageProfiles,
	icon: 'ti ti-settings-cog',
}));
</script>

<style lang="scss" module>
</style>
