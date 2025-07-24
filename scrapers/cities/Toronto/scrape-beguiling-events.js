/**
 * The Beguiling Books Events Scraper
 * 
 * This script extracts events from The Beguiling Books website
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
const BASE_URL = 'https://beguilingbooks.com';
const EVENTS_URL = 'https://beguilingbooks.com/events';

// Venue information for The Beguiling
const BEGUILING_VENUE = {
  name: 'The Beguiling Books & Art',
  address: '319 College St, Toronto, ON M5T 1S2',
  city: 'Toronto',
  province: 'ON',
  country: 'Canada',
  postalCode: 'M5T 1S2',
  coordinates: {
    latitude: 43.657690,
    longitude: -79.404980
  }
};

// Categories likely for Beguiling events
const BOOK_CATEGORIES = ['books', 'comics', 'literature', 'art', 'toronto', 'reading'];

// Function to generate a unique ID for events
function generateEventId(title, startDate) {
  const dateStr = startDate instanceof Date ? startDate.toISOString() : new Date().toISOString();
  const data = `beguiling-${title}-${dateStr}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

// Function to extract categories based on event text
function extractCategories(title, description) {
  const textToSearch = `${title} ${description}`.toLowerCase();
  const categories = [...BOOK_CATEGORIES]; // Start with default categories
  
  // Add specific categories based on keywords
  if (textToSearch.includes('signing')) categories.push('book signing');
  if (textToSearch.includes('launch')) categories.push('book launch');
  if (textToSearch.includes('reading')) categories.push('reading');
  if (textToSearch.includes('workshop')) categories.push('workshop');
  if (textToSearch.includes('comic') || textToSearch.includes('graphic novel')) categories.push('comics');
  if (textToSearch.includes('manga')) categories.push('manga');
  if (textToSearch.includes('author')) categories.push('author event');
  
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
    // Look for patterns like "Month Day, Year" or "Month Day-Day, Year"
    const datePattern = /([A-Za-z]+)\s+(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?,\s*(\d{4})/;
    const timePattern = /(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)/;
    
    const dateMatch = dateText.match(datePattern);
    const timeMatch = dateText.match(timePattern);
    
    if (dateMatch) {
      const month = dateMatch[1];
      const day = parseInt(dateMatch[2]);
      const endDay = dateMatch[3] ? parseInt(dateMatch[3]) : null;
      const year = parseInt(dateMatch[4]);
      
      let startDate = new Date(`${month} ${day}, ${year}`);
      let endDate;
      
      // If a time is specified
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const ampm = timeMatch[3].toLowerCase();
        
        // Convert to 24-hour format
        if (ampm === 'pm' && hours < 12) {
          hours += 12;
        } else if (ampm === 'am' && hours === 12) {
          hours = 0;
        }
        
        startDate.setHours(hours, minutes, 0);
        
        // Default end time is 2 hours after start time
        endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 2);
      } else {
        // Default time is 7 PM for book events
        startDate.setHours(19, 0, 0);
        
        // Default end time is 9 PM
        endDate = new Date(startDate);
        endDate.setHours(21, 0, 0);
      }
      
      // If there's a range of days
      if (endDay) {
        endDate = new Date(`${month} ${endDay}, ${year}`);
        endDate.setHours(21, 0, 0); // Default end time
      }
      
      return { startDate, endDate };
    }
    
    // Attempt direct parsing if pattern fails
    const attemptedDate = new Date(dateText);
    if (!isNaN(attemptedDate.getTime())) {
      const endDate = new Date(attemptedDate);
      endDate.setHours(endDate.getHours() + 2); // Default 2 hour event
      return { startDate: attemptedDate, endDate };
    }
  } catch (error) {
    console.error(`❌ Failed to parse date: ${dateText}`, error);
  }
  
  // Default to current date if parsing fails
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(now.getHours() + 2);
  return { startDate: now, endDate };
}

// Function to extract price from text
function extractPrice(text) {
  if (!text) return 'Free';
  
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('free')) return 'Free';
  
  // Look for price patterns like $10, $10-$20
  const priceMatch = lowerText.match(/\$(\d+)(?:\s*-\s*\$(\d+))?/);
  if (priceMatch) {
    if (priceMatch[2]) {
      return `$${priceMatch[1]}-$${priceMatch[2]}`;
    } else {
      return `$${priceMatch[1]}`;
    }
  }
  
  return 'See website for details';
}

// Main function to fetch and process Beguiling events
async function scrapeBeguilingEvents() {
  let browser;
  let addedEvents = 0;
  
  try {
    console.log('🔍 Starting The Beguiling events scraper...');
    
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
    
    // Navigate to the events page
    console.log(`🔍 Navigating to ${EVENTS_URL}...`);
    await page.goto(EVENTS_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Give the page extra time to load dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Extract events
    console.log('🔍 Extracting events...');
    const events = await page.evaluate(() => {
      const eventElements = Array.from(document.querySelectorAll('.event-item, .event, [data-type="event"]'));
      
      // If can't find specific event elements, look for containers with event-like content
      const events = [];
      
      if (eventElements.length > 0) {
        // Found specific event elements
        eventElements.forEach(el => {
          const title = el.querySelector('h3, h4, .title')?.textContent.trim() ||
                      el.querySelector('h2')?.textContent.trim() || '';
          
          const description = el.querySelector('p, .description')?.textContent.trim() || '';
          
          const imageElement = el.querySelector('img');
          const imageUrl = imageElement ? imageElement.src : '';
          
          const dateElement = el.querySelector('.date, [class*="date"], time');
          const dateText = dateElement ? dateElement.textContent.trim() : '';
          
          const linkElement = el.querySelector('a');
          const eventUrl = linkElement ? linkElement.href : '';
          
          const priceElement = el.querySelector('.price, [class*="price"]');
          const priceText = priceElement ? priceElement.textContent.trim() : '';
          
          if (title) {
            events.push({
              title,
              description,
              imageUrl,
              eventUrl,
              dateText,
              priceText
            });
          }
        });
      } else {
        // Look for any content that might be events
        const contentContainers = Array.from(document.querySelectorAll('article, .content-container, .page-content > div'));
        
        contentContainers.forEach(container => {
          // Look for patterns that suggest this is an event listing
          const text = container.textContent;
          
          // Skip if container is too small to be meaningful
          if (text.length < 50) return;
          
          // Look for elements that might be event titles
          const headerElements = container.querySelectorAll('h1, h2, h3, h4, h5');
          
          headerElements.forEach(header => {
            const title = header.textContent.trim();
            
            // Skip if title is too short or generic
            if (title.length < 5 || ['events', 'upcoming', 'calendar'].includes(title.toLowerCase())) return;
            
            // Get next sibling paragraphs as description
            let description = '';
            let currentElement = header.nextElementSibling;
            
            // Look through next few elements for description content
            for (let i = 0; i < 3 && currentElement; i++) {
              if (currentElement.tagName === 'P') {
                description += currentElement.textContent.trim() + ' ';
              }
              currentElement = currentElement.nextElementSibling;
            }
            
            // Look for date patterns in nearby text
            const nearbyText = text.slice(text.indexOf(title), text.indexOf(title) + 500);
            const datePattern = /([A-Za-z]+\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?,\s*\d{4})/;
            const dateMatch = nearbyText.match(datePattern);
            const dateText = dateMatch ? dateMatch[0] : '';
            
            // Look for an image near this header
            const nearbyImage = header.closest('div')?.querySelector('img');
            const imageUrl = nearbyImage ? nearbyImage.src : '';
            
            // Look for a link near this header
            const nearbyLink = header.closest('div')?.querySelector('a');
            const eventUrl = nearbyLink ? nearbyLink.href : '';
            
            events.push({
              title,
              description: description.trim(),
              imageUrl,
              eventUrl,
              dateText,
              priceText: 'See website for details'
            });
          });
        });
      }
      
      return events;
    });
    
    console.log(`🔍 Found ${events.length} events`);
    
    // Process the events
    for (const event of events) {
      try {
        // Skip if title is missing or too short (likely not a real event)
        if (!event.title || event.title.length < 5) {
          console.log(`⏭️ Skipping: Missing or short title`);
          continue;
        }
        
        // Parse dates
        const { startDate, endDate } = parseDateText(event.dateText);
        
        // Generate unique ID
        const id = generateEventId(event.title, startDate);
        
        // Create formatted event
        const formattedEvent = {
          id: id,
          title: `Toronto - ${event.title}`,
          description: event.description,
          categories: extractCategories(event.title, event.description),
          startDate: startDate,
          endDate: endDate,
          venue: BEGUILING_VENUE,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || EVENTS_URL,
          price: extractPrice(event.priceText),
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
        console.error('❌ Error processing event:', error);
      }
    }
    
    // If no events were found, log a message
    if (events.length === 0) {
      console.log('⚠️ No events found on Beguiling website');
      console.log('🎉 No real events found, returning empty array (no fallback data)');
    }
    
    console.log(`📊 Successfully added ${addedEvents} new Beguiling events`);
    
  } catch (error) {
    console.error('❌ Error scraping Beguiling events:', error);
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
scrapeBeguilingEvents()
  .then(addedEvents => {
    console.log(`✅ The Beguiling scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running The Beguiling scraper:', error);
    process.exit(1);
  });
