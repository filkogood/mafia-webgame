import { Phase, Player } from '@mafia/shared';

export function getNextPhase(
  currentPhase: Phase,
  vote1Result?: { candidate: string | null }
): Phase {
  switch (currentPhase) {
    case Phase.LOBBY:
      return Phase.NIGHT;
    case Phase.NIGHT:
      return Phase.DAY;
    case Phase.DAY:
      return Phase.VOTE1;
    case Phase.VOTE1:
      // If there is a candidate, go to VOTE2; otherwise back to NIGHT
      if (vote1Result?.candidate) return Phase.VOTE2;
      return Phase.NIGHT;
    case Phase.VOTE2:
      return Phase.NIGHT;
    case Phase.ENDED:
      return Phase.ENDED;
  }
}

/** Returns true if >50% of alive players have voted to quick-finish */
export function shouldAutoAdvance(
  quickFinishVotes: string[],
  alivePlayers: Player[]
): boolean {
  if (alivePlayers.length === 0) return false;
  return quickFinishVotes.length > alivePlayers.length / 2;
}
