/* SPDX-License-Identifier: AGPL-3.0-only */
export type HatadyTutorialKind = 'initial' | 'update';

export type { HyTutorialPage as HatadyTutorialPage } from '@/utility/hy-tutorial.js';
import type { HyTutorialPage as HatadyTutorialPage } from '@/utility/hy-tutorial.js';

const initialPages: readonly HatadyTutorialPage[] = [
	{
		id: 'about',
		label: 'はじめに',
		icon: 'ti ti-home',
		title: 'Hatadyって？',
		description: '日々の活動を記録して、自分の積み重ねを振り返る場所です。',
		note: 'みんなの記録を読むことや、交流も楽しめます。',
		figure: 'Hatadyの活動と積み重ねの見本。勉強・読書、映画、ゲーム、運動、作業を記録して、日々の積み重ねを振り返れます。',
		caption: '読んだことも、つくったことも',
	},
	{
		id: 'record',
		label: '記録の入り口',
		icon: 'ti ti-plus',
		title: '今日のひとつを、残そう',
		description: '上の「＋」から、今日の活動を選びます。読んだ本も、つくったことも同じ入り口から。',
		note: '',
		figure: '記録の種類を選ぶ画面。勉強・読書、映画、ゲーム、運動、作業の5種類があります。',
		caption: '「＋」から、活動を選ぶ',
	},
	{
		id: 'draft',
		label: '入力と下書き',
		icon: 'ti ti-pencil',
		title: 'ひとつずつ、書いていこう',
		description: 'ひとつずつ入力して、最後に内容を確認します。途中なら、下書きを端末に保存できます。',
		note: '続きは、同じ端末で書き足せます。',
		figure: '記録を入力する画面。種類、内容、確認の順に進み、途中の内容は端末に下書きとして残せます。',
		caption: '少しずつ進めて、最後に確認',
	},
	{
		id: 'visibility',
		label: '公開範囲',
		icon: 'ti ti-lock',
		title: '見せる相手を、自分で選ぶ',
		description: '公開・フォロワーのみ・自分のみから、記録ごとに選べます。作品と記録の公開範囲は、それぞれ設定できます。',
		note: '「自分のみ」の記録も、モデレーターは閲覧できます。',
		figure: '記録の公開範囲。公開、フォロワーのみ、自分のみのうち、自分のみを選んだ例です。',
		caption: '記録にも、作品にも公開範囲',
	},
	{
		id: 'collection',
		label: 'コレクション',
		icon: 'ti ti-books',
		title: '作品のそばに、記録がたまる',
		description: '本・映画・ゲーム・作業は、コレクションにまとまります。ひとつの作品を開くと、これまでの記録が見られます。',
		note: '',
		figure: 'コレクションの本棚。作品を種類ごとに並べ、同じ作品の記録をまとめて振り返れます。',
		caption: '好きな作品と、これまでの記録',
	},
	{
		id: 'following',
		label: 'つながり',
		icon: 'ti ti-users',
		title: '気になる人の、ひとつを読む',
		description: '気になる人をフォローして、公開された記録を読みましょう。感想やリアクションで、少しずつつながれます。',
		note: 'Hatadyのフォローは、hataskey本体とは別のつながりです。',
		figure: 'フォロー中の人の記録。記録には感想を返信したり、リアクションを付けたりできます。',
		caption: '記録を読んで、気持ちを届ける',
	},
	{
		id: 'reflection',
		label: '振り返り',
		icon: 'ti ti-chart-bar',
		title: '自分のペースが、見えてくる',
		description: 'ホームやプロフィールから、日々の積み重ねを振り返れます。色や並べ方は、自分の好みに整えられます。',
		note: '使い方は、設定からいつでも見返せます。',
		figure: 'プロフィールの積み重ね。1週間の記録、合計の件数や時間を確認できます。統計、カレンダー、目標にも移動できます。',
		caption: '少しずつが、ひと目でわかる',
	},
];

const updatePages: readonly HatadyTutorialPage[] = [
	{
		id: 'home',
		label: '新しいホーム',
		icon: 'ti ti-home',
		title: 'いつもの記録を、新しい画面で',
		description: 'ホームから、最近の記録や積み重ねをひと目で。上のタブで、記録・コレクション・プロフィールへ移動できます。',
		note: 'これまでの記録も、そのまま振り返れます。',
		figure: '新しいホームの見本。上部にホーム、記録、コレクション、プロフィールのタブと記録用のプラスがあります。カードにはおすすめの作品、最近30日の記録、コレクションが並びます。',
		caption: 'いつもの場所へ、上のタブから',
	},
	{
		id: 'record',
		label: '記録と下書き',
		icon: 'ti ti-pencil',
		title: '「＋」から、ひとつずつ',
		description: '活動を選んで、項目ごとに入力します。途中の内容は、端末に下書きとして残せます。',
		note: '公開範囲を選んで、最後に内容を確認。',
		figure: '新しい記録画面の見本。勉強・読書、映画、ゲーム、運動、作業から活動を選び、項目ごとに進めます。例は内容・感想の入力で、戻る・次へで移動し、途中の内容を端末に下書きとして残せます。',
		caption: '一度に全部、埋めなくて大丈夫',
	},
	{
		id: 'records',
		label: '日々の記録',
		icon: 'ti ti-notebook',
		title: '読みたい記録へ、すぐに',
		description: '自分の記録も、みんなの記録も「記録」タブへ。活動の種類や日付で、見たい記録を絞り込めます。',
		note: '選んでいるタブだけ、名前が表示されます。',
		figure: '日々の記録の見本。自分の記録、みんな、フォロー中を切り替え、勉強・読書などの活動で絞り込めます。カレンダーから期間を指定でき、記録カードの右上に日付と公開範囲があります。',
		caption: '自分・みんな・フォロー中を切り替え',
	},
	{
		id: 'collection',
		label: 'コレクション',
		icon: 'ti ti-books',
		title: '作品のそばに、これまでの記録',
		description: '本や映画などの作品は、コレクションから。作品を開くと、これまでの記録をまとめて見られます。',
		note: '自分の作品は、タイトル横の鉛筆から編集できます。',
		figure: 'コレクションから開く作品の詳細の見本。本棚、映画、ゲーム、作業を切り替えられます。夜を編む庭のタイトルの横には情報編集の鉛筆があり、下にこれまでの記録が並びます。',
		caption: '作品の情報も、記録もここに',
	},
	{
		id: 'profile',
		label: 'プロフィール',
		icon: 'ti ti-user',
		title: '積み重ねを、自分らしく',
		description: 'プロフィールも、カードで見やすく。週ごとの記録を振り返ったり、色や並び方を整えたりできます。',
		note: '「デザインを編集」から、自分の好みに。',
		figure: '新しいプロフィールの見本。基本情報も1枚のカードとしてジャンルとタグや週間記録と並びます。色や表示項目、順番、並べ方をデザインを編集から変えられます。',
		caption: '記録が増えるほど、自分のページに',
	},
];

export function getHatadyTutorialPages(kind: HatadyTutorialKind): readonly HatadyTutorialPage[] {
	return kind === 'update' ? updatePages : initialPages;
}
