/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 旗鯖fork: マスコット機能の表示用ストア(P3 段階3-1)。
 *   - hata/mascot/get でデータを取得。updatedAt をキーにキャッシュし、差分があるときだけ再取得
 *   - 画像はドライブURLを fetch して Blob を IndexedDB(idb-proxy)にキャッシュし、
 *     ObjectURL を作って表示する。普段はドライブから読み込まない(エグレス削減)
 *   - updatedAt が変わったら画像キャッシュも作り直す
 *   - テキストは表示側でエスケープして使う(XSS防御)
 */

import { ref, computed } from 'vue';
import { get as idbGet, set as idbSet, del as idbDel } from '@/utility/idb-proxy.js';
import { misskeyApi } from '@/utility/misskey-api.js';

export type MascotExpression = { id: string; label: string; url: string; driveFileId: string | null; bubbleX?: number; bubbleY?: number; bubbleScale?: number; bubbleTail?: 'left' | 'right'; motion?: 'none' | 'bounce' | 'shake' | 'sway' | 'spin'; motionIntensity?: number };
export type MascotPhrase = { id: string; text: string; expressionId: string | null };
export type MascotCharacter = { id: string; name: string; expressions: MascotExpression[]; phrases: MascotPhrase[] };
export type MascotData = {
	characters: MascotCharacter[];
	activeCharacterId: string | null;
	showName: boolean;
	updatedAt: number;
};

const DATA_CACHE_KEY = 'hataMascot:data';
const IMG_CACHE_PREFIX = 'hataMascot:img:';

// メモリ上の状態(全コンポーネントで共有)
export const mascotData = ref<MascotData | null>(null);
export const mascotLoaded = ref(false);
// driveFileId(なければurl) -> ObjectURL の解決済みマップ
const imageObjectUrls = ref<Record<string, string>>({});

