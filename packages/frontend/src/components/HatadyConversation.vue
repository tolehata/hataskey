<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady 1g): 公開フィードの会話ページ(モーダル)。
  ルート投稿(学習ログ) + 返信(コメント・1段ネスト) + 返信コンポーザー。
  リアクションは hataskey 共通の絵文字ピッカー(HatadyReactions)を利用する(要件⑤)。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="760"
	:initialHeight="720"
	:canResize="true"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-messages"></i> {{ t('title') }}</template>

	<div class="hatady-scope" :data-hatady-theme="theme" :class="$style.body">
		<div v-if="loading" :class="$style.loading">{{ t('loading') }}</div>
		<template v-else-if="log">
			<!-- ルート投稿 -->
			<article :class="$style.root" :style="{ borderLeftColor: pal(log.subject).accent }">
				<div :class="$style.head">
					<MkAvatar :class="$style.avatar" :user="log.user" link/>
					<div :class="$style.who">
						<MkUserName :class="$style.name" :user="log.user"/>
						<div :class="$style.acct">@{{ log.user?.username }} · {{ fmtWhen(log.studiedAt) }}</div>
					</div>
					<HySubjectBadge :subject="log.subject"/>
				</div>
				<div :class="$style.title">{{ log.title }}</div>
				<div v-if="log.body" :class="$style.text">{{ log.body }}</div>
				<div v-if="log.book" :class="$style.bookChip">
					<HyBookCover :title="log.book.title" :author="log.book.author" :width="32"/>
					<div :class="$style.bookInfo">
						<div :class="$style.bookTitle">{{ log.book.title }}</div>
						<div :class="$style.bookMeta">{{ log.book.author }}<template v-if="log.pageTo"> · p.{{ log.pageTo }}</template><template v-if="log.book.progress != null"> / {{ log.book.progress }}%</template></div>
					</div>
					<span :class="$style.dur"><i class="ti ti-clock"></i> {{ fmtDuration(log.durationMinutes) }}</span>
				</div>
				<div :class="$style.foot">
					<span v-if="currentTag" :class="$style.tagChip" :style="{ background: currentTag.bg, color: currentTag.fg }"><i :class="['ti', currentTag.icon]"></i> {{ lang === 'en' ? currentTag.en : currentTag.ja }}</span>
					<HatadyReactions :class="$style.reactions" :target="{ logId: log.id }" :reactions="log.reactions ?? {}" :myReaction="log.myReaction ?? null"/>
				</div>
			</article>

			<!-- 返信ヘッダー -->
			<div :class="$style.repliesHead">
				<span :class="$style.repliesTitle"><i class="ti ti-messages"></i> {{ t('replies') }} {{ comments.length }}{{ lang === 'en' ? '' : '件' }}</span>
				<span :class="$style.repliesLine"></span>
			</div>

			<!-- 返信リスト -->
			<div :class="$style.replies">
				<div v-if="comments.length === 0" :class="$style.noReplies">{{ t('noReplies') }}</div>
				<div v-for="c in comments" :key="c.id" :class="[$style.reply, c.replyId && $style.replyNested]">
					<MkAvatar :class="$style.replyAvatar" :user="c.user" link/>
					<div :class="$style.bubble">
						<div :class="$style.replyHead">
							<MkUserName :class="$style.replyName" :user="c.user"/>
							<span :class="$style.replyTime">{{ fmtWhen(c.createdAt) }}</span>
						</div>
						<div :class="$style.replyText">{{ c.text }}</div>
						<div :class="$style.replyFoot">
							<HatadyReactions :target="{ commentId: c.id }" :reactions="c.reactions ?? {}" :myReaction="c.myReaction ?? null"/>
							<button :class="$style.replyBtn" @click="setReplyTo(c)"><i class="ti ti-arrow-back-up"></i> {{ t('reply') }}</button>
						</div>
					</div>
				</div>
			</div>
		</template>
		<div v-else :class="$style.loading">{{ t('notFound') }}</div>

		<!-- 返信コンポーザー -->
		<div v-if="log" :class="$style.composer">
			<div v-if="replyTo" :class="$style.replyingTo">
				<i class="ti ti-arrow-back-up"></i> <MkUserName :user="replyTo.user"/> {{ t('replyingTo') }}
				<button :class="$style.cancelReply" @click="replyTo = null"><i class="ti ti-x"></i></button>
			</div>
			<div :class="$style.composerRow">
				<MkAvatar v-if="$i" :class="$style.composerAvatar" :user="$i"/>
				<input v-model="draft" :class="$style.composerInput" :placeholder="t('placeholder')" @keydown.enter="onComposerKeydown">
				<button :class="$style.sendBtn" :disabled="sending || !draft.trim()" :aria-label="t('send')" :title="t('send')" @click="send"><i class="ti ti-send"></i><span :class="$style.sendLabel">{{ t('send') }}</span></button>
			</div>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { computed, ref, useTemplateRef, onMounted } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import HySubjectBadge from '@/components/HySubjectBadge.vue';
