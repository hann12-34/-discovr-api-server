/**
 * Vancouver Symphony Orchestra Events Scraper
 * Scrapes events from Vancouver Symphony Orchestra's website
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class VancouverSymphonyEvents {
  constructor() {
    this.name = 'Vancouver Symphony Orchestra Events';
    this.url = 'https://www.vancouversymphony.ca/concerts-tickets/';
    this.venue = {
      name: 'Vancouver Symphony Orchestra',
      address: '500-833 Seymour St, Vancouver, BC V6B 0G4',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2827, lng: -123.1207 }
    };
  }

  /**
   * Scrape events from Vancouver Symphony Orchestra
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

      console.log('Extracting Vancouver Symphony Orchestra events...');
      const events = await this.extractEvents(page);
      console.log(`Found ${events.length} Vancouver Symphony Orchestra events`);
      
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
   * Extract events from Vancouver Symphony Orchestra website
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<Array>} - Array of event objects
   */
  async extractEvents(page) {
    // Wait for event containers to load
    await page.waitForSelector('.concert-item, .event-card, .concert-listing', { timeout: 10000 })
      .catch(() => {
        console.log('Primary event selectors not found, trying alternative selectors');
      });

    // Extract events
    const events = await page.evaluate((venueInfo) => {
      // Try multiple potential selectors for event containers
      const eventSelectors = [
        '.concert-item', 
        '.event-card', 
        '.concert-listing',
        '.performance-item',
        '.event-item',
        '.vso-concert',
        '.concert-post'
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
          const titleSelectors = ['h2', 'h3', '.title', '.concert-title', '.name'];
          let title = 'Vancouver Symphony Orchestra Concert';
          
          for (const selector of titleSelectors) {
            const titleElement = event.querySelector(selector);
            if (titleElement && titleElement.textContent.trim()) {
              title = titleElement.textContent.trim();
              break;
            }
          }
          
          // Extract date
          const dateSelectors = ['.date', '.concert-date', '.datetime', '.performance-date'];
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
          const descSelectors = ['.description', '.concert-description', '.summary', '.excerpt', '.content'];
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
          
          // Extract venue (could be different venues for symphony performances)
          const venueSelectors = ['.venue', '.location', '.concert-venue'];
          let venueName = venueInfo.name;
          let venueAddress = venueInfo.address;
          
          for (const selector of venueSelectors) {
            const venueElement = event.querySelector(selector);
            if (venueElement && venueElement.textContent.trim()) {
              const venueText = venueElement.textContent.trim();
              
              // Check if the text contains common venue names in Vancouver
              if (venueText.includes('Orpheum')) {
                venueName = 'Orpheum Theatre';
                venueAddress = '601 Smithe St, Vancouver, BC V6B 3L4';
              } else if (venueText.includes('Chan Centre')) {
                venueName = 'Chan Centre for the Performing Arts';
                venueAddress = '6265 Crescent Rd, Vancouver, BC V6T 1Z1';
              } else if (venueText.includes('Bell')) {
                venueName = 'Bell Performing Arts Centre';
                venueAddress = '6250 144 St, Surrey, BC V3X 1A1';
              }
              break;
            }
          }
          
          const updatedVenue = {
            ...venueInfo,
            name: venueName,
            address: venueAddress
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
      
      return {
        id: uniqueId,
        title: event.title,
        description: event.description,
        startDate,
        endDate,
        image: event.image,
        venue: event.venue,
        categories: ['Symphony', 'Classical Music', 'Arts & Culture', 'Orchestra'],
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
      
      // Look for date patterns like "January 15, 2025" or "Jan 15"
      const datePattern = /(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)/i;
      const match = dateText.match(datePattern);
      
      if (match) {
        const currentYear = new Date().getFullYear();
        let dateStr = match[1];
        
        // Add year if not present
        if (!dateStr.match(/\d{4}/)) {
          dateStr = `${dateStr}, ${currentYear}`;
        }
        
        const date = new Date(dateStr);
        
        // Symphony concerts typically start at 8:00 PM
        date.setHours(20, 0);
        
        // Concerts typically last around 2-2.5 hours
        const endDate = new Date(date.getTime() + (2.5 * 60 * 60 * 1000));
        
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
          endDate.setTime(date.getTime() + (2.5 * 60 * 60 * 1000));
        }
        
        return { startDate: date, endDate: endDate };
      }
      
      // Try direct parsing as a fallback
      const date = new Date(dateText);
      if (!isNaN(date.getTime())) {
        const endDate = new Date(date.getTime() + (2.5 * 60 * 60 * 1000));
        return { startDate: date, endDate: endDate };
      }
      
      // If all else fails, use current date
      const today = new Date();
      const endDate = new Date(today.getTime() + (2.5 * 60 * 60 * 1000));
      return { startDate: today, endDate: endDate };
    } catch (error) {
      console.error('Error parsing dates:', error);
      const today = new Date();
      const endDate = new Date(today.getTime() + (2.5 * 60 * 60 * 1000));
      return { startDate: today, endDate: endDate };
    }
  }
}

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new VancouverSymphonyEvents();
