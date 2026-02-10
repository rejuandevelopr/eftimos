/**
 * index-page.js — Logic specific to index.html
 * Extracted from inline <script> blocks for cacheability and non-blocking parse.
 * Contains: map hover darkening, whispers sound, bfcache restoration,
 *           preloader logic, and intro-zoom animation.
 *
 * NOTE: iOS touch proxy overlay system is in controls.js (shared across all pages).
 */

// --- MAP HOVER DARKENING ---
document.addEventListener('DOMContentLoaded', function () {
    var canvas = document.getElementById('canvas');
    var videosBackground = document.getElementById('videos-background');
    if (!canvas || !videosBackground) return;

    canvas.addEventListener('mouseover', function (e) {
        var mapItem = e.target.closest('.image-link, .video-link');
        if (mapItem) {
            canvas.classList.add('has-hover');
            videosBackground.classList.add('map-item-hovered');
            var container = mapItem.closest('.image-container');
            var prev = canvas.querySelector('.image-container.is-hovered');
            if (prev && prev !== container) prev.classList.remove('is-hovered');
            if (container) container.classList.add('is-hovered');
        } else {
            canvas.classList.remove('has-hover');
            videosBackground.classList.remove('map-item-hovered');
            var prev = canvas.querySelector('.image-container.is-hovered');
            if (prev) prev.classList.remove('is-hovered');
        }
    });

    canvas.addEventListener('mouseleave', function () {
        canvas.classList.remove('has-hover');
        videosBackground.classList.remove('map-item-hovered');
        var prev = canvas.querySelector('.image-container.is-hovered');
        if (prev) prev.classList.remove('is-hovered');
    });

    // --- MOBILE TOUCH: Replicate hover darkening for touch events ---
    canvas.addEventListener('touchstart', function (e) {
        var touch = e.touches[0];
        if (!touch) return;
        var target = document.elementFromPoint(touch.clientX, touch.clientY);
        var mapItem = target ? target.closest('.image-link, .video-link') : null;
        if (mapItem) {
            canvas.classList.add('has-hover');
            videosBackground.classList.add('map-item-hovered');
            var container = mapItem.closest('.image-container');
            var prev = canvas.querySelector('.image-container.is-hovered');
            if (prev && prev !== container) prev.classList.remove('is-hovered');
            if (container) container.classList.add('is-hovered');
        }
    }, { passive: true });
});

// --- WHISPERS SOUND LOGIC ---
(function () {
    var whispersSound = document.getElementById('whispersSound');
    if (whispersSound) {
        var BASE_VOLUME = 0.04;
        var HOVER_VOLUME = 0.10;
        var TRANSITION_STEPS = 20;
        var isPlaying = false;
        var volumeTransitionInterval = null;
        var volumeMonitorInterval = null;
        var targetVolume = BASE_VOLUME;
        var canPlayAudio = false;

        function smoothVolumeTransition(target, duration) {
            duration = duration || 300;
            if (volumeTransitionInterval) {
                clearInterval(volumeTransitionInterval);
            }
            var startVolume = whispersSound.volume;
            var volumeDiff = target - startVolume;
            var stepDuration = duration / TRANSITION_STEPS;
            var currentStep = 0;
            volumeTransitionInterval = setInterval(function () {
                currentStep++;
                var progress = currentStep / TRANSITION_STEPS;
                var easeProgress = progress < 0.5
                    ? 2 * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                whispersSound.volume = startVolume + (volumeDiff * easeProgress);
                if (currentStep >= TRANSITION_STEPS) {
                    clearInterval(volumeTransitionInterval);
                    volumeTransitionInterval = null;
                    whispersSound.volume = target;
                    targetVolume = target;
                }
            }, stepDuration);
        }

        window.addEventListener('preloaderFinished', function () {
            canPlayAudio = true;
        });

        window.addEventListener('tooltipShown', function () {
            if (canPlayAudio) smoothVolumeTransition(HOVER_VOLUME, 400);
        });
        window.addEventListener('tooltipHidden', function () {
            if (canPlayAudio) smoothVolumeTransition(BASE_VOLUME, 500);
        });
        document.addEventListener('click', function (e) {
            if (e.target.closest('.image-link') && isPlaying) {
                smoothVolumeTransition(0, 400);
            }
        });
    }
})();

