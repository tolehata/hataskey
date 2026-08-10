/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 画面固有の切断案内が有効な間だけ、標準の再読込ダイアログ／静かな警告を抑止する。
 * 永続設定そのものには触れず、最後の利用画面が離れた時点で必ず従来動作へ戻す。
 */

import { shallowRef } from 'vue';

const activeTokens = new Set<symbol>();

export const serverDisconnectUiSuppressed = shallowRef(false);

function syncSuppressionState(): void {
	serverDisconnectUiSuppressed.value = activeTokens.size > 0;
}

export function acquireServerDisconnectUiSuppression(): () => void {
	const token = Symbol('server-disconnect-ui-suppression');
	activeTokens.add(token);
	syncSuppressionState();
	let released = false;

	return () => {
		if (released) return;
		released = true;
		activeTokens.delete(token);
		syncSuppressionState();
	};
}

export function shouldSuppressServerDisconnectUi(): boolean {
	return activeTokens.size > 0;
}

/** テストで状態を隔離するためだけに使用する。 */
export function resetServerDisconnectUiSuppressionForTest(): void {
	activeTokens.clear();
	syncSuppressionState();
}
