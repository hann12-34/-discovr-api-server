/**
 * Script to update the unified-proxy-server.js file
 * to ensure venue is returned as a string in the API response
 */
const fs = require('fs');
const path = require('path');

const serverFilePath = path.join(__dirname, 'unified-proxy-server.js');

// Read the existing server file
console.log('📄 Reading server file...');
let serverContent = fs.readFileSync(serverFilePath, 'utf8');

// Update the venue handling in the /api/v1/venues/events/all endpoint
console.log('🔧 Updating venue handling in API response...');

// Function to find and update the venues/events/all route handler
function updateVenuesEventsAllEndpoint(content) {
  // Look for the route definition
  const routePattern = /app\.get\(['"]\/api\/v1\/venues\/events\/all['"]/;
  
  if (!routePattern.test(content)) {
    console.log('⚠️ Could not find the /api/v1/venues/events/all endpoint');
    return content;
  }
  
  // Find the point where events are mapped before returning
  const mapPattern = /const events = .*?\.map\(\s*\(event\)\s*=>/;
  
  if (!mapPattern.test(content)) {
    console.log('⚠️ Could not find the events mapping code');
    
    // Alternative approach: Add code to normalize venue in the response
    const insertPoint = content.indexOf('app.get(\'/api/v1/venues/events/all\'');
    if (insertPoint === -1) {
      console.log('⚠️ Cannot find insertion point');
      return content;
    }
    
    const routeStart = content.indexOf('{', insertPoint);
    if (routeStart === -1) return content;
    
    // Add venue normalization code right after the route handler opening brace
    const newCode = `
    // Middleware to normalize venue field for Toronto events
    app.use((req, res, next) => {
      // Store the original send method
      const originalSend = res.send;
      
      // Override the send method
      res.send = function(body) {
        // Only process JSON responses
        if (typeof body === 'string') {
          try {
            // Parse the response body
            const parsedBody = JSON.parse(body);
            
            // Check if this is an events response
            if (parsedBody && parsedBody.events && Array.isArray(parsedBody.events)) {
              // Normalize venues in events
              parsedBody.events = parsedBody.events.map(event => {
                // For Toronto events, ensure venue is a string
                if (event.city === 'Toronto') {
                  if (event.venue && typeof event.venue === 'object') {
                    event.venue = event.venue.name || 'Toronto Venue';
                  } else if (!event.venue) {
                    event.venue = 'Toronto Venue';
                  }
                }
                return event;
              });
              
              // Convert back to string
              body = JSON.stringify(parsedBody);
            }
          } catch (e) {
            // If parsing fails, leave the body as is
            console.error('Error normalizing venue:', e);
          }
        }
        
        // Call the original send method
        return originalSend.call(this, body);
      };
      
      next();
    });
`;
    
    return content.slice(0, insertPoint) + newCode + content.slice(insertPoint);
  }
  
  // Find where events are returned in the response
  const returnPattern = /return res\.json\(\{.*?events.*?\}\)/;
  
  if (!returnPattern.test(content)) {
    console.log('⚠️ Could not find the response return statement');
    return content;
  }
  
  // Update the event mapping to handle venue field correctly for Toronto events
  return content.replace(
    mapPattern,
    `const events = allEvents.map((event) => {
        // For Toronto events, ensure venue is a string
        if (event.city === 'Toronto' || 
            (event.location && event.location.toLowerCase().includes('toronto'))) {
          if (event.venue && typeof event.venue === 'object') {
            event.venue = event.venue.name || 'Toronto Venue';
          } else if (!event.venue) {
            event.venue = 'Toronto Venue';
          }
        }
        
        return `
  );
}

// Process the file content
const updatedContent = updateVenuesEventsAllEndpoint(serverContent);

// Write the updated content back to the file
if (updatedContent !== serverContent) {
  console.log('✅ Writing updates to server file...');
  fs.writeFileSync(serverFilePath, updatedContent, 'utf8');
  console.log('✅ Server file updated successfully!');
} else {
  console.log('⚠️ No changes made to server file');
}
