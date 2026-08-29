/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Options } from 'motion-v';

// motion-v は React 用の広い Variants 型も再公開しているため、Vue の
// motion コンポーネントが実際に受け取る variants prop から型を取り出す。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HatacordingIconVariants = NonNullable<Options<any>['variants']>;
