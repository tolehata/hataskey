/*
 * 旗鯖fork: 宴(うたげ)の成功確定ジョブのプロセッサ。
 * expiresAt(投稿+15分)に発火し、UtageService.resolveExpired に委譲する。
 * 連合先には何も配送しない、サーバー内完結の処理。
 */

import { Injectable } from '@nestjs/common';
import type Logger from '@/logger.js';
import { UtageService } from '@/core/UtageService.js';
import { bindThis } from '@/decorators.js';
import { QueueLoggerService } from '../QueueLoggerService.js';
import type * as Bull from 'bullmq';
import type { UtageResolveJobData } from '../types.js';

@Injectable()
export class UtageResolveProcessorService {
	private logger: Logger;

	constructor(
		private utageService: UtageService,
		private queueLoggerService: QueueLoggerService,
	) {
		this.logger = this.queueLoggerService.logger.createSubLogger('utage-resolve');
	}

	@bindThis
	public async process(job: Bull.Job<UtageResolveJobData>): Promise<void> {
		await this.utageService.resolveExpired(job.data.noteId);
	}
}
