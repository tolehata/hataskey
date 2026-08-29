# Bundled fonts — attribution & licenses

旗鯖fork(Hatask v2 リデザイン)で自己ホストしているフォント一覧。すべて **SIL Open Font License 1.1**（`OFL.txt` に全文同梱）で配布されており、商用可・改変可・埋め込み可。

いずれも [Google Fonts](https://fonts.google.com/) 由来で、woff2 は [Fontsource](https://fontsource.org/)（`cdn.jsdelivr.net/fontsource`）の japanese / latin サブセットを取得して同梱している（実行時に外部CDNへは接続しない）。

| ファイル接頭辞 | フォント | 用途 | 権利表記 |
|---|---|---|---|
| `zkgn-*` | Zen Kaku Gothic New | 本文・共通ベース | Copyright the Zen Kaku Gothic New Project Authors |
| `shippori-*` | Shippori Mincho B1 | 季テーマ 見出し/数字 | Copyright the Shippori Mincho Project Authors |
| `zmg-*` | Zen Maru Gothic | 花信テーマ 見出し/数字 | Copyright the Zen Maru Gothic Project Authors |
| `zkga-*` | Zen Kaku Gothic Antique | 刷テーマ 見出し/本文 | Copyright the Zen Kaku Gothic Antique Project Authors |
| `bebas-neue-*` | Bebas Neue | ラテンのラベル/装飾のみ | Copyright the Bebas Neue Project Authors |
| `@fontsource-variable/noto-sans-jp` | Noto Sans JP Variable | HataSNSCordUIの本文・UIフォント | Google Inc.（Fontsource同梱メタデータ・LICENSEの表記） |

ロゴ用の `Righteous`（`../Righteous-Regular.woff2`）も SIL OFL 1.1（`Righteous-OFL.txt`）。

Tabler Icons（`ti ti-*`, MIT License）はリポジトリ既存の `@tabler/icons-webfont` を流用しており、新規追加はしていない。

HataSNSCordUI 所有画面では、対応するアイコンを `pqoqubbw/icons` の Lucide Animated から Vue へ移植して同梱する。上流に同義の絵がない操作は意味を変えず、既存の静的 `@lucide/vue` を継続する。アニメーションは MIT、Lucide の図形は ISC（Feather 由来部分は MIT）で、著作権表示とライセンス本文は `../licenses/LUCIDE_ANIMATED.txt` と `../licenses/LUCIDE.txt` に収録している。Vue の描画には MIT の `motion-v` を使用し、本文は `../licenses/MOTION_V.txt` に収録している。HataSNSCordUI の対象外で使用する既存 `@lucide/vue` と Tabler Icons は変更していない。

> 注: 予約フォント名（Reserved Font Name）の改変再配布に注意。ここではサブセット woff2 をそのまま同梱しているのみで改変はしていない。公開前に各フォントの原本 LICENSE / 権利表記の最終確認を推奨。
