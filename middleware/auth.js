const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// API key authentication middleware
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  // Check if API key is provided
  if (!apiKey) {
    return res.status(401).json({ 
      success: false, 
      message: 'API key is required' 
    });
  }
  
  // Validate API key (replace with your actual key)
  const validApiKey = process.env.API_KEY || 'yVbkoaTQQiG8ZStgXC7NdAgs62hJkP';
  
  if (apiKey !== validApiKey) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid API key' 
    });
  }
  
  next();
};

// JWT authentication middleware
const jwtAuth = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'No token provided' 
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add user from payload to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

// Admin role middleware
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }
  
  next();
};

// Either API key or JWT token is required
const anyAuth = (req, res, next) => {
  // Check for API key first
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY || 'yVbkoaTQQiG8ZStgXC7NdAgs62hJkP';
  
  if (apiKey && apiKey === validApiKey) {
    return next();
  }
  
  // If no API key, check for JWT token
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    console.log('JWT Debug: Attempting to verify token');
    console.log('JWT Debug: Token:', token.substring(0, 10) + '...');
    console.log('JWT Debug: JWT_SECRET:', JWT_SECRET.substring(0, 3) + '...');
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('JWT Debug: Token verified successfully');
    console.log('JWT Debug: Decoded payload:', decoded);
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT Debug: Authentication error:', error.message);
    console.error('JWT Debug: Error type:', error.name);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token signature' 
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication failed: ' + error.message 
      });
    }
  }
};

module.exports = { apiKeyAuth, jwtAuth, adminOnly, anyAuth };
