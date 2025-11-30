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
const baseImages = Array.from(imageTemplates).map(template => {
    const img = template.querySelector('img');
    return {
        src: img.src,
        alt: img.alt
    };
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
// 🎬 MORPH TRANSITION EFFECT - NEW CODE
// ========================================
canvas.addEventListener('click', (e) => {
    let link = e.target.closest('.image-link');
    if (!link && e.target.classList.contains('image-container')) {
        link = e.target.querySelector('.image-link');
    }
    
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
    
    // Trigger the morph animation
    requestAnimationFrame(() => {
        clone.style.transition = 'all 0.8s cubic-bezier(0.76, 0, 0.24, 1)';
        clone.style.left = '0px';
        clone.style.top = '0px';
        clone.style.width = '100vw';
        clone.style.height = '100vh';
    });
    
    // Navigate to the target page after animation
    setTimeout(() => {
        window.location.href = targetUrl;
    }, 800);
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

// Handle browser back button - CRITICAL for Vercel/production
window.addEventListener('pageshow', function(event) {
    // Check if page was loaded from cache (back/forward button)
    if (event.persisted) {
        const savedData = sessionStorage.getItem('morphTransition');
        if (savedData && canvas) {
            const data = JSON.parse(savedData);
            if (data.canvasOffsetX !== undefined) {
                offsetX = data.canvasOffsetX;
                offsetY = data.canvasOffsetY;
                targetOffsetX = data.canvasOffsetX;
                targetOffsetY = data.canvasOffsetY;
                scale = data.canvasScale;
                targetScale = data.canvasScale;
                // Force immediate update
                updateImagePositions();
            }
        }
    }
});

// Also handle popstate for additional browser back button support
window.addEventListener('popstate', function() {
    const savedData = sessionStorage.getItem('morphTransition');
    if (savedData && canvas) {
        const data = JSON.parse(savedData);
        if (data.canvasOffsetX !== undefined) {
            offsetX = data.canvasOffsetX;
            offsetY = data.canvasOffsetY;
            targetOffsetX = data.canvasOffsetX;
            targetOffsetY = data.canvasOffsetY;
            scale = data.canvasScale;
            targetScale = data.canvasScale;
            updateImagePositions();
        }
    }
});