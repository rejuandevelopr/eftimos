// Limita los offsets dentro de los límites definidos
function clampOffset() {
    targetOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, targetOffsetX));
    targetOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, targetOffsetY));
}
// --- PRELOADER LOGIC ---
document.addEventListener('DOMContentLoaded', function() {
    // Referencias a los toggles del preloader
    const soundToggleBtn = document.getElementById('preloaderSoundToggle');
    const visualToggleBtn = document.getElementById('preloaderVisualToggle');

    // Funciones para actualizar iconos en preloader
    function updatePreloaderVisualIcon() {
        const eyeOpen = visualToggleBtn.querySelectorAll('.eye-open');
        const eyeClosed = visualToggleBtn.querySelectorAll('.eye-closed');
        console.log('[PRELOADER] updatePreloaderVisualIcon', { visualEnabled, eyeOpen, eyeClosed });
        if (visualEnabled) {
            eyeOpen.forEach(el => el.style.display = '');
            eyeClosed.forEach(el => el.style.display = 'none');
        } else {
            eyeOpen.forEach(el => el.style.display = 'none');
            eyeClosed.forEach(el => el.style.display = '');
        }
    }
    function updatePreloaderAudioIcon() {
        const speakerOn = soundToggleBtn.querySelectorAll('.speaker-on');
        const speakerOff = soundToggleBtn.querySelectorAll('.speaker-off');
        console.log('[PRELOADER] updatePreloaderAudioIcon', { soundEnabled, speakerOn, speakerOff });
        if (soundEnabled) {
            speakerOn.forEach(el => el.style.display = '');
            speakerOff.forEach(el => el.style.display = 'none');
        } else {
            speakerOn.forEach(el => el.style.display = 'none');
            speakerOff.forEach(el => el.style.display = '');
        }
    }
    window.updatePreloaderVisualIcon = updatePreloaderVisualIcon;
    window.updatePreloaderAudioIcon = updatePreloaderAudioIcon;
    const preloader = document.getElementById('preloader');
    const preloaderBar = document.getElementById('preloaderBar');
    const preloaderBarText = document.getElementById('preloaderBarText');
    const preloaderEnterBtn = document.getElementById('preloaderEnterBtn');
    // soundToggleBtn y visualToggleBtn ahora se declaran dentro de DOMContentLoaded para evitar duplicidad
    // Referencias a los toggles del menú lateral
    const menuVisualToggle = document.getElementById('visualToggle');
    const menuAudioToggle = document.getElementById('audioToggle');
    const notification = document.getElementById('preloaderNotification');
    let soundEnabled = localStorage.getItem('audioEnabled') === 'false' ? false : true;
    let visualEnabled = localStorage.getItem('visualEffectsEnabled') === 'false' ? false : true;
    let loadingComplete = false;

    // Mostrar solo en la primera visita
    if (localStorage.getItem('eftimosPreloaderShown')) {
        preloader.style.display = 'none';
        document.body.classList.remove('preloader-active');
        // Mostrar hamburguesa inmediatamente
        var menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.style.opacity = '1';
            menuToggle.style.pointerEvents = 'auto';
        }
        // Aplicar preferencias guardadas
        window.soundEnabled = localStorage.getItem('audioEnabled') === 'false' ? false : true;
        window.visualEffectsEnabled = localStorage.getItem('visualEffectsEnabled') === 'false' ? false : true;
        document.body.classList.toggle('visual-effects-disabled', !window.visualEffectsEnabled);
        
        // Marcar que el preloader ya fue pasado para permitir funciones de audio
        window.preloaderEnterPressed = true;
        console.log('[AUDIO] Preloader already shown, audio will initialize on first interaction');
        
        return;
    } else {
        preloader.style.display = 'flex';
        document.body.classList.add('preloader-active');
    }

    // Lista de assets a cargar (imágenes, videos, sonidos)
    // Priorizar assets críticos primero
    const assets = [
        'assets/images/logo-white.png',
        'assets/images/g-6.webp', // Imagen central inicial
        'assets/images/g-1.webp',
        'assets/images/g-2.webp',
        'assets/images/g-14.avif',
        'assets/images/g-20.avif'
    ];
    
    // Assets no críticos se cargarán después de mostrar el contenido
    const nonCriticalAssets = [
        'assets/vid/reels-mixed-vid.mp4',
        'assets/sounds/white-noise.mp3',
        'assets/sounds/whispers.mp3',
        'assets/sounds/locked-in-oneself.mp3'
    ];

    let loaded = 0;
    const total = assets.length;

    // Variables para animación suave de la barra y el porcentaje
    let displayedPercent = 0;
    let animatingBar = false;
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    // Fondo difuminado dinámico
    function updatePreloaderBg(percent) {
        // Entre 0.98 y 0.3 de opacidad
        const blur = 0.98 - percent * 0.68 / 100;
        preloader.style.background = `rgba(24,24,24,${blur})`;
    }

    // Notificaciones igual que menú lateral
    function setNotification(type) {
        // Animación y auto-hide igual que el menú lateral
        if (!window._preloaderStatusTimeout) window._preloaderStatusTimeout = null;
        if (!window._preloaderCurrentlyShowingMessage) window._preloaderCurrentlyShowingMessage = false;
        let message = '';
        if (type === 'sound-on') message = 'Sound enabled';
        else if (type === 'sound-off') message = 'Sound disabled';
        else if (type === 'visual-on') message = 'Visual effects enabled';
        else if (type === 'visual-off') message = 'Visual effects disabled';
        else message = '';

        if (window._preloaderStatusTimeout) {
            clearTimeout(window._preloaderStatusTimeout);
        }
        if (window._preloaderCurrentlyShowingMessage) {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.textContent = message;
                if (message) {
                    notification.classList.add('show');
                    window._preloaderCurrentlyShowingMessage = true;
                    window._preloaderStatusTimeout = setTimeout(() => {
                        notification.classList.remove('show');
                        window._preloaderCurrentlyShowingMessage = false;
                    }, 3000);
                } else {
                    window._preloaderCurrentlyShowingMessage = false;
                }
            }, 300);
        } else {
            notification.textContent = message;
            if (message) {
                notification.classList.add('show');
                window._preloaderCurrentlyShowingMessage = true;
                window._preloaderStatusTimeout = setTimeout(() => {
                    notification.classList.remove('show');
                    window._preloaderCurrentlyShowingMessage = false;
                }, 3000);
            } else {
                notification.classList.remove('show');
                window._preloaderCurrentlyShowingMessage = false;
            }
        }
    }

    // Toggles visuales
    // Sincronización de toggles
    function syncMenuToggles() {
        if (menuVisualToggle) {
            if (window.visualEffectsEnabled) {
                menuVisualToggle.classList.add('active');
            } else {
                menuVisualToggle.classList.remove('active');
            }
        }
        if (menuAudioToggle) {
            if (window.audioEnabled) {
                menuAudioToggle.classList.add('active');
            } else {
                menuAudioToggle.classList.remove('active');
            }
        }
        // Actualizar iconos de ambos toggles (preloader y menú)
        if (typeof window.updateVisualIcon === 'function') window.updateVisualIcon();
        if (typeof window.updateAudioIcon === 'function') window.updateAudioIcon();
        if (typeof window.updatePreloaderVisualIcon === 'function') window.updatePreloaderVisualIcon();
        if (typeof window.updatePreloaderAudioIcon === 'function') window.updatePreloaderAudioIcon();
    }

    soundToggleBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        soundEnabled = !soundEnabled;
        window.audioEnabled = soundEnabled;
        localStorage.setItem('audioEnabled', soundEnabled.toString());
        console.log('[PRELOADER] Audio toggled:', soundEnabled);
        setNotification(soundEnabled ? 'sound-on' : 'sound-off');
        window.dispatchEvent(new CustomEvent('audioToggled', {
            detail: { enabled: soundEnabled }
        }));
        // Actualizar iconos de ambos toggles
        if (typeof window.updateAudioIcon === 'function') window.updateAudioIcon();
        if (typeof window.updatePreloaderAudioIcon === 'function') window.updatePreloaderAudioIcon();
        syncMenuToggles();
        
        // Si se activa el audio después de Enter, asegurar reproducción
        if (soundEnabled && window.preloaderEnterPressed) {
            console.log('[PRELOADER] Ensuring white-noise plays after toggle...');
            setTimeout(() => {
                if (typeof window.ensureWhiteNoisePlaying === 'function') {
                    window.ensureWhiteNoisePlaying();
                }
            }, 100);
        }
    });
    visualToggleBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        visualEnabled = !visualEnabled;
        window.visualEffectsEnabled = visualEnabled;
        localStorage.setItem('visualEffectsEnabled', visualEnabled);
        setNotification(visualEnabled ? 'visual-on' : 'visual-off');
        window.dispatchEvent(new Event('visualEffectsToggled'));
        // Actualizar iconos de ambos toggles
        if (typeof window.updateVisualIcon === 'function') window.updateVisualIcon();
        if (typeof window.updatePreloaderVisualIcon === 'function') window.updatePreloaderVisualIcon();
        syncMenuToggles();
    });

    // Escuchar cambios desde el menú lateral y actualizar preloader
    window.addEventListener('visualEffectsToggled', function() {
        visualEnabled = window.visualEffectsEnabled;
        syncMenuToggles();
    });
    window.addEventListener('audioToggled', function() {
        soundEnabled = window.audioEnabled;
        syncMenuToggles();
    });

    // Inicializar estado visual/audio en ambos toggles
    syncMenuToggles();

    function updateBar() {
        const percent = Math.round((loaded / total) * 100);
        if (!animatingBar) {
            animatingBar = true;
            animateBar(percent);
        }
    }

    function animateBar(targetPercent) {
        // Suaviza el valor mostrado
        displayedPercent = lerp(displayedPercent, targetPercent, 0.18);
        // Si está muy cerca, lo iguala
        if (Math.abs(displayedPercent - targetPercent) < 0.5) displayedPercent = targetPercent;
        preloaderBar.style.width = displayedPercent + '%';
        preloaderBarText.textContent = Math.round(displayedPercent) + '%';
        updatePreloaderBg(displayedPercent);
        const preloaderBarContainer = document.querySelector('.preloader-bar-container');
        // Permitir avanzar aunque no se llegue a 100% después de cierto tiempo
        if ((targetPercent >= 100 && displayedPercent >= 100 && !loadingComplete) || (loaded >= total && !loadingComplete)) {
            loadingComplete = true;
            // Agregar clase 'loaded' al preloader para hacerlo translúcido
            preloader.classList.add('loaded');
            preloaderBar.classList.add('hide');
            preloaderBarText.classList.add('hide');
            if (preloaderBarContainer) preloaderBarContainer.style.display = 'none';
            setTimeout(() => {
                preloaderEnterBtn.textContent = 'Enter';
                preloaderEnterBtn.classList.add('show');
                preloaderEnterBtn.disabled = false;
                preloaderEnterBtn.style.display = 'flex';
            }, 500);
            animatingBar = false;
        } else if (targetPercent < 100 && loaded < total) {
            loadingComplete = false;
            preloaderBar.classList.remove('hide');
            preloaderBarText.classList.remove('hide');
            if (preloaderBarContainer) preloaderBarContainer.style.display = '';
            preloaderEnterBtn.classList.remove('show');
            preloaderEnterBtn.disabled = true;
            preloaderEnterBtn.style.display = 'none';
        }
        if (displayedPercent !== targetPercent) {
            requestAnimationFrame(() => animateBar(targetPercent));
        } else {
            // Si por algún motivo no se llegó a 100% pero ya se intentó cargar todo, permitir avanzar
            if (!loadingComplete && loaded >= total) {
                loadingComplete = true;
                // Agregar clase 'loaded' al preloader para hacerlo translúcido
                preloader.classList.add('loaded');
                preloaderBar.classList.add('hide');
                preloaderBarText.classList.add('hide');
                if (preloaderBarContainer) preloaderBarContainer.style.display = 'none';
                setTimeout(() => {
                    preloaderEnterBtn.textContent = 'Enter';
                    preloaderEnterBtn.classList.add('show');
                    preloaderEnterBtn.disabled = false;
                    preloaderEnterBtn.style.display = 'flex';
                }, 500);
            }
            animatingBar = false;
        }
    }

    function assetLoaded() {
        loaded++;
        updateBar();
    }

    // Cargar imágenes críticas primero
    assets.forEach(src => {
        if (src.endsWith('.mp3')) {
            const audio = new Audio();
            audio.src = src;
            audio.preload = 'auto';
            audio.addEventListener('canplaythrough', assetLoaded, { once: true });
            audio.addEventListener('error', assetLoaded, { once: true });
        } else if (src.endsWith('.mp4')) {
            const video = document.createElement('video');
            video.src = src;
            video.preload = 'auto';
            video.addEventListener('canplaythrough', assetLoaded, { once: true });
            video.addEventListener('error', assetLoaded, { once: true });
        } else {
            const img = new Image();
            img.src = src;
            img.onload = assetLoaded;
            img.onerror = assetLoaded;
        }
    });
    
    // Lazy load de assets no críticos después de que el usuario entre
    function loadNonCriticalAssets() {
        nonCriticalAssets.forEach(src => {
            if (src.endsWith('.mp3')) {
                const audio = new Audio();
                audio.src = src;
                audio.preload = 'auto';
            } else if (src.endsWith('.mp4')) {
                const video = document.createElement('video');
                video.src = src;
                video.preload = 'auto';
            }
        });
    }

    // Mostrar solo en la primera visita
    if (localStorage.getItem('eftimosPreloaderShown')) {
        preloader.style.display = 'none';
        document.body.classList.remove('preloader-active');
        // Aplicar preferencias guardadas
        window.soundEnabled = localStorage.getItem('eftimosSoundEnabled') !== '0';
        window.visualEffectsEnabled = localStorage.getItem('eftimosVisualEnabled') !== '0';
        document.body.classList.toggle('visual-effects-disabled', !window.visualEffectsEnabled);
        return;
    } else {
        preloader.style.display = 'flex';
        document.body.classList.add('preloader-active');
    }

    // El event listener del botón Enter está en index.html para evitar conflictos de timing
    // y asegurar que la animación se ejecute correctamente
    /*
    preloaderEnterBtn.addEventListener('click', function() {
        // Establecer flag para permitir audio
        window.preloaderEnterPressed = true;
        preloaderEnterPressed = true;
        
        // Animar el fondo y el logo al mismo tiempo
        preloader.classList.add('preloader-fade-bg');
        var preloaderLogo = document.querySelector('.preloader-logo img');
        if (preloaderLogo) {
            preloaderLogo.classList.add('preloader-logo-ascend');
        }
        // Mostrar hamburguesa con transición sutil
        var menuToggle = document.getElementById('menuToggle');
        var sharedLogo = document.getElementById('sharedLogo');
        if (menuToggle) {
            menuToggle.style.opacity = '1';
            menuToggle.style.pointerEvents = 'auto';
        }
        if (sharedLogo) {
            sharedLogo.style.opacity = '1';
            sharedLogo.style.transition = 'opacity 0.7s cubic-bezier(.77,0,.18,1)';
        }
        // Hacer visible la upper bar antes, tras iniciar animaciones
        setTimeout(() => {
            document.body.classList.remove('preloader-active'); // Upper bar fade-in
        }, 100);
        // Agregar clase preloader-hide inmediatamente para iniciar fade-out
        setTimeout(() => {
            preloader.classList.add('preloader-hide');
        }, 100);
        // Esperar a que termine la animación antes de ocultar completamente
        setTimeout(() => {
            preloader.style.display = 'none';
            localStorage.setItem('eftimosPreloaderShown', '1');
            // Aplicar preferencias
            window.soundEnabled = soundEnabled;
            window.visualEffectsEnabled = visualEnabled;
            document.body.classList.toggle('visual-effects-disabled', !window.visualEffectsEnabled);
            window.dispatchEvent(new Event('preloaderFinished'));
            
            // Cargar assets no críticos después de entrar
            setTimeout(loadNonCriticalAssets, 500);
        }, 700);
    });
    */
});
// --- FIN PRELOADER LOGIC ---

