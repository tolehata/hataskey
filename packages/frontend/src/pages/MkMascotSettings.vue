<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: マスコット機能の設定UI(P3 段階2 / UI改善版)。
  - 未同意なら同意ダイアログ
  - 同意済みなら プレビュー + キャラ + 立ち絵 + 文言(表情をサムネで紐付け) を編集
  - 画像はドライブのURL参照のみ保持。保存は hata/mascot/update でサーバー検証
-->
<template>
<MkModalWindow
	ref="dialog"
	:width="620"
	:height="800"
	:withOkButton="false"
	@close="dialog?.close()"
	@closed="emit('closed')"
>
	<template #header>マスコットの設定</template>

	<div :class="$style.root">
		<div v-if="loading" :class="$style.loading">読み込み中…</div>

		<!-- 未同意: 同意ダイアログ -->
		<div v-else-if="!consented" :class="$style.consent">
			<div :class="$style.consentIcon"><i class="ti ti-mood-smile"></i></div>
			<div :class="$style.consentTitle">マスコット機能の利用にあたって</div>
			<div :class="$style.consentBody">
				<p>用意した画像をマスコットとして表示できる機能です。利用する前に、以下に同意してください。</p>
				<ul>
					<li>画像の権利（著作権・肖像権など）を自分が持っている、または許諾を得ていることを確認してください。第三者の権利を侵害する画像は使用しないでください。</li>
					<li>成人向け（性的・暴力的など）や公序良俗に反する画像は使用しないでください。</li>
					<li>本機能の利用で生じた問題について、開発者およびサーバー運営者は責任を負いません。</li>
					<li>不適切な画像が確認された場合、管理者が表示停止やデータ削除を行うことがあります。</li>
				</ul>
			</div>
			<div :class="$style.consentBtns">
				<MkButton @click="dialog?.close()">同意しない</MkButton>
				<MkButton primary gradate @click="agree">同意して使う</MkButton>
			</div>
		</div>

		<!-- 同意済み: 編集UI -->
		<template v-else>
			<!-- ===== プレビュー(吹き出し位置をドラッグで調整) ===== -->
			<div :class="$style.preview">
				<div :class="$style.previewStageWrap" ref="stageWrapEl">
					<template v-if="previewExpression">
						<img :src="previewExpression.url" :style="{ '--htk-motion-i': String(previewExpression.motionIntensity ?? 1) }" :class="[$style.previewImg, previewExpression.motion==='bounce' ? $style.motionBounce : previewExpression.motion==='shake' ? $style.motionShake : previewExpression.motion==='sway' ? $style.motionSway : previewExpression.motion==='spin' ? $style.motionSpin : '']" :alt="previewExpression.label" draggable="false" />
						<!-- 吹き出し(ドラッグで位置調整。位置は表情ごとに保存) -->
						<div
							:class="[$style.previewBubble, bubbleTail==='right' ? $style.tail_right : $style.tail_left, draggingBubble && $style.previewBubbleDragging]"
							:style="bubbleStyle"
							@pointerdown="onBubblePointerDown"
						>
							<span v-if="previewPhraseText">{{ previewPhraseText }}</span>
							<span v-else :class="$style.bubblePlaceholder">文言</span>
							<span :class="$style.bubbleGrip" title="ドラッグで位置を調整"><i class="ti ti-arrows-move"></i></span>
						</div>
					</template>
					<div v-else :class="$style.previewEmpty">
						<i class="ti ti-photo"></i>
						<span>立ち絵を追加するとここに表示されます</span>
					</div>
				</div>
				<div :class="$style.previewMeta">
					<div v-if="showName && activeChar?.name" :class="$style.previewName">{{ activeChar.name }}</div>
					<div v-if="previewExpression" :class="$style.previewHint">吹き出しをドラッグすると、この立ち絵（{{ previewExpression.label || '無名' }}）での表示位置を調整できます。</div>
					<div v-if="previewExpression" :class="$style.bubbleControls">
						<div :class="$style.bubbleCtrlRow">
							<span :class="$style.bubbleCtrlLabel">吹き出しサイズ</span>
							<input type="range" min="0.6" max="1.6" step="0.05" :value="previewExpression.bubbleScale ?? 1" @input="setBubbleScale($event)" :class="$style.bubbleRange" />
						</div>
						<div :class="$style.bubbleCtrlRow">
							<span :class="$style.bubbleCtrlLabel">しっぽの向き</span>
							<div :class="$style.tailToggle">
								<button :class="[$style.tailBtn, bubbleTail==='left' && $style.tailBtnOn]" @click="setBubbleTail('left')">左</button>
								<button :class="[$style.tailBtn, bubbleTail==='right' && $style.tailBtnOn]" @click="setBubbleTail('right')">右</button>
							</div>
						</div>
					</div>
					<div :class="$style.previewChips">
						<button
							v-for="(p,pi) in (activeChar?.phrases ?? [])" :key="p.id"
							:class="[$style.previewChip, previewPhraseIdx===pi && $style.previewChipOn]"
							@click="previewPhraseIdx = pi"
						>{{ p.text || '(空の文言)' }}</button>
					</div>
				</div>
			</div>

			<!-- ===== 全体設定 ===== -->
			<div :class="$style.card">
				<div :class="$style.row"><span>マスコットの名前を表示する</span><button :class="[$style.sw, showName && $style.swOn]" @click="showName=!showName"></button></div>
			</div>

			<!-- ===== マスコットが伝えること ===== -->
			<div :class="$style.card">
				<div :class="$style.label">マスコットが伝えること</div>
				<div :class="$style.desc">マスコットに何を伝えてもらうかを選べます。</div>
				<div :class="$style.row"><span>誕生日を祝う</span><button :class="[$style.sw, displaySettings.tellBirthday && $style.swOn]" @click="toggleDisplay('tellBirthday')"></button></div>
				<div :class="$style.row"><span>通知を伝える</span><button :class="[$style.sw, displaySettings.tellNotifications && $style.swOn]" @click="toggleDisplay('tellNotifications')"></button></div>
				<div :class="$style.row"><span>設定した文言をランダムに表示する</span><button :class="[$style.sw, displaySettings.tellRandomPhrases && $style.swOn]" @click="toggleDisplay('tellRandomPhrases')"></button></div>
				<div :class="$style.row"><span>ログイン時に未読通知の件数を伝える</span><button :class="[$style.sw, displaySettings.tellUnreadOnLogin && $style.swOn]" @click="toggleDisplay('tellUnreadOnLogin')"></button></div>
				<div :class="$style.row"><span>Hatask の通知を伝える</span><button :class="[$style.sw, displaySettings.tellHataskNotifications && $style.swOn]" @click="toggleDisplay('tellHataskNotifications')"></button></div>
				<div :class="$style.subDivider"></div>
				<div :class="$style.row"><span>通知を伝える間は標準の通知トーストを表示しない</span><button :class="[$style.sw, displaySettings.suppressStandardToast && $style.swOn]" @click="toggleDisplay('suppressStandardToast')"></button></div>
				<div :class="$style.desc" style="margin-top:6px;margin-bottom:0">「通知を伝える」がオンのときに有効です。マスコットと標準トーストが二重に出るのを防ぎます。</div>
			</div>

			<!-- ===== キャラ切替 ===== -->
			<div :class="$style.card">
				<div :class="$style.cardHead">
					<span :class="$style.label">キャラクター</span>
					<span :class="$style.count">{{ characters.length }} / {{ limits.maxCharacters }}</span>
				</div>
				<div :class="$style.charTabs">
					<button v-for="(c,ci) in characters" :key="c.id" :class="[$style.charTab, activeCharIdx===ci && $style.charTabOn]" @click="selectChar(ci)">
						<img v-if="c.expressions[0]" :src="c.expressions[0].url" :class="$style.charTabThumb" />
						<i v-else class="ti ti-user" :class="$style.charTabThumbIcon"></i>
						<span>{{ c.name || '(無名)' }}</span>
					</button>
					<button v-if="characters.length < limits.maxCharacters" :class="$style.charAdd" @click="addCharacter"><i class="ti ti-plus"></i> 追加</button>
				</div>
			</div>

			<template v-if="activeChar">
				<!-- 名前 -->
				<div :class="$style.card">
					<div :class="$style.label">名前</div>
					<input :class="$style.inp" :value="activeChar.name" maxlength="30" @input="onName($event)" placeholder="マスコットの名前" />
					<button v-if="characters.length > 0" :class="$style.delBtn" @click="removeCharacter(activeCharIdx)"><i class="ti ti-trash"></i> このキャラを削除</button>
				</div>

				<!-- 立ち絵 -->
				<div :class="$style.card">
					<div :class="$style.cardHead">
						<span :class="$style.label">立ち絵（表情）</span>
						<span :class="$style.count">{{ activeChar.expressions.length }} / {{ limits.maxExpressions }}</span>
					</div>
					<div :class="$style.desc">画像はドライブから選びます（500KB以下・JPEG/PNG/WebP/GIF）。ラベルは「笑顔」「怒り」など分かりやすい名前を。</div>
					<div v-if="activeChar.expressions.length === 0" :class="$style.empty">まだ立ち絵がありません。下のボタンから追加してください。</div>
					<div v-else :class="$style.expGrid">
						<div v-for="(e,ei) in activeChar.expressions" :key="e.id" :class="$style.expItem">
							<img :src="e.url" :class="$style.expImg" :alt="e.label" />
							<input :class="$style.expLabel" :value="e.label" maxlength="30" @input="onExpLabel(ei,$event)" placeholder="ラベル" />
							<select :class="$style.expMotion" :value="e.motion ?? 'none'" @change="onExpMotion(ei,$event)">
								<option value="none">動きなし</option>
								<option value="bounce">ぴょんぴょん</option>
								<option value="shake">ガクガク</option>
								<option value="sway">ゆらゆら</option>
								<option value="spin">回転</option>
							</select>
							<div v-if="e.motion && e.motion !== 'none' && e.motion !== 'spin'" :class="$style.expIntensity">
								<span :class="$style.expIntensityLabel">強さ</span>
								<input type="range" min="0.3" max="2" step="0.1" :value="e.motionIntensity ?? 1" @input="onExpIntensity(ei,$event)" :class="$style.expIntensityRange" />
							</div>
							<button :class="$style.expDel" @click="removeExpression(ei)"><i class="ti ti-x"></i></button>
						</div>
					</div>
					<MkButton v-if="activeChar.expressions.length < limits.maxExpressions" rounded @click="addExpression"><i class="ti ti-photo-plus"></i> 立ち絵を追加</MkButton>
				</div>

				<!-- 文言 -->
				<div :class="$style.card">
					<div :class="$style.cardHead">
						<span :class="$style.label">文言（セリフ）</span>
						<span :class="$style.count">{{ activeChar.phrases.length }} / {{ limits.maxPhrases }}</span>
					</div>
					<div :class="$style.desc">マスコットが話す言葉です。各文言に立ち絵を紐づけると、その文言のときに表情が切り替わります。</div>
					<div v-if="activeChar.phrases.length === 0" :class="$style.empty">まだ文言がありません。下のボタンから追加してください。</div>
					<div v-for="(p,pi) in activeChar.phrases" :key="p.id" :class="$style.phraseCard">
						<div :class="$style.phraseTop">
							<input :class="$style.inp" :value="p.text" maxlength="140" @input="onPhraseText(pi,$event)" placeholder="文言を入力" />
							<button :class="$style.phraseDel" @click="removePhrase(pi)"><i class="ti ti-trash"></i></button>
						</div>
						<!-- 立ち絵をサムネで選んで紐付け -->
						<div :class="$style.linkRow">
							<span :class="$style.linkLabel">表情:</span>
							<button :class="[$style.linkThumb, !p.expressionId && $style.linkThumbOn]" @click="setPhraseExp(pi, null)" title="表情なし">
								<i class="ti ti-ban"></i>
							</button>
							<button
								v-for="e in activeChar.expressions" :key="e.id"
								:class="[$style.linkThumb, p.expressionId===e.id && $style.linkThumbOn]"
								:title="e.label || '(無名)'"
								@click="setPhraseExp(pi, e.id)"
							>
								<img :src="e.url" :class="$style.linkThumbImg" />
							</button>
							<span v-if="activeChar.expressions.length === 0" :class="$style.linkEmpty">先に立ち絵を追加してください</span>
						</div>
					</div>
					<MkButton v-if="activeChar.phrases.length < limits.maxPhrases" rounded @click="addPhrase"><i class="ti ti-plus"></i> 文言を追加</MkButton>
				</div>
			</template>

			<div :class="$style.footer">
				<MkButton @click="dialog?.close()">閉じる</MkButton>
				<MkButton primary gradate :disabled="saving" @click="save"><i class="ti ti-device-floppy"></i> 保存</MkButton>
			</div>
		</template>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { ref, shallowRef, computed, watch, onMounted } from 'vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkButton from '@/components/MkButton.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { chooseDriveFile } from '@/utility/drive.js';
