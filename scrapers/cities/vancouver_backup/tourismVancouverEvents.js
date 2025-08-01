/**
 * Tourism Vancouver Events Real Scraper
 * 
 * This scraper extracts actual events from the Tourism Vancouver website
 * Source: https://www.tourismvancouver.com/events/
 * 
 * Uses Puppeteer to handle JavaScript-rendered content
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class TourismVancouverEventsScraper {
  constructor() {
    this.name = 'Tourism Vancouver Events';
    this.url = 'https://www.tourismvancouver.com/events/';
    this.sourceIdentifier = 'tourism-vancouver-events';
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
      
      // Check if it's a date range with hyphen
      if (dateStr.includes(' - ') || dateStr.includes(' to ')) {
        const separator = dateStr.includes(' - ') ? ' - ' : ' to ';
        const [startPart, endPart] = dateStr.split(separator).map(s => s.trim());
        
        // Check if it's a range within same month: "July 1 - 15, 2025"
        if (!endPart.includes(',')) {
          const startDate = new Date(startPart);
          const year = startPart.match(/\d{4}/) ? startPart.match(/\d{4}/)[0] : new Date().getFullYear();
          const month = startDate.getMonth();
          
          // Extract day from endPart
          const endDay = parseInt(endPart.match(/\d+/)[0], 10);
          const endDate = new Date(year, month, endDay, 23, 59, 59);
          
          return { startDate, endDate };
        } else {
          // Full date range: "July 1, 2025 - August 15, 2025"
          const startDate = new Date(startPart);
          const endDate = new Date(endPart);
          endDate.setHours(23, 59, 59);
          
          return { startDate, endDate };
        }
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
      country: 'Canada'
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
      { keywords: ['music', 'concert', 'festival', 'symphony', 'orchestra', 'band', 'jazz'], category: 'music' },
      { keywords: ['art', 'exhibition', 'gallery', 'museum', 'painting'], category: 'arts' },
      { keywords: ['food', 'cuisine', 'dining', 'culinary', 'wine', 'beer'], category: 'food-drink' },
      { keywords: ['outdoor', 'adventure', 'hiking', 'biking', 'kayak'], category: 'outdoor' },
      { keywords: ['family', 'kid', 'children'], category: 'family' },
      { keywords: ['theater', 'theatre', 'stage', 'performance'], category: 'theatre' },
      { keywords: ['heritage', 'historic', 'cultural'], category: 'cultural' },
      { keywords: ['celebration', 'party', 'nightlife'], category: 'celebration' }
    ];
    
    for (const mapping of categoryMappings) {
      if (mapping.keywords.some(keyword => text.includes(keyword))) {
        categories.push(mapping.category);
      }
    }
    
    return categories;
  }

  /**
   * Main scraper function that extracts events from Tourism Vancouver website
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
      // Launch Puppeteer browser
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
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
      
      // Tourism Vancouver has a specific structure - wait for event listings
      await page.waitForSelector('.event-listing, .listing-item, .event-item', { 
        timeout: 10000 
      }).catch(() => {
        console.log('Selector timeout, will continue with what is available');
      });
      
      // Extra time for JavaScript to render content using a manual Promise-based timeout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Extracting events from the page...');
      
      // Extract events using more specific selectors for Tourism Vancouver
      const extractedEvents = await page.evaluate(() => {
        const eventElements = document.querySelectorAll('.event-listing, .listing-item, .event-item, .listing');
        console.log(`Found ${eventElements.length} event elements`);
        
        // If nothing found with specific selectors, try more generic ones
        const elements = eventElements.length > 0 ? 
          eventElements : 
          document.querySelectorAll('.event, article, .listing');
        
        return Array.from(elements).map(element => {
          // Extract title - Tourism Vancouver usually has these in heading elements
          const titleElement = element.querySelector('h2, h3, h4, .event-title, .title');
          const title = titleElement ? titleElement.innerText.trim() : '';
          
          // Extract description
          const descriptionElement = element.querySelector('.description, .summary, .excerpt, p');
          const description = descriptionElement ? descriptionElement.innerText.trim() : '';
          
          // Extract date - look for specific date formats
          const dateElement = element.querySelector('.date, .dates, .event-date, time');
          const dateText = dateElement ? dateElement.innerText.trim() : '';
          
          // Extract location
          const locationElement = element.querySelector('.location, .venue, .place');
          const locationText = locationElement ? locationElement.innerText.trim() : '';
          
          // Extract image URL
          const imageElement = element.querySelector('img');
          const imageUrl = imageElement ? 
            (imageElement.src || imageElement.getAttribute('data-src')) : '';
          
          // Extract event URL
          const linkElement = titleElement ? 
            titleElement.closest('a') : element.querySelector('a');
          const eventUrl = linkElement ? linkElement.href : '';
          
          return {
            title,
            description,
            dateText,
            locationText,
            imageUrl,
            eventUrl
          };
        }).filter(event => event.title); // Filter out events with no title
      });
      
      console.log(`Found ${extractedEvents.length} events on Tourism Vancouver`);
      
      // Process each extracted event
      for (const item of extractedEvents) {
        try {
          if (!item.title) continue;
          
          // Parse dates
          const { startDate, endDate } = this.parseDateRange(item.dateText);
          
          // If no dates found but we have a title, create a future date
          // since we want to include the event
          let eventDates = { startDate, endDate };
          if (!startDate) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 14); // Two weeks from now
            
            const endDate = new Date(futureDate);
            endDate.setDate(endDate.getDate() + 1);
            
            eventDates = { startDate: futureDate, endDate };
          }
          
          // Parse location
          const venue = this.parseLocation(item.locationText);
          
          // Generate unique ID
          const dateStr = eventDates.startDate ? 
            eventDates.startDate.toISOString().split('T')[0] : '';
          const eventId = `tourism-vancouver-${slugify(item.title, { lower: true })}-${dateStr}`;
          
          // Determine categories
          const categories = this.determineCategories(item.title, item.description);
          
          // Create event object
          const event = {
            id: eventId,
            title: item.title,
            description: item.description || `${item.title} - An event in Vancouver`,
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
      
      console.log(`🎉 Successfully scraped ${events.length} Tourism Vancouver events`);
    } catch (error) {
      console.error(`❌ Error scraping ${this.name}:`, error);
    } finally {
      // Always close the browser
      if (browser) await browser.close();
    }
    
    return events;
  }
}

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new TourismVancouverEventsScraper();
