<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<template>
<HatadyFormWizard ref="wizard" v-model="values" :title="`${typeLabel}${isEdit ? 'の情報を編集' : 'を加える'}`" :label="typeLabel" :icon="icon" :pages="pages" :draftId="`hatady:media-work:${kind}:${isEdit ? `edit:${source!.id}` : 'create'}`" :embedded="embedded" :save="save" :saveLabel="isEdit ? '変更を保存' : 'コレクションに加える'" @done="emit('done', $event)" @closed="emit('closed')" @back="emit('back')"/>
</template>
<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import type { HatadyMediaKind, HatadyMediaWork } from '@/utility/hatady-media.js';
import type { HatadyFormPage, HatadyFormValues } from '@/utility/hatady-form.js';
import HatadyFormWizard from '@/components/HatadyFormWizard.vue';
import { hatadyMediaCopy, mediaStatusCopyKey, mediaStatusOptions, normalizeMediaList } from '@/utility/hatady-media.js';
import { formField as f, optionalPages } from '@/utility/hatady-form.js';
import { misskeyApi } from '@/utility/misskey-api.js';
const props = withDefaults(defineProps<{ kind: HatadyMediaKind; editWork?: HatadyMediaWork | null; embedded?: boolean }>(), { editWork: null, embedded: false });
const emit = defineEmits<{ (event: 'done', value: HatadyMediaWork): void; (event: 'closed'): void; (event: 'back'): void }>();
const wizard = useTemplateRef('wizard'), source = props.editWork, kind = props.kind, isEdit = source != null;
const typeLabel = kind === 'movie' ? '映画' : kind === 'game' ? 'ゲーム' : '作業', icon = kind === 'movie' ? 'ti ti-movie' : kind === 'game' ? 'ti ti-device-gamepad-2' : 'ti ti-briefcase';
const copy = hatadyMediaCopy();
const values = ref<HatadyFormValues>({
	title: source?.title ?? '', creator: source?.creator ?? '', genre: source?.details?.genre ?? '', description: source?.details?.description ?? '', memo: source?.details?.memo ?? '', nextStep: source?.details?.nextStep ?? '',
	status: source?.status ?? (kind === 'work' ? 'in_progress' : 'planned'), visibility: source?.visibility ?? 'private', coverColorIndex: source?.coverColorIndex ?? null, isFavorite: source?.isFavorite ?? false, isRecommended: source?.isRecommended ?? false,
	originalTitle: source?.originalTitle ?? '', releaseDate: String(source?.releaseDate ?? '').slice(0, 10), releaseYear: source?.releaseYear ?? '', officialUrl: source?.officialUrl ?? '',
	genres: normalizeMediaList(source?.genres), origin: source?.origin ?? '', viewingMode: source?.viewingMode ?? '', primaryLanguage: source?.primaryLanguage ?? '', runtimeMinutes: source?.runtimeMinutes ?? '',
	recommendationRating: source?.recommendationRating == null ? '' : Number(source.recommendationRating) / 2,
	platforms: normalizeMediaList(source?.platforms), developer: source?.developer ?? '', publisher: source?.publisher ?? '', synopsis: source?.synopsis ?? '', synopsisSpoiler: source?.synopsisSpoiler ?? false,
	highlights: normalizeMediaList(source?.highlights), highlightsSpoiler: source?.highlightsSpoiler ?? false, review: source?.review ?? '', reviewSpoiler: source?.reviewSpoiler ?? false,
});
const select = (key: string, label: string, options: Array<[string, string]>) => f(key, label, { type: 'select', options: [{ value: '', label: '未設定' }, ...options.map(([value, text]) => ({ value, label: text }))] });
const pages: HatadyFormPage[] = [
	{ id: 'basics', title: kind === 'work' ? 'これから取り組むこと' : '気になるひとつを、残そう', fields: [f('title', kind === 'work' ? '作業の名前' : `${typeLabel}のタイトル`, { required: true, maxlength: 512, placeholder: kind === 'work' ? '例：季節のイラスト制作' : kind === 'movie' ? '例：霧のむこうの灯' : '例：風待ちの航路' }), kind === 'movie' ? f('genres', 'ジャンル', { type: 'list', maxlength: 128, maxItems: 30 }) : f('genre', kind === 'work' ? '分野' : 'ジャンル', { maxlength: 64 }), ...(kind !== 'work' ? [f('creator', kind === 'movie' ? '監督・制作者' : '作者・制作者', { maxlength: 256 })] : [])] },
	{ id: 'status', title: '今の状態を選ぼう', fields: [f('status', '状態', { type: 'choice', options: mediaStatusOptions(kind).map(value => ({ value, label: kind === 'work' ? ({ in_progress: '進行中', completed: '完了', on_hold: '休止中' } as Record<string, string>)[value] ?? value : String(copy.status?.[mediaStatusCopyKey(kind, value)] ?? value), icon: value === 'completed' || value === 'mastered' ? 'ti ti-check' : value === 'in_progress' ? 'ti ti-player-play' : 'ti ti-bookmark' })) }), f('isFavorite', 'お気に入り', { type: 'checkbox' }), f('isRecommended', 'おすすめ', { type: 'checkbox' })] },
	{ id: 'details', title: '残したい情報を選ぶ', choices: true, fields: [] },
	...(kind !== 'work' ? optionalPages('release', '作品の基本情報', [f('originalTitle', '原題', { maxlength: 512 }), f('releaseDate', '公開・発売日', { type: 'date' }), f('releaseYear', '公開・発売年', { type: 'number', min: 1800, max: 3000 }), f('officialUrl', '公式サイト', { type: 'url', maxlength: 2048 })], 'ti ti-calendar') : optionalPages('next', '次の一歩', [f('nextStep', '次にやること', { maxlength: 240 })], 'ti ti-arrow-right')),
	...(kind === 'movie' ? optionalPages('viewing', '制作と言語', [select('origin', '制作地域', [['domestic', '国内'], ['foreign', '海外'], ['co_production', '共同制作'], ['other', 'その他']]), select('viewingMode', '字幕・吹き替え', [['original', '原語'], ['subtitled', '字幕'], ['dubbed', '吹き替え']]), f('primaryLanguage', '言語', { maxlength: 64 }), f('runtimeMinutes', '作品の長さ（分）', { type: 'number', min: 1, max: 100000 })], 'ti ti-movie') : kind === 'game' ? optionalPages('platforms', '遊べる環境・制作元', [f('platforms', 'プラットフォーム', { type: 'list', maxlength: 128, maxItems: 30 }), f('developer', '開発元', { maxlength: 256 }), f('publisher', '発売元', { maxlength: 256 })], 'ti ti-device-gamepad-2') : []),
	...(kind !== 'work' ? optionalPages('synopsis', 'あらすじ', [f('synopsis', 'あらすじ', { type: 'textarea', maxlength: 8192 }), f('synopsisSpoiler', 'あらすじにネタバレを含む', { type: 'checkbox' })]) : []),
	...(kind === 'movie' ? optionalPages('highlights', '見どころ', [f('highlights', '見どころ', { type: 'list', maxlength: 512, maxItems: 50 }), f('highlightsSpoiler', '見どころにネタバレを含む', { type: 'checkbox' })], 'ti ti-sparkles') : []),
	...(kind !== 'work' ? optionalPages('review', '感想', [f('review', '感想', { type: 'textarea', maxlength: 8192 }), f('reviewSpoiler', '感想にネタバレを含む', { type: 'checkbox' }), ...(kind === 'movie' ? [f('recommendationRating', 'おすすめ度（0〜5）', { type: 'number', min: 0, max: 5, step: 0.5 })] : [])], 'ti ti-star') : []),
	...optionalPages('description', kind === 'work' ? '取り組みたいこと' : '作品の紹介', [f('description', '説明', { type: 'textarea', maxlength: 8192 })]),
	...optionalPages('memo', '自分だけのメモ', [f('memo', '自分だけのメモ', { type: 'textarea', maxlength: 8192 })], 'ti ti-lock'),
	...(kind !== 'work' ? optionalPages('cover', '表紙の色', [f('coverColorIndex', '表紙の色', { type: 'color' })], 'ti ti-palette') : []),
	{ id: 'sharing', title: '誰に見せる？', summary: true, fields: [f('visibility', `${typeLabel}の公開範囲`, { type: 'visibility' })] },
];

