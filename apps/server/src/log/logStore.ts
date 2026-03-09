import * as fs from 'fs';
import * as path from 'path';
import { GameLog } from '@mafia/shared';

export const LOG_DIR = process.env.LOG_DIR ?? path.join(process.cwd(), 'logs');
export const LOG_KEEP_LAST_N = parseInt(process.env.LOG_KEEP_LAST_N ?? '200', 10);

/** File metadata extracted from a log filename */
interface LogFileMeta {
  timestamp: string;
  roomId: string;
  type: 'public' | 'full';
  filename: string;
}

/** Parse a log filename into its components */
export function parseLogFilename(filename: string): LogFileMeta | null {
  // Format: {ISO_timestamp}_{roomId}_{type}.json
  const match = filename.match(/^(.+)_([A-Z0-9]{6})_(public|full)\.json$/);
  if (!match) return null;
  return {
    timestamp: match[1],
    roomId: match[2],
    type: match[3] as 'public' | 'full',
    filename,
  };
}

/** Build a log filename from its components */
export function buildLogFilename(
  timestamp: string,
  roomId: string,
  type: 'public' | 'full'
): string {
  return `${timestamp}_${roomId}_${type}.json`;
}

/** Ensure the log directory exists */
function ensureLogDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Write both public and full logs to disk.
 * Uses the endedAt timestamp from the full log as the filename timestamp.
 */
export function persistGameLogs(
  publicLog: GameLog,
  fullLog: GameLog,
  logDir: string = LOG_DIR
): void {
  ensureLogDir(logDir);

  // Sanitise the timestamp so it is safe as a filename component
  const timestamp = (fullLog.endedAt ?? new Date().toISOString()).replace(
    /[:.]/g,
    '-'
  );
  const roomId = fullLog.roomId;

  const publicPath = path.join(logDir, buildLogFilename(timestamp, roomId, 'public'));
  const fullPath = path.join(logDir, buildLogFilename(timestamp, roomId, 'full'));

  fs.writeFileSync(publicPath, JSON.stringify(publicLog, null, 2), 'utf8');
  fs.writeFileSync(fullPath, JSON.stringify(fullLog, null, 2), 'utf8');
}

/**
 * Read a game log from disk by roomId and type.
 * Returns null if no file for that room is found.
 */
export function readGameLog(
  roomId: string,
  type: 'public' | 'full',
  logDir: string = LOG_DIR
): GameLog | null {
  if (!fs.existsSync(logDir)) return null;
  const files = fs.readdirSync(logDir);
  const matching = files
    .map(parseLogFilename)
    .filter((m): m is LogFileMeta => m !== null && m.roomId === roomId && m.type === type)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // newest first

  if (matching.length === 0) return null;
  const content = fs.readFileSync(path.join(logDir, matching[0].filename), 'utf8');
  return JSON.parse(content) as GameLog;
}

/**
 * Enforce retention: keep only the latest `keepN` games (public+full count as one game).
 * Deletes the oldest game pairs beyond the limit.
 */
export function pruneOldLogs(
  logDir: string = LOG_DIR,
  keepN: number = LOG_KEEP_LAST_N
): void {
  if (!fs.existsSync(logDir)) return;

  const files = fs.readdirSync(logDir);
  const parsed = files
    .map(parseLogFilename)
    .filter((m): m is LogFileMeta => m !== null);

  // Group by game: use "{timestamp}_{roomId}" as the game key
  const gameKeys = new Set<string>();
  for (const m of parsed) {
    gameKeys.add(`${m.timestamp}_${m.roomId}`);
  }

  // Sort game keys descending (newest first)
  const sortedKeys = Array.from(gameKeys).sort((a, b) => b.localeCompare(a));

  // Delete files belonging to games beyond the keepN limit
  if (sortedKeys.length <= keepN) return;

  const toDelete = new Set(sortedKeys.slice(keepN));
  for (const m of parsed) {
    const key = `${m.timestamp}_${m.roomId}`;
    if (toDelete.has(key)) {
      try {
        fs.unlinkSync(path.join(logDir, m.filename));
      } catch {
        // ignore deletion errors
      }
    }
  }
}
