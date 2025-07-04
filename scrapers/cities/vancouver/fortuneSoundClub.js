/**
 * Fortune Sound Club Scraper
 * Scrapes events from Fortune Sound Club in Vancouver
 * Updated for new website structure in 2025
 */

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { v5: uuidv5 } = require('uuid');

// Unique namespace for generating deterministic IDs
const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';

class FortuneSoundClubScraper {
  constructor() {
    this.name = 'Fortune Sound Club';
    this.sourceIdentifier = 'fortune-sound-club';
    this.enabled = true;
    this.baseUrl = 'https://fortunesoundclub.com';
    this.eventsUrl = `${this.baseUrl}/events`;
    this.venue = {
      name: 'Fortune Sound Club',
      address: '147 E Pender St',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2801, lng: -123.1022 }
    };
  }

  /**
   * Main scraper method - uses Axios/Cheerio only, no fallbacks
   * @returns {Promise<Array>} - Scraped event data
   */
  async scrape() {
    try {
      console.log(`🎵 Scraping ${this.name} events...`);
      
      // Use Axios/Cheerio method only (no fallback)
      const events = await this.scrapeWithAxiosCheerio();
      
      console.log(`${this.name}: Found ${events.length} events`);
      return events;
    } catch (error) {
      console.error(`Error scraping ${this.name}:`, error.message);
      return [];
    }
  }

  /**
   * Scrape using Axios and Cheerio (faster but less robust)
   * @returns {Promise<Array>} - Scraped event data
   */
  async scrapeWithAxiosCheerio() {
    console.log('🎵 Scraping Fortune Sound Club events...');
    try {
      const response = await axios.get(this.eventsUrl);
      const $ = cheerio.load(response.data);
      const events = [];
      
      // Try to find events by looking for "upcoming shows" section
      const eventLinks = [];
      
      // Simple approach: find all links on the page that look like event links
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('/event/')) {
          eventLinks.push(el);
        }
      });
      
      console.log(`Found ${eventLinks.length} potential event links`);
      
      // Parse each event
      for (const el of eventLinks) {
        try {
          const event = this.parseEventElement($, el);
          if (event) {
            events.push(this.formatEvent(event));
          }
        } catch (err) {
          console.error(`Error parsing event:`, err.message);
        }
      }

      console.log(`Successfully parsed ${events.length} events from ${eventLinks.length} links`);
      
      return events;
    } catch (error) {
      console.error('Error in Axios/Cheerio scraper:', error.message);
      return [];
    }
  }

  // No Puppeteer scraper as per requirement - no fallbacks

  /**
   * Parse event element with Cheerio
   * @param {CheerioAPI} $ - Cheerio instance
   * @param {CheerioElement} el - Event element
   * @returns {Object} - Parsed event data
   */
  parseEventElement($, el) {
    try {
      // On the new website structure, each event is an <a> tag
      // The href links to the event detail page
      const link = $(el).attr('href') || '';
      if (!link) return null;
      
      // Get the full URL if it's relative
      const eventUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
      
      let title = '';
      // Only store date, not time as per requirement
      let date = new Date();
      date.setHours(0, 0, 0, 0); // Reset time to start of day
      
      // For TicketWeb links, use better parsing
      if (eventUrl.includes('ticketweb.ca/event/')) {
        // Extract real title from TicketWeb URL
        // Format is usually: https://www.ticketweb.ca/event/ARTIST-NAME-venue-name-tickets/12345
        const ticketWebPath = new URL(eventUrl).pathname;
        const pathParts = ticketWebPath.split('/');
        
        if (pathParts.length >= 3) {
          // The event name is usually the part after /event/
          const eventPart = pathParts[2];
          
          // Extract artist name before the venue
          if (eventPart.toLowerCase().includes('fortune-sound-club')) {
            const artistPart = eventPart.split('-fortune-sound-club')[0];
            title = artistPart.replace(/-/g, ' ').trim();
            title = title.replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
          } else {
            title = eventPart.replace(/-/g, ' ').trim();
            title = title.replace(/\b\w/g, l => l.toUpperCase());
          }
        }
        
        // Try to extract the date from other elements near this link
        // Look at parent containers, siblings, etc.
        const parentDiv = $(el).parent();
        const grandparentDiv = parentDiv.parent();
        
        // Common date formats we might find in text
        const dateRegex = /([A-Za-z]+\s\d{1,2}(st|nd|rd|th)?,?\s\d{4})|(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
        
        // Search in multiple locations
        const searchTexts = [
          $(parentDiv).text(),
          $(grandparentDiv).text(),
          $(el).text()
        ];
        
        // Try to find a date
        for (const text of searchTexts) {
          const match = text.match(dateRegex);
          if (match && match[0]) {
            const parsedDate = new Date(match[0]);
            // Verify it's a valid date
            if (!isNaN(parsedDate.getTime())) {
              date = parsedDate;
              date.setHours(0, 0, 0, 0); // No specific time, only date
              break;
            }
          }
        }
      } else {
        // For non-TicketWeb links, use the regular parsing
        const pathParts = link.split('/');
        const slug = pathParts[pathParts.length - 1];
        title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
      
      // Skip if we don't have essential details
      if (!title || title.length < 2) return null;
      
      return {
        title,
        description: `Event at ${this.name}`,
        startDate: date,
        image: '',
        sourceURL: eventUrl,
        officialWebsite: eventUrl,
        ticketURL: eventUrl,
        categories: ['Music', 'Nightlife']
      };
    } catch (error) {
      console.error('Error parsing event element:', error);
      return null;
    }
  }

  /**
   * Format event to match Discovr API schema
   * @param {Object} event - Raw event data
   * @returns {Object} - Formatted event
   */
  formatEvent(event) {
    // Generate deterministic ID
    const idSource = `${event.title}-${this.venue.name}-${event.startDate?.toISOString() || new Date().toISOString()}`;
    const id = uuidv5(idSource, NAMESPACE);
    
    // Format start date
    const startDate = event.startDate || new Date();
    
    return {
      id,
      title: event.title,
      name: event.title,
      description: event.description || `Event at ${this.venue.name}`,
      image: event.image || '',
      date: startDate.toISOString(),
      startDate,
      endDate: null, // Fortune Sound Club doesn't provide end dates
      season: this.determineSeason(startDate),
      category: event.categories?.[0] || 'Nightlife',
      categories: event.categories || ['Music', 'Nightlife'],
      location: this.venue.name,
      venue: this.venue,
      sourceURL: event.sourceURL || this.eventsUrl,
      officialWebsite: event.officialWebsite || this.baseUrl,
      ticketURL: event.ticketURL || '',
      dataSources: [`vancouver-${this.sourceIdentifier}`],
      lastUpdated: new Date()
    };
  }

  /**
   * Parse date string into Date object
   * @param {string} dateString - Date string
   * @returns {Date|null} - Parsed date or current date if parsing fails
   */
  parseDate(dateString) {
    try {
      if (!dateString) return new Date();
      
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: ${dateString}, using current date`);
        return new Date();
      }
      
      return date;
    } catch (error) {
      console.warn(`Error parsing date "${dateString}":`, error.message);
      return new Date();
    }
  }

  /**
   * Determine season based on date
   * @param {Date} date - Event date
   * @returns {string} - Season name
   */
  determineSeason(date) {
    const month = date.getMonth();
    
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
  }
}

// Export a single instance of the scraper
module.exports = new FortuneSoundClubScraper();
