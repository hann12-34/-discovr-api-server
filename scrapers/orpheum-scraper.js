/**
 * Orpheum Theatre Scraper
 * 
 * This scraper extracts events from the Vancouver Civic Theatres website
 * for the Orpheum Theatre.
 * 
 * Website: https://vancouvercivictheatres.com/venues/orpheum/
 * Events: https://vancouvercivictheatres.com/events/
 */

const puppeteer = require('puppeteer');

// Venue information
const venue = {
  name: 'Orpheum Theatre',
  address: '601 Smithe St',
  city: 'Vancouver',
  province: 'BC',
  postalCode: 'V6B 3L4',
  coordinates: {
    latitude: 49.2803,
    longitude: -123.1207
  },
  country: 'Canada',
  phoneNumber: '604-665-3050',
  website: 'https://vancouvercivictheatres.com',
  websiteUrl: 'https://vancouvercivictheatres.com/venues/orpheum',
  capacity: 2688
};

// Default categories for Orpheum events
const defaultCategories = ['music', 'arts', 'entertainment', 'performance'];

/**
 * Main scraper function for Orpheum Theatre
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  console.log('=== STARTING ORPHEUM THEATRE SCRAPER ===');
  
  // Track environment
  const environment = process.env.NODE_ENV || 'development';
  console.log(`Environment: ${environment}`);
  
  let browser = null;
  const events = [];
  
  try {
    // Configure Puppeteer
    const puppeteerOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    };

    // Allow for custom executable path in production environments
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      console.log(`Using custom Puppeteer executable path: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
      puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    // Launch browser
    console.log('Launching browser...');
    browser = await puppeteer.launch(puppeteerOptions);
    
    // Create new page
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    
    // Set longer navigation timeouts for potentially slow websites
    page.setDefaultNavigationTimeout(60000);
    
    // Navigate to events page
    console.log('Navigating to Vancouver Civic Theatres events page...');
    await page.goto('https://vancouvercivictheatres.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait for event listings to load
    console.log('Waiting for event listings...');
    await page.waitForSelector('.event-listing', { timeout: 30000 })
      .catch(() => console.log('Event listing selector not found, trying alternate approach...'));
    
    // Give the page some time to fully load
    await page.evaluate(() => {
      return new Promise(resolve => {
        setTimeout(resolve, 2000);
      });
    });
    
    // Extract all event links for Orpheum Theatre
    console.log('Extracting events from Vancouver Civic Theatres...');
    const eventLinks = await page.evaluate(() => {
      const links = [];
      const eventElements = document.querySelectorAll('.event-listing');
      
      eventElements.forEach(eventEl => {
        // Check if this event is for Orpheum Theatre
        const venueText = eventEl.querySelector('.venue')?.textContent?.trim() || '';
        if (!venueText.toLowerCase().includes('orpheum')) {
          return; // Skip non-Orpheum events
        }
        
        const linkElement = eventEl.querySelector('a');
        const title = eventEl.querySelector('.title')?.textContent?.trim() || 'No title';
        
        if (linkElement) {
          const dateText = eventEl.querySelector('.date')?.textContent?.trim();
          const link = linkElement.href;
          const imageEl = eventEl.querySelector('img');
          const imageUrl = imageEl ? imageEl.src : null;
          
          links.push({
            title,
            dateText,
            link,
            imageUrl
          });
        }
      });
      
      return links;
    });
    
    console.log(`Found ${eventLinks.length} Orpheum event links`);
    
    // Process each event link to get detailed information
    for (let i = 0; i < eventLinks.length; i++) {
      const eventLink = eventLinks[i];
      console.log(`Processing event ${i+1}/${eventLinks.length}: ${eventLink.title}`);
      
      try {
        // Navigate to the event detail page
        await page.goto(eventLink.link, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        // Extract detailed event information
        const eventDetails = await page.evaluate(() => {
          // Get the detailed title, description, date, time, etc.
          const title = document.querySelector('h1')?.textContent?.trim() || '';
          
          // Get description from content area
          const contentArea = document.querySelector('.content-area');
          let description = '';
          if (contentArea) {
            // Extract text but avoid getting button text, etc.
            const paragraphs = contentArea.querySelectorAll('p');
            description = Array.from(paragraphs)
              .map(p => p.textContent.trim())
              .join('\\n\\n');
          }
          
          // Extract date and time info
          const dateTimeEl = document.querySelector('.date-time');
          let dateText = '';
          let timeText = '';
          
          if (dateTimeEl) {
            const dateTimeText = dateTimeEl.textContent.trim();
            // Try to split date and time
            const dateTimeMatch = dateTimeText.match(/([A-Za-z]+, [A-Za-z]+ \\d+, \\d+)(?: at )?(.+)?/);
            if (dateTimeMatch) {
              dateText = dateTimeMatch[1].trim();
              timeText = dateTimeMatch[2] ? dateTimeMatch[2].trim() : '';
            } else {
              dateText = dateTimeText;
            }
          }
          
          // Get ticket URL if available
          let ticketUrl = '';
          const ticketButton = document.querySelector('a.button:not(.secondary)');
          if (ticketButton && ticketButton.textContent.toLowerCase().includes('ticket')) {
            ticketUrl = ticketButton.href;
          }
          
          // Get main image
          const mainImage = document.querySelector('.main-image img');
          const imageUrl = mainImage ? mainImage.src : null;
          
          return {
            title,
            description,
            dateText,
            timeText,
            ticketUrl,
            imageUrl
          };
        });
        
        // Merge the data from the listing and the detail page
        const eventData = {
          ...eventLink,
          ...eventDetails
        };
        
        // Parse date and time
        let startDate = null;
        if (eventData.dateText) {
          try {
            // Try multiple date formats
            const dateStr = eventData.dateText;
            const timeStr = eventData.timeText || '19:00'; // Default to 7:00 PM if no time
            
            // Format: "Sunday, April 5, 2023"
            const dateMatch = dateStr.match(/([A-Za-z]+), ([A-Za-z]+) (\\d+), (\\d+)/);
            if (dateMatch) {
              const [_, _dayOfWeek, monthName, day, year] = dateMatch;
              
              const months = {
                'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
                'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
              };
              
              const month = months[monthName];
              
              // Parse time - could be "7:30 PM" or "19:30"
              let hour = 19; // Default 7 PM
              let minute = 0;
              
              if (timeStr) {
                if (timeStr.includes(':')) {
                  const timeParts = timeStr.split(':');
                  hour = parseInt(timeParts[0]);
                  minute = parseInt(timeParts[1]);
                  
                  // Handle AM/PM
                  if (timeStr.toLowerCase().includes('pm') && hour < 12) {
                    hour += 12;
                  }
                  if (timeStr.toLowerCase().includes('am') && hour === 12) {
                    hour = 0;
                  }
                }
              }
              
              if (month !== undefined) {
                startDate = new Date(parseInt(year), month, parseInt(day), hour, minute);
              }
            }
          } catch (error) {
            console.log(`Error parsing date: ${error.message}`);
          }
        }
        
        // Generate unique ID
        const timestamp = Date.now();
        const randomComponent = Math.random().toString(36).substring(2, 8);
        
        // Include date in the ID to allow multiple instances of the same event
        const dateString = startDate ? startDate.toISOString().split('T')[0] : '';
        const eventId = `orpheum-${dateString}-${randomComponent}`.replace(/[^a-z0-9-]/gi, '-');
        
        const event = {
          id: eventId,
          title: eventData.title,
          source: 'orpheum-theatre-scraper',
          description: eventData.description || '',
          startDate: startDate,
          venue: {
            ...venue
          },
          category: 'arts',
          categories: [...defaultCategories],
          sourceURL: eventData.link,
          ticketURL: eventData.ticketUrl || 'https://vancouvercivictheatres.com/events/',
          image: eventData.imageUrl || null,
          // Legacy field for compatibility
          location: venue.name,
          lastUpdated: new Date()
        };
        
        events.push(event);
      } catch (error) {
        console.log(`Error processing event ${eventLink.title}: ${error.message}`);
      }
    }
    
    console.log(`🎉 Successfully scraped ${events.length} events from Orpheum Theatre`);

  } catch (error) {
    console.error(`Error in Orpheum Theatre scraper: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
  
  // If no events found from the scraper, just report it
  if (events.length === 0) {
    console.log('No events found from the Orpheum Theatre website.');
  }
  
  // Output first event details for debugging
  if (events.length > 0) {
    console.log('=== ORPHEUM THEATRE SCRAPER RESULTS ===');
    console.log(`Found ${events.length} events`);
    console.log('First event details:');
    console.log(`- Title: ${events[0].title}`);
    console.log(`- ID: ${events[0].id}`);
    console.log(`- Date: ${events[0].startDate}`);
    console.log(`- Venue: ${events[0].venue.name}`);
    console.log(`- SourceURL: ${events[0].sourceURL}`);
    console.log(`And ${events.length - 1} more events...`);
    console.log('=== ORPHEUM THEATRE SCRAPER FINISHED ===');
  } else {
    console.log('No events found for Orpheum Theatre');
  }
  
  return events;
}

module.exports = {
  sourceIdentifier: 'orpheum-theatre',
  scrape
};
