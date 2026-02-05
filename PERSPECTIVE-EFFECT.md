# Efecto de Distorsión de Perspectiva 3D

## ⚠️ ESTADO ACTUAL
**El efecto está DESACTIVADO por defecto.**

Para activarlo, cambiar la constante `PERSPECTIVE_3D_ENABLED` a `true` en [assets/js/perspective-distortion.js](assets/js/perspective-distortion.js#L5).

## Descripción
Este efecto aplica una distorsión de perspectiva 3D a toda la página web que responde tanto al movimiento del ratón (en desktop) como al giroscopio (en dispositivos móviles).

## Características
- ✅ Responde al movimiento del ratón en desktop
- ✅ Utiliza el giroscopio en dispositivos móviles compatibles
- ✅ Transiciones suaves y animaciones fluidas
- ✅ Solicita permisos automáticamente en iOS 13+
- ✅ Botón de activación elegante para dispositivos móviles
- ✅ Se integra perfectamente con los efectos existentes

## Cómo Funciona

### Desktop (Ratón)
El efecto rastrea la posición del ratón y aplica una rotación 3D al contenedor principal:
- Movimiento horizontal → Rotación en el eje Y
- Movimiento vertical → Rotación en el eje X
- La intensidad es proporcional a la distancia desde el centro

### Móvil (Giroscopio)
En dispositivos móviles con giroscopio:
- Inclinación lateral → Rotación en el eje Y
- Inclinación adelante/atrás → Rotación en el eje X
- En iOS 13+, aparece un botón para activar el efecto
- En Android, se activa automáticamente

## Personalización

### Parámetros Configurables
Puedes ajustar el efecto modificando los parámetros en `perspective-distortion.js`:

```javascript
window.perspectiveDistortion = new PerspectiveDistortion({
    container: mainContainer,
    intensity: 12,    // Intensidad de la distorsión (0-20 recomendado)
    smoothing: 0.08   // Suavizado del movimiento (0.01-0.3)
});
```

**Intensity (Intensidad)**
- Valores bajos (5-10): Efecto sutil
- Valores medios (10-15): Efecto moderado (recomendado)
- Valores altos (15-25): Efecto pronunciado

**Smoothing (Suavizado)**
- Valores bajos (0.01-0.05): Movimiento lento y suave
- Valores medios (0.05-0.15): Movimiento equilibrado (recomendado)
- Valores altos (0.15-0.3): Movimiento rápido y responsivo

### Ajustes Dinámicos
Puedes cambiar los valores en tiempo real desde la consola:

```javascript
// Cambiar intensidad
window.perspectiveDistortion.setIntensity(15);

// Cambiar suavizado
window.perspectiveDistortion.setSmoothing(0.1);
```

### Desactivar el Efecto
Para desactivar completamente el efecto:

```javascript
window.perspectiveDistortion.destroy();
```

## Compatibilidad

### Navegadores Desktop
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

### Dispositivos Móviles
- ✅ iOS Safari (requiere permisos)
- ✅ Android Chrome
- ✅ Android Firefox
- ⚠️ Algunos dispositivos no tienen giroscopio

## Rendimiento
El efecto está optimizado para rendimiento:
- Usa `requestAnimationFrame` para animaciones suaves
- Aplica `will-change` para optimización GPU
- Suavizado exponencial para cálculos eficientes
- Sin impacto significativo en el rendimiento

## Notas Técnicas

### CSS Requerido
El archivo `style.css` ya incluye los estilos necesarios:
```css
.canvas-body {
    transform-style: preserve-3d;
    perspective: 1000px;
    transition: transform 0.1s ease-out;
    will-change: transform;
}
```

### Permisos iOS
En iOS 13+, los permisos de giroscopio deben solicitarse mediante interacción del usuario. El script crea automáticamente un botón para esto.

### Conflictos Potenciales
Si experimentas conflictos con otros efectos:
1. Verifica que no haya múltiples transformaciones en el mismo elemento
2. Ajusta el `z-index` si es necesario
3. Modifica el selector del contenedor si es necesario

## Archivos Modificados
- ✅ `assets/js/perspective-distortion.js` (nuevo)
- ✅ `assets/css/style.css` (actualizado)
- ✅ `index.html` (script añadido)
- ✅ `landing-page.html` (script añadido)
- ✅ `clothes-view.html` (script añadido)
- ✅ `comingsoon.html` (script añadido)

## Soporte
Para ajustes adicionales o problemas, modifica directamente `perspective-distortion.js` según tus necesidades.
