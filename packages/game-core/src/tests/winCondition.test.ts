import { describe, it, expect } from 'vitest';
import { checkWinCondition } from '../winCondition';
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
    isHypnotized: false,
    hypnotizedExpiresAtVote2: null,
    hasInheritedMafia: false,
    knownMafiaTeam: null,
    ghostVotesUsedVote1: false,
    ghostVotesUsedVote2: false,
    ...extra,
  };
}

describe('checkWinCondition', () => {
  it('citizens win when all mafia bodies are dead', () => {
    const players = [
      makePlayer('m1', Role.MAFIA, false),
      makePlayer('c1', Role.CITIZEN, true),
      makePlayer('c2', Role.CITIZEN, true),
      makePlayer('p1', Role.POLICE, true),
    ];
    const result = checkWinCondition(players);
    expect(result.winner).toBe('citizen');
  });

  it('mafia wins when mafia body count >= non-mafia-body count', () => {
    const players = [
      makePlayer('m1', Role.MAFIA, true),
      makePlayer('c1', Role.CITIZEN, true),
      makePlayer('c2', Role.CITIZEN, false),
    ];
    const result = checkWinCondition(players);
    expect(result.winner).toBe('mafia');
  });

  it('returns null when game is ongoing', () => {
    const players = [
      makePlayer('m1', Role.MAFIA, true),
      makePlayer('c1', Role.CITIZEN, true),
      makePlayer('c2', Role.CITIZEN, true),
    ];
    const result = checkWinCondition(players);
    expect(result.winner).toBeNull();
  });

  it('collaborators alive do not prevent citizen win', () => {
    const players = [
      makePlayer('m1', Role.MAFIA, false),
      makePlayer('h1', Role.HACKER, true),
      makePlayer('c1', Role.CITIZEN, true),
      makePlayer('c2', Role.CITIZEN, true),
    ];
    const result = checkWinCondition(players);
    expect(result.winner).toBe('citizen');
  });

  it('rookieMafia that inherited counts as mafia body', () => {
    const players = [
      makePlayer('m1', Role.MAFIA, false),
      makePlayer('rm1', Role.ROOKIE_MAFIA, true, { hasInheritedMafia: true }),
      makePlayer('c1', Role.CITIZEN, true),
      makePlayer('c2', Role.CITIZEN, false),
    ];
    // rm1 inherited, 1 alive mafia body vs 1 alive citizen → mafia wins
    const result = checkWinCondition(players);
    expect(result.winner).toBe('mafia');
  });

  it('rookieMafia without inheritance does not count as mafia body', () => {
    const players = [
      makePlayer('m1', Role.MAFIA, false),
      makePlayer('rm1', Role.ROOKIE_MAFIA, true, { hasInheritedMafia: false }),
      makePlayer('c1', Role.CITIZEN, true),
    ];
    // No alive mafia bodies → citizen wins
    const result = checkWinCondition(players);
    expect(result.winner).toBe('citizen');
  });
});
