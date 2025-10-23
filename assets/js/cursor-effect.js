const cursorCanvas = document.getElementById("cursorCanvas");
const cursorCtx = cursorCanvas.getContext("2d");

let cursorWidth = window.innerWidth;
let cursorHeight = window.innerHeight;
cursorCanvas.width = cursorWidth;
cursorCanvas.height = cursorHeight;

const particles = [];
const particleCount = 40;

// Will be set to actual mouse position immediately
let mouse = { x: 0, y: 0 };
let smoothPos = { x: 0, y: 0 };
let cursorInitialized = false;

let clickBurst = false;
let burstTimer = 0;
let isMouseDown = false;
let hasDragged = false;

class Particle {
  constructor(index) {
    this.index = index;
    this.size = 1;
    this.speedX = 0;
    this.speedY = 0;
    this.burstSpeed = Math.random() * 4 + 1;

    this.nebulaBaseRadius = 18 + Math.random() * 2;
    this.nebulaMinRadius = this.nebulaBaseRadius - 1.5;
    this.morphRadius = this.nebulaMinRadius;
    this.morphAngle = Math.random() * Math.PI * 2;
    this.nebulaSpeed = 0.01 + Math.random() * 0.02;

    this.x = mouse.x;
    this.y = mouse.y;
    this.targetX = mouse.x;
    this.targetY = mouse.y;
    this.shapeTargetX = mouse.x;
    this.shapeTargetY = mouse.y;
  }

  update() {
    // Click burst effect
    if (clickBurst && burstTimer > 0) {
      this.x += Math.cos(this.morphAngle) * this.burstSpeed;
      this.y += Math.sin(this.morphAngle) * this.burstSpeed;
      this.burstSpeed *= 0.9;
      return;
    }

    const morphSpeed = 0.04;

    const baseNebulaX = smoothPos.x + Math.cos(this.morphAngle) * this.morphRadius;
    const baseNebulaY = smoothPos.y + Math.sin(this.morphAngle) * this.morphRadius;

    this.morphRadius += (this.nebulaBaseRadius - this.morphRadius) * 0.05;
    this.morphAngle += this.nebulaSpeed;

    this.targetX += (baseNebulaX - this.targetX) * morphSpeed;
    this.targetY += (baseNebulaY - this.targetY) * morphSpeed;

    let dx = this.targetX - this.x;
    let dy = this.targetY - this.y;
    this.speedX += dx * 0.15;
    this.speedY += dy * 0.15;
    this.speedX *= 0.7;
    this.speedY *= 0.7;
    this.x += this.speedX;
    this.y += this.speedY;
  }

  draw() {
    cursorCtx.globalCompositeOperation = 'difference';
    cursorCtx.fillStyle = "#0a0a0a";
    cursorCtx.beginPath();
    cursorCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    cursorCtx.fill();
    cursorCtx.globalCompositeOperation = 'source-over';
  }
}

function animateCursor() {
  cursorCtx.clearRect(0, 0, cursorWidth, cursorHeight);

  const delayFactor = 0.1;
  smoothPos.x += (mouse.x - smoothPos.x) * delayFactor;
  smoothPos.y += (mouse.y - smoothPos.y) * delayFactor;

  particles.forEach(p => {
    p.update();
    p.draw();
  });

  // Draw center dot
  cursorCtx.globalCompositeOperation = 'difference';
  cursorCtx.fillStyle = "#0a0a0a";
  cursorCtx.beginPath();
  cursorCtx.arc(smoothPos.x, smoothPos.y, 6, 0, Math.PI * 2);
  cursorCtx.fill();
  cursorCtx.globalCompositeOperation = 'source-over';

  // Handle burst timer
  if (clickBurst && burstTimer > 0) {
    burstTimer--;
    if (burstTimer <= 0) clickBurst = false;
  }

  requestAnimationFrame(animateCursor);
}

// Capture mouse position IMMEDIATELY when the script loads
document.addEventListener("mousemove", function initMousePosition(e) {
  if (!cursorInitialized) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    smoothPos.x = e.clientX;
    smoothPos.y = e.clientY;
    
    // Initialize particles at current mouse position
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(i));
    }
    
    cursorInitialized = true;
    
    // Start animation after initialization
    animateCursor();
  }
}, { once: false });

// Track mouse movement
window.addEventListener("mousemove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  
  // If mouse is down and moving, it's a drag
  if (isMouseDown) {
    hasDragged = true;
  }
});

// Track mouse down
window.addEventListener("mousedown", () => {
  isMouseDown = true;
  hasDragged = false;
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
});

// Resize handler
window.addEventListener("resize", () => {
  cursorWidth = window.innerWidth;
  cursorHeight = window.innerHeight;
  cursorCanvas.width = cursorWidth;
  cursorCanvas.height = cursorHeight;
});