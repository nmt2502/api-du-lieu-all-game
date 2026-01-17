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

/* ========= AUTO UPDATE ========= */
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
      if (phien === null || tong === null) continue;

      const ket_qua = tong >= 11 ? "Tài" : "Xỉu";

      if (!store[game]) {
        store[game] = {
          id: "Bi Nhoi Vip Pro",
          game,
          phien_hien_tai: phien,
          phien_cuoi: phien - 1,
          ket_qua,
          tong,
          cap_nhat_luc: now()
        };
        cauStore[game] = "";
        continue;
      }

      if (phien > store[game].phien_hien_tai) {
        cauStore[game] += ket_qua[0]; // lưu T / X
        store[game].phien_cuoi = phien - 1;
      }

      store[game].phien_hien_tai = phien;
      store[game].ket_qua = ket_qua;
      store[game].tong = tong;
      store[game].cap_nhat_luc = now();

    } catch {}
  }

  save(DATA_FILE, store);
  save(CAU_FILE, cauStore);
}

setInterval(updateAllGames, 2500);

/* ========= THUẬT TOÁN RIÊNG TỪNG GAME ========= */
function algo(game, cau) {
  switch (game) {

    case "LC79_THUONG":
      if (cau.endsWith("TTT")) return { du_doan: "Xỉu", do_tin_cay: 72 };
      if (cau.endsWith("XXX")) return { du_doan: "Tài", do_tin_cay: 72 };
      break;

    case "LC79_MD5":
      if (cau.endsWith("TX")) return { du_doan: "Tài", do_tin_cay: 63 };
      if (cau.endsWith("XT")) return { du_doan: "Xỉu", do_tin_cay: 63 };
      break;

    case "SUNWIN":
      if (cau.endsWith("TXTX")) return { du_doan: "Tài", do_tin_cay: 70 };
      break;

    case "SICBO_SUN":
      if (cau.endsWith("XX")) return { du_doan: "Tài", do_tin_cay: 66 };
      break;

    case "789CLUB":
      if (cau.endsWith("TTX")) return { du_doan: "Xỉu", do_tin_cay: 69 };
      break;

    case "HITCLUB_THUONG":
      if (cau.endsWith("XXX")) return { du_doan: "Tài", do_tin_cay: 74 };
      break;

    case "HITCLUB_MD5":
      if (cau.endsWith("TT")) return { du_doan: "Xỉu", do_tin_cay: 65 };
      break;

    case "SICBO_HITCLUB":
      if (cau.endsWith("TXT")) return { du_doan: "Tài", do_tin_cay: 67 };
      break;

    case "B52_THUONG":
      if (cau.endsWith("TT")) return { du_doan: "Xỉu", do_tin_cay: 68 };
      break;

    case "B52_MD5":
      if (cau.endsWith("XX")) return { du_doan: "Tài", do_tin_cay: 68 };
      break;

    case "BETVIP_THUONG":
      if (cau.endsWith("T")) return { du_doan: "Tài", do_tin_cay: 60 };
      break;

    case "BETVIP_MD5":
      if (cau.endsWith("X")) return { du_doan: "Xỉu", do_tin_cay: 60 };
      break;

    case "68GB_MD5":
      if (cau.endsWith("TTTT")) return { du_doan: "Xỉu", do_tin_cay: 76 };
      break;

    case "LUCKYWIN_TX":
      if (cau.endsWith("XXXX")) return { du_doan: "Tài", do_tin_cay: 78 };
      break;

    case "LUCKYWIN_MD5":
      if (cau.endsWith("TTTT")) return { du_doan: "Xỉu", do_tin_cay: 78 };
      break;
  }

  return { du_doan: "Tài", do_tin_cay: 50 };
}

/* ========= API ========= */
app.get("/api/all", (req, res) => res.json(load(DATA_FILE)));
app.get("/api/cau", (req, res) => res.json(load(CAU_FILE)));

app.get("/api/dudoan/:game", async (req, res) => {
  const game = req.params.game.toUpperCase();
  if (!GAMES[game]) return res.json({ error: "Game không tồn tại" });

  const api = (await axios.get(GAMES[game])).data;
  const cau = load(CAU_FILE)[game] || "";

  const tong = api.tong ?? api.total ?? null;
  const ket_qua = tong >= 11 ? "Tài" : "Xỉu";

  const xuc_xac =
    api.xuc_xac_1 && api.xuc_xac_2 && api.xuc_xac_3
      ? [api.xuc_xac_1, api.xuc_xac_2, api.xuc_xac_3]
      : null;

  const { du_doan, do_tin_cay } = algo(game, cau);

  res.json({
    ID: "Bi Nhoi Vip Pro",
    Game: game,
    phien: api.phien ?? null,
    xuc_xac,
    tong,
    ket_qua,
    phien_hien_tai: api.phien_hien_tai ?? null,
    du_doan,
    do_tin_cay
  });
});

app.listen(PORT, () =>
  console.log("🚀 Server chạy cổng", PORT)
);
