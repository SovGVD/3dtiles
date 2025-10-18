import { TileObject } from '../../TileObject.js';
import { Config } from '../../config.js';

export class TreeGenerator {
    static generate(tileMap) {
        console.log('Generating trees...');
        const startTime = performance.now();
        
        const trees = [];
        const config = Config.TILE_OBJECTS.tree;
        
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
        
        const endTime = performance.now();
        console.log(`Generated ${trees.length} trees in ${(endTime - startTime).toFixed(2)}ms`);
        
        return trees;
    }
}
