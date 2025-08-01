/**
 * Vancouver Civic Theatres Events Scraper
 * 
 * This scraper extracts events from Vancouver Civic Theatres using puppeteer
 * to handle JavaScript-loaded content shown in user's screenshots
 * Source: https://vancouvercivictheatres.com/events/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { executablePath } = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

class VancouverCivicTheatresEvents {
  constructor() {
    this.name = 'Vancouver Civic Theatres Events';
    this.url = 'https://vancouvercivictheatres.com/events/';
    this.baseUrl = 'https://vancouvercivictheatres.com';
    
    // Venue information
    this.venue = {
      name: "Vancouver Civic Theatres",
      id: "vancouver-civic-theatres",
      address: "630 Hamilton St",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6B 5N6",
      location: {
        coordinates: [-123.1178014, 49.2813118]
      },
      websiteUrl: "https://vancouvercivictheatres.com/",
      description: "Vancouver Civic Theatres operates the city's premier performance venues, including the Queen Elizabeth Theatre, Orpheum, Vancouver Playhouse, and Annex. These venues host a variety of performances including Broadway shows, concerts, dance, opera, and more."
    };
  }

  /**
   * Main scraper function using puppeteer for JavaScript-loaded events
   */
  async scrape() {
    console.log('🔍 Starting Vancouver Civic Theatres Events scraper...');
    const events = [];
    let browser = null;

    try {
      // Launch browser with stealth settings
      browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath(),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });
      
      console.log('Navigating to Vancouver Civic Theatres events page...');
      await page.goto(this.url, { waitUntil: 'networkidle0', timeout: 60000 });
      
      console.log('Waiting for JavaScript content to load...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Scroll to trigger any lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Extract events from the dynamically loaded content
      const extractedEvents = await page.evaluate(() => {
        const events = [];
        
        // Look for event cards with various selectors
        const eventSelectors = [
          '.event-card',
          '.featured__item', 
          '.card',
          'article',
          '.grid-item',
          '.post',
          '[class*="event"]',
          '[class*="card"]'
        ];
        
        let eventElements = [];
        
        // Try each selector
        for (const selector of eventSelectors) {
          eventElements = document.querySelectorAll(selector);
          if (eventElements.length > 3) {
            console.log(`Found ${eventElements.length} events with selector: ${selector}`);
            break;
          }
        }
        
        // If no specific selectors work, look for elements with event-like characteristics
        if (eventElements.length < 3) {
          eventElements = Array.from(document.querySelectorAll('*')).filter(el => {
            const text = el.textContent || '';
            const hasImage = el.querySelector('img');
            const hasDetailsButton = text.includes('Details');
            const hasTicketsButton = text.includes('Get Tickets') || text.includes('Tickets');
            const hasDatePattern = /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{1,2}/i.test(text);
            
            return hasImage && (hasDetailsButton || hasTicketsButton) && hasDatePattern && el.children.length > 2;
          });
          console.log(`Fallback approach found ${eventElements.length} potential events`);
        }
        
        eventElements.forEach((element, index) => {
          try {
            // Extract title
            let title = '';
            const titleSelectors = ['h1', 'h2', 'h3', 'h4', '.title', '.event-title', '.name'];
            for (const sel of titleSelectors) {
              const titleEl = element.querySelector(sel);
              if (titleEl && titleEl.textContent.trim()) {
                title = titleEl.textContent.trim();
                break;
              }
            }
            
            // If no title found, extract from text content
            if (!title) {
              const lines = element.textContent.trim().split('\n').filter(line => line.trim().length > 0);
              for (const line of lines) {
                const cleanLine = line.trim();
                if (cleanLine.length > 5 && 
                    !cleanLine.toLowerCase().includes('details') && 
                    !cleanLine.toLowerCase().includes('get tickets') &&
                    !cleanLine.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)) {
                  title = cleanLine;
                  break;
                }
              }
            }
            
            if (!title || title.length < 3) return;
            
            // Skip navigation elements
            const skipWords = ['filter by', 'prev', 'next', 'search', 'menu', 'load more', 'home', 'about'];
            if (skipWords.some(word => title.toLowerCase().includes(word))) return;
            
            // Extract date
            let dateStr = '';
            const dateSelectors = ['.date', '.event-date', 'time', '.datetime'];
            for (const sel of dateSelectors) {
              const dateEl = element.querySelector(sel);
              if (dateEl && dateEl.textContent.trim()) {
                dateStr = dateEl.textContent.trim();
                break;
              }
            }
            
            // Look for date patterns in text if not found
            if (!dateStr) {
              const text = element.textContent;
              const dateMatch = text.match(/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2})(?:-(\d{1,2}))?/i);
              if (dateMatch) dateStr = dateMatch[0];
            }
            
            // Extract venue info
            let venue = '';
            const venueSelectors = ['.venue', '.location', '.theatre'];
            for (const sel of venueSelectors) {
              const venueEl = element.querySelector(sel);
              if (venueEl && venueEl.textContent.trim()) {
                venue = venueEl.textContent.trim();
                break;
              }
            }
            
            // Extract link
            let link = '';
            const linkEl = element.querySelector('a[href]');
            if (linkEl) {
              link = linkEl.href;
            }
            
            // Extract image
            let imageUrl = '';
            const imgEl = element.querySelector('img');
            if (imgEl) {
              imageUrl = imgEl.src || imgEl.getAttribute('data-src');
            }
            
            events.push({
              title: title.trim(),
              dateStr: dateStr,
              venue: venue,
              link: link,
              imageUrl: imageUrl
            });
            
          } catch (err) {
            console.log('Error processing event element:', err);
          }
        });
        
        return events;
      });
      
      console.log(`Extracted ${extractedEvents.length} raw events from page`);
      
      // Process each extracted event
      extractedEvents.forEach((rawEvent) => {
        try {
          const { title, dateStr, venue, link, imageUrl } = rawEvent;
          
          if (!title || title.length < 3) return;
          
          // Parse dates from the extracted dateStr
          let startDate, endDate;
          
          try {
            if (dateStr) {
              // Look for month abbreviations like "JUL 25", "AUG 15-20"
              const dateMatch = dateStr.match(/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2})(?:-(\d{1,2}))?/i);
              if (dateMatch) {
                const monthAbbr = dateMatch[1].toUpperCase();
                const startDay = parseInt(dateMatch[2]);
                const endDay = dateMatch[3] ? parseInt(dateMatch[3]) : startDay;
                
                const monthMap = {
                  'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3,
                  'MAY': 4, 'JUN': 5, 'JUL': 6, 'AUG': 7,
                  'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
                };
                
                const currentYear = new Date().getFullYear();
                startDate = new Date(currentYear, monthMap[monthAbbr], startDay, 19, 30);
                endDate = new Date(currentYear, monthMap[monthAbbr], endDay, 22, 0);
              } else {
                // Fallback date parsing
                const parsed = new Date(dateStr);
                if (!isNaN(parsed.getTime())) {
                  startDate = parsed;
                  endDate = new Date(parsed);
                  endDate.setHours(endDate.getHours() + 2);
                }
              }
            }
          } catch (dateError) {
            console.error(`⚠️ Error parsing date for event "${title}": ${dateError.message}`);
          }
          
          // Use fallback date if parsing failed
          if (!startDate) {
            startDate = new Date();
            startDate.setDate(startDate.getDate() + 30); // 30 days from now
            endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + 2);
          }
          
          // Create unique ID for this event
          const eventId = uuidv4();
          
          // Determine categories based on title keywords
          const categories = ['performance', 'arts'];
          
          if (title.toLowerCase().includes('concert') || title.toLowerCase().includes('music')) {
            categories.push('music');
          }
          if (title.toLowerCase().includes('dance') || title.toLowerCase().includes('ballet')) {
            categories.push('dance');
          }
          if (title.toLowerCase().includes('comedy')) {
            categories.push('comedy');
          }
          if (title.toLowerCase().includes('theatre') || title.toLowerCase().includes('play')) {
            categories.push('theatre');
          }
          
          // Construct full URL if relative
          let fullEventUrl = link;
          if (link && !link.startsWith('http')) {
            fullEventUrl = link.startsWith('/') ? 
              `https://vancouvercivictheatres.com${link}` : 
              `https://vancouvercivictheatres.com/${link}`;
          }
          
          // Create event object
          const event = {
            id: eventId,
            title: title,
            startDate: startDate,
            endDate: endDate,
            venue: this.venue,
            description: `${title} at Vancouver Civic Theatres`,
            price: 'Varies',
            categories: categories,
            tags: categories,
            imageUrl: imageUrl || '',
            officialWebsite: fullEventUrl || this.url,
            source: {
              name: this.name,
              url: this.url,
              identifier: 'vancouver-civic-theatres'
            },
            city: 'Vancouver'
          };
          
          events.push(event);
          console.log(`✅ Added event: ${title}`);
          
        } catch (error) {
          console.error(`⚠️ Error processing event: ${error.message}`);
        }
      });
      
      console.log(`🎉 Scraped ${events.length} events from Vancouver Civic Theatres`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error scraping Vancouver Civic Theatres: ${error.message}`);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

// Export an instance of the class rather than the class definition
module.exports = new VancouverCivicTheatresEvents();
