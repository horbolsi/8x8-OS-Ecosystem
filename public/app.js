const releaseFallback = "8X8-PUBLIC-SYSTEM-BETA";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const telemetry = {
  sessionId: crypto.randomUUID?.() ?? `session-${Date.now()}`,
  sequence: 0,
  startedAt: performance.timeOrigin,
};

function emit(type, detail = {}) {
  telemetry.sequence += 1;
  const event = {
    schema_version: "1.0.0",
    event_id: `${telemetry.sessionId}:${telemetry.sequence}`,
    type,
    detail,
    wall_clock_ms: Date.now(),
    monotonic_ms: Math.round(performance.now() * 1000) / 1000,
    release_id: window.__releaseId || releaseFallback,
  };
  window.dispatchEvent(new CustomEvent("8x8:telemetry", { detail: event }));
  return event;
}

function toast(message) {
  const node = $("#toast");
  if (!node) return;
  node.textContent = message;
  node.classList.add("visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("visible"), 2800);
}

function setupClock() {
  const clock = $("#clock");
  if (!clock) return;
  const update = () => {
    clock.textContent = new Date().toISOString().slice(11, 23);
    requestAnimationFrame(update);
  };
  update();
}

function setupFrameMeter() {
  const output = $("#fps");
  if (!output) return;
  let frames = 0;
  let last = performance.now();
  function frame(now) {
    frames += 1;
    if (now - last >= 1000) {
      output.textContent = String(Math.round((frames * 1000) / (now - last)));
      frames = 0;
      last = now;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function setupSpace() {
  const canvas = $("#space");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(260, Math.floor((width * height) / 6500));
    stars = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: 0.25 + Math.random() * 1.6,
      a: 0.08 + Math.random() * 0.6,
      id: `px-${index}`,
    }));
  }

  function draw(now) {
    ctx.clearRect(0, 0, width, height);
    const drift = now * 0.00002;
    for (const star of stars) {
      star.y += star.z * 0.08;
      star.x += Math.sin(drift + star.y * 0.004) * 0.02;
      if (star.y > height + 4) star.y = -4;
      ctx.beginPath();
      ctx.fillStyle = `rgba(122, 232, 255, ${star.a})`;
      ctx.arc(star.x, star.y, star.z, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

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
  let dpr = 1;
  const nodes = Array.from({ length: 64 }, (_, index) => ({
    lat: Math.asin(2 * Math.random() - 1),
    lon: Math.random() * Math.PI * 2,
    pulse: Math.random() * Math.PI * 2,
    id: `synthetic-node-${String(index + 1).padStart(3, "0")}`,
  }));

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(320, rect.width);
    height = Math.max(300, rect.height);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function point(lat, lon, rotation, radius) {
    const lambda = lon + rotation;
    const x = Math.cos(lat) * Math.cos(lambda);
    const y = Math.sin(lat);
    const z = Math.cos(lat) * Math.sin(lambda);
    return { x, y, z, visible: z > -0.08, sx: x * radius, sy: -y * radius };
  }

  function draw(now) {
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.34;
    const rotation = now * 0.00012;

    const glow = ctx.createRadialGradient(cx - radius * .3, cy - radius * .25, radius * .1, cx, cy, radius * 1.35);
    glow.addColorStop(0, "rgba(115,247,255,.22)");
    glow.addColorStop(.55, "rgba(26,96,142,.13)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = "rgba(103,247,255,.13)";
    ctx.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      for (let deg = 0; deg <= 360; deg += 4) {
        const p = point((lat * Math.PI) / 180, (deg * Math.PI) / 180, rotation, radius);
        if (!p.visible) continue;
        if (deg === 0) ctx.moveTo(p.sx, p.sy); else ctx.lineTo(p.sx, p.sy);
      }
      ctx.stroke();
    }
    for (let lon = 0; lon < 360; lon += 30) {
      ctx.beginPath();
      let started = false;
      for (let deg = -90; deg <= 90; deg += 3) {
        const p = point((deg * Math.PI) / 180, (lon * Math.PI) / 180, rotation, radius);
        if (!p.visible) { started = false; continue; }
        if (!started) { ctx.moveTo(p.sx, p.sy); started = true; } else ctx.lineTo(p.sx, p.sy);
      }
      ctx.stroke();
    }

    const projected = nodes
      .map((node) => ({ ...node, p: point(node.lat, node.lon, rotation, radius) }))
      .filter((node) => node.p.visible)
      .sort((a, b) => a.p.z - b.p.z);

    for (const node of projected) {
      const pulse = 1 + Math.sin(now * 0.004 + node.pulse) * .4;
      const alpha = .25 + (node.p.z + 1) * .28;
      ctx.fillStyle = `rgba(115,255,190,${alpha})`;
      ctx.shadowColor = "rgba(103,247,255,.9)";
      ctx.shadowBlur = 10 * pulse;
      ctx.beginPath();
      ctx.arc(node.p.sx, node.p.sy, 1.5 + node.p.z * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(103,247,255,.38)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    requestAnimationFrame(draw);
  }

  new ResizeObserver(resize).observe(canvas);
  resize();
  requestAnimationFrame(draw);
}

function setupAgents() {
  const output = $("#agents");
  if (!output) return;
  const definitions = [
    ["HERMES", "#67f7ff"], ["FLASH", "#ffd36a"], ["SERAPHIM", "#9f7cff"], ["ARCHITECT", "#73ffbe"],
    ["SCRIBE", "#ff7088"], ["AEGIS", "#64a7ff"], ["CURATOR", "#d5ff73"], ["MODERATOR", "#ff8ee5"],
  ];
  output.innerHTML = definitions.map(([name, color]) => `
    <div class="agent" style="--agent-color:${color}" data-agent-id="${name}">
      <span class="face" aria-hidden="true"></span><small>${name}</small>
    </div>`).join("");
  $$(".agent").forEach((node) => node.addEventListener("click", () => {
    const id = node.dataset.agentId;
    emit("agent.profile.selected", { agent_id: id, live_presence_claimed: false });
    toast(`${id} selected · visual profile only · live presence not claimed`);
  }));
}

function setupEvents() {
  const output = $("#publicEvents");
  if (!output) return;
  const events = [
    ["release", "Current beta routes exposed from one public portal", "PASS"],
    ["truth", "Synthetic, local-only, testnet and gated states labeled", "PASS"],
    ["private", "Private owner core remains unmounted", "LOCKED"],
    ["agents", "Eight visual profiles loaded without live-presence claims", "PASS"],
    ["rollback", "Release remains commit-bound and reversible", "READY"],
  ];
  output.innerHTML = events.map(([kind, text, state], index) => `
    <li data-kind="${kind}"><time>+${String(index * 8).padStart(2, "0")}ms</time><span>${text}</span><b>${state}</b></li>`).join("");
}

function setupInteractions() {
  $$('[data-focus]').forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.focus;
      const targetMonitor = $(`[data-monitor="${target}"]`);
      if (!targetMonitor) return;
      $$(".monitor").forEach((monitor) => {
        monitor.classList.toggle("focused", monitor === targetMonitor);
        monitor.classList.toggle("dimmed", monitor !== targetMonitor);
      });
      targetMonitor.scrollIntoView({ behavior: "smooth", block: "center" });
      emit("monitor.focus", { monitor: target });
      setTimeout(() => $$(".monitor").forEach((monitor) => monitor.classList.remove("dimmed")), 2200);
    });
  });

  $("#ownerButton")?.addEventListener("click", () => {
    emit("owner.boundary.viewed", { public_build: true, private_core_mounted: false });
    toast("Private owner access is intentionally unavailable in the public beta.");
  });

  document.addEventListener("pointerdown", (event) => {
    const x = Math.round(event.clientX * (window.devicePixelRatio || 1));
    const y = Math.round(event.clientY * (window.devicePixelRatio || 1));
    emit("pixel.pointer", {
      pixel_id: `${x}:${y}`,
      target: event.target?.closest?.("a,button,[data-monitor]")?.getAttribute?.("href") || event.target?.tagName || "unknown",
    });
  }, { passive: true });
}

async function loadRelease() {
  let release = { release_id: releaseFallback, integrity: "static-public-beta", public_mode: true };
  try {
    const response = await fetch("/api/v1/release", { headers: { accept: "application/json" } });
    if (response.ok) release = await response.json();
  } catch {
    // Static fallback remains fully functional.
  }
  window.__releaseId = release.release_id || releaseFallback;
  const releaseId = $("#releaseId");
  const integrity = $("#integrity");
  if (releaseId) releaseId.textContent = window.__releaseId.replace("8X8-", "");
  if (integrity) integrity.textContent = `integrity: ${release.integrity || "unknown"}`;
  emit("release.loaded", { release_id: window.__releaseId, public_mode: release.public_mode !== false });
}

setupClock();
setupFrameMeter();
setupSpace();
setupGlobe();
setupAgents();
setupEvents();
setupInteractions();
loadRelease();
emit("session.started", { viewport: [window.innerWidth, window.innerHeight], public_routes: 8 });