/* SPDX-License-Identifier: AGPL-3.0-only */
import type { HatadyActivity } from '@/utility/hatady-media.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { hatadyNotify } from '@/utility/hatady-ui.js';
import * as os from '@/os.js';

/** Return true only after the confirmed record has been deleted successfully. */
export async function confirmHatadyRecordDeletion(activity: HatadyActivity): Promise<boolean> {
	if (!activity.isMine || (!activity.study && !activity.media?.session)) return false;
	const { canceled } = await os.confirm({
		type: 'warning',
		text: 'この記録と、その返信・リアクションを削除します。作品とドライブの画像は残ります。',
	});
	if (canceled) return false;
	try {
		if (activity.study) await misskeyApi('hata/hatady/logs/delete', { logId: activity.study.id });
		else await misskeyApi('hata/hatady/media/sessions/delete', { sessionId: activity.media!.session.id });
		hatadyNotify('記録を削除しました');
		return true;
	} catch {
		hatadyNotify('記録を削除できませんでした');
		return false;
	}
}
