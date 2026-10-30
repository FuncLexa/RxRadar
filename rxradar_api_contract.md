# RxRadar — API Contract (v1)

Team FuncLexa · Swim with TinyFish · Finale 30 Oct 2026

Backend: FastAPI (Adnan) · Frontend: React + Vite + Tailwind (Sultan)
Base URL (local): `http://localhost:8000`

---

## Key design decisions (from agent tests, 29 Oct)

- **3 pharmacies only:** PharmEasy (TinyFish fetch, ~3 s), 1mg and Apollo (TinyFish browser agents, 1.5–3.5 min). Netmeds dropped (returned no results).
- **Search by salt, not brand.** Every medicine is identified by `salt` + `strength`.
- **TinyFish runs ~2 agents at a time.** So:
  - PharmEasy (fetch) prices **every** medicine — fast and free.
  - 1mg + Apollo agents run **only for the hero medicine** (the one with the biggest gap), in parallel.
- **Live browser view:** each agent emits a `streaming_url` (live preview of the browser). Frontend tries to show it in an iframe; if it won't embed, show a "Watch live" link + status card.
- **Replay mode:** same endpoints, same events, served from a saved run. The UI must not care which mode it is in.
- **Progressive results (latency fix):** `summary` is sent after **every** `price_result`, not once at the end. PharmEasy answers in ~3 s, so a first savings number is on screen in ~5 s; 1mg and Apollo then refine it. The last summary has `"final": true`.

---

## 1. Health

`GET /api/health` → `{ "ok": true, "mode": "live" | "replay" }`

---

## 2. Start a search

`POST /api/search`

Request:
```json
{
  "pincode": "560064",
  "mode": "live",
  "medicines": [
    { "brand": "Jalra M", "salt": "vildagliptin+metformin", "strength": "50mg/500mg", "per_day": 2, "hero": true },
    { "brand": "Novastat 10", "salt": "rosuvastatin", "strength": "10mg", "per_day": 1 },
    { "brand": "Thyronorm 50", "salt": "levothyroxine", "strength": "50mcg", "per_day": 1 }
  ]
}
```
- `mode`: `"live"` (real TinyFish runs) or `"replay"` (cached run).
- `hero`: exactly one medicine; it gets the 1mg + Apollo agent runs.

Response:
```json
{ "search_id": "srch_7f3a9c" }
```

---

## 3. Live event stream (Server-Sent Events)

`GET /api/search/{search_id}/stream`

Content-Type: `text/event-stream`. Each message: `event: <type>` + `data: <json>`.

Frontend: `const es = new EventSource(url); es.addEventListener("agent_status", ...)`

### Event types (in roughly this order)

**`search_started`**
```json
{ "search_id": "srch_7f3a9c", "pharmacies": ["pharmeasy", "1mg", "apollo"], "medicines": [ ...same as request... ] }
```

**`agent_status`** — fires many times per agent
```json
{
  "pharmacy": "apollo",
  "salt": "vildagliptin+metformin",
  "status": "queued | starting | browsing | extracting | done | failed | timeout",
  "message": "Searching Apollo for vildagliptin + metformin",
  "elapsed_ms": 42000
}
```
`message` = TinyFish progress step text — show it under the card as a live ticker.

**`agent_live_url`** — once per browser agent (not PharmEasy)
```json
{ "pharmacy": "1mg", "salt": "vildagliptin+metformin", "streaming_url": "https://..." }
```

**`price_result`** — one per pharmacy × medicine when data arrives
```json
{
  "pharmacy": "apollo",
  "salt": "vildagliptin+metformin",
  "strength": "50mg/500mg",
  "products": [
    { "name": "Jalra-M 50 mg/500 mg Tablet", "pack_qty": 15, "price": 326.00, "mrp": 380.00, "per_unit": 21.73, "salt_match": true },
    { "name": "Vilcrown Met 50 mg/500 mg Tablet", "pack_qty": 15, "price": 116.26, "mrp": 168.50, "per_unit": 7.75, "salt_match": true }
  ]
}
```
- `per_unit` = price ÷ pack_qty (₹ per tablet), 2 decimals.
- `salt_match: false` → product rejected by the validator (wrong salt/strength). UI shows it greyed + struck through ("Rejected: different strength") — this visibly proves the validator works.

**`summary`** — sent after EVERY `price_result` (progressive), recomputed from all prices received so far. The last one has `"final": true`.
```json
{
  "final": true,
  "sources_done": ["pharmeasy", "1mg", "apollo"],
  "swaps": [
    {
      "salt": "vildagliptin+metformin",
      "strength": "50mg/500mg",
      "allowed": true,
      "current":  { "name": "Jalra-M", "pharmacy": "apollo", "per_unit": 21.73 },
      "cheapest": { "name": "Vilcrown Met", "pharmacy": "apollo", "per_unit": 7.75 },
      "monthly_saving": 838.80,
      "annual_saving": 10065.60
    }
  ],
  "flags": [
    { "salt": "levothyroxine", "type": "NTI", "message": "Narrow therapeutic index — brand switching not advised. Consult your doctor." }
  ],
  "totals": {
    "current_monthly": 1877.70,
    "optimised_monthly": 809.70,
    "monthly_saving": 1068.00,
    "annual_saving": 12816.00
  },
  "coverage": { "pharmeasy": "all", "1mg": "hero_only", "apollo": "hero_only" }
}
```
- Monthly = `per_unit × per_day × 30`. Annual = monthly × 12.
- `allowed: false` swaps (NTI drugs) never count toward savings.
- `final: false` → more agents still running; UI shows "Refining… N agents still searching" and animates the money to each new value.
- If the user's brand price isn't found yet, `current.per_unit` is `null`, savings for that swap are 0, and a `note` string explains it (e.g. "Jalra M 50/500 not listed on PharmEasy — agents checking 1mg & Apollo"). UI shows the note instead of a saving.
- `sources_done` lists pharmacies whose results are already included.

**`done`** → `{ "search_id": "srch_7f3a9c", "duration_ms": 118000 }`

**`error`** → `{ "pharmacy": "1mg" | null, "message": "..." }` — a pharmacy error must NOT end the stream; other agents continue.

---

## 4. Refill monitor

`POST /api/monitor`

Request:
```json
{ "search_id": "srch_7f3a9c", "salt": "vildagliptin+metformin", "pharmacy": "pharmeasy", "target_per_unit": 9.48 }
```
Response:
```json
{ "monitor_id": "mon_12ab", "schedule": "daily 9:00 AM", "status": "active" }
```

---

## 5. Replay

`GET /api/replay/latest` → `{ "search_id": "srch_replay" }`, then use the normal `/stream` URL. Events are replayed with their original timing (optionally sped up).

---

## Rules

- All money in ₹, numbers not strings, 2 decimals.
- Pharmacy ids are exactly: `pharmeasy`, `1mg`, `apollo`.
- Salt ids are lowercase, `+` between combined salts.
- Frontend must render correctly if any agent ends in `failed` / `timeout` — card shows "Unavailable", summary still shows.