import * as os from '@/os.js';
import { displaySettings, loadDisplaySettings, saveDisplaySettings, type MascotDisplaySettings } from '@/utility/mascot-store.js';

const emit = defineEmits<{ (ev:'closed'):void }>();
const dialog = shallowRef<InstanceType<typeof MkModalWindow>>();

type Expression = { id: string; label: string; url: string; driveFileId: string | null; bubbleX?: number; bubbleY?: number; bubbleScale?: number; bubbleTail?: 'left' | 'right'; motion?: 'none' | 'bounce' | 'shake' | 'sway' | 'spin'; motionIntensity?: number };
type Phrase = { id: string; text: string; expressionId: string | null };
type Character = { id: string; name: string; expressions: Expression[]; phrases: Phrase[] };

const loading = ref(true);
const consented = ref(false);
const saving = ref(false);
const characters = ref<Character[]>([]);
const activeCharIdx = ref(0);
const showName = ref(false);
const limits = ref({ maxCharacters: 3, maxExpressions: 5, maxPhrases: 10 });

// プレビューで今表示している文言のインデックス
const previewPhraseIdx = ref(0);

const activeChar = computed<Character | null>(() => characters.value[activeCharIdx.value] ?? null);

// プレビュー: 選択中の文言と、それに紐づく表情(なければ先頭表情)
const previewPhrase = computed<Phrase | null>(() => activeChar.value?.phrases[previewPhraseIdx.value] ?? null);
const previewPhraseText = computed<string>(() => previewPhrase.value?.text ?? '');
const previewExpression = computed<Expression | null>(() => {
	const c = activeChar.value;
	if (!c) return null;
	const linked = previewPhrase.value?.expressionId;
	if (linked) {
		const found = c.expressions.find(e => e.id === linked);
		if (found) return found;
	}
	return c.expressions[0] ?? null;
});

