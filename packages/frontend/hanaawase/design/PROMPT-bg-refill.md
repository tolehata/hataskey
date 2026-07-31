# Codex 依頼：背景20枚の補充（2026-07-27）

⚠️**この文書は調査済みの発注書です。推測から始めないでください。**

---

## 0. なぜ要るのか（実測値。ここが依頼の根拠）

`Vignette.vue` の `BACKDROP_VARIANTS` は**37変種**を挙げていますが、**実在するのは17枚**です。
物語の全場面で「実際に選ばれる背景」を数えた結果：

```
場面×背景タグ の組: 81 / 絵が出る 42 / ⚠️CSS代替に落ちる 39（48.1%）
```

⚠️**約半分の場面で背景が絵にならず、CSSのグラデーションに落ちています。**
落ちる回数が多い順：

| 欠番のid | 落ちた回数 |
|---|---|
| `nf_shop_rain_day` | 11 |
| `nf_shop_rain_evening` | 5 |
| `nf_front_spring_rain` | 4 |
| `nf_front_summer_rain` | 4 |
| `nf_workroom_morning` | 3 |
| `nf_station_snow` / `nf_union_office_day` | 各2 |
| `nf_cafe_day` `nf_front_autumn_rain` `nf_front_winter_snow` `nf_workroom_night` `nf_hillside_autumn` `nf_hillside_night` `nf_hillside_summer` `nf_hillside_winter` | 各1 |

⚠️検証器は `/home/stili/machi-tmp/bgcheck.mjs`（陽性対照つき）。**納品後にこれを回して 39→0 を確認してください。**

---

## 1. ⚠️作ってほしいもの（20枚。ファイル名は厳密に）

⚠️**ファイル名は `BACKDROP_VARIANTS` が参照している文字列そのもの**です。1文字でも違うと404のままです。

| # | ファイル名 | 場面 | 光と天気 |
|---|---|---|---|
| 1 | `nf_shop_rain_day.webp` | 花常の**店内**（既存 `nf_shop_day` と同じ画角） | 昼／雨。ガラス越しに雨脚、床に濡れた反射 |
| 2 | `nf_shop_rain_evening.webp` | 花常の**店内** | 夕／雨。屋内灯が濡れた路面に落ちる |
| 3 | `nf_workroom_morning.webp` | **作業場**（既存 `nf_workroom` と同じ画角） | 朝。斜めに差す白い光、作業台に影が伸びる |
| 4 | `nf_workroom_night.webp` | **作業場** | 夜。手元灯だけが点り、周囲は沈む |
| 5 | `nf_front_spring_rain.webp` | **店の前**（既存 `front_spring` と同じ立ち位置） | 春／雨。濡れた石畳、傘の影は描かない |
| 6 | `nf_front_summer_rain.webp` | **店の前** | 夏／夕立。強い雨、跳ねる水 |
| 7 | `nf_front_autumn_rain.webp` | **店の前** | 秋／雨。落葉が濡れて貼りつく |
| 8 | `nf_front_winter_snow.webp` | **店の前** | 冬／雪。積もりはじめ、足跡はまだ少ない |
| 9 | `nf_station_morning.webp` | **駅前**（⚠️序章の舞台なのに絵が無い） | 朝。人待ちの広場、時計、屋根の骨組み |
| 10 | `nf_station_snow.webp` | **駅前** | 雪。舞う雪と、にじむ灯り |
| 11 | `nf_cafe_day.webp` | **喫茶くろまつ**の店内 | 昼。カウンター、豆の缶、ネルドリップの道具 |
| 12 | `nf_cafe_evening.webp` | **喫茶くろまつ**の店内 | 夕。琥珀色の低い光 |
| 13 | `nf_library_day.webp` | **町立図書館**の閲覧室 | 昼。書架と長机、窓からの平らな光 |
| 14 | `nf_union_office_day.webp` | **商店街組合の事務所** | 昼。机、掲示板、古い書類棚 |
| 15 | `nf_home_evening.webp` | 若菜の**住まい**（店の二階） | 夕。ちゃぶ台と台所、生活の気配 |
| 16 | `nf_hillside_spring.webp` | **町外れの土手・坂の下** | 春。芽吹き、遠くに町並み |
| 17 | `nf_hillside_summer.webp` | **町外れ** | 夏。強い緑と入道雲 |
| 18 | `nf_hillside_autumn.webp` | **町外れ** | 秋。枯草の色、低い日差し |
| 19 | `nf_hillside_winter.webp` | **町外れ** | 冬。刈られた地面、白い空 |
| 20 | `nf_hillside_night.webp` | **町外れ** | 夜。町の灯りが遠く、空が広い |

