"use strict";

/* ============================================================================
   ASTRAL VANGUARD — 16/32-BIT PIXEL ART SPACE EXPLORATION & COMBAT
   Architecture:
   1. Constants & Sector Definitions (6 distinct planets/scenarios)
   2. Pixel Art Sprite & Background Baker (Offscreen Canvas crisp pixel sprites)
   3. Adaptive Orchestral-Synth Web Audio Engine (6 music states + SFX)
   4. Entities (Player, Mothership, Projectiles, Enemies, Asteroids, Comets, Boss)
   5. Game Loop, Physics, Collision, Upgrades & HUD Synchronization
============================================================================ */

const CANVAS_W = 640;
const CANVAS_H = 360;

// ---------------------------------------------------------------------------
// 1. SECTOR DEFINITIONS (6 SCENARIOS)
// ---------------------------------------------------------------------------
const SECTORS = [
  {
    id: 1,
    name: "VELO CARMESÍ",
    type: "NEBULOSA PROFUNDA",
    duration: 42,
    skyTop: "#080518",
    skyBottom: "#1d0b2b",
    nebulaA: [165, 38, 115],
    nebulaB: [42, 118, 196],
    starTint: "#ffd9f2",
    planetType: "twin_suns",
    planetColorA: "#ff6b9d",
    planetColorB: "#5a2a82",
    hasStationBg: false,
    spawnInterval: 1.35,
    asteroidRate: 0.45,
    cometRate: 0.05,
    enemyMix: ["scout", "scout", "fighter"],
    comms: "Capitana Vance: 'Valkyrie-X7, entramos en la Nebulosa Velo Carmesí. Recolecta estrellas energéticas y neutraliza los drones exploradores.'"
  },
  {
    id: 2,
    name: "ANILLO DE HIERRO",
    type: "CAMPO DE ASTEROIDES",
    duration: 46,
    skyTop: "#0b0907",
    skyBottom: "#24170c",
    nebulaA: [176, 98, 34],
    nebulaB: [76, 54, 42],
    starTint: "#ffe7b8",
    planetType: "ringed_amber",
    planetColorA: "#d98a3c",
    planetColorB: "#6e3818",
    hasStationBg: false,
    spawnInterval: 1.05,
    asteroidRate: 0.72,
    cometRate: 0.08,
    enemyMix: ["scout", "fighter", "scout"],
    comms: "USS Astral Discovery: 'Densidad de asteroides crítica en el Anillo de Hierro. Usa el láser para fragmentar rocas ricas en cristales.'"
  },
  {
    id: 3,
    name: "TITÁN PRIME",
    type: "ÓRBITA DE PLANETA GIGANTE",
    duration: 48,
    skyTop: "#031018",
    skyBottom: "#082938",
    nebulaA: [36, 175, 168],
    nebulaB: [28, 76, 148],
    starTint: "#b8fff8",
    planetType: "gas_giant",
    planetColorA: "#2bc9b4",
    planetColorB: "#0f4e6b",
    hasStationBg: false,
    spawnInterval: 1.02,
    asteroidRate: 0.35,
    cometRate: 0.14,
    enemyMix: ["scout", "fighter", "gunship"],
    comms: "Sensores orbitales: 'Aproximación al gigante gaseoso Titán Prime. Detectamos patrullas interceptoras en la magnetosfera.'"
  },
  {
    id: 4,
    name: "ESTACIÓN ÓMICRON",
    type: "ESTACIÓN ESPACIAL ABANDONADA",
    duration: 50,
    skyTop: "#070b12",
    skyBottom: "#141e2e",
    nebulaA: [64, 98, 138],
    nebulaB: [168, 102, 42],
    starTint: "#cfe2ff",
    planetType: "moon_cratered",
    planetColorA: "#8c9eb8",
    planetColorB: "#344157",
    hasStationBg: true,
    spawnInterval: 0.98,
    asteroidRate: 0.25,
    cometRate: 0.05,
    enemyMix: ["turret", "fighter", "gunship", "turret"],
    comms: "Alerta de proximidad: 'Restos de la Estación Ómicron detectados. Torretas automatizadas aún activas entre los mamparos.'"
  },
  {
    id: 5,
    name: "CORREDOR ÍGNEO",
    type: "TORMENTA DE COMETAS",
    duration: 50,
    skyTop: "#140409",
    skyBottom: "#2b0c14",
    nebulaA: [224, 68, 42],
    nebulaB: [130, 32, 92],
    starTint: "#ffd1c4",
    planetType: "volcanic_world",
    planetColorA: "#ff5c33",
    planetColorB: "#4d1219",
    hasStationBg: false,
    spawnInterval: 0.85,
    asteroidRate: 0.38,
    cometRate: 0.42,
    enemyMix: ["fighter", "gunship", "scout"],
    comms: "Oficial de navegación: '¡Tormenta de cometas hiperveloz! Evita sus estelas térmicas y mantén los escudos cargados.'"
  },
  {
    id: 6,
    name: "DOMINIO ECLIPSE",
    type: "TERRITORIO HOSTIL · JEFE FINAL",
    duration: 40,
    skyTop: "#09030f",
    skyBottom: "#1e071c",
    nebulaA: [195, 28, 72],
    nebulaB: [62, 18, 112],
    starTint: "#ffbfd9",
    planetType: "dark_citadel",
    planetColorA: "#9e2452",
    planetColorB: "#250826",
    hasStationBg: true,
    spawnInterval: 0.78,
    asteroidRate: 0.22,
    cometRate: 0.16,
    enemyMix: ["fighter", "gunship", "turret", "gunship"],
    comms: "Alerta roja en el puente: 'Flota principal del Eclipse Negativo frente a nosotros. ¡El USS Astral Discovery te cubre, Valkyrie-X7!'"
  }
];

// ---------------------------------------------------------------------------
// 2. PIXEL ART SPRITE & BACKGROUND BAKER
// ---------------------------------------------------------------------------
function makeOffscreen(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = false;
  return { canvas: c, ctx: x };
}

function px(ctx, x, y, color, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawGridSprite(ctx, grid, palette, ox = 0, oy = 0) {
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch !== "." && palette[ch]) {
        ctx.fillStyle = palette[ch];
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }
}

