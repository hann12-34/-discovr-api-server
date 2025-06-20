const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function debugScienceWorld() {
  console.log("Debugging Science World website structure...");
  const baseUrl = "https://www.scienceworld.ca";
  const eventsUrl = `${baseUrl}/events/`;
  
  // Create debug directory
  const debugDir = path.join(__dirname, 'debug');
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir);
  }
  
  try {
    // Make request with detailed headers to mimic a real browser
    const response = await axios.get(eventsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': baseUrl,
        'Cache-Control': 'no-cache'
      },
      timeout: 30000
    });
    
    // Save the full HTML response
    fs.writeFileSync(path.join(debugDir, 'science-world-full.html'), response.data);
    console.log(`Saved full HTML to ${path.join(debugDir, 'science-world-full.html')}`);
    console.log("Response Status:", response.status);
    console.log("Response Size:", response.data.length, "bytes");
    
    // Extract and log URLs that might be event pages or data sources
    const eventUrls = [];
    const apiEndpoints = [];
    
    // Simple regex patterns to find URLs
    const urlRegex = /(https?:\/\/[^"'\s]+)/g;
    const matches = response.data.match(urlRegex) || [];
    
    matches.forEach(url => {
      if (url.includes('event') || url.includes('exhibition') || url.includes('program')) {
        eventUrls.push(url);
      }
      if (url.includes('api') || url.includes('json') || url.includes('data')) {
        apiEndpoints.push(url);
      }
    });
    
    // Log unique event URLs (first 10)
    const uniqueEventUrls = [...new Set(eventUrls)];
    console.log("\nPotential event page URLs:");
    uniqueEventUrls.slice(0, 10).forEach(url => console.log(` - ${url}`));
    
    // Log unique API endpoints (first 10)
    const uniqueApiEndpoints = [...new Set(apiEndpoints)];
    console.log("\nPotential API endpoints:");
    uniqueApiEndpoints.slice(0, 10).forEach(url => console.log(` - ${url}`));
    
    // Check for event listings at /visit/calendar/ endpoint which is common for museums
    console.log("\nChecking alternate event URLs...");
    const alternateUrls = [
      `${baseUrl}/visit/calendar/`,
      `${baseUrl}/whats-on/`,
      `${baseUrl}/today/`
    ];
    
    for (const url of alternateUrls) {
      try {
        console.log(`Checking ${url}...`);
        const altResponse = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
          },
          timeout: 10000
        });
        console.log(` - Status: ${altResponse.status}, Size: ${altResponse.data.length} bytes`);
        
        // Save this response too
        const filename = path.join(debugDir, `science-world-${url.split('/').filter(Boolean).pop() || 'alt'}.html`);
        fs.writeFileSync(filename, altResponse.data);
        console.log(` - Saved to ${filename}`);
        
        // Check if this page has more event content
        const hasEvents = 
          altResponse.data.includes('event') || 
          altResponse.data.includes('exhibit') || 
          altResponse.data.includes('calendar');
        
        console.log(` - Contains event keywords: ${hasEvents}`);
      } catch (error) {
        console.log(` - Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error("Error in debugging:", error.message);
    if (error.response) {
      console.log("Response status:", error.response.status);
      console.log("Response headers:", JSON.stringify(error.response.headers, null, 2));
    }
  }
}

debugScienceWorld();
