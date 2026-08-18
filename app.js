import { FEATURE_001 } from './feature-registry.js';

const validRealities = ['past', 'present', 'future'];
const horizonByPort = new Map(FEATURE_001.horizons.map((h) => [String(h.port), h.id]));
const initial = new URLSearchParams(location.search);
const state = {
  reality: validRealities.includes(initial.get('reality')) ? initial.get('reality') : 'present',
  horizonId: horizonByPort.get(initial.get('horizon')) || 'owner'
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function selectedHorizon() {
  return FEATURE_001.horizons.find((h) => h.id === state.horizonId) || FEATURE_001.horizons[1];
}

function transition(update) {
  if (document.startViewTransition && !reducedMotion.matches) return document.startViewTransition(update);
  update();
  return null;
}

function syncUrl() {
  const h = selectedHorizon();
  const url = new URL(location.href);
  url.searchParams.set('horizon', String(h.port));
  url.searchParams.set('reality', state.reality);
  history.replaceState(null, '', url);
  $('#state-uri').textContent = `${url.search}${url.hash}`;
}

function renderReality() {
  $$('[data-reality]').forEach((button) => {
    const active = button.dataset.reality === state.reality;
    button.setAttribute('aria-checked', String(active));
    button.tabIndex = active ? 0 : -1;
    button.classList.toggle('is-active', active);
  });
  $('#reality-copy').textContent = FEATURE_001.realities[state.reality];
}

function renderHorizon() {
  const h = selectedHorizon();
  $('#spatial-canvas').dataset.selected = h.id;
  $$('[data-horizon-id]').forEach((button) => {
    const active = button.dataset.horizonId === h.id;
    button.setAttribute('aria-checked', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  $('#selected-kicker').textContent = `${h.short} HORIZON · PORT ${h.port}`;
  $('#selected-title').textContent = h.name;
  $('#selected-purpose').textContent = h.purpose;
  $('#selected-audience').textContent = h.audience;
  $('#selected-capability').textContent = h.capabilityPolicy;
  $('#selected-public').textContent = h.publicExposure;
  $('#selected-authority').textContent = h.releaseAuthority;
  $('#selected-boundary').textContent = h.boundary;
}

function render() {
  transition(() => {
    renderReality();
    renderHorizon();
    syncUrl();
  });
}

function selectHorizon(id, focus = false) {
  if (!FEATURE_001.horizons.some((h) => h.id === id)) return;
  state.horizonId = id;
  render();
  if (focus) $(`[data-horizon-id="${id}"]`)?.focus({ preventScroll: true });
}

function selectReality(id, focus = false) {
  if (!validRealities.includes(id)) return;
  state.reality = id;
  render();
  if (focus) $(`[data-reality="${id}"]`)?.focus({ preventScroll: true });
}

function move(current, list, key) {
  let i = list.indexOf(current);
  if (key === 'Home') i = 0;
  else if (key === 'End') i = list.length - 1;
  else if (key === 'ArrowLeft' || key === 'ArrowUp') i = (i - 1 + list.length) % list.length;
  else i = (i + 1) % list.length;
  return list[i];
}

function bindRadioGroup(selector, currentValue, select) {
  const values = $$(selector).map((b) => b.dataset.horizonId || b.dataset.reality);
  $$(selector).forEach((button) => {
    button.addEventListener('click', () => select(button.dataset.horizonId || button.dataset.reality));
    button.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      select(move(currentValue(), values, event.key), true);
    });
  });
}

bindRadioGroup('[data-horizon-id]', () => state.horizonId, selectHorizon);
bindRadioGroup('[data-reality]', () => state.reality, selectReality);
render();
