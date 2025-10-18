import { TrigCache } from '../TrigCache.js';

export class DayNightCycle {
    constructor() {
        this.time = 0; // 0 to 2*PI
        this.speed = 0.001; // Speed of cycle
        this.sunDistance = 100; // Distance from player
        this.tiltAngle = Math.PI / 4; // 45-degree tilt
        this.cosTilt = TrigCache.cos(this.tiltAngle); // Cache tilt cosine
    }
    
    update() {
        this.time += this.speed;
        if (this.time > Math.PI * 2) {
            this.time -= Math.PI * 2;
        }
    }
    
    getSunPosition(playerWorldX, playerWorldZ) {
        // Sun orbits in a complete circle (doesn't stop at horizon)
        const sunX = TrigCache.cos(this.time) * this.sunDistance;
        const sunY = TrigCache.sin(this.time) * this.sunDistance; // Full circle, can be negative
        const sunZ = TrigCache.sin(this.time) * this.sunDistance * this.cosTilt;
        
        return {
            x: playerWorldX + sunX,
            y: sunY,
            z: playerWorldZ + sunZ
        };
    }
    
    isDay() {
        // Day when sun Y position is above horizon (positive Y)
        const sunY = TrigCache.sin(this.time) * this.sunDistance;
        return sunY > 0;
    }
    
    getSunIntensity() {
        // Calculate intensity based on sun height
        const sunY = TrigCache.sin(this.time) * this.sunDistance;
        const normalizedHeight = sunY / this.sunDistance;
        
        // Only provide intensity when sun is above horizon
        if (normalizedHeight > 0) {
            return normalizedHeight * 0.8;
        }
        return 0; // No sun intensity at night
    }
    
    getTimeOfDay() {
        // Returns a value between 0 and 1 representing time of day
        return this.time / (Math.PI * 2);
    }
    
    setSpeed(speed) {
        this.speed = speed;
    }
    
    setTime(time) {
        this.time = time % (Math.PI * 2);
    }
}
