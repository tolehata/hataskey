/* SPDX-License-Identifier: AGPL-3.0-only */
import type { entities } from 'cherrypick-js';
import { misskeyApi } from '@/utility/misskey-api.js';

export type HatagoesFeedSource = 'activity' | 'book' | 'recipe' | 'flower' | 'issue';
export type HatagoesFeedItem = {
	id: string; source: HatagoesFeedSource; title: string; body: string; date: string;
	app: 'Hatask' | 'Hatady' | 'HataFeed'; label: string; icon: string; path: string;
	user?: entities.UserLite; chips: string[]; emoji?: string; spoiler?: boolean;
};
type Row = Record<string, unknown>;
type Page = { items: HatagoesFeedItem[]; more: boolean; cursor?: string; offset?: number; page?: number };
type SourceState = { more: boolean; cursor?: string; offset: number; page: number; error: boolean };
type Request = (endpoint: string, data: Record<string, unknown>) => Promise<unknown>;
const row = (value: unknown): Row => value != null && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const str = (value: unknown) => typeof value === 'string' ? value : '';
const list = (value: unknown): Row[] => { if (!Array.isArray(value)) throw new TypeError('共有情報の形式を読み取れませんでした'); return value.map(row); };
const author = (value: unknown): entities.UserLite | undefined => typeof row(value).id === 'string' && typeof row(value).username === 'string' ? value as entities.UserLite : undefined;
const valid = (item: Row) => { if (!str(item.id)) throw new TypeError('共有情報の ID がありません'); return str(item.id); };
const limit = 6;
const request: Request = (endpoint, data) => misskeyApi(endpoint as never, data as never);

export function projectHatagoesFeed(source: HatagoesFeedSource, item: Row): HatagoesFeedItem {
	const id = valid(item);
	const base = { id: `${source}:${id}`, source, title: str(item.title), body: '', date: str(item.createdAt), user: author(item.user), chips: [] as string[] };
	if (source === 'activity') {
		const study = row(item.study), media = row(item.media), session = row(media.session), work = row(media.work);
		const isStudy = !!str(study.id), target = isStudy ? study : session;
		if (!str(target.id)) throw new TypeError('共有記録を読み取れませんでした');
		const labels: Record<string, string> = { study: '学習・読書', exercise: '運動', work: '作業', cooking: '料理', movie_viewing: '映画', game_play: 'プレイ', game_match: '対戦', game_roguelike: 'プレイ', game_pve: 'プレイ' };
		return { ...base, title: str(study.title) || str(work.title) || str(row(session.workSnapshot).title) || '記録', body: str(target.body) || str(target.note), date: str(item.occurredAt), app: 'Hatady', label: labels[str(item.type)] || '記録', icon: isStudy ? 'ti ti-book-2' : 'ti ti-player-play', path: `/hatady?tab=records&hgKind=${isStudy ? 'log' : 'session'}&hgId=${encodeURIComponent(str(target.id))}`, spoiler: isStudy ? row(study.details).spoiler === true : session.noteSpoiler === true, chips: [str(study.subject), typeof study.durationMinutes === 'number' && study.durationMinutes > 0 ? `${study.durationMinutes} 分` : ''].filter(Boolean) };
	}
	if (source === 'book') return { ...base, title: str(item.title), body: str(item.author), date: str(item.finishedAt) || str(item.updatedAt) || base.date, app: 'Hatady', label: '読みおわった本', icon: 'ti ti-book', path: `/hatady?tab=collection&hgKind=book&hgId=${encodeURIComponent(id)}`, chips: [typeof item.totalPages === 'number' ? `${item.totalPages} ページ` : ''].filter(Boolean) };
	if (source === 'recipe') return { ...base, body: str(item.summary), app: 'Hatask', label: 'みんなのレシピ', icon: 'ti ti-chef-hat', path: `/hatask?tab=recipe&hgKind=recipe&hgId=${encodeURIComponent(id)}`, chips: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 3) : [] };
	if (source === 'flower') return { ...base, title: `${str(item.name) || 'おはな'}が咲きました。`, body: str(item.hanakotoba), date: str(item.harvestedAt), app: 'Hatask', label: '花が咲いた', icon: 'ti ti-flower', emoji: str(item.emoji), path: `/hatask?tab=garden&hgKind=flower&hgId=${encodeURIComponent(id)}` };
	const statuses: Record<string, string> = { open: '受付中', planned: '対応予定', inProgress: '対応中', resolved: '解決済み', wontfix: '対応見送り', unknown: '確認中', closed: '終了' };
	return { ...base, body: str(item.description), user: author(item.createdBy), app: 'HataFeed', label: 'イシュー', icon: 'ti ti-message-report', path: `/hatafeed/${encodeURIComponent(id)}`, chips: [statuses[str(item.status)], typeof item.agreementsCount === 'number' ? `${item.agreementsCount} 件の賛同` : ''].filter(Boolean) };
}

