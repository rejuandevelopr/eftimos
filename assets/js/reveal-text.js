/**
 * Reveal Text Effect - Text that reveals based on cursor proximity
 * Only the parts of text near the cursor are visible
 * Mobile-compatible with gyroscope support
 */

(function() {
    'use strict';

    const REVEAL_RADIUS = 80; // Radius around cursor where text is visible
    const FADE_DISTANCE = 40; // Distance over which text fades out

    let canvases = [];
    let mouseX = 0;
    let mouseY = 0;
    let animationFrame = null;
    let isMobile = false;
    let gyroSupported = false;
    
    // Gyroscope tracking
    let gyroX = 0; // -1 to 1
    let gyroY = 0; // -1 to 1
    let initialBeta = null;
    let initialGamma = null;

    function init() {
        // Detect mobile device
        isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        setTimeout(() => {
            findRevealTextElements();
            setupEventListeners();
            
            if (isMobile) {
                requestGyroscopePermission();
            }
            
            startAnimation();
        }, 1000);
    }

    async function requestGyroscopePermission() {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ requires permission
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    setupGyroscope();
                }
            } catch (error) {
                console.log('Gyroscope permission denied');
            }
        } else {
            // Android and older iOS
            setupGyroscope();
        }
    }

    function setupGyroscope() {
        window.addEventListener('deviceorientation', handleOrientation, true);
        gyroSupported = true;
        console.log('Gyroscope enabled');
    }

    function handleOrientation(event) {
        // beta: front-to-back tilt (-180 to 180)
        // gamma: left-to-right tilt (-90 to 90)
        
        let beta = event.beta;  // -180 to 180 (front to back)
        let gamma = event.gamma; // -90 to 90 (left to right)
        
        // Initialize baseline on first read
        if (initialBeta === null) {
            initialBeta = beta;
            initialGamma = gamma;
        }
        
        // Calculate relative movement from initial position
        let relativeBeta = beta - initialBeta;
        let relativeGamma = gamma - initialGamma;
        
        // Clamp values
        relativeBeta = Math.max(-45, Math.min(45, relativeBeta));
        relativeGamma = Math.max(-45, Math.min(45, relativeGamma));
        
        // Normalize to -1 to 1
        gyroX = relativeGamma / 45;
        gyroY = relativeBeta / 45;
        
        // Convert to screen coordinates
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const range = 300; // How far from center the virtual cursor can move
        
        mouseX = centerX + (gyroX * range);
        mouseY = centerY + (gyroY * range);
    }

    function findRevealTextElements() {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        const templates = canvas.querySelectorAll('.image-container .reveal-text-container');
        
        canvases = Array.from(templates).map(container => {
            const canvasEl = container.querySelector('.reveal-text-canvas');
            const imageContainer = container.closest('.image-container');
            const text = imageContainer.dataset.text || 'HIDDEN TEXT';
            
            if (canvasEl && imageContainer) {
                setupCanvas(canvasEl, text);
                return {
                    canvas: canvasEl,
                    ctx: canvasEl.getContext('2d'),
                    container: imageContainer,
                    text: text
                };
            }
            return null;
        }).filter(Boolean);

        console.log(`Found ${canvases.length} reveal text elements`);
    }

    function setupCanvas(canvas, text) {
        canvas.width = 170;
        canvas.height = 170;
        
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 16px Helvetica Neue Condensed Bold, Helvetica, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // No letterSpacing en canvas API, pero se puede simular en el renderizado si se requiere
        // Forzar mayúsculas para igualar tooltips
        canvas.dataset.uppercase = 'true';
    }

    function setupEventListeners() {
        // Mouse/touch events
        document.addEventListener('mousemove', updateMousePosition);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchstart', handleTouchMove, { passive: false });
        
        // Add click/tap to request gyroscope permission on mobile
        if (isMobile && !gyroSupported) {
            document.addEventListener('click', requestGyroscopePermission, { once: true });
            document.addEventListener('touchstart', requestGyroscopePermission, { once: true });
        }
        
        const observer = new MutationObserver(() => {
            findRevealTextElements();
        });

        const canvas = document.getElementById('canvas');
        if (canvas) {
            observer.observe(canvas, { childList: true });
        }
    }

    function updateMousePosition(e) {
        if (!gyroSupported || !isMobile) {
            mouseX = e.clientX;
            mouseY = e.clientY;
        }
    }

    function handleTouchMove(e) {
        if (!gyroSupported && e.touches.length > 0) {
            e.preventDefault();
            mouseX = e.touches[0].clientX;
            mouseY = e.touches[0].clientY;
        }
    }

    function drawRevealText() {
        canvases.forEach(item => {
            if (!item.canvas || !item.ctx || !item.container) return;

            const ctx = item.ctx;
            const canvas = item.canvas;
            const rect = canvas.getBoundingClientRect();
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw transparent background (no fill)
            // ctx.fillStyle = 'rgba(15, 15, 15, 0.6)';
            // ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);
            
            // Split text into words for better wrapping
            // Forzar mayúsculas como en tooltip
            const displayText = item.text.toUpperCase();
            const words = displayText.split(' ');
            const lines = [];
            let currentLine = '';
            
            ctx.font = 'bold 16px "Helvetica Neue Condensed Bold", Helvetica, sans-serif';
            
            // Word wrap
            words.forEach(word => {
                const testLine = currentLine + (currentLine ? ' ' : '') + word;
                const metrics = ctx.measureText(testLine);
                if (metrics.width > canvas.width - 40 && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            });
            if (currentLine) lines.push(currentLine);
            
            // Calculate line height and starting Y position
            const lineHeight = 22;
            const totalHeight = lines.length * lineHeight;
            const startY = (canvas.height - totalHeight) / 2 + lineHeight / 2;
            
            // Draw each character with proximity-based opacity
            lines.forEach((line, lineIndex) => {
                const y = startY + lineIndex * lineHeight;
                const lineWidth = ctx.measureText(line).width;
                const startX = (canvas.width - lineWidth) / 2;
                
                let currentX = startX;
                
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    const charWidth = ctx.measureText(char).width;
                    
                    // Calculate character position in screen coordinates
                    const charScreenX = rect.left + currentX + charWidth / 2;
                    const charScreenY = rect.top + y;
                    
                    // Calculate distance from mouse to character
                    const dx = mouseX - charScreenX;
                    const dy = mouseY - charScreenY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Calculate opacity based on distance
                    let opacity = 0;
                    if (distance < REVEAL_RADIUS) {
                        opacity = 1;
                    } else if (distance < REVEAL_RADIUS + FADE_DISTANCE) {
                        opacity = 1 - ((distance - REVEAL_RADIUS) / FADE_DISTANCE);
                    }
                    
                    // Draw character with calculated opacity
                    if (opacity > 0) {
                        // Opacidad máxima aún más baja (por ejemplo, 0.28)
                        ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.28})`;
                        ctx.fillText(char, currentX + charWidth / 2, y);
                        // Glow más tenue
                        if (opacity > 0.7) {
                            ctx.shadowColor = 'rgba(0, 0, 0, 0.05)';
                            ctx.shadowBlur = 2;
                            ctx.fillText(char, currentX + charWidth / 2, y);
                            ctx.shadowBlur = 0;
                        }
                    }
                    
                    currentX += charWidth;
                }
            });
        });

        animationFrame = requestAnimationFrame(drawRevealText);
    }

    function startAnimation() {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        drawRevealText();
    }

    window.addEventListener('beforeunload', () => {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
    });

    // Pause when tab is hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (animationFrame) { cancelAnimationFrame(animationFrame); animationFrame = null; }
        } else {
            if (!animationFrame) drawRevealText();
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
