import { Config } from '../../../config.js';

export class LSystemRoadGenerator {
    static generate(city, tileMap) {
        console.log(`Generating L-System roads for ${city.size}x${city.size} city at (${city.x}, ${city.z})`);
        
        // Create global maps for guidance
        const globalMaps = this.createGlobalMaps(city);
        
        // Generate road network using Extended L-System
        const roadSegments = this.generateRoadNetwork(city, globalMaps, tileMap);
        
        // Convert segments to tiles
        const roadTiles = this.segmentsToTiles(roadSegments, city, tileMap);
        
        // Apply roads to map
        let appliedCount = 0;
        roadTiles.forEach(key => {
            const [x, z] = key.split('_').map(n => parseInt(n, 10));
            
            if (x >= 0 && x < tileMap.width && z >= 0 && z < tileMap.height) {
                const tile = tileMap.getTile(x, z);
                if (tile && tile.type === Config.TILE_TYPES.CITY) {
                    tile.type = Config.TILE_TYPES.CITY_ROAD;
                    tile.height = 0;
                    appliedCount++;
                }
            }
        });
        
        console.log(`  Generated ${appliedCount} city road tiles from ${roadSegments.length} segments`);
        return appliedCount;
    }
    
    static createGlobalMaps(city) {
        const centerX = city.size / 2;
        const centerZ = city.size / 2;
        
        // Population density map (higher near center)
        const populationDensity = [];
        for (let z = 0; z < city.size; z++) {
            populationDensity[z] = [];
            for (let x = 0; x < city.size; x++) {
                const dx = x - centerX;
                const dz = z - centerZ;
                const distFromCenter = Math.sqrt(dx * dx + dz * dz);
                const maxDist = Math.sqrt(centerX * centerX + centerZ * centerZ);
                populationDensity[z][x] = 1 - (distFromCenter / maxDist);
            }
        }
        
        return { populationDensity, centerX, centerZ };
    }
    
    static generateRoadNetwork(city, globalMaps, tileMap) {
        const segments = [];
        const segmentMap = new Map();
        
        // Axiom: Start with major roads from center
        const axiom = this.createAxiom(city, globalMaps);
        const queue = [...axiom];
        
        let iterations = 0;
        const maxIterations = this.getMaxIterations(city.size);
        
        while (queue.length > 0 && iterations < maxIterations) {
            iterations++;
            const segment = queue.shift();
            
            // Apply local constraints
            if (!this.checkLocalConstraints(segment, segments, segmentMap, city, tileMap)) {
                continue;
            }
            
            // Accept segment
            segments.push(segment);
            this.addToSegmentMap(segment, segmentMap);
            
            // Apply production rules
            const newSegments = this.applyProductionRules(segment, globalMaps, city, segments);
            queue.push(...newSegments);
        }
        
        console.log(`  L-System: ${segments.length} segments in ${iterations} iterations`);
        return segments;
    }
    
    static createAxiom(city, globalMaps) {
        const { centerX, centerZ } = globalMaps;
        const axiom = [];
        
        // Create 4 major roads in cardinal directions extending to edges
        const cardinalAngles = [0, Math.PI / 2, Math.PI, Math.PI * 3 / 2];
        
        for (const angle of cardinalAngles) {
            axiom.push({
                x: centerX,
                z: centerZ,
                angle: angle,
                length: city.size / 2 - 1,
                type: 'major',
                generation: 0
            });
        }
        
        // Add additional starting points along the main roads for better coverage
        const spacing = Math.floor(city.size / 6);
        for (let offset = spacing; offset < city.size / 2; offset += spacing) {
            // Horizontal roads
            axiom.push({
                x: offset,
                z: 0,
                angle: Math.PI / 2, // Down
                length: city.size - 1,
                type: 'minor',
                generation: 0
            });
            axiom.push({
                x: city.size - offset,
                z: 0,
                angle: Math.PI / 2, // Down
                length: city.size - 1,
                type: 'minor',
                generation: 0
            });
            
            // Vertical roads
            axiom.push({
                x: 0,
                z: offset,
                angle: 0, // Right
                length: city.size - 1,
                type: 'minor',
                generation: 0
            });
            axiom.push({
                x: 0,
                z: city.size - offset,
                angle: 0, // Right
                length: city.size - 1,
                type: 'minor',
                generation: 0
            });
        }
        
        return axiom;
    }
    
