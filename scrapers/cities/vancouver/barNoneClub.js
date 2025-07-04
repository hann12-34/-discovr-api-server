/**
 * Bar None Club Events Scraper
 * 
 * This scraper extracts events from Bar None Club's website:
 * https://www.barnoneclub.com/eventscalendar
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class BarNoneClubScraper {
  constructor() {
    this.name = 'Bar None Club';
    this.url = 'https://www.barnoneclub.com/eventscalendar';
    this.sourceIdentifier = 'bar-none-club';
    
    // Define venue with proper object structure
    this.venue = {
      name: 'Bar None Club',
      id: 'bar-none-club',
      address: '1222 Hamilton Street',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V6B 2S8',
      coordinates: {
        lat: 49.2760,
        lng: -123.1231
      },
      websiteUrl: 'https://www.barnoneclub.com',
      description: 'This nightlife pillar has proudly served Yaletown and Vancouver for almost 30 years. Located in a converted warehouse, the venue is highlighted by exposed wood beams and brick.'
    };
  }

  /**
   * Parse date and time from event information
   * @param {string} dateString - Date string from webpage (e.g. "Fri, Jul 04")
   * @param {string} timeString - Optional time string (default to 10:00 PM if not provided)
   * @returns {Date} - JavaScript Date object
   */
  parseEventDateTime(dateString, timeString = '22:00') {
    try {
      // Extract components from date string like "Fri, Jul 04"
      const match = dateString.match(/([A-Za-z]+),\s+([A-Za-z]+)\s+(\d+)/);
      if (!match) return new Date(); // Return current date if no match
      
      const [, dayOfWeek, month, day] = match;
      
      // Get current year
      const currentYear = new Date().getFullYear();
      
      // Convert month name to month number (0-indexed)
      const months = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const monthNum = months[month];
      if (monthNum === undefined) return new Date(); // Return current date if month not recognized
      
      // Parse time if provided (format: "22:00" or "10:00 PM")
      let hours = 22; // Default to 10:00 PM
      let minutes = 0;
      
      if (timeString) {
        if (timeString.includes(':')) {
          const [hourStr, minStr] = timeString.split(':');
          hours = parseInt(hourStr, 10);
          
          // Handle minutes and potential AM/PM
          if (minStr.includes('PM') && hours < 12) {
            hours += 12;
            minutes = parseInt(minStr.replace('PM', ''), 10);
          } else if (minStr.includes('AM') && hours === 12) {
            hours = 0;
            minutes = parseInt(minStr.replace('AM', ''), 10);
          } else {
            minutes = parseInt(minStr, 10);
          }
        }
      }
      
      // Create date object
      return new Date(currentYear, monthNum, parseInt(day, 10), hours, minutes);
      
    } catch (error) {
      console.error(`Error parsing date: ${error.message}`);
      return new Date(); // Return current date on error
    }
  }
  
  /**
   * Generate an end date 4 hours after the start date
   * @param {Date} startDate - Event start date
   * @returns {Date} - Event end date
   */
  generateEndDate(startDate) {
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 4); // Typical nightclub event lasts ~4 hours
    return endDate;
  }

  /**
   * Extract event details from the main event listings
   * @param {CheerioStatic} $ - Cheerio instance loaded with the events page
   * @returns {Array} - Array of event objects
   */
  extractEvents($) {
    const events = [];
    
    // Find all event blocks
    $('.eventlist-column-upcoming').find('.eventlist-column-event').each((i, element) => {
      try {
        const eventBlock = $(element);
        
        // Extract event title - typically the strong text in the block
        let title = eventBlock.find('strong').first().text().trim();
        if (!title) {
          // Try alternate selectors for title
          title = eventBlock.find('.eventlist-title').first().text().trim();
          if (!title) {
            // Try getting text directly from the block
            const blockText = eventBlock.text().trim().split('\n')[0];
            title = blockText || 'Bar None Event';
          }
        }
        
        // Extract date and description text
        const dateText = eventBlock.find('.eventlist-meta-date').text().trim() || 
                         eventBlock.text().match(/([A-Za-z]+,\s+[A-Za-z]+\s+\d+)/)?.[1] || '';
        
        const descriptionText = eventBlock.find('.eventlist-description').text().trim() || 
                               'Nightclub event at Bar None Club.';
        
        // Extract ticket URL
        const ticketUrl = eventBlock.find('a[href*="tickets"]').attr('href') || 
                         eventBlock.find('a').filter(function() {
                           return $(this).text().toLowerCase().includes('buy') || 
                                 $(this).text().toLowerCase().includes('ticket');
                         }).attr('href') || 
                         this.venue.websiteUrl;
        
        // Extract time if available (default to 10:00 PM for nightclub events)
        const timeText = eventBlock.text().match(/(\d{1,2}:\d{2}\s*[APM]{2})/i)?.[1] || '10:00 PM';
        
        // Parse dates
        const startDate = this.parseEventDateTime(dateText, timeText);
        const endDate = this.generateEndDate(startDate);
        
        // Create unique ID based on title and date
        const id = `bar-none-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${startDate.toISOString().split('T')[0]}`;
        
        // Determine category and tags
        const eventText = (title + ' ' + descriptionText).toLowerCase();
        let category = 'nightlife';
        const categories = ['nightlife'];
        
        if (eventText.includes('dj') || eventText.includes('music') || eventText.includes('house')) {
          categories.push('music');
        }
        
        if (eventText.includes('dance')) {
          categories.push('dance');
        }
        
        // Extract image URL if available
        const imageUrl = eventBlock.find('img').attr('src') || null;
        
        // Create event object with proper venue object format
        const event = {
          id: id,
          title: title,
          description: descriptionText,
          startDate: startDate,
          endDate: endDate,
          venue: this.venue, // Using venue object, not string
          category: category,
          categories: categories,
          sourceURL: ticketUrl,
          officialWebsite: this.venue.websiteUrl,
          image: imageUrl,
          recurring: title.toLowerCase().includes('friday') || title.toLowerCase().includes('saturday') ? 'weekly' : null,
          lastUpdated: new Date()
        };
        
        events.push(event);
        console.log(`✅ Found event: ${title} on ${startDate.toLocaleDateString()}`);
        
      } catch (error) {
        console.error(`Error extracting event: ${error.message}`);
      }
    });
    
    return events;
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Bar None Club events scraper...');
    const events = [];
    
    try {
      // Fetch the events page
      const { data } = await axios.get(this.url);
      const $ = cheerio.load(data);
      
      // Extract events from the page
      const extractedEvents = this.extractEvents($);
      events.push(...extractedEvents);
      
      // Special handling for Friday/Saturday regular events
      // Bar None has Friday and Saturday regular events that might not all be listed
      const hasRegularFridayEvent = events.some(e => e.title.toLowerCase().includes('friday'));
      const hasRegularSaturdayEvent = events.some(e => e.title.toLowerCase().includes('saturday'));
      
      if (!hasRegularFridayEvent || !hasRegularSaturdayEvent) {
        // Generate recurring Friday/Saturday events for next 8 weeks
        const today = new Date();
        const eightWeeksFromNow = new Date();
        eightWeeksFromNow.setDate(eightWeeksFromNow.getDate() + 8 * 7);
        
        for (let d = new Date(today); d <= eightWeeksFromNow; d.setDate(d.getDate() + 1)) {
          // Add Friday events
          if (d.getDay() === 5 && !hasRegularFridayEvent) { // 5 is Friday
            const fridayEvent = {
              id: `bar-none-friday-${d.toISOString().split('T')[0]}`,
              title: 'Bar None Friday Night',
              description: 'Experience Bar None\'s premium Friday nightclub event featuring the hottest DJs and best dance music.',
              startDate: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 22, 0), // 10:00 PM
              endDate: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 3, 0), // 3:00 AM next day
              venue: this.venue,
              category: 'nightlife',
              categories: ['nightlife', 'music'],
              sourceURL: 'https://www.barnoneclub.com/eventscalendar',
              officialWebsite: this.venue.websiteUrl,
              image: null,
              recurring: 'weekly',
              lastUpdated: new Date()
            };
            events.push(fridayEvent);
            console.log(`✅ Added recurring Friday event on ${fridayEvent.startDate.toLocaleDateString()}`);
          }
          
          // Add Saturday events
          if (d.getDay() === 6 && !hasRegularSaturdayEvent) { // 6 is Saturday
            const saturdayEvent = {
              id: `bar-none-saturday-${d.toISOString().split('T')[0]}`,
              title: 'Bar None Saturday Night',
              description: 'Vancouver\'s premium Saturday nightlife experience at Bar None. Dance the night away with amazing music and atmosphere.',
              startDate: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 22, 0), // 10:00 PM
              endDate: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 3, 0), // 3:00 AM next day
              venue: this.venue,
              category: 'nightlife',
              categories: ['nightlife', 'music'],
              sourceURL: 'https://www.barnoneclub.com/eventscalendar',
              officialWebsite: this.venue.websiteUrl,
              image: null,
              recurring: 'weekly',
              lastUpdated: new Date()
            };
            events.push(saturdayEvent);
            console.log(`✅ Added recurring Saturday event on ${saturdayEvent.startDate.toLocaleDateString()}`);
          }
        }
      }
      
      console.log(`🎉 Successfully scraped ${events.length} events from Bar None Club`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Bar None Club scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new BarNoneClubScraper();
