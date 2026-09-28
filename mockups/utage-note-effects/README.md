<!-- SPDX-FileCopyrightText: Tolehata and hatasaba-project -->
<!-- SPDX-License-Identifier: AGPL-3.0-only -->
# 宴ノートの面のエフェクト案

通常の Hataskey UI で表示する宴ノートのスタンドアロンモックです。Hataskey UI S は対象外です。本体の `MkNote.vue` にも同じ色面の強さと周期を反映しています。

リポジトリのルートで `python3 -m http.server 8000` を実行し、`http://localhost:8000/mockups/utage-note-effects/` を開いてください。ローカルの LINE Seed JP フォントを使用し、通信は行いません。

初期画面に挑戦中・失敗・成功・通常ノートを並べています。先頭ノートは状態を切り替えられ、デモボタンでは挑戦中から結果までの表示を確認できます。吹き出し ON/OFF、ライト/ダーク、PC/スマホ、動きの軽減も切り替えられます。OS の `prefers-reduced-motion: reduce` は操作設定にかかわらず優先されます。

挑戦中の面のテーマ色は 7% → 21% → 7% を 2.8 秒 `ease-in-out` で循環します。文字・アバターは明滅させません。動きの軽減時は面を 14% の固定色にします。失敗・成功はそれぞれ赤・緑の 15% 固定色とし、結果の明滅や外枠は設けません。色に加えて結果バッジの文言でも状態を伝えます。
