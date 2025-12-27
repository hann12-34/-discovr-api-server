/**
 * SCRAPER TEMPLATE WITH PROPER ADDRESS & IMAGE HANDLING
 * 
 * Copy this template when creating new scrapers to ensure
 * all events have proper location data and images.
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const cheerio = require('cheerio');
const { filterEvents } = require('../../utils/filterEvents');
const { enrichEventWithVenueData } = require('../../utils/venueDatabase');
const { extractImageFromCheerio } = require('./utils/imageExtractor');

const VenueNameScraper = {
  async scrape(city) {
    console.log('🎭 Scraping events from [Venue Name]...');
    
    try {
      const response = await axios.get('https://venue-website.com/events', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 15000
      });
      
      const $ = cheerio.load(response.data);
      const rawEvents = [];
      
      // ⭐ SCRAPE EVENTS WITH IMAGES
      $('.event-item, article').each((i, el) => {
        const $el = $(el);
        
        // Get title
        const title = $el.find('h2, h3, .title').first().text().trim();
        
        // Get date
        const dateText = $el.find('.date, time').first().text().trim();
        
        // Get URL
        const url = $el.find('a').first().attr('href');
        
        // 🖼️ GET IMAGE - Try multiple methods
        let imageUrl = null;
        
        // Method 1: Direct img tag
        const img = $el.find('img:not([src*="logo"]):not([alt*="logo"])').first();
        if (img.length) {
          imageUrl = img.attr('src') || img.attr('data-src');
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = 'https://venue-website.com' + imageUrl;
          }
        }
        
        // Method 2: Use utility function
        if (!imageUrl) {
          imageUrl = extractImageFromCheerio($el, 'https://venue-website.com');
        }
        
        if (title) {
          rawEvents.push({ title, date: dateText, url, imageUrl });
        }
      });
      
      // Format events with ALL required fields
      const formattedEvents = rawEvents.map(event => ({
        id: uuidv4(),
        title: event.title,
        description: event.description || `${event.title} at [Venue Name]`,
        date: event.date,  // ⭐ CRITICAL: Always include date in YYYY-MM-DD format
        url: event.url || 'https://venue-website.com',
        
        // 🖼️ IMAGE - Always try to include
        imageUrl: event.imageUrl || null,
        
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
        price: event.price || null
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
 * 2. ALWAYS try to extract 'imageUrl' from event page
 * 3. Add 'streetAddress' if you can scrape it
 * 4. Add 'latitude' and 'longitude' if known
 * 5. Use enrichEventWithVenueData() to auto-add addresses for known venues
 * 6. Test your scraper: node -e "require('./yourScraper').scrape('Vancouver').then(console.log)"
 * 
 * ⭐ IMAGE EXTRACTION TIPS:
 * 
 * 1. Look for img tags: $el.find('img').attr('src')
 * 2. Check data-src for lazy-loaded images
 * 3. Look for background-image in style attributes
 * 4. Use extractImageFromCheerio() utility for complex cases
 * 5. For Puppeteer, use page.evaluate() to find images in DOM
 * 6. Always filter out logos/icons: img:not([src*="logo"])
 * 
 * ⭐ HOW TO FIND COORDINATES:
 * 
 * 1. Google Maps: Search venue → Right-click → "What's here?" → Copy coordinates
 * 2. OpenStreetMap: nominatim.openstreetmap.org
 * 3. Add to utils/venueDatabase.js for reuse across scrapers
 */
