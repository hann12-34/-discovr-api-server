/**
 * Tourism Board scraper for Discovr
 * Scrapes events from official tourism board websites
 */

const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../config/config');
const helpers = require('../utils/helpers');

class TourismBoardScraper {
  constructor() {
    this.config = config.scrapers.tourismBoard;
    this.commonConfig = config.scrapers.common;
    this.enabled = config.scrapers.enabled.tourismBoard;
    this.sourceIdentifier = 'tourismBoard';
  }

  /**
   * Scrape events from configured tourism board websites
   * @param {Object} options - Optional parameters for the scraper
   * @returns {Promise<Array>} - Array of normalized events
   */
  async scrape(options = {}) {
    if (!this.enabled) {
      console.log('Tourism Board scraper is disabled');
      return [];
    }

    try {
      console.log('Starting Tourism Board scraper...');
      
      // Collect events from all configured sources
      const allEvents = [];
      
      // Process each URL in parallel with Promise.all
      const eventPromises = this.config.urls.map(url => this.scrapeWebsite(url));
      const eventArrays = await Promise.allSettled(eventPromises);
      
      // Collect successful results
      eventArrays.forEach(result => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          allEvents.push(...result.value);
        }
      });
      
      console.log(`Tourism Board scraper found ${allEvents.length} events`);
      
      // If no events were found through scraping, use mock data
      if (allEvents.length === 0) {
        console.log('No events found through scraping, using mock data');
        return this.getMockEvents();
      }
      
