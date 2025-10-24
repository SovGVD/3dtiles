import { MobileControls } from './MobileControls.js';

export class InputController {
    constructor() {
        this.keys = {};
        this.mouse = { deltaX: 0, deltaY: 0, isLocked: false };
        this.gamepad = { connected: false, index: -1 };
        this.mobileControls = new MobileControls();
        
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
        
        // Keyboard input (always check first)
        if (this.keys['KeyW'] || this.keys['ArrowUp']) dz += 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) dz -= 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx += 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) dx -= 1;
        
        // Gamepad input
        const gamepad = this.getGamepadState();
        if (gamepad) {
            const deadzone = 0.15;
            const leftStickX = Math.abs(gamepad.axes[0]) > deadzone ? gamepad.axes[0] : 0;
            const leftStickY = Math.abs(gamepad.axes[1]) > deadzone ? gamepad.axes[1] : 0;
            
            dx -= leftStickX;
            dz -= leftStickY;
            
            if (gamepad.buttons[12]?.pressed) dz += 1;
            if (gamepad.buttons[13]?.pressed) dz -= 1;
            if (gamepad.buttons[14]?.pressed) dx += 1;
            if (gamepad.buttons[15]?.pressed) dx -= 1;
        }
        
        // Only use mobile controls if no keyboard/gamepad input and mobile is enabled
        if (dx === 0 && dz === 0 && this.mobileControls.isEnabled()) {
            return this.mobileControls.getMovement();
        }
        
        dx = Math.max(-1, Math.min(1, dx));
        dz = Math.max(-1, Math.min(1, dz));
        
        return { dx, dz };
    }
    
    getRotation() {
        let rotation = this.mouse.deltaX;
        
        // Gamepad input
        const gamepad = this.getGamepadState();
        if (gamepad) {
            const deadzone = 0.15;
            const rightStickX = Math.abs(gamepad.axes[2]) > deadzone ? gamepad.axes[2] : 0;
            
            rotation -= rightStickX * 0.05;
            this.mouse.deltaX = rotation;
        }
        
        // Only use mobile controls if no mouse/gamepad input and mobile is enabled
        if (gamepad === null && this.mobileControls.isEnabled()) {
            const mobileRotation = this.mobileControls.getRotation();
            this.mouse.deltaX += mobileRotation;
            return this.mouse.deltaX;
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
