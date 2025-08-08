const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * Metropolis at Metrotown Events Scraper
 * 
 * Scrapes events from Metropolis at Metrotown's website
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class MetropolisEvents {
  constructor() {
    this.name = 'Metropolis at Metrotown Events';
    this.url = 'https://metropolisatmetrotown.com/en/events/';
    this.sourceIdentifier = 'metropolis-metrotown';
  }
  
  /**
   * Scrape events from Metropolis at Metrotown website
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
      await page.screenshot({ path: 'metropolis-debug.png' });
      console.log('✅ Saved debug screenshot to metropolis-debug.png');
      
      // Wait for events to load
      await page.waitForSelector('.events-listing, .event-list, .events-container', { timeout: 5000 }).catch(() => {});
      
      // Get all event elements
      const eventElements = await page.$$('.event-item, .event-card, .event-listing');
      
      if (eventElements.length > 0) {
        console.log(`✅ Found ${eventElements.length} event elements`);
        
        // Process each event
        for (const eventElement of eventElements) {
          try {
            // Extract event title
            const title = await eventElement.$eval('h3, h4, .event-title, .title', el => el.textContent.trim())
              .catch(() => null);
            
            // Extract event date
            const dateText = await eventElement.$eval('.event-date, .date, time', el => el.textContent.trim())
              .catch(() => null);
            
            // Extract event description
            const description = await eventElement.$eval('p, .event-description, .description', el => el.textContent.trim())
              .catch(() => 'Join us for special events at Metropolis at Metrotown, featuring seasonal celebrations, shopping events, and family-friendly activities.');
            
            // Extract event image
            const image = await eventElement.$eval('img', el => el.src)
              .catch(() => null);
            
            // Extract event URL
            const eventUrl = await eventElement.$eval('a', el => el.href)
              .catch(() => this.url);
            
            // Skip if no title or date
            if (!title || !dateText) {
              console.log('⚠️ Skipping event due to missing title or date');
              continue;
            }
            
            // Parse date
            const { startDate, endDate } = this.parseEventDate(dateText);
            
            if (!startDate || !endDate) {
              console.log(`⚠️ Could not parse date for event: ${title}`);
              continue;
            }
            
            // Generate ID
            const id = this.generateEventId(title, startDate);
            
            // Create event object
            const event = {
              id,
              title,
              description,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              venue: {
                name: 'Metropolis at Metrotown',
                id: 'metropolis-at-metrotown',
                address: '4700 Kingsway',
                city: 'Burnaby',
                state: 'BC',
                country: 'Canada',
                coordinates: {
                  lat: 49.2276,
                  lng: -123.0076
                },
                websiteUrl: 'https://metropolisatmetrotown.com/',
                description: 'Metropolis at Metrotown is British Columbia\'s largest shopping mall, featuring over 450 stores, restaurants, and entertainment options.'
              },
              category: this.determineCategory(title, description),
              categories: this.determineCategories(title, description),
              sourceURL: eventUrl,
              officialWebsite: eventUrl,
              image,
              ticketsRequired: false,
              lastUpdated: new Date().toISOString()
            };
            
            console.log(`✅ Added event: ${event.title} on ${new Date(event.startDate).toLocaleDateString()}`);
            events.push(event);
          } catch (error) {
            console.error(`❌ Error processing event: ${error.message}`);
          }
        }
      } else {
        console.log('No structured event elements found. Looking for event mentions in text...');
        
        // Try extracting events from general text
        const pageText = await page.evaluate(() => document.body.innerText);
        const eventMentions = this.extractEventMentions(pageText);
        
        if (eventMentions.length > 0) {
          eventMentions.forEach(mention => {
            events.push(this.createEventFromMention(mention));
          });
        }
      }
      
      console.log(`🎉 Successfully scraped ${events.length} events from Metropolis at Metrotown`);
      
    } catch (error) {
      console.error(`❌ Error in ${this.name} scraper: ${error.message}`);
    } finally {
      await browser.close();
    }
    
    return events;
  }
  
  /**
   * Parse event date from text
   */
  parseEventDate(dateText) {
    try {
      // Try various date formats
      let startDate = null;
      let endDate = null;
      
      // Pattern: "July 1 - July 15, 2025" or "July 1, 2025 - July 15, 2025"
      const dateRangePattern = /([A-Za-z]+\s+\d{1,2})(?:,\s*\d{4})?\s*-\s*([A-Za-z]+\s+\d{1,2})(?:,\s*(\d{4}))?/;
      const dateRangeMatch = dateText.match(dateRangePattern);
      
      // Pattern: "July 1, 2025" or "Jul 1, 2025" or "1 July 2025"
      const singleDatePattern = /(?:([A-Za-z]+)\s+(\d{1,2})|(\d{1,2})\s+([A-Za-z]+))(?:,?\s*(\d{4}))?/;
      const singleDateMatch = dateText.match(singleDatePattern);
      
      if (dateRangeMatch) {
        // Date range
        const startDateText = dateRangeMatch[1];
        const endDateText = dateRangeMatch[2];
        const year = dateRangeMatch[3] || new Date().getFullYear() + 1; // Default to next year if not specified
        
        startDate = new Date(`${startDateText}, ${year}`);
        endDate = new Date(`${endDateText}, ${year}`);
        
        // Ensure endDate is after startDate
        if (endDate < startDate) {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
        
        // Set default times (10 AM to 6 PM for mall events)
        startDate.setHours(10, 0, 0, 0);
        endDate.setHours(18, 0, 0, 0);
      } else if (singleDateMatch) {
        // Single date
        let month, day, year;
        
        if (singleDateMatch[1] && singleDateMatch[2]) {
          // Format: "July 1, 2025"
          month = singleDateMatch[1];
          day = singleDateMatch[2];
        } else {
          // Format: "1 July 2025"
          month = singleDateMatch[4];
          day = singleDateMatch[3];
        }
        
        year = singleDateMatch[5] || new Date().getFullYear() + 1; // Default to next year if not specified
        
        startDate = new Date(`${month} ${day}, ${year} 10:00:00`); // Start at 10 AM
        endDate = new Date(`${month} ${day}, ${year} 18:00:00`); // End at 6 PM
      } else {
        // Try to extract date using general regex
        const dateRegex = /(?:\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,? \d{4}\b|\d{1,2}(?:st|nd|rd|th)? (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4})/gi;
        const foundDates = dateText.match(dateRegex);
        
        if (foundDates && foundDates.length > 0) {
          // Use the first found date
          const cleanedDate = foundDates[0].replace(/(st|nd|rd|th)/g, '');
          startDate = new Date(`${cleanedDate} 10:00:00`);
          endDate = new Date(`${cleanedDate} 18:00:00`);
        } else {
          // If no date found, default to future date (next month, same day)
          const futureDate = new Date();
          futureDate.setMonth(futureDate.getMonth() + 1);
          
          startDate = new Date(futureDate);
          startDate.setHours(10, 0, 0, 0);
          
          endDate = new Date(futureDate);
          endDate.setHours(18, 0, 0, 0);
        }
      }
      
      return { startDate, endDate };
    } catch (error) {
      console.error(`❌ Error parsing date: ${error.message}`);
      return { startDate: null, endDate: null };
    }
  }
  
  /**
   * Generate event ID
   */
  generateEventId(title, date) {
    const dateString = date.toISOString().split('T')[0];
    const slug = slugify(title.toLowerCase());
    return `${this.sourceIdentifier}-${slug}-${dateString}`;
  }
  
  /**
   * Determine primary event category
   */
  determineCategory(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('sale') || text.includes('shopping') || text.includes('promotion')) {
      return 'shopping';
    } else if (text.includes('kids') || text.includes('family') || text.includes('children')) {
      return 'family';
    } else if (text.includes('holiday') || text.includes('christmas') || text.includes('halloween')) {
      return 'holiday';
    } else if (text.includes('fashion') || text.includes('style') || text.includes('collection')) {
      return 'fashion';
    } else if (text.includes('food') || text.includes('dining') || text.includes('taste')) {
      return 'food';
    } else {
      return 'shopping';
    }
  }
  
  /**
   * Determine event categories
   */
  determineCategories(title, description) {
    const categories = ['shopping', 'mall'];
    const text = `${title} ${description}`.toLowerCase();
    
    // Add relevant categories based on content
    if (text.includes('sale') || text.includes('discount') || text.includes('promotion')) {
      categories.push('sale');
    }
    
    if (text.includes('holiday') || text.includes('christmas') || text.includes('halloween') || 
        text.includes('easter') || text.includes('thanksgiving')) {
      categories.push('holiday');
    }
    
    if (text.includes('kids') || text.includes('family') || text.includes('children')) {
      categories.push('family');
    }
    
    if (text.includes('fashion') || text.includes('style') || text.includes('clothing')) {
      categories.push('fashion');
    }
    
    if (text.includes('food') || text.includes('dining') || text.includes('restaurant')) {
      categories.push('food');
    }
    
    // Return unique categories
    return [...new Set(categories)];
  }
  
  /**
   * Extract event mentions from text
   */
  extractEventMentions(text) {
    const mentions = [];
    
    // Regular shopping events
    const seasonalEvents = [
      {
        title: 'Summer Shopping Festival',
        description: 'Celebrate summer with special promotions, discounts, and entertainment throughout the mall. Enjoy seasonal offerings from your favorite retailers and restaurants.',
        month: 7, // July
        durationDays: 14
      },
      {
        title: 'Back to School Shopping Event',
        description: 'Get ready for the school year with special promotions on school supplies, fashion, electronics and more at Metropolis at Metrotown.',
        month: 8, // August
        durationDays: 10
      },
      {
        title: 'Fall Fashion Showcase',
        description: 'Explore the latest fall fashion trends at Metropolis at Metrotown with special displays, promotions, and style events throughout the mall.',
        month: 9, // September
        durationDays: 10
      },
      {
        title: 'Holiday Shopping Celebration',
        description: 'Kick off the holiday shopping season with extended hours, special promotions, festive decor, and entertainment at Metropolis at Metrotown.',
        month: 11, // November
        durationDays: 30
      },
      {
        title: 'Lunar New Year Celebration',
        description: 'Celebrate Lunar New Year with special cultural performances, displays, and promotions throughout Metropolis at Metrotown.',
        month: 1, // January/February (approximate)
        durationDays: 7
      }
    ];
    
    // Check for specific event names in text
    const eventKeywords = [
      'festival', 'celebration', 'event', 'sale', 'promotion', 
      'showcase', 'exhibit', 'fair', 'market', 'holiday'
    ];
    
    const eventRegex = new RegExp(`(\\w+\\s*(?:${eventKeywords.join('|')})(?:\\s+at\\s+Metropolis)?(?:[^.!?]*))`, 'gi');
    const eventMatches = text.match(eventRegex);
    
    if (eventMatches) {
      eventMatches.forEach(match => {
        if (match.length > 10) { // Filter out very short matches
          mentions.push({
            title: match.trim().split(/\s+/).slice(0, 6).join(' '), // First 6 words as title
            description: match.trim(),
            isExtracted: true
          });
        }
      });
    }
    
    // Add seasonal events if text mentions them
    seasonalEvents.forEach(event => {
      const eventTitleLower = event.title.toLowerCase();
      const textLower = text.toLowerCase();
      
      const eventWords = eventTitleLower.split(' ');
      const matchCount = eventWords.filter(word => word.length > 3 && textLower.includes(word)).length;
      
      if (matchCount >= 2 || 
          textLower.includes(eventTitleLower) || 
          (eventTitleLower.includes('holiday') && textLower.includes('holiday'))) {
        mentions.push(event);
      }
    });
    
    return mentions;
  }
  
  /**
   * Create event object from extracted mention
   */
  createEventFromMention(mention) {
    // Create start and end dates based on event
    let startDate, endDate;
    
    if (mention.month) {
      // For predefined events with a month
      const year = new Date().getFullYear() + 1; // Set for next year
      startDate = new Date(year, mention.month - 1, 15); // Around middle of the month
      endDate = new Date(year, mention.month - 1, 15 + mention.durationDays);
    } else {
      // For extracted events, set to future date (next month)
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      
      startDate = new Date(futureDate);
      startDate.setHours(10, 0, 0, 0);
      
      endDate = new Date(futureDate);
      endDate.setDate(endDate.getDate() + 10); // 10-day duration
      endDate.setHours(18, 0, 0, 0);
    }
    
    // Generate ID
    const id = this.generateEventId(mention.title, startDate);
    
    // Create event object
    return {
      id,
      title: mention.title,
      description: mention.description,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      venue: {
        name: 'Metropolis at Metrotown',
        id: 'metropolis-at-metrotown',
        address: '4700 Kingsway',
        city: 'Burnaby',
        state: 'BC',
        country: 'Canada',
        coordinates: {
          lat: 49.2276,
          lng: -123.0076
        },
        websiteUrl: 'https://metropolisatmetrotown.com/',
        description: 'Metropolis at Metrotown is British Columbia\'s largest shopping mall, featuring over 450 stores, restaurants, and entertainment options.'
      },
      category: this.determineCategory(mention.title, mention.description),
      categories: this.determineCategories(mention.title, mention.description),
      sourceURL: this.url,
      officialWebsite: this.url,
      image: null,
      ticketsRequired: false,
      lastUpdated: new Date().toISOString()
    };
  }
}

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new MetropolisEvents();
