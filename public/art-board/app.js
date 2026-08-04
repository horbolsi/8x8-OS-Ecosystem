const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  data: null,
  zoom: 1,
  x: 0,
  y: 0,
  map: false,
  dragging: false,
  pointerX: 0,
  pointerY: 0,
  selected: null,
};

const worldPositions = [
  [50, 12], [77, 25], [87, 51], [74, 77],
  [50, 87], [26, 77], [13, 51], [23, 25],
];
const nodePositions = [
  [50, 31], [64, 41], [64, 60],
  [50, 69], [36, 60], [36, 41],
];
const colors = {
  GREEN: "Healthy or release-ready in scope",
  CYAN: "Verified information or read-only",
  YELLOW: "Incomplete dependency",
  ORANGE: "Degraded or review required",
  RED: "Down or blocked",
  BLACK: "Unknown, stale or hidden",
  PURPLE: "Planned or experimental",
};

function safeToken(value) {
  return String(value ?? "").replace(/[^A-Za-z0-9_-]/g, "") || "UNKNOWN";
}

function boundedPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, numeric));
}

function createNode(tag, options = {}) {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = String(options.text);
  if (options.title !== undefined) element.title = String(options.title);
  for (const [name, value] of Object.entries(options.attributes || {})) {
    element.setAttribute(name, String(value));
  }
  for (const child of options.children || []) {
    if (child) element.append(child);
  }
  return element;
}

function replaceChildren(target, children) {
  target.replaceChildren(...children.filter(Boolean));
}

function position(element, x, y, centered = false) {
  element.style.left = `${boundedPercent(x)}%`;
  element.style.top = `${boundedPercent(y)}%`;
  if (centered) element.style.transform = "translate(-50%,-50%)";
}

function labelledParagraph(label, value) {
  return createNode("p", {
    children: [
      createNode("b", { text: `${label}: ` }),
      document.createTextNode(String(value ?? "")),
    ],
  });
}

