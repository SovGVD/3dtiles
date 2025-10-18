import { TileObject } from '../../TileObject.js';
import { Config } from '../../config.js';

export class TreeGenerator {
    static generate(tileMap) {
        console.log('Generating trees...');
        const startTime = performance.now();
        
        const trees = [];
        const config = Config.TILE_OBJECTS.tree;
        const validPositions = [];
        
        // Collect all valid positions for trees
        for (let z = 0; z < tileMap.height; z++) {
            for (let x = 0; x < tileMap.width; x++) {
                const tile = tileMap.tiles[z][x];
                
                if (config.allowedTerrain.includes(tile.type)) {
                    validPositions.push({ x, z, tile });
                }
            }
        }
        
        // Randomly select positions to spawn trees
        const treeCount = Math.floor(validPositions.length * config.spawnProbability);
        
        for (let i = 0; i < treeCount; i++) {
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
            
            // Remove used position to avoid duplicates
            validPositions.splice(randomIndex, 1);
        }
        
        const endTime = performance.now();
        console.log(`Generated ${trees.length} trees in ${(endTime - startTime).toFixed(2)}ms`);
        
        return trees;
    }
}
