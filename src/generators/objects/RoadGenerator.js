import { Config } from '../../config.js';

export class RoadGenerator {
    static generate(tileMap) {
        console.log('Generating roads...');
        const startTime = performance.now();
        
        // Find destination points near water on grass tiles
        const destinations = this.findDestinationPoints(tileMap);
        console.log(`Found ${destinations.length} road destination points`);
        
        if (destinations.length < 2) {
            console.log('Not enough destination points for roads');
            return;
        }
        
        // Track all road tiles
        const roadTiles = new Set();
        const roadPaths = [];
        
        // Connect destinations using A* pathfinding
        for (let i = 1; i < destinations.length; i++) {
            const start = destinations[i];
            const target = this.findNearestPoint(start, destinations.slice(0, i), roadPaths);
            
            const path = this.findPath(tileMap, start, target, roadTiles);
            
            if (path) {
                roadPaths.push(path);
                path.forEach(point => {
                    roadTiles.add(`${point.x}_${point.z}`);
                });
            }
        }
        
        // Apply road tiles to the map
        roadTiles.forEach(key => {
            const [x, z] = key.split('_').map(Number);
            const tile = tileMap.getTile(x, z);
            if (tile && tile.type === Config.TILE_TYPES.GRASS) {
                tile.type = Config.TILE_TYPES.ROAD;
            }
        });
        
        const endTime = performance.now();
        console.log(`Generated ${roadTiles.size} road tiles in ${(endTime - startTime).toFixed(2)}ms`);
    }
    
    static findDestinationPoints(tileMap, count = 15, waterProximity = 5) {
        const destinations = [];
        const attempts = count * 10; // Try multiple times to find good points
        
        for (let attempt = 0; attempt < attempts && destinations.length < count; attempt++) {
            const x = Math.floor(Math.random() * tileMap.width);
            const z = Math.floor(Math.random() * tileMap.height);
            const tile = tileMap.getTile(x, z);
            
            if (!tile || tile.type !== Config.TILE_TYPES.GRASS) continue;
            
            // Check if near water
            const nearWater = this.isNearWater(tileMap, x, z, waterProximity);
            if (!nearWater) continue;
            
            // Make sure not too close to existing destinations
            const tooClose = destinations.some(dest => {
                const dx = dest.x - x;
                const dz = dest.z - z;
                return Math.sqrt(dx * dx + dz * dz) < 20;
            });
            
            if (!tooClose) {
                destinations.push({ x, z });
            }
        }
        
        return destinations;
    }
    
    static isNearWater(tileMap, x, z, maxDistance) {
        for (let dz = -maxDistance; dz <= maxDistance; dz++) {
            for (let dx = -maxDistance; dx <= maxDistance; dx++) {
                const tile = tileMap.getTile(x + dx, z + dz);
                if (tile && tile.type === Config.TILE_TYPES.WATER) {
                    return true;
                }
            }
        }
        return false;
    }
    
    static findNearestPoint(start, previousDestinations, existingPaths) {
        let nearest = previousDestinations[0];
        let minDist = Infinity;
        
        // Check distance to previous destinations
        for (const dest of previousDestinations) {
            const dist = this.distance(start, dest);
            if (dist < minDist) {
                minDist = dist;
                nearest = dest;
            }
        }
        
        // Also check distance to existing road paths
        for (const path of existingPaths) {
            for (const point of path) {
                const dist = this.distance(start, point);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = point;
                }
            }
        }
        
        return nearest;
    }
    
    static findPath(tileMap, start, goal, existingRoads) {
        const openSet = [{ ...start, g: 0, h: this.heuristic(start, goal), f: this.heuristic(start, goal) }];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        
        gScore.set(`${start.x}_${start.z}`, 0);
        
        while (openSet.length > 0) {
            // Find node with lowest f score
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            
            const currentKey = `${current.x}_${current.z}`;
            
            // Check if we reached the goal
            if (current.x === goal.x && current.z === goal.z) {
                return this.reconstructPath(cameFrom, current);
            }
            
            closedSet.add(currentKey);
            
            // Check neighbors
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
                
                // Calculate cost (prefer grass, penalize non-grass, reward existing roads)
                let moveCost = 1;
                if (tile.type === Config.TILE_TYPES.GRASS) {
                    moveCost = 1;
                } else if (existingRoads.has(neighborKey)) {
                    moveCost = 0.5; // Prefer following existing roads
                } else if (tile.type === Config.TILE_TYPES.WATER || tile.type === Config.TILE_TYPES.ROCK) {
                    continue; // Can't build roads on water or rock
                } else {
                    moveCost = 3; // Discourage non-grass terrain
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
        
        return null; // No path found
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
        // Manhattan distance
        return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
    }
    
    static distance(a, b) {
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        return Math.sqrt(dx * dx + dz * dz);
    }
}