const SpriteAtlas = {
  player: {},
  mothership: null,
  enemies: {},
  boss: null,
  asteroids: [],
  items: {},
  comet: null,

  init() {
    this.player.neutral = this.bakePlayerShip(0);
    this.player.up = this.bakePlayerShip(-1);
    this.player.down = this.bakePlayerShip(1);
    this.mothership = this.bakeMothership();
    this.enemies.scout = this.bakeEnemyScout();
    this.enemies.fighter = this.bakeEnemyFighter();
    this.enemies.gunship = this.bakeEnemyGunship();
    this.enemies.turret = this.bakeTurret();
    this.boss = this.bakeBoss();
    this.asteroids = [
      this.bakeAsteroid(34, 101),
      this.bakeAsteroid(22, 202),
      this.bakeAsteroid(14, 303)
    ];
    this.items.star = this.bakeStarItem();
    this.items.shield = this.bakeCellItem("#24d4ff", "#b8fbff", "#0c5678");
    this.items.repair = this.bakeCellItem("#38f294", "#c7ffe2", "#10663d");
    this.comet = this.bakeComet();
    this.bakeCommsPortrait();
  },

  bakePlayerShip(tilt) {
    // 36x22 intricate 32-bit pixel art fighter (Valkyrie-X7)
    const { canvas, ctx } = makeOffscreen(36, 22);
    const pal = {
      W: "#eef6ff", // bright titanium highlight
      L: "#b8cde6", // light armor
      M: "#6a87ad", // mid slate
      D: "#304463", // dark shadow
      O: "#182236", // deep panel line
      R: "#e03e5a", // crimson squadron stripe
      G: "#ffbe4f", // amber gold accent
      C: "#54f5ff", // glowing cyan canopy / core
      B: "#1888b8", // canopy shade
      E: "#9efffe"  // bright emitter tip
    };

    // Symmetric base with slight vertical compression/shift for banking tilt
    const gridNeutral = [
      "......RR............................",
      ".....RWWL...........................",
      "....RLLLLMM.........................",
      "....MLLLLLMMDDDD....................",
      "...DLLLWWLLMMMMMDD..................",
      "...OLLLLLLLLGGMMMMDD................",
      "..DDMMLLLLGGGGLLLLMMMDDDD...........",
      ".BBOMMMLLLLLLLLLLLLLLMMMMDDDD.......",
      ".CCOMMMWWWWWWWWWWWWWWLLLLLLMMMDDD...",
      "BBCOMMMWWWWWWWWCCBBWWLLLLLLLLLLMMMDD",
      "EECCMMMWWWWWWWCCCCCBWWWWWWLLLLLLLWWW",
      "BBCOMMMWWWWWWWWCCBBWWLLLLLLLLLLMMMDD",
      ".CCOMMMWWWWWWWWWWWWWWLLLLLLMMMDDD...",
      ".BBOMMMLLLLLLLLLLLLLLMMMMDDDD.......",
      "..DDMMLLLLGGGGLLLLMMMDDDD...........",
      "...OLLLLLLLLGGMMMMDD................",
      "...DLLLWWLLMMMMMDD..................",
      "....MLLLLLMMDDDD....................",
      "....RLLLLMM.........................",
      ".....RWWL...........................",
      "......RR............................",
      "...................................."
    ];

    drawGridSprite(ctx, gridNeutral, pal, 0, 0);

    // Add tilt shading illusion when climbing or diving
    if (tilt === -1) {
      px(ctx, 8, 3, "#ffffff", 6, 1);
      px(ctx, 10, 17, "#182236", 8, 1);
      px(ctx, 25, 9, "#ffffff", 4, 1);
    } else if (tilt === 1) {
      px(ctx, 8, 17, "#ffffff", 6, 1);
      px(ctx, 10, 3, "#182236", 8, 1);
      px(ctx, 25, 11, "#ffffff", 4, 1);
    }

    // Laser emitter tips on wings & nose
    px(ctx, 18, 4, "#4af2ff", 2, 1);
    px(ctx, 18, 16, "#4af2ff", 2, 1);
    px(ctx, 35, 10, "#ffffff", 1, 1);
    return canvas;
  },

  bakeMothership() {
    // 184x66 monumental USS Astral Discovery inspired exploration cruiser
    const { canvas, ctx } = makeOffscreen(184, 66);

    // Copper-titanium sleek saucer (right-front half) + angular hull + twin elongated nacelles
    // Nacelles (upper and lower trailing aft)
    const drawNacelle = (ny, flip) => {
      // Strut connecting engineering hull to nacelle
      for (let i = 0; i < 16; i++) {
        const sx = 66 + i;
        const sy = flip ? 35 + Math.floor(i * 0.75) : 28 - Math.floor(i * 0.75);
        px(ctx, sx, sy, "#596a82", 3, 2);
        px(ctx, sx, sy + (flip ? 1 : -1), "#8da0ba", 2, 1);
      }
      // Nacelle body
      px(ctx, 10, ny, "#2b3547", 72, 7);
      px(ctx, 12, ny + 1, "#6f829c", 68, 5);
      px(ctx, 14, ny + 1, "#c49b6c", 60, 2); // bronze-gold Discovery hull trim
      px(ctx, 14, ny + 3, "#3b495e", 62, 2);
      // Glowing cyan warp plasma strip
      px(ctx, 18, ny + 2, "#3ef0ff", 48, 2);
      px(ctx, 20, ny + 2, "#d4ffff", 40, 1);
      // Bussard collector prow (glowing amber-blue front cap)
      px(ctx, 79, ny + 1, "#ff9944", 4, 5);
      px(ctx, 81, ny + 2, "#ffe599", 3, 3);
      // Aft cap
      px(ctx, 7, ny + 2, "#1c2433", 4, 3);
      px(ctx, 8, ny + 3, "#4af2ff", 2, 1);
    };

    drawNacelle(6, false);
    drawNacelle(53, true);

    // Secondary triangular engineering hull
    for (let x = 38; x < 118; x++) {
      const t = (x - 38) / 80;
      const halfH = Math.round(3 + t * 9);
      px(ctx, x, 33 - halfH, "#2b364a", 1, halfH * 2);
      px(ctx, x, 33 - halfH + 1, "#8295b0", 1, Math.max(1, halfH - 1));
      px(ctx, x, 32, "#b58b5c", 1, 3); // warm copper centerline
      px(ctx, x, 33 + halfH - 2, "#42526b", 1, 2);
    }

    // Primary Saucer Section (layered rings + cutout spore-drive trench)
    const cx = 132;
    const cy = 33;
    const rx = 46;
    const ry = 17;
    for (let dy = -ry; dy <= ry; dy++) {
      for (let dx = -rx; dx <= rx; dx++) {
        const d = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
        if (d <= 1.0) {
          // Discovery signature concentric cutout gap!
          if (d > 0.36 && d < 0.50 && dx < 28) {
            if (d > 0.41 && d < 0.45) {
              px(ctx, cx + dx, cy + dy, "#3df2ff"); // glowing spore ring energy
            }
            continue;
          }
          let col = "#7a8da8";
          if (dy < -4) col = "#b7c7de";
          if (dy > 5) col = "#3b4a61";
          if (d > 0.88) col = "#c99c6b"; // copper outer rim bevel
          if (d > 0.94) col = "#253042"; // dark outer edge
          // Panel radial lines
          if ((dx + dy * 2) % 13 === 0 && d > 0.5) col = "#4e607a";
          px(ctx, cx + dx, cy + dy, col);
        }
      }
    }

    // Bridge dome & illuminated windows along saucer rim
    px(ctx, cx - 6, cy - 3, "#d7e7ff", 14, 6);
    px(ctx, cx - 4, cy - 2, "#ffffff", 8, 2);
    px(ctx, cx + 4, cy - 1, "#5ceeff", 4, 2);
    for (let wx = cx + 10; wx < cx + 40; wx += 4) {
      px(ctx, wx, cy - 1, "#9ef9ff", 2, 1);
      px(ctx, wx, cy + 1, "#ffd88a", 2, 1);
    }
    // Deflector glow dish at forward neck
    px(ctx, 114, 31, "#4af2ff", 4, 4);
    px(ctx, 116, 32, "#ffffff", 2, 2);
    // Impulse engines aft
    px(ctx, 36, 30, "#ff6842", 3, 6);
    px(ctx, 35, 31, "#ffe08a", 2, 4);

    return canvas;
  },

  bakeEnemyScout() {
    // 22x16 sharp crimson-obsidian interceptor
    const { canvas, ctx } = makeOffscreen(22, 16);
    const pal = {
      K: "#1c121e",
      D: "#4d192d",
      R: "#b82848",
      H: "#ff5475",
      M: "#6b7085",
      L: "#b2b9cc",
      O: "#ffaa33",
      Y: "#fff1a8"
    };
    const grid = [
      "........KKKK..........",
      "......KKRRRRKK........",
      ".....KRRHHHHMRK.......",
      "....KDRRMMMMMMKK......",
      "..KKDDRRLLLLLLDKK.....",
      ".KDDDDRROOYYOORDDK....",
      "KRRRRRLLOOOOOORRMMK...",
      "KHHHHLLLLYYYYLLRRMMKK.",
      "KRRRRRLLOOOOOORRMMK...",
      ".KDDDDRROOYYOORDDK....",
      "..KKDDRRLLLLLLDKK.....",
      "....KDRRMMMMMMKK......",
      ".....KRRHHHHMRK.......",
      "......KKRRRRKK........",
      "........KKKK..........",
      "......................"
    ];
    drawGridSprite(ctx, grid, pal, 0, 0);
    return canvas;
  },

  bakeEnemyFighter() {
    // 28x22 twin-prong heavy raider
    const { canvas, ctx } = makeOffscreen(28, 22);
    const pal = {
      K: "#141824",
      D: "#2b364f",
      M: "#4e6285",
      L: "#8fa6c9",
      H: "#c4d9f7",
      G: "#38f29b",
      W: "#d6ffea",
      R: "#d6365e"
    };
    const grid = [
      "..KKKKKKKKKK................",
      ".KHHLLLLMMMMKK..............",
      "KRRMMMMDDDDDDMKK............",
      ".KKKDDDDMMMMMMMDK...........",
      "....KKDDDMMMMMMMMKK.........",
      "......KKDDLLLLLLMMMK........",
      ".......KDDMMGGGGMMMDKK......",
      "......KDDMMGGWWGGMMMDDK.....",
      "....KKDDLLLLGGGGLLLLDDDK....",
      "...KHHLLLLMMGGGGMMLLLLDDK...",
      "..KRRRRRMMMMGGGGMMMMRRRRMK..",
      "...KHHLLLLMMGGGGMMLLLLDDK...",
      "....KKDDLLLLGGGGLLLLDDDK....",
      "......KDDMMGGWWGGMMMDDK.....",
      ".......KDDMMGGGGMMMDKK......",
      "......KKDDLLLLLLMMMK........",
      "....KKDDDMMMMMMMMKK.........",
      ".KKKDDDDMMMMMMMDK...........",
      "KRRMMMMDDDDDDMKK............",
      ".KHHLLLLMMMMKK..............",
      "..KKKKKKKKKK................",
      "............................"
    ];
    drawGridSprite(ctx, grid, pal, 0, 0);
    return canvas;
  },

  bakeEnemyGunship() {
    // 40x28 armored plasma corvette
    const { canvas, ctx } = makeOffscreen(40, 28);
    for (let y = 3; y < 25; y++) {
      for (let x = 2; x < 38; x++) {
        const dx = (x - 20) / 18;
        const dy = (y - 14) / 11;
        if (dx * dx * 0.85 + dy * dy <= 1) {
          let c = "#40495e";
          if (dy < -0.35) c = "#7e8ca8";
          if (dy > 0.4) c = "#232938";
          if (x % 6 === 0 && Math.abs(dy) < 0.7) c = "#2c3345";
          px(ctx, x, y, c);
        }
      }
    }
    // Armored nose ram + side wing pods
    px(ctx, 2, 10, "#b83254", 6, 8);
    px(ctx, 1, 12, "#ff5c7c", 3, 4);
    px(ctx, 14, 1, "#6b7a96", 14, 4);
    px(ctx, 14, 23, "#364054", 14, 4);
    // Glowing reactor & bridge
    px(ctx, 14, 11, "#ff9933", 10, 6);
    px(ctx, 16, 12, "#fff0a3", 6, 4);
    px(ctx, 35, 11, "#ff4769", 4, 6);
    return canvas;
  },

  bakeTurret() {
    // 24x24 derelict station automated turret
    const { canvas, ctx } = makeOffscreen(24, 24);
    px(ctx, 3, 4, "#242c3b", 18, 16);
    px(ctx, 5, 6, "#55647d", 14, 12);
    px(ctx, 7, 8, "#8c9eb8", 10, 8);
    // Armor bolts
    px(ctx, 4, 5, "#ffb84d", 2, 2);
    px(ctx, 18, 5, "#ffb84d", 2, 2);
    px(ctx, 4, 17, "#ffb84d", 2, 2);
    px(ctx, 18, 17, "#ffb84d", 2, 2);
    // Twin gun barrels pointing left
    px(ctx, 0, 8, "#aebdd4", 8, 3);
    px(ctx, 0, 13, "#aebdd4", 8, 3);
    px(ctx, 0, 9, "#ff5470", 2, 1);
    px(ctx, 0, 14, "#ff5470", 2, 1);
    // Central targeting sensor eye
    px(ctx, 10, 10, "#ff3b5c", 5, 4);
    px(ctx, 11, 11, "#ffe6eb", 2, 2);
    return canvas;
  },

  bakeBoss() {
    // 96x74 Dreadnought Boss "Eclipse Negativo"
    const { canvas, ctx } = makeOffscreen(96, 74);

    // Main jagged dreadnought silhouette
    for (let y = 4; y < 70; y++) {
      const distY = Math.abs(y - 37);
      const startX = Math.round(6 + distY * 0.55);
      const endX = Math.round(92 - distY * 0.25);
      for (let x = startX; x < endX; x++) {
        // Central jaw gap at front left
        if (x < 28 && distY < 7) continue;
        let col = "#35263d";
        if (y < 24) col = "#634973";
        if (y > 50) col = "#1d1424";
        if (x % 8 === 0 || y % 9 === 0) col = "#24192b";
        if (x < startX + 3) col = "#a6335b"; // crimson armored prow
        px(ctx, x, y, col);
      }
    }

    // Upper & lower wing cannons
    px(ctx, 16, 4, "#8a294d", 34, 8);
    px(ctx, 10, 6, "#ff4d79", 8, 4);
    px(ctx, 16, 62, "#591b33", 34, 8);
    px(ctx, 10, 64, "#ff4d79", 8, 4);

    // Glowing reactor core inside jaw
    for (let dy = -9; dy <= 9; dy++) {
      for (let dx = -9; dx <= 9; dx++) {
        const d = dx * dx + dy * dy;
        if (d <= 81) {
          let c = "#ff2e63";
          if (d < 40) c = "#ff8547";
          if (d < 14) c = "#fff3b8";
          px(ctx, 42 + dx, 37 + dy, c);
        }
      }
    }

    // Bridge spire & energy conduits
    px(ctx, 56, 20, "#8d74a3", 22, 34);
    px(ctx, 60, 24, "#4b385c", 14, 26);
    px(ctx, 64, 30, "#ff4775", 6, 14);
    px(ctx, 88, 22, "#ff7733", 6, 8);
    px(ctx, 88, 44, "#ff7733", 6, 8);
    return canvas;
  },

  bakeAsteroid(size, seed) {
    const { canvas, ctx } = makeOffscreen(size, size);
    const r = size * 0.45;
    const cx = size / 2;
    const cy = size / 2;

    const hash = (a, b) => {
      const n = Math.sin(a * 12.9898 + b * 78.233 + seed) * 43758.5453;
      return n - Math.floor(n);
    };

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const angle = Math.atan2(dy, dx);
        const wobble =
          0.84 +
          0.14 * Math.sin(angle * 3 + seed) +
          0.08 * Math.cos(angle * 5 - seed * 0.5);
        const dist = Math.hypot(dx, dy);
        if (dist <= r * wobble) {
          // Top-left rim lighting + crater dithering
          const light = (-dx - dy) / (r * 1.4);
          const n = hash(x, y);
          let col = "#635b54";
          if (light > 0.32) col = "#a69888";
          else if (light > 0.08) col = "#82766b";
          else if (light < -0.35) col = "#38322e";

          // Occasional mineral gold ore vein
          if (n > 0.93 && light > -0.1) col = "#d9a441";
          // Crater shadows
          if (dist < r * 0.55 && n < 0.18) col = "#423b36";
          // Dark pixel outline
          if (dist > r * wobble - 1.2) col = "#241f1c";
          px(ctx, x, y, col);
        }
      }
    }
    return canvas;
  },

  bakeStarItem() {
    const { canvas, ctx } = makeOffscreen(14, 14);
    const pal = {
      Y: "#ffe45e",
      W: "#ffffff",
      O: "#ff9d2e",
      C: "#6ef7ff"
    };
    const grid = [
      "......YY......",
      "......YY......",
      ".....YWWY.....",
      "....YWWWWY....",
      "..YYOWWWWOYY..",
      "YYYYOWWWWWOYYY",
      "YWWWWWWCWWWWWY",
      "YWWWWWWCWWWWWY",
      "YYYYOWWWWWOYYY",
      "..YYOWWWWOYY..",
      "....YWWWWY....",
      ".....YWWY.....",
      "......YY......",
      "......YY......"
    ];
    drawGridSprite(ctx, grid, pal, 0, 0);
    return canvas;
  },

  bakeCellItem(main, hi, dark) {
    const { canvas, ctx } = makeOffscreen(14, 14);
    px(ctx, 3, 2, dark, 8, 10);
    px(ctx, 4, 3, main, 6, 8);
    px(ctx, 5, 4, hi, 3, 4);
    px(ctx, 5, 1, "#c8d9ed", 4, 1);
    px(ctx, 5, 12, "#c8d9ed", 4, 1);
    return canvas;
  },

  bakeComet() {
    const { canvas, ctx } = makeOffscreen(26, 18);
    for (let y = 2; y < 16; y++) {
      for (let x = 2; x < 24; x++) {
        const dx = (x - 9) / 7;
        const dy = (y - 9) / 6;
        const d = dx * dx + dy * dy;
        if (d <= 1) {
          let c = "#ff6e3a";
          if (d < 0.55) c = "#ffbe4f";
          if (d < 0.22) c = "#ffffff";
          px(ctx, x, y, c);
        }
      }
    }
    // Tail sparks baked right on sprite
    px(ctx, 15, 5, "#ffaa44", 6, 2);
    px(ctx, 17, 9, "#ff6e3a", 8, 2);
    px(ctx, 15, 12, "#ffaa44", 5, 1);
    return canvas;
  },

  bakeCommsPortrait() {
    const c = document.getElementById("commsCanvas");
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#061124";
    ctx.fillRect(0, 0, 48, 48);
    // Grid lines
    ctx.fillStyle = "#0c2244";
    for (let i = 0; i < 48; i += 6) {
      ctx.fillRect(i, 0, 1, 48);
      ctx.fillRect(0, i, 48, 1);
    }
    // Mini USS Astral Discovery silhouette icon
    ctx.fillStyle = "#4af2ff";
    ctx.fillRect(22, 16, 18, 12);
    ctx.fillStyle = "#d8f8ff";
    ctx.fillRect(26, 19, 10, 6);
    ctx.fillStyle = "#ffb84d";
    ctx.fillRect(8, 12, 18, 3);
    ctx.fillRect(8, 30, 18, 3);
    ctx.fillStyle = "#91b6e3";
    ctx.fillRect(14, 21, 14, 3);
  }
};

