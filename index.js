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
  /* ================= SẢNH BACCRAT ================= */
  Baccarat: "https://bcrapj-9ska.onrender.com/sexy/all",
  /* ================= GAME SICBO ================= */
  SICBO_SUN: "https://sicsun-9wes.onrender.com/predict",
  SICBO_HITCLUB: "https://sichit-d15h.onrender.com/sicbo"
};

/* ================= UTIL ================= */
const load = (f) =>
  fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
const save = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));
const now = () => new Date().toLocaleString("vi-VN");

/* ================= UTIL – SICBO ================= */
function normalizeCauTX(cau) {
  if (!Array.isArray(cau) || cau.length === 0) return "";

  // ✅ Trường hợp cau đã là ["T","X","T","X"]
  if (typeof cau[0] === "string") {
    return cau.join("");
  }

  // ✅ Trường hợp cau là tổng số (VD: [11, 9, 14, 8])
  // hoặc object { tong: number }
  return cau
    .map(v => {
      if (typeof v === "number") {
        return v >= 11 ? "T" : "X";
      }
      if (typeof v === "object" && typeof v.tong === "number") {
        return v.tong >= 11 ? "T" : "X";
      }
      return "";
    })
    .join("");
}

/* ================= UTIL – SICBO VỊ (KHÔNG RANDOM) ================= */
function genSicboVi(lastTong, du_doan) {
  const min = du_doan === "Tài" ? 11 : 4;
  const max = du_doan === "Tài" ? 17 : 10;

  // Lệch 1 nhịp so với kết quả trước
  let base = du_doan === "Tài"
    ? lastTong + 1
    : lastTong - 1;

  if (base < min) base = min;
  if (base > max) base = max;

  let vi = du_doan === "Tài"
    ? [base, base + 2, base + 3, base + 4]
    : [base, base - 2, base - 3, base - 4];

  // Lọc biên + trùng
  vi = [...new Set(vi.filter(v => v >= min && v <= max))];

  // Bù đủ 4 vị nếu thiếu
  let fill = du_doan === "Tài" ? min : max;
  while (vi.length < 4) {
    if (!vi.includes(fill)) vi.push(fill);
    fill = du_doan === "Tài" ? fill + 1 : fill - 1;
  }

  return vi.sort((a, b) => a - b);
}

