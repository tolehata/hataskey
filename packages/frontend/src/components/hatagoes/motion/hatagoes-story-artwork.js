/* SPDX-FileCopyrightText: tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 * Vue h() port of the supplied HataGoes Story Light/Dark composition.
 */
import { h as vueH, Fragment } from "vue";
// The reference uses React-style numeric CSS lengths. Vue h() needs explicit units.
const unitlessStyle = new Set(['opacity', 'zIndex', 'fontWeight', 'lineHeight', 'flex', 'flexGrow', 'flexShrink', 'order', 'scale', 'zoom']);

function h(type, props, ...children) {
  let next = props;
  if (props?.style && typeof props.style === 'object' && !Array.isArray(props.style)) {
    const style = Object.fromEntries(Object.entries(props.style).map(([key, value]) => [
      key, typeof value === 'number' && !unitlessStyle.has(key) ? `${value}px` : value,
    ]));
    next = { ...props, style };
  }
  return vueH(type, next, children.length > 1 ? children : children[0]);
}

const Easing = {
  linear: (t) => t,
  easeOutCubic: (t) => --t * t * t + 1,
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeOutBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
};
const STORY_SCENES = [
  { name: "Intro", start: 0, duration: 3 },
  { name: "Before", start: 3, duration: 4 },
  { name: "Switch", start: 7, duration: 3.5 },
  { name: "Gather", start: 10.5, duration: 3 },
  { name: "One", start: 13.5, duration: 5 },
  { name: "Rebrand", start: 18.5, duration: 3.5 },
  { name: "Logo", start: 22, duration: 4.5 }
];
const STORY_DURATION = 26.5;
const STORY_FINAL_HOLD = 26.5;
const CUES = Object.fromEntries(STORY_SCENES.map((scene) => [scene.name, scene.start]));
const MOTION = { enter: Easing.easeOutCubic, morph: Easing.easeInOutCubic, pop: Easing.easeOutBack };
const pg = (T, s, e, ease = MOTION.enter) => ease(Math.min(1, Math.max(0, (T - s) / (e - s))));
const mix = (a, b, p) => a + (b - a) * p;
const THEMES = {
  light: { bg: "#fff7f2", ink: "#2b1f2c", sub: "#6a5566", line: "rgba(43,31,44,.12)", shadow: "0 18px 40px rgba(60,30,50,.16)", frame: "#2b1f2c" },
  dark: { bg: "#17141a", ink: "#f6eef2", sub: "#c9bcc5", line: "rgba(255,255,255,.12)", shadow: "0 18px 40px rgba(0,0,0,.5)", frame: "#3a3340" }
};
const PINK = "#e0567a", ORANGE = "#f2a04b", CREAM = "#fff7f2";
const FUR = "#9ea6b8", FUR2 = "#f3efe9", EAR = "#f2b8c6", HOOD = "#e0567a";
const APPS = [
  { name: ["Ha", "task"], tile: "#f6cf4a", deep: "#8a6200", light: "#f6cf4a", role: "オールインワン・ステーショナリーツール", oldInk: "#2b1f2c", shape: "task", x: 400 },
  { name: ["Ha", "tady"], tile: "#9fdcc4", deep: "#1d7457", light: "#9fdcc4", role: "ログ記録ツール", oldInk: "#263b35", shape: "dy", x: 960 },
  { name: ["Hata", "Feed"], tile: "#b9d7f2", deep: "#2c64a0", light: "#b9d7f2", role: "問題解決・絵文字管理ツール", oldInk: "#357359", shape: "feed", x: 1520 }
];
const WY = 380;
const CAPS = [
  { k: "Before", at: 0.3, text: "これまでは、予定は Hatask、記録は Hatady、困りごとは HataFeed。" },
  { k: "Switch", at: 0, text: "あれ、どのアプリで何をするんだっけ？" },
  { k: "Gather", at: 0, text: "そこで、これらのアプリを再編成し、1つのアプリとしてまとめました。" },
  { k: "One", at: 0.2, text: "これからは、ステーショナリーも、ログも、問題解決も。ここだけで。" },
  { k: "Rebrand", at: 0, text: "あわせて、ロゴも一新しました。" }
];

function Mark({ shape, ink = "#2b1f2c" }) {
  const cut = "#fff";
  return /* @__PURE__ */ h("svg", { viewBox: "0 0 100 100", width: "100%", height: "100%", style: { display: "block" } }, /* @__PURE__ */ h("rect", { x: "20", y: "18", width: "7", height: "66", rx: "3.5", fill: ink }), shape === "task" && /* @__PURE__ */ h("g", null, /* @__PURE__ */ h("polygon", { points: "30,24 82,50 30,76", fill: ink, stroke: ink, "stroke-width": "4", "stroke-linejoin": "round" }), /* @__PURE__ */ h("polyline", { points: "37,50 45,58 59,42", fill: "none", stroke: cut, "stroke-width": "7", "stroke-linecap": "round", "stroke-linejoin": "round" })), shape === "dy" && /* @__PURE__ */ h("g", null, /* @__PURE__ */ h("polygon", { points: "30,24 80,24 66,50 80,76 30,76", fill: ink, stroke: ink, "stroke-width": "4", "stroke-linejoin": "round" }), /* @__PURE__ */ h("path", { d: "M39 37 H53 M39 49 H47", stroke: cut, "stroke-width": "5.5", "stroke-linecap": "round" }), /* @__PURE__ */ h("line", { x1: "53", y1: "62", x2: "67", y2: "39", stroke: cut, "stroke-width": "8", "stroke-linecap": "round" }), /* @__PURE__ */ h("polygon", { points: "46.5,71 48,61.5 55,65.5", fill: cut, stroke: cut, "stroke-width": "2", "stroke-linejoin": "round" })), shape === "feed" && /* @__PURE__ */ h("g", null, /* @__PURE__ */ h("path", { d: "M30 26 H72 a9 9 0 0 1 9 9 V57 a9 9 0 0 1 -9 9 H46 L32 78 V66 H30 Z", fill: ink }), /* @__PURE__ */ h("line", { x1: "43", y1: "57", x2: "60", y2: "40", stroke: cut, "stroke-width": "7", "stroke-linecap": "round" }), /* @__PURE__ */ h("circle", { cx: "63", cy: "37", r: "9", fill: cut }), /* @__PURE__ */ h("circle", { cx: "67.5", cy: "32.5", r: "4.6", fill: ink })));
}

function FlagMark({ s }) {
  const x = (v) => 31 + 53 * (v - 21) / 29;
  return /* @__PURE__ */ h("svg", { viewBox: "0 0 100 100", width: s, height: s, style: { display: "block" } }, /* @__PURE__ */ h("rect", { x: "19", y: "16", width: "8", height: "70", rx: "4", fill: CREAM }), /* @__PURE__ */ h("polygon", { points: `31,21 ${x(36)},36 31,36`, fill: CREAM, stroke: CREAM, "stroke-width": "3", "stroke-linejoin": "round" }), /* @__PURE__ */ h("polygon", { points: `31,43 ${x(43)},43 84,50 ${x(43)},57 31,57`, fill: ORANGE, stroke: ORANGE, "stroke-width": "3", "stroke-linejoin": "round" }), /* @__PURE__ */ h("polygon", { points: `31,64 ${x(36)},64 31,79`, fill: CREAM, stroke: CREAM, "stroke-width": "3", "stroke-linejoin": "round" }));
}

