/**
 * Contemporary Art Gallery Events Scraper
 * Scrapes events from Contemporary Art Gallery in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Contemporary Art Gallery Events Scraper
 */
const ContemporaryArtGalleryEvents = {
  name: 'Contemporary Art Gallery',
  url: 'https://cagvancouver.org/exhibitions/',
  enabled: true,
  
  /**
   * Parse a date range string into start and end date objects
   * @param {string} dateString - The date string to parse
   * @returns {Object} - Object containing startDate and endDate
   */
  parseDateRange(dateString) {
    if (!dateString) return { startDate: null, endDate: null };
    
    try {
      // Remove any non-date relevant text
      dateString = dateString.replace(/ongoing|coming soon/gi, '').trim();
      
      // Handle various date formats
      const datePattern = /([A-Za-z]+)\s+(\d{1,2})(?:\s*[–—-]\s*(?:([A-Za-z]+)\s+)?(\d{1,2}))?,?\s*(\d{4})/i;
      const match = dateString.match(datePattern);
      
      if (match) {
        const startMonth = match[1];
        const startDay = parseInt(match[2]);
        const endMonth = match[3] || startMonth;
        const endDay = match[4] ? parseInt(match[4]) : startDay;
        const year = parseInt(match[5]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const startMonthNum = months[startMonth.toLowerCase()];
        const endMonthNum = months[endMonth.toLowerCase()];
        
        if (startMonthNum !== undefined && endMonthNum !== undefined) {
          const startDate = new Date(year, startMonthNum, startDay);
          const endDate = new Date(year, endMonthNum, endDay, 23, 59, 59);
          return { startDate, endDate };
        }
      }
      
      // Try other formats including ISO dates
      const dateParts = dateString.split(/\s*[–—-]\s*/);
      if (dateParts.length > 0) {
        const startDate = new Date(dateParts[0]);
        if (!isNaN(startDate.getTime())) {
          let endDate;
          if (dateParts.length > 1) {
            endDate = new Date(dateParts[1]);
          } else {
            endDate = new Date(startDate);
            endDate.setHours(23, 59, 59);
          }
          return { startDate, endDate };
        }
      }
      
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
    
    return `contemporary-art-gallery-${slug}-${dateStr}`;
  },
  
  /**
   * Create an event object with all required fields
   * @param {string} id - Event ID
   * @param {string} title - Event title
   * @param {string} description - Event description
   * @param {Date} startDate - Event start date
   * @param {Date} endDate - Event end date
   * @param {string} imageUrl - URL to event image
   * @param {string} sourceUrl - URL to original event page
   * @returns {Object} - Event object
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl) {
    return {
      id,
      title,
      description: description || '',
      startDate,
      endDate,
      imageUrl: imageUrl || '',
      sourceUrl: sourceUrl || this.url,
      ticketUrl: sourceUrl || this.url,
      venue: {
        name: 'Contemporary Art Gallery',
        address: '555 Nelson Street',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6B 6R5',
        website: 'https://cagvancouver.org/',
        googleMapsUrl: 'https://goo.gl/maps/QvTxMSQkaazJ3w3r6'
      },
      categories: [
        'arts',
        'gallery',
        'exhibition',
        'contemporary'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'contemporary-art-gallery'
    };
  },
  
  /**
   * Main scraping function to extract events
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
      
      // Navigate to the events page
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Extract exhibitions data
      console.log('Extracting exhibition data...');
      const exhibitionData = await page.evaluate(() => {
        const exhibitions = [];
        
        // Look for exhibition items
        const exhibitionItems = Array.from(document.querySelectorAll('.exhibition-item, .exhibition, article, .exhibition-card, .grid-item'));
        
        exhibitionItems.forEach(item => {
          const title = item.querySelector('h2, h3, h4, .title')?.textContent.trim() || '';
          if (!title) return;
          
          const description = item.querySelector('p, .description, .excerpt')?.textContent.trim() || '';
          const dateText = item.querySelector('.date, .dates, .exhibition-dates, time')?.textContent.trim() || '';
          const imageElement = item.querySelector('img');
          const imageUrl = imageElement ? imageElement.src : '';
          const linkElement = item.querySelector('a[href]');
          const link = linkElement ? new URL(linkElement.href, window.location.href).href : '';
          
          if (title) {
            exhibitions.push({
              title,
              description,
              dateText,
              imageUrl,
              link
            });
          }
        });
        
        return exhibitions;
      });
      
      console.log(`Found ${exhibitionData.length} potential exhibitions`);
      
      // Process each exhibition
      for (const exhibition of exhibitionData) {
        const { title, description, dateText, imageUrl, link } = exhibition;
        
        // Skip items without titles
        if (!title) continue;
        
        // Parse date information
        const dateInfo = this.parseDateRange(dateText);
        
        // Skip events with no dates
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping exhibition "${title}" due to invalid date: "${dateText}"`);
          continue;
        }
        
        // Generate event ID
        const eventId = this.generateEventId(title, dateInfo.startDate);
        
        // Create event object
        const event = this.createEventObject(
          eventId,
          title,
          description,
          dateInfo.startDate,
          dateInfo.endDate,
          imageUrl,
          link
        );
        
        events.push(event);
      }
      
      // If no events found on the main page, check for any events page
      if (events.length === 0) {
        const eventPaths = ['/whats-on/', '/events/', '/calendar/', '/programs/', '/current/'];
        
        for (const path of eventPaths) {
          try {
            const eventUrl = new URL(path, 'https://cagvancouver.org/').href;
            console.log(`Checking events at: ${eventUrl}`);
            
            await page.goto(eventUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            
            const pageEvents = await page.evaluate(() => {
              const events = [];
              const eventItems = Array.from(document.querySelectorAll('.event-item, article, .card, .program-item'));
              
              eventItems.forEach(item => {
                const title = item.querySelector('h2, h3, h4, .title')?.textContent.trim() || '';
                if (!title) return;
                
                const description = item.querySelector('p, .description')?.textContent.trim() || '';
                const dateText = item.querySelector('.date, time, .event-date')?.textContent.trim() || '';
                const imageElement = item.querySelector('img');
                const imageUrl = imageElement ? imageElement.src : '';
                const linkElement = item.querySelector('a[href]');
                const link = linkElement ? new URL(linkElement.href, window.location.href).href : '';
                
                events.push({
                  title,
                  description,
                  dateText,
                  imageUrl,
                  link
                });
              });
              
              return events;
            });
            
            // Process events from this page
            for (const eventData of pageEvents) {
              const dateInfo = this.parseDateRange(eventData.dateText);
              
              if (!dateInfo.startDate || !dateInfo.endDate) {
                console.log(`Skipping event "${eventData.title}" due to invalid date: "${eventData.dateText}"`);
                continue;
              }
              
              const eventId = this.generateEventId(eventData.title, dateInfo.startDate);
              
              const event = this.createEventObject(
                eventId,
                eventData.title,
                eventData.description,
                dateInfo.startDate,
                dateInfo.endDate,
                eventData.imageUrl,
                eventData.link
              );
              
              events.push(event);
            }
            
            // If we found events on this page, no need to check others
            if (events.length > 0) break;
            
          } catch (error) {
            console.log(`Error accessing ${path}: ${error.message}`);
            continue;
          }
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

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new ContemporaryArtGalleryEvents();
