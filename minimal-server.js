const express = require('express');

const app = express();
const PORT = 3003;

console.log('[SIMPLE] Starting minimal server on port ' + PORT + '...');

app.get('/api/health', (req, res) => {
  console.log('[HEALTH] Got request, sending response...');
  res.json({ status: 'OK' });
  console.log('[HEALTH] Response sent');
});

console.log('[SIMPLE] Setting up listener...');
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log('[SIMPLE] Server ready on port ' + PORT);
});

// Handle errors
server.on('error', (err) => {
  console.error('[ERROR]', err);
});

process.on('uncaughtException', (err) => {
  console.error('[CRASH]', err);
});