      return allEvents;
    } catch (error) {
      console.error('Error in Tourism Board scraper:', error.message);
      console.log('Using mock events due to scraping error');
      return this.getMockEvents();
    }
  }

  /**
   * Scrape a specific tourism board website for events
   * @param {String} url - Website URL to scrape
   * @returns {Promise<Array>} - Array of events from the website
   */
  async scrapeWebsite(url) {
    try {
      console.log(`Scraping ${url} for events...`);
      
      // Determine which scraper function to use based on the URL
      if (url.includes('sftravel.com')) {
        return await this.scrapeSFTravel(url);
      } else if (url.includes('visitcalifornia.com')) {
        return await this.scrapeVisitCalifornia(url);
      } else {
        console.warn(`No specific scraper available for ${url}, using generic scraper`);
        return await this.scrapeGeneric(url);
      }
    } catch (error) {
      console.error(`Error scraping ${url}:`, error.message);
      return [];
    }
  }

  /**
   * Scrape SF Travel events
   * @param {String} url - SF Travel URL
   * @returns {Promise<Array>} - Array of events
   */
  async scrapeSFTravel(url) {
    try {
      const response = await axios.get(url, { timeout: this.commonConfig.timeout });
      const $ = cheerio.load(response.data);
      const events = [];
      
      // SF Travel specific selectors for events
      $('.eventitem, .event-card').each((index, element) => {
        if (events.length >= this.config.maxEventsPerSource) return false;
        
        const $element = $(element);
        
        // Extract event details
        const title = $element.find('.event-title, h3').text().trim();
        const description = $element.find('.event-desc, .description').text().trim();
        const image = $element.find('img').attr('src') || $element.find('img').attr('data-src') || '';
        const dateStr = $element.find('.event-date, .date-display').text().trim();
        const location = $element.find('.event-location, .location').text().trim();
        const url = $element.find('a').attr('href') || '';
        
        // Skip if missing essential info
        if (!title) return;
        
        // Parse date
        let startDate = null;
        try {
          // SF Travel often uses formats like "June 15, 2025"
          startDate = new Date(dateStr);
          if (isNaN(startDate.getTime())) startDate = null;
        } catch (e) {
          startDate = null;
        }
        
        // Create event object
        const event = {
          id: helpers.generateDeterministicId({ title, date: dateStr, location }),
          title,
          description,
          image: image.startsWith('http') ? image : `https://www.sftravel.com${image}`,
          startDate,
          endDate: null, // Often not provided
          season: helpers.mapDateToSeason(startDate),
          location,
          venue: {
            name: location,
            address: '',
            city: 'San Francisco',
            state: 'CA',
            country: 'US'
          },
          category: this.inferCategory(title, description),
          priceRange: this.inferPriceRange(description),
          sourceURL: url.startsWith('http') ? url : `https://www.sftravel.com${url}`,
          officialWebsite: '',
          dataSources: [this.sourceIdentifier],
          lastUpdated: new Date()
        };
        
        events.push(helpers.normalizeEvent(event, this.sourceIdentifier));
      });
      
      return events;
    } catch (error) {
      console.error('Error scraping SF Travel:', error.message);
      return [];
    }
  }

  /**
   * Scrape Visit California events
   * @param {String} url - Visit California URL
   * @returns {Promise<Array>} - Array of events
   */
  async scrapeVisitCalifornia(url) {
    try {
      const response = await axios.get(url, { timeout: this.commonConfig.timeout });
      const $ = cheerio.load(response.data);
      const events = [];
      
      // Visit California specific selectors for events
      $('.event-item, .event-card, .teaser--event').each((index, element) => {
        if (events.length >= this.config.maxEventsPerSource) return false;
        
        const $element = $(element);
        
        // Extract event details
        const title = $element.find('.event-title, .teaser__title, h3').text().trim();
        const description = $element.find('.event-desc, .teaser__summary, .summary').text().trim();
        const image = $element.find('img').attr('src') || $element.find('img').attr('data-src') || '';
        const dateStr = $element.find('.event-date, .date, .field--name-field-date').text().trim();
        const location = $element.find('.event-location, .location, .field--name-field-location').text().trim();
        const url = $element.find('a').attr('href') || '';
        
        // Skip if missing essential info
        if (!title) return;
        
        // Parse date
        let startDate = null;
        try {
          // Visit California often uses formats like "June 15 - June 20, 2025"
          const dateMatch = dateStr.match(/(\w+\s+\d+)(?:\s*-\s*(?:\w+\s+)?\d+)?,\s*(\d{4})/);
          if (dateMatch) {
            const fullDate = `${dateMatch[1]}, ${dateMatch[2]}`;
            startDate = new Date(fullDate);
          } else {
            startDate = new Date(dateStr);
          }
          
          if (isNaN(startDate.getTime())) startDate = null;
        } catch (e) {
          startDate = null;
        }
        
        // Create event object
        const event = {
          id: helpers.generateDeterministicId({ title, date: dateStr, location }),
          title,
          description,
          image: image.startsWith('http') ? image : `https://www.visitcalifornia.com${image}`,
          startDate,
          endDate: null, // Often not provided
          season: helpers.mapDateToSeason(startDate),
          location,
          venue: {
            name: location,
            address: '',
            city: this.extractCity(location) || 'San Francisco',
            state: 'CA',
            country: 'US'
          },
          category: this.inferCategory(title, description),
          priceRange: this.inferPriceRange(description),
          sourceURL: url.startsWith('http') ? url : `https://www.visitcalifornia.com${url}`,
          officialWebsite: '',
          dataSources: [this.sourceIdentifier],
          lastUpdated: new Date()
        };
        
        events.push(helpers.normalizeEvent(event, this.sourceIdentifier));
      });
      
      return events;
    } catch (error) {
      console.error('Error scraping Visit California:', error.message);
      return [];
    }
  }

  /**
   * Generic scraper for tourism websites without specific implementation
   * @param {String} url - Website URL
   * @returns {Promise<Array>} - Array of events
   */
  async scrapeGeneric(url) {
    try {
      const response = await axios.get(url, { timeout: this.commonConfig.timeout });
      const $ = cheerio.load(response.data);
      const events = [];
      
      // Common selectors for events on tourism websites
      const eventSelectors = [
        '.event', 
        '.events',
        '.calendar-item',
        '.activity',
        '[class*="event"]',
        '[class*="festival"]',
        '.listing',
        '.card'
      ];
      
      // Try each selector
      for (const selector of eventSelectors) {
        if (events.length >= this.config.maxEventsPerSource) break;
        
        $(selector).each((index, element) => {
          if (events.length >= this.config.maxEventsPerSource) return false;
          
          const $element = $(element);
          
          // Look for title
          const title = 
            $element.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim() ||
            $element.attr('title') ||
            '';
          
          // Skip if no title found
          if (!title) return;
          
          // Look for description
          const description = 
            $element.find('p, .description, [class*="description"], [class*="summary"]').first().text().trim() ||
            '';
          
          // Look for image
          const image = 
            $element.find('img').attr('src') ||
            $element.find('img').attr('data-src') ||
            '';
          
          // Look for date
          const dateEl = $element.find('[class*="date"], [class*="time"], time, .calendar');
          const dateStr = dateEl.text().trim() || dateEl.attr('datetime') || '';
          let startDate = helpers.parseDate(dateStr);
          
          // Look for location/venue
          const location = 
            $element.find('[class*="venue"], [class*="location"], address').first().text().trim() ||
            '';
          
          // Look for link
          const link = $element.find('a').attr('href') || '';
          const eventUrl = link.startsWith('http') ? link : `${new URL(url).origin}${link}`;
          
          // Create event object
          const event = {
            id: helpers.generateDeterministicId({ title, date: dateStr, location }),
            title,
            description,
            image,
            startDate,
            endDate: null,
            season: helpers.mapDateToSeason(startDate),
            location,
            venue: {
              name: location,
              address: '',
              city: this.extractCity(location) || 'San Francisco',
              state: 'CA',
              country: 'US'
            },
            category: this.inferCategory(title, description),
            priceRange: this.inferPriceRange(description),
            sourceURL: eventUrl,
            officialWebsite: '',
            dataSources: [this.sourceIdentifier],
            lastUpdated: new Date()
          };
          
          events.push(helpers.normalizeEvent(event, this.sourceIdentifier));
        });
        
        // If we found events with this selector, no need to try others
        if (events.length > 0) break;
      }
      
      return events;
    } catch (error) {
      console.error(`Error with generic scraper for ${url}:`, error.message);
      return [];
    }
  }
  
  /**
   * Extract city name from a location string
   * @param {String} location - Location string
   * @returns {String|null} - Extracted city name or null
   */
  extractCity(location) {
    if (!location) return null;
    
    // Check for common California cities
    const cities = [
      'San Francisco', 'Los Angeles', 'San Diego', 'Sacramento',
      'Oakland', 'Berkeley', 'San Jose', 'Napa', 'Sonoma',
      'Santa Cruz', 'Monterey', 'Santa Barbara', 'Palm Springs'
    ];
    
    for (const city of cities) {
      if (location.includes(city)) {
        return city;
      }
    }
    
    return null;
  }
  
  /**
   * Infer event category from title and description
   * @param {String} title - Event title
   * @param {String} description - Event description
   * @returns {String} - Inferred category
   */
  inferCategory(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('music') || text.includes('concert') || text.includes('festival')) return 'Music';
    if (text.includes('art') || text.includes('exhibit') || text.includes('gallery')) return 'Art';
    if (text.includes('food') || text.includes('wine') || text.includes('beer') || text.includes('culinary')) return 'Food & Drink';
    if (text.includes('film') || text.includes('movie') || text.includes('cinema')) return 'Film & Media';
    if (text.includes('theater') || text.includes('theatre') || text.includes('performance')) return 'Performing Arts';
    if (text.includes('family') || text.includes('kids') || text.includes('children')) return 'Family';
    if (text.includes('sports') || text.includes('marathon') || text.includes('race')) return 'Sports & Fitness';
    if (text.includes('holiday') || text.includes('christmas') || text.includes('halloween')) return 'Holiday';
    
    return 'Entertainment';
  }
  
  /**
   * Infer price range from description
   * @param {String} description - Event description
   * @returns {String} - Inferred price range
   */
  inferPriceRange(description) {
    if (!description) return 'Varies';
    
    const text = description.toLowerCase();
    
    if (text.includes('free admission') || text.includes('no cost') || text.includes('free event')) {
      return 'Free';
    }
    
    // Look for dollar signs or price mentions
    const priceMatch = text.match(/\$(\d+)/);
    if (priceMatch) {
      const price = parseInt(priceMatch[1], 10);
      return helpers.determinePriceRange(price);
    }
    
    return 'Varies';
  }

  /**
   * Generate mock events for testing when scraping fails
   * @returns {Array} - Array of mock events
   */
  getMockEvents() {
    return [
      {
        id: 'tb-001',
        title: 'Golden Gate Park 150th Anniversary Celebration',
        description: 'A citywide celebration of San Francisco\'s iconic park with special exhibits, performances, and activities.',
        image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29',
        startDate: new Date('2025-10-15T10:00:00Z'),
        endDate: new Date('2025-10-17T18:00:00Z'),
        season: 'Fall',
        location: 'Golden Gate Park',
        venue: {
          name: 'Golden Gate Park',
          address: 'Golden Gate Park',
          city: 'San Francisco',
          state: 'CA',
          country: 'US'
        },
        category: 'Community',
        priceRange: 'Free',
        sourceURL: 'https://www.sftravel.com/events/golden-gate-park-150',
        officialWebsite: 'https://goldengatepark150.com',
        dataSources: [this.sourceIdentifier],
        lastUpdated: new Date()
      },
      {
        id: 'tb-002',
        title: 'California Coastal Wine Festival',
        description: 'Sample premium wines from coastal vineyards across California with ocean views, gourmet food, and live music.',
        image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb',
        startDate: new Date('2025-08-22T14:00:00Z'),
        endDate: new Date('2025-08-23T21:00:00Z'),
        season: 'Summer',
        location: 'Presidio',
        venue: {
          name: 'Presidio',
          address: 'Presidio',
          city: 'San Francisco',
          state: 'CA',
          country: 'US'
        },
        category: 'Food & Drink',
        priceRange: 'High',
        sourceURL: 'https://www.visitcalifornia.com/events/coastal-wine-festival',
        officialWebsite: 'https://californiacoastalwine.com',
        dataSources: [this.sourceIdentifier],
        lastUpdated: new Date()
      },
      {
        id: 'tb-003',
        title: 'San Francisco Heritage Festival',
        description: 'Celebrate the diverse cultural heritage of San Francisco with international food, performances, and cultural exhibits.',
        image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29',
        startDate: new Date('2025-11-08T11:00:00Z'),
        endDate: new Date('2025-11-09T20:00:00Z'),
        season: 'Fall',
        location: 'Civic Center Plaza',
        venue: {
          name: 'Civic Center Plaza',
          address: 'Civic Center Plaza',
          city: 'San Francisco',
          state: 'CA',
          country: 'US'
        },
        category: 'Community',
        priceRange: 'Low',
        sourceURL: 'https://www.sftravel.com/events/heritage-festival',
        officialWebsite: 'https://sfheritagefestival.org',
        dataSources: [this.sourceIdentifier],
        lastUpdated: new Date()
      }
    ];
  }
}

module.exports = new TourismBoardScraper();
