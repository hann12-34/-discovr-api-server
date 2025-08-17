const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Rogers Arena Events Improved Scraper
 * Scrapes events from Rogers Arena (Vancouver)
 */
class RogersArenaEventsImproved {
  constructor() {
    this.name = 'Rogers Arena Events Improved';
    this.url = 'https://www.rogersarena.com/events-tickets';
    this.venue = {
      name: 'Rogers Arena',
      address: '800 Griffiths Way, Vancouver, BC V6B 6G1',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2778, lng: -123.1088 }
    };
  }

  /**
   * Main scraping method
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

    try {
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2' });

      console.log('Extracting Rogers Arena Improved events...');
      const events = await this.extractEvents(page);

      console.log(`Found ${events.length} Rogers Arena Improved events`);
      return events;

    } catch (error) {
      console.error(`Error in ${this.name} scraper:`, error.message);
      return [];
    } finally {
      await browser.close();
      console.log(`${this.name} scraper finished`);
    }
  }

  /**
   * Extract events from the page
   */
  async extractEvents(page) {
    // Wait for event containers to load
    await page.waitForSelector('.event-item, .card, .event-listing', { timeout: 10000 })
      .catch(() => {
        console.log('Primary event selectors not found, trying alternative selectors');
      });

    // Extract events
    const events = await page.evaluate((venueInfo) => {
      // Try multiple potential selectors for event containers
      const eventSelectors = [
        '.event-item',
        '.card',
        '.event-listing',
        '.event-card',
        '.item',
        '.show-item'
      ];

      let eventElements = [];
      for (const selector of eventSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements && elements.length > 0) {
          eventElements = Array.from(elements);
          break;
        }
      }

      if (eventElements.length === 0) {
        console.log('No event elements found with any selector');
        return [];
      }

      return eventElements.map(event => {
        try {
          // Extract title
          const titleSelectors = ['h2', 'h3', '.title', '.event-title', '.name'];
          let title = 'Rogers Arena Event';

          for (const selector of titleSelectors) {
            const titleElement = event.querySelector(selector);
            if (titleElement && titleElement.textContent.trim()) {
              title = titleElement.textContent.trim();
              break;
            }
          }

          // Extract date
          const dateSelectors = ['.date', '.event-date', '.when', '.datetime', '.time'];
          let dateText = '';

          for (const selector of dateSelectors) {
            const dateElement = event.querySelector(selector);
            if (dateElement && dateElement.textContent.trim()) {
              dateText = dateElement.textContent.trim();
              break;
            }
          }

          // Extract description
          const descSelectors = ['.description', '.details', '.summary', '.info', 'p'];
          let description = '';

          for (const selector of descSelectors) {
            const descElement = event.querySelector(selector);
            if (descElement && descElement.textContent.trim()) {
              description = descElement.textContent.trim();
              break;
            }
          }

          // Extract image
          const imgSelectors = ['img', '.image img', '.photo img'];
          let image = '';

          for (const selector of imgSelectors) {
            const imgElement = event.querySelector(selector);
            if (imgElement && imgElement.src) {
              image = imgElement.src;
              break;
            }
          }

          // Extract link
          const linkSelectors = ['a', '.link', '.event-link'];
          let link = '';

          for (const selector of linkSelectors) {
            const linkElement = event.querySelector(selector);
            if (linkElement && linkElement.href) {
              link = linkElement.href;
              break;
            }
          }

          // Update venue with passed info
          const updatedVenue = {
            ...venueInfo,
            city: 'Vancouver'
          };

          return {
            title,
            dateText,
            description,
            image,
            link,
            venue: updatedVenue
          };
        } catch (error) {
          console.log(`Error processing event: ${error.message}`);
          return null;
        }
      }).filter(Boolean); // Remove any null entries
    }, this.venue);

    // Process dates and create final event objects
    return Promise.all(events.map(async event => {
      const { startDate, endDate } = this.parseDates(event.dateText);

      // Generate a unique ID based on title and date
      const uniqueId = slugify(`${event.title}-${startDate.toISOString().split('T')[0]}`, {
        lower: true,
        strict: true
      });

      // Determine categories based on title
      const categories = this.determineCategories(event.title);

      return {
        id: uniqueId,
        title: event.title,
        description: event.description,
        startDate,
        endDate,
        image: event.image,
        venue: event.venue,
        categories,
        sourceURL: event.link || this.url,
        lastUpdated: new Date()
      };
    }));
  }

  /**
   * Determine categories based on event title
   */
  determineCategories(title) {
    const lowerTitle = title.toLowerCase();

    // Default category is Entertainment
    const categories = ['Entertainment'];

    // Check for buy now or ticket buttons that slipped through filtering
    if (lowerTitle === 'buy now' || lowerTitle === 'buy tickets' || lowerTitle === 'tickets') {
      return ['Invalid'];
    }

    if (lowerTitle.includes('concert') ||
        lowerTitle.includes('music') ||
        lowerTitle.includes('band') ||
        lowerTitle.includes('tour') ||
        lowerTitle.includes('live') ||
        lowerTitle.includes('singer')) {
      categories.push('Music');
      categories.push('Concert');
    }

    if (lowerTitle.includes('hockey') ||
        lowerTitle.includes('canucks') ||
        lowerTitle.includes('nhl')) {
      categories.push('Sports');
      categories.push('Hockey');
    }

    if (lowerTitle.includes('basketball') ||
        lowerTitle.includes('wnba') ||
        lowerTitle.includes('nba')) {
      categories.push('Sports');
      categories.push('Basketball');
    }

    if (lowerTitle.includes('comedy') ||
        lowerTitle.includes('comedian')) {
      categories.push('Comedy');
    }

    if (lowerTitle.includes('family') ||
        lowerTitle.includes('kids') ||
        lowerTitle.includes('children')) {
      categories.push('Family');
    }

    return categories;
  }

  /**
   * Parse dates from text
   * @param {string} dateText - Text containing date information
   * @returns {Object} - Object with startDate and endDate
   */
  parseDates(dateText) {
    if (!dateText || dateText === 'Date TBA') {
      // For TBA dates, set to a future date (6 months ahead) to avoid immediate expiration
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);
      return { startDate: futureDate, endDate: new Date(futureDate.getTime() + 3 * 60 * 60 * 1000) };
    }

    try {
      // Rogers Arena typically uses format like "August 4 @ 7:30 pm"
      // First, look for this specific format
      const arenaPattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (\d{1,2})\s*@\s*(\d{1,2}(?::(\d{2}))?)\s*(am|pm)/i;
      const arenaMatch = dateText.match(arenaPattern);

      if (arenaMatch) {
        const monthStr = arenaMatch[1].toLowerCase();
        const day = parseInt(arenaMatch[2]);
        const year = new Date().getFullYear(); // Use current year as it's not in the pattern

        let hours = parseInt(arenaMatch[3]);
        const minutes = arenaMatch[4] ? parseInt(arenaMatch[4]) : 0;
        const isPM = arenaMatch[5].toLowerCase() === 'pm';

        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;

        const monthMap = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };

        const startDate = new Date(year, monthMap[monthStr], day, hours, minutes);

        // Events typically last 3 hours
        const endDate = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));

        return { startDate, endDate };
      }

      // Look for variations of the Rogers Arena format
      const monthDayAtTimePattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (\d{1,2}).*?(\d{1,2}(?::(\d{2}))?)\s*(am|pm)/i;
      const mdatMatch = dateText.match(monthDayAtTimePattern);

      if (mdatMatch) {
        const monthStr = mdatMatch[1].toLowerCase();
        const day = parseInt(mdatMatch[2]);
        const year = new Date().getFullYear(); // Use current year as it's not in the pattern

        let hours = parseInt(mdatMatch[3]);
        const minutes = mdatMatch[4] ? parseInt(mdatMatch[4]) : 0;
        const isPM = mdatMatch[5].toLowerCase() === 'pm';

        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;

        const monthMap = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };

        const startDate = new Date(year, monthMap[monthStr], day, hours, minutes);

        // Events typically last 3 hours
        const endDate = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));

        return { startDate, endDate };
      }

      // Look for just month and day without time
      const monthDayPattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (\d{1,2}(?:st|nd|rd|th)?)(?:,? (\d{4}))?/i;
      const monthDayMatch = dateText.match(monthDayPattern);

      if (monthDayMatch) {
        const monthStr = monthDayMatch[1].toLowerCase();
        const day = parseInt(monthDayMatch[2]);
        const year = monthDayMatch[3] ? parseInt(monthDayMatch[3]) : new Date().getFullYear();

        const monthMap = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };

        // Default arena events to 7:00 PM
        const startDate = new Date(year, monthMap[monthStr], day, 19, 0);

        // Events typically last 3 hours
        const endDate = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));

        return { startDate, endDate };
      }

      // If all else fails, use current date
      console.log(`Could not parse date: ${dateText}`);
      const today = new Date();
      const endDate = new Date(today.getTime() + (3 * 60 * 60 * 1000));
      return { startDate: today, endDate };
    } catch (error) {
      console.error('Error parsing dates:', error);
      const today = new Date();
      const endDate = new Date(today.getTime() + (3 * 60 * 60 * 1000));
      return { startDate: today, endDate };
    }
  }
}

module.exports = RogersArenaEventsImproved;

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new RogersArenaEventsImproved();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.RogersArenaEventsImproved = RogersArenaEventsImproved;