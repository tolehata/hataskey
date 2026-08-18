<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: UI選択画面から利用する「HataSNSCordUI」。独立3ペインUIと端末ローカル設定。
-->
<template>
<div ref="rootEl" :class="$style.root" :data-hata-foldable="isFoldableWide ? 'true' : undefined" :data-compact="isCompact ? 'true' : 'false'" :data-sidebar-collapsed="sidebarCollapsed ? 'true' : 'false'" :data-right-collapsed="prefs.rightPaneCollapsed ? 'true' : 'false'" :data-color-mode="prefs.colorMode" :data-ui-scale="prefs.uiScale" :data-theme-changing="colorModeTransitioning ? 'true' : 'false'" @touchstart.passive="onMobileEdgeTouchStart" @touchend.passive="onMobileEdgeTouchEnd" @touchcancel.passive="onMobileEdgeTouchCancel">
	<button v-if="(isCompact && drawerOpen) || (rightPaneOverlay && rightPaneOpen)" type="button" :class="$style.scrim" :aria-label="copy.closePanels" @click="closeOverlays"></button>

	<aside :class="[$style.leftPane, drawerOpen && $style.drawerOpen]">
		<header :class="$style.serverHeader">
			<button type="button" :class="$style.serverButton" @click="openServerMenu">
				<img :src="instance.iconUrl || '/favicon.ico'" :class="$style.serverIcon" alt=""/>
				<span :class="$style.serverName">{{ instance.name || 'Hataskey' }}</span>
			</button>
			<div v-if="!sidebarCollapsed" :class="$style.serverActions">
				<button type="button" :class="$style.iconButton" :title="copy.timelineSettings" @click="openTimelineOptions"><SlidersHorizontal :size="16"/></button>
				<button v-if="!isCompact" type="button" :class="$style.iconButton" :title="copy.collapseMenu" @click="toggleSidebar"><PanelLeftClose :size="16"/></button>
				<button v-else type="button" :class="$style.iconButton" :title="copy.close" @click="drawerOpen = false"><X :size="16"/></button>
			</div>
		</header>
		<button v-if="sidebarCollapsed" type="button" :class="$style.expandButton" :title="copy.expandMenu" @click="toggleSidebar"><PanelLeftOpen :size="16"/></button>

		<div v-if="menuEditing && !sidebarCollapsed" :class="$style.editNotice">
			<div><strong>{{ copy.editMenuTitle }}</strong><span>{{ copy.editMenuDescription }}</span></div>
			<div :class="$style.editActions">
				<button type="button" :class="[$style.textButton, $style.copyOrderButton]" @click="copyCollapsedOrder"><Copy :size="14"/><span>HatasabaUI<br/>{{ copy.importCollapsedOrder }}</span></button>
				<button type="button" :class="$style.textButton" @click="resetMenu"><RefreshCw :size="14"/>{{ copy.reset }}</button>
				<button type="button" :class="$style.saveMenuButton" @click="saveMenuEditing"><Save :size="14"/>{{ copy.saveAndFinish }}</button>
			</div>
		</div>

		<nav :class="$style.menuList" :aria-label="copy.menuAria">
			<section :class="$style.menuSection">
				<div v-if="!sidebarCollapsed" :class="$style.sectionHeading">
					<h2 :class="$style.sectionTitle">{{ copy.timelines }}</h2>
					<button type="button" :class="$style.sectionAddButton" :title="copy.addTimeline" @click="openAddTimelineMenu"><Plus :size="13"/><span>{{ copy.add }}</span></button>
				</div>
				<MenuRow v-for="item in primaryTimelineItems" :key="item.id" :item="item"/>
			</section>
			<section :class="$style.menuSection">
				<h2 v-if="!sidebarCollapsed" :class="$style.sectionTitle">{{ copy.frequentFeatures }}</h2>
				<MenuRow v-for="item in primaryToolItems" :key="item.id" :item="item"/>
			</section>

			<section v-for="group in collectionGroups" :key="group.id" :class="$style.collectionSection">
				<div :class="$style.collectionHeaderRow">
					<button type="button" :class="$style.collectionHeader" @click="openCollection(group, $event)">
						<component :is="group.icon" :size="17"/><span v-if="!sidebarCollapsed">{{ group.label }}</span>
						<span v-if="!sidebarCollapsed" :class="$style.collectionCount">{{ group.items.length }}</span>
						<ChevronDown v-if="!sidebarCollapsed" :size="16" :class="prefs.collectionExpanded[group.id] && $style.rotated"/>
					</button>
					<button v-if="menuEditing && !sidebarCollapsed" type="button" :class="$style.collectionIconButton" :title="copyx.changeCategoryIcon({ category: group.label })" @click="openCollectionIconMenu(group, $event)"><SwatchBook :size="14"/></button>
				</div>
				<div v-if="!sidebarCollapsed && prefs.collectionExpanded[group.id]" :class="$style.collectionItems">
					<div v-if="group.items.length === 0" :class="$style.collectionEmpty">{{ copy.noneYet }}</div>
					<MenuRow v-for="item in group.items" :key="item.id" :item="item" compact/>
				</div>
			</section>

			<section :class="$style.moreSection">
				<button type="button" :class="$style.moreButton" @click="openMoreMenu"><MoreHorizontal :size="18"/><span v-if="!sidebarCollapsed">{{ copy.more }}</span></button>
				<div v-if="showMore && !sidebarCollapsed" :class="$style.morePanel">
					<div v-for="item in hiddenMenuItems" :key="item.id" :class="$style.moreItemRow">
						<button type="button" :class="$style.moreItem" @click="handleMoreItem(item)"><component :is="item.icon" :size="18"/><span>{{ item.label }}</span><ChevronRight :size="15"/></button>
						<button v-if="menuEditing" type="button" :class="$style.moreRestoreButton" :title="copyx.addToTopMenu({ item: item.label })" @click="restoreMenuItem(item)"><Plus :size="15"/><span>{{ copy.moveToTop }}</span></button>
					</div>
				</div>
				<button type="button" :class="$style.feedbackButton" :title="copy.createHataFeedIssue" @click="openFeedbackIssue"><MessageSquareWarning :size="17"/><span v-if="!sidebarCollapsed">{{ copy.sendFeedback }}</span></button>
			</section>
		</nav>

		<footer :class="$style.accountFooter">
			<button type="button" :class="$style.accountButton" :title="copy.accountMenu" @click="openAccountMenu">
				<MkAvatar :user="$i" :class="$style.avatar"/>
				<span v-if="!sidebarCollapsed" :class="$style.accountText"><MkUserName :user="$i"/><small>@{{ $i.username }}</small></span>
				<ChevronUp v-if="!sidebarCollapsed" :size="16"/>
			</button>
			<button v-if="!sidebarCollapsed" type="button" :class="$style.iconButton" :title="copy.settings" @click="openCenterPage('/settings', copy.settings)"><Settings :size="17"/></button>
			<button v-if="!sidebarCollapsed && ($i.isAdmin || $i.isModerator)" type="button" :class="$style.iconButton" :title="copy.controlPanel" @click="openCenterPage('/admin', copy.controlPanel)"><Shield :size="17"/></button>
		</footer>
	</aside>

	<main :class="$style.centerPane">
		<header :class="$style.timelineHeader">
			<button v-if="isCompact" type="button" :class="$style.iconButton" :title="copy.menu" @click="openLeftPane"><MenuIcon :size="18"/></button>
			<button v-if="centerPageOpen" type="button" :class="$style.iconButton" :title="centerPageHistory.length > 1 ? copy.backOnePage : copy.backToTimeline" @click="backCenterPage"><ArrowLeft :size="18"/></button>
			<div :class="$style.timelineTitle"><component :is="centerPageOpen ? Layers : (activeMenuItem?.icon || Activity)" :size="18"/><div><strong>{{ centerPageOpen ? centerPageTitle : (activeMenuItem?.label || copy.timelines) }}</strong><small v-if="centerPageOpen">{{ copy.shownInsideUi }}</small><small v-else><Circle :size="7" fill="currentColor"/> {{ copyx.onlineUsers({ count: onlineUsersCount.toString() }) }}</small></div></div>
			<div :class="$style.headerActions">
				<button type="button" :class="$style.rateLimitButton" :data-level="rateLimitLevel" :title="rateLimitTitle" :aria-label="rateLimitTitle" @click="openRateLimitDetails">
					<svg :class="$style.rateLimitRing" viewBox="0 0 26 26" aria-hidden="true">
						<circle :class="$style.rateLimitTrack" cx="13" cy="13" r="10.25" pathLength="100"/>
						<circle :class="$style.rateLimitProgress" cx="13" cy="13" r="10.25" pathLength="100" :style="rateLimitMeterStyle"/>
					</svg>
					<span v-if="prefs.showRateLimitNumber">{{ rateLimitMeterLabel }}</span>
				</button>
				<button v-if="!centerPageOpen && activeCollectionSettings" type="button" :class="$style.iconButton" :title="activeCollectionSettings.label" @click="openActiveCollectionSettings"><Settings :size="16"/></button>
				<button v-if="!centerPageOpen" type="button" :class="$style.iconButton" :title="copy.refresh" :disabled="fetching" @click="reloadTimeline"><RefreshCw :size="16" :class="fetching && $style.spinning"/></button>
				<button v-if="prefs.rightPaneCollapsed || rightPaneOverlay" type="button" :class="$style.iconButton" :title="copy.openSubpane" @click="openRightPane"><PanelRightOpen :size="18"/></button>
			</div>
		</header>

		<template v-if="!centerPageOpen">
		<div :class="$style.timelineViewport">
			<div
				ref="scrollEl"
				:class="$style.timelineScroll"
				@wheel.passive="markTimelineScrollInteraction"
				@touchstart.passive="markTimelineScrollInteraction"
				@pointerdown="onTimelinePointerDown"
				@scroll="onTimelineScroll"
			>
				<div v-if="fetching && feedEntries.length === 0" :class="$style.state"><LoaderCircle :size="24" :class="$style.spinning"/><span>{{ copy.loadingTimeline }}</span></div>
				<div v-else-if="loadError && feedEntries.length === 0" :class="$style.state"><CircleAlert :size="26"/><strong>{{ copy.timelineLoadFailed }}</strong><button type="button" :class="$style.primaryButton" @click="reloadTimeline">{{ copy.retry }}</button></div>
				<div v-else-if="feedEntries.length === 0" :class="$style.state"><Inbox :size="26"/><span>{{ copy.noNotes }}</span></div>
				<template v-else>
					<button v-if="notes.length > 0 && hasMore" type="button" :class="$style.historyLoader" :disabled="loadingMore" @click="loadMore"><span :class="$style.historyLine"></span><span :class="$style.historyLabel"><LoaderCircle v-if="loadingMore" :size="15" :class="$style.spinning"/><History v-else :size="15"/>{{ loadingMore ? copy.loadingPastConversations : copy.browsePastConversations }}</span><span :class="$style.historyLine"></span></button>
					<TransitionGroup name="hatacording-feed" tag="div" :class="$style.feedList">
						<template v-for="entry in feedEntries" :key="`${entry.id}:${prefs.timelineRealtime}`">
							<section v-if="entry.type === 'activity'" :class="$style.activityBlock">
								<article :class="[$style.activityEvent, entry.activity!.phase === 'revealing' && $style.activityRevealing, entry.activity!.phase === 'highlighting' && prefs.showFoilAnimation && !entry.activity!.notificationItems?.length && $style.activityShimmering, entry.activity!.emergency && $style.activityEmergency]" :data-phase="entry.activity!.phase">
									<button type="button" :class="$style.activityMain" :aria-label="activityAriaLabel(entry.activity!)" @click="openActivityEvent(entry.activity!)">
										<component :is="entry.activity!.icon" :size="16"/>
										<Activity v-if="isGroupedEarthquakeActivity(entry.activity!)" :size="15" :class="$style.activityEarthquakeGroupIcon" aria-hidden="true"/>
										<span :class="$style.activityCopy">
											<span :class="$style.activityTitle">
												<template v-if="entry.activity!.notificationItems?.length">
													<Transition name="hatacording-count" mode="out-in"><strong :key="entry.activity!.notificationItems!.length" :class="$style.activityCount">{{ entry.activity!.notificationItems!.length }}</strong></Transition><span>{{ groupedActivitySuffix(entry.activity!) }}</span>
												</template>
												<template v-else>
													<span v-if="entry.activity!.kind === 'external'" :class="$style.activitySource">{{ copy.external }}</span>
													<span v-if="entry.activity!.user" :class="$style.activityActor"><MkAvatar :user="entry.activity!.user" :class="$style.activityActorAvatar" :forceShowDecoration="true"/><MkUserName :user="entry.activity!.user" :enableEmojiMenu="true"/></span>
													<span :class="$style.activityShimmerText"><Mfm :text="entry.activity!.action || entry.activity!.text" :author="activityMfmAuthor(entry.activity!)" :plain="true" :nowrap="true" :nyaize="false" :emojiUrls="activityEmojiUrls(entry.activity!)" :enableEmojiMenu="true"/></span>
												</template>
											</span>
											<Transition name="hatacording-activity-detail"><span v-if="entry.activity!.expanded && entry.activity!.detail && !isNotificationActivity(entry.activity!)" :class="[$style.activityDetail, $style.activityShimmerText]">{{ entry.activity!.detail }}</span></Transition>
										</span>
										<time :class="$style.activityTime" :datetime="entry.activity!.createdAt" :title="activityAbsoluteTime(entry.activity!.createdAt)">{{ activityTimeLabel(entry.activity!.createdAt) }}</time>
									</button>
									<button v-if="entry.activity!.kind === 'connection' && entry.activity!.id === activeDisconnectActivityId" type="button" :class="$style.activityReconnect" :title="copy.reloadAndReconnect" @click.stop="reconnectServer"><RefreshCw :size="14"/><span>{{ copy.reconnect }}</span></button>
									<button v-if="entry.activity!.phase === 'settled' && (entry.activity!.notificationItems?.length || (entry.activity!.detail && !isNotificationActivity(entry.activity!)))" type="button" :class="$style.activityExpand" :title="entry.activity!.expanded ? copy.collapseDetails : copy.showDetails" :aria-expanded="entry.activity!.expanded" @click.stop="entry.activity!.expanded = !entry.activity!.expanded"><ChevronRight :size="15" :class="entry.activity!.expanded && $style.activityExpandOpen"/></button>
								</article>
								<TransitionGroup v-if="entry.activity!.notificationItems?.length && entry.activity!.expanded" name="hatacording-notification-group" tag="div" :class="$style.activityGroupList">
									<button v-for="item in entry.activity!.notificationItems" :key="item.id" type="button" :class="$style.activityGroupItem" @click.stop="activateActivity(item)">
										<component :is="item.icon" :size="15"/>
										<span v-if="item.user" :class="$style.activityActor"><MkAvatar :user="item.user" :class="$style.activityActorAvatar" :forceShowDecoration="true"/><MkUserName :user="item.user" :enableEmojiMenu="true"/></span>
										<span :class="$style.activityGroupCopy"><strong><Mfm :text="item.action || item.text" :author="activityMfmAuthor(item)" :plain="true" :nowrap="true" :nyaize="false" :emojiUrls="activityEmojiUrls(item)" :enableEmojiMenu="true"/></strong></span>
										<time :class="$style.activityGroupTime" :datetime="item.createdAt" :title="activityAbsoluteTime(item.createdAt)">{{ activityTimeLabel(item.createdAt) }}</time>
										<ChevronRight :size="14"/>
									</button>
								</TransitionGroup>
							</section>
							<article v-else-if="entry.external && externalAccount" :class="$style.externalNoteRow">
								<MkExternalNote :note="entry.note!" :host="externalAccount.host" :token="externalAccount.token" :class="$style.externalEmbeddedNote" @reactionChanged="onExternalReactionChanged" @noteDeleted="removeExternalNote"/>
							</article>
							<article v-else :class="[$style.noteRow, entry.note!.userId === $i.id && $style.ownNote]">
								<button type="button" :class="$style.noteAvatarButton" :title="copy.openProfile" @click.stop="openProfileTab(entry.note!.user)">
									<MkAvatar :user="entry.note!.user" :class="$style.noteAvatar"/>
								</button>
								<div data-hatacording-note :data-own="entry.note!.userId === $i.id ? 'true' : 'false'" :data-channel="entry.note!.channel ? 'true' : 'false'" :data-private-channel="entry.note!.channel?.isPrivate ? 'true' : 'false'" :class="$style.noteBubble" :style="entry.note!.channel ? { '--cord-channel-color': entry.note!.channel.color ?? 'var(--MI_THEME-accent)' } : undefined" @click="onEmbeddedNoteClick($event, entry.note!)">
									<MkNote :note="entry.note!" :withHardMute="true" :class="$style.embeddedNote"/>
								</div>
								<button type="button" :class="$style.noteOpenButton" :title="copy.openNoteInSubpane" @click="openNoteTab(entry.note!)"><Maximize2 :size="14"/></button>
							</article>
						</template>
					</TransitionGroup>
				</template>
			</div>

			<Transition name="hatacording-jump">
				<button v-if="showJumpControl || pendingNotes.length" type="button" :class="[$style.jumpControl, pendingNotes.length && $style.jumpHasNew]" @click="showPendingNotes">
					<Transition name="hatacording-jump-content" mode="out-in">
						<span :key="pendingNotes.length ? 'pending' : 'latest'" :class="$style.jumpContent">
							<Sparkles v-if="pendingNotes.length" :size="17"/><ArrowDownToLine v-else :size="17"/>
							<span>{{ pendingNotes.length ? copyx.newNotes({ count: pendingNotes.length.toString() }) : copy.backToLatest }}</span><ChevronDown :size="16"/>
						</span>
					</Transition>
				</button>
			</Transition>
		</div>

		<div :class="$style.composerDock">
			<div v-if="composerContext || composerChannel" :class="[$style.composerContext, (composerContext?.kind === 'channel' || composerChannel?.isPrivate) && $style.privateComposerContext]">
				<component :is="composerContextIcon" :size="15"/>
				<MkAvatar v-if="composerContext?.note" :user="composerContext.note.user" :class="$style.composerContextAvatar"/>
				<span :class="$style.composerContextCopy"><b>{{ composerContextLabel }}</b><small v-if="composerContextExcerpt">{{ composerContextExcerpt }}</small></span>
				<button v-if="composerContext" type="button" :title="copy.clearReplyOrQuote" @click="composerContext = null"><X :size="14"/></button>
			</div>
			<div v-if="!composerChannel && visibility === 'specified'" :class="$style.recipientEditor">
				<span :class="$style.recipientLabel"><AtSign :size="14"/>{{ copy.recipients }}</span>
				<div :class="$style.recipientList">
					<button v-for="user in visibleUsers" :key="user.id" type="button" :class="$style.recipientChip" :title="copyx.removeRecipient({ user: userAcct(user) })" @click="removeVisibleUser(user)"><MkAvatar :user="user"/><span><MkUserName :user="user"/><small>@{{ userAcct(user) }}</small></span><X :size="13"/></button>
					<button type="button" :class="$style.addRecipientButton" @click="pickMention"><Plus :size="14"/>{{ copy.addRecipient }}</button>
				</div>
			</div>
			<div v-if="!composerChannel && visibility === 'specified' && hasNotSpecifiedMentions" :class="$style.mentionNotice"><span>{{ copy.mentionsMissingRecipients }}</span><button type="button" @click="addMissingMentions">{{ copy.addToRecipients }}</button></div>
			<div v-if="cwEnabled" :class="$style.inlineEditor"><EyeOff :size="16"/><input v-model="cwText" maxlength="100" :placeholder="copy.cwReason"/></div>
			<div v-if="pollEnabled" :class="$style.pollEditor">
				<div v-for="(_, index) in pollChoices" :key="index"><input v-model="pollChoices[index]" :placeholder="copyx.pollChoice({ number: (index + 1).toString() })"/><button v-if="pollChoices.length > 2" type="button" @click="pollChoices.splice(index, 1)"><X :size="14"/></button></div>
				<button v-if="pollChoices.length < 10" type="button" @click="pollChoices.push('')"><Plus :size="15"/>{{ copy.addPollChoice }}</button>
				<label><input v-model="pollMultiple" type="checkbox"/>{{ copy.allowMultipleChoices }}</label>
				<div :class="$style.pollOptions">
					<label>{{ copy.deadline }}<select v-model="pollExpiration"><option value="infinite">{{ copy.none }}</option><option value="at">{{ copy.specifyDateTime }}</option><option value="after">{{ copy.specifyTimeAfterPosting }}</option></select></label>
					<input v-if="pollExpiration === 'at'" v-model="pollExpiresAt" type="datetime-local" :aria-label="copy.pollDeadlineDateTime"/>
					<template v-else-if="pollExpiration === 'after'">
						<input v-model.number="pollExpiredAfter" type="number" min="1" max="100000" :aria-label="copy.pollTimeUntilEnd"/>
						<select v-model="pollExpiredAfterUnit" :aria-label="copy.pollTimeUnit"><option value="second">{{ copy.seconds }}</option><option value="minute">{{ copy.minutes }}</option><option value="hour">{{ copy.hours }}</option><option value="day">{{ copy.days }}</option></select>
					</template>
				</div>
			</div>
			<MkEventEditor v-if="event" v-model="event" :class="$style.eventEditor" @destroyed="event = null"/>
			<XPostFormAttaches v-model="draftFiles" :class="$style.composerAttachments" @detach="removeDraftFile" @changeSensitive="updateDraftFileSensitive" @changeName="updateDraftFileName"/>
			<div v-if="postDelay.active.value" :class="$style.delayStatus"><span>{{ copyx.secondsRemaining({ seconds: postDelay.remainingSeconds.value.toString() }) }}</span><button type="button" @click="postDelay.sendNow">{{ copy.postNow }}</button></div>
			<Transition name="hatacording-composer-preview">
				<section v-if="draftText.trim().length > 0" :class="$style.composerPreview" :aria-label="copy.postPreview">
					<header :class="$style.composerPreviewHeader"><Sparkles :size="13"/><span>{{ copy.preview }}</span></header>
					<div :class="$style.composerPreviewBody"><Mfm :text="draftText" :author="$i" :nyaize="'respect'"/></div>
				</section>
			</Transition>
			<div :class="[$style.postFormPill, postDelay.active.value && $style.delayActive]" :style="[visibilityBorderStyle, postDelay.frameStyle.value]">
				<button type="button" :class="[$style.pillButton, composerToolsOpen && $style.pillActive]" :title="copy.postFeatures" aria-haspopup="menu" :aria-expanded="composerToolsOpen" @click="openComposerToolsMenu"><Star :size="18"/></button>
				<button type="button" :class="$style.pillButton" :title="copy.attachmentMenu" @click="openAttachmentMenu"><CloudUpload :size="18"/></button>
				<button type="button" :class="[$style.pillButton, cwEnabled && $style.pillActive]" :title="cwEnabled ? copy.disableCw : copy.enableCw" :aria-pressed="cwEnabled" @click="cwEnabled = !cwEnabled"><EyeOff :size="18"/></button>
				<div v-if="activeComposerShortcuts.length" :class="$style.composerShortcutInline" :aria-label="copy.frequentPostFeatures">
					<button v-for="shortcut in activeComposerShortcuts" :key="shortcut.id" type="button" :class="[$style.composerShortcutButton, isComposerShortcutActive(shortcut.id) && $style.composerShortcutActive]" :title="shortcut.label" :aria-label="shortcut.label" @click="runComposerShortcut(shortcut.id, $event)"><component :is="shortcut.icon" :size="15"/></button>
				</div>
				<textarea ref="composerInput" v-model="draftText" :class="$style.pillInput" rows="1" :placeholder="composerPlaceholder" @focus="composerInputFocused = true" @blur="composerInputFocused = false" @input="resizeComposerInput" @keydown.ctrl.enter.prevent="submitPost" @keydown.meta.enter.prevent="submitPost"></textarea>
				<button type="button" :class="$style.pillButton" :title="copy.insertCustomEmoji" :aria-label="copy.insertCustomEmoji" @click="openComposerEmojiPicker"><SmilePlus :size="18"/></button>
				<button type="button" :class="[$style.visibilityButton, localOnly && $style.localOnly]" :title="visibilityLabel" @click="openVisibilityMenu"><component :is="visibilityIcon" :size="17"/><span>{{ visibilityShortLabel }}</span></button>
				<div v-if="prefs.showCharacterCounter" :class="[$style.charCounter, characterCount > maxNoteLength && $style.counterOver]" :style="characterCounterStyle"><span>{{ maxNoteLength - characterCount }}</span></div>
				<button v-if="postDelay.active.value" type="button" :class="$style.sendButton" :title="copy.cancelWait" @click="postDelay.cancel"><Square :size="16" fill="currentColor"/></button>
				<button v-else type="button" :class="$style.sendButton" :title="copy.post" :disabled="!canSubmit" @click="submitPost"><ArrowUp :size="17"/></button>
			</div>
		</div>
		</template>
		<div v-else :class="$style.centerPageHost">
			<RouterView :router="paneRouter"/>
		</div>
	</main>

	<div v-if="!prefs.rightPaneCollapsed && !rightPaneOverlay" :class="$style.rightResizer" @pointerdown="startRightResize"></div>
	<aside :class="[$style.rightPane, rightPaneOpen && $style.rightPaneOpen, prefs.rightPaneCollapsed && !rightPaneOverlay && $style.rightPaneCollapsed]" :style="rightPaneStyle">
		<div v-if="rightPaneOverlay && rightPaneOpen" :class="$style.mobileRightResizer" role="separator" :aria-label="copy.resizeSubpane" aria-orientation="vertical" @pointerdown="startRightResize"><span></span></div>
		<header :class="$style.subpaneHeader">
			<div :class="$style.tabs" role="tablist">
				<div v-for="(tab, index) in rightTabs" :key="tab.id" :class="[$style.tabWrap, activeRightTab?.id === tab.id && $style.activeTab]" draggable="true" @dragstart="dragTabIndex = index" @dragover.prevent @drop="dropTab(index)">
					<button type="button" :class="$style.tab" @click="selectRightTab(tab)">{{ tab.title }}</button><button type="button" :class="$style.tabClose" :title="copy.closeTab" @click="closeRightTab(tab.id)"><X :size="13"/></button>
				</div>
			</div>
			<button type="button" :class="$style.iconButton" :title="rightTabs.length < subpaneMaxTabs ? copy.addContent : copy.replaceContent" @click="openAddTabMenu"><Plus :size="16"/></button>
			<button v-if="activeRightTab?.kind === 'widgets' && !widgetEditing" type="button" :class="$style.iconButton" :title="copy.editWidgets" @click="widgetEditing = true"><Pencil :size="16"/></button>
			<button v-if="activeRightTab?.kind === 'widgets' && widgetEditing" type="button" :class="$style.iconButton" :title="copy.importHatasabaWidgets" @click="importHatasabaWidgets(activeRightTab)"><Import :size="16"/></button>
			<button v-if="rightPaneOverlay" type="button" :class="$style.iconButton" :title="copy.close" @click="rightPaneOpen = false"><X :size="16"/></button>
			<button v-else type="button" :class="$style.iconButton" :title="copy.collapseSubpane" @click="collapseRightPane"><PanelRightClose :size="16"/></button>
		</header>

		<div ref="subpaneContent" :class="$style.subpaneContent">
			<Suspense :timeout="0">
				<template #default>
					<div :key="activeRightTab?.id ?? 'empty'" :class="$style.subpaneView">
					<div v-if="!activeRightTab" :class="$style.welcomePane"><div :class="$style.welcomeWordmark">HataSNSCordUI</div><strong>{{ copy.subpaneHere }}</strong><span>{{ copy.subpaneHereDescription }}</span></div>
					<div v-else-if="activeRightTab.kind === 'welcome'" :class="$style.welcomePane"><div :class="$style.welcomeWordmark">HataSNSCordUI</div><strong>{{ copy.welcomeSubpaneTitle }}</strong><span>{{ copy.welcomeSubpaneDescription }}</span></div>
						<MkNoteDetailed v-else-if="activeRightTab.kind === 'note' && activeRightTab.note" :key="activeRightTab.note.id" :note="activeRightTab.note" :class="[$style.detailPane, $style.subpanePage]"/>
						<FullUserPage v-else-if="activeRightTab.kind === 'profile' && activeRightTab.user" :key="activeRightTab.id" :class="$style.subpanePage" :acct="userAcct(activeRightTab.user)"/>
						<FullNotificationsPage v-else-if="activeRightTab.kind === 'notifications'" :key="activeRightTab.id" :class="$style.subpanePage" :disableRefreshButton="false" :notification="true"/>
						<FullAnnouncementsPage v-else-if="activeRightTab.kind === 'announcements'" :key="activeRightTab.id" :class="$style.subpanePage"/>
						<FullSearchPage v-else-if="activeRightTab.kind === 'search'" :key="activeRightTab.id" :class="$style.subpanePage"/>
						<div v-else-if="activeRightTab.kind === 'externalNotifications' && !externalAccount" :class="$style.welcomePane">
							<Unplug :size="32"/>
						<strong>{{ copy.externalAccountNotConnected }}</strong>
						<span>{{ copy.externalAccountNotConnectedDescription }}</span>
						<button type="button" :class="$style.primaryButton" @click="openCenterPage('/settings/external-account', copy.externalAccountLinking)">{{ copy.openLinkSettings }}</button>
						</div>
						<FullExternalNotificationsPage v-else-if="activeRightTab.kind === 'externalNotifications' && externalAccount" :key="activeRightTab.id" :class="$style.subpanePage"/>
						<FullFavoritesPage v-else-if="activeRightTab.kind === 'favorites'" :key="activeRightTab.id" :class="$style.subpanePage"/>
						<FullClipsPage v-else-if="activeRightTab.kind === 'clips'" :key="activeRightTab.id" :class="$style.subpanePage"/>
						<FullChatPage v-else-if="activeRightTab.kind === 'chat'" :key="activeRightTab.id" :class="$style.subpanePage"/>
						<MkDrive v-else-if="activeRightTab.kind === 'drive'" :key="activeRightTab.id" :class="$style.subpanePage"/>
						<div v-else-if="activeRightTab.kind === 'timeline' && activeRightTab.timelineSource" :key="activeRightTab.id" ref="subpaneTimelineEl" :class="$style.subpaneTimeline">
							<MkExternalTimeline v-if="(activeRightTab.timelineSource === 'externalHome' || activeRightTab.timelineSource === 'externalLocal') && externalAccount" :src="activeRightTab.timelineSource === 'externalHome' ? 'ohtl' : 'oltl'" :host="externalAccount.host" :token="externalAccount.token" simpleUi/>
							<MkTrendingTimeline v-else-if="activeRightTab.timelineSource === 'trending'"/>
							<MkStreamingNotesTimeline v-else :src="nativeSubpaneTimelineSource(activeRightTab.timelineSource)" :list="activeRightTab.timelineSource === 'list' ? activeRightTab.timelineSourceId : undefined" :antenna="activeRightTab.timelineSource === 'antenna' ? activeRightTab.timelineSourceId : undefined" :channel="activeRightTab.timelineSource === 'channel' ? activeRightTab.timelineSourceId : undefined"/>
						</div>
					<div v-else-if="activeRightTab.kind === 'studioUnavailable'" :class="$style.welcomePane"><PanelLeftClose :size="34"/><strong>{{ copy.studioUnavailable }}</strong><span>{{ copy.studioUnavailableDescription }}</span><button type="button" :class="$style.primaryButton" @click="openUiSetup">{{ copy.openUiSwitcher }}</button></div>
						<div v-else-if="activeRightTab.kind === 'widgets'" :class="$style.widgetPane">
						<div v-if="!widgetEditing && (activeRightTab.widgets?.length ?? 0) === 0" :class="$style.widgetEmpty"><LayoutDashboard :size="28"/><strong>{{ copy.addWidgetsPrompt }}</strong><span>{{ copy.emptyWidgetTabDescription }}</span><div><button type="button" :class="$style.primaryButton" @click="widgetEditing = true">{{ copy.startEditing }}</button><button type="button" :class="$style.secondaryButton" @click="importHatasabaWidgets(activeRightTab)">{{ copy.importExistingLayout }}</button></div></div>
							<WidgetEditor v-else :tab="activeRightTab"/>
						</div>
					<div v-else :class="$style.welcomePane"><ExternalLink :size="30"/><strong>{{ activeRightTab.title }}</strong><span>{{ copy.openInCenterDescription }}</span><button type="button" :class="$style.primaryButton" @click="openCenterPage(activeRightTab.path || '/', activeRightTab.title)">{{ copy.openInCenter }}</button></div>
					</div>
				</template>
			<template #fallback><div :class="$style.subpaneLoading"><LoaderCircle :size="22" :class="$style.spinning"/><span>{{ copy.loadingSubpane }}</span></div></template>
			</Suspense>
		</div>
	</aside>
	<HatacordingTutorial v-if="tutorialOpen" @done="finishFirstTutorial"/>
