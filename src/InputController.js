export class InputController {
    constructor() {
        this.keys = {};
        this.mouse = { deltaX: 0, deltaY: 0, isLocked: false };
        this.gamepad = { connected: false, index: -1 };
        
        // Keyboard events
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
        
        // Mouse events
        document.addEventListener('click', () => {
            if (!this.mouse.isLocked) {
                document.body.requestPointerLock();
            }
        });
        
        document.addEventListener('pointerlockchange', () => {
            this.mouse.isLocked = document.pointerLockElement === document.body;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.mouse.isLocked) {
                this.mouse.deltaX -= e.movementX * 0.002;
                this.mouse.deltaY -= e.movementY * 0.002;
            }
        });
        
        // Gamepad events
        window.addEventListener('gamepadconnected', (e) => {
            console.log('Gamepad connected:', e.gamepad.id);
            this.gamepad.connected = true;
            this.gamepad.index = e.gamepad.index;
        });
        
        window.addEventListener('gamepaddisconnected', (e) => {
            console.log('Gamepad disconnected:', e.gamepad.id);
            this.gamepad.connected = false;
            this.gamepad.index = -1;
        });
    }
    
    getGamepadState() {
        if (!this.gamepad.connected) return null;
        
        const gamepads = navigator.getGamepads();
        if (!gamepads || !gamepads[this.gamepad.index]) {
            this.gamepad.connected = false;
            return null;
        }
        
        return gamepads[this.gamepad.index];
    }
    
    getMovement() {
        let dx = 0;
        let dz = 0;
        
        // Keyboard input - FIXED: W is forward (positive), S is backward (negative)
        if (this.keys['KeyW'] || this.keys['ArrowUp']) dz += 1;    // Forward
        if (this.keys['KeyS'] || this.keys['ArrowDown']) dz -= 1;  // Backward
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx += 1;  // Left (FIXED: was -= 1)
        if (this.keys['KeyD'] || this.keys['ArrowRight']) dx -= 1; // Right (FIXED: was += 1)
        
        // Gamepad input (left stick)
        const gamepad = this.getGamepadState();
        if (gamepad) {
            const deadzone = 0.15;
            const leftStickX = Math.abs(gamepad.axes[0]) > deadzone ? gamepad.axes[0] : 0;
            const leftStickY = Math.abs(gamepad.axes[1]) > deadzone ? gamepad.axes[1] : 0;
            
            // Add gamepad input (axes are already -1 to 1)
            dx -= leftStickX; // Invert X axis
            dz -= leftStickY; // Invert Y axis for gamepad (up is negative on stick)
            
            // D-pad support (buttons 12-15 on most gamepads)
            if (gamepad.buttons[12]?.pressed) dz += 1; // D-pad up
            if (gamepad.buttons[13]?.pressed) dz -= 1; // D-pad down
            if (gamepad.buttons[14]?.pressed) dx += 1; // D-pad left
            if (gamepad.buttons[15]?.pressed) dx -= 1; // D-pad right
        }
        
        // Clamp values to -1 to 1 range
        dx = Math.max(-1, Math.min(1, dx));
        dz = Math.max(-1, Math.min(1, dz));
        
        return { dx, dz };
    }
    
    getRotation() {
        let rotation = this.mouse.deltaX;
        
        // Gamepad input (right stick for camera)
        const gamepad = this.getGamepadState();
        if (gamepad) {
            const deadzone = 0.15;
            const rightStickX = Math.abs(gamepad.axes[2]) > deadzone ? gamepad.axes[2] : 0;
            
            // Add right stick rotation (multiply by sensitivity)
            rotation -= rightStickX * 0.05;
            this.mouse.deltaX = rotation;
        }
        
        return rotation;
    }
    
    resetMouseDelta() {
        this.mouse.deltaX = 0;
        this.mouse.deltaY = 0;
    }
    
    isGamepadConnected() {
        return this.gamepad.connected;
    }
}