import HyBookCover from '@/components/HyBookCover.vue';
import HatadyReactions from '@/components/HatadyReactions.vue';
import { $i } from '@/i.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { hySubjectPalette, hyTag } from '@/utility/hatady.js';
import { hatadyTheme, hatadyLang } from '@/utility/hatady-prefs.js';

const props = defineProps<{ logId: string; initialLog?: any }>();
const emit = defineEmits<{ (ev: 'changed'): void; (ev: 'closed'): void }>();
const dialog = useTemplateRef('dialog');
const theme = hatadyTheme;
const lang = hatadyLang;

const log = ref<any>(props.initialLog ?? null);
const comments = ref<any[]>([]);
const loading = ref(true);
const draft = ref('');
const sending = ref(false);
const replyTo = ref<any>(null);
const currentTag = computed(() => log.value ? hyTag(log.value.tag) : null);

const DICT: Record<string, { ja: string; en: string }> = {
	title: { ja: '学びの投稿', en: 'Study post' },
	loading: { ja: '読み込み中…', en: 'Loading…' },
	notFound: { ja: '投稿が見つかりません。', en: 'Post not found.' },
	replies: { ja: '返信', en: 'Replies' },
	noReplies: { ja: 'まだ返信がありません。最初の返信を書きましょう。', en: 'No replies yet. Be the first to reply.' },
	reply: { ja: '返信', en: 'Reply' },
	replyingTo: { ja: 'に返信', en: '' },
	placeholder: { ja: '返信を書く…', en: 'Write a reply…' },
	send: { ja: '送信', en: 'Send' },
};
function t(key: string): string { return DICT[key]?.[lang.value === 'en' ? 'en' : 'ja'] ?? key; }
function pal(s: string) { return hySubjectPalette(s); }

function fmtDuration(min: number): string {
	if (min < 60) return lang.value === 'en' ? `${min}m` : `${min}分`;
	const h = Math.floor(min / 60); const m = min % 60;
	return lang.value === 'en' ? `${h}h ${m}m` : `${h}時間${m}分`;
}
function fmtWhen(iso: string): string {
	const d = new Date(iso);
	const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
	const en = lang.value === 'en';
	if (diffMin < 1) return en ? 'now' : 'たった今';
	if (diffMin < 60) return en ? `${diffMin}m ago` : `${diffMin}分前`;
	const diffH = Math.floor(diffMin / 60);
	if (diffH < 24) return en ? `${diffH}h ago` : `${diffH}時間前`;
	const diffD = Math.floor(diffH / 24);
	if (diffD < 7) return en ? `${diffD}d ago` : `${diffD}日前`;
	return en ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `${d.getMonth() + 1}月${d.getDate()}日`;
}

async function reload() {
	loading.value = true;
	try {
		const [l, cs] = await Promise.all([
			misskeyApi('hata/hatady/logs/show', { logId: props.logId }).catch(() => null),
			misskeyApi('hata/hatady/comments', { logId: props.logId }).catch(() => []),
		]);
		if (l) log.value = l;
		comments.value = cs as any[];
	} finally {
		loading.value = false;
	}
}

function setReplyTo(c: any) { replyTo.value = c; }

function onComposerKeydown(ev: KeyboardEvent) {
	if (ev.isComposing) return;
	void send();
}

async function send() {
	if (!draft.value.trim() || sending.value) return;
	sending.value = true;
	try {
		const payload = {
			logId: props.logId,
			text: draft.value.trim(),
			replyId: replyTo.value?.id ?? undefined,
		};
		const c = await misskeyApi('hata/hatady/comments/create', payload);
		comments.value.push(c);
		if (log.value) log.value.commentsCount = (log.value.commentsCount ?? 0) + 1;
		draft.value = '';
		replyTo.value = null;
		emit('changed');
	} finally {
		sending.value = false;
	}
}

onMounted(reload);
</script>

<style lang="scss" module>
.body {
	padding: 20px 22px;
	background: var(--hy-bg);
	color: var(--hy-body);
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
	min-height: 100%;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
}
.loading { opacity: .6; padding: 30px 0; text-align: center; }

