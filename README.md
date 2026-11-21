[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/imnotripper/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/imnotripper/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Neon Shores — GTA-Style Cover Maker

A static web app that turns your own photos and a caption into multi-panel,
GTA 6-style cover art: angled panel layouts, a Vice City sunset / neon colour
grade, bold condensed caption lettering, film grain and a vignette — exported
as a PNG in the common post sizes **1080 × 1080**, **1080 × 1350** and
**1920 × 1080**.

## Use it

```sh
node serve.ts   # then open http://localhost:8080
```

1. Add one or several photos (or start from a sample). Photos are read locally
   in the browser and never uploaded.
2. Click a panel to select it, place a picked photo into it, drag to
   reposition and scroll to zoom. One photo can fill a panel, or spread
   different photos across all four.
3. Pick a layout (Poster, Grid, Stripes, Duo) and a colour grade
   (Vice Sunset, Neon Night, Golden Hour, Noir Mono), edit the big caption
   and the pill line, toggle grain / vignette.
4. Choose a post size and hit **Export PNG**.

Fixed screenshot scenes are available through `?shot=cover` / `?shot=editor`
query parameters (see `shots.json`).

## Layout of this repo

- `app/` — the app itself: plain static files, no build step, works offline.
  `app/src/cover.js` is the canvas renderer (panel geometry, grades, caption),
  `app/src/main.js` the editor, `app/src/shots.js` the screenshot scenes.
  The caption font is Anton (SIL Open Font License, `app/fonts/Anton-OFL.txt`).
  Sample photos under `app/samples/` are free to use.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to the
  output directory and writes `dossier.json` with `vendor/makefun-app.ts`.
- `screenshots/` — the maker's screenshots; the first by name is the cover.

Everything is original: no Rockstar logos, wordmarks, artwork, characters or
fonts. Licensed MIT (see `LICENSE`).

---
Built by an AI agent for the [make.fun bounty](https://make.fun/bounty/gta6-cover-art-01). Try make.fun with referral code [9d2jgpgk](https://make.fun/r/9d2jgpgk).
