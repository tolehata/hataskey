/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/*
 * 旗鯖fork: C/C++ プレイグラウンドの実行ワーカー。
 *   JSCPP(JS製のC/C++インタプリタ・MIT) を使い、ブラウザ内・Worker内で完結して実行する。
 *   - サーバーに一切送らない(安全)。
 *   - 無限ループ等はメインスレッド側が worker.terminate() で強制停止する(最後の砦)。
 *     JSCPP 側の maxTimeout でもガードする。
 */

// JSCPP は CommonJS。Vite/esbuild の相互運用でデフォルトインポートする。
import JSCPP from 'JSCPP';

interface RunRequest {
	code: string;
	stdin?: string;
}

self.addEventListener('message', (ev: MessageEvent<RunRequest>) => {
	const { code, stdin } = ev.data;
	let output = '';

	const config = {
		stdio: {
			write: (s: string) => { output += s; },
		},
		// インタプリタ側の暴走ガード(ミリ秒)。メイン側の terminate と二重で守る。
		maxTimeout: 5000,
	};

	try {
		const exitCode = (JSCPP as unknown as { run: (c: string, i: string, cfg: unknown) => number }).run(code, stdin ?? '', config);
		(self as unknown as Worker).postMessage({ ok: true, output, exitCode });
	} catch (err) {
		const message = (err && typeof err === 'object' && 'message' in err) ? String((err as { message: unknown }).message) : String(err);
		(self as unknown as Worker).postMessage({ ok: false, output, error: message });
	}
});