/* ルート投稿 */
.root { background: var(--hy-surface); border: 1px solid var(--hy-border); border-left: 4px solid; border-radius: 12px; padding: 17px 18px; box-shadow: 0 1px 3px rgba(96,70,35,.06); margin-bottom: 18px; }
.head { display: flex; align-items: center; gap: 10px; margin-bottom: 11px; }
.avatar { width: 40px; height: 40px; flex-shrink: 0; }
.who { min-width: 0; flex: 1; }
.name { font-family: var(--hy-heading); font-weight: 700; font-size: 14.5px; color: var(--hy-ink); }
.acct { font-size: 11.5px; color: var(--hy-body); opacity: .8; }
.title { font-size: 16px; font-weight: 700; color: var(--hy-ink); line-height: 1.5; margin-bottom: 10px; }
.text { font-size: 13.5px; line-height: 1.8; color: var(--hy-body); margin-bottom: 13px; word-break: break-word; white-space: pre-wrap; }
.bookChip { display: flex; gap: 11px; align-items: center; background: var(--hy-surface-2); border-radius: 10px; padding: 9px 11px; margin-bottom: 13px; }
.bookInfo { flex: 1; min-width: 0; }
.bookTitle { font-family: var(--hy-serif); font-weight: 600; font-size: 13px; color: var(--hy-ink); }
.bookMeta { font-size: 11px; color: var(--hy-muted); }
.dur { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--hy-body); opacity: .85; }
.foot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tagChip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 999px; }
.reactions { margin-left: auto; }

/* 返信 */
.repliesHead { display: flex; align-items: center; gap: 9px; margin-bottom: 13px; }
.repliesTitle { font-family: var(--hy-heading); font-weight: 700; font-size: 13px; color: var(--hy-body); }
.repliesTitle i { color: var(--hy-accent); }
.repliesLine { flex: 1; height: 1px; background: var(--hy-border); }
.replies { display: flex; flex-direction: column; gap: 12px; }
.noReplies { font-size: 12.5px; color: var(--hy-muted); padding: 8px 0; }
.reply { display: flex; gap: 11px; }
.replyNested { margin-left: 44px; }
.replyAvatar { width: 34px; height: 34px; flex-shrink: 0; }
.bubble { flex: 1; min-width: 0; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 12px; padding: 12px 14px; }
.replyHead { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
.replyName { font-family: var(--hy-heading); font-weight: 700; font-size: 13px; color: var(--hy-ink); }
.replyTime { font-size: 11px; color: var(--hy-muted); }
.replyText { font-size: 13px; line-height: 1.7; color: var(--hy-body); word-break: break-word; white-space: pre-wrap; }
.replyFoot { display: flex; align-items: center; gap: 12px; margin-top: 9px; }
.replyBtn { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; color: var(--hy-muted); font-size: 11.5px; cursor: pointer; }
.replyBtn:hover { color: var(--hy-accent); }

/* コンポーザー */
.composer { margin-top: auto; padding-top: 14px; }
.replyingTo { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--hy-muted); margin-bottom: 8px; }
.cancelReply { background: none; border: none; color: var(--hy-muted); cursor: pointer; margin-left: 4px; }
.composerRow { display: flex; gap: 11px; align-items: center; }
.composerAvatar { width: 34px; height: 34px; flex-shrink: 0; }
.composerInput {
	flex: 1; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 999px;
	padding: 10px 16px; font-size: 13px; color: var(--hy-ink); font-family: inherit; outline: none;
}
.composerInput:focus { border-color: var(--hy-accent); }
.composerInput::placeholder { color: var(--hy-muted); }
.sendBtn {
	display: inline-flex; align-items: center; gap: 5px;
	background: linear-gradient(90deg, #e0955a, #d9824a); color: #fff; border: none; border-radius: 999px;
	padding: 9px 18px; font-size: 13px; font-weight: 700; font-family: var(--hy-heading); cursor: pointer;
	box-shadow: 0 3px 9px rgba(217,130,74,.4);
	flex-shrink: 0;
}
.sendBtn:disabled { opacity: .45; cursor: not-allowed; }
.sendLabel { white-space: nowrap; }

/* 旗鯖fork: モバイル(狭幅)では送信ボタンを丸いアイコンのみにして、
   「送信」テキストが縦に折れて崩れるのを防ぐ。 */
@media (max-width: 500px) {
	.sendBtn { gap: 0; width: 42px; height: 42px; padding: 0; justify-content: center; }
	.sendBtn > i { font-size: 17px; }
	.sendLabel { display: none; }
}
</style>
