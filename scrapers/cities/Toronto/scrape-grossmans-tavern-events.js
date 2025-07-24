/**
 * Grossman's Tavern Events Scraper
 * 
 * This script extracts live music events from the Grossman's Tavern website
 * and adds them to the MongoDB database in the appropriate format.
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Helper function for delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// MongoDB connection URI from environment variable
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Base URL and events page URL
const BASE_URL = 'https://grossmanstavern.com';
const EVENTS_URL = 'https://grossmanstavern.com';

// Venue information for Grossman's Tavern
const GROSSMANS_VENUE = {
  name: 'Grossman\'s Tavern',
  address: '379 Spadina Ave, Toronto, ON M5T 2G3',
  city: 'Toronto',
  province: 'ON',
  country: 'Canada',
  postalCode: 'M5T 2G3',
  coordinates: {
    latitude: 43.6568,
    longitude: -79.4007
  }
};

// Categories likely for Grossman's Tavern events
const MUSIC_CATEGORIES = ['music', 'live music', 'bar', 'nightlife', 'toronto', 'entertainment'];

// Function to generate a unique ID for events
function generateEventId(title, startDate) {
  const dateStr = startDate instanceof Date ? startDate.toISOString() : new Date().toISOString();
  const data = `grossmans-${title}-${dateStr}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

// Function to extract categories based on event text
function extractCategories(title, description) {
  const textToSearch = `${title} ${description}`.toLowerCase();
  const categories = [...MUSIC_CATEGORIES]; // Start with default categories
  
  // Add specific categories based on keywords
  if (textToSearch.includes('blues')) categories.push('blues');
  if (textToSearch.includes('jazz')) categories.push('jazz');
  if (textToSearch.includes('rock')) categories.push('rock');
  if (textToSearch.includes('folk')) categories.push('folk');
  if (textToSearch.includes('country')) categories.push('country');
  if (textToSearch.includes('reggae')) categories.push('reggae');
  if (textToSearch.includes('jam')) categories.push('jam session');
  if (textToSearch.includes('open mic')) categories.push('open mic');
  if (textToSearch.includes('acoustic')) categories.push('acoustic');
  if (textToSearch.includes('band')) categories.push('band');
  
  // Remove duplicates
  return [...new Set(categories)];
}

// Function to parse date text into JavaScript Date objects
function parseDateText(dateText) {
  if (!dateText) {
    const now = new Date();
    return { startDate: now, endDate: now };
  }
  
  // Clean and normalize the date text
  dateText = dateText.trim().replace(/\s+/g, ' ');
  
  try {
    // Typical formats at Grossman's: 
    // "Saturday, July 15" or "Saturday July 15, 2025" or "July 15" or just "Saturday"
    
    // First look for full date with day name, month, day, and year
    const fullDatePattern = /([A-Za-z]+),?\s+([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i;
    const fullDateMatch = dateText.match(fullDatePattern);
    
    if (fullDateMatch) {
      const dayName = fullDateMatch[1];
      const month = fullDateMatch[2];
      const day = parseInt(fullDateMatch[3]);
      let year = fullDateMatch[4] ? parseInt(fullDateMatch[4]) : new Date().getFullYear();
      
      // Create date object
      const startDate = new Date(`${month} ${day}, ${year}`);
      
      // Live music venues typically have shows starting in the evening
      startDate.setHours(20, 0, 0); // 8:00 PM
      
      const endDate = new Date(startDate);
      endDate.setHours(23, 0, 0); // 11:00 PM
      
      return { startDate, endDate };
    }
    
    // Look for month and day
    const monthDayPattern = /([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i;
    const monthDayMatch = dateText.match(monthDayPattern);
    
    if (monthDayMatch) {
      const month = monthDayMatch[1];
      const day = parseInt(monthDayMatch[2]);
      const year = monthDayMatch[3] ? parseInt(monthDayMatch[3]) : new Date().getFullYear();
      
      const startDate = new Date(`${month} ${day}, ${year}`);
      startDate.setHours(20, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(23, 0, 0);
      
      return { startDate, endDate };
    }
    
    // Look for just a day name like "Saturday"
    const dayNamePattern = /([A-Za-z]+day)/i;
    const dayNameMatch = dateText.match(dayNamePattern);
    
    if (dayNameMatch) {
      const dayName = dayNameMatch[1].toLowerCase();
      const today = new Date();
      
      // Map day names to their index (0 = Sunday, 1 = Monday, etc.)
      const dayMap = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
      };
      
      // If we can identify the day of week
      if (dayMap[dayName] !== undefined) {
        const targetDay = dayMap[dayName];
        const currentDay = today.getDay();
        
        // Calculate days to add to get to the target day
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) {
          daysToAdd += 7; // Move to next week if target day is today or earlier
        }
        
        const startDate = new Date(today);
        startDate.setDate(today.getDate() + daysToAdd);
        startDate.setHours(20, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setHours(23, 0, 0);
        
        return { startDate, endDate };
      }
    }
    
    // Last resort: try direct parsing
    const parsedDate = new Date(dateText);
    if (!isNaN(parsedDate.getTime())) {
      const startDate = parsedDate;
      startDate.setHours(20, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(23, 0, 0);
      
      return { startDate, endDate };
    }
  } catch (error) {
    console.error(`❌ Failed to parse date: ${dateText}`, error);
  }
  
  // Default to current date if parsing fails
  const now = new Date();
  now.setHours(20, 0, 0);
  const endDate = new Date(now);
  endDate.setHours(23, 0, 0);
  return { startDate: now, endDate };
}

// Main function to fetch and process Grossman's Tavern events
async function scrapeGrossmansTavernEvents() {
  let browser;
  let addedEvents = 0;
  
  try {
    console.log('🔍 Starting Grossman\'s Tavern events scraper...');
    
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db('discovr');
    const eventsCollection = database.collection('events');
    
    // Launch puppeteer
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
    
    // Navigate to the website
    console.log(`🔍 Navigating to ${EVENTS_URL}...`);
    
    try {
      await page.goto(EVENTS_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    } catch (error) {
      console.log(`⚠️ Initial page load error: ${error.message}`);
      console.log('🔍 Trying alternate URLs...');
      
      // Try alternate URLs if the main one fails
      const alternateURLs = [
        'https://www.grossmanstavern.com',
        'http://grossmanstavern.com',
        'http://www.grossmanstavern.com'
      ];
      
      let loaded = false;
      for (const url of alternateURLs) {
        try {
          console.log(`🔍 Trying ${url}...`);
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
          loaded = true;
          console.log(`✅ Successfully loaded ${url}`);
          break;
        } catch (err) {
          console.log(`⚠️ Failed to load ${url}: ${err.message}`);
        }
      }
      
      if (!loaded) {
        throw new Error('Failed to load Grossman\'s Tavern website through any URL');
      }
    }
    
    // Give the page time to fully load content, scripts, etc.
    await delay(5000);
    
    // Extract events
    console.log('🔍 Extracting events...');
    
    // First attempt: Try to find a dedicated events/shows section
    const events = await page.evaluate(() => {
      const extractedEvents = [];
      
      // Look for event listings in various formats
      // Method 1: Look for event cards or listings with typical classes
      const eventElements = document.querySelectorAll('.event, .show, [class*="event"], [class*="show"], article, .calendar-item');
      
      if (eventElements.length > 0) {
        eventElements.forEach(eventElement => {
          let title = '';
          let dateText = '';
          let description = '';
          let imageUrl = '';
          
          // Extract title
          const titleElement = eventElement.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
          if (titleElement) title = titleElement.textContent.trim();
          
          // Extract date
          const dateElement = eventElement.querySelector('.date, [class*="date"], time');
          if (dateElement) dateText = dateElement.textContent.trim();
          
          // Extract description
          const descElement = eventElement.querySelector('p, .description, [class*="description"]');
          if (descElement) description = descElement.textContent.trim();
          
          // Extract image
          const imgElement = eventElement.querySelector('img');
          if (imgElement && imgElement.src) imageUrl = imgElement.src;
          
          // Only add if we have at least a title
          if (title) {
            extractedEvents.push({ title, dateText, description, imageUrl });
          }
        });
      }
      
      // Method 2: Look for calendar/schedule listings
      if (extractedEvents.length === 0) {
        // Tables are often used for show schedules
        const tables = document.querySelectorAll('table');
        
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
              // Assume first cell is date, second is event name/description
              const dateText = cells[0].textContent.trim();
              const title = cells[1].textContent.trim();
              
              if (dateText && title) {
                extractedEvents.push({ title, dateText, description: '' });
              }
            }
          });
        });
      }
      
      // Method 3: Look for list-based formats
      if (extractedEvents.length === 0) {
        const lists = document.querySelectorAll('ul, ol');
        
        lists.forEach(list => {
          const items = list.querySelectorAll('li');
          
          items.forEach(item => {
            // Check if this list item might contain an event
            const text = item.textContent.trim();
            if (text.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i)) {
              const parts = text.split(/[:-]/);
              
              if (parts.length >= 2) {
                const dateText = parts[0].trim();
                const title = parts.slice(1).join(' ').trim();
                
                if (dateText && title) {
                  extractedEvents.push({ title, dateText, description: '' });
                }
              } else {
                // Just use the whole text as title and try to parse date later
                extractedEvents.push({ title: text, dateText: text, description: '' });
              }
            }
          });
        });
      }
      
      // Method 4: Last resort, look for paragraph text that might contain event info
      if (extractedEvents.length === 0) {
        const paragraphs = document.querySelectorAll('p');
        
        paragraphs.forEach(p => {
          const text = p.textContent.trim();
          
          // Look for paragraphs that mention days of the week and seem like event listings
          if (text.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i) && 
              (text.match(/\d{1,2}(am|pm|AM|PM)/i) || text.match(/\bat\b/i))) {
            
            extractedEvents.push({ title: text, dateText: text, description: '' });
          }
        });
      }
      
      return extractedEvents;
    });
    
    console.log(`🔍 Found ${events.length} potential events`);
    
    // Process each event
    for (const event of events) {
      try {
        console.log(`🔍 Processing event: ${event.title}`);
        
        // For Grossman's Tavern, titles often include band name and other info
        // We'll clean up the title and extract date if it's embedded
        let cleanTitle = event.title.replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi, '');
        cleanTitle = cleanTitle.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(st|nd|rd|th)?/gi, '');
        cleanTitle = cleanTitle.replace(/\d{1,2}(:\d{2})?\s*(AM|PM|am|pm)/gi, '');
        cleanTitle = cleanTitle.replace(/[-–:,;|]+/g, ' ').trim();
        
        // Skip if title is too short after cleaning
        if (!cleanTitle || cleanTitle.length < 3) {
          console.log(`⏭️ Skipping: Title too short after cleaning`);
          continue;
        }
        
        // Parse dates
        const { startDate, endDate } = parseDateText(event.dateText);
        
        // Generate unique ID
        const id = generateEventId(cleanTitle, startDate);
        
        // Create formatted event
        const formattedEvent = {
          id: id,
          title: `Toronto - ${cleanTitle}`,
          description: event.description || `Live music event at Grossman's Tavern featuring ${cleanTitle}`,
          categories: extractCategories(cleanTitle, event.description),
          startDate: startDate,
          endDate: endDate,
          venue: GROSSMANS_VENUE,
          imageUrl: event.imageUrl || '',
          officialWebsite: EVENTS_URL,
          price: 'See website for details',
          sourceURL: EVENTS_URL,
          lastUpdated: new Date()
        };
        
        // Check for duplicates
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
          await eventsCollection.insertOne(formattedEvent);
          addedEvents++;
          console.log(`✅ Added event: ${formattedEvent.title}`);
        } else {
          console.log(`⏭️ Skipped duplicate event: ${formattedEvent.title}`);
        }
      } catch (error) {
        console.error(`❌ Error processing event:`, error);
      }
    }
    
    // If no events were found, log a message
    if (addedEvents === 0) {
      console.log('⚠️ No events found on Grossman\'s Tavern website');
      console.log('🎉 No real events found, returning empty array (no fallback data)');
    }
    
    console.log(`📊 Successfully added ${addedEvents} new Grossman's Tavern events`);
    
  } catch (error) {
    console.error('❌ Error scraping Grossman\'s Tavern events:', error);
  } finally {
    // Close the browser
    if (browser) {
      await browser.close();
    }
    
    // Close MongoDB connection
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeGrossmansTavernEvents()
  .then(addedEvents => {
    console.log(`✅ Grossman's Tavern scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Grossman\'s Tavern scraper:', error);
    process.exit(1);
  });
