/**
 * Vancouver Convention Centre Events Scraper
 * Scrapes events from Vancouver Convention Centre website (https://www.vancouverconventioncentre.com/events)
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class VancouverConventionCentreEvents {
  constructor() {
    this.name = 'Vancouver Convention Centre Events';
    this.url = 'https://www.vancouverconventioncentre.com/events';
    this.sourceIdentifier = 'vancouver-convention-centre';
    this.venue = {
      name: 'Vancouver Convention Centre',
      address: '1055 Canada Pl, Vancouver, BC V6C 0C3',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2891, lng: -123.1161 }
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'vancouver-convention-centre');
    // Create debug directory if it doesn't exist
    if (!fs.existsSync(this.debugDir)) {
      try {
        fs.mkdirSync(this.debugDir, { recursive: true });
      } catch (error) {
        console.error(`Failed to create debug directory: ${error.message}`);
      }
    }
  }

  /**
   * Scrape events from Vancouver Convention Centre website
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log('Scraping Vancouver Convention Centre Events...');
    let browser = null;
    let page = null;
    
    try {
      browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
      page = await browser.newPage();
    
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    // Set extra HTTP headers to appear more browser-like
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1'
    });
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Enable request interception to block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      // Block unnecessary resource types to improve performance and reduce detection
      if (['image', 'stylesheet', 'font', 'media', 'other'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Set higher timeout for slow sites
    await page.setDefaultNavigationTimeout(45000);
    
    // Enable request interception to block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });
    } catch (navigationError) {
      console.error(`Error setting up page: ${navigationError.message}`);
      throw navigationError; // Re-throw to be caught by the outer try-catch
    }
    
    try {
      // Don't block any resources since the site might rely on JS to load content
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Go to events page
      console.log('Navigating to events page...');
      await page.goto(this.url, { waitUntil: 'networkidle0', timeout: 60000 });
      console.log('📄 Navigated to events page');
      
      // Try accessing the JULY 2025 page directly based on the screenshot
      try {
        console.log('Attempting to navigate to July 2025 events page...');
        await page.goto('https://www.vancouverconventioncentre.com/events/2025/07', { waitUntil: 'networkidle0', timeout: 45000 });
        console.log('📅 Navigated to July 2025 events page');
      } catch (error) {
        console.error(`Error navigating to July 2025 page: ${error.message}`);
        // Fall back to main events page
        await page.goto(this.url, { waitUntil: 'networkidle0', timeout: 45000 });
      }
      
      // Take a screenshot for debugging
      const screenshotPath = path.join(this.debugDir, 'vancouver-convention-centre.png');
      await page.screenshot({ path: screenshotPath });
      console.log(`Screenshot saved as ${screenshotPath}`);
      
      // Extract events from the current page using the grid/card layout shown in the screenshot
      console.log('Attempting to extract events from page using grid layout...');
      
      // Extract events using the layout shown in the screenshot
      const gridEvents = await page.evaluate((venueInfo) => {
        const events = [];
        const processedEvents = new Set(); // Track processed events to avoid duplicates
        const currentMonthYear = document.querySelector('h1, h2')?.textContent?.trim() || 'JULY 2025';
        const monthMatch = currentMonthYear.match(/([A-Za-z]+)\s+(\d{4})/i);
        const currentMonth = monthMatch ? monthMatch[1] : 'July';
        const currentYear = monthMatch ? monthMatch[2] : '2025';
        
        console.log(`Current page month/year: ${currentMonth} ${currentYear}`);
        
        // APPROACH 1: Extract from grid cells with date info (like in the screenshot)
        const eventCells = document.querySelectorAll('.cell, .event-cell, [class*="event"], [class*="cell"]');
        console.log(`Found ${eventCells.length} potential event cells`);
        
        eventCells.forEach(cell => {
          try {
            // Extract date from the cell
            let dateRange = '';
            const dateEl = cell.querySelector('h3, h2, .date, [class*="date"]');
            if (dateEl) {
              dateRange = dateEl.textContent.trim();
            }
            
            // Look for titles - based on the screenshot, titles are in heading tags within cells
            let title = '';
            const titleEl = cell.querySelector('h4, h5, .title, [class*="title"]');
            if (titleEl) {
              title = titleEl.textContent.trim();
            }
            
            // Extract venue info
            let venue = '';
            const venueEl = cell.querySelector('.venue, [class*="venue"], [class*="location"], [class*="building"]');
            if (venueEl) {
              venue = venueEl.textContent.trim();
            }
            
            // Extract link
            let link = '';
            const linkEl = cell.querySelector('a[href*="/events/"]');
            if (linkEl) {
              link = linkEl.href;
            }
            
            // Format date text based on the pattern in screenshot (3 › 6, 24, 13 › 19, 26)
            let formattedDateText = '';
            if (dateRange) {
              // Handle range format like "3 › 6"
              if (dateRange.includes('›')) {
                const [start, end] = dateRange.split('›').map(d => d.trim());
                formattedDateText = `${start} ${currentMonth} - ${end} ${currentMonth}, ${currentYear}`;
              } else {
                // Handle single date like "24"
                formattedDateText = `${dateRange} ${currentMonth}, ${currentYear}`;
              }
            }
            
            // Only add if we have ALL required info and haven't processed this event yet
            const eventKey = `${title}-${dateRange}`;
            if (title && title.length > 3 && dateRange && formattedDateText && !processedEvents.has(eventKey)) {
              processedEvents.add(eventKey);
              events.push({
                title,
                dateText: formattedDateText,
                venue,
                link
              });
              console.log(`Found event in grid: ${title}, ${formattedDateText}`);
            } else {
              if (!title || title.length <= 3) {
                console.log(`Skipping event due to missing or invalid title: "${title}"`);
              } else if (!dateRange || !formattedDateText) {
                console.log(`Skipping event "${title}" due to missing date information`);
              }
            }
          } catch (error) {
            console.error(`Error processing event cell: ${error.message}`);
          }
        });
        
        // APPROACH 2: If grid layout didn't find events, try list layout
        if (events.length === 0) {
          console.log('Trying list layout...');
          const eventItems = document.querySelectorAll('.event-item, [class*="event-item"], .list-item, [class*="list-item"]');
          
          eventItems.forEach(item => {
            try {
              let title = '';
              let dateText = '';
              let venue = '';
              let link = '';
              
              // Extract title
              const titleEl = item.querySelector('h3, h4, .title, [class*="title"]');
              if (titleEl) {
                title = titleEl.textContent.trim();
              }
              
              // Extract date
              const dateEl = item.querySelector('.date, [class*="date"], time');
              if (dateEl) {
                dateText = dateEl.textContent.trim();
              }
              
              // Extract venue
              const venueEl = item.querySelector('.venue, [class*="venue"], [class*="location"]');
              if (venueEl) {
                venue = venueEl.textContent.trim();
              }
              
              // Extract link
              const linkEl = item.querySelector('a');
              if (linkEl) {
                link = linkEl.href;
              }
              
              // Format date if necessary
              if (!dateText.includes(currentYear)) {
                dateText = `${dateText} ${currentYear}`;
              }
              
              // Only add if we have ALL required info and haven't processed this event yet
              const eventKey = `${title}-${dateText}`;
              if (title && title.length > 3 && dateText && dateText.length > 5 && !processedEvents.has(eventKey)) {
                processedEvents.add(eventKey);
                events.push({
                  title,
                  dateText,
                  venue,
                  link
                });
                console.log(`Found event in list: ${title}, ${dateText}`);
              } else {
                if (!title || title.length <= 3) {
                  console.log(`⚠️ Skipping list event due to missing or invalid title: "${title}"`);
                } else if (!dateText || dateText.length <= 5) {
                  console.log(`⚠️ Skipping list event "${title}" due to invalid date format: "${dateText}"`);
                }
              }
            } catch (error) {
              console.error(`Error processing event item: ${error.message}`);
            }
          });
        }
        // Filter out events with invalid dates
        if (!event || !event.title) {
          console.log('Skipping event due to missing title');
          return false;
        }
        if (!event.dateText) {
          console.log(`Skipping "${event.title}" due to missing date text`);
          return false;
        }
        // Additional validation will be done in processEventDetails
        return true;
      });

      // Log validation results
      console.log(`✅ Valid events after filtering: ${validEvents.length}`);
      
      // No fallbacks - if no valid events, don't proceed with empty array
      if (validEvents.length === 0) {
        console.log('⚠️ No valid events found after filtering. Strict validation removed all events but NO fallbacks will be used.');
        return [];
      }

      // Process event details by visiting individual event pages
      console.log('🔍 Looking for event detail links...');
      const processedEvents = await this.processEventDetails(page, validEvents);

      console.log(`🎉 Successfully scraped ${processedEvents.length} events from ${this.name}`);
      return processedEvents;
    } catch (error) {
      console.error(`❌ Error scraping ${this.name}: ${error.message}`);

      // Save debug info for troubleshooting
      if (page) {
        try {
          await this._saveDebugInfo(page, 'error-scrape');
        } catch (debugError) {
          console.error(`Failed to save debug info: ${debugError.message}`);
        }
      }
      
      // No fallbacks, return empty array on error
      return [];
    } finally {
      if (browser) {
        try {
          await browser.close();
          console.log('🔒 Browser closed successfully');
        } catch (closeError) {
          console.error(`Error closing browser: ${closeError.message}`);
        }
      }
    }
  }

  async extractEvents(page) {
    return await page.evaluate((venue) => {
      const events = [];
      const processedTitles = new Set();
      const currentYear = new Date().getFullYear();

      // First get all month headers to understand the structure
      const monthHeaders = Array.from(document.querySelectorAll('h2')).filter(h => {
        const text = h.textContent.trim();
        return /^[A-Z]+ \d{4}$/.test(text); // Match patterns like "JULY 2025"
      });

      // Process each month section
      monthHeaders.forEach(monthHeader => {
        const monthText = monthHeader.textContent.trim(); // e.g., "JULY 2025"
        const year = monthText.split(' ')[1];

        // Find the next few elements which should contain event information
        let currentElement = monthHeader.nextElementSibling;

        // Walk through elements until we hit the next month header or end of relevant content
        while (currentElement) {
          // Skip navigation, footer or irrelevant sections
          if (currentElement.tagName === 'H2' && /^[A-Z]+ \d{4}$/.test(currentElement.textContent.trim())) {
            break; // Hit the next month header
          }

          // Look for event links which contain dates and event titles
          if (currentElement.tagName === 'A' && currentElement.href && currentElement.href.includes('/events/')) {
            const linkText = currentElement.textContent.trim();
            const linkUrl = currentElement.href;

            // Parse the link text to extract date and title
            // Format expected: "3Jul › 6Jul2025 International ConventionWest Building"
            // or "24Jul9th Annual Live VMO Symphony PerformanceJack Poole Plaza"

            // Extract the event title - this is the text that follows after the date part
            // Let's look for the next h2 element after this link to get the proper title
            let title = '';
            let nextElement = currentElement.nextElementSibling;
            if (nextElement && nextElement.tagName === 'H2') {
              title = nextElement.textContent.trim();
              // Skip the venue text if it exists
              nextElement = nextElement.nextElementSibling;
              const venueText = nextElement && nextElement.textContent.trim();
            }

            // If we couldn't find a title from the next h2, try to extract it from the link text
            if (!title) {
              // Try to extract title by removing date patterns
              const datePatterns = [
                /\d{1,2}[A-Za-z]{3}\s*›\s*\d{1,2}[A-Za-z]{3}/g, // Matches "3Jul › 6Jul"
                /\d{1,2}[A-Za-z]{3}/g // Matches "24Jul"
              ];

              let remainingText = linkText;
              datePatterns.forEach(pattern => {
                remainingText = remainingText.replace(pattern, '');
              });

              // The remaining text should be the event title
              title = remainingText.trim();

              // If the title contains venue text at the end (like "West Building"), try to remove it
              const venueKeywords = ['Building', 'Plaza', 'Hall', 'Theatre', 'Room'];
              for (const keyword of venueKeywords) {
                if (title.endsWith(keyword)) {
                  const parts = title.split(keyword);
                  title = parts[0].trim();
                  break;
                }
              }
            }

            // Skip if we couldn't determine a title or if we've already processed this title
            if (!title || processedTitles.has(title)) {
              currentElement = currentElement.nextElementSibling;
              continue;
            }

            // Extract dates
            let startDate = null;
            let endDate = null;
            let dateText = '';

            // Try to find date patterns in the link text
            // Pattern 1: "3Jul › 6Jul" (range)
            const rangePattern = /(\d{1,2})([A-Za-z]{3})\s*›\s*(\d{1,2})([A-Za-z]{3})/;
            const rangeMatch = linkText.match(rangePattern);

            if (rangeMatch) {
              const startDay = rangeMatch[1];
              const startMonth = rangeMatch[2];
              const endDay = rangeMatch[3];
              const endMonth = rangeMatch[4];

              startDate = new Date(`${startDay} ${startMonth} ${year}`);
              endDate = new Date(`${endDay} ${endMonth} ${year}`);
              
              // Strict validation - no fallbacks for invalid dates
              if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.log(`⚠️ Invalid date range format: ${startDay} ${startMonth} - ${endDay} ${endMonth}, ${year}`);
                startDate = null;
                endDate = null;
              } else {
                dateText = `${startDay} ${startMonth} - ${endDay} ${endMonth}, ${year}`;
              }
            } else {
              // Pattern 2: "24Jul" (single day)
              const singlePattern = /(\d{1,2})([A-Za-z]{3})/;
              const singleMatch = linkText.match(singlePattern);

              if (singleMatch) {
                const day = singleMatch[1];
                const month = singleMatch[2];

                startDate = new Date(`${day} ${month} ${year}`);
                // Strict validation - no fallbacks for invalid dates
                if (isNaN(startDate.getTime())) {
                  console.log(`⚠️ Invalid date format: ${day} ${month} ${year}`);
                  startDate = null;
                  endDate = null;
                } else {
                  endDate = new Date(startDate);
                  dateText = `${day} ${month}, ${year}`;
                }
              }
            }

            // Skip if we couldn't determine dates
            if (!startDate || !endDate) {
              currentElement = currentElement.nextElementSibling;
              continue;
            }

            // Extract venue location
            let location = venue.name;
            let venueElement = nextElement;
            if (venueElement && !venueElement.tagName.startsWith('H')) {
              const possibleVenue = venueElement.textContent.trim();
              if (possibleVenue && possibleVenue.length < 30) { // Venue text should be short
                location = `${venue.name} - ${possibleVenue}`;
              }
            }

            // Generate a unique event ID
            const eventId = venue.sourceIdentifier + '-' + slugify(title, { lower: true, strict: true }) + '-' + startDate.getTime();

            // Only create and add events with valid dates and title
            if (startDate && endDate && !isNaN(startDate) && !isNaN(endDate) && title && title.length > 3) {
              // Create event object
              const event = {
                id: eventId,
                title: title,
                description: `${title} at ${location}`,
                startDate: startDate,
                endDate: endDate,
                dateText: dateText,
                image: '', // Will be filled in by processEventDetails if available
                link: linkUrl,
                venue: {
                  ...venue,
                  name: location
                },
                categories: this.determineCategories(title),
                sourceIdentifier: venue.sourceIdentifier,
                lastUpdated: new Date()
              };
              
              events.push(event);
              console.log(`✅ Added event: "${title}" with dates ${dateText}`);
            } else {
              console.log(`⚠️ Skipping event with invalid data: Title: "${title}", Has valid dates: ${!!(startDate && endDate && !isNaN(startDate) && !isNaN(endDate))}`);
            }
            processedTitles.add(title);
          }

          // Move to the next element
          currentElement = currentElement.nextElementSibling;
        }
      });

      return events;
    }, this.venue);
  }

  async processEventDetails(page, events) {
    const enhancedEvents = [];
    let successCount = 0;
    let errorCount = 0;

    // If no events, log the issue but don't use fallback data
    if (!events || events.length === 0) {
      console.log('⚠️ No events found to process details');
    }

    console.log('🔍 Looking for event detail links...');

    // Try to visit individual event detail pages to enrich events
    for (const event of events) {
      try {
        // Skip if there's no link
        if (!event.link) {
          enhancedEvents.push(event);
          continue;
        }

        console.log(`🔍 Visiting event detail page for: ${event.title}`);
        await page.goto(event.link, { waitUntil: 'networkidle2', timeout: 30000 });

        // Try to extract a better description or image
        const enrichedData = await page.evaluate(() => {
          let description = '';
          let image = '';
          let dateText = '';

          // Look for description in paragraphs
          document.querySelectorAll('p').forEach(p => {
            const text = p.textContent.trim();
            if (text.length > 50 && (!description || text.length > description.length)) {
              description = text;
            }
          });

          // Look for images
          document.querySelectorAll('img').forEach(img => {
            if (img.src && img.src.includes('/events/') && !image) {
              image = img.src;
            } else if (img.src && img.width > 300 && img.height > 200 && !image) {
              // Use a secondary image selection criteria if no event-specific image found
              image = img.src;
            }
          });

          // Look for date information
          document.querySelectorAll('.date, time, [class*="date"], span, p').forEach(el => {
            const text = el.textContent.trim();
            if (text.match(/\d{1,2}\s+[A-Za-z]+\s+\d{4}/) && text.length < 100 && !dateText) {
              dateText = text;
            }
          });

          return { description, image, dateText };
        });

        // Update event with enriched data if available - require minimum description length
        if (enrichedData.description && enrichedData.description.length > 30) {
          event.description = enrichedData.description;
        } else if (!event.description || event.description.length < 30) {
          console.log(`⚠️ Skipping event "${event.title}" due to insufficient description`);
          continue; // Skip this event
        }
        
        // Only include events with images
        if (enrichedData.image && enrichedData.image.startsWith('http')) {
          event.image = enrichedData.image;
        } else {
          console.log(`ℹ️ Event "${event.title}" has no valid image`);
          // We'll still include events without images
        }

        // Parse more detailed date if found, with strict validation
        if (enrichedData.dateText && (!event.startDate || isNaN(event.startDate))) {
          const parsedDates = this.parseDateFromString(enrichedData.dateText);
          if (parsedDates.startDate && !isNaN(parsedDates.startDate)) {
            event.startDate = parsedDates.startDate;
            event.endDate = parsedDates.endDate && !isNaN(parsedDates.endDate) ? parsedDates.endDate : parsedDates.startDate;
          } else {
            console.log(`⚠️ Skipping event "${event.title}" due to unparseable date: "${enrichedData.dateText}"`);
            continue; // Skip this event due to invalid date
          }
        }
        enhancedEvents.push(event);
        successCount++;
      } catch (error) {
        console.error(`❌ Error processing details for ${event.title}: ${error.message}`);
        
        // Save debug info when errors occur
        try {
          await this._saveDebugInfo(page, `event-error-${slugify(event.title)}`);
        } catch (debugError) {
          console.error(`Failed to save debug info: ${debugError.message}`);
        }
        
        // Skip events with errors rather than using potentially incomplete data
        console.log(`⚠️ Skipping event "${event.title}" due to processing error`);
        errorCount++;
      }
    }

    console.log(`✅ Successfully processed details for ${successCount} events`);
    console.log(`⚠️ Failed to process details for ${errorCount} events`);
    
    const skippedCount = events.length - enhancedEvents.length;
    console.log(`📊 Event processing stats: Total: ${events.length}, Success: ${successCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`);
    
    // No fallbacks - if no events were successfully processed, return empty array
    if (enhancedEvents.length === 0) {
      console.log('⚠️ No events were successfully processed. All events were skipped or errored. NO fallbacks will be used.');
    }

    return enhancedEvents;
  }

  /**
   * Save comprehensive debug information and metadata for troubleshooting
   * @param {Page} page - Puppeteer page object
   * @param {string} prefix - Prefix for debug file names
   * @returns {Promise<void>}
   * @private
   */
  async _saveDebugInfo(page, prefix = 'debug') {
    try {
      // Save screenshot
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = path.join(this.debugDir, `${prefix}-${timestamp}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Debug screenshot saved to: ${screenshotPath}`);

      // Save HTML content
      const htmlPath = path.join(this.debugDir, `${prefix}-${timestamp}.html`);
      const htmlContent = await page.content();
      fs.writeFileSync(htmlPath, htmlContent);
      console.log(`🔍 Debug HTML saved to: ${htmlPath}`);

      // Save request logs
      const requestLogPath = path.join(this.debugDir, `${prefix}-${timestamp}-requests.log`);
      const requestLogs = await page.evaluate(() => {
        return window.performance.getEntriesByType('resource').map(entry => {
          return `${entry.name} ${entry.initiatorType} ${entry.duration}ms`;
        });
      });
      fs.writeFileSync(requestLogPath, requestLogs.join('\n'));
      console.log(`📊 Debug request logs saved to: ${requestLogPath}`);
      
      // Save page metrics
      const metricsPath = path.join(this.debugDir, `${prefix}-${timestamp}-metrics.json`);
      const metrics = await page.metrics();
      fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
      console.log(`📈 Debug metrics saved to: ${metricsPath}`);
    } catch (error) {
      console.error(`Failed to save debug info: ${error.message}`);
    }
  }

  parseDateFromString(dateString) {
    if (!dateString) return {};

    const currentYear = new Date().getFullYear();
    let startDate = null;
    let endDate = null;

    try {
      // Try different date patterns
      // Pattern 1: "July 3-6, 2025" or "July 3-6 2025"
      const pattern1 = /(\w+)\s+(\d{1,2})(?:\s*-\s*)(\d{1,2})(?:,\s*|\s+)(\d{4})/i;
      const match1 = dateString.match(pattern1);
      if (match1) {
        const month = match1[1];
        const startDay = parseInt(match1[2], 10);
        const endDay = parseInt(match1[3], 10);
        const year = parseInt(match1[4], 10);

        startDate = new Date(`${month} ${startDay}, ${year}`);
        endDate = new Date(`${month} ${endDay}, ${year}`);
        return { startDate, endDate };
      }

      // Pattern 2: "3-6 July 2025" or "3-6 July, 2025"
      const pattern2 = /(\d{1,2})(?:\s*-\s*)(\d{1,2})\s+(\w+)(?:,\s*|\s+)(\d{4})/i;
      const match2 = dateString.match(pattern2);
      if (match2) {
        const startDay = parseInt(match2[1], 10);
        const endDay = parseInt(match2[2], 10);
        const month = match2[3];
        const year = parseInt(match2[4], 10);

        startDate = new Date(`${month} ${startDay}, ${year}`);
        endDate = new Date(`${month} ${endDay}, ${year}`);
        return { startDate, endDate };
      }

      // Pattern 3: "July 3, 2025" (single day event)
      const pattern3 = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*|\s+)(\d{4})/i;
      const match3 = dateString.match(pattern3);
      if (match3) {
        const month = match3[1];
        const day = parseInt(match3[2], 10);
        const year = parseInt(match3[3], 10);

        startDate = new Date(`${month} ${day}, ${year}`);
        endDate = startDate;
        return { startDate, endDate };
      }

      // Pattern 4: "3 Jul" or "3 Jul 2025" (with or without year)
      const pattern4 = /(\d{1,2})\s+([A-Za-z]{3})(?:\s+(\d{4}))?/i;
      const match4 = dateString.match(pattern4);
      if (match4) {
        const day = parseInt(match4[1], 10);
        const month = match4[2];
        const year = match4[3] ? parseInt(match4[3], 10) : currentYear;

        startDate = new Date(`${month} ${day}, ${year}`);
        endDate = startDate;
        return { startDate, endDate };
      }

      // No fallback date parsing - if we couldn't parse with specific formats, return null values
      console.log(`Could not parse date string "${dateString}" with any of the supported patterns`);
      return { startDate: null, endDate: null };
    } catch (error) {
      console.error(`Error parsing date string "${dateString}": ${error.message}`);
      return { startDate: null, endDate: null };
    }
    // No additional return needed as all code paths above already return
  }

  
  /**
   * Determine event categories based on event title and description
   * @param {string} title - Event title
   * @returns {Array} Array of category strings
   */
  determineCategories(title) {
    const categories = ['Conference', 'Event'];
    const lowercaseTitle = title.toLowerCase();
    
    // Conference types
    if (lowercaseTitle.includes('conference') || lowercaseTitle.includes('convention')) {
      categories.push('Business');
    }
    
    // Entertainment/Performance
    if (lowercaseTitle.includes('performance') || lowercaseTitle.includes('symphony') || 
        lowercaseTitle.includes('concert') || lowercaseTitle.includes('music')) {
      categories.push('Entertainment');
      categories.push('Performance');
    }
    
    // Educational
    if (lowercaseTitle.includes('lecture') || lowercaseTitle.includes('seminar') || 
        lowercaseTitle.includes('workshop') || lowercaseTitle.includes('education')) {
      categories.push('Educational');
    }
    
    // Exhibition
    if (lowercaseTitle.includes('exhibition') || lowercaseTitle.includes('showcase') || 
        lowercaseTitle.includes('expo') || lowercaseTitle.includes('fair')) {
      categories.push('Exhibition');
    }
    
    // Community
    if (lowercaseTitle.includes('community') || lowercaseTitle.includes('festival') || 
        lowercaseTitle.includes('celebration')) {
      categories.push('Community');
      categories.push('Festival');
    }
    
    // Technology
    if (lowercaseTitle.includes('tech') || lowercaseTitle.includes('technology') || 
        lowercaseTitle.includes('machine learning') || lowercaseTitle.includes('ai') || 
        lowercaseTitle.includes('digital')) {
      categories.push('Technology');
    }
    
    // Science
    if (lowercaseTitle.includes('science') || lowercaseTitle.includes('research') || 
        lowercaseTitle.includes('academic')) {
      categories.push('Science');
    }
    
    // Health
    if (lowercaseTitle.includes('health') || lowercaseTitle.includes('medical') || 
        lowercaseTitle.includes('wellness')) {
      categories.push('Health');
    }
    
    // Food and Drink
    if (lowercaseTitle.includes('food') || lowercaseTitle.includes('culinary') || 
        lowercaseTitle.includes('wine') || lowercaseTitle.includes('tasting')) {
      categories.push('Food and Drink');
    }
    
    return categories;
  }
  
  /**
   * Normalize a title for comparison (to avoid duplicates with slight variations)
   * @param {string} title - Raw title
   * @returns {string} Normalized title
   */
  normalizeTitle(title) {
    if (!title) return '';
    
    // Convert to lowercase
    let normalized = title.toLowerCase();
    
    // Remove special characters and extra spaces
    normalized = normalized.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Remove common words that don't add meaning
    const commonWords = ['the', 'and', 'at', 'in', 'on', 'of', 'for', 'a', 'an', 'with'];
    let words = normalized.split(' ');
    words = words.filter(word => !commonWords.includes(word));
    
    return words.join(' ');
  }
}

module.exports = VancouverConventionCentreEvents;
