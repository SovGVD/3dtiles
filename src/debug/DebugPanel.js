import { Config } from '../config.js';
import { GameState } from '../GameState.js';

export class DebugPanel {
    constructor() {
        this.enabled = Config.DEBUG_MODE;
        this.container = null;
        this.playerInfo = null;
        this.performanceInfo = null;
        
        if (this.enabled) {
            this.initialize();
        }
    }
    
    initialize() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'debug-panel';
        this.container.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #0f0;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            border-radius: 5px;
            z-index: 1000;
            min-width: 250px;
        `;
        
        // Player info section
        this.playerInfo = document.createElement('div');
        this.playerInfo.style.marginBottom = '10px';
        this.container.appendChild(this.playerInfo);
        
        // Performance info section
        this.performanceInfo = document.createElement('div');
        this.container.appendChild(this.performanceInfo);
        
        document.body.appendChild(this.container);
        
        console.log('Debug panel initialized');
    }
    
    update(player, stats) {
        if (!this.enabled || !this.playerInfo) return;
        
        // Get game state
        const gameState = GameState.getState();
        
        this.playerInfo.textContent = `
Position: (${player.x.toFixed(2)}, ${player.z.toFixed(2)})
Height: ${player.y.toFixed(2)}
Rotation: ${(player.rotation * 180 / Math.PI).toFixed(0)}°
Speed Multiplier: ${(gameState.currentSpeed || 1.0).toFixed(2)}x
Terrain: ${gameState.currentTerrainType || 'unknown'}
        `.trim();
        
        if (stats && this.performanceInfo) {
            this.performanceInfo.textContent = `
FPS: ${stats.fps || 0}
Frame Time: ${(stats.frameTime || 0).toFixed(2)}ms
            `.trim();
        }
    }
    
    toggle() {
        this.enabled = !this.enabled;
        if (this.container) {
            this.container.style.display = this.enabled ? 'block' : 'none';
        }
    }
    
    dispose() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}