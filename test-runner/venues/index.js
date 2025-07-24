/**
 * Venue scrapers coordinator
 * This module orchestrates venue-specific scrapers
 */

const { v5: uuidv5 } = require('uuid');
const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';

class VenueScraper {
  constructor() {
    this.sourceIdentifier = 'venues';
    this.enabled = true;
    this.venueScrapers = [];
  }

  /**
   * Register a venue scraper
   * @param {Object} scraper - The venue scraper to register
   */
  register(scraper) {
    this.venueScrapers.push(scraper);
    console.log(`Registered venue scraper: ${scraper.name}`);
    return this;
  }

  /**
   * Generate a deterministic UUID for an event
   * @param {Object} event - Event data
   * @returns {string} - UUID v5 string
   */
  generateEventId(event) {
    const idString = `${event.title}|${event.startDate.toISOString()}|${event.venue.name || 'unknown'}`;
    return uuidv5(idString, NAMESPACE);
  }

  /**
   * Format event data to match the common event schema
   * @param {Object} rawEvent - The raw event data from venue scraper
   * @param {string} venueName - Name of the venue
   * @returns {Object} - Formatted event object
   */
  formatEvent(rawEvent, venueName) {
    const event = {
      id: rawEvent.id || this.generateEventId(rawEvent),
      title: rawEvent.title || 'Unknown Event',
      description: rawEvent.description || '',
      image: rawEvent.image || '',
      startDate: rawEvent.startDate || new Date(),
      endDate: rawEvent.endDate || new Date(new Date(rawEvent.startDate).getTime() + (2 * 60 * 60 * 1000)),
      season: this.determineSeason(rawEvent.startDate),
      categories: rawEvent.categories || [],
      location: rawEvent.location || venueName,
      venue: {
        name: venueName,
        address: rawEvent.venue?.address || '',
        city: rawEvent.venue?.city || 'San Francisco',
        state: rawEvent.venue?.state || 'CA',
        country: rawEvent.venue?.country || 'USA',
        coordinates: rawEvent.venue?.coordinates || { lat: 0, lng: 0 }
      },
      price: rawEvent.price || { min: 0, max: 0, free: true },
      tickets: rawEvent.tickets || null,
      sourceURL: rawEvent.sourceURL || '',
      officialWebsite: rawEvent.officialWebsite || '',
      dataSources: [venueName, this.sourceIdentifier],
      lastUpdated: new Date()
    };

    return event;
  }

  /**
   * Determine season based on date
   * @param {Date} date - The event date
   * @returns {string} - Season name
   */
  determineSeason(date) {
    if (!date) return 'Unknown';
    
    const month = date.getMonth();
    
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
  }

  /**
   * Run all venue scrapers
   * @returns {Promise<Array>} - Array of events
   */
  async scrape() {
    if (!this.enabled) {
      console.log('Venue scrapers are disabled');
      return [];
    }

    console.log('Starting venue scrapers...');
    const allEvents = [];
    
    for (const scraper of this.venueScrapers) {
      try {
        console.log(`Running scraper for ${scraper.name}...`);
        const rawEvents = await scraper.scrape();
        
        if (Array.isArray(rawEvents) && rawEvents.length > 0) {
          const formattedEvents = rawEvents.map(e => this.formatEvent(e, scraper.name));
          allEvents.push(...formattedEvents);
          console.log(`${scraper.name} scraper found ${rawEvents.length} events`);
        } else {
          console.log(`${scraper.name} scraper found no events`);
        }
      } catch (error) {
        console.error(`Error in ${scraper.name} scraper:`, error.message);
      }
    }
    
    console.log(`Venue scrapers found ${allEvents.length} events in total`);
    return allEvents;
  }
}

module.exports = new VenueScraper();
