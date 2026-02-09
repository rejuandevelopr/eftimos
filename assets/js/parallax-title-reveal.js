/* Parallax Title Reveal - localized opacity boost based on pointer/gyroscope */
(function () {
    'use strict';

    const REVEAL_RADIUS = 120;
    const FADE_DISTANCE = 160;
    const BASE_ALPHA = 0.18;
    const GYRO_RANGE = 300;

    let titles = [];
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let animationFrame = null;
    let isMobile = false;
    let gyroSupported = false;

    let initialBeta = null;
    let initialGamma = null;

    function init() {
        isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        findTitles();
        applyRevealDefaults();
        setupEventListeners();

        if (isMobile) {
            requestGyroscopePermission();
        }

        startAnimation();
    }

    function findTitles() {
        titles = Array.from(document.querySelectorAll('.parallax-title'));
    }

    function applyRevealDefaults() {
        titles.forEach((title) => {
            title.style.setProperty('--reveal-radius', `${REVEAL_RADIUS}px`);
            title.style.setProperty('--reveal-fade', `${FADE_DISTANCE}px`);
            title.style.setProperty('--reveal-min', `${BASE_ALPHA}`);
        });
    }

    async function requestGyroscopePermission() {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    setupGyroscope();
                }
            } catch (error) {
                console.log('Gyroscope permission denied');
            }
        } else {
            setupGyroscope();
        }
    }

    function setupGyroscope() {
        window.addEventListener('deviceorientation', handleOrientation, true);
        gyroSupported = true;
    }

    function handleOrientation(event) {
        let beta = event.beta;
        let gamma = event.gamma;

        if (initialBeta === null) {
            initialBeta = beta;
            initialGamma = gamma;
        }

        let relativeBeta = beta - initialBeta;
        let relativeGamma = gamma - initialGamma;

        relativeBeta = Math.max(-45, Math.min(45, relativeBeta));
        relativeGamma = Math.max(-45, Math.min(45, relativeGamma));

        const gyroX = relativeGamma / 45;
        const gyroY = relativeBeta / 45;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        mouseX = centerX + (gyroX * GYRO_RANGE);
        mouseY = centerY + (gyroY * GYRO_RANGE);
    }

    function setupEventListeners() {
        document.addEventListener('mousemove', updateMousePosition, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchstart', handleTouchMove, { passive: false });
        window.addEventListener('resize', updateCenters, { passive: true });

        if (isMobile && !gyroSupported) {
            document.addEventListener('click', requestGyroscopePermission, { once: true });
            document.addEventListener('touchstart', requestGyroscopePermission, { once: true });
        }

        const observer = new MutationObserver(() => {
            findTitles();
            applyRevealDefaults();
        });

        observer.observe(document.body, { childList: true, subtree: true });
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

    function updateCenters() {
        if (!gyroSupported) {
            mouseX = window.innerWidth / 2;
            mouseY = window.innerHeight / 2;
        }
    }

    function updateReveal() {
        titles.forEach((title) => {
            const rect = title.getBoundingClientRect();
            const localX = mouseX - rect.left;
            const localY = mouseY - rect.top;

            title.style.setProperty('--reveal-x', `${localX}px`);
            title.style.setProperty('--reveal-y', `${localY}px`);
        });

        animationFrame = requestAnimationFrame(updateReveal);
    }

    function startAnimation() {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        updateReveal();
    }

    window.addEventListener('beforeunload', () => {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
