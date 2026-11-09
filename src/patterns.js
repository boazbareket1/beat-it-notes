// Card types, difficulty levels and pattern generation.

import quarterImg from "../assets/quarter.png";
import eighthsImg from "../assets/eighths.png";
import restImg from "../assets/rest.png";

export const CARD = {
  quarter_down: { label: "רבע", sound: "בום", dir: "down", img: quarterImg, color: "#C4AD8A" },
  quarter_up: { label: "רבע", sound: "טאק", dir: "up", img: quarterImg, color: "#7BBFB0" },
  eighths_down: { label: "שתי שמיניות", sound: "בום×2", dir: "down", img: eighthsImg, color: "#C4AD8A" },
  eighths_up: { label: "שתי שמיניות", sound: "טאק×2", dir: "up", img: eighthsImg, color: "#7BBFB0" },
  rest: { label: "שתק", sound: "—", dir: "rest", img: restImg, color: "#888" },
};

// Sixteenth and triplet cards exist only in the full game (rhythm-16).
export const FULL_CARD = {
  sixteenths_down: { sound: "בום×4", dir: "down", color: "#C4AD8A" },
  sixteenths_up: { sound: "טאק×4", dir: "up", color: "#7BBFB0" },
  triplet_down: { sound: "בום×3", dir: "down", color: "#C4AD8A" },
  triplet_up: { sound: "טאק×3", dir: "up", color: "#7BBFB0" },
};
Object.assign(CARD, FULL_CARD);

export const FLIP = {
  quarter_down: "quarter_up",
  quarter_up: "quarter_down",
  eighths_down: "eighths_up",
  eighths_up: "eighths_down",
  sixteenths_down: "sixteenths_up",
  sixteenths_up: "sixteenths_down",
  triplet_down: "triplet_up",
  triplet_up: "triplet_down",
  rest: "rest",
};

// Full game: every rhythm pattern, introduced step by step.
export const FULL_LEVELS = [
  { name: "רמה 1", sub: "רבע בס + שתק", types: ["quarter_down", "rest"], color: "#B8C96A" },
  { name: "רמה 2", sub: "+ שמיניות וסנר", types: ["quarter_down", "rest", "eighths_down", "quarter_up"], color: "#7BBFB0" },
  { name: "רמה 3", sub: "+ שש-עשריות", types: ["quarter_down", "rest", "eighths_down", "quarter_up", "sixteenths_down", "eighths_up"], color: "#9BAED0" },
  {
    name: "רמה 4",
    sub: "הכל כולל שלשות",
    types: Object.keys(CARD),
    color: "#B09ACE",
  },
];

export const LEVELS = [
  { name: "רמה 1", sub: "רבע בס + שתק", types: ["quarter_down", "rest"], color: "#B8C96A" },
  { name: "רמה 2", sub: "+ שמיניות", types: ["quarter_down", "rest", "eighths_down"], color: "#7BBFB0" },
  { name: "רמה 3", sub: "+ סנר", types: ["quarter_down", "quarter_up", "rest"], color: "#9BAED0" },
  {
    name: "רמה 4",
    sub: "הכל",
    types: ["quarter_down", "quarter_up", "eighths_down", "eighths_up", "rest"],
    color: "#B09ACE",
  },
];

export const BAR_LENGTH = 4;

// Random bar from the level's pool. A bar of only rests is rejected (nothing to clap).
export function randomBar(level, levels = LEVELS) {
  const pool = levels[level - 1].types;
  let bar;
  do {
    bar = Array.from({ length: BAR_LENGTH }, () => pool[Math.floor(Math.random() * pool.length)]);
  } while (bar.every((t) => t === "rest"));
  return bar;
}

export function sameBar(a, b) {
  return a.length === b.length && a.every((t, i) => t === b[i]);
}

// Describes the bar in words, e.g. "בום > טאק > שתק > בום"
export function describeBar(bar) {
  return bar
    .map((t) => (t === "rest" ? "(שתק)" : CARD[t].sound.replace("×2", "×2")))
    .join(" > ");
}
