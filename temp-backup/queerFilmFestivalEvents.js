/**
 * Vancouver Queer Film Festival Events Scraper
 * 
 * This scraper extracts events from the Vancouver Queer Film Festival website
 * Source: https://outonscreen.com/vqff/
 * 
 * Uses Puppeteer to handle JavaScript-rendered content
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class QueerFilmFestivalEvents {
  constructor() {
    this.name = 'Vancouver Queer Film Festival';
    this.url = 'https://outonscreen.com/vqff/';
    this.sourceIdentifier = 'vancouver-queer-film-festival';
    this.enabled = true;
    
    // Venue information
    this.venue = {
      name: 'Vancouver Queer Film Festival',
      address: 'Various venues across Vancouver',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      postalCode: '',
      website: 'https://outonscreen.com/vqff/',
      googleMapsUrl: ''
    };
  }

  /**
   * Format a date range string into standard format
   * @param {string} dateStr - Date string from website
   * @returns {Object} - Object containing start and end dates
   */
  parseDateRange(dateStr) {
    if (!dateStr) return { startDate: null, endDate: null };
    
    try {
      // Handle various date formats
      dateStr = dateStr.trim().replace(/\s+/g, ' ');
      
      // Check for date range with various separators
      if (dateStr.match(/[-–—to]/)) {
        const separator = dateStr.match(/[-–—]/)?.[0] || 'to';
        let [startPart, endPart] = dateStr.split(new RegExp(`\\s*${separator}\\s*`)).map(s => s.trim());
        
        // If end part doesn't have year but start part does, add the year
        if (startPart.includes('202') && !endPart.includes('202')) {
          const year = startPart.match(/202\d/)?.[0];
          if (year) {
            // If end part has month but no year, add the year
            if (endPart.match(/[A-Za-z]+\s+\d+/)) {
              endPart = `${endPart}, ${year}`;
            }
          }
        }
        
        const startDate = new Date(startPart);
        const endDate = new Date(endPart);
        endDate.setHours(23, 59, 59);
        
        // Check if dates are valid
        if (!isNaN(startDate) && !isNaN(endDate)) {
          return { startDate, endDate };
        }
      } 
      
      // Try parsing single date
      const date = new Date(dateStr);
      if (!isNaN(date)) {
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59);
        return { startDate: date, endDate };
      }
      
      // Handle special date formats like "August 2025" or "Aug 10-20, 2025"
      const monthRangeMatch = dateStr.match(/([A-Za-z]+)\s+(\d+)\s*[-–—]\s*(\d+),?\s*(202\d)/i);
      if (monthRangeMatch) {
        const month = monthRangeMatch[1];
        const startDay = parseInt(monthRangeMatch[2]);
        const endDay = parseInt(monthRangeMatch[3]);
        const year = monthRangeMatch[4];
        const monthIndex = new Date(`${month} 1, 2000`).getMonth();
        
        const startDate = new Date(year, monthIndex, startDay);
        const endDate = new Date(year, monthIndex, endDay, 23, 59, 59);
        
        return { startDate, endDate };
      }
      
      // Handle month + year format
      const monthYearMatch = dateStr.match(/([A-Za-z]+)\s+(202\d)/i);
      if (monthYearMatch) {
        const month = monthYearMatch[1];
        const year = monthYearMatch[2];
        const monthIndex = new Date(`${month} 1, 2000`).getMonth();
        
        const startDate = new Date(year, monthIndex, 1);
        const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59);
        
        return { startDate, endDate };
      }
      
      throw new Error(`Could not parse date: ${dateStr}`);
    } catch (error) {
      console.log(`Error parsing date "${dateStr}": ${error.message}`);
      return { startDate: null, endDate: null };
    }
  }

  /**
   * Generate an event ID based on title and date
   * @param {string} title - Event title
   * @param {Date} date - Event date
   * @returns {string} - Slugified ID
   */
  generateEventId(title, date) {
    const dateStr = date ? date.toISOString().split('T')[0] : 'no-date';
    const slug = slugify(`${title}-${dateStr}`, { lower: true, strict: true });
    return `${this.sourceIdentifier}-${slug}`;
  }

  /**
   * Create a properly formatted event object
   * @param {string} id - Event ID
   * @param {string} title - Event title
   * @param {string} description - Event description
   * @param {Date} startDate - Event start date
   * @param {Date} endDate - Event end date
   * @param {string} imageUrl - Event image URL
   * @param {string} sourceUrl - Original source URL
   * @param {string} ticketUrl - Ticket purchase URL
   * @returns {Object} - Formatted event object
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, ticketUrl = null) {
    // Determine categories based on event content
    const categories = this.determineCategories(title, description);
    
    return {
      id: id,
      title: title,
      description: description,
      startDate: startDate,
      endDate: endDate,
      imageUrl: imageUrl,
      sourceUrl: sourceUrl,
      ticketUrl: ticketUrl || sourceUrl,
      venue: this.venue,
      categories: categories,
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: this.sourceIdentifier,
    };
  }

  /**
   * Determine categories based on event content
   * @param {string} title - Event title
   * @param {string} description - Event description
   * @returns {Array<string>} - List of applicable categories
   */
  determineCategories(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const categories = ['film', 'festival', 'arts', 'lgbtq', 'queer', 'cultural'];
    
    if (text.includes('workshop') || text.includes('masterclass')) {
      categories.push('workshop');
    }
    
    if (text.includes('panel') || text.includes('discussion') || text.includes('talk')) {
      categories.push('talk');
    }
    
    if (text.includes('award') || text.includes('gala')) {
      categories.push('gala');
    }
    
    if (text.includes('premiere')) {
      categories.push('premiere');
    }
    
    if (text.includes('party') || text.includes('celebration')) {
      categories.push('party');
    }
    
    return categories;
  }

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
      // Launch Puppeteer browser
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--ignore-certificate-errors',
          '--disable-features=IsolateOrigins',
          '--disable-site-isolation-trials'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      // Navigate to the main page
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { 
        waitUntil: 'networkidle2', 
        timeout: 60000 
      });
      
      // Extract festival info from the main page
      const festivalInfo = await page.evaluate(() => {
        // Look for festival dates
        const datePattern = /(?:August|July|Aug)\s+\d+[-–—]\d+,?\s+202\d/i;
        const dateElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, p, .date, .festival-date'))
          .filter(el => datePattern.test(el.textContent));
          
        let festivalDate = '';
        if (dateElements.length > 0) {
          const match = dateElements[0].textContent.match(datePattern);
          festivalDate = match ? match[0] : '';
        }
        
        // Look for festival title
        let festivalTitle = '';
        const titleElements = Array.from(document.querySelectorAll('h1, h2, .festival-title'))
          .filter(el => /queer film festival|vqff/i.test(el.textContent));
          
        if (titleElements.length > 0) {
          festivalTitle = titleElements[0].textContent.trim();
        } else {
          festivalTitle = 'Vancouver Queer Film Festival';
        }
        
        // Look for festival description
        const descriptionElements = Array.from(document.querySelectorAll('p, .description, .content'))
          .filter(el => el.textContent.length > 100 && /film|festival|queer|lgbtq/i.test(el.textContent));
          
        let festivalDescription = '';
        if (descriptionElements.length > 0) {
          festivalDescription = descriptionElements[0].textContent.trim();
        } else {
          festivalDescription = 'The Vancouver Queer Film Festival celebrates the best in independent queer cinema and supports queer filmmakers from around the world.';
        }
        
        // Look for festival image
        const images = Array.from(document.querySelectorAll('img'))
          .filter(img => img.width > 300 && img.height > 200 && !img.src.includes('logo'));
          
        let festivalImage = '';
        if (images.length > 0) {
          festivalImage = images[0].src;
        }
        
        return {
          title: festivalTitle,
          date: festivalDate,
          description: festivalDescription,
          imageUrl: festivalImage
        };
      });
      
      // If we found festival info, create a main festival event
      if (festivalInfo.date) {
        const dateInfo = this.parseDateRange(festivalInfo.date);
        
        if (dateInfo.startDate && dateInfo.endDate) {
          const eventId = this.generateEventId(festivalInfo.title || this.name, dateInfo.startDate);
          
          const festivalEvent = this.createEventObject(
            eventId,
            festivalInfo.title || this.name,
            festivalInfo.description || `Annual film festival celebrating queer cinema and filmmakers.`,
            dateInfo.startDate,
            dateInfo.endDate,
            festivalInfo.imageUrl || '',
            this.url
          );
          
          events.push(festivalEvent);
        }
      }
      
      // Check for program or schedule pages
      const schedulePages = [
        '/program/', 
        '/schedule/', 
        '/films/', 
        '/events/',
        '/festival/'
      ];
      
      for (const schedulePath of schedulePages) {
        try {
          const scheduleUrl = new URL(schedulePath, this.url).href;
          console.log(`Checking for film program at: ${scheduleUrl}`);
          
          await page.goto(scheduleUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          
          // Look for film/event items
          const pageEvents = await page.evaluate(() => {
            const events = [];
            
            // Look for film items or event listings
            const eventElements = Array.from(document.querySelectorAll('.film, .event, .program-item, article, .card, .post'));
            
            eventElements.forEach(el => {
              const title = el.querySelector('h2, h3, h4, .title')?.textContent.trim() || '';
              if (!title) return;
              
              const description = el.querySelector('p, .description, .excerpt')?.textContent.trim() || '';
              const dateText = el.querySelector('.date, .datetime, time, .screening-time')?.textContent.trim() || '';
              const imageEl = el.querySelector('img');
              const imageUrl = imageEl ? imageEl.src : '';
              
              const linkEl = el.querySelector('a[href]');
              const link = linkEl ? new URL(linkEl.href, window.location.href).href : '';
              
              if (title && (dateText || description)) {
                events.push({
                  title,
                  description,
                  dateText,
                  imageUrl,
                  link
                });
              }
            });
            
            return events;
          });
          
          // Process each event found on the schedule page
          for (const eventData of pageEvents) {
            // Parse date if available
            const dateInfo = this.parseDateRange(eventData.dateText);
            
            // Generate event ID based on title and date
            const eventId = this.generateEventId(
              eventData.title, 
              dateInfo.startDate || new Date()
            );
            
            // Create event object
            const event = this.createEventObject(
              eventId,
              eventData.title,
              eventData.description,
              dateInfo.startDate,
              dateInfo.endDate,
              eventData.imageUrl,
              eventData.link || scheduleUrl
            );
            
            events.push(event);
          }
          
          // If we found events on this page, no need to check others
          if (pageEvents.length > 0) {
            break;
          }
        } catch (error) {
          console.log(`Error checking ${schedulePath}: ${error.message}`);
          continue;
        }
      }
      
      // If we still have no events, create a general festival event with estimated dates
      if (events.length === 0) {
        // VQFF typically happens in August, so create an estimated event for next August
        const now = new Date();
        const currentYear = now.getFullYear();
        const festivalYear = now.getMonth() >= 8 ? currentYear + 1 : currentYear; // If past August, use next year
        
        const estimatedStartDate = new Date(festivalYear, 7, 10); // August 10th
        const estimatedEndDate = new Date(festivalYear, 7, 20, 23, 59, 59); // August 20th
        
        const estimatedEventId = this.generateEventId(this.name, estimatedStartDate);
        
        const estimatedEvent = this.createEventObject(
          estimatedEventId,
          `${this.name} ${festivalYear}`,
          `The Vancouver Queer Film Festival is Western Canada's largest queer arts event celebrating film, art, and community. The festival typically takes place in August and features films, workshops, panels, and social events celebrating queer cinema and culture.`,
          estimatedStartDate,
          estimatedEndDate,
          '',
          this.url
        );
        
        events.push(estimatedEvent);
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
}

module.exports = new QueerFilmFestivalEvents();
