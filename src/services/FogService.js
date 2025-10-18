import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export class FogService {
    constructor() {
        // Define color stops for different times of day
        this.colorStops = {
            // Night (0.0 - 0.1 and 0.9 - 1.0)
            night: {
                fog: new THREE.Color(0x336699),      // Muted Deep Blue
                background: new THREE.Color(0x000033) // Very Dark Blue
            },
            // Sunrise (0.1 - 0.2)
            sunrise: {
                fog: new THREE.Color(0xFFA07A),      // Light Salmon
                background: new THREE.Color(0xFF4500) // Orange-Red
            },
            // Mid-Morning/Day (0.2 - 0.4)
            day: {
                fog: new THREE.Color(0xF0F8FF),      // Cool White
                background: new THREE.Color(0x87CEEB) // Sky Blue
            },
            // Late Afternoon (0.4 - 0.6)
            afternoon: {
                fog: new THREE.Color(0xFFDAB9),      // Peach
                background: new THREE.Color(0xF5DEB3) // Pale Gold
            },
            // Sunset (0.6 - 0.7)
            sunset: {
                fog: new THREE.Color(0xFFA07A),      // Light Salmon
                background: new THREE.Color(0xFF4500) // Orange-Red
            },
            // Twilight (0.7 - 0.9)
            twilight: {
                fog: new THREE.Color(0xB0C4DE),      // Light Steel Blue
                background: new THREE.Color(0x483D8B) // Slate Blue
            }
        };
        
        this.currentFogColor = new THREE.Color(0xF0F8FF);
        this.currentBackgroundColor = new THREE.Color(0x87CEEB);
    }
    
    update(dayNightCycle) {
        const timeOfDay = dayNightCycle.getTimeOfDay();
        const { fog, background } = this.getColorsForTime(timeOfDay);
        
        this.currentFogColor.copy(fog);
        this.currentBackgroundColor.copy(background);
    }
    
    getColorsForTime(timeOfDay) {
        // Normalize time to 0-1 range
        // 0.0 = Start of Sunrise, 0.25 = Mid-day, 0.5 = Full Sunset/Night begins, 0.5-1.0 = Night
        const t = timeOfDay;
        
        // Define time ranges and interpolate between them
        if (t < 0.1) {
            // Early Sunrise (0.0 - 0.1)
            const blend = t / 0.1;
            return this.lerpColors(this.colorStops.sunrise, this.colorStops.day, blend);
        } else if (t < 0.25) {
            // Morning to Mid-day (0.1 - 0.25)
            return this.colorStops.day;
        } else if (t < 0.4) {
            // Mid-day to Afternoon (0.25 - 0.4)
            const blend = (t - 0.25) / 0.15;
            return this.lerpColors(this.colorStops.day, this.colorStops.afternoon, blend);
        } else if (t < 0.5) {
            // Afternoon to Full Sunset (0.4 - 0.5)
            const blend = (t - 0.4) / 0.1;
            return this.lerpColors(this.colorStops.afternoon, this.colorStops.sunset, blend);
        } else if (t < 0.55) {
            // Sunset to Twilight (0.5 - 0.55) - rapid transition
            const blend = (t - 0.5) / 0.05;
            return this.lerpColors(this.colorStops.sunset, this.colorStops.twilight, blend);
        } else if (t < 0.65) {
            // Twilight to Deep Night (0.55 - 0.65) - rapid transition
            const blend = (t - 0.55) / 0.1;
            return this.lerpColors(this.colorStops.twilight, this.colorStops.night, blend);
        } else if (t < 0.95) {
            // Deep Night (0.65 - 0.95)
            return this.colorStops.night;
        } else {
            // Night to Pre-dawn (0.95 - 1.0)
            const blend = (t - 0.95) / 0.05;
            return this.lerpColors(this.colorStops.night, this.colorStops.sunrise, blend);
        }
    }
    
    lerpColors(from, to, t) {
        const fog = new THREE.Color();
        const background = new THREE.Color();
        
        fog.copy(from.fog).lerp(to.fog, t);
        background.copy(from.background).lerp(to.background, t);
        
        return { fog, background };
    }
    
    getFogColor() {
        return this.currentFogColor;
    }
    
    getBackgroundColor() {
        return this.currentBackgroundColor;
    }
}
