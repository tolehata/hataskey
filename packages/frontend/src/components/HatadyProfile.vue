<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady 1c): プロフィール・本棚(モーダル)。
  バナー(アバター/名前/自己紹介/統計) + 得意/苦手/興味 + 本棚。
  フォローは Hatady 内で完結(要件①・hataskey 本体と非連動)。自分のプロフィールでは編集ボタン。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="880"
	:initialHeight="720"
	:canResize="true"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-user"></i> {{ copy.title }}</template>

	<div class="hatady-scope" :data-hatady-theme="theme" :class="$style.body">
		<div v-if="loading" :class="$style.loading">{{ copy.loading }}</div>
		<template v-else-if="profile">
			<!-- バナー -->
			<div :class="$style.banner" :style="{ background: hyBannerGradient(bannerColor) }">
				<div :class="$style.bannerTop">
					<MkAvatar :class="$style.avatar" :user="profile.user"/>
					<div :class="$style.identity">
						<div :class="$style.nameRow"><MkUserName :class="$style.name" :user="profile.user"/></div>
						<div :class="$style.bio">@{{ profile.user?.username }}<template v-if="profile.user?.description"> · {{ profile.user.description }}</template></div>
					</div>
					<template v-if="profile.isMe">
						<button :class="$style.colorBtn" :title="copy.changeColor" @click="openColorPicker"><i class="ti ti-palette"></i></button>
						<button :class="$style.editBtn" @click="editProfile"><i class="ti ti-pencil"></i> {{ copy.edit }}</button>
					</template>
					<button v-else :class="[$style.followBtn, following && $style.followingBtn]" :disabled="followBusy" @click="toggleFollow">
						<i :class="following ? 'ti ti-check' : 'ti ti-user-plus'"></i> {{ following ? copy.following : copy.follow }}
					</button>
				</div>
				<!-- カラーピッカー(自分のみ) -->
				<div v-if="colorPickerOpen" :class="$style.colorPicker">
					<button
						v-for="p in HY_BANNER_PRESETS" :key="p.key"
						:class="[$style.swatch, (bannerColor || 'orange') === p.key && $style.swatchOn]"
						:style="{ background: `linear-gradient(120deg, ${p.from}, ${p.to})` }"
						@click="pickColor(p.key)"
					></button>
				</div>
				<div :class="$style.stats">
					<div :class="$style.stat"><span :class="$style.statNum">{{ Math.floor(profile.totalMinutes / 60) }}<span :class="$style.statUnit">{{ copy.hours }}</span></span><div :class="$style.statLbl">{{ copy.totalTime }}</div></div>
					<div :class="$style.stat"><span :class="$style.statNum">{{ profile.streakDays }}<span :class="$style.statUnit">{{ copy.days }}</span></span><div :class="$style.statLbl">{{ copy.streak }}</div></div>
					<div :class="$style.stat"><span :class="$style.statNum">{{ copyx.bookCount({ count: profile.bookCount.toString() }) }}</span><div :class="$style.statLbl">{{ copy.shelfBooks }}</div></div>
					<div :class="$style.stat"><span :class="$style.statNum">{{ profile.logCount }}</span><div :class="$style.statLbl">{{ copy.recordedLogs }}</div></div>
					<button :class="[$style.stat, $style.statBtn]" @click="openUserList('followers')"><span :class="$style.statNum">{{ profile.followersCount }}</span><div :class="$style.statLbl">{{ copy.followers }}</div></button>
					<button :class="[$style.stat, $style.statBtn]" @click="openUserList('following')"><span :class="$style.statNum">{{ profile.followingCount }}</span><div :class="$style.statLbl">{{ copy.followingCount }}</div></button>
				</div>
			</div>

			<div :class="$style.content">
				<!-- 得意/苦手/興味 -->
				<div :class="$style.fields">
					<div :class="[$style.fieldCard, $style.fieldStrength]">
						<div :class="$style.fieldTitle"><i class="ti ti-star-filled"></i> {{ hyTagLabel('strength') }}</div>
						<div v-if="profile.fields.strength.length" :class="$style.chips"><span v-for="s in profile.fields.strength" :key="s" :class="[$style.chip, $style.chipStrength]">{{ s }}</span></div>
						<div v-else :class="$style.fieldEmpty">—</div>
					</div>
					<div :class="[$style.fieldCard, $style.fieldWeak]">
						<div :class="$style.fieldTitle"><i class="ti ti-flame"></i> {{ hyTagLabel('weak') }}</div>
						<div v-if="profile.fields.weak.length" :class="$style.chips"><span v-for="s in profile.fields.weak" :key="s" :class="[$style.chip, $style.chipWeak]">{{ s }}</span></div>
						<div v-else :class="$style.fieldEmpty">—</div>
					</div>
					<div :class="[$style.fieldCard, $style.fieldInterest]">
						<div :class="$style.fieldTitle"><i class="ti ti-bulb"></i> {{ hyTagLabel('interest') }}</div>
						<div v-if="profile.fields.interest.length" :class="$style.chips"><span v-for="s in profile.fields.interest" :key="s" :class="[$style.chip, $style.chipInterest]">{{ s }}</span></div>
						<div v-else :class="$style.fieldEmpty">—</div>
					</div>
				</div>

				<!-- 公開範囲を満たす映画・ゲーム作品 -->
				<template v-if="recommendedMedia.length">
					<div :class="$style.recHead"><i class="ti ti-sparkles"></i> {{ copy.recommendedMedia }}</div>
					<div :class="$style.mediaRecRow">
						<button v-for="work in recommendedMedia" :key="work.id" :class="$style.mediaRecCell" @click="emit('openMedia', work.id)">
							<HyMediaCover :kind="work.kind" :title="work.title" :subtitle="work.creator || work.developer" :colorIndex="work.coverColorIndex" :width="82"/>
							<div :class="$style.mediaKind"><i :class="['ti', work.kind === 'movie' ? 'ti-movie' : 'ti-device-gamepad-2']"></i> {{ work.kind === 'movie' ? copy.movie : copy.game }}</div>
							<div v-if="work.recommendationRating != null" :class="$style.mediaRating"><i class="ti ti-star-filled"></i> {{ (work.recommendationRating / 2).toFixed(1) }}</div>
						</button>
					</div>
				</template>

				<div v-if="mediaWorks.length || mediaLoading" :class="$style.mediaSection">
					<div :class="$style.shelfHead">
						<h3 :class="$style.shelfTitle"><i class="ti ti-layout-grid"></i> {{ profile.isMe ? copy.mediaCollection : copy.publicMediaCollection }}</h3>
						<div :class="$style.mediaCounts">
							<span><i class="ti ti-movie"></i> {{ mediaWorksTruncated ? '≥' : '' }}{{ movieCount }}</span>
							<span><i class="ti ti-device-gamepad-2"></i> {{ mediaWorksTruncated ? '≥' : '' }}{{ gameCount }}</span>
						</div>
					</div>
					<div v-if="mediaLoading" :class="$style.shelfEmpty">{{ copy.loading }}</div>
					<div v-else :class="$style.mediaGrid">
						<button v-for="work in mediaWorks" :key="work.id" :class="$style.mediaCell" @click="emit('openMedia', work.id)">
							<HyMediaCover :kind="work.kind" :title="work.title" :subtitle="work.creator || work.developer" :colorIndex="work.coverColorIndex" :width="92"/>
							<div :class="$style.mediaCellMeta">
								<span><i :class="['ti', work.kind === 'movie' ? 'ti-movie' : 'ti-device-gamepad-2']"></i> {{ work.kind === 'movie' ? copy.movie : copy.game }}</span>
								<span v-if="work.recommendationRating != null"><i class="ti ti-star-filled"></i> {{ (work.recommendationRating / 2).toFixed(1) }}</span>
							</div>
						</button>
					</div>
				</div>

				<!-- おすすめの本 -->
				<template v-if="recommendedBooks.length">
					<div :class="$style.recHead"><i class="ti ti-thumb-up"></i> {{ copy.recommended }}</div>
					<div :class="$style.recRow">
						<button v-for="b in recommendedBooks" :key="b.id" :class="$style.recCell" @click="emit('openBook', b.id)">
							<HyBookCover :title="b.title" :author="b.author" :colorIndex="b.coverColorIndex" :width="72" showTitle/>
							<div :class="$style.recTitle">{{ b.title }}</div>
						</button>
					</div>
				</template>

				<!-- 本棚 -->
				<div :class="$style.shelfHead">
					<h3 :class="$style.shelfTitle"><i class="ti ti-books"></i> {{ copy.bookshelf }}</h3>
					<div :class="$style.shelfFilters">
						<button v-for="f in shelfFilters" :key="f.key" :class="[$style.shelfFilter, shelfFilter === f.key && $style.shelfFilterOn]" @click="shelfFilter = f.key">
							{{ f.label }} <span v-if="f.key === 'all'">{{ profile.books.length }}</span>
						</button>
					</div>
				</div>
				<div v-if="shelfBooks.length === 0" :class="$style.shelfEmpty">{{ copy.noBooks }}</div>
				<div v-else :class="$style.shelfGrid">
					<button v-for="b in shelfBooks" :key="b.id" :class="$style.bookCell" @click="emit('openBook', b.id)">
						<div :class="$style.coverWrap">
							<HyBookCover :title="b.title" :author="b.author" :colorIndex="b.coverColorIndex" :width="106" showTitle/>
							<span v-if="b.status === 'finished'" :class="[$style.coverBadge, $style.badgeDone]"><i class="ti ti-check"></i></span>
							<span v-else-if="b.status === 'tsundoku'" :class="[$style.coverBadge, $style.badgeTsundoku]">{{ copy.statusTsundoku }}</span>
							<span v-else-if="b.status === 'want'" :class="[$style.coverBadge, $style.badgeWant]">{{ copy.statusWant }}</span>
							<span v-else-if="b.progress != null" :class="$style.coverBadge">{{ b.progress }}%</span>
						</div>
						<div :class="$style.bookTitle">{{ b.title }}</div>
						<div :class="$style.bookStatus">{{ bookStatus(b.status) }}</div>
					</button>
				</div>

				<!-- 公開した学び -->
				<div :class="$style.postsHead">
					<h3 :class="$style.shelfTitle"><i class="ti ti-notebook"></i> {{ profile.isMe ? copy.myPosts : copy.publicPosts }}</h3>
				</div>
				<div v-if="!profile.logs || profile.logs.length === 0" :class="$style.shelfEmpty">{{ copy.noPosts }}</div>
				<div v-else :class="$style.posts">
					<button v-for="log in profile.logs" :key="log.id" :class="$style.postCard" :style="{ borderLeftColor: palAccent(log.subject) }" @click="emit('openLog', log.id)">
						<div :class="$style.postTop">
							<HySubjectBadge :subject="log.subject"/>
							<span v-if="log.visibility === 'followers'" :class="$style.postPrivate"><i class="ti ti-users"></i></span>
							<span v-else-if="!log.isPublic" :class="$style.postPrivate"><i class="ti ti-lock"></i></span>
							<span :class="$style.postTime">{{ fmtWhen(log.studiedAt) }} · {{ fmtDuration(log.durationMinutes) }}</span>
						</div>
						<div :class="$style.postTitle">{{ log.title }}</div>
						<div v-if="log.body" :class="$style.postBody">{{ log.body }}</div>
						<div :class="$style.postFoot">
							<span :class="$style.postStat"><i class="ti ti-mood-smile"></i> {{ log.reactionsCount }}</span>
							<span :class="$style.postStat"><i class="ti ti-message-circle-2"></i> {{ log.commentsCount }}</span>
						</div>
					</button>
				</div>
			</div>
		</template>
		<div v-else :class="$style.loading">{{ copy.notFound }}</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import HyBookCover from '@/components/HyBookCover.vue';
