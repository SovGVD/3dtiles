import { Config } from '../../config.js';

export class RoadGenerator {
    static generate(tileMap, cities = []) {
        console.log('=== ROAD GENERATION START ===');
        const startTime = performance.now();
        
        // Count tile types first
        let grassCount = 0, terrainCount = 0;
        for (let z = 0; z < Math.min(100, tileMap.height); z++) {
            for (let x = 0; x < Math.min(100, tileMap.width); x++) {
                const tile = tileMap.getTile(x, z);
                if (tile) {
                    if (tile.type === Config.TILE_TYPES.GRASS) grassCount++;
                    if (tile.type === Config.TILE_TYPES.TERRAIN) terrainCount++;
                }
            }
        }
        console.log(`Sample area has ${grassCount} grass tiles, ${terrainCount} terrain tiles`);
        
        // Use city centers as primary destinations
        const cityDestinations = cities.map(city => ({
            x: Math.floor(city.centerX),
            z: Math.floor(city.centerZ),
            isCity: true
        }));
        
        console.log(`Using ${cityDestinations.length} cities as road destinations`);
        
        // Add additional random destinations
        const additionalDests = this.findDestinationPoints(tileMap, 20);
        const destinations = [...cityDestinations, ...additionalDests];
        
        console.log(`Total ${destinations.length} road destination points`);
        
        if (destinations.length < 2) {
            console.log('Not enough destination points for roads');
            return [];
        }
        
        // Track all road tiles
        const roadTiles = new Set();
        const roadPaths = [];
        const roadWidths = new Map();
        
        // FIRST: Connect all cities using minimum spanning tree approach
        if (cityDestinations.length > 1) {
            console.log('\n=== CONNECTING CITIES ===');
            this.connectCities(cityDestinations, tileMap, roadTiles, roadPaths, roadWidths);
        }
        
        // THEN: Connect additional destinations to the network
        console.log('\n=== CONNECTING ADDITIONAL DESTINATIONS ===');
        for (let i = cityDestinations.length; i < destinations.length; i++) {
            const start = destinations[i];
            const target = this.findNearestPoint(start, destinations.slice(0, i), roadPaths);
            
            console.log(`Connecting point ${i}: (${start.x},${start.z}) -> (${target.x},${target.z})`);
            
            const path = this.findPath(tileMap, start, target, roadTiles);
            
            if (path) {
                console.log(`  ✓ Path found with ${path.length} tiles`);
                const width = Math.floor(Math.random() * 4) + 1;
                roadPaths.push(path);
                this.widenRoad(path, width, roadTiles, roadWidths);
            }
        }
        
        // Add extra connections for redundancy
        console.log('\n=== ADDING EXTRA CONNECTIONS ===');
        for (let i = 0; i < destinations.length; i++) {
            for (let j = i + 2; j < destinations.length; j++) {
                const dist = this.distance(destinations[i], destinations[j]);
                
                if (dist < 200 && Math.random() < 0.5) {
                    const path = this.findPath(tileMap, destinations[i], destinations[j], roadTiles);
                    if (path) {
                        console.log(`  Extra connection: ${i} -> ${j} (${path.length} tiles)`);
                        const width = Math.floor(Math.random() * 3) + 1;
                        roadPaths.push(path);
                        this.widenRoad(path, width, roadTiles, roadWidths);
                    }
                }
            }
        }
        
        console.log(`\nTotal road tiles to apply: ${roadTiles.size}`);
        
        // Apply road tiles to the map
        let appliedCount = 0;
        let skippedProtected = 0;
        
        roadTiles.forEach(key => {
            const [x, z] = key.split('_').map(Number);
            const tile = tileMap.getTile(x, z);
            
            if (tile) {
                // Check if road can override this tile type
                const canOverride = !Config.ROAD_CANNOT_OVERRIDE.includes(tile.type);
                
                if (canOverride) {
                    tile.type = Config.TILE_TYPES.ROAD;
                    tile.height = 0; // Flatten roads
                    appliedCount++;
                } else {
                    skippedProtected++;
                }
            }
        });
        
        const endTime = performance.now();
        console.log(`\n=== ROAD GENERATION COMPLETE ===`);
        console.log(`Applied: ${appliedCount} road tiles`);
        console.log(`Skipped protected: ${skippedProtected} (water/rock/city)`);
        console.log(`Time: ${(endTime - startTime).toFixed(2)}ms\n`);
        
        return [];
    }
    
