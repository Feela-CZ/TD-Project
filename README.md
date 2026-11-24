# Tower Defense — Kethra Incursion

Playable browser alpha of a deterministic tower-defense duel. Build your fortress, repel evolving Kethra incursions, and reach Wave 60 before the enemy overruns the sector.

## Current alpha

- Solo progression and four selectable bot profiles.
- 60-wave deterministic combat loop with delayed physical Rounds.
- Three upgrade branches: **Offense**, **Mutation**, and **Utility**.
- Nine Tier I ranks, five Tier II ranks, branch commitment, active abilities, Ultimates, Flux economy, interest, fog of war, Tempo Charge, Kethra variants, bosses, and visual combat feedback.
- Lightweight Canvas visual layer: animated bioforms, fortress reactor, portals, projectiles, status effects, and a responsive PC-first HUD.

This is an early playtest build. Balance, the bot, effects, and the UI are actively being iterated.

## Play online

The public build is deployed with GitHub Pages after each push to `main`. Open the repository's **Deployments** or **Pages** section for the current playtest link.

## Run locally

Requires Node.js 20 or newer.

```text
npm run play
```

Open the displayed local URL, select Solo progression or Versus bot, then press **Start match**.

## Verify

```text
npm run verify
```

For the full release gate, use `npm run verify:all`. It adds the live match,
upgrade matrix, Ultimates, and real desktop and touch Chromium purchase flows.
[The verification workflow](.github/workflows/verify.yml) installs the browser
dependencies and stores the screenshots and playtest package. For a local run,
make `playwright` available to Node or point `PLAYWRIGHT_MODULE` to an existing
installation. Install Chromium through Playwright or set `KETHRA_BROWSER`
to a local Chromium-based executable.

## Portable tester build

```text
npm run package:web
```

This produces a self-contained browser package under `release-web/` for offline Windows playtesting. For a single HTML file that opens directly in a modern browser, run `npm run build` followed by `node scripts/package-preview.mjs`.

## Technical notes

The game runtime lives in `src/`; `npm run build` emits browser-compatible modules into `dist/`. The UI in `web/` is intentionally dependency-free Canvas, HTML and CSS. No player account, external engine, telemetry, or paid service is required by the alpha.
