/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as Misskey from 'cherrypick-js';
import { ref } from 'vue';
import { apiUrl } from '@@/js/config.js';
import { $i } from '@/i.js';
import { globalEvents } from '@/events.js';
import { HATACORDING_RATE_LIMIT_REQUEST_HEADER, isHatacordingRateLimitTrackingActive, updateHatacordingRateLimit } from '@/utility/hatacording-rate-limit.js';
export const pendingApiRequestsCount = ref(0);

// Implements Misskey.api.ApiClient.request
export function misskeyApi<
	ResT = void,
	E extends keyof Misskey.Endpoints = keyof Misskey.Endpoints,
	P extends Misskey.Endpoints[E]['req'] = Misskey.Endpoints[E]['req'],
	_ResT = ResT extends void ? Misskey.api.SwitchCaseResponseType<E, P> : ResT,
>(
	endpoint: E,
	data: P = {} as P,
	token?: string | null | undefined,
	signal?: AbortSignal,
): Promise<_ResT> {
	if (endpoint.includes('://')) throw new Error('invalid endpoint');
	pendingApiRequestsCount.value++;

	const onFinally = () => {
		pendingApiRequestsCount.value--;
	};

	const promise = new Promise<_ResT>((resolve, reject) => {
		// 呼び出し元のオブジェクトは変更せず、送信時だけ認証情報を付与する。
		const requestData: Record<string, unknown> = { ...(data as Record<string, unknown>) };
		if ($i) requestData.i = $i.token;
		if (token !== undefined) requestData.i = token;

		// Send request
		const trackHatacordingRateLimit = isHatacordingRateLimitTrackingActive();
		window.fetch(`${apiUrl}/${endpoint}`, {
			method: 'POST',
			body: JSON.stringify(requestData),
			credentials: 'omit',
			cache: 'no-cache',
			headers: {
				'Content-Type': 'application/json',
				...(trackHatacordingRateLimit ? { [HATACORDING_RATE_LIMIT_REQUEST_HEADER]: '1' } : {}),
			},
			signal,
		}).then(async (res) => {
			if (trackHatacordingRateLimit) updateHatacordingRateLimit(res.headers);
			const body = res.status === 204 ? null : await res.json();

			if (res.status === 200) {
				if (trackHatacordingRateLimit) globalEvents.emit('hatacordingApiAction', endpoint);
				resolve(body);
			} else if (res.status === 204) {
				if (trackHatacordingRateLimit) globalEvents.emit('hatacordingApiAction', endpoint);
				resolve(undefined as _ResT); // void -> undefined
			} else {
				reject(body.error);
			}
		}).catch(reject);
	});

	promise.then(onFinally, onFinally);

	return promise;
}

// Implements Misskey.api.ApiClient.request
export function misskeyApiGet<
	ResT = void,
	E extends keyof Misskey.Endpoints = keyof Misskey.Endpoints,
	P extends Misskey.Endpoints[E]['req'] = Misskey.Endpoints[E]['req'],
	_ResT = ResT extends void ? Misskey.api.SwitchCaseResponseType<E, P> : ResT,
>(
	endpoint: E,
	data: P = {} as any,
): Promise<_ResT> {
	pendingApiRequestsCount.value++;

	const onFinally = () => {
		pendingApiRequestsCount.value--;
	};

	const query = new URLSearchParams(data as any);

	const promise = new Promise<_ResT>((resolve, reject) => {
		const trackHatacordingRateLimit = isHatacordingRateLimitTrackingActive();
		// Send request
		window.fetch(`${apiUrl}/${endpoint}?${query}`, {
			method: 'GET',
			credentials: 'omit',
			cache: 'default',
			headers: trackHatacordingRateLimit ? { [HATACORDING_RATE_LIMIT_REQUEST_HEADER]: '1' } : undefined,
		}).then(async (res) => {
			if (trackHatacordingRateLimit) updateHatacordingRateLimit(res.headers);
			const body = res.status === 204 ? null : await res.json();

			if (res.status === 200) {
				resolve(body);
			} else if (res.status === 204) {
				resolve(undefined as _ResT); // void -> undefined
			} else {
				reject(body.error);
			}
		}).catch(reject);
	});

	promise.then(onFinally, onFinally);

	return promise;
}
