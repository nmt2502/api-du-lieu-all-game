const express = require("express");
const fs = require("fs");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = "./data.json";
const CAU_FILE = "./cau_all_game.json";

/* ================= GAME LIST ================= */
const GAMES = {
  /* ================= GAME SUNWIN ================= */
  SUNWIN: "https://sunwinsaygex-pcl2.onrender.com/api/sun",
  /* ================= GAME LC97 ================= */
  LC79_THUONG: "https://lc79md5-lun8.onrender.com/lc79/tx",
  LC79_MD5: "https://lc79md5-lun8.onrender.com/lc79/md5",
  /* ================= GAME 68 GAME BÀI ================= */
  "68GB_MD5": "https://six8-api-5pje.onrender.com/68gbmd5",
  /* ================= GAME 789CLUB ================= */
  "789_THUONG": "https://seven89-wkxd.onrender.com/api/789/tx",
  /* ================= GAME LUCKYWIN ================= */
  LUCK_TX: "https://luckywingugu.onrender.com/luck/md5",
  LUCK_MD5: "https://luckywingugu.onrender.com/luck8/tx",
  /* ================= GAME BETVIP ================= */
  BET_THUONG: "https://betvip.onrender.com/betvip/md5",
  BET_MD5: "https://betvip.onrender.com/betvip/tx",
  /* ================= GAME HITCLUB ================= */
  HIT_THUONG: "https://hitclub-rksy.onrender.com/api/taixiumd5",
  HIT_MD5: "https://hitclub-rksy.onrender.com/api/taixiu",
  /* ================= GAME B52 ================= */
  B52_TX: "https://b52-si96.onrender.com/api/taixiumd5",
  B52_MD5: "https://b52-si96.onrender.com/api/taixiu",
  /* ================= GAME SICBO ================= */
  SICBO_SUN: "https://sicsun-9wes.onrender.com/predict",
  SICBO_HITCLUB: "https://sichit-d15h.onrender.com/sicbo"
};

/* ================= UTIL ================= */
const load = (f) =>
  fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
const save = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));
const now = () => new Date().toLocaleString("vi-VN");

/* =========================================================
   CORE ENGINE – SO KHỚP CHUỖI CON
========================================================= */
function runAlgo(cau, PATTERNS) {
  if (!cau || cau.length < 4) {
    return ["Chờ Đủ Dữ Liệu", "0%"];
  }

  let best = null;
  let bestLen = 0;

  for (const key in PATTERNS) {
    const { pattern, probability } = PATTERNS[key];
    const str = pattern.join("");

    if (cau.includes(str) && str.length > bestLen) {
      best = PATTERNS[key];
      bestLen = str.length;
    }
  }

  if (!best) {
    return ["Chờ Lấy Dữ Liệu Đưa Ra Dự Đoán", "0%"];
  }

  const du_doan = cau.slice(-1) === "T" ? "Xỉu" : "Tài";
  const percent = Math.min(95, Math.round(best.probability * 100));

  return [du_doan, percent + "%"];
}

/* ================= THUẬT TOÁN SUNWIN ================= */

