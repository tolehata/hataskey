/*
 * 旗鯖fork(Hatady P5): 学習記録を人間可読な .txt にエクスポートする。
 *   既存の hata/hatady/logs (sinceDate/untilDate + untilId ページング) をループ取得し、
 *   日付見出しごとに整形。冒頭にサマリ(期間/総時間/件数/連続)を付与して Blob ダウンロード。
 */
import { versatileLang } from '@@/js/intl-const.js';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { hatadyTzOffset } from '@/utility/hatady-prefs.js';

const MAX_PAGES = 50; // 100件×50 = 上限5000件(暴走防止)

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
					for (const bl of String(log.body).split('\n')) lines.push(`　${bl}`);
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
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	setTimeout(() => URL.revokeObjectURL(url), 1000);

	return { count: logs.length };
}
