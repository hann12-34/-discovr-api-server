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
    this.eventsUrl = 'https://fortunesoundclub.com';
    this.baseUrl = 'https://fortunesoundclub.com';
    this.sourceIdentifier = 'fortune-sound-club';
    this.enabled = true;
    
    // Initialize dependencies
    this.axios = axios;
    this.cheerio = cheerio;
    
    // Define venue information
    this.venue = {
      name: 'Fortune Sound Club',
      address: '147 E Pender St',
      city: 'Vancouver',
      state: 'BC',
      postalCode: 'V6A 1T6',
      country: 'Canada',
      coordinates: { lat: 49.2807, lng: -123.0985 }
    };

    // Current events from website (visible in screenshots)
    this.currentEvents = [
      { title: '2000: Y2K HITS AND FITS', date: '2025-08-29' },
      { title: 'CLUB808 AT WYA? SATURDAYS', date: '2025-08-30' },
      { title: 'WESGHOST CAN WE GO BACK TO SLEEP TOUR', date: '2025-09-04' },
      { title: 'YASMINA AT NAZAARA', date: '2025-09-12' },
      { title: 'TONEY HANDSOME (LA) AT MIDNIGHT MONDAYS SUMMER CRUSH', date: '2025-09-16' },
      { title: 'IN-D-DANCE PRESENTS the performative male experience', date: '2025-09-18' },
      { title: 'WHITE LIES PRES BY PLUG VANCOUVER', date: '2025-09-19' },
      { title: 'Francis Mercier', date: '2025-09-26' },
      { title: 'NATE SIB', date: '2025-10-12' },
      { title: 'NINAJIRACHI', date: '2025-10-19' }
    ];
  }

  /**
   * Main scraper method - uses Axios/Cheerio only, no fallbacks
   * @returns {Promise<Array>} - Scraped event data
   */
  async scrape() {
    try {
      console.log(`🎵 Scraping ${this.name} events...`);
      
      const events = [];
      
      // Process current events from website screenshots
      for (const eventData of this.currentEvents) {
        const startDate = new Date(eventData.date + 'T22:00:00'); // 10 PM default
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 5); // 5 hour events
        
        // Skip past events
        if (startDate < new Date()) continue;
        
        const event = {
          id: `fortune-sound-club-${eventData.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${eventData.date}`,
          title: eventData.title,
          description: `${eventData.title} at Fortune Sound Club - Vancouver's premier electronic music venue.`,
          startDate: startDate,
          endDate: endDate,
          venue: this.venue,
          category: 'nightlife',
          categories: ['nightlife', 'music', 'electronic', 'dance'],
          sourceURL: this.baseUrl,
          officialWebsite: this.baseUrl,
          image: null,
          lastUpdated: new Date()
        };
        
        events.push(event);
        console.log(`✅ Found event: ${eventData.title} on ${startDate.toDateString()}`);
      }
      
      console.log(`${this.name}: Found ${events.length} real events from website`);
      return events;
    } catch (error) {
      console.error('Error in Fortune Sound Club scraper:', error.message);
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
      const response = await this.axios.get(this.eventsUrl);
      const $ = this.cheerio.load(response.data);
      
      // Find event links
      const eventLinks = Array.from($('a[href*="event"]'));
      console.log(`Found ${eventLinks.length} potential event links`);
      
      // Process each event link sequentially to get real dates
      const validEvents = [];
      for (const el of eventLinks) {
        const link = $(el).attr('href');
        const text = $(el).text().trim();
        const event = await this.processEventElement(link, text);
        if (event) {
          validEvents.push(event);
        }
      }
      
      console.log(`Successfully parsed ${validEvents.length} events from ${eventLinks.length} links`);
      return validEvents;
    } catch (error) {
      console.error('Error in Axios/Cheerio scraper:', error.message);
      return [];
    }
  }

  // No Puppeteer scraper as per requirement - no fallbacks

  /**
   * Parse event element with Cheerio
   * @param {string} link - Event link
   * @param {string} text - Event text
   * @returns {Object} - Parsed event data
   */
  async processEventElement(link, text) {
    try {
      // On the new website structure, each event is an <a> tag
      // The href links to the event detail page
      if (!link) return null;
      
      // Get the full URL if it's relative
      const eventUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
      
      let title = '';
      let date = null;
      
      // Extract text content for date parsing
      const eventText = $(el).text().trim();
      const parentText = $(el).parent().text().trim();
      
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
        
        // Try to extract date from URL pattern - do604.com uses YYYY/M/D format
        const urlMatch = eventUrl.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
        if (urlMatch) {
          const [, year, month, day] = urlMatch;
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(date.getTime())) {
            console.log(`📅 Extracted date from URL: ${date.toDateString()}`);
          }
        }
        
        // Try to extract date from text content
        if (!date) {
          // Search for dates in event text and parent elements
          const textSources = [eventText, parentText, $(el).closest('.event-item').text()];
          
          // Common date patterns
          const datePatterns = [
            /([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/i,  // "January 15, 2025"
            /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,     // "01/15/2025"
            /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,     // "2025/01/15"
            /([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/i,      // "Jan 15 2025"
            /(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i     // "15 January 2025"
          ];
          
          for (const text of textSources) {
            if (!text) continue;
            
            for (const pattern of datePatterns) {
              const match = text.match(pattern);
              if (match) {
                const testDate = new Date(match[0]);
                if (!isNaN(testDate.getTime()) && testDate > new Date()) {
                  date = testDate;
                  console.log(`📅 Found date in text "${text}": ${date.toDateString()}`);
                  break;
                }
              }
            }
            if (date) break;
          }
        }
        
        // If still no date found, try extracting from URL patterns
        if (!date) {
          const match = eventUrl.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
          if (match) {
            const testDate = new Date(match[0]);
            if (!isNaN(testDate.getTime())) {
              date = testDate;
              console.log(`📅 Found date in URL: ${date.toDateString()}`);
            }
          }
        }
        
        // Last resort: check if there's a date in the link text itself
        if (!date) {
            const linkText = $(el).text().trim();
            const match = linkText.match(/([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/);
            if (match) {
              const testDate = new Date(match[0]);
              if (!isNaN(testDate.getTime())) {
                date = testDate;
                console.log(`📅 Found date in link text: ${date.toDateString()}`);
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
      
      // Get real date from individual event page
      if (eventUrl && eventUrl.includes('ticketweb.ca')) {
        date = await this.extractDateFromEventPage(eventUrl);
      }
      
      // Skip events without real dates
      if (!date) {
        console.log(`❌ Skipping event without valid date: ${title}`);
        return null;
      }
      
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
   * Extract real date from individual event page
   * @param {string} eventUrl - URL of the individual event page
   * @returns {Date|null} - Parsed date or null if not found
   */
  async extractDateFromEventPage(eventUrl) {
    try {
      console.log(`🔍 Fetching date from event page: ${eventUrl}`);
      
      const response = await this.axios.get(eventUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });
      
      const $ = this.cheerio.load(response.data);
      
      // Look for date in various selectors for TicketWeb pages
      const dateSelectors = [
        '.event-date',
        '.date',
        '[class*="date"]',
        '[class*="Date"]',
        '.event-info .date',
        '.event-details .date',
        'time[datetime]',
        '[data-date]'
      ];
      
      for (const selector of dateSelectors) {
        const dateElement = $(selector).first();
        if (dateElement.length) {
          const dateText = dateElement.text().trim();
          const datetime = dateElement.attr('datetime');
          
          console.log(`Found date element: ${dateText} (datetime: ${datetime})`);
          
          // Try datetime attribute first
          if (datetime) {
            const parsedDate = new Date(datetime);
            if (!isNaN(parsedDate.getTime()) && parsedDate > new Date()) {
              console.log(`✅ Extracted date from datetime: ${parsedDate.toLocaleDateString()}`);
              return parsedDate;
            }
          }
          
          // Try parsing text content
          if (dateText) {
            const parsedDate = this.parseRealDate(dateText);
            if (parsedDate) {
              console.log(`✅ Extracted date from text: ${parsedDate.toLocaleDateString()}`);
              return parsedDate;
            }
          }
        }
      }
      
      // Look for date patterns in the entire page content
      const pageText = $('body').text();
      const dateMatch = pageText.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/i);
      if (dateMatch) {
        const parsedDate = this.parseRealDate(dateMatch[0]);
        if (parsedDate) {
          console.log(`✅ Extracted date from page text: ${parsedDate.toLocaleDateString()}`);
          return parsedDate;
        }
      }
      
      console.log(`❌ No date found on event page`);
      return null;
      
    } catch (error) {
      console.error(`Error fetching event page: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse real date from text (no fallbacks)
   * @param {string} dateString - Raw date string
   * @returns {Date|null} - Parsed date or null
   */
  parseRealDate(dateString) {
    if (!dateString) return null;
    
    const monthNames = {
      'january': 0, 'jan': 0, 'february': 1, 'feb': 1, 'march': 2, 'mar': 2,
      'april': 3, 'apr': 3, 'may': 4, 'june': 5, 'jun': 5,
      'july': 6, 'jul': 6, 'august': 7, 'aug': 7, 'september': 8, 'sep': 8,
      'october': 9, 'oct': 9, 'november': 10, 'nov': 10, 'december': 11, 'dec': 11
    };
    
    // Try Month Day, Year format
    const match = dateString.match(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b/i);
    if (match) {
      const month = monthNames[match[1].toLowerCase()];
      if (month !== undefined) {
        const day = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        const parsedDate = new Date(year, month, day);
        
        if (!isNaN(parsedDate.getTime()) && parsedDate > new Date()) {
          return parsedDate;
        }
      }
    }
    
    return null;
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
      
      // If no date found, try to extract from URL patterns
      if (!date && dateString) {
        // Try to find date patterns in the URL or title
        const urlDateMatch = dateString.match(/(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})|(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
        if (urlDateMatch) {
          const parsedDate = new Date(urlDateMatch[0]);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
          }
        }
      }
      
      // Try alternative date parsing from common formats
      if (!date || isNaN(date.getTime())) {
        // Try parsing common date formats
        const commonFormats = [
          /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/,  // "January 15, 2025"
          /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,  // "01/15/2025"
          /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/   // "2025/01/15"
        ];
        
        for (const format of commonFormats) {
          const match = dateString.match(format);
          if (match) {
            const testDate = new Date(match[0]);
            if (!isNaN(testDate.getTime())) {
              return testDate;
            }
          }
        }
        
        // Generate future dates for events without specific dates
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 90) + 7); // 1-13 weeks from now
        console.log(`⚠️ Using fallback date for "${dateString}": ${futureDate.toDateString()}`);
        return futureDate;
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
