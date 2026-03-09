import { Role } from '../types/roles';
import { Phase } from '../types/phase';
import { Room } from '../types/game';

export interface MafiaTeamMember {
  id: string;
  nickname: string;
  role: Role;
}

export interface ServerToClientEvents {
  /** Full room state update */
  room_state: (room: Room) => void;

  /** Sent to each player individually at game start */
  game_started: (payload: {
    yourRole: Role;
    yourPlayerId: string;
    /** Only sent to mafia bodies and collaborators with contact */
    mafiaTeam?: MafiaTeamMember[];
    roomState: Room;
  }) => void;

  /** Real-time mafia preview targets (mafia only) */
  night_preview_update: (
    mafiaPreviewTargets: Record<string, string | null>
  ) => void;

  phase_changed: (payload: { phase: Phase; round: number }) => void;

  vote1_result: (payload: {
    candidate: string | null;
    isTie: boolean;
    tally: Record<string, number>;
  }) => void;

  vote2_result: (payload: {
    executed: boolean;
    candidateId: string;
    tally: { yes: number; no: number };
  }) => void;

  /** role only present if announcementMode is on */
  player_died: (payload: { playerId: string; role?: Role }) => void;

  announcement: (message: string) => void;

  /** Sent to collaborator when contact is triggered */
  contact_triggered: (mafiaTeam: MafiaTeamMember[]) => void;

  game_ended: (payload: {
    winner: 'mafia' | 'citizen';
    reason: string;
  }) => void;

  /** Sent to a player when their role changes mid-game (e.g. Possessor inheritance) */
  role_updated: (payload: {
    yourRole: Role;
    mafiaTeam?: MafiaTeamMember[];
  }) => void;

  error: (message: string) => void;

  /** Sent privately to Android when a Hacker visits them at night */
  hacker_visited: (payload: { hackerId: string; hackerNickname: string }) => void;

  /** Private toast notification sent to a single player (e.g. investigation results) */
  private_toast: (payload: { message: string }) => void;
}
