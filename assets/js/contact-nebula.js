// Contact Nebula Effect for Contact Modal
class ContactNebula {
    constructor(modalSelector) {
        this.modal = document.querySelector(modalSelector);
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationId = null;
        this.time = 0;
        this.init();
    }

    init() {
        if (!this.modal) return;
        this.createCanvas();
        this.createParticles();
        this.animate();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'contact-nebula-canvas';
        this.modal.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.resizeCanvas();
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = 0;
        this.canvas.style.left = 0;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = 0;
    }

    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.modal.offsetWidth * dpr;
        this.canvas.height = this.modal.offsetHeight * dpr;
        this.ctx.scale(dpr, dpr);
    }

    createParticles() {
        const width = this.modal.offsetWidth;
        const height = this.modal.offsetHeight;
        const centerX = width / 2;
        const centerY = height / 2;
        const particleCount = Math.min(Math.floor(width * height * 0.0007), 350); // Menos partículas
        this.particles = [];
        for (let i = 0; i < particleCount; i++) {
            // Distribución radial
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * (Math.min(width, height) / 2 - 30) + 20;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            this.particles.push({
                x,
                y,
                baseX: x,
                baseY: y,
                size: Math.random() * 1.1 + 0.5,
                opacity: Math.random() * 0.4 + 0.5,
                speed: Math.random() * 1.2 + 0.3,
                angle,
                wobbleSpeed: Math.random() * 0.22 + 0.12,
                wobbleAmount: Math.random() * 18 + 8,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    animate() {
        this.time += 0.04;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const width = this.modal.offsetWidth;
        const height = this.modal.offsetHeight;
        this.particles.forEach(p => {
            const wobbleX = Math.sin(this.time * p.wobbleSpeed + p.phase) * p.wobbleAmount;
            const wobbleY = Math.cos(this.time * p.wobbleSpeed + p.phase) * p.wobbleAmount;
            p.x = p.baseX + wobbleX;
            p.y = p.baseY + wobbleY;
            const pulseOpacity = p.opacity * (0.7 + Math.sin(this.time * 3 + p.angle) * 0.2);
            const glowSize = p.size * 2;
            const glowGradient = this.ctx.createRadialGradient(
                p.x, p.y, 0,
                p.x, p.y, glowSize
            );
            glowGradient.addColorStop(0, `rgba(255,255,255,${pulseOpacity})`);
            glowGradient.addColorStop(0.6, `rgba(240,240,240,${pulseOpacity * 0.5})`);
            glowGradient.addColorStop(1, 'rgba(220,220,220,0)');
            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.animationId = requestAnimationFrame(() => this.animate());
    }
}

// Initialize when modal is opened
function setupContactNebula() {
    const modal = document.querySelector('.contact-modal.active');
    if (modal && !modal.querySelector('.contact-nebula-canvas')) {
        new ContactNebula('.contact-modal.active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('contactBtn')?.addEventListener('click', () => {
        setTimeout(setupContactNebula, 100);
    });
});

window.setupContactNebula = setupContactNebula;
