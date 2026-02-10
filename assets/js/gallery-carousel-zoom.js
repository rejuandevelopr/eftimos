// Galería tipo carrusel infinito CON ZOOM FOCAL para gallery-view.html
// Sistema de navegación con zoom focal mediante wheel y pinch

let currentIndex = 0;
let isDragging = false;
let startX = 0;
let startY = 0; // Posición Y inicial del drag
let lastX = 0;
let lastTime = 0;
let velocity = 0;
let dragOffset = 0;
let momentumAnimationId = null;
let virtualPosition = 0;
let transitionRemoved = false;

// Variables de zoom focal
let isZoomed = false;
let currentScale = 1;
let panX = 0;
let panY = 0;
let startPanX = 0;
let startPanY = 0;
let focalPointX = 0; // Punto focal del zoom
let focalPointY = 0;
const MAX_SCALE = 4;
const MIN_SCALE = 1;
const ZOOM_SPEED = 0.15; // Velocidad del zoom con wheel
let lastTapTime = 0;

// Variables de pinch zoom (touch)
let initialDistance = 0;
let initialScale = 1;
let isPinching = false;
let pinchStartX = 0;
let pinchStartY = 0;

const FRICTION = 0.94;
const MIN_VELOCITY = 0.3;

// Función para aplicar resistencia elástica al pan fuera de límites
function applyElasticResistance(value, max) {
    const RESISTANCE = 0.3; // Factor de resistencia (menor = más resistencia)
    
    if (Math.abs(value) <= max) {
        return value;
    }
    
    const excess = Math.abs(value) - max;
    const resistedExcess = excess * RESISTANCE;
    return (value > 0 ? 1 : -1) * (max + resistedExcess);
}

// Función para calcular límites del pan y obtener valores con resistencia
function constrainPan(img, scale, panXVal, panYVal, applyResistance = false) {
    if (scale <= MIN_SCALE) return { panX: 0, panY: 0, maxPanX: 0, maxPanY: 0 };
    
    // Obtener tamaños reales
    const imgNaturalWidth = img.naturalWidth || img.width;
    const imgNaturalHeight = img.naturalHeight || img.height;
    
    // Calcular el tamaño escalado de la imagen
    const scaledWidth = imgNaturalWidth * scale;
    const scaledHeight = imgNaturalHeight * scale;
    
    // Obtener el tamaño del viewport (contenedor visible)
    const container = img.closest('.gallery-card');
    const viewportWidth = container ? container.clientWidth : window.innerWidth;
    const viewportHeight = container ? container.clientHeight : window.innerHeight;
    
    // Calcular cuánto podemos mover la imagen
    // Permitir mucho más desplazamiento del necesario para mayor libertad
    const maxPanX = Math.max(0, (scaledWidth - viewportWidth) / 2) * 2; // 2x más libertad horizontal
    const maxPanY = Math.max(0, (scaledHeight - viewportHeight) / 2) * 4; // 4x más libertad vertical
    
    let finalPanX, finalPanY;
    
    if (applyResistance) {
        // Durante el drag: aplicar resistencia elástica
        finalPanX = applyElasticResistance(panXVal, maxPanX);
        finalPanY = applyElasticResistance(panYVal, maxPanY);
    } else {
        // Para consultas (hardlimit): límite duro
        finalPanX = Math.max(-maxPanX, Math.min(maxPanX, panXVal));
        finalPanY = Math.max(-maxPanY, Math.min(maxPanY, panYVal));
    }
    
    return {
        panX: finalPanX,
        panY: finalPanY,
        maxPanX: maxPanX,
        maxPanY: maxPanY
    };
}

let pageLoaderHidden = false;

function hidePageLoader() {
    if (pageLoaderHidden) return;
    const loader = document.getElementById('pageLoader');
    if (!loader) return;
    pageLoaderHidden = true;
    loader.classList.add('hidden');
    loader.setAttribute('aria-busy', 'false');
    setTimeout(() => {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, 600);
}

function waitForGalleryImages() {
    const images = Array.from(document.querySelectorAll('#galleryTrack img'));
    if (!images.length) return Promise.resolve();

    const promises = images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
            const done = () => {
                img.removeEventListener('load', done);
                img.removeEventListener('error', done);
                resolve();
            };
            img.addEventListener('load', done);
            img.addEventListener('error', done);
        });
    });

    return Promise.all(promises);
}

