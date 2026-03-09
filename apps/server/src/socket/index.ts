import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@mafia/shared';
import { registerLobbyHandlers } from './lobbyHandlers';
import { registerGameHandlers } from './gameHandlers';
import { registerNightHandlers } from './nightHandlers';
import { registerVoteHandlers } from './voteHandlers';
import { registerDevHandlers } from './devHandlers';

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>
) {
  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    registerLobbyHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerNightHandlers(io, socket);
    registerVoteHandlers(io, socket);
    registerDevHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`);
    });
  });
}
