import { describe, it, expect } from 'vitest';
import { processNightActions } from '../nightActions';
import { Player, Role, DEFAULT_SETTINGS, GameSettings } from '@mafia/shared';

function makePlayer(
  id: string,
  role: Role,
  extra: Partial<Player> = {}
): Player {
  return {
    id,
    nickname: id,
    role,
    isAlive: true,
    isCouple: false,
    couplePairId: null,
    isDrunk: false,
    drunkExpiresAfterVote2: null,
    isVoteBlocked: false,
    voteBlockExpiresAfterVote2: null,
    hasInheritedMafia: false,
    knownMafiaTeam: null,
    ghostVotesUsedVote1: false,
    ghostVotesUsedVote2: false,
    ...extra,
  };
}

const settings: GameSettings = { ...DEFAULT_SETTINGS };

describe('processNightActions', () => {
  it('mafia kills target', () => {
    const players = [
      makePlayer('m1', Role.MAFIA),
      makePlayer('c1', Role.CITIZEN),
      makePlayer('c2', Role.CITIZEN),
    ];
    const actions = { m1: 'c1' };
    const result = processNightActions(players, actions, settings, 1);
    expect(result.deaths).toContain('c1');
    expect(result.updatedPlayers.find((p) => p.id === 'c1')?.isAlive).toBe(
      false
    );
  });

  it('doctor saves mafia target', () => {
    const players = [
      makePlayer('m1', Role.MAFIA),
      makePlayer('c1', Role.CITIZEN),
      makePlayer('d1', Role.DOCTOR),
    ];
    const actions = { m1: 'c1', d1: 'c1' };
    const result = processNightActions(players, actions, settings, 1);
    expect(result.deaths).not.toContain('c1');
    expect(result.healedPlayers).toContain('c1');
  });

  it('couple: partner dies instead when one is attacked', () => {
    const players = [
      makePlayer('m1', Role.MAFIA),
      makePlayer('cp1', Role.COUPLE, {
        isCouple: true,
        couplePairId: 'cp2',
      }),
      makePlayer('cp2', Role.COUPLE, {
        isCouple: true,
        couplePairId: 'cp1',
      }),
    ];
    const actions = { m1: 'cp1' };
    const result = processNightActions(players, actions, settings, 1);
    // cp1 attacked → cp2 dies instead
    expect(result.deaths).toContain('cp2');
    expect(result.deaths).not.toContain('cp1');
  });

  it('burglar applies vote-block to target', () => {
    const players = [
      makePlayer('b1', Role.BURGLAR),
      makePlayer('c1', Role.CITIZEN),
    ];
    const actions = { b1: 'c1' };
    const result = processNightActions(players, actions, settings, 1);
    const c1 = result.updatedPlayers.find((p) => p.id === 'c1')!;
    expect(c1.isVoteBlocked).toBe(true);
    expect(c1.voteBlockExpiresAfterVote2).toBe(1);
  });

  it('madam makes target drunk', () => {
    const players = [
      makePlayer('md1', Role.MADAM),
      makePlayer('c1', Role.CITIZEN),
    ];
    const actions = { md1: 'c1' };
    const result = processNightActions(players, actions, settings, 1);
    const c1 = result.updatedPlayers.find((p) => p.id === 'c1')!;
    expect(c1.isDrunk).toBe(true);
  });

  it('madam breaks couple status', () => {
    const players = [
      makePlayer('md1', Role.MADAM),
      makePlayer('cp1', Role.COUPLE, {
        isCouple: true,
        couplePairId: 'cp2',
      }),
      makePlayer('cp2', Role.COUPLE, {
        isCouple: true,
        couplePairId: 'cp1',
      }),
    ];
    const actions = { md1: 'cp1' };
    const result = processNightActions(players, actions, settings, 1);
    const cp1 = result.updatedPlayers.find((p) => p.id === 'cp1')!;
    const cp2 = result.updatedPlayers.find((p) => p.id === 'cp2')!;
    expect(cp1.isCouple).toBe(false);
    expect(cp2.isCouple).toBe(false);
  });

  it('rookieMafia inherits when all mafia bodies die', () => {
    const players = [
      makePlayer('m1', Role.MAFIA),
      makePlayer('rm1', Role.ROOKIE_MAFIA),
      makePlayer('c1', Role.CITIZEN),
      makePlayer('c2', Role.CITIZEN),
    ];
    // m1 kills c1, but m1 is dead (simulated by marking alive=false before)
    players[0].isAlive = false;
    const actions = { rm1: null };
    const result = processNightActions(players, actions, settings, 1);
    const rm1 = result.updatedPlayers.find((p) => p.id === 'rm1')!;
    expect(rm1.hasInheritedMafia).toBe(true);
  });

  it('multiKillMode kills up to 2 targets', () => {
    const multiSettings: GameSettings = { ...settings, multiKillMode: true };
    const players = [
      makePlayer('m1', Role.MAFIA),
      makePlayer('m2', Role.MAFIA),
      makePlayer('c1', Role.CITIZEN),
      makePlayer('c2', Role.CITIZEN),
      makePlayer('c3', Role.CITIZEN),
    ];
    const actions = { m1: 'c1', m2: 'c2' };
    const result = processNightActions(players, actions, multiSettings, 1);
    expect(result.deaths.length).toBeLessThanOrEqual(2);
  });

  it('teamKillMode OFF: mafia cannot target own team', () => {
    const players = [
      makePlayer('m1', Role.MAFIA),
      makePlayer('m2', Role.MAFIA),
      makePlayer('c1', Role.CITIZEN),
    ];
    const actions = { m1: 'm2' }; // targeting own team
    const result = processNightActions(players, actions, settings, 1);
    expect(result.deaths).not.toContain('m2');
  });
});
