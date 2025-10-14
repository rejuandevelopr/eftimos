const canvas = document.getElementById('canvas');
const gridSpacing = 620;
const imageSize = 220; // Updated to match CSS
const blurRadius = 300;
const maxBlur = 8;

// Fixed 4 columns per row
const gridColumns = 4;

// Random position offset range (in pixels)
const randomOffsetRange = 150;

// Buffer space (10% of screen size on each side)
const bufferPercent = 0.1;

// Smooth scrolling parameters
const smoothness = 0.08;
const friction = 0.94;
const minVelocity = 0.1;

// Zoom parameters
let scale = 1;
let targetScale = 1;
const minScale = 1;   // No zoom out - initial is minimum
const maxScale = 2;   // Can zoom in to 200% (2x from initial)
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
const gridRows = Math.ceil(totalImages / gridColumns);

console.log(`Grid: ${gridColumns} columns × ${gridRows} rows for ${totalImages} images`);

const bufferX = window.innerWidth * bufferPercent;
const bufferY = window.innerHeight * bufferPercent;

const contentWidth = (gridColumns - 1) * gridSpacing;
const contentHeight = (gridRows - 1) * gridSpacing;

const minOffsetX = -contentWidth - bufferX;
const maxOffsetX = bufferX;
const minOffsetY = -contentHeight - bufferY;
const maxOffsetY = bufferY;

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

    const imageData = baseImages[imageIndex];

    const img = document.createElement('img');
    img.src = imageData.src;
    img.alt = imageData.alt;

    container.appendChild(img);
    canvas.appendChild(container);

    return {
        element: container,
        gridX: gridX,
        gridY: gridY,
        imageIndex: imageIndex
    };
}

function createAllImages() {
    images = []; // Clear existing images
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
                console.log(`Created image ${imageIndex} at grid position (${gridX}, ${y})`);
                imageIndex++;
            }
        }
    }
    
    console.log(`Total images created: ${images.length}`);
}

// Calculate initial position to center on middle image
function getInitialCenterPosition() {
    if (images.length === 0) {
        console.error('No images found!');
        return { x: 0, y: 0 };
    }
    
    // Find the middle row
    const middleRow = Math.floor(gridRows / 2);
    
    // Get images in the middle row
    const imagesInMiddleRow = images.filter(img => img.gridY === middleRow);
    
    if (imagesInMiddleRow.length === 0) {
        console.error('No images found in middle row!');
        const fallbackImage = images[0];
        const randomOffset = getRandomOffset(fallbackImage.gridX, fallbackImage.gridY);
        return {
            x: -(fallbackImage.gridX * gridSpacing + randomOffset.x),
            y: -(fallbackImage.gridY * gridSpacing + randomOffset.y)
        };
    }
    
    // Sort by gridX to get images left to right
    imagesInMiddleRow.sort((a, b) => a.gridX - b.gridX);
    
    // Always get the 2nd image (index 1) if it exists, otherwise get the first image
    const targetIndex = Math.min(1, imagesInMiddleRow.length - 1);
    const middleImage = imagesInMiddleRow[targetIndex];
    
    console.log(`Total images: ${totalImages}`);
    console.log(`Grid: ${gridRows} rows × ${gridColumns} columns`);
    console.log(`Middle row: ${middleRow}`);
    console.log(`Images in middle row: ${imagesInMiddleRow.length}`);
    console.log(`Targeting 2nd image (index 1) of middle row`);
    console.log(`Centering on image index: ${middleImage.imageIndex} at grid position (${middleImage.gridX}, ${middleImage.gridY})`);
    
    // Get the random offset for this specific image
    const randomOffset = getRandomOffset(middleImage.gridX, middleImage.gridY);
    
    // Calculate the position of the middle image in the grid
    const middleImageX = middleImage.gridX * gridSpacing + randomOffset.x;
    const middleImageY = middleImage.gridY * gridSpacing + randomOffset.y;
    
    console.log(`Middle image world position: (${middleImageX}, ${middleImageY})`);
    console.log(`Random offset applied: (${randomOffset.x}, ${randomOffset.y})`);
    
    // Calculate offset needed to center this image
    return {
        x: -middleImageX,
        y: -middleImageY
    };
}

function clampOffset() {
    targetOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, targetOffsetX));
    targetOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, targetOffsetY));
}

function updateImagePositions() {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    images.forEach(img => {
        const randomOffset = getRandomOffset(img.gridX, img.gridY);

        // Apply scale to grid positions relative to offset
        const baseX = img.gridX * gridSpacing + randomOffset.x;
        const baseY = img.gridY * gridSpacing + randomOffset.y;
        
        const x = baseX * scale + offsetX * scale + centerX;
        const y = baseY * scale + offsetY * scale + centerY;

        img.element.style.left = (x - (imageSize * scale) / 2) + 'px';
        img.element.style.top = (y - (imageSize * scale) / 2) + 'px';
        
        // Apply scale transform
        img.element.style.transform = `scale(${scale})`;

        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let blur = 0;
        if (distance > blurRadius * scale) {
            blur = Math.min(maxBlur, (distance - blurRadius * scale) / 100 * maxBlur);
        }

        img.element.style.filter = `blur(${blur}px)`;
    });
}

function animate() {
    if (!isDragging) {
        offsetX += (targetOffsetX - offsetX) * smoothness;
        offsetY += (targetOffsetY - offsetY) * smoothness;

        if (Math.abs(velocityX) > minVelocity || Math.abs(velocityY) > minVelocity) {
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
    scale += (targetScale - scale) * zoomSmoothness;

    updateImagePositions();
    requestAnimationFrame(animate);
}

// Mouse events
canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    velocityX = 0;
    velocityY = 0;
    canvas.classList.add('dragging');
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastX;
    const deltaY = e.clientY - lastY;

    // Normalize drag speed by scale to maintain consistent feel
    targetOffsetX += deltaX / scale;
    targetOffsetY += deltaY / scale;
    clampOffset();
    offsetX = targetOffsetX;
    offsetY = targetOffsetY;

    velocityX = (deltaX / scale) * 0.8;
    velocityY = (deltaY / scale) * 0.8;

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

// Touch events
canvas.addEventListener('touchstart', (e) => {
    isDragging = true;
    const touch = e.touches[0];
    lastX = touch.clientX;
    lastY = touch.clientY;
    velocityX = 0;
    velocityY = 0;
    canvas.classList.add('dragging');
    e.preventDefault();
});

canvas.addEventListener('touchmove', (e) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - lastX;
    const deltaY = touch.clientY - lastY;

    // Normalize drag speed by scale to maintain consistent feel
    targetOffsetX += deltaX / scale;
    targetOffsetY += deltaY / scale;
    clampOffset();
    offsetX = targetOffsetX;
    offsetY = targetOffsetY;

    velocityX = (deltaX / scale) * 0.8;
    velocityY = (deltaY / scale) * 0.8;

    lastX = touch.clientX;
    lastY = touch.clientY;
    e.preventDefault();
});

canvas.addEventListener('touchend', () => {
    isDragging = false;
    canvas.classList.remove('dragging');
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
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    // Calculate the world position under the mouse before zoom
    const worldX = (mouseX - offsetX * oldScale) / oldScale;
    const worldY = (mouseY - offsetY * oldScale) / oldScale;
    
    // Adjust offsets so the world position under mouse stays the same
    targetOffsetX = (mouseX - worldX * targetScale) / targetScale;
    targetOffsetY = (mouseY - worldY * targetScale) / targetScale;
    
    clampOffset();
}, { passive: false });

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