export class GameState {
    static cities = [];
    static currentSpeed = 1.0;
    static currentTerrainType = 'unknown';
    
    static setCities(cities) {
        this.cities = cities;
        console.log('GameState: Set cities', cities.length);
    }
    
    static getCities() {
        return this.cities;
    }
    
    static setCurrentSpeed(speed, terrainType) {
        console.log('GameState.setCurrentSpeed called:', speed, terrainType);
        this.currentSpeed = speed;
        this.currentTerrainType = terrainType;
    }
    
    static getPlayerSpawnPosition() {
        // If cities exist, spawn near biggest city
        if (this.cities.length > 0) {
            // Find the biggest city
            const biggestCity = this.cities.reduce((largest, city) => {
                return (city.size > largest.size) ? city : largest;
            }, this.cities[0]);
            
            console.log('Spawning player at biggest city:', biggestCity.size, 'at', biggestCity.centerX, biggestCity.centerZ);
            
            return {
                x: biggestCity.centerX,
                z: biggestCity.centerZ
            };
        }
        
        // Default spawn position in center of map
        console.log('No cities found, spawning at map center');
        return {
            x: 512,
            z: 512
        };
    }
    
    static getState() {
        return {
            cities: this.cities,
            currentSpeed: this.currentSpeed,
            currentTerrainType: this.currentTerrainType
        };
    }
}
