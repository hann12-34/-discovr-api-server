/**
 * Eventbrite scraper for Discovr
 * Fetches events from Eventbrite API and normalizes them to the Discovr format
 */

const axios = require('axios');
const config = require('../config/config');
const helpers = require('../utils/helpers');

class EventbriteScraper {
  constructor() {
    this.config = config.scrapers.eventbrite;
    this.commonConfig = config.scrapers.common;
    this.enabled = config.scrapers.enabled.eventbrite;
    this.sourceIdentifier = 'eventbrite';
  }

  /**
   * Fetch events from Eventbrite
   * @param {Object} options - Optional parameters for the scraper
   * @returns {Promise<Array>} - Array of normalized events
   */
  async scrape(options = {}) {
    if (!this.enabled) {
      console.log('Eventbrite scraper is disabled');
      return [];
    }

    try {
      console.log('Starting Eventbrite scraper...');
      
      // Use provided options or defaults
      const location = options.location || 'San Francisco';
      const startDate = options.startDate || new Date().toISOString();
      const endDate = options.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days from now
      
      // Fetch events from Eventbrite API
      const events = await this.fetchEvents(location, startDate, endDate);
      
      console.log(`Eventbrite scraper found ${events.length} events`);
      return events;
    } catch (error) {
      console.error('Error in Eventbrite scraper:', error.message);
      return [];
    }
  }

  /**
   * Fetch events from the Eventbrite API
   * @param {String} location - Location to search for events
   * @param {String} startDate - Start date in ISO format
   * @param {String} endDate - End date in ISO format
   * @returns {Promise<Array>} - Array of events
   */
  async fetchEvents(location, startDate, endDate) {
    if (!this.config.apiKey) {
      console.warn('Eventbrite API key not configured. Using mock data instead.');
      return this.getMockEvents();
    }

    try {
      const params = {
        location: {
          address: location
        },
        location_radius: this.config.locationRadius,
        start_date: startDate,
        end_date: endDate,
        categories: this.config.categories.join(','),
        expand: 'venue,ticket_availability',
        token: this.config.apiKey
      };
      
      const url = `${this.config.baseUrl}events/search/`;
      const response = await axios.get(url, { 
        params,
        timeout: this.commonConfig.timeout
      });
      
      if (response.status !== 200 || !response.data || !response.data.events) {
        throw new Error('Invalid response from Eventbrite API');
      }
      
      // Process and normalize each event
      const events = response.data.events.map(event => this.normalizeEvent(event));
      
      return events.filter(event => event !== null);
    } catch (error) {
      console.error('Error fetching from Eventbrite:', error.message);
      // Fallback to mock data if real API fails
      return this.getMockEvents();
    }
  }

  /**
   * Normalize an Eventbrite event to the Discovr format
   * @param {Object} event - Raw event from Eventbrite
   * @returns {Object} - Normalized event
   */
  normalizeEvent(event) {
    try {
      if (!event || !event.name || !event.name.text) {
        return null;
      }

      // Extract image URL
      let imageUrl = '';
      if (event.logo && event.logo.original && event.logo.original.url) {
        imageUrl = event.logo.original.url;
      }
      
      // Extract venue information
      let venue = {};
      if (event.venue) {
        venue = {
          name: event.venue.name || '',
          address: event.venue.address ? event.venue.address.localized_address_display || '' : '',
          city: event.venue.address ? event.venue.address.city || '' : '',
          state: event.venue.address ? event.venue.address.region || '' : '',
          country: event.venue.address ? event.venue.address.country || '' : ''
        };
      }
      
      // Extract price information
      let priceRange = 'Free';
      if (event.ticket_availability && 
          event.ticket_availability.minimum_ticket_price && 
          event.ticket_availability.minimum_ticket_price.value > 0) {
        const price = parseFloat(event.ticket_availability.minimum_ticket_price.value);
        priceRange = helpers.determinePriceRange(price);
      }

      // Base normalized event
      const normalizedEvent = {
        id: event.id,
        title: event.name.text,
        description: event.description ? event.description.text : '',
        image: imageUrl,
        startDate: event.start.utc,
        endDate: event.end.utc,
        season: helpers.mapDateToSeason(new Date(event.start.utc)),
        location: venue.name || event.online_event ? 'Online' : '',
        venue: venue,
        category: this.mapEventbriteCategory(event.category_id),
        priceRange: priceRange,
        sourceURL: event.url,
        officialWebsite: '',
        dataSources: [this.sourceIdentifier],
        lastUpdated: new Date()
      };
      
      return helpers.normalizeEvent(normalizedEvent, this.sourceIdentifier);
    } catch (error) {
      console.error('Error normalizing Eventbrite event:', error);
      return null;
    }
  }

