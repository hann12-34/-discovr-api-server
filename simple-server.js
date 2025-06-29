const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

console.log('Starting simple server...');
console.log('PORT environment variable:', process.env.PORT);
console.log('Using port:', PORT);

// Simple health check route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Discovr API Server is running!', 
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server successfully started on port ${PORT}`);
  console.log(`🌐 Server is listening on all interfaces (0.0.0.0:${PORT})`);
});

// Handle startup errors
server.on('error', (error) => {
  console.error('❌ Server startup error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
