/**
 * The Roxy Vancouver Scraper with Puppeteer Extra + Stealth
 * 
 * This scraper extracts events from The Roxy Vancouver website
 * using puppeteer-extra with stealth plugin for improved anti-bot detection resistance
 * Source: https://www.roxyvan.com/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const { executablePath } = require('puppeteer');
const { randomDelay, getRandomUserAgent, humanLikeScroll, randomMouseMovements, withRetry, emulateBrowserHistory } = require('../../utils/scraper-utils');
const fs = require('fs');
const path = require('path');

// Add plugins
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

class RoxyEvents {
  constructor() {
    this.name = 'The Roxy Events';
    this.url = 'https://www.roxyvan.com/events';
    this.baseUrl = 'https://www.roxyvan.com';
    
    // Venue information
    this.venue = {
      name: "The Roxy",
      id: "the-roxy-vancouver",
      address: "932 Granville St",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6Z 1L2",
      coordinates: {
        lat: 49.2798,
        lng: -123.1232
      },
      websiteUrl: "https://www.roxyvan.com/events",
      description: "The Roxy is a legendary nightclub and live music venue in Vancouver's entertainment district. Known for its energetic atmosphere, live bands, and rock n' roll history, The Roxy has been a staple of Vancouver's nightlife since 1989. The venue hosts various musical acts, theme nights, and is famous for its late-night party scene with a mix of classic rock, top 40, and more."
    };
  }

  /**
   * Generate a slug from event title
   */
  createSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  }

  /**
   * Create a unique event ID
   */
  createEventId(title, date) {
    const formattedDate = date ? date.toISOString().split('T')[0] : 'ongoing';
    const slug = this.createSlug(title);
    return `roxy-${slug}-${formattedDate}`;
  }

  /**
   * Parse date from various formats used on venue sites
   */
  parseDate(dateText) {
    if (!dateText) return null;
    
    try {
      // Clean up the text
      const text = dateText.trim().replace(/\s+/g, ' ');
      
      // Common date patterns for The Roxy
      
      // Month Day, Year (e.g. "July 15, 2023")
      const pattern1 = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?/i;
      
      // Day of week, Month Day (e.g. "Friday, July 15")
      const pattern2 = /(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*,? (?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?/i;
      
      // MM/DD/YYYY format
      const pattern3 = /\d{1,2}\/\d{1,2}(?:\/\d{4})?/;
      
      // Try to match patterns
      const match1 = text.match(pattern1);
      const match2 = text.match(pattern2);
      const match3 = text.match(pattern3);
      
      let dateStr = '';
      if (match1) dateStr = match1[0];
      else if (match2) dateStr = match2[0];
      else if (match3) dateStr = match3[0];
      
      if (!dateStr) {
        // Check for day of week only
        const dayPattern = /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
        const dayMatch = text.match(dayPattern);
        
        if (dayMatch) {
          // Map day of week to next occurrence
          const days = {
            'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 
            'thursday': 4, 'friday': 5, 'saturday': 6
          };
          
          const dayName = dayMatch[0].toLowerCase();
          const targetDay = days[dayName];
          
          if (targetDay !== undefined) {
            const today = new Date();
            const currentDay = today.getDay();
            
            let daysToAdd = targetDay - currentDay;
            if (daysToAdd <= 0) daysToAdd += 7;
            
            const nextOccurrence = new Date();
            nextOccurrence.setDate(nextOccurrence.getDate() + daysToAdd);
            
            // Set time to evening for nightclub events
            nextOccurrence.setHours(21, 0, 0); // 9:00 PM
            
            return nextOccurrence;
          }
        }
        
        return null;
      }
      
      // Extract time if present
      let timeStr = '9:00 PM'; // Default time
      
      const timePattern = /\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)/i;
      const timeMatch = text.match(timePattern);
      if (timeMatch) {
        timeStr = timeMatch[0];
      }
      
      // Parse date
      let date;
      
      // Try standard date parsing first
      date = new Date(`${dateStr} ${timeStr}`);
      
      // If that fails, try manual parsing
      if (isNaN(date.getTime())) {
        const months = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };
        
        let month, day, year = new Date().getFullYear();
        
        // Try to extract month and day from dateStr
        for (const [monthName, monthIndex] of Object.entries(months)) {
          if (dateStr.toLowerCase().includes(monthName)) {
            month = monthIndex;
            
            // Find the day
            const dayMatch = dateStr.match(/\d{1,2}(?:st|nd|rd|th)?/);
            if (dayMatch) {
              day = parseInt(dayMatch[0].replace(/(?:st|nd|rd|th)/, ''), 10);
            }
            
            // Find the year if present
            const yearMatch = dateStr.match(/\d{4}/);
            if (yearMatch) {
              year = parseInt(yearMatch[0], 10);
            }
            
            break;
          }
        }
        
        // If month/day pattern didn't work, try MM/DD pattern
        if (month === undefined && match3) {
          const dateParts = dateStr.split('/');
          month = parseInt(dateParts[0], 10) - 1;
          day = parseInt(dateParts[1], 10);
          
          if (dateParts.length > 2) {
            year = parseInt(dateParts[2], 10);
          }
        }
        
        if (month !== undefined && day) {
          // Parse time
          let hour = 21; // Default 9 PM
          let minute = 0;
          
          if (timeMatch) {
            const timeParts = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)/i);
            if (timeParts) {
              let parsedHour = parseInt(timeParts[1], 10);
              const parsedMinute = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
              const period = timeParts[3].toUpperCase();
              
              // Convert to 24-hour format
              if (period === 'PM' && parsedHour < 12) {
                parsedHour += 12;
              } else if (period === 'AM' && parsedHour === 12) {
                parsedHour = 0;
              }
              
              hour = parsedHour;
              minute = parsedMinute;
            }
          }
          
          date = new Date(year, month, day, hour, minute);
        }
      }
      
      return date;
    } catch (error) {
      console.warn(`Error parsing date: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract date and time information
   */
  extractDateInfo(dateText) {
    if (!dateText) return { startDate: null, endDate: null };
    
    try {
      // For our manually created dates with time info (Jul 19, DOORS @ 8PM)
      // We need to handle them specially
      if (dateText.match(/[A-Za-z]{3}\s+\d{1,2},\s+(?:DOORS\s*(?:@|:)\s*|EVENT\s*(?::|DOORS:)\s*)\d{1,2}/i)) {
        const parts = dateText.split(',');
        if (parts.length >= 2) {
          const datePart = parts[0].trim(); // e.g., "Jul 19"
          let timePart = parts[1].trim();  // e.g., "DOORS @ 8PM"
          
          // Extract just the time
          const timeMatch = timePart.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i);
          if (timeMatch) {
            timePart = timeMatch[1].trim();
          }
          
          // Create date string and parse it
          const dateString = `${datePart}, 2025 ${timePart}`;
          const startDate = new Date(dateString);
          
          if (!isNaN(startDate.getTime())) {
            // For The Roxy events, typically run from evening until late night
            const endDate = new Date(startDate);
            // Most events at The Roxy end around 2AM the next day
            endDate.setHours(2, 0, 0, 0);
            endDate.setDate(endDate.getDate() + 1);
            
            return { startDate, endDate };
          }
        }
      }
      
      // Fall back to regular date parsing
      const startDate = this.parseDate(dateText);
      
      if (!startDate) {
        return { startDate: null, endDate: null };
      }
      
      // For The Roxy events, typically run from evening until late night
      const endDate = new Date(startDate);
      // Most events at The Roxy end around 2AM the next day
      endDate.setHours(2, 0, 0, 0);
      endDate.setDate(endDate.getDate() + 1);
      
      return { startDate, endDate };
    } catch (error) {
      console.warn(`Error extracting date info: ${error.message}`);
      return { startDate: null, endDate: null };
    }
  }

  /**
   * Take a screenshot for debugging
   */
  async takeScreenshot(page, filename = 'roxy-debug.png') {
    try {
      const screenshotPath = path.join(process.cwd(), filename);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`✅ Saved debug screenshot to ${filename}`);
    } catch (error) {
      console.warn(`Failed to save screenshot: ${error.message}`);
    }
  }

  /**
   * Save HTML content for debugging
   */
  async saveHtml(page, filename = 'roxy-debug.html') {
    try {
      const content = await page.content();
      const htmlPath = path.join(process.cwd(), filename);
      fs.writeFileSync(htmlPath, content);
      console.log(`✅ Saved debug HTML to ${filename}`);
    } catch (error) {
      console.warn(`Failed to save HTML: ${error.message}`);
    }
  }

  /**
   * Extract price information from text
   */
  extractPrice(text) {
    if (!text) return null;
    
    const priceRegex = /\$\d+(?:\.\d{2})?|\$\d+\+|\$\d+\s*-\s*\$\d+/g;
    const matches = text.match(priceRegex);
    
    if (matches && matches.length > 0) {
      return matches[0];
    }
    
    return null;
  }

  /**
   * Generate recurring events based on title patterns
   */
  generateRecurringEvents(events, eventData, title) {
    // Weekend party nights
    if (title.includes('friday')) {
      this.addFridayNightEvent(events, eventData);
    }
    
    if (title.includes('saturday')) {
      this.addSaturdayNightEvent(events, eventData);
    }
    
    // Could add more special nights if needed
  }

  /**
   * Add Friday night event
   */
  addFridayNightEvent(events, eventData = {}) {
    // Get next Friday
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 5 is Friday
    const daysUntilFriday = (5 + 7 - dayOfWeek) % 7;
    
    const fridayDate = new Date(today);
    fridayDate.setDate(today.getDate() + daysUntilFriday);
    fridayDate.setHours(21, 0, 0); // 9:00 PM
    
    const fridayEndDate = new Date(fridayDate);
    fridayEndDate.setDate(fridayEndDate.getDate() + 1);
    fridayEndDate.setHours(2, 0, 0); // 2:00 AM next day
    
    const fridayEvent = {
      id: this.createEventId('Friday Night Party', fridayDate),
      title: eventData.title || 'Friday Night Party at The Roxy',
      description: eventData.description || 'Start your weekend right with The Roxy\'s legendary Friday night party! Dance to a mix of rock, pop hits, and more with our house band and resident DJs. The Roxy is Vancouver\'s premier destination for a high-energy night out.\n\nThe Roxy is a legendary nightclub and live music venue in Vancouver\'s entertainment district. Located at 932 Granville St, The Roxy has been a staple of Vancouver\'s nightlife since 1989, known for its energetic atmosphere, live bands, and rock n\' roll history.',
      startDate: fridayDate,
      endDate: fridayEndDate,
      venue: this.venue,
      category: 'nightlife',
      categories: ['nightclub', 'live music', 'entertainment', 'dance', 'party', 'weekend', 'friday night'],
      sourceURL: this.url,
      officialWebsite: eventData.link || this.url,
      image: eventData.image || null,
      ticketsRequired: true,
      lastUpdated: new Date()
    };
    
    events.push(fridayEvent);
    console.log('✅ Added Friday Night event at The Roxy');
  }

  /**
   * Add Saturday night event
   */
  addSaturdayNightEvent(events, eventData = {}) {
    // Get next Saturday
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday
    const daysUntilSaturday = (6 + 7 - dayOfWeek) % 7;
    
    const saturdayDate = new Date(today);
    saturdayDate.setDate(today.getDate() + daysUntilSaturday);
    saturdayDate.setHours(21, 0, 0); // 9:00 PM
    
    const saturdayEndDate = new Date(saturdayDate);
    saturdayEndDate.setDate(saturdayEndDate.getDate() + 1);
    saturdayEndDate.setHours(2, 0, 0); // 2:00 AM next day
    
    const saturdayEvent = {
      id: this.createEventId('Saturday Night Party', saturdayDate),
      title: eventData.title || 'Saturday Night Party at The Roxy',
      description: eventData.description || 'Experience Vancouver\'s best Saturday night at The Roxy! Our legendary house band plays the best rock and pop hits, while our DJs keep the dance floor packed until late. The perfect way to cap off your weekend.\n\nThe Roxy is a legendary nightclub and live music venue in Vancouver\'s entertainment district. Located at 932 Granville St, The Roxy has been a staple of Vancouver\'s nightlife since 1989, known for its energetic atmosphere, live bands, and rock n\' roll history.',
      startDate: saturdayDate,
      endDate: saturdayEndDate,
      venue: this.venue,
      category: 'nightlife',
      categories: ['nightclub', 'live music', 'entertainment', 'dance', 'party', 'weekend', 'saturday night'],
      sourceURL: this.url,
      officialWebsite: eventData.link || this.url,
      image: eventData.image || null,
      ticketsRequired: true,
      lastUpdated: new Date()
    };
    
    events.push(saturdayEvent);
    console.log('✅ Added Saturday Night event at The Roxy');
  }

  /**
   * Add generic events for The Roxy
   */
  addGenericRoxyEvents(events) {
    // Add Friday night event
    this.addFridayNightEvent(events);
    
    // Add Saturday night event
    this.addSaturdayNightEvent(events);
    
    // Add a generic event for The Roxy
    const genericEvent = {
      id: this.createEventId('Live Music and Entertainment', null),
      title: 'Live Music and Entertainment at The Roxy',
      description: 'The Roxy is Vancouver\'s premier live music venue and nightclub, featuring nightly entertainment from our house band and resident DJs. Check our official website for the most current event schedule and special performances.\n\nThe Roxy is a legendary nightclub and live music venue in Vancouver\'s entertainment district. Located at 932 Granville St, The Roxy has been a staple of Vancouver\'s nightlife since 1989, known for its energetic atmosphere, live bands, and rock n\' roll history.',
      startDate: null,
      endDate: null,
      venue: this.venue,
      category: 'nightlife',
      categories: ['nightclub', 'live music', 'entertainment', 'dance', 'party'],
      sourceURL: this.url,
      officialWebsite: this.url,
      image: null,
      ticketsRequired: true,
      lastUpdated: new Date()
    };
    
    events.push(genericEvent);
    console.log('✅ Added generic event for The Roxy');
  }
  
  /**
   * Main scraper function for The Roxy Vancouver
   */
  async scrape() {
    console.log('🔍 Starting The Roxy Events scraper...');
    const events = [];
    let browser;
    
    try {
      // Generate a random user agent for enhanced stealth
      const userAgent = getRandomUserAgent();
      
      // Launch browser with enhanced stealth mode
      browser = await puppeteer.launch({
        headless: "new",
        executablePath: executablePath(),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-infobars',
          '--window-position=0,0',
          '--ignore-certifcate-errors',
          '--ignore-certifcate-errors-spki-list',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials',
          '--disable-web-security',
          `--user-agent=${userAgent}`,
        ],
      });
      
      const page = await browser.newPage();
      
      // Set realistic viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Set extra HTTP headers to appear more like a real browser
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });
      
      // Set additional browser characteristics to appear more human
      await emulateBrowserHistory(page);
      
      // Set cookies and local storage to appear as a returning visitor
      await page.evaluateOnNewDocument(() => {
        // Simulate localStorage with some items
        Object.defineProperty(window, 'localStorage', {
          value: {
            getItem: (key) => key === 'visited' ? 'true' : null,
            setItem: () => {},
            removeItem: () => {},
            clear: () => {},
            length: 3,
            key: () => null
          }
        });
      });
      
      console.log(`Navigating to ${this.url}`);
      // Use retry mechanism for more reliable navigation
      await withRetry(async () => {
        await page.goto(this.url, { 
          waitUntil: ['domcontentloaded', 'networkidle2'],
          timeout: 60000 // Increase timeout for reliability
        });
        
        // Add a short delay after page load to let JavaScript execute
        await randomDelay(1000, 3000);
      });
      
      // Take a screenshot for debugging
      await this.takeScreenshot(page);
      
      // Perform human-like scrolling and mouse movements
      await humanLikeScroll(page, 3, 500);
      await randomMouseMovements(page);
      
      // Allow dynamic content to load with random delay
      await randomDelay(2000, 4000);
      
      // Save HTML for analysis
      await this.saveHtml(page);
      
      console.log('Extracting events from the page...');
      
      // Try multiple selectors to find event containers
      const selectors = [
        // Squarespace selectors
        '.sqs-block-image-figure',
        'figure.image-block-outer-wrapper',
        '.eventlist-event',
        '.event-item',
        '.event-card',
        '.event-list-item',
        '.summary-item',
        // General event selectors
        '.event',
        '[class*="event-"]',
        // Content containing divs that might have event info
        '.sqs-block-content',
        '.image-subtitle-wrapper',
        // Generic content blocks
        '.content-block',
        // The Roxy may use WordPress
        '.wp-block-group',
        '.wp-block-columns',
        // Generic grid items
        '.grid-item',
        '.card',
        '.event-card'
      ];
      
      let foundEvents = [];
      let foundSelector = null;
      
      for (const selector of selectors) {
        try {
          const hasEvents = await page.$(selector);
          if (hasEvents) {
            console.log(`Found events with selector: ${selector}`);
            foundSelector = selector;
            break;
          }
        } catch (error) {
          console.warn(`Error checking selector ${selector}: ${error.message}`);
        }
      }
      
      // If we found a selector with events, extract them
      if (foundSelector) {
        console.log(`Using selector ${foundSelector} to extract events`);
        foundEvents = await page.$$eval(foundSelector, elements => {
          return elements.map(el => {
            // Try different ways to extract title
            const title = el.querySelector('h2')?.innerText || 
                         el.querySelector('h3')?.innerText ||
                         el.querySelector('.event-title')?.innerText ||
                         el.querySelector('.title')?.innerText ||
                         el.querySelector('a')?.innerText || 
                         'Unknown Event';
            
            // Try different ways to extract date
            const dateText = el.querySelector('.event-date')?.innerText || 
                           el.querySelector('.date')?.innerText ||
                           el.querySelector('.event-time')?.innerText ||
                           el.querySelector('time')?.innerText ||
                           el.querySelector('.calendar')?.innerText ||
                           '';
            
            // Try different ways to extract link
            const link = el.querySelector('a')?.href || '';
            
            // Try different ways to extract image
            const image = el.querySelector('img')?.src ||
                        el.style.backgroundImage?.replace(/url\(['"](\S+)['"]\)/, '$1') ||
                        '';
            
            // Try different ways to extract description
            const description = el.querySelector('.event-description')?.innerText ||
                             el.querySelector('.description')?.innerText ||
                             el.querySelector('.details')?.innerText ||
                             el.querySelector('p')?.innerText ||
                             '';
            
            // Try to extract price
            const priceText = el.querySelector('.price')?.innerText ||
                           el.querySelector('.ticket-price')?.innerText ||
                           el.querySelector('.event-price')?.innerText ||
                           '';
            
            return {
              title: title.trim(),
              dateText: dateText.trim(),
              link,
              image,
              description: description.trim(),
              priceText: priceText.trim()
            };
          }).filter(event => event.title !== 'Unknown Event');
        });
      }
      
      // If no events found with generic selectors, try Roxy-specific approach
      if (foundEvents.length === 0) {
        console.log('No events found with standard selectors, trying Roxy-specific approach...');
        
        // First, try to find events directly in the content blocks
        try {
          const contentBlocks = await page.$$('.elementor-widget-container, .elementor-text-editor');
          console.log(`Found ${contentBlocks.length} content blocks to inspect`);
          
          if (contentBlocks.length > 0) {
            for (let i = 0; i < contentBlocks.length; i++) {
              const block = contentBlocks[i];
              const hasEventContent = await block.evaluate(el => {
                const text = el.textContent.toLowerCase();
                return text.includes('event') || 
                       text.includes('dj') || 
                       text.includes('friday') || 
                       text.includes('saturday') || 
                       text.includes('live music') ||
                       text.includes('tickets');
              });
              
              if (hasEventContent) {
                console.log(`Found potential event content in block ${i}`);
                // Try to extract event information from this block
                const blockText = await block.evaluate(el => el.textContent);
                const blockHTML = await block.evaluate(el => el.innerHTML);
                
                // Look for date patterns in the text
                const dateRegex = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/gi;
                const dateMatches = blockText.match(dateRegex) || [];
                
                // Look for time patterns
                const timeRegex = /\d{1,2}(?::\d{2})?\s*(?:am|pm)/gi;
                const timeMatches = blockText.match(timeRegex) || [];
                
                // If we have dates or times, this might be an event
                if (dateMatches.length > 0 || timeMatches.length > 0) {
                  console.log(`Found potential event in block ${i} with ${dateMatches.length} dates and ${timeMatches.length} times`);
                  
                  // Extract potential event title
                  let title = '';
                  const headingMatch = blockHTML.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
                  if (headingMatch && headingMatch[1]) {
                    title = headingMatch[1].replace(/<[^>]*>/g, '').trim();
                  } else {
                    // Try to find a strong or bold text that might be a title
                    const boldMatch = blockHTML.match(/<(?:strong|b)[^>]*>(.*?)<\/(?:strong|b)>/i);
                    if (boldMatch && boldMatch[1]) {
                      title = boldMatch[1].replace(/<[^>]*>/g, '').trim();
                    } else {
                      // Just use the first line as title
                      title = blockText.split('\n')[0].trim();
                    }
                  }
                  
                  // Build a potential event
                  const eventDate = dateMatches.length > 0 ? dateMatches[0] : '';
                  const eventTime = timeMatches.length > 0 ? timeMatches[0] : '';
                  const dateString = `${eventDate} ${eventTime}`.trim();
                  
                  // Use our date parsing method
                  const parsedDates = this.extractDateInfo(dateString);
                  
                  // Create an event object
                  if (title && (parsedDates.startDate || eventDate)) {
                    foundEvents.push({
                      title: title,
                      startDate: parsedDates.startDate,
                      description: blockText.replace(title, '').trim(),
                      image: '',
                      link: this.url
                    });
                    console.log(`Added event from content block: ${title} on ${eventDate} ${eventTime}`);
                  }
                }
              }
            }
          }
        } catch (contentError) {
          console.error(`Error processing content blocks: ${contentError.message}`);
        }
        
        // The Roxy website may have events directly in the main content
        const mainContentSelector = '#main-content, .main-content, .site-content, #content';
        
        // Try to find events in the main content
        foundEvents = await page.evaluate((mainContentSelector) => {
          // Helper function to extract text from element and its children
          const getTextContent = (element) => {
            if (!element) return '';
            
            // Extract text from the element and its children
            let text = element.innerText || '';
            
            // Find the closest heading (h1-h3) before this element
            const findHeading = (elem) => {
              let sibling = elem.previousElementSibling;
              while (sibling) {
                if (sibling.tagName === 'H1' || sibling.tagName === 'H2' || sibling.tagName === 'H3') {
                  return sibling.innerText;
                }
                sibling = sibling.previousElementSibling;
              }
              return null;
            };
            
            const heading = findHeading(element);
            if (heading) {
              text = `${heading}\n${text}`;
            }
            
            return text;
          };
          
          // Find blocks that might contain event info
          const mainContent = document.querySelector(mainContentSelector);
          if (!mainContent) return [];
          
          const potentialEventBlocks = [
            ...mainContent.querySelectorAll('div > p'),
            ...mainContent.querySelectorAll('.wp-block-group'),
            ...mainContent.querySelectorAll('article'),
            ...mainContent.querySelectorAll('section')
          ];
          
          // Process blocks to find those with dates
          const eventInfos = [];
          
          for (const block of potentialEventBlocks) {
            const text = getTextContent(block);
            if (!text) continue;
            
            // Look for date patterns in the text
            const dateRegex = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?|(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:,)? \w+ \d{1,2}|\d{1,2}\/\d{1,2}(?:\/\d{4})?/i;
            const dateMatch = text.match(dateRegex);
            
            if (dateMatch) {
              // This block might be an event
              const img = block.querySelector('img');
              const link = block.querySelector('a');
              
              // Extract title - look for the first line or nearby heading
              let title = text.split('\n')[0].trim();
              
              // If title has the date, try to find a better title
              if (dateMatch[0] === title) {
                const lines = text.split('\n').filter(line => line.trim() && !line.includes(dateMatch[0]));
                if (lines.length > 0) {
                  title = lines[0].trim();
                }
              }
              
              eventInfos.push({
                title: title,
                dateText: dateMatch[0],
                description: text,
                image: img ? img.src : '',
                link: link ? link.href : '',
                priceText: text.match(/\$\d+/g) ? text : ''
              });
            }
          }
          
          return eventInfos;
        }, mainContentSelector);
      }
      
      // If still no events found, look for links to an events page
      if (foundEvents.length === 0) {
        console.log('Searching for links to an events page...');
        
        const eventLinks = await page.$$eval('a[href*="events"], a[href*="shows"], a[href*="calendar"], a[href*="schedule"]', links => {
          return links.map(link => {
            return { 
              text: link.innerText.trim(),
              href: link.href
            };
          }).filter(link => 
            link.text && 
            (link.text.toLowerCase().includes('event') ||
            link.text.toLowerCase().includes('show') ||
            link.text.toLowerCase().includes('calendar') ||
            link.text.toLowerCase().includes('schedule'))
          );
        });
        
        if (eventLinks.length > 0) {
          console.log(`Found ${eventLinks.length} potential event page links`);
          
          // Visit the first relevant events page
          const eventsPageLink = eventLinks[0].href;
          console.log(`Navigating to events page: ${eventsPageLink}`);
          
          try {
            // Use retry mechanism for more reliable navigation
            await withRetry(async () => {
              await page.goto(eventsPageLink, { 
                waitUntil: ['domcontentloaded', 'networkidle2'],
                timeout: 60000 
              });
              
              // Random delay after page load to simulate human behavior
              await randomDelay(1500, 3500);
              
              // Perform some random mouse movements and scrolling
              await randomMouseMovements(page);
              await humanLikeScroll(page, 4, 600);
            });
            
            // Take a screenshot of the events page
            await this.takeScreenshot(page, 'roxy-events-page.png');
            
            // Allow dynamic content to load
            await new Promise(r => setTimeout(r, 3000));
            
            // Save HTML for analysis
            await this.saveHtml(page, 'roxy-events-page.html');
            
            // Try to find events on this page
            for (const selector of selectors) {
              try {
                const hasEvents = await page.$(selector);
                if (hasEvents) {
                  console.log(`Found events on events page with selector: ${selector}`);
                  // Try to extract events using the found selector
                  foundEvents = await page.$$eval(selector, elements => {
                    return elements.map(el => {
                      // For Squarespace sites, event details are often in image-subtitle elements
                      const subtitleWrapper = el.querySelector('.image-subtitle-wrapper');
                      const subtitleText = subtitleWrapper ? subtitleWrapper.textContent.trim() : '';
                      
                      // Extract title - first line of subtitle or fallback to standard heading elements
                      let title = 'Unknown Event';
                      if (subtitleText) {
                        const subtitleLines = subtitleText.split('\n').map(line => line.trim()).filter(line => line);
                        if (subtitleLines.length > 0) {
                          title = subtitleLines[0];
                        }
                      } else {
                        title = el.querySelector('h2')?.innerText || 
                                el.querySelector('h3')?.innerText || 
                                el.querySelector('h1')?.innerText || 
                                el.querySelector('.title')?.innerText ||
                                el.querySelector('.event-title')?.innerText ||
                                el.querySelector('.summary-title')?.innerText || 'Unknown Event';
                      }
                      
                      // Extract date - look for specific patterns in subtitle text
                      let dateText = '';
                      if (subtitleText) {
                        // Look for date/time patterns in subtitle
                        const dateMatch = subtitleText.match(/Event.*:\s*(\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})?)/i) || 
                                          subtitleText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-zA-Z]*\s+\d{1,2}/i) ||
                                          subtitleText.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/i);
                        
                        if (dateMatch) {
                          dateText = dateMatch[0];
                        } else if (subtitleText.includes('Doors:')) {
                          // Extract time information if date not present
                          const doorMatch = subtitleText.match(/Doors:\s*(\d{1,2}:\d{2}|\d{1,2}(?:am|pm)|\d{1,2}\s*(?:am|pm))/i);
                          if (doorMatch) {
                            // Set a recurring date pattern for weekend events
                            const today = new Date();
                            const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
                            
                            // If the scraper runs on a weekend, use today, otherwise find the next Friday
                            let nextEventDate;
                            if (dayOfWeek === 5 || dayOfWeek === 6) { // Friday or Saturday
                              nextEventDate = today;
                            } else {
                              // Calculate days until next Friday
                              const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
                              nextEventDate = new Date(today);
                              nextEventDate.setDate(today.getDate() + daysUntilFriday);
                            }
                            
                            const month = nextEventDate.toLocaleString('en-US', { month: 'short' });
                            const day = nextEventDate.getDate();
                            dateText = `${month} ${day}, ${doorMatch[0]}`;
                          }
                        }
                      } else {
                        dateText = el.querySelector('.event-date')?.innerText || 
                                  el.querySelector('.date')?.innerText ||
                                  el.querySelector('time')?.innerText ||
                                  el.querySelector('.calendar-date')?.innerText || '';
                      }
                      
                      // Extract link - typically in an anchor wrapping the figure or image
                      const link = el.closest('a')?.href || el.querySelector('a')?.href || '';
                      
                      // Extract image
                      const image = el.querySelector('img')?.src || 
                                  el.querySelector('[data-src]')?.getAttribute('data-src') || '';
                      
                      // Extract description - could be in subtitle or standard description elements
                      let description = '';
                      if (subtitleText) {
                        // Remove the title line and any date/time lines to get description
                        const descLines = subtitleText.split('\n')
                          .map(line => line.trim())
                          .filter(line => line && 
                            !line.includes(title) && 
                            !line.match(/Event.*:\s*\d{1,2}:\d{2}/i) &&
                            !line.match(/Doors:/i));
                        
                        if (descLines.length > 0) {
                          description = descLines.join('\n');
                        }
                      }
                      
                      if (!description) {
                        description = el.querySelector('.description')?.innerText ||
                                      el.querySelector('.event-description')?.innerText ||
                                      el.querySelector('.summary')?.innerText ||
                                      el.querySelector('p')?.innerText || '';
                      }
                      
                      // Extract price information
                      let priceText = el.querySelector('.price')?.innerText ||
                                   el.querySelector('.ticket-price')?.innerText || '';
                      
                      // Handle regex price match if no explicit price elements found
                      if (!priceText && subtitleText) {
                        const priceMatch = subtitleText.match(/\$\d+(\.\d+)?/);
                        if (priceMatch) {
                          priceText = priceMatch[0] || '';
                        }
                      }
                      
                      return { 
                        title: title.trim(), 
                        dateText: dateText.trim(), 
                        link, 
                        image, 
                        description: description.trim(),
                        priceText: priceText.trim()
                      };
                    }).filter(event => event.title !== 'Unknown Event');
                  });
                  
                  if (foundEvents.length > 0) break;
                }
              } catch (error) {
                console.warn(`Error with events page selector ${selector}: ${error.message}`);
              }
            }
          } catch (error) {
            console.warn(`Error navigating to events page: ${error.message}`);
          }
        }
      }
      
      // Process extracted events
      console.log(`Found ${foundEvents.length} potential events`);
      
      // Convert the raw events to our standardized format
      for (const rawEvent of foundEvents) {
        try {
          // Use let instead of const to allow modification of these variables
          let { title, dateText, link, image, description, priceText } = rawEvent;
          
          // Define titleLower for case-insensitive comparisons
          const titleLower = (title || '').toLowerCase();
          
          // For Roxy events, if there's no explicit date but there's a title,
          // create a default Friday or Saturday night event
          let effectiveDateText = dateText;
          
          if (!effectiveDateText) {
            // Extract event time info from title or description
            const fullText = `${title} ${description}`.toUpperCase();
            
            if (fullText.includes('DOORS @') || fullText.includes('DOORS:')) {
              // Extract time from DOORS pattern
              const doorMatch = fullText.match(/DOORS\s*(?:@|:)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i);
              if (doorMatch) {
                // Create a date for this Friday
                const today = new Date();
                const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
                
                // If today is after Friday, go to next week's Friday
                const daysToFriday = (5 - dayOfWeek + 7) % 7 || 7; // If today is Friday, go to next Friday
                const friday = new Date(today);
                friday.setDate(today.getDate() + daysToFriday);
                
                const month = friday.toLocaleString('en-US', { month: 'short' });
                const day = friday.getDate();
                
                // Create date text with the extracted time
                effectiveDateText = `${month} ${day}, ${doorMatch[1]}`;
                console.log(`Created date for event: ${effectiveDateText}`);
              }
            } else if (fullText.includes('EVENT:') || fullText.includes('EVENT DOORS:')) {
              // Extract from Event: pattern
              const eventMatch = fullText.match(/EVENT\s*(?::|DOORS:)\s*(\d{1,2}(?::\d{2})?(?:\s*-\s*\d{1,2}(?::\d{2})?)?)/i);
              if (eventMatch) {
                // Create a date for this Friday
                const today = new Date();
                const dayOfWeek = today.getDay();
                
                // If today is after Friday, go to next week's Friday
                const daysToFriday = (5 - dayOfWeek + 7) % 7 || 7;
                const friday = new Date(today);
                friday.setDate(today.getDate() + daysToFriday);
                
                const month = friday.toLocaleString('en-US', { month: 'short' });
                const day = friday.getDate();
                
                // Create date text with the extracted time
                effectiveDateText = `${month} ${day}, ${eventMatch[1]}`;
                console.log(`Created date for event: ${effectiveDateText}`);
              }
            }
            
            // If we still can't extract a date
            if (!effectiveDateText) {
              console.log(`Skipping event with no date: ${title}`);
              continue;
            }
          }
          
          // Use the effective date text for date extraction
          const dateInfo = this.extractDateInfo(effectiveDateText);
          let { startDate, endDate } = dateInfo;
          
          // If we couldn't parse the date, try to extract it from description
          if (!startDate && description) {
            const dateMatch = description.match(/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?|(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:,)? \w+ \d{1,2}|\d{1,2}\/\d{1,2}(?:\/\d{4})?/i);
            
            if (dateMatch) {
              const extractedDate = dateMatch[0];
              const parsedDates = this.extractDateInfo(extractedDate);
              startDate = parsedDates.startDate;
              endDate = parsedDates.endDate;
            }
          }
          
          // Skip events with no date unless it's a recurring event
          if (!startDate && !titleLower.includes('friday') && !titleLower.includes('saturday')) {
            console.warn(`Skipping event with no date: ${title}`);
            continue;
          }
          
          // Extract price from text if available
          const price = this.extractPrice(priceText || description || '');
          
          // Extract performers
          let performers = [];
          if (description) {
            // Look for patterns like "featuring" or "with" followed by names
            const performerMatch = description.match(/(?:featuring|with|presents)\s+([^.!?]*)(?:[.!?]|$)/i);
            if (performerMatch && performerMatch[1]) {
              performers = performerMatch[1].split(/,|\s+and\s+|&/).map(p => p.trim()).filter(p => p.length > 0);
            }
          }
          
          // Add price to description if available
          let finalDescription = description || '';
          if (price && !finalDescription.includes(price)) {
            finalDescription = `${finalDescription}\n\nTicket Price: ${price}`;
          }
          
          // Add venue info to description if not present
          if (!finalDescription.includes('Roxy')) {
            finalDescription = `${finalDescription}\n\nThe Roxy is a legendary nightclub and live music venue in Vancouver's entertainment district. Located at 932 Granville St, The Roxy has been a staple of Vancouver's nightlife since 1989, known for its energetic atmosphere, live bands, and rock n' roll history.`;
          }
          
          // Determine event category based on title and description
          let category = 'nightlife';
          let categories = ['nightclub', 'entertainment'];
          
          if (description && (description.toLowerCase().includes('live music') || description.toLowerCase().includes('band'))) {
            category = 'live music';
            categories.push('live music', 'concert');
          }
          
          if (titleLower.includes('dj') || (description && description.toLowerCase().includes('dj'))) {
            categories.push('dj', 'dance');
          }
          
          if (performers.length > 0) {
            categories.push('performance');
          }
          
          // Create the event object
          const event = {
            id: this.createEventId(title, startDate),
            title,
            description: finalDescription.trim(),
            startDate,
            endDate,
            venue: this.venue,
            performers: performers.length > 0 ? performers : undefined,
            category,
            categories,
            sourceURL: this.url,
            officialWebsite: link || this.url,
            image,
            price,
            ticketsRequired: true,
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`\u2705 Added event: ${title}`);
          
        } catch (eventError) {
          console.warn(`Error processing event: ${eventError.message}`);
        }
      }
      
      // Log if no events were found
      if (events.length === 0) {
        console.log('No live events found at The Roxy. Consider checking the website structure or additional selectors.');
      }
      
      console.log(`\ud83d\udd0d Completed The Roxy Events scraper with ${events.length} events`);
      return events;
      
    } catch (error) {
      console.error(`\u274c Error in The Roxy scraper: ${error.message}`);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = new RoxyEvents();
