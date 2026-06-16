/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import ms from 'ms';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { RoleService } from '@/core/RoleService.js';
import { ApiError } from '@/server/api/error.js';
import { bindThis } from '@/decorators.js';
import type { Config } from '@/config.js';
import type { UserProfilesRepository, DriveFilesRepository } from '@/models/_.js';

// 旗鯖fork: マスコット機能のデータを更新する。
// サーバー側で上限(ロール)・XSS・URLドメインを検証してから保存する。
//   - キャラ数 / 表情数 / 文言数 はロールの上限内
//   - 名前・ラベル・文言テキストは長さ制限 + 制御文字除去(XSS/壊れ対策)
//   - 画像URLは自サーバーのドライブ/メディア配信ドメインのみ許可(外部URL混入を防ぐ)
//   画像本体はクライアントがDLしてローカルにキャッシュするため、ここではURL参照のみ扱う。

const NAME_MAX = 30;
const LABEL_MAX = 30;
const PHRASE_MAX = 140;
// 旗鯖fork: マスコット画像の制限。ドライブのファイルメタ(size/type)で検証する。
//   ドライブは登録時にマジックバイトで type を判定済みなので、その type を信頼してよい。
const IMAGE_MAX_BYTES = 500 * 1024; // 500KB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// 0〜1 にクランプ。数値でなければ fallback。
function clamp01(v: unknown, fallback: number): number {
	if (typeof v !== 'number' || Number.isNaN(v)) return fallback;
	return Math.min(1, Math.max(0, v));
}

// min〜max にクランプ。数値でなければ fallback。
function clampRange(v: unknown, min: number, max: number, fallback: number): number {
	if (typeof v !== 'number' || Number.isNaN(v)) return fallback;
	return Math.min(max, Math.max(min, v));
}

