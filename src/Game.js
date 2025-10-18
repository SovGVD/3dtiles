import { Config } from './config.js';
import { TileMap } from './TileMap.js';
import { Entity } from './Entity.js';
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
        // Preload all textures first
        console.log('Loading textures...');
        await TextureLoader.preloadAll();
        
        // Initialize trigonometry cache
        TrigCache.initialize();
        
        // Initialize object generators
        ObjectGeneratorRegistry.initialize();
        
        this.tileMap = new TileMap(Config.MAP_WIDTH, Config.MAP_HEIGHT);
        
        // Spawn player in smallest city
        const spawnPos = GameState.getPlayerSpawnPosition();
        if (spawnPos) {
            console.log(`Spawning player in city at: (${spawnPos.x}, ${spawnPos.z})`);
            this.player = new Entity(spawnPos.x, spawnPos.z, true);
        } else {
            // Fallback to road if no city
            const roadPos = this.tileMap.findRandomRoadPosition();
            console.log(`No city found, spawning player at road: (${roadPos.x}, ${roadPos.z})`);
            this.player = new Entity(roadPos.x, roadPos.z, true);
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
        // Update day/night cycle
        this.dayNightCycle.update();
        
        // Update fog colors based on time of day
        this.fogService.update(this.dayNightCycle);
        
        if (this.perfMonitor) this.perfMonitor.startUpdate();
        
        const movement = this.input.getMovement();
        const rotation = this.input.getRotation();
        
        this.player.setRotation(rotation);
        
        if (movement.dx !== 0 || movement.dz !== 0) {
            // Normalize diagonal movement
            const length = Math.sqrt(movement.dx * movement.dx + movement.dz * movement.dz);
            const normalizedDx = movement.dx / length;
            const normalizedDz = movement.dz / length;
            
            // Apply terrain speed multiplier
            const speed = Config.PLAYER_SPEED * this.player.currentSpeedMultiplier;
            
            // Movement is relative to camera direction (player.rotation)
            // Inverted: W moves forward, S backward, A right, D left
            const angle = this.player.rotation;
            const dx = (-normalizedDz * Math.sin(angle) - normalizedDx * Math.cos(angle)) * speed;
            const dz = (-normalizedDz * Math.cos(angle) + normalizedDx * Math.sin(angle)) * speed;
            
            const newX = this.player.x + dx;
            const newZ = this.player.z + dz;
            
            if (newX >= 0 && newX < Config.MAP_WIDTH && newZ >= 0 && newZ < Config.MAP_HEIGHT) {
                this.player.moveTo(newX, newZ, this.tileMap);
            }
        }
        
        if (this.perfMonitor) this.perfMonitor.endUpdate();
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
