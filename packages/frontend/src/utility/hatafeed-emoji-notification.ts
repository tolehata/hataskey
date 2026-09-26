/* SPDX-License-Identifier: AGPL-3.0-only */
import type { HataFeedEmojiChangeRequest, HataFeedEmojiRequest } from '@/utility/hatafeed.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { emojiChangeError, emojiStatusLabel } from '@/utility/hatafeed.js';
import { $i } from '@/i.js';
import * as os from '@/os.js';

/** Both the bell and navbar link open the same authorized request detail. */
export async function openHataFeedEmojiNotification(refs: { emojiRequestId?: string | null; emojiChangeRequestId?: string | null }, changed?: () => void): Promise<void> {
	try {
		const access = await misskeyApi('hata/feedback/available', {});
		if (refs.emojiChangeRequestId) {
			const requests = await misskeyApi('hata/feedback/emoji-change-requests', { id: refs.emojiChangeRequestId, limit: 1 }) as unknown as HataFeedEmojiChangeRequest[];
			if (!requests[0]) throw Object.assign(new Error('Emoji request not found'), { code: 'NO_SUCH_EMOJI_REQUEST' });
			const { dispose } = os.popup((await import('@/components/HataFeedEmojiChangeReview.vue')).default, { request: requests[0], isStaff: access.isStaff }, { done: changed, closed: () => dispose() });
		} else if (refs.emojiRequestId) {
			const requests = await misskeyApi('hata/feedback/emoji-requests', { id: refs.emojiRequestId, limit: 1 }) as unknown as HataFeedEmojiRequest[];
			const request = requests[0];
			if (!request) throw Object.assign(new Error('Emoji request not found'), { code: 'NO_SUCH_EMOJI_REQUEST' });
			if (access.isStaff && ['pending', 'held'].includes(request.status)) {
				const { dispose } = os.popup((await import('@/components/HataFeedEmojiApprove.vue')).default, { req: request }, { done: changed, closed: () => dispose() });
			} else if (request.requestedBy?.id === $i?.id) {
				const { dispose } = os.popup((await import('@/components/HataFeedEmojiHistory.vue')).default, { requestId: request.id }, { changed, closed: () => dispose() });
			} else await os.alert({ type: 'info', title: `:${request.name}: · ${emojiStatusLabel[request.status]}`, text: request.resolvedComment ?? '' });
		}
	} catch (error) { await os.alert({ type: 'error', text: emojiChangeError(error) }); }
}
