# Sultan — RxRadar Frontend Master Prompt

How to use:
1. Create an empty folder `rxradar-web`, put `rxradar_api_contract.md` and `rxradar_mock_events.json` inside it.
2. Open it in Claude Code / Copilot agent. Paste everything below the line in ONE message.
3. The agent stops after each phase. Check the "You verify" list in the browser, then reply `continue`.
4. Do NOT skip a failed check. Reply with what's wrong instead.

---

You are building the frontend for **RxRadar**, a hackathon project for the "Swim with TinyFish" finale. RxRadar takes a prescription and pincode, runs TinyFish web agents across Indian pharmacies (PharmEasy, 1mg, Apollo) in parallel, and shows the cheapest same-salt options and yearly savings.

Read `rxradar_api_contract.md` and `rxradar_mock_events.json` in this folder first. They are the source of truth for every data shape. Do not invent fields.

## Hard rules
- Stack: **Vite + React + Tailwind only.** No other UI libraries, no state libraries, no chart libraries. `lucide-react` for icons is allowed.
- **Mock mode only** until I say otherwise. No real network calls.
- Build a single data layer `src/lib/stream.js` exporting `startSearch(request, handlers)`. In mock mode it replays `rxradar_mock_events.json` events using each `delay_ms`, calling `handlers[eventName](data)`. Later, live mode will swap to `EventSource` on `/api/search/{id}/stream` — design so only this file changes.
- Must look right on a 1366×768 laptop screen projected in a hall: large type, high contrast, nothing tiny.
- No placeholder text like "Lorem ipsum" or "₹X".
- After each phase: run `npm run dev`, fix any console errors, then STOP and print a short "You verify" checklist. Wait for me to reply `continue`.

## Design
Light theme to match our pitch deck:
- Background ivory `#FAF7F0`, text ink `#14213D`, primary blue `#1D5BF0`, highlight yellow `#FFD84D`, success green `#1F9D55`, danger red `#D64545` (only for rejected/failed).
- Font: Inter (Google Fonts). Big bold numbers for money.
- Cards: white, 12px radius, subtle border, no heavy shadows.
- App name "RxRadar" top-left, tagline "Same medicine. Up to 68% cheaper." small next to it. Small "Powered by TinyFish web agents" badge top-right.

## Phase 1 — Scaffold
- Vite React app, Tailwind configured, Inter loaded, colour tokens in Tailwind config.
- `src/lib/stream.js` with mock replay + a speed multiplier (default 1×, support 3× for rehearsals).
- Single page layout with three empty sections: Input (top), Agents (middle), Results (bottom).

You verify: page loads, fonts/colours correct, no console errors.

## Phase 2 — Prescription input
- Pincode field (default `560064`).
- Medicine rows: brand, salt, strength, per day, "hero" radio (exactly one). Prefilled with the 3 medicines from the mock `request`.
- "+ Add medicine" and remove buttons.
- Big primary button **"Find cheapest prices"**. Clicking it calls `startSearch` and disables the form.
- Small toggle top-right: `Live / Replay` (stored in state, passed to `startSearch`; mock ignores it for now).

You verify: form prefilled, button starts the replay, form locks during run.

## Phase 3 — Live agent grid (the most important visual)
Three cards side by side: **PharmEasy · 1mg · Apollo**.
Each card shows:
- Pharmacy name + method badge: PharmEasy = "Fetch", 1mg/Apollo = "Browser agent".
- Status pill driven by `agent_status.status`: queued (grey) → starting/browsing/extracting (blue, animated pulse) → done (green ✓) → failed/timeout (red, "Unavailable").
- Live elapsed timer counting up while running.
- Ticker of the latest 3 `message` lines, newest on top, fading older ones.
- **Live view area** (16:9) for browser agents: when `agent_live_url` arrives, render it in an `<iframe>`. If the iframe fails or is blocked, show a "Watch live ↗" link opening it in a new tab. Before the URL arrives, show a skeleton with "Launching browser…". PharmEasy card shows "Instant fetch — no browser needed" instead.
- When `price_result` arrives for that pharmacy: list products under the card — name, ₹ per tablet (large), pack, price. Products with `salt_match: false` greyed, struck through, label "Rejected: wrong strength".

Above the grid: one line "3 agents searching live across Indian pharmacies".

You verify: all 3 cards animate through statuses at mock timing, rejected products are struck through, failed state renders if you edit a mock status to `failed`.

## Phase 4 — Savings result (progressive — this is our latency fix)
`summary` arrives MULTIPLE times (3 in the mock): first after PharmEasy (~5 s in), then after 1mg, then final after Apollo with `final: true`.
- Show the card on the FIRST summary — never wait for the final one.
- On every new summary, re-render and animate the money counting up/down from the old value to the new one (~800 ms).
- Show a toast when a swap's `cheapest` changes pharmacy, e.g. "1mg agent found a cheaper option" / "Apollo agent found your brand + a cheaper option".
- While `final` is false, show "Refining… N agents still searching" (N = 3 − `sources_done.length`) with a small spinner. When `final` is true, replace it with "✓ Checked 3 pharmacies".
- If a swap has `current.per_unit: null`, show its `note` text in place of the saving.

Card content:
- Hero number: **"You save ₹12,816 / year"** (from `totals.annual_saving`, formatted Indian style ₹12,816) with "₹1,068 / month" under it.
- One row per swap: `current.name (₹per_unit) → cheapest.name (₹per_unit) @ pharmacy`, saving per year on the right. Same-salt badge.
- `allowed: false` swaps: yellow warning card using the `flags` message ("Narrow therapeutic index — not switched"). Never show savings for them.
- Footer line: "Same salt, same strength only. Confirm with your pharmacist. RxRadar never auto-purchases."
- Small coverage note from `coverage` (e.g. "1mg & Apollo checked for Jalra M").

You verify: savings card appears ~5 s after clicking (₹2,750/yr), changes after 1mg, ends at exactly ₹12,816/yr with "✓ Checked 3 pharmacies"; NTI warning visible; the note shows for Jalra M until Apollo finishes.

## Phase 5 — Monitor button + polish
- Button **"Watch my refill price"** under the hero swap. In mock mode it waits 800 ms and shows a toast "Monitor active — daily 9:00 AM. We'll alert you on price drops." (shape from contract section 4).
- "Run again" button that resets the page.
- Full-screen readability pass at 1366×768: nothing overflows, money is the largest text on screen.

You verify: complete flow from click to monitor toast with no console errors, looks clean projected.

When all 5 phases pass, stop. Do NOT connect to a backend yet.