    static findDestinationPoints(tileMap, count = 12) {
        const destinations = [];
        const attempts = count * 30;
        
        for (let attempt = 0; attempt < attempts && destinations.length < count; attempt++) {
            const x = Math.floor(Math.random() * tileMap.width);
            const z = Math.floor(Math.random() * tileMap.height);
            const tile = tileMap.getTile(x, z);
            
            // Accept grass or terrain
            if (!tile || (tile.type !== Config.TILE_TYPES.GRASS && tile.type !== Config.TILE_TYPES.TERRAIN)) continue;
            
            // Make sure not too close to existing destinations
            const tooClose = destinations.some(dest => {
                const dx = dest.x - x;
                const dz = dest.z - z;
                return Math.sqrt(dx * dx + dz * dz) < 30; // Reduced from 40 to 30 for denser network
            });
            
            if (!tooClose) {
                destinations.push({ x, z });
            }
        }
        
        return destinations;
    }
    
    static connectCities(cities, tileMap, roadTiles, roadPaths, roadWidths) {
        if (cities.length === 0) return;
        
        // Use Prim's algorithm to create minimum spanning tree
        const connected = new Set();
        const unconnected = new Set(cities.map((c, i) => i));
        
        // Start with first city
        const startIdx = 0;
        connected.add(startIdx);
        unconnected.delete(startIdx);
        
        let connectionCount = 0;
        
        while (unconnected.size > 0 && connectionCount < cities.length * 2) {
            let bestConnection = null;
            let bestDistance = Infinity;
            let bestFrom = null;
            let bestTo = null;
            
            // Find shortest connection from connected to unconnected
            for (const fromIdx of connected) {
                for (const toIdx of unconnected) {
                    const dist = this.distance(cities[fromIdx], cities[toIdx]);
                    if (dist < bestDistance) {
                        bestDistance = dist;
                        bestFrom = fromIdx;
                        bestTo = toIdx;
                    }
                }
            }
            
            if (bestFrom !== null && bestTo !== null) {
                console.log(`Connecting city ${bestFrom} to city ${bestTo} (distance: ${bestDistance.toFixed(0)})`);
                
                const path = this.findPath(tileMap, cities[bestFrom], cities[bestTo], roadTiles);
                
                if (path) {
                    console.log(`  ✓ City connection established with ${path.length} tiles`);
                    // Cities get wider roads (2-4 tiles)
                    const width = Math.floor(Math.random() * 3) + 2;
                    roadPaths.push(path);
                    this.widenRoad(path, width, roadTiles, roadWidths);
                    
                    connected.add(bestTo);
                    unconnected.delete(bestTo);
                } else {
                    console.log(`  ✗ Failed to connect cities ${bestFrom} and ${bestTo}`);
                    // Try to connect anyway by marking as connected
                    connected.add(bestTo);
                    unconnected.delete(bestTo);
                }
            } else {
                break;
            }
            
            connectionCount++;
        }
        
        console.log(`Connected ${connected.size} cities with ${connectionCount} roads`);
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
        
        let iterations = 0;
        const maxIterations = 1000000;
        
        while (openSet.length > 0 && iterations < maxIterations) {
            iterations++;
            
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            
            const currentKey = `${current.x}_${current.z}`;
            
            // Stop if we reached the goal OR if we hit an existing road
            if (current.x === goal.x && current.z === goal.z) {
                console.log(`  Path found in ${iterations} iterations`);
                return this.reconstructPath(cameFrom, current);
            }
            
            // Stop if we reached an existing road (not the start point)
            if (existingRoads.has(currentKey) && (current.x !== start.x || current.z !== start.z)) {
                console.log(`  Path connected to existing road at (${current.x},${current.z}) in ${iterations} iterations`);
                return this.reconstructPath(cameFrom, current);
            }
            
            closedSet.add(currentKey);
            
            // Check neighbors (4-directional)
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
                
                // Calculate cost (prefer grass and terrain, penalize others, reward existing roads)
                let moveCost = 1;
                if (tile.type === Config.TILE_TYPES.GRASS || tile.type === Config.TILE_TYPES.TERRAIN) {
                    moveCost = 1;
                } else if (tile.type === Config.TILE_TYPES.ROAD || existingRoads.has(neighborKey)) {
                    moveCost = 0.3; // Strongly prefer following existing roads
                } else if (tile.type === Config.TILE_TYPES.WATER || tile.type === Config.TILE_TYPES.ROCK) {
                    moveCost = 100; // Heavy penalty but not impossible
                } else {
                    moveCost = 5;
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
        
        console.log(`  Path search failed after ${iterations} iterations`);
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
    
    static widenRoad(path, width, roadTiles, roadWidths) {
        // Add wiggle only to 1-tile wide roads
        let processedPath = path;
        if (width === 1 && path.length > 5) {
            processedPath = this.addWiggleToPath(path);
        }
        
        // Add center path
        processedPath.forEach(point => {
            const key = `${point.x}_${point.z}`;
            roadTiles.add(key);
            roadWidths.set(key, width);
        });
        
        // Widen road if width > 1
        if (width > 1) {
            for (let i = 1; i < processedPath.length; i++) {
                const prev = processedPath[i - 1];
                const curr = processedPath[i];
                
                const dx = curr.x - prev.x;
                const dz = curr.z - prev.z;
                
                let perpX = 0, perpZ = 0;
                if (dx !== 0) {
                    perpX = 0;
                    perpZ = 1;
                } else {
                    perpX = 1;
                    perpZ = 0;
                }
                
                const halfWidth = Math.floor(width / 2);
                for (let w = 1; w <= halfWidth; w++) {
                    roadTiles.add(`${curr.x + perpX * w}_${curr.z + perpZ * w}`);
                    roadTiles.add(`${curr.x - perpX * w}_${curr.z - perpZ * w}`);
                    
                    if (width % 2 === 0 && w === halfWidth) {
                        roadTiles.delete(`${curr.x - perpX * w}_${curr.z - perpZ * w}`);
                    }
                }
            }
        }
    }
    
    static addWiggleToPath(path) {
        const wiggledPath = [path[0]]; // Keep start
        
        for (let i = 1; i < path.length - 1; i++) {
            const prev = path[i - 1];
            const curr = path[i];
            const next = path[i + 1];
            
            // Determine if we're moving horizontally or vertically
            const dx = curr.x - prev.x;
            const dz = curr.z - prev.z;
            
            // Add slight random offset perpendicular to direction
            if (Math.random() < 0.3) { // 30% chance to wiggle
                let offsetX = curr.x;
                let offsetZ = curr.z;
                
                if (dx !== 0) {
                    // Horizontal movement, wiggle vertically
                    offsetZ += Math.random() < 0.5 ? 1 : -1;
                } else if (dz !== 0) {
                    // Vertical movement, wiggle horizontally
                    offsetX += Math.random() < 0.5 ? 1 : -1;
                }
                
                wiggledPath.push({ x: offsetX, z: offsetZ });
            } else {
                wiggledPath.push(curr);
            }
        }
        
        wiggledPath.push(path[path.length - 1]); // Keep end
        
        return wiggledPath;
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
