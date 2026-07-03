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
        <template v-if="activeCat === 'simpleUi'">
        <!-- 旗鯖fork: トレンドタイムライン (TTL) タブの表示トグル -->
        <FormSection first>
            <template #label>トレンドタイムライン</template>
            <MkSwitch v-model="showTrendingTab">
                <template #label>トレンドタブを表示する</template>
                <template #caption>上部ナビバーの最右に「トレンド」タブを表示します。過去7日間でリアクションやリノートが多かった人気の投稿を、ランダムな順番で表示する発見系タイムラインです。</template>
            </MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>メニューの表示位置</template>
            <MkSwitch v-model="topNavMode">
                <template #label>メニューを画面上部に表示する</template>
                <template #caption>ONにすると、左側のサイドバーの代わりに、画面上部へ横並びのナビバー（アイコン＋ラベルのピル型メニュー）を表示します。デスクトップ表示でのみ有効です。デッキ表示と併用した場合は、ナビバーの下にデッキのツールバーが並びます。</template>
            </MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>デッキ表示</template>
            <MkSwitch v-model="deckIgnoreWidthModel">
                <template #label>画面幅に関係なくデッキを表示する</template>
                <template #caption>通常デッキ表示はデスクトップ幅（1100px以上）でのみ有効ですが、ONにすると画面幅に関係なくデッキモードを適用します。<b>この設定は端末ごとに保存され、他の端末（スマホ等）には同期されません。</b>新デッキUIはスマホ表示に未対応のため、狭い画面では表示が崩れる可能性があります（実験的）。</template>
            </MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>デッキUIのチュートリアル</template>
            <div style="font-size:.85em;opacity:.7;margin-bottom:10px;line-height:1.6;">HatasabaUIデッキモードの初期設定（メニューの位置・ツールバーの位置・レイアウト）を、ウィザード形式でもう一度設定し直せます。</div>
            <button class="_buttonPrimary" @click="replayDeckTutorial" style="padding:10px 20px;font-weight:bold;"><i class="ti ti-refresh"></i> チュートリアルをもう一度行う</button>
        </FormSection>
        <FormSection>
            <template #label>上部ナビバー（タイムラインタブ）</template>
            <div :class="$style.reorderHead">
                <div style="font-size:.85em;opacity:.7;flex:1;">表示するタブとその順番を設定します。</div>
                <button :class="$style.resetBtn" @click="resetTopNav">並び替えを初期化</button>
            </div>
            <div :class="$style.reorderList">
                <div v-for="(item, idx) in topNavItems" :key="item.id" :class="$style.reorderItem">
                    <MkSwitch v-model="item.visible" style="margin:0;flex-shrink:0;transform:scale(.8);transform-origin:left center;" @update:modelValue="saveTopNav" />
                    <i :class="[item.icon, $style.reorderIcon]"></i>
                    <span :class="$style.reorderLabel">{{ item.label }}</span>
                    <div :class="$style.reorderBtns">
                        <button :class="$style.reorderBtn" :disabled="idx===0" @click="moveArr(topNavItems,idx,-1);saveTopNav()">▲</button>
                        <button :class="$style.reorderBtn" :disabled="idx===topNavItems.length-1" @click="moveArr(topNavItems,idx,1);saveTopNav()">▼</button>
                    </div>
                </div>
            </div>
        </FormSection>
        <FormSection>
            <template #label>下部ナビバー</template>
            <div :class="$style.reorderHead">
                <div style="font-size:.85em;opacity:.7;flex:1;">表示する項目（最大4つ）と順番を設定します。</div>
                <button :class="$style.resetBtn" @click="resetBottomNav">並び替えを初期化</button>
            </div>
            <div :class="$style.reorderList">
                <div v-for="(item, idx) in bottomNavItems" :key="item.id" :class="$style.reorderItem">
                    <MkSwitch v-model="item.visible" style="margin:0;flex-shrink:0;transform:scale(.8);transform-origin:left center;" @update:modelValue="saveBottomNav" />
                    <i :class="[item.icon, $style.reorderIcon]"></i>
                    <span :class="$style.reorderLabel">{{ item.label }}</span>
                    <div :class="$style.reorderBtns">
                        <button :class="$style.reorderBtn" :disabled="idx===0" @click="moveArr(bottomNavItems,idx,-1);saveBottomNav()">▲</button>
                        <button :class="$style.reorderBtn" :disabled="idx===bottomNavItems.length-1" @click="moveArr(bottomNavItems,idx,1);saveBottomNav()">▼</button>
                    </div>
                </div>
            </div>
            <div v-if="bottomNavItems.filter(i=>i.visible).length > 4" style="color:#e74040;font-size:.85em;margin-top:6px;">
                <i class="ti ti-alert-triangle"></i> 最大4つまで表示できます。超過分は非表示になります。
            </div>
        </FormSection>
        <FormSection>
            <template #label>サイドメニューの並び替え</template>
            <div style="font-size:.85em;opacity:.7;margin-bottom:12px;line-height:1.55;">
                PC/タブレットのサイドバーとモバイルのドロワーに反映されます。<br>
                <b>編集モーダル</b>でドラッグによる並び替え (グループ越え可)・表示/非表示の切替ができ、明示的に保存することでサーバーに同期され、ログイン中のすべての端末に反映されます。
            </div>
            <button class="_buttonPrimary" @click="openSidebarEditDialog" style="padding:10px 20px;font-weight:bold;">
                <i class="ti ti-edit"></i> サイドバーを編集する
            </button>
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

        <template v-if="activeCat === 'accessibility'">
        <FormSection first>
            <template #label>ノートの間隔</template>
            <div style="font-size:.85em;opacity:.7;margin-bottom:12px;">タイムラインの投稿同士の間隔を調整します。即座に反映されます。</div>
            <!-- 旗鯖fork: デッキ表示時(従来デッキUI / HatasabaUIデッキ)はノート間隔を「詰める」に強制し、UI操作不能化する -->
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
            <!-- 旗鯖fork: 通常表示(デッキUIではないタイムライン)用 -->
            <MkSwitch v-model="normalNoBannerBg">
                <template #label>通常表示の背景にヘッダー画像のぼかしを使用しない</template>
                <template #caption>ONにすると、HatasabaUIの通常タイムライン表示（デッキUI以外）の背景にプロフィールのヘッダー画像のぼかしを使わず、単色背景になります。描画負荷が軽減され、視認性が上がります。</template>
            </MkSwitch>
            <!-- 旗鯖fork: HatasabaUIの追加ページヘッダー(タイトル+戻るボタン)。デフォルトOFFで二重表示を回避。 -->
            <MkSwitch v-model="showPageHeader">
                <template #label>HatasabaUIの追加ページヘッダーを表示する</template>
                <template #caption>ONにすると、ページ上部にHatasabaUI独自のシンプルなヘッダー（ページタイトル＋戻るボタン）が追加で表示されます。OFFにするとページ自身のヘッダー（MkPageHeader）のみになり、タイトルの二重表示が解消されます。</template>
            </MkSwitch>
        </FormSection>
        <!-- 旗鯖fork: HataFeed の若葉アニメーション -->
        <FormSection>
            <template #label>HataFeed</template>
            <MkSwitch v-model="hatafeedLeaves">
                <template #label>ホーム背景で若葉を舞わせる</template>
                <template #caption>HataFeed（フィードバックセンター）のホーム背景に若葉のアニメーションを表示します。光や動きに敏感な方に配慮し、デフォルトはOFFです。OSの「視差効果を減らす」設定時は自動的に止まります。</template>
            </MkSwitch>
        </FormSection>
        <!-- 旗鯖fork: 投稿フォームの枠色(投稿範囲別) -->
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
        <!-- 旗鯖fork: 天気エフェクト(weatherEffect) -->
        <FormSection>
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
        <FormSection>
            <template #label>ウィジェット</template>
            <MkSwitch v-model="widgetBorder">
                <template #label>ウィジェットにテーマカラーの縁色を表示</template>
                <template #caption>ウィジェットにアクセントカラーの縁を表示します（PC・モバイル両方）</template>
            </MkSwitch>
        </FormSection>
        <FormSection>
            <template #label>タイムライン操作</template>
            <MkSwitch v-model="directProfile">
                <template #label>アバタークリックで直接プロフィールへ</template>
                <template #caption>ONにするとユーザーパネルを経由せず、直接プロフィールページに遷移します。Hatasaba UIでは上部の戻るボタンでタイムラインに戻れます。</template>
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
            <!-- 旗鯖fork: HatasabaUIデッキ用 -->
            <MkSwitch v-model="disableBubbleInHatasabaDeck">
                <template #label>HatasabaUIデッキで吹き出し表示を無効にする</template>
                <template #caption>ONにするとHatasabaUIのデッキ表示モードでも吹き出しデザインが適用されず、標準のカード表示になります。</template>
            </MkSwitch>
            <!-- 旗鯖fork: HatasabaUI通常モード用 -->
            <MkSwitch v-model="disableBubbleInHatasabaNormal">
                <template #label>HatasabaUI（通常）で吹き出し表示を無効にする</template>
                <template #caption>ONにするとHatasabaUIの通常表示（デッキ以外）でも吹き出しデザインが適用されず、標準のカード表示になります。</template>
            </MkSwitch>
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
import { getInitialPrefValue } from '@/preferences/manager.js';
import { definePage } from '@/page.js';
import { getHiddenReactions, hiddenReactionsVersion } from '@/utility/hidden-reactions.js';
import { deckIgnoreWidth, setDeckIgnoreWidth } from '@/utility/hatasaba-device-prefs.js';
import { HATA_FONT_PRESETS, applyHataFont, type HataFontId } from '@/scripts/hata-font-manager.js';
import { chooseDriveFile } from '@/utility/drive.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { applySidebarIconOverride } from '@/utility/sidebar-icon-overrides.js';