const SUNWIN_PATTERNS = {
  "1-1": [
    { pattern: ["T","X","T","X"], probability: 0.7, strength: 0.8 },
    { pattern: ["X","T","X","T"], probability: 0.7, strength: 0.8 }
  ],

  "1-2-1": [
    { pattern: ["T","X","X","T"], probability: 0.65, strength: 0.75 },
    { pattern: ["X","T","T","X"], probability: 0.65, strength: 0.75 }
  ],

  "2-1-2": [
    { pattern: ["T","T","X","T","T"], probability: 0.68, strength: 0.78 },
    { pattern: ["X","X","T","X","X"], probability: 0.68, strength: 0.78 }
  ],

  "3-1": [
    { pattern: ["T","T","T","X"], probability: 0.72, strength: 0.82 },
    { pattern: ["X","X","X","T"], probability: 0.72, strength: 0.82 }
  ],

  "1-3": [
    { pattern: ["T","X","X","X"], probability: 0.72, strength: 0.82 },
    { pattern: ["X","T","T","T"], probability: 0.72, strength: 0.82 }
  ],

  "2-2": [
    { pattern: ["T","T","X","X"], probability: 0.66, strength: 0.76 },
    { pattern: ["X","X","T","T"], probability: 0.66, strength: 0.76 }
  ],

  "2-3": [
    { pattern: ["T","T","X","X","X"], probability: 0.71, strength: 0.81 },
    { pattern: ["X","X","T","T","T"], probability: 0.71, strength: 0.81 }
  ],

  "3-2": [
    { pattern: ["T","T","T","X","X"], probability: 0.73, strength: 0.83 },
    { pattern: ["X","X","X","T","T"], probability: 0.73, strength: 0.83 }
  ],

  "4-1": [
    { pattern: ["T","T","T","T","X"], probability: 0.76, strength: 0.86 },
    { pattern: ["X","X","X","X","T"], probability: 0.76, strength: 0.86 }
  ],

  "1-4": [
    { pattern: ["T","X","X","X","X"], probability: 0.76, strength: 0.86 },
    { pattern: ["X","T","T","T","T"], probability: 0.76, strength: 0.86 }
  ],

  "4": [
    { pattern: ["T","T","T","T"], probability: 0.77, strength: 0.87 },
    { pattern: ["X","X","X","X"], probability: 0.77, strength: 0.87 }
  ],

  "4-5": [
    { pattern: ["T","T","T","T","X","X","X","X","X"], probability: 0.79, strength: 0.89 }
  ],

  "5-4": [
    { pattern: ["X","X","X","X","X","T","T","T","T"], probability: 0.79, strength: 0.89 }
  ],

  "6-6": [
    { pattern: ["T","T","T","T","T","T","X","X","X","X","X","X"], probability: 0.81, strength: 0.91 }
  ],

  "7-3": [
    { pattern: ["X","X","X","X","X","X","X","T","T","T"], probability: 0.82, strength: 0.92 },
    { pattern: ["T","T","T","T","T","T","T","X","X","X"], probability: 0.82, strength: 0.92 }
  ],

  "3-7": [
    { pattern: ["X","X","X","T","T","T","T","T","T","T"], probability: 0.84, strength: 0.94 }
  ],

  "1-2-3-3": [
    { pattern: ["T","X","X","T","T","T","X","X","X"], probability: 0.77, strength: 0.97 },
    { pattern: ["X","T","T","X","X","X","T","T","T"], probability: 0.77, strength: 0.97 }
  ],

  "1-3-3": [
    { pattern: ["T","X","X","X","T","T","T"], probability: 0.87, strength: 0.77 },
    { pattern: ["X","T","T","T","X","X","X"], probability: 0.87, strength: 0.77 }
  ],

  "1-2-1-3-4": [
    { pattern: ["T","X","X","T","X","X","X","T","T","T","T"], probability: 0.89, strength: 0.99 }
  ]
};

const algoSUNWIN = (cau) => runAlgo(cau, SUNWIN_PATTERNS);

/* ================= THUẬT TOÁN LC TX THƯỜNG ================= */

const LC_THUONG_PATTERNS = {
  "1-1": [
    { pattern: ["T","X","T","X"], probability: 0.7, strength: 0.8 },
    { pattern: ["X","T","X","T"], probability: 0.7, strength: 0.8 }
  ],

  "1-2-1": [
    { pattern: ["T","X","X","T"], probability: 0.65, strength: 0.75 },
    { pattern: ["X","T","T","X"], probability: 0.65, strength: 0.75 }
  ],

  "2-1-2": [
    { pattern: ["T","T","X","T","T"], probability: 0.68, strength: 0.78 },
    { pattern: ["X","X","T","X","X"], probability: 0.68, strength: 0.78 }
  ],

  "3-1": [
    { pattern: ["T","T","T","X"], probability: 0.72, strength: 0.82 },
    { pattern: ["X","X","X","T"], probability: 0.72, strength: 0.82 }
  ],

  "1-3": [
    { pattern: ["T","X","X","X"], probability: 0.72, strength: 0.82 },
    { pattern: ["X","T","T","T"], probability: 0.72, strength: 0.82 }
  ],

  "2-2": [
    { pattern: ["T","T","X","X"], probability: 0.66, strength: 0.76 },
    { pattern: ["X","X","T","T"], probability: 0.66, strength: 0.76 }
  ],

  "2-3": [
    { pattern: ["T","T","X","X","X"], probability: 0.71, strength: 0.81 },
    { pattern: ["X","X","T","T","T"], probability: 0.71, strength: 0.81 }
  ],

  "3-2": [
    { pattern: ["T","T","T","X","X"], probability: 0.73, strength: 0.83 },
    { pattern: ["X","X","X","T","T"], probability: 0.73, strength: 0.83 }
  ],

  "4-1": [
    { pattern: ["T","T","T","T","X"], probability: 0.76, strength: 0.86 },
    { pattern: ["X","X","X","X","T"], probability: 0.76, strength: 0.86 }
  ],

  "1-4": [
    { pattern: ["T","X","X","X","X"], probability: 0.76, strength: 0.86 },
    { pattern: ["X","T","T","T","T"], probability: 0.76, strength: 0.86 }
  ],

  "6-1-1-6": [
    {
      pattern: ["T","T","T","T","T","T","X","T","X","X","X","X","X","X","X"],
      probability: 0.92,
      strength: 0.94
    },
    {
      pattern: ["X","X","X","X","X","X","T","X","T","T","T","T","T","T","T"],
      probability: 0.92,
      strength: 0.94
    }
  ]
};

