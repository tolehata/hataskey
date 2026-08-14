<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
Hatady の映画・ゲーム作品を追加・編集するウィンドウ。
映画の DOM にはゲーム固有項目を一切生成しない。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="720"
	:initialHeight="760"
	:canResize="true"
	@closed="emit('closed')"
>
	<template #header><i :class="['ti', kind === 'movie' ? 'ti-movie' : 'ti-device-gamepad-2']"></i> {{ isEdit ? label('editWork') : kind === 'movie' ? label('addMovie') : label('addGame') }}</template>

	<div class="hatady-scope" :data-hatady-theme="theme" :class="$style.body">
		<div :class="$style.leadGrid">
			<div :class="$style.coverCol">
				<HyMediaCover :kind="kind" :title="title || label('untitled')" :subtitle="coverSubtitle" :width="118" :colorIndex="coverColorIndex" showTitle/>
				<div :class="$style.swatches" :aria-label="label('coverColor')">
					<button v-for="(set, index) in HY_COVER_SETS" :key="index" type="button" :class="[$style.swatch, coverColorIndex === index && $style.swatchOn]" :style="{ background: `linear-gradient(135deg, ${set[0]}, ${set[1]})` }" @click="coverColorIndex = coverColorIndex === index ? null : index"></button>
				</div>
			</div>

			<div :class="$style.primaryFields">
				<label :class="$style.field">
					<span :class="$style.label">{{ label('title') }} <b :class="$style.required">*</b></span>
					<input v-model="title" :class="[$style.input, $style.titleInput]" maxlength="512" autofocus>
				</label>
				<label :class="$style.field">
					<span :class="$style.label">{{ kind === 'movie' ? label('director') : label('creator') }}</span>
					<input v-model="creator" :class="$style.input" maxlength="256">
				</label>
				<label :class="$style.field">
					<span :class="$style.label">{{ label('originalTitle') }}</span>
					<input v-model="originalTitle" :class="$style.input" maxlength="512">
				</label>
				<div :class="$style.twoCol">
					<label :class="$style.field">
						<span :class="$style.label">{{ label('statusLabel') }}</span>
						<select v-model="status" :class="$style.select">
							<option v-for="option in statuses" :key="option" :value="option">{{ statusLabel(option) }}</option>
						</select>
					</label>
					<label :class="$style.field">
						<span :class="$style.label">{{ label('visibility') }}</span>
						<select v-model="visibility" :class="$style.select">
							<option value="private">{{ label('private') }}</option>
							<option value="followers">{{ label('followers') }}</option>
							<option value="public">{{ label('public') }}</option>
						</select>
					</label>
				</div>
				<div :class="$style.flagRow">
					<label :class="$style.check"><input v-model="isFavorite" type="checkbox"> <i class="ti ti-star"></i> {{ label('favorite') }}</label>
				</div>
			</div>
		</div>

		<section :class="$style.section">
			<div :class="$style.sectionTitle"><i class="ti ti-info-circle"></i> {{ label('basicInfo') }}</div>
			<div :class="$style.formGrid">
				<label :class="$style.field">
					<span :class="$style.label">{{ label('releaseDate') }}</span>
					<input v-model="releaseDate" type="date" :class="$style.input">
				</label>
				<label :class="$style.field">
					<span :class="$style.label">{{ label('releaseYear') }}</span>
					<input v-model.number="releaseYear" type="number" min="1800" max="3000" :class="$style.input">
				</label>
				<label :class="[$style.field, $style.spanTwo]">
					<span :class="$style.label">{{ label('officialUrl') }}</span>
					<input v-model="officialUrl" type="url" :class="$style.input" placeholder="https://">
				</label>
			</div>
		</section>

		<!-- 映画専用。ゲーム固有の武器・対戦・気分等はこの分岐内には存在しない。 -->
		<section v-if="kind === 'movie'" :class="$style.section" data-media-kind="movie">
			<div :class="$style.sectionTitle"><i class="ti ti-movie"></i> {{ label('movieInfo') }}</div>
			<div :class="$style.formGrid">
				<label :class="$style.field">
					<span :class="$style.label">{{ label('movieOrigin') }}</span>
					<select v-model="origin" :class="$style.select"><option value="">{{ label('notSet') }}</option><option value="domestic">{{ label('domestic') }}</option><option value="foreign">{{ label('foreign') }}</option><option value="co_production">{{ label('coProduction') }}</option><option value="other">{{ label('otherOrigin') }}</option></select>
				</label>
				<label :class="$style.field">
					<span :class="$style.label">{{ label('viewingMode') }}</span>
					<select v-model="viewingMode" :class="$style.select"><option value="">{{ label('notSet') }}</option><option value="original">{{ label('original') }}</option><option value="subtitled">{{ label('subtitled') }}</option><option value="dubbed">{{ label('dubbed') }}</option></select>
				</label>
				<label :class="$style.field">
					<span :class="$style.label">{{ label('primaryLanguage') }}</span>
					<input v-model="primaryLanguage" :class="$style.input" maxlength="64">
				</label>
				<label :class="$style.field">
					<span :class="$style.label">{{ label('runtimeMinutes') }}</span>
					<input v-model.number="runtimeMinutes" type="number" min="1" max="100000" :class="$style.input">
				</label>
				<label :class="[$style.field, $style.spanTwo]">
					<span :class="$style.label">{{ label('genres') }}</span>
					<textarea v-model="genresText" :class="[$style.input, $style.listInput]" rows="2" :placeholder="label('genresHint')"></textarea>
				</label>
			</div>
			<div :class="$style.ratingField">
				<span :class="$style.textHead"><span :class="$style.label">{{ label('recommendation') }}</span><label :class="$style.check"><input v-model="isRecommended" type="checkbox"> <i class="ti ti-thumb-up"></i> {{ label('recommend') }}</label></span>
				<div :class="$style.ratingControl">
					<input v-model.number="recommendationUi" type="range" min="0" max="5" step="0.5" :disabled="recommendationUnset" :class="$style.ratingRange" :aria-label="label('recommendation')">
					<span :class="$style.ratingStars" aria-hidden="true"><i v-for="score in 5" :key="score" class="ti" :class="!recommendationUnset && recommendationUi >= score ? 'ti-star-filled' : !recommendationUnset && recommendationUi >= score - 0.5 ? 'ti-star-half-filled' : 'ti-star'"></i></span>
					<span :class="$style.ratingValue">{{ recommendationUnset ? label('unrated') : `${recommendationUi.toFixed(1)}/5` }}</span>
				</div>
				<label :class="$style.check"><input v-model="recommendationUnset" type="checkbox"> {{ label('unrated') }}</label>
			</div>
		</section>

		<!-- ゲーム専用。映画では v-if により DOM 自体を生成しない。 -->
		<section v-else :class="$style.section" data-media-kind="game">
			<div :class="$style.sectionTitle"><i class="ti ti-device-gamepad-2"></i> {{ label('gameInfo') }}</div>
			<div :class="$style.formGrid">
				<label :class="$style.field"><span :class="$style.label">{{ label('platform') }}</span><textarea v-model="platformsText" :class="[$style.input, $style.listInput]" rows="2" :placeholder="label('platformsHint')"></textarea></label>
				<label :class="$style.field"><span :class="$style.label">{{ label('developer') }}</span><input v-model="developer" :class="$style.input" maxlength="256"></label>
				<label :class="$style.field"><span :class="$style.label">{{ label('publisher') }}</span><input v-model="publisher" :class="$style.input" maxlength="256"></label>
			</div>
		</section>

		<section :class="$style.section">
			<div :class="$style.sectionTitle"><i class="ti ti-notes"></i> {{ label('notes') }}</div>
			<MediaTextField v-model="synopsis" v-model:spoiler="synopsisSpoiler" :label="label('summary')" :spoilerLabel="label('containsSpoiler')"/>
			<MediaTextField v-if="kind === 'movie'" v-model="highlightsText" v-model:spoiler="highlightsSpoiler" :label="label('highlights')" :spoilerLabel="label('containsSpoiler')"/>
			<MediaTextField v-model="review" v-model:spoiler="reviewSpoiler" :label="label('review')" :spoilerLabel="label('containsSpoiler')"/>
		</section>

		<div :class="$style.footer">
			<button type="button" :class="[$style.btn, $style.btnGhost]" :disabled="saving" @click="dialog?.close()">{{ label('cancel') }}</button>
			<button type="button" :class="[$style.btn, $style.btnPrimary]" :disabled="saving || !title.trim()" @click="submit"><i class="ti ti-check"></i> {{ isEdit ? label('update') : label('add') }}</button>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { computed, defineComponent, h, ref, useCssModule, useTemplateRef } from 'vue';
