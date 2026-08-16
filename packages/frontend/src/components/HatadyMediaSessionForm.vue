<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
Hatady の鑑賞・プレイセッション追加/編集ウィンドウ。
-->
<template>
<MkWindow ref="dialog" :initialWidth="600" :initialHeight="680" :canResize="true" @closed="emit('closed')">
	<template #header><i :class="['ti', work.kind === 'movie' ? 'ti-player-play' : 'ti-device-gamepad-2']"></i> {{ isEdit ? label('editSession') : work.kind === 'movie' ? label('addViewing') : label('addPlay') }}</template>
	<div class="hatady-scope" :data-hatady-theme="theme" :class="$style.body">
		<!-- 旗鯖fork(Hatady): 同じ作品の過去の記録から集めた入力候補。各入力の list= から参照する。 -->
		<datalist v-for="(values, key) in suggestions" :id="suggestionListId(key)" :key="key">
			<option v-for="value in values" :key="value" :value="value"></option>
		</datalist>

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

		<!--
		旗鯖fork(Hatady): ゲーム記録の作り替え。以前は最大20項目を一枚の平らなグリッドに並べていて、
		どれが「その回の結果」でどれが「任意の細目」なのか読み取れなかった。
		いまは (1)結果と気分を大きなボタンで最初に決め、(2)残りは「詳しく記録する」に畳む、の2層構成にする。
		項目そのものは1つも減らしていない(保存される details のキーは従来と同一)。
		-->
		<template v-else>
			<div :class="$style.typeChooser">
				<button v-for="option in gameSessionTypes" :key="option" type="button" :disabled="isEdit" :class="[$style.typeBtn, sessionKind === option && $style.typeBtnOn]" @click="sessionKind = option">
					<i :class="['ti', option === 'game_play' ? 'ti-player-play' : option === 'game_match' ? 'ti-swords' : option === 'game_pve' ? 'ti-users' : 'ti-route-square']"></i>
					{{ sessionKindLabel(option) }}
				</button>
			</div>

			<section :class="$style.subSection" :data-session-kind="sessionKind">
				<div :class="$style.subTitle"><i class="ti ti-target"></i> {{ label('outcomeGroup') }}</div>

				<!-- 勝敗/踏破結果は記録の主役なので、選択肢を畳まず並べて1タップで決められるようにする。 -->
				<div v-if="sessionKind !== 'game_play'" :class="$style.choiceField">
					<span :class="$style.label">{{ label('result') }}</span>
					<div :class="$style.segmented">
						<button v-for="option in resultOptions" :key="option.value" type="button" :class="[$style.segBtn, result === option.value && $style.segBtnOn]" @click="result = option.value">
							<i :class="['ti', option.icon]"></i> {{ label(option.labelKey) }}
						</button>
					</div>
				</div>

				<div :class="[$style.choiceField, $style.choiceFieldSpaced]">
					<span :class="$style.label">{{ label('mood') }}</span>
					<div :class="$style.segmented">
						<button v-for="option in moodOptions" :key="option.value" type="button" :class="[$style.segBtn, mood === option.value && $style.segBtnOn]" @click="mood = option.value">
							<i :class="['ti', option.icon]"></i> {{ label(option.labelKey) }}
						</button>
					</div>
				</div>

				<!-- 数値は「どの欄が何か」が分かるよう、1マスごとに小見出しを付ける。 -->
				<div v-if="sessionKind === 'game_match'" :class="[$style.grid, $style.gridSpaced]">
					<label :class="$style.field"><span :class="$style.label">{{ label('score') }}</span><input v-model="score" :class="$style.input" maxlength="512"></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('reason') }}</span><input v-model="reason" :class="$style.input" maxlength="512"></label>
					<div :class="$style.field">
						<span :class="$style.label">{{ label('teamComposition') }}</span>
						<div :class="$style.double">
							<label :class="$style.subNum"><span :class="$style.subNumLabel">{{ label('teamSize') }}</span><input v-model.number="teamSize" type="number" min="1" max="100" :class="$style.input" :list="suggestionListId('teamSize')"></label>
							<label :class="$style.subNum"><span :class="$style.subNumLabel">{{ label('opponentSize') }}</span><input v-model.number="opponentSize" type="number" min="1" max="100" :class="$style.input" :list="suggestionListId('opponentSize')"></label>
						</div>
					</div>
					<div :class="$style.field">
						<span :class="$style.label">{{ label('ratingChange') }}</span>
						<div :class="$style.double">
							<label :class="$style.subNum"><span :class="$style.subNumLabel">{{ label('ratingBefore') }}</span><input v-model.number="ratingBefore" type="number" :class="$style.input"></label>
							<label :class="$style.subNum"><span :class="$style.subNumLabel">{{ label('ratingAfter') }}</span><input v-model.number="ratingAfter" type="number" :class="$style.input"></label>
						</div>
					</div>
				</div>

				<!-- 旗鯖fork(Hatady): PvE は敵の構成が結果の意味を決めるので、結果と同じ枠に置く。 -->
				<div v-if="sessionKind === 'game_pve'" :class="[$style.grid, $style.gridSpaced]">
					<label :class="$style.field"><span :class="$style.label">{{ label('teamSize') }}</span><input v-model.number="teamSize" type="number" min="1" max="100" :class="$style.input" :list="suggestionListId('teamSize')"></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('waves') }}</span><input v-model.number="waves" type="number" min="0" max="1000000" :class="$style.input" :list="suggestionListId('waves')"></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('enemyCount') }}</span><input v-model.number="enemyCount" type="number" min="0" max="1000000" :class="$style.input" :list="suggestionListId('enemyCount')"></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('boss') }}</span><input v-model="boss" :class="$style.input" maxlength="512" :list="suggestionListId('boss')"></label>
					<label :class="[$style.field, $style.full]"><span :class="$style.label">{{ label('reason') }}</span><input v-model="reason" :class="$style.input" maxlength="512"></label>
					<div :class="[$style.field, $style.full]">
						<span :class="$style.label">{{ label('enemyTypes') }}</span>
						<HyTagInput v-model="enemyTypes" :suggestions="suggestionsFor('enemyTypes')" :addLabel="label('tagAdd')" :removeLabel="label('tagRemove')" :placeholder="label('tagInputHint')"/>
					</div>
				</div>

				<div v-if="sessionKind === 'game_roguelike'" :class="[$style.grid, $style.gridSpaced]">
					<label :class="$style.field"><span :class="$style.label">{{ label('cause') }}</span><input v-model="cause" :class="$style.input" maxlength="512"></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('floor') }}</span><input v-model.number="floor" type="number" min="0" max="1000000" :class="$style.input"></label>
					<label :class="$style.field"><span :class="$style.label">{{ label('runNumber') }}</span><input v-model.number="runNumber" type="number" min="0" max="1000000" :class="$style.input"></label>
				</div>
			</section>

			<!--
			旗鯖fork(Hatady): 武器ごとの成績表。作品によって存在する指標が違う(スペシャルや救助が無い作品もある)ため、
			どの指標を記録するかはチェックボックスで記録ごとに選ぶ。合計は入力から自動で出す。
			-->
			<section v-if="showsWeaponStats" :class="$style.subSection" data-session-stats="weapon">
				<div :class="$style.subTitle"><i class="ti ti-crosshair"></i> {{ label('weaponStatsGroup') }}</div>
				<HyWeaponStatsTable v-model:rows="weaponStats" v-model:fields="statFields" :weaponSuggestions="suggestionsFor('weapon')" :copy="weaponStatsCopy"/>
			</section>

			<!-- 任意の細目は既定で畳む。編集時は中身が入っていれば開いた状態で出す(消えたと誤解させないため)。 -->
			<details :class="$style.more" :open="advancedInitiallyOpen">
				<summary :class="$style.moreSummary">
					<i :class="['ti', 'ti-chevron-down', $style.moreChevron]"></i>
					<span>{{ label('moreDetails') }}</span>
					<small>{{ label('moreDetailsHint') }}</small>
				</summary>
				<div :class="$style.moreBody">
					<div :class="$style.miniLabel"><i class="ti ti-user-circle"></i> {{ label('gearGroup') }}</div>
					<div :class="$style.grid">
						<label :class="$style.field"><span :class="$style.label">{{ label('character') }}</span><input v-model="character" :class="$style.input" maxlength="512" :list="suggestionListId('character')"></label>
						<label :class="$style.field"><span :class="$style.label">{{ label('weapon') }}</span><input v-model="weapon" :class="$style.input" maxlength="512" :list="suggestionListId('weapon')"></label>
						<label :class="[$style.field, $style.full]"><span :class="$style.label">{{ label('device') }}</span><input v-model="device" :class="$style.input" maxlength="512" :list="suggestionListId('device')"></label>
					</div>
					<div :class="[$style.field, $style.fieldSpaced]">
						<span :class="$style.label">{{ label('weaponOrder') }}</span>
						<HyTagInput v-model="weaponOrder" :suggestions="suggestionsFor('weaponOrder')" ordered :addLabel="label('tagAdd')" :removeLabel="label('tagRemove')" :placeholder="label('tagInputHint')"/>
					</div>

					<template v-if="sessionKind === 'game_play'">
						<div :class="[$style.miniLabel, $style.miniLabelSpaced]"><i class="ti ti-settings-2"></i> {{ label('playDetailGroup') }}</div>
						<div :class="$style.grid">
							<label :class="$style.field"><span :class="$style.label">{{ label('progress') }}</span><input v-model="progress" :class="$style.input" :placeholder="label('progressHint')" maxlength="512" :list="suggestionListId('progress')"></label>
							<label :class="$style.field"><span :class="$style.label">{{ label('difficulty') }}</span><input v-model="difficulty" :class="$style.input" maxlength="512" :list="suggestionListId('difficulty')"></label>
							<label :class="$style.field"><span :class="$style.label">{{ label('playMode') }}</span><select v-model="playMode" :class="$style.select"><option value="">{{ label('notSet') }}</option><option value="single">{{ label('single') }}</option><option value="multi">{{ label('multi') }}</option></select></label>
							<label :class="$style.field"><span :class="$style.label">{{ label('matchmaking') }}</span><select v-model="matchmaking" :class="$style.select"><option value="">{{ label('notSet') }}</option><option value="random">{{ label('random') }}</option><option value="solo">{{ label('solo') }}</option><option value="party">{{ label('party') }}</option><option value="specific">{{ label('specific') }}</option></select></label>
							<label :class="$style.field"><span :class="$style.label">{{ label('rank') }}</span><input v-model="rank" :class="$style.input" maxlength="512" :list="suggestionListId('rank')"></label>
							<label :class="$style.field"><span :class="$style.label">{{ label('rating') }}</span><input v-model.number="rating" type="number" :class="$style.input"></label>
						</div>
						<div :class="[$style.field, $style.fieldSpaced]">
							<span :class="$style.label">{{ label('achievements') }}</span>
							<HyTagInput v-model="achievements" :suggestions="suggestionsFor('achievements')" :addLabel="label('tagAdd')" :removeLabel="label('tagRemove')" :placeholder="label('tagInputHint')"/>
						</div>
					</template>

					<template v-if="sessionKind === 'game_match'">
						<div :class="[$style.miniLabel, $style.miniLabelSpaced]"><i class="ti ti-user-shield"></i> {{ label('opponentGroup') }}</div>
						<div :class="$style.grid">
							<label :class="$style.field"><span :class="$style.label">{{ label('opponentType') }}</span><select v-model="opponentType" :class="$style.select"><option value="">{{ label('notSet') }}</option><option value="human">{{ label('human') }}</option><option value="cpu">{{ label('cpu') }}</option><option value="team">{{ label('team') }}</option><option value="other">{{ label('other') }}</option></select></label>
							<label :class="$style.field"><span :class="$style.label">{{ label('matchmaking') }}</span><select v-model="matchmaking" :class="$style.select"><option value="">{{ label('notSet') }}</option><option value="random">{{ label('random') }}</option><option value="solo">{{ label('solo') }}</option><option value="party">{{ label('party') }}</option><option value="specific">{{ label('specific') }}</option></select></label>
							<label :class="[$style.field, $style.full]"><span :class="$style.label">{{ label('opponent') }}</span><input v-model="opponent" :class="$style.input" maxlength="512" :list="suggestionListId('opponent')"></label>
						</div>
						<div :class="[$style.miniLabel, $style.miniLabelSpaced]"><i class="ti ti-map-2"></i> {{ label('matchSetupGroup') }}</div>
						<div :class="$style.grid">
							<label :class="$style.field"><span :class="$style.label">{{ label('mode') }}</span><input v-model="matchMode" :class="$style.input" maxlength="512" :list="suggestionListId('mode')"></label>
							<label :class="$style.field"><span :class="$style.label">{{ label('map') }}</span><input v-model="mapName" :class="$style.input" maxlength="512" :list="suggestionListId('map')"></label>
							<label :class="$style.field"><span :class="$style.label">{{ label('bestOf') }}</span><input v-model.number="bestOf" type="number" min="0" max="1000000" :class="$style.input" :list="suggestionListId('bestOf')"></label>
							<label :class="$style.field"><span :class="$style.label">{{ label('rank') }}</span><input v-model="rank" :class="$style.input" maxlength="512" :list="suggestionListId('rank')"></label>
						</div>
						<label :class="$style.check"><input v-model="overtime" type="checkbox"> <i class="ti ti-clock-plus"></i> {{ label('overtime') }}</label>
						<div :class="[$style.field, $style.fieldSpaced]">
							<span :class="$style.label">{{ label('roundResults') }}</span>
							<HyTagInput v-model="roundResults" :suggestions="suggestionsFor('roundResults')" ordered :addLabel="label('tagAdd')" :removeLabel="label('tagRemove')" :placeholder="label('tagInputHint')"/>
						</div>
					</template>

					<template v-if="sessionKind === 'game_pve'">
						<div :class="[$style.miniLabel, $style.miniLabelSpaced]"><i class="ti ti-settings-2"></i> {{ label('playDetailGroup') }}</div>
						<div :class="$style.grid">
							<label :class="$style.field"><span :class="$style.label">{{ label('difficulty') }}</span><input v-model="difficulty" :class="$style.input" maxlength="512" :list="suggestionListId('difficulty')"></label>
							<label :class="$style.field"><span :class="$style.label">{{ label('mode') }}</span><input v-model="matchMode" :class="$style.input" maxlength="512" :list="suggestionListId('mode')"></label>
							<label :class="$style.field"><span :class="$style.label">{{ label('map') }}</span><input v-model="mapName" :class="$style.input" maxlength="512" :list="suggestionListId('map')"></label>
							<label :class="$style.field"><span :class="$style.label">{{ label('rank') }}</span><input v-model="rank" :class="$style.input" maxlength="512" :list="suggestionListId('rank')"></label>
							<label :class="[$style.field, $style.full]"><span :class="$style.label">{{ label('score') }}</span><input v-model="score" :class="$style.input" maxlength="512"></label>
						</div>
						<div :class="[$style.field, $style.fieldSpaced]">
							<span :class="$style.label">{{ label('achievements') }}</span>
							<HyTagInput v-model="achievements" :suggestions="suggestionsFor('achievements')" :addLabel="label('tagAdd')" :removeLabel="label('tagRemove')" :placeholder="label('tagInputHint')"/>
						</div>
					</template>

					<template v-if="sessionKind === 'game_roguelike'">
						<div :class="[$style.miniLabel, $style.miniLabelSpaced]"><i class="ti ti-dice"></i> {{ label('runSetupGroup') }}</div>
						<div :class="$style.grid">
							<label :class="$style.field"><span :class="$style.label">{{ label('difficulty') }}</span><input v-model="difficulty" :class="$style.input" maxlength="512" :list="suggestionListId('difficulty')"></label>
							<label :class="$style.field"><span :class="$style.label">{{ label('seed') }}</span><input v-model="seed" :class="$style.input" maxlength="512"></label>
						</div>
						<div :class="[$style.miniLabel, $style.miniLabelSpaced]"><i class="ti ti-map"></i> {{ label('routeGroup') }}</div>
						<div :class="$style.grid">
							<label :class="$style.field"><span :class="$style.label">{{ label('route') }}</span><input v-model="route" :class="$style.input" maxlength="512" :list="suggestionListId('route')"></label>
							<label :class="[$style.field, $style.full]"><span :class="$style.label">{{ label('build') }}</span><input v-model="build" :class="$style.input" maxlength="512" :list="suggestionListId('build')"></label>
						</div>
						<div :class="[$style.field, $style.fieldSpaced]">
							<span :class="$style.label">{{ label('branches') }}</span>
							<HyTagInput v-model="branches" :suggestions="suggestionsFor('branches')" ordered :addLabel="label('tagAdd')" :removeLabel="label('tagRemove')" :placeholder="label('tagInputHint')"/>
						</div>
					</template>
				</div>
			</details>
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
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import type { HatadyMediaSession, HatadyMediaSessionKind, HatadyMediaSuggestions, HatadyMediaVisibility, HatadyMediaWork, HatadyMovieViewingMode, HatadyStatField, HatadyWeaponStatRow } from '@/utility/hatady-media.js';
import MkWindow from '@/components/MkWindow.vue';
import HyMediaCover from '@/components/HyMediaCover.vue';
import HyTagInput from '@/components/HyTagInput.vue';
import HyWeaponStatsTable from '@/components/HyWeaponStatsTable.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { hatadyTheme } from '@/utility/hatady-prefs.js';
import { HATADY_STAT_FIELDS, collectMediaSessionSuggestions, hatadyMediaCopy, mediaSessionDetailsPayload, mediaSessionTypes, mediaStatFields, mediaWeaponStatRows, normalizeMediaList } from '@/utility/hatady-media.js';

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