// ===== 吹き出し位置のドラッグ調整(表情ごとに保存) =====
const stageWrapEl = ref<HTMLElement | null>(null);
const draggingBubble = ref(false);

// 現在の表情の吹き出し位置(0〜1)。未設定はデフォルト(上中央寄り)。
const bubbleStyle = computed(() => {
	const e = previewExpression.value;
	const x = (e?.bubbleX ?? 0.5);
	const y = (e?.bubbleY ?? 0.1);
	const scale = (typeof e?.bubbleScale === 'number' ? e.bubbleScale : 1);
	return {
		left: (x * 100) + '%',
		top: (y * 100) + '%',
		fontSize: (0.85 * scale) + 'rem',
	};
});
const bubbleTail = computed<'left' | 'right'>(() => (previewExpression.value?.bubbleTail === 'right' ? 'right' : 'left'));

function setBubbleScale(ev: Event) {
	const e = previewExpression.value; const c = activeChar.value;
	if (!e || !c) return;
	const v = parseFloat((ev.target as HTMLInputElement).value);
	const target = c.expressions.find(x => x.id === e.id);
	if (target) target.bubbleScale = Math.min(1.6, Math.max(0.6, v));
}
function setBubbleTail(tail: 'left' | 'right') {
	const e = previewExpression.value; const c = activeChar.value;
	if (!e || !c) return;
	const target = c.expressions.find(x => x.id === e.id);
	if (target) target.bubbleTail = tail;
}