const I = ({ n, s = 16, c }) => /* @__PURE__ */ h("i", { class: "ti ti-" + n, style: { fontSize: s, color: c } });

function HataskMock() {
  return /* @__PURE__ */ h("div", { style: { width: 520, height: 340, display: "flex", background: "linear-gradient(168deg,#fff6f8,#fffcfd 46%,#fdeef2)", color: "#2b1f2c", fontSize: 13 } }, /* @__PURE__ */ h("div", { style: { width: 120, padding: "14px 10px", display: "flex", flexDirection: "column", gap: 6, borderRight: "1px solid rgba(80,50,70,.18)" } }, /* @__PURE__ */ h("span", { style: { font: "400 17px HataStoryRighteous,sans-serif", padding: "0 6px 8px" } }, "Hatask"), /* @__PURE__ */ h("span", { style: { display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999, background: PINK, color: "#fff", fontWeight: 800 } }, /* @__PURE__ */ h(I, { n: "home", s: 14 }), "ホーム"), [["calendar-event", "カレンダー"], ["square-check", "ToDo"], ["mood-smile", "きもち"], ["soup", "ごはん"]].map(([ic, l]) => /* @__PURE__ */ h("span", { key: l, style: { display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", color: "#6a5566", fontWeight: 700 } }, /* @__PURE__ */ h(I, { n: ic, s: 14 }), l))), /* @__PURE__ */ h("div", { style: { flex: 1, padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "start" } }, /* @__PURE__ */ h("div", { style: { padding: 14, borderRadius: 20, background: "#fff7f2", boxShadow: "0 14px 28px -22px rgba(90,50,70,.6)" } }, /* @__PURE__ */ h("small", { style: { color: "#6a5566", fontWeight: 700 } }, "いまの予定"), /* @__PURE__ */ h("div", { style: { font: "700 21px/1.2 'HataStoryZenMaru',sans-serif", margin: "6px 0" } }, "次は", /* @__PURE__ */ h("br", null), "作業の時間"), /* @__PURE__ */ h("small", { style: { color: "#6a5566" } }, "まずは、きょうの分から。"), /* @__PURE__ */ h("div", { style: { marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, background: PINK, color: "#fff", fontWeight: 800 } }, /* @__PURE__ */ h(I, { n: "plus", s: 13 }), "予定を追加")), /* @__PURE__ */ h("div", { style: { padding: 14, borderRadius: 20, background: "#fff7f2", boxShadow: "0 14px 28px -22px rgba(90,50,70,.6)" } }, /* @__PURE__ */ h("small", { style: { color: "#6a5566", fontWeight: 700 } }, "ToDo"), ["企画書を送る", "本を返す", "週末の予定"].map((t) => /* @__PURE__ */ h("div", { key: t, style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(80,50,70,.15)", fontWeight: 700 } }, /* @__PURE__ */ h("span", { style: { width: 13, height: 13, border: "2px solid rgba(80,50,70,.4)", borderRadius: 4 } }), t)))));
}

function HatadyMock() {
  return /* @__PURE__ */ h("div", { style: { width: 520, height: 340, background: "#eef2f3", color: "#263b35", padding: 14, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 10, fontSize: 13 } }, /* @__PURE__ */ h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ h("span", { style: { font: "400 21px HataStoryRighteous,sans-serif" } }, "Hatady"), /* @__PURE__ */ h("span", { style: { display: "flex", gap: 2, padding: 3, borderRadius: 20, background: "#fff", border: "1px solid #e0e7e3" } }, ["ホーム", "本棚", "学習"].map((l, i) => /* @__PURE__ */ h("span", { key: l, style: { padding: "4px 10px", borderRadius: 999, background: i === 0 ? "#e9f0eb" : "transparent", color: i === 0 ? "#357359" : "#596b62", fontWeight: 700, fontSize: 12 } }, l)))), /* @__PURE__ */ h("div", { style: { fontWeight: 700, fontSize: 17, lineHeight: 1.35 } }, "おかえりなさい。", /* @__PURE__ */ h("br", null), "今日も少しずつ。"), /* @__PURE__ */ h("div", { style: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, flex: 1 } }, /* @__PURE__ */ h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 20, background: "#e9f0eb" } }, /* @__PURE__ */ h("span", null, /* @__PURE__ */ h("small", { style: { color: "#596b62" } }, "あなたへのおすすめ"), /* @__PURE__ */ h("div", { style: { fontWeight: 700, fontSize: 18, margin: "4px 0" } }, "月の郵便室"), /* @__PURE__ */ h("small", { style: { color: "#596b62" } }, "ファンタジー")), /* @__PURE__ */ h("span", { style: { width: 62, height: 86, borderRadius: "4px 9px 9px 4px", background: "#405c63", transform: "rotate(-4deg)" } })), /* @__PURE__ */ h("div", { style: { padding: 14, borderRadius: 20, background: "#fff", border: "1px solid #e0e7e3" } }, /* @__PURE__ */ h("small", { style: { color: "#596b62", fontWeight: 700 } }, "記録"), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { style: { fontSize: 26 } }, "14"), /* @__PURE__ */ h("small", { style: { color: "#596b62" } }, " 件 \xB7 7日")), /* @__PURE__ */ h("div", { style: { display: "flex", alignItems: "flex-end", gap: 4, height: 40, marginTop: 6 } }, [40, 70, 30, 90, 55, 80, 60].map((h2, i) => /* @__PURE__ */ h("span", { key: i, style: { flex: 1, height: h2 + "%", borderRadius: 3, background: "#357359" } }))))));
}

