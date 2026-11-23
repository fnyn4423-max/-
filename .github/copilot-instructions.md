# Repository instructions

## Project shape

SKYBOUND is a dependency-free, static browser game. `index.html` defines the Japanese-language page, HUD, end-of-game message, and touch controls; it loads `style.css` and `game.js` directly.

The game is drawn on the 960 × 540 canvas in `game.js`. Its animation loop updates player physics, platform collisions, stars, enemies, camera position, and HUD values, then renders the world. Level geometry and entity starting positions are data near the top of that file. Keep world coordinates and canvas coordinates distinct by applying `cameraX` when drawing.

`style.css` owns the page presentation, responsive layout, and touch-control visibility. The HTML IDs and `data-control` attributes are queried by `game.js`; keep them in sync when changing the UI. Keyboard and pointer/touch input are handled in `game.js`.

## Commands

There is no package manifest, build pipeline, test suite, or configured linter. Serve the static files locally with:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. To check JavaScript syntax with Node.js:

```sh
node --check game.js
```

## Repository conventions

- Keep the app dependency-free and split markup, styling, and game behavior across the existing HTML, CSS, and JavaScript files.
- Keep player controls, rendering, and level data in the canvas game implementation; update the DOM only for the existing HUD and end-of-game UI.
- The page copy and accessibility labels are Japanese. Preserve `lang="ja"` and keep user-facing game text consistent with that language.
- The canvas drawing dimensions are fixed at 960 × 540; responsive sizing is handled by CSS while retaining the 16:9 aspect ratio.