import HyMediaCover from '@/components/HyMediaCover.vue';
import HySubjectBadge from '@/components/HySubjectBadge.vue';
import { versatileLang } from '@@/js/intl-const.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { hySubjectPalette, hyBannerGradient, hyTagLabel, HY_BANNER_PRESETS } from '@/utility/hatady.js';
import { hatadyTheme, hatadyTzOffset } from '@/utility/hatady-prefs.js';

const props = defineProps<{ userId?: string | null }>();
const emit = defineEmits<{ (ev: 'changed'): void; (ev: 'openLog', logId: string): void; (ev: 'openProfile', userId: string): void; (ev: 'openBook', bookId: string): void; (ev: 'openMedia', workId: string): void; (ev: 'closed'): void }>();
const dialog = ref<any>(null);
const theme = hatadyTheme;
const copy = i18n.ts._hata._hatady._profile;
const copyx = i18n.tsx._hata._hatady._profile;
const shortDateFormatter = new Intl.DateTimeFormat(versatileLang, { month: 'short', day: 'numeric' });

const profile = ref<any>(null);
const loading = ref(true);
const mediaLoading = ref(false);
const mediaWorks = ref<any[]>([]);
const mediaWorksTruncated = ref(false);
const following = ref(false);
const followBusy = ref(false);
const bannerColor = ref<string | null>(null);
const colorPickerOpen = ref(false);
const shelfFilter = ref<'all' | 'reading' | 'finished' | 'tsundoku' | 'want'>('all');