function HataFeedMock() {
  return /* @__PURE__ */ h("div", { style: { width: 520, height: 340, background: "#eef2f3", color: "#263b35", padding: 14, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 10, fontSize: 12 } }, /* @__PURE__ */ h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ h("span", { style: { font: "400 21px HataStoryRighteous,sans-serif", color: "#357359" } }, "HataFeed"), /* @__PURE__ */ h("span", { style: { display: "flex", gap: 2, padding: 3, borderRadius: 20, background: "#fff", border: "1px solid #e0e7e3" } }, ["ホーム", "イシュー", "絵文字"].map((l, i) => /* @__PURE__ */ h("span", { key: l, style: { padding: "4px 10px", borderRadius: 999, background: i === 0 ? "#e9f0eb" : "transparent", color: i === 0 ? "#357359" : "#596b62", fontWeight: 700 } }, l)))), /* @__PURE__ */ h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 } }, [["route", "ロードマップ", "対応中 4"], ["mood-smile", "絵文字の申請", "審査待ち 6"], ["message", "コメント", "新着 3"]].map(([ic, t, s]) => /* @__PURE__ */ h("div", { key: t, style: { padding: 10, borderRadius: 16, background: "#fff", border: "1px solid #e0e7e3" } }, /* @__PURE__ */ h("div", { style: { display: "flex", alignItems: "center", gap: 5, fontWeight: 700 } }, /* @__PURE__ */ h(I, { n: ic, s: 13 }), t), /* @__PURE__ */ h("small", { style: { color: "#596b62" } }, s)))), /* @__PURE__ */ h("div", { style: { flex: 1, borderRadius: 16, background: "#fff", border: "1px solid #e0e7e3", overflow: "hidden" } }, [["progress", "#b6791f", "#42 小さな画面でも予定を見やすく", "対応中"], ["circle-dot", "#2b6fc0", "#51 ダークテーマの文字", "確認中"], ["mood-plus", "#357359", ":hatakyu_wave: を追加", "承認"]].map(([ic, c, t, s]) => /* @__PURE__ */ h("div", { key: t, style: { display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderBottom: "1px solid #e0e7e3", fontWeight: 700 } }, /* @__PURE__ */ h(I, { n: ic, s: 14, c }), /* @__PURE__ */ h("span", { style: { flex: 1 } }, t), /* @__PURE__ */ h("small", { style: { color: c } }, s)))));
}

const MOCKS = [HataskMock, HatadyMock, HataFeedMock];
const FUR_D = "#737d92", HOOD_D = "#b83f63";

