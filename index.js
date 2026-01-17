const express = require("express");
const fs = require("fs");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = "./data.json";
const CAU_FILE = "./cau_all_game.json";

/* ========= GAME LIST ========= */
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

/* ========= UTIL ========= */
const load = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : {});
const save = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));
const now = () => new Date().toLocaleString("vi-VN");

/* ========= AUTO UPDATE (BACKGROUND) ========= */
async function updateAllGames() {
  const store = load(DATA_FILE);
  const cauStore = load(CAU_FILE);

  for (const game in GAMES) {
    try {
      const res = await axios.get(GAMES[game], { timeout: 8000 });
      const api = res.data;

      const phien_hien_tai =
        api.phien_hien_tai ??
        api.current_round ??
        api.round_current ??
        api.phien ??
        null;

      const tong = api.tong ?? api.total ?? null;
      if (phien_hien_tai === null || tong === null) continue;

      const ket_qua = tong >= 11 ? "Tài" : "Xỉu";

      if (!store[game]) {
        store[game] = {
          id: "Bi Nhoi Vip Pro",
          game,
          phien_hien_tai,
          phien_cuoi: phien_hien_tai - 1,
          ket_qua,
          tong,
          cap_nhat_luc: now()
        };
        cauStore[game] = "";
        continue;
      }

      // QUA PHIÊN → CỘNG CẦU
      if (phien_hien_tai > store[game].phien_hien_tai) {
        cauStore[game] += ket_qua[0]; // T hoặc X (chỉ lưu cầu)
        store[game].phien_cuoi = phien_hien_tai - 1;
      }

      store[game].phien_hien_tai = phien_hien_tai;
      store[game].ket_qua = ket_qua;
      store[game].tong = tong;
      store[game].cap_nhat_luc = now();

    } catch (e) {
      continue;
    }
  }

  save(DATA_FILE, store);
  save(CAU_FILE, cauStore);
}

/* ========= AUTO CHẠY 2.5s ========= */
setInterval(updateAllGames, 2500);

/* ========= API ========= */

// ALL GAME
app.get("/api/all", (req, res) => {
  res.json(load(DATA_FILE));
});

// CAU RIÊNG
app.get("/api/cau", (req, res) => {
  res.json(load(CAU_FILE));
});

// DỰ ĐOÁN THEO GAME
app.get("/api/dudoan/:game", async (req, res) => {
  const game = req.params.game.toUpperCase();
  if (!GAMES[game]) return res.json({ error: "Game không tồn tại" });

  try {
    const api = (await axios.get(GAMES[game])).data;
    const cau = load(CAU_FILE)[game] || "";

    const tong = api.tong ?? api.total ?? null;
    const ket_qua = tong >= 11 ? "Tài" : "Xỉu";

    const xuc_xac =
      api.xuc_xac_1 && api.xuc_xac_2 && api.xuc_xac_3
        ? [api.xuc_xac_1, api.xuc_xac_2, api.xuc_xac_3]
        : Array.isArray(api.xuc_xac)
        ? api.xuc_xac
        : null;

    // DỰ ĐOÁN ĐƠN GIẢN THEO CẦU
    let du_doan = "Tài";
    let do_tin_cay = 50;

    if (cau.endsWith("TT")) {
      du_doan = "Xỉu";
      do_tin_cay = 65;
    } else if (cau.endsWith("XX")) {
      du_doan = "Tài";
      do_tin_cay = 65;
    }

    res.json({
      ID: "Bi Nhoi Vip Pro",
      Game: game,
      phien: api.phien ?? api.round ?? null,
      xuc_xac,
      tong,
      ket_qua,
      phien_hien_tai: api.phien_hien_tai ?? null,
      du_doan,
      do_tin_cay
    });
  } catch {
    res.json({ error: "Không lấy được API gốc" });
  }
});

app.listen(PORT, () =>
  console.log("🚀 Server chạy cổng", PORT)
);