// チップ入力は配列のまま扱う(表示順がそのまま保存順になる)。
function detailList(key: string): string[] { return Array.isArray(source?.details?.[key]) ? (source!.details![key] as unknown[]).map(String).filter(Boolean) : []; }

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
const achievements = ref<string[]>(detailList('achievements'));
const character = ref(detailString('character'));
const weapon = ref(detailString('weapon'));
const weaponOrder = ref<string[]>(detailList('weaponOrder'));
const opponentType = ref(detailString('opponentType'));
const opponent = ref(detailString('opponent'));
const result = ref(detailString('result'));
const reason = ref(detailString('reason'));
const score = ref(detailString('score'));
const matchMode = ref(detailString('mode'));
const mapName = ref(detailString('map'));
const roundResults = ref<string[]>(detailList('roundResults'));
const bestOf = ref(detailNumber('bestOf'));
const ratingBefore = ref(detailNumber('ratingBefore'));
const ratingAfter = ref(detailNumber('ratingAfter'));
const overtime = ref(detailBoolean('overtime'));
const seed = ref(detailString('seed'));
const floor = ref(detailNumber('floor'));
const route = ref(detailString('route'));
const branches = ref<string[]>(detailList('branches'));
const runNumber = ref(detailNumber('runNumber'));
const build = ref(detailString('build'));
const cause = ref(detailString('cause'));
// 旗鯖fork(Hatady): 編成人数(4対4など)と、武器ごとの成績表・記録する指標。
const teamSize = ref(detailNumber('teamSize'));
const opponentSize = ref(detailNumber('opponentSize'));
const statFields = ref<HatadyStatField[]>(initialStatFields());
const weaponStats = ref<HatadyWeaponStatRow[]>(initialWeaponStats());
// PvE 固有
const waves = ref(detailNumber('waves'));
const enemyTypes = ref<string[]>(detailList('enemyTypes'));
const enemyCount = ref(detailNumber('enemyCount'));
const boss = ref(detailString('boss'));
const saving = ref(false);

