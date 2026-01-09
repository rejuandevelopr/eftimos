// ========================================
// GRAIN EFFECT SETUP
// ========================================
const grainCanvasEl = document.getElementById("grainCanvas");
const grainMainCtx = grainCanvasEl.getContext("2d");

let grainWidth = window.innerWidth;
let grainHeight = window.innerHeight;
grainCanvasEl.width = grainWidth;
grainCanvasEl.height = grainHeight;

// Check if visual effects should be enabled (default: true)
const shouldStartGrain = localStorage.getItem('visualEffectsEnabled') !== 'false';

// ========================================
// FILM GRAIN EFFECT
// ========================================
const grainCanvas = document.createElement('canvas');
const grainCtx = grainCanvas.getContext('2d');
grainCanvas.width = 500;
grainCanvas.height = 300;

let isAnimating = shouldStartGrain;
let grainAnimationId = null;

// Track hover state for grain intensity boost
let isHoveringElement = false;

window.addEventListener('tooltipShown', () => {
    isHoveringElement = true;
});

window.addEventListener('tooltipHidden', () => {
    isHoveringElement = false;
});

// Expose functions to control grain animation
window.stopGrainEffect = function() {
    isAnimating = false;
    if (grainAnimationId) {
        cancelAnimationFrame(grainAnimationId);
        grainAnimationId = null;
    }
    // Clear the canvas
    grainMainCtx.clearRect(0, 0, grainWidth, grainHeight);
};

window.startGrainEffect = function() {
    if (!isAnimating) {
        isAnimating = true;
        animateGrain();
    }
};

function updateGrain() {
    const imageData = grainCtx.createImageData(grainCanvas.width, grainCanvas.height);
    const centerX = grainCanvas.width / 2;
    const centerY = grainCanvas.height / 2;
    const maxDist = Math.sqrt(centerX**2 + centerY**2);

    for (let y = 0; y < grainCanvas.height; y++) {
        for (let x = 0; x < grainCanvas.width; x++) {
            const i = (y * grainCanvas.width + x) * 4;
            const val = Math.random() * 255;

            // Distance from center (0 at center, 1 at edges)
            const dx = x - centerX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx*dx + dy*dy) / maxDist;

            const alpha = lerp(0, 100, dist);

            imageData.data[i] = val;      // R
            imageData.data[i + 1] = val;  // G
            imageData.data[i + 2] = val;  // B
            imageData.data[i + 3] = alpha; // A
        }
    }

    grainCtx.putImageData(imageData, 0, 0);
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}

// ========================================
// ANIMATION LOOP
// ========================================
function animateGrain() {
    if (!isAnimating) return;

    grainMainCtx.clearRect(0, 0, grainWidth, grainHeight);

    // Calculate distance from map bounds (if available from script.js)
    let grainIntensityMultiplier = 1.0;
    
    if (typeof targetOffsetX !== 'undefined' && typeof targetOffsetY !== 'undefined' &&
        typeof minOffsetX !== 'undefined' && typeof maxOffsetX !== 'undefined' &&
        typeof minOffsetY !== 'undefined' && typeof maxOffsetY !== 'undefined') {
        
        let distanceX = 0;
        let distanceY = 0;
        
        if (targetOffsetX < minOffsetX) {
            distanceX = minOffsetX - targetOffsetX;
        } else if (targetOffsetX > maxOffsetX) {
            distanceX = targetOffsetX - maxOffsetX;
        }
        
        if (targetOffsetY < minOffsetY) {
            distanceY = minOffsetY - targetOffsetY;
        } else if (targetOffsetY > maxOffsetY) {
            distanceY = targetOffsetY - maxOffsetY;
        }
        
        // Calculate total distance from bounds
        const totalDistance = Math.max(distanceX, distanceY);
        
        // Map distance to intensity: 0 distance = 1.0x, large distance = 4.0x
        const maxIntensityDistance = 500;
        const normalizedDistance = Math.min(totalDistance / maxIntensityDistance, 1);
        
        // Progressive intensity increase: 1.0x to 4.0x
        grainIntensityMultiplier = 1.0 + Math.pow(normalizedDistance, 0.7) * 3.0;
    }

    // Draw film grain with dynamic opacity
    updateGrain();
    const baseOpacity = 0.4;
    let maxOpacity = 1.0; // Maximum opacity (fully opaque) when far from bounds
    
    // Boost opacity when hovering over elements
    if (isHoveringElement) {
        maxOpacity = 1.0; // Keep at full but apply additional multiplier
        grainIntensityMultiplier *= 1.2; // 20% boost when hovering
    }
    
    const dynamicOpacity = Math.min(baseOpacity * grainIntensityMultiplier, maxOpacity);
    
    grainMainCtx.globalAlpha = dynamicOpacity;
    grainMainCtx.drawImage(grainCanvas, 0, 0, grainWidth, grainHeight);
    grainMainCtx.globalAlpha = 1;

    grainAnimationId = requestAnimationFrame(animateGrain);
}

// ========================================
// WINDOW RESIZE
// ========================================
window.addEventListener("resize", () => {
    grainWidth = window.innerWidth;
    grainHeight = window.innerHeight;
    grainCanvasEl.width = grainWidth;
    grainCanvasEl.height = grainHeight;
});

// ========================================
// PAGE VISIBILITY API
// ========================================
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        isAnimating = false;
        if (grainAnimationId) {
            cancelAnimationFrame(grainAnimationId);
        }
    } else {
        // Only restart if visual effects are enabled
        const visualEffectsEnabled = localStorage.getItem('visualEffectsEnabled') !== 'false';
        if (visualEffectsEnabled) {
            isAnimating = true;
            animateGrain();
        }
    }
});

// ========================================
// SMOOTH FADE OUT ON PAGE UNLOAD
// ========================================
let isUnloading = false;

window.addEventListener('beforeunload', (e) => {
    if (!isUnloading) {
        isUnloading = true;
        document.body.classList.add('unloading');
    }
});

// Detect refresh shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.key === 'r') || 
        (e.metaKey && e.key === 'r') || 
        e.key === 'F5') {
        document.body.classList.add('unloading');
    }
});

// Detect browser back/forward buttons
window.addEventListener('pagehide', () => {
    document.body.classList.add('unloading');
});

// ========================================
// START ANIMATION (only if enabled)
// ========================================
if (shouldStartGrain) {
    animateGrain();
}

