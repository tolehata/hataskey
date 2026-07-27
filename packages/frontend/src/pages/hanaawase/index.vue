<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<PageWithHeader>
	<!-- ⚠️data-scene は「物語の場面だけ器を広げる」ための目印。盤面・ホーム・街の様子の寸法には触らない -->
	<main class="hanaawase-scope" :data-motion="motionOn ? 'on' : 'off'" :data-scene="scene">
		<section v-if="scene === 'disclaimer'" class="disclaimer-shell" aria-labelledby="hanaawase-title">
			<h1 id="hanaawase-title">この作品について</h1>
			<!-- ⚠️再表示された人に理由を示す。無いと「なぜまた出たのか」がわからない -->
			<p v-if="disclaimerRevisited" class="disclaimer-note">遊んだ記録の扱いについて書き足したので、もう一度お見せしています。</p>
			<p>「花常」は、物語・キャラクターの絵・図案の相当部分を、生成AIを用いて制作しています。生成AIの利用に強い抵抗をお持ちの方には、プレイをおすすめしません。</p>
			<p>登場する人物・店・町は、すべて架空のものです。実在の人物・団体とは関係ありません。</p>
			<p>遊んだ記録（進み具合・遊んだ回数・設定）は、このサーバーのあなたのアカウントに保存されます。サーバーの管理者は、不具合の調査と難易度の調整のためにこれを見ることがあります。他の利用者に公開されることはありません。</p>
			<div v-if="disclaimerPending" class="disclaimer-actions"><button type="button" @click="leaveGame">やめておく</button><button type="button" @click="acceptDisclaimer">はじめる</button></div><div v-else class="disclaimer-actions"><button type="button" @click="scene = 'settings'">設定に戻る</button></div>
		</section>

		<!--
		旗鯖fork: ホーム。design/02-meta.dc.html の home() が正本。
		⚠️「街の様子」(MachiFeed) が主役なので、ここは主役の手前に置く「扉」として組む。
		⚠️背景画像の上に文字を載せるため .home-scrim を必ず挟む（画像の明るさに関わらず読める）。
		-->
		<section v-else-if="scene === 'home'" class="map-shell sheet home-shell" aria-labelledby="hanaawase-title">
			<img v-if="homeBg" class="home-bg" :src="homeBg" alt="" aria-hidden="true" @error="onBackdropError">
			<span v-if="homeBg" class="home-scrim" aria-hidden="true"></span>
			<header class="home-heading">
				<span class="home-seal" v-html="FLOWER_SVGS.sakura.svg"></span>
				<h1 id="hanaawase-title">花常</h1>
				<p>季節の花を合わせて、一年をめぐる。</p>
			</header>
			<button
				v-if="menuLine && (bustupOk || gameSettings.barks)"
				class="home-cast"
				type="button"
				:data-motion="motionOn ? 'on' : 'off'"
				:aria-label="`${menuLine.name}のひとこと。押すと次のひとこと。`"
				@click="refreshMenuLine"
			>
				<img v-if="bustupOk" class="cast-bustup" :src="bustupPath(menuLine.char, menuLine.line.face)" alt="" @error="onBustupError">
				<span v-if="gameSettings.barks" :key="menuLine.line.t" class="cast-bubble"><b>{{ menuLine.name }}</b><span>{{ menuLine.line.t }}</span></span>
			</button>
			<div v-if="!saveLoaded" class="loading-note">記録を読んでいます。</div>
			<nav v-else class="home-menu" aria-label="花常の目次">
				<button class="menu-card menu-lead" type="button" @click="startStage(continueStage)">
					<span class="menu-mark" aria-hidden="true" v-html="FLOWER_SVGS[continueStage.flower].svg"></span>
					<span class="menu-copy"><b>続きから</b><small>{{ KANJI_MONTH[continueStage.month] }} {{ continueStage.monthName }} — 花仕事のつづき</small></span>
					<span class="menu-chev" aria-hidden="true" v-html="ICONS.kaeshi()"></span>
				</button>
				<div class="menu-row">
					<button class="menu-card" type="button" @click="scene = 'map'">
						<span class="menu-mark" aria-hidden="true" v-html="ICONS.chizu()"></span>
						<span class="menu-copy"><b>花仕事</b><small>季節を進める</small></span>
					</button>
					<button class="menu-card" type="button" @click="scene = 'dex'">
						<span class="menu-mark" aria-hidden="true" v-html="ICONS.choumen()"></span>
						<span class="menu-copy"><b>花手帖</b><small>これまでの花</small></span>
					</button>
				</div>
				<button class="menu-card" type="button" @click="startDaily">
					<span class="menu-mark" aria-hidden="true" v-html="ICONS.himekuri()"></span>
					<span class="menu-copy"><b>今日の盤面</b><small>一日に一度、みなで同じ札を</small></span>
					<span class="menu-chev" aria-hidden="true" v-html="ICONS.kaeshi()"></span>
				</button>
				<button class="menu-card" type="button" @click="scene = 'gallery'">
					<span class="menu-mark" aria-hidden="true" v-html="ICONS.yunomi()"></span>
					<span class="menu-copy"><b>花の名鑑</b><small>出会った人</small></span>
					<span class="menu-chev" aria-hidden="true" v-html="ICONS.kaeshi()"></span>
				</button>
				<div class="menu-foot"><button class="text-button" type="button" @click="scene = 'settings'">設定</button></div>
			</nav>
			<dl v-if="saveLoaded" class="daily-stats" aria-label="今日の盤面の記録">
				<div><dt>連続</dt><dd>{{ daily.streak }}</dd></div>
				<div><dt>最長</dt><dd>{{ daily.longest }}</dd></div>
				<div><dt>自己ベスト</dt><dd>{{ daily.best }}</dd></div>
				<div class="stat-dew"><dt><span class="dew-mark" aria-hidden="true" v-html="ICONS.tsuyu()"></span>花の露</dt><dd>{{ daily.freezes }}</dd></div>
			</dl>
			<p v-if="syncWarning" class="save-warning">記録を保存できていません。通信を確認してください。</p>
		</section>

		<!--
		旗鯖fork: 月選び。design/02-meta.dc.html の map() が正本（左の縦罫＋月の丸札＋現在地の輪）。
		⚠️36局を平らに並べると絵巻に見えないので、月ごとに束ねて「局」は札で並べる。
		押したときに呼ぶのは従来どおり startStage(entry)。解放条件は増やしていない。
		-->
		<section v-else-if="scene === 'map'" class="map-shell sheet" aria-labelledby="hanaawase-title">
			<header class="sheet-head">
				<button class="icon-button sheet-back" type="button" aria-label="ホームへ戻る" @click="goHome"><span v-html="ICONS.modoru()"></span></button>
				<p class="eyebrow">花仕事</p>
				<h1 id="hanaawase-title">月選び</h1>
				<p class="sheet-sub">一年の絵巻。上から順に、季節を進めます。</p>
			</header>
			<ol class="stage-map" aria-label="十二ヶ月の絵巻物">
				<li v-for="group in monthGroups" :key="group.month" class="map-month" :data-here="group.month === continueStage.month ? 'on' : null">
					<span class="map-node" aria-hidden="true"><span class="map-flower" v-html="FLOWER_SVGS[group.flower].svg"></span></span>
					<div class="map-body">
						<p class="map-title">
							<b>{{ KANJI_MONTH[group.month] }}</b><small>{{ group.monthName }}</small>
							<em v-if="group.month === continueStage.month">現在地</em>
						</p>
						<div class="map-stages">
							<button
								v-for="entry in group.stages"
								:key="entry.id"
								class="map-chip"
								type="button"
								:data-boss="entry.boss ? 'on' : null"
								@click="startStage(entry)"
							>
								<span class="chip-name">{{ entry.boss ? '障・' + bossName(entry) : stageLabel(entry) }}</span>
								<span class="chip-stars" :aria-label="`星${stageStars(entry)}個`">
									<span v-for="star in 3" :key="star" :data-on="star <= stageStars(entry) ? 'on' : null" aria-hidden="true" v-html="star <= stageStars(entry) ? ICONS.sakura() : ICONS.sakuraOutline()"></span>
								</span>
							</button>
						</div>
					</div>
				</li>
			</ol>
			<div class="map-actions"><button type="button" @click="scene = 'dex'">花手帖</button><button type="button" @click="scene = 'settings'">設定</button></div>
			<p v-if="syncWarning" class="save-warning">記録を保存できていません。通信を確認してください。</p>
		</section>

		<section v-else-if="scene === 'dex'" class="map-shell sheet dex-shell" aria-labelledby="hanaawase-title">
			<header class="sheet-head">
				<button class="icon-button sheet-back" type="button" aria-label="ホームへ戻る" @click="goHome"><span v-html="ICONS.modoru()"></span></button>
				<p class="eyebrow">帳面</p>
				<h1 id="hanaawase-title">花手帖</h1>
				<p class="sheet-sub">咲かせた花が、ここに残ります。</p>
			</header>
			<!--
			旗鯖fork: 札を押すと、その花の覚え書きが下に開く。
			⚠️まだ咲かせていない月は名前も覚え書きも出さない（名前自体が先の月の内容を明かすため）。
			-->
			<div class="dex-grid">
				<button
					v-for="entry in monthEntries"
					:key="entry.month"
					class="dex-cell"
					type="button"
					:data-open="monthCollected(entry.month) ? 'on' : null"
					:aria-pressed="dexPick === entry.month"
					@click="pickDex(entry.month)"
				>
					<span class="dex-art" aria-hidden="true" v-html="FLOWER_SVGS[entry.flower].svg"></span>
					<b>{{ monthCollected(entry.month) ? FLOWER_SVGS[entry.flower].name : 'まだ' }}</b>
					<small>{{ KANJI_MONTH[entry.month] }}</small>
				</button>
			</div>
			<div class="dex-note" aria-live="polite">
				<template v-if="dexNote">
					<h2 class="note-name">{{ dexNote.name }}<small>{{ dexNote.yomi }}</small></h2>
					<p class="note-season">{{ dexNote.month }}・{{ dexNote.season }}</p>
					<p v-for="line in dexNote.text" :key="line" class="note-line">{{ line }}</p>
				</template>
				<p v-else-if="dexPick !== undefined" class="note-line note-quiet">この月は、まだ咲かせていません。</p>
				<p v-else class="note-line note-quiet">札を選ぶと、その花の覚え書きが開きます。</p>
			</div>
			<h2 class="dex-heading">特別な札</h2>
			<ul class="dex-specials">
				<li v-for="item in SPECIAL_NOTES" :key="item.key">
					<span class="special-art" aria-hidden="true" v-html="SPECIAL_SVGS[item.key].svg"></span>
					<span class="special-copy"><b>{{ SPECIAL_SVGS[item.key].name }}</b><small>{{ item.text }}</small></span>
				</li>
			</ul>
			<!--
			旗鯖fork: 通し読み（SPEC §9.75-3。章をまたぐ読み返しは花手帖が担う）。
			⚠️並ぶのは到達済みの場面だけ（seenVignettes）。未読の題もあらすじも出ないのでネタバレしない。
			⚠️ここに「最初から読む」は置かない（§9.75-3: 読み返しと機能を重複させない）。
			-->
			<h2 class="dex-heading">通し読み</h2>
			<p v-if="readableVignettes.length === 0" class="map-intro dex-empty">まだ、読んだ場面はありません。</p>
			<ol v-else class="story-list" aria-label="読んだ場面">
				<li v-for="entry in readableVignettes" :key="entry.id">
					<button type="button" @click="replayVignette(entry)">
						<b>{{ entry.title }}</b><small>{{ entry.month === 0 ? '序章' : `${entry.month}月` }}</small>
					</button>
				</li>
			</ol>
		</section>

		<section v-else-if="scene === 'gallery'" class="map-shell">
			<Gallery :progress="progress" :reducedMotion="gameSettings.motion === 'reduced'" @close="goHome" />
		</section>

		<!--
		旗鯖fork: 設定。design/02-meta.dc.html の settings() が正本（切替は52×28の摘み／選択は札）。
		⚠️素の checkbox / radio は本体テーマの color-scheme をそのまま被り、暗いテーマで潰れる。
		appearance:none で自前に描き、本体テーマに左右されないようにしている（入力要素そのものは残す＝操作性と読み上げは素のまま）。
		-->
		<section v-else-if="scene === 'settings'" class="map-shell sheet settings-shell" aria-labelledby="hanaawase-title">
			<header class="sheet-head">
				<button class="icon-button sheet-back" type="button" aria-label="ホームへ戻る" @click="goHome"><span v-html="ICONS.modoru()"></span></button>
				<p class="eyebrow">帳面</p>
				<h1 id="hanaawase-title">設定</h1>
				<p class="sheet-sub">音と動きの加減を、ここで整えます。</p>
			</header>
			<div class="settings-list">
				<label class="set-row"><span class="set-copy"><b>効果音</b><small>環境音も合わせて止めます。</small></span><span class="set-switch"><input type="checkbox" :checked="gameSettings.se" @change="setSound($event)"><span class="switch-track"><span class="switch-knob"></span></span></span></label>
				<fieldset class="set-row set-choice">
					<legend>アニメーション</legend>
					<span class="set-options">
						<label><input type="radio" name="motion" value="normal" :checked="gameSettings.motion === 'normal'" @change="setMotion('normal')"><span>通常</span></label>
						<label><input type="radio" name="motion" value="reduced" :checked="gameSettings.motion === 'reduced'" @change="setMotion('reduced')"><span>控えめ</span></label>
					</span>
				</fieldset>
				<label class="set-row"><span class="set-copy"><b>ひとことを表示</b><small>待機中の案内表示です。</small></span><span class="set-switch"><input type="checkbox" :checked="gameSettings.barks" @change="setBarks($event)"><span class="switch-track"><span class="switch-knob"></span></span></span></label>
				<label class="set-row"><span class="set-copy"><b>最初のヒントを再表示</b><small>初回の操作案内だけを、もう一度表示します。</small></span><button class="set-button" type="button" @click="resetHints">再表示</button></label>
				<label class="set-row"><span class="set-copy"><b>この作品について</b><small>生成AIの利用と、遊んだ記録の扱いについての開示です。</small></span><button class="set-button" type="button" @click="scene = 'disclaimer'">読む</button></label>
				<p v-if="recoveryAvailable" class="save-warning">以前の記録を復旧用に退避しています。リセット前に保管してください。</p>
				<div class="reset-box" :data-armed="resetStep > 0 ? 'on' : null"><b>進行のリセット</b><p>{{ resetStep === 0 ? 'すべての記録が消えます。戻せません。' : resetStep === 1 ? '本当によろしいですか。もう一度押すと消去します。' : '消去しました。' }}</p><button v-if="resetStep < 2" type="button" @click="confirmReset">{{ resetStep === 0 ? 'リセットする' : '本当に消去する' }}</button></div>
			</div>
		</section>

		<!--
		旗鯖fork: 物語（ビネット）の器。
		⚠️これが無いと Vignette.vue も story/ もどこからも参照されず、ビルド成果物に物語が1文字も入らない
		（実際にその状態で出荷し、「ストーリーが始まらない」と報告された）。ここを消さないこと。
		⚠️描くのはキューの先頭1つだけ。`:key` で場面ごとに作り直し、前の場面の途中状態を持ち越さない。
		-->
		<section v-else-if="scene === 'story'" class="story-shell sheet" aria-label="花常 物語">
			<div v-if="storyInterlude" class="story-interlude" role="status">
				<p>ここで、いちどしおりを挟みます。</p>
				<div>
					<button type="button" @click="continueStory">次の場面を読む</button>
					<button type="button" @click="onStoryDefer">今回は読まない</button>
				</div>
			</div>
			<Vignette
				v-else-if="storyCurrent"
				:key="storyCurrent.id"
				:vignette="storyCurrent"
				:choices="progress.choices"
				:motion="storyMotion"
				@choose="onStoryChoose"
				@finish="onStoryFinish"
				@defer="onStoryDefer"
			/>
		</section>

		<section v-else ref="gameShell" class="game-shell" aria-labelledby="hanaawase-title">
			<header class="game-heading">
				<div>
					<p class="eyebrow">{{ isDaily ? '今日の盤面' : stage.monthName + '・' + (stage.boss ? '季節の障り' : '花仕事') }}</p>
					<h1 id="hanaawase-title">花常</h1>
				</div>
				<button class="icon-button" type="button" aria-label="月の一覧へ戻る" @click="returnToMap">
					<span v-html="ICONS.modoru()"></span>
				</button>
			</header>

			<div class="hud" aria-label="ステージの状況">
				<div class="hud-block">
					<span class="hud-label">残り手数</span>
					<strong>{{ moves }}</strong>
				</div>
				<div v-if="bossState" class="boss-gauge" aria-label="季節ゲージ">
					<span class="hud-label">季節ゲージ</span>
					<strong>{{ bossState.hp }}</strong>
					<small>{{ stage.boss }}</small>
				</div>
				<div v-else-if="isDaily" class="goal-block daily-goal">
					<span v-html="ICONS.sakura()"></span>
					<span>スコアアタック</span>
				</div>
				<div v-else class="goal-block">
					<span class="goal-flower" v-html="FLOWER_SVGS[stage.flower].svg"></span>
					<span><b>{{ goalHave }}</b> / {{ goalNeed }}</span>
				</div>
				<div class="hud-block score-block">
					<span class="hud-label">点</span>
					<strong>{{ score }}</strong>
				</div>
			</div>

			<div v-if="!bossState && !isDaily" class="star-meter" aria-label="星の達成度">
				<!-- ⚠️桜の塗りは図案側で色が決まっているので、達成の差は「塗り／輪郭」で出す（色だけでは変わらない）。 -->
				<span v-for="star in 3" :key="star" :class="{ reached: starReached(star) }" v-html="starReached(star) ? ICONS.sakura() : ICONS.sakuraOutline()"></span>
			</div>

			<p class="instruction">{{ isDaily ? '今日だけの同じ盤面で、点を伸ばします。' : bossState ? '予告された天候に備えながら、季節ゲージを下げます。' : '隣り合う花を入れ替え、今月の花を集めます。' }}</p>
			<!--
			旗鯖fork: 季節の障りの天候レイヤ。⚠️盤面(.board)・HUDより「奥」に置くため z-index は 0 のまま、
			他の要素側に z-index:1 を与えて手前に出している。視認性を損なわないための不変条件。
			-->
			<div v-if="bossState" class="weather" :data-boss="bossState.id" :data-state="weatherState" aria-hidden="true">
				<span v-for="mote in 14" :key="mote" class="weather-mote" :style="`--i:${mote - 1}`"></span>
			</div>
			<div
				ref="boardElement"
				class="board"
				:class="{ busy, paused }"
				:data-boss="bossState?.id"
				role="grid"
				tabindex="0"
				aria-label="花常 一月の盤面"
				@keydown="onKeydown"
			>
				<button
					v-for="(piece, index) in pieces"
					:key="index"
					class="cell"
					:class="{
						selected: isSelected(coordAt(index)),
						cursor: isCursor(coordAt(index)),
						telegraph: bossState?.telegraph?.targets.some((cell) => sameCoord(cell, coordAt(index))),
						puddle: bossState?.effects.puddle.some((cell) => sameCoord(cell, coordAt(index))),
						frozen: bossState?.effects.frozen.some((cell) => sameCoord(cell, coordAt(index))),
						'tanzaku-row': piece.special === 'tanzaku' && piece.axis === 'row',
					}"
					type="button"
					role="gridcell"
					:aria-label="cellLabel(piece, index)"
					:aria-disabled="busy || outcome !== 'playing'"
					@pointerdown="onPointerDown(coordAt(index), $event)"
					@pointerup="onPointerUp(coordAt(index), $event)"
					@pointercancel="pointerStart = undefined"
					@click="onCellClick(coordAt(index))"
				>
					<span class="piece" v-html="pieceSvg(piece)"></span>
				</button>
				<!--
				旗鯖fork: 天候の「手前」レイヤ。奥のレイヤ(.weather / opacity .34)はそのまま残し、
				⚠️駒の判別を損なわない範囲(opacity .05〜.18)で升目の上にも粒だけを薄く流す。
				⚠️.effects(z-index:3)より下の z-index:2 に置き、点数・連鎖の文字を必ず粒より手前に出す。
				-->
				<div
					v-if="bossState && motionOn"
					class="weather weather-over"
					:data-boss="bossState.id"
					:data-state="weatherState"
					aria-hidden="true"
				>
					<span v-for="mote in 14" :key="mote" class="weather-mote" :style="`--i:${mote - 1}`"></span>
				</div>
				<div ref="effects" class="effects" aria-hidden="true"></div>
				<div v-if="activeHint === 'swap' && hintTarget" class="hint-spot" :style="hintSpotStyle" aria-live="polite"><span></span><p>ここを、隣と入れ替えて。</p></div>
			</div>

			<p class="status" aria-live="polite">{{ status }}</p>
			<p v-if="paused" class="pause-note">一時停止中です。Escキーで戻ります。</p>

			<div v-if="outcome !== 'playing' && !resultVeiled" class="result" role="dialog" aria-modal="true" aria-labelledby="result-title">
				<div class="result-card">
					<span class="result-flower" v-html="FLOWER_SVGS[stage.flower].svg"></span>
					<h2 id="result-title">{{ isDaily ? '今日の盤面を、書き終えました。' : outcome === 'clear' ? '今月の花を、整えました。' : 'また、整えましょう。' }}</h2>
					<p v-if="bossState">{{ outcome === 'clear' ? '季節の障りが、静かに去りました。' : `季節ゲージは ${bossState.hp} 残っています。` }}</p>
					<p v-else-if="isDaily">スコア {{ score }}、最大{{ maxChain }}連鎖でした。</p>
					<p v-else>{{ outcome === 'clear' ? `${score}点で${goalName}を集めました。` : `${goalName}は ${goalHave} / ${goalNeed} でした。` }}</p>
					<div class="result-actions"><button v-if="isDaily" class="restart-button" type="button" @click="shareDailyResult">結果を書き記す</button><button class="restart-button" type="button" @click="restart">もう一度</button><button class="secondary-button" type="button" @click="returnToMap">一覧へ戻る</button></div>
				</div>
			</div>
		</section>

		<!--
		旗鯖fork: 街の様子（MachiFeed）は scene の v-if 連鎖の「外」に置く。
		⚠️連鎖の中に入れると盤面へ移った時点でアンマウントされ、たのみごとの受注台帳が消える。
		そのため兄弟として置き、v-show で出し入れする（:active=false で全タイマーが止まる）。
		-->
		<!-- 旗鯖fork: 帳面から街へ移る「中扉」。⚠️MachiFeed 自体は overflow:hidden なので、罫はこの兄弟が持つ。 -->
		<div v-show="scene === 'home'" class="machi-lead" aria-hidden="true"><span class="lead-rule"></span><span class="lead-seal" v-html="FLOWER_SVGS.ume.svg"></span><span class="lead-rule"></span></div>

		<MachiFeed
			v-show="scene === 'home'"
			ref="machiFeed"
			class="home-machi"
			:active="scene === 'home' && pageActive"
			:reducedMotion="gameSettings.motion === 'reduced'"
			@go="onTanomigotoGo"
		/>
	</main>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, nextTick, onActivated, onDeactivated, onMounted, onUnmounted, ref, shallowRef } from "vue";
