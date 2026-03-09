import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  buildPublicLog,
  canDownloadPublicLog,
  canDownloadFullLog,
  completedGames,
  finalizeRoomLog,
  initRoomLog,
  appendEvent,
  makePhaseTransition,
  makeNightAction,
  makeDeath,
  makeGameEnded,
} from '../log/gameLog';
import { parseLogFilename, buildLogFilename, pruneOldLogs, persistGameLogs } from '../log/logStore';
import { GameLog, Player, Role, Phase, DEFAULT_SETTINGS } from '@mafia/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(
  id: string,
  role: Role,
  extra: Partial<Player> = {}
): Player {
  return {
    id,
    nickname: `nick_${id}`,
    role,
    isAlive: true,
    isCouple: false,
    couplePairId: null,
    isDrunk: false,
    drunkExpiresAfterVote2: null,
    isVoteBlocked: false,
    voteBlockExpiresAfterVote2: null,
    isHypnotized: false,
    hypnotizedExpiresAtVote2: null,
    hasInheritedMafia: false,
    knownMafiaTeam: null,
    ghostVotesUsedVote1: false,
    ghostVotesUsedVote2: false,
    ...extra,
  };
}

function makeRoom(
  id: string,
  hostId: string,
  players: Player[],
  phase: Phase = Phase.ENDED
) {
  return {
    id,
    hostId,
    players,
    phase,
    round: 1,
    settings: { ...DEFAULT_SETTINGS },
    vote1Candidate: null,
    vote1Tally: {},
    vote2Tally: { yes: 0, no: 0 },
    nightActions: {},
    quickFinishVotes: [],
  };
}

