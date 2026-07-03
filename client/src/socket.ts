import { io } from 'socket.io-client';

const devServerUrl = 'http://localhost:3001';
const socketUrl =
  import.meta.env.VITE_SOCKET_URL ??
  (window.location.hostname === 'localhost' && window.location.port === '5173'
    ? devServerUrl
    : window.location.origin);

export const socket = io(socketUrl, { autoConnect: true });
