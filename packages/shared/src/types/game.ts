import { Role } from './roles';
import { Phase } from './phase';

export interface Player {
  id: string;
  nickname: string;
  role: Role;
  isAlive: boolean;
  /** True if this player is in a couple set */
  isCouple: boolean;
  /** The partner's player ID if in a couple */
  couplePairId: string | null;
  /** True if drugged by Madam */
  isDrunk: boolean;
  /** Drunk effect expires after this Vote2 round ends (round number) */
  drunkExpiresAfterVote2: number | null;
  /** True if vote-blocked by Burglar */
  isVoteBlocked: boolean;
  /** Vote-block expires after this Vote2 round ends (round number) */
  voteBlockExpiresAfterVote2: number | null;
  /** True if RookieMafia has inherited mafia body role */
  hasInheritedMafia: boolean;
  /** Collaborator's known mafia team after contact triggered */
  knownMafiaTeam: Array<{ id: string; nickname: string; role: Role }> | null;
  /** Whether ghost vote for Vote1 has been used */
  ghostVotesUsedVote1: boolean;
  /** Whether ghost vote for Vote2 has been used */
  ghostVotesUsedVote2: boolean;
}

export interface GameSettings {
  /** Dead players can vote */
  ghostVoteMode: boolean;
  /** Mafia can kill own team */
  teamKillMode: boolean;
  /** Multiple kill targets per night */
  multiKillMode: boolean;
  /** Broadcast deaths with Korean role name */
  announcementMode: boolean;
  nightTimerSec: number;
  dayTimerSec: number;
  vote1TimerSec: number;
  vote2TimerSec: number;
  allowQuickFinish: boolean;
}

export interface NightAction {
  actorId: string;
  targetId: string | null;
  /** True if this is a preview (not yet confirmed) */
  isPreview: boolean;
}

export interface Room {
  id: string;
  hostId: string;
  players: Player[];
  phase: Phase;
  round: number;
  settings: GameSettings;
  /** Candidate going to Vote2 */
  vote1Candidate: string | null;
  /** Vote1 tally: playerId → vote count */
  vote1Tally: Record<string, number>;
  /** Vote2 tally */
  vote2Tally: { yes: number; no: number };
  /** Night actions: actorId → NightAction */
  nightActions: Record<string, NightAction>;
  /** Player IDs who clicked quick-finish */
  quickFinishVotes: string[];
}

export const DEFAULT_SETTINGS: GameSettings = {
  ghostVoteMode: false,
  teamKillMode: false,
  multiKillMode: false,
  announcementMode: true,
  nightTimerSec: 30,
  dayTimerSec: 60,
  vote1TimerSec: 30,
  vote2TimerSec: 20,
  allowQuickFinish: true,
};
