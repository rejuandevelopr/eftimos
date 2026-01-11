// Touch (mobile)
window.addEventListener("touchstart", e => {
  const pos = getEventPos(e);
  isMouseDown = true;
  hasDragged = false;
  holdActive = false;
  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    if (isMouseDown && !holdActive) {
      holdActive = true;
      window._dragTrail = {
        radius: Math.max(window.innerWidth, window.innerHeight) * 0.45, // start large, animate in
        opacity: 0.13,
        state: 'contract',
        x: pos.x,
        y: pos.y
      };
    }
  }, HOLD_THRESHOLD);
  // Only trigger ripple if touch is on map or its elements and not dragging
  if (hasDragged) return;
  const el = document.elementFromPoint(pos.x - window.scrollX, pos.y - window.scrollY);
  if (el && (el.closest && el.closest('#canvas') || el.classList && (el.classList.contains('image-link') || el.classList.contains('video-link')))) {
    triggerRipple(pos.x, pos.y);
  }
});

window.addEventListener("touchend", () => {
  clearTimeout(holdTimer);
  isMouseDown = false;
  hasDragged = false;
  holdActive = false;
});
// Detect if device is mobile/tablet
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || window.innerWidth <= 1024 
    || ('ontouchstart' in window);
}

// Always create the trail canvas for ripple feedback (desktop & mobile)
let shapeMode = 'normal';
const isMobile = isMobileDevice();
let cursorContainer, centerDot;
if (!isMobile) {
  cursorContainer = document.createElement('div');
  cursorContainer.id = 'customCursor';
  document.body.appendChild(cursorContainer);
  centerDot = document.createElement('div');
  centerDot.className = 'cursor-center-dot';
  cursorContainer.appendChild(centerDot);
}

const trailCanvas = document.createElement('canvas');
trailCanvas.id = 'trailCanvas';
document.body.appendChild(trailCanvas);
const trailCtx = trailCanvas.getContext('2d', { alpha: true });
trailCanvas.width = window.innerWidth;
trailCanvas.height = window.innerHeight;
window.addEventListener('resize', () => {
  trailCanvas.width = window.innerWidth;
  trailCanvas.height = window.innerHeight;
});
// Ripple effect state
const ripples = [];
function triggerRipple(x, y) {
  ripples.push({
    x,
    y,
    radius: 0,
    maxRadius: Math.max(window.innerWidth, window.innerHeight) * 1.1, // covers whole page
    opacity: 0.09, // less intense
    alive: true
  });
}

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
let holdActive = false;
let holdTimer = null;

