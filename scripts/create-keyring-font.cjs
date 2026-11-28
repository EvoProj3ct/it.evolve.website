// Deriva i caratteri 3D dai font locali del sito.
const fs = require("node:fs");
const path = require("node:path");
const createFont = require("next/dist/compiled/@next/font/dist/fontkit").default;

const root = path.resolve(__dirname, "..");
const fonts = [
  ["public/fonts/Helvetica.ttf", "helvetica-regular"],
  ["public/fonts/Helvetica-Bold.ttf", "helvetica-bold"],
  ["public/fonts/helvetica-rounded-bold-5871d05ead8de.otf", "helvetica-rounded"],
  ["public/fonts/helvetica-compressed-5871d14b6903a.otf", "helvetica-condensed"],
  ["src/app/fonts/Inter-latin-variable.woff2", "inter"],
  ["src/app/fonts/GeistMono-latin-variable.woff2", "geist-mono"],
];

function generateTypeface(source, filename) {
  const font = createFont(fs.readFileSync(path.join(root, source)));
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
    original_font_information: { source, fullName: font.fullName, postscriptName: font.postscriptName, copyright: font.copyright || "" },
  };
  fs.writeFileSync(path.join(root, `public/shop/fonts/${filename}.typeface.json`), JSON.stringify(result));
  console.log(`Creato il carattere 3D ${font.fullName}: ${Object.keys(glyphs).length} glifi.`);
}

for (const [source, filename] of fonts) generateTypeface(source, filename);
