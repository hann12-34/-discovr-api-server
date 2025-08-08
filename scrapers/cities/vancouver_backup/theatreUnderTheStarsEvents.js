const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * Theatre Under The Stars Events Scraper
 * Scrapes events from Theatre Under The Stars website
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class TheatreUnderTheStarsEvents {
  constructor() {
    this.name = 'Theatre Under The Stars Events';
    this.url = 'https://tuts.ca/shows-tickets/';
    this.venue = {
      name: 'Theatre Under The Stars',
      address: 'Malkin Bowl in Stanley Park, Vancouver, BC',
      city: getCityFromArgs(),
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.3013, lng: -123.1418 }
    };
  }

  /**
   * Scrape events from Theatre Under The Stars
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

      console.log('Extracting Theatre Under The Stars events...');
      const events = await this.extractEvents(page);
      console.log(`Found ${events.length} Theatre Under The Stars events`);
      
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
   * Extract events from Theatre Under The Stars website
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<Array>} - Array of event objects
   */
  async extractEvents(page) {
    // Wait for event containers to load
    await page.waitForSelector('.show-item, .event-card, .production-item', { timeout: 10000 })
      .catch(() => {
        console.log('Primary event selectors not found, trying alternative selectors');
      });

    // Extract events
    const events = await page.evaluate((venueInfo) => {
      // Try multiple potential selectors for event containers
      const eventSelectors = [
        '.show-item',
        '.event-card',
        '.production-item',
        '.show-listing',
        '.production',
        'article.show',
        '.season-show'
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
        // If specific containers aren't found, try to find any section that might contain show information
        const fallbackSelectors = [
          '.current-season .show',
          '.shows-container .item',
          '.main-content .show',
          '.upcoming-productions',
          '.season-section'
        ];
        
        for (const selector of fallbackSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements && elements.length > 0) {
            eventElements = Array.from(elements);
            break;
          }
        }
      }
      
      if (eventElements.length === 0) {
        console.log('No event elements found with any selector');
        return [];
      }
      
      return eventElements.map(event => {
        try {
          // Extract title
          const titleSelectors = ['h2', 'h3', '.title', '.show-title', '.name'];
          let title = 'Theatre Under The Stars Show';
          
          for (const selector of titleSelectors) {
            const titleElement = event.querySelector(selector);
            if (titleElement && titleElement.textContent.trim()) {
              title = titleElement.textContent.trim();
              break;
            }
          }
          
          // Extract date
          const dateSelectors = ['.date', '.show-date', '.dates', '.runtime', '.season-dates'];
          let dateText = '';
          
          for (const selector of dateSelectors) {
            const dateElement = event.querySelector(selector);
            if (dateElement) {
              dateText = dateElement.textContent.trim();
              break;
            }
          }
          
          // Extract description
          const descSelectors = ['.description', '.show-description', '.summary', '.excerpt', '.content'];
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
        categories: ['Theatre', 'Arts & Culture', 'Outdoor', 'Entertainment'],
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
      // Default to summer dates for Theatre Under The Stars if no date is found
      // They typically perform in summer months (July-August)
      const currentYear = new Date().getFullYear();
      const defaultStart = new Date(`July 1, ${currentYear}`);
      const defaultEnd = new Date(`August 31, ${currentYear}`);
      return { startDate: defaultStart, endDate: defaultEnd };
    }

    try {
      // Look for date ranges like "July 5 - August 25, 2025"
      const dateRangePattern = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2})(?:,?\s*(\d{4}))?/i;
      const match = dateText.match(dateRangePattern);
      
      if (match) {
        const currentYear = new Date().getFullYear();
        const year = match[3] ? parseInt(match[3]) : currentYear;
        
        const startDateText = `${match[1]}, ${year}`;
        const endDateText = `${match[2]}, ${year}`;
        
        const startDate = new Date(startDateText);
        const endDate = new Date(endDateText);
        
        // Default show time for theatre performances if no specific time is found
        startDate.setHours(19, 30); // 7:30 PM typical show time
        endDate.setHours(22, 0); // End time approximately
        
        return { startDate, endDate };
      }
      
      // Look for season information like "Summer 2025" or "July 2025"
      const seasonPattern = /(summer|winter|fall|autumn|spring|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)\s+(\d{4})/i;
      const seasonMatch = dateText.match(seasonPattern);
      
      if (seasonMatch) {
        const season = seasonMatch[1].toLowerCase();
        const year = parseInt(seasonMatch[2]);
        
        let startDate, endDate;
        
        if (season === 'summer') {
          startDate = new Date(`June 21, ${year}`);
          endDate = new Date(`September 21, ${year}`);
        } else if (season === 'winter') {
          startDate = new Date(`December 21, ${year}`);
          endDate = new Date(`March 20, ${year + 1}`);
        } else if (season === 'fall' || season === 'autumn') {
          startDate = new Date(`September 22, ${year}`);
          endDate = new Date(`December 20, ${year}`);
        } else if (season === 'spring') {
          startDate = new Date(`March 21, ${year}`);
          endDate = new Date(`June 20, ${year}`);
        } else {
          // It's a month name
          const monthMap = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
            'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
          };
          
          const monthKey = season.substring(0, 3).toLowerCase();
          const monthIndex = monthMap[monthKey];
          
          startDate = new Date(year, monthIndex, 1);
          endDate = new Date(year, monthIndex + 1, 0); // Last day of the month
        }
        
        return { startDate, endDate };
      }
      
      // Try direct parsing as a fallback
      const date = new Date(dateText);
      if (!isNaN(date.getTime())) {
        // If it's a single date, assume it's a one-day event
        return { startDate: date, endDate: new Date(date.getTime() + 3 * 60 * 60 * 1000) }; // Add 3 hours for end time
      }
      
      // If all else fails, use summer dates as Theatre Under The Stars typically runs in summer
      const currentYear = new Date().getFullYear();
      const defaultStart = new Date(`July 1, ${currentYear}`);
      const defaultEnd = new Date(`August 31, ${currentYear}`);
      return { startDate: defaultStart, endDate: defaultEnd };
    } catch (error) {
      console.error('Error parsing dates:', error);
      const currentYear = new Date().getFullYear();
      const defaultStart = new Date(`July 1, ${currentYear}`);
      const defaultEnd = new Date(`August 31, ${currentYear}`);
      return { startDate: defaultStart, endDate: defaultEnd };
    }
  }
}

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new TheatreUnderTheStarsEvents();
