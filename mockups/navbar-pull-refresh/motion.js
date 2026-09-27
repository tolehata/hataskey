/* SPDX-License-Identifier: AGPL-3.0-only */
(() => {
	'use strict';
	const limit = 110;
	const threshold = 120;
	const stretch = distance => limit * (1 - Math.exp(-Math.max(0, distance) / 155));
	const clamp = value => Math.max(0, Math.min(1, value));
	const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
	const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
	const reducedControl = document.querySelector('#reduced');
	const reduced = () => systemMotion.matches || reducedControl.checked;

	// The mock has one notice slot. Pull feedback temporarily owns the whole nav;
	// received data stays in this model rather than being discarded with its view.
	class NoticeSlot {
		constructor(root) {
			this.root = root;
			this.element = root.querySelector('.notice');
			this.pending = 3;
			this.rss = false;
			this.action = null;
			this.voteUntil = 0;
			this.frozen = false;
			this.timer = 0;
			this.last = performance.now();
			this.currentKey = '';
			root.querySelectorAll('button[data-event]').forEach(button => button.addEventListener('click', () => this.receive(button.dataset.event)));
			this.render();
		}

		accountTime() {
			const now = performance.now();
			if (!this.frozen && this.currentKey.startsWith('action:') && this.action) this.action.remaining -= now - this.last;
			this.last = now;
			if (this.action && this.action.remaining <= 0) this.action = null;
			if (this.voteUntil <= now) this.voteUntil = 0;
		}

		freeze(value) {
			this.accountTime();
			this.frozen = value;
			this.render();
		}

		receive(event) {
			this.accountTime();
			if (event === 'new') this.pending += 3;
			if (event === 'favorite') this.action = { text: 'お気に入りに登録しました', icon: 'i-star', remaining: 4000 };
			if (event === 'clock') this.action = { text: '15時です。ひと息つきませんか', icon: 'i-clock', remaining: 4000 };
			if (event === 'vote') this.voteUntil = performance.now() + 8000;
			if (event === 'rss') this.rss = !this.rss;
			if (event === 'clear') { this.pending = 0; this.action = null; this.voteUntil = 0; }
			this.render();
		}

		consume(count) {
			this.pending = Math.max(0, this.pending - count);
			this.render();
		}

		render() {
			clearTimeout(this.timer);
			this.accountTime();
			const status = this.root.querySelector('.overlap-status');
			if (status) status.textContent = `${this.frozen ? '更新案内を優先 · ' : ''}新着 ${this.pending}件${this.action ? ' · 操作通知あり' : ''}${this.voteUntil ? ' · 投票受付中' : ''}${this.rss ? ' · RSS待機' : ''}`;
			if (this.frozen) return;
			let kind = '', text = '', icon = '';
			if (this.voteUntil) { kind = 'vote'; text = '絵文字投票 · ただいま受付中'; icon = 'i-smile'; }
			else if (this.action) { kind = 'action'; text = this.action.text; icon = this.action.icon; }
			else if (this.pending) { kind = 'new'; text = `${this.pending}件の新しいノート`; icon = 'i-arrow'; }
			else if (this.rss) { kind = 'rss'; text = 'RSS　週末の小さな旅へ →'; icon = 'i-rss'; }
			const key = `${kind}:${text}`;
			if (key !== this.currentKey) {
				this.currentKey = key;
				this.root.dataset.noticeVisible = String(!!kind);
				this.element.hidden = !kind;
				this.element.dataset.notice = kind;
				this.element.setAttribute('aria-label', text);
				const group = document.createElement('span');
				group.className = 'notice-content';
				const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				svg.setAttribute('class', 'icon');
				svg.setAttribute('viewBox', '0 0 24 24');
				svg.setAttribute('aria-hidden', 'true');
				const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
				use.setAttribute('href', `#${icon}`);
				svg.append(use);
				group.append(svg);
				if (kind === 'new') {
					// Preserve the existing visual sample's overlapping avatars.
					if (!this.avatars) this.avatars = this.element.querySelector('.notice-avatars')?.cloneNode(true);
					if (this.avatars) group.append(this.avatars.cloneNode(true));
				}
				const label = document.createElement('span');
				label.textContent = text;
				group.append(label);
				this.element.replaceChildren(group);
			}
			const delay = this.voteUntil ? this.voteUntil - performance.now() : this.action?.remaining;
			if (delay > 0) this.timer = setTimeout(() => this.render(), delay + 20);
		}
	}

	class PullPreview {
		constructor(root) {
			this.root = root;
			this.surface = root.querySelector('.gesture-surface');
			this.nav = root.querySelector('.nav-shell');
			this.content = root.querySelector('.nav-content');
			this.label = root.querySelector('.pull-label');
			this.result = root.querySelector('.result');
			this.range = root.querySelector('[data-action="scrub"]');
			this.height = 0;
			this.raw = 0;
			this.frame = 0;
			this.timer = 0;
			this.count = 0;
			this.state = 'idle';
			this.gesture = null;
			this.events = [];
			this.notices = new NoticeSlot(root);
			this.suppressClickUntil = 0;
			this.draw(0);
			root.querySelector('[data-action="demo"]').addEventListener('click', () => this.demo(190));
			root.querySelector('[data-action="cancel"]').addEventListener('click', () => this.demo(68));
			root.querySelector('[data-action="release"]').addEventListener('click', () => this.release());
			this.range.addEventListener('input', () => {
				if (this.state === 'refreshing') return;
				this.stop();
				this.pull(Number(this.range.value));
			});
			this.surface.addEventListener('pointerdown', event => {
				if (event.pointerType === 'touch' || event.button !== 0) return;
				if (this.start(event.clientX, event.clientY, event.target, event.pointerId)) this.surface.setPointerCapture(event.pointerId);
			});
			this.surface.addEventListener('pointermove', event => {
				if (event.pointerType !== 'touch') this.move(event.clientX, event.clientY, event);
			});
			this.surface.addEventListener('pointerup', event => {
				if (event.pointerType !== 'touch') this.end(false);
			});
			this.surface.addEventListener('pointercancel', () => this.end(true));
			this.surface.addEventListener('lostpointercapture', () => this.end(true));
			this.surface.addEventListener('touchstart', event => {
				if (event.touches.length !== 1) { this.end(true); return; }
				const touch = event.touches[0];
				this.start(touch.clientX, touch.clientY, event.target, null);
			}, { passive: true });
			this.surface.addEventListener('touchmove', event => {
				if (event.touches.length !== 1) { this.end(true); return; }
				const touch = event.touches[0];
				this.move(touch.clientX, touch.clientY, event);
			}, { passive: false });
			this.surface.addEventListener('touchend', () => this.end(false), { passive: true });
			this.surface.addEventListener('touchcancel', () => this.end(true), { passive: true });
			this.surface.addEventListener('click', event => {
				if (performance.now() < this.suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
			}, true);
			this.content.querySelectorAll('nav button[data-tab]').forEach(button => button.addEventListener('click', () => {
				this.content.querySelectorAll('nav button[data-tab]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
			}));
		}

		stop() {
			cancelAnimationFrame(this.frame);
			clearTimeout(this.timer);
			this.frame = 0;
			this.timer = 0;
		}

		setState(state) {
			const previous = this.state;
			this.state = state;
			this.root.dataset.state = state;
			this.surface.setAttribute('aria-busy', String(state === 'refreshing'));
			this.root.querySelector('.screen').setAttribute('aria-busy', String(state === 'refreshing'));
			this.root.querySelectorAll('[data-action]').forEach(control => { control.disabled = state === 'refreshing'; });
			if (state !== previous) this.notices.freeze(state !== 'idle');
			if (previous === 'idle' && (state === 'pulling' || state === 'ready') && this.root.querySelector('[data-event="auto"]')?.checked) {
				for (const [delay, event] of [[380, 'new'], [620, 'favorite'], [900, 'clock'], [1600, 'new']]) {
					this.events.push(setTimeout(() => this.notices.receive(event), delay));
				}
			}
		}

		draw(height) {
			this.height = Math.max(0, height);
			const fade = smooth((this.height - 3) / 54);
			this.nav.style.setProperty('--pull', `${this.height.toFixed(2)}px`);
			this.nav.style.setProperty('--nav-opacity', String(1 - fade));
			this.nav.style.setProperty('--prompt-opacity', String(smooth((this.height - 15) / 40)));
			this.nav.style.setProperty('--nav-shift', `${-4 * fade}px`);
			this.nav.style.setProperty('--turn', `${Math.min(1, this.height / stretch(threshold)) * 180}deg`);
			this.content.inert = this.height > 8;
			this.content.setAttribute('aria-hidden', String(this.height > 8));
		}

		pull(raw) {
			this.raw = Math.min(600, Math.max(0, raw));
			this.setState(this.raw >= threshold ? 'ready' : 'pulling');
			const text = this.raw >= threshold ? '離して更新' : '引っ張ってリロード';
			if (this.label.textContent !== text) this.label.textContent = text;
			this.range.value = String(Math.min(220, this.raw));
			this.range.setAttribute('aria-valuetext', this.label.textContent);
			this.draw(stretch(this.raw));
		}

		start(x, y, target, pointerId) {
			if (this.state === 'refreshing' || this.surface.scrollTop > 1 || target.closest('button, a, input, select, textarea')) return false;
			this.gesture = { x, y, pointerId, locked: false };
			return true;
		}

		move(x, y, event) {
			const gesture = this.gesture;
			if (!gesture) return;
			const dy = y - gesture.y;
			const dx = x - gesture.x;
			if (!gesture.locked) {
				if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
				if (dy <= 0 || Math.abs(dx) > dy || this.surface.scrollTop > 1) { this.gesture = null; return; }
				this.stop();
				gesture.locked = true;
				this.result.textContent = 'そのまま下へ引っ張って、離してください';
			}
			if (event.cancelable) event.preventDefault();
			this.pull(dy);
		}

		end(cancel) {
			const gesture = this.gesture;
			if (!gesture) return;
			this.gesture = null;
			if (gesture.pointerId !== null && this.surface.hasPointerCapture(gesture.pointerId)) this.surface.releasePointerCapture(gesture.pointerId);
			if (gesture.locked) {
				this.suppressClickUntil = performance.now() + 300;
				this.release(cancel);
			}
		}

		settle(done) {
			let position = this.height;
			let velocity = 0;
			let last = performance.now();
			const began = last;
			const initial = position;
			const tick = now => {
				const dt = Math.min((now - last) / 1000, 0.025);
				last = now;
				if (reduced()) {
					position = initial * (1 - clamp((now - began) / 140));
				} else {
					// A soft, nearly critically damped spring: no repeated bouncing.
					velocity += (-205 * position - 26 * velocity) * dt;
					position += velocity * dt;
				}
				this.draw(position);
				if ((Math.abs(position) < 0.12 && Math.abs(velocity) < 2) || now - began > 1100) {
					this.draw(0);
					this.frame = 0;
					done();
				} else this.frame = requestAnimationFrame(tick);
			};
			this.frame = requestAnimationFrame(tick);
		}

		release(cancel = false) {
			if (this.state === 'refreshing' || (this.state === 'idle' && this.height === 0)) return;
			this.stop();
			const shouldRefresh = !cancel && this.raw >= threshold;
			const refreshCount = this.notices.pending;
			this.raw = 0;
			this.range.value = '0';
			this.range.setAttribute('aria-valuetext', '引っ張ってリロード');
			this.setState(shouldRefresh ? 'refreshing' : 'returning');
			this.label.textContent = shouldRefresh ? '更新しています' : '引っ張ってリロード';
			this.result.textContent = shouldRefresh ? 'タイムラインを更新中…' : '更新せずに戻ります';
			this.settle(() => {
				if (!shouldRefresh) { this.setState('idle'); this.result.textContent = '短いスワイプでは更新しません'; }
			});
			if (shouldRefresh) this.timer = setTimeout(() => {
				// Do not consume notes that arrived after this refresh began.
				this.notices.consume(refreshCount);
				this.count++;
				const note = this.root.querySelector('.note-list > :first-child').cloneNode(true);
				note.classList.add('fresh-note');
				const text = note.querySelector('.note-text');
				if (text) text.textContent = ['おかえりなさい。新しいノートが届きました。', 'ひと呼吸して、タイムラインをもう一度。', 'ゆっくり流れる日曜日。'][ (this.count - 1) % 3 ];
				const time = note.querySelector('time');
				if (time) time.textContent = 'たった今';
				this.root.querySelector('.note-list').prepend(note);
				if (this.root.querySelector('.note-list').children.length > 12) this.root.querySelector('.note-list').lastElementChild.remove();
				this.setState('idle');
				this.result.textContent = `更新しました · ${this.count}回目（モック）`;
				this.timer = 0;
			}, 1150);
		}

		demo(distance) {
			if (this.state === 'refreshing') return;
			this.reset();
			this.surface.scrollTop = 0;
			this.result.textContent = '引っ張る → 離す、を再生中';
			const began = performance.now();
			const duration = reduced() ? 180 : 1000;
			const tick = now => {
				const progress = clamp((now - began) / duration);
				this.pull(distance * smooth(progress));
				if (progress < 1) this.frame = requestAnimationFrame(tick);
				else { this.frame = 0; this.timer = setTimeout(() => this.release(), reduced() ? 150 : 420); }
			};
			this.frame = requestAnimationFrame(tick);
		}

		reset() {
			this.stop();
			this.events.forEach(clearTimeout);
			this.events = [];
			const gesture = this.gesture;
			this.gesture = null;
			if (gesture?.pointerId != null && this.surface.hasPointerCapture(gesture.pointerId)) this.surface.releasePointerCapture(gesture.pointerId);
			this.raw = 0;
			this.range.value = '0';
			this.range.setAttribute('aria-valuetext', '引っ張ってリロード');
			this.draw(0);
			this.setState('idle');
			this.notices.freeze(false);
			this.label.textContent = '引っ張ってリロード';
			this.result.textContent = 'タイムラインの先頭から下へ引っ張ってください';
		}
	}

	const previews = [...document.querySelectorAll('.preview')].map(root => new PullPreview(root));
	const updateMotion = () => {
		document.body.dataset.motion = reduced() ? 'reduced' : 'full';
		previews.forEach(preview => preview.reset());
	};
	reducedControl.addEventListener('change', updateMotion);
	systemMotion.addEventListener('change', updateMotion);
	document.querySelector('#theme').addEventListener('change', event => { document.body.dataset.theme = event.target.value; });
	document.querySelector('#size').addEventListener('change', event => {
		document.body.dataset.size = event.target.value;
		previews.forEach(preview => preview.reset());
	});
	window.addEventListener('blur', () => previews.forEach(preview => preview.end(true)));
	document.addEventListener('visibilitychange', () => { if (document.hidden) previews.forEach(preview => preview.reset()); });
	updateMotion();
})();