/**
 * 旗鯖fork(Hatady): 合計だけを直下に持っていた旧記録を開いたときは、使っていた武器1本の行として引き継ぐ。
 * 引き継がないと編集画面で数字が消えたように見える。
 */
function initialWeaponStats(): HatadyWeaponStatRow[] {
	const rows = mediaWeaponStatRows(source?.details ?? null);
	if (rows.length > 0) return rows;
	const legacy: HatadyWeaponStatRow = { weapon: detailString('weapon') };
	let hasAny = false;
	for (const field of HATADY_STAT_FIELDS) {
		const value = source?.details?.[field];
		if (typeof value === 'number' && Number.isFinite(value)) { legacy[field] = value; hasAny = true; }
	}
	return hasAny ? [legacy] : [];
}

/** 記録する指標。保存済みならそれを、無ければ実際に値が入っている指標を、新規作成なら定番の2つを出す。 */
function initialStatFields(): HatadyStatField[] {
	if (Array.isArray(source?.details?.statFields)) return mediaStatFields(source?.details ?? null);
	const rows = initialWeaponStats();
	const used = HATADY_STAT_FIELDS.filter(field => rows.some(row => typeof row[field] === 'number'));
	return used.length > 0 ? used : ['kills', 'deaths'];
}

const gameSessionTypes = computed(() => mediaSessionTypes('game'));