const shelfFilters = [
	{ key: 'all' as const, label: copy.filterAll },
	{ key: 'reading' as const, label: copy.statusReading },
	{ key: 'finished' as const, label: copy.statusFinished },
	{ key: 'tsundoku' as const, label: copy.statusTsundoku },
	{ key: 'want' as const, label: copy.statusWant },
];
const statusLabels: Record<string, string> = {
	reading: copy.statusReading,
	finished: copy.statusFinished,
	tsundoku: copy.statusTsundoku,
	want: copy.statusWant,
};

function bookStatus(status: string): string { return statusLabels[status] ?? status; }

function palAccent(subject: string): string { return hySubjectPalette(subject).accent; }

function fmtDuration(min: number): string {
	if (min < 60) return copyx.durationMinutes({ minutes: min.toString() });
	const h = Math.floor(min / 60); const m = min % 60;
	return copyx.durationHoursMinutes({ hours: h.toString(), minutes: m.toString() });
}

function fmtWhen(iso: string): string {
	const d = new Date(iso);
	const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
	if (diffMin < 60) return copyx.minutesAgo({ count: diffMin.toString() });
	const diffH = Math.floor(diffMin / 60);
	if (diffH < 24) return copyx.hoursAgo({ count: diffH.toString() });
	const diffD = Math.floor(diffH / 24);
	if (diffD < 7) return copyx.daysAgo({ count: diffD.toString() });
	return shortDateFormatter.format(d);
}

