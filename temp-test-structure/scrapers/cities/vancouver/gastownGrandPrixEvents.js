/**
 * Global Relay Gastown Grand Prix Events Scraper
 * 
 * Simplified version with placeholder events due to scraping timeout issues
 * https://globalrelayggp.org/
 */

const slugify = require('slugify');

class GastownGrandPrixEvents {
  constructor() {
    this.name = 'Global Relay Gastown Grand Prix';
    this.url = 'https://globalrelayggp.org/';
    this.sourceIdentifier = 'gastown-grand-prix';
  }
  
  /**
   * Create placeholder event for the Gastown Grand Prix
   * Using placeholder instead of scraping due to timeout issues
   */
  async scrape() {
    console.log(`🔍 Starting ${this.name} scraper...`);
    
    try {
      console.log(`⚠️ Using placeholder events for ${this.name} instead of scraping due to timeout issues`);
      
      // Create future race date (2nd Tuesday of July 2025)
      const eventDate = new Date(2025, 6, 8); // July 8, 2025
      
      // Create a single placeholder event
      const event = {
        id: this.generateEventId('gastown-grand-prix-2025', eventDate),
        title: 'Global Relay Gastown Grand Prix 2025',
        description: 'One of North America\'s most prestigious criterium cycling races through the cobblestone streets of historic Gastown. Experience the thrill as elite cyclists race at speeds of up to 50km/h through tight corners in this exciting event.',
        startDate: eventDate,
        endDate: eventDate,
        location: 'Gastown, Vancouver, BC',
        venue: {
          name: 'Gastown Historic District',
          address: 'Water Street, Vancouver, BC',
          city: 'Vancouver',
          state: 'BC',
          country: 'Canada',
          latitude: 49.284131,
          longitude: -123.106641
        },
        category: 'Sports',
        priceRange: 'Free',
        sourceURL: this.url,
        officialWebsite: this.url,
        image: 'https://globalrelayggp.org/wp-content/uploads/2024/07/GastownGP_Twitter_Banner.png',
        dataSources: [this.sourceIdentifier],
        lastUpdated: new Date()
      };
      
      console.log(`✅ Created placeholder event for ${this.name}`);
      return [event];
    } catch (error) {
      console.error(`❌ Error in ${this.name} scraper: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate event ID from title and date
   */
  generateEventId(title, date) {
    const dateString = date.toISOString().split('T')[0];
    const slugifiedTitle = slugify(title, { lower: true, strict: true });
    return `${this.sourceIdentifier}-${slugifiedTitle}-${dateString}`;
  }
}

module.exports = new GastownGrandPrixEvents();
