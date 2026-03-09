import { Room, Phase, DEFAULT_SETTINGS } from '@mafia/shared';

const rooms = new Map<string, Room>();

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export function createRoom(hostId: string): Room {
  let id = generateRoomId();
  while (rooms.has(id)) id = generateRoomId();

  const room: Room = {
    id,
    hostId,
    players: [],
    phase: Phase.LOBBY,
    round: 0,
    settings: { ...DEFAULT_SETTINGS },
    vote1Candidate: null,
    vote1Tally: {},
    vote2Tally: { yes: 0, no: 0 },
    nightActions: {},
    quickFinishVotes: [],
  };
  rooms.set(id, room);
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

export function updateRoom(room: Room): void {
  rooms.set(room.id, room);
}

export function deleteRoom(id: string): void {
  rooms.delete(id);
}

export function getAllRooms(): Room[] {
  return Array.from(rooms.values());
}

/** Find room that contains a given socket/player ID */
export function findRoomByPlayerId(playerId: string): Room | undefined {
  return Array.from(rooms.values()).find((r) =>
    r.players.some((p) => p.id === playerId)
  );
}
