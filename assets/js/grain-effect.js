// ========================================
// GRAIN EFFECT SETUP
// ========================================
const grainCanvasEl = document.getElementById("grainCanvas");
const grainMainCtx = grainCanvasEl.getContext("2d");

let grainWidth = window.innerWidth;
let grainHeight = window.innerHeight;
grainCanvasEl.width = grainWidth;
grainCanvasEl.height = grainHeight;

// ========================================
// FILM GRAIN EFFECT
// ========================================
const grainCanvas = document.createElement('canvas');
const grainCtx = grainCanvas.getContext('2d');
grainCanvas.width = 500;
grainCanvas.height = 300;

let isAnimating = true;
let grainAnimationId = null;

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

    // Draw film grain
    updateGrain();
    grainMainCtx.globalAlpha = 0.4;
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
        isAnimating = true;
        animateGrain();
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
// START ANIMATION
// ========================================
animateGrain();

// ========================================
// SMOOTH PAGE LOAD
// ========================================
window.addEventListener('load', () => {
    document.body.classList.remove('unloading');
});

// Remove unloading class on page show (for back button)
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        document.body.classList.remove('unloading');
        isAnimating = true;
        animateGrain();
    }
});

// Ensure video plays
const bgVideo = document.getElementById('bgVideo');
if (bgVideo) {
    bgVideo.play().catch(err => console.log('Autoplay prevented:', err));
    
    bgVideo.addEventListener('loadeddata', () => {
        bgVideo.play().catch(err => console.log('Video play error:', err));
    });
}