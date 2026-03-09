import {
  LogEvent,
  GameLog,
  Phase,
  PhaseTransitionEvent,
  NightActionEvent,
  DeathEvent,
  VoteCastEvent,
  VoteResultEvent,
  RoleChangeEvent,
  StatusEvent,
  ContactSuccessEvent,
  GameEndedEvent,
} from '@mafia/shared';
import { Player, Room } from '@mafia/shared';

export const SCHEMA_VERSION = 1;

/** In-memory log event accumulator per room */
const roomLogEvents = new Map<string, LogEvent[]>();

/** Metadata captured when a game starts (before room may be deleted) */
const roomLogMeta = new Map<string, { startedAt: string; hostId: string }>();

/** Metadata for completed games kept for permission checks after room deletion */
export const completedGames = new Map<
  string,
  { timestamp: string; hostId: string; playerIds: string[] }
>();

export function initRoomLog(room: Room): void {
  roomLogEvents.set(room.id, []);
  roomLogMeta.set(room.id, {
    startedAt: new Date().toISOString(),
    hostId: room.hostId,
  });
}

export function appendEvent(roomId: string, event: LogEvent): void {
  const events = roomLogEvents.get(roomId);
  if (events) events.push(event);
}

/** Build full and public GameLog objects for a completed game */
export function finalizeRoomLog(room: Room): { full: GameLog; public: GameLog } {
  const events = roomLogEvents.get(room.id) ?? [];
  const meta = roomLogMeta.get(room.id) ?? {
    startedAt: new Date().toISOString(),
    hostId: room.hostId,
  };
  const endedAt = new Date().toISOString();
  const timestamp = endedAt;

  const playerIds = room.players.map((p) => p.id);

  // Record metadata for permission checks after room may be deleted
  completedGames.set(room.id, {
    timestamp,
    hostId: room.hostId,
    playerIds,
  });

  const fullLog: GameLog = {
    schemaVersion: SCHEMA_VERSION,
    roomId: room.id,
    hostId: room.hostId,
    startedAt: meta.startedAt,
    endedAt,
    events,
  };

  const publicLog: GameLog = buildPublicLog(fullLog, room.players);

  // Clean up in-memory accumulators
  roomLogEvents.delete(room.id);
  roomLogMeta.delete(room.id);

  return { full: fullLog, public: publicLog };
}

/** Build a public log by replacing socket IDs with nicknames */
export function buildPublicLog(fullLog: GameLog, players: Player[]): GameLog {
  const idToNickname = new Map<string, string>();
  for (const p of players) {
    idToNickname.set(p.id, p.nickname);
  }

  const scrubbedEvents = fullLog.events.map((ev) =>
    scrubEvent(ev, idToNickname)
  );

  // Public log omits hostId (socket ID)
  return {
    schemaVersion: fullLog.schemaVersion,
    roomId: fullLog.roomId,
    startedAt: fullLog.startedAt,
    endedAt: fullLog.endedAt,
    events: scrubbedEvents,
  };
}

/** Replace socket IDs with nicknames in an event */
function scrubEvent(
  event: LogEvent,
  idToNickname: Map<string, string>
): LogEvent {
  const nick = (id: string) => idToNickname.get(id) ?? id;
  switch (event.type) {
    case 'night_action':
      return {
        ...event,
        actorId: nick(event.actorId),
        targetId: event.targetId ? nick(event.targetId) : null,
      } as NightActionEvent;
    case 'death':
      return { ...event, playerId: nick(event.playerId) } as DeathEvent;
    case 'vote_cast':
      return {
        ...event,
        voterId: nick(event.voterId),
        targetId: event.targetId ? nick(event.targetId) : undefined,
      } as VoteCastEvent;
    case 'vote_result': {
      const r = event as VoteResultEvent;
      return {
        ...r,
        candidateId: r.candidateId ? nick(r.candidateId) : null,
      } as VoteResultEvent;
    }
    case 'role_change':
      return { ...event, playerId: nick(event.playerId) } as RoleChangeEvent;
    case 'status_applied':
    case 'status_cleared': {
      const s = event as StatusEvent;
      return {
        ...s,
        playerId: nick(s.playerId),
        actorId: s.actorId ? nick(s.actorId) : undefined,
      } as StatusEvent;
    }
    case 'contact_success': {
      const c = event as ContactSuccessEvent;
      return { ...c, collaboratorId: nick(c.collaboratorId) } as ContactSuccessEvent;
    }
    case 'game_ended': {
      const g = event as GameEndedEvent;
      return {
        ...g,
        finalRoles: g.finalRoles.map((fr) => ({
          ...fr,
          playerId: nick(fr.playerId),
        })),
      } as GameEndedEvent;
    }
    default:
      return event;
  }
}

