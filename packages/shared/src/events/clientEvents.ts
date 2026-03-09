import { GameSettings } from '../types/game';

/** join_room payload */
export interface JoinRoomPayload {
  roomId: string;
  nickname: string;
}

/** create_room payload */
export interface CreateRoomPayload {
  nickname: string;
}

/** update_settings payload */
export interface UpdateSettingsPayload {
  settings: Partial<GameSettings>;
}

/** night_preview payload */
export interface NightPreviewPayload {
  targetId: string;
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
}
