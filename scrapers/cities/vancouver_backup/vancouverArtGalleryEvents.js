/**
 * Vancouver Art Gallery Events Real Scraper
 * 
 * This scraper extracts actual events from the Vancouver Art Gallery website
 * Source: https://www.vanartgallery.bc.ca/exhibitions-events
 * 
 * Uses Puppeteer to handle JavaScript-rendered content
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class VancouverArtGalleryEventsScraper {
  constructor() {
    this.name = 'Vancouver Art Gallery Events';
    this.url = 'https://www.vanartgallery.bc.ca/exhibitions-events';
    this.sourceIdentifier = 'vancouver-art-gallery';
    this.enabled = true;
  }

  /**
   * Format a date range string into standard format
   * @param {string} dateStr - Date range string from website
   * @returns {Object} - Object containing start and end dates
   */
  parseDateRange(dateStr) {
    if (!dateStr) return { startDate: null, endDate: null };
    
    try {
      // Handle various date formats
      dateStr = dateStr.trim();
      
      // Format patterns common on art gallery website (e.g., "Jan 20 - Mar 30, 2023")
      if (dateStr.includes('–') || dateStr.includes('-')) {
        const separator = dateStr.includes('–') ? '–' : '-';
        let [startPart, endPart] = dateStr.split(separator).map(s => s.trim());
        
        // If end part doesn't have year but start part does, add the year
        if (startPart.includes(',') && !endPart.includes(',')) {
          const year = startPart.match(/\d{4}/);
          if (year) {
            endPart = `${endPart}, ${year[0]}`;
          }
        }
        
        const startDate = new Date(startPart);
        const endDate = new Date(endPart);
        endDate.setHours(23, 59, 59);
        
        return { startDate, endDate };
      } else {
        // Single date
        const date = new Date(dateStr);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59);
        
        return { startDate: date, endDate };
      }
    } catch (error) {
      console.log(`Could not parse date: ${dateStr}`);
      // If date parsing fails, create a default date range (today to 30 days from now)
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      return { startDate, endDate };
    }
  }

  /**
   * Determine categories based on event description and title
   * @param {string} title - Event title
   * @param {string} description - Event description
   * @returns {string[]} - Array of category strings
   */
  determineCategories(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const categories = ['arts', 'event']; // Default for art gallery
    
    // Add more specific categories based on keywords
    if (text.includes('exhibition') || text.includes('exhibit') || text.includes('gallery')) {
      categories.push('exhibition');
    }
    
    if (text.includes('workshop') || text.includes('class') || text.includes('education')) {
      categories.push('workshop');
    }
    
    if (text.includes('talk') || text.includes('lecture') || text.includes('discussion')) {
      categories.push('talk');
    }
    
    if (text.includes('family') || text.includes('kids') || text.includes('children')) {
      categories.push('family');
    }
    
    if (text.includes('film') || text.includes('movie') || text.includes('cinema')) {
      categories.push('film');
    }
    
    if (text.includes('music') || text.includes('concert') || text.includes('performance')) {
      categories.push('music');
    }
    
    return categories;
  }

  /**
   * Main scraper function that extracts events from Vancouver Art Gallery website
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
      // Launch Puppeteer browser with ignoring SSL errors
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--ignore-certificate-errors',
          '--ignore-certificate-errors-spki-list'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      // Navigate to the events page
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      
      // Wait for event elements to load
      console.log('Waiting for event elements to load...');
      await Promise.race([
        page.waitForSelector('.exhibitions-events__item, .event-item, .event-card', { timeout: 10000 }),
        new Promise(resolve => setTimeout(resolve, 10000)) // Timeout fallback
      ]);
      
      // Save screenshot for debugging
      await page.screenshot({ path: '/tmp/vancouver-art-gallery-page.png', fullPage: true });
      console.log('Page screenshot saved to /tmp/vancouver-art-gallery-page.png');
      
      // Extra wait time for any dynamic content
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Extracting events from the page...');
      
      // Extract events
      const extractedEvents = await page.evaluate(() => {
        // Try multiple selectors to find event elements
        const selectors = [
          '.exhibitions-events__item', 
          '.event-item', 
          '.event-card',
          '.event',
          'article',
          '.list-item'
        ];
        
        let eventElements = [];
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            eventElements = Array.from(elements);
            break;
          }
        }
        
        if (eventElements.length === 0) {
          // If no specific elements found, try to extract any reasonable content
          console.log('No specific event elements found, trying general approach');
          const contentDivs = document.querySelectorAll('div[class*="content"], div[class*="event"]');
          eventElements = Array.from(contentDivs);
        }
        
        return eventElements.map(element => {
          // Extract title
          const titleElement = element.querySelector('h1, h2, h3, h4, [class*="title"]');
          const title = titleElement ? titleElement.innerText.trim() : '';
          
          // Extract date
          const dateElement = element.querySelector('[class*="date"], time, [class*="time"]');
          const dateText = dateElement ? dateElement.innerText.trim() : '';
          
          // Extract description
          const descriptionElement = element.querySelector('[class*="description"], [class*="text"], p');
          const description = descriptionElement ? descriptionElement.innerText.trim() : '';
          
          // Extract image
          const imgElement = element.querySelector('img');
          const imageUrl = imgElement ? 
            (imgElement.src || imgElement.getAttribute('data-src')) : '';
          
          // Extract link
          const linkElement = element.querySelector('a');
          const eventUrl = linkElement ? linkElement.href : '';
          
          return {
            title,
            dateText,
            description,
            imageUrl,
            eventUrl
          };
        }).filter(e => e.title); // Only include events with a title
      });
      
      console.log(`Found ${extractedEvents.length} events on the page`);
      
      // Process extracted events
      for (const item of extractedEvents) {
        // Create a default date range if none is extracted
        const { startDate, endDate } = this.parseDateRange(item.dateText);
        
        // Generate a unique ID
        const dateStr = startDate ? startDate.toISOString().split('T')[0] : 'ongoing';
        const eventId = `vag-${slugify(item.title, { lower: true })}-${dateStr}`;
        
        // Determine categories
        const categories = this.determineCategories(item.title, item.description);
        
        // Create venue information
        const venue = {
          name: 'Vancouver Art Gallery',
          id: 'vancouver-art-gallery',
          city: 'Vancouver',
          state: 'BC',
          country: 'Canada',
          address: '750 Hornby St, Vancouver, BC V6Z 2H7'
        };
        
        // Create the event object
        const event = {
          id: eventId,
          title: item.title,
          description: item.description || `${item.title} at Vancouver Art Gallery`,
          startDate,
          endDate,
          venue,
          category: categories[0],
          categories,
          sourceURL: this.url,
          officialWebsite: item.eventUrl || this.url,
          image: item.imageUrl,
          lastUpdated: new Date()
        };
        
        events.push(event);
        console.log(`✅ Added event: ${item.title}`);
      }
      
      console.log(`🎉 Successfully scraped ${events.length} Vancouver Art Gallery events`);
    } catch (error) {
      console.error(`❌ Error scraping ${this.name}:`, error);
    } finally {
      if (browser) await browser.close();
    }
    
    return events;
  }
}

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new VancouverArtGalleryEventsScraper();
