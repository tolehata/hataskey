<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
Hatady の鑑賞・プレイセッション追加/編集ウィンドウ。
-->
<template>
<MkWindow ref="dialog" :initialWidth="600" :initialHeight="680" :canResize="true" @closed="emit('closed')">
	<template #header><i :class="['ti', work.kind === 'movie' ? 'ti-player-play' : 'ti-device-gamepad-2']"></i> {{ isEdit ? label('editSession') : work.kind === 'movie' ? label('addViewing') : label('addPlay') }}</template>
	<div class="hatady-scope" :data-hatady-theme="theme" :class="$style.body">
		<div :class="$style.workHead">
			<HyMediaCover :kind="work.kind" :title="work.title" :subtitle="work.creator" :width="58" showTitle/>
			<div><div :class="$style.workKind">{{ work.kind === 'movie' ? copy.movies : copy.games }}</div><div :class="$style.workTitle">{{ work.title }}</div></div>
		</div>

		<div :class="$style.grid">
			<label :class="$style.field"><span :class="$style.label">{{ work.kind === 'movie' ? label('watchedAt') : label('playedAt') }}</span><input v-model="occurredAtLocal" type="datetime-local" :class="$style.input"></label>
			<label :class="$style.field"><span :class="$style.label">{{ label('durationMinutes') }}</span><input v-model.number="durationMinutes" type="number" min="1" max="100000" :class="$style.input"></label>
			<label :class="$style.field"><span :class="$style.label">{{ label('visibility') }}</span><select v-model="visibility" :class="$style.select"><option value="private">{{ label('private') }}</option><option value="followers">{{ label('followers') }}</option><option value="public">{{ label('public') }}</option></select></label>
		</div>

		<!-- 映画は鑑賞記録だけ。ゲームの気分・武器・対戦項目は DOM に生成しない。 -->
		<template v-if="work.kind === 'movie'">
			<input type="hidden" name="kind" value="movie_viewing">
			<section :class="$style.subSection" data-session-kind="movie_viewing">
				<div :class="$style.subTitle"><i class="ti ti-movie"></i> {{ label('viewingDetails') }}</div>
				<div :class="$style.grid">
					<label :class="$style.field"><span :class="$style.label">{{ label('viewingMode') }}</span><select v-model="viewingMode" :class="$style.select"><option value="">{{ label('notSet') }}</option><option value="original">{{ label('original') }}</option><option value="subtitled">{{ label('subtitled') }}</option><option value="dubbed">{{ label('dubbed') }}</option></select></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('theaterName') }}</span><input v-model="theaterName" :class="$style.input" maxlength="512"></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('screeningFormat') }}</span><input v-model="screeningFormat" :class="$style.input" maxlength="512" :placeholder="label('screeningFormatHint')"></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('companions') }}</span><textarea v-model="companionsText" :class="[$style.input, $style.listInput]" rows="2" maxlength="2048" :placeholder="label('commaSeparated')"></textarea></label>
				</div>
				<label :class="$style.check"><input v-model="rewatch" type="checkbox"> <i class="ti ti-repeat"></i> {{ label('rewatch') }}</label>
			</section>
		</template>

		<template v-else>
			<div :class="$style.typeChooser">
				<button v-for="option in gameSessionTypes" :key="option" type="button" :disabled="isEdit" :class="[$style.typeBtn, sessionKind === option && $style.typeBtnOn]" @click="sessionKind = option">
					<i :class="['ti', option === 'game_play' ? 'ti-player-play' : option === 'game_match' ? 'ti-swords' : 'ti-route-square']"></i>
					{{ sessionKindLabel(option) }}
				</button>
			</div>
			<div :class="$style.grid">
				<label :class="$style.field"><span :class="$style.label">{{ label('device') }}</span><input v-model="device" :class="$style.input" maxlength="512"></label>
				<label v-if="sessionKind === 'game_play'" :class="$style.field"><span :class="$style.label">{{ label('progress') }}</span><input v-model="progress" :class="$style.input" :placeholder="label('progressHint')" maxlength="512"></label>
				<label v-if="sessionKind === 'game_play'" :class="$style.field"><span :class="$style.label">{{ label('difficulty') }}</span><input v-model="difficulty" :class="$style.input" maxlength="512"></label>
				<label :class="$style.field"><span :class="$style.label">{{ label('mood') }}</span><select v-model="mood" :class="$style.select"><option value="">{{ label('notSet') }}</option><option value="great">{{ label('moodGreat') }}</option><option value="good">{{ label('moodGood') }}</option><option value="neutral">{{ label('moodNeutral') }}</option><option value="tired">{{ label('moodTired') }}</option><option value="frustrated">{{ label('moodFrustrated') }}</option></select></label>
				<label :class="$style.field"><span :class="$style.label">{{ label('character') }}</span><input v-model="character" :class="$style.input" maxlength="512"></label>
				<label :class="$style.field"><span :class="$style.label">{{ label('weapon') }}</span><input v-model="weapon" :class="$style.input" maxlength="512"></label>
				<label :class="$style.field"><span :class="$style.label">{{ label('weaponOrder') }}</span><textarea v-model="weaponOrderText" :class="[$style.input, $style.listInput]" rows="2" maxlength="2048" :placeholder="label('commaSeparated')"></textarea></label>
				<label v-if="sessionKind === 'game_play'" :class="$style.field"><span :class="$style.label">{{ label('playMode') }}</span><select v-model="playMode" :class="$style.select"><option value="">{{ label('notSet') }}</option><option value="single">{{ label('single') }}</option><option value="multi">{{ label('multi') }}</option></select></label>
				<label v-if="sessionKind === 'game_play'" :class="$style.field"><span :class="$style.label">{{ label('matchmaking') }}</span><select v-model="matchmaking" :class="$style.select"><option value="">{{ label('notSet') }}</option><option value="random">{{ label('random') }}</option><option value="solo">{{ label('solo') }}</option><option value="party">{{ label('party') }}</option><option value="specific">{{ label('specific') }}</option></select></label>
				<label v-if="sessionKind === 'game_play'" :class="$style.field"><span :class="$style.label">{{ label('rank') }}</span><input v-model="rank" :class="$style.input" maxlength="512"></label>
				<label v-if="sessionKind === 'game_play'" :class="$style.field"><span :class="$style.label">{{ label('rating') }}</span><input v-model.number="rating" type="number" :class="$style.input"></label>
				<label v-if="sessionKind === 'game_play'" :class="[$style.field, $style.full]"><span :class="$style.label">{{ label('achievements') }}</span><textarea v-model="achievementsText" :class="[$style.input, $style.listInput]" rows="2" maxlength="2048" :placeholder="label('commaSeparated')"></textarea></label>
			</div>

			<!-- 旗鯖fork(Hatady次期: 追加/編集画面の改善): 対戦記録は項目数が多いため、
			     「対戦相手」「試合内容」「結果・成績」の3グループに分けて見通しを良くする。
			     フィールドとバインディングは変更していない(グルーピングのみ)。 -->
			<section v-if="sessionKind === 'game_match'" :class="$style.subSection" data-session-kind="game_match">
				<div :class="$style.subTitle"><i class="ti ti-swords"></i> {{ label('matchDetails') }}</div>
				<div :class="$style.miniLabel"><i class="ti ti-user-shield"></i> {{ label('opponentGroup') }}</div>
				<div :class="$style.grid">
					<label :class="$style.field"><span :class="$style.label">{{ label('opponentType') }}</span><select v-model="opponentType" :class="$style.select"><option value="">{{ label('notSet') }}</option><option value="human">{{ label('human') }}</option><option value="cpu">{{ label('cpu') }}</option><option value="team">{{ label('team') }}</option><option value="other">{{ label('other') }}</option></select></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('matchmaking') }}</span><select v-model="matchmaking" :class="$style.select"><option value="">{{ label('notSet') }}</option><option value="random">{{ label('random') }}</option><option value="solo">{{ label('solo') }}</option><option value="party">{{ label('party') }}</option><option value="specific">{{ label('specific') }}</option></select></label>
					<label :class="[$style.field, $style.full]"><span :class="$style.label">{{ label('opponent') }}</span><input v-model="opponent" :class="$style.input" maxlength="512"></label>
				</div>
				<div :class="[$style.miniLabel, $style.miniLabelSpaced]"><i class="ti ti-map-2"></i> {{ label('matchSetupGroup') }}</div>
				<div :class="$style.grid">
					<label :class="$style.field"><span :class="$style.label">{{ label('mode') }}</span><input v-model="matchMode" :class="$style.input" maxlength="512"></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('map') }}</span><input v-model="mapName" :class="$style.input" maxlength="512"></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('bestOf') }}</span><input v-model.number="bestOf" type="number" min="0" max="1000000" :class="$style.input"></label>
				</div>
				<label :class="$style.check"><input v-model="overtime" type="checkbox"> <i class="ti ti-clock-plus"></i> {{ label('overtime') }}</label>
				<div :class="[$style.miniLabel, $style.miniLabelSpaced]"><i class="ti ti-trophy"></i> {{ label('resultGroup') }}</div>
				<div :class="$style.grid">
					<label :class="$style.field"><span :class="$style.label">{{ label('result') }}</span><select v-model="result" :class="$style.select"><option value="">{{ label('notSet') }}</option><option value="win">{{ label('win') }}</option><option value="loss">{{ label('loss') }}</option><option value="draw">{{ label('draw') }}</option></select></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('reason') }}</span><input v-model="reason" :class="$style.input" maxlength="512"></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('score') }}</span><input v-model="score" :class="$style.input" maxlength="512"></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('rank') }}</span><input v-model="rank" :class="$style.input" maxlength="512"></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('killsDeathsAssists') }}</span><span :class="$style.triple"><input v-model.number="kills" type="number" min="0" :class="$style.input"><input v-model.number="deaths" type="number" min="0" :class="$style.input"><input v-model.number="assists" type="number" min="0" :class="$style.input"></span></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('ratingBeforeAfter') }}</span><span :class="$style.double"><input v-model.number="ratingBefore" type="number" :class="$style.input"><input v-model.number="ratingAfter" type="number" :class="$style.input"></span></label>
					<label :class="[$style.field, $style.full]"><span :class="$style.label">{{ label('roundResults') }}</span><textarea v-model="roundResultsText" :class="[$style.input, $style.listInput]" rows="2" maxlength="4096" :placeholder="label('commaSeparated')"></textarea></label>
				</div>
			</section>

			<!-- 旗鯖fork(Hatady次期): ローグライク記録も「結果」「経路・構成」の2グループに分け、
			     元は1行に詰まっていたマークアップを可読な形へ整形した(フィールド自体は変更なし)。 -->
			<section v-if="sessionKind === 'game_roguelike'" :class="$style.subSection" data-session-kind="game_roguelike">
				<div :class="$style.subTitle"><i class="ti ti-route-square"></i> {{ label('runDetails') }}</div>
				<div :class="$style.miniLabel"><i class="ti ti-flag"></i> {{ label('runResultGroup') }}</div>
				<div :class="$style.grid">
					<label :class="$style.field"><span :class="$style.label">{{ label('result') }}</span><select v-model="result" :class="$style.select"><option value="">{{ label('notSet') }}</option><option value="cleared">{{ label('cleared') }}</option><option value="failed">{{ label('failed') }}</option><option value="retired">{{ label('retired') }}</option></select></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('cause') }}</span><input v-model="cause" :class="$style.input" maxlength="512"></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('floor') }}</span><input v-model.number="floor" type="number" min="0" max="1000000" :class="$style.input"></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('runNumber') }}</span><input v-model.number="runNumber" type="number" min="0" max="1000000" :class="$style.input"></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('difficulty') }}</span><input v-model="difficulty" :class="$style.input" maxlength="512"></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('seed') }}</span><input v-model="seed" :class="$style.input" maxlength="512"></label>
				</div>
				<div :class="[$style.miniLabel, $style.miniLabelSpaced]"><i class="ti ti-map"></i> {{ label('routeGroup') }}</div>
				<div :class="$style.grid">
					<label :class="$style.field"><span :class="$style.label">{{ label('route') }}</span><input v-model="route" :class="$style.input" maxlength="512"></label>
					<label :class="[$style.field, $style.full]"><span :class="$style.label">{{ label('build') }}</span><input v-model="build" :class="$style.input" maxlength="512"></label>
					<label :class="[$style.field, $style.full]"><span :class="$style.label">{{ label('branches') }}</span><textarea v-model="branchesText" :class="[$style.input, $style.listInput]" rows="2" maxlength="2048" :placeholder="label('commaSeparated')"></textarea></label>
				</div>
			</section>
		</template>

		<label :class="$style.noteField"><span :class="$style.label">{{ label('sessionNote') }}</span><textarea v-model="note" :class="$style.textarea" rows="5" maxlength="4096"></textarea></label>
		<label :class="$style.check"><input v-model="noteSpoiler" type="checkbox"> <i class="ti ti-eye-off"></i> {{ label('containsSpoiler') }}</label>

		<div :class="$style.footer">
			<button type="button" :class="[$style.btn, $style.btnGhost]" :disabled="saving" @click="dialog?.close()">{{ copy.cancel }}</button>
			<button type="button" :class="[$style.btn, $style.btnPrimary]" :disabled="saving" @click="submit"><i class="ti ti-check"></i> {{ isEdit ? label('update') : label('saveSession') }}</button>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { computed, ref, useTemplateRef } from 'vue';
