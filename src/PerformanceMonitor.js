export class PerformanceMonitor {
    constructor() {
        this.metrics = {
            frameTime: 0,
            updateTime: 0,
            renderTime: 0,
            tileCount: 0,
            drawCalls: 0,
            triangles: 0,
            lastUpdate: 0,
            objectCounts: {},
            // Detailed timing
            visibleTilesTime: 0,
            visibleObjectsTime: 0,
            renderTilesTime: 0,
            renderObjectsTime: 0,
            cameraUpdateTime: 0
        };
        
        this.samples = {
            frameTime: [],
            updateTime: [],
            renderTime: [],
            visibleTilesTime: [],
            visibleObjectsTime: [],
            renderTilesTime: [],
            renderObjectsTime: []
        };
        
        this.maxSamples = 60;
        this.element = null;
        this.timingStart = {};
    }
    
    createDisplay() {
        this.element = document.createElement('div');
        this.element.id = 'perfStats';
        this.element.style.cssText = `
            position: absolute;
            top: 50px;
            right: 10px;
            color: white;
            background: rgba(0, 0, 0, 0.7);
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            line-height: 1.5;
        `;
        document.body.appendChild(this.element);
    }
    
    startFrame() {
        this.frameStart = performance.now();
    }
    
    startUpdate() {
        this.updateStart = performance.now();
    }
    
    endUpdate() {
        this.metrics.updateTime = performance.now() - this.updateStart;
    }
    
    startRender() {
        this.renderStart = performance.now();
    }
    
    endRender() {
        this.metrics.renderTime = performance.now() - this.renderStart;
    }
    
    endFrame() {
        this.metrics.frameTime = performance.now() - this.frameStart;
        
        this.addSample('frameTime', this.metrics.frameTime);
        this.addSample('updateTime', this.metrics.updateTime);
        this.addSample('renderTime', this.metrics.renderTime);
    }
    
    addSample(metric, value) {
        this.samples[metric].push(value);
        if (this.samples[metric].length > this.maxSamples) {
            this.samples[metric].shift();
        }
    }
    
    getAverage(metric) {
        const samples = this.samples[metric];
        if (samples.length === 0) return 0;
        return samples.reduce((a, b) => a + b, 0) / samples.length;
    }
    
    startTiming(label) {
        this.timingStart[label] = performance.now();
    }
    
    endTiming(label) {
        if (this.timingStart[label]) {
            const elapsed = performance.now() - this.timingStart[label];
            this.metrics[label + 'Time'] = elapsed;
            
            if (this.samples[label + 'Time']) {
                this.addSample(label + 'Time', elapsed);
            }
            
            delete this.timingStart[label];
            return elapsed;
        }
        return 0;
    }
    
    updateDisplay(renderer) {
        if (!this.element) return;
        
        const now = performance.now();
        if (now - this.metrics.lastUpdate < 200) return;
        
        this.metrics.lastUpdate = now;
        
        const avgFrame = this.getAverage('frameTime');
        const avgUpdate = this.getAverage('updateTime');
        const avgRender = this.getAverage('renderTime');
        const fps = avgFrame > 0 ? (1000 / avgFrame).toFixed(1) : 0;
        
        // Detailed render timing
        const avgVisibleTiles = this.getAverage('visibleTilesTime');
        const avgVisibleObjects = this.getAverage('visibleObjectsTime');
        const avgRenderTiles = this.getAverage('renderTilesTime');
        const avgRenderObjects = this.getAverage('renderObjectsTime');
        
        let html = `
            <strong>Performance Stats</strong><br>
            FPS: ${fps}<br>
            Frame: ${avgFrame.toFixed(2)}ms<br>
            Update: ${avgUpdate.toFixed(2)}ms<br>
            Render: ${avgRender.toFixed(2)}ms<br>
            <br>
            <strong>Render Breakdown:</strong><br>
            Get Tiles: ${avgVisibleTiles.toFixed(2)}ms<br>
            Get Objects: ${avgVisibleObjects.toFixed(2)}ms<br>
            Draw Tiles: ${avgRenderTiles.toFixed(2)}ms<br>
            Draw Objects: ${avgRenderObjects.toFixed(2)}ms<br>
            <br>
            Tiles: ${this.metrics.tileCount}<br>
        `;
        
        if (Object.keys(this.metrics.objectCounts).length > 0) {
            html += `<br><strong>Objects:</strong><br>`;
            for (const [type, count] of Object.entries(this.metrics.objectCounts)) {
                html += `${type}: ${count}<br>`;
            }
            const totalObjects = Object.values(this.metrics.objectCounts).reduce((a, b) => a + b, 0);
            html += `<strong>Total: ${totalObjects}</strong><br>`;
        }
        
        if (renderer && renderer.renderer && renderer.renderer.info) {
            const info = renderer.renderer.info;
            html += `
                <br>Draw Calls: ${info.render.calls}<br>
                Triangles: ${info.render.triangles}<br>
                Geometries: ${info.memory.geometries}<br>
                Textures: ${info.memory.textures}<br>
            `;
        }
        
        // Add warnings
        if (avgFrame > 20) {
            html += `<br><span style="color: #ff5722;">⚠ Frame time high!</span>`;
        }
        if (avgVisibleObjects > 2) {
            html += `<br><span style="color: #ff9800;">⚠ Object filtering slow!</span>`;
        }
        if (this.metrics.tileCount > 500) {
            html += `<br><span style="color: #ff9800;">⚠ Too many tiles!</span>`;
        }
        
        this.element.innerHTML = html;
    }
    
    dispose() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
