import { TileObject } from '../../TileObject.js';
import { Config } from '../../config.js';

export class TreeGenerator {
    static generate(tileMap) {
        console.log('Generating trees...');
        const startTime = performance.now();
        
        const trees = [];
        const config = Config.TILE_OBJECTS.tree;
        
        // Validate config exists
        if (!config) {
            console.error('Tree config not found in Config.TILE_OBJECTS!');
            console.log('Available configs:', Object.keys(Config.TILE_OBJECTS));
            return [];
        }
        
        console.log('Tree config:', config);
        
        // Calculate chunk dimensions
        const chunkSize = Config.MERGE_CHUNK_SIZE;
        const chunksX = Math.ceil(tileMap.width / chunkSize);
        const chunksZ = Math.ceil(tileMap.height / chunkSize);
        const totalChunks = chunksX * chunksZ;
        
        // Select random subset of chunks (e.g., 30% of total chunks)
        const chunkSelectionRate = 0.3;
        const selectedChunks = [];
        
        for (let cz = 0; cz < chunksZ; cz++) {
            for (let cx = 0; cx < chunksX; cx++) {
                if (Math.random() < chunkSelectionRate) {
                    selectedChunks.push({ cx, cz });
                }
            }
        }
        
        console.log(`Selected ${selectedChunks.length} out of ${totalChunks} chunks for tree generation`);
        
        // Generate trees only in selected chunks
        for (const chunk of selectedChunks) {
            const minX = chunk.cx * chunkSize;
            const maxX = Math.min(minX + chunkSize, tileMap.width);
            const minZ = chunk.cz * chunkSize;
            const maxZ = Math.min(minZ + chunkSize, tileMap.height);
            
            // Collect valid positions in this chunk
            const validPositions = [];
            
            for (let z = minZ; z < maxZ; z++) {
                for (let x = minX; x < maxX; x++) {
                    const tile = tileMap.tiles[z][x];
                    
                    if (config.allowedTerrain.includes(tile.type)) {
                        validPositions.push({ x, z, tile });
                    }
                }
            }
            
            // Spawn trees in this chunk
            const treesInChunk = Math.floor(validPositions.length * config.spawnProbability);
            
            for (let i = 0; i < treesInChunk && validPositions.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * validPositions.length);
                const pos = validPositions[randomIndex];
                
                // Add random offset within the tile
                const offsetX = pos.x + (Math.random() * 0.6 - 0.3);
                const offsetZ = pos.z + (Math.random() * 0.6 - 0.3);
                
                const tree = new TileObject(
                    offsetX,
                    offsetZ,
                    'tree',
                    config
                );
                trees.push(tree);
                
                // Remove used position
                validPositions.splice(randomIndex, 1);
            }
        }
        
        // Add extra trees near roads
        console.log('Adding trees near roads...');
        const roadTrees = this.generateRoadTrees(tileMap);
        trees.push(...roadTrees);
        
        // Validate all created trees before returning
        const validTrees = trees.filter(tree => {
            if (!tree.config) {
                console.error('Tree without config found!', tree);
                return false;
            }
            return true;
        });
        
        if (validTrees.length !== trees.length) {
            console.error(`Filtered out ${trees.length - validTrees.length} invalid trees`);
        }
        
        const endTime = performance.now();
        console.log(`Generated ${validTrees.length} valid trees (${roadTrees.length} near roads) in ${(endTime - startTime).toFixed(2)}ms`);
        
        return validTrees;
    }
    
    static generateRoadTrees(tileMap) {
        const trees = [];
        const config = Config.TILE_OBJECTS.tree;
        
        // Validate config exists
        if (!config) {
            console.error('Tree config not found in generateRoadTrees!');
            return [];
        }
        
        const roadProximity = 3; // Trees within 3 tiles of roads
        const spawnChance = 0.08; // 8% chance per valid tile near road
        
        // Sample every 4 tiles for performance
        for (let z = 0; z < tileMap.height; z += 4) {
            for (let x = 0; x < tileMap.width; x += 4) {
                const tile = tileMap.getTile(x, z);
                
                // Check if tile is valid for trees
                if (!tile || !config.allowedTerrain.includes(tile.type)) {
                    continue;
                }
                
                // Check if near a road
                const nearRoad = this.isNearRoad(tileMap, x, z, roadProximity);
                if (!nearRoad) {
                    continue;
                }
                
                // Random spawn
                if (Math.random() < spawnChance) {
                    const offsetX = x + (Math.random() * 0.6 - 0.3);
                    const offsetZ = z + (Math.random() * 0.6 - 0.3);
                    
                    // Ensure config is passed properly
                    const tree = new TileObject(
                        offsetX,
                        offsetZ,
                        'tree',
                        config // Make sure config is passed
                    );
                    
                    // Verify tree object has config
                    if (!tree.config) {
                        console.error('Tree created without config!', tree);
                        continue;
                    }
                    
                    trees.push(tree);
                }
            }
        }
        
        return trees;
    }
    
    static isNearRoad(tileMap, x, z, maxDistance) {
        for (let dz = -maxDistance; dz <= maxDistance; dz++) {
            for (let dx = -maxDistance; dx <= maxDistance; dx++) {
                const tile = tileMap.getTile(x + dx, z + dz);
                if (tile && tile.type === Config.TILE_TYPES.ROAD) {
                    return true;
                }
            }
        }
        return false;
    }
}
