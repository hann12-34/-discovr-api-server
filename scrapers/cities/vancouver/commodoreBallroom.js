/**
 * Commodore Ballroom scraper for Vancouver events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');

class CommodoreBallroomScraper {
  constructor() {
    this.name = 'Commodore Ballroom';
    this.url = 'https://www.livenation.com/venue/KovZpZAEkn6A/commodore-ballroom-events';
    this.enabled = true;
  }

  /**
   * Parse date and time string to Date object
   * @param {string} dateTimeStr - Date and time string
   * @returns {Date|null} - Parsed Date object or null
   */
  parseDateTime(dateTimeStr) {
    if (!dateTimeStr) return null;
    
    try {
      // Parse date format like "Fri Jul 5 2025 • 8:00 PM"
      const [datePart, timePart] = dateTimeStr.split(' • ');
      if (!datePart || !timePart) return null;
      
      // Combine and parse
      const dateTime = new Date(`${datePart} ${timePart}`);
      if (isNaN(dateTime.getTime())) return null;
      
      return dateTime;
    } catch (error) {
      console.error('Error parsing date/time:', error.message);
      return null;
    }
  }

  /**
   * Extract events from Commodore Ballroom website
   * @returns {Promise<Array>} - Array of events
   */
  async scrape() {
    if (!this.enabled) {
      console.log(`${this.name} scraper is disabled`);
      return [];
    }
    
    console.log(`Scraping events from ${this.name}...`);
    const events = [];
    
    try {
      // Launch browser
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });
      
      // Navigate to events page
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { 
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      // Wait for events to load
      await page.waitForSelector('.event-listing__item', { timeout: 30000 });
      
      // Extract event data
      console.log(`Extracting events from ${this.name}`);
      const eventData = await page.evaluate(() => {
        const eventElements = document.querySelectorAll('.event-listing__item');
        const data = [];
        
        eventElements.forEach(element => {
          try {
            // Basic event info
            const title = element.querySelector('.event-listing__title')?.innerText.trim();
            if (!title) return;
            
            const dateTimeText = element.querySelector('.event-listing__date')?.innerText.trim();
            const imageElement = element.querySelector('.event-listing__media img');
            const imageUrl = imageElement ? imageElement.src || imageElement.getAttribute('data-src') : null;
            const eventUrl = element.querySelector('a.event-listing__link')?.href;
            const subtitle = element.querySelector('.event-listing__subtitle')?.innerText.trim() || '';
            
            data.push({
              title,
              dateTimeText,
              image: imageUrl,
              sourceURL: eventUrl,
              subtitle
            });
          } catch (err) {
            console.error('Error extracting event data:', err);
          }
        });
        
        return data;
      });
      
      // Close browser
      await browser.close();
      
      // Process the raw event data
      for (const rawEvent of eventData) {
        try {
          const startDate = this.parseDateTime(rawEvent.dateTimeText);
          if (!startDate) continue;
          
          // Create end date (assume 3 hours later)
          const endDate = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));
          
          // Determine event type/category based on title and subtitle
          const categories = this.determineCategories(rawEvent.title, rawEvent.subtitle);
          
          // Create event object with both name and title for iOS compatibility
          events.push({
            id: `commodore-${rawEvent.title.replace(/\s+/g, '-').toLowerCase()}-${startDate.getTime()}`,
            name: rawEvent.title,
            title: rawEvent.title,
            description: rawEvent.subtitle || `Live event at ${this.name}`,
            image: rawEvent.image,
            date: startDate.toISOString(), // Add ISO date string format for iOS compatibility
            startDate,
            endDate,
            category: categories[0], // Single category string for iOS compatibility
            categories,
            season: this.determineSeason(startDate),
            location: this.name,
            venue: {
              name: this.name,
              address: '868 Granville St',
              city: 'Vancouver',
              state: 'BC',
              country: 'Canada',
              coordinates: { lat: 49.2817, lng: -123.1217 }
            },
            sourceURL: rawEvent.sourceURL,
            officialWebsite: 'https://www.commodoreballroom.com/'
          });
        } catch (err) {
          console.error('Error processing event:', err.message);
        }
      }
      
      console.log(`${this.name} scraper found ${events.length} events`);
    } catch (error) {
      console.error(`Error scraping ${this.name}:`, error.message);
    }
    
    return events;
  }
  
  /**
   * Determine event categories based on title and subtitle
   * @param {string} title - Event title
   * @param {string} subtitle - Event subtitle
   * @returns {Array<string>} - Array of category strings
   */
  determineCategories(title, subtitle) {
    const text = `${title} ${subtitle}`.toLowerCase();
    
    if (text.includes('concert') || text.includes('music') || 
        text.includes('band') || text.includes('singer') || 
        text.includes('dj') || text.includes('live music')) {
      return ['Music'];
    }
    
    if (text.includes('comedy') || text.includes('comedian') || 
        text.includes('stand-up') || text.includes('laugh')) {
      return ['Comedy'];
    }
    
    if (text.includes('dance') || text.includes('dancing') || 
        text.includes('ballet') || text.includes('choreograph')) {
      return ['Dance'];
    }
    
    if (text.includes('art') || text.includes('exhibition') || 
        text.includes('gallery') || text.includes('museum')) {
      return ['Arts & Culture'];
    }
    
    // Default category
    return ['Entertainment'];
  }

  /**
   * Determine season based on date
   * @param {Date} date - Date object
   * @returns {string} - Season name
   */
  determineSeason(date) {
    if (!date || isNaN(date.getTime())) return 'Unknown';
    
    const month = date.getMonth();
    
    if (month >= 2 && month <= 4) return 'Spring'; // March to May
    if (month >= 5 && month <= 7) return 'Summer'; // June to August
    if (month >= 8 && month <= 10) return 'Fall';  // September to November
    return 'Winter';                               // December to February
  }
}

// Export the scraper class
module.exports = new CommodoreBallroomScraper();