import type { HatadyMediaSession, HatadyMediaSessionKind, HatadyMediaVisibility, HatadyMediaWork, HatadyMovieViewingMode } from '@/utility/hatady-media.js';
import MkWindow from '@/components/MkWindow.vue';
import HyMediaCover from '@/components/HyMediaCover.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { hatadyTheme } from '@/utility/hatady-prefs.js';
import { hatadyMediaCopy, mediaSessionDetailsPayload, mediaSessionTypes, normalizeMediaList } from '@/utility/hatady-media.js';

const props = defineProps<{ work: HatadyMediaWork; editSession?: HatadyMediaSession | null }>();
const emit = defineEmits<{ (ev: 'done', session: HatadyMediaSession): void; (ev: 'closed'): void }>();
const dialog = useTemplateRef('dialog');
const theme = hatadyTheme;
const copy = hatadyMediaCopy();
const mediaApi = misskeyApi as unknown as (endpoint: string, payload: Record<string, unknown>) => Promise<any>;
const work = props.work;
const source = props.editSession;
const isEdit = source != null;

function label(key: string): string { return String(copy.session?.[key] ?? copy[key] ?? key); }

function localNow(): string { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }

function toLocal(iso: string): string { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }

function optional(value: string): string | undefined { return value.trim() || undefined; }