import type { HatadyMediaKind, HatadyMediaStatus, HatadyMediaVisibility, HatadyMediaWork, HatadyMovieOrigin, HatadyMovieViewingMode } from '@/utility/hatady-media.js';
import MkWindow from '@/components/MkWindow.vue';
import HyMediaCover from '@/components/HyMediaCover.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { HY_COVER_SETS } from '@/utility/hatady.js';
import { hatadyTheme } from '@/utility/hatady-prefs.js';
import { hatadyMediaCopy, mediaStatusCopyKey, mediaStatusOptions, mediaWorkSpecificPayload, normalizeMediaList } from '@/utility/hatady-media.js';

const props = defineProps<{ kind: HatadyMediaKind; editWork?: HatadyMediaWork | null }>();
const emit = defineEmits<{ (ev: 'done', work: HatadyMediaWork): void; (ev: 'closed'): void }>();
const dialog = useTemplateRef('dialog');
const theme = hatadyTheme;
const copy = hatadyMediaCopy();
const mediaApi = misskeyApi as unknown as (endpoint: string, payload: Record<string, unknown>) => Promise<any>;
const styles = useCssModule();
const isEdit = props.editWork != null;
const kind = props.kind;
const source = props.editWork;

function label(key: string): string { return String(copy.form?.[key] ?? copy[key] ?? key); }

