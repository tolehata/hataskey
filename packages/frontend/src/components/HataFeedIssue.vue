<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: HataFeed の Issue 詳細(会話・賛同・コメントリアクション・スタッフ操作)。
-->
<template>
<div :class="$style.root">
	<button :class="$style.back" @click="$emit('back')"><i class="ti ti-arrow-left"></i> 一覧へ</button>

	<div v-if="loading" :class="$style.center">読み込み中…</div>
	<div v-else-if="loadError" :class="$style.errorBox">
		<i class="ti ti-lock-off" :class="$style.errorIcon"></i>
		<div :class="$style.errorTitle">このイシューは表示できません</div>
		<div :class="$style.errorSub">権限がない（セキュリティ対応など）か、すでに削除された可能性があります。</div>
		<MkButton rounded primary @click="$emit('back')"><i class="ti ti-arrow-left"></i> 一覧へ戻る</MkButton>
	</div>
	<template v-else-if="issue">
		<!-- ヘッダ -->
		<div :class="$style.head">
			<div :class="$style.badges">
				<span class="hfBadge" :data-cat="issue.category">{{ categoryLabel[issue.category] ?? issue.category }}</span>
				<span class="hfBadge" :data-status="issue.status">{{ statusLabel[issue.status] ?? issue.status }}</span>
				<span v-if="issue.pinned" :class="$style.pin"><i class="ti ti-pin"></i></span>
				<span v-if="issue.closed" :class="$style.closedTag"><i class="ti ti-lock"></i> クローズ</span>
			</div>
			<div :class="$style.titleRow">
				<h2 :class="$style.title"><span :class="$style.issueNo">#{{ issue.number }}</span> {{ issue.title }}</h2>
				<!-- 旗鯖fork: 会話に参加中の人のアイコンをタイトル横に並べる -->
				<div v-if="participants.length" :class="$style.participants" title="会話に参加中">
					<MkAvatar v-for="p in participants" :key="p.id" :class="$style.partAvatar" :user="p"/>
				</div>
			</div>
			<div :class="$style.sub">
				<MkAvatar v-if="issue.createdBy" :class="$style.avatarSm" :user="issue.createdBy"/>
				<MkUserName v-if="issue.createdBy" :user="issue.createdBy"/>
				<MkTime :time="issue.createdAt"/>
				<!-- 旗鯖fork: この Issue の対処を委任されたユーザー(委任者) -->
				<template v-if="moderators.length">
					<span :class="$style.modSep">・</span>
					<i class="ti ti-shield-check" :class="$style.modIcon"></i>
					<span :class="$style.modLabel">対処担当:</span>
					<span v-for="m in moderators" :key="m.id" :class="$style.modUser">
						<MkAvatar :class="$style.avatarSm" :user="m"/><MkUserName :user="m"/>
					</span>
				</template>
			</div>

			<div v-if="issue.description" :class="$style.desc"><Mfm :text="linkifyRefs(issue.description)"/></div>

			<MkMediaList v-if="issue.files && issue.files.length" :class="$style.media" :mediaList="issue.files"/>

			<!-- 旗鯖fork: 提出されたコード -->
			<div v-if="issue.code" :class="$style.codeBlock">
				<div :class="$style.codeHead"><i class="ti ti-code"></i> 提出されたコード</div>
				<pre :class="$style.codePre"><code>{{ issue.code }}</code></pre>
			</div>

			<div :class="$style.actions">
				<MkButton :class="$style.agreeBtn" rounded :primary="issue.isAgreed" @click="toggleAgree">
					<i :class="issue.isAgreed ? 'ti ti-heart-filled' : 'ti ti-heart'"></i> {{ issue.agreementsCount }}
				</MkButton>
			</div>
		</div>

		<!-- スタッフ操作 -->
		<div v-if="canManage" :class="$style.staff">
			<div :class="$style.staffHead"><i class="ti ti-shield"></i> スタッフ操作</div>
			<div :class="$style.staffRow">
				<select v-model="editStatus" :class="$style.select" @change="changeStatus">
					<option v-for="s in statusKeys" :key="s" :value="s">{{ statusLabel[s] }}</option>
				</select>
				<select v-model="editPriority" :class="$style.select" @change="changePriority">
					<option value="low">優先度: 低</option>
					<option value="normal">優先度: 通常</option>
					<option value="high">優先度: 高</option>
				</select>
				<MkButton rounded small @click="togglePin">{{ issue.pinned ? 'ピン解除' : 'ピン留め' }}</MkButton>
				<MkButton rounded small :danger="!issue.closed" :primary="issue.closed" @click="toggleClose">
					{{ issue.closed ? '再オープン' : 'クローズ' }}
				</MkButton>
				<MkButton v-if="isAdmin" rounded small @click="grantModerator"><i class="ti ti-user-plus"></i> 対処権限を付与</MkButton>
				<MkButton v-if="isStaff" rounded small danger @click="removeIssue"><i class="ti ti-trash"></i> 削除</MkButton>
			</div>
		</div>

		<!-- 会話 -->
		<div :class="$style.convo">
			<div :class="$style.convoHead"><i class="ti ti-messages"></i> 会話</div>
			<div v-if="comments.length === 0" :class="$style.emptyMini">まだコメントはありません。</div>
			<div v-for="c in comments" :key="c.id" :ref="el => setCommentRef(c.id, el)" :class="[$style.comment, c.mark === 'important' && $style.commentImportant, flashCommentId === c.id && $style.commentFlash]">
				<MkAvatar :class="$style.avatar" :user="c.user"/>
				<div :class="$style.cBody">
					<div :class="$style.cHead">
						<MkUserName :user="c.user"/>
						<MkTime :class="$style.cTime" :time="c.createdAt"/>
						<span v-if="c.mark === 'important'" :class="[$style.cMark, $style.cMarkImportant]"><i class="ti ti-alert-triangle-filled"></i> 重要</span>
						<span v-if="c.mark === 'question'" :class="[$style.cMark, $style.cMarkQuestion]"><i class="ti ti-help-circle-filled"></i> ?</span>
						<button :class="$style.cMenuBtn" @click="openCommentMenu(c, $event)"><i class="ti ti-dots"></i></button>
					</div>
					<!-- 旗鯖fork: 返信先の表示 -->
					<button v-if="c.replyTo" :class="$style.replyRef" @click="scrollToComment(c.replyTo.id)">
						<i class="ti ti-arrow-back-up"></i>
						<MkUserName :class="$style.replyRefUser" :user="c.replyTo.user"/>
						<span :class="$style.replyRefText">{{ c.replyTo.text }}</span>
					</button>
					<div :class="$style.cText"><Mfm :text="linkifyRefs(c.text)" :author="c.user"/></div>
					<!-- 旗鯖fork: 会話メディアは小さくサムネイル表示(クリックでMisskeyのメディアプレビュー) -->
					<MkMediaList v-if="c.files && c.files.length" :class="$style.cMedia" :mediaList="c.files"/>
					<div :class="$style.reactions">
						<button
							v-for="(count, emoji) in c.reactions"
							:key="emoji"
							:class="[$style.reaction, c.myReaction === emoji && $style.reactionMine]"
							@click="react(c, emoji)"
						>
							<MkEmoji :emoji="emoji"/> <span>{{ count }}</span>
						</button>
						<button :class="$style.reactionAdd" @click="openReactionPicker($event, c)"><i class="ti ti-mood-plus"></i></button>
					</div>
				</div>
			</div>

			<!-- コメント投稿 -->
			<div v-if="issue.closed" :class="$style.closedNotice"><i class="ti ti-lock"></i> このイシューはクローズ（受付終了）されています。コメントはできません。</div>
			<div v-else>
				<div v-if="commentFiles.length" :class="$style.cFileGrid">
					<div v-for="f in commentFiles" :key="f.id" :class="$style.cFileThumb">
						<img :src="f.thumbnailUrl ?? f.url" :alt="f.name"/>
						<button :class="$style.cFileDel" @click="commentFiles = commentFiles.filter(x => x.id !== f.id)"><i class="ti ti-x"></i></button>
					</div>
				</div>
				<!-- 旗鯖fork: 返信先バー -->
				<div v-if="replyTarget" :class="$style.replyBar">
					<i class="ti ti-arrow-back-up"></i>
					<span>返信先:</span><MkUserName :user="replyTarget.user"/>
					<span :class="$style.replyBarText">{{ (replyTarget.text ?? '').slice(0, 40) }}</span>
					<button :class="$style.replyBarCancel" @click="replyTarget = null"><i class="ti ti-x"></i></button>
				</div>
				<div :class="$style.composer">
					<button :class="$style.attachBtn" title="画像を添付" @click="attachCommentFiles"><i class="ti ti-photo-plus"></i></button>
					<textarea v-model="newComment" :class="$style.textarea" :placeholder="replyTarget ? '返信を書く…' : 'コメントを書く…（#番号 でイシューを参照できます）'" rows="2"></textarea>
					<MkButton :class="$style.sendBtn" rounded primary :disabled="!newComment.trim() || sending" @click="sendComment"><i class="ti ti-send"></i></MkButton>
				</div>
			</div>
		</div>
	</template>
