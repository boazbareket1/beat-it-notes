import { createContext, useContext, useEffect, useRef, useState } from "react";
import { cardSvg } from "./notation.js";
import { playBar, playOnce, playSequence, setBpm, setVol, stop } from "./audio.js";
import { BAR_LENGTH, CARD, FLIP, FULL_LEVELS, LEVELS, describeBar, randomBar, sameBar } from "./patterns.js";
import { loadHistory, recommend, saveSession } from "./store.js";

const VariantCtx = createContext("classic");

// Links to the physical game and to ordering (WhatsApp, prefilled).
const INSTRUCTIONS_URL = "instructions.html";
const ORDER_URL =
  "https://wa.me/972502003458?text=" +
  encodeURIComponent("שלום בועז, אשמח להזמין ערכת קלפים של BEAT IT");

// Photos of the physical kit in use (in assets/photos, shown in the order section).
const PHOTOS = [1, 2, 3, 4, 5].map((n) => `assets/photos/photo-${n}.jpg`);

const DECK_SIZE = 20;
const GYM_SESSION = 10;
const WIN_BARS = 10;
const LAB_MAX = 16;

const newDeck = (level, levels) => Array.from({ length: DECK_SIZE }, () => randomBar(level, levels));

const HIT_N = { quarter: 1, eighths: 2, triplet: 3, sixteenths: 4 };

// Hebrew name of a card, e.g. "שתי שמיניות · בום".
function cardName(t) {
  if (t === "rest") return "שתק";
  const [kind, dir] = t.split("_");
  const names = { quarter: "רבע", eighths: "שתי שמיניות", sixteenths: "ארבע שש-עשריות", triplet: "שלשה" };
  return `${names[kind]} · ${dir === "up" ? "טאק" : "בום"}`;
}

// ───────────────────────── Icons (one stroke weight) ─────────────────────────

const ICON_PATHS = {
  book: "M3 5.5c3-1.6 6-1.6 9 0v14c-3-1.6-6-1.6-9 0z M21 5.5c-3-1.6-6-1.6-9 0v14c3-1.6 6-1.6 9 0z",
  drum: "M4 9c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z M4 9v7c0 1.7 3.6 3 8 3s8-1.3 8-3V9 M8 2l2.5 4 M16 2l-2.5 4",
  gym: "M6 8v8 M18 8v8 M3 10v4 M21 10v4 M6 12h12",
  lab: "M4 7h16 M5.5 7l1.4 12.2h10.2L18.5 7 M9 11v4 M15 11v4",
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6L6 18",
  play: "M8 5v14l11-7z",
  undo: "M9 14L4 9l5-5 M4 9h10a6 6 0 010 12h-3",
  eye: "M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6-10z M12 9a3 3 0 110 6 3 3 0 010-6z",
  arrow: "M15 5l-7 7 7 7",
};