function optionalInt(value: number | null): number | undefined { return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : undefined; }

function detailString(key: string): string { return typeof source?.details?.[key] === 'string' ? String(source.details[key]) : ''; }

function detailBoolean(key: string): boolean { return source?.details?.[key] === true; }

function detailNumber(key: string): number | null { return typeof source?.details?.[key] === 'number' ? Number(source.details[key]) : null; }

function detailArray(key: string): string { return Array.isArray(source?.details?.[key]) ? (source!.details![key] as unknown[]).map(String).join('\n') : ''; }

const sessionKind = ref<HatadyMediaSessionKind>(source?.kind ?? (work.kind === 'movie' ? 'movie_viewing' : 'game_play'));
const occurredAtLocal = ref(source?.occurredAt ? toLocal(source.occurredAt) : localNow());
const durationMinutes = ref<number>(Number(source?.durationMinutes ?? (work.kind === 'movie' ? work.runtimeMinutes ?? 0 : 0)));
const note = ref(String(source?.note ?? ''));
const noteSpoiler = ref(Boolean(source?.noteSpoiler));
const visibility = ref<HatadyMediaVisibility>(source?.visibility ?? 'private');
// 映画 details
const viewingMode = ref<HatadyMovieViewingMode | ''>((detailString('viewingMode') as HatadyMovieViewingMode | '') || work.viewingMode || '');
const theaterName = ref(detailString('theaterName'));
const screeningFormat = ref(detailString('screeningFormat'));
const companionsText = ref(detailArray('companions'));
const rewatch = ref(detailBoolean('rewatch'));
// ゲーム details（映画分岐の DOM には生成しない）
const progress = ref(detailString('progress'));
const difficulty = ref(detailString('difficulty'));
const device = ref(detailString('device'));
const rank = ref(detailString('rank'));
const rating = ref<number | null>(detailNumber('rating'));
const playMode = ref(detailString('playMode'));
const matchmaking = ref(detailString('matchmaking'));
const mood = ref(detailString('mood'));
const achievementsText = ref(detailArray('achievements'));
const character = ref(detailString('character'));
const weapon = ref(detailString('weapon'));
const weaponOrderText = ref(detailArray('weaponOrder'));
const opponentType = ref(detailString('opponentType'));
const opponent = ref(detailString('opponent'));
const result = ref(detailString('result'));
const reason = ref(detailString('reason'));
const score = ref(detailString('score'));
const matchMode = ref(detailString('mode'));
const mapName = ref(detailString('map'));
const roundResultsText = ref(detailArray('roundResults'));
const bestOf = ref(detailNumber('bestOf'));
const kills = ref(detailNumber('kills'));
const deaths = ref(detailNumber('deaths'));
const assists = ref(detailNumber('assists'));
const ratingBefore = ref(detailNumber('ratingBefore'));
const ratingAfter = ref(detailNumber('ratingAfter'));
const overtime = ref(detailBoolean('overtime'));
const seed = ref(detailString('seed'));
const floor = ref(detailNumber('floor'));
const route = ref(detailString('route'));
const branchesText = ref(detailArray('branches'));
const runNumber = ref(detailNumber('runNumber'));
const build = ref(detailString('build'));
const cause = ref(detailString('cause'));
const saving = ref(false);

