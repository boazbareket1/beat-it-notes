// Builds a single self-contained index.html (JS, CSS and card images inlined).
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";

const result = await build({
  entryPoints: ["src/main.jsx"],
  bundle: true,
  minify: true,
  format: "iife",
  write: false,
  outdir: "dist",
  jsx: "automatic",
  loader: { ".png": "dataurl" },
  define: { "process.env.NODE_ENV": '"production"' },
});

const js = result.outputFiles.find((f) => f.path.endsWith(".js")).text;
const css = result.outputFiles.find((f) => f.path.endsWith(".css"))?.text ?? "";

const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="description" content="Beat It Notes — משחק קצב פיזי וחדר כושר לקריאת קצב" />
  <meta property="og:title" content="Beat It Notes — ביט איט" />
  <meta property="og:description" content="זהו את המקצב, סדרו את הקלפים, וצברו קלפי תיבה" />
  <title>Beat It Notes — ביט איט</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;900&display=swap" rel="stylesheet" />
  <style>${css}</style>
</head>
<body>
  <div id="root"></div>
  <script>${js}</script>
</body>
</html>
`;

writeFileSync("index.html", html);
console.log(`index.html written — ${(html.length / 1024).toFixed(1)} KB`);
