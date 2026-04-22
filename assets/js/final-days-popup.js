// --- FINAL DAYS POPUP LOGIC ---

(function() {
    'use strict';

    // Configuration
    const DEADLINE = new Date('2026-04-24T21:00:00+02:00'); // 21:00 España (UTC+2 en abril)
    const COUNTDOWN_UPDATE_INTERVAL = 1000; // Update every second

    // DOM Elements
    const popup = document.getElementById('finalDaysPopup');
    const closeBtn = document.getElementById('finalDaysClose');
    const shopBtn = document.getElementById('finalDaysShopBtn');
    const countdownBackground = document.getElementById('finalDaysCountdownBackground');
    
    // Popup countdown elements
    const countdownDays = document.getElementById('countdownDays');
    const countdownHours = document.getElementById('countdownHours');
    const countdownMinutes = document.getElementById('countdownMinutes');
    const countdownSeconds = document.getElementById('countdownSeconds');
    
    // Background countdown elements
    const countdownDaysBg = document.getElementById('countdownDaysBg');
    const countdownHoursBg = document.getElementById('countdownHoursBg');
    const countdownMinutesBg = document.getElementById('countdownMinutesBg');
    const countdownSecondsBg = document.getElementById('countdownSecondsBg');

    if (!popup || !countdownBackground) return; // Exit if elements not found

    let countdownInterval = null;

    // Check if deadline has passed
    function isDeadlineReached() {
        return new Date() >= DEADLINE;
    }

    // Update both countdown displays
    function updateCountdown() {
        const now = new Date();
        const diff = DEADLINE - now;

        if (diff <= 0) {
            // Deadline reached - hide countdown
            countdownBackground.style.display = 'none';
            popup.style.display = 'none';
            const zeroPadded = '00';
            countdownDays.textContent = zeroPadded;
            countdownHours.textContent = zeroPadded;
            countdownMinutes.textContent = zeroPadded;
            countdownSeconds.textContent = zeroPadded;
            countdownDaysBg.textContent = zeroPadded;
            countdownHoursBg.textContent = zeroPadded;
            countdownMinutesBg.textContent = zeroPadded;
            countdownSecondsBg.textContent = zeroPadded;
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const daysStr = String(days).padStart(2, '0');
        const hoursStr = String(hours).padStart(2, '0');
        const minutesStr = String(minutes).padStart(2, '0');
        const secondsStr = String(seconds).padStart(2, '0');

        // Update both displays
        countdownDays.textContent = daysStr;
        countdownHours.textContent = hoursStr;
        countdownMinutes.textContent = minutesStr;
        countdownSeconds.textContent = secondsStr;
        
        countdownDaysBg.textContent = daysStr;
        countdownHoursBg.textContent = hoursStr;
        countdownMinutesBg.textContent = minutesStr;
        countdownSecondsBg.textContent = secondsStr;
    }

    // Show popup function
    function showPopup() {
        // DO NOT SHOW if deadline has passed
        if (isDeadlineReached()) {
            return;
        }

        // Update countdown immediately
        updateCountdown();

        // Show popup with animation
        popup.style.display = 'flex';
        popup.style.opacity = '0';
        
        // Trigger reflow to enable CSS transitions
        void popup.offsetWidth;
        
        popup.style.opacity = '1';

        // Setup event listeners
        setupEventListeners();
    }

    // Setup all event listeners
    function setupEventListeners() {
        // Close button handler
        if (closeBtn) {
            closeBtn.onclick = closePopup;
        }

        // Shop button handler
        if (shopBtn) {
            shopBtn.onclick = function() {
                window.location.href = 'https://shop.eaftimos.com/';
            };
        }

        // Allow closing with Escape key
        const handleEscape = function(e) {
            if (e.key === 'Escape' || e.keyCode === 27) {
                closePopup();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Click outside to close (on the dark overlay)
        popup.addEventListener('click', function(e) {
            if (e.target === popup) {
                closePopup();
            }
        });
    }

    // Close popup function
    function closePopup() {
        popup.style.opacity = '0';
        
        setTimeout(() => {
            popup.style.display = 'none';
        }, 600); // Match CSS transition duration
    }

    // Hook into preloader ENTER button
    function setupPreloaderHook() {
        // Wait for preloader enter button to be available
        const checkForButton = setInterval(function() {
            const enterBtn = document.getElementById('preloaderEnterBtn');
            
            if (enterBtn) {
                clearInterval(checkForButton);
                
                // Add click listener to show popup
                enterBtn.addEventListener('click', function() {
                    // Show popup after a short delay (allows preloader animations to start)
                    setTimeout(showPopup, 200);
                });
            }
        }, 100);
        
        // Stop checking after 5 seconds
        setTimeout(() => clearInterval(checkForButton), 5000);
    }

    // Initialize
    function initialize() {
        // DO NOT SHOW if deadline has already passed
        if (isDeadlineReached()) {
            countdownBackground.style.display = 'none';
            popup.style.display = 'none';
            return;
        }

        // Update countdown immediately
        updateCountdown();

        // Start countdown timer (update every second)
        countdownInterval = setInterval(updateCountdown, COUNTDOWN_UPDATE_INTERVAL);

        // Hook into preloader enter button
        setupPreloaderHook();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