// --- BFCACHE / BACK BUTTON RESTORATION ---
(function () {
    var _eftimosPageHidden = false;
    window.addEventListener('pagehide', function () { _eftimosPageHidden = true; });

    window.addEventListener('pageshow', function (e) {
        var needsRestore = e.persisted || _eftimosPageHidden;

        if (!needsRestore) {
            try {
                var comp = window.getComputedStyle(document.body).opacity;
                if (comp === '0') needsRestore = true;
            } catch (ex) { }
            if (document.body.classList.contains('unloading') ||
                document.body.classList.contains('morphing')) {
                needsRestore = true;
            }
        }

        if (!needsRestore) return;
        _eftimosPageHidden = false;

        try {
            document.body.classList.remove('unloading', 'morphing', 'preloader-active');
            document.body.style.transition = 'none';
            document.body.style.animation = 'none';
            document.body.style.opacity = '1';

            var transOv = document.getElementById('transitionOverlay');
            if (transOv) {
                transOv.style.cssText = 'opacity:0;pointer-events:none;display:none;z-index:-1;';
            }

            var dimOv = document.getElementById('dimOverlay');
            if (dimOv) {
                dimOv.style.cssText = 'opacity:0;pointer-events:none;display:none;';
            }

            document.querySelectorAll('body > img[style*="position"]').forEach(function (el) {
                if (el.style.position === 'fixed') el.remove();
            });

            document.querySelectorAll('body > div').forEach(function (el) {
                if (el.style.position === 'fixed' && !el.id && parseInt(el.style.zIndex || 0, 10) > 100000) {
                    el.remove();
                }
            });

            var vidBg = document.getElementById('videos-background');
            var grain = document.getElementById('grainCanvas');
            if (vidBg) { vidBg.style.visibility = ''; vidBg.style.opacity = '1'; }
            if (grain) { grain.style.visibility = ''; grain.style.opacity = '1'; }

            var cvs = document.getElementById('canvas');
            if (cvs) { cvs.style.transition = 'none'; cvs.style.opacity = '1'; cvs.style.visibility = ''; }

            var nav = document.querySelector('nav.blending-item');
            if (nav) { nav.style.transition = 'none'; nav.style.opacity = '1'; nav.style.pointerEvents = 'auto'; }

            if (localStorage.getItem('eftimosPreloaderShown') === '1') {
                var pl = document.getElementById('preloader');
                if (pl) { pl.style.display = 'none'; pl.style.visibility = 'hidden'; pl.style.opacity = '0'; pl.style.pointerEvents = 'none'; }
            }

            var mt = document.getElementById('menuToggle');
            var sl = document.getElementById('sharedLogo');
            if (mt) { mt.style.opacity = '1'; mt.style.pointerEvents = 'auto'; }
            if (sl) { sl.style.opacity = '1'; }

            void document.body.offsetHeight;

            var fadeOverlay = document.createElement('div');
            fadeOverlay.setAttribute('id', 'bfcacheFadeOverlay');
            fadeOverlay.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:999999;opacity:1;pointer-events:none;transition:opacity 1.2s ease;';
            document.body.appendChild(fadeOverlay);
            void fadeOverlay.offsetHeight;
            fadeOverlay.style.opacity = '0';
            fadeOverlay.addEventListener('transitionend', function () { fadeOverlay.remove(); });
            setTimeout(function () {
                var fo = document.getElementById('bfcacheFadeOverlay');
                if (fo) fo.remove();
            }, 2000);

            requestAnimationFrame(function () {
                document.body.style.transition = '';
                document.body.style.animation = '';
                if (cvs) cvs.style.transition = '';
                if (nav) nav.style.transition = '';
            });

            if (vidBg) {
                vidBg.querySelectorAll('video').forEach(function (v) {
                    if (v.paused) v.play().catch(function () { });
                });
            }

            if (localStorage.getItem('visualEffectsEnabled') !== 'false' &&
                typeof window.startGrainAnimation === 'function') {
                window.startGrainAnimation();
            }

            try { sessionStorage.removeItem('morphTransition'); } catch (ex) { }

        } catch (err) {
            document.body.style.cssText = 'opacity:1 !important;';
            document.body.classList.remove('unloading', 'morphing');
        }
    });
})();

