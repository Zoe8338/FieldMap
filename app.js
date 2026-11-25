/* Geek Events Portugal — map logic (Leaflet + marker clustering). */

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
  "iberanime-opo": "norte",
  "iberanime-lx": "lisboa",
  "comic-con-portugal": "norte",
  "lisboa-games-week": "lisboa",
  leiriacon: "centro",
  "amadora-bd": "lisboa",
  "maia-bd": "norte",
  "coimbra-bd": "centro",
  gtc: "centro",
  fantasporto: "norte",
  monstra: "lisboa",
  "apacorp-bunker": "lisboa",
  "apacorp-invictus": "lisboa",
  "apacorp-apex": "alentejo",
  "apacorp-endurance": "algarve",
  portoardgamers: "norte",
};

/* Typical months for the "Upcoming window" toggle. Events without a
   confirmed yearly window (season-based airsoft, community gatherings)
   are always shown. */
const TYPICAL_MONTHS = {
  "iberanime-opo": [5, 6],
  "iberanime-lx": [3, 4, 5],
  "comic-con-portugal": [9, 10, 11, 12],
  "lisboa-games-week": [10, 11, 12],
  leiriacon: [3, 4, 5],
  "amadora-bd": [9, 10, 11],
  "maia-bd": [3, 4, 5, 6],
  "coimbra-bd": [9, 10, 11],
  fantasporto: [1, 2, 3],
  monstra: [2, 3],
};

const state = {
  search: "",
  region: "all",
  activeCats: new Set(),
  upcomingOnly: true,
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

function primaryCategory(event) {
  return event.categories.find((c) => CATEGORIES[c]) || "gaming";
}

function pinIcon(event) {
  const cat = CATEGORIES[primaryCategory(event)];
  return L.divIcon({
    className: "",
    html: `<div class="marker-pin" style="background:${cat.color}"><span>${cat.icon}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  });
}

function popupHtml(event) {
  const cats = event.categories
    .filter((c) => CATEGORIES[c])
    .map((c) => `${CATEGORIES[c].icon} ${CATEGORIES[c].label}`)
    .join(" · ");
  const lat = event.lat;
  const lng = event.lng;
  return `
    <b>${event.name}</b>
    <div class="pop-meta">📍 ${event.venue}, ${event.city}</div>
    <div class="pop-meta">🗓️ ${event.when}</div>
    <div class="pop-meta">👥 ${event.size}</div>
    <div class="pop-meta">${cats}</div>
    <p style="margin:6px 0">${event.desc}</p>
    <a class="pop-link" href="${event.site}" target="_blank" rel="noopener">Official site ↗</a>
    &nbsp;
    <a class="pop-link" href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" rel="noopener">Directions ↗</a>
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
  if (
    state.activeCats.size > 0 &&
    !event.categories.some((c) => state.activeCats.has(c))
  ) {
    return false;
  }
  if (state.region !== "all" && REGIONS[event.id] !== state.region) return false;
  if (state.upcomingOnly && !isUpcoming(event)) return false;
  if (state.search) {
    const q = state.search.toLowerCase();
    const haystack = `${event.name} ${event.city} ${event.venue} ${event.desc}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

function isUpcoming(event) {
  const months = TYPICAL_MONTHS[event.id];
  if (!months) return true;
  return months.includes(new Date().getMonth() + 1);
}

function render() {
  markers.clearLayers();
  const listEl = document.getElementById("event-list");
  listEl.innerHTML = "";

  const visible = EVENTS.filter(matchesFilters);

  for (const event of visible) {
    const marker = L.marker([event.lat, event.lng], { icon: pinIcon(event) })
      .bindPopup(popupHtml(event))
      .on("click", () => selectEvent(event.id, false));
    marker._eventId = event.id;
    markers.addLayer(marker);

    const cat = CATEGORIES[primaryCategory(event)];
    const li = document.createElement("li");
    li.className = "event-card";
    li.id = `card-${event.id}`;
    li.style.borderLeftColor = cat.color;
    li.innerHTML = `
      <h3>${cat.icon} ${event.name}</h3>
      <p class="meta">📍 ${event.city}</p>
      <p class="meta">🗓️ ${event.when}</p>
      <div class="cats">${event.categories
        .filter((c) => CATEGORIES[c])
        .map((c) => `<span class="cat-tag" style="background:${CATEGORIES[c].color}">${CATEGORIES[c].label}</span>`)
        .join("")}</div>
      <a class="site-link" href="${event.site}" target="_blank" rel="noopener">Official site ↗</a>
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
      : `${visible.length} event${visible.length === 1 ? "" : "s"} shown`;
}

function selectEvent(eventId, fly) {
  const event = EVENTS.find((e) => e.id === eventId);
  if (!event) return;

  document.querySelectorAll(".event-card").forEach((el) => {
    el.classList.toggle("selected", el.id === `card-${eventId}`);
  });
  const card = document.getElementById(`card-${eventId}`);
  if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });

  if (fly) {
    map.flyTo([event.lat, event.lng], 11, { duration: 0.8 });
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

const btnUpcoming = document.getElementById("btn-upcoming");
const btnAll = document.getElementById("btn-all");
btnUpcoming.addEventListener("click", () => {
  state.upcomingOnly = true;
  btnUpcoming.classList.add("active");
  btnAll.classList.remove("active");
  render();
});
btnAll.addEventListener("click", () => {
  state.upcomingOnly = false;
  btnAll.classList.add("active");
  btnUpcoming.classList.remove("active");
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
    .join("");

/* ---------- Init ---------------------------------------------- */
document.getElementById("last-updated").textContent =
  "Data last reviewed: " + new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }) +
  ". Found something missing? Add it to data.js — each event is 15 lines of JSON.";

render();
