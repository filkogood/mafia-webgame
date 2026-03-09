import { Router, Request, Response, IRouter } from 'express';
import { getRoom } from '../state/roomStore';
import { canDownloadPublicLog, canDownloadFullLog } from '../log/gameLog';
import { readGameLog, LOG_DIR } from '../log/logStore';

export const logRouter: IRouter = Router();

/**
 * GET /log/:roomId/public?playerId=<socketId>
 *
 * Download the public game log for a completed game.
 * Available to any player who participated in the room.
 */
logRouter.get('/:roomId/public', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const playerId = req.query.playerId as string | undefined;

  if (!playerId) {
    res.status(400).json({ error: 'playerId query parameter is required' });
    return;
  }

  const room = getRoom(roomId);

  if (!canDownloadPublicLog(roomId, playerId, room)) {
    res.status(403).json({
      error:
        'Access denied: game has not ended yet or you are not a participant',
    });
    return;
  }

  const log = readGameLog(roomId, 'public', LOG_DIR);
  if (!log) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }

  const filename = `mafia_public_${roomId}_${safeTimestamp(log.endedAt)}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.json(log);
});

/**
 * GET /log/:roomId/full?playerId=<socketId>
 *
 * Download the full audit log for a completed game.
 * Available to the host (room owner) only.
 */
logRouter.get('/:roomId/full', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const playerId = req.query.playerId as string | undefined;

  if (!playerId) {
    res.status(400).json({ error: 'playerId query parameter is required' });
    return;
  }

  const room = getRoom(roomId);

  if (!canDownloadFullLog(roomId, playerId, room)) {
    res.status(403).json({
      error:
        'Access denied: game has not ended yet or you are not the host',
    });
    return;
  }

  const log = readGameLog(roomId, 'full', LOG_DIR);
  if (!log) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }

  const filename = `mafia_full_${roomId}_${safeTimestamp(log.endedAt)}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.json(log);
});

function safeTimestamp(iso: string): string {
  return iso.replace(/[:.]/g, '-');
}
