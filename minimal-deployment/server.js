const express = require('express');
const path = require('path');

// Initialize express app
const app = express();

// Always use 8080 for Cloud Run
const PORT = process.env.PORT || 8080;

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    return res.status(200).json({});
  }
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Catch-all route for single page app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'all-events-dashboard.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Dashboard available at: http://0.0.0.0:${PORT}/all-events-dashboard.html`);
});
