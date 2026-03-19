(function () {
  "use strict";

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  CONFIGURACIÓN GENERAL                                                   ║
  // ║  Todas las constantes del juego en un solo lugar.                        ║
  // ║  Modifica aquí para ajustar dificultad, tiempos y tamaños.               ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  // ── Imágenes de items buenos (uniformes UNE desde CDN de Shopify) ──────────
  const GOOD_URLS = [
    "https://cdn.shopify.com/s/files/1/0971/1845/4076/files/unestoreuniformes-15.jpg?v=1773875718",
    "https://cdn.shopify.com/s/files/1/0971/1845/4076/files/unestoreuniformes-14.jpg?v=1773875718",
    "https://cdn.shopify.com/s/files/1/0971/1845/4076/files/unestoreuniformes-13.jpg?v=1773875718",
  ];

  // ── Imágenes de items malos (productos ajenos a UNE) ──────────────────────
  const BAD_URLS = [
    "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1540865070955-2110dc5f2271?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=120&h=120&fit=crop",
  ];

  // ── Logos institucionales (valen el doble de puntos) ──────────────────────
  const LOGO_URLS = ["logos/enjoy.png", "logos/linea.png", "logos/vtu.png"];

  // ── Definición de niveles de dificultad ───────────────────────────────────
  // speed:       velocidad base de caída de items (px por frame a 60fps)
  // label:       texto que aparece en el HUD
  // bg:          color de fondo del canvas
  // spawnFactor: fracción del intervalo base de spawn (menor = más rápido)
  const LEVELS = [
    { speed: 2.5, label: "Normal", bg: "#001a71", spawnFactor: 1.0 },
    { speed: 4.0, label: "Rápido", bg: "#003b14", spawnFactor: 0.7 },
    { speed: 8.5, label: "Extremo", bg: "#4a0000", spawnFactor: 0.4 },
  ];

  // ── Parámetros de tiempo y items ──────────────────────────────────────────
  const ROUND_TIME = 45; // segundos por ronda
  const ITEM_SIZE = 54; // diámetro de cada item que cae (px)
  const SPAWN_INTERVAL = 900; // milisegundos entre spawns en nivel Normal
  const CART_SPEED = 7; // px por frame que se mueve el carrito con teclado

  // ── Parámetros de la camioneta ────────────────────────────────────────────
  // La imagen es cuadrada (592×592). El tamaño de visualización se calcula
  // dinámicamente en getCartRect() para adaptarse a distintas alturas de pantalla.
  // Estos valores son proporciones y márgenes fijos que se usan en ese cálculo.
  const CART_BOTTOM_MARGIN = 8; // px desde el borde inferior del canvas
  const CART_CATCH_TOP_RATIO = 0.3; // fracción desde arriba de la imagen donde empieza la zona de captura

  // ── Puntos por eventos de juego ───────────────────────────────────────────
  const PTS_GOOD = 10; // puntos por atrapar un uniforme
  const PTS_GOOD_COMBO = 20; // puntos por atrapar con combo ≥ 3
  const PTS_LOGO_MULT = 2; // multiplicador cuando el item es un logo
  const PTS_MISS_GOOD = 5; // puntos que se descuentan al dejar ir un item bueno
  const PTS_HIT_BAD = 15; // puntos que se descuentan al atrapar un item malo

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  ESTADO DEL JUEGO                                                        ║
  // ║  Variables mutables que cambian durante la partida.                      ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  let score = 0;
  let combo = 0;
  let timer = ROUND_TIME;
  let gameRunning = false;
  let isPaused = false;
  let currentLevelIndex = 0;
  let cartX = 0; // borde izquierdo de la zona lógica central del carrito
  let wrongs = 0; // errores acumulados (máximo 3 antes de game over)
  let items = []; // array de items cayendo
  let particles = []; // array de partículas de efectos
  let lastTime = 0; // timestamp del frame anterior (para calcular dt)
  let spawnTimer = 0; // acumulador de tiempo para el siguiente spawn
  let timerAcc = 0; // acumulador para decrementar el timer cada segundo
  let comboTimeout = null;
  let assetsLoaded = false;

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  ASSETS: IMÁGENES Y SONIDOS                                              ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  let goodImgs = [];
  let badImgs = [];
  let logoImgs = [];

  let cartImg = new Image();
  cartImg.src = "Camioneta3.png";

  // Sonidos del juego
  let goodSound = new Audio("efectos/bad.m4a"); // se reproduce al atrapar item bueno
  let badSound = new Audio("life.m4a"); // se reproduce al atrapar item malo
  let gameOverSound = new Audio("game over.m4a");

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  TECLADO                                                                 ║
  // ║  Registro de teclas presionadas para movimiento fluido del carrito.      ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  const keys = {};

  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    // Prevenir scroll de página con las teclas de movimiento
    if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(e.key))
      e.preventDefault();
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  REFERENCIAS AL DOM                                                      ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  const wrap = document.getElementById("gameWrap");
  const hud = document.getElementById("hud");
  const hudScore = document.getElementById("hudScore");
  const hudRound = document.getElementById("hudRound");
  const hudTimer = document.getElementById("hudTimer");
  const comboToast = document.getElementById("comboToast");
  const comboNum = document.getElementById("comboNum");
  const scrStart = document.getElementById("scrStart");
  const scrGameOver = document.getElementById("scrGameOver");
  const scrPause = document.getElementById("scrPause");
  const btnPlay = document.getElementById("btnPlay");
  const btnPlayTxt = document.getElementById("btnPlayTxt");
  const btnPause = document.getElementById("btnPause");
  const btnResume = document.getElementById("btnResume");
  const btnRestart = document.getElementById("btnRestart");
  const btnExit = document.getElementById("btnExit");
  const btnExit2 = document.getElementById("btnExit2");

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  CANVAS: SETUP Y ESCALADO                                                ║
  // ║  Ajusta el canvas al contenedor respetando pantallas Retina (HiDPI).     ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.offsetWidth || 420;
    const h = wrap.offsetHeight || 560;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.scale(dpr, dpr);

    // Centrar el carrito horizontalmente al iniciar o redimensionar
    const { CART_W } = getCartRect();
    cartX = w / 2 - CART_W / 2;
  }

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  CARGA DE ASSETS (PRELOAD)                                               ║
  // ║  Carga todas las imágenes antes de habilitar el botón de jugar.          ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  function preload() {
    const total = GOOD_URLS.length + BAD_URLS.length + LOGO_URLS.length;
    let loaded = 0;

    function onFinish() {
      loaded++;
      const pct = Math.round((loaded / total) * 100);
      btnPlayTxt.textContent = `Cargando... ${pct}%`;
      if (loaded >= total) {
        assetsLoaded = true;
        btnPlay.disabled = false;
        btnPlayTxt.textContent = "¡Jugar!";
      }
    }

    GOOD_URLS.forEach((url, i) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = img.onerror = onFinish;
      img.src = url;
      goodImgs[i] = img;
    });

    BAD_URLS.forEach((url, i) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = img.onerror = onFinish;
      img.src = url;
      badImgs[i] = img;
    });

    LOGO_URLS.forEach((url, i) => {
      const img = new Image();
      img.onload = img.onerror = onFinish;
      img.src = url;
      logoImgs[i] = img;
    });
  }

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  FONDO DEL CANVAS                                                        ║
  // ║  Dibuja el color sólido del nivel activo más una cuadrícula sutil.       ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  function drawBg() {
    const W = canvas.width / (window.devicePixelRatio || 1);
    const H = canvas.height / (window.devicePixelRatio || 1);

    ctx.fillStyle = LEVELS[currentLevelIndex].bg;
    ctx.fillRect(0, 0, W, H);

    // Cuadrícula decorativa semitransparente
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 0.5;
    const step = 32;
    for (let x = 0; x < W; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  CAMIONETA: GEOMETRÍA Y COLISIÓN                                         ║
  // ║                                                                          ║
  // ║  getCartRect() es la ÚNICA fuente de verdad para:                        ║
  // ║    • dónde se dibuja la imagen (drawX, drawY, CART_DISPLAY_SIZE)         ║
  // ║    • la zona de colisión real (catchTop/Bottom/Left/Right)               ║
  // ║                                                                          ║
  // ║  El tamaño (CART_DISPLAY_SIZE) se calcula dinámicamente:                 ║
  // ║    máximo 110px, pero nunca más del 22% de la altura del canvas.         ║
  // ║  Esto evita que la camioneta se recorte en móviles con pantalla baja.    ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  function getCartRect() {
    const W = canvas.width / (window.devicePixelRatio || 1);
    const H = canvas.height / (window.devicePixelRatio || 1);

    // Tamaño adaptativo: respeta pantallas pequeñas en vertical
    const CART_DISPLAY_SIZE = Math.min(110, H * 0.22);

    // Zona lógica central (donde se "reciben" los items)
    const CART_W = Math.round(CART_DISPLAY_SIZE * 0.72);
    const CART_CATCH_PAD_X = Math.round(CART_DISPLAY_SIZE * 0.14);

    // Posición de dibujo: centramos la imagen sobre cartX
    const drawX = cartX - (CART_DISPLAY_SIZE - CART_W) / 2;
    const drawY = H - CART_DISPLAY_SIZE - CART_BOTTOM_MARGIN;

    // Zona de captura: recortamos bordes de la imagen para colisión justa
    const catchTop = drawY + CART_DISPLAY_SIZE * CART_CATCH_TOP_RATIO;
    const catchBottom = H - CART_BOTTOM_MARGIN;
    const catchLeft = drawX + CART_CATCH_PAD_X;
    const catchRight = drawX + CART_DISPLAY_SIZE - CART_CATCH_PAD_X;

    return {
      drawX,
      drawY,
      catchTop,
      catchBottom,
      catchLeft,
      catchRight,
      CART_DISPLAY_SIZE,
      CART_W,
    };
  }

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  CAMIONETA: DIBUJO                                                       ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  function drawCart() {
    const { drawX, drawY, CART_DISPLAY_SIZE, CART_W } = getCartRect();
    const H = canvas.height / (window.devicePixelRatio || 1);

    if (cartImg.complete && cartImg.naturalWidth) {
      // Imagen cargada correctamente
      ctx.drawImage(
        cartImg,
        drawX,
        drawY,
        CART_DISPLAY_SIZE,
        CART_DISPLAY_SIZE,
      );
    } else {
      // ── Fallback: rectángulo estilizado si la imagen no cargó ──────────────
      const CART_H = Math.round(CART_DISPLAY_SIZE * 0.2);
      const y = H - CART_H - CART_BOTTOM_MARGIN;

      ctx.save();
      ctx.shadowColor = "rgba(226,35,25,.5)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#000c36";
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(cartX, y, CART_W, CART_H, 10);
      } else {
        const r = 10,
          w = CART_W,
          h = CART_H;
        ctx.moveTo(cartX + r, y);
        ctx.arcTo(cartX + w, y, cartX + w, y + h, r);
        ctx.arcTo(cartX + w, y + h, cartX, y + h, r);
        ctx.arcTo(cartX, y + h, cartX, y, r);
        ctx.arcTo(cartX, y, cartX + w, y, r);
        ctx.closePath();
      }
      ctx.fill();
      ctx.strokeStyle = "#e22319";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      ctx.font = "bold 14px Outfit,sans-serif";
      ctx.fillStyle = "#e22319";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("UNE", cartX + CART_W / 2, y + CART_H / 2);

      // Ruedas decorativas
      const wr = 6,
        wy = y + CART_H + 3;
      [
        [cartX + 14, wy],
        [cartX + CART_W - 14, wy],
      ].forEach(([wx, wy]) => {
        ctx.beginPath();
        ctx.arc(wx, wy, wr, 0, Math.PI * 2);
        ctx.fillStyle = "#e22319";
        ctx.fill();
        ctx.strokeStyle = "#001a71";
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
  }

  // ── DEBUG: descomentar para visualizar la zona de colisión en pantalla ─────
  // function drawCollisionDebug() {
  //   const { catchTop, catchBottom, catchLeft, catchRight } = getCartRect();
  //   ctx.save();
  //   ctx.strokeStyle = "lime";
  //   ctx.lineWidth = 2;
  //   ctx.strokeRect(catchLeft, catchTop, catchRight - catchLeft, catchBottom - catchTop);
  //   ctx.restore();
  // }

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  ITEMS QUE CAEN                                                          ║
  // ║                                                                          ║
  // ║  Probabilidades de spawn:                                                ║
  // ║    15% → logo institucional (vale el doble de puntos)                    ║
  // ║    45% → uniforme UNE (item bueno normal)                                ║
  // ║    40% → producto ajeno (item malo)                                      ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  function spawnItem() {
    const W = canvas.width / (window.devicePixelRatio || 1);
    const r = Math.random();

    let isGood = false,
      isLogo = false,
      pool;

    if (r < 0.15 && logoImgs.length > 0) {
      isGood = true;
      isLogo = true;
      pool = logoImgs;
    } else if (r < 0.6) {
      isGood = true;
      pool = goodImgs;
    } else {
      isGood = false;
      pool = badImgs;
    }

    const img = pool[Math.floor(Math.random() * pool.length)];

    items.push({
      x: ITEM_SIZE / 2 + Math.random() * (W - ITEM_SIZE),
      y: -ITEM_SIZE, // empieza fuera de pantalla (arriba)
      isGood,
      isLogo,
      img,
      speed: LEVELS[currentLevelIndex].speed + Math.random() * 0.5,
      wobble: Math.random() * Math.PI * 2, // fase inicial aleatoria del vaivén
    });
  }

  // ── Movimiento y detección de colisión ────────────────────────────────────

  function updateItems(dt) {
    const W = canvas.width / (window.devicePixelRatio || 1);
    const H = canvas.height / (window.devicePixelRatio || 1);
    const { catchTop, catchBottom, catchLeft, catchRight } = getCartRect();
    const itemR = ITEM_SIZE / 2;

    // Mover todos los items
    items.forEach((it) => {
      it.wobble += 0.08;
      const dynSpeed = it.speed + Math.sin(it.wobble * 2) * 2.0; // velocidad oscilante
      it.y += Math.max(0.5, dynSpeed) * (dt / 16.67); // caída vertical
      it.x += Math.sin(it.wobble) * 1.5; // vaivén lateral
      it.x = Math.max(itemR, Math.min(W - itemR, it.x)); // no salir por los lados
    });

    items = items.filter((it) => {
      const itemBottom = it.y + itemR;
      const itemLeft = it.x - itemR;
      const itemRight = it.x + itemR;

      // ── Colisión con el carrito ────────────────────────────────────────────
      const verticalHit = itemBottom >= catchTop && it.y - itemR < catchBottom;
      const horizontalHit = itemRight >= catchLeft && itemLeft <= catchRight;

      if (verticalHit && horizontalHit) {
        hit(it);
        return false; // eliminar del array
      }

      // ── Item bueno que pasó de largo sin ser atrapado ──────────────────────
      // Descuenta PTS_MISS_GOOD puntos y lanza partículas grises como aviso visual
      if (it.y - itemR > H + 10) {
        if (it.isGood) {
          score = Math.max(0, score - PTS_MISS_GOOD);
          spawnParticles(it.x, H - 20, "#aaaaaa");
          updateHUD();
        }
        return false; // eliminar del array
      }

      return true; // mantener en pantalla
    });
  }

  // ── Dibujo de cada item (círculo recortado con borde de color) ────────────

  function drawItemImg(it) {
    const r = ITEM_SIZE / 2;

    ctx.save();
    // Parpadeo sutil para dar vida a los items
    const isBlinking = Math.floor(Date.now() / 150) % 2 === 0;
    ctx.globalAlpha = isBlinking ? 0.6 : 1.0;

    // Recortar en círculo
    ctx.beginPath();
    ctx.arc(it.x, it.y, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (it.img && it.img.complete && it.img.naturalWidth) {
      ctx.drawImage(it.img, it.x - r, it.y - r, ITEM_SIZE, ITEM_SIZE);
    } else {
      // Fallback: color sólido si la imagen no cargó
      ctx.fillStyle = it.isGood ? "#e22319" : "#ff9500";
      ctx.fillRect(it.x - r, it.y - r, ITEM_SIZE, ITEM_SIZE);
    }
    ctx.restore();

    // Borde de color (rojo = bueno, naranja = malo)
    ctx.beginPath();
    ctx.arc(it.x, it.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = it.isGood ? "#e22319" : "#ff9500";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  function drawItems() {
    items.forEach(drawItemImg);
  }

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  LÓGICA DE IMPACTO (HIT)                                                 ║
  // ║                                                                          ║
  // ║  Se llama cada vez que un item colisiona con el carrito.                 ║
  // ║  • Item bueno → suma puntos, incrementa combo                            ║
  // ║  • Item malo  → resta puntos, rompe combo, cuenta error                  ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  function hit(it) {
    if (it.isGood) {
      if ("vibrate" in navigator) navigator.vibrate(100);

      try {
        goodSound.currentTime = 0;
        goodSound.play().catch(() => {});
      } catch (e) {}

      combo++;
      let pts = combo >= 3 ? PTS_GOOD_COMBO : PTS_GOOD;
      if (it.isLogo) pts *= PTS_LOGO_MULT;
      score = Math.max(0, score + pts);

      spawnParticles(it.x, it.y, it.isLogo ? "#00ff00" : "#e22319");
      if (combo >= 3) showCombo();
    } else {
      score = Math.max(0, score - PTS_HIT_BAD);
      combo = 0;
      wrongs++;

      spawnParticles(it.x, it.y, "#ff9500");

      try {
        badSound.currentTime = 0;
        badSound.play().catch(() => {});
      } catch (e) {}

      // Animación de vida perdida en el HUD
      const hudLives = document.getElementById("hudLives");
      if (hudLives) {
        hudLives.classList.remove("life-lost");
        void hudLives.offsetWidth; // forzar reflow para reiniciar la animación
        hudLives.classList.add("life-lost");
      }

      // 3 errores = game over inmediato
      if (wrongs >= 3) {
        updateHUD();
        endGame();
        return;
      }
    }

    updateHUD();
  }

  function showCombo() {
    comboNum.textContent = combo;
    comboToast.classList.add("show");
    clearTimeout(comboTimeout);
    comboTimeout = setTimeout(() => comboToast.classList.remove("show"), 1400);
  }

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  PARTÍCULAS DE EFECTOS                                                   ║
  // ║  Se lanzan en la posición del impacto o cuando se pierde un item bueno.  ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  function spawnParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 3;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        alpha: 1,
        color,
        r: 3 + Math.random() * 3,
      });
    }
  }

  function updateDrawParticles(dt) {
    particles = particles.filter((p) => {
      p.x += p.vx * (dt / 16.67);
      p.y += p.vy * (dt / 16.67);
      p.vy += 0.15; // gravedad sobre las partículas
      p.alpha -= 0.03; // desvanecimiento progresivo

      if (p.alpha <= 0) return false;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      return true;
    });
  }

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  HUD (HEADS-UP DISPLAY)                                                  ║
  // ║  Actualiza score, vidas, nivel y temporizador en pantalla.               ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  function updateHUD() {
    hudScore.textContent = score + " pts";
    hudRound.textContent = `Nivel: ${LEVELS[currentLevelIndex].label}`;

    const hudLives = document.getElementById("hudLives");
    if (hudLives) {
      const lives = 3 - wrongs;
      hudLives.textContent = "❤️".repeat(Math.max(0, lives));
    }

    const secs = Math.ceil(timer);
    hudTimer.textContent = secs + "s";
    // Parpadeo urgente cuando quedan 10 segundos o menos
    hudTimer.className = "hud-timer" + (secs <= 10 ? " urgent" : "");
  }

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  GAME LOOP PRINCIPAL                                                     ║
  // ║                                                                          ║
  // ║  Se ejecuta cada frame via requestAnimationFrame.                        ║
  // ║  Orden: input → física → render → HUD → siguiente frame.                 ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  function loop(ts) {
    if (!gameRunning) return;

    // Si está pausado, saltar la física y el render pero mantener el loop vivo
    if (isPaused) {
      lastTime = ts;
      requestAnimationFrame(loop);
      return;
    }

    // dt: milisegundos desde el frame anterior (máx 50ms para evitar saltos)
    const dt = lastTime ? Math.min(ts - lastTime, 50) : 16.67;
    lastTime = ts;

    const W = canvas.width / (window.devicePixelRatio || 1);

    // ── Input de teclado: mover carrito ───────────────────────────────────────
    const { CART_W } = getCartRect();
    if (keys["ArrowLeft"] || keys["a"] || keys["A"])
      cartX = Math.max(0, cartX - CART_SPEED * (dt / 16.67));
    if (keys["ArrowRight"] || keys["d"] || keys["D"])
      cartX = Math.min(W - CART_W, cartX + CART_SPEED * (dt / 16.67));

    // ── Temporizador de ronda ─────────────────────────────────────────────────
    timerAcc += dt;
    if (timerAcc >= 1000) {
      timerAcc -= 1000;
      timer = Math.max(0, timer - 1);
      updateHUD();
    }

    // ── Spawn de items ────────────────────────────────────────────────────────
    spawnTimer += dt;
    const activeSpawnInterval = Math.max(
      300,
      SPAWN_INTERVAL * LEVELS[currentLevelIndex].spawnFactor,
    );
    if (spawnTimer >= activeSpawnInterval) {
      spawnTimer -= activeSpawnInterval;
      spawnItem();
    }

    // ── Fin de ronda por tiempo ───────────────────────────────────────────────
    if (timer <= 0) {
      endGame();
      return;
    }

    // ── Render ────────────────────────────────────────────────────────────────
    drawBg();
    updateItems(dt);
    drawItems();
    updateDrawParticles(dt);
    drawCart();

    // ── Efecto de tensión: overlay rojo pulsante cuando queda 1 sola vida ─────
    if (wrongs === 2) {
      ctx.save();
      const pulseAlpha = 0.18 + Math.sin(Date.now() / 100) * 0.15;
      ctx.fillStyle = `rgba(255, 0, 0, ${pulseAlpha})`;
      ctx.fillRect(0, 0, W, canvas.height / (window.devicePixelRatio || 1));
      ctx.restore();
    }

    // drawCollisionDebug(); // ← descomentar para depurar colisiones visualmente

    requestAnimationFrame(loop);
  }

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  INICIO Y FIN DE PARTIDA                                                 ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  function startGame() {
    // Resetear estado
    isPaused = false;
    score = 0;
    combo = 0;
    timer = ROUND_TIME;
    wrongs = 0;
    timerAcc = 0;
    lastTime = 0;
    items = [];
    particles = [];
    spawnTimer = 0;
    gameRunning = true;

    // Mostrar canvas y ocultar pantallas de menú
    scrStart.classList.add("hidden");
    scrGameOver.classList.add("hidden");
    scrPause.classList.add("hidden");
    hud.classList.remove("hidden");

    setupCanvas();
    updateHUD();
    requestAnimationFrame(loop);
  }

  function endGame() {
    try {
      gameOverSound.currentTime = 0;
      gameOverSound.play().catch(() => {});
    } catch (e) {}

    gameRunning = false;
    hud.classList.add("hidden");
    comboToast.classList.remove("show");

    // Mensaje según puntaje final
    let msg = "";
    if (score >= 300) msg = "🏆 ¡Increíble! Eres un crack de UNE.";
    else if (score >= 150) msg = "⭐ ¡Muy bien! Tienes ojo para los uniformes.";
    else if (score >= 60) msg = "👍 ¡Buen intento! Sigue practicando.";
    else msg = "💪 ¡La próxima lo haces mejor!";

    document.getElementById("fScore").value = score;
    document.getElementById("fRonda").value = currentLevelIndex + 1;
    document.getElementById("goScore").textContent = score;
    document.getElementById("goMsg").textContent = msg;

    resetForm();
    scrGameOver.classList.remove("hidden");
    scrGameOver.scrollTop = 0;
  }

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  FORMULARIO DE CAPTURA DE LEADS                                          ║
  // ║  Se muestra en la pantalla de game over. Envía datos a la API de UNE.   ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  function resetForm() {
    const f = document.getElementById("captureForm");
    const s = document.getElementById("scrSuccess");

    f.style.display = "";
    f.classList.remove("hidden");
    s.style.display = "none";
    s.classList.add("hidden");

    document.getElementById("formStatus").classList.add("hidden");
    document.getElementById("btnWa").style.display = "none";

    // Limpiar campos de texto
    ["fNombre", "fApellidos", "fCorreo", "fTelefono", "fCarrera"].forEach(
      (id) => {
        const el = document.getElementById(id);
        el.value = "";
        el.classList.remove("invalid");
      },
    );

    // Limpiar selects
    ["fNivel", "fPlantel"].forEach((id) => {
      const el = document.getElementById(id);
      el.value = "";
      el.classList.remove("invalid");
    });

    document.getElementById("slideCarrera").classList.remove("visible");

    const btn = document.getElementById("btnSubmit");
    btn.disabled = false;
    document.getElementById("btnSubmitTxt").textContent = "Enviar mi registro";
  }

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  INPUT: MOUSE Y TOUCH                                                    ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  canvas.addEventListener("mousemove", (e) => {
    if (!gameRunning) return;
    const { CART_W } = getCartRect();
    const b = wrap.getBoundingClientRect();
    cartX = Math.max(
      0,
      Math.min(e.clientX - b.left - CART_W / 2, b.width - CART_W),
    );
  });

  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (!gameRunning) return;
      e.preventDefault();
      const { CART_W } = getCartRect();
      const b = wrap.getBoundingClientRect();
      const t = e.touches[0];
      cartX = Math.max(
        0,
        Math.min(t.clientX - b.left - CART_W / 2, b.width - CART_W),
      );
    },
    { passive: false },
  );

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  BOTONES DE CONTROL                                                      ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  btnPlay.addEventListener("click", startGame);

  function togglePause() {
    if (!gameRunning) return;
    isPaused = !isPaused;
    scrPause.classList.toggle("hidden", !isPaused);
  }

  btnPause.addEventListener("click", togglePause);
  btnResume.addEventListener("click", togglePause);

  btnRestart.addEventListener("click", () => {
    isPaused = false;
    scrPause.classList.add("hidden");
    startGame();
  });

  btnExit.addEventListener("click", () => {
    isPaused = false;
    gameRunning = false;
    scrPause.classList.add("hidden");
    hud.classList.add("hidden");
    scrStart.classList.remove("hidden");
  });

  btnExit2.addEventListener("click", () => {
    isPaused = false;
    gameRunning = false;
    scrPause.classList.add("hidden");
    scrGameOver.classList.add("hidden");
    hud.classList.add("hidden");
    scrStart.classList.remove("hidden");
  });

  document.getElementById("btnReplay2").addEventListener("click", () => {
    scrGameOver.classList.add("hidden");
    startGame();
  });

  document.getElementById("btnReplaySuccess").addEventListener("click", () => {
    scrGameOver.classList.add("hidden");
    startGame();
  });

  // ── Selector de nivel en la pantalla de inicio ────────────────────────────
  const levelBtns = document.querySelectorAll(".btn-level");
  levelBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      levelBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentLevelIndex = parseInt(btn.dataset.level);
    });
  });

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  FORMULARIO: NIVEL CONDICIONAL                                           ║
  // ║  Muestra el campo "Carrera" solo para niveles superiores a bachillerato. ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  const fNivel = document.getElementById("fNivel");
  const slideCarrera = document.getElementById("slideCarrera");
  const BASIC_NIVELES = ["Secundaria", "Bachillerato"];

  fNivel.addEventListener("change", () => {
    const show = fNivel.value && !BASIC_NIVELES.includes(fNivel.value);
    slideCarrera.classList.toggle("visible", show);
    if (!show) document.getElementById("fCarrera").value = "";
    fNivel.classList.remove("invalid");
  });

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  FORMULARIO: SANITIZACIÓN Y VALIDACIÓN                                   ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  function sanitizeText(v) {
    if (typeof v !== "string") return "";
    return v
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/javascript:/gi, "")
      .replace(/\bon\w+\s*=/gi, "")
      .trim()
      .slice(0, 200);
  }

  function sanitizeEmail(v) {
    return sanitizeText(v).toLowerCase().slice(0, 200);
  }

  function sanitizePhone(v) {
    return sanitizeText(v)
      .replace(/[^\d+\-() ]/g, "")
      .slice(0, 20);
  }

  function validateEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  function validatePhone(p) {
    return p.replace(/\D/g, "").length >= 10;
  }

  const VALID_PLANTELES = ["Plantel Torre UNE", "Plantel Tesistán"];
  const VALID_NIVELES = [
    "Secundaria",
    "Bachillerato",
    "Ciencias de la Salud",
    "Gastronomía",
    "Licenciatura",
    "Posgrado",
  ];

  function validatePlantel(p) {
    if (!VALID_PLANTELES.includes(p)) throw new Error("Plantel inválido");
  }

  function validateNivel(n) {
    if (!VALID_NIVELES.includes(n)) throw new Error("Nivel inválido");
  }

  function setInvalid(el, invalid) {
    el.classList.toggle("invalid", invalid);
    const fe = el.nextElementSibling;
    if (fe && fe.classList.contains("field-error"))
      fe.style.display = invalid ? "block" : "none";
  }

  function validateFormData() {
    let ok = true;
    const nombre = document.getElementById("fNombre");
    const apellidos = document.getElementById("fApellidos");
    const correo = document.getElementById("fCorreo");
    const telefono = document.getElementById("fTelefono");
    const nivel = document.getElementById("fNivel");
    const carrera = document.getElementById("fCarrera");
    const plantel = document.getElementById("fPlantel");

    const sn = sanitizeText(nombre.value);
    const sa = sanitizeText(apellidos.value);
    const se = sanitizeEmail(correo.value);
    const st = sanitizePhone(telefono.value);

    setInvalid(nombre, sn.length < 2 || sn.length > 100);
    if (sn.length < 2 || sn.length > 100) ok = false;
    setInvalid(apellidos, sa.length < 2 || sa.length > 100);
    if (sa.length < 2 || sa.length > 100) ok = false;
    setInvalid(correo, !validateEmail(se));
    if (!validateEmail(se)) ok = false;
    setInvalid(telefono, !validatePhone(st));
    if (!validatePhone(st)) ok = false;
    setInvalid(nivel, !VALID_NIVELES.includes(nivel.value));
    if (!VALID_NIVELES.includes(nivel.value)) ok = false;
    setInvalid(plantel, !VALID_PLANTELES.includes(plantel.value));
    if (!VALID_PLANTELES.includes(plantel.value)) ok = false;

    if (!BASIC_NIVELES.includes(nivel.value) && nivel.value) {
      const sc = sanitizeText(carrera.value);
      setInvalid(carrera, sc.length < 2);
      if (sc.length < 2) ok = false;
    }

    return ok;
  }

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  FORMULARIO: MENSAJES DE ESTADO                                          ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  const ICONS = {
    error:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warn: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    ok: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  };

  function showMsg(type, text, showWa = false) {
    const el = document.getElementById("formStatus");
    el.className = `status-msg ${type}`;
    el.innerHTML = (ICONS[type] || "") + `<span>${text}</span>`;
    el.classList.remove("hidden");
    document.getElementById("btnWa").style.display = showWa ? "block" : "none";
  }

  function hideMsg() {
    document.getElementById("formStatus").classList.add("hidden");
  }

  window.addEventListener("online", () => {
    showMsg("ok", "Conexión restaurada.");
    setTimeout(hideMsg, 3000);
  });

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  FORMULARIO: ENVÍO A LA API                                              ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  document.getElementById("btnSubmit").addEventListener("click", async () => {
    if (!validateFormData()) return;

    const nombre = sanitizeText(document.getElementById("fNombre").value);
    const apellidos = sanitizeText(document.getElementById("fApellidos").value);
    const correo = sanitizeEmail(document.getElementById("fCorreo").value);
    const telefono = sanitizePhone(document.getElementById("fTelefono").value);
    const nivel = document.getElementById("fNivel").value;
    const carrera = sanitizeText(document.getElementById("fCarrera").value);
    const plantel = document.getElementById("fPlantel").value;
    const sc = parseInt(document.getElementById("fScore").value) || 0;
    const ronda = parseInt(document.getElementById("fRonda").value) || 1;

    try {
      validatePlantel(plantel);
      validateNivel(nivel);
    } catch (e) {
      showMsg("error", e.message);
      return;
    }

    if (!navigator.onLine) {
      showMsg("error", "Sin conexión a internet.", true);
      return;
    }

    // Separar apellidos en paterno y materno
    const apellidoArr = apellidos.split(" ");
    const apellido_p = apellidoArr[0] || apellidos;
    const apellido_m = apellidoArr.slice(1).join(" ") || "No proporcionado";
    const programaInteres = !BASIC_NIVELES.includes(nivel) ? carrera : nivel;

    const payload = {
      nombre,
      apellido_p,
      apellido_m,
      correo,
      telefono,
      medio: "Juego UNE Store",
      modalidad: "Escolarizada",
      nivel_educativo: nivel,
      plantel_interes: plantel,
      programa_interes: programaInteres,
      puntaje: sc,
      ronda_alcanzada: ronda,
    };

    // Estado de carga en el botón
    const btn = document.getElementById("btnSubmit");
    const btnTxt = document.getElementById("btnSubmitTxt");
    btn.disabled = true;
    btnTxt.innerHTML = '<span class="spinner"></span> Enviando...';
    hideMsg();

    // Timeout de 15 segundos para la petición
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 15000);

    try {
      const res = await fetch(
        "https://intranet.universidad-une.com/api/createleads",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        },
      );
      clearTimeout(tid);

      if (!res.ok) {
        let errMsg = "Error al enviar. Intenta de nuevo.";
        try {
          const j = await res.json();
          errMsg = j.message || j.error || errMsg;
        } catch {}
        showMsg("error", errMsg);
        btn.disabled = false;
        btnTxt.textContent = "Reintentar";
        return;
      }

      // ── Éxito: mostrar pantalla de confirmación ───────────────────────────
      document.getElementById("captureForm").style.display = "none";
      const succ = document.getElementById("scrSuccess");
      succ.style.display = "block";
      succ.classList.remove("hidden");
      document.getElementById("successSub").textContent =
        `Gracias ${nombre}, te contactaremos pronto.`;
      document.getElementById("successPts").textContent =
        `Tu puntaje: ${sc} pts`;
    } catch (err) {
      clearTimeout(tid);
      if (err.name === "AbortError")
        showMsg("warn", "La conexión tardó demasiado.", true);
      else showMsg("error", "Error de red. Intenta de nuevo.", true);
      btn.disabled = false;
      btnTxt.textContent = "Reintentar";
    }
  });

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  INICIALIZACIÓN                                                          ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  setupCanvas();
  preload();
  drawBg();

  // Re-ajustar canvas si el usuario rota el dispositivo o redimensiona ventana
  window.addEventListener("resize", () => {
    if (!gameRunning) setupCanvas();
  });
})();
