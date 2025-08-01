/**
 * Vancouver Aquarium Events Scraper
 * Scrapes events from Vancouver Aquarium's website
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class VancouverAquariumEvents {
  constructor() {
    this.name = 'Vancouver Aquarium Events';
    this.url = 'https://www.vanaqua.org/events';
    this.venue = {
      name: 'Vancouver Aquarium',
      address: '845 Avison Way, Vancouver, BC V6G 3E2',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.3004, lng: -123.1309 }
    };
  }

  /**
   * Scrape events from Vancouver Aquarium
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
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set default timeout
    await page.setDefaultNavigationTimeout(30000);
    
    try {
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2' });

      console.log('Extracting Vancouver Aquarium events...');
      const events = await this.extractEvents(page);
      console.log(`Found ${events.length} Vancouver Aquarium events`);
      
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
   * Extract events from Vancouver Aquarium website
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<Array>} - Array of event objects
   */
  async extractEvents(page) {
    // Wait for event containers to load
    await page.waitForSelector('.event-item, .event-card, .event-listing, .calendar-event', { timeout: 10000 })
      .catch(() => {
        console.log('Primary event selectors not found, trying alternative selectors');
      });

    // Extract events
    const events = await page.evaluate((venueInfo) => {
      // Try multiple potential selectors for event containers
      const eventSelectors = [
        '.event-item', 
        '.event-card', 
        '.event-listing', 
        '.calendar-event',
        'article.event',
        '.events-container .item',
        '.upcoming-events li'
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
          let title = 'Aquarium Event';
          
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
            // Handle relative URLs
            if (image.startsWith('/')) {
              image = 'https://www.vanaqua.org' + image;
            }
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
        categories: ['Wildlife', 'Education', 'Family', 'Entertainment'],
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
      
      // Look for date ranges like "July 1 - July 15, 2023"
      const dateRangePattern = /([a-z]+\s+\d{1,2})(?:\s*[-–]\s*([a-z]+\s+\d{1,2}))?(?:\s*,\s*(\d{4}))?/i;
      const match = dateText.match(dateRangePattern);
      
      if (match) {
        const startDateText = match[1];
        const endDateText = match[2];
        const year = match[3] || new Date().getFullYear().toString();
        
        let startDate = new Date(`${startDateText}, ${year}`);
        let endDate;
        
        if (endDateText) {
          endDate = new Date(`${endDateText}, ${year}`);
        } else {
          endDate = new Date(startDate);
        }
        
        // Look for time information like "7:30pm" or "1pm - 4pm"
        const timePattern = /(\d{1,2}(?::\d{2})?\s*(?:am|pm))(?:\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)))?/i;
        const timeMatch = dateText.match(timePattern);
        
        if (timeMatch) {
          const startTimeText = timeMatch[1];
          const endTimeText = timeMatch[2];
          
          const startTimeParts = startTimeText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
          if (startTimeParts) {
            let hours = parseInt(startTimeParts[1]);
            const minutes = startTimeParts[2] ? parseInt(startTimeParts[2]) : 0;
            const isPM = startTimeParts[3].toLowerCase() === 'pm';
            
            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
            
            startDate.setHours(hours, minutes);
          }
          
          if (endTimeText) {
            const endTimeParts = endTimeText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
            if (endTimeParts) {
              let hours = parseInt(endTimeParts[1]);
              const minutes = endTimeParts[2] ? parseInt(endTimeParts[2]) : 0;
              const isPM = endTimeParts[3].toLowerCase() === 'pm';
              
              if (isPM && hours < 12) hours += 12;
              if (!isPM && hours === 12) hours = 0;
              
              if (!endDate) endDate = new Date(startDate);
              endDate.setHours(hours, minutes);
            }
          }
        }
        
        return { startDate, endDate };
      }
      
      // If the specific patterns don't match, try direct parsing
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
module.exports = new VancouverAquariumEvents();