// 動きクラスを静的参照で返す(CSS module動的アクセスを避ける)
function onBubblePointerDown(ev: PointerEvent) {
	const e = previewExpression.value;
	const wrap = stageWrapEl.value;
	if (!e || !wrap) return;
	ev.preventDefault();
	draggingBubble.value = true;
	(ev.target as HTMLElement).setPointerCapture?.(ev.pointerId);

	const move = (mv: PointerEvent) => {
		const rect = wrap.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;
		const x = Math.min(1, Math.max(0, (mv.clientX - rect.left) / rect.width));
		const y = Math.min(1, Math.max(0, (mv.clientY - rect.top) / rect.height));
		// 現在表情に書き込む(キャラ配列内の実体を更新)
		const c = activeChar.value;
		if (!c) return;
		const target = c.expressions.find(x2 => x2.id === e.id);
		if (target) { target.bubbleX = Math.round(x * 1000) / 1000; target.bubbleY = Math.round(y * 1000) / 1000; }
	};
	const up = () => {
		draggingBubble.value = false;
		window.removeEventListener('pointermove', move);
		window.removeEventListener('pointerup', up);
	};
	window.addEventListener('pointermove', move);
	window.addEventListener('pointerup', up);
}

// キャラ切替や文言削除で範囲外になったらプレビューをリセット
watch([activeCharIdx, () => activeChar.value?.phrases.length], () => {
	const len = activeChar.value?.phrases.length ?? 0;
	if (previewPhraseIdx.value >= len) previewPhraseIdx.value = Math.max(0, len - 1);
});

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