const algoLC_THUONG = (cau) => runAlgo(cau, LC_THUONG_PATTERNS);

/* ================= THUẬT TOÁN LC TX MD5 ================= */

const LC_MD5_PATTERNS = {
  "1-1": [
    { pattern: ["T","X","T","X"], probability: 0.7, strength: 0.8 },
    { pattern: ["X","T","X","T"], probability: 0.7, strength: 0.8 }
  ],

  "1-2-1": [
    { pattern: ["T","X","X","T"], probability: 0.65, strength: 0.75 },
    { pattern: ["X","T","T","X"], probability: 0.65, strength: 0.75 }
  ],

  "2-1-2": [
    { pattern: ["T","T","X","T","T"], probability: 0.68, strength: 0.78 },
    { pattern: ["X","X","T","X","X"], probability: 0.68, strength: 0.78 }
  ],

  "3-1": [
    { pattern: ["T","T","T","X"], probability: 0.72, strength: 0.82 },
    { pattern: ["X","X","X","T"], probability: 0.72, strength: 0.82 }
  ],

  "1-3": [
    { pattern: ["T","X","X","X"], probability: 0.72, strength: 0.82 },
    { pattern: ["X","T","T","T"], probability: 0.72, strength: 0.82 }
  ],

  "2-2": [
    { pattern: ["T","T","X","X"], probability: 0.66, strength: 0.76 },
    { pattern: ["X","X","T","T"], probability: 0.66, strength: 0.76 }
  ],

  "2-3": [
    { pattern: ["T","T","X","X","X"], probability: 0.71, strength: 0.81 },
    { pattern: ["X","X","T","T","T"], probability: 0.71, strength: 0.81 }
  ],

  "3-2": [
    { pattern: ["T","T","T","X","X"], probability: 0.73, strength: 0.83 },
    { pattern: ["X","X","X","T","T"], probability: 0.73, strength: 0.83 }
  ],

  "4-1": [
    { pattern: ["T","T","T","T","X"], probability: 0.76, strength: 0.86 },
    { pattern: ["X","X","X","X","T"], probability: 0.76, strength: 0.86 }
  ],

  "1-4": [
    { pattern: ["T","X","X","X","X"], probability: 0.76, strength: 0.86 },
    { pattern: ["X","T","T","T","T"], probability: 0.76, strength: 0.86 }
  ],

  "6-1-1-6": [
    {
      pattern: ["T","T","T","T","T","T","X","T","X","X","X","X","X","X","X"],
      probability: 0.92,
      strength: 0.94
    },
    {
      pattern: ["X","X","X","X","X","X","T","X","T","T","T","T","T","T","T"],
      probability: 0.92,
      strength: 0.94
    }
  ],

  "1-1-2-1": [
    { pattern: ["T","X","T","T","X"], probability: 0.92, strength: 0.98 },
    { pattern: ["X","T","X","X","T"], probability: 0.92, strength: 0.98 }
  ],

  "1-1-2-1-1-2-1": [
    { pattern: ["T","X","T","X","X","T","X","T","T","X"], probability: 0.94, strength: 0.96 }
  ]
};

const algoLC_MD5 = (cau) => runAlgo(cau, LC_MD5_PATTERNS);

/* ================= THUẬT TOÁN 68GB ================= */