/* =========================================================
   CORE ENGINE – SO KHỚP CHUỖI CON
========================================================= */
function runAlgo(cau, PATTERNS) {
  if (!Array.isArray(cau) || cau.length < 4) {
    return ["Chờ Đủ Dữ Liệu", "0%"];
  }

  let best = null;
  let bestLen = 0;

  const cauStr = cau.join("");

  for (const key in PATTERNS) {
    for (const item of PATTERNS[key]) {
      const str = item.pattern.join("");

      if (cauStr.includes(str) && str.length > bestLen) {
        best = item;
        bestLen = str.length;
      }
    }
  }

  if (!best) {
    return ["Chờ Đủ Dữ Liệu", "0%"];
  }

  const last = cau[cau.length - 1];
  const du_doan = last === "T" ? "Xỉu" : "Tài";
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

  "4-1-4": [
    { pattern: ["T","T","T","T","X","T","T","T","T"], probability: 0.56, strength: 0.66 },
    { pattern: ["X","X","X","X","T","X","X","X","X"], probability: 0.76, strength: 0.66 }
  ],

  "1-4": [
    { pattern: ["T","X","X","X","X"], probability: 0.76, strength: 0.86 },
    { pattern: ["X","T","T","T","T"], probability: 0.76, strength: 0.86 }
  ],

  "CAU_BET": [
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

  "4-1-5-1-1": [
    { pattern: ["T","T","T","T","X","T","T","T","T","T","X","T"], probability: 0.87, strength: 0.77 },
    { pattern: ["X","X","X","X","T","X","X","X","X","X","T","X"], probability: 0.87, strength: 0.77 }
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

const LUCK_MD5_PATTERNS = {
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

const algoLUCK = (cau) => runAlgo(cau, LUCK_MD5_PATTERNS);

/* ================= THUẬT TOÁN BETVIP THƯỜNG================= */

/* ================= THUẬT TOÁN BETVIP MD5================= */

/* ================= THUẬT TOÁN HITCLUB THƯỜNG================= */

/* ================= THUẬT TOÁN HITCLUB MD5================= */

/* ================= THUẬT TOÁN B52 THƯỜNG================= */

/* ================= THUẬT TOÁN B52 MD5================= */

/* ================= THUẬT TOÁN SICBO SUNWIN ================= */
const SICBO_SUN_PATTERNS = {
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
    { pattern: ["X","T","T","T","T"], probability: 0.76, strength: 0.86 },
  ],
  "1-3-2": [
    { pattern: ["T","X","X","X","T","T"], probability: 0.77, strength: 0.87 },
    { pattern: ["X","T","T","T","X","X"], probability: 0.77, strength: 0.87 },
  ],
  "2-2-6": [
    { pattern: ["X","X","T","T","X","X","X","X","X","X"], probability: 0.78, strength: 0.88 },
    { pattern: ["T","T","X","X","T","T","T","T","T","T"], probability: 0.78, strength: 0.88 },
  ],
  "1-1-2-1": [
    { pattern: ["T","X","T","T","X"], probability: 0.79, strength: 0.89 },
    { pattern: ["X","T","X","X","T"], probability: 0.79, strength: 0.89 },
  ],
  "6-3-3-2": [
    { pattern: ["T","T","T","T","T","T","X","X","X","T","T","T","X","X"], probability: 0.80, strength: 0.90 },
    { pattern: ["X","X","X","X","X","X","T","T","T","X","X","X","T","T"], probability: 0.80, strength: 0.90 },
  ],
  "1-1-6": [
    { pattern: ["T","X","T","X","T","T","T","T","T","T"], probability: 0.81, strength: 0.91 },
    { pattern: ["X","T","X","T","X","X","X","X","X","X"], probability: 0.81, strength: 0.91 },
  ],
  "1-1": [
    { pattern: ["T","X","T","X"], probability: 0.82, strength: 0.92 },
    { pattern: ["X","T","X","T"], probability: 0.82, strength: 0.92 },
  ],
};

function algoSICBO_SUN_PATTERNS(cau) {
  const cauStr = normalizeCauTX(cau);

  if (!cauStr || cauStr.length < 4) {
    return {
      du_doan: "Chờ Đủ Dữ Liệu",
      dudoan_vi: [],
      do_tin_cay: "0%"
    };
  }

  let best = null;
  let bestLen = 0;
  let bestScore = 0;

  for (const key in SICBO_SUN_PATTERNS) {
    for (const item of SICBO_SUN_PATTERNS[key]) {
      const pStr = item.pattern.join("");

      if (cauStr.endsWith(pStr)) {
        const score =
          pStr.length * 2 +
          item.probability * 100 +
          item.strength * 100;

        if (pStr.length > bestLen || score > bestScore) {
          best = item;
          bestLen = pStr.length;
          bestScore = score;
        }
      }
    }
  }

  // 🔁 Đảo nhịp TX
  const lastTX = cauStr[cauStr.length - 1];
  const du_doan = lastTX === "T" ? "Xỉu" : "Tài";

  // ✅ LẤY TỔNG PHIÊN TRƯỚC
  const lastItem = cau[cau.length - 1];
  const lastTong =
    typeof lastItem === "number"
      ? lastItem
      : typeof lastItem === "object" && typeof lastItem.tong === "number"
        ? lastItem.tong
        : 11;

  // ✅ GỌI ĐÚNG HÀM
  const dudoan_vi = genSicboVi(lastTong, du_doan);

  const percent = best
    ? Math.round((best.probability * 0.6 + best.strength * 0.4) * 100)
    : 60;

  return {
    du_doan,
    dudoan_vi,
    do_tin_cay: percent + "%"
  };
}
/* ================= THUẬT TOÁN SICBO SUN================= */

/* =========================================================
   MAP GAME → ALGO
========================================================= */
const ALGO_MAP = {
  SUNWIN: algoSUNWIN,
  LC79_THUONG: algoLC_THUONG,
  LC79_MD5: algoLC_MD5,
  "68GB_MD5": algo68GB,
  "789_THUONG": algo789,
  LUCK_MD5: algoLUCK
  SICBO_SUN: algoSICBO_SUN_PATTERNS,
};

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

setInterval(updateAllGames, 6500);

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

  const algoFunc = ALGO_MAP[game];
  if (!algoFunc) {
    return res.json({ error: "Game chưa hỗ trợ thuật toán" });
  }

  const result = algoFunc(cau.split(""));
  const isSicbo =
    game === "SICBO_SUN" || game === "SICBO_HITCLUB";

  /* ===== FORMAT SICBO ===== */
  if (isSicbo) {
    return res.json({
      ID: "Bi Nhoi Vip Pro",
      Game: game,
      phien_hien_tai: api.phien_hien_tai,
      tong: api.tong,
      cau,
      du_doan: result.du_doan,
      dudoan_vi: result.dudoan_vi,
      do_tin_cay: result.do_tin_cay
    });
  }

  /* ===== FORMAT GAME KHÁC ===== */
  const [du_doan, do_tin_cay] = result;

  return res.json({
    ID: "Bi Nhoi Vip Pro",
    Game: game,
    phien_hien_tai: api.phien_hien_tai,
    tong: api.tong,
    cau,
    du_doan,
    do_tin_cay
  });
});

/* ================= CHECK API ALL GAME ================= */
app.get("/check/Api/all", async (req, res) => {
  const result = [];

  for (const game in GAMES) {
    const url = GAMES[game];
    const start = Date.now();

    try {
      await axios.get(url, { timeout: 5000 });

      result.push({
        Game: game,
        Trang_thai: "🟢 Sống",
        Toc_do: Date.now() - start + " ms"
      });
    } catch (err) {
      result.push({
        Game: game,
        Trang_thai: "🔴 Die",
        Toc_do: "Timeout/Lỗi"
      });
    }
  }

  res.json({
    time: now(),                 // ⏰ thời gian hiện tại
    tong_game: result.length,    // tổng game
    data: result
  });
});


app.listen(PORT, () => {
  console.log("🚀 Server chạy cổng", PORT);
});
