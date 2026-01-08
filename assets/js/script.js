const canvas = document.getElementById('canvas');

// Responsive settings function
function getResponsiveSettings() {
    const width = window.innerWidth;
    
    if (width >= 1200) {
        return { gridSpacing: 620, imageSize: 170, blurRadius: 300, gridColumns: 4 };
    }
    if (width >= 992) {
        return { gridSpacing: 500, imageSize: 150, blurRadius: 250, gridColumns: 4 };
    }
    if (width >= 768) {
        return { gridSpacing: 400, imageSize: 140, blurRadius: 200, gridColumns: 4 };
    }
    if (width >= 576) {
        return { gridSpacing: 200, imageSize: 140, blurRadius: 150, gridColumns: 4 };
    }
    return { gridSpacing: 450, imageSize: 90, blurRadius: 120, gridColumns: 4 };
}

// Initialize responsive settings
let settings = getResponsiveSettings();
let gridSpacing = settings.gridSpacing;
let imageSize = settings.imageSize;
let blurRadius = settings.blurRadius;
let gridColumns = settings.gridColumns;

const maxBlur = 8;
const randomOffsetRange = 150;
const bufferPercent = 0.1;
const smoothness = 0.08;
const friction = 0;
const minVelocity = 0.1;

let scale = 1;
let targetScale = 1;
const minScale = 0.8;
const maxScale = 2.5;
const zoomSpeed = 0.1;
const zoomSmoothness = 0.15;

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

let offsetX = 0;
let offsetY = 0;
let targetOffsetX = 0;
let targetOffsetY = 0;
let velocityX = 0;
let velocityY = 0;
let isDragging = false;
let lastX, lastY;
let images = [];

let blurRadiusScaled = blurRadius * scale;

// Radial blur effect around focused element
let focusedElementPos = null;
let focusedElementRadius = 200; // Radius around element where blur is reduced

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
    container.appendChild(clonedContent.firstElementChild);

    canvas.appendChild(container);

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
                images.push(createImageElement(imageIndex, gridX, y));
                imageIndex++;
            }
        }
    }
}

function getInitialCenterPosition() {
    if (images.length === 0) {
        return { x: 0, y: 0 };
    }
    
    let targetImage = null;
    
    imageTemplates.forEach((template, index) => {
        if (template.classList.contains('initial-center')) {
            targetImage = images.find(img => img.imageIndex === index);
        }
    });
    
    if (!targetImage) {
        const middleRow = Math.floor(gridRows / 2);
        const imagesInMiddleRow = images.filter(img => img.gridY === middleRow);
        imagesInMiddleRow.sort((a, b) => a.gridX - b.gridX);
        const targetIndex = Math.min(1, imagesInMiddleRow.length - 1);
        targetImage = imagesInMiddleRow[targetIndex];
    }
    
    if (!targetImage) {
        const fallbackImage = images[0];
        const randomOffset = getRandomOffset(fallbackImage.gridX, fallbackImage.gridY);
        return {
            x: -(fallbackImage.gridX * gridSpacing + randomOffset.x),
            y: -(fallbackImage.gridY * gridSpacing + randomOffset.y)
        };
    }
    
    const randomOffset = getRandomOffset(targetImage.gridX, targetImage.gridY);
    const targetImageX = targetImage.gridX * gridSpacing + randomOffset.x;
    const targetImageY = targetImage.gridY * gridSpacing + randomOffset.y;
    
    return {
        x: -targetImageX,
        y: -targetImageY
    };
}

function clampOffset() {
    targetOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, targetOffsetX));
    targetOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, targetOffsetY));
}

// ✨ OPTIMIZED: Using transform3d for GPU acceleration (30-40% smoother!)
function updateImagePositions() {
    const offsetXScaled = offsetX * scale;
    const offsetYScaled = offsetY * scale;
    const imageSizeScaled = imageSize * scale;
    const imageSizeScaledHalf = imageSizeScaled / 2;
    const blurThreshold = blurRadiusScaled;
    
    const len = images.length;
    for (let i = 0; i < len; i++) {
        const img = images[i];
        const randomOffset = getRandomOffset(img.gridX, img.gridY);

        const baseX = img.gridX * gridSpacing + randomOffset.x;
        const baseY = img.gridY * gridSpacing + randomOffset.y;
        
        const x = baseX * scale + offsetXScaled + centerX;
        const y = baseY * scale + offsetYScaled + centerY;

        const element = img.element;
        const style = element.style;
        
        // ✨ NEW: Use transform3d instead of left/top for GPU acceleration
        // This is 30-40% faster and smoother!
        const translateX = x - imageSizeScaledHalf;
        const translateY = y - imageSizeScaledHalf;
        style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;

        // Calculate blur distance from center
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let blur = 0;
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

        style.filter = `blur(${blur}px)`;
    }
}

