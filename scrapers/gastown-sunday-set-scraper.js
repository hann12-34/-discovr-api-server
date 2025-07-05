/**
 * Gastown Sunday Set Scraper
 * 
 * This scraper creates events for the Gastown Sunday Set series
 * which runs every Sunday from June 15 to August 31, 2025
 * https://gastown.org/sundayset/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

// Define the venue details with proper object structure
const venue = {
  name: 'Gastown',
  id: 'gastown',
  address: 'Water Street (Richards to Columbia)',
  city: 'Vancouver',
  state: 'BC',
  country: 'Canada',
  postalCode: 'V6B',
  coordinates: {
    lat: 49.2839,
    lng: -123.1089
  },
  websiteUrl: 'https://gastown.org/sundayset/'
};

// Source identifier for the scraper system
const sourceIdentifier = 'gastown-sunday-set';

/**
 * Generate dates for each Sunday between start and end dates
 */
function generateSundayDates(startDate, endDate) {
  const sundays = [];
  const currentDate = new Date(startDate);
  
  // Adjust to the next Sunday if not already a Sunday
  const dayOfWeek = currentDate.getDay();
  if (dayOfWeek !== 0) { // 0 is Sunday in JavaScript
    currentDate.setDate(currentDate.getDate() + (7 - dayOfWeek));
  }
  
  // Add all Sundays until the end date
  while (currentDate <= endDate) {
    sundays.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  return sundays;
}

/**
 * Main scraper function for Gastown Sunday Set
 */
async function scrapeGastownSundaySet() {
  console.log('🔍 Starting Gastown Sunday Set scraper...');
  const events = [];
  
  try {
    // Fetch the main page to get any updated information
    const { data } = await axios.get('https://gastown.org/sundayset/');
    const $ = cheerio.load(data);
    
    // Start date: June 15, 2025 (adjust year as needed)
    const startDate = new Date(2025, 5, 15); // Month is 0-indexed (5 = June)
    
    // End date: August 31, 2025
    const endDate = new Date(2025, 7, 31); // 7 = August
    
    // Generate all event dates (every Sunday)
    const eventDates = generateSundayDates(startDate, endDate);
    console.log(`📅 Generated ${eventDates.length} Sunday dates for events`);
    
    // Create an event for each Sunday
    for (const date of eventDates) {
      const formattedDate = date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric' 
      });
      
      // Check if there's a special event title for this date
      let title = `Gastown Sunday Set - ${formattedDate}`;
      let description = 'A car-free series featuring a weekly setlist of music, food, art, shopping, and movement.';
      let imageUrl = 'https://gastown.org/wp-content/uploads/2025/05/GastownSundaySet-Banner.jpg';
      
      // Extract more specific information if available on the page
      const specificDateMention = $(`a:contains("${formattedDate}")`);
      if (specificDateMention.length > 0) {
        const eventLink = specificDateMention.attr('href');
        if (eventLink) {
          // Add specific event link to description
          description += ` More details: ${eventLink}`;
        }
      }
      
      // Create the event with proper venue object format
      const event = {
        id: `gastown-sunday-set-${date.toISOString().split('T')[0]}`,
        title: title,
        description: description,
        startDate: new Date(date.setHours(10, 0, 0)), // 10:00 AM start
        endDate: new Date(date.setHours(18, 0, 0)),   // 6:00 PM end
        venue: venue, // Using venue object, not string
        category: 'community',
        categories: ['community', 'music', 'art', 'food', 'shopping'],
        sourceURL: 'https://gastown.org/sundayset/',
        officialWebsite: 'https://gastown.org/sundayset/',
        image: imageUrl,
        recurring: 'weekly',
        lastUpdated: new Date()
      };
      
      events.push(event);
      console.log(`✅ Created event: ${event.title}`);
    }
    
    console.log(`🎉 Successfully generated ${events.length} events for Gastown Sunday Set`);
    return events;
    
  } catch (error) {
    console.error(`❌ Error in Gastown Sunday Set scraper: ${error.message}`);
    return events;
  }
}

module.exports = {
  scrape: scrapeGastownSundaySet,
  sourceIdentifier,
  name: 'Gastown Sunday Set'
};