function applyTransform() {
  $("#board").style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.zoom})`;
  const percentage = `${Math.round(state.zoom * 100)}%`;
  $("#zoom").textContent = percentage;
  $("#reset").textContent = percentage;
}

function setZoom(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return;
  state.zoom = Math.max(0.55, Math.min(1.8, Number(numeric.toFixed(2))));
  applyTransform();
}

function addFact(fragment, label, value) {
  if (value === undefined || value === null || value === "") return;
  fragment.append(
    createNode("dt", { text: label }),
    createNode("dd", { text: value }),
  );
}

function inspect(item, type) {
  if (!item || typeof item !== "object") return;
  state.selected = { item, type };
  $("#title").textContent = item.label || item.id || "Unknown record";
  $("#summary").textContent = item.summary || item.description || "Public-safe record.";
  const fragment = document.createDocumentFragment();
  for (const [key, value] of Object.entries(item)) {
    if (["id", "label", "summary", "description"].includes(key) || typeof value === "object") continue;
    addFact(fragment, key, value);
  }
  $("#facts").replaceChildren(fragment);
  $("#evidence").disabled = false;
}

function renderLegend() {
  const entries = Object.entries(colors).map(([color, description]) => {
    const marker = createNode("i", { className: safeToken(color) });
    const text = createNode("span", {
      children: [
        createNode("b", { text: color }),
        createNode("br"),
        document.createTextNode(description),
      ],
    });
    return createNode("div", { className: "legend", children: [marker, text] });
  });
  replaceChildren($("#legend"), entries);
}

function renderWorlds() {
  const elements = state.data.worlds.map((world, index) => {
    const [x, y] = worldPositions[index] || [50, 50];
    const button = createNode("button", {
      className: `world ${safeToken(world.status)}`,
      attributes: { "data-world": world.id },
      children: [
        createNode("b", { text: world.label }),
        createNode("small", { text: `${world.score}/100 • ${world.evidence}` }),
      ],
    });
    position(button, x, y, true);
    return button;
  });
  replaceChildren($("#worlds"), elements);
}

function renderNodes() {
  const elements = state.data.nodes.map((record, index) => {
    const [x, y] = nodePositions[index % nodePositions.length] || [50, 50];
    const button = createNode("button", {
      className: `node ${safeToken(record.status)}`,
      text: record.label.slice(0, 2).toUpperCase(),
      title: record.label,
      attributes: { "data-node": record.id },
    });
    position(button, x, y, true);
    return button;
  });
  replaceChildren($("#nodes"), elements);
}

function renderClusters() {
  const elements = state.data.presence_clusters.map((cluster) => {
    const button = createNode("button", {
      className: "cluster",
      attributes: {
        "data-cluster": cluster.label,
        "data-label": cluster.label,
        "aria-label": `${cluster.label}, simulated, zero users`,
      },
    });
    position(button, cluster.x, cluster.y);
    return button;
  });
  replaceChildren($("#clusters"), elements);
}

function renderTreasury() {
  const treasury = state.data.treasury;
  replaceChildren($("#treasury"), [
    labelledParagraph("Status", treasury.status),
    labelledParagraph("Networks", treasury.networks.join(", ")),
    createNode("p", {
      children: [
        document.createTextNode("Balances: hidden / unavailable"), createNode("br"),
        document.createTextNode("Addresses: hidden / unavailable"), createNode("br"),
        document.createTextNode("Signing: disabled"),
      ],
    }),
  ]);
}

function render() {
  $("#truth").textContent = state.data.truth_banner;
  renderLegend();
  renderWorlds();
  renderNodes();
  renderClusters();
  renderTreasury();
  applyTransform();
}

function toggleMap() {
  state.map = !state.map;
  $("#mapLayer").hidden = !state.map;
  $("#worlds").hidden = state.map;
  $("#nodes").hidden = state.map;
  $("#map").setAttribute("aria-pressed", String(state.map));
  $("#mode").textContent = state.map ? "GLOBAL MAP" : "ART BOARD";
  state.x = 0;
  state.y = 0;
  setZoom(state.map ? 0.88 : 1);
}

function bindEvents() {
  $("#plus").addEventListener("click", () => setZoom(state.zoom + 0.1));
  $("#minus").addEventListener("click", () => setZoom(state.zoom - 0.1));
  $("#reset").addEventListener("click", () => {
    state.x = 0;
    state.y = 0;
    setZoom(1);
  });
  $("#map").addEventListener("click", toggleMap);
  $("#help").addEventListener("click", () => {
    $("#modalTitle").textContent = "How to read the Art Board";
    $("#modalBody").textContent = "Green means complete only inside the displayed release unit. Red is down or blocked. Orange is degraded. Yellow is incomplete. Black is unknown or hidden. The map contains simulated regions with zero users and no tracking.";
    $("#modal").showModal();
  });
  $("#close").addEventListener("click", () => $("#modal").close());
  $("#evidence").addEventListener("click", () => {
    if (!state.selected) return;
    $("#modalTitle").textContent = "Public evidence record";
    $("#modalBody").textContent = JSON.stringify(state.selected, null, 2);
    $("#modal").showModal();
  });
  $("#filter").addEventListener("input", (event) => {
    const query = String(event.target.value ?? "").toLowerCase().trim();
    $$(".world").forEach((element) => {
      const record = state.data.worlds.find((world) => world.id === element.dataset.world);
      element.hidden = Boolean(query && !JSON.stringify(record ?? {}).toLowerCase().includes(query));
    });
    $$(".node").forEach((element) => {
      const record = state.data.nodes.find((entry) => entry.id === element.dataset.node);
      element.hidden = Boolean(query && !JSON.stringify(record ?? {}).toLowerCase().includes(query));
    });
  });
  $("#board").addEventListener("click", (event) => {
    const worldButton = event.target.closest("[data-world]");
    const nodeButton = event.target.closest("[data-node]");
    const clusterButton = event.target.closest("[data-cluster]");
    if (worldButton) inspect(state.data.worlds.find((world) => world.id === worldButton.dataset.world), "world");
    if (nodeButton) inspect(state.data.nodes.find((entry) => entry.id === nodeButton.dataset.node), "node");
    if (clusterButton) inspect({ label: clusterButton.dataset.cluster, status: "CYAN", count: 0, mode: "SIMULATED_REGION_ONLY" }, "presence");
  });

  const viewport = $("#viewport");
  const stopDragging = () => { state.dragging = false; };
  viewport.addEventListener("pointerdown", (event) => {
    state.dragging = true;
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    state.x += event.clientX - state.pointerX;
    state.y += event.clientY - state.pointerY;
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    applyTransform();
  });
  viewport.addEventListener("pointerup", stopDragging);
  viewport.addEventListener("pointercancel", stopDragging);
  viewport.addEventListener("lostpointercapture", stopDragging);
  viewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    setZoom(state.zoom + (event.deltaY < 0 ? 0.08 : -0.08));
  }, { passive: false });

  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key === "+" || event.key === "=") setZoom(state.zoom + 0.1);
    if (event.key === "-") setZoom(state.zoom - 0.1);
    if (event.key === "0") {
      state.x = 0;
      state.y = 0;
      setZoom(1);
    }
    if (event.key.toLowerCase() === "m") toggleMap();
    if (event.key === "Escape" && $("#modal").open) $("#modal").close();
  });
}

function renderFailure(error) {
  const panel = createNode("main", {
    className: "glass panel",
    children: [
      createNode("h1", { text: "Art Board blocked" }),
      createNode("p", { text: "Public state validation failed. Nothing was rendered." }),
      createNode("pre", { text: error instanceof Error ? error.message : "Unknown error" }),
    ],
  });
  panel.style.margin = "2rem";
  document.body.replaceChildren(panel);
}

async function start() {
  try {
    const response = await fetch("/art-board/state.json", {
      cache: "no-store",
      credentials: "same-origin",
      redirect: "error",
    });
    if (!response.ok) throw new Error(`state ${response.status}`);
    if (!(response.headers.get("content-type") || "").includes("json")) throw new Error("state is not JSON");
    state.data = await response.json();
    if (state.data.schema_version !== "8x8.public-art-board.v1") throw new Error("unsupported schema");
    if (state.data.mode !== "PUBLIC_SAFE_FIXTURE") throw new Error("invalid public state mode");
    if (state.data.score.earned !== 100 || state.data.score.possible !== 100) throw new Error("invalid release score");
    if (state.data.score.whole_system_score !== "NOT_INFERRED") throw new Error("whole-system score must remain uninferred");
    render();
    bindEvents();
  } catch (error) {
    renderFailure(error);
  }
}

start();
