import { GameSettings } from '../types/game';
import { Role } from '../types/roles';
import { Phase } from '../types/phase';

/** join_room payload */
export interface JoinRoomPayload {
  roomId: string;
  nickname: string;
}

/** create_room payload */
export interface CreateRoomPayload {
  nickname: string;
  /** Admin session token – required to create a room */
  adminToken?: string;
}

/** update_settings payload */
export interface UpdateSettingsPayload {
  settings: Partial<GameSettings>;
}

/** night_preview payload */
export interface NightPreviewPayload {
  targetId: string | null;
}

/** night_confirm payload */
export interface NightConfirmPayload {
  targetId: string | null;
}

/** vote1_cast payload */
export interface Vote1CastPayload {
  targetId: string;
}

/** vote2_cast payload */
export interface Vote2CastPayload {
  choice: 'yes' | 'no';
}

/** ghost_vote1_cast payload */
export interface GhostVote1CastPayload {
  targetId: string;
}

/** ghost_vote2_cast payload */
export interface GhostVote2CastPayload {
  choice: 'yes' | 'no';
}

/** dev:setScenario player patch entry */
export interface DevScenarioPlayer {
  id: string;
  role?: Role;
  isAlive?: boolean;
  isDrunk?: boolean;
  isHypnotized?: boolean;
  isVoteBlocked?: boolean;
  hasInheritedMafia?: boolean;
  knownMafiaTeam?: Array<{ id: string; nickname: string; role: Role }> | null;
}

/** dev:setScenario scenario definition */
export interface DevScenario {
  phase?: Phase;
  round?: number;
  players?: DevScenarioPlayer[];
  vote1Candidate?: string | null;
  nightActions?: Record<string, { targetId: string | null }>;
}

/** dev:setScenario payload — only honoured in dev mode */
export interface DevSetScenarioPayload {
  roomId: string;
  secret: string;
  scenario: DevScenario;
}

export interface ClientToServerEvents {
  join_room: (payload: JoinRoomPayload) => void;
  create_room: (payload: CreateRoomPayload) => void;
  update_settings: (payload: UpdateSettingsPayload) => void;
  start_game: () => void;
  night_preview: (payload: NightPreviewPayload) => void;
  night_confirm: (payload: NightConfirmPayload) => void;
  vote1_cast: (payload: Vote1CastPayload) => void;
  vote2_cast: (payload: Vote2CastPayload) => void;
  quick_finish: () => void;
  ghost_vote1_cast: (payload: GhostVote1CastPayload) => void;
  ghost_vote2_cast: (payload: GhostVote2CastPayload) => void;
  'dev:setScenario': (payload: DevSetScenarioPayload) => void;
}
