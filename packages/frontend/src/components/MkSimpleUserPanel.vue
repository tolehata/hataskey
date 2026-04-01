<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="user">
    <!-- ポップアップ時: 透明オーバーレイ（外クリックで閉じる） -->
    <div v-if="!inline" :class="$style.overlay" @click="emit('close')"></div>
    <div :class="[$style.root, { [$style.isPopup]: !inline }]" ref="rootEl" :style="popupStyle" @mousedown="onDragStart">
    <div :class="$style.panel">
        <!-- ヘッダー画像 -->
        <div :class="$style.banner">
            <img v-if="user.bannerUrl" :src="user.bannerUrl" :class="$style.bannerImg" />
            <div :class="$style.bannerOverlay"></div>
            <div :class="$style.headerBar">
                <button :class="$style.closeBtn" @click="emit('close')"><i class="ti ti-x"></i></button>
                <button :class="$style.profileBtn" @click="goToProfile"><i class="ti ti-external-link"></i> 詳細プロフィールへ</button>
            </div>
        </div>

        <!-- ユーザー情報 -->
        <div :class="$style.userInfo">
            <img :src="user.avatarUrl" :class="$style.avatar" />
            <div :class="$style.names">
                <div :class="$style.displayName"><MkUserName :user="user" /></div>
                <div :class="$style.acct">@{{ user.username }}{{ user.host ? '@' + user.host : '' }}</div>
                <div v-if="!isSelf && user.isFollowed" :class="$style.followedBadge"><i class="ti ti-user-heart"></i> フォローされています</div>
            </div>
        </div>

        <!-- ひとこと -->
        <div v-if="user.followersVisibility !== 'private' && user.description" :class="$style.bio">
            <Mfm :text="user.description" :author="user" :nyaize="'respect'" :plain="false" :nowrap="false" :emojiUrls="user.emojis" />
        </div>

        <!-- 詳細フィールド -->
        <div :class="$style.fields" v-if="hasFields">
            <div v-if="user.location" :class="$style.field"><i class="ti ti-map-pin"></i> {{ user.location }}</div>
            <div v-if="user.birthday" :class="$style.field"><i class="ti ti-cake"></i> {{ formatBirthday(user.birthday) }}</div>
            <div v-if="user.createdAt" :class="$style.field"><i class="ti ti-calendar"></i> {{ formatDate(user.createdAt) }} 登録</div>
            <div v-if="user.uri || user.url" :class="$style.field"><i class="ti ti-link"></i> <a :href="user.uri || user.url" target="_blank" rel="noopener" :class="$style.fieldLink">{{ (user.uri || user.url || '').replace(/^https?:\/\//, '') }}</a></div>
        </div>

        <!-- 統計 -->
        <div :class="$style.stats">
            <div :class="$style.stat"><span :class="$style.statNum">{{ user.notesCount ?? 0 }}</span><span :class="$style.statLabel">ノート</span></div>
            <div :class="$style.stat"><span :class="$style.statNum">{{ user.followingCount ?? 0 }}</span><span :class="$style.statLabel">フォロー</span></div>
            <div :class="$style.stat"><span :class="$style.statNum">{{ user.followersCount ?? 0 }}</span><span :class="$style.statLabel">フォロワー</span></div>
        </div>

        <!-- アクションボタン -->
        <div v-if="!isSelf" :class="$style.actions">
            <button :class="[$style.actionBtn, isFollowing ? $style.actionActive : $style.actionPrimary]" @click="toggleFollow" :disabled="followLoading">
                <i :class="isFollowing ? 'ti ti-user-check' : 'ti ti-user-plus'"></i>
                {{ isFollowing ? 'フォロー中' : 'フォロー' }}
            </button>
            <button :class="[$style.actionBtn, isMuted ? $style.actionWarn : '']" @click="toggleMute" :disabled="muteLoading">
                <i :class="isMuted ? 'ti ti-eye-off' : 'ti ti-eye'"></i>
                {{ isMuted ? 'ミュート中' : 'ミュート' }}
            </button>
            <button :class="[$style.actionBtn, isBlocked ? $style.actionDanger : '']" @click="toggleBlock" :disabled="blockLoading">
                <i :class="isBlocked ? 'ti ti-ban' : 'ti ti-shield'"></i>
                {{ isBlocked ? 'ブロック中' : 'ブロック' }}
            </button>
        </div>
        <div v-else :class="$style.selfLabel">あなたのアカウントです</div>

        <!-- 最近のノート -->
        <div :class="$style.recentNotes">
            <div :class="$style.recentTitle">最近のノート</div>
            <div v-if="notesLoading" :class="$style.loading">読み込み中...</div>
            <div v-else-if="recentNotes.length === 0" :class="$style.empty">ノートがありません</div>
            <div v-else :class="$style.notesList">
                <div v-for="note in recentNotes" :key="note.id" :class="$style.noteItem" @click="goToNote(note.id)">
                    <div :class="$style.noteContent">
                        <div :class="$style.noteText">
                            <Mfm v-if="note.text" :text="note.text" :plain="true" :nowrap="true" :author="user" :nyaize="'respect'" />
                            <span v-else-if="note.renoteId" :class="$style.noteRenote"><i class="ti ti-repeat"></i> RN</span>
                            <span v-else :class="$style.noteEmpty">（テキストなし）</span>
                        </div>
                        <div :class="$style.noteMeta"><MkTime :time="note.createdAt" /></div>
                    </div>
                    <img v-if="noteThumbnail(note)" :src="noteThumbnail(note)" :class="$style.noteThumb" />
                </div>
            </div>
        </div>
    </div>
</div>
</div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted, reactive } from 'vue';
import * as Misskey from 'cherrypick-js';
import { misskeyApi } from '@/utility/misskey-api.js';
import * as os from '@/os.js';
import { mainRouter } from '@/router.js';
import { $i } from '@/i.js';

const props = withDefaults(defineProps<{ userId: string; isMobile: boolean; inline?: boolean; }>(), { inline: false });
const emit = defineEmits<{ (e: 'close'): void; }>();

const rootEl = ref<HTMLElement|null>(null);
const user = ref<Misskey.entities.UserDetailed | null>(null);
const recentNotes = ref<Misskey.entities.Note[]>([]);
const notesLoading = ref(true);
const isFollowing = ref(false);
const isMuted = ref(false);
const isBlocked = ref(false);
const followLoading = ref(false);
const muteLoading = ref(false);
const blockLoading = ref(false);

const isSelf = computed(() => $i && user.value && $i.id === user.value.id);
const hasFields = computed(() => user.value && (user.value.location || user.value.birthday || user.value.createdAt || user.value.uri || user.value.url));

// ドラッグ移動（ポップアップ時のみ）
const dragPos = reactive({ x: 0, y: 0 });
const popupStyle = computed(() => {
    if (props.inline) return {};
    return { transform: `translate(calc(-50% + ${dragPos.x}px), calc(-50% + ${dragPos.y}px))` };
});
let dragStart: { x:number; y:number; sx:number; sy:number } | null = null;
function onDragStart(e: MouseEvent) {
    if (props.inline) return;
    const t = e.target as HTMLElement;
    // ボタンやリンク上ではドラッグしない
    if (t.closest('button,a,input,.noteItem')) return;
    dragStart = { x: e.clientX, y: e.clientY, sx: dragPos.x, sy: dragPos.y };
    const onMove = (ev: MouseEvent) => { if (!dragStart) return; dragPos.x = dragStart.sx + ev.clientX - dragStart.x; dragPos.y = dragStart.sy + ev.clientY - dragStart.y; };
    const onUp = () => { dragStart = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
}

function formatBirthday(d: string) { const m = d.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}/${m[2]}/${m[3]}` : d; }
function formatDate(d: string) { const dt = new Date(d); return `${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()}`; }

function noteThumbnail(note: Misskey.entities.Note): string | null {
    if (!note.files || note.files.length === 0) return null;
    const img = note.files.find((f: any) => f.type?.startsWith('image/'));
    return img?.thumbnailUrl || img?.url || null;
}

async function loadUser() {
    try {
        const u = await misskeyApi('users/show', { userId: props.userId }) as Misskey.entities.UserDetailed;
        user.value = u;
        isFollowing.value = !!u.isFollowing;
        isMuted.value = !!u.isMuted;
        isBlocked.value = !!u.isBlocking;
    } catch (e) { console.warn('Failed to load user:', e); }
}

async function loadNotes() {
    notesLoading.value = true;
    try {
        const notes = await misskeyApi('users/notes', { userId: props.userId, limit: 10 });
        recentNotes.value = notes as Misskey.entities.Note[];
    } catch (e) { console.warn('Failed to load notes:', e); }
    finally { notesLoading.value = false; }
}

async function toggleFollow() {
    if (!user.value || followLoading.value || isSelf.value) return;
    if (isFollowing.value) {
        const { canceled } = await os.confirm({ type: 'warning', text: `@${user.value.username} のフォローを解除しますか？` });
        if (canceled) return;
    } else {
        const { canceled } = await os.confirm({ type: 'info', text: `@${user.value.username} をフォローしますか？` });
        if (canceled) return;
    }
    followLoading.value = true;
    try {
        if (isFollowing.value) { await misskeyApi('following/delete', { userId: user.value.id }); isFollowing.value = false; }
        else { await misskeyApi('following/create', { userId: user.value.id }); isFollowing.value = true; }
    } catch { os.toast('操作に失敗しました'); } finally { followLoading.value = false; }
}

async function toggleMute() {
    if (!user.value || muteLoading.value) return;
    muteLoading.value = true;
    try {
        if (isMuted.value) { await misskeyApi('mute/delete', { userId: user.value.id }); isMuted.value = false; }
        else {
            const { canceled } = await os.confirm({ type: 'warning', text: `@${user.value.username} をミュートしますか？` });
            if (canceled) { muteLoading.value = false; return; }
            await misskeyApi('mute/create', { userId: user.value.id }); isMuted.value = true;
        }
    } catch { os.toast('操作に失敗しました'); } finally { muteLoading.value = false; }
}

async function toggleBlock() {
    if (!user.value || blockLoading.value) return;
    blockLoading.value = true;
    try {
        if (isBlocked.value) { await misskeyApi('blocking/delete', { userId: user.value.id }); isBlocked.value = false; }
        else {
            const { canceled } = await os.confirm({ type: 'warning', text: `@${user.value.username} をブロックしますか？` });
            if (canceled) { blockLoading.value = false; return; }
            await misskeyApi('blocking/create', { userId: user.value.id }); isBlocked.value = true;
        }
    } catch { os.toast('操作に失敗しました'); } finally { blockLoading.value = false; }
}

function goToProfile() {
    if (!user.value) return;
    emit('close');
    mainRouter.push(user.value.host ? `/@${user.value.username}@${user.value.host}` : `/@${user.value.username}`);
}
function goToNote(noteId: string) { emit('close'); mainRouter.push(`/notes/${noteId}`); }

watch(() => props.userId, () => { loadUser(); loadNotes(); });
onMounted(() => { loadUser(); loadNotes(); });
</script>

<style lang="scss" module>
.overlay {
    position:fixed; inset:0; z-index:9999;
    background:transparent;
}
.root { display:flex; flex-direction:column; overflow:hidden; }
.isPopup {
    position:fixed; top:50%; left:50%;
    width:400px; max-width:92vw; height:auto; max-height:82vh;
    background:var(--MI_THEME-panel); border-radius:16px;
    box-shadow:0 8px 48px rgba(0,0,0,.3);
    z-index:10000;
    cursor:grab;
    &:active { cursor:grabbing; }
}
.panel { display:flex; flex-direction:column; flex:1; min-height:0; overflow-y:auto; box-sizing:border-box; }

// バナー
.banner { position:relative; height:100px; background:var(--MI_THEME-accentedBg); overflow:hidden; border-radius:16px 16px 0 0; flex-shrink:0; }
.root:not(.isPopup) .banner { border-radius:0; }
.bannerImg { width:100%; height:100%; object-fit:cover; }
.bannerOverlay { position:absolute; inset:0; background:linear-gradient(transparent 40%, rgba(0,0,0,.4)); }
.headerBar { position:absolute; top:8px; left:8px; right:8px; display:flex; justify-content:space-between; align-items:center; z-index:1; }
.closeBtn { width:32px; height:32px; border-radius:50%; border:none; background:rgba(0,0,0,.4); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1rem; backdrop-filter:blur(8px); transition:all .2s; &:hover { background:rgba(0,0,0,.6); } }
.profileBtn { padding:5px 12px; border-radius:8px; border:none; background:rgba(0,0,0,.4); color:#fff; font-family:inherit; font-size:.78rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px; backdrop-filter:blur(8px); transition:all .2s; &:hover { background:rgba(0,0,0,.6); } }

// ユーザー情報
.userInfo { display:flex; align-items:center; gap:12px; padding:0 16px; margin-top:-28px; position:relative; z-index:1; }
.avatar { width:56px; height:56px; border-radius:50%; object-fit:cover; flex-shrink:0; border:3px solid var(--MI_THEME-panel); box-shadow:0 2px 8px rgba(0,0,0,.15); }
.names { min-width:0; padding-top:30px; }
.displayName { font-size:.95rem; font-weight:700; color:var(--MI_THEME-fg); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.acct { font-size:.78rem; opacity:.5; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.followedBadge {
    display:inline-flex; align-items:center; gap:3px; margin-top:4px;
    font-size:.7rem; font-weight:600; padding:2px 8px; border-radius:6px;
    background:color-mix(in srgb, var(--MI_THEME-accent) 12%, transparent);
    color:var(--MI_THEME-accent);
}

// Bio
.bio { padding:8px 16px 0; font-size:.82rem; line-height:1.6; color:var(--MI_THEME-fg); opacity:.85; overflow-wrap:break-word; word-break:break-word; }

// フィールド
.fields { padding:6px 16px; display:flex; flex-wrap:wrap; gap:4px 12px; }
.field { font-size:.75rem; opacity:.6; display:flex; align-items:center; gap:3px; }
.fieldLink { color:var(--MI_THEME-accent); text-decoration:none; &:hover { text-decoration:underline; } }

// 統計
.stats { display:flex; gap:4px; padding:10px 16px 6px; }
.stat { flex:1; text-align:center; padding:6px 4px; border-radius:8px; background:color-mix(in srgb, var(--MI_THEME-fg) 5%, transparent); }
.statNum { display:block; font-size:.9rem; font-weight:700; color:var(--MI_THEME-fg); }
.statLabel { font-size:.65rem; opacity:.45; }

// アクション
.actions { display:flex; gap:6px; padding:8px 16px; }
.actionBtn { flex:1; padding:7px 4px; border-radius:8px; border:1px solid var(--MI_THEME-divider); background:transparent; color:var(--MI_THEME-fg); font-family:inherit; font-size:.73rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px; transition:all .2s; &:hover { background:color-mix(in srgb, var(--MI_THEME-fg) 8%, transparent); } &:disabled { opacity:.5; cursor:not-allowed; } }
.actionPrimary { border-color:var(--MI_THEME-accent); color:var(--MI_THEME-accent); }
.actionActive { background:var(--MI_THEME-accentedBg); border-color:var(--MI_THEME-accent); color:var(--MI_THEME-accent); }
.actionWarn { background:rgba(255,170,0,.1); border-color:rgba(255,170,0,.3); color:#e0a030; }
.actionDanger { background:rgba(220,50,50,.1); border-color:rgba(220,50,50,.3); color:#dc3232; }
.selfLabel { text-align:center; font-size:.82rem; opacity:.45; padding:8px 16px; }

// 最近のノート
.recentNotes { flex:1; min-height:0; display:flex; flex-direction:column; padding:0 16px 12px; }
.recentTitle { font-size:.8rem; font-weight:700; margin:8px 0 6px; padding-bottom:5px; border-bottom:1px solid var(--MI_THEME-divider); }
.loading, .empty { text-align:center; opacity:.4; font-size:.82rem; padding:16px 0; }
.notesList { flex:1; overflow-y:auto; }
.noteItem { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:10px; margin-bottom:5px; cursor:pointer; border:1px solid var(--MI_THEME-divider); transition:background .15s; &:hover { background:color-mix(in srgb, var(--MI_THEME-fg) 5%, transparent); } }
.noteContent { flex:1; min-width:0; }
.noteText { font-size:.82rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-bottom:2px; }
.noteRenote { color:var(--MI_THEME-accent); font-size:.78rem; }
.noteEmpty { opacity:.35; font-size:.78rem; }
.noteMeta { font-size:.7rem; opacity:.4; }
.noteThumb { width:38px; height:38px; border-radius:6px; object-fit:cover; flex-shrink:0; }
</style>

<style lang="scss">
.sup-slide-enter-active { transition:transform .3s cubic-bezier(.22,1,.36,1); }
.sup-slide-leave-active { transition:transform .25s cubic-bezier(.55,.06,.68,.19); }
.sup-slide-enter-from, .sup-slide-leave-to { transform:translateX(100%); }
.sup-fade-enter-active { transition:opacity .25s ease, transform .25s ease; }
.sup-fade-leave-active { transition:opacity .2s ease, transform .2s ease; }
.sup-fade-enter-from, .sup-fade-leave-to { opacity:0; transform:translateY(10px); }
</style>
