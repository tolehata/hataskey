<template>
<PageWithHeader>
<svg width="0" height="0" style="position:absolute"><defs><filter id="htk-gfx" x="0%" y="0%" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.025 0.025" numOctaves="2" seed="92" result="n"/><feGaussianBlur in="n" stdDeviation="2" result="bl"/><feDisplacementMap in="SourceGraphic" in2="bl" scale="65" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>

<div class="htk-root" :data-bg="settings.bgTheme" :data-mode="themeMode" ref="rootEl">
<div class="htk-scene"><div class="htk-orb htk-orbA"></div><div class="htk-orb htk-orbB"></div><div class="htk-orb htk-orbC"></div><div class="htk-orb htk-orbD"></div>
<svg style="position:absolute;bottom:0;left:0;width:200%;min-width:1400px;height:100%" viewBox="0 0 1440 900" preserveAspectRatio="none"><path class="htk-swp1" fill="rgba(232,168,124,.12)" d="M0,640 C360,540 720,720 1080,580 C1260,510 1380,600 1440,580 L1440,900 L0,900Z"/><path class="htk-swp2" fill="rgba(133,205,202,.1)" d="M0,710 C240,650 480,770 720,690 C960,610 1200,740 1440,670 L1440,900 L0,900Z"/><path class="htk-swp3" fill="rgba(195,141,158,.08)" d="M0,770 C180,730 360,800 540,760 C720,720 900,790 1080,750 C1260,710 1380,770 1440,740 L1440,900 L0,900Z"/></svg>
</div>

<div class="htk-app" @touchstart.passive="htkTouchStart" @touchmove.passive="htkTouchMove" @touchend="htkTouchEnd">
<!-- HEADER: search left, title center, settings right -->
<header class="htk-lg htk-header htk-anim"><div class="htk-gc" style="display:flex;align-items:center;justify-content:space-between;padding:14px 22px"><button class="htk-btn htk-icon-sq" @click="showSearch=true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button><h1 style="font-size:1.35rem;font-weight:700;letter-spacing:.5px">Hatask</h1><button class="htk-btn htk-icon-sq" @click="showSettings=true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button></div></header>

<!-- NAV (desktop: inline, mobile: teleported to body for proper fixed positioning) -->
<nav class="htk-nav htk-nav-desktop htk-anim"><button v-for="tab in tabs" :key="tab.id" :class="['htk-nav-t',activeTab===tab.id&&'on']" @click="activeTab=tab.id"><span class="htk-ico">{{tab.icon}}</span>{{tab.label}}</button></nav>
<Teleport to="body"><div v-if="showMobileNav" class="htk-nav-pad" :data-bg="settings.bgTheme" :data-mode="themeMode"></div><nav v-if="showMobileNav" class="htk-nav htk-nav-mobile" :data-bg="settings.bgTheme" :data-mode="themeMode" :inert="false"><button class="htk-nav-t htk-nav-back" @click="handleBack" title="戻る"><span class="htk-ico"><i class="ti ti-arrow-left" style="font-size:1rem"></i></span></button><button v-for="tab in tabs" :key="tab.id" :class="['htk-nav-t',activeTab===tab.id&&'on']" @click="activeTab=tab.id"><span class="htk-ico">{{tab.icon}}</span>{{tab.label}}</button></nav></Teleport>

<!-- ========== HOME ========== -->
<div v-if="activeTab==='home'" class="htk-dash">
  <!-- RSVP (always top) -->
  <div v-if="pendingRsvps.length>0" class="htk-lg htk-anim"><div class="htk-gc">
    <h3 class="htk-sec-title">📩 参加確認が届いています</h3>
    <div v-for="rsvp in pendingRsvps" :key="rsvp.eventId" class="htk-rsvp-row">
      <div class="htk-rsvp-info">
        <div class="htk-rsvp-title">{{rsvp.emoji}} {{rsvp.title}}</div>
        <div class="htk-rsvp-time">{{rsvp.dateLabel}} <span v-if="rsvp.creatorUsername" style="opacity:.5;font-size:.85em">by @{{rsvp.creatorUsername}}</span></div>
      </div>
      <div class="htk-rsvp-btns">
        <button :class="['htk-rsvp-b','htk-rsvp-go',rsvp.myStatus==='going'&&'on']" @click="setRsvp(rsvp.eventId,'going')">行く</button>
        <button :class="['htk-rsvp-b','htk-rsvp-maybe',rsvp.myStatus==='maybe'&&'on']" @click="setRsvp(rsvp.eventId,'maybe')">検討中</button>
        <button :class="['htk-rsvp-b','htk-rsvp-no',rsvp.myStatus==='declined'&&'on']" @click="setRsvp(rsvp.eventId,'declined')">辞退</button>
      </div>
    </div>
  </div></div>
  <!-- Public events (always top) -->
  <div v-if="settings.showPublicEvents!==false && publicEvents.length" class="htk-lg htk-anim"><div class="htk-gc"><h3 class="htk-sec-title">みんなの予定</h3><div v-for="ev in publicEvents.slice(0,3)" :key="ev.id" class="htk-ev-row" @click="goToEvent(ev)"><div class="htk-ev-dot" :style="{background:ev.color}"></div><div class="htk-ev-info"><div class="htk-ev-title">{{ev.emoji||'📅'}} {{ev.title}}<span v-if="ev.isShared" style="opacity:.45;font-size:.8em;margin-left:6px">by @{{ev.username}}</span></div><div class="htk-ev-time">{{ev.timeLabel}}</div></div></div></div></div>
  <!-- RSVP closed notifications -->
  <div v-if="closedRsvpNotifs.length>0" class="htk-lg htk-anim"><div class="htk-gc">
    <div v-for="cn in closedRsvpNotifs" :key="cn.eventId" class="htk-rsvp-closed-row">
      <span>{{cn.emoji}} 「{{cn.title}}」の参加確認が締め切られました（参加: {{cn.goCount}}人）</span>
      <button class="htk-rsvp-dismiss" @click="dismissRsvpNotif(cn.eventId)">✕</button>
    </div>
  </div></div>
  <!-- Dynamic sections -->
  <template v-for="sec in sectionOrder" :key="sec">
    <div v-if="sec==='clock' && settings.showClock!==false" class="htk-lg htk-anim"><div class="htk-gc" style="text-align:center;padding:28px 20px"><div class="htk-dt-time">{{currentTime}}</div><div class="htk-dt-date">{{currentDate}}</div></div></div>
    <div v-if="sec==='eye' && settings.showEye!==false" class="htk-lg htk-anim" @click="activeTab='eye'" style="cursor:pointer"><div class="htk-gc htk-eye-card">
      <div class="htk-eye-label">Hatask Eye</div>
      <Transition name="htk-eye-fade" mode="out-in">
        <div class="htk-eye-phrase" :key="eyePhrase">{{eyePhrase}}</div>
      </Transition>
    </div></div>
    <div v-if="sec==='apps' && settings.showApps!==false" class="htk-lg htk-anim"><div class="htk-gc">
      <h3 class="htk-sec-title">旗鯖独自アプリ</h3>
      <div class="htk-apps-grid">
        <button class="htk-app-icon" @click="openDrawingTool">
          <div class="htk-app-icon-img" style="background:linear-gradient(135deg,#7eb5b2,#5a9e9a)"><i class="ti ti-brush" style="font-size:1.6rem;color:#fff"></i></div>
          <div class="htk-app-icon-name">お絵かき</div>
        </button>
        <button class="htk-app-icon" @click="openHataCard">
          <div class="htk-app-icon-img" style="background:linear-gradient(135deg,#e8a87c,#d4956a)"><i class="ti ti-cards" style="font-size:1.6rem;color:#fff"></i></div>
          <div class="htk-app-icon-name">HATA CARD</div>
        </button>
        <button class="htk-app-icon" @click="openPortal">
          <div class="htk-app-icon-img" style="background:linear-gradient(135deg,#a78bfa,#7c3aed)"><i class="ti ti-door-enter" style="font-size:1.6rem;color:#fff"></i></div>
          <div class="htk-app-icon-name">旗鯖ポータル</div>
        </button>
        <button class="htk-app-icon" @click="openHataSettings">
          <div class="htk-app-icon-img" style="background:linear-gradient(135deg,#f472b6,#db2777)"><i class="ti ti-flag" style="font-size:1.6rem;color:#fff"></i></div>
          <div class="htk-app-icon-name">旗鯖設定</div>
        </button>
        <button class="htk-app-icon" @click="openHataDocs">
          <div class="htk-app-icon-img" style="background:linear-gradient(135deg,#60a5fa,#3b82f6)"><i class="ti ti-book" style="font-size:1.6rem;color:#fff"></i></div>
          <div class="htk-app-icon-name">機能解説</div>
        </button>
        <button class="htk-app-icon" @click="openHatalyze">
          <div class="htk-app-icon-img" style="background:linear-gradient(135deg,#f59e0b,#d97706)"><i class="ti ti-mood-search" style="font-size:1.6rem;color:#fff"></i></div>
          <div class="htk-app-icon-name">HATAlyze</div>
        </button>
        <button class="htk-app-icon" @click="openWhatsNew">
          <div class="htk-app-icon-img" style="background:linear-gradient(135deg,#8b5cf6,#ec4899)"><i class="ti ti-sparkles" style="font-size:1.6rem;color:#fff"></i></div>
          <div class="htk-app-icon-name">旗鯖新機能</div>
        </button>
      </div>
    </div></div>
    <div v-if="sec==='loginDays' && settings.showLoginDays!==false" class="htk-lg htk-anim"><div class="htk-gc htk-login-card"><div class="htk-login-top"><div class="htk-login-days-n">{{loginDays}}</div><div class="htk-login-days-l">日目</div></div><div v-if="loginRanking>0" class="htk-login-rank"><span>🏆</span> サーバー内 <strong>{{loginRanking}}位</strong><span v-if="loginTotal>0" class="htk-login-total"> / {{loginTotal}}人</span></div><div class="htk-login-msg">{{loginMessage}}</div><div class="htk-login-next"><span>🎯</span> 次の実績まで: <strong>{{loginNextReward}}</strong>日</div></div></div>
    <div v-if="sec==='flower' && settings.showFlower!==false" class="htk-lg htk-anim" @click="activeTab='garden'" style="cursor:pointer"><div class="htk-gc" style="text-align:center"><h3 class="htk-sec-title">育てているお花</h3><div class="htk-fl-ring"><svg viewBox="0 0 140 140"><circle class="htk-fl-track" cx="70" cy="70" r="60"/><circle class="htk-fl-bar" cx="70" cy="70" r="60" :style="{strokeDashoffset:377-377*(flower.progress/100)}"/></svg><div class="htk-fl-emo">{{flower.emoji}}</div></div><div style="font-weight:600;font-size:.9rem">{{flower.name}}</div><div style="font-size:.73rem;color:var(--text-3);margin-top:3px">成長度: {{flower.progress}}%</div></div></div>
    <div v-if="sec==='events' && settings.showEvents!==false" class="htk-lg htk-anim"><div class="htk-gc"><h3 class="htk-sec-title">直近の予定</h3>
      <template v-if="upcomingEvents.length"><div v-for="ev in upcomingEvents.slice(0,4)" :key="ev.id" class="htk-ev-row" @click="goToEvent(ev)"><div class="htk-ev-dot" :style="{background:ev.color}"></div><div class="htk-ev-info"><div class="htk-ev-title">{{ev.title}}</div><div class="htk-ev-time">{{ev.timeLabel}}</div></div></div></template>
      <div v-else class="htk-empty" style="cursor:pointer" @click="activeTab='cal'"><div class="htk-empI">⊘</div><div>予定はありません</div></div>
    </div></div>
    <div v-if="sec==='mood' && settings.showMoodSummary!==false" class="htk-lg htk-anim"><div class="htk-gc" style="text-align:center"><h3 class="htk-sec-title">今週のきもち</h3><div class="htk-mood-wk" @click="activeTab='mood'" style="cursor:pointer"><div v-for="(m,i) in weekMoods" :key="i" class="htk-mood-wk-d"><span>{{m.emoji||'⊘'}}</span><span>{{m.day}}</span></div></div><div style="margin-top:10px"><button class="htk-btn htk-sm" @click.stop="activeTab='mood'">きもちを記録</button></div></div></div>
  </template>
  <div class="htk-lg htk-anim" style="grid-column:1/-1"><div class="htk-gc" style="text-align:center;padding:14px 22px"><button class="htk-btn htk-sm" style="opacity:.5" @click="showSettings=true">⚙ ホーム画面をカスタマイズ</button></div></div>
</div>