// 合計は入力から必ず導出する。手計算させず、旧記録の直下キー(kills等)とも整合させ続けるため。
// ⚠️武器名が空の行も合計には数える(名前を書いていないだけで数字は記録済みのため)。保存する行だけを絞る。
const statTotals = computed<Partial<Record<HatadyStatField, number>>>(() => {
	const totals: Partial<Record<HatadyStatField, number>> = {};
	for (const row of weaponStats.value) {
		for (const field of HATADY_STAT_FIELDS) {
			const value = row[field];
			if (typeof value !== 'number' || !Number.isFinite(value)) continue;
			totals[field] = (totals[field] ?? 0) + value;
		}
	}
	return totals;
});
const savableWeaponStats = computed(() => weaponStats.value
	.filter(row => row.weapon.trim().length > 0)
	.map(row => ({ ...row, weapon: row.weapon.trim() })));
// 成績表を出す種別。通常プレイ・ローグライクは1回1構成なので従来どおり単一の武器欄で足りる。
const showsWeaponStats = computed(() => sessionKind.value === 'game_match' || sessionKind.value === 'game_pve');

/**
 * 旗鯖fork(Hatady): 一度使った武器名・ウェーブ数・実績名などを打ち直さずに済むよう、
 * 同じ作品の過去の記録から入力候補を集めて datalist で出す。
 * ⚠️候補は「無くても記録はできる」補助なので、取得に失敗しても黙って諦める(記録を妨げない)。
 */
