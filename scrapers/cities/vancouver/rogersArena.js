/**
 * Rogers Arena Events Scraper
 *
 * This scraper provides information about events at Rogers Arena in Vancouver
 * Source: https://rogersarena.com/event/
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const cheerio = require('cheerio');

class RogersArenaScraper {
  constructor() {
    this.name = 'Rogers Arena';
    this.url = 'https://rogersarena.com/event/';
    this.sourceIdentifier = 'rogers-arena';

    // Define venue with proper object structure
    this.venue = {
      name: 'Rogers Arena',
      id: 'rogers-arena-vancouver',
      address: '800 Griffiths Way',
      city: city,
      state: 'BC',
      country: 'Canada',
      postalCode: 'V6B 6G1',
      coordinates: {
        lat: 49.2778358,
        lng: -123.1088227
      },
      websiteUrl: 'https://rogersarena.com/',
      description: "Rogers Arena is a multi-purpose indoor arena located in downtown Vancouver. Home to the NHL's Vancouver Canucks, the arena also hosts major concerts and entertainment events throughout the year. With a seating capacity of over 18,000, Rogers Arena is one of the premier entertainment venues in Western Canada."
    };
  }

  /**
   * Main scraper function
   */
  async scrape(city) {
    console.log('🔍 Starting Rogers Arena events scraper...');
    const events = [];

    try {
      // Fetch event data from the website
      const response = await axios.get(this.url);
      const $ = cheerio.load(response.data);

      // Select all event containers
      $('-item, -listing').each((i, element) => {
        try {
          // Extract event details (adjust selectors based on actual website structure)
          const title = $(element).find('-title, h3').text().trim();
          const dateText = $(element).find('-date, .date').text().trim();
          const eventUrl = $(element).find('a').attr('href');
          const imageUrl = $(element).find('img').attr('src');

          // Parse the date (adjust based on actual date format)
          let startDate, endDate;

          try {
            // Example date parsing assuming format like "Jul 26, 2025"
            const dateMatch = dateText.match(/([A-Za-z]+)\s+(\d+),\s+(\d{4}/);
            if (dateMatch) {
              const month = dateMatch[1];
              const day = parseInt(dateMatch[2]);
              const year = parseInt(dateMatch[3]);

              const months = {
                'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
              };

              startDate = new Date(year, months[month], day);
              // Default event time to 7:30 PM if not specified
              startDate.setHours(19, 30, 0);

              endDate = new Date(startDate);
              // Default event duration to 3 hours if not specified
              endDate.setHours(endDate.getHours() + 3);
            }
          } catch (dateError) {
            console.error(`⚠️ Error parsing date for event "${title}": ${dateError.message}`);

            startDate = new Date();
            startDate.setDate(startDate.getDate() + 30);
            endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + 3);
          }

          // Create unique ID for this event
          const eventId = uuidv4();
          const slugifiedTitle = title.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');

          // Determine categories based on title keywords
          const categories = ['concert', 'entertainment'];

          if (title.toLowerCase().includes('hockey') ||
              title.toLowerCase().includes('canucks') ||
              title.toLowerCase().includes('nhl')) {
            categories.push('sports');
            categories.push('hockey');
          } else {
            categories.push('music');
          }

          // Create event object
          const event = {
            id: `rogers-arena-${slugifiedTitle}-${eventId.substring(0, 8)}`,
            title: title,
            description: `${title} at Rogers Arena. This event takes place at Vancouver's premier indoor arena with a capacity of over 18,000. Located in downtown Vancouver, Rogers Arena hosts major concerts and sporting events throughout the year. Visit the official website for more details and ticket information.`,
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
      };

      console.log(`🎉 Successfully scraped ${events.length} Rogers Arena events`);
      return events;

    } catch (error) {
      console.error(`❌ Error in Rogers Arena scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new RogersArenaScraper();

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new RogersArenaScraper();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.RogersArenaScraper = RogersArenaScraper;