function Icon({ name, size = 22 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={name === "play" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

// Card art: PNG from the physical classic kit, or SVG notation for the full game.
function CardArt({ type, className }) {
  const variant = useContext(VariantCtx);
  const [kind, dir] = type === "rest" ? ["rest", "rest"] : type.split("_");
  if (variant === "full") {
    return <span className={`card-art ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: cardSvg(kind, dir) }} />;
  }
  return <img className={className} src={CARD[type].img} alt={cardName(type)} draggable={false} />;
}

// ───────────────────────── Welcome ─────────────────────────

function Welcome({ onSelect, history, variant }) {
  const last = history[history.length - 1];
  const modes = [
    { id: "practice", icon: "book", title: "תרגול", sub: "רואים את המקצב ומתאמנים בקצב שלכם", tone: "lime" },
    { id: "game", icon: "drum", title: "משחק", sub: "מאזינים, מזהים ואוספים 10 קלפי תיבה", tone: "sky" },
    {
      id: "gym",
      icon: "gym",
      title: "חדר כושר לקריאת קצב",
      sub: `סשנים של ${GYM_SESSION} תיבות עם מדידת דיוק והמלצה לרמה`,
      tone: "apricot",
    },
    { id: "lab", icon: "lab", title: "מעבדת הקלפים", sub: "גררו קלפים לתיבה ושמעו איך היא נשמעת", tone: "lilac" },
  ];
  return (
    <div className="welcome">
      <header className="masthead">
        <div className="logo">
          <h1 className="logo-en">BEAT IT{variant === "full" ? " 16" : ""}</h1>
          <p className="logo-sub">{variant === "full" ? "שש-עשריות · שלשות · כל התבניות" : "משחק מקצב עם קלפים"}</p>
        </div>
        <nav className="switch" aria-label="משחקים נוספים">
          <a className="pill-link" href={variant === "full" ? "index.html" : "beat-it-16.html"}>
            {variant === "full" ? "למשחק הבסיסי" : "למשחק עם שש-עשריות"}
          </a>
          <a className="pill-link" href={INSTRUCTIONS_URL}>
            הוראות המשחק הפיזי
          </a>
        </nav>
      </header>
      <div className="edge" aria-hidden="true" />

      <div className="welcome-main">
        <section className="welcome-col">
          <div className="mode-grid">
            {modes.map((m) => (
              <button key={m.id} className={`mode-card tone-${m.tone}`} onClick={() => onSelect(m.id)}>
                <span className="mode-icon">
                  <Icon name={m.icon} size={26} />
                </span>
                <span className="mode-title">{m.title}</span>
                <span className="mode-sub">{m.sub}</span>
              </button>
            ))}
          </div>

          {last && (
            <p className="last-session">
              הסשן האחרון בחדר הכושר: <b>{last.ok}/{last.n}</b> נכונות · רמה {last.level} · {last.bpm} BPM
            </p>
          )}
        </section>

        <section className="order" aria-labelledby="order-title">
          <div className="order-head">
            <h2 id="order-title" className="order-title">ערכת הקלפים הפיזית</h2>
            <p className="order-text">
              כל סוגי הקלפים של המשחק, מודפסים ומוכנים לשולחן. הערכה מתאימה לכיתה, לחדר טיפולים או לבית.
            </p>
          </div>
          <div className="gallery">
            {PHOTOS.map((src, i) => (
              <figure key={src} className={`gallery-item ${i === 0 ? "is-lead" : ""}`}>
                <img src={src} alt="ערכת הקלפים של BEAT IT בשימוש" loading="lazy" />
              </figure>
            ))}
          </div>
          <a className="order-btn" href={ORDER_URL} target="_blank" rel="noopener">
            הזמינו את הערכה בוואטסאפ
            <Icon name="arrow" size={18} />
          </a>
        </section>
      </div>

      <footer className="foot">BAREKET-STUDIO © 2026</footer>
    </div>
  );
}

// ───────────────────────── Cards ─────────────────────────

// A physical-looking card. "up" cards are the same card turned 180°.
function PhysCard({ type, compact, onFlip, onRemove }) {
  const c = CARD[type];
  const isFull = useContext(VariantCtx) === "full";
  const dirText = c.dir === "up" ? "טאק · כף" : c.dir === "down" ? "בום · שולחן" : "שתק";
  return (
    <div className={`phys ${compact ? "phys-compact" : ""}`}>
      <div className="phys-strip" style={{ background: c.color }}>
        {dirText}
      </div>
      <CardArt type={type} className={`phys-img ${c.dir === "up" && !isFull ? "is-up" : ""}`} />
      {onFlip && type !== "rest" && (
        <button className="flip-btn" onClick={onFlip} aria-label="הפוך את הקלף">
          <Icon name="undo" size={14} /> הפוך
        </button>
      )}
      {onRemove && (
        <button className="remove-btn" onClick={onRemove} aria-label="הסר קלף">
          <Icon name="x" size={13} />
        </button>
      )}
    </div>
  );
}

// Face-down card in the target bar (game / hidden practice).
function HiddenSlot({ n, active }) {
  return <div className={`hidden-slot ${active ? "is-active" : ""}`}>{n}</div>;
}

// Visible target slot.
function TargetSlot({ type, active }) {
  const c = CARD[type];
  const isFull = useContext(VariantCtx) === "full";
  return (
    <div className={`target-slot ${active ? "is-active" : ""}`}>
      <CardArt type={type} className={`target-img ${c.dir === "up" && !isFull ? "is-up" : ""}`} />
      <span className="target-label">{c.dir === "rest" ? "שתק" : c.dir === "up" ? "טאק" : "בום"}</span>
    </div>
  );
}

function Bank({ types, onAdd }) {
  const isFull = useContext(VariantCtx) === "full";
  const cols = types.length <= 4 ? types.length : types.length <= 6 ? 3 : 4;
  return (
    <div
      className="bank"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        maxWidth: types.length < 4 ? types.length * 130 : undefined,
        margin: "0 auto",
      }}
    >
      {types.map((t) => (
        <button key={t} className="bank-btn" onClick={() => onAdd(t)} style={{ "--c": CARD[t].color }}>
          <span className="bank-strip" />
          <CardArt type={t} className={`bank-img ${CARD[t].dir === "up" && !isFull ? "is-up" : ""}`} />
          <span className="bank-sound">{CARD[t].sound}</span>
        </button>
      ))}
    </div>
  );
}

// ───────────────────────── Play (practice / game / gym) ─────────────────────────

function Play({ mode, initialLevel, initialBpm, onExit }) {
  const variant = useContext(VariantCtx);
  const LV = variant === "full" ? FULL_LEVELS : LEVELS;
  const [level, setLevel] = useState(initialLevel);
  const [bpm, setBpmState] = useState(initialBpm);
  const [volume, setVolume] = useState(0.8);
  const [deck, setDeck] = useState(() => newDeck(initialLevel, LV));
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState([]);
  const [result, setResult] = useState(null); // null | "ok" | "fail"
  const [playing, setPlaying] = useState(false);
  const [tick, setTick] = useState(null); // { i, phase }
  const [reveal, setReveal] = useState(mode === "practice");
  const [wins, setWins] = useState(0);
  const [gym, setGym] = useState({ n: 0, ok: 0, flip: 0, other: 0 });
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState(() => loadHistory());

  const bar = deck[idx];
  const types = LV[level - 1].types;

  useEffect(() => setBpm(bpm), [bpm]);
  useEffect(() => setVol(volume), [volume]);
  useEffect(() => () => stop(), []);

  function resetRound() {
    setAnswer([]);
    setResult(null);
    setTick(null);
  }

  function changeLevel(l) {
    setLevel(l);
    setDeck(newDeck(l, LV));
    setIdx(0);
    resetRound();
  }

  function advance() {
    if (idx + 1 >= deck.length) {
      setDeck(newDeck(level, LV));
      setIdx(0);
    } else {
      setIdx(idx + 1);
    }
    resetRound();
  }

  function play() {
    if (playing) return;
    setPlaying(true);
    playBar(
      bar,
      (i, phase) => setTick({ i, phase }),
      () => {
        setPlaying(false);
        setTick(null);
      },
    );
  }

  function flipAt(i) {
    setAnswer((a) => a.map((t, k) => (k === i ? FLIP[t] : t)));
  }

  function add(t) {
    if (result === null && answer.length < BAR_LENGTH) setAnswer((a) => [...a, t]);
  }

  function check() {
    if (answer.length !== BAR_LENGTH || result !== null) return;
    const ok = sameBar(answer, bar);
    setResult(ok ? "ok" : "fail");

    if (mode === "game" && ok) setWins((w) => w + 1);

    if (mode === "gym") {
      let flip = 0;
      let other = 0;
      if (!ok) {
        bar.forEach((t, i) => {
          if (answer[i] !== t) (FLIP[t] === answer[i] ? flip++ : other++);
        });
      }
      setGym((g) => ({ n: g.n + 1, ok: g.ok + (ok ? 1 : 0), flip: g.flip + flip, other: g.other + other }));
    }
  }

  function finishGym(final) {
    const sess = { level, bpm, ok: final.ok, n: final.n, flip: final.flip, other: final.other };
    const h = saveSession(sess);
    setHistory(h);
    setSummary({ ...sess, rec: recommend(h, level) });
  }

  function next() {
    if (mode === "gym") {
      if (gym.n >= GYM_SESSION) return finishGym(gym);
      return advance();
    }
    if (mode === "game" && result === "ok" && wins >= WIN_BARS) {
      setWins(0);
      if (level < 4) return changeLevel(level + 1);
    }
    advance();
  }

  function startGymSession(l, newBpm) {
    setSummary(null);
    setGym({ n: 0, ok: 0, flip: 0, other: 0 });
    setBpmState(newBpm);
    changeLevel(l);
  }

  // ─── gym summary ───
  if (summary) {
    const acc = Math.round((summary.ok / summary.n) * 100);
    return (
      <div className="screen">
        <TopBar onExit={onExit} title="סיכום סשן" />
        <div className="summary panel">
          <div className="summary-score">
            {summary.ok}
            <span>/{summary.n}</span>
          </div>
          <div className="summary-acc">דיוק {acc}% · רמה {summary.level} · {summary.bpm} BPM</div>
          {summary.flip + summary.other > 0 && (
            <div className="summary-errors">
              טעויות כיוון (בום ↔ טאק): <b>{summary.flip}</b> · טעויות סוג: <b>{summary.other}</b>
              {summary.flip > summary.other ? (
                <p>רוב הטעויות היו בכיוון. שימו לב אם הקלף נוחת על השולחן או על הכף.</p>
              ) : summary.other > 0 ? (
                <p>רוב הטעויות היו בסוג התו. שימו לב להבדל בין רבע, שמיניות ושתק.</p>
              ) : null}
            </div>
          )}
          <div className="summary-rec">{summary.rec.text}</div>
          <div className="summary-btns">
            <button className="btn-primary" onClick={() => startGymSession(summary.rec.level, bpm)}>
              סשן הבא ברמה {summary.rec.level}
            </button>
            <button className="btn-ghost" onClick={() => startGymSession(summary.rec.level, Math.min(bpm + 5, 160))}>
              העלו טמפו ל-{Math.min(bpm + 5, 160)} BPM
            </button>
            <button className="btn-ghost" onClick={onExit}>
              חזרה לתפריט
            </button>
          </div>
          <div className="summary-hist">
            סה״כ סשנים: {history.length} · סשנים שהושלמו בדיוק מעל 80%:{" "}
            {history.filter((h) => h.ok / h.n >= 0.8).length}
          </div>
        </div>
      </div>
    );
  }

  const progressLabel =
    mode === "practice"
      ? `${idx + 1}/${deck.length}`
      : mode === "gym"
        ? `${Math.min(gym.n + (result ? 0 : 1), GYM_SESSION)}/${GYM_SESSION}`
        : null;

  const canCheck = answer.length === BAR_LENGTH && result === null;

  return (
    <div className="screen">
      <TopBar
        onExit={onExit}
        title={mode === "practice" ? "תרגול" : mode === "game" ? "משחק" : "חדר כושר"}
        right={
          mode === "game" ? (
            <span className="score">ניקוד {wins}/{WIN_BARS}</span>
          ) : mode === "gym" ? (
            <span className="score">{progressLabel}</span>
          ) : null
        }
      />

      <div className="level-row">
        {LV.map((l, i) => (
          <button
            key={l.name}
            className={`level-pill ${level === i + 1 ? "is-on" : ""}`}
            style={{ "--c": l.color }}
            disabled={mode === "gym" && gym.n > 0 && result === null}
            onClick={() => {
              if (mode === "game" && i + 1 > level) return; // game levels are earned
              changeLevel(i + 1);
              setWins(0);
            }}
          >
            {i + 1}
          </button>
        ))}
        <span className="level-sub">{LV[level - 1].sub}</span>
      </div>

      <div className="play-grid">
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">{mode === "practice" ? `תיבה ${idx + 1}` : "המקצב הנכון"}</h2>
            <div className="panel-tools">
              {mode === "practice" && (
                <>
                  <button className="icon-btn" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} aria-label="התיבה הקודמת">
                    ‹
                  </button>
                  <button className="icon-btn" onClick={() => setIdx((i) => Math.min(deck.length - 1, i + 1))} aria-label="התיבה הבאה">
                    ›
                  </button>
                  <button className="chip-btn" onClick={() => setReveal((r) => !r)}>
                    <Icon name="eye" size={15} /> {reveal ? "הסתר" : "גלה"}
                  </button>
                </>
              )}
            </div>
          </div>

          {(mode === "practice" ? reveal : result !== null) ? (
            <div className="target-row" dir="ltr">
              {bar.map((t, i) => (
                <TargetSlot key={i} type={t} active={tick?.i === i && tick.phase === "pat"} />
              ))}
            </div>
          ) : (
            <div className="target-row" dir="ltr">
              {[0, 1, 2, 3].map((i) => (
                <HiddenSlot key={i} n={i + 1} active={tick?.i === i && tick.phase === "pat"} />
              ))}
            </div>
          )}

          <div className="count-row" dir="ltr">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`count-dot ${tick?.i === i ? "is-on" : ""}`}>
                {i + 1}
              </span>
            ))}
          </div>

          <div className="transport">
            <button className="play-btn" onClick={play} disabled={playing}>
              <Icon name="play" size={18} />
              {playing ? (tick?.phase === "count" ? "ספירה…" : "מנגנים…") : "נגנו מקצב"}
            </button>
            <div className="sliders">
              <label className="slider">
                <span>BPM</span>
                <b>{bpm}</b>
                <input type="range" min="60" max="160" step="1" value={bpm} onChange={(e) => setBpmState(Number(e.target.value))} />
              </label>
              <label className="slider">
                <span>עוצמה</span>
                <b>{Math.round(volume * 100)}%</b>
                <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
              </label>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">צרו תיבה זהה לנתונה</h2>
            <span className="panel-hint">לחצו קלף כדי להוסיף · ״הפוך״ בין בום לטאק</span>
          </div>

          <div className="answer-row" dir="ltr">
            {[0, 1, 2, 3].map((i) =>
              answer[i] ? (
                <PhysCard key={i} type={answer[i]} compact onFlip={result === null ? () => flipAt(i) : null} />
              ) : (
                <div key={i} className="empty-slot">{i + 1}</div>
              ),
            )}
          </div>

          {result === null && (
            <div className="bank-wrap">
              <Bank types={types} onAdd={add} />
            </div>
          )}

          {result === null && (
            <div className="action-row">
              <button className="undo-btn" onClick={() => setAnswer((a) => a.slice(0, -1))} disabled={answer.length === 0} aria-label="מחיקת קלף אחרון">
                <Icon name="undo" size={18} />
              </button>
              <button className="check-btn" onClick={check} disabled={!canCheck}>
                {canCheck ? "בדקו" : `${answer.length} מתוך 4 קלפים`}
              </button>
            </div>
          )}

          {result !== null && (
            <div className={`result ${result === "ok" ? "is-ok" : "is-fail"}`} role="status">
              <div className="result-icon">
                <Icon name={result === "ok" ? "check" : "x"} size={34} />
              </div>
              <div className="result-title">{result === "ok" ? "כל הכבוד!" : "לא מדויק"}</div>
              {result === "ok" && mode === "game" && (
                <div className="result-sub">
                  +1 קלף תיבה · {wins}/{WIN_BARS}
                  {wins >= WIN_BARS && level < 4 ? ` · עולים לרמה ${level + 1}!` : ""}
                </div>
              )}
              {result === "fail" && <div className="result-sub">המקצב הנכון: {describeBar(bar)}</div>}
              <div className="result-btns">
                {result === "fail" && mode !== "practice" && mode !== "gym" && (
                  <button className="btn-ghost" onClick={() => { setAnswer([]); setResult(null); }}>
                    נסו שוב
                  </button>
                )}
                <button className="btn-primary" onClick={next}>
                  {mode === "gym" && gym.n >= GYM_SESSION
                    ? "סיום סשן"
                    : mode === "game" && result === "ok" && wins >= WIN_BARS && level < 4
                      ? `לרמה ${level + 1}`
                      : result === "fail" && mode === "game"
                        ? "דלגו"
                        : "הבא"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {mode === "gym" && (
        <div className="gym-meter">
          <div className="gym-bar">
            <div className="gym-fill" style={{ width: `${(gym.n / GYM_SESSION) * 100}%` }} />
          </div>
          <div className="gym-stats">
            נכונות: {gym.ok}/{gym.n} · דיוק: {gym.n ? Math.round((gym.ok / gym.n) * 100) : 0}%
          </div>
        </div>
      )}

      {mode === "practice" && <Tip />}
    </div>
  );
}

// ───────────────────────── Card lab ─────────────────────────

// Every card, a bin to drop them in, and playback of the bin in order (one card per beat).
function Lab({ onExit }) {
  const variant = useContext(VariantCtx);
  const catalog = (variant === "full" ? FULL_LEVELS : LEVELS)[3].types;
  const [bin, setBin] = useState([]);
  const [bpm, setBpmState] = useState(100);
  const [volume, setVolume] = useState(0.8);
  const [playing, setPlaying] = useState(false);
  const [head, setHead] = useState(null);
  const [ghost, setGhost] = useState(null); // { type, x, y } while dragging
  const [over, setOver] = useState(false);
  const [note, setNote] = useState("");
  const binRef = useRef(null);
  const drag = useRef(null);

  useEffect(() => setBpm(bpm), [bpm]);
  useEffect(() => setVol(volume), [volume]);
  useEffect(() => () => stop(), []);

  const hits = bin.reduce((s, t) => s + (t === "rest" ? 0 : HIT_N[t.split("_")[0]]), 0);

  function halt() {
    stop();
    setPlaying(false);
    setHead(null);
  }

  function add(t) {
    if (bin.length >= LAB_MAX) return setNote(`התיבה מלאה: עד ${LAB_MAX} קלפים`);
    halt();
    setNote("");
    setBin((b) => [...b, t]);
  }

  function remove(i) {
    halt();
    setBin((b) => b.filter((_, k) => k !== i));
  }

  function clear() {
    halt();
    setBin([]);
    setNote("");
  }

  function play() {
    if (!bin.length || playing) return;
    setPlaying(true);
    playSequence(
      bin,
      (i) => setHead(i),
      () => {
        setPlaying(false);
        setHead(null);
      },
    );
  }

  // Pointer drag works with mouse and touch alike. A press without movement is a tap: it adds the card.
  function inside(e) {
    const el = binRef.current;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }

  function onDown(e, t) {
    drag.current = { type: t, x0: e.clientX, y0: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onMove(e) {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 6) d.moved = true;
    if (d.moved) {
      setGhost({ type: d.type, x: e.clientX, y: e.clientY });
      setOver(inside(e));
    }
  }

  function onUp(e) {
    const d = drag.current;
    drag.current = null;
    setGhost(null);
    setOver(false);
    if (!d) return;
    if (!d.moved || inside(e)) add(d.type);
  }

  function onCancel() {
    drag.current = null;
    setGhost(null);
    setOver(false);
  }

  return (
    <div className="screen">
      <TopBar onExit={onExit} title="מעבדת הקלפים" />

      <p className="lab-intro">
        כל הקלפים מוצגים כאן. גררו קלף לתיבה, או לחצו עליו, ואז נגנו את התיבה כדי לשמוע איך היא נשמעת.
        כל קלף נשמע בדפיקה אחת.
      </p>

      <div className="lab-grid">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">כל הקלפים</h2>
            <span className="panel-hint">גררו לתיבה</span>
          </div>
          <div className="lab-catalog">
            {catalog.map((t) => (
              <button
                key={t}
                className="lab-card"
                style={{ "--c": CARD[t].color }}
                onPointerDown={(e) => onDown(e, t)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onCancel}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    add(t);
                  }
                }}
                aria-label={`הוסיפו לתיבה: ${cardName(t)}`}
              >
                <span className="lab-strip" />
                <CardArt type={t} className={`lab-img ${CARD[t].dir === "up" && variant !== "full" ? "is-up" : ""}`} />
                <span className="lab-name">{cardName(t)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel bin-panel">
          <div className="panel-head">
            <h2 className="panel-title">התיבה שלכם</h2>
            <span className="panel-hint">
              {bin.length}/{LAB_MAX} קלפים · {hits} מכות
            </span>
          </div>

          <div ref={binRef} className={`bin-tray ${over ? "is-over" : ""} ${bin.length === 0 ? "is-empty" : ""}`}>
            {bin.length === 0 ? (
              <p className="bin-empty">גררו לכאן קלפים. התיבה תישמע בדיוק לפי הסדר שבו הקלפים מונחים.</p>
            ) : (
              <div className="bin-items" dir="ltr">
                {bin.map((t, i) => (
                  <div key={i} className={`bin-item ${head === i ? "is-head" : ""}`}>
                    <span className="bin-num">{i + 1}</span>
                    <PhysCard type={t} compact onRemove={() => remove(i)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {note && <p className="lab-note" role="status">{note}</p>}

          <div className="lab-transport">
            <button className="play-btn" onClick={play} disabled={!bin.length || playing}>
              <Icon name="play" size={18} />
              {playing ? "מנגנים…" : "נגנו את התיבה"}
            </button>
            <button className="btn-ghost" onClick={clear} disabled={!bin.length}>
              נקו תיבה
            </button>
          </div>

          <div className="sliders">
            <label className="slider">
              <span>BPM</span>
              <b>{bpm}</b>
              <input type="range" min="60" max="160" step="1" value={bpm} onChange={(e) => setBpmState(Number(e.target.value))} />
            </label>
            <label className="slider">
              <span>עוצמה</span>
              <b>{Math.round(volume * 100)}%</b>
              <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
            </label>
          </div>
        </section>
      </div>

      {ghost && (
        <div className="drag-ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          <CardArt type={ghost.type} className="lab-img" />
        </div>
      )}
    </div>
  );
}

function TopBar({ onExit, title, right }) {
  return (
    <div className="topbar">
      <button className="back-btn" onClick={onExit}>
        <Icon name="arrow" size={16} /> חזרה
      </button>
      <h1 className="topbar-title">{title}</h1>
      <span className="topbar-right">{right}</span>
    </div>
  );
}

function Tip() {
  return (
    <p className="tip">
      טיפ: נגנו את המקצב כמה פעמים, ואז נסו לשחזר אותו בלי להסתכל. 4 תיבות של חמש פעמות, ואחרי זה הרמה הבאה.
    </p>
  );
}

// ───────────────────────── App shell ─────────────────────────

export default function App({ variant = "classic" }) {
  const [screen, setScreen] = useState({ name: "welcome" });
  const [history, setHistory] = useState(() => loadHistory());

  const back = () => setScreen({ name: "welcome" });

  return (
    <VariantCtx.Provider value={variant}>
      {screen.name === "welcome" ? (
        <Welcome
          variant={variant}
          history={history}
          onSelect={(id) => {
            setHistory(loadHistory());
            setScreen({ name: "play", mode: id });
          }}
        />
      ) : screen.mode === "lab" ? (
        <Lab key="lab" onExit={back} />
      ) : (
        <Play
          key={screen.mode}
          mode={screen.mode}
          initialLevel={1}
          initialBpm={screen.mode === "gym" ? 90 : 100}
          onExit={back}
        />
      )}
    </VariantCtx.Provider>
  );
}
