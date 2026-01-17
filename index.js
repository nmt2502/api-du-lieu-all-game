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
const load = f => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : {});
const save = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));
const now = () => new Date().toLocaleString("vi-VN");

/* ========= AUTO UPDATE BACKGROUND ========= */
async function updateAllGames() {
  const store = load(DATA_FILE);
  const cauAll = load(CAU_FILE);

  for (const game in GAMES) {
    try {
      const { data: api } = await axios.get(GAMES[game], { timeout: 8000 });

      const phien =
        api.phien_hien_tai ??
        api.current_round ??
        api.round ??
        api.session ??
        null;

      const tong = api.tong ?? api.total ?? null;
      if (phien === null || tong === null) continue;

      const ketQuaChu = tong >= 11 ? "Tài" : "Xỉu";

      if (!store[game]) {
        store[game] = {
          id: "Bi Nhoi Vip Pro",
          game,
          phien_hien_tai: phien,
          ket_qua: ketQuaChu,
          tong,
          cap_nhat_luc: now()
        };
        cauAll[game] = "";
        continue;
      }

      if (phien > store[game].phien_hien_tai) {
        // LƯU CẦU NỘI BỘ: T / X (để thuật toán xử lý)
        cauAll[game] += tong >= 11 ? "T" : "X";
      }

      store[game].phien_hien_tai = phien;
      store[game].ket_qua = ketQuaChu;
      store[game].tong = tong;
      store[game].cap_nhat_luc = now();

    } catch (_) {}
  }

  save(DATA_FILE, store);
  save(CAU_FILE, cauAll);
}

setInterval(updateAllGames, 2500);

/* ========= API ========= */

// all game data
app.get("/api/all", (req, res) => {
  res.json(load(DATA_FILE));
});

// cầu riêng
app.get("/api/cau", (req, res) => {
  res.json(load(CAU_FILE));
});

// ===== API DỰ ĐOÁN (CHỈ TÀI / XỈU) =====
app.get("/api/dudoan/:game", async (req, res) => {
  const game = req.params.game;
  if (!GAMES[game]) return res.json({ error: "Game không tồn tại" });

  try {
    const { data: api } = await axios.get(GAMES[game], { timeout: 8000 });
    const cauAll = load(CAU_FILE)[game] || "";

    const tong = api.tong ?? api.total ?? null;
    const xuc_xac =
      api.xuc_xac ??
      api.dice ??
      api.dices ??
      null;

    const ket_qua =
      tong === null ? null : tong >= 11 ? "Tài" : "Xỉu";

    /* ===== THUẬT TOÁN SO CẦU ===== */
    const last3 = cauAll.slice(-3);
    let du_doan = "Tài";
    let do_tin_cay = 50;

    if (last3 === "TTT") {
      du_doan = "Xỉu";
      do_tin_cay = 75;
    } else if (last3 === "XXX") {
      du_doan = "Tài";
      do_tin_cay = 75;
    }

    res.json({
      ID: "Bi Nhoi Vip Pro",
      Game: game,
      phien: api.phien ?? api.session ?? null,
      xuc_xac,
      tong,
      ket_qua,          // ✅ CHỈ TÀI / XỈU
      phien_hien_tai:
        api.phien_hien_tai ??
        api.current_round ??
        null,
      du_doan,          // ✅ TÀI / XỈU
      do_tin_cay
    });

  } catch (e) {
    res.json({ error: "Không lấy được dữ liệu dự đoán" });
  }
});

app.listen(PORT, () =>
  console.log("🚀 Server chạy cổng", PORT)
);