export const meta = {
	tags: ['hata'],

	requireCredential: true,

	kind: 'write:account',

	limit: {
		duration: ms('1hour'),
		max: 60,
		minInterval: ms('1sec'),
	},

	errors: {
		notConsented: {
			message: 'You have not consented to the mascot feature.',
			code: 'MASCOT_NOT_CONSENTED',
			id: 'b1a2c3d4-0001-0001-0001-000000000001',
		},
		tooManyCharacters: {
			message: 'Too many characters.',
			code: 'MASCOT_TOO_MANY_CHARACTERS',
			id: 'b1a2c3d4-0001-0001-0001-000000000002',
		},
		tooManyExpressions: {
			message: 'Too many expressions.',
			code: 'MASCOT_TOO_MANY_EXPRESSIONS',
			id: 'b1a2c3d4-0001-0001-0001-000000000003',
		},
		tooManyPhrases: {
			message: 'Too many phrases.',
			code: 'MASCOT_TOO_MANY_PHRASES',
			id: 'b1a2c3d4-0001-0001-0001-000000000004',
		},
		invalidImageUrl: {
			message: 'Image URL must point to this server\'s drive.',
			code: 'MASCOT_INVALID_IMAGE_URL',
			id: 'b1a2c3d4-0001-0001-0001-000000000005',
		},
		imageTooLarge: {
			message: 'Image file is too large (max 500KB).',
			code: 'MASCOT_IMAGE_TOO_LARGE',
			id: 'b1a2c3d4-0001-0001-0001-000000000006',
		},
		invalidImageType: {
			message: 'Image must be JPEG, PNG, WebP or GIF.',
			code: 'MASCOT_INVALID_IMAGE_TYPE',
			id: 'b1a2c3d4-0001-0001-0001-000000000007',
		},
		imageNotFound: {
			message: 'Referenced drive file was not found or not owned by you.',
			code: 'MASCOT_IMAGE_NOT_FOUND',
			id: 'b1a2c3d4-0001-0001-0001-000000000008',
		},
	},

	res: {
		type: 'object',
		nullable: false, optional: false,
		properties: {
			ok: { type: 'boolean', nullable: false, optional: false },
			updatedAt: { type: 'number', nullable: false, optional: false },
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		characters: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					name: { type: 'string' },
					expressions: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								id: { type: 'string' },
								label: { type: 'string' },
								url: { type: 'string' },
								driveFileId: { type: 'string', nullable: true },
								bubbleX: { type: 'number', nullable: true },
								bubbleY: { type: 'number', nullable: true },
								bubbleScale: { type: 'number', nullable: true },
								bubbleTail: { type: 'string', nullable: true, enum: ['left', 'right'] },
								motion: { type: 'string', nullable: true, enum: ['none', 'bounce', 'shake', 'sway', 'spin'] },
								motionIntensity: { type: 'number', nullable: true },
							},
							required: ['id', 'label', 'url'],
						},
					},
					phrases: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								id: { type: 'string' },
								text: { type: 'string' },
								expressionId: { type: 'string', nullable: true },
							},
							required: ['id', 'text'],
						},
					},
				},
				required: ['id', 'name'],
			},
		},
		activeCharacterId: { type: 'string', nullable: true },
		showName: { type: 'boolean' },
	},
	required: ['characters'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.config)
		private config: Config,
		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,
		@Inject(DI.driveFilesRepository)
		private driveFilesRepository: DriveFilesRepository,
		private roleService: RoleService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: me.id });

			// 同意していなければ拒否(同意管理と連動)
			if (profile.hataConsentMascot !== true) {
				throw new ApiError(meta.errors.notConsented);
			}

			const policies = await this.roleService.getUserPolicies(me.id);

			// 上限チェック
			if (ps.characters.length > policies.mascotMaxCharacters) {
				throw new ApiError(meta.errors.tooManyCharacters);
			}

			const characters = ps.characters.map((c) => {
				const expressions = (c.expressions ?? []);
				const phrases = (c.phrases ?? []);
				if (expressions.length > policies.mascotMaxExpressions) {
					throw new ApiError(meta.errors.tooManyExpressions);
				}
				if (phrases.length > policies.mascotMaxPhrases) {
					throw new ApiError(meta.errors.tooManyPhrases);
				}

				const expIds = new Set<string>();
				const cleanExpressions = expressions.map((e) => {
					if (!this.isAllowedImageUrl(e.url)) {
						throw new ApiError(meta.errors.invalidImageUrl);
					}
					expIds.add(e.id);
					return {
						id: this.sanitize(e.id, 64),
						label: this.sanitize(e.label, LABEL_MAX),
						url: e.url,
						driveFileId: e.driveFileId ?? null,
						// 吹き出し位置(立ち絵に対する相対割合 0〜1)。未指定はデフォルト(上中央寄り)。
						bubbleX: clamp01(e.bubbleX, 0.5),
						bubbleY: clamp01(e.bubbleY, 0.1),
						// 吹き出しサイズ(0.6〜1.6)としっぽの左右
						bubbleScale: clampRange(e.bubbleScale, 0.6, 1.6, 1),
						bubbleTail: (e.bubbleTail === 'right' ? 'right' : 'left'),
						motion: (['bounce', 'shake', 'sway', 'spin'].includes(e.motion) ? e.motion : 'none'),
						motionIntensity: clampRange(e.motionIntensity, 0.3, 2, 1),
					};
				});

				const cleanPhrases = phrases.map((p) => ({
					id: this.sanitize(p.id, 64),
					text: this.sanitize(p.text, PHRASE_MAX),
					// 紐付け先の表情が存在しなければ null に落とす
					expressionId: (p.expressionId && expIds.has(p.expressionId)) ? p.expressionId : null,
				}));

				return {
					id: this.sanitize(c.id, 64),
					name: this.sanitize(c.name, NAME_MAX),
					expressions: cleanExpressions,
					phrases: cleanPhrases,
				};
			});

			const charIds = new Set(characters.map(c => c.id));
			const activeCharacterId = (ps.activeCharacterId && charIds.has(ps.activeCharacterId))
				? ps.activeCharacterId
				: (characters[0]?.id ?? null);

			// 旗鯖fork: 画像の実体検証。各表情の driveFileId からドライブのメタを引き、
			//   サイズ(500KB以下)・タイプ(JPEG/PNG/WebP/GIF)・所有者(本人)を検証する。
			//   ドライブは登録時にマジックバイトで type を判定済みなので、その type を信頼する。
			const driveFileIds = Array.from(new Set(
				characters.flatMap(c => c.expressions.map(e => e.driveFileId).filter((x): x is string => !!x)),
			));
			if (driveFileIds.length > 0) {
				const files = await this.driveFilesRepository.findBy({ id: In(driveFileIds) });
				const fileMap = new Map(files.map(f => [f.id, f]));
				for (const id of driveFileIds) {
					const f = fileMap.get(id);
					// 存在しない or 本人所有でないファイルは拒否
					if (!f || f.userId !== me.id) {
						throw new ApiError(meta.errors.imageNotFound);
					}
					if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
						throw new ApiError(meta.errors.invalidImageType);
					}
					if (f.size > IMAGE_MAX_BYTES) {
						throw new ApiError(meta.errors.imageTooLarge);
					}
				}
			}

			const updatedAt = Date.now();
			const data = {
				characters,
				activeCharacterId,
				showName: ps.showName ?? false,
				updatedAt,
			};

			await this.userProfilesRepository.update(me.id, { hataMascotData: data });

			return { ok: true, updatedAt };
		});
	}

	// テキストのサニタイズ: 長さ制限 + 制御文字(改行以外)除去。
	// 表示側でもエスケープするが、保存時にも最低限の正規化を行う。
	@bindThis
	private sanitize(s: string, max: number): string {
		// 制御文字(タブ・改行は許容)を除去
		// eslint-disable-next-line no-control-regex
		const cleaned = String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
		return cleaned.slice(0, max);
	}

	// 画像URLが自サーバーのドライブ/メディア配信ドメインかを検証する。
	@bindThis
	private isAllowedImageUrl(url: string): boolean {
		let u: URL;
		try {
			u = new URL(url);
		} catch {
			return false;
		}
		if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;

		const allowedOrigins: string[] = [];
		for (const base of [this.config.url, this.config.driveUrl, this.config.mediaProxy]) {
			if (!base) continue;
			try { allowedOrigins.push(new URL(base).host); } catch { /* noop */ }
		}
		return allowedOrigins.includes(u.host);
	}
}
