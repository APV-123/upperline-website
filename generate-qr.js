// generate-qr.js
const QRCode = require("qrcode");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const team = ["alex", "jeremy", "nealy", "spencer"]; // add more slugs here
const base = "https://upperlineco.com/tap/";

const outDir = path.join(process.cwd(), "public/qr");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Your logo location is in /public (not /assets)
const logoPath = path.join(process.cwd(), "public/upperline-mark.png");

(async () => {
  // Prepare logo once (resize per QR later)
  const logoBuffer = fs.readFileSync(logoPath);

  for (const slug of team) {
    const url = `${base}${slug}`;
    const finalPath = path.join(outDir, `qr-${slug}.png`);

    // 1) Create the QR as a buffer (no intermediate file)
    const qrBuffer = await QRCode.toBuffer(url, {
      width: 800,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" }, // Upperline navy on white
    });

    // 2) Determine QR size, compute logo size (~20% of QR width)
    const meta = await sharp(qrBuffer).metadata();
    const logoSize = Math.floor((meta.width || 800) * 0.2);

    // 3) Resize logo and composite onto the QR (in memory)
    const logoResized = await sharp(logoBuffer).resize(logoSize, logoSize).png().toBuffer();

    const composed = await sharp(qrBuffer)
      .composite([{ input: logoResized, gravity: "center" }])
      .png()
      .toBuffer();

    // 4) Write final PNG once
    fs.writeFileSync(finalPath, composed);
    console.log(`✅ Updated ${finalPath} → ${url}`);
  }
})();
