export class TextureGeneratorDebug {
    static debugContainer = null;
    static debugCanvases = new Map();
    static singleTextureDebug = null;
    
    static addToDebugView(canvas, chunkX, chunkZ) {
        if (!this.debugContainer) {
            this.createDebugContainer();
        }
        
        const chunkId = `${chunkX}_${chunkZ}`;
        
        // Remove old canvas if exists
        if (this.debugCanvases.has(chunkId)) {
            const oldCanvas = this.debugCanvases.get(chunkId);
            if (oldCanvas.parentNode) {
                oldCanvas.parentNode.removeChild(oldCanvas);
            }
        }
        
        // Clone and style the canvas for debug view
        const debugCanvas = canvas.cloneNode(true);
        const ctx = debugCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0);
        
        debugCanvas.style.cssText = `
            width: 128px;
            height: 128px;
            border: 2px solid #fff;
            margin: 5px;
            image-rendering: pixelated;
            image-rendering: crisp-edges;
        `;
        
        debugCanvas.title = `Chunk ${chunkX}, ${chunkZ}`;
        
        this.debugContainer.appendChild(debugCanvas);
        this.debugCanvases.set(chunkId, debugCanvas);
        
        // Limit number of debug canvases shown (keep last 12)
        if (this.debugCanvases.size > 12) {
            const firstKey = this.debugCanvases.keys().next().value;
            const firstCanvas = this.debugCanvases.get(firstKey);
            if (firstCanvas.parentNode) {
                firstCanvas.parentNode.removeChild(firstCanvas);
            }
            this.debugCanvases.delete(firstKey);
        }
    }
    
    static createDebugContainer() {
        this.debugContainer = document.createElement('div');
        this.debugContainer.id = 'textureDebug';
        this.debugContainer.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            padding: 10px;
            border-radius: 5px;
            display: flex;
            flex-wrap: wrap;
            max-width: 550px;
            max-height: 300px;
            overflow-y: auto;
            z-index: 1000;
        `;
        
        const title = document.createElement('div');
        title.style.cssText = `
            width: 100%;
            color: white;
            font-family: monospace;
            font-size: 12px;
            margin-bottom: 5px;
        `;
        title.textContent = 'Chunk Textures (Recent 12)';
        this.debugContainer.appendChild(title);
        
        document.body.appendChild(this.debugContainer);
    }
    
    static addSingleTextureDebug(fullCanvas) {
        if (this.singleTextureDebug) {
            return; // Already created
        }
        
        this.singleTextureDebug = document.createElement('div');
        this.singleTextureDebug.id = 'singleTextureDebug';
        this.singleTextureDebug.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.9);
            padding: 10px;
            border-radius: 5px;
            z-index: 2000;
            border: 2px solid #4CAF50;
        `;
        
        const title = document.createElement('div');
        title.style.cssText = `
            color: white;
            font-family: monospace;
            font-size: 12px;
            margin-bottom: 5px;
        `;
        title.textContent = 'Full Resolution Texture (First Chunk)';
        this.singleTextureDebug.appendChild(title);
        
        // Clone the full resolution canvas
        const debugCanvas = fullCanvas.cloneNode(true);
        const ctx = debugCanvas.getContext('2d');
        ctx.drawImage(fullCanvas, 0, 0);
        
        debugCanvas.style.cssText = `
            width: 512px;
            height: 512px;
            border: 2px solid #fff;
            image-rendering: pixelated;
            image-rendering: crisp-edges;
            display: block;
        `;
        
        this.singleTextureDebug.appendChild(debugCanvas);
        
        // Add size info
        const info = document.createElement('div');
        info.style.cssText = `
            color: white;
            font-family: monospace;
            font-size: 11px;
            margin-top: 5px;
        `;
        info.textContent = `Size: ${fullCanvas.width}x${fullCanvas.height}px`;
        this.singleTextureDebug.appendChild(info);
        
        document.body.appendChild(this.singleTextureDebug);
    }
    
    static clearDebugView() {
        if (this.debugContainer && this.debugContainer.parentNode) {
            this.debugContainer.parentNode.removeChild(this.debugContainer);
            this.debugContainer = null;
        }
        if (this.singleTextureDebug && this.singleTextureDebug.parentNode) {
            this.singleTextureDebug.parentNode.removeChild(this.singleTextureDebug);
            this.singleTextureDebug = null;
        }
        this.debugCanvases.clear();
    }
}
