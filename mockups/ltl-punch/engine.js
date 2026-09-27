// SPDX-License-Identifier: AGPL-3.0-only
(function (root) {
  'use strict';
  const DURATIONS = Object.freeze({ charging: 1.2, warning: 2, falling: 36 });
  const PREPARATION = DURATIONS.charging + DURATIONS.warning;
  const TOTAL = PREPARATION + DURATIONS.falling;
  const fists = new Set(['🤛', '👊', '🤜']);
  function trigger(text, scope = 'local') {
    if (scope !== 'local') return false;
    const normalized = String(text).replace(/[\uFE0E\uFE0F]|[\u{1F3FB}-\u{1F3FF}]/gu, '');
    let previous = '', count = 0;
    for (const char of normalized) {
      count = fists.has(char) ? (char === previous ? count + 1 : 1) : 0;
      previous = char;
      if (count >= 3) return true;
    }
    return false;
  }
  const clampPeople = n => Math.max(1, Math.min(40, Math.round(Number(n) || 1)));
  const maxHP = n => 80 + 20 * clampPeople(n);
  function create(people = 8) { return { phase: 'idle', people: clampPeople(people), hp: maxHP(people), maxHP: maxHP(people), elapsed: 0, progress: 0 }; }
  function start(state) { if (['charging', 'warning', 'falling'].includes(state.phase)) return state; return { ...create(state.people), phase: 'charging' }; }
  function setPeople(state, people) { const n = clampPeople(people), max = maxHP(n); return { ...state, people: n, maxHP: max, hp: state.hp / state.maxHP * max }; }
  function attack(state, damage = 8) {
    if (state.phase !== 'falling') return state;
    const hp = Math.max(0, state.hp - Math.max(0, Number(damage) || 0));
    return { ...state, hp, phase: hp === 0 ? 'won' : state.phase };
  }
  function tick(state, delta) {
    if (!['charging', 'warning', 'falling'].includes(state.phase)) return state;
    const elapsed = state.elapsed + Math.max(0, Number(delta) || 0);
    const progress = Math.min(1, Math.max(0, (elapsed - PREPARATION) / DURATIONS.falling));
    return { ...state, elapsed, progress, phase: progress === 1 ? 'escaped' : elapsed >= PREPARATION ? 'falling' : elapsed >= DURATIONS.charging ? 'warning' : 'charging' };
  }
  function displayedHP(state) {
    if (state.phase !== 'charging') return Math.ceil(state.hp);
    const t = Math.min(1, Math.max(0, state.elapsed / DURATIONS.charging));
    return Math.ceil(state.maxHP * t * t * (3 - 2 * t));
  }
  const api = { trigger, create, start, setPeople, attack, tick, maxHP, displayedHP, DURATIONS, PREPARATION, TOTAL };
  root.HataPunchEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
