# Bundled fonts — attribution & licenses

旗鯖fork(Hatask v2 リデザイン)で自己ホストしているフォント一覧。すべて **SIL Open Font License 1.1**（`OFL.txt` に全文同梱）で配布されており、商用可・改変可・埋め込み可。Zen Kaku Gothic Newの著作権表示とライセンス全文は、個別の `Zen-Kaku-Gothic-New-OFL.txt` にも収録している。

いずれも [Google Fonts](https://fonts.google.com/) 由来。ArchivoはGoogle Fontsの配信WOFF2を直接取得し、その他のWOFF2は [Fontsource](https://fontsource.org/)（`cdn.jsdelivr.net/fontsource`）から取得している。いずれも自己ホストし、実行時に外部CDNへは接続しない。

| ファイル接頭辞 | フォント | 用途 | 権利表記 |
|---|---|---|---|
| `zkgn-*` | Zen Kaku Gothic New | 本文・共通ベース | Copyright 2022 The Zen Kaku Gothic Project Authors（`Zen-Kaku-Gothic-New-OFL.txt`） |
| `shippori-*` | Shippori Mincho B1 | 季テーマ 見出し/数字 | Copyright the Shippori Mincho Project Authors |
| `zmg-*` | Zen Maru Gothic | 花信テーマ 見出し/数字 | Copyright the Zen Maru Gothic Project Authors |
| `zkga-*` | Zen Kaku Gothic Antique | 刷テーマ 見出し/本文 | Copyright the Zen Kaku Gothic Antique Project Authors |
| `bebas-neue-*` | Bebas Neue | ラテンのラベル/装飾のみ | Copyright the Bebas Neue Project Authors |
| `archivo-*-wght.woff2` | Archivo | 暁テーマの数字・時刻・件数 | Copyright 2020 The Archivo Project Authors（`Archivo-OFL.txt`） |
| `@fontsource-variable/noto-sans-jp` | Noto Sans JP Variable | HataSNSCordUIの本文・UIフォント | Google Inc.（Fontsource同梱メタデータ・LICENSEの表記） |

ロゴ用の `Righteous`（`../Righteous-Regular.woff2`）も SIL OFL 1.1（`Righteous-OFL.txt`）。

## Archivo

- ライセンス: **SIL Open Font License 1.1**。Hatask本体のAGPL-3.0-onlyへ付け替えず、独立したフォント資産として同梱する
- 著作権表示: Copyright 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo)
- 著作権表示・ライセンス全文: [Archivo-OFL.txt](./Archivo-OFL.txt)。配信先は `/client-assets/fonts/Archivo-OFL.txt`
- 上流: [Archivo Project](https://github.com/Omnibus-Type/Archivo)、[Google Fonts](https://fonts.google.com/specimen/Archivo)
- 取得日: 2026-09-05。Google Fonts配信のv25、normal、幅100%、可変ウェイト100–900を使用する
- [取得元CSS](https://fonts.googleapis.com/css2?family=Archivo:wght@100..900&display=swap)のlatin / latin-ext / vietnameseを同梱。フォントの再加工・変換・追加サブセット化は行っていない
- ライセンスの取得元: [google/fonts の固定版](https://github.com/google/fonts/blob/6c70c829f09ea345d3590406693220ea35c6553f/ofl/archivo/OFL.txt)
- 同梱と自己ホストの条件: [SIL公式FAQ 1.2・1.3・2.1](https://openfontlicense.org/ofl-faq/)。フォントのOFLと本体のAGPLによるソース提供義務をそれぞれ維持する

| 同梱ファイル | Google Fonts配信元 | SHA-256 |
|---|---|---|
| `archivo-latin-wght.woff2` | [latin](https://fonts.gstatic.com/s/archivo/v25/k3kPo8UDI-1M0wlSV9XAw6lQkqWY8Q82sLydOxI.woff2) | `8f704806dbedeaaeca334b11ec348bc3ac3a439d6431544b3afb54f534ee4967` |
| `archivo-latin-ext-wght.woff2` | [latin-ext](https://fonts.gstatic.com/s/archivo/v25/k3kPo8UDI-1M0wlSV9XAw6lQkqWY8Q82sLyTOxK-vA.woff2) | `ff4f17d21930e36d6d93baba663e624cb767afc3feebf7adaebd82242638de05` |
| `archivo-vietnamese-wght.woff2` | [vietnamese](https://fonts.gstatic.com/s/archivo/v25/k3kPo8UDI-1M0wlSV9XAw6lQkqWY8Q82sLySOxK-vA.woff2) | `5a621c5598a31392555104ccdc41a46c3104f1cc22666024a8afb881ca9adaab` |

## Zen Kaku Gothic New

- 対象ファイル: `zkgn-jp-400.woff2`、`zkgn-jp-500.woff2`、`zkgn-jp-700.woff2`、`zkgn-latin-400.woff2`、`zkgn-latin-500.woff2`、`zkgn-latin-700.woff2`
- ライセンス: SIL Open Font License 1.1
- 著作権表示: Copyright 2022 The Zen Kaku Gothic Project Authors
- 同梱WOFF2の内部表記: Copyright 2022 The Zen Project Authors（<https://github.com/googlefonts/zen-kakugothic>）
- 同梱WOFF2のライセンスURL: <https://scripts.sil.org/OFL>
- 上流: <https://github.com/googlefonts/zen-kakugothic>
- ライセンス全文: `Zen-Kaku-Gothic-New-OFL.txt`

Tabler Icons（`ti ti-*`, MIT License）はリポジトリ既存の `@tabler/icons-webfont` を流用しており、新規追加はしていない。

HataSNSCordUI 所有画面では、対応するアイコンを `pqoqubbw/icons` の Lucide Animated から Vue へ移植して同梱する。上流に同義の絵がない操作は意味を変えず、既存の静的 `@lucide/vue` を継続する。アニメーションは MIT、Lucide の図形は ISC（Feather 由来部分は MIT）で、著作権表示とライセンス本文は `../licenses/LUCIDE_ANIMATED.txt` と `../licenses/LUCIDE.txt` に収録している。Vue の描画には MIT の `motion-v` を使用し、本文は `../licenses/MOTION_V.txt` に収録している。HataSNSCordUI の対象外で使用する既存 `@lucide/vue` と Tabler Icons は変更していない。

> 注: 予約フォント名（Reserved Font Name）の改変再配布に注意。Fontsourceから取得したサブセットwoff2は、このリポジトリ内では再加工せずに同梱している。公開前に各フォントの原本LICENSEと権利表記の最終確認を推奨。