onMounted(async () => {
	await loadDisplaySettings();
	try {
		const res = await misskeyApi('hata/mascot/get', {});
		consented.value = res.consented === true;
		limits.value = {
			maxCharacters: res.limits?.maxCharacters ?? 3,
			maxExpressions: res.limits?.maxExpressions ?? 5,
			maxPhrases: res.limits?.maxPhrases ?? 10,
		};
		const data = res.data ?? {};
		characters.value = Array.isArray(data.characters) ? data.characters.map((c:any) => ({
			id: c.id ?? genId(),
			name: c.name ?? '',
			expressions: Array.isArray(c.expressions) ? c.expressions.map((e:any) => ({ id: e.id ?? genId(), label: e.label ?? '', url: e.url ?? '', driveFileId: e.driveFileId ?? null, bubbleX: typeof e.bubbleX === 'number' ? e.bubbleX : 0.5, bubbleY: typeof e.bubbleY === 'number' ? e.bubbleY : 0.1, bubbleScale: typeof e.bubbleScale === 'number' ? e.bubbleScale : 1, bubbleTail: e.bubbleTail === 'right' ? 'right' : 'left', motion: e.motion ?? 'none', motionIntensity: typeof e.motionIntensity === 'number' ? e.motionIntensity : 1 })) : [],
			phrases: Array.isArray(c.phrases) ? c.phrases.map((p:any) => ({ id: p.id ?? genId(), text: p.text ?? '', expressionId: p.expressionId ?? null })) : [],
		})) : [];
		showName.value = data.showName === true;
		const ai = characters.value.findIndex(c => c.id === data.activeCharacterId);
		activeCharIdx.value = ai >= 0 ? ai : 0;
	} catch (err) {
		os.alert({ type: 'error', text: 'マスコット情報の取得に失敗しました。' });
	} finally {
		loading.value = false;
	}
});

async function agree() {
	try {
		await misskeyApi('hata/consent/update', { type: 'mascot', agree: true });
		consented.value = true;
		if (characters.value.length === 0) addCharacter();
	} catch {
		os.alert({ type: 'error', text: '同意の記録に失敗しました。' });
	}
}

function selectChar(ci:number) { activeCharIdx.value = ci; previewPhraseIdx.value = 0; }

function addCharacter() {
	if (characters.value.length >= limits.value.maxCharacters) return;
	characters.value.push({ id: genId(), name: '', expressions: [], phrases: [] });
	activeCharIdx.value = characters.value.length - 1;
	previewPhraseIdx.value = 0;
}
async function removeCharacter(idx:number) {
	const { canceled } = await os.confirm({ type: 'warning', text: 'このキャラクターを削除しますか？' });
	if (canceled) return;
	characters.value.splice(idx, 1);
	if (activeCharIdx.value >= characters.value.length) activeCharIdx.value = Math.max(0, characters.value.length - 1);
}
function onName(ev:Event) { if (activeChar.value) activeChar.value.name = (ev.target as HTMLInputElement).value; }

async function addExpression() {
	const c = activeChar.value;
	if (!c || c.expressions.length >= limits.value.maxExpressions) return;
	const files = await chooseDriveFile({ multiple: false }).catch(() => []);
	if (files.length === 0) return;
	const f = files[0];
	if (!f.type || !f.type.startsWith('image/')) {
		os.alert({ type: 'warning', text: '画像ファイルを選んでください。' });
		return;
	}
	// フロントでも事前にサイズを弾く(サーバーでも検証される)
	if (typeof f.size === 'number' && f.size > 500 * 1024) {
		os.alert({ type: 'warning', text: '画像が大きすぎます（500KB以下にしてください）。' });
		return;
	}
	c.expressions.push({ id: genId(), label: '', url: f.url, driveFileId: f.id, bubbleX: 0.5, bubbleY: 0.1, bubbleScale: 1, bubbleTail: 'left', motion: 'none', motionIntensity: 1 });
}
function onExpLabel(ei:number, ev:Event) { const c = activeChar.value; if (c) c.expressions[ei].label = (ev.target as HTMLInputElement).value; }
function onExpMotion(ei:number, ev:Event) { const c = activeChar.value; if (c) c.expressions[ei].motion = (ev.target as HTMLSelectElement).value as any; }
function onExpIntensity(ei:number, ev:Event) { const c = activeChar.value; if (c) c.expressions[ei].motionIntensity = Math.min(2, Math.max(0.3, parseFloat((ev.target as HTMLInputElement).value))); }
function removeExpression(ei:number) {
	const c = activeChar.value; if (!c) return;
	const removed = c.expressions[ei];
	c.expressions.splice(ei, 1);
	c.phrases.forEach(p => { if (p.expressionId === removed.id) p.expressionId = null; });
}

