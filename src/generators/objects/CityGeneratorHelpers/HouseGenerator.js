import { Config } from '../../../config.js';

export class HouseGenerator {
    static generate(city, tileMap) {
        console.log(`Generating houses for ${city.size}x${city.size} city`);
        const startTime = performance.now();
        
        // Find city blocks (areas between roads)
        const blocks = this.findCityBlocks(city, tileMap);
        console.log(`  Found ${blocks.length} city blocks`);
        
        // Fill blocks with houses
        let houseCount = 0;
        for (const block of blocks) {
            houseCount += this.fillBlockWithHouses(block, city, tileMap);
        }
        
        const endTime = performance.now();
        console.log(`  Generated ${houseCount} houses in ${(endTime - startTime).toFixed(2)}ms`);
        
        return houseCount;
    }
    
    static findCityBlocks(city, tileMap) {
        const blocks = [];
        const visited = new Set();
        
        // Flood fill to find contiguous non-road areas
        for (let z = 0; z < city.size; z++) {
            for (let x = 0; x < city.size; x++) {
                const worldX = city.x + x;
                const worldZ = city.z + z;
                const key = `${worldX}_${worldZ}`;
                
                if (visited.has(key)) continue;
                
                const tile = tileMap.getTile(worldX, worldZ);
                if (!tile || tile.type !== Config.TILE_TYPES.CITY) continue;
                
                // Found unvisited city tile, start flood fill
                const block = this.floodFillBlock(worldX, worldZ, city, tileMap, visited);
                
                if (block.length >= 4) { // Minimum block size
                    blocks.push(block);
                }
            }
        }
        
        return blocks;
    }
    
    static floodFillBlock(startX, startZ, city, tileMap, visited) {
        const block = [];
        const queue = [{ x: startX, z: startZ }];
        
        while (queue.length > 0) {
            const { x, z } = queue.shift();
            const key = `${x}_${z}`;
            
            if (visited.has(key)) continue;
            
            const tile = tileMap.getTile(x, z);
            if (!tile || tile.type !== Config.TILE_TYPES.CITY) continue;
            
            visited.add(key);
            block.push({ x, z });
            
            // Check neighbors
            const neighbors = [
                { x: x + 1, z: z },
                { x: x - 1, z: z },
                { x: x, z: z + 1 },
                { x: x, z: z - 1 }
            ];
            
            for (const neighbor of neighbors) {
                const nKey = `${neighbor.x}_${neighbor.z}`;
                if (!visited.has(nKey)) {
                    queue.push(neighbor);
                }
            }
        }
        
        return block;
    }
    
    static fillBlockWithHouses(block, city, tileMap) {
        let houseCount = 0;
        const usedTiles = new Set();
        
        // Sort tiles by position for consistent processing
        block.sort((a, b) => a.z !== b.z ? a.z - b.z : a.x - b.x);
        
        // Try to create rectangular houses
        for (const tile of block) {
            const key = `${tile.x}_${tile.z}`;
            if (usedTiles.has(key)) continue;
            
            // Skip some tiles for courtyards/spacing (10% chance)
            if (Math.random() < 0.1) {
                usedTiles.add(key);
                // Keep it as city type (courtyard)
                const mapTile = tileMap.getTile(tile.x, tile.z);
                if (mapTile) {
                    mapTile.type = Config.TILE_TYPES.CITY;
                }
                continue;
            }
            
            // Find largest possible rectangle starting from this tile
            const house = this.findLargestRectangle(tile.x, tile.z, block, usedTiles);
            
            if (house) {
                // Create house with dimensions
                const minHeight = Config.TERRAIN_CONFIG.house.minHeight;
                const maxHeight = Config.TERRAIN_CONFIG.house.maxHeight;
                const height = minHeight + Math.random() * (maxHeight - minHeight);
                
                // Mark all tiles in the house
                for (let z = house.z; z < house.z + house.depth; z++) {
                    for (let x = house.x; x < house.x + house.width; x++) {
                        const mapTile = tileMap.getTile(x, z);
                        if (mapTile) {
                            mapTile.type = Config.TILE_TYPES.HOUSE;
                            mapTile.houseHeight = height;
                            mapTile.houseWidth = house.width;
                            mapTile.houseDepth = house.depth;
                            mapTile.houseOriginX = house.x;
                            mapTile.houseOriginZ = house.z;
                            usedTiles.add(`${x}_${z}`);
                        }
                    }
                }
                
                houseCount++;
            } else {
                // Couldn't fit a house (too small), keep as city
                usedTiles.add(key);
                const mapTile = tileMap.getTile(tile.x, tile.z);
                if (mapTile) {
                    mapTile.type = Config.TILE_TYPES.CITY;
                }
            }
        }
        
        return houseCount;
    }
    
    static findLargestRectangle(startX, startZ, block, usedTiles) {
        // Create a grid for quick lookups
        const blockSet = new Set(block.map(t => `${t.x}_${t.z}`));
        
        // Find bounds
        let minX = startX, maxX = startX;
        let minZ = startZ, maxZ = startZ;
        
        for (const tile of block) {
            minX = Math.min(minX, tile.x);
            maxX = Math.max(maxX, tile.x);
            minZ = Math.min(minZ, tile.z);
            maxZ = Math.max(maxZ, tile.z);
        }
        
        // Try different rectangle sizes, prefer larger ones
        const maxWidth = Math.min(8, maxX - startX + 1);
        const maxDepth = Math.min(8, maxZ - startZ + 1);
        
        let bestRect = null;
        let bestArea = 0;
        
        for (let w = maxWidth; w >= 2; w--) {
            for (let d = maxDepth; d >= 2; d--) {
                const area = w * d;
                if (area <= bestArea) continue;
                
                // Check if rectangle fits
                let fits = true;
                for (let z = startZ; z < startZ + d && fits; z++) {
                    for (let x = startX; x < startX + w && fits; x++) {
                        const key = `${x}_${z}`;
                        if (usedTiles.has(key) || !blockSet.has(key)) {
                            fits = false;
                        }
                    }
                }
                
                if (fits) {
                    bestRect = { x: startX, z: startZ, width: w, depth: d };
                    bestArea = area;
                }
            }
        }
        
        // No single-tile houses - if we can't find at least 2x2, return null
        return bestRect;
    }
}
