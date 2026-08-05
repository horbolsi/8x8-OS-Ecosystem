const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const allowedStatuses = new Set(["GREEN", "CYAN", "YELLOW", "ORANGE", "RED", "BLACK", "PURPLE", "GRAY"]);
const movementModes = new Set(["WALK", "DRIVE", "PRONE"]);
const presenceModes = new Set(["HIDDEN", "REGION_APPROXIMATE", "PRECISE_TEMPORARY"]);

const world = {
  data: null,
  x: 10,
  y: 11,
  heading: 0,
  headingIndex: 0,
  mode: "WALK",
  jumping: false,
  selectedService: null,
  location: null,
  orientationEnabled: false,
  presenceMode: "HIDDEN",
  preciseExpiresAt: null,
  preciseTimer: null,
};

function safeStatus(value) {
  const token = String(value ?? "BLACK").toUpperCase();
  return allowedStatuses.has(token) ? token : "BLACK";
}

function createNode(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = String(options.text);
  if (options.attributes) {
    for (const [name, value] of Object.entries(options.attributes)) {
      node.setAttribute(name, String(value));
    }
  }
  for (const child of options.children || []) {
    if (child) node.append(child);
  }
  return node;
}

function textParagraph(text) {
  return createNode("p", { text });
}

function openModal(eyebrow, title, nodes) {
  $("#modalEyebrow").textContent = eyebrow;
  $("#modalTitle").textContent = title;
  $("#modalBody").replaceChildren(...nodes);
  $("#modal").showModal();
}

function clampGrid(value) {
  return Math.max(0, Math.min(20, Number(value)));
}

function zoneFor(x, y) {
  if (x >= 7 && x <= 13 && y >= 7 && y <= 13) return "GENESIS PLAZA";
  if (y <= 5) return "NORTH CREATOR DISTRICT";
  if (y >= 16) return "SOUTH ARENA DISTRICT";
  if (x <= 5) return "WEST MARKET DISTRICT";
  if (x >= 16) return "EAST AGENT DISTRICT";
  return "WORLD ROAD NETWORK";
}

function speedForMode() {
  if (world.mode === "DRIVE") return 2;
  if (world.mode === "PRONE") return 1;
  return 1;
}

function renderTraveler() {
  const avatar = $("#avatar");
  avatar.dataset.x = String(world.x);
  avatar.dataset.y = String(world.y);
  avatar.dataset.mode = world.mode;
  avatar.dataset.headingIndex = String(world.headingIndex);
  avatar.dataset.jump = String(world.jumping);
  $("#movementMode").textContent = world.mode;
  $("#heading").textContent = `${Math.round(world.heading)}°`;
  $("#position").textContent = `${world.x}, ${world.y}`;
  $("#zoneName").textContent = zoneFor(world.x, world.y);

  for (const button of $$('[data-mode]')) {
    button.setAttribute("aria-pressed", String(button.dataset.mode === world.mode));
  }
}

function move(direction) {
  const speed = speedForMode();
  if (direction === "UP") world.y = clampGrid(world.y - speed);
  if (direction === "DOWN") world.y = clampGrid(world.y + speed);
  if (direction === "LEFT") world.x = clampGrid(world.x - speed);
  if (direction === "RIGHT") world.x = clampGrid(world.x + speed);
  renderTraveler();
}

function setMode(mode) {
  if (!movementModes.has(mode)) return;
  world.mode = mode;
  renderTraveler();
}

function jump() {
  if (world.jumping || world.mode === "PRONE") return;
  world.jumping = true;
  renderTraveler();
  window.setTimeout(() => {
    world.jumping = false;
    renderTraveler();
  }, 520);
}

function addFact(fragment, label, value) {
  fragment.append(
    createNode("dt", { text: label }),
    createNode("dd", { text: value }),
  );
}

function inspectService(service) {
  world.selectedService = service;
  $("#inspectorTitle").textContent = service.label;
  $("#inspectorSummary").textContent = service.summary;
  const fragment = document.createDocumentFragment();
  addFact(fragment, "Status", service.status);
  addFact(fragment, "Category", service.category);
  addFact(fragment, "Truth", "PUBLIC PREVIEW");
  addFact(fragment, "Payment", "DISABLED");
  $("#inspectorFacts").replaceChildren(fragment);
  $("#missionButton").disabled = false;
}

