<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<!--
外部サーバー専用リアクションピッカー
- ピル型グラスモーフィズムデザイン（シンプルTLナビバーと統一）
- 外部サーバーのカスタム絵文字を emojis API から取得して表示
- Unicode絵文字も選択可能
- カテゴリ別表示・検索機能付き
-->

<template>
<MkModal
	ref="modal"
	v-slot="{ type, maxHeight }"
	:zPriority="'middle'"
	:preferType="'popup'"
	:transparentBg="true"
	:anchorElement="anchorElement"
	@click="close()"
	@closed="emit('closed')"
>
	<div :class="[$style.root, isDark ? $style.rootDark : $style.rootLight, { [$style.drawer]: type === 'drawer' }]" :style="{ maxHeight: maxHeight ? maxHeight + 'px' : '400px' }" @click.stop>
		<!-- 検索バー -->
		<div :class="$style.searchBox">
			<i class="ti ti-search" :class="$style.searchIcon"></i>
			<input
				ref="searchEl"
				v-model="searchQuery"
				:class="$style.searchInput"
				type="search"
				:placeholder="'絵文字を検索...'"
				autocomplete="off"
			/>
			<button v-if="searchQuery" :class="$style.searchClear" class="_button" @click="searchQuery = ''">
				<i class="ti ti-x"></i>
			</button>
		</div>

		<!-- タブ切り替え（ピル型） -->
		<div :class="$style.tabBar">
			<div :class="$style.tabPill">
				<button
					:class="[$style.tabBtn, { [$style.tabActive]: activeTab === 'recent' }]"
					@click="activeTab = 'recent'"
				>
					<i class="ti ti-clock"></i>
				</button>
				<button
					:class="[$style.tabBtn, { [$style.tabActive]: activeTab === 'favorites' }]"
					@click="activeTab = 'favorites'"
				>
					<i class="ti ti-star"></i>
				</button>
				<button
					:class="[$style.tabBtn, { [$style.tabActive]: activeTab === 'custom' }]"
					@click="activeTab = 'custom'"
				>
					<i class="ti ti-fish"></i>
				</button>
				<button
					:class="[$style.tabBtn, { [$style.tabActive]: activeTab === 'unicode' }]"
					@click="activeTab = 'unicode'"
				>
					<i class="ti ti-mood-smile"></i>
				</button>
			</div>
		</div>

		<!-- よく使うタブ -->
		<div v-if="activeTab === 'recent'" :class="$style.content">
			<div v-if="recentReactions.length === 0" :class="$style.empty">
				まだリアクション履歴がありません
			</div>
			<div v-else :class="$style.emojiGrid">
				<button
					v-for="emoji in recentReactions"
					:key="emoji"
					:class="$style.emojiBtn"
					class="_button"
					:title="emoji"
					@click="selectEmoji(emoji)"
					@contextmenu.prevent="addFavorite(emoji)"
				>
					<img v-if="emoji.startsWith(':')" :src="getCustomEmojiUrl(emoji)" :alt="emoji" :class="$style.emojiImg" loading="lazy"/>
					<span v-else :class="$style.unicodeEmoji">{{ emoji }}</span>
				</button>
			</div>
		</div>

		<!-- お気に入りタブ -->
		<div v-else-if="activeTab === 'favorites'" :class="$style.content">
			<div v-if="favoriteEmojis.length === 0" :class="$style.empty">
				お気に入りの絵文字がありません。<br/>絵文字を長押し/右クリックでお気に入りに追加できます。
			</div>
			<div v-else :class="$style.emojiGrid">
				<button
					v-for="emoji in favoriteEmojis"
					:key="emoji"
					:class="$style.emojiBtn"
					class="_button"
					:title="emoji"
					@click="selectEmoji(emoji)"
					@contextmenu.prevent="removeFavorite(emoji)"
				>
					<img v-if="emoji.startsWith(':')" :src="getCustomEmojiUrl(emoji)" :alt="emoji" :class="$style.emojiImg" loading="lazy"/>
					<span v-else :class="$style.unicodeEmoji">{{ emoji }}</span>
				</button>
			</div>
		</div>

		<!-- 外部絵文字タブ -->
		<div v-if="activeTab === 'custom'" :class="$style.content">
			<div v-if="loadingEmojis" :class="$style.loading">
				<MkLoading :inline="true"/>
			</div>

			<div v-else-if="filteredCustomEmojis.length === 0" :class="$style.empty">
				{{ searchQuery ? '見つかりません' : 'カスタム絵文字なし' }}
			</div>

			<template v-else>
				<!-- カテゴリ別表示（検索時はフラット） -->
				<template v-if="!searchQuery">
					<div v-for="cat in categorizedEmojis" :key="cat.name" :class="$style.category">
						<div :class="$style.categoryLabel">{{ cat.name || '未分類' }}</div>
						<div :class="$style.emojiGrid">
							<button
								v-for="emoji in cat.emojis"
								:key="emoji.name"
								:class="$style.emojiBtn"
								class="_button"
								:title="':' + emoji.name + ':'"
								@click="selectEmoji(':' + emoji.name + ':')"
							>
								<img :src="emoji.url" :alt="emoji.name" :class="$style.emojiImg" loading="lazy"/>
							</button>
						</div>
					</div>
				</template>
				<template v-else>
					<div :class="$style.emojiGrid">
						<button
							v-for="emoji in filteredCustomEmojis"
							:key="emoji.name"
							:class="$style.emojiBtn"
							class="_button"
							:title="':' + emoji.name + ':'"
							@click="selectEmoji(':' + emoji.name + ':')"
						>
							<img :src="emoji.url" :alt="emoji.name" :class="$style.emojiImg" loading="lazy"/>
						</button>
					</div>
				</template>
			</template>
		</div>

		<!-- Unicode絵文字タブ -->
		<div v-else-if="activeTab === 'unicode'" :class="$style.content">
			<template v-if="!searchQuery">
				<div v-for="group in unicodeEmojiGroups" :key="group.name" :class="$style.category">
					<div :class="$style.categoryLabel">{{ group.name }}</div>
					<div :class="$style.emojiGrid">
						<button
							v-for="emoji in group.emojis"
							:key="emoji"
							:class="$style.emojiBtn"
							class="_button"
							@click="selectEmoji(emoji)"
						>
							<span :class="$style.unicodeEmoji">{{ emoji }}</span>
						</button>
					</div>
				</div>
			</template>
			<template v-else>
				<div :class="$style.emojiGrid">
					<button
						v-for="emoji in allUnicodeEmojis"
						:key="emoji"
						:class="$style.emojiBtn"
						class="_button"
						@click="selectEmoji(emoji)"
					>
						<span :class="$style.unicodeEmoji">{{ emoji }}</span>
					</button>
				</div>
			</template>
		</div>
	</div>
