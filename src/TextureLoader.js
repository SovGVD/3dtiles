import { Config } from './config.js';

export class TextureLoader {
    static images = new Map();
    static loadPromises = new Map();
    static isLoaded = false;
    
    static async preloadAll() {
        const loadPromises = [];
        
        for (const [type, path] of Object.entries(Config.TILE_TEXTURES)) {
            loadPromises.push(this.loadImage(type, path));
        }
        
        await Promise.all(loadPromises);
        this.isLoaded = true;
        console.log('All tile textures loaded:', this.images.size);
    }
    
    static loadImage(type, path) {
        if (this.loadPromises.has(type)) {
            return this.loadPromises.get(type);
        }
        
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.images.set(type, img);
                console.log(`Loaded texture: ${type}`);
                resolve(img);
            };
            
            img.onerror = () => {
                console.error(`Failed to load texture: ${type} from ${path}`);
                // Create fallback colored image
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');
                
                // Use tile color as fallback
                const color = Config.TILE_COLORS[type] || 0x808080;
                const r = (color >> 16) & 0xff;
                const g = (color >> 8) & 0xff;
                const b = color & 0xff;
                
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(0, 0, 64, 64);
                
                const fallbackImg = new Image();
                fallbackImg.src = canvas.toDataURL();
                fallbackImg.onload = () => {
                    this.images.set(type, fallbackImg);
                    resolve(fallbackImg);
                };
            };
            
            img.src = path;
        });
        
        this.loadPromises.set(type, promise);
        return promise;
    }
    
    static getImage(type) {
        return this.images.get(type);
    }
    
    static hasImage(type) {
        return this.images.has(type);
    }
}
