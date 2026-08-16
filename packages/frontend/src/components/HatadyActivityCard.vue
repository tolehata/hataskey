<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
Hatady の学習・映画鑑賞・ゲームプレイを同じ時系列で表示する活動カード。
-->
<template>
<article :class="[$style.card, isStudy ? $style.study : $style.media]">
	<header :class="$style.head">
		<button v-if="showAuthor && activity.user" type="button" :class="$style.author" @click="emit('openProfile', activity.user.id)">
			<MkAvatar :class="$style.avatar" :user="activity.user"/>
			<span><MkUserName :user="activity.user"/><small>@{{ activity.user.username }}</small></span>
		</button>
		<div v-else :class="$style.kindLead">
			<i :class="['ti', kindIcon]"></i>
			<span>{{ kindLabel }}</span>
		</div>
		<time :datetime="activity.occurredAt"><i class="ti ti-clock"></i> {{ whenLabel }}</time>
		<button v-if="isStudy || activity.isMine" type="button" :class="$style.menu" :title="homeCopy.activityMenu" @click="emit('menu', activity, $event)"><i class="ti ti-dots"></i></button>
	</header>

	<template v-if="isStudy && study">
		<div :class="$style.topics">
			<HySubjectBadge :subject="study.subject"/>
			<span v-if="hyTag(study.tag)" :class="$style.tag" :style="{ background: hyTag(study.tag)?.bg, color: hyTag(study.tag)?.fg }"><i :class="['ti', hyTag(study.tag)?.icon]"></i> {{ hyTagLabel(study.tag) }}</span>
			<span v-if="study.durationMinutes" :class="$style.duration"><i class="ti ti-hourglass"></i> {{ durationLabel(study.durationMinutes) }}</span>
			<VisibilityChip :visibility="activity.visibility"/>
		</div>
		<h3>{{ study.title }}</h3>
		<button v-if="study.book" type="button" :class="$style.workLink" @click="emit('openBook', study.book.id)">
			<HyBookCover :title="study.book.title" :author="study.book.author" :width="38"/>
			<span><b>{{ study.book.title }}</b><small>{{ study.book.author }}</small></span>
		</button>
		<p v-if="study.body" :class="$style.note">{{ study.body }}</p>
		<footer :class="$style.foot">
			<HatadyReactions :target="{ logId: study.id }" :reactions="study.reactions ?? {}" :myReaction="study.myReaction ?? null"/>
			<button type="button" :class="$style.detailButton" @click="emit('openLog', study.id)"><i class="ti ti-message-circle-2"></i> {{ study.commentsCount ?? 0 }}</button>
		</footer>
	</template>

	<template v-else-if="media && media.work && media.session">
		<div :class="$style.mediaLayout">
			<button type="button" :class="$style.coverButton" @click="emit('openMedia', media.work.id)">
				<HyMediaCover :kind="media.work.kind" :title="media.work.title" :subtitle="media.work.creator || media.work.developer" :colorIndex="media.work.coverColorIndex" :width="74"/>
			</button>
			<div :class="$style.mediaBody">
				<div :class="$style.topics">
					<span :class="$style.kindChip"><i :class="['ti', kindIcon]"></i> {{ kindLabel }}</span>
					<span v-if="media.session.durationMinutes" :class="$style.duration"><i class="ti ti-clock"></i> {{ formatMediaMinutes(media.session.durationMinutes) }}</span>
					<VisibilityChip :visibility="activity.visibility"/>
				</div>
				<button type="button" :class="$style.titleButton" @click="emit('openMedia', media.work.id)"><h3>{{ media.work.title }}</h3><span>{{ media.work.creator || media.work.developer || media.work.publisher }}</span></button>
				<details v-if="media.session.noteSpoiler && (media.session.note || factRows.length)" :class="$style.spoiler">
					<summary><i class="ti ti-eye-off"></i> {{ mediaCopy.detail.showSpoilerSession }}</summary>
					<ActivityMediaDetail :session="media.session" :rows="factRows"/>
				</details>
				<ActivityMediaDetail v-else :session="media.session" :rows="factRows"/>
			</div>
		</div>
		<footer :class="$style.foot">
			<span :class="$style.mediaHint">{{ homeCopy.mediaInteractionHint }}</span>
			<button type="button" :class="$style.detailButton" @click="emit('openMedia', media.work.id)"><i class="ti ti-arrow-up-right"></i> {{ homeCopy.openWorkDetails }}</button>
		</footer>
	</template>
</article>
</template>

