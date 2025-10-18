import { Config } from '../../config.js';

export class RiverGenerator {
    static generate(tileMap) {
        console.log('=== RIVER GENERATION START ===');
        const startTime = performance.now();
        
        // Find all water bodies (lakes)
        const waterBodies = this.findWaterBodies(tileMap);
        console.log(`Found ${waterBodies.length} water bodies`);
        
        if (waterBodies.length < 2) {
            console.log('Not enough water bodies for rivers');
            return [];
        }
        
        const riverTiles = new Set();
        let riversCreated = 0;
        
        // Connect nearby water bodies with rivers
        for (let i = 0; i < waterBodies.length; i++) {
            for (let j = i + 1; j < waterBodies.length; j++) {
                const dist = this.distance(waterBodies[i], waterBodies[j]);
                
                // Connect if reasonably close (not too far)
                if (dist < 200 && dist > 20 && Math.random() < 0.4) {
                    const river = this.createRiver(tileMap, waterBodies[i], waterBodies[j], riverTiles);
                    if (river) {
                        riversCreated++;
                        console.log(`River ${riversCreated}: ${river.length} tiles`);
                    }
                }
            }
        }
        
        // Apply river tiles
        let appliedCount = 0;
        riverTiles.forEach(key => {
            const [x, z] = key.split('_').map(Number);
            const tile = tileMap.getTile(x, z);
            if (tile && tile.type !== Config.TILE_TYPES.WATER) {
                tile.type = Config.TILE_TYPES.WATER;
                tile.height = -1; // Lower river beds
                appliedCount++;
            }
        });
        
        const endTime = performance.now();
        console.log(`=== RIVER GENERATION COMPLETE ===`);
        console.log(`Created ${riversCreated} rivers with ${appliedCount} tiles in ${(endTime - startTime).toFixed(2)}ms\n`);
        
        return [];
    }
    
    static findWaterBodies(tileMap) {
        const waterBodies = [];
        const visited = new Set();
        
        // Sample every 32 tiles to find water body centers
        for (let z = 0; z < tileMap.height; z += 32) {
            for (let x = 0; x < tileMap.width; x += 32) {
                const key = `${x}_${z}`;
                if (visited.has(key)) continue;
                
                const tile = tileMap.getTile(x, z);
                if (tile && tile.type === Config.TILE_TYPES.WATER) {
                    // Found water, mark nearby area as one body
                    waterBodies.push({ x, z });
                    
                    // Mark surrounding area as visited
                    for (let oz = -16; oz <= 16; oz += 8) {
                        for (let ox = -16; ox <= 16; ox += 8) {
                            visited.add(`${x + ox}_${z + oz}`);
                        }
                    }
                }
            }
        }
        
        return waterBodies;
    }
    
    static createRiver(tileMap, start, end, existingRivers) {
        const path = this.findPath(tileMap, start, end, existingRivers);
        
        if (path) {
            // Widen river slightly (3 tiles wide)
            const widenedPath = [];
            for (const point of path) {
                widenedPath.push(point);
                // Add perpendicular tiles
                if (Math.random() < 0.6) {
                    widenedPath.push({ x: point.x + 1, z: point.z });
                    widenedPath.push({ x: point.x - 1, z: point.z });
                }
            }
            
            widenedPath.forEach(point => {
                existingRivers.add(`${point.x}_${point.z}`);
            });
            
            return widenedPath;
        }
        
        return null;
    }
    
    static findPath(tileMap, start, goal, existingRivers) {
        const openSet = [{ ...start, g: 0, h: this.heuristic(start, goal), f: this.heuristic(start, goal) }];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        
        gScore.set(`${start.x}_${start.z}`, 0);
        
        while (openSet.length > 0) {
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            const currentKey = `${current.x}_${current.z}`;
            
            if (this.distance(current, goal) < 5) {
                return this.reconstructPath(cameFrom, current);
            }
            
            closedSet.add(currentKey);
            
            const neighbors = [
                { x: current.x + 1, z: current.z },
                { x: current.x - 1, z: current.z },
                { x: current.x, z: current.z + 1 },
                { x: current.x, z: current.z - 1 }
            ];
            
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x}_${neighbor.z}`;
                if (closedSet.has(neighborKey)) continue;
                
                const tile = tileMap.getTile(neighbor.x, neighbor.z);
                if (!tile) continue;
                
                // Rivers prefer low ground and existing water
                let moveCost = 1;
                if (tile.type === Config.TILE_TYPES.WATER || existingRivers.has(neighborKey)) {
                    moveCost = 0.1; // Follow existing water
                } else if (tile.height < 0) {
                    moveCost = 0.5; // Prefer low areas
                } else if (tile.type === Config.TILE_TYPES.ROCK) {
                    moveCost = 50; // Avoid mountains
                } else {
                    moveCost = 1 + tile.height * 2; // Cost increases with height
                }
                
                const tentativeG = gScore.get(currentKey) + moveCost;
                
                if (!gScore.has(neighborKey) || tentativeG < gScore.get(neighborKey)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeG);
                    
                    const h = this.heuristic(neighbor, goal);
                    const f = tentativeG + h;
                    
                    const existing = openSet.find(n => n.x === neighbor.x && n.z === neighbor.z);
                    if (existing) {
                        existing.g = tentativeG;
                        existing.h = h;
                        existing.f = f;
                    } else {
                        openSet.push({ ...neighbor, g: tentativeG, h, f });
                    }
                }
            }
        }
        
        return null;
    }
    
    static reconstructPath(cameFrom, current) {
        const path = [{ x: current.x, z: current.z }];
        let currentKey = `${current.x}_${current.z}`;
        
        while (cameFrom.has(currentKey)) {
            const prev = cameFrom.get(currentKey);
            path.unshift({ x: prev.x, z: prev.z });
            currentKey = `${prev.x}_${prev.z}`;
        }
        
        return path;
    }
    
    static heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
    }
    
    static distance(a, b) {
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        return Math.sqrt(dx * dx + dz * dz);
    }
}
