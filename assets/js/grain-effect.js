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

// Detección de dispositivo móvil
const grainIsMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                 window.innerWidth <= 768;

// Función para calcular resolución óptima del grain
function calculateGrainResolution() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isPortrait = screenHeight > screenWidth;
    
    if (grainIsMobile || screenWidth <= 768) {
        // Móviles: usar aspect ratio de la pantalla para mantener proporciones
        const aspectRatio = screenWidth / screenHeight;
        if (isPortrait) {
            // Vertical: mantener aspect ratio
            const baseHeight = 400;
            return {
                width: Math.round(baseHeight * aspectRatio),
                height: baseHeight
            };
        } else {
            // Horizontal: mantener aspect ratio
            const baseWidth = 400;
            return {
                width: baseWidth,
                height: Math.round(baseWidth / aspectRatio)
            };
        }
    } else {
        // PC: resolución original
        const aspectRatio = screenWidth / screenHeight;
        if (aspectRatio > 1.5) {
            // Pantalla ancha
            return { width: 500, height: 300 };
        } else {
            // Pantalla más cuadrada
            return { width: 400, height: 400 };
        }
    }
}

// Configurar resolución inicial
let grainResolution = calculateGrainResolution();
grainCanvas.width = grainResolution.width;
grainCanvas.height = grainResolution.height;


let isAnimating = shouldStartGrain;
let grainAnimationId = null;

// Control de intensidad global para el menú
let grainMenuIntensity = 1.0;
let grainMenuTarget = 1.0;
let grainMenuAnimFrame = null;
const GRAIN_MENU_ANIM_SPEED = 0.08; // 0.05-0.15: menor = más lento

// Track hover state for grain intensity boost
if (typeof window.isHoveringElement === 'undefined') {
    window.isHoveringElement = false;
}
window.addEventListener('tooltipShown', () => {
        window.isHoveringElement = true;
});
window.addEventListener('tooltipHidden', () => {
        window.isHoveringElement = false;
});

// Exponer funciones para controlar la intensidad del grain
window.setGrainMenuIntensity = function(mult) {
    grainMenuTarget = mult;
    animateGrainMenuIntensity();
};
window.resetGrainMenuIntensity = function() {
    grainMenuTarget = 1.0;
    animateGrainMenuIntensity();
};

function animateGrainMenuIntensity() {
    if (grainMenuAnimFrame) cancelAnimationFrame(grainMenuAnimFrame);
    function step() {
        // Interpolación suave
        grainMenuIntensity += (grainMenuTarget - grainMenuIntensity) * GRAIN_MENU_ANIM_SPEED;
        if (Math.abs(grainMenuTarget - grainMenuIntensity) > 0.01) {
            grainMenuAnimFrame = requestAnimationFrame(step);
        } else {
            grainMenuIntensity = grainMenuTarget;
            grainMenuAnimFrame = null;
        }
    }
    step();
}

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

// Pre-allocate reusable ImageData and alpha map to avoid per-frame allocations
let _grainImageData = null;
let _grainAlphaMap = null;
let _grainBuf32 = null;

function prepareGrainBuffers() {
    var w = grainCanvas.width, h = grainCanvas.height;
    _grainImageData = grainCtx.createImageData(w, h);
    _grainAlphaMap = new Uint8Array(w * h);
    _grainBuf32 = new Uint32Array(_grainImageData.data.buffer);

    // Precompute alpha (vignette) — only changes on resize
    var centerX = w / 2, centerY = h / 2;
    var maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
    for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
            var dx = x - centerX, dy = y - centerY;
            var dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
            _grainAlphaMap[y * w + x] = (dist * 100) | 0; // lerp(0,100,dist)
        }
    }
}
prepareGrainBuffers();

function updateGrain() {
    var len = _grainBuf32.length;
    var alphaMap = _grainAlphaMap;
    // Fill using Uint32Array — one write per pixel instead of 4
    // RGBA packed as 0xAABBGGRR (little-endian)
    for (var i = 0; i < len; i++) {
        var val = (Math.random() * 255) | 0;
        _grainBuf32[i] = (alphaMap[i] << 24) | (val << 16) | (val << 8) | val;
    }
    grainCtx.putImageData(_grainImageData, 0, 0);
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}

// ========================================
// ANIMATION LOOP
// ========================================
let lastGrainFrame = 0;
// FPS adaptativo: menor en móviles para mejor rendimiento
const GRAIN_FPS = grainIsMobile ? 15 : 40;

function animateGrain(now) {
    if (!isAnimating) return;
    
    // Throttle to 40 FPS for better performance
    if (now && lastGrainFrame && now - lastGrainFrame < 1000 / GRAIN_FPS) {
        grainAnimationId = requestAnimationFrame(animateGrain);
        return;
    }
    lastGrainFrame = now || performance.now();

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

    // Aplicar el multiplicador global del menú
    grainIntensityMultiplier *= grainMenuIntensity;

    // Draw film grain with dynamic opacity
    updateGrain();
    const baseOpacity = 0.4;
    let maxOpacity = 1.0; // Maximum opacity (fully opaque) when far from bounds
    // Boost opacity when hovering over elements
    if (window.isHoveringElement) {
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
let grainResizeTimeout;
window.addEventListener("resize", () => {
    grainWidth = window.innerWidth;
    grainHeight = window.innerHeight;
    grainCanvasEl.width = grainWidth;
    grainCanvasEl.height = grainHeight;
    
    // Recalcular resolución del grain con debounce para evitar múltiples recalculos
    clearTimeout(grainResizeTimeout);
    grainResizeTimeout = setTimeout(() => {
        const newResolution = calculateGrainResolution();
        if (newResolution.width !== grainCanvas.width || newResolution.height !== grainCanvas.height) {
            grainCanvas.width = newResolution.width;
            grainCanvas.height = newResolution.height;
            grainResolution = newResolution;
            prepareGrainBuffers(); // Rebuild alpha map + ImageData for new size
        }
    }, 250);
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
// BFCACHE RESTORATION - Remove unloading on pageshow
// ========================================
window.addEventListener('pageshow', (e) => {
    if (e.persisted || isUnloading) {
        console.log('[GRAIN] pageshow restauración - removiendo unloading, reiniciando grano');
        isUnloading = false;
        document.body.classList.remove('unloading');
        
        // Reiniciar animación de grano si efectos visuales están habilitados
        const visualEffectsEnabled = localStorage.getItem('visualEffectsEnabled') !== 'false';
        if (visualEffectsEnabled && !isAnimating) {
            isAnimating = true;
            animateGrain();
        }
    }
});

// Exponer función para reiniciar grano desde fuera
window.startGrainAnimation = function() {
    if (!isAnimating) {
        isAnimating = true;
        animateGrain();
    }
};

// ========================================
// START ANIMATION (only if enabled)
// ========================================
if (shouldStartGrain) {
    requestAnimationFrame(animateGrain);
}

// ========================================
// NOTIFY THAT GRAIN IS READY
// ========================================
window.grainEffectReady = true;
try {
    window.dispatchEvent(new Event('grainEffectReady'));
} catch (e) {
    console.error('[GRAIN] Error dispatching grainEffectReady event:', e);
}

