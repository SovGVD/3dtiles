import { Config } from '../config.js';

export class CanvasRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Set canvas size
        this.resize();
        
        // Camera properties for top-down view
        this.cameraX = 0;
        this.cameraZ = 0;
        this.zoom = 1.0; // Pixels per tile
        
        // Cache for loaded images
        this.textureCache = new Map();
        this.objectTextureCache = new Map();
        
        // Load all textures
        this.loadTextures();
        
        window.addEventListener('resize', () => this.resize());
    }
    
    loadTextures() {
        // Load tile textures
        for (const [type, url] of Object.entries(Config.TILE_TEXTURES)) {
            const img = new Image();
            img.src = url;
            this.textureCache.set(type, img);
        }
        
        // Load object textures
        for (const [type, config] of Object.entries(Config.TILE_OBJECTS)) {
            if (config.textureUrl) {
                const img = new Image();
                img.src = config.textureUrl;
                this.objectTextureCache.set(type, img);
            }
        }
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    renderTiles(tiles, tileMap) {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate viewport bounds
        const halfWidth = this.canvas.width / (2 * this.zoom);
        const halfHeight = this.canvas.height / (2 * this.zoom);
        
        const minX = Math.floor(this.cameraX - halfWidth);
        const maxX = Math.ceil(this.cameraX + halfWidth);
        const minZ = Math.floor(this.cameraZ - halfHeight);
        const maxZ = Math.ceil(this.cameraZ + halfHeight);
        
        // Enable pixelated rendering
        this.ctx.imageSmoothingEnabled = false;
        
        // Draw tiles with textures
        for (const tile of tiles) {
            if (tile.x < minX || tile.x > maxX || tile.z < minZ || tile.z > maxZ) {
                continue;
            }
            
            const screenX = (tile.x - this.cameraX + halfWidth) * this.zoom;
            const screenY = (tile.z - this.cameraZ + halfHeight) * this.zoom;
            
            // Draw tile texture
            const texture = this.textureCache.get(tile.type);
            if (texture && texture.complete) {
                this.ctx.drawImage(texture, screenX, screenY, this.zoom, this.zoom);
            } else {
                // Fallback to color if texture not loaded
                const hexColor = '#' + Config.TILE_COLORS[tile.type].toString(16).padStart(6, '0');
                this.ctx.fillStyle = hexColor;
                this.ctx.fillRect(screenX, screenY, this.zoom, this.zoom);
            }
        }
    }
    
    renderEntity(entity, isPlayer = false) {
        const halfWidth = this.canvas.width / (2 * this.zoom);
        const halfHeight = this.canvas.height / (2 * this.zoom);
        
        const screenX = (entity.x - this.cameraX + halfWidth) * this.zoom;
        const screenY = (entity.z - this.cameraZ + halfHeight) * this.zoom;
        
        // Draw entity as circle
        this.ctx.fillStyle = isPlayer ? '#ff5722' : '#2196f3';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, Math.max(2, this.zoom * 0.5), 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw direction indicator
        if (isPlayer) {
            const dirLength = this.zoom * 1.5;
            const dirX = Math.sin(entity.rotation) * dirLength;
            const dirY = Math.cos(entity.rotation) * dirLength;
            
            this.ctx.strokeStyle = '#ffeb3b';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, screenY);
            this.ctx.lineTo(screenX + dirX, screenY + dirY);
            this.ctx.stroke();
        }
    }
    
    renderObjects(objects, tileMap) {
        const halfWidth = this.canvas.width / (2 * this.zoom);
        const halfHeight = this.canvas.height / (2 * this.zoom);
        
        this.ctx.imageSmoothingEnabled = false;
        
        for (const object of objects) {
            // Check if in viewport
            if (object.x < this.cameraX - halfWidth || 
                object.x > this.cameraX + halfWidth ||
                object.z < this.cameraZ - halfHeight || 
                object.z > this.cameraZ + halfHeight) {
                continue;
            }
            
            const screenX = (object.x - this.cameraX + halfWidth) * this.zoom;
            const screenY = (object.z - this.cameraZ + halfHeight) * this.zoom;
            
            // Draw object texture
            const texture = this.objectTextureCache.get(object.type);
            if (texture && texture.complete && object.config) {
                const width = object.config.scale * this.zoom;
                const height = object.config.height * this.zoom;
                
                // Center the object on its position
                this.ctx.drawImage(
                    texture, 
                    screenX - width / 2, 
                    screenY - height / 2, 
                    width, 
                    height
                );
            } else {
                // Fallback to dot
                this.ctx.fillStyle = '#4CAF50';
                this.ctx.fillRect(screenX - 1, screenY - 1, 2, 2);
            }
        }
    }
    
    updateCamera(player) {
        // Center camera on player
        this.cameraX = player.x;
        this.cameraZ = player.z;
        
        // Auto-zoom based on Config.TILE_SIZE
        this.zoom = Math.min(
            this.canvas.width / (Config.RENDER_DISTANCE * 2),
            this.canvas.height / (Config.RENDER_DISTANCE * 2)
        );
    }
    
    render() {
        // Canvas rendering happens in renderTiles/renderEntity/renderObjects
    }
    
    dispose() {
        // Clear texture caches
        this.textureCache.clear();
        this.objectTextureCache.clear();
    }
}