    static applyProductionRules(segment, globalMaps, city, existingSegments) {
        const newSegments = [];
        const endX = segment.x + Math.cos(segment.angle) * segment.length;
        const endZ = segment.z + Math.sin(segment.angle) * segment.length;
        
        // Rule 1: Branch perpendicular streets frequently
        if (segment.generation < 3) {
            const branchSpacing = segment.type === 'major' ? city.size / 8 : city.size / 12;
            const numBranches = Math.floor(segment.length / branchSpacing);
            
            for (let b = 1; b <= numBranches; b++) {
                const branchT = b / (numBranches + 1);
                const branchX = segment.x + Math.cos(segment.angle) * segment.length * branchT;
                const branchZ = segment.z + Math.sin(segment.angle) * segment.length * branchT;
                
                const branchLength = segment.type === 'major' ? city.size / 4 : city.size / 6;
                
                // Perpendicular branches
                if (Math.random() < 0.8) {
                    newSegments.push({
                        x: branchX,
                        z: branchZ,
                        angle: segment.angle + Math.PI / 2,
                        length: branchLength,
                        type: 'side',
                        generation: segment.generation + 1
                    });
                }
                if (Math.random() < 0.8) {
                    newSegments.push({
                        x: branchX,
                        z: branchZ,
                        angle: segment.angle - Math.PI / 2,
                        length: branchLength,
                        type: 'side',
                        generation: segment.generation + 1
                    });
                }
            }
        }
        
        // Rule 2: Extend side roads
        if (segment.type === 'side' && segment.generation < 2 && Math.random() < 0.5) {
            newSegments.push({
                x: endX,
                z: endZ,
                angle: segment.angle,
                length: city.size / 10,
                type: 'side',
                generation: segment.generation + 1
            });
        }
        
        return newSegments;
    }
    
    static checkLocalConstraints(segment, existingSegments, segmentMap, city, tileMap) {
        const endX = segment.x + Math.cos(segment.angle) * segment.length;
        const endZ = segment.z + Math.sin(segment.angle) * segment.length;
        
        // Constraint 1: Must be within city bounds
        if (segment.x < 0 || segment.x >= city.size ||
            segment.z < 0 || segment.z >= city.size ||
            endX < 0 || endX >= city.size ||
            endZ < 0 || endZ >= city.size) {
            return false;
        }
        
        // Constraint 2: Minimum road length
        if (segment.length < 2) {
            return false;
        }
        
        // Constraint 3: Check for intersections
        const steps = Math.ceil(segment.length * 2);
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const checkX = Math.floor(segment.x + Math.cos(segment.angle) * segment.length * t);
            const checkZ = Math.floor(segment.z + Math.sin(segment.angle) * segment.length * t);
            const key = `${checkX}_${checkZ}`;
            
            if (segmentMap.has(key)) {
                // Allow T-junctions at endpoints
                if (i > steps * 0.8) {
                    segment.length = segment.length * t;
                    return segment.length >= 2;
                }
                // Reject if overlapping in middle
                return false;
            }
        }
        
        return true;
    }
    
    static addToSegmentMap(segment, segmentMap) {
        const steps = Math.ceil(segment.length * 2);
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = Math.floor(segment.x + Math.cos(segment.angle) * segment.length * t);
            const z = Math.floor(segment.z + Math.sin(segment.angle) * segment.length * t);
            segmentMap.set(`${x}_${z}`, segment);
        }
    }
    
    static segmentsToTiles(segments, city, tileMap) {
        const tiles = new Set();
        
        for (const segment of segments) {
            const steps = Math.ceil(segment.length * 3);
            
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const localX = Math.floor(segment.x + Math.cos(segment.angle) * segment.length * t);
                const localZ = Math.floor(segment.z + Math.sin(segment.angle) * segment.length * t);
                
                const worldX = city.x + localX;
                const worldZ = city.z + localZ;
                
                if (worldX >= 0 && worldX < tileMap.width && 
                    worldZ >= 0 && worldZ < tileMap.height) {
                    tiles.add(`${worldX}_${worldZ}`);
                    
                    // Only the first 2 major roads (generation 0-1) are wider
                    if (segment.type === 'major' && segment.generation < 2) {
                        const perpX = Math.floor(-Math.sin(segment.angle));
                        const perpZ = Math.floor(Math.cos(segment.angle));
                        tiles.add(`${worldX + perpX}_${worldZ + perpZ}`);
                    }
                    // All other roads (minor, side, later major) are single tile
                }
            }
        }
        
        return tiles;
    }
    
    static sampleDensity(x, z, densityMap, citySize) {
        const ix = Math.floor(x);
        const iz = Math.floor(z);
        
        if (ix < 0 || ix >= citySize || iz < 0 || iz >= citySize) {
            return 0;
        }
        
        return densityMap[iz][ix];
    }
    
    static getMaxIterations(citySize) {
        if (citySize <= 8) return 20;
        if (citySize <= 16) return 100;
        if (citySize <= 32) return 300;
        if (citySize <= 64) return 600;
        return 1000;
    }
}
