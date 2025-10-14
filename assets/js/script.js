const canvas = document.getElementById('canvas');
        const gridSpacing = 650;
        const imageSize = 180;
        const blurRadius = 300;
        const maxBlur = 8;

        // Fixed 4 columns per row
        const gridColumns = 4;

        // Random position offset range (in pixels)
        const randomOffsetRange = 150; // Images can shift ±150px from grid position

        // Buffer space (30% of screen size on each side)
        const bufferPercent = 0.1;

        // Smooth scrolling parameters
        const smoothness = 0.08;
        const friction = 0.94;
        const minVelocity = 0.1;

        // Load base images from HTML
        const imageTemplates = document.querySelectorAll('#image-templates .image-template');
        const baseImages = Array.from(imageTemplates).map(template => {
            const img = template.querySelector('img');
            return {
                src: img.src,
                alt: img.alt
            };
        });

        
        const totalImages = baseImages.length;
        const gridRows = Math.ceil(totalImages / gridColumns);

        console.log(`Grid: ${gridColumns} columns × ${gridRows} rows for ${totalImages} images`);

        
        const bufferX = window.innerWidth * bufferPercent;
        const bufferY = window.innerHeight * bufferPercent;

        const contentWidth = (gridColumns - 1) * gridSpacing;
        const contentHeight = (gridRows - 1) * gridSpacing;

        const minOffsetX = -contentWidth - bufferX;
        const maxOffsetX = bufferX;
        const minOffsetY = -contentHeight - bufferY;
        const maxOffsetY = bufferY;

        
        let offsetX = -contentWidth / 2;
        let offsetY = -contentHeight / 2;
        let targetOffsetX = offsetX;
        let targetOffsetY = offsetY;
        let velocityX = 0;
        let velocityY = 0;
        let isDragging = false;
        let lastX, lastY;
        let images = [];

        
        const randomOffsets = new Map();
        function getRandomOffset(gridX, gridY) {
            const key = `${gridX},${gridY}`;
            if (!randomOffsets.has(key)) {
                randomOffsets.set(key, {
                    x: (Math.random() - 0.5) * randomOffsetRange,
                    y: (Math.random() - 0.5) * randomOffsetRange
                });
            }
            return randomOffsets.get(key);
        }

        function createImageElement(imageIndex, gridX, gridY) {
            const container = document.createElement('div');
            container.className = 'image-container';

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

        function createAllImages() {
            
            let imageIndex = 0;

            for (let y = 0; y < gridRows; y++) {
                const imagesInThisRow = Math.min(gridColumns, totalImages - (y * gridColumns));
                const isLastRow = (y === gridRows - 1);

                // Calculate offset for centering incomplete rows
                const rowOffset = (isLastRow && imagesInThisRow < gridColumns)
                    ? (gridColumns - imagesInThisRow) / 2
                    : 0;

                for (let x = 0; x < imagesInThisRow; x++) {
                    if (imageIndex < baseImages.length) {
                        images.push(createImageElement(imageIndex, x + rowOffset, y));
                        imageIndex++;
                    }
                }
            }
        }

        function clampOffset() {
            targetOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, targetOffsetX));
            targetOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, targetOffsetY));
        }

        function updateImagePositions() {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            images.forEach(img => {
                const randomOffset = getRandomOffset(img.gridX, img.gridY);

                const x = img.gridX * gridSpacing + offsetX + centerX + randomOffset.x;
                const y = img.gridY * gridSpacing + offsetY + centerY + randomOffset.y;

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
                    clampOffset();
                    velocityX *= friction;
                    velocityY *= friction;
                } else {
                    velocityX = 0;
                    velocityY = 0;
                }
            }

            updateImagePositions();
            requestAnimationFrame(animate);
        }

        
        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
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
            clampOffset();
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
            clampOffset();
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

       
        createAllImages();
        animate();