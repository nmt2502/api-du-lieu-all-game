import express from "express";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;
const FILE = "./cau_all_game.json";

/* ================= GAME LIST ================= */
const GAMES = {
  lc79_tx: { name: "LC79_THUONG", url: "https://lc79md5-lun8.onrender.com/lc79/tx" },
  lc79_md5: { name: "LC79_MD5", url: "https://lc79md5-lun8.onrender.com/lc79/md5" },
  sunwin: { name: "SUNWIN", url: "https://sunwinsaygex-pcl2.onrender.com/api/sun" },
  sicbo_sun: { name: "SICBO_SUN", url: "https://sicsun-9wes.onrender.com/predict" },
  club789: { name: "789CLUB", url: "https://seven89-wkxd.onrender.com/api/789/tx" },
  hit_tx: { name: "HITCLUB_THUONG", url: "https://hitclub-rksy.onrender.com/api/taixiu" },
  hit_md5: { name: "HITCLUB_MD5", url: "https://hitclub-rksy.onrender.com/api/taixiumd5" },
  sic_hit: { name: "SICBO_HITCLUB", url: "https://sichit-d15h.onrender.com/sicbo" },
  gb68_md5: { name: "68GB_MD5", url: "https://six8-api-5pje.onrender.com/68gbmd5" },
  b52_tx: { name: "B52_THUONG", url: "https://b52-si96.onrender.com/api/taixiu" },
  b52_md5: { name: "B52_MD5", url: "https://b52-si96.onrender.com/api/taixiumd5" },
  betvip_tx: { name: "BETVIP_THUONG", url: "https://betvip.onrender.com/betvip/tx" },
  betvip_md5: { name: "BETVIP_MD5", url: "https://betvip.onrender.com/betvip/md5" }
};

/* ================= MEMORY ================= */
let cauGame = {};
let lastPhien = {};
let gameData = {};

/* ================= LOAD FILE ================= */
if (fs.existsSync(FILE)) {
  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  cauGame = data.cauGame || {};
  lastPhien = data.lastPhien || {};
}

/* ================= SAVE FILE ================= */
function saveFile() {
  fs.writeFileSync(FILE, JSON.stringify({ cauGame, lastPhien }, null, 2));
}

/* ================= UTILS ================= */
function getTX(v) {
  if (!v) return null;
  v = v.toLowerCase();
  if (v.includes("tài")) return "T";
  if (v.includes("xỉu")) return "X";
  return null;
}

function now() {
  return new Date().toLocaleString("vi-VN", { hour12: false });
}

/* ========== UPDATE CAU (ANTI CẦU ẢO) ========= */
function updateCau(game, phien, kq) {
  phien = Number(phien);
  if (!phien || !kq) return;

  // lần đầu chỉ set phiên, KHÔNG cộng
  if (lastPhien[game] === undefined) {
    lastPhien[game] = phien;
    saveFile();
    return;
  }

  // chưa qua phiên mới
  if (phien <= lastPhien[game]) return;

  // qua phiên mới → cộng
  lastPhien[game] = phien;

  if (!cauGame[game]) cauGame[game] = [];
  cauGame[game].push(kq);

  if (cauGame[game].length > 20) cauGame[game].shift();
  saveFile();
}

/* ================= AUTO FETCH ================= */
function autoFetch(key, cfg) {
  setInterval(async () => {
    try {
      const res = await fetch(cfg.url);
      const raw = await res.json();

      const phien_hien_tai =
        raw.phien || raw.round || raw.session || raw.id;

      const ket_qua = getTX(raw.ket_qua || raw.result);

      if (!phien_hien_tai || !ket_qua) return;

      updateCau(key, phien_hien_tai, ket_qua);

      const x1 = raw.xuc_xac_1 || raw.x1 || raw.dice1 || 0;
      const x2 = raw.xuc_xac_2 || raw.x2 || raw.dice2 || 0;
      const x3 = raw.xuc_xac_3 || raw.x3 || raw.dice3 || 0;
      const tong = raw.tong || (x1 + x2 + x3);

      gameData[key] = {
        id: "Bi Nhoi Vip Pro",
        game: cfg.name,
        phien_hien_tai: Number(phien_hien_tai),
        phien_cuoi: lastPhien[key],
        ket_qua,
        tong,
        cau: (cauGame[key] || []).join(""),
        cap_nhat_luc: now()
      };
    } catch {}
  }, 2500);
}

/* ================= START ================= */
Object.keys(GAMES).forEach(k => autoFetch(k, GAMES[k]));

/* ================= API ================= */
app.get("/api/:game", (req, res) => {
  const key = req.params.game;
  res.json(gameData[key] || { error: "Game chưa có dữ liệu" });
});

app.get("/api", (req, res) => {
  const out = {};
  for (const k in gameData) {
    out[GAMES[k].name] = gameData[k];
  }
  res.json(out);
});

app.listen(PORT, () => {
  console.log("🔥 ALL GAME API RUNNING – PORT " + PORT);
});
