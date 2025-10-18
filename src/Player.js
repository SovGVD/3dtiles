import { Config } from './config.js';
import { GameState } from './GameState.js';

export class Entity {
    constructor(x, z, isPlayer = false) {
        this.x = x;
        this.y = 0;
        this.z = z;
        this.isPlayer = isPlayer;
        this.rotation = 0;
        this.mesh = null;
        this.currentSpeedMultiplier = 1.0;
    }
    
    moveTo(newX, newZ, tileMap) {
        // Get the tile at the new position
        const tile = tileMap.getTile(Math.floor(newX), Math.floor(newZ));
        
        if (!tile) {
            return false; // Out of bounds
        }
        
        // Check if tile is walkable
        const terrainConfig = Config.TERRAIN_CONFIG[tile.type];
        if (terrainConfig && terrainConfig.walkable === false) {
            return false; // Cannot walk on this tile (e.g., houses)
        }
        
        // Update position
        this.x = newX;
        this.z = newZ;
        
        // Update height based on terrain
        this.y = tileMap.getHeightAt(this.x, this.z) + Config.PLAYER_HEIGHT;
        
        return true;
    }
    
    move(dx, dz, tileMap) {
        return this.moveTo(this.x + dx, this.z + dz, tileMap);
    }
    
    setRotation(angle) {
        this.rotation = angle;
    }
}

export class Player extends Entity {
    constructor(x, z) {
        super(x, z, true);
        this.lastTileX = Math.floor(x);
        this.lastTileZ = Math.floor(z);
    }
    
    update(input, tileMap) {
        // Check if player moved to a new tile
        const currentTileX = Math.floor(this.x);
        const currentTileZ = Math.floor(this.z);
        const tileChanged = (currentTileX !== this.lastTileX || currentTileZ !== this.lastTileZ);
        
        // Only update terrain info when moving to a new tile
        if (tileChanged) {
            const currentTile = tileMap.getTile(currentTileX, currentTileZ);
            if (currentTile) {
                const terrainConfig = Config.TERRAIN_CONFIG[currentTile.type];
                this.currentSpeedMultiplier = terrainConfig?.speedMultiplier || 1.0;
                
                // Update global state for debugging
                GameState.setCurrentSpeed(this.currentSpeedMultiplier, currentTile.type);
                
                // Update last tile position
                this.lastTileX = currentTileX;
                this.lastTileZ = currentTileZ;
            }
        }
        
        const movement = input.getMovement();
        
        if (movement.dx !== 0 || movement.dz !== 0) {
            // Apply speed multiplier to movement
            const speed = Config.PLAYER_SPEED * this.currentSpeedMultiplier;
            
            // Movement relative to camera rotation
            const angle = this.rotation;
            const dx = (movement.dz * Math.sin(angle) + movement.dx * Math.cos(angle)) * speed;
            const dz = (movement.dz * Math.cos(angle) - movement.dx * Math.sin(angle)) * speed;
            
            // Try to move
            this.move(dx, dz, tileMap);
        }
        
        // Update rotation
        const rotation = input.getRotation();
        this.setRotation(rotation);
    }
}