function renderServices() {
  const services = world.data.services;
  const beacons = world.data.synthetic_beacons;
  const layer = $("#serviceLayer");
  const nodes = beacons.map((beacon, index) => {
    const service = services.find((item) => item.id === beacon.id)
      || services.find((item) => item.label.includes(beacon.label.split(" ")[0]))
      || {
        id: beacon.id,
        label: beacon.label,
        icon: beacon.label.slice(0, 1),
        status: beacon.status,
        category: beacon.kind,
        summary: "Synthetic public-world beacon.",
      };
    return createNode("button", {
      className: `service-beacon ${safeStatus(beacon.status)}`,
      attributes: {
        type: "button",
        "data-beacon-position": index,
        "data-service-id": service.id,
        "aria-label": `${service.label}, ${service.status}, synthetic preview`,
      },
      children: [
        createNode("b", { text: service.icon || service.label.slice(0, 1) }),
        createNode("span", { text: service.label }),
      ],
    });
  });
  layer.replaceChildren(...nodes);
}

function renderInitialTruth() {
  $("#truth").textContent = world.data.truth_banner;
  $("#liveUsers").textContent = world.data.privacy.live_user_count;
  $("#presenceState").textContent = world.data.privacy.default_presence;
}

function locationDisplay() {
  if (!world.location) return "Local location unavailable.";
  const { latitude, longitude, accuracy } = world.location;
  if (world.presenceMode === "HIDDEN") {
    return `Device location is available locally with approximately ${Math.round(accuracy)} m accuracy. Presence remains hidden.`;
  }
  if (world.presenceMode === "REGION_APPROXIMATE") {
    return `Approximate local region: ${latitude.toFixed(1)}, ${longitude.toFixed(1)}. Coordinates are not uploaded.`;
  }
  const remaining = world.preciseExpiresAt
    ? Math.max(0, Math.ceil((world.preciseExpiresAt - Date.now()) / 60_000))
    : 0;
  return `Precise local session: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}. Local display expires in ${remaining} minute${remaining === 1 ? "" : "s"}.`;
}

function updateLocationView() {
  $("#presenceState").textContent = world.presenceMode;
  $("#locationText").textContent = world.location
    ? locationDisplay()
    : "Permission not requested. Default presence remains hidden.";
  $("#locationPulse").hidden = !world.location;

  const google = $("#googleMapsLink");
  const apple = $("#appleMapsLink");
  if (!world.location) {
    for (const link of [google, apple]) {
      link.setAttribute("href", "#");
      link.setAttribute("aria-disabled", "true");
      link.removeAttribute("target");
      link.removeAttribute("rel");
    }
    return;
  }

  const latitude = Number(world.location.latitude.toFixed(6));
  const longitude = Number(world.location.longitude.toFixed(6));
  google.setAttribute("href", `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`);
  apple.setAttribute("href", `https://maps.apple.com/?ll=${encodeURIComponent(`${latitude},${longitude}`)}&q=${encodeURIComponent("8x8 Local Position")}`);
  for (const link of [google, apple]) {
    link.setAttribute("aria-disabled", "false");
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
    link.setAttribute("referrerpolicy", "no-referrer");
  }
}

function expirePrecisePresence() {
  if (world.preciseTimer) window.clearInterval(world.preciseTimer);
  world.preciseExpiresAt = null;
  world.preciseTimer = null;
  if (world.presenceMode === "PRECISE_TEMPORARY") {
    world.presenceMode = "HIDDEN";
    $("#presenceMode").value = "HIDDEN";
  }
  updateLocationView();
}

function startPreciseExpiry() {
  if (world.preciseTimer) window.clearInterval(world.preciseTimer);
  world.preciseExpiresAt = Date.now() + 10 * 60_000;
  world.preciseTimer = window.setInterval(() => {
    if (!world.preciseExpiresAt || Date.now() >= world.preciseExpiresAt) {
      expirePrecisePresence();
      return;
    }
    updateLocationView();
  }, 30_000);
}

function setPresenceMode(value) {
  if (!presenceModes.has(value)) return;
  world.presenceMode = value;
  if (value === "PRECISE_TEMPORARY" && world.location) startPreciseExpiry();
  if (value !== "PRECISE_TEMPORARY") {
    if (world.preciseTimer) window.clearInterval(world.preciseTimer);
    world.preciseTimer = null;
    world.preciseExpiresAt = null;
  }
  updateLocationView();
}

function requestLocation() {
  if (!window.isSecureContext || !("geolocation" in navigator)) {
    openModal("LOCATION", "Location is unavailable", [
      textParagraph("Geolocation requires an HTTPS secure context and a supporting browser."),
    ]);
    return;
  }

  $("#locationButton").disabled = true;
  $("#locationButton").textContent = "Requesting permission…";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      world.location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        observedAt: Date.now(),
      };
      if (world.presenceMode === "PRECISE_TEMPORARY") startPreciseExpiry();
      updateLocationView();
      $("#locationButton").disabled = false;
      $("#locationButton").textContent = "Refresh local location";
    },
    (error) => {
      world.location = null;
      updateLocationView();
      $("#locationButton").disabled = false;
      $("#locationButton").textContent = "Enable local location";
      openModal("LOCATION", "Location permission was not enabled", [
        textParagraph(error.message || "The browser could not provide a position."),
        textParagraph("The world remains usable with hidden presence."),
      ]);
    },
    { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
  );
}

