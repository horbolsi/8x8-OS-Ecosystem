const state = await fetch('/scan/state.json', { cache: 'no-store' }).then((response) => {
  if (!response.ok) throw new Error('STATE_UNAVAILABLE');
  return response.json();
});

const viewMode = document.querySelector('#viewMode');
const filter = document.querySelector('#filter');
const reset = document.querySelector('#reset');
const records = document.querySelector('#records');
const listTitle = document.querySelector('#listTitle');
const resultSummary = document.querySelector('#resultSummary');
const detailTitle = document.querySelector('#detailTitle');
const details = document.querySelector('#details');
document.querySelector('#deploymentCount').textContent = String(state.truth.testnet_deployments);

function addFact(label, value) {
  const term = document.createElement('dt');
  term.textContent = label;
  const description = document.createElement('dd');
  description.textContent = value ?? 'UNRESOLVED';
  details.append(term, description);
}

function inspect(record, kind) {
  details.replaceChildren();
  detailTitle.textContent = kind === 'assets' ? `${record.symbol} · ${record.name}` : record.label;
  if (kind === 'assets') {
    addFact('Symbol', record.symbol);
    addFact('Canonical supply', record.supply);
    addFact('State', record.status);
    addFact('Execution', 'DISABLED');
  } else {
    addFact('Network ID', record.id);
    addFact('Environment', record.environment);
    addFact('State', record.state);
    addFact('Live query', 'OFF');
  }
}

function render() {
  const kind = viewMode.value;
  const query = filter.value.trim().toLowerCase();
  const source = state[kind];
  const shown = source.filter((item) => JSON.stringify(item).toLowerCase().includes(query));
  records.replaceChildren();
  listTitle.textContent = kind === 'assets' ? 'Assets' : 'Networks';
  resultSummary.textContent = `${shown.length} of ${source.length} ${kind} shown.`;
  for (const item of shown) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'record';
    const identity = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = kind === 'assets' ? `${item.symbol} · ${item.name}` : item.label;
    const subtitle = document.createElement('small');
    subtitle.textContent = kind === 'assets' ? `Supply: ${item.supply ?? 'UNRESOLVED'}` : `${item.environment} · live query off`;
    identity.append(title, subtitle);
    const status = document.createElement('span');
    status.className = 'status';
    status.textContent = kind === 'assets' ? item.status : item.state;
    button.append(identity, status);
    button.addEventListener('click', () => inspect(item, kind));
    records.append(button);
  }
}

viewMode.addEventListener('change', render);
filter.addEventListener('input', render);
reset.addEventListener('click', () => { viewMode.value = 'assets'; filter.value = ''; render(); filter.focus(); });
render();
