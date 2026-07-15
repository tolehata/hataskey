<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork(Hatady P7): 学習目標(短期/長期)の管理(モーダル)。
  期限(任意)・達成指標(学習時間/記録数/読了数、任意)を設定でき、指標は自動で進捗集計する。
  一覧は hata/hatady/goals、作成/更新/削除は goals/create・update・delete。
-->
<template>
<MkWindow
	ref="dialog"
	:initialWidth="500"
	:initialHeight="680"
	:canResize="true"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-target"></i> {{ t('title') }}</template>

	<div class="hatady-scope" :data-hatady-theme="theme" :class="$style.body">
		<!-- ===== 一覧モード ===== -->
		<template v-if="mode === 'list'">
			<button :class="$style.addBtn" @click="openCreate"><i class="ti ti-plus"></i> {{ t('add') }}</button>

			<div v-if="loading" :class="$style.loading">{{ t('loading') }}</div>
			<div v-else-if="goals.length === 0" :class="$style.empty">
				<i class="ti ti-target-arrow" :class="$style.emptyIcon"></i>
				<div>{{ t('emptyTitle') }}</div>
				<div :class="$style.emptySub">{{ t('emptySub') }}</div>
			</div>
			<template v-else>
				<div v-for="term in (['short', 'long'] as const)" :key="term">
					<template v-if="goalsByTerm(term).length">
						<div :class="$style.termHead">
							<i :class="['ti', term === 'short' ? 'ti-bolt' : 'ti-mountain']"></i> {{ t(term) }}
						</div>
						<div
							v-for="g in goalsByTerm(term)" :key="g.id"
							:class="[$style.goalCard, g.done && $style.goalDone]"
						>
							<div :class="$style.goalTop">
								<button :class="[$style.checkBtn, g.done && $style.checkOn]" :title="t('toggleDone')" @click="toggleDone(g)">
									<i :class="['ti', g.done ? 'ti-circle-check-filled' : 'ti-circle']"></i>
								</button>
								<div :class="$style.goalTitleWrap">
									<div :class="$style.goalTitle">{{ g.title }}</div>
									<div v-if="g.description" :class="$style.goalDesc">{{ g.description }}</div>
								</div>
								<button :class="$style.menuBtn" @click="openMenu(g, $event)"><i class="ti ti-dots"></i></button>
							</div>

							<!-- 指標進捗 -->
							<div v-if="g.metricType && g.progress.target != null" :class="$style.progWrap">
								<div :class="$style.progTrack"><div :class="$style.progFill" :style="{ width: (g.progress.percent ?? 0) + '%' }"></div></div>
								<div :class="$style.progText">
									<span>{{ fmtMetric(g.metricType, g.progress.current) }} / {{ fmtMetric(g.metricType, g.progress.target) }}</span>
									<span :class="$style.progPct">{{ g.progress.percent ?? 0 }}%</span>
								</div>
							</div>

							<!-- 期限 -->
							<div :class="$style.goalMeta">
								<span v-if="g.targetDate" :class="[$style.due, dueClass(g)]">
									<i class="ti ti-calendar"></i> {{ fmtDate(g.targetDate) }}
									<template v-if="!g.done"> · {{ dueLabel(g) }}</template>
								</span>
								<span v-else :class="$style.due"><i class="ti ti-infinity"></i> {{ t('noDeadline') }}</span>
								<span v-if="g.done" :class="$style.doneTag"><i class="ti ti-check"></i> {{ t('achieved') }}</span>
							</div>
						</div>
					</template>
				</div>
			</template>
		</template>

		<!-- ===== 作成/編集モード ===== -->
		<template v-else>
			<div :class="$style.formHead">
				<button :class="$style.backBtn" @click="mode = 'list'"><i class="ti ti-arrow-left"></i></button>
				<span>{{ editing ? t('editGoal') : t('newGoal') }}</span>
			</div>

			<label :class="$style.field">
				<span :class="$style.label">{{ t('goalTitle') }} <b :class="$style.req">*</b></span>
				<input v-model="form.title" :class="$style.input" :maxlength="256" :placeholder="t('titlePh')">
			</label>

			<label :class="$style.field">
				<span :class="$style.label">{{ t('goalDesc') }}</span>
				<textarea v-model="form.description" :class="$style.textarea" :maxlength="2048" rows="2" :placeholder="t('descPh')"></textarea>
			</label>

			<div :class="$style.field">
				<span :class="$style.label">{{ t('term') }}</span>
				<div :class="$style.segRow">
					<button :class="[$style.seg, form.termType === 'short' && $style.segOn]" @click="form.termType = 'short'"><i class="ti ti-bolt"></i> {{ t('short') }}</button>
					<button :class="[$style.seg, form.termType === 'long' && $style.segOn]" @click="form.termType = 'long'"><i class="ti ti-mountain"></i> {{ t('long') }}</button>
				</div>
			</div>

			<label :class="$style.field">
				<span :class="$style.label">{{ t('deadline') }}</span>
				<input v-model="form.targetDate" type="date" :class="$style.input">
			</label>

			<div :class="$style.field">
				<span :class="$style.label">{{ t('metric') }}</span>
				<div :class="$style.segRow">
					<button :class="[$style.seg, form.metricType === '' && $style.segOn]" @click="form.metricType = ''">{{ t('metricNone') }}</button>
					<button :class="[$style.seg, form.metricType === 'minutes' && $style.segOn]" @click="form.metricType = 'minutes'">{{ t('mMinutes') }}</button>
					<button :class="[$style.seg, form.metricType === 'logs' && $style.segOn]" @click="form.metricType = 'logs'">{{ t('mLogs') }}</button>
					<button :class="[$style.seg, form.metricType === 'books' && $style.segOn]" @click="form.metricType = 'books'">{{ t('mBooks') }}</button>
				</div>
			</div>

			<label v-if="form.metricType" :class="$style.field">
				<span :class="$style.label">{{ t('target') }}（{{ metricUnit(form.metricType) }}）</span>
				<input v-model.number="form.metricTarget" type="number" min="1" :class="$style.input" :placeholder="t('targetPh')">
			</label>
			<div v-if="form.metricType" :class="$style.metricHint"><i class="ti ti-bulb"></i> {{ t('metricHint') }}</div>

			<div :class="$style.formActions">
				<button :class="$style.cancelBtn" @click="mode = 'list'">{{ t('cancel') }}</button>
				<button :class="$style.saveBtn" :disabled="!form.title.trim() || saving" @click="save">
					<i v-if="saving" class="ti ti-loader-2" :class="$style.spin"></i>
					{{ editing ? t('save') : t('create') }}
				</button>
			</div>
		</template>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { ref, reactive } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import { hatadyTheme, hatadyEffectiveLang } from '@/utility/hatady-prefs.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import * as os from '@/os.js';

