import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Config } from './config.js';
import { TextureGenerator } from './TextureGenerator.js';

export class ThreeJSRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        this.renderer = new THREE.WebGLRenderer({ 
            canvas, 
            antialias: false,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = false;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        this.setupLighting();
        this.setupFog();
        
        this.terrainChunks = new Map();
        this.waterChunks = new Map();
        this.entityMeshes = new Map();
        this.objectMeshes = new Map();
        this.objectChunks = new Map();
        
        // Cache for chunk visibility
        this.lastVisibleChunkIds = new Set();
        this.chunkIdPool = new Set(); // Reusable Set to avoid allocations
        
        // Texture cache
        this.textureCache = new Map();
        this.objectTextureCache = new Map();
        
        // Geometry cache for objects
        this.objectGeometryCache = new Map();
        
        // Material cache
        this.materials = this.createMaterialCache();
        
        window.addEventListener('resize', () => this.onResize());
    }
    
    createMaterialCache() {
        const cache = {};
        
        // Create reusable materials for each tile type
        for (const [type, color] of Object.entries(Config.TILE_COLORS)) {
            cache[type] = new THREE.MeshLambertMaterial({
                color: color,
                side: THREE.DoubleSide
            });
        }
        
        // Water surface material
        const waterConfig = Config.TERRAIN_CONFIG.water;
        cache.water = new THREE.MeshLambertMaterial({
            color: waterConfig.waterColor,
            transparent: true,
            opacity: waterConfig.waterOpacity,
            side: THREE.DoubleSide
        });
        
        // Underwater terrain material
        cache.underwater = new THREE.MeshLambertMaterial({
            color: 0x8d6e63,
            side: THREE.DoubleSide
        });
        
        return cache;
    }
    
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(50, 50, 50);
        dirLight.castShadow = false; // Disabled for performance
        this.scene.add(dirLight);
    }
    
    setupFog() {
        this.scene.fog = new THREE.Fog(
            Config.FOG_COLOR,
            Config.FOG_NEAR,
            Config.FOG_FAR
        );
        this.scene.background = new THREE.Color(Config.FOG_COLOR);
    }
    
    renderTiles(tiles, tileMap) {
        if (Config.USE_TEXTURE_ATLAS) {
            this.renderTilesTextured(tiles, tileMap);
        } else {
            this.renderTilesMerged(tiles, tileMap);
        }
    }
    
    renderTilesTextured(tiles, tileMap) {
        // Reuse Set instead of creating new one
        this.chunkIdPool.clear();
        
        // Group tiles into chunks and collect IDs in one pass
        const chunks = new Map();
        const chunkSize = Config.MERGE_CHUNK_SIZE;
        
        for (const tile of tiles) {
            const chunkX = Math.floor(tile.x / chunkSize);
            const chunkZ = Math.floor(tile.z / chunkSize);
            const chunkId = `${chunkX}_${chunkZ}`;
            
            this.chunkIdPool.add(chunkId);
            
            if (!chunks.has(chunkId)) {
                chunks.set(chunkId, []);
            }
            chunks.get(chunkId).push(tile);
        }
        
        // Remove chunks that are no longer visible (only if they changed)
        if (this.lastVisibleChunkIds.size > 0) {
            for (const chunkId of this.lastVisibleChunkIds) {
                if (!this.chunkIdPool.has(chunkId)) {
                    // Terrain chunk
                    const terrainMesh = this.terrainChunks.get(chunkId);
                    if (terrainMesh) {
                        this.scene.remove(terrainMesh);
                        terrainMesh.geometry.dispose();
                        if (terrainMesh.material.map) {
                            terrainMesh.material.map.dispose();
                        }
                        terrainMesh.material.dispose();
                        this.terrainChunks.delete(chunkId);
                    }
                    
                    // Water chunk
                    const waterMesh = this.waterChunks.get(chunkId);
                    if (waterMesh) {
                        this.scene.remove(waterMesh);
                        waterMesh.geometry.dispose();
                        waterMesh.material.dispose();
                        this.waterChunks.delete(chunkId);
                    }
                }
            }
        }
        
        // Create only new chunks
        for (const [chunkId, chunkTiles] of chunks.entries()) {
            if (!this.terrainChunks.has(chunkId)) {
                const [chunkX, chunkZ] = chunkId.split('_').map(Number);
                const { terrainMesh, waterMesh } = this.createTexturedChunk(
                    chunkX, 
                    chunkZ, 
                    chunkTiles, 
                    tileMap
                );
                
                this.scene.add(terrainMesh);
                this.terrainChunks.set(chunkId, terrainMesh);
                
                if (waterMesh) {
                    this.scene.add(waterMesh);
                    this.waterChunks.set(chunkId, waterMesh);
                }
            }
        }
        
        // Swap Sets instead of copying
        const temp = this.lastVisibleChunkIds;
        this.lastVisibleChunkIds = this.chunkIdPool;
        this.chunkIdPool = temp;
    }
    
    createTexturedChunk(chunkX, chunkZ, tiles, tileMap) {
        const chunkSize = Config.MERGE_CHUNK_SIZE;
        const tileSize = Config.TILE_SIZE;
        const chunkWorldSize = chunkSize * tileSize;
        
        // Generate or get cached texture for this chunk
        const textureCanvas = TextureGenerator.generateTerrainTexture(
            tileMap, 
            chunkX, 
            chunkZ, 
            chunkSize
        );
        
        // Create Three.js texture from cached canvas
        const texture = new THREE.CanvasTexture(textureCanvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        
        // Create heightmap geometry (cache-friendly typed array operations)
        const geometry = new THREE.PlaneGeometry(
            chunkWorldSize,
            chunkWorldSize,
            chunkSize,
            chunkSize
        );
        
        const vertices = geometry.attributes.position.array;
        const verticesPerRow = chunkSize + 1;
        
        // Apply heights to vertices (optimized loop)
        const baseChunkX = chunkX * chunkSize;
        const baseChunkZ = chunkZ * chunkSize;
        
        for (let z = 0; z <= chunkSize; z++) {
            const tileZ = baseChunkZ + z;
            const rowOffset = z * verticesPerRow * 3;
            
            for (let x = 0; x <= chunkSize; x++) {
                const tileX = baseChunkX + x;
                const height = this.getCornerHeight(tileX, tileZ, tileMap);
                
                const vertexIndex = rowOffset + x * 3;
                vertices[vertexIndex + 2] = height;
            }
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        
        // Create material with texture
        const material = new THREE.MeshLambertMaterial({
            map: texture,
            side: THREE.DoubleSide
        });
        
        const terrainMesh = new THREE.Mesh(geometry, material);
        terrainMesh.rotation.x = -Math.PI / 2;
        terrainMesh.position.set(
            chunkX * chunkWorldSize + chunkWorldSize / 2,
            0,
            chunkZ * chunkWorldSize + chunkWorldSize / 2
        );
        terrainMesh.frustumCulled = Config.FRUSTUM_CULLING;
        
        // Create water surface if needed (optimized)
        let waterMesh = null;
        const waterTiles = this.collectWaterTiles(chunkX, chunkZ, chunkSize, tileMap);
        
        if (waterTiles.length > 0) {
            waterMesh = this.createWaterChunkSurface(chunkX, chunkZ, waterTiles);
        }
        
        return { terrainMesh, waterMesh };
    }
    
    collectWaterTiles(chunkX, chunkZ, chunkSize, tileMap) {
        const waterTiles = [];
        const baseChunkX = chunkX * chunkSize;
        const baseChunkZ = chunkZ * chunkSize;
        
        for (let z = 0; z < chunkSize; z++) {
            const tileZ = baseChunkZ + z;
            for (let x = 0; x < chunkSize; x++) {
                const tileX = baseChunkX + x;
                const tile = tileMap.getTile(tileX, tileZ);
                
                if (tile && tile.type === Config.TILE_TYPES.WATER) {
                    waterTiles.push(tile);
                }
            }
        }
        
        return waterTiles;
    }
    
    createWaterChunkSurface(chunkX, chunkZ, waterTiles) {
        const tileSize = Config.TILE_SIZE;
        const waterLevel = Config.TERRAIN_CONFIG.water.waterLevel;
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        
        for (const tile of waterTiles) {
            const relX = (tile.x - chunkX * Config.MERGE_CHUNK_SIZE) * tileSize;
            const relZ = (tile.z - chunkZ * Config.MERGE_CHUNK_SIZE) * tileSize;
            const vertexOffset = vertices.length / 3;
            
            // Create horizontal quad (Y is up in world space)
            vertices.push(
                relX, waterLevel, relZ,
                relX + tileSize, waterLevel, relZ,
                relX, waterLevel, relZ + tileSize,
                relX + tileSize, waterLevel, relZ + tileSize
            );
            
            indices.push(
                vertexOffset, vertexOffset + 1, vertexOffset + 2,
                vertexOffset + 2, vertexOffset + 1, vertexOffset + 3
            );
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        const mesh = new THREE.Mesh(geometry, this.materials.water);
        mesh.position.set(
            chunkX * Config.MERGE_CHUNK_SIZE * Config.TILE_SIZE,
            0,
            chunkZ * Config.MERGE_CHUNK_SIZE * Config.TILE_SIZE
        );
        mesh.frustumCulled = Config.FRUSTUM_CULLING;
        
        return mesh;
    }
    
    renderTilesMerged(tiles, tileMap) {
        // Fallback to previous merged geometry method
        const chunks = this.groupTilesIntoChunks(tiles);
        const currentChunkIds = new Set(chunks.keys());
        
        for (const [chunkId, mesh] of this.terrainChunks.entries()) {
            if (!currentChunkIds.has(chunkId)) {
                this.scene.remove(mesh);
                mesh.geometry.dispose();
                this.terrainChunks.delete(chunkId);
            }
        }
        
        for (const [chunkId, mesh] of this.waterChunks.entries()) {
            if (!currentChunkIds.has(chunkId)) {
                this.scene.remove(mesh);
                mesh.geometry.dispose();
                this.waterChunks.delete(chunkId);
            }
        }
        
        for (const [chunkId, chunkTiles] of chunks.entries()) {
            if (!this.terrainChunks.has(chunkId)) {
                const { terrainMesh, waterMesh } = this.createChunkMesh(chunkTiles, tileMap);
                this.scene.add(terrainMesh);
                this.terrainChunks.set(chunkId, terrainMesh);
                
                if (waterMesh) {
                    this.scene.add(waterMesh);
                    this.waterChunks.set(chunkId, waterMesh);
                }
            }
        }
    }
    
    groupTilesIntoChunks(tiles) {
        const chunks = new Map();
        const chunkSize = Config.MERGE_CHUNK_SIZE;
        
        // Pre-calculate to avoid repeated divisions
        const invChunkSize = 1 / chunkSize;
        
        for (const tile of tiles) {
            const chunkX = Math.floor(tile.x * invChunkSize);
            const chunkZ = Math.floor(tile.z * invChunkSize);
            const chunkId = `${chunkX}_${chunkZ}`;
            
            let chunk = chunks.get(chunkId);
            if (!chunk) {
                chunk = [];
                chunks.set(chunkId, chunk);
            }
            chunk.push(tile);
        }
        
        return chunks;
    }
    
    createChunkMesh(tiles, tileMap) {
        // Separate tiles by type for efficient batching
        const tilesByType = {};
        const waterTiles = [];
        
        for (const tile of tiles) {
            if (!tilesByType[tile.type]) {
                tilesByType[tile.type] = [];
            }
            tilesByType[tile.type].push(tile);
            
            if (tile.type === Config.TILE_TYPES.WATER) {
                waterTiles.push(tile);
            }
        }
        
        // Skip empty chunks
        if (Object.keys(tilesByType).length === 0) {
            return { terrainMesh: null, waterMesh: null };
        }
        
        // Use the first tile's position as the chunk's position
        const firstTile = tiles[0];
        const chunkX = firstTile.x;
        const chunkZ = firstTile.z;
        
        // Create geometry and material for each tile type
        const geometries = {};
        const materials = {};
        
        for (const [type, tilesOfType] of Object.entries(tilesByType)) {
            if (type === Config.TILE_TYPES.WATER) {
                // Special case for water: create a single plane geometry
                const waterLevel = Config.TERRAIN_CONFIG.water.waterLevel;
                const waterGeometry = new THREE.PlaneGeometry(
                    Config.MERGE_CHUNK_SIZE * Config.TILE_SIZE,
                    Config.MERGE_CHUNK_SIZE * Config.TILE_SIZE
                );
                waterGeometry.rotateX(-Math.PI / 2);
                
                const waterMaterial = this.materials.water;
                const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
                waterMesh.position.set(
                    chunkX * Config.TILE_SIZE + Config.TILE_SIZE / 2,
                    waterLevel,
                    chunkZ * Config.TILE_SIZE + Config.TILE_SIZE / 2
                );
                waterMesh.frustumCulled = Config.FRUSTUM_CULLING;
                
                return { terrainMesh: null, waterMesh };
            } else {
                const geometry = new THREE.BufferGeometry();
                const vertices = [];
                const indices = [];
                
                for (const tile of tilesOfType) {
                    const tileX = tile.x;
                    const tileZ = tile.z;
                    const vertexOffset = vertices.length / 3;
                    
                    vertices.push(
                        tileX * Config.TILE_SIZE, 0, tileZ * Config.TILE_SIZE,
                        (tileX + 1) * Config.TILE_SIZE, 0, tileZ * Config.TILE_SIZE,
                        tileX * Config.TILE_SIZE, 0, (tileZ + 1) * Config.TILE_SIZE,
                        (tileX + 1) * Config.TILE_SIZE, 0, (tileZ + 1) * Config.TILE_SIZE
                    );
                    
                    indices.push(
                        vertexOffset, vertexOffset + 2, vertexOffset + 1,
                        vertexOffset + 1, vertexOffset + 2, vertexOffset + 3
                    );
                }
                
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                geometry.setIndex(indices);
                geometry.computeVertexNormals();
                
                const material = this.materials[Object.keys(Config.TILE_COLORS).find(key => Config.TILE_COLORS[key] === tilesOfType[0].color)];
                geometries[type] = geometry;
                materials[type] = material;
            }
        }
        
        // Merge geometries for all tile types
        const mergedGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(Object.values(geometries));
        const mergedMaterial = Array.from(new Set(Object.values(materials)));
        
        const mesh = new THREE.Mesh(mergedGeometry, mergedMaterial);
        mesh.position.set(
            chunkX * Config.TILE_SIZE + Config.TILE_SIZE / 2,
            0,
            chunkZ * Config.TILE_SIZE + Config.TILE_SIZE / 2
        );
        mesh.frustumCulled = Config.FRUSTUM_CULLING;
        
        return { terrainMesh: mesh, waterMesh: null };
    }
    
    getCornerHeight(x, z, tileMap) {
        // A corner is shared by up to 4 tiles
        // Average the heights of all tiles that share this corner
        const tiles = [
            tileMap.getTile(x, z),
            tileMap.getTile(x - 1, z),
            tileMap.getTile(x, z - 1),
            tileMap.getTile(x - 1, z - 1)
        ];
        
        let totalHeight = 0;
        let count = 0;
        
        for (const tile of tiles) {
            if (tile !== null) {
                totalHeight += tile.height;
                count++;
            }
        }
        
        return count > 0 ? totalHeight / count : 0;
    }
    
    getSafeHeight(x, z, tileMap) {
        const tile = tileMap.getTile(x, z);
        return tile ? tile.height : 0;
    }
    
    renderEntity(entity, isPlayer = false) {
        const id = isPlayer ? 'player' : entity.id || 'entity';
        
        if (!this.entityMeshes.has(id)) {
            const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
            const material = new THREE.MeshLambertMaterial({
                color: isPlayer ? 0xff5722 : 0x2196f3
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            this.scene.add(mesh);
            this.entityMeshes.set(id, mesh);
        }
        
        const mesh = this.entityMeshes.get(id);
        mesh.position.set(
            entity.x * Config.TILE_SIZE,
            entity.y,
            entity.z * Config.TILE_SIZE
        );
        mesh.rotation.y = entity.rotation;
    }
    
    renderObjects(objects, tileMap) {
        // Group objects by type and chunk for batching
        const objectsByChunk = new Map();
        const chunkSize = Config.MERGE_CHUNK_SIZE;
        
        for (const object of objects) {
            const chunkX = Math.floor(object.x / chunkSize);
            const chunkZ = Math.floor(object.z / chunkSize);
            const chunkKey = `${chunkX}_${chunkZ}`;
            
            if (!objectsByChunk.has(chunkKey)) {
                objectsByChunk.set(chunkKey, []);
            }
            objectsByChunk.get(chunkKey).push(object);
        }
        
        const currentChunkKeys = new Set(objectsByChunk.keys());
        
        // Remove chunks that are no longer visible
        for (const [chunkKey, group] of this.objectChunks.entries()) {
            if (!currentChunkKeys.has(chunkKey)) {
                this.scene.remove(group);
                group.children.forEach(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material && child.material.map) child.material.map.dispose();
                    if (child.material) child.material.dispose();
                });
                this.objectChunks.delete(chunkKey);
            }
        }
        
        // Create or update object chunks
        for (const [chunkKey, chunkObjects] of objectsByChunk.entries()) {
            if (!this.objectChunks.has(chunkKey)) {
                const group = this.createObjectChunk(chunkObjects, tileMap);
                this.scene.add(group);
                this.objectChunks.set(chunkKey, group);
            } else {
                // Update billboards in existing chunk
                const group = this.objectChunks.get(chunkKey);
                group.children.forEach(mesh => this.updateBillboard(mesh));
            }
        }
    }
    
    createObjectChunk(objects, tileMap) {
        const group = new THREE.Group();
        
        // Group objects by type for shared materials
        const objectsByType = new Map();
        for (const object of objects) {
            if (!objectsByType.has(object.type)) {
                objectsByType.set(object.type, []);
            }
            objectsByType.get(object.type).push(object);
        }
        
        // Create instanced meshes for each object type
        for (const [type, typeObjects] of objectsByType.entries()) {
            const config = typeObjects[0].config;
            
            // Get or create cached geometry
            const geometryKey = `${type}_${config.scale}_${config.height}`;
            let geometry;
            if (this.objectGeometryCache.has(geometryKey)) {
                geometry = this.objectGeometryCache.get(geometryKey);
            } else {
                geometry = new THREE.PlaneGeometry(config.scale, config.height);
                this.objectGeometryCache.set(geometryKey, geometry);
            }
            
            // Get or load texture
            let texture;
            if (this.objectTextureCache.has(type)) {
                texture = this.objectTextureCache.get(type);
            } else {
                texture = new THREE.TextureLoader().load(config.textureUrl);
                
                if (config.pixelArt) {
                    texture.magFilter = THREE.NearestFilter;
                    texture.minFilter = THREE.NearestFilter;
                    texture.generateMipmaps = false;
                } else {
                    texture.magFilter = THREE.LinearFilter;
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                }
                
                this.objectTextureCache.set(type, texture);
            }
            
            // Create material (one per type)
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.5,
                side: THREE.DoubleSide
            });
            
            // Create individual meshes (they share geometry and material)
            for (const object of typeObjects) {
                const mesh = new THREE.Mesh(geometry, material);
                
                const height = tileMap.getHeightAt(object.x, object.z);
                mesh.position.set(
                    object.x * Config.TILE_SIZE,
                    height + config.height / 2,
                    object.z * Config.TILE_SIZE
                );
                
                mesh.userData.isObject = true;
                group.add(mesh);
            }
        }
        
        return group;
    }
    
    updateBillboard(mesh) {
        if (!mesh.userData.isObject) return;
        
        // Make the sprite face the camera (billboard effect)
        mesh.quaternion.copy(this.camera.quaternion);
    }
    
    updateCamera(player) {
        const angle = Config.CAMERA_ANGLE;
        const distance = Config.CAMERA_DISTANCE;
        
        this.camera.position.x = player.x * Config.TILE_SIZE - Math.sin(player.rotation) * distance;
        this.camera.position.z = player.z * Config.TILE_SIZE - Math.cos(player.rotation) * distance;
        this.camera.position.y = player.y + Config.CAMERA_HEIGHT;
        
        this.camera.lookAt(
            player.x * Config.TILE_SIZE,
            player.y,
            player.z * Config.TILE_SIZE
        );
    }
    
    render() {
        // Update all billboards to face camera
        for (const group of this.objectChunks.values()) {
            group.children.forEach(mesh => this.updateBillboard(mesh));
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    dispose() {
        this.terrainChunks.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            if (mesh.material.map) {
                mesh.material.map.dispose();
            }
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => m.dispose());
            } else {
                mesh.material.dispose();
            }
        });
        this.waterChunks.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
        });
        this.entityMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
        });
        this.objectMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            if (mesh.material.map) {
                mesh.material.map.dispose();
            }
            mesh.material.dispose();
        });
        
        this.objectChunks.forEach(group => {
            this.scene.remove(group);
            group.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material && child.material.map) child.material.map.dispose();
                if (child.material) child.material.dispose();
            });
        });
        
        this.objectGeometryCache.forEach(geometry => {
            geometry.dispose();
        });
        
        for (const material of Object.values(this.materials)) {
            material.dispose();
        }
        
        // Clear texture generator cache
        TextureGenerator.clearCache();
        
        this.textureCache.clear();
        this.objectTextureCache.forEach(texture => {
            texture.dispose();
        });
        this.renderer.dispose();
    }
}
