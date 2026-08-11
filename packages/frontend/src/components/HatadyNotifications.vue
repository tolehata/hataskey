<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady 1h): 通知ページ(モーダル)。
  リアクション/コメント/フォロー/継続・達成 をフィルタ + 日付グループで表示する。
  ※ フォロー/継続・達成 は将来用(現状はリアクション/コメント通知を生成)。
  ※ hataskey 標準通知への統合(1h 後半)は別途。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="620"
	:initialHeight="680"
	:canResize="true"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-bell"></i> {{ copy.title }}</template>

	<div class="hatady-scope" :data-hatady-theme="theme" :class="$style.body">
		<!-- フィルタ -->
		<div :class="$style.filters">
			<button v-for="f in filters" :key="f.key" :class="[$style.filter, activeFilter === f.key && $style.filterOn]" @click="activeFilter = f.key">
				<i v-if="f.icon" :class="['ti', f.icon]"></i> {{ f.label }}
			</button>
			<button :class="$style.readAll" @click="markAllRead"><i class="ti ti-checks"></i> {{ copy.markAllRead }}</button>
		</div>

		<div :class="$style.list">
			<div v-if="loading" :class="$style.loading">{{ copy.loading }}</div>
			<div v-else-if="filtered.length === 0" :class="$style.empty">
				<i class="ti ti-bell-off" :class="$style.emptyIcon"></i>
				<div>{{ copy.empty }}</div>
			</div>
			<template v-else>
				<template v-for="g in groups" :key="g.key">
					<div v-if="g.items.length" :class="$style.groupHead">{{ g.label }}</div>
					<div
						v-for="n in g.items" :key="n.id"
						:class="[$style.notif, !n.isRead && $style.unread, n.logId && $style.clickable]"
						@click="onClickNotif(n)"
					>
						<span v-if="!n.isRead" :class="$style.dot"></span>
						<!-- アイコン -->
						<span v-if="n.type === 'milestone'" :class="$style.milestoneIcon"><i class="ti ti-flame-filled"></i></span>
						<span v-else-if="n.type === 'goalDone'" :class="$style.goalIcon"><i class="ti ti-target-arrow"></i></span>
						<span v-else :class="$style.avatarWrap">
							<MkAvatar :class="$style.avatar" :user="n.user"/>
							<span v-if="n.type === 'reaction'" :class="$style.badgeReaction"><MkReactionIcon :reaction="String(n.reaction || '👍')"/></span>
							<span v-else-if="n.type === 'comment'" :class="$style.badgeComment"><i class="ti ti-message-circle-2"></i></span>
							<span v-else-if="n.type === 'follow'" :class="$style.badgeFollow"><i class="ti ti-user-plus"></i></span>
						</span>
						<!-- 本文 -->
						<div :class="$style.content">
							<div :class="$style.text">
								<template v-if="n.type === 'milestone'"><b :class="$style.streakVal">{{ copyx.daysStreak({ count: String(n.value) }) }}</b> {{ copy.milestoneText }}</template>
								<template v-else-if="n.type === 'goalDone'"><b :class="$style.who">{{ copy.goalDoneTitle }}</b> {{ copy.goalDoneText }}</template>
								<template v-else>
									<b :class="$style.who"><MkUserName :user="n.user"/></b> {{ verb(n) }}
									<MkReactionIcon v-if="n.type === 'reaction'" :class="$style.inlineReaction" :reaction="String(n.reaction || '👍')"/>
								</template>
							</div>
							<div v-if="n.type === 'reaction' && n.logTitle" :class="$style.snippet">{{ n.logTitle }}</div>
							<div v-else-if="n.type === 'comment' && n.commentText" :class="$style.bubble">{{ n.commentText }}</div>
						</div>
						<div :class="$style.right">
							<span :class="$style.time">{{ fmtWhen(n.createdAt) }}</span>
							<button
								v-if="n.type === 'follow' && n.user"
								:class="[$style.followBtn, n.isFollowingBack && $style.followingBtn]"
								:disabled="n.busy"
								@click.stop="toggleFollowBack(n)"
							>{{ n.isFollowingBack ? copy.followingBack : copy.followBack }}</button>
						</div>
					</div>
				</template>
			</template>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import MkReactionIcon from '@/components/MkReactionIcon.vue';
import { versatileLang } from '@@/js/intl-const.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { hatadyTheme } from '@/utility/hatady-prefs.js';

