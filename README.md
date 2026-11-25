# FieldMap

An interactive map webapp that tracks **geek events across Portugal** — anime & manga conventions, cosplay contests, gaming expos, comics (BD) fairs, art/merch markets, airsoft milsims, tabletop/RPG meetups and sci-fi/fantasy film festivals.

![stack](https://img.shields.io/badge/stack-vanilla%20JS-orange) ![license-note](https://img.shields.io/badge/status-prototype-informational)

## ✨ Features

- 🗺️ **Interactive Leaflet map** (dark CARTO tiles) with clustered, color-coded emoji pins
- 🏷️ **Category filter chips** — Anime & Manga, Cosplay, Gaming, Comics & BD, Art & Market, Airsoft, Tabletop & RPG, Sci-Fi & Film, Retro
- 📍 **Region filter** — Norte, Centro, Lisboa, Alentejo, Algarve
- 🔍 **Text search** across event names, cities, venues and descriptions
- 🗓️ **"Upcoming window" toggle** — shows events that typically happen in the current month vs all recurring events
- 📋 **Clickable event list** synced with the map (fly-to + popup)
- 📱 **Responsive** — collapsible sidebar on mobile

## 🚀 Run it

No build step, no dependencies — it's a fully static site:

```bash
# Option 1: just open it
open index.html

# Option 2: serve it locally
python3 -m http.server 8080
# then visit http://localhost:8080
```

## 🗂️ Project structure

| File | Purpose |
|------|---------|
| `index.html` | App shell, loads Leaflet + marker clustering from CDN |
| `styles.css` | Dark "geek" theme, responsive layout |
| `data.js` | Event database — 16 verified recurring event series |
| `app.js` | Map init, filtering, rendering, list/map sync |

## ➕ Add an event

Append an object to the `EVENTS` array in `data.js`:

```js
{
  id: "unique-id",
  name: "Event Name",
  city: "City",
  venue: "Venue",
  categories: ["gaming"],   // see CATEGORIES in app.js
  when: "Typical period (annual)",
  size: "Small–medium",
  lat: 39.1234,
  lng: -8.5678,
  site: "https://official-site.example",
  desc: "One or two sentences.",
}
```

## ⚠️ Data honesty

Event dates shift year to year, so entries describe their **typical period** and always link the **official website** — confirm dates there before travelling. Live-calendars for fast-moving scenes (especially airsoft) are linked in the app sidebar: [JogarAirsoft](https://www.jogarairsoft.pt/), [Plairsoft](https://plairsoft.com/pt/), [Roster Con](https://www.rostercon.com/en/location/portugal-en).

## Attribution

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, tiles © [CARTO](https://carto.com/). Map engine: [Leaflet](https://leafletjs.com/) + [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster).
