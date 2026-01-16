const express = require("express");
const fs = require("fs");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = "./data.json";

/* ========= DANH SÁCH GAME ========= */
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

/* ========= LOAD / SAVE ========= */
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

/* ========= MAP KẾT QUẢ -> T / X ========= */
function mapKetQua(raw) {
  if (!raw) return null;
  const s = raw.toString().toLowerCase();

  if (s === "t" || s.includes("tài")) return "T";
  if (s === "x" || s.includes("xỉu")) return "X";

  return null;
}

/* ========= PARSE PHIÊN CHUẨN ========= */
function parsePhien(api) {
  const phienHienTai =
    api.phien_hien_tai ??
    api.current_round ??
    api.round_current ??
    null;

  const phienCuoi =
    api.phien ??
    api.round ??
    api.session ??
    null;

  return {
    phienHienTai,
    phienDaQua:
      phienCuoi !== null && phienHienTai !== null && phienCuoi < phienHienTai
        ? phienCuoi
        : null
  };
}

/* ========= UPDATE ALL GAME ========= */
async function updateAllGames() {
  const store = loadData();

  for (const game in GAMES) {
    try {
      const res = await axios.get(GAMES[game], { timeout: 8000 });
      const api = res.data;

      const { phienHienTai, phienDaQua } = parsePhien(api);

      const tong =
        api.tong ??
        api.total ??
        null;

      const rawKetQua =
        api.ket_qua ??
        api.result ??
        (tong !== null ? (tong >= 11 ? "T" : "X") : null);

      const ketQua = mapKetQua(rawKetQua);

      /* ===== INIT GAME ===== */
      if (!store[game]) {
        store[game] = {
          id: "Bi Nhoi Vip Pro",
          game,
          phien_hien_tai: phienHienTai,
          phien_cuoi: phienDaQua,
          ket_qua: ketQua,
          tong,
          cau: "",
          cap_nhat_luc: now()
        };
        continue;
      }

      /* ===== UPDATE LIVE ===== */
      store[game].phien_hien_tai = phienHienTai;
      store[game].ket_qua = ketQua;
      store[game].tong = tong;
      store[game].cap_nhat_luc = now();

      /* ===== CỘNG CẦU KHI QUA PHIÊN ===== */
      if (
        phienDaQua !== null &&
        store[game].phien_cuoi !== phienDaQua
      ) {
        if (ketQua) {
          store[game].cau += ketQua; // CHỈ T / X
        }
        store[game].phien_cuoi = phienDaQua;
      }

    } catch (err) {
      console.log("❌ Lỗi game:", game);
    }
  }

  saveData(store);
}

/* ========= AUTO UPDATE 2.5s ========= */
setInterval(updateAllGames, 2500);

/* ========= API OUTPUT ========= */
app.get("/api/all", (req, res) => {
  res.json(loadData());
});

app.listen(PORT, () =>
  console.log("🚀 Server chạy cổng", PORT)
);