<!-- ========== CALENDAR ========== -->
<div v-if="activeTab==='cal'" class="htk-panels">
  <div class="htk-lg htk-anim"><div class="htk-gc">
    <div style="display:flex;gap:4px;margin-bottom:8px"><button :class="['htk-btn htk-xs',calViewMode==='calendar'&&'htk-sb-on']" @click="calViewMode='calendar'"><i class="ti ti-calendar"></i> カレンダー</button><button :class="['htk-btn htk-xs',calViewMode==='list'&&'htk-sb-on']" @click="calViewMode='list'"><i class="ti ti-list"></i> 一覧</button></div>
    <template v-if="calViewMode==='calendar'">
    <div class="htk-cal-hd"><div class="htk-cal-nav"><button class="htk-cal-nb" @click="chMo(-1)">&lt;</button></div><div class="htk-cal-ttl">{{calYear}}年 {{calMonth+1}}月</div><div class="htk-cal-nav"><button class="htk-cal-nb" @click="chMo(1)">&gt;</button><button class="htk-cal-nb" @click="goToday">●</button></div></div>
    <div class="htk-cal-wk"><div v-for="(d,i) in ['月','火','水','木','金','土','日']" :key="i" :class="['htk-cal-wk-d',i===5&&'sat',i===6&&'sun']">{{d}}</div></div>
    <div class="htk-cal-days"><div v-for="(cell,i) in calCells" :key="i" :class="['htk-cal-d',cell.om&&'om',cell.today&&'td',cell.selected&&'sel']" @click="!cell.om&&selectDay(cell.day)"><span>{{cell.day}}</span><div v-if="cell.dots&&cell.dots.length" class="htk-cal-dots"><span v-for="(dot,di) in cell.dots" :key="di" class="htk-cal-dot" :style="{background:dot.color}"></span></div></div></div>
    </template>
    <template v-else>
      <div class="htk-cal-hd"><div class="htk-cal-nav"><button class="htk-cal-nb" @click="chMo(-1)">&lt;</button></div><div class="htk-cal-ttl">{{calYear}}年 {{calMonth+1}}月</div><div class="htk-cal-nav"><button class="htk-cal-nb" @click="chMo(1)">&gt;</button><button class="htk-cal-nb" @click="goToday">●</button></div></div>
      <div style="display:flex;gap:4px;margin:8px 0;flex-wrap:wrap">
        <button :class="['htk-btn htk-xs',calListMode==='day'&&'htk-sb-on']" @click="calListMode='day';calListPage=1">日</button>
        <button :class="['htk-btn htk-xs',calListMode==='week'&&'htk-sb-on']" @click="calListMode='week';calListPage=1">週</button>
        <button :class="['htk-btn htk-xs',calListMode==='month'&&'htk-sb-on']" @click="calListMode='month';calListPage=1">月</button>
        <span style="flex:1"></span>
        <button :class="['htk-btn htk-xs',calListSort==='asc'&&'htk-sb-on']" @click="calListSort='asc';calListPage=1">↑古い順</button>
        <button :class="['htk-btn htk-xs',calListSort==='desc'&&'htk-sb-on']" @click="calListSort='desc';calListPage=1">↓新しい順</button>
      </div>
      <div v-for="ev in pagedCalList" :key="ev.id" :class="['htk-dayev-row',viewingEvent?.id===ev.id&&'active']" @click="openEventDetail(ev)">
        <div class="htk-dayev-dot" :style="{background:ev.color}"></div>
        <div class="htk-dayev-body">
          <div class="htk-dayev-title">{{ev.emoji}} {{ev.title}}<span v-if="ev.isShared" style="opacity:.4;font-size:.78em;margin-left:6px">@{{ev.username}}</span></div>
          <div class="htk-dayev-time">{{ev.date}} {{ev.allDay?'終日':((ev.timeStart||'')+(ev.timeEnd?' - '+ev.timeEnd:''))}}</div>
        </div>
      </div>
      <div v-if="!calListEvents.length" class="htk-empty"><div class="htk-empI">⊘</div><div>この期間に予定はありません</div></div>
      <div v-if="calListTotalPages>1" class="htk-pager"><button class="htk-btn htk-xs" :disabled="calListPage<=1" @click="calListPage--">&lt;</button><span class="htk-pager-t">{{calListPage}} / {{calListTotalPages}}</span><button class="htk-btn htk-xs" :disabled="calListPage>=calListTotalPages" @click="calListPage++">&gt;</button></div>
    </template>
  </div></div>

  <template v-if="calViewMode==='calendar'">
  <div v-if="selectedDay&&eventsForDay.length" class="htk-lg htk-anim"><div class="htk-gc">
    <h3 class="htk-sec-title">{{calMonth+1}}月{{selectedDay}}日の予定</h3>
    <div v-for="ev in pagedEvents" :key="ev.id">
      <div :class="['htk-dayev-row',viewingEvent?.id===ev.id&&'active']" @click="openEventDetail(ev)">
        <div class="htk-dayev-dot" :style="{background:ev.color}"></div>
        <div class="htk-dayev-body">
          <div class="htk-dayev-title">{{ev.emoji}} {{ev.title}}<span v-if="ev.isShared" style="opacity:.4;font-size:.78em;margin-left:6px">@{{ev.username}}</span></div>
          <div class="htk-dayev-time">{{ev.allDay?'終日':((ev.timeStart||'')+(ev.timeEnd?' - '+ev.timeEnd:''))}}</div>
        </div>
        <div class="htk-dayev-chevron"><i class="ti" :class="viewingEvent?.id===ev.id?'ti-chevron-up':'ti-chevron-down'"></i></div>
      </div>
      <!-- ===== EVENT DETAIL PANEL ===== -->
      <div v-if="viewingEvent?.id===ev.id" class="htk-evdet">
        <div class="htk-evdet-hdr">
          <div class="htk-evdet-meta">
            <div class="htk-evdet-sub">
              🗓 {{ev.date}}{{ev.dateEnd&&ev.dateEnd!==ev.date?' 〜 '+ev.dateEnd:''}}
              <span v-if="!ev.allDay && ev.timeStart"> · 🕐 {{ev.timeStart}}{{ev.timeEnd?' - '+ev.timeEnd:''}}</span>
              <span v-else-if="ev.allDay"> · 終日</span>
            </div>
            <div v-if="ev.isShared" class="htk-evdet-sub" style="margin-top:2px">主催: @{{ev.username}}</div>
          </div>
        </div>

        <!-- RSVP section: shared event with rsvp enabled -->
        <template v-if="sharedEventData(ev.id)?.rsvp">
          <!-- 主催者 view -->
          <template v-if="ev.userId===$i?.id">
            <div class="htk-evdet-sec-label">参加確認ダッシュボード</div>
            <div v-if="sharedEventData(ev.id)?.rsvpClosed" class="htk-rsvp-closed-badge" style="margin:4px 0 8px">✓ 締め切り済み</div>
            <div v-else class="htk-rsvp-open-badge" style="margin:4px 0 8px">🟢 受付中</div>
            <div class="htk-rsvp-stats">
              <div class="htk-rsvp-stat-card going"><div class="htk-rsvp-stat-n">{{sharedRsvpResponses(ev.id).filter(r=>r.status==='going').length}}</div><div class="htk-rsvp-stat-l">参加</div></div>
              <div class="htk-rsvp-stat-card maybe"><div class="htk-rsvp-stat-n">{{sharedRsvpResponses(ev.id).filter(r=>r.status==='maybe').length}}</div><div class="htk-rsvp-stat-l">検討中</div></div>
              <div class="htk-rsvp-stat-card declined"><div class="htk-rsvp-stat-n">{{sharedRsvpResponses(ev.id).filter(r=>r.status==='declined').length}}</div><div class="htk-rsvp-stat-l">辞退</div></div>
              <div class="htk-rsvp-stat-card total"><div class="htk-rsvp-stat-n">{{sharedRsvpResponses(ev.id).length}}</div><div class="htk-rsvp-stat-l">合計</div></div>
            </div>
            <div v-if="sharedRsvpResponses(ev.id).length" class="htk-rsvp-bar-wrap"><div class="htk-rsvp-bar">
              <div class="htk-rsvp-bar-seg going" :style="{width:(sharedRsvpResponses(ev.id).filter(r=>r.status==='going').length/sharedRsvpResponses(ev.id).length*100)+'%'}"></div>
              <div class="htk-rsvp-bar-seg maybe" :style="{width:(sharedRsvpResponses(ev.id).filter(r=>r.status==='maybe').length/sharedRsvpResponses(ev.id).length*100)+'%'}"></div>
              <div class="htk-rsvp-bar-seg declined" :style="{width:(sharedRsvpResponses(ev.id).filter(r=>r.status==='declined').length/sharedRsvpResponses(ev.id).length*100)+'%'}"></div>
            </div></div>
            <template v-if="sharedRsvpResponses(ev.id).length">
              <div v-if="sharedRsvpResponses(ev.id).filter(r=>r.status==='going').length" class="htk-rsvp-grp">
                <div class="htk-rsvp-grp-h"><span class="htk-rsvp-grp-dot going"></span>参加 ({{sharedRsvpResponses(ev.id).filter(r=>r.status==='going').length}})</div>
                <div class="htk-rsvp-grp-names"><span v-for="r in sharedRsvpResponses(ev.id).filter(r=>r.status==='going')" :key="r.userId" class="htk-rsvp-name">@{{r.username}}</span></div>
              </div>
              <div v-if="sharedRsvpResponses(ev.id).filter(r=>r.status==='maybe').length" class="htk-rsvp-grp">
                <div class="htk-rsvp-grp-h"><span class="htk-rsvp-grp-dot maybe"></span>検討中 ({{sharedRsvpResponses(ev.id).filter(r=>r.status==='maybe').length}})</div>
                <div class="htk-rsvp-grp-names"><span v-for="r in sharedRsvpResponses(ev.id).filter(r=>r.status==='maybe')" :key="r.userId" class="htk-rsvp-name">@{{r.username}}</span></div>
              </div>
              <div v-if="sharedRsvpResponses(ev.id).filter(r=>r.status==='declined').length" class="htk-rsvp-grp">
                <div class="htk-rsvp-grp-h"><span class="htk-rsvp-grp-dot declined"></span>辞退 ({{sharedRsvpResponses(ev.id).filter(r=>r.status==='declined').length}})</div>
                <div class="htk-rsvp-grp-names"><span v-for="r in sharedRsvpResponses(ev.id).filter(r=>r.status==='declined')" :key="r.userId" class="htk-rsvp-name">@{{r.username}}</span></div>
              </div>
            </template>
            <div v-else class="htk-rsvp-sum-empty">まだ回答がありません</div>
            <button v-if="!sharedEventData(ev.id)?.rsvpClosed" class="htk-btn htk-sm htk-danger" style="margin-top:10px;width:100%" @click="closeRsvp(ev.id)">参加確認を締め切る</button>
          </template>
          <!-- 参加者 view -->
          <template v-else>
            <div class="htk-evdet-sec-label">📩 参加確認</div>
            <div v-if="sharedEventData(ev.id)?.rsvpClosed" class="htk-rsvp-closed-badge" style="margin:4px 0 8px">締め切り済み</div>
            <template v-else>
              <div class="htk-evdet-rsvp-btns">
                <button :class="['htk-rsvp-b','htk-rsvp-go',sharedRsvpMyStatus(ev.id)==='going'&&'on']" @click="setRsvp(ev.id,'going')">✓ 行く</button>
                <button :class="['htk-rsvp-b','htk-rsvp-maybe',sharedRsvpMyStatus(ev.id)==='maybe'&&'on']" @click="setRsvp(ev.id,'maybe')">🤔 検討中</button>
                <button :class="['htk-rsvp-b','htk-rsvp-no',sharedRsvpMyStatus(ev.id)==='declined'&&'on']" @click="setRsvp(ev.id,'declined')">✕ 辞退</button>
              </div>
            </template>
            <div v-if="sharedRsvpResponses(ev.id).length" class="htk-evdet-resp-summary">
              <span style="opacity:.55;font-size:.78rem">参加 {{sharedRsvpResponses(ev.id).filter(r=>r.status==='going').length}} · 検討 {{sharedRsvpResponses(ev.id).filter(r=>r.status==='maybe').length}} · 辞退 {{sharedRsvpResponses(ev.id).filter(r=>r.status==='declined').length}}</span>
            </div>
          </template>
        </template>

        <!-- RSVP無し公開イベント（詳細のみ） -->
        <div v-else-if="ev.isShared" class="htk-evdet-note" style="opacity:.5;font-size:.8rem">参加確認なしの公開イベントです</div>

        <!-- Action buttons -->
        <div class="htk-evdet-acts">
          <template v-if="!ev.isShared || ev.userId===$i?.id">
            <button class="htk-btn htk-sm" @click="startEditEvent(ev);closeEventDetail()"><i class="ti ti-pencil"></i> 編集</button>
            <button class="htk-btn htk-sm htk-danger" @click="deleteEventById(ev.id);closeEventDetail()">✕ 削除</button>
          </template>
        </div>
      </div>
    </div>
  </div></div>
  <div v-if="eventTotalPages>1" class="htk-pager"><button class="htk-btn htk-xs" :disabled="eventPage<=1" @click="eventPage--">&lt;</button><span class="htk-pager-t">{{eventPage}} / {{eventTotalPages}}</span><button class="htk-btn htk-xs" :disabled="eventPage>=eventTotalPages" @click="eventPage++">&gt;</button></div>
  <div v-else-if="selectedDay" class="htk-lg htk-anim"><div class="htk-gc" style="text-align:center;padding:16px">
    <div style="font-size:.85rem;color:rgba(255,255,255,.5)">{{calMonth+1}}月{{selectedDay}}日の予定はありません</div>
  </div></div>
  </template>

  <div class="htk-lg htk-anim"><div class="htk-gc">
    <h3 class="htk-sec-title">{{editingEvent?'予定を編集':'新しい予定'}}</h3>
    <div class="htk-fg"><span class="htk-fl">タイトル</span><input class="htk-inp" v-model="newEvent.title" placeholder="予定のタイトル..."></div>
    <div class="htk-fg"><span class="htk-fl">絵文字</span><div class="htk-emp-row"><span v-for="e in eventEmojis" :key="e" :class="['htk-emp-i',newEvent.emoji===e&&'on']" @click="newEvent.emoji=e">{{e}}</span></div></div>
    <div class="htk-fg"><span class="htk-fl">日時</span>
      <div class="htk-tg-row" style="margin-bottom:8px"><span class="htk-tg-lab">終日（1日中）</span><button :class="['htk-tg-sw',newEvent.allDay&&'on']" @click="newEvent.allDay=!newEvent.allDay"></button></div>
      <div class="htk-fr"><input class="htk-inp" type="date" v-model="newEvent.date"><input v-if="!newEvent.allDay" class="htk-inp" type="time" v-model="newEvent.timeStart"></div>
      <div class="htk-fr" style="margin-top:5px"><input class="htk-inp" type="date" v-model="newEvent.dateEnd"><input v-if="!newEvent.allDay" class="htk-inp" type="time" v-model="newEvent.timeEnd"></div>
    </div>
    <div class="htk-fg"><span class="htk-fl">色</span><div class="htk-clr-row"><div v-for="c in eventColors" :key="c" :class="['htk-clr-o',newEvent.color===c&&'on']" :style="{background:c}" @click="newEvent.color=c"></div></div></div>
    <div class="htk-fg"><span class="htk-fl">公開範囲</span><div class="htk-vis-row"><div :class="['htk-vis-o',newEvent.visibility==='public'&&'on']" @click="newEvent.visibility='public'"><span class="htk-vi">🌐</span>公開</div><div :class="['htk-vis-o',newEvent.visibility==='private'&&'on']" @click="newEvent.visibility='private';newEvent.rsvp=false"><span class="htk-vi">🔒</span>自分のみ</div></div></div>
    <div class="htk-fg"><span class="htk-fl">オプション</span><div class="htk-tg-row"><span class="htk-tg-lab">参加確認</span><button :class="['htk-tg-sw',newEvent.rsvp&&'on']" :disabled="newEvent.visibility==='private'" :style="newEvent.visibility==='private'?'opacity:.35;cursor:not-allowed':''" @click="newEvent.visibility!=='private'&&(newEvent.rsvp=!newEvent.rsvp)"></button><span v-if="newEvent.visibility==='private'" style="font-size:.7rem;color:var(--text-3);margin-left:6px">※公開範囲が「自分のみ」の場合は利用不可</span></div>
    <div v-if="editingEvent && editingEvent.rsvp" class="htk-rsvp-summary">
      <div class="htk-rsvp-sum-header"><span class="htk-rsvp-sum-title">参加確認ダッシュボード</span></div>
      <div v-if="sharedEventData(editingEvent.id)?.rsvpClosed" class="htk-rsvp-closed-badge">✓ 締め切り済み</div>
      <div v-else class="htk-rsvp-open-badge">🟢 受付中</div>
      <!-- Stats cards -->
      <div class="htk-rsvp-stats">
        <div class="htk-rsvp-stat-card going"><div class="htk-rsvp-stat-n">{{sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='going').length}}</div><div class="htk-rsvp-stat-l">参加</div></div>
        <div class="htk-rsvp-stat-card maybe"><div class="htk-rsvp-stat-n">{{sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='maybe').length}}</div><div class="htk-rsvp-stat-l">検討中</div></div>
        <div class="htk-rsvp-stat-card declined"><div class="htk-rsvp-stat-n">{{sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='declined').length}}</div><div class="htk-rsvp-stat-l">辞退</div></div>
        <div class="htk-rsvp-stat-card total"><div class="htk-rsvp-stat-n">{{sharedRsvpResponses(editingEvent.id).length}}</div><div class="htk-rsvp-stat-l">合計</div></div>
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
          <div class="htk-rsvp-grp-h"><span class="htk-rsvp-grp-dot going"></span>参加 ({{sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='going').length}})</div>
          <div class="htk-rsvp-grp-names"><span v-for="r in sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='going')" :key="r.userId" class="htk-rsvp-name">@{{r.username}}</span></div>
        </div>
        <div v-if="sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='maybe').length" class="htk-rsvp-grp">
          <div class="htk-rsvp-grp-h"><span class="htk-rsvp-grp-dot maybe"></span>検討中 ({{sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='maybe').length}})</div>
          <div class="htk-rsvp-grp-names"><span v-for="r in sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='maybe')" :key="r.userId" class="htk-rsvp-name">@{{r.username}}</span></div>
        </div>
        <div v-if="sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='declined').length" class="htk-rsvp-grp">
          <div class="htk-rsvp-grp-h"><span class="htk-rsvp-grp-dot declined"></span>辞退 ({{sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='declined').length}})</div>
          <div class="htk-rsvp-grp-names"><span v-for="r in sharedRsvpResponses(editingEvent.id).filter(r=>r.status==='declined')" :key="r.userId" class="htk-rsvp-name">@{{r.username}}</span></div>
        </div>
      </template>
      <div v-else class="htk-rsvp-sum-empty">まだ回答がありません</div>
      <button v-if="!sharedEventData(editingEvent.id)?.rsvpClosed" class="htk-btn htk-sm htk-danger" style="margin-top:12px;width:100%" @click="closeRsvp(editingEvent.id)">参加確認を締め切る</button>
    </div><div class="htk-tg-row"><span class="htk-tg-lab">通知</span><button :class="['htk-tg-sw',newEvent.notify&&'on']" @click="newEvent.notify=!newEvent.notify"></button></div></div>
    <div v-if="newEvent.notify" class="htk-fg"><span class="htk-fl">通知タイミング</span><div class="htk-nt-chips"><span v-for="nt in notifyTimings" :key="nt" :class="['htk-nt-chip',newEvent.notifyTimings.includes(nt)&&'on']" @click="toggleNotifyTiming(nt)">{{nt}}</span></div></div>
    <div style="margin-top:14px;display:flex;gap:8px"><button class="htk-btn htk-primary" style="flex:1" @click="addEvent">{{editingEvent?'更新':'保存'}}</button><button v-if="editingEvent" class="htk-btn" @click="editingEvent=null;newEvent.title=''">キャンセル</button><button v-if="editingEvent" class="htk-btn htk-danger" @click="deleteEventById(editingEvent.id)">削除</button></div>
  </div></div>
</div>