function normalizeHeading(alpha) {
  const numeric = Number(alpha);
  if (!Number.isFinite(numeric)) return world.heading;
  return ((360 - numeric) % 360 + 360) % 360;
}

function applyOrientation(event) {
  world.heading = normalizeHeading(event.alpha);
  world.headingIndex = Math.round(world.heading / 22.5) % 16;
  const beta = Number(event.beta);
  const gamma = Number(event.gamma);
  const avatar = $("#avatar");
  avatar.dataset.tilt = Number.isFinite(gamma) && gamma < -12
    ? "LEFT"
    : Number.isFinite(gamma) && gamma > 12
      ? "RIGHT"
      : Number.isFinite(beta) && beta > 50
        ? "FORWARD"
        : "LEVEL";
  renderTraveler();
}

async function requestOrientation() {
  if (!("DeviceOrientationEvent" in window)) {
    openModal("GYROSCOPE", "Orientation is unavailable", [
      textParagraph("This browser does not expose device-orientation events."),
    ]);
    return;
  }

  try {
    const permissionFunction = window.DeviceOrientationEvent.requestPermission;
    if (typeof permissionFunction === "function") {
      const result = await permissionFunction.call(window.DeviceOrientationEvent);
      if (result !== "granted") throw new Error("Device orientation permission was denied.");
    }
    if (!world.orientationEnabled) {
      window.addEventListener("deviceorientation", applyOrientation, { passive: true });
      world.orientationEnabled = true;
    }
    $("#orientationButton").textContent = "Gyroscope enabled";
    $("#orientationButton").disabled = true;
  } catch (error) {
    openModal("GYROSCOPE", "Gyroscope permission was not enabled", [
      textParagraph(error instanceof Error ? error.message : "Orientation permission failed."),
    ]);
  }
}

function checkNearbyCapability() {
  const bluetooth = "bluetooth" in navigator;
  const connection = "connection" in navigator;
  const details = [
    `Web Bluetooth interface: ${bluetooth ? "detected" : "not detected"}.`,
    `Network information interface: ${connection ? "detected" : "not detected"}.`,
    "No scan was performed and no nearby person or device was discovered.",
    "A real peer mesh requires installed Android/iOS clients, runtime permissions, authenticated 8x8 IDs, encryption, abuse controls and explicit discovery consent.",
  ];
  $("#nearbyStatus").textContent = bluetooth
    ? "Browser BLE capability detected; scanning remains off"
    : "Native client required for nearby mesh";
  openModal("NEARBY NETWORK", "Capability check only", details.map(textParagraph));
}

function bindMovement() {
  for (const button of $$('[data-move]')) {
    button.addEventListener("click", () => move(button.dataset.move));
  }
  for (const button of $$('[data-mode]')) {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  }
  $("#jumpButton").addEventListener("click", jump);

  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
    const key = event.key.toLowerCase();
    const mapping = {
      w: "UP",
      arrowup: "UP",
      s: "DOWN",
      arrowdown: "DOWN",
      a: "LEFT",
      arrowleft: "LEFT",
      d: "RIGHT",
      arrowright: "RIGHT",
    };
    if (mapping[key]) {
      event.preventDefault();
      move(mapping[key]);
    }
    if (key === " ") {
      event.preventDefault();
      jump();
    }
    if (key === "p") setMode("PRONE");
    if (key === "v") setMode(world.mode === "DRIVE" ? "WALK" : "DRIVE");
    if (key === "escape" && $("#modal").open) $("#modal").close();
  });
}

function bindServices() {
  $("#serviceLayer").addEventListener("click", (event) => {
    const beacon = event.target.closest("[data-service-id]");
    if (!beacon) return;
    const service = world.data.services.find((item) => item.id === beacon.dataset.serviceId)
      || {
        id: beacon.dataset.serviceId,
        label: beacon.textContent.trim(),
        status: "PURPLE",
        category: "WORLD",
        summary: "Synthetic public-world service preview.",
      };
    inspectService(service);
  });

  $("#missionButton").addEventListener("click", () => {
    if (!world.selectedService) return;
    openModal("AGENT MISSION", `Mission draft: ${world.selectedService.label}`, [
      textParagraph("Objective: inspect this service, collect public evidence, identify dependencies and propose a tested improvement."),
      textParagraph("Delivery: disabled until verified agent identities, recipient consent, mission leases and receipt storage are connected."),
    ]);
  });
}

