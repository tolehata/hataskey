// SPDX-FileCopyrightText: Tolehata and hatasaba-project
// SPDX-License-Identifier: AGPL-3.0-only
const body = document.body;
const liveNote = document.getElementById('live-note');
const badge = liveNote.querySelector('.badge');
const status = document.getElementById('status');
let demoTimer = null;

const stateNames = { flashing: '挑戦中', failed: '失敗', success: '成功' };
const badgeNames = { flashing: '', failed: '失敗...', success: '成功' };

function setState(state) {
  if (demoTimer !== null) {
    clearTimeout(demoTimer);
    demoTimer = null;
  }
  liveNote.dataset.utageState = state;
  liveNote.setAttribute('aria-label', `先頭ノート: ${stateNames[state]}の宴ノート`);
  badge.textContent = badgeNames[state];
  status.textContent = `先頭ノートは${stateNames[state]}です`;
  document.querySelectorAll('[data-state-choice]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.stateChoice === state));
  });
}

document.querySelectorAll('[data-state-choice]').forEach(button => {
  button.addEventListener('click', () => setState(button.dataset.stateChoice));
});

document.querySelectorAll('[data-demo]').forEach(button => {
  button.addEventListener('click', () => {
    const result = button.dataset.demo;
    setState('flashing');
    status.textContent = `挑戦中です。まもなく${stateNames[result]}の表示に切り替わります`;
    demoTimer = setTimeout(() => setState(result), 3500);
  });
});

for (const key of ['theme', 'layout', 'bubble']) {
  document.getElementById(key).addEventListener('change', event => {
    body.dataset[key] = event.target.value;
  });
}

document.getElementById('reduced').addEventListener('change', event => {
  body.dataset.motion = event.target.checked ? 'reduced' : 'full';
});
