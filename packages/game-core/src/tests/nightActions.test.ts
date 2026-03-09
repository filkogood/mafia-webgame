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

/** Creates a stateful RNG that returns values in sequence (cycling). */
function seqRng(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
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

  it('madam targeting couple converts both partners to citizens', () => {
    const players = [
      makePlayer('md1', Role.MADAM),
      makePlayer('cp1', Role.COUPLE, {
        isCouple: true,
        couplePairId: 'cp2',
        isDrunk: false,
      }),
      makePlayer('cp2', Role.COUPLE, {
        isCouple: true,
        couplePairId: 'cp1',
        isDrunk: true,
        drunkExpiresAfterVote2: 1,
      }),
    ];
    const actions = { md1: 'cp1' };
    const result = processNightActions(players, actions, settings, 1);
    const cp1 = result.updatedPlayers.find((p) => p.id === 'cp1')!;
    const cp2 = result.updatedPlayers.find((p) => p.id === 'cp2')!;
    expect(cp1.role).toBe(Role.CITIZEN);
    expect(cp2.role).toBe(Role.CITIZEN);
    expect(cp1.isCouple).toBe(false);
    expect(cp2.isCouple).toBe(false);
    expect(cp1.couplePairId).toBeNull();
    expect(cp2.couplePairId).toBeNull();
    expect(cp1.isDrunk).toBe(false);
    expect(cp2.isDrunk).toBe(false);
    expect(cp2.drunkExpiresAfterVote2).toBeNull();
  });

  it('doctor self-heal allowed in round 1 when toggle is off', () => {
    const players = [
      makePlayer('m1', Role.MAFIA),
      makePlayer('d1', Role.DOCTOR),
    ];
    const actions = { m1: 'd1', d1: 'd1' };
    const result = processNightActions(players, actions, settings, 1);
    // self-heal on round 1 is allowed even when toggle is off
    expect(result.deaths).not.toContain('d1');
    expect(result.healedPlayers).toContain('d1');
  });

  it('doctor self-heal disallowed in round >1 when toggle is off', () => {
    const offSettings: GameSettings = { ...settings, doctorSelfHealEnabled: false };
    const players = [
      makePlayer('m1', Role.MAFIA),
      makePlayer('d1', Role.DOCTOR),
    ];
    const actions = { m1: 'd1', d1: 'd1' };
    const result = processNightActions(players, actions, offSettings, 2);
    // self-heal on round 2+ is blocked when toggle is off
    expect(result.deaths).toContain('d1');
    expect(result.healedPlayers).not.toContain('d1');
  });

  it('doctor self-heal allowed in any round when toggle is on', () => {
    const onSettings: GameSettings = { ...settings, doctorSelfHealEnabled: true };
    const players = [
      makePlayer('m1', Role.MAFIA),
      makePlayer('d1', Role.DOCTOR),
    ];
    const actions = { m1: 'd1', d1: 'd1' };
    const result = processNightActions(players, actions, onSettings, 3);
    // self-heal always allowed when toggle is on
    expect(result.deaths).not.toContain('d1');
    expect(result.healedPlayers).toContain('d1');
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

  // ── Possessor inheritance tests ────────────────────────────────────────────

  it('possessor inherits role from dead player on round 1', () => {
    const players = [
      makePlayer('m1', Role.MAFIA),
      makePlayer('c1', Role.CITIZEN),
      makePlayer('pos', Role.POSSESSOR),
    ];
    const actions = { m1: 'c1' };
    const result = processNightActions(players, actions, settings, 1);
    const pos = result.updatedPlayers.find((p) => p.id === 'pos')!;
    expect(result.deaths).toContain('c1');
    expect(pos.role).toBe(Role.CITIZEN);
  });

  it('possessor does not inherit if no deaths on round 1', () => {
    const players = [
      makePlayer('m1', Role.MAFIA),
      makePlayer('d1', Role.DOCTOR),
      makePlayer('c1', Role.CITIZEN),
      makePlayer('pos', Role.POSSESSOR),
    ];
    // Doctor saves the mafia target
    const actions = { m1: 'c1', d1: 'c1' };
    const result = processNightActions(players, actions, settings, 1);
    const pos = result.updatedPlayers.find((p) => p.id === 'pos')!;
    expect(result.deaths).toHaveLength(0);
    expect(pos.role).toBe(Role.POSSESSOR);
  });

  it('possessor does not inherit on round > 1', () => {
    const players = [
      makePlayer('m1', Role.MAFIA),
      makePlayer('c1', Role.CITIZEN),
      makePlayer('pos', Role.POSSESSOR),
    ];
    const actions = { m1: 'c1' };
    const result = processNightActions(players, actions, settings, 2);
    const pos = result.updatedPlayers.find((p) => p.id === 'pos')!;
    expect(result.deaths).toContain('c1');
    expect(pos.role).toBe(Role.POSSESSOR);
  });

  it('possessor does not inherit if possessor is dead', () => {
    const players = [
      makePlayer('m1', Role.MAFIA),
      makePlayer('c1', Role.CITIZEN),
      makePlayer('pos', Role.POSSESSOR, { isAlive: false }),
    ];
    const actions = { m1: 'c1' };
    const result = processNightActions(players, actions, settings, 1);
    const pos = result.updatedPlayers.find((p) => p.id === 'pos')!;
    expect(result.deaths).toContain('c1');
    expect(pos.role).toBe(Role.POSSESSOR);
  });

  it('possessor selects among multiple deaths using deterministic RNG', () => {
    // multiKillMode: m1→c1 and m2→pol both die.
    // Fisher-Yates with seqRng(shuffleVal, possessorVal):
    //   candidates (insertion order) = ['c1', 'pol']
    //   i=1: j=floor(shuffleVal * 2)
    //     shuffleVal=0 → j=0 → swap arr[0]&arr[1] → killTargets=['pol','c1'] → deaths=['pol','c1']
    //   possessor idx = floor(possessorVal * 2)
    //     possessorVal=0   → idx=0 → deaths[0]='pol' → POLICE
    //     possessorVal=0.9 → idx=1 → deaths[1]='c1' → CITIZEN
    const make = () => [
      makePlayer('m1', Role.MAFIA),
      makePlayer('m2', Role.MAFIA),
      makePlayer('c1', Role.CITIZEN),
      makePlayer('pol', Role.POLICE),
      makePlayer('pos', Role.POSSESSOR),
    ];
    const ms: GameSettings = { ...settings, multiKillMode: true };
    const actions = { m1: 'c1', m2: 'pol' };

    const r0 = processNightActions(make(), actions, ms, 1, seqRng(0, 0));
    const r1 = processNightActions(make(), actions, ms, 1, seqRng(0, 0.9));

    const pos0 = r0.updatedPlayers.find((p) => p.id === 'pos')!;
    const pos1 = r1.updatedPlayers.find((p) => p.id === 'pos')!;

    expect(r0.deaths).toHaveLength(2);
    expect(pos0.role).toBe(Role.POLICE);   // deaths[0] = pol
    expect(pos1.role).toBe(Role.CITIZEN);  // deaths[1] = c1
  });

  it('possessor inherits CITIZEN if target was citizenized by Madam before death', () => {
    // Madam breaks couple (both become CITIZEN), then mafia kills cp1
    // Possessor should inherit CITIZEN (the role after Madam's effect)
    const players = [
      makePlayer('m1', Role.MAFIA),
      makePlayer('md1', Role.MADAM),
      makePlayer('cp1', Role.COUPLE, { isCouple: true, couplePairId: 'cp2' }),
      makePlayer('cp2', Role.COUPLE, { isCouple: true, couplePairId: 'cp1' }),
      makePlayer('pos', Role.POSSESSOR),
    ];
    // Madam breaks cp1's couple (citizenizes both), mafia kills cp1
    const actions = { md1: 'cp1', m1: 'cp1' };
    const result = processNightActions(players, actions, settings, 1);
    const pos = result.updatedPlayers.find((p) => p.id === 'pos')!;
    // cp1 was citizenized before being killed, possessor must inherit CITIZEN
    expect(result.deaths).toContain('cp1');
    expect(pos.role).toBe(Role.CITIZEN);
  });

  it('possessor clears knownMafiaTeam on inheritance', () => {
    const players = [
      makePlayer('m1', Role.MAFIA),
      makePlayer('c1', Role.CITIZEN),
      makePlayer('pos', Role.POSSESSOR, {
        knownMafiaTeam: [{ id: 'm1', nickname: 'm1', role: Role.MAFIA }],
      }),
    ];
    const actions = { m1: 'c1' };
    const result = processNightActions(players, actions, settings, 1);
    const pos = result.updatedPlayers.find((p) => p.id === 'pos')!;
    expect(pos.knownMafiaTeam).toBeNull();
  });
});
