# Codex 引き継ぎ：物語UIの不具合5件 ＋ 背景30枚（2026-07-27）

⚠️**この文書は調査結果の引き渡し。原因は特定済みなので、推測から始めないこと。**
実装対象は `packages/frontend/src/pages/hanaawase/Vignette.vue` と `index.vue`。

---

## 0. 先に読むもの

- `HANATSUNE-SPEC.md` ⚠️**§0.4 / §0.45 / §0.46 の落とし穴を着手前に読む**
- `HANATSUNE-CONSTRAINTS.md` ⚠️**法務・パージ容易性**
- `HANATSUNE-WORKLOG.md` 末尾（直近の修正履歴と地雷）

### ⚠️検証の正しい経路（ここを間違えると検証が空振りする。実際に2回起きた）

Windows側の docker CLI から `-v "/home/stili/...:/w"` でマウントすると**リポジトリではない別物**（中身が `packages` 1件だけ）を掴む。`node_modules` が無いのでツールが起動せず、⚠️**grep が空なのを「エラー0」と読み違える**。

必ず **WSL側の docker**：
```
wsl.exe -d Ubuntu -e bash -lc 'cd /home/stili/dev/cherrypick-hata && docker run --rm -v "$PWD:/w" -w /w/packages/frontend node:22-slim sh -c "node node_modules/vitest/vitest.mjs run src/pages/hanaawase/"'
```
- ⚠️`node:22-alpine` は musl で rollup のネイティブbinaryが読めない。**slim** を使う
- vue-tsc は `NODE_OPTIONS=--max-old-space-size=10240` が要る
- 基準値：**全体エラー400件・hanaawase由来0件** ／ 花常テスト **9ファイル146件**
- ⚠️`new URL(..., import.meta.url)` を検証に使わない（Vite がアセット参照として書き換え、`http://localhost:3000/vite/...` に化ける）

---

## 1. ⚠️物語が終わらない・ホームに戻れない・盤面が始まらない（最優先）

### 調査で「正しい」と確認できたもの（⚠️ここを疑い直さないこと）

実測済み（`pendingVignettes` を直接呼んで計測）：

| 状態 | 解放される場面 |
|---|---|
| 進行ゼロ | **4本**（`p-00-bunguten` `p-00-kaiten-zenya` `p-00-chomen-0105` `m1-chomen-0106`） |
| 上記を全部既読 | **0本** |
| 1-1クリア後 | 2本（`m1-hatsuuri` `m1-kyou-no-uchi`） |

- ゲート判定（`isUnlocked` / `pendingVignettes`）は**正しい**
- `Vignette.vue` の `emit("finish", props.vignette.id)` は**正しい id を渡している**
- `updateProgress` は `progress.value` を **await より前に同期で差し替えている**ので、`markVignetteSeen` は即座に効く
- `advance()` → `resolveStep` → `apply` → `step.kind === "end"` で `ended = true` の流れも**正しい**

### ⚠️つまり論理バグではない。「逃げ道が無い」ことが原因

1. 起動直後に**4場面が連続で流れる**
2. ⚠️**帳面は1クリック＝1行**で `shown` に積み上がる。数十行あるので**押し続けるしかない**
3. ⚠️**「この場面を送る」は1場面ぶんしか飛ばせない**。物語そのものから抜ける導線が**存在しない**
4. 結果、利用者から見ると「無限に続く／ホームに戻れない／パズルに辿り着けない」

### 直してほしいこと

- ⚠️**物語から抜ける導線を作る**（「あとで読む」等）。抜けても未読のままにするか、その回だけ抑止するかは要判断。
  ⚠️**未読のまま保留にするとホームに戻るたび再生されて催促のループになる**（前任者が指摘済み）。
  → ⚠️**「今回は読まない」を1セッション限り抑止するフラグ（保存しない）** が無難
- ⚠️**帳面の読み進めを1行ずつにしない**（§2 と併せて）
- ⚠️**連続再生の本数に配慮する**。月替わりで最大4場面が一続きに流れる（SPEC §9.7.5 の「月替わりの間」は未実装）