// Generar tarjetas de galería
function initGallery() {
    if (!window.galleryImages || window.galleryImages.length === 0) {
        console.error('galleryImages not defined');
        return;
    }

    const track = document.getElementById('galleryTrack');
    const progressIndicator = document.getElementById('progressIndicator');

    window.galleryImages.forEach((image, index) => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.dataset.index = index;

        card.innerHTML = `
            <img src="${image.src}" alt="${image.caption}" draggable="false">
        `;

        track.appendChild(card);

        // Crear punto de progreso
        const dot = document.createElement('div');
        dot.className = 'progress-dot';
        progressIndicator.appendChild(dot);

        // Agregar listeners para zoom por doble click
        card.addEventListener('dblclick', (e) => {
            if (card.classList.contains('active')) {
                e.stopPropagation();
                toggleZoom(card);
            }
        });
    });

    updateCarousel();
    setupEventListeners();
}

// Actualizar posiciones del carrusel
function updateCarousel(animated = true) {
    const cards = document.querySelectorAll('.gallery-card');
    const dots = document.querySelectorAll('.progress-dot');
    const totalImages = window.galleryImages.length;

    cards.forEach((card, cardIndex) => {
        let distance = cardIndex - currentIndex;
        
        if (distance > totalImages / 2) {
            distance -= totalImages;
        } else if (distance < -totalImages / 2) {
            distance += totalImages;
        }

        const absDistance = Math.abs(distance);
        
        if (absDistance === 0) {
            card.className = 'gallery-card active';
            card.style.transform = 'translate(-50%, -50%) scale(1) translateX(0)';
            card.style.filter = 'blur(0px) brightness(1)';
            card.style.opacity = '1';
            card.style.zIndex = '100';
        } else if (absDistance === 1) {
            card.className = 'gallery-card side';
            const translateX = distance * 380;
            const scale = 0.75;
            const blur = 2;
            const brightness = 0.8;
            
            card.style.transform = `translate(-50%, -50%) scale(${scale}) translateX(${translateX}px)`;
            card.style.filter = `blur(${blur}px) brightness(${brightness})`;
            card.style.opacity = '0.7';
            card.style.zIndex = '50';
        } else if (absDistance === 2) {
            card.className = 'gallery-card far';
            const translateX = distance * 500;
            const scale = 0.5;
            const blur = 6;
            const brightness = 0.6;
            
            card.style.transform = `translate(-50%, -50%) scale(${scale}) translateX(${translateX}px)`;
            card.style.filter = `blur(${blur}px) brightness(${brightness})`;
            card.style.opacity = '0.4';
            card.style.zIndex = '30';
        } else {
            card.className = 'gallery-card hidden';
            const translateX = distance * 600;
            card.style.transform = `translate(-50%, -50%) scale(0.3) translateX(${translateX}px)`;
            card.style.filter = 'blur(10px) brightness(0.5)';
            card.style.opacity = '0';
            card.style.zIndex = '1';
        }

        if (!animated) {
            card.style.transition = 'none';
            setTimeout(() => {
                card.style.transition = '';
            }, 50);
        }
    });

    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentIndex);
    });

    const captionElement = document.getElementById('galleryCaption');
    if (captionElement && window.galleryImages[currentIndex]) {
        captionElement.textContent = window.galleryImages[currentIndex].caption;
    }
}

// Navegación
function nextImage() {
    if (isZoomed) return;
    
    // Aplicar transiciones rápidas para botones
    const cards = document.querySelectorAll('.gallery-card');
    cards.forEach(card => {
        card.style.transition = 'transform 0.35s cubic-bezier(0.4, 0.0, 0.2, 1), filter 0.35s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.35s cubic-bezier(0.4, 0.0, 0.2, 1), z-index 0s';
    });
    
    currentIndex = (currentIndex + 1) % window.galleryImages.length;
    updateCarousel();
}

function prevImage() {
    if (isZoomed) return;
    
    // Aplicar transiciones rápidas para botones
    const cards = document.querySelectorAll('.gallery-card');
    cards.forEach(card => {
        card.style.transition = 'transform 0.35s cubic-bezier(0.4, 0.0, 0.2, 1), filter 0.35s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.35s cubic-bezier(0.4, 0.0, 0.2, 1), z-index 0s';
    });
    
    currentIndex = (currentIndex - 1 + window.galleryImages.length) % window.galleryImages.length;
    updateCarousel();
}

