/*
 * 旗鯖fork(Hatady P5): 学習記録を人間可読な .txt にエクスポートする。
 *   既存の hata/hatady/logs (sinceDate/untilDate + untilId ページング) をループ取得し、
 *   日付見出しごとに整形。冒頭にサマリ(期間/総時間/件数/連続)を付与して Blob ダウンロード。
 * 旗鯖fork(Hatady media): 映画・ゲームの作品/記録は、将来の読込拡張に備えた版付き JSON
 *   として別に書き出す。学習時間へ混ぜず、保存済みの言語非依存 enum と公開範囲を維持する。
 *   現時点では書き出し専用で、読込UIは提供しない。
 */
import { versatileLang } from '@@/js/intl-const.js';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { hatadyTzOffset } from '@/utility/hatady-prefs.js';

const MAX_PAGES = 50; // 100件×50 = 上限5000件(暴走防止)

export const HATADY_MEDIA_EXPORT_FORMAT = 'hatady-media' as const;
export const HATADY_MEDIA_EXPORT_VERSION = 1 as const;
export const HATADY_MEDIA_EXPORT_LIMIT_ERROR = 'HATADY_MEDIA_EXPORT_LIMIT_EXCEEDED' as const;
export const HATADY_MEDIA_EXPORT_INVALID_RESPONSE = 'HATADY_MEDIA_EXPORT_INVALID_RESPONSE' as const;
export const HATADY_MEDIA_EXPORT_CURSOR_STALLED = 'HATADY_MEDIA_EXPORT_CURSOR_STALLED' as const;

export type HatadyMediaExportArchive = {
	format: typeof HATADY_MEDIA_EXPORT_FORMAT;
	formatVersion: typeof HATADY_MEDIA_EXPORT_VERSION;
	serverVersion: string;
	exportedAt: string;
	timezone: string;
	works: unknown[];
	sessions: unknown[];
};

export function buildHatadyMediaExportArchive(
	works: unknown[],
	sessions: unknown[],
	opts?: { now?: Date; serverVersion?: string; timezone?: string },
): HatadyMediaExportArchive {
	const now = opts?.now ?? new Date();
	return {
		format: HATADY_MEDIA_EXPORT_FORMAT,
		formatVersion: HATADY_MEDIA_EXPORT_VERSION,
		serverVersion: opts?.serverVersion ?? (typeof _VERSION_ === 'string' ? _VERSION_ : 'unknown'),
		exportedAt: now.toISOString(),
		timezone: opts?.timezone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'),
		works,
		sessions,
	};
}

function pad(n: number): string { return n.toString().padStart(2, '0'); }

