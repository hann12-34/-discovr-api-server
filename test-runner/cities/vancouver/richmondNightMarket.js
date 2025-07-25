/**
 * Richmond Night Market Scraper
 * 
 * This scraper generates events for the Richmond Night Market 2025 season
 * running from April 25 to October 13, 2025
 */

const { v4: uuidv4 } = require('uuid');

class RichmondNightMarketScraper {
  constructor() {
    this.name = 'Richmond Night Market';
    this.url = 'https://richmondnightmarket.com/';
    this.sourceIdentifier = 'richmond-night-market';
    
    // Define venue with proper object structure
    this.venue = {
      name: 'Richmond Night Market',
      id: 'richmond-night-market',
      address: '8351 River Rd',
      city: 'Richmond',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V6X 1Y4',
      coordinates: {
        lat: 49.1959,
        lng: -123.1290
      },
      websiteUrl: 'https://richmondnightmarket.com/',
      description: 'The Richmond Night Market is the largest night market in North America. With over 500+ international food options and 100+ retail stalls, it attracts millions of visitors every year, offering authentic Asian street food, local goods, and live entertainment.'
    };
    
    // Market season dates
    this.seasonStart = new Date('2025-04-25');
    this.seasonEnd = new Date('2025-10-13');
    
    // Market description
    this.description = "Richmond Night Market 2025: A Summer of Love Like No Other! Celebrating its 25th anniversary, the 2025 season features over 500 international food options, 100+ retail stalls, nightly entertainment, and a brand-new zipline soaring 600 feet above the market. This year also introduces season-long happy hour specials with food items under $10 and drinks for $7. The Richmond Night Market is a food festival, cultural experience, playground for kids, and shopper's paradise all in one.";
    
    // Special features for 2025
    this.specialFeatures = [
      "World's First Night Market Zipline",
      "Season-Long Happy Hour Specials",
      "After Party Discount",
      "Giant Bouncy Castles",
      "Nightly Cultural Performances",
      "Carnival Games & Attractions"
    ];
    
    // Image URL
    this.imageUrl = "https://richmondnightmarket.com/images/night-market-2025.jpg";
  }

  /**
   * Generate a unique ID based on date
   * @param {Date} date - Event date
   * @returns {string} - Formatted ID
   */
  generateEventId(date) {
    const datePart = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    return `richmond-night-market-${datePart}`;
  }
  
  /**
   * Determine if a date is a Friday, Saturday, or Sunday
   * @param {Date} date - The date to check
   * @returns {boolean} - True if weekend day
   */
  isWeekendDay(date) {
    const day = date.getDay();
    return day === 5 || day === 6 || day === 0; // 5 = Friday, 6 = Saturday, 0 = Sunday
  }
  
  /**
   * Check if a date is a Canadian holiday Monday
   * This is a simplified approximation for 2025
   * @param {Date} date - The date to check
   * @returns {boolean} - True if holiday Monday
   */
  isHolidayMonday(date) {
    if (date.getDay() !== 1) return false; // Not a Monday
    
    // Array of 2025 Canadian holiday Mondays in ISO format YYYY-MM-DD
    const holidayMondays2025 = [
      '2025-05-19', // Victoria Day
      '2025-07-01', // Canada Day (observed)
      '2025-08-04', // BC Day
      '2025-09-01', // Labour Day
      '2025-10-13'  // Thanksgiving
    ];
    
    const dateStr = date.toISOString().split('T')[0];
    return holidayMondays2025.includes(dateStr);
  }
  
  /**
   * Get operating hours for a specific date
   * @param {Date} date - The date to check
   * @returns {Object} - Start and end hours
   */
  getOperatingHours(date) {
    const day = date.getDay();
    const isFridaySaturdayHolidaySunday = (day === 5 || day === 6 || 
      (day === 0 && this.isHolidayMonday(new Date(date.getTime() + 24 * 60 * 60 * 1000))));
    
    // Create date objects for start and end times
    const startDate = new Date(date);
    startDate.setHours(19, 0, 0); // 7:00 PM
    
    const endDate = new Date(date);
    if (isFridaySaturdayHolidaySunday) {
      endDate.setHours(24, 0, 0); // Midnight for Fri, Sat, and holiday Sundays
    } else {
      endDate.setHours(23, 0, 0); // 11:00 PM for regular Sundays and holiday Mondays
    }
    
    return {
      startDate,
      endDate
    };
  }
  
  /**
   * Generate all event dates for the season
   * @returns {Array<Date>} - Array of market dates
   */
  generateMarketDates() {
    const dates = [];
    const currentDate = new Date(this.seasonStart);
    
    while (currentDate <= this.seasonEnd) {
      const day = currentDate.getDay();
      
      // Include if it's Friday, Saturday, Sunday or a holiday Monday
      if (this.isWeekendDay(currentDate) || this.isHolidayMonday(currentDate)) {
        dates.push(new Date(currentDate));
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }

  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Richmond Night Market events scraper...');
    const events = [];
    
    try {
      // Generate all market dates
      const marketDates = this.generateMarketDates();
      
      // Create an event for each date
      for (const date of marketDates) {
        try {
          const { startDate, endDate } = this.getOperatingHours(date);
          const dateFormatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
          
          // Generate a more specific title for each day
          const title = `Richmond Night Market - ${dayName}, ${dateFormatted}`;
          
          // Create event object
          const event = {
            id: this.generateEventId(date),
            title: title,
            description: this.description,
            startDate: startDate,
            endDate: endDate,
            venue: this.venue,
            category: 'festival',
            categories: ['festival', 'food', 'shopping', 'nightlife'],
            sourceURL: this.url,
            officialWebsite: this.url,
            image: this.imageUrl,
            recurring: 'weekly',
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`✅ Added event: ${title} on ${startDate.toLocaleDateString()}`);
          
        } catch (error) {
          console.error(`Error processing date ${date.toLocaleDateString()}: ${error.message}`);
        }
      }
      
      console.log(`🎉 Successfully scraped ${events.length} Richmond Night Market events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Richmond Night Market scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new RichmondNightMarketScraper();