async function save(data: HatadyFormValues) {
	const payload = {
		...(!isEdit ? { kind } : { workId: source!.id }), title: data.title.trim(), creator: String(data.creator).trim() || null, status: data.status, visibility: data.visibility,
		coverColorIndex: data.coverColorIndex, isFavorite: data.isFavorite, isRecommended: data.isRecommended,
		details: { ...source?.details, ...(kind !== 'movie' ? { genre: data.genre } : {}), description: data.description, memo: data.memo, ...(kind === 'work' ? { nextStep: data.nextStep } : {}) },
		...(kind !== 'work' ? { originalTitle: data.originalTitle.trim() || null, releaseDate: data.releaseDate || null, releaseYear: data.releaseYear === '' || data.releaseYear == null ? null : Number(data.releaseYear), officialUrl: data.officialUrl.trim() || null, synopsis: data.synopsis.trim() || null, synopsisSpoiler: data.synopsisSpoiler, review: data.review.trim() || null, reviewSpoiler: data.reviewSpoiler } : {}),
		...(kind === 'movie' ? { genres: normalizeMediaList(data.genres), origin: data.origin || null, viewingMode: data.viewingMode || null, primaryLanguage: data.primaryLanguage.trim() || null, runtimeMinutes: data.runtimeMinutes === '' || data.runtimeMinutes == null ? null : Number(data.runtimeMinutes), highlights: normalizeMediaList(data.highlights), highlightsSpoiler: data.highlightsSpoiler, recommendationRating: data.recommendationRating === '' || data.recommendationRating == null ? null : Math.round(Number(data.recommendationRating) * 2) } : kind === 'game' ? { platforms: normalizeMediaList(data.platforms), developer: data.developer.trim() || null, publisher: data.publisher.trim() || null } : {}),
	};
	return await (misskeyApi as any)(isEdit ? 'hata/hatady/media/works/update' : 'hata/hatady/media/works/create', payload);
}

defineExpose({ requestClose: () => wizard.value?.requestClose() });
</script>