---

## 2. ⚠️画風・寸法（外すと並べたとき浮きます）

- ⚠️**既存25枚（`nf_*`）と同じ画風で揃える**。⚠️参照: `assets/hanaawase/bg/nf_shop_day.webp` `nf_street_morning.webp` `nf_market_dawn.webp`
- ⚠️**近未来かつ明るい雰囲気**（利用者が明示的に選択した方向）。⚠️ただし**暮らしの温度は変えない**
- ⚠️**寸法は 1672 × 941**（既存 `nf_*` の実測値。⚠️`front_*` `shop_*` の旧世代は 1279×720 だが、**新規は 1672×941 に揃える**）
- ⚠️**人物を描かない**（立ち絵と重なる）
- ⚠️**文字・看板の文字を描かない**（実在の商標や読めない文字は事故のもと）
- ⚠️**下部3割には主題を置かない**（会話枠が重なる）
- ⚠️**実在の作品名・商品名・地名・商標を出さない**

---

## 3. ⚠️納品の手順（ここを飛ばすと履歴が汚れます）

1. 生成マスターは **PNG で出してよい**
2. ⚠️**必ず WebP へ変換して PNG を削除する**（sharp lossy **q86** / **alphaQuality 100**。背景は透過不要）
   - 前例: 背景10枚で 23,563,877バイト → 2,445,896バイト（**10.4%**）
3. ⚠️**PNG を `git add` しない**（履歴に入ると消しても永久に残る）
4. ⚠️変換後、**1枚ずつデコードして寸法一致・非0バイト**を確認する（`raw.length == 幅×高さ×ch`）
5. ⚠️**`bgcheck.mjs` を回して「CSS代替に落ちる」が 39→0 になったことを実測で示す**

---

## 4. ⚠️あわせて確認してほしいこと（絵の問題ではありません）

- 納品済みの `nf_market_auction` `nf_market_winter` `nf_street_morning` `nf_street_night` は、
  ⚠️**現在の決定的な選択（`stableIndex`）では一度も選ばれません**。絵の不備ではなく、
  場面の数に対して変種が多いためです。⚠️**20枚が揃えば分母が変わるので、揃えてから再測定**してください
- `face_N` と `bustup_N` が **N≥7 で同一ファイル**（md5一致。1〜6は別物）。
  ⚠️容量の二重持ちになっているので、意図した形かどうかを確認してください

---

## 5. ⚠️絶対に守る不変条件（CONSTRAINTS より）

- ⚠️**有料要素を一切作らない**（課金・有償通貨・スタミナ・確率表示・ランキング。イベントであっても）
- ⚠️**寄付状態・ロール・プランを読むコードを書かない**（取得箇所自体を作らない）
- ⚠️**パージ容易性**：backend変更ゼロ。`locales/*.yml` / `preferences/def.ts` / `local-storage.ts` の typed union /
  `achievements.ts` / `vite.config.ts` を**触らない**
- アセットは `packages/frontend/assets/hanaawase/bg/` に置けば `/client-assets/` で配信される（追記不要）

## 6. ⚠️検証の正しい経路

⚠️Windows側の docker CLI からマウントすると**リポジトリではない別物**を掴み、grepが空なのを「エラー0」と誤読します（実際に2回発生）。**必ず WSL 側の docker**：

```
wsl.exe -d Ubuntu -e bash -lc 'cd /home/stili/dev/cherrypick-hata && docker run --rm -v "$PWD:/w" -w /w/packages/frontend node:22-slim sh -c "node node_modules/vitest/vitest.mjs run src/pages/hanaawase/"'
```
⚠️`node:22-alpine` は musl で rollup のネイティブbinaryが読めない。**`node:22-slim`** を使うこと。