async function readPage(source: HatagoesFeedSource, state: SourceState, api: Request): Promise<Page> {
	if (source === 'activity') {
		const result = row(await api('hata/hatady/activities', { scope: 'recent', limit, ...(state.cursor ? { cursor: state.cursor } : {}) }));
		if (typeof result.hasMore !== 'boolean' || result.hasMore && (!str(result.nextCursor) || result.nextCursor === state.cursor)) throw new TypeError('共有記録の続きを読み取れませんでした');
		return { items: list(result.items).map(item => projectHatagoesFeed(source, item)), more: result.hasMore, cursor: str(result.nextCursor) || undefined };
	}
	if (source === 'flower') {
		const result = row(await api('hatask/flowers/list', { page: state.page, limit, order: 'newest' }));
		if (typeof result.totalPages !== 'number') throw new TypeError('おはなの続きを読み取れませんでした');
		return { items: list(result.items).map(item => projectHatagoesFeed(source, item)), more: state.page < result.totalPages, page: state.page + 1 };
	}
	if (source === 'recipe') {
		const result = row(await api('hatask/recipes/list', { scope: 'shared', sort: 'recent', limit, offset: state.offset }));
		const items = list(result.items);
		if (typeof result.total !== 'number' || items.length === 0 && state.offset < result.total) throw new TypeError('レシピの続きを読み取れませんでした');
		return { items: items.map(item => projectHatagoesFeed(source, item)), more: state.offset + items.length < result.total, offset: state.offset + items.length };
	}
	const response = await api(source === 'book' ? 'hata/hatady/books' : 'hata/feedback/issues', { ...(source === 'book' ? { scope: 'public', status: 'finished' } : { projectId: null, includeClosed: true, order: 'recent' }), limit, ...(state.cursor ? { untilId: state.cursor } : {}) });
	const items = list(response), cursor = str(items.at(-1)?.id) || undefined;
	if (items.length && cursor === state.cursor) throw new TypeError('共有情報の続きを読み取れませんでした');
	return { items: items.map(item => projectHatagoesFeed(source, item)), more: items.length === limit, cursor };
}

/** Each existing endpoint remains responsible for visibility, blocks and permissions. */
export function createHatagoesFeedPager(api: Request = request) {
	const sources = new Map<HatagoesFeedSource, SourceState>((['activity', 'flower', 'book', 'recipe', 'issue'] as const).map(source => [source, { more: true, offset: 0, page: 1, error: false }]));
	const seen = new Set<string>();
	let pending: Promise<{ items: HatagoesFeedItem[]; errors: HatagoesFeedSource[]; ended: boolean }> | null = null;
	return {
		load(): NonNullable<typeof pending> {
			if (pending) return pending;
			pending = (async () => {
				const batches = await Promise.all([...sources].map(async ([source, state]) => {
					if (!state.more) return [];
					try {
						const page = await readPage(source, state, api);
						Object.assign(state, { ...page, error: false });
						return page.items.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; });
					} catch (error) {
						if (source === 'issue' && row(error).code === 'HATAFEED_ACCESS_DENIED') { state.more = false; state.error = false; } else state.error = true;
						return [];
					}
				}));
				// Alternate sources without changing previously rendered card positions.
				const items: HatagoesFeedItem[] = [];
				for (let index = 0; index < Math.max(0, ...batches.map(batch => batch.length)); index++) for (const batch of batches) if (batch[index]) items.push(batch[index]);
				return { items, errors: [...sources].filter(([, state]) => state.error).map(([source]) => source), ended: [...sources.values()].every(state => !state.more) };
			})().finally(() => { pending = null; });
			return pending;
		},
	};
}