const title = ref(String(source?.title ?? ''));
const originalTitle = ref(String(source?.originalTitle ?? ''));
const creator = ref(String(source?.creator ?? ''));
const status = ref<HatadyMediaStatus>((source?.status as HatadyMediaStatus | undefined) ?? 'planned');
const visibility = ref<HatadyMediaVisibility>(source?.visibility ?? 'private');
const coverColorIndex = ref<number | null>(typeof source?.coverColorIndex === 'number' ? source.coverColorIndex : null);
const isFavorite = ref(Boolean(source?.isFavorite));
const isRecommended = ref(Boolean(source?.isRecommended));
const releaseDate = ref(String(source?.releaseDate ?? '').slice(0, 10));
const releaseYear = ref<number | null>(typeof source?.releaseYear === 'number' ? source.releaseYear : null);
const officialUrl = ref(String(source?.officialUrl ?? ''));

// 映画専用
const genresText = ref(normalizeMediaList(source?.genres).join('\n'));
const origin = ref<HatadyMovieOrigin | ''>(source?.origin ?? '');
const viewingMode = ref<HatadyMovieViewingMode | ''>(source?.viewingMode ?? '');
const primaryLanguage = ref(String(source?.primaryLanguage ?? ''));
const runtimeMinutes = ref<number | null>(typeof source?.runtimeMinutes === 'number' ? source.runtimeMinutes : null);
const recommendationUi = ref(Math.max(0, Math.min(5, Number(source?.recommendationRating ?? 0) / 2)));
const recommendationUnset = ref(source?.recommendationRating == null);

// ゲーム専用
const platformsText = ref(normalizeMediaList(source?.platforms).join('\n'));
const developer = ref(String(source?.developer ?? ''));
const publisher = ref(String(source?.publisher ?? ''));

// 共通ノート
const synopsis = ref(String(source?.synopsis ?? ''));
const synopsisSpoiler = ref(Boolean(source?.synopsisSpoiler));
const highlightsText = ref((source?.highlights ?? []).join('\n'));
const highlightsSpoiler = ref(Boolean(source?.highlightsSpoiler));
const review = ref(String(source?.review ?? ''));
const reviewSpoiler = ref(Boolean(source?.reviewSpoiler));
const saving = ref(false);
const statuses = computed(() => mediaStatusOptions(kind));
const coverSubtitle = computed(() => kind === 'movie' ? creator.value : developer.value || creator.value);

