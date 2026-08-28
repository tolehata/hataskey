/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * 旗鯖fork: 詳細画面でしばらく何も変えていないとき、見出しの場所に
 * 「設定はここから探せる」ことをそっと知らせるための時計。
 *
 * ⚠️画面の都合（Vue）から切り離してある。ここが動くことは試験で示せるが、
 *   画面へ繋ぎ忘れると何も起きない。繋ぎ込みは別途 contract 試験で見張ること。
 *   （実際、最初の実装は「繋いだつもり」で一度も数え始めていなかった）
 */
export type SearchHintController = {
	/** いまの見え方。true のあいだ見出しの代わりに案内を出す */
	readonly visible: () => boolean;
	/** 数え直す（画面が変わった／設定をいじった） */
	restart: () => void;
	/**
	 * 片付ける（画面から離れるとき）。
	 * ⚠️永久停止にしないこと。keep-alive で戻ってきたときに二度と
	 *   動かなくなる。ここは「いま数えているのをやめる」だけ。
	 */
	stop: () => void;
};

export type SearchHintOptions = {
	idleMs: number;
	visibleMs: number;
	/** 出してよい場面か（狭い幅の詳細画面だけ、など） */
	eligible: () => boolean;
	/** 見え方が変わったときに呼ばれる */
	onChange: (visible: boolean) => void;
	setTimer?: (fn: () => void, ms: number) => number;
	clearTimer?: (id: number) => void;
};

export function createSearchHintController(options: SearchHintOptions): SearchHintController {
	const setTimer = options.setTimer ?? ((fn, ms) => window.setTimeout(fn, ms) as unknown as number);
	const clearTimer = options.clearTimer ?? ((id) => window.clearTimeout(id));

	let timer: number | null = null;
	let visible = false;

	function setVisible(next: boolean) {
		if (visible === next) return;
		visible = next;
		options.onChange(next);
	}

	function stopTimer() {
		if (timer != null) clearTimer(timer);
		timer = null;
	}

	function restart() {
		stopTimer();
		// ⚠️出ている最中に数え直しが来たら、すぐ見出しへ戻す。
		//   いま何の画面かが読めない時間を延ばさないこと。
		setVisible(false);
		if (!options.eligible()) return;
		timer = setTimer(() => {
			// ⚠️出す直前にもう一度確かめる。15秒のあいだに画面が広くなっている
			//   ことがあり、そのときは検索窓が見えているので出す必要がない。
			if (!options.eligible()) return;
			setVisible(true);
			timer = setTimer(() => {
				setVisible(false);
				// ⚠️戻したら、また15秒待つ。続けざまに出さない。
				restart();
			}, options.visibleMs);
		}, options.idleMs);
	}

	return {
		visible: () => visible,
		restart,
		stop: () => {
			stopTimer();
			setVisible(false);
		},
	};
}