</MkModal>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, useTemplateRef, nextTick } from 'vue';
import MkModal from '@/components/MkModal.vue';
import { getExternalCustomEmojis, getExternalFavoriteEmojis, setExternalFavoriteEmojis, addExternalFavoriteEmoji, removeExternalFavoriteEmoji, getExternalRecentReactions } from '@/utility/external-api.js';
import type { ExternalCustomEmoji } from '@/utility/external-api.js';
import * as os from '@/os.js';

const props = withDefaults(defineProps<{
	anchorElement?: HTMLElement | null;
}>(), {
	anchorElement: null,
});

const emit = defineEmits<{
	(ev: 'done', reaction: string): void;
	(ev: 'closed'): void;
}>();

const modal = useTemplateRef('modal');
const searchEl = useTemplateRef('searchEl');
const searchQuery = ref('');
const activeTab = ref<'recent' | 'favorites' | 'custom' | 'unicode'>('recent');
const customEmojis = ref<ExternalCustomEmoji[]>([]);
const loadingEmojis = ref(true);
const favoriteEmojis = ref<string[]>([]);
const recentReactions = ref<string[]>([]);

// ===== テーマ判定 =====
const isDark = ref(true);
function detectDark() {
	const cs = window.getComputedStyle(document.documentElement);
	let bg = cs.getPropertyValue('--MI_THEME-bg').trim() || cs.backgroundColor;
	let r = 0, g = 0, b = 0;
	const m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
	if (m) { r = +m[1]; g = +m[2]; b = +m[3]; }
	else if (bg.startsWith('#')) { const h = bg.replace('#',''); if (h.length>=6) { r=parseInt(h.substring(0,2),16); g=parseInt(h.substring(2,4),16); b=parseInt(h.substring(4,6),16); }}
	isDark.value = (r*299+g*587+b*114)/1000 < 128;
}

