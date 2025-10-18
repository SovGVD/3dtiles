export class Config {
    // Map settings
    static MAP_WIDTH = 1024;
    static MAP_HEIGHT = 1024;
    static TILE_SIZE = 2;
    
    // Rendering settings
    static RENDER_DISTANCE = 30;
    static FOG_NEAR = 40;
    static FOG_FAR = 70;
    static FOG_COLOR = 0xcccccc;
    static TARGET_FPS = 60;
    static FRAME_TIME = 1000 / 60; // 16.67ms per frame
    
    // Performance settings
    static USE_MERGED_GEOMETRY = true;
    static USE_TEXTURE_ATLAS = true; // Use single textured surface instead of individual tiles
    static TEXTURE_RESOLUTION = 16; // Increased for better smoothing quality (was 2)
    static MERGE_CHUNK_SIZE = 32; // Larger chunks for texture-based rendering
    static FRUSTUM_CULLING = true;
    static SHADOW_MAP_SIZE = 1024;
    
    // Debug settings
    static DEBUG_MODE = true;
    static SHOW_PERFORMANCE_STATS = true;
    
    // Height smoothing
    static SMOOTH_THRESHOLD = 2.0;
    static HEIGHT_SCALE = 6.0; // Increased for dramatic mountains
    
    // Tile types
    static TILE_TYPES = {
        TERRAIN: 'terrain',
        WATER: 'water',
        ROAD: 'road',
        ROCK: 'rock',
        GRASS: 'grass'
    };
    
    // Tile type relationships - tiles in the same group should have similar heights when adjacent
    static TILE_LEVEL_GROUPS = [
        // Water and grass should be at same level (shoreline)
        [this.TILE_TYPES.WATER, this.TILE_TYPES.GRASS],
        // Grass and terrain can be at same level
        [this.TILE_TYPES.GRASS, this.TILE_TYPES.TERRAIN],
        // Road should match terrain level
        [this.TILE_TYPES.ROAD, this.TILE_TYPES.TERRAIN],
        [this.TILE_TYPES.ROAD, this.TILE_TYPES.GRASS]
        // Rock is intentionally separate - can have different heights
    ];
    
    // Maximum height difference allowed between tiles in the same group
    static TILE_LEVEL_THRESHOLD = 0.5;
    
    // Tile textures
    static TILE_TEXTURES = {
        terrain: './assets/textures/terrain.png',
        water: './assets/textures/water.png',
        road: './assets/textures/road.png',
        rock: './assets/textures/rock.png',
        grass: './assets/textures/grass.png'
    };
    
    // Tile colors
    static TILE_COLORS = {
        terrain: 0x7cb342,
        water: 0x1976d2,
        road: 0x757575,
        rock: 0x616161,
        grass: 0x8bc34a
    };
    
    // Terrain type configurations
    static TERRAIN_CONFIG = {
        terrain: {
            speedMultiplier: 1.0,
            friction: 1.0
        },
        water: {
            speedMultiplier: 0.5,
            friction: 0.8,
            waterLevel: -1.0, // Moderate water level
            waterOpacity: 0.4,
            waterColor: 0x1e88e5
        },
        road: {
            speedMultiplier: 1.5, // 1.5x faster on roads
            friction: 0.8
        },
        rock: {
            speedMultiplier: 0.7,
            friction: 1.2
        },
        grass: {
            speedMultiplier: 0.9,
            friction: 1.0
        }
    };
    
    // Tile objects (trees, rocks, etc.)
    static TILE_OBJECTS = {
        tree: {
            textureUrl: './assets/tree.png',
            allowedTerrain: [this.TILE_TYPES.GRASS, this.TILE_TYPES.TERRAIN],
            spawnProbability: 0.05, // Reduced from 0.15 to 5% for better performance
            scale: 3.0,
            height: 4.0,
            pixelArt: true // Preserve sharp pixels, no smoothing
        }
    };
    
    // Player settings
    static PLAYER_SPEED = 0.1;
    static PLAYER_HEIGHT = 1.5;
    
    // Camera settings
    static CAMERA_DISTANCE = 15;
    static CAMERA_HEIGHT = 10;
    static CAMERA_ANGLE = Math.PI / 6;
}
