# FieldMap

An interactive map webapp that tracks **geek events across Portugal** — anime & manga conventions, cosplay contests, gaming expos, comics (BD) fairs, art/merch markets, airsoft milsims, tabletop/RPG meetups and sci-fi/fantasy film festivals.

## ✨ Features

- 🗺️ **Interactive Leaflet map** (dark CARTO tiles) with clustered, color-coded emoji pins — pins **pulse** when an event is happening right now
- 🗓️ **Edition-aware**: every series resolves to its **current edition** (if it's on right now), otherwise the **next confirmed edition**, otherwise a **TBA** placeholder with the expected window. Past editions remain visible with notes (e.g. Iberanime → "next: Santarém, 15–16 May 2027, tickets open").
- 🎟️ **Tickets & news buttons** on every card and popup — straight to the official ticket desk and news/guests page for the active edition
- ⏱️ **Countdowns** ("in 172 days") and **HAPPENING NOW** badges, list auto-sorted by status
- 🏷️ **Category filter chips** — Anime & Manga, Cosplay, Gaming, Comics & BD, Art & Market, Airsoft, Tabletop & RPG, Sci-Fi & Film, Retro
- 📍 **Region filter**, 🔍 text search, 📱 responsive mobile layout
- 🤖 **Daily auto-check**: a scheduled GitHub Action runs `scripts/refresh.mjs`, re-fetches each event's official page, extracts upcoming date ranges, and commits `data/live.json` — TBA series then show "auto-detected" dates (clearly flagged for verification)
- 🔗 Links to **live calendars** for fast-moving scenes (JogarAirsoft, Plairsoft, Roster Con)

## 🚀 Run it

No build step, no dependencies — fully static:

```bash
python3 -m http.server 8080    # or just open index.html
# visit http://localhost:8080
```

## 🗂️ Project structure

| File | Purpose |
|------|---------|
| `index.html` | App shell, loads Leaflet + marker clustering from CDN |
| `styles.css` | Dark "geek" theme, badges, live-pulse pins |
| `data.js` | Event **series** + their **editions** (past / current / next / TBA), tickets & news URLs |
| `app.js` | Map, status resolution, filters, list/map sync, `data/live.json` merge |
| `scripts/refresh.mjs` | Daily date-check scraper (Node 18+, zero deps) |
| `.github/workflows/refresh-data.yml` | Runs the checker daily and commits `data/live.json` |
| `data/live.json` | Auto-detected dates snapshot (read by the app at runtime) |

## ➕ Add a series

Append an object to `EVENTS` in `data.js`:

```js
{
  id: "unique-id",
  name: "Event Name",
  city: "City",
  categories: ["gaming"],           // keys from CATEGORIES in app.js
  site: "https://official-site",    // main website
  newsUrl: "https://news-page",     // latest news / guests / programme
  checkUrl: "https://official-site",// page for the daily auto-check
  desc: "One or two sentences.",
  defaultVenue: { venue: "Venue", city: "City", lat: 39.12, lng: -8.56 },
  editions: [
    { label: "City 2027", start: "2027-05-15", end: "2027-05-16",
      venue: "Venue", city: "City", lat: 39.12, lng: -8.56,
      confirmed: true,
      ticketsUrl: "https://tickets.example" },
    // no dates yet?
    { label: "Next edition", tba: true, expected: "Spring 2027 (to be announced)" },
  ],
}
```

The app automatically picks the active/next edition, pins it, counts down to it, and swaps in the TBA card when a series has no confirmed dates.

## ⚠️ Data honesty

Auto-detected dates are **candidates, not confirmations** — they're always labelled and linked back to the official site. Airsoft and community events rotate weekly; for those, the sidebar links live calendars (JogarAirsoft, Plairsoft).

## Attribution

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, tiles © [CARTO](https://carto.com/). Map engine: [Leaflet](https://leafletjs.com/) + [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster).
