import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  Phase,
  Role,
  RoleCategory,
  RoleKoreanName,
  CITIZEN_BASIC_ROLES,
  CITIZEN_SPECIAL_ROLES,
} from '@mafia/shared';
import { getRoom, updateRoom, findRoomByPlayerId } from '../state/roomStore';
import { getPreset } from '@mafia/game-core';
import { checkWinCondition } from '@mafia/game-core';
import { scheduleNightTimer } from './nightHandlers';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const ALL_CITIZEN_ROLES = [...CITIZEN_BASIC_ROLES, ...CITIZEN_SPECIAL_ROLES];

export function registerGameHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AppSocket
) {
  socket.on('update_settings', ({ settings }) => {
    const room = findRoomByPlayerId(socket.id);
    if (!room || room.hostId !== socket.id) return;
    room.settings = { ...room.settings, ...settings };
    updateRoom(room);
    io.to(room.id).emit('room_state', room);
  });

  socket.on('start_game', () => {
    const room = findRoomByPlayerId(socket.id);
    if (!room || room.hostId !== socket.id) {
      socket.emit('error', '호스트만 게임을 시작할 수 있습니다.');
      return;
    }
    if (room.players.length < 4 || room.players.length > 12) {
      socket.emit('error', '4~12명이 있어야 게임을 시작할 수 있습니다.');
      return;
    }

    // Assign roles from preset
    const roles = getPreset(room.players.length);
    // Shuffle roles
    const shuffledRoles = [...roles].sort(() => Math.random() - 0.5);

    // Assign couple pairs if any
    const coupleIndices: number[] = [];
    shuffledRoles.forEach((r, i) => {
      if (r === Role.COUPLE) coupleIndices.push(i);
    });

    room.players.forEach((player, idx) => {
      player.role = shuffledRoles[idx];
      player.isAlive = true;
      player.isCouple = false;
      player.couplePairId = null;
      player.isDrunk = false;
      player.drunkExpiresAfterVote2 = null;
      player.isVoteBlocked = false;
      player.voteBlockExpiresAfterVote2 = null;
      player.isHypnotized = false;
      player.hypnotizedExpiresAtVote2 = null;
      player.hasInheritedMafia = false;
      player.knownMafiaTeam = null;
      player.ghostVotesUsedVote1 = false;
      player.ghostVotesUsedVote2 = false;
    });

    // Link couple pairs
    if (coupleIndices.length === 2) {
      const [i1, i2] = coupleIndices;
      room.players[i1].isCouple = true;
      room.players[i1].couplePairId = room.players[i2].id;
      room.players[i2].isCouple = true;
      room.players[i2].couplePairId = room.players[i1].id;
    }

    room.phase = Phase.NIGHT;
    room.round = 1;
    room.nightActions = {};
    room.quickFinishVotes = [];
    updateRoom(room);

    // Build mafia team info
    const mafiaTeam = room.players
      .filter((p) => RoleCategory[p.role] === 'mafia_body')
      .map((p) => ({ id: p.id, nickname: p.nickname, role: p.role }));

    // Emit game_started to each player individually
    for (const player of room.players) {
      const targetSocket = io.sockets.sockets.get(player.id);
      if (!targetSocket) continue;

      let teamInfo: typeof mafiaTeam | undefined;
      if (RoleCategory[player.role] === 'mafia_body') {
        // Mafia bodies see full mafia team
        teamInfo = mafiaTeam;
      }
      // Collaborators start without team info (contact system reveals later)

      targetSocket.emit('game_started', {
        yourRole: player.role,
        yourPlayerId: player.id,
        mafiaTeam: teamInfo,
        roomState: room,
      });
    }

    // Hacker start knowledge: learn one random citizen-team role NOT in this game
    const hackerPlayer = room.players.find((p) => p.role === Role.HACKER);
    if (hackerPlayer) {
      const assignedRoles = new Set(room.players.map((p) => p.role));
      const missingCitizenRoles = ALL_CITIZEN_ROLES.filter((r) => !assignedRoles.has(r));
      if (missingCitizenRoles.length > 0) {
        const randomRole =
          missingCitizenRoles[Math.floor(Math.random() * missingCitizenRoles.length)];
        const hackerSocket = io.sockets.sockets.get(hackerPlayer.id);
        hackerSocket?.emit('private_toast', {
          message: `[해커 정보] 이 게임에 없는 시민 역할: ${RoleKoreanName[randomRole]}`,
        });
      }
    }

    io.to(room.id).emit('phase_changed', {
      phase: Phase.NIGHT,
      round: room.round,
    });
    scheduleNightTimer(io, room.id);
  });

  socket.on('quick_finish', () => {
    const room = findRoomByPlayerId(socket.id);
    if (!room || !room.settings.allowQuickFinish) return;
    if (!room.quickFinishVotes.includes(socket.id)) {
      room.quickFinishVotes.push(socket.id);
      updateRoom(room);
    }

    const alivePlayers = room.players.filter((p) => p.isAlive);
    if (room.quickFinishVotes.length > alivePlayers.length / 2) {
      // Advance phase – handled by phase-specific logic
      io.to(room.id).emit('announcement', '빨리하기가 적용됩니다.');
      // Reset quick finish votes
      room.quickFinishVotes = [];
      updateRoom(room);
    }
  });
}
