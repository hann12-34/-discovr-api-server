const puppeteer = require('puppeteer');
const slugify = require('slugify');

class CanadaPlaceEvents {
  constructor() {
    this.name = 'Canada Place Events';
    this.url = 'https://www.canadaplace.ca/events/';
    this.venue = {
      name: 'Canada Place',
      address: '999 Canada Pl, Vancouver, BC V6C 3T4',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2884, lng: -123.1114 }
    };
  }

  /**
   * Main scraping function
   * @returns {Array} List of events
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

      console.log('Extracting Canada Place events...');
      const events = await this.extractEvents(page);

      console.log(`Found ${events.length} events from ${this.name}`);
      return events;
    } catch (error) {
      console.error(`Error scraping ${this.name}:`, error.message);
      return [];
    } finally {
      await browser.close();
    }
  }

  /**
   * Extract events from the page
   * @param {Object} page - Puppeteer page object
   * @returns {Array} List of events
   */
  async extractEvents(page) {
    // Wait for event containers to load
    await page.waitForSelector('.event-item, .event-card, .event-listing', { timeout: 10000 })
      .catch(() => {
        console.log('Primary event selectors not found, trying alternative selectors');
      });

    // Extract events
    const events = await page.evaluate((venueInfo) => {
      // Try multiple selectors for event containers
      const selectors = [
        '.event-item', '.event-card', '.event-listing',
        '.events-list li', '.event-row', '.event-container',
        '[data-event]', '.post', '.entry'
      ];

      let eventElements = [];
      for (const selector of selectors) {
        eventElements = Array.from(document.querySelectorAll(selector));
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} events using selector: ${selector}`);
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
          let title = 'Canada Place Event';

          for (const selector of titleSelectors) {
            const titleElement = event.querySelector(selector);
            if (titleElement && titleElement.textContent.trim()) {
              title = titleElement.textContent.trim();
              break;
            }
          }

          // Extract date
          const dateSelectors = ['.date', '.event-date', 'time', '.datetime', '.calendar-date'];
          let dateText = '';

          for (const selector of dateSelectors) {
            const dateElement = event.querySelector(selector);
            if (dateElement) {
              // Check for datetime attribute first
              if (dateElement.getAttribute('datetime')) {
                dateText = dateElement.getAttribute('datetime');
                break;
              } else if (dateElement.textContent.trim()) {
                dateText = dateElement.textContent.trim();
                break;
              }
            }
          }

          // Extract description
          const descSelectors = ['.description', '.event-description', '.summary', '.excerpt', '.content'];
          let description = '';

          for (const selector of descSelectors) {
            const descElement = event.querySelector(selector);
            if (descElement && descElement.textContent.trim()) {
              description = descElement.textContent.trim();
              break;
            }
          }

          // Extract image
          let image = '';
          const imgElement = event.querySelector('img');
          if (imgElement && imgElement.src) {
            image = imgElement.src;
          }

          // Extract link
          let link = '';
          const linkElement = event.querySelector('a');
          if (linkElement && linkElement.href) {
            link = linkElement.href;
          }

          return {
            title,
            dateText,
            description,
            image,
            link,
            venue: venueInfo
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
        venue: this.venue,
        categories,
        sourceURL: event.link || this.url,
        lastUpdated: new Date()
      };
    }));
  }

  /**
   * Parse date strings into Date objects
   * @param {string} dateText - Raw date text
   * @returns {Object} Object with startDate and endDate
   */
  parseDates(dateText) {
    const currentYear = new Date().getFullYear();
    const now = new Date();
    
    // If no date text, return today's date
    if (!dateText) {
      const today = new Date();
      today.setHours(19, 0, 0, 0); // Default to 7 PM
      const endDate = new Date(today.getTime() + (3 * 60 * 60 * 1000)); // 3 hours later
      return { startDate: today, endDate };
    }

    try {
      // Clean up the date text
      const cleanDateText = dateText.toLowerCase().trim();

      // Look for date patterns with month names
      const datePattern = /(\w+\.?\s+\d{1,2}(?:st|nd|rd|th)?)(?:,?\s*(\d{4}))?/i;
      const match = dateText.match(datePattern);

      if (match) {
        const monthDay = match[1];
        const year = match[2] || currentYear;
        
        // Create date object
        const date = new Date(`${monthDay}, ${year}`);
        
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date');
        }

        // Set default time to 7 PM
        date.setHours(19, 0, 0, 0);
        const endDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));

        // Look for time information
        const timePattern = /(\d{1,2}(?::(\d{2}))?)\s*(am|pm)/i;
        const timeMatch = dateText.match(timePattern);

        if (timeMatch) {
          let hour = parseInt(timeMatch[1]);
          const minute = parseInt(timeMatch[2] || '0');
          const ampm = timeMatch[3].toLowerCase();

          if (ampm === 'pm' && hour !== 12) hour += 12;
          if (ampm === 'am' && hour === 12) hour = 0;

          date.setHours(hour, minute, 0, 0);
          endDate.setTime(date.getTime() + (3 * 60 * 60 * 1000));
        }

        return { startDate: date, endDate };
      }

      // If we can't parse the date, use today with default time
      const fallbackDate = new Date();
      fallbackDate.setHours(19, 0, 0, 0);
      const fallbackEndDate = new Date(fallbackDate.getTime() + (3 * 60 * 60 * 1000));
      
      return { startDate: fallbackDate, endDate: fallbackEndDate };
      
    } catch (error) {
      console.log(`Error parsing date '${dateText}': ${error.message}`);
      
      // Fallback to today's date
      const fallbackDate = new Date();
      fallbackDate.setHours(19, 0, 0, 0);
      const fallbackEndDate = new Date(fallbackDate.getTime() + (3 * 60 * 60 * 1000));
      
      return { startDate: fallbackDate, endDate: fallbackEndDate };
    }
  }

  /**
   * Determine event categories based on title
   * @param {string} title - Event title
   * @returns {Array} List of categories
   */
  determineCategories(title) {
    const categories = [];
    const lowercaseTitle = title.toLowerCase();

    // Cultural and Arts
    if (lowercaseTitle.includes('art') || lowercaseTitle.includes('exhibition') ||
        lowercaseTitle.includes('gallery') || lowercaseTitle.includes('culture')) {
      categories.push('Arts & Culture');
    }

    // Entertainment
    if (lowercaseTitle.includes('show') || lowercaseTitle.includes('performance') ||
        lowercaseTitle.includes('entertainment') || lowercaseTitle.includes('festival')) {
      categories.push('Entertainment');
    }

    // Holiday and Seasonal
    if (lowercaseTitle.includes('christmas') || lowercaseTitle.includes('holiday') ||
        lowercaseTitle.includes('seasonal') || lowercaseTitle.includes('celebration')) {
      categories.push('Holiday & Seasonal');
    }

    // Sports and Recreation
    if (lowercaseTitle.includes('sport') || lowercaseTitle.includes('recreation') ||
        lowercaseTitle.includes('fitness') || lowercaseTitle.includes('zumba')) {
      categories.push('Sports & Recreation');
    }

    // Community Events
    if (lowercaseTitle.includes('community') || lowercaseTitle.includes('public') ||
        lowercaseTitle.includes('family') || lowercaseTitle.includes('together')) {
      categories.push('Community');
    }

    // Default category if none found
    if (categories.length === 0) {
      categories.push('General');
    }

    return categories;
  }

  normalizeTitle(title) {
    if (!title) return '';

    // Convert to lowercase
    let normalized = title.toLowerCase();

    // Remove special characters and extra spaces
    normalized = normalized.replace(/[^a-z0-9 ]/g, ' ');

    // Replace multiple spaces with a single space
    normalized = normalized.replace(/\s+/g, ' ');

    // Trim any leading/trailing spaces
    normalized = normalized.trim();

    // Special case handling for known events with different naming formats
    if (normalized.includes('christmas') && normalized.includes('canada place')) {
      normalized = 'christmas at canada place';
    }

    if (normalized.includes('canada') && normalized.includes('together')) {
      normalized = 'canada together';
    }

    if (normalized.includes('port') && normalized.includes('day')) {
      normalized = 'port day';
    }

    if (normalized.includes('zumba')) {
      normalized = 'zumba at canada place';
    }

    return normalized;
  }
}

module.exports = CanadaPlaceEvents;

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new CanadaPlaceEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.CanadaPlaceEvents = CanadaPlaceEvents;