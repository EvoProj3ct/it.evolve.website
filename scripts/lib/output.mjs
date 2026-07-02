import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = "script-output";

export function safeFilenamePart(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "output";
}

export async function writeJsonOutput(filename, payload) {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const outputPath = path.join(OUTPUT_DIR, filename);
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return outputPath.split(path.sep).join("/");
}