// Bake seamless parallax background layers for each sector
function bakeSectorBackground(sector) {
  // 1. Dithered pixel nebula canvas (640x360 seamless)
  const neb = makeOffscreen(CANVAS_W, CANVAS_H);
  const ctx = neb.ctx;
  const [r1, g1, b1] = sector.nebulaA;
  const [r2, g2, b2] = sector.nebulaB;

  for (let y = 0; y < CANVAS_H; y += 2) {
    for (let x = 0; x < CANVAS_W; x += 2) {
      const nx = (x / CANVAS_W) * Math.PI * 2;
      const ny = (y / CANVAS_H) * Math.PI * 2;
      const v1 =
        Math.sin(nx * 2 + Math.cos(ny * 2 + sector.id)) * 0.5 +
        Math.cos(nx - ny + sector.id * 1.7) * 0.5;
      const v2 = Math.sin(nx * 3 - ny * 2 + sector.id * 0.9);
      const intensity = Math.max(0, (v1 + 0.35) * 0.55);
      if (intensity > 0.18) {
        // Ordered 2x2 Bayer pixel dithering effect
        const dither = ((x >> 1) + (y >> 1)) % 2 === 0 ? 1 : 0.65;
        const mix = (v2 + 1) * 0.5;
        const r = Math.round(r1 * mix + r2 * (1 - mix));
        const g = Math.round(g1 * mix + g2 * (1 - mix));
        const b = Math.round(b1 * mix + b2 * (1 - mix));
        const alpha = Math.min(0.45, intensity * 0.42 * dither);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  // 2. Distant Planet / Celestial Body Sprite
  const pSize = 180;
  const planet = makeOffscreen(pSize, pSize);
  const pctx = planet.ctx;
  const cx = pSize / 2;
  const cy = pSize / 2;
  const rad = 58;

  for (let y = 0; y < pSize; y++) {
    for (let x = 0; x < pSize; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (d <= rad) {
        // Light source from upper-left
        const shade = (-dx * 0.65 - dy * 0.55) / rad;
        const rim = d > rad - 2.5 && shade > -0.2;
        let col = sector.planetColorB;
        if (shade > 0.15) col = sector.planetColorA;
        if (sector.planetType === "gas_giant" && Math.sin(dy * 0.35 + dx * 0.04) > 0.2 && shade > -0.25) {
          col = "#9af5eb";
        }
        if (sector.planetType === "moon_cratered" && ((x * 7 + y * 13) % 47 === 0) && shade > -0.1) {
          col = "#283245";
        }
        if (sector.planetType === "volcanic_world" && Math.sin(dx * 0.2) * Math.cos(dy * 0.22) > 0.55) {
          col = "#ffbe3b";
        }
        if (shade < -0.35) col = "#090c17";
        if (rim) col = "#e0f7ff";
        px(pctx, x, y, col);
      }
    }
  }

  // Planetary rings for ringed_amber or dark_citadel
  if (sector.planetType === "ringed_amber" || sector.planetType === "dark_citadel") {
    for (let a = 0; a < Math.PI * 2; a += 0.015) {
      const rx = Math.cos(a) * 86;
      const ry = Math.sin(a) * 20;
      const rotX = rx * 0.92 - ry * 0.38;
      const rotY = rx * 0.38 + ry * 0.92;
      if (Math.sin(a) > 0 || Math.hypot(rotX, rotY) > rad) {
        px(pctx, cx + rotX, cy + rotY, sector.planetType === "ringed_amber" ? "#ffd28a" : "#d9467a", 2, 1);
      }
    }
  }

  // 3. Abandoned Space Station Midground Silhouette (640x160 tile)
  let stationLayer = null;
  if (sector.hasStationBg) {
    const st = makeOffscreen(640, 180);
    const sctx = st.ctx;
    // Giant skeletal girders, solar arrays, docking rings
    sctx.fillStyle = "#162030";
    sctx.fillRect(0, 86, 640, 8);
    sctx.fillRect(110, 30, 14, 120);
    sctx.fillRect(390, 20, 18, 140);
    // Truss diagonals
    for (let x = 0; x < 640; x += 24) {
      sctx.fillStyle = "#223047";
      sctx.fillRect(x, 78, 12, 4);
      sctx.fillRect(x + 12, 96, 12, 4);
      // Warning beacons
      if (x % 96 === 0) {
        sctx.fillStyle = "#ff4769";
        sctx.fillRect(x + 4, 75, 3, 3);
      }
    }
    // Broken solar wing panels
    sctx.fillStyle = "#1a2b4a";
    sctx.fillRect(92, 18, 50, 24);
    sctx.fillRect(364, 12, 70, 28);
    sctx.fillStyle = "#2c4673";
    for (let sx = 96; sx < 140; sx += 8) sctx.fillRect(sx, 20, 5, 20);
    for (let sx = 368; sx < 432; sx += 8) sctx.fillRect(sx, 14, 5, 24);
    stationLayer = st.canvas;
  }

  return {
    nebula: neb.canvas,
    planet: planet.canvas,
    station: stationLayer
  };
}

// ---------------------------------------------------------------------------
// 3. ADAPTIVE ORCHESTRAL + SYNTH WEB AUDIO ENGINE
// ---------------------------------------------------------------------------
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.reverbNode = null;
    this.musicVolume = 0.65;
    this.sfxVolume = 0.75;
    this.muted = false;
    this.musicPaused = false;

    this.currentState = "MENU"; // MENU | EXPLORATION | COMBAT | BOSS | VICTORY | GAMEOVER
    this.isRunning = false;
    this.stepIndex = 0;
    this.schedulerTimer = null;
    this.nextNoteTime = 0;

    // Continuous engine hum nodes
    this.thrusterGain = null;
    this.thrusterOsc = null;
  }

  initOnUserGesture() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 6;

      this.masterGain = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();

      this.reverbNode = this.createSpaceReverb(2.1, 2.4);
      const reverbWet = this.ctx.createGain();
      reverbWet.gain.value = 0.34;

      this.musicBus.connect(comp);
      this.musicBus.connect(this.reverbNode);
      this.reverbNode.connect(reverbWet);
      reverbWet.connect(comp);

      this.sfxBus.connect(comp);
      comp.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.initThrusterHum();
      this.applyVolumes();
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    if (!this.isRunning) {
      this.isRunning = true;
      this.setState(this.currentState, true);
    }
  }

  createSpaceReverb(duration, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * duration);
    const impulse = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    const conv = this.ctx.createConvolver();
    conv.buffer = impulse;
    return conv;
  }

  initThrusterHum() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.value = 58;
    filter.type = "lowpass";
    filter.frequency.value = 140;
    gain.gain.value = 0;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    osc.start();

    this.thrusterOsc = osc;
    this.thrusterGain = gain;
  }

  updateThruster(speedRatio, active) {
    if (!this.ctx || !this.thrusterGain || !this.thrusterOsc) return;
    const now = this.ctx.currentTime;
    const targetGain = active && !this.muted ? 0.025 + speedRatio * 0.045 : 0;
    const targetFreq = 54 + speedRatio * 34;
    this.thrusterGain.gain.setTargetAtTime(targetGain, now, 0.08);
    this.thrusterOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
  }

  applyVolumes() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, now, 0.04);
    this.musicBus.gain.setTargetAtTime(this.musicPaused ? 0 : this.musicVolume * 0.65, now, 0.08);
    this.sfxBus.gain.setTargetAtTime(this.sfxVolume * 0.85, now, 0.04);
  }

  setMusicVolume(val) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    this.applyVolumes();
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    this.applyVolumes();
  }

  toggleMute() {
    this.muted = !this.muted;
    this.applyVolumes();
    return this.muted;
  }

  toggleMusicPause() {
    this.musicPaused = !this.musicPaused;
    this.applyVolumes();
    return this.musicPaused;
  }

  setMusicPaused(paused) {
    this.musicPaused = paused;
    this.applyVolumes();
  }

  // Ensures ONLY one music state scheduler runs at any time
  setState(newState, force = false) {
    if (this.currentState === newState && !force) return;
    this.currentState = newState;

    const labelEl = document.getElementById("hud-music-state");
    if (labelEl) {
      const names = {
        MENU: "MENÚ",
        EXPLORATION: "EXPLORACIÓN",
        COMBAT: "COMBATE",
        BOSS: "JEFE FINAL",
        VICTORY: "VICTORIA",
        GAMEOVER: "DERROTA"
      };
      labelEl.textContent = names[newState] || newState;
    }

    if (!this.ctx || !this.isRunning) return;

    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }

    // Smooth brief fade-duck to prevent clicks or overlap when switching themes
    const now = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setTargetAtTime(0.001, now, 0.06);
    if (!this.musicPaused && !this.muted) {
      this.musicBus.gain.setTargetAtTime(this.musicVolume * 0.65, now + 0.14, 0.18);
    }

    this.stepIndex = 0;
    this.nextNoteTime = now + 0.12;
    this.schedulerTimer = setInterval(() => this.scheduleLoop(), 45);
  }

  midiToFreq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  // Orchestral & Synth Voices
  playStringChord(time, notes, dur, vol = 0.08) {
    for (const m of notes) {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();

      osc1.type = "sawtooth";
      osc2.type = "triangle";
      osc1.frequency.setValueAtTime(this.midiToFreq(m), time);
      osc2.frequency.setValueAtTime(this.midiToFreq(m) * 1.004, time);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(650, time);
      filter.frequency.linearRampToValueAtTime(1700, time + dur * 0.45);
      filter.frequency.linearRampToValueAtTime(800, time + dur);

      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(vol, time + Math.min(0.28, dur * 0.3));
      g.gain.setValueAtTime(vol * 0.85, time + dur * 0.72);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(g);
      g.connect(this.musicBus);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + dur + 0.05);
      osc2.stop(time + dur + 0.05);
    }
  }

  playBrassNote(time, midi, dur, vol = 0.11) {
    const osc = this.ctx.createOscillator();
    const oscSub = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();

    const f = this.midiToFreq(midi);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(f, time);
    oscSub.type = "sawtooth";
    oscSub.frequency.setValueAtTime(f * 0.5, time);

    filter.type = "lowpass";
    filter.Q.value = 3.2;
    filter.frequency.setValueAtTime(320, time);
    filter.frequency.exponentialRampToValueAtTime(2400, time + 0.08);
    filter.frequency.exponentialRampToValueAtTime(950, time + dur);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.045);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(filter);
    oscSub.connect(filter);
    filter.connect(g);
    g.connect(this.musicBus);

    osc.start(time);
    oscSub.start(time);
    osc.stop(time + dur + 0.05);
    oscSub.stop(time + dur + 0.05);
  }

  playSynthArp(time, midi, dur, vol = 0.065) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(this.midiToFreq(midi), time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2200, time);
    filter.frequency.exponentialRampToValueAtTime(520, time + dur);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + dur + 0.03);
  }

  playDeepDrum(time, accent = false) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(accent ? 125 : 95, time);
    osc.frequency.exponentialRampToValueAtTime(34, time + 0.22);

    g.gain.setValueAtTime(accent ? 0.28 : 0.19, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);

    osc.connect(g);
    g.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + 0.28);
  }

  playSnarePulse(time, vol = 0.08) {
    const len = Math.floor(this.ctx.sampleRate * 0.11);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.musicBus);
    src.start(time);
  }

  scheduleLoop() {
    if (!this.ctx || this.musicPaused) return;
    const now = this.ctx.currentTime;
    if (this.nextNoteTime < now - 0.1) {
      this.nextNoteTime = now + 0.04;
    }
    const lookahead = 0.18;
    while (this.nextNoteTime < now + lookahead) {
      const stepDur = this.triggerThemeStep(this.stepIndex, this.nextNoteTime);
      this.nextNoteTime += stepDur;
      this.stepIndex = (this.stepIndex + 1) % 32;
    }
  }

  triggerThemeStep(step, t) {
    switch (this.currentState) {
      case "MENU": {
        // Mysterious & epic space choir/strings in D minor -> Bbmaj7 -> C
        const stepDur = 0.28;
        if (step % 8 === 0) {
          const chords = [
            [50, 57, 62, 65], // Dm
            [46, 53, 62, 65], // Bbmaj7
            [48, 55, 60, 64], // C
            [45, 52, 61, 64]  // A7sus/A
          ];
          this.playStringChord(t, chords[Math.floor(step / 8)], stepDur * 7.8, 0.065);
        }
        const lead = [62, 0, 69, 65, 62, 0, 74, 0, 70, 0, 69, 65, 64, 0, 69, 0];
        const m = lead[step % 16];
        if (m) this.playBrassNote(t, m, stepDur * 1.8, 0.06);
        if (step % 2 === 0) this.playSynthArp(t, 50 + ((step * 3) % 12), stepDur * 0.9, 0.03);
        return stepDur;
      }

      case "EXPLORATION": {
        // Wonder & intergalactic adventure (112 BPM 8ths)
        const stepDur = 0.26;
        if (step % 8 === 0) {
          const chords = [
            [48, 55, 60, 64], // Cmaj
            [43, 50, 59, 62], // G
            [45, 52, 60, 64], // Am
            [41, 48, 57, 60]  // Fmaj7
          ];
          this.playStringChord(t, chords[Math.floor(step / 8)], stepDur * 7.8, 0.06);
        }
        const arp = [60, 64, 67, 72, 67, 64, 59, 67, 60, 64, 69, 72, 65, 69, 72, 76];
        this.playSynthArp(t, arp[step % 16], stepDur * 0.85, 0.042);
        if (step % 8 === 0) this.playDeepDrum(t, false);
        if (step === 0 || step === 16) this.playBrassNote(t, step === 0 ? 72 : 69, stepDur * 3.5, 0.065);
        return stepDur;
      }

      case "COMBAT": {
        // Intense heroic star-battle theme (142 BPM 16ths/8ths)
        const stepDur = 0.21;
        if (step % 8 === 0) {
          const chords = [
            [45, 52, 57, 60], // Am
            [41, 48, 53, 57], // F
            [43, 50, 55, 59], // G
            [40, 47, 52, 56]  // E
          ];
          this.playStringChord(t, chords[Math.floor(step / 8)], stepDur * 7.2, 0.075);
        }
        // Driving bass ostinato
        const bass = [33, 33, 45, 33, 33, 33, 40, 43];
        this.playSynthArp(t, bass[step % 8], stepDur * 0.75, 0.085);
        // Heroic brass fanfare motif
        const brass = [69, 0, 72, 76, 0, 74, 72, 69, 65, 0, 69, 72, 71, 0, 67, 64];
        if (brass[step % 16]) this.playBrassNote(t, brass[step % 16], stepDur * 1.4, 0.11);
        if (step % 4 === 0) this.playDeepDrum(t, step % 8 === 0);
        if (step % 4 === 2) this.playSnarePulse(t, 0.075);
        return stepDur;
      }

      case "BOSS": {
        // Dramatic orchestral boss battle (154 BPM)
        const stepDur = 0.185;
        if (step % 8 === 0) {
          const chords = [
            [38, 45, 50, 53], // Dm
            [37, 44, 49, 52], // C#dim/C#
            [38, 45, 50, 55], // Dsus4
            [34, 41, 46, 52]  // Bb+
          ];
          this.playStringChord(t, chords[Math.floor(step / 8)], stepDur * 7.5, 0.085);
        }
        const ost = [38, 50, 38, 50, 41, 53, 40, 52];
        this.playSynthArp(t, ost[step % 8], stepDur * 0.8, 0.09);
        const horn = [62, 62, 0, 65, 69, 0, 68, 67, 62, 0, 74, 73, 70, 69, 65, 64];
        if (horn[step % 16]) this.playBrassNote(t, horn[step % 16], stepDur * 1.5, 0.13);
        if (step % 2 === 0) this.playDeepDrum(t, step % 4 === 0);
        if (step % 4 === 2) this.playSnarePulse(t, 0.1);
        return stepDur;
      }

      case "VICTORY": {
        // Triumphant heroic Star-Wars style major fanfare
        const stepDur = 0.24;
        if (step % 8 === 0) {
          const chords = [
            [48, 55, 60, 64], // C
            [41, 48, 53, 57], // F
            [43, 50, 55, 59], // G
            [48, 55, 60, 67]  // C5
          ];
          this.playStringChord(t, chords[Math.floor(step / 8)], stepDur * 7.8, 0.085);
        }
        const fanfare = [60, 0, 67, 0, 65, 64, 62, 72, 0, 67, 0, 65, 64, 62, 72, 0];
        if (fanfare[step % 16]) this.playBrassNote(t, fanfare[step % 16], stepDur * 1.8, 0.12);
        if (step % 4 === 0) this.playDeepDrum(t, step % 8 === 0);
        return stepDur;
      }

      case "GAMEOVER":
      default: {
        // Melancholic, slow atmospheric space elegy
        const stepDur = 0.36;
        if (step % 8 === 0) {
          const chords = [
            [45, 52, 57, 60], // Am
            [41, 48, 53, 56], // Fm
            [40, 47, 52, 55], // Em
            [38, 45, 50, 53]  // Dm
          ];
          this.playStringChord(t, chords[Math.floor(step / 8)], stepDur * 7.8, 0.065);
        }
        const bell = [69, 0, 0, 64, 65, 0, 0, 60, 64, 0, 0, 59, 57, 0, 0, 0];
        if (bell[step % 16]) this.playSynthArp(t, bell[step % 16], stepDur * 2.2, 0.045);
        return stepDur;
      }
    }
  }

  // ---- Sound Effects ----
  playLaser(tier = 1) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = tier >= 3 ? "sawtooth" : "triangle";
    const startF = 1150 + Math.random() * 140 + tier * 60;
    osc.frequency.setValueAtTime(startF, t);
    osc.frequency.exponentialRampToValueAtTime(190, t + 0.13);

    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playExplosion(scale = 1) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const dur = 0.25 + scale * 0.22;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5);
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(750 + scale * 200, t);
    filter.frequency.exponentialRampToValueAtTime(85, t + dur);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(Math.min(0.4, 0.2 * scale), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxBus);
    src.start(t);

    // Sub punch
    const sub = this.ctx.createOscillator();
    const sg = this.ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(110, t);
    sub.frequency.exponentialRampToValueAtTime(32, t + dur * 0.8);
    sg.gain.setValueAtTime(0.22 * scale, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.85);
    sub.connect(sg);
    sg.connect(this.sfxBus);
    sub.start(t);
    sub.stop(t + dur * 0.9);
  }

  playShieldHit() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(780, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.16);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  playHullDamage() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(185, t);
    osc.frequency.linearRampToValueAtTime(75, t + 0.24);
    g.gain.setValueAtTime(0.26, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  playPickup(kind = "star") {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const notes = kind === "star" ? [880, 1175, 1568] : [660, 990, 1320];
    notes.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, t + idx * 0.045);
      g.gain.setValueAtTime(0.11, t + idx * 0.045);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.045 + 0.16);
      osc.connect(g);
      g.connect(this.sfxBus);
      osc.start(t + idx * 0.045);
      osc.stop(t + idx * 0.045 + 0.18);
    });
  }

  playStationBeacon() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(490, t + 0.55);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    osc.connect(g);
    g.connect(this.reverbNode || this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.68);
  }
}

