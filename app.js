// ====== CONFIG ======
const CONFIG = {
  // Soft gate (not real security). If you don't want it, set to false.
  enableGate: true,

  // Change this to whatever you want her to type.
  // Keep it simple: lowercase, no punctuation.
  passphrase: "phoebe",

  // LocalStorage key to remember unlock on her phone
  gateStorageKey: "will_phoebe_map_unlocked"
};

let map;
let memories = [];
let currentIndex = 0;

// Photo carousel state
let currentPhotoIndex = 0;

function $(id) { return document.getElementById(id); }

function normalize(str) {
  return (str || "").trim().toLowerCase();
}

function showGateIfNeeded() {
  const gate = $("gate");
  if (!CONFIG.enableGate) {
    gate.classList.add("hidden");
    return;
  }

  const unlocked = localStorage.getItem(CONFIG.gateStorageKey) === "1";
  if (unlocked) {
    gate.classList.add("hidden");
    return;
  }

  gate.classList.remove("hidden");

  const input = $("gateInput");
  const btn = $("gateBtn");
  const err = $("gateError");

  const tryUnlock = () => {
    err.textContent = "";
    if (normalize(input.value) === normalize(CONFIG.passphrase)) {
      localStorage.setItem(CONFIG.gateStorageKey, "1");
      gate.classList.add("hidden");
      input.value = "";
    } else {
      err.textContent = "Not quite — try again.";
    }
  };

  btn.addEventListener("click", tryUnlock);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryUnlock();
  });

  // Focus for mobile
  setTimeout(() => input.focus(), 50);
}

async function loadMemories() {
  const res = await fetch("./memories.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load memories.json");
  const data = await res.json();
  // Keep order as listed in JSON
  return data;
}

function initMap() {
  map = L.map("map", { zoomControl: false }).setView([40.0, -20.0], 3);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  L.control.zoom({ position: "bottomright" }).addTo(map);
}

function addMarkers() {
  const bounds = [];

  memories.forEach((m, idx) => {
    const marker = L.marker([m.lat, m.lng]).addTo(map);
    marker.on("click", () => {
      setCurrentIndex(idx, { pan: true });
    });

    bounds.push([m.lat, m.lng]);
  });

  if (bounds.length >= 2) map.fitBounds(bounds, { padding: [40, 80] });
  if (bounds.length === 1) map.setView(bounds[0], 9);
}

function renderTags(tags) {
  const wrap = $("memTags");
  wrap.innerHTML = "";
  (tags || []).forEach(t => {
    const el = document.createElement("div");
    el.className = "tag";
    el.textContent = t;
    wrap.appendChild(el);
  });
}

function renderPhotoCarousel(m) {
  const wrap = $("photoWrap");
  const img = $("photoImg");
  const prev = $("photoPrev");
  const next = $("photoNext");

  const photos = Array.isArray(m.photos) ? m.photos : [];
  if (!photos.length) {
    wrap.classList.add("hidden");
    return;
  }

  wrap.classList.remove("hidden");
  currentPhotoIndex = Math.min(currentPhotoIndex, photos.length - 1);
  img.src = photos[currentPhotoIndex];
  img.alt = `${m.title} photo ${currentPhotoIndex + 1}`;

  const canNav = photos.length > 1;
  prev.style.display = canNav ? "block" : "none";
  next.style.display = canNav ? "block" : "none";

  prev.onclick = () => {
    currentPhotoIndex = (currentPhotoIndex - 1 + photos.length) % photos.length;
    img.src = photos[currentPhotoIndex];
    img.alt = `${m.title} photo ${currentPhotoIndex + 1}`;
  };

  next.onclick = () => {
    currentPhotoIndex = (currentPhotoIndex + 1) % photos.length;
    img.src = photos[currentPhotoIndex];
    img.alt = `${m.title} photo ${currentPhotoIndex + 1}`;
  };
}

function renderMemory(m) {
  $("memTitle").textContent = m.title || "—";
  $("memMeta").textContent = m.meta || "";
  $("memCaption").textContent = m.caption || "";
  renderTags(m.tags);

  currentPhotoIndex = 0;
  renderPhotoCarousel(m);
}

function setCurrentIndex(idx, opts = {}) {
  currentIndex = (idx + memories.length) % memories.length;
  const m = memories[currentIndex];
  renderMemory(m);

  if (opts.pan) {
    map.flyTo([m.lat, m.lng], Math.max(map.getZoom(), 5), { duration: 0.6 });
  }
}

function wireControls() {
  $("prevBtn").addEventListener("click", () => setCurrentIndex(currentIndex - 1, { pan: true }));
  $("nextBtn").addEventListener("click", () => setCurrentIndex(currentIndex + 1, { pan: true }));
}

(async function main() {
  showGateIfNeeded();

  initMap();
  wireControls();

  memories = await loadMemories();
  addMarkers();
  setCurrentIndex(0, { pan: false });
})();
