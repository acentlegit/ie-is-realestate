/**
 * Persist intent history to localStorage keyed by user (survives refresh / logout / login).
 * Max 50 entries per user.
 */
const MAX_HISTORY = 50;
const PREFIX = "uip_intent_history_";

export function getStorageKey(userId) {
  return PREFIX + (userId || "anonymous");
}

export function loadIntentHistory(userId) {
  try {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

export function saveIntentHistory(userId, history) {
  try {
    const key = getStorageKey(userId);
    const list = Array.isArray(history) ? history.slice(0, MAX_HISTORY) : [];
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    console.warn("[intentHistory] save failed:", e);
  }
}

/** Merge current session into stored history (for beforeunload). */
export function saveCurrentSessionToHistory(userId, currentEntry, existingHistory) {
  if (!currentEntry?.intent) return;
  const key = getStorageKey(userId);
  try {
    const list = Array.isArray(existingHistory) ? existingHistory : loadIntentHistory(userId);
    const entry = {
      ...currentEntry,
      createdAt: currentEntry.createdAt || new Date().toISOString(),
    };
    const next = [entry, ...list.filter((e) => e.intent?.id !== entry.intent?.id)].slice(0, MAX_HISTORY);
    localStorage.setItem(key, JSON.stringify(next));
  } catch (e) {
    console.warn("[intentHistory] save current session failed:", e);
  }
}
