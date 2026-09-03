<template>
<PageWithHeader :hideHeader="inPageWindow">
<svg width="0" height="0" style="position:absolute"><defs><filter id="htk-gfx" x="0%" y="0%" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.025 0.025" numOctaves="2" seed="92" result="n"/><feGaussianBlur in="n" stdDeviation="2" result="bl"/><feDisplacementMap in="SourceGraphic" in2="bl" scale="65" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>

<div class="htk-root" :data-mode="themeMode" :data-theme="settings.theme || 'kisetsu'" :data-window="inPageWindow?'true':'false'" :data-anim="(settings.animations===false)?'off':'on'" :data-hk-wind="hkWind?'on':'off'" :data-hk-boot="showBoot?'on':'off'" ref="rootEl">

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
<div v-if="activeTab==='cal'" class="htk-tabpage htk-calendar-page" :class="[isHatakyu?'hk-panels':'htk-panels',tabDir==='fwd'?'htk-tab-fwd':'htk-tab-back']">
  <!-- 旗鯖fork(ハタキュ): つぎの予定までを写真付きの紙で貼る。⚠️予定が無いときは紙ごと出さない。 -->
  <div v-if="isHatakyu&&hkNextEvent" class="hk-pin" style="--i:0;--r:-1.1deg"><span class="hk-tack hk-b"></span>
    <div class="hk-card hk-blue hk-center">
      <img class="hk-hero" :src="hkAsset('checkingTime')" alt="" draggable="false">
      <div class="hk-jl hk-center"><i class="ti ti-clock-hour-4"></i>{{copy.hkUntilNextEvent}}</div>
      <div class="hk-big">{{hkNextEventDays}}<small>&nbsp;{{copy.hkDaysUnit}}</small></div>
      <div class="hk-note">{{evMD(hkNextEvent.date)}} {{eventTimeLabel(hkNextEvent)}}「{{hkNextEvent.title}}」</div>
    </div>
  </div>
  <div class="htk-planner-shell htk-anim">
    <div v-if="plannerStorageState==='loading'||plannerStorageState==='saving'||plannerStorageState==='blocked'||plannerStorageState==='conflict'" class="htk-planner-status" :data-state="plannerStorageState" role="status" aria-live="polite">
      <i :class="plannerStorageState==='loading'||plannerStorageState==='saving'?'ti ti-loader-2':'ti ti-shield-exclamation'" aria-hidden="true"></i>
      <span>{{plannerStorageState==='loading'?plannerCopy.loading:plannerStorageState==='saving'?plannerCopy.saving:plannerStorageDetail||plannerCopy.readOnly}}</span>
      <button v-if="plannerReadOnly" type="button" class="htk-btn htk-xs" @click="retryPlannerStorage">{{plannerCopy.retry}}</button>
    </div>
    <HataskQuickCapture
      ref="eventCaptureRef"
      mode="event"
      :modelValue="newEvent.title"
      :label="editingEvent?copy.editEvent:copy.newEvent"
      :placeholder="editingEvent?copy.editEvent:copy.eventTitlePlaceholder"
      :submitLabel="editingEvent?copy.update:copy.add"
      :chips="eventCaptureChips"
      :tools="eventCaptureTools"
      :templateLabel="plannerCopy.templateLibrary"
      :templateDisabled="!plannerTemplatesLoaded"
      :detailOpen="showEventDetails||showEventTemplates||eventCaptureEditor!=null"
      :disabled="plannerReadOnly"
	      :state="eventCaptureState"
	      :chipLabel="plannerCopy.captureChips"
	      :toolLabel="plannerCopy.captureTools"
	      :removeChipLabel="label=>plannerCopyx.removeCaptureChip({label})"
	      :hint="plannerCopy.eventCaptureHint"
      @update:modelValue="updateEventCapture"
      @submit="submitEventCapture"
      @tool="handleEventCaptureTool"
      @template="openPlannerCaptureTemplates('event', $event)"
	      @chip="handleEventCaptureChip"
      @remove-chip="removeEventCaptureChip"
	      @collapse="showEventDetails=false;showEventTemplates=false;eventCaptureEditor=null"
    />
	    <Transition name="htk-capture-detail">
	      <fieldset v-if="eventCaptureEditor==='date'" class="htk-capture-detail htk-pill-editor" :disabled="plannerReadOnly">
	        <legend class="htk-sr-only">{{copy.dateAndTime}}</legend>
	        <header class="htk-pill-editor-head"><strong><i class="ti ti-calendar-event" aria-hidden="true"></i>{{copy.dateAndTime}}</strong><button type="button" class="htk-icon-btn" :aria-label="copy.cancel" @click="eventCaptureEditor=null"><i class="ti ti-x" aria-hidden="true"></i></button></header>
	        <div class="htk-capture-grid">
	          <label><span>{{plannerCopy.eventStartDate}}</span><input :value="newEvent.date" class="htk-inp" type="date" @change="setEventStartDate(($event.target as HTMLInputElement).value)"></label>
	          <label><span>{{plannerCopy.eventEndDate}}</span><input :value="newEvent.dateEnd" :min="newEvent.date" class="htk-inp" type="date" @change="setEventEndDate(($event.target as HTMLInputElement).value)"></label>
	        </div>
	      </fieldset>
	      <fieldset v-else-if="eventCaptureEditor==='time'" class="htk-capture-detail htk-pill-editor" :disabled="plannerReadOnly">
	        <legend class="htk-sr-only">{{copy.time}}</legend>
	        <header class="htk-pill-editor-head"><strong><i class="ti ti-clock" aria-hidden="true"></i>{{copy.time}}</strong><button type="button" class="htk-icon-btn" :aria-label="copy.cancel" @click="eventCaptureEditor=null"><i class="ti ti-x" aria-hidden="true"></i></button></header>
	        <div class="htk-tg-row"><span id="hatask-capture-all-day-label" class="htk-tg-lab">{{copy.allDayFull}}</span><button type="button" :class="['htk-tg-sw',newEvent.allDay&&'on']" role="switch" aria-labelledby="hatask-capture-all-day-label" :aria-checked="newEvent.allDay" @click="newEvent.allDay=!newEvent.allDay"></button></div>
	        <div v-if="!newEvent.allDay" class="htk-capture-grid htk-pill-time-grid">
	          <label><span>{{plannerCopy.eventStartTime}}</span><input :value="newEvent.timeStart" class="htk-inp" type="time" @change="setEventStartTime(($event.target as HTMLInputElement).value)"></label>
	          <label><span>{{plannerCopy.eventEndTime}}</span><input :value="newEvent.timeEnd" class="htk-inp" type="time" @change="setEventEndTime(($event.target as HTMLInputElement).value)"></label>
	        </div>
	      </fieldset>
	    </Transition>
    <Transition name="htk-capture-detail">
      <div v-if="showEventTemplates" class="htk-capture-detail">
        <HataskTemplateLibrary
          :templates="plannerTemplates"
          kind="event"
          :showKindFilter="false"
          :labels="plannerTemplateLabels"
          :readOnly="plannerReadOnly"
          @use="usePlannerTemplate"
          @duplicate="duplicatePlannerTemplate"
          @archive="archivePlannerTemplate"
          @move="movePlannerTemplate"
        />
      </div>
    </Transition>
    <HataskCalendarPlanner
      :theme="plannerTheme"
      :view="plannerCalendarView"
      :title="plannerCalendarTitle"
      :weekdays="plannerWeekdays"
      :days="plannerCalendarDays"
      :filters="plannerCalendarFilters"
      :labels="plannerCalendarLabels"
      :loading="plannerStorageState==='loading'"
      :readOnly="plannerReadOnly"
      @update:view="plannerCalendarView=$event"
      @navigate="navigatePlannerCalendar"
      @select-date="selectPlannerDate"
      @toggle-filter="togglePlannerCalendarFilter"
      @activate-event="activatePlannerEvent"
      @edit-event="editPlannerEvent"
      @move-request="handleCalendarMoveRequest"
      @show-more="showPlannerDay"
      @drop-event="handleCalendarEventDrop"
      @trash-event="handleCalendarEventTrash"
    />
    <HataskEventMoveDialog
      :isOpen="pendingCalendarAction!=null"
	  :theme="plannerTheme"
      :mode="pendingCalendarAction?.mode||'reschedule'"
      :eventTitle="pendingCalendarAction?.event.title||''"
      :sourceLabel="pendingCalendarActionSourceLabel"
      :targetLabel="pendingCalendarActionTargetLabel"
      :labels="calendarMoveDialogLabels"
      @choose="resolveCalendarAction"
    />
  </div>
  <div v-if="false" class="htk-lg htk-anim"><div class="htk-gc">
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

  <template v-if="viewingEvent">
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

					<Teleport to="body">
						<div
							v-if="showEventDetails"
							class="htk-modal-ov"
							:data-theme="settings.theme||'kisetsu'"
							:data-mode="themeMode"
							@click.self="closeEventDetailsModal"
							@keydown.esc.stop.prevent="closeEventDetailsModal"
						>
							<div
								class="htk-lg htk-modal-c htk-event-editor htk-event-editor-modal"
								role="dialog"
								aria-modal="true"
								aria-labelledby="hatask-event-details-title"
							>
								<div class="htk-gc">
									<header class="htk-event-editor-head">
										<h3 id="hatask-event-details-title" class="htk-sec-title">{{ plannerCopy.moreDetails }}</h3>
										<button ref="eventDetailsCloseRef" type="button" class="htk-icon-btn" :aria-label="copy.close" :title="copy.close" @click="closeEventDetailsModal"><i class="ti ti-x" aria-hidden="true"></i></button>
									</header>
	    <fieldset :disabled="plannerReadOnly" class="htk-editor-fieldset">
	    <div class="htk-fg"><span id="hatask-event-emoji-label" class="htk-fl">{{copy.emoji}}</span><div class="htk-emp-row" role="group" aria-labelledby="hatask-event-emoji-label"><button v-for="e in eventEmojis" :key="e" type="button" :class="['htk-emp-i',newEvent.emoji===e&&'on']" :aria-label="`${plannerCopy.chooseEmoji}: ${e}`" :aria-pressed="newEvent.emoji===e" @click="newEvent.emoji=e"><HataskEmoji :emoji="e"/></button></div></div>
	    <div class="htk-fg"><span class="htk-fl">{{copy.dateAndTime}}</span>
	      <div class="htk-tg-row" style="margin-bottom:8px"><span id="hatask-event-all-day-label" class="htk-tg-lab">{{copy.allDayFull}}</span><button type="button" :class="['htk-tg-sw',newEvent.allDay&&'on']" role="switch" aria-labelledby="hatask-event-all-day-label" :aria-checked="newEvent.allDay" @click="newEvent.allDay=!newEvent.allDay"></button></div>
	      <div class="htk-fr htk-date-time-row"><span class="htk-field-sub-label">{{plannerCopy.eventStart}}</span><label class="htk-sr-only" for="hatask-event-start-date">{{plannerCopy.eventStartDate}}</label><input id="hatask-event-start-date" v-model="newEvent.date" class="htk-inp" type="date"><label v-if="!newEvent.allDay" class="htk-sr-only" for="hatask-event-start-time">{{plannerCopy.eventStartTime}}</label><input v-if="!newEvent.allDay" id="hatask-event-start-time" v-model="newEvent.timeStart" class="htk-inp" type="time"></div>
	      <div class="htk-fr htk-date-time-row" style="margin-top:5px"><span class="htk-field-sub-label">{{plannerCopy.eventEnd}}</span><label class="htk-sr-only" for="hatask-event-end-date">{{plannerCopy.eventEndDate}}</label><input id="hatask-event-end-date" v-model="newEvent.dateEnd" class="htk-inp" type="date"><label v-if="!newEvent.allDay" class="htk-sr-only" for="hatask-event-end-time">{{plannerCopy.eventEndTime}}</label><input v-if="!newEvent.allDay" id="hatask-event-end-time" v-model="newEvent.timeEnd" class="htk-inp" type="time"></div>
	    </div>
	    <div class="htk-fg"><span id="hatask-event-color-label" class="htk-fl">{{copy.color}}</span><div class="htk-clr-row" role="group" aria-labelledby="hatask-event-color-label"><button v-for="c in eventColors" :key="c" type="button" :class="['htk-clr-o',newEvent.color===c&&'on']" :style="{background:c}" :aria-label="`${plannerCopy.chooseColor}: ${c}`" :aria-pressed="newEvent.color===c" @click="newEvent.color=c"></button></div></div>
    <div class="htk-fg"><span class="htk-fl">{{copy.visibility}}</span><div class="htk-vis-row" role="group" :aria-label="copy.visibility"><button type="button" :class="['htk-vis-o',newEvent.visibility==='public'&&'on']" :aria-pressed="newEvent.visibility==='public'" @click="newEvent.visibility='public';newEvent.recurrence.frequency='none'"><span class="htk-vi"><i class="ti ti-world"></i></span>{{copy.public}}</button><button type="button" :class="['htk-vis-o',newEvent.visibility==='private'&&'on']" :aria-pressed="newEvent.visibility==='private'" @click="newEvent.visibility='private';newEvent.rsvp=false"><span class="htk-vi"><i class="ti ti-lock"></i></span>{{copy.private}}</button></div></div>
    <div class="htk-fg"><label class="htk-fl" for="hatask-event-recurrence">{{plannerCopy.recurrence}}</label><select id="hatask-event-recurrence" v-model="newEvent.recurrence.frequency" class="htk-inp" :disabled="newEvent.visibility==='public'"><option value="none">{{plannerCopy.recurrenceNone}}</option><option value="daily">{{plannerCopy.recurrenceDaily}}</option><option value="weekly">{{plannerCopy.recurrenceWeekly}}</option><option value="monthly">{{plannerCopy.recurrenceMonthly}}</option><option value="yearly">{{plannerCopy.recurrenceYearly}}</option></select></div>
	    <div class="htk-fg"><span class="htk-fl">{{copy.options}}</span><div class="htk-tg-row"><span id="hatask-event-rsvp-label" class="htk-tg-lab">{{copy.rsvp}}</span><button type="button" :class="['htk-tg-sw',newEvent.rsvp&&'on']" role="switch" aria-labelledby="hatask-event-rsvp-label" :aria-checked="newEvent.rsvp" :disabled="newEvent.visibility==='private'" :style="newEvent.visibility==='private'?'opacity:.35;cursor:not-allowed':''" @click="newEvent.visibility!=='private'&&(newEvent.rsvp=!newEvent.rsvp)"></button><span v-if="newEvent.visibility==='private'" style="font-size:.7rem;color:var(--text-3);margin-left:6px">{{copy.rsvpUnavailablePrivate}}</span></div>
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
	    </div><div class="htk-tg-row"><span id="hatask-event-notify-label" class="htk-tg-lab">{{copy.notifications}}</span><button type="button" :class="['htk-tg-sw',newEvent.notify&&'on']" role="switch" aria-labelledby="hatask-event-notify-label" :aria-checked="newEvent.notify" @click="newEvent.notify=!newEvent.notify"></button></div></div>
	    <div v-if="newEvent.notify" class="htk-fg"><span id="hatask-event-notify-timing-label" class="htk-fl">{{copy.notificationTiming}}</span><div class="htk-nt-chips" role="group" aria-labelledby="hatask-event-notify-timing-label"><button v-for="nt in notifyTimings" :key="nt" type="button" :class="['htk-nt-chip',newEvent.notifyTimings.includes(nt)&&'on']" :aria-label="plannerCopyx.notificationTimingLabel({timing:notifyTimingLabel(nt)})" :aria-pressed="newEvent.notifyTimings.includes(nt)" @click="toggleNotifyTiming(nt)">{{notifyTimingLabel(nt)}}</button></div></div>
	    </fieldset>
									<div class="htk-editor-icon-actions"><button type="button" class="htk-icon-submit" :disabled="plannerReadOnly||!newEvent.title.trim()" :aria-label="editingEvent?copy.update:copy.save" :title="editingEvent?copy.update:copy.save" @click="submitEventCapture"><i :class="editingEvent?'ti ti-check':'ti ti-plus'" aria-hidden="true"></i></button><button v-if="editingEvent" type="button" class="htk-icon-btn" :aria-label="copy.cancel" :title="copy.cancel" @click="resetEventEditor"><i class="ti ti-x" aria-hidden="true"></i></button><button v-if="editingEvent" type="button" class="htk-icon-btn htk-danger" :disabled="plannerReadOnly" :aria-label="copy.delete" :title="copy.delete" @click="deleteEventById(editingEvent.id)"><i class="ti ti-trash" aria-hidden="true"></i></button></div>
								</div>
							</div>
						</div>
					</Teleport>
</div>

<!-- ========== TODO ========== -->
				<div v-if="activeTab==='todo'" class="htk-tabpage htk-todo-page" :class="tabDir==='fwd'?'htk-tab-fwd':'htk-tab-back'">
	<div class="htk-planner-shell htk-anim">
	  <div v-if="plannerStorageState==='loading'||plannerStorageState==='saving'||plannerStorageState==='blocked'||plannerStorageState==='conflict'" class="htk-planner-status" :data-state="plannerStorageState" role="status" aria-live="polite"><i :class="plannerStorageState==='loading'||plannerStorageState==='saving'?'ti ti-loader-2':'ti ti-shield-exclamation'" aria-hidden="true"></i><span>{{plannerStorageState==='loading'?plannerCopy.loading:plannerStorageState==='saving'?plannerCopy.saving:plannerStorageDetail||plannerCopy.readOnly}}</span><button v-if="plannerReadOnly" type="button" class="htk-btn htk-xs" @click="retryPlannerStorage">{{plannerCopy.retry}}</button></div>
						<div class="htk-todo-capture-row">
							<HataskQuickCapture
								ref="todoCaptureRef"
								mode="todo"
								:modelValue="newTodo"
								:label="editingTodoId?copy.editTask:copy.newTaskPlaceholder"
								:placeholder="editingTodoId?copy.editTaskPlaceholder:copy.newTaskPlaceholder"
								:submitLabel="editingTodoId?copy.update:copy.add"
								:chips="todoCaptureChips"
								:tools="todoCaptureTools"
								:templateLabel="plannerCopy.templateLibrary"
								:templateDisabled="!plannerTemplatesLoaded"
								:detailOpen="showTodoExtra||todoCaptureEditor!=null"
								:disabled="plannerReadOnly"
								:state="todoCaptureState"
								:chipLabel="plannerCopy.captureChips"
								:toolLabel="plannerCopy.captureTools"
								:removeChipLabel="label=>plannerCopyx.removeCaptureChip({label})"
								:hint="plannerCopy.todoCaptureHint"
								@update:modelValue="updateTodoCapture"
								@submit="submitTodoCapture"
								@tool="handleTodoCaptureTool"
								@template="openPlannerCaptureTemplates('todo', $event)"
								@chip="handleTodoCaptureChip"
								@remove-chip="removeTodoCaptureChip"
								@collapse="showTodoExtra=false;todoCaptureEditor=null"
							/>
							<div v-if="isHatakyu" class="hk-inlinefig htk-capture-companion htk-capture-companion-desktop"><img :src="hkAsset('reviewingDocuments')" alt="" draggable="false"><div class="hk-note">{{ copyx.hkRemainingToday({count: pendingCount.toString()}) }}</div></div>
						</div>
	  <Transition name="htk-capture-detail">
	    <fieldset v-if="todoCaptureEditor==='schedule'" class="htk-capture-detail htk-pill-editor" :disabled="plannerReadOnly">
	      <legend class="htk-sr-only">{{copy.dateAndTime}}</legend>
	      <header class="htk-pill-editor-head"><strong><i class="ti ti-calendar-time" aria-hidden="true"></i>{{copy.dateAndTime}}</strong><button type="button" class="htk-icon-btn" :aria-label="copy.cancel" @click="todoCaptureEditor=null"><i class="ti ti-x" aria-hidden="true"></i></button></header>
	      <div class="htk-capture-grid">
	        <label><span>{{copy.dueDate}}</span><input v-model="newTodoDue" class="htk-inp" type="date"></label>
	        <label><span>{{copy.time}}</span><input v-model="newTodoTime" class="htk-inp" type="time"></label>
	      </div>
	      <button v-if="newTodoDue||newTodoTime" type="button" class="htk-pill-clear" @click="newTodoDue='';newTodoTime=''">{{copy.none}}</button>
	    </fieldset>
	  </Transition>
	  <Transition name="htk-capture-detail">
	    <fieldset v-if="showTodoExtra" id="hatask-todo-details" :disabled="plannerReadOnly" class="htk-capture-detail">
	      <div class="htk-capture-grid">
	        <label><span>{{copy.dueDate}}</span><input v-model="newTodoDue" class="htk-inp" type="date"></label>
	        <label><span>{{copy.time}}</span><input v-model="newTodoTime" class="htk-inp" type="time"></label>
	        <label><span>{{copy.folder}}</span><select v-model="newTodoFolder" class="htk-inp"><option value="">{{copy.noFolder}}</option><option v-for="fo in activeFolders" :key="fo.id" :value="fo.id">{{fo.name}}</option></select></label>
	        <label><span>{{plannerCopy.priority}}</span><select v-model="newTodoPriority" class="htk-inp"><option value="none">{{plannerCopy.priorityNone}}</option><option value="low">{{plannerCopy.priorityLow}}</option><option value="medium">{{plannerCopy.priorityMedium}}</option><option value="high">{{plannerCopy.priorityHigh}}</option></select></label>
	        <label><span>{{plannerCopy.recurrence}}</span><select v-model="newTodoRecurrence" class="htk-inp"><option value="none">{{plannerCopy.recurrenceNone}}</option><option value="daily">{{plannerCopy.recurrenceDaily}}</option><option value="weekly">{{plannerCopy.recurrenceWeekly}}</option><option value="monthly">{{plannerCopy.recurrenceMonthly}}</option><option value="yearly">{{plannerCopy.recurrenceYearly}}</option></select></label>
	        <label class="htk-capture-wide"><span>{{copy.comment}}</span><input v-model="newTodoComment" class="htk-inp" :placeholder="copy.memoPlaceholder"></label>
	      </div>
	      <div class="htk-todo-subtask-editor htk-capture-wide"><label>{{plannerCopy.subtasks}}</label><div v-for="subtask in newTodoSubtasks" :key="subtask.id" class="htk-todo-subtask-row"><input v-model="subtask.done" type="checkbox" :aria-label="plannerCopyx.subtaskLabel({title:subtask.text||plannerCopy.subtasks})"><input v-model="subtask.text" class="htk-inp"><button type="button" class="htk-btn htk-xs" :aria-label="plannerCopyx.deleteSubtaskLabel({title:subtask.text||plannerCopy.subtasks})" @click="removeTodoSubtask(subtask.id)"><i class="ti ti-x" aria-hidden="true"></i></button></div><div class="htk-todo-subtask-row"><input v-model="newSubtaskText" class="htk-inp" :placeholder="plannerCopy.subtasks" @keypress.enter.prevent="addTodoSubtask"><button type="button" class="htk-btn htk-xs" @click="addTodoSubtask"><i class="ti ti-plus" aria-hidden="true"></i></button></div></div>
	      <button v-if="editingTodoId" type="button" class="htk-btn htk-sm" @click="cancelEditTodo">{{copy.cancelEdit}}</button>
	    </fieldset>
	  </Transition>
	  <Transition name="htk-capture-detail">
	    <section v-if="showFolderMgr" class="htk-capture-detail htk-folder-manager" :aria-label="copy.manageFolders">
	      <header class="htk-folder-manager-head">
	        <div><strong>{{copy.manageFolders}}</strong></div>
	        <div class="htk-folder-manager-head-actions">
	          <button type="button" class="htk-icon-btn" :aria-label="plannerCopy.addFolder" :aria-expanded="showFolderCreate" @click="showFolderCreate=!showFolderCreate"><i :class="showFolderCreate?'ti ti-minus':'ti ti-plus'" aria-hidden="true"></i></button>
	          <button type="button" class="htk-icon-btn" :aria-label="copy.cancel" @click="closeFolderManager"><i class="ti ti-x" aria-hidden="true"></i></button>
	        </div>
	      </header>
	      <div class="htk-folder-manager-list">
	        <article v-for="(fo,i) in activeFolders" :key="fo.id" class="htk-fm-row" :style="{'--folder-color':fo.color||'var(--accent)'}">
	          <span class="htk-folder-colored-icon" aria-hidden="true"><i class="ti ti-folder-filled"></i></span>
	          <div class="htk-fm-copy"><strong>{{fo.name}}</strong><span>{{folderCount(fo.id)}}</span></div>
	          <button type="button" class="htk-folder-row-more" :aria-label="plannerCopyx.manageFolderLabel({name:fo.name})" @click="openFolderActions(fo.id,i)"><i class="ti ti-dots" aria-hidden="true"></i></button>
	        </article>
	        <div v-if="activeFolders.length===0" class="htk-folder-manager-empty"><i class="ti ti-folder-off" aria-hidden="true"></i><span>{{plannerCopy.noFolders}}</span></div>
	      </div>
	      <Transition name="htk-folder-create">
	        <div v-if="showFolderCreate" class="htk-folder-create-panel">
	          <label><span>{{copy.folder}}</span><input v-model="newFolderName" class="htk-inp" :placeholder="copy.folderNamePlaceholder" @keypress.enter.prevent="addFolder"></label>
	          <div class="htk-folder-clr-row" role="group" :aria-label="copy.color"><button v-for="c in folderColors" :key="c.value" type="button" :class="['htk-folder-clr-o',newFolderColor===c.value&&'on']" :style="{background:c.value}" :aria-label="c.label" :aria-pressed="newFolderColor===c.value" @click="newFolderColor=c.value"></button></div>
	          <button type="button" class="htk-icon-submit htk-folder-create-submit" :disabled="plannerReadOnly||!newFolderName.trim()" :aria-label="plannerCopy.addFolder" @click="addFolder"><i class="ti ti-plus" aria-hidden="true"></i></button>
	        </div>
	      </Transition>
	    </section>
	  </Transition>
						<div v-if="isHatakyu" class="hk-inlinefig htk-capture-companion htk-capture-companion-mobile"><img :src="hkAsset('reviewingDocuments')" alt="" draggable="false"><div class="hk-note">{{ copyx.hkRemainingToday({count: pendingCount.toString()}) }}</div></div>
	  <div v-if="completedUndoItems.length" class="htk-planner-undo htk-complete-undo" role="status"><i class="ti ti-circle-check-filled" aria-hidden="true"></i><span>{{plannerCopyx.completedCount({count:completedUndoItems.length.toString()})}}</span><button type="button" class="htk-btn htk-xs" :disabled="plannerReadOnly" @click="undoCompletedTodos">{{plannerCopy.restore}}</button></div>
		  <div v-if="lastArchivedTodoId" class="htk-planner-undo" role="status"><span>{{plannerCopy.archivedNotice}}</span><button type="button" class="htk-btn htk-xs" :disabled="plannerReadOnly" @click="restoreTodo(lastArchivedTodoId)">{{plannerCopy.restore}}</button></div>
	  <HataskTodoPlanner
	    :theme="plannerTheme"
	    :view="plannerTodoView"
	    :items="plannerTodoItems"
	    :labels="plannerTodoLabels"
	    :filters="plannerTodoFilters"
	    :searchQuery="plannerTodoSearch"
	    :viewCounts="plannerTodoViewCounts"
	    :mobileTabOrder="plannerTodoMobileTabOrder"
	    :sort="currentTodoSort"
	    :completionIds="todoCompletionIds"
	    :loading="plannerStorageState==='loading'"
	    :readOnly="plannerReadOnly"
	    @update:view="plannerTodoView=$event"
	    @update:searchQuery="plannerTodoSearch=$event"
	    @update:sort="setPlannerTodoSort"
	    @update:mobileTabOrder="setPlannerTodoMobileTabOrder"
	    @toggle-filter="togglePlannerTodoFilter"
	    @complete="completePlannerTodo"
	    @move-up="movePlannerTodo($event,-1)"
	    @move-down="movePlannerTodo($event,1)"
	    @edit="editPlannerTodo"
	    @archive="archivePlannerTodo"
	    @restore="restorePlannerTodo"
	    @delete="deletePlannerTodo"
	    @add-folder="openFolderManager"
	    @manage-folder="managePlannerFolder"
	    @drop-target="handleTodoDropTarget"
	    @bulk-action="handleTodoBulkAction"
	  >
	    <template #templates>
	      <HataskTemplateLibrary
	        :templates="plannerTemplates"
	        :kind="templateKindFilter"
	        :labels="plannerTemplateLabels"
	        :readOnly="plannerReadOnly"
	        @update:kind="templateKindFilter=$event"
	        @use="usePlannerTemplate"
	        @duplicate="duplicatePlannerTemplate"
	        @archive="archivePlannerTemplate"
	        @move="movePlannerTemplate"
	      />
	    </template>
	  </HataskTodoPlanner>
	</div>
