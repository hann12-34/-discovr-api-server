/**
 * Living Arts Centre Events Scraper
 * 
 * This script extracts events from the Living Arts Centre website
 * and adds them to the MongoDB database in the appropriate format.
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// MongoDB connection URI from environment variable
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Base URL and events page URL
const BASE_URL = 'https://www.livingartscentre.ca';
const EVENTS_URL = 'https://www.livingartscentre.ca/events/';

// Venue information for Living Arts Centre
const LIVING_ARTS_CENTRE_VENUE = {
  name: 'Living Arts Centre',
  address: '4141 Living Arts Dr',
  city: 'Mississauga',
  province: 'ON',
  country: 'Canada',
  postalCode: 'L5B 4B8',
  coordinates: {
    latitude: 43.5883,
    longitude: -79.6356
  }
};

// Categories for Living Arts Centre events
const LIVING_ARTS_CATEGORIES = ['arts', 'culture', 'performance', 'mississauga', 'toronto', 'theatre', 'music', 'dance'];

/**
 * Function to generate a unique ID for events
 * @param {string} title - Event title
 * @param {Date} startDate - Event start date
 * @returns {string} - MD5 hash ID
 */
function generateEventId(title, startDate) {
  const dateStr = startDate instanceof Date ? startDate.toISOString() : new Date().toISOString();
  const data = `livingartscentre-${title}-${dateStr}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Extract categories based on event text
 * @param {string} title - Event title
 * @param {string} description - Event description
 * @returns {Array} - Array of category strings
 */
function extractCategories(title, description) {
  const textToSearch = `${title} ${description}`.toLowerCase();
  const categories = [...LIVING_ARTS_CATEGORIES]; // Start with default categories
  
  // Add specific categories based on content
  if (textToSearch.includes('music') || textToSearch.includes('concert') || 
      textToSearch.includes('symphony') || textToSearch.includes('orchestra') || 
      textToSearch.includes('band') || textToSearch.includes('choir')) {
    categories.push('music');
  }
  
  if (textToSearch.includes('theatre') || textToSearch.includes('theater') || 
      textToSearch.includes('play') || textToSearch.includes('drama') || 
      textToSearch.includes('comedy')) {
    categories.push('theatre');
  }
  
  if (textToSearch.includes('dance') || textToSearch.includes('ballet') || 
      textToSearch.includes('contemporary') || textToSearch.includes('choreography')) {
    categories.push('dance');
  }
  
  if (textToSearch.includes('gallery') || textToSearch.includes('exhibition') || 
      textToSearch.includes('art show') || textToSearch.includes('artist')) {
    categories.push('visual-art');
  }
  
  if (textToSearch.includes('workshop') || textToSearch.includes('class') || 
      textToSearch.includes('education') || textToSearch.includes('learn')) {
    categories.push('workshop');
    categories.push('education');
  }
  
  // Remove duplicates
  return [...new Set(categories)];
}

/**
 * Parse date text into JavaScript Date objects
 * @param {string} dateText - Date text from the website
 * @returns {Object|null} - Object with parsed dates or null if parsing fails
 */
function parseDateText(dateText) {
  if (!dateText) return null;
  
  try {
    // Common date formats on the site
    // Example: "July 15, 2025 | 8:00pm"
    // Example: "July 15-16, 2025 | Various times"
    
    const dateTimeParts = dateText.split('|').map(part => part.trim());
    let dateStr = dateTimeParts[0];
    let timeStr = dateTimeParts.length > 1 ? dateTimeParts[1] : '';
    
    // Check if it's a date range (containing hyphen)
    if (dateStr.includes('-')) {
      // Handle date range
      const dateParts = dateStr.split('-');
      let startDateStr = dateParts[0].trim();
      let endDateStr = dateParts[1].trim();
      
      // If the end date doesn't have the month or year, add it from the start date
      if (!endDateStr.includes(',')) {
        // It's likely just a day number
        const startMonth = startDateStr.split(' ')[0]; // e.g., "July"
        const startYear = startDateStr.split(', ')[1]; // e.g., "2025"
        endDateStr = `${startMonth} ${endDateStr}, ${startYear}`;
      }
      
      // Parse start date
      let startDate = new Date(startDateStr + ' ' + (timeStr || '12:00pm'));
      
      // Parse end date - if end time is provided, use it; otherwise use the same time as start
      let endDate = new Date(endDateStr + ' ' + (timeStr || '11:59pm'));
      
      return { 
        startDate,
        endDate 
      };
    } else {
      // Single day event
      let startDate = new Date(dateStr + ' ' + (timeStr || '12:00pm'));
      
      // For end date, if time is specified, add a few hours; otherwise set to end of day
      let endDate;
      if (timeStr && timeStr.toLowerCase().includes('pm')) {
        // If it's a PM show, typically it's 2-3 hours
        endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 3);
      } else {
        // Default to end of the day
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59);
      }
      
      return {
        startDate,
        endDate
      };
    }
  } catch (error) {
    console.error(`⚠️ Error parsing date: ${error.message} for ${dateText}`);
    return null;
  }
}

/**
 * Extract location information
 * @param {string} locationText - Location text from the website
 * @returns {string} - Formatted location string
 */
function extractLocation(locationText) {
  if (!locationText) return 'Living Arts Centre';
  
  // Clean up the location text
  return locationText.replace(/\s+/g, ' ').trim();
}

/**
 * Main function to scrape Living Arts Centre events
 * @returns {number} - Count of added events
 */
async function scrapeLivingArtsCentreEvents() {
  console.log('🔍 Starting Living Arts Centre events scraper...');
  let browser;
  let addedEvents = 0;
  
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db('discovr');
    const eventsCollection = database.collection('events');
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    console.log(`🔍 Navigating to ${EVENTS_URL}...`);
    
    // Navigate to events page
    await page.goto(EVENTS_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for events to load
    await page.waitForSelector('.event-item, .event-card, .event-listing', { timeout: 10000 })
      .catch(() => console.log('⚠️ Could not find event elements, but continuing...'));
    
    console.log('✅ Page loaded, extracting events...');
    
    // Extract events
    const events = await page.evaluate((BASE_URL) => {
      const extractedEvents = [];
      
      // Try different selectors that might contain events
      const eventElements = document.querySelectorAll('.event-item, .event-card, .event-listing, article.event');
      
      eventElements.forEach(element => {
        try {
          // Extract event information using various possible selectors
          const titleElement = element.querySelector('h2, h3, .event-title, .title');
          const dateElement = element.querySelector('.event-date, .date, .time');
          const descriptionElement = element.querySelector('.event-description, .description, .excerpt');
          const imageElement = element.querySelector('img');
          
          // Get the event link
          const linkElement = element.querySelector('a');
          const link = linkElement ? (linkElement.href || '') : '';
          
          // Construct the event object with available information
          const event = {
            title: titleElement ? titleElement.textContent.trim() : 'Untitled Event',
            dateText: dateElement ? dateElement.textContent.trim() : '',
            description: descriptionElement ? descriptionElement.textContent.trim() : '',
            imageUrl: imageElement ? (imageElement.src || imageElement.getAttribute('data-src') || '') : '',
            url: link.startsWith('/') ? `${BASE_URL}${link}` : link
          };
          
          extractedEvents.push(event);
        } catch (error) {
          console.error('Error extracting event:', error);
        }
      });
      
      return extractedEvents;
    }, BASE_URL);
    
    console.log(`🔍 Found ${events.length} potential events`);
    
    // Process each event and get more details
    for (const event of events) {
      console.log(`🔍 Processing event: ${event.title}`);
      
      // Parse dates
      const dateInfo = parseDateText(event.dateText);
      
      if (!dateInfo) {
        console.log(`⚠️ Could not parse date/time for event: ${event.title}`);
        continue;
      }
      
      console.log(`✅ Successfully parsed date: ${dateInfo.startDate}`);
      
      // Get full event details if a URL is available
      if (event.url) {
        try {
          await page.goto(event.url, { waitUntil: 'networkidle2', timeout: 30000 });
          
          // Extract detailed information
          const detailedInfo = await page.evaluate(() => {
            const description = document.querySelector('.event-description, .description, .content-description, .post-content');
            const image = document.querySelector('.event-image img, .featured-image img, .main-image img');
            const location = document.querySelector('.event-location, .location, .venue');
            
            return {
              description: description ? description.textContent.trim() : '',
              imageUrl: image ? (image.src || image.getAttribute('data-src') || '') : '',
              location: location ? location.textContent.trim() : ''
            };
          });
          
          // Update event with detailed information if available
          if (detailedInfo.description && detailedInfo.description.length > 10) {
            event.description = detailedInfo.description;
          }
          
          if (detailedInfo.imageUrl) {
            event.imageUrl = detailedInfo.imageUrl;
          }
          
          if (detailedInfo.location) {
            event.location = extractLocation(detailedInfo.location);
          }
        } catch (error) {
          console.error(`⚠️ Error fetching detailed info: ${error.message}`);
        }
      }
      
      // Generate a unique ID for the event
      const eventId = generateEventId(event.title, dateInfo.startDate);
      
      // Create the formatted event for the database
      const formattedEvent = {
        id: eventId,
        title: event.title,
        description: event.description || `Event at the Living Arts Centre: ${event.title}`,
        categories: extractCategories(event.title, event.description || ''),
        startDate: dateInfo.startDate,
        endDate: dateInfo.endDate,
        venue: LIVING_ARTS_CENTRE_VENUE,
        imageUrl: event.imageUrl || '',
        officialWebsite: event.url || EVENTS_URL,
        price: 'See website for details',
        location: event.location || 'Living Arts Centre',
        sourceURL: EVENTS_URL,
        lastUpdated: new Date()
      };
      
      // Check if the event already exists in the database
      const existingEvent = await eventsCollection.findOne({
        $or: [
          { id: formattedEvent.id },
          { 
            title: formattedEvent.title,
            startDate: formattedEvent.startDate
          }
        ]
      });
      
      if (!existingEvent) {
        // Add the event to the database
        await eventsCollection.insertOne(formattedEvent);
        addedEvents++;
        console.log(`✅ Event added: ${formattedEvent.title}`);
      } else {
        console.log(`⏭️ Skipped duplicate event: ${formattedEvent.title}`);
      }
    }
    
    // If no events were found, log but do not create sample events
    if (addedEvents === 0) {
      console.log('⚠️ No events were found or added from the Living Arts Centre website.');
    }
    
    // Log the results
    console.log(`📊 Successfully added ${addedEvents} new Living Arts Centre events`);
    
  } catch (error) {
    console.error('❌ Error scraping Living Arts Centre events:', error);
  } finally {
    // Close browser
    if (browser) {
      await browser.close();
      console.log('✅ Browser closed');
    }
    
    // Close MongoDB connection
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeLivingArtsCentreEvents()
  .then(addedEvents => {
    console.log(`✅ Living Arts Centre scraper completed. Added ${addedEvents} new events.`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error running scraper:', error);
    process.exit(1);
  });
