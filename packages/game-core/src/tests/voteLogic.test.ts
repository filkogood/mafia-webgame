import { describe, it, expect } from 'vitest';
import { tallyVote1, resolveVote2, getVoterWeight, canVote } from '../voteLogic';
import { Player, Role } from '@mafia/shared';

function makePlayer(
  id: string,
  role: Role,
  isAlive: boolean,
  extra: Partial<Player> = {}
): Player {
  return {
    id,
    nickname: id,
    role,
    isAlive,
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

describe('tallyVote1', () => {
  it('returns single top candidate', () => {
    const votes = [
      { voterId: 'a', targetId: 'x', weight: 1 },
      { voterId: 'b', targetId: 'x', weight: 1 },
      { voterId: 'c', targetId: 'y', weight: 1 },
    ];
    const result = tallyVote1(votes);
    expect(result.candidate).toBe('x');
    expect(result.isTie).toBe(false);
  });

  it('returns tie when top vote counts are equal', () => {
    const votes = [
      { voterId: 'a', targetId: 'x', weight: 1 },
      { voterId: 'b', targetId: 'y', weight: 1 },
    ];
    const result = tallyVote1(votes);
    expect(result.candidate).toBeNull();
    expect(result.isTie).toBe(true);
  });

  it('returns null with no votes', () => {
    const result = tallyVote1([]);
    expect(result.candidate).toBeNull();
    expect(result.isTie).toBe(false);
  });

  it('politician weight 2 is applied', () => {
    const votes = [
      { voterId: 'pol', targetId: 'x', weight: 2 },
      { voterId: 'a', targetId: 'y', weight: 1 },
      { voterId: 'b', targetId: 'y', weight: 1 },
    ];
    const result = tallyVote1(votes);
    // x has 2, y has 2 → tie
    expect(result.isTie).toBe(true);
  });
});

describe('resolveVote2', () => {
  it('executed when yes votes > half of eligible', () => {
    const votes = [
      { voterId: 'a', choice: 'yes' as const, weight: 1 },
      { voterId: 'b', choice: 'yes' as const, weight: 1 },
      { voterId: 'c', choice: 'no' as const, weight: 1 },
    ];
    expect(resolveVote2(votes, 4).executed).toBe(false); // 2 > 2 → false
    expect(resolveVote2(votes, 3).executed).toBe(true);  // 2 > 1.5 → true
  });

  it('not executed on exact half', () => {
    const votes = [
      { voterId: 'a', choice: 'yes' as const, weight: 1 },
      { voterId: 'b', choice: 'no' as const, weight: 1 },
    ];
    // 1 > 1 = false
    expect(resolveVote2(votes, 2).executed).toBe(false);
  });
});

describe('getVoterWeight', () => {
  it('returns 2 for sober politician', () => {
    const p = makePlayer('p', Role.POLITICIAN, true);
    expect(getVoterWeight(p)).toBe(2);
  });

  it('returns 1 for drunk politician', () => {
    const p = makePlayer('p', Role.POLITICIAN, true, {
      isDrunk: true,
      drunkExpiresAfterVote2: 1,
    });
    expect(getVoterWeight(p)).toBe(1);
  });

  it('returns 1 for regular citizen', () => {
    const p = makePlayer('p', Role.CITIZEN, true);
    expect(getVoterWeight(p)).toBe(1);
  });
});

describe('canVote', () => {
  it('dead player cannot vote without ghost vote mode', () => {
    const p = makePlayer('p', Role.CITIZEN, false);
    expect(canVote(p, 'vote1', false, 1)).toBe(false);
  });

  it('dead player can vote with ghost vote mode if not used', () => {
    const p = makePlayer('p', Role.CITIZEN, false);
    expect(canVote(p, 'vote1', true, 1)).toBe(true);
  });

  it('dead player cannot vote if ghost vote already used', () => {
    const p = makePlayer('p', Role.CITIZEN, false, {
      ghostVotesUsedVote1: true,
    });
    expect(canVote(p, 'vote1', true, 1)).toBe(false);
  });

  it('vote-blocked alive player cannot vote', () => {
    const p = makePlayer('p', Role.CITIZEN, true, {
      isVoteBlocked: true,
      voteBlockExpiresAfterVote2: 1,
    });
    expect(canVote(p, 'vote1', false, 1)).toBe(false);
  });

  it('ghost vote bypasses vote-block for dead player', () => {
    const p = makePlayer('p', Role.CITIZEN, false, {
      isVoteBlocked: true,
      voteBlockExpiresAfterVote2: 1,
    });
    expect(canVote(p, 'vote1', true, 1)).toBe(true);
  });
});