// --- Motion Blur Direccional DOM ---
let lastOffsetX = 0, lastOffsetY = 0;
let lastBlur = 0;
function updateMotionBlurDOM() {
    if (window.visualEffectsEnabled === false) {
        document.body.classList.remove('motion-blur-dom');
        document.querySelectorAll('.image-container').forEach(el => {
            el.style.filter = '';
        });
        return;
    }
    document.body.classList.add('motion-blur-dom');
    const dx = Math.abs(offsetX - lastOffsetX);
    const dy = Math.abs(offsetY - lastOffsetY);
    let blur = Math.min(12, Math.max(dx, dy) * 0.7);
    blur = (blur + lastBlur * 2) / 3;
    lastBlur = blur;
    document.querySelectorAll('.image-container').forEach(el => {
        el.style.filter = blur > 0.5 ? `blur(${blur.toFixed(1)}px)` : '';
    });
    lastOffsetX = offsetX;
    lastOffsetY = offsetY;
}
const canvas = document.getElementById('canvas');
let mapGroup = document.getElementById('map-group');
if (!mapGroup) {
    mapGroup = document.createElement('div');
    mapGroup.id = 'map-group';
    mapGroup.style.width = '100%';
    mapGroup.style.height = '100%';
    mapGroup.style.position = 'absolute';
    mapGroup.style.top = '0';
    mapGroup.style.left = '0';
    canvas.appendChild(mapGroup);
}

// Responsive settings function
function getResponsiveSettings() {
    const width = window.innerWidth;
    
    // Mobile portrait
    if (width < 576) {
        return { gridSpacing: 350, imageSize: 150, blurRadius: 150, gridColumns: 2 };
    }
    // Mobile landscape / Small tablets
    else if (width < 768) {
        return { gridSpacing: 380, imageSize: 160, blurRadius: 170, gridColumns: 2 };
    }
    // Tablets portrait
    else if (width < 992) {
        return { gridSpacing: 400, imageSize: 165, blurRadius: 185, gridColumns: 3 };
    }
    // Desktop (mantener la configuración actual para escritorio)
    else {
        return { gridSpacing: 420, imageSize: 170, blurRadius: 200, gridColumns: 3 };
    }
}

// Initialize responsive settings
let settings = getResponsiveSettings();
let gridSpacing = settings.gridSpacing;
let imageSize = settings.imageSize;
let blurRadius = settings.blurRadius;
let gridColumns = settings.gridColumns;

// Zoom inicial: 20% del máximo
window.scale = 0.2 * window.maxScale + 0.8 * window.minScale;
window.targetScale = window.scale;

// Al cargar, centrar y alejar el mapa
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof getInitialCenterPosition === 'function') {
            const pos = getInitialCenterPosition();
            offsetX = pos.x;
            offsetY = pos.y;
            targetOffsetX = pos.x;
            targetOffsetY = pos.y;
        }
        window.scale = 0.2 * window.maxScale + 0.8 * window.minScale;
        window.targetScale = window.scale;
    }, 120);
});

const maxBlur = 8;
const randomOffsetRange = 150;
const bufferPercent = 0.15; // Más buffer para que los elementos no queden cerca del borde
const smoothness = 0.08;
const friction = 0;
const minVelocity = 0.1;

window.scale = 1;
window.targetScale = 1;
window.minScale = 0.4;
window.maxScale = 1.2;
window.zoomSpeed = 0.1;
window.zoomSmoothness = 0.15;

