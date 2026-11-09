// Draws the rhythm cards as SVG, in the style of the reference cards:
// white card, lilac border, black noteheads with beams.
// "up" cards are the same card turned 180° (the physical flip = snare).

const FRAME = "#8B7AA8";

const head = (x, y) =>
  `<ellipse cx="${x}" cy="${y}" rx="11" ry="8.5" transform="rotate(-25 ${x} ${y})" fill="#000"/>`;

const stem = (x, top, bottom) =>
  `<rect x="${x + 9}" y="${top}" width="3.5" height="${bottom - top}" fill="#000"/>`;

const beam = (x1, x2, y, h = 8) =>
  `<rect x="${x1 + 9}" y="${y}" width="${x2 - x1 + 3.5}" height="${h}" fill="#000"/>`;

const BASE = 168; // heads baseline
const TOP = 96; // beam / stem top

function beamedGroup(xs, beams) {
  let s = "";
  xs.forEach((x) => {
    s += head(x, BASE) + stem(x, TOP, BASE);
  });
  beams.forEach((dy, i) => {
    s += beam(xs[0], xs[xs.length - 1], TOP + dy * 12, i === 0 ? 9 : 7);
  });
  return s;
}

// (kept for reference) const REST_PATH =
  "M68,16 C80,30 62,52 48,60 C36,66 30,78 38,90 C46,100 44,116 28,130 C20,138 8,146 6,150 C14,138 20,126 16,114 C10,100 22,88 38,80 C54,72 62,54 52,40 Z";

function notes(kind) {
  switch (kind) {
    case "quarter":
      return head(100, BASE) + stem(100, 70, BASE);
    case "eighths":
      return beamedGroup([72, 128], [0]);
    case "sixteenths":
      return beamedGroup([56, 88, 120, 152], [0, 1]);
    case "triplet":
      return beamedGroup([62, 100, 138], [0]);
    case "rest":
      return (
        `<polyline points="80,96 120,116 88,138 120,160 88,180" fill="none" stroke="#000" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<ellipse cx="80" cy="190" rx="13" ry="10" transform="rotate(-20 80 190)" fill="#000"/>`
      );
    default:
      return "";
  }
}

// kind: quarter | eighths | sixteenths | triplet | rest
// dir: "down" (bass, on the table) | "up" (snare, clap) | "rest"
// Scale so each group fits the card frame (more notes = smaller).
const SCALE = { quarter: 1.6, eighths: 1.5, sixteenths: 1.22, triplet: 1.4, rest: 1 };

export function cardSvg(kind, dir = "down") {
  const turned = dir === "up" ? ' transform="rotate(180 100 140)"' : "";
  const k = SCALE[kind] ?? 1;
  return (
    `<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg" class="card-svg">` +
    `<rect x="6" y="6" width="188" height="268" rx="18" fill="#FFFFFF" stroke="${FRAME}" stroke-width="5"/>` +
    `<g${turned}><g transform="translate(100 140) scale(${k}) translate(-100 -140)">${notes(kind)}</g></g>` +
    (kind === "triplet"
      ? `<text x="100" y="54" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="30" fill="#000">3</text>`
      : "") +
    `</svg>`
  );
}
