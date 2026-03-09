import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  Phase,
  Player,
  Role,
  RoleCategory,
  RoleKoreanName,
} from '@mafia/shared';
import { getRoom, updateRoom, findRoomByPlayerId } from '../state/roomStore';
import {
  processNightActions,
  checkContacts,
  checkWinCondition,
} from '@mafia/game-core';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** Per-room night phase timeout handles */
const nightTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Clears any scheduled night timer for the given room */
export function clearNightTimer(roomId: string): void {
  const handle = nightTimers.get(roomId);
  if (handle !== undefined) {
    clearTimeout(handle);
    nightTimers.delete(roomId);
  }
}

/** Schedules a night timeout for the given room; clears any previous timer first */
export function scheduleNightTimer(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomId: string
): void {
  clearNightTimer(roomId);
  const room = getRoom(roomId);
  if (!room) return;
  const handle = setTimeout(() => {
    nightTimers.delete(roomId);
    advanceAfterNight(io, roomId);
  }, room.settings.nightTimerSec * 1000);
  nightTimers.set(roomId, handle);
}

/** Returns true if the player must confirm a night action for early-advance checks */
function mustConfirmNightAction(p: Player): boolean {
  if (!p.isAlive) return false;
  const isMafia =
    p.role === Role.MAFIA ||
    (p.role === Role.ROOKIE_MAFIA && p.hasInheritedMafia);
  const isCollaborator = RoleCategory[p.role] === 'mafia_collaborator';
  const isDoctor = p.role === Role.DOCTOR;
  return isMafia || isCollaborator || isDoctor;
}

function advanceAfterNight(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomId: string
) {
  const room = getRoom(roomId);
  if (!room || room.phase !== Phase.NIGHT) return;

  clearNightTimer(roomId);

  // Track possessors before processing so we can detect role changes
  const possessorsBefore = room.players
    .filter((p) => p.role === Role.POSSESSOR && p.isAlive)
    .map((p) => p.id);

  // Build confirmed actions map; players who submitted no action are absent and
  // treated as null by processNightActions (confirmedActions[actor.id] ?? null)
  const confirmedActions: Record<string, string | null> = {};
  for (const [actorId, action] of Object.entries(room.nightActions)) {
    confirmedActions[actorId] = action.targetId;
  }

  const result = processNightActions(
    room.players,
    confirmedActions,
    room.settings,
    room.round
  );

  room.players = result.updatedPlayers;

  // Check contacts
  const contactedCollabIds = checkContacts(room.players, confirmedActions);
  const mafiaTeam = room.players
    .filter(
      (p) =>
        p.role === Role.MAFIA ||
        (p.role === Role.ROOKIE_MAFIA && p.hasInheritedMafia)
    )
    .map((p) => ({ id: p.id, nickname: p.nickname, role: p.role }));

  for (const collabId of contactedCollabIds) {
    const collab = room.players.find((p) => p.id === collabId);
    if (collab) {
      collab.knownMafiaTeam = mafiaTeam;
      const collabSocket = io.sockets.sockets.get(collabId);
      collabSocket?.emit('contact_triggered', mafiaTeam);
    }
  }

  // Notify Android players that were visited by a Hacker
  for (const visit of result.visits) {
    const visitor = room.players.find((p) => p.id === visit.fromId);
    const visited = room.players.find((p) => p.id === visit.toId);
    if (!visitor || !visited) continue;
    if (visitor.role === Role.HACKER && visited.role === Role.ANDROID) {
      const androidSocket = io.sockets.sockets.get(visited.id);
      androidSocket?.emit('hacker_visited', {
        hackerId: visitor.id,
        hackerNickname: visitor.nickname,
      });
    }
  }

  // Notify possessor who inherited mafia body role
  for (const possessorId of possessorsBefore) {
    const updated = room.players.find((p) => p.id === possessorId);
    if (updated && updated.role === Role.MAFIA) {
      updated.knownMafiaTeam = mafiaTeam;
      const possessorSocket = io.sockets.sockets.get(possessorId);
      possessorSocket?.emit('role_updated', {
        yourRole: Role.MAFIA,
        mafiaTeam,
      });
    }
  }

  // Announce deaths
  for (const deadId of result.deaths) {
    const dead = room.players.find((p) => p.id === deadId);
    if (!dead) continue;
    const roleInfo = room.settings.announcementMode
      ? ` (${RoleKoreanName[dead.role]})`
      : '';
    io.to(room.id).emit('player_died', {
      playerId: deadId,
      role: room.settings.announcementMode ? dead.role : undefined,
    });
    io.to(room.id).emit(
      'announcement',
      `${dead.nickname}님이 사망했습니다.${roleInfo}`
    );
  }

  for (const msg of result.announcements) {
    io.to(room.id).emit('announcement', msg);
  }

  // Check win condition
  const winResult = checkWinCondition(room.players);
  if (winResult.winner) {
    room.phase = Phase.ENDED;
    updateRoom(room);
    io.to(room.id).emit('game_ended', {
      winner: winResult.winner,
      reason: winResult.reason,
    });
    return;
  }

  // Advance to DAY
  room.phase = Phase.DAY;
  room.nightActions = {};
  room.quickFinishVotes = [];
  updateRoom(room);
  io.to(room.id).emit('phase_changed', { phase: Phase.DAY, round: room.round });
  io.to(room.id).emit('room_state', room);
}

export function registerNightHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AppSocket
) {
  socket.on('night_preview', ({ targetId }) => {
    const room = findRoomByPlayerId(socket.id);
    if (!room || room.phase !== Phase.NIGHT) return;

    const actor = room.players.find((p) => p.id === socket.id);
    if (!actor || !actor.isAlive) return;

    room.nightActions[socket.id] = {
      actorId: socket.id,
      targetId,
      isPreview: true,
    };
    updateRoom(room);

    // Send preview updates to mafia players
    const isMafiaActor =
      actor.role === Role.MAFIA ||
      (actor.role === Role.ROOKIE_MAFIA && actor.hasInheritedMafia);
    if (isMafiaActor) {
      const mafiaPreviewTargets: Record<string, string | null> = {};
      for (const player of room.players) {
        const isMafia =
          player.role === Role.MAFIA ||
          (player.role === Role.ROOKIE_MAFIA && player.hasInheritedMafia);
        if (isMafia) {
          const action = room.nightActions[player.id];
          mafiaPreviewTargets[player.id] = action?.targetId ?? null;
        }
      }
      // Send to all mafia players
      for (const player of room.players) {
        const isMafia =
          player.role === Role.MAFIA ||
          (player.role === Role.ROOKIE_MAFIA && player.hasInheritedMafia);
        if (isMafia) {
          const s = io.sockets.sockets.get(player.id);
          s?.emit('night_preview_update', mafiaPreviewTargets);
        }
      }
    }
  });

  socket.on('night_confirm', ({ targetId }) => {
    const room = findRoomByPlayerId(socket.id);
    if (!room || room.phase !== Phase.NIGHT) return;

    const actor = room.players.find((p) => p.id === socket.id);
    if (!actor || !actor.isAlive) return;

    room.nightActions[socket.id] = {
      actorId: socket.id,
      targetId,
      isPreview: false,
    };
    updateRoom(room);

    // Check if all active role players have confirmed
    const activeActors = room.players.filter(mustConfirmNightAction);
    const allConfirmed = activeActors.every((p) => {
      const action = room.nightActions[p.id];
      return action && !action.isPreview;
    });

    if (allConfirmed) {
      clearNightTimer(room.id);
      advanceAfterNight(io, room.id);
    }
  });
}

export { advanceAfterNight };
