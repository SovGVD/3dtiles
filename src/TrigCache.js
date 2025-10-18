export class TrigCache {
    static angleCache = new Map();
    static precision = 100; // 0.01 radian precision (2 decimal places)
    
    static initialize() {
        console.log('Initializing trigonometry cache...');
        const startTime = performance.now();
        
        // Pre-calculate for -2PI to 2PI range with 0.01 precision
        const minAngle = -Math.PI * 2;
        const maxAngle = Math.PI * 2;
        const step = 1 / this.precision;
        
        for (let angle = minAngle; angle <= maxAngle; angle += step) {
            const key = Math.round(angle * this.precision);
            this.angleCache.set(key, {
                sin: Math.sin(angle),
                cos: Math.cos(angle)
            });
        }
        
        const endTime = performance.now();
        console.log(`Trig cache initialized with ${this.angleCache.size} entries in ${(endTime - startTime).toFixed(2)}ms`);
    }
    
    static sin(angle) {
        const key = Math.round(angle * this.precision);
        const cached = this.angleCache.get(key);
        return cached ? cached.sin : Math.sin(angle);
    }
    
    static cos(angle) {
        const key = Math.round(angle * this.precision);
        const cached = this.angleCache.get(key);
        return cached ? cached.cos : Math.cos(angle);
    }
    
    // Don't cache atan2 - use native for accuracy
    static atan2(y, x) {
        return Math.atan2(y, x);
    }
    
    static normalizeAngle(angle) {
        // Normalize to -PI to PI range
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }
}
