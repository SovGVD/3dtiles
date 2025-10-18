export class PerformanceStats {
    constructor() {
        this.fps = 0;
        this.frameTime = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fpsUpdateInterval = 500; // Update FPS every 500ms
        this.lastFpsUpdate = this.lastTime;
    }
    
    update() {
        const currentTime = performance.now();
        this.frameTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.frameCount++;
        
        // Update FPS calculation
        const timeSinceLastFpsUpdate = currentTime - this.lastFpsUpdate;
        if (timeSinceLastFpsUpdate >= this.fpsUpdateInterval) {
            this.fps = Math.round((this.frameCount * 1000) / timeSinceLastFpsUpdate);
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }
    }
    
    getStats() {
        return {
            fps: this.fps,
            frameTime: this.frameTime
        };
    }
}
