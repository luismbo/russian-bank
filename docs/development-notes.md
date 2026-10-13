# Russian Bank — Developer Notes

This document describes how the project is structured and records the changes and
decisions made when adding **mobile support**, **automatic GitHub Pages
deployment** and **selectable card themes**. It is meant as a reference for
reviewing those changes later.

---

## 1. Overview

Russian Bank is a single-player solitaire card game (based on
[zankpatience.net](https://zankpatience.net)). It is a plain client-side web app:
ES6 modules are bundled by webpack into a single `app.js`, and the game runs
entirely in the browser (no backend). The only server requirement is serving static
files.

---

## 2. Repository layout

```
.
├── .github/workflows/        CI/CD (GitHub Actions)
│   ├── codeql-analysis.yml    Static security analysis
│   ├── docker-image.yml       Builds the Docker image
│   ├── node.js.yml            Generic Node build/test matrix (pre-existing)
│   └── pages.yml              NEW: build + deploy to GitHub Pages
├── Dockerfile                Oracle Linux + Apache httpd serving the repo root
├── LICENSE
├── README.md
├── package.json              Scripts + dependencies (webpack toolchain)
├── package-lock.json
├── webpack.config.js         Bundles app/js/app.js -> app/js/dist/app.js
└── app/                     The entire static site (and the Pages publish root)
    ├── index.html           Entry page; redirects to pages/game.html
    ├── css/
    │   ├── external/         Vendored CSS (bootstrap, jquery-ui, sweetalert2, …)
    │   ├── global.css        Layout resets + --board-scale CSS variable
    │   ├── header.css        Header bar
    │   ├── playingfield.css  The board (all dimensions scale with --board-scale)
    │   ├── settings_menu.css NEW: header menu button + settings drawer
    │   ├── footer.css
    │   ├── jquery-ui.slider_custom.css
    │   └── sweetalert2_custom.css
    ├── img/                  Game artwork
    │   └── cards/<theme>/     Card faces (1.svg…52.svg + b1fv/b2fv backs) per theme
    ├── js/
    │   ├── app.js            Entry point (imports + bootstrap sequence)
    │   ├── game.js           Top-level game orchestration
    │   ├── config/           ai_config.js
    │   ├── entities/         card, card2pile, move, pile, playboard
    │   ├── enums/            player + pileinformation/ + cardinformation/
    │   ├── locales/          i18n strings + jokes (de / en / fr)
    │   ├── services/         ai, i18n, jokes, localstorage, playboard,
    │   │                     render, tutorial  (render_service.js is the big one)
    │   ├── utils/            ai, card, move, pile, playboard, player, utils
    │   └── dist/             webpack output (git-ignored, built before serving)
    └── pages/
        └── game.html         The actual game page
```

> `app/js/dist/*` is **git-ignored**. The bundle must be built (`npm run build`)
> before opening `app/index.html` locally or before publishing the `app/` folder.

---

## 3. Runtime architecture

`app/js/app.js` is the entry point and bootstraps everything in order:

1. `babel-polyfill`
2. `RenderService.preloadImages()` — preloads all card art so the game works offline
   (relies on the browser cache).
3. `i18nService.setupApp()` — initializes i18next (de/en/fr).
4. `RenderService.setupApp()` — sets up tooltips, global event handlers, the
   **responsive board scaling**, and the page-load effects.
5. `new Game()` + `game.initializeGame()` — creates and starts a game.
6. `RenderService.setupLocalStorageFields(game)` — restores persisted settings.

The layers are cleanly separated:

- **entities / enums** — pure data model (cards, piles, players, moves, board).
- **services** — application logic. `render_service.js` owns the DOM: it renders
  piles/cards, wires jQuery UI drag & drop, animations, dialogs and all event
  handlers. `ai_service.js` drives the computer opponent.
- **utils** — pure helper functions per domain.
- **game.js** — glues the model and services together and reacts to moves.

Rendering relies on jQuery + jQuery UI (draggable/droppable/slider),
jQuery UI Touch Punch (for touch drag & drop), i18next, KUTE.js (animations),
SweetAlert2 (dialogs), Tooltipster and Noty.

---

## 4. Changes: mobile support & GitHub Pages

### 4.1 Goals

1. **Deploy automatically to GitHub Pages** on push to `main`.
2. **Make the game usable on mobile** by (a) moving all options into a separate
   menu and (b) scaling the board to fit the viewport.

### 4.2 Files changed / added

| File | Change |
| --- | --- |
| `.github/workflows/pages.yml` | **NEW** — build the bundle and deploy `app/` to GitHub Pages. |
| `app/index.html` | Redirect changed to a *relative* `pages/game.html`. |
| `app/css/global.css` | Added `:root { --board-scale: 1 }`; removed fixed `min-width` and the width-breakpoint hacks. |
| `app/css/header.css` | `header { position: relative }` so the menu button can be placed relative to it. |
| `app/css/playingfield.css` | Board dimensions converted to `calc(Npx * var(--board-scale))`; removed the old fixed-size media queries; moved inline player-board colors to classes. |
| `app/css/settings_menu.css` | **NEW** — menu button + slide-in settings drawer. |
| `app/pages/game.html` | Added the header ☰ button; moved the settings + language UI into the `#settingsMenu` drawer; removed inline player-board styles; linked the new stylesheet; mobile-friendly viewport meta. |
| `app/js/services/render_service.js` | Added responsive-scaling logic, menu open/close, and related event handling. |
| `app/js/locales/{en,de,fr}.js` | Added `settings` / `close` strings. |
| `package.json` | Added a `build` script (`webpack --mode production`). |
| `README.md` | Added a "Play online (GitHub Pages)" section, a Pages badge, and build instructions. |

### 4.3 Responsive board scaling

The board is scaled by a single CSS custom property, `--board-scale`, that is
computed at runtime and applied to every board dimension:

```css
:root { --board-scale: 1; }

.cardImgWrapper {
    width:  calc(58px * var(--board-scale));
    height: calc(80px  * var(--board-scale));
}
```

`render_service.js` computes it:

- `setupResponsiveBoard()` — recomputes on `resize`/`orientationchange` (debounced
  by 150 ms) and once on `document.ready`.
- `measureBoardNaturalSize()` — temporarily forces `--board-scale: 1`, measures the
  board's real size (bounding box spanning all `.pilePanel` / `.playerBoard`
  elements, plus the playing-field height), then restores the previous value.
- `updateBoardScale()` — picks
  `scale = min(availWidth / naturalWidth, availHeight / naturalHeight, 1)`,
  clamped to `[0.3, 1.0]`, where the available space subtracts the header and
  footer heights and a 20 px viewport margin.
- `getBoardScale()` — reads the effective scale, used e.g. to scale the
  overlapping distance between stacked cards so drag/drop stays aligned.

Fallbacks (`678 × 640`) are only used if the natural size cannot be measured; the
real board measures at roughly **666 × 590 px** at scale 1.

### 4.4 Settings menu

All previously always-visible options (tutorial toggle, new game, pause,
statistics, difficulty, speed slider, "sort center piles", language selector)
moved into a drawer opened from a **☰ button in the top-right of the header**.

- Markup: `#settingsMenu` → `.settingsMenuBackdrop` + `.settingsMenuPanel`
  (`role="dialog"`, `aria-modal`) containing `#settingsPanel`.
- The drawer is `position: fixed`, slides in from the right (max-width 420 px) and
  is dismissible via the backdrop or the × button.
- JS handlers in `setGlobalEventHandlers()`: click on `#openSettingsMenu` opens it;
  click on `#closeSettingsMenu`/`.settingsMenuBackdrop` or the **Esc** key closes
  it; starting a new game or opening statistics closes it; and the **spacebar**
  knock shortcut is suppressed while the menu is open.

### 4.5 GitHub Pages deployment (`pages.yml`)

- Triggers on push to `main` and on `workflow_dispatch`.
- Permissions: `contents: read`, `pages: write`, `id-token: write`; single
  concurrent deployment via a `pages` concurrency group.
- Build job: checkout → Node 20 → `npm ci` → `npx webpack --mode production`
  (with `NODE_OPTIONS=--openssl-legacy-provider`) → `touch app/.nojekyll` →
  `actions/configure-pages` → `actions/upload-pages-artifact` with `path: app`.
- Deploy job: `actions/deploy-pages` into the `github-pages` environment.

The **`app/` folder is the publish root**, so the site is served from
`https://<owner>.github.io/<repository>/`.

### 4.6 Localization

Added the `settings` and `close` keys to `app/js/locales/en.js`, `de.js` and
`fr.js` (Deutsch: "Einstellungen"/"Schließen", Français: "Paramètres"/"Fermer").

### 4.7 Selectable card themes

The card faces live under `app/img/cards/<theme>/` as individual,
**self-contained** SVGs named `1.svg`…`52.svg` plus the two card backs
`b1fv.svg` (blue deck) and `b2fv.svg`. The numeric name is derived from the card
model as `suitOrder + 4 * (pictureNumber - 1)` (suits C=1, S=2, H=3, D=4; picture
numbers A=1, K=2, Q=3, J=4, 10=5, 9=6, …, 2=13).

Seven themes are bundled:

| id | name | notes |
| --- | --- | --- |
| `modern` | Modern | illustrated PNG deck (127×177); default; the deck of zankpatience.net |
| `plain` | Plain | the game's original deck: letters for court cards, both indices at the top |
| `minimal` | Minimal | minimal letters/pips; smallest |
| `classic` | Classic | illustrated court cards |
| `fourcolour` | Four colour | four-colour suits (accessibility) |
| `ghost` | Ghost | outlined court cards |
| `blue` | Blue | blue accents |

The decks are generated with `makeadeck.cgi` from <https://www.me.uk/cards/> and
are dedicated to the **public domain** by their author (Adrian Kennard / RevK).
The illustrated court art descends from the classic 19th-century Goodall & Son
designs (the same lineage as the LGPL `svg-cards` set); treat it as public domain
but keep the attribution.

Implementation:

- `localstorage_service.js` — `getCardTheme()` / `updateCardTheme()` persist the
  choice under `zpCardTheme`.
- `render_service.js` — `CARD_THEMES` + `getSelectedCardTheme()` (validates the
  stored value, falls back to `modern`); `preloadImages()` preloads only the
  selected theme; `renderPlayboardCards()` builds the image path
  `../img/cards/<theme>/<n>.svg` and the CSS class `cardImg theme-<theme>`;
  `setBackgroundImagesToShowOnCenterPiles()` uses the theme's aces.
- `game.html` — a `#selectCardTheme` `<select>` in the settings drawer
  (`.cardDesignRow`); changing it re-preloads and re-renders immediately.
- `locales/{en,de,fr}.js` — `cardTheme` + `themeModern/themePlain/themeMinimal/themeClassic/themeFourColour/themeGhost/themeBlue`.

The previous deck (`app/img/cards_plain/`) was removed. It rendered **both** corner
indices at the **top**; the new decks put the second index at the **bottom right,
rotated 180°** as is standard.

---

## 5. Decisions and rationale

- **Scale the real layout instead of using `transform: scale()`.**
  A CSS `transform` scales the *painted* result but not the coordinate system used
  by jQuery UI drag & drop, which would misplace dragged cards. Using
  `--board-scale` inside `calc()` changes the actual box sizes, so hit-testing and
  drag geometry remain correct. Verified by dragging a card on a scaled board.

- **CSS variable + `calc()` rather than generated CSS or JS-driven inline styles.**
  A single variable drives every dimension, so changing it on resize is one DOM
  write and there is a single source of truth for the scale.

- **The settings drawer stays in the layout (hidden via `visibility`/`opacity`/
  `pointer-events`, *not* `display: none`).**
  The jQuery UI speed slider measures its container when initialized; with
  `display: none` the width would be 0 and the slider would break. Keeping the box
  in the layout preserves correct initialization.

- **`header .col-sm-12 { position: static; }` override.**
  Bootstrap 3 gives every column `position: relative; min-height: 1px`, which made
  the absolutely-positioned ☰ button align to the column instead of the header.
  Resetting it lets the button centre against the full header height.

- **Relative redirect in `app/index.html` (`pages/game.html`).**
  The old code derived an absolute URL from `location.pathname.split("/")[1]`,
  which only worked when the app lived under `/<repo>/app/`. A relative redirect
  works both locally (repo root / Docker) and on Pages, where `app/` is the root.

- **`NODE_OPTIONS=--openssl-legacy-provider` in CI.**
  webpack 5.24 still uses the MD4 hash, which OpenSSL 3 (Node ≥ 17) disables by
  default; without the flag the build fails with `ERR_OSSL_EVP_UNSUPPORTED`. Set
  via the workflow `env` so it is automatic and not left to the developer's Node
  version. (The history-based webpack cache is not used because of the same
  limitation.)

- **Omitted `enablement: true` on `actions/configure-pages`.**
  Auto-enabling Pages that way requires a token other than the default
  `GITHUB_TOKEN`, so Pages must be enabled once by hand
  (**Settings → Pages → Source = "GitHub Actions"**). This is documented in the
  README. *Done for this repository.*

- **`font-size: 0; white-space: nowrap` on `.playingfield`.**
  The piles are `inline-block`, so whitespace between them would add phantom
  gaps and make the measured/kept width depend on the font size. Zeroing the font
  size removes those gaps so the board width is deterministic at any scale.

---

## 6. Build & run

```bash
npm ci
npm run build            # -> app/js/dist/app.js

# On Node.js >= 17 the old webpack needs the legacy OpenSSL provider:
NODE_OPTIONS=--openssl-legacy-provider npm run build

# Then open app/index.html (or serve the folder):
python3 -m http.server
```

Docker continues to work unchanged: the `Dockerfile` installs webpack globally and
runs `webpack`, serving the repo root over Apache.

---

## 7. Verification performed

- `npx webpack --mode production` builds successfully (only bundle-size warnings).
- Headless Chromium across **320×568, 360×640, 390×844, 414×896, 568×320,
  768×1024, 1024×768 and 1440×900**: the board fits, there is no horizontal or
  vertical scroll, and there are **no JavaScript errors**.
- Serving `app/` as the site root (the GitHub Pages layout): all 16 card images
  load, relative asset paths (`../img/…`, `../js/dist/app.js`) resolve, no errors.
- Functional checks: opening/closing the menu, the language switch, the speed
  slider initialising, and a successful drag & drop on a scaled board.

---

## 8. Known limitations / follow-ups

- `node.js.yml` (pre-existing) still runs the old Node 10–15 matrix and now also
  executes the newly added `build` script; it is unrelated to deployment and may
  warrant modernising separately.
- The board scale is recomputed on resize; extreme aspect ratios are handled by the
  `0.3` lower clamp rather than by reflowing the layout.
- Deployments require the one-time Pages source setting (already configured here).
