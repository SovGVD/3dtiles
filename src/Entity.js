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
    
    moveTo(x, z, tileMap) {
        this.x = x;
        this.z = z;
        this.y = tileMap.getHeightAt(x, z) + Config.PLAYER_HEIGHT;
        
        // Update speed multiplier based on terrain
        const terrainType = tileMap.getTerrainTypeAt(x, z);
        const terrainConfig = Config.TERRAIN_CONFIG[terrainType];
        this.currentSpeedMultiplier = terrainConfig ? terrainConfig.speedMultiplier : 1.0;
    }
    
    move(dx, dz, tileMap) {
        this.moveTo(this.x + dx, this.z + dz, tileMap);
    }
    
    setRotation(angle) {
        this.rotation = angle;
    }
}
