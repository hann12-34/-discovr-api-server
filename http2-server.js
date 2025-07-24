/**
 * HTTP/2 Server Implementation for Discovr API
 * Supports both HTTP/2 and HTTP/1.1 for maximum compatibility
 */

const express = require('express');
const spdy = require('spdy'); // HTTP/2 implementation for Node.js
const fs = require('fs');
const path = require('path');
const logger = require('./logger'); // Using the existing logger if you have one

// Create self-signed certificates for development
// Note: In production, replace these with proper certificates
const options = {
  key: fs.readFileSync(path.join(__dirname, 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'server.crt')),
  spdy: {
    protocols: ['h2', 'http/1.1'], // Support both HTTP/2 and HTTP/1.1
    plain: true, // Allow HTTP/1.1 (not just HTTPS)
    connection: {
      windowSize: 1024 * 1024, // 1MB window size
      autoSpdy31: false // Disable SPDY/3.1
    }
  }
};

/**
 * Creates an HTTP/2 compatible server using the Express app
 * @param {object} app - The Express application instance
 * @param {number} port - Port to listen on
 * @returns {object} - The created server
 */
function createHTTP2Server(app, port) {
  // Create the HTTP/2 server
  const server = spdy.createServer(options, app);
  
  // Log HTTP/2 support status
  console.log('🚀 HTTP/2 support enabled for enhanced performance');
  
  // Add HTTP/2 push capability to the response object
  app.use((req, res, next) => {
    res.push = (path, options) => {
      if (res.push) {
        res.push(path, options);
      }
      return res;
    };
    next();
  });
  
  // Start listening
  server.listen(port, '0.0.0.0', () => {
    console.log(`✅ HTTP/2 server listening on port ${port}`);
    console.log(`API base URL: http://0.0.0.0:${port}/api/v1`);
    console.log('Server started successfully with HTTP/2 support');
  });
  
  return server;
}

/**
 * Middleware to optimize HTTP/2 connections
 */
function http2Optimizer(req, res, next) {
  // Add HTTP/2 specific headers
  res.setHeader('X-HTTP2-Support', 'enabled');
  
  // Enable server push for critical resources if supported
  if (req.path === '/' && res.push) {
    // Example of server push for critical CSS/JS
    // Modify these paths based on your actual resources
    res.push('/public/css/main.css', {
      status: 200,
      method: 'GET',
      request: {
        accept: '*/*'
      },
      response: {
        'content-type': 'text/css'
      }
    });
  }
  
  next();
}

module.exports = {
  createHTTP2Server,
  http2Optimizer
};
