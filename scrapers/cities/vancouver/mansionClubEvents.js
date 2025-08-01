/**
 * Mansion Club Scraper with Puppeteer Extra + Stealth
 * 
 * This scraper extracts events from Mansion Club website
 * using puppeteer-extra with stealth plugin for improved anti-bot detection resistance
 * Source: https://mansionclub.ca/collections/upcoming-events
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { executablePath } = require('puppeteer');
const fs = require('fs');
const path = require('path');

class MansionClubEvents {
  constructor() {
    this.name = 'Mansion Club Events';
    this.url = 'https://mansionclub.ca/collections/upcoming-events';
    this.baseUrl = 'https://mansionclub.ca';
    
    // Venue information
    this.venue = {
      name: "Mansion Club",
      id: "mansion-club-vancouver",
      address: "1161 Granville St",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6Z 1M1",
      coordinates: {
        lat: 49.2773,
        lng: -123.1271
      },
      websiteUrl: "https://mansionclub.ca/",
      description: "Mansion Club is an upscale nightlife destination in the heart of Vancouver's entertainment district. This sleek venue features cutting-edge sound and lighting systems, multiple bars, and a spacious dance floor. Known for hosting renowned DJs and themed parties, Mansion Club offers bottle service and VIP experiences in a sophisticated atmosphere."
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
    return `mansion-club-${slug}-${formattedDate}`;
  }

  /**
   * Parse date from various formats used on nightclub sites
   */
  parseDate(dateText) {
    if (!dateText) return null;
    
    try {
      // Clean up the text
      const text = dateText.trim().replace(/\s+/g, ' ');
      
      // Check for day of week mentions
      const dayPattern = /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
      const hasDay = dayPattern.test(text.toLowerCase());
      
      // Try different date patterns
      
      // Pattern: Month Day, Year (e.g., "July 15, 2025" or "Jul 15")
      const datePattern1 = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?/i;
      
      // Pattern: Day Month Year (e.g., "15 July 2025" or "15 July")
      const datePattern2 = /\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:,?\s+\d{4})?/i;
      
      // Pattern: MM/DD/YYYY or DD/MM/YYYY
      const datePattern3 = /\d{1,2}\/\d{1,2}(?:\/\d{4})?/;
      
      // Try to match the patterns
      let dateMatch = text.match(datePattern1) || text.match(datePattern2) || text.match(datePattern3);
      let dateStr = dateMatch ? dateMatch[0] : '';
      
      // Extract time if present
      const timePattern = /\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)/i;
      const timeMatch = text.match(timePattern);
      let timeStr = timeMatch ? timeMatch[0] : '10:00 PM'; // Default time for nightclubs
      
      // Try to parse the date
      let date;
      
      if (dateStr) {
        // Add current year if year is not specified
        if (!dateStr.match(/\d{4}/)) {
          dateStr += `, ${new Date().getFullYear()}`;
        }
        
        // Parse the date
        date = new Date(`${dateStr} ${timeStr}`);
        
        // Check if valid
        if (isNaN(date.getTime())) {
          // Try alternative parsing
          const months = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
            'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
          };
          
          // Extract month, day, year
          let month, day, year = new Date().getFullYear();
          
          if (datePattern1.test(dateStr)) {
            const parts = dateStr.split(/\s+/);
            const monthStr = parts[0].toLowerCase().substring(0, 3);
            month = months[monthStr];
            day = parseInt(parts[1].replace(/(?:st|nd|rd|th)/, ''), 10);
            if (parts[2]) {
              year = parseInt(parts[2].replace(',', ''), 10);
            }
          } else if (datePattern2.test(dateStr)) {
            const parts = dateStr.split(/\s+/);
            day = parseInt(parts[0].replace(/(?:st|nd|rd|th)/, ''), 10);
            const monthStr = parts[1].toLowerCase().substring(0, 3);
            month = months[monthStr];
            if (parts[2]) {
              year = parseInt(parts[2].replace(',', ''), 10);
            }
          }
          
          if (month !== undefined && day) {
            // Extract time
            let hour = 22; // Default 10PM
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
      } else if (hasDay) {
        // If only a day of the week is mentioned, use the next occurrence of that day
        const daysOfWeek = {
          'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
          'thursday': 4, 'friday': 5, 'saturday': 6
        };
        
        const dayLower = text.toLowerCase().match(dayPattern)[0];
        const targetDay = daysOfWeek[dayLower];
        
        const today = new Date();
        const currentDay = today.getDay();
        
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) {
          daysToAdd += 7;
        }
        
        date = new Date();
        date.setDate(date.getDate() + daysToAdd);
        
        // Set time
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
            
            date.setHours(parsedHour, parsedMinute, 0);
          }
        } else {
          date.setHours(22, 0, 0); // Default 10PM
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
      const startDate = this.parseDate(dateText);
      
      if (!startDate) {
        return { startDate: null, endDate: null };
      }
      
      // For nightclub events, typically run from evening until early morning
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1); // Next day
      endDate.setHours(2, 30, 0); // 2:30 AM
      
      return {
        startDate,
        endDate,
        isValid: true
      };
    } catch (error) {
      console.warn(`Date extraction error: ${error.message}`);
      return { startDate: null, endDate: null };
    }
  }

  /**
   * Take a screenshot for debugging
   */
  async takeScreenshot(page, filename = 'mansion-club-debug.png') {
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
  async saveHtml(page, filename = 'mansion-club-debug.html') {
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
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Mansion Club Events scraper...');
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
      await new Promise(r => setTimeout(r, 3000));
      
      // Save HTML for analysis
      await this.saveHtml(page);
      
      console.log('Extracting events from the page...');
      
      // Try multiple possible selectors for product/event items (common on Shopify sites)
      const eventSelectors = [
        '.product-grid .grid__item',
        '.collection-products .grid-item',
        '.collection-grid-item',
        '.collection-list .collection-item',
        '.grid-products .grid__item',
        '.collection__products .product',
        '.product-collection .product',
        '.product-list .product',
        '.products-list .product',
        '.collection .grid-item'
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
                const title = el.querySelector('.product-title')?.innerText || 
                              el.querySelector('.grid-product__title')?.innerText ||
                              el.querySelector('.grid-view-item__title')?.innerText ||
                              el.querySelector('h3')?.innerText ||
                              el.querySelector('h4')?.innerText ||
                              el.querySelector('.title')?.innerText ||
                              el.querySelector('a')?.title || 
                              el.querySelector('a')?.innerText || 
                              'Unknown Event';
                
                // Try different ways to extract date
                let dateText = '';
                
                // First check if date is in title
                const dateRegex = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,)? \w+ \d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2}(?:\/\d{4})?/i;
                const titleDateMatch = title.match(dateRegex);
                if (titleDateMatch) {
                  dateText = titleDateMatch[0];
                } else {
                  dateText = el.querySelector('.date')?.innerText || 
                            el.querySelector('.event-date')?.innerText || 
                            el.querySelector('.product-date')?.innerText || 
                            '';
                }
                
                // Try different ways to extract link
                const link = el.querySelector('a')?.href ||
                            el.dataset.url ||
                            '';
                
                // Try different ways to extract image
                const image = el.querySelector('img')?.src ||
                             el.querySelector('img')?.dataset?.src ||
                             el.querySelector('.product__image')?.src ||
                             el.querySelector('.grid-product__image')?.src ||
                             el.style.backgroundImage?.replace(/url\(['"](.+)['"]\)/, '$1') ||
                             '';
                
                // Try different ways to extract description
                const description = el.querySelector('.description')?.innerText ||
                                   el.querySelector('.product-description')?.innerText ||
                                   el.querySelector('.grid-product__description')?.innerText ||
                                   el.querySelector('.details')?.innerText ||
                                   '';
                
                // Try to extract price
                const priceText = el.querySelector('.price')?.innerText ||
                                 el.querySelector('.product-price')?.innerText ||
                                 el.querySelector('.grid-product__price')?.innerText ||
                                 el.querySelector('.price-item')?.innerText ||
                                 '';
                
                return {
                  title: title.trim(),
                  dateText: dateText.trim(),
                  link,
                  image,
                  description: description.trim(),
                  priceText: priceText.trim()
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
        
        // Look for links that might point to event pages
        const eventLinks = await page.$$eval('a[href*="products"], a[href*="events"], a[href*="tickets"]', links => {
          return links.map(link => {
            return {
              title: link.innerText.trim() || link.title || '',
              link: link.href,
              image: link.querySelector('img')?.src || link.querySelector('img')?.dataset?.src || ''
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
                // Try different ways to extract title
                const title = document.querySelector('.product-title')?.innerText || 
                             document.querySelector('.product__title')?.innerText ||
                             document.querySelector('h1')?.innerText ||
                             document.querySelector('h2')?.innerText ||
                             document.title || 
                             'Unknown Event';
                
                // Look for date in title or description
                const dateRegex = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,)? \w+ \d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2}(?:\/\d{4})?/i;
                
                let dateText = '';
                const titleDateMatch = title.match(dateRegex);
                if (titleDateMatch) {
                  dateText = titleDateMatch[0];
                } else {
                  // Try to find date in description or elsewhere
                  const descriptionEl = document.querySelector('.product-description') || 
                                       document.querySelector('.description') ||
                                       document.querySelector('.product__description');
                  
                  if (descriptionEl) {
                    const descriptionDateMatch = descriptionEl.innerText.match(dateRegex);
                    if (descriptionDateMatch) {
                      dateText = descriptionDateMatch[0];
                    }
                  }
                  
                  // Try other date elements
                  if (!dateText) {
                    dateText = document.querySelector('.date')?.innerText || 
                              document.querySelector('.product-date')?.innerText || 
                              document.querySelector('meta[property="event:start_time"]')?.content || 
                              '';
                  }
                }
                
                // Try different ways to extract description
                const description = document.querySelector('.product-description')?.innerText || 
                                   document.querySelector('.description')?.innerText ||
                                   document.querySelector('.product__description')?.innerText ||
                                   document.querySelector('.details')?.innerText || 
                                   document.querySelector('meta[name="description"]')?.content ||
                                   '';
                
                // Try different ways to extract image
                const image = document.querySelector('.product-single__media img')?.src || 
                             document.querySelector('.product-single__image')?.src ||
                             document.querySelector('.featured-image img')?.src || 
                             document.querySelector('meta[property="og:image"]')?.content ||
                             '';
                
                // Try to extract price
                const priceText = document.querySelector('.product-price')?.innerText ||
                                 document.querySelector('.price')?.innerText ||
                                 document.querySelector('.price__pricing-group')?.innerText ||
                                 document.querySelector('.price-item--regular')?.innerText ||
                                 '';
                
                return {
                  title: title.trim(),
                  dateText: dateText.trim(),
                  description: description.trim(),
                  image,
                  link: window.location.href,
                  priceText: priceText.trim()
                };
              });
              
              // Combine data
              eventDetails.image = eventDetails.image || eventLink.image;
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
          
          // Extract day/date information from title if not already found
          if (!eventData.dateText) {
            const dateRegex = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,)? \w+ \d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2}(?:\/\d{4})?/i;
            const dayRegex = /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i;
            
            const titleDateMatch = eventData.title.match(dateRegex);
            if (titleDateMatch) {
              eventData.dateText = titleDateMatch[0];
            } else {
              const dayMatch = eventData.title.match(dayRegex);
              if (dayMatch) {
                eventData.dateText = dayMatch[0];
              }
            }
          }
          
          // Parse dates
          const { startDate, endDate } = this.extractDateInfo(eventData.dateText);
          
          // If no valid date found, use estimated dates
          const today = new Date();
          const useStartDate = startDate || new Date(today.setDate(today.getDate() + 7));
          const useEndDate = endDate || new Date(useStartDate);
          if (!endDate) {
            useEndDate.setDate(useEndDate.getDate() + 1);
            useEndDate.setHours(2, 30, 0);  // 2:30 AM
          }
          
          // Generate event ID
          const eventId = this.createEventId(eventData.title, useStartDate);
          
          // Extract price info
          const priceInfo = this.extractPrice(eventData.priceText) || 'Tickets available online';
          
          // Clean up the title (remove date if present in title)
          let cleanTitle = eventData.title;
          if (eventData.dateText && cleanTitle.includes(eventData.dateText)) {
            cleanTitle = cleanTitle.replace(eventData.dateText, '').trim();
            // Clean up any remaining date markers or separators
            cleanTitle = cleanTitle.replace(/(?:-|–|—|\||\(|\))/g, ' ').trim();
          }
          
          // Look for featured artists/DJs in title
          let performers = [];
          const titleParts = cleanTitle.split(/\s*(?:with|featuring|presents|ft\.?|feat\.?)\s*/i);
          if (titleParts.length > 1) {
            // Second part likely contains performer names
            const performerText = titleParts[1];
            performers = performerText.split(/\s*(?:and|,|&)\s*/).map(name => name.trim());
            // Update title to use the first part
            cleanTitle = titleParts[0].trim();
          }
          
          // Prepare description
          let finalDescription = eventData.description || `Join us for ${cleanTitle} at Mansion Club in Vancouver.`;
          
          if (eventData.dateText) {
            finalDescription += `\n\nEvent Date: ${eventData.dateText}`;
          }
          
          if (performers.length > 0) {
            finalDescription += `\n\nFeaturing: ${performers.join(', ')}`;
          }
          
          if (eventData.priceText) {
            finalDescription += `\n\nTicket Information: ${eventData.priceText}`;
          } else {
            finalDescription += `\n\nTickets: ${priceInfo}`;
          }
          
          finalDescription += `\n\nMansion Club is an upscale nightlife destination in the heart of Vancouver's entertainment district at 1161 Granville St. This sleek venue features cutting-edge sound and lighting systems, multiple bars, and a spacious dance floor. VIP table service is available.`;
          
          // Create categories
          const categories = ['nightclub', 'nightlife', 'entertainment', 'music'];
          
          // Add event-specific categories based on title keywords
          const title = cleanTitle.toLowerCase();
          if (title.includes('dj') || title.includes('spin')) {
            categories.push('dj', 'electronic music');
          }
          if (title.includes('hip hop') || title.includes('rap')) {
            categories.push('hip hop', 'rap');
          }
          if (title.includes('techno') || title.includes('house') || title.includes('edm')) {
            categories.push('electronic music', 'techno', 'house', 'edm');
          }
          if (title.includes('dance') || title.includes('party')) {
            categories.push('dance', 'party');
          }
          if (title.includes('ladies') || title.includes('girls')) {
            categories.push('ladies night');
          }
          if (title.includes('vip')) {
            categories.push('vip', 'bottle service');
          }
          
          // Create event object
          const event = {
            id: eventId,
            title: cleanTitle || eventData.title,
            description: finalDescription.trim(),
            startDate: useStartDate,
            endDate: useEndDate,
            venue: this.venue,
            category: 'nightlife',
            categories: categories,
            performers: performers.length > 0 ? performers : undefined,
            sourceURL: this.url,
            officialWebsite: eventData.link || this.url,
            image: eventData.image || null,
            ticketsRequired: true,
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`✅ Added event: ${cleanTitle || eventData.title}`);
        } catch (error) {
          console.warn(`Error processing event ${eventData.title}: ${error.message}`);
        }
      }
      
      console.log(`🎵 Successfully processed ${events.length} events from Mansion Club`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Mansion Club scraper: ${error.message}`);
      return events;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = new MansionClubEvents();