// Sistema de drag con física
function setupEventListeners() {
    const galleryWrapper = document.querySelector('.gallery-wrapper');
    
    // Wheel para ZOOM FOCAL (no navegación)
    galleryWrapper.addEventListener('wheel', (e) => {
        const card = e.target.closest('.gallery-card');
        if (!card || !card.classList.contains('active')) return;
        
        e.preventDefault();
        
        const delta = e.deltaY;
        const zoomFactor = delta > 0 ? (1 - ZOOM_SPEED) : (1 + ZOOM_SPEED);
        
        // Calcular punto focal relativo a la imagen
        const rect = card.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Aplicar zoom focal
        applyFocalZoom(card, zoomFactor, mouseX, mouseY);
    }, { passive: false });

    // Mouse events
    galleryWrapper.addEventListener('mousedown', handleDragStart);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);

    // Touch events  
    galleryWrapper.addEventListener('touchstart', handleDragStart, { passive: false });
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
    
    // Configurar efectos hover del cursor en gallery-cards
    setupGalleryHoverEffects();

    // Botones de navegación
    document.getElementById('nextBtn')?.addEventListener('click', nextImage);
    document.getElementById('prevBtn')?.addEventListener('click', prevImage);

    // Soporte para teclado
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            nextImage();
        } else if (e.key === 'ArrowLeft') {
            prevImage();
        } else if (e.key === 'Escape' && isZoomed) {
            resetZoom();
        }
    });

    // Click en tarjetas laterales
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.gallery-card');
        if (card && !card.classList.contains('active') && !isZoomed) {
            const cardIndex = parseInt(card.dataset.index);
            const totalImages = window.galleryImages.length;
            
            let distance = cardIndex - currentIndex;
            if (distance > totalImages / 2) {
                distance -= totalImages;
            } else if (distance < -totalImages / 2) {
                distance += totalImages;
            }
            
            if (distance > 0) {
                nextImage();
            } else if (distance < 0) {
                prevImage();
            }
        }
    });
}

function handleDragStart(e) {
    // Buscar el card activo - permitir drag desde cualquier parte del wrapper cuando hay zoom
    let card = e.target.closest('.gallery-card');
    if (!card) {
        // Si no se hizo click en un card, buscar el card activo cuando estamos en zoom
        if (isZoomed) {
            card = document.querySelector('.gallery-card.active');
        }
        if (!card) return;
    }
    
    // Verificar que sea el card activo
    if (!card.classList.contains('active')) return;

    // Detectar pinch zoom en touch
    if (e.type === 'touchstart' && e.touches.length === 2) {
        handlePinchStart(e);
        return;
    }

    // Detectar doble tap para zoom
    const currentTime = Date.now();
    const tapGap = currentTime - lastTapTime;
    
    if (tapGap < 300 && tapGap > 0 && e.type.includes('touch')) {
        toggleZoom(card);
        lastTapTime = 0;
        return;
    }
    lastTapTime = currentTime;

    isDragging = true;
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    startX = clientX;
    startY = clientY; // Guardar posición Y inicial
    lastX = clientX;
    lastTime = Date.now();
    velocity = 0;
    dragOffset = 0;
    transitionRemoved = false;
    
    if (isZoomed) {
        startPanX = panX;
        startPanY = panY;
        
        // Quitar transición de la imagen para drag fluido
        const img = card.querySelector('img');
        if (img) img.style.transition = 'none';
    }
    
    if (momentumAnimationId) {
        cancelAnimationFrame(momentumAnimationId);
        momentumAnimationId = null;
        virtualPosition = 0;
    }
    
    const cards = document.querySelectorAll('.gallery-card');
    cards.forEach(card => {
        card.style.transition = isZoomed ? 'none' : 'transform 0.2s ease-out, filter 0.2s ease-out, opacity 0.2s ease-out, z-index 0s';
    });
    
    document.querySelector('.gallery-wrapper').style.cursor = 'grabbing';
    e.preventDefault();
}

