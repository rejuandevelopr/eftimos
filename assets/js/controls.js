// ========== WAIT FOR DOM TO BE READY ==========
// v2.0 - Manual crossfade system
document.addEventListener('DOMContentLoaded', function() {
    initializeControls();
});

let userHasInteracted = false;
let _audioFiltersInitialized = false;
let preloaderEnterPressed = false; // No permitir audio hasta que se presione Enter
// Solo establecer si aún no está definido (para páginas sin preloader como clothes-view)
if (typeof window.preloaderEnterPressed === 'undefined') {
    window.preloaderEnterPressed = false;
}

// ========== iOS TOUCH PROXY OVERLAY ==========
// iOS WebKit blocks ALL touch events on position:fixed elements with
// mix-blend-mode other than 'normal'. Instead of removing the blend mode,
// we create invisible proxy buttons that sit ABOVE the nav (higher z-index,
// no blend-mode) and forward taps to the real menu toggle and logo.
(function () {
    var isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    var proxiesCreated = false;
    var hamburgerProxy = null;
    var logoProxy = null;

    function createTouchProxies() {
        if (proxiesCreated) return;
        var menuToggle = document.getElementById('menuToggle');
        var logoEl = document.querySelector('nav.blending-item .logo');
        if (!menuToggle || !logoEl) return;

        proxiesCreated = true;

        // --- Hamburger proxy ---
        hamburgerProxy = document.createElement('button');
        hamburgerProxy.className = 'nav-touch-proxy';
        hamburgerProxy.setAttribute('aria-label', 'Menu');
        hamburgerProxy.id = 'navTouchProxyHamburger';
        document.body.appendChild(hamburgerProxy);

        hamburgerProxy.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            menuToggle.click();
        });
        hamburgerProxy.addEventListener('touchend', function (e) {
            e.preventDefault();
            menuToggle.click();
        }, { passive: false });

        // --- Logo proxy ---
        logoProxy = document.createElement('button');
        logoProxy.className = 'nav-touch-proxy';
        logoProxy.setAttribute('aria-label', 'Home');
        logoProxy.id = 'navTouchProxyLogo';
        document.body.appendChild(logoProxy);

        logoProxy.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            logoEl.click();
        });
        logoProxy.addEventListener('touchend', function (e) {
            e.preventDefault();
            logoEl.click();
        }, { passive: false });

        syncProxyPositions();
    }

    function syncProxyPositions() {
        if (!hamburgerProxy || !logoProxy) return;

        var menuToggle = document.getElementById('menuToggle');
        var logoEl = document.querySelector('nav.blending-item .logo');
        if (!menuToggle || !logoEl) return;

        var mtRect = menuToggle.getBoundingClientRect();
        var logoRect = logoEl.getBoundingClientRect();

        // Ensure minimum 48px tap target (Apple HIG)
        var mtW = Math.max(mtRect.width, 48);
        var mtH = Math.max(mtRect.height, 48);
        var mtLeft = mtRect.left - (mtW - mtRect.width) / 2;
        var mtTop = mtRect.top - (mtH - mtRect.height) / 2;

        hamburgerProxy.style.cssText =
            'position:fixed;top:' + mtTop + 'px;left:' + mtLeft + 'px;' +
            'width:' + mtW + 'px;height:' + mtH + 'px;' +
            'z-index:250001;background:transparent;border:none;padding:0;margin:0;' +
            'touch-action:manipulation;-webkit-tap-highlight-color:transparent;' +
            'pointer-events:auto;cursor:pointer;outline:none;';

        logoProxy.style.cssText =
            'position:fixed;top:' + logoRect.top + 'px;left:' + logoRect.left + 'px;' +
            'width:' + logoRect.width + 'px;height:' + logoRect.height + 'px;' +
            'z-index:250001;background:transparent;border:none;padding:0;margin:0;' +
            'touch-action:manipulation;-webkit-tap-highlight-color:transparent;' +
            'pointer-events:auto;cursor:pointer;outline:none;';
    }

    function updateProxyVisibility() {
        if (!hamburgerProxy) return;
        var menuOpen = document.body.classList.contains('menu-open');
        // Hide logo proxy when sidebar menu is open
        if (logoProxy) {
            logoProxy.style.pointerEvents = menuOpen ? 'none' : 'auto';
        }
    }

    // Observe body class changes (menu-open toggle)
    var bodyObserver = new MutationObserver(function () {
        updateProxyVisibility();
        requestAnimationFrame(syncProxyPositions);
    });

    function initProxies() {
        createTouchProxies();
        window.addEventListener('resize', function () {
            requestAnimationFrame(syncProxyPositions);
        });
        window.addEventListener('orientationchange', function () {
            setTimeout(syncProxyPositions, 300);
        });
        bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    // Try to init after preloader is finished (index.html dispatches this event)
    window.addEventListener('preloaderFinished', function () {
        setTimeout(initProxies, 100);
    });
    // Fallback for pages without preloader
    if (document.readyState === 'complete') {
        setTimeout(initProxies, 200);
    } else {
        window.addEventListener('load', function () {
            setTimeout(initProxies, 600);
        });
    }
    // Final safety-net timeout
    setTimeout(initProxies, 3500);

    // Re-init on bfcache restore
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) setTimeout(initProxies, 200);
    });

    console.log('[CONTROLS] iOS touch proxy system registered');
})();
// ========== END iOS TOUCH PROXY OVERLAY ==========

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
    let whispersBaseVolume = 0.05; // Valor base, puede ajustarse
    let whispersTargetVolume = whispersBaseVolume;
    let whispersCurrentVolume = whispersBaseVolume;
    let whispersModulationPhase = Math.random() * Math.PI * 2;
    // Controla si la modulación está activa
    let whispersModulationEnabled = true;
    let whispersModulationSpeed = 0.025 + Math.random() * 0.01; // Oscilación extremadamente lenta
    let whispersModulationAmount = 0.4; // Profundidad de la modulación (reducida para menos variación)
    let whispersModulationTimer = null;
    let isFadingOut = false; // Bandera para evitar restauración de volumen durante fade out

    // === SISTEMA DE CROSSFADE LOOPING MANUAL ===
    // Para evitar bloqueo de navegadores con loop = true
    // Los navegadores modernos pueden bloquear sonidos marcados como "loop"
    // Este sistema crea instancias nuevas antes de que termine el sonido actual
    // y hace un crossfade suave (fade in/out) para crear un loop imperceptible
    let noiseCrossfadeSystem = {
        enabled: false,
        currentInstance: null,
        nextInstance: null,
        fadeDuration: 2000, // 2 segundos de crossfade
        checkInterval: null,
        beforeEndThreshold: 3000 // Comenzar crossfade 3 segundos antes del final
    };

    let whispersCrossfadeSystem = {
        enabled: false,
        currentInstance: null,
        nextInstance: null,
        fadeDuration: 2000,
        checkInterval: null,
        beforeEndThreshold: 3000
    };

    function startCrossfadeLoop(system, element, isNoise) {
        if (!element || system.enabled) return;
        
        console.log(`[CROSSFADE] Starting manual loop for ${isNoise ? 'noise' : 'whispers'}`);
        system.enabled = true;
        system.currentInstance = element;
        
        // No establecer loop = true
        element.loop = false;
        
        // Función para verificar el tiempo y preparar la siguiente instancia
        function checkAndPrepareNext() {
            if (!system.enabled || !system.currentInstance) return;
            
            const current = system.currentInstance;
            const timeLeft = current.duration - current.currentTime;
            
            // Si estamos cerca del final y no hay siguiente instancia preparándose
            if (timeLeft <= system.beforeEndThreshold / 1000 && !system.nextInstance) {
                console.log(`[CROSSFADE] Preparing next instance for ${isNoise ? 'noise' : 'whispers'}, time left: ${timeLeft.toFixed(2)}s`);
                
                // Crear nueva instancia
                const next = new Audio(current.src);
                next.loop = false;
                next.volume = 0; // Empezar en silencio
                next.currentTime = 0;
                
                system.nextInstance = next;
                
                // Conectar al AudioContext si existe
                if (audioCtx) {
                    try {
                        const source = audioCtx.createMediaElementSource(next);
                        if (isNoise && noiseFilter && noiseGain) {
                            source.connect(noiseFilter).connect(noiseGain).connect(audioCtx.destination);
                        } else if (!isNoise && whispersFilter && whispersGain) {
                            source.connect(whispersFilter).connect(whispersGain).connect(audioCtx.destination);
                        } else {
                            source.connect(audioCtx.destination);
                        }
                    } catch (err) {
                        console.warn(`[CROSSFADE] AudioContext connection failed: ${err.message}`);
                    }
                }
                
                // Iniciar reproducción de la siguiente instancia
                next.play().then(() => {
                    console.log(`[CROSSFADE] Next instance started for ${isNoise ? 'noise' : 'whispers'}`);
                    
                    // Realizar crossfade
                    const fadeStartTime = performance.now();
                    const currentStartVol = isNoise ? (noiseGain ? noiseGain.gain.value : current.volume) : 
                                                       (whispersGain ? whispersGain.gain.value : current.volume);
                    
                    function crossfade() {
                        const elapsed = performance.now() - fadeStartTime;
                        const progress = Math.min(1, elapsed / system.fadeDuration);
                        const eased = -(Math.cos(Math.PI * progress) - 1) / 2; // ease in-out
                        
                        // Fade out current, fade in next
                        if (isNoise && noiseGain) {
                            // Para noise: ajustar el gain node
                            const targetVol = currentStartVol;
                            noiseGain.gain.value = targetVol * (1 - eased);
                            next.volume = 1; // La siguiente mantiene volumen completo, controlado por gain
                        } else if (!isNoise && whispersGain) {
                            // Para whispers: el volumen se controla por modulación
                            const targetVol = currentStartVol;
                            whispersGain.gain.value = targetVol * (1 - eased) + whispersBaseVolume * eased;
                            next.volume = 1;
                        } else {
                            // Fallback sin AudioContext
                            current.volume = currentStartVol * (1 - eased);
                            next.volume = currentStartVol * eased;
                        }
                        
                        if (progress < 1) {
                            requestAnimationFrame(crossfade);
                        } else {
                            // Crossfade completado
                            console.log(`[CROSSFADE] Crossfade completed for ${isNoise ? 'noise' : 'whispers'}`);
                            
                            // Pausar y limpiar la instancia anterior
                            if (system.currentInstance) {
                                var _old = system.currentInstance;
                                _old.pause();
                                _old.currentTime = 0;
                                // Liberar recurso para evitar memory leak
                                try { _old.src = ''; _old.load(); } catch(e) {}
                            }
                            
                            // La siguiente instancia se convierte en la actual
                            system.currentInstance = system.nextInstance;
                            system.nextInstance = null;
                            
                            // Restaurar volumen apropiado
                            if (isNoise && noiseGain) {
                                noiseGain.gain.value = currentStartVol;
                            } else if (!isNoise && whispersGain) {
                                whispersGain.gain.value = whispersBaseVolume;
                            }
                        }
                    }
                    
                    crossfade();
                }).catch(err => {
                    console.error(`[CROSSFADE] Failed to start next instance: ${err.message}`);
                    system.nextInstance = null;
                });
            }
        }
        
        // Verificar cada 500ms (3s threshold no necesita alta frecuencia)
        system.checkInterval = setInterval(checkAndPrepareNext, 500);
    }

    function stopCrossfadeLoop(system, isNoise) {
        if (!system.enabled) return;
        
        console.log(`[CROSSFADE] Stopping manual loop for ${isNoise ? 'noise' : 'whispers'}`);
        system.enabled = false;
        
        if (system.checkInterval) {
            clearInterval(system.checkInterval);
            system.checkInterval = null;
        }
        
        if (system.currentInstance) {
            system.currentInstance.pause();
            // No liberar currentInstance con src='' aquí porque es el <audio> original del DOM
        }
        
        if (system.nextInstance) {
            system.nextInstance.pause();
            try { system.nextInstance.src = ''; system.nextInstance.load(); } catch(e) {}
            system.nextInstance = null;
        }
    }

    // Permite a otros sistemas cambiar el volumen base de whispers
    window.setWhispersTargetVolume = function(vol) {
        whispersTargetVolume = vol;
    };

    // Función para hacer fade out rápido de whispers y white-noise (para cuando se reproduce locked-in)
    window.fadeOutAmbientSounds = function(duration = 200) {
        console.log('[FADE] Fading out ambient sounds with pitch shift');
        
        // Activar bandera de fade out para evitar que otros sistemas restauren el volumen
        isFadingOut = true;
        
        // Deshabilitar la modulación de whispers inmediatamente
        whispersModulationEnabled = false;
        
        // Detener sistemas de crossfade para evitar nuevas instancias
        stopCrossfadeLoop(noiseCrossfadeSystem, true);
        stopCrossfadeLoop(whispersCrossfadeSystem, false);
        
        const startTime = performance.now();
        const startNoiseVol = noiseGain ? noiseGain.gain.value : 0;
        const startWhispersVol = whispersGain ? whispersGain.gain.value : 0;
        
        // Obtener elementos de audio para modificar pitch
        const noiseSound = document.getElementById('noiseSound');
        const whispersSound = document.getElementById('whispersSound');
        const startPitch = 1.0;
        const endPitch = 0.6; // Bajar a 60% del pitch original
        
        function fadeOut() {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            const eased = progress * progress * progress; // ease in cúbico (más agresivo)
            
            // Fade out del volumen
            if (noiseGain) {
                noiseGain.gain.value = startNoiseVol * (1 - eased);
            }
            if (whispersGain) {
                whispersGain.gain.value = startWhispersVol * (1 - eased);
            }
            
            // Transición de pitch descendente
            const currentPitch = startPitch - (startPitch - endPitch) * eased;
            if (noiseSound) {
                noiseSound.playbackRate = currentPitch;
            }
            if (whispersSound) {
                whispersSound.playbackRate = currentPitch;
            }
            
            if (progress < 1) {
                requestAnimationFrame(fadeOut);
            } else {
                // Asegurar que estén en 0 y mantenerlos ahí
                if (noiseGain) noiseGain.gain.value = 0;
                if (whispersGain) whispersGain.gain.value = 0;
                // Pitch final
                if (noiseSound) noiseSound.playbackRate = endPitch;
                if (whispersSound) whispersSound.playbackRate = endPitch;
                
                // Pausar los sonidos completamente
                if (noiseSound) noiseSound.pause();
                if (whispersSound) whispersSound.pause();
                
                console.log('[FADE] Fade out completed - volumes locked at 0');
            }
        }
        
        fadeOut();
    };

    // Función para restaurar el volumen de whispers y white-noise
    window.fadeInAmbientSounds = function(duration = 800) {
        console.log('[FADE] Fading in ambient sounds');
        const startTime = performance.now();
        const targetNoiseVol = 0.12; // Valor aumentado del gain
        const targetWhispersVol = whispersBaseVolume;
        
        // Restaurar pitch a normal
        const noiseSound = document.getElementById('noiseSound');
        const whispersSound = document.getElementById('whispersSound');
        if (noiseSound) noiseSound.playbackRate = 1.0;
        if (whispersSound) whispersSound.playbackRate = 1.0;
        
        function fadeIn() {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            const eased = -(Math.cos(Math.PI * progress) - 1) / 2; // ease in-out
            
            if (noiseGain) {
                noiseGain.gain.value = targetNoiseVol * eased;
            }
            if (whispersGain) {
                whispersGain.gain.value = targetWhispersVol * eased;
            }
            
            if (progress < 1) {
                requestAnimationFrame(fadeIn);
            } else {
                // Asegurar valores finales
                if (noiseGain) noiseGain.gain.value = targetNoiseVol;
                if (whispersGain) whispersGain.gain.value = targetWhispersVol;
            }
        }
        
        fadeIn();
    };

    // Permite a otros sistemas activar/desactivar la modulación de whispers con transición suave
    window.setWhispersModulationEnabled = function(enabled, duration = 400) {
        if (typeof enabled !== 'boolean') return;
        if (whispersModulationEnabled === enabled) return;
        // Transición suave: interpolar modulationAmount
        const start = whispersModulationAmount;
        const end = enabled ? 0.95 : 0.0;
        const startTime = performance.now();
        function animate() {
            const now = performance.now();
            const t = Math.min(1, (now - startTime) / duration);
            // Ease in-out cubic
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            whispersModulationAmount = start + (end - start) * ease;
            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                whispersModulationAmount = end;
                whispersModulationEnabled = enabled;
            }
        }
        animate();
    };

    function setupAudioFilters() {
        if (_audioFiltersInitialized) {
            console.log('[SETUP] Audio filters already initialized');
            return;
        }
        
        console.log('[SETUP] Initializing audio filters...');
        
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                console.log('[SETUP] AudioContext created');
            }
            
            // Noise - Setup AudioContext nodes
            const noiseEl = document.getElementById('noiseSound');
            if (noiseEl && !noiseSource) {
                noiseEl.loop = false;
                noiseSource = audioCtx.createMediaElementSource(noiseEl);
                noiseFilter = audioCtx.createBiquadFilter();
                noiseFilter.type = 'lowpass';
                noiseFilter.frequency.value = 22050;
                noiseGain = audioCtx.createGain();
                noiseGain.gain.value = 0.12; // Volumen final
                noiseSource.connect(noiseFilter).connect(noiseGain).connect(audioCtx.destination);
                console.log('[SETUP] ✓ White-noise filters created, gain:', noiseGain.gain.value);
            }
            
            // Whispers - Setup AudioContext nodes
            const whispersEl = document.getElementById('whispersSound');
            if (whispersEl && !whispersSource) {
                whispersEl.loop = false;
                whispersSource = audioCtx.createMediaElementSource(whispersEl);
                whispersFilter = audioCtx.createBiquadFilter();
                whispersFilter.type = 'lowpass';
                whispersFilter.frequency.value = 22050;
                whispersGain = audioCtx.createGain();
                whispersGain.gain.value = whispersBaseVolume; // 0.05
                whispersSource.connect(whispersFilter).connect(whispersGain).connect(audioCtx.destination);
                console.log('[SETUP] ✓ Whispers filters created, gain:', whispersGain.gain.value);
            }
            
            _audioFiltersInitialized = true;
            console.log('[SETUP] ✓ Audio filters initialization complete');
        } catch (error) {
            console.error('[SETUP] ✗ Audio filters initialization failed:', error);
        }
        
        // === MODULACIÓN DE VOLUMEN DE WHISPERS ===
        function updateWhispersVolumeModulation() {
            if (!whispersGain) return;
            // Si estamos en fade out, no tocar el volumen
            if (isFadingOut) return;

            // Interpolación suave hacia el target (por si cambia por hover, etc)
            whispersCurrentVolume += (whispersTargetVolume - whispersCurrentVolume) * 0.08;
            let finalVol;
            // Si el target es 0, forzar el gain a 0 sin modulación
            if (whispersTargetVolume === 0) {
                finalVol = 0;
            } else if (whispersModulationEnabled) {
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

        // Llama a la modulación ~60fps — almacenar para poder limpiar
        if (whispersModulationTimer) clearInterval(whispersModulationTimer);
        whispersModulationTimer = setInterval(updateWhispersVolumeModulation, 16);
    }

    // Inicializar filtros de audio al cargar la página para evitar poppeo
    setupAudioFilters();

    // ========== AUDIO INITIALIZATION ==========
    // Note: Audio auto-starts after preloader via preloaderFinished event in index.html
    // This ensures white-noise plays automatically if audio toggle is enabled

    window.setLowPassFilter = function(targetFreq, duration = 400) {
        // Los filtros solo se inicializan una vez al cargar la página. Nunca recrear ni reconfigurar aquí.
        if (!_audioFiltersInitialized) setupAudioFilters();
        filterActive = true;
        const startNoise = noiseFilter.frequency.value;
        const startWhispers = whispersFilter.frequency.value;
        // Hacer la transición más suave: aumentar duración y usar easeInOutSine
        duration = Math.max(duration, 900); // mínimo 900ms para suavidad
        const end = performance.now() + duration;
        function animate() {
            const now = performance.now();
            const t = Math.min(1, (now - (end - duration)) / duration);
            // Ease in-out sine para suavidad
            const ease = -(Math.cos(Math.PI * t) - 1) / 2;
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

    window.restoreLowPassFilter = function(duration = 400) {
        // Los filtros solo se inicializan una vez al cargar la página. Nunca recrear ni reconfigurar aquí.
        if (!_audioFiltersInitialized) setupAudioFilters();
        filterActive = false;
        const startNoise = noiseFilter.frequency.value;
        const startWhispers = whispersFilter.frequency.value;
        const targetFreq = 22050;
        // Hacer la transición más suave: aumentar duración y usar easeInOutSine
        duration = Math.max(duration, 900); // mínimo 900ms para suavidad
        const end = performance.now() + duration;
        function animate() {
            const now = performance.now();
            const t = Math.min(1, (now - (end - duration)) / duration);
            // Ease in-out sine para suavidad
            const ease = -(Math.cos(Math.PI * t) - 1) / 2;
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
                setLowPassFilter(1200, 30); // Ultra responsivo al abrir
                if (window.setGrainMenuIntensity) window.setGrainMenuIntensity(0.4); // Reducir grain
            } else {
                restoreLowPassFilter(900);
                if (window.resetGrainMenuIntensity) window.resetGrainMenuIntensity(); // Restaurar grain
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
                    if (window.resetGrainMenuIntensity) window.resetGrainMenuIntensity();
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
                if (window.resetGrainMenuIntensity) window.resetGrainMenuIntensity();
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

    // ========== SOCIAL MEDIA SUBMENU ==========
    const socialMediaToggle = document.getElementById('socialMediaToggle');
    const socialMediaSubmenu = document.getElementById('socialMediaSubmenu');

    if (socialMediaToggle && socialMediaSubmenu) {
        socialMediaToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            socialMediaToggle.classList.toggle('active');
            socialMediaSubmenu.classList.toggle('active');
        });
    }

    // ========== CONTACT MODAL ==========
    const contactBtn = document.getElementById('contactBtn');
    const contactModal = document.getElementById('contactModal');
    const contactClose = document.getElementById('contactClose');
    const contactForm = document.getElementById('contactForm');
    const queryTypeSelect = document.getElementById('queryType');

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

    // Dynamic email routing based on query type
    if (queryTypeSelect && contactForm) {
        queryTypeSelect.addEventListener('change', (e) => {
            const selectedValue = e.target.value;
            if (selectedValue === 'Press') {
                contactForm.action = 'https://formsubmit.co/press@eaftimos.com';
            } else {
                contactForm.action = 'https://formsubmit.co/contact@eaftimos.com';
            }
        });
    }

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            // El formulario ahora se envía a FormSubmit
            // No hacemos e.preventDefault() para permitir el envío normal del formulario
            // FormSubmit redirige automáticamente después del envío
            
            // Opcionalmente, mostrar mensaje de "enviando"
            const submitBtn = contactForm.querySelector('.submit-btn');
            if (submitBtn) {
                submitBtn.textContent = 'SENDING...';
                submitBtn.disabled = true;
            }
        });
    }

    // ========== MOBILE BACK BUTTON OVERRIDE (NON-INDEX) ==========
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const pathName = window.location.pathname || '';
    const lastSegment = pathName.split('/').pop();
    const isIndexPage = lastSegment === '' || (lastSegment || '').toLowerCase() === 'index.html';

    function closeMenuAndContactIfOpen() {
        let closedSomething = false;

        const bodyMenuOpen = document.body.classList.contains('menu-open');
        const menuToggleActive = menuToggle && menuToggle.classList.contains('active');
        const dropdownActive = dropdownMenu && dropdownMenu.classList.contains('active');
        const contactActive = contactModal && (contactModal.classList.contains('active') || contactModal.style.display === 'block');

        if (contactActive) {
            contactModal.classList.remove('active');
            closedSomething = true;
        }

        if (bodyMenuOpen || menuToggleActive || dropdownActive) {
            dropdownMenu.classList.remove('active');
            if (menuToggle) menuToggle.classList.remove('active');
            document.body.classList.remove('menu-open');
            if (window.isMenuActive !== undefined) {
                window.isMenuActive = false;
            }
            if (typeof window.restoreLowPassFilter === 'function') {
                window.restoreLowPassFilter(500);
            }
            if (window.resetGrainMenuIntensity) window.resetGrainMenuIntensity();
            closedSomething = true;
        }

        return closedSomething;
    }

    function triggerLogoTransitionToIndex() {
        const logoLink = document.querySelector('a.logo');
        if (logoLink) {
            const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
            logoLink.dispatchEvent(evt);
            return;
        }
        window.location.href = 'index.html';
    }

    if (isMobile && !isIndexPage) {
        const backTrapState = { eftimosBackTrap: true };
        if (!history.state || !history.state.eftimosBackTrap) {
            history.pushState(backTrapState, '', window.location.href);
        }

        let isHandlingBack = false;
        window.addEventListener('popstate', () => {
            if (isHandlingBack) return;
            isHandlingBack = true;

            if (closeMenuAndContactIfOpen()) {
                history.pushState(backTrapState, '', window.location.href);
                isHandlingBack = false;
                return;
            }

            triggerLogoTransitionToIndex();
        });
    }

    // ========== VISUAL EFFECTS TOGGLE ==========

    const visualToggle = document.getElementById('visualToggle');
    const statusMessage = document.getElementById('statusMessage');
    let visualEffectsEnabled = localStorage.getItem('visualEffectsEnabled') !== 'false';
        window.visualEffectsEnabled = visualEffectsEnabled;
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

    // Expose to global scope so other scripts/handlers can call it
    window.showStatusMessage = showStatusMessage;

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
    // Exponer para otros scripts
    window.updateVisualIcon = updateVisualIcon;

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
            // Restore normal map positioning
            if (typeof window.restoreMapPositioning === 'function') {
                window.restoreMapPositioning();
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
            // Reorganize map elements in grid layout
            if (typeof window.arrangeMapInGrid === 'function') {
                window.arrangeMapInGrid();
            }
        }
    }

    // ========== AUDIO TOGGLE ========== 

    const audioToggle = document.getElementById('audioToggle');
    const noiseSound = document.getElementById('noiseSound');
    const whispersSound = document.getElementById('whispersSound');
    const lockedInSound = document.getElementById('lockedInSound');
    
    // Start with audio enabled by default (unless explicitly disabled)
    let audioEnabled = localStorage.getItem('audioEnabled') !== 'false';
    window.audioEnabled = audioEnabled;
    
    // Set initial volume very low with 3 levels: base, focused, hover with tooltip
    const baseNoiseVolume = 0.008;      // No interaction (sutilmente audible)
    const focusedNoiseVolume = 0.018;    // Element focused (no tooltip)
    const hoverNoiseVolume = 0.012;      // Hover with tooltip visible
    let targetNoiseVolume = baseNoiseVolume;
    let currentNoiseVolume = baseNoiseVolume;
    let unfocusTimeout = null;
    let isTooltipVisible = false;
    // Para whispers
    const baseWhispersVolume = 0.04; // Volumen muy bajo cuando no hay hover
    const focusedWhispersVolume = 0.12; // Volumen cuando hay focus
    const hoverWhispersVolume = 0.18; // Volumen cuando hay hover con tooltip
    
    // No establecer volumen aquí - se maneja a través del gain node del AudioContext
    
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
        // Usar gain node si está disponible, sino el elemento directo
        // Check if noiseGain exists in parent scope
        if (typeof noiseGain !== 'undefined' && noiseGain) {
            noiseGain.gain.value = currentNoiseVolume;
        } else if (noiseSound) {
            noiseSound.volume = currentNoiseVolume;
        }
        // Keep global reference in sync
        window.currentNoiseVolume = currentNoiseVolume;
    }
    
    // Listen for tooltip show/hide events (highest priority)
    window.addEventListener('tooltipShown', () => {
        // Check if whispersModulationEnabled exists in parent scope
        if (typeof whispersModulationEnabled !== 'undefined') {
            whispersModulationEnabled = false;
        }
        isTooltipVisible = true;
        if (unfocusTimeout) {
            clearTimeout(unfocusTimeout);
            unfocusTimeout = null;
        }
        targetNoiseVolume = hoverNoiseVolume; // 0.02
        window.setWhispersTargetVolume(hoverWhispersVolume);
    });

    window.addEventListener('tooltipHidden', () => {
        // Check if whispersModulationEnabled exists in parent scope
        if (typeof whispersModulationEnabled !== 'undefined') {
            whispersModulationEnabled = true;
        }
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
    
    // ========== AUDIO UPDATE FUNCTIONS ==========
    // Definir funciones antes de usarlas
    
    function updateAudio() {
        // Require user interaction before playing any audio (browser autoplay policy)
        if (audioEnabled && window.preloaderEnterPressed && userHasInteracted) {
            console.log('[UPDATE-AUDIO] Attempting to start audio...');
            
            // Asegurar que los filtros estén inicializados
            if (!_audioFiltersInitialized) {
                setupAudioFilters();
            }
            
            // Resume audio
            if (noiseSound) {
                noiseSound.muted = false;
                noiseSound.loop = false; // NO usar loop = true
                noiseSound.volume = 1; // Controlado por gain node
                const playPromise = noiseSound.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        console.log('[UPDATE-AUDIO] ✓ White-noise started');
                        startCrossfadeLoop(noiseCrossfadeSystem, noiseSound, true);
                    }).catch(e => console.log('[UPDATE-AUDIO] White-noise prevented:', e.message));
                }
            }
            if (whispersSound) {
                whispersSound.muted = false;
                whispersSound.loop = false; // NO usar loop = true
                whispersSound.volume = 1; // Controlado por gain node
                whispersSound.play().then(() => {
                    console.log('[UPDATE-AUDIO] ✓ Whispers started');
                    startCrossfadeLoop(whispersCrossfadeSystem, whispersSound, false);
                }).catch(e => console.log('[UPDATE-AUDIO] Whispers prevented:', e.message));
            }
            if (lockedInSound) {
                lockedInSound.muted = false;
            }
            // Reiniciar timer de volumen de ruido si fue limpiado
            if (!noiseVolumeTimer) {
                noiseVolumeTimer = setInterval(updateNoiseVolume, 16);
            }
        } else {
            // Mute basic audio (keep videos unmuted)
            // Detener sistemas de crossfade
            stopCrossfadeLoop(noiseCrossfadeSystem, true);
            stopCrossfadeLoop(whispersCrossfadeSystem, false);
            // Limpiar timers de modulación de volumen
            if (whispersModulationTimer) { clearInterval(whispersModulationTimer); whispersModulationTimer = null; }
            if (noiseVolumeTimer) { clearInterval(noiseVolumeTimer); noiseVolumeTimer = null; }
            if (noiseSound) {
                noiseSound.muted = true;
                noiseSound.pause();
            }
            if (whispersSound) {
                whispersSound.muted = true;
                whispersSound.pause();
            }
            if (lockedInSound) {
                lockedInSound.muted = true;
                lockedInSound.pause();
            }
        }
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
    };

    // Update volume smoothly every frame — almacenar para poder limpiar
    var noiseVolumeTimer = setInterval(updateNoiseVolume, 16); // ~60fps

    // Initialize audio icon state only
    // Audio playback is deferred to first user interaction to comply with browser autoplay policies
    updateAudioIcon();

    if (audioToggle) {
        audioToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            audioEnabled = !audioEnabled;
            localStorage.setItem('audioEnabled', audioEnabled.toString());
            window.audioEnabled = audioEnabled;
            
            console.log('[TOGGLE] Audio toggled to:', audioEnabled);
            
            // Dispatch custom event for UI sounds system
            window.dispatchEvent(new CustomEvent('audioToggled', {
                detail: { enabled: audioEnabled }
            }));
            
            // Si se activa el audio, reproducir directamente
            if (audioEnabled) {
                console.log('[TOGGLE] Starting audio playback...');
                
                // Marcar interacción del usuario (el click en toggle cuenta)
                userHasInteracted = true;
                
                // Asegurar que el AudioContext esté inicializado y resumido
                if (!_audioFiltersInitialized) {
                    setupAudioFilters();
                }
                if (audioCtx && audioCtx.state === 'suspended') {
                    audioCtx.resume().catch(function() {});
                }
                
                if (noiseSound) {
                    console.log('[TOGGLE] White-noise element exists, attempting to play...');
                    noiseSound.loop = false; // NO usar loop = true
                    
                    noiseSound.play()
                        .then(() => {
                            console.log('[TOGGLE] ✓✓✓ WHITE-NOISE IS PLAYING ✓✓✓');
                            console.log('[TOGGLE] - Paused:', noiseSound.paused);
                            console.log('[TOGGLE] - Current time:', noiseSound.currentTime);
                            console.log('[TOGGLE] - Duration:', noiseSound.duration);
                            // Ajustar volumen a través del gain node si existe
                            if (noiseGain) {
                                noiseGain.gain.value = 0.09;
                                console.log('[TOGGLE] - Gain value:', noiseGain.gain.value);
                            }
                            // Iniciar sistema de crossfade loop
                            startCrossfadeLoop(noiseCrossfadeSystem, noiseSound, true);
                        })
                        .catch(e => {
                            console.error('[TOGGLE] ✗✗✗ WHITE-NOISE FAILED ✗✗✗');
                            console.error('[TOGGLE] Error:', e);
                            console.error('[TOGGLE] Error message:', e.message);
                        });
                } else {
                    console.error('[TOGGLE] White-noise element NOT found!');
                }
                
                if (whispersSound) {
                    console.log('[TOGGLE] Whispers element exists, attempting to play...');
                    whispersSound.loop = false; // NO usar loop = true
                    
                    whispersSound.play()
                        .then(() => {
                            console.log('[TOGGLE] ✓✓✓ WHISPERS IS PLAYING ✓✓✓');
                            // Ajustar volumen a través del gain node si existe
                            if (whispersGain) {
                                whispersGain.gain.value = whispersBaseVolume;
                                console.log('[TOGGLE] - Gain value:', whispersGain.gain.value);
                            }
                            // Iniciar sistema de crossfade loop
                            startCrossfadeLoop(whispersCrossfadeSystem, whispersSound, false);
                        })
                        .catch(e => {
                            console.error('[TOGGLE] ✗✗✗ WHISPERS FAILED ✗✗✗');
                            console.error('[TOGGLE] Error:', e.message);
                        });
                } else {
                    console.error('[TOGGLE] Whispers element NOT found!');
                }
            } else {
                console.log('[TOGGLE] Pausing audio...');
                // Detener sistemas de crossfade
                stopCrossfadeLoop(noiseCrossfadeSystem, true);
                stopCrossfadeLoop(whispersCrossfadeSystem, false);
                // Pausar los sonidos cuando se desactiva
                if (noiseSound) {
                    noiseSound.pause();
                    console.log('[TOGGLE] White-noise paused');
                }
                if (whispersSound) {
                    whispersSound.pause();
                    console.log('[TOGGLE] Whispers paused');
                }
            }
            
            updateAudioIcon();
            showStatusMessage(audioEnabled ? 'SOUND EFFECTS: ON' : 'SOUND EFFECTS: OFF');
        });
    } else {
        console.error('[TOGGLE] Audio toggle button NOT found!');
    }

    // ========== AUTO-ACTIVATE AUDIO ON FIRST USER INTERACTION ==========
    
    function activateAudioOnFirstInteraction() {
        if (userHasInteracted) return;
        
        userHasInteracted = true;
        
        // Enable audio (respect user's stored preference)
        var storedPref = localStorage.getItem('audioEnabled');
        audioEnabled = storedPref !== 'false'; // true by default, false only if explicitly disabled
        window.audioEnabled = audioEnabled;
        
        console.log('[FIRST-INTERACTION] Audio activated on first user interaction');
        console.log('[FIRST-INTERACTION] audioEnabled:', audioEnabled);
        console.log('[FIRST-INTERACTION] preloaderEnterPressed:', window.preloaderEnterPressed);
        
        // Resume AudioContext (required by browsers — must happen inside user gesture)
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().then(function() {
                console.log('[FIRST-INTERACTION] AudioContext resumed');
            }).catch(function() {});
        }
        
        updateAudio();
        updateAudioIcon();
    }
    
    // Listen for user interactions that count as valid gestures for autoplay policy
    // NOTE: mousemove is NOT a valid user gesture — browsers will still block autoplay
    document.addEventListener('click', activateAudioOnFirstInteraction, { once: true });
    document.addEventListener('touchstart', activateAudioOnFirstInteraction, { once: true });
    document.addEventListener('keydown', activateAudioOnFirstInteraction, { once: true });

    // ========== PAGE VISIBILITY API — PAUSE/RESUME AUDIO ==========
    // When the page is hidden (tab switch, browser minimized, mobile app switch),
    // pause all audio. Resume when the page becomes visible again.
    let _audioWasPlayingBeforeHidden = false;
    
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Page is now hidden — pause all audio
            console.log('[VISIBILITY] Page hidden — pausing all audio');
            
            // Track whether audio was playing so we can resume later
            _audioWasPlayingBeforeHidden = audioEnabled && userHasInteracted && window.preloaderEnterPressed;
            
            // Suspend AudioContext (stops all processing)
            if (audioCtx && audioCtx.state === 'running') {
                audioCtx.suspend().catch(function() {});
            }
            
            // Stop crossfade loops to prevent new instances being created
            stopCrossfadeLoop(noiseCrossfadeSystem, true);
            stopCrossfadeLoop(whispersCrossfadeSystem, false);
            
            // Pause audio elements
            if (noiseSound && !noiseSound.paused) noiseSound.pause();
            if (whispersSound && !whispersSound.paused) whispersSound.pause();
            if (lockedInSound && !lockedInSound.paused) lockedInSound.pause();
            
            // Pause crossfade instances too
            if (noiseCrossfadeSystem.currentInstance && !noiseCrossfadeSystem.currentInstance.paused) {
                noiseCrossfadeSystem.currentInstance.pause();
            }
            if (noiseCrossfadeSystem.nextInstance && !noiseCrossfadeSystem.nextInstance.paused) {
                noiseCrossfadeSystem.nextInstance.pause();
            }
            if (whispersCrossfadeSystem.currentInstance && !whispersCrossfadeSystem.currentInstance.paused) {
                whispersCrossfadeSystem.currentInstance.pause();
            }
            if (whispersCrossfadeSystem.nextInstance && !whispersCrossfadeSystem.nextInstance.paused) {
                whispersCrossfadeSystem.nextInstance.pause();
            }
            
            // Stop UI sounds
            if (window.UISounds && typeof window.UISounds.stopAll === 'function') {
                window.UISounds.stopAll();
            }
        } else {
            // Page is now visible — resume audio if it was playing before
            console.log('[VISIBILITY] Page visible — resuming audio, wasPlaying:', _audioWasPlayingBeforeHidden);
            
            if (_audioWasPlayingBeforeHidden && audioEnabled) {
                // Resume AudioContext
                if (audioCtx && audioCtx.state === 'suspended') {
                    audioCtx.resume().then(function() {
                        console.log('[VISIBILITY] AudioContext resumed');
                    }).catch(function() {});
                }
                
                // Restart audio playback via updateAudio (which handles crossfade loops too)
                updateAudio();
            }
        }
    });

    // ========== MAKE STATES GLOBALLY ACCESSIBLE ==========

    // Asegura que visualEffectsEnabled esté definido en este scope
    if (typeof visualEffectsEnabled === 'undefined') {
        if (typeof window.visualEffectsEnabled !== 'undefined') {
            visualEffectsEnabled = window.visualEffectsEnabled;
        } else {
            visualEffectsEnabled = localStorage.getItem('visualEffectsEnabled') !== 'false';
        }
    }
    window.audioEnabled = audioEnabled;
    window.visualEffectsEnabled = visualEffectsEnabled;
    window.currentNoiseVolume = currentNoiseVolume;
    
    // Exponer sistemas de crossfade y funciones globalmente para index.html
    window.noiseCrossfadeSystem = noiseCrossfadeSystem;
    window.whispersCrossfadeSystem = whispersCrossfadeSystem;
    window.startCrossfadeLoop = startCrossfadeLoop;
    window.setupAudioFiltersExternal = setupAudioFilters;
    window.noiseGain = noiseGain;
    window.whispersGain = whispersGain;
    
    // Expose AudioContext resume for external scripts (e.g., index-page.js)
    window.resumeAudioContext = function() {
        userHasInteracted = true;
        if (audioCtx && audioCtx.state === 'suspended') {
            return audioCtx.resume();
        }
        return Promise.resolve();
    };
    
    console.log('[CONTROLS] initializeControls() completed successfully');
}