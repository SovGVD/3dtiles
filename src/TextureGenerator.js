import { Config } from './config.js';
import { TextureGeneratorDebug } from './TextureGenerator.debug.js';
import { TextureLoader } from './TextureLoader.js';

export class TextureGenerator {
    static chunkTextureCache = new Map();
    
    static generateTerrainTexture(tileMap, chunkX, chunkZ, chunkSize) {
        const startTime = performance.now();
        const chunkId = `${chunkX}_${chunkZ}`;
        
        // Return cached texture if available
        if (this.chunkTextureCache.has(chunkId)) {
            return this.chunkTextureCache.get(chunkId);
        }
        
        const tileTextureSize = 64; // Source texture size (64x64)
        const outputResolution = Config.TEXTURE_RESOLUTION; // Final pixels per tile
        const fullWidth = chunkSize * tileTextureSize;
        const fullHeight = chunkSize * tileTextureSize;
        const outputWidth = chunkSize * outputResolution;
        const outputHeight = chunkSize * outputResolution;
        
        // Create full resolution canvas
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = fullWidth;
        fullCanvas.height = fullHeight;
        const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: false });
        
        // Disable image smoothing for pixel-perfect rendering
        // fullCtx.imageSmoothingEnabled = false;
        
        // Draw each tile at full resolution
        for (let z = 0; z < chunkSize; z++) {
            for (let x = 0; x < chunkSize; x++) {
                const tileX = chunkX * chunkSize + x;
                const tileZ = chunkZ * chunkSize + z;
                const tile = tileMap.getTile(tileX, tileZ);
                
                if (tile) {
                    const tileType = tile.type === Config.TILE_TYPES.WATER 
                        ? Config.TILE_TYPES.TERRAIN // Use terrain texture for underwater
                        : tile.type;
                    
                    const img = TextureLoader.getImage(tileType);
                    
                    if (img) {
                        // Draw the COMPLETE texture at full 64x64 resolution
                        fullCtx.drawImage(
                            img,
                            0, 0, img.width, img.height, // Source: full image
                            x * tileTextureSize, z * tileTextureSize, // Destination position
                            tileTextureSize, tileTextureSize // Destination size
                        );
                    } else {
                        // Fallback to solid color if texture not loaded
                        const color = this.getTileColorRgb(tile);
                        fullCtx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
                        fullCtx.fillRect(
                            x * tileTextureSize,
                            z * tileTextureSize,
                            tileTextureSize,
                            tileTextureSize
                        );
                    }
                }
            }
        }
        
        // Create output canvas at target resolution
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = outputWidth;
        outputCanvas.height = outputHeight;
        const outputCtx = outputCanvas.getContext('2d', { willReadFrequently: false });
        
        // Enable smoothing for smoother scaled output
        outputCtx.imageSmoothingEnabled = true;
        outputCtx.imageSmoothingQuality = 'high';
        
        // Use scale transformation for better quality
        const scaleX = outputWidth / fullWidth;
        const scaleY = outputHeight / fullHeight;
        outputCtx.scale(scaleX, scaleY);
        
        // Draw the full canvas (will be automatically scaled)
        outputCtx.drawImage(fullCanvas, 0, 0);
        
        // Cache the result
        this.chunkTextureCache.set(chunkId, outputCanvas);
        
        const generationTime = performance.now() - startTime;
        
        // Add to debug view if enabled
        if (Config.DEBUG_MODE) {
            // TextureGeneratorDebug.addToDebugView(outputCanvas, chunkX, chunkZ);
            
            // TextureGeneratorDebug.addSingleTextureDebug(fullCanvas);
            TextureGeneratorDebug.recordGenerationTime(generationTime);
        }
        
        return outputCanvas;
    }
    
    static clearCache() {
        this.chunkTextureCache.clear();
    }
    
    static invalidateChunk(chunkX, chunkZ) {
        const chunkId = `${chunkX}_${chunkZ}`;
        this.chunkTextureCache.delete(chunkId);
    }
    
    static getTileColorRgb(tile) {
        if (!tile) {
            return { r: 0, g: 0, b: 0 };
        }
        
        const colorHex = tile.type === Config.TILE_TYPES.WATER 
            ? 0x8d6e63 // Underwater terrain color
            : (Config.TILE_COLORS[tile.type] || Config.TILE_COLORS.terrain);
        
        return this.hexToRgb(colorHex);
    }
    
    static hexToRgb(hex) {
        const r = (hex >> 16) & 0xff;
        const g = (hex >> 8) & 0xff;
        const b = hex & 0xff;
        return { r, g, b };
    }
}