// HTML エスケープ(表示前に必ず通す)
export function escapeText(s: string): string {
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function imgCacheKey(e: MascotExpression): string {
	return IMG_CACHE_PREFIX + (e.driveFileId ?? e.url);
}

// 1枚の画像を取得(キャッシュ優先)。dataのupdatedAtが変わっていれば作り直す。
async function resolveImage(e: MascotExpression, dataUpdatedAt: number): Promise<void> {
	const key = imgCacheKey(e);
	const memoKey = e.driveFileId ?? e.url;
	try {
		const cached = await idbGet(key) as { updatedAt: number; blob: Blob } | undefined;
		if (cached && cached.updatedAt === dataUpdatedAt && cached.blob instanceof Blob) {
			imageObjectUrls.value[memoKey] = URL.createObjectURL(cached.blob);
			return;
		}
		// キャッシュ無し or 古い -> fetch して Blob を保存
		const res = await fetch(e.url);
		if (!res.ok) throw new Error('fetch failed');
		const blob = await res.blob();
		try { await idbSet(key, { updatedAt: dataUpdatedAt, blob }); } catch { /* localStorageフォールバック時はBlob保存不可。URL直表示にフォールバック */ }
		imageObjectUrls.value[memoKey] = URL.createObjectURL(blob);
	} catch {
		// 取得失敗時は元のURLを直接使う(最低限表示はできる)
		imageObjectUrls.value[memoKey] = e.url;
	}
}

// 表情の表示用URL(ObjectURL優先、なければ元URL)
export function expressionDisplayUrl(e: MascotExpression | null | undefined): string {
	if (!e) return '';
	const memoKey = e.driveFileId ?? e.url;
	return imageObjectUrls.value[memoKey] ?? e.url;
}

// 旧ObjectURLを解放
function revokeAll() {
	for (const u of Object.values(imageObjectUrls.value)) {
		if (u.startsWith('blob:')) URL.revokeObjectURL(u);
	}
	imageObjectUrls.value = {};
}

// データを読み込む。キャッシュを即時反映し、サーバーと updatedAt が違えば更新する。
export async function loadMascot(force = false): Promise<void> {
	// まずキャッシュを反映(即表示)
	if (!force) {
		try {
			const cached = await idbGet(DATA_CACHE_KEY) as MascotData | undefined;
			if (cached) {
				mascotData.value = cached;
				await resolveImagesFor(cached);
			}
		} catch { /* noop */ }
	}

	// サーバーから最新を取得して updatedAt を比較
	try {
		const res = await misskeyApi('hata/mascot/get', {});
		const data = res.data as MascotData | Record<string, never>;
		if (!data || !Array.isArray((data as MascotData).characters) || (data as MascotData).characters.length === 0) {
			mascotData.value = null;
			mascotLoaded.value = true;
			return;
		}
		const fresh = data as MascotData;
		const prev = mascotData.value;
		if (!prev || prev.updatedAt !== fresh.updatedAt || force) {
			revokeAll();
			mascotData.value = fresh;
			try { await idbSet(DATA_CACHE_KEY, fresh); } catch { /* noop */ }
			await resolveImagesFor(fresh);
		}
	} catch {
		// オフライン等。キャッシュがあればそれを使う
	} finally {
		mascotLoaded.value = true;
	}
}

async function resolveImagesFor(data: MascotData): Promise<void> {
	const tasks: Promise<void>[] = [];
	for (const c of data.characters) {
		for (const e of c.expressions) {
			tasks.push(resolveImage(e, data.updatedAt));
		}
	}
	await Promise.allSettled(tasks);
}

export async function clearMascotCache(): Promise<void> {
	revokeAll();
	try { await idbDel(DATA_CACHE_KEY); } catch { /* noop */ }
	// 個別画像キャッシュは updatedAt 変更時に上書きされるため、ここでは data キャッシュのみ消す
}

// アクティブキャラ
export const activeCharacter = computed<MascotCharacter | null>(() => {
	const d = mascotData.value;
	if (!d) return null;
	return d.characters.find(c => c.id === d.activeCharacterId) ?? d.characters[0] ?? null;
});

// 現在の文言・表情(ランダム選択)
export const currentPhrase = ref<MascotPhrase | null>(null);

export function pickRandomPhrase(): void {
	const c = activeCharacter.value;
	if (!c || c.phrases.length === 0) { currentPhrase.value = null; return; }
	// 直前と違うものを選ぶ(1つしかない場合はそのまま)
	if (c.phrases.length === 1) { currentPhrase.value = c.phrases[0]; return; }
	let next: MascotPhrase;
	do {
		next = c.phrases[Math.floor(Math.random() * c.phrases.length)];
	} while (next.id === currentPhrase.value?.id);
	currentPhrase.value = next;
}

// 現在の表情(announce中はその表情、なければ文言に紐づくもの、なければ先頭表情)
export const currentExpression = computed<MascotExpression | null>(() => {
	const c = activeCharacter.value;
	if (!c) return null;
	// announce中はそのメッセージが指定する表情(種別)を優先
	if (announceMessage.value) {
		const t = announceMessage.value.expressionType;
		if (t) {
			const byType = findExpressionByType(c, t);
			if (byType) return byType;
		}
		const linkedA = announceMessage.value.expressionId;
		if (linkedA) {
			const f = c.expressions.find(e => e.id === linkedA);
			if (f) return f;
		}
	}
	const linked = currentPhrase.value?.expressionId;
	if (linked) {
		const found = c.expressions.find(e => e.id === linked);
		if (found) return found;
	}
	return c.expressions[0] ?? null;
});

// ===== 表情の種別 =====
// 立ち絵に種別(通知/笑/泣/ノーマル/疑問/怒)を持たせ、状況に応じた表情を出せるようにする。
// 正式なフィールド追加は後の段階で行うが、当面はラベル文字列からの簡易マッチで対応する。
export type ExpressionType = 'notify' | 'smile' | 'cry' | 'normal' | 'question' | 'angry';
const EXPR_TYPE_KEYWORDS: Record<ExpressionType, string[]> = {
	notify: ['通知', 'notify', 'notification', 'お知らせ'],
	smile: ['笑', 'smile', 'happy', 'うれし', '嬉'],
	cry: ['泣', 'cry', 'sad', 'かなし', '悲'],
	normal: ['ノーマル', 'normal', '通常', 'デフォルト', 'default'],
	question: ['疑問', 'question', 'はてな', '?', '？'],
	angry: ['怒', 'angry', 'おこ'],
};
export function findExpressionByType(c: MascotCharacter, type: ExpressionType): MascotExpression | null {
	const kws = EXPR_TYPE_KEYWORDS[type] ?? [];
	for (const e of c.expressions) {
		const label = (e.label ?? '').toLowerCase();
		if (kws.some(k => label.includes(k.toLowerCase()))) return e;
	}
	return null;
}

// ===== 表示設定(registry 端末共通) =====
// 「マスコットが何を伝えるか」のトグル群と、標準通知トーストの無効化トグル。
const SETTINGS_SCOPE = ['client', 'hataMascot'];
const SETTINGS_KEY = 'displaySettings';

export type MascotDisplaySettings = {
	tellBirthday: boolean;       // 誕生日を祝う
	tellNotifications: boolean;  // 通知を伝える(来たとき)
	tellRandomPhrases: boolean;  // 設定文言をランダム表示
	tellUnreadOnLogin: boolean;  // ログイン時の未読通知数
	tellHataskNotifications: boolean; // Hataskの通知を伝える
	suppressStandardToast: boolean;   // 通知を伝える時に標準トーストを無効化
};

export const defaultDisplaySettings: MascotDisplaySettings = {
	tellBirthday: true,
	tellNotifications: true,
	tellRandomPhrases: true,
	tellUnreadOnLogin: true,
	tellHataskNotifications: true,
	suppressStandardToast: true,
};

export const displaySettings = ref<MascotDisplaySettings>({ ...defaultDisplaySettings });
export const displaySettingsLoaded = ref(false);

export async function loadDisplaySettings(): Promise<void> {
	try {
		const v = await misskeyApi('i/registry/get', { key: SETTINGS_KEY, scope: SETTINGS_SCOPE }) as Partial<MascotDisplaySettings> | null;
		displaySettings.value = { ...defaultDisplaySettings, ...(v ?? {}) };
	} catch {
		displaySettings.value = { ...defaultDisplaySettings };
	} finally {
		displaySettingsLoaded.value = true;
	}
}
export async function saveDisplaySettings(v: MascotDisplaySettings): Promise<void> {
	displaySettings.value = v;
	try { await misskeyApi('i/registry/set', { key: SETTINGS_KEY, value: v, scope: SETTINGS_SCOPE }); } catch { /* noop */ }
}

// 標準通知トーストを抑制すべきか(common.vue から参照)。
// 「通知を伝える」かつ「標準トースト無効化」が両方ONのときだけ抑制する。
export function shouldSuppressStandardToast(): boolean {
	return displaySettings.value.tellNotifications === true && displaySettings.value.suppressStandardToast === true;
}

// ===== announce(割り込みメッセージ) =====
// 通知・誕生日・未読などをマスコットに一時的に喋らせる。一定時間で消えてアイドルに戻る。
export type AnnounceMessage = {
	text: string;
	expressionType?: ExpressionType | null;
	expressionId?: string | null;
};
export const announceMessage = ref<AnnounceMessage | null>(null);
let announceTimer: ReturnType<typeof setTimeout> | null = null;

export function announce(text: string, opts: { expressionType?: ExpressionType | null; durationMs?: number } = {}): void {
	announceMessage.value = { text, expressionType: opts.expressionType ?? 'notify' };
	if (announceTimer) clearTimeout(announceTimer);
	announceTimer = setTimeout(() => { announceMessage.value = null; announceTimer = null; }, opts.durationMs ?? 8000);
}

// 表示すべきテキスト(announce優先、なければ現在のランダム文言)。表示側でエスケープして使う。
export const displayText = computed<string>(() => {
	if (announceMessage.value) return announceMessage.value.text;
	if (displaySettings.value.tellRandomPhrases) return currentPhrase.value?.text ?? '';
	return '';
});
