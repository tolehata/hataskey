/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import Limiter from 'ratelimiter';
import * as Redis from 'ioredis';
import { DI } from '@/di-symbols.js';
import type Logger from '@/logger.js';
import { LoggerService } from '@/core/LoggerService.js';
import { bindThis } from '@/decorators.js';
import type { IEndpointMeta } from './endpoints.js';

type RateLimitInfo = {
	code: 'BRIEF_REQUEST_INTERVAL',
	info: Limiter.LimiterInfo,
} | {
	code: 'RATE_LIMIT_EXCEEDED',
	info: Limiter.LimiterInfo,
};

export type RateLimitConsumption = {
	exceeded: boolean;
	info: Limiter.LimiterInfo;
};

@Injectable()
export class RateLimiterService {
	private logger: Logger;
	private disabled = false;

	constructor(
		@Inject(DI.redis)
		private redisClient: Redis.Redis,

		private loggerService: LoggerService,
	) {
		this.logger = this.loggerService.getLogger('limiter');

		if (process.env.NODE_ENV !== 'production') {
			this.disabled = true;
		}
	}

	@bindThis
	private checkLimiter(options: Limiter.LimiterOption): Promise<Limiter.LimiterInfo> {
		return new Promise<Limiter.LimiterInfo>((resolve, reject) => {
			new Limiter(options).get((err, info) => {
				if (err) {
					return reject(err);
				}
				resolve(info);
			});
		});
	}

	@bindThis
	public async limit(limitation: IEndpointMeta['limit'] & { key: NonNullable<string> }, actor: string, factor = 1): Promise<RateLimitInfo | null> {
		if (this.disabled) {
			return null;
		}

		// Short-term limit
		if (limitation.minInterval != null) {
			const info = await this.checkLimiter({
				id: `${actor}:${limitation.key}:min`,
				duration: limitation.minInterval * factor,
				max: 1,
				db: this.redisClient,
			});

			this.logger.debug(`${actor} ${limitation.key} min remaining: ${info.remaining}`);

			if (info.remaining === 0) {
				return { code: 'BRIEF_REQUEST_INTERVAL', info };
			}
		}

		// Long term limit
		if (limitation.duration != null && limitation.max != null) {
			const info = await this.checkLimiter({
				id: `${actor}:${limitation.key}`,
				duration: limitation.duration,
				max: limitation.max / factor,
				db: this.redisClient,
			});

			this.logger.debug(`${actor} ${limitation.key} max remaining: ${info.remaining}`);

			if (info.remaining === 0) {
				return { code: 'RATE_LIMIT_EXCEEDED', info };
			}
		}

		return null;
	}

	/**
	 * Consume a long-term limit and return its state for response headers.
	 * `ratelimiter` reports the remaining count before the current request is
	 * deducted, so successful responses expose one fewer request to clients.
	 */
	@bindThis
	public async consume(limitation: { duration: number; max: number; key: string }, actor: string, factor = 1): Promise<RateLimitConsumption | null> {
		if (this.disabled) {
			return null;
		}

		const safeFactor = Number.isFinite(factor) && factor > 0 ? factor : 1;
		const duration = Math.max(1, Math.round(limitation.duration * safeFactor));
		const max = Math.max(1, Math.floor(limitation.max / safeFactor));
		const info = await this.checkLimiter({
			id: `${actor}:${limitation.key}`,
			duration,
			max,
			db: this.redisClient,
		});

		this.logger.debug(`${actor} ${limitation.key} shared remaining: ${info.remaining}`);
		const exceeded = info.remaining === 0;
		return {
			exceeded,
			info: {
				...info,
				total: max,
				remaining: exceeded ? 0 : Math.max(0, info.remaining - 1),
			},
		};
	}
}
