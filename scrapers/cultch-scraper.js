/**
 * The Cultch Scraper
 * 
 * This scraper extracts events from The Cultch website
 * https://thecultch.com/whats-on/
 */

const puppeteer = require('puppeteer');

/**
 * Venue information for The Cultch
 */
const venue = {
  name: 'The Cultch',
  address: '1895 Venables St',
  city: 'Vancouver',
  province: 'BC',
  country: 'Canada',
  postalCode: 'V5L 2H6',
  coordinates: {
    latitude: 49.276822,
    longitude: -123.070350
  },
  websiteUrl: 'https://thecultch.com/'
};

/**
 * York Theatre venue information (secondary venue for The Cultch)
 */
const yorkTheatreVenue = {
  name: 'York Theatre',
  address: '639 Commercial Dr',
  city: 'Vancouver',
  province: 'BC',
  country: 'Canada',
  postalCode: 'V5L 2W2',
  coordinates: {
    latitude: 49.280001,
    longitude: -123.069703
  },
  websiteUrl: 'https://thecultch.com/'
};

/**
 * Categories for The Cultch events
 */
const defaultCategories = ['performance', 'arts', 'theatre', 'culture'];

/**
 * Main scraper function for The Cultch
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  console.log('=== STARTING THE CULTCH SCRAPER ===');
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
    
    console.log('Navigating to The Cultch website...');
    await page.goto('https://thecultch.com/whats-on/', { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('Page loaded');

    // Wait for events to load - looking for show links
    await page.waitForSelector('a[href*="/event/"]', { timeout: 30000 });
    console.log('Events section found');
    
    // Extract events
    console.log('Extracting events...');
    const eventLinks = await page.evaluate(() => {
      // Find all unique show links
      const links = Array.from(document.querySelectorAll('a[href*="/event/"]'))
        .filter(a => a.textContent.includes('SHOW INFO'))
        .map(a => {
          // Find the event title which is usually text before the SHOW INFO link
          let title = '';
          
          // Get parent container
          let parent = a.closest('.wp-block-group') || a.closest('article') || a.parentElement;
          
          if (parent) {
            // Try different strategies to find the title
            
            // Strategy 1: Look for specific patterns in the URL and extract title from URL
            const url = a.href;
            const eventSlug = url.split('/event/')[1]?.replace(/\/$/, '');
            if (eventSlug) {
              // Convert slug to title (e.g., "feeling-shrexy" -> "Feeling Shrexy")
              title = eventSlug.split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            }
            
            // Strategy 2: Find the first text node or heading that contains the title
            if (!title || title === '') {
              // Look at all headings and paragraphs before the SHOW INFO link
              const headings = Array.from(parent.querySelectorAll('h1, h2, h3, h4, h5, h6, p'));
              for (const heading of headings) {
                const headingText = heading.textContent.trim();
                if (headingText && 
                    !headingText.includes('SHOW INFO') && 
                    !headingText.includes('BUY TICKETS') &&
                    !headingText.includes('TICKETS + INFO') &&
                    !headingText.includes('Transform Festival') &&
                    !headingText.match(/^\d{1,2}:\d{2}/) && // Exclude times
                    !headingText.match(/^[A-Z]+ \d{1,2},? \d{4}/)) { // Exclude dates
                  title = headingText;
                  break;
                }
              }
            }
          }
          
          return { 
            title: title || 'Event at The Cultch',
            link: a.href
          };
        });
        
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
    for (let i = 0; i < eventLinks.length; i++) {
      const event = eventLinks[i];
      try {
        // Extract title from link - remove any trailing whitespace or special characters
        const title = event.title.trim().replace(/\\s+/g, ' ');
        
        console.log(`Visiting event page ${i+1}/${eventLinks.length}: ${title || event.link}`);
        await page.goto(event.link, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Extract details from the event page
        const details = await page.evaluate(() => {
          // Try to find the title if not already extracted
          let pageTitle = '';
          const h1 = document.querySelector('h1');
          if (h1) {
            pageTitle = h1.textContent.trim();
          }
          
          // Try to find the date and time - The Cultch usually has this in a header
          let dateText = '';
          let timeText = '';
          let venueText = '';
          let description = '';
          let imageUrl = '';
          let allDateInfo = [];
          
          // Look for the specific date and time header format (e.g., "JULY 5, 2025 | 8:00 PM YORK THEATRE")
          const dateHeaders = document.querySelectorAll('h1, h2, h3, h4');
          for (const header of dateHeaders) {
            const headerText = header.textContent.trim();
            
            // Pattern: "MONTH DAY, YEAR | TIME VENUE"
            const datePattern = /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\s*\|\s*(\d{1,2}:\d{2})\s*([AP]M)\s*(.+)?/i;
            const match = headerText.match(datePattern);
            
            if (match) {
              dateText = `${match[1]} ${match[2]}, ${match[3]}`; // Month Day, Year
              timeText = `${match[4]} ${match[5]}`; // HH:MM AM/PM
              
              if (match[6]) {
                venueText = match[6].trim(); // Venue name if present
              }
              
              allDateInfo.push({ dateText, timeText, venueText });
              break;
            }
          }
          
          // If no date found in headers, look in paragraphs
          if (!dateText) {
            const paragraphs = document.querySelectorAll('p');
            for (const p of paragraphs) {
              const text = p.textContent.trim();
              
              // Check for event date format: "Month Day, Year at Time"
              const dateTimePattern = /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\s*at\s*(\d{1,2}:\d{2})?\s*([AP]M)?/i;
              const dateTimeMatch = text.match(dateTimePattern);
              
              if (dateTimeMatch) {
                dateText = `${dateTimeMatch[1]} ${dateTimeMatch[2]}, ${dateTimeMatch[3]}`;
                if (dateTimeMatch[4]) {
                  timeText = `${dateTimeMatch[4]} ${dateTimeMatch[5] || 'PM'}`;
                }
                allDateInfo.push({ dateText, timeText });
                break;
              }
              
              // Alternative pattern: just look for "Month Day, Year"
              const dateOnlyPattern = /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i;
              const dateOnlyMatch = text.match(dateOnlyPattern);
              
              if (dateOnlyMatch && !text.includes('age') && !text.includes('recomm')) {
                dateText = `${dateOnlyMatch[1]} ${dateOnlyMatch[2]}, ${dateOnlyMatch[3]}`;
                allDateInfo.push({ dateText });
              }
            }
          }
          
          // Try to get any description content - usually in the "About" section
          let aboutSection = null;
          const headers = document.querySelectorAll('h2, h3');
          for (const header of headers) {
            if (header.textContent.trim().toLowerCase() === 'about') {
              aboutSection = header.nextElementSibling;
              break;
            }
          }
          
          if (aboutSection) {
            // Collect all paragraph text until the next heading
            let currentElement = aboutSection;
            let aboutContent = '';
            while (currentElement && !currentElement.tagName.match(/^H[1-6]$/i)) {
              if (currentElement.tagName === 'P') {
                aboutContent += currentElement.textContent.trim() + ' ';
              }
              currentElement = currentElement.nextElementSibling;
            }
            description = aboutContent.trim();
          } else {
            // Fallback: get all paragraph text from the page that isn't about hours/dates
            const paragraphs = document.querySelectorAll('p');
            description = Array.from(paragraphs)
                            .filter(p => {
                              const text = p.textContent.toLowerCase();
                              return !text.includes('monday to friday') && 
                                     !text.includes('hours') &&
                                     !text.includes('saturday & sunday');
                            })
                            .map(p => p.textContent.trim())
                            .join(' ')
                            .substring(0, 1000); // Limit description length
          }
          
          // Try to find event title in meta tags (more reliable)
          const metaTitleTag = document.querySelector('meta[property="og:title"]');
          if (metaTitleTag && metaTitleTag.content) {
            const metaTitle = metaTitleTag.content.trim();
            if (metaTitle && !metaTitle.includes('The Cultch')) {
              pageTitle = metaTitle;
            }
          }
          
          // Extract show dates from structured data if available
          const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
          jsonLdScripts.forEach(script => {
            try {
              const jsonData = JSON.parse(script.textContent);
              if (jsonData && jsonData['@type'] === 'Event' && jsonData.startDate) {
                const eventStartDate = new Date(jsonData.startDate);
                dateText = eventStartDate.toLocaleDateString('en-US', {
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric'
                });
                
                timeText = eventStartDate.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit'
                });
                
                allDateInfo.push({ dateText, timeText, fromJsonLd: true });
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          });
          
          // Try to find an image - The Cultch often has a featured image
          const img = document.querySelector('.wp-post-image') || document.querySelector('article img');
          if (img) {
            imageUrl = img.src || img.getAttribute('data-src');
          }
          
          // Also check for og:image
          const metaImage = document.querySelector('meta[property="og:image"]');
          if (metaImage && metaImage.content) {
            imageUrl = metaImage.content || imageUrl;
          }
          
          // Extract title from URL as last resort
          let urlTitle = '';
          const pathParts = window.location.pathname.split('/');
          const eventSlug = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
          if (eventSlug && eventSlug !== 'event') {
            urlTitle = eventSlug.replace(/-/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
          
          return {
            pageTitle,
            dateText,
            timeText,
            venueText,
            description,
            imageUrl,
            allDateInfo,
            urlTitle
          };
        });
        
        eventData.push({
          title: title || details.pageTitle || `Event at The Cultch (${new Date().toLocaleDateString()})`,
          link: event.link,
          dateText: details.dateText,
          timeText: details.timeText,
          venueText: details.venueText,
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
      // Skip if no title
      if (!item.title) {
        console.log(`⚠️ Skipping event with missing title`);
        continue;
      }

      const sourceUrl = item.link || venue.websiteUrl;
      
      // Skip duplicates
      if (processedUrls.has(sourceUrl)) {
        console.log(`♻️ Skipping duplicate event: "${item.title}"`);
        continue;
      }
      
      processedUrls.add(sourceUrl);
      
      // Determine the venue - check if the event is at York Theatre
      let eventVenue = venue;
      if (item.venueText && item.venueText.toLowerCase().includes('york')) {
        eventVenue = yorkTheatreVenue;
      }
      
      // Parse date from dateText and timeText
      let startDate = null;
      try {
        const dateString = `${item.dateText} ${item.timeText}`.trim();
        console.log(`Attempting to parse date from: "${dateString}" for event "${item.title}"`);
        
        // Try multiple regex patterns to match different date formats
        
        // Format: "MONTH DAY, YEAR | TIME"
        let match = dateString.match(/([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?(?:\s*\|?\s*(\d{1,2}):(\d{2})\s*(am|pm|AM|PM))?/i);
        
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
          
          // Support full month names or short month names (including uppercase like 'OCT')
          const monthMap = {
            'jan': 0, 'january': 0,
            'feb': 1, 'february': 1,
            'mar': 2, 'march': 2,
            'apr': 3, 'april': 3,
            'may': 4,
            'jun': 5, 'june': 5,
            'jul': 6, 'july': 6,
            'aug': 7, 'august': 7,
            'sep': 8, 'sept': 8, 'september': 8,
            'oct': 9, 'october': 9,
            'nov': 10, 'november': 10,
            'dec': 11, 'december': 11
          };
          
          const monthKey = month.toLowerCase();
          let monthIndex = -1;
          
          // Check for exact month match first
          if (monthMap[monthKey] !== undefined) {
            monthIndex = monthMap[monthKey];
          } else {
            // Check if the month string contains a month name
            for (const [key, index] of Object.entries(monthMap)) {
              if (monthKey.includes(key)) {
                monthIndex = index;
                break;
              }
            }
          }
          
          if (monthIndex !== -1) {
            startDate = new Date(year, monthIndex, day, hour, minute);
            console.log(`Created date: ${startDate.toISOString()}`);
          }
        }
        
        // For dates with just the day and month, add next year if the date is in the past
        if (startDate && startDate < new Date()) {
          console.log(`Date is in the past, adjusting year: ${startDate.toISOString()}`);
          startDate.setFullYear(startDate.getFullYear() + 1);
          console.log(`Adjusted to: ${startDate.toISOString()}`);
        }
        
        if (!startDate) {
          console.log(`⚠️ Could not parse date for event "${item.title}": "${item.dateText}", creating placeholder date`);
          // Create a placeholder date rather than skipping entirely
          startDate = new Date();
          startDate.setHours(19, 0, 0, 0); // 7:00 PM
          startDate.setDate(startDate.getDate() + 30); // 30 days in future as placeholder
        }
      } catch (error) {
        console.log(`⚠️ Error parsing date for event "${item.title}": ${error.message}`);
        continue;
      }
      
      // Create event object that matches the Event schema with timestamp for uniqueness
      const timestamp = Date.now();
      // Generate a truly unique ID that won't collide with existing events
      const randomComponent = Math.random().toString(36).substring(2, 10);
      const eventId = `cultch-${timestamp}-${randomComponent}`.replace(/[^a-z0-9-]/gi, '-');
      console.log(`Creating event with ID: ${eventId}`);
      
      const event = {
        id: eventId,
        title: item.title,
        // Add explicit source marker for deduplication
        source: 'cultch-theatre-scraper',
        description: item.description || '',
        startDate: startDate,
        venue: {
          ...eventVenue
        },
        category: 'arts',
        categories: [...defaultCategories],
        sourceURL: sourceUrl,
        ticketURL: sourceUrl.replace('/event/', '/ticket/'),
        image: item.imageUrl || null,
        // Legacy field for compatibility with old code
        location: eventVenue.name,
        lastUpdated: new Date()
      };
      
      // Validate required fields
      if (!event.title || !event.startDate || !event.venue) {
        console.log(`⚠️ Skipping incomplete event: ${event.title || 'Unknown event'}`);
        continue;
      }
      
      events.push(event);
    }
    
    console.log(`🎉 Successfully scraped ${events.length} events from The Cultch`);

  } catch (error) {
    console.error(`❌ Error scraping The Cultch: ${error.message}`);
    console.error(error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }

  // Validate and log results
  console.log('=== THE CULTCH SCRAPER RESULTS ===');
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

  console.log('=== THE CULTCH SCRAPER FINISHED ===');
  return events;
}

module.exports = {
  sourceIdentifier: 'cultch-theatre',
  scrape
};
