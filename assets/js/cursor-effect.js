// Limpieza suave del trail canvas al hacer zoom
window.smoothClearTrail = function (duration = 400) {
  if (!window.trailCanvas || !window.trailCtx) return;
  const ctx = window.trailCtx;
  const canvas = window.trailCanvas;
  const start = performance.now();
  function fadeStep(now) {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / duration);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0,0,0,${0.18 * t})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    if (t < 1) {
      requestAnimationFrame(fadeStep);
    }
  }
  requestAnimationFrame(fadeStep);
};
// --- Fade out trail on zoom ---
// (Eliminado: no se usa fadeOutTrail, restaurando trail persistente y difuminado)

// Detect if device is mobile/tablet
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth <= 1024
    || ('ontouchstart' in window);
}

// Always create the trail canvas for ripple feedback (desktop & mobile)
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

// Only create and append trailCanvas once
const trailCanvas = document.createElement('canvas');
trailCanvas.id = 'trailCanvas';
document.body.appendChild(trailCanvas);
const trailCtx = trailCanvas.getContext('2d', { alpha: true });
trailCanvas.width = window.innerWidth;
trailCanvas.height = window.innerHeight;
// Hacer accesibles globalmente para smoothClearTrail
window.trailCanvas = trailCanvas;
window.trailCtx = trailCtx;
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

let particles = [];
const particleCount = 40;

