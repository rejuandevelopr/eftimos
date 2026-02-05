# Sistema de Sonidos UI - Documentación

## Implementación Completada

Se ha implementado un sistema consistente de efectos de sonido (SFX) para mejorar la experiencia de usuario en el sitio web EFTIMOS.

## Características Implementadas

### 🎵 Efectos de Sonido

1. **Hover sobre elementos interactivos** (Cursor3.mp3)
   - Se reproduce cuando el cursor pasa sobre cualquier elemento "hoverable"
   - Elementos que activan el sonido:
     - Enlaces (a)
     - Botones (button)
     - Links de imágenes (.image-link)
     - Links de video (.video-link)
     - Menú hamburguesa (.menu-toggle)
     - Botones de control (.sidebar-control-btn)
     - Enlaces del dropdown (.dropdown-link, .dropdown-toggle)
     - Enlaces del submenú (.submenu-link)
     - Botones de submit (.submit-btn)
     - Botón del preloader (.preloader-enter-btn)
     - Frases de texto (.text-phrase)
     - Y más...

2. **Click/Touch general** (Cursor1.mp3)
   - Se reproduce en cualquier click o touch en la página
   - Aplica a todos los clics fuera del mapa/canvas

3. **Click/Touch en elementos del mapa** (Select2.mp3)
   - Se reproduce específicamente cuando se hace click/touch en elementos dentro de `#canvas`
   - Sonido distintivo para interacciones con el mapa principal

## Archivos Creados/Modificados

### Nuevo Archivo
- `assets/js/ui-sounds.js` - Sistema principal de gestión de sonidos UI

### Archivos Modificados
- `index.html` - Agregado script ui-sounds.js
- `clothes-view.html` - Agregado script ui-sounds.js
- `landing-page.html` - Agregado script ui-sounds.js
- `assets/js/controls.js` - Mejorado evento audioToggled con detalles
- `assets/js/script.js` - Mejorado evento audioToggled con detalles

## Características Técnicas

### ✅ Optimizaciones
- **Event Delegation**: Usa delegación de eventos para mejor rendimiento
- **Debouncing**: Previene reproducción rápida repetida de sonidos hover (50ms)
- **Lazy Loading**: Los archivos de audio se cargan solo en la primera interacción del usuario
- **Respeto de Preferencias**: Respeta la configuración de audio del usuario (localStorage)
- **Compatibilidad Móvil**: Soporte completo para eventos touch

### 🔊 Control de Audio
El sistema respeta automáticamente:
- `localStorage.audioEnabled`
- `window.audioEnabled`
- Eventos `audioToggled` personalizados

### 📱 Compatibilidad
- ✅ Desktop (mouseenter, mousedown)
- ✅ Mobile/Touch (touchstart)
- ✅ Navegadores modernos
- ✅ Autoplay restrictions (manejo silencioso de errores)

## API Expuesta

El sistema expone una API global `window.UISounds` para control programático:

```javascript
// Reproducir un sonido específico
window.UISounds.play('hover');
window.UISounds.play('click');
window.UISounds.play('mapClick');

// Habilitar/deshabilitar sonidos
window.UISounds.enable();
window.UISounds.disable();

// Ajustar volumen de un sonido específico (0.0 a 1.0)
window.UISounds.setVolume('hover', 0.5);
window.UISounds.setVolume('click', 0.3);
window.UISounds.setVolume('mapClick', 0.4);
```

## Archivos de Sonido Utilizados

Los siguientes archivos deben existir en `assets/sounds/web-sfx/`:
- ✅ `Cursor3.mp3` - Sonido de hover
- ✅ `Cursor1.mp3` - Sonido de click general
- ✅ `Select2.mp3` - Sonido de click en mapa

## Integración con Sistema Existente

El sistema se integra perfectamente con:
- Sistema de audio existente (white-noise, whispers)
- Toggles de audio del preloader y menú principal
- Sistema de cursor personalizado
- Efectos visuales del canvas

## Testing

Para probar el sistema:
1. Abre cualquier página del sitio (index.html, clothes-view.html, etc.)
2. Asegúrate de que el audio esté habilitado (toggle en el menú)
3. Pasa el cursor sobre botones/enlaces - deberías escuchar Cursor3.mp3
4. Haz click fuera del mapa - deberías escuchar Cursor1.mp3
5. Haz click en elementos del mapa - deberías escuchar Select2.mp3

## Notas de Implementación

- El sistema usa `capture phase` para asegurar que captura todos los eventos
- Los sonidos se reinician (currentTime = 0) antes de reproducirse para permitir clicks rápidos
- El volumen por defecto es 0.3 (30%) para no interferir con el audio ambiente
- Los errores de autoplay se manejan silenciosamente en la consola
