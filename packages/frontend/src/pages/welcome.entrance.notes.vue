<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="enabled && notes.length > 0" class="hero-server-notes">
	<div class="hero-server-notes-head"><span>{{ language === 'en' ? 'SERVER NOTES' : 'サーバーの投稿' }}</span></div>
	<div class="hero-server-notes-window" role="region" :aria-label="language === 'en' ? 'Server notes' : 'サーバーの投稿'" tabindex="0">
		<div class="hero-server-notes-track">
			<div v-for="copy in 2" :key="copy" class="hero-server-notes-group" role="list" :aria-hidden="copy === 2 ? true : undefined" :inert="copy === 2">
				<article v-for="note in notes" :key="note.id" class="hero-server-note" role="listitem">
					<img class="hero-server-note-avatar" :src="note.user.avatarUrl" width="34" height="34" alt="" aria-hidden="true" draggable="false" decoding="async"/>
					<span class="hero-server-note-body">
						<span class="hero-server-note-meta">
							<strong><MkA :to="userPage(note.user)"><MkUserName :user="note.user"/></MkA></strong>
							<span>@{{ acct(note.user) }}</span>
							<MkTime :time="note.createdAt"/>
						</span>
						<span class="hero-server-note-copy">
							<MkA :to="`/notes/${note.id}`"><Mfm :text="note.cw ?? note.text ?? ''" :author="note.user" :emojiUrls="note.emojis" :plain="true" :nowrap="true"/></MkA>
						</span>
					</span>
				</article>
			</div>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';
import type * as Misskey from 'cherrypick-js';
import MkA from '@/components/global/MkA.vue';
import Mfm from '@/components/global/MkMfm.js';
import MkTime from '@/components/global/MkTime.vue';
import MkUserName from '@/components/global/MkUserName.vue';
import { acct, userPage } from '@/filters/user.js';
import { instance } from '@/instance.js';
import { misskeyApi } from '@/utility/misskey-api.js';

defineProps<{
	language: 'ja' | 'en';
}>();

const emit = defineEmits<{
	(ev: 'resize'): void;
	(ev: 'availability', available: boolean): void;
}>();

const notes = ref<Misskey.entities.Note[]>([]);
const enabled = computed(() => instance.policies?.ltlAvailable === true && instance.clientOptions?.showTimelineForVisitor !== false);

watch(enabled, async (available, _previous, onCleanup) => {
	const controller = new AbortController();
	let active = true;
	onCleanup(() => {
		active = false;
		controller.abort();
	});
	notes.value = [];
	emit('availability', false);

	if (available) {
		try {
			const response = await misskeyApi('notes/local-timeline', {
				limit: 8,
				withRenotes: false,
			}, null, controller.signal);
			if (active) {
				notes.value = response.filter(note => !note.isHidden && note.visibility === 'public' && note.user.host == null);
			}
		} catch {
			// 実投稿を取得できなければ隠す。架空の投稿で補完しない。
			if (active) notes.value = [];
		}
	}

	await nextTick();
	if (active) {
		emit('availability', notes.value.length > 0);
		emit('resize');
	}
}, { immediate: true });
</script>
