/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

type FIXME = any;

// 旗鯖fork: JSCPP(C/C++インタプリタ・MIT)は型定義を持たないため最小宣言を用意する。
declare module 'JSCPP' {
	interface JSCPPConfig {
		stdio?: { write?: (s: string) => void; drain?: () => string };
		maxTimeout?: number;
		[key: string]: unknown;
	}
	const JSCPP: {
		run: (code: string, input: string, config?: JSCPPConfig) => number;
	};
	export default JSCPP;
}

declare const _LANGS_: string[][];
declare const _VERSION_: string;
declare const _BASEDMISSKEYVERSION_: string;
declare const _GIT_HASH_: string;
declare const _ENV_: string;
declare const _DEV_: boolean;
declare const _PERF_PREFIX_: string;

// for dev-mode
declare const _LANGS_FULL_: string[][];

// TagCanvas
interface Window {
	TagCanvas: any;
}