const GB68_PATTERNS = {
  "1-1": [
    { pattern: ["T","X","T","X"], probability: 0.7, strength: 0.8 },
    { pattern: ["X","T","X","T"], probability: 0.7, strength: 0.8 }
  ],

  "1-2-1": [
    { pattern: ["T","X","X","T"], probability: 0.65, strength: 0.75 },
    { pattern: ["X","T","T","X"], probability: 0.65, strength: 0.75 }
  ],

  "2-1-2": [
    { pattern: ["T","T","X","T","T"], probability: 0.68, strength: 0.78 },
    { pattern: ["X","X","T","X","X"], probability: 0.68, strength: 0.78 }
  ],

  "3-1": [
    { pattern: ["T","T","T","X"], probability: 0.72, strength: 0.82 },
    { pattern: ["X","X","X","T"], probability: 0.72, strength: 0.82 }
  ],

  "1-3": [
    { pattern: ["T","X","X","X"], probability: 0.72, strength: 0.82 },
    { pattern: ["X","T","T","T"], probability: 0.72, strength: 0.82 }
  ],

  "2-2": [
    { pattern: ["T","T","X","X"], probability: 0.66, strength: 0.76 },
    { pattern: ["X","X","T","T"], probability: 0.66, strength: 0.76 }
  ],

  "2-3": [
    { pattern: ["T","T","X","X","X"], probability: 0.71, strength: 0.81 },
    { pattern: ["X","X","T","T","T"], probability: 0.71, strength: 0.81 }
  ],

  "3-2": [
    { pattern: ["T","T","T","X","X"], probability: 0.73, strength: 0.83 },
    { pattern: ["X","X","X","T","T"], probability: 0.73, strength: 0.83 }
  ],

  "4-1": [
    { pattern: ["T","T","T","T","X"], probability: 0.76, strength: 0.86 },
    { pattern: ["X","X","X","X","T"], probability: 0.76, strength: 0.86 }
  ],

  "1-4": [
    { pattern: ["T","X","X","X","X"], probability: 0.76, strength: 0.86 },
    { pattern: ["X","T","T","T","T"], probability: 0.76, strength: 0.86 }
  ],

  "3-1-3": [
    { pattern: ["T","T","T","X","T","T","T"], probability: 0.72, strength: 0.82 },
    { pattern: ["X","X","X","T","X","X","X"], probability: 0.72, strength: 0.82 }
  ],

  "2-3-2": [
    { pattern: ["T","T","X","X","X","T","T"], probability: 0.78, strength: 0.88 },
    { pattern: ["X","X","T","T","T","X","X"], probability: 0.78, strength: 0.88 }
  ]
};

const algo68GB = (cau) => runAlgo(cau, GB68_PATTERNS);

/* ================= THUẬT TOÁN 789CLUB ================= */

const CL789_PATTERNS = {
  "1-1": [
    { pattern: ["T","X","T","X"], probability: 0.7, strength: 0.8 },
    { pattern: ["X","T","X","T"], probability: 0.7, strength: 0.8 }
  ],
  "1-2-1": [
    { pattern: ["T","X","X","T"], probability: 0.65, strength: 0.75 },
    { pattern: ["X","T","T","X"], probability: 0.65, strength: 0.75 }
  ],
  "2-1-2": [
    { pattern: ["T","T","X","T","T"], probability: 0.68, strength: 0.78 },
    { pattern: ["X","X","T","X","X"], probability: 0.68, strength: 0.78 }
  ],
  "3-1": [
    { pattern: ["T","T","T","X"], probability: 0.72, strength: 0.82 },
    { pattern: ["X","X","X","T"], probability: 0.72, strength: 0.82 }
  ],
  "1-3": [
    { pattern: ["T","X","X","X"], probability: 0.72, strength: 0.82 },
    { pattern: ["X","T","T","T"], probability: 0.72, strength: 0.82 }
  ],
  "2-2": [
    { pattern: ["T","T","X","X"], probability: 0.66, strength: 0.76 },
    { pattern: ["X","X","T","T"], probability: 0.66, strength: 0.76 }
  ],
  "2-3": [
    { pattern: ["T","T","X","X","X"], probability: 0.71, strength: 0.81 },
    { pattern: ["X","X","T","T","T"], probability: 0.71, strength: 0.81 }
  ],
  "3-2": [
    { pattern: ["T","T","T","X","X"], probability: 0.73, strength: 0.83 },
    { pattern: ["X","X","X","T","T"], probability: 0.73, strength: 0.83 }
  ],
  "4-1": [
    { pattern: ["T","T","T","T","X"], probability: 0.76, strength: 0.86 },
    { pattern: ["X","X","X","X","T"], probability: 0.76, strength: 0.86 }
  ],
  "1-4": [
    { pattern: ["T","X","X","X","X"], probability: 0.76, strength: 0.86 },
    { pattern: ["X","T","T","T","T"], probability: 0.76, strength: 0.86 }
  ]
};