/** Returns true if a player can download the public log for this room */
export function canDownloadPublicLog(
  roomId: string,
  playerId: string,
  room?: Room
): boolean {
  // Check live room first
  if (room) {
    return (
      room.phase === 'ENDED' &&
      room.players.some((p) => p.id === playerId)
    );
  }
  // Fall back to completed-game metadata
  const meta = completedGames.get(roomId);
  if (!meta) return false;
  return meta.playerIds.includes(playerId);
}

/** Returns true if a player can download the full audit log for this room */
export function canDownloadFullLog(
  roomId: string,
  playerId: string,
  room?: Room
): boolean {
  // Check live room first
  if (room) {
    return room.phase === 'ENDED' && room.hostId === playerId;
  }
  // Fall back to completed-game metadata
  const meta = completedGames.get(roomId);
  if (!meta) return false;
  return meta.hostId === playerId;
}

/** Helper to create a timestamped base event */
export function makeBaseEvent(
  type: LogEvent['type'],
  round: number,
  phase: string
): BaseLogEvent {
  return { type, round, phase, ts: new Date().toISOString() };
}

type BaseLogEvent = { type: LogEvent['type']; round: number; phase: string; ts: string };

export function makePhaseTransition(
  fromPhase: string,
  toPhase: string,
  round: number
): PhaseTransitionEvent {
  return {
    ...makeBaseEvent('phase_transition', round, fromPhase),
    type: 'phase_transition',
    fromPhase,
    toPhase,
  };
}

export function makeNightAction(
  actor: Player,
  target: Player | null,
  round: number
): NightActionEvent {
  return {
    ...makeBaseEvent('night_action', round, Phase.NIGHT),
    type: 'night_action',
    actorId: actor.id,
    actorNickname: actor.nickname,
    actorRole: actor.role,
    targetId: target?.id ?? null,
    targetNickname: target?.nickname ?? null,
  };
}

export function makeDeath(
  player: Player,
  round: number,
  phase: string,
  cause: DeathEvent['cause']
): DeathEvent {
  return {
    ...makeBaseEvent('death', round, phase),
    type: 'death',
    playerId: player.id,
    nickname: player.nickname,
    role: player.role,
    cause,
  };
}

export function makeVoteCast(
  voter: Player,
  round: number,
  votePhase: 'vote1' | 'vote2',
  opts: { targetId?: string; targetNickname?: string; weight: number; choice?: 'yes' | 'no' }
): VoteCastEvent {
  const phase = votePhase === 'vote1' ? Phase.VOTE1 : Phase.VOTE2;
  return {
    ...makeBaseEvent('vote_cast', round, phase),
    type: 'vote_cast',
    voterId: voter.id,
    voterNickname: voter.nickname,
    votePhase,
    ...opts,
  };
}

export function makeVoteResult(
  round: number,
  votePhase: 'vote1' | 'vote2',
  opts: {
    candidateId: string | null;
    candidateNickname: string | null;
    tally: Record<string, number> | { yes: number; no: number };
    executed: boolean;
  }
): VoteResultEvent {
  const phase = votePhase === 'vote1' ? Phase.VOTE1 : Phase.VOTE2;
  return {
    ...makeBaseEvent('vote_result', round, phase),
    type: 'vote_result',
    votePhase,
    ...opts,
  };
}

export function makeRoleChange(
  player: Player,
  fromRole: string,
  toRole: string,
  round: number,
  reason: string
): RoleChangeEvent {
  return {
    ...makeBaseEvent('role_change', round, Phase.NIGHT),
    type: 'role_change',
    playerId: player.id,
    nickname: player.nickname,
    fromRole,
    toRole,
    reason,
  };
}

export function makeStatusEvent(
  eventType: 'status_applied' | 'status_cleared',
  player: Player,
  status: StatusEvent['status'],
  round: number,
  phase: string,
  actor?: Player
): StatusEvent {
  return {
    ...makeBaseEvent(eventType, round, phase),
    type: eventType,
    playerId: player.id,
    nickname: player.nickname,
    status,
    actorId: actor?.id,
    actorNickname: actor?.nickname,
  };
}

export function makeContactSuccess(
  collab: Player,
  round: number
): ContactSuccessEvent {
  return {
    ...makeBaseEvent('contact_success', round, Phase.NIGHT),
    type: 'contact_success',
    collaboratorId: collab.id,
    collaboratorNickname: collab.nickname,
    collaboratorRole: collab.role,
  };
}

export function makeGameEnded(
  winner: 'mafia' | 'citizen',
  reason: string,
  round: number,
  phase: string,
  players: Player[]
): GameEndedEvent {
  return {
    ...makeBaseEvent('game_ended', round, phase),
    type: 'game_ended',
    winner,
    reason,
    finalRoles: players.map((p) => ({
      playerId: p.id,
      nickname: p.nickname,
      role: p.role,
      isAlive: p.isAlive,
    })),
  };
}
