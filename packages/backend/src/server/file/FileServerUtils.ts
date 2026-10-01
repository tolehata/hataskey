/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as fs from 'node:fs';
import type { FastifyReply } from 'fastify';

export function handleRangeRequest(
	reply: FastifyReply,
	rangeHeader: string | undefined,
	size: number,
	path: string,
): fs.ReadStream {
	reply.header('Accept-Ranges', 'bytes');
	if (rangeHeader && size > 0) {
		const parts = rangeHeader.replace(/bytes=/, '').split('-');
		const start = parseInt(parts[0], 10);
		let end = parts[1] ? parseInt(parts[1], 10) : size - 1;
		if (end >= size) end = size - 1;
		const chunksize = end - start + 1;
		reply.header('Content-Range', `bytes ${start}-${end}/${size}`);
		reply.header('Content-Length', chunksize);
		reply.code(206);
		return fs.createReadStream(path, { start, end });
	}
	reply.header('Content-Length', size);
	return fs.createReadStream(path);
}