function Wolf({ x, y, head, armL, armR, mood, bob, sweat, lean, tail, step, look, ear, T, up = 0, scale = 0.85 }) {
  const ex = head * 6 + look * 4;
  const blink = mood === "neutral" && T % 3.1 < 0.13;
  const star = (cx, cy, r) => {
    const p = [];
    for (let k = 0; k < 10; k++) {
      const rr = k % 2 ? r * 0.42 : r, an = -Math.PI / 2 + k * Math.PI / 5;
      p.push((cx + rr * Math.cos(an)).toFixed(1) + "," + (cy + rr * Math.sin(an)).toFixed(1));
    }
    return /* @__PURE__ */ h("polygon", { points: p.join(" "), fill: "#fff" });
  };
  const arcEye = (cx) => /* @__PURE__ */ h("path", { d: "M" + (cx - 13 + ex) + " 116 Q" + (cx + ex) + " 100 " + (cx + 13 + ex) + " 116", stroke: "#2b1f2c", "stroke-width": "6", fill: "none", "stroke-linecap": "round" });
  const eye = (cx, side) => {
    const X = cx + ex;
    if (blink) return /* @__PURE__ */ h("path", { d: "M" + (X - 12) + " 112 H" + (X + 12), stroke: "#2b1f2c", "stroke-width": "5", "stroke-linecap": "round" });
    if (mood === "happy" || mood === "wink" && side < 0) return arcEye(cx);
    if (mood === "dizzy") return /* @__PURE__ */ h("g", { fill: "none", stroke: "#2b1f2c", "stroke-width": "3.5" }, /* @__PURE__ */ h("circle", { cx: X, cy: "112", r: "13" }), /* @__PURE__ */ h("circle", { cx: X + 2, cy: "111", r: "7" }), /* @__PURE__ */ h("circle", { cx: X + 3, cy: "110", r: "2", fill: "#2b1f2c" }));
    if (mood === "surprise") return /* @__PURE__ */ h("g", null, /* @__PURE__ */ h("circle", { cx: X, cy: "110", r: "17", fill: "#fff", stroke: "#2b1f2c", "stroke-width": "3" }), /* @__PURE__ */ h("circle", { cx: X + look * 3, cy: "111", r: "7", fill: "#2b1f2c" }));
    if (mood === "sparkle") return /* @__PURE__ */ h("g", null, /* @__PURE__ */ h("ellipse", { cx: X, cy: "111", rx: "14", ry: "17", fill: "#2b1f2c" }), star(X + 3, 105, 8), /* @__PURE__ */ h("circle", { cx: X - 5, cy: "119", r: "3", fill: "#fff" }));
    const r = mood === "worry" ? 0.85 : 1;
    return /* @__PURE__ */ h("g", null, /* @__PURE__ */ h("ellipse", { cx: X, cy: "112", rx: 11 * r, ry: 14 * r, fill: "#2b1f2c" }), /* @__PURE__ */ h("circle", { cx: X + 4, cy: "106", r: "4.5", fill: "#fff" }), /* @__PURE__ */ h("circle", { cx: X - 3, cy: "118", r: "1.8", fill: "#fff" }));
  };
  const brows = {
    worry: ["M60 92 L88 82", "M132 82 L160 92"],
    dizzy: ["M60 90 L88 84", "M132 84 L160 90"],
    surprise: ["M62 76 Q76 66 90 74", "M130 74 Q144 66 158 76"],
    sparkle: ["M62 84 Q76 76 90 84", "M130 84 Q144 76 158 84"],
    wink: ["M62 88 Q76 84 90 90", "M130 82 Q144 74 158 82"],
    happy: ["M62 86 Q76 80 90 86", "M130 86 Q144 80 158 86"],
    neutral: ["M64 86 Q76 82 88 86", "M132 86 Q144 82 156 86"]
  }[mood] || ["M64 86 Q76 82 88 86", "M132 86 Q144 82 156 86"];
  const fang = (fx, fy) => /* @__PURE__ */ h("polygon", { points: fx + "," + fy + " " + (fx + 5) + "," + fy + " " + (fx + 2.5) + "," + (fy + 5), fill: "#fff" });
  const mx = 110 + ex;
  const mouth = mood === "worry" || mood === "dizzy" ? /* @__PURE__ */ h("path", { d: "M" + (mx - 16) + " 156 q8 -7 16 0 q8 7 16 0", stroke: "#2b1f2c", "stroke-width": "4.5", fill: "none", "stroke-linecap": "round" }) : mood === "surprise" ? /* @__PURE__ */ h("ellipse", { cx: mx, cy: "156", rx: "7", ry: "9", fill: "#7a2b3c", stroke: "#2b1f2c", "stroke-width": "3" }) : mood === "neutral" ? /* @__PURE__ */ h("path", { d: "M" + (mx - 14) + " 146 Q" + (mx - 7) + " 156 " + mx + " 146 Q" + (mx + 7) + " 156 " + (mx + 14) + " 146", stroke: "#2b1f2c", "stroke-width": "4.5", fill: "none", "stroke-linecap": "round" }) : /* @__PURE__ */ h("g", null, /* @__PURE__ */ h("path", { d: "M" + mx + " 142 V148", stroke: "#2b1f2c", "stroke-width": "4", "stroke-linecap": "round" }), /* @__PURE__ */ h("path", { d: "M" + (mx - 13) + " 148 Q" + mx + " 152 " + (mx + 13) + " 148 Q" + (mx + 12) + " 166 " + mx + " 167 Q" + (mx - 12) + " 166 " + (mx - 13) + " 148Z", fill: "#7a2b3c", stroke: "#2b1f2c", "stroke-width": "3", "stroke-linejoin": "round" }), /* @__PURE__ */ h("path", { d: "M" + (mx - 7) + " 165 Q" + mx + " 156 " + (mx + 7) + " 165Z", fill: "#f08aa0" }), fang(mx - 9, 149));
  const earRot = -ear * 6, droop = Math.max(0, -ear) * 28;
  const cl = (v) => Math.max(-150, Math.min(150, v));
  const arm = (ang, left) => /* @__PURE__ */ h("div", { style: { position: "absolute", left: left ? 62 : 158, top: 0, width: 30, marginLeft: -15, transformOrigin: "15px 14px", transform: "rotate(" + cl(ang) + "deg)" } }, /* @__PURE__ */ h("div", { style: { width: 30, height: 50, borderRadius: "15px 15px 12px 12px", background: "linear-gradient(to bottom," + HOOD + " 78%," + HOOD_D + " 78%)" } }), /* @__PURE__ */ h("div", { style: { width: 30, height: 28, marginTop: -8, borderRadius: "50% 50% 46% 46%", background: FUR } }));
  const shoe = (l, dy) => /* @__PURE__ */ h("div", { style: { position: "absolute", left: l - 6, top: 384 + dy, width: 44, height: 22, borderRadius: "12px 16px 8px 8px", background: "#fffdf8", borderBottom: "6px solid " + PINK, boxSizing: "border-box" } });
  return /* @__PURE__ */ h("div", { style: { position: "absolute", left: x - 110, top: y - 408 + bob, width: 220, height: 408, transform: "scale(" + scale + ") rotate(" + lean + "deg)", transformOrigin: "110px 408px" } }, /* @__PURE__ */ h("svg", { viewBox: "0 0 80 160", width: "80", height: "160", style: { position: "absolute", left: 128, top: 166, transformOrigin: "16px 150px", transform: "rotate(" + (34 + tail) + "deg)", overflow: "visible" } }, /* @__PURE__ */ h("path", { d: "M16 150 C-6 110 4 50 30 8 C40 0 52 6 54 16 C70 60 58 120 30 154 Z", fill: FUR }), /* @__PURE__ */ h("path", { d: "M24 72 C30 50 40 30 50 18 C58 40 60 60 56 78 C46 70 34 68 24 72Z", fill: FUR_D }), /* @__PURE__ */ h("path", { d: "M30 8 C40 0 52 6 54 16 C56 24 50 30 44 26 L40 34 L36 24 L30 30 Z", fill: FUR2 })), /* @__PURE__ */ h("div", { style: { position: "absolute", left: 74, top: 322 - step, width: 32, height: 72 + step, borderRadius: 16, background: FUR } }), /* @__PURE__ */ h("div", { style: { position: "absolute", left: 114, top: 322 + step, width: 32, height: 72 - step, borderRadius: 16, background: FUR } }), shoe(72, 0), shoe(110, 0), /* @__PURE__ */ h("svg", { viewBox: "0 0 220 170", width: "220", height: "170", style: { position: "absolute", left: 0, top: 180 } }, /* @__PURE__ */ h("ellipse", { cx: "110", cy: "16", rx: "48", ry: "15", fill: HOOD_D }), /* @__PURE__ */ h("path", { d: "M66 14 Q110 2 154 14 Q170 80 162 150 Q110 160 58 150 Q50 80 66 14Z", fill: HOOD }), /* @__PURE__ */ h("path", { d: "M74 112 H146 L140 142 H80 Z", fill: HOOD_D }), /* @__PURE__ */ h("path", { d: "M84 26 L82 66 M136 26 L138 66", stroke: "#fff7f2", "stroke-width": "3.5", "stroke-linecap": "round" }), /* @__PURE__ */ h("circle", { cx: "82", cy: "69", r: "4", fill: "#fff7f2" }), /* @__PURE__ */ h("circle", { cx: "138", cy: "69", r: "4", fill: "#fff7f2" }), /* @__PURE__ */ h("polygon", { points: "76,12 144,12 110,54", fill: ORANGE, stroke: ORANGE, "stroke-width": "6", "stroke-linejoin": "round" }), /* @__PURE__ */ h("path", { d: "M90 20 L110 44", stroke: "#f7c27f", "stroke-width": "3", "stroke-linecap": "round" }), /* @__PURE__ */ h("polygon", { points: "86,6 96,18 103,8 110,20 117,8 124,18 134,6", fill: FUR2 }), /* @__PURE__ */ h("g", { transform: "rotate(8 132 88)" }, /* @__PURE__ */ h("rect", { x: "120", y: "76", width: "24", height: "24", rx: "6", fill: "#fff7f2" }), /* @__PURE__ */ h("rect", { x: "125", y: "80", width: "2.5", height: "16", rx: "1.2", fill: PINK }), /* @__PURE__ */ h("polygon", { points: "128,81 140,88 128,95", fill: PINK }), /* @__PURE__ */ h("rect", { x: "128", y: "86.5", width: "7", height: "3", fill: ORANGE }))), /* @__PURE__ */ h("div", { style: { position: "absolute", left: 0, top: 0, width: 220, height: 200, transform: "translateX(" + head * 10 + "px) rotate(" + head * 9 + "deg)", transformOrigin: "110px 190px" } }, /* @__PURE__ */ h("svg", { viewBox: "0 0 220 200", width: "220", height: "200", style: { display: "block", overflow: "visible" } }, /* @__PURE__ */ h("g", { transform: "rotate(" + (earRot - droop) + " 70 72)" }, /* @__PURE__ */ h("polygon", { points: "36,96 50,4 104,62", fill: FUR, stroke: FUR, "stroke-width": "8", "stroke-linejoin": "round" }), /* @__PURE__ */ h("polygon", { points: "44,30 50,4 64,22", fill: FUR_D }), /* @__PURE__ */ h("polygon", { points: "56,76 58,30 88,62", fill: EAR }), /* @__PURE__ */ h("path", { d: "M60 70 L66 52 M68 72 L72 56", stroke: "#fff", "stroke-width": "3", "stroke-linecap": "round" })), /* @__PURE__ */ h("g", { transform: "rotate(" + (-earRot + droop) + " 150 72)" }, /* @__PURE__ */ h("polygon", { points: "184,96 170,4 116,62", fill: FUR, stroke: FUR, "stroke-width": "8", "stroke-linejoin": "round" }), /* @__PURE__ */ h("polygon", { points: "176,30 170,4 156,22", fill: FUR_D }), /* @__PURE__ */ h("polygon", { points: "164,76 162,30 132,62", fill: EAR }), /* @__PURE__ */ h("path", { d: "M160 70 L154 52 M152 72 L148 56", stroke: "#fff", "stroke-width": "3", "stroke-linecap": "round" })), /* @__PURE__ */ h("polygon", { points: "26,106 0,124 22,128 2,146 36,140", fill: FUR }), /* @__PURE__ */ h("polygon", { points: "194,106 220,124 198,128 218,146 184,140", fill: FUR }), /* @__PURE__ */ h("ellipse", { cx: "110", cy: "115", rx: "94", ry: "80", fill: FUR }), /* @__PURE__ */ h("g", { transform: "translate(0 " + -9 * up + ")" }, /* @__PURE__ */ h("path", { d: "M24 104 Q60 46 " + (110 + ex) + " 52 Q" + (160 + ex) + " 46 196 104 Q170 80 " + (110 + ex) + " 92 Q50 80 24 104Z", fill: FUR_D }), /* @__PURE__ */ h("ellipse", { cx: 110 + ex, cy: "74", rx: "13", ry: "26", fill: FUR2 }), /* @__PURE__ */ h("path", { d: "M" + (56 + ex) + " 128 Q" + (110 + ex) + " 92 " + (164 + ex) + " 128 Q" + (166 + ex) + " 186 " + (110 + ex) + " 190 Q" + (54 + ex) + " 186 " + (56 + ex) + " 128Z", fill: FUR2 }), /* @__PURE__ */ h("path", { d: "M40 160 L52 170 L48 156 L62 166", stroke: FUR2, "stroke-width": "5", fill: "none", "stroke-linejoin": "round" }), eye(76, -1), eye(144, 1), /* @__PURE__ */ h("path", { d: brows[0], transform: "translate(" + ex + " 0)", stroke: FUR_D, "stroke-width": "7", "stroke-linecap": "round", fill: "none" }), /* @__PURE__ */ h("path", { d: brows[1], transform: "translate(" + ex + " 0)", stroke: FUR_D, "stroke-width": "7", "stroke-linecap": "round", fill: "none" }), /* @__PURE__ */ h("ellipse", { cx: 56 + ex, cy: "140", rx: "13", ry: "7", fill: EAR, opacity: mood === "happy" || mood === "sparkle" || mood === "wink" ? 0.95 : 0.55 }), /* @__PURE__ */ h("ellipse", { cx: 164 + ex, cy: "140", rx: "13", ry: "7", fill: EAR, opacity: mood === "happy" || mood === "sparkle" || mood === "wink" ? 0.95 : 0.55 }), /* @__PURE__ */ h("path", { d: "M" + (96 + ex) + " 128 Q" + (110 + ex) + " 122 " + (124 + ex) + " 128 Q" + (122 + ex) + " 140 " + (110 + ex) + " 142 Q" + (98 + ex) + " 140 " + (96 + ex) + " 128Z", fill: "#2b1f2c" }), /* @__PURE__ */ h("ellipse", { cx: 104 + ex, cy: "128", rx: "4", ry: "2.5", fill: "#fff", opacity: ".7" }), mouth, mood === "dizzy" && /* @__PURE__ */ h("g", { fill: "none", stroke: "#8cc8f0", "stroke-width": "4", "stroke-linecap": "round" }, /* @__PURE__ */ h("path", { d: "M" + (60 + ex) + " 30 q8 -10 16 0 t16 0" })), mood === "sparkle" && /* @__PURE__ */ h("g", { fill: "#f6cf4a" }, star(196, 40, 10))), /* @__PURE__ */ h("path", { d: "M200 40 q8 14 0 22 q-8 -8 0 -22z", fill: "#8cc8f0", opacity: sweat, transform: "translate(0 " + sweat * 10 + ")" }))), /* @__PURE__ */ h("div", { style: { position: "absolute", left: 0, top: 198 } }, arm(armL, true), arm(armR, false)));
}