  /**
   * Maps Eventbrite category IDs to Discovr categories
   * @param {String} categoryId - Eventbrite category ID
   * @returns {String} - Discovr category
   */
  mapEventbriteCategory(categoryId) {
    // Map Eventbrite category IDs to our categories
    const categoryMap = {
      '101': 'Business',
      '102': 'Technology',
      '103': 'Music',
      '104': 'Film & Media',
      '105': 'Arts',
      '106': 'Fashion',
      '107': 'Health',
      '108': 'Sports & Fitness',
      '109': 'Travel & Outdoor',
      '110': 'Food & Drink',
      '111': 'Charity & Causes',
      '112': 'Government',
      '113': 'Community',
      '114': 'Spirituality',
      '115': 'Family & Education',
      '116': 'Holiday',
      '117': 'Home & Lifestyle',
      '118': 'Auto, Boat & Air',
      '119': 'Hobbies',
      '120': 'School Activities',
      '199': 'Other'
    };
    
    return categoryMap[categoryId] || 'Other';
  }

  /**
   * Generate mock events for testing or when API is unavailable
   * @returns {Array} - Array of mock events
   */
  getMockEvents() {
    return [
      {
        id: 'eb-001',
        title: 'Tech Conference 2025',
        description: 'Join us for the biggest tech conference in San Francisco featuring keynotes from industry leaders.',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
        startDate: new Date('2025-09-15T09:00:00Z'),
        endDate: new Date('2025-09-17T18:00:00Z'),
        season: 'Fall',
        location: 'Moscone Center',
        venue: {
          name: 'Moscone Center',
          address: '747 Howard St',
          city: 'San Francisco',
          state: 'CA',
          country: 'US'
        },
        category: 'Technology',
        priceRange: 'High',
        sourceURL: 'https://example.com/tech-conference-2025',
        officialWebsite: 'https://techconference2025.com',
        dataSources: [this.sourceIdentifier],
        lastUpdated: new Date()
      },
      {
        id: 'eb-002',
        title: 'Summer Music Festival',
        description: 'A weekend of amazing performances from top artists across multiple genres.',
        image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3',
        startDate: new Date('2025-07-10T10:00:00Z'),
        endDate: new Date('2025-07-12T23:00:00Z'),
        season: 'Summer',
        location: 'Golden Gate Park',
        venue: {
          name: 'Golden Gate Park',
          address: 'Golden Gate Park',
          city: 'San Francisco',
          state: 'CA',
          country: 'US'
        },
        category: 'Music',
        priceRange: 'Moderate',
        sourceURL: 'https://example.com/summer-music-festival',
        officialWebsite: 'https://summermusicfest.com',
        dataSources: [this.sourceIdentifier],
        lastUpdated: new Date()
      },
      {
        id: 'eb-003',
        title: 'Wine Tasting Experience',
        description: 'Sample premium wines from California\'s best vineyards with expert sommeliers.',
        image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3',
        startDate: new Date('2025-08-20T18:30:00Z'),
        endDate: new Date('2025-08-20T21:30:00Z'),
        season: 'Summer',
        location: 'Ferry Building',
        venue: {
          name: 'Ferry Building',
          address: '1 Ferry Building',
          city: 'San Francisco',
          state: 'CA',
          country: 'US'
        },
        category: 'Food & Drink',
        priceRange: 'Moderate',
        sourceURL: 'https://example.com/wine-tasting',
        officialWebsite: 'https://sfwinetasting.com',
        dataSources: [this.sourceIdentifier],
        lastUpdated: new Date()
      }
    ];
  }
}

module.exports = new EventbriteScraper();
