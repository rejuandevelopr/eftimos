/**
 * Tooltip Nebula Effect - Dynamic grain/noise background that adapts to text size
 */

class TooltipNebula {
    constructor() {
        this.tooltips = [];
        this.animationId = null;
        this.time = 0;
        this._paused = false;
        this._knownTooltips = new WeakSet(); // track tooltip elements we've already processed
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // Setup hover detection via event delegation (works for dynamically cloned elements)
        this.setupHoverDimming();

        // Pause/resume on tab visibility
        const self = this;
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                if (self.animationId) { cancelAnimationFrame(self.animationId); self.animationId = null; }
                self._paused = true;
            } else {
                self.resumeIfNeeded();
            }
        });

        // Observe for new tooltips (dynamically cloned from templates)
        this.observeTooltips();

        // Initial scan (may find tooltips already in DOM)
        this.scanForNewTooltips();

        // Don't call animate() here — it will self-pause immediately.
        // Instead, animation is started on first hover via resumeIfNeeded().
        this._paused = true;
    }

    setupHoverDimming() {
        // Use mouseover/mouseout (which bubble!) for event delegation on #canvas
        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        this._hoveredLink = null;

        canvas.addEventListener('mouseover', (e) => {
            const mapItem = e.target.closest('.image-link, .video-link');
            if (mapItem && mapItem !== this._hoveredLink) {
                this._hoveredLink = mapItem;
                // Lazy-initialize the tooltip if needed
                const tooltip = mapItem.querySelector('.tooltip');
                if (tooltip) {
                    this.initializeTooltip(tooltip);
                }
                // Resume nebula animation
                this.resumeIfNeeded();
            }
        });

        canvas.addEventListener('mouseout', (e) => {
            if (!this._hoveredLink) return;
            const related = e.relatedTarget;
            // Only clear hover if cursor left the link entirely (not moving to a child)
            if (!related || !this._hoveredLink.contains(related)) {
                this._hoveredLink = null;
            }
        });

        // Mobile support: resume on touch
        canvas.addEventListener('touchstart', (e) => {
            const mapItem = e.target.closest('.image-link, .video-link');
            if (mapItem) {
                this._hoveredLink = mapItem;
                const tooltip = mapItem.querySelector('.tooltip');
                if (tooltip) {
                    this.initializeTooltip(tooltip);
                }
                this.resumeIfNeeded();
            }
        }, { passive: true });

        canvas.addEventListener('touchend', () => {
            this._hoveredLink = null;
        }, { passive: true });
    }

    /**
     * Scan the DOM for tooltip elements we haven't processed yet,
     * create canvas + tracking data for each.
     */
    scanForNewTooltips() {
        const allTooltips = document.querySelectorAll('#canvas .tooltip');

        allTooltips.forEach(tooltip => {
            // Skip if we already track this exact element
            if (this._knownTooltips.has(tooltip)) return;
            this._knownTooltips.add(tooltip);

            // If it was cloned from a template it may already have a nebula-canvas;
            // remove the stale one so we create a fresh, properly wired canvas.
            const staleCanvas = tooltip.querySelector('.nebula-canvas');
            if (staleCanvas) staleCanvas.remove();

            // Create a new canvas
            const canvasEl = document.createElement('canvas');
            canvasEl.className = 'nebula-canvas';
            tooltip.insertBefore(canvasEl, tooltip.firstChild);

            const ctx = canvasEl.getContext('2d', {
                alpha: true,
                desynchronized: true,
                willReadFrequently: false
            });

            const tooltipData = {
                element: tooltip,
                canvas: canvasEl,
                ctx: ctx,
                particles: [],
                initialized: false
            };

            this.tooltips.push(tooltipData);
        });
    }

    initializeTooltip(tooltip) {
        const tooltipData = this.tooltips.find(t => t.element === tooltip);
        if (!tooltipData || tooltipData.initialized) return;

        // Set canvas size based on tooltip size
        this.updateCanvasSize(tooltipData);
        
        // Create particles for this tooltip
        this.createParticles(tooltipData);
        
        tooltipData.initialized = true;
    }

    updateCanvasSize(tooltipData) {
        const rect = tooltipData.element.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Padding asimétrico: horizontal amplio, vertical mínimo
        const paddingX = 24;
        const paddingY = 6; // muy reducido verticalmente
        const width = rect.width + paddingX * 2;
        const height = rect.height + paddingY * 2;
        
        tooltipData.canvas.width = width * dpr;
        tooltipData.canvas.height = height * dpr;
        tooltipData.canvas.style.width = width + 'px';
        tooltipData.canvas.style.height = height + 'px';
        
        // Centrar el canvas respecto al tooltip
        tooltipData.canvas.style.position = 'absolute';
        tooltipData.canvas.style.left = '50%';
        tooltipData.canvas.style.top = '50%';
        tooltipData.canvas.style.transform = 'translate(-50%, -50%)';
        
        tooltipData.ctx.scale(dpr, dpr);
        tooltipData.canvasWidth = width;
        tooltipData.canvasHeight = height;
    }

    createParticles(tooltipData) {
        const width = tooltipData.canvasWidth;
        const height = tooltipData.canvasHeight;
        
        // Densidad muy alta con muchas partículas
        const density = 1.8;
        const particleCount = Math.min(Math.floor(width * height * density), 1200); // máximo 1200 partículas
        
        tooltipData.particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            // Create particle concentrado horizontalmente (línea gruesa)
            const centerX = width / 2;
            const centerY = height / 2;
            
            // Distribución más amplia para cubrir más área del tooltip
            const xOffset = (Math.random() - 0.5) * width * 0.9; // casi todo el ancho
            const yOffset = (Math.random() - 0.5) * height * 1.4; // 140% de altura vertical
            
            const distanceFromCenter = Math.sqrt(xOffset * xOffset + yOffset * yOffset);
            const angle = Math.atan2(yOffset, xOffset);
            
            tooltipData.particles.push({
                x: centerX + xOffset,
                y: centerY + yOffset,
                baseX: centerX + xOffset,
                baseY: centerY + yOffset,
                size: Math.random() * 0.7 + 0.4, // tamaño ligeramente incrementado
                opacity: Math.random() * 0.6 + 0.8, // mayor opacidad
                speed: Math.random() * 2 + 1,
                angle: angle, // ángulo desde el centro
                disperseSpeed: Math.random() * 0.4 + 0.2, // velocidad de dispersión
                distanceFromCenter: distanceFromCenter,
                wobbleSpeedX: Math.random() * 0.3 + 0.2,
                wobbleSpeedY: Math.random() * 0.35 + 0.25,
                wobbleAmount: Math.random() * 30 + 15, // amplitud reducida
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    animate() {
        this.time += 0.06;

        // Render the tooltip whose parent link is currently hovered
        if (this._hoveredLink) {
            this.tooltips.forEach(tooltipData => {
                if (!tooltipData.initialized) return;
                if (!tooltipData.element.isConnected) return;
                const parent = tooltipData.element.closest('.image-link, .video-link');
                if (parent && parent === this._hoveredLink) {
                    this.renderNebula(tooltipData);
                }
            });
        }

        // Decide whether to keep running
        if (document.hidden || !this._hoveredLink) {
            this._paused = true;
            this.animationId = null;
            return;
        }
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    // Resume animation loop when a link is hovered
    resumeIfNeeded() {
        if (!this._paused || document.hidden) return;
        this._paused = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    renderNebula(tooltipData) {
        const { ctx, canvas, particles, canvasWidth, canvasHeight } = tooltipData;
        
        // Clear canvas - solo transparencia, sin fondo
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const maxRadius = Math.max(canvasWidth, canvasHeight) * 0.7;
        
        // Draw particles - optimizado
        particles.forEach(particle => {
            // Dispersión radial hacia el centro (como si se absorbieran hacia el texto)
            const disperseOffset = Math.sin(this.time * particle.disperseSpeed) * 15;
            const disperseX = Math.cos(particle.angle) * disperseOffset * -1; // invertido
            const disperseY = Math.sin(particle.angle) * disperseOffset * -1; // invertido
            
            // Movimiento agresivo tipo ruido blanco - múltiples frecuencias
            const wobbleX = Math.sin(this.time * particle.wobbleSpeedX + particle.phase) * particle.wobbleAmount +
                          Math.sin(this.time * particle.wobbleSpeedX * 3.7) * (particle.wobbleAmount * 0.3) +
                          Math.sin(this.time * particle.wobbleSpeedX * 7.2) * (particle.wobbleAmount * 0.15);
            
            const wobbleY = Math.cos(this.time * particle.wobbleSpeedY + particle.phase) * particle.wobbleAmount +
                          Math.cos(this.time * particle.wobbleSpeedY * 4.1) * (particle.wobbleAmount * 0.3) +
                          Math.cos(this.time * particle.wobbleSpeedY * 8.5) * (particle.wobbleAmount * 0.15);
            
            particle.x = particle.baseX + wobbleX + disperseX;
            particle.y = particle.baseY + wobbleY + disperseY;
            
            // Pulsación rápida y errática
            const pulseOpacity = particle.opacity * (0.5 + 
                Math.sin(this.time * 4 + particle.angle) * 0.3 +
                Math.sin(this.time * 9.3 + particle.phase) * 0.2);
            
            // Calculate distance from center for fading suave - fade elíptico horizontal
            const dx = particle.x - centerX;
            const dy = particle.y - centerY;
            
            // Distancia elíptica: estrecha horizontalmente, amplia verticalmente
            const normalizedDx = dx / (canvasWidth * 0.2); // área limpia estrecha horizontal
            const normalizedDy = dy / (canvasHeight * 0.28); // área limpia vertical ligeramente reducida
            const ellipticalDist = Math.sqrt(normalizedDx * normalizedDx + normalizedDy * normalizedDy);
            
            // Fade con área visible expandida y espacio central sin partículas
            let distanceFade;
            
            if (ellipticalDist < 1.1) {
                // Centro muy amplio reservado para texto: sin partículas
                distanceFade = 0;
            } else if (ellipticalDist < 1.3) {
                // Transición gradual: opacidad aumenta hacia los bordes
                const fadeProgress = (ellipticalDist - 1.1) / 0.2;
                distanceFade = fadeProgress * 0.4; // Máximo 40% en esta zona
            } else if (ellipticalDist < 1.6) {
                // Bordes: máxima opacidad
                const fadeProgress = (ellipticalDist - 1.3) / 0.3;
                distanceFade = 0.4 + (fadeProgress * 0.6); // De 40% a 100%
            } else if (ellipticalDist < 1.9) {
                // Transición hacia invisible en los límites extremos
                const fadeProgress = (ellipticalDist - 1.6) / 0.3;
                distanceFade = 1 - fadeProgress;
            } else {
                // Fuera del rango: invisible
                distanceFade = 0;
            }
            
            // Partículas blancas con mínimo blur
            const glowSize = particle.size * 1.8; // glow muy reducido
            const glowGradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, glowSize
            );
            // Tonos blancos con buena opacidad
            glowGradient.addColorStop(0, `rgba(255, 255, 255, ${pulseOpacity * distanceFade * 0.95})`);
            glowGradient.addColorStop(0.6, `rgba(240, 240, 240, ${pulseOpacity * distanceFade * 0.5})`);
            glowGradient.addColorStop(1, 'rgba(220, 220, 220, 0)');
            
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, glowSize, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    observeTooltips() {
        // Watch #canvas for new .image-container elements (cloned from templates)
        const canvasEl = document.getElementById('canvas');
        const target = canvasEl || document.body;

        const observer = new MutationObserver((mutations) => {
            let needsScan = false;
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    if ((node.classList && node.classList.contains('tooltip')) ||
                        (node.querySelector && node.querySelector('.tooltip'))) {
                        needsScan = true;
                        break;
                    }
                }
                if (needsScan) break;
            }
            if (needsScan) {
                // Defer slightly so the cloned elements are fully in the DOM
                requestAnimationFrame(() => this.scanForNewTooltips());
            }
        });

        observer.observe(target, {
            childList: true,
            subtree: true
        });
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        this.tooltips.forEach(tooltipData => {
            if (tooltipData.canvas && tooltipData.canvas.parentNode) {
                tooltipData.canvas.remove();
            }
        });
        
        this.tooltips = [];
    }
}

// Initialize when script loads
let tooltipNebula;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        tooltipNebula = new TooltipNebula();
    });
} else {
    tooltipNebula = new TooltipNebula();
}

// Make it available globally if needed
window.TooltipNebula = TooltipNebula;
