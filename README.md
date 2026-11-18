[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) [![make.fun best-game-01](https://img.shields.io/badge/make.fun-best--game--01-blue)](https://make.fun)

# CLEAR TO LAND — you are the tower

**A real-time air-traffic control game in one static page. Your hands never leave the sky: click any plane, drag its route across the chart, stack it into one of three altitude bands, thread it between warnings, and put it on the right cone — while the departure board fills behind you.**

Nine shifts over Kestrel Field. Arrivals stream in from twelve gates; departures wait on two strips. Every plane is yours to route, every second: drawn paths, band changes, speed orders and holds, against wind that pushes, gusts that shove, fog that swallows the chart, low fuel that becomes a MAYDAY glide, and tower orders that pay for streaks, chains and clean sheets. Three incidents cost a star each — lose all three and the tower closes. Between shifts, draft one of twelve tower upgrades from a set of three: a second runway heading, a seaplane dock, tighter separation, longer tanks, a stricter tower. Then the sky gets busier.

## The loop (always in your hands)

- **Draw the route** — click a plane, drag a path through the entry fixes to its cone: runway A or B by heading, the seaplane dock on the bay, or the helipad. The route is drawn on the chart as you drag it.
- **Stack the sky** — three altitude bands (LOW / MID / HIGH) are your separation tool: same-band planes inside the warning ring flash amber; inside the incident ring they cost a star. Keys 1/2/3 or the band buttons.
- **Work the board** — departures queue at the strips: SPACE launches the next one out to its exit gate. Arrivals left uncontrolled wander off the chart and cost score.
- **Ride the weather** — a live wind vector drifts every plane; gust fronts sweep the chart shoving what they cross; fog banks hide planes (their tags still show); shift 9 is THE GALE WALL.
- **Answer the tower** — ten order kinds (streaks, jumbo chains, no-warning windows, launch quotas, MAYDAY saves) with deadlines and payouts, shown in the orders panel.
- **Survive the emergencies** — fuel burns in the air; at reserve a plane calls MAYDAY and glides on a fixed descent, losing speed and options. Land it first.

## Contents

- 5 plane classes (prop, regional jet, jumbo, seaplane, helicopter) with distinct speed, turn, fuel and scoring
- 12 entry gates, 6 entry fixes, 2 runways, a seaplane dock and a helipad; a chart with a mountain (2,140 ft — LOW band crashes into it), a lake, towns, woods and a bay
- 9 named shifts with forecast cards + endless NIGHT FREQUENCY mode; 3 difficulties
- Separation model with warning/incident rings, near-miss bonuses, controlled-exit rules
- 12-upgrade draft (pick 1 of 3 between shifts), 12 feats, letter grades S–D
- Tower log ticker, floating score callouts (capped, priority-queued), full results plaque with per-shift rows, records and next goal
- Persistent bests, shift history, settings and feats (localStorage), WebAudio synth: radios, wind, warning pings, a three-note motif
- Fully deterministic: seeded streams for traffic, weather, orders and draft — the same seed replays the same sky, verified by headless replays
- The relief-pilot bot that flies the title screen is the same one used to verify every system headlessly

## Play

Open `game/index.html` in any modern browser — no build, no server, no assets: everything is drawn and synthesised in code. Or run `node serve.ts` and visit localhost.

**Controls:** click select · drag draw route · 1/2/3 altitude band · W/S or Q/E speed · H hold · SPACE launch departure · TAB next plane · P pause · M mute.

## Verification

The build was greybox-tested before it was pretty: headless runs of the real simulation assert determinism (same seed, same score, three difficulties), separation behaviour (warnings precede incidents), bot landings and shift clears, results reachability, and endless-mode termination. Screenshots are real states of the real simulation, staged by the relief bot — nothing is drawn by hand for the camera.

## Layout

- `game/index.html`, `game/style.css` — the page
- `game/src/` — 31 modules: simulation (rng, config, field, planes, weather, conflicts, orders, traffic, draft, feats, save, audio, sim, bot, titledemo, input, testhook) and rendering (layout, fit, icons, terrain, routes, planes, weatherfx, fx, banner, hud, title, draft, results, almanac, howto)
- `main.ts` — dossier builder · `serve.ts` — tiny static server · `screenshots/` — the four staged shots
