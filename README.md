# Brainrot Clicker (Developer Notes)

## Project Structure
- `index.html`: Markup only (game layout and UI elements).
- `styles.css`: All visual styling and animations.
- `game.js`: Game logic, state management, rendering, and effects.
- `graphics/`: Click target, coin, and clicker sprites.
- `fonts/Pixelify_Sans/`: UI font files.

## Run Locally
1. Open `index.html` in a browser.
2. For cleaner caching behavior during development, use a local static server:
   - Example with Python: `python -m http.server 8080`
   - Then open `http://localhost:8080`

## Save Data
- Save key: `brainrot_clicker_save_v1`
- Storage: browser `localStorage`
- Quick reset in browser console:
  - `localStorage.removeItem('brainrot_clicker_save_v1'); location.reload();`

## Main Gameplay Config (in `game.js`)
- Tiers are defined in `TIERS`:
  - name
  - image path
  - `unlockRequirement` (coins needed to unlock that tier)
- Auto clickers are defined in `CLICKERS`:
  - purchase cost
  - clicks per second
- Click value scaling:
  - `getClickValue()` uses `2^tierIndex`
- Auto click tick rate:
  - `setInterval(runAutoClickers, 1000)`
- Coin animation drain rate:
  - `setInterval(processCoinAnimationQueue, 140)`

## Extending
- Add a new tier:
  1. Add an entry to `TIERS`.
  2. Add image asset into `graphics/`.
  3. Verify prestige progression in `render()` and `onPrestige()`.
- Add a new clicker type:
  1. Extend `CLICKERS`.
  2. Add new shop markup in `index.html`.
  3. Wire new DOM references and buy handler in `game.js`.

## Notes
- The current game is fully client-side.
- A future PHP backend can read/write persistent player data while reusing the same frontend structure.