const emit = defineEmits<{ (ev: 'closed'): void; (ev: 'changed'): void }>();
const dialog = ref<any>(null);
const theme = hatadyTheme;
const lang = hatadyEffectiveLang;

type Goal = {
	id: string; title: string; description: string | null; termType: 'short' | 'long';
	targetDate: string | null; metricType: 'minutes' | 'logs' | 'books' | null; metricTarget: number | null;
	done: boolean; doneAt: string | null; createdAt: string;
	progress: { current: number; target: number | null; percent: number | null };
};

const loading = ref(true);
const goals = ref<Goal[]>([]);
const mode = ref<'list' | 'form'>('list');
const editing = ref<Goal | null>(null);
const saving = ref(false);

const form = reactive<{ title: string; description: string; termType: 'short' | 'long'; targetDate: string; metricType: '' | 'minutes' | 'logs' | 'books'; metricTarget: number | null }>({
	title: '', description: '', termType: 'short', targetDate: '', metricType: '', metricTarget: null,
});

async function load() {
	loading.value = true;
	try { goals.value = await misskeyApi('hata/hatady/goals', {}); } catch { goals.value = []; } finally { loading.value = false; }
}
load();

function goalsByTerm(term: 'short' | 'long'): Goal[] { return goals.value.filter(g => g.termType === term); }