---

## 2. 帳面を横書きにする ＋ 短くする

⚠️**利用者の指示：「帳面は横書きでいい」**。

- 現状 `.chomen { writing-mode: vertical-rl; }` ＋ `flex-direction: row-reverse` で右から左へ積み上げ
- ⚠️**「送る」で1行ずつ足していくと表示が崩れて非常に読みにくい**（利用者の報告）
- ⚠️**帳面が長すぎる**とも報告されている

→ 横書きにし、⚠️**1クリック＝1行の積み上げをやめる**（まとめて出す／スクロールで読ませる 等）。
⚠️`Vignette.vue:48` の `data-blank` は空行の間を作る仕組み。横書きにしても空行の間は保つこと。

---

## 3. ⚠️サブキャストの立ち絵が出ない

**原因は特定済み。**

```ts
const portraitChar = computed(() => {
  ...
  return line.speaker === "wakana" || line.speaker === "ren" ? line.speaker : undefined;
});
const portraitSrc = computed(() => (portraitChar.value ? bustupPath(portraitChar.value, portraitEmo.value) : ""));
```

⚠️**若菜とレンしか通していない**。さらに `bustupPath` は `bustup_N.webp` を組み立てるが、⚠️**bustup を持つのは若菜6枚・レン6枚だけ**。

サブキャストは `face_N.webp` を持つ（実ファイルの枚数、⚠️シェルで数えた実数）：

| id | face の枚数 |
|---|---|
| wakana | 6 |
| ren | 6 |
| yae | 4 |
| inukai | 4 |
| naito | 3 |
| tatsumi | 3 |
| gen | 3 |
| amamiya | 3 |
| haruno | 3 |

→ ⚠️**話者に応じて bustup と face を出し分ける**。⚠️**枚数の範囲外を組み立てない**こと（404になる）。
⚠️参考実装：`machi.ts` の `facePathOf()` が「範囲外・未登録・非整数なら `null`」を返す形になっている。同じ作法にすると事故らない。
⚠️`Vignette.vue` の `emo` は**1〜6**でテストが縛っているが、⚠️**サブキャストは3〜4枚しかない**ので、そのまま使うと範囲外になる。丸めるか、話者ごとの上限で切ること。

---

## 4. ⚠️キャラの芝居（跳ねる・驚く）が無い

現状は `hana-beat`（260ms の軽い上下）だけで、⚠️**台詞に応じた芝居になっていない**。

- `emo`（表情番号）は行ごとに来ているので、⚠️**表情に応じて動きを変えられる**
- ⚠️`transform` と `opacity` のみ（`filter: blur` 禁止）
- ⚠️`Math.random` 禁止（seeded なものを使う）
- ⚠️`prefers-reduced-motion` と ゲーム内「動き控えめ」の**両方**で停止すること
- ⚠️**利用者の方針：「削って結局微妙になったら本当に無駄なので」**——害があるもの（読めない・酔う）以外は削らない

---

## 5. 直近で入れた修正（⚠️壊さないこと）

- ⚠️`Vignette.vue` は **`--MI_THEME-*` への依存が0件**。自前の `--v-*` トークンで完結している。
  ⚠️**本体テーマ変数を再導入しない**（白地に白で本文が消える不具合の原因だった）
- ⚠️器の高さは `min-height: max(360px, 125cqw)`、広いとき `@container (min-width: 720px)` で `77cqw`。
  ⚠️**`vh` を使わない**（画面の高さ基準なので小窓ではみ出す）。⚠️`@media` ではなく **`@container`**（画面幅で切り替えると小窓で潰れる）。
  拠り所は `index.vue` の `.story-shell { container-type: inline-size }`。⚠️**外さないこと**
- ⚠️立ち絵は **`height: min(100%, 420px)` ＋ `width: auto`**。⚠️**幅で決めると立ち絵の高さが器を押し広げ、立ち絵の有無で背が跳ねる**（実際に起きた）
- ⚠️立ち絵が枠の裏へ潜る量 `--v-dip: 22px` は、⚠️**枠の天の余白（padding 28px＋枠線1px）より小さく保つ**こと。
  これで「立ち絵の下端 < 本文の1行目の上端」が寸法として成立し、重ね順に頼らず本文に被らない