const imageTemplates = document.querySelectorAll('#image-templates .image-template');
// Build baseImages defensively: support image and video templates
const baseImages = Array.from(imageTemplates).map(template => {
    const img = template.querySelector('img');
    if (img) {
        return { type: 'image', src: img.src || '', alt: img.alt || '' };
    }
    const vid = template.querySelector('video');
    if (vid) {
        // try to get source from <source> or from video.src
        const sourceEl = vid.querySelector('source');
        const src = (sourceEl && sourceEl.src) ? sourceEl.src : (vid.currentSrc || vid.src || '');
        return { type: 'video', src: src, alt: '' };
    }
    return { type: 'unknown', src: '', alt: '' };
});

const totalImages = baseImages.length;
let gridRows = Math.ceil(totalImages / gridColumns);

let windowWidth = window.innerWidth;
let windowHeight = window.innerHeight;
let centerX = windowWidth / 2;
let centerY = windowHeight / 2;

let bufferX = windowWidth * bufferPercent;
let bufferY = windowHeight * bufferPercent;

let contentWidth = (gridColumns - 1) * gridSpacing;
let contentHeight = (gridRows - 1) * gridSpacing;

let minOffsetX = -contentWidth - bufferX;
let maxOffsetX = bufferX;
let minOffsetY = -contentHeight - bufferY;
let maxOffsetY = bufferY;

// Make map bounds globally accessible for controls.js audio intensification
window.minOffsetX = minOffsetX;
window.maxOffsetX = maxOffsetX;
window.minOffsetY = minOffsetY;
window.maxOffsetY = maxOffsetY;

let offsetX = 0;
let offsetY = 0;
let targetOffsetX = 0;
let targetOffsetY = 0;

// Make offset globally accessible for controls.js audio intensification
window.targetOffsetX = targetOffsetX;
window.targetOffsetY = targetOffsetY;
let velocityX = 0;
let velocityY = 0;
let isDragging = false;
let lastX, lastY;
let images = [];

let blurRadiusScaled = blurRadius * scale;

// Grid mode variables (must be declared early)
let isGridMode = false;
let gridModePositions = [];
let gridModeTransitioning = false;

// Radial blur effect around focused element
let focusedElementPos = null;
let focusedElementRadius = 200; // Radius around element where blur is reduced

// Track menu state for blur override
let isMenuActive = false;
// Expose to window for controls.js
window.isMenuActive = isMenuActive;

window.addEventListener('elementFocused', (e) => {
    focusedElementPos = e.detail;
});

window.addEventListener('elementUnfocused', () => {
    focusedElementPos = null;

// Background video opacity on focus
const videosBackground = document.getElementById('videos-background');

window.addEventListener('elementFocused', () => {
    if (videosBackground) {
        videosBackground.classList.add('focused-active');
    }
});

window.addEventListener('elementUnfocused', () => {
    if (videosBackground) {
        videosBackground.classList.remove('focused-active');
    }
});
});

function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

const randomOffsets = new Map();
function getRandomOffset(gridX, gridY) {
    const key = `${gridX},${gridY}`;
    if (!randomOffsets.has(key)) {
        const seedX = gridX * 1000 + gridY;
        const seedY = gridX * 500 + gridY * 1500;
        
        randomOffsets.set(key, {
            x: (seededRandom(seedX) - 0.5) * randomOffsetRange,
            y: (seededRandom(seedY) - 0.5) * randomOffsetRange
        });
    }
    return randomOffsets.get(key);
}

function createImageElement(imageIndex, gridX, gridY) {
    const container = document.createElement('div');
    container.className = 'image-container';

    const template = imageTemplates[imageIndex];
    const clonedContent = template.cloneNode(true);
    
    // Check if it's a reveal text template
    if (template.classList.contains('reveal-text-template')) {
        container.classList.add('reveal-text-template');
        container.dataset.text = template.dataset.text || 'HIDDEN TEXT';
    }
    
    container.appendChild(clonedContent.firstElementChild);

    mapGroup.appendChild(container);

    return {
        element: container,
        gridX: gridX,
        gridY: gridY,
        imageIndex: imageIndex
    };
}

function createAllImages() {
    images.forEach(img => {
        if (img.element && img.element.parentNode) {
            img.element.parentNode.removeChild(img.element);
        }
    });
    images = [];
    
    let imageIndex = 0;

    for (let y = 0; y < gridRows; y++) {
        const imagesInThisRow = Math.min(gridColumns, totalImages - (y * gridColumns));
        const isLastRow = (y === gridRows - 1);

        const rowOffset = (isLastRow && imagesInThisRow < gridColumns)
            ? (gridColumns - imagesInThisRow) / 2
            : 0;

        for (let x = 0; x < imagesInThisRow; x++) {
            if (imageIndex < baseImages.length) {
                const gridX = x + rowOffset;
                const imgElement = createImageElement(imageIndex, gridX, y);
                // Mark if it's a reveal-text element (visual effect only)
                imgElement.isVisualEffect = imageTemplates[imageIndex].classList.contains('reveal-text-template');
                images.push(imgElement);
                imageIndex++;
            }
        }
    }
}

function getInitialCenterPosition() {
    if (images.length === 0) {
        return { x: 0, y: 0 };
    }
    // Centrar el grupo de imágenes en el centro de la superficie navegable
    // Calcula el centro del grupo
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    images.forEach(img => {
        const randomOffset = getRandomOffset(img.gridX, img.gridY);
        const x = img.gridX * gridSpacing + randomOffset.x;
        const y = img.gridY * gridSpacing + randomOffset.y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    });
    const groupCenterX = (minX + maxX) / 2;
    const groupCenterY = (minY + maxY) / 2;
    return {
        x: -groupCenterX,
        y: -groupCenterY
    };
}

// Elastic boundaries with progressive resistance
function applyElasticResistance(pos, min, max) {
    if (pos < min) {
        const distance = min - pos;
        const resistance = resistanceFunc(distance);
        return min - resistance;
    } else if (pos > max) {
        const distance = pos - max;
        const resistance = resistanceFunc(distance);
        return max + resistance;
    }
    return pos;
}

function resistanceFunc(distance) {
    const threshold = 50;
    if (distance < threshold) {
        return distance * 0.4;  // 40% resistance for small distances
    } else {
        // Much stronger progressive resistance after threshold
        return threshold * 0.4 + Math.pow(distance - threshold, 0.65) * 0.2;
    }
}

    function closeCinema() {
    targetOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, targetOffsetX));
    targetOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, targetOffsetY));
}

// ✨ OPTIMIZED: Using transform3d for GPU acceleration (30-40% smoother!)
// Utility: Check if an image is 100% centered (focused) on screen
function isImageCentered(x, y, imageSizeScaled) {
    // Consider centered if the image center is within a small threshold of the screen center
    const threshold = imageSizeScaled * 0.35; // 35% of image size
    const dx = x - centerX;

        // --- NUEVO: Forzar reposicionamiento del mapa según cámara en mano ---
        if (typeof window.setHandheldCameraShake === 'function') {
            // Reactiva el efecto de cámara en mano para que el mapa/video se reposicione correctamente
            window.setHandheldCameraShake(true);
        }

    const dy = y - centerY;
    return Math.abs(dx) < threshold && Math.abs(dy) < threshold;
}

function updateImagePositions() {
    // Skip normal positioning if in grid mode
    if (isGridMode || gridModeTransitioning) {
        return;
    }
    
    const offsetXScaled = offsetX * scale;
    const offsetYScaled = offsetY * scale;
    const imageSizeScaled = imageSize * scale;
    const imageSizeScaledHalf = imageSizeScaled / 2;
    const blurThreshold = blurRadiusScaled;
    
    const len = images.length;
        for (let i = 0; i < len; i++) {
            // --- Fade out trail on zoom ---
            if (window.fadeOutTrail) window.fadeOutTrail();
            // Limpiar suavemente el trail solo si hay cambio de zoom
            if (window.smoothClearTrail) window.smoothClearTrail();
        const img = images[i];
        const randomOffset = getRandomOffset(img.gridX, img.gridY);

        const baseX = img.gridX * gridSpacing + randomOffset.x;
        const baseY = img.gridY * gridSpacing + randomOffset.y;

        const x = baseX * scale + offsetXScaled + centerX;
        const y = baseY * scale + offsetYScaled + centerY;

        const element = img.element;
        const style = element.style;

        // ✨ NEW: Use transform3d instead of left/top for GPU acceleration
        const translateX = x - imageSizeScaledHalf;
        const translateY = y - imageSizeScaledHalf;
        style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;

        // Calculate blur distance from center
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let blur = 0;

        // --- MOBILE TOOLTIP & COLOR LOGIC ---
        const isMobile = window.innerWidth <= 900 || /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
        const imageLink = element.querySelector('.image-link');
        const imgTag = imageLink ? imageLink.querySelector('img') : null;
        const tooltip = element.querySelector('.tooltip');

        if (isMobile && imageLink && imgTag && tooltip) {
            if (isImageCentered(x, y, imageSizeScaled)) {
                // Show tooltip and colorize image
                tooltip.style.opacity = '1';
                tooltip.style.visibility = 'visible';
                imgTag.style.filter = 'none';
                imgTag.style.webkitFilter = 'none';
                imgTag.classList.add('focused-mobile');
            } else {
                tooltip.style.opacity = '';
                tooltip.style.visibility = '';
                imgTag.style.filter = 'grayscale(1)';
                imgTag.style.webkitFilter = 'grayscale(1)';
                imgTag.classList.remove('focused-mobile');
            }
        }

        // PRIORITY 1: If menu is active, blur all elements
        if (window.isMenuActive) {
            blur = maxBlur;
        }
        // PRIORITY 2: Only apply blur if visual effects are enabled
        else if (window.visualEffectsEnabled !== false) {
            if (distance > blurThreshold) {
                blur = Math.min(maxBlur, (distance - blurThreshold) / 100 * maxBlur);
            }

            // Apply radial blur reduction around focused element
            if (focusedElementPos) {
                const distToFocused = Math.sqrt(
                    Math.pow(x - focusedElementPos.x, 2) +
                    Math.pow(y - focusedElementPos.y, 2)
                );

                // If within focused radius, reduce blur based on proximity
                if (distToFocused < focusedElementRadius) {
                    // Calculate reduction factor (1 = no blur, 0 = full blur)
                    const reductionFactor = 1 - (distToFocused / focusedElementRadius);
                    blur = blur * 0// (1 - reductionFactor * 0.8); // Reduce up to 80% of blur
                }
            }
        }

        style.filter = `blur(${blur}px)`;
    }
}