const HOLD_THRESHOLD = 320; // ms to consider a simple hold
let targetCenterDotScale = 1; // Target scale for center dot
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
  if (typeof centerDot === 'undefined' || !centerDot) {
    console.warn('centerDot NO existe o es undefined');
  } else {
    console.log('centerDot SÍ existe');
  }
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
  console.log('shapeMode', typeof shapeMode !== 'undefined' ? shapeMode : 'NO DEFINIDO');
  if (centerDot) {
    centerDot.style.left = smoothPos.x + 'px';
    centerDot.style.top = smoothPos.y + 'px';
    console.log('centerDot', smoothPos.x, smoothPos.y);
  } else {
    console.warn('centerDot existe pero es null');
  }
  
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
  
  // Trail and ripple painting on canvas
  // Limpia el canvas completamente durante drag/hold para evitar ghosting
  if ((isMouseDown && (hasDragged || holdActive)) || (window._dragTrail && window._dragTrail.state === 'contract')) {
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
  } else {
    // Fade out normal cuando no hay drag/hold
    trailCtx.globalCompositeOperation = 'destination-out';
    trailCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
    trailCtx.globalCompositeOperation = 'source-over';
  }

  // --- Trail logic (desktop only, if enabled) ---
  if (!isMobile && window.visualEffectsEnabled !== false) {
    let targetTrailX, targetTrailY;
    let interp = 0.15;
    // Inverse trail for drag
    if ((isMouseDown && (hasDragged || holdActive)) || (window._dragTrail && window._dragTrail.state === 'contract')) {
      // Draw a contracting ring from outside to inside, keep animating as long as holding
      const dragCenterX = smoothPos.x;
      const dragCenterY = smoothPos.y;
      // Crear instancia al inicio y actualizar la posición para que siga el mouse
      if (!window._dragTrail) {
        window._dragTrail = {
          radius: 48,
          opacity: 0.13,
          state: 'contract',
          x: dragCenterX,
          y: dragCenterY
        };
      } else {
        window._dragTrail.x = dragCenterX;
        window._dragTrail.y = dragCenterY;
      }
      if (window._dragTrail.opacity > 0.01) {
        const grad = trailCtx.createRadialGradient(
          window._dragTrail.x, window._dragTrail.y, window._dragTrail.radius * 0.7,
          window._dragTrail.x, window._dragTrail.y, window._dragTrail.radius
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.7, `rgba(0,0,0,${window._dragTrail.opacity})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        trailCtx.save();
        trailCtx.globalAlpha = 1;
        trailCtx.fillStyle = grad;
        trailCtx.beginPath();
        trailCtx.arc(window._dragTrail.x, window._dragTrail.y, window._dragTrail.radius, 0, Math.PI * 2);
        trailCtx.fill();
        trailCtx.restore();
      }
      // On drag release, expand explosively and fade out
      if (!isMouseDown && window._dragTrail && window._dragTrail.state === 'contract') {
        window._dragTrail.state = 'expand';
      }
    }
    if (window._dragTrail && window._dragTrail.state === 'expand') {
      window._dragTrail.radius += 64 + window._dragTrail.radius * 0.22;
      window._dragTrail.opacity *= 0.89;
      if (window._dragTrail.opacity > 0.01) {
        const grad = trailCtx.createRadialGradient(
          window._dragTrail.x, window._dragTrail.y, window._dragTrail.radius * 0.7,
          window._dragTrail.x, window._dragTrail.y, window._dragTrail.radius
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.7, `rgba(0,0,0,${window._dragTrail.opacity})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        trailCtx.save();
        trailCtx.globalAlpha = 1;
        trailCtx.fillStyle = grad;
        trailCtx.beginPath();
        trailCtx.arc(window._dragTrail.x, window._dragTrail.y, window._dragTrail.radius, 0, Math.PI * 2);
        trailCtx.fill();
        trailCtx.restore();
      } else {
        window._dragTrail = null;
      }
    } else if (!isMouseDown || !hasDragged) {
      // Normal trail logic
      window._dragTrail = null;
      // Mostrar trail normal solo si no hay hold ni drag
      let printTrail = !isMouseDown && !holdActive;
      // Forzar opacidad mínima para que el trail aparezca aunque el mouse esté quieto
      if (targetTrailOpacity === 0) targetTrailOpacity = 0.04;
      if (isHoveringMapItem) {
        targetTrailX = (mouse.x + hoveredItemCenter.x) / 2;
        targetTrailY = (mouse.y + hoveredItemCenter.y) / 2;
        // Trail radius relative to zoom: min at minScale, max at maxScale
        let zoom = (window.scale - window.minScale) / (window.maxScale - window.minScale);
        zoom = Math.max(0, Math.min(1, zoom));
        const minTrail = 90;
        const maxTrail = 210;
        targetTrailRadius = minTrail + (maxTrail - minTrail) * zoom;
        targetTrailOpacity = 0.22;
        interp = 0.13;
      } else if (mouseSpeed > 0.5) {
        targetTrailX = smoothPos.x;
        targetTrailY = smoothPos.y;
        const speedIntensity = Math.min(mouseSpeed / 20, 1);
        targetTrailOpacity = 0.07 * speedIntensity;
        targetTrailRadius = 90;
        interp = 0.15;
      } else {
        targetTrailX = smoothPos.x;
        targetTrailY = smoothPos.y;
        targetTrailOpacity = 0;
        targetTrailRadius = 90;
        interp = 0.05;
      }
      // Mostrar trail normal siempre que printTrail sea true
      if (printTrail) {
        trailPosition.x += (targetTrailX - trailPosition.x) * interp;
        trailPosition.y += (targetTrailY - trailPosition.y) * interp;
        currentTrailOpacity += (targetTrailOpacity - currentTrailOpacity) * interp;
        currentTrailRadius += (targetTrailRadius - currentTrailRadius) * interp;
        const gradient = trailCtx.createRadialGradient(
          trailPosition.x, trailPosition.y, 0,
          trailPosition.x, trailPosition.y, currentTrailRadius
        );
        gradient.addColorStop(0.0, `rgba(0,0,0,${currentTrailOpacity})`);
        gradient.addColorStop(0.85, `rgba(0,0,0,${currentTrailOpacity * 0.01})`);
        gradient.addColorStop(1.0, 'rgba(0,0,0,0)');
        trailCtx.save();
        trailCtx.globalAlpha = 1;
        trailCtx.fillStyle = gradient;
        trailCtx.beginPath();
        trailCtx.arc(trailPosition.x, trailPosition.y, currentTrailRadius, 0, Math.PI * 2);
        trailCtx.fill();
        trailCtx.restore();
      }
    }
  }

  // --- Ripple logic (always enabled) ---
  for (let i = ripples.length - 1; i >= 0; i--) {
    const ripple = ripples[i];
    if (!ripple.alive) continue;
    ripple.radius += 28 + ripple.radius * 0.13; // fast, but smooth expansion
    ripple.opacity *= 0.91; // fade out gently
    if (ripple.opacity < 0.01) {
      ripple.alive = false;
      ripples.splice(i, 1);
      continue;
    }
    const grad = trailCtx.createRadialGradient(
      ripple.x, ripple.y, 0,
      ripple.x, ripple.y, ripple.radius
    );
    grad.addColorStop(0, `rgba(0,0,0,${ripple.opacity})`);
    grad.addColorStop(0.7, `rgba(0,0,0,${ripple.opacity * 0.08})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    trailCtx.save();
    trailCtx.globalAlpha = 1;
    trailCtx.fillStyle = grad;
    trailCtx.beginPath();
    trailCtx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    trailCtx.fill();
    trailCtx.restore();
  }

  requestAnimationFrame(animateCursor);
}

// Track mouse movement
window.addEventListener("mousemove", e => {
  mouse.x = e.pageX;  // Use pageX instead of clientX to account for scroll
  mouse.y = e.pageY;  // Use pageY instead of clientY to account for scroll
  console.log('mousemove', mouse.x, mouse.y);
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



// --- Click/touch event listeners for ripple ---
function getEventPos(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].pageX, y: e.touches[0].pageY };
  } else {
    return { x: e.pageX, y: e.pageY };
  }
}

// Mouse click (desktop)
window.addEventListener("mousedown", e => {
  isMouseDown = true;
  hasDragged = false;
  holdActive = false;
  if (!isMobile) targetCenterDotScale = 0.6;
  // Hold detection
  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
        if (isMouseDown && !holdActive) {
      holdActive = true;
      // Start drag trail at current position
      window._dragTrail = {
              radius: 48, // same as drag target radius
        opacity: 0.13,
        state: 'contract',
        x: smoothPos.x,
        y: smoothPos.y
      };
    }
  }, HOLD_THRESHOLD);
  // Only trigger ripple if click is on map or its elements and not dragging
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!hasDragged && el && (el.closest('#canvas') || el.classList.contains('image-link') || el.classList.contains('video-link'))) {
    triggerRipple(e.pageX, e.pageY);
  }
});

window.addEventListener("mouseup", e => {
  clearTimeout(holdTimer);
  if (isMouseDown && !hasDragged) {
    // It was a click, not a drag - trigger burst
    if (!isMobile) {
      clickBurst = true;
      burstTimer = 15;
      particles.forEach(p => {
        p.morphAngle = Math.random() * Math.PI * 2;
        p.burstSpeed = Math.random() * 6 + 2;
      });
    }
  }
  isMouseDown = false;
  hasDragged = false;
  holdActive = false;
  if (!isMobile) targetCenterDotScale = isHoveringElement ? 1.6 : 1;
});

// Touch (mobile)
window.addEventListener("touchstart", e => {
  const pos = getEventPos(e);
  // Only trigger ripple if touch is on map or its elements and not dragging
  if (hasDragged) return;
  const el = document.elementFromPoint(pos.x - window.scrollX, pos.y - window.scrollY);
  if (el && (el.closest && el.closest('#canvas') || el.classList && (el.classList.contains('image-link') || el.classList.contains('video-link')))) {
    triggerRipple(pos.x, pos.y);
  }
});

  // Start animation
  animateCursor();