function openCreate() {
	editing.value = null;
	form.title = ''; form.description = ''; form.termType = 'short'; form.targetDate = ''; form.metricType = ''; form.metricTarget = null;
	mode.value = 'form';
}
function openEdit(g: Goal) {
	editing.value = g;
	form.title = g.title;
	form.description = g.description ?? '';
	form.termType = g.termType;
	form.targetDate = g.targetDate ? toDateInput(g.targetDate) : '';
	form.metricType = g.metricType ?? '';
	form.metricTarget = g.metricTarget ?? null;
	mode.value = 'form';
}

function openMenu(g: Goal, ev: MouseEvent) {
	os.popupMenu([
		{ text: t('edit'), icon: 'ti ti-pencil', action: () => openEdit(g) },
		{ text: t('delete'), icon: 'ti ti-trash', danger: true, action: () => remove(g) },
	], (ev.currentTarget ?? ev.target) as HTMLElement);
}

function toDateInput(iso: string): string {
	const d = new Date(iso);
	return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}
// YYYY-MM-DD → その日の 23:59 のエポックms(期限は日末まで有効に)。
function dateInputToMs(v: string): number | null {
	if (!v) return null;
	const [y, m, d] = v.split('-').map(Number);
	if (!y || !m || !d) return null;
	return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

async function save() {
	if (!form.title.trim() || saving.value) return;
	saving.value = true;
	const payload = {
		title: form.title.trim(),
		description: form.description.trim() || null,
		termType: form.termType,
		targetDate: dateInputToMs(form.targetDate),
		metricType: form.metricType || null,
		metricTarget: form.metricType ? (form.metricTarget != null && form.metricTarget > 0 ? Math.floor(form.metricTarget) : null) : null,
	};
	try {
		if (editing.value) {
			await misskeyApi('hata/hatady/goals/update', { goalId: editing.value.id, ...payload });
		} else {
			await misskeyApi('hata/hatady/goals/create', payload);
		}
		mode.value = 'list';
		await load();
		emit('changed');
	} catch {
		os.alert({ type: 'error', text: t('saveFailed') });
	} finally {
		saving.value = false;
	}
}

async function toggleDone(g: Goal) {
	// 指標つき目標は自動判定のため、手動切替は指標なし目標を主対象にするが、どちらも許可(手動オーバーライド)。
	try {
		await misskeyApi('hata/hatady/goals/update', { goalId: g.id, done: !g.done });
		await load();
		emit('changed');
	} catch { os.alert({ type: 'error', text: t('saveFailed') }); }
}

async function remove(g: Goal) {
	const { canceled } = await os.confirm({ type: 'warning', text: t('confirmDelete').replace('{t}', g.title) });
	if (canceled) return;
	try {
		await misskeyApi('hata/hatady/goals/delete', { goalId: g.id });
		await load();
		emit('changed');
	} catch { os.alert({ type: 'error', text: t('saveFailed') }); }
}

function fmtDate(iso: string): string {
	const d = new Date(iso);
	return lang.value === 'en'
		? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
		: `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}
function daysLeft(iso: string): number {
	const target = new Date(iso); target.setHours(23, 59, 59, 999);
	const now = new Date(); now.setHours(0, 0, 0, 0);
	return Math.round((target.getTime() - now.getTime()) / 86400000);
}
function dueClass(g: Goal): string {
	if (g.done || !g.targetDate) return '';
	const dl = daysLeft(g.targetDate);
	if (dl < 0) return 'dueOver';
	if (dl <= 3) return 'dueSoon';
	return '';
}
function dueLabel(g: Goal): string {
	if (!g.targetDate) return '';
	const dl = daysLeft(g.targetDate);
	if (dl < 0) return lang.value === 'en' ? `${-dl}d overdue` : `${-dl}日超過`;
	if (dl === 0) return lang.value === 'en' ? 'due today' : '本日期限';
	return lang.value === 'en' ? `${dl}d left` : `あと${dl}日`;
}
function metricUnit(m: string): string {
	return { minutes: lang.value === 'en' ? 'min' : '分', logs: lang.value === 'en' ? 'logs' : '記録', books: lang.value === 'en' ? 'books' : '冊' }[m] ?? '';
}
function fmtMetric(m: string | null, v: number): string {
	if (m === 'minutes') {
		const h = Math.floor(v / 60); const mm = v % 60;
		if (lang.value === 'en') return h > 0 ? (mm > 0 ? `${h}h${mm}m` : `${h}h`) : `${mm}m`;
		return h > 0 ? (mm > 0 ? `${h}時間${mm}分` : `${h}時間`) : `${mm}分`;
	}
	return `${v}${metricUnit(m ?? '')}`;
}

const DICT: Record<string, { ja: string; en: string }> = {
	title: { ja: '学習目標', en: 'Goals' },
	loading: { ja: '読み込み中…', en: 'Loading…' },
	add: { ja: '目標を追加', en: 'Add goal' },
	emptyTitle: { ja: 'まだ目標がありません', en: 'No goals yet' },
	emptySub: { ja: '短期・長期の目標を立てて、達成を追いかけましょう。', en: 'Set short- and long-term goals and track them.' },
	short: { ja: '短期目標', en: 'Short-term' },
	long: { ja: '長期目標', en: 'Long-term' },
	toggleDone: { ja: '達成/未達成を切替', en: 'Toggle done' },
	achieved: { ja: '達成', en: 'Done' },
	noDeadline: { ja: '期限なし', en: 'No deadline' },
	newGoal: { ja: '新しい目標', en: 'New goal' },
	editGoal: { ja: '目標を編集', en: 'Edit goal' },
	goalTitle: { ja: 'タイトル', en: 'Title' },
	titlePh: { ja: '例: 数学を毎日30分', en: 'e.g. 30 min of math daily' },
	goalDesc: { ja: 'メモ（任意）', en: 'Note (optional)' },
	descPh: { ja: '達成条件や動機など', en: 'Details or motivation' },
	term: { ja: '種別', en: 'Term' },
	deadline: { ja: '期限（任意）', en: 'Deadline (optional)' },
	metric: { ja: '達成指標（任意・自動集計）', en: 'Metric (optional, auto-tracked)' },
	metricNone: { ja: '手動', en: 'Manual' },
	mMinutes: { ja: '学習時間', en: 'Study time' },
	mLogs: { ja: '記録数', en: 'Logs' },
	mBooks: { ja: '読了数', en: 'Books' },
	target: { ja: '目標値', en: 'Target' },
	targetPh: { ja: '例: 600', en: 'e.g. 600' },
	metricHint: { ja: '指標を設定すると、作成日〜期限の記録から進捗を自動計算します。', en: 'Progress is auto-calculated from records between creation and deadline.' },
	cancel: { ja: 'キャンセル', en: 'Cancel' },
	create: { ja: '作成', en: 'Create' },
	save: { ja: '保存', en: 'Save' },
	edit: { ja: '編集', en: 'Edit' },
	delete: { ja: '削除', en: 'Delete' },
	confirmDelete: { ja: '「{t}」を削除しますか？', en: 'Delete "{t}"?' },
	saveFailed: { ja: '保存に失敗しました。', en: 'Failed to save.' },
};
function t(key: string): string { return DICT[key]?.[lang.value] ?? key; }
</script>

<style lang="scss" module>
.body {
	padding: 18px 20px 22px;
	background: var(--hy-bg); color: var(--hy-body);
	font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
	min-height: 100%; box-sizing: border-box;
}
.loading { text-align: center; color: var(--hy-muted); padding: 40px 0; font-size: 13px; }

/* 追加ボタン */
.addBtn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; background: var(--hy-accent); color: #fff; border: none; border-radius: 11px; padding: 11px; font-size: 13px; font-weight: 800; cursor: pointer; font-family: var(--hy-heading); margin-bottom: 16px; }
.addBtn:hover { filter: brightness(1.05); }

/* 空 */
.empty { display: flex; flex-direction: column; align-items: center; text-align: center; color: var(--hy-muted); padding: 30px 10px; }
.emptyIcon { font-size: 34px; opacity: .5; margin-bottom: 10px; }
.emptySub { font-size: 12px; margin-top: 6px; }

/* 種別見出し */
.termHead { display: flex; align-items: center; gap: 6px; font-family: var(--hy-heading); font-weight: 800; font-size: 12.5px; color: var(--hy-ink); margin: 6px 0 10px; }
.termHead i { color: var(--hy-accent); }

/* 目標カード */
.goalCard { background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 13px; padding: 13px 14px; margin-bottom: 10px; }
.goalDone { opacity: .72; }
.goalTop { display: flex; align-items: flex-start; gap: 10px; }
.checkBtn { flex-shrink: 0; border: none; background: none; color: var(--hy-muted); font-size: 22px; cursor: pointer; line-height: 1; padding: 0; margin-top: 1px; }
.checkOn { color: #5a9a5a; }
.goalTitleWrap { flex: 1; min-width: 0; }
.goalTitle { font-family: var(--hy-heading); font-weight: 800; font-size: 14.5px; color: var(--hy-ink); }
.goalDone .goalTitle { text-decoration: line-through; }
.goalDesc { font-size: 11.5px; color: var(--hy-muted); margin-top: 2px; white-space: pre-wrap; }
.menuBtn { flex-shrink: 0; border: none; background: none; color: var(--hy-muted); cursor: pointer; padding: 2px 4px; font-size: 16px; }

/* 進捗 */
.progWrap { margin-top: 11px; }
.progTrack { height: 9px; border-radius: 999px; background: var(--hy-border); overflow: hidden; }
.progFill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #f0b46a, #d9824a); transition: width .5s cubic-bezier(.34,1.2,.64,1); }
.progText { display: flex; justify-content: space-between; font-size: 11px; color: var(--hy-muted); margin-top: 5px; }
.progPct { font-weight: 800; color: var(--hy-accent-ink); }

/* メタ */
.goalMeta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.due { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--hy-muted); }
.due.dueSoon { color: #c07a2a; font-weight: 700; }
.due.dueOver { color: #c0563a; font-weight: 700; }
.doneTag { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: #5a9a5a; font-weight: 700; }

/* フォーム */
.formHead { display: flex; align-items: center; gap: 10px; font-family: var(--hy-heading); font-weight: 800; font-size: 15px; color: var(--hy-ink); margin-bottom: 16px; }
.backBtn { border: 1px solid var(--hy-border); background: var(--hy-surface); border-radius: 8px; width: 30px; height: 30px; color: var(--hy-ink); cursor: pointer; }
.field { display: block; margin-bottom: 14px; }
.label { display: block; font-size: 12px; font-weight: 700; color: var(--hy-ink); margin-bottom: 6px; }
.req { color: var(--hy-accent); }
.input, .textarea { width: 100%; box-sizing: border-box; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 10px; padding: 9px 12px; font-size: 13.5px; color: var(--hy-ink); font-family: inherit; }
.input:focus, .textarea:focus { border-color: var(--hy-accent); outline: none; }
.textarea { resize: vertical; }
.segRow { display: flex; flex-wrap: wrap; gap: 6px; }
.seg { display: inline-flex; align-items: center; gap: 4px; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 999px; padding: 6px 13px; font-size: 12px; font-weight: 700; color: var(--hy-muted); cursor: pointer; font-family: var(--hy-heading); }
.seg:hover { border-color: var(--hy-accent); }
.segOn { background: var(--hy-accent); border-color: var(--hy-accent); color: #fff; }
.metricHint { display: flex; align-items: flex-start; gap: 6px; font-size: 11px; color: var(--hy-muted); background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 9px; padding: 8px 10px; margin-bottom: 14px; }
.metricHint i { color: var(--hy-accent); margin-top: 1px; }
.formActions { display: flex; gap: 10px; margin-top: 6px; }
.cancelBtn { flex: 1; background: var(--hy-surface); border: 1px solid var(--hy-border); border-radius: 11px; padding: 11px; font-size: 13px; font-weight: 700; color: var(--hy-ink); cursor: pointer; font-family: var(--hy-heading); }
.saveBtn { flex: 2; display: flex; align-items: center; justify-content: center; gap: 6px; background: var(--hy-accent); color: #fff; border: none; border-radius: 11px; padding: 11px; font-size: 13px; font-weight: 800; cursor: pointer; font-family: var(--hy-heading); }
.saveBtn:not(:disabled):hover { filter: brightness(1.05); }
.saveBtn:disabled { opacity: .5; cursor: not-allowed; }
.spin { animation: hy-goal-spin .8s linear infinite; }
@keyframes hy-goal-spin { to { transform: rotate(360deg); } }
</style>
