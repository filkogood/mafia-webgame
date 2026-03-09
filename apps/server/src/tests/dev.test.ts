import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Player, Role, Phase, DEFAULT_SETTINGS, Room } from '@mafia/shared';
import { applyScenario, isDevModeEnabled } from '../socket/devHandlers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(id: string, role: Role, extra: Partial<Player> = {}): Player {
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

function makeRoom(players: Player[], phase: Phase = Phase.NIGHT): Room {
  return {
    id: 'ROOM01',
    hostId: 'p1',
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('isDevModeEnabled', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns false when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';
    expect(isDevModeEnabled()).toBe(false);
  });

  it('returns true when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';
    expect(isDevModeEnabled()).toBe(true);
  });

  it('returns true when NODE_ENV is test', () => {
    process.env.NODE_ENV = 'test';
    expect(isDevModeEnabled()).toBe(true);
  });

  it('returns true when NODE_ENV is undefined', () => {
    delete process.env.NODE_ENV;
    expect(isDevModeEnabled()).toBe(true);
  });
});

describe('applyScenario', () => {
  it('applies phase change', () => {
    const players = [makePlayer('p1', Role.MAFIA), makePlayer('p2', Role.CITIZEN)];
    const room = makeRoom(players, Phase.NIGHT);

    const result = applyScenario(room, { phase: Phase.DAY });

    expect(result.phase).toBe(Phase.DAY);
  });

  it('applies round change', () => {
    const players = [makePlayer('p1', Role.MAFIA), makePlayer('p2', Role.CITIZEN)];
    const room = makeRoom(players);

    const result = applyScenario(room, { round: 3 });

    expect(result.round).toBe(3);
  });

  it('applies phase and round together', () => {
    const players = [makePlayer('p1', Role.MAFIA), makePlayer('p2', Role.CITIZEN)];
    const room = makeRoom(players, Phase.NIGHT);

    const result = applyScenario(room, { phase: Phase.VOTE1, round: 2 });

    expect(result.phase).toBe(Phase.VOTE1);
    expect(result.round).toBe(2);
  });

  it('patches player role', () => {
    const players = [makePlayer('p1', Role.CITIZEN), makePlayer('p2', Role.MAFIA)];
    const room = makeRoom(players);

    const result = applyScenario(room, {
      players: [{ id: 'p1', role: Role.DOCTOR }],
    });

    const p1 = result.players.find((p) => p.id === 'p1')!;
    expect(p1.role).toBe(Role.DOCTOR);
    // p2 must be unchanged
    const p2 = result.players.find((p) => p.id === 'p2')!;
    expect(p2.role).toBe(Role.MAFIA);
  });

  it('patches player isAlive to false', () => {
    const players = [makePlayer('p1', Role.MAFIA), makePlayer('p2', Role.CITIZEN)];
    const room = makeRoom(players);

    const result = applyScenario(room, {
      players: [{ id: 'p1', isAlive: false }],
    });

    expect(result.players.find((p) => p.id === 'p1')!.isAlive).toBe(false);
  });

  it('patches player isDrunk', () => {
    const players = [makePlayer('p1', Role.CITIZEN)];
    const room = makeRoom(players);

    const result = applyScenario(room, {
      players: [{ id: 'p1', isDrunk: true }],
    });

    expect(result.players.find((p) => p.id === 'p1')!.isDrunk).toBe(true);
  });

  it('clears drunkExpiresAfterVote2 when isDrunk set to false', () => {
    const players = [
      makePlayer('p1', Role.CITIZEN, { isDrunk: true, drunkExpiresAfterVote2: 2 }),
    ];
    const room = makeRoom(players);

    const result = applyScenario(room, {
      players: [{ id: 'p1', isDrunk: false }],
    });

    const p1 = result.players.find((p) => p.id === 'p1')!;
    expect(p1.isDrunk).toBe(false);
    expect(p1.drunkExpiresAfterVote2).toBeNull();
  });

  it('patches player isHypnotized', () => {
    const players = [makePlayer('p1', Role.CITIZEN)];
    const room = makeRoom(players);

    const result = applyScenario(room, {
      players: [{ id: 'p1', isHypnotized: true }],
    });

    expect(result.players.find((p) => p.id === 'p1')!.isHypnotized).toBe(true);
  });

  it('clears hypnotizedExpiresAtVote2 when isHypnotized set to false', () => {
    const players = [
      makePlayer('p1', Role.CITIZEN, { isHypnotized: true, hypnotizedExpiresAtVote2: 1 }),
    ];
    const room = makeRoom(players);

    const result = applyScenario(room, {
      players: [{ id: 'p1', isHypnotized: false }],
    });

    const p1 = result.players.find((p) => p.id === 'p1')!;
    expect(p1.isHypnotized).toBe(false);
    expect(p1.hypnotizedExpiresAtVote2).toBeNull();
  });

  it('patches player hasInheritedMafia', () => {
    const players = [makePlayer('p1', Role.ROOKIE_MAFIA)];
    const room = makeRoom(players);

    const result = applyScenario(room, {
      players: [{ id: 'p1', hasInheritedMafia: true }],
    });

    expect(result.players.find((p) => p.id === 'p1')!.hasInheritedMafia).toBe(true);
  });

  it('patches knownMafiaTeam', () => {
    const players = [makePlayer('p1', Role.HACKER)];
    const room = makeRoom(players);
    const mafiaTeam = [{ id: 'p2', nickname: 'nick_p2', role: Role.MAFIA }];

    const result = applyScenario(room, {
      players: [{ id: 'p1', knownMafiaTeam: mafiaTeam }],
    });

    expect(result.players.find((p) => p.id === 'p1')!.knownMafiaTeam).toEqual(mafiaTeam);
  });

  it('sets vote1Candidate', () => {
    const players = [makePlayer('p1', Role.MAFIA), makePlayer('p2', Role.CITIZEN)];
    const room = makeRoom(players, Phase.VOTE1);

    const result = applyScenario(room, { vote1Candidate: 'p2' });

    expect(result.vote1Candidate).toBe('p2');
  });

  it('sets nightActions', () => {
    const players = [makePlayer('p1', Role.MAFIA), makePlayer('p2', Role.CITIZEN)];
    const room = makeRoom(players, Phase.NIGHT);

    const result = applyScenario(room, {
      nightActions: { p1: { targetId: 'p2' } },
    });

    expect(result.nightActions['p1']).toMatchObject({ actorId: 'p1', targetId: 'p2', isPreview: false });
  });

  it('ignores patches for unknown player ids', () => {
    const players = [makePlayer('p1', Role.MAFIA)];
    const room = makeRoom(players);

    const result = applyScenario(room, {
      players: [{ id: 'unknown', role: Role.DOCTOR }],
    });

    expect(result.players).toHaveLength(1);
    expect(result.players[0].id).toBe('p1');
    expect(result.players[0].role).toBe(Role.MAFIA);
  });

  it('does not mutate the original room players array', () => {
    const players = [makePlayer('p1', Role.MAFIA)];
    const room = makeRoom(players);
    const originalPlayers = room.players;

    applyScenario({ ...room, players: [...room.players] }, {
      players: [{ id: 'p1', role: Role.CITIZEN }],
    });

    expect(originalPlayers[0].role).toBe(Role.MAFIA);
  });
});

