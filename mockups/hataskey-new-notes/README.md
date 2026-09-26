# Hataskey 新着ノート表示モック

通常UIの丸い上部ナビに、UI Sの新着案内を合わせた静的モックです。新規ファイルのみで、製品コードは変更していません。ノート・人物・画像は架空です。API、外部画像、外部通信は使いません。

## 開き方

リポジトリルートを静的配信し、`/mockups/hataskey-new-notes/` を開いてください。フォントはリポジトリ内の既存ファイルを相対参照するため、このディレクトリだけを配信すると読み込めません。

## 操作

- 初期状態は3件。PC・390pxスマホ・UI S小見本は同じ状態を共有します。
- 「1件受信」「12件受信」「連続受信」で件数・顔の追加を確認できます。連続受信は140ms間隔で8回、キューは99件までです。
- ピンクの新着表示を押すと、架空の新着カードを最大4枚追加してキューを0に戻します。元ノートと合わせて最大8枚を保持します。
- 「演出を再生」は1件に戻して登場演出を再生します。その後の受信で1→2→3枚の追加を確認できます。
- 外部タイムラインは投稿者の文言＋アバター表示。通常はUI Sと同じく数字のみです。
- ライト／ダーク、動きの切替を確認できます。OSの動きを減らす設定も初期状態に反映します。

## 参照

- `packages/frontend/src/ui/simple.vue` : 新着案内の位置（256行付近）、丸いtopPillと40pxナビ・newNotesViewport（3370–3440行付近）。
- `packages/frontend/src/components/hataskey3/Hk3Timeline.vue` : バナー内容（94–124行付近）、WAAPI演出・取り消し（850–1010行付近）、48px／compact44pxの帯・26px四角アバター・-6px重なり・上昇矢印（1368–1510行付近）。
- `packages/frontend/assets/fonts/lineseedjp-400.woff2` / `lineseedjp-700.woff2`、`mockups/ui-s-post-banner/Righteous-Regular.woff2`。

## 実装範囲

HTML/CSS/JavaScriptのみ。登場460ms、白flash720ms、件数380ms、アバター520ms、収納420ms＋内容blur300ms、矢印1.1秒を参照。状態更新時に進行中のWAAPIを取り消し、revisionで古い収納完了を無効化します。0件ではhidden／inert／disabledになり、クリック可能な帯に件数を含むアクセシブル名を付けています。`data-count` / `data-motion` / `data-external` / `data-state` とコントロールIDで検証可能です。


## アイコン追加・デコレーション

キューにノートID／人物IDを保持し、同じ顔は同じDOM要素を再利用します。受信直前の表示位置・scale・opacityを取得し、更新後の位置まで520msで動かします。連続受信でもその時点の見た目から追従し、最大3枚から外れる顔は300msで退場します。「演出を再生」で1件から確認できます。

「アイコンデコ」は初期ON。花とリボン／星の自作SVGを人物別に重ね、通常UI・UI S小見本の双方で比較できます。MkAvatar.vueの仕様を参照し、外枠はoverflow visible、画像だけclip、デコはtop/left -50%、200%幅、pointer-events noneで表示します。角度、水平反転、位置、倍率、透過度の指定に対応します。帯の端ではclipします。

実UI Sの外部タイムラインは素のimgなのでデコ情報がありません。このモックでは外部タイムラインにも同じ表示案を見せますが、実装時には投稿者のavatarDecorations相当のmetadataを取得する必要があります。