// ===== Unicode絵文字（コンパクト版） =====
const unicodeEmojiGroups = [
	{ name: '😀 顔', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😋','😛','😜','🤪','🤔','🫡','😏','😒','🙄','😬','😌','😔','😴','🤮','🥵','🥶','🥴','🤯','🥳','😎','🤓','😟','😮','😲','😳','🥺','🥹','😨','😰','😢','😭','😱','😤','😡','🤬','😈','💀','💩','🤡','👻','👽','🤖'] },
	{ name: '👋 手', emojis: ['👋','🤚','✋','👌','🤌','🤏','✌','🤞','🤟','🤘','🤙','👈','👉','👆','👇','👍','👎','✊','👊','👏','🙌','🫶','👐','🤝','🙏'] },
	{ name: '❤ 心', emojis: ['❤','🧡','💛','💚','💙','💜','🖤','🤍','💔','❤‍🔥','💕','💞','💓','💗','💖','💘','💝','⭐','✨','⚡','🔥','💥','🎉','💯','💢','💫','💦','👀','🌈','☀','🌙'] },
	{ name: '🐱 動物', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦆','🦉','🐝','🦋','🐌','🐞','🐙','🦑','🐬','🐳','🦈','🐊','🐘','🦒','🐇','🦔'] },
	{ name: '🍎 食べ物', emojis: ['🍎','🍊','🍋','🍌','🍉','🍇','🍓','🍑','🍍','🍅','🥑','🥦','🍞','🧀','🍳','🍔','🍟','🍕','🌮','🍝','🍜','🍣','🍱','🍤','🍙','🍡','🍧','🍰','🎂','🍮','🍩','🍪','🍫','🍿','☕','🍵','🧃','🍺','🍷'] },
	{ name: '💻 物', emojis: ['📱','💻','🖥','⌨','🎮','🎧','📷','🔋','💡','🔧','🔨','💊','🧸','🎁','🎈','✉','📌','✂','📝','🔍','🔒'] },
];

const allUnicodeEmojis = computed(() => unicodeEmojiGroups.flatMap(g => g.emojis));

// ===== フィルタリング =====
const filteredCustomEmojis = computed(() => {
	if (!searchQuery.value) return customEmojis.value;
	const q = searchQuery.value.toLowerCase();
	return customEmojis.value.filter(e =>
		e.name.toLowerCase().includes(q) ||
		(e.aliases && e.aliases.some(a => a.toLowerCase().includes(q))) ||
		(e.category && e.category.toLowerCase().includes(q)),
	);
});

const categorizedEmojis = computed(() => {
	const catMap = new Map<string, ExternalCustomEmoji[]>();
	for (const emoji of customEmojis.value) {
		const cat = emoji.category || '';
		if (!catMap.has(cat)) catMap.set(cat, []);
		catMap.get(cat)!.push(emoji);
	}
	return Array.from(catMap.entries())
		.sort((a, b) => {
			if (!a[0] && b[0]) return 1;
			if (a[0] && !b[0]) return -1;
			return a[0].localeCompare(b[0]);
		})
		.map(([name, emojis]) => ({ name, emojis }));
});

// ===== お気に入り管理 =====
function addFavorite(emoji: string) {
	addExternalFavoriteEmoji(emoji);
	favoriteEmojis.value = getExternalFavoriteEmojis();
	os.toast('⭐ お気に入りに追加しました');
}

function removeFavorite(emoji: string) {
	removeExternalFavoriteEmoji(emoji);
	favoriteEmojis.value = getExternalFavoriteEmojis();
	os.toast('お気に入りから削除しました');
}

// ===== カスタム絵文字URL取得（お気に入り・最近使った用） =====
function getCustomEmojiUrl(reaction: string): string {
	const match = reaction.match(/^:([^:]+):$/);
	if (!match) return '';
	const name = match[1];
	const emoji = customEmojis.value.find(e => e.name === name);
	return emoji?.url ?? '';
}

// ===== アクション =====
function selectEmoji(reaction: string) {
	emit('done', reaction);
	modal.value?.close();
}

function close() {
	modal.value?.close();
}

// ===== 初期化 =====
onMounted(async () => {
	detectDark();

	// お気に入り・履歴を読み込み
	favoriteEmojis.value = getExternalFavoriteEmojis();
	recentReactions.value = getExternalRecentReactions();
	
	// デフォルトタブ: よく使う → お気に入り → 外部絵文字
	if (recentReactions.value.length > 0) {
		activeTab.value = 'recent';
	} else if (favoriteEmojis.value.length > 0) {
		activeTab.value = 'favorites';
	} else {
		activeTab.value = 'custom';
	}

	// 初回表示時のヒント
	const hintShown = localStorage.getItem('externalReactionPickerHintShown');
	if (!hintShown) {
		localStorage.setItem('externalReactionPickerHintShown', 'true');
		os.toast('💡 絵文字を長押し/右クリックでお気に入りに追加・削除できます');
	}

	loadingEmojis.value = true;
	try {
		customEmojis.value = await getExternalCustomEmojis();
	} catch (err) {
		console.error('[ExternalReactionPicker] Failed to load emojis:', err);
	} finally {
		loadingEmojis.value = false;
	}

	await nextTick();
	searchEl.value?.focus();
});
</script>

<style lang="scss" module>
.root {
	width: 360px;
	max-width: 95vw;
	display: flex;
	flex-direction: column;
	border-radius: 20px;
	overflow: hidden;
	backdrop-filter: blur(24px) saturate(1.4);
	-webkit-backdrop-filter: blur(24px) saturate(1.4);
}

.rootDark {
	background: rgba(30, 30, 30, .82);
	box-shadow: 0 8px 40px rgba(0, 0, 0, .25), 0 0 0 .5px rgba(255, 255, 255, .08) inset;
	color: rgba(255, 255, 255, .85);
}

.rootLight {
	background: rgba(245, 245, 245, .82);
	box-shadow: 0 8px 40px rgba(0, 0, 0, .08), 0 0 0 .5px rgba(0, 0, 0, .06) inset;
	color: rgba(0, 0, 0, .8);
}

.drawer {
	width: 100%;
	max-width: 100%;
	border-radius: 24px 24px 0 0;
}

.searchBox {
	display: flex;
	align-items: center;
	margin: 12px 12px 4px;
	padding: 8px 12px;
	border-radius: 9999px;
	flex-shrink: 0;
}

.rootDark .searchBox {
	background: rgba(255, 255, 255, .06);
}

.rootLight .searchBox {
	background: rgba(0, 0, 0, .04);
}

.searchIcon {
	opacity: 0.4;
	margin-right: 8px;
	font-size: 0.85em;
}

.searchInput {
	flex: 1;
	border: none;
	background: transparent;
	color: inherit;
	font-size: 0.85em;
	outline: none;

	&::placeholder {
		color: inherit;
		opacity: 0.35;
	}
}

.searchClear {
	padding: 2px 4px;
	opacity: 0.4;
	color: inherit;
	&:hover { opacity: 1; }
}

// ===== タブ（ピル型、ナビバーと同じデザイン） =====
.tabBar {
	display: flex;
	justify-content: center;
	padding: 4px 12px 8px;
	flex-shrink: 0;
}

.tabPill {
	display: flex;
	align-items: center;
	gap: 2px;
	padding: 3px 4px;
	border-radius: 9999px;
}

.rootDark .tabPill {
	background: rgba(255, 255, 255, .06);
}

.rootLight .tabPill {
	background: rgba(0, 0, 0, .04);
}

.tabBtn {
	width: 38px;
	height: 38px;
	border-radius: 50%;
	background: transparent;
	border: none;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	transition: all .2s;
	color: inherit;
	opacity: .4;
}

.tabActive {
	opacity: 1;
	color: var(--MI_THEME-accent);
}

.rootDark .tabActive {
	background: rgba(255, 255, 255, .1);
}

.rootLight .tabActive {
	background: rgba(0, 0, 0, .06);
}

.content {
	flex: 1;
	overflow-y: auto;
	padding: 0 12px 12px;
	overscroll-behavior: contain;
}

.loading {
	padding: 24px;
	text-align: center;
}

.empty {
	padding: 24px;
	text-align: center;
	opacity: 0.4;
	font-size: 0.85em;
}

.category {
	margin-bottom: 8px;
}

.categoryLabel {
	font-size: 0.72em;
	font-weight: bold;
	opacity: 0.4;
	padding: 3px 4px 4px;
	position: sticky;
	top: 0;
	z-index: 1;
}

.rootDark .categoryLabel {
	background: rgba(30, 30, 30, .9);
}

.rootLight .categoryLabel {
	background: rgba(245, 245, 245, .9);
}

.emojiGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(42px, 1fr));
	gap: 2px;
}

.emojiBtn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 42px;
	height: 42px;
	border-radius: 10px;
	cursor: pointer;
	transition: background 0.15s, transform 0.1s;
	color: inherit;

	&:hover {
		transform: scale(1.1);
	}

	&:active {
		transform: scale(0.9);
	}
}

.rootDark .emojiBtn:hover {
	background: rgba(255, 255, 255, .08);
}

.rootLight .emojiBtn:hover {
	background: rgba(0, 0, 0, .05);
}

.emojiImg {
	width: 30px;
	height: 30px;
	object-fit: contain;
}

.unicodeEmoji {
	font-size: 1.4em;
	line-height: 1;
}
</style>