</div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, defineComponent, h, nextTick, onBeforeUnmount, onMounted, provide, reactive, ref, useCssModule, useTemplateRef, watch } from 'vue';
import {
	Activity, ArrowDownToLine, ArrowLeft, ArrowUp, AtSign, Bell, BookOpen, CalendarPlus, ChevronDown, ChevronRight, ChevronUp, Circle, CircleAlert, CloudUpload, Compass, Copy, Earth, ExternalLink, EyeOff, Flame, Folder, Gamepad2, Globe2, Hash, History, Home, Import, Inbox, Layers, LayoutDashboard, List, LoaderCircle, Lock, Maximize2, Megaphone, Menu as MenuIcon, MessageCircle, MessageSquareWarning, MoreHorizontal, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Paperclip, Pencil, Pin, PinOff, Plus, Quote, Radio, RefreshCw, Reply, Rocket, Save, Search, Settings, Shield, SlidersHorizontal, SmilePlus, Sparkles, Square, Star, SwatchBook, Tv, Unplug, UserRound, WandSparkles, X,
} from '@lucide/vue';
import type { Component, PropType } from 'vue';
import type * as Misskey from 'cherrypick-js';
import type { MenuItem } from '@/types/menu.js';
import type { PostFormProps } from '@/types/post-form.js';
import '@fontsource-variable/noto-sans-jp/wght.css';
import type { HatacordingUiCollectionIcon, HatacordingUiComposerShortcut, HatacordingUiMenuPreference, HatacordingUiPreferencesChangeDetail, HatacordingUiWidget } from '@/utility/hatacording-ui.js';
import type { Widget } from '@/components/MkWidgets.vue';
import { ensureSignin, incNotesCount, notesCount } from '@/i.js';
import { i18n } from '@/i18n.js';
import { getAccountMenu, refreshCurrentAccount } from '@/accounts.js';
import { instance } from '@/instance.js';
import { definePage } from '@/page.js';
import { createRouter, useRouter } from '@/router.js';
import { DI } from '@/di.js';
import * as os from '@/os.js';
import { misskeyApi, misskeyApiGet } from '@/utility/misskey-api.js';
import { openInstanceMenu } from '@/ui/_common_/common.js';
import { chooseDriveFile, chooseFileFromPcAndUpload, chooseFileFromUrl } from '@/utility/drive.js';
import { emojiPicker } from '@/utility/emoji-picker.js';
import { mfmFunctionPicker } from '@/utility/mfm-function-picker.js';
import { genId } from '@/utility/id.js';
import { store } from '@/store.js';
import { prefer } from '@/preferences.js';
import { widgets as availableWidgets } from '@/widgets/index.js';
import { useStream } from '@/stream.js';
import { callExternalApi, getExternalAccount } from '@/utility/external-api.js';
import { createPostSendDelayController, postSendDelayEnabled, postSendDelaySeconds } from '@/utility/post-send-delay.js';
import { getActiveHataSideProfile, hataSideStudioStore } from '@/utility/hata-side-studio.js';
import { HATACORDING_UI_PREFERENCES_CHANGE_EVENT, readHatacordingUiPreferences, writeHatacordingUiPreferences } from '@/utility/hatacording-ui.js';
import { deepClone } from '@/utility/clone.js';
import { getPluginHandlers } from '@/plugin.js';
import { globalEvents, useGlobalEvent } from '@/events.js';
import { claimAchievement } from '@/utility/achievements.js';
import { miLocalStorage } from '@/local-storage.js';
import { useFoldableScrollAnchor, useFoldableWide } from '@/utility/hata-foldable.js';
import { getEffectiveHatacordingRateLimit, hatacordingRateLimitSnapshot } from '@/utility/hatacording-rate-limit.js';
import { readHatacordingActivityCache, writeHatacordingActivityCache } from '@/utility/hatacording-activity-cache.js';
import type { HatacordingCachedActivity } from '@/utility/hatacording-activity-cache.js';
import type { HatacordingActivityCopy, HatacordingActivityIcon, HatacordingActivityKind, HatacordingNotificationActivitySource } from '@/utility/hatacording-activity.js';
import { createApiActionActivity, createEarthquakeActivity, createNotificationActivity, createNotificationActivityFromSource, createServerDisconnectedActivity, createServerReconnectedActivity, createTimelineRealtimeActivity, sharesHatacordingNotificationAudience } from '@/utility/hatacording-activity.js';
import { HATACORDING_TUTORIAL_ACHIEVEMENT_ID } from '@/utility/hatacording-copy.js';
import { acquireNotificationToastSuppression } from '@/utility/notification-toast-suppression.js';
import { acquireServerDisconnectUiSuppression } from '@/utility/server-disconnect-ui-suppression.js';
import { Autocomplete } from '@/utility/autocomplete.js';
import { extractMentions } from '@/utility/extract-mentions.js';
import { parseMfmCached } from '@/utility/mfm-cache.js';
import { versatileLang } from '@/utility/intl-const.js';
import MkAvatar from '@/components/global/MkAvatar.vue';
import MkUserName from '@/components/global/MkUserName.vue';
import MkNote from '@/components/MkNote.vue';
import MkNoteDetailed from '@/components/MkNoteDetailed.vue';
import MkDrive from '@/components/MkDrive.vue';
import MkWidgets from '@/components/MkWidgets.vue';
import MkEventEditor from '@/components/MkEventEditor.vue';
import XPostFormAttaches from '@/components/MkPostFormAttaches.vue';
import MkExternalNote from '@/components/MkExternalNote.vue';
import MkExternalTimeline from '@/components/MkExternalTimeline.vue';
import MkStreamingNotesTimeline from '@/components/MkStreamingNotesTimeline.vue';
import MkTrendingTimeline from '@/components/MkTrendingTimeline.vue';
import HatacordingTutorial from '@/components/HatacordingTutorial.vue';
import HatacordingUiSettings from '@/components/HatacordingUiSettings.vue';
import RouterView from '@/components/global/RouterView.vue';

const FullSearchPage = defineAsyncComponent(() => import('@/pages/search.vue'));
const FullNotificationsPage = defineAsyncComponent(() => import('@/pages/notifications.vue'));
const FullAnnouncementsPage = defineAsyncComponent(() => import('@/pages/announcements.vue'));
const FullUserPage = defineAsyncComponent(() => import('@/pages/user/index.vue'));
const FullExternalNotificationsPage = defineAsyncComponent(() => import('@/pages/external-notifications.vue'));
const FullFavoritesPage = defineAsyncComponent(() => import('@/pages/favorites.vue'));
const FullClipsPage = defineAsyncComponent(() => import('@/pages/my-clips/index.vue'));
const FullChatPage = defineAsyncComponent(() => import('@/pages/chat/home.vue'));
const MkDrawingTool = defineAsyncComponent(() => import('@/components/MkDrawingTool.vue'));
const MkUISetup = defineAsyncComponent(() => import('@/components/MkUISetup.vue'));

type TimelineSource = 'home' | 'local' | 'social' | 'global' | 'trending' | 'externalHome' | 'externalLocal' | 'list' | 'antenna' | 'channel';
type CollectionId = 'lists' | 'antennas' | 'channels';
type Visibility = 'public' | 'home' | 'followers' | 'specified';
type ComposerChannel = NonNullable<PostFormProps['channel']> & { isPrivate?: boolean };
type HatacordingMenuItem = { id: string; label: string; icon: Component; source?: TimelineSource; sourceId?: string; to?: string; defaultVisible?: boolean; badge?: string };
type ActivityPhase = 'revealing' | 'highlighting' | 'settled';
type ActivityPayload = {
	id: string;
	text: string;
	detail: string;
	icon: Component;
	iconName: HatacordingActivityIcon;
	to: string;
	createdAt: string;
	kind: HatacordingActivityKind;
	emergency: boolean;
	user?: Misskey.entities.UserLite;
	action?: string;
	reaction?: string;
	reactionEmojiUrl?: string;
	emojiUrls?: Record<string, string>;
	note?: Misskey.entities.Note;
	notificationType?: string;
	botOrigin?: boolean;
	cacheSource?: HatacordingNotificationActivitySource;
};
type PendingActivityEvent = ActivityPayload & { notificationItems?: ActivityPayload[]; archived?: boolean; onSettled?: () => void };
type ActivityEvent = PendingActivityEvent & { phase: ActivityPhase; expanded: boolean; animationRevision: number };
type TimelineNote = Misskey.entities.Note & { __hatacordingExternal?: true };
type FeedEntry = { id: string; type: 'note' | 'activity'; createdAt: string; note?: TimelineNote; activity?: ActivityEvent; external?: boolean };
type ComposerContext = { kind: 'reply' | 'quote' | 'mention' | 'channel'; note?: Misskey.entities.Note; channel?: ComposerChannel | null; label: string };
type RightTabKind = 'welcome' | 'note' | 'profile' | 'notifications' | 'announcements' | 'search' | 'drive' | 'widgets' | 'timeline' | 'studioUnavailable' | 'externalNotifications' | 'favorites' | 'clips' | 'chat' | 'page';
type RightTab = { id: string; title: string; kind: RightTabKind; note?: Misskey.entities.Note; user?: Misskey.entities.UserDetailed | Misskey.entities.UserLite; path?: string; widgets?: HatacordingUiWidget[]; timelineSource?: TimelineSource; timelineSourceId?: string };

const copy = i18n.ts._hata._hatacordingUi._main;
const copyx = i18n.tsx._hata._hatacordingUi._main;
const $i = ensureSignin();
const styles = useCssModule();
const stream = useStream();
const outerRouter = useRouter();
const paneRouter = createRouter('/timeline');
paneRouter.init();
const rootEl = useTemplateRef('rootEl');
const scrollEl = useTemplateRef('scrollEl');
const composerInput = useTemplateRef('composerInput');
const subpaneContent = useTemplateRef('subpaneContent');
const subpaneTimelineEl = useTemplateRef('subpaneTimelineEl');
const prefs = ref(readHatacordingUiPreferences($i.id));
const isCompact = ref(false);
const rightPaneOverlay = ref(false);
const drawerOpen = ref(false);
const rightPaneOpen = ref(false);
// 旗鯖fork: 横開き折りたたみ端末(メインディスプレイ)では、右ペインをドロワーにせず常時表示する。
//   閾値には「このUIが元から右ペインをドロワー化する幅」をそのまま渡す。
//   ⚠️これ以上広ければ元から常時表示なので、折りたたみ判定を持ち込む必要がない。
const HATACORDING_RIGHT_PANE_DOCK_WIDTH = 1120;
// 折りたたみ端末での右ペインの下限幅と、コンテナ幅に対する上限割合。
// ⚠️PC用の 280px / 560px をそのまま使うと中央が潰れる。⚠️どちらも実測前の暫定値。
const FOLDABLE_RIGHT_PANE_MIN_WIDTH = 240;
const FOLDABLE_RIGHT_PANE_MAX_RATIO = 0.42;
const isFoldableWide = useFoldableWide(HATACORDING_RIGHT_PANE_DOCK_WIDTH);
// 折りたたむ/開くでレイアウトが切り替わっても、読んでいた位置を保つ。
useFoldableScrollAnchor(isFoldableWide, () => scrollEl.value);
// ResizeObserver が最後に観測した .root の幅。折りたたみ設定の切り替えでも
// 同じ判定を再実行できるよう、幅を保持して一箇所で計算する。
const rootWidth = ref(0);

function applyResponsiveState(): void {
	const width = rootWidth.value;
	isCompact.value = width > 0 && width <= 760;
	rightPaneOverlay.value = width > 0 && width <= HATACORDING_RIGHT_PANE_DOCK_WIDTH && !isFoldableWide.value;
	if (!isCompact.value) drawerOpen.value = false;
	if (!rightPaneOverlay.value) rightPaneOpen.value = false;
	resizeComposerInput();
}

// 設定画面で auto/on/off を切り替えたときは幅が変わらないので、resize は飛んでこない。
watch(isFoldableWide, () => applyResponsiveState());

const menuEditing = ref(false);
const showMore = ref(false);
const widgetEditing = ref(false);
const tutorialOpen = ref(false);
const centerPageOpen = ref(false);
const centerPagePath = ref('/timeline');
const centerPageTitle = ref(copy.timelines);
const centerPageHistory = ref<string[]>([]);
let requestedCenterPageTitle: string | null = null;
const activeMenuId = ref(prefs.value.currentTimelineId);
const notes = ref<TimelineNote[]>([]);
const pendingNotes = ref<TimelineNote[]>([]);
const activityEvents = ref<ActivityEvent[]>([]);
const fetching = ref(false);
const loadingMore = ref(false);
const loadError = ref(false);
const hasMore = ref(true);
const showJumpControl = ref(false);
const activeDisconnectActivityId = ref<string | null>(null);
const onlineUsersCount = ref(0);
const userLists = ref<Misskey.entities.UserList[]>([]);
const antennas = ref<Misskey.entities.Antenna[]>([]);
const channels = ref<Misskey.entities.Channel[]>([]);
const externalUnread = ref(false);
const draftText = ref('');
const composerInputFocused = ref(false);
const draftFiles = ref<Misskey.entities.DriveFile[]>([]);
const submitting = ref(false);
const composerToolsOpen = ref(false);
const cwEnabled = ref(false);
const cwText = ref('');
const pollEnabled = ref(false);
const pollChoices = ref(['', '']);
const pollMultiple = ref(false);
const pollExpiration = ref<'infinite' | 'at' | 'after'>('infinite');
const pollExpiresAt = ref('');
const pollExpiredAfter = ref(10);
const pollExpiredAfterUnit = ref<'second' | 'minute' | 'hour' | 'day'>('minute');
const event = ref<any | null>(null);
const reactionAcceptance = ref<Misskey.entities.Note['reactionAcceptance']>(null);
const visibility = ref<Visibility>((prefer.s.rememberNoteVisibility ? store.s.visibility : prefer.s.defaultNoteVisibility) as Visibility);
const localOnly = ref(prefer.s.rememberNoteVisibility ? store.s.localOnly : prefer.s.defaultNoteLocalOnly);
const composerContext = ref<ComposerContext | null>(null);
const visibleUsers = ref<Misskey.entities.UserLite[]>([]);
const hasNotSpecifiedMentions = ref(false);
const postDelay = createPostSendDelayController();
const rightTabs = ref<RightTab[]>([{ id: 'detail', title: copy.details, kind: 'welcome' }]);
const activeRightTabId = ref('detail');
const dragTabIndex = ref<number | null>(null);
const colorModeTransitioning = ref(false);
const rateLimitNow = ref(Date.now());
const postFormActions = getPluginHandlers('post_form_action');
const composerShortcutDefinitions: { id: HatacordingUiComposerShortcut; label: string; icon: Component }[] = [
	{ id: 'poll', label: copy.poll, icon: List },
	{ id: 'mention', label: copy.mention, icon: AtSign },
	{ id: 'mfm', label: 'MFM', icon: SwatchBook },
	{ id: 'hashtag', label: copy.hashtag, icon: Hash },
	{ id: 'event', label: copy.event, icon: CalendarPlus },
	{ id: 'drawing', label: copy.drawing, icon: Pencil },
	{ id: 'schedule', label: copy.scheduleAndAutoDelete, icon: History },
	{ id: 'reaction', label: copy.reactionRestrictions, icon: Shield },
	{ id: 'delivery', label: copy.deliveryDestination, icon: Globe2 },
	{ id: 'full', label: copy.fullPostForm, icon: Settings },
];
let resizeObserver: ResizeObserver | null = null;
let onlineTimer: number | null = null;
let rateLimitTimer: number | null = null;
let activityArchiveTimer: number | null = null;
let colorTransitionTimer: number | null = null;
let mainConnection: any = null;
let timelineConnection: any = null;
let externalTimelineSocket: WebSocket | null = null;
let externalTimelineReconnectTimer: number | null = null;
let externalTimelinePollTimer: number | null = null;
let externalTimelineReconnectAttempts = 0;
let externalTimelineStreamGeneration = 0;
const externalCapturedNoteIds = new Set<string>();
const pendingExternalReactionKeys = new Set<string>();
let resizingRight = false;
const activityQueue: PendingActivityEvent[] = [];
const activityTimers = new Set<number>();
let activityQueueRunning = false;
let activityDisposed = false;
let composerAutocomplete: Autocomplete | null = null;
let mobileEdgeTouch: { x: number; y: number; edge: 'left' | 'right' } | null = null;
let releaseToastSuppression: (() => void) | null = acquireNotificationToastSuppression();
let releaseDisconnectUiSuppression: (() => void) | null = acquireServerDisconnectUiSuppression();
let releasePostFormInterceptor: (() => void) | null = null;
let serverConnectionSequence = 0;
let lastDisconnectBehavior: 'quiet' | 'reload' | 'dialog' | 'none' = prefer.s.serverDisconnectedBehavior;
const previousOuterNavHook = outerRouter.navHook;