<!-- ========== TODO ========== -->
<div v-if="activeTab==='todo'"><div class="htk-lg htk-anim"><div class="htk-gc">
  <h3 class="htk-sec-title">{{editingTodoId?'タスクを編集':'やることリスト'}}</h3>
  <div class="htk-todo-inp-r"><input class="htk-inp" v-model="newTodo" :placeholder="editingTodoId?'タスク名を編集...':'新しいタスクを追加...'" @keypress.enter="addTodo" style="flex:1"><button class="htk-btn htk-sm" @click="showTodoExtra=!showTodoExtra">詳細</button><button class="htk-btn htk-primary htk-sm" @click="addTodo">{{editingTodoId?'更新':'追加'}}</button><button v-if="editingTodoId" class="htk-btn htk-sm" @click="cancelEditTodo">取消</button></div>
  <div :class="['htk-todo-xf',showTodoExtra&&'open']">
    <div class="htk-todo-xf-i"><label>期日</label><input class="htk-inp" type="date" v-model="newTodoDue"></div>
    <div class="htk-todo-xf-i"><label>時刻</label><input class="htk-inp" type="time" v-model="newTodoTime"></div>
    <div class="htk-todo-xf-i"><label>フォルダ</label><select class="htk-inp" v-model="newTodoFolder"><option value="">フォルダなし</option><option v-for="fo in folders" :key="fo.id" :value="fo.id">{{fo.emoji}} {{fo.name}}</option></select></div>
    <div class="htk-todo-xf-i" style="flex:2;min-width:170px"><label>コメント</label><input class="htk-inp" v-model="newTodoComment" placeholder="メモ..."></div>
  </div>
  <div class="htk-fbar">
    <button :class="['htk-ftab',activeFolder==='all'&&'on']" @click="activeFolder='all'">すべて<span class="htk-fc">{{pendingCount}}</span></button>
    <button v-for="fo in folders" :key="fo.id" :class="['htk-ftab',activeFolder===fo.id&&'on']" :style="fo.color?{borderLeft:'3px solid '+fo.color}:{}" @click="activeFolder=fo.id"><span v-if="fo.color" class="htk-fm-dot" :style="{background:fo.color}"></span>{{fo.emoji}} {{fo.name}}<span class="htk-fc">{{folderCount(fo.id)}}</span></button>
    <button class="htk-fm-btn" @click="showFolderMgr=!showFolderMgr">+ フォルダ管理</button>
  </div>
  <div v-if="showFolderMgr" class="htk-fm-panel htk-lg-in">
    <div style="font-size:.78rem;color:var(--text-2);margin-bottom:8px;font-weight:600">フォルダ管理</div>
    <div v-for="(fo,i) in folders" :key="fo.id" class="htk-fm-row"><span v-if="fo.color" class="htk-fm-dot" :style="{background:fo.color}"></span><span class="htk-fm-emoji">{{fo.emoji}}</span><span class="htk-fm-name">{{fo.name}}</span><div class="htk-fm-acts"><button class="htk-btn htk-xs" @click="changeFolderColor(i)" title="色変更">🎨</button><button class="htk-btn htk-xs" @click="renameFolder(i)"><i class="ti ti-pencil"></i></button><button class="htk-btn htk-xs" @click="moveFolder(i,-1)" :disabled="i===0">↑</button><button class="htk-btn htk-xs" @click="moveFolder(i,1)" :disabled="i===folders.length-1">↓</button><button class="htk-btn htk-xs htk-danger" @click="deleteFolder(i)">✕</button></div></div>
    <div v-if="!folders.length" style="font-size:.78rem;color:var(--text-3);padding:6px">フォルダなし</div>
    <div style="margin-top:6px">
      <div style="display:flex;gap:5px;align-items:center"><input class="htk-inp" v-model="newFolderName" placeholder="フォルダ名..." style="flex:1;font-size:.78rem;padding:7px 12px"><button class="htk-btn htk-xs htk-primary" @click="addFolder">追加</button></div>
      <div class="htk-folder-clr-row"><span style="font-size:.7rem;color:var(--text-3)">色:</span><div v-for="c in folderColors" :key="c.value" :class="['htk-folder-clr-o',newFolderColor===c.value&&'on']" :style="{background:c.value}" :title="c.label" @click="newFolderColor=c.value"></div><div :class="['htk-folder-clr-o htk-folder-clr-none',newFolderColor===''&&'on']" title="なし" @click="newFolderColor=''">×</div></div>
    </div>
  </div>
  <div class="htk-sbar"><span class="htk-sbar-l">並び替え:</span><button v-for="s in sortOptions" :key="s.id" :class="['htk-btn htk-xs',sortMode===s.id&&'htk-sb-on']" @click="sortMode=s.id">{{s.label}}</button></div>
  <div v-for="todo in pagedTodos" :key="todo.id" :class="['htk-todo-i',todo.done&&'done']">
    <div :class="['htk-todo-cb',todo.done&&'ck']" @click="toggleTodo(todo.id)"></div>
    <div class="htk-todo-ct" @click="expandedTodo=expandedTodo===todo.id?null:todo.id">
      <div class="htk-todo-tx">{{todo.text}}</div>
      <div class="htk-todo-mt"><span v-if="todo.due" :class="['htk-todo-db',isOverdue(todo.due)&&!todo.done&&'od',isDueToday(todo.due)&&'tdy']">{{formatDue(todo.due,todo.time)}}</span><span v-if="getFolderLabel(todo.folder)&&activeFolder==='all'" class="htk-todo-fb">{{getFolderLabel(todo.folder)}}</span></div>
      <div v-if="todo.comment" class="htk-todo-cp">{{todo.comment.split('\n')[0]}}</div>
      <div v-if="expandedTodo===todo.id" class="htk-todo-dx open"><div v-if="todo.comment" style="font-size:.78rem;color:var(--text-2);line-height:1.5;white-space:pre-wrap">{{todo.comment}}</div><div v-else style="font-size:.73rem;color:var(--text-3)">コメントなし</div></div>
    </div>
    <div class="htk-todo-acts"><button class="htk-todo-ab" @click="editTodo(todo.id)"><i class="ti ti-pencil"></i></button><button class="htk-todo-ab del" @click="deleteTodo(todo.id)">✕</button></div>
  </div>
  <div v-if="todoTotalPages>1" class="htk-pager"><button class="htk-btn htk-xs" :disabled="todoPage<=1" @click="todoPage--">&lt;</button><span class="htk-pager-t">{{todoPage}} / {{todoTotalPages}}</span><button class="htk-btn htk-xs" :disabled="todoPage>=todoTotalPages" @click="todoPage++">&gt;</button></div>
  <div v-if="!sortedTodos.length" class="htk-empty"><div class="htk-empI">⊘</div><div>タスクなし</div></div>
</div></div></div>

<!-- ========== NOTIFICATIONS ========== -->


<!-- ========== MOOD ========== -->
<div v-if="activeTab==='mood'" class="htk-panels">
  <div class="htk-lg htk-anim"><div class="htk-gc">
    <h3 class="htk-sec-title">{{editingMood?'きもちを編集':'きもちを記録'}} <button class="htk-info-btn" @click="showMoodDisclaimer=true">?</button></h3>
    <div style="font-size:.72rem;opacity:.4;margin-bottom:10px">この機能はセルフケア用です。医療目的ではありません。</div>
    <div class="htk-mood-sc"><div v-for="m in moodOptions" :key="m.level" :class="['htk-mood-o',selectedMoodLevel===m.level&&'on']" @click="selectedMoodLevel=m.level"><span class="htk-mood-e">{{m.emoji}}</span><span class="htk-mood-l">{{m.label}}</span></div></div>
    <div class="htk-coll-h" @click="showMoodNote=!showMoodNote"><span class="htk-fl" style="margin:0">ひとこと</span><span class="htk-ci">{{showMoodNote?'▲':'▼'}}</span></div>
    <div v-if="showMoodNote">
      <div class="htk-fg" style="margin-top:5px"><textarea class="htk-inp" v-model="moodNote" placeholder="今日あったことや気持ちをメモ..."></textarea></div>
      <div class="htk-fg"><span class="htk-fl">絵文字</span><div class="htk-emp-row"><span v-for="e in moodEmojisExtra" :key="e" :class="['htk-emp-i',moodSelectedEmoji===e&&'on']" @click="moodSelectedEmoji=moodSelectedEmoji===e?'':e">{{e}}</span></div></div>
    </div>
    <div class="htk-coll-h" @click="showMoodRemind=!showMoodRemind"><span class="htk-fl" style="margin:0">リマインド通知</span><span class="htk-ci">{{showMoodRemind?'▲':'▼'}}</span></div>
    <div v-if="showMoodRemind" style="padding-top:5px">
      <div class="htk-tg-row"><span class="htk-tg-lab">リマインド</span><button :class="['htk-tg-sw',settings.moodRemind&&'on']" @click="settings.moodRemind=!settings.moodRemind;saveSettings()"></button></div>
      <div class="htk-nt-chips" style="margin-top:5px"><span v-for="t in moodRemindTimes" :key="t" :class="['htk-nt-chip',settings.moodRemindTimes?.includes(t)&&'on']" @click="toggleMoodRemindTime(t)">{{t}}</span></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="htk-btn htk-primary" style="flex:1" @click="saveMood" :disabled="isSaving">{{isSaving?'保存中...':(editingMood?'更新':'きもちを保存')}}</button><button v-if="editingMood" class="htk-btn" @click="cancelEditMood">キャンセル</button></div>
  </div></div>

  <!-- MOOD ANALYSIS -->
  <div v-if="moods.length>=3" class="htk-lg htk-anim"><div class="htk-gc">
    <h3 class="htk-sec-title">きもち分析</h3>
    <div class="htk-ma-grid">
      <div class="htk-ma-card">
        <div class="htk-ma-label">最近の傾向</div>
        <div class="htk-ma-big" :style="{color: moodAnalysis.trendColor}">{{moodAnalysis.trendEmoji}}</div>
        <div class="htk-ma-desc">{{moodAnalysis.trendLabel}}</div>
      </div>
      <div class="htk-ma-card">
        <div class="htk-ma-label">平均スコア (7日間)</div>
        <div class="htk-ma-big">{{moodAnalysis.avgScore}}</div>
        <div class="htk-ma-bar"><div class="htk-ma-bar-fill" :style="{width: (moodAnalysis.avgScoreRaw/5*100)+'%', background: moodAnalysis.trendColor}"></div></div>
      </div>
    </div>
    <div class="htk-ma-section">
      <div class="htk-ma-label" style="margin-bottom:8px">時間帯別の傾向</div>
      <div class="htk-ma-times">
        <div v-for="t in moodAnalysis.timeSlots" :key="t.label" class="htk-ma-time">
          <div class="htk-ma-time-emo">{{t.emoji}}</div>
          <div class="htk-ma-time-info">
            <div class="htk-ma-time-label">{{t.label}}</div>
            <div class="htk-ma-time-bar"><div class="htk-ma-time-fill" :style="{width: (t.avg/5*100)+'%', background: t.color}"></div></div>
          </div>
          <div class="htk-ma-time-score">{{t.avg.toFixed(1)}}</div>
        </div>
      </div>
    </div>
    <div v-if="moodAnalysis.insight" class="htk-ma-insight">
      <span style="margin-right:4px">💡</span>{{moodAnalysis.insight}}
    </div>
  </div></div>

  <div class="htk-lg htk-anim"><div class="htk-gc"><h3 class="htk-sec-title">きもちの記録</h3>
    <template v-if="moods.length"><div v-for="date in pagedMoodDates" :key="date" class="htk-mood-dg"><div class="htk-mood-dg-h">{{formatMoodDate(String(date))}}<span v-if="moodsByDate[date].length>1" class="htk-mood-dg-c">{{moodsByDate[date].length}}件</span></div><div v-for="m in moodsByDate[date]" :key="m.id" class="htk-mood-en"><div class="htk-mood-en-t">{{m.time}}</div><span class="htk-mood-en-e">{{moodEmojis[m.level]}}</span><div class="htk-mood-en-ct"><div class="htk-mood-en-n">{{m.note}}</div><div v-if="m.emoji" class="htk-mood-en-ce">{{m.emoji}}</div></div><div class="htk-mood-en-acts"><button class="htk-mood-en-a" @click="startEditMood(m)"><i class="ti ti-pencil"></i></button><button class="htk-mood-en-a del" @click="deleteMood(m.id)">✕</button></div></div></div>
    <div v-if="moodTotalPages>1" class="htk-pager"><button class="htk-btn htk-xs" :disabled="moodPage<=1" @click="moodPage--">&lt;</button><span class="htk-pager-t">{{moodPage}} / {{moodTotalPages}}</span><button class="htk-btn htk-xs" :disabled="moodPage>=moodTotalPages" @click="moodPage++">&gt;</button></div>
    </template>
    <div v-else class="htk-empty"><div class="htk-empI">⊘</div><div>まだ記録なし</div></div>
  </div></div>
</div>

<!-- ========== GARDEN ========== -->
<div v-if="activeTab==='garden'" class="htk-panels">
  <div class="htk-lg htk-anim"><div class="htk-gc" style="text-align:center;min-height:240px">
    <h3 class="htk-sec-title">いま育てているお花 <button class="htk-info-btn" @click="showFlowerInfo=true">?</button></h3>
    <div class="htk-fl-ring" style="width:140px;height:140px"><svg viewBox="0 0 160 160"><circle class="htk-fl-track" cx="80" cy="80" r="70"/><circle class="htk-fl-bar" cx="80" cy="80" r="70" :style="{strokeDasharray:'440',strokeDashoffset:440-440*(flower.progress/100)}"/></svg><div class="htk-fl-emo" style="font-size:3rem">{{flower.emoji}}</div></div>
    <div style="font-weight:600;font-size:1rem">{{flower.name}}</div>
    <div v-if="currentFlowerHanakotoba" style="font-size:.72rem;color:var(--text-3);margin-top:2px;opacity:.7">花言葉: {{currentFlowerHanakotoba}}</div>
    <div style="font-size:.75rem;color:var(--text-3);margin-top:4px">成長度: {{flower.progress}}% / 累計: {{formatMinutes(flower.totalMinutes)}}</div>
    <div v-if="flower.progress<100" style="font-size:.75rem;color:var(--text-3);margin-top:6px">あと約{{estimateRemaining}}で花が咲きます</div>
    <button v-else class="htk-btn htk-primary htk-sm" style="margin-top:10px" @click="harvestFlower">花を収穫して名前をつける</button>
  </div></div>
  <div class="htk-lg htk-anim"><div class="htk-gc"><h3 class="htk-sec-title">フラワーギャラリー</h3>
    <div v-if="gallery.length" class="htk-gal-g"><div v-for="fl in gallery" :key="fl.id" class="htk-gal-i" @click="renameFlower(fl)"><span class="htk-gal-e">{{fl.emoji}}</span><div class="htk-gal-n">{{fl.name}}</div><div v-if="fl.hanakotoba" class="htk-gal-hk">{{fl.hanakotoba}}</div><div class="htk-gal-d">{{fl.date}}</div></div></div>
    <div v-else class="htk-empty"><div class="htk-empI">⊘</div><div>まだお花が咲いていません</div></div>
  </div></div>
</div>
</div>

<!-- ========== EYE PAGE ========== -->
<div v-if="activeTab==='eye'" class="htk-panels" style="padding-bottom:40px">
  <!-- Eye phrase (big) -->
  <div class="htk-lg htk-anim"><div class="htk-gc htk-eye-page-top">
    <div class="htk-eye-logo">◎</div>
    <div class="htk-eye-page-label">Hatask Eye</div>
    <Transition name="htk-eye-fade" mode="out-in">
      <div class="htk-eye-page-phrase" :key="eyePhrase">{{eyePhrase}}</div>
    </Transition>
  </div></div>

  <!-- 統計サマリー -->
  <div class="htk-lg htk-anim"><div class="htk-gc">
    <h3 class="htk-sec-title">あなたの記録</h3>
    <div class="htk-eye-stats">
      <div class="htk-eye-stat"><div class="htk-eye-stat-n">{{moods.length}}</div><div class="htk-eye-stat-l">累計きもち記録</div></div>
      <div class="htk-eye-stat"><div class="htk-eye-stat-n">{{todos.filter(t=>t.done).length}}</div><div class="htk-eye-stat-l">達成タスク</div></div>
      <div class="htk-eye-stat"><div class="htk-eye-stat-n">{{todos.length}}</div><div class="htk-eye-stat-l">作成タスク</div></div>
      <div class="htk-eye-stat"><div class="htk-eye-stat-n">{{todoCompletionRate}}%</div><div class="htk-eye-stat-l">達成率</div></div>
    </div>
  </div></div>

  <!-- 進捗状況 -->
  <div class="htk-lg htk-anim"><div class="htk-gc">
    <h3 class="htk-sec-title">進捗状況</h3>
    <div class="htk-eye-progress-row">
      <span class="htk-eye-prog-label">今週のタスク消化</span>
      <div class="htk-eye-prog-bar"><div class="htk-eye-prog-fill" :style="{width:weeklyTaskProgress+'%'}"></div></div>
      <span class="htk-eye-prog-val">{{weeklyTaskProgress}}%</span>
    </div>
    <div class="htk-eye-progress-row">
      <span class="htk-eye-prog-label">今月のきもち記録</span>
      <div class="htk-eye-prog-bar"><div class="htk-eye-prog-fill htk-eye-prog-mood" :style="{width:monthlyMoodProgress+'%'}"></div></div>
      <span class="htk-eye-prog-val">{{monthlyMoodCount}}日</span>
    </div>
    <div class="htk-eye-progress-row">
      <span class="htk-eye-prog-label">花の成長</span>
      <div class="htk-eye-prog-bar"><div class="htk-eye-prog-fill htk-eye-prog-flower" :style="{width:flower.progress+'%'}"></div></div>
      <span class="htk-eye-prog-val">{{flower.progress}}%</span>
    </div>
  </div></div>

  <!-- 育てた花の花言葉 -->
  <div class="htk-lg htk-anim"><div class="htk-gc">
    <h3 class="htk-sec-title">花言葉コレクション</h3>
    <div v-if="galleryWithHanakotoba.length" class="htk-eye-hk-list">
      <div v-for="fl in galleryWithHanakotoba" :key="fl.id" class="htk-eye-hk-row">
        <span class="htk-eye-hk-emoji">{{fl.emoji}}</span>
        <div class="htk-eye-hk-info">
          <div class="htk-eye-hk-name">{{fl.name}}</div>
          <div class="htk-eye-hk-word">{{fl.hanakotoba}}</div>
        </div>
      </div>
    </div>
    <div v-else class="htk-empty"><div class="htk-empI">⊘</div><div>お花を収穫すると花言葉が集まります</div></div>
  </div></div>

  <!-- 現在育てている花 -->
  <div class="htk-lg htk-anim"><div class="htk-gc" style="text-align:center">
    <h3 class="htk-sec-title">いま育てているお花</h3>
    <div class="htk-fl-ring" style="width:100px;height:100px"><svg viewBox="0 0 120 120"><circle class="htk-fl-track" cx="60" cy="60" r="50"/><circle class="htk-fl-bar" cx="60" cy="60" r="50" :style="{strokeDasharray:'314',strokeDashoffset:314-314*(flower.progress/100)}"/></svg><div class="htk-fl-emo" style="font-size:2rem">{{flower.emoji}}</div></div>
    <div style="font-weight:600;font-size:.9rem">{{flower.name}}</div>
    <div v-if="currentFlowerHanakotoba" style="font-size:.7rem;color:var(--text-3);opacity:.7">花言葉: {{currentFlowerHanakotoba}}</div>
    <div v-if="flower.progress>=100" style="margin-top:8px"><button class="htk-btn htk-primary htk-sm" @click="harvestFlower">花を収穫する</button></div>
  </div></div>
</div>

