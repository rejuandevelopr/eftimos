// Detect if device is mobile/tablet
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || window.innerWidth <= 1024 
    || ('ontouchstart' in window);
}

// Exit early if mobile device - don't create cursor
if (isMobileDevice()) {
  console.log('Mobile device detected - custom cursor disabled');
  // Do nothing on mobile
} else {
  // Desktop only - create custom cursor
  
  // Cursor container
  const cursorContainer = document.createElement('div');
  cursorContainer.id = 'customCursor';
  document.body.appendChild(cursorContainer);

  // Create center dot
  const centerDot = document.createElement('div');
  centerDot.className = 'cursor-center-dot';
  cursorContainer.appendChild(centerDot);

  // Create trail canvas
  const trailCanvas = document.createElement('canvas');
  trailCanvas.id = 'trailCanvas';
  document.body.appendChild(trailCanvas);
  const trailCtx = trailCanvas.getContext('2d', { alpha: true });
  
  // Set canvas size
  trailCanvas.width = window.innerWidth;
  trailCanvas.height = window.innerHeight;
  
  // Handle window resize
  window.addEventListener('resize', () => {
    trailCanvas.width = window.innerWidth;
    trailCanvas.height = window.innerHeight;
  });

const particles = [];
const particleCount = 40;

let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let smoothPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let prevMouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let mouseSpeed = 0;
let isHoveringMapItem = false;
let hoveredItemCenter = { x: 0, y: 0 };
let trailPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let currentTrailOpacity = 0;
let currentTrailRadius = 90;
let targetTrailOpacity = 0;
let targetTrailRadius = 90;

let clickBurst = false;
let burstTimer = 0;
let isMouseDown = false;
let hasDragged = false;
let isHoveringElement = false; // Track if hovering over an element
let targetCenterDotScale = 1; // Target scale for center dot

let shapeMode = "normal";
let currentLetter = "A";
let letterPoints = [];

class Particle {
  constructor(index) {
    this.index = index;
    this.element = document.createElement('div');
    this.element.className = 'cursor-particle';
    cursorContainer.appendChild(this.element);

    this.speedX = 0;
    this.speedY = 0;
    this.burstSpeed = Math.random() * 4 + 1;

    this.nebulaBaseRadius = 18 + Math.random() * 2;
    this.nebulaMinRadius = this.nebulaBaseRadius - 1.5;
    this.morphRadius = this.nebulaMinRadius;
    this.morphAngle = Math.random() * Math.PI * 2;
    this.nebulaSpeed = 0.03 + Math.random() * 0.02;

    this.x = mouse.x;
    this.y = mouse.y;
    this.targetX = mouse.x;
    this.targetY = mouse.y;
  }

  update() {
    // Click burst effect
    if (clickBurst && burstTimer > 0) {
      this.x += Math.cos(this.morphAngle) * this.burstSpeed;
      this.y += Math.sin(this.morphAngle) * this.burstSpeed;
      this.burstSpeed *= 0.9;
      return;
    }

    const morphSpeed = 0.15;

    const baseNebulaX = smoothPos.x + Math.cos(this.morphAngle) * this.morphRadius;
    const baseNebulaY = smoothPos.y + Math.sin(this.morphAngle) * this.morphRadius;

    // If user is holding mouse down, make the nebula follow the center very tightly
    if (isMouseDown) {
      // Much slower interpolation for a smooth transition when dragging
      const holdFollow = 0.60; // menor valor = transición más lenta
      const holdSpeedFactor = 0.10; // más lento
      const holdTargetRadius = 8;

      // Suavizar el radio de la nebulosa
      this.morphRadius += (holdTargetRadius - this.morphRadius) * 0.10;
      // Suavizar el ángulo
      this.morphAngle += this.nebulaSpeed * holdSpeedFactor;

      this.targetX = baseNebulaX;
      this.targetY = baseNebulaY;

      // Suavizar la posición de las partículas
      this.x += (this.targetX - this.x) * holdFollow;
      this.y += (this.targetY - this.y) * holdFollow;

      // damp velocities for stability
      this.speedX *= 0.10;
      this.speedY *= 0.10;
      return;
    }

  if (shapeMode === "normal") {
    this.morphRadius += (this.nebulaBaseRadius - this.morphRadius) * 0.05;
    this.morphAngle += this.nebulaSpeed;

    this.targetX += (baseNebulaX - this.targetX) * morphSpeed;
    this.targetY += (baseNebulaY - this.targetY) * morphSpeed;
  } else {
    this.setShapeTarget();

    const organicRadius = 1.2;
    const frequency = 3;
    const offsetX = Math.cos(this.morphAngle * frequency + this.index) * organicRadius;
    const offsetY = Math.sin(this.morphAngle * frequency + this.index) * organicRadius;
    this.shapeTargetX += offsetX;
    this.shapeTargetY += offsetY;

    this.targetX += (this.shapeTargetX - this.targetX) * morphSpeed;
    this.targetY += (this.shapeTargetY - this.targetY) * morphSpeed;

    this.morphAngle += this.nebulaSpeed;
  }

  let dx = this.targetX - this.x;
  let dy = this.targetY - this.y;
  this.speedX += dx * 0.15;
  this.speedY += dy * 0.15;
  this.speedX *= 0.7;
  this.speedY *= 0.7;
  this.x += this.speedX;
  this.y += this.speedY;
}

  setShapeTarget() {
    const idxRatio = this.index / particleCount;
    const spread = 60;

    if (shapeMode === "circle") {
      const radius = 30;
      const angle = idxRatio * Math.PI * 2;
      this.shapeTargetX = smoothPos.x + Math.cos(angle) * radius;
      this.shapeTargetY = smoothPos.y + Math.sin(angle) * radius;
    } else if (shapeMode === "spiral") {
      const spiralFactor = 6;
      const angle = idxRatio * Math.PI * 4;
      const radius = spiralFactor * angle;
      this.shapeTargetX = smoothPos.x + Math.cos(angle) * radius * 0.4;
      this.shapeTargetY = smoothPos.y + Math.sin(angle) * radius * 0.4;
    } else if (shapeMode === "triangle") {
      const side = 60;
      const segment = Math.floor(idxRatio * 3);
      const t = (idxRatio * 3) % 1;
      if (segment === 0) {
        this.shapeTargetX = smoothPos.x - side / 2 + side * t;
        this.shapeTargetY = smoothPos.y + side / 2;
      } else if (segment === 1) {
        this.shapeTargetX = smoothPos.x + side / 2 - side * t / 2;
        this.shapeTargetY = smoothPos.y + side / 2 - (Math.sqrt(3) / 2) * side * t;
      } else {
        this.shapeTargetX = smoothPos.x - side / 2 + side * t / 2;
        this.shapeTargetY = smoothPos.y + side / 2 - (Math.sqrt(3) / 2) * side * (1 - t);
      }
    } else if (shapeMode === "heart") {
      const t = idxRatio * Math.PI * 2;
      const scale = 6;
      const x = 16 * Math.sin(t) ** 3;
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      this.shapeTargetX = smoothPos.x + x * scale;
      this.shapeTargetY = smoothPos.y + y * scale;
    } else if (shapeMode === "letter") {
      if (letterPoints.length === 0) {
        this.shapeTargetX = smoothPos.x + (Math.random() - 0.5) * spread;
        this.shapeTargetY = smoothPos.y + (Math.random() - 0.5) * spread;
      } else {
        const pIndex = this.index % letterPoints.length;
        this.shapeTargetX = smoothPos.x + letterPoints[pIndex].x - 50;
        this.shapeTargetY = smoothPos.y + letterPoints[pIndex].y - 50;
      }
    } else {
      this.shapeTargetX = smoothPos.x + (Math.random() - 0.5) * spread;
      this.shapeTargetY = smoothPos.y + (Math.random() - 0.5) * spread;
    }
  }

  draw() {
    this.element.style.left = this.x + 'px';
    this.element.style.top = this.y + 'px';
  }
}

// Initialize particles
for (let i = 0; i < particleCount; i++) {
  particles.push(new Particle(i));
}

function animateCursor() {
  // Hide cursor if visual effects are disabled
  if (window.visualEffectsEnabled === false) {
    cursorContainer.style.opacity = '0';
    document.body.classList.add('show-default-cursor');
    requestAnimationFrame(animateCursor);
    return;
  } else {
    cursorContainer.style.opacity = '1';
    document.body.classList.remove('show-default-cursor');
  }
  
  const delayFactor = 0.3;
  smoothPos.x += (mouse.x - smoothPos.x) * delayFactor;
  smoothPos.y += (mouse.y - smoothPos.y) * delayFactor;

  // Update center dot position
  centerDot.style.left = smoothPos.x + 'px';
  centerDot.style.top = smoothPos.y + 'px';
  
  // Smooth scale animation for center dot
  let currentCenterDotScale = parseFloat(centerDot.style.scale) || 1;
  currentCenterDotScale += (targetCenterDotScale - currentCenterDotScale) * 0.15;
  centerDot.style.scale = currentCenterDotScale;

  particles.forEach(p => {
    p.update();
    p.draw();
  });

  // Handle burst timer
  if (clickBurst && burstTimer > 0) {
    burstTimer--;
    if (burstTimer <= 0) clickBurst = false;
  }
  
  // Calculate mouse speed
  const dx = mouse.x - prevMouse.x;
  const dy = mouse.y - prevMouse.y;
  const currentSpeed = Math.sqrt(dx * dx + dy * dy);
  
  // Smooth the speed value
  mouseSpeed += (currentSpeed - mouseSpeed) * 0.3;
  
  // Update previous mouse position
  prevMouse.x = mouse.x;
  prevMouse.y = mouse.y;
  
  // Trail painting on canvas
  // Only draw trail if visual effects are enabled
  if (window.visualEffectsEnabled !== false) {
    // First, fade out the existing trail using destination-out
    trailCtx.globalCompositeOperation = 'destination-out';
    trailCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
    trailCtx.globalCompositeOperation = 'source-over';

    // Calculate target trail position
    let targetTrailX, targetTrailY;
    let interp = 0.15;

    // Si está haciendo drag, no "imprimir" el trail, pero dejar que se desvanezca
    let printTrail = !(isMouseDown && hasDragged);

    if (isHoveringMapItem) {
      targetTrailX = (mouse.x + hoveredItemCenter.x) / 2;
      targetTrailY = (mouse.y + hoveredItemCenter.y) / 2;
      targetTrailOpacity = 0.25;
      targetTrailRadius = 140;
      interp = 0.15;
    } else if (mouseSpeed > 0.5) {
      targetTrailX = smoothPos.x;
      targetTrailY = smoothPos.y;
      const speedIntensity = Math.min(mouseSpeed / 20, 1);
      targetTrailOpacity = 0.08 * speedIntensity;
      targetTrailRadius = 90;
      interp = 0.15;
    } else {
      targetTrailX = smoothPos.x;
      targetTrailY = smoothPos.y;
      targetTrailOpacity = 0;
      targetTrailRadius = 90;
      interp = 0.05;
    }

    trailPosition.x += (targetTrailX - trailPosition.x) * interp;
    trailPosition.y += (targetTrailY - trailPosition.y) * interp;
    currentTrailOpacity += (targetTrailOpacity - currentTrailOpacity) * interp;
    currentTrailRadius += (targetTrailRadius - currentTrailRadius) * interp;

    // Solo "imprimir" el trail si no está en drag
    if (printTrail && currentTrailOpacity > 0.01) {
      const gradient = trailCtx.createRadialGradient(trailPosition.x, trailPosition.y, 0, trailPosition.x, trailPosition.y, currentTrailRadius);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${currentTrailOpacity})`);
      gradient.addColorStop(0.5, `rgba(0, 0, 0, ${currentTrailOpacity * 0.5})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      trailCtx.fillStyle = gradient;
      trailCtx.beginPath();
      trailCtx.arc(trailPosition.x, trailPosition.y, currentTrailRadius, 0, Math.PI * 2);
      trailCtx.fill();
    }
  } else {
    // Clear the trail canvas when visual effects are disabled
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
  }

  requestAnimationFrame(animateCursor);
}

