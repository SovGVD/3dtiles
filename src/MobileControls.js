export class MobileControls {
    constructor() {
        this.leftJoystick = null;
        this.rightJoystick = null;
        this.leftTouchId = null;  // Track which touch is controlling left stick
        this.rightTouchId = null; // Track which touch is controlling right stick
        this.leftData = { dx: 0, dz: 0 };
        this.rightData = { dx: 0, dy: 0 };
        
        this.isMobile = this.detectMobile();
        
        if (this.isMobile) {
            this.initialize();
        }
    }
    
    detectMobile() {
        // Check if it's a mobile device (phone/tablet) but not a laptop with touchscreen
        const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const hasTouchPoints = navigator.maxTouchPoints && navigator.maxTouchPoints > 2;
        
        // Check if it's likely a laptop (has mouse/keyboard)
        const hasPointer = window.matchMedia('(pointer: fine)').matches;
        const hasHover = window.matchMedia('(hover: hover)').matches;
        
        // Only enable mobile controls if:
        // 1. Mobile user agent OR many touch points
        // 2. AND NOT a device with fine pointer (mouse) and hover capability (laptop)
        return (isMobileUserAgent || hasTouchPoints) && !(hasPointer && hasHover);
    }
    
    initialize() {
        // Create left joystick (movement)
        this.leftJoystick = this.createJoystick('left');
        this.leftJoystick.style.left = '60px';
        this.leftJoystick.style.bottom = '60px';
        
        // Create right joystick (camera)
        this.rightJoystick = this.createJoystick('right');
        this.rightJoystick.style.right = '60px';
        this.rightJoystick.style.bottom = '60px';
        
        document.body.appendChild(this.leftJoystick);
        document.body.appendChild(this.rightJoystick);
        
        this.setupJoystickEvents(this.leftJoystick, 'left');
        this.setupJoystickEvents(this.rightJoystick, 'right');
    }
    
    createJoystick(side) {
        const container = document.createElement('div');
        container.className = `joystick joystick-${side}`;
        container.style.cssText = `
            position: fixed;
            width: 120px;
            height: 120px;
            background: rgba(255, 255, 255, 0.3);
            border: 3px solid rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            z-index: 10000;
            touch-action: none;
        `;
        
        const stick = document.createElement('div');
        stick.className = 'joystick-stick';
        stick.style.cssText = `
            position: absolute;
            width: 50px;
            height: 50px;
            background: rgba(255, 255, 255, 0.8);
            border: 2px solid rgba(0, 0, 0, 0.3);
            border-radius: 50%;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
        `;
        
        container.appendChild(stick);
        return container;
    }
    
    setupJoystickEvents(joystick, side) {
        const stick = joystick.querySelector('.joystick-stick');
        const radius = 60;
        const maxDistance = 35;
        
        const handleStart = (e) => {
            e.preventDefault();
            
            // Get the first touch that hit this joystick
            const touch = e.changedTouches ? e.changedTouches[0] : e;
            
            if (side === 'left') {
                this.leftTouchId = touch.identifier;
            } else {
                this.rightTouchId = touch.identifier;
            }
        };
        
        const handleMove = (e) => {
            e.preventDefault();
            
            // Find the touch that belongs to this joystick
            let touch = null;
            const targetId = side === 'left' ? this.leftTouchId : this.rightTouchId;
            
            if (targetId === null) return;
            
            if (e.touches) {
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === targetId) {
                        touch = e.touches[i];
                        break;
                    }
                }
            } else {
                touch = e;
            }
            
            if (!touch) return;
            
            const rect = joystick.getBoundingClientRect();
            const centerX = rect.left + radius;
            const centerY = rect.top + radius;
            
            let deltaX = touch.clientX - centerX;
            let deltaY = touch.clientY - centerY;
            
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance > maxDistance) {
                const angle = Math.atan2(deltaY, deltaX);
                deltaX = Math.cos(angle) * maxDistance;
                deltaY = Math.sin(angle) * maxDistance;
            }
            
            stick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
            
            const normalizedX = deltaX / maxDistance;
            const normalizedY = deltaY / maxDistance;
            
            if (side === 'left') {
                this.leftData.dx = -normalizedX;
                this.leftData.dz = -normalizedY;
            } else {
                this.rightData.dx = -normalizedX;
                this.rightData.dy = normalizedY;
            }
        };
        
        const handleEnd = (e) => {
            e.preventDefault();
            
            // Check if the ended touch was controlling this joystick
            const changedTouches = e.changedTouches || [e];
            const targetId = side === 'left' ? this.leftTouchId : this.rightTouchId;
            
            let shouldReset = false;
            
            for (let i = 0; i < changedTouches.length; i++) {
                if (changedTouches[i].identifier === targetId) {
                    shouldReset = true;
                    break;
                }
            }
            
            if (!shouldReset && e.type !== 'mouseup') return;
            
            if (side === 'left') {
                this.leftTouchId = null;
                this.leftData.dx = 0;
                this.leftData.dz = 0;
            } else {
                this.rightTouchId = null;
                this.rightData.dx = 0;
                this.rightData.dy = 0;
            }
            
            stick.style.transform = 'translate(-50%, -50%)';
        };
        
        // Touch events (multi-touch aware)
        joystick.addEventListener('touchstart', handleStart, { passive: false });
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd, { passive: false });
        document.addEventListener('touchcancel', handleEnd, { passive: false });
        
        // Mouse events for testing on desktop
        joystick.addEventListener('mousedown', (e) => {
            e.identifier = 0; // Fake identifier for mouse
            handleStart(e);
        });
        document.addEventListener('mousemove', (e) => {
            e.identifier = 0;
            handleMove(e);
        });
        document.addEventListener('mouseup', (e) => {
            handleEnd(e);
        });
    }
    
    getMovement() {
        return {
            dx: this.leftData.dx,
            dz: this.leftData.dz
        };
    }
    
    getRotation() {
        return this.rightData.dx * 0.02; // Reduced from 0.1 to 0.02 for less sensitivity
    }
    
    isEnabled() {
        return this.isMobile;
    }
    
    dispose() {
        if (this.leftJoystick && this.leftJoystick.parentNode) {
            this.leftJoystick.parentNode.removeChild(this.leftJoystick);
        }
        if (this.rightJoystick && this.rightJoystick.parentNode) {
            this.rightJoystick.parentNode.removeChild(this.rightJoystick);
        }
    }
}
