import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  DevScenario,
  Phase,
  Room,
} from '@mafia/shared';
import { getRoom, updateRoom } from '../state/roomStore';

/** Returns true when the server is running in dev mode (non-production). */
export function isDevModeEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * Applies a dev scenario to an existing room.
 * Returns the mutated room (same reference) so callers can broadcast it.
 *
 * Pure logic — no I/O, safe to unit-test.
 */
export function applyScenario(room: Room, scenario: DevScenario): Room {
  if (scenario.phase !== undefined) {
    room.phase = scenario.phase;
  }

  if (scenario.round !== undefined) {
    room.round = scenario.round;
  }

  if (scenario.vote1Candidate !== undefined) {
    room.vote1Candidate = scenario.vote1Candidate;
  }

  if (scenario.nightActions !== undefined) {
    room.nightActions = {};
    for (const [actorId, action] of Object.entries(scenario.nightActions)) {
      room.nightActions[actorId] = {
        actorId,
        targetId: action.targetId,
        isPreview: false,
      };
    }
  }

  if (scenario.players && scenario.players.length > 0) {
    room.players = room.players.map((player) => {
      const patch = scenario.players!.find((p) => p.id === player.id);
      if (!patch) return player;

      const updated = { ...player };
      if (patch.role !== undefined) updated.role = patch.role;
      if (patch.isAlive !== undefined) updated.isAlive = patch.isAlive;
      if (patch.isDrunk !== undefined) {
        updated.isDrunk = patch.isDrunk;
        if (!patch.isDrunk) updated.drunkExpiresAfterVote2 = null;
      }
      if (patch.isHypnotized !== undefined) {
        updated.isHypnotized = patch.isHypnotized;
        if (!patch.isHypnotized) updated.hypnotizedExpiresAtVote2 = null;
      }
      if (patch.isVoteBlocked !== undefined) {
        updated.isVoteBlocked = patch.isVoteBlocked;
        if (!patch.isVoteBlocked) updated.voteBlockExpiresAfterVote2 = null;
      }
      if (patch.hasInheritedMafia !== undefined)
        updated.hasInheritedMafia = patch.hasInheritedMafia;
      if (patch.knownMafiaTeam !== undefined)
        updated.knownMafiaTeam = patch.knownMafiaTeam;

      return updated;
    });
  }

  return room;
}

export function registerDevHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
): void {
  if (!isDevModeEnabled()) return;

  const DEV_SECRET = process.env.DEV_SECRET ?? '';

  socket.on('dev:setScenario', ({ roomId, secret, scenario }) => {
    if (!DEV_SECRET || secret !== DEV_SECRET) {
      socket.emit('error', '[dev] Invalid DEV_SECRET');
      return;
    }

    const room = getRoom(roomId);
    if (!room) {
      socket.emit('error', `[dev] Room not found: ${roomId}`);
      return;
    }

    const updated = applyScenario(
      // Shallow-copy the room so we don't mutate the in-store reference before updateRoom.
      // applyScenario reassigns room.players (via map) so it's safe to share player objects.
      { ...room, players: [...room.players] },
      scenario
    );
    updateRoom(updated);

    // Broadcast updated state so all connected tabs sync.
    io.to(roomId).emit('room_state', updated);
    console.log(`[dev] scenario applied to room ${roomId}: phase=${updated.phase} round=${updated.round}`);
  });
}
