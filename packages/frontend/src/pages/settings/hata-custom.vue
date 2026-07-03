<!--
SPDX-FileCopyrightText: Tolehata
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<SearchMarker path="/settings/hata-custom" label="旗鯖独自機能" :keywords="['hata', 'custom', 'simple', 'widget', 'timeline', 'font']" icon="ti ti-flag">
    <div class="_gaps_m">
        <MkFeatureBanner icon="/client-assets/package_3d.png" color="#e74040">
            旗鯖独自の機能設定です。カテゴリごとに設定を管理できます。
        </MkFeatureBanner>

        <div :class="$style.catTabs">
            <button v-for="cat in categories" :key="cat.id" :class="[$style.catTab, activeCat === cat.id && $style.catTabOn]" @click="activeCat = cat.id">
                <i :class="cat.icon"></i> {{ cat.label }}
            </button>
        </div>

        <!-- ===== 旗鯖全体 ===== -->
        <template v-if="activeCat === 'general'">
        <FormSection first>
            <template #label>外部アカウント連携</template>
            <FormLink to="/settings/external-account">
                <template #icon><i class="ti ti-link"></i></template>
                外部アカウント連携設定
                <template #suffix><span v-if="isExternalLinked" :class="$style.linkedBadge"><i class="ti ti-check"></i> 連携済み</span></template>
            </FormLink>
        </FormSection>
        <FormSection>
            <template #label>UI変更</template>
            <button class="_buttonPrimary" @click="openUiSetup" style="width:100%;padding:12px;font-weight:bold;">
                <i class="ti ti-wand"></i> UI選択画面を開く
            </button>
        </FormSection>
        <FormSection>
            <template #label>リアクション</template>
            <FormLink to="/settings/hidden-reactions">
                <template #icon><i class="ti ti-eye-off"></i></template>
                非表示リアクション管理
                <template #suffix><span v-if="hiddenReactionCount > 0" :class="$style.countBadge">{{ hiddenReactionCount }}件</span></template>
            </FormLink>
        </FormSection>
        <FormSection>
            <template #label>タイムライン</template>
            <div style="font-weight:bold;margin-bottom:8px;">新規ノートのアニメーション方向</div>
            <MkRadios v-model="timelineAnimationDirection">
                <option value="top">上からスライド</option>
                <option value="left">左からスライド</option>
                <option value="right">右からスライド</option>
                <option value="random">ランダム</option>
            </MkRadios>
        </FormSection>
        <FormSection>
            <template #label>投稿フォーム</template>
            <MkSwitch v-model="showHashtagButtonInPostForm"><template #label>ハッシュタグボタンを表示</template></MkSwitch>
            <MkSwitch v-model="showDrawingButtonInPostForm"><template #label>お絵かきボタンを表示</template></MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>ログイン日数</template>
            <MkSwitch v-model="showLoginBonusPopup"><template #label>ログイン日数のポップアップを表示</template></MkSwitch>
        </FormSection>
        <!-- 旗鯖fork: 旧アクセシビリティタブから移動 -->
        <FormSection>
            <template #label>タイムライン操作</template>
            <MkSwitch v-model="directProfile">
                <template #label>アバタークリックで直接プロフィールへ</template>
                <template #caption>ONにするとユーザーパネルを経由せず、直接プロフィールページに遷移します。Hatasaba UIでは上部の戻るボタンでタイムラインに戻れます。</template>
            </MkSwitch>
        </FormSection>
        <!-- 旗鯖fork: 旧アクセシビリティタブから移動 -->
        <FormSection>
            <template #label>投稿フォームの枠色（投稿範囲別）</template>
            <MkSwitch v-model="pfvbEnabled">
                <template #label>投稿範囲に応じて枠の色を変える</template>
                <template #caption>公開・ホーム・フォロワー・ダイレクトの各範囲ごとに投稿フォームの枠色を変え、誤爆を防ぎやすくします。</template>
            </MkSwitch>
            <template v-if="pfvbEnabled">
                <MkInput v-model="pfvbWidth" type="number" :min="1" :max="12" style="margin-top:10px;">
                    <template #label>枠の太さ（px）</template>
                </MkInput>
                <MkColorInput v-model="pfvbPublic"><template #label>公開</template></MkColorInput>
                <MkColorInput v-model="pfvbHome"><template #label>ホーム</template></MkColorInput>
                <MkColorInput v-model="pfvbFollowers"><template #label>フォロワー</template></MkColorInput>
                <MkColorInput v-model="pfvbSpecified"><template #label>ダイレクト</template></MkColorInput>
            </template>
        </FormSection>
        </template>

        <!-- ===== フォント ===== -->
        <template v-if="activeCat === 'font'">
        <FormSection first>
            <template #label>UIフォント選択</template>
            <div style="font-size:.85em;opacity:.7;margin-bottom:12px;">
                UI全体のフォントを変更できます。すべてのプリセットフォントは SIL Open Font License 1.1 で提供されており、
                Google Fonts CDN から直接読み込まれます。サーバーにフォントデータは保存されません。
            </div>
            <div :class="$style.fontGrid">
                <button
                    v-for="preset in fontPresets"
                    :key="preset.id"
                    :class="[$style.fontCard, fontId === preset.id && $style.fontCardOn]"
                    @click="onFontChange(preset.id)"
                >
                    <div :class="$style.fontSample" :style="{ fontFamily: preset.family + ', sans-serif' }">
                        旗鯖へようこそ！ The quick brown fox
                    </div>
                    <div :class="$style.fontSampleSub" :style="{ fontFamily: preset.family + ', sans-serif' }">
                        あいうえお かきくけこ ABCDEFG 0123456789
                    </div>
                    <div :class="$style.fontName">{{ preset.label }}</div>
                    <div :class="$style.fontMeta">
                        <span :class="$style.fontLicense"><i class="ti ti-license"></i> {{ preset.license }}</span>
                        <span :class="$style.fontAuthor">{{ preset.author }}</span>
                    </div>
                </button>

                <!-- システムフォント -->
                <button
                    :class="[$style.fontCard, fontId === 'system' && $style.fontCardOn]"
                    @click="onFontChange('system')"
                >
                    <div :class="$style.fontSample">旗鯖へようこそ！ The quick brown fox</div>
                    <div :class="$style.fontSampleSub">あいうえお かきくけこ ABCDEFG 0123456789</div>
                    <div :class="$style.fontName">システムフォント</div>
                    <div :class="$style.fontMeta">
                        <span :class="$style.fontLicense">OS標準フォントを使用</span>
                    </div>
                </button>
            </div>
        </FormSection>

        <FormSection>
            <template #label>カスタムフォント（ドライブから）</template>
            <div style="font-size:.85em;opacity:.7;margin-bottom:12px;">
                ドライブにアップロードしたフォントファイル（.ttf, .otf, .woff2）を使用できます。<br>
                使用には免責事項への同意が必要です。
            </div>
            <div v-if="fontId === 'custom' && customFontName" :class="$style.customFontStatus">
                <i class="ti ti-typography"></i>
                現在のカスタムフォント: <strong>{{ customFontName }}</strong>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="_buttonPrimary" @click="openDrivePicker" style="padding:10px 20px;font-weight:bold;">
                    <i class="ti ti-upload"></i> ドライブからフォントを選択
                </button>
                <button class="_buttonGradate" @click="resetToDefault" style="padding:10px 20px;">
                    <i class="ti ti-arrow-back"></i> 既定に戻す
                </button>
            </div>
            <div v-if="customFontConsent" :class="$style.consentNote">
                <i class="ti ti-check"></i> フォント免責事項に同意済み
            </div>
        </FormSection>
        </template>

        <!-- ===== Hatasaba UI ===== -->
        <!-- 旗鯖fork: HatasabaUI に関する設定はモーダル (MkHatasabaUiEditDialog) に集約した。
             理由: 上部/下部ナビバーの並び替え・表示/非表示が、旧・タブ内インライン編集 (watch(deep) 自動保存)
             では本番ユーザーで「リロードするとリセットされる」問題が発生していた。サイドバーと同じく
             明示保存ボタン + 初期化ボタン付きモーダル化することで、保存の確実性と一貫性を担保する。
             また下部ナビ設定は「下部ナビが表示される画面 (モバイル/狭幅) のみ操作可」でグレーアウトさせる。 -->
        <template v-if="activeCat === 'simpleUi'">
        <FormSection first>
            <template #label>HatasabaUI の設定</template>
            <div style="font-size:.85em;opacity:.7;margin-bottom:12px;line-height:1.6;">
                HatasabaUI の見た目・ナビ・チュートリアル等を、専用モーダルからまとめて設定できます。<br>
                ナビバーの並び替え・表示/非表示は編集後に<b>「保存」ボタン</b>でサーバーに反映され、ログイン中の全端末に同期されます。
            </div>
            <button class="_buttonPrimary" @click="openHatasabaUiEditDialog" style="padding:10px 20px;font-weight:bold;">
                <i class="ti ti-device-mobile"></i> HatasabaUI の設定を開く
            </button>
        </FormSection>
        </template>

        <!-- ===== HatasabaUI 2 (新設) ===== -->
        <template v-if="activeCat === 'glassUi'">
        <FormSection first>
            <template #label>HatasabaUI 2</template>
            <div style="font-size:.85em;opacity:.8;margin-bottom:12px;line-height:1.7;">
                <b>HatasabaUI 2</b> は、HatasabaUI 全体のデザインの統一をしつつ、使いやすく目に優しい UI デザインを目指して実装されています。
                <br>初回はデフォルトで有効です。既存の HatasabaUI に戻したい場合はここでオフにできます。<b>この端末にだけ</b>保存されます。
            </div>
            <MkSwitch v-model="glassUi">
                <template #label>HatasabaUI 2 を有効にする</template>
                <template #caption>ノート・プロフィール・リアクション・タブを、統一された半透明＋ぼかしのデザインで表示します。「ぼかし効果を減らす」設定を有効にしている場合は不透明な面にフォールバックします。切替後は表示が乱れる場合があるので、必要ならページを再読み込みしてください。</template>
            </MkSwitch>
            <MkSwitch v-if="glassUi" v-model="glassUiBubble" style="margin-top: 16px;">
                <template #label>吹き出しデザインを表示する</template>
                <template #caption>HatasabaUI 2 のノートを、吹き出し（本文の枠＋＜の口）付きの表示にします。既定ではオフ（吹き出しなし・外側の角丸カードだけのすっきりした表示）です。<b>この端末にだけ</b>保存されます。</template>
            </MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>背景ヘッダー画像のぼかし</template>
            <div v-if="!glassUi" style="font-size:.82em;color:var(--MI_THEME-warn);margin-bottom:10px;padding:8px 10px;border:1px solid var(--MI_THEME-divider);border-radius:8px;background:var(--MI_THEME-panel);">
                <i class="ti ti-info-circle" style="margin-right:4px;"></i>これらの設定は HatasabaUI 2 が有効なときのみ機能します。上のトグルを ON にしてください。
            </div>
            <MkSwitch v-model="normalNoBannerBg" :disabled="!glassUi">
                <template #label>通常タイムラインの背景ヘッダー画像のぼかしを使用しない</template>
                <template #caption>HatasabaUI 2 有効時、通常タイムライン背景にプロフィールのヘッダー画像のぼかしを敷きません。単色背景となり、描画負荷が軽減されます。</template>
            </MkSwitch>
            <MkSwitch v-model="profileNoBannerBg" :disabled="!glassUi">
                <template #label>プロフィールページのヘッダー画像のぼかしを使用しない</template>
                <template #caption>HatasabaUI 2 有効時、プロフィールカードの背後に敷かれるヘッダー画像のぼかしレイヤを描画しません。プロフィールカードは不透明パネルに戻り、視認性が上がります。</template>
            </MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>ノートカードの透過率</template>
            <div v-if="!glassUi" style="font-size:.82em;color:var(--MI_THEME-warn);margin-bottom:10px;padding:8px 10px;border:1px solid var(--MI_THEME-divider);border-radius:8px;background:var(--MI_THEME-panel);">
                <i class="ti ti-info-circle" style="margin-right:4px;"></i>HatasabaUI 2 が有効なときのみ機能します。
            </div>
            <div style="font-size:.85em;opacity:.75;margin-bottom:10px;line-height:1.55;">
                HatasabaUI 2 表示中のタイムラインの<b>ノートカード面の不透明度</b>を調整します。数字が大きいほど不透明パネルに近づき、小さいほど透け感が強くなります。既定は 55。
            </div>
            <div :class="$style.opacityRow">
                <input type="range" min="0" max="100" step="1" v-model.number="glassUiCardOpacity" :disabled="!glassUi" :class="$style.opacityRange" />
                <div :class="$style.opacityValue">{{ glassUiCardOpacity }}%</div>
                <button :class="$style.opacityResetBtn" :disabled="!glassUi || glassUiCardOpacity === 55" @click="glassUiCardOpacity = 55" v-tooltip="'既定値 (55%) に戻す'"><i class="ti ti-restore"></i></button>
            </div>
        </FormSection>
        </template>

        <!-- ===== ビジュアル (新設) ===== -->
        <template v-if="activeCat === 'visual'">
        <FormSection first>
            <template #label>ノートの間隔</template>
            <div style="font-size:.85em;opacity:.7;margin-bottom:12px;">タイムラインの投稿同士の間隔を調整します。即座に反映されます。</div>
            <div v-if="isDeckLike" style="font-size:.82em;color:var(--MI_THEME-warn);margin-bottom:10px;padding:8px 10px;border:1px solid var(--MI_THEME-divider);border-radius:8px;background:var(--MI_THEME-panel);">
                <i class="ti ti-info-circle" style="margin-right:4px;"></i>デッキ表示中は情報密度を保つため、ノートの間隔は「詰める」に固定されます。
            </div>
            <div :class="$style.spacingOptions">
                <button v-for="opt in spacingOptions" :key="opt.value" :class="[$style.spacingCard, noteSpacing === opt.value && $style.spacingCardOn, isDeckLike && $style.spacingCardDisabled]" :disabled="isDeckLike" @click="!isDeckLike && (noteSpacing = opt.value)">
                    <div :class="$style.spacingPreview">
                        <div :class="$style.spacingBubble" :style="{ margin: opt.previewMargin }"></div>
                        <div :class="$style.spacingBubble" :style="{ margin: opt.previewMargin }"></div>
                        <div :class="$style.spacingBubble" :style="{ margin: opt.previewMargin }"></div>
                    </div>
                    <div :class="$style.spacingLabel">{{ opt.label }}</div>
                </button>
            </div>
            <MkSwitch v-model="classicNoteSpacingDisplay" :disabled="disableBubbleInDefault || isHatasabaUi">
                <template #label>従来のMisskey風の投稿間隔を使用する</template>
                <template #caption>ONにするとタイムラインの投稿間隔が従来のMisskeyと同じ間隔になります。<br><span v-if="isHatasabaUi" style="color: var(--MI_THEME-warn);">※HatasabaUIでは常にON（従来Misskey風の投稿間隔：隙間0＋グレーのスペーサーで区切る表示）が適用されるため、変更できません。</span><br v-if="disableBubbleInDefault && !isHatasabaUi"><span v-if="disableBubbleInDefault && !isHatasabaUi" style="color: var(--MI_THEME-warn);">※「Misskey UIで吹き出し表示を無効にする」がONの場合、この設定は使用できません。</span></template>
            </MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>日付の表示（スマホ・狭い画面）</template>
            <MkSwitch v-model="showTimelineDateOnMobile">
                <template #label>スマホ・狭い画面でも日付を表示する</template>
                <template #caption>HatasabaUIをスマホサイズ（狭い画面）で使用しているとき、タイムラインの日付を従来どおりの位置（中央）に表示します。OFFのときは表示スペースの都合で日付を表示しません。広い画面では日付は左側におしゃれに表示されます。</template>
            </MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>表示効果</template>
            <MkSwitch v-model="glassEffect">
                <template #label>すりガラス効果を有効にする</template>
                <template #caption>サイドメニューとウィジェットの背景にバナー画像のすりガラス表示を適用します。OFFにすると単色背景になり、描画負荷が軽減されます。</template>
            </MkSwitch>
            <MkSwitch v-model="deckNoBannerBg">
                <template #label>デッキUIの背景にヘッダー画像のぼかしを使用しない</template>
                <template #caption>ONにすると、HatasabaUIのデッキ表示の背景にプロフィールのヘッダー画像のぼかしを使わず、単色背景になります。描画負荷が軽減され、視認性が上がります。</template>
            </MkSwitch>
            <MkSwitch v-model="showPageHeader">
                <template #label>HatasabaUIの追加ページヘッダーを表示する</template>
                <template #caption>ONにすると、ページ上部にHatasabaUI独自のシンプルなヘッダー（ページタイトル＋戻るボタン）が追加で表示されます。OFFにするとページ自身のヘッダー（MkPageHeader）のみになり、タイトルの二重表示が解消されます。</template>
            </MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>デッキタイムライン</template>
            <MkSwitch v-model="deckLatestNoteText">
                <template #label>「最新のノートです」テキストを表示する</template>
                <template #caption>OFF（既定）: デッキ最上部でタイムラインの先頭に到達したことを、テーマカラーの短い横線でシンプルに示します。<br>ON: 従来通り「（↑）最新のノートです」テキストを表示します。</template>
            </MkSwitch>
            <MkSwitch v-model="showLegacyChannelPostButton">
                <template #label>従来のチャンネル投稿ボタンを表示する</template>
                <template #caption>OFF（既定）: HatasabaUI デッキのチャンネルカラムでは、ノートリスト最上部に固定表示された投稿ボタン（チャンネル×ペンアイコン）から投稿します。<br>ON: 従来の場所（カラムヘッダ右のペン+ボタン、および三点メニュー「このチャンネルへ投稿」）を表示します。</template>
            </MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>HataFeed</template>
            <MkSwitch v-model="hatafeedLeaves">
                <template #label>ホーム背景で若葉を舞わせる</template>
                <template #caption>HataFeed（フィードバックセンター）のホーム背景に若葉のアニメーションを表示します。光や動きに敏感な方に配慮し、デフォルトはOFFです。OSの「視差効果を減らす」設定時は自動的に止まります。</template>
            </MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>ウィジェット</template>
            <MkSwitch v-model="widgetBorder">
                <template #label>ウィジェットにテーマカラーの縁色を表示</template>
                <template #caption>ウィジェットにアクセントカラーの縁を表示します（PC・モバイル両方）</template>
            </MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>吹き出し表示</template>
            <MkSwitch v-model="disableBubbleInDeck">
                <template #label>デッキUIで吹き出し表示を無効にする</template>
                <template #caption>ONにするとデッキUIではタイムラインの吹き出しデザインが適用されず、標準のカード表示になります。</template>
            </MkSwitch>
            <MkSwitch v-model="disableBubbleInDefault">
                <template #label>Misskey UIで吹き出し表示を無効にする</template>
                <template #caption>ONにするとMisskey UI（デフォルトUI）ではタイムラインの吹き出しデザインが適用されず、標準のカード表示になります。</template>
            </MkSwitch>
            <MkSwitch v-model="disableBubbleInHatasabaDeck">
                <template #label>HatasabaUIデッキで吹き出し表示を無効にする</template>
                <template #caption>ONにするとHatasabaUIのデッキ表示モードでも吹き出しデザインが適用されず、標準のカード表示になります。</template>
            </MkSwitch>
            <MkSwitch v-model="disableBubbleInHatasabaNormal">
                <template #label>HatasabaUI（通常）で吹き出し表示を無効にする</template>
                <template #caption>ONにするとHatasabaUIの通常表示（デッキ以外）でも吹き出しデザインが適用されず、標準のカード表示になります。</template>
            </MkSwitch>
        </FormSection>
        </template>

        <template v-if="activeCat === 'hatask'">
        <FormSection first>
            <template #label>Hatask の設定</template>
            <div style="font-size:.85em;opacity:.7;margin-bottom:12px;line-height:1.6;">Hatask（ライフログ）の設定です。背景テーマ・外観（ライト/ダーク）・ホーム画面のセクション表示と並び替え・データ同期などをここから変更できます。設定内容は Hatask 本体と同期します。</div>
            <button class="_buttonPrimary" @click="openHataskSettings" style="padding:10px 20px;font-weight:bold;"><i class="ti ti-settings"></i> Hatask の設定を開く</button>
        </FormSection>
        <FormSection>
            <template #label>Hatask を開く</template>
            <div style="font-size:.85em;opacity:.7;margin-bottom:12px;">Hatask の画面を開きます。</div>
            <button class="_button" @click="goToHatask" style="padding:10px 20px;"><i class="ti ti-external-link"></i> Hatask を開く</button>
        </FormSection>
        </template>
        <template v-if="activeCat === 'mascot'">
        <FormSection first>
            <template #label>マスコット</template>
            <div style="font-size:.85em;opacity:.7;margin-bottom:12px;line-height:1.6;">あなたが用意した画像をマスコットとして表示できる機能です。キャラクター・表情・文言（セリフ）を設定できます。画像はドライブから選択し、URLの参照のみを保存します。初回利用時に同意確認が表示されます。</div>
            <button class="_buttonPrimary" @click="openMascotSettings" style="padding:10px 20px;font-weight:bold;"><i class="ti ti-mood-smile"></i> マスコットの設定を開く</button>
        </FormSection>
        </template>

        <!-- ===== 地震ビューア ===== -->
        <template v-if="activeCat === 'earthquake'">
        <FormSection first>
            <template #label>地震ビューアの設定</template>
            <div style="font-size:.85em;opacity:.7;margin-bottom:12px;line-height:1.6;">地震・津波情報ビューアの設定です。お住いの都道府県（付近の地震表示用）と取得間隔を変更できます。<b>お住いの都道府県はこの端末にのみ保存され、サーバーには送信されません。</b></div>
            <button class="_buttonPrimary" @click="openEarthquakeSettings" style="padding:10px 20px;font-weight:bold;"><i class="ti ti-settings"></i> 地震ビューアの設定を開く</button>
        </FormSection>
        <FormSection>
            <template #label>地震ビューアを開く</template>
            <div style="font-size:.85em;opacity:.7;margin-bottom:12px;">地震・津波情報の画面を開きます。</div>
            <button class="_button" @click="goToEarthquake" style="padding:10px 20px;"><i class="ti ti-activity"></i> 地震・津波情報を開く</button>
        </FormSection>
        </template>

        <!-- ===== その他 (旧アクセシビリティ) ===== -->
        <!-- 旗鯖fork: タブ再編で、旧アクセシビリティタブの項目はほぼ全て ビジュアル / HatasabaUI 2 /
             旗鯖全体 タブに分散移動した。ここには「他タブに分類しづらい」ものだけを残す。
             現状は天気エフェクトのみ。preferences のキー自体は変更していないので、
             既存ユーザーの設定値は移動後もそのまま保持される (マイグレ不要)。 -->
        <template v-if="activeCat === 'accessibility'">
        <FormSection first>
            <template #label>天気エフェクト</template>
            <MkSwitch v-model="weatherEffectEnabled">
                <template #label>天気エフェクトを有効にする</template>
                <template #caption>ノート本文に「雨」「雪」「晴れ」などの単語が含まれていると、タイムラインの背景に控えめな天気演出を表示します。光過敏症に配慮し、強い明滅や点滅は行いません。デフォルトはOFFです。</template>
            </MkSwitch>
            <div v-if="weatherEffectEnabled" class="_gaps_s" style="margin-top:10px;">
                <div style="font-weight:bold;margin-bottom:8px;">演出の長さ</div>
                <MkRadios v-model="weatherEffectDuration">
                    <option value="long">長め（該当する単語のノートがある間ずっと表示）</option>
                    <option value="short">短め（出てから約10秒で消える）</option>
                </MkRadios>
                <div style="font-size:.82em;color:var(--MI_THEME-warn);padding:8px 10px;border:1px solid var(--MI_THEME-divider);border-radius:8px;background:var(--MI_THEME-panel);">
                    ※ ノート本文の「雨」「雪」「晴れ」「強風」「流れ星」「新緑／若葉」「夏／青葉」などの単語に応じて演出が変わります。<br>
                    ※「おはよう」「おやすみ」などの挨拶で出る演出は、この設定に関わらず約10秒で消えます。<br>
                    ※ 演出は控えめに作っていますが、光や動きに少しでも違和感を覚えた場合は、すぐにこの設定をOFFにしてください。雷など強い閃光を伴う演出は安全のため実装していません。
                </div>
            </div>
        </FormSection>
        </template>
    </div>
