/* SPDX-License-Identifier: AGPL-3.0-only */
'use strict';
(() => {
 const swaps = new WeakMap();
 const disclosures = new WeakMap();
 const dialogs = new WeakMap();
 const enhanced = new WeakSet();
 const active = new Set();
 const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
 const timing = { duration: 260, easing: 'cubic-bezier(.22, .75, .25, 1)', fill: 'both' };
 const canAnimate = (element) => !preference?.matches && typeof element?.animate === 'function';
 const focusElement = (element) => {
  if (element && element.isConnected && !element.closest('[hidden], [inert]')) element.focus({ preventScroll: true });
 };
 function preserveStyles(element, names) {
  const values = names.map((name) => [name, element.style.getPropertyValue(name), element.style.getPropertyPriority(name)]);
  return () => values.forEach(([name, value, priority]) => {
   if (value) element.style.setProperty(name, value, priority); else element.style.removeProperty(name);
  });
 }
 function preserveAttribute(element, name) {
  const value = element.getAttribute(name);
  return () => value === null ? element.removeAttribute(name) : element.setAttribute(name, value);
 }
 // Every request owns its completion. Cancelled requests cannot alter the latest state.
 function operation(map, element, cleanup, commit) {
  let resolve;
  let finished = false;
  const promise = new Promise((done) => { resolve = done; });
  const state = {
   promise,
   animations: [],
   finish(success) {
    if (finished) return;
    finished = true;
    state.animations.forEach((animation) => animation.cancel());
    cleanup();
    if (map.get(element) === state) {
     map.delete(element);
     if (success) commit();
    }
    active.delete(state);
    resolve(success);
   },
   play(jobs) {
    try {
     jobs.forEach(([target, frames]) => state.animations.push(target.animate(frames, timing)));
     Promise.all(state.animations.map((animation) => animation.finished)).then(
      () => state.finish(true), () => state.finish(false),
     );
    } catch {
     state.finish(true);
    }
   },
  };
  map.set(element, state);
  active.add(state);
  return state;
 }
 const reduceMotion = () => {
  if (preference.matches) [...active].forEach((state) => state.finish(true));
 };
 if (preference?.addEventListener) preference.addEventListener('change', reduceMotion);
 else preference?.addListener?.(reduceMotion);

 function swap(from, to, { focus = null, scrollToTop = false } = {}) {
  if (!to) return Promise.resolve(false);
  const wrapper = to.parentElement;
  const previous = wrapper && swaps.get(wrapper);
  const startHeight = wrapper?.getBoundingClientRect().height;
  previous?.finish(false);
  // A third destination can interrupt a crossfade while both old panels are visible.
  previous?.panels.forEach((panel) => { if (panel !== from && panel !== to) panel.hidden = true; });
  const commit = () => {
   if (from && from !== to) from.hidden = true;
   to.hidden = false;
   focusElement(focus);
   if (scrollToTop) window.scrollTo({ top: 0, behavior: 'instant' });
  };
  if (!wrapper || !from || from === to || from.parentElement !== wrapper || !canAnimate(to)) {
   commit();
   return Promise.resolve(true);
  }
  const restores = [
   preserveStyles(wrapper, ['height', 'position', 'box-sizing']),
   preserveStyles(from, ['position', 'inset', 'width']),
   preserveAttribute(from, 'inert'), preserveAttribute(from, 'aria-hidden'),
   preserveAttribute(to, 'inert'), preserveAttribute(to, 'aria-hidden'),
  ];
  const wrapperStyle = window.getComputedStyle(wrapper);
  if (wrapperStyle.position === 'static') wrapper.style.position = 'relative';
  // Only the outgoing panel participates in layout while its coordinates are read.
  // Cancelling a reversed crossfade otherwise leaves both panels in normal flow.
  previous?.panels.forEach((panel) => { if (panel !== from) panel.hidden = true; });
  from.hidden = false;
  to.hidden = true;
  const outgoingTop = from.offsetTop;
  const outgoingLeft = from.offsetLeft;
  const outgoingWidth = from.getBoundingClientRect().width;
  to.hidden = false;
  from.setAttribute('inert', '');
  from.setAttribute('aria-hidden', 'true');
  to.removeAttribute('inert');
  to.removeAttribute('aria-hidden');
  from.style.position = 'absolute';
  from.style.inset = `${outgoingTop}px auto auto ${outgoingLeft}px`;
  from.style.width = `${outgoingWidth}px`;
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.height = 'auto';
  const endHeight = wrapper.getBoundingClientRect().height;
  wrapper.style.height = `${startHeight}px`;
  const state = operation(swaps, wrapper, () => restores.forEach((restore) => restore()), commit);
  state.panels = [from, to];
  // Overflow stays visible so focus outlines and panel shadows are not cropped.
  state.play([
   [wrapper, [{ height: `${startHeight}px` }, { height: `${endHeight}px` }]],
   [from, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-6px)' }]],
   [to, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }]],
  ]);
  return state.promise;
 }

 function setExpanded(details, expanded) {
  if (!details) return Promise.resolve(false);
  expanded = Boolean(expanded);
  const summary = details.querySelector('summary');
  const startHeight = details.getBoundingClientRect().height;
  const previous = disclosures.get(details);
  previous?.finish(false);
  if (!expanded && details.contains(document.activeElement) && !summary?.contains(document.activeElement)) focusElement(summary);
  const commit = () => {
   details.open = expanded;
   summary?.setAttribute('aria-expanded', String(expanded));
  };
  if (!summary || !canAnimate(details) || (!previous && details.open === expanded)) {
   commit();
   return Promise.resolve(true);
  }
  const restoreStyle = preserveStyles(details, ['height', 'overflow', 'box-sizing']);
  // Measure native open/closed sizes in one task; the temporary state never paints.
  details.open = expanded;
  const endHeight = details.getBoundingClientRect().height;
  details.open = true;
  summary.setAttribute('aria-expanded', String(expanded));
  const content = [...details.children].filter((child) => child !== summary);
  const restoreContent = content.map((child) => preserveAttribute(child, 'inert'));
  if (!expanded) content.forEach((child) => child.setAttribute('inert', ''));
  details.style.boxSizing = 'border-box';
  details.style.height = `${startHeight}px`;
  details.style.overflow = 'hidden';
  const state = operation(disclosures, details, () => {
   restoreStyle();
   restoreContent.forEach((restore) => restore());
  }, commit);
  state.expanded = expanded;
  state.play([[details, [{ height: `${startHeight}px` }, { height: `${endHeight}px` }]]]);
  return state.promise;
 }

 function enhanceDetails(root = document) {
  root.querySelectorAll('details:not([data-managed-details])').forEach((details) => {
   const summary = details.querySelector('summary');
   if (!summary || enhanced.has(details)) return;
   enhanced.add(details);
   summary.setAttribute('aria-expanded', String(details.open));
   summary.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.target.closest('a, button, input, select, textarea')) return;
    event.preventDefault();
    const state = disclosures.get(details);
    setExpanded(details, !(state ? state.expanded : details.open));
   });
  });
 }

 function openDialog(dialog, { focus = null } = {}) {
  if (!dialog) return Promise.resolve(false);
  const previous = dialogs.get(dialog);
  const wasOpen = dialog.open;
  const currentStyle = previous && wasOpen ? window.getComputedStyle(dialog) : null;
  const start = currentStyle ? { opacity: currentStyle.opacity, transform: currentStyle.transform } : { opacity: 0, transform: 'translateY(8px) scale(.98)' };
  previous?.finish(false);
  if (!dialog.open) dialog.showModal();
  const commit = () => focusElement(focus);
  if (!canAnimate(dialog) || (wasOpen && !previous)) {
   commit();
   return Promise.resolve(true);
  }
  const state = operation(dialogs, dialog, () => {}, commit);
  state.play([[dialog, [
   start,
   { opacity: 1, transform: 'translateY(0) scale(1)' },
  ]]]);
  return state.promise;
 }

 function closeDialog(dialog) {
  if (!dialog) return Promise.resolve(false);
  const currentStyle = dialog.open ? window.getComputedStyle(dialog) : null;
  const opacity = currentStyle?.opacity ?? '1';
  const transform = currentStyle?.transform ?? 'none';
  dialogs.get(dialog)?.finish(false);
  if (!dialog.open) return Promise.resolve(true);
  const commit = () => { if (dialog.open) dialog.close(); };
  if (!canAnimate(dialog)) {
   commit();
   return Promise.resolve(true);
  }
  const state = operation(dialogs, dialog, () => {}, commit);
  state.play([[dialog, [
   { opacity, transform }, { opacity: 0, transform: 'translateY(6px) scale(.98)' },
  ]]]);
  return state.promise;
 }

 window.RegistrationMotion = { swap, setExpanded, enhanceDetails, openDialog, closeDialog };
})();
