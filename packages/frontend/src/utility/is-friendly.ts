/*
 * SPDX-FileCopyrightText: noridev and cherrypick-project / hatacha
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ref } from 'vue';

/**
 * Friendly UI 判定関数
 *
 * 旗鯖fork (cherrypick-hata) では Friendly UI を全面廃止しているため、
 * この関数は常に `ref(false)` を返します。
 *
 * 多数のコンポーネント (MkPageHeader, MkStickyContainer, common.vue 等) が
 * `isFriendly().value` を参照しているため、後方互換のため関数自体は残し、
 * 戻り値だけを固定化しています。
 */
export function isFriendly() {
	return ref(false);
}