</div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { url } from '@@/js/config.js';
import MkButton from '@/components/MkButton.vue';
import MkMediaList from '@/components/MkMediaList.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { chooseDriveFile } from '@/utility/drive.js';
import { $i } from '@/i.js';
import { reactionPicker } from '@/utility/reaction-picker.js';
import { categoryLabel, statusLabel, statusKeys } from '@/utility/hatafeed.js';

const props = defineProps<{ issueId: string; isStaff: boolean }>();
const emit = defineEmits<{ (ev: 'back'): void }>();

const loading = ref(true);
const loadError = ref(false);
const issue = ref<any>(null);
const canManage = ref(false);
const moderators = ref<any[]>([]);
const participants = ref<any[]>([]);
const comments = ref<any[]>([]);
const newComment = ref('');
const commentFiles = ref<any[]>([]);
const sending = ref(false);
// 旗鯖fork: 会話の返信先・スクロール用。
const replyTarget = ref<any>(null);
const flashCommentId = ref<string | null>(null);
const commentRefs = new Map<string, HTMLElement>();
function setCommentRef(id: string, el: any) { if (el) commentRefs.set(id, el as HTMLElement); else commentRefs.delete(id); }
const editStatus = ref('open');
const editPriority = ref('normal');

// 「#番号」を該当イシューへのリンク(MFM)に変換してから Mfm で描画する(数字のみリンク化=安全)。
// MFMは相対パスをリンク化しないため、フルURL(同一オリジン)にする→Misskeyが内部遷移で開く。
function linkifyRefs(text: string): string {
	return text.replace(/#(\d+)/g, `[#$1](${url}/hatafeed/n/$1)`);
}

async function attachCommentFiles() {
	const chosen = await chooseDriveFile({ multiple: true }).catch(() => []);
	for (const f of chosen) {
		if (!commentFiles.value.some(x => x.id === f.id)) commentFiles.value.push(f);
	}
}

const isAdmin = ($i as any)?.isAdmin === true;

async function load() {
	loading.value = true;
	loadError.value = false;
	try {
		const res = await misskeyApi('hata/feedback/issues/show', { issueId: props.issueId });
		issue.value = res.issue;
		canManage.value = res.canManage;
		moderators.value = res.moderators ?? [];
		participants.value = res.participants ?? [];
		editStatus.value = res.issue.status;
		editPriority.value = res.issue.priority ?? 'normal';
		comments.value = await misskeyApi('hata/feedback/comments', { issueId: props.issueId, limit: 100 });
	} catch (err) {
		// 旗鯖fork(#27): 閲覧権限が無い(セキュリティ対応など)・削除済み等で取得に失敗したら、
		//   空白ページにせず案内を出す。通知から飛んだ際の「空白に遷移」を防ぐ。
		issue.value = null;
		loadError.value = true;
	} finally {
		loading.value = false;
	}
}

async function toggleAgree() {
	const res = await misskeyApi('hata/feedback/agree', { issueId: props.issueId });
	issue.value.isAgreed = res.isAgreed;
	issue.value.agreementsCount += res.isAgreed ? 1 : -1;
}

async function sendComment() {
	if (!newComment.value.trim()) return;
	sending.value = true;
	try {
		const c = await misskeyApi('hata/feedback/comments/create', { issueId: props.issueId, text: newComment.value.trim(), fileIds: commentFiles.value.map(f => f.id), replyToId: replyTarget.value?.id ?? null });
		comments.value.push(c);
		newComment.value = '';
		commentFiles.value = [];
		replyTarget.value = null;
		// 自分を会話参加者として即時反映。
		if ($i && !participants.value.some(p => p.id === $i.id)) participants.value.push($i);
	} finally {
		sending.value = false;
	}
}

// 旗鯖fork: 会話の各種操作
function canManageComment(c: any): boolean {
	return canManage.value || ($i != null && c.user?.id === $i.id);
}

function scrollToComment(id: string) {
	const el = commentRefs.get(id);
	if (!el) return;
	el.scrollIntoView({ behavior: 'smooth', block: 'center' });
	flashCommentId.value = id;
	window.setTimeout(() => { if (flashCommentId.value === id) flashCommentId.value = null; }, 1500);
}

function startReply(c: any) {
	replyTarget.value = { id: c.id, user: c.user, text: c.text };
}

async function setMark(c: any, mark: 'important' | 'question' | null) {
	const updated = await misskeyApi('hata/feedback/comments/mark', { commentId: c.id, mark });
	c.mark = updated.mark;
}

async function removeComment(c: any) {
	const { canceled } = await os.confirm({ type: 'warning', text: 'このコメントを削除しますか？' });
	if (canceled) return;
	await os.apiWithDialog('hata/feedback/comments/delete', { commentId: c.id });
	comments.value = comments.value.filter(x => x.id !== c.id);
	if (issue.value && typeof issue.value.commentsCount === 'number') issue.value.commentsCount = Math.max(0, issue.value.commentsCount - 1);
}

function copyComment(c: any) {
	navigator.clipboard?.writeText(c.text ?? '');
	os.success();
}

function openCommentMenu(c: any, ev: MouseEvent) {
	const items: any[] = [
		{ text: '返信', icon: 'ti ti-arrow-back-up', action: () => startReply(c) },
		{ text: '内容をコピー', icon: 'ti ti-copy', action: () => copyComment(c) },
	];
	if (canManageComment(c)) {
		items.push({ type: 'divider' });
		items.push(c.mark === 'important'
			? { text: '重要マークを外す', icon: 'ti ti-alert-triangle', action: () => setMark(c, null) }
			: { text: '重要としてマーク', icon: 'ti ti-alert-triangle-filled', action: () => setMark(c, 'important') });
		items.push(c.mark === 'question'
			? { text: '?マークを外す', icon: 'ti ti-help-circle', action: () => setMark(c, null) }
			: { text: '?としてマーク', icon: 'ti ti-help-circle-filled', action: () => setMark(c, 'question') });
		items.push({ type: 'divider' });
		items.push({ text: '削除', icon: 'ti ti-trash', danger: true, action: () => removeComment(c) });
	}
	os.popupMenu(items, (ev.currentTarget ?? ev.target) as HTMLElement);
}

async function react(c: any, emoji: string) {
	const res = await misskeyApi('hata/feedback/comments/react', { commentId: c.id, reaction: emoji });
	// 楽観更新
	if (!res.reacted) {
		c.reactions[emoji] = (c.reactions[emoji] ?? 1) - 1;
		if (c.reactions[emoji] <= 0) delete c.reactions[emoji];
		c.myReaction = null;
	} else {
		if (c.myReaction && c.myReaction !== emoji) {
			c.reactions[c.myReaction] = (c.reactions[c.myReaction] ?? 1) - 1;
			if (c.reactions[c.myReaction] <= 0) delete c.reactions[c.myReaction];
		}
		c.reactions[emoji] = (c.reactions[emoji] ?? 0) + 1;
		c.myReaction = emoji;
	}
}

function openReactionPicker(ev: MouseEvent, c: any) {
	reactionPicker.show(ev.currentTarget as HTMLElement, null, (reaction) => {
		react(c, reaction);
	});
}

async function changeStatus() {
	await misskeyApi('hata/feedback/issues/update', { issueId: props.issueId, status: editStatus.value });
	issue.value.status = editStatus.value;
}

async function changePriority() {
	await misskeyApi('hata/feedback/issues/update', { issueId: props.issueId, priority: editPriority.value });
	issue.value.priority = editPriority.value;
}

async function togglePin() {
	const next = !issue.value.pinned;
	await misskeyApi('hata/feedback/issues/update', { issueId: props.issueId, pinned: next });
	issue.value.pinned = next;
}

async function toggleClose() {
	const next = !issue.value.closed;
	await misskeyApi('hata/feedback/issues/close', { issueId: props.issueId, close: next });
	issue.value.closed = next;
}

async function grantModerator() {
	const user = await os.selectUser({ includeSelf: false });
	if (!user) return;
	await misskeyApi('hata/feedback/moderators/grant', { issueId: props.issueId, userId: user.id });
	os.success();
}

async function removeIssue() {
	const { canceled } = await os.confirm({ type: 'warning', text: 'このイシューを削除しますか？ 会話・賛同もすべて削除され、元に戻せません。' });
	if (canceled) return;
	await misskeyApi('hata/feedback/issues/delete', { issueId: props.issueId });
	os.success();
	emit('back');
}

onMounted(load);
</script>

<style lang="scss" module>
.root { display: flex; flex-direction: column; gap: 16px; }
.back { align-self: flex-start; display: inline-flex; align-items: center; gap: 4px; background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); border-radius: 999px; color: var(--MI_THEME-fg); cursor: pointer; font-size: .85em; padding: 5px 14px; transition: all .12s; }
.back:hover { border-color: var(--MI_THEME-accent); color: var(--MI_THEME-accent); }
.center { text-align: center; padding: 40px 0; opacity: .6; }
.emptyMini { opacity: .55; font-size: .9em; padding: 12px 4px; }
/* 旗鯖fork(#27): 閲覧不可/削除済みの案内 */
.errorBox { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; padding: 48px 20px; background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); border-radius: 16px; }
.errorIcon { font-size: 2.6rem; color: var(--MI_THEME-warn); opacity: .8; }
.errorTitle { font-weight: 800; font-size: 1.1rem; }
.errorSub { font-size: .85em; opacity: .7; margin-bottom: 6px; max-width: 360px; }

