/**
 * Twelve West Scraper with Puppeteer Extra + Stealth
 *
 * This scraper extracts events from Twelve West nightclub website
 * using puppeteer-extra with stealth plugin for improved anti-bot detection resistance
 * Source: https://twelvewest.ca/collections/upcoming-events
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { executablePath } = require('puppeteer');
const fs = require('fs');
const path = require('path');

class TwelveWestEvents {
  constructor() {
    this.name = 'Twelve West Events';
    this.url = 'https://twelvewest.ca/collections/upcoming-events';
    this.baseUrl = 'https://twelvewest.ca';

    // Venue information
    this.venue = {
      name: "Twelve West",
      id: "twelve-west-vancouver",
      address: "1219 Granville St",
      city: city,
      state: "BC",
      country: "Canada",
      postalCode: "V6Z 1M6",
      coordinates: {
        lat: 49.2776,
        lng: -123.1277
      },
      websiteUrl: "https://twelvewest.ca/",
      description: "Twelve West is a premier nightclub and live music venue in downtown Vancouver, featuring top DJs and electronic music performers. The venue offers a sophisticated nightlife experience with state-of-the-art sound and lighting systems, VIP tables, and bottle service in an upscale environment."
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
    return `twelve-west-${slug}-${formattedDate}`;
  }

  /**
   * Parse date from various formats used on nightclub sites
   */
  parseDate(dateText) {
    if (!dateText) return null;

    try {
      // Common nightclub date formats
      // - "Saturday, July 25"
      // - "SAT JUL 25"
      // - "Jul 25"
      // - "07/25/2025"

      // Standardize the text
      const text = dateText.trim().replace(/\s+/g, ' ');

      // Look for day of week patterns
      const dayMapping = {
        'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday',
        'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday'
      };

      const monthMapping = {
        'jan': 'January', 'feb': 'February', 'mar': 'March', 'apr': 'April', 'may': 'May',
        'jun': 'June', 'jul': 'July', 'aug': 'August', 'sep': 'September', 'oct': 'October',
        'nov': 'November', 'dec': 'December'
      };

      // Extract day of week if present
      let dayOfWeek = '';
      for (const [short, full] of Object.entries(dayMapping)) {
        if (text.toLowerCase().includes(short)) {
          dayOfWeek = full;
          break;
        }
      }

      // Extract month and day
      let month = '';
      let day = 0;

      // Try to match "MMM DD" pattern
      const monthDayPattern = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}/i;
      const monthDayMatch = text.match(monthDayPattern);

      if (monthDayMatch) {
        const parts = monthDayMatch[0].split(/\s+/);
        const monthShort = parts[0].toLowerCase().substring(0, 3);
        month = monthMapping[monthShort] || '';
        day = parseInt(parts[1], 10);
      } else {
        // Try to match MM/DD/YYYY pattern
        const datePattern = /(\d{1,2}\/(\d{1,2}(?:\/(\d{4}?/;
        const dateMatch = text.match(datePattern);

        if (dateMatch) {
          const monthNum = parseInt(dateMatch[1], 10);
          day = parseInt(dateMatch[2], 10);
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                             'August', 'September', 'October', 'November', 'December'];
          month = monthNames[monthNum - 1] || '';
        }
      }

      if (!month || !day) return null;

      // Determine year (default to current year)
      const currentYear = new Date().getFullYear();
      const yearPattern = /\b(20\d{2}\b/;
      const yearMatch = text.match(yearPattern);
      const year = yearMatch ? parseInt(yearMatch[1], 10) : currentYear;

      // Extract time
      let hour = 22; // Default to 10:00 PM for nightclubs
      let minute = 0;

      const timePattern = /(\d{1,2}(?::(\d{2}?\s*((?:AM|PM|am|pm))/;
      const timeMatch = text.match(timePattern);

      if (timeMatch) {
        let extractedHour = parseInt(timeMatch[1], 10);
        const extractedMinute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const period = timeMatch[3].toUpperCase();

        // Convert to 24-hour format
        if (period === 'PM' && extractedHour < 12) {
          extractedHour += 12;
        } else if (period === 'AM' && extractedHour === 12) {
          extractedHour = 0;
        }

        hour = extractedHour;
        minute = extractedMinute;
      }

      // Create date object
      const date = new Date(year, this.getMonthIndex(month), day, hour, minute);

      // Check if valid
      if (isNaN(date.getTime())) {
        return null;
      }

      return date;
    } catch (error) {
      console.warn(`Error parsing date: ${error.message}`);
      return null;
    }
  }

  /**
   * Helper to convert month name to index
   */
  getMonthIndex(monthName) {
    const months = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
      'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
    };
    return months[monthName.toLowerCase()] || 0;
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
      endDate.setHours(3, 0, 0); // 3:00 AM

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
  async takeScreenshot(page, filename = 'twelve-west-debug.png') {
    try {
      const screenshotPath = path.join(process.cwd(), filename);
      await page.screenshot({ path: screenshotPath, fullPage: true };
      console.log(`✅ Saved debug screenshot to ${filename}`);
    } catch (error) {
      console.warn(`Failed to save screenshot: ${error.message}`);
    }
  }

  /**
   * Save HTML content for debugging
   */
  async saveHtml(page, filename = 'twelve-west-debug.html') {
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

    const priceRegex = /\$\d+(?:\.\d{2}?|\$\d+\+|\$\d+\s*-\s*\$\d+/g;
    const matches = text.match(priceRegex);

    if (matches && matches.length > 0) {
      return matches[0];
    }

    return null;
  }

  /**
   * Main scraper function
   */
  async scrape(city) {
    console.log('🔍 Starting Twelve West Events scraper...');
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
      };

      const page = await browser.newPage();

      // Set realistic viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 };

      // Set extra HTTP headers to appear more like a real browser
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      };

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
          };
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
        '.product-grid .product-item',
        '.collection-products .product-card',
        '.collection-listing .product',
        '.collection__products .product',
        '.collection-grid .grid-item',
        '.products-list .product',
        '.product-list .product',
        '.product-collection .product-item',
        'li.grid__item',
        '.grid-products .grid__item'
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
                              el.querySelector('.product-name')?.innerText ||
                              el.querySelector('.product-item-title')?.innerText ||
                              el.querySelector('h2')?.innerText ||
                              el.querySelector('h3')?.innerText ||
                              el.querySelector('.title')?.innerText ||
                              el.querySelector('a')?.innerText ||
                              'Unknown Event';

                // Try different ways to extract date
                let dateText = '';

                // Look for date in title first
                const titleDateRegex = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,)? \w+ \d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2}(?:\/\d{4}?/i;
                const titleDateMatch = title.match(titleDateRegex);
                if (titleDateMatch) {
                  dateText = titleDateMatch[0];
                } else {
                  dateText = el.querySelector('.date')?.innerText ||
                            el.querySelector('-date')?.innerText ||
                            el.querySelector('.product-date')?.innerText ||
                            '';
                }

                // Try different ways to extract link
                const link = el.querySelector('a')?.href ||
                            el.dataset.url ||
                            '';

                // Try different ways to extract image
                const image = el.querySelector('img')?.src ||
                             el.querySelector('.product-image')?.src ||
                             el.style.backgroundImage?.replace(/url\(['"](.+)['"]\)/, '$1') ||
                             '';

                // Try different ways to extract description
                const description = el.querySelector('.description')?.innerText ||
                                   el.querySelector('.product-description')?.innerText ||
                                   el.querySelector('.summary')?.innerText ||
                                   el.querySelector('.details')?.innerText ||
                                   '';

                // Try to extract price
                const priceText = el.querySelector('.price')?.innerText ||
                                 el.querySelector('.product-price')?.innerText ||
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
              };
            };

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
              title: link.innerText.trim(),
              link: link.href,
              image: link.querySelector('img')?.src || ''
            };
          }.filter(item =>
            item.title &&
            item.title.length > 3 &&
            !item.title.toLowerCase().includes('login') &&
            !item.title.toLowerCase().includes('sign') &&
            !item.title.toLowerCase().includes('account') &&
            !item.title.toLowerCase().includes('menu') &&
            !item.title.toLowerCase().includes('search')
          );
        };

        // Visit each event link to extract details
        if (eventLinks.length > 0) {
          console.log(`Found ${eventLinks.length} potential event links`);

          for (const eventLink of eventLinks.slice(0, 15)) { // Limit to 15 to avoid excessive scraping
            try {
              console.log(`Navigating to event page: ${eventLink.link}`);
              await page.goto(eventLink.link, { waitUntil: ['domcontentloaded', 'networkidle2'] };

              // Allow dynamic content to load
              await new Promise(r => setTimeout(r, 1500));

              // Extract event details from the page
              const eventDetails = await page.evaluate(() => {
                // Try different ways to extract title
                const title = document.querySelector('.product-title')?.innerText ||
                             document.querySelector('.product__title')?.innerText ||
                             document.querySelector('h1')?.innerText ||
                             document.title ||
                             'Unknown Event';

                // Look for date in title or description
                const dateRegex = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4}?|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,)? \w+ \d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2}(?:\/\d{4}?/i;

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
                const image = document.querySelector('.product-image img')?.src ||
                             document.querySelector('.product__image img')?.src ||
                             document.querySelector('.featured-image img')?.src ||
                             document.querySelector('meta[property="og:image"]')?.content ||
                             '';

                // Try to extract price
                const priceText = document.querySelector('.product-price')?.innerText ||
                                 document.querySelector('.price')?.innerText ||
                                 document.querySelector('.price-item--regular')?.innerText ||
                                 document.querySelector('[data-product-price]')?.innerText ||
                                 '';

                return {
                  title: title.trim(),
                  dateText: dateText.trim(),
                  description: description.trim(),
                  image,
                  link: window.location.href,
                  priceText: priceText.trim()
                };
              };

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

          // Look for date in title if not found separately
          if (!eventData.dateText) {
            const dateRegex = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4}?|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,)? \w+ \d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2}(?:\/\d{4}?/i;
            const titleDateMatch = eventData.title.match(dateRegex);
            if (titleDateMatch) {
              eventData.dateText = titleDateMatch[0];
            }
          }

          // Parse dates
          const { startDate, endDate } = this.extractDateInfo(eventData.dateText);

          // If no valid date found, use estimated dates
          const today = new Date();
          const useStartDate = startDate || new Date(today.setDate(today.getDate() + 14));
          const useEndDate = endDate || new Date(useStartDate);
          if (!endDate) {
            useEndDate.setDate(useEndDate.getDate() + 1);
            useEndDate.setHours(3, 0, 0);  // 3:00 AM
          }

          // Extract performer info from title
          let performers = [];
          const titleParts = eventData.title.split(/\s*(?:with|featuring|presents|ft\.?|feat\.?)\s*/i);
          if (titleParts.length > 1) {
            // Second part likely contains performer names
            const performerText = titleParts[1];
            performers = performerText.split(/\s*(?:and|,|&)\s*/).map(name => name.trim());
          }

          // Extract any DJ mentions
          const djRegex = /DJ\s+([A-Za-z0-9]+)/i;
          const djMatch = eventData.title.match(djRegex);
          if (djMatch && djMatch[1]) {
            performers.push(`DJ ${djMatch[1]}`);
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

          // Prepare description
          let finalDescription = eventData.description || `Join us for ${cleanTitle} at Twelve West nightclub in Vancouver.`;

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

          finalDescription += `\n\nTwelve West is a premier nightclub and live music venue in downtown Vancouver, located at 1219 Granville St. The venue offers a sophisticated nightlife experience with state-of-the-art sound and lighting systems, VIP tables, and bottle service in an upscale environment.`;

          // Create categories
          const categories = ['nightclub', 'nightlife', 'entertainment', 'music'];

          // Add event-specific categories based on title keywords
          const title = eventData.title.toLowerCase();
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

      // If no events were found, add
      if (events.length === 0) {
        console.log('No events found, adding ');

        // Create
        const  = {
          id: this.createEventId('Upcoming Events', null),
          title: 'Upcoming Events at Twelve West',
          description: 'Twelve West regularly hosts a variety of nightlife events featuring top DJs and performers from around the world. Visit our official website for the la listings, tickets, and VIP table reservations.\n\nTwelve West is a premier nightclub and live music venue in downtown Vancouver, located at 1219 Granville St. The venue offers a sophisticated nightlife experience with state-of-the-art sound and lighting systems, VIP tables, and bottle service in an upscale environment.',
          startDate: null,
          endDate: null,
          venue: this.venue,
          category: 'nightlife',
          categories: ['nightclub', 'nightlife', 'entertainment', 'music', 'dj', 'electronic music'],
          sourceURL: this.url,
          officialWebsite: this.url,
          image: null,
          ticketsRequired: true,
          lastUpdated: new Date()
        };

        events.push();
        console.log('✅ Added  for Twelve West');
      }

      console.log(`🎧 Successfully processed ${events.length} events from Twelve West`);
      return events;

    } catch (error) {
      console.error(`❌ Error in Twelve West scraper: ${error.message}`);
      return events;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = new TwelveWestEvents();

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new TwelveWestEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.TwelveWestEvents = TwelveWestEvents;