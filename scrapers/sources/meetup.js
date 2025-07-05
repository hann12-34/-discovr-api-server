/**
 * Meetup scraper for Discovr
 * Fetches events from Meetup API and normalizes them to the Discovr format
 */

const axios = require('axios');
const config = require('../config/config');
const helpers = require('../utils/helpers');

class MeetupScraper {
  constructor() {
    this.config = config.scrapers.meetup;
    this.commonConfig = config.scrapers.common;
    this.enabled = config.scrapers.enabled.meetup;
    this.sourceIdentifier = 'meetup';
  }

  /**
   * Fetch events from Meetup
   * @param {Object} options - Optional parameters for the scraper
   * @returns {Promise<Array>} - Array of normalized events
   */
  async scrape(options = {}) {
    if (!this.enabled) {
      console.log('Meetup scraper is disabled');
      return [];
    }

    try {
      console.log('Starting Meetup scraper...');
      
      // Use provided options or defaults
      const location = options.location || 'Vancouver, BC';
      
      // Fetch events from Meetup API
      const events = await this.fetchEvents(location);
      
      console.log(`Meetup scraper found ${events.length} events`);
      return events;
    } catch (error) {
      console.error('Error in Meetup scraper:', error.message);
      return [];
    }
  }

  /**
   * Fetch events from the Meetup API
   * @param {String} location - Location to search for events
   * @returns {Promise<Array>} - Array of events
   */
  async fetchEvents(location) {
    if (!this.config.apiKey) {
      console.warn('Meetup API key not configured. Using mock data instead.');
      return this.getMockEvents();
    }

    try {
      const params = {
        key: this.config.apiKey,
        location: location,
        radius: this.config.radius,
        topic_category: this.config.categories.join(','),
        page: this.config.maxEvents / 20 // Meetup default is 20 per page
      };
      
      const url = this.config.baseUrl;
      const response = await axios.get(url, { 
        params,
        timeout: this.commonConfig.timeout
      });
      
      if (response.status !== 200 || !response.data || !response.data.events) {
        throw new Error('Invalid response from Meetup API');
      }
      
      // Process and normalize each event
      const events = response.data.events.map(event => this.normalizeEvent(event));
      
      return events.filter(event => event !== null);
    } catch (error) {
      console.error('Error fetching from Meetup:', error.message);
      // Fallback to mock data if real API fails
      return this.getMockEvents();
    }
  }

  /**
   * Normalize a Meetup event to the Discovr format
   * @param {Object} event - Raw event from Meetup
   * @returns {Object} - Normalized event
   */
  normalizeEvent(event) {
    try {
      if (!event || !event.name) {
        return null;
      }

      // Extract venue information
      let venue = {};
      if (event.venue) {
        venue = {
          name: event.venue.name || '',
          address: event.venue.address_1 || '',
          city: event.venue.city || '',
          state: event.venue.state || '',
          country: event.venue.country || ''
        };
      }
      
      // Handle Meetup's event URL
      const sourceURL = event.link || `https://www.meetup.com/events/${event.id}`;
      
      // Determine if event is free
      const isFree = event.fee ? false : true;
      const priceRange = isFree ? 'Free' : helpers.determinePriceRange(event.fee ? event.fee.amount : 0);

      // Base normalized event
      const normalizedEvent = {
        id: event.id,
        title: event.name,
        description: event.description || '',
        image: event.featured_photo ? event.featured_photo.photo_link : '',
        startDate: event.time ? new Date(event.time) : null,
        endDate: event.duration ? new Date(event.time + event.duration) : null,
        season: helpers.mapDateToSeason(event.time ? new Date(event.time) : null),
        location: (venue.name || event.venue_name) || (event.is_online_event ? 'Online' : ''),
        venue: venue,
        category: this.mapMeetupCategory(event.group ? event.group.category : null),
        priceRange: priceRange,
        sourceURL: sourceURL,
        officialWebsite: '',
        dataSources: [this.sourceIdentifier],
        lastUpdated: new Date()
      };
      
      return helpers.normalizeEvent(normalizedEvent, this.sourceIdentifier);
    } catch (error) {
      console.error('Error normalizing Meetup event:', error);
      return null;
    }
  }

  /**
   * Maps Meetup categories to Discovr categories
   * @param {Object} category - Meetup category object
   * @returns {String} - Discovr category
   */
  mapMeetupCategory(category) {
    if (!category || !category.name) return 'Other';
    
    // Map Meetup category names to our categories
    const categoryName = category.name.toLowerCase();
    
    if (categoryName.includes('tech')) return 'Technology';
    if (categoryName.includes('career') || categoryName.includes('business')) return 'Business';
    if (categoryName.includes('art') || categoryName.includes('culture')) return 'Art';
    if (categoryName.includes('music')) return 'Music';
    if (categoryName.includes('food') || categoryName.includes('drink')) return 'Food & Drink';
    if (categoryName.includes('health') || categoryName.includes('wellness')) return 'Health';
    if (categoryName.includes('sport') || categoryName.includes('fitness')) return 'Sports & Fitness';
    if (categoryName.includes('education') || categoryName.includes('learning')) return 'Education';
    if (categoryName.includes('game') || categoryName.includes('hobby')) return 'Entertainment';
    if (categoryName.includes('community') || categoryName.includes('social')) return 'Community';
    
    return 'Other';
  }

  // No mock events - we only use real events from the API
}

module.exports = new MeetupScraper();