<!-- SEARCH MODAL -->
<Teleport to="body"><div v-if="showSearch" class="htk-modal-ov" @click.self="showSearch=false"><div class="htk-lg htk-modal-c htk-sch-modal"><div class="htk-gc">
  <h3 class="htk-sec-title">検索</h3>
  <input class="htk-inp htk-sch-inp" v-model="searchQuery" placeholder="予定・きもち・ToDoを検索..." ref="searchInput">
  <div class="htk-sch-body">
  <div v-if="!searchQuery">
    <template v-if="upcomingEvents.length"><div class="htk-sch-sec">直近の予定</div><div v-for="ev in upcomingEvents.slice(0,3)" :key="'se'+ev.id" class="htk-sch-it" @click="showSearch=false;goToEvent(ev)"><div class="htk-ev-dot" :style="{background:ev.color}"></div><div class="htk-sch-it-body"><div class="htk-sch-it-title">{{ev.title}}</div><div class="htk-sch-it-sub">{{formatSearchDate(ev.date)}} {{ev.timeStart}}</div></div></div></template>
    <template v-if="recentMoodsForSearch.length"><div class="htk-sch-sec">最近のきもち</div><div v-for="m in recentMoodsForSearch" :key="'sm'+m.id" class="htk-sch-it" @click="showSearch=false;activeTab='mood'"><span class="htk-sch-it-emo">{{moodEmojis[m.level]}}</span><div class="htk-sch-it-body"><div class="htk-sch-it-title">{{m.note}}</div><div class="htk-sch-it-sub">{{formatSearchDate(m.date)}} {{m.time}}</div></div></div></template>
    <template v-if="todos.filter(t=>!t.done).length"><div class="htk-sch-sec">最近のToDo</div><div v-for="t in todos.filter(t=>!t.done).slice(0,3)" :key="'st'+t.id" class="htk-sch-it" @click="showSearch=false;activeTab='todo'"><div class="htk-ev-dot" style="background:var(--primary)"></div><div class="htk-sch-it-body"><div class="htk-sch-it-title">{{t.text}}</div><div class="htk-sch-it-sub">{{t.due?'期日: '+formatSearchDate(t.due):'期日なし'}}</div></div></div></template>
  </div>
  <div v-else>
    <template v-if="searchResults.events.length"><div class="htk-sch-sec">予定</div><div v-for="ev in searchResults.events" :key="'re'+ev.id" class="htk-sch-it" @click="showSearch=false;goToEvent(ev)"><div class="htk-ev-dot" :style="{background:ev.color}"></div><div class="htk-sch-it-body"><div class="htk-sch-it-title">{{ev.title}}</div><div class="htk-sch-it-sub">{{formatSearchDate(ev.date)}} {{ev.timeStart}}</div></div></div></template>
    <template v-if="searchResults.moods.length"><div class="htk-sch-sec">きもち</div><div v-for="m in searchResults.moods" :key="'rm'+m.id" class="htk-sch-it"><span class="htk-sch-it-emo">{{moodEmojis[m.level]}}</span><div class="htk-sch-it-body"><div class="htk-sch-it-title">{{m.note}}</div><div class="htk-sch-it-sub">{{formatSearchDate(m.date)}} {{m.time}}</div></div></div></template>
    <template v-if="searchResults.todos.length"><div class="htk-sch-sec">ToDo</div><div v-for="t in searchResults.todos" :key="'rt'+t.id" class="htk-sch-it"><div class="htk-ev-dot" style="background:var(--primary)"></div><div class="htk-sch-it-body"><div class="htk-sch-it-title">{{t.text}}</div><div class="htk-sch-it-sub">{{t.due?'期日: '+formatSearchDate(t.due):'期日なし'}}</div></div></div></template>
    <div v-if="!searchResults.todos.length&&!searchResults.moods.length&&!searchResults.events.length" class="htk-empty">⊘ 見つかりません</div>
  </div>
  </div>
  <div class="htk-sch-note">自分が登録したデータのみ検索できます（共通の予定は例外）</div>
  <div style="text-align:center;margin-top:12px"><button class="htk-btn htk-primary htk-sch-close" @click="showSearch=false">閉じる</button></div>
</div></div></div></Teleport>

<!-- SETTINGS MODAL -->
<Teleport to="body"><div v-if="showSettings" class="htk-modal-ov" @click.self="showSettings=false"><div class="htk-stg-wrap">
  <div class="htk-stg-topbar"><button class="htk-btn htk-stg-close-top" @click="showSettings=false"><i class="ti ti-x" style="font-size:1.1rem"></i></button></div>
  <h2 class="htk-stg-h">設定</h2>

  <div class="htk-lg htk-stg-card"><div class="htk-gc htk-stg-gc">
    <div class="htk-stg-label">背景テーマ</div>
    <div class="htk-bg-picker"><div v-for="bg in bgThemes" :key="bg.id" style="text-align:center"><div :class="['htk-bg-opt','htk-bg-'+bg.id,settings.bgTheme===bg.id&&'on']" @click="setBg(bg.id)"></div></div></div>
  </div></div>

  <div class="htk-lg htk-stg-card"><div class="htk-gc htk-stg-gc">
    <div class="htk-stg-label">表示</div>
    <div class="htk-stg-row"><span>ダークモード</span><button :class="['htk-tg-sw',settings.darkMode&&'on']" @click="toggleDarkMode"></button></div>
  </div></div>

  <div class="htk-lg htk-stg-card"><div class="htk-gc htk-stg-gc">
    <div class="htk-stg-label">カレンダー</div>
    <div class="htk-stg-row"><span>週の始まり</span><select class="htk-stg-sel" v-model="settings.weekStart" @change="saveSettings()"><option value="mon">月曜</option><option value="sun">日曜</option></select></div>
  </div></div>

  <div class="htk-lg htk-stg-card"><div class="htk-gc htk-stg-gc">
    <div class="htk-stg-label">ホーム画面 - 表示切替</div>
    <div class="htk-stg-row"><span>日時表示</span><button :class="['htk-tg-sw',settings.showClock!==false&&'on']" @click="settings.showClock=!(settings.showClock!==false);saveSettings()"></button></div>
    <div class="htk-stg-row"><span>Hatask Eye</span><button :class="['htk-tg-sw',settings.showEye!==false&&'on']" @click="settings.showEye=!(settings.showEye!==false);saveSettings()"></button></div>
    <div class="htk-stg-row"><span>旗鯖独自アプリ</span><button :class="['htk-tg-sw',settings.showApps!==false&&'on']" @click="settings.showApps=!(settings.showApps!==false);saveSettings()"></button></div>
    <div class="htk-stg-row"><span>ログイン日数</span><button :class="['htk-tg-sw',settings.showLoginDays!==false&&'on']" @click="settings.showLoginDays=!(settings.showLoginDays!==false);saveSettings()"></button></div>
    <div class="htk-stg-row"><span>お花</span><button :class="['htk-tg-sw',settings.showFlower!==false&&'on']" @click="settings.showFlower=!(settings.showFlower!==false);saveSettings()"></button></div>
    <div class="htk-stg-row"><span>直近の予定</span><button :class="['htk-tg-sw',settings.showEvents!==false&&'on']" @click="settings.showEvents=!(settings.showEvents!==false);saveSettings()"></button></div>
    <div class="htk-stg-row"><span>みんなの予定</span><button :class="['htk-tg-sw',settings.showPublicEvents!==false&&'on']" @click="settings.showPublicEvents=!(settings.showPublicEvents!==false);saveSettings()"></button></div>
    <div class="htk-stg-row"><span>きもちサマリー</span><button :class="['htk-tg-sw',settings.showMoodSummary!==false&&'on']" @click="settings.showMoodSummary=!(settings.showMoodSummary!==false);saveSettings()"></button></div>
  </div></div>

  <div class="htk-lg htk-stg-card"><div class="htk-gc htk-stg-gc">
    <div class="htk-stg-label">ホーム画面 - セクション並び替え</div>
    <div class="htk-stg-desc">上下ボタンでホーム画面のセクション順を変更できます</div>
    <div class="htk-reorder-list">
      <div v-for="(sec,idx) in sectionOrder" :key="sec" class="htk-reorder-item">
        <span class="htk-reorder-handle">☰</span>
        <span class="htk-reorder-label">{{sectionLabels[sec]||sec}}</span>
        <div class="htk-reorder-btns">
          <button class="htk-reorder-btn" :disabled="idx===0" @click="moveSectionUp(idx)">▲</button>
          <button class="htk-reorder-btn" :disabled="idx===sectionOrder.length-1" @click="moveSectionDown(idx)">▼</button>
        </div>
      </div>
    </div>
  </div></div>

  <div class="htk-lg htk-stg-card"><div class="htk-gc htk-stg-gc">
    <div class="htk-stg-label">データ同期</div>
    <div class="htk-stg-desc">お使いの旗鯖アカウントに紐づけて同期します</div>
    <div class="htk-stg-row"><span>予定</span><button class="htk-tg-sw on"></button></div>
    <div class="htk-stg-row"><span>きもち</span><button class="htk-tg-sw on"></button></div>
    <div class="htk-stg-row"><span>ToDo</span><button class="htk-tg-sw on"></button></div>
    <div class="htk-stg-row"><span>お花</span><button class="htk-tg-sw on"></button></div>
  </div></div>

  <div class="htk-lg htk-stg-card"><div class="htk-gc htk-stg-gc">
    <div class="htk-stg-label">レートリミット</div>
    <div class="htk-rl-box"><div class="htk-rl-t">API制限</div><table class="htk-rl-tbl"><thead><tr><th>操作</th><th>制限</th><th>期間</th></tr></thead><tbody><tr><td>予定作成</td><td>30回</td><td>1h</td></tr><tr><td>きもち</td><td>20回</td><td>1h</td></tr><tr><td>ToDo</td><td>60回</td><td>1h</td></tr><tr><td>検索</td><td>30回</td><td>1m</td></tr></tbody></table></div>
  </div></div>

  <div class="htk-lg htk-stg-card"><div class="htk-gc htk-stg-gc">
    <div class="htk-stg-label">通知</div>
    <div class="htk-stg-row"><span>テスト通知を送信</span><button class="htk-btn htk-sm" @click="sendTestNotification">テスト送信</button></div>
    <div class="htk-stg-desc" style="margin-top:6px">設定→通知→プッシュ通知を有効化 でプッシュ通知を有効にしないと、旗鯖が開かれていない状態で通知を受け取ることができません</div>
  </div></div>

  <div class="htk-lg htk-stg-card"><div class="htk-gc htk-stg-gc">
    <div class="htk-stg-label">起動時</div>
    <div class="htk-stg-row"><span>アプリ起動時にHataskを表示</span><button :class="['htk-tg-sw',settings.openOnStart&&'on']" @click="settings.openOnStart=!settings.openOnStart;saveSettings()"></button></div>
  </div></div>

  <div class="htk-lg htk-stg-card"><div class="htk-gc htk-stg-gc">
    <div class="htk-stg-label">ヘルプ</div>
    <div class="htk-stg-row"><span>チュートリアルを再度表示</span><button class="htk-btn htk-sm" @click="reopenTutorial">表示する</button></div>
  </div></div>

  <div style="text-align:center;padding:10px 0 20px"><button class="htk-btn htk-primary htk-stg-close" @click="showSettings=false">閉じる</button></div>
</div></div></Teleport>

<!-- MOOD DISCLAIMER MODAL -->
<Teleport to="body"><div v-if="showMoodDisclaimer" class="htk-modal-ov" @click.self="showMoodDisclaimer=false"><div class="htk-lg htk-modal-c"><div class="htk-gc" style="padding:28px"><div style="text-align:center;font-size:2rem;margin-bottom:8px;text-shadow:none">ⓘ</div><div style="text-align:center;font-size:.92rem;font-weight:700;margin-bottom:10px">きもち記録について</div><div class="htk-popup-b">この機能は日々の気分を振り返るためのセルフケアツールです。<br><br>医療目的で開発されたものではなく、<strong>疾病の診断・治療・治癒、または身体の機能改善を保証するものではありません。</strong><br><br>心身の不調が続く場合は医療機関への受診をおすすめします。</div><div style="text-align:center;margin-top:14px"><button class="htk-btn htk-primary" @click="showMoodDisclaimer=false">了承する</button></div></div></div></div></Teleport>

<!-- FLOWER INFO MODAL -->
<Teleport to="body"><div v-if="showFlowerInfo" class="htk-modal-ov" @click.self="showFlowerInfo=false"><div class="htk-lg htk-modal-c"><div class="htk-gc" style="padding:28px"><div style="text-align:center;font-size:2rem;margin-bottom:8px;text-shadow:none">🌱</div><div style="text-align:center;font-size:.92rem;font-weight:700;margin-bottom:10px">お花の育て方</div><div class="htk-popup-b">このサーバーを使用していくにつれて、お花が成長していきます。<br><br>サーバーを開いている時間に応じて少しずつ成長します（約8-32時間）。<br><br>成長が完了すると名前を付けられます。育て終わった花の名前はいつでもギャラリーから変更できます。<br><br>全125種類以上のお花や奇妙なアイテムが用意されています。レアアイテムも！</div><div style="text-align:center;margin-top:14px"><button class="htk-btn htk-primary" @click="showFlowerInfo=false">わかった！</button></div></div></div></div></Teleport>

<!-- TUTORIAL OVERLAY -->
<Teleport to="body"><div v-if="showTutorial" class="htk-tut-ov">
  <!-- Step 0: Welcome (full-screen) -->
  <div v-if="tutStep===0" class="htk-tut-center" @click.self="skipTutorial">
    <div class="htk-tut-welcome">
      <div class="htk-tut-particles"><span v-for="i in 12" :key="i" :style="{animationDelay:i*0.3+'s',left:Math.random()*100+'%',top:Math.random()*100+'%'}"></span></div>
      <div class="htk-tut-hero-emoji">✨</div>
      <div class="htk-tut-catch">SNSに一工夫を</div>
      <div class="htk-tut-appname">Hatask</div>
      <div class="htk-tut-sub">旗鯖だけの便利機能をご紹介します<br><span style="font-size:.72rem;opacity:.6">実際のUIを見ながらステップバイステップで案内します</span></div>
      <div class="htk-tut-btns"><button class="htk-tut-btn htk-tut-btn-p" @click="startSpotlightTutorial">はじめる 🚀</button><button class="htk-tut-btn htk-tut-btn-s" @click="skipTutorial">スキップ</button></div>
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
        <span class="htk-spot-tip-emoji">{{tutSteps[tutStep]?.emoji}}</span>
        <span class="htk-spot-tip-title">{{tutSteps[tutStep]?.title}}</span>
        <span class="htk-spot-tip-badge">{{tutStep}}/{{tutTotalSteps-1}}</span>
      </div>
      <div class="htk-spot-tip-body">{{tutSteps[tutStep]?.body}}</div>
      <div v-if="tutSteps[tutStep]?.tips" class="htk-spot-tip-extra">
        <div v-for="(tip,ti) in tutSteps[tutStep].tips" :key="ti" class="htk-spot-tip-row">
          <span class="htk-spot-tip-bullet">{{tip.icon}}</span>
          <span>{{tip.text}}</span>
        </div>
      </div>
      <div class="htk-spot-tip-nav">
        <button v-if="tutStep>1" class="htk-tut-btn htk-tut-btn-s htk-tut-btn-xs" @click="prevSpotlightStep">← 戻る</button>
        <div class="htk-spot-tip-progress"><div class="htk-spot-tip-bar" :style="{width:(tutStep/(tutTotalSteps-1))*100+'%'}"></div></div>
        <button v-if="tutStep<tutTotalSteps-1" class="htk-tut-btn htk-tut-btn-p htk-tut-btn-xs" @click="nextSpotlightStep">次へ →</button>
        <button v-else class="htk-tut-btn htk-tut-btn-finish htk-tut-btn-xs" @click="finishTutorial">完了 🎉</button>
      </div>
      <button class="htk-tut-skip" @click="skipTutorial">スキップ</button>
    </div>
  </template>
</div></Teleport>

</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount, onActivated, onDeactivated, nextTick, watch, defineAsyncComponent } from 'vue';
import { definePage } from '@/page.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';
import { useRouter } from '@/router.js';
import { getPhrase } from '@/utility/hatask-phrases.js';
import { floraData, pickRandomFlora, generateFlowerName } from '@/utility/hatask-flora.js';
const _getPhrase = (ctx?: any): string => { try { return getPhrase(ctx); } catch { return 'こんにちは！'; } };
definePage(()=>({title:'Hatask',icon:'ti ti-checklist'}));
const SCOPE=['client','hatask'];
const tabs=[{id:'home',icon:'☰',label:'ホーム'},{id:'cal',icon:'◫',label:'カレンダー'},{id:'todo',icon:'☐',label:'ToDo'},{id:'mood',icon:'◉',label:'きもち'},{id:'garden',icon:'❋',label:'お庭'},{id:'eye',icon:'◎',label:'Eye'}];
const showMobileNav=ref(true);
const moodEmojis:Record<number,string>={1:'😢',2:'😞',3:'😐',4:'😊',5:'🥰'};
const moodOptions=[{level:1,emoji:'😢',label:'つらい'},{level:2,emoji:'😞',label:'もやもや'},{level:3,emoji:'😐',label:'ふつう'},{level:4,emoji:'😊',label:'いい感じ'},{level:5,emoji:'🥰',label:'最高！'}];
const moodEmojisExtra=['☀️','🌧️','⚡','🌈','🍵','🎵','💪','😴'];
const moodRemindTimes=['朝 8:00','昼 12:00','夜 20:00','寝る前 23:00'];
const eventColors=['#e27d60','#85cdca','#e8a87c','#c38d9e','#7bc67e','#f0c75e','#6cb4ee'];
const eventEmojis=['⭐','💼','🎮','🔧','📚','🎂','✈️','🎨','🏃','🎤'];
const notifyTimings=['15分前','30分前','1時間前','1日前'];
const bgThemes=[{id:'ocean',label:'オーシャン'},{id:'forest',label:'フォレスト'},{id:'night',label:'ナイト'}];
const sortOptions=[{id:'manual',label:'手動'},{id:'dueAsc',label:'期日↑'},{id:'dueDesc',label:'期日↓'},{id:'new',label:'新しい順'}];
// Flora data now in hatask-flora.ts


const dataLoaded = ref(false);
const loadedKeys = new Set<string>();
async function registryGet<T>(key:string,fb:T):Promise<T>{try{const v=await misskeyApi('i/registry/get',{key,scope:SCOPE});loadedKeys.add(key);return(v!=null?v:fb)as T}catch{return fb}}
async function registrySet(key:string,value:unknown):Promise<void>{if(!dataLoaded.value&&!loadedKeys.has(key))return;await misskeyApi('i/registry/set',{key,value,scope:SCOPE})}

