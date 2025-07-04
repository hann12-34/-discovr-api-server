/**
 * Vogue Theatre scraper for Vancouver events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');

class VogueTheatreScraper {
  constructor() {
    this.name = 'Vogue Theatre';
    this.url = 'https://voguetheatre.com/calendar/';
    this.enabled = true;
  }

  /**
   * Parse date from string format
   * @param {string} dateStr - Date string
   * @returns {Date|null} - Parsed Date object or null
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      // Try parsing the date
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) return parsedDate;
      
      // For format "Month Day, Year"
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const lowerDateStr = dateStr.toLowerCase();
      
      for (let i = 0; i < monthNames.length; i++) {
        if (lowerDateStr.includes(monthNames[i])) {
          const year = new Date().getFullYear();
          const day = parseInt(lowerDateStr.match(/\\d+/)?.[0] || '1');
          return new Date(year, i, day);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing date:', error.message);
      return null;
    }
  }

  /**
   * Extract events from Vogue Theatre website
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
      // Using Axios + Cheerio approach first
      console.log(`Requesting ${this.url}`);
      const response = await axios.get(this.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        }
      });
      
      if (response.status !== 200) {
        console.error(`Failed to fetch ${this.url}, status: ${response.status}`);
        return [];
      }
      
      // Parse the HTML
      const $ = cheerio.load(response.data);
      const eventElements = $('.bit-events-container .bit-event');
      
      console.log(`Found ${eventElements.length} potential events`);
      
      // Extract event data
      eventElements.each((index, element) => {
        try {
          const $element = $(element);
          
          // Extract event details
          const title = $element.find('.bit-event-name').text().trim();
          if (!title) return;
          
          const dateText = $element.find('.bit-event-date-line').text().trim();
          const venueText = $element.find('.bit-venue-name').text().trim();
          const ticketLink = $element.find('.bit-button').attr('href');
          
          // Find image
          const imgSrc = $element.find('img').attr('src') || '';
          
          // Parse date
          const startDate = this.parseDate(dateText);
          if (!startDate) return;
          
          // Create end date (assume 3 hours later)
          const endDate = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));
          
          // Create event object
          events.push({
            title,
            description: `${title} at ${this.name}`,
            image: imgSrc.startsWith('http') ? imgSrc : null,
            startDate,
            endDate,
            categories: ['Music', 'Performance'],
            location: this.name,
            venue: {
              name: this.name,
              address: '918 Granville St',
              city: 'Vancouver',
              state: 'BC',
              country: 'Canada',
              coordinates: { lat: 49.2810, lng: -123.1210 }
            },
            sourceURL: this.url,
            officialWebsite: ticketLink || 'https://voguetheatre.com/',
            tickets: ticketLink
          });
        } catch (err) {
          console.error('Error processing event element:', err.message);
        }
      });
      
      // If cheerio approach failed, try puppeteer
      if (events.length === 0) {
        console.log('No events found with Cheerio, trying Puppeteer approach...');
        
        // Launch browser
        const browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
        
        // Navigate to events page
        await page.goto(this.url, { 
          waitUntil: 'networkidle2',
          timeout: 60000
        });
        
        // Wait for events to load
        await page.waitForSelector('.bit-events-container', { timeout: 30000 });
        
        // Extract event data
        const eventData = await page.evaluate(() => {
          const eventElements = document.querySelectorAll('.bit-events-container .bit-event');
          const data = [];
          
          eventElements.forEach(element => {
            try {
              const title = element.querySelector('.bit-event-name')?.innerText.trim();
              if (!title) return;
              
              const dateText = element.querySelector('.bit-event-date-line')?.innerText.trim();
              const venueText = element.querySelector('.bit-venue-name')?.innerText.trim();
              const ticketLink = element.querySelector('.bit-button')?.href;
              const imgElement = element.querySelector('img');
              const imgSrc = imgElement ? imgElement.src : null;
              
              data.push({
                title,
                dateText,
                venueText,
                ticketLink,
                imgSrc
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
            const startDate = this.parseDate(rawEvent.dateText);
            if (!startDate) continue;
            
            // Create end date (assume 3 hours later)
            const endDate = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));
            
            // Create event object with iOS app compatibility
            events.push({
              id: `vogue-${rawEvent.title.replace(/\s+/g, '-').toLowerCase()}-${startDate.getTime()}`,
              name: rawEvent.title, // Include name for compatibility
              title: rawEvent.title,
              description: `${rawEvent.title} at ${this.name}`,
              image: rawEvent.imgSrc,
              date: startDate.toISOString(), // Add ISO date string format
              startDate,
              endDate,
              season: this.determineSeason(startDate),
              category: 'Music', // Single category string for iOS compatibility 
              categories: ['Music', 'Performance'],
              location: this.name,
              venue: {
                name: this.name,
                address: '918 Granville St',
                city: 'Vancouver',
                state: 'BC',
                country: 'Canada',
                coordinates: { lat: 49.2810, lng: -123.1210 }
              },
              sourceURL: this.url,
              officialWebsite: rawEvent.ticketLink || 'https://voguetheatre.com/',
              tickets: rawEvent.ticketLink
            });
          } catch (err) {
            console.error('Error processing event:', err.message);
          }
        }
      }
      
      console.log(`${this.name} scraper found ${events.length} events`);
    } catch (error) {
      console.error(`Error scraping ${this.name}:`, error.message);
    }
    
    return events;
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
module.exports = new VogueTheatreScraper();