import { definePage } from "@/page.js";
import * as os from "@/os.js";
import Gallery from "./Gallery.vue";
import MachiFeed from "./MachiFeed.vue";
import Vignette from "./Vignette.vue";
// ⚠️この import が唯一の到達経路。ここを消すと物語がビルドから丸ごと落ちる。
import { pendingVignettes, seenVignettes, withSeen } from "./story/index.js";
import type { ChoiceKey, Vignette as VignetteData } from "./story/index.js";
import type { Tanomigoto } from "./machi-lines.js";
import {
	areAdjacent,
	automaticShuffle,
	createBoard,
	createPiece,
	hasPossibleMove,
	playSwap,
	swap,
} from "./engine.js";
import type { Board, Coord, Flower, Piece, Resolution, ResolutionStep, Special } from "./engine.js";
import { FLOWER_SVGS, SPECIAL_SVGS } from "./flowers.js";
import { ICONS } from "./icons.js";
import { mulberry32 } from "./rng.js";
import {
	playClear,
	playLand,
	playPop,
	playSpecial,
	playSwap as playSwapSound,
	setHanaawaseSoundEnabled,
	unlockSound,
} from "./sound.js";
import { setHanaawaseAmbienceEnabled, startAmbience, stopAmbience } from "./ambience.js";
import { LEVELS } from "./levels.js";
import type { StageDefinition } from "./levels.js";
import {
	advanceBoss,
	applyBossAction,
	applyBossDamage,
	BOSSES,
	bossDamage,
	clearBossEffects,
	createBossState,
	isSwapBlocked,
} from "./bosses.js";
import type { BossAction, BossState } from "./bosses.js";
import { HanaawaseStorage, emptySaveMap } from "./storage.js";
import type { Daily, GameSettings, Progress } from "./storage.js";
import {
	createDailyStage,
	dailyDateFrom,
	formatDailyShareText,
	updateDailyResult,
} from "./daily.js";
import type { DailyStage } from "./daily.js";
import { bustupPath, pickMenuLine } from "./menu-dialogue.js";
import type { PickedLine } from "./menu-dialogue.js";
import type { MenuProg } from "./menu-lines.js";
import { bgPath, pickBackdrop } from "./backdrop.js";
import { prefer } from "@/preferences.js";
// ⚠️本体への追記はゼロ。既にある本体APIを「使うだけ」なのでパージ容易性は損なわない。
import { useRouter } from "@/router.js";

const router = useRouter();

/**
 * 注意書きの版。⚠️開示の内容を書き足したら必ず1つ上げる（既読の人にも読み直してもらうため）。
 * rev 1 = 生成AI・架空・データの扱い の3ブロック。
 */
const DISCLAIMER_REV = 1;

const scene = ref<"disclaimer" | "home" | "map" | "dex" | "gallery" | "settings" | "board" | "story">("home");
const stage = ref<StageDefinition | DailyStage>(LEVELS[0]!);
const storage = new HanaawaseStorage();
const saveLoaded = ref(false);
const progress = ref<Progress>(emptySaveMap().progress);
/** 注意書きを読んでもらう必要があるか。未読の人と、古い版しか読んでいない人の両方が対象。 */
const disclaimerPending = computed(() =>
	!progress.value.disclaimerSeen || progress.value.disclaimerRev < DISCLAIMER_REV);
// ⚠️「一度読んだのに、書き足したので再び出している」人だけ。初回の人には出さない
const disclaimerRevisited = computed(() =>
	progress.value.disclaimerSeen && progress.value.disclaimerRev < DISCLAIMER_REV);
const daily = ref<Daily>(emptySaveMap().daily);
const gameSettings = ref<GameSettings>(emptySaveMap().settings);
const syncWarning = ref(false);
const recoveryAvailable = ref(false);
const resetStep = ref(0);
const activeHint = ref<"swap">();
// 旗鯖fork: 街の様子（たのみごと）。scene の外に置いた MachiFeed への参照と、いま向かっている依頼。
const machiFeed = ref<InstanceType<typeof MachiFeed>>();
const activeTanomigoto = ref<{ qi: number; quest: Tanomigoto }>();
// 旗鯖fork: このページが keep-alive で裏に回っている間は「街の様子」を止める。
// ⚠️これが無いと、花常から他ページへ移っても投稿タイマーが回り続ける（scene は 'home' のまま残るため）。
const pageActive = ref(true);
let removeOnlineRetry: (() => void) | undefined;
const isDaily = computed(() => stage.value.id === "daily");
const currentDailyDate = computed(() => dailyDateFrom());
const activeDailyDate = ref(currentDailyDate.value);
const stageSeed = () => isDaily.value ? 0 : 20260720 + stage.value.month * 10 + Number(stage.value.id.slice(-1));
const goalNeed = computed(() => stage.value.goalNeed ?? 0);
const goalName = computed(() => FLOWER_SVGS[stage.value.flower].name);
const bossName = (entry: StageDefinition) =>
	entry.boss ? BOSSES[entry.boss].name : "";
const stageNumber = (entry: StageDefinition) => entry.id.slice(-1);
const stageStars = (entry: StageDefinition) => progress.value.stars[entry.id] ?? 0;
const continueStage = computed(() => LEVELS.find((entry) => stageStars(entry) < 3) ?? LEVELS[LEVELS.length - 1]!);
const monthEntries = computed(() => LEVELS.filter((entry) => stageNumber(entry) === "1"));
const monthCollected = (month: number) => LEVELS.some((entry) => entry.month === month && stageStars(entry) > 0);

/** 表示用の月名。⚠️「3月」ではなく「三月」。見出しは漢数字で揃える（design/02-meta の MONTHS に合わせる）。 */
const KANJI_MONTH = ["", "一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"] as const;
/** 局の名。⚠️漢語基調で揃えるため算用数字を出さない。 */
const stageLabel = (entry: StageDefinition) => `第${["", "一", "二", "三"][Number(stageNumber(entry))] ?? stageNumber(entry)}局`;

/**
 * 月ごとに束ねた絵巻の行。⚠️並びも中身も LEVELS が正本で、ここは表示の入れ物にすぎない。
 * ⚠️解放条件は増やしていない（従来どおりどの局からでも startStage できる）。
 */
const monthGroups = computed(() =>
	monthEntries.value.map((head) => ({
		month: head.month,
		monthName: head.monthName,
		flower: head.flower,
		stages: LEVELS.filter((entry) => entry.month === head.month),
	})));

/**
 * 花手帖の覚え書き。⚠️本体の locale を使わずここに閉じる（パージ容易性）。
 * ⚠️物語の設定を足さない。季節と扱いだけを書く。
 */
const FLOWER_NOTES: Record<Flower, { yomi: string; season: string; text: readonly string[] }> = {
	matsu: { yomi: "まつ", season: "歳寒の枝もの", text: ["常緑の針葉樹。寒中でも葉の色を落とさないことから、年始の飾りに欠かせない。", "枝の向きひとつで印象が変わる。睦月の札に据えている。"] },
	ume: { yomi: "うめ", season: "早春の花", text: ["葉に先だって咲く。香りが高く、寒気の残るうちに開く。", "紅梅と白梅で趣が異なる。如月の札に据えている。"] },
	sakura: { yomi: "さくら", season: "春の盛り", text: ["春の盛りに一斉に開き、短い日数で散る。", "花期が読みにくく、仕入れの見立てが難しい。弥生の札に据えている。"] },
	ajisai: { yomi: "あじさい", season: "梅雨の花", text: ["梅雨のころ、手毬の形に花をつける。土の性質で色が移ろう。", "水の上がりが早く、切り口の手当てが要る。水無月の札に据えている。"] },
	himawari: { yomi: "ひまわり", season: "盛夏の花", text: ["盛夏に大輪を上げる。茎が太く、丈が高い。", "日保ちは短いが、店先がひとところ明るくなる。文月の札に据えている。"] },
	kiku: { yomi: "きく", season: "秋の花", text: ["秋の代表。花保ちがよく、供花にも祝いにも用いる。", "輪の大きさで格が変わる。長月の札に据えている。"] },
};

/** 特別な札の覚え書き。⚠️engine.ts の specialFor / specialTargets の実装と一致させること。 */
const SPECIAL_NOTES = [
	{ key: "tanzaku", text: "四枚を一列に揃えると生まれる。動かすと、通った筋をひと息に払う。" },
	{ key: "mari", text: "かぎ形に揃えると生まれる。動かすと、まわりの八枚を巻き込む。" },
	{ key: "tsuki", text: "五枚を一列に揃えると生まれる。隣の花と入れ替えると、盤上のその花をすべて摘む。" },
] as const satisfies readonly { key: Special; text: string }[];

/** 花手帖でいま開いている月。⚠️咲かせていない月は覚え書きを出さない（先の月の花名を明かさないため）。 */
const dexPick = ref<number>();
const pickDex = (month: number) => { dexPick.value = dexPick.value === month ? undefined : month; };
const dexNote = computed(() => {
	const month = dexPick.value;
	if (month === undefined || !monthCollected(month)) return undefined;
	const entry = monthEntries.value.find((item) => item.month === month);
	if (!entry) return undefined;
	const note = FLOWER_NOTES[entry.flower];
	return { name: FLOWER_SVGS[entry.flower].name, yomi: note.yomi, month: KANJI_MONTH[month], season: note.season, text: note.text };
});
const sameCoord = (left: Coord, right: Coord) =>
	left.row === right.row && left.col === right.col;
