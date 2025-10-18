export class GameState {
    static cities = [];
    static playerSpawnCity = null;
    
    static setCities(cities) {
        this.cities = cities;
        
        // Find biggest city (128x128, then 64x64, etc.) for player spawn
        const biggestCities = cities
            .sort((a, b) => b.size - a.size) // Sort by size descending
            .filter((city, index, arr) => city.size === arr[0].size); // Get all cities with max size
        
        if (biggestCities.length > 0) {
            // Pick random biggest city
            this.playerSpawnCity = biggestCities[Math.floor(Math.random() * biggestCities.length)];
            console.log(`Player spawn city selected: ${this.playerSpawnCity.size}x${this.playerSpawnCity.size} at (${this.playerSpawnCity.centerX}, ${this.playerSpawnCity.centerZ})`);
        }
    }
    
    static getCities() {
        return this.cities;
    }
    
    static getPlayerSpawnCity() {
        return this.playerSpawnCity;
    }
    
    static getPlayerSpawnPosition() {
        if (this.playerSpawnCity) {
            return {
                x: this.playerSpawnCity.centerX,
                z: this.playerSpawnCity.centerZ
            };
        }
        return null;
    }
}