// ---------------------------------------------------------------------------
// 4. GAME ENGINE & ENTITIES
// ---------------------------------------------------------------------------
const audio = new AudioEngine();
SpriteAtlas.init();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const sectorBackgrounds = SECTORS.map(bakeSectorBackground);

const UPGRADE_CATALOG = [
  {
    id: "weapon",
    title: "Cañones Láser",
    desc: "Aumenta la potencia, cadencia y haz múltiple del sistema láser.",
    max: 4,
    costBase: 8,
    costStep: 7
  },
  {
    id: "shield",
    title: "Escudo Deflector",
    desc: "Mayor capacidad energética del escudo y recarga más rápida.",
    max: 4,
    costBase: 7,
    costStep: 6
  },
  {
    id: "engine",
    title: "Propulsores de Ión",
    desc: "Mejora la aceleración, agilidad y velocidad máxima de vuelo.",
    max: 4,
    costBase: 6,
    costStep: 5
  },
  {
    id: "hull",
    title: "Blindaje y Reparación",
    desc: "Repara 100% del casco y otorga +1 vida de reserva para la misión.",
    max: 4,
    costBase: 9,
    costStep: 6
  }
];

const state = {
  mode: "MENU", // MENU | PLAYING | PAUSED | UPGRADE | VICTORY | GAMEOVER
  score: 0,
  stars: 0,
  sectorIdx: 0,
  sectorTime: 0,
  cameraScroll: 0,
  shake: 0,
  beaconTimer: 0,
  spawnTimer: 0,
  stationSpawnedTimer: 0,
  commsTimer: 0,
  boss: null,

  upgrades: {
    weapon: 1,
    shield: 1,
    engine: 1,
    hull: 1
  },

  player: {
    x: 90,
    y: 180,
    vx: 0,
    vy: 0,
    w: 36,
    h: 22,
    lives: 3,
    maxLives: 3,
    shield: 100,
    maxShield: 100,
    shieldDelay: 0,
    hull: 100,
    maxHull: 100,
    invuln: 0,
    fireCooldown: 0,
    tilt: 0 // -1 up, 0 neutral, 1 down
  },

  mothershipBg: {
    x: 70,
    y: 54,
    bobPhase: 0
  },

  bullets: [],
  enemyBullets: [],
  enemies: [],
  asteroids: [],
  comets: [],
  items: [],
  particles: [],
  bgStars: []
};

