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

// Random position offset range (in pixels)
const randomOffsetRange = 150;

// Buffer space (10% of screen size on each side)
const bufferPercent = 0.1;

// Smooth scrolling parameters
const smoothness = 0.08;
const friction = 0; // 0.94
const minVelocity = 0.1;

// Zoom parameters
let scale = 1;
let targetScale = 1;
const minScale = 0.8;   // No zoom out - initial is minimum
const maxScale = 2.5;   // Can zoom in to 200% (2x from initial)
const zoomSpeed = 0.1;
const zoomSmoothness = 0.15;

// Load base images from HTML
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

// Cache window dimensions
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

// Initialize offsets
let offsetX = 0;
let offsetY = 0;
let targetOffsetX = 0;
let targetOffsetY = 0;
let velocityX = 0;
let velocityY = 0;
let isDragging = false;
let lastX, lastY;
let images = [];

// Pre-calculate blur radius scaled value to avoid repeated multiplication
let blurRadiusScaled = blurRadius * scale;

// Seeded random number generator for consistent random offsets
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// Random offsets storage with seeded randomness
const randomOffsets = new Map();
function getRandomOffset(gridX, gridY) {
    const key = `${gridX},${gridY}`;
    if (!randomOffsets.has(key)) {
        // Use grid position as seed for consistent randomness
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
    
    // Clone the entire content including the anchor tag
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
    // Clear existing images
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

        // Calculate offset for centering incomplete rows
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

// Calculate initial position to center on middle image
function getInitialCenterPosition() {
    if (images.length === 0) {
        return { x: 0, y: 0 };
    }
    
    // Find the image that should be centered initially
    let targetImage = null;
    
    // First, check if any base template has the 'initial-center' class
    imageTemplates.forEach((template, index) => {
        if (template.classList.contains('initial-center')) {
            targetImage = images.find(img => img.imageIndex === index);
        }
    });
    
    // Fallback: if no image has the class, use the 2nd image of middle row (original behavior)
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

function updateImagePositions() {
    // Pre-calculate values used in loop
    const offsetXScaled = offsetX * scale;
    const offsetYScaled = offsetY * scale;
    const imageSizeScaled = imageSize * scale;
    const imageSizeScaledHalf = imageSizeScaled / 2;
    const blurThreshold = blurRadiusScaled;
    
    // Use for loop instead of forEach for better performance
    const len = images.length;
    for (let i = 0; i < len; i++) {
        const img = images[i];
        const randomOffset = getRandomOffset(img.gridX, img.gridY);

        // Apply scale to grid positions relative to offset
        const baseX = img.gridX * gridSpacing + randomOffset.x;
        const baseY = img.gridY * gridSpacing + randomOffset.y;
        
        const x = baseX * scale + offsetXScaled + centerX;
        const y = baseY * scale + offsetYScaled + centerY;

        // Batch style updates
        const element = img.element;
        const style = element.style;
        
        style.left = (x - imageSizeScaledHalf) + 'px';
        style.top = (y - imageSizeScaledHalf) + 'px';
        style.transform = `scale(${scale})`;

        // Calculate blur distance from center (works on all devices including mobile)
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
        // Cache calculations
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
        } else {
            velocityX = 0;
            velocityY = 0;
        }
    }

    // Smooth zoom animation
    const scaleDiff = targetScale - scale;
    scale += scaleDiff * zoomSmoothness;
    
    // Update blur radius scaled value when scale changes
    if (scaleDiff !== 0) {
        blurRadiusScaled = blurRadius * scale;
    }

    updateImagePositions();
    requestAnimationFrame(animate);
}

// Mouse events
let dragStartX, dragStartY;
let hasMoved = false;

// Mouse events
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

    // Check if user has moved enough to be considered a drag
    const totalMoveX = Math.abs(e.clientX - dragStartX);
    const totalMoveY = Math.abs(e.clientY - dragStartY);
    if (totalMoveX > 5 || totalMoveY > 5) {
        hasMoved = true;
    }

    // Normalize drag speed by scale to maintain consistent feel
    const scaleInv = 1 / scale; // Cache division
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

// Only prevent link clicks if user actually dragged
canvas.addEventListener('click', (e) => {
    // Search for link both up (closest) and down (querySelector)
    let link = e.target.closest('.image-link');
    if (!link && e.target.classList.contains('image-container')) {
        link = e.target.querySelector('.image-link');
    }
    
    if (link && hasMoved) {
        // User dragged - prevent the link
        e.preventDefault();
        e.stopPropagation();
    } else if (link && !hasMoved) {
        // User clicked - navigate
        window.location.href = link.href;
    }
    
    // Reset hasMoved after handling the click
    hasMoved = false;
});

// Touch events
canvas.addEventListener('touchstart', (e) => {
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
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - lastX;
    const deltaY = touch.clientY - lastY;

    // Check if user has moved enough to be considered a drag
    const totalMoveX = Math.abs(touch.clientX - dragStartX);
    const totalMoveY = Math.abs(touch.clientY - dragStartY);
    if (totalMoveX > 5 || totalMoveY > 5) {
        hasMoved = true;
    }

    // Normalize drag speed by scale to maintain consistent feel
    const scaleInv = 1 / scale; // Cache division
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
}, { passive: false });

canvas.addEventListener('touchend', () => {
    isDragging = false;
    canvas.classList.remove('dragging');
    // Reset hasMoved after touch ends
    setTimeout(() => { hasMoved = false; }, 10);
});

// Wheel event for zoom
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    const delta = e.deltaY;
    const zoomFactor = delta > 0 ? (1 - zoomSpeed) : (1 + zoomSpeed);
    
    // Store old scale before zoom
    const oldScale = targetScale;
    
    // Calculate new scale
    targetScale = Math.max(minScale, Math.min(maxScale, targetScale * zoomFactor));
    
    // If scale didn't change (hit min/max), don't adjust offsets
    if (oldScale === targetScale) return;
    
    // Get mouse position relative to canvas center
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    // Calculate the world position under the mouse before zoom
    const oldScaleInv = 1 / oldScale;
    const worldX = (mouseX - offsetX * oldScale) * oldScaleInv;
    const worldY = (mouseY - offsetY * oldScale) * oldScaleInv;
    
    // Adjust offsets so the world position under mouse stays the same
    const targetScaleInv = 1 / targetScale;
    targetOffsetX = (mouseX - worldX * targetScale) * targetScaleInv;
    targetOffsetY = (mouseY - worldY * targetScale) * targetScaleInv;
    
    clampOffset();
}, { passive: false });

