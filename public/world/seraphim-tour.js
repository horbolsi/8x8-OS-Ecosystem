const steps = Object.freeze([
  {
    id: 'truth',
    title: 'Start with the truth state',
    body: 'This protected beta has zero live users, no coordinate upload, no wallet signing and no private-core connection.',
    target: '.status-strip'
  },
  {
    id: 'movement',
    title: 'Move without surrendering privacy',
    body: 'Use keyboard, touch controls or optional local sensors. Permission requests require an explicit action and sensor data stays in this browser session.',
    target: '.controls-panel'
  },
  {
    id: 'world',
    title: 'Explore the synthetic world field',
    body: 'The movement field and service beacons are public-safe fixtures. They are not remote players, precise people locations or live infrastructure.',
    target: '.world-stage'
  },
  {
    id: 'presence',
    title: 'Choose temporary synthetic presence',
    body: 'The presence preview is off by default, uses coarse zones only and expires automatically after the selected duration.',
    target: '.presence-consent-card'
  },
  {
    id: 'portals',
    title: 'Review governed product portals',
    body: '8x8Scan, marketplace, missions and plugins are evidence-gated previews. Execution, payments and private-system access remain disabled.',
    target: '.dashboard-grid'
  }
]);

function element(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.id) node.id = options.id;
  if (options.className) node.className = options.className;
  if (options.text) node.textContent = options.text;
  for (const [name, value] of Object.entries(options.attrs || {})) node.setAttribute(name, value);
  return node;
}

const style = element('link', { attrs: { rel: 'stylesheet', href: '/world/seraphim-tour.css' } });
document.head.append(style);

const welcome = document.querySelector('.welcome');
const trigger = element('button', {
  id: 'seraphimTourButton',
  className: 'seraphim-tour-trigger',
  text: 'Start guided tour',
  attrs: { type: 'button', 'aria-haspopup': 'dialog', 'aria-controls': 'seraphimTourDialog' }
});
welcome?.querySelector('div:nth-child(2)')?.append(trigger);

const dialog = element('dialog', {
  id: 'seraphimTourDialog',
  className: 'seraphim-tour-dialog',
  attrs: { 'aria-labelledby': 'seraphimTourTitle', 'aria-describedby': 'seraphimTourBody' }
});
const closeButton = element('button', { id: 'seraphimTourClose', text: 'Close tour', attrs: { type: 'button' } });
const eyebrow = element('p', { className: 'eyebrow', text: 'SERAPHIM PUBLIC GUIDE' });
const progress = element('p', { id: 'seraphimTourProgress', className: 'seraphim-tour-progress', attrs: { 'aria-live': 'polite' } });
const title = element('h2', { id: 'seraphimTourTitle' });
const body = element('p', { id: 'seraphimTourBody' });
const boundary = element('p', {
  className: 'seraphim-tour-boundary',
  text: 'Text-only, rights-cleared guide fixture. No identity lookup, tracking, persistence, network transmission, camera, microphone, wallet or payment access.'
});
const actions = element('div', { className: 'seraphim-tour-actions' });
const previousButton = element('button', { id: 'seraphimTourPrevious', text: 'Previous', attrs: { type: 'button' } });
const nextButton = element('button', { id: 'seraphimTourNext', text: 'Next', attrs: { type: 'button' } });
actions.append(previousButton, nextButton, closeButton);
dialog.append(eyebrow, progress, title, body, boundary, actions);
document.body.append(dialog);

let index = 0;
let highlighted = null;

function clearHighlight() {
  if (highlighted) highlighted.removeAttribute('data-seraphim-tour-target');
  highlighted = null;
}

function renderStep() {
  const step = steps[index];
  progress.textContent = `Step ${index + 1} of ${steps.length}`;
  title.textContent = step.title;
  body.textContent = step.body;
  previousButton.disabled = index === 0;
  nextButton.textContent = index === steps.length - 1 ? 'Finish' : 'Next';
  clearHighlight();
  highlighted = document.querySelector(step.target);
  if (highlighted) {
    highlighted.setAttribute('data-seraphim-tour-target', 'true');
    highlighted.scrollIntoView({ block: 'center', behavior: 'auto' });
  }
}

function closeTour() {
  clearHighlight();
  if (dialog.open) dialog.close();
}

trigger.addEventListener('click', () => {
  index = 0;
  renderStep();
  dialog.showModal();
});
previousButton.addEventListener('click', () => {
  if (index > 0) index -= 1;
  renderStep();
});
nextButton.addEventListener('click', () => {
  if (index === steps.length - 1) closeTour();
  else {
    index += 1;
    renderStep();
  }
});
closeButton.addEventListener('click', closeTour);
dialog.addEventListener('cancel', () => clearHighlight());
dialog.addEventListener('close', () => {
  clearHighlight();
  trigger.focus();
});
