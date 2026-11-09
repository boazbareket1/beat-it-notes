import { useEffect, useState } from "react";
import { playBar, playOnce, setBpm, setVol, stop } from "./audio.js";
import { BAR_LENGTH, CARD, FLIP, LEVELS, describeBar, randomBar, sameBar } from "./patterns.js";
import { loadHistory, recommend, saveSession } from "./store.js";

// Links to the physical game and to ordering (WhatsApp, prefilled).
const INSTRUCTIONS_URL = "instructions.html";
const ORDER_URL =
  "https://wa.me/972502003458?text=" +
  encodeURIComponent("שלום בועז, אשמח להזמין ערכת קלפים של BEAT IT");

const DECK_SIZE = 20;
const GYM_SESSION = 10;
const WIN_BARS = 10;

const newDeck = (level) => Array.from({ length: DECK_SIZE }, () => randomBar(level));

// ───────────────────────── Welcome ─────────────────────────

function Welcome({ onSelect, history }) {
  const last = history[history.length - 1];
  const modes = [
    { id: "practice", icon: "📖", title: "תרגול", sub: "רואים את המקצב ומתאמנים בקצב שלכם" },
    { id: "game", icon: "🥁", title: "משחק", sub: "מאזינים, מזהים ואוספים 10 קלפי תיבה" },
    {
      id: "gym",
      icon: "🏋️",
      title: "חדר כושר לקריאת קצב",
      sub: `סשנים של ${GYM_SESSION} תיבות עם מדידת דיוק והמלצה לרמה`,
    },
  ];
  return (
    <div className="welcome">
      <header className="logo">
        <div className="logo-en">BEAT IT</div>
        <div className="logo-sub">NOTES · ביט איט</div>
        <div className="logo-tag">משחק מקצב · הקלפים הפיזיים גם בבית</div>
      </header>

      <div className="mode-list">
        {modes.map((m) => (
          <button key={m.id} className={`mode-card mode-${m.id}`} onClick={() => onSelect(m.id)}>
            <span className="mode-icon">{m.icon}</span>
            <span className="mode-text">
              <span className="mode-title">{m.title}</span>
              <span className="mode-sub">{m.sub}</span>
            </span>
            <span className="mode-arrow">›</span>
          </button>
        ))}
      </div>

      {last && (
        <div className="last-session">
          הסשן האחרון בחדר הכושר: <b>{last.ok}/{last.n}</b> נכונות · רמה {last.level} · {last.bpm} BPM
        </div>
      )}

      <div className="bridge">
        <a className="bridge-btn" href={INSTRUCTIONS_URL}>
          📘 הוראות המשחק הפיזי
        </a>
        <a className="bridge-btn bridge-order" href={ORDER_URL} target="_blank" rel="noopener">
          🛒 הזמנת ערכת הקלפים
        </a>
      </div>

      <footer className="foot">BAREKET-STUDIO © 2026</footer>
    </div>
  );
}

// ───────────────────────── Cards ─────────────────────────

