/**
 * Underground Comedy Club Events Scraper
 * 
 * Scrapes events from the Underground Comedy Club website
 * https://www.ugcomedy.com/
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class UndergroundComedyClubEvents {
  constructor() {
    this.name = "Underground Comedy Club";
    this.url = "https://www.ugcomedy.com/";
    this.city = "Vancouver";
    this.scraperName = "undergroundComedyClubEvents";
  }
  
  /**
   * Scrape events from the Underground Comedy Club website
   */
  async scrape() {
    console.log(`🔍 Starting ${this.name} scraper...`);
    
    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15');
    
    // Set navigation timeouts
    await page.setDefaultNavigationTimeout(30000);
    await page.setDefaultTimeout(30000);
    
    const events = [];
    
    try {
      console.log(`Navigating to: ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2' });
      
      // Take a debug screenshot
      await page.screenshot({ path: 'underground-comedy-debug.png' });
      console.log('✅ Saved debug screenshot');
      
      // Check for upcoming shows section on homepage
      console.log('Checking for upcoming shows on homepage...');
      
      // Find show/event links
      const showLinks = await page.evaluate(() => {
        // Look for show links - UG Comedy typically uses "Buy Tickets" links
        const links = Array.from(document.querySelectorAll('a'));
        return links
          .filter(link => {
            const text = link.textContent.toLowerCase().trim();
            const href = link.href || '';
            // Focus on ticket links or show pages
            return (text.includes('ticket') || text.includes('show') || 
                    text.includes('event') || href.includes('show') || 
                    href.includes('event') || href.includes('ticket') ||
                    href.includes('eventbrite') || href.includes('showpass') ||
                    href.includes('showclix') || href.includes('comedy'));
          })
          .map(link => ({
            url: link.href,
            text: link.textContent.trim(),
            parent: link.parentElement ? link.parentElement.outerHTML.substring(0, 200) : ''
          }));
      });
      
      console.log(`Found ${showLinks.length} potential show/ticket links`);
      
      // Look for events page or calendar links
      const eventsPageLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links
          .filter(link => {
            const text = link.textContent.toLowerCase().trim();
            const href = link.href || '';
            return (text.includes('shows') || text.includes('events') || 
                    text.includes('calendar') || text.includes('schedule') ||
                    href.includes('shows') || href.includes('events') ||
                    href.includes('calendar') || href.includes('schedule'));
          })
          .map(link => ({
            url: link.href,
            text: link.textContent.trim()
          }));
      });
      
      console.log(`Found ${eventsPageLinks.length} events/shows page links`);
      
      // Visit events/shows page if available
      if (eventsPageLinks.length > 0) {
        const eventsLink = eventsPageLinks[0];
        console.log(`Navigating to events page: ${eventsLink.url}`);
        await page.goto(eventsLink.url, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Take screenshot of events page
        await page.screenshot({ path: 'underground-comedy-events-page.png' });
        
        // Extract events from events page
        console.log('Extracting events from events page...');
        const eventsPageEvents = await this.extractEvents(page, eventsLink.url);
        
        if (eventsPageEvents.length > 0) {
          events.push(...eventsPageEvents);
          console.log(`✅ Found ${eventsPageEvents.length} events on events page`);
        } else {
          console.log('No events found on events page');
        }
      }
      
      // Visit individual show links to find events
      // This is critical for sites that link directly to ticket platforms
      if (showLinks.length > 0) {
        console.log('Checking individual show/ticket links...');
        
        // Limit to reasonable number of show links to check
        // For Underground Comedy Club, we need to check more links
        const linksToCheck = showLinks.slice(0, Math.min(20, showLinks.length));
        
        for (const link of linksToCheck) {
          try {
            console.log(`Navigating to show page: ${link.url}`);
            await page.goto(link.url, { waitUntil: 'networkidle2' });
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Take screenshot of show page
            const filename = `underground-comedy-show-${showLinks.indexOf(link)}.png`;
            await page.screenshot({ path: filename });
            
            // Extract event from show page
            const showEvent = await this.extractSingleShowEvent(page, link.url);
            
            if (showEvent) {
              events.push(showEvent);
              console.log(`✅ Found event: ${showEvent.title}`);
            }
          } catch (error) {
            console.error(`Error processing show link ${link.url}: ${error.message}`);
          }
        }
      }
      
      // Close the browser
      await browser.close();
      console.log(`🎉 Successfully scraped ${events.length} events from ${this.name}`);
      
      return events;
    } catch (error) {
      console.error(`❌ Error scraping ${this.name}: ${error.message}`);
      await browser.close();
      return [];
    }
  }
  
  /**
   * Extract events from the main events/shows page
   */
  async extractEvents(page, sourceURL) {
    const events = [];
    
    try {
      // Look for event containers/listings
      const eventContainers = await page.evaluate(() => {
        // Common selectors for event listings
        const selectors = [
          '.event-item', '.show-item', '.event-listing', '.show-listing',
          '.event-card', '.show-card', '.event', '.show',
          '.event-container', '.show-container', 
          'article.event', 'article.show', '.calendar-event',
          '.ticket-item', '.performance-item'
        ];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            return {
              selector,
              count: elements.length
            };
          }
        }
        
        return null;
      });
      
      if (eventContainers) {
        console.log(`Found ${eventContainers.count} events with selector: ${eventContainers.selector}`);
        
        // Extract event details from these containers
        const extractedEvents = await page.evaluate((selector) => {
          const events = [];
          const containers = document.querySelectorAll(selector);
          
          containers.forEach(container => {
            // Try to extract title
            const titleElement = container.querySelector('h1, h2, h3, h4, .title, .event-title, .show-title');
            const title = titleElement ? titleElement.textContent.trim() : '';
            
            // Try to extract date
            const dateElement = container.querySelector('.date, .event-date, .show-date, time, .datetime');
            const dateText = dateElement ? dateElement.textContent.trim() : '';
            
            // Try to extract description
            const descElement = container.querySelector('.description, .event-description, .show-description, p');
            const description = descElement ? descElement.textContent.trim() : '';
            
            // Try to extract image
            const imgElement = container.querySelector('img');
            const image = imgElement ? imgElement.src : null;
            
            // Try to extract ticket link
            const ticketLinks = Array.from(container.querySelectorAll('a'));
            const ticketLink = ticketLinks.find(link => 
              (link.href && link.href.includes('ticket')) ||
              (link.textContent && link.textContent.toLowerCase().includes('ticket')) ||
              (link.textContent && link.textContent.toLowerCase().includes('buy'))
            );
            const ticketUrl = ticketLink ? ticketLink.href : '';
            
            events.push({
              title,
              dateText,
              description,
              image,
              ticketUrl
            });
          });
          
          return events;
        }, eventContainers.selector);
        
        console.log(`Extracted ${extractedEvents.length} event details`);
        
        // Process each extracted event
        for (const eventData of extractedEvents) {
          if (eventData.title && eventData.dateText) {
            // Parse date information
            const dateInfo = this.parseEventDate(eventData.dateText);
            
            if (dateInfo) {
              // Create event object
              const eventId = this.generateEventId(eventData.title, dateInfo.startDate);
              
              const event = this.createEventObject(
                eventId,
                eventData.title,
                eventData.description || `${eventData.title} at ${this.name}`,
                dateInfo.startDate,
                dateInfo.endDate,
                eventData.image,
                sourceURL,
                eventData.ticketUrl
              );
              
              events.push(event);
            }
          }
        }
      } else {
        console.log('No structured event containers found, checking for text-based events...');
        
        // Extract events from page text
        const textEvents = await this.extractEventsFromText(page);
        
        if (textEvents.length > 0) {
          console.log(`Found ${textEvents.length} events from text content`);
          
          for (const eventData of textEvents) {
            // Parse date information
            const dateInfo = this.parseEventDate(eventData.dateText);
            
            if (dateInfo) {
              // Create event object
              const eventId = this.generateEventId(eventData.title, dateInfo.startDate);
              
              const event = this.createEventObject(
                eventId,
                eventData.title,
                eventData.description || `${eventData.title} at ${this.name}`,
                dateInfo.startDate,
                dateInfo.endDate,
                null,
                sourceURL
              );
              
              events.push(event);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error extracting events: ${error.message}`);
    }
    
    return events;
  }
  
  /**
   * Extract a single event from a show/event detail page
   */
  async extractSingleShowEvent(page, sourceURL) {
    try {
      // Take screenshot of the show page for debugging
      const pageUrl = await page.url();
      console.log(`Analyzing show page: ${pageUrl}`);
      
      const eventData = await page.evaluate(() => {
        // Find title - look more broadly to catch various page structures
        const titleSelectors = ['h1', 'h2', '.show-title', '.event-title', '.title', 
                           'h3.card-title', '.event-name', '.name', '.heading', 
                           '[data-testid="listing-title"]', '.listing-title'];
        let title = '';
        
        for (const selector of titleSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            title = element.textContent.trim();
            break;
          }
        }
        
        // If still no title found, look at page title
        if (!title) {
          const pageTitle = document.title;
          if (pageTitle && pageTitle.toLowerCase() !== 'underground comedy club' && 
              !pageTitle.toLowerCase().includes('404') && 
              !pageTitle.toLowerCase().includes('not found')) {
            title = pageTitle.replace(' - Underground Comedy Club', '').replace(' | Underground Comedy Club', '').trim();
          }
        }
        
        // Find date - expand selectors to handle different site structures
        const dateSelectors = [
          '.date', '.event-date', '.show-date', '.datetime', 'time', '.show-time', '.event-time',
          '[itemprop="startDate"]', '[data-testid="event-date"]', '.event-details', '.meta-info',
          '.card-subtitle', '.event-datetime', '.date-and-time', '.date-display'
        ];
        let dateText = '';
        
        for (const selector of dateSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const text = element.textContent.trim();
            // Look for text containing month names or date formats
            if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/i.test(text) ||
                /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/.test(text) ||
                /\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text)) {
              dateText = text;
              break;
            }
          }
          if (dateText) break;
        }
        
        // If we still don't have a date, look for date in any element with specific terms
        if (!dateText) {
          const allElements = document.querySelectorAll('div, p, span, li');
          for (const element of allElements) {
            const text = element.textContent.trim();
            if ((text.toLowerCase().includes('date') || text.toLowerCase().includes('when')) &&
                (/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/.test(text) || 
                 /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text))) {
              dateText = text;
              break;
            }
          }
        }
        
        // Find description
        const descSelectors = ['.description', '.show-description', '.event-description', '.content', 'p'];
        let description = '';
        
        for (const selector of descSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            description = element.textContent.trim();
            break;
          }
        }
      
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          title = element.textContent.trim();
          break;
        }
      }
      
      // If still no title found, look at page title
      if (!title) {
        const pageTitle = document.title;
        if (pageTitle && pageTitle.toLowerCase() !== 'underground comedy club' && 
            !pageTitle.toLowerCase().includes('404') && 
            !pageTitle.toLowerCase().includes('not found')) {
          title = pageTitle.replace(' - Underground Comedy Club', '').replace(' | Underground Comedy Club', '').trim();
        }
      }
      
      // Find date - expand selectors to handle different site structures
      const dateSelectors = [
        '.date', '.event-date', '.show-date', '.datetime', 'time', '.show-time', '.event-time',
        '[itemprop="startDate"]', '[data-testid="event-date"]', '.event-details', '.meta-info',
        '.card-subtitle', '.event-datetime', '.date-and-time', '.date-display',
        'div:has(.date), div:has(.event-date), div:has(.show-date), div:has(.datetime), div:has(time), div:has(.show-time), div:has(.event-time)'
      ];
      let dateText = '';
      
      for (const selector of dateSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent.trim();
          // Look for text containing month names or date formats
          if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/i.test(text) ||
              /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/.test(text) ||
              /\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text)) {
            dateText = text;
            break;
          }
        }
        if (dateText) break;
      }
      
      // If we still don't have a date, look for date in any element with specific terms
      if (!dateText) {
        const allElements = document.querySelectorAll('div, p, span, li');
        for (const element of allElements) {
          const text = element.textContent.trim();
          if ((text.toLowerCase().includes('date') || text.toLowerCase().includes('when')) &&
              (/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/.test(text) || 
               /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text))) {
            dateText = text;
            break;
          }
        if (slashMatch) {
          let month, day, year;
          
          // For North America, assume MM/DD format
          month = parseInt(slashMatch[1], 10) - 1; // 0-indexed month
          day = parseInt(slashMatch[2], 10);
          year = slashMatch[3] ? parseInt(slashMatch[3], 10) : currentYear;
          
          dateObj = new Date(year, month, day, 20, 0, 0); // Default to 8 PM for comedy shows
        }
      }
      
      // Format: YYYY-MM-DD
      if (!dateObj) {
        const isoMatch = cleanDateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        
        if (isoMatch) {
          const year = parseInt(isoMatch[1], 10);
          const month = parseInt(isoMatch[2], 10) - 1; // 0-indexed month
          const day = parseInt(isoMatch[3], 10);
          
          dateObj = new Date(year, month, day, 20, 0, 0); // Default to 8 PM for comedy shows
        }
      }
      
      // Look for time information
      const timeMatch = cleanDateStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      
      if (dateObj && timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const isPM = timeMatch[3] && timeMatch[3].toLowerCase() === 'pm';
        
        // Adjust for PM if needed
        if (isPM && hours < 12) {
          hours += 12;
        }
        
        dateObj.setHours(hours, minutes);
      }
      
      // If we've successfully parsed a date
      if (dateObj && !isNaN(dateObj.getTime())) {
        // Comedy shows typically last 1-2 hours
        const endDate = new Date(dateObj);
        endDate.setHours(endDate.getHours() + 2);
        
        return {
          startDate: dateObj,
          endDate: endDate
        };
      }
    } catch (error) {
      console.error(`Error parsing date ${dateString}: ${error.message}`);
    }
    
    return null;
  }
  
  /**
   * Convert month name to month number (0-indexed)
   */
  getMonthNumber(monthName) {
    const months = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3,
      'may': 4, 'june': 5, 'july': 6, 'august': 7,
      'september': 8, 'october': 9, 'november': 10, 'december': 11,
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 
      'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    
    return months[monthName.toLowerCase()];
  }
  
  /**
   * Create an event object
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceURL, ticketUrl = null) {
    return {
      id,
      title,
      description,
      startDate,
      endDate,
      venue: {
        name: this.name,
        id: this.generateVenueId(this.name),
        address: "68 W Cordova St, Basement",
        city: "Vancouver",
        state: "BC",
        country: "Canada",
        coordinates: {
          lat: 49.2821,
          lng: -123.1060
        },
        websiteUrl: this.url,
        description: "The Underground Comedy Club is Vancouver's premier comedy venue featuring stand-up, improv, and comedy shows."
      },
      category: "comedy",
      categories: ["comedy", "entertainment", "nightlife", "stand-up", "performance"],
      sourceURL,
      officialWebsite: this.url,
      image: imageUrl,
      ticketsRequired: true,
      ticketUrl: ticketUrl,
      lastUpdated: new Date()
    };
  }
  
  /**
   * Generate a venue ID from a name
   */
  generateVenueId(name) {
    return slugify(name, {
      lower: true,
      strict: true
    });
  }
  
  /**
   * Generate an event ID
   */
  generateEventId(title, date) {
    // Create parts for ID
    const venuePart = this.generateVenueId(this.name);
    const titlePart = slugify(title, {
      lower: true,
      strict: true
    });
    
    // Format date as YYYY-MM-DD
    const datePart = date instanceof Date
      ? date.toISOString().split('T')[0]
      : 'unknown-date';
    
    return `${venuePart}-${titlePart}-${datePart}`;
  }
}

module.exports = UndergroundComedyClubEvents;
