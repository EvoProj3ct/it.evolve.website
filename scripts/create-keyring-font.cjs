// Deriva il carattere 3D dal TTF già presente nel sito. Nessuna risorsa remota.
const fs = require("node:fs");
const path = require("node:path");
const createFont = require("next/dist/compiled/@next/font/dist/fontkit").default;

const root = path.resolve(__dirname, "..");
const source = path.join(root, "public/fonts/Helvetica.ttf");
const font = createFont(fs.readFileSync(source));
const supported = new Set(font.characterSet);
const scale = 1000 / font.unitsPerEm;
const scaled = value => Math.round(value * scale);
const glyphs = {};

for (let code = 32; code <= 255; code++) {
  if ((code > 126 && code < 160) || !supported.has(code)) continue;
  const glyph = font.glyphForCodePoint(code);
  const outline = [];
  let start = [0, 0];
  for (const { command, args } of glyph.path.commands) {
    const values = args.map(scaled);
    if (command === "moveTo") { start = values; outline.push("m", ...values); }
    else if (command === "lineTo") outline.push("l", ...values);
    else if (command === "quadraticCurveTo") outline.push("q", values[2], values[3], values[0], values[1]);
    else if (command === "bezierCurveTo") outline.push("b", values[4], values[5], ...values.slice(0, 4));
    else if (command === "closePath") outline.push("l", ...start);
  }
  glyphs[String.fromCodePoint(code)] = {
    ha: scaled(glyph.advanceWidth),
    x_min: scaled(glyph.bbox.minX || 0),
    x_max: scaled(glyph.bbox.maxX || 0),
    o: outline.join(" "),
  };
}

const result = {
  glyphs,
  familyName: font.familyName,
  ascender: scaled(font.ascent),
  descender: scaled(font.descent),
  underlinePosition: scaled(font.underlinePosition || -100),
  underlineThickness: scaled(font.underlineThickness || 50),
  boundingBox: { xMin: scaled(font.bbox.minX), xMax: scaled(font.bbox.maxX), yMin: scaled(font.bbox.minY), yMax: scaled(font.bbox.maxY) },
  resolution: 1000,
  original_font_information: { source: "public/fonts/Helvetica.ttf", fullName: font.fullName, postscriptName: font.postscriptName, copyright: font.copyright || "" },
};
fs.writeFileSync(path.join(root, "public/shop/fonts/helvetica-regular.typeface.json"), JSON.stringify(result));
console.log(`Creato il carattere 3D ${font.fullName}: ${Object.keys(glyphs).length} glifi.`);