</SearchMarker>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkRadios from '@/components/MkRadios.vue';
import MkInput from '@/components/MkInput.vue';
import MkColorInput from '@/components/MkColorInput.vue';
import FormSection from '@/components/form/section.vue';
import FormLink from '@/components/form/link.vue';
import MkFeatureBanner from '@/components/MkFeatureBanner.vue';
import * as os from '@/os.js';
import { mainRouter } from '@/router.js';
import { miLocalStorage } from '@/local-storage.js';
import { prefer } from '@/preferences.js';
// 旗鯖fork: getInitialPrefValue は simpleUi タブのナビ初期化ロジックで使っていたが、
//   モーダル (MkHatasabaUiEditDialog) に移設したためこのファイルからは不要になった。
import { definePage } from '@/page.js';
import { getHiddenReactions, hiddenReactionsVersion } from '@/utility/hidden-reactions.js';
// 旗鯖fork: deckIgnoreWidth / setDeckIgnoreWidth は HatasabaUI 設定モーダル側で消費するのみ。
// 旗鯖fork(HatasabaUI 2): 端末ローカルの glassUi 系を hata-custom.vue から使うため import。
import { glassUiLocal, setGlassUiLocal, glassUiBubbleLocal, setGlassUiBubbleLocal } from '@/utility/hatasaba-device-prefs.js';
import { HATA_FONT_PRESETS, applyHataFont, type HataFontId } from '@/scripts/hata-font-manager.js';
import { chooseDriveFile } from '@/utility/drive.js';
import { misskeyApi } from '@/utility/misskey-api.js';
// 旗鯖fork: applySidebarIconOverride も同上 (サイドバー編集はモーダル側で完結)。