function animate() {
    // Keep global window references updated for audio intensification
    window.targetOffsetX = targetOffsetX;
    window.targetOffsetY = targetOffsetY;
    
    if (!isDragging && !reboundAnimationActive) {
        const diffX = targetOffsetX - offsetX;
        const diffY = targetOffsetY - offsetY;
        
        offsetX += diffX * smoothness;
        offsetY += diffY * smoothness;

        const absVelocityX = Math.abs(velocityX);
        const absVelocityY = Math.abs(velocityY);
        
        if (absVelocityX > minVelocity || absVelocityY > minVelocity) {
            targetOffsetX += velocityX;
            targetOffsetY += velocityY;
            // Don't clamp - let velocity carry beyond bounds, then rebound will handle it
            velocityX *= friction;
            velocityY *= friction;
        }
    }

    // Audio intensity is now handled by controls.js based on distance from bounds

    const diffScale = targetScale - scale;
    
    // Only apply zoom and blur if visual effects are enabled
        if (window.visualEffectsEnabled !== false) {
            // --- Fade out trail on pinch zoom ---
            if (window.fadeOutTrail) window.fadeOutTrail();
        scale += diffScale * zoomSmoothness;
    } else {
        // When visual effects are disabled, reset scale to 1
        scale = 1;
        targetScale = 1;
    }

    // Apply blur only if visual effects are enabled
    const effectiveBlurRadius = (window.visualEffectsEnabled !== false) ? blurRadius : 0;
    blurRadiusScaled = effectiveBlurRadius * scale;

    updateMotionBlurDOM();
    updateImagePositions();
    requestAnimationFrame(animate);
}

// Rebound animation when releasing outside bounds
let reboundAnimationActive = false;

function animateReboundIfNeeded() {
    // Check if we're outside bounds
    if (targetOffsetX < minOffsetX || targetOffsetX > maxOffsetX ||
        targetOffsetY < minOffsetY || targetOffsetY > maxOffsetY) {
        
        const fromX = targetOffsetX;
        const fromY = targetOffsetY;
        const toX = Math.max(minOffsetX, Math.min(maxOffsetX, targetOffsetX));
        const toY = Math.max(minOffsetY, Math.min(maxOffsetY, targetOffsetY));
        
        animateRebound(fromX, toX, fromY, toY);
    }
}

function animateRebound(fromX, toX, fromY, toY) {
    if (reboundAnimationActive) return;
    
    // Cancel any existing velocity
    velocityX = 0;
    velocityY = 0;
    
    reboundAnimationActive = true;
    const duration = 400; // ms
    const startTime = performance.now();

    function step(now) {
        const elapsed = now - startTime;
        let t = Math.min(elapsed / duration, 1);

        // Easing easeOutCubic for smooth bounce
        let ease = 1 - Math.pow(1 - t, 3);

        targetOffsetX = fromX + (toX - fromX) * ease;
        targetOffsetY = fromY + (toY - fromY) * ease;
        
        offsetX = targetOffsetX;
        offsetY = targetOffsetY;

        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            targetOffsetX = toX;
            targetOffsetY = toY;
            offsetX = toX;
            offsetY = toY;
            reboundAnimationActive = false;
        }
    }
    
    requestAnimationFrame(step);
}

let dragStartX = 0;
let dragStartY = 0;
let hasMoved = false;

let isPinching = false;
let initialPinchDistance = 0;
let initialPinchScale = 1;

function getTouchDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getTouchMidpoint(touch1, touch2) {
    return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
    };
}

