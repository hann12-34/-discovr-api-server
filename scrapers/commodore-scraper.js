const puppeteer = require('puppeteer');

async function scrapeCommodore() {
  console.log('🔍 Starting Commodore Ballroom scraper using Puppeteer...');
  console.log(`🕒 Current date/time: ${new Date().toISOString()}`);
  const events = [];
  let browser;
  
  try {
    console.log('🌐 Launching headless browser with production-compatible settings...');
    
    // Enhanced launch options for compatibility with cloud environments
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--mute-audio',
        '--no-zygote',
        '--no-first-run',
        '--window-size=1920,1080'
      ],
      ignoreHTTPSErrors: true
    };
    
    // Log that we're using enhanced options
    console.log('Using enhanced browser launch options for production compatibility');
    
    browser = await puppeteer.launch(launchOptions);
    
    const page = await browser.newPage();
    
    // Set user agent to avoid being blocked
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to the Commodore Ballroom events page
    console.log('🌐 Navigating to Commodore Ballroom website...');
    await page.goto('https://www.commodoreballroom.com/shows', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait for the events to load
    console.log('⏳ Waiting for events to load on the page...');
    // Try multiple possible selectors with longer timeout
    try {
      await page.waitForSelector(
        'a[href*="/events/"], div[class*="event"], article[class*="event"], div[class*="card"], a[href*="/show/"], div.events-list',
        { timeout: 45000 }
      );
    } catch (waitError) {
      console.log('⚠️ Timeout waiting for event elements, trying to proceed anyway...');
    }
    
    // Allow more time for dynamic content to load
    console.log('⏳ Giving additional time for JavaScript to execute...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Scroll to ensure lazy-loaded content appears
    console.log('📜 Scrolling page to load all content...');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
      return new Promise(resolve => setTimeout(resolve, 1000));
    });
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
      return new Promise(resolve => setTimeout(resolve, 1000));
    });
    
    // Wait a bit more after scrolling
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract events data
    console.log('🔍 Extracting event data from the page...');
    
    // Extract the events data directly from the page
    
    // Get all event data using page evaluation
    const extractedEvents = await page.evaluate(() => {
      // Target the card elements that contain event information
      const allCards = Array.from(document.querySelectorAll('div[class*="card"]'));
      
      return allCards.map(card => {
        // Get all links in the card - the second link typically contains the event name
        const links = Array.from(card.querySelectorAll('a'));
        let link = null;
        let name = null;
        
        // Extract event name from the second link if available (contains the full event name)
        if (links.length > 1) {
          name = links[1].textContent.trim();
          link = links[1].getAttribute('href');
        } else if (links.length === 1) {
          // Fallback to first link if only one is available
          name = links[0].textContent.trim();
          link = links[0].getAttribute('href');
        }
        
        // Skip "Buy Tickets" or "More Info" as names
        if (name === 'Buy Tickets' || name === 'More Info') {
          // Look for other text content that might be the event name
          const allText = card.textContent.trim();
          const lines = allText.split(/\n|\r/).map(line => line.trim()).filter(line => line);
          
          // The first substantial line is often the event name
          if (lines.length > 0 && lines[0].length > 3 && 
              !['Buy Tickets', 'More Info'].includes(lines[0])) {
            name = lines[0];
          }
        }
        
        // Extract date from text content
        const allText = card.textContent.trim();
        
        // Look for standard date patterns (Month Day, Year or Month Day)
        const monthDayPattern = /([A-Za-z]{3,})\s+(\d{1,2})(?:st|nd|rd|th)?(?:[,\s]+([0-9]{4}))?/;
        const dateMatch = allText.match(monthDayPattern);
        
        let dateText = null;
        if (dateMatch) {
          dateText = dateMatch[0];
          // If year is missing, add the current year for context
          if (!dateMatch[3]) {
            const currentYear = new Date().getFullYear();
            dateText += `, ${currentYear}`;
          }
        }
        
        // Extract description if available
        const paragraphs = Array.from(card.querySelectorAll('p'));
        let description = null;
        if (paragraphs.length > 0) {
          description = paragraphs[0].textContent.trim();
          if (description === name) description = null; // Don't duplicate name as description
        }
        
        // Extract price if available (rarely present on cards)
        const priceMatch = allText.match(/\$\d+(?:\.\d{2})?/);
        const price = priceMatch ? priceMatch[0] : null;
        
        return { name, dateText, link, description, price };
      }).filter(item => item.name && item.name !== 'Buy Tickets' && item.name !== 'More Info');
    });
    
    console.log(`📊 Found ${extractedEvents.length} potential events on the page`);
    
    // Process the extracted data and track seen events to avoid duplicates
    const seenUrls = new Set();
    
    for (const item of extractedEvents) {
      try {
        // Skip events without a name
        if (!item.name) {
          console.log('⚠️ Event without a name, skipping');
          continue;
        }

        // Skip events without a link
        if (!item.link) {
          console.log(`⚠️ No link for event "${item.name}", skipping`);
          continue;
        }
        
        // Format URL - only use if we have a real link
        const sourceUrl = item.link.startsWith('http') ? 
          item.link : `https://www.commodoreballroom.com${item.link}`;
          
        // Skip duplicate events (same URL)
        if (seenUrls.has(sourceUrl)) {
          console.log(`♻️ Skipping duplicate event: "${item.name}"`);
          continue;
        }
        seenUrls.add(sourceUrl);
        
        // Parse date - but only proceed if we have a valid date
        let startDate = null;
        if (item.dateText) {
          try {
            // First try direct parsing
            startDate = new Date(item.dateText);
            
            // If that fails, try various date formats
            if (isNaN(startDate.getTime())) {
              // Try patterns like "Jun 15", "June 15", "Monday, June 15, 2024"
              let dateMatch = item.dateText.match(/([A-Za-z]{3,})\s+(\d{1,2})(?:st|nd|rd|th)?(?:[,\s]+([0-9]{4}))?/);
              if (dateMatch) {
                const month = dateMatch[1];
                const day = dateMatch[2];
                const year = dateMatch[3] || new Date().getFullYear();
                startDate = new Date(`${month} ${day}, ${year}`);
              } else {
                // Try other common patterns like MM/DD/YYYY or YYYY-MM-DD
                dateMatch = item.dateText.match(/(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/);
                if (dateMatch) {
                  // Assume MM/DD format if no specific indication
                  const month = parseInt(dateMatch[1]) - 1; // 0-indexed months
                  const day = parseInt(dateMatch[2]);
                  const year = dateMatch[3] ? 
                    (parseInt(dateMatch[3]) < 100 ? 2000 + parseInt(dateMatch[3]) : parseInt(dateMatch[3])) : 
                    new Date().getFullYear();
                  startDate = new Date(year, month, day);
                }
              }
            }
            
            // Special case: Some events have tour years in their title
            if (isNaN(startDate?.getTime()) && item.name) {
              // Try to extract date from the event name for events like "Wolf Alice North American Tour 2025"
              const tourYearMatch = item.name.match(/Tour\s+(20\d{2})/);
              if (tourYearMatch) {
                // Since we know the year but not the exact date, use the first day of the next month
                const year = parseInt(tourYearMatch[1]);
                const now = new Date();
                const nextMonth = (now.getMonth() + 1) % 12;
                startDate = new Date(year, nextMonth, 1);
                console.log(`📅 Using approximate date for tour: ${item.name} -> ${startDate.toDateString()}`);
              }
            }
            
            // If the date is in the past, adjust to next year (for recurring events)
            if (!isNaN(startDate?.getTime()) && startDate < new Date()) {
              startDate.setFullYear(startDate.getFullYear() + 1);
            }
          } catch (e) {
            console.log(`⚠️ Error parsing date "${item.dateText}": ${e.message}`);
            continue;
          }
        } else {
          // Try to extract date from event name if no explicit date is found
          if (item.name && item.name.match(/(20\d{2})/) && !item.name.includes('Tour')) {
            const yearMatch = item.name.match(/(20\d{2})/);
            if (yearMatch) {
              // Use first day of next month as approximate date
              const year = parseInt(yearMatch[1]);
              const now = new Date();
              const nextMonth = (now.getMonth() + 1) % 12;
              startDate = new Date(year, nextMonth, 1);
              console.log(`📅 Using approximate date from title: ${item.name} -> ${startDate.toDateString()}`);
            }
          } else {
            // Skip event if no date can be determined
            console.log(`⚠️ No date provided for event "${item.name}", skipping`);
            continue;
          }
        }
        
        // Skip if we couldn't parse the date
        if (isNaN(startDate?.getTime())) {
          console.log(`⚠️ Invalid date for event "${item.name}": "${item.dateText || 'No date text'}", skipping`);
          continue;
        }
        
        // Create event object that matches the Event schema with timestamp for uniqueness
        const timestamp = Date.now();
        // Generate a truly unique ID that won't collide with existing events
        const randomComponent = Math.random().toString(36).substring(2, 10);
        const eventId = `commodore-${timestamp}-${randomComponent}`.replace(/[^a-z0-9-]/gi, '-');
        console.log(`Creating event with ID: ${eventId}`);
        
        const event = {
          id: eventId,
          title: item.name,
          // Add explicit source marker for deduplication
          source: 'commodore-ballroom-scraper',
          description: item.description || '',
          startDate: startDate,
          venue: {
            name: 'Commodore Ballroom',
            address: '868 Granville St, Vancouver, BC V6Z 1K3',
            city: 'Vancouver',
            state: 'BC',
            country: 'Canada',
            coordinates: {
              lat: 49.2812,
              lng: -123.1222
            }
          },
          category: 'music',
          categories: ['music', 'concert', 'live'],
          sourceURL: sourceUrl,
          ticketURL: sourceUrl, // Same as source URL since it links to ticket page
          location: 'Vancouver, BC', // Legacy field
          lastUpdated: new Date()
        };
        
        // Add price as additional data if available
        if (item.price) {
          event.price = item.price;
        }
        
        events.push(event);
      } catch (itemError) {
        console.error(`❌ Error processing event: ${itemError.message}`);
      }
    }
    
    console.log(`🎉 Successfully scraped ${events.length} events from Commodore Ballroom`);
    return events;
    
  } catch (error) {
    console.error(`❌ Error in Commodore scraper: ${error.message}`);
    return events; 
  } finally {
    // Make sure to close the browser
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

// Define sourceIdentifier for the ScraperCoordinator
const sourceIdentifier = 'commodore-scraper';

/**
 * Main scrape method to match ScraperCoordinator interface
 * @param {Object} options - Options passed from ScraperCoordinator
 * @returns {Promise<Array>} Array of events
 */
async function scrape(options = {}) {
  try {
    console.log('=== STARTING COMMODORE BALLROOM SCRAPER ===');
    console.log(`Running in environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Current platform: ${process.platform}`);
    console.log(`Puppeteer version: ${require('puppeteer/package.json').version}`);
    console.log(`Render environment: ${process.env.IS_RENDER || 'Not running on Render'}`);
    
    // Add additional options for headless browser in production
    if (process.env.NODE_ENV === 'production' || process.env.IS_RENDER) {
      console.log('Setting production-specific Puppeteer options');
      process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
    }
    
    // Check for Chrome executable in common locations
    console.log('Checking for Chrome executable...');
    try {
      const { execSync } = require('child_process');
      const chromeVersionCmd = process.platform === 'darwin'
        ? 'ls -la /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome || echo "not found"'
        : 'which google-chrome || echo "not found"';
      
      const chromeVersion = execSync(chromeVersionCmd).toString().trim();
      console.log(`Chrome executable: ${chromeVersion}`);
    } catch (e) {
      console.log('Error checking Chrome version:', e.message);
    }
    
    // Main scraping
    console.log('Starting main scrape function...');
    let events = [];
    
    try {
      events = await scrapeCommodore();
    } catch (scrapeError) {
      console.error('Error during scrapeCommodore():', scrapeError);
      console.error('Stack:', scrapeError.stack);
      
      // Even if scraping fails, return an empty array rather than failing
      events = [];
    }
    
    console.log('=== COMMODORE SCRAPER RESULTS ===');
    console.log(`Found ${events.length} events`);
    
    // Format validation and cleanup
    const validEvents = events.filter(event => {
      // Ensure event has all required fields
      if (!event.id || !event.title || !event.startDate || !event.venue || !event.venue.name) {
        console.log(`⚠️ Skipping event with missing required fields: ${event.title || 'Unknown'}`);
        return false;
      }
      return true;
    });
    
    console.log(`After validation: ${validEvents.length} valid events`);
    
    // Log detailed info for the first few events
    if (validEvents.length > 0) {
      console.log('First event details:');
      console.log('- Title:', validEvents[0].title);
      console.log('- ID:', validEvents[0].id);
      console.log('- Date:', validEvents[0].startDate);
      console.log('- Venue:', validEvents[0].venue.name);
      console.log('- SourceURL:', validEvents[0].sourceURL);
      
      if (validEvents.length > 1) {
        console.log(`And ${validEvents.length - 1} more events...`);
      }
    } else {
      console.log('⚠️ WARNING: No valid Commodore events were found');
    }
    
    console.log('=== COMMODORE BALLROOM SCRAPER FINISHED ===');
    
    return validEvents;
  } catch (error) {
    console.error('CRITICAL ERROR IN COMMODORE BALLROOM SCRAPER:', error);
    console.error('Error stack:', error.stack);
    return [];
  }
}

module.exports = {
  scrapeCommodore,
  scrape,
  sourceIdentifier
};