// 旗鯖fork: タブ再編。
//   - HatasabaUI 2 タブ新設 (グラス系設定を集約)
//   - ビジュアルタブ新設 (見た目系を集約)
//   - accessibility タブは「その他」にリネームし、天気エフェクトなど余ったものだけ残す
//   - 見た目に関わらない設定 (directProfile / postFormVisibilityBorder 等) は general に移動
// preferences のキー自体は変更しないため、既存ユーザーの設定は移動先タブでもそのまま保持される。
const categories = [
    { id: 'general', icon: 'ti ti-flag', label: '旗鯖全体' },
    { id: 'font', icon: 'ti ti-typography', label: 'フォント' },
    { id: 'simpleUi', icon: 'ti ti-device-mobile', label: 'Hatasaba UI' },
    { id: 'glassUi', icon: 'ti ti-sparkles', label: 'HatasabaUI 2' },
    { id: 'visual', icon: 'ti ti-palette', label: 'ビジュアル' },
    { id: 'hatask', icon: 'ti ti-checklist', label: 'Hatask' },
    { id: 'mascot', icon: 'ti ti-mood-smile', label: 'マスコット' },
    { id: 'earthquake', icon: 'ti ti-activity', label: '地震ビューア' },
    { id: 'accessibility', icon: 'ti ti-dots', label: 'その他' },
];
const activeCat = ref('general');

