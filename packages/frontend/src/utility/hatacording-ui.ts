/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { miLocalStorage } from '@/local-storage.js';

export type HatacordingUiMenuPreference = {
	pinned: boolean;
	hidden: boolean;
	order: number;
};

export type HatacordingUiWidget = {
	id: string;
	name: string;
	data: Record<string, unknown>;
};

export type HatacordingUiCollectionIcon = 'tv' | 'list' | 'radio' | 'folder' | 'layers';
export type HatacordingUiColorMode = 'theme' | 'light' | 'dark';
export type HatacordingUiScale = 'small' | 'medium' | 'large';
export type HatacordingUiComposerShortcut = 'poll' | 'mention' | 'mfm' | 'hashtag' | 'event' | 'drawing' | 'schedule' | 'reaction' | 'delivery' | 'full';

export const HATACORDING_UI_PREFERENCES_CHANGE_EVENT = 'hatacording-ui-preferences-change' as const;

export type HatacordingUiPreferencesChangeDetail = {
	accountId: string;
	preferences: HatacordingUiDevicePreferences;
};

const COLLECTION_ICONS = ['tv', 'list', 'radio', 'folder', 'layers'] as const;
const COMPOSER_SHORTCUTS = ['poll', 'mention', 'mfm', 'hashtag', 'event', 'drawing', 'schedule', 'reaction', 'delivery', 'full'] as const;

function isCollectionIcon(value: unknown): value is HatacordingUiCollectionIcon {
	return typeof value === 'string' && (COLLECTION_ICONS as readonly string[]).includes(value);
}

export type HatacordingUiSubpaneTab = {
	id: string;
	title: string;
	kind: 'detail' | 'widgets';
	widgets: HatacordingUiWidget[];
};

export type HatacordingUiDevicePreferences = {
	version: 7;
	enabled: boolean;
	colorMode: HatacordingUiColorMode;
	uiScale: HatacordingUiScale;
	timelineRealtime: boolean;
	showRateLimitNumber: boolean;
	showCharacterCounter: boolean;
	// 保存キーは旧foil設定との端末互換を保ち、表示上はテキストshimmerとして扱う。
	showFoilAnimation: boolean;
	tutorialCompleted: boolean;
	sidebarCollapsed: boolean;
	menu: Record<string, HatacordingUiMenuPreference>;
	currentTimelineId: string;
	subpaneTabs: HatacordingUiSubpaneTab[];
	activeSubpaneTabId: string;
	reuseSubpaneTab: boolean;
	rightPaneCollapsed: boolean;
	rightPaneWidth: number;
	collectionExpanded: Record<'lists' | 'antennas' | 'channels', boolean>;
	collectionIcons: Record<'lists' | 'antennas' | 'channels', HatacordingUiCollectionIcon>;
	composerShortcuts: HatacordingUiComposerShortcut[];
};

const DEFAULT_TABS: HatacordingUiSubpaneTab[] = [{
	id: 'detail',
	// 保存値に表示言語を混ぜず、表示時にlocaleから解決する。
	title: 'detail',
	kind: 'detail',
	widgets: [],
}, {
	id: 'widgets',
	title: 'widgets',
	kind: 'widgets',
	widgets: [],
}];

export function defaultHatacordingUiPreferences(): HatacordingUiDevicePreferences {
	return {
		version: 7,
		enabled: true,
		colorMode: 'theme',
		uiScale: 'medium',
		timelineRealtime: true,
		showRateLimitNumber: false,
		showCharacterCounter: false,
		showFoilAnimation: true,
		tutorialCompleted: false,
		sidebarCollapsed: false,
		menu: {},
		currentTimelineId: 'timeline:local',
		subpaneTabs: DEFAULT_TABS.map(tab => ({ ...tab, widgets: [] })),
		activeSubpaneTabId: 'detail',
		reuseSubpaneTab: false,
		rightPaneCollapsed: false,
		rightPaneWidth: 360,
		collectionExpanded: { lists: false, antennas: false, channels: false },
		collectionIcons: { lists: 'list', antennas: 'radio', channels: 'tv' },
		composerShortcuts: [],
	};
}

function storageKey(accountId: string) {
	return `hatacordingUi:${accountId}` as const;
}

function safeMenu(value: unknown): Record<string, HatacordingUiMenuPreference> {
	if (value == null || typeof value !== 'object' || Array.isArray(value)) return {};
	const result: Record<string, HatacordingUiMenuPreference> = {};
	for (const [id, raw] of Object.entries(value)) {
		if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) continue;
		const item = raw as Partial<HatacordingUiMenuPreference>;
		result[id] = {
			pinned: item.pinned === true,
			hidden: item.hidden === true,
			order: Number.isFinite(item.order) ? Number(item.order) : Number.MAX_SAFE_INTEGER,
		};
	}
	return result;
}