function handleDragMove(e) {
    // Manejo de pinch zoom
    if (e.type === 'touchmove' && e.touches.length === 2) {
        handlePinchMove(e);
        return;
    }

    if (!isDragging) return;
    
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;
    const deltaX = clientX - lastX;
    const newDragOffset = clientX - startX;
    
    if (isZoomed) {
        // Pan mientras está zoomed
        panX = startPanX + (clientX - startX);
        panY = startPanY + (clientY - startY); // Corregido: usar clientY - startY
        
        const activeCard = document.querySelector('.gallery-card.active');
        const img = activeCard?.querySelector('img');
        if (img) {
            // Aplicar límites con resistencia elástica durante el drag
            const constrained = constrainPan(img, currentScale, panX, panY, true);
            panX = constrained.panX;
            panY = constrained.panY;
            
            img.style.transition = 'none';
            img.style.transform = `scale(${currentScale}) translate(${panX / currentScale}px, ${panY / currentScale}px)`;
        }
    } else {
        // Drag normal del carrusel
        if (!transitionRemoved && Math.abs(newDragOffset) > 40) {
            const cards = document.querySelectorAll('.gallery-card');
            cards.forEach(card => {
                card.style.transition = 'none';
            });
            transitionRemoved = true;
        }
        
        if (deltaTime > 0) {
            velocity = deltaX / deltaTime * 16;
        }
        
        dragOffset = newDragOffset;
        lastX = clientX;
        lastTime = currentTime;
        
        applyDragOffset();
    }
}

// Animación de rebote elástico cuando se suelta fuera de límites
function springBackAnimation() {
    const activeCard = document.querySelector('.gallery-card.active');
    const img = activeCard?.querySelector('img');
    if (!img) return;
    
    // Obtener límites reales (sin resistencia)
    const constrained = constrainPan(img, currentScale, panX, panY, false);
    const targetPanX = constrained.panX;
    const targetPanY = constrained.panY;
    
    // Si ya está dentro de límites, no animar
    if (Math.abs(panX - targetPanX) < 0.5 && Math.abs(panY - targetPanY) < 0.5) {
        panX = targetPanX;
        panY = targetPanY;
        return;
    }
    
    // Animar con ease-out
    const startPanX = panX;
    const startPanY = panY;
    const duration = 400; // ms
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        
        panX = startPanX + (targetPanX - startPanX) * eased;
        panY = startPanY + (targetPanY - startPanY) * eased;
        
        img.style.transition = 'none';
        img.style.transform = `scale(${currentScale}) translate(${panX / currentScale}px, ${panY / currentScale}px)`;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Asegurar valores finales exactos
            panX = targetPanX;
            panY = targetPanY;
            img.style.transform = `scale(${currentScale}) translate(${panX / currentScale}px, ${panY / currentScale}px)`;
        }
    }
    
    requestAnimationFrame(animate);
}

function handleDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    document.querySelector('.gallery-wrapper').style.cursor = 'grab';
    
    if (isZoomed) {
        // Animar de vuelta a los límites si está fuera
        springBackAnimation();
        return;
    }
    
    const cards = document.querySelectorAll('.gallery-card');
    
    if (Math.abs(velocity) > MIN_VELOCITY) {
        virtualPosition = dragOffset;
        animateMomentum();
    } else {
        virtualPosition = dragOffset;
        cards.forEach(card => card.style.transition = '');
        snapToNearest();
    }
}

function applyDragOffset() {
    const cards = document.querySelectorAll('.gallery-card');
    const totalImages = window.galleryImages.length;
    const dragProgress = dragOffset / 380;
    
    cards.forEach((card, cardIndex) => {
        let distance = cardIndex - currentIndex + dragProgress;
        
        while (distance > totalImages / 2) distance -= totalImages;
        while (distance < -totalImages / 2) distance += totalImages;

        const absDistance = Math.abs(distance);
        let translateX, scale, blur, brightness, opacity, zIndex;
        
        if (absDistance < 0.5) {
            const t = absDistance / 0.5;
            translateX = distance * 380;
            scale = 1 - (t * 0.25);
            blur = t * 2;
            brightness = 1 - (t * 0.2);
            opacity = 1 - (t * 0.3);
            zIndex = 100;
        } else if (absDistance < 1.5) {
            const t = (absDistance - 0.5) / 1.0;
            translateX = distance * 380;
            scale = 0.75 - (t * 0.25);
            blur = 2 + (t * 4);
            brightness = 0.8 - (t * 0.2);
            opacity = 0.7 - (t * 0.3);
            zIndex = 50;
        } else if (absDistance < 2.5) {
            const t = (absDistance - 1.5) / 1.0;
            translateX = distance * 500;
            scale = 0.5 - (t * 0.2);
            blur = 6 + (t * 4);
            brightness = 0.6 - (t * 0.1);
            opacity = 0.4 - (t * 0.4);
            zIndex = 30;
        } else {
            translateX = distance * 600;
            scale = 0.3;
            blur = 10;
            brightness = 0.5;
            opacity = 0;
            zIndex = 1;
        }

        card.style.transform = `translate(-50%, -50%) scale(${scale}) translateX(${translateX}px)`;
        card.style.filter = `blur(${blur}px) brightness(${brightness})`;
        card.style.opacity = opacity;
        card.style.zIndex = zIndex;
    });
}

