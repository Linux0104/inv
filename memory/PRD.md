# LUNAR Inventory (FiveM NUI) — UI Redesign

## Problem statement
User asked (DE) to redesign the UI of a FiveM inventory to roughly match a provided
example image (a dark cyan/blue sci-fi "LOGISTICS TERMINAL" look — "LUNAR TRUCKER"),
while KEEPING the current size and layout/arrangement. Tech: plain HTML/CSS/JS (React NUI).

## Architecture
- FiveM NUI React app (webpack 5, react 17, jquery + jquery-ui for drag/drop).
- Source on git branch `origin/test`: src/App.jsx, Inventory.jsx, Hotbar.jsx + styles/*.css.
- Build output in dist/app.js (style-loader injects CSS at runtime).

## Done (2026-06 / Aug session)
- Restyled to the sci-fi terminal aesthetic WITHOUT changing any JS logic:
  - styles/index.css: design tokens (:root), fonts, transparent body + radial vignette.
  - styles/inventory.css: terminal panel (cyan top-accent line, faint grid texture),
    "> LUNAR" prompt title, mono uppercase labels, cyan weight readout, bordered
    inputs w/ cyan focus, item cards w/ cyan hover+selected, tabbed footer (active =
    cyan underline), terminal-style context menu with colored left accents.
  - styles/hotbar.css: matching dark slots w/ cyan hover glow.
  - src/index.html: fonts -> Chakra Petch (display) + JetBrains Mono (labels).
- Size (45vw x 70vh) and layout/arrangement kept identical per request.
- Rebuilt dist/ (yarn build).
- Verified visually via static preview screenshot (jquery-ui drag/drop can't init in
  this sandbox — environment-only, works in FiveM; no logic touched).

## Notes / backlog
- P2: could add matching styling for the "give player" list overlay if used.