// Initialize multi-layer parallax starfield
for (let i = 0; i < 110; i++) {
  state.bgStars.push({
    x: Math.random() * CANVAS_W,
    y: Math.random() * CANVAS_H,
    layer: i < 45 ? 1 : i < 85 ? 2 : 3,
    size: i < 75 ? 1 : 2,
    twinkle: Math.random() * Math.PI * 2
  });
}

// Input state (W, A, D, Z + Right Click)
const keys = new Set();
let rightMouseDown = false;

window.addEventListener("keydown", (e) => {
  const code = e.code;
  if (["KeyW", "KeyA", "KeyD", "KeyZ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) {
    keys.add(code);
  }
  if (code === "KeyP" || code === "Escape") {
    if (state.mode === "PLAYING") pauseGame();
    else if (state.mode === "PAUSED") resumeGame();
  }
  if (code === "KeyM") {
    handleToggleMute();
  }
  audio.initOnUserGesture();
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

window.addEventListener("blur", () => {
  keys.clear();
  rightMouseDown = false;
});

// Prevent browser context menu on right-click everywhere inside game
document.addEventListener("contextmenu", (e) => e.preventDefault());

canvas.addEventListener("mousedown", (e) => {
  audio.initOnUserGesture();
  if (e.button === 2) {
    e.preventDefault();
    rightMouseDown = true;
  }
});

window.addEventListener("mouseup", (e) => {
  if (e.button === 2) rightMouseDown = false;
});

// ---------------------------------------------------------------------------
// 5. UI & OVERLAY CONTROLS
// ---------------------------------------------------------------------------
const overlays = {
  menu: document.getElementById("overlay-menu"),
  pause: document.getElementById("overlay-pause"),
  upgrade: document.getElementById("overlay-upgrade"),
  end: document.getElementById("overlay-end")
};

function showOverlay(name) {
  Object.entries(overlays).forEach(([k, el]) => {
    el.classList.toggle("active", k === name);
  });
}

function showComms(text, duration = 6.5) {
  const banner = document.getElementById("comms-banner");
  const txt = document.getElementById("comms-text");
  txt.textContent = text;
  banner.classList.remove("hidden");
  state.commsTimer = duration;
}

function hideComms() {
  document.getElementById("comms-banner").classList.add("hidden");
}

function updateHUD() {
  const p = state.player;
  const sec = SECTORS[state.sectorIdx];

  document.getElementById("hud-score").textContent = String(Math.floor(state.score)).padStart(6, "0");
  document.getElementById("hud-stars").textContent = `★ ${state.stars}`;
  document.getElementById("hud-level").textContent = `${String(sec.id).padStart(2, "0")} · ${sec.name}`;

  const progress = state.boss
    ? Math.max(0, (1 - state.boss.hp / state.boss.maxHp) * 100)
    : Math.min(100, (state.sectorTime / sec.duration) * 100);
  document.getElementById("hud-sector-progress").style.width = `${progress.toFixed(1)}%`;

  const shieldPct = Math.max(0, Math.round((p.shield / p.maxShield) * 100));
  const hullPct = Math.max(0, Math.round((p.hull / p.maxHull) * 100));
  document.getElementById("hud-shield-pct").textContent = `${shieldPct}%`;
  document.getElementById("hud-shield-fill").style.width = `${shieldPct}%`;
  document.getElementById("hud-hull-pct").textContent = `${hullPct}%`;
  document.getElementById("hud-hull-fill").style.width = `${hullPct}%`;

  // Lives pips
  const livesEl = document.getElementById("hud-lives");
  livesEl.innerHTML = "";
  for (let i = 0; i < p.maxLives; i++) {
    const pip = document.createElement("span");
    pip.className = i < p.lives ? "life-pip" : "life-pip lost";
    livesEl.appendChild(pip);
  }

  // Ship Status Pill
  const statusEl = document.getElementById("hud-ship-status");
  statusEl.className = "status-pill ";
  if (hullPct <= 30) {
    statusEl.textContent = "CRÍTICO";
    statusEl.classList.add("status-critical");
  } else if (p.shield <= 5) {
    statusEl.textContent = "ESCUDO CAÍDO";
    statusEl.classList.add("status-noshield");
  } else if (hullPct < 75 || shieldPct < 40) {
    statusEl.textContent = "PRECAUCIÓN";
    statusEl.classList.add("status-caution");
  } else {
    statusEl.textContent = "ÓPTIMO";
    statusEl.classList.add("status-optimal");
  }

  const roman = ["I", "II", "III", "IV"];
  document.getElementById("hud-weapon-tier").textContent = `LÁSER MK-${roman[state.upgrades.weapon - 1]}`;
  document.getElementById("hud-engine-tier").textContent = `IÓN-${roman[state.upgrades.engine - 1]}`;
}

function startNewGame() {
  audio.initOnUserGesture();
  state.score = 0;
  state.stars = 0;
  state.sectorIdx = 0;
  state.upgrades = { weapon: 1, shield: 1, engine: 1, hull: 1 };

  const p = state.player;
  p.lives = 3;
  p.maxLives = 3;
  p.maxShield = 100;
  p.shield = 100;
  p.maxHull = 100;
  p.hull = 100;
  p.invuln = 1.2;

  beginSector(0);
}

function beginSector(idx) {
  state.sectorIdx = idx;
  state.sectorTime = 0;
  state.spawnTimer = 1.1;
  state.beaconTimer = 3.5;
  state.boss = null;
  state.bullets.length = 0;
  state.enemyBullets.length = 0;
  state.enemies.length = 0;
  state.asteroids.length = 0;
  state.comets.length = 0;
  state.items.length = 0;
  state.particles.length = 0;

  const p = state.player;
  p.x = 88;
  p.y = CANVAS_H / 2 - p.h / 2;
  p.vx = 0;
  p.vy = 0;
  p.shield = p.maxShield;
  p.invuln = 1.5;

  state.mothershipBg.x = 76;
  state.mothershipBg.y = 48;

  state.mode = "PLAYING";
  showOverlay(null);
  showComms(SECTORS[idx].comms, 7);

  audio.setMusicPaused(false);
  audio.setState("EXPLORATION");
  updateHUD();
}

function pauseGame() {
  if (state.mode !== "PLAYING") return;
  state.mode = "PAUSED";
  const sec = SECTORS[state.sectorIdx];
  document.getElementById("pause-sector-info").textContent = `Sector ${sec.id}: ${sec.name} — ${sec.type}`;
  showOverlay("pause");
  audio.setMusicPaused(true);
  audio.updateThruster(0, false);
}

function resumeGame() {
  if (state.mode !== "PAUSED") return;
  state.mode = "PLAYING";
  showOverlay(null);
  audio.setMusicPaused(false);
}

function openUpgradeBay() {
  state.mode = "UPGRADE";
  audio.updateThruster(0, false);
  audio.setState("EXPLORATION");

  const nextSec = SECTORS[state.sectorIdx + 1];
  document.getElementById("upgrade-subtitle").textContent =
    `Sector ${state.sectorIdx + 1} despejado. Próximo salto: ${nextSec.name} (${nextSec.type}).`;
  renderUpgradeCards();
  showOverlay("upgrade");
}

function renderUpgradeCards() {
  document.getElementById("upgrade-stars-val").textContent = `★ ${state.stars}`;
  const grid = document.getElementById("upgrade-grid");
  grid.innerHTML = "";

  for (const u of UPGRADE_CATALOG) {
    const lvl = state.upgrades[u.id];
    const maxed = lvl >= u.max;
    const cost = u.costBase + (lvl - 1) * u.costStep;

    const card = document.createElement("div");
    card.className = "upgrade-item";
    card.innerHTML = `
      <div>
        <h3>${u.title}</h3>
        <p>${u.desc}</p>
      </div>
      <div>
        <div class="upg-meta">
          <span class="cyan">NIVEL ${lvl}/${u.max}</span>
          <span class="gold">${maxed ? "MÁXIMO" : `★ ${cost}`}</span>
        </div>
        <button class="upgrade-btn" ${maxed || state.stars < cost ? "disabled" : ""}>
          ${maxed ? "SISTEMA AL MÁXIMO" : "MEJORAR SISTEMA"}
        </button>
      </div>
    `;

    const btn = card.querySelector("button");
    btn.addEventListener("click", () => {
      if (maxed || state.stars < cost) return;
      state.stars -= cost;
      state.upgrades[u.id] += 1;
      applyUpgradeEffects(u.id);
      audio.playPickup("cell");
      renderUpgradeCards();
      updateHUD();
    });

    grid.appendChild(card);
  }
}

function applyUpgradeEffects(id) {
  const p = state.player;
  if (id === "shield") {
    p.maxShield += 35;
    p.shield = p.maxShield;
  } else if (id === "hull") {
    p.maxHull += 25;
    p.hull = p.maxHull;
    p.maxLives = Math.min(5, p.maxLives + 1);
    p.lives = Math.min(p.maxLives, p.lives + 1);
  }
}

function triggerEndScreen(victory) {
  state.mode = victory ? "VICTORY" : "GAMEOVER";
  audio.updateThruster(0, false);
  audio.setState(victory ? "VICTORY" : "GAMEOVER");
  hideComms();

  document.getElementById("end-eyebrow").textContent = victory
    ? "MISIÓN CUMPLIDA · FLOTA A SALVO"
    : "SEÑAL PERDIDA EN EL ESPACIO PROFUNDO";
  document.getElementById("end-title").textContent = victory
    ? "¡VICTORIA GALÁCTICA!"
    : "NAVE DESTRUIDA";
  document.getElementById("end-summary").textContent = victory
    ? "Has derrotado al acorazado Eclipse Negativo y asegurado la ruta estelar para el USS Astral Discovery."
    : "La Valkyrie-X7 ha caído en combate. La nave nodriza aguarda tu próximo lanzamiento para retomar la expedición.";

  document.getElementById("end-score").textContent = String(Math.floor(state.score));
  document.getElementById("end-stars").textContent = `★ ${state.stars}`;
  document.getElementById("end-sector").textContent = `${state.sectorIdx + 1} / ${SECTORS.length}`;
  showOverlay("end");
}

// Hook up buttons & audio controls
document.getElementById("btn-start").addEventListener("click", startNewGame);
document.getElementById("btn-resume").addEventListener("click", resumeGame);
document.getElementById("btn-restart-pause").addEventListener("click", startNewGame);
document.getElementById("btn-next-sector").addEventListener("click", () => {
  beginSector(state.sectorIdx + 1);
});
document.getElementById("btn-play-again").addEventListener("click", startNewGame);
document.getElementById("btn-back-menu").addEventListener("click", () => {
  state.mode = "MENU";
  audio.setState("MENU");
  showOverlay("menu");
});

document.getElementById("btn-pause").addEventListener("click", () => {
  if (state.mode === "PLAYING") pauseGame();
  else if (state.mode === "PAUSED") resumeGame();
});

function handleToggleMute() {
  audio.initOnUserGesture();
  const muted = audio.toggleMute();
  const btn = document.getElementById("btn-mute");
  btn.textContent = muted ? "🔇 AUDIO: OFF" : "🔊 AUDIO: ON";
  btn.classList.toggle("muted", muted);
}

document.getElementById("btn-mute").addEventListener("click", handleToggleMute);

document.getElementById("btn-music-toggle").addEventListener("click", () => {
  audio.initOnUserGesture();
  const paused = audio.toggleMusicPause();
  const btn = document.getElementById("btn-music-toggle");
  btn.textContent = paused ? "♪ MÚSICA: PAUSA" : "♪ MÚSICA: ON";
  btn.classList.toggle("muted", paused);
});

document.getElementById("vol-music").addEventListener("input", (e) => {
  audio.initOnUserGesture();
  audio.setMusicVolume(Number(e.target.value) / 100);
});

document.getElementById("vol-sfx").addEventListener("input", (e) => {
  audio.initOnUserGesture();
  audio.setSfxVolume(Number(e.target.value) / 100);
});

// ---------------------------------------------------------------------------
// 6. SPAWNERS, COMBAT & PARTICLE SYSTEMS
// ---------------------------------------------------------------------------
function spawnExplosion(x, y, color = "#ff9d3b", count = 18, speed = 110, size = 3) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = (0.25 + Math.random() * 0.85) * speed;
    state.particles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 0.28 + Math.random() * 0.42,
      maxLife: 0.7,
      size: 1 + Math.floor(Math.random() * size),
      color: i % 3 === 0 ? "#ffffff" : i % 2 === 0 ? color : "#ff4d6d"
    });
  }
}