const activeTab=ref('home');const isSaving=ref(false);const showSettings=ref(false);const showSearch=ref(false);

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
const showMoodDisclaimer=ref(false);const showFlowerInfo=ref(false);const showMoodNote=ref(true);const showMoodRemind=ref(false);
const moodSelectedEmoji=ref('');const rootEl=ref<HTMLElement|null>(null);
const showTutorial=ref(false);const tutStep=ref(0);const tutTotalSteps=10;
const isMobile=ref(window.innerWidth<=1024);
// ===== Spotlight tutorial system =====
const PAD=14;
const spotRect=ref({x:0,y:0,w:0,h:0});
const tipSide=ref<'bottom'|'top'>('bottom');
const tipPosition=ref<Record<string,string>>({});
const tutSteps=computed(()=>[
  {emoji:'✨',title:'Welcome',body:'',tab:'home',selector:'',tips:[]},
  {emoji:'🏠',title:'ナビゲーション',body:'画面下のタブで各機能に切り替えられます。',tab:'home',selector:isMobile.value?'.htk-nav-mobile':'.htk-nav-desktop',tips:[
    {icon:'📱',text:'ホーム・カレンダー・ToDo・きもち・お庭・Eyeの6画面'},
    {icon:'←',text:'左の矢印でタイムラインに戻れます'},
  ]},
  {emoji:'🔍',title:'ヘッダー',body:'検索と設定にアクセスできます。',tab:'home',selector:'.htk-header',tips:[
    {icon:'⊕',text:'左のボタン → ToDo・きもち・予定を横断検索'},
    {icon:'⚙',text:'右のボタン → テーマ・表示項目・各種設定'},
  ]},
  {emoji:'🕐',title:'ホーム画面',body:'時計・あいさつ・お花・予定・きもち・Eyeのひとことが一覧できます。',tab:'home',selector:'.htk-dash',tips:[
    {icon:'💬',text:'500以上のあいさつがランダムに表示されます'},
    {icon:'🌸',text:'お花をタップするとお庭画面へジャンプ'},
    {icon:'📅',text:'予定やきもちカードも直接タップで各画面へ'},
  ]},
  {emoji:'📅',title:'カレンダー',body:'日付をタップして予定を確認・作成できます。',tab:'cal',selector:'.htk-panels',tips:[
    {icon:'🎨',text:'絵文字・色・公開範囲・通知タイミングも設定可能'},
    {icon:'👥',text:'「公開」にするとみんなの予定に表示されます'},
    {icon:'🗳',text:'参加確認（RSVP）機能で出欠を管理'},
  ]},
  {emoji:'✅',title:'やることリスト',body:'タスクの追加・フォルダ管理・ソートができます。',tab:'todo',selector:'.htk-todo-inp-r',tips:[
    {icon:'📁',text:'絵文字付きフォルダでタスクを分類整理'},
    {icon:'📝',text:'詳細ボタンで期日・時刻・コメントも追加'},
    {icon:'✓',text:'チェックで完了、タップでコメント展開'},
  ]},
  {emoji:'😊',title:'きもち記録',body:'5段階の気分を絵文字と一言で記録できます。',tab:'mood',selector:'.htk-mood-sc',tips:[
    {icon:'📊',text:'週間グラフと時間帯別の傾向を分析'},
    {icon:'🔔',text:'リマインド通知で記録忘れを防止'},
    {icon:'ⓘ',text:'セルフケア用ツールです（医療目的ではありません）'},
  ]},
  {emoji:'🌻',title:'お庭',body:'サーバーを使うほどお花が育ちます。全125種類以上！',tab:'garden',selector:'.htk-fl-ring',tips:[
    {icon:'⏰',text:'約8-32時間で開花。レアアイテムも…？'},
    {icon:'✏️',text:'咲いたら名前をつけてギャラリーに収穫'},
    {icon:'🎯',text:'花言葉もコレクションしよう！'},
  ]},
  {emoji:'◎',title:'Hatask Eye',body:'あなたの使い方を見守る、Hataskのもうひとつの目。',tab:'eye',selector:'.htk-eye-page-top',tips:[
    {icon:'📈',text:'タスク達成率・きもちの傾向・お花の成長を分析'},
    {icon:'💡',text:'Hataskを使うほど、Eyeもあなたのことを少しずつ理解していきます'},
    {icon:'✨',text:'使い続けることで、いつかもっと寄り添えるようになるかも…'},
  ]},
  {emoji:'🎉',title:'チュートリアル完了！',body:'これでHataskの主な機能をひと通り紹介しました。',tab:'home',selector:'',tips:[
    {icon:'⚙',text:'チュートリアルは設定画面からいつでも再確認できます'},
    {icon:'💬',text:'困ったことがあれば、旗茶にお気軽にどうぞ'},
    {icon:'🌱',text:'Hataskがあなたの毎日をちょっと楽しくできますように'},
  ]},
]);
function measureTarget(){
  const step=tutSteps.value[tutStep.value];if(!step?.selector)return;
  const el=document.querySelector(step.selector) as HTMLElement|null;
  if(!el||el.offsetParent===null&&getComputedStyle(el).position!=='fixed'){spotRect.value={x:40,y:window.innerHeight/3,w:window.innerWidth-80,h:200};calcTip();return}
  // fixed要素（モバイルナビ等）はscrollIntoView不要
  if(getComputedStyle(el).position!=='fixed') el.scrollIntoView({behavior:'smooth',block:'nearest'});
  const r=el.getBoundingClientRect();
  spotRect.value={x:Math.max(0,r.left-PAD),y:Math.max(0,r.top-PAD),w:r.width+PAD*2,h:r.height+PAD*2};
  calcTip();
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
function finishTutorial(){showTutorial.value=false;settings.value.tutorialDone=true;saveSettings();activeTab.value='home';os.toast('Hataskへようこそ！')}
function reopenTutorial(){showSettings.value=false;tutStep.value=0;showTutorial.value=true}
function openDrawingTool(){
  showMobileNav.value=false;
  os.popup(defineAsyncComponent(()=>import('@/components/MkDrawingTool.vue')),{},{closed:()=>{showMobileNav.value=true}},'closed');
}
function openHataCard(){window.open('https://hatacardcreate.tolehata.net/','_blank')}
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
  const tabIds=tabs.map(t=>t.id);
  const idx=tabIds.indexOf(activeTab.value);
  if(dx>0&&idx>0)activeTab.value=tabIds[idx-1];
  else if(dx<0&&idx<tabIds.length-1)activeTab.value=tabIds[idx+1];
}
function openPortal(){window.open('https://home.tolehata.net','_blank')}
function cleanupHataskState(){
  showMobileNav.value=false;
  if(navProtectionObserver){navProtectionObserver.disconnect();navProtectionObserver=null}
  if(navVisibilityTimer){clearInterval(navVisibilityTimer);navVisibilityTimer=null}
  try{delete document.body.dataset.hataskActive;document.querySelectorAll<HTMLElement>('[data-htask-hidden]').forEach(el=>{el.style.removeProperty('display');delete el.dataset.htaskHidden})}catch{}
  nextTick(()=>{document.querySelectorAll('.htk-nav-mobile').forEach(el=>el.remove());document.querySelectorAll('.htk-nav-pad').forEach(el=>el.remove())});
}
function openHataSettings(){cleanupHataskState();const router=useRouter();router.push('/settings/hata-custom')}
function openHataDocs(){cleanupHataskState();const router=useRouter();router.push('/hata-docs')}
function openHatalyze(){window.open('https://kanjo-bunseki.tolehata.net','_blank')}
function openWhatsNew(){cleanupHataskState();const router=useRouter();router.push('/hata-whats-new')}
function handleBack(){
if(activeTab.value!=='home'){activeTab.value='home';return}
goBackToTimeline();
}
function goBackToTimeline(){
cleanupHataskState();
const router=useRouter();
router.push('/');
}

// ========== NOTIFICATION SYSTEM (Misskey API) ==========
const notifTimerIds:number[]=[];
async function sendNotification(header:string,body:string,icon?:string){
try{await misskeyApi('notifications/create',{body,header:header||null,icon:icon||null});return true}catch(e){console.warn('Hatask notification error:',e);return false}
}
async function sendTestNotification(){
try{await misskeyApi('notifications/test-notification',{});os.toast('テスト通知を送信しました')}catch(e){console.warn('Test notification error:',e);os.toast('通知の送信に失敗しました')}
}

function scheduleEventNotifications(){
// Clear existing timers
notifTimerIds.forEach(id=>clearTimeout(id));notifTimerIds.length=0;
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
const tid=window.setTimeout(()=>{sendNotification(`${ev.emoji} ${ev.title}`,`${timing}です（${ev.timeStart}〜${ev.timeEnd}）`)},delay);
notifTimerIds.push(tid)
}})
})
}
function scheduleMoodReminders(){
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
if(todaysMoods.length===0){sendNotification('◉ きもち記録','今の気分はどうですか？ Hataskで記録してみましょう')}
},delay);
notifTimerIds.push(tid)
}})
}
const currentTime=ref('');const currentDate=ref('');const eyePhrase=ref('こんにちは！');const editingEvent=ref<any>(null);let eyeTimer:ReturnType<typeof setInterval>|null=null;
const defaultSectionOrder=['clock','eye','apps','loginDays','flower','events','mood'];
const sectionOrder=ref<string[]>([...defaultSectionOrder]);
const sectionLabels:Record<string,string>={clock:'日時表示',eye:'Hatask Eye',apps:'旗鯖独自アプリ',loginDays:'ログイン日数',flower:'お花',events:'直近の予定',mood:'今週のきもち'};
const draggingSectionIdx=ref<number|null>(null);
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
const loginMessage=computed(()=>{const d=loginDays.value;if(d<=1)return'ようこそ！最初のログインです！';if(d<7)return'サーバーに慣れてきましたか？';if(d<30)return'もうすっかり常連ですね！';if(d<100)return'これからもよろしくお願いします！';if(d<365)return'すごい…！';return'伝説のユーザーです！'});
async function fetchLoginRanking(){try{const res=await misskeyApi('hata/login-ranking',{});if(res&&typeof res.rank==='number'){loginRanking.value=res.rank;loginTotal.value=res.totalUsers??0}}catch(e){console.warn('Login ranking unavailable:',e)}}
const settings=ref<any>({bgTheme:'ocean',darkMode:false,autoTheme:true,weekStart:'mon',showClock:true,showEvents:true,showFlower:true,showMoodSummary:true,moodRemind:true,moodRemindTimes:['昼 12:00','寝る前 23:00'],openOnStart:false});
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
  return 'dark';
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
function toggleDarkMode(){settings.value.darkMode=!settings.value.darkMode;saveSettings()}
function setBg(id:string){settings.value.bgTheme=id;saveSettings()}
async function saveSettings(){await registrySet('settings',settings.value)}
function toggleMoodRemindTime(t:string){if(!settings.value.moodRemindTimes)settings.value.moodRemindTimes=[];const i=settings.value.moodRemindTimes.indexOf(t);if(i>=0)settings.value.moodRemindTimes.splice(i,1);else settings.value.moodRemindTimes.push(t);saveSettings();scheduleMoodReminders()}
function toggleNotifyTiming(t:string){const i=newEvent.value.notifyTimings.indexOf(t);if(i>=0)newEvent.value.notifyTimings.splice(i,1);else newEvent.value.notifyTimings.push(t)}

// Calendar
const calYear=ref(new Date().getFullYear());const calMonth=ref(new Date().getMonth());const selectedDay=ref<number|null>(new Date().getDate());
function chMo(d:number){calMonth.value+=d;if(calMonth.value>11){calMonth.value=0;calYear.value++}if(calMonth.value<0){calMonth.value=11;calYear.value--}selectedDay.value=null;viewingEvent.value=null}
function goToday(){const n=new Date();calYear.value=n.getFullYear();calMonth.value=n.getMonth();selectedDay.value=n.getDate()}
function selectDay(d:number){selectedDay.value=d;viewingEvent.value=null;const ds=`${calYear.value}-${String(calMonth.value+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;newEvent.value.date=ds;newEvent.value.dateEnd=ds;editingEvent.value=null}
const selectedDateStr=computed(()=>{if(!selectedDay.value)return'';return`${calYear.value}-${String(calMonth.value+1).padStart(2,'0')}-${String(selectedDay.value).padStart(2,'0')}`});
// allCalendarEvents: ローカル + 共有（公開）イベントをマージ（重複除去）
const allCalendarEvents=computed(()=>{const local=[...events.value];const localIds=new Set(local.map(e=>e.id));const shared=sharedEvents.value.filter(e=>!localIds.has(e.id)).map(e=>({...e,isShared:true,visibility:'public',timeLabel:e.allDay?`${e.date} 終日`:`${e.date} ${e.timeStart||''}〜${e.timeEnd||''}`.trim()}));return[...local,...shared]});
const eventsForDay=computed(()=>{if(!selectedDateStr.value)return[];return allCalendarEvents.value.filter(e=>{if(e.date===selectedDateStr.value)return true;if(e.dateEnd&&e.date<=selectedDateStr.value&&e.dateEnd>=selectedDateStr.value)return true;return false}).sort((a,b)=>{if(a.allDay&&!b.allDay)return-1;if(!a.allDay&&b.allDay)return 1;return(a.timeStart||'').localeCompare(b.timeStart||'')})});
function hasEventsOn(ds:string){return allCalendarEvents.value.some(e=>e.date===ds||(e.dateEnd&&e.date<=ds&&e.dateEnd>=ds))}
function eventDotsFor(ds:string){return allCalendarEvents.value.filter(e=>e.date===ds||(e.dateEnd&&e.date<=ds&&e.dateEnd>=ds)).slice(0,3)}
function startEditEvent(ev:any){editingEvent.value=ev;newEvent.value={title:ev.title,emoji:ev.emoji||'⭐',date:ev.date,timeStart:ev.timeStart||'14:00',dateEnd:ev.dateEnd||ev.date,timeEnd:ev.timeEnd||'15:00',color:ev.color||'#e27d60',visibility:ev.visibility||'private',rsvp:ev.rsvp||false,notify:ev.notify||false,notifyTimings:ev.notifyTimings?[...ev.notifyTimings]:['15分前'],allDay:ev.allDay||false}}
async function deleteEventById(id:string){
// 共有イベントの場合は自分のイベントのみ削除可
const shared=sharedEventData(id);
if(shared && shared.userId!==$i?.id){os.toast('他のユーザーの予定は削除できません');return}
try{await misskeyApi('hatask/events/delete',{eventId:id})}catch{}
events.value=events.value.filter(e=>e.id!==id);if(editingEvent.value?.id===id)editingEvent.value=null;viewingEvent.value=null;await registrySet('events',events.value);await loadSharedEvents();os.toast('予定を削除しました')}
const calCells=computed(()=>{const fd=new Date(calYear.value,calMonth.value,1).getDay();const dim=new Date(calYear.value,calMonth.value+1,0).getDate();const dip=new Date(calYear.value,calMonth.value,0).getDate();const so=fd===0?6:fd-1;const td=new Date();const cells:any[]=[];for(let i=so-1;i>=0;i--)cells.push({day:dip-i,om:true});for(let d=1;d<=dim;d++){const ds=`${calYear.value}-${String(calMonth.value+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;cells.push({day:d,om:false,today:d===td.getDate()&&calMonth.value===td.getMonth()&&calYear.value===td.getFullYear(),selected:d===selectedDay.value,hasEvents:hasEventsOn(ds),dots:eventDotsFor(ds)})}const rem=(7-cells.length%7)%7;for(let d=1;d<=rem;d++)cells.push({day:d,om:true});return cells});

