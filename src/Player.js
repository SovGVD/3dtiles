import { Config } from './config.js';

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
        this.moveTo(this.x + dx, this.z + dz, tileMap);
    }
    
    setRotation(angle) {
        this.rotation = angle;
    }
}

export class Player extends Entity {
    constructor(x, z) {
        super(x, z, true);
    }
    
    update(input, tileMap) {
        const movement = input.getMovement();
        
        if (movement.dx !== 0 || movement.dz !== 0) {
            // Calculate movement direction based on camera rotation
            const moveAngle = Math.atan2(movement.dx, movement.dz);
            const finalAngle = this.rotation + moveAngle;
            
            // Calculate movement vector
            const speed = Config.PLAYER_SPEED * this.currentSpeedMultiplier;
            const dx = Math.sin(finalAngle) * speed;
            const dz = Math.cos(finalAngle) * speed;
            
            // Try to move - if blocked, don't update position
            const moved = this.move(dx, dz, tileMap);
            
            if (moved) {
                // Update current tile info
                const tile = tileMap.getTile(Math.floor(this.x), Math.floor(this.z));
                if (tile) {
                    const terrainConfig = Config.TERRAIN_CONFIG[tile.type];
                    this.currentSpeedMultiplier = terrainConfig?.speedMultiplier || 1.0;
                }
            }
        }
        
        // Update rotation
        const rotation = input.getRotation();
        this.setRotation(rotation);
    }
}