// --- PRELOADER LOGIC ---
(function () {
    function showBackground() {
        var vb = document.getElementById('videos-background');
        var gc = document.getElementById('grainCanvas');
        if (vb) { vb.style.visibility = ''; vb.style.opacity = '1'; }
        if (gc) { gc.style.visibility = ''; gc.style.opacity = '1'; }
    }

    function forceHidePreloader(preloader) {
        if (!preloader || preloader.getAttribute('data-hidden') === '1') return;
        preloader.setAttribute('data-hidden', '1');
        preloader.style.setProperty('display', 'none', 'important');
        preloader.style.setProperty('visibility', 'hidden', 'important');
        preloader.style.setProperty('opacity', '0', 'important');
        preloader.style.setProperty('pointer-events', 'none', 'important');
        preloader.style.setProperty('z-index', '-1', 'important');
        localStorage.setItem('eftimosPreloaderShown', '1');
        try { window.dispatchEvent(new Event('preloaderFinished')); } catch (e) { }
    }

    window.addEventListener('load', function () {
        setTimeout(function () {
            showBackground();

            var preloaderShown = localStorage.getItem('eftimosPreloaderShown') === '1';

            if (preloaderShown) {
                window.preloaderEnterPressed = true;
            } else {
                var enterBtn = document.getElementById('preloaderEnterBtn');
                if (enterBtn) {
                    enterBtn.disabled = false;
                    enterBtn.style.display = '';
                    enterBtn.focus();
                }
            }
        }, 200);
    });

    var enterBtn = document.getElementById('preloaderEnterBtn');
    if (enterBtn) {
        function handleEnterPress() {
            if (window._preloaderDismissed) return;
            window._preloaderDismissed = true;

            try {
                window.preloaderEnterPressed = true;
                var preloader = document.getElementById('preloader');
                if (!preloader) return;

                preloader.style.pointerEvents = 'none';
                enterBtn.disabled = true;

                try {
                    var soundEnabled = localStorage.getItem('audioEnabled') !== 'false';
                    if (soundEnabled) {
                        // Resume AudioContext on user gesture (required by browsers)
                        if (typeof window.resumeAudioContext === 'function') {
                            window.resumeAudioContext();
                        }
                        if (typeof window.setupAudioFiltersExternal === 'function') {
                            window.setupAudioFiltersExternal();
                        }
                        var lockedInSound = document.getElementById('lockedInSound');
                        if (lockedInSound) {
                            lockedInSound.muted = false;
                            lockedInSound.volume = 0.3;
                            lockedInSound.play().catch(function () { });
                        }
                        var noiseSound = document.getElementById('noiseSound');
                        if (noiseSound) {
                            noiseSound.muted = false;
                            noiseSound.loop = false;
                            noiseSound.volume = 1;
                            noiseSound.play().then(function () {
                                if (typeof window.startCrossfadeLoop === 'function' && window.noiseCrossfadeSystem) {
                                    window.startCrossfadeLoop(window.noiseCrossfadeSystem, noiseSound, true);
                                }
                            }).catch(function () { });
                        }
                        var whispersSound = document.getElementById('whispersSound');
                        if (whispersSound) {
                            whispersSound.muted = false;
                            whispersSound.loop = false;
                            whispersSound.volume = 1;
                            whispersSound.play().then(function () {
                                if (typeof window.startCrossfadeLoop === 'function' && window.whispersCrossfadeSystem) {
                                    window.startCrossfadeLoop(window.whispersCrossfadeSystem, whispersSound, false);
                                }
                            }).catch(function () { });
                        }
                    }
                } catch (audioErr) { }

                window.soundEnabled = typeof soundEnabled !== 'undefined' ? soundEnabled : (localStorage.getItem('audioEnabled') !== 'false');
                window.visualEffectsEnabled = localStorage.getItem('visualEffectsEnabled') !== 'false';
                document.body.classList.toggle('visual-effects-disabled', !window.visualEffectsEnabled);

                preloader.classList.remove('loaded');
                preloader.style.backdropFilter = 'none';
                preloader.style.webkitBackdropFilter = 'none';
                preloader.style.willChange = 'auto';
                preloader.style.background = 'transparent';
                preloader.style.transition = 'none';

                void preloader.offsetHeight;

                requestAnimationFrame(function () {
                    var preloaderLogo = document.querySelector('.preloader-logo img');
                    if (preloaderLogo) {
                        preloaderLogo.style.position = 'relative';
                        preloaderLogo.style.zIndex = '10';
                        preloaderLogo.style.animation = 'preloaderLogoAscend 0.8s cubic-bezier(.2,.9,.2,1) forwards';
                    }

                    preloader.classList.add('preloader-hide');
                    preloader.style.transition = 'opacity 0.7s cubic-bezier(.77,0,.18,1)';
                    preloader.style.opacity = '0';

                    var menuToggle = document.getElementById('menuToggle');
                    var sharedLogo = document.getElementById('sharedLogo');
                    if (menuToggle) {
                        menuToggle.style.opacity = '1';
                        menuToggle.style.pointerEvents = 'auto';
                    }
                    if (sharedLogo) {
                        sharedLogo.style.opacity = '1';
                        sharedLogo.style.transition = 'opacity 0.7s cubic-bezier(.77,0,.18,1)';
                    }

                    document.body.classList.remove('preloader-active');
                });

                preloader.addEventListener('transitionend', function onTransEnd(e) {
                    if (e.propertyName === 'opacity' || e.target === preloader) {
                        preloader.removeEventListener('transitionend', onTransEnd);
                        forceHidePreloader(preloader);
                    }
                });

                setTimeout(function () { forceHidePreloader(preloader); }, 900);

                setTimeout(function () {
                    var p = document.getElementById('preloader');
                    if (p && p.getAttribute('data-hidden') !== '1') {
                        forceHidePreloader(p);
                    }
                }, 2000);

            } catch (criticalErr) {
                var p = document.getElementById('preloader');
                if (p) forceHidePreloader(p);
                document.body.classList.remove('preloader-active');
            }
        }

        enterBtn.addEventListener('click', handleEnterPress);
        enterBtn.addEventListener('touchend', function (e) {
            e.preventDefault();
            handleEnterPress();
        });
    }

    document.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.keyCode === 13) && document.getElementById('preloader').style.opacity !== '0') {
            var btn = document.getElementById('preloaderEnterBtn');
            if (btn && !btn.disabled && btn.style.display !== 'none') {
                btn.click();
            }
        }
    });
})();

