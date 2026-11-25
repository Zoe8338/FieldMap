#!/usr/bin/env node
/* Daily refresh: re-checks each event series' `checkUrl`, extracts still-valid
   upcoming date ranges from the page HTML, and writes data/live.json.
   Zero dependencies — Node 18+ (global fetch). Results are auto-detected
   candidate dates ONLY: the app labels them as such until a human confirms. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// data.js is a plain script; evaluate it to read EVENTS.
const dataSrc = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
const EVENTS = new Function(`${dataSrc}; return EVENTS;`)();

const MONTHS = {
  jan: 0, fev: 1, feb: 1, mar: 2, abr: 3, apr: 3, mai: 4, may: 4, jun: 5,
  jul: 6, ago: 7, aug: 7, set: 8, sep: 8, out: 9, oct: 9, nov: 10, dez: 11, dec: 11,
};

function parseDateRanges(text) {
  const ranges = [];
  const re =
    /(\d{1,2})(?:\s*(?:e|a|to|–|-|—)\s*(\d{1,2}))?\s*(?:de\s+)?([a-zç]{3})[a-zç]*\.?(?:\s+de)?\s+(\d{4})/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const month = MONTHS[m[3].toLowerCase()];
    if (month === undefined) continue;
    const year = parseInt(m[4], 10);
    const dayA = parseInt(m[1], 10);
    const dayB = m[2] ? parseInt(m[2], 10) : dayA;
    if (dayA < 1 || dayA > 31 || dayB < dayA) continue;
    const start = new Date(Date.UTC(year, month, dayA));
    const end = new Date(Date.UTC(year, month, dayB));
    if (start > new Date()) ranges.push({ startDate: start.toISOString(), endDate: end.toISOString() });
  }
  return ranges;
}

async function check(event) {
  try {
    const res = await fetch(event.checkUrl, {
      headers: { "User-Agent": "FieldMap-refresh/1.0 (+https://github.com/Zoe8338/FieldMap)" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { ok: false, httpStatus: res.status };
    const html = (await res.text()).replace(/<[^>]+>/g, " ");
    const ranges = parseDateRanges(html);
    return { ok: true, httpStatus: res.status, ranges: ranges.slice(0, 5) };
  } catch (err) {
    return { ok: false, error: String(err && err.message).slice(0, 120) };
  }
}

(async () => {
  const live = { _meta: { lastChecked: new Date().toISOString().slice(0, 16) + "Z" } };
  for (const event of EVENTS) {
    if (!event.checkUrl) continue;
    const result = await check(event);
    const status = resolveStatus(event);
    const interesting =
      (status.kind === "tba" || status.kind === "now") && result.ok && result.ranges.length > 0;
    live[event.id] = {
      checked: result.ok,
      httpStatus: result.httpStatus,
      detected: interesting ? { ...result.ranges[0], reuseLocation: event.defaultVenue } : undefined,
    };
    console.log(`${event.id}: ${result.ok ? "ok" : "FAIL"}${result.ranges ? `, ${result.ranges.length} range(s)` : ""}` +
      (interesting ? " → DETECTED " + JSON.stringify(result.ranges[0]) : ""));
  }

  const outPath = path.join(__dirname, "..", "data", "live.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(live, null, 2) + "\n");
  console.log("Wrote", outPath);

  // resolveStatus helper (mirrors app.js subset)
  function resolveStatus(event) {
    const now = Date.now();
    for (const ed of event.editions) {
      if (ed.past || ed.tba) continue;
      const start = new Date(ed.start).getTime();
      const end = new Date(ed.end || ed.start).getTime() + 86400000 - 1;
      if (start <= now && now <= end) return { kind: "now", edition: ed };
    }
    const future = event.editions.filter((ed) => !ed.past && !ed.tba && new Date(ed.start).getTime() > now);
    if (future.length) return { kind: "next", edition: future[0] };
    return { kind: "tba", edition: event.editions.find((ed) => ed.tba) || {} };
  }
})();
