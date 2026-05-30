<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 900px;">
		<div class="_gaps">
			<MkInfo>{{ i18n.ts._announcement.shouldNotBeUsedToPresentPermanentInfo }}</MkInfo>
			<MkInfo v-if="announcements.length > 5" warn>{{ i18n.ts._announcement.tooManyActiveAnnouncementDescription }}</MkInfo>

			<MkSelect v-model="announcementsStatus" :items="announcementsStatusDef">
				<template #label>{{ i18n.ts.filter }}</template>
			</MkSelect>

			<MkLoading v-if="loading"/>

			<template v-else>
				<MkFolder v-for="announcement in announcements" :key="announcement.id ?? announcement._id" :defaultOpen="announcement.id == null" :isArchived="announcement.id && !announcement.isActive">
					<template #label>{{ announcement.title }}</template>
					<template #icon>
						<i v-if="announcement.icon === 'info'" class="ti ti-info-circle"></i>
						<i v-else-if="announcement.icon === 'warning'" class="ti ti-alert-triangle" style="color: var(--MI_THEME-warn);"></i>
						<i v-else-if="announcement.icon === 'error'" class="ti ti-circle-x" style="color: var(--MI_THEME-error);"></i>
						<i v-else-if="announcement.icon === 'success'" class="ti ti-check" style="color: var(--MI_THEME-success);"></i>
						<i v-else-if="announcement.icon === 'maintenance'" class="ti ti-tool" style="color: var(--MI_THEME-error);"></i>
					</template>
					<template #caption>{{ announcement.text }}</template>
					<template #footer>
						<div class="_buttons">
							<MkButton rounded primary @click="save(announcement)"><i class="ti ti-device-floppy"></i> {{ i18n.ts.save }}</MkButton>
							<MkButton v-if="announcement.id != null && announcement.isActive" rounded @click="archive(announcement)"><i class="ti ti-check"></i> {{ i18n.ts._announcement.end }} ({{ i18n.ts.archive }})</MkButton>
							<MkButton v-if="announcement.id != null && !announcement.isActive" rounded @click="unarchive(announcement)"><i class="ti ti-restore"></i> {{ i18n.ts.unarchive }}</MkButton>
							<MkButton v-if="announcement.id != null" rounded danger @click="del(announcement)"><i class="ti ti-trash"></i> {{ i18n.ts.delete }}</MkButton>
						</div>
					</template>

					<div class="_gaps">
						<MkInput v-model="announcement.title">
							<template #label>{{ i18n.ts.title }}</template>
						</MkInput>
						<MkTextarea v-model="announcement.text" mfmAutocomplete :mfmPreview="true">
							<template #label>{{ i18n.ts.text }}</template>
						</MkTextarea>
						<MkInput v-model="announcement.imageUrl" type="url">
							<template #label>{{ i18n.ts.imageUrl }}</template>
						</MkInput>
						<MkRadios v-model="announcement.icon">
							<template #label>{{ i18n.ts.icon }}</template>
							<option value="info"><i class="ti ti-info-circle"></i></option>
							<option value="warning"><i class="ti ti-alert-triangle" style="color: var(--MI_THEME-warn);"></i></option>
							<option value="error"><i class="ti ti-circle-x" style="color: var(--MI_THEME-error);"></i></option>
							<option value="success"><i class="ti ti-check" style="color: var(--MI_THEME-success);"></i></option>
							<option value="maintenance"><i class="ti ti-tool" style="color: var(--MI_THEME-error);"></i></option>
						</MkRadios>
						<MkInfo v-if="announcement.icon === 'maintenance'">{{ i18n.ts._announcement.maintenanceNote }}</MkInfo>
						<!-- 旗鯖fork: メンテナンス進捗バー(4段階) -->
						<div v-if="announcement.icon === 'maintenance'" :class="$style.progressBlock">
							<MkSwitch :modelValue="!!announcement.progressSteps" @update:modelValue="toggleProgress(announcement, $event)">
								進捗バーを表示する
								<template #caption>4段階のラベルと進捗を利用者に表示します。各段階の文言は自由に設定できます。</template>
							</MkSwitch>
							<div v-if="announcement.progressSteps" :class="$style.progressSteps">
								<div v-for="(label, idx) in announcement.progressSteps" :key="idx" :class="$style.progressStepRow">
									<span :class="$style.progressStepNum">{{ idx + 1 }}</span>
									<MkInput v-model="announcement.progressSteps[idx]" :placeholder="`段階${idx + 1}のラベル`" style="flex:1;"/>
									<MkSwitch :modelValue="(announcement.progressCompleted ?? [false,false,false,false])[idx]" @update:modelValue="setProgressCompleted(announcement, idx, $event)">
										完了
									</MkSwitch>
								</div>
							</div>
						</div>
						<MkRadios v-model="announcement.display">
							<template #label>{{ i18n.ts.display }}</template>
							<option value="normal">{{ i18n.ts.normal }}</option>
							<option value="banner">{{ i18n.ts.banner }}</option>
							<option value="dialog">{{ i18n.ts.dialog }}</option>
						</MkRadios>
						<MkInfo v-if="announcement.display === 'dialog'" warn>{{ i18n.ts._announcement.dialogAnnouncementUxWarn }}</MkInfo>
						<MkSwitch v-model="announcement.forExistingUsers" :helpText="i18n.ts._announcement.forExistingUsersDescription">
							{{ i18n.ts._announcement.forExistingUsers }}
						</MkSwitch>
						<MkSwitch v-model="announcement.silence" :helpText="i18n.ts._announcement.silenceDescription">
							{{ i18n.ts._announcement.silence }}
						</MkSwitch>
						<MkSwitch v-model="announcement.needConfirmationToRead" :helpText="i18n.ts._announcement.needConfirmationToReadDescription">
							{{ i18n.ts._announcement.needConfirmationToRead }}
						</MkSwitch>
						<p v-if="announcement.reads">{{ i18n.tsx.nUsersRead({ n: announcement.reads }) }}</p>
					</div>
				</MkFolder>
				<MkLoading v-if="loadingMore"/>
				<MkButton @click="more()">
					<i class="ti ti-reload"></i> {{ i18n.ts.more }}
				</MkButton>
			</template>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkRadios from '@/components/MkRadios.vue';
