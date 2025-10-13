const canvas = document.getElementById('canvas');
        const gridSpacing = 580;
        const imageSize = 180;
        const blurRadius = 300;
        const maxBlur = 8;
        
        // Smooth scrolling parameters
        const smoothness = 0.08; // Lower = smoother (0.05-0.15)
        const friction = 0.94; // Momentum decay (0.85-0.95)
        const minVelocity = 0.1; // Stop threshold

        // Load base images from HTML
        const imageTemplates = document.querySelectorAll('#image-templates .image-template');
        const baseImages = Array.from(imageTemplates).map(template => {
            const img = template.querySelector('img');
            return {
                src: img.src,
                alt: img.alt
            };
        });

        let offsetX = 0;
        let offsetY = 0;
        let targetOffsetX = 0;
        let targetOffsetY = 0;
        let velocityX = 0;
        let velocityY = 0;
        let isDragging = false;
        let startX, startY;
        let lastX, lastY;
        let images = [];
        let imagePool = [];
        let lastUpdateGrid = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

        function createImageElement(gridX, gridY) {
            const container = document.createElement('div');
            container.className = 'image-container';
            
            const imageIndex = Math.abs((gridX * 7 + gridY * 13) % baseImages.length);
            const imageData = baseImages[imageIndex];
            
            const img = document.createElement('img');
            img.src = imageData.src;
            img.alt = imageData.alt;
            
            container.appendChild(img);
            canvas.appendChild(container);
            
            return {
                element: container,
                gridX: gridX,
                gridY: gridY
            };
        }

        function updateVisibleImages() {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            const buffer = 2;
            const minGridX = Math.floor((-offsetX - centerX) / gridSpacing) - buffer;
            const maxGridX = Math.ceil((-offsetX + window.innerWidth + centerX) / gridSpacing) + buffer;
            const minGridY = Math.floor((-offsetY - centerY) / gridSpacing) - buffer;
            const maxGridY = Math.ceil((-offsetY + window.innerHeight + centerY) / gridSpacing) + buffer;

            if (minGridX === lastUpdateGrid.minX && maxGridX === lastUpdateGrid.maxX &&
                minGridY === lastUpdateGrid.minY && maxGridY === lastUpdateGrid.maxY) {
                return;
            }

            lastUpdateGrid = { minX: minGridX, maxX: maxGridX, minY: minGridY, maxY: maxGridY };

            images = images.filter(img => {
                if (img.gridX < minGridX || img.gridX > maxGridX ||
                    img.gridY < minGridY || img.gridY > maxGridY) {
                    img.element.remove();
                    return false;
                }
                return true;
            });

            for (let x = minGridX; x <= maxGridX; x++) {
                for (let y = minGridY; y <= maxGridY; y++) {
                    const exists = images.some(img => img.gridX === x && img.gridY === y);
                    if (!exists) {
                        images.push(createImageElement(x, y));
                    }
                }
            }
        }

        function updateImagePositions() {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            images.forEach(img => {
                const x = img.gridX * gridSpacing + offsetX + centerX;
                const y = img.gridY * gridSpacing + offsetY + centerY;
                
                img.element.style.left = (x - imageSize / 2) + 'px';
                img.element.style.top = (y - imageSize / 2) + 'px';

                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                let blur = 0;
                if (distance > blurRadius) {
                    blur = Math.min(maxBlur, (distance - blurRadius) / 100 * maxBlur);
                }

                img.element.style.filter = `blur(${blur}px)`;
            });
        }

        function animate() {
            if (!isDragging) {
                offsetX += (targetOffsetX - offsetX) * smoothness;
                offsetY += (targetOffsetY - offsetY) * smoothness;

                if (Math.abs(velocityX) > minVelocity || Math.abs(velocityY) > minVelocity) {
                    targetOffsetX += velocityX;
                    targetOffsetY += velocityY;
                    velocityX *= friction;
                    velocityY *= friction;
                } else {
                    velocityX = 0;
                    velocityY = 0;
                }
            }

            updateVisibleImages();
            updateImagePositions();
            requestAnimationFrame(animate);
        }

        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            lastX = e.clientX;
            lastY = e.clientY;
            velocityX = 0;
            velocityY = 0;
            canvas.classList.add('dragging');
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;
            
            targetOffsetX += deltaX;
            targetOffsetY += deltaY;
            offsetX = targetOffsetX;
            offsetY = targetOffsetY;
            
            velocityX = deltaX * 0.8;
            velocityY = deltaY * 0.8;
            
            lastX = e.clientX;
            lastY = e.clientY;
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
            canvas.classList.remove('dragging');
        });

        canvas.addEventListener('mouseleave', () => {
            if (isDragging) {
                isDragging = false;
                canvas.classList.remove('dragging');
            }
        });

        canvas.addEventListener('touchstart', (e) => {
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            lastX = touch.clientX;
            lastY = touch.clientY;
            velocityX = 0;
            velocityY = 0;
            canvas.classList.add('dragging');
            e.preventDefault();
        });

        canvas.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - lastX;
            const deltaY = touch.clientY - lastY;
            
            targetOffsetX += deltaX;
            targetOffsetY += deltaY;
            offsetX = targetOffsetX;
            offsetY = targetOffsetY;
            
            velocityX = deltaX * 0.8;
            velocityY = deltaY * 0.8;
            
            lastX = touch.clientX;
            lastY = touch.clientY;
            e.preventDefault();
        });

        canvas.addEventListener('touchend', () => {
            isDragging = false;
            canvas.classList.remove('dragging');
        });

        updateVisibleImages();
        animate();