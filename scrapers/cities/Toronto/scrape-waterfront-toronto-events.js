/**
 * Waterfront Toronto Events Scraper
 * Based on events from https://www.waterfrontoronto.ca/events
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const WATERFRONT_URL = 'https://www.waterfrontoronto.ca/events';
const WATERFRONT_VENUE = {
  name: 'Waterfront Toronto',
  address: 'Toronto Waterfront',
  city: 'Toronto',
  region: 'Ontario',
  country: 'Canada',
  postalCode: '',
  url: 'https://www.waterfrontoronto.ca',
};

// MongoDB connection URI
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI environment variable not set');
  process.exit(1);
}

// Generate unique event ID
function generateEventId(title, startDate) {
  const dataToHash = `${WATERFRONT_VENUE.name}-${title}-${startDate.toISOString()}`;
  return crypto.createHash('md5').update(dataToHash).digest('hex');
}

/**
 * Parse date and time information from text
 * Handles various date formats and ranges
 */
function parseDateAndTime(dateText, timeText = '', title = '') {
  // Check for date in title if dateText is empty
  if (!dateText && title) {
    // Look for patterns like "Meeting - July 30, 2025" in the title
    const dateMatch = title.match(/[\s-]([A-Za-z]+\s+\d{1,2},\s*\d{4})/);
    if (dateMatch) {
      dateText = dateMatch[1];
    }
  }
  
  if (!dateText) return null;
  
  // Special handling for Waterfront Toronto date formats which may not be standard
  // Example format: "July 13-14" without year
  const currentYear = new Date().getFullYear();
  if (dateText.match(/^[A-Za-z]+\s+\d{1,2}(-|–|to)\d{1,2}$/)) {
    try {
      const month = dateText.split(' ')[0]; // e.g., "July"
      const dayRange = dateText.split(' ')[1]; // e.g., "13-14"
      
      // Split the day range
      let [startDay, endDay] = dayRange.split(/[-–to]/).map(Number);
      
      // Create the dates
      const startDate = new Date(`${month} ${startDay}, ${currentYear}`);
      const endDate = new Date(`${month} ${endDay}, ${currentYear}`);
      
      // Set default times
      startDate.setHours(10, 0, 0, 0); // 10:00 AM
      endDate.setHours(18, 0, 0, 0);  // 6:00 PM
      
      return { startDate, endDate };
    } catch (error) {
      console.error(`❌ Special date format parsing failed: ${error.message}`);
      // Fall through to standard parsing
    }
  }
  
  
  try {
    // Clean up texts
    dateText = dateText.trim();
    timeText = timeText ? timeText.trim() : '';
    
    // Remove day of week if present
    dateText = dateText.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*/i, '');
    
    let startDate, endDate;
    let startTime = '10:00'; // Default start time for outdoor events (10:00 AM)
    let endTime = '18:00';   // Default end time for outdoor events (6:00 PM)
    
    // Check if it's a date range
    if (dateText.includes(' - ') || dateText.includes(' to ') || dateText.includes('–')) {
      const separator = dateText.includes(' - ') ? ' - ' : (dateText.includes('–') ? '–' : ' to ');
      const [startDateStr, endDateStr] = dateText.split(separator);
      
      startDate = new Date(startDateStr);
      
      // Handle case where year might be missing in the start date
      if (isNaN(startDate.getTime()) && endDateStr.includes(',')) {
        const year = endDateStr.split(',')[1].trim();
        startDate = new Date(`${startDateStr}, ${year}`);
      }
      
      endDate = new Date(endDateStr);
    } else {
      // Single date
      startDate = new Date(dateText);
      endDate = new Date(dateText);
    }
    
    // If we couldn't parse the date, return null
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return null;
    }
    
    // Process time information
    if (timeText) {
      // Check if time range is provided
      if (timeText.includes('-') || timeText.includes('to')) {
        const separator = timeText.includes('-') ? '-' : 'to';
        let [start, end] = timeText.split(separator).map(t => t.trim());
        
        // Handle AM/PM
        const startIsPM = start.toLowerCase().includes('pm');
        const endIsPM = end.toLowerCase().includes('pm');
        
        // Extract hours and minutes
        const startMatch = start.match(/(\d{1,2})(?::(\d{2}))?/);
        const endMatch = end.match(/(\d{1,2})(?::(\d{2}))?/);
        
        if (startMatch) {
          let hours = parseInt(startMatch[1]);
          const minutes = startMatch[2] ? parseInt(startMatch[2]) : 0;
          
          // Convert to 24-hour format
          if (startIsPM && hours < 12) hours += 12;
          if (!startIsPM && hours === 12) hours = 0;
          
          startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
        
        if (endMatch) {
          let hours = parseInt(endMatch[1]);
          const minutes = endMatch[2] ? parseInt(endMatch[2]) : 0;
          
          // Convert to 24-hour format
          if (endIsPM && hours < 12) hours += 12;
          if (!endIsPM && hours === 12) hours = 0;
          
          endTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
      } else {
        // Single time provided
        const isPM = timeText.toLowerCase().includes('pm');
        const match = timeText.match(/(\d{1,2})(?::(\d{2}))?/);
        
        if (match) {
          let hours = parseInt(match[1]);
          const minutes = match[2] ? parseInt(match[2]) : 0;
          
          // Convert to 24-hour format
          if (isPM && hours < 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
          
          startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          
          // Default end time is 2 hours after start
          let endHours = hours + 2;
          if (endHours >= 24) endHours -= 24;
          endTime = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
      }
    }
    
    // Set time components on dates
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    startDate.setHours(startHours, startMinutes, 0, 0);
    endDate.setHours(endHours, endMinutes, 0, 0);
    
    return {
      startDate,
      endDate
    };
  } catch (error) {
    console.error(`❌ Error parsing date and time: ${error.message}`);
    return null;
  }
}

/**
 * Extract categories from event title, description, and event type
 */
function extractCategories(title, description, eventType = '') {
  const categories = new Set();
  
  // Add waterfront as the default category
  categories.add('waterfront');
  
  // Common Waterfront Toronto event categories
  const categoryKeywords = {
    'community': ['community', 'public', 'local', 'neighborhood', 'neighbourhood'],
    'arts': ['art', 'artist', 'exhibition', 'gallery', 'installation', 'creative'],
    'recreation': ['recreation', 'park', 'trail', 'outdoor', 'walking', 'biking', 'cycling'],
    'development': ['development', 'construction', 'revitalization', 'planning', 'design', 'architecture'],
    'environment': ['environment', 'sustainability', 'green', 'eco', 'nature', 'conservation', 'cleanup'],
    'family': ['family', 'kid', 'child', 'youth', 'all ages'],
    'festival': ['festival', 'celebration', 'fair'],
    'workshop': ['workshop', 'class', 'seminar', 'education', 'learn'],
    'tour': ['tour', 'guided', 'walk', 'visit'],
    'meeting': ['meeting', 'consultation', 'town hall', 'engagement', 'information'],
    'market': ['market', 'vendor', 'shop', 'fair'],
    'sports': ['sports', 'fitness', 'exercise', 'race', 'competition']
  };
  
  // Check title, description and event type for keywords
  const textToAnalyze = `${title} ${description} ${eventType}`.toLowerCase();
  
  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    if (keywords.some(keyword => textToAnalyze.includes(keyword))) {
      categories.add(category);
    }
  });
  
  return Array.from(categories);
}

