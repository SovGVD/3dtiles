import { TreeGenerator } from './TreeGenerator.js';
import { RoadGenerator } from './RoadGenerator.js';

export class ObjectGeneratorRegistry {
    static generators = [];
    
    static register(type, generator, order = 100) {
        this.generators.push({ type, generator, order });
        this.generators.sort((a, b) => a.order - b.order);
    }
    
    static generateAll(tileMap) {
        const allObjects = [];
        
        console.log('Starting object generation...');
        
        for (const { type, generator } of this.generators) {
            console.log(`Generating ${type}...`);
            const result = generator.generate(tileMap);
            
            // Roads modify tiles directly, trees return objects
            if (result && Array.isArray(result)) {
                console.log(`  ${type}: ${result.length} objects created`);
                allObjects.push(...result);
            } else {
                console.log(`  ${type}: completed (modifies tiles)`);
            }
        }
        
        console.log('Object generation complete');
        return allObjects;
    }
    
    static initialize() {
        // Register generators in order (roads first, then trees)
        this.register('road', RoadGenerator, 1);
        this.register('tree', TreeGenerator, 2);
        
        console.log(`Registered ${this.generators.length} object generators`);
    }
}
