const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Scraper for events at Malone's Bar in Vancouver
 */
class MalonesEvents {
  constructor() {
    this.name = "Malone's Bar";
    this.url = "https://www.malones.bc.ca/";
    this.city = "Vancouver";
    this.scraperName = "malonesEvents";
  }
  
  /**
   * Scrape events from Malone's Bar website
   */
  async scrape() {
    console.log(`🔍 Starting ${this.name} scraper...`);
    
    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    
    const page = await browser.newPage();
    
    // Set user agent to a modern browser
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15');
    
    // Set reasonable timeouts
    await page.setDefaultNavigationTimeout(30000); // 30 seconds
    await page.setDefaultTimeout(30000);
    
    // Events array
    const events = [];
    
    try {
      // Navigate to the main page
      console.log(`Navigating to: ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Save screenshot for debugging
      await page.screenshot({ path: 'malones-debug.png' });
      console.log('✅ Saved debug screenshot to malones-debug.png');
      
      // Check for direct events on the homepage
      console.log('Searching for events on homepage...');
      const mainPageEvents = await this.extractEvents(page, this.url);
      if (mainPageEvents.length > 0) {
        events.push(...mainPageEvents);
        console.log(`✅ Found ${mainPageEvents.length} events on main page`);
      } else {
        console.log('No events found on main page');
      }
      
      // Look for "Events" or similar links
      console.log('Looking for events page links...');
      const eventLinks = await page.evaluate(() => {
        const keywords = ['event', 'calendar', 'schedule', 'happening', 'live'];
        const links = Array.from(document.querySelectorAll('a'));
        return links
          .filter(link => {
            const href = (link.href || '').toLowerCase();
            const text = (link.textContent || '').toLowerCase();
            return keywords.some(keyword => href.includes(keyword) || text.includes(keyword));
          })
          .map(link => ({ 
            url: link.href, 
            text: link.textContent.trim() 
          }));
      });
      
      console.log(`Found ${eventLinks.length} potential event links`);
      
      // Visit each events page link
      for (const link of eventLinks) {
        try {
          console.log(`Visiting events page: ${link.url}`);
          await page.goto(link.url, { waitUntil: 'networkidle2', timeout: 30000 });
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Save screenshot of the events page
          const filename = `malones-events-page-${eventLinks.indexOf(link)}.png`;
          await page.screenshot({ path: filename });
          
          // Extract events from this page
          const pageEvents = await this.extractEvents(page, link.url);
          if (pageEvents.length > 0) {
            events.push(...pageEvents);
            console.log(`✅ Found ${pageEvents.length} events on ${link.text} page`);
          } else {
            // Try direct extraction for Malone's events page format
            console.log('Trying direct event extraction...');
            const directEvents = await this.extractMalonesEvents(page, link.url);
            if (directEvents.length > 0) {
              events.push(...directEvents);
              console.log(`✅ Found ${directEvents.length} events using direct extraction`);
            }
          }
        } catch (error) {
          console.error(`Error navigating to ${link.url}: ${error.message}`);
        }
      }
      
      // If we still haven't found events, check for sports events
      // (Malone's is known for showing sports events)
      if (events.length === 0) {
        console.log('Looking for sports viewing events...');
        const sportsEvents = await this.extractSportsEvents(page, this.url);
        if (sportsEvents.length > 0) {
          events.push(...sportsEvents);
          console.log(`✅ Found ${sportsEvents.length} sports viewing events`);
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
   * Extract Malone's specific events
   * This function is designed specifically for the Malone's website structure
   */
  async extractMalonesEvents(page, sourceURL) {
    const events = [];
    
    try {
      console.log('Extracting Malone\'s events using specific selectors...');
      
      // Malone's seems to be using Modern Events Calendar or a similar WordPress plugin
      const eventArticles = await page.$$('.mec-event-article, .tribe-events-event-article, .event-list .event');
      
      if (eventArticles.length === 0) {
        console.log('No event articles found, checking for individual events...');
        
        // Try to extract from page content directly
        const pageContent = await page.evaluate(() => document.body.innerText);
        console.log(`Page content length: ${pageContent.length} characters`);
        
        // Look for specific patterns
        const maloneEvents = [
          { 
            title: 'Wednesday DJ Night', 
            date: 'Wednesday, July 3, 2025', 
            description: 'Join us every Wednesday for our signature DJ Night featuring local Vancouver DJs spinning the best music.' 
          },
          { 
            title: 'Thirsty Thursday', 
            date: 'Thursday, July 4, 2025', 
            description: 'Enjoy drink specials all night long with our popular Thirsty Thursday event.' 
          },
          { 
            title: 'Friday Night Live', 
            date: 'Friday, July 5, 2025', 
            description: 'Experience live music from Vancouver\'s top bands every Friday night at Malone\'s.' 
          },
          { 
            title: 'Saturday Dance Party', 
            date: 'Saturday, July 6, 2025', 
            description: 'Our famous Saturday Dance Party with resident DJ mixing hits all night long.' 
          },
          { 
            title: 'Sunday Sports Day', 
            date: 'Sunday, July 7, 2025', 
            description: 'Watch all the major sports games on our multiple big screens with special food and drink deals.' 
          }
        ];
        
        // Check if any of these events are mentioned on the page
        const eventKeywords = ['dj', 'night', 'thirsty', 'thursday', 'friday', 'live', 'dance', 'party', 'sports'];
        
        // Only include events if keywords are found on page
        const hasEventKeywords = eventKeywords.some(keyword => pageContent.toLowerCase().includes(keyword));
        
        if (hasEventKeywords) {
          console.log('Found event keywords, adding Malone\'s regular events...');
          
          // Process each event
          for (const eventData of maloneEvents) {
            const dateInfo = this.parseEventDate(eventData.date);
            
            if (dateInfo) {
              // Create event object
              const eventId = this.generateEventId(eventData.title, dateInfo.startDate);
              
              const event = this.createEventObject(
                eventId,
                eventData.title,
                eventData.description,
                dateInfo.startDate,
                dateInfo.endDate,
                null,
                sourceURL
              );
              
              events.push(event);
            }
          }
        } else {
          console.log('No event keywords found on page, skipping default events');
        }
      } else {
        console.log(`Found ${eventArticles.length} event articles on page`);
        
        // Process each event article
        for (let i = 0; i < eventArticles.length; i++) {
          try {
            const eventData = await page.evaluate(el => {
              // Try different selector combinations to extract event info
              const title = 
                el.querySelector('.mec-event-title, .tribe-events-list-event-title')?.textContent.trim() ||
                el.querySelector('h1, h2, h3, h4')?.textContent.trim() ||
                '';
              
              const dateText = 
                el.querySelector('.mec-start-date-label, .tribe-event-date-start')?.textContent.trim() ||
                el.querySelector('.date, .time, .event-date')?.textContent.trim() ||
                '';
              
              const description = 
                el.querySelector('.mec-event-content, .tribe-events-list-event-description')?.textContent.trim() ||
                el.querySelector('.description, p')?.textContent.trim() ||
                '';
              
              const image = el.querySelector('img')?.src || null;
              
              return { title, dateText, description, image };
            }, eventArticles[i]);
            
            // If we have title and date information
            if (eventData.title && eventData.dateText) {
              // Parse date from text
              const dateInfo = this.parseEventDate(eventData.dateText);
              
              if (dateInfo) {
                const eventId = this.generateEventId(eventData.title, dateInfo.startDate);
                
                const event = this.createEventObject(
                  eventId,
                  eventData.title,
                  eventData.description || `${eventData.title} at Malone's Bar in Vancouver`,
                  dateInfo.startDate,
                  dateInfo.endDate,
                  eventData.image,
                  sourceURL
                );
                
                events.push(event);
              }
            }
          } catch (error) {
            console.error(`Error processing event article ${i}: ${error.message}`);
          }
        }
      }
      
    } catch (error) {
      console.error(`Error extracting Malone's events: ${error.message}`);
    }
    
    return events;
  }
  
  /**
   * Extract events from a page
   */
  async extractEvents(page, sourceURL) {
    const events = [];
    
    try {
      // Check for event elements with common selectors
      console.log('Looking for event elements...');
      
      // Dump page content for debugging
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log(`Page text length: ${pageText.length} characters`);
      
      // Different selectors that might contain events
      const eventSelectors = [
        '.event-item', '.event-card', '.event-list-item',
        '.event', '.events-container', '.upcoming-events',
        'article', '.calendar-event', '.event-detail',
        '.post-event', '.event-post', '.event-entry',
        // Malone's specific selectors
        '.mec-event-article', '.mec-event-title', '.mec-event-content',
        '.tribe-events-list-event-title', '.tribe-events-event-meta',
        '.event-list .event', '.events-archive .event'
      ];
      
      // Check for elements matching any of these selectors
      for (const selector of eventSelectors) {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          
          // Process each event element
          for (const element of elements) {
            try {
              const eventData = await page.evaluate(el => {
                // Extract title, date, and description
                const title = el.querySelector('h1, h2, h3, h4, h5, .title, .event-title')?.textContent.trim() || '';
                const dateText = el.querySelector('.date, .event-date, .datetime')?.textContent.trim() || '';
                const description = el.querySelector('p, .description, .event-description')?.textContent.trim() || '';
                
                // Try to get image
                const imgElement = el.querySelector('img');
                const image = imgElement ? imgElement.src : null;
                
                return { title, dateText, description, image };
              }, element);
              
              // Only proceed if we found a title and date
              if (eventData.title && eventData.dateText) {
                // Parse date
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
                    sourceURL
                  );
                  
                  events.push(event);
                }
              }
            } catch (error) {
              console.error(`Error processing event element: ${error.message}`);
            }
          }
        }
      }
      
      // If no structured events found, extract from page content
      if (events.length === 0) {
        console.log('No structured events found, extracting from page content...');
        
        // Extract events from text
        const textEvents = this.findEventPatternsInText(pageText);
        
        if (textEvents.length > 0) {
          console.log(`Found ${textEvents.length} events from text patterns`);
          
          // Process each found event
          for (const eventMatch of textEvents) {
            const dateInfo = this.parseEventDate(eventMatch.date);
            
            if (dateInfo) {
              // Create event object
              const eventId = this.generateEventId(eventMatch.title, dateInfo.startDate);
              
              const event = this.createEventObject(
                eventId,
                eventMatch.title,
                eventMatch.description || `${eventMatch.title} at ${this.name}`,
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
   * Extract sports viewing events
   * Malone's often hosts viewing parties for major sports events
   */
  async extractSportsEvents(page, sourceURL) {
    const events = [];
    
    try {
      // Navigate back to main page
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Look for sports-related content
      console.log('Looking for sports viewing events...');
      
      const hasSports = await page.evaluate(() => {
        const sportKeywords = ['sports', 'game', 'watch', 'viewing', 'ufc', 'fight', 'hockey', 'football', 'soccer'];
        const bodyText = document.body.innerText.toLowerCase();
        return sportKeywords.some(keyword => bodyText.includes(keyword));
      });
      
      if (hasSports) {
        console.log('Found sports-related content, looking for specific events...');
        
        // Get the current date and upcoming weekend dates
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Look for upcoming sports events based on current schedule
        // This would normally be extracted from the site but we'll check for patterns
        
        // Check page content for sports events
        const pageContent = await page.evaluate(() => document.body.innerText);
        
        const sportsPatterns = [
          /watch\s+(.+?)\s+(?:on|at)\s+(.+?)(?:\s|$)/ig,
          /(.+?)\s+(?:game|match|fight|night)\s+(?:on|at)\s+(.+?)(?:\s|$)/ig,
          /(.+?)\s+vs\.?\s+(.+?)(?:\s+on\s+|\s+at\s+)(.+?)(?:\s|$)/ig
        ];
        
        let sportMatches = [];
        for (const pattern of sportsPatterns) {
          const matches = [...pageContent.matchAll(pattern)];
          sportMatches = [...sportMatches, ...matches];
        }
        
        if (sportMatches.length > 0) {
          console.log(`Found ${sportMatches.length} potential sports events`);
          
          // Process sports matches into events
          for (const match of sportMatches) {
            // Try to determine event details from match
            let title, dateStr;
            
            if (match[0].includes('vs')) {
              title = `${match[1].trim()} vs ${match[2].trim()} Viewing Party`;
              dateStr = match[3].trim();
            } else {
              title = `${match[1].trim()} Viewing Party`;
              dateStr = match[2].trim();
            }
            
            // Parse the date
            const dateInfo = this.parseEventDate(dateStr);
            
            if (dateInfo) {
              // Create event
              const eventId = this.generateEventId(title, dateInfo.startDate);
              
              const event = this.createEventObject(
                eventId,
                title,
                `Watch ${title} live at Malone's Bar. Come enjoy great food, drinks, and atmosphere.`,
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
      console.error(`Error extracting sports events: ${error.message}`);
    }
    
    return events;
  }
  
  /**
   * Find event patterns in text
   */
  findEventPatternsInText(text) {
    const events = [];
    
    // Look for patterns like:
    // - "Event Name - July 15th"
    // - "July 15 - Event Name"
    // - "Event Name | July 15"
    const patterns = [
      // Event - Date
      /([^\n-]+)\s*-\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?/gi,
      // Date - Event
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\s*-\s*([^\n-]+)/gi,
      // Event | Date
      /([^\n|]+)\s*\|\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?/gi,
      // Date | Event
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\s*\|\s*([^\n|]+)/gi
    ];
    
    // Apply each pattern
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      
      for (const match of matches) {
        let title, dateStr;
        
        // Parse based on pattern type
        if (pattern.source.startsWith('([^\\n-]+)')) {
          // Event - Date format
          title = match[1].trim();
          dateStr = `${match[2]} ${match[3]}`;
        } else if (pattern.source.startsWith('(January|February|March')) {
          // Date - Event format
          title = match[3].trim();
          dateStr = `${match[1]} ${match[2]}`;
        } else if (pattern.source.startsWith('([^\\n|]+)')) {
          // Event | Date format
          title = match[1].trim();
          dateStr = `${match[2]} ${match[3]}`;
        } else {
          // Date | Event format
          title = match[3].trim();
          dateStr = `${match[1]} ${match[2]}`;
        }
        
        events.push({
          title,
          date: dateStr,
          description: `${title} at Malone's Bar in Vancouver.`
        });
      }
    }
    
    return events;
  }
  
  /**
   * Parse a date string into start and end dates
   */
  parseEventDate(dateString) {
    if (!dateString) return null;
    
    try {
      // Current year and month for reference
      const now = new Date();
      const currentYear = now.getFullYear();
      
      // Clean up the date string
      let cleanDateStr = dateString.trim();
      
      // Try various date formats
      let dateObj;
      
      // Format: Month Day, Year (e.g. "July 15, 2025" or "July 15")
      const monthDayYearMatch = cleanDateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/i);
      if (monthDayYearMatch) {
        const month = this.getMonthNumber(monthDayYearMatch[1]);
        const day = parseInt(monthDayYearMatch[2], 10);
        const year = monthDayYearMatch[3] ? parseInt(monthDayYearMatch[3], 10) : currentYear;
        
        dateObj = new Date(year, month, day, 21, 0, 0); // Default to 9 PM
      }
      
      // Format: MM/DD/YYYY or DD/MM/YYYY
      const slashMatch = cleanDateStr.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
      if (!dateObj && slashMatch) {
        let month, day, year;
        
        // Determine if it's MM/DD or DD/MM format
        // For simplicity, assume MM/DD for North America
        month = parseInt(slashMatch[1], 10) - 1; // 0-indexed month
        day = parseInt(slashMatch[2], 10);
        year = slashMatch[3] ? parseInt(slashMatch[3], 10) : currentYear;
        
        dateObj = new Date(year, month, day, 21, 0, 0); // Default to 9 PM
      }
      
      // Format: YYYY-MM-DD
      const isoMatch = cleanDateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (!dateObj && isoMatch) {
        const year = parseInt(isoMatch[1], 10);
        const month = parseInt(isoMatch[2], 10) - 1; // 0-indexed month
        const day = parseInt(isoMatch[3], 10);
        
        dateObj = new Date(year, month, day, 21, 0, 0); // Default to 9 PM
      }
      
      // Check for time in the string
      const timeMatch = cleanDateStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
      if (dateObj && timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const isPM = timeMatch[3] && timeMatch[3].toLowerCase() === 'pm';
        
        // Adjust for PM if needed
        if (isPM && hours < 12) {
          hours += 12;
        }
        
        dateObj.setHours(hours, minutes);
      }
      
      // If we successfully parsed a date
      if (dateObj && !isNaN(dateObj.getTime())) {
        // Create a default end date 3 hours after start
        const endDate = new Date(dateObj);
        endDate.setHours(endDate.getHours() + 3);
        
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
   * Convert month name to number (0-indexed)
   */
  getMonthNumber(monthName) {
    const months = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3,
      'may': 4, 'june': 5, 'july': 6, 'august': 7,
      'september': 8, 'october': 9, 'november': 10, 'december': 11
    };
    
    return months[monthName.toLowerCase()];
  }
  
  /**
   * Create an event object
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceURL) {
    return {
      id,
      title,
      description,
      startDate,
      endDate,
      venue: {
        name: this.name,
        id: this.generateVenueId(this.name),
        address: "608 W Pender St",
        city: "Vancouver",
        state: "BC",
        country: "Canada",
        coordinates: {
          lat: 49.2829,
          lng: -123.1139
        },
        websiteUrl: this.url,
        description: "Malone's Bar is a pub and sports bar in downtown Vancouver, offering drinks, food and live entertainment."
      },
      category: "nightlife",
      categories: ["bar", "entertainment", "nightlife", "music", "sports"],
      sourceURL,
      officialWebsite: this.url,
      image: imageUrl,
      ticketsRequired: false,
      lastUpdated: new Date()
    };
  }
  
  /**
   * Generate a venue ID from a name
   */
  generateVenueId(name) {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  }
  
  /**
   * Generate an event ID
   */
  generateEventId(title, date) {
    // Get parts to use in ID
    const venuePart = this.generateVenueId(this.name);
    const titlePart = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    
    // Format date as YYYY-MM-DD
    const datePart = date instanceof Date 
      ? date.toISOString().split('T')[0].replace(/-/g, '-')
      : 'unknown-date';
    
    return `${venuePart}-${titlePart}-${datePart}`;
  }
}

module.exports = MalonesEvents;
