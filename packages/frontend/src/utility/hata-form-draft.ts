/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Ref, WatchStopHandle } from 'vue';
import { $i } from '@/i.js';
import { miLocalStorage } from '@/local-storage.js';

type StoredDraft = {
	version: 1;
	updatedAt: number;
	data: unknown;
};

type DraftStore = Record<string, StoredDraft>;

const DRAFT_TTL = 1000 * 60 * 60 * 24 * 30;
const MAX_DRAFTS = 32;

function storageKey(): `hataFormDrafts:${string}` {
	return `hataFormDrafts:${$i?.id ?? 'anonymous'}`;
}

function readStore(): DraftStore {
	try {
		const parsed = miLocalStorage.getItemAsJson(storageKey());
		if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
		const now = Date.now();
		return Object.fromEntries(Object.entries(parsed as DraftStore).filter(([, draft]) => (
			draft?.version === 1 && typeof draft.updatedAt === 'number' && now - draft.updatedAt <= DRAFT_TTL
		)));
	} catch {
		return {};
	}
}

function writeStore(store: DraftStore): void {
	try {
		const entries = Object.entries(store)
			.sort((a, b) => b[1].updatedAt - a[1].updatedAt)
			.slice(0, MAX_DRAFTS);
		miLocalStorage.setItemAsJson(storageKey(), Object.fromEntries(entries));
	} catch {
		// localStorage が無効・容量超過でもフォーム本体は止めない。
	}
}

export function useHataFormDraft<T>(options: {
	id: string;
	capture: () => T;
	restore: (data: T) => void;
	isMeaningful: (data: T) => boolean;
	delay?: number;
}): {
	restored: Ref<boolean>;
	clearDraft: () => void;
	flushDraft: () => void;
} {
	const restored = ref(false);
	let completed = false;
	let initialSnapshot = '';
	let timer: number | null = null;
	let stopWatch: WatchStopHandle | null = null;

	const cancelTimer = () => {
		if (timer != null) window.clearTimeout(timer);
		timer = null;
	};
	const snapshot = (data: T): string => {
		try { return JSON.stringify(data); } catch { return ''; }
	};
	const hasUnsavedChanges = (data: T): boolean => options.isMeaningful(data) && snapshot(data) !== initialSnapshot;

	const flushDraft = () => {
		cancelTimer();
		if (completed) return;
		const store = readStore();
		const data = options.capture();
		if (hasUnsavedChanges(data)) {
			store[options.id] = { version: 1, updatedAt: Date.now(), data };
		} else {
			delete store[options.id];
		}
		writeStore(store);
	};

	const clearDraft = () => {
		completed = true;
		cancelTimer();
		const store = readStore();
		delete store[options.id];
		writeStore(store);
	};

	const beforeUnload = (event: BeforeUnloadEvent) => {
		if (completed || !hasUnsavedChanges(options.capture())) return;
		flushDraft();
		event.preventDefault();
		event.returnValue = '';
	};

	onMounted(() => {
		initialSnapshot = snapshot(options.capture());
		const draft = readStore()[options.id];
		if (draft != null) {
			try {
				options.restore(draft.data as T);
				restored.value = true;
			} catch {
				const store = readStore();
				delete store[options.id];
				writeStore(store);
			}
		}
		stopWatch = watch(options.capture, () => {
			cancelTimer();
			timer = window.setTimeout(flushDraft, options.delay ?? 600);
		}, { deep: true });
		window.addEventListener('beforeunload', beforeUnload);
	});

	onBeforeUnmount(() => {
		stopWatch?.();
		window.removeEventListener('beforeunload', beforeUnload);
		flushDraft();
	});

	return { restored, clearDraft, flushDraft };
}
