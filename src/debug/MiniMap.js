import { Config } from '../config.js';

export class MiniMap {
    static canvas = null;
    static ctx = null;
    static container = null;
    static mapSize = 200; // Size of minimap in pixels
    static scale = 1;
    static fullSizeCanvas = null; // 1:1 scale canvas
    static fullSizeCtx = null;
    
    static initialize(tileMap) {
        if (this.container) return;
        
        console.log('Initializing minimap...');
        
        // Create full-size canvas (1:1 scale)
        this.fullSizeCanvas = document.createElement('canvas');
        this.fullSizeCanvas.width = tileMap.width;
        this.fullSizeCanvas.height = tileMap.height;
        this.fullSizeCtx = this.fullSizeCanvas.getContext('2d');
        
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'minimap';
        this.container.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            padding: 10px;
            border-radius: 5px;
            border: 2px solid #4CAF50;
            z-index: 3000;
        `;
        
        // Create title
        const title = document.createElement('div');
        title.style.cssText = `
            color: white;
            font-family: monospace;
            font-size: 12px;
            margin-bottom: 5px;
            text-align: center;
        `;
        title.textContent = 'Map Overview';
        this.container.appendChild(title);
        
        // Create display canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.mapSize;
        this.canvas.height = this.mapSize;
        this.canvas.style.cssText = `
            display: block;
            border: 1px solid #666;
        `;
        
        this.ctx = this.canvas.getContext('2d');
        // Enable image smoothing for scaling
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        this.container.appendChild(this.canvas);
        
        document.body.appendChild(this.container);
        
        // Calculate scale
        this.scale = this.mapSize / Math.max(tileMap.width, tileMap.height);
        
        // Render the base map at 1:1 scale
        this.renderBaseMap(tileMap);
    }
    
    static renderBaseMap(tileMap) {
        if (!this.fullSizeCtx) return;
        
        // Clear full-size canvas
        this.fullSizeCtx.fillStyle = '#000000';
        this.fullSizeCtx.fillRect(0, 0, tileMap.width, tileMap.height);
        
        // Draw all tiles at 1:1 scale (1 pixel per tile)
        for (let z = 0; z < tileMap.height; z++) {
            for (let x = 0; x < tileMap.width; x++) {
                const tile = tileMap.tiles[z][x];
                if (!tile) continue;
                
                // Get color based on tile type
                const color = this.getTileColor(tile.type);
                this.fullSizeCtx.fillStyle = color;
                
                // Draw 1 pixel per tile
                this.fullSizeCtx.fillRect(x, z, 1, 1);
            }
        }
        
        // Scale down to display canvas with smoothing
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.ctx.clearRect(0, 0, this.mapSize, this.mapSize);
        this.ctx.drawImage(this.fullSizeCanvas, 0, 0, this.mapSize, this.mapSize);
    }
    
    static update(player, tileMap) {
        if (!this.ctx || !this.canvas || !this.fullSizeCanvas) return;
        
        // Copy full-size map to temporary canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.fullSizeCanvas.width;
        tempCanvas.height = this.fullSizeCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.fullSizeCanvas, 0, 0);
        
        // Draw player position at 1:1 scale
        const playerX = Math.floor(player.x);
        const playerY = Math.floor(player.z);
        const playerSize = 3; // Fixed size in pixels at 1:1
        
        // Draw player as red dot with white border
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(playerX - playerSize, playerY - playerSize, playerSize * 2 + 2, playerSize * 2 + 2);
        
        tempCtx.fillStyle = '#ff5722';
        tempCtx.fillRect(playerX - playerSize + 1, playerY - playerSize + 1, playerSize * 2, playerSize * 2);
        
        // Draw player direction indicator
        const dirLength = playerSize * 3;
        const dirX = Math.cos(player.rotation - Math.PI / 2) * dirLength;
        const dirY = Math.sin(player.rotation - Math.PI / 2) * dirLength;
        
        tempCtx.strokeStyle = '#ffeb3b';
        tempCtx.lineWidth = 2;
        tempCtx.beginPath();
        tempCtx.moveTo(playerX, playerY);
        tempCtx.lineTo(playerX + dirX, playerY + dirY);
        tempCtx.stroke();
        
        // Scale down to display canvas with smoothing
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.ctx.clearRect(0, 0, this.mapSize, this.mapSize);
        this.ctx.drawImage(tempCanvas, 0, 0, this.mapSize, this.mapSize);
    }
    
    static getTileColor(tileType) {
        const colors = {
            [Config.TILE_TYPES.WATER]: '#1976d2',
            [Config.TILE_TYPES.GRASS]: '#8bc34a',
            [Config.TILE_TYPES.TERRAIN]: '#7cb342',
            [Config.TILE_TYPES.ROCK]: '#616161',
            [Config.TILE_TYPES.ROAD]: '#ff6b00',
            [Config.TILE_TYPES.CITY]: '#ff0000',
            [Config.TILE_TYPES.CITY_ROAD]: '#cccccc',
            [Config.TILE_TYPES.HOUSE]: '#d4a373'
        };
        
        return colors[tileType] || '#808080';
    }
    
    static clear() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.fullSizeCanvas = null;
        this.fullSizeCtx = null;
    }
}
