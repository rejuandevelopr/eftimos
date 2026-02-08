// Efecto "cámara en mano" para el mapa
// Aplica un pequeño movimiento aleatorio al canvas principal

// Efecto "cámara en mano" solo con movimiento horizontal y vertical, más largo y lento




(function () {
    const mapGroup = document.getElementById('map-group');
    if (!mapGroup) {
        console.warn('[handheld-camera] #map-group no encontrado al inicializar.');
        return;
    } else {
        console.log('[handheld-camera] #map-group encontrado, inicializando efecto cámara en mano.');
    }

    // Detectar dispositivos móviles y ajustar velocidad
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let BASE_SHAKE_SPEED = isMobile ? 0.003 : 0.015; // Velocidad reducida en móviles
    let shakeSpeed = BASE_SHAKE_SPEED;
    let targetShakeSpeed = BASE_SHAKE_SPEED;
    let shakeActive = true;
    let t = Math.random() * 1000;
    function lerp(a, b, n) { return a + (b - a) * n; }
    let lastX = 0, lastY = 0;
    const shakeIntensity = isMobile ? 6 : 12;

    function visualEffectsEnabled() {
        // window.visualEffectsEnabled puede ser undefined (default true)
        const enabled = window.visualEffectsEnabled !== false;
        // Log para depuración
        // console.log('[handheld-camera] visualEffectsEnabled:', enabled);
        return enabled;
    }

    let returningToCenter = false;
    let animating = false;
    let requestId = null;
    function animateToCenter() {
        animating = true;
        console.log('[handheld-camera] Animando regreso al centro.');
        if (requestId) cancelAnimationFrame(requestId);
        function step() {
            lastX = lerp(lastX, 0, 0.08);
            lastY = lerp(lastY, 0, 0.08);
            mapGroup.style.transform = `translate(${lastX}px, ${lastY}px)`;
            if (Math.abs(lastX) > 0.5 || Math.abs(lastY) > 0.5) {
                returningToCenter = true;
                requestId = requestAnimationFrame(step);
            } else {
                lastX = 0; lastY = 0;
                mapGroup.style.transform = '';
                returningToCenter = false;
                animating = false;
                requestId = null;
            }
        }
        step();
    }

    function smoothShake(force) {
        if (requestId) cancelAnimationFrame(requestId);
        if (force) console.log('[handheld-camera] smoothShake(force) llamado.');
        let stopped = false;
        let firstFrame = true;
        let lastFrameTime = 0;
        const FPS_TARGET = isMobile ? 30 : 60;
        const FRAME_INTERVAL = 1000 / FPS_TARGET;

        function step(timestamp) {
            // Throttle to 60 FPS
            if (timestamp - lastFrameTime < FRAME_INTERVAL) {
                if (!stopped) requestId = requestAnimationFrame(step);
                return;
            }
            lastFrameTime = timestamp;

            // Interpolar suavemente la velocidad
            shakeSpeed = lerp(shakeSpeed, targetShakeSpeed, 0.08);
            if (!shakeActive || !visualEffectsEnabled()) {
                targetShakeSpeed = 0;
            } else {
                targetShakeSpeed = BASE_SHAKE_SPEED;
            }
            // Si es el primer frame tras reactivar, forzar velocidad
            if (force && firstFrame) {
                shakeSpeed = BASE_SHAKE_SPEED;
                firstFrame = false;
            }
            t += shakeSpeed;
            const targetX = Math.sin(t) * shakeIntensity;
            const targetY = Math.cos(t * 0.7) * shakeIntensity;
            lastX = lerp(lastX, targetX, 0.08);
            lastY = lerp(lastY, targetY, 0.08);
            mapGroup.style.transform = `translate(${lastX}px, ${lastY}px)`;
            // Cuando la velocidad es casi cero y el target es cero, centrar
            if (targetShakeSpeed === 0 && Math.abs(shakeSpeed) < 0.001) {
                if (!returningToCenter && (Math.abs(lastX) > 0.5 || Math.abs(lastY) > 0.5)) {
                    animateToCenter();
                    stopped = true;
                } else if (!returningToCenter) {
                    mapGroup.style.transform = '';
                    animating = false;
                    stopped = true;
                }
            }
            if (!stopped) requestId = requestAnimationFrame(step);
        }
        step(performance.now());
    }


    // Escuchar cambios en visualEffectsEnabled y reactivar animación si corresponde
    function onVisualEffectsToggled() {
        console.log('[handheld-camera] Evento visualEffectsToggled recibido. Estado:', window.visualEffectsEnabled);
        // Siempre reinicia el ciclo correctamente
        animating = false;
        returningToCenter = false;
        if (requestId) cancelAnimationFrame(requestId);
        // Si se reactivan los visual effects, restaurar velocidad y reiniciar animación
        if (visualEffectsEnabled() && shakeActive) {
            console.log('[handheld-camera] Reactivando efecto cámara en mano.');
            targetShakeSpeed = BASE_SHAKE_SPEED;
            shakeSpeed = BASE_SHAKE_SPEED;
            smoothShake(true); // forzar primer frame
        } else {
            console.log('[handheld-camera] Deteniendo efecto cámara en mano.');
            smoothShake();
        }
    }
    window.addEventListener('visualEffectsToggled', onVisualEffectsToggled);
    window.addEventListener('storage', (e) => {
        if (e.key === 'visualEffectsEnabled') {
            console.log('[handheld-camera] Evento storage visualEffectsEnabled detectado.');
            onVisualEffectsToggled();
        }
    });

    smoothShake();

    window.setHandheldCameraShake = function (active) {
        shakeActive = !!active;
        console.log('[handheld-camera] setHandheldCameraShake:', shakeActive);
        if (shakeActive) smoothShake();
        else if (!returningToCenter) animateToCenter();
    };

    // Pausar inmediatamente sin animación de regreso
    window.freezeHandheldCamera = function () {
        console.log('[handheld-camera] Congelando cámara inmediatamente');
        shakeActive = false;
        targetShakeSpeed = 0;
        shakeSpeed = 0;
        animating = false;
        returningToCenter = false;
        if (requestId) {
            cancelAnimationFrame(requestId);
            requestId = null;
        }
        // NO aplicar transform, dejarlo como está
    };

    // Reanudar desde estado actual
    window.resumeHandheldCamera = function () {
        console.log('[handheld-camera] Reanudando cámara desde estado actual');
        shakeActive = true;
        targetShakeSpeed = BASE_SHAKE_SPEED;
        shakeSpeed = BASE_SHAKE_SPEED;
        animating = false;
        returningToCenter = false;
        if (requestId) cancelAnimationFrame(requestId);
        smoothShake(true);
    };

    // Exponer la posición actual de cámara en mano
    window.getHandheldCameraOffset = function () {
        return { x: lastX, y: lastY };
    };
})();