const flatBoard = (board: Board) =>
	board.flatMap((row) => row.filter((piece): piece is Piece => piece !== null));
const hintTarget = computed<Coord | undefined>(() => {
	if (activeHint.value !== "swap") return undefined;
	for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
		for (const delta of [{ row: 0, col: 1 }, { row: 1, col: 0 }]) {
			const to = { row: row + delta.row, col: col + delta.col };
			if (to.row >= 8 || to.col >= 8) continue;
			if (playSwap(board.value, { row, col }, to, stage.value.colors, mulberry32(0)).accepted) return { row, col };
		}
	}
	return undefined;
});
const hintSpotStyle = computed(() => hintTarget.value ? {
	"--hint-left": `${((hintTarget.value.col + 0.5) / 8) * 100}%`,
	"--hint-top": `${((hintTarget.value.row + 0.5) / 8) * 100}%`,
} : {});

let random = mulberry32(stageSeed());
let releaseTimer: number | undefined;
const initialBoard = (): Board =>
	stage.value.boardPreset
		? stage.value.boardPreset.map((row) => row.map((flower) => createPiece(flower)))
		: createBoard(8, 8, stage.value.colors, random);
const board = ref<Board>(initialBoard());
const selected = ref<Coord>();
const cursor = ref<Coord>({ row: 0, col: 0 });
// 旗鯖fork: キーボード操作を始めるまでカーソル枠を描かない（左上のセルに常時枠が出ていた）。
const cursorVisible = ref(false);
const moves = ref(stage.value.moves);
const score = ref(0);
const maxChain = ref(1);
/** この局で実際に成立した手数。0なら「まだ何も進んでいない」＝離脱しても失うものが無い。 */
const movesMade = ref(0);
const goalHave = ref(0);
const busy = ref(false);
const paused = ref(false);
const outcome = ref<"playing" | "clear" | "failed">("playing");
const status = ref(`${goalName.value}を${goalNeed.value}枚集めましょう。`);
const bossState = ref<BossState>();
const pointerStart = ref<{ coord: Coord; x: number; y: number }>();
const suppressClick = ref(false);
const gameShell = ref<HTMLElement>();
const boardElement = ref<HTMLElement>();
const effects = ref<HTMLElement>();
let queuedMove: Readonly<{ from: Coord; to: Coord }> | undefined;
let effectTimers = new Set<number>();
// 旗鯖fork: 連鎖カスケードの再生。世代カウンタで「途中でやめた再生」の残タイマーを無効化する。
// ⚠️restart()/leaveBoard() で必ず stopReplay() を通すこと（通さないと古い step の盤面が後から降ってくる）。
let replayGeneration = 0;
let replaying = false;
let shakeToken = 0;
let weatherToken = 0;
/** 演出専用の乱数。⚠️ゲームの決定性ストリーム（random）とは絶対に混ぜない。 */
let decorRandom = mulberry32((stageSeed() ^ 0x5f3a7c1d) >>> 0);
/** 撃破シーケンスの「溜め」の間だけ結果カードを伏せる。保存自体は finishStage で即座に走る。 */
const resultVeiled = ref(false);
const weatherState = ref<"idle" | "surge" | "flinch" | "drain" | "release">("idle");
const CHAIN_KANJI = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"] as const;

const pieces = computed(() => flatBoard(board.value));
const coordAt = (index: number): Coord => ({
	row: Math.floor(index / 8),
	col: index % 8,
});
const isSelected = (coord: Coord) =>
	selected.value !== undefined && sameCoord(selected.value, coord);
const isCursor = (coord: Coord) => cursorVisible.value && sameCoord(cursor.value, coord);
const starReached = (star: number) =>
	goalHave.value >= goalNeed.value &&
	score.value >= (stage.value.starScores[star - 1] ?? Number.POSITIVE_INFINITY);
const cellLabel = (piece: Piece, index: number) =>
	`${piece.special ? `${SPECIAL_SVGS[piece.special].name}の` : ""}${FLOWER_SVGS[piece.flower].name}、${Math.floor(index / 8) + 1}行${(index % 8) + 1}列`;
const pieceSvg = (piece: Piece) =>
	piece.special
		? SPECIAL_SVGS[piece.special].svg
		: FLOWER_SVGS[piece.flower].svg;
const motionEnabled = () =>
	gameSettings.value.motion === "normal" && prefer.s.animation &&
	!window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const motionOn = computed(() => motionEnabled());

function after(delay: number, callback: () => void) {
	const timer = window.setTimeout(() => {
		effectTimers.delete(timer);
		callback();
	}, delay);
	effectTimers.add(timer);
}

// 旗鯖fork: このSFCは scoped なので、CSSセレクタは data-v-* 付きへ書き換えられる。
// ⚠️生DOMで append した粒子には自動で付かないため、テンプレート要素から拾って自分で刻む。
let scopeAttribute: string | undefined;

function tagScope<T extends HTMLElement>(node: T): T {
	// ⚠️取得できなかったときはキャッシュしない。null を焼き付けると以後ずっと再解決されず、
	//    演出CSSが1つも当たらなくなる（＝盤面いっぱいの巨大な模様が出る不具合の再発）。
	if (!scopeAttribute) {
		scopeAttribute = gameShell.value?.getAttributeNames().find((name) => name.startsWith("data-v-"));
	}
	const attribute = scopeAttribute;
	if (!attribute) return node;
	node.setAttribute(attribute, "");
	node.querySelectorAll("*").forEach((child) => child.setAttribute(attribute, ""));
	return node;
}

// 旗鯖fork: 一言メッセージが次の手まで残らないよう、書き換えごとに世代を進めて自動で消す。
// タイマーは after() 経由なので effectTimers に載り、unmount で一括解除される。
let statusGeneration = 0;

function setStatus(text: string, autoClear = false) {
	status.value = text;
	statusGeneration += 1;
	if (!autoClear) return;
	const generation = statusGeneration;
	after(2500, () => {
		if (statusGeneration === generation) status.value = "";
	});
}

/**
 * 進行中＝結果が出ておらず、かつこの局で1手以上打っている状態。
 * ⚠️`outcome !== "playing"` の側は外さないこと。撃破演出の溜め（resultVeiled で結果カードを
 * 980ms伏せている間）は finishStage 済みで outcome が "clear" になっており、この条件があるおかげで
 * 「もう勝っているのに『この局をやめますか』で引き留められる」事故が起きない。
 */
const boardInProgress = () => outcome.value === "playing" && movesMade.value > 0;

// --- メニューのキャラ演出（立ち絵＋吹き出し）と適応背景 ---
const menuLine = ref<PickedLine>();
const bustupOk = ref(false);
const homeBg = ref<string>();
// 画像が無い組み合わせを覚えて、再訪のたびに404を撃たないようにする。
const failedBustups = new Set<string>();
const failedBackdrops = new Set<string>();
/** 花仕事のいま向き合っている月。セリフ・背景の季節文脈に使う。 */
const menuMonth = computed(() => continueStage.value.month);
const menuProg = computed<MenuProg>(() => {
	const cleared = LEVELS.filter((entry) => stageStars(entry) > 0).length;
	const ratio = LEVELS.length === 0 ? 0 : cleared / LEVELS.length;
	return ratio < 1 / 3 ? "early" : ratio < 2 / 3 ? "mid" : "late";
});

function refreshMenuLine() {
	// ⚠️Math.random は使わない。seed は Date.now()（同seed+同文脈なら同結果）。
	const picked = pickMenuLine(
		{ now: new Date(), month: menuMonth.value, prog: menuProg.value },
		Date.now(),
		menuLine.value?.line.t,
	);
	if (!picked) return;
	menuLine.value = picked;
	bustupOk.value = !failedBustups.has(bustupPath(picked.char, picked.line.face));
}

function onBustupError() {
	const current = menuLine.value;
	if (current) failedBustups.add(bustupPath(current.char, current.line.face));
	bustupOk.value = false;
}

function refreshBackdrop() {
	const picked = pickBackdrop({ now: new Date(), month: menuMonth.value, loc: "shop" });
	// css:true（id=null）はCSS地のまま。PNGが未生成のIDは読み込み失敗で静かにCSS地へ落とす。
	const url = picked.css || picked.id === null ? undefined : bgPath(picked.id);
	homeBg.value = url !== undefined && !failedBackdrops.has(url) ? url : undefined;
}

function onBackdropError() {
	if (homeBg.value !== undefined) failedBackdrops.add(homeBg.value);
	homeBg.value = undefined;
}

// --- 物語（ビネット）の配線 -------------------------------------------------
//
// 発火の考え方（story/index.ts の設計に合わせる）:
//   解放判定は「イベント」ではなく `progress` からの純関数（isUnlocked）。だから
//   途中で離脱しても取りこぼさず、どの合図で拾い直しても同じ結果になる。
//   ⚠️ここでは「いつ画面に出すか」だけを決める。解放条件そのものは story/ 側にある。
//
//   month-open / stage-clear / boss-after / month-close … 盤面を離れた直後・ホーム到着時にまとめて出す
//   boss-before                                          … その盤面へ入る直前だけ（下記 startStage）
//
// ⚠️`finishStage()` は触っていない（保存・たのみごと報告の順序は不変）。
// 物語は「結果カードを閉じて盤面を離れる」ところから始まるので、撃破演出(resultVeiled 980ms)と
// 結果カードのあと、という順序が構造的に保証される。

/** 物語のあと、どこへ戻るか。"board" は boss-before のあと盤面へ入る場合。 */
type StoryReturn = "home" | "map" | "dex" | "board";
// ⚠️shallowRef。ref だと約9万字の本文まで再帰的にリアクティブ化されて重くなるうえ、
//   本文は読み取り専用データなので深い監視に意味がない。
const storyQueue = shallowRef<readonly VignetteData[]>([]);
const storyCurrent = computed<VignetteData | undefined>(() => storyQueue.value[0]);
const storyReturn = ref<StoryReturn>("home");
/** 同一セッションで「今回は読まない」を選んだ場面。保存しないので次回は未読として再提示できる。 */
const deferredVignetteIds = new Set<string>();
/** 連続する場面の間に置く、月替わりのひと呼吸。 */
const storyInterlude = ref(false);
/** boss-before のあとに入る盤面。⚠️リアクティブにしない（描画に関係しない一時値）。 */
let storyThenStage: StageDefinition | undefined;
/** 演出の強さ。ゲーム設定と本体設定の両方を尊重する（prefers-reduced-motion は Vignette 側が見る）。 */
const storyMotion = computed<"normal" | "reduced">(() =>
	gameSettings.value.motion === "reduced" || !prefer.s.animation ? "reduced" : "normal");
/** 通し読みに並べるもの。⚠️到達済みだけ＝未読はネタバレしない。 */
const readableVignettes = computed(() => seenVignettes(progress.value));

/** その盤面に入る直前に出すもの（＝まだ見ていない boss-before）。 */
const bossBeforeFor = (stageId: string) => pendingVignettes(progress.value)
	.filter((entry) => entry.trigger.at === "boss-before" && entry.trigger.stageId === stageId
		&& !deferredVignetteIds.has(entry.id));

/**
 * いま出せる物語をまとめて再生する。出すものが無ければ false（画面は動かさない）。
 * ⚠️boss-before はここでは出さない（盤面に入る直前まで取っておく）。
 * ⚠️注意書きが未読のうちは何も出さない（開示より先に本編を見せない）。
 */
function playPendingStory(returnTo: StoryReturn): boolean {
	if (!saveLoaded.value || disclaimerPending.value) return false;
	const queue = pendingVignettes(progress.value)
		.filter((entry) => entry.trigger.at !== "boss-before" && !deferredVignetteIds.has(entry.id));
	if (queue.length === 0) return false;
	storyThenStage = undefined;
	storyQueue.value = queue;
	storyReturn.value = returnTo;
	storyInterlude.value = false;
	scene.value = "story";
	return true;
}

/** 既読に加える。⚠️スキップした場面も「到達した」として加える（通し読みから読み返せる）。 */
function markVignetteSeen(id: string) {
	if (progress.value.vignettesSeen.includes(id)) return;
	// updateProgress は progress.value を同期で差し替えるので、直後の pendingVignettes に即反映される。
	void updateProgress({ ...progress.value, vignettesSeen: withSeen(progress.value.vignettesSeen, id) });
}

function onStoryChoose(payload: { choiceId: string; key: ChoiceKey }) {
	if (progress.value.choices[payload.choiceId] === payload.key) return;
	void updateProgress({
		...progress.value,
		choices: { ...progress.value.choices, [payload.choiceId]: payload.key },
	});
}

function returnFromStory() {
	const target = storyReturn.value;
	const nextStage = storyThenStage;
	storyThenStage = undefined;
	storyInterlude.value = false;
	if (target === "board" && nextStage) { enterBoard(nextStage); return; }
	if (target === "map") { scene.value = "map"; return; }
	if (target === "dex") { scene.value = "dex"; return; }
	goHome();
}

function onStoryFinish(id: string) {
	markVignetteSeen(id);
	const rest = storyQueue.value.slice(1);
	storyQueue.value = rest;
	if (rest.length > 0) {
		// 月替わりや起動直後の複数場面を一息で流さない。既読にした現在の場面だけは戻らない。
		storyInterlude.value = true;
		return;
	}
	returnFromStory();
}

/** 未読のまま今回だけ保留する。保存しないので次セッションでは自然に再提示される。 */
function onStoryDefer() {
	for (const entry of storyQueue.value) deferredVignetteIds.add(entry.id);
	storyQueue.value = [];
	returnFromStory();
}

function continueStory() {
	storyInterlude.value = false;
}

/** 通し読みから1場面だけ読み返す。⚠️既読なので既読管理も進行も動かない。 */
function replayVignette(entry: VignetteData) {
	storyThenStage = undefined;
	storyQueue.value = [entry];
	storyReturn.value = "dex";
	storyInterlude.value = false;
	scene.value = "story";
}

/** ホームへ戻る。戻るたびにその時刻・季節の演出を選び直す。 */
function goHome() {
	stopAmbience();
	scene.value = "home";
	refreshMenuLine();
	refreshBackdrop();
	// ⚠️取りこぼしの受け皿。どの経路でホームに戻っても、溜まっている物語がここで必ず出る。
	playPendingStory("home");
}

function replayClass(element: HTMLElement | undefined, name: string, duration: number) {
	if (!element || !motionEnabled()) return;
	element.classList.remove(name);
	void element.offsetWidth;
	element.classList.add(name);
	after(duration, () => element.classList.remove(name));
}

const cellLeft = (col: number) => `${((col + 0.5) / 8) * 100}%`;
const cellTop = (row: number) => `${((row + 0.5) / 8) * 100}%`;
/** 落下距離に比例した落下時間。⚠️長くなりすぎないよう5マスで頭打ちにする。 */
const dropDuration = (drop: number) => 90 + Math.min(drop, 5) * 22;

/** 消えたマスを4近傍で束ね、大きい塊から順に返す。花びらを「マッチ列ごとに1クラスタ」へ集約するために使う。 */
function clusterCells(cells: readonly Coord[]): Coord[][] {
	const indexOf = (cell: Coord) => cell.row * 8 + cell.col;
	const remaining = new Map(cells.map((cell) => [indexOf(cell), cell]));
	const groups: Coord[][] = [];
	for (const start of cells) {
		if (!remaining.has(indexOf(start))) continue;
		remaining.delete(indexOf(start));
		const group: Coord[] = [];
		const queue: Coord[] = [start];
		while (queue.length) {
			const current = queue.shift();
			if (!current) break;
			group.push(current);
			for (const delta of [{ row: 1, col: 0 }, { row: -1, col: 0 }, { row: 0, col: 1 }, { row: 0, col: -1 }]) {
				const neighbour = { row: current.row + delta.row, col: current.col + delta.col };
				const found = remaining.get(indexOf(neighbour));
				if (!found) continue;
				remaining.delete(indexOf(neighbour));
				queue.push(found);
			}
		}
		groups.push(group);
	}
	return groups.sort((left, right) => right.length - left.length);
}

