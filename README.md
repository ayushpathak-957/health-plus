# Exercise Library

A React + Three.js exercise library powered by the 435-animation [Desk Break](https://github.com/shlomorsh/desk-break) collection.

## Run

```bash
npm install
npm run dev
```

Create an optimized production build with `npm run build`. Verify the bundled data and every animation mapping with `npm run validate-library`.

## Design notes

- The grid uses saved local GIFs only. It never starts a thumbnail WebGL renderer.
- The Avatar dropdown selects Man · Athletic (default), Woman · Casual, or the original wooden mannequin. The selection is remembered locally and applies to both the grid and interactive exercise page.
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

Wooden mannequin files are stored in `public/previews/<exercise-id>.gif`. The website reads the manifest on load and uses saved previews.

### Clothed avatars

Both rigged avatars and their textures are bundled locally in `public/assets/avatars/`. They use the same exercise animation clips through `src/three/avatarRig.js`, shared by the interactive viewer and GIF renderer. The source rigs have different body proportions, so retargeting preserves their own limb lengths.

Generate the complete avatar preview sets once:

```bash
npm run generate-avatar-previews
```

Outputs are `public/previews/man-athletic/<exercise-id>.gif`, `public/previews/woman-casual/<exercise-id>.gif`, and `public/previews/<exercise-id>.gif` for the wooden mannequin. Each set has its own `manifest.json`. Generated files are reusable static assets, including in production builds; running the website never regenerates them. The pipeline verifies and skips existing GIFs, saves each result atomically, and resumes after interruption. Refresh the website after generation.

The standard preview size is 360 × 300 with a 256-colour palette so card previews stay crisp on current displays. Pass `--width`, `--height`, or `--colors` only when intentionally choosing a different trade-off between image quality and file size.

Optional flags: `--avatar man-athletic`, `--category yoga`, `--limit 5`, `--ids chair-march,plank-full`, or `--force` to rebuild existing files after changing the model or rig adapter. Windows uses local Direct3D acceleration; `--software` uses Chromium's default renderer if needed. Rendering permits only the local asset server and makes no cloud, AI, or external API calls.

Validate all three complete preview sets with `python scripts/validate_avatar_previews.py`. For browser checks, start the dev server, then run `python scripts/verify_avatar_ui.py http://localhost:5173` using the port Vite reports. Review images are saved under `.artifacts/avatars/`.

Avatar sources: [Man, athletic](https://grab3d.com/models/characters/man-base-character/) and [Woman, casual](https://grab3d.com/models/characters/woman/) from Grab3D. Both downloads include CC0 declarations, preserved as `public/assets/avatars/LICENSE-man.txt` and `LICENSE-woman.txt`. Grab3D describes these as AI-assisted models cleaned up in Blender.
