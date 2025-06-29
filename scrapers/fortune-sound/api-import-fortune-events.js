// Import Fortune Sound Club events directly through the Discovr API
const fs = require('fs');
const path = require('path');
const https = require('https');

// API endpoint for events (from app logs)
const API_BASE_URL = 'https://discovr-api-test-531591199325.northamerica-northeast2.run.app/api/v1';
const API_EVENTS_ENDPOINT = `${API_BASE_URL}/venues/events`;

// Fortune Sound events file path
const EVENTS_FILE_PATH = path.join(__dirname, 'Scrapers', 'FortuneSound', 'fortune_events.json');

// Helper function to make HTTPS requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = data ? JSON.parse(data) : {};
            resolve({ statusCode: res.statusCode, data: jsonData });
          } catch (e) {
            resolve({ statusCode: res.statusCode, data, error: 'Invalid JSON' });
          }
        } else {
          reject(new Error(`Request failed with status code ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function importEvents() {
  try {
    console.log(`📂 Reading events from ${EVENTS_FILE_PATH}`);
    const eventsData = fs.readFileSync(EVENTS_FILE_PATH, 'utf8');
    const events = JSON.parse(eventsData);
    
    console.log(`📊 Found ${events.length} Fortune Sound Club events to import`);
    
    // First check if API is available
    console.log(`🔄 Checking API health at ${API_BASE_URL}/health...`);
    const healthCheck = await makeRequest({
      method: 'GET',
      hostname: new URL(API_BASE_URL).hostname,
      path: '/api/v1/health',
      headers: {
        'X-Disable-HTTP3': '1.1',
        'X-Force-HTTP-Version': '1.1'
      }
    });
    
    if (healthCheck.statusCode !== 200) {
      throw new Error(`API health check failed: ${JSON.stringify(healthCheck)}`);
    }
    
    console.log('✅ API is healthy');
    
    // Import each event
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      if (i % 10 === 0) {
        console.log(`Processing event ${i+1}/${events.length}...`);
      }
      
      // Make sure we have a proper MongoDB-compatible format
      const apiEvent = {
        ...event,
        lastUpdated: new Date().toISOString()
      };
      
      // Convert startDate and endDate to ISO strings if they're Date objects
      if (apiEvent.startDate && typeof apiEvent.startDate === 'object') {
        apiEvent.startDate = apiEvent.startDate.toISOString();
      }
      if (apiEvent.endDate && typeof apiEvent.endDate === 'object') {
        apiEvent.endDate = apiEvent.endDate.toISOString();
      }
      
      try {
        const postData = JSON.stringify(apiEvent);
        
        const result = await makeRequest({
          method: 'POST',
          hostname: new URL(API_EVENTS_ENDPOINT).hostname,
          path: new URL(API_EVENTS_ENDPOINT).pathname,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length,
            'X-Disable-HTTP3': '1.1',
            'X-Force-HTTP-Version': '1.1'
          }
        }, postData);
        
        successCount++;
        
        if (i % 10 === 0) {
          console.log(`Successfully imported event: ${event.name}`);
        }
      } catch (err) {
        console.error(`❌ Error importing event "${event.name}":`, err.message);
        errorCount++;
      }
      
      // Add a small delay between requests to not overwhelm the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n✅ Import completed:');
    console.log(`Successful: ${successCount} events`);
    console.log(`Failed: ${errorCount} events`);
    
  } catch (err) {
    console.error('❌ Error importing events:', err);
  }
}

// Run the import
importEvents().catch(console.error);
