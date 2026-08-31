<template>
<PageWithHeader>
<div class="htk-docs-root" :data-mode="themeMode" ref="rootEl">
	<div class="htk-docs-bg"><div class="htk-docs-orb a"></div><div class="htk-docs-orb b"></div></div>
	<div class="htk-docs-content">
		<h1 class="htk-docs-title"><i class="ti ti-book"></i> {{ copy.pageHeading }}</h1>

		<div class="htk-docs-search">
			<input class="htk-docs-inp" v-model="searchQuery" :placeholder="copy.searchPlaceholder">
		</div>

		<div class="htk-docs-cats">
			<button :class="['htk-docs-cat',!activeCat&&'on']" @click="activeCat=''">{{ copy.all }}</button>
			<button v-for="c in categories" :key="c.id" :class="['htk-docs-cat',activeCat===c.id&&'on']" @click="activeCat=activeCat===c.id?'':c.id">
				<i :class="c.iconClass"></i> {{c.label}}
			</button>
		</div>

		<div v-for="cat in filteredCategories" :key="cat.id">
			<div v-if="cat.docs.length" class="htk-docs-cat-hdr"><i :class="cat.iconClass"></i> {{cat.label}}</div>
			<div v-for="doc in cat.docs" :key="doc.title" class="htk-docs-card" @click="toggleDoc(doc.title)">
				<div class="htk-docs-card-hdr">
					<i :class="doc.iconClass"></i>
					<span class="htk-docs-card-title">{{doc.title}}</span>
					<span class="htk-docs-chev"><i :class="openDoc===doc.title?'ti ti-chevron-up':'ti ti-chevron-down'"></i></span>
				</div>
				<div v-if="openDoc===doc.title" class="htk-docs-card-body" @click.stop>
					<div v-html="doc.body"></div>
					<div v-if="doc.tips&&doc.tips.length" class="htk-docs-tips">
						<div class="htk-docs-tips-h"><i class="ti ti-bulb"></i> {{ copy.tips }}</div>
						<ul><li v-for="(t,i) in doc.tips" :key="i">{{t}}</li></ul>
					</div>
					<a v-if="doc.link" :href="doc.link.startsWith('http')?doc.link:undefined" @click.prevent="navigateLink(doc.link)" class="htk-docs-link">{{doc.linkLabel || copy.openSettings}} →</a>
				</div>
			</div>
		</div>

		<div class="htk-docs-footer">
			{{ copy.footer }}
		</div>
	</div>
</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { definePage } from '@/page.js';
import { useRouter } from '@/router.js';
import { i18n } from '@/i18n.js';

const copy = i18n.ts._hata._docs;
const entries = copy._entries;

definePage({ title: copy.pageTitle });

const searchQuery = ref('');
const activeCat = ref('');
const openDoc = ref('');
const router = useRouter();

function toggleDoc(title: string) { openDoc.value = openDoc.value === title ? '' : title; }

function navigateLink(link: string) {
	if (link.startsWith('http')) {
		window.open(link, '_blank');
	} else {
		router.push(link as Parameters<typeof router.push>[0]);
	}
}

// Detect theme
const themeMode = computed(() => {
	const cs = window.getComputedStyle(document.documentElement);
	const bg = cs.getPropertyValue('--MI_THEME-bg').trim() || '';
	const m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
	if (m) return (parseInt(m[1])*299+parseInt(m[2])*587+parseInt(m[3])*114)/1000<128?'dark':'light';
	return 'dark';
});

