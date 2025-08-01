/**
 * Vancouver City Events Real Scraper
 * 
 * This scraper extracts actual events from the Vancouver City website
 * Source: https://vancouver.ca/parks-recreation-culture/events-calendar.aspx
 * 
 * Uses Puppeteer to handle JavaScript-rendered content with SSL error bypass
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class VancouverCityEventsScraper {
  constructor() {
    this.name = 'Vancouver City Events';
    this.url = 'https://vancouver.ca/parks-recreation-culture/events-calendar.aspx';
    this.sourceIdentifier = 'vancouver-city-events';
    this.enabled = true;
  }

  /**
   * Format a date range string into standard format
   * @param {string} dateStr - Date range string from website
   * @returns {Object} - Object containing start and end dates
   */
  parseDateRange(dateStr) {
    if (!dateStr) return { startDate: null, endDate: null };
    
    try {
      // Handle various date formats
      dateStr = dateStr.trim();
      
      // Format patterns common on Vancouver city website
      if (dateStr.toLowerCase().includes('ongoing') || dateStr.toLowerCase().includes('permanent')) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1); // Set end date to a year from now
        return { startDate, endDate };
      }
      
      // Check if it's a date range
      if (dateStr.includes(' - ') || dateStr.includes(' to ') || dateStr.includes('–')) {
        let separator = ' - ';
        if (dateStr.includes(' to ')) separator = ' to ';
        if (dateStr.includes('–')) separator = '–';
        
        const [startPart, endPart] = dateStr.split(separator).map(s => s.trim());
        
        // Parse start date
        const startDate = new Date(startPart);
        
        // Parse end date based on format
        let endDate;
        if (!endPart.includes(',') && !endPart.match(/\d{4}/)) {
          // Just day number, use month/year from start date
          const endDay = parseInt(endPart.match(/\d+/)[0], 10);
          const year = startDate.getFullYear();
          const month = startDate.getMonth();
          endDate = new Date(year, month, endDay, 23, 59, 59);
        } else {
          // Full date
          endDate = new Date(endPart);
          endDate.setHours(23, 59, 59);
        }
        
        return { startDate, endDate };
      } else {
        // Single date
        const date = new Date(dateStr);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59);
        
        return { startDate: date, endDate };
      }
    } catch (error) {
      console.error(`Error parsing date range: ${dateStr}`, error);
      return { startDate: null, endDate: null };
    }
  }

  /**
   * Extract location information from text
   * @param {string} locationText - Location string from website
   * @returns {Object} - Structured location information
   */
  parseLocation(locationText) {
    if (!locationText) return {
      name: 'Vancouver',
      id: 'vancouver-general',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada'
    };
    
    // Default venue info
    const venue = {
      name: locationText,
      id: `vancouver-${slugify(locationText, { lower: true })}`,
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      address: locationText
    };
    
    return venue;
  }

  /**
   * Determine categories based on event description and title
   * @param {string} title - Event title
   * @param {string} description - Event description
   * @returns {string[]} - Array of category strings
   */
  determineCategories(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const categories = ['event'];
    
    // Add categories based on keywords
    const categoryMappings = [
      { keywords: ['music', 'concert', 'festival', 'symphony', 'orchestra', 'band'], category: 'music' },
      { keywords: ['art', 'exhibition', 'gallery', 'museum', 'painting', 'artistic'], category: 'arts' },
      { keywords: ['food', 'cuisine', 'dining', 'culinary', 'wine', 'beer', 'eat'], category: 'food-drink' },
      { keywords: ['outdoor', 'adventure', 'hiking', 'biking', 'kayak', 'park'], category: 'outdoor' },
      { keywords: ['family', 'kid', 'children', 'youth', 'parent'], category: 'family' },
      { keywords: ['theater', 'theatre', 'stage', 'performance', 'play'], category: 'theatre' },
      { keywords: ['heritage', 'historic', 'cultural', 'tradition'], category: 'cultural' },
      { keywords: ['celebration', 'party', 'nightlife', 'festival'], category: 'celebration' },
      { keywords: ['sports', 'athletic', 'game', 'match', 'tournament'], category: 'sports' },
      { keywords: ['community', 'volunteer', 'workshop', 'seminar'], category: 'community' },
      { keywords: ['market', 'fair', 'bazaar', 'shop'], category: 'shopping' }
    ];
    
    for (const mapping of categoryMappings) {
      if (mapping.keywords.some(keyword => text.includes(keyword))) {
        categories.push(mapping.category);
      }
    }
    
    return categories;
  }

  /**
   * Main scraper function that extracts events from Vancouver City website
   * @returns {Promise<Array>} - Array of event objects
   */
  async scrape() {
    if (!this.enabled) {
      console.log(`${this.name} scraper is disabled`);
      return [];
    }
    
    console.log(`🔍 Scraping events from ${this.name}...`);
    const events = [];
    let browser;
    
    try {
      // Launch Puppeteer browser with ignoring SSL errors
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--ignore-certificate-errors',
          '--ignore-certificate-errors-spki-list'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      // Navigate to the events page with less strict navigation options
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      
      console.log('Waiting for page to be fully loaded...');
      
      // Vancouver City's event page structure - waiting for event listings
      await page.waitForSelector('.event, .event-listing, .events-list, .calendar-event', { 
        timeout: 10000 
      }).catch(() => {
        console.log('Selector timeout, will continue with what is available');
      });
      
      // Extra time for JavaScript to render content using a manual Promise-based timeout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Extracting events from the page...');
      
      // Extract events using Vancouver City website structure
      const extractedEvents = await page.evaluate(() => {
        const eventElements = document.querySelectorAll('.event, .event-listing, .events-list .item, .calendar-event');
        console.log(`Found ${eventElements.length} event elements`);
        
        // If nothing found with specific selectors, try more generic ones
        const elements = eventElements.length > 0 ? 
          eventElements : 
          document.querySelectorAll('article, .listing, .content-item');
        
        return Array.from(elements).map(element => {
          // Extract title
          const titleElement = element.querySelector('h2, h3, h4, .event-title, .title, a[class*="title"]');
          const title = titleElement ? titleElement.innerText.trim() : '';
          
          // Extract description
          const descriptionElement = element.querySelector('.description, .summary, .excerpt, p:not(.date):not(.time):not(.location)');
          const description = descriptionElement ? descriptionElement.innerText.trim() : '';
          
          // Extract date
          const dateElement = element.querySelector('.date, time, [class*="date"]');
          const dateText = dateElement ? dateElement.innerText.trim() : '';
          
          // Extract time
          const timeElement = element.querySelector('.time, [class*="time"]');
          const timeText = timeElement ? timeElement.innerText.trim() : '';
          
          // Extract location
          const locationElement = element.querySelector('.location, .venue, .place, [class*="location"]');
          const locationText = locationElement ? locationElement.innerText.trim() : '';
          
          // Extract image URL
          const imageElement = element.querySelector('img');
          const imageUrl = imageElement ? 
            (imageElement.src || imageElement.getAttribute('data-src')) : '';
          
          // Extract event URL
          const linkElement = titleElement ? 
            (titleElement.tagName === 'A' ? titleElement : titleElement.querySelector('a')) : 
            element.querySelector('a');
          const eventUrl = linkElement ? linkElement.href : '';
          
          return {
            title,
            description,
            dateText: dateText + (timeText ? ` ${timeText}` : ''),
            locationText,
            imageUrl,
            eventUrl
          };
        }).filter(event => event.title); // Filter out events with no title
      });
      
      console.log(`Found ${extractedEvents.length} events on Vancouver City website`);
      
      // Process each extracted event
      for (const item of extractedEvents) {
        try {
          if (!item.title) continue;
          
          // Parse dates
          const { startDate, endDate } = this.parseDateRange(item.dateText);
          
          // If no dates found but we have a title, create a future date
          let eventDates = { startDate, endDate };
          if (!startDate) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7); // One week from now
            
            const endDate = new Date(futureDate);
            endDate.setDate(endDate.getDate() + 1);
            
            eventDates = { startDate: futureDate, endDate };
          }
          
          // Parse location
          const venue = this.parseLocation(item.locationText);
          
          // Generate unique ID
          const dateStr = eventDates.startDate ? 
            eventDates.startDate.toISOString().split('T')[0] : '';
          const eventId = `vancouver-city-${slugify(item.title, { lower: true })}-${dateStr}`;
          
          // Determine categories
          const categories = this.determineCategories(item.title, item.description);
          
          // Format description
          const fullDescription = item.description || `${item.title} - A Vancouver City event`;
          
          // Create event object
          const event = {
            id: eventId,
            title: item.title,
            description: fullDescription,
            startDate: eventDates.startDate,
            endDate: eventDates.endDate,
            venue,
            category: categories[0] || 'event',
            categories,
            sourceURL: this.url,
            officialWebsite: item.eventUrl || this.url,
            image: item.imageUrl,
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`✅ Added event: ${item.title}`);
        } catch (error) {
          console.error(`Error processing event:`, error);
        }
      }
      
      console.log(`🎉 Successfully scraped ${events.length} Vancouver City events`);
    } catch (error) {
      console.error(`❌ Error scraping ${this.name}:`, error);
    } finally {
      // Always close the browser
      if (browser) await browser.close();
    }
    
    return events;
  }
}

module.exports = new VancouverCityEventsScraper();
