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

  "68GB_MD5": "https://six8-api-5pje.onrender.com/68gbmd5"
};

/* ========= UTIL ========= */
function loadJSON(file, def = {}) {
  if (!fs.existsSync(file)) return def;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function now() {
  return new Date().toLocaleString("vi-VN");
}

/* ========= CORE UPDATE ========= */
async function updateAllGames() {
  const store = loadJSON(DATA_FILE, {});
  const cauAll = loadJSON(CAU_FILE, {});

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

      const tong =
        api.tong ??
        api.total ??
        null;

      if (phien_hien_tai === null || tong === null) continue;

      const ket_qua_moi = tong >= 11 ? "T" : "X";

      /* INIT */
      if (!store[game]) {
        store[game] = {
          id: "Bi Nhoi Vip Pro",
          game,
          phien_hien_tai,
          phien_cuoi: phien_hien_tai - 1,
          ket_qua: ket_qua_moi,
          tong,
          cap_nhat_luc: now()
        };
        if (!cauAll[game]) cauAll[game] = "";
        continue;
      }

      const phien_cu = store[game].phien_hien_tai;
      const ket_qua_cu = store[game].ket_qua;

      /* ===== QUA PHIÊN THẬT ===== */
      if (phien_hien_tai > phien_cu) {
        cauAll[game] = (cauAll[game] || "") + ket_qua_cu;
        store[game].phien_cuoi = phien_cu;
      }

      /* UPDATE LIVE */
      store[game].phien_hien_tai = phien_hien_tai;
      store[game].ket_qua = ket_qua_moi;
      store[game].tong = tong;
      store[game].cap_nhat_luc = now();

    } catch (e) {
      // API lỗi → bỏ qua hoàn toàn
      continue;
    }
  }

  saveJSON(DATA_FILE, store);
  saveJSON(CAU_FILE, cauAll);
}

/* ========= AUTO BACKGROUND ========= */
setInterval(updateAllGames, 2500);

/* ========= API ========= */
app.get("/api/all", (req, res) => {
  const data = loadJSON(DATA_FILE, {});
  const cau = loadJSON(CAU_FILE, {});
  res.json({ data, cau });
});

app.listen(PORT, () =>
  console.log("🚀 Server chạy cổng", PORT)
);
