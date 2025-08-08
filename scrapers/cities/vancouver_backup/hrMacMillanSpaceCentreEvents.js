const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * H.R. MacMillan Space Centre Events Scraper
 * Scrapes events from H.R. MacMillan Space Centre website
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class HRMacMillanSpaceCentreEvents {
  constructor() {
    this.name = 'H.R. MacMillan Space Centre Events';
    this.url = 'https://www.spacecentre.ca/events/';
    this.venue = {
      name: 'H.R. MacMillan Space Centre',
      address: '1100 Chestnut St, Vancouver, BC V6J 3J9',
      city: getCityFromArgs(),
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2760, lng: -123.1444 }
    };
  }

  /**
   * Scrape events from H.R. MacMillan Space Centre
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

      console.log('Extracting H.R. MacMillan Space Centre events...');
      const events = await this.extractEvents(page);
      console.log(`Found ${events.length} H.R. MacMillan Space Centre events`);
      
      return events;
    } catch (error) {
      console.error(`Error in ${this.name} scraper:`, error);
      return [];
    } finally {
      await browser.close();
      console.log(`${this.name} scraper finished`);
    }
  }

  /**
   * Extract events from H.R. MacMillan Space Centre website
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<Array>} - Array of event objects
   */
  async extractEvents(page) {
    // Wait for event containers to load
    await page.waitForSelector('.event-item, .event-card, .events-list-item', { timeout: 10000 })
      .catch(() => {
        console.log('Primary event selectors not found, trying alternative selectors');
      });

    // Extract events
    const events = await page.evaluate((venueInfo) => {
      // Try multiple potential selectors for event containers
      const eventSelectors = [
        '.event-item', 
        '.event-card', 
        '.events-list-item',
        '.event',
        '.program-item',
        '.exhibition',
        'article.event'
      ];
      
      // Find which selector works on this page
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
          let title = 'Space Centre Event';
          
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
      
      return {
        id: uniqueId,
        title: event.title,
        description: event.description,
        startDate,
        endDate,
        image: event.image,
        venue: this.venue,
        categories: ['Science', 'Education', 'Family', 'Space', 'Museum'],
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
      // Default to current date if no date text is available
      const today = new Date();
      return { startDate: today, endDate: today };
    }

    try {
      // Try ISO format first (for datetime attributes)
      if (dateText.match(/^\d{4}-\d{2}-\d{2}T/)) {
        const date = new Date(dateText);
        if (!isNaN(date.getTime())) {
          return { startDate: date, endDate: date };
        }
      }
      
      // Look for month/day/year format (common in North America)
      const mdyPattern = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/;
      const mdyMatch = dateText.match(mdyPattern);
      
      if (mdyMatch) {
        let month = parseInt(mdyMatch[1]) - 1; // JavaScript months are 0-indexed
        const day = parseInt(mdyMatch[2]);
        let year = parseInt(mdyMatch[3]);
        
        // Handle 2-digit years
        if (year < 100) {
          year = year < 50 ? 2000 + year : 1900 + year;
        }
        
        const date = new Date(year, month, day);
        
        // Space Centre events are typically during daytime hours
        date.setHours(11, 0); // Default to 11:00 AM
        
        // Typical exhibit duration is 1-2 hours
        const endDate = new Date(date.getTime() + (2 * 60 * 60 * 1000));
        
        return { startDate: date, endDate };
      }
      
      // Look for date patterns with month names
      const monthPattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (\d{1,2})(?:st|nd|rd|th)?(?:,? (\d{4}))?/i;
      const monthMatch = dateText.match(monthPattern);
      
      if (monthMatch) {
        const monthStr = monthMatch[1].toLowerCase();
        const day = parseInt(monthMatch[2]);
        const year = monthMatch[3] ? parseInt(monthMatch[3]) : new Date().getFullYear();
        
        const monthMap = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };
        
        const date = new Date(year, monthMap[monthStr], day);
        
        // Look for time information
        const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i;
        const timeMatch = dateText.match(timePattern);
        
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          const isPM = timeMatch[3].toLowerCase() === 'pm';
          
          if (isPM && hours < 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
          
          date.setHours(hours, minutes);
        } else {
          // Default to daytime for space centre events
          date.setHours(11, 0);
        }
        
        // Typical duration is 1-2 hours
        const endDate = new Date(date.getTime() + (2 * 60 * 60 * 1000));
        
        return { startDate: date, endDate };
      }
      
      // Try direct parsing as a fallback
      const date = new Date(dateText);
      if (!isNaN(date.getTime())) {
        const endDate = new Date(date.getTime() + (2 * 60 * 60 * 1000));
        return { startDate: date, endDate };
      }
      
      // If all else fails, use current date
      const today = new Date();
      today.setHours(11, 0); // Default to 11:00 AM
      const endDate = new Date(today.getTime() + (2 * 60 * 60 * 1000));
      return { startDate: today, endDate };
    } catch (error) {
      console.error('Error parsing dates:', error);
      const today = new Date();
      today.setHours(11, 0);
      const endDate = new Date(today.getTime() + (2 * 60 * 60 * 1000));
      return { startDate: today, endDate };
    }
  }
}

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new HRMacMillanSpaceCentreEvents();