/** ⚠️強度は3〜5の3段階だけ。data-shake の属性セレクタでCSS側が振幅を切り替える。 */
function shakeShell(level: number) {
	const shell = gameShell.value;
	if (!shell || !motionEnabled()) return;
	shell.removeAttribute("data-shake");
	void shell.offsetWidth;
	shell.dataset.shake = `${Math.max(2, Math.min(5, Math.round(level)))}`;
	const token = ++shakeToken;
	after(190, () => {
		if (shakeToken === token) shell.removeAttribute("data-shake");
	});
}

/** ⚠️90ms上限。白幕は使わず、演出アニメの一時停止＋盤面のごく浅い縮みだけで「打点」を作る。 */
function hitStop(duration = 90) {
	replayClass(gameShell.value, "hit-stop", Math.min(90, duration));
}

/** 天候レイヤの一時状態。⚠️必ず idle へ戻す（戻さないと荒天が居座る）。 */
function weatherPulse(state: "surge" | "flinch" | "drain" | "release", duration: number) {
	if (!bossState.value || !motionEnabled()) return;
	weatherState.value = state;
	const token = ++weatherToken;
	after(duration, () => {
		if (weatherToken === token) weatherState.value = "idle";
	});
}

function showChainReadout(cascade: number) {
	const layer = effects.value;
	if (!layer) return;
	const node = window.document.createElement("div");
	node.className = "effect-chain";
	node.textContent = `${CHAIN_KANJI[Math.min(cascade, 10)] ?? `${cascade}`}連`;
	layer.append(tagScope(node));
	after(940, () => node.remove());
}

/** 1段ぶんの消滅演出。⚠️step.removed は {at, piece} なので、2段目以降の駒も正しい図案で描ける。 */
function showRemoval(step: ResolutionStep) {
	const layer = effects.value;
	if (!layer || !motionEnabled()) return;
	// ⚠️無天井だと5連鎖で1.4倍まで膨らんで盤面が模様で埋まる。+0.05/段・上限1.2で抑える。
	const scale = 1 + Math.min(0.2, Math.max(0, step.cascade - 1) * 0.05);
	for (const [index, entry] of step.removed.slice(0, 16).entries()) {
		const burst = window.document.createElement("div");
		burst.className = "effect-burst";
		burst.style.left = cellLeft(entry.at.col);
		burst.style.top = cellTop(entry.at.row);
		burst.style.setProperty("--scale", `${scale}`);
		burst.style.setProperty("--delay", `${(index % 5) * 16}ms`);
		burst.innerHTML = `<span class="effect-ring"></span><span class="effect-pop">${pieceSvg(entry.piece)}</span>`;
		layer.append(tagScope(burst));
		after(560, () => burst.remove());
	}
	const groups = clusterCells(step.removed.map((entry) => entry.at)).slice(0, 4);
	for (const [groupIndex, group] of groups.entries()) {
		const head = group[0];
		if (!head) continue;
		const source = step.removed.find((entry) => entry.at.row === head.row && entry.at.col === head.col);
		if (!source) continue;
		const centerCol = group.reduce((total, cell) => total + cell.col, 0) / group.length;
		const centerRow = group.reduce((total, cell) => total + cell.row, 0) / group.length;
		const cluster = window.document.createElement("div");
		cluster.className = "effect-cluster";
		cluster.style.left = cellLeft(centerCol);
		cluster.style.top = cellTop(centerRow);
		const count = 5 + (groupIndex % 2);
		for (let petal = 0; petal < count; petal++) {
			const leaf = window.document.createElement("span");
			leaf.className = "effect-petal";
			const angle = (petal / count) * Math.PI * 2 + decorRandom() * 0.8;
			const reach = 20 + decorRandom() * 22;
			leaf.style.setProperty("--x", `${Math.round(Math.cos(angle) * reach)}px`);
			leaf.style.setProperty("--y", `${Math.round(Math.sin(angle) * reach - 16)}px`);
			leaf.style.setProperty("--r", `${Math.round(decorRandom() * 320 - 160)}deg`);
			leaf.style.setProperty("--delay", `${petal * 16}ms`);
			leaf.innerHTML = FLOWER_SVGS[source.piece.flower].petal;
			cluster.append(leaf);
		}
		layer.append(tagScope(cluster));
		after(900, () => cluster.remove());
	}
	const lead = groups[0];
	if (lead && lead[0] && step.gained > 0) {
		const centerCol = lead.reduce((total, cell) => total + cell.col, 0) / lead.length;
		const centerRow = lead.reduce((total, cell) => total + cell.row, 0) / lead.length;
		const spot = window.document.createElement("div");
		spot.className = "effect-score-spot";
		spot.style.left = cellLeft(centerCol);
		spot.style.top = cellTop(centerRow);
		spot.style.setProperty("--scale", `${scale}`);
		spot.innerHTML = `<span class="effect-score">+${Math.round(step.gained)}</span>`;
		layer.append(tagScope(spot));
		after(560, () => spot.remove());
	}
	if (step.cascade >= 2) showChainReadout(step.cascade);
	// ⚠️シェイクは3連以上だけ。2連で揺らすと毎手ざわつく。
	if (step.cascade >= 3) shakeShell(step.cascade);
	playPop(step.cascade);
}

function showSpawn(at: Coord, kind: "tanzaku" | "mari" | "tsuki") {
	const layer = effects.value;
	if (!layer || !motionEnabled()) return;
	const node = window.document.createElement("div");
	node.className = "effect-spawn";
	node.dataset.kind = kind;
	node.style.left = cellLeft(at.col);
	node.style.top = cellTop(at.row);
	node.innerHTML = `<span>${SPECIAL_SVGS[kind].svg}</span>`;
	layer.append(tagScope(node));
	after(680, () => node.remove());
	playSpecial(kind);
}

/** 差し替え直後にFLIPの初期位置を置く。⚠️drop===0 のセルには一切触らない（不動の駒を跳ねさせない）。 */
function applyDrops(drops: readonly (readonly number[])[]) {
	const boardEl = boardElement.value;
	if (!boardEl || !motionEnabled()) return;
	const cells = boardEl.querySelectorAll<HTMLElement>(".cell");
	const first = cells[0];
	const below = cells[8];
	if (!first || !below) return;
	const pitch = below.offsetTop - first.offsetTop;
	if (pitch <= 0) return;
	const moving: HTMLElement[] = [];
	for (let index = 0; index < cells.length; index++) {
		const cell = cells[index];
		if (!cell) continue;
		cell.removeAttribute("data-land");
		const drop = drops[Math.floor(index / 8)]?.[index % 8] ?? 0;
		if (drop <= 0) {
			cell.removeAttribute("data-drop");
			continue;
		}
		cell.style.setProperty("--drop-y", `${-drop * pitch}px`);
		cell.style.setProperty("--drop-dur", `${dropDuration(drop)}ms`);
		cell.dataset.drop = "pre";
		moving.push(cell);
	}
	if (!moving.length) return;
	void boardEl.offsetWidth;
	for (const cell of moving) cell.dataset.drop = "fall";
}

/**
 * 落下時間が同じ駒をひとまとめにするための段位。
 * ⚠️dropDuration が5マスで頭打ちなので、6マス以上は5と同じ段位＝1段あたり最大5グループに収まる。
 */
const dropTier = (drop: number) => Math.min(drop, 5);

/** その段に現れる落下段位を、近い順（＝着地が早い順）に返す。 */
function dropTiers(drops: readonly (readonly number[])[]): number[] {
	const tiers = new Set<number>();
	for (const row of drops) for (const drop of row) if (drop > 0) tiers.add(dropTier(drop));
	return [...tiers].sort((left, right) => left - right);
}

/**
 * 落ちた駒だけに着地スカッシュを付ける。⚠️動いていない駒まで揺らすと盤面がざわつく。
 * ⚠️同じ段位の駒だけを対象にする。段の最大距離で一括発火すると、1マスだけ落ちた駒が
 * 最大90ms待たされてから跳ねる（落ちきった駒が止まったまま遅れて跳ねる違和感の原因）。
 */
function landDrops(drops: readonly (readonly number[])[], tier: number, withSound: boolean) {
	const boardEl = boardElement.value;
	if (!boardEl || !motionEnabled()) return;
	const cells = boardEl.querySelectorAll<HTMLElement>(".cell");
	let landed = false;
	for (let index = 0; index < cells.length; index++) {
		const cell = cells[index];
		if (!cell) continue;
		const drop = drops[Math.floor(index / 8)]?.[index % 8] ?? 0;
		if (drop <= 0 || dropTier(drop) !== tier) continue;
		// ⚠️まだ落下中の段位のセルには触らない（data-drop を剥がすと落下がその場で切れる）。
		cell.removeAttribute("data-drop");
		cell.dataset.land = "1";
		landed = true;
	}
	// ⚠️音は最初に着地した段位でだけ鳴らす（段位ごとに鳴らすと1手で最大5回重なる）。
	if (landed && withSound) playLand();
}

function clearDropAttributes() {
	const boardEl = boardElement.value;
	if (!boardEl) return;
	boardEl.querySelectorAll<HTMLElement>(".cell").forEach((cell) => {
		cell.removeAttribute("data-drop");
		cell.removeAttribute("data-land");
	});
}

/** 再生中のタイマーをすべて無効化する。⚠️盤面を作り直す前に必ず通す。 */
function stopReplay() {
	replayGeneration += 1;
	replaying = false;
	weatherState.value = "idle";
	clearDropAttributes();
}

/**
 * 連鎖を段ごとに再生する。段の内訳は
 * 消滅(0ms) → 盤面差し替え＋落下開始(120ms) → 着地(120+落下時間) → 次段(+段間ウェイト)。
 * ⚠️段が進むほど段間を詰めて加速感を出す。
 */
function playResolution(resolution: Resolution, done: () => void) {
	const generation = ++replayGeneration;
	const alive = () => replayGeneration === generation;
	let cursorMs = 0;
	for (const step of resolution.steps) {
		const at = cursorMs;
		const spawn = step.spawn;
		const detonated = step.detonated[0];
		const maxDrop = step.drops.reduce(
			(top, row) => row.reduce((inner, drop) => Math.max(inner, drop), top),
			0,
		);
		const fall = dropDuration(maxDrop);
		// ⚠️180〜260msの段間から、段が上がるごとに20msずつ削る（下限50ms＋落下時間で体感180ms前後）。
		const gap = Math.max(50, 110 - (step.cascade - 1) * 20);
		const stall = detonated ? 90 : 0;
		after(at, () => {
			if (!alive()) return;
			if (detonated) {
				hitStop(90);
				playSpecial(detonated);
			}
			showRemoval(step);
		});
		if (spawn?.piece.special) {
			const kind = spawn.piece.special;
			after(at + 90 + stall, () => {
				if (alive()) showSpawn(spawn.at, kind);
			});
		}
		after(at + 120 + stall, () => {
			if (!alive()) return;
			board.value = step.board;
			// DOMが差し替わってからでないとFLIPの初期位置が古い駒に付く。
			void nextTick().then(() => {
				if (alive()) applyDrops(step.drops);
			});
		});
		// ⚠️着地は落下距離ごとに分けて発火する。タイマーは段あたり最大5本（dropTier の頭打ちによる）で、
		// すべて after() 経由なので effectTimers に載り、unmount で一括解除される。
		const tiers = dropTiers(step.drops);
		for (const [tierIndex, tier] of tiers.entries()) {
			after(at + 130 + stall + dropDuration(tier), () => {
				if (alive()) landDrops(step.drops, tier, tierIndex === 0);
			});
		}
		// data-drop / data-land の後始末は最後の着地のあとに1回だけ。⚠️従来と同じ「最終着地+150ms」を保つ。
		if (tiers.length > 0) {
			after(at + 130 + stall + fall + 150, () => {
				if (alive()) clearDropAttributes();
			});
		}
		cursorMs = at + 120 + stall + fall + gap;
	}
	after(cursorMs + 20, () => {
		if (alive()) done();
	});
}

function bossActionBurst(action: BossAction) {
	weatherPulse("surge", 560);
	if (!motionEnabled()) return;
	const layer = effects.value;
	if (layer) {
		for (const [index, target] of action.targets.slice(0, 10).entries()) {
			const node = window.document.createElement("div");
			node.className = "effect-boss";
			node.style.left = cellLeft(target.col);
			node.style.top = cellTop(target.row);
			node.style.setProperty("--delay", `${index * 26}ms`);
			layer.append(tagScope(node));
			after(640, () => node.remove());
		}
	}
	shakeShell(2);
	playSpecial("mari");
}

/** 撃破の山場。ヒットストップ90ms → 無音の溜め260ms → 光と最大音の同時開放 → 花弁が舞う。 */
function playBossDefeat() {
	if (!motionEnabled()) {
		playClear();
		return;
	}
	resultVeiled.value = true;
	hitStop(90);
	weatherPulse("drain", 350);
	after(350, () => {
		weatherPulse("release", 640);
		playClear();
		shakeShell(3);
		releaseDefeatLight();
	});
	after(980, () => {
		resultVeiled.value = false;
	});
}

function releaseDefeatLight() {
	const shell = gameShell.value;
	if (!shell) return;
	const veil = window.document.createElement("div");
	veil.className = "defeat-veil";
	shell.append(tagScope(veil));
	after(700, () => veil.remove());
	const layer = window.document.createElement("div");
	layer.className = "defeat-petals";
	// ⚠️椿の新規SVGは作らない。梅の花弁（朱・丸弁）を流用する。
	for (let index = 0; index < 18; index++) {
		const leaf = window.document.createElement("span");
		leaf.className = "defeat-petal";
		leaf.style.left = `${Math.round(decorRandom() * 100)}%`;
		leaf.style.setProperty("--sway", `${Math.round(decorRandom() * 90 - 45)}px`);
		leaf.style.setProperty("--spin", `${Math.round(decorRandom() * 700 - 350)}deg`);
		leaf.style.setProperty("--dur", `${1700 + Math.round(decorRandom() * 900)}ms`);
		leaf.style.setProperty("--delay", `${Math.round(decorRandom() * 520)}ms`);
		leaf.style.setProperty("--size", `${13 + Math.round(decorRandom() * 10)}px`);
		leaf.innerHTML = FLOWER_SVGS.ume.petal;
		layer.append(leaf);
	}
	shell.append(tagScope(layer));
	after(3000, () => layer.remove());
}

async function saveBoundary(cleared: boolean) {
	if (isDaily.value) {
		if (cleared) await saveDailyResult();
		return;
	}
	const currentStage = stage.value as StageDefinition;
	const earnedStars = !cleared ? 0 : currentStage.boss
		? 3
		: currentStage.starScores.filter((threshold) => score.value >= threshold).length;
	const current = stageStars(currentStage);
	const stars = earnedStars > current
		? { ...progress.value.stars, [currentStage.id]: earnedStars as 1 | 2 | 3 }
		: progress.value.stars;
	progress.value = { ...progress.value, stars };
	await storage.save("progress", progress.value);
	// 1回のqueuedでは警告しない。storage側の「3回連続で失敗」判定に一本化する。
	syncWarning.value = storage.shouldShowWarning();
}

async function saveDailyResult() {
	const next = updateDailyResult(daily.value, activeDailyDate.value, score.value);
	daily.value = next;
	await storage.save("daily", next);
	// 1回のqueuedでは警告しない。storage側の「3回連続で失敗」判定に一本化する。
	syncWarning.value = storage.shouldShowWarning();
}

async function updateProgress(next: Progress) {
	progress.value = next;
	await storage.save("progress", next);
	// 1回のqueuedでは警告しない。storage側の「3回連続で失敗」判定に一本化する。
	syncWarning.value = storage.shouldShowWarning();
}

function rememberHint(id: string) {
	if (progress.value.hintsSeen.includes(id)) return false;
	void updateProgress({ ...progress.value, hintsSeen: [...progress.value.hintsSeen, id] });
	return true;
}

function showInitialHint() {
	activeHint.value = stage.value.id === "m1-1" && !progress.value.hintsSeen.includes("swap") ? "swap" : undefined;
}

