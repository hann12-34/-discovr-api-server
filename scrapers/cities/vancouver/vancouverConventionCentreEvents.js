const puppeteer = require('puppeteer');
const slugify = require('slugify');

class VancouverConventionCentreEvents {
  constructor() {
    this.name = 'Vancouver Convention Centre Events';
    this.url = 'https://www.vancouverconventioncentre.com/events';
    this.venue = {
      name: 'Vancouver Convention Centre',
      address: '1055 Canada Pl, Vancouver, BC V6C 0C3',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2887, lng: -123.1119 }
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

      console.log('Extracting Vancouver Convention Centre events...');
      const events = await this.extractEvents(page);
      console.log(`Found ${events.length} Vancouver Convention Centre events`);

      return events;
    } catch (error) {
      console.error(`Error scraping Vancouver Convention Centre events: ${error.message}`);
      return [];
    } finally {
      await browser.close();
    }
  }

  /**
   * Extract events from Vancouver Convention Centre website
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<Array>} - Array of event objects
   */
  async extractEvents(page) {
    // Wait for event containers to load
    await page.waitForSelector('.event-item, .event-card, .conference, .meeting', { timeout: 10000 })
      .catch(() => {
        console.log('Primary event selectors not found, trying alternative selectors');
      });

    // Extract events
    const events = await page.evaluate((venueInfo) => {
      // Try multiple potential selectors for event containers
      const eventSelectors = [
        '.event-item',
        '.event-card',
        '.conference',
        '.meeting',
        '.event',
        '[class*="event"]',
        '[class*="conference"]',
        '[class*="meeting"]'
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
          // Extract title
          let title = '';
          const titleSelectors = ['h1', 'h2', 'h3', '.title', '.event-title', '.name', '[class*="title"]'];
          for (const selector of titleSelectors) {
            const titleElement = event.querySelector(selector);
            if (titleElement && titleElement.textContent.trim()) {
              title = titleElement.textContent.trim();
              break;
            }
          }

          // If no title found, try data attributes or generate one
          if (!title) {
            title = event.getAttribute('data-title') || event.getAttribute('title') || `Vancouver Convention Centre Event ${index + 1}`;
          }

          // Extract date/time information
          let dateText = '';
          const dateSelectors = ['.date', '.event-date', '.time', '.event-time', '.when', '[class*="date"]', '[class*="time"]'];
          for (const selector of dateSelectors) {
            const dateElement = event.querySelector(selector);
            if (dateElement && dateElement.textContent.trim()) {
              dateText = dateElement.textContent.trim();
              break;
            }
          }

          // Extract description
          let description = '';
          const descSelectors = ['.description', '.event-description', '.summary', '.excerpt', 'p', '[class*="description"]'];
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

      return {
        id: uniqueId,
        title: event.title,
        description: event.description,
        startDate,
        endDate,
        image: event.image,
        venue: this.venue,
        categories: this.determineCategories(event.title),
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
      // Default to today
      return {
        startDate: new Date(),
        endDate: new Date()
      };
    }

    // Look for date ranges like "June 5 - August 25, 2025"
    const dateRangePattern = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2})(?:,?\s*(\d{4}))?/i;
    const rangeMatch = dateText.match(dateRangePattern);

    if (rangeMatch) {
      const startMonth = rangeMatch[1];
      const endMonth = rangeMatch[2];
      const year = rangeMatch[3] || new Date().getFullYear();

      const startDate = new Date(`${startMonth}, ${year}`);
      const endDate = new Date(`${endMonth}, ${year}`);

      return {
        startDate: isNaN(startDate.getTime()) ? new Date() : startDate,
        endDate: isNaN(endDate.getTime()) ? new Date() : endDate
      };
    }

    // Look for long exhibition format like "May 12, 2023 – January 28, 2024"
    const longExhibitionPattern = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s*\d{4})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s*\d{4})/i;
    const longExhibitionMatch = dateText.match(longExhibitionPattern);

    if (longExhibitionMatch) {
      const startDate = new Date(longExhibitionMatch[1]);
      const endDate = new Date(longExhibitionMatch[2]);

      return {
        startDate: isNaN(startDate.getTime()) ? new Date() : startDate,
        endDate: isNaN(endDate.getTime()) ? new Date() : endDate
      };
    }

    // Look for month/day/year format (common in North America)
    const mdyPattern = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/;
    const mdyMatch = dateText.match(mdyPattern);

    if (mdyMatch) {
      const month = parseInt(mdyMatch[1]) - 1; // JavaScript months are 0-indexed
      const day = parseInt(mdyMatch[2]);
      let year = parseInt(mdyMatch[3]);

      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }

      const date = new Date(year, month, day);
      return {
        startDate: isNaN(date.getTime()) ? new Date() : date,
        endDate: isNaN(date.getTime()) ? new Date() : date
      };
    }

    // Look for date patterns with month names
    const monthPattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (\d{1,2})(?:st|nd|rd|th)?(?:,? (\d{4}))?/i;
    const monthMatch = dateText.match(monthPattern);

    if (monthMatch) {
      const monthMap = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };

      const monthStr = monthMatch[1].toLowerCase().substring(0, 3);
      const day = parseInt(monthMatch[2]);
      const year = monthMatch[3] ? parseInt(monthMatch[3]) : new Date().getFullYear();

      if (monthMap.hasOwnProperty(monthStr)) {
        const date = new Date(year, monthMap[monthStr], day);

        // Look for time information
        const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i;
        const timeMatch = dateText.match(timePattern);

        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          const ampm = timeMatch[3].toLowerCase();

          if (ampm === 'pm' && hours !== 12) hours += 12;
          if (ampm === 'am' && hours === 12) hours = 0;

          date.setHours(hours, minutes, 0, 0);
        }

        return {
          startDate: isNaN(date.getTime()) ? new Date() : date,
          endDate: isNaN(date.getTime()) ? new Date() : date
        };
      }
    }

    // Default fallback
    return {
      startDate: new Date(),
      endDate: new Date()
    };
  }

  /**
   * Determine event categories based on title and content
   * @param {string} title - Event title
   * @returns {Array} - Array of category strings
   */
  determineCategories(title) {
    const categories = ['Conference', 'Event'];
    const lowercaseTitle = title.toLowerCase();

    // Conference types
    if (lowercaseTitle.includes('conference') || lowercaseTitle.includes('convention')) {
      categories.push('Business');
    }

    // Entertainment/Performance
    if (lowercaseTitle.includes('performance') || lowercaseTitle.includes('symphony') ||
        lowercaseTitle.includes('concert') || lowercaseTitle.includes('music')) {
      categories.push('Entertainment');
      categories.push('Performance');
    }

    // Educational
    if (lowercaseTitle.includes('lecture') || lowercaseTitle.includes('seminar') ||
        lowercaseTitle.includes('workshop') || lowercaseTitle.includes('education')) {
      categories.push('Educational');
    }

    // Exhibition
    if (lowercaseTitle.includes('exhibition') || lowercaseTitle.includes('showcase') ||
        lowercaseTitle.includes('expo') || lowercaseTitle.includes('fair')) {
      categories.push('Exhibition');
    }

    // Community
    if (lowercaseTitle.includes('community') || lowercaseTitle.includes('festival') ||
        lowercaseTitle.includes('celebration')) {
      categories.push('Community');
      categories.push('Festival');
    }

    // Technology
    if (lowercaseTitle.includes('tech') || lowercaseTitle.includes('technology') ||
        lowercaseTitle.includes('machine learning') || lowercaseTitle.includes('ai') ||
        lowercaseTitle.includes('digital')) {
      categories.push('Technology');
    }

    // Science
    if (lowercaseTitle.includes('science') || lowercaseTitle.includes('research') ||
        lowercaseTitle.includes('academic')) {
      categories.push('Science');
    }

    // Health
    if (lowercaseTitle.includes('health') || lowercaseTitle.includes('medical') ||
        lowercaseTitle.includes('wellness')) {
      categories.push('Health');
    }

    // Food and Drink
    if (lowercaseTitle.includes('food') || lowercaseTitle.includes('culinary') ||
        lowercaseTitle.includes('wine') || lowercaseTitle.includes('tasting')) {
      categories.push('Food and Drink');
    }

    return categories;
  }

  /**
   * Normalize a title for comparison (to avoid duplicates with slight variations)
   * @param {string} title - Raw title
   * @returns {string} Normalized title
   */
  normalizeTitle(title) {
    if (!title) return '';

    // Convert to lowercase
    let normalized = title.toLowerCase();

    // Remove special characters and extra spaces
    normalized = normalized.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

    // Remove common words that don't add meaning
    const commonWords = ['the', 'and', 'at', 'in', 'on', 'of', 'for', 'a', 'an', 'with'];
    let words = normalized.split(' ');
    words = words.filter(word => !commonWords.includes(word));

    return words.join(' ');
  }
}

module.exports = VancouverConventionCentreEvents;

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new VancouverConventionCentreEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.VancouverConventionCentreEvents = VancouverConventionCentreEvents;