// フォントタブに切り替えたらプリロード開始
watch(activeCat, (v) => {
    if (v === 'font') preloadAllFonts();
});

// LS helpers (旗鯖全体設定用 — これらは元々LocalStorage)
function useLSBool(key: string, def: boolean) {
    const s = miLocalStorage.getItem(key);
    const v = ref(s !== null ? s === 'true' : def);
    watch(v, n => miLocalStorage.setItem(key, String(n)));
    return v;
}
function useLSStr(key: string, def: string) {
    const v = ref(miLocalStorage.getItem(key) || def);
    watch(v, n => miLocalStorage.setItem(key, n));
    return v;
}


// ===== フォント設定 =====
const fontId = prefer.model('hataFont.id');
const customFontUrl = prefer.model('hataFont.customUrl');
const customFontName = prefer.model('hataFont.customName');
const customFontConsent = prefer.model('hataFont.customFontConsent');

const fontPresets = HATA_FONT_PRESETS;
const fontsPreloaded = ref(false);

// フォントタブを開いた時にすべてのプリセットフォントをプリロード
function preloadAllFonts() {
    if (fontsPreloaded.value) return;
    for (const preset of HATA_FONT_PRESETS) {
        if (preset.googleFontsQuery) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${preset.googleFontsQuery}&display=swap`;
            link.dataset.hataPreview = preset.id;
            document.head.appendChild(link);
        }
    }
    fontsPreloaded.value = true;
}

function onFontChange(id: HataFontId) {
    fontId.value = id;
    applyHataFont();
}

async function openDrivePicker() {
    // 免責事項の同意確認
    if (!customFontConsent.value) {
        const { canceled } = await os.confirm({
            type: 'warning',
            title: 'フォント使用に関する免責事項',
            text: [
                '自前のフォントを使用する場合、以下の事項に同意する必要があります。',
                '',
                '・使用しようとしているフォントのライセンスを確認し、使用条件に違反していないことを確認してください。',
                '・ライセンスに違反したフォントを使用し、何らかの不利益を被ったとしても、サーバー管理者は一切の責任を負いません。',
                '・フォントの表示品質や互換性についてもサーバー管理者は保証しません。',
                '',
                '同意しますか？',
            ].join('\n'),
        });
        if (canceled) return;
        customFontConsent.value = true;
        prefer.commit('hataConsent.customFont', true);
        prefer.commit('hataConsent.customFontDate', new Date().toISOString());
        // サーバーに同意を記録
        misskeyApi('hata/consent/update', { type: 'customFont', agree: true }).catch(console.error);
    }

    // ドライブファイルピッカーを開く
    const files = await chooseDriveFile({ multiple: false }).catch(() => []);
    if (files.length > 0) {
        const file = files[0];
        customFontUrl.value = file.url;
        customFontName.value = file.name.replace(/\.(ttf|otf|woff2?|eot)$/i, '');
        fontId.value = 'custom';
        applyHataFont();
    }
}

function resetToDefault() {
    fontId.value = 'zen-kaku';
    customFontUrl.value = '';
    customFontName.value = '';
    applyHataFont();
}

// ===== 旗鯖全体 =====
const showHashtagButtonInPostForm = useLSBool('showHashtagButtonInPostForm', true);
const showDrawingButtonInPostForm = useLSBool('showDrawingButtonInPostForm', true);
const showLoginBonusPopup = useLSBool('showLoginBonusPopup', true);
const timelineAnimationDirection = prefer.model('timelineAnimationDirection');
const timelineAnimationOptions = [
    { value: 'top', label: '上からスライド' }, { value: 'left', label: '左からスライド' },
    { value: 'right', label: '右からスライド' }, { value: 'random', label: 'ランダム' },
];
const openUiSetup = async () => {
    const { defineAsyncComponent: dac } = await import('vue');
    os.popup(dac(() => import('@/components/MkUISetup.vue')), {}, {}, 'closed');
};
// 旗鯖fork: Hataskの設定を共有コンポーネントで開く(本体とregistry同期)
const openHataskSettings = async () => {
    const { defineAsyncComponent: dac } = await import('vue');
    os.popup(dac(() => import('@/pages/HataskSettings.vue')), {}, {}, 'closed');
};
const goToHatask = () => { mainRouter.push('/hatask'); };

// 旗鯖fork(#34): 地震ビューア設定を共有ダイアログで開く
const openEarthquakeSettings = async () => {
    const { defineAsyncComponent: dac } = await import('vue');
    const { dispose } = os.popup(dac(() => import('@/components/MkEarthquakeSettings.vue')), {}, { closed: () => dispose() });
};
const goToEarthquake = () => { mainRouter.push('/earthquake'); };
// 旗鯖fork: マスコット設定を開く
const openMascotSettings = async () => {
    const { defineAsyncComponent: dac } = await import('vue');
    os.popup(dac(() => import('@/pages/MkMascotSettings.vue')), {}, {}, 'closed');
};
// 旗鯖fork: HatasabaUI の設定モーダルを開く
//   旧・simpleUi タブに散らばっていた 7 セクションをここに集約 (MkHatasabaUiEditDialog)。
//   バッファ + 明示保存で「ナビ並び替えがリロードでリセットされる」問題を根絶する。
const openHatasabaUiEditDialog = async () => {
    const { defineAsyncComponent: dac } = await import('vue');
    const { dispose } = os.popup(
        dac(() => import('@/components/MkHatasabaUiEditDialog.vue')),
        {},
        { closed: () => dispose() },
    );
};
const isExternalLinked = computed(() => prefer.s['external.enabled'] && prefer.s['external.token'] != null);
const hiddenReactionCount = computed(() => { hiddenReactionsVersion.value; return getHiddenReactions().length; });
// 旗鯖fork: simpleUi タブに直接あった topNav/bottomNav の ref / saveTopNav / saveBottomNav /
//   resetTopNav / resetBottomNav / showTrendingTab / topNavMode / deckIgnoreWidthModel /
//   openSidebarEditDialog / replayDeckTutorial は、MkHatasabaUiEditDialog に完全移設した。
//   モーダル側でバッファ + 明示保存 + 初期化ボタンで完結するため、このファイルからは削除済み。

const widgetBorder = prefer.model('simpleUi.widgetBorder');
const glassEffect = prefer.model('simpleUi.glassEffect');
const deckNoBannerBg = prefer.model('simpleUi.deckNoBannerBg');
// 旗鯖fork: 通常表示(デッキUIではないタイムライン)用のヘッダー画像ぼかし無効化トグル
const normalNoBannerBg = prefer.model('simpleUi.normalNoBannerBg');
const directProfile = prefer.model('simpleUi.directProfile');
// 旗鯖fork: HatasabaUI 追加ページヘッダー表示
const showPageHeader = prefer.model('simpleUi.showPageHeader');
const noteSpacing = prefer.model('simpleUi.noteSpacing');
// 旗鯖fork(#15): スマホ/狭幅で日付を従来位置(中央インライン)で表示するか。
const showTimelineDateOnMobile = prefer.model('simpleUi.showTimelineDateOnMobile');
const disableBubbleInDeck = prefer.model('simpleUi.disableBubbleInDeck');
const disableBubbleInDefault = prefer.model('simpleUi.disableBubbleInDefault');
// 旗鯖fork: HatasabaUIデッキ用の吹き出し無効化トグル
const disableBubbleInHatasabaDeck = prefer.model('simpleUi.disableBubbleInHatasabaDeck');
// 旗鯖fork: HatasabaUI通常モード用の吹き出し無効化トグル
const disableBubbleInHatasabaNormal = prefer.model('simpleUi.disableBubbleInHatasabaNormal');
const classicNoteSpacing = prefer.model('simpleUi.classicNoteSpacing');
// 旗鯖fork: デッキタイムライン最上部インジケータをテキストに戻すオプトイン
const deckLatestNoteText = prefer.model('simpleUi.deckLatestNoteText');
// 旗鯖fork(HatasabaUI 2): プロフィールぼかしOFF
const profileNoBannerBg = prefer.model('simpleUi.profileNoBannerBg');
// 旗鯖fork(HatasabaUI 2): ノートカード面の透過率 (0-100 %)
const glassUiCardOpacity = prefer.model('simpleUi.glassUiCardOpacity');
// 旗鯖fork: 従来のチャンネル投稿ボタン (カラムヘッダ右のペン+ボタン + 三点メニュー項目) を表示するか
const showLegacyChannelPostButton = prefer.model('simpleUi.showLegacyChannelPostButton');
// 旗鯖fork(HatasabaUI 2): 端末ローカルのグラス系設定 (ref + setter を computed 経由で v-model 化)
const glassUi = computed({
    get: () => glassUiLocal.value,
    set: (v: boolean) => setGlassUiLocal(v),
});
const glassUiBubble = computed({
    get: () => glassUiBubbleLocal.value,
    set: (v: boolean) => setGlassUiBubbleLocal(v),
});

// 旗鯖fork: 天気エフェクト(weatherEffect)
const weatherEffectEnabled = prefer.model('weatherEffect.enabled');
const hatafeedLeaves = prefer.model('hatafeed.leaves');
// 旗鯖fork: 投稿範囲ごとの投稿フォーム枠色
const pfvbEnabled = prefer.model('postFormVisibilityBorder.enabled');
const pfvbWidth = prefer.model('postFormVisibilityBorder.width');
const pfvbPublic = prefer.model('postFormVisibilityBorder.color.public');
const pfvbHome = prefer.model('postFormVisibilityBorder.color.home');
const pfvbFollowers = prefer.model('postFormVisibilityBorder.color.followers');
const pfvbSpecified = prefer.model('postFormVisibilityBorder.color.specified');
const weatherEffectScope = prefer.model('weatherEffect.scope');
const weatherEffectDuration = prefer.model('weatherEffect.duration');

// Misskey UIの吹き出しを無効化した場合、従来のMisskey風投稿間隔は使えなくなるため、
// 一旦OFFに落としつつ、元の値を記憶。再度吹き出しを有効化したら元に戻す。
const savedClassicNoteSpacing = ref<boolean | null>(null);
watch(disableBubbleInDefault, (isDisabled, wasDisabled) => {
    if (isDisabled && !wasDisabled) {
        // 吹き出しを無効化 → 現在の値を保存して強制OFF
        savedClassicNoteSpacing.value = classicNoteSpacing.value;
        if (classicNoteSpacing.value) {
            classicNoteSpacing.value = false;
        }
    } else if (!isDisabled && wasDisabled) {
        // 吹き出しを再度有効化 → 保存した値に復元
        if (savedClassicNoteSpacing.value !== null) {
            classicNoteSpacing.value = savedClassicNoteSpacing.value;
            savedClassicNoteSpacing.value = null;
        }
    }
});
// 起動時に既に disableBubbleInDefault が true の場合は、classicNoteSpacing を強制 OFF にする
if (disableBubbleInDefault.value && classicNoteSpacing.value) {
    savedClassicNoteSpacing.value = classicNoteSpacing.value;
    classicNoteSpacing.value = false;
}

// 旗鯖fork: デッキ表示時はノート間隔を 'compact' に強制ON+UI操作不能化する。
// - 従来デッキ UI (ui=deck) は localStorage で判定、ページ表示中の切替は無いためページマウント時に固定。
// - HatasabaUI デッキ (ui=simple かつ simpleUi.deckMode=ON) は deckMode の切替に追随する。
const currentUi = miLocalStorage.getItem('ui');
const isLegacyDeckUi = currentUi === 'deck';
// 旗鯖fork(#7): HatasabaUI(ui:simple, 通常表示・デッキ表示の両方)では従来Misskey風の投稿間隔を強制するため、
// 「従来のMisskey風の投稿間隔」トグルを操作不可にする。
const isHatasabaUi = currentUi === 'simple';
// 旗鯖fork(#7): HatasabaUI(通常表示・デッキ表示の両方)では従来Misskey風の投稿間隔を常に適用するため、
// トグルは常にON表示＋操作不可にする(実際の適用状態と一致させる)。
const classicNoteSpacingDisplay = computed<boolean>({
    get: () => isHatasabaUi ? true : classicNoteSpacing.value,
    set: (v: boolean) => { if (!isHatasabaUi) classicNoteSpacing.value = v; },
});
const hatasabaDeckMode = computed(() => prefer.r['simpleUi.deckMode']?.value ?? false);
const isDeckLike = computed(() => isLegacyDeckUi || (currentUi === 'simple' && hatasabaDeckMode.value));
// デッキ時に noteSpacing が変えられても 'compact' に戻す。元の値を保存し、解除時に復元。
const savedNoteSpacing = ref<'compact' | 'moderate' | 'wide' | null>(null);
function enforceDeckSpacing() {
    if (isDeckLike.value) {
        if (noteSpacing.value !== 'compact') {
            savedNoteSpacing.value = noteSpacing.value as 'compact' | 'moderate' | 'wide';
            noteSpacing.value = 'compact';
        }
    } else {
        // デッキ解除時に復元(保存値がある場合のみ)
        if (savedNoteSpacing.value !== null) {
            noteSpacing.value = savedNoteSpacing.value;
            savedNoteSpacing.value = null;
        }
    }
}
// 起動時と deckMode の切替時に適用
enforceDeckSpacing();
watch(isDeckLike, () => { enforceDeckSpacing(); });

// 旗鯖fork(#15): ノート間隔「詰める(compact)」は廃止。通常表示(非デッキ)で compact のユーザーは moderate へ移行する。
if (!isDeckLike.value && noteSpacing.value === 'compact') noteSpacing.value = 'moderate';

// 旗鯖fork(#15): 「詰める」は選択肢から除外(ほどよく / 広め の2択)。
const spacingOptions = [
    { value: 'moderate', label: 'ほどよく', previewMargin: '5px 0' },
    { value: 'wide', label: '広め', previewMargin: '10px 0' },
];

definePage({ title: '旗鯖独自機能', icon: 'ti ti-flag' });
</script>

<style lang="scss" module>
.linkedBadge { color: var(--MI_THEME-success); font-size: 0.9em; }
.countBadge { opacity: 0.7; font-size: 0.9em; }
.catTabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
.catTab {
    padding:8px 16px; border-radius:20px; border:1px solid var(--MI_THEME-divider);
    background:transparent; color:var(--MI_THEME-fg); font-family:inherit; font-size:.85rem;
    font-weight:500; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all .2s;
    &:hover { background:var(--MI_THEME-accentedBg); }
}
.catTabOn { background:var(--MI_THEME-accentedBg); color:var(--MI_THEME-accent); border-color:var(--MI_THEME-accent); font-weight:600; }
.reorderList { display:flex; flex-direction:column; gap:4px; }
.reorderHead { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.resetBtn {
	flex-shrink: 0;
	padding: 4px 12px;
	border-radius: 6px;
	border: 1px solid var(--MI_THEME-divider);
	background: var(--MI_THEME-panel);
	color: var(--MI_THEME-fg);
	font-size: .8rem;
	cursor: pointer;
	transition: background .15s, color .15s;
}
.resetBtn:hover { background: var(--MI_THEME-buttonHoverBg); }
.requiredLabel {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	opacity: .35;
	font-size: .9em;
	flex-shrink: 0;
}
.reorderGroupLabel { font-size:.78rem; font-weight:700; opacity:.6; margin:10px 4px 2px; }
.reorderItem { display:flex; align-items:center; gap:8px; padding:8px 12px; background:var(--MI_THEME-panel); border-radius:10px; border:1px solid var(--MI_THEME-divider); }
.reorderItemHidden { opacity: .45; }
.reorderIcon { font-size:1rem; opacity:.6; width:20px; text-align:center; }
.reorderLabel { flex:1; font-size:.88rem; font-weight:500; }
.reorderBtns { display:flex; gap:2px; }
.reorderBtn {
    width:28px; height:28px; border-radius:6px; border:1px solid var(--MI_THEME-divider);
    background:transparent; color:var(--MI_THEME-fg); font-size:.65rem; cursor:pointer;
    display:flex; align-items:center; justify-content:center; transition:all .15s; font-family:inherit;
    &:hover:not(:disabled) { background:var(--MI_THEME-accentedBg); }
    &:disabled { opacity:.2; cursor:default; }
}
/* 旗鯖fork(HatasabaUI 2): 透過率スライダー行 */
.opacityRow {
    display: flex; align-items: center; gap: 12px; padding: 4px 2px;
}
.opacityRange {
    flex: 1; min-width: 0; accent-color: var(--MI_THEME-accent);
    &:disabled { opacity: .4; cursor: not-allowed; }
}
.opacityValue {
    min-width: 3.2em; text-align: right; font-variant-numeric: tabular-nums;
    font-size: .95em; font-weight: 600; color: var(--MI_THEME-fg);
}
.opacityResetBtn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 999px;
    border: 1px solid var(--MI_THEME-divider); background: var(--MI_THEME-panel);
    color: var(--MI_THEME-fg); cursor: pointer; flex-shrink: 0;
    transition: background .15s, border-color .15s, opacity .15s;
    &:hover:not(:disabled) { background: var(--MI_THEME-accentedBg); border-color: var(--MI_THEME-accent); }
    &:disabled { opacity: .35; cursor: not-allowed; }
}

.spacingOptions { display:flex; gap:8px; flex-wrap:wrap; }
.spacingCard {
    flex:1; min-width:80px; padding:12px 8px 10px; border-radius:12px; border:2px solid var(--MI_THEME-divider);
    background:var(--MI_THEME-panel); cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:8px;
    transition:all .2s; font-family:inherit;
    &:hover { border-color:color-mix(in srgb, var(--MI_THEME-accent) 40%, var(--MI_THEME-divider)); }
}
.spacingCardOn { border-color:var(--MI_THEME-accent); background:var(--MI_THEME-accentedBg); }
/* 旗鯖fork: デッキ表示時の操作不能スタイル */
.spacingCardDisabled { opacity:.5; cursor:not-allowed; pointer-events:none; }
.spacingPreview {
    width:100%; display:flex; flex-direction:column; align-items:stretch;
    background:color-mix(in srgb, var(--MI_THEME-fg) 5%, transparent); border-radius:8px; padding:6px;
    min-height:60px; justify-content:center;
}
.spacingBubble {
    height:10px; border-radius:6px;
    background:color-mix(in srgb, var(--MI_THEME-fg) 15%, transparent);
}
.spacingLabel { font-size:.82rem; font-weight:600; color:var(--MI_THEME-fg); }

/* ===== フォント設定 ===== */
.fontGrid { display: flex; flex-direction: column; gap: 8px; }
.fontCard {
    display: flex; flex-direction: column; gap: 6px; padding: 14px 16px;
    border-radius: 12px; border: 2px solid var(--MI_THEME-divider);
    background: var(--MI_THEME-panel); cursor: pointer; text-align: left;
    transition: all .2s; font-family: inherit;
    &:hover { border-color: color-mix(in srgb, var(--MI_THEME-accent) 40%, var(--MI_THEME-divider)); }
}
.fontCardOn { border-color: var(--MI_THEME-accent); background: var(--MI_THEME-accentedBg); }
.fontSample { font-size: 1.4em; line-height: 1.5; margin-bottom: 2px; }
.fontSampleSub { font-size: 0.92em; line-height: 1.4; opacity: 0.6; margin-bottom: 6px; }
.fontName { font-size: .88rem; font-weight: 600; }
.fontMeta { display: flex; flex-direction: column; gap: 2px; }
.fontLicense { font-size: .72rem; opacity: .5; display: flex; align-items: center; gap: 4px; }
.fontAuthor { font-size: .72rem; opacity: .4; }
.customFontStatus {
    padding: 10px 14px; border-radius: 10px; margin-bottom: 8px;
    background: var(--MI_THEME-accentedBg); font-size: .88rem;
    display: flex; align-items: center; gap: 6px;
}
.consentNote {
    margin-top: 8px; font-size: .82rem; opacity: .6;
    display: flex; align-items: center; gap: 4px; color: var(--MI_THEME-success);
}
</style>
