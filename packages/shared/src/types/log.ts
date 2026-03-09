export type LogEventType =
  | 'phase_transition'
  | 'night_action'
  | 'death'
  | 'vote_cast'
  | 'vote_result'
  | 'role_change'
  | 'status_applied'
  | 'status_cleared'
  | 'contact_success'
  | 'game_ended';

export interface BaseLogEvent {
  type: LogEventType;
  round: number;
  phase: string;
  ts: string;
}

export interface PhaseTransitionEvent extends BaseLogEvent {
  type: 'phase_transition';
  fromPhase: string;
  toPhase: string;
}

export interface NightActionEvent extends BaseLogEvent {
  type: 'night_action';
  actorId: string;
  actorNickname: string;
  actorRole: string;
  targetId: string | null;
  targetNickname: string | null;
}

export interface DeathEvent extends BaseLogEvent {
  type: 'death';
  playerId: string;
  nickname: string;
  role: string;
  cause: 'mafia_kill' | 'execution' | 'collateral';
}

export interface VoteCastEvent extends BaseLogEvent {
  type: 'vote_cast';
  voterId: string;
  voterNickname: string;
  votePhase: 'vote1' | 'vote2';
  /** vote1: target player id */
  targetId?: string;
  /** vote1: target player nickname */
  targetNickname?: string;
  /** vote1: vote weight */
  weight: number;
  /** vote2: yes or no */
  choice?: 'yes' | 'no';
}

export interface VoteResultEvent extends BaseLogEvent {
  type: 'vote_result';
  votePhase: 'vote1' | 'vote2';
  candidateId: string | null;
  candidateNickname: string | null;
  tally: Record<string, number> | { yes: number; no: number };
  executed: boolean;
}

export interface RoleChangeEvent extends BaseLogEvent {
  type: 'role_change';
  playerId: string;
  nickname: string;
  fromRole: string;
  toRole: string;
  reason: string;
}

export interface StatusEvent extends BaseLogEvent {
  type: 'status_applied' | 'status_cleared';
  playerId: string;
  nickname: string;
  status: 'drunk' | 'vote_blocked' | 'hypnotized';
  actorId?: string;
  actorNickname?: string;
}

export interface ContactSuccessEvent extends BaseLogEvent {
  type: 'contact_success';
  collaboratorId: string;
  collaboratorNickname: string;
  collaboratorRole: string;
}

export interface GameEndedEvent extends BaseLogEvent {
  type: 'game_ended';
  winner: 'mafia' | 'citizen';
  reason: string;
  finalRoles: Array<{
    playerId: string;
    nickname: string;
    role: string;
    isAlive: boolean;
  }>;
}

export type LogEvent =
  | PhaseTransitionEvent
  | NightActionEvent
  | DeathEvent
  | VoteCastEvent
  | VoteResultEvent
  | RoleChangeEvent
  | StatusEvent
  | ContactSuccessEvent
  | GameEndedEvent;

export interface GameLog {
  schemaVersion: number;
  roomId: string;
  /** Only present in full audit log */
  hostId?: string;
  startedAt: string;
  endedAt: string;
  events: LogEvent[];
}
