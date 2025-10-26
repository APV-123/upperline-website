// generate-qr.js
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

const team = ["alex", "jeremy", "nealy", "spencer"]; // add more slugs here
const base = "https://upperlineco.com/tap/";

const outDir = path.join(process.cwd(), "qr-out");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

(async () => {
  for (const slug of team) {
    const url = `${base}${slug}`;
    const file = path.join(outDir, `qr-${slug}.png`);

    await QRCode.toFile(file, url, {
      width: 800,           // print quality
      margin: 2,
      color: { dark: "#003a5d", light: "#ffffffff" }, // Upperline navy on white
    });

    console.log(`✅ Wrote ${file} → ${url}`);
  }
})();