// Track mouse movement
window.addEventListener("mousemove", e => {
  mouse.x = e.pageX;  // Use pageX instead of clientX to account for scroll
  mouse.y = e.pageY;  // Use pageY instead of clientY to account for scroll
  
  // If mouse is down and moving, it's a drag
  if (isMouseDown) {
    hasDragged = true;
  }
});


document.querySelectorAll("a, button, .video-link, .cinema-close, .menu-toggle").forEach(el => {
  el.addEventListener("mouseenter", () => {
    shapeMode = el.dataset.shape || "circle";
    if (shapeMode === "letter" && el.dataset.letter) {
      currentLetter = el.dataset.letter.toUpperCase();
      letterPoints = generateLetterPoints(currentLetter);
    }
    
    // Detect if hovering over a map item (inside #canvas)
    const isMapElement = el.closest('#canvas') !== null;
    if (isMapElement) {
      isHoveringMapItem = true;
      
      // Capture the center position of the hovered item
      const rect = el.getBoundingClientRect();
      hoveredItemCenter.x = rect.left + rect.width / 2;
      hoveredItemCenter.y = rect.top + rect.height / 2;
    }
    
    // Add focused class to parent image-container for visual focus effect
    const imageContainer = el.closest('.image-container');
    if (imageContainer) {
      imageContainer.classList.add('focused');
    }
    
    // Enlarge center dot on hover
    targetCenterDotScale = 1.6;
    isHoveringElement = true;
    
    // Check if element has a tooltip (image-link or video-link with tooltip)
    const hasTooltip = el.classList.contains('image-link') || el.classList.contains('video-link');
    
    if (isMapElement) {
      // Dispatch custom event with focused element position for radial blur effect
      const rect = el.getBoundingClientRect();
      window.dispatchEvent(new CustomEvent('elementFocused', {
        detail: {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: rect.width,
          height: rect.height
        }
      }));
      
      // Dispatch tooltip hover event for audio volume increase
      if (hasTooltip) {
        window.dispatchEvent(new CustomEvent('tooltipShown'));
      }
    }
  });
  el.addEventListener("mouseleave", () => {
    shapeMode = "normal";
    
    // Reset map item hover state
    const isMapElement = el.closest('#canvas') !== null;
    if (isMapElement) {
      isHoveringMapItem = false;
    }
    
    // Remove focused class from parent image-container
    const imageContainer = el.closest('.image-container');
    if (imageContainer) {
      imageContainer.classList.remove('focused');
    }
    
    // Shrink center dot back to normal
    targetCenterDotScale = 1;
    isHoveringElement = false;
    
    // Check if element had a tooltip
    const hasTooltip = el.classList.contains('image-link') || el.classList.contains('video-link');
    
    if (isMapElement) {
      // Dispatch event to clear focused element
      window.dispatchEvent(new CustomEvent('elementUnfocused'));
      
      // Dispatch tooltip hidden event for audio volume decrease
      if (hasTooltip) {
        window.dispatchEvent(new CustomEvent('tooltipHidden'));
      }
    }
  });
});

