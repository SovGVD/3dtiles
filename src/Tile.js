export class Tile {
    constructor(x, z, height = 0, type = 'terrain') {
        this.x = x;
        this.z = z;
        this.height = height;
        this.type = type;
        this.mesh = null;
    }
    
    shouldSmooth(neighbor, threshold) {
        if (!neighbor) return false;
        return Math.abs(this.height - neighbor.height) < threshold;
    }
}