canvas.addEventListener('mousedown', (e) => {
    // Disable dragging in grid mode
    if (isGridMode) return;
    
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    hasMoved = false;
    velocityX = 0;
    velocityY = 0;
    canvas.classList.add('dragging');
    
    // Inicializar audio si está habilitado y no se ha inicializado
    const audioEnabled = localStorage.getItem('audioEnabled') !== 'false';
    if (audioEnabled && typeof window.initializeAudio === 'function') {
        window.initializeAudio();
    }
    
    // Verificar y asegurar reproducción de white-noise en cada drag
    if (typeof window.ensureWhiteNoisePlaying === 'function') {
        window.ensureWhiteNoisePlaying();
    }
        // Desactiva la modulación de whispers con transición suave
    if (window.whispersModulationEnabled !== undefined) {
        // Suaviza el paso a modulación off
        if (typeof window.setWhispersModulationEnabled === 'function') {
            window.setWhispersModulationEnabled(false, 400);
        } else {
            window.whispersModulationEnabled = false;
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastX;
    const deltaY = e.clientY - lastY;

    const totalMoveX = Math.abs(e.clientX - dragStartX);
    const totalMoveY = Math.abs(e.clientY - dragStartY);
    if (totalMoveX > 5 || totalMoveY > 5) {
        hasMoved = true;
        
        // Verificar audio cuando empieza el movimiento real
        if (typeof window.ensureWhiteNoisePlaying === 'function') {
            window.ensureWhiteNoisePlaying();
        }
    }

    const scaleInv = 1 / scale;
    
    // Calculate resistance factor based on how far outside bounds we are
    let resistanceFactorX = 1.0;
    let resistanceFactorY = 1.0;
    
    if (targetOffsetX < minOffsetX) {
        const distance = minOffsetX - targetOffsetX;
        resistanceFactorX = 1.0 / (1.0 + distance * 0.01); // Progressive resistance
    } else if (targetOffsetX > maxOffsetX) {
        const distance = targetOffsetX - maxOffsetX;
        resistanceFactorX = 1.0 / (1.0 + distance * 0.01);
    }
    
    if (targetOffsetY < minOffsetY) {
        const distance = minOffsetY - targetOffsetY;
        resistanceFactorY = 1.0 / (1.0 + distance * 0.01);
    } else if (targetOffsetY > maxOffsetY) {
        const distance = targetOffsetY - maxOffsetY;
        resistanceFactorY = 1.0 / (1.0 + distance * 0.01);
    }
    
    // Apply resistance to movement delta, not to position
    targetOffsetX += deltaX * scaleInv * resistanceFactorX;
    targetOffsetY += deltaY * scaleInv * resistanceFactorY;
    
    // Suaviza el movimiento durante el drag, pero mantiene responsividad
    // offsetX/Y se acercan rápidamente a targetOffsetX/Y (lerp)
    const lerpFactor = 0.25; // Más suavidad (más bajo = más suave)
    offsetX += (targetOffsetX - offsetX) * lerpFactor;
    offsetY += (targetOffsetY - offsetY) * lerpFactor;

    velocityX = deltaX * scaleInv * 0.8;
    velocityY = deltaY * scaleInv * 0.8;

    // --- Pitch dinámico white-noise ---
    // Calcula la velocidad total del drag
    const dragSpeed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
    // Pitch dinámico (playbackRate)
    const minPitch = 0.7;
    const maxPitch = 2.0;
    const maxSpeed = 30;
    let targetPitch = minPitch + Math.min(dragSpeed / maxSpeed, 1) * (maxPitch - minPitch);
    if (!window._noisePitch) window._noisePitch = minPitch;
    window._noisePitch += (targetPitch - window._noisePitch) * 0.15;
    // Aplica el pitch al white-noise y whispers
    const noiseSound = document.getElementById('noiseSound');
    const whispersSound = document.getElementById('whispersSound');
    if (noiseSound) {
        noiseSound.playbackRate = window._noisePitch;
    }
    if (whispersSound) {
        whispersSound.playbackRate = window._noisePitch;
    }

    // Sincroniza el filtro low pass con el drag visual (trail)
    window.addEventListener('dragTrailStarted', () => {
        if (window.setLowPassFilter) {
            window.setLowPassFilter(1200, 20); // ultra responsivo
        }
    });
    window.addEventListener('dragTrailEnded', () => {
        if (window.restoreLowPassFilter) {
            window.restoreLowPassFilter(180); // restauración rápida
        }
        // Reproducir sonido de drag end
        if (window.playUISound) {
            window.playUISound('dragEnd');
        }
    });

    lastX = e.clientX;
    lastY = e.clientY;
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.classList.remove('dragging');
    // Restaura el filtro low pass igual que menú lateral
    if (window.restoreLowPassFilter) {
        window.restoreLowPassFilter(900);
    }
    // Restaura el pitch del white-noise y whispers suavemente
    const noiseSound = document.getElementById('noiseSound');
    const whispersSound = document.getElementById('whispersSound');
    const restorePitch = () => {
        if (!window._noisePitch) window._noisePitch = 1.0;
        window._noisePitch += (1.0 - window._noisePitch) * 0.12;
        if (noiseSound) noiseSound.playbackRate = window._noisePitch;
        if (whispersSound) whispersSound.playbackRate = window._noisePitch;
        if (Math.abs(window._noisePitch - 1.0) > 0.01) {
            requestAnimationFrame(restorePitch);
        } else {
            window._noisePitch = 1.0;
            if (noiseSound) noiseSound.playbackRate = 1.0;
            if (whispersSound) whispersSound.playbackRate = 1.0;
        }
    };
    restorePitch();
    // Restaura la modulación de whispers con transición suave
    if (window.whispersModulationEnabled !== undefined) {
        if (typeof window.setWhispersModulationEnabled === 'function') {
            window.setWhispersModulationEnabled(true, 600);
        } else {
            window.whispersModulationEnabled = true;
        }
    }
    // Animate rebound when user releases drag
    animateReboundIfNeeded();
});

canvas.addEventListener('mouseleave', () => {
    if (isDragging) {
        isDragging = false;
        canvas.classList.remove('dragging');
        // Animate rebound when user releases drag
        animateReboundIfNeeded();
    }
});

// ========================================
// 🎬 MORPH TRANSITION + CINEMA MODE
// ========================================
canvas.addEventListener('click', (e) => {
    // Verificar y asegurar reproducción de white-noise en cada click
    if (typeof window.ensureWhiteNoisePlaying === 'function') {
        window.ensureWhiteNoisePlaying();
    }
    
    // Detect image links (navigate) and inline video links (open cinema mode)
    let link = e.target.closest('.image-link');
    if (!link && e.target.classList.contains('image-container')) {
        link = e.target.querySelector('.image-link');
    }

    let videoLink = e.target.closest('.video-link');
    if (!videoLink && e.target.classList.contains('image-container')) {
        videoLink = e.target.querySelector('.video-link');
    }

    // If clicked a video tile (and it wasn't a drag), open Cinema Mode
    if (videoLink && !hasMoved) {
        e.preventDefault();
        e.stopPropagation();
        const vid = videoLink.querySelector('video');
        if (vid) {
            const container = e.target.closest('.image-container');
            createCinemaMode(vid, container);
        }
        hasMoved = false;
        return;
    }

    // Existing image link click -> morph transition
    if (link && hasMoved) {
        e.preventDefault();
        e.stopPropagation();
    } else if (link && !hasMoved) {
        // Prevent default navigation
        e.preventDefault();
        e.stopPropagation();

        // Trigger morph transition
        const img = link.querySelector('img');
        const targetUrl = link.getAttribute('href');

        if (img && targetUrl) {
            createMorphTransition(img, targetUrl);
        }
    }

    hasMoved = false;
});

function createMorphTransition(originalImg, targetUrl) {
    // FADE OUT INMEDIATO de sonidos ambientales (lo primero que ocurre)
    if (typeof window.fadeOutAmbientSounds === 'function') {
        window.fadeOutAmbientSounds(200); // 200ms fade out con pitch shift
    }
    
    // Get the image's current position on screen
    const rect = originalImg.getBoundingClientRect();
    
    // Store transition data for the next page
    const transitionData = {
        imageSrc: originalImg.src,
        startX: rect.left,
        startY: rect.top,
        startWidth: rect.width,
        startHeight: rect.height,
        targetUrl: targetUrl,
        // Store canvas position to restore later
        canvasOffsetX: offsetX,
        canvasOffsetY: offsetY,
        canvasScale: scale
    };
    
    sessionStorage.setItem('morphTransition', JSON.stringify(transitionData));
    
    // Create a clone that will morph
    const clone = originalImg.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.left = rect.left + 'px';
    clone.style.top = rect.top + 'px';
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    clone.style.zIndex = '99999';
    clone.style.objectFit = 'contain';
    clone.style.pointerEvents = 'none';
    clone.style.transition = 'none';
    
    document.body.appendChild(clone);
    
    // Fade out other content
    document.body.classList.add('morphing');
    
    // Create and fade in a dark dim overlay immediately so background darkens
    let dim = document.getElementById('dimOverlay');
    if (!dim) {
        dim = document.createElement('div');
        dim.id = 'dimOverlay';
        document.body.appendChild(dim);
    }
    dim.style.position = 'fixed';
    dim.style.inset = '0';
    dim.style.background = 'rgba(0,0,0,1)';
    dim.style.opacity = '0';
    dim.style.pointerEvents = 'none';
    dim.style.transition = 'opacity 0.28s ease';
    dim.style.zIndex = '99998';

    // Fade dim overlay in to darken everything except the cloned image
    requestAnimationFrame(() => {
        dim.style.opacity = '0.65';
    });

    // Trigger the morph animation of the clone
    requestAnimationFrame(() => {
        clone.style.transition = 'all 0.8s cubic-bezier(0.76, 0, 0.24, 1)';
        clone.style.left = '0px';
        clone.style.top = '0px';
        clone.style.width = '100vw';
        clone.style.height = '100vh';
    });

    // Prepare black overlay (not white) for fade
    let overlay = document.getElementById('transitionOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'transitionOverlay';
        document.body.appendChild(overlay);
    }
    overlay.style.zIndex = '250000'; // Asegura que cubre la upper bar y todo el contenido
    overlay.style.pointerEvents = 'none';
    overlay.style.transition = 'opacity 0.45s ease';
    overlay.style.opacity = '0';
    overlay.style.background = '#fff'; // Cambia a blanco sólido

    const overlayFadeDuration = 120; // ms, aún más rápido

    let cloneDone = false;
    let soundDone = false;
    let overlayStarted = false;

    function startOverlayFade() {
        if (overlayStarted) return;
        overlayStarted = true;
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });
    }

    // When both clone animation and sound have completed, navigate after overlay fade completes
    function tryNavigateAfterReady() {
        if (!overlayStarted) return; // wait until overlay becomes visible
        // wait for overlay fade to finish then navigate (aún más rápido)
        setTimeout(() => {
            window.location.href = targetUrl;
        }, Math.max(overlayFadeDuration - 60, 40));
    }

    // Listen for clone transition end to start overlay fade
    const onCloneTransitionEnd = () => {
        cloneDone = true;
        startOverlayFade();
        // If sound already finished, navigate after overlay completes
        if (soundDone) tryNavigateAfterReady();
    };
    clone.addEventListener('transitionend', onCloneTransitionEnd, { once: true });

    // Safety: if transitionend doesn't fire within expected time, force overlay start
    setTimeout(() => {
        if (!cloneDone) {
            cloneDone = true;
            startOverlayFade();
        }
    }, 1200);

    // Play locked-in sound (if available) SOONER and at 1.5x speed for transition
    const locked = document.getElementById('lockedInSound');
    if (locked) {
        try {
            locked.pause();
            locked.currentTime = 0;
            locked.playbackRate = 1.5;
            // Start sound IMMEDIATELY, not after clone
            const playPromise = locked.play();
            playPromise.then(() => {
                const onEnded = () => {
                    soundDone = true;
                    if (overlayStarted) {
                        tryNavigateAfterReady();
                    } else if (cloneDone) {
                        startOverlayFade();
                        tryNavigateAfterReady();
                    }
                };
                locked.addEventListener('ended', onEnded, { once: true });
                // Safety: max wait for ended
                setTimeout(() => {
                    if (!soundDone) {
                        soundDone = true;
                        if (cloneDone) {
                            startOverlayFade();
                            tryNavigateAfterReady();
                        }
                    }
                }, Math.max(2000, (locked.duration || 0) * 1000 / 1.5 + 200));
            }).catch(() => {
                soundDone = true;
                if (cloneDone) {
                    startOverlayFade();
                    tryNavigateAfterReady();
                }
            });
        } catch (e) {
            soundDone = true;
            if (cloneDone) {
                startOverlayFade();
                tryNavigateAfterReady();
            }
        }
    } else {
        // No sound -> navigate after clone completes and overlay fades
        // onCloneTransitionEnd will start overlay and call tryNavigateAfterReady
    }
}