const categories = [
	{
		id: 'hatask', iconClass: 'ti ti-layout-dashboard', label: copy.categoryHatask,
		docs: [
			{ iconClass: 'ti ti-layout-dashboard', title: entries.hataskOverviewTitle, body: entries.hataskOverviewBody, tips: [entries.hataskOverviewTip1], link: '/hatask', linkLabel: entries.hataskOverviewLink },
			{ iconClass: 'ti ti-calendar', title: entries.calendarAttendanceTitle, body: entries.calendarAttendanceBody, tips: [entries.calendarAttendanceTip1, entries.calendarAttendanceTip2], link: '/hatask', linkLabel: entries.calendarAttendanceLink },
			{ iconClass: 'ti ti-checkbox', title: entries.todoListTitle, body: entries.todoListBody, tips: [entries.todoListTip1, entries.todoListTip2], link: '/hatask', linkLabel: entries.todoListLink },
			{ iconClass: 'ti ti-mood-smile', title: entries.moodLogTitle, body: entries.moodLogBody, tips: [entries.moodLogTip1, entries.moodLogTip2], link: '/hatask', linkLabel: entries.moodLogLink },
			{ iconClass: 'ti ti-bowl', title: entries.mealLogTitle, body: entries.mealLogBody, tips: [entries.mealLogTip1, entries.mealLogTip2], link: '/hatask', linkLabel: entries.mealLogLink },
			{ iconClass: 'ti ti-plant', title: entries.gardenTitle, body: entries.gardenBody, tips: [entries.gardenTip1, entries.gardenTip2], link: '/hatask', linkLabel: entries.gardenLink },
			{ iconClass: 'ti ti-eye', title: entries.hataskEyeTitle, body: entries.hataskEyeBody, link: '/hatask', linkLabel: entries.hataskEyeLink },
			{ iconClass: 'ti ti-palette', title: entries.hataskAppearanceTitle, body: entries.hataskAppearanceBody, tips: [entries.hataskAppearanceTip1], link: '/settings/hata-custom', linkLabel: entries.hataskAppearanceLink },
		],
	},
	{
		id: 'hatady', iconClass: 'ti ti-book-2', label: copy.categoryHatady,
		docs: [
			{ iconClass: 'ti ti-book-2', title: entries.hatadyOverviewTitle, body: entries.hatadyOverviewBody, tips: [entries.hatadyOverviewTip1, entries.hatadyOverviewTip2], link: '/hatady', linkLabel: entries.hatadyOverviewLink },
			{ iconClass: 'ti ti-notebook', title: entries.studyAndBookshelfTitle, body: entries.studyAndBookshelfBody, tips: [entries.studyAndBookshelfTip1] },
			{ iconClass: 'ti ti-bookmark', title: entries.bookmarksNotesMaterialsTitle, body: entries.bookmarksNotesMaterialsBody },
			{ iconClass: 'ti ti-chart-line', title: entries.goalsReviewTitle, body: entries.goalsReviewBody, tips: [entries.goalsReviewTip1] },
			{ iconClass: 'ti ti-users', title: entries.publicStudyTitle, body: entries.publicStudyBody, tips: [entries.publicStudyTip1] },
			{ iconClass: 'ti ti-settings', title: entries.hatadySettingsTitle, body: entries.hatadySettingsBody, link: '/settings/hata-custom', linkLabel: entries.hatadySettingsLink },
		],
	},
	{
		id: 'external', iconClass: 'ti ti-link', label: copy.categoryExternal,
		docs: [
			{ iconClass: 'ti ti-link', title: entries.externalOverviewTitle, body: entries.externalOverviewBody, tips: [entries.externalOverviewTip1, entries.externalOverviewTip2], link: '/settings/external-account', linkLabel: entries.externalOverviewLink },
			{ iconClass: 'ti ti-device-tv', title: entries.externalPostsTitle, body: entries.externalPostsBody, tips: [entries.externalPostsTip1], link: '/settings/external-account', linkLabel: entries.externalPostsLink },
			{ iconClass: 'ti ti-star', title: entries.favoriteReactionEmojiTitle, body: entries.favoriteReactionEmojiBody, link: '/settings/external-account', linkLabel: entries.favoriteReactionEmojiLink },
			{ iconClass: 'ti ti-bell-ringing', title: entries.externalNotificationsTitle, body: entries.externalNotificationsBody, link: '/my/external-notifications', linkLabel: entries.externalNotificationsLink },
		],
	},
	{
		id: 'ui', iconClass: 'ti ti-palette', label: copy.categoryUi,
		docs: [
			{ iconClass: 'ti ti-language', title: entries.languageSupportTitle, body: entries.languageSupportBody, tips: [entries.languageSupportTip1, entries.languageSupportTip2], link: '/settings/preferences', linkLabel: entries.languageSupportLink },
			{ iconClass: 'ti ti-device-mobile', title: entries.chooseUiTitle, body: entries.chooseUiBody, link: '/settings/hata-custom', linkLabel: entries.chooseUiLink },
			{ iconClass: 'ti ti-layout-list', title: entries.hatasabaUiTitle, body: entries.hatasabaUiBody, tips: [entries.hatasabaUiTip1, entries.hatasabaUiTip2], link: '/settings/hata-custom', linkLabel: entries.hatasabaUiLink },
			{ iconClass: 'ti ti-columns', title: entries.deckTitle, body: entries.deckBody, tips: [entries.deckTip1] },
			{ iconClass: 'ti ti-movie', title: entries.noteAnimationTitle, body: entries.noteAnimationBody, link: '/settings/hata-custom', linkLabel: entries.noteAnimationLink },
			{ iconClass: 'ti ti-eye-off', title: entries.hideReactionEmojiTitle, body: entries.hideReactionEmojiBody, link: '/settings/hata-custom', linkLabel: entries.hideReactionEmojiLink },
			{ iconClass: 'ti ti-robot', title: entries.hideBotPostsTitle, body: entries.hideBotPostsBody, tips: [entries.hideBotPostsTip1], link: '/settings/hata-custom', linkLabel: entries.hideBotPostsLink },
			{ iconClass: 'ti ti-cloud-rain', title: entries.weatherBackgroundTitle, body: entries.weatherBackgroundBody, tips: [entries.weatherBackgroundTip1, entries.weatherBackgroundTip2], link: '/settings/hata-custom', linkLabel: entries.weatherBackgroundLink },
		],
	},
	{
		id: 'tools', iconClass: 'ti ti-tool', label: copy.categoryTools,
		docs: [
			{ iconClass: 'ti ti-brush', title: entries.drawingToolTitle, body: entries.drawingToolBody, tips: [entries.drawingToolTip1] },
			{ iconClass: 'ti ti-id', title: entries.hataCardMakerTitle, body: entries.hataCardMakerBody, tips: [entries.hataCardMakerTip1], link: '/hatask/card-maker', linkLabel: entries.hataCardMakerLink },
			{ iconClass: 'ti ti-mood-search', title: entries.hatalyzeTitle, body: entries.hatalyzeBody, tips: [entries.hatalyzeTip1, entries.hatalyzeTip2], link: '/hatask/emotion-analysis', linkLabel: entries.hatalyzeLink },
		],
	},
	{
		id: 'posting', iconClass: 'ti ti-pencil', label: copy.categoryPosting,
		docs: [
			{ iconClass: 'ti ti-brush', title: entries.drawingButtonTitle, body: entries.drawingButtonBody, link: '/settings/hata-custom', linkLabel: entries.drawingButtonLink },
			{ iconClass: 'ti ti-palette', title: entries.visibilityBorderTitle, body: entries.visibilityBorderBody, link: '/settings/hata-custom', linkLabel: entries.visibilityBorderLink },
			{ iconClass: 'ti ti-lock', title: entries.privateChannelTitle, body: entries.privateChannelBody, tips: [entries.privateChannelTip1, entries.privateChannelTip2], link: '/channels', linkLabel: entries.privateChannelLink },
			{ iconClass: 'ti ti-confetti', title: entries.feastChallengeTitle, body: entries.feastChallengeBody, tips: [entries.feastChallengeTip1, entries.feastChallengeTip2] },
		],
	},
	{
		id: 'games', iconClass: 'ti ti-device-gamepad-2', label: copy.categoryGames,
		docs: [
			{ iconClass: 'ti ti-device-gamepad-2', title: entries.gamesOverviewTitle, body: entries.gamesOverviewBody, link: '/games', linkLabel: entries.gamesOverviewLink },
			{ iconClass: 'ti ti-building', title: entries.stackingGameTitle, body: entries.stackingGameBody, link: '/stacking-game', linkLabel: entries.stackingGameLink },
			{ iconClass: 'ti ti-hammer', title: entries.whackEmojiTitle, body: entries.whackEmojiBody, link: '/whack-emoji', linkLabel: entries.whackEmojiLink },
			{ iconClass: 'ti ti-rocket', title: entries.emojiShootTitle, body: entries.emojiShootBody, link: '/emoji-shoot', linkLabel: entries.emojiShootLink },
		],
	},
	{
		id: 'other', iconClass: 'ti ti-dots', label: copy.categoryOther,
		docs: [
			{ iconClass: 'ti ti-news', title: entries.whatsNewGuideTitle, body: entries.whatsNewGuideBody, tips: [entries.whatsNewGuideTip1] },
			{ iconClass: 'ti ti-calendar-stats', title: entries.loginDaysAchievementsTitle, body: entries.loginDaysAchievementsBody, link: '/hatask', linkLabel: entries.loginDaysAchievementsLink },
			{ iconClass: 'ti ti-search', title: entries.hataskSearchTitle, body: entries.hataskSearchBody },
			{ iconClass: 'ti ti-school', title: entries.hataskTutorialTitle, body: entries.hataskTutorialBody, link: '/settings/hata-custom', linkLabel: entries.hataskTutorialLink },
			{ iconClass: 'ti ti-speakerphone', title: entries.announcementsFilterTitle, body: entries.announcementsFilterBody, link: '/announcements', linkLabel: entries.announcementsFilterLink },
		],
	},
	{
		id: 'mascot', iconClass: 'ti ti-mood-happy', label: copy.categoryMascot,
		docs: [
			{ iconClass: 'ti ti-mood-happy', title: entries.mascotOverviewTitle, body: entries.mascotOverviewBody, tips: [entries.mascotOverviewTip1, entries.mascotOverviewTip2], link: '/mascot', linkLabel: entries.mascotOverviewLink },
			{ iconClass: 'ti ti-drag-drop', title: entries.mascotDisplayTitle, body: entries.mascotDisplayBody },
			{ iconClass: 'ti ti-mood-smile', title: entries.expressionsLinesTitle, body: entries.expressionsLinesBody },
			{ iconClass: 'ti ti-refresh', title: entries.autoSwitchTitle, body: entries.autoSwitchBody },
			{ iconClass: 'ti ti-bell', title: entries.notificationBirthdayTitle, body: entries.notificationBirthdayBody },
			{ iconClass: 'ti ti-home', title: entries.hataskMascotTitle, body: entries.hataskMascotBody, link: '/hatask', linkLabel: entries.hataskMascotLink },
			{ iconClass: 'ti ti-file-import', title: entries.mascotTransferTitle, body: entries.mascotTransferBody, link: '/mascot', linkLabel: entries.mascotTransferLink },
		],
	},
	{
		id: 'feedback', iconClass: 'ti ti-message-report', label: copy.categoryFeedback,
		docs: [
			{ iconClass: 'ti ti-message-report', title: entries.hatafeedOverviewTitle, body: entries.hatafeedOverviewBody, tips: [entries.hatafeedOverviewTip1, entries.hatafeedOverviewTip2], link: '/hatafeed', linkLabel: entries.hatafeedOverviewLink },
		],
	},
	{
		id: 'bousai', iconClass: 'ti ti-activity', label: '地震・津波情報',
		docs: [
			{ iconClass: 'ti ti-activity', title: '地震・津波情報を見る', body: '気象庁が発表した地震情報と津波情報を、地図と一覧で確認できます。震源、最大震度、市区町村ごとの震度、発表中の津波警報・注意報、お住まいの都道府県で観測された地震を表示します。<br><br>地震が起きる前の緊急地震速報は扱いません。発表済みの情報だけを表示します。', tips: ['情報提供は気象庁とP2P地震情報です', 'ウィジェットやHataskey UIのデッキにも置けます'], link: '/earthquake', linkLabel: '地震・津波情報を開く' },
			{ iconClass: 'ti ti-bell', title: '地震・津波の通知', body: '選んだ震度以上の地震、またはお住まいの都道府県で揺れが観測された地震を端末へ通知できます。津波警報・注意報の発表と解除も通知します。<br><br>都道府県名は通常この端末だけに保存します。地域だけの通知を有効にしたときに限り、通知の判定に必要な都道府県名を旗鯖へ保存します。市区町村や現在地は送りません。', link: '/earthquake', linkLabel: '通知を設定する' },
		],
	},
	{
		id: 'beta', iconClass: 'ti ti-flask', label: copy.categoryBeta,
		docs: [
			{ iconClass: 'ti ti-flask', title: entries.betaOverviewTitle, body: entries.betaOverviewBody, tips: [entries.betaOverviewTip1], link: '/hatafeed', linkLabel: entries.betaOverviewLink },
		],
	},
];

