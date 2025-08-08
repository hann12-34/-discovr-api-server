const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * Underground Comedy Club Events Scraper
 * 
 * Scrapes events from the Underground Comedy Club website
 * https://www.ugcomedy.com/
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');
const helpers = require('./utils/helpers');

class UndergroundComedyClubEvents {
  constructor() {
    this.name = "Underground Comedy Club";
    this.url = "https://www.ugcomedy.com/";
    this.city = "Vancouver";
    this.scraperName = "undergroundComedyClubEvents";
  }
  
  /**
   * Scrape events from the Underground Comedy Club website
   */
  async scrape() {
    console.log(`🔍 Starting ${this.name} scraper...`);
    
    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15');
    
    // Set navigation timeouts
    await page.setDefaultNavigationTimeout(30000);
    await page.setDefaultTimeout(30000);
    
    const events = [];
    
    try {
      console.log(`Navigating to: ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2' });
      
      // Take a debug screenshot
      await page.screenshot({ path: 'underground-comedy-debug.png' });
      console.log('✅ Saved debug screenshot');
      
      // Check for upcoming shows section on homepage
      const showLinks = await page.evaluate(() => {
        const links = [];
        
        // Look for links containing "show", "event", "comedy", or "tickets"
        const allLinks = document.querySelectorAll('a[href*="show"], a[href*="event"], a[href*="comedy"], a[href*="tickets"]');
        
        for (const link of allLinks) {
          if (link.href && 
              !link.href.includes('facebook.com') && 
              !link.href.includes('instagram.com') && 
              !link.href.includes('twitter.com')) {
            links.push({
              url: link.href,
              title: link.textContent.trim() || null
            });
          }
        }
        
        return links;
      });
      
      console.log(`Found ${showLinks.length} potential show links`);
      
      // Process each show link
      for (let i = 0; i < showLinks.length; i++) {
        const showLink = showLinks[i];
        console.log(`Processing show link ${i + 1}/${showLinks.length}: ${showLink.url}`);
        
        // Navigate to show page
        await page.goto(showLink.url, { waitUntil: 'networkidle2' });
        
        // Extract event details
        const eventData = await page.evaluate(() => {
          let title = '';
          
          // Find title using various selectors
          const titleSelectors = [
            'h1', 'h2', '.title', '.event-title', '.show-title', 
            'header h1', 'header h2', '.headline', '.main-title',
            '.page-title', '.hero-title', '.hero h1', '.hero h2'
          ];
          
          for (const selector of titleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              title = element.textContent.trim();
              break;
            }
          }
          
          // If still no title found, look at page title
          if (!title) {
            const pageTitle = document.title;
            if (pageTitle && pageTitle.toLowerCase() !== 'underground comedy club' && 
                !pageTitle.toLowerCase().includes('404') && 
                !pageTitle.toLowerCase().includes('not found')) {
              title = pageTitle.replace(' - Underground Comedy Club', '').replace(' | Underground Comedy Club', '').trim();
            }
          }
          
          // Find date - expand selectors to handle different site structures
          const dateSelectors2 = [
            '.date', '.event-date', '.show-date', '.datetime', 'time', '.show-time', '.event-time',
            '[itemprop="startDate"]', '[data-testid="event-date"]', '.event-details', '.meta-info',
            '.card-subtitle', '.event-datetime', '.date-and-time', '.date-display',
            'div:has(.date), div:has(.event-date), div:has(.show-date), div:has(.datetime), div:has(time), div:has(.show-time), div:has(.event-time)'
          ];
          let dateText2 = '';
          
          for (const selector of dateSelectors2) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              const text = element.textContent.trim();
              // Look for text containing month names or date formats
              if (/\\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\\b/i.test(text) ||
                  /\\b\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4}\\b/.test(text) ||
                  /\\b\\d{1,2}\\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\\b/i.test(text)) {
                dateText2 = text;
                break;
              }
            }
            if (dateText2) break;
          }
          
          // If we still don't have a date, look for date in any element with specific terms
          if (!dateText2) {
            const allElements = document.querySelectorAll('div, p, span, li');
            for (const element of allElements) {
              const text = element.textContent.trim();
              if ((text.toLowerCase().includes('date') || text.toLowerCase().includes('when')) &&
                  (/\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4}/.test(text) || 
                   /\\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\\b/i.test(text))) {
                dateText2 = text;
                break;
              }
            }
          }
          
          // Find description
          const descSelectors = ['.description', '.show-description', '.event-description', '.content', 'p'];
          let description = '';
          
          for (const selector of descSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              description = element.textContent.trim();
              break;
            }
          }
          
          // Find price information
          const priceSelectors = ['.price', '.ticket-price', '.cost', '[itemprop="price"]', '.fee', '.ticket-info'];
          let price = '';
          
          for (const selector of priceSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              price = element.textContent.trim();
              if (price) break;
            }
          }
          
          // Find image
          const imageSelectors = ['img.hero-image', 'img.event-image', '.event-image img', '.hero img', '.main-image', 'img[itemprop="image"]'];
          let imageUrl = '';
          
          for (const selector of imageSelectors) {
            const element = document.querySelector(selector);
            if (element && element.src) {
              imageUrl = element.src;
              break;
            }
          }
          
          // Find location
          let location = 'Underground Comedy Club, Vancouver, BC';
          const locationSelectors = ['.location', '.venue', '.address', '[itemprop="location"]'];
          
          for (const selector of locationSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              const loc = element.textContent.trim();
              if (loc) {
                location = loc + ', Vancouver, BC';
                break;
              }
            }
          }
          
          return {
            title,
            dateText2,
            description,
            price,
            imageUrl,
            location,
            url: window.location.href
          };
        });
        
        // Process event data and create event object
        if (eventData.title && eventData.dateText2) {
          console.log(`Found event: ${eventData.title}`);
          
          const dateInfo = this.parseEventDate(eventData.dateText2);
          
          // Create event object
          const event = {
            id: slugify(`${eventData.title}-${dateInfo.startDate}`.toLowerCase(), {
              lower: true,
              strict: true
            }),
            title: eventData.title,
            description: eventData.description || 'Join us for a comedy night at the Underground Comedy Club in Vancouver.',
            startDate: dateInfo.startDate,
            endDate: dateInfo.endDate,
            location: eventData.location,
            imageUrl: eventData.imageUrl || '',
            url: eventData.url,
            price: eventData.price || 'Check website for ticket prices',
            category: 'Comedy',
            tags: ['comedy', 'standup', 'underground comedy club', 'nightlife', 'entertainment', 'vancouver'],
            source: this.scraperName
          };
          
          // Add the event to our collection
          events.push(helpers.normalizeEvent(event, this.scraperName));
        } else {
          console.log(`Skipping link: ${showLink.url} - Missing required data`);
        }
        
        // Wait a bit between requests to be polite
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log(`✅ Found ${events.length} events from ${this.name}`);
      
    } catch (error) {
      console.error(`❌ Error scraping ${this.name}:`, error.message);
    } finally {
      await browser.close();
    }
    
    return events;
  }
  
  /**
   * Parse date information from a string
   * @param {String} dateText2 - Text containing date information
   * @returns {Object} - Object with startDate and endDate
   */
  parseEventDate(dateText2) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    let dateObj = null;
    
    console.log(`Parsing date: "${dateText2}"`);
    
    // Look for different date formats
    
    // Format: Month Day, Year (e.g., "January 15, 2023")
    const fullMatch = dateText2.match(/\\b(January|February|March|April|May|June|July|August|September|October|November|December)\\s+(\\d{1,2})(?:\\s*,?\\s*(\\d{4}))?\\b/i);
    
    // Format: Mon Day, Year (e.g., "Jan 15, 2023")
    const abbrMatch = dateText2.match(/\\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+(\\d{1,2})(?:\\s*,?\\s*(\\d{4}))?\\b/i);
    
    // Format: MM/DD/YYYY or DD/MM/YYYY
    const slashMatch = dateText2.match(/\\b(\\d{1,2})[\\/](\\d{1,2})(?:[\\/](\\d{2,4}))?\\b/);
    
    // Format: MM-DD-YYYY or DD-MM-YYYY
    const dashMatch = dateText2.match(/\\b(\\d{1,2})-(\\d{1,2})(?:-(\\d{2,4}))?\\b/);
    
    if (fullMatch || abbrMatch) {
      const match = fullMatch || abbrMatch;
      let monthName = match[1].toLowerCase();
      const day = parseInt(match[2], 10);
      const year = match[3] ? parseInt(match[3], 10) : currentYear;
      
      // Convert month name to month number (0-indexed)
      const months = {
        'january': 0, 'jan': 0,
        'february': 1, 'feb': 1,
        'march': 2, 'mar': 2,
        'april': 3, 'apr': 3,
        'may': 4,
        'june': 5, 'jun': 5,
        'july': 6, 'jul': 6,
        'august': 7, 'aug': 7,
        'september': 8, 'sep': 8,
        'october': 9, 'oct': 9,
        'november': 10, 'nov': 10,
        'december': 11, 'dec': 11
      };
      
      const month = months[monthName];
      if (month !== undefined && day >= 1 && day <= 31) {
        dateObj = new Date(year, month, day, 20, 0, 0); // Default to 8 PM for comedy shows
      }
    } else if (slashMatch) {
      let month, day, year;
      
      // For North America, assume MM/DD format
      month = parseInt(slashMatch[1], 10) - 1; // 0-indexed month
      day = parseInt(slashMatch[2], 10);
      year = slashMatch[3] ? parseInt(slashMatch[3], 10) : currentYear;
      
      // If year is given as a 2-digit number, assume it's in the current century
      if (year < 100) {
        year = 2000 + year;
      }
      
      if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        dateObj = new Date(year, month, day, 20, 0, 0); // Default to 8 PM for comedy shows
      }
    } else if (dashMatch) {
      let month, day, year;
      
      // For North America, assume MM-DD format
      month = parseInt(dashMatch[1], 10) - 1; // 0-indexed month
      day = parseInt(dashMatch[2], 10);
      year = dashMatch[3] ? parseInt(dashMatch[3], 10) : currentYear;
      
      // If year is given as a 2-digit number, assume it's in the current century
      if (year < 100) {
        year = 2000 + year;
      }
      
      if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        dateObj = new Date(year, month, day, 20, 0, 0); // Default to 8 PM for comedy shows
      }
    }
    
    // If we couldn't parse a date, default to today's date
    if (!dateObj) {
      console.log('Could not parse date, defaulting to today');
      dateObj = new Date();
      dateObj.setHours(20, 0, 0, 0); // 8 PM
    }
    
    // Create end date (assume shows are 2 hours)
    const endDate = new Date(dateObj);
    endDate.setHours(endDate.getHours() + 2);
    
    return {
      startDate: dateObj,
      endDate: endDate
    };
  }
}

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new UndergroundComedyClubEvents();
