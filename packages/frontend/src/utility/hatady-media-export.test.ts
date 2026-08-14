/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { misskeyApi } from '@/utility/misskey-api.js';

vi.mock('@/i18n.js', () => ({ i18n: { ts: {}, tsx: {} } }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: vi.fn() }));
vi.mock('@/utility/hatady-prefs.js', () => ({ hatadyTzOffset: () => -540 }));

import {
	buildHatadyMediaExportArchive,
	fetchMediaPages,
	HATADY_MEDIA_EXPORT_CURSOR_STALLED,
	HATADY_MEDIA_EXPORT_FORMAT,
	HATADY_MEDIA_EXPORT_INVALID_RESPONSE,
	HATADY_MEDIA_EXPORT_LIMIT_ERROR,
	HATADY_MEDIA_EXPORT_VERSION,
} from './hatady-export.js';

describe('Hatady映画・ゲーム記録の書き出し', () => {
	beforeEach(() => {
		vi.mocked(misskeyApi).mockReset();
	});

	test('言語非依存の版付き形式で作品と記録を保持する', () => {
		const works = [{
			id: 'work-1',
			kind: 'movie',
			title: '星明かりの航路',
			visibility: 'private',
			viewingMode: 'subtitled',
			reviewSpoiler: true,
		}];
		const sessions = [{ id: 'session-1', workId: 'work-1', kind: 'movie_viewing', occurredAt: '2026-08-12T12:30:00.000Z', durationMinutes: 128 }];
		const archive = buildHatadyMediaExportArchive(works, sessions, {
			now: new Date('2026-08-13T01:02:03.000Z'),
			serverVersion: '2026.7.0-hata.12.1.3',
			timezone: 'Asia/Tokyo',
		});

		expect(archive).toEqual({
			format: HATADY_MEDIA_EXPORT_FORMAT,
			formatVersion: HATADY_MEDIA_EXPORT_VERSION,
			serverVersion: '2026.7.0-hata.12.1.3',
			exportedAt: '2026-08-13T01:02:03.000Z',
			timezone: 'Asia/Tokyo',
			works,
			sessions,
		});
	});

	test('映画作品へゲーム固有情報を自動生成しない', () => {
		const archive = buildHatadyMediaExportArchive([{ id: 'movie', kind: 'movie', title: '映画' }], [], {
			now: new Date(0),
			serverVersion: 'test',
			timezone: 'UTC',
		});
		const movie = archive.works[0] as Record<string, unknown>;
		expect(movie).not.toHaveProperty('weapon');
		expect(movie).not.toHaveProperty('mood');
		expect(movie).not.toHaveProperty('matchResult');
	});

	test('正確に5000件の場合は確認プローブ後に全件を返す', async () => {
		let page = 0;
		vi.mocked(misskeyApi).mockImplementation(async () => {
			const currentPage = page++;
			if (currentPage === 50) return [];
			return Array.from({ length: 100 }, (_, index) => ({
				id: `work-${currentPage}-${index}`,
				kind: 'movie',
			}));
		});

		await expect(fetchMediaPages('hata/hatady/media/works/list')).resolves.toHaveLength(5000);
		expect(misskeyApi).toHaveBeenCalledTimes(51);
		expect(misskeyApi).toHaveBeenLastCalledWith('hata/hatady/media/works/list', expect.objectContaining({ limit: 1, untilId: 'work-49-99' }));
	});

	test('5001件以上の場合は部分データを返さず失敗する', async () => {
		let page = 0;
		vi.mocked(misskeyApi).mockImplementation(async () => {
			const currentPage = page++;
			if (currentPage === 50) return [{ id: 'work-extra', kind: 'movie' }];
			return Array.from({ length: 100 }, (_, index) => ({
				id: `work-${currentPage}-${index}`,
				kind: 'movie',
			}));
		});

		await expect(fetchMediaPages('hata/hatady/media/works/list')).rejects.toThrow(HATADY_MEDIA_EXPORT_LIMIT_ERROR);
		expect(misskeyApi).toHaveBeenCalledTimes(51);
		expect(misskeyApi).toHaveBeenLastCalledWith('hata/hatady/media/works/list', expect.objectContaining({ limit: 1, untilId: 'work-49-99' }));
	});

	test('不正なAPI応答を空一覧として成功扱いしない', async () => {
		vi.mocked(misskeyApi).mockResolvedValueOnce(null as never);

		await expect(fetchMediaPages('hata/hatady/media/works/list')).rejects.toThrow(HATADY_MEDIA_EXPORT_INVALID_RESPONSE);
	});

	test('同じ項目を返す停滞カーソルを部分成功扱いしない', async () => {
		const page = Array.from({ length: 100 }, (_, index) => ({ id: `work-${index}`, kind: 'movie' }));
		vi.mocked(misskeyApi).mockResolvedValueOnce(page as never).mockResolvedValueOnce(page as never);

		await expect(fetchMediaPages('hata/hatady/media/works/list')).rejects.toThrow(HATADY_MEDIA_EXPORT_CURSOR_STALLED);
		expect(misskeyApi).toHaveBeenCalledTimes(2);
	});
});
