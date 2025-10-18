import { Config } from './config.js';
import { TileMap } from './TileMap.js';
import { ThreeJSRenderer } from './ThreeJSRenderer.js';
import { InputController } from './InputController.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { TextureGeneratorDebug } from './TextureGenerator.debug.js';
import { TextureLoader } from './TextureLoader.js';
import { TrigCache } from './TrigCache.js';
import { ObjectGeneratorRegistry } from './generators/objects/ObjectGeneratorRegistry.js';
import { MiniMap } from './debug/MiniMap.js';
import { GameState } from './GameState.js';
import { DayNightCycle } from './services/DayNightCycle.js';
import { FogService } from './services/FogService.js';
import { Player } from './Player.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.isRunning = false;
        this.isInitialized = false;
        this.gamepadStatusElement = null;
        
        // Create day/night cycle service
        this.dayNightCycle = new DayNightCycle();
        
        // Create fog service
        this.fogService = new FogService();
        
        // Pass services to renderer
        this.renderer = new ThreeJSRenderer(canvas, this.dayNightCycle, this.fogService);
    }
    
    async initialize() {
        try {
            // Preload all textures first
            console.log('Loading textures...');
            await TextureLoader.preloadAll();
            
            // Initialize trigonometry cache
            TrigCache.initialize();
            
            // Initialize object generators
            ObjectGeneratorRegistry.initialize();
            
            this.tileMap = new TileMap(Config.MAP_WIDTH, Config.MAP_HEIGHT);
            
            // Create player at spawn position
            const spawnPos = GameState.getPlayerSpawnPosition();
            console.log('Spawning player in city at:', spawnPos);
            this.player = new Player(spawnPos.x, spawnPos.z);
            
            // Make sure player has the update method
            if (typeof this.player.update !== 'function') {
                console.error('Player object:', this.player);
                console.error('Player constructor:', Player);
                throw new Error('Player does not have update method!');
            }
            
            this.player.moveTo(this.player.x, this.player.z, this.tileMap);
            
            this.input = new InputController();
            
            this.lastFrameTime = 0;
            this.fps = 0;
            this.frameCount = 0;
            this.lastFpsUpdate = 0;
            
            this.perfMonitor = null;
            if (Config.SHOW_PERFORMANCE_STATS) {
                this.perfMonitor = new PerformanceMonitor();
                this.perfMonitor.createDisplay();
            }
            
            this.createFpsDisplay();
            this.gamepadStatusElement = document.getElementById('gamepadStatus');
            
            // Initialize minimap if debug mode is enabled
            if (Config.DEBUG_MODE) {
                MiniMap.initialize(this.tileMap);
            }
            
            this.isInitialized = true;
            
            console.log('Game initialized');
        } catch (error) {
            console.error('Error during initialization:', error);
        }
    }
    
    createFpsDisplay() {
        this.fpsElement = document.createElement('div');
        this.fpsElement.style.position = 'absolute';
        this.fpsElement.style.top = '10px';
        this.fpsElement.style.right = '10px';
        this.fpsElement.style.color = 'white';
        this.fpsElement.style.background = 'rgba(0, 0, 0, 0.5)';
        this.fpsElement.style.padding = '10px';
        this.fpsElement.style.borderRadius = '5px';
        this.fpsElement.style.fontFamily = 'monospace';
        this.fpsElement.style.fontSize = '14px';
        document.body.appendChild(this.fpsElement);
    }
    
    updateFpsDisplay(currentTime) {
        this.frameCount++;
        
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = Math.round(this.frameCount * 1000 / (currentTime - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
            
            this.fpsElement.textContent = `FPS: ${this.fps}`;
            
            // Update gamepad status
            if (this.gamepadStatusElement) {
                if (this.input.isGamepadConnected()) {
                    this.gamepadStatusElement.textContent = '🎮 Gamepad Connected';
                    this.gamepadStatusElement.style.display = 'block';
                } else {
                    this.gamepadStatusElement.style.display = 'none';
                }
            }
        }
    }
    
    start() {
        if (!this.isInitialized) {
            console.error('Game not initialized! Call initialize() first.');
            return;
        }
        this.isRunning = true;
        this.gameLoop();
    }
    
    stop() {
        this.isRunning = false;
    }
    
    update(deltaTime) {
        // Update performance stats
        if (this.performanceStats) {
            this.performanceStats.update();
        }
        
        // Update day/night cycle
        this.dayNightCycle.update();
        
        // Update fog colors based on time of day
        this.fogService.update(this.dayNightCycle);
        
        // Update player (handles movement and rotation internally)
        if (this.player) {
            this.player.update(this.input, this.tileMap);
        } else {
            console.error('Player is null in update!');
        }
    }
    
    render() {
        if (this.perfMonitor) this.perfMonitor.startRender();
        
        // Time: Get visible tiles
        if (this.perfMonitor) this.perfMonitor.startTiming('visibleTiles');
        const visibleTiles = this.tileMap.getVisibleTiles(
            this.player.x,
            this.player.z,
            Config.RENDER_DISTANCE
        );
        if (this.perfMonitor) this.perfMonitor.endTiming('visibleTiles');
        
        // Time: Get visible objects (same radius as tiles)
        if (this.perfMonitor) this.perfMonitor.startTiming('visibleObjects');
        const visibleObjects = this.tileMap.getVisibleObjects(
            this.player.x,
            this.player.z,
            Config.RENDER_DISTANCE
        );
        if (this.perfMonitor) this.perfMonitor.endTiming('visibleObjects');
        
        if (this.perfMonitor) {
            this.perfMonitor.metrics.tileCount = visibleTiles.length;
            
            // Count objects by type
            const objectCounts = {};
            for (const object of visibleObjects) {
                objectCounts[object.type] = (objectCounts[object.type] || 0) + 1;
            }
            this.perfMonitor.metrics.objectCounts = objectCounts;
        }
        
        // Time: Render tiles (includes chunking and texture generation)
        if (this.perfMonitor) this.perfMonitor.startTiming('renderTiles');
        this.renderer.renderTiles(visibleTiles, this.tileMap);
        if (this.perfMonitor) this.perfMonitor.endTiming('renderTiles');
        
        // Time: Render objects
        if (this.perfMonitor) this.perfMonitor.startTiming('renderObjects');
        this.renderer.renderObjects(visibleObjects, this.tileMap);
        if (this.perfMonitor) this.perfMonitor.endTiming('renderObjects');
        
        // Render player and camera
        this.renderer.renderEntity(this.player, true);
        this.renderer.updateCamera(this.player);
        
        this.renderer.render();
        
        // Update minimap
        if (Config.DEBUG_MODE) {
            MiniMap.update(this.player, this.tileMap);
        }
        
        if (this.perfMonitor) this.perfMonitor.endRender();
    }
    
    gameLoop(currentTime = 0) {
        if (!this.isRunning) return;
        
        if (this.perfMonitor) this.perfMonitor.startFrame();
        
        // Frame rate limiting
        const deltaTime = currentTime - this.lastFrameTime;
        
        if (deltaTime >= Config.FRAME_TIME) {
            this.lastFrameTime = currentTime - (deltaTime % Config.FRAME_TIME);
            
            this.update();
            this.render();
            this.updateFpsDisplay(currentTime);
            
            if (this.perfMonitor) {
                this.perfMonitor.endFrame();
                this.perfMonitor.updateDisplay(this.renderer);
            }
        }
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    dispose() {
        this.stop();
        this.renderer.dispose();
        if (this.fpsElement && this.fpsElement.parentNode) {
            this.fpsElement.parentNode.removeChild(this.fpsElement);
        }
        if (this.perfMonitor) {
            this.perfMonitor.dispose();
        }
        TextureGeneratorDebug.clearDebugView();
        TextureGenerator.clearCache();
        MiniMap.clear();
    }
}
