// Gym history kept in this browser only (localStorage). Never sent anywhere.

const KEY = "beatit-gym-v1";

export function loadHistory() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSession(session) {
  const history = loadHistory();
  history.push({ ...session, t: Date.now() });
  try {
    localStorage.setItem(KEY, JSON.stringify(history.slice(-200)));
  } catch {
    /* storage may be unavailable (private mode) — the session still works */
  }
  return history;
}

// Turns the last session into a suggestion for the next one.
export function recommend(history, level) {
  const last = history[history.length - 1];
  if (!last) return { level, text: "סשן ראשון — נתחיל ברמה הנוכחית." };
  const acc = last.ok / last.n;
  if (acc >= 0.8 && level < 4)
    return { level: level + 1, text: `דיוק של ${Math.round(acc * 100)}% — מומלץ לעלות לרמה ${level + 1}.` };
  if (acc < 0.5 && level > 1)
    return { level: level - 1, text: `דיוק של ${Math.round(acc * 100)}% — מומלץ לחזור לרמה ${level - 1} ולחזק.` };
  return { level, text: `דיוק של ${Math.round(acc * 100)}% — נשארים ברמה ${level} ומשפרים.` };
}
