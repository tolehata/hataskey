/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

function readFrontendFile(relativePath: string): string {
	return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('HataSNSCordUIの結線', () => {
	const page = readFrontendFile('src/pages/hatacording-ui.vue');
	const commonBoot = readFrontendFile('src/boot/common.ts');
	const settingsComponent = readFrontendFile('src/components/HatacordingUiSettings.vue');
	const hataCustom = readFrontendFile('src/pages/settings/hata-custom.vue');
	const tutorialCopy = readFrontendFile('src/utility/hatacording-copy.ts');
	const beta = readFrontendFile('src/pages/hatafeed-beta.vue');
	const router = readFrontendFile('src/router.definition.ts');
	const feature = readFrontendFile('src/utility/hatafeed.ts');
	const storage = readFrontendFile('src/local-storage.ts');
	const combined = [page, beta, router, feature, storage].join('\n');

	test('表示名・保存キーを統一し、選択中はルートURLで起動する', () => {
		const boot = readFrontendFile('src/boot/main-boot.ts');
		const rootUi = readFrontendFile('src/ui/hatacording.vue');
		expect(combined).toContain('HataSNSCordUI');
		// 旧URLは既存ブックマーク用の互換入口としてだけ残す。
		expect(combined).toContain('/hatafeed/hatacording-ui');
		expect(combined).toContain('hatacordingUi:${string}');
		expect(boot).toContain("case 'hatacording':");
		expect(boot).toContain("rootComponent = await import('@/ui/hatacording.vue')");
		expect(rootUi).toContain("import('@/pages/hatacording-ui.vue')");
		expect(rootUi).toContain('<HatacordingUi/>');
	});

	test('最新ロールを取得し、HataFeed権限と独立したHataSNSCordUI権限で制限する', () => {
		expect(router).toContain('component: page(() => import(\'@/pages/hatacording-ui.vue\'))');
		expect(router).not.toContain('$i?.policies.canAccessHataFeed && $i?.policies.canUseHatacordingUi');
		expect(page).toContain('await refreshCurrentAccount()');
		expect(page).toContain('if (!$i.policies.canUseHatacordingUi)');
		expect(page).not.toContain('!prefs.value.enabled');
		expect(page).not.toContain('$i.policies.canAccessHataFeed || !$i.policies.canUseHatacordingUi');
	});

	test('HataSNSCordUI所有画面だけをLucide Animatedへ統一する', () => {
		const composerToolsMenuPath = path.join(process.cwd(), 'src/components/HatacordingComposerToolsMenu.vue');
		const composerToolsMenu = fs.existsSync(composerToolsMenuPath) ? fs.readFileSync(composerToolsMenuPath, 'utf8') : '';
		const animatedIconSources = [
			'src/components/HatacordingRateLimitDialog.vue',
			'src/components/HatacordingTutorial.vue',
			'src/components/HatacordingVisibilityPicker.vue',
			'src/components/MkUISetup.vue',
			'src/pages/hatacording-ui.vue',
		].map(readFrontendFile);
		expect(page).toContain("from '@/components/hatacording-icons/index.js'");
		expect(page).not.toMatch(/class=["'][^"']*\bti\s+ti-/);
		for (const source of animatedIconSources) {
			expect(source).not.toContain('lucide-vue-next');
			expect(source).not.toContain("from '@lucide/vue'");
			expect(source).toContain("from '@/components/hatacording-icons/index.js'");
		}
		expect(composerToolsMenu).not.toContain('lucide-vue-next');
		expect(composerToolsMenu).not.toContain("from '@lucide/vue'");
		expect(composerToolsMenu).toContain('<component :is="tool.icon"');
		// pqoqubbw/icons に同義の絵がない操作だけは、意味を壊さず Lucide へ戻す。
		const iconRegistry = readFrontendFile('src/components/hatacording-icons/index.ts');
		expect(iconRegistry).toContain("} from '@lucide/vue';");
		expect(iconRegistry).toContain('\tGamepad2,');
		expect(iconRegistry).toContain('\tMegaphone,');
		expect(iconRegistry).toContain('export const Star = animated(SparklesIcon);');
		expect(iconRegistry).not.toContain("Gamepad2 } from './ChessKnightIcon.vue'");
		expect(iconRegistry).not.toContain("Megaphone } from './BellElectricIcon.vue'");
		expect(composerToolsMenu).toContain(':class="$style.label"');
		expect(page).toContain(':class="$style.visibilityLabel"');
		expect(composerToolsMenu).toContain('.tool > .label');
		expect(page).toContain('.visibilityButton .visibilityLabel');
		expect(composerToolsMenu).not.toContain('.tool > span');
		expect(page).not.toContain('.visibilityButton span');
		expect(page).toContain(":data-animation=\"animationEnabled ? 'true' : 'false'\"");
		expect(page).toContain('const animationEnabled = computed(() => prefer.r.animation.value);');
		// HataFeed と Hataskey UI の共有領域は今回の差し替え対象外。
		expect(beta).toContain("from '@lucide/vue'");
		expect(readFrontendFile('src/components/MkUISetup.vue')).toMatch(/<section :class="\$style\.cordChoice" :data-animation=/);
		expect(readFrontendFile('src/components/MkUISetup.vue')).not.toMatch(/<div :class="\$style\.root" :data-animation=/);
	});

	test('HataSNSCordUIのワードマークはHataskeyと同じRighteousを使う', () => {
		const tutorial = readFrontendFile('src/components/HatacordingTutorial.vue');
		expect(page).toContain('src: url(\'/client-assets/Righteous-Regular.woff2\') format(\'woff2\')');
		expect(page).toContain('font-family: \'HataSNSCordRighteous\'');
		expect(tutorial).toContain("font-family:'HataSNSCordRighteous',system-ui,sans-serif");
		expect(tutorial).not.toContain('font-family:Righteous');
	});

	test('本文は自己ホストしたNoto Sans JP可変フォントを使い、小サイズ向けの描画設定を持つ', () => {
		expect(page).toContain("import '@fontsource-variable/noto-sans-jp/wght.css'");
		expect(page).toContain("font-family:'Noto Sans JP Variable','Noto Sans JP',system-ui,-apple-system,'Segoe UI',sans-serif");
		expect(page).toContain('font-synthesis:none');
		expect(page).toContain('-webkit-font-smoothing:antialiased');
		expect(page).not.toContain('@fontsource/biz-udpgothic');
	});

	test('実API操作へ連動する共通レートリミット円と詳細表示を持つ', () => {
		const api = readFrontendFile('src/utility/misskey-api.ts');
		const drive = readFrontendFile('src/utility/drive.ts');
		const dialog = readFrontendFile('src/components/HatacordingRateLimitDialog.vue');
		const baseRoles = readFrontendFile('src/pages/admin/roles.vue');
		const roleEditor = readFrontendFile('src/pages/admin/roles.editor.vue');
		expect(page).toContain(':class="$style.rateLimitButton"');
		expect(page).toContain('openRateLimitDetails');
		expect(api).toContain('HATACORDING_RATE_LIMIT_REQUEST_HEADER');
		expect(api).toContain('updateHatacordingRateLimit(res.headers)');
		expect(drive).toContain("xhr.setRequestHeader(HATACORDING_RATE_LIMIT_REQUEST_HEADER, '1')");
		expect(dialog).toContain('copy.remaining');
		expect(dialog).toContain('_rateLimit.resetInHoursMinutes');
		expect(dialog).toContain('_rateLimit.resetInMinutesSeconds');
		expect(dialog).toContain('_rateLimit.resetInSeconds');
		expect(dialog).toContain('effectiveStatus.unlimited');
		expect(baseRoles).toContain('policies.canBypassHatacordingUiRateLimit');
		expect(roleEditor).toContain('role.policies.canBypassHatacordingUiRateLimit');
	});

	test('レート制限通知は投稿フォーム直上に置き、リセット時刻を表示する', () => {
		const composerDock = page.indexOf('<div :class="$style.composerDock">');
		const rateLimitNotice = page.indexOf('v-if="timelineErrorKind === \'rateLimit\'"', composerDock);
		const postForm = page.indexOf('<div :class="$style.postFormPill"', composerDock);
		expect(page).toContain('v-if="timelineErrorKind === \'generic\'"');
		expect(rateLimitNotice).toBeGreaterThan(composerDock);
		expect(postForm).toBeGreaterThan(rateLimitNotice);
		expect(page).toContain('rateLimitResetText');
		expect(readFrontendFile('../../locales/ja-JP.yml')).toContain('bannerResetAt: "{time}にリセットされます"');
		expect(readFrontendFile('../../locales/en-US.yml')).toContain('bannerResetAt: "Resets at {time}"');
		expect(readFrontendFile('../../locales/zh-CN.yml')).toContain('bannerResetAt: "将在 {time} 重置"');
	});

	test('投稿欄へフォーカスしてもフォーム外枠を公開範囲色で強調しない', () => {
		expect(page).toContain('<div :class="$style.postFormPill">');
		expect(page).not.toContain('visibilityBorderStyle');
		expect(page).not.toContain('composerInputFocused');
	});

	test('独立UI・下が最新の会話表示・右ペイン遷移タブを結線する', () => {
		const simple = readFrontendFile('src/ui/simple.vue');
		const rootUi = readFrontendFile('src/ui/hatacording.vue');
		const note = readFrontendFile('src/components/MkNote.vue');
		expect(simple).not.toContain('isHataSNSCordUiPage');
		expect(simple).not.toContain('HatacordingUi');
		expect(simple).not.toContain('standaloneApp');
		expect(rootUi).toContain("const HatacordingUi = defineAsyncComponent(() => import('@/pages/hatacording-ui.vue'))");
		expect(rootUi).toContain('<XCommon/>');
		expect(rootUi).toContain('provide(DI.router, mainRouter)');
		expect(page).toContain('notes.value = [...result].reverse()');
		expect(page).toContain('notes.value.push(note)');
		expect(page).toContain('new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()');
		expect(page).toContain('<TransitionGroup :name="animationEnabled ? \'hatacording-feed\' : \'\'"');
		expect(page).not.toContain('.hatacording-feed-move');
		expect(page).not.toMatch(/hatacording-feed-(?:enter-from|leave-to)[^}]*transform:/s);
		expect(page).toContain('reuseSubpaneTab');
		expect(page).toContain('getAccountMenu');
		expect(page).toContain('<MkNote :note=');
		expect(page).toContain(':withHardMute="true"');
		expect(page).toContain(':class="$style.embeddedNote"');
		expect(page).toContain('@click="onEmbeddedNoteClick');
		expect(page).not.toContain('@click.capture="onEmbeddedNoteClick');
		expect(page).toContain("target.closest('a, button, input, textarea, select, [role=\"button\"], [contenteditable=\"true\"]')");
		// ⚠️入力欄以外でキャレットが出る不具合が何度も再発しているため、UI全体で止めたうえで
		//   本物の入力欄だけ戻す指定が消えていないことを検査で固定する。
		expect(page).toContain('.root{caret-color:transparent}');
		expect(page).toContain('.root input,.root textarea,.root [contenteditable="true"]{caret-color:auto}');
		expect(page).toContain("new CustomEvent('hatacording-open-user'");
		expect(page).toContain("window.addEventListener('simple-user-panel', onHatacordingSimpleUserPanel)");
		expect(simple).toContain('<XCommon v-model:widgetsShowing="widgetsShowing"/>');
		expect(page).toContain(':class="$style.noteAvatarButton"');
		expect(page).toContain('<MkAvatar :user="entry.note!.user" :class="$style.noteAvatar"/>');
		expect(page).toContain("provide('inLocalTimeline', inLocalTimeline)");
		expect(page).toContain("provide('inChannel', inChannel)");
		expect(page).toContain("provide('currentAntenna', currentAntenna)");
		expect(page).toContain("provide('noteBubbleEnabled', noteBubbleEnabled)");
		expect(page).toContain("provide('noteTimelineGlassBg', noteTimelineGlassBg)");
		expect(page).toContain("provide('tl_withSensitive', tlWithSensitive)");
		expect(page).toContain('FullNotificationsPage');
		expect(page).toContain('FullSearchPage');
		expect(page).toContain('FullAnnouncementsPage');
		expect(page).toContain('FullExternalNotificationsPage');
		expect(page).toContain('FullFavoritesPage');
		expect(page).toContain('FullClipsPage');
		expect(page).toContain('FullChatPage');
		expect(page).toContain("const paneRouter = createRouter('/timeline')");
		expect(page).toContain('<RouterView :router="paneRouter"/>');
		expect(page).toContain("provide(DI.router, paneRouter)");
		expect(page).toContain("provide('linkNavigationBehavior', null)");
		expect(page).toContain('outerRouter.navHook = hatacordingOuterNavHook');
		expect(page).toContain('if (outerRouter.navHook === hatacordingOuterNavHook) outerRouter.navHook = previousOuterNavHook');
		expect(page).toContain("if (path === '/' || path === '/hatafeed/hatacording-ui')");
		expect(page).toContain("if (path === '/hata-side-studio')");
		expect(page).toContain("if (item.to) { openCenterPage(item.to, item.label); return; }");
		expect(page).toContain("import('@/components/MkLaunchPad.vue')");
		expect(page).toContain("if (menuEditing.value && !sidebarCollapsed.value)");
		// このUI専用に機能を写経せず、実運用のMkNoteを使うことで旗鯖拡張も同時に維持する。
		expect(note).toContain('<MkReactionsViewer');
		expect(note).toContain('@click.stop="showMenu()"');
		expect(note).toContain('utageState');
		expect(note).toContain('deliveryTargets');
		expect(note).toContain('allowRenoteToExternal');
		expect(note).toContain('currentAntenna');
	});

	test('中央ペイン内の既存ページも注入ルーターを使い、外側のUIへ抜けない', () => {
		const navigationSources = [
			'src/components/global/MkPageHeader.vue',
			'src/components/global/CPPageHeader.vue',
			'src/components/global/MkStickyContainer.vue',
			'src/pages/HataskSettings.vue',
			'src/pages/emoji-shoot.vue',
			'src/pages/emoji-shoot.game.vue',
			'src/pages/external-notifications.vue',
			'src/pages/hata-docs.vue',
			'src/pages/hatady.vue',
			'src/pages/lookup.vue',
			'src/pages/my-groups/group.vue',
			'src/pages/my-lists/list.vue',
			'src/pages/page-editor/page-editor.vue',
			'src/pages/settings/hata-custom.vue',
			'src/pages/share.vue',
			'src/pages/user/index.vue',
		].map(readFrontendFile);
		for (const source of navigationSources) expect(source).toContain('useRouter');
		expect(page).toContain("paneRouter.navHook = (fullPath) =>");
		expect(page).toContain('Nirax の replaceByPath は navHook を通らない');
		expect(page).toContain("openCenterPage('/settings', copy.settings)");
		expect(page).toContain("openCenterPage('/admin', copy.controlPanel)");
		expect(page).toContain('@click="backCenterPage"');
		expect(page).toContain("function leaveHatacordingUi(path: string)");
		expect(page).toContain("leaveHatacordingUi('/')");
	});

	test('右ペインは検索条件・通知フィルタを含む既存のフル機能ページを埋め込む', () => {
		const search = readFrontendFile('src/pages/search.vue');
		const notifications = readFrontendFile('src/pages/notifications.vue');
		expect(search).toContain("target === 'note'");
		expect(search).toContain("noteScope === 'user'");
		expect(search).toContain('rangeStartAt');
		expect(search).toContain('rangeEndAt');
		expect(notifications).toContain('headerTabs');
		expect(notifications).toContain('setFilter');
		expect(notifications).toContain("notifications/mark-all-as-read");
	});

	test('Bot通知と人間の通知を現在表示・履歴・キャッシュ復元で分離する', () => {
		expect(page).toContain('sharesHatacordingNotificationAudience(event, pending)');
		expect(page).toContain('newestNotificationCandidateForAudience(pending)');
		expect(page).toContain('turnBotNotificationIntoGroup(pending)');
		expect(page).toContain('pending.text = notificationSummaryText(1, true, false)');
		expect(page).toContain("notification-history:cached:${botOrigin ? 'bot' : 'human'}");
		expect(page).toContain("notification-history:${botOrigin ? 'bot' : 'human'}:${now}");
		expect(page).toContain('copy.currentBotNotificationsSuffix');
		expect(page).toContain('copyx.pastBotNotifications(params)');
	});

	test('外部通知は未連携時に通信や自動遷移をせず、サブペイン内で案内する', () => {
		expect(page).toContain("activeRightTab.kind === 'externalNotifications' && !externalAccount");
		expect(page).toContain('copy.externalAccountNotConnected');
		expect(page).toContain('copy.externalAccountNotConnectedDescription');
		expect(page).toContain("activeRightTab.kind === 'externalNotifications' && externalAccount");
		expect(page).toContain("if (item.id === 'tool:externalNotifications') { openExternalNotifications(); return; }");
		expect(page).toContain("if (event.kind === 'external' || event.to === '/my/external-notifications') {");
		expect(page).toContain('openExternalNotifications();');
		expect(page).toContain('const account = externalAccount.value;\n\tif (!account) {');
		expect(page).toContain("callExternalApi('i/notifications', { limit: 20, markAsRead: false }, account)");
	});

	test('投稿欄を二段フローに置き、クリック選択式の星メニューと標準投稿の安全処理を維持する', () => {
		const popupMenu = readFrontendFile('src/components/MkPopupMenu.vue');
		const menu = readFrontendFile('src/components/MkMenu.vue');
		expect(page).toContain(':class="$style.composerDock"');
		expect(page).not.toContain('$style.postFormOverlay');
		expect(page).not.toContain('.postFormOverlay');
		expect(page).toContain("getPluginHandlers('post_form_action')");
		expect(page).toContain('@click="openComposerToolsMenu"');
		expect(page).toContain("import HatacordingComposerToolsMenu from '@/components/HatacordingComposerToolsMenu.vue'");
		expect(page).toContain('os.popup(HatacordingComposerToolsMenu');
		expect(page).toContain('aria-controls="hatacording-composer-tools-menu"');
		expect(page).not.toContain('v-if="composerToolsOpen" :class="$style.composerTools"');
		expect(page).toContain(':class="$style.composerActionRow"');
		expect(page).toContain("submitMotionState.value = 'sending'");
		expect(page).toContain("submitMotionState.value = 'success'");
		expect(page).toContain("submitMotionState.value = 'failure'");
		expect(popupMenu).toContain(':zPriority="\'high\'"');
		expect(popupMenu).toContain(':max-height="maxHeight"');
		expect(popupMenu).toContain(':motionPreset="motionPreset"');
		expect(menu).toContain('overflow: auto;');
		expect(page).toMatch(/\.composerDock\s*\{[^}]*background:\s*transparent;/s);
		expect(page).toContain("getPluginHandlers('note_post_interruptor')");
		expect(page).toContain('<MkEventEditor');
		expect(page).toContain('chooseFileFromPcAndUpload');
		expect(page).toContain('chooseDriveFile');
		expect(page).toContain('chooseFileFromUrl');
		expect(page).toContain('showNoAltTextWarning');
		expect(page).toContain('pollExpiration');
		expect(page).toContain('expiredAfter: pollExpiredAfterValue');
		expect(page).toContain("globalEvents.emit('notePosted', created)");
		expect(page).toContain('<component :is="sendIcon" v-else :size="17"/>');
		expect(page).toContain('<component :is="cancelIcon" v-if="submitMotionState === \'countdown\'" :size="15"/>');
		expect(page).toContain('<component :is="sendingIcon" v-else-if="submitMotionState === \'sending\'"');
		expect(page).toContain('<component :is="successIcon" v-else-if="submitMotionState === \'success\'"');
		expect(page).toContain('<component :is="failureIcon" v-else-if="submitMotionState === \'failure\'"');
		expect(page).toContain("new Autocomplete(composerInput.value, draftText)");
		expect(page).toContain("composerAutocomplete?.detach()");
		expect(page).toContain(':class="$style.recipientEditor"');
		expect(page).toContain('copy.mentionsMissingRecipients');
		expect(page).toContain('rememberLabel: copy.rememberVisibility');
		expect(page).toContain("prefer.commit('rememberNoteVisibility', value)");
		expect(page).toContain("visibility: effectiveVisibility.value");
		expect(page).toContain("localOnly: effectiveLocalOnly.value");
		expect(page).toContain("composerChannel.value ? 'public' : visibility.value");
		expect(page).toContain('0 14px 34px var(--cordShadow)');
		expect(page).toContain('copy.channelVisibilityFixed');
		expect(page).toContain(':aria-pressed="cwEnabled"');
		expect(page).not.toContain("text: cwEnabled.value ? 'CWを解除' : 'CWを使う'");
		expect(page).toContain('text: copy.chooseComposerShortcuts');
		expect(page).toContain('activeComposerShortcuts');
		expect(page).toContain('text: copy.frequentButtonsMaxTwo');
		expect(page).toContain(':class="$style.composerShortcutInline"');
		expect(page).not.toContain(':class="$style.composerShortcutRail"');
		expect(page).toContain(':aria-label="copy.insertCustomEmoji"');
		expect(page).toMatch(/<textarea[^>]+@input="resizeComposerInput"[^>]*><\/textarea>/s);
		expect(page).toMatch(/:class="\$style\.composerActionRow"[\s\S]+:aria-label="copy\.insertCustomEmoji"[^>]+@click="openComposerEmojiPicker"/s);
		expect(page).toContain('composerInput.value?.setSelectionRange(caret, caret)');
		expect(page).toContain("input.style.height = 'auto'");
		expect(page).toContain('Math.min(input.scrollHeight, maxHeight)');
		expect(page).toMatch(/\.pillInput\s*\{[^}]*min-height:\s*42px;[^}]*max-height:\s*150px;/s);
		expect(page).toContain(':aria-label="copy.postPreview"');
		expect(page).toContain('<Mfm :text="draftText" :author="$i" :nyaize="\'respect\'"/>');
		expect(page).toMatch(/\.composerPreview\s*\{[^}]*max-height:\s*156px;[^}]*overflow:\s*hidden;/s);
		expect(page).toMatch(/\.composerPreviewBody\s*\{[^}]*overflow:\s*auto;[^}]*pointer-events:\s*none;/s);
		expect(page.indexOf('postDelay.sendNow')).toBeLessThan(page.indexOf(':aria-label="copy.postPreview"'));
		expect(page).toContain('v-if="prefs.showCharacterCounter"');
		expect(settingsComponent).toContain('copy.showCharacterCounter');
		expect(settingsComponent).toContain('copy.showShimmerAnimation');
		expect(page).toContain('<XPostFormAttaches v-model="draftFiles"');
		expect(page).toContain('@changeSensitive="updateDraftFileSensitive"');
		expect(page).toContain('@changeName="updateDraftFileName"');
		const osSource = readFrontendFile('src/os.ts');
		expect(osSource).toContain('export function registerPostFormInterceptor');
		expect(osSource).toContain('export function postDirect');
		expect(page).toContain('os.registerPostFormInterceptor(adoptPostFormRequest)');
		expect(page).toContain('function adoptPostFormRequest(props: PostFormProps)');
		expect(page).toContain('void os.postDirect({');
		expect(page).toContain('channelId: composerChannel.value?.id');
		expect(page).toContain('data-hatacording-reply-target-avatar');
		expect(page).toContain(':class="$style.composerContextAvatarFrame"');
		expect(page).toContain(':class="$style.composerContextAvatar"');
		expect(page).toContain('{{ composerContextExcerpt }}');
		expect(page).toMatch(/\.composerContext > \.composerContextAvatarFrame\s*\{[^}]*width:\s*24px;[^}]*min-width:\s*24px;[^}]*max-width:\s*24px;[^}]*height:\s*24px;[^}]*min-height:\s*24px;[^}]*max-height:\s*24px;[^}]*flex:\s*0 0 24px;[^}]*aspect-ratio:\s*1;/s);
		expect(page).toMatch(/\.composerContext > \.composerContextAvatarFrame > \.composerContextAvatar\s*\{[^}]*max-width:\s*100%;[^}]*max-height:\s*100%;[^}]*aspect-ratio:\s*1;/s);
		expect(page).toMatch(/\.composerContextCopy\s*\{[^}]*max-width:\s*100%;[^}]*font-size:\s*\.68rem;[^}]*line-height:\s*1\.25;/s);
	});

	test('星メニューを標準ポップアップ層の縦スワイプピッカーにし、PCは5項目・スマホは4項目を表示する', () => {
		const menuPath = path.join(process.cwd(), 'src/components/HatacordingComposerToolsMenu.vue');
		const composerToolsMenu = fs.existsSync(menuPath) ? fs.readFileSync(menuPath, 'utf8') : '';
		const rootRule = composerToolsMenu.match(/\.root\s*\{[^}]*\}/s)?.[0] ?? '';
		const compactRule = composerToolsMenu.match(/\.root\[data-compact='true'\]\s*\{[^}]*\}/s)?.[0] ?? '';
		const scrollRule = composerToolsMenu.match(/\.scroll\s*\{[^}]*\}/s)?.[0] ?? '';
		const toolRule = composerToolsMenu.match(/\.tool\s*\{[^}]*\}/s)?.[0] ?? '';
		const labelRule = composerToolsMenu.match(/\.tool > \.label\s*\{[^}]*\}/s)?.[0] ?? '';
		const anchorRule = page.match(/\.composerToolsMenuAnchor\s*\{[^}]*\}/s)?.[0] ?? '';
		const interactiveRule = composerToolsMenu.match(/\.tool:is\(:hover, :focus-visible\),[\s\S]*?\.tool\[data-expanded='true'\]\s*\{[^}]*\}/s)?.[0] ?? '';

		expect(composerToolsMenu).not.toBe('');
		expect(composerToolsMenu).toContain(':anchorElement="anchorElement"');
		expect(composerToolsMenu).toContain(':preferType="\'popup\'"');
		expect(composerToolsMenu).toContain(':transparentBg="true"');
		expect(composerToolsMenu).toContain(':returnFocusTo="returnFocusTo"');
		expect(composerToolsMenu).toContain('@click="closeMenu"');
		expect(composerToolsMenu).toContain('@esc="closeMenu"');
		expect(composerToolsMenu).toContain('id="hatacording-composer-tools-menu"');
		expect(composerToolsMenu).toContain('role="menu"');
		expect(composerToolsMenu).toContain('v-slot="{ maxHeight }"');
		expect(composerToolsMenu).toContain('v-for="tool in tools"');
		expect(composerToolsMenu).toContain('@click="emit(\'select\', tool.id, $event)"');
		expect(page).toContain('compact: isCompact');
		expect(page).toContain('showing: composerToolsOpen');
		expect(rootRule).toMatch(/--visible-items:\s*5;/);
		expect(rootRule).toMatch(/--tool-row-height:\s*48px;/);
		expect(rootRule).toMatch(/width:\s*min\(240px,\s*calc\(100dvw - 24px\)\);/);
		expect(compactRule).toMatch(/--visible-items:\s*4;/);
		expect(scrollRule).toMatch(/height:\s*calc\(var\(--visible-items\) \* var\(--tool-row-height\) \+ \(var\(--visible-items\) - 1\) \* var\(--tool-gap\)\);/);
		expect(scrollRule).toMatch(/overflow-y:\s*auto;/);
		expect(scrollRule).toMatch(/scroll-snap-type:\s*y mandatory;/);
		expect(scrollRule).toMatch(/overscroll-behavior:\s*contain;/);
		expect(scrollRule).toMatch(/touch-action:\s*pan-y;/);
		expect(toolRule).toMatch(/height:\s*var\(--tool-row-height\);/);
		expect(toolRule).toMatch(/min-height:\s*44px;/);
		expect(toolRule).toMatch(/font-size:\s*\.75rem;/);
		expect(toolRule).toMatch(/scroll-snap-align:\s*start;/);
		expect(labelRule).toMatch(/text-overflow:\s*clip;/);
		expect(labelRule).not.toMatch(/text-overflow:\s*ellipsis;/);
		expect(page).toContain('ref="composerToolsMenuAnchor"');
		expect(page).toContain('const composerToolsMenuAnchor = useTemplateRef(\'composerToolsMenuAnchor\');');
		expect(page).toContain('const dock = menuAnchor.offsetParent;');
		expect(page).toContain('menuAnchor.style.left = `${triggerRect.left + (triggerRect.width / 2) - dockRect.left}px`;');
		expect(page).toContain('anchorElement: popupAnchor');
		expect(page).toContain('returnFocusTo: trigger');
		expect(anchorRule).toMatch(/position:\s*absolute;/);
		expect(anchorRule).toMatch(/top:\s*0;/);
		expect(anchorRule).toMatch(/bottom:\s*0;/);
		expect(anchorRule).toMatch(/width:\s*0;/);
		expect(anchorRule).toMatch(/pointer-events:\s*none;/);
		expect(interactiveRule).not.toMatch(/\b(?:width|max-width|min-width|height|max-height|min-height|opacity|transform|position|left|right|top|bottom)\s*:/);
		expect(composerToolsMenu).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.tool\s*\{[^}]*transition:\s*none;/s);
		expect(page).toContain('disposeComposerToolsPopup?.();');
	});

	test('テーマ・UI倍率・リアルタイム切替を共通設定へ集約し、設定タブと同期する', () => {
		expect(page).toContain(':data-ui-scale="prefs.uiScale"');
		expect(settingsComponent).toContain("{ id: 'small', label: copy.small }");
		expect(settingsComponent).toContain("{ id: 'medium', label: copy.medium }");
		expect(settingsComponent).toContain("{ id: 'large', label: copy.large }");
		expect(settingsComponent).toContain("{ id: 'theme', label: copy.theme }");
		expect(settingsComponent).toContain('data-hatacording-ui-scale-selector');
		expect(settingsComponent).toContain('preferences.timelineRealtime');
		expect(settingsComponent).toContain(".root[data-color-mode='dark'] .activeChoice");
		expect(settingsComponent).toMatch(/\.choiceBar\s*\{[^}]*grid-auto-rows:\s*28px;[^}]*align-items:\s*stretch;/s);
		expect(settingsComponent).toMatch(/\.choice\s*\{[^}]*height:\s*28px;[^}]*min-height:\s*28px;[^}]*max-height:\s*28px;[^}]*place-items:\s*center;[^}]*line-height:\s*1;/s);
		expect(settingsComponent).toMatch(/\.choice\[data-active='true'\]:hover,[\s\S]*?background: var\(--MI_THEME-accent\);[\s\S]*?color: var\(--MI_THEME-fgOnAccent\);/);
		expect(settingsComponent).toMatch(/\.root\[data-color-mode='dark'\] \[data-hatacording-ui-scale-selector\] \.choice\[data-active='true'\]:hover,[\s\S]*?background: color-mix\(in srgb, var\(--MI_THEME-accent\) 68%, #202632\);[\s\S]*?color: #fff;/);
		expect(page).toContain("{ type: 'component', component: HatacordingUiSettings");
		expect(page).toContain('window.addEventListener(HATACORDING_UI_PREFERENCES_CHANGE_EVENT, syncHatacordingPreferences)');
		expect(page).not.toContain(':class="$style.colorSwitcher"');
		expect(page).not.toContain('@click="toggleTimelineRealtime"');
		expect(page).toContain('if (!prefs.value.timelineRealtime) return;');
		expect(page).toContain('enqueueActivity(createTimelineRealtimeActivity(prefs.value.timelineRealtime)');
		expect(page).not.toContain("os.toast(prefs.value.timelineRealtime ? 'リアルタイム更新を開始しました'");
		expect(page).toContain(".root[data-ui-scale='small']");
		expect(page).toContain(".root[data-ui-scale='large']");
		// ⚠️末尾に hatakyuAsset 等が増えても壊れないよう、id/icon/label までを照合する。
		expect(hataCustom).toContain("{ id: 'glassUi', icon: 'ti ti-layout-dashboard', label: 'UI'");
		expect(hataCustom).toContain('<HatacordingUiSettings :accountId="$i.id"/>');
		expect(tutorialCopy).toContain('tutorial.step3Body');
		expect(page).toMatch(/\[data-hatacording-ui-scale-selector\] button\[data-active='true'\]\s*\{[^}]*background:[^}]*!important;[^}]*color:\s*#fff !important;/s);
	});

	test('レート制限は操作を塞がない小型表示にし、復活前の再試行を止める', () => {
		expect(page).toContain('v-if="timelineErrorKind === \'generic\'" :class="$style.timelineError"');
		expect(page).toContain('v-if="timelineErrorKind === \'rateLimit\'" :class="$style.composerRateLimit"');
		expect(page).toContain("const timelineRetryBlocked = computed(() => timelineErrorKind.value === 'rateLimit' && effectiveRateLimit.value?.unlimited !== true && effectiveRateLimit.value?.remaining === 0)");
		expect(page).toContain('if (timelineRetryBlocked.value) return;');
		expect(page).toContain("timelineErrorKind.value = 'rateLimit';");
		expect(page).toContain("window.addEventListener('unhandledrejection', onHatacordingUnhandledRejection, { capture: true })");
		expect(page).toContain("window.removeEventListener('unhandledrejection', onHatacordingUnhandledRejection, { capture: true })");
		expect(page).toContain('event.preventDefault();');
		expect(commonBoot).toContain('if (event.defaultPrevented) return;');
		expect(page).not.toContain('loadError && feedEntries.length === 0');
		expect(page).toMatch(/\.timelineError\s*\{[^}]*min-height:\s*0;[^}]*padding:\s*8px 10px;/s);
		expect(page).toMatch(/\.composerRateLimit\s*\{[^}]*width:\s*min\(100%, 700px\);[^}]*padding:\s*8px 10px;/s);
	});

	test('通知・地震津波履歴を期限付き端末キャッシュから復元し、相対日時を表示する', () => {
		const cache = readFrontendFile('src/utility/hatacording-activity-cache.ts');
		expect(cache).toContain('HATACORDING_ACTIVITY_CACHE_MAX = 80');
		expect(cache).toContain('HATACORDING_ACTIVITY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000');
		expect(page).toContain('restoreActivityHistory();');
		expect(page).toContain('writeHatacordingActivityCache($i.id, entries)');
		expect(page).toContain('if (elapsed < 10_000) return copy.justNow');
		expect(page).toContain('if (elapsed < 120_000) return copy.momentsAgo');
		expect(page).toContain(':class="$style.activityTime"');
		expect(page).toContain(':class="$style.activityGroupTime"');
	});

	test('既存ノートの全更新経路をUI内リアルタイム設定へ接続する', () => {
		const capture = readFrontendFile('src/composables/use-note-capture.ts');
		const externalNote = readFrontendFile('src/components/MkExternalNote.vue');
		expect(page).toContain("provide('forceNoteRealtimeCapture', computed(() => prefs.value.timelineRealtime))");
		expect(capture).toContain("inject<MaybeRef<boolean>>('forceNoteRealtimeCapture', false)");
		expect(capture).toContain('store.s.realtimeMode || unref(forceRealtimeCapture)');
		for (const updateType of ['reacted', 'unreacted', 'pollVoted', 'updated', 'utageStatusUpdated', 'deleted']) {
			expect(capture).toContain(`case '${updateType}'`);
		}
		expect(page).toContain("useGlobalEvent('noteDeleted', removeTimelineNote)");
		expect(page).toContain("useGlobalEvent('noteRemovedFromAntenna'");
		expect(page).toContain("externalTimelineSocket.send(JSON.stringify({ type: 'subNote'");
		expect(page).toContain("if (data.type === 'noteUpdated') handleExternalNoteUpdated");
		expect(page).toContain('streamGeneration !== externalTimelineStreamGeneration || !prefs.value.timelineRealtime');
		expect(page).toContain('@reactionChanged="onExternalReactionChanged"');
		expect(externalNote).toContain('watch(() => appearNote.value.reactions');
	});

	test('リスト・アンテナ・チャンネル表示中は関連設定への動線をヘッダーに出す', () => {
		expect(page).toContain('v-if="!centerPageOpen && activeCollectionSettings"');
		expect(page).toContain('`/my/lists/${item.sourceId}`');
		expect(page).toContain('`/my/antennas/${item.sourceId}`');
		expect(page).toContain('`/channels/${item.sourceId}/edit`');
		expect(page).toContain('function openActiveCollectionSettings()');
	});

	test('暗色モードのHataFeed通知パネルは操作ボタンを反転させない', () => {
		const notifications = readFrontendFile('src/components/HataFeedNotifications.vue');
		expect(notifications).toContain('data-hatacording-hatafeed-notifications');
		expect(page).toContain("html[data-hatacording-color-mode='dark'] [data-hatacording-hatafeed-notifications]");
		expect(page).toMatch(/\[data-hatacording-hatafeed-notifications\] button\s*\{[^}]*color:\s*inherit !important;[^}]*filter:\s*none !important;[^}]*mix-blend-mode:\s*normal !important;/s);
	});

	test('メディア操作は投稿詳細のサブペイン捕捉より先に標準ビューアへ渡す', () => {
		expect(page).toContain("target.closest('img, video, audio, canvas, [data-marker], [data-is-hidden]')");
		expect(page).toContain("focusableMedia?.querySelector(':scope > div > img, :scope > div > video')");
	});

	test('レートリミット円はヘッダー用の小さな26px表示にする', () => {
		expect(page).toMatch(/\.rateLimitButton\s*\{[^}]*width:\s*26px;[^}]*height:\s*26px;[^}]*flex:\s*0 0 26px;/s);
	});

	test('レートリミット円は外円と内円の重ね描きを避け、均一なSVGストロークで描く', () => {
		expect(page).toContain(':class="$style.rateLimitRing" viewBox="0 0 26 26"');
		expect(page).toContain(':class="$style.rateLimitTrack" cx="13" cy="13" r="10.25" pathLength="100"');
		expect(page).toContain(':class="$style.rateLimitProgress" cx="13" cy="13" r="10.25" pathLength="100"');
		expect(page).toMatch(/\.rateLimitTrack,\s*\.rateLimitProgress\s*\{[^}]*stroke-width:\s*2\.5;[^}]*vector-effect:\s*non-scaling-stroke;/s);
		expect(page).toMatch(/\.rateLimitProgress\s*\{[^}]*stroke-dasharray:\s*100;[^}]*stroke-dashoffset:\s*var\(--rate-limit-offset\);/s);
		expect(page).not.toMatch(/\.rateLimitButton\s*\{[^}]*conic-gradient/s);
		expect(page).not.toContain('.rateLimitButton::before');
	});

	test('もっと！は項目本体を直接起動し、上部への復元操作と分離する', () => {
		expect(page).toContain('@click="handleMoreItem(item)"');
		expect(page).toContain('@click="restoreMenuItem(item)"');
		expect(page).toContain('showMore.value = false;\n\tvoid activateMenuItem(item);');
		expect(page).not.toContain('if (menuEditing.value) restoreMenuItem(item);');
		expect(page).toContain('@click="saveMenuEditing"');
	});

	test('縮小メニューは全項目を中央配置し、コレクションを縦メニューから直接開く', () => {
		expect(page).toMatch(/\.root\[data-sidebar-collapsed='true'\] \.feedbackButton\s*\{[^}]*display:\s*grid;[^}]*place-items:\s*center;/s);
		expect(page).toContain('os.popupMenu(items, anchor, { width: 240 })');
		expect(page).toContain('function openCollectionIconMenu');
		expect(page).toContain('if (!menuEditing.value || sidebarCollapsed.value) return;');
		expect(page).toContain('@click="openCollectionIconMenu(group, $event)"');
		expect(page).toContain('menuEditing.value = false;');
	});

	test('UI切り替えはHataskと異なるステッキアイコンを使う', () => {
		expect(page).toContain("{ id: 'tool:ui', label: copy.switchUi, icon: WandSparkles");
		expect(page).toContain("{ id: 'tool:hatask', label: 'Hatask', icon: LayoutDashboard");
	});

	test('サイドメニュー編集には明示的な保存完了操作がある', () => {
		expect(page).toContain('@click="saveMenuEditing"');
		expect(page).toContain('{{ copy.saveAndFinish }}');
		expect(page).toContain('os.toast(copy.menuSaved)');
	});

	test('縮小順取込ボタンは狭い左ペインでもUI名の後で改行する', () => {
		expect(page).toContain('<span>Hataskey UI<br/>{{ copy.importCollapsedOrder }}</span>');
		expect(page).toMatch(/\.editActions\s*\{[^}]*flex-wrap:\s*wrap;/s);
	});

	test('左ペインを細身にし、標準タイムライン設定とチュートリアル再実行を提供する', () => {
		expect(page).toMatch(/\.leftPane\s*\{\s*flex-basis:\s*208px;/s);
		expect(page).toContain("{ type: 'switch', text: copy.showRenotes, ref: timelineWithRenotes }");
		expect(page).toContain("{ type: 'switch', text: copy.showSensitiveFiles, ref: timelineWithSensitive }");
		expect(page).toContain("{ type: 'switch', text: copy.onlyPostsWithFiles, ref: timelineOnlyFiles }");
		expect(page).toContain("{ type: 'switch', text: copy.showPostForm, ref: timelineShowFixedPostForm }");
		expect(page).toContain("{ type: 'button', text: copy.replayTutorial");
		expect(page).not.toContain("text: copy.launchHataSideStudio");
		expect(page).toContain("const tlWithSensitive = computed(() => store.r.tl.value.filter.withSensitive)");
	});

	test('モバイルの両端スワイプと右ペイン一覧の独立スクロールを持つ', () => {
		expect(page).toContain('@touchstart.passive="onMobileEdgeTouchStart"');
		expect(page).toContain('@touchend.passive="onMobileEdgeTouchEnd"');
		expect(page).toContain('@touchcancel.passive="onMobileEdgeTouchCancel"');
		expect(page).toContain('function onMobileEdgeTouchCancel()');
		expect(page).toContain("if (start.edge === 'left' && deltaX > 0) openLeftPane()");
		expect(page).toContain("if (start.edge === 'right' && deltaX < 0) openRightPane()");
		expect(page).toContain('rightPaneOpen.value = false;\n\tdrawerOpen.value = true;');
		expect(page).toContain('drawerOpen.value = false;\n\tprefs.value.rightPaneCollapsed = false;');
		expect(page).not.toContain("(start.edge === 'right' && deltaX < 0)) drawerOpen.value = true");
		expect(page).toMatch(/\.subpaneTimeline\s*\{[^}]*overflow-y:\s*auto;/s);
		expect(page).toMatch(/\.subpaneContent\s*\{[^}]*min-height:\s*0;[^}]*flex:\s*1;/s);
		expect(page).toContain('@click="selectRightTab(tab)"');
		expect(page).toContain("scroller?.scrollTo({ top: 0, behavior: prefer.s.animation ? 'smooth' : 'auto' })");
	});

	test('モバイルのサブペイン追加は横へ二列展開せず、一列ずつ選択する', () => {
		expect(page).toContain('if (isCompact.value) {\n\t\tvoid openCompactAddTabMenu(anchor, standardTimelines);');
		expect(page).toContain('async function openCompactAddTabMenu');
		expect(page).toContain('action: () => selectChild(copy.timelines, timelineSelectionItems(standardTimelines))');
		expect(page).toContain("{ type: 'label', text: copyx.chooseCollection({ collection: selectedChildMenu.label }) }");
		expect(page).toContain('Math.max(220, Math.min(360, (rootEl.value?.clientWidth ?? window.innerWidth) - 24))');
	});

	test('レートリミット案内は活用可能回数と満杯状態を自然な文言で示す', () => {
		const dialog = readFrontendFile('src/components/HatacordingRateLimitDialog.vue');
		expect(dialog).toContain('return copy.ready');
		expect(dialog).toContain('_rateLimit.availableCount');
		expect(dialog).not.toContain('回動けます');
	});

	test('会話吹き出しは外側アバターと専用チャンネル色帯を含み、横幅内に収める', () => {
		expect(page).toContain('grid-template-columns: var(--cord-note-avatar-size) minmax(0, 1fr) 25px');
		expect(page).toContain('\'--cord-channel-color\': entry.note!.channel.color');
		expect(page).toContain('.noteBubble[data-channel=\'true\']::after');
		expect(page).toContain('[data-hatacording-note][data-channel=\'true\'] > div > article > div > div > div:first-child');
		expect(page).toContain('display: none !important;');
		expect(page).toContain('grid-template-columns: var(--cord-note-avatar-size) minmax(0, 1fr);');
		expect(page).toContain('grid-template-columns: minmax(0, 1fr) var(--cord-note-avatar-size);');
	});

	test('ライトモードの自分の吹き出しは白に近い色で、吹き出し口とも色を揃える', () => {
		expect(page.match(/background: #f8f9fb;/g)).toHaveLength(2);
		expect(page).not.toContain('background: #e8ecf2;');
		expect(page.match(/#7c8798 22%/g)).toHaveLength(2);
	});

	test('新着ノート案内は後段の色指定でも文字と背景のコントラストを失わない', () => {
		expect(page).toMatch(/\.jumpHasNew\s*\{[^}]*background:\s*color-mix\([^}]*var\(--cordPanel\)\);[^}]*color:\s*var\(--cordFg\);/s);
		expect(page).toMatch(/\.jumpHasNew\s*>\s*:is\(svg, \[data-hatacording-animated-icon\]\):first-child\s*\{[^}]*color:\s*var\(--MI_THEME-accent\);/s);
	});

	test('テーマ切替はページ内とテレポート先を同期し、ローカルな描画順に閉じる', () => {
		const userHome = readFrontendFile('src/pages/user/home.vue');
		const userPopup = readFrontendFile('src/components/MkUserPopup.vue');
		const emojiPicker = readFrontendFile('src/components/MkEmojiPicker.vue');
		const emojiSection = readFrontendFile('src/components/MkEmojiPicker.section.vue');
		expect(settingsComponent).toContain("{ id: 'theme', label: copy.theme");
		expect(settingsComponent).toContain("{ id: 'light', label: copy.light");
		expect(settingsComponent).toContain("{ id: 'dark', label: copy.dark");
		expect(page).toContain("data-hatacording-color-mode");
		expect(page).toContain('clearDocumentColorMode()');
		expect(page).toContain('isolation: isolate');
		expect(page).toContain("html[data-hatacording-color-mode='dark'] ._popupAcrylic");
		expect(page).toContain('background: rgb(24 28 37 / 96%) !important');
		expect(page).toContain('--menuHoverBg: #303849');
		expect(page).toContain('--MI_THEME-divider: #515c70');
		expect(page).toContain('color: #bbc4d2');
		expect(userHome).toContain('data-hatacording-profile-action');
		expect(userPopup.match(/data-hatacording-user-popup-action/g)).toHaveLength(3);
		expect(emojiPicker).toContain('data-hatacording-emoji-picker');
		expect(emojiPicker).toContain('data-hatacording-emoji-heading');
		expect(emojiSection).toContain('data-hatacording-emoji-heading');
		expect(page).toContain("html[data-hatacording-color-mode='dark'] [data-hatacording-profile-action]");
		expect(page).toContain("html[data-hatacording-color-mode='dark'] [data-hatacording-emoji-picker] [data-hatacording-emoji-heading]");
		expect(page).not.toMatch(/100v[hw]/);
	});

	test('HataSNSCordUIの表示中だけ既存・新規の標準通知トーストを抑止する', () => {
		const common = readFrontendFile('src/ui/_common_/common.vue');
		const external = readFrontendFile('src/components/MkExternalNotificationToastContainer.vue');
		expect(page).toContain('acquireNotificationToastSuppression()');
		expect(page).toContain('releaseToastSuppression?.()');
		expect(common).toContain('v-if="!notificationToastsSuppressed"');
		expect(common).toContain('if (suppressed) notifications.value = []');
		expect(common).toContain('!shouldSuppressNotificationToasts()');
		expect(external).toContain('v-if="!notificationToastsSuppressed"');
		expect(external).toContain('if (suppressed) toasts.value = []');
		expect(external).toContain('if (shouldSuppressNotificationToasts()) return');
	});

	test('標準の切断UIをこの画面だけ抑止し、設定別shimmerと再接続操作へ置き換える', () => {
		const boot = readFrontendFile('src/boot/main-boot.ts');
		const indicator = readFrontendFile('src/ui/_common_/stream-indicator.vue');
		expect(page).toContain('acquireServerDisconnectUiSuppression()');
		expect(page).toContain('releaseDisconnectUiSuppression?.()');
		expect(page).toContain("stream.on('_disconnected_', onServerDisconnected)");
		expect(page).toContain("stream.on('_connected_', onServerConnected)");
		expect(page).toContain("lastDisconnectBehavior === 'reload' ? reconnectServer : undefined");
		expect(page).toContain('entry.activity!.id === activeDisconnectActivityId');
		expect(boot).toContain('if (shouldSuppressServerDisconnectUi()) return;');
		expect(indicator).toContain('!serverDisconnectUiSuppressed && hasDisconnected');
		expect(indicator).toContain('if (shouldSuppressServerDisconnectUi()) return;');
	});

	test('単独通知は行全体をshimmer後に縮小し、集約通知はshimmerなしで保持する', () => {
		const userName = readFrontendFile('src/components/global/MkUserName.vue');
		const avatar = readFrontendFile('src/components/global/MkAvatar.vue');
		expect(page).toContain('const ACTIVITY_REVEAL_MS = 700;');
		expect(page).toContain('const ACTIVITY_EXPANDED_HOLD_MS = 3000;');
		expect(page).toContain('const ACTIVITY_SHIMMER_MS = 6500;');
		expect(page).toContain('await activityWait(ACTIVITY_EXPANDED_HOLD_MS);');
		expect(page).toContain('animation: hatacordingTextShimmer 3.2s cubic-bezier(.3,.58,.28,1) 2;');
		expect(page).toContain('animation: hatacordingWholeActivityShimmer 3.2s cubic-bezier(.3,.58,.28,1) 2;');
		expect(page).toContain('.activityShimmering .activityMain');
		expect(page).toContain('const playShimmer = prefs.value.showFoilAnimation && !event.notificationItems?.length;');
		expect(page).toContain('entry.activity!.phase === \'highlighting\' && prefs.showFoilAnimation && !entry.activity!.notificationItems?.length && $style.activityShimmering');
		expect(page).not.toContain('void playActivityAnimation(archive, false);');
		expect(page).not.toContain('void playActivityAnimation(historyEvent, false);');
		const shimmerRule = page.match(/\.activityShimmering \.activityShimmerText\s*\{[^}]*\}/s)?.[0] ?? '';
		expect(shimmerRule).toContain('background-clip: text;');
		expect(shimmerRule).toContain('var(--cordShimmerPeak)');
		expect(shimmerRule).not.toContain('var(--MI_THEME-accent)');
		expect(page).toContain('<MkAvatar :user="entry.activity!.user" :class="$style.activityActorAvatar" :forceShowDecoration="true"/>');
		expect(page).toContain('<MkUserName :user="entry.activity!.user" :enableEmojiMenu="true"/>');
		expect(page).toContain('<Mfm :text="entry.activity!.action || entry.activity!.text" :author="activityMfmAuthor(entry.activity!)" :plain="true" :nowrap="true" :nyaize="false" :emojiUrls="activityEmojiUrls(entry.activity!)" :enableEmojiMenu="true"/>');
		expect(page).toContain('<MkAvatar :user="item.user" :class="$style.activityActorAvatar" :forceShowDecoration="true"/>');
		expect(page).toContain('<MkUserName :user="item.user" :enableEmojiMenu="true"/>');
		expect(page).toContain('<Mfm :text="item.action || item.text" :author="activityMfmAuthor(item)" :plain="true" :nowrap="true" :nyaize="false" :emojiUrls="activityEmojiUrls(item)" :enableEmojiMenu="true"/>');
		expect(page).toContain('for (const source of [activity.user?.emojis, activity.note?.emojis, activity.note?.reactionEmojis, activity.emojiUrls])');
		expect(page).toContain('result[reactionName] = activity.reactionEmojiUrl;');
		expect(page).toContain("result[reactionName.split('@', 1)[0]] = activity.reactionEmojiUrl;");
		expect(userName).toContain('<Mfm :text="userName(user)" :author="user" :plain="true" :nowrap="nowrap" :emojiUrls="user.emojis" :enableEmojiMenu="enableEmojiMenu"/>');
		expect(avatar).toContain('v-for="decoration in decorations ?? user.avatarDecorations"');
		expect(avatar).toContain('const showDecoration = (props.forceShowDecoration || prefer.s.showAvatarDecorations)');
		expect(page).toContain('entry.activity!.detail && !isNotificationActivity(entry.activity!)');
		expect(page).toContain("entry.activity!.notificationItems?.length || (entry.activity!.detail && !isNotificationActivity(entry.activity!))");
		expect(page).not.toContain('.activityShimmering .activityTitle');
		expect(page).toContain('--cordShimmerRest: color-mix(in srgb, var(--MI_THEME-fg) 58%, var(--MI_THEME-bg));');
		expect(page).toContain('--cordShimmerSoft: color-mix(in srgb, var(--MI_THEME-fg) 76%, var(--MI_THEME-accent) 24%);');
		expect(page).toContain('--cordShimmerPeak: color-mix(in srgb, var(--MI_THEME-fg) 94%, #fff 6%);');
		expect(page).toMatch(/\.activitySource\s*\{[^}]*padding:\s*0;[^}]*border-radius:\s*0;[^}]*background:\s*transparent;/s);
		expect(page).not.toContain('.activityHighlighting::after');
		expect(page).not.toContain('hatacordingFoil');
		const activityEventRule = page.match(/\.activityEvent\s*\{[^}]*\}/gs)?.at(-1) ?? '';
		const activityGroupRule = page.match(/\.activityGroupList\s*\{[^}]*\}/s)?.[0] ?? '';
		const transparentContainersRule = page.match(/\.activityBlock,[\s\S]*?\.activityGroupItem\s*\{[^}]*\}/s)?.[0] ?? '';
		for (const transparentContainerRule of [activityEventRule, activityGroupRule]) {
			expect(transparentContainerRule).toContain('border: 0;');
			expect(transparentContainerRule).toContain('border-radius: 0;');
			expect(transparentContainerRule).toContain('background: transparent;');
			expect(transparentContainerRule).toContain('box-shadow: none;');
			expect(transparentContainerRule).toContain('backdrop-filter: none;');
		}
		expect(transparentContainersRule).toContain('border: 0 !important;');
		expect(transparentContainersRule).toContain('border-radius: 0 !important;');
		expect(transparentContainersRule).toContain('background: transparent !important;');
		expect(transparentContainersRule).toContain('box-shadow: none !important;');
		expect(transparentContainersRule).toContain('backdrop-filter: none !important;');
		expect(activityEventRule).toContain('padding: 3px 2px;');
		expect(activityGroupRule).toContain('padding: 2px 0;');
		expect(page).toMatch(/\.activityGroupItem:hover,[\s\S]*?background:\s*transparent;/s);
		expect(page).not.toContain('<MkReactionIcon');
		expect(page).toContain("event.expanded = false;\n\tevent.phase = 'settled';");
		expect(page).toContain('const NOTIFICATION_ARCHIVE_AGE_MS = 120_000;');
		expect(page).toContain('@wheel.passive="markTimelineScrollInteraction"');
		expect(page).toContain('@touchstart.passive="markTimelineScrollInteraction"');
		expect(page).toContain('@pointerdown="onTimelinePointerDown"');
		expect(page).toContain('archiveNotifications(Date.now(), true)');
		expect(page).toContain('window.setInterval(() => archiveNotifications(), 5000)');
		expect(page).toContain('const notifications = current.filter(isNotificationActivity);');
		expect(page).toContain('const incoming = audienceTargets.flatMap(flattenedNotifications);');
		expect(page).toContain('if (incoming.length === 0) continue;');
		expect(page).toContain('&& (includeRecent || now - new Date(event.createdAt).getTime() >= NOTIFICATION_ARCHIVE_AGE_MS)');
		expect(page).toContain('if (!timelineScrollInteractionPending) return;');
		expect(page).toContain('window.setTimeout(() => {\n\t\ttimelineScrollInteractionPending = false;');
		expect(page).toContain('if (timelineScrollInteractionTimer != null) window.clearTimeout(timelineScrollInteractionTimer);');
		expect(page).toContain("if (notification.type === 'earthquake') return;");
		expect(page).toContain("stream.on('earthquakeEvent', onEarthquakeEvent)");
	});

	test('地震・津波の続報は通常通知と混ぜず即時グループ化し、地震アイコンを併記する', () => {
		expect(page).toContain('const EARTHQUAKE_GROUP_WINDOW_MS = 30_000;');
		expect(page).toContain('return activity.kind === \'earthquake\' || activity.kind === \'tsunami\';');
		expect(page).toContain('function mergeConsecutiveEarthquake(pending: PendingActivityEvent): boolean');
		expect(page).toContain('if (isEarthquakeActivity(pending) && mergeConsecutiveEarthquake(pending)) return;');
		expect(page).toContain('const groupLabel = hatacordingEarthquakeGroupLabel(target.notificationItems);');
		expect(page).toContain('target.text = `${target.notificationItems.length}件の${groupLabel}があります`;');
		expect(page).toContain('target.to = \'/earthquake\';');
		expect(page).toContain('target.emergency = true;');
		expect(page).toContain('<Activity v-if="isGroupedEarthquakeActivity(entry.activity!)"');
		expect(page).toContain('`件の${hatacordingEarthquakeGroupLabel(activity.notificationItems ?? [])}があります`');
		expect(page).toContain('.activityEarthquakeGroupIcon');
		expect(page).toContain('if (notification.type === \'earthquake\') return;');
	});

	test('右ペインは非同期フルページとウィジェットを固定幅の待機境界内で表示する', () => {
		expect(page).toContain('<Suspense :timeout="0">');
		expect(page).toContain(':class="$style.subpanePage"');
		expect(page).toContain('{{ copy.loadingSubpane }}');
		expect(page).toContain('{{ copy.addWidgetsPrompt }}');
		expect(page).toContain('@click="widgetEditing = true">{{ copy.startEditing }}</button>');
		expect(page).toMatch(/\.subpaneView\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*100%;[^}]*height:\s*100%;[^}]*overflow:\s*hidden;/s);
		expect(page).toMatch(/\.subpanePage\s*\{[^}]*max-width:\s*100%;[^}]*overflow-x:\s*hidden;[^}]*overflow-y:\s*auto;/s);
		expect(page).toMatch(/\.rightPane\s*\{[^}]*flex-shrink:\s*0;[^}]*overflow:\s*hidden;/s);
		expect(page).toContain("const activeRightTab = computed(() => rightTabs.value.find(tab => tab.id === activeRightTabId.value) ?? rightTabs.value[0] ?? null);");
		expect(page).toContain("activeRightTabId.value = rightTabs.value[0]?.id ?? '';");
		expect(page).toContain("const usedTabIds = new Set(['detail']);");
		expect(page).not.toMatch(/\bzoom:\s*[.\d]+/);
		expect(page).not.toContain('width: 111.111%');
		expect(page).not.toContain('width: 90.909%');
		expect(page).toMatch(/\.root\[data-ui-scale='small'\]\s*\{\s*font-size:\s*12px;/s);
		expect(page).toMatch(/\.root\[data-ui-scale='large'\]\s*\{\s*font-size:\s*14px;/s);
	});

	test('独立ダークテーマは埋め込み設定画面とポップアップのボタン配色も固定する', () => {
		expect(page).toMatch(/\.root\[data-color-mode='dark'\]\s*\{[^}]*--MI_THEME-buttonBg:\s*#252c38;[^}]*--MI_THEME-buttonHoverBg:\s*#303949;[^}]*--MI_THEME-fgOnAccent:\s*#fff;/s);
		expect(page).toMatch(/html\[data-hatacording-color-mode='dark'\] \._popup,[\s\S]*?--MI_THEME-buttonBg:\s*#2b3342;[\s\S]*?--MI_THEME-buttonHoverBg:\s*#394457;/);
	});

	test('2分後の通知集約カードは古い受信位置へ消えず、集約時刻で最新位置に残る', () => {
		expect(page).toContain('const archiveCreatedAt = new Date(now).toISOString();');
		expect(page).toContain('archive.createdAt = archiveCreatedAt;');
		expect(page).toContain('createdAt: archiveCreatedAt,');
		expect(page).not.toContain("incoming.map(item => item.createdAt).sort().at(-1)");
	});

	test('タッチ端末では向きに関係なく投稿を2列にして自分の吹き出しを固定幅列へ落とさない', () => {
		expect(page).toMatch(/@media \(hover: none\)[\s\S]*?\.noteRow\s*\{\s*grid-template-columns:\s*var\(--cord-note-avatar-size\) minmax\(0, 1fr\);[\s\S]*?\.ownNote\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\) var\(--cord-note-avatar-size\);/);
	});

	test('UIセットアップはHataskey UIの直後にHataSNSCordUIを通常候補として表示する', () => {
		const setup = readFrontendFile('src/components/MkUISetup.vue');
		const hatasabaIndex = setup.indexOf('{{ copy.continueHatasaba }}');
		const cordIndex = setup.indexOf('通常候補: HataSNSCordUI');
		const deprecatedIndex = setup.indexOf('その他のUI (非推奨)');
		expect(hatasabaIndex).toBeGreaterThanOrEqual(0);
		expect(cordIndex).toBeGreaterThan(hatasabaIndex);
		expect(deprecatedIndex).toBeGreaterThan(cordIndex);
		expect(setup).not.toContain('const showBeta = ref(false)');
		expect(setup).not.toContain('HataSNSCordUI ベータ');
		expect(setup).toContain('$style.cordMockLeft');
		expect(setup).toContain('$style.cordMockCenter');
		expect(setup).toContain('$style.cordMockRight');
		expect(setup).toContain('src="/client-assets/hatacording/mascot-shiba-v1.webp"');
		expect(setup).toContain(':class="$style.cordChoiceMascot"');
		expect(setup).toMatch(/\.cordChoiceMascot\s*\{[^}]*width:\s*72px;[^}]*height:\s*72px;[^}]*object-fit:\s*cover;/s);
		expect(setup).toMatch(/<img[\s\S]*?alt=""[\s\S]*?aria-hidden="true"/);
		expect(setup).toContain("font-family: 'Righteous'");
		expect(setup).toContain("src: url('/client-assets/Righteous-Regular.woff2') format('woff2')");
		expect(setup).toContain('const copy = i18n.ts._hata._uiSetup;');
		expect(setup).toContain('<span>{{ copy.useHatacording }}</span>');
		expect(setup).toMatch(/\.cordChoiceCta\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*20px minmax\(0, 1fr\) 20px;/s);
		expect(setup).toMatch(/\.cordChoiceCta span\s*\{[^}]*text-align:\s*center;/s);
		expect(setup).toContain('setHatacordingUiEnabled($i.id, true)');
		expect(setup).toContain("miLocalStorage.setItem('ui', 'hatacording')");
		expect(setup).toContain("window.location.assign('/')");
		expect(page).toContain("{ id: 'tool:ui', label: copy.switchUi");
		expect(page).toContain('function openUiSetup()');
		expect(page).toContain('@click="openUiSetup">{{ copy.openUiSwitcher }}</button>');
	});

	test('ポップアップ表示時は背景のキャレットとぼかし再合成を残さない', () => {
		const modal = readFrontendFile('src/components/MkModal.vue');
		const setup = readFrontendFile('src/components/MkUISetup.vue');
		expect(modal).toContain('tabindex="-1"');
		expect(modal).toContain('!modalRootEl.value.contains(window.document.activeElement)');
		expect(modal).toContain('modalRootEl.value.focus({ preventScroll: true });');
		expect(setup).toContain(':disableBgBlur="true"');
		expect(setup).toMatch(/\.root\s*\{[\s\S]*?caret-color:\s*transparent;/);
		expect(setup).not.toMatch(/<label\b[\s\S]*?<button\b/);
		expect(setup).toMatch(/\.root\s*\{[\s\S]*?-webkit-backdrop-filter:\s*none;[\s\S]*?backdrop-filter:\s*none;/);
		expect(page).toMatch(/html\[data-hatacording-color-mode\] :is\(\._modalBg, \._popup, \._popupAcrylic\)\s*\{[\s\S]*?-webkit-backdrop-filter:\s*none !important;[\s\S]*?backdrop-filter:\s*none !important;/);
	});

	test('HataSNSCord独自モーションだけを撤去し、共有UIと公開範囲パネルを保つ', () => {
		const motion = readFrontendFile('src/utility/hata-icon-motion.ts');
		const picker = readFrontendFile('src/components/HatacordingVisibilityPicker.vue');
		const simple = readFrontendFile('src/ui/simple.vue');
		expect(motion).toContain("notifications: 'bell-ring'");
		expect(motion).toContain("announcements: 'announcement-recoil'");
		expect(motion).toContain("followRequests: 'follow-emphasis'");
		expect(motion).toContain("cacheClear: 'cache-clear'");
		expect(motion).toContain("motion === 'more-dots'");
		expect(simple).toContain("playSimpleNavMotion($event, 'home'); goHome()");
		expect(simple).toContain("playSimpleNavMotion($event, 'notifications'); goToNotifications()");
		expect(page).not.toContain('playHataIconMotion');
		expect(page).not.toContain('playHataNavigationMotion');
		expect(page).not.toContain("from '@/utility/hata-icon-motion.js'");
		expect(page).toContain('os.popup(HatacordingVisibilityPicker');
		expect(page).toContain('colorMode: prefs.value.colorMode');
		expect(picker).toContain('grid-template-columns:repeat(2,minmax(0,1fr))');
		expect(picker).toContain('role="switch"');
		expect(picker).toContain(':data-color-mode="colorMode"');
		expect(picker).toContain(".root[data-color-mode='light']");
		expect(picker).toContain(".root[data-color-mode='dark']");
	});

	test('旧アイコン演出を撤去し、星メニューの常時ラベルとTL縦リビールを保つ', () => {
		const composerToolsMenu = readFrontendFile('src/components/HatacordingComposerToolsMenu.vue');
		expect(page).not.toContain('visibilityFlashIcon');
		expect(page).not.toContain('hatacording-visibility-flash');
		expect(page).not.toContain('$style.spinning');
		expect(page).not.toContain('$style.submitArc');
		expect(page).not.toContain('activityExpandOpen');
		expect(page).not.toContain('.rotated');
		expect(page).not.toContain('hatacording-submit-state');
		expect(composerToolsMenu).toContain('.tool > .label');
		expect(composerToolsMenu).not.toContain('.tool:hover > .label');
		expect(composerToolsMenu).not.toContain('.tool:hover > svg');
		expect(page).toContain('timelineSwitchRevealing');
		expect(page).toContain('@keyframes hatacordingTimelineLineIn');
		expect(page).toContain(':style="{ \'--cord-reveal-order\': timelineRevealOrder(entryIndex) }"');
	});
});