const gameSessionTypes = computed(() => mediaSessionTypes('game'));

function sessionKindLabel(type: HatadyMediaSessionKind): string {
	return String(copy.session?.types?.[type] ?? type);
}

async function submit() {
	if (saving.value) return;
	saving.value = true;
	try {
		const common: Record<string, unknown> = {
			...(isEdit ? { sessionId: source!.id } : { workId: work.id, kind: sessionKind.value }),
			occurredAt: new Date(occurredAtLocal.value).toISOString(),
			durationMinutes: Number(durationMinutes.value) > 0 ? Math.floor(Number(durationMinutes.value)) : null,
			note: note.value.trim() || null,
			noteSpoiler: noteSpoiler.value,
			visibility: visibility.value,
		};
		const detailValues: Record<string, unknown> = {
			theaterName: optional(theaterName.value),
			screeningFormat: optional(screeningFormat.value),
			companions: normalizeMediaList(companionsText.value),
			rewatch: rewatch.value,
			viewingMode: viewingMode.value || undefined,
			playMode: optional(playMode.value),
			matchmaking: optional(matchmaking.value),
			progress: optional(progress.value),
			difficulty: optional(difficulty.value),
			device: optional(device.value),
			rank: optional(rank.value),
			rating: rating.value ?? undefined,
			mood: optional(mood.value),
			achievements: normalizeMediaList(achievementsText.value),
			character: optional(character.value),
			weapon: optional(weapon.value),
			weaponOrder: normalizeMediaList(weaponOrderText.value),
			result: result.value || undefined,
			reason: optional(reason.value),
			opponentType: optional(opponentType.value),
			opponent: optional(opponent.value),
			score: optional(score.value),
			mode: optional(matchMode.value),
			map: optional(mapName.value),
			roundResults: normalizeMediaList(roundResultsText.value),
			bestOf: optionalInt(bestOf.value),
			kills: optionalInt(kills.value),
			deaths: optionalInt(deaths.value),
			assists: optionalInt(assists.value),
			ratingBefore: ratingBefore.value ?? undefined,
			ratingAfter: ratingAfter.value ?? undefined,
			overtime: overtime.value,
			seed: optional(seed.value),
			floor: optionalInt(floor.value),
			route: optional(route.value),
			branches: normalizeMediaList(branchesText.value),
			build: optional(build.value),
			runNumber: optionalInt(runNumber.value),
			cause: optional(cause.value),
		};
		const details = mediaSessionDetailsPayload(work.kind, sessionKind.value, detailValues);
		const session = await mediaApi(isEdit ? 'hata/hatady/media/sessions/update' : 'hata/hatady/media/sessions/create', { ...common, details }) as HatadyMediaSession;
		os.success();
		emit('done', session);
		dialog.value?.close();
	} catch {
		os.alert({ type: 'error', text: label('saveFailed') });
	} finally { saving.value = false; }
}
</script>

