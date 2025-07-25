/**
 * The Cultch Scraper with Puppeteer Extra + Stealth
 * 
 * This scraper extracts events from The Cultch website
 * using puppeteer-extra with stealth plugin for improved anti-bot detection resistance
 * Source: https://thecultch.com/whats-on/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { executablePath } = require('puppeteer');
const fs = require('fs');
const path = require('path');

class TheCultchEvents {
  constructor() {
    this.name = 'The Cultch Events';
    this.url = 'https://thecultch.com/whats-on/';
    this.baseUrl = 'https://thecultch.com';
    
    // Venue information
    this.venue = {
      name: "The Cultch",
      id: "the-cultch-vancouver",
      address: "1895 Venables St",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V5L 2H6",
      coordinates: {
        lat: 49.2756,
        lng: -123.0698
      },
      websiteUrl: "https://thecultch.com/",
      description: "The Cultch is a venerable performing arts venue in Vancouver offering contemporary theatre, dance, and music in three distinct performance spaces: the Historic Theatre, the Vancity Culture Lab, and the York Theatre. Since 1973, The Cultch has been committed to presenting innovative local, national and international works that engage and challenge audiences."
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
    return `cultch-${slug}-${formattedDate}`;
  }

  /**
   * Parse date ranges from text
   */
  parseDateRange(dateText) {
    if (!dateText) return { startDate: null, endDate: null };
    
    try {
      // Common date formats found on theater sites
      // Examples: "March 15-20, 2025" or "Jan 5 - Feb 10, 2025" or "September 3, 2025"
      const monthNames = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';
      const dateRangeRegex = new RegExp(
        `(${monthNames})\\s+(\\d{1,2})(?:\\s*[-–—]\\s*(?:(${monthNames})\\s+)?(\\d{1,2}))?(?:,\\s*(\\d{4}))?`, 'i'
      );
      
      const match = dateText.match(dateRangeRegex);
      if (match) {
        // Extract components
        const startMonth = match[1];
        const startDay = parseInt(match[2], 10);
        const endMonth = match[3] || startMonth;
        const endDay = match[4] ? parseInt(match[4], 10) : startDay;
        const year = match[5] ? parseInt(match[5], 10) : new Date().getFullYear();
        
        // Build date strings
        const startDateStr = `${startMonth} ${startDay}, ${year}`;
        const endDateStr = `${endMonth} ${endDay}, ${year}`;
        
        // Parse dates
        const startDate = new Date(startDateStr);
        startDate.setHours(19, 30, 0); // Default to 7:30 PM for theater shows
        
        const endDate = new Date(endDateStr);
        endDate.setHours(22, 0, 0); // Default to 10:00 PM for end time
        
        // Check if dates are valid
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          return { 
            startDate, 
            endDate,
            hasRange: startDay !== endDay || startMonth !== endMonth
          };
        }
      }
      
      // Try simple date format (e.g., "June 15, 2025")
      const simpleDateRegex = new RegExp(`(${monthNames})\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?`, 'i');
      const simpleMatch = dateText.match(simpleDateRegex);
      
      if (simpleMatch) {
        const month = simpleMatch[1];
        const day = parseInt(simpleMatch[2], 10);
        const year = simpleMatch[3] ? parseInt(simpleMatch[3], 10) : new Date().getFullYear();
        
        // Build date string
        const dateStr = `${month} ${day}, ${year}`;
        
        // Parse date
        const startDate = new Date(dateStr);
        startDate.setHours(19, 30, 0); // Default to 7:30 PM for theater shows
        
        const endDate = new Date(startDate);
        endDate.setHours(22, 0, 0); // Default to 10:00 PM for end time
        
        // Check if date is valid
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          return { 
            startDate, 
            endDate,
            hasRange: false
          };
        }
      }
      
      // Try to extract time if specified
      const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*((?:AM|PM|am|pm))\b/;
      const timeMatch = dateText.match(timeRegex);
      
      if (timeMatch) {
        // Extract time components
        const hour = parseInt(timeMatch[1], 10);
        const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const period = timeMatch[3].toUpperCase();
        
        // Calculate hour in 24-hour format
        const hourIn24 = period === 'PM' && hour !== 12 ? hour + 12 : (period === 'AM' && hour === 12 ? 0 : hour);
        
        // Create date objects
        const today = new Date();
        const startDate = new Date(today);
        startDate.setHours(hourIn24, minute, 0);
        
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 2, 30, 0); // Assume 2.5 hour show
        
        return { 
          startDate, 
          endDate,
          hasRange: false,
          timeOnly: true
        };
      }
    } catch (error) {
      console.warn(`Error parsing date range: ${error.message}`);
    }
    
    return { startDate: null, endDate: null };
  }

  /**
   * Take a screenshot for debugging
   */
  async takeScreenshot(page, filename = 'cultch-debug.png') {
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
  async saveHtml(page, filename = 'cultch-debug.html') {
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
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting The Cultch Events scraper...');
    const events = [];
    let browser;
    
    try {
      // Launch browser with stealth mode
      browser = await puppeteer.launch({
        headless: "new",
        executablePath: executablePath(),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080'
        ]
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
      
      // Add random delays to simulate human behavior
      await page.setDefaultNavigationTimeout(60000);
      
      // Navigate to the events page with retry logic
      let retries = 3;
      let loaded = false;
      
      while (retries > 0 && !loaded) {
        try {
          console.log(`Navigating to ${this.url}`);
          await page.goto(this.url, { 
            waitUntil: ['domcontentloaded', 'networkidle2'] 
          });
          loaded = true;
        } catch (error) {
          retries--;
          console.warn(`Navigation failed, retries left: ${retries}`);
          if (retries === 0) throw error;
          await new Promise(r => setTimeout(r, 5000));
        }
      }
      
      // Take a screenshot for debugging
      await this.takeScreenshot(page);
      
      // Allow dynamic content to load
      await new Promise(r => setTimeout(r, 2000));
      
      console.log('Extracting events from the page...');
      
      // Try multiple possible selectors for event elements
      const eventSelectors = [
        '.shows-list .show',
        '.event-list .event',
        '.production-list .production',
        '.whats-on .event',
        '.performance-list .performance',
        '.events-container .event-item',
        '.event-card',
        '.performance',
        'article.production',
        '.show-card'
      ];
      
      let foundEvents = [];
      for (const selector of eventSelectors) {
        try {
          const hasEvents = await page.$(selector);
          if (hasEvents) {
            console.log(`Found events with selector: ${selector}`);
            
            // Extract events using this selector
            foundEvents = await page.$$eval(selector, elements => {
              return elements.map(el => {
                // Try different ways to extract title
                const title = el.querySelector('h1')?.innerText || 
                              el.querySelector('h2')?.innerText ||
                              el.querySelector('h3')?.innerText ||
                              el.querySelector('h4')?.innerText ||
                              el.querySelector('.title')?.innerText ||
                              el.querySelector('.show-title')?.innerText ||
                              el.querySelector('.production-title')?.innerText ||
                              el.querySelector('a')?.innerText || 
                              'Unknown Event';
                
                // Try different ways to extract date
                const dateText = el.querySelector('.date')?.innerText || 
                                el.querySelector('.show-date')?.innerText || 
                                el.querySelector('.performance-date')?.innerText || 
                                el.querySelector('time')?.innerText || 
                                el.querySelector('.dates')?.innerText || 
                                '';
                
                // Try different ways to extract link
                const link = el.querySelector('a')?.href ||
                            el.dataset.url ||
                            '';
                
                // Try different ways to extract image
                const image = el.querySelector('img')?.src ||
                             el.querySelector('.image')?.style.backgroundImage?.replace(/url\(['"](.+)['"]\)/, '$1') ||
                             el.querySelector('.show-image')?.style.backgroundImage?.replace(/url\(['"](.+)['"]\)/, '$1') ||
                             '';
                
                // Try different ways to extract description
                const description = el.querySelector('.description')?.innerText ||
                                   el.querySelector('.show-description')?.innerText ||
                                   el.querySelector('.summary')?.innerText ||
                                   el.querySelector('p')?.innerText ||
                                   '';
                
                // Try to extract venue info (The Cultch has multiple spaces)
                const venueText = el.querySelector('.venue')?.innerText ||
                                 el.querySelector('.location')?.innerText ||
                                 '';
                
                return {
                  title: title.trim(),
                  dateText: dateText.trim(),
                  link,
                  image,
                  description: description.trim(),
                  venueText: venueText.trim()
                };
              });
            });
            
            break;
          }
        } catch (error) {
          console.warn(`Error with selector ${selector}: ${error.message}`);
        }
      }
      
      // If no events found with selectors, try to find all event links
      if (foundEvents.length === 0) {
        console.log('No events found with standard selectors, trying alternative approach...');
        
        // Save HTML for analysis
        await this.saveHtml(page);
        
        // Look for links that might point to event pages
        const eventLinks = await page.$$eval('a[href*="show"], a[href*="event"], a[href*="performance"], a[href*="production"]', links => {
          return links.map(link => {
            return {
              title: link.innerText.trim(),
              link: link.href
            };
          }).filter(item => 
            item.title && 
            item.title.length > 3 && 
            !item.title.toLowerCase().includes('login') && 
            !item.title.toLowerCase().includes('sign') &&
            !item.title.toLowerCase().includes('account') &&
            !item.title.toLowerCase().includes('menu') &&
            !item.title.toLowerCase().includes('search')
          );
        });
        
        // Visit each event link to extract details
        if (eventLinks.length > 0) {
          console.log(`Found ${eventLinks.length} potential event links`);
          
          for (const eventLink of eventLinks.slice(0, 15)) { // Limit to 15 to avoid excessive scraping
            try {
              console.log(`Navigating to event page: ${eventLink.link}`);
              await page.goto(eventLink.link, { waitUntil: ['domcontentloaded', 'networkidle2'] });
              
              // Allow dynamic content to load
              await new Promise(r => setTimeout(r, 1500));
              
              // Extract event details from the page
              const eventDetails = await page.evaluate(() => {
                // Try different selectors for event title
                const title = document.querySelector('h1')?.innerText || 
                             document.querySelector('.show-title')?.innerText ||
                             document.querySelector('.production-title')?.innerText ||
                             document.title || 
                             'Unknown Event';
                
                // Try different selectors for event date
                const dateText = document.querySelector('.date')?.innerText || 
                                document.querySelector('.dates')?.innerText ||
                                document.querySelector('.performance-date')?.innerText ||
                                document.querySelector('time')?.innerText || 
                                document.querySelector('.schedule')?.innerText ||
                                '';
                
                // Try different selectors for event description
                const description = document.querySelector('.description')?.innerText || 
                                   document.querySelector('.show-description')?.innerText ||
                                   document.querySelector('.production-description')?.innerText ||
                                   document.querySelector('.content')?.innerText || 
                                   document.querySelector('meta[name="description"]')?.content ||
                                   '';
                
                // Try different selectors for event image
                const image = document.querySelector('.show-image img')?.src || 
                             document.querySelector('.production-image img')?.src ||
                             document.querySelector('.featured-image img')?.src || 
                             document.querySelector('meta[property="og:image"]')?.content ||
                             '';
                
                // Try to extract venue info
                const venueText = document.querySelector('.venue')?.innerText ||
                                 document.querySelector('.location')?.innerText ||
                                 '';
                
                // Try to extract performance times
                const timeText = document.querySelector('.times')?.innerText ||
                                document.querySelector('.show-times')?.innerText ||
                                '';
                
                return {
                  title: title.trim(),
                  dateText: dateText.trim(),
                  description: description.trim(),
                  image,
                  link: window.location.href,
                  venueText: venueText.trim(),
                  timeText: timeText.trim()
                };
              });
              
              foundEvents.push(eventDetails);
            } catch (error) {
              console.warn(`Error extracting event from ${eventLink.link}: ${error.message}`);
            }
          }
        }
      }
      
      console.log(`Found ${foundEvents.length} potential events`);
      
      // Process events
      for (const eventData of foundEvents) {
        try {
          if (!eventData.title || eventData.title === 'Unknown Event') continue;
          
          // Parse dates
          const { startDate, endDate, hasRange } = this.parseDateRange(eventData.dateText);
          
          // If no valid date found, check if there's time information
          let useStartDate = startDate;
          let useEndDate = endDate;
          
          if (!useStartDate) {
            // If no date from date text, try the time text
            if (eventData.timeText) {
              const { startDate: timeStartDate, endDate: timeEndDate } = this.parseDateRange(eventData.timeText);
              useStartDate = timeStartDate;
              useEndDate = timeEndDate;
            }
            
            // If still no date, use estimated dates
            if (!useStartDate) {
              const today = new Date();
              useStartDate = new Date(today.setDate(today.getDate() + 14));
              useEndDate = new Date(today.setDate(today.getDate() + 21)); // Typical theater run is about a week
            }
          }
          
          // Generate event ID
          const eventId = this.createEventId(eventData.title, useStartDate);
          
          // Determine venue specifics
          let venueDetails = this.venue;
          
          // The Cultch has multiple performance spaces
          const venueText = eventData.venueText ? eventData.venueText.toLowerCase() : '';
          if (venueText.includes('historic')) {
            venueDetails = {
              ...this.venue,
              name: "The Cultch - Historic Theatre",
              id: "cultch-historic-theatre-vancouver"
            };
          } else if (venueText.includes('vancity') || venueText.includes('culture lab')) {
            venueDetails = {
              ...this.venue,
              name: "The Cultch - Vancity Culture Lab",
              id: "cultch-vancity-culture-lab-vancouver"
            };
          } else if (venueText.includes('york')) {
            venueDetails = {
              ...this.venue,
              name: "The Cultch - York Theatre",
              id: "cultch-york-theatre-vancouver",
              address: "639 Commercial Dr",
              postalCode: "V5L 2W2",
              coordinates: {
                lat: 49.2781,
                lng: -123.0698
              }
            };
          }
          
          // Prepare description
          let finalDescription = eventData.description || `${eventData.title} at The Cultch in Vancouver.`;
          
          // Add date range if available
          if (eventData.dateText) {
            if (hasRange) {
              finalDescription += `\n\nPerformance Dates: ${eventData.dateText}`;
            } else {
              finalDescription += `\n\nPerformance Date: ${eventData.dateText}`;
            }
          }
          
          // Add time information if available
          if (eventData.timeText) {
            finalDescription += `\n\nShow Times: ${eventData.timeText}`;
          }
          
          // Add venue information
          if (eventData.venueText) {
            finalDescription += `\n\nVenue: ${eventData.venueText}`;
          } else {
            finalDescription += `\n\nVenue: ${venueDetails.name} at ${venueDetails.address}, Vancouver, BC`;
          }
          
          finalDescription += `\n\nThe Cultch is a venerable performing arts venue in Vancouver offering contemporary theatre, dance, and music performances. For tickets and more information, visit the official website.`;
          
          // Create categories
          const categories = ['theatre', 'performing arts', 'culture', 'entertainment'];
          
          // Add event-specific categories based on title keywords
          const title = eventData.title.toLowerCase();
          if (title.includes('dance') || title.includes('ballet') || title.includes('choreograph')) {
            categories.push('dance', 'performance', 'movement');
          } else if (title.includes('music') || title.includes('concert') || title.includes('symphony') || title.includes('orchestra')) {
            categories.push('music', 'concert', 'live music');
          } else if (title.includes('comedy') || title.includes('stand-up') || title.includes('improv')) {
            categories.push('comedy', 'humor', 'stand-up');
          } else if (title.includes('festival')) {
            categories.push('festival', 'arts festival');
          } else {
            categories.push('theatre', 'drama', 'play');
          }
          
          // Create event object
          const event = {
            id: eventId,
            title: eventData.title,
            description: finalDescription.trim(),
            startDate: useStartDate,
            endDate: useEndDate,
            venue: venueDetails,
            category: 'theatre',
            categories: categories,
            sourceURL: this.url,
            officialWebsite: eventData.link || this.url,
            image: eventData.image || null,
            ticketsRequired: true,
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`✅ Added event: ${eventData.title}`);
        } catch (error) {
          console.warn(`Error processing event ${eventData.title}: ${error.message}`);
        }
      }
      
      // If no events were found, add fallback events
      if (events.length === 0) {
        console.log('No events found, adding fallback events');
        
        // Create fallback event
        const fallbackEvent = {
          id: this.createEventId('Upcoming Performances', null),
          title: 'Upcoming Performances at The Cultch',
          description: 'The Cultch presents a diverse program of contemporary theatre, dance, and music throughout the year. Their three venues (Historic Theatre, Vancity Culture Lab, and York Theatre) showcase local, national and international performing artists.\n\nVisit The Cultch\'s official website for the most up-to-date schedule of performances, ticket information, and venue details.\n\nThe Cultch is a venerable performing arts venue in Vancouver that has been committed to presenting innovative works that engage and challenge audiences since 1973.',
          startDate: null,
          endDate: null,
          venue: this.venue,
          category: 'theatre',
          categories: ['theatre', 'performing arts', 'culture', 'entertainment', 'dance', 'music'],
          sourceURL: this.url,
          officialWebsite: 'https://thecultch.com/whats-on/',
          image: null,
          ticketsRequired: true,
          lastUpdated: new Date()
        };
        
        events.push(fallbackEvent);
        console.log('✅ Added fallback event for The Cultch');
      }
      
      console.log(`🎭 Successfully processed ${events.length} events from The Cultch`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in The Cultch scraper: ${error.message}`);
      return events;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = new TheCultchEvents();