- ⚠️`window.location.assign` を使わない（`useRouter().push` に直済み）。⚠️**ウィンドウモードで他の窓ごと吹き飛ぶ**
- ⚠️生DOMを作るなら `index.vue` の `tagScope()` を通す（`scoped` なので通さないとCSSが1つも当たらない）

---

## 6. ⚠️背景を30枚以上増やす（利用者の指示）

**現状 15枚**（`packages/frontend/assets/hanaawase/bg/`）。⚠️**少なくとも +30枚**。

### 置き場と規約
- `packages/frontend/assets/hanaawase/bg/<id>.webp`（⚠️**拡張子は webp**。png は1枚も残っていない）
- ⚠️**生成マスターは png で出してよいが、必ず WebP へ変換して png は消す**（前回 118MB→13MB、-90.8%。sharp lossy q86 / alphaQuality 100）
- ⚠️`backdrop.ts` の登録表に足す。⚠️**背景タグの語彙は `story.test.ts` が縛っている**ので、新しいタグを本文に足すならテストも一緒に更新すること

### ⚠️現在の語彙（12語）
画像あり8種：`shop_day` `shop_evening` `shop_night` `workroom` `front_spring` `front_summer` `front_autumn` `front_winter`
CSSで描く4種：`market` `street` `indoor_other` `outskirt`

⚠️**`market` `street` `indoor_other` `outskirt` は画像が無いのでCSSのグラデーションで代用している**。ここに実画像を入れるだけでも見違える。

### 何を増やすか（物語の本文から拾った、実際に使われる場面）
⚠️**本文に出てくる場所を優先する**こと。使われない絵を増やしても意味がない。

- **市場**（浜市場）：早朝／競りの最中／帰り。⚠️1〜3月と夏で光が違う
- **通り**（入舟町の商店街）：朝／夕／夜／雨／雪
- **店の前**：現状4季あり。⚠️**雨・雪・夜**が無い
- **作業場**：現状1枚。⚠️**夜・朝**が無い
- **店内**：現状 day/evening/night の3枚。⚠️**雨の日**が無い
- **町外れ**（土手・坂の下・駅前）：⚠️**駅前は序章の舞台なのに画像が無い**
- **室内その他**：喫茶・図書館・組合の事務所・くろまつ（豆屋）
- 季節の行事：梅市／盆／彼岸／年の瀬

### ⚠️画風の指定
- ⚠️**近未来かつ明るい雰囲気**（利用者が明示的に選択した方向）。⚠️ただし**暮らしの温度は変えない**
- ⚠️既存15枚（`nf_*`）と**同じ画風で揃える**こと。⚠️並べたときに浮いたら意味がない
- ⚠️**人物を描かない**（立ち絵と重なる）。⚠️**文字・看板の文字を描かない**（実在の商標や読めない文字は事故のもと）
- ⚠️**下部3割は会話枠が重なる**ので、そこに主題を置かない
- 寸法は既存に合わせる（既存の `nf_shop_day.webp` 等を確認すること）

---

## 7. ⚠️絶対に守る不変条件（CONSTRAINTS より）

- ⚠️**有料要素を一切作らない**（課金・有償通貨・スタミナ・確率表示・ランキング。イベントであっても）
- ⚠️**寄付状態・ロール・プランを読むコードを書かない**（取得箇所自体を作らない）
- ⚠️**パージ容易性**：backend変更ゼロ。`locales/*.yml` / `preferences/def.ts` / `local-storage.ts` の typed union / `achievements.ts` / `vite.config.ts` を**触らない**
- 保存は `i/registry` の自前 scope（`["client","hanaawase"]`）を直接叩く
- ⚠️実在の作品名・商品名・地名・**商標**を出さない（本文の「QRコード」は登録商標のため「二次元コード」に直した前例あり）
