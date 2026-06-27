/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundError, In } from 'typeorm';
import { ModuleRef } from '@nestjs/core';
import { DI } from '@/di-symbols.js';
import type { Packed } from '@/misc/json-schema.js';
import { awaitAll } from '@/misc/prelude/await-all.js';
import type { MiUser } from '@/models/User.js';
import type { MiNote } from '@/models/Note.js';
import type { MiChannel } from '@/models/Channel.js';
import type { UsersRepository, NotesRepository, FollowingsRepository, PollsRepository, PollVotesRepository, NoteReactionsRepository, ChannelsRepository, ChannelMembersRepository, InstancesRepository, MiMeta, EventsRepository, UtageSessionsRepository } from '@/models/_.js';
import { bindThis } from '@/decorators.js';
import { DebounceLoader } from '@/misc/loader.js';
import { IdService } from '@/core/IdService.js';
import { ReactionsBufferingService } from '@/core/ReactionsBufferingService.js';
import { RoleService } from '@/core/RoleService.js';
import type { OnModuleInit } from '@nestjs/common';
import type { CustomEmojiService } from '../CustomEmojiService.js';
import type { ReactionService } from '../ReactionService.js';
import type { UserEntityService } from './UserEntityService.js';
import type { DriveFileEntityService } from './DriveFileEntityService.js';

// is-renote.tsとよしなにリンク
function isPureRenote(note: MiNote): note is MiNote & { renoteId: MiNote['id']; renote: MiNote } {
	return (
		note.renote != null &&
		note.reply == null &&
		note.text == null &&
		note.cw == null &&
		(note.fileIds == null || note.fileIds.length === 0) &&
		!note.hasPoll
	);
}

function getAppearNoteIds(notes: MiNote[]): Set<string> {
	const appearNoteIds = new Set<string>();
	for (const note of notes) {
		if (isPureRenote(note)) {
			appearNoteIds.add(note.renoteId);
		} else {
			appearNoteIds.add(note.id);
		}
	}
	return appearNoteIds;
}

async function nullIfEntityNotFound<T>(promise: Promise<T>): Promise<T | null> {
	try {
		return await promise;
	} catch (err) {
		if (err instanceof EntityNotFoundError) {
			return null;
		}
		throw err;
	}
}

@Injectable()
export class NoteEntityService implements OnModuleInit {
	private userEntityService: UserEntityService;
	private driveFileEntityService: DriveFileEntityService;
	private customEmojiService: CustomEmojiService;
	private reactionService: ReactionService;
	private reactionsBufferingService: ReactionsBufferingService;
	private idService: IdService;
	private noteLoader = new DebounceLoader(this.findNoteOrFail);
	private roleService: RoleService;

	constructor(
		private moduleRef: ModuleRef,

		@Inject(DI.meta)
		private meta: MiMeta,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.followingsRepository)
		private followingsRepository: FollowingsRepository,

		@Inject(DI.pollsRepository)
		private pollsRepository: PollsRepository,

		@Inject(DI.eventsRepository)
		private eventsRepository: EventsRepository,

		@Inject(DI.utageSessionsRepository)
		private utageSessionsRepository: UtageSessionsRepository,

		@Inject(DI.pollVotesRepository)
		private pollVotesRepository: PollVotesRepository,

		@Inject(DI.noteReactionsRepository)
		private noteReactionsRepository: NoteReactionsRepository,

		@Inject(DI.channelsRepository)
		private channelsRepository: ChannelsRepository,

		@Inject(DI.channelMembersRepository)
		private channelMembersRepository: ChannelMembersRepository,

		@Inject(DI.instancesRepository)
		private instancesRepository: InstancesRepository,