</div>

<!-- ========== NOTIFICATIONS ========== -->


<!-- ========== MOOD / MEAL: 切替でも入力中の記録を保持する ========== -->
<div v-show="activeTab==='mood'" class="htk-tabpage htk-journal-page" :class="tabDir==='fwd'?'htk-tab-fwd':'htk-tab-back'">
  <HataskJournal
    kind="mood"
    :entries="moodJournalRows"
    :writable="journalWritable('moods')"
    :loading="!dataLoaded"
    :active="activeTab==='mood'"
    :motion="settings.animations!==false && prefer.r.animation.value"
    :illustration="isHatakyu?hkAsset('heartHug'):undefined"
    :save="saveMoodEntry"
    :remove="deleteMoodEntry"
    @info="showMoodDisclaimer=true"
  >
    <template #reminders>
      <div class="htk-journal-reminders">
        <button type="button" role="switch" :aria-checked="!!settings.moodRemind" :disabled="journalReminderSaving || !loadedKeys.has('settings')" @click="setJournalReminder(!settings.moodRemind)"><i class="ti ti-bell"></i>{{copy.reminder}}<i :class="settings.moodRemind?'ti ti-toggle-right':'ti ti-toggle-left'" aria-hidden="true"></i></button>
        <div role="group" :aria-label="copy.reminderNotification"><button v-for="t in moodRemindTimes" :key="t" type="button" :aria-pressed="settings.moodRemindTimes?.includes(t)" :data-selected="settings.moodRemindTimes?.includes(t)" :disabled="journalReminderSaving || !loadedKeys.has('settings')" @click="toggleMoodRemindTime(t)">{{moodRemindTimeLabel(t)}}</button></div>
      </div>
    </template>
  </HataskJournal>
</div>

<div v-show="activeTab==='meal'" class="htk-tabpage htk-journal-page" :class="tabDir==='fwd'?'htk-tab-fwd':'htk-tab-back'">
  <HataskJournal
    kind="meal"
    :entries="mealJournalRows"
    :writable="journalWritable('meals')"
    :loading="!dataLoaded"
    :active="activeTab==='meal'"
    :motion="settings.animations!==false && prefer.r.animation.value"
    :illustration="isHatakyu?hkAsset('chefCooking'):undefined"
    :templates="mealTemplates"
    :templatesWritable="journalWritable(HATASK_MEAL_TEMPLATE_KEY)"
    :summary="mealSummaryMessage"
    :showSummary="settings.showMealSummary!==false"
    :save="saveMealEntry"
    :remove="deleteMealEntry"
    :storeTemplate="saveMealTemplate"
    :removeTemplate="deleteMealTemplate"
    @info="showMealDisclaimer=true"
  />
</div>

<!-- ========== GARDEN ========== -->
<div v-if="activeTab==='garden'" class="htk-tabpage htk-garden-page" :class="[isHatakyu?'hk-panels':'htk-panels',tabDir==='fwd'?'htk-tab-fwd':'htk-tab-back']">
					<div class="htk-garden-stack" :class="isHatakyu?'hk-panels':undefined" data-garden-group="personal">
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
  <div class="htk-lg htk-anim"><div class="htk-gc">
    <h3 class="htk-sec-title">{{copy.flowerGallery}}</h3>
    <p class="htk-gal-note">{{copy.flowerGalleryDescription}}</p>
    <div class="htk-gal-vis-box" role="group" :aria-label="copy.flowerGalleryVisibility">
      <div class="htk-vis-row htk-gal-vis">
        <button v-for="option in flowerVisibilityOptions" :key="option.value" type="button" :class="['htk-vis-o', flowerVisibility === option.value && 'on']" :aria-pressed="flowerVisibility === option.value" @click="updateFlowerVisibility(option.value)"><i :class="['ti', option.icon]" aria-hidden="true"></i><span>{{option.label}}</span></button>
      </div>
    </div>
    <p class="htk-gal-visibility-help">{{copy.flowerGalleryVisibilityHelp}}</p>
    <div class="htk-gal-sort" role="group" :aria-label="copy.sort"><div class="htk-gal-sort-inner"><span class="htk-gal-sort-label"><i class="ti ti-arrows-sort" aria-hidden="true"></i><span>{{copy.sort}}</span></span><button type="button" :class="['htk-gal-sort-btn', galleryOrder === 'newest' && 'on']" :aria-pressed="galleryOrder === 'newest'" @click="setGalleryOrder('newest')"><i class="ti ti-sort-descending" aria-hidden="true"></i><span>{{copy.newestFirst}}</span></button><button type="button" :class="['htk-gal-sort-btn', galleryOrder === 'oldest' && 'on']" :aria-pressed="galleryOrder === 'oldest'" @click="setGalleryOrder('oldest')"><i class="ti ti-sort-ascending" aria-hidden="true"></i><span>{{copy.oldestFirst}}</span></button></div></div>
    <div v-if="gallery.length" class="htk-gal-g"><button v-for="fl in pagedGallery" :key="fl.id" type="button" class="htk-gal-i" @click="renameFlower(fl)"><span class="htk-gal-e"><HataskEmoji :emoji="fl.emoji"/></span><span class="htk-gal-n">{{localizeFloraName(fl.name)}}</span><span v-if="fl.hanakotoba" class="htk-gal-hk">{{localizeHanakotoba(fl.hanakotoba)}}</span><span class="htk-gal-d">{{formatFlowerDate(fl)}}</span></button></div>
    <div v-else class="htk-empty"><div class="htk-empI"><i class="ti ti-circle-off"></i></div><div>{{copy.noFlowersYet}}</div></div>
    <div v-if="gallery.length" class="htk-pager htk-gal-pager"><button type="button" class="htk-btn htk-xs" :aria-label="copy.previousPage" :disabled="galleryPage <= 1" @click="galleryPage--">‹</button><span class="htk-pager-t" aria-live="polite">{{galleryPage}}</span><button type="button" class="htk-btn htk-xs" :aria-label="copy.nextPage" :disabled="galleryPage >= galleryTotalPages" @click="galleryPage++">›</button></div>
  </div></div>
					</div>
					<div class="htk-garden-stack" :class="isHatakyu?'hk-panels':undefined" data-garden-group="community">
  <div class="htk-lg htk-anim"><div class="htk-gc">
    <h3 class="htk-sec-title">{{copy.communityFlowerGallery}}</h3>
    <div class="htk-gal-sort" role="group" :aria-label="copy.sort"><div class="htk-gal-sort-inner"><span class="htk-gal-sort-label"><i class="ti ti-arrows-sort" aria-hidden="true"></i><span>{{copy.sort}}</span></span><button type="button" :class="['htk-gal-sort-btn', communityFlowerOrder === 'newest' && 'on']" :aria-pressed="communityFlowerOrder === 'newest'" @click="setCommunityFlowerOrder('newest')"><i class="ti ti-sort-descending" aria-hidden="true"></i><span>{{copy.newestFirst}}</span></button><button type="button" :class="['htk-gal-sort-btn', communityFlowerOrder === 'oldest' && 'on']" :aria-pressed="communityFlowerOrder === 'oldest'" @click="setCommunityFlowerOrder('oldest')"><i class="ti ti-sort-ascending" aria-hidden="true"></i><span>{{copy.oldestFirst}}</span></button></div></div>
    <div v-if="communityFlowersLoading" class="htk-gal-state" role="status"><i class="ti ti-loader-2" aria-hidden="true"></i> {{copy.flowerGalleryLoading}}</div>
    <div v-else-if="communityFlowersError" class="htk-gal-state htk-gal-error" role="alert"><i class="ti ti-alert-circle" aria-hidden="true"></i> {{copy.flowerGalleryLoadFailed}} <button type="button" class="htk-btn htk-xs" @click="loadCommunityFlowers">{{copy.retry}}</button></div>
    <div v-else-if="communityFlowers.length" class="htk-gal-g htk-gal-community-gallery">
      <div v-for="item in communityFlowers" :key="item.id" class="htk-gal-i htk-gal-card">
        <span class="htk-gal-e"><HataskEmoji :emoji="item.emoji"/></span>
        <span class="htk-gal-n">{{localizeFloraName(item.name)}}</span>
        <span v-if="item.hanakotoba" class="htk-gal-hk">{{localizeHanakotoba(item.hanakotoba)}}</span>
        <span class="htk-gal-d"><time :datetime="item.harvestedAt">{{formatFlowerDate(item)}}</time></span>
        <span v-if="item.user" class="htk-gal-owner"><MkAvatar :user="item.user" class="htk-gal-avatar" :forceShowDecoration="true"/><MkUserName :user="item.user"/></span>
        <button v-if="item.user && !item.isOwner && item.user.id !== $i?.id" type="button" class="htk-gal-report" :aria-label="copy.reportFlowerName" :title="copy.reportFlowerName" @click="reportCommunityFlower(item)"><i class="ti ti-flag-3" aria-hidden="true"></i></button>
      </div>
    </div>
    <div v-else class="htk-gal-state"><i class="ti ti-flower-off" aria-hidden="true"></i> {{copy.flowerGalleryEmpty}}</div>
    <div v-if="communityFlowers.length" class="htk-pager htk-gal-pager"><button type="button" class="htk-btn htk-xs" :aria-label="copy.previousPage" :disabled="communityFlowerPage <= 1" @click="communityFlowerPage--">‹</button><span class="htk-pager-t" aria-live="polite">{{communityFlowerPage}}</span><button type="button" class="htk-btn htk-xs" :aria-label="copy.nextPage" :disabled="communityFlowerPage >= communityFlowerTotalPages" @click="communityFlowerPage++">›</button></div>
  </div></div>

  <div class="htk-lg htk-anim"><div class="htk-gc">
    <h3 class="htk-sec-title">{{copy.communityFlowerActivity}}</h3>
    <div v-if="communityFlowersLoading" class="htk-gal-state" role="status"><i class="ti ti-loader-2" aria-hidden="true"></i> {{copy.flowerGalleryLoading}}</div>
    <div v-else-if="communityFlowersError" class="htk-gal-state htk-gal-error" role="alert"><i class="ti ti-alert-circle" aria-hidden="true"></i> {{copy.flowerGalleryLoadFailed}} <button type="button" class="htk-btn htk-xs" @click="loadCommunityFlowers">{{copy.retry}}</button></div>
    <div v-else-if="communityFlowers.length" class="htk-gal-community">
      <div v-for="item in communityFlowers" :key="item.id" class="htk-gal-community-row">
        <MkAvatar v-if="item.user" :user="item.user" class="htk-gal-avatar" :forceShowDecoration="true"/>
        <div class="htk-gal-community-body"><div class="htk-gal-community-text"><MkUserName v-if="item.user" :user="item.user"/><span>{{copy.flowerHarvestedBy}}</span><b>『{{localizeFloraName(item.name)}}』</b><span>{{copy.flowerHarvestedSuffix}}</span></div><div class="htk-gal-community-meta"><HataskEmoji :emoji="item.emoji"/> <time :datetime="item.harvestedAt">{{formatFlowerDate(item)}}</time></div></div>
        <button v-if="item.user && !item.isOwner && item.user.id !== $i?.id" type="button" class="htk-gal-report" :aria-label="copy.reportFlowerName" :title="copy.reportFlowerName" @click="reportCommunityFlower(item)"><i class="ti ti-flag-3" aria-hidden="true"></i></button>
      </div>
    </div>
    <div v-else class="htk-gal-state"><i class="ti ti-flower-off" aria-hidden="true"></i> {{copy.flowerGalleryEmpty}}</div>
  </div></div>
					</div>
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
import { ref, computed, inject, onMounted, onUnmounted, onBeforeUnmount, onActivated, onDeactivated, nextTick, watch, defineAsyncComponent } from 'vue';
import type * as Misskey from 'cherrypick-js';
import type { HataskGrowingFlower } from '@/utility/hatask-flower-growth.js';
import { definePage } from '@/page.js';
import * as os from '@/os.js';
import { claimAchievement } from '@/utility/achievements.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';
import { useRouter } from '@/router.js';
import { useStream } from '@/stream.js';
import { i18n } from '@/i18n.js';
import { prefer } from '@/preferences.js';
import { versatileLang } from '@/utility/intl-const.js';
import MkEarthquakeTicker from '@/components/MkEarthquakeTicker.vue';
import HataFeedNotificationBody from '@/components/HataFeedNotificationBody.vue';
import HataskEmoji from '@/components/HataskEmoji.vue';
import HataskCalendarPlanner from '@/components/hatask/HataskCalendarPlanner.vue';
import { normalizeHataskTodoMobileTabs } from '@/utility/hatask-todo-tabs.js';
import HataskEventMoveDialog from '@/components/hatask/HataskEventMoveDialog.vue';
import type { HataskEventMoveDialogLabels } from '@/components/hatask/HataskEventMoveDialog.vue';
import HataskTodoPlanner from '@/components/hatask/HataskTodoPlanner.vue';
import HataskQuickCapture from '@/components/hatask/HataskQuickCapture.vue';
import HataskJournal from '@/components/hatask/HataskJournal.vue';
import { HATASK_MEAL_TEMPLATE_KEY, isJournalEntry, persistJournalChange } from '@/utility/hatask-journal.js';
import type { HataskJournalChange, HataskJournalEntry, HataskMealTemplate } from '@/utility/hatask-journal.js';
import type { HataskCaptureChip, HataskCaptureTool } from '@/components/hatask/HataskQuickCapture.vue';
import HataskTemplateLibrary from '@/components/hatask/HataskTemplateLibrary.vue';
import type { HataskTemplateKindFilter, HataskTemplateLabels } from '@/components/hatask/HataskTemplateLibrary.vue';
import type { HataskCalendarDay, HataskCalendarEvent, HataskCalendarLabels, HataskCalendarView, HataskCalendarWeekday, HataskPlannerFilter, HataskPlannerTheme, HataskTodoItem, HataskTodoLabels, HataskTodoMobileTab, HataskTodoSort, HataskTodoView } from '@/components/hatask/hatask-planner-types.js';
import MkAvatar from '@/components/global/MkAvatar.vue';
import MkUserName from '@/components/global/MkUserName.vue';
import { hatakyuAssetUrl } from '@/utility/hatakyu-assets.js';
import type { HatakyuAssetKey } from '@/utility/hatakyu-assets.js';
import { getDefaultPhrase, getPhrase } from '@/utility/hatask-phrases.js';
import { floraData, pickRandomFlora, generateFlowerName, localizeFloraName, localizeHanakotoba } from '@/utility/hatask-flora.js';
import { HATASK_FLOWER_GROWTH_EVENT, createHataskGrowingFlower, normalizeHataskGrowingFlower, seedHataskFlowerGrowth } from '@/utility/hatask-flower-growth.js';
import { notificationDisplayMessage, type HataFeedNotif } from '@/utility/hatafeed.js';
import { createHataskPlannerApiStoragePort } from '@/utility/hatask-planner-api.js';
import { HATASK_PLANNER_COLLECTION_KEYS, HATASK_PLANNER_SCOPE, migrateHataskPlannerStorage } from '@/utility/hatask-planner-storage.js';
import type { HataskPlannerCollectionKey, HataskPlannerEvent, HataskPlannerFolder, HataskPlannerRevision, HataskPlannerTemplate, HataskPlannerTodo, HataskRecurrenceFrequency } from '@/utility/hatask-planner-storage.js';
import { normalizeHataskPlannerTemplates } from '@/utility/hatask-planner-templates.js';
import { parseHataskCapture } from '@/utility/hatask-capture-parser.js';
import { createNextRecurringTodo, expandHataskEventOccurrences } from '@/utility/hatask-planner-recurrence.js';
import { activeCharacter as mascotActiveCharacter, expressionDisplayUrl, loadMascot, hatakMascotActive, currentExpression as mascotCurrentExpression, currentPhrase as mascotCurrentPhrase, pickRandomPhrase as mascotPickRandomPhrase, displaySettings as mascotDisplaySettings, loadDisplaySettings as loadMascotDisplaySettings, nextIdleDelayMs as mascotNextIdleDelayMs, escapeText as mascotEscapeText } from '@/utility/mascot-store.js';
const copy = i18n.ts._hata._hatask._main;
const copyx = i18n.tsx._hata._hatask._main;
const plannerCopy = i18n.ts._hata._hatask._planner;
const plannerCopyx = i18n.tsx._hata._hatask._planner;
const inPageWindow = inject<boolean>('inWindow', false);
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
const moodRemindTimes=['朝 8:00','昼 12:00','夜 20:00','寝る前 23:00'];
// ===== 食事記録(meal) 定数。医療目的ではない自己記録メモ。数値評価・カロリー計算はしない =====
const mealSlots=computed(() => [{id:'breakfast',emoji:'ti ti-sunrise',label:copy.mealSlotBreakfast},{id:'lunch',emoji:'ti ti-sun',label:copy.mealSlotLunch},{id:'dinner',emoji:'ti ti-moon',label:copy.mealSlotDinner},{id:'snack',emoji:'ti ti-cookie',label:copy.mealSlotSnack}]);
// 3段階はすべて中立・等価に扱う。「食べれなかった」を否定的に強調しない
const mealLevels=computed(() => [{id:'ate',emoji:'ti ti-bowl-chopsticks',label:copy.mealLevelAte,color:'#85cdca'},{id:'little',emoji:'ti ti-bowl-spoon',label:copy.mealLevelLittle,color:'#e8a87c'},{id:'none',emoji:'ti ti-cup',label:copy.mealLevelNone,color:'#c38d9e'}]);
const mealDisclaimerText=computed(() => copy.mealDisclaimerFull);
const eventColors=['#e27d60','#85cdca','#e8a87c','#c38d9e','#7bc67e','#f0c75e','#6cb4ee'];
const eventEmojis=['⭐','💼','🎮','🔧','📚','🎂','✈️','🎨','🏃','🎤'];
const notifyTimings=['15分前','30分前','1時間前','1日前'];
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

function notifyTimingLabel(value: string): string { return notifyTimingLabels[value]?.() ?? value; }

function moodRemindTimeLabel(value: string): string { return moodRemindTimeLabels[value]?.() ?? value; }

function moodNoteLabel(value: string): string { return value === '（ひとことなし）' ? copy.noMoodNote : value; }

function parseIsoDate(value: string): Date {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
}

function localDateKey(date = new Date()): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
const plannerRevisions: Record<HataskPlannerCollectionKey, HataskPlannerRevision> = { todos: null, folders: null, events: null };
const plannerStoragePort = createHataskPlannerApiStoragePort((endpoint, params) => misskeyApi(endpoint as never, params as never));
const plannerTemplates = ref<HataskPlannerTemplate[]>([]);
const plannerTemplateRevision = ref<HataskPlannerRevision>(null);
const templateKindFilter = ref<HataskTemplateKindFilter>('all');
const plannerTemplatesLoaded = ref(false);
const plannerStorageState = ref<'loading'|'ready'|'saving'|'saved'|'blocked'|'conflict'>('loading');
const plannerStorageDetail = ref('');
let plannerMigrationReady = false;

function isPlannerCollectionKey(key: string): key is HataskPlannerCollectionKey {
	return (HATASK_PLANNER_COLLECTION_KEYS as readonly string[]).includes(key);
}

function storePlannerRecoveryCopy(key: HataskPlannerCollectionKey, value: unknown): void {
	try {
		window.localStorage.setItem('hatask_planner_unsaved_v1', JSON.stringify({ version: 1, savedAt: new Date().toISOString(), key, value }));
	} catch {
		// The server and Registry shadow backups remain the primary recovery path.
	}
}

async function registryGet<T>(key:string,fb:T):Promise<T>{
	try {
		if (isPlannerCollectionKey(key)) {
			const result = await plannerStoragePort.read({ key, scope: HATASK_PLANNER_SCOPE });
			plannerRevisions[key] = result.revision ?? null;
			loadedKeys.add(key);
			return (result.value != null ? result.value : fb) as T;
		}
		const v=await misskeyApi('i/registry/get',{key,scope:SCOPE});
		loadedKeys.add(key);
		return(v!=null?v:fb)as T;
	} catch (error) {
		// A missing key is a valid empty state. Network/auth/server failures are not:
		// keep the key locked so a later interaction cannot overwrite unseen data.
		if ((error as { code?: string } | null)?.code === 'NO_SUCH_KEY') loadedKeys.add(key);
		return fb;
	}
}
async function registrySet(key:string,value:unknown):Promise<void>{
	if(!loadedKeys.has(key))throw new Error(`Hatask registry write blocked before a successful read: ${key}`);
	if (isPlannerCollectionKey(key)) {
		if (!plannerMigrationReady) throw new Error(`Hatask planner write blocked until migration verification succeeds: ${key}`);
		plannerStorageState.value = 'saving';
		try {
			const result = await plannerStoragePort.write({
				key,
				scope: HATASK_PLANNER_SCOPE,
				value,
				expectedRevision: plannerRevisions[key],
			});
			plannerRevisions[key] = result?.revision ?? plannerRevisions[key];
			plannerStorageState.value = 'saved';
			plannerStorageDetail.value = '';
			return;
		} catch (error) {
			storePlannerRecoveryCopy(key, value);
			if ((error as { code?: string } | null)?.code === 'HATASK_PLANNER_CONFLICT') {
				plannerStorageState.value = 'conflict';
				plannerStorageDetail.value = plannerCopy.conflict;
			} else {
				plannerStorageState.value = 'blocked';
				plannerStorageDetail.value = plannerCopy.readFailure;
			}
			throw error;
		}
	}
	await misskeyApi('i/registry/set',{key,value,scope:SCOPE});
}

async function loadPlannerTemplates(): Promise<void> {
	const snapshot = await plannerStoragePort.readTemplates();
	const normalized = normalizeHataskPlannerTemplates(snapshot.value);
	if (normalized.invalidCount > 0) {
		plannerTemplatesLoaded.value = false;
		plannerStorageState.value = 'blocked';
		plannerStorageDetail.value = plannerCopy.templateReadFailure;
		throw new Error(plannerStorageDetail.value);
	}
	plannerTemplates.value = normalized.templates;
	plannerTemplateRevision.value = snapshot.revision;
	plannerTemplatesLoaded.value = true;
}

async function savePlannerTemplates(next: HataskPlannerTemplate[]): Promise<void> {
	if (!plannerMigrationReady || !plannerTemplatesLoaded.value) throw new Error('Hatask template write blocked before verified read');
	plannerStorageState.value = 'saving';
	try {
		const result = await plannerStoragePort.writeTemplates(next, plannerTemplateRevision.value);
		plannerTemplateRevision.value = result.revision;
		plannerTemplates.value = next;
		plannerStorageState.value = 'saved';
		plannerStorageDetail.value = '';
	} catch (error) {
		try { window.localStorage.setItem('hatask_planner_unsaved_templates_v1', JSON.stringify({ version: 1, savedAt: new Date().toISOString(), value: next })); } catch {}
		if ((error as { code?: string } | null)?.code === 'HATASK_PLANNER_CONFLICT') {
			plannerStorageState.value = 'conflict';
			plannerStorageDetail.value = plannerCopy.conflict;
		} else {
			plannerStorageState.value = 'blocked';
			plannerStorageDetail.value = plannerCopy.readFailure;
		}
		throw error;
	}
}

async function preparePlannerStorage(): Promise<boolean> {
	plannerStorageState.value = 'loading';
	plannerStorageDetail.value = '';
	// 競合後の再試行では、前回キャッシュではなくサーバーの最新revisionを基準にする。
	await plannerStoragePort.refresh();
	const result = await migrateHataskPlannerStorage(plannerStoragePort);
	if (result.status === 'noop' || result.status === 'migrated') {
		plannerMigrationReady = true;
		plannerStorageState.value = 'ready';
		return true;
	}
	plannerMigrationReady = false;
	plannerStorageState.value = 'blocked';
	plannerStorageDetail.value = result.issues[0]?.detail ?? plannerCopy.readFailure;
	return false;
}