async function openUserList(type: 'following' | 'followers') {
	if (!profile.value) return;
	const { dispose } = os.popup((await import('@/components/HatadyUserList.vue')).default, {
		userId: profile.value.user.id,
		type,
	}, {
		openProfile: (uid: string) => emit('openProfile', uid),
		closed: () => dispose(),
	});
}

const shelfBooks = computed(() => {
	if (!profile.value) return [];
	return shelfFilter.value === 'all' ? profile.value.books : profile.value.books.filter((b: any) => b.status === shelfFilter.value);
});
const recommendedBooks = computed(() => (profile.value?.books ?? []).filter((b: any) => b.isRecommended));
const recommendedMedia = computed(() => mediaWorks.value.filter(work => work.isRecommended));
const movieCount = computed(() => mediaWorks.value.filter(work => work.kind === 'movie').length);
const gameCount = computed(() => mediaWorks.value.filter(work => work.kind === 'game').length);

async function reloadMedia(userId: string) {
	const PAGE_LIMIT = 100;
	const MAX_PAGES = 50;
	mediaLoading.value = true;
	mediaWorksTruncated.value = false;
	try {
		const collected: any[] = [];
		const seenIds = new Set<string>();
		const seenCursors = new Set<string>();
		let untilId: string | undefined;
		let completed = false;

		for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex++) {
			let page: any[];
			try {
				const response = await misskeyApi('hata/hatady/media/works/list' as never, {
					userId,
					sort: 'updatedAt',
					order: 'desc',
					limit: PAGE_LIMIT,
					...(untilId ? { untilId } : {}),
				} as never);
				if (!Array.isArray(response)) throw new TypeError('Invalid Hatady media work list response');
				page = response;
			} catch {
				mediaWorksTruncated.value = true;
				break;
			}

			for (const work of page) {
				if (typeof work?.id !== 'string' || seenIds.has(work.id)) continue;
				seenIds.add(work.id);
				collected.push(work);
			}

			if (page.length < PAGE_LIMIT) {
				completed = true;
				break;
			}

			const nextUntilId = page.at(-1)?.id;
			if (typeof nextUntilId !== 'string' || seenCursors.has(nextUntilId)) {
				mediaWorksTruncated.value = true;
				break;
			}
			seenCursors.add(nextUntilId);
			untilId = nextUntilId;
		}

		// 50ページ目が満杯でも、ちょうど5000件なら「打ち切り」ではない。
		// 次の1件だけを確認し、実際に続きがある場合だけ下限表示(≥)にする。
		if (!completed && untilId) {
			try {
				const probe: unknown = await misskeyApi('hata/hatady/media/works/list' as never, {
					userId,
					sort: 'updatedAt',
					order: 'desc',
					limit: 1,
					untilId,
				} as never);
				if (!Array.isArray(probe)) throw new TypeError('Invalid Hatady media work list response');
				completed = probe.length === 0;
			} catch {
				mediaWorksTruncated.value = true;
			}
		}

		mediaWorks.value = collected;
		if (!completed) mediaWorksTruncated.value = true;
	} finally {
		mediaLoading.value = false;
	}
}

