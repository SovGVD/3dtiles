import { TreeGenerator } from './TreeGenerator.js';
import { RoadGenerator } from './RoadGenerator.js';
import { CityGenerator } from './CityGenerator.js';

export class ObjectGeneratorRegistry {
    static generators = [];
    
    static register(type, generator, order = 100) {
        this.generators.push({ type, generator, order });
        this.generators.sort((a, b) => a.order - b.order);
    }
    
    static generateAll(tileMap) {
        const allObjects = [];
        let cities = [];
        
        console.log('Starting object generation...');
        
        for (const { type, generator } of this.generators) {
            console.log(`Generating ${type}...`);
            
            let result;
            if (type === 'road') {
                // Pass cities to road generator
                result = generator.generate(tileMap, cities);
            } else {
                result = generator.generate(tileMap);
            }
            
            // Store cities for road generator, but don't add them to objects array
            if (type === 'city' && result) {
                cities = result;
                console.log(`  ${type}: ${cities.length} cities created (not added to objects)`);
            } else if (result && Array.isArray(result)) {
                console.log(`  ${type}: ${result.length} objects created`);
                allObjects.push(...result);
            } else {
                console.log(`  ${type}: completed (modifies tiles)`);
            }
        }
        
        console.log(`Object generation complete - ${allObjects.length} renderable objects`);
        return allObjects;
    }
    
    static initialize() {
        // Register generators in order (cities first, then roads, then trees)
        this.register('city', CityGenerator, 0);
        this.register('road', RoadGenerator, 1);
        this.register('tree', TreeGenerator, 2);
        
        console.log(`Registered ${this.generators.length} object generators`);
    }
}