const suggestions = ref<HatadyMediaSuggestions>({});

function suggestionsFor(key: string): string[] { return suggestions.value[key] ?? []; }

function suggestionListId(key: string): string { return `hy-session-suggest-${work.id}-${key}`; }

onMounted(async () => {
	try {
		const past = await mediaApi('hata/hatady/media/sessions/list', { workId: work.id, limit: 100 });
		if (Array.isArray(past)) suggestions.value = collectMediaSessionSuggestions(past as HatadyMediaSession[]);
	} catch {
		// noop
	}
});

const weaponStatsCopy = computed(() => ({
	statFieldsLabel: label('statFieldsLabel'),
	fieldLabels: Object.fromEntries(HATADY_STAT_FIELDS.map(field => [field, label(field)])) as Record<HatadyStatField, string>,
	weaponLabel: label('weapon'),
	weaponPlaceholder: label('weaponPlaceholder'),
	addRow: label('addWeaponRow'),
	removeRow: label('removeWeaponRow'),
	totalLabel: label('totalLabel'),
	pickAtLeastOne: label('pickAtLeastOne'),
}));

// 結果の選択肢は種別で語彙が変わる。対戦=勝敗、ローグライク=踏破結果。
const MATCH_RESULT_OPTIONS = [
	{ value: '', icon: 'ti-minus', labelKey: 'notSet' },
	{ value: 'win', icon: 'ti-trophy', labelKey: 'win' },
	{ value: 'loss', icon: 'ti-thumb-down', labelKey: 'loss' },
	{ value: 'draw', icon: 'ti-equal', labelKey: 'draw' },
];
const RUN_RESULT_OPTIONS = [
	{ value: '', icon: 'ti-minus', labelKey: 'notSet' },
	{ value: 'cleared', icon: 'ti-circle-check', labelKey: 'cleared' },
	{ value: 'failed', icon: 'ti-skull', labelKey: 'failed' },
	{ value: 'retired', icon: 'ti-player-stop', labelKey: 'retired' },
];
const moodOptions = [
	{ value: '', icon: 'ti-minus', labelKey: 'notSet' },
	{ value: 'great', icon: 'ti-mood-happy', labelKey: 'moodGreat' },
	{ value: 'good', icon: 'ti-mood-smile', labelKey: 'moodGood' },
	{ value: 'neutral', icon: 'ti-mood-neutral', labelKey: 'moodNeutral' },
	{ value: 'tired', icon: 'ti-mood-sad-dizzy', labelKey: 'moodTired' },
	{ value: 'frustrated', icon: 'ti-mood-annoyed', labelKey: 'moodFrustrated' },
];
// PvE は勝敗ではなく踏破結果で終わるので、ローグライクと同じ語彙を使う(バックエンドの検証もこの組)。
const resultOptions = computed(() => sessionKind.value === 'game_match' ? MATCH_RESULT_OPTIONS : RUN_RESULT_OPTIONS);

