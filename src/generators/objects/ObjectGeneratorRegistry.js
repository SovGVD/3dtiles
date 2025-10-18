import { TreeGenerator } from './TreeGenerator.js';

export class ObjectGeneratorRegistry {
    static generators = new Map();
    
    static register(type, generator) {
        this.generators.set(type, generator);
    }
    
    static generateAll(tileMap) {
        const allObjects = [];
        
        for (const [type, generator] of this.generators.entries()) {
            const objects = generator.generate(tileMap);
            allObjects.push(...objects);
        }
        
        return allObjects;
    }
    
    static initialize() {
        // Register all object generators
        this.register('tree', TreeGenerator);
        
        console.log(`Registered ${this.generators.size} object generators`);
    }
}
