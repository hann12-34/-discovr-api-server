/**
 * HelloBC Events Real Scraper
 * 
 * This scraper extracts actual events from HelloBC website
 * Source: https://www.hellobc.com/events/
 * 
 * Uses Puppeteer to handle JavaScript-rendered content
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class HelloBCEventsScraper {
  constructor() {
    this.name = 'HelloBC Events';
    this.url = 'https://www.hellobc.com/things-to-do/events/';
    this.sourceIdentifier = 'hellobc-events';
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
      // e.g., "July 1 - 15, 2025", "August 3, 2025", etc.
      dateStr = dateStr.trim();
      
      // Check if it's a date range
      if (dateStr.includes('-')) {
        const [startPart, endPart] = dateStr.split('-').map(s => s.trim());
        
        // Handle case where month is not repeated: "July 1 - 15, 2025"
        if (!endPart.includes(',')) {
          const month = startPart.split(' ')[0];
          const startDay = startPart.split(' ')[1];
          const endDay = endPart.split(',')[0];
          const year = endPart.includes(',') ? endPart.split(',')[1].trim() : new Date().getFullYear();
          
          const startDate = new Date(`${month} ${startDay}, ${year}`);
          const endDate = new Date(`${month} ${endDay}, ${year}`);
          
          // Set end time to end of day
          endDate.setHours(23, 59, 59);
          
          return { startDate, endDate };
        } else {
          // Handle full date range: "July 1, 2025 - August 15, 2025"
          const startDate = new Date(startPart);
          const endDate = new Date(endPart);
          
          // Set end time to end of day
          endDate.setHours(23, 59, 59);
          
          return { startDate, endDate };
        }
      } else {
        // Handle single date
        const date = new Date(dateStr);
        const endDate = new Date(date);
        
        // Set end time to end of day
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
    if (!locationText) return null;
    
    // Default venue info
    const venue = {
      name: locationText,
      id: `hellobc-${slugify(locationText, { lower: true })}`,
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada'
    };
    
    // Try to extract city information
    const cities = [
      'Vancouver', 'Victoria', 'Richmond', 'Burnaby', 'Surrey', 
      'North Vancouver', 'West Vancouver', 'Whistler', 'Abbotsford',
      'Kelowna', 'Nanaimo', 'Squamish', 'Chilliwack', 'Kamloops'
    ];
    
    for (const city of cities) {
      if (locationText.includes(city)) {
        venue.city = city;
        break;
      }
    }
    
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
      { keywords: ['music', 'concert', 'festival', 'symphony', 'orchestra', 'band', 'jazz'], category: 'music' },
      { keywords: ['art', 'exhibition', 'gallery', 'museum', 'painting'], category: 'arts' },
      { keywords: ['food', 'cuisine', 'dining', 'culinary', 'wine', 'beer', 'restaurant'], category: 'food-drink' },
      { keywords: ['outdoor', 'adventure', 'hiking', 'biking', 'kayak', 'ski', 'snowboard'], category: 'outdoor' },
      { keywords: ['family', 'kid', 'children'], category: 'family' },
      { keywords: ['theater', 'theatre', 'stage', 'performance', 'play'], category: 'theatre' },
      { keywords: ['heritage', 'historic', 'cultural'], category: 'cultural' },
      { keywords: ['celebration', 'party', 'nightlife'], category: 'celebration' }
    ];
    
    for (const mapping of categoryMappings) {
      if (mapping.keywords.some(keyword => text.includes(keyword))) {
        categories.push(mapping.category);
      }
    }
    
    // If we have a date range of more than 3 days, consider it a festival
    if (text.includes('festival')) {
      categories.push('festival');
    }
    
    return categories;
  }

  /**
   * Main scraper function that extracts events from HelloBC website using Puppeteer
   * @returns {Promise<Array>} - Array of event objects
   */
  async scrape() {
    if (!this.enabled) {
      console.log(`${this.name} scraper is disabled`);
      return [];
    }
    
    console.log(`🔍 Scraping events from ${this.name} using Puppeteer...`);
    const events = [];
    let browser;
    
    try {
      // Launch Puppeteer browser
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      // Navigate to the events page
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle0', timeout: 60000 });
      
      // Wait for events to load - using selectors specific to the HelloBC events page
      await page.waitForSelector('.card, .event-card, .listing-card, .content-listing', { timeout: 15000 }).catch(() => {
        console.log('Timeout waiting for event selectors, will try to continue anyway');
      });
      
      // Allow extra time for dynamic content to load
      await page.waitForTimeout(2000);
      
      console.log('Extracting events from the page...');
      
      // Take a screenshot to debug what the page looks like
      await page.screenshot({ path: '/tmp/hellobc-events-page.png', fullPage: true });
      console.log('Took screenshot of the page for debugging');
      
      // Extract events
      const extractedEvents = await page.evaluate(() => {
        // Using selectors specific to the HelloBC events page
        const eventElements = document.querySelectorAll('.content-listing-item, .event-card, .card, .content-card');
        console.log(`Found ${eventElements.length} potential event elements on HelloBC events page`); 
        
        // If the primary selectors don't find events, try some fallback selectors
        const elements = eventElements.length > 0 ? eventElements : document.querySelectorAll('article, .listing-item, .events-list > *');
        
        return Array.from(elements).map(element => {
          // Extract event details with HelloBC-specific selectors
          const titleElement = element.querySelector('h3, h2, .card-title, .content-title, .event-name, .title');
          const title = titleElement ? titleElement.innerText.trim() : '';
          
          const descriptionElement = element.querySelector('.card-text, .description, p, .event-description, .summary');
          const description = descriptionElement ? descriptionElement.innerText.trim() : '';
          
          const dateElement = element.querySelector('.event-date, .date-range, .date, time');
          const dateText = dateElement ? dateElement.innerText.trim() : '';
          
          const locationElement = element.querySelector('.location, .venue, .event-location, .place');
          const locationText = locationElement ? locationElement.innerText.trim() : '';
          
          const imageElement = element.querySelector('img');
          const imageUrl = imageElement ? (imageElement.src || imageElement.getAttribute('data-src')) : '';
          
          const linkElement = element.querySelector('a');
          const eventUrl = linkElement ? linkElement.href : '';
          
          // Try to extract location from other elements if not found
          let extractedLocation = locationText;
          if (!extractedLocation) {
            const cityElement = element.querySelector('.city, .region');
            if (cityElement) extractedLocation = cityElement.innerText.trim();
          }
          
          // Log what we found for debugging
          console.log(`Found event: ${title || 'No title'} (${dateText || 'No date'})`);          
          
          return {
            title,
            description,
            dateText,
            locationText: extractedLocation,
            imageUrl,
            eventUrl
          };
        }).filter(event => event.title); // Filter out events with no title
      });
      
      console.log(`Found ${extractedEvents.length} events on HelloBC`);
      
      // Process each extracted event
      for (const item of extractedEvents) {
        try {
          // Skip if no title or if it appears to be a non-event article
          if (!item.title || (item.title.toLowerCase().includes('article') && !item.dateText)) continue;
          
          // Parse dates
          const { startDate, endDate } = this.parseDateRange(item.dateText);
          
          // For events without dates, try to infer dates from context or skip
          let eventDates = { startDate, endDate };
          if (!startDate && item.description && (item.description.includes('202') || item.description.match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i))) {
            // Try to extract date information from description
            const dateMatches = item.description.match(/(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*-\s*\d{1,2}(?:st|nd|rd|th)?)?\s*,\s*\d{4})/i);
            if (dateMatches) {
              eventDates = this.parseDateRange(dateMatches[0]);
            }
          }
          
          // If still no dates, create a future event based on current date
          if (!eventDates.startDate) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 14); // Two weeks from now
            eventDates.startDate = futureDate;
            
            const endDate = new Date(futureDate);
            endDate.setDate(endDate.getDate() + 1); // One day event by default
            eventDates.endDate = endDate;
          }
          
          // Parse location
          const venue = this.parseLocation(item.locationText);
          
          // Generate unique ID
          const dateStr = eventDates.startDate ? eventDates.startDate.toISOString().split('T')[0] : '';
          const eventId = `hellobc-${slugify(item.title, { lower: true })}-${dateStr}`;
          
          // Determine categories
          const categories = this.determineCategories(item.title, item.description);
          
          // Format event URL
          const fullUrl = item.eventUrl ? (item.eventUrl.startsWith('http') ? item.eventUrl : `https://www.hellobc.com${item.eventUrl}`) : this.url;
          
          // Create event object
          const event = {
            id: eventId,
            title: item.title,
            description: item.description || `${item.title} - An event in British Columbia`,
            startDate: eventDates.startDate,
            endDate: eventDates.endDate,
            venue,
            category: categories[0] || 'event',
            categories,
            sourceURL: this.url,
            officialWebsite: fullUrl,
            image: item.imageUrl,
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`✅ Added event: ${item.title}`);
        } catch (error) {
          console.error(`Error processing event:`, error);
        }
      }
      
      console.log(`🎉 Successfully scraped ${events.length} HelloBC events`);
    } catch (error) {
      console.error(`❌ Error scraping ${this.name}:`, error);
    } finally {
      // Close the browser
      if (browser) await browser.close();
    }
    
    return events;
  }
}

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new HelloBCEventsScraper();
