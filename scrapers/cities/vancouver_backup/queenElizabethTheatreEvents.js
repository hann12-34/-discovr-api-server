const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * Queen Elizabeth Theatre Events Scraper
 * Scrapes events from Queen Elizabeth Theatre's website
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class QueenElizabethTheatreEvents {
  constructor() {
    this.name = 'Queen Elizabeth Theatre Events';
    this.url = 'https://vancouvercivictheatres.com/venues/queen-elizabeth-theatre/events/';
    this.venue = {
      name: 'Queen Elizabeth Theatre',
      address: '630 Hamilton St, Vancouver, BC V6B 5N6',
      city: getCityFromArgs(),
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2798, lng: -123.1119 }
    };
  }

  /**
   * Scrape events from Queen Elizabeth Theatre
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

      console.log('Extracting Queen Elizabeth Theatre events...');
      const events = await this.extractEvents(page);
      console.log(`Found ${events.length} Queen Elizabeth Theatre events`);
      
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
   * Extract events from Queen Elizabeth Theatre website
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<Array>} - Array of event objects
   */
  async extractEvents(page) {
    // Wait for event containers to load
    await page.waitForSelector('.event-item, .event-card, .event-listing', { timeout: 10000 })
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
        '.event-container',
        '.event',
        '.performance-item',
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
          let title = 'Queen Elizabeth Theatre Event';
          
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
   * Determine event categories based on title
   * @param {string} title - Event title
   * @returns {Array} - Array of categories
   */
  determineCategories(title) {
    const lowerTitle = title.toLowerCase();
    
    // Default category is Performing Arts
    const categories = ['Performing Arts', 'Arts & Culture'];
    
    if (lowerTitle.includes('opera') || 
        lowerTitle.includes('symphony') || 
        lowerTitle.includes('orchestra')) {
      categories.push('Classical Music');
    }
    
    if (lowerTitle.includes('ballet') || 
        lowerTitle.includes('dance') || 
        lowerTitle.includes('dancing')) {
      categories.push('Dance');
    }
    
    if (lowerTitle.includes('comedy') || 
        lowerTitle.includes('comedian')) {
      categories.push('Comedy');
    }
    
    if (lowerTitle.includes('musical') || 
        lowerTitle.includes('theatre') ||
        lowerTitle.includes('theater')) {
      categories.push('Theatre');
    }
    
    if (lowerTitle.includes('concert') || 
        lowerTitle.includes('music') || 
        lowerTitle.includes('live')) {
      categories.push('Music');
    }
    
    return categories;
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
      const datePattern = /(\w+\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)/i;
      const match = dateText.match(datePattern);
      
      if (match) {
        const currentYear = new Date().getFullYear();
        let dateStr = match[1];
        
        // Add year if not present
        if (!dateStr.match(/\d{4}/)) {
          dateStr = `${dateStr}, ${currentYear}`;
        }
        
        const date = new Date(dateStr);
        
        // Most theatre events start at 7:30 or 8:00 PM
        date.setHours(19, 30);
        
        // Events typically last 2-3 hours
        const endDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
        
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
          endDate.setTime(date.getTime() + (3 * 60 * 60 * 1000));
        }
        
        return { startDate: date, endDate };
      }
      
      // Try direct parsing as a fallback
      const date = new Date(dateText);
      if (!isNaN(date.getTime())) {
        const endDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
        return { startDate: date, endDate };
      }
      
      // If all else fails, use current date
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

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new QueenElizabethTheatreEvents();