async function retryPlannerStorage(): Promise<void> {
	try {
		if (!await preparePlannerStorage()) return;
		const [nextTodos, nextFolders, nextEvents] = await Promise.all([
			registryGet<HataskPlannerTodo[]>('todos', []),
			registryGet<HataskPlannerFolder[]>('folders', []),
			registryGet<HataskPlannerEvent[]>('events', []),
		]);
		await loadPlannerTemplates();
		todos.value = nextTodos;
		folders.value = nextFolders;
		events.value = nextEvents;
		scheduleEventNotifications();
		await loadSharedEvents();
	} catch (error) {
		plannerMigrationReady = false;
		plannerStorageState.value = 'blocked';
		plannerStorageDetail.value = (error as Error)?.message || plannerCopy.readFailure;
	}
}

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
const showMoodDisclaimer = ref(false);
const showFlowerInfo = ref(false);
const rootEl = ref<HTMLElement | null>(null);
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
	// ブラウザの setTimeout 上限より手前までを張り、12時間ごとに次の窓を補充する。
	// 旧実装の24時間制限では、Hataskを毎日開かない利用者の通知が欠落していた。
	eventTimerIds.forEach(id=>window.clearTimeout(id));eventTimerIds.length=0;
	const now=Date.now();
	const timerWindowMs=21*24*60*60*1000;
	const rangeEnd=new Date(now+timerWindowMs+2*24*60*60*1000);
	const occurrences=expandHataskEventOccurrences(events.value,localDateKey(),localDateKey(rangeEnd),2000);
	for(const ev of occurrences){
		if(!ev.notify||!ev.notifyTimings?.length)continue;
		const eventTime=new Date(`${ev.date}T${ev.allDay?'09:00':ev.timeStart||'09:00'}`).getTime();
		if(!Number.isFinite(eventTime)||eventTime<now)continue;
		for(const timing of ev.notifyTimings){
			let msAhead=0;
			if(timing==='15分前')msAhead=15*60*1000;
			else if(timing==='30分前')msAhead=30*60*1000;
			else if(timing==='1時間前')msAhead=60*60*1000;
			else if(timing==='1日前')msAhead=24*60*60*1000;
			const delay=eventTime-msAhead-now;
			if(delay<=0||delay>timerWindowMs)continue;
			const tid=window.setTimeout(()=>{
				sendNotification(ev.title,copyx.eventReminderBody({ timing: notifyTimingLabel(timing), start: ev.timeStart||copy.allDay, end: ev.timeEnd||copy.allDay }),undefined,'/hatask?notice=calendar');
			},delay);
			eventTimerIds.push(tid);
		}
	}
	const refreshTimer=window.setTimeout(scheduleEventNotifications,12*60*60*1000);
	eventTimerIds.push(refreshTimer);
}
function scheduleMoodReminders(){
// ⚠️まず消す。ここを省くと呼ばれるたびにタイマーが積み上がり、同じ時刻に何通も届く。
// ⚠️早期returnより前で消すこと。後ろに置くと、リマインドをOFFにしても既存の分が鳴る。
moodTimerIds.forEach(id=>clearTimeout(id));moodTimerIds.length=0;
if(!settings.value.moodRemind||!settings.value.moodRemindTimes?.length)return;
const now=new Date();const today=localDateKey(now);
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
async function loadSharedEvents(){
	try {
		const loadOwned=async():Promise<any[]>=>{
			const owned:any[]=[];
			let untilId:string|undefined;
			for(let page=0;page<100;page++){
				const batch=await misskeyApi('hatask/events/owned',{limit:100,...(untilId?{untilId}:{})}) as any[];
				owned.push(...batch);
				if(batch.length<100)break;
				untilId=batch[batch.length-1]?.id;
				if(!untilId)break;
			}
			return owned;
		};
		const [publicEvents,owned]=await Promise.all([
			// 通常表示では未来分を日付順に取得する。includeExpired=true は全履歴の
			// 最古50件を返し、現在の共有予定を隠してしまうため使わない。
			misskeyApi('hatask/events/list',{limit:50,includeExpired:false}) as Promise<any[]>,
			loadOwned(),
		]);
		const merged=new Map<string,any>();
		for(const event of [...publicEvents,...owned])merged.set(event.id,event);
		sharedEvents.value=[...merged.values()];
		await reconcileOwnedEventIds();
		await processPublicEventOutbox();
	} catch(e) {
		console.warn('Failed to load shared events:',e);
		// Keep the last successful snapshot visible instead of flashing an empty list.
	}
}
function plannerEventServerId(eventId:string):string{
	const local=events.value.find(event=>event.id===eventId||event.serverEventId===eventId);
	return local?.serverEventId||eventId;
}
function sharedEventData(eventId:string){const serverId=plannerEventServerId(eventId);return sharedEvents.value.find(e=>e.id===serverId)||null}
function sharedRsvpResponses(eventId:string){return sharedEventData(eventId)?.rsvpResponses||[]}
function sharedRsvpMyStatus(eventId:string){const r=sharedRsvpResponses(eventId).find((r:any)=>r.userId===$i?.id);return r?.status||null}

function publicEventSignature(event:any):string{
	return JSON.stringify([
		String(event.title??'').trim(),String(event.emoji??'📅'),String(event.date??''),String(event.dateEnd??''),
		event.allDay?'':String(event.timeStart??''),event.allDay?'':String(event.timeEnd??''),
		Boolean(event.allDay),String(event.color??'#e27d60').toLowerCase(),Boolean(event.rsvp),
	]);
}

function findUniqueOwnedServerId(event:any,claimed=new Set<string>()):string|null{
	const matches=sharedEvents.value.filter(candidate=>candidate.userId===$i?.id&&!claimed.has(candidate.id)&&publicEventSignature(candidate)===publicEventSignature(event));
	return matches.length===1?matches[0].id:null;
}

/**
 * 旧クライアントは公開予定のサーバーIDを保存していなかった。
 * 全項目が一致する自分の予定が一意な場合だけ対応づけ、曖昧なら絶対に推測しない。
 */
async function reconcileOwnedEventIds():Promise<void>{
	if(!plannerMigrationReady||!loadedKeys.has('events')||events.value.length===0)return;
	const claimed=new Set(events.value.flatMap(event=>event.serverEventId?[event.serverEventId]:[]));
	let changed=false;
	const next:HataskPlannerEvent[]=events.value.map((event):HataskPlannerEvent=>{
		if(event.visibility!=='public')return event;
		if(event.serverEventId){
			const server=sharedEvents.value.find(candidate=>candidate.id===event.serverEventId&&candidate.userId===$i?.id);
			if(!server||server.revision===event.serverEventRevision)return event;
			if(publicEventSignature(server)===publicEventSignature(event)){
				changed=true;
				return{...event,serverEventRevision:server.revision};
			}
			if(!event.publicSyncState){changed=true;return{...event,publicSyncState:'conflict' as const}}
			return event;
		}
		const serverEventId=findUniqueOwnedServerId(event,claimed);
		if(serverEventId){
			claimed.add(serverEventId);
			changed=true;
			const serverEvent=sharedEvents.value.find(candidate=>candidate.id===serverEventId);
			const matched:HataskPlannerEvent={...event,clientEventId:event.clientEventId||event.id,serverEventId,serverEventRevision:serverEvent?.revision};
			delete matched.publicSyncState;
			return matched;
		}
		if(['pending','creating','updating','deleting','deleting-local','unlinked'].includes(String(event.publicSyncState||'')))return event;
		changed=true;
		return{...event,publicSyncState:'unlinked' as const};
	});
	if(!changed)return;
	try{
		await registrySet('events',next);
		events.value=next;
	}catch(error){
		console.warn('Hatask public event ID reconciliation was not saved:',error);
	}
}

let publicOutboxProcessing=false;
async function persistPlannerEvent(eventId:string,replacement:HataskPlannerEvent|null):Promise<void>{
	const next=[...events.value];
	const index=next.findIndex(event=>event.id===eventId);
	if(index>=0){if(replacement)next.splice(index,1,replacement);else next.splice(index,1)}
	else if(replacement)next.unshift(replacement);
	await registrySet('events',next);
	events.value=next;
}

/** サーバー操作の前にRegistryへ残したintentを冪等に再開する。 */
async function processPublicEventOutbox():Promise<void>{
	if(publicOutboxProcessing||plannerReadOnly.value)return;
	publicOutboxProcessing=true;
	try{
		for(const queued of [...events.value]){
			const current=events.value.find(event=>event.id===queued.id);
			if(!current)continue;
			const state=String(current.publicSyncState||'');
			if(!['creating','pending','updating','deleting','deleting-local'].includes(state))continue;
			try{
				if(state==='creating'||state==='pending'){
					const matchedId=findUniqueOwnedServerId(current);
					const matched=matchedId?sharedEvents.value.find(event=>event.id===matchedId):null;
					const created=matched??await misskeyApi('hatask/events/create',eventApiPayload(current)) as any;
					const saved={...current,serverEventId:created.id,serverEventRevision:created.revision,publicSyncState:undefined};
					delete saved.publicSyncState;
					await persistPlannerEvent(current.id,saved);
					continue;
				}
				if(state==='updating'){
					const server=sharedEventData(current.id);
					const serverEventId=current.serverEventId||server?.id;
					if(server&&publicEventSignature(server)===publicEventSignature(current)){
						const saved={...current,serverEventId:server.id,serverEventRevision:server.revision,publicSyncState:undefined};
						delete saved.publicSyncState;
						await persistPlannerEvent(current.id,saved);
						continue;
					}
					if(server?.revision&&current.serverEventRevision&&server.revision!==current.serverEventRevision){
						await persistPlannerEvent(current.id,{...current,publicSyncState:'conflict'});
						continue;
					}
					const expectedRevision=current.serverEventRevision||server?.revision;
					if(!serverEventId||!expectedRevision){
						await persistPlannerEvent(current.id,{...current,publicSyncState:'unlinked'});
						continue;
					}
					const updated=await misskeyApi('hatask/events/update',{eventId:serverEventId,expectedRevision,...eventApiPayload(current)}) as any;
					const saved={...current,serverEventId,serverEventRevision:updated.revision,publicSyncState:undefined};
					delete saved.publicSyncState;
					await persistPlannerEvent(current.id,saved);
					continue;
				}

				const server=sharedEventData(current.id);
				const serverEventId=current.serverEventId||server?.id;
				const expectedRevision=current.serverEventRevision||server?.revision;
				if(serverEventId){
					if(!expectedRevision)throw new Error('Missing public event revision');
					try{await misskeyApi('hatask/events/delete',{eventId:serverEventId,expectedRevision})}catch(error){if((error as {code?:string}|null)?.code!=='NO_SUCH_EVENT')throw error}
				}
				if(state==='deleting-local'){
					await persistPlannerEvent(current.id,null);
				}else{
					const saved={...current,visibility:'private' as const,rsvp:false,serverEventId:undefined,serverEventRevision:undefined,publicSyncState:undefined,pendingVisibility:undefined};
					delete saved.serverEventId;delete saved.serverEventRevision;delete saved.publicSyncState;delete saved.pendingVisibility;
					await persistPlannerEvent(current.id,saved);
				}
				}catch(error){
					const code=(error as {code?:string}|null)?.code;
					try{
						if(code==='HATASK_EVENT_CONFLICT')await persistPlannerEvent(current.id,{...current,publicSyncState:'conflict'});
						else if(code==='NOT_OWNER'||code==='NO_SUCH_EVENT')await persistPlannerEvent(current.id,{...current,publicSyncState:'unlinked'});
						else if((state==='creating'||state==='pending'||state==='updating')&&(code==='INVALID_HATASK_EVENT_SCHEDULE'||code==='INVALID_PARAM'))await persistPlannerEvent(current.id,{...current,publicSyncState:'sync-error'});
					}catch{}
					console.warn(`Hatask public event outbox remains pending (${state}):`,error);
			}
		}
	}finally{publicOutboxProcessing=false}
}
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
const settings=ref<any>({darkMode:false,autoTheme:true,weekStart:'mon',showClock:true,showEvents:true,showFlower:true,showMoodSummary:true,showFeedbackNotif:true,showEarthquake:true,moodRemind:false,moodRemindTimes:['昼 12:00','寝る前 23:00'],openOnStart:false,theme:'kisetsu',animations:true,todoSortModes:{},todoMobileTabOrder:['today','upcoming','all','completed','more']});
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
const journalReminderSaving = ref(false);

async function saveJournalReminder(patch: { moodRemind?: boolean; moodRemindTimes?: string[] }): Promise<void> {
	if (journalReminderSaving.value || !loadedKeys.has('settings')) return;
	journalReminderSaving.value = true;
	try {
		await registrySet('settings', { ...settings.value, ...patch });
		settings.value = { ...settings.value, ...patch };
		scheduleMoodReminders();
	} catch {
		os.alert({ type: 'error', text: i18n.ts._hata._hatask._journal.saveFailure });
	} finally {
		journalReminderSaving.value = false;
	}
}

async function setJournalReminder(enabled: boolean): Promise<void> { await saveJournalReminder({ moodRemind: enabled }); }

async function toggleMoodRemindTime(t: string): Promise<void> {
	const times: string[] = Array.isArray(settings.value.moodRemindTimes) ? settings.value.moodRemindTimes : [];
	await saveJournalReminder({ moodRemindTimes: times.includes(t) ? times.filter(time => time !== t) : [...times, t] });
}
function toggleNotifyTiming(t:string){const i=newEvent.value.notifyTimings.indexOf(t);if(i>=0)newEvent.value.notifyTimings.splice(i,1);else newEvent.value.notifyTimings.push(t)}

// Calendar
const calYear=ref(new Date().getFullYear());const calMonth=ref(new Date().getMonth());const selectedDay=ref<number|null>(new Date().getDate());
const calendarTitle = computed(() => yearMonthFormatter.format(new Date(calYear.value, calMonth.value, 1)));
const selectedDateLabel = computed(() => selectedDay.value == null ? '' : longDateFormatter.format(new Date(calYear.value, calMonth.value, selectedDay.value)));
function chMo(d:number){calMonth.value+=d;if(calMonth.value>11){calMonth.value=0;calYear.value++}if(calMonth.value<0){calMonth.value=11;calYear.value--}selectedDay.value=null;viewingEvent.value=null}
function goToday(){const n=new Date();calYear.value=n.getFullYear();calMonth.value=n.getMonth();selectedDay.value=n.getDate()}
function selectDay(d:number){selectedDay.value=d;viewingEvent.value=null;const ds=`${calYear.value}-${String(calMonth.value+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;newEvent.value.date=ds;newEvent.value.dateEnd=ds;editingEvent.value=null}
const selectedDateStr=computed(()=>{if(!selectedDay.value)return'';return`${calYear.value}-${String(calMonth.value+1).padStart(2,'0')}-${String(selectedDay.value).padStart(2,'0')}`});
// ローカル + 共有予定を serverEventId で照合し、繰り返し予定を表示期間へ展開する。
const allCalendarEvents=computed(()=>{
	const now=new Date();
	const anchor=new Date(calYear.value,calMonth.value,selectedDay.value??1,12);
	const oneTimeEvents=events.value.filter(event=>event.archivedAt==null&&(event.recurrence?.frequency??'none')==='none').map(event=>({...event,sourceEventId:event.id,occurrenceDate:event.date,isRecurrenceOccurrence:false}));
	const recurringEvents=events.value.filter(event=>(event.recurrence?.frequency??'none')!=='none');
	const expanded=new Map<string,any>();
	for(const event of expandHataskEventOccurrences(recurringEvents,localDateKey(new Date(now.getFullYear()-1,0,1)),localDateKey(new Date(now.getFullYear()+4,11,31)),5000))expanded.set(event.id,event);
	for(const event of expandHataskEventOccurrences(recurringEvents,localDateKey(new Date(anchor.getFullYear()-1,0,1)),localDateKey(new Date(anchor.getFullYear()+1,11,31)),3000))expanded.set(event.id,event);
	const localOccurrences=[...oneTimeEvents,...expanded.values()].map(event=>({
		...event,
		userId:$i?.id,
		isShared:event.visibility==='public',
	}));
	const localServerIds=new Set(events.value.flatMap(event=>event.serverEventId?[event.serverEventId]:[]));
	const shared=sharedEvents.value.filter(event=>!localServerIds.has(event.id)).map(event=>({
		...event,
		isShared:true,
		visibility:'public',
		readOnly:event.userId!==$i?.id,
		sourceEventId:event.id,
		occurrenceDate:event.date,
		isRecurrenceOccurrence:false,
	}));
	return[...localOccurrences,...shared];
});
const eventsForDay=computed(()=>{if(!selectedDateStr.value)return[];return allCalendarEvents.value.filter(e=>{if(e.date===selectedDateStr.value)return true;if(e.dateEnd&&e.date<=selectedDateStr.value&&e.dateEnd>=selectedDateStr.value)return true;return false}).sort((a,b)=>{if(a.allDay&&!b.allDay)return-1;if(!a.allDay&&b.allDay)return 1;return(a.timeStart||'').localeCompare(b.timeStart||'')})});
function hasEventsOn(ds:string){return allCalendarEvents.value.some(e=>e.date===ds||(e.dateEnd&&e.date<=ds&&e.dateEnd>=ds))}
function eventDotsFor(ds:string){return allCalendarEvents.value.filter(e=>e.date===ds||(e.dateEnd&&e.date<=ds&&e.dateEnd>=ds)).slice(0,3)}
function startEditEvent(ev:any){
	const sourceId=ev.sourceEventId||ev.id;
	const localSource=events.value.find(event=>event.id===sourceId||event.serverEventId===sourceId);
	if(!localSource&&ev.userId!==$i?.id){os.toast(copy.cannotDeleteOthersEvent);return}
	// owner API からだけ見つかった旧予定は、参加者やプロフィールをRegistryへ複製せず
	// plannerの必要フィールドだけを保存候補へ取り込む。
	const importedId=generateId();
	const source:HataskPlannerEvent=localSource?{...localSource,clientEventId:localSource.clientEventId||localSource.id}:{
		id:importedId,clientEventId:importedId,serverEventId:ev.id,serverEventRevision:ev.revision,
		title:ev.title,emoji:ev.emoji||'⭐',date:ev.date,dateEnd:ev.dateEnd||ev.date,
		timeStart:ev.timeStart||'',timeEnd:ev.timeEnd||'',allDay:Boolean(ev.allDay),color:ev.color||'#e27d60',
		visibility:'public',rsvp:Boolean(ev.rsvp),notify:false,notifyTimings:[],recurrence:{frequency:'none',interval:1},archivedAt:null,
	};
	editingEvent.value=source;
	newEvent.value={title:source.title,emoji:source.emoji||'⭐',date:source.date,timeStart:source.timeStart||'14:00',dateEnd:source.dateEnd||source.date,timeEnd:source.timeEnd||'15:00',color:source.color||'#e27d60',visibility:source.visibility||'private',rsvp:source.rsvp||false,notify:source.notify||false,notifyTimings:source.notifyTimings?[...source.notifyTimings]:['15分前'],allDay:source.allDay||false,recurrence:{...(source.recurrence||{frequency:'none',interval:1})}}
	openEventDetailsModal();
}
async function deleteEventById(id:string,options:{skipConfirm?:boolean}={}){
	if(plannerReadOnly.value)return;
	const occurrence=allCalendarEvents.value.find(event=>event.id===id);
	const sourceId=occurrence?.sourceEventId||id;
	const local=events.value.find(event=>event.id===sourceId||event.serverEventId===sourceId);
	const shared=sharedEventData(local?.id||sourceId);
	if(shared&&shared.userId!==$i?.id){os.toast(copy.cannotDeleteOthersEvent);return}
	if(!options.skipConfirm){const {canceled}=await os.confirm({type:'warning',text:plannerCopy.confirmDeleteEvent});if(canceled)return}

	let serverEventId=local?.serverEventId||(!local&&shared?.userId===$i?.id?shared.id:null);
	let serverEventRevision=String(local?.serverEventRevision||shared?.revision||'')||undefined;
	if(local?.visibility==='public'&&!serverEventId){
		serverEventId=findUniqueOwnedServerId(local);
		const matched=serverEventId?sharedEvents.value.find(event=>event.id===serverEventId):null;
		serverEventRevision=matched?.revision;
		if(!serverEventId||!serverEventRevision){os.toast(plannerCopy.publicSyncUnlinked);return}
	}
	try{
		if(local?.visibility==='public'){
			// 削除intentを先に保存し、API成功後のCAS失敗でも次回確実に再開する。
			await persistPlannerEvent(local.id,{...local,serverEventId,serverEventRevision,publicSyncState:'deleting-local'});
			await processPublicEventOutbox();
		}else if(local){
			const next=events.value.filter(event=>event.id!==local.id);
			await registrySet('events',next);
			events.value=next;
		}else if(serverEventId&&serverEventRevision){
			await misskeyApi('hatask/events/delete',{eventId:serverEventId,expectedRevision:serverEventRevision});
		}
		if(editingEvent.value?.id===local?.id)editingEvent.value=null;
		viewingEvent.value=null;
		await loadSharedEvents();
		scheduleEventNotifications();
			const remainingState=local?String(events.value.find(event=>event.id===local.id)?.publicSyncState||''):'';
			os.toast(remainingState==='conflict'?plannerCopy.publicSyncConflict:remainingState==='unlinked'?plannerCopy.publicSyncUnlinked:remainingState?plannerCopy.publicSyncPending:copy.eventDeleted);
	}catch(error){
		console.error('Hatask event delete failed:',error);
		os.toast(plannerCopy.publicSyncFailed);
	}
}
const calCells=computed(()=>{const fd=new Date(calYear.value,calMonth.value,1).getDay();const dim=new Date(calYear.value,calMonth.value+1,0).getDate();const dip=new Date(calYear.value,calMonth.value,0).getDate();const so=fd===0?6:fd-1;const td=new Date();const cells:any[]=[];for(let i=so-1;i>=0;i--)cells.push({day:dip-i,om:true});for(let d=1;d<=dim;d++){const ds=`${calYear.value}-${String(calMonth.value+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;cells.push({day:d,om:false,today:d===td.getDate()&&calMonth.value===td.getMonth()&&calYear.value===td.getFullYear(),selected:d===selectedDay.value,hasEvents:hasEventsOn(ds),dots:eventDotsFor(ds)})}const rem=(7-cells.length%7)%7;for(let d=1;d<=rem;d++)cells.push({day:d,om:true});return cells});

// Events
const events=ref<HataskPlannerEvent[]>([]);
const td=()=>localDateKey();
const newEvent=ref({title:'',emoji:'⭐',date:td(),timeStart:'14:00',dateEnd:td(),timeEnd:'15:00',color:'#e27d60',visibility:'private',rsvp:false,notify:true,notifyTimings:['15分前','30分前'],allDay:false,recurrence:{frequency:'none' as HataskRecurrenceFrequency,interval:1}});
const eventCaptureRef=ref<{focus:()=>void}|null>(null);
const eventCaptureState=ref<'idle'|'saving'|'success'|'error'>('idle');
const showEventDetails=ref(false);
const showEventTemplates=ref(false);
const eventCaptureEditor=ref<'date'|'time'|null>(null);
const eventDetailsCloseRef = ref<HTMLButtonElement | null>(null);
let eventDetailsReturnFocus: HTMLElement | null = null;

function openEventDetailsModal(): void {
	eventDetailsReturnFocus = window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null;
	showEventDetails.value = true;
	showEventTemplates.value = false;
	eventCaptureEditor.value = null;
	nextTick(() => eventDetailsCloseRef.value?.focus());
}

function closeEventDetailsModal(): void {
	showEventDetails.value = false;
	const returnFocus = eventDetailsReturnFocus;
	eventDetailsReturnFocus = null;
	nextTick(() => {
		if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
		else eventCaptureRef.value?.focus();
	});
}

function clockPlusMinutes(value:string,minutes:number):string{const match=/^(\d{2}):(\d{2})$/.exec(value);if(!match)return'15:00';const total=(Number(match[1])*60+Number(match[2])+minutes+1440)%1440;return`${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`}
function applyEventCaptureSyntax(value:string,force=false):void{
	newEvent.value.title=value;if(!force&&!/\s$/.test(value))return;
	const parsed=parseHataskCapture(value,{allowFolder:false,allowPriority:false});if(parsed.recognized.length===0)return;
	newEvent.value.title=parsed.title;
	if(parsed.date){newEvent.value.date=parsed.date;newEvent.value.dateEnd=parsed.date}
	if(parsed.time){newEvent.value.allDay=false;newEvent.value.timeStart=parsed.time;newEvent.value.timeEnd=clockPlusMinutes(parsed.time,60)}
}
function updateEventCapture(value:string):void{applyEventCaptureSyntax(value)}
const eventCaptureChips=computed<HataskCaptureChip[]>(()=>{
	const dateLabel=eventDateRangeLabel(newEvent.value);
	const timeLabel=newEvent.value.allDay?copy.allDay:`${newEvent.value.timeStart}–${newEvent.value.timeEnd}`;
	const visibilityLabel=newEvent.value.visibility==='public'?copy.public:copy.private;
	const chips:HataskCaptureChip[]=[{id:'date',label:dateLabel,icon:'ti ti-calendar-event',actionLabel:`${copy.dateAndTime}: ${dateLabel}`,actionIcon:'ti ti-pencil'}];
	chips.push({id:newEvent.value.allDay?'allDay':'time',label:timeLabel,icon:newEvent.value.allDay?'ti ti-sun':'ti ti-clock',actionLabel:`${copy.time}: ${timeLabel}`,actionIcon:'ti ti-pencil'});
	chips.push({id:'visibility',label:visibilityLabel,icon:newEvent.value.visibility==='public'?'ti ti-world':'ti ti-lock',actionLabel:`${copy.visibility}: ${visibilityLabel}`,actionIcon:'ti ti-arrows-exchange'});
	if(newEvent.value.recurrence.frequency!=='none'){const label=recurrenceLabel(newEvent.value.recurrence.frequency);chips.push({id:'recurrence',label,icon:'ti ti-repeat',actionLabel:`${plannerCopy.recurrence}: ${label}`,actionIcon:'ti ti-arrows-exchange'})}
	return chips;
});
const eventCaptureTools=computed<HataskCaptureTool[]>(()=>[
	{id:'date',label:copy.dateAndTime,icon:'ti ti-calendar-event'},
	{id:'all-day',label:copy.allDayFull,icon:'ti ti-sun',active:newEvent.value.allDay},
	{id:'visibility',label:copy.visibility,icon:newEvent.value.visibility==='public'?'ti ti-world':'ti ti-lock',active:newEvent.value.visibility==='public'},
	{id:'repeat',label:plannerCopy.recurrence,icon:'ti ti-repeat',active:newEvent.value.recurrence.frequency!=='none',disabled:newEvent.value.visibility==='public'},
	{id:'details',label:plannerCopy.moreDetails,icon:'ti ti-adjustments-horizontal',active:showEventDetails.value},
]);
function removeEventCaptureChip(id:string):void{
	if(id==='date'){newEvent.value.date=selectedDateStr.value||localDateKey();newEvent.value.dateEnd=newEvent.value.date}
	else if(id==='time'||id==='allDay')newEvent.value.allDay=!newEvent.value.allDay;
	else if(id==='visibility'){newEvent.value.visibility='private';newEvent.value.rsvp=false}
	else if(id==='recurrence')newEvent.value.recurrence.frequency='none';
}
function eventDurationDays():number{
	const start=parseIsoDate(newEvent.value.date);const end=parseIsoDate(newEvent.value.dateEnd||newEvent.value.date);
	return Math.max(0,Math.round((end.getTime()-start.getTime())/86400000));
}
function setEventStartDate(value:string):void{
	if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return;
	const duration=eventDurationDays();newEvent.value.date=value;newEvent.value.dateEnd=localDateKey(addCalendarDays(parseIsoDate(value),duration));
}
function setEventEndDate(value:string):void{
	if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return;newEvent.value.dateEnd=value<newEvent.value.date?newEvent.value.date:value;
}
function setEventStartTime(value:string):void{
	if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return;newEvent.value.allDay=false;newEvent.value.timeStart=value;
	if(newEvent.value.date===newEvent.value.dateEnd&&newEvent.value.timeEnd<=value){const next=clockPlusMinutes(value,60);newEvent.value.timeEnd=next;if(next<=value)newEvent.value.dateEnd=localDateKey(addCalendarDays(parseIsoDate(newEvent.value.date),1))}
}
function setEventEndTime(value:string):void{
	if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return;newEvent.value.allDay=false;newEvent.value.timeEnd=value;
	if(newEvent.value.date===newEvent.value.dateEnd&&value<newEvent.value.timeStart)newEvent.value.dateEnd=localDateKey(addCalendarDays(parseIsoDate(newEvent.value.date),1));
}
function toggleEventCaptureVisibility():void{
	newEvent.value.visibility=newEvent.value.visibility==='private'?'public':'private';
	if(newEvent.value.visibility==='private')newEvent.value.rsvp=false;else newEvent.value.recurrence.frequency='none';
}
async function handleEventCaptureChip(id:string):Promise<void>{
	if(id==='date'){eventCaptureEditor.value=eventCaptureEditor.value==='date'?null:'date';showEventDetails.value=false;showEventTemplates.value=false;return}
	if(id==='time'||id==='allDay'){eventCaptureEditor.value=eventCaptureEditor.value==='time'?null:'time';showEventDetails.value=false;showEventTemplates.value=false;return}
	if(id==='visibility'){toggleEventCaptureVisibility();return}
	if(id==='recurrence')await handleEventCaptureTool('repeat');
}
async function handleEventCaptureTool(id:string):Promise<void>{
	if (id === 'details') {
		if (showEventDetails.value) closeEventDetailsModal();
		else openEventDetailsModal();
		return;
	}
	if(id==='date'){eventCaptureEditor.value=eventCaptureEditor.value==='date'?null:'date';showEventDetails.value=false;showEventTemplates.value=false;return}
	if(id==='all-day'){eventCaptureEditor.value=eventCaptureEditor.value==='time'?null:'time';showEventDetails.value=false;showEventTemplates.value=false;return}
	if(id==='visibility'){toggleEventCaptureVisibility();return}
	if(id==='repeat'&&newEvent.value.visibility==='private'){const frequencies:HataskRecurrenceFrequency[]=['none','daily','weekly','monthly','yearly'];newEvent.value.recurrence.frequency=frequencies[(frequencies.indexOf(newEvent.value.recurrence.frequency)+1)%frequencies.length]}
}
async function saveEventCaptureAsTemplate():Promise<void>{
	applyEventCaptureSyntax(newEvent.value.title,true);const title=newEvent.value.title.trim();if(!title){eventCaptureRef.value?.focus();return}
	const {canceled,result}=await os.inputText({title:plannerCopy.saveTemplate,text:plannerCopy.templateNamePrompt,default:title,minLength:1,maxLength:80});const name=typeof result==='string'?result.trim():'';if(canceled||!name)return;
	const start=parseIsoDate(newEvent.value.date);const end=parseIsoDate(newEvent.value.dateEnd||newEvent.value.date);const durationDays=Math.max(0,Math.round((end.getTime()-start.getTime())/86400000));
	const template:HataskPlannerTemplate={id:generateId(),kind:'event',name,position:plannerTemplatePosition(),archivedAt:null,createdAt:new Date().toISOString(),payload:{title,emoji:newEvent.value.emoji,timeStart:newEvent.value.timeStart,timeEnd:newEvent.value.timeEnd,durationDays,allDay:newEvent.value.allDay,color:newEvent.value.color,notify:newEvent.value.notify,notifyTimings:[...newEvent.value.notifyTimings],recurrence:{...newEvent.value.recurrence}}};
	await savePlannerTemplates([...plannerTemplates.value,template]);os.toast(plannerCopy.templateSaved);
}
async function submitEventCapture():Promise<void>{
	applyEventCaptureSyntax(newEvent.value.title,true);if(!newEvent.value.title.trim()){eventCaptureRef.value?.focus();return}
	eventCaptureState.value='saving';const saved=await addEvent();eventCaptureState.value=saved?'success':'error';if(saved)window.setTimeout(()=>{if(eventCaptureState.value==='success')eventCaptureState.value='idle'},900);
}
function eDateTimeKey(event:{date:string;timeStart?:string;allDay?:boolean}):string{return`${event.date}T${event.allDay?'00:00':event.timeStart||'23:59'}`}
const upcomingEvents=computed(()=>allCalendarEvents.value.filter(e=>e.date>=td()).sort((a,b)=>eDateTimeKey(a).localeCompare(eDateTimeKey(b))));
const publicEvents=computed(()=>allCalendarEvents.value.filter(e=>e.visibility==='public'&&e.date>=td()));
function goToEvent(ev:any){activeTab.value='cal';const d=new Date(ev.date);calYear.value=d.getFullYear();calMonth.value=d.getMonth();selectedDay.value=d.getDate();viewingEvent.value=ev}
function eventApiPayload(event:any){
	return{title:event.title,emoji:event.emoji||'📅',date:event.date,dateEnd:event.dateEnd||'',timeStart:event.allDay?'':event.timeStart||'',timeEnd:event.allDay?'':event.timeEnd||'',allDay:Boolean(event.allDay),color:event.color||'#e27d60',rsvp:Boolean(event.rsvp)};
}
function isValidPlannerEventInput(event:any):boolean{
	const datePattern=/^\d{4}-\d{2}-\d{2}$/;
	if(!datePattern.test(event.date)||!datePattern.test(event.dateEnd||event.date))return false;
	const start=parseIsoDate(event.date);const end=parseIsoDate(event.dateEnd||event.date);
	if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||event.dateEnd<event.date)return false;
	if(!event.allDay&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(event.timeStart)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(event.timeEnd)))return false;
	if(!event.allDay&&event.date===event.dateEnd&&event.timeEnd<event.timeStart)return false;
	return true;
}
function resetEventEditor():void{
	editingEvent.value=null;
	newEvent.value={title:'',emoji:'⭐',date:selectedDateStr.value||td(),timeStart:'14:00',dateEnd:selectedDateStr.value||td(),timeEnd:'15:00',color:'#e27d60',visibility:'private',rsvp:false,notify:true,notifyTimings:['15分前','30分前'],allDay:false,recurrence:{frequency:'none',interval:1}};
	showEventDetails.value=false;showEventTemplates.value=false;eventCaptureEditor.value=null;
}
async function addEvent():Promise<boolean>{
	if(plannerReadOnly.value||!newEvent.value.title.trim())return false;
	const isEditing=editingEvent.value!=null;
	const previous=editingEvent.value as HataskPlannerEvent|null;
	const now=new Date().toISOString();
	const visibility:'private'|'public'=newEvent.value.visibility==='public'?'public':'private';
	const recurrence=visibility==='public'?{frequency:'none' as const,interval:1}:{...newEvent.value.recurrence};
	let nextEvent:HataskPlannerEvent={
		...(previous??{}),
		id:previous?.id||generateId(),
		clientEventId:previous?.clientEventId||previous?.id,
		title:newEvent.value.title.trim(),emoji:newEvent.value.emoji,date:newEvent.value.date,dateEnd:newEvent.value.dateEnd,
		color:newEvent.value.color,visibility,rsvp:newEvent.value.rsvp,notify:newEvent.value.notify,
		notifyTimings:[...newEvent.value.notifyTimings],allDay:newEvent.value.allDay,recurrence,
		archivedAt:previous?.archivedAt??null,createdAt:previous?.createdAt??now,updatedAt:now,
	};
	nextEvent.clientEventId=nextEvent.clientEventId||nextEvent.id;
	if(nextEvent.allDay){
		nextEvent.timeStart='';nextEvent.timeEnd='';
		nextEvent.timeLabel=nextEvent.date+(nextEvent.dateEnd!==nextEvent.date?` ~ ${nextEvent.dateEnd}`:'')+` ${copy.allDay}`;
	}else{
		nextEvent.timeStart=newEvent.value.timeStart;nextEvent.timeEnd=newEvent.value.timeEnd;
		nextEvent.timeLabel=`${nextEvent.date} ${nextEvent.timeStart} - ${nextEvent.timeEnd}`;
	}
	if(!isValidPlannerEventInput(nextEvent)){os.toast(plannerCopy.invalidEventSchedule);return false}

	const wasPublic=previous?.visibility==='public';
	let serverEventId=previous?.serverEventId;
	let serverEventRevision=String(previous?.serverEventRevision||'')||undefined;
	if(wasPublic&&!serverEventId){
		serverEventId=findUniqueOwnedServerId(previous)??undefined;
		const server=serverEventId?sharedEvents.value.find(event=>event.id===serverEventId):null;
		serverEventRevision=server?.revision;
	}
	try{
		if(wasPublic&&visibility==='private'){
		if(!serverEventId){os.toast(plannerCopy.publicSyncUnlinked);return false}
			nextEvent={...nextEvent,visibility:'public',serverEventId,serverEventRevision,publicSyncState:'deleting',pendingVisibility:'private'};
		}else if(wasPublic&&visibility==='public'){
			if(!serverEventId||!serverEventRevision){os.toast(plannerCopy.publicSyncUnlinked);return false}
			nextEvent={...nextEvent,serverEventId,serverEventRevision,publicSyncState:'updating'};
		}else if(!wasPublic&&visibility==='public'){
			nextEvent={...nextEvent,publicSyncState:'creating'};
		}

		const existingIndex=events.value.findIndex(event=>event.id===nextEvent.id);
		const nextEvents=[...events.value];
		if(existingIndex>=0)nextEvents.splice(existingIndex,1,nextEvent);else nextEvents.unshift(nextEvent);
		// 必ず先にintentを永続化する。外部API成功後のローカルCAS失敗でも次回再開できる。
		await registrySet('events',nextEvents);
		events.value=nextEvents;
		resetEventEditor();
		scheduleEventNotifications();
		await processPublicEventOutbox();
		const saved=events.value.find(event=>event.id===nextEvent.id);
		const publicSyncState=String(saved?.publicSyncState||'');
		const publicSyncPending=Boolean(publicSyncState);
		await loadSharedEvents();
		os.toast(publicSyncState==='conflict'?plannerCopy.publicSyncConflict:publicSyncState==='unlinked'?plannerCopy.publicSyncUnlinked:publicSyncState==='sync-error'?plannerCopy.publicSyncFailed:publicSyncPending?plannerCopy.publicSyncPending:isEditing?copy.eventUpdated:copy.eventSaved);

		if(!isEditing&&visibility==='public'&&nextEvent.rsvp&&!publicSyncPending){
			const timeInfo=nextEvent.allDay?`${nextEvent.date} ${copy.allDay}`:`${nextEvent.date} ${nextEvent.timeStart}〜${nextEvent.timeEnd}`;
			try{await misskeyApi('notes/create',{text:copyx.rsvpAnnouncement({emoji:nextEvent.emoji||'📅',title:nextEvent.title,time:timeInfo}),visibility:'home'})}catch(error){console.warn('RSVP announcement note failed:',error)}
		}
		return true;
	}catch(error){
		console.error('Hatask event save failed:',error);
		os.toast(plannerCopy.publicSyncFailed);
		return false;
	}
}

