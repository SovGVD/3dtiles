import { Config } from '../config.js';

export class MiniMap {
    static canvas = null;
    static ctx = null;
    static container = null;
    static mapSize = 200; // Size of minimap in pixels
    static scale = 1;
    
    static initialize(tileMap) {
        if (this.container) return; // Already initialized
        
        console.log('Initializing minimap...');
        
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'minimap';
        this.container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
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
        
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.mapSize;
        this.canvas.height = this.mapSize;
        this.canvas.style.cssText = `
            display: block;
            image-rendering: pixelated;
            image-rendering: crisp-edges;
            border: 1px solid #666;
        `;
        
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);
        
        document.body.appendChild(this.container);
        
        // Calculate scale
        this.scale = this.mapSize / Math.max(tileMap.width, tileMap.height);
        
        // Render the base map once
        this.renderBaseMap(tileMap);
    }
    
    static renderBaseMap(tileMap) {
        if (!this.ctx) return;
        
        const pixelSize = Math.max(1, Math.floor(this.scale));
        
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.mapSize, this.mapSize);
        
        // Draw all tiles
        for (let z = 0; z < tileMap.height; z++) {
            for (let x = 0; x < tileMap.width; x++) {
                const tile = tileMap.tiles[z][x];
                if (!tile) continue;
                
                // Get color based on tile type
                const color = this.getTileColor(tile.type);
                this.ctx.fillStyle = color;
                
                const px = Math.floor(x * this.scale);
                const py = Math.floor(z * this.scale);
                
                this.ctx.fillRect(px, py, pixelSize, pixelSize);
            }
        }
    }
    
    static update(player, tileMap) {
        if (!this.ctx || !this.canvas) return;
        
        // Redraw base map (or keep cached version)
        // For performance, we only redraw player position
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.mapSize;
        tempCanvas.height = this.mapSize;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Copy current map
        tempCtx.drawImage(this.canvas, 0, 0);
        
        // Draw player position
        const playerX = Math.floor(player.x * this.scale);
        const playerY = Math.floor(player.z * this.scale);
        const playerSize = Math.max(2, Math.floor(this.scale * 2));
        
        // Draw player as red dot with white border
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(playerX - playerSize, playerY - playerSize, playerSize * 2 + 2, playerSize * 2 + 2);
        
        tempCtx.fillStyle = '#ff5722';
        tempCtx.fillRect(playerX - playerSize + 1, playerY - playerSize + 1, playerSize * 2, playerSize * 2);
        
        // Draw player direction indicator
        const dirLength = playerSize * 2;
        const dirX = Math.cos(player.rotation - Math.PI / 2) * dirLength;
        const dirY = Math.sin(player.rotation - Math.PI / 2) * dirLength;
        
        tempCtx.strokeStyle = '#ffeb3b';
        tempCtx.lineWidth = 2;
        tempCtx.beginPath();
        tempCtx.moveTo(playerX, playerY);
        tempCtx.lineTo(playerX + dirX, playerY + dirY);
        tempCtx.stroke();
        
        // Update main canvas
        this.ctx.clearRect(0, 0, this.mapSize, this.mapSize);
        this.ctx.drawImage(tempCanvas, 0, 0);
    }
    
    static getTileColor(tileType) {
        const colors = {
            [Config.TILE_TYPES.WATER]: '#1976d2',
            [Config.TILE_TYPES.GRASS]: '#8bc34a',
            [Config.TILE_TYPES.TERRAIN]: '#7cb342',
            [Config.TILE_TYPES.ROCK]: '#616161',
            [Config.TILE_TYPES.ROAD]: '#ff6b00',
            [Config.TILE_TYPES.CITY]: '#ff0000',
            [Config.TILE_TYPES.CITY_ROAD]: '#cccccc' // Light gray
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
    }
}
