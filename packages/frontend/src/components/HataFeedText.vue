<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
旗鯖fork: HataFeed のコメント等のテキストを表示する。「#番号」を該当イシューへのリンクにする。
  セキュリティ: テキストはすべて Vue の {{ }}(自動エスケープ)で描画し、v-html は使わない。
  リンク化するのは /#\d+/ にマッチした部分だけ(任意HTMLの注入を防ぐ)。
-->
<template>
<span :class="$style.root">
	<template v-for="(seg, i) in segments" :key="i">
		<a v-if="seg.type === 'issue'" :class="$style.ref" @click.prevent.stop="openIssue(seg.number)">#{{ seg.number }}</a>
		<template v-else>{{ seg.text }}</template>
	</template>
</span>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { useRouter } from '@/router.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';

const props = defineProps<{ text: string }>();
const router = useRouter();

type Seg = { type: 'text'; text: string } | { type: 'issue'; number: number };

const segments = computed<Seg[]>(() => {
	const out: Seg[] = [];
	const re = /#(\d+)/g;
	let last = 0;
	let m: RegExpExecArray | null;
	while ((m = re.exec(props.text)) !== null) {
		if (m.index > last) out.push({ type: 'text', text: props.text.slice(last, m.index) });
		out.push({ type: 'issue', number: parseInt(m[1], 10) });
		last = m.index + m[0].length;
	}
	if (last < props.text.length) out.push({ type: 'text', text: props.text.slice(last) });
	return out;
});

async function openIssue(number: number) {
	try {
		const res = await misskeyApi('hata/feedback/issues/show', { number });
		router.pushByPath('/hatafeed/' + res.issue.id);
	} catch {
		os.alert({ type: 'warning', text: i18n.tsx._hata._hatafeed._text.issueNotFound({ number: number.toString() }) });
	}
}
</script>

<style lang="scss" module>
.root { white-space: pre-wrap; word-break: break-word; }
.ref { color: var(--MI_THEME-accent); cursor: pointer; font-weight: 600; }
.ref:hover { text-decoration: underline; }
</style>