const categories = [
    { id: 'general', icon: 'ti ti-flag', label: '旗鯖全体' },
    { id: 'font', icon: 'ti ti-typography', label: 'フォント' },
    { id: 'simpleUi', icon: 'ti ti-device-mobile', label: 'Hatasaba UI' },
    { id: 'hatask', icon: 'ti ti-checklist', label: 'Hatask' },
    { id: 'mascot', icon: 'ti ti-mood-smile', label: 'マスコット' },
    { id: 'earthquake', icon: 'ti ti-activity', label: '地震ビューア' },
    { id: 'accessibility', icon: 'ti ti-accessible', label: 'アクセシビリティ' },
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

// 並び替えヘルパー
function moveArr(arr: any[], idx: number, dir: number) {
    const ni = idx + dir; if (ni < 0 || ni >= arr.length) return;
    // 旗鯖fork: インデックス直接代入 (arr[idx]=...) は Vue のリアクティビティで
    // 検知されず並び替えが画面に反映されないため、splice で入れ替える。
    const [moved] = arr.splice(idx, 1);
    arr.splice(ni, 0, moved);
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
// 旗鯖fork: デッキUIのチュートリアルをもう一度開く
const replayDeckTutorial = async () => {
    const { defineAsyncComponent: dac } = await import('vue');
    os.popup(dac(() => import('@/ui/_common_/HatasabaDeckTutorial.vue')), {}, {}, 'closed');
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
const isExternalLinked = computed(() => prefer.s['external.enabled'] && prefer.s['external.token'] != null);
const hiddenReactionCount = computed(() => { hiddenReactionsVersion.value; return getHiddenReactions().length; });
// ===== シンプルUI（prefer同期） =====
const topNavItems = ref([...prefer.s['simpleUi.topNav']]);
function saveTopNav() { prefer.commit('simpleUi.topNav', [...topNavItems.value]); }
watch(topNavItems, saveTopNav, { deep: true });

// 旗鯖fork: トレンドタブ表示トグル
// getter で prefer.s (非reactive) を使うと computed が依存追跡できず、
// トグルしても画面が再描画されない(リロードで初めて反映)バグになる。
// prefer.r[].value (reactive) を使って即時反映するようにする。
const showTrendingTab = computed({
    get: () => prefer.r['simpleUi.showTrendingTab'].value,
    set: (v: boolean) => prefer.commit('simpleUi.showTrendingTab', v),
});
const topNavMode = computed({
    get: () => prefer.r['simpleUi.topNavMode'].value,
    set: (v: boolean) => prefer.commit('simpleUi.topNavMode', v),
});

// 旗鯖fork(#6): 画面幅に関係なくデッキ表示を強制する端末ローカル設定(プロファイル非同期)。
const deckIgnoreWidthModel = computed({
    get: () => deckIgnoreWidth.value,
    set: (v: boolean) => setDeckIgnoreWidth(v),
});

const bottomNavItems = ref([...prefer.s['simpleUi.bottomNav']]);
function saveBottomNav() { prefer.commit('simpleUi.bottomNav', [...bottomNavItems.value]); }
watch(bottomNavItems, saveBottomNav, { deep: true });

// 旗鯖fork: サイドバー編集は MkSidebarEditDialog に分離 (モーダル + ドラッグ並び替え +
//   明示的な保存ボタン + 「保存しました」トースト + 初期値に戻す)。
//   以前は watch による自動保存 + idx 経由の操作だったが、「保存されたか分からない」
//   「サーバー間で同期されてるか不明」というユーザー声と、本番で発生していた設定リセット
//   問題への対策として独立モーダル化した。sidebarItems の ref / saveSidebar / watch /
//   resetSidebar / canMoveSidebar / moveSidebarItem / isSidebarGroupHead /
//   isSidebarItemRequired / isSidebarItemVisible / setSidebarItemVisible /
//   sidebarGroupLabels 等の helper はモーダル側に内包したためここからは削除。
async function openSidebarEditDialog() {
	const { dispose } = os.popup(
		(await import('@/components/MkSidebarEditDialog.vue')).default,
		{},
		{
			// done は MkSidebarEditDialog が save 完了時に emit する。
			// 保存処理 (prefer.commit) と「保存しました」トーストはモーダル側で完結するので
			// ここでは特に何もしない (prefer の reactive が UI 側に伝播する)。
			done: (_v: { saved: boolean }) => { /* noop */ },
			closed: () => dispose(),
		},
	);
}

// 旗鯖fork: 並び替え/表示状態を初期化するボタン用関数。
// def.ts のデフォルトを採用する。
async function resetTopNav() {
	const { canceled } = await os.confirm({ type: 'warning', text: '上部ナビバーの並び順と表示状態をリセットしますか？' });
	if (canceled) return;
	topNavItems.value = JSON.parse(JSON.stringify(getInitialPrefValue('simpleUi.topNav')));
	saveTopNav();
}
async function resetBottomNav() {
	const { canceled } = await os.confirm({ type: 'warning', text: '下部ナビバーの並び順と表示状態をリセットしますか？' });
	if (canceled) return;
	bottomNavItems.value = JSON.parse(JSON.stringify(getInitialPrefValue('simpleUi.bottomNav')));
	saveBottomNav();
}
// 旗鯖fork: 旧 resetSidebar はモーダル (MkSidebarEditDialog) の「初期値に戻す」ボタンに移行

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
