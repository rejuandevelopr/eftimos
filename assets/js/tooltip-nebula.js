/**
 * Tooltip Nebula Effect - Dynamic grain/noise background that adapts to text size
 * Optimized for mobile & low-end devices
 */

class TooltipNebula {
    constructor() {
        this.tooltips = [];
        this.animationId = null;
        this.time = 0;
        this._paused = false;
        this._knownTooltips = new WeakSet(); // track tooltip elements we've already processed
        this._particleSprites = null; // pre-rendered particle sprite cache
        this._frameCount = 0; // for frame skipping

        // Detect device capabilities once
        this._isTouchDevice = (
            (window.matchMedia && (window.matchMedia('(hover: none)').matches || window.matchMedia('(pointer: coarse)').matches)) ||
            ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0)
        );
        this._isLowEnd = this._detectLowEnd();
        // Cap DPR: 1 on mobile/low-end, capped at 2 otherwise
        this._dpr = this._isLowEnd ? 1 : Math.min(window.devicePixelRatio || 1, 2);
        // Frame skip: render every N frames on low-end (2 = 30fps effective)
        this._frameSkip = this._isLowEnd ? 2 : 1;

        this.init();
    }

    _detectLowEnd() {
        // Heuristic: touch device, or low core count, or low memory, or low devicePixelRatio with touch
        if (this._isTouchDevice) return true;
        if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) return true;
        if (navigator.deviceMemory && navigator.deviceMemory <= 4) return true;
        return false;
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
        // Pre-render particle sprite atlas for all glow sizes
        this._buildParticleSpriteAtlas();

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

    /**
     * Pre-render particle glow sprites at discrete sizes into an offscreen atlas.
     * Instead of creating a radialGradient per particle per frame, we drawImage() from this atlas.
     * We render sprites at several quantized sizes; at draw time we pick the closest one.
     */
    _buildParticleSpriteAtlas() {
        // Quantize glow sizes: particle.size ranges [0.4, 1.1], glowSize = size * 1.8 → [0.72, 1.98]
        // We create sprites at integer-scaled sizes for fast lookup
        const spriteResolution = this._isLowEnd ? 8 : 12; // px radius of largest sprite
        const numSprites = 4; // 4 size buckets
        const padding = 2;
        const cellSize = (spriteResolution + padding) * 2;
        const atlasWidth = cellSize * numSprites;
        const atlasHeight = cellSize;

        const atlas = document.createElement('canvas');
        atlas.width = atlasWidth;
        atlas.height = atlasHeight;
        const actx = atlas.getContext('2d');

        this._spriteAtlas = atlas;
        this._spriteCells = [];

        for (let i = 0; i < numSprites; i++) {
            // Map i → glowSize in logical px
            const t = i / (numSprites - 1); // 0..1
            const glowSize = 0.72 + t * (1.98 - 0.72); // actual glow sizes
            const renderRadius = spriteResolution * (0.4 + t * 0.6);

            const cx = i * cellSize + cellSize / 2;
            const cy = cellSize / 2;

            // Draw a white radial gradient dot at full opacity — we modulate alpha via globalAlpha at draw time
            const grad = actx.createRadialGradient(cx, cy, 0, cx, cy, renderRadius);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            grad.addColorStop(0.6, 'rgba(240, 240, 240, 0.5)');
            grad.addColorStop(1, 'rgba(220, 220, 220, 0)');

            actx.fillStyle = grad;
            actx.beginPath();
            actx.arc(cx, cy, renderRadius, 0, Math.PI * 2);
            actx.fill();

            this._spriteCells.push({
                sx: cx - renderRadius,
                sy: cy - renderRadius,
                sw: renderRadius * 2,
                sh: renderRadius * 2,
                renderRadius: renderRadius,
                glowSize: glowSize
            });
        }
    }

    /**
     * Pick the closest pre-rendered sprite for a given glowSize.
     * Returns the sprite cell index.
     */
    _pickSprite(glowSize) {
        const cells = this._spriteCells;
        let best = 0;
        let bestDist = Math.abs(cells[0].glowSize - glowSize);
        for (let i = 1; i < cells.length; i++) {
            const d = Math.abs(cells[i].glowSize - glowSize);
            if (d < bestDist) { bestDist = d; best = i; }
        }
        return best;
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
            // Don't clear hover immediately on mobile — let mobile-centered logic manage it
            // Only clear if no mobile-centered item exists
            setTimeout(() => {
                const centered = canvas.querySelector('.image-container.mobile-centered');
                if (!centered) {
                    this._hoveredLink = null;
                }
            }, 100);
        }, { passive: true });

        // Mobile: observe mobile-centered class changes to keep nebula alive
        this._setupMobileCenteredObserver(canvas);
    }

    _setupMobileCenteredObserver(canvas) {
        // Use a MutationObserver instead of continuous RAF polling
        if (!this._isTouchDevice) return;

        const handleCenteredChange = () => {
            const centered = canvas.querySelector('.image-container.mobile-centered');
            if (centered) {
                const link = centered.querySelector('.image-link, .video-link');
                if (link && link !== this._hoveredLink) {
                    this._hoveredLink = link;
                    const tooltip = link.querySelector('.tooltip');
                    if (tooltip) {
                        this.initializeTooltip(tooltip);
                    }
                    this.resumeIfNeeded();
                }
            } else {
                if (this._hoveredLink) {
                    this._hoveredLink = null;
                }
            }
        };

        // MutationObserver watching for class attribute changes on .image-container elements
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList && target.classList.contains('image-container')) {
                        handleCenteredChange();
                        return;
                    }
                }
                // Also handle added/removed nodes that may carry mobile-centered
                if (mutation.type === 'childList') {
                    handleCenteredChange();
                    return;
                }
            }
        });

        observer.observe(canvas, {
            attributes: true,
            attributeFilter: ['class'],
            subtree: true,
            childList: true
        });

        // Do a single initial check
        handleCenteredChange();
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
        const dpr = this._dpr;
        
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
        
        // Reduce particle count on low-end devices
        const density = this._isLowEnd ? 0.8 : 1.8;
        const maxParticles = this._isLowEnd ? 400 : 1200;
        const particleCount = Math.min(Math.floor(width * height * density), maxParticles);
        
        tooltipData.particles = [];

        const centerX = width / 2;
        const centerY = height / 2;
        
        for (let i = 0; i < particleCount; i++) {
            // Create particle concentrado horizontalmente (línea gruesa)
            
            // Distribución más amplia para cubrir más área del tooltip
            const xOffset = (Math.random() - 0.5) * width * 0.9; // casi todo el ancho
            const yOffset = (Math.random() - 0.5) * height * 1.4; // 140% de altura vertical
            
            const angle = Math.atan2(yOffset, xOffset);
            const size = Math.random() * 0.7 + 0.4;
            const glowSize = size * 1.8;

            tooltipData.particles.push({
                x: centerX + xOffset,
                y: centerY + yOffset,
                baseX: centerX + xOffset,
                baseY: centerY + yOffset,
                size: size,
                glowSize: glowSize,
                spriteIdx: this._pickSprite(glowSize), // pre-computed sprite bucket
                opacity: Math.random() * 0.6 + 0.8, // mayor opacidad
                angle: angle, // ángulo desde el centro
                cosAngle: Math.cos(angle), // pre-computed
                sinAngle: Math.sin(angle), // pre-computed
                disperseSpeed: Math.random() * 0.4 + 0.2, // velocidad de dispersión
                wobbleSpeedX: Math.random() * 0.3 + 0.2,
                wobbleSpeedY: Math.random() * 0.35 + 0.25,
                wobbleAmount: Math.random() * 30 + 15, // amplitud reducida
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    animate() {
        this.time += 0.06;
        this._frameCount++;

        // Frame skipping on low-end: compute positions but only render every N frames
        const shouldRender = (this._frameCount % this._frameSkip) === 0;

        // Render the tooltip whose parent link is currently hovered
        if (this._hoveredLink && shouldRender) {
            const tooltips = this.tooltips;
            for (let i = 0, len = tooltips.length; i < len; i++) {
                const tooltipData = tooltips[i];
                if (!tooltipData.initialized) continue;
                if (!tooltipData.element.isConnected) continue;
                const parent = tooltipData.element.closest('.image-link, .video-link');
                if (parent && parent === this._hoveredLink) {
                    this.renderNebula(tooltipData);
                    break; // only one tooltip is hovered at a time
                }
            }
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
        const { ctx, particles, canvasWidth, canvasHeight } = tooltipData;
        
        // Clear canvas - solo transparencia, sin fondo
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const invWidthFade = 1 / (canvasWidth * 0.2);
        const invHeightFade = 1 / (canvasHeight * 0.28);

        const time = this.time;
        const atlas = this._spriteAtlas;
        const cells = this._spriteCells;
        const isLowEnd = this._isLowEnd;
        
        // Draw particles - optimizado con sprite atlas
        for (let i = 0, len = particles.length; i < len; i++) {
            const particle = particles[i];

            // Dispersión radial hacia el centro
            const disperseOffset = Math.sin(time * particle.disperseSpeed) * 15;
            const disperseX = particle.cosAngle * disperseOffset * -1;
            const disperseY = particle.sinAngle * disperseOffset * -1;
            
            // Movimiento tipo ruido blanco — reduced to 2 frequencies on low-end
            const tWx = time * particle.wobbleSpeedX;
            const tWy = time * particle.wobbleSpeedY;
            const phase = particle.phase;
            const wAmt = particle.wobbleAmount;

            let wobbleX, wobbleY;
            if (isLowEnd) {
                // 2 frequencies instead of 3 — saves ~33% trig calls
                wobbleX = Math.sin(tWx + phase) * wAmt +
                          Math.sin(tWx * 3.7) * (wAmt * 0.3);
                wobbleY = Math.cos(tWy + phase) * wAmt +
                          Math.cos(tWy * 4.1) * (wAmt * 0.3);
            } else {
                wobbleX = Math.sin(tWx + phase) * wAmt +
                          Math.sin(tWx * 3.7) * (wAmt * 0.3) +
                          Math.sin(tWx * 7.2) * (wAmt * 0.15);
                wobbleY = Math.cos(tWy + phase) * wAmt +
                          Math.cos(tWy * 4.1) * (wAmt * 0.3) +
                          Math.cos(tWy * 8.5) * (wAmt * 0.15);
            }
            
            const px = particle.baseX + wobbleX + disperseX;
            const py = particle.baseY + wobbleY + disperseY;
            
            // Fade elíptico — calculate distance from center
            const dx = px - centerX;
            const dy = py - centerY;
            const normalizedDx = dx * invWidthFade;
            const normalizedDy = dy * invHeightFade;
            const ellipticalDist = Math.sqrt(normalizedDx * normalizedDx + normalizedDy * normalizedDy);
            
            // Fast fade calculation
            let distanceFade;
            if (ellipticalDist < 1.1) {
                distanceFade = 0;
            } else if (ellipticalDist < 1.3) {
                distanceFade = ((ellipticalDist - 1.1) * 5) * 0.4; // (x-1.1)/0.2 = (x-1.1)*5
            } else if (ellipticalDist < 1.6) {
                distanceFade = 0.4 + (((ellipticalDist - 1.3) * 3.333) * 0.6); // (x-1.3)/0.3
            } else if (ellipticalDist < 1.9) {
                distanceFade = 1 - ((ellipticalDist - 1.6) * 3.333); // (x-1.6)/0.3
            } else {
                distanceFade = 0;
            }
            
            // Skip invisible particles early
            if (distanceFade < 0.01) continue;

            // Pulsación rápida y errática (reduced on low-end)
            let pulseOpacity;
            if (isLowEnd) {
                pulseOpacity = particle.opacity * (0.5 +
                    Math.sin(time * 4 + particle.angle) * 0.4);
            } else {
                pulseOpacity = particle.opacity * (0.5 + 
                    Math.sin(time * 4 + particle.angle) * 0.3 +
                    Math.sin(time * 9.3 + phase) * 0.2);
            }

            const finalAlpha = pulseOpacity * distanceFade;
            if (finalAlpha < 0.01) continue;

            // Draw using pre-rendered sprite from atlas
            const cell = cells[particle.spriteIdx];
            const drawSize = particle.glowSize * 2;

            ctx.globalAlpha = finalAlpha;
            ctx.drawImage(
                atlas,
                cell.sx, cell.sy, cell.sw, cell.sh,
                px - particle.glowSize, py - particle.glowSize, drawSize, drawSize
            );
        }

        // Reset globalAlpha
        ctx.globalAlpha = 1;
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
