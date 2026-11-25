/* FieldMap — map logic (Leaflet + marker clustering).
   Every event series resolves to a CURRENT edition (happening now), otherwise
   the NEXT confirmed edition, otherwise a TBA placeholder. data/live.json is
   fetched at runtime and can surface auto-detected dates for TBA series. */

const CATEGORIES = {
  anime:    { label: "Anime & Manga", color: "#ff5fa2", icon: "🌸" },
  cosplay:  { label: "Cosplay",       color: "#7c5cff", icon: "🎭" },
  gaming:   { label: "Gaming",        color: "#21e6c1", icon: "🎮" },
  comics:   { label: "Comics & BD",   color: "#ffb020", icon: "💥" },
  airsoft:  { label: "Airsoft",       color: "#ff7043", icon: "🔫" },
  tabletop: { label: "Tabletop & RPG",color: "#4dc3ff", icon: "🎲" },
  market:   { label: "Art & Market",  color: "#b388ff", icon: "🛍️" },
  "sci-fi": { label: "Sci-Fi & Film", color: "#9ccc65", icon: "🛸" },
  retro:    { label: "Retro & Fun",   color: "#f4d35e", icon: "👾" },
};

const REGIONS = {
  iberanime: "centro",
  "comic-con-portugal": "norte",
  "lisboa-games-week": "lisboa",
  leiriacon: "centro",
  "amadora-bd": "lisboa",
  "maia-bd": "norte",
  "coimbra-bd": "centro",
  gtc: "centro",
  fantasporto: "norte",
  monstra: "lisboa",
  "apacorp-milsim": "all",
  "quebra-dados": "norte",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS_PT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

let LIVE = {}; // data/live.json — auto-detected dates per event id

const state = {
  search: "",
  region: "all",
  activeCats: new Set(),
};

/* ---------- Map setup ---------- */
const map = L.map("map", { zoomControl: true }).setView([39.65, -8.2], 7);

L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  maxZoom: 18,
}).addTo(map);

const markers = L.markerClusterGroup({
  maxClusterRadius: 45,
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
});
map.addLayer(markers);

/* ---------- Status resolution ------------------------------- */
function resolveStatus(event) {
  const now = Date.now();

  for (const ed of event.editions) {
    if (ed.past || ed.tba) continue;
    const start = new Date(ed.start).getTime();
    const end = new Date(ed.end || ed.start).getTime() + DAY_MS - 1;
    if (start <= now && now <= end) {
      return { kind: "now", edition: ed };
    }
  }
  const future = event.editions
    .filter((ed) => !ed.past && !ed.tba && new Date(ed.start).getTime() > now)
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  if (future.length > 0) {
    return { kind: "next", edition: future[0] };
  }
  const tba = event.editions.find((ed) => ed.tba) || {};
  const live = LIVE[event.id] && LIVE[event.id].detected;
  return { kind: "tba", edition: tba, live };
}

function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
}

function whenText(status, event) {
  if (status.kind === "now") {
    return `Happening now — ends ${fmtDate(status.edition.end || status.edition.start)}`;
  }
  if (status.kind === "next") {
    const days = Math.max(0, Math.ceil((new Date(status.edition.start) - Date.now()) / DAY_MS));
    const range = status.edition.end
      ? `${fmtDate(status.edition.start)} → ${fmtDate(status.edition.end)}`
      : fmtDate(status.edition.start);
    return `${range} · in ${days} day${days === 1 ? "" : "s"}`;
  }
  if (status.live && status.live.startDate > Date.now()) {
    return `Auto-detected: ${fmtDate(new Date(status.live.startDate).toISOString())} — verify on official site`;
  }
  return `Next edition: ${status.edition.expected || "to be announced"}`;
}

function activeLocation(event, status) {
  if (status.edition && !status.edition.tba && status.edition.lat) return status.edition;
  if (status.live && status.live.reuseLocation && status.live.reuseLocation.lat) return status.live.reuseLocation;
  return event.defaultVenue;
}

function ticketsUrl(event, status) {
  return (status.edition && status.edition.ticketsUrl) || event.ticketsUrl || null;
}

function badge(text, cls) {
  return `<span class="badge ${cls}">${text}</span>`;
}