function addPhrase() { const c = activeChar.value; if (!c || c.phrases.length >= limits.value.maxPhrases) return; c.phrases.push({ id: genId(), text: '', expressionId: null }); }
function onPhraseText(pi:number, ev:Event) { const c = activeChar.value; if (c) c.phrases[pi].text = (ev.target as HTMLInputElement).value; }
function setPhraseExp(pi:number, expId:string|null) { const c = activeChar.value; if (c) c.phrases[pi].expressionId = expId; }
function removePhrase(pi:number) { const c = activeChar.value; if (c) c.phrases.splice(pi, 1); }

function toggleDisplay(key: keyof MascotDisplaySettings) {
	const next = { ...displaySettings.value, [key]: !displaySettings.value[key] };
	saveDisplaySettings(next);
}

async function save() {
	saving.value = true;
	try {
		await misskeyApi('hata/mascot/update', {
			characters: characters.value.map(c => ({
				id: c.id,
				name: c.name,
				expressions: c.expressions.map(e => ({ id: e.id, label: e.label, url: e.url, driveFileId: e.driveFileId, bubbleX: e.bubbleX, bubbleY: e.bubbleY, bubbleScale: e.bubbleScale, bubbleTail: e.bubbleTail, motion: e.motion, motionIntensity: e.motionIntensity })),
				phrases: c.phrases.map(p => ({ id: p.id, text: p.text, expressionId: p.expressionId })),
			})),
			activeCharacterId: activeChar.value?.id ?? null,
			showName: showName.value,
		});
		os.toast('マスコットを保存しました');
	} catch (err:any) {
		const code = err?.code ?? err?.id;
		os.alert({ type: 'error', text: '保存に失敗しました。' + (code ? `（${code}）` : '') });
	} finally {
		saving.value = false;
	}
}
</script>