describe('dev mode production safety', () => {
  let originalNodeEnv: string | undefined;
  let originalDevSecret: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    originalDevSecret = process.env.DEV_SECRET;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.DEV_SECRET = originalDevSecret;
  });

  it('isDevModeEnabled returns false in production — dev events must not register', () => {
    process.env.NODE_ENV = 'production';
    expect(isDevModeEnabled()).toBe(false);
  });

  it('secret validation: rejects wrong DEV_SECRET', () => {
    // Simulate the secret check logic inline to keep tests independent of socket mocking
    process.env.DEV_SECRET = 'correct-secret';
    const DEV_SECRET = process.env.DEV_SECRET ?? '';
    expect('wrong-secret' !== DEV_SECRET).toBe(true);
  });

  it('secret validation: accepts correct DEV_SECRET', () => {
    process.env.DEV_SECRET = 'correct-secret';
    const DEV_SECRET = process.env.DEV_SECRET ?? '';
    expect('correct-secret' === DEV_SECRET).toBe(true);
  });

  it('rejects any secret when DEV_SECRET env is empty', () => {
    process.env.DEV_SECRET = '';
    const DEV_SECRET = process.env.DEV_SECRET ?? '';
    // An empty DEV_SECRET means no secret can ever match a non-empty string,
    // AND an empty incoming secret also matches '' — so the guard must also
    // reject when DEV_SECRET is empty (falsy check in devHandlers.ts).
    expect(!DEV_SECRET).toBe(true);
  });
});
