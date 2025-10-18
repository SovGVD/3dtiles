# 3D Tiles Map Engine

A modular 3D tile-based map engine with third-person camera view.

## Features

- 3D tile-based terrain with procedural generation
- Smooth interpolated terrain surfaces (not flat tiles)
- Third-person camera following the player
- Height smoothing between tiles with configurable threshold
- Different tile types (terrain, water, road, rock, grass)
- Fog effect to hide render distance
- Culling - only visible tiles are rendered
- FPS counter and 60 FPS cap
- Modular architecture with replaceable renderer

## Project Structure

- `config.js` - All configuration constants
- `Tile.js` - Tile data structure
- `TileMap.js` - Map generation and management
- `Entity.js` - Player and NPC entities
- `ThreeJSRenderer.js` - Rendering implementation (replaceable)
- `InputController.js` - Keyboard and mouse input handling
- `Game.js` - Main game loop and logic
- `main.js` - Entry point

## Running

```bash
npm run dev
# Or
python3 -m http.server 8000
```

Open http://localhost:8000

## Controls

- **WASD** or **Arrow Keys** - Move
- **Mouse** - Rotate camera (click to lock pointer)

## Customization

Edit `config.js` to adjust:
- Map size and tile dimensions
- Render distance and fog settings
- Tile colors and types
- FPS cap (default: 60)
- Tile surface smoothness (TILE_SEGMENTS)
- Height smoothing threshold

## Replacing the Renderer

To use a different rendering engine, create a new class implementing the same interface as `ThreeJSRenderer`:
- `renderTiles(tiles, tileMap)`
- `renderEntity(entity, isPlayer)`
- `updateCamera(player)`
- `render()`
- `dispose()`
