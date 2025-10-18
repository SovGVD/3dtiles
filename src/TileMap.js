import { Tile } from './Tile.js';
import { Config } from './config.js';
import { ObjectGeneratorRegistry } from './generators/objects/ObjectGeneratorRegistry.js';
import { PerlinNoise } from './generators/terrain/PerlinNoise.js';

export class TileMap {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = [];
        this.objects = [];
        
        // Initialize Perlin noise generators with different seeds for variety
        this.noiseGenerator = new PerlinNoise(Math.random() * 1000);
        this.detailNoise = new PerlinNoise(Math.random() * 1000);
        
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
        // Use multiple octaves of Perlin noise for realistic terrain
        const scale1 = 0.02; // Large scale features (mountains, valleys)
        const scale2 = 0.05; // Medium scale features (hills)
        const scale3 = 0.1;  // Small scale features (detail)
        
        // Base terrain with multiple octaves
        const baseNoise = this.noiseGenerator.octaveNoise(x * scale1, z * scale1, 4, 0.5, 2.0);
        
        // Add medium scale variation
        const mediumNoise = this.detailNoise.octaveNoise(x * scale2, z * scale2, 3, 0.4, 2.0);
        
        // Add fine detail
        const detailNoise = this.noiseGenerator.octaveNoise(x * scale3, z * scale3, 2, 0.3, 2.0);
        
        // Combine noises with different weights
        const combinedNoise = baseNoise * 2.0 + mediumNoise * 0.5 + detailNoise * 0.25;
        
        return combinedNoise * Config.HEIGHT_SCALE;
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
        console.log('Generating all objects...');
        const startTime = performance.now();
        
        this.objects = ObjectGeneratorRegistry.generateAll(this);
        
        const endTime = performance.now();
        console.log(`Generated total of ${this.objects.length} objects in ${(endTime - startTime).toFixed(2)}ms`);
    }
    
    getVisibleObjects(centerX, centerZ, radius) {
        const visible = [];
        const minX = Math.max(0, Math.floor(centerX - radius));
        const maxX = Math.min(this.width - 1, Math.floor(centerX + radius));
        const minZ = Math.max(0, Math.floor(centerZ - radius));
        const maxZ = Math.min(this.height - 1, Math.floor(centerZ + radius));
        
        for (const object of this.objects) {
            const objX = Math.floor(object.x);
            const objZ = Math.floor(object.z);
            
            if (objX >= minX && objX <= maxX && objZ >= minZ && objZ <= maxZ) {
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
