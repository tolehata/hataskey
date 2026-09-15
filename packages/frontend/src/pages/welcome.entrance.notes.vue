<!-- SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<div v-if="enabled" class="hero-server-notes">
	<WelcomeNoteStream feedKey="latest" :language="language" :title="language === 'en' ? 'Server notes' : 'サーバーの投稿'" icon="ti ti-notes" server/>
</div>
</template>
<script setup lang="ts">
import { nextTick, onBeforeUnmount, watch } from 'vue';
import WelcomeNoteStream from './welcome.entrance.note-stream.vue';
import { useWelcomePublicNotes } from '@/utility/welcome-public-notes.js';
defineProps<{ language: 'ja' | 'en' }>();
const emit = defineEmits<{ resize: []; availability: [available: boolean] }>();
const { enabled, feeds } = useWelcomePublicNotes();
let disposed = false;
onBeforeUnmount(() => { disposed = true; });
watch([enabled, () => feeds.latest.status], async () => {
	await nextTick();
	if (disposed) return;
	emit('availability', enabled.value);
	emit('resize');
}, { immediate: true });
</script>
