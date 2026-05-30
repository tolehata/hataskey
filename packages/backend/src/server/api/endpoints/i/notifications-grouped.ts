/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { In } from 'typeorm';
import * as Redis from 'ioredis';
import { Inject, Injectable } from '@nestjs/common';
import type { NotesRepository } from '@/models/_.js';
import {
	obsoleteNotificationTypes,
	groupedNotificationTypes,
	FilterUnionByProperty,
	notificationTypes,
} from '@/types.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { NotificationEntityService } from '@/core/entities/NotificationEntityService.js';
import { NotificationService } from '@/core/NotificationService.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { MiGroupedNotification, MiNotification } from '@/models/Notification.js';

export const meta = {
	tags: ['account', 'notifications'],

	requireCredential: true,

	limit: {
		duration: 30000,
		max: 30,
	},

	kind: 'read:notifications',

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'Notification',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
		sinceId: { type: 'string', format: 'misskey:id' },
		untilId: { type: 'string', format: 'misskey:id' },
		sinceDate: { type: 'integer' },
		untilDate: { type: 'integer' },
		markAsRead: { type: 'boolean', default: true },
		// 後方互換のため、廃止された通知タイプも受け付ける
		includeTypes: { type: 'array', items: {
			type: 'string', enum: [...notificationTypes, ...obsoleteNotificationTypes],
		} },
		excludeTypes: { type: 'array', items: {
			type: 'string', enum: [...notificationTypes, ...obsoleteNotificationTypes],
		} },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private idService: IdService,
		private notificationEntityService: NotificationEntityService,
		private notificationService: NotificationService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const EXTRA_LIMIT = 100;
			const untilId = ps.untilId ?? (ps.untilDate ? this.idService.gen(ps.untilDate!) : undefined);
			const sinceId = ps.sinceId ?? (ps.sinceDate ? this.idService.gen(ps.sinceDate!) : undefined);

			// includeTypes が空の場合はクエリしない
			if (ps.includeTypes && ps.includeTypes.length === 0) {
				return [];
			}
			// excludeTypes に全指定されている場合はクエリしない
			if (notificationTypes.every(type => ps.excludeTypes?.includes(type))) {
				return [];
			}

			const includeTypes = ps.includeTypes && ps.includeTypes.filter(type => !(obsoleteNotificationTypes).includes(type as any)) as typeof groupedNotificationTypes[number][];
			const excludeTypes = ps.excludeTypes && ps.excludeTypes.filter(type => !(obsoleteNotificationTypes).includes(type as any)) as typeof groupedNotificationTypes[number][];

			const notifications = await this.notificationService.getNotifications(me.id, {
				sinceId: sinceId,
				untilId: untilId,
				limit: ps.limit,
				includeTypes,
				excludeTypes,
			});

			if (notifications.length === 0) {
				return [];
			}

			// Mark all as read
			if (ps.markAsRead) {
				this.notificationService.readAllNotification(me.id);
			}

			// grouping
			// 旗鯖fork: リアクション通知のグルーピングを「隣接比較」から「全体集約」方式に変更。
			// 旧実装は prev (直前) のみと比較していたため、同じノートへのリアクションが時系列で
			// 飛び石になると複数グループに分裂し、(1) 同じ投稿の通知が重複表示される、
			// (2) 分裂で水増しされたグループが slice(limit) で切られてリアクションが欠落する、
			// という不具合があった。リアクションは全体を走査して noteId / notifierId で集約することで
			// 飛び石でも 1 グループにまとめ、重複と欠落を解消する。
			// renote / note のグルーピングは Misskey 標準の隣接比較のまま (問題が無いため変更しない)。

			// (1) リアクション通知を noteId ごとに集約 (同じノートへの複数ユーザー → reaction:grouped 候補)
			const reactionsByNote = new Map<string, FilterUnionByProperty<MiNotification, 'type', 'reaction'>[]>();
			for (const n of notifications) {
				if (n.type !== 'reaction' || n.noteId == null) continue;
				const arr = reactionsByNote.get(n.noteId);
				if (arr) arr.push(n as any);
				else reactionsByNote.set(n.noteId, [n as any]);
			}

			// (2) 「そのノートへのリアクションが自分だけ (1件)」のものは groupedByUser 候補に回す。
			//     2件以上のノートは reaction:grouped として確定 (同じノートへの複数人リアクションを最優先)。
			const groupedReactionNoteIds = new Set<string>(); // reaction:grouped に確定した noteId
			const singleReactions: FilterUnionByProperty<MiNotification, 'type', 'reaction'>[] = []; // groupedByUser 候補
			for (const [noteId, arr] of reactionsByNote) {
				if (arr.length >= 2) {
					groupedReactionNoteIds.add(noteId);
				} else {
					singleReactions.push(arr[0]);
				}
			}

			// (3) 単独リアクションを notifierId ごとに集約 (同じユーザーが複数ノート → reaction:groupedByUser 候補)
			const reactionsByUser = new Map<string, FilterUnionByProperty<MiNotification, 'type', 'reaction'>[]>();
			for (const n of singleReactions) {
				if (n.notifierId == null) continue;
				const arr = reactionsByUser.get(n.notifierId);
				if (arr) arr.push(n);
				else reactionsByUser.set(n.notifierId, [n]);
			}
			const groupedByUserNotifierIds = new Set<string>(); // groupedByUser に確定した notifierId
			for (const [notifierId, arr] of reactionsByUser) {
				if (arr.length >= 2) groupedByUserNotifierIds.add(notifierId);
			}

			// (4) 元の時系列順を保ったまま 1 パスで構築する。
			//     各グループは「最初に出現した位置」に 1 つだけ置き、以降の同グループ要素はスキップする。
			const emittedReactionNoteIds = new Set<string>();
			const emittedByUserNotifierIds = new Set<string>();
			const groupedNotifications: MiGroupedNotification[] = [];

			for (let i = 0; i < notifications.length; i++) {
				const notification = notifications[i];

				// --- リアクション: 全体集約の結果を使って 1 グループ = 1 エントリで出力 ---
				if (notification.type === 'reaction' && notification.noteId != null) {
					const noteId = notification.noteId;
					// 同じノートへの複数人リアクション → reaction:grouped
					if (groupedReactionNoteIds.has(noteId)) {
						if (emittedReactionNoteIds.has(noteId)) continue; // 既に出力済みなのでスキップ (重複防止)
						emittedReactionNoteIds.add(noteId);
						const arr = reactionsByNote.get(noteId)!;
						groupedNotifications.push({
							type: 'reaction:grouped',
							id: arr[arr.length - 1].id, // 最新の通知IDを代表に
							createdAt: arr[0].createdAt,
							noteId,
							reactions: arr.map(r => ({
								userId: r.notifierId!,
								reaction: r.reaction!,
							})),
						});
						continue;
					}
					// 同じユーザーが複数ノートにリアクション → reaction:groupedByUser
					if (notification.notifierId != null && groupedByUserNotifierIds.has(notification.notifierId)) {
						const notifierId = notification.notifierId;
						if (emittedByUserNotifierIds.has(notifierId)) continue; // 既に出力済みなのでスキップ
						emittedByUserNotifierIds.add(notifierId);
						const arr = reactionsByUser.get(notifierId)!;
						groupedNotifications.push({
							type: 'reaction:groupedByUser',
							id: arr[arr.length - 1].id,
							createdAt: arr[0].createdAt,
							notifierId,
							reactions: arr.map(r => ({
								noteId: r.noteId!,
								reaction: r.reaction!,
								createdAt: r.createdAt,
							})),
						});
						continue;
					}
					// どちらにも属さない完全な単発リアクションはそのまま
					groupedNotifications.push(notification);
					continue;
				}

				// --- renote / note: Misskey標準の隣接比較を維持 ---
				const prevGroupedNotification = groupedNotifications.at(-1);
				if (prevGroupedNotification != null && i > 0) {
					const prev = notifications[i - 1];
					if (prev.type === 'renote' && notification.type === 'renote' && prev.targetNoteId === notification.targetNoteId) {
						let target = prevGroupedNotification;
						if (target.type !== 'renote:grouped') {
							groupedNotifications[groupedNotifications.length - 1] = {
								type: 'renote:grouped',
								id: '',
								createdAt: notification.createdAt,
								noteId: prev.noteId!,
								userIds: [prev.notifierId!],
							};
							target = groupedNotifications.at(-1)!;
						}
						(target as FilterUnionByProperty<MiGroupedNotification, 'type', 'renote:grouped'>).userIds.push(notification.notifierId!);
						target.id = notification.id;
						continue;
					}
					if (prev.type === 'note' && notification.type === 'note') {
						let target = prevGroupedNotification;
						if (target.type !== 'note:grouped') {
							groupedNotifications[groupedNotifications.length - 1] = {
								type: 'note:grouped',
								id: '',
								createdAt: notification.createdAt,
								noteIds: [notification.noteId],
								notifierIds: [prev.notifierId!],
							};
							target = groupedNotifications.at(-1)!;
						}
						if (!(target as FilterUnionByProperty<MiGroupedNotification, 'type', 'note:grouped'>).notifierIds.includes(notification.notifierId)) {
							(target as FilterUnionByProperty<MiGroupedNotification, 'type', 'note:grouped'>).notifierIds.push(notification.notifierId!);
						}
						(target as FilterUnionByProperty<MiGroupedNotification, 'type', 'note:grouped'>).noteIds.push(notification.noteId!);
						target.id = notification.id;
						continue;
					}
				}

				groupedNotifications.push(notification);
			}

			const limitedGroupedNotifications = groupedNotifications.slice(0, ps.limit);

			return await this.notificationEntityService.packGroupedMany(limitedGroupedNotifications, me.id);
		});
	}
}