// --- INTRO ZOOM ANIMATION ---
(function () {
    var isAnimating = false;
    var lastAnimationTime = 0;

    var sessionKey = 'eftimos_indexVisited';
    var isReturning = sessionStorage.getItem(sessionKey) === '1';

    function shouldRunIntro(eventType) {
        var now = Date.now();
        if (now - lastAnimationTime < 2000) return false;

        var preloaderShown = localStorage.getItem('eftimosPreloaderShown') === '1';
        var force = location.search.indexOf('introZoom=1') !== -1;

        if (!preloaderShown && !force) return false;
        if (isReturning) return true;
        if (eventType === 'load' && (document.referrer || force)) return true;

        return false;
    }

    function triggerIntroZoomFromReferrer(eventType) {
        eventType = eventType || 'manual';
        if (isAnimating) return;
        if (!shouldRunIntro(eventType)) return;

        var canvas = document.getElementById('canvas');
        if (!canvas) return;

        var mapGroup = canvas.querySelector('#map-group');
        var targetElement = mapGroup || canvas;

        var preloader = document.getElementById('preloader');
        if (preloader && preloader.style.display !== 'none') {
            setTimeout(function () { triggerIntroZoomFromReferrer(eventType); }, 200);
            return;
        }

        var DURATION = 2000;
        var INITIAL_SCALE = 1.5;
        var EASING = 'cubic-bezier(.22,.9,.12,1)';

        function doAnim() {
            if (isAnimating) return;
            isAnimating = true;
            lastAnimationTime = Date.now();

            var wasHandheldActive = typeof window.freezeHandheldCamera === 'function';
            if (wasHandheldActive) {
                window.freezeHandheldCamera();
            }

            var overlay = document.createElement('div');
            Object.assign(overlay.style, {
                position: 'fixed',
                inset: '0',
                background: '#fff',
                zIndex: '2147483646',
                pointerEvents: 'none',
                opacity: '0.85',
                transition: 'opacity ' + DURATION + 'ms ' + EASING
            });
            document.body.appendChild(overlay);

            var originX = '50%', originY = '50%';
            try {
                if (document.referrer) {
                    var refUrl = new URL(document.referrer);
                    var file = refUrl.pathname.split('/').pop();
                    if (file) {
                        var selector = 'a[href$="' + file + '"], .image-link[href$="' + file + '"]';
                        var target = canvas.querySelector(selector);
                        if (target) {
                            var elemRect = targetElement.getBoundingClientRect();
                            var tRect = target.getBoundingClientRect();
                            var cx = ((tRect.left + tRect.width / 2) - elemRect.left) / elemRect.width * 100;
                            var cy = ((tRect.top + tRect.height / 2) - elemRect.top) / elemRect.height * 100;
                            originX = Math.min(Math.max(cx, 0), 100) + '%';
                            originY = Math.min(Math.max(cy, 0), 100) + '%';
                        }
                    }
                }
            } catch (e) { }

            var originalTransition = targetElement.style.transition;
            var originalTransform = targetElement.style.transform;
            var originalZIndex = targetElement.style.zIndex;

            targetElement.style.transform = '';
            targetElement.style.transition = 'none';
            targetElement.style.zIndex = '2147483647';

            window.getComputedStyle(targetElement).transform;

            requestAnimationFrame(function () {
                targetElement.style.transformOrigin = originX + ' ' + originY;
                targetElement.style.willChange = 'transform';
                targetElement.style.transition = 'none';
                targetElement.style.transform = 'scale(' + INITIAL_SCALE + ')';

                window.getComputedStyle(targetElement).transform;

                requestAnimationFrame(function () {
                    targetElement.style.transition = 'transform ' + DURATION + 'ms ' + EASING;
                    targetElement.style.transform = 'scale(1)';

                    setTimeout(function () {
                        overlay.style.opacity = '0';
                    }, 50);
                });
            });

            setTimeout(function () {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                targetElement.style.willChange = 'auto';

                targetElement.style.transition = 'transform 800ms cubic-bezier(.22,.61,.36,1), z-index 0ms 800ms';
                targetElement.style.transform = originalTransform || 'none';
                targetElement.style.zIndex = originalZIndex;

                setTimeout(function () {
                    if (wasHandheldActive && typeof window.resumeHandheldCamera === 'function') {
                        window.resumeHandheldCamera();
                    }

                    setTimeout(function () {
                        targetElement.style.transition = originalTransition;
                    }, 850);
                }, 50);

                isAnimating = false;
            }, DURATION - 650);
        }

        if (canvas.children.length > 0 || (mapGroup && mapGroup.children.length > 0)) {
            doAnim();
        } else {
            var mo = new MutationObserver(function (muts, obs) {
                if (canvas.children.length > 0) {
                    obs.disconnect();
                    doAnim();
                }
            });
            mo.observe(canvas, { childList: true, subtree: true });
            setTimeout(function () {
                try { mo.disconnect(); } catch (e) { }
                doAnim();
            }, 2000);
        }
    }

    window.addEventListener('load', function () {
        triggerIntroZoomFromReferrer('load');
        setTimeout(function () {
            sessionStorage.setItem(sessionKey, '1');
        }, 500);
    });

    window.addEventListener('pageshow', function (e) {
        if (isReturning) {
            setTimeout(function () { triggerIntroZoomFromReferrer('pageshow'); }, 150);
        }
    });

    window.addEventListener('popstate', function () {
        if (isReturning) {
            setTimeout(function () { triggerIntroZoomFromReferrer('popstate'); }, 150);
        }
    });

    window.triggerIntroZoomFromReferrer = function () {
        triggerIntroZoomFromReferrer('manual');
    };
})();
