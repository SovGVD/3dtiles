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
        
        // Generate low-resolution height map
        this.heightMap = this.generateHeightMap();
        
        this.generate();
        this.generateObjects();
    }
    
    generateHeightMap() {
        console.log('Generating height map...');
        const startTime = performance.now();
        
        const noiseSize = 128;
        const noise = new PerlinNoise(Math.random() * 1000);
        const detailNoise = new PerlinNoise(Math.random() * 1000);
        const heightMap = [];
        
        // Generate base noise map
        for (let z = 0; z < noiseSize; z++) {
            heightMap[z] = [];
            for (let x = 0; x < noiseSize; x++) {
                const scale = 0.08;
                const value = noise.octaveNoise(x * scale, z * scale, 4, 0.5, 2.0);
                heightMap[z][x] = value;
            }
        }
        
        // Add dramatic mountain peaks with realistic shapes
        const mountainCount = 12;
        for (let i = 0; i < mountainCount; i++) {
            const mx = Math.floor(Math.random() * noiseSize);
            const mz = Math.floor(Math.random() * noiseSize);
            const baseHeight = 3.0 + Math.random() * 2.5; // Very tall
            const baseRadius = Math.floor(10 + Math.random() * 10);
            
            // Create irregular mountain shape using noise
            for (let oz = -baseRadius; oz <= baseRadius; oz++) {
                for (let ox = -baseRadius; ox <= baseRadius; ox++) {
                    const nx = mx + ox;
                    const nz = mz + oz;
                    
                    if (nx >= 0 && nx < noiseSize && nz >= 0 && nz < noiseSize) {
                        const dist = Math.sqrt(ox * ox + oz * oz);
                        
                        // Use noise to create irregular shape
                        const shapeNoise = detailNoise.noise(
                            (mx + ox) * 0.3, 
                            (mz + oz) * 0.3
                        ) * 0.5 + 0.5; // 0 to 1
                        
                        const effectiveRadius = baseRadius * (0.6 + shapeNoise * 0.4);
                        
                        if (dist <= effectiveRadius) {
                            // Steep falloff - creates dramatic cliffs
                            const normalizedDist = dist / effectiveRadius;
                            
                            // Exponential falloff for steep sides
                            const steepness = 3.0; // Higher = steeper
                            const falloff = Math.pow(1 - normalizedDist, steepness);
                            
                            // Add ridges and variation
                            const ridgeNoise = detailNoise.noise(nx * 0.5, nz * 0.5) * 0.3;
                            
                            const mountainValue = baseHeight * (falloff + ridgeNoise);
                            
                            // Sharp peaks - only add if significantly higher
                            if (mountainValue > heightMap[nz][nx] + 1.0) {
                                heightMap[nz][nx] = mountainValue;
                            }
                        }
                    }
                }
            }
        }
        
        const endTime = performance.now();
        console.log(`Height map generated with ${mountainCount} mountains in ${(endTime - startTime).toFixed(2)}ms`);
        
        return heightMap;
    }
    
    generate() {
        console.log('Generating terrain...');
        const startTime = performance.now();
        
        // Create a random generator for consistent but varied height variation
        const detailNoise = new PerlinNoise(Math.random() * 1000);
        
        // Generate tiles by sampling and interpolating the height map
        for (let z = 0; z < this.height; z++) {
            this.tiles[z] = [];
            for (let x = 0; x < this.width; x++) {
                let height = this.generateHeight(x, z);
                
                // Add small random variation for terrain detail (±0.3 to ±0.8)
                const detailScale = 0.2;
                const heightVariation = detailNoise.noise(x * detailScale, z * detailScale) * 0.8;
                height += heightVariation;
                
                const type = this.determineType(height);
                this.tiles[z][x] = new Tile(x, z, height, type);
            }
        }
        
        const endTime = performance.now();
        console.log(`Terrain generated in ${(endTime - startTime).toFixed(2)}ms`);
        
        // Normalize heights for related tile types
        this.normalizeRelatedTileHeights();
    }
    
    generateHeight(x, z) {
        // Map world coordinates to height map coordinates (0-127)
        const noiseSize = 128;
        const mapX = (x / this.width) * (noiseSize - 1);
        const mapZ = (z / this.height) * (noiseSize - 1);
        
        // Bilinear interpolation
        const x0 = Math.floor(mapX);
        const x1 = Math.min(x0 + 1, noiseSize - 1);
        const z0 = Math.floor(mapZ);
        const z1 = Math.min(z0 + 1, noiseSize - 1);
        
        const fx = mapX - x0;
        const fz = mapZ - z0;
        
        const h00 = this.heightMap[z0][x0];
        const h10 = this.heightMap[z0][x1];
        const h01 = this.heightMap[z1][x0];
        const h11 = this.heightMap[z1][x1];
        
        const h0 = h00 * (1 - fx) + h10 * fx;
        const h1 = h01 * (1 - fx) + h11 * fx;
        const interpolated = h0 * (1 - fz) + h1 * fz;
        
        return interpolated * Config.HEIGHT_SCALE;
    }
    
    determineType(height) {
        const waterLevel = Config.TERRAIN_CONFIG.water.waterLevel;
        
        if (height < waterLevel) return Config.TILE_TYPES.WATER;
        if (height > 5) return Config.TILE_TYPES.ROCK;
        if (height > 2.5) return Config.TILE_TYPES.TERRAIN;
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
        
        // Count tile types after generation
        let roadCount = 0;
        let cityCount = 0;
        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tiles[z][x].type === Config.TILE_TYPES.ROAD) {
                    roadCount++;
                }
                if (this.tiles[z][x].type === Config.TILE_TYPES.CITY) {
                    cityCount++;
                }
            }
        }
        console.log(`Total ROAD tiles in map: ${roadCount}`);
        console.log(`Total CITY tiles in map: ${cityCount}`);
        
        const endTime = performance.now();
        console.log(`Generated total of ${this.objects.length} objects in ${(endTime - startTime).toFixed(2)}ms`);
    }
    
    findRandomRoadPosition() {
        // Collect all road tiles
        const roadTiles = [];
        
        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tiles[z][x].type === Config.TILE_TYPES.ROAD) {
                    roadTiles.push({ x, z });
                }
            }
        }
        
        if (roadTiles.length > 0) {
            // Return random road position
            const randomRoad = roadTiles[Math.floor(Math.random() * roadTiles.length)];
            return { x: randomRoad.x + 0.5, z: randomRoad.z + 0.5 }; // Center of tile
        }
        
        // Fallback to map center if no roads
        return { x: this.width / 2, z: this.height / 2 };
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