		//private userEntityService: UserEntityService,
		//private driveFileEntityService: DriveFileEntityService,
		//private customEmojiService: CustomEmojiService,
		//private reactionService: ReactionService,
		//private reactionsBufferingService: ReactionsBufferingService,
		//private idService: IdService,
	) {
	}

	onModuleInit() {
		this.userEntityService = this.moduleRef.get('UserEntityService');
		this.driveFileEntityService = this.moduleRef.get('DriveFileEntityService');
		this.customEmojiService = this.moduleRef.get('CustomEmojiService');
		this.reactionService = this.moduleRef.get('ReactionService');
		this.reactionsBufferingService = this.moduleRef.get('ReactionsBufferingService');
		this.idService = this.moduleRef.get('IdService');
		this.roleService = this.moduleRef.get('RoleService');
	}

	@bindThis
	private treatVisibility(packedNote: Packed<'Note'>, meIsAdmin = false): Packed<'Note'>['visibility'] {
		// 旗鯖fork: サーバー管理者はモデレーション上の理由で
		// 「過去のノートをフォロワーのみ」の自動可視性変換をbypass
		if (meIsAdmin) return packedNote.visibility;

		if (packedNote.visibility === 'public' || packedNote.visibility === 'home') {
			const followersOnlyBefore = packedNote.user.makeNotesFollowersOnlyBefore;
			if ((followersOnlyBefore != null)
				&& (
					(followersOnlyBefore <= 0 && (Date.now() - new Date(packedNote.createdAt).getTime() > 0 - (followersOnlyBefore * 1000)))
					|| (followersOnlyBefore > 0 && (new Date(packedNote.createdAt).getTime() < followersOnlyBefore * 1000))
				)
			) {
				packedNote.visibility = 'followers';
			}
		}
		return packedNote.visibility;
	}

	@bindThis
	private async hideNote(
		packedNote: Packed<'Note'>,
		meId: MiUser['id'] | null,
		_hint_?: {
			channelMap?: Map<MiChannel['id'], MiChannel>;
			channelMembershipMap?: Map<MiChannel['id'], boolean>;
			iAmModerator?: boolean;
		},
	): Promise<void> {
		if (meId === packedNote.userId) return;

		// 旗鯖fork: サーバー管理者はモデレーション上の理由で
		// 「過去のノートを非公開化」の自動非表示化をbypass (要signin保護はそのまま)
		if (meId != null && await this.roleService.isAdministrator({ id: meId })) {
			return;
		}

		// TODO: isVisibleForMe を使うようにしても良さそう(型違うけど)
		let hide = false;

		if (packedNote.user.requireSigninToViewContents && meId == null) {
			hide = true;
		}

		if (!hide) {
			const hiddenBefore = packedNote.user.makeNotesHiddenBefore;
			if ((hiddenBefore != null)
				&& (
					(hiddenBefore <= 0 && (Date.now() - new Date(packedNote.createdAt).getTime() > 0 - (hiddenBefore * 1000)))
					|| (hiddenBefore > 0 && (new Date(packedNote.createdAt).getTime() < hiddenBefore * 1000))
				)
			) {
				hide = true;
			}
		}

		// 旗鯖fork: プライベートチャンネルのノートは、閲覧権限が無ければ内容を伏せる(「非公開」表示)。
		//   プロフィール等の一覧に出ても、メンバー/作成者/副管理者/モデレーター以外には本文が見えない。
		if (!hide && packedNote.channelId != null) {
			// packMany 経由のときは hint から取り、未提供なら個別 SELECT。
			const channel = _hint_?.channelMap?.get(packedNote.channelId)
				?? await this.channelsRepository.findOneBy({ id: packedNote.channelId });
			if (channel != null && channel.isPrivate) {
				if (meId == null) {
					hide = true;
				} else if (channel.userId !== meId && !channel.moderatorUserIds.includes(meId)) {
					// hint の membership map に該当エントリが入っているはずだが、保険で fallback。
					const isMember = _hint_?.channelMembershipMap?.has(channel.id)
						? _hint_.channelMembershipMap.get(channel.id)!
						: await this.channelMembersRepository.exists({ where: { channelId: channel.id, userId: meId } });
					const iAmMod = _hint_?.iAmModerator !== undefined
						? _hint_.iAmModerator
						: await this.roleService.isModerator({ id: meId });
					if (!isMember && !iAmMod) hide = true;
				}
			}
		}

		// visibility が specified かつ自分が指定されていなかったら非表示
		if (!hide) {
			if (packedNote.visibility === 'specified') {
				if (meId == null) {
					hide = true;
				} else {
					// 指定されているかどうか
					const specified = packedNote.visibleUserIds!.some(id => meId === id);

					if (!specified) {
						hide = true;
					}
				}
			}
		}

		// visibility が followers かつ自分が投稿者のフォロワーでなかったら非表示
		if (!hide) {
			if (packedNote.visibility === 'followers') {
				if (meId == null) {
					hide = true;
				} else if (packedNote.reply && (meId === packedNote.reply.userId)) {
					// 自分の投稿に対するリプライ
					hide = false;
				} else if (packedNote.mentions && packedNote.mentions.some(id => meId === id)) {
					// 自分へのメンション
					hide = false;
				} else {
					// フォロワーかどうか
					// TODO: 当関数呼び出しごとにクエリが走るのは重そうだからなんとかする
					const isFollowing = await this.followingsRepository.exists({
						where: {
							followeeId: packedNote.userId,
							followerId: meId,
						},
					});

					hide = !isFollowing;
				}
			}
		}

		if (hide) {
			packedNote.visibleUserIds = undefined;
			packedNote.fileIds = [];
			packedNote.files = [];
			packedNote.text = null;
			packedNote.poll = undefined;
			packedNote.cw = null;
			packedNote.isHidden = true;
			// TODO: hiddenReason みたいなのを提供しても良さそう
		}
	}

	@bindThis
	private async populatePoll(note: MiNote, meId: MiUser['id'] | null) {
		const poll = await this.pollsRepository.findOneByOrFail({ noteId: note.id });
		const choices = poll.choices.map(c => ({
			text: c,
			votes: poll.votes[poll.choices.indexOf(c)],
			isVoted: false,
		}));

		if (meId) {
			if (poll.multiple) {
				const votes = await this.pollVotesRepository.findBy({
					userId: meId,
					noteId: note.id,
				});

				const myChoices = votes.map(v => v.choice);
				for (const myChoice of myChoices) {
					choices[myChoice].isVoted = true;
				}
			} else {
				const vote = await this.pollVotesRepository.findOneBy({
					userId: meId,
					noteId: note.id,
				});

				if (vote) {
					choices[vote.choice].isVoted = true;
				}
			}
		}

		return {
			multiple: poll.multiple,
			expiresAt: poll.expiresAt?.toISOString() ?? null,
			choices,
		};
	}

	@bindThis
	private async populateEvent(note: MiNote) {
		const event = await this.eventsRepository.findOneByOrFail({ noteId: note.id });
		return {
			title: event.title,
			start: event.start,
			end: event.end,
			metadata: event.metadata,
		};
	}

	// 旗鯖fork: 宴(うたげ)の判定状態を返す。宴ワードを含むローカルノートのみ DB を引く
	// (全ノートで session を照会すると TL 表示が重くなるため、安価な正規表現で足切りする)。
	private static readonly UTAGE_REGEX = /宴|うたげ|ぅたげ|utage/i;

	// 旗鯖fork: 1ノートに対して宴の判定をすべきか? を判定する純粋関数(DBを引かない)。
	private isUtageCandidate(note: MiNote): boolean {
		if (note.userHost != null) return false; // ローカルノートのみ
		const t = `${note.text ?? ''} ${note.cw ?? ''}`;
		return NoteEntityService.UTAGE_REGEX.test(t);
	}

	@bindThis
	private async populateUtageStatus(
		note: MiNote,
		_hint_?: { utageSessionMap?: Map<MiNote['id'], 'running' | 'succeeded' | 'failed'> },
	): Promise<'running' | 'succeeded' | 'failed' | undefined> {
		if (!this.isUtageCandidate(note)) return undefined;
		// 旗鯖fork: packMany 経由のときは Map が渡されるので DB を引かない。
		// Map に該当エントリが無ければ「セッション未登録」を意味する(undefined を返す)。
		if (_hint_?.utageSessionMap !== undefined) {
			return _hint_.utageSessionMap.get(note.id);
		}
		const session = await this.utageSessionsRepository.findOneBy({ noteId: note.id });
		if (session == null) return undefined;
		return session.status as 'running' | 'succeeded' | 'failed';
	}

	@bindThis
	public async populateMyReaction(note: { id: MiNote['id']; reactions: MiNote['reactions']; reactionAndUserPairCache?: MiNote['reactionAndUserPairCache']; }, meId: MiUser['id'], _hint_?: {
		myReactions: Map<MiNote['id'], string | null>;
	}) {
		if (_hint_?.myReactions) {
			const reaction = _hint_.myReactions.get(note.id);
			if (reaction) {
				return this.reactionService.convertLegacyReaction(reaction);
			} else {
				return undefined;
			}
		}

		const reactionsCount = Object.values(note.reactions).reduce((a, b) => a + b, 0);
		if (reactionsCount === 0) return undefined;
		if (note.reactionAndUserPairCache && reactionsCount <= note.reactionAndUserPairCache.length) {
			const pair = note.reactionAndUserPairCache.find(p => p.startsWith(meId));
			if (pair) {
				return this.reactionService.convertLegacyReaction(pair.split('/')[1]);
			} else {
				return undefined;
			}
		}

		// パフォーマンスのためノートが作成されてから2秒以上経っていない場合はリアクションを取得しない
		if (this.idService.parse(note.id).date.getTime() + 2000 > Date.now()) {
			return undefined;
		}

		const reaction = await this.noteReactionsRepository.findOneBy({
			userId: meId,
			noteId: note.id,
		});

		if (reaction) {
			return this.reactionService.convertLegacyReaction(reaction.reaction);
		}

		return undefined;
	}

	@bindThis
	public async isVisibleForMe(note: MiNote, meId: MiUser['id'] | null): Promise<boolean> {
		// This code must always be synchronized with the checks in generateVisibilityQuery.

		// 旗鯖fork: プライベートチャンネルのノートは、メンバー/作成者/副管理者/モデレーターのみ閲覧可。
		if (note.channelId != null) {
			const channel = note.channel ?? await this.channelsRepository.findOneBy({ id: note.channelId });
			if (channel != null && channel.isPrivate) {
				if (meId == null) return false;
				if (channel.userId !== meId && !channel.moderatorUserIds.includes(meId)) {
					const isMember = await this.channelMembersRepository.exists({ where: { channelId: channel.id, userId: meId } });
					if (!isMember && !await this.roleService.isModerator({ id: meId })) return false;
				}
			}
		}

		// visibility が specified かつ自分が指定されていなかったら非表示
		if (note.visibility === 'specified') {
			if (meId == null) {
				return false;
			} else if (meId === note.userId) {
				return true;
			} else {
				// 指定されているかどうか
				return note.visibleUserIds.some(id => meId === id);
			}
		}

		// visibility が followers かつ自分が投稿者のフォロワーでなかったら非表示
		if (note.visibility === 'followers') {
			if (meId == null) {
				return false;
			} else if (meId === note.userId) {
				return true;
			} else if (note.reply && (meId === note.reply.userId)) {
				// 自分の投稿に対するリプライ
				return true;
			} else if (note.mentions && note.mentions.some(id => meId === id)) {
				// 自分へのメンション
				return true;
			} else {
				// フォロワーかどうか
				const [following, user] = await Promise.all([
					this.followingsRepository.count({
						where: {
							followeeId: note.userId,
							followerId: meId,
						},
						take: 1,
					}),
					this.usersRepository.findOneByOrFail({ id: meId }),
				]);

				/* If we know the following, everyhting is fine.

				But if we do not know the following, it might be that both the
				author of the note and the author of the like are remote users,
				in which case we can never know the following. Instead we have
				to assume that the users are following each other.
				*/
				return following > 0 || (note.userHost != null && user.host != null);
			}
		}

		return true;
	}

	@bindThis
	public async packAttachedFiles(fileIds: MiNote['fileIds'], packedFiles: Map<MiNote['fileIds'][number], Packed<'DriveFile'> | null>): Promise<Packed<'DriveFile'>[]> {
		const missingIds = [];
		for (const id of fileIds) {
			if (!packedFiles.has(id)) missingIds.push(id);
		}
		if (missingIds.length) {
			const additionalMap = await this.driveFileEntityService.packManyByIdsMap(missingIds);
			for (const [k, v] of additionalMap) {
				packedFiles.set(k, v);
			}
		}
		return fileIds.map(id => packedFiles.get(id)).filter(x => x != null);
	}

	@bindThis
	public async pack(
		src: MiNote['id'] | MiNote,
		me?: { id: MiUser['id'] } | null | undefined,
		options?: {
			detail?: boolean;
			skipHide?: boolean;
			withReactionAndUserPairCache?: boolean;
			_hint_?: {
				bufferedReactions: Map<MiNote['id'], { deltas: Record<string, number>; pairs: ([MiUser['id'], string])[] }> | null;
				myReactions: Map<MiNote['id'], string | null>;
				packedFiles: Map<MiNote['fileIds'][number], Packed<'DriveFile'> | null>;
				packedUsers: Map<MiUser['id'], Packed<'UserLite'>>;
				// 旗鯖fork: packMany で集約した宴セッション状態。エントリが無ければセッション未登録。
				utageSessionMap?: Map<MiNote['id'], 'running' | 'succeeded' | 'failed'>;
				// 旗鯖fork: packMany で集約したチャンネル本体・閲覧時メンバーシップ・モデレーター判定。
				channelMap?: Map<MiChannel['id'], MiChannel>;
				channelMembershipMap?: Map<MiChannel['id'], boolean>;
				iAmModerator?: boolean;
			};
		},
	): Promise<Packed<'Note'>> {
		const opts = Object.assign({
			detail: true,
			skipHide: false,
			withReactionAndUserPairCache: false,
		}, options);

		const meId = me ? me.id : null;
		const note = typeof src === 'object' ? src : await this.noteLoader.load(src);
		const host = note.userHost;
		// 旗鯖fork: packMany 経由のときは isModerator を 1 回だけ呼んで使い回す。
		const iAmModerator = opts._hint_?.iAmModerator !== undefined
			? opts._hint_.iAmModerator
			: me ? await this.roleService.isModerator(me as MiUser) : false;

		const bufferedReactions = opts._hint_?.bufferedReactions != null
			? (opts._hint_.bufferedReactions.get(note.id) ?? { deltas: {}, pairs: [] })
			: this.meta.enableReactionsBuffering
				? await this.reactionsBufferingService.get(note.id)
				: { deltas: {}, pairs: [] };
		const reactions = this.reactionService.convertLegacyReactions(this.reactionsBufferingService.mergeReactions(note.reactions, bufferedReactions.deltas ?? {}));

		const reactionAndUserPairCache = note.reactionAndUserPairCache.concat(bufferedReactions.pairs.map(x => x.join('/')));

		let text = note.text;

		if (note.name && (note.url ?? note.uri) && !note.hasEvent) {
			text = `【${note.name}】\n${(note.text ?? '').trim()}\n\n${note.url ?? note.uri}`;
		}

		// 旗鯖fork: packMany 経由のときは channelMap で 1 回の SELECT に集約する。
		const channel = note.channelId
			? note.channel
				? note.channel
				: opts._hint_?.channelMap?.get(note.channelId) ?? await this.channelsRepository.findOneBy({ id: note.channelId })
			: null;

		const reactionEmojiNames = Object.keys(reactions)
			.filter(x => x.startsWith(':') && x.includes('@') && !x.includes('@.')) // リモートカスタム絵文字のみ
			.map(x => this.reactionService.decodeReaction(x).reaction.replaceAll(':', ''));
		await this.customEmojiService.prefetchEmojis(this.aggregateNoteEmojis([note]));
		const packedFiles = options?._hint_?.packedFiles;
		const packedUsers = options?._hint_?.packedUsers;

		const packed: Packed<'Note'> = await awaitAll({
			id: note.id,
			createdAt: this.idService.parse(note.id).date.toISOString(),
			updatedAt: note.updatedAt ? note.updatedAt.toISOString() : undefined,
			updatedAtHistory: note.updatedAtHistory ? note.updatedAtHistory.map(x => x.toISOString()) : undefined,
			deleteAt: note.deleteAt ? note.deleteAt.toISOString() : undefined,
			userId: note.userId,
			user: packedUsers?.get(note.userId) ?? this.userEntityService.pack(note.user ?? note.userId, me),
			text: text,
			cw: note.cw,
			visibility: note.visibility,
			localOnly: note.localOnly,
			reactionAcceptance: note.reactionAcceptance,
			visibleUserIds: note.visibility === 'specified' ? note.visibleUserIds : undefined,
			disableRightClick: note.disableRightClick || undefined,
			renoteCount: note.renoteCount,
			repliesCount: note.repliesCount,
			reactionCount: Object.values(reactions).reduce((a, b) => a + b, 0),
			reactions: reactions,
			reactionEmojis: this.customEmojiService.populateEmojis(reactionEmojiNames, host),
			reactionAndUserPairCache: opts.withReactionAndUserPairCache ? reactionAndUserPairCache : undefined,
			emojis: host != null ? this.customEmojiService.populateEmojis(note.emojis, host) : undefined,
			tags: note.tags.length > 0 ? note.tags : undefined,
			fileIds: note.fileIds,
			files: packedFiles != null ? this.packAttachedFiles(note.fileIds, packedFiles) : this.driveFileEntityService.packManyByIds(note.fileIds),
			replyId: note.replyId,
			renoteId: note.renoteId,
			channelId: note.channelId ?? undefined,
			channel: channel ? {
				id: channel.id,
				name: channel.name,
				color: channel.color,
				isSensitive: channel.isSensitive,
				allowRenoteToExternal: channel.allowRenoteToExternal,
				// 旗鯖fork: プライベートチャンネルはチャンネル外リノート不可。フロントでメニューを抑制するため公開。
				isPrivate: channel.isPrivate,
				userId: channel.userId,
			} : undefined,
			mentions: note.mentions.length > 0 ? note.mentions : undefined,
			hasPoll: note.hasPoll || undefined,
			// 旗鯖fork: 宴(うたげ)の判定状態。宴ノートでなければ undefined。
			// 'running' | 'succeeded' | 'failed'。フロントはこれを初期状態として描画する。
			utageStatus: await this.populateUtageStatus(note, opts._hint_),
			uri: note.uri ?? undefined,
			url: note.url ?? undefined,
			hasDeliveryTargets: note.deliveryTargets != null,
			...((meId === note.userId || iAmModerator) ? {
				deliveryTargets: note.deliveryTargets ? await (async () => {
					const deliveryTargets = note.deliveryTargets!;
					const instances = await this.instancesRepository.findBy({
						host: In(deliveryTargets.hosts),
					});
					const instanceMap = new Map(instances.map(i => [i.host, i.name]));

					return {
						mode: deliveryTargets.mode,
						hosts: deliveryTargets.hosts,
						names: deliveryTargets.hosts.map(host => instanceMap.get(host) ?? null),
					};
				})() : undefined,
			} : {}),

			...(opts.detail ? {
				clippedCount: note.clippedCount,

				// そもそもJOINしていない場合はundefined、JOINしたけど存在していなかった場合はnullで区別される
				reply: (note.replyId && note.reply === null) ? null : note.replyId ? nullIfEntityNotFound(this.pack(note.reply ?? note.replyId, me, {
					// NOTE: 기본값은 false 이지만, 2025.10.0 대응 과정에서 코드가 변경됨에 따라 MkSubNoteContent에서 myReaction을 불러오지 못하는 문제가 있으므로 true로 변경됨.
					// myReaction을 불러오지 못하면 자신이 리액션 했다는 정보를 불러오지 못하므로 이미 리액션을 했더라도 다시 눌러 리액션을 취소하는 기능을 사용할 수 없고, 리액션을 중복으로 등록하려고 시도하게됨.
					detail: true,
					skipHide: opts.skipHide,
					withReactionAndUserPairCache: opts.withReactionAndUserPairCache,
					_hint_: options?._hint_,
				})) : undefined,

				// そもそもJOINしていない場合はundefined、JOINしたけど存在していなかった場合はnullで区別される
				renote: (note.renoteId && note.renote === null) ? null : note.renoteId ? nullIfEntityNotFound(this.pack(note.renote ?? note.renoteId, me, {
					detail: true,
					skipHide: opts.skipHide,
					withReactionAndUserPairCache: opts.withReactionAndUserPairCache,
					_hint_: options?._hint_,
				})) : undefined,

				poll: note.hasPoll ? this.populatePoll(note, meId) : undefined,
				event: note.hasEvent ? this.populateEvent(note) : undefined,

				...(meId && Object.keys(reactions).length > 0 ? {
					myReaction: this.populateMyReaction({
						id: note.id,
						reactions: reactions,
						reactionAndUserPairCache: reactionAndUserPairCache,
					}, meId, options?._hint_),
				} : {}),
			} : {}),
		});

		// 旗鯖fork: 管理者はノート可視性の自動変換をbypass (モデレーション目的)
		const meIsAdmin = meId != null ? await this.roleService.isAdministrator({ id: meId }) : false;
		this.treatVisibility(packed, meIsAdmin);

		if (!opts.skipHide) {
			await this.hideNote(packed, meId, opts._hint_);
		}

		return packed;
	}

	@bindThis
	public async packMany(
		notes: MiNote[],
		me?: { id: MiUser['id'] } | null | undefined,
		options?: {
			detail?: boolean;
			skipHide?: boolean;
		},
	) {
		if (notes.length === 0) return [];

		const bufferedReactions = this.meta.enableReactionsBuffering ? await this.reactionsBufferingService.getMany([...getAppearNoteIds(notes)]) : null;

		const meId = me ? me.id : null;
		const myReactionsMap = new Map<MiNote['id'], string | null>();
		if (meId) {
			const idsNeedFetchMyReaction = new Set<MiNote['id']>();

			// パフォーマンスのためノートが作成されてから2秒以上経っていない場合はリアクションを取得しない
			const oldId = this.idService.gen(Date.now() - 2000);

			for (const note of notes) {
				if (isPureRenote(note)) {
					const reactionsCount = Object.values(this.reactionsBufferingService.mergeReactions(note.renote.reactions, bufferedReactions?.get(note.renote.id)?.deltas ?? {})).reduce((a, b) => a + b, 0);
					if (reactionsCount === 0) {
						myReactionsMap.set(note.renote.id, null);
					} else if (reactionsCount <= note.renote.reactionAndUserPairCache.length + (bufferedReactions?.get(note.renote.id)?.pairs.length ?? 0)) {
						const pairInBuffer = bufferedReactions?.get(note.renote.id)?.pairs.find(p => p[0] === meId);
						if (pairInBuffer) {
							myReactionsMap.set(note.renote.id, pairInBuffer[1]);
						} else {
							const pair = note.renote.reactionAndUserPairCache.find(p => p.startsWith(meId));
							myReactionsMap.set(note.renote.id, pair ? pair.split('/')[1] : null);
						}
					} else {
						idsNeedFetchMyReaction.add(note.renote.id);
					}
				} else {
					if (note.id < oldId) {
						const reactionsCount = Object.values(this.reactionsBufferingService.mergeReactions(note.reactions, bufferedReactions?.get(note.id)?.deltas ?? {})).reduce((a, b) => a + b, 0);
						if (reactionsCount === 0) {
							myReactionsMap.set(note.id, null);
						} else if (reactionsCount <= note.reactionAndUserPairCache.length + (bufferedReactions?.get(note.id)?.pairs.length ?? 0)) {
							const pairInBuffer = bufferedReactions?.get(note.id)?.pairs.find(p => p[0] === meId);
							if (pairInBuffer) {
								myReactionsMap.set(note.id, pairInBuffer[1]);
							} else {
								const pair = note.reactionAndUserPairCache.find(p => p.startsWith(meId));
								myReactionsMap.set(note.id, pair ? pair.split('/')[1] : null);
							}
						} else {
							idsNeedFetchMyReaction.add(note.id);
						}
					} else {
						myReactionsMap.set(note.id, null);
					}
				}
			}

			const myReactions = idsNeedFetchMyReaction.size > 0 ? await this.noteReactionsRepository.findBy({
				userId: meId,
				noteId: In(Array.from(idsNeedFetchMyReaction)),
			}) : [];

			for (const id of idsNeedFetchMyReaction) {
				myReactionsMap.set(id, myReactions.find(reaction => reaction.noteId === id)?.reaction ?? null);
			}
		}

		await this.customEmojiService.prefetchEmojis(this.aggregateNoteEmojis(notes));
		// TODO: 本当は renote とか reply がないのに renoteId とか replyId があったらここで解決しておく
		const fileIds = notes.map(n => [n.fileIds, n.renote?.fileIds, n.reply?.fileIds]).flat(2).filter(x => x != null);
		const packedFiles = fileIds.length > 0 ? await this.driveFileEntityService.packManyByIdsMap(fileIds) : new Map();
		const users = [
			...notes.map(({ user, userId }) => user ?? userId),
			...notes.map(({ replyUserId }) => replyUserId).filter(x => x != null),
			...notes.map(({ renoteUserId }) => renoteUserId).filter(x => x != null),
		];
		const packedUsers = await this.userEntityService.packMany(users, me)
			.then(users => new Map(users.map(u => [u.id, u])));

		// 旗鯖fork: 宴(うたげ)セッションを一括取得して N+1 を解消する。
		//   - ローカル かつ 宴ワードを含むノートだけ DB を引く(個別 pack と同じ足切り)。
		//   - 再帰 pack で参照される reply/renote も hint で吸収するため候補に含める。
		const utageCandidateIds: MiNote['id'][] = [];
		for (const n of notes) {
			if (this.isUtageCandidate(n)) utageCandidateIds.push(n.id);
			if (n.reply && this.isUtageCandidate(n.reply)) utageCandidateIds.push(n.reply.id);
			if (n.renote && this.isUtageCandidate(n.renote)) utageCandidateIds.push(n.renote.id);
		}
		const utageSessionMap = new Map<MiNote['id'], 'running' | 'succeeded' | 'failed'>();
		if (utageCandidateIds.length > 0) {
			const sessions = await this.utageSessionsRepository.findBy({ noteId: In(utageCandidateIds) });
			for (const s of sessions) {
				utageSessionMap.set(s.noteId, s.status as 'running' | 'succeeded' | 'failed');
			}
		}

		// 旗鯖fork: チャンネルノートのチャンネル本体を一括取得 + 自分のメンバーシップを一括判定。
		//   - pack(`channel:{...}` ブロック)と hideNote(プライベート判定)の両方で使う。
		//   - JOIN 済み(note.channel が non-null)のものは hint に含めるが SELECT は不要。
		//   - 再帰 pack で参照される reply/renote の channelId も対象にする。
		const channelMap = new Map<MiChannel['id'], MiChannel>();
		const collectChannel = (n: MiNote) => {
			if (n.channelId != null && n.channel != null) channelMap.set(n.channelId, n.channel);
		};
		const channelIdsNeeded = new Set<MiChannel['id']>();
		const collectChannelId = (n: MiNote) => {
			if (n.channelId != null && n.channel == null && !channelMap.has(n.channelId)) {
				channelIdsNeeded.add(n.channelId);
			}
		};
		for (const n of notes) {
			collectChannel(n);
			if (n.reply) collectChannel(n.reply);
			if (n.renote) collectChannel(n.renote);
		}
		for (const n of notes) {
			collectChannelId(n);
			if (n.reply) collectChannelId(n.reply);
			if (n.renote) collectChannelId(n.renote);
		}
		if (channelIdsNeeded.size > 0) {
			const channels = await this.channelsRepository.findBy({ id: In([...channelIdsNeeded]) });
			for (const c of channels) channelMap.set(c.id, c);
		}

		// プライベートチャンネルだけメンバーシップを引く。自分が作成者・副管理者なら exists 不要。
		const channelMembershipMap = new Map<MiChannel['id'], boolean>();
		if (meId != null) {
			const privateChannelIdsForMembership: MiChannel['id'][] = [];
			for (const [cid, c] of channelMap) {
				if (!c.isPrivate) continue;
				if (c.userId === meId) continue;
				if (c.moderatorUserIds.includes(meId)) continue;
				privateChannelIdsForMembership.push(cid);
			}
			if (privateChannelIdsForMembership.length > 0) {
				const memberRows = await this.channelMembersRepository.findBy({
					channelId: In(privateChannelIdsForMembership),
					userId: meId,
				});
				const memberSet = new Set(memberRows.map(r => r.channelId));
				for (const cid of privateChannelIdsForMembership) {
					channelMembershipMap.set(cid, memberSet.has(cid));
				}
			}
		}

		// roleService.isModerator は packMany 全体で 1 回だけ呼ぶ。
		const iAmModerator = me ? await this.roleService.isModerator(me as MiUser) : false;

		return await Promise.all(notes.map(n => this.pack(n, me, {
			...options,
			_hint_: {
				bufferedReactions,
				myReactions: myReactionsMap,
				packedFiles,
				packedUsers,
				utageSessionMap,
				channelMap,
				channelMembershipMap,
				iAmModerator,
			},
		})));
	}

	@bindThis
	public aggregateNoteEmojis(notes: MiNote[]) {
		let emojis: { name: string | null; host: string | null; }[] = [];
		for (const note of notes) {
			emojis = emojis.concat(note.emojis
				.map(e => this.customEmojiService.parseEmojiStr(e, note.userHost)));
			if (note.renote) {
				emojis = emojis.concat(note.renote.emojis
					.map(e => this.customEmojiService.parseEmojiStr(e, note.renote!.userHost)));
				if (note.renote.user) {
					emojis = emojis.concat(note.renote.user.emojis
						.map(e => this.customEmojiService.parseEmojiStr(e, note.renote!.userHost)));
				}
			}
			const customReactions = Object.keys(note.reactions).map(x => this.reactionService.decodeReaction(x)).filter(x => x.name != null) as typeof emojis;
			emojis = emojis.concat(customReactions);
			if (note.user) {
				emojis = emojis.concat(note.user.emojis
					.map(e => this.customEmojiService.parseEmojiStr(e, note.userHost)));
			}
		}
		return emojis.filter(x => x.name != null && x.host != null) as { name: string; host: string; }[];
	}

	@bindThis
	private findNoteOrFail(id: string): Promise<MiNote> {
		return this.notesRepository.findOneOrFail({
			where: { id },
			relations: ['user', 'renote', 'reply'],
		});
	}

	@bindThis
	public async fetchDiffs(noteIds: MiNote['id'][]) {
		if (noteIds.length === 0) return [];

		const notes = await this.notesRepository.find({
			where: {
				id: In(noteIds),
			},
			select: {
				id: true,
				userHost: true,
				reactions: true,
				reactionAndUserPairCache: true,
			},
		});

		const bufferedReactionsMap = this.meta.enableReactionsBuffering ? await this.reactionsBufferingService.getMany(noteIds) : null;

		const packings = notes.map(note => {
			const bufferedReactions = bufferedReactionsMap?.get(note.id);
			//const reactionAndUserPairCache = note.reactionAndUserPairCache.concat(bufferedReactions.pairs.map(x => x.join('/')));

			const reactions = this.reactionService.convertLegacyReactions(this.reactionsBufferingService.mergeReactions(note.reactions, bufferedReactions?.deltas ?? {}));

			const reactionEmojiNames = Object.keys(reactions)
				.filter(x => x.startsWith(':') && x.includes('@') && !x.includes('@.')) // リモートカスタム絵文字のみ
				.map(x => this.reactionService.decodeReaction(x).reaction.replaceAll(':', ''));

			return this.customEmojiService.populateEmojis(reactionEmojiNames, note.userHost).then(reactionEmojis => ({
				id: note.id,
				reactions,
				reactionEmojis,
			}));
		});

		return await Promise.all(packings);
	}
}
