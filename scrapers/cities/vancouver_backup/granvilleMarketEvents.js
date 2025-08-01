/**
 * Granville Market Events Scraper
 * Scrapes events from Granville Island Public Market's website
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class GranvilleMarketEvents {
  constructor() {
    this.name = 'Granville Island Public Market Events';
    this.url = 'https://granvilleisland.com/events-calendar';
    this.venue = {
      name: 'Granville Island Public Market',
      address: '1689 Johnston St, Vancouver, BC V6H 3R9',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2711, lng: -123.1347 }
    };
  }

  /**
   * Scrape events from Granville Island Public Market
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

      console.log('Extracting Granville Market events...');
      const events = await this.extractEvents(page);
      console.log(`Found ${events.length} Granville Market events`);
      
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
   * Extract events from Granville Market website
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<Array>} - Array of event objects
   */
  async extractEvents(page) {
    // Wait for event containers to load
    await page.waitForSelector('.event-item, .event-listing, .calendar-item', { timeout: 10000 })
      .catch(() => {
        console.log('Primary event selectors not found, trying alternative selectors');
      });

    // Extract events
    const events = await page.evaluate((venueInfo) => {
      // Try multiple potential selectors for event containers
      const eventSelectors = [
        '.event-item', 
        '.event-listing', 
        '.calendar-item',
        '.views-row',
        'article.event',
        '.event-teaser'
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
          const titleSelectors = ['.title', 'h2', 'h3', '.event-title', '.calendar-title'];
          let title = 'Granville Market Event';
          
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
          const descSelectors = ['.description', '.event-description', '.summary', '.body', '.content'];
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
        categories: ['Market', 'Food & Drink', 'Shopping', 'Arts & Culture'],
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
      
      // Look for date patterns with month names
      const datePattern = /(\w+ \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?)\s*(?:to|-|–)?\s*(\w+ \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?)?/i;
      const match = dateText.match(datePattern);
      
      if (match) {
        const currentYear = new Date().getFullYear();
        let startDateText = match[1];
        
        // Add year if not present
        if (!startDateText.match(/\d{4}/)) {
          startDateText = `${startDateText}, ${currentYear}`;
        }
        
        let startDate = new Date(startDateText);
        let endDate;
        
        // If there's an end date in the string
        if (match[2]) {
          let endDateText = match[2];
          if (!endDateText.match(/\d{4}/)) {
            endDateText = `${endDateText}, ${currentYear}`;
          }
          endDate = new Date(endDateText);
        } else {
          endDate = new Date(startDate);
        }
        
        // Look for time information
        const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i;
        const timeMatches = dateText.match(new RegExp(timePattern, 'gi'));
        
        if (timeMatches && timeMatches.length >= 1) {
          const startTimeMatch = timeMatches[0].match(timePattern);
          if (startTimeMatch) {
            let hours = parseInt(startTimeMatch[1]);
            const minutes = startTimeMatch[2] ? parseInt(startTimeMatch[2]) : 0;
            const isPM = startTimeMatch[3].toLowerCase() === 'pm';
            
            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
            
            startDate.setHours(hours, minutes);
          }
          
          if (timeMatches.length >= 2) {
            const endTimeMatch = timeMatches[1].match(timePattern);
            if (endTimeMatch) {
              let hours = parseInt(endTimeMatch[1]);
              const minutes = endTimeMatch[2] ? parseInt(endTimeMatch[2]) : 0;
              const isPM = endTimeMatch[3].toLowerCase() === 'pm';
              
              if (isPM && hours < 12) hours += 12;
              if (!isPM && hours === 12) hours = 0;
              
              endDate.setHours(hours, minutes);
            }
          }
        }
        
        return { startDate, endDate };
      }
      
      // Try direct parsing as a fallback
      const date = new Date(dateText);
      if (!isNaN(date.getTime())) {
        return { startDate: date, endDate: date };
      }
      
      // If all else fails, use current date
      const today = new Date();
      return { startDate: today, endDate: today };
    } catch (error) {
      console.error('Error parsing dates:', error);
      const today = new Date();
      return { startDate: today, endDate: today };
    }
  }
}

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new GranvilleMarketEvents();