function applyMomentumOffset(offset) {
    const cards = document.querySelectorAll('.gallery-card');
    const totalImages = window.galleryImages.length;
    const dragProgress = offset / 380;
    
    cards.forEach((card, cardIndex) => {
        let distance = cardIndex - currentIndex + dragProgress;
        
        while (distance > totalImages / 2) distance -= totalImages;
        while (distance < -totalImages / 2) distance += totalImages;

        const absDistance = Math.abs(distance);
        let translateX, scale, blur, brightness, opacity, zIndex;
        
        if (absDistance < 0.5) {
            const t = absDistance / 0.5;
            translateX = distance * 380;
            scale = 1 - (t * 0.25);
            blur = t * 2;
            brightness = 1 - (t * 0.2);
            opacity = 1 - (t * 0.3);
            zIndex = 100;
        } else if (absDistance < 1.5) {
            const t = (absDistance - 0.5) / 1.0;
            translateX = distance * 380;
            scale = 0.75 - (t * 0.25);
            blur = 2 + (t * 4);
            brightness = 0.8 - (t * 0.2);
            opacity = 0.7 - (t * 0.3);
            zIndex = 50;
        } else if (absDistance < 2.5) {
            const t = (absDistance - 1.5) / 1.0;
            translateX = distance * 500;
            scale = 0.5 - (t * 0.2);
            blur = 6 + (t * 4);
            brightness = 0.6 - (t * 0.1);
            opacity = 0.4 - (t * 0.4);
            zIndex = 30;
        } else {
            translateX = distance * 600;
            scale = 0.3;
            blur = 10;
            brightness = 0.5;
            opacity = 0;
            zIndex = 1;
        }

        card.style.transform = `translate(-50%, -50%) scale(${scale}) translateX(${translateX}px)`;
        card.style.filter = `blur(${blur}px) brightness(${brightness})`;
        card.style.opacity = opacity;
        card.style.zIndex = zIndex;
        card.style.transition = 'none';
    });
}

function animateMomentum() {
    velocity *= FRICTION;
    virtualPosition += velocity;
    applyMomentumOffset(virtualPosition);
    
    if (Math.abs(velocity) > MIN_VELOCITY) {
        momentumAnimationId = requestAnimationFrame(animateMomentum);
    } else {
        snapToNearest();
    }
}

function snapToNearest() {
    const cards = document.querySelectorAll('.gallery-card');
    const totalImages = window.galleryImages.length;
    const virtualImageOffset = virtualPosition / 380;
    
    let minDistance = Infinity;
    let bestIndex = currentIndex;
    
    for (let i = 0; i < totalImages; i++) {
        let dist = i - currentIndex + virtualImageOffset;
        
        while (dist > totalImages / 2) dist -= totalImages;
        while (dist < -totalImages / 2) dist += totalImages;
        
        const absDist = Math.abs(dist);
        
        if (absDist < minDistance) {
            minDistance = absDist;
            bestIndex = i;
        }
    }
    
    currentIndex = bestIndex;
    dragOffset = 0;
    virtualPosition = 0;
    velocity = 0;
    
    cards.forEach(card => {
        card.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), filter 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), z-index 0s';
    });
    
    updateCarousel();
}

