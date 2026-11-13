# Health Plus — 3D Exercise Library

Health Plus is a React, TypeScript, and Three.js exercise library with 443 guided movements. The library includes category filters, exercise instructions, calorie estimates, an interactive 3D detail viewer, and three selectable avatars:

- **Man · Athletic** — default
- **Woman · Casual**
- **Wooden mannequin**

The exercise grid uses pre-generated local GIFs instead of hundreds of live WebGL canvases. This keeps scrolling and category switching responsive. The full Three.js animation is loaded only after an exercise is opened.

## Quick start

### Requirements

- [Node.js](https://nodejs.org/) 18 or newer
- npm, included with Node.js
- A modern browser with WebGL support

Python is **not** required to run the website. It is needed only when generating or validating GIF previews.

### Install and run

```bash
git clone https://github.com/ayushpathak-957/health-plus.git
cd health-plus
npm install
npm run dev
```

Open the local address printed by Vite, normally `http://localhost:5173`.

All committed GIFs and 3D models are ready to use after cloning. You do not need to run the GIF generator before starting the website.

## Using the website

1. Use **Exercise categories** on the left to show a specific movement type, or select **All exercises**.
2. Use the **Avatar** dropdown above the grid to select the athletic man, casual woman, or wooden mannequin.
3. Click an exercise card to open its instructions and interactive 3D animation.
4. In the 3D viewer:
   - drag with the left mouse button to orbit;
   - use the mouse wheel to zoom;
   - right-drag to pan;
   - use **Play/Pause** and the speed button to control playback.
5. Use **Back to library** to return to the grid.

The selected avatar is stored in the browser's local storage and is reused on the grid and detail page after a refresh.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server with hot reload. |
| `npm run build` | Type-check the project and create an optimized production build in `dist/`. |
| `npm run preview` | Serve the completed `dist/` build locally for a production check. |
| `npm run validate-library` | Verify that every metadata record has a matching animation clip. |
| `npm run generate-previews` | Generate wooden-mannequin GIFs locally. |
| `npm run generate-avatar-previews` | Generate GIFs for all three avatars locally. |

## Production build and deployment

```bash
npm run validate-library
npm run build
npm run preview
```

Deploy the generated `dist/` directory to any static host. The site has no backend requirement and makes no runtime API calls. Models, metadata, manifests, and previews are served as local static assets.

Vite may report that the JavaScript chunk is larger than 500 kB. That is a size warning, not a build failure; the interactive Three.js viewer is included in that bundle.

## How the preview system works

Each exercise card loads a normal `<img>` from a saved GIF:

```text
public/previews/<exercise-id>.gif
public/previews/man-athletic/<exercise-id>.gif
public/previews/woman-casual/<exercise-id>.gif
```

Each directory has a `manifest.json` listing its available exercise IDs. The application loads the selected manifest and lazy-loads the corresponding images. Category changes therefore do not create or destroy large numbers of Three.js renderers.

The GIFs are generated once, saved to disk, committed to the repository, and reused on every subsequent run. Generation is entirely local: it reads local GLB and JSON files, renders them in local Chromium, and does not use AI, cloud rendering, tokens, or external APIs.

## Generating GIF previews locally

You only need this section after changing an animation, model, camera, lighting, or avatar retargeting code.

### One-time Python setup

```bash
python -m pip install pillow playwright
python -m playwright install chromium
```

### Generate every avatar preview

```bash
npm run generate-avatar-previews
```

The generator checks existing files and skips valid GIFs, so interrupted runs can be resumed safely. Each completed file and manifest is replaced atomically.

### Regenerate selected exercises

After changing only a few exercises, use `--ids` and `--force` instead of rebuilding the complete library:

```bash
npm run generate-avatar-previews -- --ids push-up,crunch --force
```

Useful options:

| Option | Example | Effect |
| --- | --- | --- |
| `--avatar` | `--avatar man-athletic` | Render only one avatar. Choices: `man-athletic`, `woman-casual`, `wood`. |
| `--ids` | `--ids squat,lunges` | Render only the listed exercise IDs. |
| `--category` | `--category yoga` | Render one category. |
| `--limit` | `--limit 5` | Render only the first matching exercises for a quick test. |
| `--force` | `--force` | Replace valid existing GIFs. Required after visual changes. |
| `--width` / `--height` | `--width 480 --height 400` | Increase or decrease preview resolution. |
| `--colors` | `--colors 256` | Choose the GIF palette size from 2 to 256 colours. |
| `--software` | `--software` | Use Chromium's default renderer instead of Windows Direct3D. |

The standard output is **360 × 300 with 256 colours**. Larger dimensions improve detail but also increase repository size, download size, and browser memory usage.

To generate only wooden-mannequin previews:

```bash
npm run generate-previews
```

## Validating previews and the UI

Validate the metadata-to-animation mapping:

```bash
npm run validate-library
```

Decode every frame in all three preview collections and confirm their manifests are complete:

```bash
python scripts/validate_avatar_previews.py
```

For an automated browser smoke test, start the development server in one terminal:

```bash
npm run dev
```

Then run this in another terminal, replacing the port if Vite chose a different one:

```bash
python scripts/verify_avatar_ui.py http://localhost:5173
```

The browser test checks all avatars, grid image loading, playback, avatar switching, categories, scrolling, the mobile layout, and browser exceptions. Review screenshots are written to `.artifacts/avatars/`, which is intentionally ignored by Git.

## Adding or updating an exercise

An exercise needs three matching pieces that use the same kebab-case ID:

1. A metadata entry in `public/assets/desk-break/exercises.json`.
2. An animation clip with the same name in `public/assets/desk-break/exercises.glb`.
3. One saved GIF per avatar plus the ID in each preview manifest.

The locally authored featured exercises are maintained by these scripts:

- `scripts/update_exercises_json.mjs` updates their names, categories, instructions, durations, and suggested amounts.
- `scripts/add_all_new_exercises.mjs` authors the strength and floor animation clips. It accepts optional IDs such as `push-up` or `crunch` for a targeted update.
- `scripts/add_jumping_jacks.mjs` authors the full jumping-jacks clip.

For example, after editing the push-up animation code:

```bash
node scripts/add_all_new_exercises.mjs push-up
npm run validate-library
npm run generate-avatar-previews -- --ids push-up --force
python scripts/validate_avatar_previews.py
npm run build
```

When adding a brand-new exercise, extend the metadata and animation authoring scripts first, run them, and then generate its three previews. Do not manually add an ID to a manifest without creating and validating the corresponding GIF.

## Project structure

```text
src/
  App.tsx                         Library, filtering, navigation, and avatar state
  avatars.tsx                    Avatar choices and preview paths
  data/calorieEstimates.ts       Centralized MET-based estimates
  three/ExerciseViewer.tsx       Interactive Three.js detail viewer
  three/avatarRig.js             Avatar loading and animation retargeting
  three/library.ts               Exercise GLB loading and camera views
public/
  assets/desk-break/             Exercise metadata, mannequin, and animation clips
  assets/avatars/                Bundled clothed avatar GLBs and licences
  previews/                      Reusable GIF collections and manifests
scripts/
  generate_avatar_previews.py    Three-avatar local GIF pipeline
  generate_gif_previews.py       Wooden-mannequin GIF pipeline and local server
  validate_library.mjs           Metadata/clip validation
  validate_avatar_previews.py    GIF and manifest validation
  verify_avatar_ui.py            Playwright browser smoke test
```

## Troubleshooting

### Cards say “Preview loading”

Confirm that the selected avatar's `manifest.json` contains the exercise ID and that the matching GIF exists. Regenerate that exercise with `--ids <id> --force`, then refresh the page.

### Chromium will not start during generation

Run `python -m playwright install chromium`. On Windows, retry the generator with `--software` if the Direct3D renderer is unavailable.

### A GIF still shows an old pose

The pipeline normally reuses valid files. Add `--force` when an existing animation or rendering rule has changed.

### GIFs look pixelated

The default 360 × 300 output balances clarity and size. Regenerate at a larger width and height, but expect significantly larger files.

### The development port is not 5173

Vite automatically selects another port when 5173 is busy. Open the exact URL printed in the terminal and pass that URL to `verify_avatar_ui.py`.

## Design notes

- The grid never starts a thumbnail WebGL renderer; it uses saved local GIFs only.
- The detail page creates one interactive Three.js scene and disposes it when returning to the library.
- The two clothed models have different proportions and skeleton rest rotations. `src/three/avatarRig.js` retargets the mannequin clips while preserving each avatar's limb lengths and includes exercise-specific floor-contact corrections where required.
- Calorie figures are approximate, not medical measurements. `src/data/calorieEstimates.ts` centralizes category and exercise MET values, a 70 kg reference weight, duration parsing, and the estimate formula.

## Assets and licences

The original mannequin, texture, base exercise animations, metadata, and source exercise JSON files come from **Desk Break by Shlomo Rosh**. Its MIT licence, upstream README, authoring guide, and source reference files are preserved under `public/assets/desk-break/`. Health Plus extends the bundled `exercises.glb` and `exercises.json` with locally authored exercises.

The clothed avatar GLBs are bundled under `public/assets/avatars/`:

- [Man, athletic](https://grab3d.com/models/characters/man-base-character/)
- [Woman, casual](https://grab3d.com/models/characters/woman/)

Their accompanying CC0 declarations are preserved as `LICENSE-man.txt` and `LICENSE-woman.txt`. Additional source information is available in `public/assets/avatars/README.md`.
