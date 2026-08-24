<template>
<PageWithHeader>
<svg width="0" height="0" style="position:absolute"><defs><filter id="htk-gfx" x="0%" y="0%" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.025 0.025" numOctaves="2" seed="92" result="n"/><feGaussianBlur in="n" stdDeviation="2" result="bl"/><feDisplacementMap in="SourceGraphic" in2="bl" scale="65" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>

<div class="htk-root" :data-mode="themeMode" :data-theme="settings.theme || 'kisetsu'" :data-anim="(settings.animations===false)?'off':'on'" :data-hk-wind="hkWind?'on':'off'" :data-hk-boot="showBoot?'on':'off'" ref="rootEl">

<!-- 旗鯖fork(v2 §16①): 起動ブートスプラッシュ(テーマ別演出: 季=罫線ドロー / 花信=三点 / 刷=トンボ) -->
<div v-if="showBoot" :key="bootKey" class="htk-boot" aria-hidden="true"><div class="htk-boot-inner"><div class="htk-boot-tombo"><span></span><span></span><span></span><span></span></div><div class="htk-boot-rule"></div><div class="htk-boot-logo">Hatask</div><div class="htk-boot-rule"></div><div class="htk-boot-dots"><i></i><i></i><i></i></div><!-- 旗鯖fork(ハタキュ): 画鋲で紙を留める演出 --><span class="htk-boot-tack"></span></div></div>

<div class="htk-app" @touchstart.passive="htkTouchStart" @touchmove.passive="htkTouchMove" @touchend="htkTouchEnd">
<!-- 旗鯖fork(ハタキュ): ヘッダー・ナビ・各タブをまとめて「コルク板」に載せるための入れ物。
     ⚠️ハタキュ以外では display:contents にしてあるので、他テーマのレイアウトには一切影響しない。
     ⚠️このラッパーを外す/クラス名を変えるときは、CSS の .htk-shell 側も同時に直すこと。 -->
<div class="htk-shell">
<!-- 旗鯖fork(ハタキュ): 突風で舞う落ち葉。⚠️key を変えて作り直さないと2回目以降が再生されない。 -->
<div v-if="isHatakyu" :key="'hkleaf'+hkLeafKey" class="hk-leaves" aria-hidden="true"><span class="hk-leaf"></span><span class="hk-leaf"></span><span class="hk-leaf"></span><span class="hk-leaf"></span><span class="hk-leaf"></span></div>

<!-- 旗鯖fork(ハタキュ): 画鋲で留めたタイトル紙 + 紙の操作ボタン -->
<div v-if="isHatakyu" class="hk-bhead">
  <div class="hk-titlecard"><span class="hk-tape hk-tl"></span><span class="hk-tape hk-tr"></span><div class="hk-lg-name">Hatask</div><div class="hk-sb">HATAKYU BOARD</div></div>
  <div class="hk-hbtns">
    <button class="hk-hbtn" @click="handleBack" :title="copy.back" :aria-label="copy.back"><i class="ti ti-arrow-left"></i><span>{{copy.back}}</span></button>
    <button class="hk-hbtn" @click="showSearch=true" :title="copy.search"><i class="ti ti-search"></i><span>{{copy.search}}</span></button>
    <button class="hk-hbtn" @click="openHataskSettings()" :title="copy.hataskSettings"><i class="ti ti-settings"></i><span>{{copy.hataskSettings}}</span></button>
  </div>
</div>

<!-- HEADER: search left, title center, settings right -->
<header v-if="!isHatakyu" class="htk-lg htk-header htk-anim"><div class="htk-gc" style="display:flex;align-items:center;justify-content:space-between;padding:14px 22px;position:relative"><div style="display:flex;align-items:center;gap:8px;position:relative;z-index:1"><button class="htk-btn htk-icon-sq htk-header-back" @click="handleBack" :title="copy.back" :aria-label="copy.back"><i class="ti ti-arrow-left" style="font-size:1.1rem"></i></button><button class="htk-btn htk-icon-sq" @click="showSearch=true" :title="copy.search" :aria-label="copy.search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button></div><h1 style="position:absolute;left:0;right:0;margin:0;text-align:center;pointer-events:none;font-size:1.5rem;font-weight:400;letter-spacing:.5px;font-family:'Righteous',system-ui,sans-serif">Hatask</h1><button class="htk-btn htk-icon-sq" @click="openHataskSettings()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button></div></header>

<!-- NAV (旗鯖fork v2: 上部ナビに一本化。モバイルでも上部・横スクロール。下部固定ナビは廃止し、
     戻るは左上ヘッダーへ。Hataskey UI下部ナビの非表示は body.hataskActive + data-htask-hidden で継続) -->
<nav v-if="!isHatakyu" class="htk-nav htk-nav-top htk-anim"><button v-for="tab in tabs" :key="tab.id" :class="['htk-nav-t',activeTab===tab.id&&'on']" @click="activeTab=tab.id"><span class="htk-ico"><i :class="tab.icon"></i></span>{{tab.label}}</button></nav>
<!-- 旗鯖fork(ハタキュ): タブは画鋲で留めた付箋。
     ⚠️チュートリアルのスポットライトは .htk-nav-top も探すので、セレクタ側に .hk-tabs を足してある。 -->
<nav v-else class="hk-tabs"><button v-for="tab in tabs" :key="tab.id" :class="['hk-tag',activeTab===tab.id&&'on']" @click="activeTab=tab.id"><i :class="tab.icon"></i>{{tab.label}}</button></nav>

<!-- ========== HOME (v2 デザイン最終形: 季/花信/刷 固定レイアウト) ========== -->
<div v-if="activeTab==='home'" class="htk-tabpage htk-home" :class="[tabDir==='fwd'?'htk-tab-fwd':'htk-tab-back',homeThemeClass]">

  <!-- ===================== 季 KISETSU (Editorial Mincho) ===================== -->
  <template v-if="(settings.theme||'kisetsu')==='kisetsu'">
    <div v-if="pendingRsvps.length" class="hk-rsvp">
      <div class="dept" :data-n="copy.rsvp">RSVP<i></i></div>
      <div v-for="r in pendingRsvps" :key="r.eventId" class="hk-rsvprow">
        <div><b>{{r.title}}</b><span class="hk-rsvptime">{{r.dateLabel}}</span></div>
        <div class="hk-rsvpbtns"><button :class="['hk-go',r.myStatus==='going'&&'on']" @click="setRsvp(r.eventId,'going')">{{copy.rsvpGoing}}</button><button :class="[r.myStatus==='maybe'&&'on']" @click="setRsvp(r.eventId,'maybe')">{{copy.rsvpMaybe}}</button><button :class="[r.myStatus==='declined'&&'on']" @click="setRsvp(r.eventId,'declined')">{{copy.rsvpDeclined}}</button></div>
      </div>
    </div>
    <div class="clock"><div class="ctime">{{currentTime}}</div><div class="cdate">{{clockMD}}<br>{{clockDow}}</div></div>
    <div class="dept" :data-n="copy.sectionOne">CONTINUITY<i></i></div>
    <div class="streak"><div class="snum">{{loginDays}}</div><div class="slab">{{copy.consecutiveDays}}</div><div v-if="loginRanking>0" class="srank"><i class="ti ti-trophy"></i>{{copy.serverRanking}} <b>{{copyx.rank({rank:loginRanking.toString()})}}</b> / {{copyx.people({count:loginTotal.toString()})}}</div></div>
    <div class="dept" :data-n="copy.sectionTwo">APPS<i></i></div>
    <div class="apps"><button v-for="a in homeApps" :key="a.label" class="app" @click="a.fn"><span class="ai" :style="{background:a.color}"><i :class="a.icon"></i></span><small>{{a.short}}</small></button></div>
    <div class="dept" :data-n="copy.sectionThree">SCHEDULE<i></i></div>
    <template v-if="upcomingEvents.length"><div v-for="ev in upcomingEvents.slice(0,4)" :key="ev.id" class="ev" @click="goToEvent(ev)"><span class="evdot" :style="{background:ev.color}"></span><span class="evd">{{evMD(ev.date)}}</span><span class="evt">{{ev.title}}</span><span class="evtime">{{eventTimeLabel(ev)}}</span></div></template>
    <div v-else class="hk-empty" @click="activeTab='cal'">{{copy.noEvents}}</div>
    <div class="two">
      <div><div class="dept" :data-n="copy.sectionFour">MOOD<i></i></div><div class="mood" @click="activeTab='mood'" style="cursor:pointer"><div v-for="(m,i) in weekMoods" :key="i" :class="['md',!m.icon&&'off']"><i :class="m.icon||'ti ti-minus'"></i><small>{{m.day}}</small></div></div></div>
      <div><div class="dept" :data-n="copy.sectionFive">GARDEN<i></i></div><div class="flow" @click="activeTab='garden'" style="cursor:pointer"><div class="fring"><svg viewBox="0 0 88 88"><circle cx="44" cy="44" r="38" fill="none" stroke="#e0dccf" stroke-width="7"/><circle cx="44" cy="44" r="38" fill="none" stroke="#a8552f" stroke-width="7" stroke-linecap="round" stroke-dasharray="239" :stroke-dashoffset="239-239*(flower.progress/100)"/></svg><div class="femo"><HataskEmoji :emoji="flower.emoji"/></div></div><div class="fname">{{currentFlowerDisplayName}}・{{flower.progress}}%</div></div></div>
    </div>
    <div class="dept" :data-n="copy.sectionSix">HATASK EYE<i></i></div>
    <div class="eye" @click="activeTab='eye'" style="cursor:pointer"><div class="eyel">EYE</div><div class="eyep">{{eyePhrase}}</div></div>
    <template v-for="x in forkSections" :key="x">
      <div v-if="x==='feedbackNotif'&&canAccessHataFeed" class="dept" :data-n="copy.sectionSeven">FEEDBACK<i></i></div>
      <div v-if="x==='feedbackNotif'&&canAccessHataFeed" class="hk-fork">
        <div v-if="hfNotifs.length===0" class="hk-empty">{{copy.noNotifications}}</div>
		<button v-for="n in hfNotifs" :key="n.id" class="ev" :class="{'hk-unread':!n.isRead}" @click="onHfNotifClick(n)" style="width:100%;text-align:left;background:none;border:none;cursor:pointer;font-family:inherit"><i :class="['ti',hfIcon(n.type)]" style="color:var(--accent);min-width:20px"></i><HataFeedNotificationBody class="evt" :text="notificationDisplayMessage(n)"/></button>
      </div>
      <div v-if="x==='earthquake'" class="dept" :data-n="copy.sectionEight">EARTHQUAKE<i></i></div>
      <div v-if="x==='earthquake'" class="hk-fork">
        <div style="font-size:.7rem;color:var(--fg-3);margin-bottom:6px">気象庁発表の情報を表示します</div>
        <MkEarthquakeTicker v-if="rawQuakes.length" :quakes="rawQuakes" :tsunami="tsunami" mode="compact" :showEmpty="false" @click="openEarthquake" style="cursor:pointer"/>
        <div v-else class="hk-empty">最近の地震情報はありません</div>
      </div>
      <div v-if="x==='meal'" class="dept" :data-n="copy.sectionNine">MEAL<i></i></div>
      <div v-if="x==='meal'" class="hk-fork" @click="activeTab='meal'" style="cursor:pointer"><div class="hk-mealmsg">{{mealSummaryMessage}}</div><div style="font-size:.78rem;color:var(--fg-3)">{{copyx.mealTodayTap({count:mealTodayCount.toString()})}}</div></div>
    </template>
  </template>

  <!-- ===================== 花信 KASHIN (Vivid Pop Bento) ===================== -->
  <template v-else-if="(settings.theme||'kisetsu')==='kashin'">
    <div class="bento">
      <div v-if="pendingRsvps.length" class="cell c-rsvp span2">
        <div class="clabel"><i class="ti ti-mail"></i> {{copy.rsvp}}</div>
        <div v-for="r in pendingRsvps" :key="r.eventId" class="kb-rsvprow"><b>{{r.title}}</b> <span style="opacity:.85;font-size:.75rem">{{r.dateLabel}}</span><div class="kb-rsvpbtns"><button :class="[r.myStatus==='going'&&'on']" @click="setRsvp(r.eventId,'going')">{{copy.rsvpGoing}}</button><button :class="[r.myStatus==='maybe'&&'on']" @click="setRsvp(r.eventId,'maybe')">{{copy.rsvpMaybeShort}}</button><button :class="[r.myStatus==='declined'&&'on']" @click="setRsvp(r.eventId,'declined')">{{copy.rsvpDeclined}}</button></div></div>
      </div>
      <div class="cell c-clock span2"><div class="ctime">{{currentTime}}</div><div class="cdate">{{currentDate}}</div></div>
      <div class="cell c-streak"><div class="clabel"><i class="ti ti-flame"></i> {{copy.continuity}}</div><div class="snum">{{loginDays}}</div><div class="slab">{{copy.dayNumber}}</div><div v-if="loginRanking>0" class="srank"><i class="ti ti-trophy"></i>{{copyx.rank({rank:loginRanking.toString()})}} / {{loginTotal}}</div></div>
      <div class="cell c-flow" @click="activeTab='garden'" style="cursor:pointer"><div class="clabel"><i class="ti ti-flower"></i> {{copy.tabGarden}}</div><div class="fring"><svg viewBox="0 0 76 76"><circle cx="38" cy="38" r="32" fill="none" stroke="#f0e4d2" stroke-width="7"/><circle cx="38" cy="38" r="32" fill="none" stroke="#12a89c" stroke-width="7" stroke-linecap="round" stroke-dasharray="201" :stroke-dashoffset="201-201*(flower.progress/100)"/></svg><div class="femo"><HataskEmoji :emoji="flower.emoji"/></div></div><div class="fname">{{currentFlowerDisplayName}} {{flower.progress}}%</div></div>
      <div class="cell c-apps span2"><div class="clabel"><i class="ti ti-apps"></i> {{copy.hataApps}}</div><div class="apps"><button v-for="a in homeApps" :key="a.label" class="app" @click="a.fn"><span class="ai" :style="{background:a.color}"><i :class="a.icon"></i></span><small>{{a.short}}</small></button></div></div>
      <div class="cell c-ev span2" @click="activeTab='cal'" style="cursor:pointer"><div class="clabel"><i class="ti ti-calendar"></i> {{copy.upcomingSchedule}}</div><template v-if="upcomingEvents.length"><div v-for="ev in upcomingEvents.slice(0,3)" :key="ev.id" class="ev" @click.stop="goToEvent(ev)"><span class="evd">{{evMD(ev.date)}}</span><span class="evt">{{ev.title}}</span><span class="evtime">{{eventTimeLabel(ev)}}</span></div></template><div v-else style="font-size:.8rem;opacity:.9;padding:6px 0">{{copy.noEvents}}</div></div>
      <div class="cell c-mood" @click="activeTab='mood'" style="cursor:pointer"><div class="clabel"><i class="ti ti-mood-smile"></i> {{copy.tabMood}}</div><div class="mood"><div v-for="(m,i) in weekMoods" :key="i" :class="['md',!m.icon&&'off']"><i :class="m.icon||'ti ti-minus'"></i><small>{{m.day}}</small></div></div></div>
      <div class="cell c-eye" @click="activeTab='eye'" style="cursor:pointer"><div class="clabel"><i class="ti ti-eye"></i> Hatask Eye</div><div class="eyep">{{eyePhrase}}</div></div>
      <div v-if="canAccessHataFeed" class="cell c-fork span2"><div class="clabel"><i class="ti ti-message-report"></i> {{copy.hataFeedNotifications}}</div><div v-if="hfNotifs.length===0" style="font-size:.8rem;opacity:.7;padding:4px 0">{{copy.noNotifications}}</div><button v-for="n in hfNotifs" :key="n.id" class="ev" @click="onHfNotifClick(n)" style="width:100%;text-align:left;background:none;border:none;cursor:pointer;font-family:inherit;color:inherit"><i :class="['ti',hfIcon(n.type)]" style="min-width:20px"></i><HataFeedNotificationBody class="evt" :text="notificationDisplayMessage(n)"/></button></div>
      <div class="cell c-fork2 span2"><div class="clabel"><i class="ti ti-activity"></i> 地震・津波情報 <span style="font-weight:400;font-size:.6rem;opacity:.7">（気象庁発表）</span></div><MkEarthquakeTicker v-if="rawQuakes.length" :quakes="rawQuakes" :tsunami="tsunami" mode="compact" :showEmpty="false" @click="openEarthquake" style="cursor:pointer"/><div v-else style="font-size:.8rem;opacity:.7;padding:4px 0">最近の地震情報はありません</div></div>
    </div>
  </template>

  <!-- ===================== ハタキュ HATAKYU (Cork Board) ===================== -->
  <template v-else-if="isHatakyu">
    <!-- 麻ひもに吊るした写真。タップで各タブへ飛ぶ。 -->
    <div class="hk-twine">
      <div class="hk-hangrow">
        <button class="hk-hang" style="--i:0;--r:-2deg" @click="activeTab='mood'"><span class="hk-peg"></span><span class="hk-photo"><img :src="hkAsset('waving')" alt="" draggable="false"><span class="hk-cap">{{copy.hkCapWelcome}}</span></span></button>
        <button class="hk-hang" style="--i:1;--r:1.6deg" @click="activeTab='cal'"><span class="hk-peg"></span><span class="hk-photo"><img :src="hkAsset('checkingTime')" alt="" draggable="false"><span class="hk-cap">{{copy.hkCapSchedule}}</span></span></button>
        <button class="hk-hang" style="--i:2;--r:-1.2deg" @click="activeTab='garden'"><span class="hk-peg"></span><span class="hk-photo"><img :src="hkAsset('wateringFlower')" alt="" draggable="false"><span class="hk-cap">{{copy.hkCapGarden}}</span></span></button>
        <button class="hk-hang" style="--i:3;--r:2.2deg" @click="activeTab='meal'"><span class="hk-peg"></span><span class="hk-photo"><img :src="hkAsset('chefCooking')" alt="" draggable="false"><span class="hk-cap">{{copy.hkCapMeal}}</span></span></button>
      </div>
    </div>

    <div class="hk-masonry">
      <div v-if="pendingRsvps.length" class="hk-pin" style="--i:0;--r:-1.5deg"><span class="hk-tack hk-y"></span>
        <div class="hk-card hk-cream"><div class="hk-jl"><i class="ti ti-mail"></i>{{copy.rsvp}}</div>
          <div v-for="r in pendingRsvps" :key="r.eventId" class="hk-rsvp-row">
            <div class="hk-rsvp-ttl"><b>{{r.title}}</b><span>{{r.dateLabel}}</span></div>
            <div class="hk-rsvp-btns"><button :class="[r.myStatus==='going'&&'on']" @click="setRsvp(r.eventId,'going')">{{copy.rsvpGoing}}</button><button :class="[r.myStatus==='maybe'&&'on']" @click="setRsvp(r.eventId,'maybe')">{{copy.rsvpMaybeShort}}</button><button :class="[r.myStatus==='declined'&&'on']" @click="setRsvp(r.eventId,'declined')">{{copy.rsvpDeclined}}</button></div>
          </div>
        </div>
      </div>
      <div class="hk-pin" style="--i:1;--r:-1.1deg"><span class="hk-tack"></span>
        <div class="hk-card"><div class="hk-k"><i class="ti ti-clock"></i>NOW</div><div class="hk-clock">{{currentTime}}</div><div class="hk-dt">{{currentDate}}</div></div>
      </div>
      <div class="hk-pin" style="--i:2;--r:1.4deg"><span class="hk-tack hk-y"></span>
        <div class="hk-card hk-cream"><div class="hk-jl"><i class="ti ti-flame"></i>{{copy.consecutiveDays}}</div><div class="hk-big">{{loginDays}}<small>&nbsp;{{copy.dayNumber}}</small></div><div v-if="loginRanking>0" class="hk-sub"><i class="ti ti-trophy"></i>{{copy.serverRanking}} {{copyx.rank({rank:loginRanking.toString()})}} / {{copyx.people({count:loginTotal.toString()})}}</div></div>
      </div>
      <div class="hk-pin" style="--i:3;--r:-.7deg"><span class="hk-tack hk-b"></span>
        <div class="hk-card"><div class="hk-jl"><i class="ti ti-apps"></i>{{copy.hataApps}}</div>
          <div class="hk-apps"><button v-for="a in homeApps" :key="a.label" class="hk-appb" @click="a.fn"><span class="hk-ai" :style="{background:a.color}"><i :class="a.icon"></i></span><small>{{a.short}}</small></button></div>
        </div>
      </div>
      <div class="hk-pin" style="--i:4;--r:.9deg"><span class="hk-tack hk-g"></span>
        <div class="hk-card"><div class="hk-jl"><i class="ti ti-calendar-event"></i>{{copy.upcomingSchedule}}</div>
          <template v-if="upcomingEvents.length"><button v-for="ev in upcomingEvents.slice(0,3)" :key="ev.id" class="hk-row" @click="goToEvent(ev)"><span class="hk-dot" :style="{background:ev.color}"></span><span class="hk-row-t">{{ev.title}}</span><b>{{evMD(ev.date)}} {{eventTimeLabel(ev)}}</b></button></template>
          <div v-else class="hk-note">{{copy.noEvents}}</div>
        </div>
      </div>
      <div class="hk-pin" style="--i:5;--r:-1.6deg"><span class="hk-tack hk-p"></span>
        <button class="hk-card hk-blue hk-cardbtn" @click="activeTab='mood'"><div class="hk-jl"><i class="ti ti-mood-smile"></i>{{copy.tabMood}}</div>
          <div class="hk-moods"><span v-for="(m,i) in weekMoods" :key="i"><i :class="[m.icon||'ti ti-point',!m.icon&&'off']"></i><small>{{m.day}}</small></span></div>
        </button>
      </div>
      <div class="hk-pin" style="--i:6;--r:1.1deg"><span class="hk-tack"></span>
        <button class="hk-card hk-mint hk-cardbtn" @click="activeTab='garden'"><div class="hk-jl"><i class="ti ti-flower"></i>{{copy.tabGarden}}</div>
          <span class="hk-ring"><svg viewBox="0 0 104 104"><circle cx="52" cy="52" r="45" fill="none" stroke="rgba(120,90,50,.22)" stroke-width="6"/><circle cx="52" cy="52" r="45" fill="none" stroke="#43976a" stroke-width="6" stroke-linecap="round" stroke-dasharray="283" :stroke-dashoffset="283-283*(flower.progress/100)"/></svg><span class="hk-ring-mid"><img :src="hkAsset('wateringFlower')" alt="" draggable="false"></span></span>
          <div class="hk-sub hk-center"><i class="ti ti-plant-2"></i>{{currentFlowerDisplayName}}・{{flower.progress}}%</div>
        </button>
      </div>
      <div class="hk-pin" style="--i:7;--r:-.5deg"><span class="hk-tack hk-b"></span>
        <button class="hk-card hk-cardbtn" @click="activeTab='meal'"><div class="hk-jl"><i class="ti ti-bowl"></i>{{copy.tabMeal}}</div>
          <span v-for="m in hkTodayMeals" :key="m.id" class="hk-row"><i :class="mealSlotInfo(m.slot).emoji"></i><span class="hk-row-t">{{mealSlotInfo(m.slot).label}} · {{mealLevelInfo(m.level).label}}</span><b>{{m.time}}</b></span>
          <div class="hk-note">{{mealSummaryMessage}}</div>
        </button>
      </div>
      <div v-if="canAccessHataFeed" class="hk-pin" style="--i:8;--r:1.7deg"><span class="hk-tack hk-y"></span>
        <div class="hk-card"><div class="hk-jl"><i class="ti ti-message-report"></i>{{copy.hataFeedNotifications}}</div>
          <button v-for="n in hfNotifs" :key="n.id" class="hk-row" @click="onHfNotifClick(n)"><i :class="['ti',hfIcon(n.type)]"></i><HataFeedNotificationBody class="hk-row-t" :text="notificationDisplayMessage(n)"/></button>
          <div v-if="hfNotifs.length===0" class="hk-note">{{copy.noNotifications}}</div>
        </div>
      </div>
      <div class="hk-pin" style="--i:9;--r:-1.3deg"><span class="hk-tack"></span>
        <div class="hk-card"><div class="hk-jl"><i class="ti ti-activity"></i>{{copy.earthquakeAndTsunami}}</div>
          <MkEarthquakeTicker v-if="rawQuakes.length" :quakes="rawQuakes" :tsunami="tsunami" mode="compact" :showEmpty="false" @click="openEarthquake" style="cursor:pointer"/>
          <div v-else class="hk-note">{{copy.noRecentEarthquakes}}</div>
          <div class="hk-note">{{copy.jmaSourceNote}}</div>
        </div>
      </div>
      <div class="hk-pin" style="--i:10;--r:.6deg"><span class="hk-tack hk-p"></span>
        <button class="hk-card hk-cream hk-cardbtn" @click="activeTab='eye'"><div class="hk-k"><i class="ti ti-eye"></i>HATASK EYE</div><div class="hk-quote">{{eyePhrase}}</div></button>
      </div>
      <div v-if="canUseMascot&&mascotCardUrl" class="hk-pin" style="--i:11;--r:-2deg"><span class="hk-tack hk-g"></span>
        <div class="hk-card"><div class="hk-jl"><i class="ti ti-mood-happy"></i>{{copy.mascot}}</div>
          <div class="hk-mascot"><img :src="mascotCardUrl" alt="" draggable="false"><div><div class="hk-mascot-n">{{mascotCardName}}</div><div class="hk-note">{{mascotCardPhrase}}</div></div></div>
        </div>
      </div>
    </div>
  </template>

  <!-- ===================== 刷 SURI (Riso Zine) ===================== -->
  <template v-else>
    <div class="in">
      <div v-if="pendingRsvps.length" class="su-rsvp">
        <div class="head">RSVP<b>{{copy.rsvp}}</b><i></i></div>
        <div v-for="r in pendingRsvps" :key="r.eventId" class="su-rsvprow"><span class="sqd"></span><b>{{r.title}}</b><span style="margin-left:auto;font-size:.72rem;font-weight:700;color:#2a52c0">{{r.dateLabel}}</span></div>
	        <div class="su-rsvpbtns"><button :class="[pendingRsvps[0].myStatus==='going'&&'on']" @click="setRsvp(pendingRsvps[0].eventId,'going')">{{copy.rsvpGoing}}</button><button :class="[pendingRsvps[0].myStatus==='maybe'&&'on']" @click="setRsvp(pendingRsvps[0].eventId,'maybe')">{{copy.rsvpMaybeShort}}</button><button :class="[pendingRsvps[0].myStatus==='declined'&&'on']" @click="setRsvp(pendingRsvps[0].eventId,'declined')">{{copy.rsvpDeclined}}</button></div>
      </div>
      <div class="clock"><div class="ctime">{{currentTime}}</div><div class="cdate">{{clockDot}}<br>{{clockEn}}</div></div>
      <div class="head">CONTINUITY<b>{{copy.continuity}}</b><i></i></div>
      <div class="streak"><div class="snum">{{loginDays}}</div><div class="slab">{{copy.dayNumber}}</div><div v-if="loginRanking>0" class="srank">SERVER <b>#{{loginRanking}}</b> / {{loginTotal}}</div></div>
      <div class="head">APPS<b>{{copy.hataApps}}</b><i></i></div>
      <div class="apps"><button v-for="(a,ai) in homeApps" :key="a.label" class="app" @click="a.fn"><span class="ai" :style="{background:['#12a89c','#ffe14f','#ff4f9a','#2a52c0'][ai%4]}"><i :class="a.icon"></i></span><small>{{a.short}}</small></button></div>
      <div class="head">SCHEDULE<b>{{copy.schedule}}</b><i></i></div>
      <template v-if="upcomingEvents.length"><div v-for="(ev,ei) in upcomingEvents.slice(0,4)" :key="ev.id" class="ev" @click="goToEvent(ev)"><span class="sqd" :style="{background:['#ff4f9a','#2a52c0','#ffe14f'][ei%3]}"></span><span class="evd">{{evMD(ev.date)}}</span><span class="evt">{{ev.title}}</span><span class="evtime">{{eventTimeLabel(ev)}}</span></div></template>
      <div v-else class="su-empty" @click="activeTab='cal'">{{copy.noEvents}}</div>
      <div class="two">
        <div class="box"><div class="head">MOOD<b>{{copy.mood}}</b></div><div class="mood" @click="activeTab='mood'" style="cursor:pointer"><div v-for="(m,i) in weekMoods" :key="i" :class="['md',!m.icon&&'off']"><i :class="m.icon||'ti ti-minus'"></i><small>{{m.day}}</small></div></div></div>
        <div class="box" @click="activeTab='garden'" style="cursor:pointer"><div class="head">GARDEN<b>{{copy.garden}}</b></div><div class="flow"><div class="fring"><svg viewBox="0 0 74 74"><circle cx="37" cy="37" r="31" fill="none" stroke="#ded7c4" stroke-width="7"/><circle cx="37" cy="37" r="31" fill="none" stroke="#ff4f9a" stroke-width="7" stroke-dasharray="195" :stroke-dashoffset="195-195*(flower.progress/100)"/></svg><div class="femo"><HataskEmoji :emoji="flower.emoji"/></div></div><div class="fname">{{currentFlowerDisplayName}} {{flower.progress}}%</div></div></div>
      </div>
      <div class="head">HATASK EYE<b>{{copy.eye}}</b><i></i></div>
      <div class="eye" @click="activeTab='eye'" style="cursor:pointer"><div class="eyel">EYE <i></i></div><div class="eyep">{{eyePhrase}}</div></div>
      <template v-if="canAccessHataFeed">
        <div class="head">FEEDBACK<b>{{copy.notifications}}</b><i></i></div>
        <div v-if="hfNotifs.length===0" class="su-empty">{{copy.noNotifications}}</div>
        <button v-for="n in hfNotifs" :key="n.id" class="ev" @click="onHfNotifClick(n)" style="width:100%;text-align:left;background:none;border:none;cursor:pointer;font-family:inherit;color:inherit"><i :class="['ti',hfIcon(n.type)]" style="color:#2a52c0;min-width:20px"></i><HataFeedNotificationBody class="evt" :text="notificationDisplayMessage(n)"/></button>
      </template>
      <div class="head">EARTHQUAKE<b>地震</b><i></i></div>
      <div style="font-size:.68rem;color:#5a5a6a;margin-bottom:6px">気象庁発表の情報を表示します</div>
      <MkEarthquakeTicker v-if="rawQuakes.length" :quakes="rawQuakes" :tsunami="tsunami" mode="compact" :showEmpty="false" @click="openEarthquake" style="cursor:pointer"/>
      <div v-else class="su-empty">最近の地震情報はありません</div>
      <div class="head">MEAL<b>{{copy.tabMeal}}</b><i></i></div>
      <div class="su-meal" @click="activeTab='meal'" style="cursor:pointer"><b>{{mealSummaryMessage}}</b><span style="font-size:.72rem;font-weight:700;color:#2a52c0">{{copyx.todayCount({count:mealTodayCount.toString()})}}</span></div>
    </div>
  </template>

</div>

<!-- ========== CALENDAR ========== -->
<div v-if="activeTab==='cal'" class="htk-tabpage" :class="[isHatakyu?'hk-panels':'htk-panels',tabDir==='fwd'?'htk-tab-fwd':'htk-tab-back']">
  <!-- 旗鯖fork(ハタキュ): つぎの予定までを写真付きの紙で貼る。⚠️予定が無いときは紙ごと出さない。 -->
  <div v-if="isHatakyu&&hkNextEvent" class="hk-pin" style="--i:0;--r:-1.1deg"><span class="hk-tack hk-b"></span>
    <div class="hk-card hk-blue hk-center">
      <img class="hk-hero" :src="hkAsset('checkingTime')" alt="" draggable="false">
      <div class="hk-jl hk-center"><i class="ti ti-clock-hour-4"></i>{{copy.hkUntilNextEvent}}</div>
      <div class="hk-big">{{hkNextEventDays}}<small>&nbsp;{{copy.hkDaysUnit}}</small></div>
      <div class="hk-note">{{evMD(hkNextEvent.date)}} {{eventTimeLabel(hkNextEvent)}}「{{hkNextEvent.title}}」</div>
    </div>
  </div>
  <div class="htk-lg htk-anim"><div class="htk-gc">
    <div class="htk-cal-seg" style="margin-bottom:8px"><button :class="['htk-btn htk-xs',calViewMode==='calendar'&&'htk-sb-on']" @click="calViewMode='calendar'"><i class="ti ti-calendar"></i> {{copy.tabCalendar}}</button><button :class="['htk-btn htk-xs',calViewMode==='list'&&'htk-sb-on']" @click="calViewMode='list'"><i class="ti ti-list"></i> {{copy.list}}</button></div>
    <template v-if="calViewMode==='calendar'">
    <div class="htk-cal-hd"><div class="htk-cal-nav"><button class="htk-cal-nb" @click="chMo(-1)">&lt;</button></div><div class="htk-cal-ttl">{{calendarTitle}}</div><div class="htk-cal-nav"><button class="htk-cal-nb" @click="chMo(1)">&gt;</button><button class="htk-cal-nb" @click="goToday">●</button></div></div>
    <div class="htk-cal-wk"><div v-for="(d,i) in calendarWeekdays" :key="i" :class="['htk-cal-wk-d',i===5&&'sat',i===6&&'sun']">{{d}}</div></div>
    <div class="htk-cal-days"><div v-for="(cell,i) in calCells" :key="i" :class="['htk-cal-d',cell.om&&'om',cell.today&&'td',cell.selected&&'sel']" @click="!cell.om&&selectDay(cell.day)"><span>{{cell.day}}</span><div v-if="cell.dots&&cell.dots.length" class="htk-cal-dots"><span v-for="(dot,di) in cell.dots" :key="di" class="htk-cal-dot" :style="{background:dot.color}"></span></div></div></div>
    </template>
    <template v-else>
      <div class="htk-cal-hd"><div class="htk-cal-nav"><button class="htk-cal-nb" @click="chMo(-1)">&lt;</button></div><div class="htk-cal-ttl">{{calendarTitle}}</div><div class="htk-cal-nav"><button class="htk-cal-nb" @click="chMo(1)">&gt;</button><button class="htk-cal-nb" @click="goToday">●</button></div></div>
      <div style="display:flex;gap:4px;margin:8px 0;flex-wrap:wrap">
        <button :class="['htk-btn htk-xs',calListMode==='day'&&'htk-sb-on']" @click="calListMode='day';calListPage=1">{{copy.day}}</button>
        <button :class="['htk-btn htk-xs',calListMode==='week'&&'htk-sb-on']" @click="calListMode='week';calListPage=1">{{copy.week}}</button>
        <button :class="['htk-btn htk-xs',calListMode==='month'&&'htk-sb-on']" @click="calListMode='month';calListPage=1">{{copy.month}}</button>
        <span style="flex:1"></span>
        <button :class="['htk-btn htk-xs',calListSort==='asc'&&'htk-sb-on']" @click="calListSort='asc';calListPage=1">{{copy.oldestFirst}}</button>
        <button :class="['htk-btn htk-xs',calListSort==='desc'&&'htk-sb-on']" @click="calListSort='desc';calListPage=1">{{copy.newestFirst}}</button>
      </div>
      <div v-for="ev in pagedCalList" :key="ev.id" :class="['htk-dayev-row',viewingEvent?.id===ev.id&&'active']" @click="openEventDetail(ev)">
        <div class="htk-dayev-dot" :style="{background:ev.color}"></div>
        <div class="htk-dayev-body">
          <div class="htk-dayev-title"><HataskEmoji :emoji="ev.emoji"/> {{ev.title}}<span v-if="ev.isShared" style="opacity:.4;font-size:.78em;margin-left:6px">@{{ev.username}}</span></div>
          <div class="htk-dayev-time">{{eventDateTimeLabel(ev)}}</div>
        </div>
      </div>
      <div v-if="!calListEvents.length" class="htk-empty"><div class="htk-empI"><i class="ti ti-circle-off"></i></div><div>{{copy.noEventsInPeriod}}</div></div>
      <div v-if="calListTotalPages>1" class="htk-pager"><button class="htk-btn htk-xs" :disabled="calListPage<=1" @click="calListPage--">&lt;</button><span class="htk-pager-t">{{calListPage}} / {{calListTotalPages}}</span><button class="htk-btn htk-xs" :disabled="calListPage>=calListTotalPages" @click="calListPage++">&gt;</button></div>
    </template>
  </div></div>

  <template v-if="calViewMode==='calendar'">
  <div v-if="selectedDay&&eventsForDay.length" class="htk-lg htk-anim"><div class="htk-gc">
    <h3 class="htk-sec-title">{{copyx.eventsOnDate({date:selectedDateLabel})}}</h3>
    <div v-for="ev in pagedEvents" :key="ev.id">
      <div :class="['htk-dayev-row',viewingEvent?.id===ev.id&&'active']" @click="openEventDetail(ev)">
        <div class="htk-dayev-dot" :style="{background:ev.color}"></div>
        <div class="htk-dayev-body">
          <div class="htk-dayev-title"><HataskEmoji :emoji="ev.emoji"/> {{ev.title}}<span v-if="ev.isShared" style="opacity:.4;font-size:.78em;margin-left:6px">@{{ev.username}}</span></div>
          <div class="htk-dayev-time">{{eventTimeLabel(ev)}}</div>
        </div>
        <div class="htk-dayev-chevron"><i class="ti" :class="viewingEvent?.id===ev.id?'ti-chevron-up':'ti-chevron-down'"></i></div>
      </div>
      <!-- ===== EVENT DETAIL PANEL ===== -->
      <div v-if="viewingEvent?.id===ev.id" class="htk-evdet">
        <div class="htk-evdet-hdr">
          <div class="htk-evdet-meta">
            <div class="htk-evdet-sub">
              <i class="ti ti-calendar-event"></i> {{eventDateRangeLabel(ev)}}
              <span v-if="!ev.allDay && ev.timeStart"> · <i class="ti ti-clock"></i> {{ev.timeStart}}{{ev.timeEnd?' - '+ev.timeEnd:''}}</span>
              <span v-else-if="ev.allDay"> · {{copy.allDay}}</span>
            </div>
            <div v-if="ev.isShared" class="htk-evdet-sub" style="margin-top:2px">{{copy.organizer}}: @{{ev.username}}</div>
          </div>
        </div>

        <!-- RSVP section: shared event with rsvp enabled -->
        <template v-if="sharedEventData(ev.id)?.rsvp">
          <!-- 主催者 view -->
          <template v-if="ev.userId===$i?.id">
            <div class="htk-evdet-sec-label">{{copy.rsvpDashboard}}</div>
            <div v-if="sharedEventData(ev.id)?.rsvpClosed" class="htk-rsvp-closed-badge" style="margin:4px 0 8px"><i class="ti ti-check"></i> {{copy.closed}}</div>
            <div v-else class="htk-rsvp-open-badge" style="margin:4px 0 8px"><i class="ti ti-circle-filled" style="color:#5a9a5a;font-size:.7em;vertical-align:middle;margin-right:3px"></i>{{copy.accepting}}</div>
            <div class="htk-rsvp-stats">
              <div class="htk-rsvp-stat-card going"><div class="htk-rsvp-stat-n">{{sharedRsvpResponses(ev.id).filter(r=>r.status==='going').length}}</div><div class="htk-rsvp-stat-l">{{copy.rsvpParticipation}}</div></div>
              <div class="htk-rsvp-stat-card maybe"><div class="htk-rsvp-stat-n">{{sharedRsvpResponses(ev.id).filter(r=>r.status==='maybe').length}}</div><div class="htk-rsvp-stat-l">{{copy.rsvpMaybe}}</div></div>
              <div class="htk-rsvp-stat-card declined"><div class="htk-rsvp-stat-n">{{sharedRsvpResponses(ev.id).filter(r=>r.status==='declined').length}}</div><div class="htk-rsvp-stat-l">{{copy.rsvpDeclined}}</div></div>
              <div class="htk-rsvp-stat-card total"><div class="htk-rsvp-stat-n">{{sharedRsvpResponses(ev.id).length}}</div><div class="htk-rsvp-stat-l">{{copy.total}}</div></div>
            </div>
            <div v-if="sharedRsvpResponses(ev.id).length" class="htk-rsvp-bar-wrap"><div class="htk-rsvp-bar">
              <div class="htk-rsvp-bar-seg going" :style="{width:(sharedRsvpResponses(ev.id).filter(r=>r.status==='going').length/sharedRsvpResponses(ev.id).length*100)+'%'}"></div>
              <div class="htk-rsvp-bar-seg maybe" :style="{width:(sharedRsvpResponses(ev.id).filter(r=>r.status==='maybe').length/sharedRsvpResponses(ev.id).length*100)+'%'}"></div>
              <div class="htk-rsvp-bar-seg declined" :style="{width:(sharedRsvpResponses(ev.id).filter(r=>r.status==='declined').length/sharedRsvpResponses(ev.id).length*100)+'%'}"></div>
            </div></div>
            <template v-if="sharedRsvpResponses(ev.id).length">
              <div v-if="sharedRsvpResponses(ev.id).filter(r=>r.status==='going').length" class="htk-rsvp-grp">
                <div class="htk-rsvp-grp-h"><span class="htk-rsvp-grp-dot going"></span>{{copy.rsvpParticipation}} ({{sharedRsvpResponses(ev.id).filter(r=>r.status==='going').length}})</div>
                <div class="htk-rsvp-grp-names"><span v-for="r in sharedRsvpResponses(ev.id).filter(r=>r.status==='going')" :key="r.userId" class="htk-rsvp-name">@{{r.username}}</span></div>
              </div>
              <div v-if="sharedRsvpResponses(ev.id).filter(r=>r.status==='maybe').length" class="htk-rsvp-grp">
                <div class="htk-rsvp-grp-h"><span class="htk-rsvp-grp-dot maybe"></span>{{copy.rsvpMaybe}} ({{sharedRsvpResponses(ev.id).filter(r=>r.status==='maybe').length}})</div>
                <div class="htk-rsvp-grp-names"><span v-for="r in sharedRsvpResponses(ev.id).filter(r=>r.status==='maybe')" :key="r.userId" class="htk-rsvp-name">@{{r.username}}</span></div>
              </div>
              <div v-if="sharedRsvpResponses(ev.id).filter(r=>r.status==='declined').length" class="htk-rsvp-grp">
                <div class="htk-rsvp-grp-h"><span class="htk-rsvp-grp-dot declined"></span>{{copy.rsvpDeclined}} ({{sharedRsvpResponses(ev.id).filter(r=>r.status==='declined').length}})</div>
                <div class="htk-rsvp-grp-names"><span v-for="r in sharedRsvpResponses(ev.id).filter(r=>r.status==='declined')" :key="r.userId" class="htk-rsvp-name">@{{r.username}}</span></div>
              </div>
            </template>
            <div v-else class="htk-rsvp-sum-empty">{{copy.noResponses}}</div>
            <button v-if="!sharedEventData(ev.id)?.rsvpClosed" class="htk-btn htk-sm htk-danger" style="margin-top:10px;width:100%" @click="closeRsvp(ev.id)">{{copy.closeRsvp}}</button>
          </template>
          <!-- 参加者 view -->
          <template v-else>
            <div class="htk-evdet-sec-label"><i class="ti ti-mail"></i> {{copy.rsvp}}</div>
            <div v-if="sharedEventData(ev.id)?.rsvpClosed" class="htk-rsvp-closed-badge" style="margin:4px 0 8px">{{copy.closed}}</div>
            <template v-else>
              <div class="htk-evdet-rsvp-btns">
                <button :class="['htk-rsvp-b','htk-rsvp-go',sharedRsvpMyStatus(ev.id)==='going'&&'on']" @click="setRsvp(ev.id,'going')"><i class="ti ti-check"></i> {{copy.rsvpGoing}}</button>
                <button :class="['htk-rsvp-b','htk-rsvp-maybe',sharedRsvpMyStatus(ev.id)==='maybe'&&'on']" @click="setRsvp(ev.id,'maybe')"><i class="ti ti-help-circle"></i> {{copy.rsvpMaybe}}</button>
                <button :class="['htk-rsvp-b','htk-rsvp-no',sharedRsvpMyStatus(ev.id)==='declined'&&'on']" @click="setRsvp(ev.id,'declined')"><i class="ti ti-x"></i> {{copy.rsvpDeclined}}</button>
              </div>
            </template>
            <div v-if="sharedRsvpResponses(ev.id).length" class="htk-evdet-resp-summary">
              <span style="opacity:.55;font-size:.78rem">{{copyx.rsvpSummary({going:sharedRsvpResponses(ev.id).filter(r=>r.status==='going').length.toString(),maybe:sharedRsvpResponses(ev.id).filter(r=>r.status==='maybe').length.toString(),declined:sharedRsvpResponses(ev.id).filter(r=>r.status==='declined').length.toString()})}}</span>
            </div>
          </template>
        </template>

        <!-- RSVP無し公開イベント（詳細のみ） -->
        <div v-else-if="ev.isShared" class="htk-evdet-note" style="opacity:.5;font-size:.8rem">{{copy.publicEventWithoutRsvp}}</div>

        <!-- Action buttons -->
        <div class="htk-evdet-acts">
          <template v-if="!ev.isShared || ev.userId===$i?.id">
            <button class="htk-btn htk-sm" @click="startEditEvent(ev);closeEventDetail()"><i class="ti ti-pencil"></i> {{copy.edit}}</button>
            <button class="htk-btn htk-sm htk-danger" @click="deleteEventById(ev.id);closeEventDetail()"><i class="ti ti-x"></i> {{copy.delete}}</button>
          </template>
        </div>
      </div>
    </div>
  </div></div>
  <div v-if="eventTotalPages>1" class="htk-pager"><button class="htk-btn htk-xs" :disabled="eventPage<=1" @click="eventPage--">&lt;</button><span class="htk-pager-t">{{eventPage}} / {{eventTotalPages}}</span><button class="htk-btn htk-xs" :disabled="eventPage>=eventTotalPages" @click="eventPage++">&gt;</button></div>
  <div v-else-if="selectedDay" class="htk-lg htk-anim"><div class="htk-gc" style="text-align:center;padding:16px">
    <div style="font-size:.85rem;color:var(--fg-3)">{{copyx.noEventsOnDate({date:selectedDateLabel})}}</div>
  </div></div>
  </template>

  <div class="htk-lg htk-anim"><div class="htk-gc">
    <h3 class="htk-sec-title">{{editingEvent?copy.editEvent:copy.newEvent}}</h3>
    <div class="htk-fg"><span class="htk-fl">{{copy.title}}</span><input class="htk-inp" v-model="newEvent.title" :placeholder="copy.eventTitlePlaceholder"></div>
    <div class="htk-fg"><span class="htk-fl">{{copy.emoji}}</span><div class="htk-emp-row"><span v-for="e in eventEmojis" :key="e" :class="['htk-emp-i',newEvent.emoji===e&&'on']" @click="newEvent.emoji=e"><HataskEmoji :emoji="e"/></span></div></div>
    <div class="htk-fg"><span class="htk-fl">{{copy.dateAndTime}}</span>
      <div class="htk-tg-row" style="margin-bottom:8px"><span class="htk-tg-lab">{{copy.allDayFull}}</span><button :class="['htk-tg-sw',newEvent.allDay&&'on']" @click="newEvent.allDay=!newEvent.allDay"></button></div>
      <div class="htk-fr"><input class="htk-inp" type="date" v-model="newEvent.date"><input v-if="!newEvent.allDay" class="htk-inp" type="time" v-model="newEvent.timeStart"></div>
      <div class="htk-fr" style="margin-top:5px"><input class="htk-inp" type="date" v-model="newEvent.dateEnd"><input v-if="!newEvent.allDay" class="htk-inp" type="time" v-model="newEvent.timeEnd"></div>
    </div>
    <div class="htk-fg"><span class="htk-fl">{{copy.color}}</span><div class="htk-clr-row"><div v-for="c in eventColors" :key="c" :class="['htk-clr-o',newEvent.color===c&&'on']" :style="{background:c}" @click="newEvent.color=c"></div></div></div>
    <div class="htk-fg"><span class="htk-fl">{{copy.visibility}}</span><div class="htk-vis-row"><div :class="['htk-vis-o',newEvent.visibility==='public'&&'on']" @click="newEvent.visibility='public'"><span class="htk-vi"><i class="ti ti-world"></i></span>{{copy.public}}</div><div :class="['htk-vis-o',newEvent.visibility==='private'&&'on']" @click="newEvent.visibility='private';newEvent.rsvp=false"><span class="htk-vi"><i class="ti ti-lock"></i></span>{{copy.private}}</div></div></div>
    <div class="htk-fg"><span class="htk-fl">{{copy.options}}</span><div class="htk-tg-row"><span class="htk-tg-lab">{{copy.rsvp}}</span><button :class="['htk-tg-sw',newEvent.rsvp&&'on']" :disabled="newEvent.visibility==='private'" :style="newEvent.visibility==='private'?'opacity:.35;cursor:not-allowed':''" @click="newEvent.visibility!=='private'&&(newEvent.rsvp=!newEvent.rsvp)"></button><span v-if="newEvent.visibility==='private'" style="font-size:.7rem;color:var(--text-3);margin-left:6px">{{copy.rsvpUnavailablePrivate}}</span></div>
    <div v-if="editingEvent && editingEvent.rsvp" class="htk-rsvp-summary">
      <div class="htk-rsvp-sum-header"><span class="htk-rsvp-sum-title">{{copy.rsvpDashboard}}</span></div>
      <div v-if="sharedEventData(editingEvent.id)?.rsvpClosed" class="htk-rsvp-closed-badge"><i class="ti ti-check"></i> {{copy.closed}}</div>
      <div v-else class="htk-rsvp-open-badge"><i class="ti ti-circle-filled" style="color:#5a9a5a;font-size:.7em;vertical-align:middle;margin-right:3px"></i>{{copy.accepting}}</div>
      <!-- Stats cards -->
      <div class="htk-rsvp-stats">
        <div class="htk-rsvp-stat-card going"><div class="htk-rsvp-stat-n">{{sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='going').length}}</div><div class="htk-rsvp-stat-l">{{copy.rsvpParticipation}}</div></div>
        <div class="htk-rsvp-stat-card maybe"><div class="htk-rsvp-stat-n">{{sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='maybe').length}}</div><div class="htk-rsvp-stat-l">{{copy.rsvpMaybe}}</div></div>
        <div class="htk-rsvp-stat-card declined"><div class="htk-rsvp-stat-n">{{sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='declined').length}}</div><div class="htk-rsvp-stat-l">{{copy.rsvpDeclined}}</div></div>
        <div class="htk-rsvp-stat-card total"><div class="htk-rsvp-stat-n">{{sharedRsvpResponses(editingEvent.id).length}}</div><div class="htk-rsvp-stat-l">{{copy.total}}</div></div>
      </div>
      <!-- Progress bar -->
      <div v-if="sharedRsvpResponses(editingEvent.id).length" class="htk-rsvp-bar-wrap">
        <div class="htk-rsvp-bar">
          <div class="htk-rsvp-bar-seg going" :style="{width:(sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='going').length/sharedRsvpResponses(editingEvent.id).length*100)+'%'}"></div>
          <div class="htk-rsvp-bar-seg maybe" :style="{width:(sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='maybe').length/sharedRsvpResponses(editingEvent.id).length*100)+'%'}"></div>
          <div class="htk-rsvp-bar-seg declined" :style="{width:(sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='declined').length/sharedRsvpResponses(editingEvent.id).length*100)+'%'}"></div>
        </div>
      </div>
      <!-- Respondent names by status -->
      <template v-if="sharedRsvpResponses(editingEvent.id).length">
        <div v-if="sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='going').length" class="htk-rsvp-grp">
          <div class="htk-rsvp-grp-h"><span class="htk-rsvp-grp-dot going"></span>{{copy.rsvpParticipation}} ({{sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='going').length}})</div>
          <div class="htk-rsvp-grp-names"><span v-for="r in sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='going')" :key="r.userId" class="htk-rsvp-name">@{{r.username}}</span></div>
        </div>
        <div v-if="sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='maybe').length" class="htk-rsvp-grp">
          <div class="htk-rsvp-grp-h"><span class="htk-rsvp-grp-dot maybe"></span>{{copy.rsvpMaybe}} ({{sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='maybe').length}})</div>
          <div class="htk-rsvp-grp-names"><span v-for="r in sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='maybe')" :key="r.userId" class="htk-rsvp-name">@{{r.username}}</span></div>
        </div>
        <div v-if="sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='declined').length" class="htk-rsvp-grp">
          <div class="htk-rsvp-grp-h"><span class="htk-rsvp-grp-dot declined"></span>{{copy.rsvpDeclined}} ({{sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='declined').length}})</div>
          <div class="htk-rsvp-grp-names"><span v-for="r in sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='declined')" :key="r.userId" class="htk-rsvp-name">@{{r.username}}</span></div>
        </div>
      </template>
      <div v-else class="htk-rsvp-sum-empty">{{copy.noResponses}}</div>
      <button v-if="!sharedEventData(editingEvent.id)?.rsvpClosed" class="htk-btn htk-sm htk-danger" style="margin-top:12px;width:100%" @click="closeRsvp(editingEvent.id)">{{copy.closeRsvp}}</button>
    </div><div class="htk-tg-row"><span class="htk-tg-lab">{{copy.notifications}}</span><button :class="['htk-tg-sw',newEvent.notify&&'on']" @click="newEvent.notify=!newEvent.notify"></button></div></div>
    <div v-if="newEvent.notify" class="htk-fg"><span class="htk-fl">{{copy.notificationTiming}}</span><div class="htk-nt-chips"><span v-for="nt in notifyTimings" :key="nt" :class="['htk-nt-chip',newEvent.notifyTimings.includes(nt)&&'on']" @click="toggleNotifyTiming(nt)">{{notifyTimingLabel(nt)}}</span></div></div>
    <div style="margin-top:14px;display:flex;gap:8px"><button class="htk-btn htk-primary" style="flex:1" @click="addEvent">{{editingEvent?copy.update:copy.save}}</button><button v-if="editingEvent" class="htk-btn" @click="editingEvent=null;newEvent.title=''">{{copy.cancel}}</button><button v-if="editingEvent" class="htk-btn htk-danger" @click="deleteEventById(editingEvent.id)">{{copy.delete}}</button></div>
  </div></div>
</div>

<!-- ========== TODO ========== -->
<div v-if="activeTab==='todo'" class="htk-tabpage" :class="[isHatakyu&&'hk-panels',tabDir==='fwd'?'htk-tab-fwd':'htk-tab-back']">
<!-- 旗鯖fork(ハタキュ): 今日片付いた分をほめる紙。 -->
<div v-if="isHatakyu" class="hk-pin" style="--i:0;--r:1.4deg"><span class="hk-tack hk-p"></span>
  <div class="hk-card hk-mint hk-center">
    <img class="hk-hero" :src="hkAsset('treasureFound')" alt="" draggable="false">
    <div class="hk-jl hk-center"><i class="ti ti-confetti"></i>{{copy.hkDoneToday}}</div>
    <div class="hk-big">{{hkTodayDoneCount}}<small>&nbsp;{{copy.hkItemsUnit}}</small></div>
    <div class="hk-note">{{copyx.hkRemainingToday({count:pendingCount.toString()})}}</div>
  </div>
</div>
<div class="htk-lg htk-anim"><div class="htk-gc">
  <h3 class="htk-sec-title">{{editingTodoId?copy.editTask:copy.todoList}}</h3>
  <!-- 旗鯖fork(ハタキュ): 入力欄の上でハタキュが一声かける。 -->
  <div v-if="isHatakyu" class="hk-inlinefig"><img :src="hkAsset('reviewingDocuments')" alt="" draggable="false"><div class="hk-note">{{copyx.hkRemainingToday({count:pendingCount.toString()})}}</div></div>
  <div class="htk-todo-inp-r hk-todo-inp"><input class="htk-inp" v-model="newTodo" :placeholder="editingTodoId?copy.editTaskPlaceholder:copy.newTaskPlaceholder" @keypress.enter="addTodo" style="flex:1"><button class="htk-btn htk-sm" @click="showTodoExtra=!showTodoExtra">{{copy.details}}</button><button class="htk-btn htk-primary htk-sm" @click="addTodo">{{editingTodoId?copy.update:copy.add}}</button><button v-if="editingTodoId" class="htk-btn htk-sm" @click="cancelEditTodo">{{copy.cancelEdit}}</button></div>
  <div :class="['htk-todo-xf',showTodoExtra&&'open']">
    <div class="htk-todo-xf-i"><label>{{copy.dueDate}}</label><input class="htk-inp" type="date" v-model="newTodoDue"></div>
    <div class="htk-todo-xf-i"><label>{{copy.time}}</label><input class="htk-inp" type="time" v-model="newTodoTime"></div>
    <div class="htk-todo-xf-i"><label>{{copy.folder}}</label><select class="htk-inp" v-model="newTodoFolder"><option value="">{{copy.noFolder}}</option><option v-for="fo in folders" :key="fo.id" :value="fo.id">{{fo.name}}</option></select></div>
    <div class="htk-todo-xf-i" style="flex:2;min-width:170px"><label>{{copy.comment}}</label><input class="htk-inp" v-model="newTodoComment" :placeholder="copy.memoPlaceholder"></div>
  </div>
  <div class="htk-fbar">
    <button :class="['htk-ftab',activeFolder==='all'&&'on']" @click="activeFolder='all'">{{copy.all}}<span class="htk-fc">{{pendingCount}}</span></button>
    <button v-for="fo in folders" :key="fo.id" :class="['htk-ftab',activeFolder===fo.id&&'on']" :style="fo.color?{borderLeft:'3px solid '+fo.color}:{}" @click="activeFolder=fo.id"><span v-if="fo.color" class="htk-fm-dot" :style="{background:fo.color}"></span><HataskEmoji :emoji="fo.emoji"/> {{fo.name}}<span class="htk-fc">{{folderCount(fo.id)}}</span></button>
    <button class="htk-fm-btn" @click="showFolderMgr=!showFolderMgr">+ {{copy.manageFolders}}</button>
  </div>
  <div v-if="showFolderMgr" class="htk-fm-panel htk-lg-in">
    <div style="font-size:.78rem;color:var(--text-2);margin-bottom:8px;font-weight:600">{{copy.manageFolders}}</div>
    <div v-for="(fo,i) in folders" :key="fo.id" class="htk-fm-row"><span v-if="fo.color" class="htk-fm-dot" :style="{background:fo.color}"></span><span class="htk-fm-emoji"><HataskEmoji :emoji="fo.emoji"/></span><span class="htk-fm-name">{{fo.name}}</span><div class="htk-fm-acts"><button class="htk-btn htk-xs" @click="changeFolderColor(i)" :title="copy.changeColor"><i class="ti ti-palette"></i></button><button class="htk-btn htk-xs" @click="renameFolder(i)"><i class="ti ti-pencil"></i></button><button class="htk-btn htk-xs" @click="moveFolder(i,-1)" :disabled="i===0"><i class="ti ti-chevron-up"></i></button><button class="htk-btn htk-xs" @click="moveFolder(i,1)" :disabled="i===folders.length-1"><i class="ti ti-chevron-down"></i></button><button class="htk-btn htk-xs htk-danger" @click="deleteFolder(i)"><i class="ti ti-x"></i></button></div></div>
    <div v-if="!folders.length" style="font-size:.78rem;color:var(--text-3);padding:6px">{{copy.noFolder}}</div>
    <div style="margin-top:6px">
      <div style="display:flex;gap:5px;align-items:center"><input class="htk-inp" v-model="newFolderName" :placeholder="copy.folderNamePlaceholder" style="flex:1;font-size:.78rem;padding:7px 12px"><button class="htk-btn htk-xs htk-primary" @click="addFolder">{{copy.add}}</button></div>
      <div class="htk-folder-clr-row"><span style="font-size:.7rem;color:var(--text-3)">{{copy.color}}:</span><div v-for="c in folderColors" :key="c.value" :class="['htk-folder-clr-o',newFolderColor===c.value&&'on']" :style="{background:c.value}" :title="c.label" @click="newFolderColor=c.value"></div><div :class="['htk-folder-clr-o htk-folder-clr-none',newFolderColor===''&&'on']" :title="copy.none" @click="newFolderColor=''">×</div></div>
    </div>
  </div>
  <div class="htk-sbar"><span class="htk-sbar-l">{{copy.sort}}:</span><button v-for="s in sortOptions" :key="s.id" :class="['htk-btn htk-xs',sortMode===s.id&&'htk-sb-on']" @click="sortMode=s.id">{{s.label}}</button></div>
  <div v-for="todo in pagedTodos" :key="todo.id" :class="['htk-todo-i',todo.done&&'done']">
    <div :class="['htk-todo-cb',todo.done&&'ck']" @click="toggleTodo(todo.id)"></div>
    <div class="htk-todo-ct" @click="expandedTodo=expandedTodo===todo.id?null:todo.id">
      <div class="htk-todo-tx">{{todo.text}}</div>
      <div class="htk-todo-mt"><span v-if="todo.due" :class="['htk-todo-db',isOverdue(todo.due)&&!todo.done&&'od',isDueToday(todo.due)&&'tdy']">{{formatDue(todo.due,todo.time)}}</span><span v-if="getFolder(todo.folder)&&activeFolder==='all'" class="htk-todo-fb"><HataskEmoji :emoji="getFolder(todo.folder)?.emoji ?? '📁'"/> {{getFolder(todo.folder)?.name}}</span></div>
      <div v-if="todo.comment" class="htk-todo-cp">{{todo.comment.split('\n')[0]}}</div>
      <div v-if="expandedTodo===todo.id" class="htk-todo-dx open"><div v-if="todo.comment" style="font-size:.78rem;color:var(--text-2);line-height:1.5;white-space:pre-wrap">{{todo.comment}}</div><div v-else style="font-size:.73rem;color:var(--text-3)">{{copy.noComment}}</div></div>
    </div>
    <div class="htk-todo-acts"><button class="htk-todo-ab" @click="editTodo(todo.id)"><i class="ti ti-pencil"></i></button><button class="htk-todo-ab del" @click="deleteTodo(todo.id)"><i class="ti ti-x"></i></button></div>
  </div>
  <div v-if="todoTotalPages>1" class="htk-pager"><button class="htk-btn htk-xs" :disabled="todoPage<=1" @click="todoPage--">&lt;</button><span class="htk-pager-t">{{todoPage}} / {{todoTotalPages}}</span><button class="htk-btn htk-xs" :disabled="todoPage>=todoTotalPages" @click="todoPage++">&gt;</button></div>
  <div v-if="!sortedTodos.length" class="htk-empty"><div class="htk-empI"><i class="ti ti-circle-off"></i></div><div>{{copy.noTasks}}</div></div>
</div></div></div>

<!-- ========== NOTIFICATIONS ========== -->


<!-- ========== MOOD ========== -->
<div v-if="activeTab==='mood'" class="htk-tabpage" :class="[isHatakyu?'hk-panels':'htk-panels',tabDir==='fwd'?'htk-tab-fwd':'htk-tab-back']">
  <div class="htk-lg htk-anim"><div class="htk-gc">
    <!-- 旗鯖fork(ハタキュ): 記録の前にハタキュが寄り添う絵を置く。 -->
    <img v-if="isHatakyu" class="hk-hero" :src="hkAsset('heartHug')" alt="" draggable="false">
    <h3 class="htk-sec-title">{{editingMood?copy.editMood:copy.recordMood}} <button class="htk-info-btn" @click="showMoodDisclaimer=true">?</button></h3>
    <div style="font-size:.72rem;opacity:.4;margin-bottom:10px">{{copy.moodShortDisclaimer}}</div>
    <div class="htk-mood-sc hk-mscale"><div v-for="m in moodOptions" :key="m.level" :class="['htk-mood-o',selectedMoodLevel===m.level&&'on']" @click="selectedMoodLevel=m.level"><span class="htk-mood-e"><i :class="m.icon"></i></span><span class="htk-mood-l">{{m.label}}</span></div></div>
    <div class="htk-coll-h" @click="showMoodNote=!showMoodNote"><span class="htk-fl" style="margin:0">{{copy.note}}</span><span class="htk-ci">{{showMoodNote?'▲':'▼'}}</span></div>
    <div v-if="showMoodNote">
      <div class="htk-fg" style="margin-top:5px"><textarea class="htk-inp" v-model="moodNote" :placeholder="copy.moodNotePlaceholder"></textarea></div>
      <div class="htk-fg"><span class="htk-fl">{{copy.emoji}}</span><div class="htk-emp-row"><span v-for="e in moodEmojisExtra" :key="e" :class="['htk-emp-i',moodSelectedEmoji===e&&'on']" @click="moodSelectedEmoji=moodSelectedEmoji===e?'':e"><HataskEmoji :emoji="e"/></span></div></div>
    </div>
    <div class="htk-coll-h" @click="showMoodRemind=!showMoodRemind"><span class="htk-fl" style="margin:0">{{copy.reminderNotification}}</span><span class="htk-ci">{{showMoodRemind?'▲':'▼'}}</span></div>
    <div v-if="showMoodRemind" style="padding-top:5px">
      <div class="htk-tg-row"><span class="htk-tg-lab">{{copy.reminder}}</span><button :class="['htk-tg-sw',settings.moodRemind&&'on']" @click="settings.moodRemind=!settings.moodRemind;saveSettings();scheduleMoodReminders()"></button></div>
      <div class="htk-nt-chips" style="margin-top:5px"><span v-for="t in moodRemindTimes" :key="t" :class="['htk-nt-chip',settings.moodRemindTimes?.includes(t)&&'on']" @click="toggleMoodRemindTime(t)">{{moodRemindTimeLabel(t)}}</span></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="htk-btn htk-primary" style="flex:1" @click="saveMood" :disabled="isSaving">{{isSaving?copy.saving:(editingMood?copy.update:copy.saveMood)}}</button><button v-if="editingMood" class="htk-btn" @click="cancelEditMood">{{copy.cancel}}</button></div>
  </div></div>

  <!-- MOOD ANALYSIS -->
  <div v-if="moods.length>=3" class="htk-lg htk-anim"><div class="htk-gc">
    <h3 class="htk-sec-title">{{copy.moodAnalysis}}</h3>
    <div class="htk-ma-grid">
      <div class="htk-ma-card">
        <div class="htk-ma-label">{{copy.recentTrend}}</div>
        <div class="htk-ma-big" :style="{color: moodAnalysis.trendColor}"><HataskEmoji :emoji="moodAnalysis.trendEmoji"/></div>
        <div class="htk-ma-desc">{{moodAnalysis.trendLabel}}</div>
      </div>
      <div class="htk-ma-card">
        <div class="htk-ma-label">{{copy.averageScore7Days}}</div>
        <div class="htk-ma-big">{{moodAnalysis.avgScore}}</div>
        <div class="htk-ma-bar"><div class="htk-ma-bar-fill" :style="{width: (moodAnalysis.avgScoreRaw/5*100)+'%', background: moodAnalysis.trendColor}"></div></div>
      </div>
    </div>
    <div class="htk-ma-section">
      <div class="htk-ma-label" style="margin-bottom:8px">{{copy.trendByTime}}</div>
      <div class="htk-ma-times">
        <div v-for="t in moodAnalysis.timeSlots" :key="t.label" class="htk-ma-time">
          <div class="htk-ma-time-emo"><HataskEmoji v-if="t.emoji" :emoji="t.emoji"/><span v-else>—</span></div>
          <div class="htk-ma-time-info">
            <div class="htk-ma-time-label">{{t.label}}</div>
            <div class="htk-ma-time-bar"><div class="htk-ma-time-fill" :style="{width: (t.avg/5*100)+'%', background: t.color}"></div></div>
          </div>
          <div class="htk-ma-time-score">{{t.avg.toFixed(1)}}</div>
        </div>
      </div>
    </div>
    <div v-if="moodAnalysis.insight" class="htk-ma-insight">
      <i class="ti ti-bulb" style="margin-right:5px;color:var(--accent)"></i>{{moodAnalysis.insight}}
    </div>
  </div></div>

  <div class="htk-lg htk-anim"><div class="htk-gc"><h3 class="htk-sec-title">{{copy.moodRecords}}</h3>
    <template v-if="moods.length"><div v-for="date in pagedMoodDates" :key="date" class="htk-mood-dg"><div class="htk-mood-dg-h">{{formatMoodDate(String(date))}}<span v-if="moodsByDate[date].length>1" class="htk-mood-dg-c">{{copyx.count({count:moodsByDate[date].length.toString()})}}</span></div><div v-for="m in moodsByDate[date]" :key="m.id" class="htk-mood-en"><div class="htk-mood-en-t">{{m.time}}</div><span class="htk-mood-en-e"><i :class="moodIcons[m.level]"></i></span><div class="htk-mood-en-ct"><div class="htk-mood-en-n">{{moodNoteLabel(m.note)}}</div><div v-if="m.emoji" class="htk-mood-en-ce"><HataskEmoji :emoji="m.emoji"/></div></div><div class="htk-mood-en-acts"><button class="htk-mood-en-a" @click="startEditMood(m)"><i class="ti ti-pencil"></i></button><button class="htk-mood-en-a del" @click="deleteMood(m.id)"><i class="ti ti-x"></i></button></div></div></div>
    <div v-if="moodTotalPages>1" class="htk-pager"><button class="htk-btn htk-xs" :disabled="moodPage<=1" @click="moodPage--">&lt;</button><span class="htk-pager-t">{{moodPage}} / {{moodTotalPages}}</span><button class="htk-btn htk-xs" :disabled="moodPage>=moodTotalPages" @click="moodPage++">&gt;</button></div>
    </template>
    <div v-else class="htk-empty"><div class="htk-empI"><i class="ti ti-circle-off"></i></div><div>{{copy.noRecordsYet}}</div></div>
  </div></div>
</div>

<!-- ========== MEAL(食事記録) ========== -->
<div v-if="activeTab==='meal'" class="htk-tabpage" :class="[isHatakyu?'hk-panels':'htk-panels',tabDir==='fwd'?'htk-tab-fwd':'htk-tab-back']">
  <div class="htk-lg htk-anim"><div class="htk-gc">
    <img v-if="isHatakyu" class="hk-hero" :src="hkAsset('chefCooking')" alt="" draggable="false">
    <h3 class="htk-sec-title">{{editingMeal?copy.editRecord:copy.recordMeal}} <button class="htk-info-btn" @click="showMealDisclaimerDialog">!</button></h3>
    <div style="font-size:.72rem;opacity:.4;margin-bottom:10px">{{copy.mealShortDisclaimer}}</div>
    <div class="htk-fg"><span class="htk-fl">{{copy.whichMeal}}</span><div class="htk-meal-slots"><div v-for="s in mealSlots" :key="s.id" :class="['htk-meal-slot',selectedMealSlot===s.id&&'on']" @click="selectedMealSlot=s.id"><span class="htk-meal-slot-e"><i :class="s.emoji"></i></span><span class="htk-meal-slot-l">{{s.label}}</span></div></div></div>
    <div class="htk-fg"><span class="htk-fl">{{copy.howWasMeal}}</span><div class="htk-meal-levels"><div v-for="l in mealLevels" :key="l.id" :class="['htk-meal-level',selectedMealLevel===l.id&&'on']" :style="selectedMealLevel===l.id?{borderColor:l.color,background:l.color+'22'}:{}" @click="selectedMealLevel=l.id"><span class="htk-meal-level-e"><i :class="l.emoji"></i></span><span class="htk-meal-level-l">{{l.label}}</span></div></div></div>
    <!-- 理由は「少しだけ」「食べれなかった」のときだけ任意で。複数選択可。スキップしてもOK -->
    <div v-if="selectedMealLevel!=='ate'" class="htk-fg"><span class="htk-fl">{{copy.optionalMealReasons}}</span><div class="htk-meal-reasons"><span v-for="r in mealReasons" :key="r" :class="['htk-meal-reason',selectedMealReasons.includes(r)&&'on']" @click="toggleMealReason(r)">{{mealReasonLabel(r)}}</span></div></div>
    <div class="htk-fg"><span class="htk-fl">{{copy.optionalNote}}</span><textarea class="htk-inp" v-model="mealNote" :placeholder="copy.mealNotePlaceholder"></textarea></div>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="htk-btn htk-primary" style="flex:1" @click="saveMeal" :disabled="isSaving">{{isSaving?copy.saving:(editingMeal?copy.update:copy.record)}}</button><button v-if="editingMeal" class="htk-btn" @click="cancelEditMeal">{{copy.cancel}}</button></div>
  </div></div>

  <!-- MEAL SUMMARY: 数値評価はしない。記録した行為を中立に労うのみ -->
  <div v-if="settings.showMealSummary!==false" class="htk-lg htk-anim"><div class="htk-gc" style="text-align:center">
    <div class="htk-meal-summary">{{mealSummaryMessage}}</div>
  </div></div>

  <div class="htk-lg htk-anim"><div class="htk-gc"><h3 class="htk-sec-title">{{copy.mealRecords}}</h3>
    <template v-if="meals.length"><div v-for="date in pagedMealDates" :key="date" class="htk-mood-dg"><div class="htk-mood-dg-h">{{formatMoodDate(String(date))}}<span v-if="mealsByDate[date].length>1" class="htk-mood-dg-c">{{copyx.count({count:mealsByDate[date].length.toString()})}}</span></div><div v-for="m in mealsByDate[date]" :key="m.id" class="htk-mood-en"><div class="htk-mood-en-t">{{m.time}}</div><span class="htk-mood-en-e"><i :class="mealSlotInfo(m.slot).emoji"></i></span><div class="htk-mood-en-ct"><div class="htk-meal-en-head"><span class="htk-meal-en-slot">{{mealSlotInfo(m.slot).label}}</span><span class="htk-meal-en-level" :style="{color:mealLevelInfo(m.level).color}"><i :class="mealLevelInfo(m.level).emoji"></i> {{mealLevelInfo(m.level).label}}</span></div><div v-if="m.reasons&&m.reasons.length" class="htk-meal-en-reasons"><span v-for="r in m.reasons" :key="r" class="htk-meal-en-reason">{{mealReasonLabel(r)}}</span></div><div v-if="m.note" class="htk-mood-en-n">{{m.note}}</div></div><div class="htk-mood-en-acts"><button class="htk-mood-en-a" @click="startEditMeal(m)"><i class="ti ti-pencil"></i></button><button class="htk-mood-en-a del" @click="deleteMeal(m.id)"><i class="ti ti-x"></i></button></div></div></div>
    <div v-if="mealTotalPages>1" class="htk-pager"><button class="htk-btn htk-xs" :disabled="mealPage<=1" @click="mealPage--">&lt;</button><span class="htk-pager-t">{{mealPage}} / {{mealTotalPages}}</span><button class="htk-btn htk-xs" :disabled="mealPage>=mealTotalPages" @click="mealPage++">&gt;</button></div>
    </template>
    <div v-else class="htk-empty"><div class="htk-empI"><i class="ti ti-circle-off"></i></div><div>{{copy.noRecordsYet}}</div></div>
  </div></div>
</div>

<!-- ========== GARDEN ========== -->
<div v-if="activeTab==='garden'" class="htk-tabpage" :class="[isHatakyu?'hk-panels':'htk-panels',tabDir==='fwd'?'htk-tab-fwd':'htk-tab-back']">
  <!-- 旗鯖fork(ハタキュ): 育ち具合をひとこと添える紙。 -->
  <div v-if="isHatakyu" class="hk-pin" style="--i:0;--r:1.5deg"><span class="hk-tack hk-y"></span>
    <div class="hk-card hk-cream"><div class="hk-quote hk-center">{{flower.progress>=100?copy.hkGardenBloomed:copy.hkGardenAlmost}}</div></div>
  </div>
  <div class="htk-lg htk-anim"><div class="htk-gc" style="text-align:center;min-height:240px">
    <h3 class="htk-sec-title">{{copy.currentFlower}} <button class="htk-info-btn" @click="showFlowerInfo=true">?</button></h3>
    <div class="htk-fl-ring hk-ring-lg" style="width:140px;height:140px"><svg viewBox="0 0 160 160"><circle class="htk-fl-track" cx="80" cy="80" r="70"/><circle class="htk-fl-bar" cx="80" cy="80" r="70" :style="{strokeDasharray:'440',strokeDashoffset:440-440*(flower.progress/100)}"/></svg><div class="htk-fl-emo" style="font-size:3rem"><HataskEmoji :emoji="flower.emoji"/></div></div>
    <div style="font-weight:600;font-size:1rem">{{currentFlowerDisplayName}}</div>
    <div v-if="currentFlowerHanakotoba" style="font-size:.72rem;color:var(--text-3);margin-top:2px;opacity:.7">{{copy.flowerMeaning}}: {{currentFlowerHanakotoba}}</div>
    <div style="font-size:.75rem;color:var(--text-3);margin-top:4px">{{copyx.flowerProgressTotal({progress:flower.progress.toString(),total:formatMinutes(flower.totalMinutes)})}}</div>
    <div v-if="flower.progress<100" style="font-size:.75rem;color:var(--text-3);margin-top:6px">{{copyx.flowerBloomsIn({duration:estimateRemaining})}}</div>
    <button v-else class="htk-btn htk-primary htk-sm" style="margin-top:10px" @click="harvestFlower">{{copy.harvestAndName}}</button>
  </div></div>
  <div class="htk-lg htk-anim"><div class="htk-gc"><h3 class="htk-sec-title">{{copy.flowerGallery}}</h3>
    <div v-if="gallery.length" class="htk-gal-g"><div v-for="fl in gallery" :key="fl.id" class="htk-gal-i" @click="renameFlower(fl)"><span class="htk-gal-e"><HataskEmoji :emoji="fl.emoji"/></span><div class="htk-gal-n">{{localizeFloraName(fl.name)}}</div><div v-if="fl.hanakotoba" class="htk-gal-hk">{{localizeHanakotoba(fl.hanakotoba)}}</div><div class="htk-gal-d">{{fl.date}}</div></div></div>
    <div v-else class="htk-empty"><div class="htk-empI"><i class="ti ti-circle-off"></i></div><div>{{copy.noFlowersYet}}</div></div>
  </div></div>
</div>
<!-- 旗鯖fork(ハタキュ): Eye も他タブと同じ板の上に載せるため、.htk-app の閉じは EYE の後ろへ移した。 -->

<!-- ========== EYE PAGE ========== -->
<div v-if="activeTab==='eye'" class="htk-tabpage" :class="[isHatakyu?'hk-panels':'htk-panels',tabDir==='fwd'?'htk-tab-fwd':'htk-tab-back']" style="padding-bottom:40px">
  <!-- Eye phrase (big) -->
  <div class="htk-lg htk-anim"><div class="htk-gc htk-eye-page-top hk-eye-top" style="position:relative">
    <!-- 旗鯖fork: AI生成文の注意事項を表示するiマーク (いつでも確認可能) -->
    <button class="htk-eye-info-btn" @click="showEyeDisclaimer=true" :title="copy.aboutHataskEye" style="position:absolute;top:12px;right:12px;background:rgba(255,255,255,.15);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;color:inherit;display:flex;align-items:center;justify-content:center"><i class="ti ti-info-circle" style="font-size:1rem"></i></button>
    <img v-if="isHatakyu" class="hk-hero" :src="hkAsset('treasureFound')" alt="" draggable="false">
    <div v-if="!isHatakyu" class="htk-eye-logo">◎</div>
    <div class="htk-eye-page-label">Hatask Eye</div>
    <div class="htk-eye-page-phrase-wrap">
      <Transition name="htk-eye-fade">
        <div class="htk-eye-page-phrase" :key="eyePhrase">{{eyePhrase}}</div>
      </Transition>
    </div>
  </div></div>

  <!-- 統計サマリー -->
  <div class="htk-lg htk-anim"><div class="htk-gc">
    <h3 class="htk-sec-title">{{copy.yourRecords}}</h3>
    <div class="htk-eye-stats">
      <div class="htk-eye-stat"><div class="htk-eye-stat-n">{{moods.length}}</div><div class="htk-eye-stat-l">{{copy.totalMoodRecords}}</div></div>
      <div class="htk-eye-stat"><div class="htk-eye-stat-n">{{todos.filter(t=>t.done).length}}</div><div class="htk-eye-stat-l">{{copy.completedTasks}}</div></div>
      <div class="htk-eye-stat"><div class="htk-eye-stat-n">{{todos.length}}</div><div class="htk-eye-stat-l">{{copy.createdTasks}}</div></div>
      <div class="htk-eye-stat"><div class="htk-eye-stat-n">{{todoCompletionRate}}%</div><div class="htk-eye-stat-l">{{copy.completionRate}}</div></div>
    </div>
  </div></div>

  <!-- 進捗状況 -->
  <div class="htk-lg htk-anim"><div class="htk-gc">
    <h3 class="htk-sec-title">{{copy.progress}}</h3>
    <div class="htk-eye-progress-row">
      <span class="htk-eye-prog-label">{{copy.weeklyTaskProgress}}</span>
      <div class="htk-eye-prog-bar"><div class="htk-eye-prog-fill" :style="{width:weeklyTaskProgress+'%'}"></div></div>
      <span class="htk-eye-prog-val">{{weeklyTaskProgress}}%</span>
    </div>
    <div class="htk-eye-progress-row">
      <span class="htk-eye-prog-label">{{copy.monthlyMoodRecords}}</span>
      <div class="htk-eye-prog-bar"><div class="htk-eye-prog-fill htk-eye-prog-mood" :style="{width:monthlyMoodProgress+'%'}"></div></div>
      <span class="htk-eye-prog-val">{{copyx.days({count:monthlyMoodCount.toString()})}}</span>
    </div>
    <div class="htk-eye-progress-row">
      <span class="htk-eye-prog-label">{{copy.flowerGrowth}}</span>
      <div class="htk-eye-prog-bar"><div class="htk-eye-prog-fill htk-eye-prog-flower" :style="{width:flower.progress+'%'}"></div></div>
      <span class="htk-eye-prog-val">{{flower.progress}}%</span>
    </div>
  </div></div>

  <!-- 育てた花の花言葉 -->
  <div class="htk-lg htk-anim"><div class="htk-gc">
    <h3 class="htk-sec-title">{{copy.flowerMeaningCollection}}</h3>
    <div v-if="galleryWithHanakotoba.length" class="htk-eye-hk-list">
      <div v-for="fl in galleryWithHanakotoba" :key="fl.id" class="htk-eye-hk-row">
        <span class="htk-eye-hk-emoji"><HataskEmoji :emoji="fl.emoji"/></span>
        <div class="htk-eye-hk-info">
          <div class="htk-eye-hk-name">{{localizeFloraName(fl.name)}}</div>
          <div class="htk-eye-hk-word">{{localizeHanakotoba(fl.hanakotoba)}}</div>
        </div>
      </div>
    </div>
    <div v-else class="htk-empty"><div class="htk-empI"><i class="ti ti-circle-off"></i></div><div>{{copy.harvestToCollectMeanings}}</div></div>
  </div></div>

  <!-- 現在育てている花 -->
  <div class="htk-lg htk-anim"><div class="htk-gc" style="text-align:center">
    <h3 class="htk-sec-title">{{copy.currentFlower}}</h3>
    <div class="htk-fl-ring" style="width:100px;height:100px"><svg viewBox="0 0 120 120"><circle class="htk-fl-track" cx="60" cy="60" r="50"/><circle class="htk-fl-bar" cx="60" cy="60" r="50" :style="{strokeDasharray:'314',strokeDashoffset:314-314*(flower.progress/100)}"/></svg><div class="htk-fl-emo" style="font-size:2rem"><HataskEmoji :emoji="flower.emoji"/></div></div>
    <div style="font-weight:600;font-size:.9rem">{{currentFlowerDisplayName}}</div>
    <div v-if="currentFlowerHanakotoba" style="font-size:.7rem;color:var(--text-3);opacity:.7">{{copy.flowerMeaning}}: {{currentFlowerHanakotoba}}</div>
    <div v-if="flower.progress>=100" style="margin-top:8px"><button class="htk-btn htk-primary htk-sm" @click="harvestFlower">{{copy.harvestFlower}}</button></div>
  </div></div>
</div>
</div><!-- /htk-shell -->
</div><!-- /htk-app -->

<!-- SEARCH MODAL -->
<Teleport to="body"><div v-if="showSearch" class="htk-modal-ov" :data-theme="settings.theme||'kisetsu'" :data-mode="themeMode" @click.self="showSearch=false"><div class="htk-lg htk-modal-c htk-sch-modal"><div class="htk-gc">
  <h3 class="htk-sec-title">{{copy.search}}</h3>
  <input class="htk-inp htk-sch-inp" v-model="searchQuery" :placeholder="copy.searchPlaceholder" ref="searchInput">
  <div class="htk-sch-body">
  <div v-if="!searchQuery">
    <template v-if="upcomingEvents.length"><div class="htk-sch-sec">{{copy.upcomingEvents}}</div><div v-for="ev in upcomingEvents.slice(0,3)" :key="'se'+ev.id" class="htk-sch-it" @click="showSearch=false;goToEvent(ev)"><div class="htk-ev-dot" :style="{background:ev.color}"></div><div class="htk-sch-it-body"><div class="htk-sch-it-title">{{ev.title}}</div><div class="htk-sch-it-sub">{{formatSearchDate(ev.date)}} {{ev.timeStart}}</div></div></div></template>
    <template v-if="recentMoodsForSearch.length"><div class="htk-sch-sec">{{copy.recentMoods}}</div><div v-for="m in recentMoodsForSearch" :key="'sm'+m.id" class="htk-sch-it" @click="showSearch=false;activeTab='mood'"><span class="htk-sch-it-emo"><i :class="moodIcons[m.level]"></i></span><div class="htk-sch-it-body"><div class="htk-sch-it-title">{{moodNoteLabel(m.note)}}</div><div class="htk-sch-it-sub">{{formatSearchDate(m.date)}} {{m.time}}</div></div></div></template>
    <template v-if="todos.filter(t=>!t.done).length"><div class="htk-sch-sec">{{copy.recentTodos}}</div><div v-for="t in todos.filter(t=>!t.done).slice(0,3)" :key="'st'+t.id" class="htk-sch-it" @click="showSearch=false;activeTab='todo'"><div class="htk-ev-dot" style="background:var(--primary)"></div><div class="htk-sch-it-body"><div class="htk-sch-it-title">{{t.text}}</div><div class="htk-sch-it-sub">{{t.due?copyx.dueDateLabel({date:formatSearchDate(t.due)}):copy.noDueDate}}</div></div></div></template>
  </div>
  <div v-else>
    <template v-if="searchResults.events.length"><div class="htk-sch-sec">{{copy.schedule}}</div><div v-for="ev in searchResults.events" :key="'re'+ev.id" class="htk-sch-it" @click="showSearch=false;goToEvent(ev)"><div class="htk-ev-dot" :style="{background:ev.color}"></div><div class="htk-sch-it-body"><div class="htk-sch-it-title">{{ev.title}}</div><div class="htk-sch-it-sub">{{formatSearchDate(ev.date)}} {{ev.timeStart}}</div></div></div></template>
    <template v-if="searchResults.moods.length"><div class="htk-sch-sec">{{copy.tabMood}}</div><div v-for="m in searchResults.moods" :key="'rm'+m.id" class="htk-sch-it"><span class="htk-sch-it-emo"><i :class="moodIcons[m.level]"></i></span><div class="htk-sch-it-body"><div class="htk-sch-it-title">{{moodNoteLabel(m.note)}}</div><div class="htk-sch-it-sub">{{formatSearchDate(m.date)}} {{m.time}}</div></div></div></template>
    <template v-if="searchResults.todos.length"><div class="htk-sch-sec">ToDo</div><div v-for="t in searchResults.todos" :key="'rt'+t.id" class="htk-sch-it"><div class="htk-ev-dot" style="background:var(--primary)"></div><div class="htk-sch-it-body"><div class="htk-sch-it-title">{{t.text}}</div><div class="htk-sch-it-sub">{{t.due?copyx.dueDateLabel({date:formatSearchDate(t.due)}):copy.noDueDate}}</div></div></div></template>
    <div v-if="!searchResults.todos.length&&!searchResults.moods.length&&!searchResults.events.length" class="htk-empty"><i class="ti ti-circle-off"></i> {{copy.notFound}}</div>
  </div>
  </div>
  <div class="htk-sch-note">{{copy.searchScopeNote}}</div>
  <div style="text-align:center;margin-top:12px"><button class="htk-btn htk-primary htk-sch-close" @click="showSearch=false">{{copy.close}}</button></div>
</div></div></div></Teleport>

<!-- 旗鯖fork: Hatask Eye 注意事項モーダル (初回表示 + iマードからいつでも) -->
<Teleport to="body"><div v-if="showEyeDisclaimer" class="htk-modal-ov" :data-theme="settings.theme||'kisetsu'" :data-mode="themeMode" @click.self="dismissEyeDisclaimer"><div class="htk-lg htk-modal-c" style="max-width:420px"><div class="htk-gc" style="padding:22px">
  <h3 class="htk-sec-title" style="display:flex;align-items:center;gap:8px"><i class="ti ti-info-circle"></i> {{copy.aboutHataskEye}}</h3>
  <p style="line-height:1.7;font-size:.92rem;opacity:.9;margin:14px 0">
    {{copy.eyeDisclaimerPrefix}}<b>{{copy.eyeDisclaimerAiText}}</b>{{copy.eyeDisclaimerSuffix}}<br>
    {{copy.eyeDisclaimerAccuracyPrefix}}<b>{{copy.eyeDisclaimerEntertainment}}</b>{{copy.eyeDisclaimerEnjoy}}<br>
    {{copy.eyeDisclaimerProfessional}}
  </p>
  <div style="text-align:center;margin-top:10px"><button class="htk-btn htk-primary" @click="dismissEyeDisclaimer">{{copy.understood}}</button></div>
</div></div></div></Teleport>

<!-- 旗鯖fork(#37): 設定モーダルは HataskSettings.vue に統合(openHataskSettings()でpopup) -->

<!-- MOOD DISCLAIMER MODAL -->
<Teleport to="body"><div v-if="showMoodDisclaimer" class="htk-modal-ov" :data-theme="settings.theme||'kisetsu'" :data-mode="themeMode" @click.self="showMoodDisclaimer=false"><div class="htk-lg htk-modal-c"><div class="htk-gc" style="padding:28px"><div style="text-align:center;font-size:2rem;margin-bottom:8px;text-shadow:none">ⓘ</div><div style="text-align:center;font-size:.92rem;font-weight:700;margin-bottom:10px">{{copy.aboutMoodRecords}}</div><div class="htk-popup-b">{{copy.moodDisclaimerIntro}}<br><br>{{copy.moodDisclaimerMedicalPrefix}}<strong>{{copy.moodDisclaimerMedicalStrong}}</strong><br><br>{{copy.moodDisclaimerConsult}}</div><div style="text-align:center;margin-top:14px"><button class="htk-btn htk-primary" @click="showMoodDisclaimer=false">{{copy.accept}}</button></div></div></div></div></Teleport>
<Teleport to="body"><div v-if="showMealDisclaimer" class="htk-modal-ov" :data-theme="settings.theme||'kisetsu'" :data-mode="themeMode" @click.self="ackMealDisclaimer"><div class="htk-lg htk-modal-c"><div class="htk-gc" style="padding:28px"><div style="text-align:center;font-size:2rem;margin-bottom:8px;text-shadow:none">ⓘ</div><div style="text-align:center;font-size:.92rem;font-weight:700;margin-bottom:10px">{{copy.aboutMealRecords}}</div><div class="htk-popup-b">{{mealDisclaimerText}}</div><div style="text-align:center;margin-top:14px"><button class="htk-btn htk-primary" @click="ackMealDisclaimer">{{copy.accept}}</button></div></div></div></div></Teleport>

<!-- FLOWER INFO MODAL -->
<Teleport to="body"><div v-if="showFlowerInfo" class="htk-modal-ov" :data-theme="settings.theme||'kisetsu'" :data-mode="themeMode" @click.self="showFlowerInfo=false"><div class="htk-lg htk-modal-c"><div class="htk-gc" style="padding:28px"><div style="text-align:center;font-size:2rem;margin-bottom:8px;text-shadow:none;color:var(--accent)"><i class="ti ti-plant-2"></i></div><div style="text-align:center;font-size:.92rem;font-weight:700;margin-bottom:10px">{{copy.howToGrowFlowers}}</div><div class="htk-popup-b">{{copy.flowerInfoGrowth}}<br><br>{{copy.flowerInfoTime}}<br><br>{{copy.flowerInfoNaming}}<br><br>{{copy.flowerInfoVariety}}</div><div style="text-align:center;margin-top:14px"><button class="htk-btn htk-primary" @click="showFlowerInfo=false">{{copy.understoodExcited}}</button></div></div></div></div></Teleport>

<!-- 旗鯖fork(v2 §14): チュートリアル テーマ選択ステップ -->
<!-- 旗鯖fork(ハタキュ): 新テーマの案内。⚠️アカウントごとに1回だけ出す(settings.hatakyuNoticeShown)。
     ⚠️overlay に data-theme="hatakyu" を固定で付ける。いまのテーマが何であっても、
       案内そのものは「これから見せたい紙の見た目」で出したいため。 -->
<Teleport to="body"><div v-if="showHatakyuNotice" class="htk-modal-ov hk-ovl" data-theme="hatakyu" :data-mode="themeMode" @click.self="dismissHatakyuNotice">
  <div class="hk-modal">
    <span class="hk-tape hk-tl"></span><span class="hk-tape hk-tr"></span>
    <img class="hk-hero" :src="hkAsset('waving')" alt="" draggable="false">
    <div class="hk-mnew"><i class="ti ti-sparkles"></i>NEW THEME</div>
    <div class="hk-mttl">{{copy.hatakyuNoticeTitlePrefix}}<span>{{copy.themeHatakyu}}</span>{{copy.hatakyuNoticeTitleSuffix}}</div>
    <div class="hk-mtxt">{{copy.hatakyuNoticeBody1}}<br>{{copy.hatakyuNoticeBody2Prefix}}<b>{{copy.hatakyuNoticeBody2Strong}}</b>{{copy.hatakyuNoticeBody2Suffix}}<br>{{copy.hatakyuNoticeBody3}}</div>
    <div class="hk-mbtns">
      <button class="hk-btnp" @click="applyHatakyuFromNotice"><i class="ti ti-check"></i> {{copy.hatakyuNoticeApply}}</button>
      <button class="hk-btno" @click="dismissHatakyuNotice">{{copy.hatakyuNoticeLater}}</button>
    </div>
    <div class="hk-mnote">{{copy.hatakyuNoticeNote}}</div>
  </div>
</div></Teleport>

<!-- 旗鯖fork(v2 §14): テーマ選択(設計 .tpickwrap を忠実移植)。picker自身の light/dark トグルを持つ。 -->
<Teleport to="body"><div v-if="showTutTheme" class="htk-tut-ov htk-tpick-ov">
  <div class="tpickwrap" :data-mode="themeMode">
    <div class="tpick-cap">{{copy.welcomeTo}}</div>
    <div class="tpick-logo">Hatask v2</div>
    <div class="tpick-sub">{{copy.chooseAppearance}}<br><span class="tpick-sub2">{{copy.changeAppearanceLater}}</span></div>
    <div class="tpick-seg">
      <button :class="[themeMode!=='dark'&&'on']" @click="setTutMode(false)"><i class="ti ti-sun"></i>{{copy.light}}</button>
      <button :class="[themeMode==='dark'&&'on']" @click="setTutMode(true)"><i class="ti ti-moon"></i>{{copy.dark}}</button>
    </div>
    <div class="tpick-grid">
      <button v-for="t in tutThemes" :key="t.id" :class="['tp-card',(settings.theme||'kisetsu')===t.id&&'sel']" @click="pickTutTheme(t.id)">
        <div :class="['tp-prev','pv-'+t.id]">
          <div class="pl">Hatask</div>
          <div class="pb"></div>
          <div class="pt"><i></i><i></i><i></i></div>
        </div>
        <div class="tp-name">{{t.jp}}<i class="tp-check ti ti-check"></i></div>
        <div class="tp-desc">{{t.desc}}</div>
      </button>
    </div>
    <button class="tpick-go" :style="{background:(tutThemes.find(t=>t.id===(settings.theme||'kisetsu'))||tutThemes[0]).accent}" @click="startTutFromTheme"><i class="ti ti-arrow-right"></i> {{copy.startWithTheme}}</button>
    <div class="tpick-note">{{tutThemeStandalone?copy.themeSelectionSaved:copy.tutorialUsesTheme}}</div>
  </div>
</div></Teleport>

<!-- TUTORIAL OVERLAY -->
<Teleport to="body"><div v-if="showTutorial" class="htk-tut-ov" :data-theme="settings.theme||'kisetsu'" :data-mode="themeMode">
  <!-- Step 0: Welcome (full-screen) -->
  <div v-if="tutStep===0" class="htk-tut-center" @click.self="skipTutorial">
    <div class="htk-tut-welcome">
      <div class="htk-tut-particles"><span v-for="i in 12" :key="i" :style="{animationDelay:i*0.3+'s',left:Math.random()*100+'%',top:Math.random()*100+'%'}"></span></div>
      <div class="htk-tut-hero-emoji"><i class="ti ti-sparkles"></i></div>
      <div class="htk-tut-catch">{{copy.tutorialCatch}}</div>
      <div class="htk-tut-appname">Hatask</div>
      <div class="htk-tut-sub">{{copy.tutorialIntro}}<br><span style="font-size:.72rem;opacity:.6">{{copy.tutorialStepByStep}}</span></div>
      <div class="htk-tut-btns"><button class="htk-tut-btn htk-tut-btn-p" @click="startSpotlightTutorial">{{copy.start}} <i class="ti ti-rocket"></i></button><button class="htk-tut-btn htk-tut-btn-s" @click="skipTutorial">{{copy.skip}}</button></div>
      <div class="htk-tut-dots"><span v-for="i in tutTotalSteps" :key="i" :class="['htk-tut-dot',tutStep===i-1&&'on']"></span></div>
    </div>
  </div>

  <!-- Step 1+: Spotlight mode -->
  <template v-if="tutStep>0">
    <!-- 4-panel dark overlay (top, bottom, left, right around spotlight hole) -->
    <div class="htk-spot-top" :style="{height:spotRect.y+'px'}" @click="nextSpotlightStep"></div>
    <div class="htk-spot-bottom" :style="{top:(spotRect.y+spotRect.h)+'px'}" @click="nextSpotlightStep"></div>
    <div class="htk-spot-left" :style="{top:spotRect.y+'px',height:spotRect.h+'px',width:spotRect.x+'px'}" @click="nextSpotlightStep"></div>
    <div class="htk-spot-right" :style="{top:spotRect.y+'px',height:spotRect.h+'px',left:(spotRect.x+spotRect.w)+'px'}" @click="nextSpotlightStep"></div>
    <!-- Highlight ring -->
    <div class="htk-spot-ring" :style="{left:(spotRect.x-4)+'px',top:(spotRect.y-4)+'px',width:(spotRect.w+8)+'px',height:(spotRect.h+8)+'px'}"></div>
    <!-- Tooltip card (always visible, positioned relative to spotlight) -->
    <div class="htk-spot-tip" :key="'tip'+tutStep" :style="tipPosition" :class="['htk-spot-tip-'+tipSide]">
      <div class="htk-spot-tip-arrow"></div>
      <div class="htk-spot-tip-header">
        <span class="htk-spot-tip-emoji"><i :class="tutSteps[tutStep]?.emoji"></i></span>
        <span class="htk-spot-tip-title">{{tutSteps[tutStep]?.title}}</span>
        <span class="htk-spot-tip-badge">{{tutStep}}/{{tutTotalSteps-1}}</span>
      </div>
      <div class="htk-spot-tip-body">{{tutSteps[tutStep]?.body}}</div>
      <div v-if="tutSteps[tutStep]?.tips" class="htk-spot-tip-extra">
        <div v-for="(tip,ti) in tutSteps[tutStep].tips" :key="ti" class="htk-spot-tip-row">
          <span class="htk-spot-tip-bullet"><i :class="tip.icon"></i></span>
          <span>{{tip.text}}</span>
        </div>
      </div>
      <div class="htk-spot-tip-nav">
        <button v-if="tutStep>1" class="htk-tut-btn htk-tut-btn-s htk-tut-btn-xs" @click="prevSpotlightStep">← {{copy.back}}</button>
        <div class="htk-spot-tip-progress"><div class="htk-spot-tip-bar" :style="{width:(tutStep/(tutTotalSteps-1))*100+'%'}"></div></div>
        <button v-if="tutStep<tutTotalSteps-1" class="htk-tut-btn htk-tut-btn-p htk-tut-btn-xs" @click="nextSpotlightStep">{{copy.next}} →</button>
        <button v-else class="htk-tut-btn htk-tut-btn-finish htk-tut-btn-xs" @click="finishTutorial">{{copy.complete}} <i class="ti ti-confetti"></i></button>
      </div>
      <button class="htk-tut-skip" @click="skipTutorial">{{copy.skip}}</button>
    </div>
  </template>
</div></Teleport>

</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount, onActivated, onDeactivated, nextTick, watch, defineAsyncComponent } from 'vue';
import type { HataskGrowingFlower } from '@/utility/hatask-flower-growth.js';
import { definePage } from '@/page.js';
import * as os from '@/os.js';
import { claimAchievement } from '@/utility/achievements.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';
import { useRouter } from '@/router.js';
import { useStream } from '@/stream.js';
import { i18n } from '@/i18n.js';
import { versatileLang } from '@/utility/intl-const.js';
import MkEarthquakeTicker from '@/components/MkEarthquakeTicker.vue';
import HataFeedNotificationBody from '@/components/HataFeedNotificationBody.vue';
import HataskEmoji from '@/components/HataskEmoji.vue';
import { hatakyuAssetUrl } from '@/utility/hatakyu-assets.js';
import type { HatakyuAssetKey } from '@/utility/hatakyu-assets.js';
import { getDefaultPhrase, getPhrase } from '@/utility/hatask-phrases.js';
import { floraData, pickRandomFlora, generateFlowerName, localizeFloraName, localizeHanakotoba } from '@/utility/hatask-flora.js';
import { HATASK_FLOWER_GROWTH_EVENT, seedHataskFlowerGrowth } from '@/utility/hatask-flower-growth.js';
import { notificationDisplayMessage, type HataFeedNotif } from '@/utility/hatafeed.js';
import { activeCharacter as mascotActiveCharacter, expressionDisplayUrl, loadMascot, hatakMascotActive, currentExpression as mascotCurrentExpression, currentPhrase as mascotCurrentPhrase, pickRandomPhrase as mascotPickRandomPhrase, displaySettings as mascotDisplaySettings, loadDisplaySettings as loadMascotDisplaySettings, nextIdleDelayMs as mascotNextIdleDelayMs, escapeText as mascotEscapeText } from '@/utility/mascot-store.js';
const copy = i18n.ts._hata._hatask._main;
const copyx = i18n.tsx._hata._hatask._main;
const emotionCopy = (i18n.ts._hata as unknown as { _emotionAnalysis: { title: string } })._emotionAnalysis;
const _getPhrase = (ctx?: any): string => { try { return getPhrase(ctx); } catch { return getDefaultPhrase(); } };
definePage(()=>({title:'Hatask',icon:'ti ti-checklist'}));
const SCOPE=['client','hatask'];
const tabs=computed(() => [{id:'home',icon:'ti ti-home',label:copy.tabHome},{id:'cal',icon:'ti ti-calendar',label:copy.tabCalendar},{id:'todo',icon:'ti ti-checkbox',label:'ToDo'},{id:'mood',icon:'ti ti-mood-smile',label:copy.tabMood},{id:'meal',icon:'ti ti-bowl',label:copy.tabMeal},{id:'garden',icon:'ti ti-flower',label:copy.tabGarden},{id:'eye',icon:'ti ti-eye',label:'Eye'}]);
// 旗鯖fork(v2 §16②): タブ切替の方向(配列上の左右関係に追従)。※watchはactiveTab宣言後に登録(下記)。
const tabDir=ref<'fwd'|'back'>('fwd');
const showMobileNav=ref(true);
// 旗鯖fork(v2): きもち5段階は Tabler アイコンに統一(§05)。
const moodIcons:Record<number,string>={1:'ti ti-mood-cry',2:'ti ti-mood-sad',3:'ti ti-mood-neutral',4:'ti ti-mood-smile',5:'ti ti-mood-heart'};
const moodOptions=computed(() => [{level:1,icon:'ti ti-mood-cry',label:copy.moodLevelHard},{level:2,icon:'ti ti-mood-sad',label:copy.moodLevelUneasy},{level:3,icon:'ti ti-mood-neutral',label:copy.moodLevelNeutral},{level:4,icon:'ti ti-mood-smile',label:copy.moodLevelGood},{level:5,icon:'ti ti-mood-heart',label:copy.moodLevelGreat}]);
const moodEmojisExtra=['☀️','🌧️','⚡','🌈','🍵','🎵','💪','😴'];
const moodRemindTimes=['朝 8:00','昼 12:00','夜 20:00','寝る前 23:00'];
// ===== 食事記録(meal) 定数。医療目的ではない自己記録メモ。数値評価・カロリー計算はしない =====
const mealSlots=computed(() => [{id:'breakfast',emoji:'ti ti-sunrise',label:copy.mealSlotBreakfast},{id:'lunch',emoji:'ti ti-sun',label:copy.mealSlotLunch},{id:'dinner',emoji:'ti ti-moon',label:copy.mealSlotDinner},{id:'snack',emoji:'ti ti-cookie',label:copy.mealSlotSnack}]);
// 3段階はすべて中立・等価に扱う。「食べれなかった」を否定的に強調しない
const mealLevels=computed(() => [{id:'ate',emoji:'ti ti-bowl-chopsticks',label:copy.mealLevelAte,color:'#85cdca'},{id:'little',emoji:'ti ti-bowl-spoon',label:copy.mealLevelLittle,color:'#e8a87c'},{id:'none',emoji:'ti ti-cup',label:copy.mealLevelNone,color:'#c38d9e'}]);
// 「少しだけ」「食べれなかった」のときだけ任意で表示。複数選択可。体型・体重・カロリーに触れる選択肢は置かない
const mealReasons=['食欲がなかった','体調がよくなかった','忙しくて時間がなかった','気分がのらなかった','用意できなかった','なんとなく'];
const mealDisclaimerText=computed(() => copy.mealDisclaimerFull);
const eventColors=['#e27d60','#85cdca','#e8a87c','#c38d9e','#7bc67e','#f0c75e','#6cb4ee'];
const eventEmojis=['⭐','💼','🎮','🔧','📚','🎂','✈️','🎨','🏃','🎤'];
const notifyTimings=['15分前','30分前','1時間前','1日前'];
const sortOptions=computed(() => [{id:'manual',label:copy.sortManual},{id:'dueAsc',label:copy.sortDueAsc},{id:'dueDesc',label:copy.sortDueDesc},{id:'new',label:copy.sortNewest}]);
// Flora data now in hatask-flora.ts

const notifyTimingLabels: Record<string, () => string> = {
	'15分前': () => copy.notify15MinutesBefore,
	'30分前': () => copy.notify30MinutesBefore,
	'1時間前': () => copy.notify1HourBefore,
	'1日前': () => copy.notify1DayBefore,
};
const moodRemindTimeLabels: Record<string, () => string> = {
	'朝 8:00': () => copy.moodReminderMorning,
	'昼 12:00': () => copy.moodReminderNoon,
	'夜 20:00': () => copy.moodReminderEvening,
	'寝る前 23:00': () => copy.moodReminderBedtime,
};
const mealReasonLabels: Record<string, () => string> = {
	'食欲がなかった': () => copy.mealReasonNoAppetite,
	'体調がよくなかった': () => copy.mealReasonUnwell,
	'忙しくて時間がなかった': () => copy.mealReasonBusy,
	'気分がのらなかった': () => copy.mealReasonNotInMood,
	'用意できなかった': () => copy.mealReasonCouldNotPrepare,
	'なんとなく': () => copy.mealReasonJustBecause,
};

function notifyTimingLabel(value: string): string { return notifyTimingLabels[value]?.() ?? value; }

function moodRemindTimeLabel(value: string): string { return moodRemindTimeLabels[value]?.() ?? value; }

function mealReasonLabel(value: string): string { return mealReasonLabels[value]?.() ?? value; }

function moodNoteLabel(value: string): string { return value === '（ひとことなし）' ? copy.noMoodNote : value; }

function parseIsoDate(value: string): Date {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
}

const yearMonthFormatter = new Intl.DateTimeFormat(versatileLang, { year: 'numeric', month: 'long' });
const longDateFormatter = new Intl.DateTimeFormat(versatileLang, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
const monthDayFormatter = new Intl.DateTimeFormat(versatileLang, { month: 'short', day: 'numeric' });
const monthDayWeekdayFormatter = new Intl.DateTimeFormat(versatileLang, { month: 'short', day: 'numeric', weekday: 'short' });
const weekdayLongFormatter = new Intl.DateTimeFormat(versatileLang, { weekday: 'long' });
const weekdayShortFormatter = new Intl.DateTimeFormat(versatileLang, { weekday: 'short' });
const calendarWeekdays = Array.from({ length: 7 }, (_, index) => weekdayShortFormatter.format(new Date(2024, 0, 1 + index)));


const dataLoaded = ref(false);
const loadedKeys = new Set<string>();
async function registryGet<T>(key:string,fb:T):Promise<T>{try{const v=await misskeyApi('i/registry/get',{key,scope:SCOPE});loadedKeys.add(key);return(v!=null?v:fb)as T}catch{return fb}}
async function registrySet(key:string,value:unknown):Promise<void>{if(!dataLoaded.value&&!loadedKeys.has(key))return;await misskeyApi('i/registry/set',{key,value,scope:SCOPE})}

// 旗鯖fork: プロフィールに出すのは花の内容ではなく件数だけ。
// レジストリの実数と異なるときだけ更新し、i/update のレート制限を消費しない。
async function syncHataskFlowerCount(): Promise<void> {
	if (!$i || $i.host != null) return;
	const count = Math.min(1000000, gallery.value.filter(item => item != null && typeof item === 'object').length);
	if ($i.hataskFlowerCount === count) return;
	try {
		const updated = await misskeyApi('i/update', { hataskFlowerCount: count });
		$i.hataskFlowerCount = updated.hataskFlowerCount;
	} catch (err) {
		console.warn('Failed to sync Hatask flower count:', err);
	}
}

const activeTab=ref('home');const isSaving=ref(false);const showSearch=ref(false);
// 旗鯖fork: HataSideStudio の大ボタンから、予定・ToDo・ごはん・きもちへ
// 直接移動できるようにする。許可したタブ名以外はホームへ戻し、同じHatask画面内で
// queryだけが変わった場合も追従する。
const routeRouter = useRouter();
watch(() => routeRouter.currentRef.value.props.get('tab'), (requestedTab) => {
	activeTab.value = typeof requestedTab === 'string' && tabs.value.some(tab => tab.id === requestedTab) ? requestedTab : 'home';
}, { immediate: true });
// 旗鯖fork(v2 §16②): タブ切替方向を判定(activeTab宣言後に登録してTDZを回避)。
watch(activeTab, (nv, ov) => {
  const oi=tabs.value.findIndex(t=>t.id===ov); const ni=tabs.value.findIndex(t=>t.id===nv);
  tabDir.value = (ni>=oi) ? 'fwd' : 'back';
});
// 旗鯖fork: Hatask Eye の注意事項モーダル表示状態
const showEyeDisclaimer=ref(false);

// タブ切り替え時にスクロール状態をリセット
watch(activeTab, () => {
  nextTick(() => {
    const root = rootEl.value;
    if (root) {
      root.style.removeProperty('overflow');
      root.style.removeProperty('height');
    }
    document.body.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow');
    window.scrollTo({ top: window.scrollY }); // force scroll recalc
  });
});
// meal タブを初めて開いたとき、免責ダイアログを必ず表示する(既読フラグは registry settings に同期)
watch(activeTab, (t) => {
  if (t === 'meal' && dataLoaded.value && !settings.value.mealDisclaimerShown) {
    showMealDisclaimer.value = true;
  }
  // 旗鯖fork: Hatask Eye 初回表示時に注意事項を出す
  if (t === 'eye' && dataLoaded.value && !settings.value.eyeDisclaimerShown) {
    showEyeDisclaimer.value = true;
  }
});
const showMoodDisclaimer=ref(false);const showFlowerInfo=ref(false);const showMoodNote=ref(true);const showMoodRemind=ref(false);
const moodSelectedEmoji=ref('');const rootEl=ref<HTMLElement|null>(null);
// 旗鯖fork(v2 §16①): 起動ブートスプラッシュ。アニメON かつ reduced-motion でないときのみ、
//   hatask がアクティブになるたび約1.2s表示してフェードアウト。
// bootKey で毎回ブート要素を作り直す(前のブートと重なって「混ざる」のを防ぐ)。
// showBoot を一旦falseにしてから nextTick で立てることで、現在の data-theme が確実に反映された
//   新しい要素としてアニメを最初から再生する。
const showBoot=ref(false);const bootKey=ref(0);let bootTimer:ReturnType<typeof setTimeout>|null=null;let bootUsedActivated=false;
function playBoot(){
  if(bootTimer){clearTimeout(bootTimer);bootTimer=null;}
  const animOff = settings.value.animations===false;
  const reduce = typeof window!=='undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(animOff||reduce){showBoot.value=false;return;}
  showBoot.value=false;
  bootKey.value++;
  nextTick(()=>{
    showBoot.value=true;
    bootTimer=setTimeout(()=>{showBoot.value=false;bootTimer=null;},1300);
  });
}
// ===================== 旗鯖fork: ハタキュ(コルクボード)テーマ =====================
// 紙をコルク板にピンで留めた見立て。常時はゆっくり揺れ、ときどき突風が吹いて紙が大きく揺れる。
// ⚠️このテーマ専用の状態はここに固めておく。他テーマの挙動には一切触らない。
const isHatakyu=computed(()=>(settings.value.theme||'kisetsu')==='hatakyu');
/**
 * ハタキュ画像のURL。
 * ⚠️ここでファイル名を直書きしない。必ずレジストリ(hatakyu-assets.ts)の key を経由する。
 * ⚠️このテーマは絵柄そのものが見た目の中身なので、ブランディング設定(useHatakyuBranding)では
 *   出し分けない。テーマを選んだこと自体が「絵を出す」という意思表示になる。
 */
function hkAsset(key:HatakyuAssetKey):string{return hatakyuAssetUrl(key)}
// ホームは設計HTMLごとにマークアップが違うので、テーマ別のスコープクラスを付ける。
//   o1a=季 / o1b=花信 / o1d=刷 / o1k=ハタキュ
const homeThemeClass=computed(()=>{
  const t=settings.value.theme||'kisetsu';
  return t==='kisetsu'?'o1a':t==='kashin'?'o1b':t==='hatakyu'?'o1k':'o1d';
});
// 風を吹かせるか。⚠️ハタキュテーマ限定の設定で、既定はON(=吹く)。
//   落ち葉が舞うのが苦手な人・電池を使いたくない人のために切れるようにしてある。
const hkWindEnabled=computed(()=>isHatakyu.value && settings.value.hatakyuWind!==false);
const hkWind=ref(false);
// 落ち葉は突風のたびに作り直す(前の再生が残っていると2回目以降が出ないため)。
const hkLeafKey=ref(0);
let hkWindTimer:ReturnType<typeof setTimeout>|null=null;
let hkWindNextTimer:ReturnType<typeof setTimeout>|null=null;
function hkReduced():boolean{
  return typeof window!=='undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
}
/**
 * 突風を1回吹かせる。
 * ⚠️保持時間は「一番遅い要素が振り切るまで」に合わせてある(gustH 2.1s + ずらし最大 0.55s)。
 *   短く切ると紙が振り戻る途中で固まって見える。
 */
function hkBlowWind():void{
  if(!hkWindEnabled.value) return;
  if(settings.value.animations===false||hkReduced()) return;
  if(hkWindTimer){clearTimeout(hkWindTimer);hkWindTimer=null;}
  hkWind.value=false;
  hkLeafKey.value++;
  requestAnimationFrame(()=>{
    hkWind.value=true;
    hkWindTimer=setTimeout(()=>{hkWind.value=false;hkWindTimer=null;},2750);
  });
}
/** 滞在中はときどき勝手に吹く。⚠️等間隔だと機械的なので 40〜90 秒でばらす。 */
function hkScheduleWind():void{
  if(hkWindNextTimer){clearTimeout(hkWindNextTimer);hkWindNextTimer=null;}
  if(!hkWindEnabled.value) return;
  if(settings.value.animations===false||hkReduced()) return;
  hkWindNextTimer=setTimeout(()=>{hkBlowWind();hkScheduleWind();},40000+Math.random()*50000);
}
function hkStopWind():void{
  if(hkWindTimer){clearTimeout(hkWindTimer);hkWindTimer=null;}
  if(hkWindNextTimer){clearTimeout(hkWindNextTimer);hkWindNextTimer=null;}
  hkWind.value=false;
}
// ⚠️風まわりの watch は settings の宣言より後(hkInstallWindWatchers)で張る。
//   ここで watch を張ると初回評価が settings の初期化前に走る。

// 旗鯖fork: 新テーマ「ハタキュ」の案内。⚠️アカウントごとに1回だけ。
//   registry(プロファイル)に持つので、端末を変えても二度は出ない。
const showHatakyuNotice=ref(false);
function applyHatakyuFromNotice():void{
  settings.value.theme='hatakyu';
  settings.value.hatakyuNoticeShown=true;
  saveSettings();
  showHatakyuNotice.value=false;
  playBoot();
  os.toast(copy.hatakyuNoticeApplied);
}
function dismissHatakyuNotice():void{
  settings.value.hatakyuNoticeShown=true;
  saveSettings();
  showHatakyuNotice.value=false;
}
const showTutorial=ref(false);const tutStep=ref(0);const tutTotalSteps=10;
const isMobile=ref(window.innerWidth<=1024);
// ===== Spotlight tutorial system =====
const PAD=14;
const spotRect=ref({x:0,y:0,w:0,h:0});
const tipSide=ref<'bottom'|'top'>('bottom');
const tipPosition=ref<Record<string,string>>({});
const tutSteps=computed(()=>[
  {emoji:'ti ti-sparkles',title:copy.welcome,body:'',tab:'home',selector:'',tips:[]},
  {emoji:'ti ti-layout-navbar',title:copy.tutorialNavigationTitle,body:copy.tutorialNavigationBody,tab:'home',selector:'.htk-nav-top,.hk-tabs',tips:[
    {icon:'ti ti-device-mobile',text:copy.tutorialNavigationScreens},
    {icon:'ti ti-arrow-left',text:copy.tutorialNavigationBack},
  ]},
  {emoji:'ti ti-search',title:copy.tutorialHeaderTitle,body:copy.tutorialHeaderBody,tab:'home',selector:'.htk-header,.hk-bhead',tips:[
    {icon:'ti ti-circle-plus',text:copy.tutorialHeaderSearch},
    {icon:'ti ti-settings',text:copy.tutorialHeaderSettings},
  ]},
  {emoji:'ti ti-clock',title:copy.tutorialHomeTitle,body:copy.tutorialHomeBody,tab:'home',selector:'.htk-home',tips:[
    {icon:'ti ti-message-circle',text:copy.tutorialHomeGreeting},
    {icon:'ti ti-flower',text:copy.tutorialHomeFlower},
    {icon:'ti ti-calendar-event',text:copy.tutorialHomeCards},
  ]},
  {emoji:'ti ti-calendar-event',title:copy.tabCalendar,body:copy.tutorialCalendarBody,tab:'cal',selector:'.htk-panels,.hk-panels',tips:[
    {icon:'ti ti-palette',text:copy.tutorialCalendarOptions},
    {icon:'ti ti-users',text:copy.tutorialCalendarPublic},
    {icon:'ti ti-clipboard-check',text:copy.tutorialCalendarRsvp},
  ]},
  {emoji:'ti ti-checkbox',title:copy.tutorialTodoTitle,body:copy.tutorialTodoBody,tab:'todo',selector:'.htk-todo-inp-r,.hk-todo-inp',tips:[
    {icon:'ti ti-folder',text:copy.tutorialTodoFolders},
    {icon:'ti ti-note',text:copy.tutorialTodoDetails},
    {icon:'ti ti-check',text:copy.tutorialTodoComplete},
  ]},
  {emoji:'ti ti-mood-smile',title:copy.tutorialMoodTitle,body:copy.tutorialMoodBody,tab:'mood',selector:'.htk-mood-sc,.hk-mscale',tips:[
    {icon:'ti ti-chart-bar',text:copy.tutorialMoodAnalysis},
    {icon:'ti ti-bell',text:copy.tutorialMoodReminder},
    {icon:'ti ti-info-circle',text:copy.tutorialMoodDisclaimer},
  ]},
  {emoji:'ti ti-flower',title:copy.tabGarden,body:copy.tutorialGardenBody,tab:'garden',selector:'.htk-fl-ring,.hk-ring-lg',tips:[
    {icon:'ti ti-alarm',text:copy.tutorialGardenBloom},
    {icon:'ti ti-pencil',text:copy.tutorialGardenHarvest},
    {icon:'ti ti-target',text:copy.tutorialGardenCollection},
  ]},
  {emoji:'ti ti-eye',title:'Hatask Eye',body:copy.tutorialEyeBody,tab:'eye',selector:'.htk-eye-page-top,.hk-eye-top',tips:[
    {icon:'ti ti-chart-line',text:copy.tutorialEyeAnalysis},
    {icon:'ti ti-bulb',text:copy.tutorialEyeLearning},
    {icon:'ti ti-sparkles',text:copy.tutorialEyeFuture},
  ]},
  {emoji:'ti ti-confetti',title:copy.tutorialCompleteTitle,body:copy.tutorialCompleteBody,tab:'home',selector:'',tips:[
    {icon:'ti ti-settings',text:copy.tutorialCompleteSettings},
    {icon:'ti ti-message-circle',text:copy.tutorialCompleteHelp},
    {icon:'ti ti-plant-2',text:copy.tutorialCompleteWish},
  ]},
]);
function measureTarget(){
  const step=tutSteps.value[tutStep.value];if(!step?.selector)return;
  const el=document.querySelector(step.selector) as HTMLElement|null;
  if(!el||(el.offsetParent===null&&getComputedStyle(el).position!=='fixed')){spotRect.value={x:40,y:window.innerHeight/3,w:window.innerWidth-80,h:200};calcTip();return}
  // 旗鯖fork: smoothスクロールは非同期で、直後に getBoundingClientRect すると「スクロール前」の座標を
  //   測ってしまい、その後スクロールが動く分ハイライトがずれる。instant(auto)で同期スクロールし、
  //   レイアウト確定後(rAF×2)に測定する。fixed要素(モバイルナビ等)はスクロール不要。
  if(getComputedStyle(el).position!=='fixed') el.scrollIntoView({behavior:'auto',block:'center'});
  const doMeasure=()=>{
    const r=el.getBoundingClientRect();
    spotRect.value={x:Math.max(0,r.left-PAD),y:Math.max(0,r.top-PAD),w:r.width+PAD*2,h:r.height+PAD*2};
    calcTip();
  };
  requestAnimationFrame(()=>requestAnimationFrame(doMeasure));
}
function calcTip(){
  const sr=spotRect.value;const vw=window.innerWidth;const vh=window.innerHeight;
  const tipW=Math.min(340,vw-24);const tipH=260;const gap=16;
  let top=sr.y+sr.h+gap;let side:'bottom'|'top'='bottom';
  if(top+tipH>vh){top=Math.max(8,sr.y-tipH-gap);side='top'}
  if(top<8)top=8;
  let left=Math.round((vw-tipW)/2);
  if(left<12)left=12;
  if(left+tipW>vw-12)left=vw-tipW-12;
  tipSide.value=side;
  tipPosition.value={position:'fixed',left:left+'px',top:top+'px',width:tipW+'px',zIndex:'3300000'};
}
function goToStep(n:number){
  tutStep.value=n;
  const step=tutSteps.value[n];
  if(step?.tab&&step.tab!==activeTab.value)activeTab.value=step.tab as any;
  nextTick(()=>setTimeout(measureTarget,350));
}
function startSpotlightTutorial(){goToStep(1)}
function nextSpotlightStep(){if(tutStep.value<tutTotalSteps-1)goToStep(tutStep.value+1)}
function prevSpotlightStep(){if(tutStep.value>1)goToStep(tutStep.value-1)}
function skipTutorial(){showTutorial.value=false;settings.value.tutorialDone=true;saveSettings()}
function finishTutorial(){showTutorial.value=false;settings.value.tutorialDone=true;saveSettings();activeTab.value='home';os.toast(copy.welcomeToHatask)}
// 旗鯖fork: 設定からの再表示は本編込みのフル導入(単独モードでない)。
function reopenTutorial(){tutThemeStandalone.value=false;showTutTheme.value=true}
// 旗鯖fork(v2 §14): チュートリアル冒頭のテーマ選択ステップ。3テーマ＋明暗を即時プレビューで確定してから本編へ。
const showTutTheme=ref(false);
// 旗鯖fork(v2): 既存ユーザーがリデザイン後に初めて開いたときの「単独テーマ選択(告知)モーダル」フラグ。
//   true のときは確定してもスポットライト本編に進まず閉じるだけ。
const tutThemeStandalone=ref(false);
const tutThemes=computed(() => [
  {id:'kisetsu',jp:copy.themeKisetsu,desc:copy.themeKisetsuDescription,bg:'#f4f1ea',fg:'#211d18',accent:'#8a3d1f'},
  {id:'kashin',jp:copy.themeKashin,desc:copy.themeKashinDescription,bg:'#fff5e6',fg:'#25201c',accent:'#ff6b4a'},
  {id:'suri',jp:copy.themeSuri,desc:copy.themeSuriDescription,bg:'#efe7d4',fg:'#1a1a2e',accent:'#2a52c0'},
  // 旗鯖fork(ハタキュ): コルク板の地色と、紙に載る青。
  {id:'hatakyu',jp:copy.themeHatakyu,desc:copy.themeHatakyuDescription,bg:'#c9975f',fg:'#3b2a1c',accent:'#1272ec'},
]);
function pickTutTheme(id:string){settings.value.theme=id;saveSettings()}
function setTutMode(dark:boolean){settings.value.darkMode=dark;settings.value.autoTheme=false;saveSettings()}
function startTutFromTheme(){
  // ⚠️このテーマ選択の一覧にはハタキュも並ぶ。ここを通った人へ後から新テーマ案内を出すと
  //   「さっき選んだのに」と二度手間になるので、案内済みとして扱う。
  settings.value.v2Onboarded=true;settings.value.hatakyuNoticeShown=true;saveSettings();
  showTutTheme.value=false;
  // 既存ユーザー(単独告知)は本編に進まず閉じるだけ。新規は本編ウェルカムへ。
  if(tutThemeStandalone.value){tutThemeStandalone.value=false;os.toast(copy.themeSet);return;}
  tutStep.value=0;showTutorial.value=true;
}
function skipTutTheme(){showTutTheme.value=false;settings.value.v2Onboarded=true;settings.value.hatakyuNoticeShown=true;settings.value.tutorialDone=true;tutThemeStandalone.value=false;saveSettings()}
function openDrawingTool(){
  showMobileNav.value=false;
	  os.popup(defineAsyncComponent(()=>import('@/components/MkDrawingTool.vue')),{},{closed:()=>{showMobileNav.value=true}});
}

function openHataCard() {
	cleanupHataskState();
	routeRouter.push('/hatask/card-maker');
}
// ===== Hatask page swipe navigation =====
const htkTouchStartPos=ref<{x:number;y:number}|null>(null);
const htkTouchLastPos=ref<{x:number;y:number}|null>(null);
let htkSwipeLocked=false;
function htkTouchStart(e:TouchEvent){
  htkTouchStartPos.value={x:e.touches[0].clientX,y:e.touches[0].clientY};
  htkTouchLastPos.value={x:e.touches[0].clientX,y:e.touches[0].clientY};
  htkSwipeLocked=false;
}
function htkTouchMove(e:TouchEvent){
  if(!htkTouchStartPos.value)return;
  htkTouchLastPos.value={x:e.touches[0].clientX,y:e.touches[0].clientY};
}
function htkTouchEnd(e:TouchEvent){
  if(!htkTouchStartPos.value||!htkTouchLastPos.value)return;
  const dx=htkTouchLastPos.value.x-htkTouchStartPos.value.x;
  const dy=htkTouchLastPos.value.y-htkTouchStartPos.value.y;
  htkTouchStartPos.value=null;
  htkTouchLastPos.value=null;
  if(htkSwipeLocked)return;
  if(Math.abs(dy)>Math.abs(dx)*1.2)return; // vertical scroll
  if(Math.abs(dx)<80)return; // too short
  htkSwipeLocked=true;
  const tabIds=tabs.value.map(t=>t.id);
  const idx=tabIds.indexOf(activeTab.value);
  if(dx>0&&idx>0)activeTab.value=tabIds[idx-1];
  else if(dx<0&&idx<tabIds.length-1)activeTab.value=tabIds[idx+1];
}
function openPortal(){window.open('https://home.tolehata.net','_blank')}
function cleanupHataskState(){
  // 旗鯖fork(タスク8): Hataskを離れたらフローティング連動フラグを下げる(フローティング復活)
  hatakMascotActive.value=false;
  // 旗鯖fork(タスク2): カードの文言ローテタイマーを停止(残留防止)
  stopMascotCardRotation();
  // 旗鯖fork(ハタキュ): 離脱中に裏で突風のタイマーを回し続けない
  hkStopWind();
  // 旗鯖fork(#36): 通知・地震ポーリング/購読を停止
  if(hfTimer){clearInterval(hfTimer);hfTimer=null}
  if(eqPollTimer){clearInterval(eqPollTimer);eqPollTimer=null}
  if(eqStream){try{eqStream.off('earthquakeEvent',onEqEvent);eqStream.off('_connected_',onEqStreamConn);eqStream.off('_disconnected_',onEqStreamDisc);}catch{}eqStream=null}
  showMobileNav.value=false;
  if(navProtectionObserver){navProtectionObserver.disconnect();navProtectionObserver=null}
  if(navVisibilityTimer){clearInterval(navVisibilityTimer);navVisibilityTimer=null}
  try{delete document.body.dataset.hataskActive;document.querySelectorAll<HTMLElement>('[data-htask-hidden]').forEach(el=>{el.style.removeProperty('display');delete el.dataset.htaskHidden})}catch{}
  nextTick(()=>{document.querySelectorAll('.htk-nav-mobile').forEach(el=>el.remove());document.querySelectorAll('.htk-nav-pad').forEach(el=>el.remove())});
}
function openHataSettings(){cleanupHataskState();routeRouter.push('/settings/hata-custom')}
function openHataDocs(){cleanupHataskState();routeRouter.push('/hata-docs')}
function openHataSideStudio(){cleanupHataskState();routeRouter.push('/hata-side-studio')}
function openHataWhatsNew(){
  const {dispose}=os.popup(defineAsyncComponent(()=>import('@/components/MkHataWhatsNew.vue')),{}, {closed:()=>dispose()});
}
function openHatalyze(){cleanupHataskState();routeRouter.push('/hatask/emotion-analysis')}
// 旗鯖fork: HataFeed / 地震・津波情報ビューアを旗鯖独自アプリから開く
	const canAccessHataFeed=computed(()=>($i?.policies as Record<string, unknown> | undefined)?.canAccessHataFeed===true||$i?.isModerator===true||$i?.isAdmin===true);
// 旗鯖fork(v2): ホームのアプリ一覧(3テーマ共通データ)。short=短縮ラベル。color=季/花信のアイコン地色。
const homeApps=computed(()=>{
  const a=[
    {label:copy.appDrawing,short:copy.appDrawingShort,icon:'ti ti-brush',color:'#7eb5b2',fn:openDrawingTool},
		{ label: copy.appCardMaker, short: copy.appCardMakerShort, icon: 'ti ti-cards', color: '#e8a87c', fn: openHataCard },
	{label:'HataSideStudio',short:'SideStudio',icon:'ti ti-layout-sidebar-left-expand',color:'#8b7cf6',fn:openHataSideStudio},
	{label:copy.appWhatsNew,short:copy.appWhatsNewShort,icon:'ti ti-news',color:'#5b8fd6',fn:openHataWhatsNew},
    {label:copy.appPortal,short:copy.appPortalShort,icon:'ti ti-door-enter',color:'#a78bfa',fn:openPortal},
    {label:copy.appHataSettings,short:copy.appHataSettingsShort,icon:'ti ti-flag',color:'#f472b6',fn:openHataSettings},
    {label:copy.appGuide,short:copy.appGuideShort,icon:'ti ti-book',color:'#60a5fa',fn:openHataDocs},
    {label:emotionCopy.title,short:emotionCopy.title,icon:'ti ti-mood-search',color:'#f59e0b',fn:openHatalyze},
  ];
  if(canAccessHataFeed.value)a.push({label:'HataFeed',short:'HataFeed',icon:'ti ti-message-report',color:'#34d399',fn:openHataFeed});
  a.push({label:'Hatady',short:'Hatady',icon:'ti ti-book-2',color:'#e79b5e',fn:openHatady});
  a.push({label:'地震・津波情報',short:'地震',icon:'ti ti-activity',color:'#f87171',fn:openEarthquake});
  return a;
});
// 旗鯖fork(v2): ホームの予定日付も Hataskey 共通言語の Intl 表示にする。
function evMD(d:string){return d ? monthDayFormatter.format(parseIsoDate(d)) : ''}

function eventTimeLabel(ev:any):string {return ev.allDay?copy.allDay:((ev.timeStart||'')+(ev.timeEnd?' - ' + ev.timeEnd : ''));}

function eventDateTimeLabel(ev:any):string {return `${longDateFormatter.format(parseIsoDate(ev.date))} ${eventTimeLabel(ev)}`.trim();}

function eventDateRangeLabel(ev:any):string {
	const start = longDateFormatter.format(parseIsoDate(ev.date));
	const end = ev.dateEnd && ev.dateEnd !== ev.date ? longDateFormatter.format(parseIsoDate(ev.dateEnd)) : '';
	return end ? copyx.dateRange({ start, end }) : start;
}
// 旗鯖fork(v2): 季ホーム末尾に並べる旗鯖独自セクション。
const forkSections=['feedbackNotif','earthquake','meal'];
// 旗鯖fork(#37): 設定UIは HataskSettings.vue に一本化(旗鯖独自設定と同じpopup)
//   reopenTutorial イベントを受けて Hatask本体側のチュートリアル再表示を実行する
function openHataskSettings(){
  os.popup(defineAsyncComponent(()=>import('@/pages/HataskSettings.vue')), {}, {
    reopenTutorial: () => { setTimeout(reopenTutorial, 250); },
    // 旗鯖fork(v2): 設定変更を即時反映(theme/darkMode/animations 等 → data-theme/data-anim/themeMode が反応)。
    changed: (s:any) => { if (s && typeof s === 'object') { settings.value = { ...settings.value, ...s }; } },
	  });
}
function openHataFeed(){cleanupHataskState();routeRouter.push('/hatafeed')}
// 旗鯖fork: Hatady(学習・読書記録)を旗鯖独自アプリから開く
function openHatady(){cleanupHataskState();routeRouter.push('/hatady')}
function openEarthquake(){cleanupHataskState();routeRouter.push('/earthquake')}

// 旗鯖fork(#36): HataFeed通知タイル
const hfNotifs=ref<HataFeedNotif[]>([]);
const hfUnread=ref(0);
const hfReadingNotificationIds = new Set<string>();
let hfTimer:ReturnType<typeof setInterval>|null=null;
async function loadHfNotifs(){
  if(!canAccessHataFeed.value)return;
  try{
    const res:any=await misskeyApi('hata/feedback/notifications',{limit:5});
    hfNotifs.value=res.notifications||[];
    hfUnread.value=res.unreadCount||0;
  }catch{}
}
function hfIcon(type:string):string{
  // hatafeedのnotifIcon相当の最低限版
  if(type==='newIssue')return 'ti-pencil-plus';
  if(type==='issueAgreed')return 'ti-thumb-up';
  if(type==='issueStatusChanged')return 'ti-progress';
  if(type==='issueResolved')return 'ti-check';
  if(type==='issueClosed')return 'ti-lock';
  if(type==='newComment'||type==='commentReaction'||type==='commentReply')return 'ti-message';
  if(type==='emojiApproved')return 'ti-mood-smile';
  if(type==='emojiRejected')return 'ti-mood-sad';
  return 'ti-bell';
}

async function onHfNotifClick(n: HataFeedNotif) {
	if (!n.isRead && !hfReadingNotificationIds.has(n.id)) {
		hfReadingNotificationIds.add(n.id);
		try {
			await misskeyApi('hata/feedback/notifications/read', { notificationId: n.id });
			hfNotifs.value = hfNotifs.value.map(item => item.id === n.id ? { ...item, isRead: true } : item);
			hfUnread.value = Math.max(0, hfUnread.value - 1);
		} catch {
			// 既読更新に失敗しても、通知先を読む動線は妨げない。
		} finally {
			hfReadingNotificationIds.delete(n.id);
		}
	}
	cleanupHataskState();
	if (n.feedbackId) routeRouter.pushByPath('/hatafeed/' + n.feedbackId);
	else routeRouter.push('/hatafeed');
}

// 旗鯖fork(#36): 地震・津波タイル(WS購読＋ポーリング)
const rawQuakes=ref<any[]>([]);
const tsunami=ref<any[]>([]);
const streamConnected=ref(false);
const eqLastReceived=ref('');
let eqStream:any=null;let eqPollTimer:ReturnType<typeof setInterval>|null=null;
async function loadEq(){
  try{
    const [eq,ts]=await Promise.all([
      misskeyApi('hata/earthquake/history',{limit:30}),
      misskeyApi('hata/earthquake/tsunami',{limit:10}),
    ]);
    const {pruneOld}=await import('@/utility/earthquake.js');
    rawQuakes.value=pruneOld((eq as any[])??[]);
    tsunami.value=pruneOld((ts as any[])??[]);
    eqLastReceived.value=new Date().toLocaleTimeString('ja-JP');
  }catch{}
}
async function onEqEvent(ev:{code:number;item:any}){
  const {pruneOld}=await import('@/utility/earthquake.js');
  if(ev.code===551)rawQuakes.value=pruneOld([ev.item,...rawQuakes.value]).slice(0,60);
  else if(ev.code===552)tsunami.value=pruneOld([ev.item,...tsunami.value]).slice(0,20);
  eqLastReceived.value=new Date().toLocaleTimeString('ja-JP');
}
// 旗鯖fork(perf): WS接続中はポーリングを止め、切断時のみフォールバックとして動かす。
//   WSが活きていれば earthquakeEvent がリアルタイムで届くため、60秒ポーリングは重複。
function startEqPoll(){if(!eqPollTimer)eqPollTimer=setInterval(loadEq,60000)}
function stopEqPoll(){if(eqPollTimer){clearInterval(eqPollTimer);eqPollTimer=null}}
function onEqStreamConn(){streamConnected.value=true;stopEqPoll()}
function onEqStreamDisc(){streamConnected.value=false;startEqPoll()}
function handleBack(){
if(activeTab.value!=='home'){activeTab.value='home';return}
goBackToTimeline();
}
function goBackToTimeline(){
cleanupHataskState();
routeRouter.push('/');
}

// ========== NOTIFICATION SYSTEM (Misskey API) ==========
// 旗鯖fork: 予定通知と気持ちリマインドでタイマーの入れ物を分ける。
// ⚠️1つの配列を共有すると、予定を1件追加しただけで気持ちリマインドのタイマーまで消える
//   (scheduleEventNotifications が「全消ししてから張り直す」ため)。
const eventTimerIds:number[]=[];
const moodTimerIds:number[]=[];
// 旗鯖fork: 第4引数 link でクリック先パスを指定可能(デフォルト '/hatask' = 全hatask通知をhataskページに飛ばす)。
// 呼び出し側で別のパスに飛ばしたい場合のみ link を明示すればよい。
async function sendNotification(header:string,body:string,icon?:string,link:string='/hatask'){
try{await misskeyApi('notifications/create',{body,header:header||null,icon:icon||null,link:link||null});return true}catch(e){console.warn('Hatask notification error:',e);return false}
}

function scheduleEventNotifications(){
// Clear existing timers
eventTimerIds.forEach(id=>clearTimeout(id));eventTimerIds.length=0;
const now=Date.now();
events.value.forEach(ev=>{
if(!ev.notify||!ev.notifyTimings||!ev.notifyTimings.length)return;
const eventTime=new Date(ev.date+'T'+ev.timeStart).getTime();
if(eventTime<now)return;// past event
ev.notifyTimings.forEach((timing:string)=>{
let msAhead=0;
if(timing==='15分前')msAhead=15*60*1000;
else if(timing==='30分前')msAhead=30*60*1000;
else if(timing==='1時間前')msAhead=60*60*1000;
else if(timing==='1日前')msAhead=24*60*60*1000;
const fireAt=eventTime-msAhead;
const delay=fireAt-now;
if(delay>0&&delay<24*60*60*1000){// only schedule within next 24h
const tid=window.setTimeout(()=>{sendNotification(ev.title,copyx.eventReminderBody({ timing: notifyTimingLabel(timing), start: ev.timeStart, end: ev.timeEnd }), undefined, '/hatask?notice=calendar')},delay);
eventTimerIds.push(tid)
}})
})
}
function scheduleMoodReminders(){
// ⚠️まず消す。ここを省くと呼ばれるたびにタイマーが積み上がり、同じ時刻に何通も届く。
// ⚠️早期returnより前で消すこと。後ろに置くと、リマインドをOFFにしても既存の分が鳴る。
moodTimerIds.forEach(id=>clearTimeout(id));moodTimerIds.length=0;
if(!settings.value.moodRemind||!settings.value.moodRemindTimes?.length)return;
const now=new Date();const today=now.toISOString().slice(0,10);
const timeMap:Record<string,string>={'朝 8:00':'08:00','昼 12:00':'12:00','夜 20:00':'20:00','寝る前 23:00':'23:00'};
settings.value.moodRemindTimes.forEach((t:string)=>{
const hm=timeMap[t];if(!hm)return;
const fireAt=new Date(today+'T'+hm).getTime();
const delay=fireAt-Date.now();
if(delay>0&&delay<24*60*60*1000){
const tid=window.setTimeout(()=>{
const todaysMoods=moods.value.filter((m:any)=>m.date===today);
if(todaysMoods.length===0){sendNotification(copy.moodReminderTitle, copy.moodReminderBody, undefined,'/hatask?notice=mood')}
},delay);
moodTimerIds.push(tid)
}})
}
const currentTime=ref('');const currentDate=ref('');const eyePhrase=ref(getDefaultPhrase());const editingEvent=ref<any>(null);let eyeTimer:ReturnType<typeof setInterval>|null=null;
// 旗鯖fork(v2): テーマ別の時計まわり日付パーツ(季=1月9日/金曜日, 刷=2026.01.09/FRIDAY)。
const clockMD=ref('');const clockDow=ref('');const clockDot=ref('');const clockEn=ref('');
// 旗鯖fork(タスク8/タスク2): マスコットカード(ミニ版)。
// 静止画ではなく現在の表情(currentExpression)に追従させ、設定文言をランダムローテで吹き出しに出す。
// 吹き出し座標・motionはフローティング(MkMascotFloating)と同じロジック・同じグローバルmotionクラスを共有する。
// announce(通知/誕生日/未読)はカードでは出さず、設定文言のみをローテする(論点①: 通知/誕生日除外)。
const mascotCardName=computed(()=>mascotActiveCharacter.value?.name ?? '');
// 旗鯖fork: マスコット機能の利用可否(ロールポリシー)。未許可ならホームのマスコットカードを出さない。
	const canUseMascot=computed(() => ($i?.policies as Record<string, unknown> | undefined)?.canUseMascot === true);
const mascotCardUrl=computed(()=>{const c=mascotActiveCharacter.value;if(!c||c.expressions.length===0)return '';return expressionDisplayUrl(mascotCurrentExpression.value ?? c.expressions[0]);});
// 表示する文言(設定文言のローテのみ。announceは無視)。tellRandomPhrasesがOFFなら出さない。
const mascotCardPhrase=computed(()=>{
  if(mascotDisplaySettings.value.tellRandomPhrases===false)return '';
  const t=mascotCurrentPhrase.value?.text ?? '';
  return t ? mascotEscapeText(t) : '';
});
// 吹き出し座標(フローティングの bubbleStyle と同一ロジック)。表情ごとの bubbleX/Y/scale を枠基準%で配置。
const mascotCardBubbleStyle=computed(()=>{
  const e=mascotCurrentExpression.value;
  const x=(typeof e?.bubbleX==='number'?e.bubbleX:0.5);
  const y=(typeof e?.bubbleY==='number'?e.bubbleY:0.1);
  const scale=(typeof e?.bubbleScale==='number'?e.bubbleScale:1);
  const s:Record<string,string>={left:(x*100)+'%',top:(y*100)+'%',fontSize:(0.85*scale)+'rem'};
  if(e?.textColor)s.color=e.textColor;
  return s;
});
const mascotCardBubbleTail=computed<'left'|'right'>(()=>(mascotCurrentExpression.value?.bubbleTail==='right'?'right':'left'));
// 立ち絵モーション(フローティングが定義済みのグローバルクラスをそのまま流用。論点②: 同じmotionをそのまま出す)。
const mascotCardMotionClass=computed(()=>{
  const m=mascotCurrentExpression.value?.motion ?? 'none';
  return m==='bounce'?'htkFloatMotionBounce':m==='shake'?'htkFloatMotionShake':m==='sway'?'htkFloatMotionSway':m==='spin'?'htkFloatMotionSpin':'';
});
// カードのクリックで次の文言へ(フローティングと同じ操作感)。announceは使わないのでpickRandomPhraseのみ。
function onMascotCardClick(){mascotPickRandomPhrase();}
// マスコット専用設定(論点③)。/mascot は表示ページなので、設定は hata-custom と同じく
// MkMascotSettings をポップアップで開く(Haskを離れないのでcleanup不要)。
	function goToMascotSettings(){os.popup(defineAsyncComponent(()=>import('@/pages/MkMascotSettings.vue')),{},{});}
// カードの文言ローテ(論点①)。フローティングが非表示の間はフローティング側のローテが回らないため、カードが自前で回す。
let mascotCardRotateTimer:ReturnType<typeof setTimeout>|null=null;
function startMascotCardRotation(){
  stopMascotCardRotation();
  const delay=mascotNextIdleDelayMs();
  mascotCardRotateTimer=setTimeout(()=>{mascotPickRandomPhrase();startMascotCardRotation();},delay);
}
function stopMascotCardRotation(){if(mascotCardRotateTimer){clearTimeout(mascotCardRotateTimer);mascotCardRotateTimer=null;}}
const closedRsvpNotifs=ref<{eventId:string,emoji:string,title:string,goCount:number}[]>([]);
const dismissedRsvpNotifs=ref<string[]>([]);
const sharedEvents=ref<any[]>([]);
async function loadSharedEvents(){try{const list=await misskeyApi('hatask/events/list',{limit:50,includeExpired:true});sharedEvents.value=list as any[]}catch(e){console.warn('Failed to load shared events:',e);sharedEvents.value=[]}}
function sharedEventData(eventId:string){return sharedEvents.value.find(e=>e.id===eventId)||null}
function sharedRsvpResponses(eventId:string){return sharedEventData(eventId)?.rsvpResponses||[]}
function sharedRsvpMyStatus(eventId:string){const r=sharedRsvpResponses(eventId).find((r:any)=>r.userId===$i?.id);return r?.status||null}
const viewingEvent=ref<any>(null);
function openEventDetail(ev:any){viewingEvent.value=(viewingEvent.value?.id===ev.id)?null:ev}
function closeEventDetail(){viewingEvent.value=null}

let clockInterval:ReturnType<typeof setInterval>|null=null;

// ========== LOGIN DAYS ==========
const loginDays=computed(()=>$i?.loggedInDays??0);
const loginRanking=ref(0);const loginTotal=ref(0);
const loginMilestones=[3,7,15,30,60,100,200,300,400,500,600,700,800,900,1000];
const loginNextReward=computed(()=>{const d=loginDays.value;for(const m of loginMilestones){if(d<m)return m-d}return 0});
const loginMessage=computed(()=>{const d=loginDays.value;if(d<=1)return copy.loginFirst;if(d<7)return copy.loginGettingUsed;if(d<30)return copy.loginRegular;if(d<100)return copy.loginThankYou;if(d<365)return copy.loginAmazing;return copy.loginLegend});
async function fetchLoginRanking(){try{const res=await misskeyApi('hata/login-ranking',{});if(res&&typeof res.rank==='number'){loginRanking.value=res.rank;loginTotal.value=res.totalUsers??0}}catch(e){console.warn('Login ranking unavailable:',e)}}
const settings=ref<any>({darkMode:false,autoTheme:true,weekStart:'mon',showClock:true,showEvents:true,showFlower:true,showMoodSummary:true,showFeedbackNotif:true,showEarthquake:true,moodRemind:false,moodRemindTimes:['昼 12:00','寝る前 23:00'],openOnStart:false,theme:'kisetsu',animations:true});
// 旗鯖fork(v2 §16①): ブート表示中にテーマが確定/変更されたら要素を作り直し、現テーマで最初から再生
//   (設定の非同期ロードや切替でブートが2テーマ混ざるのを防ぐ)。
//   watch は登録時に監視元を評価するため、settings の宣言後に置く。
watch(() => settings.value.theme, () => { if(showBoot.value) bootKey.value++; });
const prefersDark=ref(window.matchMedia('(prefers-color-scheme:dark)').matches);
let mediaQuery:MediaQueryList|null=null;
function detectMisskeyTheme():'dark'|'light'{
  const cs=window.getComputedStyle(document.documentElement);
  const bg=cs.getPropertyValue('--MI_THEME-bg').trim()||cs.getPropertyValue('--MI_THEME-panel').trim()||'';
  if(bg){const m=bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);if(m){return(parseInt(m[1])*299+parseInt(m[2])*587+parseInt(m[3])*114)/1000<128?'dark':'light'}}
  return prefersDark.value?'dark':'light';
}
const misskeyTheme=ref(detectMisskeyTheme());
// Hatask背景テーマに応じた文字色モード判定
// ocean/forest/night = 暗い背景 → 常にdark（白文字）
const themeMode=computed(()=>{
  // 旗鯖fork: 設定に従う。autoTheme時はOS/Misskeyのダーク判定、それ以外は darkMode トグルに従う。
  if(settings.value.autoTheme){
    return (prefersDark.value || misskeyTheme.value==='dark') ? 'dark' : 'light';
  }
  return settings.value.darkMode ? 'dark' : 'light';
});
function onMediaChange(e:MediaQueryListEvent){prefersDark.value=e.matches;misskeyTheme.value=detectMisskeyTheme()}
let htk_themeObserver:MutationObserver|null=null;
function startHtkThemeWatch(){
  misskeyTheme.value=detectMisskeyTheme();
  htk_themeObserver=new MutationObserver(()=>{misskeyTheme.value=detectMisskeyTheme()});
  htk_themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-color-mode','class','style']});
}
function stopHtkThemeWatch(){htk_themeObserver?.disconnect();htk_themeObserver=null}
function toggleAutoTheme(){settings.value.autoTheme=!settings.value.autoTheme;saveSettings()}
// 旗鯖fork: Hatask Eye 注意事項を閉じる (初回表示フラグを保存して二度目以降は自動表示しない)
function dismissEyeDisclaimer(){showEyeDisclaimer.value=false;settings.value.eyeDisclaimerShown=true;saveSettings()}
async function saveSettings(){await registrySet('settings',settings.value)}
// 旗鯖fork(ハタキュ): 風まわりの watch はここで張る。
//   ⚠️settings の宣言より前に張ると、watch の初回評価が settings の初期化前に走ってしまう。
watch(hkWindEnabled,(on)=>{ if(on) hkScheduleWind(); else hkStopWind(); });
// タブを切り替えた瞬間にも1回吹かせる(紙が入れ替わったことが伝わる)。
watch(activeTab,()=>{ if(hkWindEnabled.value){hkBlowWind();hkScheduleWind();} });
function toggleMoodRemindTime(t:string){if(!settings.value.moodRemindTimes)settings.value.moodRemindTimes=[];const i=settings.value.moodRemindTimes.indexOf(t);if(i>=0)settings.value.moodRemindTimes.splice(i,1);else settings.value.moodRemindTimes.push(t);saveSettings();scheduleMoodReminders()}
function toggleNotifyTiming(t:string){const i=newEvent.value.notifyTimings.indexOf(t);if(i>=0)newEvent.value.notifyTimings.splice(i,1);else newEvent.value.notifyTimings.push(t)}

// Calendar
const calYear=ref(new Date().getFullYear());const calMonth=ref(new Date().getMonth());const selectedDay=ref<number|null>(new Date().getDate());
const calendarTitle = computed(() => yearMonthFormatter.format(new Date(calYear.value, calMonth.value, 1)));
const selectedDateLabel = computed(() => selectedDay.value == null ? '' : longDateFormatter.format(new Date(calYear.value, calMonth.value, selectedDay.value)));
function chMo(d:number){calMonth.value+=d;if(calMonth.value>11){calMonth.value=0;calYear.value++}if(calMonth.value<0){calMonth.value=11;calYear.value--}selectedDay.value=null;viewingEvent.value=null}
function goToday(){const n=new Date();calYear.value=n.getFullYear();calMonth.value=n.getMonth();selectedDay.value=n.getDate()}
function selectDay(d:number){selectedDay.value=d;viewingEvent.value=null;const ds=`${calYear.value}-${String(calMonth.value+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;newEvent.value.date=ds;newEvent.value.dateEnd=ds;editingEvent.value=null}
const selectedDateStr=computed(()=>{if(!selectedDay.value)return'';return`${calYear.value}-${String(calMonth.value+1).padStart(2,'0')}-${String(selectedDay.value).padStart(2,'0')}`});
// allCalendarEvents: ローカル + 共有（公開）イベントをマージ（重複除去）
const allCalendarEvents=computed(()=>{const local=[...events.value];const localIds=new Set(local.map(e=>e.id));const shared=sharedEvents.value.filter(e=>!localIds.has(e.id)).map(e=>({...e,isShared:true,visibility:'public'}));return[...local,...shared]});
const eventsForDay=computed(()=>{if(!selectedDateStr.value)return[];return allCalendarEvents.value.filter(e=>{if(e.date===selectedDateStr.value)return true;if(e.dateEnd&&e.date<=selectedDateStr.value&&e.dateEnd>=selectedDateStr.value)return true;return false}).sort((a,b)=>{if(a.allDay&&!b.allDay)return-1;if(!a.allDay&&b.allDay)return 1;return(a.timeStart||'').localeCompare(b.timeStart||'')})});
function hasEventsOn(ds:string){return allCalendarEvents.value.some(e=>e.date===ds||(e.dateEnd&&e.date<=ds&&e.dateEnd>=ds))}
function eventDotsFor(ds:string){return allCalendarEvents.value.filter(e=>e.date===ds||(e.dateEnd&&e.date<=ds&&e.dateEnd>=ds)).slice(0,3)}
function startEditEvent(ev:any){editingEvent.value=ev;newEvent.value={title:ev.title,emoji:ev.emoji||'⭐',date:ev.date,timeStart:ev.timeStart||'14:00',dateEnd:ev.dateEnd||ev.date,timeEnd:ev.timeEnd||'15:00',color:ev.color||'#e27d60',visibility:ev.visibility||'private',rsvp:ev.rsvp||false,notify:ev.notify||false,notifyTimings:ev.notifyTimings?[...ev.notifyTimings]:['15分前'],allDay:ev.allDay||false}}
async function deleteEventById(id:string){
// 共有イベントの場合は自分のイベントのみ削除可
const shared=sharedEventData(id);
if(shared && shared.userId!==$i?.id){os.toast(copy.cannotDeleteOthersEvent);return}
try{await misskeyApi('hatask/events/delete',{eventId:id})}catch{}
events.value=events.value.filter(e=>e.id!==id);if(editingEvent.value?.id===id)editingEvent.value=null;viewingEvent.value=null;await registrySet('events',events.value);await loadSharedEvents();os.toast(copy.eventDeleted)}
const calCells=computed(()=>{const fd=new Date(calYear.value,calMonth.value,1).getDay();const dim=new Date(calYear.value,calMonth.value+1,0).getDate();const dip=new Date(calYear.value,calMonth.value,0).getDate();const so=fd===0?6:fd-1;const td=new Date();const cells:any[]=[];for(let i=so-1;i>=0;i--)cells.push({day:dip-i,om:true});for(let d=1;d<=dim;d++){const ds=`${calYear.value}-${String(calMonth.value+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;cells.push({day:d,om:false,today:d===td.getDate()&&calMonth.value===td.getMonth()&&calYear.value===td.getFullYear(),selected:d===selectedDay.value,hasEvents:hasEventsOn(ds),dots:eventDotsFor(ds)})}const rem=(7-cells.length%7)%7;for(let d=1;d<=rem;d++)cells.push({day:d,om:true});return cells});

// Events
const events=ref<any[]>([]);
const td=()=>new Date().toISOString().slice(0,10);
const newEvent=ref({title:'',emoji:'⭐',date:td(),timeStart:'14:00',dateEnd:td(),timeEnd:'15:00',color:'#e27d60',visibility:'private',rsvp:false,notify:true,notifyTimings:['15分前','30分前'],allDay:false});
const upcomingEvents=computed(()=>allCalendarEvents.value.filter(e=>e.date>=td()).sort((a,b)=>a.date.localeCompare(b.date)));
const publicEvents=computed(()=>{const now=td();const localPublic=events.value.filter(e=>e.visibility==='public'&&e.date>=now);const localIds=new Set(localPublic.map(e=>e.id));const shared=sharedEvents.value.filter(e=>e.date>=now&&!localIds.has(e.id)).map(e=>({...e,isShared:true}));return[...localPublic,...shared]});
function goToEvent(ev:any){activeTab.value='cal';const d=new Date(ev.date);calYear.value=d.getFullYear();calMonth.value=d.getMonth();selectedDay.value=d.getDate();viewingEvent.value=ev}
async function addEvent(){if(!newEvent.value.title.trim())return;
const isEditing=!!editingEvent.value;
const ne:any={id:editingEvent.value?.id||generateId(),title:newEvent.value.title.trim(),emoji:newEvent.value.emoji,date:newEvent.value.date,dateEnd:newEvent.value.dateEnd,color:newEvent.value.color,visibility:newEvent.value.visibility,rsvp:newEvent.value.rsvp,notify:newEvent.value.notify,notifyTimings:[...newEvent.value.notifyTimings],allDay:newEvent.value.allDay};
if(newEvent.value.allDay){ne.timeStart='';ne.timeEnd='';ne.timeLabel=newEvent.value.date+(newEvent.value.dateEnd!==newEvent.value.date?' ~ '+newEvent.value.dateEnd:'')+' 終日'}else{ne.timeStart=newEvent.value.timeStart;ne.timeEnd=newEvent.value.timeEnd;ne.timeLabel=newEvent.value.date+' '+newEvent.value.timeStart+' - '+newEvent.value.timeEnd}
if(editingEvent.value){const idx=events.value.findIndex(e=>e.id===editingEvent.value.id);if(idx>=0)events.value.splice(idx,1,ne);else events.value.unshift(ne);editingEvent.value=null}else{events.value.unshift(ne)}
newEvent.value.title='';newEvent.value.allDay=false;await registrySet('events',events.value);scheduleEventNotifications();os.toast(isEditing?copy.eventUpdated:copy.eventSaved);
// 公開イベントを新規作成した場合、APIに共有イベントを登録
if(!isEditing && ne.visibility==='public'){
  try{
    await misskeyApi('hatask/events/create',{title:ne.title,emoji:ne.emoji,date:ne.date,dateEnd:ne.dateEnd||'',timeStart:ne.timeStart||'',timeEnd:ne.timeEnd||'',allDay:ne.allDay||false,color:ne.color||'#e27d60',rsvp:!!ne.rsvp});
    await loadSharedEvents();
    // RSVP付きならノートで告知
    if(ne.rsvp){
      const timeInfo = ne.allDay ? `${ne.date} ${copy.allDay}` : `${ne.date} ${ne.timeStart}〜${ne.timeEnd}`;
      await misskeyApi('notes/create',{
        text:copyx.rsvpAnnouncement({ emoji: ne.emoji, title: ne.title, time: timeInfo }),
        visibility:'home',
      });
    }
  }catch(e){console.warn('Shared event create failed:',e)}
}
}

// Todo
const newTodo=ref('');const newTodoDue=ref('');const newTodoTime=ref('');const newTodoFolder=ref('');const newTodoComment=ref('');
const showTodoExtra=ref(false);const activeFolder=ref('all');const showFolderMgr=ref(false);
const newFolderName=ref('');const newFolderEmoji=ref('📁');const newFolderColor=ref('');const expandedTodo=ref<string|null>(null);const sortMode=ref('manual');
const folderColors=computed(() => [{value:'#e57373',label:copy.colorRed},{value:'#ffb74d',label:copy.colorOrange},{value:'#fff176',label:copy.colorYellow},{value:'#81c784',label:copy.colorGreen},{value:'#64b5f6',label:copy.colorBlue},{value:'#ba68c8',label:copy.colorPurple}]);
const todos=ref<any[]>([]);const folders=ref<any[]>([]);
const pendingCount=computed(()=>todos.value.filter(t=>!t.done).length);
function folderCount(fid:string){return todos.value.filter(t=>!t.done&&t.folder===fid).length}
const sortedTodos=computed(()=>{let list=activeFolder.value==='all'?[...todos.value]:todos.value.filter(t=>t.folder===activeFolder.value);if(sortMode.value==='dueAsc')list.sort((a,b)=>{if(!a.due)return 1;if(!b.due)return-1;return a.due.localeCompare(b.due)});else if(sortMode.value==='dueDesc')list.sort((a,b)=>{if(!a.due)return 1;if(!b.due)return-1;return b.due.localeCompare(a.due)});else if(sortMode.value==='new')list.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));return list});
function getFolder(fid:string){return folders.value.find(f=>f.id===fid)}

// Mood
const selectedMoodLevel=ref(4);const moodNote=ref('');const editingMood=ref<any>(null);
const moods=ref<any[]>([]);
const moodsByDate=computed(()=>{const g:Record<string,any[]>={};[...moods.value].sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time)).forEach(m=>{if(!g[m.date])g[m.date]=[];g[m.date].push(m)});return g});

// Meal(食事記録) - mood と並列。医療目的ではない自己記録メモ。集計の数値化・スコア化はしない
const selectedMealSlot=ref('breakfast');const selectedMealLevel=ref('ate');const selectedMealReasons=ref<string[]>([]);const mealNote=ref('');const editingMeal=ref<any>(null);
const meals=ref<any[]>([]);
const showMealDisclaimer=ref(false);
const mealsByDate=computed(()=>{const g:Record<string,any[]>={};[...meals.value].sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time)).forEach(m=>{if(!g[m.date])g[m.date]=[];g[m.date].push(m)});return g});
// サマリーは数値評価を出さない。記録した行為そのものを中立に肯定する労いのみ
const mealTodayCount=computed(()=>{const today=new Date().toISOString().slice(0,10);return meals.value.filter(m=>m.date===today).length});
// 旗鯖fork(ハタキュ): コルク板の「ごはん記録」紙に貼る今日の分。⚠️多すぎると紙が伸びるので3件まで。
const hkTodayMeals=computed(()=>{const today=new Date().toISOString().slice(0,10);return meals.value.filter(m=>m.date===today).slice(0,3)});
// 旗鯖fork(ハタキュ): カレンダーの「つぎの予定まで」紙。予定が無ければ紙自体を出さない。
const hkNextEvent=computed(()=>upcomingEvents.value[0]??null);
const hkNextEventDays=computed(()=>{
  const ev=hkNextEvent.value;
  if(!ev)return 0;
  const today=new Date();today.setHours(0,0,0,0);
  const d=new Date(ev.date+'T00:00:00');
  // 端数を切り上げずに日数だけを見る(時刻は別に出しているため)。
  return Math.max(0,Math.round((d.getTime()-today.getTime())/86400000));
});
// 旗鯖fork(ハタキュ): ToDoの「今日終わった分」紙。
const hkTodayDoneCount=computed(()=>{
  const today=new Date().toISOString().slice(0,10);
  return todos.value.filter(t=>t.done&&(t.doneAt??'').slice(0,10)===today).length;
});
const mealSummaryMessage=computed(()=>{const c=mealTodayCount.value;if(c===0)return copy.mealSummaryNone;if(c===1)return copy.mealSummaryOne;return copy.mealSummaryMany});

// ===== PAGINATION =====
const ITEMS_PER_PAGE = 10;
const moodPage = ref(1);
const todoPage = ref(1);
const eventPage = ref(1);
const calListPage = ref(1);

// Paginated mood dates
const moodDateKeys = computed(()=>Object.keys(moodsByDate.value));
const moodTotalPages = computed(()=>Math.max(1,Math.ceil(moodDateKeys.value.length/ITEMS_PER_PAGE)));
const pagedMoodDates = computed(()=>{const start=(moodPage.value-1)*ITEMS_PER_PAGE;return moodDateKeys.value.slice(start,start+ITEMS_PER_PAGE)});

// Paginated meal dates
const mealPage = ref(1);
const mealDateKeys = computed(()=>Object.keys(mealsByDate.value));
const mealTotalPages = computed(()=>Math.max(1,Math.ceil(mealDateKeys.value.length/ITEMS_PER_PAGE)));
const pagedMealDates = computed(()=>{const start=(mealPage.value-1)*ITEMS_PER_PAGE;return mealDateKeys.value.slice(start,start+ITEMS_PER_PAGE)});

// Paginated todos
const todoTotalPages = computed(()=>Math.max(1,Math.ceil(sortedTodos.value.length/ITEMS_PER_PAGE)));
const pagedTodos = computed(()=>{const start=(todoPage.value-1)*ITEMS_PER_PAGE;return sortedTodos.value.slice(start,start+ITEMS_PER_PAGE)});

// Paginated events for selected day
const eventTotalPages = computed(()=>Math.max(1,Math.ceil(eventsForDay.value.length/ITEMS_PER_PAGE)));
const pagedEvents = computed(()=>{const start=(eventPage.value-1)*ITEMS_PER_PAGE;return eventsForDay.value.slice(start,start+ITEMS_PER_PAGE)});

// Calendar list view
const calListMode = ref<'day'|'week'|'month'>('day');
const calListSort = ref<'asc'|'desc'>('asc');
const calViewMode = ref<'calendar'|'list'>('calendar');

const calListEvents = computed(()=>{
  const now = new Date();
  let start = '', end = '';
  if(calListMode.value==='day'){
    const d=selectedDateStr.value||`${calYear.value}-${String(calMonth.value+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    start=d; end=d;
  } else if(calListMode.value==='week'){
    const base=selectedDay.value?new Date(calYear.value,calMonth.value,selectedDay.value):now;
    const dow=base.getDay()||7;
    const mon=new Date(base);mon.setDate(base.getDate()-(dow-1));
    const sun=new Date(mon);sun.setDate(mon.getDate()+6);
    start=`${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,'0')}-${String(mon.getDate()).padStart(2,'0')}`;
    end=`${sun.getFullYear()}-${String(sun.getMonth()+1).padStart(2,'0')}-${String(sun.getDate()).padStart(2,'0')}`;
  } else {
    start=`${calYear.value}-${String(calMonth.value+1).padStart(2,'0')}-01`;
    const dim=new Date(calYear.value,calMonth.value+1,0).getDate();
    end=`${calYear.value}-${String(calMonth.value+1).padStart(2,'0')}-${String(dim).padStart(2,'0')}`;
  }
  let list=allCalendarEvents.value.filter(e=>{
    if(e.date>=start&&e.date<=end)return true;
    if(e.dateEnd&&e.date<=end&&e.dateEnd>=start)return true;
    return false;
  });
  list.sort((a:any,b:any)=>{
    const cmp=a.date.localeCompare(b.date)||(a.timeStart||'').localeCompare(b.timeStart||'');
    return calListSort.value==='asc'?cmp:-cmp;
  });
  return list;
});
const calListTotalPages = computed(()=>Math.max(1,Math.ceil(calListEvents.value.length/ITEMS_PER_PAGE)));
const pagedCalList = computed(()=>{const start=(calListPage.value-1)*ITEMS_PER_PAGE;return calListEvents.value.slice(start,start+ITEMS_PER_PAGE)});

const moodAnalysis=computed(()=>{
  const now=new Date();const weekAgo=new Date(now);weekAgo.setDate(weekAgo.getDate()-7);
  const recent=moods.value.filter((m:any)=>{const d=new Date(m.date);return d>=weekAgo});
  const allRecent=recent.length?recent:moods.value.slice(-10);
  const avg=allRecent.reduce((s:number,m:any)=>s+m.level,0)/Math.max(allRecent.length,1);
  const trendEmoji=avg>=4.2?'🥰':avg>=3.5?'😊':avg>=2.8?'😐':avg>=2?'😞':'😢';
  const trendLabel=avg>=4.2?copy.moodTrendVeryPositive:avg>=3.5?copy.moodTrendPositive:avg>=2.8?copy.moodTrendNeutral:avg>=2?copy.moodTrendNegative:copy.moodTrendHard;
  const trendColor=avg>=4.2?'#6bbd67':avg>=3.5?'#85cdca':avg>=2.8?'#d4a574':avg>=2?'#e08760':'#c03050';
  // Time slots
  const slots=[{label:copy.moodTimeMorning,min:6,max:11},{label:copy.moodTimeDay,min:11,max:17},{label:copy.moodTimeEvening,min:17,max:22},{label:copy.moodTimeLateNight,min:22,max:30}];
  const timeSlots=slots.map(s=>{
    const inSlot=moods.value.filter((m:any)=>{if(!m.time)return false;const h=parseInt(m.time.split(':')[0]);const hNorm=h<6?h+24:h;return hNorm>=s.min&&hNorm<s.max});
    const a=inSlot.length?inSlot.reduce((sum:number,m:any)=>sum+m.level,0)/inSlot.length:0;
    const emoji=a>=4?'😊':a>=3?'😐':a>=2?'😞':a>0?'😢':'';
    const color=a>=4?'#6bbd67':a>=3?'#85cdca':a>=2?'#e08760':a>0?'#c03050':'#666';
    return{label:s.label,avg:a,emoji,color,count:inSlot.length}
  }).filter(t=>t.count>0);
  // Insight
  let insight='';
  const best=timeSlots.length?timeSlots.reduce((a,b)=>a.avg>b.avg?a:b):null;
  const worst=timeSlots.length?timeSlots.reduce((a,b)=>a.avg<b.avg?a:b):null;
  if(best&&worst&&best.label!==worst.label&&timeSlots.length>=2){
    insight=copyx.moodInsightComparison({ best: best.label, bestScore: best.avg.toFixed(1), worst: worst.label, worstScore: worst.avg.toFixed(1) })
  }else if(avg>=4){insight=copy.moodInsightPositive}
  else if(avg<=2.5){insight=copy.moodInsightGentle}
  return{avgScore:avg.toFixed(1),avgScoreRaw:avg,trendEmoji,trendLabel,trendColor,timeSlots,insight}
});
const weekMoods=computed(()=>{const now=new Date();const mon=new Date(now);mon.setDate(now.getDate()-((now.getDay()+6)%7));mon.setHours(0,0,0,0);return Array.from({ length: 7 },(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);const ds=d.toISOString().slice(0,10);const last=moods.value.filter(m=>m.date===ds).pop();return{day: weekdayShortFormatter.format(d),icon:last?moodIcons[last.level]:''};})});

// Garden
const flower = ref({ emoji: '🌱', name: 'わかば', progress: 0, startedAt: 0, totalMinutes: 0, lastGrowthAt: 0 });
const gallery=ref<any[]>([]);

function onHataskFlowerGrowth(event: Event): void {
	const next = (event as CustomEvent<HataskGrowingFlower>).detail;
	flower.value = { ...flower.value, ...next };
}
const currentFlowerDisplayName=computed(() => localizeFloraName(flower.value.name));
function formatMinutes(m:number){const h=Math.floor(m/60);const mm=m%60;return h>0?copyx.hoursMinutes({ hours: h.toString(), minutes: mm.toString() }) : copyx.minutes({ minutes: mm.toString() })}
const estimateRemaining=computed(()=>{const rem=Math.max(0,1200-flower.value.totalMinutes);const h=Math.floor(rem/60);return h>0?copyx.hours({ hours: h.toString() }):copy.soon});

// Search
const searchQuery=ref('');const searchInput=ref<HTMLInputElement|null>(null);
const searchResults=computed(()=>{const q=searchQuery.value.toLowerCase();return{todos:todos.value.filter(t=>t.text.toLowerCase().includes(q)||(t.comment&&t.comment.toLowerCase().includes(q))).slice(0,5),moods:moods.value.filter(m=>m.note.toLowerCase().includes(q)).slice(0,5),events:events.value.filter(e=>e.title.toLowerCase().includes(q)).slice(0,5)}});
const recentMoodsForSearch=computed(()=>moods.value.slice(0,3));
function formatSearchDate(d:string):string{const dd=parseIsoDate(d);const now=new Date();now.setHours(0,0,0,0);const day=new Date(dd); day.setHours(0, 0, 0, 0); const diff=Math.floor((now.getTime()-day.getTime())/(86400000));if(diff===0)return copy.today;if(diff===1)return copy.yesterday;return monthDayFormatter.format(dd)}
watch(showSearch,v=>{if(v)nextTick(()=>searchInput.value?.focus())});

// Helpers
function generateId():string{return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function formatDue(d:string,t?:string):string{const todayDate=new Date();todayDate.setHours(0,0,0,0);const x=parseIsoDate(d);x.setHours(0,0,0,0);let l='';if(x.getTime()===todayDate.getTime())l=copy.today;else{const tomorrow=new Date(todayDate);tomorrow.setDate(tomorrow.getDate()+1);if(x.getTime()===tomorrow.getTime())l=copy.tomorrow;else l=monthDayFormatter.format(x)}if(t)l+=' '+t;return l}
function isDueToday(d:string):boolean{return new Date(d).toDateString()===new Date().toDateString()}
function isOverdue(d:string):boolean{return new Date(d)<new Date(new Date().toDateString())}
function formatMoodDate(d:string):string{return monthDayWeekdayFormatter.format(parseIsoDate(d))}

// ========== GREETING SYSTEM (500+ variations) ==========
// Eye page computed stats
const todoCompletionRate=computed(()=>{if(todos.value.length===0)return 0;return Math.round(todos.value.filter(t=>t.done).length/todos.value.length*100)});
const weeklyTaskProgress=computed(()=>{const now=new Date();const weekAgo=new Date(now.getTime()-7*86400000);const weekStr=weekAgo.toISOString().slice(0,10);const weekTodos=todos.value.filter(t=>t.createdAt&&new Date(t.createdAt)>=weekAgo);if(weekTodos.length===0)return 0;return Math.round(weekTodos.filter(t=>t.done).length/weekTodos.length*100)});
const monthlyMoodCount=computed(()=>{const now=new Date();const ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;return moods.value.filter(m=>{const d=new Date(m.date||m.createdAt);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===ym}).length});
const monthlyMoodProgress=computed(()=>{const now=new Date();const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();return Math.min(100,Math.round(monthlyMoodCount.value/daysInMonth*100))});
const currentFlowerHanakotoba=computed(()=>{const flora=floraData.find(f=>f.emoji===flower.value.emoji);return flora?.hanakotoba?localizeHanakotoba(flora.hanakotoba) : ''});
const galleryWithHanakotoba=computed(()=>gallery.value.filter(fl=>fl.hanakotoba).slice(0,20));

// Hatask Eye phrase system
function updateEyePhrase(){
try {
const pc=todos.value.filter(t=>!t.done).length;
const todayStr=new Date().toISOString().slice(0,10);
const todayEvents=events.value.filter(e=>e.date===todayStr);
const recent=moods.value.slice(0,7);
const avg=recent.length>0?recent.reduce((s,m)=>s+m.level,0)/recent.length:0;
const phrase=_getPhrase({pendingTaskCount:pc,totalTaskCount:todos.value.length,todayEventCount:todayEvents.length,todayEventTitle:todayEvents[0]?.title,recentMoodAvg:avg});
if(phrase)eyePhrase.value=phrase;
} catch(e) { /* fallback: keep current phrase */ }
}
function updateClock(){const now=new Date();currentTime.value=new Intl.DateTimeFormat(versatileLang,{ hour: '2-digit',minute: '2-digit',hour12: false }).format(now);currentDate.value=longDateFormatter.format(now);clockMD.value=monthDayFormatter.format(now);clockDow.value=weekdayLongFormatter.format(now);const M=now.getMonth()+1,D=now.getDate();clockDot.value=`${now.getFullYear()}.${String(M).padStart(2,'0')}.${String(D).padStart(2,'0')}`;clockEn.value=weekdayLongFormatter.format(now).toLocaleUpperCase(versatileLang)}

// RSVP logic - uses shared API events (rsvp有効なもののみ)
const pendingRsvps=computed(()=>{
const myId=$i?.id;
return sharedEvents.value.filter(e=>e.rsvp&&!e.rsvpClosed).map(e=>{
const myResp=e.rsvpResponses?.find((r:any)=>r.userId===myId);
return{eventId:e.id,emoji:e.emoji||'📅',title:e.title,dateLabel:eventDateTimeLabel(e),myStatus:myResp?.status||null,creatorUsername:e.username};
});
});
async function setRsvp(eventId:string,status:'going'|'maybe'|'declined'){
try{await misskeyApi('hatask/events/rsvp',{eventId,status});await loadSharedEvents();os.toast(status==='going'?copy.rsvpGoingSaved:status==='maybe'?copy.rsvpMaybeSaved:copy.rsvpDeclinedSaved)}catch(e){console.error('RSVP failed:',e);os.toast(copy.rsvpSendFailed)}
}
async function closeRsvp(eventId:string){
try{await misskeyApi('hatask/events/close',{eventId,closed:true});await loadSharedEvents();os.toast(copy.rsvpClosed)}catch(e){console.error('Close RSVP failed:',e);os.toast(copy.rsvpCloseFailed)}
}

// CRUD
function dismissRsvpNotif(eventId:string){dismissedRsvpNotifs.value.push(eventId);closedRsvpNotifs.value=closedRsvpNotifs.value.filter(n=>n.eventId!==eventId)}
function checkClosedRsvps(){
const myId=$i?.id;if(!myId)return;
// API共有イベントから締切済みのものを検出
closedRsvpNotifs.value=sharedEvents.value.filter(e=>e.rsvpClosed&&e.rsvpResponses&&e.rsvpResponses.some((r:any)=>r.userId===myId)&&!dismissedRsvpNotifs.value.includes(e.id)).map(e=>({eventId:e.id,emoji:e.emoji||'📅',title:e.title,goCount:e.rsvpResponses.filter((r:any)=>r.status==='going').length}));
}
const editingTodoId=ref<string|null>(null);
async function addTodo(){if(!newTodo.value.trim()&&!editingTodoId.value)return;
if(editingTodoId.value){const t=todos.value.find(t=>t.id===editingTodoId.value);if(t){t.text=newTodo.value.trim()||t.text;t.due=newTodoDue.value;t.time=newTodoTime.value;t.folder=newTodoFolder.value;t.comment=newTodoComment.value}editingTodoId.value=null;newTodo.value='';newTodoDue.value='';newTodoTime.value='';newTodoComment.value='';showTodoExtra.value=false;await registrySet('todos',todos.value);os.toast(copy.todoUpdated);return}
todos.value.unshift({id:generateId(),text:newTodo.value.trim(),done:false,due:newTodoDue.value,time:newTodoTime.value,folder:newTodoFolder.value||(activeFolder.value!=='all'?activeFolder.value:''),comment:newTodoComment.value,createdAt:Date.now()});newTodo.value='';newTodoDue.value='';newTodoTime.value='';newTodoComment.value='';await registrySet('todos',todos.value)}
// 旗鯖fork(ハタキュ): 「今日終わった分」を数えるために、完了した時刻を残す。
//   ⚠️過去に完了した分には doneAt が無い(遡って埋められない)。その分は今日の件数に入らない。
async function toggleTodo(id:string){const t=todos.value.find(t=>t.id===id);if(t){t.done=!t.done;if(t.done)t.doneAt=new Date().toISOString();else delete t.doneAt;await registrySet('todos',todos.value)}}
async function deleteTodo(id:string){const{canceled}=await os.confirm({type:'warning',text:copy.confirmDeleteTodo});if(canceled)return;todos.value=todos.value.filter(t=>t.id!==id);await registrySet('todos',todos.value)}
async function editTodo(id:string){const t=todos.value.find(t=>t.id===id);if(!t)return;editingTodoId.value=id;newTodo.value=t.text;newTodoDue.value=t.due||'';newTodoTime.value=t.time||'';newTodoFolder.value=t.folder||'';newTodoComment.value=t.comment||'';showTodoExtra.value=true;const el=document.querySelector('.htk-todo-inp-r,.hk-todo-inp');if(el)el.scrollIntoView({behavior:'smooth',block:'center'})}
function cancelEditTodo(){editingTodoId.value=null;newTodo.value='';newTodoDue.value='';newTodoTime.value='';newTodoComment.value='';showTodoExtra.value=false}
async function addFolder(){if(!newFolderName.value.trim())return;folders.value.push({id:generateId(),name:newFolderName.value.trim(),emoji:newFolderEmoji.value||'📁',color:newFolderColor.value||''});newFolderName.value='';newFolderEmoji.value='📁';newFolderColor.value='';await registrySet('folders',folders.value)}
async function deleteFolder(i:number){const{canceled}=await os.confirm({type:'warning',text:copyx.confirmDeleteFolder({ name:folders.value[i].name })});if(canceled)return;const fid=folders.value[i].id;todos.value.forEach(t=>{if(t.folder===fid)t.folder=''});if(activeFolder.value===fid)activeFolder.value='all';folders.value.splice(i,1);await registrySet('folders',folders.value);await registrySet('todos',todos.value)}
async function renameFolder(i:number){const{canceled,result}=await os.inputText({title:copy.renameFolderTitle,text: copy.newNamePrompt,default:folders.value[i].name});if(!canceled&&result){folders.value[i].name=result;await registrySet('folders',folders.value)}}
async function moveFolder(i:number,d:number){const ni=i+d;if(ni<0||ni>=folders.value.length)return;[folders.value[i],folders.value[ni]]=[folders.value[ni],folders.value[i]];await registrySet('folders',folders.value)}
async function changeFolderColor(i:number){const {canceled,result}=await os.actions({type:'question',title:copy.folderColorTitle,actions:[...folderColors.value.map(c=>({value:c.value,text:c.label})),{value:'',text:copy.none}]});if(canceled)return;folders.value[i].color=result;await registrySet('folders',folders.value)}
async function saveMood(){isSaving.value=true;try{if(editingMood.value){const idx=moods.value.findIndex(m=>m.id===editingMood.value.id);if(idx>=0){moods.value[idx]={...moods.value[idx],level:selectedMoodLevel.value,note:moodNote.value.trim()||'（ひとことなし）',emoji:moodSelectedEmoji.value}}editingMood.value=null;moodNote.value='';moodSelectedEmoji.value='';await registrySet('moods',moods.value);os.toast(copy.moodUpdated)}else{const now=new Date();moods.value.unshift({id:generateId(),level:selectedMoodLevel.value,note:moodNote.value.trim()||'（ひとことなし）',emoji:moodSelectedEmoji.value,date:now.toISOString().slice(0,10),time:`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`});moodNote.value='';moodSelectedEmoji.value='';await registrySet('moods',moods.value);os.toast(copy.moodSaved)}}finally{isSaving.value=false}}
function startEditMood(m:any){editingMood.value=m;selectedMoodLevel.value=m.level;moodNote.value=m.note==='（ひとことなし）'?'':m.note;moodSelectedEmoji.value=m.emoji||'';showMoodNote.value=true;window.scrollTo({top:0,behavior:'smooth'})}
function cancelEditMood(){editingMood.value=null;selectedMoodLevel.value=4;moodNote.value='';moodSelectedEmoji.value=''}
async function deleteMood(id:string){const{canceled}=await os.confirm({type:'warning',text:copy.confirmDeleteRecord});if(canceled)return;moods.value=moods.value.filter(m=>m.id!==id);await registrySet('moods',moods.value)}

// ===== 食事記録(meal) ロジック。3段階は等価に扱い、数値評価・スコア化はしない =====
function toggleMealReason(r:string){const i=selectedMealReasons.value.indexOf(r);if(i>=0)selectedMealReasons.value.splice(i,1);else selectedMealReasons.value.push(r)}
function resetMealForm(){selectedMealSlot.value='breakfast';selectedMealLevel.value='ate';selectedMealReasons.value=[];mealNote.value='';editingMeal.value=null}
async function saveMeal(){isSaving.value=true;try{
  // 「食べれた」のときは理由を保存しない(尋問感を出さないため)
  const reasons=selectedMealLevel.value==='ate'?[]:[...selectedMealReasons.value];
  if(editingMeal.value){const idx=meals.value.findIndex(m=>m.id===editingMeal.value.id);if(idx>=0){meals.value[idx]={...meals.value[idx],slot:selectedMealSlot.value,level:selectedMealLevel.value,reasons,note:mealNote.value.trim()};}resetMealForm();await registrySet('meals',meals.value);os.toast(copy.recordUpdated)}
  else{const now=new Date();meals.value.unshift({id:generateId(),slot:selectedMealSlot.value,level:selectedMealLevel.value,reasons,note:mealNote.value.trim(),date:now.toISOString().slice(0,10),time:`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`});resetMealForm();await registrySet('meals',meals.value);os.toast(copy.mealRecorded)}
}finally{isSaving.value=false}}
function startEditMeal(m:any){editingMeal.value=m;selectedMealSlot.value=m.slot;selectedMealLevel.value=m.level;selectedMealReasons.value=Array.isArray(m.reasons)?[...m.reasons]:[];mealNote.value=m.note||'';window.scrollTo({top:0,behavior:'smooth'})}
function cancelEditMeal(){resetMealForm()}
async function deleteMeal(id:string){const{canceled}=await os.confirm({type:'warning',text:copy.confirmDeleteRecord});if(canceled)return;meals.value=meals.value.filter(m=>m.id!==id);await registrySet('meals',meals.value)}
function mealSlotInfo(id:string){return mealSlots.value.find(s=>s.id===id)||{emoji:'ti ti-tools-kitchen-2',label:''}}
function mealLevelInfo(id:string){return mealLevels.value.find(l=>l.id===id)||{emoji:'ti ti-tools-kitchen-2',label:'',color:'var(--MI_THEME-fg)'}}
// 免責ダイアログ: 初回必ず表示、以降は!マークから手動表示
async function showMealDisclaimerDialog(){showMealDisclaimer.value=true}
async function ackMealDisclaimer(){showMealDisclaimer.value=false;if(!settings.value.mealDisclaimerShown){settings.value.mealDisclaimerShown=true;await registrySet('settings',settings.value)}}

async function harvestFlower() {
	const autoName = generateFlowerName({ emoji: flower.value.emoji, name: flower.value.name });
	const localizedAutoName = localizeFloraName(autoName);
	const { canceled, result } = await os.inputText({
		title: copy.flowerBloomedTitle,
		text: copy.flowerNamingPrompt,
		default: localizedAutoName,
	});
	if (canceled || !result) return;
	const flora = floraData.find(f => f.emoji === flower.value.emoji);
	gallery.value.unshift({
		id: generateId(),
		emoji: flower.value.emoji,
		name: result === localizedAutoName ? autoName : result,
		hanakotoba: flora?.hanakotoba ?? '',
		date: new Date().toLocaleDateString('ja-JP'),
	});
	const nf = pickRandomFlora();
	const startedAt = Date.now();
	flower.value = { emoji: nf.emoji, name: generateFlowerName(nf), progress: 0, startedAt, totalMinutes: 0, lastGrowthAt: startedAt };
	await registrySet('gallery', gallery.value);
	await registrySet('flower', flower.value);
	await syncHataskFlowerCount();
	os.toast(copy.flowerHarvested);
}
async function renameFlower(fl:any){const sourceName = fl.name; const localizedName = localizeFloraName(sourceName); const{canceled,result}=await os.inputText({title:copy.renameFlowerTitle,text:copy.newNamePrompt,default:localizedName});if(!canceled&&result){fl.name=result === localizedName ? sourceName : result;await registrySet('gallery',gallery.value)}}

let navProtectionObserver:MutationObserver|null=null;
let navVisibilityTimer:ReturnType<typeof setInterval>|null=null;
onMounted(async () => {
	window.addEventListener(HATASK_FLOWER_GROWTH_EVENT, onHataskFlowerGrowth);
// 旗鯖fork(v2 §16①): ブートは onActivated(表示されるたび)で再生する。
//   hatask は keep-alive のため遷移復帰では onMounted が走らず、以前は初回リロード時しか出なかった。
//   keep-alive なら onActivated が初回mount含め必ず走るので、そちらに一本化。
//   keep-alive でない環境向けの保険として、onActivated が走らなければ onMounted 側で再生する。
nextTick(()=>{ if(!bootUsedActivated) playBoot(); });
// 旗鯖fork(タスク8): マスコットカード用にデータを読み込み、Hatask表示中フラグを立てる(フローティング連動非表示)
loadMascot();
// 旗鯖fork(タスク2): カードの文言ローテに表示設定が要るためロードし、初期文言を選んでローテ開始(利用許可時のみ)
if(canUseMascot.value){loadMascotDisplaySettings().then(()=>{mascotPickRandomPhrase();startMascotCardRotation();});}
hatakMascotActive.value = true;
// 旗鯖fork(#36): HataFeed通知タイル＋地震・津波タイルの起動
if(canAccessHataFeed.value){loadHfNotifs();hfTimer=setInterval(loadHfNotifs,30000);}
loadEq();eqStream=useStream();eqStream.on('earthquakeEvent',onEqEvent);eqStream.on('_connected_',onEqStreamConn);eqStream.on('_disconnected_',onEqStreamDisc);streamConnected.value=eqStream.state==='connected';
// 旗鯖fork(perf): WS未接続のときだけ60sポーリング。接続成功で stopEqPoll、切断で startEqPoll が走る。
if(!streamConnected.value)startEqPoll();
// 旗鯖fork: Hataskを開いたら実績「Hataskへようこそ」を解除(冪等。既に解除済みなら何もしない)
claimAchievement('welcomeToHatask');
window.localStorage.setItem('hatask_initialized', '1');
updateClock();
clockInterval = setInterval(updateClock, 30000);
mediaQuery = window.matchMedia('(prefers-color-scheme:dark)');
mediaQuery.addEventListener('change', onMediaChange);
startHtkThemeWatch();
// Delayed re-detect for late CSS loading (fixes initial black text on all backgrounds)
setTimeout(()=>{misskeyTheme.value=detectMisskeyTheme()},500);
// Watch for Misskey theme changes via MutationObserver
const themeObs=new MutationObserver(()=>{misskeyTheme.value=detectMisskeyTheme()});
themeObs.observe(document.documentElement,{attributes:true,attributeFilter:['data-color-mode','class','style']});
// Protect mobile nav from Misskey's modal system (inert, pointer-events, etc.)
nextTick(() => {
  try {
    const navEl = document.querySelector('.htk-nav-mobile') as HTMLElement|null;
    if (navEl) {
      // MutationObserver: body に inert 属性が付いたらナビから除去
      navProtectionObserver = new MutationObserver(() => {
        if (navEl.closest('[inert]') || navEl.hasAttribute('inert')) {
          navEl.removeAttribute('inert');
          navEl.style.pointerEvents = 'auto';
        }
      });
      navProtectionObserver.observe(document.body, { attributes: true, attributeFilter: ['inert'] });
      // 定期チェック: ナビが非表示/非操作可能になっていたら強制復帰（500msごと）
      navVisibilityTimer = setInterval(() => {
        const nav = document.querySelector('.htk-nav-mobile') as HTMLElement|null;
        if (nav && showMobileNav.value) {
          if (nav.hasAttribute('inert')) nav.removeAttribute('inert');
          nav.style.pointerEvents = 'auto';
          nav.style.visibility = 'visible';
          nav.style.opacity = '1';
          nav.style.display = 'flex';
        }
        // Misskey標準フッターが再表示されていたら再非表示（リサイズ/UI変更対策）
        if (document.body.dataset.hataskActive === '1') {
          const candidates = document.querySelectorAll<HTMLElement>('div > div > div');
          for (const el of candidates) {
            if (el.closest('.htk-root') || el.closest('.htk-nav-mobile') || el.dataset.htaskHidden) continue;
            const cs = getComputedStyle(el);
            if (cs.display === 'grid' && cs.gridTemplateColumns.split(' ').length === 5 && cs.borderTopStyle !== 'none' && cs.position === 'relative') {
              el.dataset.htaskHidden = '1';
              el.style.setProperty('display', 'none', 'important');
              break;
            }
          }
        }
      }, 500);
    }
  } catch {}
});
// Hide Misskey page header
nextTick(() => {
  try {
    const el = rootEl.value;
    if (el) {
      const p = el.closest('[class*="body"]');
      if (p && p.previousElementSibling) {
        const prev = p.previousElementSibling;
        if ('style' in prev) (prev as any).style.display = 'none';
      }
    }
  } catch {}
});
// Hide Misskey standard mobile navbar (bottom bar)
nextTick(() => {
  try {
    // まず外部TLの残骸をクリーンアップ（外部TL→Hatask遷移対策）
    document.querySelectorAll<HTMLElement>('.ext-tl-side-menu-btn').forEach(el => el.remove());
    document.querySelectorAll<HTMLElement>('[data-ext-tl-hidden]').forEach(el => {
      el.style.removeProperty('display');
      delete el.dataset.extTlHidden;
    });

    document.body.dataset.hataskActive = '1';
    // 方法1: Misskey の mobile-footer-menu を直接探す
    // 特徴: grid 5列, position:relative, z-index:1, border-top あり, body直下のUI内
    const hideFooter = () => {
      const candidates = document.querySelectorAll<HTMLElement>('div > div > div');
      for (const el of candidates) {
        if (el.closest('.htk-root') || el.closest('.htk-nav-mobile')) continue;
        const cs = getComputedStyle(el);
        const cols = cs.gridTemplateColumns.split(' ').length;
        if (cs.display === 'grid' && cols === 5 && cs.borderTopStyle !== 'none' && cs.position === 'relative') {
          el.dataset.htaskHidden = '1';
          el.style.setProperty('display', 'none', 'important');
          return true;
        }
      }
      // 方法2: フォールバック - 1fr 5列を持つ要素
      const allEls = document.querySelectorAll<HTMLElement>('body > div *');
      for (const el of allEls) {
        if (el.closest('.htk-root') || el.closest('.htk-nav-mobile')) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'grid' && cs.gridTemplateColumns.includes('1fr 1fr 1fr 1fr 1fr')) {
          el.dataset.htaskHidden = '1';
          el.style.setProperty('display', 'none', 'important');
          return true;
        }
      }
      return false;
    };
    if (!hideFooter()) {
      // リトライ: 遷移アニメーション完了後に再試行
      setTimeout(() => { hideFooter(); }, 300);
      setTimeout(() => { hideFooter(); }, 600);
    }
  } catch {}
});
const initFlower = pickRandomFlora();
	const defaultFlowerStartedAt = Date.now();
	const defaultFlower = { emoji: initFlower.emoji, name: generateFlowerName(initFlower), progress: 0, startedAt: defaultFlowerStartedAt, totalMinutes: 0, lastGrowthAt: defaultFlowerStartedAt };
const defaultSettings = { darkMode: false, autoTheme: true, weekStart: 'mon', showClock: true, showEvents: true, showFlower: true, showMoodSummary: true, showMealSection: true, showFeedbackNotif: true, showEarthquake: true, moodRemind: false, moodRemindTimes: ['昼 12:00', '寝る前 23:00'], openOnStart: false, showMealSummary: true, mealDisclaimerShown: false, eyeDisclaimerShown: false, theme: 'kisetsu', animations: true, v2Onboarded: false,
	// 旗鯖fork(ハタキュ): 風を吹かせるか(このテーマ限定・既定ON) / 新テーマ案内を出したか(アカウントごと1回)
	hatakyuWind: true, hatakyuNoticeShown: false };

// 各データを個別に取得（1つの失敗が他に影響しないようにする）
const loadResults = await Promise.allSettled([
  registryGet('todos', []),
  registryGet('folders', []),
  registryGet('moods', []),
  registryGet('flower', defaultFlower),
  registryGet('gallery', []),
  registryGet('settings', defaultSettings),
  registryGet('events', []),
  registryGet('meals', []),
]);
// 取得成功したデータのみ代入（失敗したキーは初期値のまま → registrySetガードで保護）
if (loadResults[0].status === 'fulfilled' && loadedKeys.has('todos')) todos.value = loadResults[0].value as any;
if (loadResults[1].status === 'fulfilled' && loadedKeys.has('folders')) folders.value = loadResults[1].value as any;
if (loadResults[2].status === 'fulfilled' && loadedKeys.has('moods')) moods.value = loadResults[2].value as any;
	// 花が未作成でもregistryGetが返した既定値は画面へ反映する。
	// 永続化は成長トラッカーがNO_SUCH_KEYを再確認してから行うため、通信失敗時に既存値を上書きしない。
	if (loadResults[3].status === 'fulfilled') flower.value = loadResults[3].value as typeof flower.value;
if (loadResults[4].status === 'fulfilled' && loadedKeys.has('gallery')) gallery.value = loadResults[4].value as any;
if (loadResults[5].status === 'fulfilled' && loadedKeys.has('settings')) settings.value = loadResults[5].value as any;
if (loadResults[6].status === 'fulfilled' && loadedKeys.has('events')) events.value = loadResults[6].value as any;
if (loadResults[7].status === 'fulfilled' && loadedKeys.has('meals')) meals.value = loadResults[7].value as any;
dataLoaded.value = true;
	seedHataskFlowerGrowth(flower.value);
await syncHataskFlowerCount();
// 旗鯖fork(v2): 未設定キーを既定で補完(後方互換)。theme/animations 未設定の既存ユーザーには
//   既定テーマ(季 kisetsu)・アニメON を割り当てる。保存済みの値は保持される。
settings.value = { ...defaultSettings, ...settings.value };
// Check for closed RSVP notifications
await loadSharedEvents();
checkClosedRsvps();
// Show tutorial on first visit
// 旗鯖fork(v2 §14): 初回はテーマ選択ステップから開始(確定後に本編ウィザードへ)
if (!settings.value.tutorialDone) { tutThemeStandalone.value = false; showTutTheme.value = true; }
// 旗鯖fork(v2): 既存ユーザー(チュートリアル済み)がリデザイン後に初めて開いたら、テーマ選択(告知)を一度だけ。
//   確定/スキップで v2Onboarded を立て、以後は出さない。本編スポットライトは出さない(単独モード)。
else if (!settings.value.v2Onboarded) { tutThemeStandalone.value = true; showTutTheme.value = true; }
// 旗鯖fork(ハタキュ): 新テーマの案内はアカウントごとに1回だけ。
//   ⚠️v2 のテーマ選択(告知)がまだ出ていない人には出さない。同時に2枚出すと何を選んだのか分からなくなる。
//     その人はテーマ選択の一覧でハタキュを見ることになるので、そこで案内済みとして扱う。
else if (!settings.value.hatakyuNoticeShown) { showHatakyuNotice.value = true; }
// 旗鯖fork(ハタキュ): 設定を読み終えた時点でテーマが確定するので、ここから風を回し始める。
if (hkWindEnabled.value) { hkBlowWind(); hkScheduleWind(); }
// Schedule notifications
scheduleEventNotifications();
scheduleMoodReminders();
// Fetch login ranking
fetchLoginRanking();
// Eye phrase
updateEyePhrase();
eyeTimer = setInterval(updateEyePhrase, 10000);
});

// KeepAlive対応: ページ離脱時にナビバーを非表示にする
onDeactivated(() => {
cleanupHataskState();
});
onActivated(() => {
// 旗鯖fork(v2 §16①): hatask が表示されるたび(初回mount含む)ブートを再生。遷移復帰でも出るように。
bootUsedActivated = true;
playBoot();
// 旗鯖fork(ハタキュ): 復帰のたびに1回吹かせ、滞在中の自動突風を張り直す。
if (hkWindEnabled.value) { hkBlowWind(); hkScheduleWind(); }
// 旗鯖fork(タスク8): keep-alive復帰時もフローティング連動フラグを立て直す
hatakMascotActive.value = true;
// 旗鯖fork(タスク2): keep-alive復帰時にカードの文言ローテを再開(onMountedが走らないため。利用許可時のみ)
if(canUseMascot.value)startMascotCardRotation();
// 旗鯖fork: keep-alive復帰やウィンドウ遷移で onMounted が走らない場合に備え、
// onActivated でも実績を解除する(claimAchievementは冪等)。
claimAchievement('welcomeToHatask');
showMobileNav.value = true;
document.body.dataset.hataskActive = '1';
// KeepAlive復帰時にMisskeyフッターを再非表示
nextTick(() => {
  const hideMkFooter = () => {
    const candidates = document.querySelectorAll<HTMLElement>('div > div > div');
    for (const el of candidates) {
      if (el.closest('.htk-root') || el.closest('.htk-nav-mobile')) continue;
      const cs = getComputedStyle(el);
      const cols = cs.gridTemplateColumns.split(' ').length;
      if (cs.display === 'grid' && cols === 5 && cs.borderTopStyle !== 'none' && cs.position === 'relative') {
        el.dataset.htaskHidden = '1';
        el.style.setProperty('display', 'none', 'important');
        return true;
      }
    }
    const allEls = document.querySelectorAll<HTMLElement>('body > div *');
    for (const el of allEls) {
      if (el.closest('.htk-root') || el.closest('.htk-nav-mobile')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'grid' && cs.gridTemplateColumns.includes('1fr 1fr 1fr 1fr 1fr')) {
        el.dataset.htaskHidden = '1';
        el.style.setProperty('display', 'none', 'important');
        return true;
      }
    }
    return false;
  };
  if (!hideMkFooter()) {
    setTimeout(() => { hideMkFooter(); }, 300);
  }
});
});

onBeforeUnmount(() => {
cleanupHataskState();
});
onUnmounted(() => {
cleanupHataskState();
if (bootTimer) { clearTimeout(bootTimer); bootTimer=null; }
if (clockInterval) clearInterval(clockInterval);
if (eyeTimer) clearInterval(eyeTimer);
	window.removeEventListener(HATASK_FLOWER_GROWTH_EVENT, onHataskFlowerGrowth);
if (mediaQuery) mediaQuery.removeEventListener('change', onMediaChange);
stopHtkThemeWatch();
eventTimerIds.forEach(id => clearTimeout(id));
moodTimerIds.forEach(id => clearTimeout(id));
});
</script>

<style lang="scss" scoped>

/* =====================================================================
   旗鯖fork(v2 リデザイン): エディトリアル3テーマのカラートークン。
   .htk-root[data-theme="kisetsu|kashin|suri"] × [data-mode="dark"] で切替。
   --fg=本文(WCAG AA以上), --fg-2/3=副次/補助, --rule=罫線, --accent=アクセント,
   --card/--card-border/--card-shadow/--card-radius=カード意匠,
   --htk-font-body/head=本文/見出しフォント, --on-*=色地の上の文字色。
   ※本フェーズはトークン定義＋モーション土台のみ。各コンポーネントの再スキンは順次。
   ===================================================================== */
/* 旗鯖fork(v2 §06): トークン/再マップは root と Teleport モーダル(.htk-modal-ov)の両方へ。
   背景色(--bg)は root のみ(モーダルのスクリム背景を壊さないため下で別途)。scoped のため当コンポーネント限定。 */
.htk-root[data-theme]{ background-color: var(--bg); }
/* 旗鯖fork(v2): 花信/刷 のドット地(設計 .o1b/.o1d の背景テクスチャ)。 */
.htk-root[data-theme="kashin"]{ background-image:radial-gradient(rgba(255,107,74,.14) 1.4px,transparent 1.4px); background-size:13px 13px; }
.htk-root[data-theme="suri"]{ background-image:radial-gradient(rgba(26,26,46,.055) 1px,transparent 1px); background-size:4px 4px; }
.htk-root[data-theme="kashin"][data-mode="dark"]{ background-image:radial-gradient(rgba(255,125,94,.10) 1.4px,transparent 1.4px); }
.htk-root[data-theme="suri"][data-mode="dark"]{ background-image:radial-gradient(rgba(236,231,220,.05) 1px,transparent 1px); }
.htk-root[data-theme],.htk-modal-ov[data-theme]{
  --htk-fallback: system-ui,-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif;
  --on-accent:#fff; --on-coral:#fff; --on-grape:#fff; --on-blue:#fff; --on-pink:#fff;
  color: var(--fg);
  font-family: var(--htk-font-body);
  --radius-lg: var(--card-radius);
  /* 旧テーマの色トークンを v2 トークンへ再マップ(既存コンポーネントCSSをそのまま活かす) */
  --text-1: var(--fg);
  --text-2: var(--fg-2);
  --text-3: var(--fg-3);
  --divider: var(--rule);
  --card-bg: var(--surface);
  --tint-bg: var(--surface);
  --primary: var(--accent);
  --secondary: var(--accent);
  --hover-bg: color-mix(in srgb, var(--fg) 6%, transparent);
  --active-bg: color-mix(in srgb, var(--fg) 10%, transparent);
  /* 旗鯖fork(v2): テーマ非依存の微小フィル/罫。--fg が明暗で反転するため light/dark 両対応。 */
  --fill: color-mix(in srgb, var(--fg) 5%, transparent);
  --fill-2: color-mix(in srgb, var(--fg) 8%, transparent);
  --fill-3: color-mix(in srgb, var(--fg) 13%, transparent);
  --hair: color-mix(in srgb, var(--fg) 10%, transparent);
  --btn-bg: color-mix(in srgb, var(--fg) 5%, transparent);
  --btn-border: var(--rule);
  --btn-hover: color-mix(in srgb, var(--fg) 10%, transparent);
  --input-bg: var(--surface);
  --input-border: var(--rule);
  --input-focus: color-mix(in srgb, var(--accent) 45%, transparent);
  --outer-glow: var(--card-shadow);
  --inner-glow: none;
  --text-shadow: none;
  --blur-amount: 0px;
  text-shadow: none;
}
/* --- 季 Kisetsu (light) --- */
.htk-root[data-theme="kisetsu"],.htk-modal-ov[data-theme="kisetsu"]{
  --bg:#f4f1ea; --surface:#ffffff; --fg:#211d18; --fg-2:#5f574c; --fg-3:#7c7367;
  --rule:#cdc7bb; --accent:#8a3d1f; --on-sun:#211d18; --on-teal:#211d18;
  --card:var(--surface); --card-border:1px solid var(--rule); --card-shadow:none; --card-radius:6px;
  --htk-font-body:"Zen Kaku Gothic New",var(--htk-fallback);
  --htk-font-head:"Shippori Mincho B1","Zen Kaku Gothic New",var(--htk-fallback);
}
.htk-root[data-theme="kisetsu"][data-mode="dark"],.htk-modal-ov[data-theme="kisetsu"][data-mode="dark"]{
  --bg:#17140f; --surface:#211c15; --fg:#f1ece1; --fg-2:#c3b9a8; --fg-3:#8c8375;
  --rule:#39332a; --accent:#e0966a;
}
/* --- 花信 Kashin (light) --- */
.htk-root[data-theme="kashin"],.htk-modal-ov[data-theme="kashin"]{
  --bg:#fff5e6; --surface:#ffffff; --fg:#25201c; --fg-2:#5f574c; --fg-3:#8a8175;
  --ink-line:#25201c; --coral:#ff6b4a; --teal:#0f978c; --sun:#ffc23c; --grape:#7a5cff;
  --accent:var(--coral); --rule:rgba(37,32,28,.16); --on-sun:#25201c; --on-teal:#25201c;
  --card:var(--surface); --card-border:2.5px solid var(--ink-line); --card-shadow:3px 3px 0 rgba(37,32,28,.15); --card-radius:16px;
  --htk-font-body:"Zen Maru Gothic",var(--htk-fallback);
  --htk-font-head:"Zen Maru Gothic",var(--htk-fallback);
}
.htk-root[data-theme="kashin"][data-mode="dark"],.htk-modal-ov[data-theme="kashin"][data-mode="dark"]{
  --bg:#1b1726; --surface:#26202f; --fg:#fbf3e6; --fg-2:#c7bcd2; --fg-3:#9a90ab;
  --ink-line:#f3ead6; --coral:#ff7d5e; --teal:#23c3b6; --sun:#ffcf5c; --grape:#9a80ff;
  --rule:rgba(243,234,214,.18); --card-shadow:3px 3px 0 rgba(0,0,0,.35);
}
/* --- 刷 Suri (light) --- */
.htk-root[data-theme="suri"],.htk-modal-ov[data-theme="suri"]{
  --bg:#efe7d4; --surface:#ffffff; --fg:#1a1a2e; --fg-2:#4a4a5a; --fg-3:#7a7a8a;
  --ink-line:#1a1a2e; --blue:#2a52c0; --pink:#ff4f9a; --sun:#ffe14f;
  --accent:var(--blue); --rule:rgba(26,26,46,.18); --on-sun:#1a1a2e;
  --card:var(--surface); --card-border:2.5px solid var(--ink-line); --card-shadow:3px 3px 0 var(--pink); --card-radius:0;
  --htk-font-body:"Zen Kaku Gothic Antique",var(--htk-fallback);
  --htk-font-head:"Zen Kaku Gothic Antique",var(--htk-fallback);
}
.htk-root[data-theme="suri"][data-mode="dark"],.htk-modal-ov[data-theme="suri"][data-mode="dark"]{
  --bg:#14141f; --surface:#1e1e2c; --fg:#ece7dc; --fg-2:#b3aec6; --fg-3:#8f8aa3;
  --ink-line:#ece7dc; --blue:#7f97ff; --pink:#ff6fae; --sun:#ffe14f;
  --rule:rgba(236,231,220,.18); --card-shadow:3px 3px 0 var(--pink);
}
/* --- ハタキュ Hatakyu (light): コルク板に紙をピンで留めた見立て --- */
/* ⚠️--bg は「板の外側の地」。紙は --surface、コルク面は --cork で別に持つ。 */
.htk-root[data-theme="hatakyu"],.htk-modal-ov[data-theme="hatakyu"]{
  --cork:#c9975f; --wood:#6b4a2f; --wood-l:#8a6440;
  --bg:#4a3627; --surface:#fdf6e6; --fg:#3b2a1c; --fg-2:#6f5b3f; --fg-3:#7a5c34;
  --paper2:#fff9ef; --cream-c:#fdeec4; --blue-c:#e3f0ff; --mint-c:#e4f6ee; --dash:#ddcba6;
  --blue:#1272ec; --cream:#f7dc9a; --orange:#b9791f;
  --field:#fffdf6; --field-bd:#cdb98f;
  --accent:var(--blue); --rule:var(--field-bd);
  --on-blue:#ffffff; --on-blue-2:#f7dc9a; --on-accent:var(--on-blue);
  --card:var(--surface); --card-border:none; --card-shadow:0 12px 22px -10px rgba(40,24,8,.7); --card-radius:0;
  --htk-font-body:"Zen Kaku Gothic New",var(--htk-fallback);
  --htk-font-head:"Zen Maru Gothic",var(--htk-fallback);
}
.htk-root[data-theme="hatakyu"][data-mode="dark"],.htk-modal-ov[data-theme="hatakyu"][data-mode="dark"]{
  --cork:#4a3a2b; --wood:#2c221a; --wood-l:#463628;
  --bg:#241c15; --surface:#332b22; --fg:#f4ece0; --fg-2:#d3c5ab; --fg-3:#e8b96b;
  --paper2:#3a3128; --cream-c:#3d3324; --blue-c:#2c3340; --mint-c:#2b3830; --dash:#5c4c38;
  --blue:#6fa8ff; --orange:#e8b96b; --field:#2b241c; --field-bd:#5c4c38;
  --on-blue:#0e1c2b; --on-blue-2:#123055; --rule:var(--field-bd);
}

/* --- モーション: キーフレーム(テーマ別) --- */
@keyframes htkItemKi{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes htkItemKa{0%{opacity:0;transform:translateY(15px) scale(.9)}60%{opacity:1;transform:translateY(-3px) scale(1.03)}100%{opacity:1;transform:none}}
@keyframes htkItemSu{from{opacity:0;transform:translateX(-11px) rotate(-1.5deg)}to{opacity:1;transform:none}}
@keyframes htkEnterKi{from{transform:translateY(12px)}to{transform:none}}
@keyframes htkEnterKa{0%{transform:translateX(26px)}62%{transform:translateX(-5px)}100%{transform:none}}
@keyframes htkEnterSu{from{transform:translateX(14px)}to{transform:none}}
@keyframes htkBootKi{0%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:none}}
@keyframes htkBootKa{0%{opacity:0;transform:scale(.78)}70%{opacity:1;transform:scale(1.07)}100%{opacity:1;transform:scale(1)}}
@keyframes htkBootSu{0%{opacity:0;transform:translate(7px,-5px)}50%{opacity:1;transform:translate(-4px,3px)}100%{opacity:1;transform:none}}
@keyframes htkRuleDraw{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes htkTomboIn{0%{opacity:0;transform:scale(1.25)}100%{opacity:1;transform:scale(1)}}
@keyframes htkBootFade{0%,72%{opacity:1}100%{opacity:0}}

/* アニメーションOFF(設定 animations=false) と reduced-motion では一切のアニメ/トランジションを無効化 */
.htk-root[data-anim="off"] *{animation:none !important;transition:none !important}
@media (prefers-reduced-motion: reduce){
  .htk-root[data-theme] *{animation:none !important}
}

/* 旗鯖fork(v2 §16①): 起動ブートスプラッシュ(季=罫線ドロー / 花信=三点バウンド / 刷=トンボ) */
.htk-boot{position:fixed;inset:0;z-index:90000;background:var(--bg);display:flex;align-items:center;justify-content:center}
.htk-boot-inner{text-align:center;position:relative}
.htk-boot-logo{font-family:'Righteous',system-ui,sans-serif;font-size:2.7rem;color:var(--fg);line-height:1}
.htk-root[data-theme="suri"] .htk-boot-logo{color:var(--accent);text-shadow:3px 3px 0 var(--pink)}
.htk-boot-rule{display:none;height:2px;background:var(--accent);width:130px;margin:12px auto;transform-origin:center}
.htk-boot-dots{display:none;gap:12px;justify-content:center;margin-top:16px}
.htk-boot-dots i{width:15px;height:15px;border-radius:50%}
.htk-boot-dots i:nth-child(1){background:#ff6b4a}.htk-boot-dots i:nth-child(2){background:#12a89c}.htk-boot-dots i:nth-child(3){background:#ffc23c}
.htk-boot-tombo{display:none;position:absolute;inset:-26px;pointer-events:none}
.htk-boot-tombo span{position:absolute;width:18px;height:18px;border:2px solid var(--accent)}
.htk-boot-tombo span:nth-child(1){top:0;left:0;border-right:none;border-bottom:none}
.htk-boot-tombo span:nth-child(2){top:0;right:0;border-left:none;border-bottom:none}
.htk-boot-tombo span:nth-child(3){bottom:0;left:0;border-right:none;border-top:none}
.htk-boot-tombo span:nth-child(4){bottom:0;right:0;border-left:none;border-top:none}
.htk-root[data-theme="kisetsu"] .htk-boot-rule{display:block}
.htk-root[data-theme="kashin"] .htk-boot-dots{display:flex}
.htk-root[data-theme="suri"] .htk-boot-tombo{display:block}
.htk-root[data-anim="on"] .htk-boot{animation:htkBootFade 1.2s ease both}
.htk-root[data-theme="kisetsu"][data-anim="on"] .htk-boot .htk-boot-logo{animation:htkBootKi .6s cubic-bezier(.4,0,.2,1) both}
.htk-root[data-theme="kisetsu"][data-anim="on"] .htk-boot .htk-boot-rule{animation:htkRuleDraw .5s cubic-bezier(.4,0,.2,1) both .12s}
.htk-root[data-theme="kashin"][data-anim="on"] .htk-boot .htk-boot-logo{animation:htkBootKa .62s cubic-bezier(.34,1.56,.64,1) both}
.htk-root[data-theme="kashin"][data-anim="on"] .htk-boot .htk-boot-dots i{animation:htkBootKa .5s cubic-bezier(.34,1.56,.64,1) both}
.htk-root[data-theme="kashin"][data-anim="on"] .htk-boot .htk-boot-dots i:nth-child(2){animation-delay:.09s}
.htk-root[data-theme="kashin"][data-anim="on"] .htk-boot .htk-boot-dots i:nth-child(3){animation-delay:.18s}
.htk-root[data-theme="suri"][data-anim="on"] .htk-boot .htk-boot-logo{animation:htkBootSu .6s cubic-bezier(.5,0,.3,1) both}
.htk-root[data-theme="suri"][data-anim="on"] .htk-boot .htk-boot-tombo span{animation:htkTomboIn .45s ease both}

/* 旗鯖fork(v2 §16②): タブ切替の方向トランジション(テーマ別・方向追従)。
   季=クロスフェード＋縦スライド(方向非依存) / 花信=横スライド＋バウンス / 刷=ハードオフセット。 */
@keyframes htkPageKi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes htkPageKaFwd{0%{opacity:0;transform:translateX(26px)}62%{opacity:1;transform:translateX(-5px)}100%{opacity:1;transform:none}}
@keyframes htkPageKaBack{0%{opacity:0;transform:translateX(-26px)}62%{opacity:1;transform:translateX(5px)}100%{opacity:1;transform:none}}
@keyframes htkPageSuFwd{0%{opacity:.35;transform:translateX(10px)}100%{opacity:1;transform:none}}
@keyframes htkPageSuBack{0%{opacity:.35;transform:translateX(-10px)}100%{opacity:1;transform:none}}
.htk-root[data-theme="kisetsu"][data-anim="on"] .htk-tabpage{animation:htkPageKi .25s cubic-bezier(.4,0,.2,1) both}
.htk-root[data-theme="kashin"][data-anim="on"] .htk-tabpage.htk-tab-fwd{animation:htkPageKaFwd .28s cubic-bezier(.34,1.56,.64,1) both}
.htk-root[data-theme="kashin"][data-anim="on"] .htk-tabpage.htk-tab-back{animation:htkPageKaBack .28s cubic-bezier(.34,1.56,.64,1) both}
.htk-root[data-theme="suri"][data-anim="on"] .htk-tabpage.htk-tab-fwd{animation:htkPageSuFwd .2s cubic-bezier(.2,0,0,1) both}
.htk-root[data-theme="suri"][data-anim="on"] .htk-tabpage.htk-tab-back{animation:htkPageSuBack .2s cubic-bezier(.2,0,0,1) both}

/* ============================================================
   旗鯖fork(v2 デザイン最終形): ホーム 季/花信/刷 (.o1a/.o1b/.o1d)
   設計 Hatask v2.dc.html の .o1a/.o1b/.o1d を忠実移植。
   ============================================================ */
.htk-home{ padding-bottom:20px; }
.htk-home .dept i, .htk-home .head i{ font-style:normal; }

/* ---------- 季 KISETSU: Editorial Mincho ---------- */
.o1a{ color:#211d18; font-family:'Zen Kaku Gothic New',var(--htk-fallback); }
.o1a .dept{font-family:'Bebas Neue',sans-serif;font-size:.7rem;letter-spacing:.28em;color:#a8552f;display:flex;align-items:center;gap:8px;margin:26px 0 12px}
.o1a .dept::before{content:attr(data-n);font-family:'Shippori Mincho B1',serif;letter-spacing:0;color:#211d18;font-size:.82rem}
.o1a .dept i{flex:1;height:1px;background:#d4cec2}
.o1a .clock{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:6px}
.o1a .clock .ctime{font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:4.4rem;line-height:.8;letter-spacing:-.02em;color:#211d18}
.o1a .clock .cdate{font-family:'Shippori Mincho B1',serif;font-size:.9rem;color:#6b6259;text-align:right;line-height:1.5}
.o1a .streak{display:flex;align-items:baseline;gap:12px;padding:14px 0;border-top:1px solid #cdc7bb;border-bottom:1px solid #cdc7bb}
.o1a .streak .snum{font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:2.6rem;line-height:.9;color:#211d18}
.o1a .streak .slab{font-size:.82rem;color:#6b6259}
.o1a .streak .srank{margin-left:auto;text-align:right;font-size:.78rem;display:flex;align-items:center;gap:6px;color:#6b6259}
.o1a .streak .srank b{font-family:'Shippori Mincho B1',serif;color:#a8552f;font-size:1.1rem}
.o1a .streak .srank .ti{color:#a8552f;font-size:1rem}
.o1a .apps{display:grid;grid-template-columns:repeat(4,1fr);gap:16px 6px}
.o1a .app{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;background:none;border:none;font-family:inherit}
.o1a .app .ai{width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:#fff}
.o1a .app small{font-size:.62rem;color:#544c43;font-weight:500}
.o1a .ev{display:flex;align-items:center;gap:11px;padding:11px 0;border-bottom:1px solid #ddd7cb;cursor:pointer}
.o1a .ev:last-child{border:none}
.o1a .evdot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.o1a .evd{font-family:'Shippori Mincho B1',serif;font-weight:700;font-size:1rem;color:#a8552f;min-width:44px}
.o1a .evt{flex:1;font-size:.88rem;font-weight:500;color:#211d18}
.o1a .evtime{font-size:.74rem;color:#7c7367}
.o1a .two{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:6px}
.o1a .mood{display:flex;justify-content:space-between}
.o1a .md{display:flex;flex-direction:column;align-items:center;gap:5px}
.o1a .md .ti{font-size:1.25rem;color:#a8552f}
.o1a .md small{font-size:.58rem;color:#7c7367}
.o1a .md.off .ti{color:#c4bcae}
.o1a .flow{display:flex;flex-direction:column;align-items:center;gap:4px}
.o1a .fring{position:relative;width:88px;height:88px}
.o1a .fring svg{width:100%;height:100%;transform:rotate(-90deg)}
.o1a .femo{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#a8552f}
.o1a .fname{font-size:.72rem;color:#6b6259}
.o1a .eye{border:1px solid #211d18;padding:18px 20px;text-align:center;cursor:pointer}
.o1a .eyel{font-family:'Bebas Neue',sans-serif;font-size:.68rem;letter-spacing:.3em;color:#a8552f;margin-bottom:8px}
.o1a .eyep{font-family:'Shippori Mincho B1',serif;font-size:1.02rem;line-height:1.9;font-weight:600;color:#211d18}
.o1a .hk-rsvp{border:1px solid #d8935f;padding:14px 16px;margin-bottom:6px}
.o1a .hk-rsvprow{display:flex;flex-direction:column;gap:8px}
.o1a .hk-rsvprow b{font-family:'Shippori Mincho B1',serif;font-size:1rem}
.o1a .hk-rsvptime{font-size:.74rem;color:#7c7367;margin-left:8px;font-weight:400}
.o1a .hk-rsvpbtns{display:flex;gap:8px}
.o1a .hk-rsvpbtns button{font-family:inherit;font-size:.76rem;padding:5px 14px;border:1px solid #cdc7bb;background:none;cursor:pointer;color:#211d18}
.o1a .hk-rsvpbtns .hk-go{background:#6a9a4e;color:#fff;border-color:#6a9a4e}
.o1a .hk-rsvpbtns button.on{background:#a8552f;color:#fff;border-color:#a8552f}
.o1a .hk-empty{font-size:.85rem;color:#7c7367;padding:14px 0;cursor:pointer}
.o1a .hk-fork{padding:4px 0 2px}
.o1a .hk-fork .hk-unread .evt{font-weight:700}
.o1a .hk-mealmsg{font-family:'Shippori Mincho B1',serif;font-size:1rem;margin-bottom:4px}

/* ---------- 花信 KASHIN: Vivid Pop Bento ---------- */
.o1b{ color:#25201c; font-family:'Zen Maru Gothic',var(--htk-fallback); }
.o1b .bento{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.o1b .span2{grid-column:span 2}
.o1b .cell{border-radius:20px;padding:16px;border:2.5px solid #25201c;box-shadow:4px 4px 0 rgba(37,32,28,.16);position:relative;overflow:hidden}
.o1b .clabel{font-size:.66rem;font-weight:900;letter-spacing:.04em;opacity:.9;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.o1b .clabel .ti{font-size:.95rem;opacity:1}
.o1b .c-clock{background:#12a89c;color:#fff}
.o1b .c-clock .ctime{font-family:'Zen Maru Gothic',sans-serif;font-weight:900;font-size:3.2rem;line-height:.9;letter-spacing:-.02em}
.o1b .c-clock .cdate{font-size:.8rem;font-weight:700;opacity:.92;margin-top:4px}
.o1b .c-streak{background:#ffc23c;color:#25201c}
.o1b .c-streak .snum{font-family:'Zen Maru Gothic',sans-serif;font-weight:900;font-size:3rem;line-height:.85}
.o1b .c-streak .slab{font-size:.74rem;font-weight:700}
.o1b .c-streak .srank{font-size:.72rem;font-weight:700;margin-top:8px;background:#25201c;color:#ffc23c;display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px}
.o1b .c-apps{background:#fff}
.o1b .apps{display:grid;grid-template-columns:repeat(4,1fr);gap:12px 4px}
.o1b .app{display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;background:none;border:none;font-family:inherit}
.o1b .app .ai{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.35rem;color:#fff;border:2px solid #25201c}
.o1b .app small{font-size:.6rem;font-weight:700;color:#544c43}
.o1b .c-ev{background:#7a5cff;color:#fff}
.o1b .ev{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1.5px solid rgba(255,255,255,.28);cursor:pointer}
.o1b .ev:last-child{border:none}
.o1b .evd{font-weight:900;font-size:.8rem;background:#fff;color:#7a5cff;padding:3px 7px;border-radius:8px;min-width:44px;text-align:center}
.o1b .evt{flex:1;font-size:.8rem;font-weight:700}
.o1b .evtime{font-size:.72rem;opacity:.85;font-weight:700}
.o1b .c-mood{background:#ff6b4a;color:#fff}
.o1b .mood{display:flex;justify-content:space-between;margin-top:4px}
.o1b .md{display:flex;flex-direction:column;align-items:center;gap:3px}
.o1b .md .ti{font-size:1.2rem}
.o1b .md.off .ti{opacity:.45}
.o1b .md small{font-size:.55rem;opacity:.9;font-weight:700}
.o1b .c-flow{background:#fff}
.o1b .fring{position:relative;width:76px;height:76px;margin:0 auto}
.o1b .fring svg{width:100%;height:100%;transform:rotate(-90deg)}
.o1b .femo{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.8rem;color:#12a89c}
.o1b .fname{text-align:center;font-size:.72rem;font-weight:700;margin-top:4px}
.o1b .c-eye{background:#25201c;color:#fff}
.o1b .c-eye .eyep{font-family:'Zen Maru Gothic',sans-serif;font-weight:700;font-size:.94rem;line-height:1.7;margin-top:4px}
.o1b .c-rsvp{background:#12a89c;color:#fff}
.o1b .kb-rsvprow{font-size:.9rem;font-weight:700}
.o1b .kb-rsvpbtns{display:flex;gap:6px;margin-top:8px}
.o1b .kb-rsvpbtns button{font-family:inherit;font-size:.72rem;font-weight:700;padding:5px 12px;border-radius:999px;border:2px solid #fff;background:#fff;color:#12a89c;cursor:pointer}
.o1b .kb-rsvpbtns button.on{background:#25201c;color:#fff;border-color:#25201c}
.o1b .c-fork,.o1b .c-fork2{background:#fff}

/* ---------- 刷 SURI: Riso Zine ---------- */
.o1d{ color:#1a1a2e; font-family:'Zen Kaku Gothic Antique',var(--htk-fallback); }
.o1d .in{position:relative}
.o1d .head{display:flex;align-items:center;gap:8px;font-family:'Bebas Neue',sans-serif;letter-spacing:.1em;font-size:.92rem;color:#2a52c0;margin:22px 0 10px}
.o1d .head b{font-family:'Zen Kaku Gothic Antique',sans-serif;font-weight:900;font-size:.72rem;letter-spacing:0;color:#1a1a2e;background:#ffe14f;padding:1px 6px}
.o1d .head i{flex:1;border-top:2px dotted #2a52c0}
.o1d .clock{border:3px solid #1a1a2e;background:#2a52c0;color:#fff;padding:16px 18px;display:flex;align-items:flex-end;justify-content:space-between;box-shadow:5px 5px 0 #ff4f9a}
.o1d .clock .ctime{font-family:'Zen Kaku Gothic Antique',sans-serif;font-weight:900;font-size:3.6rem;line-height:.82;letter-spacing:-.03em}
.o1d .clock .cdate{font-size:.76rem;font-weight:700;text-align:right;line-height:1.4}
.o1d .streak{display:flex;align-items:center;gap:12px;border:3px solid #1a1a2e;padding:12px 16px;background:#ffe14f}
.o1d .streak .snum{font-family:'Zen Kaku Gothic Antique',sans-serif;font-weight:900;font-size:2.6rem;line-height:.85}
.o1d .streak .slab{font-size:.76rem;font-weight:900}
.o1d .streak .srank{margin-left:auto;font-size:.74rem;font-weight:900;display:flex;align-items:center;gap:5px}
.o1d .streak .srank b{color:#2a52c0;font-size:1.05rem}
.o1d .apps{display:grid;grid-template-columns:repeat(4,1fr);gap:14px 4px}
.o1d .app{display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;background:none;border:none;font-family:inherit}
.o1d .app .ai{width:46px;height:46px;border:2.5px solid #1a1a2e;display:flex;align-items:center;justify-content:center;font-size:1.35rem;color:#1a1a2e}
.o1d .app small{font-size:.6rem;font-weight:900;color:#3a3a4a}
.o1d .ev{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:2px dotted #b9b2a0;cursor:pointer}
.o1d .ev:last-child{border:none}
.o1d .sqd{width:10px;height:10px;flex-shrink:0;background:#ff4f9a}
.o1d .evd{font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:#ff4f9a;min-width:42px}
.o1d .evt{flex:1;font-size:.82rem;font-weight:700;color:#1a1a2e}
.o1d .evtime{font-size:.72rem;font-weight:900;color:#2a52c0}
.o1d .two{display:grid;grid-template-columns:1.1fr 1fr;gap:16px;margin-top:6px}
.o1d .box{border:3px solid #1a1a2e;padding:12px}
.o1d .box .head{margin-top:0}
.o1d .mood{display:flex;justify-content:space-between;margin-top:6px}
.o1d .md{display:flex;flex-direction:column;align-items:center;gap:3px}
.o1d .md .ti{font-size:1.2rem;color:#2a52c0}
.o1d .md.off .ti{color:#b9b2a0}
.o1d .md small{font-size:.55rem;font-weight:900;color:#5a5a6a}
.o1d .flow{display:flex;flex-direction:column;align-items:center;gap:4px}
.o1d .fring{position:relative;width:74px;height:74px;margin:0 auto}
.o1d .fring svg{width:100%;height:100%;transform:rotate(-90deg)}
.o1d .femo{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.7rem;color:#ff4f9a}
.o1d .fname{text-align:center;font-size:.68rem;font-weight:900;margin-top:4px}
.o1d .eye{border:3px solid #1a1a2e;background:#ff4f9a;color:#1a1a2e;padding:16px 18px}
.o1d .eyel{font-family:'Bebas Neue',sans-serif;font-size:.82rem;letter-spacing:.16em;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.o1d .eyep{font-family:'Zen Kaku Gothic Antique',sans-serif;font-weight:900;font-size:.96rem;line-height:1.65}
.o1d .su-rsvp{border:3px solid #1a1a2e;padding:12px 14px;background:#fff}
.o1d .su-rsvprow{display:flex;align-items:center;gap:8px;font-weight:900;font-size:.9rem;margin-bottom:8px}
.o1d .su-rsvprow .sqd{background:#ff4f9a}
.o1d .su-rsvpbtns{display:flex;gap:6px}
.o1d .su-rsvpbtns button{font-family:inherit;font-weight:900;font-size:.72rem;padding:4px 12px;border:2px solid #1a1a2e;background:#fff;color:#1a1a2e;cursor:pointer}
.o1d .su-rsvpbtns button.on{background:#2a52c0;color:#fff}
.o1d .su-empty{font-size:.82rem;font-weight:700;color:#5a5a6a;padding:8px 0;cursor:pointer}
.o1d .su-meal{display:flex;align-items:center;justify-content:space-between;border:3px solid #1a1a2e;padding:12px 14px;font-weight:900;font-size:.9rem;cursor:pointer}

/* 旗鯖fork(v2): 構造トークンのみ。色/背景は .htk-root[data-theme] (v2) が供給する。 */
.htk-root{--radius-lg:28px;--radius-sm:14px;--radius-xs:10px;--success:#6ec072;--ease-spring:cubic-bezier(0.34,1.56,0.64,1);--ease-smooth:cubic-bezier(0.4,0,0.2,1);position:relative;min-height:100dvh;overflow-x:hidden;overflow-y:visible}
.htk-app{max-width:1280px;margin:0 auto;padding:20px;position:relative;z-index:1;overflow-x:clip}

/* ===== 旗鯖fork(v2 Phase3): テーマ別コンポーネント意匠 ===== */
/* カード: テーマ別の枠線(季=細罫 / 花信・刷=極太罫)。面色は ::before(--tint-bg=surface)。 */
.htk-root[data-theme] .htk-lg, .htk-root[data-theme] .htk-lg-s { border: var(--card-border); }
/* 地紋(§01): 花信=コーラルのドット、刷=極細ドット。季は無地。 */
.htk-root[data-theme="kashin"] { background-image: radial-gradient(color-mix(in srgb, var(--coral) 13%, transparent) 1.3px, transparent 1.3px); background-size: 12px 12px; }
.htk-root[data-theme="suri"] { background-image: radial-gradient(color-mix(in srgb, var(--fg) 6%, transparent) 1px, transparent 1px); background-size: 5px 5px; }
/* 見出し・時計・大数字は見出しフォント。 */
.htk-root[data-theme] .htk-dt-time { font-family: var(--htk-font-head); font-weight: 800; color: var(--fg); letter-spacing: .01em; }
.htk-root[data-theme] .htk-sec-title { font-family: var(--htk-font-head); color: var(--fg); }
.htk-root[data-theme] .htk-dt-date { color: var(--fg-2); }
/* タブ(§11): 非選択は fg-2。選択はテーマ別(季=下線 / 花信=塗りピル＋ハード影 / 刷=反転ブロック)。 */
.htk-root[data-theme] .htk-nav-t { color: var(--fg-2); }
.htk-root[data-theme] .htk-nav-t:hover { color: var(--fg); background: var(--hover-bg); }
.htk-root[data-theme="kisetsu"] .htk-nav-t.on { background: transparent; color: var(--accent); box-shadow: inset 0 -2.5px 0 var(--accent); font-weight: 700; }
.htk-root[data-theme="kashin"] .htk-nav-t.on { background: var(--accent); color: var(--on-accent); box-shadow: 2px 2px 0 var(--ink-line); font-weight: 700; }
.htk-root[data-theme="suri"] .htk-nav-t.on { background: var(--blue); color: #fff; box-shadow: none; border-radius: 0; font-weight: 700; }
/* アプリアイコン名・見出し脇のキッカー等は fg 系で可読性確保(remap 済) */
.htk-lg{position:relative;border-radius:var(--radius-lg);isolation:isolate;box-shadow:var(--outer-glow);transition:box-shadow .3s,transform .3s var(--ease-spring);margin-bottom:16px}
.htk-lg::before{content:'';position:absolute;inset:0;z-index:0;border-radius:inherit;box-shadow:var(--inner-glow);background:var(--tint-bg);pointer-events:none}
.htk-lg::after{content:'';position:absolute;inset:0;z-index:-1;border-radius:inherit;backdrop-filter:blur(var(--blur-amount));-webkit-backdrop-filter:blur(var(--blur-amount));isolation:isolate;pointer-events:none}
.htk-lg:hover{box-shadow:var(--outer-glow),0 8px 32px -4px rgba(0,0,0,.08);transform:translateY(-1px)}
.htk-lg-s{position:relative;border-radius:var(--radius-lg);isolation:isolate;box-shadow:var(--outer-glow);margin-bottom:16px}
.htk-lg-s::before{content:'';position:absolute;inset:0;z-index:0;border-radius:inherit;box-shadow:var(--inner-glow);background:var(--tint-bg);pointer-events:none}
.htk-lg-s::after{content:'';position:absolute;inset:0;z-index:-1;border-radius:inherit;backdrop-filter:blur(var(--blur-amount));-webkit-backdrop-filter:blur(var(--blur-amount));isolation:isolate;pointer-events:none}
.htk-lg-in{position:relative;border-radius:var(--radius-xs);isolation:isolate;box-shadow:inset 0 0 8px -2px rgba(255,255,255,.3);padding:12px;margin-bottom:12px}
.htk-lg-in::after{content:'';position:absolute;inset:0;z-index:-1;border-radius:inherit;backdrop-filter:blur(4px);pointer-events:none}
.htk-gc{position:relative;z-index:10;padding:22px}
.htk-header{margin-bottom:16px}
/* 旗鯖fork(v2): 上部ナビ一本化。フラット・テーマ配色・横溢れ時は横スクロール(§11)。 */
.htk-nav{display:flex;gap:4px;padding:5px;position:relative;z-index:10;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;scroll-snap-type:x proximity}
.htk-nav::-webkit-scrollbar{display:none}
.htk-nav-top{border-radius:var(--radius-lg);margin-bottom:16px;background:var(--surface);border:var(--card-border);box-shadow:var(--card-shadow)}
.htk-nav-t{flex:1 0 auto;min-width:44px;padding:10px 12px;text-align:center;font-size:.8rem;font-weight:500;color:var(--text-2,rgba(255,255,255,.7));cursor:pointer;border-radius:calc(var(--radius-lg) - 4px);transition:all .3s var(--ease-spring);border:none;background:transparent;font-family:inherit;text-shadow:var(--text-shadow,none);white-space:nowrap;scroll-snap-align:start}
.htk-nav-t:hover{color:var(--text-1);background:rgba(255,255,255,.08)}
.htk-nav-t.on{color:var(--text-1);font-weight:600;background:rgba(255,255,255,.22);box-shadow:0 1px 4px rgba(0,0,0,.1),0 0 0 0.5px rgba(255,255,255,.15) inset}
.htk-ico{display:block;font-size:1.15rem;margin-bottom:2px;text-shadow:none}

/* ============================================================
   旗鯖fork(v2 デザイン最終形): ヘッダー(mast)＋ナビをテーマ別に忠実化
   ============================================================ */
/* ヘッダーはカード面をやめてフラットに(設計の mast は面なし) */
.htk-root[data-theme] .htk-header.htk-lg{box-shadow:none!important;border:none!important;margin-bottom:0}
.htk-root[data-theme] .htk-header.htk-lg::before{background:none!important;box-shadow:none!important}
.htk-root[data-theme] .htk-header.htk-lg::after{display:none!important}
.htk-root[data-theme="kisetsu"] .htk-header{border-bottom:2px solid var(--fg)}
.htk-root[data-theme="suri"] .htk-header{border-bottom:3px solid var(--ink-line)}

/* ---- ナビ共通: 面バーをやめてフラット・折り返し ---- */
.htk-root[data-theme] .htk-nav.htk-nav-top{background:none;border:none;box-shadow:none;border-radius:0;overflow:visible;flex-wrap:wrap}
.htk-root[data-theme] .htk-nav-t{flex:0 0 auto;min-width:0;transition:none}
.htk-root[data-theme] .htk-nav-t:hover{background:none}
/* 季: 明朝テキストタブ＋アクセント下線(面なし・罫線区切り) */
.htk-root[data-theme="kisetsu"] .htk-nav.htk-nav-top{border-bottom:1px solid var(--rule);padding:12px 0 0;margin-bottom:20px;gap:2px 18px}
.htk-root[data-theme="kisetsu"] .htk-nav-t{padding:2px 0 6px;background:none;border-radius:0;font-family:var(--htk-font-head);font-size:.86rem;font-weight:400;color:var(--fg-3);display:inline-flex;align-items:center;gap:4px}
.htk-root[data-theme="kisetsu"] .htk-nav-t .htk-ico{display:inline;font-size:.95rem;margin:0}
.htk-root[data-theme="kisetsu"] .htk-nav-t.on{color:var(--fg);font-weight:700;background:none;box-shadow:inset 0 -2px 0 var(--accent)}
/* 花信: 丸ゴ極太のピル(非選択=太枠白 / 選択=塗り＋ハード影) */
.htk-root[data-theme="kashin"] .htk-nav.htk-nav-top{padding:0;margin-bottom:18px;gap:7px}
.htk-root[data-theme="kashin"] .htk-nav-t{padding:7px 13px;border-radius:999px;font-size:.76rem;font-weight:700;background:var(--surface);color:var(--fg-3);border:2px solid var(--rule);display:inline-flex;align-items:center;gap:5px}
.htk-root[data-theme="kashin"] .htk-nav-t .htk-ico{display:inline;font-size:.95rem;margin:0}
.htk-root[data-theme="kashin"] .htk-nav-t.on{background:var(--accent);color:#fff;border-color:var(--accent);box-shadow:2px 2px 0 rgba(37,32,28,.2);font-weight:700}
/* 刷: 太罫の上下線に挟まれた極太ゴシックタブ(選択=青ベタ反転) */
.htk-root[data-theme="suri"] .htk-nav.htk-nav-top{border-top:3px solid var(--ink-line);border-bottom:3px solid var(--ink-line);padding:9px 0;margin:0 0 20px;gap:5px}
.htk-root[data-theme="suri"] .htk-nav-t{padding:3px 9px;border-radius:0;font-family:'Zen Kaku Gothic Antique',var(--htk-fallback);font-weight:900;font-size:.74rem;background:none;color:var(--fg-3);display:inline-flex;align-items:center;gap:4px}
.htk-root[data-theme="suri"] .htk-nav-t .htk-ico{display:inline;font-size:.9rem;margin:0}
.htk-root[data-theme="suri"] .htk-nav-t.on{background:var(--blue);color:#fff;font-weight:900;box-shadow:none}
.htk-sec-title{font-size:.92rem;font-weight:700;margin-bottom:12px}
.htk-empty{text-align:center;color:var(--text-3);padding:24px 16px;font-size:.85rem}
.htk-pager{display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 0;font-size:.82rem;color:var(--text-2)}
.htk-pager-t{min-width:60px;text-align:center;font-weight:600}
.htk-empI{font-size:1.6rem;margin-bottom:4px;text-shadow:none;opacity:.6}
/* 旗鯖fork(タスク2): マスコットカード(ミニ版)。
   フローティング(MkMascotFloating)の .stage / .img / .bubble と同じ比率・座標系にして bubbleX/Y を一致させる。
   枠は4:3、画像は max-width:55% で中央配置。motionクラス(htkFloatMotion*)はグローバル定義済みのものを流用する。 */
.htk-mascot-stage{position:relative;width:100%;max-width:260px;margin:4px auto 0;aspect-ratio:4 / 3;cursor:pointer}
.htk-mascot-img{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);max-width:55%;max-height:80%;object-fit:contain;-webkit-user-drag:none;pointer-events:none;filter:drop-shadow(0 4px 16px rgba(0,0,0,.3))}
.htk-mascot-bubble{position:absolute;transform:translate(-50%,-50%);width:max-content;max-width:200px;padding:6px 10px;background:var(--card-bg);border:1px solid var(--divider);color:var(--text-1);border-radius:14px;line-height:1.4;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.25);white-space:pre-line;word-break:break-word;pointer-events:none;z-index:2;font-size:.85rem;backdrop-filter:blur(var(--blur-amount));-webkit-backdrop-filter:blur(var(--blur-amount))}
.htk-mascot-bubble::after{content:'';position:absolute;top:50%;width:0;height:0;border-style:solid}
.htk-mascot-tail-left::after{right:100%;transform:translateY(-50%);border-width:8px 12px 8px 0;border-color:transparent var(--card-bg) transparent transparent;margin-right:-2px}
.htk-mascot-tail-right::after{left:100%;transform:translateY(-50%);border-width:8px 0 8px 12px;border-color:transparent transparent transparent var(--card-bg);margin-left:-2px}
.htk-info-btn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:var(--btn-bg);border:1px solid var(--btn-border);color:var(--text-1);font-size:.75rem;font-weight:700;cursor:pointer;transition:all .2s;font-family:inherit;backdrop-filter:blur(6px);text-shadow:none;vertical-align:middle}
.htk-info-btn:hover{background:var(--btn-hover);transform:scale(1.08)}
.htk-btn{background:var(--btn-bg);border:1px solid var(--btn-border);color:var(--text-1,rgba(255,255,255,.95));text-shadow:var(--text-shadow,none);padding:10px 20px;border-radius:14px;font-family:inherit;font-size:.86rem;font-weight:700;cursor:pointer;backdrop-filter:blur(var(--blur-amount));transition:all .2s}
.htk-btn:hover{background:var(--btn-hover)}.htk-btn:active{transform:scale(.97)}.htk-btn:disabled{opacity:.4;cursor:not-allowed}
.htk-primary{background:rgba(232,168,124,.2);border-color:rgba(232,168,124,.35)}.htk-primary:hover{background:rgba(232,168,124,.35)}
.htk-danger{background:rgba(224,85,112,.15);border-color:rgba(224,85,112,.25);color:#c03050}.htk-danger:hover{background:rgba(224,85,112,.28)}
.htk-sm{padding:6px 14px;font-size:.78rem;border-radius:12px}.htk-xs{padding:4px 10px;font-size:.72rem;border-radius:10px}
.htk-icon-sq{padding:8px 12px;font-size:1.05rem;line-height:1;text-shadow:none}
.htk-sb-on{background:var(--active-bg) !important}
.htk-inp{background:var(--input-bg);border:1px solid var(--input-border);color:var(--text-1,rgba(255,255,255,.95));text-shadow:var(--text-shadow,none);padding:10px 16px;border-radius:14px;font-family:inherit;font-size:.86rem;width:100%;outline:none;transition:all .25s;backdrop-filter:blur(var(--blur-amount));-webkit-appearance:none;-moz-appearance:none;appearance:none;box-sizing:border-box}
.htk-inp:focus{border-color:var(--input-focus);box-shadow:0 0 0 3px rgba(232,168,124,.12)}
.htk-inp::placeholder{color:var(--text-3);text-shadow:none}
textarea.htk-inp{min-height:76px;resize:vertical}
select.htk-inp{appearance:none;cursor:pointer;padding-right:36px}
/* 旗鯖fork: grid item の min-width デフォルトが auto のため子要素の自然サイズで grid が広がり、
   モバイルでカードが画面幅を超えて横に見切れる問題を修正。grid item と各カードに min-width: 0 を強制し、
   カード内の overflow も明示的に hidden 化して横方向に膨らまないようにする。 */
.htk-dash{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));grid-auto-rows:1fr;gap:8px;min-width:0}
.htk-dash>*{min-width:0;max-width:100%}
.htk-dash .htk-lg{margin-bottom:0;height:100%;min-width:0;max-width:100%;overflow:hidden}
.htk-dash .htk-lg>.htk-gc{height:100%;box-sizing:border-box;min-width:0;max-width:100%;overflow-wrap:anywhere;word-break:break-word}
.htk-panels{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:900px){.htk-panels{grid-template-columns:1fr}}
.htk-dt-time{font-size:3rem;font-weight:700;letter-spacing:-1px;line-height:1.1}
.htk-dt-date{font-size:.92rem;color:var(--text-2);margin-top:8px}
.htk-dt-greet{font-size:.88rem;margin-top:12px;font-weight:500;line-height:1.5;white-space:pre-line}
.htk-eye-card{text-align:center;padding:16px 20px}
.htk-eye-label{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:2px;opacity:.4;margin-bottom:8px}
.htk-eye-phrase-wrap{display:grid;min-height:2.5em}
.htk-eye-phrase-wrap>*{grid-area:1/1}
.htk-eye-phrase{font-size:.88rem;font-weight:500;line-height:1.6;white-space:pre-line}
.htk-eye-page-phrase-wrap{display:grid;min-height:3em}
.htk-eye-page-phrase-wrap>*{grid-area:1/1}
.htk-eye-page-phrase{font-size:1rem;font-weight:500;line-height:1.7;white-space:pre-line}
.htk-eye-fade-enter-active,.htk-eye-fade-leave-active{transition:opacity .5s ease,transform .5s ease}
.htk-eye-fade-enter-from{opacity:0;transform:translateY(8px)}
.htk-eye-fade-leave-to{opacity:0;transform:translateY(-8px)}
.htk-eye-page-top{text-align:center;padding:28px 20px}
.htk-eye-logo{font-size:2.5rem;opacity:.3;margin-bottom:4px}
.htk-eye-page-label{font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:3px;opacity:.35;margin-bottom:12px}
.htk-eye-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:10px}
.htk-eye-stat{text-align:center;padding:12px 8px;background:var(--fill);border-radius:12px}
.htk-eye-stat-n{font-size:1.4rem;font-weight:700;background:linear-gradient(135deg,#a78bfa,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.htk-eye-stat-l{font-size:.68rem;color:var(--text-3);margin-top:4px}
.htk-eye-progress-row{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.htk-eye-prog-label{font-size:.75rem;min-width:100px;flex-shrink:0}
.htk-eye-prog-bar{flex:1;height:8px;background:var(--fill-2);border-radius:4px;overflow:hidden}
.htk-eye-prog-fill{height:100%;background:linear-gradient(90deg,#a78bfa,#60a5fa);border-radius:4px;transition:width .5s ease}
.htk-eye-prog-mood{background:linear-gradient(90deg,#f472b6,#fb923c)}
.htk-eye-prog-flower{background:linear-gradient(90deg,#6ee7b7,#34d399)}
.htk-eye-prog-val{font-size:.72rem;color:var(--text-3);min-width:38px;text-align:right}
.htk-eye-hk-list{max-height:300px;overflow-y:auto}
.htk-eye-hk-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--hair)}
.htk-eye-hk-row:last-child{border:none}
.htk-eye-hk-emoji{font-size:1.5rem;flex-shrink:0}
.htk-eye-hk-info{min-width:0}
.htk-eye-hk-name{font-size:.82rem;font-weight:600}
.htk-eye-hk-word{font-size:.7rem;color:var(--text-3);opacity:.7;margin-top:1px}
.htk-gal-hk{font-size:.62rem;color:var(--text-3);opacity:.6;margin-top:1px}
.htk-rsvp-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--hair)}
.htk-rsvp-row:last-child{border:none}
.htk-rsvp-info{flex:1;min-width:0}
.htk-rsvp-title{font-weight:600;font-size:.85rem}
.htk-rsvp-time{font-size:.72rem;opacity:.5;margin-top:2px}
.htk-rsvp-btns{display:flex;gap:4px;flex-shrink:0}
.htk-rsvp-b{padding:5px 10px;border-radius:8px;font-size:.7rem;font-weight:600;border:1px solid var(--fill-3);background:var(--fill);color:var(--text-2);cursor:pointer;transition:all .2s;font-family:inherit}
.htk-rsvp-go.on{background:rgba(110,192,114,.3);border-color:rgba(110,192,114,.5);color:#6ec072}
.htk-rsvp-maybe.on{background:rgba(232,168,124,.3);border-color:rgba(232,168,124,.5);color:#e8a87c}
.htk-rsvp-no.on{background:rgba(220,80,80,.2);border-color:rgba(220,80,80,.4);color:#dc5050}
.htk-rsvp-summary{margin-top:12px;padding:14px;background:var(--fill);border-radius:14px;border:1px solid var(--hair)}
.htk-rsvp-sum-header{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.htk-rsvp-sum-ico{font-size:1.1rem;text-shadow:none}
.htk-rsvp-sum-title{font-size:.82rem;font-weight:700;color:var(--text-1)}
.htk-rsvp-open-badge{font-size:.7rem;padding:4px 10px;background:rgba(110,192,114,.12);color:#6ec072;border-radius:8px;display:inline-block;margin-bottom:10px;font-weight:600}
.htk-rsvp-closed-badge{font-size:.7rem;color:var(--text-3);padding:4px 10px;background:var(--fill);border-radius:8px;margin-bottom:10px;display:inline-block;font-weight:600}
.htk-rsvp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}
.htk-rsvp-stat-card{text-align:center;padding:10px 4px;border-radius:10px;background:var(--fill);border:1px solid var(--hair)}
.htk-rsvp-stat-card.going{border-color:rgba(110,192,114,.25)}
.htk-rsvp-stat-card.maybe{border-color:rgba(232,168,124,.25)}
.htk-rsvp-stat-card.declined{border-color:rgba(220,80,80,.2)}
.htk-rsvp-stat-card.total{border-color:var(--fill-3)}
.htk-rsvp-stat-n{font-size:1.3rem;font-weight:800;line-height:1.2}
.htk-rsvp-stat-card.going .htk-rsvp-stat-n{color:#6ec072}
.htk-rsvp-stat-card.maybe .htk-rsvp-stat-n{color:#e8a87c}
.htk-rsvp-stat-card.declined .htk-rsvp-stat-n{color:#dc5050}
.htk-rsvp-stat-card.total .htk-rsvp-stat-n{color:var(--text-1)}
.htk-rsvp-stat-l{font-size:.62rem;color:var(--text-3);font-weight:600;margin-top:2px}
.htk-rsvp-bar-wrap{margin-bottom:10px}
.htk-rsvp-bar{display:flex;height:8px;border-radius:4px;overflow:hidden;background:var(--fill)}
.htk-rsvp-bar-seg{height:100%;transition:width .3s ease}
.htk-rsvp-bar-seg.going{background:#6ec072}
.htk-rsvp-bar-seg.maybe{background:#e8a87c}
.htk-rsvp-bar-seg.declined{background:#dc5050}
.htk-rsvp-grp{margin-bottom:8px}
.htk-rsvp-grp-h{font-size:.72rem;font-weight:600;color:var(--text-2);display:flex;align-items:center;gap:6px;margin-bottom:4px}
.htk-rsvp-grp-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.htk-rsvp-grp-dot.going{background:#6ec072}
.htk-rsvp-grp-dot.maybe{background:#e8a87c}
.htk-rsvp-grp-dot.declined{background:#dc5050}
.htk-rsvp-grp-names{display:flex;flex-wrap:wrap;gap:4px}
.htk-rsvp-name{font-size:.68rem;padding:3px 8px;background:var(--fill);border-radius:6px;color:var(--text-3)}
.htk-rsvp-closed-row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.78rem;padding:8px 0;color:var(--text-2)}
.htk-rsvp-dismiss{background:none;border:none;color:var(--text-3);cursor:pointer;font-size:.8rem;padding:4px;opacity:.5}
.htk-rsvp-dismiss:hover{opacity:1}
.htk-sec-wrap{position:relative;border-radius:var(--radius-lg)}
.htk-rsvp-sum-empty{font-size:.72rem;opacity:.4;padding:8px 0;text-align:center}
/* (rsvp badges moved to dashboard) */
.htk-fl-ring{position:relative;width:120px;height:120px;margin:0 auto 8px}
.htk-fl-ring svg{width:100%;height:100%}
.htk-fl-track{fill:none;stroke:rgba(128,128,128,.2);stroke-width:4}
.htk-fl-bar{fill:none;stroke:var(--primary);stroke-width:4;stroke-linecap:round;transform:rotate(-90deg);transform-origin:center;stroke-dasharray:377}
.htk-fl-emo{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:2.6rem;text-shadow:none;animation:htkFlBr 4s ease-in-out infinite}
@keyframes htkFlBr{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.06)}}
.htk-ev-row{display:flex;align-items:center;gap:12px;padding:10px;border-radius:var(--radius-xs);margin-bottom:5px;transition:background .2s;cursor:pointer}
.htk-ev-row:hover{background:var(--hover-bg)}
.htk-ev-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.htk-ev-info{flex:1}.htk-ev-title{font-size:.86rem;font-weight:500}.htk-ev-time{font-size:.73rem;color:var(--text-3);margin-top:1px}
.htk-mood-wk{display:flex;gap:8px;justify-content:center}.htk-mood-wk-d{display:flex;flex-direction:column;align-items:center;gap:4px}
.htk-mood-wk-d span:first-child{font-size:1.3rem;text-shadow:none}.htk-mood-wk-d span:last-child{font-size:.66rem;color:var(--text-3)}
.htk-cal-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.htk-cal-ttl{font-size:1.08rem;font-weight:600}
.htk-cal-nav{display:flex;gap:5px}
.htk-cal-nb{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:1px solid var(--btn-border);background:var(--btn-bg);color:var(--text-1);cursor:pointer;font-size:.85rem;transition:all .2s;backdrop-filter:blur(6px)}
.htk-cal-nb:hover{background:var(--btn-hover);transform:scale(1.05)}
.htk-cal-wk{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:2px}
.htk-cal-wk-d{text-align:center;font-size:.7rem;font-weight:600;color:var(--text-3);padding:5px 0}
.htk-cal-wk-d.sun{color:#c03050}.htk-cal-wk-d.sat{color:#2060a0}
.htk-cal-days{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
.htk-cal-d{aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:var(--radius-xs);cursor:pointer;transition:all .2s;font-size:.86rem;position:relative;gap:1px}
.htk-cal-dots{display:flex;gap:2px;height:5px;align-items:center}.htk-cal-dot{width:4px;height:4px;border-radius:50%;flex-shrink:0}
.htk-dayev-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--hair);cursor:pointer;transition:background .2s}
.htk-dayev-row:hover{background:var(--fill);border-radius:8px;margin:0 -6px;padding:10px 6px}
.htk-dayev-row.active{background:var(--fill);border-radius:8px 8px 0 0;margin:0 -6px;padding:10px 6px;border-bottom-color:transparent}
.htk-dayev-row:last-child{border-bottom:none}
.htk-dayev-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.htk-dayev-body{flex:1;min-width:0}
.htk-dayev-title{font-size:.86rem;font-weight:600;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.htk-dayev-time{font-size:.72rem;color:var(--fg-3);margin-top:2px}
.htk-dayev-chevron{flex-shrink:0;color:var(--fg-3);font-size:.8rem;transition:transform .2s}
.htk-dayev-acts{display:flex;gap:4px;flex-shrink:0}
.htk-dayev-ab{width:30px;height:30px;border-radius:var(--radius-xs);background:var(--fill-2);border:none;color:var(--fg-2);cursor:pointer;font-size:.75rem;display:flex;align-items:center;justify-content:center;transition:all .2s}
.htk-dayev-ab:hover{background:var(--fill-3);color:var(--fg)}
.htk-dayev-ab.del:hover{background:rgba(255,80,80,.2);color:#ff6666}
  .htk-rsvp-mini{padding:2px 8px;border-radius:10px;border:1px solid var(--hair);background:var(--fill);color:var(--fg-2);font-size:.7rem;cursor:pointer;transition:all .2s;white-space:nowrap}
  .htk-rsvp-mini:hover{background:var(--fill-3)}
  .htk-rsvp-mini.on-go{background:rgba(76,175,80,.25);color:#81c784;border-color:rgba(76,175,80,.3)}
  .htk-rsvp-mini.on-mb{background:rgba(255,183,77,.2);color:#ffb74d;border-color:rgba(255,183,77,.25)}
/* Event detail panel */
.htk-evdet{margin:0 -6px;padding:14px 14px 12px;background:var(--fill);border-radius:0 0 10px 10px;border-top:1px solid var(--hair);margin-bottom:8px;animation:htk-evdet-in .25s ease}
@keyframes htk-evdet-in{from{opacity:0;max-height:0;padding-top:0;padding-bottom:0}to{opacity:1;max-height:600px}}
.htk-evdet-hdr{display:flex;gap:10px;align-items:flex-start;margin-bottom:12px}
.htk-evdet-emoji{font-size:1.6rem;line-height:1}
.htk-evdet-meta{flex:1;min-width:0}
.htk-evdet-title{font-size:.95rem;font-weight:700;color:var(--fg)}
.htk-evdet-sub{font-size:.75rem;color:var(--fg-3);margin-top:3px}
.htk-evdet-sec-label{font-size:.78rem;font-weight:600;color:var(--fg-2);margin:10px 0 4px;padding-top:8px;border-top:1px solid var(--rule)}
.htk-evdet-rsvp-btns{display:flex;gap:6px;margin:8px 0}
.htk-evdet-rsvp-btns .htk-rsvp-b{flex:1;padding:8px 0;font-size:.8rem;border-radius:10px;border:1px solid var(--rule);background:color-mix(in srgb, var(--fg) 5%, transparent);color:var(--fg-2);cursor:pointer;transition:all .2s;text-align:center;font-weight:500}
.htk-evdet-rsvp-btns .htk-rsvp-go.on{background:rgba(76,175,80,.25);color:#81c784;border-color:rgba(76,175,80,.35)}
.htk-evdet-rsvp-btns .htk-rsvp-maybe.on{background:rgba(255,183,77,.2);color:#ffb74d;border-color:rgba(255,183,77,.3)}
.htk-evdet-rsvp-btns .htk-rsvp-no.on{background:rgba(244,67,54,.2);color:#ef9a9a;border-color:rgba(244,67,54,.25)}
.htk-evdet-resp-summary{margin-top:6px;text-align:center}
.htk-evdet-note{padding:6px 0}
.htk-evdet-acts{display:flex;gap:6px;margin-top:10px;padding-top:8px;border-top:1px solid var(--hair)}
.htk-cal-d:hover{background:var(--hover-bg);transform:scale(1.05)}
.htk-cal-d.om{color:var(--text-3);opacity:.3}.htk-cal-d.td{background:var(--active-bg);font-weight:700}.htk-cal-d.sel{background:var(--active-bg);box-shadow:inset 0 0 0 2px var(--primary)}

/* ============================================================
   旗鯖fork(v2 デザイン最終形): カレンダーをテーマ別に忠実化(設計 .ka/.kb/.kc)
   ============================================================ */
.htk-cal-seg{display:inline-flex;width:max-content}
/* --- 季 --- */
.htk-root[data-theme="kisetsu"] .htk-cal-seg{border:1px solid var(--rule);border-radius:0;gap:0}
.htk-root[data-theme="kisetsu"] .htk-cal-seg button{font-size:.74rem;font-weight:700;padding:6px 14px;border:none;border-radius:0;background:none;color:var(--fg-3);backdrop-filter:none}
.htk-root[data-theme="kisetsu"] .htk-cal-seg button.htk-sb-on{background:var(--fg)!important;color:var(--bg)}
.htk-root[data-theme="kisetsu"] .htk-cal-ttl{font-family:var(--htk-font-head);font-size:1.2rem;font-weight:800;color:var(--fg)}
.htk-root[data-theme="kisetsu"] .htk-cal-nb{width:30px;height:30px;border:1px solid var(--fg);background:none;border-radius:50%;color:var(--fg);backdrop-filter:none}
.htk-root[data-theme="kisetsu"] .htk-cal-wk-d{font-size:.66rem;font-weight:700}
.htk-root[data-theme="kisetsu"] .htk-cal-wk-d.sat{color:#2a6c9a}.htk-root[data-theme="kisetsu"] .htk-cal-wk-d.sun{color:#b5432f}
.htk-root[data-theme="kisetsu"] .htk-cal-d{font-family:var(--htk-font-head);border-radius:8px;color:var(--fg)}
.htk-root[data-theme="kisetsu"] .htk-cal-d.td{background:color-mix(in srgb,var(--fg) 10%,transparent);font-weight:800}
.htk-root[data-theme="kisetsu"] .htk-cal-d.sel{background:none;box-shadow:inset 0 0 0 2px var(--accent)}
.htk-root[data-theme="kisetsu"] .htk-cal-d.om{opacity:.28}
.htk-root[data-theme="kisetsu"] .htk-cal-dot{width:4px;height:4px}
/* --- 花信 --- */
.htk-root[data-theme="kashin"] .htk-cal-seg{gap:6px;border:none}
.htk-root[data-theme="kashin"] .htk-cal-seg button{font-weight:700;font-size:.76rem;padding:7px 14px;border-radius:999px;border:2px solid var(--ink-line);background:var(--surface);color:var(--fg-3);backdrop-filter:none}
.htk-root[data-theme="kashin"] .htk-cal-seg button.htk-sb-on{background:var(--accent)!important;color:#fff;box-shadow:2px 2px 0 rgba(37,32,28,.2);border-color:var(--accent)}
.htk-root[data-theme="kashin"] .htk-cal-ttl{font-family:var(--htk-font-head);font-weight:900;font-size:1.15rem;color:var(--fg)}
.htk-root[data-theme="kashin"] .htk-cal-nb{width:32px;height:32px;border:2px solid var(--ink-line);background:var(--surface);border-radius:10px;color:var(--fg);backdrop-filter:none}
.htk-root[data-theme="kashin"] .htk-cal-days,.htk-root[data-theme="suri"] .htk-cal-days{gap:3px}
.htk-root[data-theme="kashin"] .htk-cal-wk-d{font-size:.64rem;font-weight:900}
.htk-root[data-theme="kashin"] .htk-cal-wk-d.sat{color:#3a7ca5}.htk-root[data-theme="kashin"] .htk-cal-wk-d.sun{color:#ff6b4a}
.htk-root[data-theme="kashin"] .htk-cal-d{font-weight:700;border-radius:10px;background:var(--surface);border:2px solid transparent;color:var(--fg)}
.htk-root[data-theme="kashin"] .htk-cal-d.td{background:#ffc23c;color:#25201c}
.htk-root[data-theme="kashin"] .htk-cal-d.sel{border-color:var(--accent);background:var(--surface);box-shadow:none}
.htk-root[data-theme="kashin"] .htk-cal-d.om{opacity:.3}
.htk-root[data-theme="kashin"] .htk-cal-dot{width:5px;height:5px}
/* --- 刷 --- */
.htk-root[data-theme="suri"] .htk-cal-seg{border:3px solid var(--ink-line);border-radius:0;gap:0}
.htk-root[data-theme="suri"] .htk-cal-seg button{font-weight:900;font-size:.74rem;padding:7px 14px;border:none;border-radius:0;background:var(--surface);color:var(--fg-3);backdrop-filter:none}
.htk-root[data-theme="suri"] .htk-cal-seg button.htk-sb-on{background:var(--blue)!important;color:#fff}
.htk-root[data-theme="suri"] .htk-cal-ttl{font-family:var(--htk-font-head);font-weight:900;font-size:1.15rem;color:var(--fg)}
.htk-root[data-theme="suri"] .htk-cal-nb{width:32px;height:32px;border:2.5px solid var(--ink-line);background:var(--surface);border-radius:0;color:var(--fg);backdrop-filter:none}
.htk-root[data-theme="suri"] .htk-cal-wk-d{font-size:.64rem;font-weight:900}
.htk-root[data-theme="suri"] .htk-cal-wk-d.sat{color:#2a52c0}.htk-root[data-theme="suri"] .htk-cal-wk-d.sun{color:#ff4f9a}
.htk-root[data-theme="suri"] .htk-cal-d{font-weight:900;border-radius:0;background:var(--surface);border:2px solid transparent;color:var(--fg)}
.htk-root[data-theme="suri"] .htk-cal-d.td{background:#ffe14f;color:#1a1a2e}
.htk-root[data-theme="suri"] .htk-cal-d.sel{border-color:var(--blue);background:var(--surface);box-shadow:none}
.htk-root[data-theme="suri"] .htk-cal-d.om{opacity:.3}
.htk-root[data-theme="suri"] .htk-cal-dot{width:5px;height:5px}

/* ============================================================
   旗鯖fork(v2 デザイン最終形): ToDoをテーマ別に忠実化(設計 .ka/.kb/.kc todo)
   ============================================================ */
/* --- 季 --- */
.htk-root[data-theme="kisetsu"] .htk-todo-i{border:1px solid var(--rule);border-radius:0;background:none;padding:11px;margin-bottom:6px;box-shadow:none}
.htk-root[data-theme="kisetsu"] .htk-todo-cb{width:20px;height:20px;border:2px solid #b3ab9d;border-radius:50%}
.htk-root[data-theme="kisetsu"] .htk-todo-cb.ck{background:#3d7a4a;border-color:#3d7a4a}
.htk-root[data-theme="kisetsu"] .htk-todo-tx{font-size:.88rem;font-weight:500}
.htk-root[data-theme="kisetsu"] .htk-todo-db{font-size:.66rem;padding:2px 7px;background:color-mix(in srgb,var(--fg) 8%,transparent);border-radius:4px;color:var(--fg-2)}
.htk-root[data-theme="kisetsu"] .htk-todo-db.od{background:#f2ddd6;color:#b5432f}
.htk-root[data-theme="kisetsu"] .htk-todo-db.tdy{background:#e2eede;color:#3d7a4a}
.htk-root[data-theme="kisetsu"] .htk-todo-fb{font-size:.63rem;padding:2px 7px;background:color-mix(in srgb,var(--accent) 12%,transparent);border-radius:4px;color:var(--accent)}
.htk-root[data-theme="kisetsu"] .htk-ftab{font-size:.73rem;padding:5px 12px;border:1px solid var(--rule);background:none;color:var(--fg-3);border-radius:999px}
.htk-root[data-theme="kisetsu"] .htk-ftab.on{background:color-mix(in srgb,var(--accent) 14%,transparent)!important;color:var(--accent)!important;border-color:var(--accent)!important}
.htk-root[data-theme="kisetsu"] .htk-fm-row{border:1px solid var(--rule);border-radius:0;background:none}
/* --- 花信 --- */
.htk-root[data-theme="kashin"] .htk-todo-i{border:2px solid var(--ink-line);border-radius:14px;background:var(--surface);padding:12px;margin-bottom:8px;box-shadow:none}
.htk-root[data-theme="kashin"] .htk-todo-cb{width:22px;height:22px;border:2.5px solid var(--ink-line);border-radius:50%}
.htk-root[data-theme="kashin"] .htk-todo-cb.ck{background:#12a89c;border-color:#12a89c}
.htk-root[data-theme="kashin"] .htk-todo-tx{font-size:.88rem;font-weight:700}
.htk-root[data-theme="kashin"] .htk-todo-db{font-size:.66rem;font-weight:700;padding:2px 8px;background:#ffc23c;color:#25201c;border-radius:999px}
.htk-root[data-theme="kashin"] .htk-todo-db.od{background:#ff6b4a;color:#fff}
.htk-root[data-theme="kashin"] .htk-todo-db.tdy{background:#12a89c;color:#fff}
.htk-root[data-theme="kashin"] .htk-todo-fb{font-size:.63rem;font-weight:700;padding:2px 8px;background:color-mix(in srgb,var(--fg) 10%,transparent);border-radius:999px;color:var(--fg-2)}
.htk-root[data-theme="kashin"] .htk-ftab{font-weight:700;font-size:.73rem;padding:6px 12px;border:2px solid var(--ink-line);background:var(--surface);color:var(--fg-3);border-radius:999px}
.htk-root[data-theme="kashin"] .htk-ftab.on{background:var(--accent)!important;color:#fff!important;border-color:var(--accent)!important}
.htk-root[data-theme="kashin"] .htk-fm-row{border:2px solid var(--ink-line);border-radius:12px;background:var(--surface)}
/* --- 刷 --- */
.htk-root[data-theme="suri"] .htk-todo-i{border:2.5px solid var(--ink-line);border-radius:0;background:var(--surface);padding:12px;margin-bottom:8px;box-shadow:none}
.htk-root[data-theme="suri"] .htk-todo-cb{width:22px;height:22px;border:2.5px solid var(--ink-line);border-radius:0}
.htk-root[data-theme="suri"] .htk-todo-cb.ck{background:#2a8a4a;border-color:#2a8a4a}
.htk-root[data-theme="suri"] .htk-todo-tx{font-size:.88rem;font-weight:900}
.htk-root[data-theme="suri"] .htk-todo-db{font-size:.66rem;font-weight:900;padding:2px 8px;background:#ffe14f;color:#1a1a2e;border-radius:0}
.htk-root[data-theme="suri"] .htk-todo-db.od{background:#ff4f9a;color:#1a1a2e}
.htk-root[data-theme="suri"] .htk-todo-db.tdy{background:#2a52c0;color:#fff}
.htk-root[data-theme="suri"] .htk-todo-fb{font-size:.63rem;font-weight:900;padding:2px 8px;background:var(--surface);border:2px solid var(--ink-line);border-radius:0;color:var(--fg)}
.htk-root[data-theme="suri"] .htk-ftab{font-weight:900;font-size:.73rem;padding:6px 12px;border:2.5px solid var(--ink-line);background:var(--surface);color:var(--fg-3);border-radius:0}
.htk-root[data-theme="suri"] .htk-ftab.on{background:var(--blue)!important;color:#fff!important;border-radius:0}
.htk-root[data-theme="suri"] .htk-fm-row{border:2.5px solid var(--ink-line);border-radius:0;background:var(--surface)}

/* ============================================================
   旗鯖fork(v2 デザイン最終形): きもち/ごはん/お庭/Eye をテーマ別に忠実化
   (設計 .ka/.kb/.kc の mscale/mo, slots/level, ring/gi, estat/eprog)
   ============================================================ */
/* 見出しはテーマ別の見出しフォントへ */
.htk-root[data-theme] .htk-sec-title{font-family:var(--htk-font-head);color:var(--fg)}
.htk-root[data-theme="kisetsu"] .htk-sec-title{font-weight:800}
.htk-root[data-theme="kashin"] .htk-sec-title,.htk-root[data-theme="suri"] .htk-sec-title{font-weight:900}

/* ---------- きもち: 5段階スケール ---------- */
.htk-root[data-theme="kisetsu"] .htk-mood-o{border-radius:10px;background:none;border:none}
.htk-root[data-theme="kisetsu"] .htk-mood-o.on{background:color-mix(in srgb,var(--fg) 9%,transparent)}
.htk-root[data-theme="kisetsu"] .htk-mood-e i{color:var(--accent)}
.htk-root[data-theme="kashin"] .htk-mood-o{border-radius:14px;border:2px solid transparent;background:none}
.htk-root[data-theme="kashin"] .htk-mood-o.on{background:var(--surface);border-color:var(--accent);box-shadow:3px 3px 0 rgba(37,32,28,.14)}
.htk-root[data-theme="kashin"] .htk-mood-e i{color:var(--accent)}
.htk-root[data-theme="suri"] .htk-mood-o{border-radius:0;border:2px solid transparent;background:none}
.htk-root[data-theme="suri"] .htk-mood-o.on{background:var(--surface);border-color:var(--blue)}
.htk-root[data-theme="suri"] .htk-mood-e i{color:var(--blue)}
/* きもち分析カード */
.htk-root[data-theme="kisetsu"] .htk-ma-card{border:1px solid var(--rule);border-radius:0;background:none}
.htk-root[data-theme="kashin"] .htk-ma-card{border:2.5px solid var(--ink-line);border-radius:14px;background:var(--surface);box-shadow:3px 3px 0 rgba(37,32,28,.14)}
.htk-root[data-theme="suri"] .htk-ma-card{border:2.5px solid var(--ink-line);border-radius:0;background:var(--surface)}
.htk-root[data-theme] .htk-ma-big{font-family:var(--htk-font-head);font-weight:900}

/* ---------- ごはん: スロット/レベル ---------- */
.htk-root[data-theme="kisetsu"] .htk-meal-slot,.htk-root[data-theme="kisetsu"] .htk-meal-level{border:1px solid var(--rule);border-radius:8px;background:none}
.htk-root[data-theme="kisetsu"] .htk-meal-slot.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,transparent)}
.htk-root[data-theme="kashin"] .htk-meal-slot,.htk-root[data-theme="kashin"] .htk-meal-level{border:2px solid var(--ink-line);border-radius:12px;background:var(--surface)}
.htk-root[data-theme="kashin"] .htk-meal-slot.on{background:#ffc23c;color:#25201c}
.htk-root[data-theme="suri"] .htk-meal-slot,.htk-root[data-theme="suri"] .htk-meal-level{border:2px solid var(--ink-line);border-radius:0;background:var(--surface)}
.htk-root[data-theme="suri"] .htk-meal-slot.on{background:#ffe14f;color:#1a1a2e}
.htk-root[data-theme="kisetsu"] .htk-meal-slot-e i{color:var(--accent)}

/* ---------- お庭: 成長リング/ギャラリー ---------- */
.htk-root[data-theme="kisetsu"] .htk-fl-bar{stroke:var(--accent)}.htk-root[data-theme="kisetsu"] .htk-fl-emo{color:var(--accent)}
.htk-root[data-theme="kashin"] .htk-fl-bar{stroke:#12a89c}.htk-root[data-theme="kashin"] .htk-fl-emo{color:#12a89c}
.htk-root[data-theme="suri"] .htk-fl-bar{stroke:#ff4f9a}.htk-root[data-theme="suri"] .htk-fl-emo{color:#ff4f9a}
.htk-root[data-theme] .htk-fl-track{stroke:color-mix(in srgb,var(--fg) 12%,transparent)}
.htk-root[data-theme="kisetsu"] .htk-gal-i{border:1px solid var(--rule);border-radius:0;background:none}
.htk-root[data-theme="kashin"] .htk-gal-i{border:2px solid var(--ink-line);border-radius:14px;background:var(--surface)}
.htk-root[data-theme="suri"] .htk-gal-i{border:2.5px solid var(--ink-line);border-radius:0;background:var(--surface)}
.htk-root[data-theme="kisetsu"] .htk-gal-e{color:var(--accent)}
.htk-root[data-theme="kashin"] .htk-gal-e{color:#12a89c}
.htk-root[data-theme="suri"] .htk-gal-e{color:#ff4f9a}

/* ---------- Eye: フレーズ/統計/進捗バー ---------- */
.htk-root[data-theme] .htk-eye-page-phrase{font-family:var(--htk-font-head)}
.htk-root[data-theme="kisetsu"] .htk-eye-page-phrase{font-weight:600}
.htk-root[data-theme="kisetsu"] .htk-eye-stat{border:1px solid var(--rule);border-radius:0;background:none}
.htk-root[data-theme="kashin"] .htk-eye-stat{border:2.5px solid var(--ink-line);border-radius:14px;background:var(--surface);box-shadow:3px 3px 0 rgba(37,32,28,.14)}
.htk-root[data-theme="suri"] .htk-eye-stat{border:2.5px solid var(--ink-line);border-radius:0;background:var(--surface)}
.htk-root[data-theme] .htk-eye-stat-n{font-family:var(--htk-font-head);font-weight:900;color:var(--accent)}
.htk-root[data-theme] .htk-eye-prog-bar{background:color-mix(in srgb,var(--fg) 12%,transparent);border-radius:999px;overflow:hidden}
.htk-root[data-theme="suri"] .htk-eye-prog-bar{border-radius:0;border:1.5px solid var(--ink-line)}
.htk-root[data-theme="kashin"] .htk-eye-prog-bar{border:1.5px solid var(--ink-line)}
.htk-root[data-theme] .htk-eye-prog-fill{background:var(--accent)}
.htk-fg{margin-bottom:13px}.htk-fl{display:block;font-size:.76rem;font-weight:600;color:var(--text-2);margin-bottom:4px}
.htk-fr{display:flex;gap:8px}.htk-fr > *{flex:1}
.htk-clr-row{display:flex;gap:6px;flex-wrap:wrap}
.htk-clr-o{width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:all .2s}
.htk-clr-o:hover{transform:scale(1.15)}.htk-clr-o.on{border-color:var(--text-1);box-shadow:0 0 8px rgba(128,128,128,.3)}
.htk-vis-row{display:flex;gap:6px}
.htk-vis-o{flex:1;padding:10px;text-align:center;border-radius:var(--radius-xs);cursor:pointer;border:1px solid var(--btn-border);background:var(--btn-bg);transition:all .2s;font-size:.78rem;backdrop-filter:blur(4px)}
.htk-vis-o:hover{background:var(--btn-hover)}.htk-vis-o.on{background:rgba(232,168,124,.18);border-color:rgba(232,168,124,.35)}
.htk-vi{font-size:1.1rem;display:block;margin-bottom:2px;text-shadow:none}
.htk-tg-row{display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--divider)}
.htk-tg-row:last-child{border:none}.htk-tg-lab{font-size:.82rem}
.htk-tg-sw{width:44px;height:24px;background:rgba(128,128,128,.2);border-radius:12px;cursor:pointer;position:relative;transition:background .3s;border:1px solid rgba(128,128,128,.25)}
.htk-tg-sw::after{content:'';position:absolute;width:18px;height:18px;background:rgba(128,128,128,.5);border-radius:50%;top:2px;left:2px;transition:all .3s var(--ease-spring);box-shadow:0 1px 3px rgba(0,0,0,.2)}
.htk-tg-sw.on{background:rgba(76,175,80,.55);border-color:rgba(76,175,80,.4)}.htk-tg-sw.on::after{left:22px;background:#fff;box-shadow:0 1px 4px rgba(76,175,80,.4)}
.htk-nt-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
.htk-nt-chip{padding:4px 10px;border-radius:16px;font-size:.7rem;background:var(--btn-bg);border:1px solid var(--btn-border);cursor:pointer;transition:all .2s}
.htk-nt-chip:hover{background:var(--btn-hover)}.htk-nt-chip.on{background:rgba(232,168,124,.18);border-color:rgba(232,168,124,.3)}
.htk-emp-row{display:flex;gap:5px;flex-wrap:wrap;padding:6px}
.htk-emp-i{font-size:1.15rem;cursor:pointer;padding:4px;border-radius:6px;transition:all .2s;text-shadow:none}
.htk-emp-i:hover{background:var(--hover-bg);transform:scale(1.12)}.htk-emp-i.on{background:var(--active-bg)}
.htk-coll-h{display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:7px 0;user-select:none}
.htk-ci{font-size:.72rem;color:var(--text-3);text-shadow:none}
.htk-todo-inp-r{display:flex;gap:8px;margin-bottom:8px}
.htk-todo-xf{display:none;gap:7px;flex-wrap:wrap;padding:10px;margin-bottom:10px;animation:htkFiU .3s var(--ease-spring);position:relative;z-index:1}.htk-todo-xf.open{display:flex}
.htk-todo-xf-i{flex:1;min-width:120px}.htk-todo-xf-i label{display:block;font-size:.68rem;color:var(--text-3);margin-bottom:2px;font-weight:600}
.htk-fbar{display:flex;gap:5px;margin-bottom:10px;overflow-x:auto;align-items:center}
.htk-ftab{padding:5px 12px;border-radius:16px;font-size:.73rem;font-weight:500;background:var(--btn-bg);border:1px solid var(--btn-border);cursor:pointer;transition:all .2s;white-space:nowrap;font-family:inherit;color:var(--text-2);backdrop-filter:blur(4px)}
.htk-ftab:hover{background:var(--btn-hover);color:var(--text-1)}.htk-ftab.on{background:rgba(232,168,124,.18);border-color:rgba(232,168,124,.3);color:var(--text-1);font-weight:600}
.htk-fc{font-size:.6rem;margin-left:3px;opacity:.6}
.htk-fm-btn{padding:5px 10px;border-radius:16px;font-size:.73rem;background:var(--btn-bg);border:1px solid var(--btn-border);cursor:pointer;color:var(--text-3);transition:all .2s;font-family:inherit;backdrop-filter:blur(4px)}
.htk-fm-btn:hover{background:var(--btn-hover);color:var(--text-1)}
.htk-fm-panel{animation:htkFiU .3s var(--ease-spring)}
.htk-fm-row{display:flex;align-items:center;gap:5px;padding:6px 10px;border-radius:var(--radius-xs);background:var(--btn-bg);border:1px solid var(--btn-border);margin-bottom:4px;backdrop-filter:blur(4px)}
.htk-fm-emoji{font-size:1rem;text-shadow:none}.htk-fm-name{flex:1;font-size:.8rem}.htk-fm-acts{display:flex;gap:3px}
.htk-fm-dot{display:inline-block;width:10px;height:10px;border-radius:50%;flex-shrink:0}
.htk-folder-clr-row{display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap}
.htk-folder-clr-o{width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:all .2s;flex-shrink:0}
.htk-folder-clr-o:hover{transform:scale(1.15)}
.htk-folder-clr-o.on{border-color:var(--text-1);box-shadow:0 0 0 2px var(--card-bg,rgba(0,0,0,.2)),0 0 6px rgba(0,0,0,.2)}
.htk-folder-clr-none{background:var(--btn-bg);display:flex;align-items:center;justify-content:center;font-size:.65rem;color:var(--text-3)}
.htk-sbar{display:flex;gap:5px;margin-bottom:12px;align-items:center;flex-wrap:wrap}.htk-sbar-l{font-size:.73rem;color:var(--text-3);font-weight:600}
.htk-todo-i{display:flex;align-items:flex-start;gap:10px;padding:11px 13px;margin-bottom:5px;border-radius:var(--radius-xs);background:var(--btn-bg);border:1px solid var(--btn-border);transition:all .3s var(--ease-spring);backdrop-filter:blur(4px)}
.htk-todo-i:hover{background:var(--btn-hover)}
.htk-todo-cb{width:20px;height:20px;border-radius:50%;border:2px solid var(--text-3);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .3s var(--ease-spring);cursor:pointer;margin-top:1px}
.htk-todo-cb.ck{background:var(--success);border-color:var(--success)}.htk-todo-cb.ck::after{content:'✓';color:white;font-size:.62rem;font-weight:700;text-shadow:none}
.htk-todo-i.done .htk-todo-tx{text-decoration:line-through;color:var(--text-3)}
.htk-todo-ct{flex:1;min-width:0;cursor:pointer}.htk-todo-tx{font-size:.86rem;font-weight:500}
.htk-todo-mt{display:flex;gap:7px;margin-top:3px;flex-wrap:wrap}
.htk-todo-db{font-size:.68rem;padding:2px 7px;border-radius:8px;background:rgba(232,168,124,.2);color:var(--text-1);text-shadow:none}
.htk-todo-db.od{background:rgba(224,85,112,.2)}.htk-todo-db.tdy{background:rgba(110,192,114,.2)}
.htk-todo-fb{font-size:.63rem;padding:2px 7px;border-radius:8px;background:rgba(94,170,230,.15);color:var(--text-2);text-shadow:none}
.htk-todo-cp{font-size:.73rem;color:var(--text-3);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.htk-todo-acts{display:flex;gap:3px;flex-shrink:0}
.htk-todo-ab{opacity:0;color:var(--text-3);cursor:pointer;font-size:.78rem;padding:3px;border-radius:5px;transition:all .2s;background:none;border:none;text-shadow:none}
.htk-todo-i:hover .htk-todo-ab{opacity:1}
.htk-todo-ab:hover{background:var(--hover-bg);color:var(--text-1)}.htk-todo-ab.del:hover{color:#c03050}
.htk-todo-dx{display:none;margin-top:7px;padding-top:7px;border-top:1px solid var(--divider)}.htk-todo-dx.open{display:block}
.htk-mood-sc{display:flex;justify-content:center;gap:8px;margin-bottom:12px}
.htk-mood-o{display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;padding:8px;border-radius:var(--radius-sm);transition:all .3s var(--ease-spring)}
.htk-mood-o:hover{background:var(--hover-bg);transform:translateY(-3px)}
.htk-mood-o.on{background:var(--active-bg);transform:translateY(-3px) scale(1.05);box-shadow:inset 0 0 8px -2px rgba(128,128,128,.15)}
.htk-mood-e{font-size:1.8rem;transition:transform .3s;text-shadow:none}.htk-mood-o:hover .htk-mood-e{transform:scale(1.12)}
.htk-mood-l{font-size:.63rem;color:var(--text-3);font-weight:500}
.htk-mood-dg{margin-bottom:12px}.htk-mood-dg-h{font-size:.78rem;font-weight:600;color:var(--text-2);margin-bottom:5px;display:flex;align-items:center;gap:5px}
.htk-mood-dg-c{font-size:.63rem;padding:2px 6px;border-radius:7px;background:rgba(232,168,124,.2);color:var(--text-1);text-shadow:none}
.htk-mood-en{display:flex;align-items:flex-start;gap:9px;padding:9px;border-radius:var(--radius-xs);background:var(--btn-bg);border:1px solid var(--btn-border);margin-bottom:5px;transition:all .2s;backdrop-filter:blur(4px)}
.htk-mood-en:hover{background:var(--btn-hover)}
.htk-mood-en-t{font-size:.7rem;color:var(--text-3);min-width:42px}.htk-mood-en-e{font-size:1.15rem;text-shadow:none}
.htk-mood-en-ct{flex:1}.htk-mood-en-n{font-size:.8rem;color:var(--text-2)}.htk-mood-en-ce{font-size:.8rem;margin-top:1px;text-shadow:none}
.htk-mood-en-acts{display:flex;gap:2px;opacity:0;transition:opacity .2s}.htk-mood-en:hover .htk-mood-en-acts{opacity:1}
.htk-mood-en-a{padding:2px 5px;border-radius:4px;border:none;background:none;cursor:pointer;font-size:.73rem;color:var(--text-3);transition:all .2s;text-shadow:none}
.htk-mood-en-a:hover{background:var(--hover-bg);color:var(--text-1)}.htk-mood-en-a.del:hover{color:#c03050}
.htk-gal-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(125px,1fr));gap:10px}
.htk-gal-i{text-align:center;padding:13px 8px;border-radius:var(--radius-sm);background:var(--btn-bg);border:1px solid var(--btn-border);cursor:pointer;transition:all .3s var(--ease-spring);backdrop-filter:blur(4px)}
.htk-gal-i:hover{transform:translateY(-3px);box-shadow:0 6px 20px rgba(0,0,0,.1)}
.htk-gal-e{font-size:2.2rem;display:block;margin-bottom:5px;text-shadow:none}.htk-gal-n{font-size:.76rem;font-weight:600}.htk-gal-d{font-size:.66rem;color:var(--text-3);margin-top:2px}
.htk-sch-sec{font-size:.73rem;font-weight:600;color:var(--text-3);margin:14px 0 6px;padding-bottom:4px;border-bottom:1px solid var(--divider)}
.htk-sch-it{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:var(--radius-xs);transition:background .2s;cursor:pointer;margin-bottom:2px}.htk-sch-it:hover{background:var(--hover-bg)}
.htk-sch-it-emo{font-size:1.3rem;flex-shrink:0;text-shadow:none}
.htk-sch-it-body{flex:1;min-width:0}
.htk-sch-it-title{font-size:.88rem;font-weight:600;color:var(--text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.htk-sch-it-sub{font-size:.72rem;color:var(--text-3);margin-top:1px}
.htk-sch-note{font-size:.68rem;color:var(--text-3);padding:8px 12px;background:rgba(128,128,128,.06);border:1px solid rgba(128,128,128,.1);border-radius:var(--radius-sm);margin-top:12px;line-height:1.4}
.htk-sch-modal .htk-gc{padding:24px 20px}
.htk-sch-modal{border-radius:28px !important;overflow:hidden}
.htk-sch-modal .htk-gc{border-radius:28px}
.htk-sch-inp{margin-bottom:4px;border-radius:14px !important;padding:12px 18px !important;background:color-mix(in srgb, var(--fg) 6%, transparent) !important;border-color:var(--rule) !important;color:var(--fg) !important}
.htk-sch-body{max-height:40vh;overflow-y:auto;margin:4px -4px;padding:0 4px}
.htk-sch-close{min-width:120px;padding:12px 24px;border-radius:14px !important}
.htk-sch-note{border-radius:14px}
.htk-modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.3);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;z-index:3200000}
.htk-modal-c{max-width:500px;width:92%;max-height:85vh;overflow-y:auto;animation:htkScIn .4s var(--ease-spring) both;border-radius:28px !important}
.htk-popup-b{font-size:.82rem;color:var(--text-2);line-height:1.7}
/* Mood Analysis */
.htk-ma-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
.htk-ma-card{padding:14px;border-radius:var(--radius-sm);background:var(--fill);border:1px solid var(--hair);text-align:center}
.htk-ma-label{font-size:.7rem;font-weight:600;color:var(--text-3);margin-bottom:6px}
.htk-ma-big{font-size:1.8rem;line-height:1.2;font-weight:700;text-shadow:none}
.htk-ma-desc{font-size:.76rem;color:var(--text-2);margin-top:4px}
.htk-ma-bar{height:6px;background:rgba(128,128,128,.15);border-radius:3px;margin-top:8px;overflow:hidden}
.htk-ma-bar-fill{height:100%;border-radius:3px;transition:width .5s var(--ease-spring)}
.htk-ma-section{margin-bottom:12px}
.htk-ma-times{display:flex;flex-direction:column;gap:8px}
.htk-ma-time{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--radius-xs);background:var(--fill);border:1px solid var(--hair)}
.htk-ma-time-emo{font-size:1.2rem;text-shadow:none;flex-shrink:0;width:28px;text-align:center}
.htk-ma-time-info{flex:1;min-width:0}
.htk-ma-time-label{font-size:.72rem;font-weight:500;color:var(--text-2);margin-bottom:4px}
.htk-ma-time-bar{height:5px;background:rgba(128,128,128,.12);border-radius:3px;overflow:hidden}
.htk-ma-time-fill{height:100%;border-radius:3px;transition:width .5s var(--ease-spring)}
.htk-ma-time-score{font-size:.8rem;font-weight:600;color:var(--text-2);min-width:28px;text-align:right}
.htk-ma-insight{font-size:.78rem;color:var(--text-2);padding:10px 14px;background:rgba(232,168,124,.08);border:1px solid rgba(232,168,124,.12);border-radius:var(--radius-sm);line-height:1.5}
.htk-set-section{margin-bottom:18px}.htk-set-title{font-size:.82rem;font-weight:600;color:rgba(255,255,255,.85);padding-bottom:6px;margin-bottom:8px;border-bottom:1px solid var(--divider)}
.htk-set-row{display:flex;align-items:center;justify-content:space-between;padding:7px 0}.htk-set-row+.htk-set-row{border-top:1px solid var(--divider)}
.htk-set-row-l{font-size:.82rem;flex:1;color:var(--fg-2)}.htk-set-desc{font-size:.78rem;color:var(--fg-3);margin-bottom:6px}
/* 旗鯖fork(v2 §06): モーダル内はテーマトークンで着色(旧・白固定を撤去。ライトテーマで文字が沈む問題を修正)。 */
.htk-modal-c select.htk-inp{border-radius:var(--radius-sm);appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23999999' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;color:var(--fg)}
.htk-modal-c .htk-gc{color:var(--fg)}
.htk-modal-c .htk-sec-title{color:var(--fg)}

/* ========== SETTINGS PANEL (Teleport to body - CSS変数が効かないため白固定) ========== */
.htk-stg-wrap{max-width:520px;width:92%;max-height:90vh;overflow-y:auto;padding:20px 0;animation:htkScIn .4s var(--ease-spring) both;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.15) transparent;color:rgba(255,255,255,.85)}
.htk-stg-wrap::-webkit-scrollbar{width:4px}.htk-stg-wrap::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:4px}
.htk-stg-h{color:rgba(255,255,255,.92);font-size:1.5rem;font-weight:700;text-align:center;margin-bottom:16px;text-shadow:0 1px 4px rgba(0,0,0,.3)}
.htk-stg-card{margin-bottom:12px;border-radius:24px !important}
.htk-stg-card::before{border-radius:24px !important}
.htk-stg-card::after{border-radius:24px !important}
.htk-stg-gc{padding:18px 22px !important}
.htk-stg-label{font-size:.88rem;font-weight:700;color:rgba(255,255,255,.88);margin-bottom:10px}
.htk-stg-row{display:flex;align-items:center;justify-content:space-between;padding:9px 0;color:rgba(255,255,255,.78);font-size:.86rem}
.htk-stg-row+.htk-stg-row{border-top:1px solid rgba(255,255,255,.08)}
.htk-stg-row span:first-child{flex:1}
.htk-stg-desc{font-size:.75rem;color:rgba(255,255,255,.4);line-height:1.5}
.htk-stg-sel{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.85);padding:8px 32px 8px 14px;border-radius:14px;font-family:inherit;font-size:.82rem;outline:none;cursor:pointer;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='rgba(255,255,255,0.6)' viewBox='0 0 16 16'%3E%3Cpath d='M8 12L2 6h12z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;backdrop-filter:blur(8px);transition:all .25s}
.htk-stg-sel:hover{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.25)}
.htk-stg-sel option{background:#1e1e2e;color:#fff}
.htk-stg-close{min-width:140px;padding:14px 28px;font-size:.92rem;border-radius:16px !important}
.htk-stg-topbar{display:flex;justify-content:flex-end;padding:0 8px;position:sticky;top:0;z-index:10}
.htk-stg-close-top{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.9);width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;backdrop-filter:blur(8px)}
.htk-stg-close-top:hover{background:rgba(255,255,255,.25)}
.htk-nav-back{opacity:.6;max-width:40px;flex:0 0 40px !important}
.htk-nav-back:hover{opacity:1}
.htk-bg-picker{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
.htk-bg-opt{width:44px;height:44px;border-radius:12px;cursor:pointer;border:2px solid transparent;transition:all .2s}
.htk-bg-opt:hover{transform:scale(1.08)}.htk-bg-opt.on{border-color:var(--text-1);box-shadow:0 0 12px rgba(128,128,128,.3)}
.htk-bg-purple{background:linear-gradient(135deg,#3a3744,#534e60)}.htk-bg-ocean{background:linear-gradient(135deg,#2d6a8f,#5bc0be)}.htk-bg-forest{background:linear-gradient(135deg,#2d5a27,#6bbd67)}.htk-bg-night{background:linear-gradient(135deg,#0f0c29,#302b63)}
.htk-rl-box{padding:12px;background:rgba(234,185,68,.08);border:1px solid rgba(234,185,68,.15);border-radius:var(--radius-sm);margin-top:4px}
.htk-rl-t{font-size:.78rem;font-weight:600;color:rgba(240,208,112,.9);margin-bottom:4px}
.htk-rl-tbl{width:100%;margin-top:5px;border-collapse:collapse}
.htk-rl-tbl th,.htk-rl-tbl td{padding:5px 8px;font-size:.72rem;text-align:left;border-bottom:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.65)}.htk-rl-tbl th{color:rgba(255,255,255,.4);font-weight:600}
/* 旗鯖fork(v2 §16③): 敷き詰め(スタガー)はテーマ別。data-anim=off / reduced-motion で無効化(別ルール)。 */
.htk-root[data-theme] .htk-anim{opacity:0}
.htk-root[data-theme="kisetsu"] .htk-anim{animation:htkItemKi .5s var(--ease-smooth) both}
.htk-root[data-theme="kashin"] .htk-anim{animation:htkItemKa .55s cubic-bezier(.34,1.56,.64,1) both}
.htk-root[data-theme="suri"] .htk-anim{animation:htkItemSu .42s cubic-bezier(.5,0,.3,1) both}
.htk-anim:nth-child(2){animation-delay:.05s}.htk-anim:nth-child(3){animation-delay:.1s}.htk-anim:nth-child(4){animation-delay:.15s}.htk-anim:nth-child(5){animation-delay:.2s}.htk-anim:nth-child(6){animation-delay:.25s}.htk-anim:nth-child(7){animation-delay:.3s}.htk-anim:nth-child(n+8){animation-delay:.35s}
/* data-anim=off でも opacity:0 のまま消えないよう明示的に戻す */
.htk-root[data-anim="off"] .htk-anim{opacity:1 !important;animation:none !important}
@media (prefers-reduced-motion: reduce){ .htk-root[data-theme] .htk-anim{opacity:1 !important;animation:none !important} }
@keyframes htkFiU{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes htkScIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
/* Mobile: hide desktop nav, add padding */
@media(max-width:1024px){
  .htk-app{padding-bottom:28px}
}
@media(max-width:640px){.htk-app{padding:12px;padding-bottom:24px}.htk-dt-time{font-size:2.2rem}.htk-panels{grid-template-columns:1fr}.htk-mood-sc{gap:3px;flex-wrap:wrap}.htk-mood-e{font-size:1.4rem}.htk-mood-o{padding:6px}.htk-dash{grid-template-columns:1fr}
}
/* ========== LOGIN DAYS CARD ========== */
.htk-login-card{text-align:center;padding:20px 16px}
.htk-login-top{display:flex;align-items:baseline;justify-content:center;gap:4px;margin-bottom:8px}
.htk-login-days-n{font-size:3rem;font-weight:800;line-height:1;color:var(--text-1)}
.htk-login-days-l{font-size:1.1rem;font-weight:600;opacity:.6}
.htk-login-rank{display:inline-flex;align-items:center;gap:5px;padding:4px 14px;border-radius:20px;background:rgba(255,215,0,.12);font-size:.78rem;margin-bottom:6px}
.htk-login-rank strong{color:rgba(255,215,0,.9)}
.htk-login-total{opacity:.5;font-size:.72rem}
.htk-login-msg{font-size:.8rem;opacity:.65;margin-bottom:6px}
.htk-login-next{font-size:.75rem;opacity:.55}
.htk-login-next strong{color:var(--primary);opacity:1}
/* ========== APPS GRID ========== */
.htk-apps-grid{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
.htk-app-icon{display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:none;cursor:pointer;padding:8px;border-radius:16px;transition:all .2s var(--ease-spring);font-family:inherit}
.htk-app-icon:hover{transform:translateY(-3px);background:var(--hover-bg)}
.htk-app-icon:active{transform:scale(.93)}
.htk-app-icon-img{width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.15);transition:box-shadow .2s}
.htk-app-icon:hover .htk-app-icon-img{box-shadow:0 6px 20px rgba(0,0,0,.25)}
.htk-app-icon-name{font-size:.68rem;font-weight:600;color:var(--text-2);text-shadow:var(--text-shadow);white-space:nowrap}
/* Dark mode overrides */
.htk-root[data-mode="dark"] .htk-danger{color:#ffa0b0}
.htk-root[data-mode="dark"] .htk-rl-t{color:#f0d070}
.htk-root[data-mode="dark"] .htk-cal-wk-d.sun{color:#ffa0b0}
.htk-root[data-mode="dark"] .htk-cal-wk-d.sat{color:#90c8ff}

/* ========== TUTORIAL ========== */
/* ========== SPOTLIGHT TUTORIAL ========== */
.htk-tut-ov{position:fixed;inset:0;z-index:3200000}
.htk-tut-center{position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;z-index:3200001}
/* 旗鯖fork(v2 §14): テーマ選択ステップ */
.htk-tutth-ov{background:rgba(0,0,0,.66);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center}
.htk-tutth{width:min(92%,460px);text-align:center;padding:26px 22px;animation:htkTutIn .55s cubic-bezier(.34,1.56,.64,1) both}
.htk-tutth-h{font-size:1.55rem;font-weight:800;color:#fff;margin-bottom:6px}
.htk-tutth-sub{font-size:.82rem;color:rgba(255,255,255,.55);margin-bottom:22px}
.htk-tutth-cards{display:flex;gap:10px;justify-content:center;margin-bottom:20px}
.htk-tutth-card{position:relative;flex:1 1 0;min-width:0;border:2.5px solid;border-radius:14px;padding:18px 8px;cursor:pointer;transition:transform .22s var(--ease-spring,cubic-bezier(.34,1.56,.64,1)),box-shadow .22s,opacity .22s;font-family:inherit}
.htk-tutth-card.on{transform:translateY(-5px);box-shadow:0 10px 26px rgba(0,0,0,.45)}
.htk-tutth-card:not(.on){opacity:.68}
.htk-tutth-jp{font-size:1.6rem;font-weight:800;line-height:1;margin-bottom:6px}
.htk-tutth-name{font-family:'Righteous',system-ui,sans-serif;font-size:1.05rem;line-height:1;margin-bottom:4px}
.htk-tutth-desc{font-size:.6rem;opacity:.72}
.htk-tutth-check{position:absolute;top:7px;right:7px;width:19px;height:19px;border-radius:50%;display:flex;align-items:center;justify-content:center}
.htk-tutth-check i{font-size:.7rem;color:#fff}
.htk-tutth-mode{display:inline-flex;gap:6px;padding:4px;background:rgba(255,255,255,.08);border-radius:12px;margin-bottom:14px}
.htk-tutth-mbtn{padding:7px 18px;border:none;background:transparent;color:rgba(255,255,255,.6);border-radius:9px;font-size:.8rem;cursor:pointer;font-family:inherit;transition:all .2s;display:inline-flex;align-items:center;gap:5px}
.htk-tutth-mbtn.on{background:rgba(255,255,255,.92);color:#1a1a1a;font-weight:700}
.htk-tutth-note{font-size:.72rem;color:rgba(255,255,255,.42);margin-bottom:18px}
.htk-tutth-btns{display:flex;flex-direction:column;align-items:center;gap:6px}
.htk-tutth-start{width:auto;padding:12px 30px}

/* ============================================================
   旗鯖fork(v2 デザイン最終形): 検索モーダルをテーマ別に忠実化(設計 .sa/.sb/.sd)
   (Teleport の .htk-modal-ov に data-theme/data-mode 付与済み)
   ============================================================ */
.htk-modal-ov[data-theme] .htk-sch-modal .htk-sch-note{font-size:.7rem;color:var(--fg-3);text-align:center;margin-top:10px}
/* --- 季: 明朝＋罫線＋下線入力 --- */
.htk-modal-ov[data-theme="kisetsu"] .htk-sch-modal .htk-sec-title{border-bottom:2px solid var(--fg);padding-bottom:12px;font-family:var(--htk-font-head);font-weight:800}
.htk-modal-ov[data-theme="kisetsu"] .htk-sch-inp{border:none!important;border-bottom:1.5px solid var(--fg)!important;border-radius:0!important;background:none!important;padding:10px 2px!important}
.htk-modal-ov[data-theme="kisetsu"] .htk-sch-sec{font-family:'Bebas Neue',sans-serif;letter-spacing:.24em;font-size:.7rem;color:var(--accent);font-weight:400;border-bottom:none;display:flex;align-items:center;gap:8px}
.htk-modal-ov[data-theme="kisetsu"] .htk-sch-sec::after{content:'';flex:1;height:1px;background:var(--rule)}
.htk-modal-ov[data-theme="kisetsu"] .htk-sch-it{border-bottom:1px solid var(--rule);border-radius:0}
.htk-modal-ov[data-theme="kisetsu"] .htk-sch-it-emo{color:var(--accent)}
/* --- 花信: 丸ゴ＋太枠ピル入力＋ミニカード候補 --- */
.htk-modal-ov[data-theme="kashin"] .htk-sch-modal .htk-sec-title{font-family:var(--htk-font-head);font-weight:900}
.htk-modal-ov[data-theme="kashin"] .htk-sch-inp{background:var(--surface)!important;border:2.5px solid var(--ink-line)!important;border-radius:16px!important;box-shadow:3px 3px 0 rgba(37,32,28,.16);font-weight:700;padding:12px 14px!important}
.htk-modal-ov[data-theme="kashin"] .htk-sch-sec{font-weight:900;font-size:.7rem;color:var(--fg);border-bottom:none;display:flex;align-items:center;gap:8px}
.htk-modal-ov[data-theme="kashin"] .htk-sch-sec::after{content:'';flex:1;height:1px;background:var(--rule)}
.htk-modal-ov[data-theme="kashin"] .htk-sch-it{background:var(--surface);border:2px solid var(--rule);border-radius:14px;margin-bottom:8px}
.htk-modal-ov[data-theme="kashin"] .htk-sch-it-emo{color:#ff6b4a}
/* --- 刷: 太罫入力＋ドット罫セクション＋青アイコン --- */
.htk-modal-ov[data-theme="suri"] .htk-sch-modal .htk-sec-title{border-bottom:3px solid var(--ink-line);padding-bottom:10px;font-family:var(--htk-font-head);font-weight:900}
.htk-modal-ov[data-theme="suri"] .htk-sch-inp{background:var(--surface)!important;border:3px solid var(--ink-line)!important;border-radius:0!important;font-weight:700;padding:12px 14px!important}
.htk-modal-ov[data-theme="suri"] .htk-sch-sec{font-family:'Bebas Neue',sans-serif;letter-spacing:.14em;font-size:.72rem;color:var(--blue);font-weight:400;border-bottom:none;display:flex;align-items:center;gap:8px}
.htk-modal-ov[data-theme="suri"] .htk-sch-sec::after{content:'';flex:1;border-top:2px dotted var(--blue);height:0}
.htk-modal-ov[data-theme="suri"] .htk-sch-it{border-bottom:2px dotted var(--fg-3);border-radius:0}
.htk-modal-ov[data-theme="suri"] .htk-sch-it-emo{color:var(--blue)}

/* ============================================================
   旗鯖fork(v2 §14): テーマ選択(設計 .tpickwrap を忠実移植)
   ============================================================ */
.htk-tpick-ov{background:rgba(0,0,0,.66);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;padding:16px}
.tpickwrap{width:520px;max-width:calc(100vw - 32px);max-height:92vh;overflow-y:auto;border-radius:24px;box-shadow:0 18px 50px -16px rgba(0,0,0,.5);background:#faf8f3;font-family:'Zen Kaku Gothic New',var(--htk-fallback);color:#211d18;padding:30px 28px 26px;position:relative;animation:htkTutIn .5s cubic-bezier(.34,1.56,.64,1) both}
.tpickwrap[data-mode="dark"]{background:#16151b;color:#ece7dc}
.tpick-cap{text-align:center;font-family:'Bebas Neue',sans-serif;letter-spacing:.26em;font-size:.72rem;opacity:.6}
.tpick-logo{font-family:'Righteous',system-ui,sans-serif;font-size:2.2rem;text-align:center;line-height:1.1}
.tpick-sub{font-size:.86rem;opacity:.8;margin:8px 0 18px;text-align:center;line-height:1.6}
.tpick-sub2{display:inline-block;font-size:.74rem;opacity:.55;margin-top:2px}
.tpick-seg{display:flex;gap:4px;justify-content:center;background:rgba(0,0,0,.06);border-radius:999px;padding:4px;width:max-content;margin:0 auto 20px}
.tpickwrap[data-mode="dark"] .tpick-seg{background:rgba(255,255,255,.1)}
.tpick-seg button{border:none;background:none;font-family:inherit;font-size:.78rem;font-weight:700;padding:6px 16px;border-radius:999px;cursor:pointer;color:inherit;display:flex;align-items:center;gap:5px}
.tpick-seg button.on{background:#211d18;color:#faf8f3}
.tpickwrap[data-mode="dark"] .tpick-seg button.on{background:#ece7dc;color:#16151b}
/* 旗鯖fork(ハタキュ): テーマが4つになったので2列2段にする。
   ⚠️520px幅に4列を詰めるとプレビューが潰れて選べる見た目でなくなる。 */
.tpick-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:18px}
.tp-card{border:2px solid transparent;border-radius:16px;padding:10px;cursor:pointer;background:rgba(0,0,0,.035);transition:transform .15s,border-color .15s,background .3s;font-family:inherit;color:inherit;text-align:left}
.tpickwrap[data-mode="dark"] .tp-card{background:rgba(255,255,255,.06)}
.tp-card:hover{transform:translateY(-3px)}
.tp-card.sel{border-color:#a8552f}
.tpickwrap[data-mode="dark"] .tp-card.sel{border-color:#e0966a}
.tp-prev{border-radius:10px;height:92px;padding:10px;display:flex;flex-direction:column;justify-content:space-between;transition:background .3s,color .3s}
.tp-prev .pl{font-family:'Righteous',system-ui,sans-serif;font-size:1rem}
.tp-prev .pb{height:6px;border-radius:3px;width:62%}
.tp-prev .pt{display:flex;gap:4px}.tp-prev .pt i{width:15px;height:5px;border-radius:2px;display:block}
.tp-name{font-weight:700;font-size:.84rem;margin-top:9px;display:flex;align-items:center;gap:5px}
.tp-check{margin-left:auto;color:#a8552f;opacity:0}
.tp-card.sel .tp-check{opacity:1}
.tp-desc{font-size:.67rem;opacity:.6;margin-top:2px;line-height:1.45}
.tpick-go{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:14px;border:none;border-radius:14px;background:#a8552f;color:#fff;font-family:inherit;font-weight:700;font-size:.92rem;cursor:pointer}
.tpick-note{text-align:center;font-size:.7rem;opacity:.5;margin-top:10px}
.tpick-skip{display:block;margin:8px auto 0;background:none;border:none;color:inherit;opacity:.45;font-size:.72rem;cursor:pointer;font-family:inherit}
.pv-kisetsu{background:#f4f1ea;color:#211d18}
.tpickwrap[data-mode="dark"] .pv-kisetsu{background:#17140f;color:#f1ece1}
.pv-kisetsu .pb{background:#a8552f}.pv-kisetsu .pt i{background:#cdc7bb}
.pv-kashin{background:#fff5e6;color:#25201c}
.tpickwrap[data-mode="dark"] .pv-kashin{background:#1b1726;color:#fbf3e6}
.pv-kashin .pb{background:#ff6b4a}.pv-kashin .pt i{background:#12a89c}
.pv-suri{background:#efe7d4;color:#1a1a2e}
.tpickwrap[data-mode="dark"] .pv-suri{background:#14141f;color:#ece7dc}
.pv-suri .pb{background:#2a52c0}.pv-suri .pt i{background:#ff4f9a}
/* 旗鯖fork(ハタキュ): 地色はコルク、紙のロゴは青。⚠️他の3つと同じ3点セット(pl/pb/pt)を必ず揃える。 */
.pv-hatakyu{background:#c9975f;color:#3b2a1c}
.tpickwrap[data-mode="dark"] .pv-hatakyu{background:#4a3a2b;color:#f4ece0}
.pv-hatakyu .pl{color:#1272ec}
.tpickwrap[data-mode="dark"] .pv-hatakyu .pl{color:#6fa8ff}
.pv-hatakyu .pb{background:#fdf6e6}.pv-hatakyu .pt i{background:#f7dc9a}
.tpickwrap[data-mode="dark"] .pv-hatakyu .pb{background:#332b22}
.tpickwrap[data-mode="dark"] .pv-hatakyu .pt i{background:#5c4c38}

/* ============================================================
   旗鯖fork(v2): ホーム 季/刷 のダークモード可読性
   設計はライト前提で紙面(地色)に黒文字を直書きしているため、ダークでは潰れる。
   ダーク時だけ、地色の上のテキスト/罫線/アクセントをトークン(--fg系/--accent/--rule/--ink-line/--blue/--pink)へ。
   色ブロック上の白/濃文字(時計・連続・Eye等)はそのまま。
   ============================================================ */
/* ---- 季 (.o1a) は全テキストが紙面上 → まとめてトークンへ ---- */
.htk-root[data-mode="dark"] .o1a{color:var(--fg)}
.htk-root[data-mode="dark"] .o1a .ctime,
.htk-root[data-mode="dark"] .o1a .snum,
.htk-root[data-mode="dark"] .o1a .evt,
.htk-root[data-mode="dark"] .o1a .eyep,
.htk-root[data-mode="dark"] .o1a .dept::before{color:var(--fg)}
.htk-root[data-mode="dark"] .o1a .cdate,
.htk-root[data-mode="dark"] .o1a .slab,
.htk-root[data-mode="dark"] .o1a .srank,
.htk-root[data-mode="dark"] .o1a .app small,
.htk-root[data-mode="dark"] .o1a .fname{color:var(--fg-2)}
.htk-root[data-mode="dark"] .o1a .evtime,
.htk-root[data-mode="dark"] .o1a .md small{color:var(--fg-3)}
.htk-root[data-mode="dark"] .o1a .dept,
.htk-root[data-mode="dark"] .o1a .evd,
.htk-root[data-mode="dark"] .o1a .srank b,
.htk-root[data-mode="dark"] .o1a .srank .ti,
.htk-root[data-mode="dark"] .o1a .md .ti,
.htk-root[data-mode="dark"] .o1a .femo,
.htk-root[data-mode="dark"] .o1a .eyel{color:var(--accent)}
.htk-root[data-mode="dark"] .o1a .md.off .ti{color:var(--fg-3)}
.htk-root[data-mode="dark"] .o1a .dept i{background:var(--rule)}
.htk-root[data-mode="dark"] .o1a .streak{border-top-color:var(--rule);border-bottom-color:var(--rule)}
.htk-root[data-mode="dark"] .o1a .ev{border-bottom-color:var(--rule)}
.htk-root[data-mode="dark"] .o1a .eye{border-color:var(--fg)}
.htk-root[data-mode="dark"] .o1a .hk-empty,
.htk-root[data-mode="dark"] .o1a .hk-mealmsg{color:var(--fg-2)}
/* ---- 刷 (.o1d) は紙面上のテキスト/罫のみトークンへ(色ブロック上はそのまま) ---- */
.htk-root[data-mode="dark"] .o1d{color:var(--fg)}
.htk-root[data-mode="dark"] .o1d .evt{color:var(--fg)}
.htk-root[data-mode="dark"] .o1d .app small{color:var(--fg-2)}
.htk-root[data-mode="dark"] .o1d .md small,
.htk-root[data-mode="dark"] .o1d .su-empty{color:var(--fg-3)}
.htk-root[data-mode="dark"] .o1d .head,
.htk-root[data-mode="dark"] .o1d .evtime,
.htk-root[data-mode="dark"] .o1d .md .ti{color:var(--blue)}
.htk-root[data-mode="dark"] .o1d .head i{border-top-color:var(--blue)}
.htk-root[data-mode="dark"] .o1d .evd,
.htk-root[data-mode="dark"] .o1d .femo{color:var(--pink)}
.htk-root[data-mode="dark"] .o1d .md.off .ti{color:var(--fg-3)}
.htk-root[data-mode="dark"] .o1d .box,
.htk-root[data-mode="dark"] .o1d .su-meal,
.htk-root[data-mode="dark"] .o1d .app .ai{border-color:var(--ink-line)}
.htk-root[data-mode="dark"] .o1d .ev{border-bottom-color:var(--rule)}
/* ---- 各ページ(きもち/ごはん/お庭/Eye)もダークで文字が潰れないよう見出し等をトークンへ ---- */
.htk-root[data-mode="dark"] .htk-ma-big{color:var(--fg)}
.htk-tut-welcome{text-align:center;max-width:420px;padding:20px;animation:htkTutIn .8s var(--ease-spring) both;position:relative;z-index:1}
.htk-tut-particles{position:absolute;inset:-50px;pointer-events:none;overflow:hidden}
.htk-tut-particles>span{position:absolute;width:4px;height:4px;border-radius:50%;background:rgba(232,168,124,.4);animation:htkParticle 6s linear infinite;opacity:0}
.htk-tut-hero-emoji{font-size:3.5rem;margin-bottom:12px;animation:htkTutFloat 3s ease-in-out infinite;text-shadow:none}
.htk-tut-catch{font-size:1.05rem;color:rgba(255,255,255,.55);margin-bottom:6px;font-weight:400;letter-spacing:3px;text-transform:uppercase}
.htk-tut-appname{font-size:2.8rem;font-weight:800;color:rgba(255,255,255,.95);margin-bottom:14px;letter-spacing:1px;text-shadow:0 2px 16px rgba(232,168,124,.35);background:linear-gradient(135deg,#e8a87c,#85cdca);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

/* ============================================================
   旗鯖fork(v2 デザイン最終形): チュートリアルをテーマ別に忠実化
   (設計 .ta/.tb/.td2 の welcome/spotlight)。Teleport のため data-theme を付与済み。
   ============================================================ */
/* --- 共通: ウェルカム面をテーマ別の紙面に(暗幕をやめる) --- */
.htk-tut-ov[data-theme] .htk-tut-center{backdrop-filter:none;-webkit-backdrop-filter:none}
.htk-tut-ov[data-theme] .htk-tut-appname{background:none;-webkit-text-fill-color:currentColor;text-shadow:none;font-family:'Righteous',system-ui,sans-serif;font-weight:400}
.htk-tut-ov[data-theme] .htk-tut-hero-emoji{width:60px;height:60px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:1.9rem;margin:0 auto 16px;animation:none}
.htk-tut-ov[data-theme] .htk-tut-catch{text-transform:none}
/* --- 季 --- */
.htk-tut-ov[data-theme="kisetsu"] .htk-tut-center{background:#f4f1ea;color:#211d18}
.htk-tut-ov[data-theme="kisetsu"] .htk-tut-hero-emoji{background:#211d18;color:#f4f1ea}
.htk-tut-ov[data-theme="kisetsu"] .htk-tut-catch{font-family:'Bebas Neue',sans-serif;letter-spacing:.34em;color:#a8552f}
.htk-tut-ov[data-theme="kisetsu"] .htk-tut-appname{color:#211d18}
.htk-tut-ov[data-theme="kisetsu"] .htk-tut-sub{color:#6b6259}
.htk-tut-ov[data-theme="kisetsu"] .htk-tut-btn-p{background:#211d18;color:#f4f1ea;border-radius:2px;box-shadow:none}
.htk-tut-ov[data-theme="kisetsu"] .htk-tut-btn-s{background:none;color:#7c7367;border:none;text-decoration:underline;text-underline-offset:3px}
.htk-tut-ov[data-theme="kisetsu"] .htk-tut-dot{background:#d4cec2}.htk-tut-ov[data-theme="kisetsu"] .htk-tut-dot.on{background:#a8552f}
.htk-tut-ov[data-theme="kisetsu"] .htk-spot-tip{background:#f4f1ea;border:1px solid #211d18;border-radius:0;box-shadow:0 16px 40px rgba(0,0,0,.35);color:#211d18;backdrop-filter:none}
.htk-tut-ov[data-theme="kisetsu"] .htk-spot-tip-emoji{background:#211d18;color:#f4f1ea;border-radius:8px;width:34px;height:34px;display:flex;align-items:center;justify-content:center}
.htk-tut-ov[data-theme="kisetsu"] .htk-spot-tip-title{font-family:'Shippori Mincho B1',serif;color:#211d18}
.htk-tut-ov[data-theme="kisetsu"] .htk-spot-tip-badge{color:#a8552f;background:none;border:1px solid #a8552f}
.htk-tut-ov[data-theme="kisetsu"] .htk-spot-tip-body{color:#544c43}
.htk-tut-ov[data-theme="kisetsu"] .htk-spot-tip-row{color:#544c43}
.htk-tut-ov[data-theme="kisetsu"] .htk-spot-tip-bullet{background:none;color:#a8552f}
.htk-tut-ov[data-theme="kisetsu"] .htk-spot-tip-bar{background:#d4cec2}.htk-tut-ov[data-theme="kisetsu"] .htk-spot-tip-progress{background:#d4cec2}
/* --- 花信 --- */
.htk-tut-ov[data-theme="kashin"] .htk-tut-center{background:#fff5e6;color:#25201c;background-image:radial-gradient(rgba(255,107,74,.14) 1.4px,transparent 1.4px);background-size:13px 13px}
.htk-tut-ov[data-theme="kashin"] .htk-tut-hero-emoji{background:#ff6b4a;color:#fff;border:2.5px solid #25201c;box-shadow:4px 4px 0 rgba(37,32,28,.16)}
.htk-tut-ov[data-theme="kashin"] .htk-tut-catch{color:#7a5cff;font-weight:900;letter-spacing:.14em}
.htk-tut-ov[data-theme="kashin"] .htk-tut-appname{color:#25201c}
.htk-tut-ov[data-theme="kashin"] .htk-tut-sub{color:#6b6259;font-weight:500}
.htk-tut-ov[data-theme="kashin"] .htk-tut-btn-p{background:#ff6b4a;color:#fff;border-radius:16px;border:2.5px solid #25201c;box-shadow:4px 4px 0 rgba(37,32,28,.2)}
.htk-tut-ov[data-theme="kashin"] .htk-tut-btn-s{background:none;color:#7c7367;font-weight:700;border:none}
.htk-tut-ov[data-theme="kashin"] .htk-tut-dot{background:#efd9be}.htk-tut-ov[data-theme="kashin"] .htk-tut-dot.on{background:#ff6b4a}
.htk-tut-ov[data-theme="kashin"] .htk-spot-tip{background:#fff;border:2.5px solid #25201c;border-radius:16px;box-shadow:4px 4px 0 rgba(0,0,0,.25);color:#25201c;backdrop-filter:none}
.htk-tut-ov[data-theme="kashin"] .htk-spot-tip-emoji{background:#12a89c;color:#fff;border:2px solid #25201c;border-radius:8px;width:34px;height:34px;display:flex;align-items:center;justify-content:center}
.htk-tut-ov[data-theme="kashin"] .htk-spot-tip-title{color:#25201c;font-weight:900}
.htk-tut-ov[data-theme="kashin"] .htk-spot-tip-badge{background:#ffc23c;color:#25201c;border-radius:8px}
.htk-tut-ov[data-theme="kashin"] .htk-spot-tip-body{color:#544c43;font-weight:500}
.htk-tut-ov[data-theme="kashin"] .htk-spot-tip-row{color:#544c43}
.htk-tut-ov[data-theme="kashin"] .htk-spot-tip-bullet{background:none;color:#ff6b4a}
.htk-tut-ov[data-theme="kashin"] .htk-spot-tip-bar,.htk-tut-ov[data-theme="kashin"] .htk-spot-tip-progress{background:#efe4d2}
/* --- 刷 --- */
.htk-tut-ov[data-theme="suri"] .htk-tut-center{background:#efe7d4;color:#1a1a2e}
.htk-tut-ov[data-theme="suri"] .htk-tut-hero-emoji{background:#2a52c0;color:#fff;border:3px solid #1a1a2e;box-shadow:4px 4px 0 #ff4f9a;border-radius:0}
.htk-tut-ov[data-theme="suri"] .htk-tut-catch{font-family:'Bebas Neue',sans-serif;color:#2a52c0;background:#ffe14f;display:inline-block;padding:2px 10px;letter-spacing:.14em}
.htk-tut-ov[data-theme="suri"] .htk-tut-appname{color:#2a52c0;text-shadow:2.5px 2.5px 0 #ff4f9a}
.htk-tut-ov[data-theme="suri"] .htk-tut-sub{color:#4a4a5a;font-weight:500}
.htk-tut-ov[data-theme="suri"] .htk-tut-btn-p{background:#2a52c0;color:#fff;border:3px solid #1a1a2e;box-shadow:4px 4px 0 #ff4f9a;border-radius:0}
.htk-tut-ov[data-theme="suri"] .htk-tut-btn-s{background:none;color:#5a5a6a;font-weight:900;border:none}
.htk-tut-ov[data-theme="suri"] .htk-tut-dot{background:#d3cbb7}.htk-tut-ov[data-theme="suri"] .htk-tut-dot.on{background:#ff4f9a}
.htk-tut-ov[data-theme="suri"] .htk-spot-tip{background:#efe7d4;border:3px solid #1a1a2e;border-radius:0;box-shadow:0 16px 40px rgba(0,0,0,.4);color:#1a1a2e;backdrop-filter:none}
.htk-tut-ov[data-theme="suri"] .htk-spot-tip-emoji{background:#2a52c0;color:#fff;border:2.5px solid #1a1a2e;border-radius:0;width:34px;height:34px;display:flex;align-items:center;justify-content:center}
.htk-tut-ov[data-theme="suri"] .htk-spot-tip-title{color:#1a1a2e;font-weight:900}
.htk-tut-ov[data-theme="suri"] .htk-spot-tip-badge{background:#ff4f9a;color:#1a1a2e;font-family:'Bebas Neue',sans-serif;border-radius:0}
.htk-tut-ov[data-theme="suri"] .htk-spot-tip-body{color:#3a3a4a;font-weight:500}
.htk-tut-ov[data-theme="suri"] .htk-spot-tip-row{color:#3a3a4a}
.htk-tut-ov[data-theme="suri"] .htk-spot-tip-bullet{background:none;color:#2a52c0}
.htk-tut-ov[data-theme="suri"] .htk-spot-tip-bar,.htk-tut-ov[data-theme="suri"] .htk-spot-tip-progress{background:#d3cbb7}
.htk-tut-sub{font-size:.84rem;color:rgba(255,255,255,.5);line-height:1.6;margin-bottom:28px}
.htk-tut-btns{display:flex;gap:10px;justify-content:center;margin-bottom:20px}
.htk-tut-btn{padding:12px 28px;border-radius:14px;font-family:inherit;font-size:.88rem;font-weight:700;cursor:pointer;border:none;transition:all .25s var(--ease-spring)}
.htk-tut-btn:hover{transform:translateY(-2px)}
.htk-tut-btn:active{transform:scale(.96)}
.htk-tut-btn-xs{padding:8px 18px;font-size:.78rem;border-radius:10px}
.htk-tut-btn-p{background:linear-gradient(135deg,rgba(232,168,124,.85),rgba(226,125,96,.7));color:#fff;box-shadow:0 4px 16px rgba(232,168,124,.3)}
.htk-tut-btn-p:hover{box-shadow:0 6px 24px rgba(232,168,124,.4)}
.htk-tut-btn-s{background:rgba(255,255,255,.08);color:rgba(255,255,255,.65);border:1px solid rgba(255,255,255,.12)}
.htk-tut-btn-s:hover{background:rgba(255,255,255,.15)}
.htk-tut-btn-finish{background:linear-gradient(135deg,rgba(110,192,114,.85),rgba(133,205,202,.75));color:#fff;box-shadow:0 4px 20px rgba(110,192,114,.3)}
.htk-tut-btn-finish:hover{box-shadow:0 6px 28px rgba(110,192,114,.4);transform:translateY(-3px)}
.htk-tut-dots{display:flex;gap:6px;justify-content:center}
.htk-tut-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.2);transition:all .3s}
.htk-tut-dot.on{background:rgba(232,168,124,.7);width:22px;border-radius:4px}
.htk-tut-skip{display:block;margin:6px auto 0;background:none;border:none;color:rgba(255,255,255,.25);font-size:.68rem;cursor:pointer;font-family:inherit;transition:color .2s}
.htk-tut-skip:hover{color:rgba(255,255,255,.55)}
/* 4-panel spotlight overlay */
.htk-spot-top,.htk-spot-bottom,.htk-spot-left,.htk-spot-right{position:fixed;background:rgba(0,0,0,.55);transition:all .4s cubic-bezier(.4,0,.2,1);cursor:pointer;z-index:3200002}
.htk-spot-top{top:0;left:0;right:0}
.htk-spot-bottom{left:0;right:0;bottom:0}
.htk-spot-left{left:0}
.htk-spot-right{right:0}
/* Highlight ring */
.htk-spot-ring{position:fixed;border-radius:16px;border:2.5px solid rgba(232,168,124,.6);box-shadow:0 0 24px rgba(232,168,124,.25),inset 0 0 16px rgba(232,168,124,.1);pointer-events:none;transition:all .4s cubic-bezier(.4,0,.2,1);animation:htkSpotPulse 2s ease-in-out infinite;z-index:3200003}
/* Tooltip */
.htk-spot-tip{position:fixed;background:rgba(18,18,28,.94);border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:18px 16px 12px;backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);box-shadow:0 16px 48px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.05);animation:htkSpotTipIn .45s cubic-bezier(.34,1.56,.64,1) both;z-index:3300000;color:#fff}
.htk-spot-tip-arrow{position:absolute;width:14px;height:14px;background:rgba(20,20,30,.92);border:1px solid rgba(255,255,255,.12);transform:rotate(45deg);border-radius:3px}
.htk-spot-tip-bottom .htk-spot-tip-arrow{top:-8px;left:50%;margin-left:-7px;border-right:none;border-bottom:none}
.htk-spot-tip-top .htk-spot-tip-arrow{bottom:-8px;left:50%;margin-left:-7px;border-left:none;border-top:none}
.htk-spot-tip-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.htk-spot-tip-emoji{font-size:1.4rem;text-shadow:none}
.htk-spot-tip-title{font-size:1rem;font-weight:700;color:rgba(255,255,255,.92);flex:1}
.htk-spot-tip-badge{font-size:.62rem;padding:3px 8px;border-radius:8px;background:rgba(232,168,124,.15);color:rgba(232,168,124,.8);font-weight:600;white-space:nowrap}
.htk-spot-tip-body{font-size:.8rem;color:rgba(255,255,255,.6);line-height:1.5;margin-bottom:10px}
.htk-spot-tip-extra{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
.htk-spot-tip-row{display:flex;align-items:flex-start;gap:8px;font-size:.76rem;color:rgba(255,255,255,.7);line-height:1.4}
.htk-spot-tip-bullet{flex-shrink:0;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:.72rem;text-shadow:none;border-radius:6px;background:rgba(255,255,255,.06)}
.htk-spot-tip-nav{display:flex;align-items:center;gap:8px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)}
.htk-spot-tip-progress{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden}
.htk-spot-tip-bar{height:100%;background:linear-gradient(90deg,rgba(232,168,124,.7),rgba(133,205,202,.6));border-radius:2px;transition:width .4s ease}
@keyframes htkTutIn{from{opacity:0;transform:scale(.85) translateY(30px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes htkTutFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes htkParticle{0%{opacity:0;transform:translateY(0) scale(0)}15%{opacity:1;transform:scale(1)}100%{opacity:0;transform:translateY(-200px) scale(0)}}
@keyframes htkSpotPulse{0%,100%{box-shadow:0 0 20px rgba(232,168,124,.2),inset 0 0 20px rgba(232,168,124,.1)}50%{box-shadow:0 0 30px rgba(232,168,124,.35),inset 0 0 25px rgba(232,168,124,.15)}}
@keyframes htkSpotTipIn{from{opacity:0;transform:translateY(14px) scale(.93)}to{opacity:1;transform:translateY(0) scale(1)}}

/* ===== 食事記録(meal)。3段階は等価に扱い、否定的な色強調はしない ===== */
.htk-meal-slots{display:flex;gap:6px;margin-top:6px}
.htk-meal-slot{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;padding:8px 4px;border-radius:var(--radius-sm);border:1.5px solid var(--btn-border);background:var(--btn-bg);transition:all .25s var(--ease-spring)}
.htk-meal-slot:hover{background:var(--hover-bg);transform:translateY(-2px)}
.htk-meal-slot.on{background:color-mix(in srgb,var(--MI_THEME-accent) 16%,transparent);border-color:var(--MI_THEME-accent);transform:translateY(-2px) scale(1.03);box-shadow:0 0 0 1px var(--MI_THEME-accent) inset}
.htk-meal-slot.on .htk-meal-slot-l{color:var(--MI_THEME-accent);font-weight:700}
.htk-meal-slot.on .htk-meal-slot-e{transform:scale(1.12)}
.htk-meal-slot-e{font-size:1.3rem;text-shadow:none;transition:transform .25s}.htk-meal-slot-l{font-size:.72rem;transition:color .2s}
.htk-meal-levels{display:flex;gap:6px;margin-top:6px}
.htk-meal-level{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:10px 4px;border-radius:var(--radius-sm);border:1.5px solid var(--btn-border);background:var(--btn-bg);transition:all .25s var(--ease-spring)}
.htk-meal-level:hover{background:var(--hover-bg);transform:translateY(-2px)}
.htk-meal-level-e{font-size:1.5rem;text-shadow:none}.htk-meal-level-l{font-size:.74rem;font-weight:600}
.htk-meal-reasons{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.htk-meal-reason{padding:4px 12px;border-radius:16px;font-size:.74rem;background:var(--btn-bg);border:1px solid var(--btn-border);cursor:pointer;transition:all .2s;backdrop-filter:blur(4px)}
.htk-meal-reason:hover{background:var(--btn-hover)}
.htk-meal-reason.on{background:rgba(133,205,202,.18);border-color:rgba(133,205,202,.4)}
.htk-meal-summary{font-size:.86rem;line-height:1.7;opacity:.85;padding:6px 4px}
.htk-meal-en-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.htk-meal-en-slot{font-size:.8rem;font-weight:700}
.htk-meal-en-level{font-size:.76rem;font-weight:600}
.htk-meal-en-reasons{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.htk-meal-en-reason{padding:2px 8px;border-radius:12px;font-size:.66rem;background:var(--btn-bg);border:1px solid var(--btn-border);opacity:.85}

/* 旗鯖fork(#36): HataFeed通知タイル / 地震・津波タイル */
.htk-hf-bdg{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:var(--MI_THEME-accent);color:#fff;font-size:.7rem;font-weight:700;margin-left:6px;vertical-align:middle}
.htk-hf-list{display:flex;flex-direction:column;gap:4px}
.htk-hf-row{display:flex;align-items:flex-start;gap:8px;padding:6px 8px;border-radius:8px;border:none;background:transparent;cursor:pointer;text-align:left;width:100%;color:inherit;font:inherit}
.htk-hf-row:hover{background:var(--btn-bg)}
.htk-hf-unread{background:color-mix(in srgb, var(--MI_THEME-accent) 9%, transparent)}
.htk-hf-icn{flex-shrink:0;color:var(--MI_THEME-accent);font-size:.95rem;margin-top:2px}
.htk-hf-msg{flex:1;min-width:0}
.htk-hf-text{font-size:.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.htk-hf-actor{font-size:.72rem;opacity:.6}
.htk-eq-conn{display:inline-flex;align-items:center;gap:4px;font-size:.7rem;opacity:.7}
.htk-eq-dot{width:7px;height:7px;border-radius:50%}
.htk-eq-dot.on{background:#22c55e;box-shadow:0 0 4px #22c55e;animation:htkPulse 2s ease-in-out infinite}
.htk-eq-dot.off{background:#ef4444}
@keyframes htkPulse{0%,100%{opacity:1}50%{opacity:.35}}
.htk-eq-meta{font-size:.72rem;opacity:.55;margin-top:6px;text-align:right;font-variant-numeric:tabular-nums}

/* =====================================================================
   旗鯖fork(ハタキュ): コルクボードテーマ
   設計: Hatask v2 コルク.dc.html (.ckroot / .board / .cork / .pinned / .hang)
   ⚠️ここのセレクタは必ず .htk-root[data-theme="hatakyu"] 配下に閉じる。
     素の .hk-* だけで書くと、他テーマのCSSと衝突したときに気付けない。
   ⚠️板の見た目は .htk-shell の擬似要素で作っている(::before=コルク面 / ::after=内枠)。
     .htk-shell を消す/名前を変えるときはテンプレート側と同時に直すこと。
   ===================================================================== */

/* ⚠️⚠️ここが抜けると機能タブが「空白」になる。⚠️⚠️
   `.htk-root[data-theme] .htk-anim{opacity:0}` が全テーマ共通で要素を透明にし、
   そこから戻すのは **テーマ別の出現アニメ(fill-mode:both)** だけ、という作りになっている。
   ハタキュの行を足さないと `.htk-anim` が付いた要素は永久に opacity:0 のまま消える。
   機能タブ(カレンダー/ToDo/きもち/ごはん/お庭/Eye)のカードは全部 `.htk-lg .htk-anim` なので全滅する。
   ホームだけ無事に見えるのは、ハタキュのホームが .hk-pin/.hk-card で `.htk-anim` を使っていないため。
   ⚠️アニメOFF・prefers-reduced-motion の人は `opacity:1 !important` で救われるので再現しない。
     「自分の環境では出ない」を理由に無いことにしないこと。

   ⚠️ここで出現アニメを足して解決してはいけない。カード自体に揺れ(hkSway)を当てており、
     animation は後勝ちで潰れる → opacity:0 が残って同じ症状に戻る。opacity を直接戻す。
   ⚠️[data-anim] を挟んで詳細度を1つ上げてある(記述順に依存させないため)。data-anim は常に付く。 */
.htk-root[data-theme="hatakyu"][data-anim] .htk-anim{ opacity:1; }

/* ハタキュ以外では箱として存在しない。⚠️これを消すと全テーマのレイアウトが1段深くなる。 */
.htk-shell{ display:contents; }

.htk-root[data-theme="hatakyu"] .htk-shell{
  display:block; position:relative; border-radius:20px;
  /* 板14px + コルク面の内余白(20 18 26) */
  padding:34px 32px 40px;
  background:linear-gradient(160deg,var(--wood-l),var(--wood));
  box-shadow:0 34px 70px -26px rgba(0,0,0,.65),inset 0 2px 0 rgba(255,255,255,.18);
}
/* コルク面。粒は放射グラデを重ねて作る(画像を持たない)。 */
.htk-root[data-theme="hatakyu"] .htk-shell::before{
  content:''; position:absolute; inset:14px; border-radius:12px; z-index:0; pointer-events:none;
  background-color:var(--cork);
  background-image:
    radial-gradient(rgba(120,80,40,.42) 1.4px,transparent 1.5px),
    radial-gradient(rgba(90,58,28,.3) 1.1px,transparent 1.2px),
    radial-gradient(rgba(255,225,180,.28) 1px,transparent 1.1px),
    radial-gradient(circle at 22% 18%,rgba(255,220,170,.14),transparent 45%),
    radial-gradient(circle at 78% 82%,rgba(80,50,20,.16),transparent 50%);
  background-size:11px 11px,17px 17px,23px 23px,100% 100%,100% 100%;
  background-position:0 0,6px 9px,13px 4px,0 0,0 0;
  box-shadow:inset 0 0 44px rgba(60,40,20,.45);
}
/* 板の内枠(木口の落ち影) */
.htk-root[data-theme="hatakyu"] .htk-shell::after{
  content:''; position:absolute; inset:7px; border-radius:14px;
  border:2px solid rgba(0,0,0,.22); pointer-events:none; z-index:3;
}
/* 中身はコルク面より前に出す */
.htk-root[data-theme="hatakyu"] .htk-shell > *{ position:relative; z-index:2; }

/* --- 突風で舞う落ち葉 --- */
.hk-leaves{ position:absolute; inset:14px; border-radius:12px; overflow:hidden; pointer-events:none; z-index:5; }
.hk-leaf{ position:absolute; left:-24px; width:11px; height:11px; border-radius:60% 10% 60% 10%; background:var(--lc,#e3b768); opacity:0; }
.hk-leaf:nth-child(1){ top:14%; --lc:#e8c07a; animation-delay:.02s }
.hk-leaf:nth-child(2){ top:34%; --lc:#cf9a58; animation-delay:.18s; width:9px; height:9px }
.hk-leaf:nth-child(3){ top:56%; --lc:#f0d59a; animation-delay:.32s }
.hk-leaf:nth-child(4){ top:72%; --lc:#d9a765; animation-delay:.46s; width:8px; height:8px }
.hk-leaf:nth-child(5){ top:24%; --lc:#f3e2b5; animation-delay:.6s; width:7px; height:7px }

/* --- ヘッダー(タイトル紙 + 紙のボタン) --- */
.hk-bhead{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px; flex-wrap:wrap; }
.hk-titlecard{ position:relative; background:var(--surface); padding:11px 20px 12px; transform:rotate(-1.4deg); box-shadow:0 10px 18px -8px rgba(45,28,10,.6); }
.hk-lg-name{ font-family:'Righteous',system-ui,sans-serif; font-size:2rem; line-height:1; color:var(--blue); }
.hk-sb{ font-size:.64rem; font-weight:700; color:var(--fg-2); letter-spacing:.14em; margin-top:2px; }
.hk-tape{ position:absolute; width:70px; height:22px; background:rgba(247,220,154,.82); border-left:1px dashed rgba(255,255,255,.5); border-right:1px dashed rgba(255,255,255,.5); box-shadow:0 1px 4px rgba(0,0,0,.18); }
.hk-tl{ top:-10px; left:-15px; transform:rotate(-28deg) }
.hk-tr{ top:-10px; right:-15px; transform:rotate(26deg) }
.hk-hbtns{ display:flex; gap:7px; flex-wrap:wrap }
.hk-hbtn{ display:inline-flex; align-items:center; gap:6px; min-height:44px; padding:9px 13px; border:none; cursor:pointer; font-family:var(--htk-font-head); font-weight:700; font-size:.76rem; color:var(--fg); background:var(--paper2); box-shadow:0 6px 12px -6px rgba(40,24,8,.6); transform:rotate(.8deg); }
.hk-hbtn:nth-child(2){ transform:rotate(-1.2deg) }
.hk-hbtn:nth-child(3){ transform:rotate(1.6deg) }
.hk-hbtn .ti{ font-size:1rem; color:var(--blue) }

/* --- タブ(画鋲つきの付箋) --- */
/* ⚠️タブを横スクロール(overflow-x:auto)にしてはいけない。
     Hatask は .htk-app に「横スワイプでタブ切替」のハンドラを持っている。
     横スクロール領域を作ると、指で払ったときにタブが切り替わってしまい
     スクロールできず、画面外のタブに永久に触れなくなる(モバイルで再現)。
   ⚠️既存3テーマも同じ理由で .htk-nav-top を flex-wrap:wrap にしている。ここも折り返しに揃える。
     設計HTMLは横スクロールだが、あちらはスワイプ操作を持たないプロトタイプなのでそのまま持ち込めない。 */
.hk-tabs{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:18px; padding-bottom:4px; overflow:visible; }
.hk-tag{ position:relative; display:inline-flex; align-items:center; gap:6px; min-height:44px; padding:9px 14px 10px; border:none; cursor:pointer; font-family:var(--htk-font-head); font-weight:700; font-size:.8rem; color:var(--fg); background:var(--surface); box-shadow:0 7px 14px -7px rgba(40,24,8,.65); clip-path:polygon(0 0,100% 0,100% 100%,7px 100%,0 calc(100% - 7px)); flex:0 0 auto; white-space:nowrap; }
.hk-tag .ti{ font-size:1.05rem; color:var(--fg-3) }
.hk-tag.on{ background:var(--blue); color:var(--on-blue) }
.hk-tag.on .ti{ color:var(--on-blue-2) }
.hk-tag::before{ content:''; position:absolute; top:5px; left:9px; width:9px; height:9px; border-radius:50%; background:radial-gradient(circle at 32% 30%,#fff,#c0392b 55%,#7d2018); box-shadow:0 1px 2px rgba(0,0,0,.45); }

/* --- 石垣(masonry) と 機能タブの列 --- */
/* ホーム専用。短い紙だけを並べるので段組み(石垣)でよい。 */
.hk-masonry{ columns:3; column-gap:16px; }
/* ⚠️機能タブ(カレンダー/ToDo/きもち/ごはん/お庭/Eye)に段組みを使ってはいけない。
     段組みは中身を「分断」するので、ToDoリストや予定フォームのような背の高いカードが
     途中で切られて次の段へ飛び、画鋲(position:absolute)は分断境界で消える。
     break-inside:avoid は保証ではなく希望なので防げない。⚠️列はグリッドで固定する。
   ⚠️列数はベースの .htk-panels と同じ2列に揃える。設計HTMLは3列だが、あちらの紙は
     どれも短い。実際のフォームを3列に詰めると1列あたりが狭すぎて崩れる。 */
.hk-panels{ display:grid; grid-template-columns:1fr 1fr; gap:22px 16px; align-items:start; }
.hk-pin{ position:relative; transform-origin:50% 4px; transform:rotate(var(--r,0deg)); }
/* 段組み(ホーム)側だけ、縦の隔たりをマージンで取る。グリッド側は gap が担う。 */
.hk-masonry > .hk-pin{ break-inside:avoid; margin:0 0 20px; }
/* 共有マークアップのカード(.htk-lg)も、この板の上では同じ「紙」として振る舞わせる。 */
.htk-root[data-theme="hatakyu"] .hk-masonry > .htk-lg,
.htk-root[data-theme="hatakyu"] .hk-panels > .htk-lg{
  transform-origin:50% 4px; transform:rotate(var(--r,0deg));
  background:var(--surface); box-shadow:var(--card-shadow); border-radius:0;
}
.htk-root[data-theme="hatakyu"] .hk-masonry > .htk-lg{ break-inside:avoid; margin:0 0 20px; }
/* ⚠️ベースの .htk-lg は margin-bottom:16px を持つ。gap と二重になるので消す。 */
.htk-root[data-theme="hatakyu"] .hk-panels > .htk-lg{ margin:0; }
.htk-root[data-theme="hatakyu"] .hk-masonry > .htk-lg:nth-child(odd),
.htk-root[data-theme="hatakyu"] .hk-panels > .htk-lg:nth-child(odd){ --r:-1deg }
.htk-root[data-theme="hatakyu"] .hk-masonry > .htk-lg:nth-child(even),
.htk-root[data-theme="hatakyu"] .hk-panels > .htk-lg:nth-child(even){ --r:1.2deg }
/* ⚠️ベースの .htk-lg:hover は translateY で transform を奪う。紙は傾きを保つ。 */
.htk-root[data-theme="hatakyu"] .hk-masonry > .htk-lg:hover,
.htk-root[data-theme="hatakyu"] .hk-panels > .htk-lg:hover{ transform:rotate(var(--r,0deg)); }
/* ベースの ::after は backdrop-filter 用。この板では画鋲として作り替える。 */
.htk-root[data-theme="hatakyu"] .hk-masonry > .htk-lg::after,
.htk-root[data-theme="hatakyu"] .hk-panels > .htk-lg::after{
  content:''; inset:auto; position:absolute; top:-9px; left:50%; margin-left:-9px;
  width:18px; height:18px; border-radius:50%; backdrop-filter:none; -webkit-backdrop-filter:none;
  background:radial-gradient(circle at 32% 28%,#fff 8%,#e0483c 46%,#8c2118);
  box-shadow:0 3px 5px rgba(0,0,0,.45); z-index:4;
}

/* --- 紙(カード) --- */
.hk-card{ position:relative; display:block; width:100%; box-sizing:border-box; text-align:left; border:none; font-family:inherit; background:var(--surface); color:var(--fg); padding:15px 16px 16px; box-shadow:0 12px 22px -10px rgba(40,24,8,.7); }
.hk-cardbtn{ cursor:pointer }
.hk-cream{ background:var(--cream-c) }
.hk-blue{ background:var(--blue-c) }
.hk-mint{ background:var(--mint-c) }
.hk-center{ text-align:center }
.hk-tack{ position:absolute; top:-9px; left:50%; margin-left:-9px; width:18px; height:18px; border-radius:50%; background:radial-gradient(circle at 32% 28%,#fff 8%,var(--pc,#e0483c) 46%,#8c2118); box-shadow:0 3px 5px rgba(0,0,0,.45); z-index:4; }
.hk-tack::after{ content:''; position:absolute; left:50%; top:14px; width:2px; height:7px; margin-left:-1px; background:linear-gradient(#b8b3aa,#7d786f); border-radius:1px; }
.hk-tack.hk-b{ --pc:#2f7de0 } .hk-tack.hk-y{ --pc:#e8b52e } .hk-tack.hk-g{ --pc:#43976a } .hk-tack.hk-p{ --pc:#a660c8 }

.hk-k{ font-family:'Bebas Neue',sans-serif; letter-spacing:.2em; font-size:.62rem; font-weight:700; color:var(--fg-3); margin-bottom:6px; display:flex; align-items:center; gap:6px; }
.hk-k .ti{ font-size:.95rem; color:var(--blue) }
.hk-jl{ font-family:var(--htk-font-head); font-weight:900; font-size:.86rem; color:var(--fg); margin-bottom:8px; display:flex; align-items:center; gap:6px; }
.hk-jl.hk-center{ justify-content:center }
.hk-jl .ti{ font-size:1.05rem; color:var(--blue) }
.hk-clock{ font-family:var(--htk-font-head); font-weight:900; font-size:2.6rem; line-height:.86; color:var(--fg); }
.hk-dt{ font-size:.76rem; font-weight:700; color:var(--fg-2); margin-top:5px }
.hk-big{ font-family:var(--htk-font-head); font-weight:900; font-size:2.3rem; line-height:.9; color:var(--blue) }
.hk-big small{ font-size:.8rem; color:var(--fg-2); font-weight:700 }
.hk-sub{ font-size:.74rem; color:var(--fg-2); font-weight:700; display:flex; align-items:center; gap:5px; margin-top:5px }
.hk-sub.hk-center{ justify-content:center }
.hk-sub .ti{ color:var(--orange) }
.hk-note{ font-size:.66rem; color:var(--fg-2); font-weight:700; margin-top:5px; line-height:1.6 }
.hk-quote{ font-family:var(--htk-font-head); font-weight:700; font-size:.94rem; line-height:1.75; color:var(--fg) }

.hk-row{ display:flex; align-items:center; gap:8px; width:100%; box-sizing:border-box; padding:7px 0; border:none; border-bottom:1px dashed var(--dash); background:none; font:inherit; font-size:.82rem; font-weight:700; color:var(--fg); text-align:left; }
.hk-row:last-child{ border-bottom:none }
button.hk-row{ cursor:pointer }
.hk-row .hk-dot{ width:9px; height:9px; border-radius:50%; flex-shrink:0 }
.hk-row .ti{ color:var(--orange) }
.hk-row-t{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis }
.hk-row b{ margin-left:auto; font-size:.7rem; color:var(--fg-2); font-weight:700; white-space:nowrap }

.hk-apps{ display:grid; grid-template-columns:repeat(4,1fr); gap:11px 4px }
.hk-appb{ display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer; background:none; border:none; font:inherit; padding:0 }
.hk-ai{ width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:1.2rem; color:#fff; box-shadow:0 3px 6px -2px rgba(0,0,0,.4) }
.hk-appb small{ font-size:.58rem; font-weight:700; color:var(--fg-2); text-align:center }

.hk-moods{ display:flex; justify-content:space-between }
.hk-moods > span{ display:flex; flex-direction:column; align-items:center; gap:3px }
.hk-moods .ti{ font-size:1.3rem; color:var(--blue) }
.hk-moods .ti.off{ color:var(--fg-2); opacity:.5 }
.hk-moods small{ font-size:.56rem; font-weight:700; color:var(--fg) }

.hk-ring{ position:relative; display:block; width:104px; height:104px; margin:2px auto 0 }
.hk-ring svg{ width:100%; height:100%; transform:rotate(-90deg) }
.hk-ring-mid{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center }
.hk-ring-mid img{ width:64px; height:64px }

.hk-hero{ display:block; width:120px; height:120px; margin:0 auto 4px; -webkit-user-drag:none }
.hk-inlinefig{ display:flex; align-items:center; gap:10px; margin-bottom:10px }
.hk-inlinefig img{ width:62px; height:62px; flex-shrink:0; -webkit-user-drag:none }
.hk-inlinefig .hk-note{ margin:0 }
.hk-mascot{ display:flex; align-items:center; gap:10px }
.hk-mascot img{ width:76px; height:76px; flex-shrink:0; object-fit:contain; -webkit-user-drag:none }
.hk-mascot-n{ font-family:var(--htk-font-head); font-weight:900; font-size:.9rem; color:var(--fg) }

.hk-rsvp-row{ padding:6px 0; border-bottom:1px dashed var(--dash) }
.hk-rsvp-row:last-child{ border-bottom:none }
.hk-rsvp-ttl{ font-size:.82rem; font-weight:700; color:var(--fg); display:flex; gap:6px; align-items:baseline; flex-wrap:wrap }
.hk-rsvp-ttl span{ font-size:.7rem; color:var(--fg-2) }
.hk-rsvp-btns{ display:flex; gap:6px; margin-top:6px; flex-wrap:wrap }
.hk-rsvp-btns button{ flex:1; min-height:38px; padding:7px 10px; border:1.5px solid var(--field-bd); background:var(--field); color:var(--fg); border-radius:9px; font:inherit; font-size:.74rem; font-weight:700; cursor:pointer }
.hk-rsvp-btns button.on{ background:var(--blue); color:var(--on-blue); border-color:var(--blue) }

/* --- 麻ひもに吊るした写真 --- */
.hk-twine{ position:relative; margin:2px 0 20px; padding-top:22px }
.hk-twine::before{ content:''; position:absolute; top:8px; left:-6px; right:-6px; height:3px; border-radius:2px; background:linear-gradient(#e8d4a8,#b99a63); box-shadow:0 2px 3px rgba(0,0,0,.3) }
.hk-hangrow{ display:flex; gap:16px; justify-content:center; flex-wrap:wrap }
.hk-hang{ position:relative; width:118px; transform-origin:50% -14px; transform:rotate(var(--r,0deg)); cursor:pointer; background:none; border:none; padding:0; font:inherit }
.hk-peg{ position:absolute; top:-16px; left:50%; margin-left:-6px; width:12px; height:22px; border-radius:3px; background:linear-gradient(#f3e0b4,#c7a469); box-shadow:0 2px 4px rgba(0,0,0,.4); z-index:4 }
.hk-photo{ position:relative; display:block; background:var(--paper2); padding:8px 8px 27px; box-shadow:0 13px 24px -10px rgba(40,24,8,.75) }
.hk-photo img{ display:block; width:100%; user-select:none; -webkit-user-drag:none }
.hk-cap{ position:absolute; bottom:8px; left:0; right:0; text-align:center; font-family:var(--htk-font-head); font-weight:700; font-size:.68rem; color:var(--fg-2) }

/* --- 新テーマ案内モーダル --- */
.hk-ovl{ background:rgba(40,26,12,.62); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); padding:18px; overflow-y:auto }
.hk-modal{ position:relative; width:min(460px,100%); box-sizing:border-box; background:var(--surface); color:var(--fg); border-radius:20px; padding:24px 22px; box-shadow:0 34px 70px -18px rgba(0,0,0,.7); text-align:center; font-family:var(--htk-font-body) }
.hk-modal .hk-tape{ width:96px; height:26px }
.hk-modal .hk-tl{ top:-13px; left:22px; transform:rotate(-9deg) }
.hk-modal .hk-tr{ top:-13px; right:22px; transform:rotate(8deg) }
.hk-mnew{ display:inline-flex; align-items:center; gap:5px; font-family:'Bebas Neue',sans-serif; letter-spacing:.18em; font-size:.68rem; background:var(--blue); color:var(--on-blue); padding:4px 11px; border-radius:999px }
.hk-mttl{ font-family:var(--htk-font-head); font-weight:900; font-size:1.35rem; color:var(--fg); margin:9px 0 4px }
.hk-mttl span{ color:var(--blue) }
.hk-mtxt{ font-size:.82rem; line-height:1.75; color:var(--fg-2); font-weight:500; margin-bottom:14px }
.hk-mbtns{ display:flex; gap:8px; margin-top:14px }
.hk-btnp{ flex:1; background:var(--blue); color:var(--on-blue); border:none; border-radius:9px; padding:12px 16px; font-family:var(--htk-font-head); font-weight:900; font-size:.84rem; cursor:pointer; min-height:44px; box-shadow:0 5px 12px -5px rgba(18,114,236,.7) }
.hk-btno{ background:var(--paper2); color:var(--fg); border:1.5px solid var(--field-bd); border-radius:9px; padding:12px 14px; font-family:inherit; font-weight:700; font-size:.82rem; cursor:pointer; min-height:44px }
.hk-mnote{ font-size:.66rem; color:var(--fg-2); margin-top:9px; font-weight:700; line-height:1.7 }

/* --- モーション --- */
@keyframes hkSway{0%,100%{transform:rotate(var(--r,0deg))}50%{transform:rotate(calc(var(--r,0deg) + .55deg))}}
@keyframes hkSwayH{0%,100%{transform:rotate(var(--r,0deg))}50%{transform:rotate(calc(var(--r,0deg) - 1.1deg))}}
@keyframes hkGust{0%{transform:rotate(var(--r,0deg))}14%{transform:rotate(calc(var(--r,0deg) + 2.4deg))}34%{transform:rotate(calc(var(--r,0deg) - 1.5deg))}54%{transform:rotate(calc(var(--r,0deg) + .8deg))}72%{transform:rotate(calc(var(--r,0deg) - .34deg))}88%{transform:rotate(calc(var(--r,0deg) + .12deg))}100%{transform:rotate(var(--r,0deg))}}
@keyframes hkGustH{0%{transform:rotate(var(--r,0deg))}13%{transform:rotate(calc(var(--r,0deg) + 6.4deg))}33%{transform:rotate(calc(var(--r,0deg) - 4.2deg))}52%{transform:rotate(calc(var(--r,0deg) + 2.4deg))}70%{transform:rotate(calc(var(--r,0deg) - 1.1deg))}86%{transform:rotate(calc(var(--r,0deg) + .4deg))}100%{transform:rotate(var(--r,0deg))}}
@keyframes hkDrift{0%{opacity:0;transform:translate(0,0) rotate(0)}12%{opacity:.85}100%{opacity:0;transform:translate(78vw,42px) rotate(220deg)}}
@keyframes hkSettle{from{opacity:0;transform:translateY(-14px) rotate(calc(var(--r,0deg) - 4deg))}to{opacity:1;transform:rotate(var(--r,0deg))}}
@keyframes hkPopIn{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}

.htk-root[data-theme="hatakyu"][data-anim="on"] .hk-pin,
.htk-root[data-theme="hatakyu"][data-anim="on"] .hk-panels > .htk-lg,
.htk-root[data-theme="hatakyu"][data-anim="on"] .hk-masonry > .htk-lg{ animation:hkSway 6.5s ease-in-out infinite; animation-delay:calc(var(--i,0)*.42s) }
.htk-root[data-theme="hatakyu"][data-anim="on"] .hk-hang{ animation:hkSwayH 4.6s ease-in-out infinite; animation-delay:calc(var(--i,0)*.35s) }
.htk-root[data-theme="hatakyu"][data-anim="on"][data-hk-boot="on"] .hk-pin,
.htk-root[data-theme="hatakyu"][data-anim="on"][data-hk-boot="on"] .hk-panels > .htk-lg,
.htk-root[data-theme="hatakyu"][data-anim="on"][data-hk-boot="on"] .hk-masonry > .htk-lg{ animation:hkSettle .55s cubic-bezier(.34,1.4,.64,1) both; animation-delay:calc(var(--i,0)*55ms) }
.htk-root[data-theme="hatakyu"][data-anim="on"][data-hk-wind="on"] .hk-pin,
.htk-root[data-theme="hatakyu"][data-anim="on"][data-hk-wind="on"] .hk-panels > .htk-lg,
.htk-root[data-theme="hatakyu"][data-anim="on"][data-hk-wind="on"] .hk-masonry > .htk-lg{ animation:hkGust 1.9s cubic-bezier(.33,.1,.24,.98) both; animation-delay:calc(var(--i,0)*45ms) }
.htk-root[data-theme="hatakyu"][data-anim="on"][data-hk-wind="on"] .hk-hang{ animation:hkGustH 2.1s cubic-bezier(.33,.1,.24,.98) both; animation-delay:calc(var(--i,0)*55ms) }
.htk-root[data-theme="hatakyu"][data-anim="on"][data-hk-wind="on"] .hk-leaf{ animation:hkDrift 1.9s ease-out both }
.htk-root[data-theme="hatakyu"][data-anim="on"] .hk-modal{ animation:hkPopIn .34s cubic-bezier(.34,1.4,.64,1) both }
/* アニメOFFでは傾きだけ残して完全に止める */
.htk-root[data-theme="hatakyu"][data-anim="off"] .hk-pin,
.htk-root[data-theme="hatakyu"][data-anim="off"] .hk-panels > .htk-lg,
.htk-root[data-theme="hatakyu"][data-anim="off"] .hk-masonry > .htk-lg,
.htk-root[data-theme="hatakyu"][data-anim="off"] .hk-hang{ animation:none !important; transform:rotate(var(--r,0deg)) !important }
.htk-root[data-theme="hatakyu"][data-anim="off"] .hk-leaf{ animation:none !important; opacity:0 !important }

/* ブート: 紙が画鋲で留まる */
.htk-boot-tack{ display:none; position:absolute; top:-14px; left:50%; margin-left:-9px; width:18px; height:18px; border-radius:50%; background:radial-gradient(circle at 32% 28%,#fff 8%,#e0483c 46%,#8c2118); box-shadow:0 3px 5px rgba(0,0,0,.45) }
.htk-root[data-theme="hatakyu"] .htk-boot-tack{ display:block }
.htk-root[data-theme="hatakyu"] .htk-boot-inner{ position:relative; background:var(--surface); padding:18px 30px 20px; transform:rotate(-1.4deg); box-shadow:0 14px 26px -10px rgba(40,24,8,.75) }
.htk-root[data-theme="hatakyu"] .htk-boot-logo{ color:var(--blue); text-shadow:none }
.htk-root[data-theme="hatakyu"][data-anim="on"] .htk-boot .htk-boot-inner{ animation:hkSettle .5s cubic-bezier(.34,1.4,.64,1) both }

@media (prefers-reduced-motion: reduce){
  .hk-pin,.hk-hang,.htk-root[data-theme="hatakyu"] .hk-masonry > .htk-lg,.htk-root[data-theme="hatakyu"] .hk-panels > .htk-lg{ animation:none !important; transform:rotate(var(--r,0deg)) !important }
  .hk-leaf{ animation:none !important; opacity:0 !important }
  .hk-modal{ animation:none !important }
}

@media(max-width:900px){ .hk-masonry{ columns:2 } .hk-panels{ grid-template-columns:1fr } }
@media(max-width:640px){
  .htk-root[data-theme="hatakyu"] .htk-shell{ padding:23px 21px 30px; border-radius:16px }
  .htk-root[data-theme="hatakyu"] .htk-shell::before{ inset:9px; border-radius:9px }
  .htk-root[data-theme="hatakyu"] .htk-shell::after{ inset:5px; border-radius:11px }
  .hk-leaves{ inset:9px; border-radius:9px }
  .hk-masonry{ columns:1; column-gap:0 }
  .hk-panels{ grid-template-columns:1fr; gap:20px 0 }
  .hk-bhead{ margin-bottom:12px }
  .hk-titlecard{ padding:9px 15px 10px }
  .hk-lg-name{ font-size:1.6rem }
  .hk-hbtn{ padding:9px 11px; font-size:.72rem }
  .hk-hbtn span{ display:none }
  .hk-hangrow{ flex-wrap:wrap; justify-content:center; gap:12px; padding:0 2px 6px }
  .hk-hang{ width:104px; flex:0 0 auto }
  .hk-clock{ font-size:2.2rem }
  .hk-mbtns{ flex-direction:column }
}

</style>

<!-- グローバルスタイル: Hatask起動時にMisskeyの標準ナビバーを非表示にする -->
<style lang="scss">
/* 旗鯖fork: Hataskタイトル用フォント (about-misskeyと同じ Righteous)。
   グローバルスコープに置いて、Hataskページ内のロゴ表記で使えるようにする。 */
@font-face {
  font-family: 'Righteous';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/client-assets/Righteous-Regular.woff2') format('woff2');
}

/* 旗鯖fork(v2 リデザイン): テーマ用フォント。すべて自己ホスト(SIL OFL・LICENSES/ に原文同梱)。
   日本語は fontsource の japanese サブセット(unicode-range 無し=catch-all)、ラテンは latin
   サブセットを unicode-range で上書きする。font-display:swap で FOIT を避ける。 */
$htk-latin: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";

/* Zen Kaku Gothic New — 本文/共通ベース (400/500/700) */
@font-face { font-family: 'Zen Kaku Gothic New'; font-style: normal; font-weight: 400; font-display: swap; src: url('/client-assets/fonts/zkgn-jp-400.woff2') format('woff2'); }
@font-face { font-family: 'Zen Kaku Gothic New'; font-style: normal; font-weight: 400; font-display: swap; src: url('/client-assets/fonts/zkgn-latin-400.woff2') format('woff2'); unicode-range: #{$htk-latin}; }
@font-face { font-family: 'Zen Kaku Gothic New'; font-style: normal; font-weight: 500; font-display: swap; src: url('/client-assets/fonts/zkgn-jp-500.woff2') format('woff2'); }
@font-face { font-family: 'Zen Kaku Gothic New'; font-style: normal; font-weight: 500; font-display: swap; src: url('/client-assets/fonts/zkgn-latin-500.woff2') format('woff2'); unicode-range: #{$htk-latin}; }
@font-face { font-family: 'Zen Kaku Gothic New'; font-style: normal; font-weight: 700; font-display: swap; src: url('/client-assets/fonts/zkgn-jp-700.woff2') format('woff2'); }
@font-face { font-family: 'Zen Kaku Gothic New'; font-style: normal; font-weight: 700; font-display: swap; src: url('/client-assets/fonts/zkgn-latin-700.woff2') format('woff2'); unicode-range: #{$htk-latin}; }

/* Shippori Mincho B1 — 季 見出し/数字 (700/800) */
@font-face { font-family: 'Shippori Mincho B1'; font-style: normal; font-weight: 700; font-display: swap; src: url('/client-assets/fonts/shippori-jp-700.woff2') format('woff2'); }
@font-face { font-family: 'Shippori Mincho B1'; font-style: normal; font-weight: 700; font-display: swap; src: url('/client-assets/fonts/shippori-latin-700.woff2') format('woff2'); unicode-range: #{$htk-latin}; }
@font-face { font-family: 'Shippori Mincho B1'; font-style: normal; font-weight: 800; font-display: swap; src: url('/client-assets/fonts/shippori-jp-800.woff2') format('woff2'); }
@font-face { font-family: 'Shippori Mincho B1'; font-style: normal; font-weight: 800; font-display: swap; src: url('/client-assets/fonts/shippori-latin-800.woff2') format('woff2'); unicode-range: #{$htk-latin}; }

/* Zen Maru Gothic — 花信 見出し/数字 (700/900) */
@font-face { font-family: 'Zen Maru Gothic'; font-style: normal; font-weight: 700; font-display: swap; src: url('/client-assets/fonts/zmg-jp-700.woff2') format('woff2'); }
@font-face { font-family: 'Zen Maru Gothic'; font-style: normal; font-weight: 700; font-display: swap; src: url('/client-assets/fonts/zmg-latin-700.woff2') format('woff2'); unicode-range: #{$htk-latin}; }
@font-face { font-family: 'Zen Maru Gothic'; font-style: normal; font-weight: 900; font-display: swap; src: url('/client-assets/fonts/zmg-jp-900.woff2') format('woff2'); }
@font-face { font-family: 'Zen Maru Gothic'; font-style: normal; font-weight: 900; font-display: swap; src: url('/client-assets/fonts/zmg-latin-900.woff2') format('woff2'); unicode-range: #{$htk-latin}; }

/* Zen Kaku Gothic Antique — 刷 見出し/本文 (700/900) */
@font-face { font-family: 'Zen Kaku Gothic Antique'; font-style: normal; font-weight: 700; font-display: swap; src: url('/client-assets/fonts/zkga-jp-700.woff2') format('woff2'); }
@font-face { font-family: 'Zen Kaku Gothic Antique'; font-style: normal; font-weight: 700; font-display: swap; src: url('/client-assets/fonts/zkga-latin-700.woff2') format('woff2'); unicode-range: #{$htk-latin}; }
@font-face { font-family: 'Zen Kaku Gothic Antique'; font-style: normal; font-weight: 900; font-display: swap; src: url('/client-assets/fonts/zkga-jp-900.woff2') format('woff2'); }
@font-face { font-family: 'Zen Kaku Gothic Antique'; font-style: normal; font-weight: 900; font-display: swap; src: url('/client-assets/fonts/zkga-latin-900.woff2') format('woff2'); unicode-range: #{$htk-latin}; }

/* Bebas Neue — ラテンのラベル/フォリオ装飾のみ (400) */
@font-face { font-family: 'Bebas Neue'; font-style: normal; font-weight: 400; font-display: swap; src: url('/client-assets/fonts/bebas-neue-latin-400.woff2') format('woff2'); }

/* JS側で data-htask-hidden を付与した要素を確実に非表示 */
[data-htask-hidden] {
  display: none !important;
}
/* 旗鯖fork(v2): モバイル下部固定ナビは廃止。上部ナビ(.htk-nav-top)に一本化。 */

/* 旗鯖fork(v2): Hatask はページ自前のヘッダー(検索/ロゴ/設定)を持つため、アプリ側の
   ページヘッダー(灰色バー = MkPageHeader, [swipable][popup])を Hatask 表示中のみ隠す。
   body[data-hatask-active] は hatask.vue が表示中のみ付与し、離脱時 cleanupHataskState で除去。 */
body[data-hatask-active="1"] [swipable][popup="false"] { display: none !important; }

/* 旗鯖fork(v2): 旧背景オーブ/波は撤去済み。reduced-motion では装飾アニメも停止。 */
@media (prefers-reduced-motion: reduce){
  .htk-fl-emo{animation:none !important}
  .htk-tut-particles{display:none !important}
}

</style>