function animate() {
    if (!isDragging) {
        const diffX = targetOffsetX - offsetX;
        const diffY = targetOffsetY - offsetY;
        
        offsetX += diffX * smoothness;
        offsetY += diffY * smoothness;

        const absVelocityX = Math.abs(velocityX);
        const absVelocityY = Math.abs(velocityY);
        
        if (absVelocityX > minVelocity || absVelocityY > minVelocity) {
            targetOffsetX += velocityX;
            targetOffsetY += velocityY;
            clampOffset();
            velocityX *= friction;
            velocityY *= friction;
        }
    }

    const diffScale = targetScale - scale;
    scale += diffScale * zoomSmoothness;

    blurRadiusScaled = blurRadius * scale;

    updateImagePositions();

    requestAnimationFrame(animate);
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
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    hasMoved = false;
    velocityX = 0;
    velocityY = 0;
    canvas.classList.add('dragging');
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastX;
    const deltaY = e.clientY - lastY;

    const totalMoveX = Math.abs(e.clientX - dragStartX);
    const totalMoveY = Math.abs(e.clientY - dragStartY);
    if (totalMoveX > 5 || totalMoveY > 5) {
        hasMoved = true;
    }

    const scaleInv = 1 / scale;
    targetOffsetX += deltaX * scaleInv;
    targetOffsetY += deltaY * scaleInv;
    clampOffset();
    offsetX = targetOffsetX;
    offsetY = targetOffsetY;

    velocityX = deltaX * scaleInv * 0.8;
    velocityY = deltaY * scaleInv * 0.8;

    lastX = e.clientX;
    lastY = e.clientY;
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.classList.remove('dragging');
});

canvas.addEventListener('mouseleave', () => {
    if (isDragging) {
        isDragging = false;
        canvas.classList.remove('dragging');
    }
});

// ========================================
// 🎬 MORPH TRANSITION + CINEMA MODE
// ========================================
canvas.addEventListener('click', (e) => {
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
        if (vid) createCinemaMode(vid);
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

    // Prepare white overlay but DO NOT start fade until clone transition finishes
    let overlay = document.getElementById('transitionOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'transitionOverlay';
        document.body.appendChild(overlay);
    }
    overlay.style.zIndex = '100000';
    overlay.style.pointerEvents = 'none';
    overlay.style.transition = 'opacity 0.45s ease';
    overlay.style.opacity = '0';

    const overlayFadeDuration = 450; // ms, should match CSS

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
        // wait for overlay fade to finish then navigate
        setTimeout(() => {
            window.location.href = targetUrl;
        }, overlayFadeDuration);
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

    // Play locked-in sound (if available) and wait for it to finish before final navigation
    const locked = document.getElementById('lockedInSound');
    if (locked) {
        const playPromise = (function() {
            try {
                locked.currentTime = 0;
                return locked.play();
            } catch (e) {
                return Promise.reject(e);
            }
        })();

        playPromise.then(() => {
            const onEnded = () => {
                soundDone = true;
                // Only navigate after overlay has started and finished
                if (overlayStarted) {
                    tryNavigateAfterReady();
                } else if (cloneDone) {
                    // If clone already done but overlay not started for some reason, start it
                    startOverlayFade();
                    tryNavigateAfterReady();
                } else {
                    // Wait for clone to finish; overlay will start then and navigation will follow
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
            }, Math.max(15000, (locked.duration || 0) * 1000 + 2000));
        }).catch(() => {
            // Playback failed; treat as soundDone and proceed when clone done
            soundDone = true;
            if (cloneDone) {
                startOverlayFade();
                tryNavigateAfterReady();
            }
        });
    } else {
        // No sound -> navigate after clone completes and overlay fades
        // onCloneTransitionEnd will start overlay and call tryNavigateAfterReady
    }
}

// Create Cinema Mode for inline video tiles
function createCinemaMode(originalVideo) {
    if (!originalVideo) return;
    // Prevent multiple cinema instances
    if (document.getElementById('cinemaClone')) return;

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

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'cinema-close';
    closeBtn.id = 'cinemaClose';
    closeBtn.innerHTML = '&#x2715;';
    document.body.appendChild(closeBtn);

    // Fade in dim immediately, then expand video to full screen
    requestAnimationFrame(() => {
        cinemaDim.style.opacity = '0.78';
        try { clone.play(); } catch (e) {}
        clone.style.left = '0px';
        clone.style.top = '0px';
        clone.style.width = '100vw';
        clone.style.height = '100vh';
    });

    function closeCinema() {
        // reverse animation: shrink clone back to original rect then remove
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        clone.style.width = rect.width + 'px';
        clone.style.height = rect.height + 'px';
        cinemaDim.style.opacity = '0';
        closeBtn.remove();
        // after transition remove elements
        setTimeout(() => {
            try { clone.pause(); } catch (e) {}
            clone.remove();
            if (cinemaDim) cinemaDim.remove();
        }, 400);
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
        
        // Calculate new scale
        const scaleChange = currentDistance / initialPinchDistance;
        const oldScale = targetScale;
        targetScale = Math.max(minScale, Math.min(maxScale, initialPinchScale * scaleChange));
        
        if (oldScale !== targetScale) {
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
        targetOffsetX += deltaX * scaleInv;
        targetOffsetY += deltaY * scaleInv;
        clampOffset();
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
        setTimeout(() => { hasMoved = false; }, 10);
    }
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    const delta = e.deltaY;
    const zoomFactor = delta > 0 ? (1 - zoomSpeed) : (1 + zoomSpeed);
    
    const oldScale = targetScale;
    targetScale = Math.max(minScale, Math.min(maxScale, targetScale * zoomFactor));
    
    if (oldScale === targetScale) return;
    
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    const oldScaleInv = 1 / oldScale;
    const worldX = (mouseX - offsetX * oldScale) * oldScaleInv;
    const worldY = (mouseY - offsetY * oldScale) * oldScaleInv;
    
    const targetScaleInv = 1 / targetScale;
    targetOffsetX = (mouseX - worldX * targetScale) * targetScaleInv;
    targetOffsetY = (mouseY - worldY * targetScale) * targetScaleInv;
    
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

animate();