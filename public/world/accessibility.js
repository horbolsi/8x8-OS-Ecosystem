import './presence-consent.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const announcement = $("#travelerAnnouncement");
const viewport = $("#worldViewport");
let lastMessage = "";
let pendingFrame = null;
let previousFocus = null;

function currentTravelerMessage(prefix = "Traveler") {
  const zone = $("#zoneName")?.textContent?.trim() || "unknown zone";
  const mode = $("#movementMode")?.textContent?.trim() || "unknown mode";
  const heading = $("#heading")?.textContent?.trim() || "unknown heading";
  const position = $("#position")?.textContent?.trim() || "unknown position";
  return `${prefix}: ${zone}, ${mode.toLowerCase()} mode, heading ${heading}, grid position ${position}.`;
}

function announce(message) {
  if (!announcement || !message || message === lastMessage) return;
  lastMessage = message;
  announcement.textContent = "";
  window.requestAnimationFrame(() => { announcement.textContent = message; });
}

function scheduleTravelerAnnouncement(prefix) {
  if (pendingFrame !== null) window.cancelAnimationFrame(pendingFrame);
  pendingFrame = window.requestAnimationFrame(() => {
    pendingFrame = null;
    announce(currentTravelerMessage(prefix));
  });
}

for (const button of $$('[data-move]')) button.addEventListener("click", () => scheduleTravelerAnnouncement("Moved"));
for (const button of $$('[data-mode]')) button.addEventListener("click", () => scheduleTravelerAnnouncement("Mode changed"));
$("#jumpButton")?.addEventListener("click", () => announce("Traveler jumped."));

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) scheduleTravelerAnnouncement("Moved");
  else if (key === "p" || key === "v") scheduleTravelerAnnouncement("Mode changed");
  else if (key === " ") announce("Traveler jumped.");
});

$("#serviceLayer")?.addEventListener("click", (event) => {
  const beacon = event.target.closest("[data-service-id]");
  if (beacon) announce(`Selected service: ${beacon.textContent.trim()}. Synthetic public preview.`);
});

$("#presenceMode")?.addEventListener("change", (event) => {
  const label = event.target.selectedOptions?.[0]?.textContent?.trim() || event.target.value;
  announce(`Presence privacy changed to ${label}. Coordinates remain local to this browser session.`);
});

const modal = $("#modal");
if (modal) {
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("button");
    if (trigger && trigger.id !== "closeModal") previousFocus = trigger;
  }, true);
  modal.addEventListener("close", () => {
    if (previousFocus instanceof HTMLElement && document.contains(previousFocus)) previousFocus.focus();
    previousFocus = null;
  });
  const observer = new MutationObserver(() => { if (modal.open) $("#closeModal")?.focus(); });
  observer.observe(modal, { attributes: true, attributeFilter: ["open"] });
}

viewport?.addEventListener("focus", () => announce(currentTravelerMessage("World focused")));