function spawnStarOrDrop(x, y, guaranteedStar = false) {
  const roll = Math.random();
  if (guaranteedStar || roll < 0.76) {
    state.items.push({
      kind: "star",
      x,
      y,
      vx: -48,
      vy: (Math.random() - 0.5) * 26,
      w: 14,
      h: 14,
      bob: Math.random() * Math.PI * 2
    });
  } else if (roll < 0.90) {
    state.items.push({
      kind: "shield",
      x,
      y,
      vx: -46,
      vy: 0,
      w: 14,
      h: 14,
      bob: 0
    });
  } else {
    state.items.push({
      kind: "repair",
      x,
      y,
      vx: -46,
      vy: 0,
      w: 14,
      h: 14,
      bob: 0
    });
  }
}

function firePlayerWeapon() {
  const p = state.player;
  const tier = state.upgrades.weapon;
  const baseX = p.x + p.w - 2;
  const baseY = p.y + p.h / 2;

  const addShot = (ox, oy, vx, vy, dmg, color) => {
    state.bullets.push({
      x: baseX + ox,
      y: baseY + oy,
      vx,
      vy,
      w: 11,
      h: 3,
      dmg,
      color
    });
  };

  if (tier === 1) {
    addShot(0, -1, 460, 0, 14, "#4af2ff");
    p.fireCooldown = 0.17;
  } else if (tier === 2) {
    addShot(-4, -6, 480, 0, 12, "#4af2ff");
    addShot(-4, 4, 480, 0, 12, "#4af2ff");
    p.fireCooldown = 0.15;
  } else if (tier === 3) {
    addShot(2, -1, 510, 0, 14, "#72fffe");
    addShot(-4, -7, 485, -36, 11, "#4af2ff");
    addShot(-4, 5, 485, 36, 11, "#4af2ff");
    p.fireCooldown = 0.135;
  } else {
    addShot(2, -3, 540, 0, 15, "#ffe066");
    addShot(2, 1, 540, 0, 15, "#ffe066");
    addShot(-4, -8, 500, -48, 12, "#4af2ff");
    addShot(-4, 6, 500, 48, 12, "#4af2ff");
    p.fireCooldown = 0.115;
  }

  // Muzzle spark
  state.particles.push({
    x: baseX + 2,
    y: baseY,
    vx: 60,
    vy: 0,
    life: 0.08,
    maxLife: 0.08,
    size: 4,
    color: "#ffffff"
  });

  audio.playLaser(tier);
}

function spawnSectorHazard() {
  const sec = SECTORS[state.sectorIdx];
  const r = Math.random();

  if (r < sec.cometRate) {
    // High-speed diagonal comet
    const fromTop = Math.random() < 0.5;
    state.comets.push({
      x: CANVAS_W + 24,
      y: fromTop ? 12 + Math.random() * 140 : 190 + Math.random() * 140,
      vx: -(210 + Math.random() * 110 + sec.id * 15),
      vy: fromTop ? 55 + Math.random() * 45 : -(55 + Math.random() * 45),
      w: 22,
      h: 16,
      hp: 30
    });
    return;
  }

  if (r < sec.cometRate + sec.asteroidRate) {
    const sizeIdx = Math.random() < 0.38 ? 0 : Math.random() < 0.72 ? 1 : 2;
    const dims = [34, 22, 14][sizeIdx];
    state.asteroids.push({
      x: CANVAS_W + 30,
      y: 22 + Math.random() * (CANVAS_H - 64),
      vx: -(58 + Math.random() * 55 + sec.id * 8),
      vy: (Math.random() - 0.5) * 28,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 2.4,
      sizeIdx,
      w: dims,
      h: dims,
      hp: [42, 22, 10][sizeIdx] + sec.id * 4
    });
    return;
  }

  // Enemy Ship or Station Turret
  const type = sec.enemyMix[Math.floor(Math.random() * sec.enemyMix.length)];
  const diffScale = 1 + state.sectorIdx * 0.18;

  if (type === "turret") {
    const topMount = Math.random() < 0.5;
    state.enemies.push({
      type: "turret",
      x: CANVAS_W + 24,
      y: topMount ? 16 : CANVAS_H - 42,
      vx: -54,
      vy: 0,
      w: 24,
      h: 24,
      hp: Math.round(34 * diffScale),
      maxHp: Math.round(34 * diffScale),
      fireTimer: 0.9 + Math.random() * 0.8,
      phase: 0,
      scoreVal: 180
    });
  } else if (type === "scout") {
    state.enemies.push({
      type: "scout",
      x: CANVAS_W + 24,
      y: 28 + Math.random() * (CANVAS_H - 72),
      vx: -(108 + sec.id * 10),
      vy: 0,
      w: 22,
      h: 16,
      hp: Math.round(18 * diffScale),
      maxHp: Math.round(18 * diffScale),
      fireTimer: 0.8 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
      scoreVal: 120
    });
  } else if (type === "fighter") {
    state.enemies.push({
      type: "fighter",
      x: CANVAS_W + 28,
      y: 34 + Math.random() * (CANVAS_H - 86),
      vx: -(82 + sec.id * 8),
      vy: 0,
      w: 28,
      h: 22,
      hp: Math.round(34 * diffScale),
      maxHp: Math.round(34 * diffScale),
      fireTimer: 0.9 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
      scoreVal: 200
    });
  } else {
    state.enemies.push({
      type: "gunship",
      x: CANVAS_W + 40,
      y: 44 + Math.random() * (CANVAS_H - 108),
      vx: -(54 + sec.id * 5),
      vy: 0,
      w: 40,
      h: 28,
      hp: Math.round(68 * diffScale),
      maxHp: Math.round(68 * diffScale),
      fireTimer: 1.1,
      phase: Math.random() * Math.PI * 2,
      scoreVal: 360
    });
  }
}

function spawnFinalBoss() {
  state.boss = {
    x: CANVAS_W + 30,
    targetX: CANVAS_W - 124,
    y: CANVAS_H / 2 - 37,
    vy: 56,
    w: 96,
    h: 74,
    hp: 1150,
    maxHp: 1150,
    phaseTimer: 0,
    attackTimer: 1.3,
    burstCount: 0,
    flash: 0
  };
  audio.setState("BOSS");
  showComms("¡Acorazado Eclipse Negativo fijado! Destruye su reactor central. ¡Fuego a discreción!", 7);
}

function rectsOverlap(a, b, pad = 2) {
  return (
    a.x + pad < b.x + b.w - pad &&
    a.x + a.w - pad > b.x + pad &&
    a.y + pad < b.y + b.h - pad &&
    a.y + a.h - pad > b.y + pad
  );
}

function damagePlayer(amount) {
  const p = state.player;
  if (p.invuln > 0 || state.mode !== "PLAYING") return;

  p.shieldDelay = 2.6;
  state.shake = Math.min(8, state.shake + 4.5);

  if (p.shield > 0) {
    const absorbed = Math.min(p.shield, amount);
    p.shield -= absorbed;
    const leftover = amount - absorbed;
    audio.playShieldHit();
    spawnExplosion(p.x + p.w * 0.6, p.y + p.h * 0.5, "#4af2ff", 10, 75, 2);
    if (leftover > 0) {
      p.hull -= leftover;
    }
  } else {
    p.hull -= amount;
    audio.playHullDamage();
    spawnExplosion(p.x + p.w * 0.5, p.y + p.h * 0.5, "#ff5470", 14, 95, 3);
  }

  p.invuln = 0.55;

  if (p.hull <= 0) {
    p.lives -= 1;
    audio.playExplosion(1.4);
    spawnExplosion(p.x + p.w / 2, p.y + p.h / 2, "#ff9933", 36, 150, 4);
    if (p.lives <= 0) {
      p.hull = 0;
      updateHUD();
      triggerEndScreen(false);
    } else {
      p.hull = p.maxHull;
      p.shield = p.maxShield;
      p.invuln = 2.0;
      p.x = 76;
      p.y = CANVAS_H / 2 - p.h / 2;
      showComms(`¡Impacto crítico! Sistemas de respaldo activados. Vidas restantes: ${p.lives}.`, 4);
    }
  }
}