async function acceptDisclaimer() {
	// ⚠️既読でも版が古ければ書き戻す（そうしないと次の起動でまた出る）。
	if (disclaimerPending.value) {
		await updateProgress({ ...progress.value, disclaimerSeen: true, disclaimerRev: DISCLAIMER_REV });
	}
	goHome();
}

/*
⚠️window.location.assign はアプリ全体を再読み込みする。
  ウィンドウモード（MkPageWindow）で開いていると、開いている他の窓ごと吹き飛ぶ。
  useRouter() は窓の中では「その窓のルーター」を返すので、窓の中だけで遷移が閉じる。
*/
function leaveGame() {
	router.push("/games");
}

function finishStage(next: "clear" | "failed") {
	outcome.value = next;
	// 旗鯖fork: たのみごとの成否は、盤面の結果をそのままシステム判定として街へ戻す。
	if (activeTanomigoto.value) {
		machiFeed.value?.reportResult(activeTanomigoto.value.qi, next === "clear" ? "done" : "fail");
		activeTanomigoto.value = undefined;
	}
	// saveは端末キャッシュを先に更新し、通信失敗時も内部キューで再送する。
	void saveBoundary(next === "clear");
}

async function updateSettings(next: GameSettings) {
	gameSettings.value = next;
	setHanaawaseSoundEnabled(next.se);
	setHanaawaseAmbienceEnabled(next.se);
	await storage.save("settings", next);
	// 1回のqueuedでは警告しない。storage側の「3回連続で失敗」判定に一本化する。
	syncWarning.value = storage.shouldShowWarning();
}

function setSound(event: Event) {
	const enabled = (event.target as HTMLInputElement).checked;
	void updateSettings({ ...gameSettings.value, se: enabled });
}

function setMotion(motion: GameSettings["motion"]) {
	void updateSettings({ ...gameSettings.value, motion });
}

function setBarks(event: Event) {
	const barks = (event.target as HTMLInputElement).checked;
	void updateSettings({ ...gameSettings.value, barks });
}

function resetHints() {
	void updateProgress({ ...progress.value, hintsSeen: [] });
}

async function confirmReset() {
	if (resetStep.value === 0) { resetStep.value = 1; return; }
	if (resetStep.value !== 1) return;
	const result = await storage.reset();
	if (result === "saved") {
		progress.value = emptySaveMap().progress;
		daily.value = emptySaveMap().daily;
		gameSettings.value = emptySaveMap().settings;
		setHanaawaseSoundEnabled(true);
		setHanaawaseAmbienceEnabled(true);
		resetStep.value = 2;
		syncWarning.value = false;
	} else syncWarning.value = true;
}

function restart() {
	if (releaseTimer !== undefined) window.clearTimeout(releaseTimer);
	// ⚠️盤面を作り直す前に再生を止めないと、古い段の board.value が後から降ってくる。
	stopReplay();
	random = mulberry32(stageSeed());
	decorRandom = mulberry32((stageSeed() ^ 0x5f3a7c1d) >>> 0);
	resultVeiled.value = false;
	board.value = initialBoard();
	selected.value = undefined;
	cursor.value = { row: 0, col: 0 };
	cursorVisible.value = false;
	moves.value = stage.value.moves;
	score.value = 0;
	maxChain.value = 1;
	movesMade.value = 0;
	goalHave.value = 0;
	busy.value = false;
	paused.value = false;
	outcome.value = "playing";
	queuedMove = undefined;
	bossState.value = stage.value.boss ? createBossState(stage.value.boss) : undefined;
	setStatus(bossState.value
		? "季節の障りを、静かに退けましょう。"
		: isDaily.value
			? "二十手で、今日の点を書き留めます。"
			: `${goalName.value}を${goalNeed.value}枚集めましょう。`);
	showInitialHint();
}

/** 実際に盤面へ入る。⚠️物語を挟むかどうかは startStage 側で判断する。 */
function enterBoard(next: StageDefinition) {
	stage.value = next;
	restart();
	scene.value = "board";
	showInitialHint();
}

/**
 * 局を始める。⚠️季節の障りの「前ふり」だけは、盤面を組む前に挟む。
 * ⚠️一度出したら既読になり、負けて挑み直しても再表示しない（再挑戦のたびに前置きが挟まると邪魔になる。
 *   読み返しは花手帖の通し読みから）。
 */
function startStage(next: StageDefinition) {
	const intro = bossBeforeFor(next.id);
	if (intro.length > 0) {
		storyQueue.value = intro;
		storyReturn.value = "board";
		storyThenStage = next;
		storyInterlude.value = false;
		scene.value = "story";
		return;
	}
	enterBoard(next);
}

function startDaily() {
	activeDailyDate.value = currentDailyDate.value;
	stage.value = createDailyStage(activeDailyDate.value);
	restart();
	scene.value = "board";
}

/** 旗鯖fork: 街の様子で「たのみごとへ向かう」を押されたとき。続きの局をそのまま依頼の盤面にする。 */
function onTanomigotoGo(payload: { qi: number; quest: Tanomigoto }) {
	activeTanomigoto.value = payload;
	startStage(continueStage.value);
}

/** 実際に盤面から離れる。確認が要るかどうかは returnToMap 側で判断する。 */
function leaveBoard() {
	stopAmbience();
	stopReplay();
	// 旗鯖fork: たのみごとの盤面を途中でやめたら、その依頼は引受中のまま「保留」に戻す。
	// ⚠️ここで解除しないと、次に別の局をクリアしたとき古い依頼が達成として報告される。
	activeTanomigoto.value = undefined;
	if (isDaily.value) {
		goHome();
		return;
	}
	scene.value = "map";
	// ⚠️boss-after・stage-clear・month-close はここで出る＝撃破演出(resultVeiled)と結果カードのあと。
	playPendingStory("map");
}

async function confirmLeaveBoard() {
	const { canceled } = await os.confirm({
		type: "question",
		title: "この局をやめますか",
		text: "進行中のこの局は失われます。",
		okText: "やめる",
		cancelText: "続ける",
	});
	if (canceled) return;
	leaveBoard();
}

function returnToMap() {
	// 旗鯖fork: 進行中に限って確認を挟む（結果表示後の「一覧へ戻る」は素通り）。
	if (!boardInProgress()) {
		leaveBoard();
		return;
	}
	void confirmLeaveBoard();
}

function shareDailyResult() {
	void os.post({
		initialText: formatDailyShareText(activeDailyDate.value, score.value, maxChain.value),
	});
}

function releaseBoard() {
	busy.value = false;
	releaseTimer = undefined;
	if (queuedMove && outcome.value === "playing") {
		const next = queuedMove;
		queuedMove = undefined;
		performMove(next.from, next.to);
	}
}

function performMove(from: Coord, to: Coord) {
	if (outcome.value !== "playing" || paused.value) return;
	// ⚠️再生中は必ず既存のqueuedMove機構へ流す（ここを抜けると盤面が二重に進む）。
	if (replaying) {
		if (!queuedMove) queuedMove = { from, to };
		return;
	}
	const initial = board.value;
	if (bossState.value && isSwapBlocked(bossState.value, from, to)) {
		setStatus("凍った花は、隣で花をそろえると戻ります。", true);
		return;
	}
	const puddles = bossState.value?.effects.puddle ?? [];
	const result = playSwap(board.value, from, to, stage.value.colors, random, puddles);
	if (!result.accepted || !result.resolution) {
		setStatus("そこでは花がそろいません。", true);
		return;
	}
	const swapped = swap(initial, from, to);
	const resolution = result.resolution;
	if (activeHint.value === "swap") activeHint.value = undefined;
	rememberHint("swap");
	playSwapSound();
	// ⚠️控えめ設定・reduced-motion では steps を使わず、従来どおり最終盤面へ即時反映する。
	// ⚠️音だけは従来どおり鳴らす（演出を切っても効果音は残す設定のため）。
	if (!motionEnabled() || resolution.steps.length === 0) {
		board.value = result.board;
		playPop(resolution.cascade);
		const detonated = resolution.steps.flatMap((step) => step.detonated)[0];
		if (detonated) playSpecial(detonated);
		after(120, playLand);
		concludeMove(swapped, resolution);
		return;
	}
	replaying = true;
	busy.value = true;
	playResolution(resolution, () => {
		replaying = false;
		concludeMove(swapped, resolution);
	});
}

/** 再生を終えてからの集計。⚠️score/moves/goal/ボスは最終 resolution 値でまとめて反映する。 */
function concludeMove(swapped: Board, resolution: Resolution) {
	moves.value += resolution.returnedMoves - 1;
	movesMade.value += 1;
	score.value += resolution.score;
	maxChain.value = Math.max(maxChain.value, resolution.cascade);
	goalHave.value += resolution.collected[stage.value.flower] ?? 0;
	let tutorialMessage: string | undefined;
	if (resolution.cascade > 1 && rememberHint("chain")) tutorialMessage = "続けて揃うと、よく伸びます。";
	if (resolution.spawns.some((spawn) => spawn.piece.special === "tanzaku") && rememberHint("tanzaku")) tutorialMessage = "四つ揃うと、短冊になります。";
	if (moves.value === 3 && rememberHint("three-moves")) tutorialMessage = "あと三手。";
	let bossMessage: string | undefined;
	if (bossState.value) {
		const damage = bossDamage(swapped, resolution.removed);
		let nextBoss = clearBossEffects(
			applyBossDamage(bossState.value, damage),
			resolution.removed,
		);
		if (nextBoss.hp === 0) {
			bossState.value = nextBoss;
			finishStage("clear");
			setStatus("空が、少し明るくなりました。");
			playBossDefeat();
			return;
		}
		// 被弾フリンチ。⚠️180msだけ天候が怯む（毎手やっても鬱陶しくない範囲）。
		if (damage > 0) weatherPulse("flinch", 180);
		const turn = advanceBoss(nextBoss, board.value, random);
		nextBoss = turn.state;
		bossState.value = nextBoss;
		if (turn.action) {
			board.value = applyBossAction(board.value, turn.action);
			bossActionBurst(turn.action);
			bossMessage = "季節の障りが、予告どおりに動きました。";
		} else if (nextBoss.telegraph) {
			bossMessage = "次の一手のあと、天候が動きます。";
		}
	}
	selected.value = undefined;
	const shuffled = !hasPossibleMove(board.value, bossState.value?.effects.puddle ?? []);
	if (shuffled) board.value = automaticShuffle(board.value, random);
	let message = bossMessage ?? tutorialMessage ?? (resolution.cascade > 1
		? `${resolution.cascade}連鎖で花がそろいました。`
		: "花がそろいました。");
	if (shuffled) message += "風が吹いて、花が並び替わりました。";
	// 旗鯖fork: 手ごとの一言は残さない（次の手まで前の文が居座っていた）。
	setStatus(message, true);
	if (!bossState.value && !isDaily.value && goalHave.value >= goalNeed.value) {
		let toolMessage: string | undefined;
		if (stage.value.id === "m1-1" && rememberHint("tool")) {
			toolMessage = "祖母の鋏が出てきました。";
			void updateProgress({
				...progress.value,
				toolsUnlocked: progress.value.toolsUnlocked.includes("hasami")
					? progress.value.toolsUnlocked : [...progress.value.toolsUnlocked, "hasami"],
			});
		}
		finishStage("clear");
		setStatus(toolMessage ?? `${goalName.value}を集め終えました。`);
		playClear();
		return;
	}
	if (moves.value <= 0) {
		finishStage(isDaily.value ? "clear" : "failed");
		setStatus(isDaily.value ? "今日の記録を、書き留めました。" : "手数を使い切りました。");
		return;
	}
	busy.value = true;
	// 再生でもう十分待っているので、ここは入力を取りこぼさない最小の余韻だけにする。
	releaseTimer = window.setTimeout(releaseBoard, motionEnabled() ? 140 : 0);
}

function submitMove(from: Coord, to: Coord) {
	if (outcome.value !== "playing" || paused.value || !areAdjacent(from, to)) return;
	if (busy.value) {
		if (!queuedMove) queuedMove = { from, to };
		return;
	}
	performMove(from, to);
}

function selectCell(coord: Coord) {
	unlockSound();
	startAmbience(stage.value.ambience);
	if (outcome.value !== "playing" || paused.value) return;
	if (!selected.value) {
		selected.value = coord;
		setStatus("花を選びました。隣の花を選ぶと入れ替えます。");
		return;
	}
	if (sameCoord(selected.value, coord)) {
		selected.value = undefined;
		setStatus("選択を外しました。", true);
		return;
	}
	if (!areAdjacent(selected.value, coord)) {
		selected.value = coord;
		setStatus("花を選び直しました。");
		return;
	}
	const from = selected.value;
	selected.value = undefined;
	submitMove(from, coord);
}

function onCellClick(coord: Coord) {
	if (suppressClick.value) {
		suppressClick.value = false;
		return;
	}
	selectCell(coord);
}

function onPointerDown(coord: Coord, event: PointerEvent) {
	unlockSound();
	startAmbience(stage.value.ambience);
	// ポインタで触っている間はキーボードカーソルの枠を隠す。
	cursorVisible.value = false;
	pointerStart.value = { coord, x: event.clientX, y: event.clientY };
	(event.currentTarget as HTMLButtonElement).setPointerCapture?.(
		event.pointerId,
	);
}

function onPointerUp(coord: Coord, event: PointerEvent) {
	const start = pointerStart.value;
	pointerStart.value = undefined;
	if (!start || !sameCoord(start.coord, coord)) return;
	const dx = event.clientX - start.x,
		dy = event.clientY - start.y;
	if (Math.hypot(dx, dy) < 8) return;
	suppressClick.value = true;
	const to =
		Math.abs(dx) >= Math.abs(dy)
			? { row: start.coord.row, col: start.coord.col + (dx > 0 ? 1 : -1) }
			: { row: start.coord.row + (dy > 0 ? 1 : -1), col: start.coord.col };
	if (to.row >= 0 && to.row < 8 && to.col >= 0 && to.col < 8) submitMove(start.coord, to);
}

function onKeydown(event: KeyboardEvent) {
	unlockSound();
	startAmbience(stage.value.ambience);
	const directions: Record<string, Coord> = {
		ArrowUp: { row: -1, col: 0 },
		k: { row: -1, col: 0 },
		ArrowDown: { row: 1, col: 0 },
		j: { row: 1, col: 0 },
		ArrowLeft: { row: 0, col: -1 },
		h: { row: 0, col: -1 },
		ArrowRight: { row: 0, col: 1 },
		l: { row: 0, col: 1 },
	};
	if (event.key === "Escape") {
		event.preventDefault();
		if (selected.value) selected.value = undefined;
		else paused.value = !paused.value;
		return;
	}
	if (event.key === " " || event.key === "Enter") {
		event.preventDefault();
		cursorVisible.value = true;
		selectCell(cursor.value);
		return;
	}
	const direction = directions[event.key];
	if (!direction) return;
	event.preventDefault();
	// ここで初めてカーソル枠を出す（起動直後から左上に枠が出ないようにするため）。
	cursorVisible.value = true;
	cursor.value = {
		row: Math.max(0, Math.min(7, cursor.value.row + direction.row)),
		col: Math.max(0, Math.min(7, cursor.value.col + direction.col)),
	};
}

onMounted(async () => {
	const loaded = await storage.load();
	progress.value = loaded.data.progress;
	daily.value = loaded.data.daily;
	gameSettings.value = loaded.data.settings;
	setHanaawaseSoundEnabled(gameSettings.value.se);
	setHanaawaseAmbienceEnabled(gameSettings.value.se);
	recoveryAvailable.value = loaded.recoveryAvailable;
	removeOnlineRetry = storage.retryWhenOnline();
	saveLoaded.value = true;
	if (disclaimerPending.value) scene.value = "disclaimer";
	// 進行が読めてから演出を選ぶ（月・進行段階がセリフの文脈になる）。
	refreshMenuLine();
	refreshBackdrop();
	// ⚠️初回起動はここで序章が始まる。注意書きが未読なら playPendingStory 側が黙って見送る。
	playPendingStory("home");
});