// Optimized resize handler with debounce and responsive updates
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Update responsive settings
        const oldSettings = { ...settings };
        settings = getResponsiveSettings();
        gridSpacing = settings.gridSpacing;
        imageSize = settings.imageSize;
        blurRadius = settings.blurRadius;
        const oldColumns = gridColumns;
        gridColumns = settings.gridColumns;
        
        // Update window dimensions
        windowWidth = window.innerWidth;
        windowHeight = window.innerHeight;
        centerX = windowWidth / 2;
        centerY = windowHeight / 2;
        
        // Recalculate buffer and bounds
        bufferX = windowWidth * bufferPercent;
        bufferY = windowHeight * bufferPercent;
        
        gridRows = Math.ceil(totalImages / gridColumns);
        contentWidth = (gridColumns - 1) * gridSpacing;
        contentHeight = (gridRows - 1) * gridSpacing;
        
        minOffsetX = -contentWidth - bufferX;
        maxOffsetX = bufferX;
        minOffsetY = -contentHeight - bufferY;
        maxOffsetY = bufferY;
        
        // Recalculate blur radius scaled
        blurRadiusScaled = blurRadius * scale;
        
        // If columns changed, recreate the grid
        if (oldColumns !== gridColumns) {
            createAllImages();
            const initialPosition = getInitialCenterPosition();
            offsetX = initialPosition.x;
            offsetY = initialPosition.y;
            targetOffsetX = initialPosition.x;
            targetOffsetY = initialPosition.y;
        }
        
        // Clamp offsets to new bounds
        clampOffset();
        offsetX = targetOffsetX;
        offsetY = targetOffsetY;
    }, 150);
});

// Initialize
createAllImages();

// Set initial position to center on middle image
const initialPosition = getInitialCenterPosition();
offsetX = initialPosition.x;
offsetY = initialPosition.y;
targetOffsetX = initialPosition.x;
targetOffsetY = initialPosition.y;

// Start animation
animate();