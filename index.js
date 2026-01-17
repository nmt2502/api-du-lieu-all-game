const express = require("express");
const fs = require("fs");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = "./data.json";
const CAU_FILE = "./cau_all_game.json";
const TTOAN_SUN = require("./ttoansun.json");

/* ================= GAME LIST ================= */
const GAMES = {
  LC79_THUONG: "https://lc79md5-lun8.onrender.com/lc79/tx",
  LC79_MD5: "https://lc79md5-lun8.onrender.com/lc79/md5",

  SUNWIN: "https://sunwinsaygex-pcl2.onrender.com/api/sun",
  SICBO_SUN: "https://sicsun-9wes.onrender.com/predict",

  "789CLUB": "https://seven89-wkxd.onrender.com/api/789/tx",

  HITCLUB_THUONG: "https://hitclub-rksy.onrender.com/api/taixiu",
  HITCLUB_MD5: "https://hitclub-rksy.onrender.com/api/taixiumd5",
  SICBO_HITCLUB: "https://sichit-d15h.onrender.com/sicbo",

  B52_THUONG: "https://b52-si96.onrender.com/api/taixiu",
  B52_MD5: "https://b52-si96.onrender.com/api/taixiumd5",

  BETVIP_THUONG: "https://betvip.onrender.com/betvip/tx",
  BETVIP_MD5: "https://betvip.onrender.com/betvip/md5",

  "68GB_MD5": "https://six8-api-5pje.onrender.com/68gbmd5",

  LUCKYWIN_TX: "https://luckywingugu.onrender.com/luck8/tx",
  LUCKYWIN_MD5: "https://luckywingugu.onrender.com/luck/md5"
};

/* ================= UTIL ================= */
const load = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : {});
const save = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));
const now = () => new Date().toLocaleString("vi-VN");

/* ================= THUẬT TOÁN ================= */

// LC79
function algoLC79(cau) {
  if (cau.endsWith("TTT")) return ["Xỉu", 70];
  if (cau.endsWith("XXX")) return ["Tài", 70];
  return ["Tài", 55];
}

// HITCLUB
function algoHIT(cau) {
  const t = (cau.match(/T/g) || []).length;
  const x = (cau.match(/X/g) || []).length;
  return t > x ? ["Xỉu", 60] : ["Tài", 60];
}

// SUNWIN (fallback)
function algoSUN(cau) {
  if (cau.endsWith("TXTX")) return ["Xỉu", 65];
  if (cau.endsWith("XTXT")) return ["Tài", 65];
  return ["Tài", 55];
}

// B52
function algoB52(cau) {
  if (cau.endsWith("TT")) return ["Xỉu", 60];
  if (cau.endsWith("XX")) return ["Tài", 60];
  return ["Tài", 50];
}

// BETVIP
function algoBET(cau) {
  if (!cau) return ["Tài", 50];
  return cau.slice(-1) === "T" ? ["Tài", 55] : ["Xỉu", 55];
}

// 789
function algo789(cau) {
  if (cau.endsWith("TTX")) return ["Xỉu", 65];
  if (cau.endsWith("XXT")) return ["Tài", 65];
  return ["Tài", 50];
}

// LUCKY
function algoLUCKY(cau) {
  if (cau.endsWith("TTTT")) return ["Xỉu", 75];
  if (cau.endsWith("XXXX")) return ["Tài", 75];
  return ["Tài", 55];
}

/* ================= MAP GAME → ALGO ================= */
function algo(game, cau) {
  // ✅ SUNWIN ƯU TIÊN FILE TTOAN
  if (game === "SUNWIN") {
    const key = cau.slice(-8);
    if (TTOAN_SUN[key]) {
      return [TTOAN_SUN[key], 72];
    }
    return algoSUN(cau);
  }

  if (game.startsWith("LC79")) return algoLC79(cau);
  if (game.startsWith("HITCLUB")) return algoHIT(cau);
  if (game.startsWith("SICBO_HITCLUB")) return algoHIT(cau);
  if (game.startsWith("B52")) return algoB52(cau);
  if (game.startsWith("BETVIP")) return algoBET(cau);
  if (game.startsWith("789")) return algo789(cau);
  if (game.startsWith("68GB")) return algoB52(cau);
  if (game.startsWith("LUCKY")) return algoLUCKY(cau);

  return ["Tài", 50];
}

/* ================= SICBO VỊ – KHÔNG RANDOM ================= */
function tinhViSicboTheoCongThuc(tong_truoc, du_doan) {
  const TAI = [11, 12, 13, 14, 15, 16, 17];
  const XIU = [4, 5, 6, 7, 8, 9, 10];

  const pool = du_doan === "Tài" ? TAI : XIU;
  const base = tong_truoc % pool.length;

  return [
    pool[base],
    pool[(base + 2) % pool.length],
    pool[(base + 4) % pool.length]
  ];
}

/* ================= BACKGROUND UPDATE ================= */
async function updateAllGames() {
  const store = load(DATA_FILE);
  const cauStore = load(CAU_FILE);

  for (const game in GAMES) {
    try {
      const api = (await axios.get(GAMES[game], { timeout: 8000 })).data;

      const phien_hien_tai =
        api.phien_hien_tai ??
        api.current_round ??
        api.round_current ??
        api.phien ??
        null;

      const tong = api.tong ?? api.total ?? null;
      if (!phien_hien_tai || tong === null) continue;

      const ket_qua = tong >= 11 ? "Tài" : "Xỉu";

      if (!store[game]) {
        store[game] = {
          game,
          phien_hien_tai,
          phien_cuoi: phien_hien_tai - 1,
          tong,
          ket_qua,
          cap_nhat_luc: now()
        };
        cauStore[game] = "";
        continue;
      }

      if (phien_hien_tai > store[game].phien_hien_tai) {
        cauStore[game] += ket_qua[0];
        store[game].phien_cuoi = phien_hien_tai - 1;
      }

      store[game].phien_hien_tai = phien_hien_tai;
      store[game].tong = tong;
      store[game].ket_qua = ket_qua;
      store[game].cap_nhat_luc = now();
    } catch {}
  }

  save(DATA_FILE, store);
  save(CAU_FILE, cauStore);
}

setInterval(updateAllGames, 5500);

/* ================= API ================= */
app.get("/api/dudoan/:game", (req, res) => {
  const game = req.params.game.toUpperCase();
  const store = load(DATA_FILE);
  const cauStore = load(CAU_FILE);

  if (!store[game]) return res.json({ error: "Chưa có dữ liệu" });

  const cau = cauStore[game] || "";
  const api = store[game];

  const [du_doan, do_tin_cay] = algo(game, cau);

  let dudoan_vi;
  if (game === "SICBO_SUN" || game === "SICBO_HITCLUB") {
    dudoan_vi = tinhViSicboTheoCongThuc(api.tong, du_doan);
  }

  res.json({
    ID: "Bi Nhoi Vip Pro",
    Game: game,
    phien: api.phien_cuoi,
    tong: api.tong,
    ket_qua: api.ket_qua,
    phien_hien_tai: api.phien_hien_tai,
    du_doan,
    ...(dudoan_vi ? { dudoan_vi } : {}),
    do_tin_cay
  });
});

app.listen(PORT, () => {
  console.log("Api Chạy Tại Cổng", PORT);
});