import MkInfo from '@/components/MkInfo.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import MkFolder from '@/components/MkFolder.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import { genId } from '@/utility/id.js';
import { useMkSelect } from '@/composables/use-mkselect.js';

const {
	model: announcementsStatus,
	def: announcementsStatusDef,
} = useMkSelect({
	items: [
		{ label: i18n.ts.active, value: 'active' },
		{ label: i18n.ts.archived, value: 'archived' },
	],
	initialValue: 'active',
});

const loading = ref(true);
const loadingMore = ref(false);

const announcements = ref<any[]>([]);

watch(announcementsStatus, (to) => {
	loading.value = true;
	misskeyApi('admin/announcements/list', {
		status: to,
	}).then(announcementResponse => {
		announcements.value = announcementResponse;
		loading.value = false;
	});
}, { immediate: true });

function add() {
	announcements.value.unshift({
		_id: genId(),
		id: null,
		title: 'New announcement',
		text: '',
		imageUrl: null,
		icon: 'info',
		display: 'normal',
		forExistingUsers: false,
		silence: false,
		needConfirmationToRead: false,
		// 旗鯖fork: メンテ進捗バー (icon === 'maintenance' のときのみ使用)
		progressSteps: null,
		progressCompleted: null,
	});
}

// 旗鯖fork: メンテ進捗バーのON/OFFと完了状態を切り替えるヘルパー
function toggleProgress(announcement: any, enabled: boolean) {
	if (enabled) {
		announcement.progressSteps = ['', '', '', ''];
		announcement.progressCompleted = [false, false, false, false];
	} else {
		announcement.progressSteps = null;
		announcement.progressCompleted = null;
	}
}
function setProgressCompleted(announcement: any, idx: number, completed: boolean) {
	if (!announcement.progressCompleted) {
		announcement.progressCompleted = [false, false, false, false];
	}
	announcement.progressCompleted[idx] = completed;
}

function del(announcement) {
	os.confirm({
		type: 'warning',
		text: i18n.tsx.deleteAreYouSure({ x: announcement.title }),
	}).then(({ canceled }) => {
		if (canceled) return;
		announcements.value = announcements.value.filter(x => x !== announcement);
		misskeyApi('admin/announcements/delete', announcement);
	});
}

async function archive(announcement) {
	await os.apiWithDialog('admin/announcements/update', {
		...announcement,
		isActive: false,
	});
	refresh();
}

async function unarchive(announcement) {
	await os.apiWithDialog('admin/announcements/update', {
		...announcement,
		isActive: true,
	});
	refresh();
}

async function save(announcement) {
	if (announcement.id == null) {
		await os.apiWithDialog('admin/announcements/create', announcement);
		refresh();
	} else {
		os.apiWithDialog('admin/announcements/update', announcement);
	}
}

function more() {
	loadingMore.value = true;
	misskeyApi('admin/announcements/list', {
		status: announcementsStatus.value,
		untilId: announcements.value.reduce((acc, announcement) => announcement.id != null ? announcement : acc).id,
	}).then(announcementResponse => {
		announcements.value = announcements.value.concat(announcementResponse);
		loadingMore.value = false;
	});
}

function refresh() {
	loading.value = true;
	misskeyApi('admin/announcements/list', {
		status: announcementsStatus.value,
	}).then(announcementResponse => {
		announcements.value = announcementResponse;
		loading.value = false;
	});
}

const headerActions = computed(() => [{
	asFullButton: true,
	icon: 'ti ti-plus',
	text: i18n.ts.add,
	handler: add,
	disabled: announcementsStatus.value === 'archived',
}]);

const headerTabs = computed(() => []);

definePage(() => ({
	title: i18n.ts.announcements,
	icon: 'ti ti-speakerphone',
}));
</script>

<style lang="scss" module>
/* 旗鯖fork: メンテナンス進捗バー設定UI */
.progressBlock {
	margin: 10px 0;
	padding: 12px;
	border-radius: 10px;
	background: var(--MI_THEME-bg);
	border: 1px solid var(--MI_THEME-divider);
}
.progressSteps {
	margin-top: 10px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}
.progressStepRow {
	display: flex;
	align-items: center;
	gap: 10px;
}
.progressStepNum {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: var(--MI_THEME-accent);
	color: var(--MI_THEME-fgOnAccent);
	font-weight: 700;
	font-size: 0.85em;
	flex-shrink: 0;
}
</style>