// Todo
const newTodo=ref('');const newTodoDue=ref('');const newTodoTime=ref('');const newTodoFolder=ref('');const newTodoComment=ref('');
const newTodoPriority=ref<'none'|'low'|'medium'|'high'>('none');
const newTodoRecurrence=ref<HataskRecurrenceFrequency>('none');
const newTodoSubtasks=ref<Array<{id:string;text:string;done:boolean}>>([]);
const newSubtaskText=ref('');
const todoCaptureRef=ref<{focus:()=>void}|null>(null);
const todoCaptureState=ref<'idle'|'saving'|'success'|'error'>('idle');
const todoCaptureEditor=ref<'schedule'|null>(null);
const showTodoExtra=ref(false);const activeFolder=ref('all');const showFolderMgr=ref(false);const showFolderCreate=ref(false);
const newFolderName=ref('');const newFolderEmoji=ref('📁');const newFolderColor=ref('');
const folderColors=computed(() => [{value:'#e57373',label:copy.colorRed},{value:'#ffb74d',label:copy.colorOrange},{value:'#fff176',label:copy.colorYellow},{value:'#81c784',label:copy.colorGreen},{value:'#64b5f6',label:copy.colorBlue},{value:'#ba68c8',label:copy.colorPurple}]);
const todos=ref<HataskPlannerTodo[]>([]);const folders=ref<HataskPlannerFolder[]>([]);
const activeFolders=computed(()=>folders.value.filter(folder=>folder.archivedAt==null).sort((a,b)=>(a.position??0)-(b.position??0)));
const pendingCount=computed(()=>todos.value.filter(t=>!t.done&&t.archivedAt==null).length);
function folderCount(fid:string){return todos.value.filter(t=>!t.done&&t.archivedAt==null&&t.folder===fid).length}
function getFolder(fid:string){return folders.value.find(f=>f.id===fid)}

function applyTodoCaptureSyntax(value:string,force=false):void{
	newTodo.value=value;
	if(!force&&!/\s$/.test(value))return;
	const parsed=parseHataskCapture(value,{folders:activeFolders.value,allowFolder:true,allowPriority:true});
	if(parsed.recognized.length===0)return;
	newTodo.value=parsed.title;
	if(parsed.date)newTodoDue.value=parsed.date;
	if(parsed.time)newTodoTime.value=parsed.time;
	if(parsed.folderId)newTodoFolder.value=parsed.folderId;
	if(parsed.priority)newTodoPriority.value=parsed.priority;
}
function updateTodoCapture(value:string):void{applyTodoCaptureSyntax(value)}
const todoCaptureChips=computed<HataskCaptureChip[]>(()=>{
	const chips:HataskCaptureChip[]=[];
	if(newTodoDue.value){const label=formatDue(newTodoDue.value);chips.push({id:'date',label,icon:'ti ti-calendar-event',actionLabel:`${copy.dueDate}: ${label}`,actionIcon:'ti ti-pencil'})}
	if(newTodoTime.value)chips.push({id:'time',label:newTodoTime.value,icon:'ti ti-clock',actionLabel:`${copy.time}: ${newTodoTime.value}`,actionIcon:'ti ti-pencil'});
	const folder=getFolder(newTodoFolder.value);if(folder)chips.push({id:'folder',label:folder.name,icon:'ti ti-folder-filled',color:folder.color,actionLabel:`${copy.folder}: ${folder.name}`,actionIcon:'ti ti-chevron-down'});
	if(newTodoPriority.value!=='none'){const label=plannerTodoPriorityLabel(newTodoPriority.value);chips.push({id:'priority',label,icon:'ti ti-flag-filled',actionLabel:`${plannerCopy.priority}: ${label}`,actionIcon:'ti ti-chevron-down'})}
	if(newTodoRecurrence.value!=='none'){const label=recurrenceLabel(newTodoRecurrence.value);chips.push({id:'recurrence',label,icon:'ti ti-repeat',actionLabel:`${plannerCopy.recurrence}: ${label}`,actionIcon:'ti ti-chevron-down'})}
	return chips;
});
const todoCaptureTools=computed<HataskCaptureTool[]>(()=>[
	{id:'date',label:copy.dueDate,icon:'ti ti-calendar-event',active:Boolean(newTodoDue.value)},
	{id:'folder',label:copy.folder,icon:'ti ti-folder',active:Boolean(newTodoFolder.value)},
	{id:'priority',label:plannerCopy.priority,icon:'ti ti-flag',active:newTodoPriority.value!=='none'},
	{id:'repeat',label:plannerCopy.recurrence,icon:'ti ti-repeat',active:newTodoRecurrence.value!=='none'},
	{id:'details',label:plannerCopy.moreDetails,icon:'ti ti-adjustments-horizontal',active:showTodoExtra.value},
]);
function plannerTodoPriorityLabel(priority:'none'|'low'|'medium'|'high'):string{return priority==='high'?plannerCopy.priorityHigh:priority==='medium'?plannerCopy.priorityMedium:priority==='low'?plannerCopy.priorityLow:plannerCopy.priorityNone}
function removeTodoCaptureChip(id:string):void{
	if(id==='date')newTodoDue.value='';
	else if(id==='time')newTodoTime.value='';
	else if(id==='folder')newTodoFolder.value='';
	else if(id==='priority')newTodoPriority.value='none';
	else if(id==='recurrence')newTodoRecurrence.value='none';
}
async function chooseTodoFolder():Promise<void>{
	const {canceled,result}=await os.actions({type:'question',title:copy.folder,actions:[{value:'',text:copy.noFolder},...activeFolders.value.map(folder=>({value:folder.id,text:`${folder.emoji||'📁'} ${folder.name}`}))]});
	if(!canceled&&typeof result==='string')newTodoFolder.value=result;
}
async function chooseTodoPriority():Promise<void>{
	const priorities=['none','low','medium','high'] as const;
	const {canceled,result}=await os.actions({type:'question',title:plannerCopy.priority,actions:priorities.map(value=>({value,text:plannerTodoPriorityLabel(value)}))});
	if(!canceled&&priorities.includes(result as typeof priorities[number]))newTodoPriority.value=result as typeof priorities[number];
}
async function chooseTodoRecurrence():Promise<void>{
	const frequencies:HataskRecurrenceFrequency[]=['none','daily','weekly','monthly','yearly'];
	const {canceled,result}=await os.actions({type:'question',title:plannerCopy.recurrence,actions:frequencies.map(value=>({value,text:recurrenceLabel(value)}))});
	if(!canceled&&frequencies.includes(result as HataskRecurrenceFrequency))newTodoRecurrence.value=result as HataskRecurrenceFrequency;
}
async function handleTodoCaptureChip(id:string):Promise<void>{
	if(id==='date'||id==='time'){todoCaptureEditor.value=todoCaptureEditor.value==='schedule'?null:'schedule';showTodoExtra.value=false;return}
	if(id==='folder'){await chooseTodoFolder();return}
	if(id==='priority'){await chooseTodoPriority();return}
	if(id==='recurrence')await chooseTodoRecurrence();
}
async function handleTodoCaptureTool(id:string):Promise<void>{
	if(id==='details'){showTodoExtra.value=!showTodoExtra.value;if(showTodoExtra.value)todoCaptureEditor.value=null;return}
	if(id==='date'){if(!newTodoDue.value)newTodoDue.value=localDateKey();todoCaptureEditor.value=todoCaptureEditor.value==='schedule'?null:'schedule';showTodoExtra.value=false;return}
	if(id==='folder'){await chooseTodoFolder();return}
	if(id==='priority'){await chooseTodoPriority();return}
	if(id==='repeat'){await chooseTodoRecurrence();return}
}

function openPlannerCaptureTemplates(kind: 'todo' | 'event', event: MouseEvent): void {
	if (plannerReadOnly.value || !plannerTemplatesLoaded.value) return;
	os.popupMenu([
		{ text: plannerCopy.useTemplates, icon: 'ti ti-template', action: () => {
			if (kind === 'todo') {
				templateKindFilter.value = 'todo';
				plannerTodoView.value = 'templates';
				showTodoExtra.value = false;
				todoCaptureEditor.value = null;
			} else {
				showEventTemplates.value = true;
				showEventDetails.value = false;
				eventCaptureEditor.value = null;
			}
		} },
		{ text: plannerCopy.saveTemplate, icon: 'ti ti-bookmark-plus', disabled: !(kind === 'todo' ? newTodo.value : newEvent.value.title).trim(), action: () => kind === 'todo' ? saveTodoCaptureAsTemplate() : saveEventCaptureAsTemplate() },
	], event.currentTarget as HTMLElement, { motionPreset: 'postform' });
}

const plannerTemplateLabels=computed<HataskTemplateLabels>(()=>({
	library:plannerCopy.templateLibrary,reusable:plannerCopy.reusableTemplates,filter:plannerCopy.filter,all:copy.all,todo:plannerCopy.todo,event:plannerCopy.calendar,
	empty:plannerCopy.noTemplates,emptyHint:plannerCopy.templateEmptyHint,useAction:plannerCopy.useTemplateAction,
	use:name=>plannerCopyx.useTemplateLabel({name}),duplicate:name=>plannerCopyx.duplicateTemplateLabel({name}),archive:name=>plannerCopyx.archiveTemplateLabel({name}),
	moveUp:name=>plannerCopyx.moveTemplateUpLabel({name}),moveDown:name=>plannerCopyx.moveTemplateDownLabel({name}),
}));
function plannerTemplatePosition():number{return plannerTemplates.value.reduce((maximum,template)=>Math.max(maximum,template.position??-1),-1)+1}
function todoTemplateDuePreset(date:string):'none'|'today'|'tomorrow'|'absolute'{
	if(!date)return'none';if(date===localDateKey())return'today';if(date===localDateKey(addCalendarDays(new Date(),1)))return'tomorrow';return'absolute';
}
function resolvedTodoTemplateDue(payload:Record<string,unknown>):string{
	if(payload.duePreset==='today')return localDateKey();
	if(payload.duePreset==='tomorrow')return localDateKey(addCalendarDays(new Date(),1));
	return payload.duePreset==='absolute'&&typeof payload.due==='string'?payload.due:'';
}
async function saveTodoCaptureAsTemplate():Promise<void>{
	applyTodoCaptureSyntax(newTodo.value,true);
	const text=newTodo.value.trim();if(!text){todoCaptureRef.value?.focus();return}
	const {canceled,result}=await os.inputText({title:plannerCopy.saveTemplate,text:plannerCopy.templateNamePrompt,default:text,minLength:1,maxLength:80});
	const name=typeof result==='string'?result.trim():'';if(canceled||!name)return;
	const duePreset=todoTemplateDuePreset(newTodoDue.value);
	const template:HataskPlannerTemplate={
		id:generateId(),kind:'todo',name,position:plannerTemplatePosition(),archivedAt:null,createdAt:new Date().toISOString(),
		payload:{text,duePreset,due:newTodoDue.value,dueLabel:newTodoDue.value?formatDue(newTodoDue.value):'',time:newTodoTime.value,folder:newTodoFolder.value,comment:newTodoComment.value,priority:newTodoPriority.value,subtasks:newTodoSubtasks.value.map(subtask=>({...subtask,id:generateId(),done:false})),recurrence:{frequency:newTodoRecurrence.value,interval:1}},
	};
	await savePlannerTemplates([...plannerTemplates.value,template]);os.toast(plannerCopy.templateSaved);
}
function loadTodoTemplate(template:HataskPlannerTemplate):void{
	const payload=template.payload;
	resetTodoEditor();
	newTodo.value=typeof payload.text==='string'?payload.text:template.name;
	newTodoDue.value=resolvedTodoTemplateDue(payload);
	newTodoTime.value=typeof payload.time==='string'?payload.time:'';
	newTodoFolder.value=typeof payload.folder==='string'&&activeFolders.value.some(folder=>folder.id===payload.folder)?payload.folder:'';
	newTodoComment.value=typeof payload.comment==='string'?payload.comment:'';
	newTodoPriority.value=payload.priority==='low'||payload.priority==='medium'||payload.priority==='high'?payload.priority:'none';
	const recurrence=payload.recurrence as {frequency?:unknown}|undefined;
	newTodoRecurrence.value=recurrence?.frequency==='daily'||recurrence?.frequency==='weekly'||recurrence?.frequency==='monthly'||recurrence?.frequency==='yearly'?recurrence.frequency:'none';
	newTodoSubtasks.value=Array.isArray(payload.subtasks)?payload.subtasks.flatMap(raw=>raw!=null&&typeof raw==='object'&&typeof (raw as {text?:unknown}).text==='string'?[{id:generateId(),text:(raw as {text:string}).text,done:false}]:[]):[];
	showTodoExtra.value=Boolean(newTodoDue.value||newTodoTime.value||newTodoFolder.value||newTodoComment.value||newTodoPriority.value!=='none'||newTodoRecurrence.value!=='none'||newTodoSubtasks.value.length);
	nextTick(()=>todoCaptureRef.value?.focus());
}
function loadEventTemplate(template:HataskPlannerTemplate):void{
	const payload=template.payload;activeTab.value='cal';resetEventEditor();
	const anchor=selectedDateStr.value||localDateKey();const durationDays=typeof payload.durationDays==='number'&&Number.isFinite(payload.durationDays)?Math.max(0,Math.floor(payload.durationDays)):0;
	const recurrence=payload.recurrence as {frequency?:unknown;interval?:unknown}|undefined;
	const frequency:HataskRecurrenceFrequency=recurrence?.frequency==='daily'||recurrence?.frequency==='weekly'||recurrence?.frequency==='monthly'||recurrence?.frequency==='yearly'?recurrence.frequency:'none';
	newEvent.value={
		...newEvent.value,title:typeof payload.title==='string'?payload.title:template.name,emoji:typeof payload.emoji==='string'?payload.emoji:'⭐',
		date:anchor,dateEnd:localDateKey(addCalendarDays(parseIsoDate(anchor),durationDays)),timeStart:typeof payload.timeStart==='string'?payload.timeStart:'14:00',timeEnd:typeof payload.timeEnd==='string'?payload.timeEnd:'15:00',
		color:typeof payload.color==='string'?payload.color:'#e27d60',visibility:'private',rsvp:false,notify:payload.notify!==false,notifyTimings:Array.isArray(payload.notifyTimings)?payload.notifyTimings.filter((item):item is string=>typeof item==='string'):['15分前'],allDay:payload.allDay===true,
		recurrence:{frequency,interval:typeof recurrence?.interval==='number'&&recurrence.interval>0?Math.floor(recurrence.interval):1},
	};
	showEventTemplates.value=false;
	nextTick(()=>eventCaptureRef.value?.focus());
}
function usePlannerTemplate(template:HataskPlannerTemplate):void{if(template.kind==='todo')loadTodoTemplate(template);else loadEventTemplate(template)}
async function duplicatePlannerTemplate(template:HataskPlannerTemplate):Promise<void>{
	const duplicate:HataskPlannerTemplate={...template,id:generateId(),name:plannerCopyx.templateCopyName({name:template.name}),position:plannerTemplatePosition(),createdAt:new Date().toISOString(),updatedAt:undefined,archivedAt:null,payload:{...template.payload}};
	await savePlannerTemplates([...plannerTemplates.value,duplicate]);
}
async function archivePlannerTemplate(template:HataskPlannerTemplate):Promise<void>{
	const {canceled}=await os.confirm({type:'warning',text:plannerCopyx.confirmArchiveTemplate({name:template.name})});if(canceled)return;
	const next=plannerTemplates.value.map(item=>item.id===template.id?{...item,archivedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}:item);await savePlannerTemplates(next);
}
async function movePlannerTemplate(template:HataskPlannerTemplate,direction:-1|1):Promise<void>{
	const visible=plannerTemplates.value.filter(item=>item.archivedAt==null&&(templateKindFilter.value==='all'||item.kind===templateKindFilter.value)).sort((a,b)=>a.position-b.position);
	const index=visible.findIndex(item=>item.id===template.id);const other=visible[index+direction];if(!other)return;
	const next=plannerTemplates.value.map(item=>item.id===template.id?{...item,position:other.position}:item.id===other.id?{...item,position:template.position}:item);await savePlannerTemplates(next);
}