// Create Cinema Mode for inline video tiles
function createCinemaMode(originalVideo, container) {
    if (!originalVideo) return;
    // Prevent multiple cinema instances
    if (document.getElementById('cinemaClone')) return;

    // Add animating class to container to remove grayscale
    if (container) {
        container.classList.add('animating');
    }
    // Ocultar hamburguesa y desactivar menú
    var navBar = document.querySelector('nav.blending-item');
    if (navBar) {
        navBar.style.opacity = '0';
        navBar.style.pointerEvents = 'none';
        navBar.style.transition = 'opacity 0.7s cubic-bezier(.77,0,.18,1)';
    }

    const rect = originalVideo.getBoundingClientRect();

    // Create dim background for cinema
    let cinemaDim = document.getElementById('cinemaDim');
    if (!cinemaDim) {
        cinemaDim = document.createElement('div');
        cinemaDim.id = 'cinemaDim';
        document.body.appendChild(cinemaDim);
    }
    cinemaDim.style.zIndex = '99999';
    cinemaDim.style.pointerEvents = 'auto';
    cinemaDim.style.opacity = '0';

    // Create cloned video element
    const clone = originalVideo.cloneNode(true);
    clone.id = 'cinemaClone';
    clone.muted = true;
    clone.loop = true;
    clone.playsInline = true;
    clone.autoplay = true;
    clone.style.position = 'fixed';
    clone.style.left = rect.left + 'px';
    clone.style.top = rect.top + 'px';
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    clone.style.zIndex = '100001';
    clone.style.objectFit = 'contain';
    clone.style.pointerEvents = 'auto';
    clone.style.transition = 'all 0.8s cubic-bezier(0.76, 0, 0.24, 1)';

    document.body.appendChild(clone);

    // Sync video playback time with original video
    clone.currentTime = originalVideo.currentTime;

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'cinema-close';
    closeBtn.id = 'cinemaClose';
    closeBtn.innerHTML = '&#x2715;';
    document.body.appendChild(closeBtn);

    // Create controls
    const controls = document.createElement('div');
    controls.className = 'cinema-controls';
    controls.id = 'cinemaControls';
    controls.innerHTML = `
        <div class="progress-bar-container">
            <div class="progress-bar" id="progressBar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            <div class="time-display">
                <span id="currentTime">0:00</span> / <span id="duration">0:00</span>
            </div>
        </div>
        <div class="controls-bottom">
            <button class="play-pause-btn" id="playPauseBtn">▶</button>
            <div class="volume-control">
                <span class="volume-icon" id="volumeIcon">◉</span>
                <input type="range" class="volume-slider" id="volumeSlider" min="0" max="100" value="50">
            </div>
        </div>
    `;
    document.body.appendChild(controls);

    // Set initial volume
    clone.volume = 0.5;

    // Format time helper
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    // Update progress bar
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const currentTimeSpan = document.getElementById('currentTime');
    const durationSpan = document.getElementById('duration');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeIcon = document.getElementById('volumeIcon');

    // Set duration when metadata loads
    clone.addEventListener('loadedmetadata', () => {
        durationSpan.textContent = formatTime(clone.duration);
    });

    // Update progress
    clone.addEventListener('timeupdate', () => {
        const percent = (clone.currentTime / clone.duration) * 100;
        progressFill.style.width = percent + '%';
        currentTimeSpan.textContent = formatTime(clone.currentTime);
    });

    // Click on progress bar to seek
    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        clone.currentTime = percent * clone.duration;
    });

    // Play/Pause button
    playPauseBtn.addEventListener('click', () => {
        if (clone.paused) {
            clone.play();
            playPauseBtn.textContent = '⏸';
        } else {
            clone.pause();
            playPauseBtn.textContent = '▶';
        }
    });

    // Update button on play/pause
    clone.addEventListener('play', () => {
        playPauseBtn.textContent = '⏸';
    });

    clone.addEventListener('pause', () => {
        playPauseBtn.textContent = '▶';
    });

    // Volume slider
    volumeSlider.addEventListener('input', (e) => {
        const volume = e.target.value / 100;
        clone.volume = volume;
        
        // Update volume icon opacity
        if (volume === 0) {
            volumeIcon.style.opacity = '0.3';
        } else if (volume < 0.5) {
            volumeIcon.style.opacity = '0.6';
        } else {
            volumeIcon.style.opacity = '1';
        }
    });

    // Mute toggle on icon click
    volumeIcon.addEventListener('click', () => {
        if (clone.volume > 0) {
            clone.volume = 0;
            volumeSlider.value = 0;
            volumeIcon.style.opacity = '0.3';
        } else {
            clone.volume = 0.5;
            volumeSlider.value = 50;
            volumeIcon.style.opacity = '0.6';
        }
    });

    // Fade in dim immediately, then expand video to full screen
    requestAnimationFrame(() => {
        cinemaDim.style.opacity = '0.78';
        try { clone.play(); } catch (e) {}
        clone.style.left = '0px';
        clone.style.top = '0px';
        clone.style.width = '100vw';
        clone.style.height = '100vh';
    });

    // Hide original video after a small delay to avoid pop
    setTimeout(() => {
        originalVideo.style.transition = 'opacity 0.3s ease';
        originalVideo.style.opacity = '0';
    }, 50);

    function closeCinema() {
        // --- NUEVO: Reposicionar el mapa/video inmediatamente según cámara en mano ---
        if (typeof window.setHandheldCameraShake === 'function') {
            window.setHandheldCameraShake(true);
        }
        // Remove animating class from container to restore grayscale
        if (container) {
            container.classList.remove('animating');
        }
        // Restaurar hamburguesa y menú
        var navBar = document.querySelector('nav.blending-item');
        if (navBar) {
            navBar.style.opacity = '1';
            navBar.style.pointerEvents = '';
        }
            // Cerrar cine si se hace click fuera del video y controles
            function onCinemaDimClick(e) {
                const controls = document.getElementById('cinemaControls');
                const clone = document.getElementById('cinemaClone');
                if (controls && controls.contains(e.target)) return;
                if (clone && clone.contains(e.target)) return;
                closeCinema();
            }
            cinemaDim.addEventListener('mousedown', onCinemaDimClick);
            // Limpiar listener al cerrar
            const prevCloseCinema = closeCinema;
            closeCinema = function() {
                cinemaDim.removeEventListener('mousedown', onCinemaDimClick);
                prevCloseCinema();
            };
        
        // Calculate blur for the video at its original position
        const videoCenterX = rect.left + rect.width / 2;
        const videoCenterY = rect.top + rect.height / 2;
        
        const distX = videoCenterX - centerX;
        const distY = videoCenterY - centerY;
        const distance = Math.sqrt(distX * distX + distY * distY);
        
        let videoBlur = (distance / blurRadiusScaled) * maxBlur;
        videoBlur = Math.max(0, Math.min(maxBlur, videoBlur));
        
        // Check if focused element reduces blur
        if (focusedElementPos) {
            const focusDistX = videoCenterX - focusedElementPos.x;
            const focusDistY = videoCenterY - focusedElementPos.y;
            const focusDistance = Math.sqrt(focusDistX * focusDistX + focusDistY * focusDistY);
            
            if (focusDistance < focusedElementRadius) {
                videoBlur = 0;
            }
        }
        
        // reverse animation: shrink clone back to original rect + cámara en mano
        let offset = { x: 0, y: 0 };
        if (typeof window.getHandheldCameraOffset === 'function') {
            offset = window.getHandheldCameraOffset() || { x: 0, y: 0 };
        }
        clone.style.left = (rect.left + offset.x) + 'px';
        clone.style.top = (rect.top + offset.y) + 'px';
        clone.style.width = rect.width + 'px';
        clone.style.height = rect.height + 'px';
        clone.style.filter = 'blur(' + videoBlur + 'px)';
        cinemaDim.style.opacity = '0';
        closeBtn.remove();
        // Remove controls
        const cinemaControls = document.getElementById('cinemaControls');
        if (cinemaControls) cinemaControls.remove();
        // after transition remove elements
        setTimeout(() => {
            // Restaurar solo la opacidad del video original, sin tocar posición ni tamaño
            originalVideo.style.opacity = '1';
            try { clone.pause(); } catch (e) {}
            clone.remove();
            if (cinemaDim) cinemaDim.remove();
        }, 1000);
        window.removeEventListener('keydown', onKey);
        cinemaDim.removeEventListener('click', closeCinema);
    }

    function onKey(ev) {
        if (ev.key === 'Escape') closeCinema();
    }

    closeBtn.addEventListener('click', closeCinema);
    cinemaDim.addEventListener('click', closeCinema);
    window.addEventListener('keydown', onKey);
}

// ========================================
// 🎬 MORPH ENTRY ANIMATION (for clothes-view page)
// ========================================
function initializeMorphEntry() {
    const transitionData = sessionStorage.getItem('morphTransition');
    
    if (transitionData) {
        const data = JSON.parse(transitionData);
        sessionStorage.removeItem('morphTransition');
        
        const heroSection = document.querySelector('.hero');
        if (heroSection) {
            animateHeroEntry(heroSection, data);
        }
    }
}

function animateHeroEntry(heroSection, data) {
    // Create overlay that starts from the original position
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.left = data.startX + 'px';
    overlay.style.top = data.startY + 'px';
    overlay.style.width = data.startWidth + 'px';
    overlay.style.height = data.startHeight + 'px';
    overlay.style.backgroundImage = `url(${data.imageSrc})`;
    overlay.style.backgroundSize = 'contain';
    overlay.style.backgroundPosition = 'center';
    overlay.style.zIndex = '99999';
    overlay.style.transition = 'none';
    
    document.body.appendChild(overlay);
    
    // Hide hero initially
    heroSection.style.opacity = '0';
    
    // Animate overlay to full screen
    requestAnimationFrame(() => {
        overlay.style.transition = 'all 0.8s cubic-bezier(0.76, 0, 0.24, 1)';
        overlay.style.left = '0px';
        overlay.style.top = '0px';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
    });
    
    // Remove overlay and reveal hero
    setTimeout(() => {
        heroSection.style.transition = 'opacity 0.3s ease';
        heroSection.style.opacity = '1';
        overlay.remove();
    }, 800);
}

// Initialize morph entry if on clothes-view page
if (document.querySelector('.hero')) {
    document.addEventListener('DOMContentLoaded', initializeMorphEntry);
}
// ========================================
// END OF MORPH TRANSITION CODE
// ========================================