function ymdKey(d: Date): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function fileStamp(d: Date): string { return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`; }

function fmtDuration(min: number): string {
	const tx = i18n.tsx._hata._hatady._exportText;
	const h = Math.floor(min / 60);
	const m = min % 60;
	if (h > 0 && m > 0) return tx.durationHoursMinutes({ hours: h, minutes: m });
	if (h > 0) return tx.durationHours({ hours: h });
	return tx.durationMinutes({ minutes: Math.max(0, m) });
}

const dateFormatter = new Intl.DateTimeFormat(versatileLang, { year: 'numeric', month: '2-digit', day: '2-digit' });
const weekdayFormatter = new Intl.DateTimeFormat(versatileLang, { weekday: 'short' });

/**
 * 期間内の学習ログを取得して .txt をダウンロードする。
 * @param opts.sinceDate / untilDate  ms epoch(端は含む)。null で無制限。
 */
export async function exportHatadyLogs(opts: { sinceDate: number | null; untilDate: number | null }): Promise<{ count: number }> {
	// untilDate はその日の終わりまで含める。
	const untilDate = opts.untilDate != null ? opts.untilDate + (24 * 60 * 60 * 1000 - 1) : null;

	// ログをページング取得。
	//   logs エンドポイントは studiedAt 降順で返すが、カーソルは untilId(id)で id 順の前提。
	//   studiedAt(ユーザー入力の学習日時)と id(作成順)は一致しないため、id カーソルだと
	//   期間エクスポートで取りこぼしが起きうる。そこで studiedAt を下限へ動かすカーソルで遡り、
	//   境界(<= 包含)の重複は id の Set で除去する。
	const logs: any[] = [];
	const seen = new Set<string>();
	let cursorUntil: number | null = untilDate; // 上限(ms)。null なら制限なし。
	for (let page = 0; page < MAX_PAGES; page++) {
		const batch: any[] = await misskeyApi('hata/hatady/logs', {
			limit: 100,
			sinceDate: opts.sinceDate ?? undefined,
			untilDate: cursorUntil ?? undefined,
		}).catch(() => []);
		if (!Array.isArray(batch) || batch.length === 0) break;
		const fresh = batch.filter(b => b?.id && !seen.has(b.id));
		if (fresh.length === 0) break; // これ以上新しい記録が取れない(境界だけ)。
		for (const b of fresh) { seen.add(b.id); logs.push(b); }
		if (batch.length < 100) break;
		// 次ページ: このバッチの最古 studiedAt を新しい上限に(<= 包含なので重複は上で除去)。
		const minStudied = Math.min(...batch.map(b => new Date(b.studiedAt).getTime()));
		if (!Number.isFinite(minStudied) || minStudied === cursorUntil) break;
		cursorUntil = minStudied;
	}

	const stats: any = await misskeyApi('hata/hatady/stats', { tzOffset: hatadyTzOffset() }).catch(() => null);

	// 古い順に並べ、日付でグルーピング。
	logs.sort((a, b) => new Date(a.studiedAt).getTime() - new Date(b.studiedAt).getTime());
	const byDay = new Map<string, any[]>();
	let totalMinutes = 0;
	for (const log of logs) {
		totalMinutes += log.durationMinutes ?? 0;
		const d = new Date(log.studiedAt);
		const k = ymdKey(d);
		if (!byDay.has(k)) byDay.set(k, []);
		byDay.get(k)!.push(log);
	}

	// ===== 整形 =====
	const now = new Date();
	const copy = i18n.ts._hata._hatady._exportText;
	const tx = i18n.tsx._hata._hatady._exportText;
	const lines: string[] = [];
	lines.push(copy.title);
	const periodStr = (opts.sinceDate != null || opts.untilDate != null)
		? tx.periodRange({ from: opts.sinceDate != null ? dateFormatter.format(new Date(opts.sinceDate)) : '—', to: opts.untilDate != null ? dateFormatter.format(new Date(opts.untilDate)) : '—' })
		: copy.all;
	lines.push(tx.periodLine({ period: periodStr }));
	lines.push(tx.exportedLine({ date: dateFormatter.format(now), time: `${pad(now.getHours())}:${pad(now.getMinutes())}` }));
	lines.push(tx.summaryLine({ duration: fmtDuration(totalMinutes), count: logs.length }));
	if (stats) {
		lines.push(tx.streakLine({ days: stats.streakDays ?? 0 }));
	}
	lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	lines.push('');

	if (logs.length === 0) {
		lines.push(copy.empty);
	} else {
		const dayKeys = [...byDay.keys()].sort();
		for (const k of dayKeys) {
			const items = byDay.get(k)!;
			const d = new Date(items[0].studiedAt);
			const dayMinutes = items.reduce((s, x) => s + (x.durationMinutes ?? 0), 0);
			lines.push(tx.dayLine({ date: dateFormatter.format(d), weekday: weekdayFormatter.format(d), count: items.length, duration: fmtDuration(dayMinutes) }));
			for (const log of items) {
				const time = `${pad(new Date(log.studiedAt).getHours())}:${pad(new Date(log.studiedAt).getMinutes())}`;
				const subj = log.subject ? `[${log.subject}] ` : '';
				lines.push(tx.logLine({ time, subject: subj, title: log.title ?? '', duration: fmtDuration(log.durationMinutes ?? 0) }));
				if (log.book?.title) {
					const pages = (log.pageFrom != null && log.pageTo != null) ? ` p.${log.pageFrom} → p.${log.pageTo}` : '';
					lines.push(tx.bookLine({ book: `${log.book.title}${log.book.author ? ' / ' + log.book.author : ''}${pages}` }));
				}
				if (log.body) {
					// メモは複数行対応(各行をインデント)。
					for (const bl of String(log.body).split('\n')) lines.push(`\u3000${bl}`);
				}
			}
			lines.push('');
		}
	}

	const text = lines.join('\r\n');
	const fromStamp = opts.sinceDate != null ? fileStamp(new Date(opts.sinceDate)) : 'all';
	const toStamp = opts.untilDate != null ? fileStamp(new Date(opts.untilDate)) : fileStamp(now);
	const filename = `hatady_${fromStamp}-${toStamp}.txt`;

	// Blob ダウンロード。
	const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = window.document.createElement('a');
	a.href = url;
	a.download = filename;
	window.document.body.appendChild(a);
	a.click();
	window.document.body.removeChild(a);
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);

	return { count: logs.length };
}

function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = window.document.createElement('a');
	a.href = url;
	a.download = filename;
	window.document.body.appendChild(a);
	a.click();
	window.document.body.removeChild(a);
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function asItems(value: unknown): unknown[] {
	if (Array.isArray(value)) return value;
	if (value != null && typeof value === 'object') {
		const items = (value as { items?: unknown }).items;
		if (Array.isArray(items)) return items;
	}
	throw new Error(HATADY_MEDIA_EXPORT_INVALID_RESPONSE);
}

export async function fetchMediaPages(endpoint: 'hata/hatady/media/works/list' | 'hata/hatady/media/sessions/list'): Promise<unknown[]> {
	const all: unknown[] = [];
	const seen = new Set<string>();
	let untilId: string | undefined;
	for (let page = 0; page < MAX_PAGES; page++) {
		const response = await misskeyApi(endpoint, { limit: 100, untilId });
		const items = asItems(response);
		if (items.length === 0) break;
		if (items.length > 100) throw new Error(HATADY_MEDIA_EXPORT_INVALID_RESPONSE);
		for (const item of items) {
			if (item == null || typeof item !== 'object') throw new Error(HATADY_MEDIA_EXPORT_INVALID_RESPONSE);
			const itemId = (item as { id?: unknown }).id;
			if (typeof itemId !== 'string' || itemId.length === 0) throw new Error(HATADY_MEDIA_EXPORT_INVALID_RESPONSE);
			if (seen.has(itemId)) throw new Error(HATADY_MEDIA_EXPORT_CURSOR_STALLED);
			seen.add(itemId);
			all.push(item);
		}
		if (items.length < 100) break;
		const lastId = (items.at(-1) as { id?: unknown } | undefined)?.id;
		if (typeof lastId !== 'string' || lastId.length === 0) throw new Error(HATADY_MEDIA_EXPORT_INVALID_RESPONSE);
		if (lastId === untilId) throw new Error(HATADY_MEDIA_EXPORT_CURSOR_STALLED);
		untilId = lastId;
		if (page === MAX_PAGES - 1) {
			const probeResponse = await misskeyApi(endpoint, { limit: 1, untilId });
			if (asItems(probeResponse).length > 0) throw new Error(HATADY_MEDIA_EXPORT_LIMIT_ERROR);
		}
	}
	return all;
}

/**
 * 映画・ゲーム作品と、その視聴/プレイ記録を版付き JSON へ書き出す。
 * 将来の読込実装が部分データを黙って受理しないよう、format/versionを必ず含める。
 */
export async function exportHatadyMediaArchive(): Promise<{ works: number; sessions: number }> {
	const [works, sessions] = await Promise.all([
		fetchMediaPages('hata/hatady/media/works/list'),
		fetchMediaPages('hata/hatady/media/sessions/list'),
	]);
	const now = new Date();
	const archive = buildHatadyMediaExportArchive(works, sessions, { now });
	const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json;charset=utf-8' });
	downloadBlob(blob, `hatady_media_${fileStamp(now)}.json`);
	return { works: works.length, sessions: sessions.length };
}
