/**
 * Middleware to deduplicate events before sending to clients
 * Removes duplicate events based on configurable criteria
 */

/**
 * Deduplicates events based on specified fields
 * @param {Array} events - Array of event objects to deduplicate
 * @param {Array} fields - Fields to check for duplicates (default: name, venue.name, startDate)
 * @param {Boolean} includeVenue - Whether to include venue name in deduplication key
 * @returns {Array} - Deduplicated array of events
 */
function deduplicateEvents(events, fields = ['name', 'venue.name', 'startDate'], includeVenue = true) {
  if (!Array.isArray(events) || events.length === 0) {
    return events;
  }

  // Start performance timer
  const startTime = process.hrtime();
  const initialCount = events.length;
  
  // Track seen events with a Map for O(1) lookups instead of O(n)
  const seen = new Map();
  const result = [];
  
  // Helper function to get nested object properties using dot notation
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((prev, curr) => {
      return prev && prev[curr] !== undefined ? prev[curr] : null;
    }, obj);
  };

  // Process each event
  for (const event of events) {
    // Build a unique key for this event based on the specified fields
    const keyParts = fields.map(field => {
      const value = getNestedValue(event, field);
      
      // Handle dates correctly - convert to ISO string for consistent comparison
      if (value instanceof Date) {
        // For dates, we only care about the day, not the exact time
        return value.toISOString().split('T')[0];
      }
      
      // Convert all values to strings for consistent comparison
      return value !== null ? String(value).toLowerCase() : 'null';
    });
    
    const key = keyParts.join('|');
    
    // If we haven't seen this event before, add it to results
    if (!seen.has(key)) {
      seen.set(key, true);
      result.push(event);
    }
  }
  
  // Calculate performance metrics
  const [seconds, nanoseconds] = process.hrtime(startTime);
  const timeInMs = (seconds * 1000) + (nanoseconds / 1000000);
  const removalCount = initialCount - result.length;
  
  // Log results if any duplicates were found
  if (removalCount > 0) {
    console.log(`Deduplication: Removed ${removalCount} duplicate events (${removalCount / initialCount * 100}%) in ${timeInMs.toFixed(2)}ms`);
  }
  
  return result;
}

/**
 * Express middleware to deduplicate events in response
 * @param {Object} options - Configuration options
 * @returns {Function} - Express middleware function
 */
function deduplicationMiddleware(options = {}) {
  const defaultOptions = {
    fields: ['name', 'venue.name', 'startDate'],
    includeVenue: true,
    eventsPaths: ['events', 'data'] // Common response paths where events arrays are found
  };
  
  const config = { ...defaultOptions, ...options };
  
  return function(req, res, next) {
    // Store the original res.json function
    const originalJson = res.json;
    
    // Override the json method to intercept the response
    res.json = function(data) {
      // Only process if we have data
      if (data) {
        // Check for arrays at the configured paths
        for (const path of config.eventsPaths) {
          if (data[path] && Array.isArray(data[path])) {
            // Replace the events array with the deduplicated version
            data[path] = deduplicateEvents(
              data[path], 
              config.fields,
              config.includeVenue
            );
            
            // Update count if it exists
            if (data.count !== undefined) {
              data.count = data[path].length;
            }
            
            // Update pagination if it exists
            if (data.pagination && data.pagination.total !== undefined) {
              data.pagination.total = data[path].length;
              if (data.pagination.limit) {
                data.pagination.pages = Math.ceil(data[path].length / data.pagination.limit);
              }
            }
          }
        }
      }
      
      // Call the original json method with our modified data
      return originalJson.call(this, data);
    };
    
    next();
  };
}

module.exports = {
  deduplicateEvents,
  deduplicationMiddleware
};