const algo789 = (cau) => runAlgo(cau, CL789_PATTERNS);

/* ================= THUẬT TOÁN LUCKYWIN THƯỜNG================= */

/* ================= THUẬT TOÁN LUCKYWIN MD5================= */

/* ================= THUẬT TOÁN BETVIP THƯỜNG================= */

/* ================= THUẬT TOÁN BETVIP MD5================= */

/* ================= THUẬT TOÁN HITCLUB THƯỜNG================= */

/* ================= THUẬT TOÁN HITCLUB MD5================= */

/* ================= THUẬT TOÁN B52 THƯỜNG================= */

/* ================= THUẬT TOÁN B52 MD5================= */

/* ================= THUẬT TOÁN SICBO HITCLUB================= */
function algoSICBO(cau) {
  const t = (cau.match(/T/g) || []).length;
  const x = (cau.match(/X/g) || []).length;

  if (Math.abs(t - x) < 2) {
    return ["Chờ Lấy Dữ Liệu Đưa Ra Dự Đoán", "0%"];
  }

  return t > x ? ["Xỉu", "65%"] : ["Tài", "65%"];
}


/* ================= THUẬT TOÁN SICBO SUN================= */

/* =========================================================
   MAP GAME → ALGO
========================================================= */
function algo(game, cau) {
  switch (game) {
    case "SUNWIN": return algoSUNWIN(cau);
    case "LC79_THUONG": return algoLC_THUONG(cau);
    case "LC79_MD5": return algoLC_MD5(cau);
    case "68GB_MD5": return algo68GB(cau);
    case "789_THUONG": return algo789(cau);
    case "LUCK_TX": return algoLUCK_TX(cau);
    case "LUCK_MD5": return algoLUCK_MD5(cau);
    case "BET_THUONG": return algoBET_THUONG(cau);
    case "BET_MD5": return algoBET_MD5(cau);
    case "HIT_THUONG": return algoHIT_THUONG(cau);
    case "HIT_MD5": return algoHIT_MD5(cau);
    case "B52_TX": return algoB52_TX(cau);
    case "B52_MD5": return algoB52_MD5(cau);
    case "SICBO_SUN":
    case "SICBO_HITCLUB": return algoSICBO(cau);
    default: return ["Tài", "50%"];
  }
}

/* =========================================================
   UPDATE DATA
========================================================= */
async function updateAllGames() {
  const store = load(DATA_FILE);
  const cauStore = load(CAU_FILE);

  for (const game in GAMES) {
    try {
      const api = (await axios.get(GAMES[game], { timeout: 8000 })).data;

      const phien =
        api.phien_hien_tai ??
        api.current_round ??
        api.round_current ??
        api.phien ??
        null;

      const tong = api.tong ?? api.total ?? null;
      if (!phien || tong === null) continue;

      const ket_qua = tong >= 11 ? "Tài" : "Xỉu";

      if (!store[game]) {
        store[game] = { phien_hien_tai: phien };
        cauStore[game] = "";
      }

      if (phien > store[game].phien_hien_tai) {
        cauStore[game] += ket_qua[0];
      }

      store[game] = {
        game,
        phien_hien_tai: phien,
        tong,
        ket_qua,
        cap_nhat_luc: now()
      };
    } catch {}
  }

  save(DATA_FILE, store);
  save(CAU_FILE, cauStore);
}

setInterval(updateAllGames, 5500);

/* =========================================================
   API
========================================================= */
app.get("/api/dudoan/:game", (req, res) => {
  const game = req.params.game.toUpperCase();
  const store = load(DATA_FILE);
  const cauStore = load(CAU_FILE);

  if (!store[game]) return res.json({ error: "Chưa có dữ liệu" });

  const cau = cauStore[game] || "";
  const api = store[game];
  const [du_doan, do_tin_cay] = algo(game, cau);

  res.json({
    ID: "Bi Nhoi Vip Pro",
    Game: game,
    phien_hien_tai: api.phien_hien_tai,
    tong: api.tong,
    ket_qua: api.ket_qua,
    cau,
    du_doan,
    do_tin_cay
  });
});

app.listen(PORT, () => {
  console.log("🚀 Server chạy cổng", PORT);
});
