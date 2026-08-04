const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const zoomLevels = [55, 65, 75, 88, 100, 110, 120, 135, 150, 165, 180];
const worldPositions = [[50,12],[77,25],[87,51],[74,77],[50,87],[26,77],[13,51],[23,25]];
const nodePositions = [[50,31],[64,41],[64,60],[50,69],[36,60],[36,41]];
const state = { data: null, zoomIndex: 4, map: false, dragging: false, pointerX: 0, pointerY: 0, selected: null };
const colors = {
  GREEN: 'Healthy or release-ready in scope', CYAN: 'Verified information or read-only',
  YELLOW: 'Incomplete dependency', ORANGE: 'Degraded or review required',
  RED: 'Down or blocked', BLACK: 'Unknown, stale or hidden', PURPLE: 'Planned or experimental'
};

function safeToken(value) {
  return String(value ?? '').replace(/[^A-Za-z0-9_-]/g, '') || 'UNKNOWN';
}

function boundedPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) throw new Error('Invalid board coordinate');
  return numeric;
}

function createNode(tag, options = {}) {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = String(options.text);
  if (options.title !== undefined) element.title = String(options.title);
  for (const [name, value] of Object.entries(options.attributes || {})) element.setAttribute(name, String(value));
  for (const child of options.children || []) if (child) element.append(child);
  return element;
}

function replaceChildren(target, children) {
  target.replaceChildren(...children.filter(Boolean));
}

function labelledParagraph(label, value) {
  return createNode('p', { children: [createNode('b', { text: `${label}: ` }), document.createTextNode(String(value ?? ''))] });
}

function applyZoom() {
  const zoom = zoomLevels[state.zoomIndex];
  $('#board').dataset.zoom = String(zoom);
  $('#zoom').textContent = `${zoom}%`;
  $('#reset').textContent = `${zoom}%`;
}

function changeZoom(delta) {
  state.zoomIndex = Math.max(0, Math.min(zoomLevels.length - 1, state.zoomIndex + delta));
  applyZoom();
}

function resetView() {
  state.zoomIndex = 4;
  applyZoom();
  const viewport = $('#viewport');
  viewport.scrollTo({ left: Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2), top: Math.max(0, (viewport.scrollHeight - viewport.clientHeight) / 2) });
}

function addFact(fragment, label, value) {
  if (value === undefined || value === null || value === '') return;
  fragment.append(createNode('dt', { text: label }), createNode('dd', { text: value }));
}

function inspect(item, type) {
  if (!item || typeof item !== 'object') return;
  state.selected = { item, type };
  $('#title').textContent = item.label || item.id || 'Unknown record';
  $('#summary').textContent = item.summary || item.description || 'Public-safe record.';
  const fragment = document.createDocumentFragment();
  for (const [key, value] of Object.entries(item)) {
    if (['id', 'label', 'summary', 'description'].includes(key) || typeof value === 'object') continue;
    addFact(fragment, key, value);
  }
  $('#facts').replaceChildren(fragment);
  $('#evidence').disabled = false;
}

function render() {
  $('#truth').textContent = state.data.truth_banner;
  replaceChildren($('#legend'), Object.entries(colors).map(([color, description]) => createNode('div', {
    className: 'legend',
    children: [createNode('i', { className: safeToken(color) }), createNode('span', { children: [createNode('b', { text: color }), createNode('br'), document.createTextNode(description)] })]
  })));
  replaceChildren($('#worlds'), state.data.worlds.map((world, index) => {
    const [x, y] = worldPositions[index] || [50, 50];
    return createNode('button', {
      className: `world ${safeToken(world.status)}`,
      attributes: { 'data-world': world.id, 'data-position': index, 'data-x': boundedPercent(x), 'data-y': boundedPercent(y) },
      children: [createNode('b', { text: world.label }), createNode('small', { text: `${world.score}/100 • ${world.evidence}` })]
    });
  }));
  replaceChildren($('#nodes'), state.data.nodes.map((record, index) => {
    const positionIndex = index % nodePositions.length;
    const [x, y] = nodePositions[positionIndex];
    return createNode('button', {
      className: `node ${safeToken(record.status)}`,
      text: record.label.slice(0, 2).toUpperCase(),
      title: record.label,
      attributes: { 'data-node': record.id, 'data-position': positionIndex, 'data-x': boundedPercent(x), 'data-y': boundedPercent(y) }
    });
  }));
  replaceChildren($('#clusters'), state.data.presence_clusters.map((cluster, index) => createNode('button', {
    className: 'cluster',
    attributes: { 'data-cluster': cluster.label, 'data-position': index % 4, 'data-x': boundedPercent(cluster.x), 'data-y': boundedPercent(cluster.y), 'data-label': cluster.label, 'aria-label': `${cluster.label}, simulated, zero users` }
  })));
  replaceChildren($('#treasury'), [
    labelledParagraph('Status', state.data.treasury.status),
    labelledParagraph('Networks', state.data.treasury.networks.join(', ')),
    createNode('p', { children: [document.createTextNode('Balances: hidden / unavailable'), createNode('br'), document.createTextNode('Addresses: hidden / unavailable'), createNode('br'), document.createTextNode('Signing: disabled')] })
  ]);
  applyZoom();
}

