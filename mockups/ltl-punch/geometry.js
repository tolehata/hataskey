// SPDX-License-Identifier: AGPL-3.0-only
(function (root) {
  'use strict';
  function position(height, size, progress, phase, reduced = false) {
    const p = Math.max(0, Math.min(1, progress));
    const movingTip = p <= .025 ? -40 + 88 * (p / .025) : 48 + (height - 48) * ((p - .025) / .975);
    const tip = ['idle','charging','warning'].includes(phase) ? -40 : reduced ? height * .42 : movingTip;
    return { tip, top: tip - size, size };
  }
  function damage(top, height, tip) {
    if (tip < top) return 0;
    if (tip < top + height * .4) return 1;
    if (tip < top + height) return 2;
    return 3;
  }
  function rubble(top, stageHeight, index) {
    return { x: (index % 2 ? 1 : -1) * (78 + index % 3 * 17), y: stageHeight - top - 80 + index % 3 * 13, angle: (index % 2 ? 1 : -1) * (18 + index % 3 * 4) };
  }
  const api = { position, damage, rubble };
  root.HataPunchGeometry = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
