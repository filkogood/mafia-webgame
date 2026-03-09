import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  Room,
  Player,
  Role,
} from '@mafia/shared';
import { createRoom, getRoom, updateRoom, findRoomByPlayerId } from '../state/roomStore';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

function emitRoomState(io: Server, room: Room) {
  io.to(room.id).emit('room_state', room);
}

export function registerLobbyHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AppSocket
) {
  socket.on('create_room', ({ nickname }) => {
    if (!nickname || nickname.trim().length === 0) {
      socket.emit('error', '닉네임을 입력해주세요.');
      return;
    }

    const room = createRoom(socket.id);
    const player: Player = {
      id: socket.id,
      nickname: nickname.trim(),
      role: Role.CITIZEN,
      isAlive: true,
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
    };
    room.players.push(player);
    updateRoom(room);

    socket.join(room.id);
    emitRoomState(io, room);
  });

  socket.on('join_room', ({ roomId, nickname }) => {
    if (!nickname || nickname.trim().length === 0) {
      socket.emit('error', '닉네임을 입력해주세요.');
      return;
    }

    const room = getRoom(roomId.toUpperCase());
    if (!room) {
      socket.emit('error', '방을 찾을 수 없습니다.');
      return;
    }

    if (room.players.length >= 12) {
      socket.emit('error', '방이 가득 찼습니다.');
      return;
    }

    const nicknameExists = room.players.some(
      (p) => p.nickname === nickname.trim()
    );
    if (nicknameExists) {
      socket.emit('error', '이미 사용 중인 닉네임입니다.');
      return;
    }

    const player: Player = {
      id: socket.id,
      nickname: nickname.trim(),
      role: Role.CITIZEN,
      isAlive: true,
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
    };
    room.players.push(player);
    updateRoom(room);

    socket.join(room.id);
    emitRoomState(io, room);
  });

  socket.on('disconnecting', () => {
    const room = findRoomByPlayerId(socket.id);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== socket.id);
    if (room.players.length === 0) {
      // Room will be garbage-collected naturally; clear if needed
      return;
    }
    // Transfer host if host left
    if (room.hostId === socket.id && room.players.length > 0) {
      room.hostId = room.players[0].id;
    }
    updateRoom(room);
    emitRoomState(io, room);
  });
}
