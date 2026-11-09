// Web Audio engine: "בום" (bass drum on the table), "טאק" (clap), click, rest.

let ctx = null;
let noiseBuf = null;
let bpm = 100;
let vol = 0.8;
let timers = [];

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function getNoise() {
  if (!noiseBuf) {
    const c = getCtx();
    noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.2), c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function boom(t) {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.connect(g);
  g.connect(c.destination);
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(0.01, t + 0.4);
  g.gain.setValueAtTime(vol * 0.8, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
  o.start(t);
  o.stop(t + 0.4);
}

function tak(t) {
  const c = getCtx();
  const src = c.createBufferSource();
  src.buffer = getNoise();
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1000;
  const g = c.createGain();
  g.gain.setValueAtTime(vol * 0.8, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
  src.connect(hp);
  hp.connect(g);
  g.connect(c.destination);
  src.start(t);
  src.stop(t + 0.1);
}

function click(t, accent) {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.connect(g);
  g.connect(c.destination);
  o.frequency.value = accent ? 1200 : 900;
  g.gain.setValueAtTime(vol * 0.12, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
  o.start(t);
  o.stop(t + 0.05);
}

// Plays the sound of one bar-slot. Eighths = two hits in the same beat.
function hitSlot(type, t) {
  if (type === "rest") return;
  const half = 60 / bpm / 2;
  const hit = type.includes("down") ? boom : tak;
  hit(t);
  if (type.includes("eighths")) hit(t + half);
}

export function playOnce(type) {
  getCtx();
  stop();
  if (type !== "rest") hitSlot(type, getCtx().currentTime + 0.05);
}

// Count-in (4 clicks) followed by the 4 slots of the bar.
// onTick(index, phase) with phase "count" | "pat". onDone() at the end.
export function playBar(pattern, onTick, onDone) {
  stop();
  const c = getCtx();
  const beat = 60 / bpm;
  const start = c.currentTime + 0.1;
  for (let i = 0; i < 4; i++) click(start + i * beat, i === 0);
  const patStart = start + 4 * beat;
  pattern.forEach((type, i) => {
    click(patStart + i * beat, i === 0);
    hitSlot(type, patStart + i * beat);
  });
  for (let i = 0; i < 4; i++)
    timers.push(setTimeout(() => onTick?.(i, "count"), (i * beat) * 1000 + 80));
  for (let i = 0; i < 4; i++)
    timers.push(setTimeout(() => onTick?.(i, "pat"), ((4 + i) * beat) * 1000 + 80));
  timers.push(setTimeout(() => { timers = []; onDone?.(); }, (8 * beat) * 1000 + 300));
}

export function stop() {
  timers.forEach(clearTimeout);
  timers = [];
}

export function setBpm(v) { bpm = v; }
export function setVol(v) { vol = v; }
