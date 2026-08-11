<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: C/C++ プレイグラウンド(ベータ)。
  ブラウザ内・Worker内でJSCPP(MIT)を使ってC/C++を実行する。サーバーには一切送らない。
-->
<template>
<MkStickyContainer>
	<template #header><MkPageHeader :actions="headerActions" :title="copy.title" :icon="'ti ti-code'"/></template>
	<MkSpacer :contentMax="900">
		<div :class="$style.root">
			<MkInfo>
				{{ copy.introductionBefore }} <b>JSCPP</b> (MIT) {{ copy.introductionAfter }}
			</MkInfo>

			<!-- サンプル -->
			<div :class="$style.samples">
				<span :class="$style.samplesLabel">{{ copy.samples }}</span>
				<button v-for="s in SAMPLES" :key="s.label" :class="$style.sampleBtn" @click="code = s.code">{{ s.label }}</button>
			</div>

			<!-- コードエディタ -->
			<MkCodeEditor v-model="code" lang="cpp"/>

			<!-- 標準入力 -->
			<MkFolder :defaultOpen="false">
				<template #label>{{ copy.stdin }}</template>
				<MkTextarea v-model="stdin" :class="$style.stdin">
					<template #caption>{{ copy.stdinCaption }}</template>
				</MkTextarea>
			</MkFolder>

			<!-- 実行ボタン -->
			<div :class="$style.runRow">
				<MkButton primary gradate rounded :disabled="running" @click="run"><i class="ti ti-player-play"></i> {{ running ? copy.running : copy.run }}</MkButton>
				<MkButton v-if="running" rounded danger @click="stop"><i class="ti ti-player-stop"></i> {{ copy.stop }}</MkButton>
				<MkButton rounded @click="output = ''"><i class="ti ti-eraser"></i> {{ copy.clearOutput }}</MkButton>
			</div>

			<!-- 出力 -->
			<div :class="$style.outputBox">
				<div :class="$style.outputHead"><i class="ti ti-terminal-2"></i> {{ copy.output }}</div>
				<pre :class="$style.outputPre"><code>{{ output || copy.outputPlaceholder }}</code></pre>
			</div>

			<MkInfo warn>
				{{ copy.betaNotice }}
			</MkInfo>
		</div>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { computed, ref, onUnmounted } from 'vue';
import MkInfo from '@/components/MkInfo.vue';
import MkButton from '@/components/MkButton.vue';
import MkCodeEditor from '@/components/MkCodeEditor.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkFolder from '@/components/MkFolder.vue';
import CppRunner from '@/workers/cpp-runner?worker';
import { definePage } from '@/page.js';
import { useRouter } from '@/router.js';
import { i18n } from '@/i18n.js';

const router = useRouter();
const copy = i18n.ts._hata._cppPlayground;

const HELLO = `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, Hataskey!" << endl;
    for (int i = 1; i <= 5; i++) {
        cout << i << " ";
    }
    cout << endl;
    return 0;
}
`;

const SAMPLES = [
	{ label: 'Hello World', code: HELLO },
	{
		label: copy.addInputSample,
		code: `#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}
`,
	},
	{
		label: 'FizzBuzz',
		code: `#include <iostream>
using namespace std;
int main() {
    for (int i = 1; i <= 15; i++) {
        if (i % 15 == 0) cout << "FizzBuzz";
        else if (i % 3 == 0) cout << "Fizz";
        else if (i % 5 == 0) cout << "Buzz";
        else cout << i;
        cout << "\\n";
    }
    return 0;
}
`,
	},
];

const code = ref<string>(HELLO);
const stdin = ref<string>('');
const output = ref<string>('');
const running = ref(false);

let worker: Worker | null = null;
let timeoutTimer = 0;

function cleanupWorker() {
	if (timeoutTimer) { window.clearTimeout(timeoutTimer); timeoutTimer = 0; }
	if (worker) { worker.terminate(); worker = null; }
}

function run() {
	cleanupWorker();
	output.value = '';
	running.value = true;

	worker = new CppRunner();
	// 無限ループ等の最後の砦: 7秒で強制停止。
	timeoutTimer = window.setTimeout(() => {
		cleanupWorker();
		output.value += (output.value ? '\n' : '') + copy.timeout;
		running.value = false;
	}, 7000);

	worker.onmessage = (ev: MessageEvent) => {
		const d = ev.data as { ok: boolean; output?: string; error?: string; exitCode?: number };
		output.value = d.output ?? '';
		if (!d.ok) {
			output.value += (output.value ? '\n' : '') + copy.error.replace('{error}', d.error ?? copy.unknownError);
		} else if (d.exitCode != null && d.exitCode !== 0) {
			output.value += (output.value ? '\n' : '') + copy.exitCode.replace('{code}', d.exitCode.toString());
		}
		running.value = false;
		cleanupWorker();
	};
	worker.onerror = (e) => {
		output.value += (output.value ? '\n' : '') + copy.engineError.replace('{error}', e.message);
		running.value = false;
		cleanupWorker();
	};

	worker.postMessage({ code: code.value, stdin: stdin.value });
}

function stop() {
	cleanupWorker();
	output.value += (output.value ? '\n' : '') + copy.stopped;
	running.value = false;
}

onUnmounted(cleanupWorker);

const headerActions = computed(() => [{
	icon: 'ti ti-arrow-left',
	text: copy.backToBeta,
	handler: () => { router.push('/hatafeed/beta'); },
}]);

definePage(() => ({
	title: copy.title,
	icon: 'ti ti-code',
}));
</script>

<style lang="scss" module>
.root { display: flex; flex-direction: column; gap: 14px; }
.samples { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.samplesLabel { font-size: .85em; opacity: .8; }
.sampleBtn {
	border: 1px solid var(--MI_THEME-divider); background: var(--MI_THEME-panel); color: inherit;
	border-radius: 999px; padding: 4px 12px; font-size: .82em; cursor: pointer; transition: all .12s;
	&:hover { border-color: var(--MI_THEME-accent); color: var(--MI_THEME-accent); }
}
.stdin :global(textarea) { font-family: Consolas, Menlo, monospace; }
.runRow { display: flex; gap: 8px; flex-wrap: wrap; }
.outputBox { border: 1px solid var(--MI_THEME-divider); border-radius: 10px; overflow: hidden; }
.outputHead { font-size: .82em; opacity: .85; padding: 6px 12px; background: var(--MI_THEME-bg); border-bottom: 1px solid var(--MI_THEME-divider); display: flex; align-items: center; gap: 6px; }
.outputPre { margin: 0; padding: 12px; min-height: 100px; max-height: 360px; overflow: auto; font-family: Consolas, Menlo, monospace; font-size: .85em; line-height: 1.5; background: var(--MI_THEME-panel); white-space: pre-wrap; word-break: break-word; }
</style>
