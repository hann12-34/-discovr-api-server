console.log('🚀 Starting STABLE Discovr API Server...');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, Origin, Accept');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// JSON middleware
app.use(express.json());

// Load city orchestrators and store references
let vancouver = null;
let calgary = null;
let toronto = null;
let montreal = null;
let newyork = null;

try {
  console.log('📍 Loading Vancouver scrapers...');
  vancouver = require('./scrapers/cities/vancouver/index.js');
  console.log('✅ Vancouver loaded successfully');
} catch (error) {
  console.log('⚠️ Vancouver loading failed:', error.message);
}

try {
  console.log('📍 Loading Calgary scrapers...');
  calgary = require('./scrapers/cities/Calgary/index.js');
  console.log('✅ Calgary loaded successfully');
} catch (error) {
  console.log('⚠️ Calgary loading failed:', error.message);
}

try {
  console.log('📍 Loading Toronto scrapers...');
  toronto = require('./scrapers/cities/Toronto/index.js');
  console.log('✅ Toronto loaded successfully');
} catch (error) {
  console.log('⚠️ Toronto loading failed:', error.message);
  console.log('⚠️ Stack:', error.stack);
}

try {
  console.log('📍 Loading Montreal scrapers...');
  montreal = require('./scrapers/cities/Montreal/index.js');
  console.log('✅ Montreal loaded successfully');
} catch (error) {
  console.log('⚠️ Montreal loading failed:', error.message);
}

try {
  console.log('📍 Loading New York scrapers...');
  newyork = require('./scrapers/cities/New York/index.js');
  console.log('✅ New York loaded successfully');
} catch (error) {
  console.log('⚠️ New York loading failed:', error.message);
}

// Main API endpoint
app.get('/api/v1/venues/events/all', async (req, res) => {
  console.log('📡 API request received for all events');
  
  try {
    const allEvents = [];
    
    // Run Vancouver scrapers
    if (vancouver && typeof vancouver.scrape === 'function') {
      try {
        console.log('🔵 Running Vancouver scrapers...');
        const vancouverEvents = await vancouver.scrape();
        console.log(`✅ Vancouver: ${vancouverEvents.length} events`);
        allEvents.push(...vancouverEvents);
      } catch (error) {
        console.log('⚠️ Vancouver scraping failed:', error.message);
      }
    }
    
    // Run Calgary scrapers
    if (calgary && typeof calgary.scrape === 'function') {
      try {
        console.log('🟠 Running Calgary scrapers...');
        const calgaryEvents = await calgary.scrape();
        console.log(`✅ Calgary: ${calgaryEvents.length} events`);
        allEvents.push(...calgaryEvents);
      } catch (error) {
        console.log('⚠️ Calgary scraping failed:', error.message);
      }
    }
    
    // Run Toronto scrapers
    if (toronto && typeof toronto.scrape === 'function') {
      try {
        console.log('🔴 Running Toronto scrapers...');
        const torontoEvents = await toronto.scrape();
        console.log(`✅ Toronto: ${torontoEvents.length} events`);
        allEvents.push(...torontoEvents);
      } catch (error) {
        console.log('⚠️ Toronto scraping failed:', error.message);
      }
    }
    
    // Run Montreal scrapers
    if (montreal && typeof montreal.scrape === 'function') {
      try {
        console.log('🔵 Running Montreal scrapers...');
        const montrealEvents = await montreal.scrape();
        console.log(`✅ Montreal: ${montrealEvents.length} events`);
        allEvents.push(...montrealEvents);
      } catch (error) {
        console.log('⚠️ Montreal scraping failed:', error.message);
      }
    }
    
    // Run New York scrapers
    if (newyork && typeof newyork.scrape === 'function') {
      try {
        console.log('🟣 Running New York scrapers...');
        const newyorkEvents = await newyork.scrape();
        console.log(`✅ New York: ${newyorkEvents.length} events`);
        allEvents.push(...newyorkEvents);
      } catch (error) {
        console.log('⚠️ New York scraping failed:', error.message);
      }
    }
    
    res.json({
      success: true,
      message: 'Events retrieved successfully',
      count: allEvents.length,
      events: allEvents,
      cities: ['Vancouver', 'Calgary', 'Toronto', 'Montreal', 'New York'],
      timestamp: new Date().toISOString()
    });
    
    console.log(`📊 Returned ${allEvents.length} events total`);
  } catch (error) {
    console.error('❌ API Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
      events: [],
      timestamp: new Date().toISOString()
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    port: PORT,
    timestamp: new Date().toISOString(),
    cities: ['Vancouver', 'Calgary', 'Toronto', 'Montreal', 'New York']
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Discovr API Server',
    version: '1.0.0',
    endpoints: {
      events: '/api/v1/venues/events/all',
      health: '/health'
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 STABLE Server running on http://localhost:${PORT}`);
  console.log(`✅ API: http://localhost:${PORT}/api/v1/venues/events/all`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`🎯 Ready for production use!`);
});
