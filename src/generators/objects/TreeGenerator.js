import { TileObject } from '../../TileObject.js';
import { Config } from '../../config.js';
import { GameState } from '../../GameState.js';

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
        
        // Add trees near roads
        console.log('Adding trees near roads...');
        const roadTrees = this.addTreesNearRoads(tileMap, trees);
        
        // Add trees near cities
        console.log('Adding trees near cities...');
        const cityTrees = this.addTreesNearCities(tileMap, trees);
        
        const endTime = performance.now();
        console.log(`Generated ${trees.length} valid trees (${roadTrees} near roads, ${cityTrees} near cities) in ${(endTime - startTime).toFixed(2)}ms`);
        
        return trees;
    }
    
    static addTreesNearRoads(tileMap, existingTrees) {
        let count = 0; // Changed from array to count
        const config = Config.TILE_OBJECTS.tree;
        
        // Validate config exists
        if (!config) {
            console.error('Tree config not found in generateRoadTrees!');
            return 0; // Changed to return 0
        }
        
        const roadProximity = 3;
        const spawnChance = 0.08;
        
        // Sample every 4 tiles for performance
        for (let z = 0; z < tileMap.height; z += 4) {
            for (let x = 0; x < tileMap.width; x += 4) {
                const tile = tileMap.getTile(x, z);
                
                if (!tile || !config.allowedTerrain.includes(tile.type)) {
                    continue;
                }
                
                const nearRoad = this.isNearRoad(tileMap, x, z, roadProximity);
                if (!nearRoad) {
                    continue;
                }
                
                if (Math.random() < spawnChance) {
                    const offsetX = x + (Math.random() * 0.6 - 0.3);
                    const offsetZ = z + (Math.random() * 0.6 - 0.3);
                    
                    const tree = new TileObject(offsetX, offsetZ, 'tree', config);
                    
                    if (!tree.config) {
                        console.error('Tree created without config!', tree);
                        continue;
                    }
                    
                    existingTrees.push(tree); // Add to existingTrees instead of new array
                    count++;
                }
            }
        }
        
        return count; // Return count
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
    
    static addTreesNearCities(tileMap, existingTrees) {
        const cities = GameState.getCities();
        if (!cities || cities.length === 0) {
            console.log('No cities found for tree placement');
            return 0;
        }
        
        console.log(`Adding trees near ${cities.length} cities`);
        
        let count = 0;
        const treesPerCity = 300;
        const cityBuffer = 3; // How close to city
        const maxDistance = 20; // Trees can be up to 50 tiles from city edge
        const config = Config.TILE_OBJECTS.tree;
        
        for (const city of cities) {
            console.log(`Adding trees around city at (${city.x}, ${city.z}), size: ${city.size}`);
            
            for (let i = 0; i < treesPerCity; i++) {
                const side = Math.floor(Math.random() * 4);
                let x, z;
                
                switch (side) {
                    case 0: // North
                        x = city.x + Math.random() * city.size;
                        z = city.z - cityBuffer - Math.random() * maxDistance;
                        break;
                    case 1: // East
                        x = city.x + city.size + cityBuffer + Math.random() * maxDistance;
                        z = city.z + Math.random() * city.size;
                        break;
                    case 2: // South
                        x = city.x + Math.random() * city.size;
                        z = city.z + city.size + cityBuffer + Math.random() * maxDistance;
                        break;
                    case 3: // West
                        x = city.x - cityBuffer - Math.random() * maxDistance;
                        z = city.z + Math.random() * city.size;
                        break;
                }
                
                const tile = tileMap.getTile(Math.floor(x), Math.floor(z));
                
                if (this.isValidTreeLocation(tile, Math.floor(x), Math.floor(z), tileMap, existingTrees)) {
                    const tree = new TileObject(x, z, 'tree', config);
                    existingTrees.push(tree);
                    count++;
                }
            }
        }
        
        console.log(`Added ${count} trees near cities`);
        return count;
    }
    
    static isValidTreeLocation(tile, x, z, tileMap, existingTrees) {
        // Check tile is valid and in bounds
        if (!tile || x < 0 || x >= tileMap.width || z < 0 || z >= tileMap.height) {
            return false;
        }
        
        // Check terrain type
        const config = Config.TILE_OBJECTS.tree;
        if (!config.allowedTerrain.includes(tile.type)) {
            return false;
        }
        
        // Check distance to existing trees (reduced from 2 to 1)
        const minDistance = 1;
        for (const tree of existingTrees) {
            const dx = tree.x - x;
            const dz = tree.z - z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance < minDistance) {
                return false;
            }
        }
        
        return true;
    }
}
