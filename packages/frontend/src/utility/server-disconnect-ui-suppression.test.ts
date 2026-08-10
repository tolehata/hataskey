/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterEach, describe, expect, test } from 'vitest';
import { acquireServerDisconnectUiSuppression, resetServerDisconnectUiSuppressionForTest, serverDisconnectUiSuppressed, shouldSuppressServerDisconnectUi } from './server-disconnect-ui-suppression.js';

describe('画面単位の標準切断UI抑止', () => {
	afterEach(resetServerDisconnectUiSuppressionForTest);

	test('取得中だけ抑止し、最後の画面が離れた時点で従来動作へ戻る', () => {
		const releaseA = acquireServerDisconnectUiSuppression();
		const releaseB = acquireServerDisconnectUiSuppression();
		expect(shouldSuppressServerDisconnectUi()).toBe(true);
		expect(serverDisconnectUiSuppressed.value).toBe(true);

		releaseA();
		expect(shouldSuppressServerDisconnectUi()).toBe(true);
		releaseB();
		expect(shouldSuppressServerDisconnectUi()).toBe(false);
		expect(serverDisconnectUiSuppressed.value).toBe(false);

		// 二重解除で別の取得状態を壊さない。
		releaseB();
		expect(shouldSuppressServerDisconnectUi()).toBe(false);
	});
});