// Events
const events=ref<any[]>([]);
const td=()=>new Date().toISOString().slice(0,10);
const newEvent=ref({title:'',emoji:'⭐',date:td(),timeStart:'14:00',dateEnd:td(),timeEnd:'15:00',color:'#e27d60',visibility:'private',rsvp:false,notify:true,notifyTimings:['15分前','30分前'],allDay:false});
const upcomingEvents=computed(()=>allCalendarEvents.value.filter(e=>e.date>=td()).sort((a,b)=>a.date.localeCompare(b.date)));
const publicEvents=computed(()=>{const now=td();const localPublic=events.value.filter(e=>e.visibility==='public'&&e.date>=now);const localIds=new Set(localPublic.map(e=>e.id));const shared=sharedEvents.value.filter(e=>e.date>=now&&!localIds.has(e.id)).map(e=>({...e,isShared:true,timeLabel:e.allDay?`${e.date} 終日`:`${e.date} ${e.timeStart||''}〜${e.timeEnd||''}`.trim()}));return[...localPublic,...shared]});
function goToEvent(ev:any){activeTab.value='cal';const d=new Date(ev.date);calYear.value=d.getFullYear();calMonth.value=d.getMonth();selectedDay.value=d.getDate();viewingEvent.value=ev}
async function addEvent(){if(!newEvent.value.title.trim())return;
const isEditing=!!editingEvent.value;
const ne:any={id:editingEvent.value?.id||generateId(),title:newEvent.value.title.trim(),emoji:newEvent.value.emoji,date:newEvent.value.date,dateEnd:newEvent.value.dateEnd,color:newEvent.value.color,visibility:newEvent.value.visibility,rsvp:newEvent.value.rsvp,notify:newEvent.value.notify,notifyTimings:[...newEvent.value.notifyTimings],allDay:newEvent.value.allDay};
if(newEvent.value.allDay){ne.timeStart='';ne.timeEnd='';ne.timeLabel=newEvent.value.date+(newEvent.value.dateEnd!==newEvent.value.date?' ~ '+newEvent.value.dateEnd:'')+' 終日'}else{ne.timeStart=newEvent.value.timeStart;ne.timeEnd=newEvent.value.timeEnd;ne.timeLabel=newEvent.value.date+' '+newEvent.value.timeStart+' - '+newEvent.value.timeEnd}
if(editingEvent.value){const idx=events.value.findIndex(e=>e.id===editingEvent.value.id);if(idx>=0)events.value.splice(idx,1,ne);else events.value.unshift(ne);editingEvent.value=null}else{events.value.unshift(ne)}
newEvent.value.title='';newEvent.value.allDay=false;await registrySet('events',events.value);scheduleEventNotifications();os.toast(isEditing?'予定を更新しました':'予定を保存しました');
// 公開イベントを新規作成した場合、APIに共有イベントを登録
if(!isEditing && ne.visibility==='public'){
  try{
    await misskeyApi('hatask/events/create',{title:ne.title,emoji:ne.emoji,date:ne.date,dateEnd:ne.dateEnd||'',timeStart:ne.timeStart||'',timeEnd:ne.timeEnd||'',allDay:ne.allDay||false,color:ne.color||'#e27d60',rsvp:!!ne.rsvp});
    await loadSharedEvents();
    // RSVP付きならノートで告知
    if(ne.rsvp){
      const timeInfo = ne.allDay ? `${ne.date} 終日` : `${ne.date} ${ne.timeStart}〜${ne.timeEnd}`;
      await misskeyApi('notes/create',{
        text:`📩 **参加確認のお知らせ**\n\n${ne.emoji} **${ne.title}**\n🗓 ${timeInfo}\n\nHataskの参加確認から回答できます！`,
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
const folderColors=[{value:'#e57373',label:'レッド'},{value:'#ffb74d',label:'オレンジ'},{value:'#fff176',label:'イエロー'},{value:'#81c784',label:'グリーン'},{value:'#64b5f6',label:'ブルー'},{value:'#ba68c8',label:'パープル'}];
const todos=ref<any[]>([]);const folders=ref<any[]>([]);
const pendingCount=computed(()=>todos.value.filter(t=>!t.done).length);
function folderCount(fid:string){return todos.value.filter(t=>!t.done&&t.folder===fid).length}
const sortedTodos=computed(()=>{let list=activeFolder.value==='all'?[...todos.value]:todos.value.filter(t=>t.folder===activeFolder.value);if(sortMode.value==='dueAsc')list.sort((a,b)=>{if(!a.due)return 1;if(!b.due)return-1;return a.due.localeCompare(b.due)});else if(sortMode.value==='dueDesc')list.sort((a,b)=>{if(!a.due)return 1;if(!b.due)return-1;return b.due.localeCompare(a.due)});else if(sortMode.value==='new')list.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));return list});
function getFolderLabel(fid:string){const fo=folders.value.find(f=>f.id===fid);return fo?fo.emoji+' '+fo.name:''}

// Mood
const selectedMoodLevel=ref(4);const moodNote=ref('');const editingMood=ref<any>(null);
const moods=ref<any[]>([]);
const moodsByDate=computed(()=>{const g:Record<string,any[]>={};[...moods.value].sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time)).forEach(m=>{if(!g[m.date])g[m.date]=[];g[m.date].push(m)});return g});

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
  const trendLabel=avg>=4.2?'とてもポジティブ':avg>=3.5?'ポジティブ寄り':avg>=2.8?'ふつう':avg>=2?'ネガティブ寄り':'つらい時期';
  const trendColor=avg>=4.2?'#6bbd67':avg>=3.5?'#85cdca':avg>=2.8?'#d4a574':avg>=2?'#e08760':'#c03050';
  // Time slots
  const slots=[{label:'朝 (6-11時)',min:6,max:11},{label:'昼 (11-17時)',min:11,max:17},{label:'夜 (17-22時)',min:17,max:22},{label:'深夜 (22-6時)',min:22,max:30}];
  const timeSlots=slots.map(s=>{
    const inSlot=moods.value.filter((m:any)=>{if(!m.time)return false;const h=parseInt(m.time.split(':')[0]);const hNorm=h<6?h+24:h;return hNorm>=s.min&&hNorm<s.max});
    const a=inSlot.length?inSlot.reduce((sum:number,m:any)=>sum+m.level,0)/inSlot.length:0;
    const emoji=a>=4?'😊':a>=3?'😐':a>=2?'😞':a>0?'😢':'—';
    const color=a>=4?'#6bbd67':a>=3?'#85cdca':a>=2?'#e08760':a>0?'#c03050':'#666';
    return{label:s.label,avg:a,emoji,color,count:inSlot.length}
  }).filter(t=>t.count>0);
  // Insight
  let insight='';
  const best=timeSlots.length?timeSlots.reduce((a,b)=>a.avg>b.avg?a:b):null;
  const worst=timeSlots.length?timeSlots.reduce((a,b)=>a.avg<b.avg?a:b):null;
  if(best&&worst&&best.label!==worst.label&&timeSlots.length>=2){
    insight=`${best.label}が最もポジティブ（${best.avg.toFixed(1)}）で、${worst.label}は低め（${worst.avg.toFixed(1)}）の傾向があります`
  }else if(avg>=4){insight='最近はとてもいい調子ですね！この調子を続けましょう'}
  else if(avg<=2.5){insight='少しつらい時期かもしれません。無理せず自分のペースで過ごしてくださいね'}
  return{avgScore:avg.toFixed(1),avgScoreRaw:avg,trendEmoji,trendLabel,trendColor,timeSlots,insight}
});
const weekMoods=computed(()=>{const days=['月','火','水','木','金','土','日'];const now=new Date();const mon=new Date(now);mon.setDate(now.getDate()-((now.getDay()+6)%7));mon.setHours(0,0,0,0);return days.map((day,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);const ds=d.toISOString().slice(0,10);const last=moods.value.filter(m=>m.date===ds).pop();return{day,emoji:last?moodEmojis[last.level]:''};})});

// Garden
const flower=ref({emoji:'🌱',name:'わかば',progress:0,startedAt:0,totalMinutes:0});
const gallery=ref<any[]>([]);
function formatMinutes(m:number){const h=Math.floor(m/60);const mm=m%60;return h>0?`${h}h${mm}m`:`${mm}m`}
const estimateRemaining=computed(()=>{const rem=Math.max(0,1200-flower.value.totalMinutes);const h=Math.floor(rem/60);return h>0?`${h}時間`:'まもなく'});

// Search
const searchQuery=ref('');const searchInput=ref<HTMLInputElement|null>(null);
const searchResults=computed(()=>{const q=searchQuery.value.toLowerCase();return{todos:todos.value.filter(t=>t.text.toLowerCase().includes(q)||(t.comment&&t.comment.toLowerCase().includes(q))).slice(0,5),moods:moods.value.filter(m=>m.note.toLowerCase().includes(q)).slice(0,5),events:events.value.filter(e=>e.title.toLowerCase().includes(q)).slice(0,5)}});
const recentMoodsForSearch=computed(()=>moods.value.slice(0,3));
function formatSearchDate(d:string):string{const dd=new Date(d);const now=new Date();now.setHours(0,0,0,0);const diff=Math.floor((now.getTime()-new Date(dd.toDateString()).getTime())/(86400000));if(diff===0)return'今日';if(diff===1)return'昨日';return`${dd.getMonth()+1}/${dd.getDate()}`}
watch(showSearch,v=>{if(v)nextTick(()=>searchInput.value?.focus())});