// 対戦↔ローグライクで結果の語彙が入れ替わるため、種別を変えたら前の選択を持ち越さない。
watch(sessionKind, () => { result.value = ''; });

// 「詳しく記録する」に畳んだ項目。編集で中身があるのに閉じたまま出すと消えたように見えるので、
// その場合だけ最初から開く。値は初期描画時に一度だけ評価する(以後の開閉は利用者の操作に任せる)。
const ADVANCED_DETAIL_KEYS: Record<string, string[]> = {
	game_play: ['progress', 'difficulty', 'playMode', 'matchmaking', 'rank', 'rating', 'achievements', 'character', 'weapon', 'weaponOrder', 'device'],
	game_match: ['matchmaking', 'opponentType', 'opponent', 'mode', 'map', 'bestOf', 'rank', 'overtime', 'roundResults', 'character', 'weapon', 'weaponOrder', 'device'],
	game_roguelike: ['difficulty', 'seed', 'route', 'build', 'branches', 'character', 'weapon', 'weaponOrder', 'device'],
	game_pve: ['difficulty', 'mode', 'map', 'rank', 'score', 'achievements', 'character', 'weapon', 'weaponOrder', 'device'],
};
const advancedInitiallyOpen = isEdit && (ADVANCED_DETAIL_KEYS[sessionKind.value] ?? []).some(key => {
	const value = source?.details?.[key];
	if (value == null || value === '' || value === false) return false;
	if (Array.isArray(value)) return value.length > 0;
	return true;
});

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
			achievements: normalizeMediaList(achievements.value),
			character: optional(character.value),
			weapon: optional(weapon.value),
			weaponOrder: normalizeMediaList(weaponOrder.value),
			result: result.value || undefined,
			reason: optional(reason.value),
			opponentType: optional(opponentType.value),
			opponent: optional(opponent.value),
			score: optional(score.value),
			mode: optional(matchMode.value),
			map: optional(mapName.value),
			roundResults: normalizeMediaList(roundResults.value),
			bestOf: optionalInt(bestOf.value),
			// 成績は武器ごとの行が正本。直下の合計は表示・集計用に必ず導出して書き戻す。
			statFields: statFields.value.length > 0 ? [...statFields.value] : undefined,
			weaponStats: savableWeaponStats.value.length > 0 ? savableWeaponStats.value : undefined,
			kills: statTotals.value.kills,
			deaths: statTotals.value.deaths,
			assists: statTotals.value.assists,
			specials: statTotals.value.specials,
			rescues: statTotals.value.rescues,
			teamSize: optionalInt(teamSize.value),
			opponentSize: optionalInt(opponentSize.value),
			waves: optionalInt(waves.value),
			enemyTypes: normalizeMediaList(enemyTypes.value),
			enemyCount: optionalInt(enemyCount.value),
			boss: optional(boss.value),
			ratingBefore: ratingBefore.value ?? undefined,
			ratingAfter: ratingAfter.value ?? undefined,
			overtime: overtime.value,
			seed: optional(seed.value),
			floor: optionalInt(floor.value),
			route: optional(route.value),
			branches: normalizeMediaList(branches.value),
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
.typeChooser { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 16px 0; }
.typeBtn { display: flex; align-items: center; justify-content: center; gap: 6px; min-width: 0; padding: 9px 8px; border: 1px solid var(--hy-border); border-radius: 999px; background: var(--hy-surface); color: var(--hy-body); font-family: var(--hy-heading); font-size: 11.5px; font-weight: 700; cursor: pointer; }
.typeBtnOn { border-color: var(--hy-accent); background: color-mix(in srgb, var(--hy-accent) 14%, var(--hy-surface)); color: var(--hy-accent-ink); }
.typeBtn:disabled { cursor: default; opacity: .78; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; }
.gridSpaced { margin-top: 15px; }
.double, .triple { display: grid; gap: 6px; }
.double { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.triple { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.field, .noteField { display: flex; flex-direction: column; min-width: 0; gap: 7px; }
.fieldSpaced { margin-top: 13px; }
.label { color: var(--hy-ink); font-family: var(--hy-heading); font-size: 12px; font-weight: 700; }
.input, .select, .textarea { width: 100%; min-width: 0; box-sizing: border-box; padding: 9px 11px; border: 1px solid var(--hy-border); border-radius: 9px; outline: none; background: var(--hy-surface); color: var(--hy-ink); font: inherit; }
.input:focus, .select:focus, .textarea:focus { border-color: var(--hy-accent); }
.listInput { resize: vertical; line-height: 1.5; }
.full { grid-column: 1 / -1; }
/* 旗鯖fork(Hatady): 数値を並べる欄は、どのマスが何かを1つずつ書く(KDA・レーティング前後)。 */
.subNum { display: flex; flex-direction: column; min-width: 0; gap: 4px; }
.subNumLabel { color: var(--hy-muted); font-size: 10px; font-weight: 700; }
/* 旗鯖fork(Hatady): 結果・気分は1タップで選べるボタン列にする(選択肢が少なく、記録の主役のため)。 */
.choiceField { display: flex; flex-direction: column; gap: 8px; }
.choiceFieldSpaced { margin-top: 15px; }
.segmented { display: flex; flex-wrap: wrap; gap: 7px; }
.segBtn { display: inline-flex; align-items: center; gap: 5px; padding: 8px 13px; border: 1px solid var(--hy-border); border-radius: 999px; background: var(--hy-surface); color: var(--hy-body); font-family: var(--hy-heading); font-size: 11.5px; font-weight: 700; cursor: pointer; }
.segBtn:hover { border-color: var(--hy-accent); }
.segBtn i { font-size: 14px; }
.segBtnOn { border-color: var(--hy-accent); background: color-mix(in srgb, var(--hy-accent) 16%, var(--hy-surface)); color: var(--hy-accent-ink); }
.subSection { margin-top: 15px; padding: 14px; border: 1px solid var(--hy-border); border-radius: 12px; background: var(--hy-surface-2); }
.subTitle { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; color: var(--hy-ink); font-family: var(--hy-heading); font-size: 12.5px; font-weight: 800; }
.subTitle i { color: var(--hy-accent); }
/* 旗鯖fork(Hatady): 詳細内の項目群を意味のかたまりに分けるための小見出し。 */
.miniLabel { display: flex; align-items: center; gap: 5px; margin-bottom: 9px; color: var(--hy-muted); font-family: var(--hy-heading); font-size: 10.5px; font-weight: 700; letter-spacing: .02em; }
.miniLabel i { color: var(--hy-accent); font-size: 12px; }
.miniLabelSpaced { margin-top: 17px; }
/* 旗鯖fork(Hatady): 任意の細目をまとめて畳む折りたたみ。 */
.more { margin-top: 13px; border: 1px solid var(--hy-border); border-radius: 12px; background: var(--hy-surface); }
.moreSummary { display: flex; align-items: center; gap: 8px; padding: 12px 14px; color: var(--hy-ink); font-family: var(--hy-heading); font-size: 12px; font-weight: 800; list-style: none; cursor: pointer; }
.moreSummary::-webkit-details-marker { display: none; }
.moreSummary small { margin-left: auto; color: var(--hy-muted); font-size: 10px; font-weight: 400; }
.moreChevron { color: var(--hy-accent); font-size: 15px; transition: transform .18s ease; }
.more[open] .moreChevron { transform: rotate(180deg); }
.moreBody { padding: 2px 14px 15px; }
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
