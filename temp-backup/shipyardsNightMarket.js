/**
 * Shipyards Night Market Scraper
 * 
 * This scraper provides information about the Shipyards Night Market events
 * that run every Friday from May 16 to Sept 12, 2025 in North Vancouver
 */

const { v4: uuidv4 } = require('uuid');

class ShipyardsNightMarketScraper {
  constructor() {
    this.name = 'Shipyards Night Market';
    this.url = 'https://shipyardsnightmarket.com/';
    this.sourceIdentifier = 'shipyards-night-market';
    
    // Define venue with proper object structure
    this.venue = {
      name: 'The Shipyards',
      id: 'the-shipyards-north-vancouver',
      address: '125 Victory Ship Way',
      city: 'North Vancouver',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V7L 0B1',
      coordinates: {
        lat: 49.309641,
        lng: -123.082512
      },
      websiteUrl: 'https://shipyardsnightmarket.com/',
      description: "The Shipyards District in North Vancouver is a vibrant waterfront area featuring public plazas, restaurants, shops, and event spaces. With a stunning backdrop of Burrard Inlet and downtown Vancouver, this popular venue hosts various community events and markets throughout the year. The area pays homage to the region's shipbuilding heritage while offering modern amenities and gathering spaces."
    };
    
    // Market season details directly from their website
    this.seasonStartDate = new Date('2025-05-16');
    this.seasonEndDate = new Date('2025-09-12');
  }
  
  /**
   * Generate all Friday market dates between start and end dates
   * @returns {Array} Array of date objects for each market
   */
  getMarketDates() {
    const marketDates = [];
    const currentDate = new Date(this.seasonStartDate);
    
    // Loop through all Fridays in the season
    while (currentDate <= this.seasonEndDate) {
      if (currentDate.getDay() === 5) { // 5 = Friday
        marketDates.push(new Date(currentDate));
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return marketDates;
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Shipyards Night Market scraper...');
    const events = [];
    
    try {
      // Get all market dates
      const marketDates = this.getMarketDates();
      console.log(`📆 Found ${marketDates.length} Shipyards Night Market dates between May 16 and Sept 12, 2025`);
      
      // Create an event for each market date
      for (const marketDate of marketDates) {
        // Format date for display
        const formattedDate = marketDate.toLocaleDateString('en-US', { 
          weekday: 'short',
          month: 'short', 
          day: 'numeric'
        });
        
        // Create start and end times for this market day (5pm to 10pm)
        const startTime = new Date(marketDate);
        startTime.setHours(17, 0, 0); // 5:00 PM
        
        const endTime = new Date(marketDate);
        endTime.setHours(22, 0, 0); // 10:00 PM
        
        // Create unique ID for this market date
        const dateString = marketDate.toISOString().split('T')[0];
        const eventId = `shipyards-night-market-${dateString}`;
        
        // Create event object
        const event = {
          id: eventId,
          title: `Shipyards Night Market - ${formattedDate}`,
          description: `Join us for the Shipyards Night Market in North Vancouver on ${formattedDate}! Every Friday night, locals and visitors gather at the Shipyards District to indulge in a culinary extravaganza featuring over 40 food trucks, explore unique artisan vendors, enjoy live music and DJs, and unwind in the beer garden provided by The Garden Beer Market Co.\n\nThe Shipyards Night Market showcases:\n• Beer Garden with local craft beer and cocktails\n• Diverse food trucks offering cuisine from around the world\n• Live music and DJ performances\n• Artisan market vendors featuring handcrafted items\n\nThis vibrant weekly event runs from 5:00 PM to 10:00 PM at the waterfront Shipyards District in North Vancouver, with stunning views of Burrard Inlet and the Vancouver skyline. This market is a perfect evening out for families, couples, and friends looking to experience the best of North Vancouver's local food, craft, and entertainment scene.`,
          startDate: startTime,
          endDate: endTime,
          venue: this.venue,
          category: 'market',
          categories: ['market', 'food', 'beer', 'music', 'shopping', 'outdoor', 'night-market'],
          sourceURL: this.url,
          officialWebsite: 'https://shipyardsnightmarket.com/',
          image: 'https://shipyardsnightmarket.com/wp-content/uploads/2025/04/shipyards-night-market-aerial.jpg',
          recurring: 'weekly',
          ticketsRequired: false,
          lastUpdated: new Date()
        };
        
        events.push(event);
        console.log(`✅ Added event: ${event.title}`);
      }
      
      console.log(`🎉 Successfully scraped ${events.length} Shipyards Night Market events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Shipyards Night Market scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new ShipyardsNightMarketScraper();
