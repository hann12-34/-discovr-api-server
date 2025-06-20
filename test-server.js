/**
 * Minimal test server for Cloud Run
 */

const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

// Basic route to verify the server is running
app.get('/', (req, res) => {
  res.send({
    status: 'ok',
    message: 'Test server for Cloud Run is running',
    port: port,
    env: process.env.NODE_ENV
  });
});

// Start server and listen on all interfaces
app.listen(port, '0.0.0.0', () => {
  console.log(`Test server running on port ${port}`);
  console.log(`PORT env var: ${process.env.PORT}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
});