.head { position: relative; background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); border-radius: 18px; padding: 20px 22px; box-shadow: 0 2px 16px rgba(0,0,0,.04); }
.badges { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.titleRow { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.title { margin: 12px 0 10px; font-size: 1.5rem; font-weight: 800; line-height: 1.35; letter-spacing: .01em; flex: 1; min-width: 0; word-break: break-word; }
.issueNo { display: inline-block; background: var(--MI_THEME-accentedBg); color: var(--MI_THEME-accent); font-weight: 800; font-size: .72em; padding: 2px 9px; border-radius: 999px; margin-right: 8px; vertical-align: middle; }
.participants { display: flex; align-items: center; }
.partAvatar { width: 26px; height: 26px; margin-left: -7px; border: 2px solid var(--MI_THEME-panel); border-radius: 999px; }
.partAvatar:first-child { margin-left: 0; }
.modSep { opacity: .5; }
.modIcon { color: var(--MI_THEME-accent); }
.modLabel { opacity: .8; }
.modUser { display: inline-flex; align-items: center; gap: 4px; }
.sub { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; opacity: .75; font-size: .82em; }
.avatarSm { width: 22px; height: 22px; border-radius: 999px; }
.desc { margin-top: 16px; line-height: 1.75; padding: 14px 16px; background: var(--MI_THEME-bg); border-radius: 12px; word-break: break-word; }
.files { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.media { margin-top: 12px; }

/* 旗鯖fork: 提出コード表示 */
.codeBlock { margin-top: 14px; border: 1px solid var(--MI_THEME-divider); border-radius: 10px; overflow: hidden; }
.codeHead { font-size: .8em; opacity: .8; padding: 6px 12px; background: var(--MI_THEME-bg); border-bottom: 1px solid var(--MI_THEME-divider); display: flex; align-items: center; gap: 6px; }
.codePre { margin: 0; padding: 12px; overflow-x: auto; font-family: Consolas, Menlo, monospace; font-size: .82em; line-height: 1.5; background: var(--MI_THEME-panel); white-space: pre; }
.fileImg { max-width: 160px; max-height: 160px; border-radius: 10px; border: 1px solid var(--MI_THEME-divider); }
.actions { margin-top: 18px; display: flex; align-items: center; gap: 10px; }
.agreeBtn { min-width: 0; font-weight: 700; }

.staff { background: color-mix(in srgb, var(--MI_THEME-accent) 6%, var(--MI_THEME-panel)); border: 1px solid var(--MI_THEME-divider); border-radius: 14px; padding: 14px 18px; }
.staffHead { font-weight: 700; margin-bottom: 10px; font-size: .9em; }
.staffRow { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.select { background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 8px; padding: 6px 10px; color: inherit; }

.convo { background: var(--MI_THEME-panel); border: 1px solid var(--MI_THEME-divider); border-radius: 16px; padding: 18px 20px; }
.convoHead { font-weight: 700; margin-bottom: 14px; }
.comment { display: flex; gap: 10px; padding: 10px 0; border-top: 1px solid var(--MI_THEME-divider); border-radius: 8px; transition: background .4s; }
.comment:first-of-type { border-top: none; }
/* 旗鯖fork: 会話のマーク/返信/メニュー */
.commentImportant { background: color-mix(in srgb, var(--MI_THEME-warn) 8%, transparent); }
.commentFlash { background: color-mix(in srgb, var(--MI_THEME-accent) 16%, transparent); }
.cMark { display: inline-flex; align-items: center; gap: 3px; font-size: .72em; font-weight: 700; padding: 1px 7px; border-radius: 999px; }
.cMarkImportant { background: var(--MI_THEME-warn); color: #fff; }
.cMarkQuestion { background: var(--MI_THEME-accentedBg); color: var(--MI_THEME-accent); }
.cMenuBtn { margin-left: auto; background: none; border: none; color: inherit; opacity: .5; cursor: pointer; padding: 2px 6px; border-radius: 6px; }
.cMenuBtn:hover { opacity: 1; background: var(--MI_THEME-buttonBg); }
.replyRef { display: inline-flex; align-items: center; gap: 5px; max-width: 100%; margin-top: 4px; padding: 3px 10px; background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 8px; font-size: .8em; color: inherit; cursor: pointer; opacity: .85; }
.replyRef:hover { border-color: var(--MI_THEME-accent); }
.replyRefUser { font-weight: 700; flex-shrink: 0; }
.replyRefText { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: .7; }
.replyBar { display: flex; align-items: center; gap: 6px; margin-top: 12px; padding: 6px 12px; background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 8px; font-size: .82em; }
.replyBarText { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: .65; flex: 1; }
.replyBarCancel { background: none; border: none; color: inherit; opacity: .6; cursor: pointer; }
.avatar { width: 38px; height: 38px; flex-shrink: 0; }
.cBody { min-width: 0; flex: 1; }
.cHead { display: flex; align-items: center; gap: 8px; }
.cTime { opacity: .55; font-size: .78em; }
.cText { margin-top: 4px; line-height: 1.6; }
/* 旗鯖fork: 会話メディアは小さめサムネイル(クリックでPhotoSwipeの全画面プレビュー)。
   MkMediaListはアスペクト比で高さが決まるため、幅だけ抑えて小さくする(高さは追従)。 */
.cMedia { margin-top: 8px; max-width: 240px; }
.reactions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.reaction { display: inline-flex; align-items: center; gap: 4px; background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 999px; padding: 2px 10px; cursor: pointer; font-size: .85em; color: inherit; }
.reactionMine { background: color-mix(in srgb, var(--MI_THEME-accent) 18%, transparent); border-color: var(--MI_THEME-accent); }
.reactionAdd { background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 999px; padding: 2px 10px; cursor: pointer; color: inherit; opacity: .7; }

.composer { display: flex; gap: 8px; margin-top: 16px; align-items: flex-end; }
.attachBtn { flex-shrink: 0; width: 38px; height: 38px; border-radius: 999px; border: 1px solid var(--MI_THEME-divider); background: var(--MI_THEME-bg); color: inherit; cursor: pointer; font-size: 1.1rem; }
.attachBtn:hover { border-color: var(--MI_THEME-accent); color: var(--MI_THEME-accent); }
.textarea { flex: 1; background: var(--MI_THEME-bg); border: 1px solid var(--MI_THEME-divider); border-radius: 12px; padding: 10px 12px; color: inherit; resize: vertical; font-family: inherit; }
.sendBtn { min-width: 0; }
.closedNotice { display: flex; align-items: center; gap: 6px; margin-top: 16px; padding: 12px 14px; border-radius: 12px; background: var(--MI_THEME-bg); opacity: .7; font-size: .88em; }
.cFileGrid { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
.cFileThumb { position: relative; width: 64px; height: 64px; border-radius: 10px; overflow: hidden; border: 1px solid var(--MI_THEME-divider); }
.cFileThumb img { width: 100%; height: 100%; object-fit: cover; }
.cFileDel { position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,.5); color: #fff; border: none; border-radius: 999px; width: 18px; height: 18px; cursor: pointer; }

.pin { color: var(--MI_THEME-accent); }
.closedTag { font-size: .72em; opacity: .6; }

/* 旗鯖fork: モバイル最適化 */
@media (max-width: 500px) {
	.head { padding: 16px 16px; border-radius: 14px; }
	.title { font-size: 1.25rem; margin: 10px 0 8px; }
	.desc { padding: 12px 13px; }
	.convo { padding: 14px 14px; border-radius: 14px; }
	.staff { padding: 12px 14px; }
	.staffRow { gap: 6px; }
	.staffRow .select { flex: 1 1 calc(50% - 6px); min-width: 0; }
	.composer { gap: 6px; }
	.avatar { width: 34px; height: 34px; }
}
</style>

<style lang="scss" scoped>
/* カテゴリ/ステータスの色は動的値のため data 属性で当てる(動的 $style[] はビルドで解決されないため)。 */
.hfBadge { font-size: .72em; padding: 2px 9px; border-radius: 999px; font-weight: 600; background: var(--MI_THEME-buttonBg); }
.hfBadge[data-cat="bug"] { background: #ffe1e1; color: #c0392b; }
.hfBadge[data-cat="improvement"] { background: #e1fff0; color: #1f8a5b; }
.hfBadge[data-cat="security"] { background: #ffe9d6; color: #c0612b; }
.hfBadge[data-cat="featureRequest"] { background: #e1efff; color: #2b6fc0; }
.hfBadge[data-cat="adoptionRequest"] { background: #e7e1ff; color: #5a2bc0; }
.hfBadge[data-cat="betaFeature"] { background: #d9f3f0; color: #1f7a86; }
.hfBadge[data-cat="unresolved"] { background: #f0f0f0; color: #666; }
.hfBadge[data-cat="other"] { background: #f0f0f0; color: #666; }
.hfBadge[data-status="open"] { background: #e1efff; color: #2b6fc0; }
.hfBadge[data-status="planned"] { background: #fff6d6; color: #9a7b1f; }
.hfBadge[data-status="inProgress"] { background: #fff0d6; color: #b6791f; }
.hfBadge[data-status="resolved"] { background: #e1fff0; color: #1f8a5b; }
.hfBadge[data-status="wontfix"] { background: #f0f0f0; color: #777; }
.hfBadge[data-status="unknown"] { background: #f0f0f0; color: #999; }
.hfBadge[data-status="closed"] { background: #e9e4ef; color: #6a5a86; }
</style>
