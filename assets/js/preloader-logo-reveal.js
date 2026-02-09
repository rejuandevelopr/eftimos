// Reveal effect for preloader logo (image) using cursor/gyroscope proximity

(function() {
    const REVEAL_RADIUS = 60; // px
    const FADE_DISTANCE = 40; // px
    let mouseX = 60, mouseY = 60;
    let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let gyroSupported = false;
    let gyroX = 0, gyroY = 0;
    let initialBeta = null, initialGamma = null;
    let animationFrame = null;

    const logoImg = document.getElementById('sharedLogoPreloader');
    const canvas = document.querySelector('.preloader-logo-reveal-canvas');
    if (!logoImg || !canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    function drawRevealLogo() {
        ctx.clearRect(0, 0, width, height);
        // Create radial gradient mask
        const grad = ctx.createRadialGradient(mouseX, mouseY, REVEAL_RADIUS, mouseX, mouseY, REVEAL_RADIUS + FADE_DISTANCE);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        // Draw mask
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-in';
        // Draw logo centered and keep aspect ratio
        const imgW = logoImg.naturalWidth;
        const imgH = logoImg.naturalHeight;
        let drawW = width, drawH = height, dx = 0, dy = 0;
        if (imgW && imgH) {
            const imgRatio = imgW / imgH;
            const canvasRatio = width / height;
            if (imgRatio > canvasRatio) {
                drawW = width;
                drawH = width / imgRatio;
                dy = (height - drawH) / 2;
            } else {
                drawH = height;
                drawW = height * imgRatio;
                dx = (width - drawW) / 2;
            }
        }
        ctx.drawImage(logoImg, dx, dy, drawW, drawH);
        ctx.restore();
        animationFrame = requestAnimationFrame(drawRevealLogo);
    }

    function updateMouse(e) {
        const rect = canvas.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) * (width / rect.width);
        mouseY = (e.clientY - rect.top) * (height / rect.height);
    }
    function updateTouch(e) {
        if (e.touches.length > 0) {
            const rect = canvas.getBoundingClientRect();
            mouseX = (e.touches[0].clientX - rect.left) * (width / rect.width);
            mouseY = (e.touches[0].clientY - rect.top) * (height / rect.height);
        }
    }
    function handleOrientation(event) {
        let beta = event.beta, gamma = event.gamma;
        if (initialBeta === null) { initialBeta = beta; initialGamma = gamma; }
        let relBeta = Math.max(-45, Math.min(45, beta - initialBeta));
        let relGamma = Math.max(-45, Math.min(45, gamma - initialGamma));
        gyroX = relGamma / 45;
        gyroY = relBeta / 45;
        mouseX = width / 2 + (gyroX * 40);
        mouseY = height / 2 + (gyroY * 40);
    }
    function setupGyro() {
        window.addEventListener('deviceorientation', handleOrientation, true);
        gyroSupported = true;
    }
    async function requestGyroPermission() {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') setupGyro();
            } catch (e) {}
        } else {
            setupGyro();
        }
    }
    // Listeners
    canvas.addEventListener('mousemove', updateMouse);
    canvas.addEventListener('touchmove', updateTouch, { passive: false });
    canvas.addEventListener('touchstart', updateTouch, { passive: false });
    if (isMobile) requestGyroPermission();

    // Pause when tab is hidden or preloader is gone
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            if (animationFrame) { cancelAnimationFrame(animationFrame); animationFrame = null; }
        } else {
            var preloader = document.getElementById('preloader');
            if (preloader && preloader.style.display !== 'none' && !animationFrame) {
                drawRevealLogo();
            }
        }
    });

    // Wait for image to load before drawing
    if (logoImg.complete) {
        drawRevealLogo();
    } else {
        logoImg.onload = drawRevealLogo;
    }
})();