canvas.addEventListener('touchstart', (e) => {
    // Disable touch interactions in grid mode
    if (isGridMode) {
        e.preventDefault();
        return;
    }
    
    // Inicializar audio si está habilitado y no se ha inicializado
    const audioEnabled = localStorage.getItem('audioEnabled') !== 'false';
    if (audioEnabled && typeof window.initializeAudio === 'function') {
        window.initializeAudio();
    }
    
    // Verificar y asegurar reproducción de white-noise en cada touch
    if (typeof window.ensureWhiteNoisePlaying === 'function') {
        window.ensureWhiteNoisePlaying();
    }
    
    if (e.touches.length === 2) {
        // Two fingers - start pinch zoom
        isPinching = true;
        isDragging = false;
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        
        initialPinchDistance = getTouchDistance(touch1, touch2);
        initialPinchScale = scale;
        
        canvas.classList.remove('dragging');
        e.preventDefault();
    } else if (e.touches.length === 1 && !isPinching) {
        // One finger - start drag
        isDragging = true;
        const touch = e.touches[0];
        lastX = touch.clientX;
        lastY = touch.clientY;
        dragStartX = touch.clientX;
        dragStartY = touch.clientY;
        hasMoved = false;
        velocityX = 0;
        velocityY = 0;
        canvas.classList.add('dragging');
        e.preventDefault();
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (isPinching && e.touches.length === 2) {
        // Handle pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = getTouchDistance(touch1, touch2);
        const midpoint = getTouchMidpoint(touch1, touch2);
        const scaleChange = currentDistance / initialPinchDistance;
        const oldScale = targetScale;
        targetScale = Math.max(minScale, Math.min(maxScale, initialPinchScale * scaleChange));
        if (oldScale !== targetScale) {
            if (window.setLowPassFilter) {
                const pinchDelta = targetScale - oldScale;
                const absDelta = Math.min(Math.abs(pinchDelta), 0.5);
                let freq;
                if (pinchDelta > 0) {
                    freq = 3500 + (absDelta / 0.5) * (18000 - 3500);
                } else {
                    freq = 3500 - (absDelta / 0.5) * 3200;
                    freq = Math.max(80, freq);
                }
                window.setLowPassFilter(freq, 0);
                if (window._zoomLPFTimer) clearTimeout(window._zoomLPFTimer);
                window._zoomLPFTimer = setTimeout(() => {
                    if (window.restoreLowPassFilter) window.restoreLowPassFilter(0);
                }, 320);
            }
            // Adjust offset to zoom towards pinch center
            const mouseX = midpoint.x - centerX;
            const mouseY = midpoint.y - centerY;
            const oldScaleInv = 1 / oldScale;
            const worldX = (mouseX - offsetX * oldScale) * oldScaleInv;
            const worldY = (mouseY - offsetY * oldScale) * oldScaleInv;
            const targetScaleInv = 1 / targetScale;
            targetOffsetX = (mouseX - worldX * targetScale) * targetScaleInv;
            targetOffsetY = (mouseY - worldY * targetScale) * targetScaleInv;
            clampOffset();
        }
        e.preventDefault();
    } else if (isDragging && e.touches.length === 1 && !isPinching) {
        // Handle drag with one finger
        const touch = e.touches[0];
        const deltaX = touch.clientX - lastX;
        const deltaY = touch.clientY - lastY;

        const totalMoveX = Math.abs(touch.clientX - dragStartX);
        const totalMoveY = Math.abs(touch.clientY - dragStartY);
        if (totalMoveX > 5 || totalMoveY > 5) {
            hasMoved = true;
        }

        const scaleInv = 1 / scale;
        
        // Calculate resistance factor based on how far outside bounds we are
        let resistanceFactorX = 1.0;
        let resistanceFactorY = 1.0;
        
        if (targetOffsetX < minOffsetX) {
            const distance = minOffsetX - targetOffsetX;
            resistanceFactorX = 1.0 / (1.0 + distance * 0.01); // Progressive resistance
        } else if (targetOffsetX > maxOffsetX) {
            const distance = targetOffsetX - maxOffsetX;
            resistanceFactorX = 1.0 / (1.0 + distance * 0.01);
        }
        
        if (targetOffsetY < minOffsetY) {
            const distance = minOffsetY - targetOffsetY;
            resistanceFactorY = 1.0 / (1.0 + distance * 0.01);
        } else if (targetOffsetY > maxOffsetY) {
            const distance = targetOffsetY - maxOffsetY;
            resistanceFactorY = 1.0 / (1.0 + distance * 0.01);
        }
        
        // Apply resistance to movement delta, not to position
        targetOffsetX += deltaX * scaleInv * resistanceFactorX;
        targetOffsetY += deltaY * scaleInv * resistanceFactorY;
        
        // Immediately update position for responsive dragging
        offsetX = targetOffsetX;
        offsetY = targetOffsetY;

        velocityX = deltaX * scaleInv * 0.8;
        velocityY = deltaY * scaleInv * 0.8;

        lastX = touch.clientX;
        lastY = touch.clientY;
        e.preventDefault();
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
        isPinching = false;
        initialPinchDistance = 0;
    }
    
    if (e.touches.length === 0) {
        // Check if this was a tap (not a drag) on mobile
        if (!hasMoved && e.changedTouches && e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            
            if (element) {
                const link = element.closest('.image-link');
                
                if (link) {
                    // This was a tap on an image link - trigger navigation
                    e.preventDefault();
                    const img = link.querySelector('img');
                    const targetUrl = link.getAttribute('href');
                    
                    if (img && targetUrl) {
                        createMorphTransition(img, targetUrl);
                    }
                }
            }
        }
        
        isDragging = false;
        canvas.classList.remove('dragging');
        // Animate rebound when user releases drag
        animateReboundIfNeeded();
        setTimeout(() => { hasMoved = false; }, 10);
    }
});

canvas.addEventListener('wheel', (e) => {
    // Disable zoom in grid mode
    if (isGridMode) {
        e.preventDefault();
        return;
    }
    
    e.preventDefault();
    // Limpiar suavemente el trail solo si hay cambio de zoom
    if (window.smoothClearTrail) window.smoothClearTrail();
    const delta = e.deltaY;
    const zoomFactor = delta > 0 ? (1 - zoomSpeed) : (1 + zoomSpeed);
    const oldScale = targetScale;
    targetScale = Math.max(minScale, Math.min(maxScale, targetScale * zoomFactor));
    if (oldScale === targetScale) return;
    // Low pass dinámico e intenso según fuerza y dirección del zoom
    if (window.setLowPassFilter) {
        const absDelta = Math.min(Math.abs(delta), 300);
        let freq;
        if (delta < 0) {
            freq = 3500 + (absDelta / 300) * (18000 - 3500);
        } else {
            freq = 3500 - (absDelta / 300) * 3200;
            freq = Math.max(80, freq); // BAJA el mínimo a 80Hz para notar más el efecto
        }
        window.setLowPassFilter(freq, 0); // transición instantánea
        if (window._zoomLPFTimer) clearTimeout(window._zoomLPFTimer);
        window._zoomLPFTimer = setTimeout(() => {
            if (window.restoreLowPassFilter) window.restoreLowPassFilter(0); // restauración instantánea
        }, 320);
    }
    // Posición del mouse relativo al canvas
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    // Calcular la posición del mouse en el espacio del mundo usando el estado target actual
    const worldX = (mouseX - centerX - targetOffsetX * oldScale) / oldScale;
    const worldY = (mouseY - centerY - targetOffsetY * oldScale) / oldScale;
    // Ajustar el offset target para que el punto bajo el mouse permanezca en la misma posición
    targetOffsetX = (mouseX - centerX - worldX * targetScale) / targetScale;
    targetOffsetY = (mouseY - centerY - worldY * targetScale) / targetScale;
    clampOffset();
}, { passive: false });

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const oldSettings = { ...settings };
        settings = getResponsiveSettings();
        gridSpacing = settings.gridSpacing;
        imageSize = settings.imageSize;
        blurRadius = settings.blurRadius;
        const oldColumns = gridColumns;
        gridColumns = settings.gridColumns;
        
        windowWidth = window.innerWidth;
        windowHeight = window.innerHeight;
        centerX = windowWidth / 2;
        centerY = windowHeight / 2;
        
        bufferX = windowWidth * bufferPercent;
        bufferY = windowHeight * bufferPercent;
        
        gridRows = Math.ceil(totalImages / gridColumns);
        contentWidth = (gridColumns - 1) * gridSpacing;
        contentHeight = (gridRows - 1) * gridSpacing;
        
        minOffsetX = -contentWidth - bufferX;
        maxOffsetX = bufferX;
        minOffsetY = -contentHeight - bufferY;
        maxOffsetY = bufferY;
        
        blurRadiusScaled = blurRadius * scale;
        
        if (oldColumns !== gridColumns) {
            createAllImages();
            const initialPosition = getInitialCenterPosition();
            offsetX = initialPosition.x;
            offsetY = initialPosition.y;
            targetOffsetX = initialPosition.x;
            targetOffsetY = initialPosition.y;
        }
        
        clampOffset();
        offsetX = targetOffsetX;
        offsetY = targetOffsetY;
    }, 150);
});

createAllImages();

const initialPosition = getInitialCenterPosition();
offsetX = initialPosition.x;
offsetY = initialPosition.y;
targetOffsetX = initialPosition.x;
targetOffsetY = initialPosition.y;

// Restore canvas position if returning from clothes-view page
const transitionData = sessionStorage.getItem('morphTransition');
if (transitionData) {
    const data = JSON.parse(transitionData);
    if (data.canvasOffsetX !== undefined) {
        offsetX = data.canvasOffsetX;
        offsetY = data.canvasOffsetY;
        targetOffsetX = data.canvasOffsetX;
        targetOffsetY = data.canvasOffsetY;
        scale = data.canvasScale;
        targetScale = data.canvasScale;
    }
}


// Previene el drag nativo en imágenes, enlaces y elementos del mapa
document.addEventListener('DOMContentLoaded', () => {
    // Logo
    const logoImg = document.querySelector('.logo img');
    if (logoImg) {
        logoImg.addEventListener('dragstart', (e) => e.preventDefault());
        logoImg.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'IMG') {
                e.preventDefault();
            }
        });
    }


    // Previene drag nativo en todas las imágenes, enlaces, canvas y contenedores del mapa
    function preventDragNative(selector) {
        document.querySelectorAll(selector).forEach(el => {
            el.setAttribute('draggable', 'false');
            el.addEventListener('dragstart', e => e.preventDefault());
            el.addEventListener('mousedown', e => {
                if (e.button === 0) e.preventDefault();
            });
        });
    }
    preventDragNative('img, a, .image-link, .video-link, .image-container, #canvas');

    // Refuerzo: si se añaden imágenes dinámicamente al canvas, observar y prevenir drag
    const canvas = document.getElementById('canvas');
    if (canvas && window.MutationObserver) {
        const observer = new MutationObserver(() => {
            preventDragNative('img, a, .image-link, .video-link, .image-container, #canvas');
        });
        observer.observe(canvas, { childList: true, subtree: true });
    }

    // Si usas drag personalizado, previene drag nativo durante el drag
    let isCustomDragging = false;
    // Suponiendo que tienes eventos para drag personalizado:
    // window.addEventListener('custom-drag-start', () => { isCustomDragging = true; });
    // window.addEventListener('custom-drag-end', () => { isCustomDragging = false; });
    // Si tienes una variable global para drag, puedes usarla aquí
    document.addEventListener('dragstart', function(e) {
        if (isCustomDragging || document.body.classList.contains('dragging')) {
            e.preventDefault();
        }
    }, true);
});

animate();

// ========== GRID LAYOUT SYSTEM (for disabled visual effects) ==========
// Note: Variables (isGridMode, gridModePositions, gridModeTransitioning) are declared earlier in the file