function statusLabel(value: HatadyMediaStatus): string {
	return String(copy.status?.[mediaStatusCopyKey(kind, value)] ?? value);
}

function nullableText(value: string): string | null { return value.trim() || null; }

function optionalNumber(value: number | null): number | null { return Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null; }

function lineValues(value: string): string[] { return value.split(/\r?\n/).map(item => item.trim()).filter(Boolean); }

async function submit() {
	if (!title.value.trim() || saving.value) return;
	saving.value = true;
	try {
		const common: Record<string, unknown> = {
			...(!isEdit ? { kind } : {}),
			title: title.value.trim(),
			originalTitle: nullableText(originalTitle.value),
			creator: nullableText(creator.value),
			status: status.value,
			visibility: visibility.value,
			coverColorIndex: coverColorIndex.value,
			isFavorite: isFavorite.value,
			isRecommended: kind === 'movie' ? isRecommended.value : false,
			...(kind === 'movie' ? { recommendationRating: recommendationUnset.value ? null : Math.round(recommendationUi.value * 2) } : {}),
			releaseDate: releaseDate.value || null,
			releaseYear: optionalNumber(releaseYear.value),
			officialUrl: nullableText(officialUrl.value),
			synopsis: nullableText(synopsis.value),
			synopsisSpoiler: synopsisSpoiler.value,
			review: nullableText(review.value),
			reviewSpoiler: reviewSpoiler.value,
		};
		const specific = mediaWorkSpecificPayload(kind, {
			genres: normalizeMediaList(genresText.value),
			origin: origin.value || null,
			viewingMode: viewingMode.value || null,
			primaryLanguage: nullableText(primaryLanguage.value),
			runtimeMinutes: optionalNumber(runtimeMinutes.value),
			highlights: lineValues(highlightsText.value),
			highlightsSpoiler: highlightsSpoiler.value,
			platforms: normalizeMediaList(platformsText.value),
			developer: nullableText(developer.value),
			publisher: nullableText(publisher.value),
		});
		const payload = { ...common, ...specific, ...(isEdit ? { workId: source!.id } : {}) };
		const work = await mediaApi(isEdit ? 'hata/hatady/media/works/update' : 'hata/hatady/media/works/create', payload) as HatadyMediaWork;
		os.success();
		emit('done', work);
		dialog.value?.close();
	} catch {
		os.alert({ type: 'error', text: label('saveFailed') });
	} finally {
		saving.value = false;
	}
}

// 同一ファイル内の小さな表示専用部品。映画/ゲーム双方で文章欄の構造とアクセシビリティを揃える。
const MediaTextField = defineComponent({
	name: 'MediaTextField',
	props: { modelValue: { type: String, required: true }, spoiler: { type: Boolean, required: true }, label: { type: String, required: true }, spoilerLabel: { type: String, required: true } },
	emits: ['update:modelValue', 'update:spoiler'],
	setup(p, { emit: childEmit }) {
		return () => h('label', { class: styles.textField }, [
			h('span', { class: styles.textHead }, [h('span', { class: styles.label }, p.label), h('span', { class: styles.spoilerCheck }, [h('input', { type: 'checkbox', checked: p.spoiler, onChange: (ev: Event) => childEmit('update:spoiler', (ev.target as HTMLInputElement).checked) }), ` ${p.spoilerLabel}`])]),
			h('textarea', { class: styles.textarea, rows: 3, value: p.modelValue, onInput: (ev: Event) => childEmit('update:modelValue', (ev.target as HTMLTextAreaElement).value) }),
		]);
	},
});
</script>

