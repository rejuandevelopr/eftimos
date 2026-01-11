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

        // ========== AUDIO FILTER SETUP ========== 
        // Soporte para low pass filter en noise y whispers
        let audioCtx = null;
        let noiseSource = null;
        let noiseFilter = null;
        let noiseGain = null;
        let whispersSource = null;
        let whispersFilter = null;
        let whispersGain = null;
        let filterActive = false;
        let filterTransitionFrame = null;

        // === WHISPERS VOLUME MODULATION ===
        let whispersBaseVolume = 0.08; // Valor base, puede ajustarse
        let whispersTargetVolume = whispersBaseVolume;
        let whispersCurrentVolume = whispersBaseVolume;
        let whispersModulationPhase = Math.random() * Math.PI * 2;
            // Controla si la modulación está activa
            let whispersModulationEnabled = true;
        let whispersModulationSpeed = 0.025 + Math.random() * 0.01; // Oscilación extremadamente lenta
        let whispersModulationAmount = 0.95; // Profundidad de la modulación (muy intensa)
        let whispersModulationTimer = null;

        // Permite a otros sistemas cambiar el volumen base de whispers
        window.setWhispersTargetVolume = function(vol) {
            whispersTargetVolume = vol;
        };

        function setupAudioFilters() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            // Noise
            const noiseEl = document.getElementById('noiseSound');
            if (noiseEl && !noiseSource) {
                noiseSource = audioCtx.createMediaElementSource(noiseEl);
                noiseFilter = audioCtx.createBiquadFilter();
                noiseFilter.type = 'lowpass';
                noiseFilter.frequency.value = 22050;
                noiseGain = audioCtx.createGain();
                noiseSource.connect(noiseFilter).connect(noiseGain).connect(audioCtx.destination);
            }
            // Whispers
            const whispersEl = document.getElementById('whispersSound');
            if (whispersEl && !whispersSource) {
                whispersSource = audioCtx.createMediaElementSource(whispersEl);
                whispersFilter = audioCtx.createBiquadFilter();
                whispersFilter.type = 'lowpass';
                whispersFilter.frequency.value = 22050;
                whispersGain = audioCtx.createGain();
                whispersSource.connect(whispersFilter).connect(whispersGain).connect(audioCtx.destination);
                // Inicializar volumen base
                whispersGain.gain.value = whispersBaseVolume;
            }
                // === MODULACIÓN DE VOLUMEN DE WHISPERS ===
                function updateWhispersVolumeModulation() {
                    if (!whispersGain) return;
                    // Interpolación suave hacia el target (por si cambia por hover, etc)
                    whispersCurrentVolume += (whispersTargetVolume - whispersCurrentVolume) * 0.08;
                    let finalVol;
                    if (whispersModulationEnabled) {
                        // Oscilación suave y random
                        whispersModulationPhase += whispersModulationSpeed * (0.8 + Math.random() * 0.4);
                        // Suma de dos senos para hacerlo menos predecible
                        let mod = Math.sin(whispersModulationPhase) * 0.6 + Math.sin(whispersModulationPhase * 0.37 + 100) * 0.4;
                        mod *= whispersModulationAmount;
                        // Clamp para evitar valores negativos
                        finalVol = Math.max(0, whispersCurrentVolume * (1 + mod));
                    } else {
                        finalVol = whispersCurrentVolume;
                    }
                    whispersGain.gain.value = finalVol;
                }

                // Llama a la modulación ~60fps
                setInterval(updateWhispersVolumeModulation, 16);
        }

        // Inicializar filtros de audio al cargar la página para evitar poppeo
        setupAudioFilters();

        function setLowPassFilter(targetFreq, duration = 400) {
            setupAudioFilters();
            filterActive = true;
            const startNoise = noiseFilter.frequency.value;
            const startWhispers = whispersFilter.frequency.value;
            const end = performance.now() + duration;
            function animate() {
                const now = performance.now();
                const t = Math.min(1, (now - (end - duration)) / duration);
                // Ease in-out cubic
                const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                noiseFilter.frequency.value = startNoise + (targetFreq - startNoise) * ease;
                whispersFilter.frequency.value = startWhispers + (targetFreq - startWhispers) * ease;
                if (t < 1) {
                    filterTransitionFrame = requestAnimationFrame(animate);
                } else {
                    noiseFilter.frequency.value = targetFreq;
                    whispersFilter.frequency.value = targetFreq;
                    filterTransitionFrame = null;
                }
            }
            if (filterTransitionFrame) cancelAnimationFrame(filterTransitionFrame);
            animate();
        }

        function restoreLowPassFilter(duration = 400) {
            setupAudioFilters();
            filterActive = false;
            const startNoise = noiseFilter.frequency.value;
            const startWhispers = whispersFilter.frequency.value;
            const targetFreq = 22050;
            const end = performance.now() + duration;
            function animate() {
                const now = performance.now();
                const t = Math.min(1, (now - (end - duration)) / duration);
                // Ease in-out cubic
                const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                noiseFilter.frequency.value = startNoise + (targetFreq - startNoise) * ease;
                whispersFilter.frequency.value = startWhispers + (targetFreq - startWhispers) * ease;
                if (t < 1) {
                    filterTransitionFrame = requestAnimationFrame(animate);
                } else {
                    noiseFilter.frequency.value = targetFreq;
                    whispersFilter.frequency.value = targetFreq;
                    filterTransitionFrame = null;
                }
            }
            if (filterTransitionFrame) cancelAnimationFrame(filterTransitionFrame);
            animate();
        }

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

            // LOW PASS FILTER: aplicar/quitar filtro al abrir/cerrar menú
            if (dropdownMenu.classList.contains('active')) {
                setLowPassFilter(1200, 300); // Aún más rápido al abrir
            } else {
                restoreLowPassFilter(900);
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

                    // Quitar filtro al cerrar menú
                    restoreLowPassFilter(500);
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

                // Quitar filtro al cerrar menú
                restoreLowPassFilter(500);
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

                // Quitar filtro al cerrar menú
                restoreLowPassFilter(500);
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
            // Emitir evento global para efectos visuales
            const evt = new Event('visualEffectsToggled');
            window.dispatchEvent(evt);
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
    const hoverNoiseVolume = 0.006;      // Hover with tooltip visible
    let targetNoiseVolume = baseNoiseVolume;
    let currentNoiseVolume = baseNoiseVolume;
    let unfocusTimeout = null;
    let isTooltipVisible = false;
    // Para whispers
    const baseWhispersVolume = 0.16; // Antes 0.08, ahora más audible
    const focusedWhispersVolume = 0.22;
    const hoverWhispersVolume = 0.29;
    
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
            whispersModulationEnabled = false;
        isTooltipVisible = true;
        if (unfocusTimeout) {
            clearTimeout(unfocusTimeout);
            unfocusTimeout = null;
        }
        targetNoiseVolume = hoverNoiseVolume; // 0.02
        window.setWhispersTargetVolume(hoverWhispersVolume);
    });

    window.addEventListener('tooltipHidden', () => {
            whispersModulationEnabled = true;
        isTooltipVisible = false;
        targetNoiseVolume = baseNoiseVolume; // 0.005
        window.setWhispersTargetVolume(baseWhispersVolume);
    });

    window.addEventListener('elementFocused', () => {
        if (unfocusTimeout) {
            clearTimeout(unfocusTimeout);
            unfocusTimeout = null;
        }
        if (!isTooltipVisible) {
            targetNoiseVolume = focusedNoiseVolume; // 0.01
            window.setWhispersTargetVolume(focusedWhispersVolume);
        }
    });

    window.addEventListener('elementUnfocused', () => {
        if (unfocusTimeout) {
            clearTimeout(unfocusTimeout);
        }
        unfocusTimeout = setTimeout(() => {
            if (!isTooltipVisible) {
                targetNoiseVolume = baseNoiseVolume; // 0.005
                window.setWhispersTargetVolume(baseWhispersVolume);
            }
            unfocusTimeout = null;
        }, 100);
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

