/**
 * SCRAPER TEMPLATE WITH PROPER ADDRESS HANDLING
 * 
 * Copy this template when creating new scrapers to ensure
 * all events have proper location data.
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/filterEvents');
const { enrichEventWithVenueData } = require('../../utils/venueDatabase');

const VenueNameScraper = {
  async scrape(city) {
    console.log('🎭 Scraping events from [Venue Name]...');
    
    try {
      // TODO: Implement your scraping logic here
      const rawEvents = [
        {
          title: 'Example Event',
          date: '2025-10-15',
          // ... other fields
        }
      ];
      
      // Format events with ALL required fields
      const formattedEvents = rawEvents.map(event => ({
        id: uuidv4(),
        title: event.title,
        description: event.description || `${event.title} at [Venue Name]`,
        date: event.date,  // ⭐ CRITICAL: Always include date in YYYY-MM-DD format
        url: event.url || 'https://venue-website.com',
        
        // 🏢 VENUE INFO - Required
        venue: {
          name: '[Venue Name]',
          city: city || 'Vancouver'
        },
        
        // 📍 LOCATION - Add as much as you can scrape
        streetAddress: '123 Main St',  // ⭐ Try to scrape this from venue website
        location: '123 Main St, Vancouver',  // Full address string
        
        // 🗺️ COORDINATES - Add if available (MongoDB format: [longitude, latitude])
        latitude: 49.2827,   // ⭐ Best practice: Look up venue coordinates
        longitude: -123.1207,
        
        // 📱 OTHER FIELDS
        city: city || 'Vancouver',
        category: 'Music',  // or 'Theater', 'Sports', etc.
        source: '[Venue Name]',
        
        // Optional fields
        price: event.price || null,
        image: event.image || null
      }));
      
      // ⭐ IMPORTANT: Enrich events with venue database
      // This adds addresses for known venues automatically
      const enrichedEvents = formattedEvents.map(event => 
        enrichEventWithVenueData(event)
      );
      
      enrichedEvents.forEach(e => {
        console.log(`✓ ${e.title} | ${e.date || 'NO DATE'} | ${e.streetAddress || 'NO ADDRESS'}`);
      });
      
      console.log(`\n✅ Found ${enrichedEvents.length} [Venue Name] events`);
      return filterEvents(enrichedEvents);
      
    } catch (error) {
      console.error(`❌ Error scraping [Venue Name]:`, error.message);
      return [];
    }
  }
};

module.exports = VenueNameScraper;

/**
 * ⭐ BEST PRACTICES:
 * 
 * 1. ALWAYS include 'date' field in YYYY-MM-DD format
 * 2. Add 'streetAddress' if you can scrape it
 * 3. Add 'latitude' and 'longitude' if known
 * 4. Use enrichEventWithVenueData() to auto-add addresses for known venues
 * 5. Test your scraper: node -e "require('./yourScraper').scrape('Vancouver').then(console.log)"
 * 
 * ⭐ HOW TO FIND COORDINATES:
 * 
 * 1. Google Maps: Search venue → Right-click → "What's here?" → Copy coordinates
 * 2. OpenStreetMap: nominatim.openstreetmap.org
 * 3. Add to utils/venueDatabase.js for reuse across scrapers
 */