// Helpers
function generateId():string{return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function formatDue(d:string,t?:string):string{const td=new Date();td.setHours(0,0,0,0);const x=new Date(d);x.setHours(0,0,0,0);let l='';if(x.getTime()===td.getTime())l='今日';else{const tm=new Date(td);tm.setDate(tm.getDate()+1);if(x.getTime()===tm.getTime())l='明日';else l=`${new Date(d).getMonth()+1}/${new Date(d).getDate()}`}if(t)l+=' '+t;return l}
function isDueToday(d:string):boolean{return new Date(d).toDateString()===new Date().toDateString()}
function isOverdue(d:string):boolean{return new Date(d)<new Date(new Date().toDateString())}
function formatMoodDate(d:string):string{const dd=new Date(d);const dn=['日','月','火','水','木','金','土'];return`${dd.getMonth()+1}/${dd.getDate()} (${dn[dd.getDay()]})`}

// ========== GREETING SYSTEM (500+ variations) ==========
// Eye page computed stats
const todoCompletionRate=computed(()=>{if(todos.value.length===0)return 0;return Math.round(todos.value.filter(t=>t.done).length/todos.value.length*100)});
const weeklyTaskProgress=computed(()=>{const now=new Date();const weekAgo=new Date(now.getTime()-7*86400000);const weekStr=weekAgo.toISOString().slice(0,10);const weekTodos=todos.value.filter(t=>t.createdAt&&new Date(t.createdAt)>=weekAgo);if(weekTodos.length===0)return 0;return Math.round(weekTodos.filter(t=>t.done).length/weekTodos.length*100)});
const monthlyMoodCount=computed(()=>{const now=new Date();const ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;return moods.value.filter(m=>{const d=new Date(m.date||m.createdAt);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===ym}).length});
const monthlyMoodProgress=computed(()=>{const now=new Date();const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();return Math.min(100,Math.round(monthlyMoodCount.value/daysInMonth*100))});
const currentFlowerHanakotoba=computed(()=>{const flora=floraData.find(f=>f.emoji===flower.value.emoji);return flora?.hanakotoba||''});
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
function updateClock(){const now=new Date();currentTime.value=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;const dn=['日','月','火','水','木','金','土'];currentDate.value=`${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日（${dn[now.getDay()]}）`}

// RSVP logic - uses shared API events (rsvp有効なもののみ)
const pendingRsvps=computed(()=>{
const myId=$i?.id;
return sharedEvents.value.filter(e=>e.rsvp&&!e.rsvpClosed).map(e=>{
const myResp=e.rsvpResponses?.find((r:any)=>r.userId===myId);
return{eventId:e.id,emoji:e.emoji||'📅',title:e.title,dateLabel:`${e.date} ${e.timeStart||''}`.trim(),myStatus:myResp?.status||null,creatorUsername:e.username};
});
});
async function setRsvp(eventId:string,status:string){
try{await misskeyApi('hatask/events/rsvp',{eventId,status});await loadSharedEvents();os.toast(status==='going'?'参加します！':status==='maybe'?'検討中にしました':'辞退しました')}catch(e){console.error('RSVP failed:',e);os.toast('回答の送信に失敗しました')}
}
async function closeRsvp(eventId:string){
try{await misskeyApi('hatask/events/close',{eventId,closed:true});await loadSharedEvents();os.toast('参加確認を終了しました')}catch(e){console.error('Close RSVP failed:',e);os.toast('締め切りに失敗しました')}
}

// CRUD
// Section reorder functions
function moveSectionUp(idx:number){if(idx<=0)return;const arr=[...sectionOrder.value];[arr[idx-1],arr[idx]]=[arr[idx],arr[idx-1]];sectionOrder.value=arr;settings.value.sectionOrder=arr;saveSettings()}
function moveSectionDown(idx:number){if(idx>=sectionOrder.value.length-1)return;const arr=[...sectionOrder.value];[arr[idx],arr[idx+1]]=[arr[idx+1],arr[idx]];sectionOrder.value=arr;settings.value.sectionOrder=arr;saveSettings()}
function dismissRsvpNotif(eventId:string){dismissedRsvpNotifs.value.push(eventId);closedRsvpNotifs.value=closedRsvpNotifs.value.filter(n=>n.eventId!==eventId)}
function checkClosedRsvps(){
const myId=$i?.id;if(!myId)return;
// API共有イベントから締切済みのものを検出
closedRsvpNotifs.value=sharedEvents.value.filter(e=>e.rsvpClosed&&e.rsvpResponses&&e.rsvpResponses.some((r:any)=>r.userId===myId)&&!dismissedRsvpNotifs.value.includes(e.id)).map(e=>({eventId:e.id,emoji:e.emoji||'📅',title:e.title,goCount:e.rsvpResponses.filter((r:any)=>r.status==='going').length}));
}
const editingTodoId=ref<string|null>(null);
async function addTodo(){if(!newTodo.value.trim()&&!editingTodoId.value)return;
if(editingTodoId.value){const t=todos.value.find(t=>t.id===editingTodoId.value);if(t){t.text=newTodo.value.trim()||t.text;t.due=newTodoDue.value;t.time=newTodoTime.value;t.folder=newTodoFolder.value;t.comment=newTodoComment.value}editingTodoId.value=null;newTodo.value='';newTodoDue.value='';newTodoTime.value='';newTodoComment.value='';showTodoExtra.value=false;await registrySet('todos',todos.value);os.toast('タスクを更新しました');return}
todos.value.unshift({id:generateId(),text:newTodo.value.trim(),done:false,due:newTodoDue.value,time:newTodoTime.value,folder:newTodoFolder.value||(activeFolder.value!=='all'?activeFolder.value:''),comment:newTodoComment.value,createdAt:Date.now()});newTodo.value='';newTodoDue.value='';newTodoTime.value='';newTodoComment.value='';await registrySet('todos',todos.value)}
async function toggleTodo(id:string){const t=todos.value.find(t=>t.id===id);if(t){t.done=!t.done;await registrySet('todos',todos.value)}}
async function deleteTodo(id:string){const{canceled}=await os.confirm({type:'warning',text:'このタスクを削除しますか？'});if(canceled)return;todos.value=todos.value.filter(t=>t.id!==id);await registrySet('todos',todos.value)}
async function editTodo(id:string){const t=todos.value.find(t=>t.id===id);if(!t)return;editingTodoId.value=id;newTodo.value=t.text;newTodoDue.value=t.due||'';newTodoTime.value=t.time||'';newTodoFolder.value=t.folder||'';newTodoComment.value=t.comment||'';showTodoExtra.value=true;const el=document.querySelector('.htk-todo-inp-r');if(el)el.scrollIntoView({behavior:'smooth',block:'center'})}
function cancelEditTodo(){editingTodoId.value=null;newTodo.value='';newTodoDue.value='';newTodoTime.value='';newTodoComment.value='';showTodoExtra.value=false}
async function addFolder(){if(!newFolderName.value.trim())return;folders.value.push({id:generateId(),name:newFolderName.value.trim(),emoji:newFolderEmoji.value||'📁',color:newFolderColor.value||''});newFolderName.value='';newFolderEmoji.value='📁';newFolderColor.value='';await registrySet('folders',folders.value)}
async function deleteFolder(i:number){const{canceled}=await os.confirm({type:'warning',text:`フォルダ「${folders.value[i].name}」を削除しますか？`});if(canceled)return;const fid=folders.value[i].id;todos.value.forEach(t=>{if(t.folder===fid)t.folder=''});if(activeFolder.value===fid)activeFolder.value='all';folders.value.splice(i,1);await registrySet('folders',folders.value);await registrySet('todos',todos.value)}
async function renameFolder(i:number){const{canceled,result}=await os.inputText({title:'フォルダ名変更',text:'新しい名前:',default:folders.value[i].name});if(!canceled&&result){folders.value[i].name=result;await registrySet('folders',folders.value)}}
async function moveFolder(i:number,d:number){const ni=i+d;if(ni<0||ni>=folders.value.length)return;[folders.value[i],folders.value[ni]]=[folders.value[ni],folders.value[i]];await registrySet('folders',folders.value)}
async function changeFolderColor(i:number){const colors=folderColors.map(c=>({text:c.label,action:async()=>{folders.value[i].color=c.value;await registrySet('folders',folders.value)}}));colors.push({text:'なし',action:async()=>{folders.value[i].color='';await registrySet('folders',folders.value)}});os.actions({title:'フォルダの色',actions:colors})}
async function saveMood(){isSaving.value=true;try{if(editingMood.value){const idx=moods.value.findIndex(m=>m.id===editingMood.value.id);if(idx>=0){moods.value[idx]={...moods.value[idx],level:selectedMoodLevel.value,note:moodNote.value.trim()||'（ひとことなし）',emoji:moodSelectedEmoji.value}}editingMood.value=null;moodNote.value='';moodSelectedEmoji.value='';await registrySet('moods',moods.value);os.toast('きもちを更新しました')}else{const now=new Date();moods.value.unshift({id:generateId(),level:selectedMoodLevel.value,note:moodNote.value.trim()||'（ひとことなし）',emoji:moodSelectedEmoji.value,date:now.toISOString().slice(0,10),time:`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`});moodNote.value='';moodSelectedEmoji.value='';await registrySet('moods',moods.value);os.toast('きもちを保存しました')}}finally{isSaving.value=false}}
function startEditMood(m:any){editingMood.value=m;selectedMoodLevel.value=m.level;moodNote.value=m.note==='（ひとことなし）'?'':m.note;moodSelectedEmoji.value=m.emoji||'';showMoodNote.value=true;window.scrollTo({top:0,behavior:'smooth'})}
function cancelEditMood(){editingMood.value=null;selectedMoodLevel.value=4;moodNote.value='';moodSelectedEmoji.value=''}
async function deleteMood(id:string){const{canceled}=await os.confirm({type:'warning',text:'この記録を削除しますか？'});if(canceled)return;moods.value=moods.value.filter(m=>m.id!==id);await registrySet('moods',moods.value)}
async function harvestFlower(){const autoName=generateFlowerName({emoji:flower.value.emoji,name:flower.value.name});const{canceled,result}=await os.inputText({title:'お花が咲きました！',text:'お花に名前をつけてあげましょう（自動生成名が入っています）:',default:autoName});if(canceled||!result)return;const flora=floraData.find(f=>f.emoji===flower.value.emoji);gallery.value.unshift({id:generateId(),emoji:flower.value.emoji,name:result,hanakotoba:flora?.hanakotoba||'',date:new Date().toLocaleDateString('ja-JP')});const nf=pickRandomFlora();flower.value={emoji:nf.emoji,name:generateFlowerName(nf),progress:0,startedAt:Date.now(),totalMinutes:0};await registrySet('gallery',gallery.value);await registrySet('flower',flower.value);os.toast('お花を収穫しました！')}
async function renameFlower(fl:any){const{canceled,result}=await os.inputText({title:'お花の名前を変更',text:'新しい名前:',default:fl.name});if(!canceled&&result){fl.name=result;await registrySet('gallery',gallery.value)}}

let growthInterval:ReturnType<typeof setInterval>|null=null;
let navProtectionObserver:MutationObserver|null=null;
let navVisibilityTimer:ReturnType<typeof setInterval>|null=null;
onMounted(async () => {
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
const defaultFlower = { emoji: initFlower.emoji, name: generateFlowerName(initFlower), progress: 0, startedAt: Date.now(), totalMinutes: 0 };
const defaultSettings = { bgTheme: 'ocean', darkMode: false, autoTheme: true, weekStart: 'mon', showClock: true, showEvents: true, showFlower: true, showMoodSummary: true, moodRemind: true, moodRemindTimes: ['昼 12:00', '寝る前 23:00'], openOnStart: false };

// 各データを個別に取得（1つの失敗が他に影響しないようにする）
const loadResults = await Promise.allSettled([
  registryGet('todos', []),
  registryGet('folders', []),
  registryGet('moods', []),
  registryGet('flower', defaultFlower),
  registryGet('gallery', []),
  registryGet('settings', defaultSettings),
  registryGet('events', []),
]);
// 取得成功したデータのみ代入（失敗したキーは初期値のまま → registrySetガードで保護）
if (loadResults[0].status === 'fulfilled' && loadedKeys.has('todos')) todos.value = loadResults[0].value as any;
if (loadResults[1].status === 'fulfilled' && loadedKeys.has('folders')) folders.value = loadResults[1].value as any;
if (loadResults[2].status === 'fulfilled' && loadedKeys.has('moods')) moods.value = loadResults[2].value as any;
if (loadResults[3].status === 'fulfilled' && loadedKeys.has('flower')) flower.value = loadResults[3].value as any;
if (loadResults[4].status === 'fulfilled' && loadedKeys.has('gallery')) gallery.value = loadResults[4].value as any;
if (loadResults[5].status === 'fulfilled' && loadedKeys.has('settings')) settings.value = loadResults[5].value as any;
if (loadResults[6].status === 'fulfilled' && loadedKeys.has('events')) events.value = loadResults[6].value as any;
dataLoaded.value = true;
// 削除済みテーマのマイグレーション
if (settings.value.bgTheme === 'warm' || settings.value.bgTheme === 'sunset') {
  settings.value.bgTheme = 'ocean';
}
// Restore section order
if (settings.value.sectionOrder && Array.isArray(settings.value.sectionOrder)) {
  const saved = settings.value.sectionOrder;
  const all = [...defaultSectionOrder];
  const valid = saved.filter((s:string) => all.includes(s));
  const missing = all.filter(s => !valid.includes(s));
  sectionOrder.value = [...valid, ...missing];
} else {
  sectionOrder.value = [...defaultSectionOrder];
}
// Check for closed RSVP notifications
await loadSharedEvents();
checkClosedRsvps();
// Show tutorial on first visit
if (!settings.value.tutorialDone) { showTutorial.value = true; }
// Schedule notifications
scheduleEventNotifications();
scheduleMoodReminders();
// Fetch login ranking
fetchLoginRanking();
// Eye phrase
updateEyePhrase();
eyeTimer = setInterval(updateEyePhrase, 10000);
growthInterval = setInterval(async () => {
  if (flower.value.progress >= 100) return;
  flower.value.totalMinutes += 1;
  flower.value.progress = Math.min(100, Math.floor((flower.value.totalMinutes / 1200) * 100));
  await registrySet('flower', flower.value);
}, 60000);
});

// KeepAlive対応: ページ離脱時にナビバーを非表示にする
onDeactivated(() => {
cleanupHataskState();
});
onActivated(() => {
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
if (clockInterval) clearInterval(clockInterval);
if (eyeTimer) clearInterval(eyeTimer);
if (growthInterval) clearInterval(growthInterval);
if (mediaQuery) mediaQuery.removeEventListener('change', onMediaChange);
stopHtkThemeWatch();
notifTimerIds.forEach(id => clearTimeout(id));
});
</script>

<style lang="scss" scoped>

.htk-root{--radius-lg:28px;--radius-sm:14px;--radius-xs:10px;--primary:#e8a87c;--secondary:#85cdca;--accent:#e27d60;--success:#6ec072;--ease-spring:cubic-bezier(0.34,1.56,0.64,1);--ease-smooth:cubic-bezier(0.4,0,0.2,1);--tint-bg:rgba(255,255,255,.04);--outer-glow:0 0 24px -8px rgba(255,255,255,.1);--inner-glow:inset 0 0 14px -2px rgba(255,255,255,.15);--blur-amount:10px;--text-1:rgba(255,255,255,.95);--text-2:rgba(255,255,255,.7);--text-3:rgba(255,255,255,.45);--text-shadow:0 1px 4px rgba(0,0,0,.5);--divider:rgba(255,255,255,.08);--active-bg:rgba(255,255,255,.1);--hover-bg:rgba(255,255,255,.06);--btn-bg:rgba(255,255,255,.08);--btn-border:rgba(255,255,255,.15);--btn-hover:rgba(255,255,255,.14);--input-bg:rgba(255,255,255,.05);--input-border:rgba(255,255,255,.12);--input-focus:rgba(232,168,124,.45);position:relative;min-height:100dvh;overflow-x:hidden;overflow-y:visible}
.htk-root[data-bg="ocean"]{background:linear-gradient(145deg,#2d6a8f,#48a9a6 20%,#5bc0be 45%,#3a7ca5 70%,#1e5f8a);background-size:200% 200%;animation:htkBgFlow 25s ease-in-out infinite;--orb-a:rgba(91,192,190,.35);--orb-b:rgba(72,169,166,.3);--orb-c:rgba(58,124,165,.25);--orb-d:rgba(45,106,143,.2)}
.htk-root[data-bg="forest"]{background:linear-gradient(145deg,#2d5a27,#4a8f46 20%,#6bbd67 45%,#3d7a39 70%,#2a5226);background-size:200% 200%;animation:htkBgFlow 25s ease-in-out infinite;--orb-a:rgba(107,189,103,.35);--orb-b:rgba(74,143,70,.3);--orb-c:rgba(61,122,57,.25);--orb-d:rgba(45,90,39,.2)}
.htk-root[data-bg="night"]{background:linear-gradient(145deg,#0f0c29,#302b63 20%,#24243e 45%,#1a1a3e 70%,#0f0c29);background-size:200% 200%;animation:htkBgFlow 30s ease-in-out infinite;--orb-a:rgba(48,43,99,.4);--orb-b:rgba(36,36,62,.35);--orb-c:rgba(80,60,120,.25);--orb-d:rgba(60,50,100,.2)}
.htk-root[data-mode="dark"]{--tint-bg:rgba(255,255,255,.04);--outer-glow:0 0 24px -8px rgba(255,255,255,.1);--inner-glow:inset 0 0 14px -2px rgba(255,255,255,.15);--blur-amount:10px;--text-1:rgba(255,255,255,.95);--text-2:rgba(255,255,255,.7);--text-3:rgba(255,255,255,.45);--text-shadow:0 1px 4px rgba(0,0,0,.5);--divider:rgba(255,255,255,.08);--active-bg:rgba(255,255,255,.1);--hover-bg:rgba(255,255,255,.06);--btn-bg:rgba(255,255,255,.08);--btn-border:rgba(255,255,255,.15);--btn-hover:rgba(255,255,255,.14);--input-bg:rgba(255,255,255,.05);--input-border:rgba(255,255,255,.12);--input-focus:rgba(232,168,124,.45);--card-bg:rgba(0,0,0,.45);color:rgba(255,255,255,.95);text-shadow:0 1px 4px rgba(0,0,0,.5)}
.htk-root{color:var(--text-1,rgba(255,255,255,.95));text-shadow:var(--text-shadow,0 1px 4px rgba(0,0,0,.5))}
/* ocean/forest/night are dark backgrounds → white text even when system light mode */
.htk-scene{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.htk-orb{position:absolute;border-radius:50%;filter:blur(90px)}
.htk-orbA{width:500px;height:500px;background:var(--orb-a);top:-80px;right:-60px;animation:htkOA 22s ease-in-out infinite}
.htk-orbB{width:420px;height:420px;background:var(--orb-b);bottom:-80px;left:-40px;animation:htkOB 28s ease-in-out infinite}
.htk-orbC{width:300px;height:300px;background:var(--orb-c);top:45%;left:35%;animation:htkOC 32s ease-in-out infinite}
.htk-orbD{width:250px;height:250px;background:var(--orb-d);bottom:20%;right:15%;animation:htkOD 26s ease-in-out infinite}
@keyframes htkOA{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-70px,50px) scale(1.12)}66%{transform:translate(40px,-30px) scale(.94)}}
@keyframes htkOB{0%,100%{transform:translate(0,0)}50%{transform:translate(55px,-45px) scale(1.08)}}
@keyframes htkOC{0%,100%{transform:translate(0,0)}33%{transform:translate(35px,25px) scale(1.06)}66%{transform:translate(-25px,-15px) scale(.96)}}
@keyframes htkOD{0%,100%{transform:translate(0,0)}50%{transform:translate(-40px,30px)}}
@keyframes htkBgFlow{0%{background-position:0% 0%}25%{background-position:100% 50%}50%{background-position:50% 100%}75%{background-position:0% 50%}100%{background-position:0% 0%}}
.htk-swp1{animation:htkSw1 15s ease-in-out infinite}.htk-swp2{animation:htkSw2 19s ease-in-out infinite}.htk-swp3{animation:htkSw3 24s ease-in-out infinite}
@keyframes htkSw1{0%,100%{transform:translateX(0)}50%{transform:translateX(-5%) translateY(-8px)}}
@keyframes htkSw2{0%,100%{transform:translateX(0)}50%{transform:translateX(4%) translateY(6px)}}
@keyframes htkSw3{0%,100%{transform:translateX(0)}50%{transform:translateX(-3%) translateY(-4px)}}
.htk-app{max-width:1280px;margin:0 auto;padding:20px;position:relative;z-index:1}
.htk-lg{position:relative;border-radius:var(--radius-lg);isolation:isolate;box-shadow:var(--outer-glow);transition:box-shadow .3s,transform .3s var(--ease-spring);margin-bottom:16px}
.htk-lg::before{content:'';position:absolute;inset:0;z-index:0;border-radius:inherit;box-shadow:var(--inner-glow);background:var(--tint-bg);pointer-events:none}
.htk-lg::after{content:'';position:absolute;inset:0;z-index:-1;border-radius:inherit;backdrop-filter:blur(var(--blur-amount));-webkit-backdrop-filter:blur(var(--blur-amount));filter:url(#htk-gfx);-webkit-filter:url(#htk-gfx);isolation:isolate;pointer-events:none}
.htk-lg:hover{box-shadow:var(--outer-glow),0 8px 32px -4px rgba(0,0,0,.08);transform:translateY(-1px)}
.htk-lg-s{position:relative;border-radius:var(--radius-lg);isolation:isolate;box-shadow:var(--outer-glow);margin-bottom:16px}
.htk-lg-s::before{content:'';position:absolute;inset:0;z-index:0;border-radius:inherit;box-shadow:var(--inner-glow);background:var(--tint-bg);pointer-events:none}
.htk-lg-s::after{content:'';position:absolute;inset:0;z-index:-1;border-radius:inherit;backdrop-filter:blur(var(--blur-amount));-webkit-backdrop-filter:blur(var(--blur-amount));filter:url(#htk-gfx);-webkit-filter:url(#htk-gfx);isolation:isolate;pointer-events:none}
.htk-lg-in{position:relative;border-radius:var(--radius-xs);isolation:isolate;box-shadow:inset 0 0 8px -2px rgba(255,255,255,.3);padding:12px;margin-bottom:12px}
.htk-lg-in::after{content:'';position:absolute;inset:0;z-index:-1;border-radius:inherit;backdrop-filter:blur(4px);pointer-events:none}
.htk-gc{position:relative;z-index:10;padding:22px}
.htk-header{margin-bottom:16px}
.htk-nav{display:flex;gap:2px;padding:4px;position:relative;z-index:10}
.htk-nav-desktop{border-radius:var(--radius-lg);isolation:isolate;margin-bottom:16px;background:rgba(255,255,255,.12);backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);box-shadow:0 2px 16px rgba(0,0,0,.08),0 0 0 1px rgba(255,255,255,.18) inset,0 1px 0 rgba(255,255,255,.25) inset;border:0.5px solid rgba(255,255,255,.2)}
.htk-nav-desktop::before{content:'';position:absolute;inset:0;z-index:0;border-radius:inherit;background:linear-gradient(135deg,rgba(255,255,255,.18) 0%,rgba(255,255,255,.04) 50%,rgba(255,255,255,.1) 100%);pointer-events:none}
.htk-nav-desktop::after{content:'';position:absolute;inset:0;z-index:-1;border-radius:inherit;backdrop-filter:blur(var(--blur-amount));-webkit-backdrop-filter:blur(var(--blur-amount));isolation:isolate;pointer-events:none}
.htk-nav-mobile{display:none}
.htk-nav-pad{display:none}
.htk-nav-t{flex:1;padding:10px 8px;text-align:center;font-size:.8rem;font-weight:500;color:var(--text-2,rgba(255,255,255,.7));cursor:pointer;border-radius:calc(var(--radius-lg) - 4px);transition:all .3s var(--ease-spring);border:none;background:transparent;font-family:inherit;text-shadow:var(--text-shadow,none)}
.htk-nav-t:hover{color:var(--text-1);background:rgba(255,255,255,.08)}
.htk-nav-t.on{color:var(--text-1);font-weight:600;background:rgba(255,255,255,.22);box-shadow:0 1px 4px rgba(0,0,0,.1),0 0 0 0.5px rgba(255,255,255,.15) inset}
.htk-ico{display:block;font-size:1.15rem;margin-bottom:2px;text-shadow:none}
.htk-sec-title{font-size:.92rem;font-weight:700;margin-bottom:12px}
.htk-empty{text-align:center;color:var(--text-3);padding:24px 16px;font-size:.85rem}
.htk-pager{display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 0;font-size:.82rem;color:var(--text-2)}
.htk-pager-t{min-width:60px;text-align:center;font-weight:600}
.htk-empI{font-size:1.6rem;margin-bottom:4px;text-shadow:none;opacity:.6}
.htk-info-btn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:var(--btn-bg);border:1px solid var(--btn-border);color:var(--text-1);font-size:.75rem;font-weight:700;cursor:pointer;transition:all .2s;font-family:inherit;backdrop-filter:blur(6px);text-shadow:none;vertical-align:middle}
.htk-info-btn:hover{background:var(--btn-hover);transform:scale(1.08)}
.htk-btn{background:var(--btn-bg);border:1px solid var(--btn-border);color:var(--text-1,rgba(255,255,255,.95));text-shadow:var(--text-shadow,none);padding:10px 20px;border-radius:14px;font-family:inherit;font-size:.86rem;font-weight:700;cursor:pointer;backdrop-filter:blur(8px);transition:all .2s}
.htk-btn:hover{background:var(--btn-hover)}.htk-btn:active{transform:scale(.97)}.htk-btn:disabled{opacity:.4;cursor:not-allowed}
.htk-primary{background:rgba(232,168,124,.2);border-color:rgba(232,168,124,.35)}.htk-primary:hover{background:rgba(232,168,124,.35)}
.htk-danger{background:rgba(224,85,112,.15);border-color:rgba(224,85,112,.25);color:#c03050}.htk-danger:hover{background:rgba(224,85,112,.28)}
.htk-sm{padding:6px 14px;font-size:.78rem;border-radius:12px}.htk-xs{padding:4px 10px;font-size:.72rem;border-radius:10px}
.htk-icon-sq{padding:8px 12px;font-size:1.05rem;line-height:1;text-shadow:none}
.htk-sb-on{background:var(--active-bg) !important}
.htk-inp{background:var(--input-bg);border:1px solid var(--input-border);color:var(--text-1,rgba(255,255,255,.95));text-shadow:var(--text-shadow,none);padding:10px 16px;border-radius:14px;font-family:inherit;font-size:.86rem;width:100%;outline:none;transition:all .25s;backdrop-filter:blur(6px);-webkit-appearance:none;-moz-appearance:none;appearance:none;box-sizing:border-box}
.htk-inp:focus{border-color:var(--input-focus);box-shadow:0 0 0 3px rgba(232,168,124,.12)}
.htk-inp::placeholder{color:var(--text-3);text-shadow:none}
textarea.htk-inp{min-height:76px;resize:vertical}
select.htk-inp{appearance:none;cursor:pointer;padding-right:36px}
.htk-dash{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.htk-panels{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:900px){.htk-panels{grid-template-columns:1fr}}
.htk-dt-time{font-size:3rem;font-weight:700;letter-spacing:-1px;line-height:1.1}
.htk-dt-date{font-size:.92rem;color:var(--text-2);margin-top:8px}
.htk-dt-greet{font-size:.88rem;margin-top:12px;font-weight:500;line-height:1.5;white-space:pre-line}
.htk-eye-card{text-align:center;padding:16px 20px}
.htk-eye-label{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:2px;opacity:.4;margin-bottom:8px}
.htk-eye-phrase{font-size:.88rem;font-weight:500;line-height:1.6;white-space:pre-line;min-height:2.5em}
.htk-eye-fade-enter-active,.htk-eye-fade-leave-active{transition:all .5s ease}
.htk-eye-fade-enter-from{opacity:0;transform:translateY(8px)}
.htk-eye-fade-leave-to{opacity:0;transform:translateY(-8px)}
.htk-eye-page-top{text-align:center;padding:28px 20px}
.htk-eye-logo{font-size:2.5rem;opacity:.3;margin-bottom:4px}
.htk-eye-page-label{font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:3px;opacity:.35;margin-bottom:12px}
.htk-eye-page-phrase{font-size:1rem;font-weight:500;line-height:1.7;white-space:pre-line;min-height:3em}
.htk-eye-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:10px}
.htk-eye-stat{text-align:center;padding:12px 8px;background:rgba(255,255,255,.04);border-radius:12px}
.htk-eye-stat-n{font-size:1.4rem;font-weight:700;background:linear-gradient(135deg,#a78bfa,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.htk-eye-stat-l{font-size:.68rem;color:var(--text-3);margin-top:4px}
.htk-eye-progress-row{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.htk-eye-prog-label{font-size:.75rem;min-width:100px;flex-shrink:0}
.htk-eye-prog-bar{flex:1;height:8px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden}
.htk-eye-prog-fill{height:100%;background:linear-gradient(90deg,#a78bfa,#60a5fa);border-radius:4px;transition:width .5s ease}
.htk-eye-prog-mood{background:linear-gradient(90deg,#f472b6,#fb923c)}
.htk-eye-prog-flower{background:linear-gradient(90deg,#6ee7b7,#34d399)}
.htk-eye-prog-val{font-size:.72rem;color:var(--text-3);min-width:38px;text-align:right}
.htk-eye-hk-list{max-height:300px;overflow-y:auto}
.htk-eye-hk-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.htk-eye-hk-row:last-child{border:none}
.htk-eye-hk-emoji{font-size:1.5rem;flex-shrink:0}
.htk-eye-hk-info{min-width:0}
.htk-eye-hk-name{font-size:.82rem;font-weight:600}
.htk-eye-hk-word{font-size:.7rem;color:var(--text-3);opacity:.7;margin-top:1px}
.htk-gal-hk{font-size:.62rem;color:var(--text-3);opacity:.6;margin-top:1px}
.htk-rsvp-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)}
.htk-rsvp-row:last-child{border:none}
.htk-rsvp-info{flex:1;min-width:0}
.htk-rsvp-title{font-weight:600;font-size:.85rem}
.htk-rsvp-time{font-size:.72rem;opacity:.5;margin-top:2px}
.htk-rsvp-btns{display:flex;gap:4px;flex-shrink:0}
.htk-rsvp-b{padding:5px 10px;border-radius:8px;font-size:.7rem;font-weight:600;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);color:var(--text-2);cursor:pointer;transition:all .2s;font-family:inherit}
.htk-rsvp-go.on{background:rgba(110,192,114,.3);border-color:rgba(110,192,114,.5);color:#6ec072}
.htk-rsvp-maybe.on{background:rgba(232,168,124,.3);border-color:rgba(232,168,124,.5);color:#e8a87c}
.htk-rsvp-no.on{background:rgba(220,80,80,.2);border-color:rgba(220,80,80,.4);color:#dc5050}
.htk-rsvp-summary{margin-top:12px;padding:14px;background:rgba(255,255,255,.06);border-radius:14px;border:1px solid rgba(255,255,255,.08)}
.htk-rsvp-sum-header{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.htk-rsvp-sum-ico{font-size:1.1rem;text-shadow:none}
.htk-rsvp-sum-title{font-size:.82rem;font-weight:700;color:var(--text-1)}
.htk-rsvp-open-badge{font-size:.7rem;padding:4px 10px;background:rgba(110,192,114,.12);color:#6ec072;border-radius:8px;display:inline-block;margin-bottom:10px;font-weight:600}
.htk-rsvp-closed-badge{font-size:.7rem;color:var(--text-3);padding:4px 10px;background:rgba(255,255,255,.06);border-radius:8px;margin-bottom:10px;display:inline-block;font-weight:600}
.htk-rsvp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}
.htk-rsvp-stat-card{text-align:center;padding:10px 4px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}
.htk-rsvp-stat-card.going{border-color:rgba(110,192,114,.25)}
.htk-rsvp-stat-card.maybe{border-color:rgba(232,168,124,.25)}
.htk-rsvp-stat-card.declined{border-color:rgba(220,80,80,.2)}
.htk-rsvp-stat-card.total{border-color:rgba(255,255,255,.12)}
.htk-rsvp-stat-n{font-size:1.3rem;font-weight:800;line-height:1.2}
.htk-rsvp-stat-card.going .htk-rsvp-stat-n{color:#6ec072}
.htk-rsvp-stat-card.maybe .htk-rsvp-stat-n{color:#e8a87c}
.htk-rsvp-stat-card.declined .htk-rsvp-stat-n{color:#dc5050}
.htk-rsvp-stat-card.total .htk-rsvp-stat-n{color:var(--text-1)}
.htk-rsvp-stat-l{font-size:.62rem;color:var(--text-3);font-weight:600;margin-top:2px}
.htk-rsvp-bar-wrap{margin-bottom:10px}
.htk-rsvp-bar{display:flex;height:8px;border-radius:4px;overflow:hidden;background:rgba(255,255,255,.06)}
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
.htk-rsvp-name{font-size:.68rem;padding:3px 8px;background:rgba(255,255,255,.06);border-radius:6px;color:var(--text-3)}
.htk-rsvp-closed-row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.78rem;padding:8px 0;color:var(--text-2)}
.htk-rsvp-dismiss{background:none;border:none;color:var(--text-3);cursor:pointer;font-size:.8rem;padding:4px;opacity:.5}
.htk-rsvp-dismiss:hover{opacity:1}
.htk-reorder-list{display:flex;flex-direction:column;gap:4px;margin-top:6px}
.htk-reorder-item{display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(255,255,255,.06);border-radius:8px;font-size:.8rem;color:rgba(255,255,255,.75)}
.htk-reorder-handle{opacity:.3;font-size:.9rem;cursor:default}
.htk-reorder-label{flex:1;font-weight:500}
.htk-reorder-btns{display:flex;gap:2px}
.htk-reorder-btn{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.7);border-radius:6px;width:28px;height:28px;font-size:.6rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;font-family:inherit}
.htk-reorder-btn:hover:not(:disabled){background:rgba(255,255,255,.15)}
.htk-reorder-btn:disabled{opacity:.2;cursor:default}
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
.htk-dayev-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer;transition:background .2s}
.htk-dayev-row:hover{background:rgba(255,255,255,.04);border-radius:8px;margin:0 -6px;padding:10px 6px}
.htk-dayev-row.active{background:rgba(255,255,255,.06);border-radius:8px 8px 0 0;margin:0 -6px;padding:10px 6px;border-bottom-color:transparent}
.htk-dayev-row:last-child{border-bottom:none}
.htk-dayev-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.htk-dayev-body{flex:1;min-width:0}
.htk-dayev-title{font-size:.86rem;font-weight:600;color:rgba(255,255,255,.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.htk-dayev-time{font-size:.72rem;color:rgba(255,255,255,.45);margin-top:2px}
.htk-dayev-chevron{flex-shrink:0;color:rgba(255,255,255,.3);font-size:.8rem;transition:transform .2s}
.htk-dayev-acts{display:flex;gap:4px;flex-shrink:0}
.htk-dayev-ab{width:30px;height:30px;border-radius:var(--radius-xs);background:rgba(255,255,255,.08);border:none;color:rgba(255,255,255,.6);cursor:pointer;font-size:.75rem;display:flex;align-items:center;justify-content:center;transition:all .2s}
.htk-dayev-ab:hover{background:rgba(255,255,255,.15);color:rgba(255,255,255,.9)}
.htk-dayev-ab.del:hover{background:rgba(255,80,80,.2);color:#ff6666}
  .htk-rsvp-mini{padding:2px 8px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);font-size:.7rem;cursor:pointer;transition:all .2s;white-space:nowrap}
  .htk-rsvp-mini:hover{background:rgba(255,255,255,.12)}
  .htk-rsvp-mini.on-go{background:rgba(76,175,80,.25);color:#81c784;border-color:rgba(76,175,80,.3)}
  .htk-rsvp-mini.on-mb{background:rgba(255,183,77,.2);color:#ffb74d;border-color:rgba(255,183,77,.25)}
/* Event detail panel */
.htk-evdet{margin:0 -6px;padding:14px 14px 12px;background:rgba(255,255,255,.04);border-radius:0 0 10px 10px;border-top:1px solid rgba(255,255,255,.06);margin-bottom:8px;animation:htk-evdet-in .25s ease}
@keyframes htk-evdet-in{from{opacity:0;max-height:0;padding-top:0;padding-bottom:0}to{opacity:1;max-height:600px}}
.htk-evdet-hdr{display:flex;gap:10px;align-items:flex-start;margin-bottom:12px}
.htk-evdet-emoji{font-size:1.6rem;line-height:1}
.htk-evdet-meta{flex:1;min-width:0}
.htk-evdet-title{font-size:.95rem;font-weight:700;color:rgba(255,255,255,.95)}
.htk-evdet-sub{font-size:.75rem;color:rgba(255,255,255,.5);margin-top:3px}
.htk-evdet-sec-label{font-size:.78rem;font-weight:600;color:rgba(255,255,255,.7);margin:10px 0 4px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)}
.htk-evdet-rsvp-btns{display:flex;gap:6px;margin:8px 0}
.htk-evdet-rsvp-btns .htk-rsvp-b{flex:1;padding:8px 0;font-size:.8rem;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.7);cursor:pointer;transition:all .2s;text-align:center;font-weight:500}
.htk-evdet-rsvp-btns .htk-rsvp-go.on{background:rgba(76,175,80,.25);color:#81c784;border-color:rgba(76,175,80,.35)}
.htk-evdet-rsvp-btns .htk-rsvp-maybe.on{background:rgba(255,183,77,.2);color:#ffb74d;border-color:rgba(255,183,77,.3)}
.htk-evdet-rsvp-btns .htk-rsvp-no.on{background:rgba(244,67,54,.2);color:#ef9a9a;border-color:rgba(244,67,54,.25)}
.htk-evdet-resp-summary{margin-top:6px;text-align:center}
.htk-evdet-note{padding:6px 0}
.htk-evdet-acts{display:flex;gap:6px;margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)}
.htk-cal-d:hover{background:var(--hover-bg);transform:scale(1.05)}
.htk-cal-d.om{color:var(--text-3);opacity:.3}.htk-cal-d.td{background:var(--active-bg);font-weight:700}.htk-cal-d.sel{background:var(--active-bg);box-shadow:inset 0 0 0 2px var(--primary)}
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
.htk-nt-chip{padding:4px 10px;border-radius:16px;font-size:.7rem;background:var(--btn-bg);border:1px solid var(--btn-border);cursor:pointer;transition:all .2s;backdrop-filter:blur(4px)}
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
.htk-sch-inp{margin-bottom:4px;border-radius:14px !important;padding:12px 18px !important;background:rgba(255,255,255,.08) !important;border-color:rgba(255,255,255,.12) !important}
.htk-sch-body{max-height:40vh;overflow-y:auto;margin:4px -4px;padding:0 4px}
.htk-sch-close{min-width:120px;padding:12px 24px;border-radius:14px !important}
.htk-sch-note{border-radius:14px}
.htk-modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.3);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;z-index:3200000}
.htk-modal-c{max-width:500px;width:92%;max-height:85vh;overflow-y:auto;animation:htkScIn .4s var(--ease-spring) both;border-radius:28px !important}
.htk-popup-b{font-size:.82rem;color:var(--text-2);line-height:1.7}
/* Mood Analysis */
.htk-ma-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
.htk-ma-card{padding:14px;border-radius:var(--radius-sm);background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);text-align:center}
.htk-ma-label{font-size:.7rem;font-weight:600;color:var(--text-3);margin-bottom:6px}
.htk-ma-big{font-size:1.8rem;line-height:1.2;font-weight:700;text-shadow:none}
.htk-ma-desc{font-size:.76rem;color:var(--text-2);margin-top:4px}
.htk-ma-bar{height:6px;background:rgba(128,128,128,.15);border-radius:3px;margin-top:8px;overflow:hidden}
.htk-ma-bar-fill{height:100%;border-radius:3px;transition:width .5s var(--ease-spring)}
.htk-ma-section{margin-bottom:12px}
.htk-ma-times{display:flex;flex-direction:column;gap:8px}
.htk-ma-time{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--radius-xs);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}
.htk-ma-time-emo{font-size:1.2rem;text-shadow:none;flex-shrink:0;width:28px;text-align:center}
.htk-ma-time-info{flex:1;min-width:0}
.htk-ma-time-label{font-size:.72rem;font-weight:500;color:var(--text-2);margin-bottom:4px}
.htk-ma-time-bar{height:5px;background:rgba(128,128,128,.12);border-radius:3px;overflow:hidden}
.htk-ma-time-fill{height:100%;border-radius:3px;transition:width .5s var(--ease-spring)}
.htk-ma-time-score{font-size:.8rem;font-weight:600;color:var(--text-2);min-width:28px;text-align:right}
.htk-ma-insight{font-size:.78rem;color:var(--text-2);padding:10px 14px;background:rgba(232,168,124,.08);border:1px solid rgba(232,168,124,.12);border-radius:var(--radius-sm);line-height:1.5}
.htk-set-section{margin-bottom:18px}.htk-set-title{font-size:.82rem;font-weight:600;color:rgba(255,255,255,.85);padding-bottom:6px;margin-bottom:8px;border-bottom:1px solid var(--divider)}
.htk-set-row{display:flex;align-items:center;justify-content:space-between;padding:7px 0}.htk-set-row+.htk-set-row{border-top:1px solid var(--divider)}
.htk-set-row-l{font-size:.82rem;flex:1;color:rgba(255,255,255,.8)}.htk-set-desc{font-size:.78rem;color:rgba(255,255,255,.5);margin-bottom:6px}
.htk-modal-c select.htk-inp{border-radius:var(--radius-sm);appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='white' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;color:rgba(255,255,255,.85)}
.htk-modal-c .htk-gc{color:rgba(255,255,255,.8)}
.htk-modal-c .htk-sec-title{color:rgba(255,255,255,.92)}
.htk-modal-c [style*="color:var(--text-3)"]{color:rgba(255,255,255,.5) !important}

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
.htk-bg-ocean{background:linear-gradient(135deg,#2d6a8f,#5bc0be)}.htk-bg-forest{background:linear-gradient(135deg,#2d5a27,#6bbd67)}.htk-bg-night{background:linear-gradient(135deg,#0f0c29,#302b63)}
.htk-rl-box{padding:12px;background:rgba(234,185,68,.08);border:1px solid rgba(234,185,68,.15);border-radius:var(--radius-sm);margin-top:4px}
.htk-rl-t{font-size:.78rem;font-weight:600;color:rgba(240,208,112,.9);margin-bottom:4px}
.htk-rl-tbl{width:100%;margin-top:5px;border-collapse:collapse}
.htk-rl-tbl th,.htk-rl-tbl td{padding:5px 8px;font-size:.72rem;text-align:left;border-bottom:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.65)}.htk-rl-tbl th{color:rgba(255,255,255,.4);font-weight:600}
.htk-anim{animation:htkFiU .5s var(--ease-spring) both}.htk-anim:nth-child(2){animation-delay:.06s}.htk-anim:nth-child(3){animation-delay:.12s}.htk-anim:nth-child(4){animation-delay:.18s}
@keyframes htkFiU{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes htkScIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
/* Mobile: hide desktop nav, add padding */
@media(max-width:1024px){
  .htk-nav-desktop{display:none !important}
  .htk-nav-mobile{display:none}
  .htk-app{padding-bottom:90px}
}
@media(max-width:640px){.htk-app{padding:12px;padding-bottom:90px}.htk-dt-time{font-size:2.2rem}.htk-panels{grid-template-columns:1fr}.htk-mood-sc{gap:3px;flex-wrap:wrap}.htk-mood-e{font-size:1.4rem}.htk-mood-o{padding:6px}.htk-dash{grid-template-columns:1fr}
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
.htk-tut-welcome{text-align:center;max-width:420px;padding:20px;animation:htkTutIn .8s var(--ease-spring) both;position:relative;z-index:1}
.htk-tut-particles{position:absolute;inset:-50px;pointer-events:none;overflow:hidden}
.htk-tut-particles>span{position:absolute;width:4px;height:4px;border-radius:50%;background:rgba(232,168,124,.4);animation:htkParticle 6s linear infinite;opacity:0}
.htk-tut-hero-emoji{font-size:3.5rem;margin-bottom:12px;animation:htkTutFloat 3s ease-in-out infinite;text-shadow:none}
.htk-tut-catch{font-size:1.05rem;color:rgba(255,255,255,.55);margin-bottom:6px;font-weight:400;letter-spacing:3px;text-transform:uppercase}
.htk-tut-appname{font-size:2.8rem;font-weight:800;color:rgba(255,255,255,.95);margin-bottom:14px;letter-spacing:1px;text-shadow:0 2px 16px rgba(232,168,124,.35);background:linear-gradient(135deg,#e8a87c,#85cdca);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
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

</style>

<!-- グローバルスタイル: Hatask起動時にMisskeyの標準ナビバーを非表示にする -->
<style lang="scss">
/* JS側で data-htask-hidden を付与した要素を確実に非表示 */
[data-htask-hidden] {
  display: none !important;
}
/* Mobile nav styles (global scope for Teleport to body) */
@media(max-width:1024px){
  .htk-nav-mobile{display:flex !important;position:fixed !important;bottom:calc(16px + env(safe-area-inset-bottom, 0px));left:50%;transform:translateX(-50%);width:calc(100vw - 32px);max-width:480px;z-index:3100000 !important;border-radius:24px;padding:4px;gap:2px;margin:0;background:rgba(255,255,255,.12);backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);box-shadow:0 4px 24px rgba(0,0,0,.12),0 0 0 1px rgba(255,255,255,.2) inset,0 1px 0 rgba(255,255,255,.3) inset;border:0.5px solid rgba(255,255,255,.18);pointer-events:auto !important;visibility:visible !important;opacity:1 !important}
  .htk-nav-pad{display:block;position:fixed !important;bottom:0;left:0;right:0;width:100%;height:calc(16px + env(safe-area-inset-bottom, 0px));z-index:3099999;background:rgba(255,255,255,.12);backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);pointer-events:none}
  .htk-nav-mobile .htk-nav-t{padding:8px 2px;font-size:.66rem;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:rgba(255,255,255,.6);border:none;background:transparent;cursor:pointer;border-radius:20px;transition:all .3s;font-family:inherit;text-align:center;pointer-events:auto !important}
  .htk-nav-mobile .htk-nav-t.on{color:rgba(255,255,255,.95);font-weight:600;background:rgba(255,255,255,.2);box-shadow:0 1px 4px rgba(0,0,0,.1),0 0 0 0.5px rgba(255,255,255,.12) inset}
  .htk-nav-mobile .htk-ico{font-size:1.1rem;margin-bottom:1px}
  /* dark theme (dark backgrounds: ocean/forest/night) */
}
@media(max-width:640px){
  .htk-nav-mobile{width:calc(100vw - 24px) !important;bottom:calc(10px + env(safe-area-inset-bottom, 0px)) !important;padding:5px 6px !important;border-radius:22px !important}
  .htk-nav-mobile .htk-nav-t{padding:6px 1px !important;font-size:.6rem !important;border-radius:16px !important}
  .htk-nav-mobile .htk-ico{font-size:1rem !important}
  .htk-nav-pad{height:calc(10px + env(safe-area-inset-bottom, 0px)) !important}
}
</style>
