/**
 * Poetry Jazz Cafe Events Scraper
 * 
 * This script scrapes event information from Poetry Jazz Cafe's website
 * and stores it in MongoDB. It uses Axios and Cheerio for scraping.
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');

// Constants
const VENUE_NAME = 'Poetry Jazz Cafe';
const VENUE_ADDRESS = '1078 Queen Street West, Toronto, ON, M6J 1H8';
const BASE_URL = 'https://www.poetryjazzcafe.com';
const EVENTS_URL = `${BASE_URL}/livemusic`;

// MongoDB connection string
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Categories specific to Poetry Jazz Cafe
const CATEGORIES = ['Jazz', 'Music', 'Live Music', 'Blues', 'Soul', 'Concert'];

/**
 * Generate a unique ID for an event based on venue, title, and start date
 * @param {string} venueName - The name of the venue
 * @param {string} eventTitle - The title of the event
 * @param {Date} startDate - The start date of the event
 * @returns {string} - A unique MD5 hash
 */
function generateEventId(venueName, eventTitle, startDate) {
  const uniqueString = `${venueName}-${eventTitle}-${startDate.toISOString()}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
}

/**
 * Parse date from Poetry Jazz Cafe's date format
 * @param {string} dateText - The date text from the website
 * @param {string} timeText - The time text from the website
 * @returns {Object} - Object with start and end dates
 */
function parseDateAndTime(dateText, timeText) {
  if (!dateText || !timeText) {
    return null;
  }

  try {
    // The date format seems to be in the li tags
    // Example format: "Wednesday, July 16, 2025"
    const dateStr = dateText.trim();
    
    // Extract time - format appears to be "9:00 PM"
    const timeStr = timeText.trim();
    
    // Combine date and time
    const dateTimeStr = `${dateStr} ${timeStr}`;
    const eventDate = new Date(dateTimeStr);
    
    if (isNaN(eventDate.getTime())) {
      console.log(`🔍 Invalid date/time format: ${dateTimeStr}`);
      return null;
    }
    
    // Set end date 3 hours after start by default for music shows
    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + 3);

    return {
      startDate: eventDate,
      endDate: endDate
    };
  } catch (error) {
    console.log(`⚠️ Error parsing date: ${error.message} for ${dateText} ${timeText}`);
    return null;
  }
}

/**
 * Parse event URL from the website
 * @param {string} href - The href attribute from the anchor tag
 * @returns {string} - The full event URL
 */
function parseEventUrl(href) {
  if (!href) return null;
  
  // If it's a relative URL, prepend the base URL
  if (href.startsWith('/')) {
    return `${BASE_URL}${href}`;
  }
  
  return href;
}

/**
 * Main function to scrape events from Poetry Jazz Cafe
 */
async function scrapePoetryJazzCafeEvents() {
  console.log('🔍 Starting Poetry Jazz Cafe events scraper...');
  
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db('discovr');
    const eventsCollection = database.collection('events');
    
    // Fetch the events page
    console.log(`🔍 Fetching events from ${EVENTS_URL}...`);
    const response = await axios.get(EVENTS_URL);
    const $ = cheerio.load(response.data);
    
    // Array to store the events
    const events = [];
    
    // Find all event links
    const eventLinks = $('a[href^="/livemusic/"]').filter(function() {
      // Filter out navigation links or duplicate links
      const href = $(this).attr('href');
      return href && href.includes('/livemusic/20') && !href.includes('Back to All Events');
    });
    
    console.log(`🔍 Found ${eventLinks.length} potential events`);
    
    // Process each event
    const uniqueEventUrls = new Set();
    
    // Filter and process only actual event links, not navigation or ICS links
    const actualEventLinks = eventLinks.filter(function() {
      const href = $(this).attr('href');
      return href && 
             !href.includes('format=ical') && 
             !href.includes('Back to All Events') &&
             /\/livemusic\/\d{4}\/\d{1,2}\/\d{1,2}\//.test(href);
    });
    
    console.log(`🔍 Filtered down to ${actualEventLinks.length} actual event links`);
    
    for (const link of actualEventLinks) {
      const eventUrl = parseEventUrl($(link).attr('href'));
      
      // Skip if we've already processed this URL
      if (!eventUrl || uniqueEventUrls.has(eventUrl)) continue;
      uniqueEventUrls.add(eventUrl);
      
      console.log(`🔍 Processing event: ${$(link).text() || 'Unnamed Event'}`);
      
      try {
        // Fetch the event detail page
        console.log(`🔍 Fetching details from ${eventUrl}...`);
        const eventResponse = await axios.get(eventUrl);
        const eventPage = cheerio.load(eventResponse.data);
        
        // Extract event details
        const title = eventPage('h1.eventitem-title').text().trim();
        console.log(`🔍 Found event title: ${title}`);
        
        // Get date information - needs to be extracted differently
        let dateText = '';
        let timeText = '';
        
        // Get the date from event-date element
        const eventDate = eventPage('time.event-date').first().text().trim();
        if (eventDate) {
          dateText = eventDate;
        }
        
        // Get the time from event-time-12hr element
        const eventTime = eventPage('time.event-time-12hr').first().text().trim();
        if (eventTime) {
          timeText = eventTime;
        }
        
        console.log(`🔍 Date text: "${dateText}", Time text: "${timeText}"`);
        
        // If we can't find date in standard location, try alt formats
        if (!dateText || !timeText) {
          // Sometimes dates are directly in li elements
          eventPage('li.eventitem-meta-item').each(function() {
            const liText = eventPage(this).text().trim();
            if (liText.match(/[A-Za-z]+day, [A-Za-z]+ \d+, \d{4}/)) {
              dateText = liText;
            } else if (liText.match(/\d+:\d+ [AP]M/)) {
              timeText = liText;
            }
          });
        }
        
        const dateInfo = parseDateAndTime(dateText, timeText);
        
        if (!dateInfo) {
          console.log(`⚠️ Could not parse date/time for event: ${title}`);
          continue;
        }
        
        console.log(`✅ Successfully parsed date: ${dateInfo.startDate}`);
        
        // Extract description
        let description = '';
        
        // Try multiple selectors for description
        const descriptionSelectors = [
          '.sqs-block-content p', 
          '.eventitem-column-content', 
          '.entry-more',
          '.entry-excerpt'
        ];
        
        for (const selector of descriptionSelectors) {
          const text = eventPage(selector).text().trim();
          if (text && text.length > description.length) {
            description = text;
          }
        }
        
        // If no description found, use title
        if (!description) {
          description = title;
        }
        
        // Extract image if available
        let imageUrl = null;
        const imageSelectors = [
          'img.thumb-image',
          '.eventlist-column-thumbnail img',
          '.sqs-block-image img',
          '.entry-content img'
        ];
        
        for (const selector of imageSelectors) {
          const img = eventPage(selector).first();
          const src = img.attr('data-src') || img.attr('src');
          if (src) {
            imageUrl = src;
            break;
          }
        }
        
        // Generate unique event ID
        const eventId = generateEventId(VENUE_NAME, title, dateInfo.startDate);
        
        // Create event object
        const event = {
          id: eventId,
          title: title,
          description: description,
          startDate: dateInfo.startDate,
          endDate: dateInfo.endDate,
          location: 'Toronto, Ontario',
          categories: CATEGORIES,
          officialWebsite: eventUrl,
          imageUrl: imageUrl,
          venue: VENUE_NAME,
          lastUpdated: new Date()
        };
        
        events.push(event);
        console.log(`✅ Event added: ${title}`);
        
      } catch (error) {
        console.log(`⚠️ Error processing event ${eventUrl}: ${error.message}`);
      }
    }
    
    // If no events were found, log but do not create sample events
    if (events.length === 0) {
      console.log('⚠️ No events were found on the Poetry Jazz Cafe website.');
    }
    
    // Insert events into MongoDB
    let newEventsCount = 0;
    for (const event of events) {
      const existingEvent = await eventsCollection.findOne({ id: event.id });
      
      if (!existingEvent) {
        await eventsCollection.insertOne(event);
        console.log(`✅ Added event: ${event.title}`);
        newEventsCount++;
      } else {
        console.log(`⚠️ Duplicate event: ${event.title}`);
      }
    }
    
    console.log(`📊 Successfully added ${newEventsCount} new Poetry Jazz Cafe events`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  } finally {
    // Close the MongoDB connection
    await client.close();
    console.log('✅ MongoDB connection closed');
    console.log('✅ Poetry Jazz Cafe scraper completed.');
  }
}

// Execute the main function
scrapePoetryJazzCafeEvents();
