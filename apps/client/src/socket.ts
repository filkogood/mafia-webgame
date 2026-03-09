import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@mafia/shared';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  'http://localhost:3001',
  { autoConnect: true }
);

export default socket;