// ===== Calendar / Todo redesign controlled models =====
const plannerTheme=computed<HataskPlannerTheme>(()=>{
	const theme=settings.value.theme;
	return theme==='kashin'||theme==='suri'||theme==='hatakyu'?theme:'kisetsu';
});
const plannerReadOnly=computed(()=>plannerStorageState.value!=='ready'&&plannerStorageState.value!=='saved');
const plannerCalendarView=ref<HataskCalendarView>('month');
const plannerCalendarFilterIds=ref<Array<'private'|'public'|'shared'>>(['private','public','shared']);

function addCalendarDays(date:Date,amount:number):Date{const next=new Date(date);next.setDate(next.getDate()+amount);return next}
function plannerAnchorDate():Date{return new Date(calYear.value,calMonth.value,selectedDay.value??1,12)}
function setPlannerAnchor(date:Date):void{calYear.value=date.getFullYear();calMonth.value=date.getMonth();selectedDay.value=date.getDate();viewingEvent.value=null}
function startOfPlannerWeek(date:Date):Date{
	const start=settings.value.weekStart==='sun'?0:1;
	return addCalendarDays(date,-((date.getDay()-start+7)%7));
}
const plannerWeekdays=computed<HataskCalendarWeekday[]>(()=>{
	const start=settings.value.weekStart==='sun'?new Date(2024,0,7):new Date(2024,0,1);
	return Array.from({length:7},(_,index)=>{const date=addCalendarDays(start,index);return{id:String(date.getDay()),label:weekdayShortFormatter.format(date),isWeekend:date.getDay()===0||date.getDay()===6}});
});
const plannerCalendarDates=computed<Date[]>(()=>{
	const anchor=plannerAnchorDate();
	if(plannerCalendarView.value==='month'){
		const first=new Date(calYear.value,calMonth.value,1,12);
		const start=startOfPlannerWeek(first);
		return Array.from({length:42},(_,index)=>addCalendarDays(start,index));
	}
	if(plannerCalendarView.value==='week'){
		const start=startOfPlannerWeek(anchor);
		return Array.from({length:7},(_,index)=>addCalendarDays(start,index));
	}
	if(plannerCalendarView.value==='day')return[anchor];
	return Array.from({length:30},(_,index)=>addCalendarDays(anchor,index));
});
function plannerEventSource(event:any):'private'|'public'|'shared'{
	const sourceId=event.sourceEventId||event.id;
	const local=events.value.find(item=>item.id===sourceId);
	return local?(local.visibility==='public'?'public':'private'):'shared';
}
function plannerEventForDate(date:string):any[]{
	return allCalendarEvents.value.filter(event=>{
		if(!plannerCalendarFilterIds.value.includes(plannerEventSource(event)))return false;
		return event.date===date||(event.dateEnd&&event.date<=date&&event.dateEnd>=date);
	}).sort((a,b)=>Number(b.allDay)-Number(a.allDay)||eDateTimeKey(a).localeCompare(eDateTimeKey(b)));
}
function plannerCalendarEvent(event:any):HataskCalendarEvent{
	const syncState=String(event.publicSyncState||'');
	const syncStatus=syncState==='conflict'?plannerCopy.conflict:syncState==='sync-error'?plannerCopy.syncFailed:syncState==='unlinked'?plannerCopy.syncUnlinked:['pending','creating','updating','deleting','deleting-local'].includes(syncState)?plannerCopy.syncPending:undefined;
	const sourceId=event.sourceEventId||event.id;
	const hasLocalSource=events.value.some(item=>item.id===sourceId||item.serverEventId===sourceId);
	return{
		id:event.id,
		title:event.title,
		emoji:event.emoji,
		color:event.color,
		timeLabel:eventTimeLabel(event),
		metaLabel:eventDateRangeLabel(event),
		ownerLabel:event.username?`@${event.username}`:undefined,
		statusLabel:syncStatus||(event.rsvpClosed?copy.closed:undefined),
		isAllDay:event.allDay,
		isShared:plannerEventSource(event)!=='private',
		readOnly:event.readOnly===true,
		draggable:hasLocalSource&&event.isRecurrenceOccurrence!==true,
		date:event.date,
		dateEnd:event.dateEnd||event.date,
		timeStart:event.timeStart||'',
		timeEnd:event.timeEnd||'',
	};
}
const plannerCalendarDays=computed<HataskCalendarDay[]>(()=>plannerCalendarDates.value.map(date=>{
	const key=localDateKey(date);
	const eventList=plannerEventForDate(key);
	return{
		key,
		date:key,
		label:longDateFormatter.format(date),
		dayNumber:date.getDate(),
		weekdayLabel:weekdayShortFormatter.format(date),
		isOutsideRange:plannerCalendarView.value==='month'&&date.getMonth()!==calMonth.value,
		isToday:key===localDateKey(),
		isSelected:key===selectedDateStr.value,
		events:eventList.map(plannerCalendarEvent),
		hiddenEventCount:Math.max(0,eventList.length-3),
	};
}));
const plannerCalendarTitle=computed(()=>{
	const dates=plannerCalendarDates.value;
	if(plannerCalendarView.value==='month')return calendarTitle.value;
	if(plannerCalendarView.value==='day')return dates[0]?longDateFormatter.format(dates[0]):calendarTitle.value;
	if(!dates.length)return calendarTitle.value;
	return`${monthDayFormatter.format(dates[0])} – ${monthDayFormatter.format(dates[dates.length-1])}`;
});
const plannerCalendarFilters=computed<HataskPlannerFilter[]>(()=>[
	{ id: 'private', icon: 'ti ti-lock', label: copy.private, active: plannerCalendarFilterIds.value.includes('private'), count: allCalendarEvents.value.filter(event => plannerEventSource(event) === 'private').length },
	{ id: 'public', icon: 'ti ti-world', label: copy.public, active: plannerCalendarFilterIds.value.includes('public'), count: allCalendarEvents.value.filter(event => plannerEventSource(event) === 'public').length },
	{ id: 'shared', icon: 'ti ti-users', label: copy.organizer, active: plannerCalendarFilterIds.value.includes('shared'), count: allCalendarEvents.value.filter(event => plannerEventSource(event) === 'shared').length },
]);
const plannerCalendarLabels=computed<HataskCalendarLabels>(()=>({
	calendar:plannerCopy.calendar,
	viewSelector:plannerCopy.calendar,
	views:{month:plannerCopy.month,week:plannerCopy.week,day:plannerCopy.day,agenda:plannerCopy.agenda},
	previousPeriod:plannerCopy.previous,
	nextPeriod:plannerCopy.next,
	today:plannerCopy.today,
	filters:plannerCopy.filters,
	allDay:copy.allDay,
	loading:plannerCopy.loading,
	empty:plannerCopy.empty,
	readOnly:plannerStorageDetail.value||plannerCopy.readOnly,
	selectedDay:plannerCopy.selectedDay,
	dragHint:plannerCopy.dragHint,
	trashHint:plannerCopy.trashHint,
		selectDate:dateLabel=>plannerCopyx.selectDateLabel({date:dateLabel}),
		openEvent:eventTitle=>plannerCopyx.openEventLabel({title:eventTitle}),
		editEvent:eventTitle=>plannerCopyx.editEventLabel({title:eventTitle}),
	moveEvent:eventTitle=>plannerCopyx.moveEventLabel({title:eventTitle}),
	showMore:count=>plannerCopyx.showMore({count:count.toString()}),
}));
function navigatePlannerCalendar(direction:'previous'|'next'|'today'):void{
	if(direction==='today'){goToday();return}
	const amount=direction==='previous'?-1:1;
	if(plannerCalendarView.value==='month'){chMo(amount);selectedDay.value=1;return}
	const days=plannerCalendarView.value==='week'?7:plannerCalendarView.value==='agenda'?30:1;
	setPlannerAnchor(addCalendarDays(plannerAnchorDate(),amount*days));
}
function selectPlannerDate(day:HataskCalendarDay):void{const date=parseIsoDate(day.date);setPlannerAnchor(date);newEvent.value.date=day.date;newEvent.value.dateEnd=day.date}
function showPlannerDay(day:HataskCalendarDay):void{selectPlannerDate(day);plannerCalendarView.value='day'}
function findPlannerCalendarSource(event:HataskCalendarEvent):any{return allCalendarEvents.value.find(item=>item.id===event.id)}
function activatePlannerEvent(event:HataskCalendarEvent,day:HataskCalendarDay):void{selectPlannerDate(day);const source=findPlannerCalendarSource(event);if(source)openEventDetail(source)}
	function plannerScrollBehavior():ScrollBehavior{return settings.value.animations===false||hkReduced()?'auto':'smooth'}

function editPlannerEvent(event: HataskCalendarEvent, day: HataskCalendarDay): void {
	if (plannerReadOnly.value) return;
	selectPlannerDate(day);
	const source = findPlannerCalendarSource(event);
	if (source) startEditEvent(source);
}

function togglePlannerCalendarFilter(filterId:string):void{if(filterId!=='private'&&filterId!=='public'&&filterId!=='shared')return;const index=plannerCalendarFilterIds.value.indexOf(filterId);if(index>=0){if(plannerCalendarFilterIds.value.length>1)plannerCalendarFilterIds.value.splice(index,1)}else plannerCalendarFilterIds.value.push(filterId)}

type PendingCalendarAction={mode:'reschedule'|'trash';event:HataskCalendarEvent;targetDate?:string;targetTime?:string};
const pendingCalendarAction=ref<PendingCalendarAction|null>(null);
const calendarMoveDialogLabels=computed<HataskEventMoveDialogLabels>(()=>({
	moveEyebrow:plannerCopy.reschedule,moveTitle:plannerCopy.moveOrCopy,moveDescription:plannerCopy.moveOrCopyDescription,move:plannerCopy.moveEvent,moveHint:plannerCopy.moveEventHint,copy:plannerCopy.copyEvent,copyHint:plannerCopy.copyEventHint,
	trashEyebrow:plannerCopy.trash,trashTitle:plannerCopy.trashEventTitle,trashDescription:plannerCopy.trashEventDescription,trash:plannerCopy.trash,cancel:copy.cancel,
}));
function calendarActionLabel(date:string|undefined,time:string|undefined):string{return date?`${formatSearchDate(date)}${time?` ${time}`:''}`:''}
const pendingCalendarActionSourceLabel=computed(()=>calendarActionLabel(pendingCalendarAction.value?.event.date,pendingCalendarAction.value?.event.isAllDay?undefined:pendingCalendarAction.value?.event.timeStart));
const pendingCalendarActionTargetLabel=computed(()=>calendarActionLabel(pendingCalendarAction.value?.targetDate,pendingCalendarAction.value?.event.isAllDay?undefined:pendingCalendarAction.value?.targetTime||pendingCalendarAction.value?.event.timeStart));
function handleCalendarEventDrop(event:HataskCalendarEvent,day:HataskCalendarDay,time?:string):void{
	if(plannerReadOnly.value||event.draggable===false)return;
	const targetTime=event.isAllDay?undefined:time;
	if(event.date===day.date&&(targetTime==null||targetTime===event.timeStart))return;
	pendingCalendarAction.value={mode:'reschedule',event,targetDate:day.date,...(targetTime?{targetTime}:{})};
}
async function handleCalendarMoveRequest(event:HataskCalendarEvent):Promise<void>{
	if(plannerReadOnly.value||event.draggable===false)return;
	const {canceled,result}=await os.inputText({title:plannerCopy.reschedule,text:plannerCopy.dateInputHint,default:event.date||localDateKey(),maxLength:10});
	const date=typeof result==='string'?result.trim():'';if(canceled)return;if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){os.toast(plannerCopy.invalidDate);return}
	let targetTime:string|undefined;
	if(!event.isAllDay){const timeResult=await os.inputText({title:copy.time,text:plannerCopy.timeInputHint,default:event.timeStart||'09:00',maxLength:5});if(timeResult.canceled)return;const value=typeof timeResult.result==='string'?timeResult.result.trim():'';if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)){os.toast(plannerCopy.invalidTime);return}targetTime=value}
	pendingCalendarAction.value={mode:'reschedule',event,targetDate:date,...(targetTime?{targetTime}:{})};
}
function handleCalendarEventTrash(event:HataskCalendarEvent):void{if(!plannerReadOnly.value&&event.draggable!==false)pendingCalendarAction.value={mode:'trash',event}}
function calendarLocalSource(event:HataskCalendarEvent):HataskPlannerEvent|undefined{
	const occurrence=findPlannerCalendarSource(event);const sourceId=occurrence?.sourceEventId||event.id;
	return events.value.find(item=>item.id===sourceId||item.serverEventId===sourceId);
}
function calendarDayDistance(from:string,to:string):number{return Math.round((parseIsoDate(to).getTime()-parseIsoDate(from).getTime())/86400000)}
function eventScheduleAt(source:HataskPlannerEvent,targetDate:string,targetTime?:string):Pick<HataskPlannerEvent,'date'|'dateEnd'|'timeStart'|'timeEnd'>{
	const endDate=source.dateEnd||source.date;const daySpan=Math.max(0,calendarDayDistance(source.date,endDate));
	if(source.allDay)return{date:targetDate,dateEnd:localDateKey(addCalendarDays(parseIsoDate(targetDate),daySpan)),timeStart:'',timeEnd:''};
	const startMinutes=Number(source.timeStart?.slice(0,2)||9)*60+Number(source.timeStart?.slice(3,5)||0);
	const endMinutes=Number(source.timeEnd?.slice(0,2)||10)*60+Number(source.timeEnd?.slice(3,5)||0);
	const duration=Math.max(15,daySpan*1440+endMinutes-startMinutes);
	const nextStart=targetTime&&/^\d{2}:\d{2}$/.test(targetTime)?Number(targetTime.slice(0,2))*60+Number(targetTime.slice(3,5)):startMinutes;
	const totalEnd=nextStart+duration;const endOffset=Math.floor(totalEnd/1440);const nextEnd=totalEnd%1440;
	return{date:targetDate,dateEnd:localDateKey(addCalendarDays(parseIsoDate(targetDate),endOffset)),timeStart:`${String(Math.floor(nextStart/60)).padStart(2,'0')}:${String(nextStart%60).padStart(2,'0')}`,timeEnd:`${String(Math.floor(nextEnd/60)).padStart(2,'0')}:${String(nextEnd%60).padStart(2,'0')}`};
}
async function applyCalendarReschedule(action:PendingCalendarAction,choice:'move'|'copy'):Promise<void>{
	const source=calendarLocalSource(action.event);if(!source||!action.targetDate){os.toast(plannerCopy.publicSyncUnlinked);return}
	const schedule=eventScheduleAt(source,action.targetDate,action.targetTime);const now=new Date().toISOString();
	if(choice==='copy'){
		const duplicate:HataskPlannerEvent={...source,...schedule,id:generateId(),clientEventId:undefined,serverEventId:undefined,serverEventRevision:undefined,publicSyncState:undefined,pendingVisibility:undefined,visibility:'private',rsvp:false,recurrence:{frequency:'none',interval:1},createdAt:now,updatedAt:now,archivedAt:null};
		duplicate.clientEventId=duplicate.id;
		const next=[duplicate,...events.value];await registrySet('events',next);events.value=next;scheduleEventNotifications();setPlannerAnchor(parseIsoDate(action.targetDate));os.toast(plannerCopy.eventCopied);return;
	}
	let moved:HataskPlannerEvent={...source,...schedule,updatedAt:now};
	if(source.visibility==='public'){
		let serverEventId=source.serverEventId;let serverEventRevision=source.serverEventRevision;
		if(!serverEventId){serverEventId=findUniqueOwnedServerId(source)??undefined;const server=serverEventId?sharedEvents.value.find(event=>event.id===serverEventId):null;serverEventRevision=server?.revision}
		if(!serverEventId||!serverEventRevision){os.toast(plannerCopy.publicSyncUnlinked);return}
		moved={...moved,serverEventId,serverEventRevision,publicSyncState:'updating'};
	}
	const next=events.value.map(event=>event.id===source.id?moved:event);await registrySet('events',next);events.value=next;scheduleEventNotifications();setPlannerAnchor(parseIsoDate(action.targetDate));
	if(source.visibility==='public'){
		await processPublicEventOutbox();await loadSharedEvents();
		const syncState=events.value.find(event=>event.id===source.id)?.publicSyncState;
		os.toast(syncState==='conflict'?plannerCopy.publicSyncConflict:syncState==='unlinked'?plannerCopy.publicSyncUnlinked:syncState==='sync-error'?plannerCopy.publicSyncFailed:syncState?plannerCopy.publicSyncPending:plannerCopy.eventMoved);
		return;
	}
	os.toast(plannerCopy.eventMoved);
}
async function resolveCalendarAction(choice:'move'|'copy'|'trash'|'cancel'):Promise<void>{
	const action=pendingCalendarAction.value;pendingCalendarAction.value=null;if(!action||choice==='cancel')return;
	if(choice==='trash'){await deleteEventById(action.event.id,{skipConfirm:true});return}
	if(action.mode==='reschedule')await applyCalendarReschedule(action,choice);
}

// 期限なしを含む既存Todoは「すべて」で必ず辿れる。スマートビューは表示だけを切り替え、
// 配列そのものや手動順を並べ替えて保存しない。
const plannerTodoView=ref<HataskTodoView>('all');
const plannerTodoSearch=ref('');

const plannerTodoMobileTabOrder = computed(() => normalizeHataskTodoMobileTabs(settings.value.todoMobileTabOrder));

async function setPlannerTodoMobileTabOrder(next: HataskTodoMobileTab[]): Promise<void> {
	if (!loadedKeys.has('settings')) return;
	settings.value.todoMobileTabOrder = normalizeHataskTodoMobileTabs(next);
	await saveSettings();
}

const lastArchivedTodoId=ref<string|null>(null);
let archiveUndoTimer:number|null=null;
function isTodoArchived(todo:HataskPlannerTodo):boolean{return todo.archivedAt!=null}
function todoMatchesView(todo:HataskPlannerTodo,view:HataskTodoView):boolean{
	const today=localDateKey();
	if(view==='templates')return false;
	if(view==='completed')return todo.done||isTodoArchived(todo);
	if(isTodoArchived(todo)||todo.done)return false;
	if(view==='today')return todo.due===today;
	if(view==='upcoming')return Boolean(todo.due&&todo.due>today);
	if(view==='overdue')return Boolean(todo.due&&todo.due<today);
	if(view==='priority')return todo.priority!=='none';
	return true;
}
const plannerTodoViewCounts=computed<Record<HataskTodoView,number>>(()=>({
	today:todos.value.filter(todo=>todoMatchesView(todo,'today')).length,
	upcoming:todos.value.filter(todo=>todoMatchesView(todo,'upcoming')).length,
	overdue:todos.value.filter(todo=>todoMatchesView(todo,'overdue')).length,
	priority:todos.value.filter(todo=>todoMatchesView(todo,'priority')).length,
	all:todos.value.filter(todo=>todoMatchesView(todo,'all')).length,
	completed:todos.value.filter(todo=>todoMatchesView(todo,'completed')).length,
	templates:plannerTemplates.value.filter(template=>template.kind==='todo'&&template.archivedAt==null).length,
}));
const plannerTodoSortContext=computed(()=>`${plannerTodoView.value}:${activeFolder.value}`);
const currentTodoSort=computed<HataskTodoSort>(()=>{
	const candidate=settings.value.todoSortModes?.[plannerTodoSortContext.value];
	return candidate==='dueAsc'||candidate==='priority'||candidate==='createdDesc'?candidate:'manual';
});
function todoTimestamp(value:unknown):number{
	if(typeof value==='number'&&Number.isFinite(value))return value;
	if(typeof value==='string'){const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:0}
	return 0;
}
function comparePlannerTodos(a:HataskPlannerTodo,b:HataskPlannerTodo):number{
	if(currentTodoSort.value==='dueAsc')return String(a.due||'9999-99-99').localeCompare(String(b.due||'9999-99-99'))||String(a.time||'99:99').localeCompare(String(b.time||'99:99'))||(a.position??0)-(b.position??0);
	if(currentTodoSort.value==='priority'){
		const rank={high:0,medium:1,low:2,none:3} as const;
		return rank[a.priority]-rank[b.priority]||String(a.due||'9999-99-99').localeCompare(String(b.due||'9999-99-99'))||(a.position??0)-(b.position??0);
	}
	if(currentTodoSort.value==='createdDesc')return todoTimestamp(b.createdAt)-todoTimestamp(a.createdAt)||(a.position??0)-(b.position??0);
	return(a.position??0)-(b.position??0)||String(a.due||'9999-99-99').localeCompare(String(b.due||'9999-99-99'));
}
async function setPlannerTodoSort(next:HataskTodoSort):Promise<void>{
	settings.value.todoSortModes={...(settings.value.todoSortModes||{}),[plannerTodoSortContext.value]:next};
	await saveSettings();
}
const plannerFilteredTodos=computed(()=>{
	const query=plannerTodoSearch.value.trim().toLocaleLowerCase(versatileLang);
	return todos.value.filter(todo=>{
		if(!todoMatchesView(todo,plannerTodoView.value))return false;
		if(activeFolder.value!=='all'&&todo.folder!==activeFolder.value)return false;
		return!query||`${todo.text}\n${todo.comment||''}`.toLocaleLowerCase(versatileLang).includes(query);
	}).sort(comparePlannerTodos);
});
const plannerTodoItems=computed<HataskTodoItem[]>(()=>plannerFilteredTodos.value.map((todo,index)=>{
	const folder=getFolder(todo.folder||'');
	return{
		id:todo.id,text:todo.text,done:todo.done,due:todo.due,time:todo.time,dueLabel:todo.due?formatDue(todo.due,todo.time):undefined,
		folder:todo.folder,folderLabel:folder?.name,folderEmoji:folder?.emoji,comment:todo.comment,commentPreview:todo.comment?.split('\n')[0],
		priority:todo.priority||'none',recurrenceLabel:recurrenceLabel(todo.recurrence?.frequency||'none'),subtasks:todo.subtasks||[],archivedAt:todo.archivedAt,
		archivedLabel:todo.archivedAt?formatSearchDate(localDateKey(new Date(todo.archivedAt))):undefined,canMoveUp:index>0,canMoveDown:index<plannerFilteredTodos.value.length-1,
	};
}));
const plannerTodoFilters=computed<HataskPlannerFilter[]>(()=>[
	...activeFolders.value.map(folder=>({id:`folder:${folder.id}`,kind:'folder' as const,label:folder.name,emoji:folder.emoji,active:activeFolder.value===folder.id,color:folder.color,count:folderCount(folder.id)})),
]);
const plannerTodoLabels=computed<HataskTodoLabels>(()=>({
		todo:plannerCopy.todo,viewSelector:plannerCopy.organizeTodo,views:{today:plannerCopy.todoToday,upcoming:plannerCopy.todoUpcoming,overdue:plannerCopy.todoOverdue,priority:plannerCopy.todoPriority,all:plannerCopy.todoAll,completed:plannerCopy.todoCompleted,templates:plannerCopy.todoTemplates},
	search:plannerCopy.search,searchPlaceholder:copy.newTaskPlaceholder,addTask:plannerCopy.add,filters:plannerCopy.filter,loading:plannerCopy.loading,empty:copy.noTasks,readOnly:plannerStorageDetail.value||plannerCopy.readOnly,
	priorities:{none:plannerCopy.priorityNone,low:plannerCopy.priorityLow,medium:plannerCopy.priorityMedium,high:plannerCopy.priorityHigh},
		completeTask:title=>plannerCopyx.completeTaskLabel({title}),reopenTask:title=>plannerCopyx.reopenTaskLabel({title}),editTask:title=>plannerCopyx.editTaskLabel({title}),
		archiveTask:title=>plannerCopyx.archiveTaskLabel({title}),restoreTask:title=>plannerCopyx.restoreTaskLabel({title}),deleteTask:title=>plannerCopyx.deleteTaskLabel({title}),
		moveUp:title=>plannerCopyx.moveTaskUpLabel({title}),moveDown:title=>plannerCopyx.moveTaskDownLabel({title}),
	subtaskProgress:(completed,total)=>plannerCopyx.subtaskProgress({completed:completed.toString(),total:total.toString()}),
	sort:plannerCopy.sort,sortOptions:{manual:plannerCopy.sortManual,dueAsc:plannerCopy.sortDueAsc,priority:plannerCopy.sortPriority,createdDesc:plannerCopy.sortCreatedDesc},folders:plannerCopy.folders,
		selectedCount:count=>plannerCopyx.selectedCount({count:count.toString()}),bulkComplete:plannerCopy.bulkComplete,bulkMove:plannerCopy.bulkMove,bulkDue:plannerCopy.bulkDue,bulkPriority:plannerCopy.bulkPriority,bulkArchive:plannerCopy.bulkArchive,clearSelection:plannerCopy.clearSelection,
			addFolder:plannerCopy.addFolder,manageFolder:name=>plannerCopyx.manageFolderLabel({name}),moreActions:title=>plannerCopyx.moreTaskActionsLabel({title}),moreViews:plannerCopy.todoMore,reorderViews:plannerCopy.reorderTodoTabs,reorderView:viewName=>plannerCopyx.reorderTodoTabLabel({name:viewName}),
	customizeViews: plannerCopy.customizeTodoTabs,
	customizeViewsHint: plannerCopy.customizeTodoTabsHint,
	showView: name => plannerCopyx.showTodoTabLabel({ name }),
	hideView: name => plannerCopyx.hideTodoTabLabel({ name }),
	}));
function recurrenceLabel(frequency:HataskRecurrenceFrequency):string{return frequency==='daily'?plannerCopy.recurrenceDaily:frequency==='weekly'?plannerCopy.recurrenceWeekly:frequency==='monthly'?plannerCopy.recurrenceMonthly:frequency==='yearly'?plannerCopy.recurrenceYearly:plannerCopy.recurrenceNone}
function plannerTodoSource(item:HataskTodoItem):HataskPlannerTodo|undefined{return todos.value.find(todo=>todo.id===item.id)}
function focusTodoEditor():void{if(plannerReadOnly.value)return;todoCaptureRef.value?.focus()}
function togglePlannerTodoFilter(filterId:string):void{
	if(filterId.startsWith('folder:')){const folderId=filterId.slice(7);activeFolder.value=activeFolder.value===folderId?'all':folderId;return}
}