function makeFullLog(roomId: string, hostId: string, playerIds: string[]): GameLog {
  return {
    schemaVersion: 1,
    roomId,
    hostId,
    startedAt: '2024-01-01T00:00:00.000Z',
    endedAt: '2024-01-01T01:00:00.000Z',
    events: [
      {
        type: 'night_action',
        round: 1,
        phase: 'NIGHT',
        ts: '2024-01-01T00:05:00.000Z',
        actorId: playerIds[0],
        actorNickname: 'Alice',
        actorRole: Role.MAFIA,
        targetId: playerIds[1],
        targetNickname: 'Bob',
      },
      {
        type: 'death',
        round: 1,
        phase: 'NIGHT',
        ts: '2024-01-01T00:10:00.000Z',
        playerId: playerIds[1],
        nickname: 'Bob',
        role: Role.CITIZEN,
        cause: 'mafia_kill',
      },
      {
        type: 'game_ended',
        round: 1,
        phase: 'NIGHT',
        ts: '2024-01-01T01:00:00.000Z',
        winner: 'mafia',
        reason: 'Mafia wins',
        finalRoles: [
          { playerId: playerIds[0], nickname: 'Alice', role: Role.MAFIA, isAlive: true },
          { playerId: playerIds[1], nickname: 'Bob', role: Role.CITIZEN, isAlive: false },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 1. Log filename parsing
// ---------------------------------------------------------------------------

describe('parseLogFilename', () => {
  it('parses a valid public log filename', () => {
    const result = parseLogFilename('2024-01-01T00-00-00-000Z_ABC123_public.json');
    expect(result).not.toBeNull();
    expect(result?.roomId).toBe('ABC123');
    expect(result?.type).toBe('public');
    expect(result?.timestamp).toBe('2024-01-01T00-00-00-000Z');
  });

  it('parses a valid full log filename', () => {
    const result = parseLogFilename('2024-01-01T00-00-00-000Z_XYZ789_full.json');
    expect(result?.type).toBe('full');
    expect(result?.roomId).toBe('XYZ789');
  });

  it('returns null for an invalid filename', () => {
    expect(parseLogFilename('notavalidfile.json')).toBeNull();
    expect(parseLogFilename('abc_full.json')).toBeNull();
  });
});

describe('buildLogFilename', () => {
  it('builds a correct filename', () => {
    const name = buildLogFilename('2024-01-01T00-00-00-000Z', 'ABC123', 'public');
    expect(name).toBe('2024-01-01T00-00-00-000Z_ABC123_public.json');
  });
});

// ---------------------------------------------------------------------------
// 2. Retention (pruneOldLogs)
// ---------------------------------------------------------------------------

describe('pruneOldLogs', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mafia-log-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createFakeGame(ts: string, roomId: string): void {
    fs.writeFileSync(path.join(tmpDir, `${ts}_${roomId}_public.json`), '{}');
    fs.writeFileSync(path.join(tmpDir, `${ts}_${roomId}_full.json`), '{}');
  }

  it('keeps all games when under limit', () => {
    createFakeGame('2024-01-01T00-00-00-000Z', 'AAA111');
    createFakeGame('2024-01-02T00-00-00-000Z', 'BBB222');
    pruneOldLogs(tmpDir, 5);
    expect(fs.readdirSync(tmpDir).length).toBe(4); // 2 games × 2 files
  });

  it('deletes oldest games beyond keepN', () => {
    createFakeGame('2024-01-01T00-00-00-000Z', 'OLD001');
    createFakeGame('2024-01-02T00-00-00-000Z', 'OLD002');
    createFakeGame('2024-01-03T00-00-00-000Z', 'NEW003');
    pruneOldLogs(tmpDir, 2);
    const files = fs.readdirSync(tmpDir);
    expect(files.length).toBe(4); // 2 newest kept
    expect(files.some((f) => f.includes('OLD001'))).toBe(false);
    expect(files.some((f) => f.includes('NEW003'))).toBe(true);
  });

  it('deletes nothing when directory does not exist', () => {
    expect(() =>
      pruneOldLogs('/nonexistent/path/12345', 10)
    ).not.toThrow();
  });

  it('handles empty directory without error', () => {
    expect(() => pruneOldLogs(tmpDir, 5)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 3. Public log scrubbing (buildPublicLog)
// ---------------------------------------------------------------------------

describe('buildPublicLog', () => {
  const playerIds = ['socket-abc', 'socket-xyz'];
  const players = [
    makePlayer('socket-abc', Role.MAFIA),
    makePlayer('socket-xyz', Role.CITIZEN),
  ];

  it('replaces socket IDs with nicknames in night_action event', () => {
    const full = makeFullLog('ROOM01', 'socket-abc', playerIds);
    const pub = buildPublicLog(full, players);
    const nightAction = pub.events.find((e) => e.type === 'night_action') as any;
    expect(nightAction.actorId).toBe('nick_socket-abc');
    expect(nightAction.targetId).toBe('nick_socket-xyz');
  });

  it('replaces socket IDs in death event', () => {
    const full = makeFullLog('ROOM01', 'socket-abc', playerIds);
    const pub = buildPublicLog(full, players);
    const death = pub.events.find((e) => e.type === 'death') as any;
    expect(death.playerId).toBe('nick_socket-xyz');
  });

  it('replaces socket IDs in game_ended finalRoles', () => {
    const full = makeFullLog('ROOM01', 'socket-abc', playerIds);
    const pub = buildPublicLog(full, players);
    const ended = pub.events.find((e) => e.type === 'game_ended') as any;
    expect(ended.finalRoles[0].playerId).toBe('nick_socket-abc');
    expect(ended.finalRoles[1].playerId).toBe('nick_socket-xyz');
  });

  it('does not include hostId in public log', () => {
    const full = makeFullLog('ROOM01', 'socket-abc', playerIds);
    const pub = buildPublicLog(full, players);
    expect(pub.hostId).toBeUndefined();
  });

  it('preserves schemaVersion and roomId', () => {
    const full = makeFullLog('ROOM01', 'socket-abc', playerIds);
    const pub = buildPublicLog(full, players);
    expect(pub.schemaVersion).toBe(1);
    expect(pub.roomId).toBe('ROOM01');
  });
});

// ---------------------------------------------------------------------------
// 4. Permission checks (canDownloadPublicLog / canDownloadFullLog)
// ---------------------------------------------------------------------------

describe('canDownloadPublicLog', () => {
  const players = [
    makePlayer('player1', Role.MAFIA),
    makePlayer('player2', Role.CITIZEN),
  ];

  it('allows a participant when game has ended', () => {
    const room = makeRoom('ROOM01', 'player1', players, Phase.ENDED);
    expect(canDownloadPublicLog('ROOM01', 'player1', room)).toBe(true);
    expect(canDownloadPublicLog('ROOM01', 'player2', room)).toBe(true);
  });

  it('denies access when game has not ended', () => {
    const room = makeRoom('ROOM01', 'player1', players, Phase.NIGHT);
    expect(canDownloadPublicLog('ROOM01', 'player1', room)).toBe(false);
  });

  it('denies access for a non-participant', () => {
    const room = makeRoom('ROOM01', 'player1', players, Phase.ENDED);
    expect(canDownloadPublicLog('ROOM01', 'stranger', room)).toBe(false);
  });

  it('falls back to completedGames metadata when room is absent', () => {
    completedGames.set('ROOM_GONE', {
      timestamp: '2024-01-01T00-00-00-000Z',
      hostId: 'host1',
      playerIds: ['host1', 'player2'],
    });
    expect(canDownloadPublicLog('ROOM_GONE', 'player2')).toBe(true);
    expect(canDownloadPublicLog('ROOM_GONE', 'nobody')).toBe(false);
    completedGames.delete('ROOM_GONE');
  });

  it('denies when neither room nor metadata exists', () => {
    expect(canDownloadPublicLog('NOROOM', 'anyone')).toBe(false);
  });
});

describe('canDownloadFullLog', () => {
  const players = [
    makePlayer('host1', Role.MAFIA),
    makePlayer('player2', Role.CITIZEN),
  ];

  it('allows the host when game has ended', () => {
    const room = makeRoom('ROOM02', 'host1', players, Phase.ENDED);
    expect(canDownloadFullLog('ROOM02', 'host1', room)).toBe(true);
  });

  it('denies a non-host player', () => {
    const room = makeRoom('ROOM02', 'host1', players, Phase.ENDED);
    expect(canDownloadFullLog('ROOM02', 'player2', room)).toBe(false);
  });

  it('denies the host when game has not ended', () => {
    const room = makeRoom('ROOM02', 'host1', players, Phase.NIGHT);
    expect(canDownloadFullLog('ROOM02', 'host1', room)).toBe(false);
  });

  it('falls back to completedGames for host check when room is absent', () => {
    completedGames.set('ROOM_GONE2', {
      timestamp: '2024-01-01T00-00-00-000Z',
      hostId: 'host1',
      playerIds: ['host1', 'player2'],
    });
    expect(canDownloadFullLog('ROOM_GONE2', 'host1')).toBe(true);
    expect(canDownloadFullLog('ROOM_GONE2', 'player2')).toBe(false);
    completedGames.delete('ROOM_GONE2');
  });
});

// ---------------------------------------------------------------------------
// 5. Log accumulation & finalizeRoomLog
// ---------------------------------------------------------------------------

describe('finalizeRoomLog', () => {
  it('builds full log with hostId and events', () => {
    const players = [
      makePlayer('m1', Role.MAFIA),
      makePlayer('c1', Role.CITIZEN),
    ];
    const room = makeRoom('TESTROOM', 'm1', players, Phase.ENDED);

    initRoomLog(room);
    appendEvent('TESTROOM', makePhaseTransition('LOBBY', 'NIGHT', 1));
    appendEvent('TESTROOM', makeGameEnded('mafia', 'Mafia wins', 1, 'NIGHT', players));

    const { full, public: pub } = finalizeRoomLog(room);

    expect(full.roomId).toBe('TESTROOM');
    expect(full.hostId).toBe('m1');
    expect(full.events.length).toBe(2);
    expect(full.events[0].type).toBe('phase_transition');

    // Public log should have nicknames instead of socket IDs
    expect(pub.hostId).toBeUndefined();
    const endedEvent = pub.events.find((e) => e.type === 'game_ended') as any;
    expect(endedEvent.finalRoles[0].playerId).toBe('nick_m1');

    // Metadata should be saved for future permission checks
    const meta = completedGames.get('TESTROOM');
    expect(meta?.hostId).toBe('m1');
    expect(meta?.playerIds).toContain('m1');
    expect(meta?.playerIds).toContain('c1');
  });
});

// ---------------------------------------------------------------------------
// 6. persistGameLogs writes to disk
// ---------------------------------------------------------------------------

describe('persistGameLogs', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mafia-persist-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes public and full log files', () => {
    const playerIds = ['p1', 'p2'];
    const fullLog = makeFullLog('RM0001', 'p1', playerIds);
    const players = playerIds.map((id) => makePlayer(id, id === 'p1' ? Role.MAFIA : Role.CITIZEN));
    const pubLog = buildPublicLog(fullLog, players);

    persistGameLogs(pubLog, fullLog, tmpDir);

    const files = fs.readdirSync(tmpDir);
    expect(files.some((f) => f.includes('RM0001') && f.includes('public'))).toBe(true);
    expect(files.some((f) => f.includes('RM0001') && f.includes('full'))).toBe(true);
  });

  it('written full log contains hostId', () => {
    const playerIds = ['p1', 'p2'];
    const fullLog = makeFullLog('RM0002', 'p1', playerIds);
    const players = playerIds.map((id) => makePlayer(id, id === 'p1' ? Role.MAFIA : Role.CITIZEN));
    const pubLog = buildPublicLog(fullLog, players);

    persistGameLogs(pubLog, fullLog, tmpDir);

    const files = fs.readdirSync(tmpDir);
    const fullFile = files.find((f) => f.includes('RM0002') && f.includes('full'))!;
    const content = JSON.parse(fs.readFileSync(path.join(tmpDir, fullFile), 'utf8')) as GameLog;
    expect(content.hostId).toBe('p1');
  });

  it('written public log does not contain hostId', () => {
    const playerIds = ['p1', 'p2'];
    const fullLog = makeFullLog('RM0003', 'p1', playerIds);
    const players = playerIds.map((id) => makePlayer(id, id === 'p1' ? Role.MAFIA : Role.CITIZEN));
    const pubLog = buildPublicLog(fullLog, players);

    persistGameLogs(pubLog, fullLog, tmpDir);

    const files = fs.readdirSync(tmpDir);
    const pubFile = files.find((f) => f.includes('RM0003') && f.includes('public'))!;
    const content = JSON.parse(fs.readFileSync(path.join(tmpDir, pubFile), 'utf8')) as GameLog;
    expect(content.hostId).toBeUndefined();
  });
});
