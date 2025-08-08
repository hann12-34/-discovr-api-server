const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * Chan Centre for the Performing Arts Scraper
 * 
 * This scraper provides information about events at Chan Centre at UBC
 * Source: https://chancentre.com/events/
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const cheerio = require('cheerio');

class ChanCentreScraper {
  constructor() {
    this.name = 'Chan Centre for the Performing Arts';
    this.url = 'https://chancentre.com/events/';
    this.sourceIdentifier = 'chan-centre';
    
    // Define venue with proper object structure
    this.venue = {
      name: 'Chan Centre for the Performing Arts',
      id: 'chan-centre-ubc',
      address: '6265 Crescent Road',
      city: getCityFromArgs(),
      state: 'BC',
      country: 'Canada',
      postalCode: 'V6T 1Z1',
      coordinates: {
        lat: 49.2696364,
        lng: -123.2565408
      },
      websiteUrl: 'https://chancentre.com/',
      description: "The Chan Centre for the Performing Arts at the University of British Columbia is a world-class venue renowned for its exceptional acoustics and intimate atmosphere. This state-of-the-art performance facility hosts a diverse array of concerts, lectures, and artistic performances throughout the year, featuring both internationally acclaimed artists and emerging talents from various musical genres and performing arts disciplines."
    };
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Chan Centre events scraper...');
    const events = [];
    
    try {
      // Fetch event data from the website
      const response = await axios.get(this.url);
      const $ = cheerio.load(response.data);
      
      // Select all event containers
      $('.event-listing, .event-card, article').each((i, element) => {
        try {
          // Extract event details (adjust selectors based on actual website structure)
          const title = $(element).find('h2, .title, .event-title').text().trim();
          const dateText = $(element).find('.date, .event-date').text().trim();
          const eventUrl = $(element).find('a').attr('href');
          const imageUrl = $(element).find('img').attr('src');
          const description = $(element).find('.excerpt, .description, .event-description').text().trim();
          
          // Skip if no title found
          if (!title) {
            return;
          }
          
          // Parse the date (adjust based on actual date format)
          let startDate, endDate;
          
          try {
            // Example date parsing assuming format like "September 28, 2025"
            const dateMatch = dateText.match(/([A-Za-z]+)\s+(\d+)(?:,|\s+)?\s*(\d{4})?/);
            if (dateMatch) {
              const month = dateMatch[1];
              const day = parseInt(dateMatch[2]);
              // If year isn't in the date text, assume next occurrence
              const year = dateMatch[3] ? parseInt(dateMatch[3]) : new Date().getFullYear();
              
              const months = {
                'January': 0, 'February': 1, 'March': 2, 'April': 3,
                'May': 4, 'June': 5, 'July': 6, 'August': 7,
                'September': 8, 'October': 9, 'November': 10, 'December': 11,
                'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
              };
              
              startDate = new Date(year, months[month], day);
              // Default event time to 7:30 PM if not specified
              startDate.setHours(19, 30, 0);
              
              endDate = new Date(startDate);
              // Default event duration to 2.5 hours if not specified
              endDate.setHours(endDate.getHours() + 2, endDate.getMinutes() + 30);
            }
          } catch (dateError) {
            console.error(`⚠️ Error parsing date for event "${title}": ${dateError.message}`);
            // Use fallback date if parsing fails
            startDate = new Date();
            startDate.setDate(startDate.getDate() + 30); // Fallback to 30 days from now
            endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + 2, endDate.getMinutes() + 30);
          }
          
          // Create unique ID for this event
          const eventId = uuidv4();
          const slugifiedTitle = title.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
          
          // Determine categories based on title keywords
          const categories = ['performance', 'arts'];
          
          if (title.toLowerCase().includes('music') || 
              title.toLowerCase().includes('concert') || 
              title.toLowerCase().includes('orchestra') || 
              title.toLowerCase().includes('symphony')) {
            categories.push('music');
            categories.push('concert');
          }
          
          if (title.toLowerCase().includes('jazz')) {
            categories.push('jazz');
          }
          
          if (title.toLowerCase().includes('dance')) {
            categories.push('dance');
          }
          
          if (title.toLowerCase().includes('theatre') || 
              title.toLowerCase().includes('theater') || 
              title.toLowerCase().includes('drama')) {
            categories.push('theatre');
          }
          
          if (title.toLowerCase().includes('lecture') || 
              title.toLowerCase().includes('talk')) {
            categories.push('lecture');
          }
          
          // Create event object
          const event = {
            id: `chan-centre-${slugifiedTitle}-${eventId.substring(0, 8)}`,
            title: title,
            description: description || `${title} at the Chan Centre for the Performing Arts. Located at UBC, the Chan Centre is renowned for its exceptional acoustics and intimate setting, making it the perfect venue for this performance. Visit the official website for more details and ticket information.`,
            startDate: startDate,
            endDate: endDate,
            venue: this.venue,
            category: categories[0],
            categories: categories,
            sourceURL: this.url,
            officialWebsite: eventUrl || this.url,
            image: imageUrl || null,
            ticketsRequired: true,
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`✅ Added event: ${event.title}`);
        } catch (eventError) {
          console.error(`❌ Error extracting event details: ${eventError.message}`);
        }
      });
      
      console.log(`🎉 Successfully scraped ${events.length} Chan Centre events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Chan Centre scraper: ${error.message}`);
      return events;
    }
  }
}

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new ChanCentreScraper();
