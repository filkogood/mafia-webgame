import { Player, Phase, Role } from '@mafia/shared';

export interface Vote1Entry {
  voterId: string;
  targetId: string;
  weight: number;
}

export interface Vote2Entry {
  voterId: string;
  choice: 'yes' | 'no';
  weight: number;
}

/** Returns 2 if politician and not drunk, 1 otherwise */
export function getVoterWeight(player: Player): number {
  if (player.role === Role.POLITICIAN && !player.isDrunk) {
    return 2;
  }
  return 1;
}

/**
 * Returns false if player cannot vote this phase.
 * - Dead players cannot vote unless ghostVoteMode is enabled
 * - Vote-blocked players cannot vote (ghost votes bypass this)
 */
export function canVote(
  player: Player,
  phase: 'vote1' | 'vote2',
  ghostVoteMode: boolean,
  round: number
): boolean {
  if (!player.isAlive) {
    if (!ghostVoteMode) return false;
    // Check if ghost vote already used
    if (phase === 'vote1' && player.ghostVotesUsedVote1) return false;
    if (phase === 'vote2' && player.ghostVotesUsedVote2) return false;
    // Ghost votes bypass vote-block
    return true;
  }

  // Alive player: check vote-block
  if (
    player.isVoteBlocked &&
    player.voteBlockExpiresAfterVote2 !== null &&
    player.voteBlockExpiresAfterVote2 >= round
  ) {
    return false;
  }

  return true;
}

export function tallyVote1(votes: Vote1Entry[]): {
  candidate: string | null;
  isTie: boolean;
  tally: Record<string, number>;
} {
  const tally: Record<string, number> = {};

  for (const vote of votes) {
    tally[vote.targetId] = (tally[vote.targetId] ?? 0) + vote.weight;
  }

  if (Object.keys(tally).length === 0) {
    return { candidate: null, isTie: false, tally };
  }

  const maxVotes = Math.max(...Object.values(tally));
  const topCandidates = Object.entries(tally).filter(
    ([, v]) => v === maxVotes
  );

  if (topCandidates.length > 1) {
    return { candidate: null, isTie: true, tally };
  }

  return { candidate: topCandidates[0][0], isTie: false, tally };
}

export function resolveVote2(
  votes: Vote2Entry[],
  eligibleCount: number
): { executed: boolean } {
  const yesVotes = votes
    .filter((v) => v.choice === 'yes')
    .reduce((sum, v) => sum + v.weight, 0);

  return { executed: yesVotes > eligibleCount / 2 };
}