// Funciones de zoom focal
function applyFocalZoom(card, zoomFactor, mouseX, mouseY) {
    const img = card.querySelector('img');
    if (!img) return;
    
    const prevScale = currentScale;
    currentScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, currentScale * zoomFactor));
    
    if (currentScale > MIN_SCALE) {
        isZoomed = true;
        card.classList.add('zoomed');
        
        // Calcular el punto focal relativo al tamaño de la imagen
        const rect = img.getBoundingClientRect();
        const imgCenterX = rect.width / 2;
        const imgCenterY = rect.height / 2;
        
        // Ajustar el pan para mantener el punto focal
        if (prevScale > MIN_SCALE) {
            const scaleDiff = currentScale / prevScale;
            panX = mouseX - imgCenterX - (mouseX - imgCenterX - panX) * scaleDiff;
            panY = mouseY - imgCenterY - (mouseY - imgCenterY - panY) * scaleDiff;
        } else {
            panX = (mouseX - imgCenterX) * (1 - currentScale);
            panY = (mouseY - imgCenterY) * (1 - currentScale);
        }
        
        // Aplicar límites al pan
        const constrained = constrainPan(img, currentScale, panX, panY);
        panX = constrained.panX;
        panY = constrained.panY;
        
        // Interpolar hacia el centro SOLO durante zoom out
        // Para zoom in, mantener el pan focal sin interpolación
        let finalPanX = panX;
        let finalPanY = panY;
        
        if (currentScale < prevScale) {
            // Zoom out: interpolar progresivamente hacia el centro
            const centerWeight = (MAX_SCALE - currentScale) / (MAX_SCALE - MIN_SCALE);
            finalPanX = panX * (1 - centerWeight);
            finalPanY = panY * (1 - centerWeight);
            
            // Actualizar panX y panY para mantener coherencia
            panX = finalPanX;
            panY = finalPanY;
        }
        
        // Agregar transición suave e interpolada
        img.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        img.style.transform = `scale(${currentScale}) translate(${finalPanX / currentScale}px, ${finalPanY / currentScale}px)`;
        img.style.cursor = 'zoom-out';
        
        document.querySelector('.gallery-controls')?.classList.add('hidden');
        document.querySelector('.overlay-words-layer')?.classList.add('hidden');
        document.querySelector('.collection-info')?.classList.add('hidden');
    } else {
        resetZoom();
    }
}

// Pinch zoom handlers
function handlePinchStart(e) {
    e.preventDefault();
    isPinching = true;
    isDragging = false;
    
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    
    initialDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
    );
    
    initialScale = currentScale;
    
    // Calcular punto focal entre los dos dedos
    pinchStartX = (touch1.clientX + touch2.clientX) / 2;
    pinchStartY = (touch1.clientY + touch2.clientY) / 2;
}

function handlePinchMove(e) {
    if (!isPinching) return;
    e.preventDefault();
    
    const card = e.target.closest('.gallery-card');
    if (!card || !card.classList.contains('active')) return;
    
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    
    const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
    );
    
    const scale = (currentDistance / initialDistance) * initialScale;
    currentScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
    
    // Calcular punto focal actual
    const currentFocalX = (touch1.clientX + touch2.clientX) / 2;
    const currentFocalY = (touch1.clientY + touch2.clientY) / 2;
    
    const rect = card.getBoundingClientRect();
    const relativeX = currentFocalX - rect.left;
    const relativeY = currentFocalY - rect.top;
    
    if (currentScale > MIN_SCALE) {
        isZoomed = true;
        card.classList.add('zoomed');
        
        const img = card.querySelector('img');
        if (img) {
            const imgRect = img.getBoundingClientRect();
            const imgCenterX = imgRect.width / 2;
            const imgCenterY = imgRect.height / 2;
            
            panX = (relativeX - imgCenterX) * (1 - currentScale);
            panY = (relativeY - imgCenterY) * (1 - currentScale);
            
            // Aplicar límites al pan
            const constrained = constrainPan(img, currentScale, panX, panY);
            panX = constrained.panX;
            panY = constrained.panY;
            
            // Interpolar hacia el centro SOLO durante zoom out (pinch in)
            let finalPanX = panX;
            let finalPanY = panY;
            
            if (currentScale < initialScale) {
                // Zoom out: interpolar progresivamente hacia el centro
                const centerWeight = (MAX_SCALE - currentScale) / (MAX_SCALE - MIN_SCALE);
                finalPanX = panX * (1 - centerWeight);
                finalPanY = panY * (1 - centerWeight);
                
                // Actualizar panX y panY con los valores interpolados
                panX = finalPanX;
                panY = finalPanY;
            }
            
            img.style.transition = 'none';
            img.style.transform = `scale(${currentScale}) translate(${finalPanX / currentScale}px, ${finalPanY / currentScale}px)`;
            
            document.querySelector('.gallery-controls')?.classList.add('hidden');
            document.querySelector('.overlay-words-layer')?.classList.add('hidden');
            document.querySelector('.collection-info')?.classList.add('hidden');
        }
    } else {
        resetZoom();
    }
}