<style lang="scss" module>
.root { display:flex; flex-direction:column; gap:14px; padding:18px 20px 22px; }
.loading { padding:40px 0; text-align:center; opacity:.6; }
.card { background: var(--MI_THEME-panel); border:1px solid var(--MI_THEME-divider); border-radius:14px; padding:14px 16px; }
.cardHead { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.label { font-size:.95rem; font-weight:700; }
.count { font-size:.8rem; opacity:.6; font-variant-numeric:tabular-nums; }
.desc { font-size:.8rem; opacity:.65; line-height:1.6; margin-bottom:10px; }
.empty { font-size:.83rem; opacity:.55; text-align:center; padding:14px; border:1px dashed var(--MI_THEME-divider); border-radius:10px; margin-bottom:10px; }
.row { display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:.9rem; }
.inp { width:100%; box-sizing:border-box; background: var(--MI_THEME-bg); color: var(--MI_THEME-fg); border:1px solid var(--MI_THEME-divider); border-radius:8px; padding:8px 12px; font-family:inherit; font-size:.9rem; }
.footer { display:flex; justify-content:flex-end; gap:8px; padding-top:4px; }

/* ===== プレビュー ===== */
.preview { display:flex; flex-direction:column; gap:14px; background:linear-gradient(135deg, var(--MI_THEME-panel), var(--MI_THEME-bg)); border:1px solid var(--MI_THEME-divider); border-radius:16px; padding:16px; }
.previewStageWrap { position:relative; width:100%; aspect-ratio:16/10; max-height:320px; display:flex; align-items:center; justify-content:center; overflow:hidden; border-radius:12px; }
.previewImg { max-width:70%; max-height:100%; object-fit:contain; filter:drop-shadow(0 4px 12px rgba(0,0,0,.25)); user-select:none; -webkit-user-drag:none; }
.previewEmpty { width:100%; height:100%; display:flex; flex-direction:column; gap:8px; align-items:center; justify-content:center; border:1px dashed var(--MI_THEME-divider); border-radius:12px; opacity:.5; font-size:.75rem; text-align:center; i{ font-size:1.8rem; } }
.previewMeta { display:flex; flex-direction:column; gap:8px; }
.previewName { font-weight:700; font-size:.9rem; }
/* 吹き出し: 立ち絵の上に絶対配置。left/topはbubbleStyleで指定、transformで中心合わせ */
.previewBubble { position:absolute; transform:translate(-50%,-50%); max-width:60%; background: var(--MI_THEME-bg); border:1px solid var(--MI_THEME-divider); border-radius:12px; padding:8px 12px; font-size:.85rem; line-height:1.5; word-break:break-word; cursor:grab; box-shadow:0 2px 10px rgba(0,0,0,.18); touch-action:none; }
.previewBubble:active { cursor:grabbing; }
/* しっぽ(三角形)。左右で位置を切り替え。本体と同じ背景+枠線で繋げて見せる */
.previewBubble::after, .previewBubble::before { content:''; position:absolute; top:50%; width:0; height:0; border-style:solid; }
.tail_left::before { right:100%; transform:translateY(-50%); border-width:8px 10px 8px 0; border-color:transparent var(--MI_THEME-divider) transparent transparent; margin-right:-1px; }
.tail_left::after { right:100%; transform:translateY(-50%); border-width:7px 9px 7px 0; border-color:transparent var(--MI_THEME-bg) transparent transparent; }
.tail_right::before { left:100%; transform:translateY(-50%); border-width:8px 0 8px 10px; border-color:transparent transparent transparent var(--MI_THEME-divider); margin-left:-1px; }
.tail_right::after { left:100%; transform:translateY(-50%); border-width:7px 0 7px 9px; border-color:transparent transparent transparent var(--MI_THEME-bg); }
.bubbleControls { display:flex; flex-direction:column; gap:8px; margin-top:4px; }
.bubbleCtrlRow { display:flex; align-items:center; gap:12px; }
.bubbleCtrlLabel { font-size:.78rem; opacity:.7; min-width:84px; }
.bubbleRange { flex:1; accent-color: var(--MI_THEME-accent); }
.tailToggle { display:flex; gap:4px; }
.tailBtn { padding:4px 14px; border-radius:8px; border:1px solid var(--MI_THEME-divider); background: var(--MI_THEME-bg); color: var(--MI_THEME-fg); cursor:pointer; font-size:.8rem; }
.tailBtnOn { background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); border-color: var(--MI_THEME-accent); }
.previewBubbleDragging { outline:2px solid var(--MI_THEME-accent); opacity:.9; }
.bubblePlaceholder { opacity:.45; }
.bubbleGrip { position:absolute; right:-8px; bottom:-8px; width:20px; height:20px; border-radius:999px; background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); display:flex; align-items:center; justify-content:center; font-size:.6rem; }
.previewHint { font-size:.72rem; opacity:.55; }
.previewChips { display:flex; flex-wrap:wrap; gap:6px; margin-top:2px; }
.previewChip { max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:4px 10px; border-radius:999px; border:1px solid var(--MI_THEME-divider); background: var(--MI_THEME-bg); color: var(--MI_THEME-fg); cursor:pointer; font-size:.76rem; }
.previewChipOn { background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); border-color: var(--MI_THEME-accent); }

