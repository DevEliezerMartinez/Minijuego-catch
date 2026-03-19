(function () {
  "use strict";

  // ── CONFIG ──────────────────────────────────────────────────────────────────
  const GOOD_URLS = [
    "https://cdn.shopify.com/s/files/1/0971/1845/4076/files/unestoreuniformes-15.jpg?v=1773875718",
    "https://cdn.shopify.com/s/files/1/0971/1845/4076/files/unestoreuniformes-14.jpg?v=1773875718",
    "https://cdn.shopify.com/s/files/1/0971/1845/4076/files/unestoreuniformes-13.jpg?v=1773875718",
  ];
  const BAD_URLS = [
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=120&h=120&fit=crop",
  ];

  const LOGO_URLS = ["logos/enjoy.png", "logos/linea.png", "logos/vtu.png"];

  const LEVELS = [
    { speed: 2.5, label: "Normal", bg: "#001a71", spawnFactor: 1.0 },
    { speed: 4.0, label: "Rápido", bg: "#003b14", spawnFactor: 0.7 },
    { speed: 8.5, label: "Extremo", bg: "#4a0000", spawnFactor: 0.4 },
  ];
  const ROUND_TIME = 45;
  const CART_W = 80,
    CART_H = 38;
  const ITEM_SIZE = 54;
  const HIT_RADIUS = ITEM_SIZE * 0.38; // ~20px — smaller than visual for fairness
  const SPAWN_INTERVAL = 900;
  const CART_SPEED = 7; // px per frame at 60fps

  // ── STATE ────────────────────────────────────────────────────────────────────
  let score = 0,
    combo = 0,
    timer = ROUND_TIME,
    gameRunning = false;
  let currentLevelIndex = 0;
  let isPaused = false;
  let cartX = 0;
  let items = [],
    particles = [];
  let lastTime = 0,
    spawnTimer = 0,
    timerAcc = 0;
  let comboTimeout = null;
  let goodImgs = [],
    badImgs = [],
    logoImgs = [];
  let cartImg = new Image();
  cartImg.src = "Camioneta2.png";
  let goodSound = new Audio("efectos/bad.m4a");
  let badSound = new Audio("life.m4a");
  let wrongs = 0;
  let assetsLoaded = false;

  // ── KEYBOARD ─────────────────────────────────────────────────────────────────
  const keys = {};
  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(e.key))
      e.preventDefault();
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });

  // ── ELEMENTS ─────────────────────────────────────────────────────────────────
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

  // ── CANVAS SETUP ─────────────────────────────────────────────────────────────
  function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.offsetWidth || 420;
    const h = wrap.offsetHeight || 560;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.scale(dpr, dpr);
    cartX = w / 2 - CART_W / 2;
  }

  // ── ASSET PRELOAD ─────────────────────────────────────────────────────────────
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

  // ── DRAW BACKGROUND ───────────────────────────────────────────────────────────
  function drawBg() {
    const W = canvas.width / (window.devicePixelRatio || 1);
    const H = canvas.height / (window.devicePixelRatio || 1);
    ctx.fillStyle = LEVELS[currentLevelIndex].bg;
    ctx.fillRect(0, 0, W, H);
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

  // ── DRAW CART ─────────────────────────────────────────────────────────────────
  function drawCart() {
    const W = canvas.width / (window.devicePixelRatio || 1);
    const H = canvas.height / (window.devicePixelRatio || 1);
    const y = H - CART_H - 16;
    if (cartImg.complete && cartImg.naturalWidth) {
      const drawSize = CART_W + 100; // Mantiene el marco cuadrado 1:1
      ctx.drawImage(
        cartImg,
        cartX - 50,
        y - drawSize + CART_H + 20,
        drawSize,
        drawSize,
      );
    } else {
      ctx.save();
      ctx.shadowColor = "rgba(226,35,25,.5)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#000c36";
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(cartX, y, CART_W, CART_H, 10);
      } else {
        // Polyfill for Safari
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
      ctx.font = "bold 16px Outfit,sans-serif";
      ctx.fillStyle = "#e22319";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("UNE", cartX + CART_W / 2, y + CART_H / 2);
      const wr = 7,
        wy = y + CART_H + 2;
      [
        [cartX + 16, wy],
        [cartX + CART_W - 16, wy],
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

  // ── ITEMS ─────────────────────────────────────────────────────────────────────
  function spawnItem() {
    const W = canvas.width / (window.devicePixelRatio || 1);
    const r = Math.random();
    let isGood = false,
      isLogo = false;
    let pool;
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
      y: -ITEM_SIZE,
      isGood,
      isLogo,
      img,
      speed: LEVELS[currentLevelIndex].speed + Math.random() * 0.5,
      wobble: Math.random() * Math.PI * 2,
    });
  }

  function updateItems(dt) {
    const W = canvas.width / (window.devicePixelRatio || 1);
    const H = canvas.height / (window.devicePixelRatio || 1);
    items.forEach((it) => {
      it.wobble += 0.08;
      const dynSpeed = it.speed + Math.sin(it.wobble * 2) * 2.0;
      it.y += Math.max(0.5, dynSpeed) * (dt / 16.67);
      it.x += Math.sin(it.wobble) * 1.5;
      it.x = Math.max(ITEM_SIZE / 2, Math.min(W - ITEM_SIZE / 2, it.x));
    });
    // Circle-rect collision
    const cartY = H - CART_H - 16;
    items = items.filter((it) => {
      const cx = Math.max(cartX, Math.min(cartX + CART_W, it.x));
      const cy = Math.max(cartY, Math.min(cartY + CART_H, it.y));
      const dist = Math.sqrt((it.x - cx) ** 2 + (it.y - cy) ** 2);
      if (dist < HIT_RADIUS) {
        hit(it);
        return false;
      }
      if (it.y > H + 20) return false;
      return true;
    });
  }

  function drawItemImg(it) {
    const r = ITEM_SIZE / 2;
    ctx.save();
    const isBlinking = Math.floor(Date.now() / 150) % 2 === 0;
    ctx.globalAlpha = isBlinking ? 0.6 : 1.0;
    // Circular clip
    ctx.beginPath();
    ctx.arc(it.x, it.y, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (it.img && it.img.complete && it.img.naturalWidth) {
      ctx.drawImage(it.img, it.x - r, it.y - r, ITEM_SIZE, ITEM_SIZE);
    } else {
      ctx.fillStyle = it.isGood ? "#e22319" : "#ff9500";
      ctx.fillRect(it.x - r, it.y - r, ITEM_SIZE, ITEM_SIZE);
    }
    ctx.restore();
    // Ring border
    ctx.beginPath();
    ctx.arc(it.x, it.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = it.isGood ? "#e22319" : "#ff9500";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  function drawItems() {
    items.forEach(drawItemImg);
  }

  // ── HIT LOGIC ─────────────────────────────────────────────────────────────────
  function hit(it) {
    if (it.isGood) {
      if ("vibrate" in navigator) navigator.vibrate(100);
      try {
        goodSound.currentTime = 0;
        goodSound.play().catch((e) => {});
      } catch (e) {}
      combo++;
      let pts = combo >= 3 ? 20 : 10;
      if (it.isLogo) pts *= 2;
      score = Math.max(0, score + pts);
      spawnParticles(it.x, it.y, it.isLogo ? "#00ff00" : "#e22319");
      if (combo >= 3) showCombo();
    } else {
      score = Math.max(0, score - 15);
      combo = 0;
      spawnParticles(it.x, it.y, "#ff9500");
      wrongs++;
      try {
        badSound.currentTime = 0;
        badSound.play().catch((e) => {});
      } catch (e) {}
      const hudLives = document.getElementById("hudLives");
      if (hudLives) {
        hudLives.classList.remove("life-lost");
        void hudLives.offsetWidth;
        hudLives.classList.add("life-lost");
      }
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

  // ── PARTICLES ─────────────────────────────────────────────────────────────────
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
      p.vy += 0.15;
      p.alpha -= 0.03;
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

  // ── HUD ───────────────────────────────────────────────────────────────────────
  function updateHUD() {
    hudScore.textContent = score + " pts";
    const hudLives = document.getElementById("hudLives");
    if (hudLives) {
      const lives = 3 - wrongs;
      hudLives.textContent = "❤️".repeat(Math.max(0, lives));
    }
    hudRound.textContent = `Nivel: ${LEVELS[currentLevelIndex].label}`;
    const secs = Math.ceil(timer);
    hudTimer.textContent = secs + "s";
    hudTimer.className = "hud-timer" + (secs <= 10 ? " urgent" : "");
  }

  // ── GAME LOOP ─────────────────────────────────────────────────────────────────
  function loop(ts) {
    if (!gameRunning) return;
    if (isPaused) {
      lastTime = ts;
      requestAnimationFrame(loop);
      return;
    }
    const dt = lastTime ? Math.min(ts - lastTime, 50) : 16.67;
    lastTime = ts;
    const W = canvas.width / (window.devicePixelRatio || 1);

    // Keyboard movement
    if (keys["ArrowLeft"] || keys["a"] || keys["A"])
      cartX = Math.max(0, cartX - CART_SPEED * (dt / 16.67));
    if (keys["ArrowRight"] || keys["d"] || keys["D"])
      cartX = Math.min(W - CART_W, cartX + CART_SPEED * (dt / 16.67));

    timerAcc += dt;
    spawnTimer += dt;
    if (timerAcc >= 1000) {
      timerAcc -= 1000;
      timer = Math.max(0, timer - 1);
      updateHUD();
    }
    const activeSpawnInterval = Math.max(
      300,
      SPAWN_INTERVAL * LEVELS[currentLevelIndex].spawnFactor,
    );
    if (spawnTimer >= activeSpawnInterval) {
      spawnTimer -= activeSpawnInterval;
      spawnItem();
    }
    if (timer <= 0) {
      endGame();
      return;
    }
    drawBg();
    updateItems(dt);
    drawItems();
    updateDrawParticles(dt);
    drawCart();
    requestAnimationFrame(loop);
  }

  // ── START / END ───────────────────────────────────────────────────────────────
  function startGame() {
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
    scrStart.classList.add("hidden");
    scrGameOver.classList.add("hidden");
    scrPause.classList.add("hidden");
    hud.classList.remove("hidden");
    setupCanvas();
    updateHUD();
    requestAnimationFrame(loop);
  }

  function endGame() {
    gameRunning = false;
    hud.classList.add("hidden");
    comboToast.classList.remove("show");
    document.getElementById("fScore").value = score;
    document.getElementById("fRonda").value = currentLevelIndex + 1;
    let msg = "";
    if (score >= 300) msg = "🏆 ¡Increíble! Eres un crack de UNE.";
    else if (score >= 150) msg = "⭐ ¡Muy bien! Tienes ojo para los uniformes.";
    else if (score >= 60) msg = "👍 ¡Buen intento! Sigue practicando.";
    else msg = "💪 ¡La próxima lo haces mejor!";
    document.getElementById("goScore").textContent = score;
    document.getElementById("goMsg").textContent = msg;
    resetForm();
    scrGameOver.classList.remove("hidden");
    scrGameOver.scrollTop = 0;
  }

  function resetForm() {
    const f = document.getElementById("captureForm");
    const s = document.getElementById("scrSuccess");
    f.style.display = "";
    f.classList.remove("hidden");
    s.style.display = "none";
    s.classList.add("hidden");
    document.getElementById("formStatus").classList.add("hidden");
    document.getElementById("btnWa").style.display = "none";
    ["fNombre", "fApellidos", "fCorreo", "fTelefono", "fCarrera"].forEach(
      (id) => {
        const el = document.getElementById(id);
        el.value = "";
        el.classList.remove("invalid");
      },
    );
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

  // ── INPUT ─────────────────────────────────────────────────────────────────────
  canvas.addEventListener("mousemove", (e) => {
    if (!gameRunning) return;
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
      const b = wrap.getBoundingClientRect();
      const t = e.touches[0];
      cartX = Math.max(
        0,
        Math.min(t.clientX - b.left - CART_W / 2, b.width - CART_W),
      );
    },
    { passive: false },
  );

  // ── BUTTONS ───────────────────────────────────────────────────────────────────
  btnPlay.addEventListener("click", startGame);

  function togglePause() {
    if (!gameRunning) return;
    isPaused = !isPaused;
    if (isPaused) {
      scrPause.classList.remove("hidden");
    } else {
      scrPause.classList.add("hidden");
    }
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

  const levelBtns = document.querySelectorAll(".btn-level");
  levelBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      levelBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentLevelIndex = parseInt(btn.dataset.level);
    });
  });

  // ── NIVEL CONDITIONAL ─────────────────────────────────────────────────────────
  const fNivel = document.getElementById("fNivel");
  const slideCarrera = document.getElementById("slideCarrera");
  const BASIC_NIVELES = ["Secundaria", "Bachillerato"];
  fNivel.addEventListener("change", () => {
    const show = fNivel.value && !BASIC_NIVELES.includes(fNivel.value);
    slideCarrera.classList.toggle("visible", show);
    if (!show) document.getElementById("fCarrera").value = "";
    fNivel.classList.remove("invalid");
  });

  // ── SANITIZATION & VALIDATION ─────────────────────────────────────────────────
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
    const sn = sanitizeText(nombre.value),
      sa = sanitizeText(apellidos.value);
    const se = sanitizeEmail(correo.value),
      st = sanitizePhone(telefono.value);
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

  // ── FORM STATUS ───────────────────────────────────────────────────────────────
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

  // ── SUBMIT ────────────────────────────────────────────────────────────────────
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
    const btn = document.getElementById("btnSubmit");
    const btnTxt = document.getElementById("btnSubmitTxt");
    btn.disabled = true;
    btnTxt.innerHTML = '<span class="spinner"></span> Enviando...';
    hideMsg();
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

  // ── INIT ──────────────────────────────────────────────────────────────────────
  setupCanvas();
  preload();
  drawBg();
  window.addEventListener("resize", () => {
    if (!gameRunning) setupCanvas();
  });
})();
