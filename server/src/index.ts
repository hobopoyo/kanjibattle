import cors from 'cors';
import express from 'express';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { Server } from 'socket.io';
import { registerGameHandlers } from './game.js';

const app = express();
const server = createServer(app);
const allowedOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const corsOrigins = [allowedOrigin, 'http://localhost:5173'];
const io = new Server(server, { cors: { origin: corsOrigins } });

app.use(cors({ origin: corsOrigins }));
app.get('/health', (_req, res) => res.json({ ok: true, app: 'Kanji Draw Battle' }));

const clientDist = existsSync(join(process.cwd(), 'client/dist'))
  ? join(process.cwd(), 'client/dist')
  : join(process.cwd(), '../client/dist');

if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')));
}

io.on('connection', (socket) => registerGameHandlers(io, socket));

const port = Number(process.env.PORT ?? 3001);
server.listen(port, () => console.log('Kanji Draw Battle server running on port ' + port));