// Mood
const moodJournalRows = ref<unknown[]>([]);
const moods = computed<any[]>(() => moodJournalRows.value.filter(row => isJournalEntry(row, 'mood')));

// Meal(食事記録) - mood と並列。医療目的ではない自己記録メモ。集計の数値化・スコア化はしない
const mealJournalRows = ref<unknown[]>([]);
const meals = computed<any[]>(() => mealJournalRows.value.filter(row => isJournalEntry(row, 'meal')));
const mealTemplates = ref<unknown[]>([]);
const journalValidKeys = ref<string[]>([]);
const showMealDisclaimer=ref(false);
// サマリーは数値評価を出さない。記録した行為そのものを中立に肯定する労いのみ
const mealTodayCount=computed(()=>{const today=localDateKey();return meals.value.filter(m=>m.date===today).length});
// 旗鯖fork(ハタキュ): コルク板の「ごはん記録」紙に貼る今日の分。⚠️多すぎると紙が伸びるので3件まで。
const hkTodayMeals=computed(()=>{const today=localDateKey();return meals.value.filter(m=>m.date===today).slice(0,3)});
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
  const today=localDateKey();
  return todos.value.filter(t=>t.done&&t.doneAt&&localDateKey(new Date(t.doneAt))===today).length;
});
const mealSummaryMessage=computed(()=>{const c=mealTodayCount.value;if(c===0)return copy.mealSummaryNone;if(c===1)return copy.mealSummaryOne;return copy.mealSummaryMany});

// ===== PAGINATION =====
const ITEMS_PER_PAGE = 10;
const eventPage = ref(1);
const calListPage = ref(1);

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

const weekMoods=computed(()=>{const now=new Date();const mon=new Date(now);mon.setDate(now.getDate()-((now.getDay()+6)%7));mon.setHours(0,0,0,0);return Array.from({ length: 7 },(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);const ds=d.toISOString().slice(0,10);const last=moods.value.filter(m=>m.date===ds).pop();return{day: weekdayShortFormatter.format(d),icon:last?moodIcons[last.level]:''};})});

// Garden
type FlowerVisibility = 'public' | 'followers' | 'private';
type CommunityFlower = { id: string; clientFlowerId?: string; emoji: string; name: string; hanakotoba?: string; harvestedAt: string; isOwner?: boolean; user?: Misskey.entities.UserLite };
const flower = ref<HataskGrowingFlower>(createHataskGrowingFlower({ emoji: '🌱', name: 'わかば' }));
const gallery=ref<any[]>([]);
const flowerVisibility = ref<FlowerVisibility>('public');
const flowerVisibilityOptions = computed(() => [
	{ value: 'public' as const, icon: 'ti-world', label: copy.flowerVisibilityPublic },
	{ value: 'followers' as const, icon: 'ti-users', label: copy.flowerVisibilityFollowers },
	{ value: 'private' as const, icon: 'ti-lock', label: copy.flowerVisibilityPrivate },
]);
const galleryPage = ref(1);
const galleryOrder = ref<'newest' | 'oldest'>('newest');
const GALLERY_PAGE_SIZE = 12;
const galleryTotalPages = computed(() => Math.max(1, Math.ceil(gallery.value.length / GALLERY_PAGE_SIZE)));
const sortedGallery = computed(() => [...gallery.value].sort((a, b) => {
	const aTime = Date.parse(stableHarvestedAt(a));
	const bTime = Date.parse(stableHarvestedAt(b));
	return galleryOrder.value === 'newest' ? bTime - aTime : aTime - bTime;
}));
const pagedGallery = computed(() => sortedGallery.value.slice((galleryPage.value - 1) * GALLERY_PAGE_SIZE, galleryPage.value * GALLERY_PAGE_SIZE));
const communityFlowers = ref<CommunityFlower[]>([]);
const communityFlowerPage = ref(1);
const communityFlowerOrder = ref<'newest' | 'oldest'>('newest');
const communityFlowerTotalPages = ref(1);
const communityFlowersLoading = ref(false);
const communityFlowersError = ref(false);

watch([activeTab, communityFlowerPage, communityFlowerOrder], ([tab]) => {
	if (tab === 'garden' && dataLoaded.value) {
		if (skipNextCommunityFlowerWatch) {
			skipNextCommunityFlowerWatch = false;
			return;
		}
		void loadCommunityFlowers();
	}
});

function normalizeFlowerDate(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const text = value.trim();
	if (!text) return null;
	if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
		const date = new Date(text);
		return Number.isFinite(date.getTime()) ? date.toISOString() : null;
	}
	const match = /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/.exec(text);
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const timestamp = Date.UTC(year, month - 1, day);
	const date = new Date(timestamp);
	if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
	return date.toISOString();
}
function stableHarvestedAt(item: { harvestedAt?: unknown; date?: unknown }): string {
	const harvestedAt = normalizeFlowerDate(item.harvestedAt);
	if (harvestedAt) return harvestedAt;
	const legacyDate = normalizeFlowerDate(item.date);
	if (legacyDate) return legacyDate;
	return new Date().toISOString();
}
function normalizeLocalFlowerGallery(value: unknown): { items: any[]; changed: boolean } {
	if (!Array.isArray(value)) return { items: [], changed: value != null };
	let changed = false;
	const items = value.filter((item): item is Record<string, unknown> => item != null && typeof item === 'object').map((item, index) => {
		const harvestedAt = stableHarvestedAt(item);
		if (item.harvestedAt !== harvestedAt) changed = true;
		return { ...item, id: typeof item.id === 'string' && item.id ? item.id : `flower-${index}`, harvestedAt, date: typeof item.date === 'string' ? item.date : harvestedAt };
	});
	return { items, changed: changed || items.length !== value.length };
}

function onHataskFlowerGrowth(event: Event): void {
	const next = (event as CustomEvent<HataskGrowingFlower>).detail;
	const normalized = normalizeHataskGrowingFlower(next);
	if (normalized) flower.value = normalized;
}
const currentFlowerDisplayName=computed(() => localizeFloraName(flower.value.name));
function formatMinutes(m:number){const h=Math.floor(m/60);const mm=m%60;return h>0?copyx.hoursMinutes({ hours: h.toString(), minutes: mm.toString() }) : copyx.minutes({ minutes: mm.toString() })}
const estimateRemaining=computed(()=>{const rem=Math.max(0,flower.value.targetMinutes-flower.value.totalMinutes);const h=Math.floor(rem/60);return h>0?copyx.hours({ hours: h.toString() }):copy.soon});
function formatFlowerDate(item: { harvestedAt?: string; date?: string }): string {
	const value = item.harvestedAt ?? item.date;
	const normalized = normalizeFlowerDate(value);
	if (!normalized) return copy.unknownDate;
	return longDateFormatter.format(new Date(normalized));
}

// Search
const searchQuery=ref('');const searchInput=ref<HTMLInputElement|null>(null);
const searchResults = computed(() => {
	const q = searchQuery.value.toLowerCase();
	return {
		todos: todos.value.filter(t => t.text.toLowerCase().includes(q) || (t.comment && t.comment.toLowerCase().includes(q))).slice(0, 5),
		moods: moods.value.filter(m => (m.note ?? '').toLowerCase().includes(q)).slice(0, 5),
		events: events.value.filter(event => event.title.toLowerCase().includes(q)).slice(0, 5),
	};
});
const recentMoodsForSearch=computed(()=>moods.value.slice(0,3));
function formatSearchDate(d:string):string{const dd=parseIsoDate(d);const now=new Date();now.setHours(0,0,0,0);const day=new Date(dd); day.setHours(0, 0, 0, 0); const diff=Math.floor((now.getTime()-day.getTime())/(86400000));if(diff===0)return copy.today;if(diff===1)return copy.yesterday;return monthDayFormatter.format(dd)}
watch(showSearch,v=>{if(v)nextTick(()=>searchInput.value?.focus())});