let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let smoothPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let prevSmoothPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let lastCursorTime = performance.now();
let mouseSpeed = 0;
let isHoveringMapItem = false;
let hoveredItemCenter = { x: 0, y: 0 };
let trailPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let currentTrailOpacity = 0;
let currentTrailRadius = 90;
let targetTrailOpacity = 0;
let targetTrailRadius = 90;
let smoothedSpeedIntensity = 0;

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
    if (cursorContainer) {
      cursorContainer.appendChild(this.element);
    }

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
      const scale = 2.5;
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
    } else if (shapeMode === "star") {
      // 5-pointed star
      const points = 5;
      const outerRadius = 35;
      const innerRadius = 15;
      const segment = Math.floor(idxRatio * points * 2);
      const t = (idxRatio * points * 2) % 1;
      const isOuter = segment % 2 === 0;
      const angle = (segment / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const nextAngle = ((segment + 1) / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const currentRadius = isOuter ? outerRadius : innerRadius;
      const nextRadius = isOuter ? innerRadius : outerRadius;
      const x = Math.cos(angle) * currentRadius + (Math.cos(nextAngle) * nextRadius - Math.cos(angle) * currentRadius) * t;
      const y = Math.sin(angle) * currentRadius + (Math.sin(nextAngle) * nextRadius - Math.sin(angle) * currentRadius) * t;
      this.shapeTargetX = smoothPos.x + x;
      this.shapeTargetY = smoothPos.y + y;
    } else if (shapeMode === "square") {
      // Square/rectangle
      const side = 50;
      const segment = Math.floor(idxRatio * 4);
      const t = (idxRatio * 4) % 1;
      if (segment === 0) {
        // Top edge
        this.shapeTargetX = smoothPos.x - side / 2 + side * t;
        this.shapeTargetY = smoothPos.y - side / 2;
      } else if (segment === 1) {
        // Right edge
        this.shapeTargetX = smoothPos.x + side / 2;
        this.shapeTargetY = smoothPos.y - side / 2 + side * t;
      } else if (segment === 2) {
        // Bottom edge
        this.shapeTargetX = smoothPos.x + side / 2 - side * t;
        this.shapeTargetY = smoothPos.y + side / 2;
      } else {
        // Left edge
        this.shapeTargetX = smoothPos.x - side / 2;
        this.shapeTargetY = smoothPos.y + side / 2 - side * t;
      }
    } else if (shapeMode === "infinity") {
      // Lemniscate (infinity symbol)
      const t = idxRatio * Math.PI * 2;
      const scale = 25;
      const x = Math.cos(t) / (1 + Math.sin(t) * Math.sin(t));
      const y = Math.sin(t) * Math.cos(t) / (1 + Math.sin(t) * Math.sin(t));
      this.shapeTargetX = smoothPos.x + x * scale;
      this.shapeTargetY = smoothPos.y + y * scale;
    } else if (shapeMode === "wave") {
      // Sinusoidal wave
      const waveLength = 80;
      const amplitude = 20;
      const x = (idxRatio - 0.5) * waveLength;
      const y = Math.sin(idxRatio * Math.PI * 4) * amplitude;
      this.shapeTargetX = smoothPos.x + x;
      this.shapeTargetY = smoothPos.y + y;
    } else if (shapeMode === "cross") {
      // Cross/plus sign
      const armLength = 35;
      const thickness = 8;
      const segment = Math.floor(idxRatio * 4);
      const t = (idxRatio * 4) % 1;
      if (segment === 0) {
        // Top vertical
        this.shapeTargetX = smoothPos.x + (Math.random() - 0.5) * thickness;
        this.shapeTargetY = smoothPos.y - armLength + armLength * t;
      } else if (segment === 1) {
        // Right horizontal
        this.shapeTargetX = smoothPos.x + armLength * t;
        this.shapeTargetY = smoothPos.y + (Math.random() - 0.5) * thickness;
      } else if (segment === 2) {
        // Bottom vertical
        this.shapeTargetX = smoothPos.x + (Math.random() - 0.5) * thickness;
        this.shapeTargetY = smoothPos.y + armLength * t;
      } else {
        // Left horizontal
        this.shapeTargetX = smoothPos.x - armLength + armLength * t;
        this.shapeTargetY = smoothPos.y + (Math.random() - 0.5) * thickness;
      }
    } else if (shapeMode === "hexagon") {
      // Hexagon
      const radius = 32;
      const angle = idxRatio * Math.PI * 2;
      const segment = Math.floor(idxRatio * 6);
      const t = (idxRatio * 6) % 1;
      const currentAngle = (segment / 6) * Math.PI * 2;
      const nextAngle = ((segment + 1) / 6) * Math.PI * 2;
      const x1 = Math.cos(currentAngle) * radius;
      const y1 = Math.sin(currentAngle) * radius;
      const x2 = Math.cos(nextAngle) * radius;
      const y2 = Math.sin(nextAngle) * radius;
      this.shapeTargetX = smoothPos.x + x1 + (x2 - x1) * t;
      this.shapeTargetY = smoothPos.y + y1 + (y2 - y1) * t;
    } else if (shapeMode === "diamond") {
      // Diamond (rotated square)
      const size = 40;
      const segment = Math.floor(idxRatio * 4);
      const t = (idxRatio * 4) % 1;
      if (segment === 0) {
        // Top to right
        this.shapeTargetX = smoothPos.x + size * t;
        this.shapeTargetY = smoothPos.y - size + size * t;
      } else if (segment === 1) {
        // Right to bottom
        this.shapeTargetX = smoothPos.x + size - size * t;
        this.shapeTargetY = smoothPos.y + size * t;
      } else if (segment === 2) {
        // Bottom to left
        this.shapeTargetX = smoothPos.x - size * t;
        this.shapeTargetY = smoothPos.y + size - size * t;
      } else {
        // Left to top
        this.shapeTargetX = smoothPos.x - size + size * t;
        this.shapeTargetY = smoothPos.y - size * t;
      }
    } else if (shapeMode === "eye") {
      // Eye shape (almond/ellipse with pointed ends) - only outline
      const t = idxRatio * Math.PI * 2;
      const radiusX = 40;
      const radiusY = 18;
      // Create pointed ends by modulating the y radius
      const modulation = Math.abs(Math.sin(t)) * 0.7 + 0.3;
      const x = Math.cos(t) * radiusX;
      const y = Math.sin(t) * radiusY * modulation;
      this.shapeTargetX = smoothPos.x + x;
      this.shapeTargetY = smoothPos.y + y;
    } else if (shapeMode === "bag") {
      // Shopping bag shape
      const totalParticles = particleCount;
      const bagParticles = Math.floor(totalParticles * 0.75); // 75% for bag body
      const handleParticles = totalParticles - bagParticles; // 25% for handles
      
      if (this.index < bagParticles) {
        // Bag body (trapezoid)
        const t = this.index / bagParticles;
        const width = 30;
        const height = 35;
        const topWidth = 28;
        
        if (t < 0.25) {
          // Top edge
          const edgeT = t / 0.25;
          this.shapeTargetX = smoothPos.x - topWidth / 2 + topWidth * edgeT;
          this.shapeTargetY = smoothPos.y - height / 2;
        } else if (t < 0.5) {
          // Right edge
          const edgeT = (t - 0.25) / 0.25;
          this.shapeTargetX = smoothPos.x + topWidth / 2 + (width - topWidth) / 2 * edgeT;
          this.shapeTargetY = smoothPos.y - height / 2 + height * edgeT;
        } else if (t < 0.75) {
          // Bottom edge
          const edgeT = (t - 0.5) / 0.25;
          this.shapeTargetX = smoothPos.x + width / 2 - width * edgeT;
          this.shapeTargetY = smoothPos.y + height / 2;
        } else {
          // Left edge
          const edgeT = (t - 0.75) / 0.25;
          this.shapeTargetX = smoothPos.x - width / 2 + (width - topWidth) / 2 * edgeT;
          this.shapeTargetY = smoothPos.y + height / 2 - height * edgeT;
        }
      } else {
        // Handles (two arcs on top)
        const handleIndex = this.index - bagParticles;
        const handleT = handleIndex / handleParticles;
        const handleWidth = 10;
        const handleHeight = 8;
        
        if (handleT < 0.5) {
          // Left handle
          const arcT = (handleT / 0.5) * Math.PI;
          this.shapeTargetX = smoothPos.x - 14 + Math.sin(arcT) * handleWidth;
          this.shapeTargetY = smoothPos.y - 18 - Math.cos(arcT) * handleHeight;
        } else {
          // Right handle
          const arcT = ((handleT - 0.5) / 0.5) * Math.PI;
          this.shapeTargetX = smoothPos.x + 14 - Math.sin(arcT) * handleWidth;
          this.shapeTargetY = smoothPos.y - 18 - Math.cos(arcT) * handleHeight;
        }
      }
    } else {
      this.shapeTargetX = smoothPos.x + (Math.random() - 0.5) * spread;
      this.shapeTargetY = smoothPos.y + (Math.random() - 0.5) * spread;
    }
    
    // Apply offset to center shapes properly with cursor
    const offsetX = -3;
    const offsetY = -3;
    this.shapeTargetX += offsetX;
    this.shapeTargetY += offsetY;
  }

  draw() {
    this.element.style.transform = 'translate(' + (this.x - 1) + 'px,' + (this.y - 1) + 'px)';
  }
}

