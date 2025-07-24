/**
 * Junction Public Market Scraper
 * 
 * This scraper provides information about the Junction Public Market's
 * operating schedule at 200 Granville St.
 */

const { v4: uuidv4 } = require('uuid');

class JunctionPublicMarketScraper {
  constructor() {
    this.name = 'Junction Public Market';
    this.url = 'https://junctionpublicmarket.com/';
    this.sourceIdentifier = 'junction-public-market';
    
    // Define venue with proper object structure
    this.venue = {
      name: 'Junction Public Market',
      id: 'junction-public-market',
      address: '200 Granville St',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V6C 1S4',
      coordinates: {
        lat: 49.285805,
        lng: -123.112538
      },
      websiteUrl: 'https://junctionpublicmarket.com/',
      description: "Junction Public Market is Vancouver's unique container market located beside Waterfront Station. This innovative outdoor marketplace features a curated selection of food vendors, craft beverages, shopping, and live entertainment all housed in repurposed shipping containers. The market offers spectacular views of the North Shore mountains and Burrard Inlet, creating a vibrant gathering space for locals and tourists alike."
    };
  }
  
  /**
   * Main scraper function - does not generate any events as there are no specific
   * confirmed events published on the website. Only returns an empty array.
   * 
   * Per the market website, the general operating hours are:
   * SUMMER MARKET: MAY 1 – SEPTEMBER 28, 2025
   * VENDORS – TUESDAY TO SUNDAY | 10:00 am – 6:00 pm
   * LICENSED PATIO – TUESDAY TO SUNDAY | 11:00 am – 7:00 pm
   * 
   * But we don't generate fictional events from this information.
   */
  async scrape() {
    console.log('🔍 Starting Junction Public Market scraper...');
    console.log('ℹ️ Junction Public Market is open Tuesday to Sunday, but no specific events are available from their website.');
    console.log('ℹ️ Operating hours: Vendors 10:00 AM - 6:00 PM, Licensed Patio 11:00 AM - 7:00 PM');
    console.log('✅ Junction Public Market scraper completed - no events to return');
    
    // Return empty array as we don't have specific events to add
    return [];
  }
}

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new JunctionPublicMarketScraper();
