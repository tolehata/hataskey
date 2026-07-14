/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 * 旗鯖fork(Hatady): 分野(subject)レジストリのクライアント側ストア。
 *   hata/hatady/subjects から本人の分野一覧(件数・色)を読み込み、
 *   色の上書きマップ(hySubjectColorOverrides)へ反映する。
 *   分野の管理モーダル・コンポーザーが共有して参照する。
 */
import { ref } from 'vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { setHySubjectColorOverrides } from '@/utility/hatady.js';

export interface HySubjectRow {
	name: string;
	color: string | null;
	logCount: number;
}

// 本人の分野一覧(件数降順)。読み込み後に共有される。
export const hySubjects = ref<HySubjectRow[]>([]);
export const hySubjectsLoaded = ref(false);

// 分野一覧を読み込み、色の上書きマップへ反映する。
export async function loadHySubjects(): Promise<HySubjectRow[]> {
	// 新規エンドポイントのため cherrypick-js の autogen 型にはまだ無い。実行時は問題ないためキャストする。
	const list = await (misskeyApi as any)('hata/hatady/subjects', {}).catch(() => []) as HySubjectRow[];
	hySubjects.value = Array.isArray(list) ? list : [];
	const overrides: Record<string, string> = {};
	for (const s of hySubjects.value) {
		if (s.color) overrides[s.name] = s.color;
	}
	setHySubjectColorOverrides(overrides);
	hySubjectsLoaded.value = true;
	return hySubjects.value;
}

// 分野の色を保存(upsert)。color=null で自動割当に戻す。
export async function saveHySubject(name: string, color: string | null): Promise<void> {
	await (misskeyApi as any)('hata/hatady/subjects/save', { name, color });
	await loadHySubjects();
}

// 分野を削除(reassignTo 指定時はログを付け替え)。
export async function deleteHySubject(name: string, reassignTo: string | null): Promise<{ reassigned: number }> {
	const res = await (misskeyApi as any)('hata/hatady/subjects/delete', { name, reassignTo }) as { reassigned: number };
	await loadHySubjects();
	return res ?? { reassigned: 0 };
}