async function reload() {
	loading.value = true;
	try {
		const payload: Record<string, unknown> = { tzOffset: hatadyTzOffset() };
		if (props.userId) payload.userId = props.userId;
		profile.value = await misskeyApi('hata/hatady/users/show', payload).catch(() => null);
		following.value = profile.value?.isFollowing ?? false;
		bannerColor.value = profile.value?.bannerColor ?? null;
		if (profile.value?.user?.id) await reloadMedia(profile.value.user.id);
		else {
			mediaWorks.value = [];
			mediaWorksTruncated.value = false;
		}
	} finally {
		loading.value = false;
	}
}

async function toggleFollow() {
	if (!profile.value || profile.value.isMe) return;
	const uname = profile.value.user.name || profile.value.user.username;
	// フォロー / 解除の前に確認する。
	const { canceled } = await os.confirm({
		type: following.value ? 'warning' : 'question',
		text: following.value ? copyx.unfollowConfirm({ name: uname }) : copyx.followConfirm({ name: uname }),
	});
	if (canceled) return;
	followBusy.value = true;
	const target = profile.value.user.id;
	try {
		if (following.value) {
			following.value = false;
			profile.value.followersCount = Math.max(0, profile.value.followersCount - 1);
			await misskeyApi('hata/hatady/following/delete', { userId: target }).catch(() => {});
		} else {
			following.value = true;
			profile.value.followersCount += 1;
			await misskeyApi('hata/hatady/following/create', { userId: target }).catch(() => {});
		}
		// フォロー境界が変わった直後に、APIが現在許可する作品だけへ同期する。
		// 特に解除後、取得済みの followers 作品をプロフィール内へ残さない。
		await reloadMedia(target);
		emit('changed');
	} finally {
		followBusy.value = false;
	}
}

function openColorPicker() { colorPickerOpen.value = !colorPickerOpen.value; }

async function pickColor(key: string) {
	bannerColor.value = key === 'orange' ? null : key; // orange=既定なので null 保存
	colorPickerOpen.value = false;
	await misskeyApi('hata/hatady/profile/update', { bannerColor: bannerColor.value ?? '' }).catch(() => {});
}

function editProfile() {
	// プロフィール(名前/アイコン/自己紹介)は hataskey 本体の設定に準ずる。
	os.pageWindow('/settings/profile');
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
	container-type: inline-size;
}
.loading { opacity: .6; padding: 40px 0; text-align: center; }

