// Cursor container
const cursorContainer = document.createElement('div');
cursorContainer.id = 'customCursor';
document.body.appendChild(cursorContainer);

// Create center dot
const centerDot = document.createElement('div');
centerDot.className = 'cursor-center-dot';
cursorContainer.appendChild(centerDot);

const particles = [];
const particleCount = 40;

let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let smoothPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

let clickBurst = false;
let burstTimer = 0;
let isMouseDown = false;
let hasDragged = false;

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
    this.nebulaSpeed = 0.01 + Math.random() * 0.02;

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
      this.draw();
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

    this.draw();
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
  const delayFactor = 0.1;
  smoothPos.x += (mouse.x - smoothPos.x) * delayFactor;
  smoothPos.y += (mouse.y - smoothPos.y) * delayFactor;

  // Update center dot position
  centerDot.style.left = smoothPos.x + 'px';
  centerDot.style.top = smoothPos.y + 'px';

  particles.forEach(p => {
    p.update();
  });

  // Handle burst timer
  if (clickBurst && burstTimer > 0) {
    burstTimer--;
    if (burstTimer <= 0) clickBurst = false;
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

// Start animation
animateCursor();