// ---------------------------------------------------------------------------
// 7. UPDATE LOOP
// ---------------------------------------------------------------------------
function update(dt) {
  state.cameraScroll += dt * (state.mode === "PLAYING" ? 72 : 34);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 18);

  // Starfield parallax update (always active for cinematic backdrop)
  for (const s of state.bgStars) {
    const spd = s.layer === 1 ? 14 : s.layer === 2 ? 32 : 68;
    s.x -= spd * dt * (state.mode === "PLAYING" ? 1.15 : 0.45);
    s.twinkle += dt * 3;
    if (s.x < 0) {
      s.x = CANVAS_W;
      s.y = Math.random() * CANVAS_H;
    }
  }

  // Mothership gentle escort motion
  state.mothershipBg.bobPhase += dt * 1.1;
  state.mothershipBg.y = 44 + Math.sin(state.mothershipBg.bobPhase) * 6;

  if (state.mode !== "PLAYING") return;

  const p = state.player;
  const sec = SECTORS[state.sectorIdx];

  // Comms auto-hide
  if (state.commsTimer > 0) {
    state.commsTimer -= dt;
    if (state.commsTimer <= 0) hideComms();
  }

  // Space station sonar ambiance in Sector 4
  if (sec.hasStationBg) {
    state.beaconTimer -= dt;
    if (state.beaconTimer <= 0) {
      state.beaconTimer = 4.2 + Math.random() * 2.5;
      audio.playStationBeacon();
    }
  }

  // Player controls: A (left), D (right), W (up), Z (down)
  let ix = 0;
  let iy = 0;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) ix -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) ix += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) iy -= 1;
  if (keys.has("KeyZ") || keys.has("ArrowDown")) iy += 1;

  if (ix !== 0 && iy !== 0) {
    ix *= 0.7071;
    iy *= 0.7071;
  }

  const engineBonus = (state.upgrades.engine - 1) * 0.16;
  const accel = 1320 * (1 + engineBonus);
  const maxSpeed = 235 * (1 + engineBonus * 0.85);
  const drag = 5.6;

  p.vx += ix * accel * dt;
  p.vy += iy * accel * dt;

  if (ix === 0) p.vx -= p.vx * drag * dt;
  if (iy === 0) p.vy -= p.vy * drag * dt;

  const spd = Math.hypot(p.vx, p.vy);
  if (spd > maxSpeed) {
    p.vx = (p.vx / spd) * maxSpeed;
    p.vy = (p.vy / spd) * maxSpeed;
  }

  p.x = Math.max(8, Math.min(CANVAS_W - p.w - 16, p.x + p.vx * dt));
  p.y = Math.max(12, Math.min(CANVAS_H - p.h - 12, p.y + p.vy * dt));
  p.tilt = iy < -0.2 ? -1 : iy > 0.2 ? 1 : 0;

  audio.updateThruster(Math.min(1, spd / maxSpeed), true);

  // Shield passive recharge
  if (p.shieldDelay > 0) p.shieldDelay -= dt;
  else if (p.shield < p.maxShield) {
    const regenRate = 6.5 + (state.upgrades.shield - 1) * 3.2;
    p.shield = Math.min(p.maxShield, p.shield + regenRate * dt);
  }

  if (p.invuln > 0) p.invuln -= dt;

  // Firing via Right-Click
  if (p.fireCooldown > 0) p.fireCooldown -= dt;
  if (rightMouseDown && p.fireCooldown <= 0) {
    firePlayerWeapon();
  }

  // Thruster exhaust particles
  if (Math.random() < 0.85) {
    const jetLen = ix > 0 ? 1.4 : ix < 0 ? 0.55 : 0.9;
    state.particles.push({
      x: p.x - 1,
      y: p.y + p.h / 2 + (Math.random() - 0.5) * 4,
      vx: -(75 + Math.random() * 55) * jetLen,
      vy: (Math.random() - 0.5) * 18,
      life: 0.14 + Math.random() * 0.1,
      maxLife: 0.24,
      size: ix > 0 ? 3 : 2,
      color: Math.random() < 0.5 ? "#5cf7ff" : "#ffffff"
    });
  }

  // Sector progression & adaptive music switching
  if (!state.boss) {
    state.sectorTime += dt;
    state.spawnTimer -= dt;

    if (state.spawnTimer <= 0 && state.sectorTime < sec.duration - 2) {
      spawnSectorHazard();
      const progressRatio = state.sectorTime / sec.duration;
      state.spawnTimer = sec.spawnInterval * (1 - progressRatio * 0.26) * (0.8 + Math.random() * 0.4);
    }

    // Adaptive music: Exploration when calm, Combat when 2+ enemies or >42% into sector
    const activeThreat = state.enemies.length >= 2 || state.sectorTime > sec.duration * 0.42;
    audio.setState(activeThreat ? "COMBAT" : "EXPLORATION");

    if (state.sectorTime >= sec.duration) {
      if (state.sectorIdx === SECTORS.length - 1) {
        if (state.enemies.length === 0) spawnFinalBoss();
      } else if (state.enemies.length === 0 && state.asteroids.length === 0) {
        openUpgradeBay();
        return;
      }
    }
  } else {
    updateBoss(dt);
  }

  // Update Player Bullets
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x > CANVAS_W + 20 || b.y < -20 || b.y > CANVAS_H + 20) {
      state.bullets.splice(i, 1);
    }
  }

  // Update Enemy Bullets
  for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
    const eb = state.enemyBullets[i];
    eb.x += eb.vx * dt;
    eb.y += eb.vy * dt;
    if (eb.x < -20 || eb.x > CANVAS_W + 20 || eb.y < -20 || eb.y > CANVAS_H + 20) {
      state.enemyBullets.splice(i, 1);
      continue;
    }
    if (rectsOverlap(eb, p, 3)) {
      state.enemyBullets.splice(i, 1);
      damagePlayer(eb.dmg || 16);
    }
  }

  // Update Asteroids
  for (let i = state.asteroids.length - 1; i >= 0; i--) {
    const a = state.asteroids[i];
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.rot += a.rotSpeed * dt;

    if (a.x < -50 || a.y < -50 || a.y > CANVAS_H + 50) {
      state.asteroids.splice(i, 1);
      continue;
    }

    if (rectsOverlap(a, p, 4)) {
      damagePlayer(22);
      a.hp -= 40;
    }

    // Bullet hits
    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b = state.bullets[j];
      if (rectsOverlap(b, a, 1)) {
        state.bullets.splice(j, 1);
        a.hp -= b.dmg;
        spawnExplosion(b.x, b.y, "#ffb84d", 4, 45, 2);
        if (a.hp <= 0) break;
      }
    }

    if (a.hp <= 0) {
      audio.playExplosion(a.sizeIdx === 0 ? 1.1 : 0.7);
      spawnExplosion(a.x + a.w / 2, a.y + a.h / 2, "#d99a4e", 16, 95, 3);
      state.score += (3 - a.sizeIdx) * 60;
      if (a.sizeIdx < 2) {
        // Split large asteroid into smaller chunks
        for (let k = 0; k < 2; k++) {
          const nextIdx = a.sizeIdx + 1;
          const nd = [34, 22, 14][nextIdx];
          state.asteroids.push({
            x: a.x + 4,
            y: a.y + (k === 0 ? -6 : 6),
            vx: a.vx - 18,
            vy: (k === 0 ? -42 : 42) + (Math.random() - 0.5) * 20,
            rot: 0,
            rotSpeed: (Math.random() - 0.5) * 4,
            sizeIdx: nextIdx,
            w: nd,
            h: nd,
            hp: nextIdx === 1 ? 18 : 8
          });
        }
      } else if (Math.random() < 0.65) {
        spawnStarOrDrop(a.x, a.y, true);
      }
      state.asteroids.splice(i, 1);
    }
  }

  // Update Comets
  for (let i = state.comets.length - 1; i >= 0; i--) {
    const c = state.comets[i];
    c.x += c.vx * dt;
    c.y += c.vy * dt;

    // Fiery particle trail
    state.particles.push({
      x: c.x + c.w - 4,
      y: c.y + c.h / 2 + (Math.random() - 0.5) * 6,
      vx: 40 + Math.random() * 40,
      vy: (Math.random() - 0.5) * 25,
      life: 0.25,
      maxLife: 0.25,
      size: 3,
      color: Math.random() < 0.5 ? "#ff7733" : "#ffe066"
    });

    if (c.x < -40 || c.y < -40 || c.y > CANVAS_H + 40) {
      state.comets.splice(i, 1);
      continue;
    }

    if (rectsOverlap(c, p, 3)) {
      damagePlayer(28);
      c.hp = 0;
    }

    for (let j = state.bullets.length - 1; j >= 0; j--) {
      if (rectsOverlap(state.bullets[j], c, 1)) {
        c.hp -= state.bullets[j].dmg;
        state.bullets.splice(j, 1);
      }
    }

    if (c.hp <= 0) {
      audio.playExplosion(0.95);
      spawnExplosion(c.x + c.w / 2, c.y + c.h / 2, "#ff8844", 18, 120, 3);
      state.score += 150;
      spawnStarOrDrop(c.x, c.y, true);
      state.comets.splice(i, 1);
    }
  }

  // Update Enemies
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    e.phase += dt * 3;
    e.x += e.vx * dt;

    if (e.type === "scout") {
      e.y += Math.sin(e.phase) * 72 * dt;
    } else if (e.type === "fighter") {
      e.y += Math.cos(e.phase * 0.8) * 44 * dt;
    } else if (e.type === "gunship") {
      if (e.x < CANVAS_W - 140) e.vx = -16;
      e.y += Math.sin(e.phase * 0.5) * 26 * dt;
    }

    e.y = Math.max(10, Math.min(CANVAS_H - e.h - 10, e.y));

    if (e.x < -50) {
      state.enemies.splice(i, 1);
      continue;
    }

    // Enemy firing
    e.fireTimer -= dt;
    if (e.fireTimer <= 0 && e.x < CANVAS_W - 16 && e.x > p.x + 12) {
      const dx = p.x + p.w / 2 - e.x;
      const dy = p.y + p.h / 2 - (e.y + e.h / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const spd = e.type === "turret" ? 195 : 175 + state.sectorIdx * 10;

      if (e.type === "gunship") {
        // Spread triple plasma burst
        for (const angOff of [-0.18, 0, 0.18]) {
          const baseAng = Math.atan2(dy, dx) + angOff;
          state.enemyBullets.push({
            x: e.x,
            y: e.y + e.h / 2,
            vx: Math.cos(baseAng) * spd,
            vy: Math.sin(baseAng) * spd,
            w: 7,
            h: 4,
            dmg: 16,
            color: "#ff9933"
          });
        }
        e.fireTimer = 1.9;
      } else {
        state.enemyBullets.push({
          x: e.x,
          y: e.y + e.h / 2,
          vx: (dx / dist) * spd,
          vy: (dy / dist) * spd,
          w: 7,
          h: 3,
          dmg: 14,
          color: e.type === "turret" ? "#ff4769" : "#42f59b"
        });
        e.fireTimer = e.type === "scout" ? 1.7 : 1.45;
      }
    }

    if (rectsOverlap(e, p, 3)) {
      damagePlayer(24);
      e.hp -= 50;
    }

    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b = state.bullets[j];
      if (rectsOverlap(b, e, 1)) {
        state.bullets.splice(j, 1);
        e.hp -= b.dmg;
        spawnExplosion(b.x, b.y, "#4af2ff", 4, 45, 2);
        if (e.hp <= 0) break;
      }
    }

    if (e.hp <= 0) {
      audio.playExplosion(e.type === "gunship" ? 1.25 : 0.85);
      spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, "#ff5c7c", e.type === "gunship" ? 26 : 16, 110, 3);
      state.score += e.scoreVal;
      spawnStarOrDrop(e.x + e.w / 2, e.y + e.h / 2, Math.random() < 0.72);
      state.enemies.splice(i, 1);
    }
  }

  // Update Collectible Stars & Cells (with magnetic pull near ship)
  for (let i = state.items.length - 1; i >= 0; i--) {
    const it = state.items[i];
    it.bob += dt * 4;
    const dx = p.x + p.w / 2 - (it.x + it.w / 2);
    const dy = p.y + p.h / 2 - (it.y + it.h / 2);
    const dist = Math.hypot(dx, dy);
    if (dist < 88 && dist > 1) {
      it.x += (dx / dist) * 195 * dt;
      it.y += (dy / dist) * 195 * dt;
    } else {
      it.x += it.vx * dt;
      it.y += (it.vy + Math.sin(it.bob) * 12) * dt;
    }

    if (it.x < -25) {
      state.items.splice(i, 1);
      continue;
    }

    if (rectsOverlap(it, p, 0)) {
      audio.playPickup(it.kind);
      if (it.kind === "star") {
        state.stars += 1;
        state.score += 100;
      } else if (it.kind === "shield") {
        p.shield = Math.min(p.maxShield, p.shield + 45);
        state.score += 75;
      } else if (it.kind === "repair") {
        p.hull = Math.min(p.maxHull, p.hull + 35);
        state.score += 75;
      }
      spawnExplosion(it.x + 7, it.y + 7, it.kind === "star" ? "#ffe066" : "#4af2ff", 8, 60, 2);
      state.items.splice(i, 1);
    }
  }

  // Update Particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }

  updateHUD();
}