/**
 * Extract price information from text
 */
function extractPrice(text) {
  if (!text) return 'See website for ticket information';
  
  const lowerText = text.toLowerCase();
  
  // Check for free events
  if (lowerText.includes('free') || lowerText.includes('no charge')) {
    return 'Free';
  }
  
  // Check for pay what you can
  if (lowerText.includes('pay what you') || lowerText.includes('pwyc')) {
    return 'Pay What You Can';
  }
  
  // Check for donations
  if (lowerText.includes('donation')) {
    return 'By Donation';
  }
  
  // Try to extract price values
  const priceMatch = text.match(/\$\s*(\d+(?:\.\d{2})?)/);
  if (priceMatch) {
    return `$${priceMatch[1]}`;
  }
  
  // Default message
  return 'See website for ticket information';
}

/**
 * Main scraper function
 */
async function scrapeWaterfrontEvents() {
  let client;
  let addedEvents = 0;
  
  try {
    // Connect to MongoDB
    client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db('events_db');
    const eventsCollection = database.collection('events');
    
    // Fetch HTML content from Waterfront Toronto website
    console.log(`🔍 Fetching events from Waterfront Toronto website...`);
    const response = await axios.get(WATERFRONT_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Parse HTML with cheerio
    const $ = cheerio.load(response.data);
    
    // Array to store events
    const events = [];
    
    // Find event containers on the page - selector for Waterfront Toronto's current structure
    $('.teaser-events-2-col, .events-teaser, .tile-wrapper .teaser, .tile-content').each((i, el) => {
      try {
        const element = $(el);
        
        // Extract event data
        const title = element.find('h2, h3, h4, .title, .event-title').first().text().trim();
        const dateText = element.find('.date, [class*="date"], time').first().text().trim();
        const timeText = element.find('.time, [class*="time"]').first().text().trim();
        const description = element.find('p, .description, .event-description').first().text().trim() || 
                           'Join us for this Waterfront Toronto event. See website for more details.';
        
        // Extract image if available
        let imageUrl = '';
        const imageElement = element.find('img');
        if (imageElement.length > 0) {
          imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
          // Make URL absolute if relative
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('/') 
              ? `https://www.waterfrontoronto.ca${imageUrl}` 
              : `https://www.waterfrontoronto.ca/${imageUrl}`;
          }
        }
        
        // Extract URL if available
        let eventUrl = '';
        const linkElement = element.find('a');
        if (linkElement.length > 0) {
          eventUrl = linkElement.attr('href') || '';
          // Make URL absolute if relative
          if (eventUrl && !eventUrl.startsWith('http')) {
            eventUrl = eventUrl.startsWith('/') 
              ? `https://www.waterfrontoronto.ca${eventUrl}` 
              : `https://www.waterfrontoronto.ca/${eventUrl}`;
          }
        }
        
        // Extract price information
        const priceText = element.find('.price, [class*="price"], .cost').text().trim();
        
        // Skip events without title
        if (!title) return;
        
        events.push({
          title,
          dateText,
          timeText,
          description,
          imageUrl,
          eventUrl: eventUrl || WATERFRONT_URL,
          priceText
        });
        
      } catch (eventError) {
        console.error(`❌ Error processing event: ${eventError.message}`);
      }
    });
    
    console.log(`🔍 Found ${events.length} events on Waterfront Toronto website`);
    
    // If no events found with primary selectors, try alternative selectors
    if (events.length === 0) {
      $('.views-row, .views-element-container .tile, .content-listing .item, .event-listing .event').each((i, el) => {
        try {
          const element = $(el);
          
          const title = element.find('h2, h3, h4, .title, .field--name-node-title, .field--name-title').first().text().trim();
          const dateText = element.find('.date, time, [class*="date"], .field--name-field-date').first().text().trim();
          const timeText = element.find('.time, [class*="time"]').first().text().trim();
          const description = element.find('p, .description, .excerpt').first().text().trim() || 
                             'Join us for this Waterfront Toronto event. See website for more details.';
          
          let imageUrl = '';
          const imageElement = element.find('img');
          if (imageElement.length > 0) {
            imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('/') 
                ? `https://www.waterfrontoronto.ca${imageUrl}` 
                : `https://www.waterfrontoronto.ca/${imageUrl}`;
            }
          }
          
          let eventUrl = '';
          const linkElement = element.find('a');
          if (linkElement.length > 0) {
            eventUrl = linkElement.attr('href') || '';
            if (eventUrl && !eventUrl.startsWith('http')) {
              eventUrl = eventUrl.startsWith('/') 
                ? `https://www.waterfrontoronto.ca${eventUrl}` 
                : `https://www.waterfrontoronto.ca/${eventUrl}`;
            }
          }
          
          const priceText = element.find('.price, [class*="price"], .cost').text().trim();
          
          if (!title) return;
          
          events.push({
            title,
            dateText,
            timeText,
            description,
            imageUrl,
            eventUrl: eventUrl || WATERFRONT_URL,
            priceText
          });
        } catch (eventError) {
          console.error(`❌ Error processing event with alternative selectors: ${eventError.message}`);
        }
      });
      
      console.log(`🔍 Found ${events.length} events with alternative selectors`);
    }
    
    if (events.length === 0) {
      console.warn('⚠️ Warning: No events found on Waterfront Toronto website.');
      return 0;
    }
    
    // Process individual event pages for more details
    const eventDetailsPromises = events.map(async (event) => {
      if (event.eventUrl && event.eventUrl !== WATERFRONT_URL) {
        try {
          const detailResponse = await axios.get(event.eventUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          const $detail = cheerio.load(detailResponse.data);
          
          // Look for additional details on the event page
          
          // Try to find date information
          const dateElement = $detail('.date, .event-date, [class*="date"], time, .event-details .field--name-field-date');
          if (dateElement.length > 0 && dateElement.text().trim()) {
            event.dateText = dateElement.text().trim();
          }
          
          // Try to find time information
          const timeElement = $detail('.time, .event-time, [class*="time"]');
          if (timeElement.length > 0 && timeElement.text().trim()) {
            event.timeText = timeElement.text().trim();
          }
          
          // Try to find a better description
          const descriptionElement = $detail('.description, [class*="description"], .content, .entry-content');
          if (descriptionElement.length > 0 && descriptionElement.text().trim()) {
            // Get first paragraph for concise description
            event.description = descriptionElement.find('p').first().text().trim() || 
                               descriptionElement.text().trim().substring(0, 300) + '...';
          }
          
          // Try to find image
          if (!event.imageUrl) {
            const imageElement = $detail('img.wp-post-image, .featured-image img, .banner img').first();
            if (imageElement.length > 0) {
              event.imageUrl = imageElement.attr('src') || '';
              if (event.imageUrl && !event.imageUrl.startsWith('http')) {
                event.imageUrl = event.imageUrl.startsWith('/') 
                  ? `https://www.waterfrontoronto.ca${event.imageUrl}` 
                  : `https://www.waterfrontoronto.ca/${event.imageUrl}`;
              }
            }
          }
          
          // Try to find price information
          const priceElement = $detail('.price, [class*="price"], .cost, .ticket');
          if (priceElement.length > 0 && priceElement.text().trim()) {
            event.priceText = priceElement.text().trim();
          }
          
        } catch (detailError) {
          console.error(`❌ Error fetching event details: ${detailError.message}`);
        }
      }
      return event;
    });
    
    const processedEvents = await Promise.all(eventDetailsPromises);
    
    // Insert events into MongoDB
    for (const event of processedEvents) {
      try {
        // Skip events with no title
        if (!event.title) {
          console.warn('⚠️ Warning: Skipping event with no title');
          continue;
        }
        
        // Parse date and time, also passing title to extract date if needed
        const dateTimeInfo = parseDateAndTime(event.dateText, event.timeText, event.title);
        if (!dateTimeInfo) {
          console.warn(`⚠️ Warning: Could not parse date and time for event "${event.title}". Skipping.`);
          continue;
        }
        
        const { startDate, endDate } = dateTimeInfo;
        
        // Generate unique ID for the event
        const eventId = generateEventId(event.title, startDate);
        
        // Extract categories
        const categories = extractCategories(event.title, event.description, '');
        
        // Extract price information
        const price = extractPrice(event.priceText);
        
        // Check if the event already exists
        const existingEvent = await eventsCollection.findOne({
          $or: [
            { eventId },
            {
              title: event.title,
              'date.start': startDate
            }
          ]
        });
        
        if (existingEvent) {
          console.log(`⚠️ Skipping duplicate event: ${event.title}`);
          continue;
        }
        
        // Create event document
        const eventDocument = {
          eventId,
          title: event.title,
          description: event.description,
          date: {
            start: startDate,
            end: endDate
          },
          venue: WATERFRONT_VENUE,
          categories,
          price,
          imageUrl: event.imageUrl,
          url: event.eventUrl,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Insert event into MongoDB
        await eventsCollection.insertOne(eventDocument);
        addedEvents++;
        console.log(`✅ Added event: ${event.title}`);
      } catch (insertError) {
        console.error(`❌ Error inserting event: ${insertError.message}`);
      }
    }
    
    console.log(`📊 Successfully added ${addedEvents} new Waterfront Toronto events`);
    return addedEvents;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return 0;
  } finally {
    if (client) {
      await client.close();
      console.log('✅ MongoDB connection closed');
    }
  }
}

// Run the scraper
scrapeWaterfrontEvents()
  .then(addedEvents => {
    console.log(`✅ Waterfront Toronto scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error(`❌ Scraper error: ${error.message}`);
  });