<script lang="ts" setup>
import { computed, defineComponent, h, useCssModule } from 'vue';
import type { HatadyActivity, HatadyMediaSession, HatadyMediaVisibility } from '@/utility/hatady-media.js';
import { i18n } from '@/i18n.js';
import { versatileLang } from '@/utility/intl-const.js';
import HyBookCover from '@/components/HyBookCover.vue';
import HyMediaCover from '@/components/HyMediaCover.vue';
import HySubjectBadge from '@/components/HySubjectBadge.vue';
import HatadyReactions from '@/components/HatadyReactions.vue';
import { hyTag, hyTagLabel } from '@/utility/hatady.js';
import { HATADY_STAT_FIELDS, formatMediaMinutes, hatadyMediaCopy, mediaSessionDisplayFacts } from '@/utility/hatady-media.js';

const props = withDefaults(defineProps<{ activity: HatadyActivity; showAuthor?: boolean }>(), { showAuthor: false });
const emit = defineEmits<{
	(ev: 'openLog', logId: string): void;
	(ev: 'openBook', bookId: string): void;
	(ev: 'openMedia', workId: string): void;
	(ev: 'openProfile', userId: string): void;
	(ev: 'menu', activity: HatadyActivity, event: MouseEvent): void;
}>();

const styles = useCssModule();
const homeCopy = i18n.ts._hata._hatady._home;
const homeLabels = homeCopy as unknown as Record<string, string>;
const homeCopyx = i18n.tsx._hata._hatady._home;
const mediaCopy = hatadyMediaCopy();
const timeFormatter = new Intl.DateTimeFormat(versatileLang, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const activity = computed(() => props.activity);
const isStudy = computed(() => activity.value.type === 'study');
const study = computed<any>(() => activity.value.study ?? null);
const media = computed(() => activity.value.media ?? null);
const kindIcon = computed(() => activity.value.type === 'study' ? 'ti-notebook' : activity.value.type === 'movie_viewing' ? 'ti-movie' : activity.value.type === 'game_match' ? 'ti-swords' : activity.value.type === 'game_roguelike' ? 'ti-route-square' : activity.value.type === 'game_pve' ? 'ti-users' : 'ti-device-gamepad-2');
const kindLabel = computed(() => activity.value.type === 'study' ? homeCopy.activityStudy : String(mediaCopy.session.types[activity.value.type] ?? activity.value.type));
const whenLabel = computed(() => timeFormatter.format(new Date(activity.value.occurredAt)));
const factRows = computed(() => media.value ? mediaSessionDisplayFacts(media.value.session).slice(0, 6).map(({ key, value }) => ({ key, label: detailLabel(key), value: detailValue(key, value) })) : []);

function durationLabel(minutes: number): string {
	if (minutes < 60) return homeCopyx.durationMinutes({ minutes: minutes.toString() });
	return homeCopyx.durationHoursMinutes({ hours: Math.floor(minutes / 60).toString(), minutes: (minutes % 60).toString() });
}

function detailLabel(key: string): string { return String(mediaCopy.session?.[key] ?? key); }

function formatWeaponStatRow(row: unknown): string {
	if (row == null || typeof row !== 'object' || Array.isArray(row)) return '';
	const entry = row as Record<string, unknown>;
	const weapon = typeof entry.weapon === 'string' ? entry.weapon.trim() : '';
	if (weapon.length === 0) return '';
	const stats = HATADY_STAT_FIELDS
		.filter(field => typeof entry[field] === 'number')
		.map(field => `${detailLabel(field)} ${entry[field]}`)
		.join(' · ');
	return stats.length > 0 ? `${weapon}（${stats}）` : weapon;
}

function detailValue(key: string, value: unknown): string {
	// 旗鯖fork(Hatady): 武器ごとの成績は行オブジェクトの配列。指標の組み合わせが記録ごとに変わるので、
	// 数字だけ並べても意味が取れない。ここで指標名を添えて1行の文にする。
	if (key === 'weaponStats' && Array.isArray(value)) return value.map(row => formatWeaponStatRow(row)).filter(Boolean).join(' / ');
	if (Array.isArray(value)) return value.map(String).join(' · ');
	if (typeof value === 'boolean') return value ? i18n.ts.yes : i18n.ts.no;
	const translations: Record<string, string> = { great: 'moodGreat', good: 'moodGood', neutral: 'moodNeutral', tired: 'moodTired', frustrated: 'moodFrustrated' };
	return String(mediaCopy.session?.[translations[String(value)] ?? String(value)] ?? value);
}

const VisibilityChip = defineComponent({
	name: 'VisibilityChip', props: { visibility: { type: String as () => HatadyMediaVisibility, required: true } },
	setup(p) { return () => h('span', { class: styles.visibility }, [h('i', { class: `ti ${p.visibility === 'public' ? 'ti-world' : p.visibility === 'followers' ? 'ti-users' : 'ti-lock'}` }), ` ${homeLabels[p.visibility === 'public' ? 'activityPublic' : p.visibility === 'followers' ? 'activityFollowers' : 'activityPrivate']}`]); },
});

const ActivityMediaDetail = defineComponent({
	name: 'ActivityMediaDetail',
	props: { session: { type: Object as () => HatadyMediaSession, required: true }, rows: { type: Array as () => Array<{ key: string; label: string; value: string }>, required: true } },
	setup(p) {
		return () => h('div', { class: styles.mediaDetail }, [
			p.rows.length ? h('div', { class: styles.facts }, p.rows.map(row => h('span', { key: row.key }, [h('b', row.label), ` ${row.value}`]))) : null,
			p.session.note ? h('p', { class: styles.note }, p.session.note) : null,
		]); 
	},
});
</script>

<style lang="scss" module>
.card { padding: 15px 16px; border: 1px solid var(--hy-border); border-left: 4px solid var(--hy-accent); border-radius: 14px; background: var(--hy-surface); color: var(--hy-body); box-shadow: 0 2px 12px color-mix(in srgb, var(--hy-ink) 6%, transparent); container-type: inline-size; }
.media { border-left-color: color-mix(in srgb, var(--hy-accent) 72%, #6f78b8); }
.head { display: flex; align-items: center; gap: 9px; min-width: 0; }
.head time { margin-left: auto; flex: 0 0 auto; color: var(--hy-muted); font-size: 10.5px; }
.author { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 0; border: 0; background: none; color: var(--hy-ink); text-align: left; cursor: pointer; }
.author > span { min-width: 0; font-size: 12px; font-weight: 700; }
.author small { display: block; overflow: hidden; color: var(--hy-muted); font-size: 9.5px; font-weight: 400; text-overflow: ellipsis; white-space: nowrap; }
.avatar { width: 32px; height: 32px; flex: 0 0 auto; }
.kindLead { display: inline-flex; align-items: center; gap: 6px; color: var(--hy-ink); font-family: var(--hy-heading); font-size: 12px; font-weight: 800; }
.kindLead i { color: var(--hy-accent); }
.menu { flex: 0 0 auto; padding: 4px; border: 0; background: none; color: var(--hy-muted); cursor: pointer; }
.topics { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 11px; }
.tag, .duration, .visibility, .kindChip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
.duration, .visibility { border: 1px solid var(--hy-border); background: var(--hy-bg); color: var(--hy-muted); }
.kindChip { background: color-mix(in srgb, var(--hy-accent) 14%, var(--hy-bg)); color: var(--hy-accent-ink); }
.card h3 { overflow-wrap: anywhere; margin: 9px 0 0; color: var(--hy-ink); font-family: var(--hy-serif); font-size: 15px; line-height: 1.45; }
.note { margin: 9px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; color: var(--hy-body); font-size: 12px; line-height: 1.65; }
.workLink { display: flex; align-items: center; gap: 9px; width: 100%; margin-top: 9px; padding: 8px; border: 1px solid var(--hy-border); border-radius: 10px; background: var(--hy-bg); color: var(--hy-ink); text-align: left; cursor: pointer; }
.workLink span { min-width: 0; }
.workLink b, .workLink small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.workLink b { font-family: var(--hy-serif); font-size: 11.5px; }
.workLink small { color: var(--hy-muted); font-size: 9.5px; }
.mediaLayout { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 13px; margin-top: 10px; }
.coverButton, .titleButton { padding: 0; border: 0; background: none; color: inherit; text-align: left; cursor: pointer; }
.mediaBody { min-width: 0; }
.titleButton { width: 100%; }
.titleButton span { display: block; overflow: hidden; margin-top: 2px; color: var(--hy-muted); font-size: 10.5px; text-overflow: ellipsis; white-space: nowrap; }
.facts { display: flex; flex-wrap: wrap; gap: 5px 10px; margin-top: 8px; color: var(--hy-body); font-size: 10.5px; }
.facts b { color: var(--hy-ink); }
.spoiler { margin-top: 8px; padding: 7px 9px; border: 1px solid var(--hy-border); border-radius: 9px; background: var(--hy-bg); }
.spoiler summary { color: var(--hy-muted); font-size: 10.5px; font-weight: 700; cursor: pointer; }
.mediaDetail { min-width: 0; }
.foot { display: flex; align-items: center; gap: 8px; margin-top: 11px; padding-top: 9px; border-top: 1px solid var(--hy-border); }
.detailButton { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; padding: 4px 7px; border: 0; background: none; color: var(--hy-muted); font-size: 10.5px; cursor: pointer; }
.mediaHint { color: var(--hy-muted); font-size: 9.5px; }
@container (max-width: 430px) {
	.head { flex-wrap: wrap; }
	.head time { margin-left: 0; }
	.mediaLayout { grid-template-columns: 1fr; }
	.coverButton { justify-self: start; }
	.mediaHint { display: none; }
}
</style>