function updateBoss(dt) {
  const b = state.boss;
  const p = state.player;
  if (!b) return;

  if (b.flash > 0) b.flash -= dt;

  if (b.x > b.targetX) {
    b.x -= 64 * dt;
  } else {
    b.y += b.vy * dt;
    if (b.y < 16) {
      b.y = 16;
      b.vy = Math.abs(b.vy);
    } else if (b.y > CANVAS_H - b.h - 16) {
      b.y = CANVAS_H - b.h - 16;
      b.vy = -Math.abs(b.vy);
    }
  }

  // Boss multi-phase attack patterns
  const enraged = b.hp < b.maxHp * 0.5;
  b.attackTimer -= dt;
  if (b.attackTimer <= 0 && b.x <= b.targetX + 4) {
    b.burstCount = (b.burstCount + 1) % 3;

    if (b.burstCount === 0) {
      // Fan volley of crimson plasma orbs from core
      const count = enraged ? 7 : 5;
      for (let i = 0; i < count; i++) {
        const ang = Math.PI + ((i - (count - 1) / 2) * 0.22);
        state.enemyBullets.push({
          x: b.x + 24,
          y: b.y + b.h / 2,
          vx: Math.cos(ang) * 195,
          vy: Math.sin(ang) * 195,
          w: 8,
          h: 5,
          dmg: 18,
          color: "#ff3d6e"
        });
      }
      b.attackTimer = enraged ? 1.15 : 1.5;
    } else if (b.burstCount === 1) {
      // Twin wing-cannon aimed high-velocity lasers
      for (const cy of [b.y + 8, b.y + b.h - 8]) {
        const dx = p.x - b.x;
        const dy = p.y + p.h / 2 - cy;
        const d = Math.hypot(dx, dy) || 1;
        state.enemyBullets.push({
          x: b.x + 12,
          y: cy,
          vx: (dx / d) * 245,
          vy: (dy / d) * 245,
          w: 10,
          h: 4,
          dmg: 16,
          color: "#ffaa33"
        });
      }
      b.attackTimer = enraged ? 0.95 : 1.3;
    } else {
      // Summon escort scout drone if < 3 enemies
      if (state.enemies.length < 3) {
        state.enemies.push({
          type: "scout",
          x: b.x + 10,
          y: b.y + (Math.random() < 0.5 ? 10 : b.h - 20),
          vx: -115,
          vy: 0,
          w: 22,
          h: 16,
          hp: 24,
          maxHp: 24,
          fireTimer: 1.0,
          phase: 0,
          scoreVal: 150
        });
      }
      b.attackTimer = 1.25;
    }
  }

  // Player collision with boss
  if (rectsOverlap(b, p, 8)) {
    damagePlayer(30);
  }

  // Bullets hitting boss
  for (let j = state.bullets.length - 1; j >= 0; j--) {
    const blt = state.bullets[j];
    if (rectsOverlap(blt, b, 6)) {
      state.bullets.splice(j, 1);
      b.hp -= blt.dmg;
      b.flash = 0.06;
      state.score += 15;
      spawnExplosion(blt.x, blt.y, "#ffbe4f", 4, 50, 2);
      if (b.hp <= 0) {
        audio.playExplosion(2.0);
        spawnExplosion(b.x + b.w / 2, b.y + b.h / 2, "#ff6b4a", 55, 190, 4);
        state.score += 3500;
        state.stars += 15;
        state.boss = null;
        updateHUD();
        triggerEndScreen(true);
        return;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 8. RENDERING PIPELINE (PARALLAX + SPRITES + GLOW)
// ---------------------------------------------------------------------------
function render() {
  const sec = SECTORS[state.sectorIdx];
  const bgs = sectorBackgrounds[state.sectorIdx];

  ctx.save();
  if (state.shake > 0.2) {
    ctx.translate(
      Math.round((Math.random() - 0.5) * state.shake),
      Math.round((Math.random() - 0.5) * state.shake)
    );
  }

  // 1. Sky / Deep Space Gradient
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, sec.skyTop);
  grad.addColorStop(1, sec.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // 2. Parallax Starfield (3 depth layers)
  for (const s of state.bgStars) {
    const a = 0.4 + 0.5 * Math.sin(s.twinkle);
    ctx.globalAlpha = s.layer === 1 ? a * 0.55 : s.layer === 2 ? a * 0.8 : 1;
    ctx.fillStyle = s.layer === 3 ? sec.starTint : "#dbe9ff";
    ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
  }
  ctx.globalAlpha = 1;

  // 3. Seamless Parallax Nebula Layer
  const nebOffset = Math.floor(state.cameraScroll * 0.22) % CANVAS_W;
  ctx.drawImage(bgs.nebula, -nebOffset, 0);
  ctx.drawImage(bgs.nebula, CANVAS_W - nebOffset, 0);

  // 4. Distant Giant Planet
  const planetX = CANVAS_W - ((Math.floor(state.cameraScroll * 0.08) + 120) % (CANVAS_W + 220));
  ctx.drawImage(bgs.planet, planetX, 24);

  // 5. Abandoned Space Station Midground Layer (Sectors 4 & 6)
  if (bgs.station) {
    const stOffset = Math.floor(state.cameraScroll * 0.55) % CANVAS_W;
    ctx.globalAlpha = 0.88;
    ctx.drawImage(bgs.station, -stOffset, 95);
    ctx.drawImage(bgs.station, CANVAS_W - stOffset, 95);
    ctx.globalAlpha = 1;
  }

  // 6. Capital Mothership (USS Astral Discovery) majestic escort in background
  if (state.sectorIdx === 0 || state.sectorIdx === 5 || state.mode === "MENU") {
    ctx.save();
    ctx.globalAlpha = state.mode === "MENU" ? 0.92 : 0.42;
    ctx.drawImage(
      SpriteAtlas.mothership,
      Math.round(state.mothershipBg.x),
      Math.round(state.mothershipBg.y)
    );
    ctx.restore();
  }

  // 7. Collectible Items (with pixel glow aura)
  for (const it of state.items) {
    const spr = SpriteAtlas.items[it.kind];
    ctx.fillStyle = it.kind === "star" ? "rgba(255,224,102,0.22)" : "rgba(74,242,255,0.2)";
    ctx.fillRect(Math.round(it.x - 2), Math.round(it.y - 2), it.w + 4, it.h + 4);
    ctx.drawImage(spr, Math.round(it.x), Math.round(it.y));
  }

  // 8. Asteroids
  for (const a of state.asteroids) {
    const spr = SpriteAtlas.asteroids[a.sizeIdx];
    ctx.save();
    ctx.translate(Math.round(a.x + a.w / 2), Math.round(a.y + a.h / 2));
    ctx.rotate(a.rot);
    ctx.drawImage(spr, -a.w / 2, -a.h / 2);
    ctx.restore();
  }

  // 9. Comets
  for (const c of state.comets) {
    ctx.drawImage(SpriteAtlas.comet, Math.round(c.x), Math.round(c.y));
  }

  // 10. Enemy Ships & Turrets
  for (const e of state.enemies) {
    const spr = SpriteAtlas.enemies[e.type];
    ctx.drawImage(spr, Math.round(e.x), Math.round(e.y));
    if (e.hp < e.maxHp) {
      ctx.fillStyle = "#141c2b";
      ctx.fillRect(Math.round(e.x), Math.round(e.y - 5), e.w, 3);
      ctx.fillStyle = "#ff4769";
      ctx.fillRect(Math.round(e.x), Math.round(e.y - 5), Math.round(e.w * (e.hp / e.maxHp)), 3);
    }
  }

  // 11. Final Boss
  if (state.boss) {
    const b = state.boss;
    ctx.save();
    if (b.flash > 0) ctx.filter = "brightness(2)";
    ctx.drawImage(SpriteAtlas.boss, Math.round(b.x), Math.round(b.y));
    ctx.restore();

    // Boss HP Bar at top of canvas
    const barW = 280;
    const bx = (CANVAS_W - barW) / 2;
    ctx.fillStyle = "rgba(8, 12, 22, 0.85)";
    ctx.fillRect(bx - 4, 10, barW + 8, 18);
    ctx.strokeStyle = "#ff4769";
    ctx.strokeRect(bx - 4, 10, barW + 8, 18);
    ctx.fillStyle = "#ff2e63";
    ctx.fillRect(bx, 18, Math.round(barW * Math.max(0, b.hp / b.maxHp)), 6);
    ctx.fillStyle = "#ffe6eb";
    ctx.font = "bold 8px monospace";
    ctx.fillText("ACORAZADO ECLIPSE NEGATIVO", bx, 16);
  }

  // 12. Projectiles (glowing pixel bolts)
  for (const b of state.bullets) {
    ctx.fillStyle = b.color;
    ctx.fillRect(Math.round(b.x), Math.round(b.y), b.w, b.h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.round(b.x + 2), Math.round(b.y + 1), b.w - 4, 1);
  }

  for (const eb of state.enemyBullets) {
    ctx.fillStyle = eb.color;
    ctx.fillRect(Math.round(eb.x), Math.round(eb.y), eb.w, eb.h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.round(eb.x + 1), Math.round(eb.y + 1), eb.w - 2, 1);
  }

  // 13. Player Scout Ship (Valkyrie-X7)
  if (state.mode !== "MENU" && state.mode !== "GAMEOVER") {
    const p = state.player;
    const blinkSkip = p.invuln > 0 && Math.floor(p.invuln * 18) % 2 === 0;
    if (!blinkSkip) {
      const spr = p.tilt < 0 ? SpriteAtlas.player.up : p.tilt > 0 ? SpriteAtlas.player.down : SpriteAtlas.player.neutral;
      ctx.drawImage(spr, Math.round(p.x), Math.round(p.y));

      // Active Shield Shimmer Rim when hit or high charge
      if (p.invuln > 0 && p.shield > 0) {
        ctx.strokeStyle = "rgba(84, 245, 255, 0.7)";
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(p.x - 2), Math.round(p.y - 2), p.w + 4, p.h + 4);
      }
    }
  }

  // 14. Particles & Explosions
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 9. MAIN REQUESTANIMATIONFRAME LOOP
// ---------------------------------------------------------------------------
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  update(dt);
  render();

  requestAnimationFrame(loop);
}

updateHUD();
requestAnimationFrame(loop);