<style lang="scss" module>
.body { min-height: 100%; padding: 19px; box-sizing: border-box; container-type: inline-size; background: var(--hy-bg); color: var(--hy-body); font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif; }
.workHead { display: flex; align-items: center; gap: 14px; padding: 12px; margin-bottom: 17px; border: 1px solid var(--hy-border); border-radius: 13px; background: var(--hy-surface); }
.workHead > div { min-width: 0; }
.workKind { margin-bottom: 3px; color: var(--hy-muted); font-size: 10.5px; font-weight: 700; }
.workTitle { overflow-wrap: anywhere; color: var(--hy-ink); font-family: var(--hy-serif); font-size: 16px; font-weight: 600; }
.typeChooser { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 16px; }
.typeBtn { display: flex; align-items: center; justify-content: center; gap: 6px; min-width: 0; padding: 9px 8px; border: 1px solid var(--hy-border); border-radius: 999px; background: var(--hy-surface); color: var(--hy-body); font-family: var(--hy-heading); font-size: 11.5px; font-weight: 700; cursor: pointer; }
.typeBtnOn { border-color: var(--hy-accent); background: color-mix(in srgb, var(--hy-accent) 14%, var(--hy-surface)); color: var(--hy-accent-ink); }
.typeBtn:disabled { cursor: default; opacity: .78; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; }
.double, .triple { display: grid; gap: 6px; }
.double { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.triple { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.field, .noteField { display: flex; flex-direction: column; min-width: 0; gap: 7px; }
.label { color: var(--hy-ink); font-family: var(--hy-heading); font-size: 12px; font-weight: 700; }
.input, .select, .textarea { width: 100%; min-width: 0; box-sizing: border-box; padding: 9px 11px; border: 1px solid var(--hy-border); border-radius: 9px; outline: none; background: var(--hy-surface); color: var(--hy-ink); font: inherit; }
.input:focus, .select:focus, .textarea:focus { border-color: var(--hy-accent); }
.listInput { resize: vertical; line-height: 1.5; }
.full { grid-column: 1 / -1; }
.subSection { margin-top: 15px; padding: 14px; border: 1px solid var(--hy-border); border-radius: 12px; background: var(--hy-surface-2); }
.subTitle { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; color: var(--hy-ink); font-family: var(--hy-heading); font-size: 12.5px; font-weight: 800; }
.subTitle i { color: var(--hy-accent); }
/* 旗鯖fork(Hatady次期): 対戦/ローグライク記録の項目群を意味のかたまりに分けるための小見出し。
   subSection の内側でだけ使う軽量な区切り(枠は付けず、subTitle より一段軽い扱い)。 */
.miniLabel { display: flex; align-items: center; gap: 5px; margin-bottom: 9px; color: var(--hy-muted); font-family: var(--hy-heading); font-size: 10.5px; font-weight: 700; letter-spacing: .02em; }
.miniLabel i { color: var(--hy-accent); font-size: 12px; }
.miniLabelSpaced { margin-top: 15px; }
.noteField { margin-top: 16px; }
.textarea { min-height: 108px; resize: vertical; line-height: 1.6; }
.check { display: inline-flex; align-items: center; gap: 5px; margin-top: 11px; color: var(--hy-body); font-size: 11.5px; cursor: pointer; }
.check input { accent-color: var(--hy-accent); }
.footer { position: sticky; bottom: -19px; display: flex; justify-content: flex-end; gap: 9px; margin: 18px -19px -19px; padding: 13px 19px; border-top: 1px solid var(--hy-border); background: var(--hy-bg); }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 19px; border: 1px solid var(--hy-border); border-radius: 999px; background: var(--hy-surface); color: var(--hy-ink); font-family: var(--hy-heading); font-weight: 700; cursor: pointer; }
.btn:disabled { opacity: .48; }
.btnPrimary { border-color: transparent; background: var(--hy-accent); color: #fff; }
.btnGhost { background: transparent; }
@container (max-width: 500px) {
	.body { padding: 15px; }
	.grid { grid-template-columns: 1fr; }
	.double, .triple { grid-template-columns: 1fr; }
	.full { grid-column: auto; }
	.typeChooser { grid-template-columns: 1fr; }
	.footer { bottom: -15px; margin: 18px -15px -15px; padding: 12px 15px; }
}
</style>
