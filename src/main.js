import { Game } from './Game.js';

const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);

// Show loading message
const loadingDiv = document.createElement('div');
loadingDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    background: rgba(0, 0, 0, 0.8);
    padding: 20px 40px;
    border-radius: 10px;
    font-family: Arial, sans-serif;
    font-size: 18px;
    z-index: 10000;
`;
loadingDiv.textContent = 'Loading textures...';
document.body.appendChild(loadingDiv);

// Initialize and start game
game.initialize().then(() => {
    document.body.removeChild(loadingDiv);
    game.start();
}).catch(error => {
    console.error('Failed to initialize game:', error);
    loadingDiv.textContent = 'Failed to load game';
    loadingDiv.style.background = 'rgba(255, 0, 0, 0.8)';
});

window.addEventListener('beforeunload', () => {
    game.dispose();
});