// 旗鯖fork: StackingRouterView / keep-alive で scene が残り、復帰するとサブメニューが直接開いていた。
// プレイ中の盤面だけは維持し、それ以外はホームへ戻す。
onActivated(() => {
	pageActive.value = true;
	if (!saveLoaded.value) return; // 初回は onMounted が担当する
	if (disclaimerPending.value) {
		scene.value = "disclaimer";
		return;
	}
	if (scene.value === "board" && boardInProgress()) return;
	// ⚠️読みかけの物語は畳まない。keep-alive では Vignette がアンマウントされないので、
	// 途中の行・選んだ枝・スキップ状態はそのまま残っている。ここで goHome すると読みかけが消える。
	if (scene.value === "story" && storyQueue.value.length > 0) return;
	goHome();
});

onDeactivated(() => {
	pageActive.value = false; // 裏に回っている間は街の様子を止める
});

onUnmounted(() => {
	if (releaseTimer !== undefined) window.clearTimeout(releaseTimer);
	for (const timer of effectTimers) window.clearTimeout(timer);
	removeOnlineRetry?.();
	stopAmbience();
});

definePage(() => ({ title: "花常" }));
</script>

<style lang="scss" scoped>
/*
旗鯖fork: 花常の配色。⚠️design/02-meta.dc.html のダーク側の値をそのまま使う。
⚠️--bg / --panel / --ink / --sub / --line は MachiFeed.vue が var(--…) で借りている（--m-* のフォールバック元）。
値を変えると街の様子まで巻き添えになるので、この5つは動かさない。増やすのは下段の新トークンだけ。
⚠️color-scheme: dark を明示する。本体テーマがライトでもダークでも、
この中の入力要素・スクロールバーが本体側のUA配色を被って潰れないようにするため（＝どちらのテーマでも読める）。
*/
.hanaawase-scope {
	--bg: #2b2620; --panel: #3a332b; --ink: #f4efe3; --sub: #b0a692; --line: #4a4238; --cell: #221e19; --accent: #c9a04e;
	/* 追加トークン（design の --shu / --ai / --moss / --paper） */
	--paper: #332c24; --shu: #c4383d; --moss: #5a7a52;
	/* ⚠️--ai(#2d4a73) は暗地では潰れる。design も暗いテーマでは #8fa8c8 を使っているので、文字色は必ず --ai-ink を使う */
	--ai: #2d4a73; --ai-ink: #8fa8c8;
	--jiku: linear-gradient(90deg, #6b4a2e, #8a6a44 50%, #6b4a2e);
	--mincho: "Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", YuMincho, "Noto Serif JP", serif;

	max-width: 560px;
	margin: 0 auto;
	padding: 20px 12px 34px;
	color: var(--ink);
	color-scheme: dark;
}
/*
旗鯖fork: 帳面の枠（design の frameShell）。⚠️天の8pxは絵巻の軸。
これがあるかないかで「ただのカード」と「帳面」の差が出る。
*/
.sheet { position: relative; overflow: hidden; border-radius: 18px; box-shadow: 0 18px 50px rgb(0 0 0 / 35%); }
.sheet::before { position: absolute; top: 0; right: 0; left: 0; z-index: 2; height: 8px; border-radius: 17px 17px 0 0; background: var(--jiku); content: ""; pointer-events: none; }
.sheet::after { position: absolute; top: 8px; right: 0; left: 0; z-index: 2; height: 1px; background: rgb(0 0 0 / 34%); content: ""; pointer-events: none; }
/* 見出し。⚠️中央詰め。戻るボタンだけ左に逃がして題を光学的に中央へ置く。 */
.sheet-head { position: relative; margin: -18px -18px 18px; padding: 26px 56px 14px; border-bottom: 1px solid var(--line); text-align: center; }
.sheet-head h1 { margin: 0; font-family: var(--mincho); font-size: 24px; font-weight: 600; letter-spacing: .12em; }
.sheet-head .eyebrow { margin: 0 0 2px; letter-spacing: .18em; }
.sheet-sub { margin: 5px 0 0; color: var(--sub); font-size: 12px; line-height: 1.7; word-break: keep-all; overflow-wrap: anywhere; }
.sheet-back { position: absolute; left: 12px; top: 22px; }
.game-shell { position: relative; overflow: hidden; padding: 18px; border: 1px solid var(--line); border-radius: 18px; background: var(--bg); box-shadow: 0 14px 34px rgb(0 0 0 / 22%); }
.map-shell { padding: 18px; border: 1px solid var(--line); border-radius: 18px; background: linear-gradient(90deg, #2b2620, #332d25 50%, #2b2620); }
.map-intro { margin: 0 0 14px; color: var(--sub); font-size: 13px; text-align: center; word-break: keep-all; overflow-wrap: anywhere; }
/*
旗鯖fork: 月選びの絵巻（design/02-meta.dc.html の map()）。
左に一本の縦罫を通し、月の丸札を掛けていく。現在地だけ金の輪で囲む。
⚠️縦組み（writing-mode）は使わない。狭い画面で崩れる指摘が出ているため、横組みのまま字間で和文らしさを出す。
*/
/* ⚠️max-height に vh を使わない（ウィンドウモードでは窓より高い一覧になり、窓の側がスクロールしてしまう）。 */
.stage-map { position: relative; display: grid; gap: 20px; max-height: 560px; margin: 0; padding: 4px 2px 8px; overflow-y: auto; list-style: none; }
.stage-map::before { position: absolute; top: 8px; bottom: 12px; left: 31px; width: 2px; background: var(--line); content: ""; }
.map-month { position: relative; display: flex; gap: 14px; align-items: flex-start; }
.map-node { position: relative; z-index: 1; display: grid; width: 60px; height: 60px; flex: none; place-items: center; border: 2px solid var(--line); border-radius: 50%; background: var(--cell); }
.map-month[data-here="on"] .map-node { border-color: var(--accent); background: var(--panel); box-shadow: 0 0 0 4px rgb(201 160 78 / 18%); }
.map-flower { display: block; width: 36px; height: 36px; }
.map-body { min-width: 0; flex: 1; }
.map-title { display: flex; align-items: baseline; gap: 8px; margin: 6px 0 9px; }
.map-title b { font-family: var(--mincho); font-size: 20px; letter-spacing: .06em; }
.map-title small { color: var(--sub); font-size: 12px; }
.map-title em { margin-left: auto; padding: 2px 9px; border: 1px solid var(--accent); border-radius: 999px; color: var(--accent); font-size: 11px; font-style: normal; letter-spacing: .08em; }
.map-stages { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.map-chip { display: grid; justify-items: center; gap: 5px; padding: 8px 4px 7px; border: 1px solid var(--line); border-radius: 10px; color: var(--ink); background: rgb(23 20 16 / 62%); font: inherit; cursor: pointer; }
.map-chip:hover, .map-chip:focus-visible { border-color: var(--accent); background: rgb(201 160 78 / 13%); }
/* 季節の障り。⚠️文字色は --ai ではなく --ai-ink（暗地で #2d4a73 は潰れる）。 */
.map-chip[data-boss="on"] { border-color: var(--ai); background: rgb(45 74 115 / 22%); }
.map-chip[data-boss="on"] .chip-name { color: var(--ai-ink); }
.map-chip[data-boss="on"]:hover, .map-chip[data-boss="on"]:focus-visible { border-color: var(--ai-ink); background: rgb(45 74 115 / 34%); }
.chip-name { font-family: var(--mincho); font-size: 12px; letter-spacing: .04em; white-space: nowrap; }
.chip-stars { display: flex; gap: 2px; }
.chip-stars span { display: block; width: 13px; height: 13px; color: var(--line); }
.game-heading, .hud { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.game-heading { margin-bottom: 16px; }.eyebrow { margin: 0 0 2px; color: var(--sub); font-size: 12px; }.game-heading h1 { margin: 0; font-family: var(--mincho); font-size: 28px; letter-spacing: .12em; }
.icon-button { width: 38px; height: 38px; padding: 8px; border: 1px solid var(--line); border-radius: 50%; color: var(--ink); background: var(--panel); cursor: pointer; }.icon-button span { display: block; }
.hud { padding: 12px; border-radius: 12px; background: var(--panel); }.hud-block, .boss-gauge { min-width: 72px; text-align: center; }.hud-label { display: block; color: var(--sub); font-size: 11px; }.hud strong { font-size: 20px; }.boss-gauge strong { color: var(--accent); }.boss-gauge small { display: block; color: var(--sub); font-size: 10px; }.goal-block { display: flex; align-items: center; gap: 5px; font-size: 14px; }.goal-flower { width: 31px; height: 31px; }.daily-goal span:first-child { width: 26px; height: 26px; color: var(--accent); }.score-block { text-align: right; }
.star-meter { display: flex; justify-content: center; gap: 3px; margin: 10px 0 8px; }.star-meter span { width: 20px; height: 20px; color: var(--line); }.star-meter .reached { color: var(--accent); }
.instruction, .status, .pause-note { margin: 10px 0; text-align: center; color: var(--sub); font-size: 13px; }.pause-note { color: var(--accent); }
.board { position: relative; display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 3px; padding: 4px; border: 1px solid var(--line); border-radius: 12px; background: #171410; touch-action: manipulation; outline: none; }.board:focus-visible { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 65%, transparent); }
.cell { position: relative; display: grid; aspect-ratio: 1; min-width: 0; padding: 3px; border: 1px solid #383027; border-radius: 8px; background: var(--cell); cursor: pointer; transition: transform .16s ease, box-shadow .16s ease; }.cell:hover { transform: translateY(-1px); }.cell.selected { box-shadow: inset 0 0 0 2px var(--accent), 0 0 0 1px #f2d98c; }.cell.cursor { outline: 2px solid #f4efe3; outline-offset: -3px; }.cell.telegraph::before { position: absolute; inset: 2px; border: 2px dashed #7b86c8; border-radius: 7px; content: ""; pointer-events: none; animation: hana-telegraph 1.1s ease-in-out infinite; }.cell.puddle::after { position: absolute; inset: 17%; border: 1px solid #7b86c8; border-radius: 50%; background: rgb(45 74 115 / 30%); content: ""; pointer-events: none; }.cell.frozen::after { position: absolute; inset: 3px; border: 1px solid #dfe8ef; border-radius: 6px; background: rgb(244 239 227 / 20%); content: ""; pointer-events: none; }.cell.tanzaku-row .piece { transform: rotate(90deg); }.piece { width: 100%; height: 100%; transition: transform .16s ease; pointer-events: none; }.busy .cell { opacity: .96; }.paused .cell { cursor: default; }
.result { position: absolute; inset: 0; z-index: 5; display: grid; place-items: center; padding: 20px; background: rgb(22 18 14 / 78%); }.result-card { max-width: 290px; padding: 24px; border: 1px solid var(--accent); border-radius: 16px; text-align: center; background: var(--panel); }.result-card h2 { margin: 10px 0; font-family: var(--mincho); font-size: 21px; }.result-card p { color: var(--sub); font-size: 14px; }.result-flower { display: block; width: 68px; height: 68px; margin: 0 auto; }.restart-button { padding: 10px 20px; border: 0; border-radius: 8px; color: var(--bg); background: var(--accent); font-weight: 700; cursor: pointer; }
.map-actions { display: flex; justify-content: center; gap: 18px; margin: 16px 0 0; }.map-actions button, .text-button { border: 0; color: var(--sub); background: transparent; font: inherit; font-size: 12px; letter-spacing: .06em; cursor: pointer; }.map-actions button:hover, .text-button:hover, .map-actions button:focus-visible, .text-button:focus-visible { color: var(--ink); }
.home-shell { position: relative; overflow: hidden; display: grid; min-height: 520px; align-content: center; padding-top: 30px; }
.home-shell > :not(.home-bg, .home-scrim) { position: relative; z-index: 1; }
.home-bg { position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; object-fit: cover; opacity: .26; pointer-events: none; user-select: none; }
/*
旗鯖fork: 背景の上に置く帳（とばり）。⚠️背景画像の明暗に関わらず文字が読めるようにするための不変条件。
上下を濃く、中ほどを薄くして、題と目次の下だけを確実に沈める。⚠️filter は使わない（塗りだけ）。
*/
.home-scrim { position: absolute; inset: 0; z-index: 0; background: linear-gradient(180deg, rgb(24 20 16 / 72%), rgb(24 20 16 / 46%) 42%, rgb(24 20 16 / 78%)); pointer-events: none; }
.home-cast { display: flex; width: 100%; max-width: 380px; align-items: center; gap: 12px; margin: -8px auto 22px; padding: 0; border: 0; color: inherit; background: transparent; font: inherit; text-align: left; cursor: pointer; }
.cast-bustup { width: 78px; height: 78px; flex: none; border: 1px solid var(--line); border-radius: 50%; background: rgb(23 20 16 / 62%); object-fit: cover; }
/* 吹き出し。⚠️羽根（尖り）を立ち絵側へ向ける。羽根は border だけで描き、画像を足さない。 */
.cast-bubble { position: relative; display: grid; min-width: 0; flex: 1; gap: 4px; padding: 11px 14px; border: 1px solid var(--line); border-radius: 12px; background: rgb(23 20 16 / 82%); font-size: 13px; line-height: 1.6; }
/* ⚠️羽根は立ち絵が出ているときだけ。絵が無いときに出すと、何も指していない三角が浮く。 */
.cast-bustup + .cast-bubble::before { position: absolute; top: 50%; left: -7px; width: 0; height: 0; border-top: 6px solid transparent; border-right: 7px solid var(--line); border-bottom: 6px solid transparent; content: ""; transform: translateY(-50%); }
.cast-bubble b { color: var(--accent); font-family: var(--mincho); font-size: 11px; letter-spacing: .1em; }
.cast-bubble span { font-family: var(--mincho); font-size: 14px; line-height: 1.75; word-break: keep-all; overflow-wrap: anywhere; }
.home-cast[data-motion="on"] .cast-bubble { animation: hana-cast-in 240ms ease-out; }
.home-cast:hover .cast-bubble, .home-cast:focus-visible .cast-bubble { border-color: var(--accent); }
/*
旗鯖fork: ホームの題（design/02-meta の home()）。⚠️朱の輪＋桜の印＝店の印形。
⚠️題は明朝・字間 .14em。ここが素のゴシックだと「作りかけの管理画面」に見える。
*/
.home-heading { margin-bottom: 28px; text-align: center; }
.home-heading h1 { margin: 14px 0 8px; font-family: var(--mincho); font-size: clamp(46px, 13vw, 60px); font-weight: 600; letter-spacing: .14em; line-height: 1; text-indent: .14em; }
.home-heading p, .loading-note { margin: 0; color: var(--sub); font-size: 13px; word-break: keep-all; overflow-wrap: anywhere; }
.home-seal { display: grid; width: 44px; height: 44px; margin: 0 auto; padding: 9px; place-items: center; border: 2px solid var(--shu); border-radius: 50%; }
.home-seal :deep(svg) { display: block; width: 100%; height: 100%; }
/* 目次の札（design の menuCard）。⚠️印・題・説き・返しの4部で組む。 */
.home-menu { display: grid; gap: 12px; max-width: 380px; margin: 0 auto; }
.menu-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.menu-card { display: flex; align-items: center; gap: 13px; min-height: 62px; padding: 13px 14px; border: 1px solid var(--line); border-radius: 12px; color: var(--ink); background: var(--cell); font: inherit; text-align: left; cursor: pointer; transition: transform .12s ease, border-color .2s ease, background-color .2s ease; }
.menu-card:hover, .menu-card:focus-visible { border-color: var(--accent); background: rgb(201 160 78 / 10%); transform: translateY(-1px); }
.menu-mark { display: grid; width: 42px; height: 42px; flex: none; place-items: center; padding: 7px; border: 1px solid var(--line); border-radius: 10px; color: var(--accent); background: var(--panel); }
.menu-mark :deep(svg) { display: block; width: 100%; height: 100%; }
.menu-copy { display: grid; gap: 3px; min-width: 0; flex: 1; }
.menu-copy b { font-family: var(--mincho); font-size: 16px; font-weight: 600; letter-spacing: .06em; }
.menu-copy small { color: var(--sub); font-size: 11.5px; line-height: 1.5; word-break: keep-all; overflow-wrap: anywhere; }
.menu-chev { display: block; width: 16px; height: 16px; flex: none; color: var(--sub); }
.menu-card:hover .menu-chev, .menu-card:focus-visible .menu-chev { color: var(--accent); }
/* 「続きから」だけ大きく採る。⚠️他を小さくするのではなく、これを大きくして順序を示す。 */
.menu-lead { min-height: 76px; padding: 18px 16px; border-color: var(--accent); background: linear-gradient(135deg, rgb(201 160 78 / 12%), var(--cell) 62%); }
.menu-lead .menu-mark { width: 54px; height: 54px; padding: 6px; border-color: rgb(201 160 78 / 45%); }
.menu-lead .menu-copy b { font-size: 21px; }
.menu-foot { margin-top: 2px; text-align: center; }
/* 今日の盤面の控え。⚠️数字は等幅で揃え、桁が変わっても行が踊らないようにする。 */
.daily-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; max-width: 380px; margin: 20px auto 0; }
.daily-stats div { padding: 9px 4px; border: 1px solid var(--line); border-radius: 9px; text-align: center; background: rgb(23 20 16 / 52%); }
.daily-stats dt { display: flex; align-items: center; justify-content: center; gap: 3px; color: var(--sub); font-size: 10px; letter-spacing: .04em; white-space: nowrap; }
.daily-stats dd { margin: 3px 0 0; color: var(--ink); font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.1; }
.stat-dew dd { color: var(--accent); }
.dew-mark { display: block; width: 12px; height: 12px; flex: none; }
.save-warning { margin: 14px 0 0; color: #e5b5aa; font-size: 12px; text-align: center; word-break: keep-all; overflow-wrap: anywhere; }
/* 帳面から街へ移る中扉。⚠️罫と印だけ。ここに文言を足さない（MachiFeed が自分の見出しを持っている）。 */
.machi-lead { display: flex; align-items: center; gap: 12px; margin: 24px 4px 14px; }
.lead-rule { height: 1px; flex: 1; background: linear-gradient(90deg, transparent, var(--line) 30%, var(--line) 70%, transparent); }
.lead-seal { display: block; width: 20px; height: 20px; flex: none; opacity: .75; }
/*
旗鯖fork: 注意書き。⚠️同意チェックは置かない／文字を小さくしない／片方のボタンだけを目立たせない。
⚠️中央詰め。日本語が変な位置で折れないよう word-break: keep-all を使う
（line-break: strict や text-wrap: pretty では直らないことを実測済み）。
⚠️keep-all だけだと狭い画面で行がはみ出すので overflow-wrap: anywhere を保険に添える。
*/
/* ⚠️天地の余白に vh を使わない。ウィンドウモードでは「画面の高さ」の8%が窓の中に入り、注意書きが窓からはみ出す。 */
.disclaimer-shell { max-width: 520px; margin: 56px auto; padding: 28px; border: 1px solid #c9c9c9; color: #202020; background: #fff; font-family: system-ui, sans-serif; line-height: 1.7; text-align: center; }.disclaimer-shell h1 { margin: 0 0 22px; font-size: 21px; font-weight: 700; }.disclaimer-shell p { margin: 0 0 16px; font-size: 15px; word-break: keep-all; overflow-wrap: anywhere; }.disclaimer-shell p.disclaimer-note { margin: -6px 0 20px; padding-bottom: 16px; border-bottom: 1px solid #e2e2e2; color: #555; }.disclaimer-actions { display: flex; gap: 12px; justify-content: center; margin-top: 28px; }.disclaimer-actions button { flex: 1; min-height: 44px; border: 1px solid #555; color: #202020; background: #fff; font: inherit; cursor: pointer; }.disclaimer-actions button:hover, .disclaimer-actions button:focus-visible { background: #f0f0f0; }
/*
旗鯖fork: 花手帖（design/02-meta の dex()）。札を押すと下に覚え書きが開く。
⚠️まだ咲かせていない月は影のまま・名も出さない。⚠️filter はここでは静止した影の表現で、アニメには使っていない。
*/
.dex-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.dex-cell { display: grid; gap: 6px; padding: 10px 6px 9px; border: 1px solid var(--line); border-radius: 12px; color: var(--sub); background: var(--cell); font: inherit; text-align: center; cursor: pointer; transition: border-color .2s ease, transform .12s ease; }
.dex-cell:hover, .dex-cell:focus-visible { border-color: var(--accent); transform: translateY(-1px); }
.dex-cell[aria-pressed="true"] { border-color: var(--accent); background: rgb(201 160 78 / 12%); }
.dex-art { display: block; width: 100%; margin: 0 auto; padding: 14%; aspect-ratio: 1; filter: brightness(0) opacity(.3); }
.dex-cell[data-open="on"] { color: var(--ink); }
.dex-cell[data-open="on"] .dex-art { filter: none; }
.dex-cell b { font-family: var(--mincho); font-size: 13px; letter-spacing: .04em; }
.dex-cell small { color: var(--sub); font-size: 10px; }
/* 覚え書き。⚠️高さを固定して、開閉のたびに下の見出しが跳ねないようにする。 */
.dex-note { min-height: 132px; margin: 16px 0 0; padding: 16px 16px 14px; border: 1px solid var(--line); border-radius: 12px; background: var(--paper); text-align: center; }
.note-name { display: flex; align-items: baseline; justify-content: center; gap: 8px; margin: 0; font-family: var(--mincho); font-size: 20px; font-weight: 600; letter-spacing: .1em; }
.note-name small { color: var(--sub); font-size: 11px; letter-spacing: .08em; }
.note-season { margin: 6px 0 12px; color: var(--accent); font-size: 11.5px; letter-spacing: .1em; }
.note-line { margin: 0 0 6px; color: var(--ink); font-size: 13px; line-height: 1.9; word-break: keep-all; overflow-wrap: anywhere; }
.note-quiet { display: grid; min-height: 96px; align-content: center; color: var(--sub); }
/* 特別な札。⚠️engine.ts の実装と文面を一致させること（説明が嘘になると盤面が読めなくなる）。 */
.dex-specials { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.dex-specials li { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 11px; background: rgb(23 20 16 / 52%); text-align: left; }
.special-art { display: block; width: 34px; height: 34px; flex: none; }
.special-copy { display: grid; gap: 3px; min-width: 0; }
.special-copy b { font-family: var(--mincho); font-size: 14px; letter-spacing: .06em; }
.special-copy small { color: var(--sub); font-size: 11.5px; line-height: 1.7; word-break: keep-all; overflow-wrap: anywhere; }
/*
旗鯖fork: 設定（design/02-meta の settings()）。左に名と説き、右に操作。
⚠️入力要素は素の <input> のまま残し、appearance:none で描き直している。
本体テーマの color-scheme をそのまま被ると、暗いテーマで枠も点も沈んで見えなくなるため。
*/
.settings-list { display: grid; }
.set-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin: 0; padding: 16px 4px; border: 0; border-bottom: 1px solid var(--line); }
.set-copy { display: grid; gap: 3px; min-width: 0; }
.set-copy b, .settings-list legend { font-size: 14px; font-weight: 500; letter-spacing: .04em; }
.set-copy small { color: var(--sub); font-size: 11px; line-height: 1.6; word-break: keep-all; overflow-wrap: anywhere; }
.set-choice { flex-wrap: wrap; }
.set-choice legend { width: 100%; padding: 0; }
.set-options { display: flex; gap: 6px; margin-left: auto; }
.set-options label { position: relative; display: block; }
/* ⚠️input は消さずに重ねて隠す（読み上げと矢印キーでの選択を素のまま残す）。 */
.set-options input { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; overflow: hidden; clip-path: inset(50%); }
.set-options span { display: block; padding: 7px 13px; border: 1px solid var(--line); border-radius: 8px; color: var(--sub); font-size: 12px; cursor: pointer; transition: border-color .2s ease, color .2s ease, background-color .2s ease; }
.set-options input:checked + span { border-color: var(--accent); color: var(--ink); background: rgb(201 160 78 / 16%); }
.set-options input:focus-visible + span { outline: 2px solid var(--accent); outline-offset: 2px; }
/*
摘み（52×28。design の toggle）。⚠️入の色は --moss。金は「選ばれている札」に使うので、切替とは色で分ける。
⚠️input そのものに ::after を生やさない（置換要素の擬似要素は当てにならない）。
透明にした input を上に敷き、見た目は span 2枚で描く。操作・読み上げ・キー操作は素の input のまま。
*/
.set-switch { position: relative; display: block; flex: none; }
.set-switch input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
.switch-track { display: block; width: 52px; height: 28px; border: 1px solid var(--line); border-radius: 14px; background: rgb(23 20 16 / 72%); transition: background-color .2s ease, border-color .2s ease; }
.switch-knob { display: block; width: 20px; height: 20px; margin: 3px 0 0 3px; border-radius: 50%; background: var(--sub); transition: transform .2s ease, background-color .2s ease; }
.set-switch input:checked + .switch-track { border-color: var(--moss); background: var(--moss); }
.set-switch input:checked + .switch-track .switch-knob { background: #f4efe3; transform: translateX(24px); }
.set-switch input:focus-visible + .switch-track { outline: 2px solid var(--accent); outline-offset: 2px; }
.set-button { flex: none; padding: 8px 15px; border: 1px solid var(--line); border-radius: 8px; color: var(--ink); background: transparent; font: inherit; font-size: 13px; cursor: pointer; }
.set-button:hover, .set-button:focus-visible { border-color: var(--accent); background: rgb(201 160 78 / 12%); }
/* 取り消せない操作。⚠️一段構えのうちは静かに、構えたら朱で示す（design の resetStep）。 */
.reset-box { margin-top: 26px; padding: 16px; border: 1px solid var(--line); border-radius: 12px; text-align: center; transition: border-color .2s ease, background-color .2s ease; }
.reset-box[data-armed="on"] { border-color: var(--shu); background: rgb(196 56 61 / 10%); }
.reset-box b { color: #e5b5aa; font-size: 14px; letter-spacing: .06em; }
.reset-box p { margin: 5px 0 13px; color: var(--sub); font-size: 12px; line-height: 1.7; word-break: keep-all; overflow-wrap: anywhere; }
.reset-box button { padding: 9px 16px; border: 1px solid #b5695e; border-radius: 8px; color: #e5b5aa; background: transparent; font: inherit; font-size: 13px; cursor: pointer; }
.reset-box button:hover, .reset-box button:focus-visible { background: rgb(196 56 61 / 16%); }
.result-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }.restart-button, .secondary-button { padding: 10px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; }.restart-button { border: 0; color: var(--bg); background: var(--accent); }.secondary-button { border: 1px solid var(--line); color: var(--ink); background: transparent; }
.hint-spot { position: absolute; inset: 0; z-index: 6; pointer-events: none; background: radial-gradient(circle 11% at var(--hint-left) var(--hint-top), transparent 58%, rgb(8 7 5 / 72%) 100%); }.hint-spot span { position: absolute; left: var(--hint-left); top: var(--hint-top); width: 15%; aspect-ratio: 1; border: 2px solid var(--accent); border-radius: 50%; transform: translate(-50%, -50%); animation: hana-hint-pulse 2s ease-in-out infinite; }.hint-spot p { position: absolute; left: 50%; top: calc(var(--hint-top) + 9%); margin: 0; transform: translateX(-50%); color: var(--ink); font-family: var(--mincho); font-size: 14px; white-space: nowrap; text-shadow: 0 1px 4px #000; }
/* --- 演出レイヤ。⚠️transform と opacity のみで組む（filter は使わない）。 --- */
.effects { position: absolute; inset: 0; z-index: 3; overflow: hidden; pointer-events: none; }
.effect-burst, .effect-cluster, .effect-score-spot, .effect-boss, .effect-spawn { position: absolute; width: 0; height: 0; transform: translate(-50%, -50%); }
.effect-ring, .effect-pop, .effect-score, .effect-petal { position: absolute; display: block; pointer-events: none; }
/* ⚠️白い塊のフラッシュはやめて細いリングにする（白飛びさせず打点だけ締める）。 */
.effect-ring { left: -21px; top: -21px; width: 42px; height: 42px; border: 2px solid rgb(244 239 227 / 82%); border-radius: 50%; opacity: 0; animation: hana-ring 260ms cubic-bezier(.2, .7, .3, 1) var(--delay, 0ms) forwards; }
.effect-pop { left: -21px; top: -21px; width: 42px; height: 42px; transform: scale(var(--scale, 1)); animation: hana-pop 200ms cubic-bezier(.34, 1.56, .64, 1) var(--delay, 0ms) forwards; }
.effect-petal { left: -9px; top: -9px; width: 17px; height: 17px; animation: hana-petal 760ms ease-out var(--delay, 0ms) forwards; }
.effect-petal :deep(svg) { width: 100%; height: 100%; }
.effect-score { left: -16px; top: -12px; color: var(--accent); font-weight: 700; font-size: calc(13px * var(--scale, 1)); text-shadow: 0 1px 0 var(--bg); animation: hana-score 460ms ease-out forwards; }
/* 連鎖の読み。明朝・淡色・短命に留める。 */
.effect-chain { position: absolute; left: 50%; top: 8%; color: rgb(244 239 227 / 76%); font-family: var(--mincho); font-size: 26px; letter-spacing: .14em; text-shadow: 0 2px 6px rgb(0 0 0 / 55%); transform: translateX(-50%); animation: hana-chain 900ms ease-out forwards; }
.effect-spawn span { position: absolute; left: -22px; top: -22px; display: block; width: 44px; height: 44px; }
.effect-spawn[data-kind="tanzaku"] span { transform-origin: center top; animation: hana-spawn-tanzaku 560ms cubic-bezier(.2, .8, .3, 1) forwards; }
.effect-spawn[data-kind="mari"] span { animation: hana-spawn-mari 620ms cubic-bezier(.34, 1.56, .64, 1) forwards; }
.effect-spawn[data-kind="tsuki"] span { animation: hana-spawn-tsuki 660ms ease-out forwards; }
.effect-boss::after { position: absolute; left: -20px; top: -20px; width: 40px; height: 40px; border: 2px solid rgb(123 134 200 / 90%); border-radius: 8px; content: ""; opacity: 0; animation: hana-boss-burst 480ms ease-out var(--delay, 0ms) forwards; }
/* 落下（FLIP）。⚠️drop===0 のセルには data-drop を付けないので、不動の駒は一切動かない。 */
.cell[data-drop="pre"] { transform: translateY(var(--drop-y, 0px)); transition: none; }
.cell[data-drop="fall"] { transform: translateY(0); transition: transform var(--drop-dur, 140ms) cubic-bezier(.22, .68, .28, 1); }
.cell[data-land]:not(.tanzaku-row) .piece { transform-origin: center bottom; animation: hana-land 130ms ease-out; }
/* シェイクは3連以上のみ。段で振幅を変える。 */
.game-shell[data-shake] { animation: hana-shake 170ms ease; }
.game-shell[data-shake="2"], .game-shell[data-shake="3"] { --shake: 2px; }
.game-shell[data-shake="4"] { --shake: 3px; }
.game-shell[data-shake="5"] { --shake: 4px; }
/* ヒットストップ。⚠️白幕は使わず、演出の一時停止と盤面のごく浅い縮みだけ。90ms上限。 */
.game-shell.hit-stop .effects * { animation-play-state: paused; }
/* ⚠️手前の天候レイヤも一緒に止める（ここだけ流れ続けると打点が抜ける）。 */
.game-shell.hit-stop .weather-over .weather-mote { animation-play-state: paused; }
.game-shell.hit-stop .board { transform: scale(.994); }
/* 季節の障りの天候。⚠️z-index 0 のまま、他の要素に z-index:1 を与えて必ず盤面より奥に置く。 */
.game-shell > header, .game-shell > .hud, .game-shell > .star-meter, .game-shell > .instruction, .game-shell > .board, .game-shell > .status, .game-shell > .pause-note { position: relative; z-index: 1; }
.weather { position: absolute; inset: 0; z-index: 0; overflow: hidden; opacity: .34; pointer-events: none; transition: opacity 200ms ease, transform 240ms ease; }
.weather[data-state="surge"] { opacity: .58; }
.weather[data-state="flinch"] { opacity: .14; transform: scale(.985); }
.weather[data-state="drain"] { opacity: .1; transform: scale(.88); }
.weather[data-state="release"] { opacity: .5; transform: scale(1.08); }
/*
旗鯖fork: 天候の「手前」レイヤ。奥のレイヤ(opacity .34)はそのまま残し、盤面の上に薄く足すだけ。
⚠️駒の判別を守るための不変条件（崩さないこと）:
  - z-index は 2。.cell より手前、.effects(z-index:3)より奥。点数・連鎖・破裂の文字は必ず粒より手前に出る
  - 不透明度は idle .14 / 最大 .18。粒の地色が最大95%なので、駒に被る実効量は最大 .17
  - 粒の色は白・淡青灰・淡黄白の無彩色寄りのまま。駒の彩度の高い色相と競合させない
  - 五月雨の水面グラデ(::after)はここでは出さない。静止した面が升目を一様に染めて可読性を落とすため
  - transform は掛けない（拡大すると盤面の外へはみ出す）。filter も使わない
*/
.weather.weather-over { z-index: 2; border-radius: 11px; opacity: .14; transform: none; }
.weather.weather-over::after { display: none; }
.weather.weather-over[data-state="surge"] { opacity: .18; }
.weather.weather-over[data-state="flinch"] { opacity: .06; }
.weather.weather-over[data-state="drain"] { opacity: .05; }
.weather.weather-over[data-state="release"] { opacity: .17; }
.weather-mote { position: absolute; display: block; }
.weather[data-boss="haruare"] .weather-mote { left: calc(var(--i) * 8% - 18%); top: -14%; width: 2px; height: 52px; border-radius: 2px; background: linear-gradient(180deg, rgb(244 239 227 / 0%), rgb(244 239 227 / 85%)); animation: hana-w-haruare linear infinite; animation-duration: calc(1.4s + var(--i) * .06s); animation-delay: calc(var(--i) * -.17s); }
.weather[data-boss="samidare"] .weather-mote { left: calc(var(--i) * 7.4% + 1%); top: -12%; width: 1px; height: 38px; background: linear-gradient(180deg, rgb(190 205 235 / 0%), rgb(190 205 235 / 95%)); animation: hana-w-samidare linear infinite; animation-duration: calc(1.1s + var(--i) * .05s); animation-delay: calc(var(--i) * -.13s); }
.weather[data-boss="samidare"]::after { position: absolute; right: 0; bottom: 0; left: 0; height: 34%; background: linear-gradient(0deg, rgb(123 134 200 / 34%), rgb(123 134 200 / 0%)); content: ""; animation: hana-w-surface 3.6s ease-in-out infinite; }
.weather[data-boss="nowaki"] .weather-mote { left: -16%; top: calc(var(--i) * 7.2% + 2%); width: 52px; height: 2px; border-radius: 2px; background: linear-gradient(90deg, rgb(240 235 220 / 0%), rgb(240 235 220 / 80%)); animation: hana-w-nowaki cubic-bezier(.4, 0, .6, 1) infinite; animation-duration: calc(1.6s + var(--i) * .07s); animation-delay: calc(var(--i) * -.15s); }
.weather[data-boss="nowaki"] .weather-mote:nth-child(3n) { width: 11px; height: 8px; border-radius: 62% 12% 62% 12%; background: rgb(103 122 84 / 85%); }
.weather[data-boss="ooshimo"] .weather-mote { left: calc(var(--i) * 7.2% + 1%); top: -8%; width: 9px; height: 9px; animation: hana-w-ooshimo linear infinite; animation-duration: calc(3.6s + var(--i) * .14s); animation-delay: calc(var(--i) * -.29s); }
.weather[data-boss="ooshimo"] .weather-mote::before, .weather[data-boss="ooshimo"] .weather-mote::after { position: absolute; inset: 0; background: linear-gradient(90deg, transparent 43%, rgb(223 232 239 / 95%) 43%, rgb(223 232 239 / 95%) 57%, transparent 57%), linear-gradient(0deg, transparent 43%, rgb(223 232 239 / 95%) 43%, rgb(223 232 239 / 95%) 57%, transparent 57%); content: ""; }
.weather[data-boss="ooshimo"] .weather-mote::after { transform: rotate(45deg); }
/* 予告は「明滅」で読ませ、ボスごとに色を変えて発動と視覚的に分ける。 */
.board[data-boss="haruare"] .cell.telegraph::before { border-color: #e8e2d2; }
.board[data-boss="samidare"] .cell.telegraph::before { border-color: #8fa8d8; }
.board[data-boss="nowaki"] .cell.telegraph::before { border-color: #9fbe8a; }
.board[data-boss="ooshimo"] .cell.telegraph::before { border-color: #dfe8ef; }
/* 撃破の開放。⚠️全画面の白飛びではなく、中心から抜ける放射のみ。 */
.defeat-veil { position: absolute; inset: 0; z-index: 6; background: radial-gradient(circle at 50% 46%, rgb(244 239 227 / 85%), rgb(244 239 227 / 0%) 60%); opacity: 0; pointer-events: none; animation: hana-release 640ms ease-out forwards; }
.defeat-petals { position: absolute; inset: 0; z-index: 7; overflow: hidden; pointer-events: none; }
.defeat-petal { position: absolute; top: -8%; display: block; width: var(--size, 16px); height: var(--size, 16px); opacity: 0; animation: hana-defeat-petal var(--dur, 2200ms) ease-in var(--delay, 0ms) forwards; }
.defeat-petal :deep(svg) { width: 100%; height: 100%; }
@keyframes hana-ring { 0% { opacity: .7; transform: scale(.55); } 100% { opacity: 0; transform: scale(1.25); } } @keyframes hana-pop { 0% { opacity: 1; transform: scale(var(--scale, 1)); } 35% { opacity: 1; transform: scale(calc(var(--scale, 1) * 1.14)); } 100% { opacity: 0; transform: scale(0); } } @keyframes hana-score { 0% { opacity: 0; transform: translateY(4px) scale(.8); } 25% { opacity: 1; transform: translateY(-8px) scale(1.05); } 100% { opacity: 0; transform: translateY(-22px) scale(1); } } @keyframes hana-petal { 0% { opacity: 0; transform: translate3d(0, 0, 0) rotate(0deg) scale(.7); } 15% { opacity: 1; } 100% { opacity: 0; transform: translate3d(var(--x, 0px), var(--y, 0px), 0) rotate(var(--r, 0deg)) scale(.45); } } @keyframes hana-chain { 0% { opacity: 0; transform: translateX(-50%) translateY(6px) scale(.9); } 25% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } 70% { opacity: .85; } 100% { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(1.02); } } @keyframes hana-land { 0% { transform: scaleX(1.12) scaleY(.84); } 60% { transform: scaleX(.97) scaleY(1.04); } 100% { transform: scaleX(1) scaleY(1); } } @keyframes hana-shake { 0%, 100% { transform: translate3d(0, 0, 0); } 25% { transform: translate3d(calc(var(--shake, 2px) * -1), 1px, 0); } 50% { transform: translate3d(var(--shake, 2px), -1px, 0); } 75% { transform: translate3d(calc(var(--shake, 2px) * -.5), var(--shake, 2px), 0); } }
@keyframes hana-spawn-tanzaku { 0% { opacity: 0; transform: scaleY(.1); } 30% { opacity: 1; } 100% { opacity: 0; transform: scaleY(1.15); } } @keyframes hana-spawn-mari { 0% { opacity: 0; transform: scale(.3); } 40% { opacity: 1; transform: scale(1.25); } 65% { transform: scale(.95); } 100% { opacity: 0; transform: scale(1.1); } } @keyframes hana-spawn-tsuki { 0% { opacity: 0; transform: translateY(8px) scale(.7); } 35% { opacity: 1; transform: translateY(0) scale(1.1); } 100% { opacity: 0; transform: translateY(-12px) scale(1.2); } } @keyframes hana-boss-burst { 0% { opacity: 0; transform: scale(.6); } 25% { opacity: .95; } 100% { opacity: 0; transform: scale(1.35); } } @keyframes hana-telegraph { 0%, 100% { opacity: .15; } 50% { opacity: .7; } }
@keyframes hana-w-haruare { 0% { opacity: 0; transform: translate3d(0, 0, 0) rotate(18deg); } 12% { opacity: 1; } 88% { opacity: 1; } 100% { opacity: 0; transform: translate3d(210px, 640px, 0) rotate(18deg); } } @keyframes hana-w-samidare { 0% { opacity: 0; transform: translate3d(0, 0, 0); } 10% { opacity: 1; } 90% { opacity: 1; } 100% { opacity: 0; transform: translate3d(-26px, 660px, 0); } } @keyframes hana-w-surface { 0%, 100% { transform: translate3d(0, 0, 0) scaleY(1); } 50% { transform: translate3d(0, -5px, 0) scaleY(1.1); } } @keyframes hana-w-nowaki { 0% { opacity: 0; transform: translate3d(0, 0, 0) rotate(-10deg); } 10% { opacity: 1; } 55% { transform: translate3d(340px, -34px, 0) rotate(12deg); } 90% { opacity: 1; } 100% { opacity: 0; transform: translate3d(700px, 22px, 0) rotate(-8deg); } } @keyframes hana-w-ooshimo { 0% { opacity: 0; transform: translate3d(0, 0, 0) rotate(0deg); } 12% { opacity: 1; } 86% { opacity: 1; } 100% { opacity: 0; transform: translate3d(26px, 620px, 0) rotate(200deg); } }
@keyframes hana-release { 0% { opacity: 0; transform: scale(.45); } 26% { opacity: .45; } 100% { opacity: 0; transform: scale(1.5); } } @keyframes hana-defeat-petal { 0% { opacity: 0; transform: translate3d(0, 0, 0) rotate(0deg); } 12% { opacity: 1; } 82% { opacity: 1; } 100% { opacity: 0; transform: translate3d(var(--sway, 0px), 620px, 0) rotate(var(--spin, 180deg)); } }
@keyframes hana-hint-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgb(201 160 78 / 45%); } 50% { box-shadow: 0 0 0 9px rgb(201 160 78 / 0%); } } @keyframes hana-cast-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
/* ⚠️.weather-over も含めて、控えめ設定では天候の粒を一切出さない。 */
@media (prefers-reduced-motion: reduce) { .effects, .weather, .weather-over, .defeat-petals, .defeat-veil { display: none; }.cell[data-drop] { transform: none; transition: none; }.cell[data-land] .piece, .game-shell[data-shake] { animation: none; }.game-shell.hit-stop .board { transform: none; }.cell.telegraph::before { animation: none; opacity: .6; }.home-cast .cast-bubble { animation: none; }
	/* ⚠️帳面の所作と札の浮きも止める。 */
	.sheet { animation: none; }.menu-card, .dex-cell, .switch-knob, .switch-track { transition: none; }.menu-card:hover, .dex-cell:hover { transform: none; } }
/*
旗鯖fork: 物語の器と通し読み。⚠️中身の意匠は Vignette.vue（別スコープ）が持つので、ここは外枠だけ。
⚠️日本語が変な位置で折れないよう keep-all ＋ 保険の overflow-wrap（注意書きと同じ作法）。
*/
/* ⚠️中身の意匠は Vignette.vue（別スコープ）。ここは軸と縁だけを足し、内側には一切触れない。 */
/* ⚠️container-type: inline-size は Vignette.vue の @container が拠り所にしている。外さないこと。
   ⚠️画面幅ではなく「この器の幅」で場面の縦横比が決まる＝ウィンドウモードの小窓でも正しく縮む。 */
.story-shell { position: relative; container-type: inline-size; margin: 0 auto; overflow: hidden; border: 1px solid var(--line); background: var(--bg); text-align: center; word-break: keep-all; overflow-wrap: anywhere; }
/* 連続した未読場面の間に置く、操作を止めない短いしおり。幅基準は親の container に任せる。 */
.story-interlude { display: grid; min-height: max(280px, 58cqw); place-content: center; gap: 18px; padding: 24px; color: var(--ink); background: linear-gradient(145deg, var(--bg), var(--panel)); font-family: var(--mincho); }
.story-interlude p { margin: 0; letter-spacing: .1em; }
.story-interlude div { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.story-interlude button { border: 1px solid var(--line); border-radius: 999px; padding: 9px 15px; color: var(--ink); background: var(--panel); font: inherit; cursor: pointer; }
.story-interlude button:hover, .story-interlude button:focus-visible { border-color: var(--accent); background: rgb(201 160 78 / 13%); }
/*
旗鯖fork: ⚠️物語の場面だけ器を広げる。560px の細帯だと広い画面で余白しか見えず、会話劇の没入感が消えるため。
⚠️他の場面（盤面・ホーム・月選び・花手帖・街の様子）の 560px は動かさない。
  あれは盤面のマス寸法と MachiFeed の高さ設計の前提になっているので、広げると巻き添えになる。
⚠️vw は使わない（ウィンドウモードで窓幅ではなく画面幅を見てしまうため）。
  max-width は「上限」なので、狭い窓では素直に窓幅いっぱいに収まる。
*/
.hanaawase-scope[data-scene="story"] { max-width: 1100px; }
.dex-heading { position: relative; margin: 26px 0 12px; color: var(--ink); font-family: var(--mincho); font-size: 15px; letter-spacing: .16em; text-align: center; }
/* 見出しの両脇に罫を引く。⚠️装飾は罫だけ。文字を小さくしない。 */
.dex-heading::before, .dex-heading::after { position: absolute; top: 50%; width: 22%; height: 1px; background: var(--line); content: ""; }
.dex-heading::before { left: 0; }
.dex-heading::after { right: 0; }
.dex-empty { margin: 0; text-align: center; }
/* ⚠️同上。vh をやめて px で固定する。 */
.story-list { display: grid; gap: 6px; max-height: 400px; margin: 0; padding: 0 2px; overflow-y: auto; list-style: none; }
.story-list button { display: flex; width: 100%; align-items: baseline; justify-content: center; gap: 10px; padding: 9px; border: 1px solid var(--line); border-radius: 10px; color: var(--ink); background: rgb(23 20 16 / 62%); font: inherit; cursor: pointer; word-break: keep-all; }
.story-list button:hover, .story-list button:focus-visible { border-color: var(--accent); background: rgb(201 160 78 / 13%); }
.story-list b { font-family: var(--mincho); font-size: 14px; }
.story-list small { color: var(--sub); font-size: 11px; }
.home-machi { margin-top: 0; }
/*
旗鯖fork: 帳面が開く所作（design/03-motion の hana-enter）。⚠️transform と opacity のみ・320ms。
⚠️fill-mode を付けない。付けると終了後も transform が残り、子孫の position: fixed の基準を壊す（SPEC §0.4-4）。
*/
.sheet { animation: hana-sheet-in 320ms cubic-bezier(.34, 1.4, .64, 1); }
@keyframes hana-sheet-in { from { opacity: 0; transform: translateY(10px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
.hanaawase-scope[data-motion="off"] .sheet { animation: none; }
.hanaawase-scope[data-motion="off"] .menu-card, .hanaawase-scope[data-motion="off"] .dex-cell { transition: none; }
.hanaawase-scope[data-motion="off"] .menu-card:hover, .hanaawase-scope[data-motion="off"] .dex-cell:hover { transform: none; }
/* 旗鯖fork: 携帯では「街の様子」を画面の主役にする。ホームの縦センタリングを解いて上詰めにする。 */
@media (max-width: 640px) { .home-shell { min-height: auto; align-content: start; } }
/* ⚠️狭い画面では2列をやめる。keep-all の説き文が1列だと必ず折れて読みにくくなるため。 */
@media (max-width: 430px) {
	.menu-row { grid-template-columns: 1fr; }
	.dex-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
	.map-node { width: 52px; height: 52px; }
	.map-flower { width: 32px; height: 32px; }
	.map-month { gap: 11px; }
	.stage-map::before { left: 27px; }
	.sheet-head { padding-right: 48px; padding-left: 48px; }
	.sheet-back { left: 8px; }
}
@media (max-width: 420px) { .game-shell { padding: 12px; }.hud { padding: 9px; }.hud-block { min-width: 58px; }.hud strong { font-size: 18px; }.cell { border-radius: 6px; padding: 2px; }
	/* ⚠️文字は小さくしない。余白だけ詰めて keep-all の行が収まる幅を稼ぐ。 */
	.disclaimer-shell { margin: 28px auto; padding: 22px 16px; } }
</style>
