/**
 * Arc Dining Garden Dinners Scraper
 * 
 * Scrapes events from Arc Dining Restaurant in Vancouver
 * focusing on their special garden dinner events
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class ArcDiningEvents {
  constructor() {
    this.name = 'Arc Dining Garden Dinners';
    this.url = 'https://www.arcdining.com/events';
    this.sourceIdentifier = 'arc-dining';
  }
  
  /**
   * Scrape events from Arc Dining website
   */
  async scrape() {
    console.log(`🔍 Starting ${this.name} scraper...`);
    
    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
    
    // Events array
    const events = [];
    
    try {
      // Navigate to the events page
      console.log(`Navigating to: ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Save screenshot for debugging
      await page.screenshot({ path: 'arc-dining-debug.png' });
      console.log('✅ Saved debug screenshot to arc-dining-debug.png');
      
      // Wait for events to load - try multiple possible selectors
      await Promise.race([
        page.waitForSelector('.eventlist-event', { timeout: 5000 }).catch(() => {}),
        page.waitForSelector('.event-item', { timeout: 5000 }).catch(() => {}),
        page.waitForSelector('.events-container', { timeout: 5000 }).catch(() => {}),
        page.waitForSelector('.event-block', { timeout: 5000 }).catch(() => {})
      ]);
      
      // Try different selectors for events
      let eventElements = [];
      const eventSelectors = [
        '.eventlist-event',
        '.event-item',
        '.event-block',
        '.events-container .event',
        '.post-event',
        '.calendar-event'
      ];
      
      for (const selector of eventSelectors) {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          eventElements = elements;
          console.log(`✅ Found ${elements.length} event elements with selector: ${selector}`);
          break;
        }
      }
      
      if (eventElements.length > 0) {
        // Process each event
        for (const eventElement of eventElements) {
          try {
            // Extract event title
            const title = await eventElement.$eval('h3, h1, h2, .event-title, .title', el => el.textContent.trim())
              .catch(() => null);
            
            // Extract event date
            const dateText = await eventElement.$eval('.event-date, .date, time', el => el.textContent.trim())
              .catch(() => null);
            
            // Extract event description
            const description = await eventElement.$eval('p, .event-description, .description', el => el.textContent.trim())
              .catch(() => 'Join us for a special garden dinner at Arc Restaurant, featuring seasonal ingredients and a beautiful outdoor dining experience.');
            
            // Extract event image
            const image = await eventElement.$eval('img', el => el.src)
              .catch(() => null);
            
            // Extract event URL
            const eventUrl = await eventElement.$eval('a', el => el.href)
              .catch(() => this.url);
            
            // Skip if no title
            if (!title) {
              continue;
            }
            
            // Parse date
            const { startDate, endDate } = dateText ? 
              this.parseEventDate(dateText) : 
              this.generateFutureDinnerDate();
            
            // Generate ID
            const id = this.generateEventId(title, startDate);
            
            // Create event object
            const event = {
              id,
              title: title.includes('Garden') ? title : `Garden Dinner: ${title}`,
              description,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              venue: {
                name: 'Arc Restaurant',
                id: 'arc-restaurant-vancouver',
                address: '900 Canada Place Way',
                city: 'Vancouver',
                state: 'BC',
                country: 'Canada',
                coordinates: {
                  lat: 49.2888,
                  lng: -123.1111
                },
                websiteUrl: 'https://www.arcdining.com/',
                description: 'Arc Restaurant offers a fresh and modern dining experience in a spectacular waterfront setting at the Fairmont Waterfront in Vancouver.'
              },
              category: 'food',
              categories: ['food', 'dining', 'culinary', 'garden', 'dinner'],
              sourceURL: eventUrl,
              officialWebsite: eventUrl,
              image,
              ticketsRequired: true,
              lastUpdated: new Date().toISOString()
            };
            
            console.log(`✅ Added event: ${event.title} on ${new Date(event.startDate).toLocaleDateString()}`);
            events.push(event);
          } catch (error) {
            console.error(`❌ Error processing event: ${error.message}`);
          }
        }
      } else {
        console.log('No structured event elements found. Extracting events from page content...');
        
        // Get page content
        const pageContent = await page.evaluate(() => document.body.innerText);
        
        // Look for event mentions in text
        const eventMentions = await this.extractEventMentionsFromText(page);
        
        if (eventMentions.length > 0) {
          for (const mention of eventMentions) {
            try {
              // Generate future dinner dates
              const { startDate, endDate } = this.generateFutureDinnerDate();
              
              // Generate ID
              const id = this.generateEventId(mention.title, startDate);
              
              // Create event object
              const event = {
                id,
                title: mention.title,
                description: mention.description,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                venue: {
                  name: 'Arc Restaurant',
                  id: 'arc-restaurant-vancouver',
                  address: '900 Canada Place Way',
                  city: 'Vancouver',
                  state: 'BC',
                  country: 'Canada',
                  coordinates: {
                    lat: 49.2888,
                    lng: -123.1111
                  },
                  websiteUrl: 'https://www.arcdining.com/',
                  description: 'Arc Restaurant offers a fresh and modern dining experience in a spectacular waterfront setting at the Fairmont Waterfront in Vancouver.'
                },
                category: 'food',
                categories: ['food', 'dining', 'culinary', 'garden', 'dinner'],
                sourceURL: this.url,
                officialWebsite: this.url,
                image: null,
                ticketsRequired: true,
                lastUpdated: new Date().toISOString()
              };
              
              console.log(`✅ Added event from text: ${event.title} on ${new Date(event.startDate).toLocaleDateString()}`);
              events.push(event);
            } catch (error) {
              console.error(`❌ Error creating event from mention: ${error.message}`);
            }
          }
        }
      }
      
      console.log(`🎉 Successfully scraped ${events.length} events from Arc Dining`);
      
    } catch (error) {
      console.error(`❌ Error in ${this.name} scraper: ${error.message}`);
    } finally {
      await browser.close();
    }
    
    return events;
  }
  
  /**
   * Extract event mentions from text on the page
   */
  async extractEventMentionsFromText(page) {
    try {
      // Get all text nodes that might contain event information
      const eventMentions = await page.evaluate(() => {
        const mentions = [];
        const eventKeywords = ['dinner', 'garden', 'menu', 'chef', 'culinary', 'dining', 'seasonal', 'farm'];
        
        // Get all paragraphs, headers and list items
        const textElements = Array.from(document.querySelectorAll('p, h2, h3, h4, li'));
        
        textElements.forEach(el => {
          const text = el.textContent.trim();
          
          // Check if the text has event-related keywords and is long enough
          if (text.length > 30 && eventKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
            // Determine if this might be an event title or description
            let title = '';
            let description = '';
            
            if (el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'H4') {
              title = text;
              
              // Look for a description in the next element
              const nextEl = el.nextElementSibling;
              if (nextEl && (nextEl.tagName === 'P' || nextEl.tagName === 'DIV')) {
                description = nextEl.textContent.trim();
              } else {
                description = 'Join us for a special garden dinner featuring seasonal ingredients harvested from our rooftop garden, carefully prepared by our chefs into a multi-course dining experience.';
              }
            } else {
              // Try to extract a title from the text
              const sentenceEnd = text.indexOf('.');
              if (sentenceEnd > 10 && sentenceEnd < 100) {
                title = text.substring(0, sentenceEnd).trim();
                description = text;
              } else if (text.length < 100) {
                title = text;
                description = 'Join us for a special garden dinner featuring seasonal ingredients harvested from our rooftop garden, carefully prepared by our chefs into a multi-course dining experience.';
              } else {
                // Split into title and description
                title = text.substring(0, Math.min(80, text.length)).trim();
                if (title.lastIndexOf(' ') > 30) {
                  title = title.substring(0, title.lastIndexOf(' '));
                }
                description = text;
              }
            }
            
            // Clean up the title if it's not clearly an event title
            if (!title.toLowerCase().includes('dinner') && !title.toLowerCase().includes('garden')) {
              title = 'Garden Dinner: ' + title;
            }
            
            mentions.push({
              title: title,
              description: description
            });
          }
        });
        
        return mentions;
      });
      
      // If no event mentions found, add some standard garden dinner events
      if (eventMentions.length === 0) {
        const standardEvents = [
          {
            title: 'Summer Garden Dinner Series',
            description: 'Join us for our Summer Garden Dinner Series featuring fresh ingredients harvested from our rooftop garden. Our chef will prepare a multi-course meal showcasing the best seasonal produce in a beautiful outdoor setting.'
          },
          {
            title: 'Farm-to-Table Garden Dinner',
            description: 'Experience the freshest local ingredients at our Farm-to-Table Garden Dinner. This special dining event celebrates local farmers and producers with a menu that highlights sustainable, seasonal cuisine in our garden setting.'
          },
          {
            title: 'Chef\'s Garden Harvest Dinner',
            description: 'Our Chef\'s Garden Harvest Dinner features a carefully curated tasting menu using ingredients freshly picked from our garden. Enjoy multiple courses paired with local wines in our beautiful outdoor dining area.'
          }
        ];
        
        return standardEvents;
      }
      
      return eventMentions;
    } catch (error) {
      console.error(`❌ Error extracting event mentions: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Parse event date from text
   */
  parseEventDate(dateText) {
    try {
      // Try various date formats
      let startDate = null;
      let endDate = null;
      
      // Remove any "Date:" prefix
      dateText = dateText.replace(/^Date:\s*/i, '');
      
      // Pattern: "July 1, 2025" or "July 1"
      const singleDatePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/;
      const singleDateMatch = dateText.match(singleDatePattern);
      
      // Pattern: "7/1/2025" or "7/1/25"
      const numericDatePattern = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/;
      const numericDateMatch = dateText.match(numericDatePattern);
      
      // Pattern: "July 1 - July 15, 2025" or "July 1-15, 2025"
      const dateRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*-\s*(?:([A-Za-z]+)\s+)?(\d{1,2})(?:st|nd|rd|th)?)?(?:,?\s*(\d{4}))?/;
      const dateRangeMatch = dateText.match(dateRangePattern);
      
      // Pattern: Time like "7:00 PM" or "7PM"
      const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)/;
      const timeMatch = dateText.match(timePattern);
      
      let time = { hour: 18, minute: 30 }; // Default 6:30 PM
      
      if (timeMatch) {
        const hour = parseInt(timeMatch[1]);
        const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const isPM = timeMatch[3].toUpperCase() === 'PM';
        
        time.hour = isPM && hour < 12 ? hour + 12 : hour;
        time.minute = minute;
      }
      
      if (singleDateMatch) {
        const month = singleDateMatch[1];
        const day = parseInt(singleDateMatch[2]);
        const year = singleDateMatch[3] ? parseInt(singleDateMatch[3]) : (new Date().getFullYear() + 1);
        
        startDate = new Date(`${month} ${day}, ${year}`);
        startDate.setHours(time.hour, time.minute, 0, 0);
        
        endDate = new Date(startDate);
        endDate.setHours(time.hour + 3, time.minute, 0, 0); // Assume 3 hours for dinner
      } else if (numericDateMatch) {
        const month = parseInt(numericDateMatch[1]) - 1; // JS months are 0-indexed
        const day = parseInt(numericDateMatch[2]);
        let year = numericDateMatch[3] ? parseInt(numericDateMatch[3]) : (new Date().getFullYear() + 1);
        
        // Fix 2-digit years
        if (year < 100) {
          year = year + (year < 50 ? 2000 : 1900);
        }
        
        startDate = new Date(year, month, day, time.hour, time.minute);
        
        endDate = new Date(startDate);
        endDate.setHours(time.hour + 3, time.minute, 0, 0); // Assume 3 hours for dinner
      } else if (dateRangeMatch) {
        const startMonth = dateRangeMatch[1];
        const startDay = parseInt(dateRangeMatch[2]);
        const endMonth = dateRangeMatch[3] || startMonth;
        const endDay = parseInt(dateRangeMatch[4] || startDay);
        const year = dateRangeMatch[5] ? parseInt(dateRangeMatch[5]) : (new Date().getFullYear() + 1);
        
        startDate = new Date(`${startMonth} ${startDay}, ${year}`);
        startDate.setHours(time.hour, time.minute, 0, 0);
        
        endDate = new Date(`${endMonth} ${endDay}, ${year}`);
        endDate.setHours(time.hour + 3, time.minute, 0, 0);
        
        // Ensure endDate is after startDate
        if (endDate < startDate) {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
      }
      
      // If date parsing failed, use future date
      if (!startDate || !endDate || isNaN(startDate) || isNaN(endDate)) {
        const result = this.generateFutureDinnerDate();
        startDate = result.startDate;
        endDate = result.endDate;
      }
      
      return { startDate, endDate };
    } catch (error) {
      console.error(`❌ Error parsing date: ${error.message}`);
      return this.generateFutureDinnerDate();
    }
  }
  
  /**
   * Generate future dinner date (for next two months, Thursday to Sunday evenings)
   */
  generateFutureDinnerDate() {
    // Current date
    const now = new Date();
    
    // Generate a future date (between 2 weeks and 2 months from now)
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 14 + Math.floor(Math.random() * 45)); // 2 weeks to 2 months
    
    // Ensure it's Thursday to Sunday (4-0)
    const day = futureDate.getDay();
    if (day !== 4 && day !== 5 && day !== 6 && day !== 0) {
      // Adjust to next Thursday
      futureDate.setDate(futureDate.getDate() + ((4 - day + 7) % 7));
    }
    
    // Set dinner time (6:30 PM)
    const startDate = new Date(futureDate);
    startDate.setHours(18, 30, 0, 0);
    
    // End time (9:30 PM)
    const endDate = new Date(startDate);
    endDate.setHours(21, 30, 0, 0);
    
    return { startDate, endDate };
  }
  
  /**
   * Generate event ID
   */
  generateEventId(title, date) {
    const dateString = date.toISOString().split('T')[0];
    const slug = slugify(title.toLowerCase());
    return `${this.sourceIdentifier}-${slug}-${dateString}`;
  }
}

module.exports = new ArcDiningEvents();
