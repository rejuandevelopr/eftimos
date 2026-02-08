// Perspective Distortion Effect
// Aplica distorsión 3D basada en movimiento del ratón y giroscopio

// ⚠️ CONFIGURACIÓN: Cambiar a true para activar el efecto de movimiento 3D
const PERSPECTIVE_3D_ENABLED = false;

class PerspectiveDistortion {
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.intensity = options.intensity || 15; // Intensidad de la distorsión
        this.smoothing = options.smoothing || 0.1; // Suavizado del movimiento
        this.enabled = PERSPECTIVE_3D_ENABLED; // Control global del efecto

        // Posición actual y objetivo del mouse/giroscopio
        this.currentX = 0;
        this.currentY = 0;
        this.targetX = 0;
        this.targetY = 0;

        // Posición absoluta del mouse para cálculos individuales
        this.mouseX = window.innerWidth / 2;
        this.mouseY = window.innerHeight / 2;

        // Estado del giroscopio
        this.isGyroActive = false;
        this.gyroAlpha = 0;
        this.gyroBeta = 0;
        this.gyroGamma = 0;

        this.init();
    }

    init() {
        // Skip entirely on mobile devices for better performance
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            window.innerWidth <= 1024;

        if (isMobileDevice) {
            console.log('ℹ️ Efecto de perspectiva 3D desactivado en dispositivos móviles');
            this.enabled = false;
            return;
        }

        // Si el efecto está desactivado globalmente, no inicializar
        if (!this.enabled) {
            console.log('ℹ️ Efecto de perspectiva 3D desactivado (cambiar PERSPECTIVE_3D_ENABLED a true para activar)');
            return;
        }

        this.setupContainer();
        this.setupMouseTracking();
        this.setupGyroscope();
        this.animate();
    }

    setupContainer() {
        // Aplicar estilos necesarios al contenedor
        this.container.style.perspective = '1000px';
        this.container.style.transformStyle = 'preserve-3d';
        this.container.style.transition = 'transform 0.1s ease-out';
    }

    setupMouseTracking() {
        // Tracking del mouse para desktop (no interfiere con otros eventos)
        document.addEventListener('mousemove', (e) => {
            if (this.isGyroActive) return; // Si el giroscopio está activo, ignorar mouse

            // Guardar posición absoluta del mouse
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;

            // También guardar normalizada para giroscopio
            const x = (e.clientX / window.innerWidth) * 2 - 1; // -1 a 1
            const y = (e.clientY / window.innerHeight) * 2 - 1; // -1 a 1

            this.targetX = x;
            this.targetY = y;
        }, { passive: true }); // Passive para mejor rendimiento

        // Reset al salir de la ventana
        document.addEventListener('mouseleave', () => {
            if (!this.isGyroActive) {
                this.targetX = 0;
                this.targetY = 0;
            }
        });
    }

    setupGyroscope() {
        // Detectar si el dispositivo tiene giroscopio
        if (window.DeviceOrientationEvent) {
            // Para iOS 13+ necesitamos pedir permiso
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                // Crear botón de activación para iOS
                this.createGyroButton();
            } else {
                // Android o iOS antiguo - activar directamente
                this.activateGyroscope();
            }
        }
    }

    createGyroButton() {
        // Crear botón para solicitar permisos en iOS
        const button = document.createElement('button');
        button.id = 'gyro-permission-btn';
        button.textContent = 'Activar Movimiento 3D';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border: 1px solid white;
            border-radius: 25px;
            font-family: 'Helvetica', sans-serif;
            font-size: 14px;
            cursor: pointer;
            z-index: 10000;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.background = 'rgba(255, 255, 255, 0.2)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.background = 'rgba(0, 0, 0, 0.8)';
        });

        button.addEventListener('click', async () => {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    this.activateGyroscope();
                    button.style.opacity = '0';
                    setTimeout(() => button.remove(), 300);
                }
            } catch (error) {
                console.error('Error requesting gyroscope permission:', error);
            }
        });

        document.body.appendChild(button);
    }

    activateGyroscope() {
        window.addEventListener('deviceorientation', (event) => {
            this.isGyroActive = true;

            // Obtener valores del giroscopio
            this.gyroAlpha = event.alpha || 0; // Z-axis (0-360)
            this.gyroBeta = event.beta || 0;   // X-axis (-180 a 180)
            this.gyroGamma = event.gamma || 0; // Y-axis (-90 a 90)

            // Convertir a valores normalizados (-1 a 1)
            // Beta: inclinación adelante/atrás
            // Gamma: inclinación izquierda/derecha
            this.targetX = Math.max(-1, Math.min(1, this.gyroGamma / 45));
            this.targetY = Math.max(-1, Math.min(1, this.gyroBeta / 45));
        }, true);

        // Detectar cuando el dispositivo se mantiene quieto
        let lastUpdate = Date.now();
        window.addEventListener('deviceorientation', () => {
            lastUpdate = Date.now();
        });

        // Si no hay actualizaciones en 100ms, considerar que está quieto
        setInterval(() => {
            if (Date.now() - lastUpdate > 100 && this.isGyroActive) {
                this.isGyroActive = false;
            }
        }, 100);
    }

    animate() {
        // No animar si el efecto está desactivado globalmente
        if (!this.enabled) {
            return;
        }

        // Verificar si los efectos visuales están habilitados
        if (window.visualEffectsEnabled === false) {
            // No aplicar transformación cuando está desactivado
            requestAnimationFrame(() => this.animate());
            return;
        }

        // Suavizado exponencial para giroscopio (modo global)
        this.currentX += (this.targetX - this.currentX) * this.smoothing;
        this.currentY += (this.targetY - this.currentY) * this.smoothing;

        // Aplicar transformación 3D a cada elemento individual del mapa
        const elements = this.container.querySelectorAll('.image-container');
        elements.forEach(el => {
            // Si el elemento ya tiene una transformación del sistema principal, no tocarlo durante animaciones
            if (el.classList.contains('animating') || el.parentElement?.classList.contains('dragging')) {
                return;
            }

            // Obtener posición del centro del elemento
            const rect = el.getBoundingClientRect();
            const elementCenterX = rect.left + rect.width / 2;
            const elementCenterY = rect.top + rect.height / 2;

            let rotateX, rotateY;

            if (this.isGyroActive) {
                // Modo giroscopio: rotación global uniforme
                rotateY = this.currentX * this.intensity;
                rotateX = -this.currentY * this.intensity;
            } else {
                // Modo mouse: cada elemento "mira" hacia el cursor individualmente (más sutil)
                // Calcular diferencia entre el elemento y el mouse
                const deltaX = this.mouseX - elementCenterX;
                const deltaY = this.mouseY - elementCenterY;

                // Normalizar y aplicar intensidad con factor de suavizado para mouse
                const normalizedX = (deltaX / window.innerWidth) * 2;
                const normalizedY = (deltaY / window.innerHeight) * 2;

                // Factor de 0.4 para hacer el efecto con mouse mucho más sutil
                rotateY = normalizedX * this.intensity * 0.4;
                rotateX = -normalizedY * this.intensity * 0.4;
            }

            // Obtener la transformación actual del elemento (del script.js)
            const currentTransform = el.style.transform || '';

            // Aplicar una transformación adicional de perspectiva sin interferir con la posición
            el.style.transform = `${currentTransform} perspective(1500px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        // Continuar animación
        requestAnimationFrame(() => this.animate());
    }

    // Métodos públicos para control
    setIntensity(value) {
        this.intensity = value;
    }

    setSmoothing(value) {
        this.smoothing = value;
    }

    destroy() {
        // Limpiar efectos
        this.container.style.transform = '';
        this.container.style.perspective = '';
        this.container.style.transformStyle = '';
    }
}

// Inicializar automáticamente cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Solo aplicar el efecto en el index.html (página principal con el mapa)
    // Verificar que existe el canvas principal
    const mapCanvas = document.getElementById('canvas');

    if (!mapCanvas) {
        console.log('ℹ️ Perspective effect solo activo en index.html');
        return;
    }

    // Aplicar el efecto a los elementos del mapa
    console.log('🎨 Inicializando efecto de perspectiva en elementos del mapa');

    // Inicializar el efecto de distorsión
    window.perspectiveDistortion = new PerspectiveDistortion({
        container: mapCanvas,
        intensity: 3, // Distorsión sutil
        smoothing: 0.15 // Movimiento responsivo
    });
});
