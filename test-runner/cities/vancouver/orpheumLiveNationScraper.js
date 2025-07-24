/**
 * Orpheum Theatre LiveNation Events Scraper
 * Scrapes events from the Orpheum Theatre using LiveNation's event listings
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

/**
 * Orpheum Theatre LiveNation Events Scraper
 */
const OrpheumLiveNationScraper = {
  name: 'Orpheum Theatre',
  url: 'https://www.livenation.com/venue/KovZpZAaevlA/orpheum-theatre-events',
  enabled: true,
  
  /**
   * Parse a date string into a Date object
   */
  parseDate(dateString) {
    if (!dateString) return null;
    
    try {
      // Clean up the date string
      dateString = dateString.replace(/\s+/g, ' ').trim();
      
      // Try direct date parsing first
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
      
      // Try to extract month, day, and year
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                          'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      
      // Look for patterns like "Jul 15" or "July 15, 2025"
      const datePattern = new RegExp(`(${monthNames.join('|')})[a-z]*\\s+(\\d{1,2})(?:,?\\s*(\\d{4}))?`, 'i');
      const match = dateString.match(datePattern);
      
      if (match) {
        const monthStr = match[1].toLowerCase();
        const day = parseInt(match[2]);
        const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
        
        const month = monthNames.findIndex(m => monthStr.startsWith(m.toLowerCase()));
        
        if (month !== -1 && day >= 1 && day <= 31) {
          return new Date(year, month, day);
        }
      }
      
      // Check for numeric format (MM/DD/YYYY)
      const numericMatch = dateString.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
      if (numericMatch) {
        const month = parseInt(numericMatch[1]) - 1;
        const day = parseInt(numericMatch[2]);
        const year = numericMatch[3] ? 
          (parseInt(numericMatch[3]) < 100 ? 2000 + parseInt(numericMatch[3]) : parseInt(numericMatch[3])) : 
          new Date().getFullYear();
        
        return new Date(year, month, day);
      }
      
      return null;
    } catch (error) {
      console.error(`Error parsing date "${dateString}": ${error.message}`);
      return null;
    }
  },
  
  /**
   * Generate a unique ID for an event
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
    
    return `orpheum-theatre-${slug}-${dateStr}`;
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl) {
    return {
      id,
      title,
      description: description || '',
      startDate,
      endDate: endDate || startDate, // Default to same day if no end date
      imageUrl: imageUrl || '',
      sourceUrl: sourceUrl || this.url,
      ticketUrl: sourceUrl || this.url,
      venue: {
        name: 'Orpheum Theatre',
        address: '601 Smithe Street',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6B 3L4',
        website: this.url,
        googleMapsUrl: 'https://goo.gl/maps/Kc4BKwaBC8dfDnty8'
      },
      categories: ['arts', 'music', 'performance', 'theatre', 'concert'],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'orpheum-theatre'
    };
  },

  /**
   * Save debug information for analysis
   */
  async saveDebugInfo(page, name) {
    try {
      const debugDir = path.join(__dirname, '../../restored-scrapers/debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      // Save screenshot
      const screenshotPath = path.join(debugDir, `orpheum-ln-${name}-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Save HTML
      const htmlPath = path.join(debugDir, `orpheum-ln-${name}-${Date.now()}.html`);
      const html = await page.content();
      fs.writeFileSync(htmlPath, html);
      
      console.log(`Saved debug info to ${screenshotPath}`);
    } catch (error) {
      console.error(`Could not save debug info: ${error.message}`);
    }
  },
  
  /**
   * Main scraping function
   */
  async scrape() {
    if (!this.enabled) {
      console.log(`${this.name} scraper is disabled`);
      return [];
    }
    
    console.log(`🔍 Scraping events from ${this.name} using LiveNation...`);
    const events = [];
    let browser;
    
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-features=site-per-process'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 900 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');
      
      // Add console logging from browser
      page.on('console', msg => console.log(`BROWSER CONSOLE: ${msg.text()}`));
      
      // Navigate to the LiveNation events page
      console.log(`--- Navigating to LiveNation events page: ${this.url} ---`);
      
      try {
        await page.goto(this.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Give it more time to load dynamic content
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('Successfully loaded LiveNation events page');
        await this.saveDebugInfo(page, 'events-page');
        
        // Wait for event cards to load
        await page.waitForSelector('[data-testid="event-card"]', { timeout: 15000 });
        
        // Extract events using a more reliable approach
        const extractedEvents = await page.evaluate(() => {
          const events = [];
          
          // Find all event cards
          const eventCards = document.querySelectorAll('[data-testid="event-card"]');
          
          eventCards.forEach(card => {
            try {
              // Extract event information
              const titleElement = card.querySelector('[data-testid="event_name"]');
              const title = titleElement ? titleElement.textContent.trim() : '';
              
              // Skip if no title
              if (!title) return;
              
              // Extract date
              const dateElement = card.querySelector('[data-testid="event_date"]');
              const dateText = dateElement ? dateElement.textContent.trim() : '';
              
              // Extract image
              const imageElement = card.querySelector('img');
              const imageUrl = imageElement ? imageElement.src : '';
              
              // Extract event URL
              const linkElement = card.closest('a');
              const eventUrl = linkElement ? linkElement.href : '';
              
              // Extract time info if available
              const timeElement = card.querySelector('[data-testid="event_time"]');
              const timeText = timeElement ? timeElement.textContent.trim() : '';
              
              // Combine date and time
              const fullDateText = `${dateText} ${timeText}`.trim();
              
              events.push({
                title,
                description: '',  // Will try to get description from detail page
                dateText: fullDateText,
                imageUrl,
                sourceUrl: eventUrl
              });
            } catch (error) {
              console.error(`Error extracting event info: ${error.message}`);
            }
          });
          
          return events;
        });
        
        console.log(`Found ${extractedEvents.length} events on LiveNation page`);
        
        // Process events and get more details
        for (let i = 0; i < extractedEvents.length; i++) {
          const eventData = extractedEvents[i];
          console.log(`Processing event ${i+1}/${extractedEvents.length}: ${eventData.title}`);
          
          // Parse date
          const startDate = this.parseDate(eventData.dateText);
          if (!startDate) {
            console.log(`Could not parse date for event "${eventData.title}": "${eventData.dateText}"`);
            continue;
          }
          
          // Create end date (same day, end of day)
          const endDate = new Date(startDate);
          endDate.setHours(23, 59, 59);
          
          // Get additional details if we have a source URL
          let description = eventData.description || '';
          
          if (eventData.sourceUrl) {
            try {
              // Visit the event page to get more details
              console.log(`Getting details from: ${eventData.sourceUrl}`);
              await page.goto(eventData.sourceUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              // Try to extract description
              const detailsData = await page.evaluate(() => {
                const descElement = document.querySelector('[data-testid="event-detail-description"]');
                return {
                  description: descElement ? descElement.textContent.trim() : ''
                };
              });
              
              if (detailsData.description) {
                description = detailsData.description;
              }
            } catch (error) {
              console.log(`Error getting details for "${eventData.title}": ${error.message}`);
            }
          }
          
          // Generate event ID
          const eventId = this.generateEventId(eventData.title, startDate);
          
          // Create event object
          const event = this.createEventObject(
            eventId,
            eventData.title,
            description,
            startDate,
            endDate,
            eventData.imageUrl,
            eventData.sourceUrl || this.url
          );
          
          events.push(event);
        }
        
      } catch (error) {
        console.error(`Error navigating to LiveNation events page: ${error.message}`);
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

module.exports = OrpheumLiveNationScraper;
