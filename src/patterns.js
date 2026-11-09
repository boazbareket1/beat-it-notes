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

export const FLIP = {
  quarter_down: "quarter_up",
  quarter_up: "quarter_down",
  eighths_down: "eighths_up",
  eighths_up: "eighths_down",
  rest: "rest",
};

export const LEVELS = [
  { name: "רמה 1", sub: "רבע בס בלבד", types: ["quarter_down"], color: "#B8C96A" },
  { name: "רמה 2", sub: "+ שמיניות", types: ["quarter_down", "eighths_down"], color: "#7BBFB0" },
  { name: "רמה 3", sub: "+ סנר ושתק", types: ["quarter_down", "quarter_up", "rest"], color: "#9BAED0" },
  {
    name: "רמה 4",
    sub: "הכל",
    types: ["quarter_down", "quarter_up", "eighths_down", "eighths_up", "rest"],
    color: "#B09ACE",
  },
];

export const BAR_LENGTH = 4;

export function randomBar(level) {
  const pool = LEVELS[level - 1].types;
  return Array.from({ length: BAR_LENGTH }, () => pool[Math.floor(Math.random() * pool.length)]);
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
