const express = require("express");
const fs = require("fs");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = "./data.json";

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
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function now() {
  return new Date().toLocaleString("vi-VN");
}

/* ========= CORE UPDATE ========= */
async function updateAllGames() {
  const store = loadData();

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

      const ket_qua = tong >= 11 ? "T" : "X";

      /* INIT */
      if (!store[game]) {
        store[game] = {
          id: "Bi Nhoi Vip Pro",
          game,
          phien_hien_tai,
          phien_cuoi: phien_hien_tai - 1,
          ket_qua,
          tong,
          cau: "",
          cap_nhat_luc: now()
        };
        continue;
      }

      /* ===== CHỈ KHI QUA PHIÊN ===== */
      if (phien_hien_tai > store[game].phien_hien_tai) {
        store[game].cau += ket_qua; // T / X
        store[game].phien_cuoi = phien_hien_tai - 1;
      }

      store[game].phien_hien_tai = phien_hien_tai;
      store[game].ket_qua = ket_qua;
      store[game].tong = tong;
      store[game].cap_nhat_luc = now();

    } catch (e) {
      // API lỗi → bỏ qua, KHÔNG cộng cầu
      continue;
    }
  }

  saveData(store);
}

/* ========= AUTO BACKGROUND ========= */
setInterval(updateAllGames, 2500);

/* ========= API ========= */
app.get("/api/all", (req, res) => {
  res.json(loadData());
});

app.listen(PORT, () =>
  console.log("🚀 Server chạy cổng", PORT)
);
