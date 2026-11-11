# Exercise Library

A React + Three.js exercise library powered by the 435-animation [Desk Break](https://github.com/shlomorsh/desk-break) collection.

## Run

```bash
npm install
npm run dev
```

Create an optimized production build with `npm run build`. Verify the bundled data and every animation mapping with `npm run validate-library`.

## Design notes

- Before GIFs exist, the library uses a shared, scissor-rendered WebGL canvas as a live-preview fallback. After GIF generation, cards use local GIF assets and no thumbnail WebGL renderer is started.
- The detailed page uses its own interactive Three.js scene with OrbitControls: drag to orbit, scroll to zoom, and right-drag to pan.
- Calorie estimates are intentionally approximate. `src/data/calorieEstimates.ts` centralizes MET values (broad comparisons to the [2024 Adult Compendium](https://pacompendium.com/)), the reference 70 kg weight, set-duration parsing, and the formula.

## Asset attribution

The 3D mannequin, animations, exercise metadata, texture, and source exercise JSON files are from Desk Break by Shlomo Rosh. They are included locally under `public/assets/desk-break/` with the upstream MIT [LICENSE](public/assets/desk-break/LICENSE), README, authoring guide, and source reference JSON files. No original Desk Break runtime asset has been modified.

## Local GIF-preview pipeline

GIF previews remove the expensive live 3D work from the grid while retaining the full interactive Three.js model on the exercise page. The generator only reads local repository files and renders them in a local Chromium process; it makes no AI or cloud/API calls.

Install its one-time local tooling:

```bash
python -m pip install pillow playwright
python -m playwright install chromium
```

Test with a few previews first:

```bash
npm run generate-previews -- --category yoga --limit 5
```

Generate the complete reusable library:

```bash
npm run generate-previews
```

Files are stored in `public/previews/<exercise-id>.gif`. The script skips any existing GIF automatically, writes `public/previews/manifest.json` as it progresses, and resumes safely after interruption. Use `--force` only when you explicitly want to recreate existing previews. The website reads the manifest and automatically switches each generated card from live WebGL to its saved GIF on the next browser refresh.