// Add hover detection for text-phrase elements
document.querySelectorAll('.text-phrase').forEach(el => {
  el.addEventListener('mouseenter', () => {
    const isMapElement = el.closest('#canvas') !== null;
    if (isMapElement) {
      isHoveringMapItem = true;
      
      // Capture the center position of the hovered item
      const rect = el.getBoundingClientRect();
      hoveredItemCenter.x = rect.left + rect.width / 2;
      hoveredItemCenter.y = rect.top + rect.height / 2;
    }
  });
  
  el.addEventListener('mouseleave', () => {
    const isMapElement = el.closest('#canvas') !== null;
    if (isMapElement) {
      isHoveringMapItem = false;
    }
  });
});


// Track mouse down
window.addEventListener("mousedown", () => {
  isMouseDown = true;
  hasDragged = false;
  // While holding, shrink center dot
  targetCenterDotScale = 0.6;
});

// Track mouse up and trigger burst only if it was a click (not a drag)
window.addEventListener("mouseup", () => {
  if (isMouseDown && !hasDragged) {
    // It was a click, not a drag - trigger burst
    clickBurst = true;
    burstTimer = 15;
    particles.forEach(p => {
      p.morphAngle = Math.random() * Math.PI * 2;
      p.burstSpeed = Math.random() * 6 + 2;
    });
  }
  
  isMouseDown = false;
  hasDragged = false;
  // Restore center dot size: if still hovering an element, keep enlarged; otherwise normal
  targetCenterDotScale = isHoveringElement ? 1.6 : 1;
});

  // Start animation
  animateCursor();
} // End of desktop-only code