/* バナー */
.banner { background: linear-gradient(120deg, #e79b5e, #d9824a); padding: 22px 26px 20px; }
.bannerTop { display: flex; align-items: flex-start; gap: 16px; }
.avatar { width: 70px; height: 70px; flex-shrink: 0; border: 3px solid rgba(255,255,255,.6); }
.identity { flex: 1; min-width: 0; padding-top: 4px; }
.nameRow { display: flex; align-items: center; gap: 6px; }
.name { font-family: var(--hy-heading); font-weight: 900; font-size: 22px; color: #fff; }
.bio { font-size: 12.5px; color: rgba(255,255,255,.9); margin-top: 3px; line-height: 1.5; word-break: break-word; }
.editBtn, .followBtn {
	flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px;
	border-radius: 999px; padding: 7px 16px; font-size: 12.5px; font-weight: 700;
	font-family: var(--hy-heading); cursor: pointer; border: none;
}
.colorBtn {
	flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
	width: 34px; height: 34px; border-radius: 999px; border: none; cursor: pointer;
	background: rgba(255,255,255,.85); color: #b8632f; font-size: 17px;
}
.colorBtn:hover { background: #fffdf8; }
.colorPicker { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.swatch { width: 30px; height: 30px; border-radius: 8px; border: 2px solid rgba(255,255,255,.5); cursor: pointer; padding: 0; box-shadow: 0 1px 4px rgba(0,0,0,.2); }
.swatchOn { border-color: #fff; box-shadow: 0 0 0 2px rgba(255,255,255,.9); }
.editBtn { background: #fffdf8; color: #b8632f; }
.followBtn { background: #fffdf8; color: #b8632f; }
.followingBtn { background: rgba(255,255,255,.25); color: #fff; box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.7); }
.followBtn:disabled { opacity: .6; cursor: default; }

.stats { display: flex; gap: 24px; margin-top: 16px; flex-wrap: wrap; }
.statBtn { background: none; border: none; padding: 2px 4px; margin: -2px; border-radius: 8px; cursor: pointer; text-align: left; }
.statBtn:hover { background: rgba(255,255,255,.15); }
.statNum { font-family: var(--hy-heading); font-weight: 900; font-size: 19px; color: #fff; }
.statUnit { font-size: 12px; }
.statLbl { font-size: 10.5px; color: rgba(255,255,255,.85); }

.content { padding: 22px 26px; }

/* 得意/苦手/興味 */
.fields { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 24px; }
.fieldCard { background: var(--hy-surface); border: 1px solid var(--hy-border); border-top: 3px solid; border-radius: 12px; padding: 14px; }
.fieldStrength { border-top-color: #4e7d4a; }
.fieldWeak { border-top-color: #b5644a; }
.fieldInterest { border-top-color: #a97e2e; }
.fieldTitle { font-size: 12px; font-weight: 700; margin-bottom: 10px; font-family: var(--hy-heading); }
.fieldStrength .fieldTitle { color: #4e7d4a; }
.fieldWeak .fieldTitle { color: #b5644a; }
.fieldInterest .fieldTitle { color: #a97e2e; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-size: 11.5px; font-weight: 700; padding: 3px 11px; border-radius: 999px; }
.chipStrength { background: #dcecd5; color: #4e7d4a; }
.chipWeak { background: #f1ddd5; color: #b5644a; }
.chipInterest { background: #f7e7c6; color: #a97e2e; }
.fieldEmpty { font-size: 12px; color: var(--hy-muted); }

/* おすすめの本 */
.recHead { font-family: var(--hy-heading); font-weight: 900; font-size: 15px; color: var(--hy-ink); margin-bottom: 12px; }
.recHead i { color: var(--hy-accent); }
.recRow { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 22px; }
.recCell { flex-shrink: 0; width: 72px; background: none; border: none; padding: 0; cursor: pointer; text-align: left; }
.recTitle { font-family: var(--hy-serif); font-weight: 600; font-size: 10.5px; color: var(--hy-ink); margin-top: 6px; line-height: 1.3; }

/* 映画・ゲームコレクション。作品種別に関係しない共通情報だけを表示する。 */
.mediaRecRow { display: flex; gap: 14px; overflow-x: auto; padding: 2px 2px 8px; margin: -2px -2px 22px; }
.mediaRecCell, .mediaCell {
	position: relative; min-width: 0; background: none; border: none; padding: 4px; margin: -4px;
	border-radius: 10px; cursor: pointer; text-align: left; color: var(--hy-body); font: inherit;
	transition: background .12s, transform .12s;
}
.mediaRecCell { flex: 0 0 90px; }
.mediaRecCell:hover, .mediaCell:hover { background: var(--hy-surface-2); transform: translateY(-1px); }
.mediaKind, .mediaCellMeta, .mediaRating { color: var(--hy-muted); font-size: 10px; }
.mediaKind { display: flex; align-items: center; gap: 4px; margin-top: 7px; }
.mediaRating { display: flex; align-items: center; gap: 3px; margin-top: 2px; color: var(--hy-accent-ink); }
.mediaSection { margin-bottom: 24px; }
.mediaCounts { display: flex; gap: 10px; color: var(--hy-muted); font-size: 11px; }
.mediaCounts span, .mediaCellMeta span { display: inline-flex; align-items: center; gap: 4px; }
.mediaGrid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 16px 12px; }
.mediaCell { display: flex; flex-direction: column; align-items: flex-start; }
.mediaCellMeta { display: flex; width: 92px; justify-content: space-between; gap: 5px; margin-top: 7px; }
.mediaCellMeta span:last-child { color: var(--hy-accent-ink); }

/* 本棚 */
.shelfHead { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.shelfTitle { margin: 0; font-family: var(--hy-heading); font-weight: 900; font-size: 16px; color: var(--hy-ink); }
.shelfTitle i { color: var(--hy-accent); }
.shelfFilters { display: flex; gap: 5px; flex-wrap: wrap; }
.shelfFilter { padding: 3px 11px; font-size: 11px; font-weight: 700; color: var(--hy-body); background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 999px; cursor: pointer; }
.shelfFilterOn { color: #fff; background: var(--hy-accent); border-color: transparent; }
.shelfEmpty { font-size: 12.5px; color: var(--hy-muted); padding: 8px 0; }
.shelfGrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
.bookCell { min-width: 0; background: none; border: none; padding: 4px; margin: -4px; border-radius: 8px; cursor: pointer; text-align: left; font: inherit; transition: background .12s; }
.bookCell:hover { background: rgba(0,0,0,.04); }
.coverWrap { position: relative; display: flex; justify-content: center; }
.coverBadge {
	position: absolute; top: 6px; right: 6px;
	font-size: 9px; font-weight: 700; color: #fff; background: rgba(0,0,0,.3);
	border-radius: 999px; padding: 1px 7px; display: inline-flex; align-items: center;
}
.badgeDone { background: rgba(78,125,74,.92); }
.badgeWant { color: #7a5326; background: #f4ddb8; }
.badgeTsundoku { color: #7a5a9a; background: #e6dcf0; }
.bookTitle { font-family: var(--hy-serif); font-weight: 600; font-size: 11.5px; color: var(--hy-ink); margin-top: 7px; line-height: 1.35; }
.bookStatus { font-size: 10px; color: var(--hy-muted); margin-top: 1px; }

/* 公開した学び */
.postsHead { display: flex; align-items: center; gap: 12px; margin: 24px 0 12px; }
.posts { display: flex; flex-direction: column; gap: 10px; }
.postCard {
	width: 100%; text-align: left; cursor: pointer;
	background: var(--hy-surface); border: 1px solid var(--hy-border); border-left: 4px solid;
	border-radius: 11px; padding: 12px 14px; transition: border-color .12s;
}
.postCard:hover { border-color: var(--hy-accent); }
.postTop { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
.postPrivate { color: var(--hy-muted); font-size: 11px; }
.postTime { margin-left: auto; font-size: 11px; color: var(--hy-muted); }
.postTitle { font-size: 14px; font-weight: 700; color: var(--hy-ink); line-height: 1.45; }
.postBody { font-size: 12.5px; line-height: 1.6; color: var(--hy-body); margin-top: 5px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.postFoot { display: flex; gap: 14px; margin-top: 8px; }
.postStat { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--hy-muted); }

@container (max-width: 720px) {
	.fields { grid-template-columns: 1fr; }
	.shelfGrid { grid-template-columns: repeat(3, 1fr); }
	.mediaGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@container (max-width: 430px) {
	.banner { padding: 18px 16px; }
	.content { padding: 18px 16px; }
	.bannerTop { flex-wrap: wrap; }
	.stats { gap: 14px; }
	.shelfGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 10px; }
	.mediaGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 10px; }
}

@container (max-width: 300px) {
	.shelfGrid, .mediaGrid { grid-template-columns: 1fr; }
	.bookCell, .mediaCell { align-items: center; }
}
</style>
