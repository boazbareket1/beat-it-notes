// Generates print-kit-16.html: A4 sheets with every card of the full kit (run: node scripts-print-kit.mjs [copies])
import { writeFileSync } from "node:fs";
import { cardSvg } from "./src/notation.js";

const copies = Number(process.argv[2] ?? 4);
const KINDS = [
  ["quarter", "down"], ["quarter", "up"],
  ["eighths", "down"], ["eighths", "up"],
  ["sixteenths", "down"], ["sixteenths", "up"],
  ["triplet", "down"], ["triplet", "up"],
  ["rest", "rest"],
];
const cards = [];
for (const [kind, dir] of KINDS) for (let i = 0; i < copies; i++) cards.push(cardSvg(kind, dir));

const pages = [];
for (let i = 0; i < cards.length; i += 8) pages.push(cards.slice(i, i + 8));

const html = `<!doctype html><html lang="he"><head><meta charset="UTF-8"><title>BEAT IT 16 — ערכת הקלפים</title>
<style>
  @page { size: A4; margin: 10mm; }
  body { margin: 0; font-family: sans-serif; }
  .sheet { width: 190mm; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6mm; align-content: start; page-break-after: always; }
  .sheet:last-child { page-break-after: auto; }
  .sheet svg { width: 100%; height: auto; display: block; }
</style></head><body>
${pages.map((p) => `<div class="sheet">${p.join("")}</div>`).join("\n")}
</body></html>`;
writeFileSync("print-kit-16.html", html);
console.log(`print-kit-16.html: ${cards.length} cards on ${pages.length} sheets`);
