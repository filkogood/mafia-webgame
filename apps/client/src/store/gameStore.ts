import { create } from 'zustand';
import { Room, Role } from '@mafia/shared';

interface MafiaTeamMember {
  id: string;
  nickname: string;
  role: Role;
}

interface GameState {
  roomState: Room | null;
  myPlayerId: string | null;
  myRole: Role | null;
  mafiaTeam: MafiaTeamMember[] | null;
  announcements: string[];

  setRoomState: (room: Room) => void;
  setMyInfo: (playerId: string, role: Role, mafiaTeam?: MafiaTeamMember[]) => void;
  addAnnouncement: (msg: string) => void;
  clearAnnouncements: () => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  roomState: null,
  myPlayerId: null,
  myRole: null,
  mafiaTeam: null,
  announcements: [],

  setRoomState: (room) =>
    set((state) => {
      const myPlayerId = state.myPlayerId;
      if (myPlayerId) {
        const me = room.players.find((p) => p.id === myPlayerId);
        if (me) {
          return { roomState: room, myRole: me.role };
        }
      }
      return { roomState: room };
    }),
  setMyInfo: (playerId, role, mafiaTeam) =>
    set({ myPlayerId: playerId, myRole: role, mafiaTeam: mafiaTeam ?? null }),
  addAnnouncement: (msg) =>
    set((state) => ({
      announcements: [...state.announcements.slice(-19), msg],
    })),
  clearAnnouncements: () => set({ announcements: [] }),
  reset: () =>
    set({
      roomState: null,
      myPlayerId: null,
      myRole: null,
      mafiaTeam: null,
      announcements: [],
    }),
}));
