/**
 * UI SOUNDS SYSTEM
 * Manages consistent audio feedback for user interactions
 */

(function() {
    'use strict';
    
    // Sound paths
    const SOUNDS = {
        hover: 'assets/sounds/web-sfx/Cursor3.mp3',
        mapHover: 'assets/sounds/web-sfx/Cursor5.mp3',
        click: 'assets/sounds/web-sfx/Cursor1.mp3',
        mapClick: 'assets/sounds/web-sfx/Heartbeat-Single.mp3',
        dragEnd: 'assets/sounds/web-sfx/Error1.mp3'
    };
    
    // Audio elements cache
    const audioElements = {};
    
    // State tracking
    let audioEnabled = true;
    let audioInitialized = false;
    let lastHoverTime = 0;
    const HOVER_DEBOUNCE = 50; // ms - prevent rapid repeated hover sounds
    
    /**
     * Initialize audio elements
     */
    function initAudio() {
        if (audioInitialized) return;
        
        // Create audio elements for each sound
        Object.keys(SOUNDS).forEach(key => {
            const audio = new Audio(SOUNDS[key]);
            audio.preload = 'auto';
            audio.volume = 0.15; // Default volume for UI sounds (reduced to half)
            audioElements[key] = audio;
        });
        
        audioInitialized = true;
        console.log('[UI-SOUNDS] Audio system initialized');
    }
    
    /**
     * Play a sound effect
     * @param {string} soundType - Type of sound to play (hover, click, mapClick)
     */
    function playSound(soundType) {
        // Check if audio is enabled from multiple sources
        const storageAudioEnabled = localStorage.getItem('audioEnabled') !== 'false';
        const globalAudioEnabled = typeof window.audioEnabled === 'boolean' ? window.audioEnabled : true;
        
        if (!audioEnabled || !storageAudioEnabled || !globalAudioEnabled) {
            return;
        }
        
        // Ensure audio is initialized
        if (!audioInitialized) {
            initAudio();
        }
        
        const audio = audioElements[soundType];
        if (!audio) {
            console.warn(`[UI-SOUNDS] Sound type "${soundType}" not found`);
            return;
        }
        
        // Debounce hover sounds to prevent rapid repetition
        if (soundType === 'hover' || soundType === 'mapHover') {
            const now = Date.now();
            if (now - lastHoverTime < HOVER_DEBOUNCE) {
                return;
            }
            lastHoverTime = now;
        }
        
        // Set volume based on sound type
        if (soundType === 'mapHover') {
            audio.volume = 0.15; // Volumen bajo para hover (Cursor5)
        } else if (soundType === 'mapClick') {
            audio.volume = 0.35; // Volumen medio para click (Heartbeat-Single)
        } else if (soundType === 'dragEnd') {
            audio.volume = 0.12; // Volumen bajo para drag end
        } else {
            audio.volume = 0.15; // Default volume for other UI sounds
        }
        
        // Add slight pitch variation (0.5 to 1.5) for natural sound
        // Except for mapClick and dragEnd which should always have the same pitch
        let pitchVariation = 1.0;
        if (soundType !== 'mapClick' && soundType !== 'dragEnd') {
            pitchVariation = 0.5 + Math.random() * 1.0;
        }
        
        // IMPORTANT: Set playbackRate BEFORE resetting currentTime
        // Some browsers reset playbackRate when currentTime is changed
        audio.playbackRate = pitchVariation;
        
        console.log(`[UI-SOUNDS] Playing ${soundType} at pitch: ${pitchVariation.toFixed(2)}`);
        
        // Reset and play the sound
        audio.currentTime = 0;
        audio.play().catch(err => {
            // Silently fail on autoplay restrictions
            console.debug('[UI-SOUNDS] Play failed:', err.message);
        });
    }
    
    /**
     * Setup hover sound listeners
     */
    function setupHoverSounds() {
        // Define all hoverable selectors
        const hoverableSelectors = [
            'a',
            'button',
            '.video-link',
            '.image-link',
            '.cinema-close',
            '.menu-toggle',
            '.sidebar-control-btn',
            '.dropdown-link',
            '.dropdown-toggle',
            '.submenu-link',
            '.submit-btn',
            '.preloader-enter-btn',
            '.contact-close',
            '.text-phrase',
            'input[type="submit"]',
            'input[type="button"]'
        ];
        
        const selector = hoverableSelectors.join(', ');
        
        // Use event delegation for better performance
        document.addEventListener('mouseenter', (e) => {
            // Ensure e.target is an element with closest method
            if (!e.target || typeof e.target.closest !== 'function') return;
            
            const target = e.target.closest(selector);
            if (target) {
                // Check if this is a map interactive element
                const isMapElement = target.closest('.image-container, .image-link, .video-link, .text-phrase') !== null;
                const isInsideCanvas = target.closest('#canvas') !== null;
                
                if (isMapElement && isInsideCanvas) {
                    // Map element - no sound on hover
                    return;
                } else {
                    // Regular element - play normal hover sound
                    playSound('hover');
                }
            }
        }, true); // Use capture phase to catch all elements
    }
    
    /**
     * Setup click sound listeners
     */
    function setupClickSounds() {
        // Listen for clicks on the entire document
        document.addEventListener('mousedown', (e) => {
            // Ensure e.target is an element with closest method
            if (!e.target || typeof e.target.closest !== 'function') return;
            
            // Check if click is on an interactive map item (image-container, image-link, video-link, etc.)
            const mapInteractiveElement = e.target.closest('.image-container, .image-link, .video-link, .text-phrase');
            const isInsideCanvas = e.target.closest('#canvas') !== null;
            
            if (mapInteractiveElement && isInsideCanvas) {
                // Click on interactive map element - play map click sound
                playSound('mapClick');
            } else {
                // Regular click (anywhere else, including empty canvas areas) - play general click sound
                playSound('click');
            }
        }, true); // Use capture phase
        
        // Also handle touch events for mobile
        document.addEventListener('touchstart', (e) => {
            // Check if touch is on a map item
            const touch = e.touches[0];
            if (!touch) return;
            
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            if (!element || typeof element.closest !== 'function') return;
            
            // Check if touch is on an interactive map item
            const mapInteractiveElement = element.closest('.image-container, .image-link, .video-link, .text-phrase');
            const isInsideCanvas = element.closest('#canvas') !== null;
            
            if (mapInteractiveElement && isInsideCanvas) {
                // Touch on interactive map element - play map click sound
                playSound('mapClick');
            } else {
                // Regular touch (anywhere else, including empty canvas areas) - play general click sound
                playSound('click');
            }
        }, true); // Use capture phase
    }
    
    /**
     * Initialize the UI sounds system
     */
    function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        
        // Check initial audio state from localStorage
        audioEnabled = localStorage.getItem('audioEnabled') !== 'false';
        
        // Listen for audio toggle events (with or without detail)
        window.addEventListener('audioToggled', (e) => {
            // Try to get enabled state from event detail, otherwise from window.audioEnabled or localStorage
            if (e.detail && typeof e.detail.enabled === 'boolean') {
                audioEnabled = e.detail.enabled;
            } else if (typeof window.audioEnabled === 'boolean') {
                audioEnabled = window.audioEnabled;
            } else {
                audioEnabled = localStorage.getItem('audioEnabled') !== 'false';
            }
            console.log('[UI-SOUNDS] Audio toggled:', audioEnabled);
        });
        
        // Initialize audio on first user interaction
        const initOnInteraction = () => {
            if (!audioInitialized) {
                initAudio();
            }
        };
        
        document.addEventListener('click', initOnInteraction, { once: true });
        document.addEventListener('touchstart', initOnInteraction, { once: true });
        document.addEventListener('mouseenter', initOnInteraction, { once: true, capture: true });
        
        // Setup event listeners
        setupHoverSounds();
        setupClickSounds();
        
        console.log('[UI-SOUNDS] System ready');
    }
    
    // Auto-initialize
    init();
    
    // Expose API for external control
    window.UISounds = {
        play: playSound,
        enable: () => { audioEnabled = true; },
        disable: () => { audioEnabled = false; },
        setVolume: (soundType, volume) => {
            if (audioElements[soundType]) {
                audioElements[soundType].volume = Math.max(0, Math.min(1, volume));
            }
        }
    };
    
})();
