// Builds two self-contained pages (JS, CSS and card images inlined):
//   index.html        — the classic game with the physical kit (PNG cards)
//   beat-it-16.html   — the full game with sixteenths, triplets and rests (SVG cards)
import { build } from "esbuild";
import { writeFileSync } from "node:fs";

const PAGES = [
  { entry: "src/main.jsx", out: "index.html", title: "Beat It Notes — ביט איט" },
  { entry: "src/main2.jsx", out: "beat-it-16.html", title: "Beat It 16 — שש-עשריות ושלשות" },
];

for (const page of PAGES) {
  const result = await build({
    entryPoints: [page.entry],
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
  <meta name="description" content="משחק מקצב פיזי וחדר כושר לקריאת קצב" />
  <meta property="og:title" content="${page.title}" />
  <meta property="og:description" content="זהו את המקצב, סדרו את הקלפים, וצברו קלפי תיבה" />
  <title>${page.title}</title>
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
  writeFileSync(page.out, html);
  console.log(`${page.out} written — ${(html.length / 1024).toFixed(1)} KB`);
}
