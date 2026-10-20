import { io } from 'socket.io-client';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMzLCJlbWFpbCI6ImJhY3NpLm5vaUBnbWFpbC5jb20iLCJyb2xlcyI6WyJET0NUT1IiXSwiaWF0IjoxNzg5MTQzOTAwLCJleHAiOjE3ODkxNDc1MDB9.7lGJj8V2k756A3fMFfmSFEdAFPV3o-3xUqs6QsdSKqs';

console.log('Testing socket connection with Doctor token...');

const socket = io('http://localhost:3000/realtime', {
  auth: { token },
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('✓ Socket connected! Socket ID:', socket.id);
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message);
});

socket.on('queue.ticket_created', (data) => {
  console.log('🎉 RECEIVED EVENT [queue.ticket_created]:', JSON.stringify(data, null, 2));
});

socket.on('queue.updated', (data) => {
  console.log('🎉 RECEIVED EVENT [queue.updated]:', JSON.stringify(data, null, 2));
});

socket.on('appointment.updated', (data) => {
  console.log('🎉 RECEIVED EVENT [appointment.updated]:', JSON.stringify(data, null, 2));
});

setTimeout(() => {
  console.log('Timeout reached. Disconnecting.');
  socket.disconnect();
  process.exit(0);
}, 5000);
