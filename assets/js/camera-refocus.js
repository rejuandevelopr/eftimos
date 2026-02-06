/**
 * Camera Refocus Effect with Depth of Field
 * Simula el efecto de reenfoque de una cámara cinematográfica con profundidad de campo
 * Autor: Eftimos
 */

class CameraRefocusEffect {
    constructor(options = {}) {
        // Configuración por defecto
        this.config = {
            minInterval: options.minInterval || 8000,      // Mínimo tiempo entre refocus (ms)
            maxInterval: options.maxInterval || 20000,     // Máximo tiempo entre refocus (ms)
            minDuration: options.minDuration || 400,       // Duración mínima del efecto (ms)
            maxDuration: options.maxDuration || 900,       // Duración máxima del efecto (ms)
            minBlur: options.minBlur || 2,                 // Desenfoque mínimo (px)
            maxBlur: options.maxBlur || 8,                 // Desenfoque máximo (px)
            easing: options.easing || 'cubic-bezier(0.4, 0.0, 0.2, 1)', // Curva de suavizado
            layerStagger: options.layerStagger || 80,      // Delay entre capas (ms)
        };

        this.timeoutId = null;
        this.isActive = true;
        this.layers = [];
        this.originalFilters = new Map(); // Guardar filtros originales
        
        this.init();
    }

    /**
     * Inicializa el efecto detectando elementos y asignando capas
     */
    init() {
        // Detectar elementos principales de la página y asignarles profundidad
        this.detectLayers();
        
        // Iniciar el ciclo de refocus
        this.scheduleNextRefocus();
        
        console.log(`🎥 Camera Refocus Effect with Depth of Field initialized (${this.layers.length} layers)`);
    }

