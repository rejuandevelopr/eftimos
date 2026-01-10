// ========== WAIT FOR DOM TO BE READY ==========
document.addEventListener('DOMContentLoaded', function() {
    initializeControls();
});

let userHasInteracted = false;

function initializeControls() {
    // ========== NAVBAR & MENU CONTROLS ==========

    // Menu Toggle
    const menuToggle = document.getElementById('menuToggle');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (menuToggle && dropdownMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menuToggle.classList.toggle('active');
            dropdownMenu.classList.toggle('active');
            document.body.classList.toggle('menu-open');
            
            // Update menu state in script.js for blur control
            if (window.isMenuActive !== undefined) {
                window.isMenuActive = dropdownMenu.classList.contains('active');
            }
        });

        // Close menu when clicking on a link (except Collections toggle)
        const dropdownLinks = document.querySelectorAll('.dropdown-link:not(.dropdown-toggle)');
        dropdownLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (link.id !== 'contactBtn') {
                    menuToggle.classList.remove('active');
                    dropdownMenu.classList.remove('active');
                    document.body.classList.remove('menu-open');
                    
                    // Update menu state in script.js for blur control
                    if (window.isMenuActive !== undefined) {
                        window.isMenuActive = false;
                    }
                }
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('nav') && !e.target.closest('.dropdown-menu')) {
                menuToggle.classList.remove('active');
                dropdownMenu.classList.remove('active');
                document.body.classList.remove('menu-open');
                
                // Update menu state in script.js for blur control
                if (window.isMenuActive !== undefined) {
                    window.isMenuActive = false;
                }
            }
        });

        // Close menu when pressing ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dropdownMenu.classList.contains('active')) {
                menuToggle.classList.remove('active');
                dropdownMenu.classList.remove('active');
                document.body.classList.remove('menu-open');
                
                // Update menu state in script.js for blur control
                if (window.isMenuActive !== undefined) {
                    window.isMenuActive = false;
                }
            }
        });
    }

    // ========== COLLECTIONS SUBMENU ==========
    const collectionsToggle = document.getElementById('collectionsToggle');
    const collectionsSubmenu = document.getElementById('collectionsSubmenu');

    if (collectionsToggle && collectionsSubmenu) {
        collectionsToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            collectionsToggle.classList.toggle('active');
            collectionsSubmenu.classList.toggle('active');
        });
    }

    // ========== CONTACT MODAL ==========
    const contactBtn = document.getElementById('contactBtn');
    const contactModal = document.getElementById('contactModal');
    const contactClose = document.getElementById('contactClose');
    const contactForm = document.getElementById('contactForm');

    if (contactBtn && contactModal) {
        contactBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Close menu
            menuToggle.classList.remove('active');
            dropdownMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
            
            // Update menu state in script.js for blur control
            if (window.isMenuActive !== undefined) {
                window.isMenuActive = false;
            }
            
            // Open contact modal
            contactModal.classList.add('active');
        });
    }

    if (contactClose && contactModal) {
        contactClose.addEventListener('click', () => {
            contactModal.classList.remove('active');
        });
    }

    if (contactModal) {
        contactModal.addEventListener('click', (e) => {
            if (e.target === contactModal) {
                contactModal.classList.remove('active');
            }
        });

        // Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && contactModal.classList.contains('active')) {
                contactModal.classList.remove('active');
            }
        });
    }

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Aquí puedes agregar la lógica para enviar el formulario
            alert('Form submitted! (Add your form handling logic here)');
            contactModal.classList.remove('active');
            contactForm.reset();
        });
    }

    // ========== VISUAL EFFECTS TOGGLE ==========

    const visualToggle = document.getElementById('visualToggle');
    const statusMessage = document.getElementById('statusMessage');
    let visualEffectsEnabled = localStorage.getItem('visualEffectsEnabled') !== 'false';
    let statusTimeout = null;
    let currentlyShowingMessage = false;

    // Initialize visual effects state
    updateVisualEffects();
    updateVisualIcon();

    if (visualToggle) {
        visualToggle.addEventListener('click', () => {
            visualEffectsEnabled = !visualEffectsEnabled;
            localStorage.setItem('visualEffectsEnabled', visualEffectsEnabled);
            // Update global window reference
            window.visualEffectsEnabled = visualEffectsEnabled;
            updateVisualEffects();
            updateVisualIcon();
            showStatusMessage(visualEffectsEnabled ? 'VISUAL EFFECTS: ON' : 'VISUAL EFFECTS: OFF');
        });
    }

    function showStatusMessage(message) {
        // Clear any existing timeout
        if (statusTimeout) {
            clearTimeout(statusTimeout);
        }

        // If a message is currently showing, fade it out first
        if (currentlyShowingMessage) {
            statusMessage.classList.remove('show');
            // Wait for fade out, then show new message
            setTimeout(() => {
                statusMessage.textContent = message;
                statusMessage.classList.add('show');
                currentlyShowingMessage = true;
                
                // Auto-hide after 3 seconds
                statusTimeout = setTimeout(() => {
                    statusMessage.classList.remove('show');
                    currentlyShowingMessage = false;
                }, 3000);
            }, 300); // Match CSS transition time
        } else {
            // No message showing, show immediately
            statusMessage.textContent = message;
            statusMessage.classList.add('show');
            currentlyShowingMessage = true;
            
            // Auto-hide after 3 seconds
            statusTimeout = setTimeout(() => {
                statusMessage.classList.remove('show');
                currentlyShowingMessage = false;
            }, 3000);
        }
    }

    function updateVisualIcon() {
        if (!visualToggle) return;
        
        const eyeOpen = visualToggle.querySelectorAll('.eye-open');
        const eyeClosed = visualToggle.querySelectorAll('.eye-closed');
        
        if (visualEffectsEnabled) {
            eyeOpen.forEach(el => el.style.display = '');
            eyeClosed.forEach(el => el.style.display = 'none');
        } else {
            eyeOpen.forEach(el => el.style.display = 'none');
            eyeClosed.forEach(el => el.style.display = '');
        }
    }

    function updateVisualEffects() {
        const body = document.body;
        const grainCanvas = document.getElementById('grainCanvas');
        const videosBackground = document.getElementById('videos-background');
        
        if (visualEffectsEnabled) {
            // Re-enable visual effects with smooth transition
            body.classList.remove('reduced-motion');
            body.classList.remove('visual-effects-disabled');
            if (grainCanvas) grainCanvas.style.opacity = '1';
            if (videosBackground) videosBackground.style.opacity = '1';
            // Start grain animation
            if (typeof window.startGrainEffect === 'function') {
                window.startGrainEffect();
            }
        } else {
            // Disable visual effects with smooth transition
            body.classList.add('reduced-motion');
            body.classList.add('visual-effects-disabled');
            if (grainCanvas) grainCanvas.style.opacity = '0';
            if (videosBackground) videosBackground.style.opacity = '0'; // Fully hide video background
            // Stop grain animation to save performance
            if (typeof window.stopGrainEffect === 'function') {
                window.stopGrainEffect();
            }
        }
    }

    // ========== AUDIO TOGGLE ==========

    const audioToggle = document.getElementById('audioToggle');
    const noiseSound = document.getElementById('noiseSound');
    const lockedInSound = document.getElementById('lockedInSound');
    
    // Start with audio disabled
    let audioEnabled = localStorage.getItem('audioEnabled') !== 'true';
    
    // Set initial volume very low with 3 levels: base, focused, hover with tooltip
    const baseNoiseVolume = 0.003;      // No interaction (almost imperceptible)
    const focusedNoiseVolume = 0.01;    // Element focused (no tooltip)
    const hoverNoiseVolume = 0.02;      // Hover with tooltip visible
    let targetNoiseVolume = baseNoiseVolume;
    let currentNoiseVolume = baseNoiseVolume;
    let unfocusTimeout = null;
    let isTooltipVisible = false;
    
    if (noiseSound) {
        noiseSound.volume = baseNoiseVolume;
    }
    
    // Smooth volume interpolation for focused elements
    const volumeInterpolationSpeed = 0.1; // Increased from 0.05 for faster response
    
    function updateNoiseVolume() {
        if (!noiseSound || !audioEnabled) return;
        
        let finalTargetVolume = targetNoiseVolume;
        
        // Apply distance-based intensity multiplier (from map bounds)
        // Use typeof check on window properties to ensure they're defined
        if (typeof window.targetOffsetX !== 'undefined' && typeof window.maxOffsetX !== 'undefined') {
            let distanceX = 0, distanceY = 0;
            
            if (window.targetOffsetX < window.minOffsetX) {
                distanceX = window.minOffsetX - window.targetOffsetX;
            } else if (window.targetOffsetX > window.maxOffsetX) {
                distanceX = window.targetOffsetX - window.maxOffsetX;
            }
            
            if (window.targetOffsetY < window.minOffsetY) {
                distanceY = window.minOffsetY - window.targetOffsetY;
            } else if (window.targetOffsetY > window.maxOffsetY) {
                distanceY = window.targetOffsetY - window.maxOffsetY;
            }
            
            // Calculate intensity multiplier based on distance
            const totalDistance = Math.max(distanceX, distanceY);
            const maxDistanceIntensity = 400; // Shortened from 500 for more aggressive intensity
            const normalizedDistance = Math.min(totalDistance / maxDistanceIntensity, 1);
            
            // Apply progressive intensity multiplier: 1.0x to 6.0x (increased from 4.0x)
            const volumeIntensityMultiplier = 1.0 + Math.pow(normalizedDistance, 0.7) * 5.0;
            const maxVolume = 0.8; // Increased from 0.6
            
            // Multiply base target volume by intensity, capped at max
            finalTargetVolume = Math.min(targetNoiseVolume * volumeIntensityMultiplier, maxVolume);
        }
        
        // Smooth interpolation to final target volume
        currentNoiseVolume += (finalTargetVolume - currentNoiseVolume) * volumeInterpolationSpeed;
        noiseSound.volume = currentNoiseVolume;
        // Keep global reference in sync
        window.currentNoiseVolume = currentNoiseVolume;
    }
    
    // Listen for tooltip show/hide events (highest priority)
    window.addEventListener('tooltipShown', () => {
        isTooltipVisible = true;
        // Clear any pending unfocus timeout
        if (unfocusTimeout) {
            clearTimeout(unfocusTimeout);
            unfocusTimeout = null;
        }
        targetNoiseVolume = hoverNoiseVolume; // 0.02
    });
    
    window.addEventListener('tooltipHidden', () => {
        isTooltipVisible = false;
        // When tooltip hides, go back to base volume
        targetNoiseVolume = baseNoiseVolume; // 0.005
    });
    
    // Listen for element focus/unfocus events
    window.addEventListener('elementFocused', () => {
        // Clear any pending unfocus timeout
        if (unfocusTimeout) {
            clearTimeout(unfocusTimeout);
            unfocusTimeout = null;
        }
        // Only set to focused volume if tooltip is not visible
        if (!isTooltipVisible) {
            targetNoiseVolume = focusedNoiseVolume; // 0.01
        }
    });
    
    window.addEventListener('elementUnfocused', () => {
        // Add small delay before lowering volume for smoother transitions
        // This prevents rapid volume drops when moving between elements
        if (unfocusTimeout) {
            clearTimeout(unfocusTimeout);
        }
        unfocusTimeout = setTimeout(() => {
            // Only go to base if no tooltip is visible
            if (!isTooltipVisible) {
                targetNoiseVolume = baseNoiseVolume; // 0.005
            }
            unfocusTimeout = null;
        }, 100); // 100ms delay
    });
    
    // Update volume smoothly every frame
    const volumeUpdateInterval = setInterval(updateNoiseVolume, 16); // ~60fps

    // Initialize audio state - muted by default
    updateAudio();
    updateAudioIcon();

    if (audioToggle) {
        audioToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            audioEnabled = !audioEnabled;
            localStorage.setItem('audioEnabled', audioEnabled);
            // Update global window reference
            window.audioEnabled = audioEnabled;
            updateAudio();
            updateAudioIcon();
            showStatusMessage(audioEnabled ? 'SOUND EFFECTS: ON' : 'SOUND EFFECTS: OFF');
        });
    }

    function updateAudioIcon() {
        if (!audioToggle) return;
        
        const speakerOn = audioToggle.querySelectorAll('.speaker-on');
        const speakerOff = audioToggle.querySelectorAll('.speaker-off');
        
        if (audioEnabled) {
            speakerOn.forEach(el => el.style.display = '');
            speakerOff.forEach(el => el.style.display = 'none');
        } else {
            speakerOn.forEach(el => el.style.display = 'none');
            speakerOff.forEach(el => el.style.display = '');
        }
    }

    function updateAudio() {
        if (audioEnabled) {
            // Resume audio
            if (noiseSound) {
                noiseSound.muted = false;
                currentNoiseVolume = baseNoiseVolume;
                noiseSound.volume = baseNoiseVolume;
                noiseSound.play().catch(e => console.log('Audio resume prevented'));
            }
            if (lockedInSound) {
                lockedInSound.muted = false;
            }
        } else {
            // Mute basic audio (keep videos unmuted)
            if (noiseSound) {
                noiseSound.muted = true;
                noiseSound.pause();
            }
            if (lockedInSound) {
                lockedInSound.muted = true;
                lockedInSound.pause();
            }
        }
    }

    // ========== AUTO-ACTIVATE AUDIO ON FIRST USER INTERACTION ==========
    
    function activateAudioOnFirstInteraction() {
        if (userHasInteracted) return;
        
        userHasInteracted = true;
        
        // Enable audio
        audioEnabled = true;
        localStorage.setItem('audioEnabled', audioEnabled);
        updateAudio();
        updateAudioIcon();
        
        console.log('Audio activated on first user interaction');
    }
    
    // Listen for various user interactions
    document.addEventListener('click', activateAudioOnFirstInteraction, { once: true });
    document.addEventListener('touchstart', activateAudioOnFirstInteraction, { once: true });
    document.addEventListener('keydown', activateAudioOnFirstInteraction, { once: true });
    document.addEventListener('mousemove', activateAudioOnFirstInteraction, { once: true });

    // ========== MAKE STATES GLOBALLY ACCESSIBLE ==========

    window.audioEnabled = audioEnabled;
    window.visualEffectsEnabled = visualEffectsEnabled;
    window.currentNoiseVolume = currentNoiseVolume;
}

