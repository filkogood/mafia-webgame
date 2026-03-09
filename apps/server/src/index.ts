import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ClientToServerEvents, ServerToClientEvents } from '@mafia/shared';
import { registerSocketHandlers } from './socket';
import { logRouter } from './routes/logRoutes';
import { adminRouter } from './routes/adminRoutes';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

/**
 * CSRF guard for state-changing requests to admin endpoints.
 * Verifies the Origin (or Referer) header matches the allowed client origin.
 * This is a defence-in-depth measure alongside sameSite=strict cookies.
 */
function csrfGuard(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }
  const origin = req.headers.origin ?? req.headers.referer;
  if (!origin || !origin.startsWith(CLIENT_ORIGIN)) {
    res.status(403).json({ error: 'CSRF check failed' });
    return;
  }
  next();
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/admin', csrfGuard, adminRouter);
app.use('/log', logRouter);

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
});

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
