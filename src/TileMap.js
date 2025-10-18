import { Tile } from './Tile.js';
import { TileObject } from './TileObject.js';
import { Config } from './config.js';

export class TileMap {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = [];
        this.objects = []; // Store tile objects (trees, etc.)
        this.generate();
        this.generateObjects();
    }
    
    generate() {
        // Generate tiles with Perlin-like noise simulation
        for (let z = 0; z < this.height; z++) {
            this.tiles[z] = [];
            for (let x = 0; x < this.width; x++) {
                const height = this.generateHeight(x, z);
                const type = this.determineType(height);
                this.tiles[z][x] = new Tile(x, z, height, type);
            }
        }
        
        // Normalize heights for related tile types
        this.normalizeRelatedTileHeights();
    }
    
    generateHeight(x, z) {
        // Simple noise function for terrain generation
        const scale = 0.1;
        const noise = Math.sin(x * scale) * Math.cos(z * scale) * 2 +
                     Math.sin(x * scale * 2) * 0.5 +
                     Math.cos(z * scale * 3) * 0.5;
        return noise * Config.HEIGHT_SCALE;
    }
    
    determineType(height) {
        const waterLevel = Config.TERRAIN_CONFIG.water.waterLevel;
        
        if (height < waterLevel) return Config.TILE_TYPES.WATER;
        if (height > 3) return Config.TILE_TYPES.ROCK;
        if (height > 2) return Config.TILE_TYPES.TERRAIN;
        return Config.TILE_TYPES.GRASS;
    }
    
    getTile(x, z) {
        if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
            return null;
        }
        return this.tiles[z][x];
    }
    
    getHeightAt(x, z) {
        const tile = this.getTile(Math.floor(x), Math.floor(z));
        return tile ? tile.height : 0;
    }
    
    getTerrainTypeAt(x, z) {
        const tile = this.getTile(Math.floor(x), Math.floor(z));
        return tile ? tile.type : Config.TILE_TYPES.TERRAIN;
    }
    
    getVisibleTiles(centerX, centerZ, radius) {
        const visible = [];
        const minX = Math.max(0, Math.floor(centerX - radius));
        const maxX = Math.min(this.width - 1, Math.floor(centerX + radius));
        const minZ = Math.max(0, Math.floor(centerZ - radius));
        const maxZ = Math.min(this.height - 1, Math.floor(centerZ + radius));
        
        for (let z = minZ; z <= maxZ; z++) {
            for (let x = minX; x <= maxX; x++) {
                visible.push(this.tiles[z][x]);
            }
        }
        return visible;
    }
    
    generateObjects() {
        console.log('Generating objects...');
        const startTime = performance.now();
        
        // Generate trees and other objects
        for (const [objectType, objectConfig] of Object.entries(Config.TILE_OBJECTS)) {
            const validPositions = [];
            
            // First pass: collect all valid positions
            for (let z = 0; z < this.height; z++) {
                for (let x = 0; x < this.width; x++) {
                    const tile = this.tiles[z][x];
                    
                    if (objectConfig.allowedTerrain.includes(tile.type)) {
                        validPositions.push({ x, z, tile });
                    }
                }
            }
            
            // Second pass: randomly select positions to spawn
            const objectCount = Math.floor(validPositions.length * objectConfig.spawnProbability);
            
            for (let i = 0; i < objectCount; i++) {
                const randomIndex = Math.floor(Math.random() * validPositions.length);
                const pos = validPositions[randomIndex];
                
                // Add some random offset within the tile
                const offsetX = pos.x + (Math.random() * 0.6 - 0.3);
                const offsetZ = pos.z + (Math.random() * 0.6 - 0.3);
                
                const object = new TileObject(
                    offsetX,
                    offsetZ,
                    objectType,
                    objectConfig
                );
                this.objects.push(object);
                
                // Remove used position to avoid duplicates
                validPositions.splice(randomIndex, 1);
            }
        }
        
        const endTime = performance.now();
        console.log(`Generated ${this.objects.length} objects in ${(endTime - startTime).toFixed(2)}ms`);
    }
    
    getVisibleObjects(centerX, centerZ, forwardRadius, backwardRadius, playerRotation) {
        const visible = [];
        
        // If backward radius not provided, use forward radius (backward compatibility)
        if (backwardRadius === undefined) {
            backwardRadius = forwardRadius;
        }
        
        for (const object of this.objects) {
            const dx = object.x - centerX;
            const dz = object.z - centerZ;
            const distSquared = dx * dx + dz * dz;
            
            // Determine effective radius based on direction
            let effectiveRadius;
            
            if (playerRotation !== undefined && forwardRadius !== backwardRadius) {
                // Calculate the direction vector from player to object
                const angleToObject = Math.atan2(dx, dz);
                
                // Calculate the difference between player's facing direction and object direction
                // Player rotation is the direction they're facing
                let angleDiff = angleToObject - playerRotation;
                
                // Normalize to -PI to PI range
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                // Object is in front if angle difference is small (within 90 degrees either side)
                // Front: -90° to +90° (-PI/2 to PI/2)
                // Back: beyond ±90° (PI/2 to PI or -PI/2 to -PI)
                const isFront = Math.abs(angleDiff) <= Math.PI / 2;
                effectiveRadius = isFront ? forwardRadius : backwardRadius;
            } else {
                effectiveRadius = forwardRadius;
            }
            
            // Check if object is within the effective radius
            if (distSquared <= effectiveRadius * effectiveRadius) {
                visible.push(object);
            }
        }
        
        return visible;
    }
    
    normalizeRelatedTileHeights() {
        console.log('Normalizing tile heights...');
        const startTime = performance.now();
        
        // Multiple passes to ensure smooth transitions
        for (let pass = 0; pass < 3; pass++) {
            for (let z = 0; z < this.height; z++) {
                for (let x = 0; x < this.width; x++) {
                    const tile = this.tiles[z][x];
                    
                    // Check neighbors
                    const neighbors = [
                        this.getTile(x + 1, z),
                        this.getTile(x - 1, z),
                        this.getTile(x, z + 1),
                        this.getTile(x, z - 1)
                    ];
                    
                    for (const neighbor of neighbors) {
                        if (neighbor && this.shouldNormalizeHeight(tile.type, neighbor.type)) {
                            const heightDiff = Math.abs(tile.height - neighbor.height);
                            
                            if (heightDiff > Config.TILE_LEVEL_THRESHOLD) {
                                // Average the heights to bring them closer
                                const avgHeight = (tile.height + neighbor.height) / 2;
                                tile.height = tile.height * 0.7 + avgHeight * 0.3;
                            }
                        }
                    }
                }
            }
        }
        
        const endTime = performance.now();
        console.log(`Normalized tile heights in ${(endTime - startTime).toFixed(2)}ms`);
    }
    
    shouldNormalizeHeight(type1, type2) {
        // Check if these two types are in the same level group
        for (const group of Config.TILE_LEVEL_GROUPS) {
            if (group.includes(type1) && group.includes(type2)) {
                return true;
            }
        }
        return false;
    }
}
