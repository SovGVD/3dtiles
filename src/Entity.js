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
        // Check collision with expanded boundary box
        const collisionRadius = 0.1; // Player collision radius
        
        // Check all tiles within collision radius
        const tilesToCheck = [
            { x: Math.floor(newX), z: Math.floor(newZ) }, // Center
            { x: Math.floor(newX + collisionRadius), z: Math.floor(newZ) }, // Right
            { x: Math.floor(newX - collisionRadius), z: Math.floor(newZ) }, // Left
            { x: Math.floor(newX), z: Math.floor(newZ + collisionRadius) }, // Front
            { x: Math.floor(newX), z: Math.floor(newZ - collisionRadius) }, // Back
            { x: Math.floor(newX + collisionRadius), z: Math.floor(newZ + collisionRadius) }, // Front-right
            { x: Math.floor(newX - collisionRadius), z: Math.floor(newZ + collisionRadius) }, // Front-left
            { x: Math.floor(newX + collisionRadius), z: Math.floor(newZ - collisionRadius) }, // Back-right
            { x: Math.floor(newX - collisionRadius), z: Math.floor(newZ - collisionRadius) }  // Back-left
        ];
        
        // Check each tile in collision box
        for (const tilePos of tilesToCheck) {
            const tile = tileMap.getTile(tilePos.x, tilePos.z);
            
            if (!tile) {
                return false; // Out of bounds
            }
            
            // Check if tile is walkable
            const terrainConfig = Config.TERRAIN_CONFIG[tile.type];
            if (terrainConfig && terrainConfig.walkable === false) {
                return false; // Cannot walk on this tile (e.g., houses)
            }
        }
        
        // Update position
        this.x = newX;
        this.z = newZ;
        
        // Update height based on terrain
        this.y = tileMap.getHeightAt(this.x, this.z) + Config.PLAYER_HEIGHT;
        
        return true;
    }
    
    move(dx, dz, tileMap) {
        // Try to move and return whether it succeeded
        return this.moveTo(this.x + dx, this.z + dz, tileMap);
    }
    
    setRotation(angle) {
        this.rotation = angle;
    }
}
