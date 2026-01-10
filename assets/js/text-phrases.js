/**
 * Text Phrases Effect - Hidden phrases that reveal on hover
 * Creates an interactive discovery effect for mysterious text elements
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        discoveryRadius: 150, // Radius around cursor to start revealing
        revealDuration: 800,  // Duration of reveal animation
        hideDuration: 600,    // Duration of hide animation
    };

    let textPhrases = [];
    let mouseX = 0;
    let mouseY = 0;
    let animationFrame = null;

    // Initialize after DOM is loaded
    function init() {
        // Wait for elements to be added to canvas
        setTimeout(() => {
            findTextPhrases();
            setupEventListeners();
            startProximityDetection();
        }, 1000);
    }

    // Find all text phrase elements in the canvas
    function findTextPhrases() {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        const phraseContainers = canvas.querySelectorAll('.image-container.text-phrase-template');
        
        textPhrases = Array.from(phraseContainers).map(container => {
            const phraseLink = container.querySelector('.phrase-link');
            const maskElement = container.querySelector('.phrase-mask');
            const textElement = container.querySelector('.phrase-text');
            
            return {
                container: container,
                element: phraseLink,
                mask: maskElement,
                textElement: textElement,
                isRevealed: false,
                proximityValue: 0
            };
        });

        console.log(`Found ${textPhrases.length} text phrases`);
    }

    // Setup event listeners
    function setupEventListeners() {
        document.addEventListener('mousemove', updateMousePosition);
        
        // Re-initialize when canvas content changes
        const observer = new MutationObserver(() => {
            findTextPhrases();
        });

        const canvas = document.getElementById('canvas');
        if (canvas) {
            observer.observe(canvas, { childList: true });
        }
    }

    // Update mouse position
    function updateMousePosition(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    }

    // Calculate distance between two points
    function getDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Get element position on screen
    function getElementCenter(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    // Check proximity and update reveal state
    function checkProximity() {
        textPhrases.forEach(phrase => {
            if (!phrase.container || !phrase.element) return;

            const center = getElementCenter(phrase.container);
            const distance = getDistance(mouseX, mouseY, center.x, center.y);
            
            // Calculate proximity value (0 = far, 1 = very close)
            const proximity = Math.max(0, 1 - (distance / CONFIG.discoveryRadius));
            phrase.proximityValue = proximity;

            // Apply partial reveal based on proximity
            if (proximity > 0.1) {
                applyPartialReveal(phrase, proximity);
            } else {
                resetReveal(phrase);
            }
        });

        animationFrame = requestAnimationFrame(checkProximity);
    }

    // Apply partial reveal effect based on proximity
    function applyPartialReveal(phrase, proximity) {
        if (!phrase.textElement || !phrase.mask) return;

        // Ease the proximity value for smoother animation
        const easedProximity = easeOutQuad(proximity);
        
        // Update text opacity
        const textOpacity = easedProximity;
        phrase.textElement.style.opacity = textOpacity;
        
        // Update mask opacity and blur
        const maskOpacity = 1 - easedProximity;
        const blurAmount = maskOpacity * 3;
        
        phrase.mask.style.opacity = maskOpacity;
        phrase.mask.style.transform = `scale(${1 + (easedProximity * 0.1)})`;
        phrase.mask.style.backdropFilter = `blur(${blurAmount}px)`;
        
        // Add subtle glow effect when revealed
        if (proximity > 0.7) {
            phrase.container.style.textShadow = `0 0 ${20 * easedProximity}px rgba(255, 255, 255, 0.6)`;
        } else {
            phrase.container.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.3)';
        }
    }

    // Reset reveal effect
    function resetReveal(phrase) {
        if (!phrase.textElement || !phrase.mask) return;

        phrase.textElement.style.opacity = '0';
        phrase.mask.style.opacity = '1';
        phrase.mask.style.transform = 'scale(1)';
        phrase.mask.style.backdropFilter = 'blur(2px)';
        phrase.container.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.3)';
    }

    // Easing function for smoother animation
    function easeOutQuad(t) {
        return t * (2 - t);
    }

    // Start proximity detection loop
    function startProximityDetection() {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        checkProximity();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
