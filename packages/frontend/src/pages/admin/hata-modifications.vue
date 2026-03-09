<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 900px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<div class="_gaps_m">
			<!-- ヘッダー情報 -->
			<div :class="$style.header">
				<div :class="$style.headerIcon">
					<i class="ti ti-git-compare"></i>
				</div>
				<div :class="$style.headerInfo">
					<h2 :class="$style.headerTitle">旗鯖カスタム改変一覧</h2>
					<p :class="$style.headerMeta">
						ベース: <strong>{{ modifications.basedOn }}</strong> | 
						最終更新: <strong>{{ modifications.lastUpdated }}</strong> |
						改変数: <strong>{{ modifications.modifications.length }}</strong>件
					</p>
				</div>
			</div>

			<!-- カテゴリフィルター -->
			<div :class="$style.filters">
				<button 
					v-for="(label, key) in modifications.categories" 
					:key="key"
					:class="[$style.filterBtn, { [$style.active]: selectedCategory === key || selectedCategory === 'all' }]"
					@click="toggleCategory(key)"
				>
					<i :class="getCategoryIcon(key)"></i>
					{{ label }}
					<span :class="$style.count">{{ getCategoryCount(key) }}</span>
				</button>
				<button 
					:class="[$style.filterBtn, { [$style.active]: selectedCategory === 'all' }]"
					@click="selectedCategory = 'all'"
				>
					<i class="ti ti-list"></i>
					すべて
					<span :class="$style.count">{{ modifications.modifications.length }}</span>
				</button>
			</div>

			<!-- 改変リスト -->
			<div class="_gaps_s">
				<div 
					v-for="mod in filteredModifications" 
					:key="mod.id" 
					:class="$style.modCard"
				>
					<div :class="$style.modHeader" @click="toggleExpand(mod.id)">
						<div :class="$style.modTitle">
							<span :class="[$style.categoryBadge, $style[mod.category]]">
								{{ modifications.categories[mod.category] }}
							</span>
							<h3>{{ mod.title }}</h3>
						</div>
						<div :class="$style.modMeta">
							<span :class="$style.fileCount">
								<i class="ti ti-file-code"></i>
								{{ mod.files.length }}ファイル
							</span>
							<i :class="['ti', expanded[mod.id] ? 'ti-chevron-up' : 'ti-chevron-down']"></i>
						</div>
					</div>

					<div :class="$style.modDescription">
						{{ mod.description }}
					</div>

					<Transition name="expand">
						<div v-if="expanded[mod.id]" :class="$style.modFiles">
							<div 
								v-for="file in mod.files" 
								:key="file.path" 
								:class="$style.fileItem"
							>
								<div :class="$style.fileHeader">
									<span :class="[$style.fileType, $style[file.type]]">
										{{ file.type === 'added' ? '追加' : file.type === 'modified' ? '変更' : '削除' }}
									</span>
									<code :class="$style.filePath">{{ file.path }}</code>
								</div>
								<div :class="$style.fileDetails">
									<span :class="$style.fileLines">
										<i class="ti ti-code"></i>
										行: {{ file.lines }}
									</span>
									<span :class="$style.fileSummary">{{ file.summary }}</span>
								</div>
							</div>
						</div>
					</Transition>
				</div>
			</div>

			<!-- 統計 -->
			<div :class="$style.stats">
				<div :class="$style.statItem">
					<div :class="$style.statValue">{{ getTotalFiles('added') }}</div>
					<div :class="$style.statLabel">追加ファイル</div>
				</div>
				<div :class="$style.statItem">
					<div :class="$style.statValue">{{ getTotalFiles('modified') }}</div>
					<div :class="$style.statLabel">変更ファイル</div>
				</div>
				<div :class="$style.statItem">
					<div :class="$style.statValue">{{ getUniqueFiles() }}</div>
					<div :class="$style.statLabel">影響ファイル総数</div>
				</div>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, ref, reactive } from 'vue';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { modificationsData } from '@/hata-modifications.js';

const modifications = modificationsData;

type ModificationCategory = 'feature' | 'ui' | 'fix' | 'backend';

const selectedCategory = ref<ModificationCategory | 'all'>('all');
const expanded = reactive<Record<string, boolean>>({});

const filteredModifications = computed(() => {
	if (selectedCategory.value === 'all') {
		return modifications.modifications;
	}
	return modifications.modifications.filter(mod => mod.category === selectedCategory.value);
});

function toggleCategory(category: ModificationCategory) {
	if (selectedCategory.value === category) {
		selectedCategory.value = 'all';
	} else {
		selectedCategory.value = category;
	}
}

function toggleExpand(id: string) {
	expanded[id] = !expanded[id];
}

function getCategoryIcon(category: string): string {
	switch (category) {
		case 'feature': return 'ti ti-sparkles';
		case 'ui': return 'ti ti-palette';
		case 'fix': return 'ti ti-bug';
		case 'backend': return 'ti ti-server';
		default: return 'ti ti-code';
	}
}

function getCategoryCount(category: string): number {
	return modifications.modifications.filter(mod => mod.category === category).length;
}

