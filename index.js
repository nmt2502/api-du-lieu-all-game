const express = require("express");
const fs = require("fs");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = "./data.json";
const CAU_FILE = "./cau_all_game.json";

/* ================= GAME LIST ================= */
const GAMES = {
  LC79_THUONG: "https://lc79md5-lun8.onrender.com/lc79/tx",
  LC79_MD5: "https://lc79md5-lun8.onrender.com/lc79/md5",

  SUNWIN: "https://sunwinsaygex-pcl2.onrender.com/api/sun",

  "789CLUB": "https://seven89-wkxd.onrender.com/api/789/tx",

  HITCLUB_THUONG: "https://hitclub-rksy.onrender.com/api/taixiu",
  HITCLUB_MD5: "https://hitclub-rksy.onrender.com/api/taixiumd5",

  B52_THUONG: "https://b52-si96.onrender.com/api/taixiu",
  B52_MD5: "https://b52-si96.onrender.com/api/taixiumd5",

  BETVIP_THUONG: "https://betvip.onrender.com/betvip/tx",
  BETVIP_MD5: "https://betvip.onrender.com/betvip/md5",

  LUCKYWIN_TX: "https://luckywingugu.onrender.com/luck8/tx",
  LUCKYWIN_MD5: "https://luckywingugu.onrender.com/luck/md5",

  /* ===== ADD ===== */
  "68GB_MD5": "https://six8-api-5pje.onrender.com/68gbmd5",
  SICBO_HITCLUB: "https://sichit-d15h.onrender.com/sicbo",
  SICBO_SUN: "https://sicsun-9wes.onrender.com/predict"
};

/* ================= UTIL ================= */
const load = (f) =>
  fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
const save = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));
const now = () => new Date().toLocaleString("vi-VN");

/* ================= THUẬT TOÁN 68GB ================= */

const SUNWIN_PATTERNS = {
  "1-1":   { pattern: ["T","X","T","X"], probability: 0.7,  strength: 0.8 },
  "1-2-1": { pattern: ["T","X","X","T"], probability: 0.65, strength: 0.75 },
  "2-1-2": { pattern: ["T","T","X","T","T"], probability: 0.68, strength: 0.78 },
  "3-1":   { pattern: ["T","T","T","X"], probability: 0.72, strength: 0.82 },
  "1-3":   { pattern: ["T","X","X","X"], probability: 0.72, strength: 0.82 },
  "2-2":   { pattern: ["T","T","X","X"], probability: 0.66, strength: 0.76 },
  "2-3":   { pattern: ["T","T","X","X","X"], probability: 0.71, strength: 0.81 },
  "3-2":   { pattern: ["T","T","T","X","X"], probability: 0.73, strength: 0.83 },
  "4-1":   { pattern: ["T","T","T","T","X"], probability: 0.76, strength: 0.86 },
  "1-4":   { pattern: ["T","X","X","X","X"], probability: 0.76, strength: 0.86 },
  "4":     { pattern: ["T","T","T","T,"], probability: 0.77, strength: 0.87 },
  "4":     { pattern: ["X","X","X","X",], probability: 0.77, strength: 0.87 },
  "4-5":   { pattern: ["T","T","T","T","X","X","X","X","X",], probability: 0.79, strength: 0.89 },
  "5-4":   { pattern: ["X","X","X","X","X","T","T","T","T",], probability: 0.79, strength: 0.89 },
  "6-6":   { pattern: ["T","T","T","T","T","T","X","X","X","X","X","X",], probability: 0.81, strength: 0.91 },
  "7-3":   { pattern: ["X","X","X","X","X","X","X","T","T","T",], probability: 0.82, strength: 0.92 },
  "7-3":   { pattern: ["T","T","T","T","T","T","T","X","X","X",], probability: 0.82, strength: 0.92 },
  "3-7":   { pattern: ["X","X","X","T","T","T","T","T","T","T",], probability: 0.84, strength: 0.94 },
  "1-2-3-3": { pattern: ["T","X","X","T","T","T","X","X","X",], probability: 0.77, strength: 0.97 },
  "1-2-3-3": { pattern: ["X","T","T","X","X","X","T","T","T",], probability: 0.77, strength: 0.97 },
  "1-3-3":   { pattern: ["T","X","X","X","T","T","T",], probability: 0.87, strength: 0.77 },
  "1-3-3":   { pattern: ["X","T","T","T","X","X","X",], probability: 0.87, strength: 0.77 },
  "1-2-1-3-4": { pattern: ["T","X","X","T","X","X","X","T","T","T","T",], probability: 0.89, strength: 0.99 }
};


function algoSUNWIN(cau) {
  if (!cau || cau.length < 4) return ["Chờ 5-7 Tay", "0%"];

  let best = null;
  let bestLen = 0;

  for (const k in SUNWIN_PATTERNS) {
    const pat = SUNWIN_PATTERNS[k].pattern.join("");
    if (cau.includes(pat) && pat.length > bestLen) {
      best = SUNWIN_PATTERNS[k];
      bestLen = pat.length;
    }
  }

  if (!best) return ["Chờ Lấy Dữ Liệu Đưa Ra Dự Đoán", "0%"];

  const du_doan = cau.slice(-1) === "T" ? "Xỉu" : "Tài";
  const percent = Math.round(best.probability * best.strength * 100);

  return [du_doan, percent + "%"];
}

/* ================= THUẬT TOÁN KHÁC ================= */

function algoLC79(cau) {
  if (cau.endsWith("TTT")) return ["Xỉu", "70%"];
  if (cau.endsWith("XXX")) return ["Tài", "70%"];
  return ["Tài", "55%"];
}

function algoHIT(cau) {
  const t = (cau.match(/T/g) || []).length;
  const x = (cau.match(/X/g) || []).length;
  return t > x ? ["Xỉu", "60%"] : ["Tài", "60%"];
}

function algoB52(cau) {
  if (cau.endsWith("TT")) return ["Xỉu", "60%"];
  if (cau.endsWith("XX")) return ["Tài", "60%"];
  return ["Tài", "50%"];
}

function algoBET(cau) {
  if (!cau) return ["Tài", "50%"];
  return cau.slice(-1) === "T" ? ["Tài", "55%"] : ["Xỉu", "55%"];
}

function algo789(cau) {
  if (cau.endsWith("TTX")) return ["Xỉu", "65%"];
  if (cau.endsWith("XXT")) return ["Tài", "65%"];
  return ["Tài", "50%"];
}

function algoLUCKY(cau) {
  if (cau.endsWith("TTTT")) return ["Xỉu", "75%"];
  if (cau.endsWith("XXXX")) return ["Tài", "75%"];
  return ["Tài", "55%"];
}

/* ================= MAP GAME → ALGO ================= */

function algo(game, cau) {
  if (game === "SUNWIN") return algoSUNWIN(cau);
  if (game.startsWith("LC79")) return algoLC79(cau);
  if (game.startsWith("HITCLUB")) return algoHIT(cau);
  if (game.startsWith("SICBO")) return algoHIT(cau);
  if (game.startsWith("B52")) return algoB52(cau);
  if (game.startsWith("68GB")) return algoB52(cau);
  if (game.startsWith("BETVIP")) return algoBET(cau);
  if (game.startsWith("789")) return algo789(cau);
  if (game.startsWith("LUCKY")) return algoLUCKY(cau);
  return ["Tài", "50%"];
}

/* ================= UPDATE DATA ================= */

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

/* ================= API ================= */

app.get("/api/all", (req, res) => res.json(load(DATA_FILE)));
app.get("/api/cau", (req, res) => res.json(load(CAU_FILE)));

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