function handlePinchEnd(e) {
    if (isPinching) {
        isPinching = false;
        if (currentScale <= MIN_SCALE) {
            resetZoom();
        }
    }
}

function toggleZoom(card) {
    if (isZoomed) {
        resetZoom();
    } else {
        // Zoom simple al centro
        currentScale = 2.5;
        isZoomed = true;
        card.classList.add('zoomed');
        
        const img = card.querySelector('img');
        if (img) {
            panX = 0;
            panY = 0;
            img.style.transform = `scale(${currentScale})`;
            img.style.cursor = 'zoom-out';
        }
        
        document.querySelector('.gallery-controls')?.classList.add('hidden');
        document.querySelector('.overlay-words-layer')?.classList.add('hidden');
        document.querySelector('.collection-info')?.classList.add('hidden');
    }
}

function resetZoom() {
    isZoomed = false;
    currentScale = MIN_SCALE;
    panX = 0;
    panY = 0;
    
    const activeCard = document.querySelector('.gallery-card.zoomed');
    if (activeCard) {
        activeCard.classList.remove('zoomed');
        const img = activeCard.querySelector('img');
        if (img) {
            img.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            img.style.transform = '';
            img.style.cursor = '';
            setTimeout(() => {
                if (img) img.style.transition = '';
            }, 500);
        }
    }
    
    document.querySelector('.gallery-controls')?.classList.remove('hidden');
    document.querySelector('.overlay-words-layer')?.classList.remove('hidden');
    document.querySelector('.collection-info')?.classList.remove('hidden');
}

// Animación de textos overlay
function animateOverlayWords() {
    const words = document.querySelectorAll('.overlay-word');
    if (words.length === 0) return;
    
    let currentWordIndex = 0;

    function showNextWord() {
        words.forEach(word => {
            if (word.classList.contains('active')) {
                word.classList.remove('active');
                word.classList.add('fading');
            }
        });

        setTimeout(() => {
            words.forEach(word => word.classList.remove('fading'));
            words[currentWordIndex].classList.add('active');
            currentWordIndex = (currentWordIndex + 1) % words.length;
        }, 600);
    }

    words[0].classList.add('active');
    currentWordIndex = 1;
    setInterval(showNextWord, 4000);
}

// Inicialización
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initGallery();
        animateOverlayWords();
        waitForGalleryImages().then(() => {
            requestAnimationFrame(hidePageLoader);
        });
    });
} else {
    initGallery();
    animateOverlayWords();
    waitForGalleryImages().then(() => {
        requestAnimationFrame(hidePageLoader);
    });
}

// Configurar efectos hover del cursor para gallery-cards
function setupGalleryHoverEffects() {
    const observeCards = () => {
        const cards = document.querySelectorAll('.gallery-card');
        
        cards.forEach(card => {
            // Evitar agregar listeners duplicados
            if (card.dataset.hoverConfigured) return;
            card.dataset.hoverConfigured = 'true';
            
            card.addEventListener('mouseenter', (e) => {
                if (isZoomed) return; // No hover effect durante zoom
                
                // Activar efecto de cursor hover
                if (window.targetCenterDotScale !== undefined) {
                    window.targetCenterDotScale = 1.6;
                }
                if (window.isHoveringElement !== undefined) {
                    window.isHoveringElement = true;
                }
                
                // Efecto visual sutil en el card
                const currentFilter = card.style.filter || '';
                if (!currentFilter.includes('brightness')) {
                    card.style.filter = currentFilter + ' brightness(1.05)';
                }
            });
            
            card.addEventListener('mouseleave', (e) => {
                // Desactivar efecto de cursor hover
                if (window.targetCenterDotScale !== undefined) {
                    window.targetCenterDotScale = 1;
                }
                if (window.isHoveringElement !== undefined) {
                    window.isHoveringElement = false;
                }
                
                // Restaurar filtro original (eliminar brightness hover)
                const currentFilter = card.style.filter || '';
                card.style.filter = currentFilter.replace(/brightness\([^)]*\)/g, '').trim();
            });
        });
    };
    
    // Observar cambios en el DOM para nuevas cards
    observeCards();
    const observer = new MutationObserver(observeCards);
    const track = document.getElementById('galleryTrack');
    if (track) {
        observer.observe(track, { childList: true, subtree: true });
    }
}

// Fallback si alguna imagen tarda demasiado
window.addEventListener('load', () => {
    setTimeout(hidePageLoader, 1500);
});
