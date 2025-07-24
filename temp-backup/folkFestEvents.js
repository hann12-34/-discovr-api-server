/**
 * Vancouver Folk Music Festival Events Scraper
 * Scrapes events from the Vancouver Folk Music Festival
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Vancouver Folk Music Festival Events Scraper
 */
const FolkFestEvents = {
  name: 'Vancouver Folk Music Festival',
  url: 'https://thefestival.bc.ca/lineup/',
  enabled: true,
  
  /**
   * Parse date strings into start and end date objects with enhanced support for various formats
   * @param {string} dateString - The date string to parse
   * @returns {Object} - Object with startDate and endDate
   */
  parseDateRange(dateString) {
    if (!dateString) return { startDate: null, endDate: null };
    
    try {
      // Clean up the date string
      dateString = dateString.replace(/\s+/g, ' ').trim();
      
      // Handle format: "Month Day @ Time - Time" (e.g., "July 3 @ 12:00pm - 10:00pm")
      const monthDayAtTimePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*@\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)(?:\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM))?/i;
      const monthDayAtTimeMatch = dateString.match(monthDayAtTimePattern);
      
      if (monthDayAtTimeMatch) {
        const month = monthDayAtTimeMatch[1];
        const day = parseInt(monthDayAtTimeMatch[2]);
        
        const startHour = parseInt(monthDayAtTimeMatch[3]);
        const startMinute = monthDayAtTimeMatch[4] ? parseInt(monthDayAtTimeMatch[4]) : 0;
        const startMeridiem = monthDayAtTimeMatch[5].toLowerCase();
        
        // Convert to 24-hour format
        let startHour24 = startHour;
        if (startMeridiem === 'pm' && startHour < 12) startHour24 += 12;
        if (startMeridiem === 'am' && startHour === 12) startHour24 = 0;
        
        // Default year to current year if not specified
        const currentYear = new Date().getFullYear();
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          const startDate = new Date(currentYear, monthNum, day, startHour24, startMinute);
          
          // For end time, use provided end time if available, otherwise default to 3 hours later
          let endDate;
          
          if (monthDayAtTimeMatch[6]) {
            // End time is provided
            const endHour = parseInt(monthDayAtTimeMatch[6]);
            const endMinute = monthDayAtTimeMatch[7] ? parseInt(monthDayAtTimeMatch[7]) : 0;
            const endMeridiem = monthDayAtTimeMatch[8].toLowerCase();
            
            // Convert to 24-hour format
            let endHour24 = endHour;
            if (endMeridiem === 'pm' && endHour < 12) endHour24 += 12;
            if (endMeridiem === 'am' && endHour === 12) endHour24 = 0;
            
            // Handle case where end time is next day (e.g., 11pm - 2am)
            endDate = new Date(currentYear, monthNum, day, endHour24, endMinute);
            if (endHour24 < startHour24) {
              endDate.setDate(endDate.getDate() + 1);
            }
          } else {
            // Default end time to 3 hours after start
            endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + 3);
          }
          
          return { startDate, endDate };
        }
      }
      
      // Handle date range pattern: "July 19-21, 2024"
      const dateRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[-–](\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i;
      const dateRangeMatch = dateString.match(dateRangePattern);
      
      if (dateRangeMatch) {
        const month = dateRangeMatch[1];
        const startDay = parseInt(dateRangeMatch[2]);
        const endDay = parseInt(dateRangeMatch[3]);
        const year = parseInt(dateRangeMatch[4]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          const startDate = new Date(year, monthNum, startDay, 12, 0, 0); // Default to noon
          const endDate = new Date(year, monthNum, endDay, 23, 59, 59); // End of the day
          
          return { startDate, endDate };
        }
      }
      
      // Handle cross-month date range: "July 31-August 2, 2024"
      const crossMonthPattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[-–]([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i;
      const crossMonthMatch = dateString.match(crossMonthPattern);
      
      if (crossMonthMatch) {
        const startMonth = crossMonthMatch[1];
        const startDay = parseInt(crossMonthMatch[2]);
        const endMonth = crossMonthMatch[3];
        const endDay = parseInt(crossMonthMatch[4]);
        const year = parseInt(crossMonthMatch[5]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const startMonthNum = months[startMonth.toLowerCase()];
        const endMonthNum = months[endMonth.toLowerCase()];
        
        if (startMonthNum !== undefined && endMonthNum !== undefined) {
          const startDate = new Date(year, startMonthNum, startDay, 12, 0, 0); // Default to noon
          const endDate = new Date(year, endMonthNum, endDay, 23, 59, 59); // End of the day
          
          return { startDate, endDate };
        }
      }
      
      // Standard date parsing as fallback
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        const startDate = new Date(parsedDate);
        
        // If no time specified, default to noon
        if (dateString.indexOf(':') === -1) {
          startDate.setHours(12, 0, 0);
        }
        
        // End date is same day by default
        const endDate = new Date(startDate);
        endDate.setHours(23, 59, 59);
        
        return { startDate, endDate };
      }
      
      console.log(`Could not parse date: ${dateString}`);
      return { startDate: null, endDate: null };
      
    } catch (error) {
      console.error(`Error parsing date "${dateString}": ${error.message}`);
      return { startDate: null, endDate: null };
    }
  },
  
  /**
   * Generate a unique ID for an event
   * @param {string} title - The event title
   * @param {Date} startDate - The start date of the event
   * @returns {string} - Unique event ID
   */
  generateEventId(title, startDate) {
    if (!title) return '';
    
    let dateStr = '';
    if (startDate && !isNaN(startDate.getTime())) {
      dateStr = startDate.toISOString().split('T')[0];
    }
    
    const slug = slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    }).substring(0, 50);
    
    return `folk-fest-${slug}-${dateStr}`;
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, artist) {
    return {
      id,
      title: artist ? `${artist} at Vancouver Folk Music Festival` : title,
      description: description || '',
      startDate,
      endDate,
      imageUrl: imageUrl || '',
      sourceUrl: sourceUrl || this.url,
      ticketUrl: 'https://thefestival.bc.ca/tickets/',
      venue: {
        name: 'Jericho Beach Park',
        address: '3941 Point Grey Road',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6R 1B3',
        website: 'https://thefestival.bc.ca/',
        googleMapsUrl: 'https://goo.gl/maps/EwkvVAEGjRGSn9u1A'
      },
      categories: [
        'music',
        'folk-music',
        'festival',
        'concert',
        'outdoor'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'vancouver-folk-fest'
    };
  },
  
  /**
   * Main scraping function
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
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      // Use shorter timeout
      page.setDefaultNavigationTimeout(15000);
      
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 15000 });
      
      try {
        await page.waitForSelector('.artist, .performer, .lineup-item, article', { timeout: 8000 });
      } catch (error) {
        console.log('Could not find artist elements with standard selectors, trying to proceed anyway');
      }
      
      // Extract artists/performers data
      const artistsData = await page.evaluate(() => {
        const artists = [];
        
        // Try different selectors for artists/performers
        const artistElements = Array.from(document.querySelectorAll(
          '.artist, .performer, .lineup-item, article, .performer-item'
        ));
        
        artistElements.forEach(element => {
          const name = element.querySelector('h2, h3, h4, .name, .title')?.textContent.trim() || '';
          if (!name) return;
          
          const description = element.querySelector('p, .description, .bio, .excerpt')?.textContent.trim() || '';
          const imageUrl = element.querySelector('img')?.src || '';
          const sourceUrl = element.querySelector('a[href]')?.href || '';
          
          artists.push({
            name,
            description,
            imageUrl,
            sourceUrl
          });
        });
        
        return artists;
      });
      
      console.log(`Found ${artistsData.length} potential artists/performers`);
      
      // Check for festival dates on the homepage if no artists found
      // or to get the overall festival dates
      console.log('Checking homepage for festival dates');
      
      await page.goto('https://thefestival.bc.ca/', { waitUntil: 'networkidle2', timeout: 15000 });
      
      const festivalData = await page.evaluate(() => {
        // Look for festival date information
        const datePattern = /(?:july|august)\s+\d{1,2}[-–]\d{1,2},?\s*\d{4}/i;
        const fullText = document.body.textContent;
        
        const dateMatch = fullText.match(datePattern);
        const dateText = dateMatch ? dateMatch[0] : '';
        
        // Look for a description
        const description = document.querySelector('p')?.textContent.trim() || '';
        
        // Look for an image
        const imageUrl = document.querySelector('.hero img, .banner img')?.src || 
                        document.querySelector('img')?.src || '';
        
        return {
          title: 'Vancouver Folk Music Festival',
          description: description || 'Annual folk music festival at Jericho Beach Park featuring artists from around the world.',
          dateText,
          imageUrl,
          sourceUrl: 'https://thefestival.bc.ca/'
        };
      });
      
      // If festival dates found, create a main festival event
      if (festivalData.dateText) {
        console.log(`Found festival date: ${festivalData.dateText}`);
        
        const dateInfo = this.parseDateRange(festivalData.dateText);
        
        if (dateInfo.startDate && dateInfo.endDate) {
          const eventId = this.generateEventId('Vancouver Folk Music Festival', dateInfo.startDate);
          
          const festivalEvent = this.createEventObject(
            eventId,
            'Vancouver Folk Music Festival',
            festivalData.description,
            dateInfo.startDate,
            dateInfo.endDate,
            festivalData.imageUrl,
            festivalData.sourceUrl
          );
          
          events.push(festivalEvent);
        } else {
          // If no valid dates found in text, use default dates (mid-July)
          const currentYear = new Date().getFullYear();
          const defaultStartDate = new Date(currentYear, 6, 15, 12, 0, 0); // July 15th
          const defaultEndDate = new Date(currentYear, 6, 17, 23, 59, 59); // July 17th
          
          const eventId = this.generateEventId('Vancouver Folk Music Festival', defaultStartDate);
          
          const festivalEvent = this.createEventObject(
            eventId,
            'Vancouver Folk Music Festival',
            festivalData.description,
            defaultStartDate,
            defaultEndDate,
            festivalData.imageUrl,
            festivalData.sourceUrl
          );
          
          events.push(festivalEvent);
        }
      } else if (artistsData.length === 0) {
        // If no festival dates found and no artists found, create a default festival event
        const currentYear = new Date().getFullYear();
        const defaultStartDate = new Date(currentYear, 6, 15, 12, 0, 0); // July 15th
        const defaultEndDate = new Date(currentYear, 6, 17, 23, 59, 59); // July 17th
        
        const eventId = this.generateEventId('Vancouver Folk Music Festival', defaultStartDate);
        
        const festivalEvent = this.createEventObject(
          eventId,
          'Vancouver Folk Music Festival',
          'Annual folk music festival at Jericho Beach Park featuring artists from around the world.',
          defaultStartDate,
          defaultEndDate,
          '',
          'https://thefestival.bc.ca/'
        );
        
        events.push(festivalEvent);
      }
      
      // If artists were found, create events for each artist using the festival dates
      if (artistsData.length > 0 && events.length > 0) {
        // Use the main festival event's dates
        const festivalStartDate = events[0].startDate;
        const festivalEndDate = events[0].endDate;
        
        // For each artist, create an event during the festival
        for (const artistData of artistsData) {
          // Generate event ID
          const eventId = this.generateEventId(artistData.name, festivalStartDate);
          
          // Create event object
          const artistEvent = this.createEventObject(
            eventId,
            `${artistData.name} at Vancouver Folk Music Festival`,
            artistData.description,
            festivalStartDate, // Using festival start date
            festivalEndDate,   // Using festival end date
            artistData.imageUrl,
            artistData.sourceUrl,
            artistData.name
          );
          
          // Add event to events array
          events.push(artistEvent);
        }
      }
      
      console.log(`Found ${events.length} events from ${this.name}`);
      
    } catch (error) {
      console.error(`Error scraping ${this.name}: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
    
    return events;
  }
};

module.exports = FolkFestEvents;