    /**
     * Detecta los elementos de la página y los organiza por capas de profundidad
     */
    detectLayers() {
        this.layers = [];
        
        // Selectores de elementos principales a incluir
        const selectors = [
            'header', 'nav', 'main', 'section', 'article', 'aside', 'footer',
            '.gallery-item', '.video-container', '.image-container',
            '#videos-background', '#grain-canvas', '.menu', '.logo',
            'video', 'canvas', 'img', '.content', '.text', '.button',
            '[data-depth]' // Elementos con profundidad manual
        ];
        
        const elements = new Set();
        
        // Recopilar todos los elementos
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                // Excluir el overlay y elementos muy pequeños
                if (el.id !== 'camera-refocus-overlay' && 
                    el.offsetWidth > 10 && 
                    el.offsetHeight > 10) {
                    elements.add(el);
                }
            });
        });
        
        // Convertir a array y calcular profundidad
        const elementsArray = Array.from(elements);
        
        elementsArray.forEach(el => {
            const rect = el.getBoundingClientRect();
            const zIndex = parseInt(window.getComputedStyle(el).zIndex) || 0;
            
            // Calcular profundidad basada en:
            // - z-index (principal)
            // - Posición vertical (secundario)
            // - Atributo data-depth manual (override)
            let depth = 0;
            
            if (el.hasAttribute('data-depth')) {
                depth = parseFloat(el.getAttribute('data-depth'));
            } else {
                // Normalizar z-index a rango 0-100
                const normalizedZ = Math.max(0, Math.min(100, zIndex));
                // Usar posición Y como factor secundario (elementos arriba = más cerca)
                const normalizedY = (rect.top / window.innerHeight) * 20;
                depth = normalizedZ + normalizedY;
            }
            
            this.layers.push({
                element: el,
                depth: depth,
                originalFilter: el.style.filter || ''
            });
            
            // Guardar filtro original
            this.originalFilters.set(el, el.style.filter || '');
        });
        
        // Ordenar por profundidad (más profundo primero, se desenfoca más tarde)
        this.layers.sort((a, b) => a.depth - b.depth);
    }

    /**
     * Genera un número aleatorio entre min y max
     */
    random(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * Programa el siguiente refocus
     */
    scheduleNextRefocus() {
        if (!this.isActive) return;
        
        const nextInterval = this.random(this.config.minInterval, this.config.maxInterval);
        
        this.timeoutId = setTimeout(() => {
            this.triggerRefocus();
        }, nextInterval);
    }

    /**
     * Ejecuta el efecto de refocus con profundidad de campo
     */
    triggerRefocus() {
        if (!this.isActive || this.layers.length === 0) return;

        // Generar valores procedurales
        const maxBlur = this.random(this.config.minBlur, this.config.maxBlur);
        const duration = this.random(this.config.minDuration, this.config.maxDuration);
        
        // Calcular tiempos de la animación
        const blurInTime = duration * 0.3;  // 30% para desenfocar
        const holdTime = duration * 0.1;     // 10% mantener desenfoque
        const blurOutTime = duration * 0.6;  // 60% para reenfocar
        
        // Determinar punto focal aleatorio (qué capa está enfocada)
        const focalPoint = this.random(0, this.layers.length);
        
        // Aplicar blur a cada capa con intensidad basada en distancia al punto focal
        this.layers.forEach((layer, index) => {
            const distanceFromFocus = Math.abs(index - focalPoint);
            const normalizedDistance = distanceFromFocus / this.layers.length;
            
            // Calcular intensidad de blur basada en distancia al foco
            const layerBlur = maxBlur * normalizedDistance;
            
            // Delay escalonado para efecto de profundidad
            const layerDelay = index * this.config.layerStagger;
            
            setTimeout(() => {
                this.applyBlurToLayer(layer, layerBlur, blurInTime, holdTime, blurOutTime);
            }, layerDelay);
        });
        
        // Programar siguiente refocus (considerar el tiempo total de la animación)
        const totalAnimationTime = duration + (this.layers.length * this.config.layerStagger);
        setTimeout(() => {
            this.scheduleNextRefocus();
        }, totalAnimationTime);
    }

    /**
     * Aplica el efecto de blur a una capa específica
     */
    applyBlurToLayer(layer, blurAmount, blurInTime, holdTime, blurOutTime) {
        const element = layer.element;
        const originalFilter = this.originalFilters.get(element) || '';
        
        // Extraer otros filtros existentes (brightness, contrast, etc.)
        const otherFilters = originalFilter.replace(/blur\([^)]*\)/g, '').trim();
        
        // Fase 1: Desenfocar
        element.style.transition = `filter ${blurInTime}ms ${this.config.easing}`;
        const blurFilter = blurAmount > 0.5 ? `blur(${blurAmount}px)` : '';
        element.style.filter = [otherFilters, blurFilter].filter(f => f).join(' ').trim();
        
        // Fase 2: Mantener y luego reenfocar
        setTimeout(() => {
            element.style.transition = `filter ${blurOutTime}ms ${this.config.easing}`;
            element.style.filter = otherFilters || 'none';
        }, blurInTime + holdTime);
    }

    /**
     * Detiene el efecto
     */
    stop() {
        this.isActive = false;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        // Restaurar todos los elementos
        this.layers.forEach(layer => {
            const original = this.originalFilters.get(layer.element) || '';
            layer.element.style.filter = original;
        });
    }

    /**
     * Reinicia el efecto
     */
    start() {
        this.isActive = true;
        this.detectLayers(); // Re-detectar por si ha cambiado el DOM
        this.scheduleNextRefocus();
    }

    /**
     * Destruye el efecto y limpia el DOM
     */
    destroy() {
        this.stop();
        this.layers = [];
        this.originalFilters.clear();
    }

    /**
     * Actualiza la configuración
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Fuerza un refocus inmediato (útil para testing)
     */
    forceRefocus() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        this.triggerRefocus();
    }

    /**
     * Refresca la detección de capas (útil si el DOM cambia)
     */
    refreshLayers() {
        this.detectLayers();
        console.log(`🔄 Layers refreshed: ${this.layers.length} layers detected`);
    }
}

// Auto-inicialización cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Inicializar con configuración por defecto
        window.cameraRefocusEffect = new CameraRefocusEffect({
            minInterval: 5000,    // 5 segundos mínimo
            maxInterval: 12000,   // 12 segundos máximo
            minDuration: 500,     // 0.5 segundos mínimo
            maxDuration: 1000,    // 1 segundo máximo
            minBlur: 3,           // 3px mínimo
            maxBlur: 7,           // 7px máximo
            layerStagger: 60,     // 60ms entre capas
        });
    });
} else {
    // El DOM ya está listo
    window.cameraRefocusEffect = new CameraRefocusEffect({
        minInterval: 5000,
        maxInterval: 12000,
        minDuration: 500,
        maxDuration: 1000,
        minBlur: 3,
        maxBlur: 7,
        layerStagger: 60,
    });
}