function safeTabs(value: unknown): HatacordingUiSubpaneTab[] {
	if (!Array.isArray(value)) return DEFAULT_TABS.map(tab => ({ ...tab, widgets: [] }));
	const tabs: HatacordingUiSubpaneTab[] = [];
	const usedIds = new Set<string>();
	for (const raw of value) {
		if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) continue;
		const tab = raw as Partial<HatacordingUiSubpaneTab>;
		if (typeof tab.id !== 'string' || typeof tab.title !== 'string') continue;
		if (tab.kind !== 'detail' && tab.kind !== 'widgets') continue;
		const id = tab.kind === 'detail' ? DEFAULT_TABS[0].id : tab.id;
		if (usedIds.has(id)) continue;
		const widgets = Array.isArray(tab.widgets) ? tab.widgets.filter((widget): widget is HatacordingUiWidget => (
			widget != null
			&& typeof widget === 'object'
			&& typeof widget.id === 'string'
			&& typeof widget.name === 'string'
			&& widget.data != null
			&& typeof widget.data === 'object'
			&& !Array.isArray(widget.data)
		)) : [];
		usedIds.add(id);
		// 旧バージョンが翻訳済みタイトルを保存していても、
		// 今後は種類ごとのstable tokenへ正規化する。
		tabs.push({ id, title: tab.kind, kind: tab.kind, widgets });
	}
	if (!tabs.some(tab => tab.kind === 'detail')) {
		// `detail` を名乗る壊れたwidgetタブがあっても、正規の詳細タブを優先する。
		const conflictingIndex = tabs.findIndex(tab => tab.id === DEFAULT_TABS[0].id);
		if (conflictingIndex >= 0) tabs.splice(conflictingIndex, 1);
		tabs.unshift({ ...DEFAULT_TABS[0], widgets: [] });
	}
	return tabs;
}

function safeComposerShortcuts(value: unknown): HatacordingUiComposerShortcut[] {
	if (!Array.isArray(value)) return [];
	return [...new Set(value.filter((item): item is HatacordingUiComposerShortcut => (
		typeof item === 'string' && (COMPOSER_SHORTCUTS as readonly string[]).includes(item)
	)))].slice(0, 2);
}

export function readHatacordingUiPreferences(accountId: string): HatacordingUiDevicePreferences {
	const defaults = defaultHatacordingUiPreferences();
	try {
		const raw = miLocalStorage.getItemAsJson(storageKey(accountId)) as Partial<HatacordingUiDevicePreferences> | null;
		if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
		const subpaneTabs = safeTabs(raw.subpaneTabs);
		return {
			version: 7,
			// 初期の試作版には enabled が無い保存値もあるため、明示的な false だけを無効扱いにする。
			enabled: raw.enabled !== false,
			colorMode: raw.colorMode === 'light' || raw.colorMode === 'dark' || raw.colorMode === 'theme'
				? raw.colorMode
				: defaults.colorMode,
			uiScale: raw.uiScale === 'small' || raw.uiScale === 'medium' || raw.uiScale === 'large'
				? raw.uiScale
				: defaults.uiScale,
			timelineRealtime: raw.timelineRealtime !== false,
			showRateLimitNumber: raw.showRateLimitNumber === true,
			showCharacterCounter: raw.showCharacterCounter === true,
			// 旧foil設定を引き継ぎ、既存端末ではshimmerを有効のまま保つ。
			// 利用者が明示的に切った場合だけ抑止する。
			showFoilAnimation: raw.showFoilAnimation !== false,
			tutorialCompleted: raw.tutorialCompleted === true,
			sidebarCollapsed: raw.sidebarCollapsed === true,
			menu: safeMenu(raw.menu),
			currentTimelineId: typeof raw.currentTimelineId === 'string' ? raw.currentTimelineId : defaults.currentTimelineId,
			subpaneTabs,
			activeSubpaneTabId: typeof raw.activeSubpaneTabId === 'string' && subpaneTabs.some(tab => tab.id === raw.activeSubpaneTabId)
				? raw.activeSubpaneTabId
				: subpaneTabs[0].id,
			reuseSubpaneTab: raw.reuseSubpaneTab === true,
			rightPaneCollapsed: raw.rightPaneCollapsed === true,
			rightPaneWidth: typeof raw.rightPaneWidth === 'number' && Number.isFinite(raw.rightPaneWidth)
				? Math.max(280, Math.min(560, raw.rightPaneWidth))
				: defaults.rightPaneWidth,
			collectionExpanded: {
				lists: raw.collectionExpanded?.lists === true,
				antennas: raw.collectionExpanded?.antennas === true,
				channels: raw.collectionExpanded?.channels === true,
			},
			collectionIcons: {
				lists: isCollectionIcon(raw.collectionIcons?.lists) ? raw.collectionIcons.lists : defaults.collectionIcons.lists,
				antennas: isCollectionIcon(raw.collectionIcons?.antennas) ? raw.collectionIcons.antennas : defaults.collectionIcons.antennas,
				channels: isCollectionIcon(raw.collectionIcons?.channels) ? raw.collectionIcons.channels : defaults.collectionIcons.channels,
			},
			composerShortcuts: safeComposerShortcuts(raw.composerShortcuts),
		};
	} catch {
		return defaults;
	}
}

export function writeHatacordingUiPreferences(accountId: string, value: HatacordingUiDevicePreferences): void {
	miLocalStorage.setItemAsJson(storageKey(accountId), value);
	if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
		// 同じ端末内で設定ページとHataSNSCordUIを同時に開いた場合も、
		// 別々の状態を持たず、保存後の検証済み値を即時共有する。
		window.dispatchEvent(new CustomEvent<HatacordingUiPreferencesChangeDetail>(HATACORDING_UI_PREFERENCES_CHANGE_EVENT, {
			detail: {
				accountId,
				preferences: readHatacordingUiPreferences(accountId),
			},
		}));
	}
}

export function setHatacordingUiEnabled(accountId: string, enabled: boolean): HatacordingUiDevicePreferences {
	const prefs = readHatacordingUiPreferences(accountId);
	const next = { ...prefs, enabled };
	writeHatacordingUiPreferences(accountId, next);
	return next;
}
