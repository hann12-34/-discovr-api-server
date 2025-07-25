/**
 * Gardiner Museum Events Scraper
 * 
 * This script extracts exhibitions and events from the Gardiner Museum website
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
const BASE_URL = 'https://www.gardinermuseum.on.ca';
const EVENTS_URL = 'https://www.gardinermuseum.on.ca/whats-on/';

// Venue information for Gardiner Museum
const GARDINER_MUSEUM_VENUE = {
  name: 'Gardiner Museum',
  address: '111 Queens Park, Toronto, ON M5S 2C7',
  city: 'Toronto',
  province: 'ON',
  country: 'Canada',
  postalCode: 'M5S 2C7',
  coordinates: {
    latitude: 43.6682,
    longitude: -79.3927
  }
};

// Categories likely for Gardiner Museum events
const MUSEUM_CATEGORIES = ['museum', 'ceramics', 'pottery', 'art', 'exhibition', 'toronto', 'culture'];

// Function to generate a unique ID for events
function generateEventId(title, startDate) {
  const dateStr = startDate instanceof Date ? startDate.toISOString() : new Date().toISOString();
  const data = `gardiner-${title}-${dateStr}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

// Function to extract categories based on event text
function extractCategories(title, description) {
  const textToSearch = `${title} ${description}`.toLowerCase();
  const categories = [...MUSEUM_CATEGORIES]; // Start with default categories
  
  // Add specific categories based on keywords
  if (textToSearch.includes('workshop') || textToSearch.includes('class')) categories.push('workshop');
  if (textToSearch.includes('talk') || textToSearch.includes('lecture')) categories.push('talk');
  if (textToSearch.includes('family') || textToSearch.includes('kids') || textToSearch.includes('children')) categories.push('family');
  if (textToSearch.includes('tour')) categories.push('tour');
  if (textToSearch.includes('opening') || textToSearch.includes('reception')) categories.push('opening');
  if (textToSearch.includes('clay') || textToSearch.includes('ceramic')) categories.push('ceramics');
  if (textToSearch.includes('contemporary') || textToSearch.includes('modern')) categories.push('contemporary');
  if (textToSearch.includes('special')) categories.push('special event');
  if (textToSearch.includes('performance')) categories.push('performance');
  if (textToSearch.includes('community')) categories.push('community');
  
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
    // Try various date patterns:
    
    // Pattern for date range with months and year: "June 13 - August 31, 2025"
    const monthRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:\s*[-–]\s*)(?:([A-Za-z]+)\s+)?(\d{1,2})(?:,?\s*(\d{4}))?/i;
    const monthRangeMatch = dateText.match(monthRangePattern);
    
    if (monthRangeMatch) {
      const startMonth = monthRangeMatch[1];
      const startDay = parseInt(monthRangeMatch[2]);
      const endMonth = monthRangeMatch[3] || startMonth;
      const endDay = parseInt(monthRangeMatch[4]);
      const year = monthRangeMatch[5] || new Date().getFullYear();
      
      const startDate = new Date(`${startMonth} ${startDay}, ${year}`);
      startDate.setHours(10, 0, 0); // Museum typically opens at 10am
      
      const endDate = new Date(`${endMonth} ${endDay}, ${year}`);
      endDate.setHours(17, 0, 0); // Museum typically closes at 5pm
      
      return { startDate, endDate };
    }
    
    // Pattern for specific time mentions with AM/PM: "7:00 PM"
    const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)/i;
    const timeMatch = dateText.match(timePattern);
    
    let startHour = 10; // Default open hour
    let startMinute = 0;
    let endHour = 17; // Default close hour
    let endMinute = 0;
    
    if (timeMatch) {
      startHour = parseInt(timeMatch[1]);
      startMinute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3].toLowerCase();
      
      if (ampm === 'pm' && startHour < 12) {
        startHour += 12;
      }
      
      // Default end time is 2 hours after start for events with specific times
      endHour = startHour + 2;
      endMinute = startMinute;
    }
    
    // Single date pattern: "June 13, 2025"
    const singleDatePattern = /([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i;
    const singleDateMatch = dateText.match(singleDatePattern);
    
    if (singleDateMatch) {
      const month = singleDateMatch[1];
      const day = parseInt(singleDateMatch[2]);
      const year = singleDateMatch[3] || new Date().getFullYear();
      
      const startDate = new Date(`${month} ${day}, ${year}`);
      startDate.setHours(startHour, startMinute, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(endHour, endMinute, 0);
      
      return { startDate, endDate };
    }
    
    // Try direct parsing as last resort
    const parsedDate = new Date(dateText);
    if (!isNaN(parsedDate.getTime())) {
      const startDate = parsedDate;
      startDate.setHours(startHour, startMinute, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(endHour, endMinute, 0);
      
      return { startDate, endDate };
    }
  } catch (error) {
    console.error(`❌ Failed to parse date: ${dateText}`, error);
  }
  
  // Default to current date if parsing fails
  const now = new Date();
  now.setHours(10, 0, 0);
  const endDate = new Date(now);
  endDate.setHours(17, 0, 0);
  return { startDate: now, endDate };
}

// Function to extract price from text
function extractPrice(text) {
  if (!text) return 'See website for details';
  
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('free')) return 'Free';
  
  // Look for price patterns like $10, $10-$20
  const priceMatch = lowerText.match(/\$(\d+(?:\.\d{2})?)(?:\s*-\s*\$(\d+(?:\.\d{2})?))?/);
  if (priceMatch) {
    if (priceMatch[2]) {
      return `$${priceMatch[1]}-$${priceMatch[2]}`;
    } else {
      return `$${priceMatch[1]}`;
    }
  }
  
  // Look for "General Admission" or similar phrases
  if (lowerText.includes('general admission') || lowerText.includes('admission')) {
    return 'General Admission';
  }
  
  return 'See website for details';
}

// Main function to fetch and process Gardiner Museum events
async function scrapeGardinerMuseumEvents() {
  let browser;
  let addedEvents = 0;
  
  try {
    console.log('🔍 Starting Gardiner Museum events scraper...');
    
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
    
    // Set a user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
    
    // Navigate to the events page
    console.log(`🔍 Navigating to ${EVENTS_URL}...`);
    await page.goto(EVENTS_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for the content to load
    await delay(3000);
    
    // Extract events
    console.log('🔍 Extracting events...');
    const events = await page.evaluate(() => {
      const extractedEvents = [];
      
      // Look for event cards/containers
      const eventCards = document.querySelectorAll('.event-card, .event-container, [class*="event"], article');
      
      eventCards.forEach(card => {
        // Extract title
        let title = '';
        const titleEl = card.querySelector('h1, h2, h3, h4, .event-title, .title');
        if (titleEl) {
          title = titleEl.textContent.trim();
        }
        
        // Skip if no title found
        if (!title) return;
        
        // Extract date
        let dateText = '';
        const dateEl = card.querySelector('.date, .event-date, [class*="date"], time');
        if (dateEl) {
          dateText = dateEl.textContent.trim();
        }
        
        // Extract description
        let description = '';
        const descEl = card.querySelector('.description, .event-description, p');
        if (descEl) {
          description = descEl.textContent.trim();
        }
        
        // Extract link
        let eventUrl = '';
        const linkEl = card.querySelector('a');
        if (linkEl && linkEl.href) {
          eventUrl = linkEl.href;
        }
        
        // Extract image
        let imageUrl = '';
        const imgEl = card.querySelector('img');
        if (imgEl && imgEl.src) {
          imageUrl = imgEl.src;
        }
        
        // Extract price
        let price = '';
        const priceEl = card.querySelector('.price, [class*="price"], [class*="cost"]');
        if (priceEl) {
          price = priceEl.textContent.trim();
        }
        
        // Add to events array
        extractedEvents.push({
          title,
          dateText,
          description,
          eventUrl,
          imageUrl,
          price
        });
      });
      
      return extractedEvents;
    });
    
    console.log(`🔍 Found ${events.length} potential events`);
    
    // Process each event to get additional details if needed
    for (const event of events) {
      try {
        console.log(`🔍 Processing event: ${event.title}`);
        
        // If we have a URL, visit the event page to get more details
        if (event.eventUrl) {
          console.log(`🔍 Visiting event page: ${event.eventUrl}`);
          await page.goto(event.eventUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          await delay(2000);
          
          // Extract additional details
          const additionalDetails = await page.evaluate(() => {
            // Get a more detailed description if available
            let fullDescription = '';
            const descriptionElements = document.querySelectorAll('.event-description, .description, .content p');
            descriptionElements.forEach(el => {
              if (el) {
                const text = el.textContent.trim();
                if (text && text.length > fullDescription.length) {
                  fullDescription = text;
                }
              }
            });
            
            // Get better image if available
            let betterImage = '';
            const imgEl = document.querySelector('.featured-image img, .event-image img, .hero img');
            if (imgEl && imgEl.src) {
              betterImage = imgEl.src;
            }
            
            // Get more detailed date info
            let detailedDate = '';
            const dateEl = document.querySelector('.event-date, .date, [class*="date"], time');
            if (dateEl) {
              detailedDate = dateEl.textContent.trim();
            }
            
            return {
              fullDescription,
              betterImage,
              detailedDate
            };
          });
          
          // Update event with additional details if they're better than what we have
          if (additionalDetails.fullDescription && additionalDetails.fullDescription.length > event.description.length) {
            event.description = additionalDetails.fullDescription;
          }
          
          if (additionalDetails.betterImage) {
            event.imageUrl = additionalDetails.betterImage;
          }
          
          if (additionalDetails.detailedDate && additionalDetails.detailedDate.length > event.dateText.length) {
            event.dateText = additionalDetails.detailedDate;
          }
        }
        
        // Parse dates
        const { startDate, endDate } = parseDateText(event.dateText);
        
        // Parse price
        const price = extractPrice(event.price);
        
        // Generate unique ID
        const id = generateEventId(event.title, startDate);
        
        // Create formatted event
        const formattedEvent = {
          id: id,
          title: `Toronto - ${event.title}`,
          description: event.description || `Event at the Gardiner Museum: ${event.title}`,
          categories: extractCategories(event.title, event.description),
          startDate: startDate,
          endDate: endDate,
          venue: GARDINER_MUSEUM_VENUE,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || EVENTS_URL,
          price: price,
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
        console.error(`❌ Error processing event: ${event.title}`, error);
      }
    }
    
    // If no events were found, log but do not create sample events
    if (addedEvents === 0) {
      console.log('⚠️ No events were found on the Gardiner Museum website.');
    }
    
    console.log(`📊 Successfully added ${addedEvents} new Gardiner Museum events`);
    
  } catch (error) {
    console.error('❌ Error scraping Gardiner Museum events:', error);
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
scrapeGardinerMuseumEvents()
  .then(addedEvents => {
    console.log(`✅ Gardiner Museum scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Gardiner Museum scraper:', error);
    process.exit(1);
  });
