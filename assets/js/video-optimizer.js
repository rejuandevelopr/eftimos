/**
 * Video Performance Optimizer
 * Mejora el rendimiento de videos mediante lazy loading y gestión inteligente de reproducción
 */

(function() {
    'use strict';

    // Configuración
    const CONFIG = {
        rootMargin: '50px', // Pre-cargar videos 50px antes de que sean visibles
        threshold: 0.1,      // 10% de visibilidad para activar
        quality: 0.8         // Calidad de compresión para mobile
    };

    // Detectar capacidades del dispositivo
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Observer para lazy loading
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            
            if (entry.isIntersecting) {
                // Video está visible
                loadAndPlayVideo(video);
            } else {
                // Video no está visible - pausar para ahorrar recursos
                if (!video.dataset.background) { // No pausar videos de fondo
                    pauseVideo(video);
                }
            }
        });
    }, {
        rootMargin: CONFIG.rootMargin,
        threshold: CONFIG.threshold
    });

    /**
     * Cargar y reproducir video
     */
    function loadAndPlayVideo(video) {
        if (video.dataset.loaded === 'true') {
            // Ya está cargado, solo reproducir
            playVideo(video);
            return;
        }

        // Cargar el video por primera vez
        const source = video.querySelector('source');
        if (source && !source.src && source.dataset.src) {
            source.src = source.dataset.src;
            video.load();
        }

        video.dataset.loaded = 'true';
        
        // Intentar reproducir cuando esté listo
        video.addEventListener('canplay', () => {
            playVideo(video);
        }, { once: true });
    }

    /**
     * Reproducir video de forma segura
     */
    function playVideo(video) {
        if (video.paused) {
            const playPromise = video.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn('Video play failed:', error);
                    // Si falla, intentar sin audio
                    video.muted = true;
                    video.play().catch(e => console.error('Video play failed even muted:', e));
                });
            }
        }
    }

    /**
     * Pausar video de forma segura
     */
    function pauseVideo(video) {
        if (!video.paused && video.readyState >= 2) {
            video.pause();
        }
    }

    /**
     * Optimizar atributos de video según el dispositivo
     */
    function optimizeVideoAttributes(video) {
        // Agregar atributos de rendimiento
        video.setAttribute('playsinline', '');
        video.setAttribute('disablePictureInPicture', '');
        video.setAttribute('disableRemotePlayback', '');
        
        // Optimizaciones específicas para móvil
        if (isMobile || hasLowMemory) {
            // Reducir precarga en dispositivos móviles
            if (video.getAttribute('preload') === 'auto') {
                video.setAttribute('preload', 'metadata');
            }
            
            // Marcar para lazy loading
            const source = video.querySelector('source');
            if (source && source.src && !video.dataset.background) {
                source.dataset.src = source.src;
                source.removeAttribute('src');
                video.dataset.loaded = 'false';
            }
        }

        // Si el usuario prefiere reducir movimiento, pausar videos decorativos
        if (prefersReducedMotion && !video.dataset.essential) {
            video.pause();
            video.removeAttribute('autoplay');
        }
    }

    /**
     * Reducir framerate para ahorrar recursos
     */
    function reduceFramerate(video) {
        // En dispositivos de bajo rendimiento, reducir la fluidez del video
        if (hasLowMemory || isMobile) {
            video.style.willChange = 'auto'; // Desactivar will-change si hay bajo rendimiento
        }
    }

    /**
     * Inicializar optimizaciones
     */
    function init() {
        // Seleccionar todos los videos
        const allVideos = document.querySelectorAll('video');
        
        allVideos.forEach(video => {
            // Marcar videos de fondo
            if (video.closest('#videos-background, #video-background')) {
                video.dataset.background = 'true';
            }

            // Aplicar optimizaciones
            optimizeVideoAttributes(video);
            reduceFramerate(video);
            
            // Observar para lazy loading (excepto videos de fondo críticos)
            if (!video.dataset.background || isMobile) {
                videoObserver.observe(video);
            }
        });

        // Pausar videos cuando la página no está visible
        document.addEventListener('visibilitychange', () => {
            allVideos.forEach(video => {
                if (document.hidden) {
                    pauseVideo(video);
                } else if (video.dataset.background === 'true') {
                    playVideo(video);
                }
            });
        });

        // Limpiar recursos cuando se cierra la página
        window.addEventListener('beforeunload', () => {
            allVideos.forEach(video => {
                video.pause();
                video.src = '';
                video.load();
            });
        });

        console.log('[Video Optimizer] Initialized with', allVideos.length, 'videos');
        console.log('[Video Optimizer] Device:', { isMobile, hasLowMemory, prefersReducedMotion });
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exponer función para recargar videos si es necesario
    window.videoOptimizer = {
        reload: init,
        playAll: function() {
            document.querySelectorAll('video').forEach(playVideo);
        },
        pauseAll: function() {
            document.querySelectorAll('video').forEach(pauseVideo);
        }
    };

})();
