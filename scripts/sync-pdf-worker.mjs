// Copies the pdf.js worker plus its standard-font and cmap data out of
// node_modules into public/ so the reader can load them from stable same-origin
// paths. pdf.js v4 externalised the standard-14 fonts (Helvetica, Times, ...);
// without standardFontDataUrl those glyphs render blank. Keeping these in sync
// with the installed pdfjs-dist version avoids worker/API/font mismatches.
// Runs on postinstall and can be run manually: node scripts/sync-pdf-worker.mjs
import { copyFileSync, mkdirSync, existsSync, cpSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pkgDir = path.dirname(require.resolve("pdfjs-dist/package.json"));
const publicDir = path.join(process.cwd(), "public");

// 1. Worker
const workerCandidates = [
  "build/pdf.worker.min.mjs",
  "build/pdf.worker.mjs",
  "legacy/build/pdf.worker.min.mjs",
];
const workerSrc = workerCandidates
  .map((c) => path.join(pkgDir, c))
  .find(existsSync);
if (workerSrc) {
  mkdirSync(publicDir, { recursive: true });
  copyFileSync(workerSrc, path.join(publicDir, "pdf.worker.min.mjs"));
  console.log("[sync-pdf-worker] worker -> public/pdf.worker.min.mjs");
} else {
  console.error("[sync-pdf-worker] worker not found (skipping)");
}

// 2. Standard fonts + cmaps (best-effort)
for (const dir of ["standard_fonts", "cmaps"]) {
  const src = path.join(pkgDir, dir);
  if (existsSync(src)) {
    const dest = path.join(publicDir, "pdfjs", dir);
    cpSync(src, dest, { recursive: true });
    console.log(`[sync-pdf-worker] ${dir} -> public/pdfjs/${dir}`);
  }
}
