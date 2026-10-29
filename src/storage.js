/**
 * Versioned persistence adapter for career progress.
 *
 * Supports the Artifact host, browser localStorage, and an in-memory fallback. The
 * fallback keeps the app usable, but callers can inspect storageBackend() and must not
 * assume memory-backed writes survive a reload. Existing unversioned career objects
 * are migrated on read so updates do not discard players' progress.
 */

const KEY = 'career';
const SCHEMA_VERSION = 1;
const MAX_RUNS = 500;
const memory = new Map();

/** @returns {'artifact'|'local'|'memory'} */
export function storageBackend() {
  if (typeof window !== 'undefined' && window.storage?.get && window.storage?.set) return 'artifact';
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__ecu_lab_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return 'local';
    }
  } catch { /* memory fallback below */ }
  return 'memory';
}

/** @typedef {object} Career
 * @property {number} best
 * @property {number} total
 * @property {number} pulls
 * @property {import('./ui/state/runLog.js').RunRecord[]} runs
 * @property {string|null} pinnedRunId
 */

const EMPTY_CAREER = Object.freeze({ best: 0, total: 0, pulls: 0, runs: [], pinnedRunId: null });
const emptyCareer = () => ({ ...EMPTY_CAREER, runs: [] });
const nonNegativeNumber = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Validate persisted data without trusting localStorage or imported saves. */
function normalizeCareer(value) {
  if (!isRecord(value)) return emptyCareer();
  const runs = Array.isArray(value.runs)
    ? value.runs.filter((run) => isRecord(run) && typeof run.id === 'string').slice(0, MAX_RUNS)
    : [];
  const requestedPin = typeof value.pinnedRunId === 'string' ? value.pinnedRunId : null;
  return {
    best: nonNegativeNumber(value.best),
    total: nonNegativeNumber(value.total),
    pulls: Math.floor(nonNegativeNumber(value.pulls)),
    runs,
    pinnedRunId: requestedPin && runs.some((run) => run.id === requestedPin) ? requestedPin : null,
  };
}

function unwrapSave(parsed) {
  // Schema 1 is { schemaVersion, career }. Unversioned saves are the previous format.
  if (!isRecord(parsed)) return emptyCareer();
  if (parsed.schemaVersion === SCHEMA_VERSION && isRecord(parsed.career)) return normalizeCareer(parsed.career);
  if (parsed.schemaVersion == null) return normalizeCareer(parsed);
  // Unknown future schema: do not reinterpret it as a legacy save and overwrite it.
  return emptyCareer();
}

async function readRaw() {
  switch (storageBackend()) {
    case 'artifact': return (await window.storage.get(KEY))?.value ?? null;
    case 'local': return localStorage.getItem(KEY);
    default: return memory.get(KEY) ?? null;
  }
}

/** Reads career stats; corrupt and incompatible saves fail safely to an empty career. */
export async function loadCareer() {
  try {
    const raw = await readRaw();
    if (!raw) return emptyCareer();
    return unwrapSave(JSON.parse(raw));
  } catch {
    return emptyCareer();
  }
}

/** @param {Partial<Career>} career @returns {Promise<boolean>} whether persistence succeeded */
export async function saveCareer(career) {
  const safe = normalizeCareer(career);
  const raw = JSON.stringify({ schemaVersion: SCHEMA_VERSION, career: safe });
  try {
    switch (storageBackend()) {
      case 'artifact': await window.storage.set(KEY, raw); return true;
      case 'local': localStorage.setItem(KEY, raw); return true;
      default: memory.set(KEY, raw); return true;
    }
  } catch {
    return false;
  }
}

/** Clears the active backend. */
export async function clearCareer() {
  try {
    switch (storageBackend()) {
      case 'artifact': await window.storage.set(KEY, ''); break;
      case 'local': localStorage.removeItem(KEY); break;
      default: memory.delete(KEY);
    }
  } catch { /* clearing is best effort */ }
}
