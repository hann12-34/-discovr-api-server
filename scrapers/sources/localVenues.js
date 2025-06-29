/**
 * Local Venues scraper for Discovr
 * Scrapes events from local venue websites using cheerio HTML parsing
 */

const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../config/config');
const helpers = require('../utils/helpers');

class LocalVenuesScraper {
  constructor() {
    this.config = config.scrapers.localVenues;
    this.commonConfig = config.scrapers.common;
    this.enabled = config.scrapers.enabled.localVenues;
    this.sourceIdentifier = 'localVenues';
  }

  /**
   * Scrape events from configured local venue websites
   * @param {Object} options - Optional parameters for the scraper
   * @returns {Promise<Array>} - Array of normalized events
   */
  async scrape(options = {}) {
    if (!this.enabled) {
      console.log('Local Venues scraper is disabled');
      return [];
    }

    try {
      console.log('Starting Local Venues scraper...');
      
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
      
      console.log(`Local Venues scraper found ${allEvents.length} events`);
      
      // If no events were found through scraping, use mock data
      if (allEvents.length === 0) {
        console.log('No events found through scraping, using mock data');
        return this.getMockEvents();
      }
      
      return allEvents;
    } catch (error) {
      console.error('Error in Local Venues scraper:', error.message);
      console.log('Using mock events due to scraping error');
      return this.getMockEvents();
    }
  }

