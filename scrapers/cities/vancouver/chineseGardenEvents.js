/**
 * Vancouver Chinese Garden Events Scraper
 * Extracts events from Dr. Sun Yat-Sen Classical Chinese Garden
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class ChineseGardenEvents {
  constructor() {
    this.name = 'Vancouver Chinese Garden Events';
    this.url = 'https://vancouverchinesegarden.com/';
    this.baseUrl = 'https://vancouverchinesegarden.com';
    this.venue = {
      name: 'Dr. Sun Yat-Sen Classical Chinese Garden',
      address: '578 Carrall St, Vancouver, BC V6B 5K2',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2796, lng: -123.1044 }
    };
  }

  /**
   * Main scraping method
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
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

      console.log('Extracting Chinese Garden events...');
      const events = await this.extractEvents(page);
      console.log(`Found ${events.length} Chinese Garden events`);

      return events;
    } catch (error) {
      console.error(`Error scraping Chinese Garden events: ${error.message}`);
      return [];
    } finally {
      await browser.close();
    }
  }

  /**
   * Extract events from Chinese Garden website
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<Array>} - Array of event objects
   */
  async extractEvents(page) {
    // Wait for event containers to load
    await page.waitForSelector('.event, .program, .activity, .workshop, article', { timeout: 10000 })
      .catch(() => {
        console.log('Primary event selectors not found, trying alternative selectors');
      });

    // Extract events
    const events = await page.evaluate((venueInfo, baseUrl) => {
      // Try multiple potential selectors for event containers
      const eventSelectors = [
        '.event',
        '.program',
        '.activity',
        '.workshop',
        'article',
        '.event-item',
        '.program-item',
        '[class*="event"]',
        '[class*="program"]',
        '[class*="activity"]'
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
        eventElements = document.querySelectorAll('div, section');
        console.log(`Trying fallback selectors, found ${eventElements.length} potential events`);
      }

      return Array.from(eventElements).map((event, index) => {
        try {
          // Extract title
          const titleElement = event.querySelector('h1, h2, h3, h4, .title, .event-title, .program-title') || event;
          const title = titleElement.textContent?.trim();
          
          // Extract date information
          const dateElement = event.querySelector('.date, .event-date, .program-date, time, [datetime]');
          const dateText = dateElement?.textContent?.trim() || dateElement?.getAttribute('datetime') || '';
          
          // Extract description
          const descElement = event.querySelector('p, .description, .event-description, .program-description, .details');
          const description = descElement?.textContent?.trim();
          
          // Extract image
          const imgElement = event.querySelector('img');
          const image = imgElement?.src || imgElement?.getAttribute('data-src') || '';
          
          // Extract link
          const linkElement = event.querySelector('a') || event.closest('a');
          const link = linkElement?.href || '';
          
          if (!title || title.length < 3) return null;
          
          return {
            title,
            dateText,
            description,
            image,
            link: link.startsWith('http') ? link : `${baseUrl}${link}`
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
        categories: ['Arts & Culture', 'Education', 'Garden', 'Chinese Culture'],
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

module.exports = ChineseGardenEvents;

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new ChineseGardenEvents();
  return await scraper.scrape('Vancouver');
};