// Initialize particles only on desktop (not mobile)
if (!isMobile) {
  particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle(i));
  }
}

function animateCursor() {
  // Hide cursor if visual effects are disabled
  if (!cursorContainer) return; // Prevent errors on mobile
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

  // FPS throttling for cursor animation (60 FPS max on desktop)
  if (!window._lastCursorFrame) window._lastCursorFrame = 0;
  const now = performance.now();
  const CURSOR_FPS = 60;
  const CURSOR_FRAME_INTERVAL = 1000 / CURSOR_FPS;

  if (now - window._lastCursorFrame < CURSOR_FRAME_INTERVAL) {
    requestAnimationFrame(animateCursor);
    return;
  }
  window._lastCursorFrame = now;
  // Update center dot position + scale via single transform (avoids layout thrash)
  var _cdScale = (window._cdScale || 1);
  _cdScale += (targetCenterDotScale - _cdScale) * 0.15;
  window._cdScale = _cdScale;
  centerDot.style.transform = 'translate(' + (smoothPos.x - 6) + 'px,' + (smoothPos.y - 6) + 'px) scale(' + _cdScale + ')';

  particles.forEach(p => {
    p.update();
    p.draw();
  });

  // Handle burst timer
  if (clickBurst && burstTimer > 0) {
    burstTimer--;
    if (burstTimer <= 0) clickBurst = false;
  }

  // Calculate speed based on smoothed position and delta time
  const dt = Math.max(8, Math.min(40, now - lastCursorTime));
  lastCursorTime = now;
  const dx = smoothPos.x - prevSmoothPos.x;
  const dy = smoothPos.y - prevSmoothPos.y;
  const pixelsPerFrame = (Math.sqrt(dx * dx + dy * dy) / dt) * 16.67;

  // Smooth the speed value
  mouseSpeed += (pixelsPerFrame - mouseSpeed) * 0.12;

  // Smooth speed intensity to avoid trail popping
  const targetSpeedIntensity = Math.min(mouseSpeed / 28, 1);
  smoothedSpeedIntensity += (targetSpeedIntensity - smoothedSpeedIntensity) * 0.12;

  // Update previous smoothed position
  prevSmoothPos.x = smoothPos.x;
  prevSmoothPos.y = smoothPos.y;

  // Trail and ripple painting on canvas
  // Lógica original: trail normal y drag, pero el release es solo un fade out
  const dragActive = (isMouseDown && hasDragged) || (window._dragTrail && window._dragTrail.state === 'contract');
  if (!window._lastDragActive) window._lastDragActive = false;
  if (dragActive && !window._lastDragActive) {
    window.dispatchEvent(new Event('dragTrailStarted'));
  }
  if (!dragActive && window._lastDragActive) {
    window.dispatchEvent(new Event('dragTrailEnded'));
  }
  window._lastDragActive = dragActive;
  if (!dragActive) {
    trailCtx.globalCompositeOperation = 'destination-out';
    if (window._dragTrail && window._dragTrail.state === 'expand') {
      // Release: solo fade out
      trailCtx.fillStyle = 'rgba(0, 0, 0, 0.10)';
      trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
    } else {
      const fadeAlpha = 0.03;
      trailCtx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
      trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
    }
    trailCtx.globalCompositeOperation = 'source-over';
  } else {
    // Drag trail: solo el fade clásico
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
    if ((isMouseDown && hasDragged) || (window._dragTrail && window._dragTrail.state === 'contract')) {
      // Draw a contracting ring from outside to inside, keep animating as long as holding
      const dragCenterX = smoothPos.x;
      const dragCenterY = smoothPos.y;
      if (!window._dragTrail) {
        window._dragTrail = {
          radius: Math.max(window.innerWidth, window.innerHeight) * 0.45,
          opacity: 0.025,
          state: 'contract',
          x: dragCenterX,
          y: dragCenterY
        };
      } else if (isMouseDown && hasDragged) {
        window._dragTrail.radius += (48 - window._dragTrail.radius) * 0.13;
        window._dragTrail.opacity = 0.025; // keep opacity constant while holding
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
      let printTrail = !(isMouseDown && hasDragged);
      
      // Suavizar transiciones entre estados con interpolación más lenta
      if (!window._trailInterp) window._trailInterp = 0.06;
      
      if (isHoveringMapItem) {
        targetTrailX = (mouse.x + hoveredItemCenter.x) / 2;
        targetTrailY = (mouse.y + hoveredItemCenter.y) / 2;
        // Trail radius relativo a zoom: min en minScale, max en maxScale
        let zoom = (window.scale - window.minScale) / (window.maxScale - window.minScale);
        zoom = Math.max(0, Math.min(1, zoom));
        const minTrail = 120; // más grande para difuminar
        const maxTrail = 260;
        targetTrailRadius = minTrail + (maxTrail - minTrail) * zoom;
        targetTrailOpacity = 0.38; // punto medio entre los dos valores anteriores
        interp = 0.09; // Reducido de 0.13 para transición más suave
      } else {
        targetTrailX = smoothPos.x;
        targetTrailY = smoothPos.y;
        const speedIntensity = smoothedSpeedIntensity;
        targetTrailOpacity = 0.1 * speedIntensity; // más opaco/denso en movimiento normal
        targetTrailRadius = 90;
        interp = 0.06 + (0.04 * speedIntensity); // Reducido para más suavidad
      }
      
      // Suavizar cambios del factor de interpolación para evitar saltos
      window._trailInterp += (interp - window._trailInterp) * 0.08;
      const smoothInterp = window._trailInterp;
      
      trailPosition.x += (targetTrailX - trailPosition.x) * smoothInterp;
      trailPosition.y += (targetTrailY - trailPosition.y) * smoothInterp;
      // Interpolación más lenta para opacidad y radio
      currentTrailOpacity += (targetTrailOpacity - currentTrailOpacity) * (smoothInterp * 0.6);
      currentTrailRadius += (targetTrailRadius - currentTrailRadius) * (smoothInterp * 0.5);
      if (printTrail && currentTrailOpacity > 0.01) {
        // Gradiente unificado con transición suave entre estados
        // Usar factor de blend basado en si estamos en hover
        if (!window._hoverBlend) window._hoverBlend = 0;
        const targetBlend = isHoveringMapItem ? 1 : 0;
        window._hoverBlend += (targetBlend - window._hoverBlend) * 0.08; // Transición muy suave
        
        const blend = window._hoverBlend;
        const gradient = trailCtx.createRadialGradient(
          trailPosition.x, trailPosition.y, 0,
          trailPosition.x, trailPosition.y, currentTrailRadius
        );
        
        // Interpolar los color stops entre hover y normal
        const midStop = 0.48 + (0.85 - 0.48) * (1 - blend); // 0.48 en hover, 0.85 en normal
        const midAlpha = (0.54 * blend) + (0.04 * (1 - blend));
        const endAlpha = 0.10 * blend + 0.04 * (1 - blend);
        
        gradient.addColorStop(0.0, `rgba(0,0,0,${currentTrailOpacity * 1.05})`);
        gradient.addColorStop(midStop, `rgba(0,0,0,${currentTrailOpacity * midAlpha})`);
        gradient.addColorStop(0.85, `rgba(0,0,0,${currentTrailOpacity * endAlpha})`);
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

window.addEventListener("mousemove", e => {
  mouse.x = e.pageX;  // Use pageX instead of clientX to account for scroll
  mouse.y = e.pageY;  // Use pageY instead of clientY to account for scroll

  // If mouse is down and moving, it's a drag
  if (isMouseDown) {
    hasDragged = true;
  }
});


document.querySelectorAll("a, button, input, textarea, select, .video-link, .cinema-close, .menu-toggle, .press-slide-card").forEach(el => {
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
  if (!isMobile) targetCenterDotScale = 0.6;
  // Only trigger ripple if click is on map or its elements and not dragging
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!hasDragged && el && (el.closest('#canvas') || el.classList.contains('image-link') || el.classList.contains('video-link'))) {
    triggerRipple(e.pageX, e.pageY);
  }
});

window.addEventListener("mouseup", e => {
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

// Eliminado: listeners de 'zoomIn' y 'zoomOut' para evitar fade redundante

// Start animation solo una vez al cargar el archivo
var _cursorRafId = null;
if (typeof window._cursorAnimStarted === 'undefined') {
  window._cursorAnimStarted = true;
  _cursorRafId = requestAnimationFrame(animateCursor);
}

// Pause cursor animation when tab is hidden
document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    if (_cursorRafId) { cancelAnimationFrame(_cursorRafId); _cursorRafId = null; }
  } else if (window._cursorAnimStarted) {
    _cursorRafId = requestAnimationFrame(animateCursor);
  }
});
