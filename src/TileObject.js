export class TileObject {
    constructor(x, z, type, config) {
        this.x = x;
        this.z = z;
        this.type = type;
        this.config = config;
        this.mesh = null;

        // Validate config on creation
        if (!config) {
            console.error(`TileObject created without config! Type: ${type}, Position: (${x}, ${z})`);
        }
    }
}
