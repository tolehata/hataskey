/* SPDX-License-Identifier: AGPL-3.0-only */
import type { HatadyActivity } from '@/utility/hatady-media.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { hatadyNotice, hatadyNotify } from '@/utility/hatady-ui.js';
import type { HatadySurfaceVariant } from '@/utility/hatady-record-launcher.js';
import { pushHk3Toast } from '@/components/hataskey3/hk3-state.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';

export async function confirmHatadyAction(variant: HatadySurfaceVariant, text: string, type: 'warning' | 'question' = 'warning'): Promise<boolean> {
	if (variant === 'hatady') return !(await os.confirm({ type, text })).canceled;
	const component = (await import('@/components/HatadyDeleteConfirm.vue')).default;
	return await new Promise<boolean>(resolve => {
		const { dispose } = os.popup(component, { variant, text, danger: type === 'warning' }, {
			done: (confirmed: boolean) => resolve(confirmed),
			closed: () => { resolve(false); dispose(); },
		});
	});
}

/** Return true only after the confirmed record has been deleted successfully. */
export async function confirmHatadyRecordDeletion(activity: HatadyActivity, variant: HatadySurfaceVariant = 'hatady'): Promise<boolean> {
	if (!activity.isMine || (!activity.study && !activity.media?.session)) return false;
	const copy = i18n.ts._hata._hatady._home;
	const notify = (message: string) => {
		if (variant === 'hatady') hatadyNotify(message);
		else {
			hatadyNotice.value = null;
			if (variant === 'uis') pushHk3Toast({ icon: 'trash', text: message });
			else os.toast(message);
		}
	};
	let confirmed: boolean;
	try {
		confirmed = await confirmHatadyAction(variant, copy.recordDeleteBody);
	} catch {
		notify(copy.recordDeleteOpenFailed);
		return false;
	}
	if (!confirmed) return false;
	try {
		if (activity.study) await misskeyApi('hata/hatady/logs/delete', { logId: activity.study.id });
		else await misskeyApi('hata/hatady/media/sessions/delete', { sessionId: activity.media!.session.id });
		notify(copy.recordDeleted);
		return true;
	} catch {
		notify(copy.recordDeleteFailed);
		return false;
	}
}
