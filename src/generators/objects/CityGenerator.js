import { Config } from '../../config.js';
import { GameState } from '../../GameState.js';
import { LSystemRoadGenerator } from './CityGeneratorHelpers/LSystemRoadGenerator.js';

export class CityGenerator {
    static generate(tileMap) {
        console.log('=== CITY GENERATION START ===');
        const startTime = performance.now();
        
        const cities = [];
        
        // Define city sizes: 3x 16x16, 2x 32x32, 2x 64x64, 1x 128x128
        const citySizes = [
            { size: 16, count: 3 },
            { size: 32, count: 2 },
            { size: 64, count: 2 },
            { size: 128, count: 1 }
        ];
        
        // Place cities with spacing
        const minSpacing = 100; // Minimum distance between cities
        
        for (const { size, count } of citySizes) {
            for (let i = 0; i < count; i++) {
                const city = this.placeCity(tileMap, size, cities, minSpacing);
                if (city) {
                    cities.push(city);
                    console.log(`Placed ${size}x${size} city at (${city.x}, ${city.z})`);
                }
            }
        }
        
        // Apply city tiles to map
        let cityTileCount = 0;
        for (const city of cities) {
            cityTileCount += this.applyCityToMap(tileMap, city);
        }
        
        // Generate roads within each city using L-System
        console.log('Generating city roads...');
        let totalCityRoads = 0;
        for (const city of cities) {
            const roadCount = LSystemRoadGenerator.generate(city, tileMap);
            totalCityRoads += roadCount;
        }
        
        // Store cities in global state
        GameState.setCities(cities);
        
        const endTime = performance.now();
        console.log(`=== CITY GENERATION COMPLETE ===`);
        console.log(`Placed ${cities.length} cities with ${cityTileCount} tiles and ${totalCityRoads} road tiles in ${(endTime - startTime).toFixed(2)}ms\n`);
        
        // Return empty array - cities modify tiles, don't need to be rendered as objects
        // But we return the cities array for the road generator to use
        return cities;
    }
    
    static placeCity(tileMap, size, existingCities, minSpacing) {
        const maxAttempts = 100;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Random position with margin from edges
            const margin = size;
            const x = Math.floor(margin + Math.random() * (tileMap.width - size - margin * 2));
            const z = Math.floor(margin + Math.random() * (tileMap.height - size - margin * 2));
            
            // Check if location is valid (not in water or on mountains)
            if (!this.isValidCityLocation(tileMap, x, z, size)) {
                continue;
            }
            
            // Check spacing from other cities
            const tooClose = existingCities.some(city => {
                const dx = city.x - x;
                const dz = city.z - z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                return dist < minSpacing;
            });
            
            if (!tooClose) {
                return {
                    x: x,
                    z: z,
                    centerX: x + size / 2,
                    centerZ: z + size / 2,
                    size: size
                };
            }
        }
        
        console.log(`Failed to place ${size}x${size} city after ${maxAttempts} attempts`);
        return null;
    }
    
    static isValidCityLocation(tileMap, x, z, size) {
        let waterCount = 0;
        let rockCount = 0;
        let steepCount = 0;
        let totalChecked = 0;
        
        // Check if entire city area is on valid terrain
        for (let oz = 0; oz < size; oz++) {
            for (let ox = 0; ox < size; ox++) {
                const tile = tileMap.getTile(x + ox, z + oz);
                if (!tile) return false;
                
                totalChecked++;
                
                // Cities can only be on grass or terrain, not water or rock
                if (tile.type === Config.TILE_TYPES.WATER) {
                    waterCount++;
                    if (waterCount > 5) return false; // Allow some water tiles
                }
                if (tile.type === Config.TILE_TYPES.ROCK) {
                    rockCount++;
                    if (rockCount > 5) return false; // Allow some rock tiles
                }
                
                // Avoid steep terrain - increased tolerance
                if (Math.abs(tile.height) > 8) {
                    steepCount++;
                    if (steepCount > size) return false; // More lenient
                }
            }
        }
        
        // Log rejection reasons for debugging
        if (waterCount > 0 || rockCount > 0 || steepCount > 0) {
            console.log(`  Location check: water=${waterCount}, rock=${rockCount}, steep=${steepCount} out of ${totalChecked}`);
        }
        
        return true;
    }
    
    static applyCityToMap(tileMap, city) {
        let count = 0;
        
        for (let oz = 0; oz < city.size; oz++) {
            for (let ox = 0; ox < city.size; ox++) {
                const tile = tileMap.getTile(city.x + ox, city.z + oz);
                if (tile) {
                    tile.type = Config.TILE_TYPES.CITY;
                    tile.height = 0; // Flatten city area
                    count++;
                }
            }
        }
        
        return count;
    }
}
