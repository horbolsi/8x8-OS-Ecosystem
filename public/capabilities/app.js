(() => {
  'use strict';

  const state = { data: null, filter: 'ALL' };
  const byId = (id) => document.getElementById(id);

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }

  function evidenceText(value) {
    if (Array.isArray(value)) return value.join(', ');
    if (value && typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  function renderCard(candidate) {
    const article = node('article', undefined, 'card');
    article.dataset.status = candidate.status;
    const header = document.createElement('header');
    const identity = document.createElement('div');
    identity.append(node('h3', candidate.id), node('div', candidate.repository, 'repo'));
    const statusClass = ['READY_FOR_ADAPTER_DESIGN', 'ADAPTER_CONTRACT_MERGED'].includes(candidate.status) ? 'ready'
      : candidate.status === 'BLOCKED' ? 'blocked'
      : candidate.status === 'DEFERRED' ? 'deferred' : 'patterns';
    header.append(identity, node('span', candidate.status.replaceAll('_', ' '), `status ${statusClass}`));
    article.append(
      header,
      node('div', candidate.pin, 'pin'),
      node('div', candidate.decision, 'decision'),
      node('div', candidate.runtime, 'runtime')
    );
    if (candidate.evidence) {
      const evidence = node('div', undefined, 'evidence');
      for (const [key, value] of Object.entries(candidate.evidence)) {
        evidence.append(node('span', `${key}: ${evidenceText(value)}`));
      }
      article.append(evidence);
    }
    return article;
  }

  function renderCandidates() {
    const grid = byId('candidateGrid');
    const selected = state.data.candidates.filter((candidate) => state.filter === 'ALL' || candidate.status === state.filter);
    grid.replaceChildren(...selected.map(renderCard));
    if (!selected.length) grid.append(node('p', 'No candidates match this filter.', 'error'));
  }

  function renderGates() {
    const grid = byId('gateGrid');
    grid.replaceChildren(...state.data.remaining_dependencies.map((gate) => {
      const article = document.createElement('article');
      article.append(node('h3', gate.id), node('div', gate.state, 'pin'), node('p', gate.requirements.join(' · ')));
      return article;
    }));
  }

  function validate(data) {
    if (!data || data.schema_version !== '8x8.public-capabilities-observatory.v2') throw new Error('Unsupported state schema.');
    if (!Array.isArray(data.candidates) || data.candidates.length !== 13) throw new Error('Expected exactly thirteen candidates.');
    if (data.summary.disabled_adapter_contracts_merged !== 1) throw new Error('Expected one disabled adapter contract.');
    if (data.summary.third_party_candidates_installed_into_8x8 !== 0) throw new Error('Runtime installation boundary changed.');
    if (Object.values(data.absolute_boundaries).some((value) => value !== false)) throw new Error('A denied authority boundary changed.');
    const supervision = data.candidates.find((candidate) => candidate.id === 'MSG197-VISION-001');
    const contract = supervision && supervision.evidence && supervision.evidence.adapter_contract;
    if (!contract || contract.enabled !== false || contract.install_state !== 'NOT_INSTALLED' || contract.runtime_authority !== 'NONE' || contract.production_ready !== false) {
      throw new Error('Supervision adapter contract must remain disabled and uninstalled.');
    }
  }

  function render() {
    const { summary, source } = state.data;
    byId('packets').textContent = `${summary.candidate_packets_merged}/${summary.candidate_count}`;
    byId('benchmarks').textContent = `${summary.external_measured_benchmarks_complete}/${summary.external_measured_benchmarks_required}`;
    byId('adapters').textContent = String(summary.disabled_adapter_contracts_merged);
    byId('installed').textContent = String(summary.third_party_candidates_installed_into_8x8);
    byId('votes').textContent = `${summary.real_council_votes}/${summary.quorum_required}`;
    byId('truthState').textContent = state.data.truth_state;
    byId('sourceRepo').textContent = source.repository;
    byId('sourceCommit').textContent = source.commit;
    byId('sourceBlob').textContent = source.blob_sha;
    byId('pinDigest').textContent = source.upstream_pin_set_sha256;
    renderCandidates();
    renderGates();
  }

  async function load() {
    try {
      const response = await fetch('./state.json', { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error(`State request failed with ${response.status}.`);
      const data = await response.json();
      validate(data);
      state.data = data;
      render();
    } catch (error) {
      byId('truthState').textContent = 'FAIL_CLOSED_STATE_UNAVAILABLE';
      byId('candidateGrid').replaceChildren(node('p', `Evidence could not be rendered: ${error.message}`, 'error'));
      byId('gateGrid').replaceChildren();
    }
  }

  byId('filter').addEventListener('change', (event) => {
    state.filter = event.target.value;
    if (state.data) renderCandidates();
  });

  load();
})();
