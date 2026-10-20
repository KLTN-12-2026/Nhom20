import { io } from 'socket.io-client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';

config({ path: '.env', quiet: true });

const secret = process.env.JWT_SECRET;
const token = jwt.sign(
  {
    sub: 33, // Dr. Phuc's user id
    email: 'bacsi.noi@gmail.com',
    roles: ['DOCTOR'],
  },
  secret,
  { expiresIn: '1h' }
);

console.log('1. Connecting Socket for Doctor Phuc (User 33, Doctor 20)...');

const socket = io('http://localhost:3000/realtime', {
  auth: { token },
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('✓ Socket connected! ID:', socket.id);
  
  // Now trigger an API call: Check in an appointment for doctor Phuc or call reception API
  setTimeout(async () => {
    console.log('\n2. Testing event reception...');
  }, 1000);
});

socket.on('queue.ticket_created', (data) => {
  console.log('🎉 RECEIVED [queue.ticket_created]:', data?.ticket?.queueNumber || data?.code || data);
});

socket.on('queue.updated', (data) => {
  console.log('🎉 RECEIVED [queue.updated]:', data);
});

socket.on('appointment.updated', (data) => {
  console.log('🎉 RECEIVED [appointment.updated]:', data?.code || data);
});

socket.on('connect_error', (err) => {
  console.error('❌ Socket error:', err.message);
});

setTimeout(() => {
  console.log('\nEnding test.');
  socket.disconnect();
  process.exit(0);
}, 6000);
