/**
 * Extract All Events Script
 * 
 * This script extracts all events from the cloud API by making multiple paginated requests
 * and saves them to a JSON file for local use in the app.
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Cloud API URL
const API_URL = 'https://discovr-api-test-531591199325.northamerica-northeast2.run.app/api/v1/venues/events/all';

// Headers to force HTTP/1.1
const headers = {
  'X-Disable-HTTP3': '1.1',
  'X-Force-HTTP-Version': '1.1'
};

// Collection to store all unique events
const allEvents = new Map();

/**
 * Fetch events with different pagination parameters
 */
async function fetchEvents(page = 1, limit = 32) {
  try {
    console.log(`📥 Fetching page ${page} with limit ${limit}...`);
    
    const response = await axios.get(API_URL, {
      params: { page, limit },
      headers
    });
    
    if (response.status === 200) {
      const events = response.data;
      
      if (Array.isArray(events)) {
        console.log(`✅ Received ${events.length} events from page ${page}`);
        return events;
      } else {
        console.error('❌ Response is not an array:', typeof events);
        return [];
      }
    } else {
      console.error(`❌ Error: Received status ${response.status}`);
      return [];
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return [];
  }
}

/**
 * Try to extract all events using different pagination approaches
 */
async function extractAllEvents() {
  try {
    console.log('🚀 Starting event extraction from cloud API...');
    
    // Try different pagination strategies
    const strategies = [
      { name: 'Standard Pagination', fn: standardPagination },
      { name: 'Offset Strategy', fn: offsetStrategy },
      { name: 'Date-based Pagination', fn: datePagination }
    ];
    
    for (const strategy of strategies) {
      console.log(`\n🧪 Trying strategy: ${strategy.name}`);
      await strategy.fn();
    }
    
    // Convert Map to array and remove duplicates
    const uniqueEvents = Array.from(allEvents.values());
    
    console.log(`\n📊 Final result: ${uniqueEvents.length} unique events collected`);
    
    // Save all events to file
    const outputPath = path.join(__dirname, 'all-events.json');
    await fs.writeFile(outputPath, JSON.stringify(uniqueEvents, null, 2));
    
    console.log(`\n💾 Saved all ${uniqueEvents.length} events to ${outputPath}`);
    console.log('Use this file to integrate all events into your app!');
    
    return uniqueEvents;
  } catch (error) {
    console.error('❌ Failed to extract all events:', error.message);
    return [];
  }
}

/**
 * Try standard pagination with page and limit parameters
 */
async function standardPagination() {
  const maxPages = 10;
  const pageSize = 32;
  let eventsFound = 0;
  
  for (let page = 1; page <= maxPages; page++) {
    const events = await fetchEvents(page, pageSize);
    
    // Add unique events to our collection
    events.forEach(event => {
      // Use event ID as key to avoid duplicates
      const eventKey = event._id || event.id;
      if (!allEvents.has(eventKey)) {
        allEvents.set(eventKey, event);
        eventsFound++;
      }
    });
    
    // If we get fewer events than the page size, we've reached the end
    if (events.length < pageSize) break;
  }
  
  console.log(`✅ Standard pagination complete. Found ${eventsFound} events.`);
}

/**
 * Try offset-based pagination
 */
async function offsetStrategy() {
  const pageSize = 32;
  const maxOffset = 200;
  let eventsFound = 0;
  
  for (let offset = 0; offset <= maxOffset; offset += pageSize) {
    try {
      console.log(`📥 Fetching with offset ${offset} and limit ${pageSize}...`);
      
      const response = await axios.get(API_URL, {
        params: { offset, limit: pageSize },
        headers
      });
      
      if (response.status === 200) {
        const events = response.data;
        
        if (Array.isArray(events)) {
          console.log(`✅ Received ${events.length} events with offset ${offset}`);
          
          // Add unique events to our collection
          events.forEach(event => {
            const eventKey = event._id || event.id;
            if (!allEvents.has(eventKey)) {
              allEvents.set(eventKey, event);
              eventsFound++;
            }
          });
          
          // If we get fewer events than the page size, we've reached the end
          if (events.length < pageSize) break;
        }
      }
    } catch (error) {
      console.log(`❌ Offset strategy failed for offset ${offset}:`, error.message);
      break;
    }
  }
  
  console.log(`✅ Offset strategy complete. Found ${eventsFound} events.`);
}

/**
 * Try date-based pagination by fetching events for different date ranges
 */
async function datePagination() {
  const eventsFound = 0;
  const months = [
    { month: 1, days: 31 }, // January
    { month: 2, days: 29 }, // February (leap year 2024)
    { month: 3, days: 31 }, // March
    { month: 4, days: 30 }, // April
    { month: 5, days: 31 }, // May
    { month: 6, days: 30 }, // June
    { month: 7, days: 31 }, // July
    { month: 8, days: 31 }, // August
    { month: 9, days: 30 }, // September
    { month: 10, days: 31 }, // October
    { month: 11, days: 30 }, // November
    { month: 12, days: 31 }  // December
  ];
  
  // Try fetching events by month
  for (const { month, days } of months) {
    try {
      console.log(`📥 Fetching events for month ${month}...`);
      
      const dateFrom = `2025-${month.toString().padStart(2, '0')}-01`;
      const dateTo = `2025-${month.toString().padStart(2, '0')}-${days}`;
      
      const response = await axios.get(API_URL, {
        params: { dateFrom, dateTo },
        headers
      });
      
      if (response.status === 200) {
        const events = response.data;
        
        if (Array.isArray(events)) {
          console.log(`✅ Received ${events.length} events for month ${month}`);
          
          // Add unique events to our collection
          events.forEach(event => {
            const eventKey = event._id || event.id;
            if (!allEvents.has(eventKey)) {
              allEvents.set(eventKey, event);
            }
          });
        }
      }
    } catch (error) {
      console.log(`❌ Date strategy failed for month ${month}:`, error.message);
    }
  }
  
  console.log(`✅ Date pagination complete. Total events: ${allEvents.size}`);
}

// Run the extraction
extractAllEvents();