function getTotalFiles(type: string): number {
	let count = 0;
	for (const mod of modifications.modifications) {
		count += mod.files.filter(f => f.type === type).length;
	}
	return count;
}

function getUniqueFiles(): number {
	const paths = new Set<string>();
	for (const mod of modifications.modifications) {
		for (const file of mod.files) {
			paths.add(file.path);
		}
	}
	return paths.size;
}

const headerActions = computed(() => []);
const headerTabs = computed(() => []);

definePage(() => ({
	title: '旗鯖改変一覧',
	icon: 'ti ti-git-compare',
}));
</script>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 20px;
	background: var(--MI_THEME-panel);
	border-radius: var(--MI-radius);
}

.headerIcon {
	width: 56px;
	height: 56px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, var(--MI_THEME-accent), color-mix(in srgb, var(--MI_THEME-accent) 70%, #000));
	border-radius: 14px;
	font-size: 24px;
	color: #fff;
}

.headerInfo {
	flex: 1;
}

.headerTitle {
	margin: 0 0 4px 0;
	font-size: 18px;
	font-weight: 700;
}

.headerMeta {
	margin: 0;
	font-size: 13px;
	opacity: 0.7;

	strong {
		color: var(--MI_THEME-accent);
	}
}

.filters {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.filterBtn {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 8px 14px;
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 20px;
	font-size: 13px;
	cursor: pointer;
	transition: all 0.2s;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}

	&.active {
		background: var(--MI_THEME-accent);
		border-color: var(--MI_THEME-accent);
		color: #fff;
	}
}

.count {
	padding: 2px 6px;
	background: rgba(0, 0, 0, 0.1);
	border-radius: 10px;
	font-size: 11px;
	font-weight: 600;
}

.modCard {
	background: var(--MI_THEME-panel);
	border-radius: var(--MI-radius);
	overflow: hidden;
}

.modHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px;
	cursor: pointer;
	transition: background 0.2s;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.modTitle {
	display: flex;
	align-items: center;
	gap: 12px;

	h3 {
		margin: 0;
		font-size: 15px;
		font-weight: 600;
	}
}

.categoryBadge {
	padding: 4px 10px;
	border-radius: 12px;
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;

	&.feature {
		background: linear-gradient(135deg, rgba(52, 152, 219, 0.2), rgba(155, 89, 182, 0.2));
		color: #9b59b6;
	}

	&.ui {
		background: linear-gradient(135deg, rgba(46, 204, 113, 0.2), rgba(39, 174, 96, 0.2));
		color: #27ae60;
	}

	&.fix {
		background: linear-gradient(135deg, rgba(231, 76, 60, 0.2), rgba(192, 57, 43, 0.2));
		color: #c0392b;
	}

	&.backend {
		background: linear-gradient(135deg, rgba(243, 156, 18, 0.2), rgba(211, 84, 0, 0.2));
		color: #d35400;
	}
}

.modMeta {
	display: flex;
	align-items: center;
	gap: 12px;
	color: var(--MI_THEME-fg);
	opacity: 0.6;
}

.fileCount {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 13px;
}

.modDescription {
	padding: 0 16px 16px;
	font-size: 13px;
	opacity: 0.8;
	line-height: 1.6;
}

.modFiles {
	border-top: 1px solid var(--MI_THEME-divider);
	padding: 12px;
	background: var(--MI_THEME-bg);
}

.fileItem {
	padding: 10px 12px;
	background: var(--MI_THEME-panel);
	border-radius: 8px;
	margin-bottom: 8px;

	&:last-child {
		margin-bottom: 0;
	}
}

.fileHeader {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 6px;
}

.fileType {
	padding: 2px 8px;
	border-radius: 6px;
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;

	&.added {
		background: rgba(46, 204, 113, 0.2);
		color: #27ae60;
	}

	&.modified {
		background: rgba(52, 152, 219, 0.2);
		color: #3498db;
	}

	&.deleted {
		background: rgba(231, 76, 60, 0.2);
		color: #e74c3c;
	}
}

.filePath {
	font-size: 12px;
	color: var(--MI_THEME-fg);
	word-break: break-all;
}

.fileDetails {
	display: flex;
	align-items: center;
	gap: 16px;
	font-size: 12px;
	opacity: 0.7;
}

.fileLines {
	display: flex;
	align-items: center;
	gap: 4px;
	color: var(--MI_THEME-accent);
	font-family: monospace;
}

.fileSummary {
	flex: 1;
}

.stats {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 12px;
}

.statItem {
	padding: 20px;
	background: var(--MI_THEME-panel);
	border-radius: var(--MI-radius);
	text-align: center;
}

.statValue {
	font-size: 32px;
	font-weight: 700;
	color: var(--MI_THEME-accent);
}

.statLabel {
	font-size: 13px;
	opacity: 0.7;
	margin-top: 4px;
}

/* Transition */
:global(.expand-enter-active),
:global(.expand-leave-active) {
	transition: all 0.3s ease;
	overflow: hidden;
}

:global(.expand-enter-from),
:global(.expand-leave-to) {
	opacity: 0;
	max-height: 0;
}

:global(.expand-enter-to),
:global(.expand-leave-from) {
	max-height: 1000px;
}
</style>
