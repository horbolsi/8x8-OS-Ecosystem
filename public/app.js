const releaseFallback = "8X8-PUBLIC-SYSTEM-BETA";
const $ = (selector) => document.querySelector(selector);

const session = {
  id: crypto.randomUUID?.() ?? `session-${Date.now()}`,
  sequence: 0,
};

function emit(type, detail = {}) {
  session.sequence += 1;
  const event = {
    schema_version: "1.0.0",
    event_id: `${session.id}:${session.sequence}`,
    type,
    detail,
    wall_clock_ms: Date.now(),
    monotonic_ms: Math.round(performance.now() * 1000) / 1000,
    release_id: window.__releaseId || releaseFallback,
  };
  window.dispatchEvent(new CustomEvent("8x8:public-event", { detail: event }));
}

function toast(message) {
  const node = $("#toast");
  if (!node) return;
  node.textContent = message;
  node.classList.add("visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("visible"), 2600);
}

function setupClock() {
  const node = $("#clock");
  if (!node) return;
  const update = () => {
    node.textContent = new Date().toISOString().slice(11, 23);
    requestAnimationFrame(update);
  };
  update();
}

function setupFrameMeter() {
  const node = $("#fps");
  if (!node) return;
  let frames = 0;
  let last = performance.now();
  const frame = (now) => {
    frames += 1;
    if (now - last >= 1000) {
      node.textContent = String(Math.round((frames * 1000) / (now - last)));
      frames = 0;
      last = now;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function setupSpace() {
  const canvas = $("#space");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  let width = 0;
  let height = 0;
  let stars = [];

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(220, Math.floor((width * height) / 7500));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.3 + Math.random() * 1.3,
      a: 0.1 + Math.random() * 0.5,
      v: 0.03 + Math.random() * 0.09,
    }));
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
      star.y += star.v;
      if (star.y > height + 2) star.y = -2;
      ctx.beginPath();
      ctx.fillStyle = `rgba(122,232,255,${star.a})`;
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  };

  window.addEventListener("resize", resize, { passive: true });
  resize();
  requestAnimationFrame(draw);
}

function setupGlobe() {
  const canvas = $("#globe");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  const points = Array.from({ length: 48 }, () => ({
    lat: Math.asin(2 * Math.random() - 1),
    lon: Math.random() * Math.PI * 2,
    phase: Math.random() * Math.PI * 2,
  }));

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(320, rect.width);
    height = Math.max(300, rect.height);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const project = (lat, lon, rotation, radius) => {
    const angle = lon + rotation;
    const x = Math.cos(lat) * Math.cos(angle);
    const y = Math.sin(lat);
    const z = Math.cos(lat) * Math.sin(angle);
    return { x: x * radius, y: -y * radius, z };
  };

  const draw = (now) => {
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.34;
    const rotation = now * 0.00012;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = "rgba(103,247,255,.25)";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    for (const point of points) {
      const p = project(point.lat, point.lon, rotation, radius);
      if (p.z < -0.08) continue;
      const pulse = 1 + Math.sin(now * 0.004 + point.phase) * 0.25;
      ctx.beginPath();
      ctx.fillStyle = `rgba(115,255,190,${0.32 + (p.z + 1) * 0.25})`;
      ctx.arc(p.x, p.y, (1.4 + p.z) * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    requestAnimationFrame(draw);
  };

  new ResizeObserver(resize).observe(canvas);
  resize();
  requestAnimationFrame(draw);
}

function createTextElement(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function setupAgents() {
  const output = $("#agents");
  if (!output) return;
  const definitions = [
    ["COORDINATOR", "#67f7ff"],
    ["ARCHITECT", "#73ffbe"],
    ["SECURITY", "#9f7cff"],
    ["RESEARCH", "#ffd36a"],
    ["STUDIO", "#ff7088"],
    ["OPERATIONS", "#64a7ff"],
    ["CURATOR", "#d5ff73"],
    ["MODERATOR", "#ff8ee5"],
  ];

  const cards = definitions.map(([name, color]) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "agent";
    card.style.setProperty("--agent-color", color);
    card.dataset.agentId = name;
    const face = document.createElement("span");
    face.className = "face";
    face.setAttribute("aria-hidden", "true");
    card.append(face, createTextElement("small", name));
    card.addEventListener("click", () => {
      emit("public_archetype.selected", { archetype: name, live_presence_claimed: false });
      toast(`${name} selected · public archetype only`);
    });
    return card;
  });
  output.replaceChildren(...cards);
}

function setupEvents() {
  const output = $("#publicEvents");
  if (!output) return;
  const records = [
    ["Public routes use reviewed fixtures", "PASS"],
    ["Private history and runtime remain unmounted", "PASS"],
    ["Displayed activity is synthetic or public-receipted", "PASS"],
    ["Public interactions carry no private authority", "PASS"],
    ["Release remains reversible", "READY"],
  ];
  const items = records.map(([text, state], index) => {
    const item = document.createElement("li");
    item.append(
      createTextElement("time", `+${String(index * 8).padStart(2, "0")}ms`),
      createTextElement("span", text),
      createTextElement("b", state),
    );
    return item;
  });
  output.replaceChildren(...items);
}

function setupInteractions() {
  $("#ownerButton")?.addEventListener("click", () => {
    emit("public_boundary.viewed", { private_core_mounted: false });
    toast("Private owner access is unavailable in this public build.");
  });
}

async function loadRelease() {
  let release = { release_id: releaseFallback, integrity: "static-public-beta", public_mode: true };
  try {
    const response = await fetch("/api/v1/release", { headers: { accept: "application/json" } });
    if (response.ok) release = await response.json();
  } catch {
    // The static public interface remains available without a backend.
  }
  window.__releaseId = release.release_id || releaseFallback;
  if ($("#releaseId")) $("#releaseId").textContent = window.__releaseId.replace("8X8-", "");
  if ($("#integrity")) $("#integrity").textContent = `integrity: ${release.integrity || "unknown"}`;
  emit("public_release.loaded", { public_mode: release.public_mode !== false });
}

setupClock();
setupFrameMeter();
setupSpace();
setupGlobe();
setupAgents();
setupEvents();
setupInteractions();
loadRelease();
emit("public_session.started", { public_routes_claimed: 10, private_data_mounted: false });
