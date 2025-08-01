/**
 * El Mocambo Events Scraper
 * 
 * This script extracts events from the El Mocambo website
 * and adds them to the MongoDB database in the appropriate format.
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// MongoDB connection URI from environment variable
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Base URL and events page URL
const BASE_URL = 'https://elmocambo.com';
const EVENTS_URL = 'https://elmocambo.com/events-new/';

// Venue information for El Mocambo
const ELMOCAMBO_VENUE = {
  name: 'El Mocambo',
  address: '464 Spadina Ave, Toronto, ON M5T 2G8',
  city: 'Toronto',
  province: 'ON',
  country: 'Canada',
  postalCode: 'M5T 2G8',
  coordinates: {
    latitude: 43.6574,
    longitude: -79.4017
  }
};

// Categories likely for El Mocambo events
const MUSIC_CATEGORIES = ['music', 'concert', 'live music', 'toronto', 'nightlife'];

// Function to generate a unique ID for events
function generateEventId(title, startDate) {
  const dateStr = startDate instanceof Date ? startDate.toISOString() : new Date().toISOString();
  const data = `elmocambo-${title}-${dateStr}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

// Function to extract categories based on event text
function extractCategories(title, description) {
  const textToSearch = `${title} ${description}`.toLowerCase();
  const categories = [...MUSIC_CATEGORIES]; // Start with default categories
  
  // Add specific categories based on keywords
  if (textToSearch.includes('rock') || textToSearch.includes('punk')) categories.push('rock');
  if (textToSearch.includes('jazz')) categories.push('jazz');
  if (textToSearch.includes('blues')) categories.push('blues');
  if (textToSearch.includes('hip hop') || textToSearch.includes('rap')) categories.push('hip hop');
  if (textToSearch.includes('electronic') || textToSearch.includes('dj')) categories.push('electronic');
  if (textToSearch.includes('indie')) categories.push('indie');
  if (textToSearch.includes('folk')) categories.push('folk');
  if (textToSearch.includes('metal')) categories.push('metal');
  if (textToSearch.includes('country')) categories.push('country');
  if (textToSearch.includes('dance')) categories.push('dance');
  
  // Remove duplicates
  return [...new Set(categories)];
}

// Function to parse date text into JavaScript Date objects
function parseDateText(dateText, year = new Date().getFullYear()) {
  if (!dateText) {
    const now = new Date();
    return { startDate: now, endDate: now };
  }
  
  // Clean and normalize the date text
  dateText = dateText.trim().replace(/\s+/g, ' ');
  
  try {
    // El Mocambo typically shows dates in formats like "21 Jun" or "23 Aug"
    // We'll need to extract the day and month
    const datePattern = /(\d{1,2})\s+([A-Za-z]{3,})/i;
    const match = dateText.match(datePattern);
    
    if (match) {
      const day = parseInt(match[1]);
      const month = match[2];
      
      // Create a date object with the current year
      const startDate = new Date(`${month} ${day}, ${year}`);
      
      // Default to 8pm for music venue events
      startDate.setHours(20, 0, 0);
      
      // End date is typically 3 hours after start for concerts
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 3);
      
      // Check if date is valid
      if (!isNaN(startDate.getTime())) {
        // If the parsed date is in the past (more than a week ago),
        // it's likely for next year
        const now = new Date();
        if (startDate < now && (now - startDate) > 7 * 24 * 60 * 60 * 1000) {
          startDate.setFullYear(startDate.getFullYear() + 1);
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
        
        return { startDate, endDate };
      }
    }
    
    // Try direct parsing as fallback
    const attemptedDate = new Date(dateText);
    if (!isNaN(attemptedDate.getTime())) {
      // Set to 8pm as default time for music venue
      attemptedDate.setHours(20, 0, 0);
      
      const endDate = new Date(attemptedDate);
      endDate.setHours(endDate.getHours() + 3);
      return { startDate: attemptedDate, endDate };
    }
  } catch (error) {
    console.error(`❌ Failed to parse date: ${dateText}`, error);
  }
  
  // Default to current date if parsing fails
  const now = new Date();
  now.setHours(20, 0, 0); // Default 8pm
  const endDate = new Date(now);
  endDate.setHours(endDate.getHours() + 3);
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
  
  return 'See website for details';
}

// Main function to fetch and process El Mocambo events
async function scrapeElMocamboEvents() {
  let addedEvents = 0;
  
  try {
    console.log('🔍 Starting El Mocambo events scraper...');
    
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db('discovr');
    const eventsCollection = database.collection('events');
    
    // Fetch the events page
    const response = await axios.get(EVENTS_URL);
    let $ = cheerio.load(response.data);
    
    // Extract events
    const events = [];
    const eventLinks = [];
    
    // Find all event links
    $('a[href*="/event/"]').each(function() {
      const href = $(this).attr('href');
      if (href && href.includes('/event/') && !eventLinks.includes(href)) {
        eventLinks.push(href);
      }
    });
    
    console.log(`🔍 Found ${eventLinks.length} event links`);
    
    // Visit each event page to get details
    for (const eventLink of eventLinks) {
      try {
        console.log(`🔍 Fetching event details from: ${eventLink}`);
        
        const eventResponse = await axios.get(eventLink);
        const eventPage = cheerio.load(eventResponse.data);
        
        // Extract event title
        const title = eventPage('h1.entry-title, .event-title').first().text().trim();
        
        // Skip if no title found
        if (!title) {
          console.log(`⏭️ Skipping: No title found for ${eventLink}`);
          continue;
        }
        
        // Extract event description
        let description = '';
        eventPage('.event-description, .description, .content-inner p').each(function() {
          const text = eventPage(this).text().trim();
          if (text && text.length > description.length) {
            description = text;
          }
        });
        
        // Extract image URL
        let imageUrl = '';
        const imageElement = eventPage('.event-image img, .featured-image img, .wp-post-image').first();
        if (imageElement.length) {
          imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
        }
        
        // Extract date text
        let dateText = '';
        eventPage('.event-date, .date, time, [class*="date"]').each(function() {
          const text = eventPage(this).text().trim();
          if (text && text.length > 0) {
            dateText += text + ' ';
          }
        });
        
        // If no specific date found on event page, look for date in main listing
        if (!dateText) {
          $(`a[href="${eventLink}"]`).closest('.event-item, .event').find('.date, [class*="date"]').each(function() {
            const text = $(this).text().trim();
            if (text) {
              dateText = text;
            }
          });
        }
        
        // Extract price
        let price = 'See website for details';
        eventPage('.event-price, .price, [class*="price"]').each(function() {
          const text = eventPage(this).text().trim();
          if (text) {
            price = extractPrice(text);
          }
        });
        
        // If we have a title, add the event
        if (title) {
          events.push({
            title,
            description,
            imageUrl,
            dateText,
            eventUrl: eventLink,
            price
          });
        }
      } catch (error) {
        console.error(`❌ Error fetching event details from ${eventLink}:`, error.message);
      }
    }
    
    // If we couldn't extract date info from event pages, try to get from main page
    for (let event of events) {
      if (!event.dateText) {
        // Try to extract date from the main listing
        $('a').each(function() {
          if ($(this).attr('href') === event.eventUrl) {
            // Find nearby date elements
            const parent = $(this).closest('.event-item, .event');
            parent.find('.date, [class*="date"]').each(function() {
              const text = $(this).text().trim();
              if (text && !event.dateText) {
                event.dateText = text;
              }
            });
          }
        });
      }
    }
    
    console.log(`🔍 Processed ${events.length} events`);
    
    // Process the events
    for (const event of events) {
      try {
        // Skip if title is missing or too short (likely not a real event)
        if (!event.title || event.title.length < 3) {
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
          venue: ELMOCAMBO_VENUE,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl,
          price: event.price,
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
      console.log('⚠️ No events found on El Mocambo website');
      console.log('🎉 No real events found, returning empty array (no fallback data)');
    }
    
    console.log(`📊 Successfully added ${addedEvents} new El Mocambo events`);
    
  } catch (error) {
    console.error('❌ Error scraping El Mocambo events:', error);
  } finally {
    // Close MongoDB connection
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeElMocamboEvents()
  .then(addedEvents => {
    console.log(`✅ El Mocambo scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running El Mocambo scraper:', error);
    process.exit(1);
  });