// A physical-looking card. "up" cards are the same card turned 180°.
function PhysCard({ type, compact, onFlip, onRemove }) {
  const c = CARD[type];
  const dirText = c.dir === "up" ? "↑ טאק • כף" : c.dir === "down" ? "↓ בום • שולחן" : "שתק";
  return (
    <div className={`phys ${compact ? "phys-compact" : ""}`} style={{ borderColor: c.color }}>
      <div className="phys-strip" style={{ background: c.color }}>
        {dirText}
      </div>
      <img
        className={`phys-img ${c.dir === "up" ? "is-up" : ""}`}
        src={c.img}
        alt={type}
        draggable={false}
      />
      {onFlip && type !== "rest" && (
        <button className="flip-btn" onClick={onFlip} aria-label="הפוך את הקלף">
          ↕ הפוך
        </button>
      )}
      {onRemove && (
        <button className="remove-btn" onClick={onRemove} aria-label="הסר קלף">
          ✕
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
  return (
    <div className={`target-slot ${active ? "is-active" : ""}`}>
      <img className={`target-img ${c.dir === "up" ? "is-up" : ""}`} src={c.img} alt={type} draggable={false} />
      <span className="target-label">{c.dir === "rest" ? "שתק" : c.dir === "up" ? "↑ טאק" : "↓ בום"}</span>
    </div>
  );
}

function Bank({ types, onAdd }) {
  return (
    <div
      className="bank"
      style={{
        gridTemplateColumns: `repeat(${types.length === 5 ? 4 : types.length}, minmax(0, 1fr))`,
        maxWidth: types.length < 4 ? types.length * 120 : undefined,
        margin: "0 auto",
      }}
    >
      {types.map((t) => (
        <button key={t} className="bank-btn" onClick={() => onAdd(t)} style={{ borderColor: CARD[t].color }}>
          <span className="bank-strip" style={{ background: CARD[t].color }} />
          <img className={`bank-img ${CARD[t].dir === "up" ? "is-up" : ""}`} src={CARD[t].img} alt={t} draggable={false} />
          <span className="bank-sound">{CARD[t].sound}</span>
        </button>
      ))}
    </div>
  );
}

// ───────────────────────── Play (practice / game / gym) ─────────────────────────

function Play({ mode, initialLevel, initialBpm, onExit }) {
  const [level, setLevel] = useState(initialLevel);
  const [bpm, setBpmState] = useState(initialBpm);
  const [volume, setVolume] = useState(0.8);
  const [deck, setDeck] = useState(() => newDeck(initialLevel));
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
  const types = LEVELS[level - 1].types;

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
    setDeck(newDeck(l));
    setIdx(0);
    resetRound();
  }

  function advance() {
    if (idx + 1 >= deck.length) {
      setDeck(newDeck(level));
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
        <div className="summary">
          <div className="summary-score">{summary.ok}/{summary.n}</div>
          <div className="summary-acc">דיוק {acc}% · רמה {summary.level} · {summary.bpm} BPM</div>
          {summary.flip + summary.other > 0 && (
            <div className="summary-errors">
              טעויות כיוון (בום ↔ טאק): <b>{summary.flip}</b> · טעויות סוג: <b>{summary.other}</b>
              {summary.flip > summary.other ? (
                <p>רוב הטעויות היו בכיוון — שימו לב אם הקלף נוחת על השולחן או על הכף.</p>
              ) : summary.other > 0 ? (
                <p>רוב הטעויות היו בסוג התו — שימו לב להבדל בין רבע, שמיניות ושתק.</p>
              ) : null}
            </div>
          )}
          <div className="summary-rec">{summary.rec.text}</div>
          <div className="summary-btns">
            <button
              className="btn-primary"
              onClick={() => startGymSession(summary.rec.level, bpm)}
            >
              סשן הבא ברמה {summary.rec.level} ▶
            </button>
            <button className="btn-ghost" onClick={() => startGymSession(summary.rec.level, Math.min(bpm + 5, 160))}>
              העלה טמפו ל-{Math.min(bpm + 5, 160)} BPM
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
            <span className="score">🏆 {wins}/{WIN_BARS}</span>
          ) : mode === "gym" ? (
            <span className="score">{progressLabel}</span>
          ) : null
        }
      />

      <div className="level-row">
        {LEVELS.map((l, i) => (
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
        <span className="level-sub">{LEVELS[level - 1].sub}</span>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">
            {mode === "practice" ? `תיבה ${idx + 1}` : "המקצב הנכון"}
          </span>
          <div className="panel-tools">
            {mode === "practice" && (
              <>
                <button className="icon-btn" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
                  ‹
                </button>
                <button className="icon-btn" onClick={() => setIdx((i) => Math.min(deck.length - 1, i + 1))}>
                  ›
                </button>
              </>
            )}
            {mode === "practice" && (
              <button className="chip-btn" onClick={() => setReveal((r) => !r)}>
                {reveal ? "🙈 הסתר" : "👁 גלה"}
              </button>
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
            {playing ? (tick?.phase === "count" ? "🥁 ספירה…" : "🎵 מנגן…") : "🔊 נגן מקצב"}
          </button>
          <div className="sliders">
            <label className="slider">
              <span>BPM</span>
              <b style={{ color: LEVELS[level - 1].color }}>{bpm}</b>
              <input type="range" min="60" max="160" step="1" value={bpm} onChange={(e) => setBpmState(Number(e.target.value))} />
            </label>
            <label className="slider">
              <span>VOL</span>
              <b style={{ color: "#34D399" }}>{Math.round(volume * 100)}%</b>
              <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
            </label>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">צרו תיבה זהה לנתונה</span>
          <span className="panel-hint">לחצו קלף כדי להוסיף · ↕ להפוך בין בום לטאק</span>
        </div>

        <div className="answer-row" dir="ltr">
          {[0, 1, 2, 3].map((i) =>
            answer[i] ? (
              <PhysCard
                key={i}
                type={answer[i]}
                compact
                onFlip={result === null ? () => flipAt(i) : null}
              />
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
            <button className="undo-btn" onClick={() => setAnswer((a) => a.slice(0, -1))} disabled={answer.length === 0}>
              ⌫
            </button>
            <button className="check-btn" onClick={check} disabled={!canCheck}>
              {canCheck ? "✓ בדוק!" : `${answer.length}/4 קלפים`}
            </button>
          </div>
        )}

        {result !== null && (
          <div className={`result ${result === "ok" ? "is-ok" : "is-fail"}`}>
            <div className="result-icon">{result === "ok" ? "🏆" : "❌"}</div>
            <div className="result-title">{result === "ok" ? "כל הכבוד!" : "לא מדויק…"}</div>
            {result === "ok" && mode === "game" && (
              <div className="result-sub">
                +1 קלף תיבה · {wins}/{WIN_BARS}
                {wins >= WIN_BARS && level < 4 ? ` · עולים לרמה ${level + 1}!` : ""}
              </div>
            )}
            {result === "fail" && (
              <div className="result-sub">המקצב הנכון: {describeBar(bar)}</div>
            )}
            <div className="result-btns">
              {result === "fail" && mode !== "practice" && mode !== "gym" && (
                <button className="btn-primary" onClick={() => { setAnswer([]); setResult(null); }}>
                  נסה שוב
                </button>
              )}
              <button className="btn-primary" onClick={next}>
                {mode === "gym" && gym.n >= GYM_SESSION
                  ? "סיום סשן ▶"
                  : mode === "game" && result === "ok" && wins >= WIN_BARS && level < 4
                    ? `לרמה ${level + 1} ▶`
                    : result === "fail" && mode === "game"
                      ? "דלג ▶"
                      : "הבא ▶"}
              </button>
            </div>
          </div>
        )}
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

function TopBar({ onExit, title, right }) {
  return (
    <div className="topbar">
      <button className="back-btn" onClick={onExit}>
        → חזרה
      </button>
      <span className="topbar-title">{title}</span>
      <span className="topbar-right">{right}</span>
    </div>
  );
}

function Tip() {
  return (
    <div className="tip">
      טיפ: נגנו את המקצב כמה פעמים, ואז נסו לשחזר אותו בלי להסתכל. 4 תיבות של חמש פעמות, ואחרי זה הרמה הבאה.
    </div>
  );
}

// ───────────────────────── App shell ─────────────────────────

export default function App() {
  const [screen, setScreen] = useState({ name: "welcome" });
  const [history, setHistory] = useState(() => loadHistory());

  if (screen.name === "welcome") {
    return (
      <Welcome
        history={history}
        onSelect={(id) => {
          setHistory(loadHistory());
          setScreen({ name: "play", mode: id });
        }}
      />
    );
  }

  return (
    <Play
      key={screen.mode}
      mode={screen.mode}
      initialLevel={1}
      initialBpm={screen.mode === "gym" ? 90 : 100}
      onExit={() => setScreen({ name: "welcome" })}
    />
  );
}