const filteredCategories = computed(() => {
	const q = searchQuery.value.toLowerCase().trim();
	const catFilter = activeCat.value;
	let filtered = categories;
	if (catFilter) filtered = filtered.filter(c => c.id === catFilter);
	if (!q) return filtered;
	return filtered.map(cat => ({
		...cat,
		docs: cat.docs.filter(doc =>
			doc.title.toLowerCase().includes(q) ||
			doc.body.toLowerCase().includes(q) ||
			(doc.tips && doc.tips.some(t => t.toLowerCase().includes(q))),
		),
	})).filter(cat => cat.docs.length > 0);
});
</script>

<style lang="scss" scoped>
.htk-docs-root{position:relative;min-height:100dvh;overflow:hidden;color:var(--MI_THEME-fg)}
.htk-docs-root[data-mode="dark"]{color:rgba(255,255,255,.92)}
.htk-docs-root[data-mode="light"]{color:rgba(0,0,0,.88)}
.htk-docs-bg{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none}
.htk-docs-orb{position:absolute;border-radius:50%;filter:blur(80px);opacity:.18;animation:htkDocFloat 20s ease-in-out infinite}
.htk-docs-orb.a{width:350px;height:350px;background:rgba(232,168,124,.4);top:-60px;left:-40px}
.htk-docs-orb.b{width:300px;height:300px;background:rgba(133,205,202,.35);bottom:-50px;right:-30px;animation-delay:-8s}
@keyframes htkDocFloat{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,-25px)}}
.htk-docs-content{position:relative;z-index:1;max-width:720px;margin:0 auto;padding:20px 16px 40px}
.htk-docs-title{font-size:1.3rem;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.htk-docs-search{margin-bottom:14px}
.htk-docs-inp{width:100%;padding:10px 16px;border-radius:14px;border:1px solid var(--MI_THEME-divider);background:color-mix(in srgb,var(--MI_THEME-panel) 80%,transparent);color:inherit;font-size:.9rem;outline:none;box-sizing:border-box}
.htk-docs-cats{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.htk-docs-cat{padding:5px 12px;border-radius:20px;border:1px solid var(--MI_THEME-divider);background:transparent;color:inherit;font-size:.78rem;cursor:pointer;transition:all .2s;font-family:inherit;display:flex;align-items:center;gap:4px}
.htk-docs-cat.on{background:var(--MI_THEME-accentedBg);color:var(--MI_THEME-accent);border-color:var(--MI_THEME-accent)}
.htk-docs-cat-hdr{font-size:.88rem;font-weight:700;margin:18px 0 8px;display:flex;align-items:center;gap:6px;opacity:.7}
.htk-docs-card{border-radius:14px;border:1px solid var(--MI_THEME-divider);background:color-mix(in srgb,var(--MI_THEME-panel) 60%,transparent);backdrop-filter:blur(8px);margin-bottom:8px;overflow:hidden;cursor:pointer;transition:all .2s}
.htk-docs-card:hover{background:color-mix(in srgb,var(--MI_THEME-panel) 80%,transparent)}
.htk-docs-card-hdr{display:flex;align-items:center;gap:8px;padding:12px 14px;font-weight:600;font-size:.88rem}
.htk-docs-card-title{flex:1}
.htk-docs-chev{opacity:.4;font-size:.85em}
.htk-docs-card-body{padding:0 14px 14px;font-size:.84rem;line-height:1.65;cursor:default}
.htk-docs-card-body :deep(ul){margin:6px 0;padding-left:20px}
.htk-docs-card-body :deep(li){margin:3px 0;font-size:.82rem}
.htk-docs-tips{margin-top:10px;padding:10px;border-radius:10px;background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.15)}
.htk-docs-tips-h{font-weight:600;font-size:.8rem;margin-bottom:5px;display:flex;align-items:center;gap:4px;color:rgba(255,215,0,.8)}
.htk-docs-tips ul{margin:0;padding-left:18px}
.htk-docs-tips li{font-size:.78rem;margin:2px 0;opacity:.8}
.htk-docs-link{display:inline-block;margin-top:8px;padding:5px 14px;border-radius:10px;background:var(--MI_THEME-accentedBg);color:var(--MI_THEME-accent);font-size:.8rem;font-weight:600;text-decoration:none;cursor:pointer;transition:all .2s}
.htk-docs-link:hover{opacity:.8}
.htk-docs-footer{margin-top:24px;font-size:.72rem;opacity:.4;text-align:center;line-height:1.5}
</style>
