// ========================================
// PERFORMANCE MONITORING SYSTEM
// ========================================
// Lightweight performance monitoring for automatic quality adjustment

// Silenciar logs de debug en producción (mantiene warn/error para diagnosis)
(function() { var _noop = function(){}; console.log = _noop; })();
(function () {
    'use strict';

    // Detect device capabilities
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth <= 1024;

    // Performance monitoring state
    const perfMonitor = {
        enabled: true,
        fpsHistory: [],
        maxHistoryLength: 60, // Track last 60 frames
        lastFrameTime: performance.now(),
        frameCount: 0,
        currentFPS: 60,
        targetFPS: isMobile ? 30 : 60,
        performanceMode: 'auto', // 'auto', 'high', 'balanced', 'low'

        // Thresholds
        lowFPSThreshold: isMobile ? 20 : 40,
        criticalFPSThreshold: isMobile ? 15 : 30,

        // Device capability detection
        deviceCapabilities: {
            memory: navigator.deviceMemory || 4, // GB
            cores: navigator.hardwareConcurrency || 4,
            connection: navigator.connection ? navigator.connection.effectiveType : '4g',
            isMobile: isMobile,
            isLowEnd: false
        }
    };

    // Detect low-end devices
    function detectLowEndDevice() {
        const caps = perfMonitor.deviceCapabilities;

        // Low-end indicators
        const lowMemory = caps.memory < 4;
        const fewCores = caps.cores < 4;
        const slowConnection = caps.connection === 'slow-2g' || caps.connection === '2g' || caps.connection === '3g';

        caps.isLowEnd = (lowMemory && fewCores) || (isMobile && lowMemory);

        console.log('[PERF] Device capabilities:', caps);
        return caps.isLowEnd;
    }

    // Initialize performance mode based on device
    function initializePerformanceMode() {
        if (detectLowEndDevice()) {
            perfMonitor.performanceMode = 'low';
            console.log('[PERF] Low-end device detected, using low performance mode');
            applyPerformanceMode('low');
        } else if (isMobile) {
            perfMonitor.performanceMode = 'balanced';
            console.log('[PERF] Mobile device detected, using balanced performance mode');
            applyPerformanceMode('balanced');
        } else {
            perfMonitor.performanceMode = 'high';
            console.log('[PERF] Desktop device detected, using high performance mode');
            applyPerformanceMode('high');
        }
    }

    // Apply performance mode settings
    function applyPerformanceMode(mode) {
        switch (mode) {
            case 'low':
                // Disable heavy effects
                if (typeof window.stopGrainEffect === 'function') {
                    window.stopGrainEffect();
                }
                // Reduce video opacity
                const videos = document.querySelectorAll('#videos-background video');
                videos.forEach(v => v.style.opacity = '0.02');
                break;

            case 'balanced':
                // Keep effects but at reduced quality (already handled by mobile checks)
                break;

            case 'high':
                // Full quality (default)
                break;
        }

        // Store mode for other scripts to check
        window.performanceMode = mode;
    }

    // FPS monitoring
    function measureFPS() {
        const now = performance.now();
        const delta = now - perfMonitor.lastFrameTime;

        if (delta > 0) {
            const fps = 1000 / delta;
            perfMonitor.fpsHistory.push(fps);

            // Keep history limited
            if (perfMonitor.fpsHistory.length > perfMonitor.maxHistoryLength) {
                perfMonitor.fpsHistory.shift();
            }

            // Calculate average FPS
            if (perfMonitor.fpsHistory.length > 10) {
                const avgFPS = perfMonitor.fpsHistory.reduce((a, b) => a + b, 0) / perfMonitor.fpsHistory.length;
                perfMonitor.currentFPS = Math.round(avgFPS);
            }
        }

        perfMonitor.lastFrameTime = now;
        perfMonitor.frameCount++;

        // Check performance every 60 frames
        if (perfMonitor.frameCount % 60 === 0) {
            checkPerformance();
        }

        if (perfMonitor.enabled) {
            requestAnimationFrame(measureFPS);
        }
    }

    // Check performance and adjust if needed
    function checkPerformance() {
        const fps = perfMonitor.currentFPS;

        // Critical performance issue
        if (fps < perfMonitor.criticalFPSThreshold && perfMonitor.performanceMode !== 'low') {
            console.warn('[PERF] Critical FPS drop detected:', fps, 'FPS. Switching to low performance mode.');
            perfMonitor.performanceMode = 'low';
            applyPerformanceMode('low');
        }
        // Low performance
        else if (fps < perfMonitor.lowFPSThreshold && perfMonitor.performanceMode === 'high') {
            console.warn('[PERF] Low FPS detected:', fps, 'FPS. Switching to balanced performance mode.');
            perfMonitor.performanceMode = 'balanced';
            applyPerformanceMode('balanced');
        }
        // Good performance - can upgrade mode if previously downgraded
        else if (fps > perfMonitor.targetFPS * 0.9 && perfMonitor.performanceMode === 'low') {
            console.log('[PERF] Performance improved:', fps, 'FPS. Switching to balanced mode.');
            perfMonitor.performanceMode = 'balanced';
            applyPerformanceMode('balanced');
        }
    }

    // Expose performance monitor globally
    window.performanceMonitor = perfMonitor;

    // Public API
    window.getPerformanceMode = function () {
        return perfMonitor.performanceMode;
    };

    window.getCurrentFPS = function () {
        return perfMonitor.currentFPS;
    };

    window.setPerformanceMode = function (mode) {
        if (['auto', 'high', 'balanced', 'low'].includes(mode)) {
            perfMonitor.performanceMode = mode;
            if (mode === 'auto') {
                initializePerformanceMode();
            } else {
                applyPerformanceMode(mode);
            }
            console.log('[PERF] Performance mode set to:', mode);
        }
    };

    // Initialize on load
    var _perfRafId = null;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            initializePerformanceMode();
            _perfRafId = requestAnimationFrame(measureFPS);
        });
    } else {
        initializePerformanceMode();
        _perfRafId = requestAnimationFrame(measureFPS);
    }

    // Pause FPS measurement when tab is hidden
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            if (_perfRafId) { cancelAnimationFrame(_perfRafId); _perfRafId = null; }
        } else if (perfMonitor.enabled) {
            _perfRafId = requestAnimationFrame(measureFPS);
        }
    });

    // Log performance stats periodically (only in development)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setInterval(function () {
            console.log('[PERF] Current FPS:', perfMonitor.currentFPS, '| Mode:', perfMonitor.performanceMode);
        }, 5000);
    }

})();