const emit = defineEmits<{ (ev: 'read'): void; (ev: 'openLog', logId: string): void; (ev: 'openProfile', userId: string): void; (ev: 'closed'): void }>();
const dialog = ref<any>(null);
const theme = hatadyTheme;
const copy = i18n.ts._hata._hatady._notifications;
const copyx = i18n.tsx._hata._hatady._notifications;
const shortDateFormatter = new Intl.DateTimeFormat(versatileLang, { month: 'short', day: 'numeric' });

const items = ref<any[]>([]);
const loading = ref(true);
const activeFilter = ref<'all' | 'reaction' | 'comment' | 'follow' | 'milestone'>('all');

const filters = [
	{ key: 'all' as const, label: copy.filterAll, icon: '' },
	{ key: 'reaction' as const, label: copy.filterReaction, icon: 'ti-heart' },
	{ key: 'comment' as const, label: copy.filterComment, icon: 'ti-message-circle-2' },
	{ key: 'follow' as const, label: copy.filterFollow, icon: 'ti-user-plus' },
	{ key: 'milestone' as const, label: copy.filterMilestone, icon: 'ti-flame' },
];
function verb(n: any): string {
	if (n.type === 'reaction') return copy.verbReaction;
	if (n.type === 'comment') return copy.verbComment;
	if (n.type === 'follow') return copy.verbFollow;
	return '';
}
function fmtWhen(iso: string): string {
	const d = new Date(iso);
	const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
	if (diffMin < 1) return copy.now;
	if (diffMin < 60) return copyx.minutesAgo({ count: diffMin.toString() });
	const diffH = Math.floor(diffMin / 60);
	if (diffH < 24) return copyx.hoursAgo({ count: diffH.toString() });
	const diffD = Math.floor(diffH / 24);
	if (diffD < 7) return copyx.daysAgo({ count: diffD.toString() });
	return shortDateFormatter.format(d);
}

const filtered = computed(() => activeFilter.value === 'all' ? items.value : items.value.filter(n => n.type === activeFilter.value));

// 今日/昨日/それ以前 でグループ化。
const groups = computed(() => {
	const today = new Date(); today.setHours(0, 0, 0, 0);
	const buckets = { today: [] as any[], yesterday: [] as any[], earlier: [] as any[] };
	for (const n of filtered.value) {
		const d = new Date(n.createdAt); d.setHours(0, 0, 0, 0);
		const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
		if (diff <= 0) buckets.today.push(n);
		else if (diff === 1) buckets.yesterday.push(n);
		else buckets.earlier.push(n);
	}
	return [
		{ key: 'today', label: copy.today, items: buckets.today },
		{ key: 'yesterday', label: copy.yesterday, items: buckets.yesterday },
		{ key: 'earlier', label: copy.earlier, items: buckets.earlier },
	];
});

async function reload() {
	loading.value = true;
	try {
		items.value = await misskeyApi('hata/hatady/notifications', { limit: 60 }).catch(() => []);
	} finally {
		loading.value = false;
	}
	// 開いた時点で既読にする(バッジを消す)。どれが新着だったかは今回の表示では未読ドットで残す。
	if (items.value.some(n => !n.isRead)) {
		await misskeyApi('hata/hatady/notifications/mark-all-read', {}).catch(() => {});
		emit('read');
	}
}

async function markAllRead() {
	await misskeyApi('hata/hatady/notifications/mark-all-read', {}).catch(() => {});
	for (const n of items.value) n.isRead = true;
	emit('read');
}

function onClickNotif(n: any) {
	if (n.logId) emit('openLog', n.logId);
	else if (n.type === 'follow' && n.user) emit('openProfile', n.user.id);
}

// フォロー通知からその場でフォロー返し / 解除。楽観的に更新し、状態はサーバーにも保存される。
async function toggleFollowBack(n: any) {
	if (!n.user) return;
	const uname = n.user.name || n.user.username;
	const { canceled } = await os.confirm({
		type: n.isFollowingBack ? 'warning' : 'question',
		text: n.isFollowingBack ? copyx.unfollowConfirm({ name: uname }) : copyx.followConfirm({ name: uname }),
	});
	if (canceled) return;
	n.busy = true;
	try {
		if (n.isFollowingBack) {
			n.isFollowingBack = false;
			await misskeyApi('hata/hatady/following/delete', { userId: n.user.id }).catch(() => {});
		} else {
			n.isFollowingBack = true;
			await misskeyApi('hata/hatady/following/create', { userId: n.user.id }).catch(() => {});
		}
	} finally {
		n.busy = false;
	}
}

onMounted(reload);
</script>