<style lang="scss" module>
.body { min-height: 100%; padding: 20px; box-sizing: border-box; container-type: inline-size; background: var(--hy-bg); color: var(--hy-body); font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif; }
.leadGrid { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 22px; }
.coverCol { display: flex; flex-direction: column; align-items: center; gap: 11px; }
.swatches { display: flex; justify-content: center; flex-wrap: wrap; gap: 6px; max-width: 132px; }
.swatch { width: 20px; height: 20px; padding: 0; border: 2px solid var(--hy-surface); border-radius: 6px; box-shadow: 0 0 0 1px var(--hy-border); cursor: pointer; }
.swatchOn { box-shadow: 0 0 0 2px var(--hy-accent); }
.primaryFields, .field { display: flex; flex-direction: column; min-width: 0; gap: 7px; }
.primaryFields { gap: 14px; }
.listInput { resize: vertical; line-height: 1.5; }
.label { font-family: var(--hy-heading); color: var(--hy-ink); font-size: 12px; font-weight: 700; }
.required { color: #c0563a; }
.input, .select, .textarea { width: 100%; min-width: 0; box-sizing: border-box; padding: 9px 11px; border: 1px solid var(--hy-border); border-radius: 9px; outline: none; background: var(--hy-surface); color: var(--hy-ink); font: inherit; }
.input:focus, .select:focus, .textarea:focus { border-color: var(--hy-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--hy-accent) 16%, transparent); }
.titleInput { font-family: var(--hy-serif); font-size: 16px; font-weight: 600; }
.twoCol, .formGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; }
.section { margin-top: 17px; padding: 16px; border: 1px solid var(--hy-border); border-radius: 13px; background: var(--hy-surface); }
.sectionTitle { display: flex; align-items: center; gap: 7px; margin-bottom: 14px; color: var(--hy-ink); font-family: var(--hy-heading); font-size: 13px; font-weight: 800; }
.sectionTitle i { color: var(--hy-accent); font-size: 16px; }
.spanTwo { grid-column: 1 / -1; }
.flagRow { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 4px; }
.check, .spoilerCheck { display: inline-flex; align-items: center; gap: 5px; color: var(--hy-body); font-size: 11.5px; cursor: pointer; }
.check input, .spoilerCheck input { accent-color: var(--hy-accent); }
.ratingField { margin-top: 15px; }
.ratingControl { display: grid; grid-template-columns: minmax(120px, 1fr) auto auto; align-items: center; gap: 10px; margin-top: 7px; }
.ratingRange { width: 100%; accent-color: var(--hy-accent); }
.ratingStars { display: inline-flex; gap: 2px; color: #d9a441; font-size: 18px; }
.ratingValue { margin-left: 8px; color: var(--hy-muted); font-size: 11.5px; }
.textField { display: flex; flex-direction: column; gap: 7px; margin-top: 13px; }
.textField:first-of-type { margin-top: 0; }
.textHead { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.textarea { resize: vertical; min-height: 78px; line-height: 1.65; }
.footer { position: sticky; bottom: -20px; z-index: 2; display: flex; justify-content: flex-end; gap: 9px; margin: 20px -20px -20px; padding: 13px 20px; border-top: 1px solid var(--hy-border); background: color-mix(in srgb, var(--hy-bg) 94%, transparent); }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 19px; border-radius: 999px; border: 1px solid var(--hy-border); color: var(--hy-ink); background: var(--hy-surface); font-family: var(--hy-heading); font-weight: 700; cursor: pointer; }
.btn:disabled { opacity: .48; cursor: not-allowed; }
.btnPrimary { border-color: transparent; color: #fff; background: var(--hy-accent); }
.btnGhost { background: transparent; }

@container (max-width: 560px) {
	.body { padding: 15px; }
	.leadGrid { grid-template-columns: 1fr; }
	.coverCol { flex-direction: row; justify-content: center; }
	.swatches { max-width: 96px; }
	.twoCol, .formGrid { grid-template-columns: 1fr; }
	.ratingControl { grid-template-columns: 1fr; justify-items: start; }
	.ratingStars, .ratingValue { margin-left: 0; }
	.spanTwo { grid-column: auto; }
	.section { padding: 14px; }
	.footer { bottom: -15px; margin: 18px -15px -15px; padding: 12px 15px; }
}
</style>
