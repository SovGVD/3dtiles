export class TileObject {
    constructor(x, z, type, config) {
        this.x = x;
        this.z = z;
        this.type = type;
        this.config = config;
        this.mesh = null;
    }
}
