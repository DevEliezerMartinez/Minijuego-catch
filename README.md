# 🎓 ¡Atrapa tu Uniforme! — UNE

Juego arcade de captura de objetos integrado en la intranet de **Universidad UNE**. El jugador mueve un carrito y debe atrapar artículos de la tienda universitaria mientras esquiva objetos no relacionados con el plantel. Al terminar, el juego muestra un formulario de captura de leads.

---

## 📁 Estructura del proyecto

```
atrapa/
├── atrapa.html   # Pantallas del juego (Start, Game Over, Formulario, Success)
├── main.css      # Estilos — diseño dark mode con paleta gold/navy UNE
└── main.js       # Lógica completa: canvas, game loop, colisiones, formulario, API
```

> El proyecto es **vanilla HTML + CSS + JS** sin dependencias externas (excepto la fuente Outfit de Google Fonts).

---

## 🕹️ Mecánica del juego

| Concepto                  | Detalle                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| **Control**               | Ratón (mousemove) o toque (touchmove) para mover el carrito             |
| **Objeto bueno** 🎓👔🥼🎒 | +10 pts (o +20 en combo ×3)                                             |
| **Objeto malo** 🍔🎸🏀🌮  | −15 pts                                                                 |
| **Combo**                 | 3 aciertos seguidos activa el multiplicador de combo                    |
| **Rondas**                | 4 rondas × 45 s, velocidad creciente: Normal → Rápido → Veloz → Extremo |
| **Probabilidad**          | 55 % artículos buenos, 45 % malos por spawn                             |

---

## 📋 Formulario de captura de leads

Al terminar el juego se despliega un formulario con:

- **Nombre** y **Apellidos** (mín. 2 caracteres)
- **Nivel / Carrera** (Secundaria, Bachillerato, Ciencias de la Salud, Gastronomía, Licenciatura, Posgrado)
- **Carrera / Programa** — campo condicional, sólo visible para niveles que no sean Secundaria ni Bachillerato
- **Plantel** (Torre UNE · Tesistán)
- **Puntaje** y **Ronda alcanzada** — campos ocultos llenados automáticamente

### API de envío

```
POST https://intranet.universidad-une.com/api/createleads
Content-Type: application/json
```

**Payload:**

```json
{
  "nombre": "string",
  "apellido_p": "string",
  "apellido_m": "string",
  "correo": "",
  "telefono": "",
  "medio": "Juego UNE Store",
  "modalidad": "Escolarizada",
  "nivel_educativo": "string",
  "plantel_interes": "string",
  "programa_interes": "string",
  "puntaje": 0,
  "ronda_alcanzada": 1
}
```

La petición tiene un **timeout de 15 s** con `AbortController`. Ante fallos muestra el botón de WhatsApp como fallback.

---

## 🔐 Seguridad y validación

- **Sanitización** de texto: eliminación de etiquetas HTML, scripts inline y atributos `on*`
- **Whitelist** de valores de selectores (`VALID_PLANTELES`, `VALID_NIVELES`) validada en cliente antes del envío
- `user-scalable=no` en viewport para mejorar experiencia táctil en móvil

---

## 🎨 Design tokens (CSS custom properties)

| Variable       | Valor          | Uso                             |
| -------------- | -------------- | ------------------------------- |
| `--gold`       | `#c9a84c`      | Color principal de marca        |
| `--bg`         | `#0d1526`      | Fondo general                   |
| `--navy`       | `#1a3060`      | Carrito y elementos secundarios |
| `--label`      | `#8ab4e0`      | Texto de etiquetas y secundario |
| `--red`        | `#e74c3c`      | Penalizaciones y errores        |
| `--canvas-w/h` | `420 × 560 px` | Tamaño base del área de juego   |

---

## 🚀 Uso / Despliegue

El juego es un archivo estático. Basta con servir la carpeta `atrapa/` desde cualquier servidor HTTP o incluirla dentro de la intranet de Odoo.

```
# Ejemplo con Live Server (VS Code) o cualquier servidor estático
Abrir atrapa.html en el navegador
```

> **CORS**: la imagen del uniforme se carga desde Shopify CDN con `crossOrigin = "anonymous"`. Asegúrate de que el CDN no bloquee la petición.

---

## 💡 Mejoras sugeridas

Ver sección de mejoras en el README para ideas de evolución del proyecto.

---

## 📄 Licencia

Uso interno — Universidad UNE © 2025