function badgeHtml(status) {
  if (status.kind === "now") return badge("● HAPPENING NOW", "now");
  if (status.kind === "next") return badge("Next edition", "next");
  return badge("Dates TBA", "tba");
}

/* ---------- Markers & popups -------------------------------- */
function primaryCategory(event) {
  return event.categories.find((c) => CATEGORIES[c]) || "gaming";
}

function pinIcon(event, status) {
  const cat = CATEGORIES[primaryCategory(event)];
  const live = status.kind === "now" ? " live-pulse" : "";
  return L.divIcon({
    className: "",
    html: `<div class="marker-pin live${live}" style="--pin-color:${cat.color}"><span>${cat.icon}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  });
}

function popupHtml(event) {
  const status = resolveStatus(event);
  const loc = activeLocation(event, status);
  const cats = event.categories
    .filter((c) => CATEGORIES[c])
    .map((c) => `${CATEGORIES[c].icon} ${CATEGORIES[c].label}`)
    .join(" · ");
  const tickets = ticketsUrl(event, status);
  return `
    <b>${CATEGORIES[primaryCategory(event)].icon} ${event.name}</b>
    <div class="pop-meta">${badgeHtml(status)} ${whenText(status, event)}</div>
    <div class="pop-meta">📍 ${loc.venue}, ${loc.city}</div>
    <div class="pop-meta">${cats}</div>
    <p style="margin:6px 0">${event.desc}</p>
    ${tickets ? `<a class="pop-link" href="${tickets}" target="_blank" rel="noopener">🎟️ Tickets ↗</a>&nbsp;` : ""}
    <a class="pop-link" href="${event.newsUrl || event.site}" target="_blank" rel="noopener">📰 News ↗</a>
    &nbsp;
    <a class="pop-link" href="https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}" target="_blank" rel="noopener">Directions ↗</a>
  `;
}

/* ---------- UI: category chips ------------------------------- */
const catFiltersEl = document.getElementById("category-filters");
const allChip = document.createElement("button");
allChip.className = "cat-chip active";
allChip.textContent = "All";
allChip.onclick = () => {
  state.activeCats.clear();
  syncChips();
  render();
};
catFiltersEl.appendChild(allChip);

for (const [key, cat] of Object.entries(CATEGORIES)) {
  const chip = document.createElement("button");
  chip.className = "cat-chip";
  chip.dataset.cat = key;
  chip.innerHTML = `<span class="dot" style="background:${cat.color}"></span>${cat.icon} ${cat.label}`;
  chip.onclick = () => {
    state.activeCats.has(key) ? state.activeCats.delete(key) : state.activeCats.add(key);
    syncChips();
    render();
  };
  catFiltersEl.appendChild(chip);
}

function syncChips() {
  document.querySelectorAll(".cat-chip").forEach((el) => {
    if (el === allChip) {
      el.classList.toggle("active", state.activeCats.size === 0);
    } else {
      el.classList.toggle("active", state.activeCats.has(el.dataset.cat));
    }
  });
}

/* ---------- Filtering / rendering ---------------------------- */
function matchesFilters(event) {
  if (state.activeCats.size > 0 && !event.categories.some((c) => state.activeCats.has(c))) return false;
  if (state.region !== "all" && REGIONS[event.id] !== state.region && REGIONS[event.id] !== "all") return false;
  if (state.search) {
    const q = state.search.toLowerCase();
    const haystack = `${event.name} ${event.city} ${event.desc}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

const STATUS_ORDER = { now: 0, next: 1, tba: 2 };

function render() {
  markers.clearLayers();
  const listEl = document.getElementById("event-list");
  listEl.innerHTML = "";

  const visible = EVENTS
    .filter(matchesFilters)
    .map((event) => ({ event, status: resolveStatus(event) }))
    .sort((a, b) => {
      const rank = STATUS_ORDER[a.status.kind] - STATUS_ORDER[b.status.kind];
      if (rank !== 0) return rank;
      if (a.status.edition.start && b.status.edition.start) {
        return new Date(a.status.edition.start) - new Date(b.status.edition.start);
      }
      return a.event.name.localeCompare(b.event.name);
    });

  for (const { event, status } of visible) {
    const cat = CATEGORIES[primaryCategory(event)];
    const loc = activeLocation(event, status);
    const marker = L.marker([loc.lat, loc.lng], { icon: pinIcon(event, status) })
      .bindPopup(popupHtml(event))
      .on("click", () => selectEvent(event.id, false));
    marker._eventId = event.id;
    markers.addLayer(marker);

    const tickets = ticketsUrl(event, status);
    const when = whenText(status, event)
      + (status.edition && !status.edition.tba && status.edition.note ? ` — ${status.edition.note}` : "");
    const li = document.createElement("li");
    li.className = "event-card";
    li.id = `card-${event.id}`;
    li.style.borderLeftColor = cat.color;
    li.innerHTML = `
      <h3>${cat.icon} ${event.name}</h3>
      <p class="when-line">${badgeHtml(status)} <span>${when}</span></p>
      <p class="meta">📍 ${loc.venue}, ${loc.city}</p>
      <div class="cats">${event.categories
        .filter((c) => CATEGORIES[c])
        .map((c) => `<span class="cat-tag" style="background:${CATEGORIES[c].color}">${CATEGORIES[c].label}</span>`)
        .join("")}</div>
      <div class="card-actions">
        ${tickets ? `<a class="action-btn tickets" href="${tickets}" target="_blank" rel="noopener">🎟️ Tickets</a>` : ""}
        <a class="action-btn" href="${event.newsUrl || event.site}" target="_blank" rel="noopener">📰 News</a>
        <a class="action-btn" href="${event.site}" target="_blank" rel="noopener">🔗 Site</a>
      </div>
    `;
    li.addEventListener("click", (ev) => {
      if (ev.target.closest("a")) return;
      selectEvent(event.id, true);
    });
    listEl.appendChild(li);
  }

  document.getElementById("result-count").textContent =
    visible.length === 0
      ? "No events match — try clearing filters."
      : `${visible.length} series shown · sorted: happening now, next dates, TBA`;
}

function selectEvent(eventId, fly) {
  const event = EVENTS.find((e) => e.id === eventId);
  if (!event) return;

  document.querySelectorAll(".event-card").forEach((el) => {
    el.classList.toggle("selected", el.id === `card-${eventId}`);
  });
  const card = document.getElementById(`card-${eventId}`);
  if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });

  const status = resolveStatus(event);
  const loc = activeLocation(event, status);
  if (fly) {
    map.flyTo([loc.lat, loc.lng], 11, { duration: 0.8 });
  }
  markers.eachLayer((layer) => {
    if (layer._eventId === eventId) {
      markers.zoomToShowLayer(layer, () => layer.openPopup());
    }
  });
}

/* ---------- Controls ----------------------------------------- */
document.getElementById("search").addEventListener("input", (e) => {
  state.search = e.target.value.trim();
  render();
});

document.getElementById("region-filter").addEventListener("change", (e) => {
  state.region = e.target.value;
  render();
});

document.getElementById("list-toggle").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

/* ---------- Legend ------------------------------------------- */
const legendEl = document.getElementById("legend");
legendEl.innerHTML =
  '<div class="row"><strong>Legend</strong></div>' +
  Object.entries(CATEGORIES)
    .map(
      ([key, cat]) =>
        `<div class="row"><span class="dot" style="background:${cat.color}"></span>${cat.icon} ${cat.label}</div>`
    )
    .join("") +
  '<div class="row"><span class="pulse-dot"></span> Happening now</div>';

/* ---------- Init ---------------------------------------------- */
function initFooter() {
  const el = document.getElementById("last-updated");
  const checked = LIVE._meta && LIVE._meta.lastChecked;
  el.textContent =
    "Event series resolve to their CURRENT edition, otherwise the NEXT confirmed one. " +
    (checked ? `Sources last auto-checked: ${checked}. ` : "") +
    "Dates can move — confirm on the official site. Add series in data.js.";
}

function initPortals() {
  const wrap = document.getElementById("live-portals");
  if (!wrap) return;
  wrap.innerHTML = LIVE_PORTALS.map(
    (p) => `<a href="${p.url}" target="_blank" rel="noopener">${p.name}</a>`
  ).join(" · ");
}

fetch("data/live.json", { cache: "no-store" })
  .then((r) => (r.ok ? r.json() : {}))
  .then((json) => {
    LIVE = json || {};
  })
  .catch(() => {})
  .finally(() => {
    initFooter();
    initPortals();
    render();
  });
