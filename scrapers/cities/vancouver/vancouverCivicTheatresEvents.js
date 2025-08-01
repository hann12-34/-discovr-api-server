/**
 * Orpheum Theatre Events Scraper
 * Scrapes events from Orpheum Theatre's website using puppeteer-extra with stealth plugin
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const { executablePath } = require('puppeteer');
const { randomDelay, getRandomUserAgent, humanLikeScroll, randomMouseMovements, withRetry, emulateBrowserHistory } = require('../../utils/scraper-utils');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugins to puppeteer
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

class VancouverCivicTheatresEvents {
  constructor() {
    this.name = 'Vancouver Civic Theatres Events';
    this.url = 'https://vancouvercivictheatres.com/events/';
    this.venue = {
      name: 'Vancouver Civic Theatres',
      id: 'vancouver-civic-theatres',
      address: '630 Hamilton St',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V6B 5N6',
      location: {
        coordinates: [-123.1178014, 49.2813118]
      },
      websiteUrl: 'https://vancouvercivictheatres.com/',
      description: "Vancouver Civic Theatres operates the city's premier performance venues, including the Queen Elizabeth Theatre, Orpheum, Vancouver Playhouse, and Annex."
    };
  }
  
  /**
   * Take a screenshot for debugging
   */
  async takeScreenshot(page, filename = 'orpheum-debug.png') {
    try {
      const screenshotPath = path.resolve(process.cwd(), filename);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`✅ Saved debug screenshot to ${filename}`);
    } catch (error) {
      console.warn(`Failed to take screenshot: ${error.message}`);
    }
  }

  /**
   * Save HTML content for debugging
   */
  async saveHtml(page, filename = 'orpheum-debug.html') {
    try {
      const content = await page.content();
      const htmlPath = path.resolve(process.cwd(), filename);
      fs.writeFileSync(htmlPath, content);
      console.log(`✅ Saved debug HTML to ${filename}`);
    } catch (error) {
      console.warn(`Failed to save HTML: ${error.message}`);
    }
  }

  /**
   * Scrape events from Orpheum Theatre with enhanced stealth and resilience
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log(`Starting ${this.name} scraper...`);
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
      
      // Configure viewport with randomized dimensions for additional stealth
      const viewportWidth = 1920 + Math.floor(Math.random() * 100);
      const viewportHeight = 1080 + Math.floor(Math.random() * 100);
      await page.setViewport({
        width: viewportWidth,
        height: viewportHeight,
        deviceScaleFactor: 1,
      });
      
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
        await randomDelay(1500, 3500);
      });
      
      // Take a screenshot for debugging
      await this.takeScreenshot(page);
      
      // Perform human-like scrolling and mouse movements
      await humanLikeScroll(page, 4, 600);
      await randomMouseMovements(page);
      
      // Allow dynamic content to load with random delay
      await randomDelay(2000, 4000);
      
      // Save HTML for analysis
      await this.saveHtml(page);

      console.log('Extracting Orpheum Theatre events...');
      const extractedEvents = await this.extractEvents(page);
      
      // Add extracted events to our events array
      events.push(...extractedEvents);
      
      console.log(`Found ${events.length} Orpheum Theatre events`);
      
      return events;
    } catch (error) {
      console.error(`Error in ${this.name} scraper:`, error);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
      console.log(`${this.name} scraper finished`);
    }
  }

  /**
   * Extract events from Orpheum Theatre website
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<Array>} - Array of event objects
   */
  async extractEvents(page) {
    try {
      // Allow more time for JavaScript-rendered content to load
      await randomDelay(5000, 8000);
      
      // Save debug files
      await this.takeScreenshot(page, 'civic-events-pre-extract.png');
      await this.saveHtml(page, 'civic-events-pre-extract.html');
      
      // Scroll down the page to trigger lazy loading with human-like behavior
      await this.scrollPage(page);
      
      // Wait after scrolling with randomized delay
      await randomDelay(2000, 4000);
      
      // Click "Load More" button repeatedly to get ALL events (targeting 150+)
      console.log('Clicking Load More button to get all available events...');
      let loadMoreClicks = 0;
      const maxLoadMoreClicks = 20; // Safety limit
      
      while (loadMoreClicks < maxLoadMoreClicks) {
        try {
          // Look for Load More button (fixed selector)
          const loadMoreButton = await page.$('button.button--more, .featured__more button, button[class*="more"], [class*="load"][class*="more"]');
          
          if (loadMoreButton) {
            // Check if button is visible and clickable
            const isVisible = await page.evaluate(btn => {
              const rect = btn.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && getComputedStyle(btn).visibility !== 'hidden';
            }, loadMoreButton);
            
            if (isVisible) {
              console.log(`Clicking Load More button (click ${loadMoreClicks + 1})...`);
              
              // Scroll button into view
              await page.evaluate(btn => btn.scrollIntoView({ behavior: 'smooth', block: 'center' }), loadMoreButton);
              await randomDelay(1000, 2000);
              
              // Click the button
              await loadMoreButton.click();
              loadMoreClicks++;
              
              // Wait for new content to load
              await randomDelay(3000, 5000);
              
              // Check if more events were loaded
              const eventCount = await page.$$eval('.featured__item', items => items.length);
              console.log(`Events after click ${loadMoreClicks}: ${eventCount}`);
              
              // If no new events loaded, button might be exhausted
              if (loadMoreClicks > 1) {
                const prevEventCount = await page.evaluate(() => {
                  return window.prevEventCount || 0;
                });
                
                if (eventCount <= prevEventCount) {
                  console.log('No new events loaded, Load More button exhausted');
                  break;
                }
              }
              
              // Store current count for next iteration
              await page.evaluate(count => { window.prevEventCount = count; }, eventCount);
              
            } else {
              console.log('Load More button not visible, stopping');
              break;
            }
          } else {
            console.log('Load More button not found, stopping');
            break;
          }
        } catch (error) {
          console.log(`Error clicking Load More: ${error.message}`);
          break;
        }
      }
      
      console.log(`Completed Load More clicking after ${loadMoreClicks} clicks`);
      
      // Final scroll to ensure all content is loaded
      await this.scrollPage(page);
      await randomDelay(2000, 4000);
      
      // Try specific Vancouver Symphony Orchestra selectors first
      console.log('Looking for VSO events with specific selectors...');
      const events = [];
      
      // Primary attempt - look for events with common VSO selectors
      const hasEvents = await page.evaluate(() => {
        // Vancouver Civic Theatres specific selectors based on actual website structure
        const vctSelectors = [
          // Primary VCT event container (confirmed from debug HTML)
          '.featured__item',
          // Backup VCT selectors
          '.featured__group .featured__item',
          '.featured__group--grid .featured__item',
          // Additional event-related selectors for VCT
          '.event-item',
          '.event-card',
          '.featured-event',
          // Generic fallbacks
          '[class*="featured"][class*="item"]',
          '[class*="event"]'
        ];
        
        for (const selector of vctSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`Found ${elements.length} elements with selector: ${selector}`);
            return {selector, count: elements.length};
          }
        }
        return {selector: null, count: 0};
      });
      
      if (hasEvents.selector) {
        console.log(`Found ${hasEvents.count} events with selector ${hasEvents.selector}`);
        
        // Extract events based on the successful selector
        const extractedEvents = await page.evaluate((selector) => {
          return Array.from(document.querySelectorAll(selector)).map(el => {
            try {
              // Extract title using VCT-specific selectors
              const title = el.querySelector('h5.featured__title, .featured__title, h5, h2, h3, h4, .title, .event-title')?.innerText?.trim() || 'Unknown Event';
              
              // Date and time extraction
              let dateText = el.querySelector('.date, .event-date, time, [class*="date"]')?.innerText || '';
              if (!dateText) {
                const dateElements = el.querySelectorAll('[datetime], [data-date]');
                if (dateElements.length > 0) {
                  dateText = dateElements[0].getAttribute('datetime') || dateElements[0].getAttribute('data-date') || '';
                }
              }
              
              // Description extraction
              let description = el.querySelector('.description, .event-description, [class*="description"]')?.innerText || '';
              if (!description) {
                const contentElements = el.querySelectorAll('p');
                description = Array.from(contentElements)
                  .map(p => p.innerText)
                  .filter(text => text.length > 20) // Only substantial paragraphs
                  .join(' ')
                  .slice(0, 200); // Limit description length
              }
              
              // Try to get image
              let imageUrl = '';
              const imgElement = el.querySelector('img');
              if (imgElement) {
                imageUrl = imgElement.src || imgElement.getAttribute('data-src') || '';
              }
              
              // Try to get ticket link
              let ticketUrl = '';
              const linkElements = Array.from(el.querySelectorAll('a'));
              for (const link of linkElements) {
                const href = link.href || '';
                const text = (link.innerText || '').toLowerCase();
                if (
                  href && 
                  (text.includes('ticket') || 
                   text.includes('buy') || 
                   text.includes('purchase') || 
                   href.includes('ticket'))
                ) {
                  ticketUrl = href;
                  break;
                }
              }
              
              // Get event URL
              let eventUrl = '';
              const titleLink = el.querySelector('h2 a, h3 a, h4 a, .title a, .event-title a');
              if (titleLink) {
                eventUrl = titleLink.href || '';
              }
              
              // Get any other relevant information
              const categoryEl = el.querySelector('.category, .event-category, [class*="category"]');
              const category = categoryEl ? categoryEl.innerText : '';
              
              const venueEl = el.querySelector('.venue, .event-venue, [class*="venue"], [class*="location"]');
              const venueText = venueEl ? venueEl.innerText : 'Orpheum Theatre';
              
              return {
                title,
                dateText,
                description: description || 'No description available',
                imageUrl,
                ticketUrl,
                eventUrl,
                category,
                venueText
              };
            } catch (err) {
              console.error('Error extracting event data:', err);
              return null;
            }
          }).filter(Boolean); // Remove any null items
        }, hasEvents.selector);
        
        console.log(`Successfully extracted ${extractedEvents.length} events`);
        
        // Process the extracted events
        for (const item of extractedEvents) {
          try {
            // Parse dates
            const { startDate, endDate } = this.parseDates(item.dateText);
            
            // Create slug
            const slug = slugify(item.title, { 
              lower: true, 
              strict: true,
              remove: /[*+~.()'"!:@]/g
            });
            
            // Generate a unique ID for the event to avoid MongoDB duplicate key errors
            const eventId = `orpheum-${slug}-${startDate.toISOString().split('T')[0]}`;
            
            const event = {
              id: eventId,  // Add unique ID
              title: item.title, // Changed from name to title for consistency with other scrapers
              slug: slug,
              description: item.description,
              url: item.eventUrl || this.url,
              venue: this.venue,
              startDate,
              endDate,
              imageUrl: item.imageUrl,
              ticketUrl: item.ticketUrl,
              source: 'orpheum',
              scraped: new Date()
            };
            
            events.push(event);
          } catch (error) {
            console.error(`Error processing event ${item.title}:`, error);
          }
        }
      }
      
      // If we didn't find events with the primary method, try looking for links
      if (events.length === 0) {
        console.log('No events found with primary selectors, trying alternative methods...');
        
        // Take another screenshot to see what we're working with
        await this.takeScreenshot(page, 'orpheum-events-second-attempt.png');
        
        // Try to find and navigate to events-related pages
        const relevantLinks = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          return links
            .filter(link => {
              const text = (link.textContent || '').toLowerCase();
              const href = (link.href || '').toLowerCase();
              return text.includes('event') || 
                    text.includes('concert') || 
                    text.includes('performance') || 
                    text.includes('calendar') || 
                    href.includes('event') || 
                    href.includes('concert');
            })
            .map(link => ({
              text: link.textContent?.trim() || '',
              href: link.href || '',
            }));
        });
        
        console.log(`Found ${relevantLinks.length} potential event links`);
        
        // Sort links by relevance
        const sortedLinks = relevantLinks.sort((a, b) => {
          const scoreA = this.getLinkRelevanceScore(a);
          const scoreB = this.getLinkRelevanceScore(b);
          return scoreB - scoreA;
        }).slice(0, 3); // Take only the top 3 most relevant links
        
        // Try each relevant link
        for (const link of sortedLinks) {
          console.log(`Trying link: ${link.text} (${link.href})`);
          
          // Navigate to the link with retry
          await withRetry(async () => {
            await page.goto(link.href, { 
              waitUntil: ['domcontentloaded', 'networkidle2'],
              timeout: 60000
            });
            await randomDelay(2000, 4000);
          });
          
          // Perform human-like scrolling on this page too
          await this.scrollPage(page);
          await randomDelay(1000, 3000);
          
          // Screenshot this page too
          await this.takeScreenshot(page, `orpheum-events-link-${slugify(link.text)}.png`);
          
          // Try extracting events again on this page
          const subPageEvents = await this.extractEvents(page);
          
          if (subPageEvents && subPageEvents.length > 0) {
            events.push(...subPageEvents);
            console.log(`Found ${subPageEvents.length} events on linked page!`);
            break; // Stop after finding events
          }
        }
      }
      
      // Final fallback - generic extraction if all else fails
      if (events.length === 0) {
        console.log('No events found with previous methods. Trying generic extraction...');
        
        const genericEvents = await page.evaluate(() => {
          // Look for any elements that might be events
          const potentialEvents = [];
          
          // Look for h2/h3 headers that might indicate events
          const headers = Array.from(document.querySelectorAll('h2, h3'));
          
          for (const header of headers) {
            // Check if this header seems like an event title
            const text = header.innerText.toLowerCase();
            
            if (text.includes('concert') || 
                text.includes('performance') || 
                text.includes('show') || 
                text.includes('symphony')) {
              
              // Try to find a date near this header
              let dateText = '';
              let currentElement = header.nextElementSibling;
              let searchDepth = 0;
              
              while (currentElement && searchDepth < 5) {
                const elText = currentElement.innerText || '';
                
                // Check if this element contains date patterns
                if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(elText) || 
                    /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/.test(elText) ||
                    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(elText)) {
                  dateText = elText;
                  break;
                }
                
                currentElement = currentElement.nextElementSibling;
                searchDepth++;
              }
              
              potentialEvents.push({
                title: header.innerText,
                dateText,
                description: '',
                imageUrl: '',
                ticketUrl: '',
                eventUrl: '',
                category: '',
                venueText: 'Orpheum Theatre'
              });
            }
          }
          
          return potentialEvents;
        });
        
        // Process generic events the same way
        for (const item of genericEvents) {
          try {
            const { startDate, endDate } = this.parseDates(item.dateText);
            
            const slug = slugify(item.title, { 
              lower: true, 
              strict: true,
              remove: /[*+~.()'"!:@]/g
            });
            
            const event = {
              name: item.title,
              slug: slug,
              description: item.description,
              url: this.url,
              venue: this.venue,
              startDate,
              endDate,
              imageUrl: '',
              ticketUrl: '',
              source: 'orpheum',
              scraped: new Date()
            };
            
            events.push(event);
          } catch (error) {
            console.error(`Error processing generic event ${item.title}:`, error);
          }
        }
      }
      
      console.log(`Total events found: ${events.length}`);
      return events;
      
    } catch (error) {
      console.error('Error extracting events:', error);
      return [];
    }
  }

  /**
   * Parse dates from text
   * @param {string} dateText - Text containing date information
   * @returns {Object} - Object with startDate and endDate
   */
  parseDates(dateText) {
    try {
      if (!dateText) {
        // Default to current date if no date text
        const today = new Date();
        return { startDate: today, endDate: today };
      }
      
      // Clean up the date text
      dateText = dateText.trim();
      
      // Check if we have a date range with format like "MAY 8-21" or "JUL 4 - AUG 9"
      const rangePattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{1,2})\s*[-–]\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?\s*(\d{1,2})\b/i;
      const rangeMatch = dateText.match(rangePattern);
      
      if (rangeMatch) {
        const startMonth = rangeMatch[1].toLowerCase();
        const startDay = parseInt(rangeMatch[2]);
        // If end month is specified use it, otherwise use start month
        const endMonth = (rangeMatch[3] || rangeMatch[1]).toLowerCase();
        const endDay = parseInt(rangeMatch[4]);
        
        // Convert month names to month numbers
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const startMonthNum = monthNames.indexOf(startMonth.slice(0, 3));
        const endMonthNum = monthNames.indexOf(endMonth.slice(0, 3));
        
        const currentYear = new Date().getFullYear();
        
        const startDate = new Date(currentYear, startMonthNum, startDay);
        const endDate = new Date(currentYear, endMonthNum, endDay);
        
        return { startDate, endDate };
      }
      
      // Check for a single date with month and day
      const singlePattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{1,2})(st|nd|rd|th)?\b/i;
      const singleMatch = dateText.match(singlePattern);
      
      if (singleMatch) {
        const month = singleMatch[1].toLowerCase();
        const day = parseInt(singleMatch[2]);
        
        // Convert month name to month number
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthNum = monthNames.indexOf(month.slice(0, 3));
        
        const currentYear = new Date().getFullYear();
        const date = new Date(currentYear, monthNum, day);
        
        return { startDate: date, endDate: date };
      }
      
      // Look for a date in the format "FRIDAY JULY 11TH"
      const fullDatePattern = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{1,2})(st|nd|rd|th)?\b/i;
      const fullDateMatch = dateText.match(fullDatePattern);
      
      if (fullDateMatch) {
        const month = fullDateMatch[2].toLowerCase();
        const day = parseInt(fullDateMatch[3]);
        
        // Convert month name to month number
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthNum = monthNames.indexOf(month.slice(0, 3));
        
        const currentYear = new Date().getFullYear();
        const date = new Date(currentYear, monthNum, day);
        
        return { startDate: date, endDate: date };
      }
      
      // Look for a date in the format "2025-07-15"
      const isoDatePattern = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/;
      const isoDateMatch = dateText.match(isoDatePattern);
      
      if (isoDateMatch) {
        const year = parseInt(isoDateMatch[1]);
        const month = parseInt(isoDateMatch[2]) - 1; // JavaScript months are 0-indexed
        const day = parseInt(isoDateMatch[3]);
        
        const date = new Date(year, month, day);
        
        return { startDate: date, endDate: date };
      }
      
      // Last resort: Try to parse the date directly
      const parsedDate = new Date(dateText);
      if (!isNaN(parsedDate.getTime())) {
        return { startDate: parsedDate, endDate: parsedDate };
      }
      
      // If all else fails, return today's date
      const today = new Date();
      return { startDate: today, endDate: today };
    } catch (error) {
      console.error('Error parsing dates:', error);
      const today = new Date();
      return { startDate: today, endDate: today };
    }
  }
  
  /**
   * Scroll the page to trigger lazy loading with human-like behavior
   * @param {Page} page - Puppeteer page object
   */
  async scrollPage(page) {
    // Get page height for intelligent scrolling
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    
    console.log(`Scrolling page with height ${pageHeight}px to load dynamic content...`);
    
    // Human-like scrolling pattern with random pauses
    await page.evaluate(async () => {
      const randomScrollDelay = (min, max) => {
        const delay = Math.floor(Math.random() * (max - min + 1) + min);
        return new Promise(resolve => setTimeout(resolve, delay));
      };
      
      // Initial pause like a human would do
      await randomScrollDelay(500, 1500);
      
      // Random number of scrolls (5-8) with varying distances
      const scrollCount = Math.floor(Math.random() * 4) + 5;
      
      for (let i = 0; i < scrollCount; i++) {
        // Random scroll distance between 300-800px
        const scrollDistance = Math.floor(Math.random() * 500) + 300;
        window.scrollBy(0, scrollDistance);
        
        // Random pause between scrolls (400-2000ms)
        await randomScrollDelay(400, 2000);
        
        // Small chance (20%) to scroll back up slightly to simulate reading behavior
        if (Math.random() < 0.2) {
          window.scrollBy(0, -Math.floor(Math.random() * 200));
          await randomScrollDelay(300, 800);
        }
      }
      
      // Final scroll to bottom to ensure all content is loaded
      window.scrollTo(0, document.body.scrollHeight);
      await randomScrollDelay(1000, 2000);
      
      // Scroll back up a bit as a user would do after reaching the bottom
      window.scrollBy(0, -Math.floor(Math.random() * 500));
    });
    
    // Wait for any lazy-loaded content to appear using setTimeout instead of waitForTimeout
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
  }

  /**
   * Calculate relevance score for event links
   * @param {Object} link - Link object with href and text properties
   * @returns {number} - Relevance score
   */
  getLinkRelevanceScore(link) {
    let score = 0;
    const text = (link.text || '').toLowerCase();
    const href = (link.href || '').toLowerCase();
    
    // Higher scores for more relevant terms
    if (text.includes('event') || href.includes('event')) score += 5;
    if (text.includes('concert') || href.includes('concert')) score += 5;
    if (text.includes('performance') || href.includes('performance')) score += 4;
    if (text.includes('orpheum') || href.includes('orpheum')) score += 10;
    if (text.includes('schedule') || href.includes('schedule')) score += 3;
    if (text.includes('calendar') || href.includes('calendar')) score += 3;
    if (text.includes('season') || href.includes('season')) score += 2;
    
    return score;
  }
}

module.exports = new VancouverCivicTheatresEvents();
