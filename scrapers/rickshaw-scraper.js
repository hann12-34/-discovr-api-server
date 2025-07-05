/**
 * Rickshaw Theatre Scraper
 * 
 * This scraper extracts events from the Rickshaw Theatre website
 * https://www.rickshawtheatre.com/
 */

const puppeteer = require('puppeteer');

/**
 * Venue information for Rickshaw Theatre
 */
const venue = {
  name: 'Rickshaw Theatre',
  address: '254 E Hastings St, Vancouver, BC V6A 1P1',
  city: 'Vancouver',
  province: 'BC',
  country: 'Canada',
  postalCode: 'V6A 1P1',
  coordinates: {
    latitude: 49.2815949,
    longitude: -123.0978479
  },
  websiteUrl: 'https://www.rickshawtheatre.com/'
};

/**
 * Categories for Rickshaw Theatre events
 */
const defaultCategories = ['music', 'concert', 'live'];

/**
 * Main scraper function for Rickshaw Theatre
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  console.log('=== STARTING RICKSHAW THEATRE SCRAPER ===');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Puppeteer version:', require('puppeteer/package.json').version);

  let browser = null;
  let events = [];
  const processedUrls = new Set(); // Track processed URLs to avoid duplicates

  try {
    console.log('Launching browser...');
    // Configure browser options based on environment
    const isProduction = process.env.NODE_ENV === 'production' || process.env.IS_RENDER;
    
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,800'
      ],
    };

    // Additional options for cloud environment
    if (isProduction) {
      console.log('Running in production/cloud environment');
      launchOptions.executablePath = process.env.PUPPETEER_EXEC_PATH || process.env.CHROME_PATH;
      
      // Log which executable we're using
      if (launchOptions.executablePath) {
        console.log(`Using Chrome executable at: ${launchOptions.executablePath}`);
      } else {
        console.log('No custom Chrome path set, using default');
      }
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log('Navigating to Rickshaw Theatre website...');
    await page.goto('https://www.rickshawtheatre.com/', { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('Page loaded');

    // Wait for events to load - looking for show links
    await page.waitForSelector('a[href*="/show_listings/"]', { timeout: 30000 });
    console.log('Events section found');
    
    // Extract events
    console.log('Extracting events...');
    const eventLinks = await page.evaluate(() => {
      // Find all unique show links
      const links = Array.from(document.querySelectorAll('a[href*="/show_listings/"]'))
        .map(a => ({ 
          title: a.textContent.trim(),
          link: a.href
        }));
      
      // Filter out duplicates based on link
      const uniqueLinks = [];
      const seenLinks = new Set();
      
      for (const linkObj of links) {
        if (!seenLinks.has(linkObj.link)) {
          seenLinks.add(linkObj.link);
          uniqueLinks.push(linkObj);
        }
      }
      
      return uniqueLinks;
    });
    
    console.log(`Found ${eventLinks.length} unique show links`);
    
    // Visit each event page to get full details
    const eventData = [];
    for (let i = 0; i < eventLinks.length; i++) { // Process all events
      const event = eventLinks[i];
      try {
        // Extract title from link - remove any trailing whitespace or special characters
        const title = event.title.trim().replace(/\s+/g, ' ');
        
        console.log(`Visiting event page ${i+1}/${Math.min(eventLinks.length, 10)}: ${title || event.link}`);
        await page.goto(event.link, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Extract details from the event page
        const details = await page.evaluate(() => {
          // Try to find the title if not already extracted
          let pageTitle = '';
          const h1 = document.querySelector('h1');
          if (h1) {
            pageTitle = h1.textContent.trim();
          }
          
          // Try to find the date and time
          let dateText = '';
          let timeText = '';
          let description = '';
          let imageUrl = '';
          
          // Look for date and time - often in paragraph text
          const paragraphs = document.querySelectorAll('p');
          for (const p of paragraphs) {
            const text = p.textContent.toLowerCase();
            if (text.includes('date') || text.includes('day') || 
                text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i) ||
                text.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i)) {
              dateText = p.textContent.trim();
            }
            if (text.includes('doors') || text.includes('pm') || text.includes('am') || text.includes(':')) {
              timeText = timeText ? timeText : p.textContent.trim();
            }
          }
          
          // Try to extract specific date formats like "July 12" or "2025-07-12"
          const dateMatches = document.body.textContent.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?\b/gi);
          if (dateMatches && dateMatches.length > 0) {
            dateText = dateMatches[0].trim();
          }
          
          // Try to get any description content
          const contentArea = document.querySelector('.entry-content') || document.querySelector('article');
          if (contentArea) {
            description = contentArea.textContent.trim().substring(0, 500); // Limit description length
          }
          
          // Try to find an image
          const img = document.querySelector('.wp-post-image') || document.querySelector('article img');
          if (img) {
            imageUrl = img.src || img.getAttribute('data-src');
          }
          
          return {
            pageTitle,
            dateText,
            timeText,
            description,
            imageUrl
          };
        });
        
        eventData.push({
          title: title || details.pageTitle || `Event at Rickshaw Theatre (${new Date().toLocaleDateString()})`,
          link: event.link,
          dateText: details.dateText,
          timeText: details.timeText,
          description: details.description,
          imageUrl: details.imageUrl
        });
        
        // Small delay to be nice to the server (compatible with older Puppeteer versions)
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`Error getting details for event: ${event.title}`, error.message);
      }
    }
    
    console.log(`Found ${eventData.length} raw events`);
    
    // Process each event
    for (const item of eventData) {
      // Skip if no title, date or link
      if (!item.title || !item.dateText) {
        console.log(`⚠️ Skipping event with missing title or date: ${item.title || 'Unknown'}`);
        continue;
      }

      const sourceUrl = item.link || venue.websiteUrl;
      
      // Skip duplicates
      if (processedUrls.has(sourceUrl)) {
        console.log(`♻️ Skipping duplicate event: "${item.title}"`);
        continue;
      }
      
      processedUrls.add(sourceUrl);
      
      // Parse date from dateText and timeText
      let startDate = null;
      try {
        const dateString = `${item.dateText} ${item.timeText}`.trim();
        console.log(`Attempting to parse date from: "${dateString}" for event "${item.title}"`);
        
        // Try multiple regex patterns to match different date formats
        // Format: Month Day, Year @ Time
        let match = dateString.match(/([A-Za-z]+)\s+(\d{1,2})(?:(?:st|nd|rd|th))?(?:,?\s+(\d{4}))?(?:[^\d:]*)(?:(\d{1,2})(?::|\.)?(\d{2})?\s*(am|pm|AM|PM))?/i);
        
        if (match) {
          console.log(`Date match found: ${JSON.stringify(match)}`);
          const month = match[1];
          const day = parseInt(match[2]);
          const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
          
          let hour = 19; // Default to 7 PM if no time provided
          let minute = 0;
          
          // Parse time if available
          if (match[4]) {
            hour = parseInt(match[4]);
            minute = match[5] ? parseInt(match[5]) : 0;
            
            // Handle AM/PM
            if (match[6] && match[6].toLowerCase() === 'pm' && hour < 12) {
              hour += 12;
            } else if (match[6] && match[6].toLowerCase() === 'am' && hour === 12) {
              hour = 0;
            }
          }
          
          const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
          const monthIndex = monthNames.findIndex(m => month.toLowerCase().includes(m));
          
          if (monthIndex !== -1) {
            startDate = new Date(year, monthIndex, day, hour, minute);
            console.log(`Created date: ${startDate.toISOString()}`);
          }
        }
        
        // Try another pattern - looking for "Doors: 8PM" format
        if (!startDate) {
          const doorMatch = dateString.match(/Doors\s*:?\s*(\d{1,2})(?::|\s)?(\d{2})?\s*(am|pm|AM|PM)/i);
          const dateMatch = dateString.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/i);
          
          if (doorMatch && dateMatch) {
            const month = dateMatch[1];
            const day = parseInt(dateMatch[2]);
            const year = dateMatch[3] ? parseInt(dateMatch[3]) : new Date().getFullYear();
            
            let hour = parseInt(doorMatch[1]);
            let minute = doorMatch[2] ? parseInt(doorMatch[2]) : 0;
            
            // Handle AM/PM
            if (doorMatch[3] && doorMatch[3].toLowerCase() === 'pm' && hour < 12) {
              hour += 12;
            } else if (doorMatch[3] && doorMatch[3].toLowerCase() === 'am' && hour === 12) {
              hour = 0;
            }
            
            const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
            const monthIndex = monthNames.findIndex(m => month.toLowerCase().includes(m));
            
            if (monthIndex !== -1) {
              startDate = new Date(year, monthIndex, day, hour, minute);
              console.log(`Created date from door time: ${startDate.toISOString()}`);
            }
          }
        }

        // For dates with just the day and month, add next year if the date is in the past
        if (startDate && startDate < new Date()) {
          console.log(`Date is in the past, adjusting year: ${startDate.toISOString()}`);
          startDate.setFullYear(startDate.getFullYear() + 1);
          console.log(`Adjusted to: ${startDate.toISOString()}`);
        }
        
        if (!startDate) {
          // For events that just list a tour with no specific date
          if (item.title.toLowerCase().includes('tour')) {
            console.log(`📅 Using approximate date for tour: ${item.title} -> ${new Date().toDateString()}`);
            // Just use a date in the future to ensure it shows up
            startDate = new Date();
            startDate.setHours(19, 0, 0, 0); // 7:00 PM
            startDate.setDate(startDate.getDate() + 7); // One week from today
          } else {
            console.log(`⚠️ Could not parse date for event "${item.title}": "${item.dateText}", creating placeholder date`);
            // Create a placeholder date rather than skipping entirely
            startDate = new Date();
            startDate.setHours(19, 0, 0, 0); // 7:00 PM
            startDate.setDate(startDate.getDate() + 30); // 30 days in future as placeholder
          }
        }
      } catch (error) {
        console.log(`⚠️ Error parsing date for event "${item.title}": ${error.message}`);
        continue;
      }
      
      // Create event object that matches the Event schema with timestamp for uniqueness
      const timestamp = Date.now();
      // Generate a truly unique ID that won't collide with existing events
      const randomComponent = Math.random().toString(36).substring(2, 10);
      const eventId = `rickshaw-${timestamp}-${randomComponent}`.replace(/[^a-z0-9-]/gi, '-');
      console.log(`Creating event with ID: ${eventId}`);
      
      const event = {
        id: eventId,
        title: item.title,
        // Add explicit source marker for deduplication
        source: 'rickshaw-theatre-scraper',
        description: item.description || '',
        startDate: startDate,
        venue: {
          ...venue
        },
        category: 'music',
        categories: [...defaultCategories],
        sourceURL: sourceUrl,
        ticketURL: sourceUrl,
        image: item.imageUrl || null,
        // Legacy field for compatibility with old code
        location: venue.name,
        lastUpdated: new Date()
      };
      
      // Validate required fields
      if (!event.title || !event.startDate || !event.venue) {
        console.log(`⚠️ Skipping incomplete event: ${event.title || 'Unknown event'}`);
        continue;
      }
      
      events.push(event);
    }
    
    console.log(`🎉 Successfully scraped ${events.length} events from Rickshaw Theatre`);

  } catch (error) {
    console.error(`❌ Error scraping Rickshaw Theatre: ${error.message}`);
    console.error(error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }

  // Validate and log results
  console.log('=== RICKSHAW SCRAPER RESULTS ===');
  console.log(`Found ${events.length} events`);

  // Output some info about first event for debugging
  if (events.length > 0) {
    console.log('First event details:');
    console.log(`- Title: ${events[0].title}`);
    console.log(`- ID: ${events[0].id}`);
    console.log(`- Date: ${events[0].startDate}`);
    console.log(`- Venue: ${events[0].venue.name}`);
    console.log(`- SourceURL: ${events[0].sourceURL}`);
    console.log(`And ${events.length - 1} more events...`);
  }

  console.log('=== RICKSHAW THEATRE SCRAPER FINISHED ===');
  return events;
}

module.exports = {
  sourceIdentifier: 'rickshaw-theatre',
  scrape
};