// Function to calculate optimal grid layout based on screen orientation
function calculateGridLayout() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isPortrait = screenHeight > screenWidth;
    // Count only non-visual-effect items for grid calculation
    const totalItems = images.filter(img => !img.isVisualEffect).length;
    const itemSize = 170; // Fixed item size (matching current image size)
    const cellWidth = 150; // Cell width
    const cellHeight = 225; // Cell height
    const minGap = 20; // Minimum gap between items
    
    // Determine optimal grid dimensions based on orientation
    let cols, rows;
    
    if (isPortrait) {
        // Portrait: prefer vertical layout (fewer columns, more rows)
        // Calculate columns based on screen width
        if (screenWidth < 400) {
            cols = 2;
        } else if (screenWidth < 600) {
            cols = 2;
        } else if (screenWidth < 900) {
            cols = 3;
        } else {
            cols = 4;
        }
        rows = Math.ceil(totalItems / cols);
    } else {
        // Landscape: prefer horizontal layout (more columns, fewer rows)
        // For 1920x1080 (typical landscape), prioritize horizontal distribution
        if (totalItems <= 4) {
            // Few items: single row or 2x2
            rows = totalItems <= 2 ? 1 : 2;
        } else if (screenHeight < 700) {
            // Very short screens: 2 rows max
            rows = 2;
        } else if (screenHeight < 1000) {
            // Standard landscape (like 1080p): 2-3 rows
            rows = totalItems <= 6 ? 2 : 3;
        } else {
            // Tall landscape screens: up to 3 rows
            rows = 3;
        }
        cols = Math.ceil(totalItems / rows);
    }
    
    // Calculate spacing ensuring no overlap
    const paddingX = Math.max(100, screenWidth * 0.1); // Horizontal padding for breathing room
    const navbarHeight = 80; // Approximate navbar height
    const paddingTop = Math.max(navbarHeight + 40, screenHeight * 0.08); // Extra space for navbar + margin
    const paddingBottom = Math.max(100, screenHeight * 0.1); // Bottom margin - increased for more breathing room
    
    const availableWidth = screenWidth - (paddingX * 2);
    const availableHeight = screenHeight - paddingTop - paddingBottom;
    
    // Calculate spacing: total width needed = (cols * cellWidth) + ((cols - 1) * gap)
    // Available = cols * cellWidth + (cols - 1) * gap
    // gap = (Available - cols * cellWidth) / (cols - 1)
    let spacingX, spacingY;
    
    if (cols > 1) {
        const gapX = Math.max(minGap, (availableWidth - (cols * cellWidth)) / (cols - 1));
        spacingX = cellWidth + gapX;
    } else {
        spacingX = cellWidth;
    }
    
    if (rows > 1) {
        const gapY = Math.max(minGap, (availableHeight - (rows * cellHeight)) / (rows - 1));
        spacingY = cellHeight + gapY;
    } else {
        spacingY = cellHeight;
    }
    
    // Center the grid on screen
    // Total grid dimensions include all cells and gaps between them
    const gridWidth = cols > 1 ? ((cols - 1) * spacingX + cellWidth) : cellWidth;
    const gridHeight = rows > 1 ? ((rows - 1) * spacingY + cellHeight) : cellHeight;
    // Center horizontally within available width (respecting paddingX)
    const startX = paddingX + (availableWidth - gridWidth) / 2;
    const startY = paddingTop + (availableHeight - gridHeight) / 2;
    
    console.log('[GRID-CALC] Cols:', cols, 'Rows:', rows, 'Total items:', totalItems);
    console.log('[GRID-CALC] Grid dimensions:', gridWidth, 'x', gridHeight);
    console.log('[GRID-CALC] Start position:', startX, ',', startY);
    console.log('[GRID-CALC] Cell dimensions:', cellWidth, 'x', cellHeight, '| Item size:', itemSize);
    
    return { cols, rows, spacingX, spacingY, startX, startY, cellWidth, cellHeight, itemSize };
}

// Arrange map elements in grid layout
window.arrangeMapInGrid = function() {
    if (isGridMode || gridModeTransitioning) return;
    
    console.log('[GRID] Arranging map in grid layout');
    console.log('[GRID] Total images:', images.length);
    console.log('[GRID] Screen dimensions:', window.innerWidth, 'x', window.innerHeight);
    
    isGridMode = true;
    gridModeTransitioning = true;
    gridModePositions = [];
    
    // Filter out visual-only elements (reveal-text-template)
    const gridImages = images.filter(img => !img.isVisualEffect);
    
    // Hide visual effect elements
    images.forEach(img => {
        if (img.isVisualEffect) {
            img.element.style.opacity = '0';
            img.element.style.pointerEvents = 'none';
        }
    });
    
    const layout = calculateGridLayout();
    const { cols, rows, spacingX, spacingY, startX, startY, cellWidth, cellHeight, itemSize } = layout;
    
    console.log('[GRID] Layout:', { cols, rows, spacingX, spacingY, startX, startY });
    console.log('[GRID] Filtered images (excluding visual effects):', gridImages.length);
    
    // Calculate target positions for each image (excluding visual effects)
    // Each element is centered within its cell
    const offsetX = (cellWidth - itemSize) / 2; // Horizontal offset to center item in cell
    const offsetY = (cellHeight - itemSize) / 2; // Vertical offset to center item in cell
    
    gridImages.forEach((img, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        // Position at cell start, then offset to center the item
        const targetX = startX + (col * spacingX) + offsetX;
        const targetY = startY + (row * spacingY) + offsetY;
        
        // Get current position from transform
        const transform = img.element.style.transform || '';
        const match = transform.match(/translate3d\(([^,]+)px,\s*([^,]+)px/);
        const startX_current = match ? parseFloat(match[1]) : 0;
        const startY_current = match ? parseFloat(match[2]) : 0;
        
        gridModePositions.push({
            element: img.element,
            targetX,
            targetY,
            startX: startX_current,
            startY: startY_current
        });
    });
    
    // Animate to grid positions
    const duration = 250; // Very fast, snappy transition
    const startTime = performance.now();
    
    function animateToGrid() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        
        // Ease out expo for snappy, dynamic deceleration
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        
        gridModePositions.forEach(pos => {
            const currentX = pos.startX + (pos.targetX - pos.startX) * eased;
            const currentY = pos.startY + (pos.targetY - pos.startY) * eased;
            
            // Use fixed scale of 1 in grid mode, remove blur
            pos.element.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(1)`;
            pos.element.style.filter = 'blur(0px)';
            
            // Remove grayscale from images in grid mode
            const imgTag = pos.element.querySelector('img');
            if (imgTag) {
                imgTag.style.filter = 'grayscale(0)';
            }
        });
        
        if (progress < 1) {
            requestAnimationFrame(animateToGrid);
        } else {
            gridModeTransitioning = false;
            console.log('[GRID] Grid arrangement complete');
            
            // Show tooltips automatically on mobile/small screens in grid mode
            const isMobileOrSmallScreen = window.innerWidth <= 900;
            if (isMobileOrSmallScreen) {
                gridModePositions.forEach(pos => {
                    const tooltip = pos.element.querySelector('.tooltip');
                    if (tooltip) {
                        tooltip.style.opacity = '1';
                        tooltip.style.visibility = 'visible';
                    }
                });
            }
        }
    }
    
    animateToGrid();
};

// Restore normal map positioning
window.restoreMapPositioning = function() {
    if (!isGridMode) return;
    
    console.log('[GRID] Restoring normal map positioning');
    
    // Hide tooltips on mobile when exiting grid mode
    const isMobileOrSmallScreen = window.innerWidth <= 900;
    if (isMobileOrSmallScreen) {
        images.forEach(img => {
            const tooltip = img.element.querySelector('.tooltip');
            if (tooltip) {
                tooltip.style.opacity = '';
                tooltip.style.visibility = '';
            }
        });
    }
    
    // Restore visibility of visual effect elements
    images.forEach(img => {
        if (img.isVisualEffect) {
            img.element.style.opacity = '';
            img.element.style.pointerEvents = '';
        }
    });
    
    // Store current grid positions before switching mode
    const restorePositions = [];
    
    images.forEach((img, index) => {
        // Get current grid position
        const transform = img.element.style.transform || '';
        const match = transform.match(/translate3d\(([^,]+)px,\s*([^,]+)px/);
        const startX_current = match ? parseFloat(match[1]) : 0;
        const startY_current = match ? parseFloat(match[2]) : 0;
        
        // Calculate target normal position
        const randomOffset = getRandomOffset(img.gridX, img.gridY);
        const baseX = img.gridX * gridSpacing + randomOffset.x;
        const baseY = img.gridY * gridSpacing + randomOffset.y;
        
        const offsetXScaled = offsetX * scale;
        const offsetYScaled = offsetY * scale;
        const imageSizeScaled = imageSize * scale;
        const imageSizeScaledHalf = imageSizeScaled / 2;
        
        const targetX = baseX * scale + offsetXScaled + centerX - imageSizeScaledHalf;
        const targetY = baseY * scale + offsetYScaled + centerY - imageSizeScaledHalf;
        
        restorePositions.push({
            element: img.element,
            startX: startX_current,
            startY: startY_current,
            targetX,
            targetY,
            img
        });
    });
    
    // Switch mode flags
    isGridMode = false;
    gridModeTransitioning = true;
    
    // Animate transition back to normal positions
    const duration = 600;
    const startTime = performance.now();
    
    function animateRestore() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        
        // Ease out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3);
        
        restorePositions.forEach(pos => {
            const currentX = pos.startX + (pos.targetX - pos.startX) * eased;
            const currentY = pos.startY + (pos.targetY - pos.startY) * eased;
            
            // Animate back to normal scale
            pos.element.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(${scale})`;
            
            // Restore grayscale filter
            const imgTag = pos.element.querySelector('img');
            if (imgTag) {
                imgTag.style.filter = '';
            }
        });
        
        if (progress < 1) {
            requestAnimationFrame(animateRestore);
        } else {
            gridModeTransitioning = false;
            console.log('[GRID] Normal positioning restored');
        }
    }
    
    animateRestore();
};

// Handle window resize in grid mode
window.addEventListener('resize', () => {
    if (isGridMode && !gridModeTransitioning) {
        // Recalculate grid on resize
        setTimeout(() => {
            if (isGridMode) {
                isGridMode = false; // Reset flag
                window.arrangeMapInGrid(); // Rearrange with new dimensions
            }
        }, 150);
    }
});