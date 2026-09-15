/* SPDX-License-Identifier: AGPL-3.0-only */
import { previewNow } from './hatask-sample.js';
import type * as Misskey from 'cherrypick-js';
import type { HatadyActivity } from '@/utility/hatady-media.js';
import type { HatadyHomePreview } from '@/utility/hatady-home.js';
import type { HataFeedHomeIssue, HataFeedHomeActivity } from '@/utility/hatafeed-home.js';
import type { HataFeedEmojiRequest } from '@/utility/hatafeed.js';
import { homeWork } from '@/utility/hatady-home.js';
import { hatakyuAssetUrl } from '@/utility/hatakyu-assets.js';

const user: Misskey.entities.UserLite = { id: 'intro-sample-owner', name: 'こはる', username: 'koharu', host: null, avatarUrl: '', avatarBlurhash: null, avatarDecorations: [], isLocked: false, emojis: {}, onlineStatus: 'unknown' };
const books = [
	{ id: 'intro-book-1', title: '月の郵便室', author: '青葉 なぎ', userId: 'sample-neighbor', status: 'planned', details: { genre: 'ファンタジー', description: '夜の町をめぐる、小さな手紙の物語。' }, isRecommended: true },
	{ id: 'intro-book-2', title: '夜を編む庭', author: 'みなと', userId: user.id, status: 'in_progress', details: { genre: 'ファンタジー' } },
	{ id: 'intro-book-3', title: '色のある暮らし', author: 'あおい', userId: user.id, status: 'planned', details: { genre: 'エッセイ' } },
	{ id: 'intro-book-4', title: '春を待つ窓', author: 'こはる', userId: user.id, status: 'completed', details: { genre: '小説' } },
];

function activities(community = false): HatadyActivity[] {
	return Array.from({ length: community ? 3 : 14 }, (_, index) => {
		const date = new Date(previewNow); date.setDate(date.getDate() - (community ? 0 : index % 7)); date.setHours(9, 0, 0, 0);
		const author = community ? { ...user, id: `sample-neighbor-${index}`, name: ['こはる', 'あおい', 'みなと'][index] } : user;
		return { id: `intro-log-${index}`, type: 'study', occurredAt: date.toISOString(), user: author, isMine: !community, visibility: 'public',
											study: { id: `intro-log-${index}`, kind: 'study', title: ['夜を編む庭', '色のある暮らし', '春を待つ窓'][index % 3], subject: 'ファンタジー', body: '気になった一節をノートに。', bookId: 'intro-book-2', tags: ['interest'], durationSeconds: 1800, visibility: 'public' },
		};
	});
}

export const hatadySample: HatadyHomePreview = { now: previewNow, viewerId: user.id, rows: activities(), communityRows: activities(true), works: books.map(book => homeWork(book, book.userId === user.id, 'book')) };
const date = previewNow.toISOString();
export const sampleIssues: HataFeedHomeIssue[] = [
	{ id: 'intro-feed-1', number: 42, title: '小さな画面でも、予定を見やすく', category: 'improvement', status: 'inProgress', commentsCount: 3, agreementsCount: 8 },
	{ id: 'intro-feed-2', number: 43, title: '本棚の絞り込み条件を覚えてほしい', category: 'featureRequest', status: 'open', commentsCount: 2, agreementsCount: 5 },
	{ id: 'intro-feed-3', number: 44, title: 'イシュー検索を使いやすく', category: 'improvement', status: 'planned', commentsCount: 1, agreementsCount: 4 },
].map(issue => ({ ...issue, createdBy: user, createdAt: date, pinned: false, closed: false, assignees: [] })) as HataFeedHomeIssue[];
export const sampleRequests: HataFeedEmojiRequest[] = ['hatakyu', 'hatakyu_yay'].map((name, index) => ({ id: `intro-emoji-${index}`, name, status: index ? 'approved' : 'pending', createdAt: date, imageUrl: hatakyuAssetUrl('treasureFound'), requestedBy: user, category: null, aliases: [], license: 'AGPL-3.0-only', localOnly: false, isSensitive: false, sourceType: 'upload', originalUrl: null, remoteHost: null, resolvedComment: null, resolvedById: null, resolvedAt: null, resolvedEmojiId: null }));
export const sampleActivity: HataFeedHomeActivity[] = [
	{ key: 'intro-feed-activity-1', user, verb: 'がコメントしました', label: sampleIssues[0].title, issueId: sampleIssues[0].id, time: date },
	{ key: 'intro-feed-activity-2', user: { ...user, id: 'intro-feed-aoi', name: 'あおい' }, verb: 'が報告しました', label: sampleIssues[1].title, issueId: sampleIssues[1].id, time: date },
];