/* ===== キャラタブ ===== */
.charTabs { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
.charTab { display:flex; align-items:center; gap:6px; padding:5px 12px 5px 6px; border-radius:999px; border:1px solid var(--MI_THEME-divider); background: var(--MI_THEME-bg); color: var(--MI_THEME-fg); cursor:pointer; font-size:.85rem; }
.charTabOn { background: var(--MI_THEME-accent); color: var(--MI_THEME-fgOnAccent); border-color: var(--MI_THEME-accent); }
.charTabThumb { width:24px; height:24px; border-radius:50%; object-fit:cover; }
.charTabThumbIcon { width:24px; height:24px; display:flex; align-items:center; justify-content:center; opacity:.5; }
.charAdd { display:flex; align-items:center; gap:4px; padding:6px 12px; border-radius:999px; border:1px dashed var(--MI_THEME-divider); background:none; color: var(--MI_THEME-fg); cursor:pointer; font-size:.82rem; }
.delBtn { margin-top:10px; background:none; border:1px solid var(--MI_THEME-divider); color: var(--MI_THEME-error, #e2566d); border-radius:8px; padding:6px 12px; font-size:.8rem; cursor:pointer; }

/* ===== 立ち絵グリッド ===== */
.expGrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); gap:10px; margin-bottom:10px; }
.expItem { position:relative; display:flex; flex-direction:column; gap:6px; padding:8px; background: var(--MI_THEME-bg); border:1px solid var(--MI_THEME-divider); border-radius:10px; }
.expImg { width:100%; aspect-ratio:1; object-fit:contain; border-radius:6px; background: var(--MI_THEME-panelHighlight, rgba(128,128,128,.1)); }
.expLabel { width:100%; box-sizing:border-box; background: var(--MI_THEME-panel); color: var(--MI_THEME-fg); border:1px solid var(--MI_THEME-divider); border-radius:6px; padding:4px 8px; font-size:.78rem; font-family:inherit; }
.expMotion { width:100%; box-sizing:border-box; background: var(--MI_THEME-panel); color: var(--MI_THEME-fg); border:1px solid var(--MI_THEME-divider); border-radius:6px; padding:4px 8px; font-size:.74rem; font-family:inherit; }
.expIntensity { display:flex; align-items:center; gap:6px; }
.expIntensityLabel { font-size:.7rem; opacity:.6; flex-shrink:0; }
.expIntensityRange { flex:1; min-width:0; accent-color: var(--MI_THEME-accent); }
/* 立ち絵の動き */
.motionBounce { animation: htkMascotBounce 1s ease-in-out infinite; }
.motionShake { animation: htkMascotShake .35s linear infinite; }
.motionSway { animation: htkMascotSway 2s ease-in-out infinite; }
.motionSpin { animation: htkMascotSpin 3s linear infinite; }
:global {
	@keyframes htkMascotBounce { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(calc(-8% * var(--htk-motion-i, 1))); } }
	@keyframes htkMascotShake { 0%,100%{ transform:translateX(0); } 25%{ transform:translateX(calc(-4px * var(--htk-motion-i, 1))); } 75%{ transform:translateX(calc(4px * var(--htk-motion-i, 1))); } }
	@keyframes htkMascotSway { 0%,100%{ transform:rotate(calc(-4deg * var(--htk-motion-i, 1))); } 50%{ transform:rotate(calc(4deg * var(--htk-motion-i, 1))); } }
	@keyframes htkMascotSpin { from{ transform:rotate(0); } to{ transform:rotate(360deg); } }
}
.expDel { position:absolute; top:4px; right:4px; width:22px; height:22px; border-radius:999px; border:none; background:rgba(0,0,0,.5); color:#fff; cursor:pointer; font-size:.7rem; display:flex; align-items:center; justify-content:center; }

/* ===== 文言カード ===== */
.phraseCard { background: var(--MI_THEME-bg); border:1px solid var(--MI_THEME-divider); border-radius:12px; padding:12px; margin-bottom:10px; }
.phraseTop { display:flex; gap:8px; align-items:center; }
.phraseTop .inp { flex:1; }
.phraseDel { width:36px; height:36px; flex-shrink:0; border-radius:8px; border:1px solid var(--MI_THEME-divider); background:none; color: var(--MI_THEME-error, #e2566d); cursor:pointer; }
.linkRow { display:flex; align-items:center; gap:6px; margin-top:10px; flex-wrap:wrap; }
.linkLabel { font-size:.78rem; opacity:.7; margin-right:2px; }
.linkThumb { width:40px; height:40px; border-radius:8px; border:2px solid var(--MI_THEME-divider); background: var(--MI_THEME-panel); color: var(--MI_THEME-fg); cursor:pointer; padding:0; overflow:hidden; display:flex; align-items:center; justify-content:center; opacity:.7; }
.linkThumbOn { border-color: var(--MI_THEME-accent); opacity:1; box-shadow:0 0 0 2px var(--MI_THEME-accent) inset; }
.linkThumbImg { width:100%; height:100%; object-fit:cover; }
.linkEmpty { font-size:.76rem; opacity:.5; }

/* ===== スイッチ ===== */
.sw { width:44px; height:24px; background: var(--MI_THEME-divider); border-radius:12px; cursor:pointer; position:relative; transition:background .3s; border:1px solid var(--MI_THEME-divider); flex-shrink:0; }
.sw::after { content:''; position:absolute; width:18px; height:18px; background:#fff; border-radius:50%; top:2px; left:2px; transition:left .25s cubic-bezier(0.34,1.56,0.64,1); box-shadow:0 1px 3px rgba(0,0,0,.2); }
.swOn { background: var(--MI_THEME-accent); border-color: var(--MI_THEME-accent); }
.swOn::after { left:22px; }
.subDivider { height:1px; background: var(--MI_THEME-divider); margin:10px 0; opacity:.6; }
</style>