// Helpers
function generateId():string{return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function formatDue(d:string,t?:string):string{const todayDate=new Date();todayDate.setHours(0,0,0,0);const x=parseIsoDate(d);x.setHours(0,0,0,0);let l='';if(x.getTime()===todayDate.getTime())l=copy.today;else{const tomorrow=new Date(todayDate);tomorrow.setDate(tomorrow.getDate()+1);if(x.getTime()===tomorrow.getTime())l=copy.tomorrow;else l=monthDayFormatter.format(x)}if(t)l+=' '+t;return l}
function isDueToday(d:string):boolean{return d===localDateKey()}
function isOverdue(d:string):boolean{return /^\d{4}-\d{2}-\d{2}$/.test(d)&&d<localDateKey()}

// ========== GREETING SYSTEM (500+ variations) ==========
// Eye page computed stats
const todoCompletionRate=computed(()=>{if(todos.value.length===0)return 0;return Math.round(todos.value.filter(t=>t.done).length/todos.value.length*100)});
const weeklyTaskProgress=computed(()=>{const now=new Date();const weekAgo=new Date(now.getTime()-7*86400000);const weekTodos=todos.value.filter(t=>t.createdAt&&new Date(t.createdAt)>=weekAgo);if(weekTodos.length===0)return 0;return Math.round(weekTodos.filter(t=>t.done).length/weekTodos.length*100)});
const monthlyMoodCount=computed(()=>{const now=new Date();const ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;return moods.value.filter(m=>{const d=new Date(m.date||m.createdAt);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===ym}).length});
const monthlyMoodProgress=computed(()=>{const now=new Date();const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();return Math.min(100,Math.round(monthlyMoodCount.value/daysInMonth*100))});
const currentFlowerHanakotoba=computed(()=>{const flora=floraData.find(f=>f.emoji===flower.value.emoji);return flora?.hanakotoba?localizeHanakotoba(flora.hanakotoba) : ''});
const galleryWithHanakotoba=computed(()=>gallery.value.filter(fl=>fl.hanakotoba).slice(0,20));

// Hatask Eye phrase system
function updateEyePhrase(){
try {
const pc=todos.value.filter(t=>!t.done).length;
const todayStr=localDateKey();
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
try{await misskeyApi('hatask/events/rsvp',{eventId:plannerEventServerId(eventId),status});await loadSharedEvents();os.toast(status==='going'?copy.rsvpGoingSaved:status==='maybe'?copy.rsvpMaybeSaved:copy.rsvpDeclinedSaved)}catch(e){console.error('RSVP failed:',e);os.toast(copy.rsvpSendFailed)}
}
async function closeRsvp(eventId:string){
try{const server=sharedEventData(eventId);if(!server?.revision)throw new Error('Missing public event revision');await misskeyApi('hatask/events/close',{eventId:plannerEventServerId(eventId),expectedRevision:server.revision,closed:true});await loadSharedEvents();os.toast(copy.rsvpClosed)}catch(e){console.error('Close RSVP failed:',e);os.toast(copy.rsvpCloseFailed)}
}

// CRUD
function dismissRsvpNotif(eventId:string){dismissedRsvpNotifs.value.push(eventId);closedRsvpNotifs.value=closedRsvpNotifs.value.filter(n=>n.eventId!==eventId)}
function checkClosedRsvps(){
const myId=$i?.id;if(!myId)return;
// API共有イベントから締切済みのものを検出
closedRsvpNotifs.value=sharedEvents.value.filter(e=>e.rsvpClosed&&e.rsvpResponses&&e.rsvpResponses.some((r:any)=>r.userId===myId)&&!dismissedRsvpNotifs.value.includes(e.id)).map(e=>({eventId:e.id,emoji:e.emoji||'📅',title:e.title,goCount:e.rsvpResponses.filter((r:any)=>r.status==='going').length}));
}
const editingTodoId=ref<string|null>(null);
type CompletedTodoUndoItem={before:HataskPlannerTodo;after:HataskPlannerTodo;generated?:HataskPlannerTodo};
const todoCompletionIds=ref<string[]>([]);
const completedUndoItems=ref<CompletedTodoUndoItem[]>([]);
let completedUndoTimer:number|null=null;
function clonePlannerTodo(todo:HataskPlannerTodo):HataskPlannerTodo{return{...todo,subtasks:(todo.subtasks||[]).map(subtask=>({...subtask})),recurrence:{...(todo.recurrence||{frequency:'none',interval:1})}}}
function resetTodoEditor():void{editingTodoId.value=null;newTodo.value='';newTodoDue.value='';newTodoTime.value='';newTodoFolder.value='';newTodoComment.value='';newTodoPriority.value='none';newTodoRecurrence.value='none';newTodoSubtasks.value=[];newSubtaskText.value='';showTodoExtra.value=false;todoCaptureEditor.value=null}
function addTodoSubtask():void{const text=newSubtaskText.value.trim();if(!text)return;newTodoSubtasks.value.push({id:generateId(),text,done:false});newSubtaskText.value=''}
function removeTodoSubtask(id:string):void{newTodoSubtasks.value=newTodoSubtasks.value.filter(subtask=>subtask.id!==id)}
async function submitTodoCapture():Promise<void>{
	applyTodoCaptureSyntax(newTodo.value,true);
	if(!newTodo.value.trim()&&!editingTodoId.value){todoCaptureRef.value?.focus();return}
	todoCaptureState.value='saving';
	try{await addTodo();todoCaptureState.value='success';window.setTimeout(()=>{if(todoCaptureState.value==='success')todoCaptureState.value='idle'},900)}
	catch(error){console.error('Hatask todo save failed:',error);todoCaptureState.value='error'}
}
async function addTodo(){
	if(plannerReadOnly.value||(!newTodo.value.trim()&&!editingTodoId.value))return;
	if(editingTodoId.value){
		const index=todos.value.findIndex(todo=>todo.id===editingTodoId.value);
		if(index>=0){
			const current=todos.value[index];
			const next=[...todos.value];
			next.splice(index,1,{...current,text:newTodo.value.trim()||current.text,due:newTodoDue.value,time:newTodoTime.value,folder:newTodoFolder.value,comment:newTodoComment.value,priority:newTodoPriority.value,subtasks:newTodoSubtasks.value.map(subtask=>({...subtask})),recurrence:{...(current.recurrence||{}),frequency:newTodoRecurrence.value,interval:current.recurrence?.interval||1,...(newTodoDue.value?{anchorDate:newTodoDue.value}:{})}});
			await registrySet('todos',next);
			todos.value=next;
		}
		resetTodoEditor();
		os.toast(copy.todoUpdated);
		return;
	}
	const minPosition=todos.value.reduce((minimum,todo)=>Math.min(minimum,todo.position??0),0);
	const next=[{id:generateId(),text:newTodo.value.trim(),done:false,due:newTodoDue.value,time:newTodoTime.value,folder:newTodoFolder.value||(activeFolder.value!=='all'?activeFolder.value:''),comment:newTodoComment.value,createdAt:Date.now(),priority:newTodoPriority.value,subtasks:newTodoSubtasks.value.map(subtask=>({...subtask})),recurrence:{frequency:newTodoRecurrence.value,interval:1,...(newTodoDue.value?{anchorDate:newTodoDue.value}:{})},position:minPosition-1,archivedAt:null},...todos.value] satisfies HataskPlannerTodo[];
	await registrySet('todos',next);
	todos.value=next;
	resetTodoEditor();
}
// 旗鯖fork(ハタキュ): 「今日終わった分」を数えるために、完了した時刻を残す。
//   ⚠️過去に完了した分には doneAt が無い(遡って埋められない)。その分は今日の件数に入らない。
function completeTodoDrafts(source:HataskPlannerTodo[],ids:readonly string[]):{next:HataskPlannerTodo[];undo:CompletedTodoUndoItem[]}{
	const next=source.map(clonePlannerTodo);const undo:CompletedTodoUndoItem[]=[];const completedAt=new Date();
	for(const id of ids){
		const index=next.findIndex(item=>item.id===id);if(index<0||next[index].done||isTodoArchived(next[index]))continue;
		const before=clonePlannerTodo(next[index]);const after=clonePlannerTodo(next[index]);after.done=true;after.doneAt=completedAt.toISOString();let generated:HataskPlannerTodo|undefined;
		if(after.recurrence?.frequency!=='none'&&!next.some(item=>item.recurrenceParentId===after.id)){
			const recurrence=createNextRecurringTodo(after,generateId(),completedAt);if(recurrence){generated=recurrence;next.unshift(generated);}
		}
		const completedIndex=next.findIndex(item=>item.id===id);next.splice(completedIndex,1,after);undo.push({before,after:clonePlannerTodo(after),...(generated?{generated:clonePlannerTodo(generated)}:{})});
	}
	return{next,undo};
}
function registerCompletedUndo(entries:CompletedTodoUndoItem[]):void{
	if(entries.length===0)return;completedUndoItems.value=[...completedUndoItems.value,...entries];
	if(completedUndoTimer)window.clearTimeout(completedUndoTimer);completedUndoTimer=window.setTimeout(()=>{completedUndoItems.value=[];completedUndoTimer=null},8000);
}
async function toggleTodo(id:string,done?:boolean):Promise<CompletedTodoUndoItem[]>{
	if(plannerReadOnly.value)return[];
	const index=todos.value.findIndex(item=>item.id===id);if(index<0)return[];
	const todo=clonePlannerTodo(todos.value[index]);
	const nextDone=done??!todo.done;todo.done=nextDone;
	if(nextDone&&!todos.value[index].done){const completed=completeTodoDrafts(todos.value,[id]);await registrySet('todos',completed.next);todos.value=completed.next;return completed.undo}
	const nextTodos=[...todos.value];
	if(nextDone)todo.doneAt=new Date().toISOString();else delete todo.doneAt;
	const completedIndex=nextTodos.findIndex(item=>item.id===id);
	if(completedIndex>=0)nextTodos.splice(completedIndex,1,todo);
	await registrySet('todos',nextTodos);
	todos.value=nextTodos;
	return[];
}
async function deleteTodo(id:string){if(plannerReadOnly.value)return;const{canceled}=await os.confirm({type:'warning',text:copy.confirmDeleteTodo});if(canceled)return;const next=todos.value.filter(t=>t.id!==id);await registrySet('todos',next);todos.value=next}
async function editTodo(id:string){const t=todos.value.find(t=>t.id===id);if(!t)return;editingTodoId.value=id;newTodo.value=t.text;newTodoDue.value=t.due||'';newTodoTime.value=t.time||'';newTodoFolder.value=t.folder||'';newTodoComment.value=t.comment||'';newTodoPriority.value=t.priority||'none';newTodoRecurrence.value=t.recurrence?.frequency||'none';newTodoSubtasks.value=(t.subtasks||[]).map(subtask=>({...subtask}));showTodoExtra.value=true;focusTodoEditor()}
function cancelEditTodo(){resetTodoEditor()}
async function archiveTodo(id:string):Promise<void>{if(plannerReadOnly.value)return;const index=todos.value.findIndex(item=>item.id===id);if(index<0)return;const next=[...todos.value];next.splice(index,1,{...todos.value[index],archivedAt:new Date().toISOString()});await registrySet('todos',next);todos.value=next;lastArchivedTodoId.value=id;if(archiveUndoTimer)window.clearTimeout(archiveUndoTimer);archiveUndoTimer=window.setTimeout(()=>{lastArchivedTodoId.value=null;archiveUndoTimer=null},8000)}
async function restoreTodo(id:string):Promise<void>{if(plannerReadOnly.value)return;const index=todos.value.findIndex(item=>item.id===id);if(index<0)return;const next=[...todos.value];next.splice(index,1,{...todos.value[index],archivedAt:null});await registrySet('todos',next);todos.value=next;lastArchivedTodoId.value=null}
async function movePlannerTodo(item:HataskTodoItem,direction:-1|1):Promise<void>{if(plannerReadOnly.value)return;const list=plannerFilteredTodos.value;const index=list.findIndex(todo=>todo.id===item.id);const other=list[index+direction];const current=list[index];if(!current||!other)return;const next=todos.value.map(todo=>todo.id===current.id?{...todo,position:other.position}:todo.id===other.id?{...todo,position:current.position}:todo);await registrySet('todos',next);todos.value=next}
async function completePlannerTodo(item:HataskTodoItem,done:boolean):Promise<void>{
	if(done)todoCompletionIds.value=[...new Set([...todoCompletionIds.value,item.id])];
	try{const entries=await toggleTodo(item.id,done);if(done&&entries)registerCompletedUndo(entries)}
	finally{window.setTimeout(()=>{todoCompletionIds.value=todoCompletionIds.value.filter(id=>id!==item.id)},520)}
}
async function undoCompletedTodos():Promise<void>{
	if(plannerReadOnly.value||completedUndoItems.value.length===0)return;
	let next=todos.value.map(clonePlannerTodo);let restored=0;
	for(const entry of [...completedUndoItems.value].reverse()){
		const currentIndex=next.findIndex(item=>item.id===entry.after.id);
		if(currentIndex>=0&&JSON.stringify(next[currentIndex])===JSON.stringify(entry.after)){next.splice(currentIndex,1,clonePlannerTodo(entry.before));restored++}
		if(entry.generated){const generatedIndex=next.findIndex(item=>item.id===entry.generated?.id);if(generatedIndex>=0&&JSON.stringify(next[generatedIndex])===JSON.stringify(entry.generated))next.splice(generatedIndex,1)}
	}
	if(restored>0){await registrySet('todos',next);todos.value=next}
	completedUndoItems.value=[];if(completedUndoTimer)window.clearTimeout(completedUndoTimer);completedUndoTimer=null;
}
function editPlannerTodo(item:HataskTodoItem):void{void editTodo(item.id)}
async function archivePlannerTodo(item:HataskTodoItem):Promise<void>{await archiveTodo(item.id)}
async function restorePlannerTodo(item:HataskTodoItem):Promise<void>{await restoreTodo(item.id)}
async function deletePlannerTodo(item:HataskTodoItem):Promise<void>{await deleteTodo(item.id)}
function openFolderManager(startCreate=true):void{showFolderMgr.value=true;showFolderCreate.value=startCreate;nextTick(()=>window.document.querySelector('.htk-folder-manager')?.scrollIntoView({behavior:plannerScrollBehavior(),block:'nearest'}))}
function closeFolderManager():void{showFolderMgr.value=false;showFolderCreate.value=false}
function managePlannerFolder(filterId:string):void{if(filterId.startsWith('folder:'))activeFolder.value=filterId.slice(7);openFolderManager(false)}
async function openFolderActions(folderId:string,index:number):Promise<void>{
	if(plannerReadOnly.value)return;const folder=activeFolders.value.find(item=>item.id===folderId);if(!folder)return;
	const actions:Array<{value:'rename'|'color'|'up'|'down'|'archive';text:string}>=[{value:'rename',text:copy.renameFolderTitle},{value:'color',text:copy.changeColor}];
	if(index>0)actions.push({value:'up',text:plannerCopy.moveUp});if(index<activeFolders.value.length-1)actions.push({value:'down',text:plannerCopy.moveDown});actions.push({value:'archive',text:plannerCopy.archive});
	const{canceled,result}=await os.actions({type:'question',title:folder.name,actions});if(canceled)return;
	if(result==='rename')await renameFolder(folder.id);else if(result==='color')await changeFolderColor(folder.id);else if(result==='up')await moveFolder(folder.id,-1);else if(result==='down')await moveFolder(folder.id,1);else if(result==='archive')await deleteFolder(folder.id);
}
async function saveTodosAsTemplates(ids:readonly string[]):Promise<void>{
	const selected=todos.value.filter(todo=>ids.includes(todo.id));if(selected.length===0)return;
	const start=plannerTemplatePosition();
	const additions=selected.map((todo,index):HataskPlannerTemplate=>({
		id:generateId(),kind:'todo',name:todo.text,position:start+index,archivedAt:null,createdAt:new Date().toISOString(),
		payload:{text:todo.text,duePreset:todoTemplateDuePreset(todo.due||''),due:todo.due||'',dueLabel:todo.due?formatDue(todo.due):'',time:todo.time||'',folder:todo.folder||'',comment:todo.comment||'',priority:todo.priority,subtasks:(todo.subtasks||[]).map(subtask=>({id:generateId(),text:subtask.text,done:false})),recurrence:{...(todo.recurrence||{frequency:'none',interval:1})}},
	}));
	await savePlannerTemplates([...plannerTemplates.value,...additions]);os.toast(plannerCopyx.templatesSaved({count:additions.length.toString()}));
}
async function completePlannerTodos(ids:readonly string[]):Promise<void>{
	const completed=completeTodoDrafts(todos.value,ids);if(completed.undo.length===0)return;
	todoCompletionIds.value=[...new Set([...todoCompletionIds.value,...completed.undo.map(entry=>entry.before.id)])];
	try{await registrySet('todos',completed.next);todos.value=completed.next;registerCompletedUndo(completed.undo)}
	finally{window.setTimeout(()=>{const completedIds=new Set(completed.undo.map(entry=>entry.before.id));todoCompletionIds.value=todoCompletionIds.value.filter(id=>!completedIds.has(id))},520)}
}
async function promptPlannerDue(defaultValue:string):Promise<string|null>{
	const {canceled,result}=await os.inputText({title:copy.dueDate,text:plannerCopy.dateInputHint,default:defaultValue,maxLength:10});if(canceled)return null;
	const value=typeof result==='string'?result.trim():'';if(value&&!/^\d{4}-\d{2}-\d{2}$/.test(value)){os.toast(plannerCopy.invalidDate);return null}return value;
}
async function updatePlannerTodos(ids:readonly string[],update:(todo:HataskPlannerTodo)=>HataskPlannerTodo):Promise<void>{
	const idSet=new Set(ids);const next=todos.value.map(todo=>idSet.has(todo.id)?update(clonePlannerTodo(todo)):todo);await registrySet('todos',next);todos.value=next;
}
async function handleTodoDropTarget(ids:string[],targetId:string):Promise<void>{
	if(plannerReadOnly.value||ids.length===0)return;
	if(targetId.startsWith('folder:')){const folderId=targetId.slice(7);if(!activeFolders.value.some(folder=>folder.id===folderId))return;await updatePlannerTodos(ids,todo=>({...todo,folder:folderId}));return}
	if(targetId==='today'){await updatePlannerTodos(ids,todo=>({...todo,done:false,doneAt:undefined,due:localDateKey(),archivedAt:null}));return}
	if(targetId==='upcoming'){
		const due=await promptPlannerDue(localDateKey(addCalendarDays(new Date(),1)));if(due==null)return;
		await updatePlannerTodos(ids,todo=>({...todo,done:false,doneAt:undefined,due,archivedAt:null}));return;
	}
	if(targetId==='priority'){await updatePlannerTodos(ids,todo=>({...todo,priority:'high'}));return}
	if(targetId==='completed'){await completePlannerTodos(ids);return}
	if(targetId==='templates'){await saveTodosAsTemplates(ids)}
}
async function handleTodoBulkAction(action:'complete'|'move'|'due'|'priority'|'archive',ids:string[]):Promise<void>{
	if(plannerReadOnly.value||ids.length===0)return;
	if(action==='complete'){await completePlannerTodos(ids);return}
	if(action==='move'){
		const {canceled,result}=await os.actions({type:'question',title:plannerCopy.bulkMove,actions:[{value:'',text:copy.noFolder},...activeFolders.value.map(folder=>({value:folder.id,text:`${folder.emoji||'📁'} ${folder.name}`}))]});
		if(!canceled&&typeof result==='string')await updatePlannerTodos(ids,todo=>({...todo,folder:result}));return;
	}
	if(action==='due'){
		const due=await promptPlannerDue(localDateKey());if(due!=null)await updatePlannerTodos(ids,todo=>({...todo,due}));return;
	}
	if(action==='priority'){
		const {canceled,result}=await os.actions({type:'question',title:plannerCopy.priority,actions:[{value:'none',text:plannerCopy.priorityNone},{value:'low',text:plannerCopy.priorityLow},{value:'medium',text:plannerCopy.priorityMedium},{value:'high',text:plannerCopy.priorityHigh}]});
		if(!canceled&&(result==='none'||result==='low'||result==='medium'||result==='high'))await updatePlannerTodos(ids,todo=>({...todo,priority:result}));return;
	}
	const {canceled}=await os.confirm({type:'warning',text:plannerCopyx.confirmBulkArchive({count:ids.length.toString()})});if(canceled)return;
	await updatePlannerTodos(ids,todo=>({...todo,archivedAt:new Date().toISOString()}));
}
async function addFolder(){if(plannerReadOnly.value||!newFolderName.value.trim())return;const maxPosition=folders.value.reduce((maximum,folder)=>Math.max(maximum,folder.position??-1),-1);const next=[...folders.value,{id:generateId(),name:newFolderName.value.trim(),emoji:newFolderEmoji.value||'📁',color:newFolderColor.value||'',position:maxPosition+1,archivedAt:null}];await registrySet('folders',next);folders.value=next;newFolderName.value='';newFolderEmoji.value='📁';newFolderColor.value='';showFolderCreate.value=false}
async function deleteFolder(folderId:string){if(plannerReadOnly.value)return;const folder=folders.value.find(item=>item.id===folderId&&item.archivedAt==null);if(!folder)return;const{canceled}=await os.confirm({type:'warning',text:copyx.confirmDeleteFolder({name:folder.name})});if(canceled)return;const next=folders.value.map(item=>item.id===folder.id?{...item,archivedAt:new Date().toISOString()}:item);await registrySet('folders',next);folders.value=next;if(activeFolder.value===folder.id)activeFolder.value='all'}
async function renameFolder(folderId:string){if(plannerReadOnly.value)return;const folder=folders.value.find(item=>item.id===folderId&&item.archivedAt==null);if(!folder)return;const{canceled,result}=await os.inputText({title:copy.renameFolderTitle,text:copy.newNamePrompt,default:folder.name});if(!canceled&&result){const next=folders.value.map(item=>item.id===folder.id?{...item,name:result}:item);await registrySet('folders',next);folders.value=next}}
async function moveFolder(folderId:string,direction:number){if(plannerReadOnly.value)return;const ordered=activeFolders.value;const index=ordered.findIndex(folder=>folder.id===folderId);const other=ordered[index+direction];const current=ordered[index];if(!current||!other)return;const next=folders.value.map(folder=>folder.id===current.id?{...folder,position:other.position}:folder.id===other.id?{...folder,position:current.position}:folder);await registrySet('folders',next);folders.value=next}
async function changeFolderColor(folderId:string){if(plannerReadOnly.value)return;const folder=folders.value.find(item=>item.id===folderId&&item.archivedAt==null);if(!folder)return;const{canceled,result}=await os.actions({type:'question',title:copy.folderColorTitle,actions:[...folderColors.value.map(c=>({value:c.value,text:c.label})),{value:'',text:copy.none}]});if(canceled)return;const next=folders.value.map(item=>item.id===folder.id?{...item,color:result}:item);await registrySet('folders',next);folders.value=next}

type HataskJournalKey = 'moods' | 'meals' | typeof HATASK_MEAL_TEMPLATE_KEY;
const journalWrites = new Set<HataskJournalKey>();

function journalWritable(key: string): boolean {
	return dataLoaded.value && loadedKeys.has(key) && journalValidKeys.value.includes(key);
}

async function commitJournalChange(key: HataskJournalKey, change: HataskJournalChange): Promise<void> {
	if (!journalWritable(key) || journalWrites.has(key)) throw new Error('Hatask journal write is not ready');
	const target = key === 'moods' ? moodJournalRows : key === 'meals' ? mealJournalRows : mealTemplates;
	journalWrites.add(key);
	try {
		// Keep the original arrays and drafts until the server acknowledges the write.
		target.value = await persistJournalChange(target.value, change, next => registrySet(key, next));
	} finally { journalWrites.delete(key); }
}

async function saveMoodEntry(entry: HataskJournalEntry, existingId?: string): Promise<void> {
	await commitJournalChange('moods', { type: 'save', value: entry, existingId });
}

async function deleteMoodEntry(id: string): Promise<void> { await commitJournalChange('moods', { type: 'delete', id }); }

async function saveMealEntry(entry: HataskJournalEntry, existingId?: string): Promise<void> {
	await commitJournalChange('meals', { type: 'save', value: entry, existingId });
}

async function deleteMealEntry(id: string): Promise<void> { await commitJournalChange('meals', { type: 'delete', id }); }

async function saveMealTemplate(template: HataskMealTemplate, existingId?: string): Promise<void> {
	await commitJournalChange(HATASK_MEAL_TEMPLATE_KEY, { type: 'save', value: template, existingId });
}

async function deleteMealTemplate(id: string): Promise<void> { await commitJournalChange(HATASK_MEAL_TEMPLATE_KEY, { type: 'delete', id }); }

function mealSlotInfo(id:string){return mealSlots.value.find(s=>s.id===id)||{emoji:'ti ti-tools-kitchen-2',label:''}}
function mealLevelInfo(id:string){return mealLevels.value.find(l=>l.id===id)||{emoji:'ti ti-tools-kitchen-2',label:'',color:'var(--MI_THEME-fg)'}}
// 免責ダイアログ: 初回必ず表示、以降は!マークから手動表示
async function ackMealDisclaimer(){showMealDisclaimer.value=false;if(!settings.value.mealDisclaimerShown){settings.value.mealDisclaimerShown=true;await registrySet('settings',settings.value)}}

async function harvestFlower() {
	const autoName = generateFlowerName({ emoji: flower.value.emoji, name: flower.value.name });
	const localizedAutoName = localizeFloraName(autoName);
	const { canceled, result } = await os.inputText({
		title: copy.flowerBloomedTitle,
		text: copy.flowerNamingPrompt,
		default: localizedAutoName,
		minLength: 1,
		maxLength: 80,
	});
	const trimmedResult = typeof result === 'string' ? result.trim() : '';
	if (canceled || !trimmedResult) return;
	const flora = floraData.find(f => f.emoji === flower.value.emoji);
	const flowerId = generateId();
	gallery.value.unshift({
		id: flowerId,
		clientFlowerId: flowerId,
		emoji: flower.value.emoji,
		name: trimmedResult === localizedAutoName ? autoName : trimmedResult,
		hanakotoba: flora?.hanakotoba ?? '',
		date: new Date().toLocaleDateString('ja-JP'),
		harvestedAt: new Date().toISOString(),
	});
	const nf = pickRandomFlora();
	flower.value = createHataskGrowingFlower({ emoji: nf.emoji, name: generateFlowerName(nf) });
	await registrySet('gallery', gallery.value);
	await registrySet('flower', flower.value);
	await syncFlowerGallery([gallery.value[0]]);
	await syncHataskFlowerCount();
	os.toast(copy.flowerHarvested);
}
async function renameFlower(fl: any) {
	const sourceName = fl.name;
	const localizedName = localizeFloraName(sourceName);
	const { canceled, result } = await os.inputText({
		title: copy.renameFlowerTitle,
		text: copy.newNamePrompt,
		default: localizedName,
		minLength: 1,
		maxLength: 80,
	});
	const trimmedResult = typeof result === 'string' ? result.trim() : '';
	if (canceled || !trimmedResult) return;
	fl.name = trimmedResult === localizedName ? sourceName : trimmedResult;
	await registrySet('gallery', gallery.value);
	await syncFlowerGallery([fl]);
}

const FLOWER_SYNC_BATCH_SIZE = 100;

function flowerSyncString(value: unknown, maxLength: number, fallback: string): string {
	const text = typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
	return text || fallback;
}

async function syncFlowerGallery(items: unknown[] = gallery.value): Promise<void> {
	const flowers = items
		.filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
		.map((item, index) => ({
			clientFlowerId: flowerSyncString(item.clientFlowerId ?? item.id, 64, `flower-${index}`),
			emoji: flowerSyncString(item.emoji, 32, '🌼'),
			name: flowerSyncString(item.name, 80, copy.noFlowersYet),
			hanakotoba: flowerSyncString(item.hanakotoba, 256, ''),
			harvestedAt: stableHarvestedAt(item),
		}));
	for (let index = 0; index < flowers.length; index += FLOWER_SYNC_BATCH_SIZE) {
		try {
			await misskeyApi('hatask/flowers/sync', { flowers: flowers.slice(index, index + FLOWER_SYNC_BATCH_SIZE) });
		} catch (error) {
			console.warn('Failed to sync Hatask flower gallery:', error);
			return;
		}
	}
}

let communityFlowerRequestSequence = 0;
let skipNextCommunityFlowerWatch = false;

async function loadCommunityFlowers(): Promise<void> {
	const requestSequence = ++communityFlowerRequestSequence;
	communityFlowersLoading.value = true;
	communityFlowersError.value = false;
	try {
		const response = await misskeyApi('hatask/flowers/list', { page: communityFlowerPage.value, limit: 12, order: communityFlowerOrder.value });
		if (requestSequence !== communityFlowerRequestSequence) return;
		const totalPages = Math.max(1, response.totalPages || Math.ceil(response.total / 12));
		if (communityFlowerPage.value > totalPages) {
			communityFlowerTotalPages.value = totalPages;
			skipNextCommunityFlowerWatch = true;
			communityFlowerPage.value = totalPages;
			await loadCommunityFlowers();
			return;
		}
		communityFlowers.value = response.items.map(item => ({ ...item, harvestedAt: stableHarvestedAt(item) }));
		communityFlowerTotalPages.value = totalPages;
		if (response.myVisibility === 'public' || response.myVisibility === 'followers' || response.myVisibility === 'private') flowerVisibility.value = response.myVisibility;
	} catch (error) {
		if (requestSequence !== communityFlowerRequestSequence) return;
		communityFlowersError.value = true;
		console.warn('Failed to load Hatask flower gallery:', error);
	} finally {
		if (requestSequence === communityFlowerRequestSequence) communityFlowersLoading.value = false;
	}
}

async function updateFlowerVisibility(next: FlowerVisibility): Promise<void> {
	if (flowerVisibility.value === next) return;
	try {
		const response = await misskeyApi('hatask/flowers/visibility/update', { visibility: next });
		flowerVisibility.value = response.visibility;
		communityFlowerPage.value = 1;
		await loadCommunityFlowers();
	} catch (error) {
		console.warn('Failed to update Hatask flower visibility:', error);
		os.toast(copy.flowerVisibilityUpdateFailed);
	}
}

function setCommunityFlowerOrder(order: 'newest' | 'oldest'): void {
	if (communityFlowerOrder.value === order) return;
	communityFlowerOrder.value = order;
	communityFlowerPage.value = 1;
}

function setGalleryOrder(order: 'newest' | 'oldest'): void {
	if (galleryOrder.value !== order) {
		galleryOrder.value = order;
		galleryPage.value = 1;
	}
}

async function reportCommunityFlower(item: CommunityFlower): Promise<void> {
	if (!item.user) return;
	const { dispose } = await os.popupAsyncWithDialog(import('@/components/MkAbuseReportWindow.vue').then(module => module.default), {
		user: item.user,
		initialComment: copyx.flowerReportComment({ name: localizeFloraName(item.name), date: formatFlowerDate(item) }),
	}, { closed: () => dispose() });
}

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
try {
	await preparePlannerStorage();
} catch (error) {
	plannerMigrationReady = false;
	plannerStorageState.value = 'blocked';
	plannerStorageDetail.value = (error as Error)?.message || plannerCopy.readFailure;
}

const initFlower = pickRandomFlora();
	const defaultFlower = createHataskGrowingFlower({ emoji: initFlower.emoji, name: generateFlowerName(initFlower) });
const defaultSettings = { darkMode: false, autoTheme: true, weekStart: 'mon', showClock: true, showEvents: true, showFlower: true, showMoodSummary: true, showMealSection: true, showFeedbackNotif: true, showEarthquake: true, moodRemind: false, moodRemindTimes: ['昼 12:00', '寝る前 23:00'], openOnStart: false, showMealSummary: true, mealDisclaimerShown: false, eyeDisclaimerShown: false, theme: 'kisetsu', animations: true, v2Onboarded: false, todoSortModes: {}, todoMobileTabOrder: ['today', 'upcoming', 'all', 'completed', 'more'],
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
  registryGet(HATASK_MEAL_TEMPLATE_KEY, []),
]);
// 取得成功したデータのみ代入（失敗したキーは初期値のまま → registrySetガードで保護）
// 移行検証に失敗した配列はサーバー上へそのまま保全し、型の崩れた値を
// UIへ流して二次障害を起こさない。再試行に成功するまで空の読取専用表示にする。
if (plannerMigrationReady && loadResults[0].status === 'fulfilled' && loadedKeys.has('todos')) todos.value = loadResults[0].value as HataskPlannerTodo[];
if (plannerMigrationReady && loadResults[1].status === 'fulfilled' && loadedKeys.has('folders')) folders.value = loadResults[1].value as HataskPlannerFolder[];
if (loadResults[2].status === 'fulfilled' && loadedKeys.has('moods') && Array.isArray(loadResults[2].value)) {
	moodJournalRows.value = loadResults[2].value;
	journalValidKeys.value.push('moods');
}
	// 花が未作成でもregistryGetが返した既定値は画面へ反映する。
	// 永続化は成長トラッカーがNO_SUCH_KEYを再確認してから行うため、通信失敗時に既存値を上書きしない。
	if (loadResults[3].status === 'fulfilled') {
		const normalizedFlower = normalizeHataskGrowingFlower(loadResults[3].value);
		if (normalizedFlower) flower.value = normalizedFlower;
	}
if (loadResults[4].status === 'fulfilled' && loadedKeys.has('gallery')) {
	const normalizedGallery = normalizeLocalFlowerGallery(loadResults[4].value);
	gallery.value = normalizedGallery.items;
	if (normalizedGallery.changed) await registrySet('gallery', gallery.value);
}
if (loadResults[5].status === 'fulfilled' && loadedKeys.has('settings')) settings.value = loadResults[5].value as any;
if (plannerMigrationReady && loadResults[6].status === 'fulfilled' && loadedKeys.has('events')) events.value = loadResults[6].value as HataskPlannerEvent[];
if (loadResults[7].status === 'fulfilled' && loadedKeys.has('meals') && Array.isArray(loadResults[7].value)) {
	mealJournalRows.value = loadResults[7].value;
	journalValidKeys.value.push('meals');
}
if (loadResults[8].status === 'fulfilled' && loadedKeys.has(HATASK_MEAL_TEMPLATE_KEY) && Array.isArray(loadResults[8].value)) {
	mealTemplates.value = loadResults[8].value;
	journalValidKeys.value.push(HATASK_MEAL_TEMPLATE_KEY);
}
if (plannerMigrationReady) {
	try { await loadPlannerTemplates(); } catch (error) { console.warn('Hatask templates remain read-only:', error); }
}
dataLoaded.value = true;
	seedHataskFlowerGrowth(flower.value);
await syncHataskFlowerCount();
await syncFlowerGallery(gallery.value);
if (activeTab.value === 'garden') await loadCommunityFlowers();
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
scheduleEventNotifications();
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
	if (archiveUndoTimer) window.clearTimeout(archiveUndoTimer);
	if (completedUndoTimer) window.clearTimeout(completedUndoTimer);
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
	  --bg:#17140f; --surface:#211c15; --fg:#f1ece1; --fg-2:#c3b9a8; --fg-3:#a79c8b;
	  --rule:#39332a; --accent:#e0966a; --on-accent:#21170f;
}
/* --- 花信 Kashin (light) --- */
.htk-root[data-theme="kashin"],.htk-modal-ov[data-theme="kashin"]{
	  --bg:#fff5e6; --surface:#ffffff; --fg:#25201c; --fg-2:#5f574c; --fg-3:#6e655a;
  --ink-line:#25201c; --coral:#ff6b4a; --teal:#0f978c; --sun:#ffc23c; --grape:#7a5cff;
	  --accent:var(--coral); --rule:rgba(37,32,28,.16); --on-accent:#25201c; --on-coral:#25201c; --on-sun:#25201c; --on-teal:#25201c;
  --card:var(--surface); --card-border:2.5px solid var(--ink-line); --card-shadow:3px 3px 0 rgba(37,32,28,.15); --card-radius:16px;
  --htk-font-body:"Zen Maru Gothic",var(--htk-fallback);
  --htk-font-head:"Zen Maru Gothic",var(--htk-fallback);
}
.htk-root[data-theme="kashin"][data-mode="dark"],.htk-modal-ov[data-theme="kashin"][data-mode="dark"]{
	  --bg:#1b1726; --surface:#26202f; --fg:#fbf3e6; --fg-2:#c7bcd2; --fg-3:#9a90ab;
	  --ink-line:#f3ead6; --coral:#ff7d5e; --teal:#23c3b6; --sun:#ffcf5c; --grape:#9a80ff;
	  --rule:rgba(243,234,214,.18); --on-accent:#1b1726; --on-coral:#1b1726; --card-shadow:3px 3px 0 rgba(0,0,0,.35);
}
/* --- 刷 Suri (light) --- */
.htk-root[data-theme="suri"],.htk-modal-ov[data-theme="suri"]{
	  --bg:#efe7d4; --surface:#ffffff; --fg:#1a1a2e; --fg-2:#4a4a5a; --fg-3:#666678;
  --ink-line:#1a1a2e; --blue:#2a52c0; --pink:#ff4f9a; --sun:#ffe14f;
  --accent:var(--blue); --rule:rgba(26,26,46,.18); --on-sun:#1a1a2e;
  --card:var(--surface); --card-border:2.5px solid var(--ink-line); --card-shadow:3px 3px 0 var(--pink); --card-radius:0;
  --htk-font-body:"Zen Kaku Gothic Antique",var(--htk-fallback);
  --htk-font-head:"Zen Kaku Gothic Antique",var(--htk-fallback);
}
.htk-root[data-theme="suri"][data-mode="dark"],.htk-modal-ov[data-theme="suri"][data-mode="dark"]{
	  --bg:#14141f; --surface:#1e1e2c; --fg:#ece7dc; --fg-2:#b3aec6; --fg-3:#8f8aa3;
	  --ink-line:#ece7dc; --blue:#7f97ff; --pink:#ff6fae; --sun:#ffe14f;
	  --rule:rgba(236,231,220,.18); --on-accent:#14141f; --on-blue:#14141f; --card-shadow:3px 3px 0 var(--pink);
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
.htk-root{--radius-lg:28px;--radius-sm:14px;--radius-xs:10px;--success:#6ec072;--ease-spring:cubic-bezier(0.34,1.56,0.64,1);--ease-smooth:cubic-bezier(0.4,0,0.2,1);position:relative;min-height:100dvh;overflow-x:hidden;overflow-y:visible;container-type:inline-size;container-name:hatask-root}
.htk-root[data-window="true"]{min-height:100%}
.htk-app{max-width:1280px;margin:0 auto;padding:20px;position:relative;z-index:1;overflow-x:clip}
.htk-tabpage{container-type:inline-size}

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
.htk-root[data-theme="kashin"] .htk-nav-t.on{background:var(--accent);color:var(--on-accent);border-color:var(--accent);box-shadow:2px 2px 0 rgba(37,32,28,.2);font-weight:700}
/* 刷: 太罫の上下線に挟まれた極太ゴシックタブ(選択=青ベタ反転) */
.htk-root[data-theme="suri"] .htk-nav.htk-nav-top{border-top:3px solid var(--ink-line);border-bottom:3px solid var(--ink-line);padding:9px 0;margin:0 0 20px;gap:5px}
.htk-root[data-theme="suri"] .htk-nav-t{padding:3px 9px;border-radius:0;font-family:'Zen Kaku Gothic Antique',var(--htk-fallback);font-weight:900;font-size:.74rem;background:none;color:var(--fg-3);display:inline-flex;align-items:center;gap:4px}
.htk-root[data-theme="suri"] .htk-nav-t .htk-ico{display:inline;font-size:.9rem;margin:0}
.htk-root[data-theme="suri"] .htk-nav-t.on{background:var(--blue);color:var(--on-blue);font-weight:900;box-shadow:none}
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
.htk-calendar-page{align-items:start}
.htk-calendar-page > .htk-planner-shell{grid-column:1/-1;grid-row:1}
.htk-journal-page{display:block;min-width:0}
.htk-journal-reminders{display:grid;gap:12px}
.htk-journal-reminders>div{display:flex;flex-wrap:wrap;gap:8px}
.htk-journal-reminders button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:8px 14px;border:1px solid var(--rule);border-radius:999px;background:var(--fill);color:var(--fg-2);font:inherit;font-size:.82rem;cursor:pointer}
.htk-journal-reminders button[data-selected="true"]{background:var(--accent);color:var(--on-accent)}
.htk-journal-reminders button:hover:not(:disabled){background:var(--fill-3);color:var(--fg)}
.htk-journal-reminders button:disabled{opacity:.45;cursor:default}
.htk-journal-reminders button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
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
.htk-root[data-theme="kashin"] .htk-cal-seg button.htk-sb-on{background:var(--accent)!important;color:var(--on-accent);box-shadow:2px 2px 0 rgba(37,32,28,.2);border-color:var(--accent)}
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
.htk-root[data-theme="suri"] .htk-cal-seg button.htk-sb-on{background:var(--blue)!important;color:var(--on-blue)}
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
.htk-root[data-theme="kashin"] .htk-todo-db.od{background:var(--coral);color:var(--on-coral)}
.htk-root[data-theme="kashin"] .htk-todo-db.tdy{background:var(--teal);color:var(--on-teal)}
.htk-root[data-theme="kashin"] .htk-todo-fb{font-size:.63rem;font-weight:700;padding:2px 8px;background:color-mix(in srgb,var(--fg) 10%,transparent);border-radius:999px;color:var(--fg-2)}
.htk-root[data-theme="kashin"] .htk-ftab{font-weight:700;font-size:.73rem;padding:6px 12px;border:2px solid var(--ink-line);background:var(--surface);color:var(--fg-3);border-radius:999px}
.htk-root[data-theme="kashin"] .htk-ftab.on{background:var(--accent)!important;color:var(--on-accent)!important;border-color:var(--accent)!important}
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
.htk-root[data-theme="suri"] .htk-ftab.on{background:var(--blue)!important;color:var(--on-blue)!important;border-radius:0}
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
.htk-root[data-theme="hatakyu"] .htk-gal-i{border:1.5px solid var(--field-bd);border-radius:9px;background:var(--paper2)}
.htk-root[data-theme="kisetsu"] .htk-gal-vis-box,.htk-root[data-theme="kisetsu"] .htk-gal-sort-inner{border:1px solid var(--rule);border-radius:999px;background:var(--surface)}
.htk-root[data-theme="kashin"] .htk-gal-vis-box,.htk-root[data-theme="kashin"] .htk-gal-sort-inner{border:2px solid var(--ink-line);border-radius:999px;background:var(--surface)}
.htk-root[data-theme="suri"] .htk-gal-vis-box,.htk-root[data-theme="suri"] .htk-gal-sort-inner{border:2.5px solid var(--ink-line);border-radius:999px;background:var(--surface)}
.htk-root[data-theme="hatakyu"] .htk-gal-vis-box,.htk-root[data-theme="hatakyu"] .htk-gal-sort-inner{border:1.5px solid var(--field-bd);border-radius:999px;background:var(--paper2)}
.htk-root[data-theme="kisetsu"] .htk-gal-sort,.htk-root[data-theme="kashin"] .htk-gal-sort,.htk-root[data-theme="suri"] .htk-gal-sort,.htk-root[data-theme="hatakyu"] .htk-gal-sort{margin-bottom:12px}
.htk-root[data-theme="kisetsu"] .htk-gal-vis-box .htk-vis-o.on,.htk-root[data-theme="kisetsu"] .htk-gal-vis-box .htk-vis-o.on:hover,.htk-root[data-theme="kisetsu"] .htk-gal-sort-btn.on,.htk-root[data-theme="kisetsu"] .htk-gal-sort-btn.on:hover{background:color-mix(in srgb,var(--accent) 12%,transparent);border-color:var(--accent);color:var(--fg)}
.htk-root[data-theme="kashin"] .htk-gal-vis-box .htk-vis-o.on,.htk-root[data-theme="kashin"] .htk-gal-vis-box .htk-vis-o.on:hover,.htk-root[data-theme="kashin"] .htk-gal-sort-btn.on,.htk-root[data-theme="kashin"] .htk-gal-sort-btn.on:hover{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
.htk-root[data-theme="suri"] .htk-gal-vis-box .htk-vis-o.on,.htk-root[data-theme="suri"] .htk-gal-vis-box .htk-vis-o.on:hover,.htk-root[data-theme="suri"] .htk-gal-sort-btn.on,.htk-root[data-theme="suri"] .htk-gal-sort-btn.on:hover{background:var(--blue);border-color:var(--blue);color:var(--on-blue)}
.htk-root[data-theme="hatakyu"] .htk-gal-vis-box .htk-vis-o.on,.htk-root[data-theme="hatakyu"] .htk-gal-vis-box .htk-vis-o.on:hover,.htk-root[data-theme="hatakyu"] .htk-gal-sort-btn.on,.htk-root[data-theme="hatakyu"] .htk-gal-sort-btn.on:hover{background:var(--blue);border-color:var(--blue);color:var(--on-blue)}
.htk-root[data-theme="kisetsu"] .htk-gal-community-row{border-bottom-color:var(--rule)}
.htk-root[data-theme="kashin"] .htk-gal-community-row{border-bottom-color:var(--rule)}
.htk-root[data-theme="suri"] .htk-gal-community-row{border-bottom:2px solid var(--ink-line)}
.htk-root[data-theme="hatakyu"] .htk-gal-community-row{border-bottom-color:var(--field-bd)}
.htk-root[data-theme="kisetsu"] .htk-gal-report{color:var(--accent)}
.htk-root[data-theme="kashin"] .htk-gal-report{color:var(--accent)}
.htk-root[data-theme="suri"] .htk-gal-report{color:var(--blue)}
.htk-root[data-theme="hatakyu"] .htk-gal-report{color:var(--blue)}
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
.htk-sr-only{position:absolute !important;width:1px !important;height:1px !important;padding:0 !important;margin:-1px !important;overflow:hidden !important;clip:rect(0,0,0,0) !important;white-space:nowrap !important;border:0 !important}
.htk-editor-fieldset{min-width:0;margin:0;padding:0;border:0}
.htk-editor-fieldset:disabled{opacity:.72}
.htk-fg{margin-bottom:13px}.htk-fl{display:block;font-size:.76rem;font-weight:600;color:var(--text-2);margin-bottom:4px}
.htk-fr{display:flex;gap:8px}.htk-fr > *{flex:1;min-width:0}
.htk-date-time-row{display:grid;grid-template-columns:minmax(3.5rem,auto) minmax(8rem,1fr) minmax(6.5rem,.7fr);align-items:center}
.htk-field-sub-label{font-size:.72rem;font-weight:700;color:var(--fg-2);white-space:nowrap;word-break:keep-all}
.htk-clr-row{display:flex;gap:6px;flex-wrap:wrap}
.htk-clr-o{width:44px;height:44px;border-radius:50%;cursor:pointer;border:8px solid var(--surface);outline:2px solid transparent;transition:transform .2s,outline-color .2s;box-shadow:0 0 0 1px var(--rule)}
.htk-clr-o:hover{transform:scale(1.15)}.htk-clr-o.on{border-color:var(--text-1);box-shadow:0 0 8px rgba(128,128,128,.3)}
.htk-vis-row{display:flex;gap:6px}
.htk-vis-o{flex:1;padding:10px;text-align:center;border-radius:var(--radius-xs);cursor:pointer;border:1px solid var(--btn-border);background:var(--btn-bg);transition:all .2s;font-size:.78rem;backdrop-filter:blur(4px)}
.htk-vis-o:hover{background:var(--btn-hover)}.htk-vis-o.on{background:rgba(232,168,124,.18);border-color:rgba(232,168,124,.35)}
.htk-vi{font-size:1.1rem;display:block;margin-bottom:2px;text-shadow:none}
.htk-tg-row{display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--divider)}
.htk-tg-row:last-child{border:none}.htk-tg-lab{font-size:.82rem}
.htk-tg-sw{flex:0 0 52px;width:52px;height:44px;padding:0;background:transparent;border:0;border-radius:22px;cursor:pointer;position:relative}
.htk-tg-sw::before{content:'';position:absolute;width:44px;height:24px;top:10px;left:4px;background:rgba(128,128,128,.22);border:1px solid rgba(128,128,128,.35);border-radius:12px;transition:background .2s,border-color .2s}
.htk-tg-sw::after{content:'';position:absolute;width:18px;height:18px;background:rgba(128,128,128,.62);border-radius:50%;top:13px;left:7px;transition:left .3s var(--ease-spring),background .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.htk-tg-sw.on::before{background:color-mix(in srgb,var(--success) 72%,var(--surface));border-color:var(--success)}.htk-tg-sw.on::after{left:27px;background:var(--surface);box-shadow:0 1px 4px rgba(76,175,80,.4)}
.htk-nt-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
.htk-nt-chip{min-height:44px;padding:7px 12px;border-radius:999px;font:inherit;font-size:.72rem;background:var(--btn-bg);color:var(--fg);border:1px solid var(--btn-border);cursor:pointer;transition:background .2s,border-color .2s}
.htk-nt-chip:hover{background:var(--btn-hover)}.htk-nt-chip.on{background:rgba(232,168,124,.18);border-color:rgba(232,168,124,.3)}
.htk-emp-row{display:flex;gap:5px;flex-wrap:wrap;padding:6px}
.htk-emp-i{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:6px;border:1px solid transparent;background:transparent;color:inherit;font:inherit;font-size:1.15rem;cursor:pointer;border-radius:6px;transition:background .2s,transform .2s,border-color .2s;text-shadow:none}
.htk-emp-i:hover{background:var(--hover-bg);transform:scale(1.12)}.htk-emp-i.on{background:var(--active-bg)}
.htk-planner-shell{position:relative;min-width:0;margin-bottom:16px}
.htk-planner-status,.htk-planner-undo{display:flex;align-items:center;justify-content:center;gap:10px;min-height:52px;margin-bottom:10px;padding:8px 12px;border:1px solid var(--rule);border-radius:var(--card-radius);background:var(--surface);color:var(--fg-2);font-size:.78rem;line-height:1.5;text-align:center}
.htk-planner-status[data-state="blocked"],.htk-planner-status[data-state="conflict"]{border-color:color-mix(in srgb,var(--danger,#c43d4f) 55%,var(--rule));background:color-mix(in srgb,var(--danger,#c43d4f) 8%,var(--surface));color:var(--fg)}
.htk-planner-status .ti-loader-2{animation:htkPlannerSpin .9s linear infinite}
.htk-planner-undo{justify-content:space-between;border-color:color-mix(in srgb,var(--success) 55%,var(--rule));background:color-mix(in srgb,var(--success) 9%,var(--surface));color:var(--fg)}
.htk-planner-shell > :deep([data-mode="event"]),.htk-planner-shell > :deep([data-mode="todo"]){margin-bottom:14px}
.htk-todo-capture-row{display:contents}
.htk-todo-capture-row > :deep([data-mode="todo"]){margin-bottom:14px}
.hk-inlinefig.htk-capture-companion-desktop{display:none}
.htk-capture-detail{box-sizing:border-box;width:min(100%,760px);min-width:0;margin:0 auto 14px;padding:14px;border:1px solid var(--rule);border-radius:20px;background:color-mix(in srgb,var(--surface) 94%,transparent);box-shadow:0 14px 34px -28px rgba(0,0,0,.65)}
.htk-capture-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.htk-capture-grid label{min-width:0;display:grid;gap:4px}.htk-capture-grid label>span{color:var(--fg-3);font-size:.68rem;font-weight:750}.htk-capture-wide{grid-column:1/-1}.htk-folder-manager{display:grid;gap:7px}.htk-folder-manager>header{display:flex;align-items:center;justify-content:space-between;gap:10px}.htk-folder-manager .htk-fm-row{display:grid;grid-template-columns:32px minmax(0,1fr) auto auto;align-items:center;gap:7px;min-height:48px}.htk-folder-colored-icon{position:relative;width:30px;height:30px;display:grid;place-items:center;color:var(--folder-color);font-size:1.25rem}.htk-folder-colored-icon::after{content:'';position:absolute;inset:9px 7px 5px;border-radius:2px;background:color-mix(in srgb,var(--folder-color) 20%,var(--surface));border:1px solid color-mix(in srgb,var(--folder-color) 55%,var(--rule))}.htk-folder-colored-icon i{position:relative;z-index:1}.htk-fm-count{min-width:28px;padding:3px 7px;border-radius:999px;background:var(--fill-2);color:var(--fg-3);font-size:.65rem;text-align:center}.htk-folder-create{display:grid;grid-template-columns:minmax(0,1fr) 44px;gap:7px;margin-top:4px}.htk-icon-btn,.htk-icon-submit{width:44px;height:44px;display:grid;place-items:center;border:1px solid var(--btn-border,var(--rule));border-radius:50%;background:var(--btn-bg,var(--surface));color:var(--fg);font:inherit;cursor:pointer}.htk-icon-submit{background:var(--accent);border-color:var(--accent);color:var(--on-accent,#fff);font-size:1.05rem;box-shadow:0 9px 20px -12px var(--accent)}.htk-icon-btn:hover,.htk-icon-btn:focus-visible{background:var(--btn-hover,var(--fill-2));color:var(--accent)}.htk-icon-btn.htk-danger{color:var(--danger,#c43d4f)}.htk-editor-icon-actions{display:flex;align-items:center;justify-content:flex-end;gap:7px;margin-top:14px}.htk-complete-undo{position:sticky;z-index:12;bottom:calc(12px + env(safe-area-inset-bottom));width:min(100%,460px);margin:0 auto 12px;box-shadow:0 16px 38px -25px rgba(0,0,0,.7);backdrop-filter:blur(16px)}.htk-capture-companion{margin-block:4px 12px}
.htk-pill-editor{display:grid;gap:10px}.htk-pill-editor-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.htk-pill-editor-head strong{display:flex;align-items:center;gap:7px;color:var(--fg);font-size:.82rem}.htk-pill-editor-head strong i{color:var(--accent);font-size:1rem}.htk-pill-time-grid{margin-top:2px}.htk-pill-clear{justify-self:start;min-height:44px;padding:7px 14px;border:1px solid var(--rule);border-radius:999px;background:var(--surface);color:var(--fg-2);font:inherit;font-size:.72rem;font-weight:750;cursor:pointer}.htk-pill-clear:hover,.htk-pill-clear:focus-visible{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--surface));color:var(--fg)}
.htk-folder-manager{gap:12px}.htk-folder-manager-head>div:first-child{min-width:0;display:grid;gap:2px}.htk-folder-manager-head>div:first-child strong{font-size:.9rem}.htk-folder-manager-head>div:first-child span{color:var(--fg-3);font-size:.66rem}.htk-folder-manager-head-actions{display:flex;align-items:center;gap:6px}.htk-folder-manager-list{display:grid;gap:6px}.htk-folder-manager .htk-fm-row{min-height:58px;display:grid;grid-template-columns:38px minmax(0,1fr) 44px;align-items:center;gap:9px;margin:0;padding:6px 7px 6px 10px;border:1px solid var(--rule);border-radius:15px;background:color-mix(in srgb,var(--surface) 96%,var(--fill));transition:border-color .18s ease,background .18s ease,transform .2s var(--ease-smooth,ease)}.htk-folder-manager .htk-fm-row:hover{border-color:color-mix(in srgb,var(--folder-color,var(--accent)) 38%,var(--rule));background:color-mix(in srgb,var(--folder-color,var(--accent)) 6%,var(--surface))}.htk-fm-copy{min-width:0;display:flex;align-items:center;justify-content:space-between;gap:10px}.htk-fm-copy strong{overflow:hidden;color:var(--fg);font-size:.8rem;text-overflow:ellipsis;white-space:nowrap}.htk-fm-copy span{flex:none;min-width:28px;padding:3px 7px;border-radius:999px;background:var(--fill-2);color:var(--fg-3);font-size:.65rem;font-weight:760;text-align:center}.htk-folder-row-more{width:44px;height:44px;display:grid;place-items:center;border:0;border-radius:50%;background:transparent;color:var(--fg-2);font:inherit;cursor:pointer}.htk-folder-row-more:hover,.htk-folder-row-more:focus-visible{background:var(--fill-2);color:var(--accent)}.htk-folder-manager-empty{min-height:110px;display:grid;place-items:center;align-content:center;gap:7px;border:1px dashed var(--rule);border-radius:15px;color:var(--fg-3);font-size:.72rem}.htk-folder-manager-empty i{font-size:1.35rem}.htk-folder-create-panel{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding-top:12px;border-top:1px solid var(--rule)}.htk-folder-create-panel>label{min-width:0;display:grid;gap:4px}.htk-folder-create-panel>label>span{color:var(--fg-3);font-size:.68rem;font-weight:750}.htk-folder-create-panel .htk-folder-clr-row{grid-column:1/-1;margin:0}.htk-folder-create-submit{align-self:end}:deep(.htk-folder-create-enter-active),:deep(.htk-folder-create-leave-active){transition:opacity .18s ease,transform .24s var(--ease-smooth,ease)}:deep(.htk-folder-create-enter-from),:deep(.htk-folder-create-leave-to){opacity:0;transform:translateY(-7px)}
:deep(.htk-capture-detail-enter-active),:deep(.htk-capture-detail-leave-active){transition:opacity .16s ease}:deep(.htk-capture-detail-enter-from),:deep(.htk-capture-detail-leave-to){opacity:0}
@keyframes htkPlannerSpin{to{transform:rotate(1turn)}}
.htk-root[data-theme="kisetsu"] .htk-planner-shell{padding-block:8px;border-block:1px solid var(--rule)}
.htk-root[data-theme="kashin"] .htk-planner-shell{padding:10px;border:2.5px solid var(--ink-line);border-radius:20px;background:color-mix(in srgb,var(--surface) 94%,var(--coral));box-shadow:4px 4px 0 color-mix(in srgb,var(--ink-line) 18%,transparent)}
.htk-root[data-theme="suri"] .htk-planner-shell{padding:10px;border:3px solid var(--ink-line);border-radius:0;background:var(--surface);box-shadow:5px 5px 0 var(--pink)}
.htk-root[data-theme="hatakyu"] .htk-planner-shell{padding:16px 12px 12px;border:1.5px solid var(--field-bd);border-radius:2px;background:var(--paper2);box-shadow:0 12px 22px -12px rgba(40,24,8,.72)}
.htk-root[data-theme="hatakyu"] .htk-planner-shell::before{content:'';position:absolute;z-index:3;top:5px;left:50%;width:13px;height:13px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#dbeafe 0 18%,var(--blue) 22% 62%,#0c438f 68% 100%);box-shadow:0 2px 3px rgba(40,24,8,.45);transform:translateX(-50%);pointer-events:none}
.htk-coll-h{display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:7px 0;user-select:none}
.htk-ci{font-size:.72rem;color:var(--text-3);text-shadow:none}
.htk-todo-inp-r{display:flex;gap:8px;margin-bottom:8px}
.htk-todo-xf{display:none;gap:7px;flex-wrap:wrap;padding:10px;margin-bottom:10px;animation:htkFiU .3s var(--ease-spring);position:relative;z-index:1}.htk-todo-xf.open{display:flex}
.htk-todo-xf-i{flex:1;min-width:120px}.htk-todo-xf-i label{display:block;font-size:.68rem;color:var(--text-3);margin-bottom:2px;font-weight:600}
.htk-todo-subtask-editor{flex:1 1 100%;min-width:100%;display:grid;gap:6px}
.htk-todo-subtask-editor > label{font-size:.68rem;color:var(--text-3);font-weight:700}
.htk-todo-subtask-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:7px}
.htk-todo-subtask-row > input[type="checkbox"]{width:24px;height:24px;margin:10px;accent-color:var(--accent)}
.htk-todo-subtask-row > .htk-inp{width:100%;min-width:0}
.htk-todo-subtask-row > #hatask-new-subtask{grid-column:1 / 3}
@container (max-width:620px){
	.htk-capture-grid{grid-template-columns:1fr}
	.htk-capture-wide{grid-column:auto}
	.htk-folder-manager .htk-fm-row{grid-template-columns:30px minmax(0,1fr) auto}.htk-fm-acts{grid-column:1/-1;justify-content:flex-end;border-top:1px solid var(--rule);padding-top:5px}
	.htk-date-time-row{grid-template-columns:minmax(0,1fr) minmax(0,.72fr)}
	.htk-date-time-row .htk-field-sub-label{grid-column:1 / -1}
	.htk-todo-inp-r{flex-wrap:wrap}
	.htk-todo-inp-r > .htk-inp{flex:1 1 100% !important}
	.htk-todo-subtask-row{grid-template-columns:auto minmax(0,1fr) auto}
}
.htk-fbar{display:flex;gap:5px;margin-bottom:10px;overflow-x:auto;align-items:center}
.htk-ftab{padding:5px 12px;border-radius:16px;font-size:.73rem;font-weight:500;background:var(--btn-bg);border:1px solid var(--btn-border);cursor:pointer;transition:all .2s;white-space:nowrap;font-family:inherit;color:var(--text-2);backdrop-filter:blur(4px)}
.htk-ftab:hover{background:var(--btn-hover);color:var(--text-1)}.htk-ftab.on{background:rgba(232,168,124,.18);border-color:rgba(232,168,124,.3);color:var(--text-1);font-weight:600}
.htk-fc{font-size:.6rem;margin-left:3px;opacity:.6}
.htk-fm-btn{min-height:44px;padding:7px 12px;border-radius:16px;font-size:.73rem;background:var(--btn-bg);border:1px solid var(--btn-border);cursor:pointer;color:var(--text-3);transition:all .2s;font-family:inherit;backdrop-filter:blur(4px)}
.htk-fm-btn:hover{background:var(--btn-hover);color:var(--text-1)}
.htk-fm-panel{animation:htkFiU .3s var(--ease-spring)}
.htk-fm-row{display:flex;align-items:center;gap:5px;padding:6px 10px;border-radius:var(--radius-xs);background:var(--btn-bg);border:1px solid var(--btn-border);margin-bottom:4px;backdrop-filter:blur(4px)}
.htk-fm-emoji{font-size:1rem;text-shadow:none}.htk-fm-name{flex:1;font-size:.8rem}.htk-fm-acts{display:flex;gap:3px}
.htk-fm-dot{display:inline-block;width:10px;height:10px;border-radius:50%;flex-shrink:0}
.htk-folder-clr-row{display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap}
.htk-folder-clr-o{width:44px;height:44px;border-radius:50%;cursor:pointer;border:8px solid var(--surface);outline:2px solid transparent;transition:transform .2s,outline-color .2s;flex-shrink:0;box-shadow:0 0 0 1px var(--rule)}
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
.htk-gal-i.htk-gal-card{display:flex;flex-direction:column;align-items:center;gap:2px;cursor:default}
.htk-gal-card:hover{transform:none;box-shadow:none}
.htk-gal-e{font-size:2.2rem;display:block;margin-bottom:5px;text-shadow:none}.htk-gal-n{font-size:.76rem;font-weight:600}.htk-gal-d{font-size:.66rem;color:var(--text-3);margin-top:2px}
.htk-gal-i{display:block;width:100%;font:inherit;color:inherit;text-align:center;appearance:none}
.htk-gal-hk{display:block;margin-top:3px;font-size:.66rem;color:var(--text-2)}
.htk-gal-note,.htk-gal-visibility-help{margin:0 0 10px;color:var(--text-3);font-size:.74rem;line-height:1.5}
.htk-gal-visibility-help{margin:7px 0 12px;font-size:.68rem}
.htk-gal-vis-box{display:flex;width:100%;padding:4px;border:1px solid var(--rule);border-radius:999px;background:var(--surface)}
.htk-gal-vis{display:flex;gap:4px;width:100%;min-width:0}.htk-gal-vis .htk-vis-o{display:flex;flex:1;min-width:0;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:44px;padding:4px;border:1px solid transparent;border-radius:999px;background:transparent;color:var(--fg-2);font-family:inherit;font-size:.66rem;line-height:1.2;cursor:pointer;word-break:keep-all;backdrop-filter:none}.htk-gal-vis .htk-vis-o:hover:not(.on){color:var(--fg)}.htk-gal-vis .htk-vis-o i{font-size:1rem;line-height:1}.htk-gal-vis .htk-vis-o:focus-visible,.htk-gal-sort-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.htk-gal-pager{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:12px}.htk-gal-pager .htk-btn{min-width:44px;min-height:44px;padding:8px;font-size:1.2rem;line-height:1}.htk-pager-t{min-width:2.5em;text-align:center;font-variant-numeric:tabular-nums}
.htk-gal-sort{display:flex;justify-content:center;margin-top:12px}.htk-gal-sort-inner{display:flex;gap:4px;width:fit-content;max-width:100%;padding:4px;border:1px solid var(--rule);border-radius:999px;background:var(--surface)}.htk-gal-sort-label{display:inline-flex;align-items:center;gap:4px;padding:0 8px;color:var(--fg-2);font-size:.68rem;white-space:nowrap}.htk-gal-sort-label i{font-size:1rem;line-height:1}.htk-gal-sort-btn{display:inline-flex;flex:1 1 auto;align-items:center;justify-content:center;gap:5px;min-width:44px;min-height:44px;padding:6px 14px;border:1px solid transparent;border-radius:999px;background:transparent;color:var(--fg-2);font:inherit;white-space:nowrap;cursor:pointer;transition:background .15s,color .15s,border-color .15s}.htk-gal-sort-btn:hover:not(.on){background:var(--hover-bg);color:var(--fg)}.htk-gal-sort-btn.on{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}.htk-gal-sort-btn i{font-size:1rem;line-height:1}.htk-gal-state{display:flex;align-items:center;justify-content:center;gap:7px;min-height:74px;color:var(--text-3);font-size:.8rem;text-align:center}.htk-gal-state i{font-size:1.1rem}.htk-gal-error{flex-wrap:wrap;color:var(--danger, var(--text-2))}
.htk-gal-community{display:grid;gap:6px}.htk-gal-community-row{display:flex;align-items:center;gap:9px;min-width:0;padding:9px 0;border-bottom:1px solid var(--divider)}.htk-gal-community-row:last-child{border-bottom:0}.htk-gal-avatar{width:36px;height:36px;flex:0 0 36px}.htk-gal-community-body{min-width:0;flex:1}.htk-gal-community-text{font-size:.78rem;line-height:1.45;overflow-wrap:anywhere}.htk-gal-community-text b{font-weight:700}.htk-gal-community-meta{display:flex;align-items:center;gap:5px;margin-top:3px;color:var(--text-3);font-size:.68rem}.htk-gal-community-meta .mk-emoji{font-size:1rem}.htk-gal-report{display:grid;place-items:center;flex:0 0 44px;min-width:44px;min-height:44px;border:0;border-radius:var(--radius-xs);color:var(--text-3);background:transparent;cursor:pointer}.htk-gal-report:hover,.htk-gal-report:focus-visible{color:var(--accent);background:var(--hover-bg)}
.htk-gal-owner{display:flex;align-items:center;justify-content:center;gap:5px;max-width:100%;min-width:0;color:var(--text-2);font-size:.7rem;overflow-wrap:anywhere}.htk-gal-card .htk-gal-avatar{width:28px;height:28px;flex-basis:28px}.htk-gal-card .htk-gal-report{align-self:center}
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
.htk-event-editor-modal{width:min(92%,760px);max-width:760px;max-height:min(88dvh,780px);background:var(--surface);overscroll-behavior:contain}
.htk-event-editor-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:10px}
.htk-event-editor-head .htk-sec-title{min-width:0;margin:0}
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
.hk-panels{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:22px 16px; align-items:start; }
/* お庭だけ左右を独立して積む。ひとことの高さを右側の花カードと揃えず、情報はギャラリーの直下へ。
   他のテーマでは箱を作らず、従来どおり4枚を親のグリッドへ並べる。 */
.htk-garden-page{min-width:0}
.htk-garden-stack{display:contents}
.htk-root[data-theme="hatakyu"] .htk-garden-page > .htk-garden-stack{display:grid;grid-template-columns:minmax(0,1fr);align-content:start;align-items:start;min-width:0}
.htk-garden-page .htk-garden-stack > .htk-lg{min-width:0}
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
.hk-hangrow{ display:grid; grid-template-columns:repeat(4,minmax(0,118px)); gap:16px; justify-content:center }
.hk-hang{ position:relative; width:100%; min-width:0; transform-origin:50% -14px; transform:rotate(var(--r,0deg)); cursor:pointer; background:none; border:none; padding:0; font:inherit }
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
  .hk-hangrow{ grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; padding:0 2px 6px }
  .hk-hang{ width:100%; min-width:0 }
  .htk-gal-sort-label{ padding:0 4px }
  .htk-gal-sort-label span{ display:none }
  .hk-clock{ font-size:2.2rem }
  .hk-mbtns{ flex-direction:column }
}

/* Hatasaba UIのウィンドウ表示では、ブラウザ全体が広くてもHataskの表示領域だけが狭くなる。
   端末判定ではなく実際のHatask幅で、既存のモバイル相当レイアウトへ切り替える。 */
@container hatask-root (max-width:900px){
  .htk-app{padding-bottom:28px}
  .htk-panels{grid-template-columns:minmax(0,1fr)}
  .hk-masonry{ columns:2 }
  .hk-panels{ grid-template-columns:minmax(0,1fr) }
}
@container hatask-root (min-width:901px){
  .htk-root[data-theme="hatakyu"] .htk-todo-capture-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(190px,260px);align-items:center;gap:18px;margin-bottom:14px}
  .htk-root[data-theme="hatakyu"] .htk-todo-capture-row > :deep([data-mode="todo"]){min-width:0;max-width:none;margin:0}
  .htk-root[data-theme="hatakyu"] .htk-capture-companion-desktop{display:flex;min-width:0;margin:0}
  .htk-root[data-theme="hatakyu"] .htk-capture-companion-desktop .hk-note{min-width:0;overflow-wrap:anywhere}
  .htk-root[data-theme="hatakyu"] .htk-capture-companion-mobile{display:none}
}
@container hatask-root (max-width:759px){
  .htk-root[data-theme="hatakyu"] .htk-journal-page :deep([data-journal-capture] > header){padding:12px 14px;background:var(--surface);color:var(--fg);box-shadow:var(--card-shadow)}
}
@container hatask-root (max-width:640px){
  .htk-app{padding:12px;padding-bottom:24px}
  .htk-dt-time{font-size:2.2rem}
  .htk-panels{grid-template-columns:minmax(0,1fr)}
  .htk-mood-sc{gap:3px;flex-wrap:wrap}
  .htk-mood-e{font-size:1.4rem}
  .htk-mood-o{padding:6px}
  .htk-dash{grid-template-columns:minmax(0,1fr)}
  .htk-root[data-theme] .htk-nav.htk-nav-top{overflow-x:auto;overflow-y:hidden;flex-wrap:nowrap;overscroll-behavior-inline:contain;scroll-snap-type:x proximity}
  .htk-root[data-theme] .htk-nav-t{flex:0 0 auto;scroll-snap-align:start}
  .htk-planner-status,.htk-planner-undo{flex-wrap:wrap}
  .htk-capture-detail{padding:10px}
  .htk-root[data-theme="hatakyu"] .htk-app{ padding:12px; padding-bottom:24px }
  .htk-root[data-theme="hatakyu"] .htk-shell{ padding:23px 21px 30px; border-radius:16px }
  .htk-root[data-theme="hatakyu"] .htk-shell::before{ inset:9px; border-radius:9px }
  .htk-root[data-theme="hatakyu"] .htk-shell::after{ inset:5px; border-radius:11px }
  .hk-leaves{ inset:9px; border-radius:9px }
  .hk-masonry{ columns:1; column-gap:0 }
  .hk-panels{ grid-template-columns:minmax(0,1fr); gap:20px 0 }
  .hk-bhead{ margin-bottom:12px }
  .hk-titlecard{ padding:9px 15px 10px }
  .hk-lg-name{ font-size:1.6rem }
  .hk-hbtn{ padding:9px 11px; font-size:.72rem }
  .hk-hbtn span{ display:none }
  .hk-hangrow{ grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; padding:0 2px 6px }
  .hk-hang{ width:100%; min-width:0 }
  .htk-gal-sort-label{ padding:0 4px }
  .htk-gal-sort-label span{ display:none }
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