const hatacordingOuterNavHook: NonNullable<typeof outerRouter.navHook> = (fullPath, flag) => {
	void flag;
	const path = fullPath.split(/[?#]/, 1)[0];
	if (path === '/hatafeed/hatacording-ui') return true;
	if (path === '/' || path === '/timeline') {
		void closeCenterPage();
		return true;
	}
	if (path === '/hata-side-studio') {
		openRightTab({ title: 'HataSideStudio', kind: 'studioUnavailable' });
		return true;
	}
	openCenterPage(fullPath);
	return true;
};

// HataSNSCordUI 内で古い部品が mainRouter を直接呼んでも、アプリの殻へ
// 脱出させず中央ペインへ受け渡す。UI 切り替えは location の明示再読込なので
// このガードの対象外となり、離脱時には従来の hook をそのまま復元する。
outerRouter.navHook = hatacordingOuterNavHook;

paneRouter.navHook = (fullPath) => {
	const path = fullPath.split(/[?#]/, 1)[0];
	if (path === '/' || path === '/hatafeed/hatacording-ui') {
		void closeCenterPage();
		return true;
	}
	if (path === '/hata-side-studio') {
		openRightTab({ title: 'HataSideStudio', kind: 'studioUnavailable' });
		return true;
	}
	return false;
};

paneRouter.addListener('change', ({ fullPath }) => {
	const path = fullPath.split(/[?#]/, 1)[0];
	// Nirax の replaceByPath は navHook を通らないため、置換遷移もここで
	// HataSNSCordUI のホーム／利用不可画面へ正規化する。
	if (path === '/' || path === '/timeline' || path === '/hatafeed/hatacording-ui') {
		void closeCenterPage();
		return;
	}
	if (path === '/hata-side-studio') {
		openRightTab({ title: 'HataSideStudio', kind: 'studioUnavailable' });
		return;
	}
	centerPagePath.value = fullPath;
	centerPageTitle.value = requestedCenterPageTitle ?? centerPageTitleForPath(fullPath);
	requestedCenterPageTitle = null;
	centerPageOpen.value = true;
	disconnectTimelineStream();
	drawerOpen.value = false;
});
paneRouter.addListener('push', ({ fullPath }) => {
	if (centerPageHistory.value.at(-1) !== fullPath) centerPageHistory.value.push(fullPath);
});
paneRouter.addListener('replace', ({ fullPath }) => {
	if (centerPageHistory.value.length === 0) centerPageHistory.value.push(fullPath);
	else centerPageHistory.value.splice(-1, 1, fullPath);
});
provide(DI.router, paneRouter);
// 親UI側で「窓で開く」「ブラウザ遷移」が選ばれていても、このUIの中では
// 通常クリックを必ず注入済みの paneRouter に通す。明示的な新規タブ操作だけは残す。
provide('linkNavigationBehavior', null);

const subpaneMaxTabs = computed(() => Math.max(1, Math.min(5, Number($i.policies.hatacordingUiSubpaneMaxTabs) || 3)));
const sidebarCollapsed = computed(() => prefs.value.sidebarCollapsed && !isCompact.value);
const maxNoteLength = computed(() => instance.maxNoteTextLength ?? 1000);
const characterCount = computed(() => Array.from(draftText.value).length);
const canSubmit = computed(() => !submitting.value && characterCount.value <= maxNoteLength.value && (draftText.value.trim().length > 0 || draftFiles.value.length > 0 || pollEnabled.value || event.value != null));
const characterCounterStyle = computed(() => ({ '--char-progress': `${Math.min(360, characterCount.value / Math.max(1, maxNoteLength.value) * 360)}deg` }));
const activeRightTab = computed(() => rightTabs.value.find(tab => tab.id === activeRightTabId.value) ?? rightTabs.value[0] ?? null);
const rightPaneStyle = computed(() => {
	const min = isFoldableWide.value ? FOLDABLE_RIGHT_PANE_MIN_WIDTH : 280;
	const width = Math.max(min, Math.min(560, Number(prefs.value.rightPaneWidth) || 360));
	if (rightPaneOverlay.value) return { width: `min(${width}px, 92cqw)` };
	// 旗鯖fork: 折りたたみ端末では中央が潰れないよう、コンテナ幅の割合でも頭打ちにする。
	if (isFoldableWide.value) return { flexBasis: `min(${width}px, ${Math.round(FOLDABLE_RIGHT_PANE_MAX_RATIO * 100)}cqw)` };
	return { flexBasis: `${width}px` };
});

// 破損した端末保存値・上限変更・タブ削除が重なっても、存在しないIDを
// 選び続けて空の右ペインを作らない。描画前に必ず実在タブへ戻す。
watch([
	() => activeRightTabId.value,
	() => rightTabs.value.map(tab => tab.id).join('\u0000'),
], () => {
	if (rightTabs.value.some(tab => tab.id === activeRightTabId.value)) return;
	activeRightTabId.value = rightTabs.value[0]?.id ?? '';
}, { flush: 'sync' });
const externalAccount = computed(() => getExternalAccount());
const isExternalTimeline = computed(() => activeMenuItem.value?.source === 'externalHome' || activeMenuItem.value?.source === 'externalLocal');
const feedEntries = computed<FeedEntry[]>(() => [...notes.value.map(note => ({ id: `note:${note.id}`, type: 'note' as const, note, external: note.__hatacordingExternal === true, createdAt: note.createdAt })), ...activityEvents.value.map(activity => ({ id: activity.id, type: 'activity' as const, activity, createdAt: activity.createdAt }))].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
const effectiveRateLimit = computed(() => getEffectiveHatacordingRateLimit(hatacordingRateLimitSnapshot.value, rateLimitNow.value));
const rateLimitPercentage = computed(() => effectiveRateLimit.value == null ? null : Math.round(effectiveRateLimit.value.remaining / effectiveRateLimit.value.limit * 100));
const rateLimitMeterLabel = computed(() => rateLimitPercentage.value == null ? '—' : String(rateLimitPercentage.value));
const rateLimitLevel = computed(() => rateLimitPercentage.value == null ? 'waiting' : rateLimitPercentage.value <= 20 ? 'low' : rateLimitPercentage.value <= 45 ? 'medium' : 'normal');
const rateLimitMeterStyle = computed(() => ({ '--rate-limit-offset': String(100 - (rateLimitPercentage.value ?? 0)) }));
const rateLimitTitle = computed(() => effectiveRateLimit.value == null ? copy.measuringRateLimit : copyx.rateLimitRemaining({ remaining: effectiveRateLimit.value.remaining.toString(), limit: effectiveRateLimit.value.limit.toString() }));

const staticMenuItems = computed<HatacordingMenuItem[]>(() => {
	const items: HatacordingMenuItem[] = [
		{ id: 'timeline:home', label: copy.home, icon: Home, source: 'home', defaultVisible: true },
		{ id: 'timeline:local', label: copy.local, icon: Earth, source: 'local', defaultVisible: true },
		{ id: 'timeline:social', label: copy.social, icon: Rocket, source: 'social', defaultVisible: true },
		{ id: 'timeline:global', label: copy.global, icon: Globe2, source: 'global' },
		{ id: 'timeline:trending', label: copy.trending, icon: Flame, source: 'trending' },
		...(externalAccount.value && prefer.s['external.enableOHTL'] ? [{ id: 'timeline:external-home', label: copyx.externalHome({ host: externalAccount.value.host }), icon: ExternalLink, source: 'externalHome' as const }] : []),
		...(externalAccount.value && prefer.s['external.enableOLTL'] ? [{ id: 'timeline:external-local', label: copyx.externalLocal({ host: externalAccount.value.host }), icon: ExternalLink, source: 'externalLocal' as const }] : []),
		{ id: 'tool:search', label: copy.search, icon: Search, defaultVisible: true },
		{ id: 'tool:notifications', label: copy.notifications, icon: Bell, defaultVisible: true, badge: $i.unreadNotificationsCount ? String(Math.min(99, $i.unreadNotificationsCount)) : undefined },
		{ id: 'tool:drive', label: copy.drive, icon: CloudUpload, defaultVisible: true },
		{ id: 'tool:ui', label: copy.switchUi, icon: WandSparkles, defaultVisible: true },
		{ id: 'tool:announcements', label: copy.announcements, icon: Megaphone, badge: $i.hasUnreadAnnouncement ? '●' : undefined },
		{ id: 'tool:externalNotifications', label: copy.externalNotifications, icon: Bell, badge: externalUnread.value ? '●' : undefined },
	{ id: 'tool:hatask', label: 'Hatask', icon: LayoutDashboard, to: '/hatask' },
	{ id: 'tool:hatafeed', label: 'HataFeed', icon: MessageSquareWarning, to: '/hatafeed' },
	{ id: 'tool:hatady', label: 'Hatady', icon: BookOpen, to: '/hatady' },
	{ id: 'tool:hanaawase', label: '花常', icon: Sparkles, to: '/hanaawase' },
	{ id: 'tool:games', label: 'Hataskey Games', icon: Gamepad2, to: '/games' },
	{ id: 'tool:earthquake', label: '地震・津波情報', icon: Activity, to: '/earthquake' },
		{ id: 'tool:explore', label: copy.explore, icon: Compass, to: '/explore' },
		{ id: 'tool:favorites', label: copy.favorites, icon: Sparkles, to: '/my/favorites' },
		{ id: 'tool:clips', label: copy.clips, icon: Paperclip, to: '/my/clips' },
		{ id: 'tool:chat', label: copy.chat, icon: MessageCircle, to: '/chat' },
		{ id: 'tool:studio', label: 'HataSideStudio', icon: PanelLeftClose },
	];
	return items.filter(item => item.id !== 'timeline:local' || $i.policies.ltlAvailable).filter(item => item.id !== 'timeline:global' || $i.policies.gtlAvailable).filter(item => item.id !== 'tool:chat' || $i.policies.chatAvailability !== 'unavailable');
});

const dynamicMenuItems = computed<HatacordingMenuItem[]>(() => [
	...userLists.value.map(item => ({ id: `list:${item.id}`, label: item.name, icon: List, source: 'list' as const, sourceId: item.id })),
	...antennas.value.map(item => ({ id: `antenna:${item.id}`, label: item.name, icon: Radio, source: 'antenna' as const, sourceId: item.id, badge: item.hasUnreadNote ? '●' : undefined })),
	...channels.value.map(item => ({ id: `channel:${item.id}`, label: item.name, icon: item.isPrivate ? Lock : Tv, source: 'channel' as const, sourceId: item.id })),
]);
const allMenuItems = computed(() => [...staticMenuItems.value, ...dynamicMenuItems.value]);
const primaryTimelineItems = computed(() => sortedItems(staticMenuItems.value.filter(item => item.source && menuVisible(item))));
const primaryToolItems = computed(() => sortedItems(staticMenuItems.value.filter(item => !item.source && menuVisible(item))));
const availableTimelineItems = computed(() => sortedItems(staticMenuItems.value.filter(item => item.source && !menuVisible(item))));
const hiddenMenuItems = computed(() => sortedItems(staticMenuItems.value.filter(item => !item.source && !menuVisible(item))));
const activeMenuItem = computed(() => allMenuItems.value.find(item => item.id === activeMenuId.value) ?? staticMenuItems.value.find(item => item.id === 'timeline:local') ?? null);
const activeChannel = computed(() => activeMenuItem.value?.source === 'channel' ? channels.value.find(channel => channel.id === activeMenuItem.value?.sourceId) ?? null : null);
const composerChannel = computed<ComposerChannel | null>(() => composerContext.value?.channel !== undefined
	? composerContext.value.channel
	: activeChannel.value as ComposerChannel | null);
const realtimeAvailable = computed(() => activeMenuItem.value?.source != null && activeMenuItem.value.source !== 'trending');
const activeCollectionSettings = computed<{ path: string; title: string; label: string } | null>(() => {
	const item = activeMenuItem.value;
	if (!item?.sourceId) return null;
	if (item.source === 'list') return { path: `/my/lists/${item.sourceId}`, title: copy.listSettings, label: copy.configureCurrentList };
	if (item.source === 'antenna') return { path: `/my/antennas/${item.sourceId}`, title: copy.antennaSettings, label: copy.configureCurrentAntenna };
	if (item.source === 'channel') {
		const channel = activeChannel.value;
		const canManage = channel?.canManage === true || channel?.userId === $i.id || $i.isAdmin || $i.isModerator;
		return canManage
			? { path: `/channels/${item.sourceId}/edit`, title: copy.channelSettings, label: copy.configureCurrentChannel }
			: { path: `/channels/${item.sourceId}`, title: copy.channel, label: copy.openCurrentChannel };
	}
	return null;
});
const effectiveVisibility = computed<Visibility>(() => composerChannel.value ? 'public' : visibility.value);
const effectiveLocalOnly = computed(() => composerChannel.value ? true : localOnly.value);
const visibleUserIds = computed(() => visibleUsers.value.map(user => user.id));
const rememberNoteVisibility = computed({
	get: () => prefer.r.rememberNoteVisibility.value,
	set: (value: boolean) => {
		prefer.commit('rememberNoteVisibility', value);
		if (value) persistRememberedVisibility();
	},
});
const collectionGroups = computed(() => [
	{ id: 'channels' as const, label: copy.followedChannels, icon: collectionIcon(prefs.value.collectionIcons.channels), items: sortedItems(dynamicMenuItems.value.filter(item => item.id.startsWith('channel:'))) },
	{ id: 'lists' as const, label: copy.lists, icon: collectionIcon(prefs.value.collectionIcons.lists), items: sortedItems(dynamicMenuItems.value.filter(item => item.id.startsWith('list:'))) },
	{ id: 'antennas' as const, label: copy.antennas, icon: collectionIcon(prefs.value.collectionIcons.antennas), items: sortedItems(dynamicMenuItems.value.filter(item => item.id.startsWith('antenna:'))) },
]);
const inLocalTimeline = computed(() => activeMenuItem.value?.source === 'local');
const inChannel = computed(() => activeMenuItem.value?.source === 'channel');
const currentAntenna = computed(() => activeMenuItem.value?.source === 'antenna' ? antennas.value.find(item => item.id === activeMenuItem.value?.sourceId) ?? null : null);
const noteBubbleEnabled = ref(true);
const noteTimelineGlassBg = ref(false);
const tlWithSensitive = computed(() => store.r.tl.value.filter.withSensitive);
const timelineWithRenotes = computed({
	get: () => store.r.tl.value.filter.withRenotes,
	set: (value: boolean) => saveHatacordingTimelineFilter('withRenotes', value),
});
const timelineWithSensitive = computed({
	get: () => store.r.tl.value.filter.withSensitive,
	set: (value: boolean) => saveHatacordingTimelineFilter('withSensitive', value),
});
const timelineOnlyFiles = computed({
	get: () => store.r.tl.value.filter.onlyFiles,
	set: (value: boolean) => saveHatacordingTimelineFilter('onlyFiles', value),
});
const timelineShowFixedPostForm = prefer.model('showFixedPostForm');
const activeComposerShortcuts = computed(() => prefs.value.composerShortcuts.map(id => composerShortcutDefinitions.find(item => item.id === id)).filter((item): item is typeof composerShortcutDefinitions[number] => item != null));

function collectionIcon(icon: HatacordingUiCollectionIcon): Component { return ({ tv: Tv, list: List, radio: Radio, folder: Folder, layers: Layers })[icon]; }

const visibilityLabel = computed(() => composerChannel.value ? copy.channelPostServerOnly : ({ public: copy.public, home: copy.home, followers: copy.followers, specified: copy.direct })[visibility.value]);
const visibilityShortLabel = computed(() => composerChannel.value ? copy.channelServerShort : `${({ public: copy.publicShort, home: copy.home, followers: copy.followersShort, specified: copy.recipientsShort })[visibility.value]}${localOnly.value && visibility.value !== 'specified' ? copy.serverOnlySuffix : ''}`);
const visibilityIcon = computed(() => composerChannel.value ? (composerChannel.value.isPrivate ? Lock : Tv) : ({ public: Globe2, home: Home, followers: UserRound, specified: AtSign })[visibility.value]);
const visibilityBorderEnabled = prefer.r['postFormVisibilityBorder.enabled'];
const visibilityBorderWidth = prefer.r['postFormVisibilityBorder.width'];
const visibilityBorderColors = {
	public: prefer.r['postFormVisibilityBorder.color.public'],
	home: prefer.r['postFormVisibilityBorder.color.home'],
	followers: prefer.r['postFormVisibilityBorder.color.followers'],
	specified: prefer.r['postFormVisibilityBorder.color.specified'],
} as const;
const visibilityBorderStyle = computed(() => {
	// カウントダウン中は同じ外周を進捗リングへ譲り、二重表示を避ける。
	// 非入力時は浮遊フォーム本来の中立色に戻し、入力へ意識を向けた時だけ公開範囲色を示す。
	if (!composerInputFocused.value || postDelay.active.value || !visibilityBorderEnabled.value) return undefined;
	const color = visibilityBorderColors[effectiveVisibility.value].value;
	// インライン指定で色枠を付けても、浮遊フォーム本来の外側の影を失わせない。
	return {
		boxShadow: `inset 0 0 0 ${visibilityBorderWidth.value}px ${color}, 0 14px 34px var(--cordShadow), 0 2px 8px color-mix(in srgb, #000 8%, transparent)`,
	};
});
const composerPlaceholder = computed(() => composerContext.value?.kind === 'reply' ? copy.writeReply : composerContext.value?.kind === 'quote' ? copy.commentOnQuote : composerChannel.value ? copyx.postTo({ name: composerChannel.value.name }) : copy.whatsHappening);
const composerContextLabel = computed(() => composerContext.value?.label ?? (composerChannel.value ? copyx.postToChannel({ privacy: composerChannel.value.isPrivate ? copy.privatePrefix : '', name: composerChannel.value.name }) : ''));
const composerContextExcerpt = computed(() => {
	const note = composerContext.value?.note;
	if (!note) return '';
	const text = (note.cw || note.text || copy.postWithAttachments).replace(/\s+/g, ' ').trim();
	return text.length > 90 ? `${text.slice(0, 89)}…` : text;
});
const composerContextIcon = computed(() => composerContext.value?.kind === 'reply' ? Reply : composerContext.value?.kind === 'quote' ? Quote : composerChannel.value?.isPrivate ? Lock : Tv);

function persistPreferences() { writeHatacordingUiPreferences($i.id, prefs.value); }

function startColorModeTransition() {
	colorModeTransitioning.value = true;
	applyDocumentColorMode();
	if (colorTransitionTimer != null) window.clearTimeout(colorTransitionTimer);
	colorTransitionTimer = window.setTimeout(() => {
		colorModeTransitioning.value = false;
		window.document.documentElement.removeAttribute('data-hatacording-theme-changing');
		colorTransitionTimer = null;
	}, 360);
}

function applyDocumentColorMode() {
	window.document.documentElement.setAttribute('data-hatacording-color-mode', prefs.value.colorMode);
	if (colorModeTransitioning.value) window.document.documentElement.setAttribute('data-hatacording-theme-changing', 'true');
	else window.document.documentElement.removeAttribute('data-hatacording-theme-changing');
}

function clearDocumentColorMode() {
	window.document.documentElement.removeAttribute('data-hatacording-color-mode');
	window.document.documentElement.removeAttribute('data-hatacording-theme-changing');
}

function menuPreference(item: HatacordingMenuItem): HatacordingUiMenuPreference { return prefs.value.menu[item.id] ?? { pinned: false, hidden: item.defaultVisible !== true, order: staticMenuItems.value.findIndex(candidate => candidate.id === item.id) }; }

function menuVisible(item: HatacordingMenuItem) { return !menuPreference(item).hidden; }

function sortedItems(items: HatacordingMenuItem[]) {
	return [...items].sort((a, b) => {
		const pinnedDifference = Number(menuPreference(b).pinned) - Number(menuPreference(a).pinned);
		return pinnedDifference || menuPreference(a).order - menuPreference(b).order;
	});
}

function updateMenuPreference(item: HatacordingMenuItem, patch: Partial<HatacordingUiMenuPreference>) { prefs.value.menu[item.id] = { ...menuPreference(item), ...patch }; persistPreferences(); }

function isPinned(id: string) { const item = allMenuItems.value.find(candidate => candidate.id === id); return item ? menuPreference(item).pinned : false; }

function togglePinned(item: HatacordingMenuItem) { updateMenuPreference(item, { pinned: !menuPreference(item).pinned }); }

function moveMenuItem(item: HatacordingMenuItem, direction: -1 | 1) { const prefix = item.id.split(':')[0]; const pool = item.sourceId ? dynamicMenuItems.value.filter(candidate => candidate.id.startsWith(`${prefix}:`)) : staticMenuItems.value.filter(candidate => Boolean(candidate.source) === Boolean(item.source) && menuVisible(candidate)); const siblings = sortedItems(pool); const index = siblings.findIndex(candidate => candidate.id === item.id); const other = siblings[index + direction]; if (!other) return; const a = menuPreference(item).order; updateMenuPreference(item, { order: menuPreference(other).order }); updateMenuPreference(other, { order: a }); }

function hideMenuItem(item: HatacordingMenuItem) { updateMenuPreference(item, { hidden: true, pinned: false }); }

function restoreMenuItem(item: HatacordingMenuItem) { updateMenuPreference(item, { hidden: false }); showMore.value = false; }

async function removeTimelineItem(item: HatacordingMenuItem) {
	if (!item.source || item.sourceId) return;
	const remaining = primaryTimelineItems.value.filter(candidate => candidate.id !== item.id);
	if (remaining.length === 0) {
		await os.alert({ type: 'warning', text: copy.keepOneTimeline });
		return;
	}
	hideMenuItem(item);
	if (activeMenuId.value === item.id) await activateMenuItem(remaining[0]);
}

function handleMoreItem(item: HatacordingMenuItem) {
	showMore.value = false;
	void activateMenuItem(item);
}

async function resetMenu() { const { canceled } = await os.confirm({ type: 'warning', title: copy.resetMenuTitle, text: copy.resetMenuDescription }); if (!canceled) { prefs.value.menu = {}; persistPreferences(); } }

function copyCollapsedOrder() { const ids = getActiveHataSideProfile(hataSideStudioStore.value).collapsed.buttons.map(button => button.menuId); const map: Record<string, string> = { home: 'timeline:home', local: 'timeline:local', social: 'timeline:social', global: 'timeline:global', search: 'tool:search', notifications: 'tool:notifications', drive: 'tool:drive', announcements: 'tool:announcements', hatask: 'tool:hatask', hatafeed: 'tool:hatafeed', hatady: 'tool:hatady', games: 'tool:games' }; ids.forEach((id, index) => { const item = staticMenuItems.value.find(candidate => candidate.id === map[id]); if (item) updateMenuPreference(item, { order: index, hidden: false }); }); os.toast(copy.importedCollapsedOrder); }

const MenuRow = defineComponent({
	props: { item: { type: Object as PropType<HatacordingMenuItem>, required: true }, compact: Boolean },
	setup(props) {
		return () => h('div', { class: styles.menuItemRow }, [
			h('button', {
				type: 'button',
				class: [styles.menuItem, activeMenuId.value === props.item.id && styles.activeMenuItem, props.compact && styles.compactMenuItem],
				title: sidebarCollapsed.value ? props.item.label : undefined,
				onClick: () => activateMenuItem(props.item),
			}, [
				h(props.item.icon, { size: 18 }),
				!sidebarCollapsed.value ? h('span', { class: styles.menuLabel }, props.item.label) : null,
				props.item.badge ? h('span', { class: styles.badge }, props.item.badge) : null,
			]),
			props.item.source && !menuEditing.value && !sidebarCollapsed.value
				? h('button', {
					type: 'button',
					class: styles.rowSubpaneButton,
					title: copyx.openInRightPane({ item: props.item.label }),
					onClick: () => openTimelineInSubpane(props.item, true),
				}, [h(Plus, { size: 13 })])
				: null,
			menuEditing.value && !sidebarCollapsed.value ? h('span', { class: styles.rowActions }, [
				h('button', { type: 'button', class: styles.rowAction, title: isPinned(props.item.id) ? copy.unpin : copy.pin, onClick: () => togglePinned(props.item) }, [h(isPinned(props.item.id) ? PinOff : Pin, { size: 13 })]),
				h('button', { type: 'button', class: styles.rowAction, title: copy.moveUp, onClick: () => moveMenuItem(props.item, -1) }, [h(ChevronUp, { size: 13 })]),
				h('button', { type: 'button', class: styles.rowAction, title: copy.moveDown, onClick: () => moveMenuItem(props.item, 1) }, [h(ChevronDown, { size: 13 })]),
				!props.item.sourceId ? h('button', { type: 'button', class: styles.rowAction, title: props.item.source ? copy.removeFromTimelines : copy.moveToMore, onClick: () => props.item.source ? void removeTimelineItem(props.item) : hideMenuItem(props.item) }, [h(props.item.source ? X : EyeOff, { size: 13 })]) : null,
			]) : null,
		]);
	},
});

function openAddTimelineMenu(event: MouseEvent) {
	const anchor = event.currentTarget as HTMLElement;
	const items = availableTimelineItems.value.length > 0
		? availableTimelineItems.value.map(item => ({ type: 'button' as const, text: item.label, action: () => updateMenuPreference(item, { hidden: false }) }))
		: [{ type: 'label' as const, text: copy.noTimelinesToAdd }];
	os.popupMenu(items, anchor);
}

async function activateMenuItem(item: HatacordingMenuItem) {
	if (item.id === 'tool:studio') { openRightTab({ title: 'HataSideStudio', kind: 'studioUnavailable' }); return; }
	if (item.id === 'tool:ui') { openUiSetup(); return; }
	if (item.id === 'tool:search') { openInternalPage('search', copy.search); return; }
	if (item.id === 'tool:notifications') { await openInternalPage('notifications', copy.notifications); return; }
	if (item.id === 'tool:announcements') { await openInternalPage('announcements', copy.announcements); return; }
	if (item.id === 'tool:drive') { openInternalPage('drive', copy.drive); return; }
	if (item.id === 'tool:externalNotifications') { openExternalNotifications(); return; }
	if (item.id === 'tool:favorites') { openInternalPage('favorites', copy.favorites); return; }
	if (item.id === 'tool:clips') { openInternalPage('clips', copy.clips); return; }
	if (item.id === 'tool:chat') { openInternalPage('chat', copy.chat); return; }
	if (item.to) { openCenterPage(item.to, item.label); return; }
	if (!item.source) return;
	centerPageOpen.value = false;
	centerPageHistory.value = [];
	activeMenuId.value = item.id; prefs.value.currentTimelineId = item.id; persistPreferences(); drawerOpen.value = false; await reloadTimeline();
}

function centerPageTitleForPath(path: string): string {
	const normalized = path.split(/[?#]/, 1)[0];
	const exact = allMenuItems.value.find(item => item.to === normalized);
	if (exact) return exact.label;
	if (normalized.startsWith('/settings')) return copy.settings;
	if (normalized.startsWith('/admin')) return copy.controlPanel;
	if (normalized.startsWith('/@')) return copy.profile;
	if (normalized.startsWith('/notes/')) return copy.noteDetails;
	if (normalized.startsWith('/search')) return copy.search;
	if (normalized.startsWith('/my/notifications')) return copy.notifications;
	if (normalized.startsWith('/announcements')) return copy.announcements;
	return copy.page;
}

function openCenterPage(path: string, title?: string) {
	requestedCenterPageTitle = title ?? null;
	if (paneRouter.getCurrentFullPath() === path) {
		centerPagePath.value = path;
		centerPageTitle.value = title ?? centerPageTitleForPath(path);
		if (centerPageHistory.value.length === 0) centerPageHistory.value.push(path);
		centerPageOpen.value = true;
		disconnectTimelineStream();
		drawerOpen.value = false;
		return;
	}
	paneRouter.pushByPath(path);
}

async function backCenterPage() {
	if (centerPageHistory.value.length <= 1) {
		await closeCenterPage();
		return;
	}
	centerPageHistory.value.pop();
	const previousPath = centerPageHistory.value.at(-1);
	if (previousPath == null) {
		await closeCenterPage();
		return;
	}
	requestedCenterPageTitle = centerPageTitleForPath(previousPath);
	paneRouter.replaceByPath(previousPath);
}

async function closeCenterPage() {
	centerPageOpen.value = false;
	centerPageHistory.value = [];
	requestedCenterPageTitle = null;
	await reloadTimeline();
}

function toggleCollection(id: CollectionId) { prefs.value.collectionExpanded[id] = !prefs.value.collectionExpanded[id]; persistPreferences(); }

function openCollection(group: { id: CollectionId; label: string; items: HatacordingMenuItem[] }, event: MouseEvent) {
	if (!sidebarCollapsed.value) {
		toggleCollection(group.id);
		return;
	}
	const anchor = event.currentTarget as HTMLElement;
	const items = group.items.length > 0
		? group.items.map(item => ({ type: 'button' as const, text: item.label, action: () => activateMenuItem(item) }))
		: [{ type: 'label' as const, text: copyx.collectionEmpty({ collection: group.label }) }];
	os.popupMenu(items, anchor, { width: 240 });
}

function openCollectionIconMenu(group: { id: CollectionId; label: string }, event: MouseEvent) {
	if (!menuEditing.value || sidebarCollapsed.value) return;
	const anchor = event.currentTarget as HTMLElement;
	const choices: [HatacordingUiCollectionIcon, string][] = [['tv', copy.television], ['list', copy.lists], ['radio', copy.antennas], ['folder', copy.folder], ['layers', copy.layers]];
	os.popupMenu(choices.map(([value, label]) => ({ type: 'button' as const, text: label, active: prefs.value.collectionIcons[group.id] === value, action: () => { prefs.value.collectionIcons[group.id] = value; persistPreferences(); } })), anchor);
}

function openMoreMenu(event: MouseEvent) {
	if (!sidebarCollapsed.value) {
		showMore.value = !showMore.value;
		return;
	}
	const anchor = event.currentTarget as HTMLElement;
	const items = hiddenMenuItems.value.length > 0
		? hiddenMenuItems.value.map(item => ({ type: 'button' as const, text: item.label, action: () => activateMenuItem(item) }))
		: [{ type: 'label' as const, text: copy.noOtherItems }];
	os.popupMenu(items, anchor);
}

async function openFeedbackIssue() {
	const { dispose } = os.popup((await import('@/components/HataFeedIssueWizard.vue')).default, { projectId: null, projects: [] }, { closed: () => dispose() });
}

function toggleSidebar() {
	prefs.value.sidebarCollapsed = !prefs.value.sidebarCollapsed;
	if (prefs.value.sidebarCollapsed) {
		menuEditing.value = false;
		showMore.value = false;
	}
	persistPreferences();
}

function openServerMenu(event: MouseEvent) { openInstanceMenu(event, path => openCenterPage(path)); }

type ResolvedMenuItem = Exclude<MenuItem, Promise<unknown>>;
type PromisedMenuItem = Awaited<Extract<MenuItem, Promise<unknown>>>;

function internalizeResolvedMenuItem(item: ResolvedMenuItem): ResolvedMenuItem {
	if (item.type === 'link') {
		return {
			type: 'button',
			text: item.text,
			caption: item.caption,
			icon: item.icon,
			indicate: item.indicate,
			avatar: item.avatar,
			action: () => openCenterPage(item.to),
		};
	}
	if (item.type === 'parent') {
		const children = item.children;
		return {
			...item,
			children: Array.isArray(children)
				? internalizeMenuLinks(children)
				: async () => internalizeMenuLinks(await children()),
		};
	}
	return item;
}

function internalizePromisedMenuItem(item: PromisedMenuItem): PromisedMenuItem {
	// MenuItem が Promise で許可する型は同期項目より狭い。
	// link→button と parent の子要素変換はいずれもその範囲内に収まる。
	return internalizeResolvedMenuItem(item) as PromisedMenuItem;
}

function internalizeMenuLinks(items: MenuItem[]): MenuItem[] {
	return items.map((item): MenuItem => item instanceof Promise
		? item.then(internalizePromisedMenuItem)
		: internalizeResolvedMenuItem(item));
}

async function openAccountMenu(event: MouseEvent) {
	const anchor = event.currentTarget as HTMLElement;
	const items = internalizeMenuLinks(await getAccountMenu({ withExtraOperation: true }));
	os.popupMenu(items, anchor);
}

function saveHatacordingTimelineFilter(key: 'withRenotes' | 'withSensitive' | 'onlyFiles', value: boolean) {
	store.set('tl', { ...store.s.tl, filter: { ...store.s.tl.filter, [key]: value } });
	void reloadTimeline();
}

function openTimelineOptions(event: MouseEvent) {
	const anchor = event.currentTarget as HTMLElement;
	os.popupMenu([
		{ type: 'label', text: copy.timelineDisplay },
		{ type: 'switch', text: copy.showRenotes, ref: timelineWithRenotes },
		{ type: 'switch', text: copy.showSensitiveFiles, ref: timelineWithSensitive },
		{ type: 'switch', text: copy.onlyPostsWithFiles, ref: timelineOnlyFiles },
		{ type: 'switch', text: copy.showPostForm, ref: timelineShowFixedPostForm },
		{ type: 'divider' },
		{ type: 'label', text: 'HataSNSCordUI' },
		{ type: 'component', component: HatacordingUiSettings, props: { accountId: $i.id, compact: true, realtimeAvailable: realtimeAvailable.value } },
		{ type: 'button', text: copy.chooseComposerShortcuts, action: () => openComposerShortcutSettings(anchor) },
		{ type: 'button', text: copy.replayTutorial, action: () => { tutorialOpen.value = true; } },
		{ type: 'divider' },
		{ type: 'button', text: copy.editMenu, action: () => { menuEditing.value = true; openLeftPane(); } },
	], anchor);
}

function syncHatacordingPreferences(event: Event) {
	const detail = (event as CustomEvent<HatacordingUiPreferencesChangeDetail>).detail;
	if (detail?.accountId !== $i.id) return;
	const colorModeChanged = prefs.value.colorMode !== detail.preferences.colorMode;
	const realtimeChanged = prefs.value.timelineRealtime !== detail.preferences.timelineRealtime;
	prefs.value = detail.preferences;
	if (colorModeChanged) startColorModeTransition();
	if (realtimeChanged) {
		if (prefs.value.timelineRealtime && realtimeAvailable.value) connectTimelineStream();
		else disconnectTimelineStream();
		if (realtimeAvailable.value) enqueueActivity(createTimelineRealtimeActivity(prefs.value.timelineRealtime), `timeline-realtime:${genId()}`);
	}
}

function openActiveCollectionSettings() {
	const target = activeCollectionSettings.value;
	if (target) openCenterPage(target.path, target.title);
}

function saveMenuEditing() {
	persistPreferences();
	menuEditing.value = false;
	os.toast(copy.menuSaved);
}

function userAcct(user: Misskey.entities.UserLite) { return `${user.username}${user.host ? `@${user.host}` : ''}`; }

function closeOverlays() { drawerOpen.value = false; rightPaneOpen.value = false; }

function openLeftPane() {
	// モバイルでは左右のペインを同時に開かない。右ペインから直接
	// 左ペインへ切り替える場合も、背後に右ペインを残さない。
	rightPaneOpen.value = false;
	drawerOpen.value = true;
}

function onMobileEdgeTouchStart(event: TouchEvent) {
	if (!isCompact.value || event.touches.length !== 1 || rootEl.value == null) {
		mobileEdgeTouch = null;
		return;
	}
	const touch = event.touches[0];
	const rect = rootEl.value.getBoundingClientRect();
	const edge = touch.clientX - rect.left <= 28 ? 'left' : rect.right - touch.clientX <= 28 ? 'right' : null;
	mobileEdgeTouch = edge == null ? null : { x: touch.clientX, y: touch.clientY, edge };
}

function onMobileEdgeTouchEnd(event: TouchEvent) {
	const start = mobileEdgeTouch;
	mobileEdgeTouch = null;
	if (!isCompact.value || start == null || event.changedTouches.length === 0) return;
	const touch = event.changedTouches[0];
	const deltaX = touch.clientX - start.x;
	const deltaY = touch.clientY - start.y;
	if (Math.abs(deltaX) < 64 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) return;
	if (start.edge === 'left' && deltaX > 0) openLeftPane();
	if (start.edge === 'right' && deltaX < 0) openRightPane();
}

function onMobileEdgeTouchCancel() {
	mobileEdgeTouch = null;
}

function openUiSetup() {
	const { dispose } = os.popup(MkUISetup, {}, { closed: () => dispose() });
}

function openRateLimitDetails() {
	const { dispose } = os.popup(defineAsyncComponent(() => import('@/components/HatacordingRateLimitDialog.vue')), {}, { closed: () => dispose() });
}

async function fetchCollections() { const results = await Promise.allSettled([misskeyApi('users/lists/list'), misskeyApi('antennas/list', { limit: 30 }), misskeyApi('channels/followed', { limit: 100 })]); if (results[0].status === 'fulfilled') userLists.value = results[0].value; if (results[1].status === 'fulfilled') antennas.value = results[1].value; if (results[2].status === 'fulfilled') channels.value = results[2].value; }

async function fetchTimelinePage(untilId?: string): Promise<TimelineNote[]> {
	const item = activeMenuItem.value;
	if (!item?.source) return [];
	const common = { limit: 20, untilId };
	const filtered = { ...common, withRenotes: store.s.tl.filter.withRenotes, withFiles: store.s.tl.filter.onlyFiles ? true : undefined };
	if (item.source === 'externalHome' || item.source === 'externalLocal') {
		const endpoint = item.source === 'externalHome' ? 'notes/timeline' : 'notes/local-timeline';
		const result = await callExternalApi<TimelineNote[]>(endpoint, filtered);
		return result.map(note => ({ ...note, __hatacordingExternal: true }));
	}
	if (item.source === 'home') return await misskeyApi('notes/timeline', filtered);
	if (item.source === 'local') return await misskeyApi('notes/local-timeline', filtered);
	if (item.source === 'social') return await misskeyApi('notes/hybrid-timeline', filtered);
	if (item.source === 'global') return await misskeyApi('notes/global-timeline', filtered);
	if (item.source === 'list') return await misskeyApi('notes/user-list-timeline', { ...filtered, listId: item.sourceId! });
	if (item.source === 'antenna') return await misskeyApi('antennas/notes', { ...common, antennaId: item.sourceId! });
	if (item.source === 'channel') return await misskeyApi('channels/timeline', { ...common, channelId: item.sourceId! });
	return await misskeyApi('notes/trending', { limit: 20, offset: untilId ? notes.value.length : 0, seed: 1 });
}

async function reloadTimeline() { fetching.value = true; loadError.value = false; pendingNotes.value = []; disconnectTimelineStream(); try { const result = await fetchTimelinePage(); notes.value = [...result].reverse(); hasMore.value = result.length >= 20; connectTimelineStream(); await nextTick(); scrollToBottom(false); } catch (error) { console.error('Failed to load HataSNSCordUI timeline', error); loadError.value = true; } finally { fetching.value = false; } }

async function loadMore() {
	if (loadingMore.value || !hasMore.value) return;
	loadingMore.value = true;
	const el = scrollEl.value;
	const oldHeight = el?.scrollHeight ?? 0;
	try {
		const oldest = notes.value[0];
		const result = await fetchTimelinePage(oldest?.id);
		const known = new Set(notes.value.map(note => note.id));
		const additions = result.filter(note => !known.has(note.id)).reverse();
		notes.value.unshift(...additions);
		for (const note of additions) if (note.__hatacordingExternal) captureExternalTimelineNote(note);
		hasMore.value = result.length >= 20;
		await nextTick();
		if (el) el.scrollTop += el.scrollHeight - oldHeight;
	} catch {
		await os.alert({ type: 'error', text: copy.pastConversationsLoadFailed });
	} finally {
		loadingMore.value = false;
	}
}

function externalReactionKey(noteId: string, reaction: string, delta: 1 | -1) {
	return `${noteId}:${reaction.replace(/@\./g, '')}:${delta}`;
}

function onExternalReactionChanged(noteId: string, reaction: string | null, oldReaction: string | null) {
	const found = findExternalTimelineNote(noteId);
	if (found) {
		const target = found.target;
		target.reactions ??= {};
		if (oldReaction) {
			const next = Math.max(0, (target.reactions[oldReaction] ?? 0) - 1);
			if (next === 0) delete target.reactions[oldReaction];
			else target.reactions[oldReaction] = next;
		}
		if (reaction) target.reactions[reaction] = (target.reactions[reaction] ?? 0) + 1;
		target.reactionCount = Object.values(target.reactions).reduce((total, count) => total + count, 0);
		target.myReaction = reaction;
		notes.value = [...notes.value];
		pendingNotes.value = [...pendingNotes.value];
	}
	if (reaction) pendingExternalReactionKeys.add(externalReactionKey(noteId, reaction, 1));
	if (oldReaction) pendingExternalReactionKeys.add(externalReactionKey(noteId, oldReaction, -1));
	window.setTimeout(() => {
		if (reaction) pendingExternalReactionKeys.delete(externalReactionKey(noteId, reaction, 1));
		if (oldReaction) pendingExternalReactionKeys.delete(externalReactionKey(noteId, oldReaction, -1));
	}, 10_000);
}

function captureExternalNoteId(noteId: string) {
	if (!externalTimelineSocket || externalTimelineSocket.readyState !== WebSocket.OPEN || externalCapturedNoteIds.has(noteId)) return;
	externalCapturedNoteIds.add(noteId);
	externalTimelineSocket.send(JSON.stringify({ type: 'subNote', body: { id: noteId } }));
}

function captureExternalTimelineNote(note: TimelineNote) {
	captureExternalNoteId(note.id);
	if (note.renote?.id) captureExternalNoteId(note.renote.id);
}

function findExternalTimelineNote(noteId: string): { outer: TimelineNote; target: TimelineNote } | null {
	for (const outer of [...notes.value, ...pendingNotes.value]) {
		if (outer.id === noteId) return { outer, target: outer };
		if (outer.renote?.id === noteId) return { outer, target: outer.renote as TimelineNote };
	}
	return null;
}

function handleExternalNoteUpdated(noteId: string, type: string, body: any) {
	const found = findExternalTimelineNote(noteId);
	if (!found) return;
	const { target } = found;
	if (type === 'deleted') {
		removeTimelineNote(noteId);
		externalCapturedNoteIds.delete(noteId);
		return;
	}
	if (type === 'reacted' || type === 'unreacted') {
		const delta: 1 | -1 = type === 'reacted' ? 1 : -1;
		const reaction = String(body?.reaction ?? '');
		if (!reaction) return;
		const pendingKey = externalReactionKey(noteId, reaction, delta);
		if (pendingExternalReactionKeys.delete(pendingKey) || body?.userId === externalAccount.value?.userId) return;
		target.reactions ??= {};
		const next = Math.max(0, (target.reactions[reaction] ?? 0) + delta);
		if (next === 0) delete target.reactions[reaction];
		else target.reactions[reaction] = next;
		target.reactionCount = Math.max(0, (target.reactionCount ?? 0) + delta);
		if (body?.emoji?.url) {
			target.reactionEmojis ??= {};
			target.reactionEmojis[reaction.replace(/^:|:$/g, '').split('@')[0]] = body.emoji.url;
		}
	} else if (type === 'pollVoted' && target.poll) {
		const choice = Number(body?.choice);
		if (Number.isInteger(choice) && target.poll.choices[choice]) {
			target.poll.choices[choice].votes += 1;
			if (body?.userId === externalAccount.value?.userId) target.poll.choices[choice].isVoted = true;
		}
	} else if (type === 'updated') {
		target.updatedAt = new Date().toISOString();
		target.cw = body?.cw ?? null;
		target.text = body?.text ?? null;
	} else if (type === 'utageStatusUpdated') {
		(target as TimelineNote & { utageStatus?: string }).utageStatus = body?.status;
	}
	// 外部ノートは独自コンポーネント内にもリアクティブ状態を持つため、
	// 配列参照も更新して prop の同期 watcher を確実に起動する。
	notes.value = [...notes.value];
	pendingNotes.value = [...pendingNotes.value];
}

function disconnectTimelineStream() {
	externalTimelineStreamGeneration += 1;
	timelineConnection?.dispose();
	timelineConnection = null;
	if (externalTimelineReconnectTimer != null) window.clearTimeout(externalTimelineReconnectTimer);
	if (externalTimelinePollTimer != null) window.clearInterval(externalTimelinePollTimer);
	externalTimelineReconnectTimer = null;
	externalTimelinePollTimer = null;
	externalTimelineSocket?.close();
	externalTimelineSocket = null;
	externalCapturedNoteIds.clear();
	pendingExternalReactionKeys.clear();
	externalTimelineReconnectAttempts = 0;
}

async function appendLiveNote(note: TimelineNote) {
	if (notes.value.some(item => item.id === note.id) || pendingNotes.value.some(item => item.id === note.id)) return;
	if (note.__hatacordingExternal) captureExternalTimelineNote(note);
	if (isNearBottom()) {
		notes.value.push(note);
		await nextTick();
		scrollToBottom();
	} else {
		pendingNotes.value.push(note);
	}
}

async function pollExternalTimeline() {
	const source = activeMenuItem.value?.source;
	if (source !== 'externalHome' && source !== 'externalLocal') return;
	const newest = notes.value.at(-1);
	if (!newest) return;
	try {
		const endpoint = source === 'externalHome' ? 'notes/timeline' : 'notes/local-timeline';
		const result = await callExternalApi<TimelineNote[]>(endpoint, { limit: 20, sinceId: newest.id });
		for (const note of [...result].reverse()) await appendLiveNote({ ...note, __hatacordingExternal: true });
	} catch (error) {
		console.warn('HataSNSCordUI external timeline polling failed', error);
	}
}

function connectExternalTimelineStream(source: 'externalHome' | 'externalLocal') {
	const account = externalAccount.value;
	if (!account) return;
	const connectionId = 'hatacording-external-timeline';
	const channel = source === 'externalHome' ? 'homeTimeline' : 'localTimeline';
	const streamGeneration = ++externalTimelineStreamGeneration;
	try {
		externalTimelineSocket = new WebSocket(`wss://${account.host}/streaming?i=${encodeURIComponent(account.token)}`);
		externalTimelineSocket.onopen = () => {
			externalTimelineReconnectAttempts = 0;
			externalTimelineSocket?.send(JSON.stringify({ type: 'connect', body: { channel, id: connectionId } }));
			externalCapturedNoteIds.clear();
			for (const note of [...notes.value, ...pendingNotes.value]) captureExternalTimelineNote(note);
		};
		externalTimelineSocket.onmessage = (message) => {
			try {
				const data = JSON.parse(String(message.data));
				if (data.type === 'channel' && data.body?.id === connectionId && data.body?.type === 'note') void appendLiveNote({ ...data.body.body, __hatacordingExternal: true });
				if (data.type === 'noteUpdated') handleExternalNoteUpdated(data.body?.id, data.body?.type, data.body?.body);
			} catch {
				// 外部ストリームの不正な1フレームだけを読み飛ばす。
			}
		};
		externalTimelineSocket.onclose = () => {
			externalTimelineSocket = null;
			externalCapturedNoteIds.clear();
			if (streamGeneration !== externalTimelineStreamGeneration || !prefs.value.timelineRealtime || activeMenuItem.value?.source !== source) return;
			const delay = Math.min(1000 * 2 ** externalTimelineReconnectAttempts, 60_000);
			externalTimelineReconnectAttempts += 1;
			externalTimelineReconnectTimer = window.setTimeout(() => connectExternalTimelineStream(source), delay);
		};
	} catch (error) {
		console.warn('HataSNSCordUI external timeline stream failed', error);
	}
	externalTimelinePollTimer = window.setInterval(() => { void pollExternalTimeline(); }, 30_000);
}

function connectTimelineStream() {
	if (!prefs.value.timelineRealtime) return;
	const item = activeMenuItem.value;
	if (!item?.source || item.source === 'trending') return;
	if (item.source === 'externalHome' || item.source === 'externalLocal') {
		connectExternalTimelineStream(item.source);
		return;
	}
	let channel = 'localTimeline';
	let params: any = { withRenotes: store.s.tl.filter.withRenotes, withFiles: store.s.tl.filter.onlyFiles ? true : undefined };
	if (item.source === 'home') channel = 'homeTimeline';
	else if (item.source === 'social') channel = 'hybridTimeline';
	else if (item.source === 'global') channel = 'globalTimeline';
	else if (item.source === 'list') {
		channel = 'userList'; params.listId = item.sourceId;
	} else if (item.source === 'antenna') {
		channel = 'antenna'; params = { antennaId: item.sourceId };
	} else if (item.source === 'channel') {
		channel = 'channel'; params = { channelId: item.sourceId };
	}
	timelineConnection = stream.useChannel(channel as any, params);
	timelineConnection.on('note', (note: Misskey.entities.Note) => { void appendLiveNote(note); });
}

function activityIcon(icon: HatacordingActivityIcon): Component {
	return ({ bell: Bell, user: UserRound, sparkles: Sparkles, message: MessageCircle, activity: Activity, unplug: Unplug })[icon];
}

function activityMfmAuthor(activity: ActivityPayload): Misskey.entities.UserLite | undefined {
	return activity.note?.user ?? activity.user;
}

function activityEmojiUrls(activity: ActivityPayload): Record<string, string> {
	const result: Record<string, string> = {};
	for (const source of [activity.user?.emojis, activity.note?.emojis, activity.note?.reactionEmojis, activity.emojiUrls]) {
		if (source == null || typeof source !== 'object') continue;
		for (const [name, url] of Object.entries(source)) {
			if (typeof url === 'string' && url.length > 0) result[name] = url;
		}
	}
	const reactionName = activity.reaction?.match(/^:([^:]+):$/)?.[1];
	if (reactionName && activity.reactionEmojiUrl) {
		result[reactionName] = activity.reactionEmojiUrl;
		result[reactionName.split('@', 1)[0]] = activity.reactionEmojiUrl;
	}
	return result;
}

function activityWait(milliseconds: number): Promise<void> {
	return new Promise(resolve => {
		const timer = window.setTimeout(() => {
			activityTimers.delete(timer);
			resolve();
		}, milliseconds);
		activityTimers.add(timer);
	});
}

const ACTIVITY_REVEAL_MS = 700;
const ACTIVITY_EXPANDED_HOLD_MS = 3000;
const ACTIVITY_SHIMMER_MS = 6500;
const NOTIFICATION_GROUP_WINDOW_MS = 8000;
const NOTIFICATION_ARCHIVE_AGE_MS = 120_000;
const EARTHQUAKE_GROUP_WINDOW_MS = 30_000;

function isNotificationActivity(event: Pick<ActivityPayload, 'kind'>): boolean {
	return event.kind === 'notification' || event.kind === 'external';
}

function isEarthquakeActivity(activity: Pick<ActivityPayload, 'kind'>): boolean {
	return activity.kind === 'earthquake' || activity.kind === 'tsunami';
}

function isGroupedEarthquakeActivity(activity: PendingActivityEvent): boolean {
	return activity.notificationItems?.some(isEarthquakeActivity) === true;
}

function groupedActivitySuffix(activity: PendingActivityEvent): string {
	if (isGroupedEarthquakeActivity(activity)) return '件の地震・津波情報があります';
	if (activity.botOrigin === true) return activity.archived ? copy.pastBotNotificationsSuffix : copy.currentBotNotificationsSuffix;
	return activity.archived ? copy.pastNotificationsSuffix : copy.currentNotificationsSuffix;
}

function notificationSummaryText(count: number, botOrigin: boolean, archived: boolean): string {
	const params = { count: count.toString() };
	if (botOrigin) return archived ? copyx.pastBotNotifications(params) : copyx.currentBotNotifications(params);
	return archived ? copyx.pastNotifications(params) : copyx.currentNotifications(params);
}

function activityPayload(event: ActivityPayload): ActivityPayload {
	return {
		id: event.id,
		text: event.text,
		detail: event.detail,
		icon: event.icon,
		iconName: event.iconName,
		to: event.to,
		createdAt: event.createdAt,
		kind: event.kind,
		emergency: event.emergency,
		user: event.user,
		action: event.action,
		reaction: event.reaction,
		reactionEmojiUrl: event.reactionEmojiUrl,
		emojiUrls: event.emojiUrls,
		note: event.note,
		notificationType: event.notificationType,
		botOrigin: event.botOrigin,
		cacheSource: event.cacheSource,
	};
}

function isCacheableActivity(event: Pick<ActivityPayload, 'kind'>): event is ActivityPayload & { kind: HatacordingCachedActivity['kind'] } {
	return event.kind === 'notification' || event.kind === 'external' || event.kind === 'earthquake' || event.kind === 'tsunami';
}

function toCachedActivity(event: ActivityPayload): HatacordingCachedActivity | null {
	if (!isCacheableActivity(event)) return null;
	return {
		id: event.id,
		text: event.text,
		detail: event.detail,
		iconName: event.iconName,
		to: event.to,
		createdAt: event.createdAt,
		kind: event.kind,
		emergency: event.emergency,
		user: event.user,
		action: event.action,
		reaction: event.reaction,
		reactionEmojiUrl: event.reactionEmojiUrl,
		notificationType: event.notificationType,
		cacheSource: event.cacheSource,
	};
}

function fromCachedActivity(event: HatacordingCachedActivity): ActivityPayload {
	if (event.cacheSource != null) {
		const localized = createNotificationActivityFromSource(event.cacheSource);
		return {
			id: event.id,
			text: localized.title,
			detail: localized.detail,
			icon: activityIcon(localized.icon),
			iconName: localized.icon,
			to: localized.to,
			createdAt: event.createdAt,
			kind: localized.kind,
			emergency: localized.emergency,
			user: localized.user,
			action: localized.action,
			reaction: localized.reaction,
			reactionEmojiUrl: localized.reactionEmojiUrl,
			emojiUrls: localized.emojiUrls,
			note: localized.note,
			notificationType: localized.notificationType,
			botOrigin: localized.botOrigin,
			cacheSource: localized.cacheSource,
		};
	}
	return {
		...event,
		text: event.text ?? '',
		detail: event.detail ?? '',
		icon: activityIcon(event.iconName),
		botOrigin: event.user?.isBot === true,
	};
}

function persistActivityHistory() {
	const entries = [...activityEvents.value, ...activityQueue]
		.flatMap(flattenedNotifications)
		.map(toCachedActivity)
		.filter((event): event is HatacordingCachedActivity => event != null);
	writeHatacordingActivityCache($i.id, entries);
}

function restoreActivityHistory() {
	const cached = readHatacordingActivityCache($i.id);
	if (cached.length === 0) return;
	const notifications = cached.filter(event => event.kind === 'notification' || event.kind === 'external').map(fromCachedActivity);
	const earthquakes = cached.filter(event => event.kind === 'earthquake' || event.kind === 'tsunami').map(fromCachedActivity);
	for (const botOrigin of [false, true]) {
		const groupedNotifications = notifications.filter(event => (event.botOrigin === true) === botOrigin);
		if (groupedNotifications.length === 0) continue;
		const latest = groupedNotifications.at(-1)!;
		activityEvents.value.push(reactive<ActivityEvent>({
			id: `notification-history:cached:${botOrigin ? 'bot' : 'human'}:${latest.id}`,
			text: notificationSummaryText(groupedNotifications.length, botOrigin, true),
			detail: copy.expandPastNotifications,
			icon: activityIcon('bell'),
			iconName: 'bell',
			to: '/my/notifications',
			createdAt: latest.createdAt,
			kind: 'notification',
			emergency: false,
			botOrigin,
			notificationItems: groupedNotifications,
			archived: true,
			phase: 'settled',
			expanded: false,
			animationRevision: 0,
		}));
	}
	if (earthquakes.length > 0) {
		const latest = earthquakes.at(-1)!;
		activityEvents.value.push(reactive<ActivityEvent>({
			id: `earthquake-history:cached:${latest.id}`,
			text: `${earthquakes.length}件の地震・津波情報があります`,
			detail: '展開すると、過去の地震・津波情報を確認できます。',
			icon: activityIcon('activity'),
			iconName: 'activity',
			to: '/earthquake',
			createdAt: latest.createdAt,
			kind: 'earthquake',
			emergency: true,
			notificationItems: earthquakes,
			phase: 'settled',
			expanded: false,
			animationRevision: 0,
		}));
	}
	trimActivityEvents();
	// 読み込み時に期限切れ・重複を除いた結果でキャッシュも小さく保つ。
	persistActivityHistory();
}

const activityAbsoluteFormatter = new Intl.DateTimeFormat(versatileLang, {
	year: 'numeric',
	month: 'numeric',
	day: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
});
const activityClockFormatter = new Intl.DateTimeFormat(versatileLang, { hour: '2-digit', minute: '2-digit' });
const activityMonthDayFormatter = new Intl.DateTimeFormat(versatileLang, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function activityAbsoluteTime(createdAt: string): string {
	const date = new Date(createdAt);
	return Number.isFinite(date.getTime()) ? activityAbsoluteFormatter.format(date) : copy.unknownDateTime;
}

function activityTimeLabel(createdAt: string): string {
	const date = new Date(createdAt);
	const time = date.getTime();
	if (!Number.isFinite(time)) return copy.unknownDateTime;
	const now = rateLimitNow.value;
	const elapsed = Math.max(0, now - time);
	if (elapsed < 10_000) return copy.justNow;
	if (elapsed < 120_000) return copy.momentsAgo;
	if (elapsed < 60 * 60 * 1000) return copyx.minutesAgo({ minutes: Math.floor(elapsed / 60_000).toString() });
	const current = new Date(now);
	if (date.toDateString() === current.toDateString()) return activityClockFormatter.format(date);
	if (date.getFullYear() === current.getFullYear()) return activityMonthDayFormatter.format(date);
	return activityAbsoluteFormatter.format(date);
}

function trimActivityEvents() {
	const archived = activityEvents.value.filter(event => event.archived);
	const current = activityEvents.value.filter(event => !event.archived);
	// 通知は2分後に履歴カードへ集約するまでは捨てない。操作完了などの
	// 一時的なイベントだけを末尾12件に絞り、通知の取りこぼしを防ぐ。
	const notifications = current.filter(isNotificationActivity);
	const transient = current.filter(event => !isNotificationActivity(event)).slice(-12);
	activityEvents.value = [...archived, ...notifications, ...transient]
		.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

async function playActivityAnimation(event: ActivityEvent, reveal: boolean) {
	if (event.emergency || activityDisposed) return;
	const revision = ++event.animationRevision;
	const playShimmer = prefs.value.showFoilAnimation && !event.notificationItems?.length;
	// 連続受信で既にshimmer中でも、いったんクラスを外して次の2走を確実に再開する。
	if (playShimmer && !reveal && event.phase === 'highlighting') {
		event.phase = 'settled';
		await nextTick();
		if (activityDisposed || revision !== event.animationRevision) return;
	}
	event.phase = reveal ? 'revealing' : playShimmer ? 'highlighting' : 'settled';
	event.expanded = reveal && !event.notificationItems?.length;
	if (reveal) {
		await activityWait(ACTIVITY_REVEAL_MS);
		if (activityDisposed || revision !== event.animationRevision) return;
		// 内容を読める時間をshimmerとは別に確保する。アニメーションが終わる前に
		// 詳細が縮んでしまうと、通知文を追えない。
		await activityWait(ACTIVITY_EXPANDED_HOLD_MS);
		if (activityDisposed || revision !== event.animationRevision) return;
		event.phase = playShimmer ? 'highlighting' : 'settled';
	}
	if (playShimmer) {
		await activityWait(ACTIVITY_SHIMMER_MS);
		if (activityDisposed || revision !== event.animationRevision) return;
	}
	event.expanded = false;
	event.phase = 'settled';
}

function hasActivityId(id: string): boolean {
	return [...activityEvents.value, ...activityQueue].some(event => event.id === id || event.notificationItems?.some(item => item.id === id));
}

function newestNotificationCandidateForAudience(pending: PendingActivityEvent): PendingActivityEvent | ActivityEvent | undefined {
	return [...activityEvents.value, ...activityQueue]
		.filter(event => !event.archived && isNotificationActivity(event) && sharesHatacordingNotificationAudience(event, pending))
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

function mergeConsecutiveNotification(pending: PendingActivityEvent): boolean {
	const target = newestNotificationCandidateForAudience(pending);
	if (!target) return false;
	const gap = Math.abs(new Date(pending.createdAt).getTime() - new Date(target.createdAt).getTime());
	if (!Number.isFinite(gap) || gap > NOTIFICATION_GROUP_WINDOW_MS) return false;
	const items = target.notificationItems?.length ? target.notificationItems : [activityPayload(target)];
	target.notificationItems = [...items, activityPayload(pending)];
	target.botOrigin = pending.botOrigin === true;
	target.text = notificationSummaryText(target.notificationItems.length, target.botOrigin, false);
	target.detail = copy.expandNotifications;
	target.createdAt = pending.createdAt;
	target.kind = 'notification';
	target.icon = activityIcon('bell');
	target.iconName = 'bell';
	target.to = '/my/notifications';
	target.user = undefined;
	target.action = undefined;
	target.reaction = undefined;
	target.reactionEmojiUrl = undefined;
	target.note = undefined;
	target.notificationType = undefined;
	if ('animationRevision' in target) {
		target.animationRevision += 1;
		target.expanded = false;
		target.phase = 'settled';
	}
	nextTick(() => { if (isNearBottom()) scrollToBottom(); });
	persistActivityHistory();
	return true;
}

function turnBotNotificationIntoGroup(pending: PendingActivityEvent) {
	if (pending.botOrigin !== true || pending.notificationItems?.length) return;
	const item = activityPayload(pending);
	pending.notificationItems = [item];
	pending.text = notificationSummaryText(1, true, false);
	pending.detail = copy.expandNotifications;
	pending.icon = activityIcon('bell');
	pending.iconName = 'bell';
	pending.to = '/my/notifications';
	pending.user = undefined;
	pending.action = undefined;
	pending.reaction = undefined;
	pending.reactionEmojiUrl = undefined;
	pending.note = undefined;
	pending.notificationType = undefined;
}

function mergeConsecutiveEarthquake(pending: PendingActivityEvent): boolean {
	const target = [...activityEvents.value]
		.reverse()
		.find(activity => !activity.archived && (isEarthquakeActivity(activity) || isGroupedEarthquakeActivity(activity)));
	if (!target) return false;
	const gap = Math.abs(new Date(pending.createdAt).getTime() - new Date(target.createdAt).getTime());
	if (!Number.isFinite(gap) || gap > EARTHQUAKE_GROUP_WINDOW_MS) return false;
	const items = target.notificationItems?.length ? target.notificationItems : [activityPayload(target)];
	target.notificationItems = [...items, activityPayload(pending)];
	target.text = `${target.notificationItems.length}件の地震・津波情報があります`;
	target.detail = '展開すると、それぞれの地震・津波情報を確認できます。';
	target.createdAt = pending.createdAt;
	target.kind = 'earthquake';
	target.icon = activityIcon('activity');
	target.iconName = 'activity';
	target.to = '/earthquake';
	target.emergency = true;
	target.user = undefined;
	target.action = undefined;
	target.reaction = undefined;
	target.reactionEmojiUrl = undefined;
	target.note = undefined;
	target.notificationType = undefined;
	target.animationRevision += 1;
	target.expanded = false;
	target.phase = 'settled';
	nextTick(() => { if (isNearBottom()) scrollToBottom(); });
	persistActivityHistory();
	return true;
}

function flattenedNotifications(event: PendingActivityEvent): ActivityPayload[] {
	return event.notificationItems?.length ? event.notificationItems.map(activityPayload) : [activityPayload(event)];
}

function archiveNotifications(now = Date.now(), includeRecent = false) {
	const targets = activityEvents.value.filter(event => !event.archived
		&& isNotificationActivity(event)
		&& (includeRecent || now - new Date(event.createdAt).getTime() >= NOTIFICATION_ARCHIVE_AGE_MS));
	// 1枚のグループカード内に複数通知がある場合も「複数」として集約する。
	if (targets.length === 0) return;
	// 元通知の受信時刻をそのまま使うと、集約した瞬間に時系列ソートで
	// 過去のノート群へ移動し、画面上では通知が消えたように見える。
	// 集約という新しい表示イベントが起きた時刻へ更新し、最新位置に残す。
	const archiveCreatedAt = new Date(now).toISOString();
	for (const botOrigin of [false, true]) {
		const audienceTargets = targets.filter(event => (event.botOrigin === true) === botOrigin);
		const incoming = audienceTargets.flatMap(flattenedNotifications);
		if (incoming.length === 0) continue;
		const archive = activityEvents.value.find(event => event.archived && (event.botOrigin === true) === botOrigin);
		if (archive) {
			archive.notificationItems = [...(archive.notificationItems ?? []), ...incoming];
			archive.text = notificationSummaryText(archive.notificationItems.length, botOrigin, true);
			archive.detail = copy.expandPastNotifications;
			archive.createdAt = archiveCreatedAt;
			archive.expanded = false;
			archive.animationRevision += 1;
			archive.phase = 'settled';
		} else {
			const historyEvent = reactive<ActivityEvent>({
				id: `notification-history:${botOrigin ? 'bot' : 'human'}:${now}`,
				text: notificationSummaryText(incoming.length, botOrigin, true),
				detail: copy.expandPastNotifications,
				icon: activityIcon('bell'),
				iconName: 'bell',
				to: '/my/notifications',
				createdAt: archiveCreatedAt,
				kind: 'notification',
				emergency: false,
				botOrigin,
				notificationItems: incoming,
				archived: true,
				phase: 'settled',
				expanded: false,
				animationRevision: 0,
			});
			activityEvents.value.push(historyEvent);
		}
	}
	// スクロール中に表示アニメーションが残っても、除去済みカードを後から更新しない。
	for (const event of targets) event.animationRevision += 1;
	const targetIds = new Set(targets.map(event => event.id));
	activityEvents.value = activityEvents.value.filter(event => !targetIds.has(event.id));
	trimActivityEvents();
	persistActivityHistory();
}

async function runActivityQueue() {
	if (activityQueueRunning || activityDisposed) return;
	activityQueueRunning = true;
	try {
		while (activityQueue.length > 0 && !activityDisposed) {
			const queued = activityQueue.shift()!;
			const { onSettled, ...eventPayload } = queued;
			const event = reactive<ActivityEvent>({
				...eventPayload,
				phase: 'revealing',
				expanded: !queued.notificationItems?.length,
				animationRevision: 0,
			});
			activityEvents.value.push(event);
			trimActivityEvents();
			persistActivityHistory();
			await nextTick();
			if (isNearBottom()) scrollToBottom();
			await playActivityAnimation(event, true);
			onSettled?.();
			await activityWait(180);
		}
	} finally {
		activityQueueRunning = false;
	}
}

function enqueueActivity(copy: HatacordingActivityCopy, id: string, createdAt = new Date().toISOString(), options: { priority?: boolean; onSettled?: () => void } = {}) {
	if (hasActivityId(id)) return;
	const pending: PendingActivityEvent = {
		id,
		text: copy.title,
		detail: copy.detail,
		icon: activityIcon(copy.icon),
		iconName: copy.icon,
		to: copy.to,
		createdAt,
		kind: copy.kind,
		emergency: copy.emergency,
		user: copy.user,
		action: copy.action,
		reaction: copy.reaction,
		reactionEmojiUrl: copy.reactionEmojiUrl,
		emojiUrls: copy.emojiUrls,
		note: copy.note,
		notificationType: copy.notificationType,
		botOrigin: copy.botOrigin,
		cacheSource: copy.cacheSource,
		onSettled: options.onSettled,
	};
	if (copy.emergency) {
		if (isEarthquakeActivity(pending) && mergeConsecutiveEarthquake(pending)) return;
		activityEvents.value.push(reactive<ActivityEvent>({ ...pending, phase: 'settled', expanded: true, animationRevision: 0 }));
		trimActivityEvents();
		persistActivityHistory();
		nextTick(() => { if (isNearBottom()) scrollToBottom(); });
		return;
	}
	if (isNotificationActivity(pending)) {
		if (mergeConsecutiveNotification(pending)) return;
		turnBotNotificationIntoGroup(pending);
	}
	if (options.priority) activityQueue.unshift(pending);
	else activityQueue.push(pending);
	persistActivityHistory();
	void runActivityQueue();
}

function reconnectServer() {
	window.location.reload();
}

function onServerDisconnected() {
	if (activeDisconnectActivityId.value != null) return;
	lastDisconnectBehavior = prefer.s.serverDisconnectedBehavior;
	const id = `server-disconnected:${++serverConnectionSequence}`;
	activeDisconnectActivityId.value = id;
	enqueueActivity(createServerDisconnectedActivity(lastDisconnectBehavior), id, new Date().toISOString(), {
		priority: true,
		// 共通側の即時リロードはこのUIの表示中だけ抑止している。
		// 自動リロード設定では、2回のshimmerを最後まで見せてから同じ動作を行う。
		onSettled: lastDisconnectBehavior === 'reload' ? reconnectServer : undefined,
	});
}

function onServerConnected() {
	if (activeDisconnectActivityId.value == null) return;
	activeDisconnectActivityId.value = null;
	// 自動リロード設定では、直前の切断shimmerが終わった時点で再読込するため、
	// その直前に重複する「再接続済み」カードは追加しない。
	if (lastDisconnectBehavior === 'reload') return;
	enqueueActivity(createServerReconnectedActivity(false), `server-reconnected:${serverConnectionSequence}`, new Date().toISOString(), { priority: true });
}

function connectMainStream() {
	if (!store.s.realtimeMode || mainConnection) return;
	mainConnection = stream.useChannel('main');
	mainConnection.on('notification', (notification: Record<string, any>) => {
		// earthquakeEvent は同じP2P電文を通知生成より先に即時配信する。
		// HataSNSCordUIではそちらを唯一の表示経路にし、main通知との二重表示を防ぐ。
		if (notification.type === 'earthquake') return;
		enqueueActivity(
			createNotificationActivity(notification),
			`notification:${String(notification.id ?? genId())}`,
			typeof notification.createdAt === 'string' ? notification.createdAt : new Date().toISOString(),
		);
	});
}

function onEarthquakeEvent(payload: { code: number; item: Record<string, any> }) {
	const copy = createEarthquakeActivity(payload);
	if (copy == null) return;
	const sourceId = String(payload.item.id ?? payload.item.reportDatetime ?? payload.item.time ?? genId());
	enqueueActivity(copy, `${copy.kind}:${sourceId}`, new Date().toISOString());
}

function onHatacordingApiAction(endpoint: string) {
	const copy = createApiActionActivity(endpoint);
	if (copy == null) return;
	enqueueActivity(copy, `api-action:${endpoint}:${genId()}`);
}

function isNearBottom() { const el = scrollEl.value; return !el || el.scrollHeight - el.clientHeight - el.scrollTop < 130; }

function scrollToBottom(smooth = true) { scrollEl.value?.scrollTo({ top: scrollEl.value.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); }

let timelineScrollInteractionPending = false;
let timelineScrollInteractionTimer: number | null = null;

function markTimelineScrollInteraction() {
	timelineScrollInteractionPending = true;
	if (timelineScrollInteractionTimer != null) window.clearTimeout(timelineScrollInteractionTimer);
	// タップだけで終わった場合に、後続の自動スクロールを利用者操作と
	// 誤認しないよう、短時間で意図フラグを失効させる。
	timelineScrollInteractionTimer = window.setTimeout(() => {
		timelineScrollInteractionPending = false;
		timelineScrollInteractionTimer = null;
	}, 800);
}

function onTimelinePointerDown(event: PointerEvent) {
	// マウスでスクロールバーや余白をつかんだ場合だけを意図として記録する。
	// 投稿内ボタンのクリック後に起きた自動スクロールは対象にしない。
	if (event.pointerType === 'mouse' && event.target === event.currentTarget) markTimelineScrollInteraction();
}

function onTimelineScroll() {
	showJumpControl.value = !isNearBottom();
	if (!timelineScrollInteractionPending) return;
	timelineScrollInteractionPending = false;
	if (timelineScrollInteractionTimer != null) window.clearTimeout(timelineScrollInteractionTimer);
	timelineScrollInteractionTimer = null;
	archiveNotifications(Date.now(), true);
}

function showPendingNotes() { const known = new Set(notes.value.map(note => note.id)); notes.value.push(...pendingNotes.value.filter(note => !known.has(note.id))); pendingNotes.value = []; nextTick(() => scrollToBottom()); }

function onEmbeddedNoteClick(event: MouseEvent, note: Misskey.entities.Note) {
	const target = event.target instanceof Element ? event.target : null;
	if (!target || window.getSelection()?.toString()) return;
	if (target.closest('a, button, input, textarea, select, [role="button"], [contenteditable="true"]')) return;
	if (target.closest('img, video, audio, canvas, [data-marker], [data-is-hidden]')) return;
	const focusableMedia = target.closest('[tabindex="0"]');
	if (focusableMedia?.querySelector(':scope > div > img, :scope > div > video')) return;
	if (target.closest('header') || target.closest('._noSelect')) {
		event.stopPropagation();
		void openProfileTab(note.user);
		return;
	}
	if (target.closest('[data-note-content]')) {
		event.stopPropagation();
		openNoteTab(note);
	}
}

function activityAriaLabel(event: ActivityEvent): string {
	return event.detail ? copyx.activityWithDetail({ title: event.text, detail: event.detail }) : event.text;
}

function activateActivity(event: ActivityPayload) {
	if (event.kind === 'connection') {
		if (event.id === activeDisconnectActivityId.value) reconnectServer();
	} else if (event.kind === 'external' || event.to === '/my/external-notifications') {
		openExternalNotifications();
	} else if (event.note) {
		openNoteTab(event.note);
	} else if (event.to === '/my/notifications') {
		void openInternalPage('notifications', copy.notifications);
	} else if (event.to === '/chat') {
		void openInternalPage('chat', copy.chat);
	} else if (event.to === '/my/favorites') {
		void openInternalPage('favorites', copy.favorites);
	} else if (event.to === '/my/clips') {
		void openInternalPage('clips', copy.clips);
	} else if ((event.notificationType === 'follow' || event.notificationType === 'followRequestAccepted') && event.user) {
		void openProfileTab(event.user);
	} else {
		openCenterPage(event.to, event.kind === 'earthquake' || event.kind === 'tsunami' ? '地震・津波情報' : undefined);
	}
}

function openActivityEvent(event: ActivityEvent) {
	if (event.notificationItems?.length) {
		event.expanded = !event.expanded;
		return;
	}
	activateActivity(event);
}

function openExternalNotifications() {
	openInternalPage('externalNotifications', copy.externalNotifications);
	if (externalAccount.value) externalUnread.value = false;
}

function mentionUser(user: Misskey.entities.UserLite) {
	const mention = `@${user.username}${user.host ? `@${user.host}` : ''}`;
	if (!draftText.value.includes(mention)) draftText.value = `${draftText.value}${draftText.value ? ' ' : ''}${mention} `;
	if (!visibleUsers.value.some(recipient => recipient.id === user.id)) visibleUsers.value.push(user);
	composerContext.value = { kind: 'mention', label: copyx.mentionUser({ user: mention }) };
}

function mergeInitialComposerText(text?: string) {
	if (!text) return;
	if (draftText.value.trim().length === 0) draftText.value = text;
	else if (!draftText.value.includes(text)) draftText.value = `${draftText.value}${draftText.value.endsWith(' ') ? '' : ' '}${text}`;
}

/** MkNote / MkNoteDetailed からの返信・引用要求を、画面下の投稿欄へ移す。 */
function adoptPostFormRequest(props: PostFormProps): boolean {
	if (props.updateMode || props.initialNote || props.externalReply || props.externalRenote || props.initialUseExternalAccount) return false;
	if (!props.reply && !props.renote && !props.mention && !props.specified && props.channel === undefined) return false;

	const sourceNote = props.reply ?? props.renote ?? null;
	const requestedChannel = (props.channel ?? sourceNote?.channel ?? null) as ComposerChannel | null;
	if (props.reply) {
		const name = props.reply.user.name || props.reply.user.username;
		composerContext.value = { kind: 'reply', note: props.reply, channel: requestedChannel, label: copyx.replyTo({ name }) };
	} else if (props.renote) {
		const name = props.renote.user.name || props.renote.user.username;
		composerContext.value = { kind: 'quote', note: props.renote, channel: requestedChannel, label: copyx.quotePostBy({ name }) };
	} else if (requestedChannel) {
		composerContext.value = { kind: 'channel', channel: requestedChannel, label: copyx.postTo({ name: requestedChannel.name }) };
	}

	mergeInitialComposerText(props.initialText);
	if (props.initialCw !== undefined) {
		cwEnabled.value = true;
		cwText.value = props.initialCw;
	}
	if (props.initialFiles?.length) {
		const known = new Set(draftFiles.value.map(file => file.id));
		draftFiles.value.push(...props.initialFiles.filter(file => !known.has(file.id)));
	}
	if (!requestedChannel && props.initialVisibility) visibility.value = props.initialVisibility;
	if (!requestedChannel && props.initialLocalOnly !== undefined) localOnly.value = props.initialLocalOnly;
	if (props.initialVisibleUsers?.length) visibleUsers.value = [...props.initialVisibleUsers];
	if (props.specified && !visibleUsers.value.some(user => user.id === props.specified!.id)) visibleUsers.value.push(props.specified);
	if (props.specified) visibility.value = 'specified';
	if (props.mention && !props.reply && !props.renote && !requestedChannel) mentionUser(props.mention);

	void nextTick(() => {
		composerInput.value?.focus();
		composerInput.value?.scrollIntoView({ block: 'nearest', behavior: prefer.s.animation ? 'smooth' : 'auto' });
		resizeComposerInput();
	});
	return true;
}

async function pickMention() { try { mentionUser(await os.selectUser({ includeSelf: true, localOnly: localOnly.value })); } catch { /* 選択の取り消し */ } }

function removeVisibleUser(user: Misskey.entities.UserLite) {
	visibleUsers.value = visibleUsers.value.filter(recipient => recipient.id !== user.id);
}

function draftMentions() {
	return extractMentions(parseMfmCached(draftText.value));
}

function mentionIsRecipient(mention: ReturnType<typeof draftMentions>[number]): boolean {
	return visibleUsers.value.some(user => user.username === mention.username && (user.host ?? null) === (mention.host ?? null));
}

function updateMissingMentionState() {
	hasNotSpecifiedMentions.value = visibility.value === 'specified' && draftMentions().some(mention => !mentionIsRecipient(mention));
}

async function addMissingMentions() {
	const missing = draftMentions().filter(mention => !mentionIsRecipient(mention));
	const results = await Promise.allSettled(missing.map(mention => misskeyApi('users/show', { username: mention.username, host: mention.host })));
	for (const result of results) {
		if (result.status === 'fulfilled' && !visibleUsers.value.some(user => user.id === result.value.id)) visibleUsers.value.push(result.value);
	}
	updateMissingMentionState();
}

watch([draftText, visibility, visibleUsers], updateMissingMentionState, { deep: true });
watch(draftText, () => { void nextTick(resizeComposerInput); }, { flush: 'post' });

function openEmojiPicker(anchor: HTMLElement) {
	const input = composerInput.value;
	const selectionStart = input?.selectionStart ?? draftText.value.length;
	const selectionEnd = input?.selectionEnd ?? selectionStart;
	emojiPicker.show(anchor, emoji => {
		draftText.value = `${draftText.value.slice(0, selectionStart)}${emoji}${draftText.value.slice(selectionEnd)}`;
		void nextTick(() => {
			const caret = selectionStart + emoji.length;
			composerInput.value?.focus();
			composerInput.value?.setSelectionRange(caret, caret);
			resizeComposerInput();
		});
	});
}

function openComposerEmojiPicker(event: MouseEvent) {
	openEmojiPicker(event.currentTarget as HTMLElement);
}

function resizeComposerInput() {
	const input = composerInput.value;
	if (!input) return;
	input.style.height = 'auto';
	const styles = window.getComputedStyle(input);
	const maxHeight = Number.parseFloat(styles.maxHeight) || 120;
	const minHeight = Number.parseFloat(styles.minHeight) || 32;
	const targetHeight = Math.max(minHeight, Math.min(input.scrollHeight, maxHeight));
	input.style.height = `${targetHeight}px`;
	input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden';
}

function openMfmPicker(anchor: HTMLElement) { if (!composerInput.value) return; mfmFunctionPicker(anchor, composerInput.value, draftText); }

function insertHashtag() { draftText.value += draftText.value && !draftText.value.endsWith(' ') ? ' #' : '#'; nextTick(() => composerInput.value?.focus()); }

function openFullComposer() {
	composerToolsOpen.value = false;
	void os.postDirect({
		initialText: draftText.value,
		initialCw: cwEnabled.value ? cwText.value : undefined,
		initialFiles: draftFiles.value,
		initialVisibility: effectiveVisibility.value,
		initialLocalOnly: effectiveLocalOnly.value,
		initialVisibleUsers: visibleUsers.value as Misskey.entities.UserDetailed[],
		reply: composerContext.value?.kind === 'reply' ? composerContext.value.note : undefined,
		renote: composerContext.value?.kind === 'quote' ? composerContext.value.note : undefined,
		channel: composerChannel.value,
	});
}

function pluginMenuItems(): MenuItem[] {
	return postFormActions.map(action => ({
		type: 'button',
		text: action.title,
		action: () => action.handler({ text: draftText.value, cw: cwEnabled.value ? cwText.value : null }, (key, value) => {
			if (key === 'text' && typeof value === 'string') draftText.value = value;
			if (key === 'cw' && (typeof value === 'string' || value === null)) {
				cwEnabled.value = value != null;
				cwText.value = value ?? '';
			}
		}),
	}));
}

async function openComposerToolsMenu(triggerEvent: MouseEvent) {
	if (composerToolsOpen.value) return;
	const anchor = triggerEvent.currentTarget as HTMLElement;
	const items: MenuItem[] = [
		{ type: 'label', text: copy.postContent },
		{ type: 'button', text: pollEnabled.value ? copy.removePoll : copy.addPoll, indicate: pollEnabled.value, action: togglePoll },
		{ type: 'button', text: copy.mention, action: () => { void pickMention(); } },
		// メニュ項目自身は action 後に破棄される。次のポップアップは
		// 残り続ける☆ボタンを基準にし、座標と描画順の喪失を防ぐ。
		{ type: 'button', text: copy.emoji, action: () => openEmojiPicker(anchor) },
		{ type: 'button', text: 'MFM', action: () => openMfmPicker(anchor) },
		{ type: 'button', text: copy.hashtag, action: insertHashtag },
		{ type: 'button', text: event.value == null ? copy.addEvent : copy.removeEvent, indicate: event.value != null, action: toggleEvent },
		{ type: 'divider' },
		{ type: 'label', text: copy.attachmentsAndExtensions },
		{ type: 'button', text: copy.drawing, action: openDrawingTool },
	];
	if (postFormActions.length > 0) items.push({ type: 'parent', text: copy.plugins, children: pluginMenuItems });
	items.push(
		{ type: 'divider' },
		{ type: 'button', text: copy.chooseFrequentButtons, action: () => openComposerShortcutSettings(anchor) },
		{ type: 'divider' },
		{ type: 'label', text: copy.advancedSettings },
		{ type: 'button', text: copy.scheduleAndAutoDelete, action: openFullComposer },
		{ type: 'button', text: reactionAcceptance.value == null ? copy.reactionRestrictions : copy.changeReactionRestrictions, indicate: reactionAcceptance.value != null, action: () => { void selectReactionAcceptance(); } },
		{ type: 'button', text: copy.deliveryDestination, action: openFullComposer },
		{ type: 'button', text: copy.fullPostForm, action: openFullComposer },
		{ type: 'divider' },
		{ type: 'button', text: copy.clearContent, danger: true, action: clearComposer },
	);

	composerToolsOpen.value = true;
	try {
		await os.popupMenu(items, anchor, { width: 272 });
	} finally {
		composerToolsOpen.value = false;
	}
}

function composerShortcutToggle(id: HatacordingUiComposerShortcut) {
	return computed({
		get: () => prefs.value.composerShortcuts.includes(id),
		set: (enabled: boolean) => {
			if (enabled && !prefs.value.composerShortcuts.includes(id)) {
				if (prefs.value.composerShortcuts.length >= 2) {
					void os.alert({ type: 'warning', text: copy.frequentButtonsLimit });
					return;
				}
				prefs.value.composerShortcuts.push(id);
			} else if (!enabled) {
				prefs.value.composerShortcuts = prefs.value.composerShortcuts.filter(item => item !== id);
			}
			persistPreferences();
		},
	});
}

function openComposerShortcutSettings(anchor: HTMLElement) {
	window.setTimeout(() => {
		void os.popupMenu([
			{ type: 'label', text: copy.frequentButtonsMaxTwo },
			...composerShortcutDefinitions.map(item => ({ type: 'switch' as const, text: item.label, ref: composerShortcutToggle(item.id) })),
		], anchor, { width: 260 });
	}, 0);
}

function isComposerShortcutActive(id: HatacordingUiComposerShortcut) {
	if (id === 'poll') return pollEnabled.value;
	if (id === 'event') return event.value != null;
	if (id === 'reaction') return reactionAcceptance.value != null;
	return false;
}

function runComposerShortcut(id: HatacordingUiComposerShortcut, event: MouseEvent) {
	const anchor = event.currentTarget as HTMLElement;
	if (id === 'poll') togglePoll();
	else if (id === 'mention') void pickMention();
	else if (id === 'mfm') openMfmPicker(anchor);
	else if (id === 'hashtag') insertHashtag();
	else if (id === 'event') toggleEvent();
	else if (id === 'drawing') openDrawingTool();
	else if (id === 'reaction') void selectReactionAcceptance();
	else openFullComposer();
}

function togglePoll() { pollEnabled.value = !pollEnabled.value; if (pollChoices.value.length < 2) pollChoices.value = ['', '']; }

function toggleEvent() {
	event.value = event.value == null ? {
		title: '',
		start: Date.now(),
		end: null,
		metadata: {},
	} : null;
}

function openDrawingTool() {
	void os.popup(MkDrawingTool, {}, {
		done: async (file: File) => {
			try {
				draftFiles.value.push(...await os.launchUploader([file], { multiple: false }));
			} catch {
				await os.alert({ type: 'error', text: copy.drawingAttachFailed });
			}
		},
	});
}

async function selectReactionAcceptance() {
	const selected = await os.select({
		title: copy.reactionAcceptanceRange,
		items: [
			{ value: null, label: copy.all },
			{ value: 'likeOnlyForRemote' as const, label: copy.remoteLikesOnly },
			{ value: 'nonSensitiveOnly' as const, label: copy.nonSensitiveOnly },
			{ value: 'nonSensitiveOnlyForLocalLikeOnlyForRemote' as const, label: copy.localNonSensitiveRemoteLikesOnly },
			{ value: 'likeOnly' as const, label: copy.likesOnly },
		],
		default: reactionAcceptance.value ?? null,
	});
	if (!selected.canceled) reactionAcceptance.value = selected.result;
}

function clearComposer() { draftText.value = ''; draftFiles.value = []; cwEnabled.value = false; cwText.value = ''; pollEnabled.value = false; pollChoices.value = ['', '']; pollMultiple.value = false; pollExpiration.value = 'infinite'; pollExpiresAt.value = ''; pollExpiredAfter.value = 10; pollExpiredAfterUnit.value = 'minute'; event.value = null; reactionAcceptance.value = null; composerContext.value = null; visibleUsers.value = []; }

function removeDraftFile(id: string) { draftFiles.value = draftFiles.value.filter(file => file.id !== id); }

function updateDraftFileSensitive(file: Misskey.entities.DriveFile, isSensitive: boolean) {
	const target = draftFiles.value.find(item => item.id === file.id);
	if (target) target.isSensitive = isSensitive;
}

function updateDraftFileName(file: Misskey.entities.DriveFile, name: string) {
	const target = draftFiles.value.find(item => item.id === file.id);
	if (target) target.name = name;
}

function openAttachmentMenu(event: MouseEvent) {
	const anchor = event.currentTarget as HTMLElement;
	const addFiles = async (loader: () => Promise<Misskey.entities.DriveFile[]>) => { try { draftFiles.value.push(...await loader()); } catch { /* 選択・アップロードの取り消し */ } };
	os.popupMenu([
		{ type: 'button', text: copy.chooseFileOrImage, action: () => addFiles(() => chooseFileFromPcAndUpload({ multiple: true })) },
		{ type: 'button', text: copy.takePhoto, action: openCamera },
		{ type: 'button', text: copy.chooseFromDrive, action: () => addFiles(() => chooseDriveFile({ multiple: true })) },
		{ type: 'button', text: copy.importFromUrl, action: () => addFiles(async () => [await chooseFileFromUrl()]) },
	], anchor);
}

function openCamera() { const input = window.document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.setAttribute('capture', 'environment'); input.onchange = async () => { const files = input.files ? [...input.files] : []; if (files.length) draftFiles.value.push(...await os.launchUploader(files, { multiple: false })); }; input.click(); }

function openVisibilityMenu(event: MouseEvent) {
	const anchor = event.currentTarget as HTMLElement;
	if (composerChannel.value) {
		os.popupMenu([
			{ type: 'label', text: composerChannel.value.name },
			{ type: 'label', text: copy.channelVisibilityFixed },
		], anchor);
		return;
	}
	const visibilityItems = (['public', 'home', 'followers', 'specified'] as Visibility[]).map(value => ({
		type: 'button' as const,
		icon: ({ public: 'ti ti-world', home: 'ti ti-home', followers: 'ti ti-lock', specified: 'ti ti-mail' })[value],
		text: ({ public: copy.public, home: copy.home, followers: copy.followersOnly, specified: copy.direct })[value],
		active: visibility.value === value,
		action: () => {
			visibility.value = value;
			if (value === 'specified') localOnly.value = true;
			persistRememberedVisibility();
		},
	}));
	const federation = computed({
		get: () => !localOnly.value,
		set: (value: boolean) => {
			if (visibility.value === 'specified') return;
			localOnly.value = !value;
			persistRememberedVisibility();
		},
	});
	os.popupMenu([
		...visibilityItems,
		{ type: 'divider' },
		{ type: 'switch', text: copy.federate, ref: federation, disabled: visibility.value === 'specified' },
		{ type: 'switch', text: copy.rememberVisibility, ref: rememberNoteVisibility },
	], anchor);
}

function persistRememberedVisibility() {
	if (!prefer.r.rememberNoteVisibility.value || composerChannel.value) return;
	store.set('visibility', visibility.value);
	store.set('localOnly', localOnly.value);
}

function isAnnoyingMfm(text: string): boolean {
	return text.includes('$[x2') || text.includes('$[x3') || text.includes('$[x4') || text.includes('$[scale') || text.includes('$[position');
}

async function confirmComposerWarnings(): Promise<boolean> {
	if (cwEnabled.value && cwText.value.trim() === '') {
		await os.alert({ type: 'warning', text: copy.cwAnnotationRequired });
		return false;
	}
	if (prefer.s.showNoAltTextWarning && draftFiles.value.some(file => file.comment == null || file.comment.length === 0)) {
		const confirm = await os.actions({
			type: 'warning',
			title: copy.attachmentsWithoutDescription,
			text: copy.attachmentsWithoutAltText,
			actions: [
				{ value: 'post' as const, text: copy.postAsIs },
				{ value: 'cancel' as const, text: copy.back, primary: true },
			],
		});
		if (confirm.canceled || confirm.result === 'cancel') return false;
	}
	const warningText = cwEnabled.value ? cwText.value : draftText.value;
	if (effectiveVisibility.value === 'public' && isAnnoyingMfm(warningText)) {
		const confirm = await os.actions({
			type: 'warning',
			text: copy.annoyingMfmWarning,
			actions: [
				{ value: 'home' as const, text: copy.changeToHome },
				{ value: 'post' as const, text: copy.keepPublic },
				{ value: 'cancel' as const, text: copy.back },
			],
		});
		if (confirm.canceled || confirm.result === 'cancel') return false;
		if (confirm.result === 'home') visibility.value = 'home';
	}
	return true;
}

async function submitPost() {
	if (!canSubmit.value) return;
	if (!composerChannel.value && visibility.value === 'specified' && visibleUserIds.value.length === 0) {
		await os.alert({ type: 'warning', text: copy.directRecipientRequired });
		return;
	}
	const choices = pollChoices.value.map(value => value.trim()).filter(Boolean);
	if (pollEnabled.value && choices.length < 2) {
		await os.alert({ type: 'warning', text: copy.pollNeedsTwoChoices });
		return;
	}
	let pollExpiresAtValue: number | null = null;
	let pollExpiredAfterValue: number | null = null;
	if (pollEnabled.value && pollExpiration.value === 'at') {
		pollExpiresAtValue = new Date(pollExpiresAt.value).getTime();
		if (!Number.isFinite(pollExpiresAtValue) || pollExpiresAtValue <= Date.now()) {
			await os.alert({ type: 'warning', text: copy.pollDeadlineMustBeFuture });
			return;
		}
	} else if (pollEnabled.value && pollExpiration.value === 'after') {
		if (!Number.isFinite(pollExpiredAfter.value) || pollExpiredAfter.value < 1) {
			await os.alert({ type: 'warning', text: copy.pollDurationAtLeastOne });
			return;
		}
		const unitMs = { second: 1000, minute: 60_000, hour: 3_600_000, day: 86_400_000 }[pollExpiredAfterUnit.value];
		pollExpiredAfterValue = Math.trunc(pollExpiredAfter.value * unitMs);
	}
	if (!await confirmComposerWarnings()) return;

	let postData: any = {
		text: draftText.value === '' ? null : draftText.value,
		fileIds: draftFiles.value.length > 0 ? draftFiles.value.map(file => file.id) : undefined,
		visibility: effectiveVisibility.value,
		visibleUserIds: !composerChannel.value && visibility.value === 'specified' ? visibleUserIds.value : undefined,
		localOnly: effectiveLocalOnly.value,
		cw: cwEnabled.value ? cwText.value : null,
		channelId: composerChannel.value?.id,
		replyId: composerContext.value?.kind === 'reply' ? composerContext.value.note?.id : undefined,
		renoteId: composerContext.value?.kind === 'quote' ? composerContext.value.note?.id : undefined,
		poll: pollEnabled.value ? { choices, multiple: pollMultiple.value, expiresAt: pollExpiresAtValue, expiredAfter: pollExpiredAfterValue } : undefined,
		event: event.value,
		reactionAcceptance: reactionAcceptance.value,
	};

	for (const interruptor of getPluginHandlers('note_post_interruptor')) {
		try {
			postData = await interruptor.handler(deepClone(postData));
		} catch (error) {
			console.error('HataSNSCordUI plugin interruptor failed', error);
		}
	}
	if (postData == null || typeof postData !== 'object') {
		await os.alert({ type: 'error', text: copy.pluginReturnedInvalidPost });
		return;
	}

	submitting.value = true;
	try {
		if (postSendDelayEnabled.value && !await postDelay.begin(postSendDelaySeconds.value)) return;
		const result = await misskeyApi('notes/create', postData);
		const created = result.createdNote;
		if (created) {
			globalEvents.emit('notePosted', created);
			if (!notes.value.some(note => note.id === created.id)) notes.value.push(created);
		}
		persistRememberedVisibility();
		incNotesCount();
		if (notesCount === 1) claimAchievement('notes1');
		const postedText = String(postData.text ?? '');
		const lowerCase = postedText.toLowerCase();
		if ((lowerCase.includes('love') || lowerCase.includes('❤')) && (lowerCase.includes('cherrypick') || lowerCase.includes('hataskey'))) claimAchievement('iLoveCherryPick');
		if (composerContext.value?.kind === 'quote' && composerContext.value.note?.userId === $i.id && postedText.length > 0) claimAchievement('selfQuote');
		const now = new Date();
		if (now.getHours() <= 3) claimAchievement('postedAtLateNight');
		if (now.getMinutes() === 0 && now.getSeconds() === 0) claimAchievement('postedAt0min0sec');
		os.toast(composerContext.value?.kind === 'reply' ? copy.replied : composerContext.value?.kind === 'quote' ? copy.quoted : copy.posted, composerContext.value?.kind === 'reply' ? 'reply' : composerContext.value?.kind === 'quote' ? 'quote' : 'posted');
		clearComposer();
		composerToolsOpen.value = false;
		await nextTick();
		scrollToBottom();
	} catch (error) {
		console.error('HataSNSCordUI post failed', error);
		await os.alert({ type: 'error', text: copy.postFailedDraftKept });
	} finally {
		submitting.value = false;
	}
}

function openRightPane() {
	// 右端スワイプを左メニューとして扱っていた旧挙動を分離し、
	// コンパクト表示では必ず片側だけを前面に出す。
	drawerOpen.value = false;
	prefs.value.rightPaneCollapsed = false;
	persistPreferences();
	rightPaneOpen.value = true;
}

function collapseRightPane() { prefs.value.rightPaneCollapsed = true; persistPreferences(); }

async function selectRightTab(tab: RightTab) {
	activeRightTabId.value = tab.id;
	persistWidgetTabs();
	openRightPane();
	if (tab.kind !== 'timeline') return;
	await nextTick();
	// サブペインの標準タイムラインは先頭が最新。タブを選び直した場合も、
	// ラッパーと内側の実スクロール領域の双方を最新位置へ戻す。
	const wrapper = subpaneTimelineEl.value;
	const nestedScroller = wrapper?.querySelector<HTMLElement>('._pageScrollable, [data-scroll-container]');
	const scroller = nestedScroller ?? wrapper ?? subpaneContent.value;
	scroller?.scrollTo({ top: 0, behavior: prefer.s.animation ? 'smooth' : 'auto' });
}

function openRightTab(input: Omit<RightTab, 'id'>, forceNew = false) { const reusable = prefs.value.reuseSubpaneTab && !forceNew ? activeRightTab.value : null; if (reusable && reusable.kind !== 'widgets') Object.assign(reusable, input); else { if (rightTabs.value.length >= subpaneMaxTabs.value) { const replace = rightTabs.value.find(tab => tab.kind !== 'widgets') ?? rightTabs.value[0]; if (replace) Object.assign(replace, input); activeRightTabId.value = replace?.id ?? ''; } else { const tab = { id: genId(), ...input }; rightTabs.value.push(tab); activeRightTabId.value = tab.id; } } openRightPane(); }

function openNoteTab(note: Misskey.entities.Note) { openRightTab({ title: copy.noteDetails, kind: 'note', note }); }

async function openProfileTab(user: Misskey.entities.UserLite) { let detailed: Misskey.entities.UserDetailed | Misskey.entities.UserLite = user; try { detailed = await misskeyApi('users/show', { userId: user.id }); } catch {} openRightTab({ title: user.name || `@${user.username}`, kind: 'profile', user: detailed }); }

function openInternalPage(kind: RightTabKind, title: string, path?: string) { openRightTab({ title, kind, path }); }

function nativeSubpaneTimelineSource(source: TimelineSource) {
	if (source === 'list' || source === 'antenna' || source === 'channel') return source;
	if (source === 'home' || source === 'local' || source === 'social' || source === 'global') return source;
	return 'home';
}

function openTimelineInSubpane(item: HatacordingMenuItem, forceNew = true) {
	if (!item.source) return;
	openRightTab({
		title: item.label,
		kind: 'timeline',
		timelineSource: item.source,
		timelineSourceId: item.sourceId,
	}, forceNew);
}

function timelineSelectionItems(items: HatacordingMenuItem[]): MenuItem[] {
	return items.map(item => ({
		type: 'button',
		text: item.label,
		action: () => openTimelineInSubpane(item, true),
	}));
}

function collectionSelectionItem(label: string, prefix: 'list:' | 'antenna:' | 'channel:'): MenuItem {
	return {
		type: 'parent',
		text: label,
		children: collectionSelectionItems(label, prefix),
	};
}

function collectionSelectionItems(label: string, prefix: 'list:' | 'antenna:' | 'channel:'): MenuItem[] {
	const items = dynamicMenuItems.value.filter(item => item.id.startsWith(prefix));
	return items.length > 0
		? timelineSelectionItems(items)
		: [{ type: 'label', text: copyx.collectionEmpty({ collection: label }) }];
}

function compactSubpaneMenuWidth() {
	return Math.max(220, Math.min(360, (rootEl.value?.clientWidth ?? window.innerWidth) - 24));
}

async function openCompactAddTabMenu(anchor: HTMLElement, standardTimelines: HatacordingMenuItem[]) {
	let childMenu: { label: string; items: MenuItem[] } | null = null;
	const selectChild = (label: string, items: MenuItem[]) => {
		childMenu = { label, items };
	};
	const menuWidth = compactSubpaneMenuWidth();

	// 狭い画面では二列の親子メニューを横へ展開しない。一度カテゴリを
	// 選んでから同じ位置に一覧を出し、長いリスト名も画面内で省略表示する。
	await os.popupMenu([
		{ type: 'button', text: copy.timelines, action: () => selectChild(copy.timelines, timelineSelectionItems(standardTimelines)) },
		{ type: 'button', text: copy.lists, action: () => selectChild(copy.lists, collectionSelectionItems(copy.lists, 'list:')) },
		{ type: 'button', text: copy.antennas, action: () => selectChild(copy.antennas, collectionSelectionItems(copy.antennas, 'antenna:')) },
		{ type: 'button', text: copy.channels, action: () => selectChild(copy.channels, collectionSelectionItems(copy.channels, 'channel:')) },
		{ type: 'divider' },
		{ type: 'button', text: copy.widgets, action: () => addWidgetTab() },
		{ type: 'button', text: copy.search, action: () => openRightTab({ title: copy.search, kind: 'search' }, true) },
		{ type: 'button', text: copy.notifications, action: () => openRightTab({ title: copy.notifications, kind: 'notifications' }, true) },
		{ type: 'button', text: copy.drive, action: () => openRightTab({ title: copy.drive, kind: 'drive' }, true) },
		{ type: 'button', text: copy.announcements, action: () => openRightTab({ title: copy.announcements, kind: 'announcements' }, true) },
	], anchor, { width: menuWidth });

	const selectedChildMenu = childMenu as { label: string; items: MenuItem[] } | null;
	if (selectedChildMenu == null) return;
	await os.popupMenu([
		{ type: 'label', text: copyx.chooseCollection({ collection: selectedChildMenu.label }) },
		...selectedChildMenu.items,
	], anchor, { width: menuWidth });
}

function openAddTabMenu(event: MouseEvent) {
	const anchor = event.currentTarget as HTMLElement;
	const standardTimelines = staticMenuItems.value.filter(item => item.source != null);
	if (isCompact.value) {
		void openCompactAddTabMenu(anchor, standardTimelines);
		return;
	}
	os.popupMenu([
		{ type: 'parent', text: copy.timelines, children: timelineSelectionItems(standardTimelines) },
		collectionSelectionItem(copy.lists, 'list:'),
		collectionSelectionItem(copy.antennas, 'antenna:'),
		collectionSelectionItem(copy.channels, 'channel:'),
		{ type: 'divider' },
		{ type: 'button', text: copy.widgets, action: () => addWidgetTab() },
		{ type: 'button', text: copy.search, action: () => openRightTab({ title: copy.search, kind: 'search' }, true) },
		{ type: 'button', text: copy.notifications, action: () => openRightTab({ title: copy.notifications, kind: 'notifications' }, true) },
		{ type: 'button', text: copy.drive, action: () => openRightTab({ title: copy.drive, kind: 'drive' }, true) },
		{ type: 'button', text: copy.announcements, action: () => openRightTab({ title: copy.announcements, kind: 'announcements' }, true) },
	], anchor);
}

function addWidgetTab() { openRightTab({ title: copy.widgets, kind: 'widgets', widgets: [] }, true); }

async function importHatasabaWidgets(tab: RightTab) {
	if (tab.kind !== 'widgets') return;
	const imported = prefer.s.widgets
		.filter(widget => availableWidgets.includes(widget.name))
		.map(widget => ({ id: genId(), name: widget.name, data: deepClone(widget.data ?? {}) }));
	if (imported.length === 0) {
		await os.alert({ type: 'info', text: copy.noHatasabaWidgetsToImport });
		return;
	}
	const result = await os.actions({
		type: 'question',
		title: copy.importHatasabaWidgets,
		text: copyx.importWidgetCount({ count: imported.length.toString() }),
		actions: [
			{ value: 'replace' as const, text: copy.replaceCurrentContent, primary: true },
			{ value: 'append' as const, text: copy.appendToCurrentContent },
		],
	});
	if (result.canceled) return;
	tab.widgets = result.result === 'append' ? [...(tab.widgets ?? []), ...imported] : imported;
	persistWidgetTabs();
}

function closeRightTab(id: string) {
	const index = rightTabs.value.findIndex(tab => tab.id === id);
	if (index < 0) return;
	rightTabs.value.splice(index, 1);
	if (activeRightTabId.value === id) activeRightTabId.value = rightTabs.value[Math.min(index, rightTabs.value.length - 1)]?.id ?? '';
	widgetEditing.value = false;
	persistWidgetTabs();
}

function dropTab(index: number) { if (dragTabIndex.value == null || dragTabIndex.value === index) return; const [tab] = rightTabs.value.splice(dragTabIndex.value, 1); rightTabs.value.splice(index, 0, tab); dragTabIndex.value = null; persistWidgetTabs(); }

function persistWidgetTabs() {
	const widgetTabs = rightTabs.value
		.filter(tab => tab.kind === 'widgets')
		.map(tab => ({ id: tab.id, title: 'widgets', kind: 'widgets' as const, widgets: tab.widgets ?? [] }));
	prefs.value.subpaneTabs = [
		{ id: 'detail', title: 'detail', kind: 'detail' as const, widgets: [] },
		...widgetTabs,
	].slice(0, subpaneMaxTabs.value);
	prefs.value.activeSubpaneTabId = activeRightTab.value?.kind === 'widgets' ? activeRightTab.value.id : 'detail';
	persistPreferences();
}

function removeExternalNote(noteId: string) {
	removeTimelineNote(noteId);
}

function removeTimelineNote(noteId: string) {
	const keep = (note: TimelineNote) => note.id !== noteId && note.renote?.id !== noteId;
	notes.value = notes.value.filter(keep);
	pendingNotes.value = pendingNotes.value.filter(keep);
}

useGlobalEvent('noteDeleted', removeTimelineNote);
useGlobalEvent('noteRemovedFromAntenna', (antennaId, noteId) => {
	if (activeMenuItem.value?.source === 'antenna' && activeMenuItem.value.sourceId === antennaId) removeTimelineNote(noteId);
});

function startRightResize(event: PointerEvent) {
	event.preventDefault();
	resizingRight = true;
	const handle = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
	handle?.setPointerCapture?.(event.pointerId);
	const startX = event.clientX;
	const startWidth = Math.min(prefs.value.rightPaneWidth, rootEl.value?.getBoundingClientRect().width ?? window.innerWidth);
	const move = (moveEvent: PointerEvent) => {
		if (!resizingRight) return;
		const containerWidth = rootEl.value?.getBoundingClientRect().width ?? window.innerWidth;
		// 旗鯖fork: 折りたたみ端末のドッキング表示では、PCの 560px 上限だと中央が潰れる。
		const dockedMax = isFoldableWide.value ? Math.min(560, containerWidth * FOLDABLE_RIGHT_PANE_MAX_RATIO) : 560;
		const maxWidth = rightPaneOverlay.value ? Math.min(560, containerWidth * 0.92) : dockedMax;
		const minWidth = Math.min(isFoldableWide.value ? FOLDABLE_RIGHT_PANE_MIN_WIDTH : 280, maxWidth);
		prefs.value.rightPaneWidth = Math.round(Math.max(minWidth, Math.min(maxWidth, startWidth + startX - moveEvent.clientX)));
	};
	const stop = () => {
		resizingRight = false;
		if (handle?.hasPointerCapture?.(event.pointerId)) handle.releasePointerCapture(event.pointerId);
		window.removeEventListener('pointermove', move);
		window.removeEventListener('pointerup', stop);
		window.removeEventListener('pointercancel', stop);
		persistPreferences();
	};
	window.addEventListener('pointermove', move);
	window.addEventListener('pointerup', stop);
	window.addEventListener('pointercancel', stop);
}

const WidgetEditor = defineComponent({ props: { tab: { type: Object as PropType<RightTab>, required: true } }, setup(props) { const update = (widgets: Widget[]) => { props.tab.widgets = widgets as HatacordingUiWidget[]; persistWidgetTabs(); }; return () => h(MkWidgets, { widgets: (props.tab.widgets ?? []) as Widget[], edit: widgetEditing.value, 'onUpdateWidgets': update, onAddWidget: (widget: Widget) => { if (availableWidgets.includes(widget.name)) update([...(props.tab.widgets ?? []) as Widget[], widget]); }, onRemoveWidget: (widget: Widget) => update(((props.tab.widgets ?? []) as Widget[]).filter(item => item.id !== widget.id)), onUpdateWidget: (change: { id: string; data: Record<string, unknown> }) => update(((props.tab.widgets ?? []) as Widget[]).map(item => item.id === change.id ? { ...item, data: change.data } : item)), onExit: () => { widgetEditing.value = false; } }); } });

async function updateOnlineUsers() { try { onlineUsersCount.value = (await misskeyApiGet('get-online-users-count')).count; } catch { onlineUsersCount.value = 0; } }

async function updateExternalUnread() {
	const account = externalAccount.value;
	if (!account) {
		externalUnread.value = false;
		return;
	}
	try {
		const notifications = await callExternalApi('i/notifications', { limit: 20, markAsRead: false }, account);
		const lastRead = new Date(localStorage.getItem('extNotifLastReadAt') || 0).getTime();
		externalUnread.value = Array.isArray(notifications) && notifications.some((item: any) => new Date(item.createdAt).getTime() > lastRead);
	} catch {
		externalUnread.value = false;
	}
}

function onExternalNotification(event: Event) {
	externalUnread.value = true;
	const notification = (event as CustomEvent<Record<string, any>>).detail;
	if (notification == null) return;
	enqueueActivity(
		createNotificationActivity(notification, true, externalAccount.value?.host),
		`external-notification:${String(notification.id ?? genId())}`,
		typeof notification.createdAt === 'string' ? notification.createdAt : new Date().toISOString(),
	);
}

function finishFirstTutorial() {
	prefs.value.tutorialCompleted = true;
	tutorialOpen.value = false;
	persistPreferences();
	claimAchievement(HATACORDING_TUTORIAL_ACHIEVEMENT_ID);
}

function leaveHatacordingUi(path: string) {
	// 権限不足・UI切替キャンセルだけは、この三ペイン自体から明示的に離れる。
	// 通常のページ遷移は outerRouter.navHook が中央ペインへ吸収する。
	if (outerRouter.navHook === hatacordingOuterNavHook) outerRouter.navHook = previousOuterNavHook;
	// ルーター遷移が完了する前にも通常トーストを復帰させる。
	// unmount 側との二重呼び出しを避けるため、解除関数はここで破棄する。
	releaseToastSuppression?.();
	releaseToastSuppression = null;
	releaseDisconnectUiSuppression?.();
	releaseDisconnectUiSuppression = null;
	releasePostFormInterceptor?.();
	releasePostFormInterceptor = null;
	miLocalStorage.setItem('ui', 'simple');
	window.location.replace(path);
}

async function onHatacordingOpenUser(event: Event) {
	const userId = (event as CustomEvent<{ userId?: string }>).detail?.userId;
	if (!userId) return;
	try {
		const user = await misskeyApi('users/show', { userId });
		await openProfileTab(user);
	} catch {
		await os.alert({ type: 'error', text: copy.profileLoadFailed });
	}
}

function onHatacordingSimpleUserPanel(event: Event) {
	const userId = (event as CustomEvent<{ userId?: string }>).detail?.userId;
	if (!userId) return;
	event.preventDefault();
	void onHatacordingOpenUser(new CustomEvent('hatacording-open-user', { detail: { userId } }));
}

onMounted(async () => {
	stream.on('_disconnected_', onServerDisconnected);
	stream.on('_connected_', onServerConnected);
	if (stream.state === 'reconnecting') onServerDisconnected();
	await refreshCurrentAccount();
	if (!$i.policies.canUseHatacordingUi) {
		await os.alert({ type: 'warning', text: copy.uiUnavailable });
		leaveHatacordingUi('/');
		return;
	}
	if (miLocalStorage.getItem('ui') !== 'hatacording') {
		// 旧 `/hatafeed/hatacording-ui` は互換入口としてのみ残す。選択状態を
		// 専用UIへ移してから `/` へ置換し、履歴に旧URLを残さない。
		miLocalStorage.setItem('ui', 'hatacording');
		window.location.replace('/');
		return;
	}
	tutorialOpen.value = !prefs.value.tutorialCompleted;
	applyDocumentColorMode();
	restoreActivityHistory();
	releasePostFormInterceptor = os.registerPostFormInterceptor(adoptPostFormRequest);
	await nextTick();
	if (composerInput.value) composerAutocomplete = new Autocomplete(composerInput.value, draftText);
	resizeComposerInput();
	resizeObserver = new ResizeObserver(entries => { rootWidth.value = entries[0]?.contentRect.width ?? 0; applyResponsiveState(); });
	if (rootEl.value) resizeObserver.observe(rootEl.value);
	const usedTabIds = new Set(['detail']);
	const widgetTabs = prefs.value.subpaneTabs
		.filter(tab => {
			if (tab.kind !== 'widgets' || usedTabIds.has(tab.id)) return false;
			usedTabIds.add(tab.id);
			return true;
		})
		.map(tab => ({ id: tab.id, title: copy.widgets, kind: 'widgets' as const, widgets: tab.widgets }));
	rightTabs.value = [
		{ id: 'detail', title: copy.details, kind: 'welcome' },
		...widgetTabs.slice(0, Math.max(0, subpaneMaxTabs.value - 1)),
	];
	activeRightTabId.value = rightTabs.value.some(tab => tab.id === prefs.value.activeSubpaneTabId)
		? prefs.value.activeSubpaneTabId
		: 'detail';
	await fetchCollections(); await reloadTimeline(); connectMainStream(); await updateOnlineUsers(); void updateExternalUnread();
	onlineTimer = window.setInterval(updateOnlineUsers, 30_000);
	rateLimitTimer = window.setInterval(() => { rateLimitNow.value = Date.now(); }, 1000);
	activityArchiveTimer = window.setInterval(() => archiveNotifications(), 5000);
	window.addEventListener('external-notification', onExternalNotification);
	window.addEventListener('hatacording-open-user', onHatacordingOpenUser);
	window.addEventListener('simple-user-panel', onHatacordingSimpleUserPanel);
	window.addEventListener(HATACORDING_UI_PREFERENCES_CHANGE_EVENT, syncHatacordingPreferences);
	globalEvents.on('hatacordingApiAction', onHatacordingApiAction);
	stream.on('earthquakeEvent', onEarthquakeEvent);
});
onBeforeUnmount(() => {
	resizeObserver?.disconnect();
	if (onlineTimer != null) window.clearInterval(onlineTimer);
	if (rateLimitTimer != null) window.clearInterval(rateLimitTimer);
	if (activityArchiveTimer != null) window.clearInterval(activityArchiveTimer);
	if (timelineScrollInteractionTimer != null) window.clearTimeout(timelineScrollInteractionTimer);
	if (colorTransitionTimer != null) window.clearTimeout(colorTransitionTimer);
	activityDisposed = true;
	activityQueue.length = 0;
	for (const timer of activityTimers) window.clearTimeout(timer);
	activityTimers.clear();
	composerAutocomplete?.detach();
	composerAutocomplete = null;
	releaseToastSuppression?.();
	releaseToastSuppression = null;
	releaseDisconnectUiSuppression?.();
	releaseDisconnectUiSuppression = null;
	releasePostFormInterceptor?.();
	releasePostFormInterceptor = null;
	if (outerRouter.navHook === hatacordingOuterNavHook) outerRouter.navHook = previousOuterNavHook;
	clearDocumentColorMode();
	mainConnection?.dispose();
	disconnectTimelineStream();
	postDelay.dispose();
	window.removeEventListener('external-notification', onExternalNotification);
	window.removeEventListener('hatacording-open-user', onHatacordingOpenUser);
	window.removeEventListener('simple-user-panel', onHatacordingSimpleUserPanel);
	window.removeEventListener(HATACORDING_UI_PREFERENCES_CHANGE_EVENT, syncHatacordingPreferences);
	globalEvents.off('hatacordingApiAction', onHatacordingApiAction);
	stream.off('earthquakeEvent', onEarthquakeEvent);
	stream.off('_disconnected_', onServerDisconnected);
	stream.off('_connected_', onServerConnected);
});
provide('inTimeline', true);
provide('inLocalTimeline', inLocalTimeline);
provide('inChannel', inChannel);
provide('currentAntenna', currentAntenna);
provide('noteBubbleEnabled', noteBubbleEnabled);
// 旗鯖fork(HataSNSCordUI): MkNote をさらに .noteBubble(チャット風の吹き出し)でラップしているため、
// MkNote 自身に内側で枠を描かせると外枠(.noteBubble)との間に隙間ができ、枠が中途半端に内側へ
// 表示されてノート内容に被さって見えてしまう。MkNote 側の枠描画は止め、.noteBubble 側で
// (MkNote が出す data-utage-state を :has() で拾って)外枠に直接描く。
provide('utageFrameExternal', ref(true));
provide('noteTimelineGlassBg', noteTimelineGlassBg);
provide('tl_withSensitive', tlWithSensitive);
// このUIのリアルタイム切替を、既存 MkNote の全更新経路
// (リアクション・投票・編集・宴状態・削除)にも共有する。
provide('forceNoteRealtimeCapture', computed(() => prefs.value.timelineRealtime));
// 中央・右ペインへ埋め込んだ既存ページは外側ペインがタイトルを持つ。
// 内側はタイトルだけ省略し、通知フィルタや既読・再読込などの操作は残す。
provide('shouldOmitHeaderTitle', true);
definePage(() => ({ title: 'HataSNSCordUI', hideHeader: true }));
</script>

<style lang="scss" module>
@font-face {
	font-family: 'HataSNSCordRighteous';
	font-style: normal;
	font-weight: 400;
	src: url('/client-assets/Righteous-Regular.woff2') format('woff2');
}
.root{container-type:inline-size;display:flex;position:relative;width:100%;height:100%;min-width:0;min-height:0;overflow:hidden;background:var(--MI_THEME-bg);color:var(--MI_THEME-fg);font-family:'Noto Sans JP Variable','Noto Sans JP',system-ui,-apple-system,'Segoe UI',sans-serif;font-kerning:normal;font-synthesis:none;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
/* Hataskey fork: ⚠️入力欄以外にフォーカスが乗ったときに文字入力カーソル(キャレット)が出る不具合が
   何度も再発しているため、要素ごとに塞ぐのをやめてUI全体で止める。⚠️本物の入力欄だけ元に戻すので、
   右ペインをアクティブにしただけでカーソルが現れることはなくなる。⚠️この2行を消すと再発する。 */
.root{caret-color:transparent}
.root input,.root textarea,.root [contenteditable="true"]{caret-color:auto}
.scrim{position:absolute;inset:0;z-index:80;border:0;background:color-mix(in srgb,#000 38%,transparent);backdrop-filter:blur(4px)}
.leftPane{display:flex;flex:0 0 272px;flex-direction:column;min-width:0;border-right:1px solid color-mix(in srgb,var(--MI_THEME-divider) 78%,transparent);background:linear-gradient(165deg,color-mix(in srgb,var(--MI_THEME-panel) 97%,var(--MI_THEME-accent) 3%),color-mix(in srgb,var(--MI_THEME-bg) 96%,var(--MI_THEME-accent) 4%));transition:flex-basis .24s cubic-bezier(.2,.8,.2,1),transform .24s cubic-bezier(.2,.8,.2,1);z-index:90}.root[data-sidebar-collapsed=true] .leftPane{flex-basis:68px}
.serverHeader,.accountFooter,.timelineHeader,.subpaneHeader{display:flex;align-items:center;gap:7px;min-height:58px;padding:8px 10px;border-bottom:1px solid var(--MI_THEME-divider);box-sizing:border-box}.serverButton,.accountButton{display:flex;align-items:center;gap:10px;min-width:0;flex:1;padding:4px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}.serverIcon{width:36px;height:36px;flex:0 0 36px;border-radius:10px;object-fit:cover}.serverName{overflow:hidden;flex:1;font-weight:800;text-overflow:ellipsis;white-space:nowrap}.serverActions,.headerActions,.editActions{display:flex;align-items:center;gap:3px}.iconButton,.expandButton{display:grid;width:36px;height:36px;flex:0 0 36px;place-items:center;border:0;border-radius:10px;background:transparent;color:inherit;cursor:pointer}.iconButton:hover,.expandButton:hover{background:var(--MI_THEME-hover)}.expandButton{align-self:center;margin:3px 0 0}
.editNotice{display:flex;flex-direction:column;gap:8px;margin:8px;padding:10px;border:1px solid color-mix(in srgb,var(--MI_THEME-accent) 35%,var(--MI_THEME-divider));border-radius:12px;background:color-mix(in srgb,var(--MI_THEME-accent) 8%,var(--MI_THEME-panel));font-size:.78em}.editNotice>div:first-child{display:flex;flex-direction:column}.editNotice span{opacity:.7}.textButton{display:flex;align-items:center;gap:4px;padding:5px 7px;border:1px solid var(--MI_THEME-divider);border-radius:8px;background:var(--MI_THEME-panel);color:var(--MI_THEME-accent);font:inherit;font-weight:700;cursor:pointer}
.menuList{flex:1;min-height:0;overflow:auto;padding:8px}.menuSection+.menuSection,.collectionSection,.moreSection{margin-top:9px;padding-top:9px;border-top:1px solid color-mix(in srgb,var(--MI_THEME-divider) 75%,transparent)}.sectionTitle{margin:0 8px 4px;color:var(--MI_THEME-fg);font-size:.68em;font-weight:700;letter-spacing:.07em;opacity:.52}.menuItemRow{display:flex;width:100%;align-items:center;border-radius:11px}.menuItem,.moreButton,.collectionHeader{display:flex;position:relative;min-width:0;flex:1;align-items:center;gap:10px;min-height:40px;padding:6px 9px;border:0;border-radius:11px;background:transparent;color:inherit;font:inherit;font-weight:500;text-align:left;cursor:pointer}.menuItem:hover,.moreButton:hover,.collectionHeader:hover{background:var(--MI_THEME-hover)}.activeMenuItem{background:color-mix(in srgb,var(--MI_THEME-accent) 13%,transparent);color:var(--MI_THEME-accent);font-weight:700}.compactMenuItem{min-height:36px;padding-left:14px;font-size:.88em}.menuLabel{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.badge,.collectionCount{min-width:18px;padding:2px 5px;border-radius:999px;background:var(--MI_THEME-accent);color:var(--MI_THEME-fgOnAccent);font-size:.68em;font-weight:800;text-align:center}.collectionCount{margin-left:auto;background:var(--MI_THEME-bg);color:inherit}.collectionHeader span:first-of-type{flex:1}.rotated{transform:rotate(180deg)}.collectionItems{margin-left:10px;padding-left:6px;border-left:2px solid color-mix(in srgb,var(--MI_THEME-accent) 30%,var(--MI_THEME-divider))}.collectionEmpty{padding:8px 12px;font-size:.75em;opacity:.55}.rowActions{display:flex}.rowAction{display:grid;width:24px;height:24px;place-items:center;border:0;border-radius:6px;background:transparent;color:inherit;cursor:pointer}.rowAction:hover{background:var(--MI_THEME-hover)}.moreButton{width:100%}.moreButton span:first-of-type{flex:1}.morePanel{display:flex;flex-direction:column;gap:3px;margin:4px 1px;padding:6px;border:1px solid var(--MI_THEME-divider);border-radius:12px;background:var(--MI_THEME-panel)}.moreItem{display:flex;align-items:center;gap:8px;padding:8px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}.moreItem span{flex:1}.moreItem:hover{background:var(--MI_THEME-hover)}
.accountFooter{margin-top:auto;border-top:1px solid var(--MI_THEME-divider);border-bottom:0}.avatar{width:36px;height:36px;flex:0 0 36px}.accountText{display:flex;min-width:0;flex:1;flex-direction:column;overflow:hidden}.accountText>*{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.accountText small{opacity:.65}.root[data-sidebar-collapsed=true] .serverHeader{flex-direction:column;min-height:auto}.root[data-sidebar-collapsed=true] .serverButton,.root[data-sidebar-collapsed=true] .accountButton{flex:0 0 auto;justify-content:center}.root[data-sidebar-collapsed=true] .serverName{display:none}.root[data-sidebar-collapsed=true] .menuList{padding-inline:7px}.root[data-sidebar-collapsed=true] .menuSection,.root[data-sidebar-collapsed=true] .collectionSection,.root[data-sidebar-collapsed=true] .moreSection{margin-top:4px;padding-top:4px}.root[data-sidebar-collapsed=true] .menuItem,.root[data-sidebar-collapsed=true] .collectionHeader,.root[data-sidebar-collapsed=true] .moreButton{width:100%;justify-content:center;padding-inline:6px}.root[data-sidebar-collapsed=true] .menuItemRow{justify-content:center}.root[data-sidebar-collapsed=true] .badge{position:absolute;top:1px;right:1px;min-width:15px;padding:1px 4px;font-size:.58em;line-height:14px}.root[data-sidebar-collapsed=true] .accountFooter{justify-content:center;padding-inline:6px}
.centerPane{display:flex;position:relative;min-width:0;flex:1;flex-direction:column;background:color-mix(in srgb,var(--MI_THEME-bg) 97%,var(--MI_THEME-accent) 3%)}.timelineHeader{justify-content:space-between;flex:0 0 auto;background:color-mix(in srgb,var(--MI_THEME-panel) 91%,transparent);backdrop-filter:blur(18px);z-index:5}.timelineTitle{display:flex;min-width:0;flex:1;align-items:center;gap:10px}.timelineTitle>div{display:flex;min-width:0;flex-direction:column}.timelineTitle strong{overflow:hidden;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.timelineTitle small{display:flex;align-items:center;gap:4px;color:#41b781;font-size:.72em}.timelineScroll{min-height:0;flex:1;overflow-y:auto;padding:14px max(12px,3cqw) 132px;overscroll-behavior:contain}.feedList{display:flex;width:min(100%,780px);margin:0 auto;flex-direction:column;gap:8px}.noteRow{display:flex;width:min(92%,700px);align-self:flex-start;align-items:flex-start;cursor:pointer}.ownNote{align-self:flex-end}.noteBubble{width:100%;max-width:100%;border-inline-start:2px solid color-mix(in srgb,var(--MI_THEME-divider) 72%,transparent);background:transparent;overflow:visible;overflow-wrap:anywhere}.ownNote .noteBubble{border-inline-start-color:var(--MI_THEME-accent);background:linear-gradient(90deg,color-mix(in srgb,var(--MI_THEME-accent) 8%,transparent),transparent 72%);color:inherit}.embeddedNote{margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}.embeddedNote::after{display:none!important}.embeddedNote>article{border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}.activityEvent{display:flex;width:fit-content;max-width:min(92%,640px);align-self:center;align-items:center;gap:7px;padding:3px 2px;border:0;border-radius:0;background:transparent;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;color:inherit;font:inherit;font-size:.82em;cursor:pointer}.activityEvent span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.historyLoader{display:flex;width:min(100%,780px);align-items:center;gap:10px;margin:0 auto 18px;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer}.historyLine{height:1px;flex:1;background:linear-gradient(90deg,transparent,var(--MI_THEME-divider))}.historyLine:last-child{background:linear-gradient(90deg,var(--MI_THEME-divider),transparent)}.historyLabel{display:flex;align-items:center;gap:6px;padding:7px 11px;border:1px solid var(--MI_THEME-divider);border-radius:999px;background:var(--MI_THEME-panel);font-size:.76em}.state{display:flex;min-height:240px;align-items:center;justify-content:center;flex-direction:column;gap:10px;text-align:center;opacity:.72}.primaryButton{padding:9px 14px;border:0;border-radius:10px;background:var(--MI_THEME-accent);color:var(--MI_THEME-fgOnAccent);font:inherit;font-weight:700;cursor:pointer}.jumpControl{display:flex;position:absolute;left:50%;bottom:106px;z-index:30;align-items:center;gap:7px;padding:9px 12px;border:1px solid var(--MI_THEME-divider);border-radius:999px;background:color-mix(in srgb,var(--MI_THEME-panel) 92%,transparent);color:inherit;font:inherit;font-weight:700;box-shadow:0 8px 24px color-mix(in srgb,#000 18%,transparent);backdrop-filter:blur(16px);cursor:pointer;transform:translateX(-50%)}.jumpHasNew{border-color:var(--MI_THEME-accent);background:var(--MI_THEME-accent);color:var(--MI_THEME-fgOnAccent)}
.postFormPill{display:flex;position:relative;width:min(100%,720px);margin:0 auto;align-items:center;gap:6px;padding:8px 10px;border:1px solid color-mix(in srgb,var(--MI_THEME-accent) 25%,var(--MI_THEME-divider));border-radius:999px;background:color-mix(in srgb,var(--MI_THEME-panel) 94%,transparent);box-shadow:0 10px 35px color-mix(in srgb,#000 18%,transparent);backdrop-filter:blur(18px);box-sizing:border-box}.delayActive::before{content:"";position:absolute;inset:-3px;border-radius:inherit;padding:3px;background:conic-gradient(from -90deg,var(--MI_THEME-accent) 0deg var(--hata-post-delay-progress),color-mix(in srgb,var(--MI_THEME-accent) 15%,transparent) 0deg 360deg);mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}.pillButton,.sendButton,.federationButton{display:grid;width:38px;height:38px;flex:0 0 38px;place-items:center;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer}.pillButton:hover,.federationButton:hover,.pillActive{background:var(--MI_THEME-hover)}.sendButton{background:var(--MI_THEME-accent);color:var(--MI_THEME-fgOnAccent)}.sendButton:disabled{opacity:.42;cursor:default}.pillInput{min-width:0;min-height:32px;flex:1;max-height:120px;padding:8px 4px;border:0;outline:0;resize:none;overflow-y:hidden;box-sizing:border-box;background:transparent;color:inherit;font:inherit;line-height:1.4}.visibilityButton{display:flex;height:34px;align-items:center;gap:4px;padding:0 8px;border:0;border-radius:999px;background:var(--MI_THEME-bg);color:inherit;font:inherit;font-size:.7em;cursor:pointer}.localOnly{color:#e6a23c}.charCounter{display:grid;position:relative;width:34px;height:34px;flex:0 0 34px;place-items:center;border-radius:50%;background:conic-gradient(var(--MI_THEME-accent) var(--char-progress),color-mix(in srgb,var(--MI_THEME-divider) 70%,transparent) 0);font-size:.58em;font-variant-numeric:tabular-nums}.charCounter::after{content:"";position:absolute;inset:3px;border-radius:50%;background:var(--MI_THEME-panel)}.charCounter span{position:relative;z-index:1}.counterOver{color:#f45;background:#f45}.composerTools,.inlineEditor,.pollEditor,.attachedFiles,.composerContext,.delayStatus{width:min(100%,700px);margin:0 auto 7px;border:1px solid var(--MI_THEME-divider);border-radius:14px;background:color-mix(in srgb,var(--MI_THEME-panel) 96%,transparent);box-shadow:0 7px 24px color-mix(in srgb,#000 12%,transparent);backdrop-filter:blur(14px)}.composerTools{display:flex;gap:5px;padding:7px;overflow-x:auto}.composerTools button{display:flex;flex:0 0 auto;align-items:center;gap:5px;padding:7px 9px;border:0;border-radius:9px;background:transparent;color:inherit;font:inherit;cursor:pointer}.composerTools button:hover,.composerTools .toolActive{background:color-mix(in srgb,var(--MI_THEME-accent) 14%,transparent);color:var(--MI_THEME-accent)}.inlineEditor{display:flex;align-items:center;gap:8px;padding:8px 11px}.inlineEditor input,.pollEditor input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:inherit;font:inherit}.pollEditor{display:flex;flex-direction:column;gap:5px;padding:9px}.pollEditor>div{display:flex;gap:5px;padding:6px 8px;border-radius:8px;background:var(--MI_THEME-bg)}.pollEditor button,.pollEditor label{display:flex;width:fit-content;align-items:center;gap:5px;border:0;background:transparent;color:inherit;font:inherit;font-size:.78em;cursor:pointer}.attachedFiles{display:flex;gap:5px;padding:7px;overflow-x:auto}.attachedFiles span{display:flex;flex:0 0 auto;align-items:center;gap:4px;padding:5px 8px;border-radius:999px;background:var(--MI_THEME-bg);font-size:.72em}.attachedFiles button,.composerContext button{display:grid;padding:0;border:0;background:transparent;color:inherit;cursor:pointer}.composerContext{display:flex;align-items:center;gap:6px;padding:7px 11px;font-size:.76em}.composerContext span{flex:1}.privateComposerContext{border-color:#d59a31;background:color-mix(in srgb,#d59a31 12%,var(--MI_THEME-panel))}.delayStatus{display:flex;justify-content:space-between;padding:5px 12px;font-size:.72em}.delayStatus button{border:0;background:transparent;color:var(--MI_THEME-accent);font:inherit;font-weight:800;cursor:pointer}
.rightResizer{width:6px;flex:0 0 6px;cursor:col-resize;background:transparent;z-index:72}.rightResizer:hover{background:color-mix(in srgb,var(--MI_THEME-accent) 28%,transparent)}.rightPane{display:flex;min-width:300px;max-width:620px;flex-direction:column;border-left:1px solid var(--MI_THEME-divider);background:var(--MI_THEME-panel);opacity:1;transition:flex-basis .24s cubic-bezier(.2,.8,.2,1),min-width .24s cubic-bezier(.2,.8,.2,1),opacity .18s ease,transform .24s cubic-bezier(.2,.8,.2,1);z-index:70}.rightPaneCollapsed{min-width:0!important;flex-basis:0!important;border-left-width:0;opacity:0;overflow:hidden;pointer-events:none}.subpaneHeader{padding-inline:7px}.tabs{display:flex;min-width:0;flex:1;overflow-x:auto;scrollbar-width:none}.tabWrap{display:flex;flex:0 0 auto;align-items:center;border-bottom:2px solid transparent;opacity:.67}.activeTab{border-bottom-color:var(--MI_THEME-accent);color:var(--MI_THEME-accent);font-weight:700;opacity:1}.tab{max-width:135px;overflow:hidden;padding:8px 4px 8px 10px;border:0;background:transparent;color:inherit;font:inherit;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}.tabClose{display:grid;width:25px;height:25px;place-items:center;border:0;border-radius:7px;background:transparent;color:inherit;cursor:pointer}.tabClose:hover{background:var(--MI_THEME-hover)}.subpaneContent{min-height:0;flex:1;overflow:hidden;padding:0}.subpaneContent>:global(._pageScrollable){height:100%;overflow-y:auto}.subpaneContent>:not(:global(._pageScrollable)){box-sizing:border-box}.welcomePane{display:flex;min-height:75%;align-items:center;justify-content:center;flex-direction:column;gap:10px;padding:20px;text-align:center}.welcomePane span{max-width:290px;font-size:.84em;line-height:1.65;opacity:.65}.welcomeWordmark{color:var(--MI_THEME-accent);font-family:'HataSNSCordRighteous',system-ui,sans-serif;font-size:2em}.detailPane{height:100%;overflow:auto}.spinning{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
:global(.hatacording-feed-enter-active),:global(.hatacording-feed-leave-active){transition:opacity .22s ease,transform .22s ease}:global(.hatacording-feed-enter-from){opacity:0;transform:translateY(14px)}:global(.hatacording-feed-leave-to){opacity:0;transform:translateX(18px)}:global(.hatacording-jump-enter-active),:global(.hatacording-jump-leave-active){transition:opacity .18s ease,transform .18s ease}:global(.hatacording-jump-enter-from),:global(.hatacording-jump-leave-to){opacity:0;transform:translate(-50%,10px)}
@container(max-width:1120px){.rightPane{position:absolute;top:0;right:0;bottom:0;width:min(410px,92cqw);max-width:none;transform:translateX(105%);box-shadow:-12px 0 35px color-mix(in srgb,#000 20%,transparent);transition:transform .2s ease}.rightPaneOpen{transform:translateX(0)}}
@container(max-width:760px){.leftPane{position:absolute;top:0;bottom:0;left:0;width:min(310px,88cqw);transform:translateX(-105%);box-shadow:12px 0 35px color-mix(in srgb,#000 20%,transparent)}.drawerOpen{transform:translateX(0)}.timelineScroll{padding-inline:8px}.feedList{gap:7px}.noteRow{width:98%}.postFormPill{gap:3px;padding-inline:7px;border-radius:22px}.pillButton,.sendButton{width:34px;height:34px;flex-basis:34px}.visibilityButton span{display:none}.visibilityButton{width:34px;padding:0;justify-content:center}.charCounter{width:31px;height:31px;flex-basis:31px}.jumpControl{bottom:102px}.composerTools,.inlineEditor,.pollEditor,.attachedFiles,.composerContext,.delayStatus{border-radius:11px}.accountFooter{padding-bottom:max(8px,env(safe-area-inset-bottom))}}
/* HataSNSCordUI compact native-app surface overrides. Keep every layer inside
   this isolated page so application popups always render above it. */
.root {
	--cordBg: color-mix(in srgb, var(--MI_THEME-bg) 96%, var(--MI_THEME-accent) 4%);
	--cordPanel: var(--MI_THEME-panel);
	--cordSurface: color-mix(in srgb, var(--MI_THEME-panel) 96%, var(--MI_THEME-accent) 4%);
	--cordSurfaceStrong: color-mix(in srgb, var(--MI_THEME-panel) 89%, var(--MI_THEME-accent) 11%);
	--cordFg: var(--MI_THEME-fg);
	--cordMuted: color-mix(in srgb, var(--MI_THEME-fg) 62%, transparent);
	--cordDivider: color-mix(in srgb, var(--MI_THEME-divider) 82%, transparent);
	--cordShadow: color-mix(in srgb, #000 14%, transparent);
	--cordShimmerRest: color-mix(in srgb, var(--MI_THEME-fg) 58%, var(--MI_THEME-bg));
	--cordShimmerSoft: color-mix(in srgb, var(--MI_THEME-fg) 76%, var(--MI_THEME-accent) 24%);
	--cordShimmerPeak: color-mix(in srgb, var(--MI_THEME-fg) 94%, #fff 6%);

	isolation: isolate;
	height: 100%;
	background: var(--cordBg);
	color: var(--cordFg);
	font-size: 13px;
	line-height: 1.45;
}

/* zoom は flex-basis・container query・非同期ページの実寸を別々の座標系で
   計算させ、右ペインだけが過大化する。文字と操作密度で安全に三段階化する。 */
.root[data-ui-scale='small'] {
	font-size: 12px;
}

.root[data-ui-scale='medium'] {
	font-size: 13px;
}

.root[data-ui-scale='large'] {
	font-size: 14px;
}

.root[data-color-mode='light'] {
	--MI_THEME-bg: #f3f5f8;
	--MI_THEME-panel: #ffffff;
	--MI_THEME-panelHighlight: #eef1f5;
	--MI_THEME-popup: #ffffff;
	--MI_THEME-fg: #1c2430;
	--MI_THEME-fgHighlighted: #0d1117;
	--MI_THEME-divider: #d6dce5;
	--MI_THEME-hover: rgb(16 24 40 / 7%);
	--MI_THEME-accentedBg: color-mix(in srgb, var(--MI_THEME-accent) 13%, #fff);
	--MI_THEME-buttonBg: #e8ecf2;
	--MI_THEME-buttonHoverBg: #dde3eb;
	--MI_THEME-pageHeaderBg: #fff;
	--MI_THEME-fgOnAccent: #fff;
	--cordBg: #f3f5f8;
	--cordPanel: #fff;
	--cordSurface: #fff;
	--cordSurfaceStrong: color-mix(in srgb, var(--MI_THEME-accent) 9%, #fff);
	--cordFg: #1c2430;
	--cordMuted: #667085;
	--cordDivider: #d6dce5;
	--cordShadow: rgb(16 24 40 / 12%);
	--cordShimmerRest: #788394;
	--cordShimmerSoft: #48566a;
	--cordShimmerPeak: #172033;
	color-scheme: light;
}

.root[data-color-mode='dark'] {
	--MI_THEME-bg: #0f1218;
	--MI_THEME-panel: #181c25;
	--MI_THEME-panelHighlight: #222837;
	--MI_THEME-popup: #202632;
	--MI_THEME-fg: #edf1f7;
	--MI_THEME-fgHighlighted: #fff;
	--MI_THEME-divider: #343b49;
	--MI_THEME-hover: rgb(255 255 255 / 8%);
	--MI_THEME-accentedBg: color-mix(in srgb, var(--MI_THEME-accent) 18%, #181c25);
	--MI_THEME-buttonBg: #252c38;
	--MI_THEME-buttonHoverBg: #303949;
	--MI_THEME-pageHeaderBg: #181c25;
	--MI_THEME-fgOnAccent: #fff;
	--cordBg: #0f1218;
	--cordPanel: #181c25;
	--cordSurface: #1b202a;
	--cordSurfaceStrong: color-mix(in srgb, var(--MI_THEME-accent) 15%, #1b202a);
	--cordFg: #edf1f7;
	--cordMuted: #a7b0bf;
	--cordDivider: #343b49;
	--cordShadow: rgb(0 0 0 / 34%);
	--cordShimmerRest: #8490a3;
	--cordShimmerSoft: #c5d0df;
	--cordShimmerPeak: #ffffff;
	color-scheme: dark;
}

.root[data-theme-changing='true'],
.root[data-theme-changing='true'] .leftPane,
.root[data-theme-changing='true'] .centerPane,
.root[data-theme-changing='true'] .rightPane,
.root[data-theme-changing='true'] .timelineHeader,
.root[data-theme-changing='true'] .composerDock,
.root[data-theme-changing='true'] .postFormPill,
.root[data-theme-changing='true'] .noteBubble,
.root[data-theme-changing='true'] .activityEvent,
.root[data-theme-changing='true'] .subpaneHeader {
	transition: background-color .32s ease, color .32s ease, border-color .32s ease, box-shadow .32s ease;
}

.root :global(svg) {
	stroke-width: 1.8;
}

.scrim {
	z-index: 30;
	background: rgb(0 0 0 / 36%);
}

.leftPane {
	flex-basis: 208px;
	z-index: 40;
	border-color: var(--cordDivider);
	background: var(--cordPanel);
}

.root[data-sidebar-collapsed='true'] .leftPane {
	flex-basis: 56px;
}

.serverHeader,
.accountFooter,
.timelineHeader,
.subpaneHeader {
	min-height: 48px;
	gap: 5px;
	padding: 6px 8px;
	border-color: var(--cordDivider);
}

.serverButton,
.accountButton {
	gap: 8px;
	padding: 3px;
}

.serverIcon {
	width: 31px;
	height: 31px;
	flex-basis: 31px;
	border-radius: 9px;
}

.serverName {
	font-size: .92rem;
}

.iconButton,
.expandButton {
	width: 30px;
	height: 30px;
	flex-basis: 30px;
	border-radius: 8px;
}

.expandButton {
	margin-top: 2px;
}

.editNotice {
	gap: 6px;
	margin: 6px;
	padding: 8px;
	border-color: var(--cordDivider);
	border-radius: 10px;
	background: var(--cordSurfaceStrong);
	font-size: .72rem;
}

.textButton {
	padding: 4px 6px;
	border-color: var(--cordDivider);
	background: var(--cordSurface);
	font-size: .72rem;
}

.editActions {
	align-items: stretch;
	flex-wrap: wrap;
}

.copyOrderButton {
	line-height: 1.2;
	text-align: left;
	white-space: normal;
}

.copyOrderButton span {
	display: block;
}

.saveMenuButton {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 4px 7px;
	border: 1px solid color-mix(in srgb, var(--MI_THEME-accent) 62%, var(--cordDivider));
	border-radius: 8px;
	background: var(--MI_THEME-accent);
	color: var(--MI_THEME-fgOnAccent);
	font: inherit;
	font-size: .72rem;
	font-weight: 700;
	cursor: pointer;
}

.menuList {
	padding: 6px;
}

.menuSection + .menuSection,
.collectionSection,
.moreSection {
	margin-top: 6px;
	padding-top: 6px;
	border-color: var(--cordDivider);
}

.sectionTitle {
	margin: 0 7px 3px;
	font-size: .62rem;
}

.sectionHeading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 6px;
}

.sectionAddButton,
.feedbackButton {
	display: flex;
	align-items: center;
	gap: 5px;
	padding: 4px 7px;
	border: 0;
	border-radius: 8px;
	background: transparent;
	color: var(--cordMuted);
	font: inherit;
	font-size: .66rem;
	cursor: pointer;
}

.sectionAddButton:hover,
.feedbackButton:hover {
	background: var(--MI_THEME-hover);
	color: var(--MI_THEME-accent);
}

.feedbackButton {
	width: 100%;
	min-height: 32px;
	padding-inline: 7px;
	font-size: .75rem;
}

.root[data-sidebar-collapsed='true'] .feedbackButton {
	display: grid;
	width: 100%;
	min-height: 34px;
	padding: 0;
	place-items: center;
}

.collectionHeaderRow {
	display: flex;
	width: 100%;
	min-width: 0;
	align-items: center;
}

.collectionIconButton {
	display: grid;
	width: 26px;
	height: 26px;
	flex: 0 0 26px;
	place-items: center;
	padding: 0;
	border: 0;
	border-radius: 7px;
	background: transparent;
	color: var(--cordMuted);
	cursor: pointer;
}

.collectionIconButton:hover,
.collectionIconButton:focus-visible {
	background: var(--MI_THEME-hover);
	color: var(--MI_THEME-accent);
}

.menuItem,
.moreButton,
.collectionHeader {
	min-height: 34px;
	gap: 8px;
	padding: 4px 7px;
	border-radius: 9px;
	font-size: .79rem;
}

.menuItemRow,
.morePanel {
	border-radius: 9px;
}

.compactMenuItem {
	min-height: 31px;
	padding-left: 10px;
	font-size: .74rem;
}

.badge,
.collectionCount {
	min-width: 16px;
	padding: 1px 4px;
	font-size: .6rem;
}

.collectionItems {
	margin-left: 8px;
	padding-left: 4px;
}

.rowAction {
	width: 22px;
	height: 22px;
}

.rowActions {
	opacity: 0;
	pointer-events: none;
	transition: opacity .14s ease;
}

.menuItemRow:hover .rowActions,
.menuItemRow:focus-within .rowActions {
	opacity: 1;
	pointer-events: auto;
}

.rowSubpaneButton {
	display: grid;
	width: 24px;
	height: 24px;
	flex: 0 0 24px;
	place-items: center;
	padding: 0;
	border: 0;
	border-radius: 7px;
	background: transparent;
	color: var(--cordMuted);
	cursor: pointer;
}

.rowSubpaneButton:hover,
.rowSubpaneButton:focus-visible {
	background: var(--MI_THEME-hover);
	color: var(--MI_THEME-accent);
}

.morePanel {
	gap: 2px;
	padding: 4px;
	border-color: var(--cordDivider);
	background: var(--cordSurface);
}

.moreItem {
	gap: 7px;
	padding: 6px;
	font-size: .76rem;
}

.moreItemRow {
	display: flex;
	min-width: 0;
	align-items: center;
	gap: 3px;
}

.moreItemRow .moreItem {
	min-width: 0;
	flex: 1;
}

.moreRestoreButton {
	display: flex;
	min-height: 28px;
	flex: 0 0 auto;
	align-items: center;
	gap: 3px;
	padding: 4px 7px;
	border: 1px solid var(--cordDivider);
	border-radius: 7px;
	background: transparent;
	color: var(--MI_THEME-accent);
	font: inherit;
	font-size: .66rem;
	cursor: pointer;
}

.moreRestoreButton:hover,
.moreRestoreButton:focus-visible {
	background: var(--MI_THEME-hover);
}

.centerPane {
	background: var(--cordBg);
}

.centerPageHost {
	min-width: 0;
	min-height: 0;
	flex: 1;
	overflow: hidden;
	container-type: inline-size;
	background: var(--cordBg);
}

.centerPageHost > :global(._pageContainer) {
	height: 100%;
	overflow: auto;
}

.timelineHeader {
	z-index: 2;
	background: color-mix(in srgb, var(--cordPanel) 92%, transparent);
	box-shadow: 0 1px 0 var(--cordDivider);
}

.timelineTitle {
	gap: 7px;
}

.timelineTitle strong {
	font-size: .85rem;
}

.timelineTitle small {
	color: color-mix(in srgb, #25a76f 82%, var(--cordFg));
	font-size: .62rem;
}

.headerActions {
	gap: 2px;
}

.rateLimitButton {
	--rate-limit-color: var(--MI_THEME-accent);

	display: grid;
	position: relative;
	width: 26px;
	height: 26px;
	flex: 0 0 26px;
	place-items: center;
	padding: 0;
	border: 0;
	border-radius: 50%;
	background: transparent;
	color: var(--cordFg);
	cursor: pointer;
	transition: transform .16s ease, filter .16s ease;
}

.rateLimitRing {
	position: absolute;
	inset: 0;
	display: block;
	width: 26px;
	height: 26px;
	overflow: visible;
	/* 旗鯖fork(HataSNSCordUI): 12時位置を開始点にする回転はここ(svg自体)にかける。
	   内側の<circle>に直接 transform-origin を px指定すると、transform-box の既定値が
	   ブラウザによって circle の bounding box(fill-box)基準になり、円の中心(13,13)と
	   ズレて変な位置を軸に回ってしまう(結果、進捗が下側から欠けて見える)。
	   svg 要素自身は通常のCSSレイアウト矩形(26x26)を持つので、transform-origin: center は
	   常にその中心=(13,13)を指し、ズレが起きない。 */
	transform: rotate(-90deg);
	transform-origin: center;
}

.rateLimitTrack,
.rateLimitProgress {
	fill: none;
	stroke-width: 2.5;
	vector-effect: non-scaling-stroke;
}

.rateLimitTrack {
	stroke: color-mix(in srgb, var(--cordDivider) 72%, transparent);
}

.rateLimitProgress {
	stroke: var(--rate-limit-color);
	stroke-dasharray: 100;
	stroke-dashoffset: var(--rate-limit-offset);
	stroke-linecap: round;
	transition: stroke-dashoffset .2s ease;
}

.rateLimitButton span {
	position: relative;
	z-index: 1;
	font-size: .54rem;
	font-variant-numeric: tabular-nums;
	font-weight: 800;
}

.rateLimitButton:hover {
	filter: brightness(1.08);
	transform: scale(1.06);
}

.rateLimitButton[data-level='medium'] {
	--rate-limit-color: #d79621;
}

.rateLimitButton[data-level='low'] {
	--rate-limit-color: #e45c64;
}

.rateLimitButton[data-level='waiting'] {
	--rate-limit-color: var(--cordMuted);
}

.timelineViewport {
	display: flex;
	position: relative;
	min-height: 0;
	flex: 1;
}

.timelineScroll {
	width: 100%;
	box-sizing: border-box;
	padding: 10px max(10px, 2cqw) 16px;
	background: transparent;
	overflow-x: hidden;
}

.feedList {
	width: min(100%, 760px);
	box-sizing: border-box;
	gap: 10px;
	padding-inline: 4px;
}

.noteRow {
	--cord-note-avatar-size: 36px;

	display: grid;
	grid-template-columns: var(--cord-note-avatar-size) minmax(0, 1fr) 25px;
	width: min(88%, 680px);
	max-width: 100%;
	box-sizing: border-box;
	align-self: flex-start;
	align-items: end;
	gap: 7px;
	padding: 0;
	border: 0 !important;
	border-radius: 0 !important;
	outline: 0;
	background: transparent !important;
	box-shadow: none !important;
	overflow: visible;
	cursor: default;
}

.ownNote {
	grid-template-columns: 25px minmax(0, 1fr) var(--cord-note-avatar-size);
	align-self: flex-end;
}

.noteAvatarButton {
	display: grid;
	width: var(--cord-note-avatar-size);
	height: var(--cord-note-avatar-size);
	flex: 0 0 var(--cord-note-avatar-size);
	order: 0;
	place-items: center;
	margin: 0 0 3px;
	padding: 0;
	border: 0;
	border-radius: 50%;
	background: transparent;
	color: inherit;
	overflow: visible;
	cursor: pointer;
}

.noteAvatar {
	display: block;
	width: var(--cord-note-avatar-size);
	height: var(--cord-note-avatar-size);
	border: 0 !important;
	background: transparent !important;
	box-shadow: none !important;
	overflow: visible;
}

.noteAvatarButton:focus-visible {
	outline: 2px solid color-mix(in srgb, var(--MI_THEME-accent) 58%, transparent);
	outline-offset: 3px;
}

.ownNote .noteAvatarButton {
	order: 2;
}

.noteBubble {
	position: relative;
	width: auto;
	max-width: none;
	box-sizing: border-box;
	min-width: 0;
	flex: 1;
	order: 1;
	padding: 3px;
	border: 1px solid color-mix(in srgb, var(--cordDivider) 88%, transparent);
	border-radius: 17px 17px 17px 5px;
	background: var(--cordSurface);
	box-shadow: 0 3px 14px var(--cordShadow);
	overflow: visible;
	overflow-wrap: anywhere;
}

.noteBubble::before {
	content: '';
	position: absolute;
	left: -7px;
	bottom: 10px;
	z-index: 0;
	width: 8px;
	height: 10px;
	border: 0;
	background: var(--cordSurface);
	clip-path: polygon(100% 0, 100% 100%, 0 100%);
	pointer-events: none;
}

/* 吹き出し口は外側だけへ切り抜き、本文より背面に置く。回転した四角を
   前面に重ねる方式だと、本文側へ「>」状の欠片がはみ出していた。 */
.embeddedNote {
	position: relative;
	z-index: 1;
}

.ownNote .noteBubble {
	border-color: color-mix(in srgb, var(--MI_THEME-accent) 36%, var(--cordDivider));
	border-radius: 17px 17px 5px;
	background: color-mix(in srgb, var(--MI_THEME-accent) 16%, var(--cordPanel));
}

.root[data-color-mode='light'] .ownNote .noteBubble {
	border-color: color-mix(in srgb, #7c8798 22%, var(--cordDivider));
	background: #f8f9fb;
}

.root[data-color-mode='dark'] .ownNote .noteBubble {
	border-color: color-mix(in srgb, #a7b0bf 24%, var(--cordDivider));
	background: #242a35;
}

.ownNote .noteBubble::before {
	right: -7px;
	left: auto;
	background: color-mix(in srgb, var(--MI_THEME-accent) 16%, var(--cordPanel));
	clip-path: polygon(0 0, 100% 100%, 0 100%);
}

.root[data-color-mode='light'] .ownNote .noteBubble::before {
	border-color: color-mix(in srgb, #7c8798 22%, var(--cordDivider));
	background: #f8f9fb;
}

.root[data-color-mode='dark'] .ownNote .noteBubble::before {
	border-color: color-mix(in srgb, #a7b0bf 24%, var(--cordDivider));
	background: #242a35;
}

.noteBubble[data-private-channel='true'] {
	border-color: color-mix(in srgb, #d69b32 62%, var(--cordDivider));
}

.noteBubble[data-channel='true']::after {
	content: '';
	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	width: 5px;
	border-radius: 17px 0 0 17px;
	background: var(--cord-channel-color, var(--MI_THEME-accent));
	pointer-events: none;
}

/* 旗鯖fork(HataSNSCordUI): 宴(うたげ)の枠。MkNote は内側での枠描画を止め(utageFrameExternal)、
   代わりに data-utage-state 属性だけを自身のルートに出す。ここではそれを :has() で拾って、
   ノートの本当の外枠であるこの .noteBubble 自体に枠を描く。 */
.noteBubble:has([data-utage-state='flashing']) {
	outline: 2px solid transparent;
	outline-offset: 2px;
	border-radius: 17px 17px 17px 5px;
	animation: cordUtageFlash 2.4s ease-in-out infinite;
}

.ownNote .noteBubble:has([data-utage-state='flashing']) {
	border-radius: 17px 17px 5px;
}

@keyframes cordUtageFlash {
	0%, 100% {
		outline-color: color-mix(in srgb, var(--MI_THEME-accent) 18%, transparent);
	}
	50% {
		outline-color: color-mix(in srgb, var(--MI_THEME-accent) 92%, transparent);
	}
}

@media (prefers-reduced-motion: reduce) {
	.noteBubble:has([data-utage-state='flashing']) {
		animation: none;
		outline-color: color-mix(in srgb, var(--MI_THEME-accent) 70%, transparent);
	}
}

.noteBubble:has([data-utage-state='failed']) {
	outline: 2px solid color-mix(in srgb, var(--MI_THEME-error) 80%, transparent);
	outline-offset: 2px;
	border-radius: 17px 17px 17px 5px;
}

.noteBubble:has([data-utage-state='success']) {
	outline: 2px solid color-mix(in srgb, var(--MI_THEME-success) 75%, transparent);
	outline-offset: 2px;
	border-radius: 17px 17px 17px 5px;
}

.ownNote .noteBubble:has([data-utage-state='failed']),
.ownNote .noteBubble:has([data-utage-state='success']) {
	border-radius: 17px 17px 5px;
}

.noteOpenButton {
	display: grid;
	width: 25px;
	height: 25px;
	flex: 0 0 25px;
	place-items: center;
	margin-bottom: 7px;
	order: 2;
	padding: 0;
	border: 0;
	border-radius: 8px;
	background: transparent;
	color: var(--cordMuted);
	opacity: 0;
	visibility: hidden;
	pointer-events: none;
	cursor: pointer;
	transform: translateX(-3px);
	transition: opacity .15s ease, color .15s ease, background-color .15s ease, transform .15s ease;
}

.ownNote .noteOpenButton {
	order: 0;
}

.noteRow:hover .noteOpenButton,
.noteRow:focus-within .noteOpenButton,
.noteOpenButton:focus-visible {
	opacity: 1;
	visibility: visible;
	pointer-events: auto;
	transform: translateX(0);
}

.noteOpenButton:hover {
	background: var(--MI_THEME-hover);
	color: var(--MI_THEME-accent);
}

.activityBlock {
	display: flex;
	width: min(88%, 620px);
	align-self: center;
	flex-direction: column;
	gap: 5px;
}

.activityBlock,
.activityEvent,
.activityMain,
.activityCopy,
.activityTitle,
.activityGroupList,
.activityGroupItem {
	border: 0 !important;
	border-radius: 0 !important;
	background: transparent !important;
	box-shadow: none !important;
	backdrop-filter: none !important;
	-webkit-backdrop-filter: none !important;
}

.activityEvent::before,
.activityEvent::after,
.activityMain::before,
.activityMain::after {
	content: none !important;
}

.activityEvent {
	display: flex;
	position: relative;
	width: fit-content;
	max-width: 100%;
	align-self: center;
	align-items: center;
	padding: 3px 2px;
	border: 0;
	border-radius: 0;
	background: transparent;
	box-shadow: none;
	backdrop-filter: none;
	-webkit-backdrop-filter: none;
	font-size: .72rem;
	box-sizing: border-box;
	cursor: default;
}

.activityMain {
	display: flex;
	min-width: 0;
	flex: 1;
	align-items: center;
	gap: 7px;
	padding: 0;
	border: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	text-align: left;
	cursor: pointer;
}

.activityMain > svg {
	flex: 0 0 auto;
}

.activityEarthquakeGroupIcon {
	color: color-mix(in srgb, #e46b4f 88%, var(--cordFg));
}

.activityReaction {
	display: block;
	width: 19px;
	height: 19px;
	flex: 0 0 19px;
	object-fit: contain;
}

.activityCopy {
	display: flex;
	min-width: 0;
	flex: 1;
	flex-direction: row;
	gap: 0;
	overflow: hidden;
}

.activityTitle,
.activityDetail {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.activityTitle {
	display: flex;
	min-width: 0;
	flex: 1;
	align-items: center;
	gap: 4px;
	font-weight: 750;
}

.activityTitle > .activityShimmerText {
	min-width: 0;
	flex: 1;
}

.activitySource {
	padding: 0;
	border-radius: 0;
	background: transparent;
	color: var(--MI_THEME-accent);
	font-size: .85em;
	font-weight: 750;
}

.activityActor {
	display: inline-flex;
	min-width: 0;
	max-width: 180px;
	align-items: center;
	gap: 4px;
}

.activityActorAvatar {
	width: 18px;
	height: 18px;
	flex: 0 0 18px;
	border-radius: 50%;
}

.activityCount {
	display: inline-block;
	min-width: 1.2ch;
	color: var(--MI_THEME-accent);
	font-variant-numeric: tabular-nums;
	text-align: right;
}

.activityTime,
.activityGroupTime {
	flex: 0 0 auto;
	color: var(--cordMuted);
	font-size: .84em;
	font-variant-numeric: tabular-nums;
	font-weight: 500;
	white-space: nowrap;
}

.activityTime {
	margin-left: 2px;
}

.activityDetail {
	max-width: 510px;
	color: var(--cordMuted);
	font-size: .92em;
}

.activityExpand {
	display: grid;
	width: 24px;
	height: 24px;
	flex: 0 0 24px;
	place-items: center;
	padding: 0;
	border: 0;
	border-radius: 0;
	background: transparent;
	color: var(--cordMuted);
	cursor: pointer;
}

.activityExpand:hover {
	background: transparent;
	color: var(--cordFg);
}

.activityExpand > svg {
	transition: transform .18s ease;
}

.activityExpandOpen {
	transform: rotate(90deg);
}

.activityRevealing .activityTitle,
.activityRevealing .activityDetail {
	will-change: clip-path, opacity, transform;
	animation: hatacordingActivityReveal .42s cubic-bezier(.2,.8,.2,1) both;
}

.activityRevealing .activityDetail {
	animation-delay: .07s;
}

.activityShimmerText {
	display: inline-block;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.activityShimmering .activityShimmerText {
	background-image: linear-gradient(100deg, var(--cordShimmerRest) 0 30%, var(--cordShimmerSoft) 43%, var(--cordShimmerPeak) 50%, var(--cordShimmerSoft) 57%, var(--cordShimmerRest) 70% 100%);
	background-position: 100% 0;
	background-size: 230% 100%;
	background-clip: text;
	-webkit-background-clip: text;
	color: transparent;
	-webkit-text-fill-color: transparent;
	will-change: background-position;
	animation: hatacordingTextShimmer 3.2s cubic-bezier(.3,.58,.28,1) 2;
}

.activityShimmering .activityMain {
	will-change: filter;
	animation: hatacordingWholeActivityShimmer 3.2s cubic-bezier(.3,.58,.28,1) 2;
}

.activityReconnect {
	display: flex;
	height: 27px;
	flex: 0 0 auto;
	align-items: center;
	gap: 4px;
	padding: 0 8px;
	border: 1px solid color-mix(in srgb, var(--MI_THEME-accent) 38%, var(--cordDivider));
	border-radius: 8px;
	background: color-mix(in srgb, var(--MI_THEME-accent) 11%, var(--cordSurface));
	color: var(--MI_THEME-accent);
	font: inherit;
	font-size: .68rem;
	font-weight: 750;
	cursor: pointer;
}

.activityReconnect:hover,
.activityReconnect:focus-visible {
	background: color-mix(in srgb, var(--MI_THEME-accent) 20%, var(--cordSurface));
}

.activityEmergency {
	color: color-mix(in srgb, #e46b4f 86%, var(--cordFg));
}

.activityGroupList {
	display: flex;
	max-height: min(310px, 48cqh);
	flex-direction: column;
	gap: 3px;
	padding: 2px 0;
	border: 0;
	border-radius: 0;
	background: transparent;
	box-shadow: none;
	backdrop-filter: none;
	-webkit-backdrop-filter: none;
	overflow-y: auto;
}

.activityGroupItem {
	display: flex;
	min-width: 0;
	align-items: center;
	gap: 6px;
	padding: 6px 7px;
	border: 0;
	border-radius: 0;
	background: transparent;
	color: var(--cordFg);
	font: inherit;
	font-size: .7rem;
	text-align: left;
	cursor: pointer;
}

.activityGroupItem:hover,
.activityGroupItem:focus-visible {
	background: transparent;
	color: var(--MI_THEME-accent);
}

.activityGroupItem > svg:last-child {
	flex: 0 0 auto;
	color: var(--cordMuted);
}

.activityGroupCopy {
	display: flex;
	min-width: 0;
	flex: 1;
	flex-direction: row;
	overflow: hidden;
}

.activityGroupCopy strong,
.activityGroupCopy small {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.activityGroupTime {
	font-size: .88em;
}

.activityGroupCopy small {
	color: var(--cordMuted);
	font-size: .9em;
}

@keyframes hatacordingTextShimmer {
	to { background-position: -160% 0; }
}

@keyframes hatacordingWholeActivityShimmer {
	0%, 100% { filter: brightness(.86) saturate(.9); }
	38% { filter: brightness(1) saturate(1); }
	50% { filter: brightness(1.45) saturate(1.14); }
	62% { filter: brightness(1.02) saturate(1); }
}

@keyframes hatacordingActivityReveal {
	from {
		opacity: .15;
		clip-path: inset(0 100% 0 0);
		transform: translate3d(-4px, 0, 0);
	}
	to {
		opacity: 1;
		clip-path: inset(0 0 0 0);
		transform: translate3d(0, 0, 0);
	}
}

.historyLoader {
	width: min(100%, 760px);
	margin-bottom: 12px;
}

.historyLabel {
	padding: 5px 9px;
	border-color: var(--cordDivider);
	background: var(--cordSurface);
	font-size: .68rem;
}

.state {
	min-height: 190px;
	font-size: .78rem;
}

.primaryButton {
	padding: 7px 11px;
	border-radius: 8px;
	font-size: .76rem;
}

.jumpControl {
	right: auto;
	bottom: 10px;
	left: 50%;
	z-index: 3;
	gap: 5px;
	padding: 7px 10px;
	border-color: var(--cordDivider);
	background: color-mix(in srgb, var(--cordPanel) 94%, transparent);
	font-size: .72rem;
}

.jumpHasNew {
	border-color: color-mix(in srgb, var(--MI_THEME-accent) 58%, var(--cordDivider));
	background: color-mix(in srgb, var(--MI_THEME-accent) 16%, var(--cordPanel));
	color: var(--cordFg);
}

.jumpHasNew > svg:first-child {
	color: var(--MI_THEME-accent);
}

.composerDock {
	flex: 0 0 auto;
	min-width: 0;
	padding: 8px max(10px, 2cqw) max(9px, env(safe-area-inset-bottom));
	border: 0;
	background: transparent;
	box-shadow: none;
	backdrop-filter: none;
}

.composerPreview {
	display: flex;
	width: min(100%, 690px);
	max-height: 156px;
	min-height: 0;
	margin: 0 auto 5px;
	box-sizing: border-box;
	flex-direction: column;
	border: 1px solid var(--cordDivider);
	border-radius: 11px;
	background: color-mix(in srgb, var(--cordSurface) 97%, var(--MI_THEME-accent) 3%);
	box-shadow: 0 4px 16px var(--cordShadow);
	overflow: hidden;
}

.composerPreviewHeader {
	display: flex;
	flex: 0 0 auto;
	align-items: center;
	gap: 5px;
	padding: 5px 9px;
	border-bottom: 1px solid color-mix(in srgb, var(--cordDivider) 74%, transparent);
	color: var(--cordMuted);
	font-size: .64rem;
	font-weight: 750;
}

.composerPreviewBody {
	min-width: 0;
	min-height: 0;
	padding: 7px 10px 8px;
	font-size: .75rem;
	line-height: 1.5;
	overflow: auto;
	overflow-wrap: anywhere;
	pointer-events: none;
}

.postFormPill {
	width: min(100%, 700px);
	gap: 4px;
	margin-block: 2px 4px;
	padding: 4px 6px;
	border-color: var(--cordDivider);
	background: color-mix(in srgb, var(--cordSurface) 92%, transparent);
	box-shadow: 0 14px 34px var(--cordShadow), 0 2px 8px color-mix(in srgb, #000 8%, transparent);
	backdrop-filter: blur(18px) saturate(1.08);
}

.pillButton,
.sendButton,
.federationButton {
	width: 32px;
	height: 32px;
	flex-basis: 32px;
}

.sendButton {
	box-shadow: 0 2px 8px color-mix(in srgb, var(--MI_THEME-accent) 30%, transparent);
}

.pillInput {
	min-height: 32px;
	max-height: 120px;
	padding: 6px 3px;
	box-sizing: border-box;
	overflow-y: hidden;
	font-size: .78rem;
	line-height: 1.35;
}

.visibilityButton {
	height: 29px;
	padding-inline: 7px;
	background: var(--cordBg);
	font-size: .61rem;
}

.charCounter {
	width: 29px;
	height: 29px;
	flex-basis: 29px;
	font-size: .52rem;
}

.charCounter::after {
	background: var(--cordSurface);
}

.composerShortcutInline {
	display: flex;
	min-width: 0;
	flex: 0 0 auto;
	align-items: center;
	gap: 2px;
}

.composerShortcutButton {
	display: grid;
	width: 29px;
	height: 29px;
	flex: 0 0 auto;
	place-items: center;
	padding: 0;
	border: 0;
	border-radius: 50%;
	background: transparent;
	color: var(--cordMuted);
	font: inherit;
	cursor: pointer;
}

.composerShortcutButton:hover,
.composerShortcutButton:focus-visible,
.composerShortcutActive {
	border-color: color-mix(in srgb, var(--MI_THEME-accent) 52%, var(--cordDivider));
	background: color-mix(in srgb, var(--MI_THEME-accent) 14%, transparent);
	color: var(--MI_THEME-accent);
}

.inlineEditor,
.pollEditor,
.composerAttachments,
.composerContext,
.recipientEditor,
.mentionNotice,
.delayStatus,
.eventEditor {
	width: min(100%, 690px);
	margin: 0 auto 5px;
	border-color: var(--cordDivider);
	border-radius: 10px;
	background: var(--cordSurface);
	box-shadow: 0 4px 16px var(--cordShadow);
	backdrop-filter: none;
}

.composerAttachments {
	box-sizing: border-box;
	overflow: hidden;
}

.inlineEditor,
.composerContext {
	padding: 6px 9px;
	font-size: .7rem;
}

.composerContext > .composerContextAvatar {
	width: 25px;
	min-width: 25px;
	max-width: 25px;
	height: 25px;
	min-height: 25px;
	max-height: 25px;
	flex: 0 0 25px;
	aspect-ratio: 1;
}

.composerContextCopy {
	display: flex;
	min-width: 0;
	flex: 1;
	flex-direction: column;
	line-height: 1.35;
}

.composerContextCopy b,
.composerContextCopy small {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.composerContextCopy small {
	color: var(--cordMuted);
	font-size: .92em;
}

.recipientEditor {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	padding: 6px 8px;
}

.recipientLabel {
	display: flex;
	flex: 0 0 auto;
	align-items: center;
	gap: 4px;
	padding: 5px 2px;
	color: var(--cordMuted);
	font-size: .68rem;
	font-weight: 700;
}

.recipientList {
	display: flex;
	min-width: 0;
	flex: 1;
	align-items: center;
	gap: 5px;
	flex-wrap: wrap;
}

.recipientChip,
.addRecipientButton {
	display: flex;
	min-width: 0;
	align-items: center;
	gap: 5px;
	padding: 3px 7px 3px 4px;
	border: 1px solid var(--cordDivider);
	border-radius: 999px;
	background: var(--cordBg);
	color: inherit;
	font: inherit;
	font-size: .65rem;
	cursor: pointer;
}

.recipientChip > :global(._avatar) {
	width: 23px;
	height: 23px;
}

.recipientChip > span {
	display: flex;
	min-width: 0;
	flex-direction: column;
	line-height: 1.15;
}

.recipientChip small {
	max-width: 130px;
	overflow: hidden;
	color: var(--cordMuted);
	font-size: .88em;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.addRecipientButton {
	padding: 5px 8px;
	border-style: dashed;
	color: var(--MI_THEME-accent);
}

.mentionNotice {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 6px 9px;
	border-color: color-mix(in srgb, #d79621 52%, var(--cordDivider));
	background: color-mix(in srgb, #d79621 10%, var(--cordSurface));
	font-size: .66rem;
}

.mentionNotice button {
	flex: 0 0 auto;
	padding: 4px 7px;
	border: 0;
	border-radius: 7px;
	background: color-mix(in srgb, #d79621 18%, transparent);
	color: inherit;
	font: inherit;
	font-weight: 700;
	cursor: pointer;
}

.pollEditor {
	gap: 3px;
	max-height: 168px;
	padding: 6px;
	overflow: auto;
}

.pollEditor > div {
	padding: 4px 6px;
}

.pollEditor .pollOptions {
	display: flex;
	align-items: center;
	gap: 6px;
	flex-wrap: wrap;
}

.pollOptions label {
	display: flex;
	align-items: center;
	gap: 5px;
}

.pollOptions input,
.pollOptions select {
	min-width: 0;
	min-height: 28px;
	box-sizing: border-box;
	padding: 3px 6px;
	border: 1px solid var(--cordDivider);
	border-radius: 7px;
	outline: 0;
	background: var(--cordPanel);
	color: var(--cordFg);
	font: inherit;
}

.pollOptions input[type='number'] {
	width: 74px;
}

.eventEditor {
	max-height: 220px;
	overflow: auto;
}

.attachedFiles {
	padding: 5px;
}

.attachedFiles span {
	padding: 4px 7px;
	font-size: .65rem;
}

.delayStatus {
	padding: 4px 10px;
	font-size: .65rem;
}

.rightResizer {
	width: 4px;
	flex-basis: 4px;
	z-index: auto;
}

.mobileRightResizer {
	display: none;
}

.rightPane {
	min-width: 280px;
	max-width: 560px;
	flex-grow: 0;
	flex-shrink: 0;
	box-sizing: border-box;
	overflow: hidden;
	z-index: 1;
	border-color: var(--cordDivider);
	background: var(--cordPanel);
}

.subpaneHeader {
	background: var(--cordPanel);
}

.tabWrap {
	font-size: .72rem;
}

.tab {
	max-width: 116px;
	padding: 6px 3px 6px 8px;
}

.tabClose {
	width: 22px;
	height: 22px;
}

.subpaneContent {
	display: flex;
	width: 100%;
	max-width: 100%;
	container-type: inline-size;
	min-height: 0;
	min-width: 0;
	flex: 1;
	flex-direction: column;
	background: var(--cordBg);
	overflow: hidden;
}

.subpaneContent > *,
.subpaneView > * {
	min-height: 0;
	min-width: 0;
	max-width: 100%;
}

.subpaneView {
	display: flex;
	width: 100%;
	max-width: 100%;
	height: 100%;
	min-width: 0;
	min-height: 0;
	flex: 1;
	flex-direction: column;
	box-sizing: border-box;
	overflow: hidden;
}

.subpanePage {
	width: 100%;
	max-width: 100%;
	height: 100%;
	min-width: 0;
	min-height: 0;
	flex: 1;
	box-sizing: border-box;
	overflow-x: hidden;
	overflow-y: auto;
}

.subpanePage :global(._spacer) {
	width: 100%;
	max-width: 100%;
	box-sizing: border-box;
}

.widgetPane {
	width: 100%;
	max-width: 100%;
	min-height: 0;
	min-width: 0;
	flex: 1;
	box-sizing: border-box;
	padding: 8px;
	overflow-x: hidden;
	overflow-y: auto;
	overscroll-behavior: contain;
	scrollbar-gutter: stable;
}

.widgetPane > * {
	width: 100%;
	max-width: 100%;
	min-width: 0;
	box-sizing: border-box;
}

.widgetEmpty,
.subpaneLoading {
	display: flex;
	min-height: 220px;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	gap: 8px;
	padding: 18px;
	color: var(--cordMuted);
	text-align: center;
}

.widgetEmpty > div {
	display: flex;
	max-width: 100%;
	flex-wrap: wrap;
	justify-content: center;
	gap: 7px;
}

.secondaryButton {
	padding: 9px 14px;
	border: 1px solid var(--cordDivider);
	border-radius: 10px;
	background: var(--MI_THEME-buttonBg);
	color: var(--cordFg);
	font: inherit;
	font-weight: 700;
	cursor: pointer;
}

.secondaryButton:hover,
.secondaryButton:focus-visible {
	background: var(--MI_THEME-buttonHoverBg);
}

.subpaneTimeline {
	display: block;
	width: 100%;
	height: 100%;
	min-height: 0;
	flex: 1;
	box-sizing: border-box;
	overflow-x: hidden;
	overflow-y: auto;
	overscroll-behavior: contain;
	scrollbar-gutter: stable;
}

.subpaneTimeline > * {
	width: 100%;
	min-height: 100%;
	box-sizing: border-box;
}

.welcomePane {
	gap: 7px;
	padding: 16px;
}

.welcomePane span {
	font-size: .73rem;
}

.welcomeWordmark {
	font-size: 1.65rem;
}

.detailPane {
	background: var(--cordPanel);
}

:global(.hatacording-feed-enter-active),
:global(.hatacording-feed-leave-active),
:global(.hatacording-feed-move) {
	transition: opacity .24s cubic-bezier(.2,.8,.2,1), transform .24s cubic-bezier(.2,.8,.2,1);
}

:global(.hatacording-activity-detail-enter-active),
:global(.hatacording-activity-detail-leave-active) {
	transition: opacity .18s ease, max-height .18s ease, transform .18s ease;
}

:global(.hatacording-activity-detail-enter-from),
:global(.hatacording-activity-detail-leave-to) {
	max-height: 0;
	opacity: 0;
	transform: translateY(-3px);
}

:global(.hatacording-count-enter-active),
:global(.hatacording-count-leave-active) {
	transition: opacity .18s ease, transform .18s cubic-bezier(.2,.8,.2,1);
}

:global(.hatacording-count-enter-from) {
	opacity: 0;
	transform: translateY(55%) scale(.82);
}

:global(.hatacording-count-leave-to) {
	opacity: 0;
	transform: translateY(-55%) scale(.82);
}

:global(.hatacording-notification-group-enter-active),
:global(.hatacording-notification-group-leave-active),
:global(.hatacording-notification-group-move) {
	transition: opacity .2s ease, transform .2s cubic-bezier(.2,.8,.2,1);
}

:global(.hatacording-notification-group-enter-from),
:global(.hatacording-notification-group-leave-to) {
	opacity: 0;
	transform: translateY(-5px);
}

:global(.hatacording-composer-preview-enter-active),
:global(.hatacording-composer-preview-leave-active) {
	transition: max-height .16s ease, opacity .16s ease, transform .16s ease;
}

:global(.hatacording-composer-preview-enter-from),
:global(.hatacording-composer-preview-leave-to) {
	max-height: 0;
	opacity: 0;
	transform: translateY(4px);
}

:global(.hatacording-feed-enter-from) {
	opacity: 0;
	transform: translateY(12px) scale(.985);
}

:global(.hatacording-feed-leave-to) {
	opacity: 0;
	transform: translateX(12px);
}

.jumpControl {
	transition: border-color .22s ease, background-color .22s ease, color .22s ease, box-shadow .22s ease, transform .18s ease;
}

.jumpContent {
	display: flex;
	align-items: center;
	gap: 7px;
	white-space: nowrap;
}

:global(.hatacording-jump-content-enter-active),
:global(.hatacording-jump-content-leave-active) {
	transition: opacity .18s ease, transform .18s cubic-bezier(.2, .8, .2, 1);
}

:global(.hatacording-jump-content-enter-from) {
	opacity: 0;
	transform: translateY(5px) scale(.97);
}

:global(.hatacording-jump-content-leave-to) {
	opacity: 0;
	transform: translateY(-5px) scale(.97);
}

@container (max-width: 1120px) {
	.rightPane {
		min-width: min(280px, 92cqw);
		max-width: 92cqw;
		z-index: 40;
		background: var(--cordPanel);
	}

	.mobileRightResizer {
		display: grid;
		position: absolute;
		top: 0;
		bottom: 0;
		left: -14px;
		z-index: 3;
		width: 28px;
		place-items: center;
		border: 0;
		background: transparent;
		touch-action: none;
		cursor: ew-resize;
	}

	.mobileRightResizer span {
		display: block;
		width: 4px;
		height: 54px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--MI_THEME-accent) 58%, var(--cordDivider));
		box-shadow: 0 2px 10px var(--cordShadow);
	}
}

@container (max-width: 760px) {
	.leftPane {
		z-index: 40;
		width: min(278px, 88cqw);
	}

	.timelineScroll {
		padding: 8px 7px 12px;
	}

	.feedList {
		gap: 8px;
	}

	.noteRow {
		--cord-note-avatar-size: 32px;

		grid-template-columns: var(--cord-note-avatar-size) minmax(0, 1fr);
		width: 97%;
	}

	.ownNote {
		grid-template-columns: minmax(0, 1fr) var(--cord-note-avatar-size);
	}

	.noteBubble {
		border-radius: 15px 15px 15px 5px;
	}

	.ownNote .noteBubble {
		border-radius: 15px 15px 5px;
	}

	.noteOpenButton {
		display: none;
	}

	.composerDock {
		padding-inline: 6px;
	}

	.composerPreview {
		max-height: 132px;
	}

	.postFormPill {
		border-radius: 19px;
	}

	.composerShortcutButton {
		width: 29px;
		height: 29px;
	}

	.visibilityButton span {
		display: none;
	}

	.visibilityButton {
		width: 29px;
		justify-content: center;
		padding: 0;
	}

}

@media (hover: none) {
	.rowActions {
		opacity: 1;
		pointer-events: auto;
	}

	.noteOpenButton {
		display: none;
	}

	/* 横向きで中央ペインだけが760pxを超えても、消した詳細ボタン用の
	   固定列へ吹き出しが入らないよう、タッチ端末は常に2列で組む。 */
	.noteRow {
		grid-template-columns: var(--cord-note-avatar-size) minmax(0, 1fr);
	}

	.ownNote {
		grid-template-columns: minmax(0, 1fr) var(--cord-note-avatar-size);
	}
}

/* ルート外寸は変えず、UI内部の密度だけを三段階で変える。これにより
   小でのはみ出しと、大での逆L字型の未描画領域を作らない。 */
.root[data-ui-scale='small'] :is(.serverHeader, .accountFooter, .timelineHeader, .subpaneHeader) {
	min-height: 44px;
}

.root[data-ui-scale='small'] :is(.iconButton, .expandButton) {
	width: 28px;
	height: 28px;
	flex-basis: 28px;
}

.root[data-ui-scale='small'] :is(.serverIcon, .avatar) {
	width: 29px;
	height: 29px;
	flex-basis: 29px;
}

.root[data-ui-scale='small'] :is(.menuItem, .moreButton, .collectionHeader) {
	min-height: 35px;
}

.root[data-ui-scale='large'] :is(.serverHeader, .accountFooter, .timelineHeader, .subpaneHeader) {
	min-height: 52px;
}

.root[data-ui-scale='large'] :is(.iconButton, .expandButton) {
	width: 32px;
	height: 32px;
	flex-basis: 32px;
}

.root[data-ui-scale='large'] :is(.serverIcon, .avatar) {
	width: 34px;
	height: 34px;
	flex-basis: 34px;
}

.root[data-ui-scale='large'] :is(.menuItem, .moreButton, .collectionHeader) {
	min-height: 42px;
}

@media (prefers-reduced-motion: reduce) {
	.leftPane,
	.rightPane,
	.root[data-theme-changing='true'],
	.root[data-theme-changing='true'] .leftPane,
	.root[data-theme-changing='true'] .centerPane,
	.root[data-theme-changing='true'] .rightPane,
	.rateLimitButton,
	:global(.hatacording-feed-enter-active),
	:global(.hatacording-feed-leave-active),
	:global(.hatacording-feed-move) {
		transition: none;
	}
}

/* ===== 旗鯖fork: 横開き折りたたみ端末(メインディスプレイ) =====
   右ペインをドロワーにせず、中央の隣に常時ドッキングさせる。
   ⚠️@container(max-width:1120px) 側の指定は一切変更しない。
     data-hata-foldable が付いたときだけ、詳細度で勝つ形で打ち消す
     (コンテナクエリは詳細度を足さないので .root[...] .rightPane が確実に勝つ)。
   ⚠️左ペインは 760px 未満なら従来どおりドロワーのまま。
     「画面はモバイル表示のまま」を守るため、ここでは触らない。 */
.root[data-hata-foldable='true'] .rightPane {
	position: static;
	width: auto;
	min-width: 240px;
	max-width: none;
	transform: none;
	box-shadow: none;
	z-index: 1;
}

/* ドッキング時は本来の縦リサイザーが出るので、ドロワー用の掴み手は隠す。 */
.root[data-hata-foldable='true'] .mobileRightResizer {
	display: none;
}

/* ⚠️「畳む」は .rightPaneCollapsed 側が !important を持っているので、
     上の min-width: 240px には勝つ。ここで追加指定はしない。 */
</style>

<!-- MkNote is intentionally left functionally intact. These selectors only
     neutralize its outer timeline card and size it for this page's chat shell. -->
<style lang="scss">
/* Popup menus and dialogs are teleported outside the page root. Mirror only the
   active HataSNSCordUI color surface on <html> while this route is mounted, so
   those controls remain readable and are restored on unmount. */
/* 動くタイムラインを背面ぼかしへ再合成すると Chrome で点滅するため、
   このUIを表示中のポップアップだけは不透明面で合成する。 */
html[data-hatacording-color-mode] :is(._modalBg, ._popup, ._popupAcrylic) {
	-webkit-backdrop-filter: none !important;
	backdrop-filter: none !important;
}

html[data-hatacording-color-mode] ._popupAcrylic {
	background: var(--MI_THEME-popup);
}

html[data-hatacording-color-mode='light'] {
	--MI_THEME-bg: #f3f5f8;
	--MI_THEME-panel: #ffffff;
	--MI_THEME-panelHighlight: #eef1f5;
	--MI_THEME-popup: #ffffff;
	--MI_THEME-fg: #1c2430;
	--MI_THEME-fgHighlighted: #0d1117;
	--MI_THEME-divider: #d6dce5;
	--MI_THEME-hover: rgb(16 24 40 / 7%);
	--MI_THEME-shadow: rgb(16 24 40 / 16%);
	color-scheme: light;
}

html[data-hatacording-color-mode='dark'] {
	--MI_THEME-bg: #0f1218;
	--MI_THEME-panel: #181c25;
	--MI_THEME-panelHighlight: #222837;
	--MI_THEME-popup: #202632;
	--MI_THEME-fg: #edf1f7;
	--MI_THEME-fgHighlighted: #ffffff;
	--MI_THEME-divider: #343b49;
	--MI_THEME-hover: rgb(255 255 255 / 8%);
	--MI_THEME-shadow: rgb(0 0 0 / 42%);
	color-scheme: dark;
}

html[data-hatacording-color-mode='dark'] ._popup,
html[data-hatacording-color-mode='dark'] ._popupAcrylic {
	--menuFg: #edf1f7;
	--menuHoverFg: #ffffff;
	--menuHoverBg: #303849;
	--menuActiveFg: #ffffff;
	--menuActiveBg: color-mix(in srgb, var(--MI_THEME-accent) 72%, #202632);
	--MI_THEME-fg: #edf1f7;
	--MI_THEME-fgHighlighted: #ffffff;
	--MI_THEME-fgOnAccent: #ffffff;
	--MI_THEME-divider: #515c70;
	--MI_THEME-accentedBg: #303849;
	--MI_THEME-hover: rgb(255 255 255 / 11%);
	--MI_THEME-buttonBg: #2b3342;
	--MI_THEME-buttonHoverBg: #394457;
	--MI_THEME-pageHeaderBg: #202632;

	border: 1px solid #3b4454;
	background: rgb(24 28 37 / 96%) !important;
	color: #edf1f7 !important;
	box-shadow: 0 16px 46px rgb(0 0 0 / 48%);
	-webkit-backdrop-filter: blur(18px) saturate(1.08);
	backdrop-filter: blur(18px) saturate(1.08);
}

html[data-hatacording-color-mode='dark'] ._popup :is(button, label, input, textarea, select),
html[data-hatacording-color-mode='dark'] ._popupAcrylic :is(button, label, input, textarea, select) {
	color: var(--menuFg, #edf1f7);
}

html[data-hatacording-color-mode='dark'] ._popup :is(button, input, textarea, select):disabled,
html[data-hatacording-color-mode='dark'] ._popupAcrylic :is(button, input, textarea, select):disabled {
	color: #bbc4d2;
	opacity: .78;
}

/* 汎用ポップアップの暗色文字指定より選択状態を優先する。
   data 属性を使い、CSS Modules の動的クラス解決には依存しない。 */
html[data-hatacording-color-mode='dark'] [data-hatacording-ui-scale-selector] button {
	border-color: #515c70 !important;
	background: transparent !important;
	color: #cbd4e2 !important;
	filter: none !important;
}

html[data-hatacording-color-mode='dark'] [data-hatacording-ui-scale-selector] button[data-active='true'] {
	border-color: color-mix(in srgb, var(--MI_THEME-accent) 78%, #78849a) !important;
	background: color-mix(in srgb, var(--MI_THEME-accent) 68%, #202632) !important;
	color: #fff !important;
}

/* HataSNSCordUI の暗色モードでは、プロフィール操作と絵文字ピッカーの
   sticky 見出しを明示的な暗色面へ固定する。汎用 _popup の文字色だけを
   反転すると、半透明見出しや小型操作ボタンだけが白地に白で潰れる。 */
html[data-hatacording-color-mode='dark'] [data-hatacording-profile-action],
html[data-hatacording-color-mode='dark'] [data-hatacording-user-popup-action] {
	background: #2b3342 !important;
	border-color: #566176 !important;
	color: #f4f7fb !important;
	filter: none !important;
	text-shadow: none !important;
}

html[data-hatacording-color-mode='dark'] [data-hatacording-profile-action]:is(:hover, :focus-visible),
html[data-hatacording-color-mode='dark'] [data-hatacording-user-popup-action]:is(:hover, :focus-visible) {
	background: #394457 !important;
	color: #fff !important;
}

html[data-hatacording-color-mode='dark'] [data-hatacording-profile-action] :is(i, svg),
html[data-hatacording-color-mode='dark'] [data-hatacording-user-popup-action] :is(i, svg) {
	color: inherit !important;
	stroke: currentColor;
}

html[data-hatacording-color-mode='dark'] [data-hatacording-emoji-picker] [data-hatacording-emoji-heading] {
	background: rgb(35 42 54 / 96%) !important;
	color: #edf1f7 !important;
	-webkit-backdrop-filter: blur(16px) saturate(1.08);
	backdrop-filter: blur(16px) saturate(1.08);
}

html[data-hatacording-color-mode='dark'] [data-hatacording-emoji-picker] [data-hatacording-emoji-heading]:hover {
	background: #303949 !important;
	color: #fff !important;
}

/* HataFeed の通知パネルは HataSNSCordUI の外へ Teleport される。暗色時に
   OS／テーマ側の button 配色へ再解釈されても反転しないよう、パネルと
   その操作を明示的な暗色面へ固定する。ほかのUIではこの規則は発火しない。 */
html[data-hatacording-color-mode='dark'] [data-hatacording-hatafeed-notifications] {
	--MI_THEME-bg: #141923;
	--MI_THEME-panel: #1c222e;
	--MI_THEME-divider: #465064;
	--MI_THEME-hover: rgb(255 255 255 / 9%);

	background: rgb(28 34 46 / 98%) !important;
	color: #edf1f7 !important;
	filter: none !important;
	color-scheme: dark;
}

html[data-hatacording-color-mode='dark'] [data-hatacording-hatafeed-notifications] button {
	color: inherit !important;
	filter: none !important;
	mix-blend-mode: normal !important;
	text-shadow: none !important;
}

html[data-hatacording-color-mode='dark'] [data-hatacording-hatafeed-notifications] button:is(:hover, :focus-visible) {
	color: #fff !important;
}

html[data-hatacording-theme-changing='true'],
html[data-hatacording-theme-changing='true'] body,
html[data-hatacording-theme-changing='true'] ._popup,
html[data-hatacording-theme-changing='true'] ._panel {
	transition: background-color .32s ease, color .32s ease, border-color .32s ease, box-shadow .32s ease;
}

[data-hatacording-note] > div {
	margin: 0 !important;
	background: transparent !important;
	font-size: .86rem !important;
	box-shadow: none !important;
	overflow: visible !important;
}

[data-hatacording-note] > div::after {
	display: none !important;
}

[data-hatacording-note] > div > article {
	padding: 6px 7px 3px !important;
	border: 0 !important;
	border-radius: 0 !important;
	background: transparent !important;
	box-shadow: none !important;
	outline: 0 !important;
	backdrop-filter: none !important;
}

[data-hatacording-note] > div > article > div,
[data-hatacording-note] > div > article > div > div,
[data-hatacording-note] [data-note-content],
[data-hatacording-note] [data-reactions-footer],
[data-hatacording-note] [data-reactions-footer] > div {
	border: 0 !important;
	background: transparent !important;
	box-shadow: none !important;
}

[data-hatacording-note] > div > article > div {
	padding: 0 !important;
	margin: 0 !important;
}

[data-hatacording-note] > div > article > div > div {
	padding: 0 !important;
}

[data-hatacording-note] > div > article > div > div > ._noSelect {
	display: none !important;
}

/* MkNote 内部の色帯は bubbleBody 基準で位置がずれるため隠す。
   HataSNSCordUIでは外側の会話吹き出しに専用色帯を描き、左辺へ密着させる。 */
[data-hatacording-note][data-channel='true'] > div > article > div > div > div:first-child {
	display: none !important;
}

[data-hatacording-note] [data-note-content] {
	padding: 5px 6px !important;
	margin-top: 2px !important;
}

[data-hatacording-note] [data-note-content]::before,
[data-hatacording-note] [data-note-content]::after {
	display: none !important;
}

[data-hatacording-note] [data-reactions-footer] {
	padding: 2px 6px 1px !important;
}

[data-hatacording-note] footer {
	margin: 2px 0 -4px !important;
}

[data-hatacording-note] footer button {
	padding: 5px !important;
	font-size: .92em !important;
}

[data-hatacording-note] footer button + button {
	margin-left: 1px !important;
}

[data-hatacording-note] article header {
	font-size: .9em !important;
}

[data-hatacording-note] article:focus-visible {
	outline: 2px solid color-mix(in srgb, var(--MI_THEME-accent) 52%, transparent) !important;
	outline-offset: 2px !important;
}
</style>
