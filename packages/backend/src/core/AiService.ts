/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { Mutex } from 'async-mutex';
import fetch from 'node-fetch';
import { bindThis } from '@/decorators.js';
// 旗鯖fork: 本家 2026.6.0 から取り込み: nsfwjs / systeminformation をトップレベル import から動的 import に変更し、オプショナル依存解決失敗で AiService 全体が壊れないようにする
import type { NSFWJS, PredictionType } from 'nsfwjs/core';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

const REQUIRED_CPU_FLAGS_X64 = ['avx2', 'fma'];
let isSupportedCpu: undefined | boolean = undefined;

@Injectable()
export class AiService {
	private readonly modelDir: string;
	private model: NSFWJS;
	private modelLoadMutex: Mutex = new Mutex();

	constructor(
	) {
		// 旗鯖fork: 本家 2026.6.0 から取り込み: モデルディレクトリを pathToFileURL で URL 化し OS/パス差異を吸収
		const md = resolve(_dirname, '../../nsfw-model');
		this.modelDir = md.endsWith('/') ? md : md + '/';
	}

	@bindThis
	public async detectSensitive(source: string | Buffer): Promise<PredictionType[] | null> {
		try {
			if (isSupportedCpu === undefined) {
				isSupportedCpu = await this.computeIsSupportedCpu();
			}

			if (!isSupportedCpu) {
				console.error('This CPU cannot use TensorFlow.');
				return null;
			}

			const tf = await import('@tensorflow/tfjs-node');
			tf.env().global.fetch = fetch;

			if (this.model == null) {
				const nsfw = await import('nsfwjs/core');
				await this.modelLoadMutex.runExclusive(async () => {
					if (this.model == null) {
						this.model = await nsfw.load(pathToFileURL(this.modelDir).toString(), { size: 299 });
					}
				});
			}

			const buffer = source instanceof Buffer ? source : await fs.promises.readFile(source);
			const image = await tf.node.decodeImage(buffer, 3) as any;
			try {
				const predictions = await this.model.classify(image);
				return predictions;
			} finally {
				image.dispose();
			}
		} catch (err) {
			console.error(err);
			return null;
		}
	}

	private async computeIsSupportedCpu(): Promise<boolean> {
		switch (process.arch) {
			case 'x64': {
				const cpuFlags = await this.getCpuFlags();
				return REQUIRED_CPU_FLAGS_X64.every(required => cpuFlags.includes(required));
			}
			case 'arm64': {
				// As far as I know, no required CPU flags for ARM64.
				return true;
			}
			default: {
				return false;
			}
		}
	}

	@bindThis
	private async getCpuFlags(): Promise<string[]> {
		const si = await import('systeminformation');
		const str = await si.cpuFlags();
		return str.split(/\s+/);
	}
}