function toggleMap() {
  state.map = !state.map;
  $('#mapLayer').hidden = !state.map;
  $('#worlds').hidden = state.map;
  $('#nodes').hidden = state.map;
  $('#map').setAttribute('aria-pressed', String(state.map));
  $('#mode').textContent = state.map ? 'GLOBAL MAP' : 'ART BOARD';
  state.zoomIndex = state.map ? 3 : 4;
  applyZoom();
}

function bindEvents() {
  $('#plus').addEventListener('click', () => changeZoom(1));
  $('#minus').addEventListener('click', () => changeZoom(-1));
  $('#reset').addEventListener('click', resetView);
  $('#map').addEventListener('click', toggleMap);
  $('#help').addEventListener('click', () => {
    $('#modalTitle').textContent = 'How to read the Art Board';
    $('#modalBody').textContent = 'Green means complete only inside the displayed release unit. The map contains simulated regions with zero users and no tracking.';
    $('#modal').showModal();
  });
  $('#close').addEventListener('click', () => $('#modal').close());
  $('#evidence').addEventListener('click', () => {
    if (!state.selected) return;
    $('#modalTitle').textContent = 'Public evidence record';
    $('#modalBody').textContent = JSON.stringify(state.selected, null, 2);
    $('#modal').showModal();
  });
  $('#filter').addEventListener('input', (event) => {
    const query = String(event.target.value ?? '').toLowerCase().trim();
    for (const [selector, records, key] of [['.world', state.data.worlds, 'world'], ['.node', state.data.nodes, 'node']]) {
      $$(selector).forEach((element) => {
        const record = records.find((item) => item.id === element.dataset[key]);
        element.hidden = Boolean(query && !JSON.stringify(record ?? {}).toLowerCase().includes(query));
      });
    }
  });
  $('#board').addEventListener('click', (event) => {
    const world = event.target.closest('[data-world]');
    const recordNode = event.target.closest('[data-node]');
    const cluster = event.target.closest('[data-cluster]');
    if (world) inspect(state.data.worlds.find((item) => item.id === world.dataset.world), 'world');
    if (recordNode) inspect(state.data.nodes.find((item) => item.id === recordNode.dataset.node), 'node');
    if (cluster) inspect({ label: cluster.dataset.cluster, status: 'CYAN', count: 0, mode: 'SIMULATED_REGION_ONLY' }, 'presence');
  });
  const viewport = $('#viewport');
  const stopDragging = () => { state.dragging = false; };
  viewport.addEventListener('pointerdown', (event) => {
    state.dragging = true; state.pointerX = event.clientX; state.pointerY = event.clientY; viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener('pointermove', (event) => {
    if (!state.dragging) return;
    viewport.scrollLeft -= event.clientX - state.pointerX;
    viewport.scrollTop -= event.clientY - state.pointerY;
    state.pointerX = event.clientX; state.pointerY = event.clientY;
  });
  viewport.addEventListener('pointerup', stopDragging);
  viewport.addEventListener('pointercancel', stopDragging);
  viewport.addEventListener('lostpointercapture', stopDragging);
  viewport.addEventListener('wheel', (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault(); changeZoom(event.deltaY < 0 ? 1 : -1);
  }, { passive: false });
  window.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key === '+' || event.key === '=') changeZoom(1);
    if (event.key === '-') changeZoom(-1);
    if (event.key === '0') resetView();
    if (event.key.toLowerCase() === 'm') toggleMap();
    if (event.key === 'Escape' && $('#modal').open) $('#modal').close();
  });
}

function renderFailure(error) {
  document.body.replaceChildren(createNode('main', {
    className: 'glass panel failure-panel',
    children: [createNode('h1', { text: 'Art Board blocked' }), createNode('p', { text: 'Public state validation failed. Nothing was rendered.' }), createNode('pre', { text: error instanceof Error ? error.message : 'Unknown error' })]
  }));
}

async function start() {
  try {
    const response = await fetch('/art-board/state.json', { cache: 'no-store', credentials: 'same-origin', redirect: 'error' });
    if (!response.ok || !(response.headers.get('content-type') || '').includes('json')) throw new Error('Invalid public state response');
    state.data = await response.json();
    if (state.data.schema_version !== '8x8.public-art-board.v1' || state.data.mode !== 'PUBLIC_SAFE_FIXTURE') throw new Error('Unsupported public state');
    if (state.data.score.earned !== 100 || state.data.score.possible !== 100 || state.data.score.whole_system_score !== 'NOT_INFERRED') throw new Error('Invalid release score');
    render(); bindEvents(); resetView();
  } catch (error) {
    renderFailure(error);
  }
}

start();
