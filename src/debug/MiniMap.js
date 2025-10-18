import { Config } from '../config.js';

export class MiniMap {
    static canvas = null;
    static ctx = null;
    static container = null;
    static mapSize = 200;
    static scale = 1;
    static baseMapImage = null; // Store rendered base map
    
    static initialize(tileMap) {
        if (this.container) return;
        
        console.log('Initializing minimap...');
        
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
        
        // Render and store the base map once
        this.renderBaseMap(tileMap);
    }
    
    static renderBaseMap(tileMap) {
        if (!this.ctx) return;
        
        // Create temporary canvas for 1:1 rendering
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = tileMap.width;
        tempCanvas.height = tileMap.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Clear canvas
        tempCtx.fillStyle = '#000000';
        tempCtx.fillRect(0, 0, tileMap.width, tileMap.height);
        
        // Draw all tiles at 1:1 scale
        for (let z = 0; z < tileMap.height; z++) {
            for (let x = 0; x < tileMap.width; x++) {
                const tile = tileMap.tiles[z][x];
                if (!tile) continue;
                
                const color = this.getTileColor(tile.type);
                tempCtx.fillStyle = color;
                tempCtx.fillRect(x, z, 1, 1);
            }
        }
        
        // Scale down and store as image
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.ctx.clearRect(0, 0, this.mapSize, this.mapSize);
        this.ctx.drawImage(tempCanvas, 0, 0, this.mapSize, this.mapSize);
        
        // Store the rendered base map as ImageData
        this.baseMapImage = this.ctx.getImageData(0, 0, this.mapSize, this.mapSize);
    }
    
    static update(player, tileMap) {
        if (!this.ctx || !this.canvas || !this.baseMapImage) return;
        
        // Restore base map from stored image (fast!)
        this.ctx.putImageData(this.baseMapImage, 0, 0);
        
        // Calculate player position on scaled minimap
        const playerX = Math.floor(player.x * this.scale);
        const playerY = Math.floor(player.z * this.scale);
        const playerSize = 3;
        
        // Draw player as red dot with white border
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(playerX - playerSize, playerY - playerSize, playerSize * 2 + 2, playerSize * 2 + 2);
        
        this.ctx.fillStyle = '#ff5722';
        this.ctx.fillRect(playerX - playerSize + 1, playerY - playerSize + 1, playerSize * 2, playerSize * 2);
        
        // Draw player direction indicator (flip rotation to match camera view)
        const dirLength = playerSize * 3;
        const dirX = Math.sin(player.rotation) * dirLength;
        const dirY = Math.cos(player.rotation) * dirLength;
        
        this.ctx.strokeStyle = '#ffeb3b';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(playerX, playerY);
        this.ctx.lineTo(playerX + dirX, playerY + dirY);
        this.ctx.stroke();
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
        this.baseMapImage = null; // Clear stored image
    }
}