<style lang="scss" module>
.body {
	background: var(--hy-bg);
	color: var(--hy-body);
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
	min-height: 100%;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
}
.filters {
	display: flex; gap: 7px; padding: 12px 16px; flex-wrap: wrap;
	background: var(--hy-surface-2); border-bottom: 1px solid var(--hy-border);
}
.filter {
	display: inline-flex; align-items: center; gap: 4px;
	padding: 5px 13px; border-radius: 999px;
	background: var(--hy-surface); border: 1px solid var(--hy-border); color: var(--hy-body);
	font-size: 12px; font-weight: 600; cursor: pointer; transition: all .12s;
}
.filter:hover { border-color: var(--hy-accent); }
.filterOn { background: var(--hy-accent); color: #fff; border-color: transparent; font-weight: 700; }
.readAll {
	margin-left: auto; display: inline-flex; align-items: center; gap: 5px;
	background: none; border: none; color: var(--hy-body); font-size: 12px; cursor: pointer;
}
.readAll:hover { color: var(--hy-accent); }

.list { flex: 1; overflow-y: auto; padding: 6px 12px 14px; }
.loading { opacity: .6; padding: 30px 0; text-align: center; }
.empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 20px; text-align: center; color: var(--hy-muted); }
.emptyIcon { font-size: 2.2rem; color: var(--hy-accent); opacity: .5; }
.groupHead { font-size: 11px; font-weight: 700; color: var(--hy-muted); padding: 10px 8px 6px; }

.notif {
	display: flex; gap: 12px; align-items: flex-start; position: relative;
	background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 11px;
	padding: 12px 14px; margin-bottom: 8px;
}
.clickable { cursor: pointer; transition: border-color .12s; }
.clickable:hover { border-color: var(--hy-accent); }
.unread { background: color-mix(in srgb, var(--hy-accent) 7%, var(--hy-surface)); }
.dot { position: absolute; left: 5px; top: 50%; transform: translateY(-50%); width: 6px; height: 6px; border-radius: 999px; background: var(--hy-accent); }

.avatarWrap { position: relative; flex-shrink: 0; width: 36px; height: 36px; }
.avatar { width: 36px; height: 36px; }
.badgeReaction, .badgeComment, .badgeFollow {
	position: absolute; bottom: -5px; right: -5px; z-index: 3;
	width: 20px; height: 20px; border-radius: 999px;
	border: 2px solid var(--hy-surface);
	display: inline-flex; align-items: center; justify-content: center; font-size: 11px;
	overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.25);
}
.badgeReaction { background: var(--hy-chip-bg); font-size: 12px; }
/* 横長のカスタム絵文字がバッジからはみ出て「バー」に見えるのを防ぐ(枠に収める)。 */
.badgeReaction :deep(img) { max-width: 15px; max-height: 15px; height: auto; width: auto; object-fit: contain; }
.inlineReaction { display: inline-flex; align-items: center; vertical-align: -0.25em; margin-left: 4px; }
.inlineReaction :deep(img) { height: 1.3em; max-height: 1.3em; width: auto; max-width: 6em; object-fit: contain; }
.badgeComment { background: #e3ebf3; color: #45688f; }
.badgeFollow { background: #dcecd5; color: #4e7d4a; }
.milestoneIcon {
	flex-shrink: 0; width: 36px; height: 36px; border-radius: 999px;
	background: linear-gradient(135deg, #e79b5e, #d9824a); color: #fff;
	display: inline-flex; align-items: center; justify-content: center; font-size: 19px;
}
.goalIcon {
	flex-shrink: 0; width: 36px; height: 36px; border-radius: 999px;
	background: linear-gradient(135deg, #8a7ab3, #6b5a94); color: #fff;
	display: inline-flex; align-items: center; justify-content: center; font-size: 19px;
}

.content { flex: 1; min-width: 0; }
.text { font-size: 13px; line-height: 1.6; color: var(--hy-ink); }
.who { font-family: var(--hy-heading); }
.streakVal { font-family: var(--hy-heading); color: var(--hy-accent-ink); }
.snippet { font-size: 12px; color: var(--hy-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bubble { font-size: 12px; color: var(--hy-body); margin-top: 4px; background: var(--hy-surface-2); border-radius: 7px; padding: 5px 9px; display: inline-block; max-width: 100%; word-break: break-word; }
.right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
.time { font-size: 11px; color: var(--hy-muted); white-space: nowrap; flex-shrink: 0; }
.followBtn {
	display: inline-flex; align-items: center; gap: 4px;
	border-radius: 999px; padding: 5px 12px; font-size: 11.5px; font-weight: 700;
	font-family: var(--hy-heading); cursor: pointer; white-space: nowrap;
	border: 1.5px solid var(--hy-accent); background: var(--hy-accent); color: #fff;
}
.followingBtn { background: transparent; color: var(--hy-accent-ink); }
.followBtn:disabled { opacity: .6; }
</style>