function Phone({ T, O, th, style }) {
  const sec = (i) => pg(T, O + 0.1 + i * 0.3, O + 0.7 + i * 0.3, MOTION.pop);
  const tick = (i) => pg(T, O + 1.5 + i * 0.85, O + 1.8 + i * 0.85, MOTION.pop);
  const done = 2 + [0, 1, 2].filter((i) => tick(i) > 0.5).length;
  const left = 5 - done;
  const rit = [["mood-smile", "きもち"], ["soup", "ごはん"], ["checkbox", "ToDo"], ["droplet", "水やり"], ["book", "読書"]];
  const ritOn = [true, true, tick(0) > 0.5, tick(1) > 0.5, tick(2) > 0.5];
  const todos = [["企画書を送る", "高"], ["読みかけの本を記録", "中"], ["絵文字の申請を確認", "中"]];
  return /* @__PURE__ */ h("div", { style: { position: "absolute", width: 420, height: 860, boxSizing: "border-box", borderRadius: 60, border: `11px solid ${th.frame}`, background: "linear-gradient(168deg,#fff6f8,#fffcfd 46%,#fdeef2)", boxShadow: th.shadow, overflow: "hidden", color: "#2b1f2c", fontFamily: "'HataStoryZenKaku',sans-serif", ...style } }, /* @__PURE__ */ h("div", { style: { display: "grid", gridTemplateColumns: "44px 1fr 44px", alignItems: "center", padding: "40px 12px 8px" } }, /* @__PURE__ */ h("span", { style: { display: "grid", placeItems: "center", color: "#6a5566" } }, /* @__PURE__ */ h(I, { n: "x", s: 22 })), /* @__PURE__ */ h("span", { style: { textAlign: "center", font: "400 26px HataStoryRighteous,sans-serif" } }, "HataGoes"), /* @__PURE__ */ h("span", { style: { display: "grid", placeItems: "center", color: "#6a5566" } }, /* @__PURE__ */ h(I, { n: "bell", s: 21 }))), /* @__PURE__ */ h("div", { style: { display: "flex", flexDirection: "column", gap: 12, padding: "4px 14px" } }, /* @__PURE__ */ h("div", { style: { display: "flex", flexDirection: "column", gap: 14, padding: 16, borderRadius: 24, background: "#fff7f2", boxShadow: "0 20px 40px -28px rgba(90,50,70,.55)", opacity: sec(0), transform: `translateY(${(1 - sec(0)) * 30}px)` } }, /* @__PURE__ */ h("div", { style: { display: "flex", alignItems: "center", gap: 14 } }, /* @__PURE__ */ h("span", { style: { display: "grid", placeItems: "center", width: 92, height: 92, flex: "none", borderRadius: "50%", background: `conic-gradient(${PINK} 0 ${done * 20}%, #fbe3ea ${done * 20}% 100%)` } }, /* @__PURE__ */ h("span", { style: { display: "grid", placeItems: "center", width: 74, height: 74, borderRadius: "50%", background: "#fff7f2", font: "800 26px HataStoryArchivo,sans-serif" } }, done, /* @__PURE__ */ h("small", { style: { fontSize: 12, color: "#6a5566", marginTop: -10 } }, "/5"))), /* @__PURE__ */ h("span", { style: { display: "flex", flexDirection: "column", gap: 2 } }, /* @__PURE__ */ h("small", { style: { color: "#6a5566", fontSize: 12 } }, "10月3日 土曜日"), /* @__PURE__ */ h("strong", { style: { font: "700 19px/1.4 'HataStoryZenMaru',sans-serif" } }, left === 0 ? /* @__PURE__ */ h(Fragment, null, "きょうの記録が、", /* @__PURE__ */ h("br", null), "そろいました。") : /* @__PURE__ */ h(Fragment, null, "あと", left, "つで、", /* @__PURE__ */ h("br", null), "きょうがそろう。")))), /* @__PURE__ */ h("div", { style: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 } }, rit.map(([ic, l], i) => /* @__PURE__ */ h("span", { key: l, style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0", borderRadius: 14, background: ritOn[i] ? PINK : "#fbe9ee", color: ritOn[i] ? "#fff" : "#2b1f2c", fontSize: 10, fontWeight: 800 } }, /* @__PURE__ */ h(I, { n: ic, s: 19 }), l)))), /* @__PURE__ */ h("div", { style: { padding: 16, borderRadius: 24, background: "#fff7f2", boxShadow: "0 20px 40px -28px rgba(90,50,70,.55)", opacity: sec(1), transform: `translateY(${(1 - sec(1)) * 30}px)` } }, /* @__PURE__ */ h("small", { style: { color: "#b02e56", fontSize: 11, fontWeight: 800 } }, "いま \xB7 13:00–14:00"), /* @__PURE__ */ h("div", { style: { font: "700 21px 'HataStoryZenMaru',sans-serif", margin: "2px 0 8px" } }, "作業の時間"), /* @__PURE__ */ h("span", { style: { display: "block", height: 5, borderRadius: 999, background: "#fbe3ea" } }, /* @__PURE__ */ h("span", { style: { display: "block", width: "20%", height: "100%", borderRadius: 999, background: PINK } }))), /* @__PURE__ */ h("div", { style: { padding: "10px 16px", borderRadius: 24, background: "#fff7f2", boxShadow: "0 20px 40px -28px rgba(90,50,70,.55)", opacity: sec(2), transform: `translateY(${(1 - sec(2)) * 30}px)` } }, /* @__PURE__ */ h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 4 } }, /* @__PURE__ */ h("strong", { style: { font: "700 14px 'HataStoryZenMaru',sans-serif" } }, "ToDo"), /* @__PURE__ */ h("small", { style: { color: "#6a5566", fontSize: 11, fontWeight: 800 } }, "優先度順")), todos.map(([t, p], i) => {
    const k = tick(i);
    const on = k > 0.05;
    return /* @__PURE__ */ h("div", { key: t, style: { display: "flex", alignItems: "center", gap: 10, minHeight: 44, borderTop: "1px solid rgba(80,50,70,.15)" } }, /* @__PURE__ */ h("span", { style: { width: 22, height: 22, flex: "none", boxSizing: "border-box", display: "grid", placeItems: "center", borderRadius: "50%", border: `2px solid ${on ? PINK : "rgba(80,50,70,.4)"}`, background: on ? PINK : "transparent", color: "#fff", transform: `scale(${1 + 0.3 * Math.sin(k * Math.PI)})` } }, on && /* @__PURE__ */ h(I, { n: "check", s: 13 })), /* @__PURE__ */ h("span", { style: { flex: 1, fontSize: 14, fontWeight: 700, color: on ? "#6a5566" : "#2b1f2c", textDecoration: k > 0.5 ? "line-through" : "none" } }, t), /* @__PURE__ */ h("span", { style: { padding: "2px 8px", borderRadius: 999, background: p === "高" && !on ? PINK : "#fbe9ee", color: p === "高" && !on ? "#fff" : "#6a5566", fontSize: 11, fontWeight: 800 } }, "優先 ", p));
  })), /* @__PURE__ */ h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, opacity: sec(3) } }, /* @__PURE__ */ h("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: 12, borderRadius: 22, background: "#fbe3ea", fontWeight: 800, fontSize: 13 } }, /* @__PURE__ */ h("span", { style: { fontSize: 22 } }, "\u{1F33C}"), "ヒナギク 72%"), /* @__PURE__ */ h("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: 12, borderRadius: 22, background: "#fdf0f3", fontWeight: 800, fontSize: 13 } }, /* @__PURE__ */ h("span", { style: { width: 22, height: 30, borderRadius: "3px 6px 6px 3px", background: "#405c63" } }), "夜を編む庭"))), /* @__PURE__ */ h("div", { style: { position: "absolute", left: 12, right: 12, bottom: 16, display: "flex", gap: 8 } }, /* @__PURE__ */ h("div", { style: { flex: 1, display: "flex", padding: 5, borderRadius: 28, background: "#fff7f2", boxShadow: "0 18px 34px -18px rgba(0,0,0,.45)" } }, ["home", "checklist", "book-2", "message-report"].map((ic, i) => /* @__PURE__ */ h("span", { key: ic, style: { flex: 1, display: "grid", placeItems: "center", height: 46, borderRadius: 999, background: i === 0 ? PINK : "transparent", color: i === 0 ? "#fff" : "#6a5566" } }, /* @__PURE__ */ h(I, { n: ic, s: 20 })))), /* @__PURE__ */ h("span", { style: { display: "grid", placeItems: "center", width: 56, height: 56, borderRadius: 999, background: PINK, color: "#fff" } }, /* @__PURE__ */ h(I, { n: "plus", s: 24 }))));
}

function Story({ mode, T, showCharacter, loop }) {
  const th = THEMES[mode] || THEMES.light;
  const IN = CUES.Intro || 0, B = CUES.Before, S = CUES.Switch, G = CUES.Gather, O = CUES.One, R = CUES.Rebrand, L = CUES.Logo;
  const walk = pg(T, G + 0.2, G + 1.6, MOTION.morph);
  const walk2 = pg(T, L, L + 0.9, MOTION.morph);
  const px = mix(mix(960, 560, walk), 330, walk2);
  const walking = walk > 0 && walk < 1 || walk2 > 0 && walk2 < 1;
  const step = walking ? Math.sin(T * 14) * 10 : 0;
  const bob = (walking ? -Math.abs(Math.sin(T * 14)) * 10 : 0) + Math.sin(T * 2.2) * 3;
  const swPhase = T >= S && T < G ? Math.floor((T - S) / 0.55) % 3 : -1;
  const flipIdx = T >= R ? Math.min(2, Math.max(0, Math.floor((T - R - 1) / 0.35))) : 0;
  const head = T < S ? Math.sin(T * 1.4) * 0.7 : T < G ? Math.sin((T - S) * 7) * 0.5 : T < O ? 0.8 * pg(T, G + 1.4, G + 2) : T < R ? 1 : T < L ? [-0.4, 0.4, 1][flipIdx] : 0.5 * (1 - pg(T, L, L + 0.6));
  const look = T < S ? Math.sin(T * 1.4) : T < G ? [-1, 0, 1][swPhase] : T < R ? 1 : 0;
  let mood = "neutral";
  if (T >= S && T < G) mood = T > S + 2.3 ? "dizzy" : "worry";
  else if (T >= G && T < O) mood = T < G + 1.1 ? "surprise" : "happy";
  else if (T >= O && T < R) mood = T > O + 1.5 && T < O + 4.2 && (T - O - 1.5) % 0.85 < 0.35 ? "sparkle" : "happy";
  else if (T >= R && T < L) mood = T < R + 1.1 ? "surprise" : "sparkle";
  else if (T >= L) mood = "wink";
  const ear = mood === "worry" || mood === "dizzy" ? -1 : mood === "surprise" ? 1 : mood === "neutral" ? 0 : 0.5;
  const tail = Math.sin(T * (ear > 0 ? 9 : 3)) * (ear > 0 ? 22 : 8) - (ear < 0 ? 30 : 0);
  const hold = pg(T, S + 0.2, S + 0.6, MOTION.pop) * (1 - pg(T, G, G + 0.35));
  const wob = Math.sin(T * 10) * 6;
  let armR = mix(6, -148 + wob, hold);
  let armL = mix(T < S ? -6 + Math.sin(T * 2) * 4 : -6, 148 + wob, hold);
  const pull = pg(T, G, G + 0.45, MOTION.pop) * (1 - pg(T, G + 0.9, G + 1.4));
  if (T >= G && T < O) {
    armR = -150 * pull + 6;
    armL = 150 * pull - 6;
  }
  const tap = T >= O + 1.1 && T < R ? Math.max(0, Math.sin((T - O - 1.1) * 3.7)) : 0;
  if (T >= O && T < R) armR = -70 - 22 * tap;
  if (T >= R && T < L) {
    const cl = Math.max(0, Math.sin((T - R - 1.2) * 9)) * pg(T, R + 1.2, R + 1.5) * (1 - pg(T, R + 2.9, R + 3.3));
    armR = mix(-70, -150 + cl * 40, pg(T, R, R + 0.5));
    armL = mix(-6, 150 - cl * 40, pg(T, R, R + 0.5));
  }
  if (T >= L) {
    const wv = Math.sin((T - L - 0.8) * 9);
    armR = mix(-110, -160 + wv * 18, pg(T, L + 0.3, L + 0.8, MOTION.pop));
    armL = mix(110, -6, pg(T, L, L + 0.5));
  }
  const up = T < G ? 1 - 0.4 * hold : T < O ? 1 - pg(T, G + 0.6, G + 1.4) : T < R ? 0 : T < L ? pg(T, R + 0.3, R + 0.8) : 1 - pg(T, L, L + 0.6);
  const sweat = pg(T, S + 0.6, S + 1) * (1 - pg(T, G, G + 0.4));
  const lean = T >= S && T < G ? Math.sin((T - S) * 5.7) * 3 : 0;
  const wins = APPS.map((a, i) => {
    const Mock = MOCKS[i];
    const pin = pg(T, B + 0.3 + i * 0.25, B + 1 + i * 0.25, MOTION.pop);
    const active = swPhase === i;
    const fly = pg(T, G + 0.5 + i * 0.15, G + 1.6 + i * 0.15, MOTION.morph);
    const jit = (T >= S && T < G ? Math.sin(T * 13 + i) * 6 : Math.sin(T * 1.3 + i) * 5) * (1 - fly);
    const cx = mix(a.x, 1300, fly), cy = mix(WY, 520, fly);
    const sc = mix(0.6, 0.88, pin) * (active ? 1.05 : 1) * mix(1, 0.24, fly);
    const op = Math.min(1, pin * 1.5) * (T >= S && T < G ? active ? 1 : 0.5 : 1) * (1 - pg(T, G + 1.3 + i * 0.15, G + 1.6 + i * 0.15));
    return /* @__PURE__ */ h("div", { key: i, style: { position: "absolute", left: cx - 260, top: cy - 200 + jit, width: 520, opacity: op, transform: "scale(" + sc + ") rotate(" + ((1 - pin) * (i - 1) * 8 + fly * (i - 1) * 14) + "deg)", zIndex: active ? 3 : 1 } }, /* @__PURE__ */ h("div", { style: { borderRadius: 22, overflow: "hidden", boxShadow: th.shadow, border: "1px solid " + th.line } }, /* @__PURE__ */ h(Mock, null)), /* @__PURE__ */ h("div", { style: { marginTop: 14, textAlign: "center", fontSize: 24, fontWeight: 700, color: th.sub, opacity: 1 - fly } }, a.role));
  });
  const qs = [0, 1, 2].map((i) => {
    const p = pg(T, S + 0.4 + i * 0.5, S + 0.9 + i * 0.5, MOTION.pop) * (1 - pg(T, G, G + 0.3));
    return /* @__PURE__ */ h("span", { key: i, style: { position: "absolute", left: px + [-190, 130, -40][i], top: 690 + [0, -30, -80][i] - p * 20, font: "400 64px HataStoryRighteous,sans-serif", color: APPS[i].tile, opacity: p, transform: "scale(" + p + ") rotate(" + [-12, 10, -4][i] + "deg)" } }, "?");
  });
  const ph = pg(T, G + 0.9, G + 1.9, MOTION.pop);
  const phOut = pg(T, R, R + 0.7, MOTION.morph);
  const logos = APPS.map((a, i) => {
    const inn = pg(T, R + 0.5 + i * 0.1, R + 1 + i * 0.1);
    const flip = pg(T, R + 1.2 + i * 0.35, R + 1.75 + i * 0.35, MOTION.morph);
    const isNew = flip >= 0.5;
    const sx = Math.abs(Math.cos(flip * Math.PI));
    const fly = pg(T, L + 0.05 + i * 0.1, L + 0.8 + i * 0.1, MOTION.morph);
    const cx = mix(a.x, 1180, fly), cy = mix(WY - 10, 390, fly);
    const op = inn * (1 - pg(T, L + 0.6 + i * 0.1, L + 0.9 + i * 0.1));
    return /* @__PURE__ */ h("div", { key: i, style: { position: "absolute", left: cx - 260, top: cy - 160, width: 520, height: 320, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, opacity: op, transform: "scale(" + mix(1, 0.4, fly) + ")" } }, /* @__PURE__ */ h("span", { style: { fontSize: 22, fontWeight: 800, letterSpacing: ".1em", color: isNew ? PINK : th.sub, opacity: 1 - fly } }, isNew ? "NEW" : "これまで"), /* @__PURE__ */ h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 20, transform: "scaleX(" + sx + ")" } }, isNew ? /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("span", { style: { width: 170, height: 170, borderRadius: 40, background: a.tile, padding: 14, boxSizing: "border-box", boxShadow: th.shadow } }, /* @__PURE__ */ h(Mark, { shape: a.shape })), /* @__PURE__ */ h("span", { style: { font: "400 64px/1 HataStoryRighteous,sans-serif", color: th.ink, opacity: 1 - fly } }, a.name[0], /* @__PURE__ */ h("span", { style: { color: mode === "dark" ? a.light : a.deep } }, a.name[1]))) : /* @__PURE__ */ h("span", { style: { display: "grid", placeItems: "center", width: 380, height: 254, borderRadius: 24, background: i === 0 ? "#fff7f2" : "#eef2f3", font: "400 64px/1 HataStoryRighteous,sans-serif", color: a.oldInk } }, a.name[0] + a.name[1])));
  });
  const lg = pg(T, L + 0.6, L + 1.3, MOTION.pop);
  const word = pg(T, L + 1.1, L + 1.8);
  const line = pg(T, L + 1.6, L + 2.3);
  const cam = 1 + 0.03 * pg(T, 0, L + 4.5, Easing.linear);
  const outro = loop ? pg(T, L + 3.9, L + 4.5, MOTION.morph) : 0;
  const cap = [...CAPS].reverse().find((c) => T >= CUES[c.k] + c.at);
  const ci = cap ? CAPS.indexOf(cap) : -1;
  const cs = cap ? CUES[cap.k] + cap.at : 0;
  const ce = ci >= 0 && ci < CAPS.length - 1 ? CUES[CAPS[ci + 1].k] + CAPS[ci + 1].at : L;
  const capOp = cap && T < L ? pg(T, cs, cs + 0.4) * (1 - pg(T, ce - 0.3, ce)) : 0;
  const wolf = showCharacter ? h("div", { style: { position: "absolute", inset: 0, opacity: pg(T, B, B + 0.5) } }, h(Wolf, { x: px, y: 1e3, T, up, head, look, ear, armL, armR, mood, bob, sweat, lean, tail, step })) : null;
  return /* @__PURE__ */ h("div", { style: { position: "absolute", inset: 0, background: th.bg, overflow: "hidden", fontFamily: "'HataStoryZenKaku',sans-serif", color: th.ink } }, /* @__PURE__ */ h("div", { style: { position: "absolute", inset: 0, opacity: 1 - outro, transform: "scale(" + cam + ")", transformOrigin: "960px 560px" } }, /* @__PURE__ */ h("div", { style: { position: "absolute", left: 0, right: 0, top: 1e3, height: 2, background: th.line } }), wins, qs, /* @__PURE__ */ h(Phone, { T, O, th, style: { left: mix(1300, 1620, phOut) - 210, top: 150, transformOrigin: "50% 0", opacity: Math.min(1, ph * 1.4) * (1 - phOut), transform: "scale(" + mix(0.55, 0.92, ph) * mix(1, 0.85, phOut) + ")" } }), logos, /* @__PURE__ */ h("div", { style: { position: "absolute", left: 1180 - 140, top: 250, width: 280, height: 280, borderRadius: 64, overflow: "hidden", background: PINK, opacity: Math.min(1, lg * 1.5), transform: "scale(" + mix(0.5, 1, lg) + ") rotate(" + (1 - lg) * -10 + "deg)", boxShadow: th.shadow } }, /* @__PURE__ */ h(FlagMark, { s: 280 })), /* @__PURE__ */ h("div", { style: { position: "absolute", left: 780, width: 800, top: 580, textAlign: "center", font: "400 120px/1 HataStoryRighteous,sans-serif", opacity: word, transform: "translateY(" + (1 - word) * 40 + "px)" } }, "Hata", /* @__PURE__ */ h("span", { style: { color: PINK } }, "Goes")), /* @__PURE__ */ h("div", { style: { position: "absolute", left: 680, width: 1e3, top: 740, textAlign: "center", font: "700 40px/1.4 'HataStoryZenMaru',sans-serif", opacity: line, transform: "translateY(" + (1 - line) * 20 + "px)" } }, "3つのアプリを、ひとつのアプリに。"), /* @__PURE__ */ h("div", { style: { position: "absolute", left: 430, width: 1500, top: 820, display: "flex", justifyContent: "center", gap: 28, whiteSpace: "nowrap" } }, APPS.map((a, i) => {
    const p = pg(T, L + 2.1 + i * 0.12, L + 2.6 + i * 0.12);
    return /* @__PURE__ */ h("span", { key: i, style: { display: "inline-flex", alignItems: "center", gap: 10, fontSize: 24, fontWeight: 700, color: th.sub, opacity: p, transform: "translateY(" + (1 - p) * 12 + "px)" } }, /* @__PURE__ */ h("span", { style: { width: 34, height: 34, borderRadius: 9, background: a.tile, padding: 3, boxSizing: "border-box" } }, /* @__PURE__ */ h(Mark, { shape: a.shape })), /* @__PURE__ */ h("span", { style: { font: "400 30px HataStoryRighteous,sans-serif", color: th.ink } }, a.name[0], /* @__PURE__ */ h("span", { style: { color: mode === "dark" ? a.light : a.deep } }, a.name[1])));
  })), (() => {
    const a = pg(T, IN + 0.1, IN + 0.9, MOTION.pop), w = pg(T, IN + 0.6, IN + 1.2), wl = pg(T, IN + 1.1, IN + 1.7), o = pg(T, B - 0.6, B, MOTION.morph);
    return /* @__PURE__ */ h("div", { style: { position: "absolute", left: 0, right: 0, top: 200, display: "flex", flexDirection: "column", alignItems: "center", gap: 40, opacity: 1 - o, transform: "scale(" + mix(1, 0.85, o) + ") translateY(" + -60 * o + "px)" } }, /* @__PURE__ */ h("div", { style: { width: 280, height: 280, borderRadius: 64, overflow: "hidden", background: PINK, opacity: Math.min(1, a * 1.5), transform: "scale(" + mix(0.5, 1, a) + ") rotate(" + (1 - a) * 10 + "deg)", boxShadow: th.shadow } }, /* @__PURE__ */ h(FlagMark, { s: 280 })), /* @__PURE__ */ h("div", { style: { font: "400 120px/1 HataStoryRighteous,sans-serif", opacity: w, transform: "translateY(" + (1 - w) * 40 + "px)" } }, "Hata", /* @__PURE__ */ h("span", { style: { color: PINK } }, "Goes")), /* @__PURE__ */ h("div", { style: { marginTop: -8, font: "700 48px/1.3 'HataStoryZenMaru',sans-serif", opacity: wl, transform: "translateY(" + (1 - wl) * 20 + "px)" } }, "HataGoes へようこそ。"));
  })(), wolf), /* @__PURE__ */ h("div", { style: { position: "absolute", left: 0, right: 0, top: 56, textAlign: "center", font: "700 44px/1.3 'HataStoryZenMaru',sans-serif", color: th.ink, opacity: capOp } }, cap ? cap.text : ""));
}

function renderHatagoesStory(mode, T, showCharacter, loop) {
  return Story({ mode, T, showCharacter, loop });
}

function storySceneAt(T) {
  return [...STORY_SCENES].reverse().find((scene) => T >= scene.start)?.name ?? "Intro";
}

function storyCaptionAt(T) {
  const cap = [...CAPS].reverse().find((c) => T >= CUES[c.k] + c.at);
  return cap && T < CUES.Logo ? cap.text : "";
}

export {
  STORY_DURATION,
  STORY_FINAL_HOLD,
  STORY_SCENES,
  renderHatagoesStory,
  storyCaptionAt,
  storySceneAt
};
