import { io } from 'socket.io-client';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export const realtimeSocket = io(`${SOCKET_URL}/realtime`, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export function connectRealtime(accessToken?: string | null) {
  realtimeSocket.auth = accessToken ? { token: accessToken } : {};
  if (realtimeSocket.connected) realtimeSocket.disconnect();
  realtimeSocket.connect();
}

export function disconnectRealtime() {
  realtimeSocket.disconnect();
}