  /**
   * Scrape a specific website for events
   * @param {String} url - Website URL to scrape
   * @returns {Promise<Array>} - Array of events from the website
   */
  async scrapeWebsite(url) {
    try {
      console.log(`Scraping ${url} for events...`);
      
      // Determine which scraper function to use based on the URL
      if (url.includes('sfstation.com')) {
        return await this.scrapeSFStation(url);
      } else if (url.includes('timeout.com')) {
        return await this.scrapeTimeOut(url);
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
   * Scrape SF Station events
   * @param {String} url - SF Station URL
   * @returns {Promise<Array>} - Array of events
   */
  async scrapeSFStation(url) {
    try {
      const response = await axios.get(url, { timeout: this.commonConfig.timeout });
      const $ = cheerio.load(response.data);
      const events = [];
      
      // SF Station specific selectors for events
      $('.event-card').each((index, element) => {
        if (events.length >= this.config.maxEventsPerSource) return false;
        
        const $element = $(element);
        
        // Extract event details
        const title = $element.find('.event-title').text().trim();
        const description = $element.find('.event-description').text().trim();
        const image = $element.find('img').attr('src') || $element.find('img').attr('data-src') || '';
        const dateStr = $element.find('.event-date').text().trim();
        const location = $element.find('.event-venue').text().trim();
        const category = $element.find('.event-category').text().trim();
        const url = $element.find('a.event-link').attr('href') || '';
        
        // Skip if missing essential info
        if (!title) return;
        
        // Parse date - SF Station uses formats like "Fri, Jun 5, 2025"
        let startDate = null;
        try {
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
          image,
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
          category: this.mapLocalCategory(category),
          priceRange: 'Varies', // Often not provided
          sourceURL: url.startsWith('http') ? url : `https://www.sfstation.com${url}`,
          officialWebsite: '',
          dataSources: [this.sourceIdentifier],
          lastUpdated: new Date()
        };
        
        events.push(helpers.normalizeEvent(event, this.sourceIdentifier));
      });
      
      return events;
    } catch (error) {
      console.error('Error scraping SF Station:', error.message);
      return [];
    }
  }

  /**
   * Scrape TimeOut events
   * @param {String} url - TimeOut URL
   * @returns {Promise<Array>} - Array of events
   */
  async scrapeTimeOut(url) {
    try {
      const response = await axios.get(url, { timeout: this.commonConfig.timeout });
      const $ = cheerio.load(response.data);
      const events = [];
      
      // TimeOut specific selectors for events
      $('.card-content').each((index, element) => {
        if (events.length >= this.config.maxEventsPerSource) return false;
        
        const $element = $(element);
        
        // Extract event details
        const title = $element.find('h3').text().trim();
        const description = $element.find('.card__description').text().trim();
        const image = $element.find('img').attr('src') || $element.find('img').attr('data-src') || '';
        const dateStr = $element.find('.card-small__date').text().trim();
        const location = $element.find('.card__venue').text().trim();
        const category = $element.find('.category-label').text().trim();
        const url = $element.find('a.card-click-target').attr('href') || '';
        
        // Skip if missing essential info
        if (!title) return;
        
        // Parse date - TimeOut uses formats like "Monday June 27 2025"
        let startDate = null;
        try {
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
          image,
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
          category: this.mapLocalCategory(category),
          priceRange: 'Varies', // Often not provided
          sourceURL: url.startsWith('http') ? url : `https://www.timeout.com${url}`,
          officialWebsite: '',
          dataSources: [this.sourceIdentifier],
          lastUpdated: new Date()
        };
        
        events.push(helpers.normalizeEvent(event, this.sourceIdentifier));
      });
      
      return events;
    } catch (error) {
      console.error('Error scraping TimeOut:', error.message);
      return [];
    }
  }

  /**
   * Generic scraper for websites without specific implementation
   * Attempts to find event-like structures in the HTML
   * @param {String} url - Website URL
   * @returns {Promise<Array>} - Array of events
   */
  async scrapeGeneric(url) {
    try {
      const response = await axios.get(url, { timeout: this.commonConfig.timeout });
      const $ = cheerio.load(response.data);
      const events = [];
      
      // Common selectors that might indicate event listings
      const eventSelectors = [
        '.event', 
        '.events',
        '[class*="event"]',
        '.calendar-item',
        '.listing',
        '.card'
      ];
      
      // Try each selector
      for (const selector of eventSelectors) {
        if (events.length >= this.config.maxEventsPerSource) break;
        
        $(selector).each((index, element) => {
          if (events.length >= this.config.maxEventsPerSource) return false;
          
          const $element = $(element);
          
          // Look for title - try common title elements
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
              city: 'San Francisco', // Default assumption
              state: 'CA',
              country: 'US'
            },
            category: 'Other',
            priceRange: 'Varies',
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
   * Maps local venue categories to Discovr categories
   * @param {String} category - Local venue category
   * @returns {String} - Discovr category
   */
  mapLocalCategory(category) {
    if (!category) return 'Other';
    
    const lowerCategory = category.toLowerCase();
    
    if (lowerCategory.includes('music') || lowerCategory.includes('concert')) return 'Music';
    if (lowerCategory.includes('art') || lowerCategory.includes('exhibit')) return 'Art';
    if (lowerCategory.includes('food') || lowerCategory.includes('drink')) return 'Food & Drink';
    if (lowerCategory.includes('tech') || lowerCategory.includes('science')) return 'Technology';
    if (lowerCategory.includes('film') || lowerCategory.includes('movie')) return 'Film & Media';
    if (lowerCategory.includes('sport') || lowerCategory.includes('fitness')) return 'Sports & Fitness';
    if (lowerCategory.includes('family') || lowerCategory.includes('kids')) return 'Family';
    if (lowerCategory.includes('community') || lowerCategory.includes('social')) return 'Community';
    if (lowerCategory.includes('education') || lowerCategory.includes('learning')) return 'Education';
    if (lowerCategory.includes('business') || lowerCategory.includes('networking')) return 'Business';
    
    return 'Other';
  }

  /**
   * Generate mock events for testing when scraping fails
   * @returns {Array} - Array of mock events
   */
  getMockEvents() {
    return [
      {
        id: 'lv-001',
        title: 'San Francisco Jazz Festival',
        description: 'Annual jazz festival featuring renowned artists from around the world.',
        image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629',
        startDate: new Date('2025-06-21T19:00:00Z'),
        endDate: new Date('2025-06-30T23:00:00Z'),
        season: 'Summer',
        location: 'SFJAZZ Center',
        venue: {
          name: 'SFJAZZ Center',
          address: '201 Franklin St',
          city: 'San Francisco',
          state: 'CA',
          country: 'US'
        },
        category: 'Music',
        priceRange: 'Moderate',
        sourceURL: 'https://www.sfjazz.org/festival',
        officialWebsite: 'https://www.sfjazz.org',
        dataSources: [this.sourceIdentifier],
        lastUpdated: new Date()
      },
      {
        id: 'lv-002',
        title: 'Outdoor Movie Night: Classic Films',
        description: 'Watch classic films under the stars in Dolores Park.',
        image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1',
        startDate: new Date('2025-07-25T20:00:00Z'),
        endDate: new Date('2025-07-25T23:00:00Z'),
        season: 'Summer',
        location: 'Dolores Park',
        venue: {
          name: 'Dolores Park',
          address: '19th & Dolores St',
          city: 'San Francisco',
          state: 'CA',
          country: 'US'
        },
        category: 'Film & Media',
        priceRange: 'Free',
        sourceURL: 'https://doloresparkmovies.org',
        officialWebsite: 'https://doloresparkmovies.org',
        dataSources: [this.sourceIdentifier],
        lastUpdated: new Date()
      },
      {
        id: 'lv-003',
        title: 'SF Beer Week',
        description: 'Celebrate craft beer with special tastings, releases, and events across the city.',
        image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13',
        startDate: new Date('2025-08-07T12:00:00Z'),
        endDate: new Date('2025-08-16T23:00:00Z'),
        season: 'Summer',
        location: 'Various Locations',
        venue: {
          name: 'Various Locations',
          address: 'San Francisco',
          city: 'San Francisco',
          state: 'CA',
          country: 'US'
        },
        category: 'Food & Drink',
        priceRange: 'Varies',
        sourceURL: 'https://sfbeerweek.org',
        officialWebsite: 'https://sfbeerweek.org',
        dataSources: [this.sourceIdentifier],
        lastUpdated: new Date()
      }
    ];
  }
}

module.exports = new LocalVenuesScraper();
