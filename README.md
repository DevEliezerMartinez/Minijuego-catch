# 🎓 ¡Atrapa tu Uniforme! — UNE

Juego arcade de captura de objetos integrado en la intranet de **Universidad UNE**. El jugador mueve una camioneta y debe atrapar artículos de la tienda universitaria e íconos representativos mientras esquiva objetos no relacionados con el plantel. Al terminar, el juego muestra un formulario de captura de leads.

---

## 📁 Estructura del proyecto

```text
atrapa/
├── index.html    # Pantallas del juego (Start, Pause, Game Over, Formulario, Success)
├── main.css      # Estilos y animaciones (ej. life-lost al perder vida)
├── main.js       # Lógica: game loop, colisiones, eventos, vidas, audio y API
├── Camioneta3.png # Sprite principal del jugador
├── logos/        # Imágenes de los logos de doble puntaje
└── efectos/      # Efectos de sonido (bad.m4a, life.m4a)
```

> El proyecto es **vanilla HTML + CSS + JS** sin dependencias externas (excepto la fuente Outfit).

---

## 🕹️ Mecánica del juego

| Concepto                | Detalle                                                                                                                                                         |
| :---------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Control**             | Ratón (`mousemove`), toque (`touchmove`) o teclado (Flechas/A/D)                                                                                                |
| **Objeto bueno** 🎓     | +10 pts (o +20 en combo ×3)                                                                                                                                     |
| **Logo (Doble pts)** 🌟 | +20 pts (o +40 en combo ×3)                                                                                                                                     |
| **Objeto malo** 🍔      | −15 pts y pérdida de 1 vida (❤️)                                                                                                                                |
| **Vidas y Game Over**   | El jugador comienza con 3 vidas. Al atrapar 3 objetos malos, se disparará el Game Over automáticamente.                                                         |
| **Combo**               | 3 aciertos seguidos activa el multiplicador de puntos.                                                                                                          |
| **Niveles**             | Normal → Rápido → Extremo. La velocidad de caída, la frecuencia de aparición y el color del fondo cambian drásticamente entre cada uno.                         |
| **Efectos Sensoriales** | Los objetos caen con velocidad variable y parpadean. Atrapar algo bueno o malo activa audios (`bad.m4a`, `life.m4a`) y vibración (en dispositivos compatibles). |

---

## 📋 Formulario de captura de leads

Al terminar el juego se despliega un formulario con validación estricta orientada a captura de datos para Odoo:

- **Nombre** y **Apellidos** (mín. 2 caracteres)
- **Nivel / Carrera**
- **Carrera / Programa** (campo condicional por nivel)
- **Plantel** (Torre UNE · Tesistán)
- **Puntaje** y **Ronda alcanzada** (ocultos)

### API de envío

```http
POST https://intranet.universidad-une.com/api/createleads
Content-Type: application/json
```

La petición cuenta con un **timeout de 15 s** vía `AbortController`. Ante un fallo o falta de red, muestra automáticamente un botón de WhatsApp como estrategia fallback.

---

## 🔐 Seguridad y Configuración

- **Sanitización** de texto (eliminación de HTML, scripts inline, y `on*`).
- **Validación** en frontend que concuerda con lo esperado por el endpoint comercial.
- Evita el `user-scalable` en touch y previene comportamientos nativos de scroll.

---

## 📄 Licencia

Uso interno — Universidad UNE © 2026. Todos los derechos reservados.
