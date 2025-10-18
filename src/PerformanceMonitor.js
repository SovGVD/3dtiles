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
            objectCounts: {} // Track counts by object type
        };
        
        this.samples = {
            frameTime: [],
            updateTime: [],
            renderTime: []
        };
        
        this.maxSamples = 60;
        this.element = null;
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
    
    updateDisplay(renderer) {
        if (!this.element) return;
        
        const now = performance.now();
        if (now - this.metrics.lastUpdate < 200) return; // Update every 200ms
        
        this.metrics.lastUpdate = now;
        
        const avgFrame = this.getAverage('frameTime');
        const avgUpdate = this.getAverage('updateTime');
        const avgRender = this.getAverage('renderTime');
        const fps = avgFrame > 0 ? (1000 / avgFrame).toFixed(1) : 0;
        
        let html = `
            <strong>Performance Stats</strong><br>
            FPS: ${fps}<br>
            Frame: ${avgFrame.toFixed(2)}ms<br>
            Update: ${avgUpdate.toFixed(2)}ms<br>
            Render: ${avgRender.toFixed(2)}ms<br>
            Tiles: ${this.metrics.tileCount}<br>
        `;
        
        // Add object counts
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