function bindPanels() {
  $("#presenceMode").addEventListener("change", (event) => setPresenceMode(event.target.value));
  $("#locationButton").addEventListener("click", requestLocation);
  $("#orientationButton").addEventListener("click", requestOrientation);
  $("#nearbyButton").addEventListener("click", checkNearbyCapability);
  $("#helpButton").addEventListener("click", () => openModal("TRUTH CONTRACT", "What this world does now", [
    textParagraph("Movement, jumping, driving mode, service inspection, gyroscope input and local browser geolocation are implemented."),
    textParagraph("There are zero connected live users. No position is uploaded, persisted or shared."),
    textParagraph("Chat, calls, payments, wallet signing, Bluetooth/Wi-Fi mesh, app-store clients and real agent delivery remain separate release units."),
  ]));
  $("#identityButton").addEventListener("click", () => openModal("IDENTITY", "Owner identity activation requirements", [
    textParagraph("Production sign-in requires server-verified 8x8 ID, passkeys, recovery, authenticator step-up, session revocation and privacy controls."),
    textParagraph("Face, voice and fingerprint data must remain device/platform protected where possible; this route stores no biometric template."),
  ]));
  $("#pluginButton").addEventListener("click", () => openModal("PLUGIN GOVERNANCE", "8x8-compatible publication gate", [
    textParagraph("A developer tool must declare capabilities, permissions, resources, data classes, provenance, license, SBOM, signature, tests and rollback."),
    textParagraph("Governance may rank and approve public catalog visibility, but security and legal gates cannot be outvoted."),
  ]));
  $("#arenaButton").addEventListener("click", () => openModal("ARENA", "Competition release path", [
    textParagraph("Phase 1: local movement and synthetic opponents."),
    textParagraph("Phase 2: authenticated social hub and nonviolent competitions."),
    textParagraph("Phase 3: separately age-rated action modes with authoritative servers, moderation, anti-cheat, reporting and regional compliance."),
  ]));
  $("#closeModal").addEventListener("click", () => $("#modal").close());
  $("#modal").addEventListener("click", (event) => {
    if (event.target === $("#modal")) $("#modal").close();
  });

  for (const link of [$("#googleMapsLink"), $("#appleMapsLink")]) {
    link.addEventListener("click", (event) => {
      if (link.getAttribute("aria-disabled") === "true") event.preventDefault();
    });
  }
}

function validateState(data) {
  if (data.schema_version !== "8x8.public-world.v1") throw new Error("Unsupported world schema");
  if (data.mode !== "PUBLIC_BROWSER_BETA_LOCAL_ONLY") throw new Error("Unsafe world mode");
  if (data.score.earned !== 100 || data.score.possible !== 100) throw new Error("Invalid scoped release score");
  if (data.score.whole_system_score !== "NOT_INFERRED") throw new Error("Invalid whole-system claim");
  if (data.privacy.live_user_count !== 0) throw new Error("Unexpected live-user claim");
  if (data.privacy.coordinates_uploaded !== false || data.privacy.coordinates_persisted !== false) throw new Error("Unsafe location boundary");
  if (data.public_boundaries.wallet_data_connected !== false) throw new Error("Wallet data must remain disconnected");
  if (data.public_boundaries.financial_execution_enabled !== false) throw new Error("Financial execution must remain disabled");
  if (data.public_boundaries.remote_device_control_enabled !== false) throw new Error("Remote device control must remain disabled");
}

function renderFailure(error) {
  document.body.replaceChildren(createNode("main", {
    className: "glass failure-panel",
    children: [
      createNode("h1", { text: "8x8 World blocked" }),
      textParagraph("Public world state validation failed. No interactive world was rendered."),
      createNode("pre", { text: error instanceof Error ? error.message : "Unknown validation error" }),
    ],
  }));
}

async function start() {
  try {
    const response = await fetch("/world/state.json", {
      cache: "no-store",
      credentials: "same-origin",
      redirect: "error",
    });
    if (!response.ok || !(response.headers.get("content-type") || "").includes("json")) {
      throw new Error("Invalid public-world state response");
    }
    world.data = await response.json();
    validateState(world.data);
    renderInitialTruth();
    renderServices();
    renderTraveler();
    updateLocationView();
    bindMovement();
    bindServices();
    bindPanels();
  } catch (error) {
    renderFailure(error);
  }
}

start();
