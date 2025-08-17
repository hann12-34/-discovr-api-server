const puppeteer = require('puppeteer');
const slugify = require('slugify');

class FortuneSoundClubEvents {
  constructor() {
    this.name = 'Fortune Sound Club Events';
    this.url = 'https://www.fortunesoundclub.com/events';
    this.baseUrl = 'https://www.fortunesoundclub.com';
    this.venue = {
      name: 'Fortune Sound Club',
      address: '147 E Pender St, Vancouver, BC V6A 1T6',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2811, lng: -123.0999 }
    };
  }

  /**
   * Main scraping method
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape(city) {
    console.log(`Starting ${this.name} scraper...`);
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Set default timeout
    await page.setDefaultNavigationTimeout(30000);

    try {
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2' });

      console.log('Extracting Fortune Sound Club events...');
      const events = await this.extractEvents(page);
      console.log(`Found ${events.length} Fortune Sound Club events`);

      return events;
    } catch (error) {
      console.error(`Error scraping Fortune Sound Club events: ${error.message}`);
      return [];
    } finally {
      await browser.close();
    }
  }

  /**
   * Extract events from Fortune Sound Club website
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<Array>} - Array of event objects
   */
  async extractEvents(page) {
    // Wait for event containers to load
    await page.waitForSelector('a[href*="event"], .event-item, .event-card, .show', { timeout: 10000 })
      .catch(() => {
        console.log('Primary event selectors not found, trying alternative selectors');
      });

    // Extract events
    const events = await page.evaluate((venueInfo, baseUrl) => {
      // Try multiple potential selectors for event containers
      const eventSelectors = [
        'a[href*="event"]',
        'a[href*="ticketweb"]',
        '.event-item',
        '.event-card',
        '.show',
        '.event',
        '[class*="event"]',
        '[class*="show"]'
      ];

      let eventElements = [];

      // Try each selector until we find events
      for (const selector of eventSelectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} events using selector: ${selector}`);
          break;
        }
      }

      // If no events found with standard selectors, try to extract from any structured content
      if (eventElements.length === 0) {
        eventElements = document.querySelectorAll('article, .content-item, .listing-item, .card');
        console.log(`Trying fallback selectors, found ${eventElements.length} potential events`);
      }

      return Array.from(eventElements).map((event, index) => {
        try {
          // Extract title, date, link directly in page.evaluate
          const link = event.getAttribute('href') || '';
          if (!link) return null;
          
          const eventUrl = link.startsWith('http') ? link : `${baseUrl}${link}`;
          let title = '';
          
          if (eventUrl.includes('ticketweb.ca/event/')) {
            const ticketWebPath = new URL(eventUrl).pathname;
            const pathParts = ticketWebPath.split('/');
            if (pathParts.length >= 3) {
              const eventPart = pathParts[2];
              if (eventPart.toLowerCase().includes('fortune-sound-club')) {
                const artistPart = eventPart.split('-fortune-sound-club')[0];
                title = artistPart.replace(/-/g, ' ').trim();
                title = title.replace(/\b\w/g, l => l.toUpperCase());
              } else {
                title = eventPart.replace(/-/g, ' ').trim();
                title = title.replace(/\b\w/g, l => l.toUpperCase());
              }
            }
          } else {
            const pathParts = link.split('/');
            const slug = pathParts[pathParts.length - 1];
            title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }
          
          if (!title || title.length < 2) return null;
          
          return {
            title,
            dateText: new Date().toISOString(),
            description: `Event at Fortune Sound Club`,
            image: '',
            link: eventUrl
          };
        } catch (error) {
          console.log(`Error processing event: ${error.message}`);
          return null;
        }
      }).filter(Boolean);
    }, this.venue, this.baseUrl);

    // Process dates and create final event objects
    return Promise.all(events.map(async event => {
      const { startDate, endDate } = this.parseDates(event.dateText);

      // Generate a unique ID based on title and date
      const uniqueId = slugify(`${event.title}-${startDate.toISOString().split('T')[0]}`, {
        lower: true,
        strict: true
      });

      return {
        id: uniqueId,
        title: event.title,
        description: event.description,
        startDate,
        endDate,
        image: event.image,
        venue: this.venue,
        categories: ['Music', 'Nightlife', 'Entertainment', 'Live Performance'],
        sourceURL: event.link || this.url,
        lastUpdated: new Date()
      };
    }));
  }

  /**
   * Parse dates from text
   * @param {string} dateText - Text containing date information
   * @returns {Object} - Object with startDate and endDate
   */
  parseDates(dateText) {
    if (!dateText) {
      return {
        startDate: new Date(),
        endDate: new Date()
      };
    }

    const date = new Date(dateText);
    
    if (!isNaN(date.getTime())) {
      return {
        startDate: date,
        endDate: date
      };
    }

    // Default fallback
    return {
      startDate: new Date(),
      endDate: new Date()
    };
  }
}

module.exports = FortuneSoundClubEvents;

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new FortuneSoundClubEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.FortuneSoundClubEvents = FortuneSoundClubEvents;

// Removed the extra code at the end