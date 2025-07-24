/**
 * Old Town Toronto Events Scraper
 * 
 * This script extracts events from the Old Town Toronto events page
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
const BASE_URL = 'https://oldtowntoronto.ca';
const EVENTS_URL = 'https://oldtowntoronto.ca/events/';

// Venue information for Old Town Toronto (general location)
const OLDTOWN_VENUE = {
  name: 'Old Town Toronto',
  address: 'St. Lawrence Market Neighbourhood, Toronto, ON',
  city: 'Toronto',
  province: 'ON',
  country: 'Canada',
  postalCode: 'M5E 1C3',
  coordinates: {
    latitude: 43.6505,
    longitude: -79.3705
  }
};

// Common venues in Old Town Toronto area
const OLDTOWN_VENUES = {
  'st. lawrence market': {
    name: 'St. Lawrence Market',
    address: '93 Front St E, Toronto, ON M5E 1C3',
    city: 'Toronto',
    province: 'ON',
    country: 'Canada',
    postalCode: 'M5E 1C3',
    coordinates: {
      latitude: 43.6497,
      longitude: -79.3719
    }
  },
  'st lawrence market': {
    name: 'St. Lawrence Market',
    address: '93 Front St E, Toronto, ON M5E 1C3',
    city: 'Toronto',
    province: 'ON',
    country: 'Canada',
    postalCode: 'M5E 1C3',
    coordinates: {
      latitude: 43.6497,
      longitude: -79.3719
    }
  },
  'berczy park': {
    name: 'Berczy Park',
    address: '35 Wellington St E, Toronto, ON M5E 1C6',
    city: 'Toronto',
    province: 'ON',
    country: 'Canada',
    postalCode: 'M5E 1C6',
    coordinates: {
      latitude: 43.6489,
      longitude: -79.3749
    }
  },
  'st. james cathedral': {
    name: 'St. James Cathedral',
    address: '106 King St E, Toronto, ON M5C 2E9',
    city: 'Toronto',
    province: 'ON',
    country: 'Canada',
    postalCode: 'M5C 2E9',
    coordinates: {
      latitude: 43.6505,
      longitude: -79.3735
    }
  },
  'st james cathedral': {
    name: 'St. James Cathedral',
    address: '106 King St E, Toronto, ON M5C 2E9',
    city: 'Toronto',
    province: 'ON',
    country: 'Canada',
    postalCode: 'M5C 2E9',
    coordinates: {
      latitude: 43.6505,
      longitude: -79.3735
    }
  },
  'sony centre': {
    name: 'Meridian Hall (formerly Sony Centre)',
    address: '1 Front St E, Toronto, ON M5E 1B2',
    city: 'Toronto',
    province: 'ON',
    country: 'Canada',
    postalCode: 'M5E 1B2',
    coordinates: {
      latitude: 43.6478,
      longitude: -79.3751
    }
  },
  'meridian hall': {
    name: 'Meridian Hall (formerly Sony Centre)',
    address: '1 Front St E, Toronto, ON M5E 1B2',
    city: 'Toronto',
    province: 'ON',
    country: 'Canada',
    postalCode: 'M5E 1B2',
    coordinates: {
      latitude: 43.6478,
      longitude: -79.3751
    }
  }
};

// Categories for Old Town events
const OLDTOWN_CATEGORIES = ['toronto', 'old town', 'st lawrence', 'community', 'culture'];

// Function to generate a unique ID for events
function generateEventId(title, startDate) {
  const dateStr = startDate instanceof Date ? startDate.toISOString() : new Date().toISOString();
  const data = `oldtown-${title}-${dateStr}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

// Function to extract venue information from event text
function extractVenue(title, description, location) {
  // Try to get the venue from the provided location first
  if (location) {
    const locationLower = location.toLowerCase();
    
    // Check known venues
    for (const [keyword, venue] of Object.entries(OLDTOWN_VENUES)) {
      if (locationLower.includes(keyword)) {
        return venue;
      }
    }
  }
  
  // Try to extract from title and description
  const textToSearch = `${title} ${description}`.toLowerCase();
  
  for (const [keyword, venue] of Object.entries(OLDTOWN_VENUES)) {
    if (textToSearch.includes(keyword)) {
      return venue;
    }
  }
  
  // Return default venue if no specific venue found
  return OLDTOWN_VENUE;
}

// Function to parse date strings from the website
function parseOldTownDate(dateStr) {
  if (!dateStr) return { startDate: new Date(), endDate: new Date() };
  
  try {
    // Remove any HTML tags
    dateStr = dateStr.replace(/<[^>]*>/g, '').trim();
    
    // Common patterns on Old Town Toronto website:
    // "July 25, 2025" (single day)
    // "July 25 - August 30, 2025" (date range)
    // "July 25, 2025 @ 6:30 PM" (with time)
    
    let startDate, endDate;
    
    // Check for time information (Old Town site often uses @ for time)
    const hasTime = dateStr.includes('@') || dateStr.includes('at') || dateStr.includes('PM') || dateStr.includes('AM');
    let timeStr = '';
    
    if (hasTime) {
      if (dateStr.includes('@')) {
        const parts = dateStr.split('@');
        dateStr = parts[0].trim();
        timeStr = parts[1].trim();
      } else if (dateStr.includes('at')) {
        const parts = dateStr.split('at');
        dateStr = parts[0].trim();
        timeStr = parts[1].trim();
      } else {
        // Try to extract time if formatted differently
        const timeParts = dateStr.match(/(\d{1,2}:\d{2}\s*(AM|PM|am|pm))/i);
        if (timeParts) {
          timeStr = timeParts[0];
          dateStr = dateStr.replace(timeStr, '').trim();
        }
      }
    }
    
    // Check if it's a date range
    if (dateStr.includes(' - ') || dateStr.includes(' to ')) {
      const separator = dateStr.includes(' - ') ? ' - ' : ' to ';
      const [startStr, endStr] = dateStr.split(separator).map(d => d.trim());
      
      // Handle case where end date doesn't include year or month
      if (!endStr.includes(',') && startStr.includes(',')) {
        // End date might be missing year or month
        const startParts = startStr.split(' ');
        const startYear = startParts[startParts.length - 1];
        const startMonth = startParts[0];
        
        if (endStr.includes(' ')) {
          // Has month and day but no year (e.g., "July 25 - August 30, 2025")
          startDate = new Date(startStr);
          endDate = new Date(`${endStr}, ${startYear}`);
        } else {
          // Only has day (e.g., "July 25 - 30, 2025")
          startDate = new Date(startStr);
          endDate = new Date(`${startMonth} ${endStr}, ${startYear}`);
        }
      } else {
        // Both dates are complete
        startDate = new Date(startStr);
        endDate = new Date(endStr);
      }
    } else {
      // Single day event
      startDate = new Date(dateStr);
      endDate = new Date(dateStr);
      
      // Set end time to end of day if no specific time
      if (!timeStr) {
        endDate.setHours(23, 59, 59);
      }
    }
    
    // Add time information if available
    if (timeStr) {
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3].toUpperCase();
        
        // Convert to 24-hour format
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        startDate.setHours(hours, minutes, 0);
        
        // Set end time 2 hours after start if not a date range
        if (dateStr.indexOf('-') === -1 && dateStr.indexOf('to') === -1) {
          endDate = new Date(startDate);
          endDate.setHours(startDate.getHours() + 2);
        }
      }
    }
    
    return { startDate, endDate };
  } catch (error) {
    console.error(`❌ Error parsing date: ${dateStr}`, error);
    // Return current date as fallback
    const now = new Date();
    const later = new Date(now);
    later.setHours(later.getHours() + 2);
    return { startDate: now, endDate: later };
  }
}

// Extract categories from event text
function extractCategories(title, description) {
  const textToSearch = `${title} ${description}`.toLowerCase();
  const categories = [...OLDTOWN_CATEGORIES]; // Start with default categories
  
  // Add specific categories based on keywords
  if (textToSearch.includes('market') || textToSearch.includes('shop') || textToSearch.includes('vendor')) 
    categories.push('shopping');
  if (textToSearch.includes('food') || textToSearch.includes('dining') || textToSearch.includes('restaurant') || textToSearch.includes('taste')) 
    categories.push('food');
  if (textToSearch.includes('music') || textToSearch.includes('concert') || textToSearch.includes('band') || textToSearch.includes('performance')) 
    categories.push('music');
  if (textToSearch.includes('art') || textToSearch.includes('gallery') || textToSearch.includes('exhibit')) 
    categories.push('art');
  if (textToSearch.includes('history') || textToSearch.includes('heritage') || textToSearch.includes('tour')) 
    categories.push('history');
  if (textToSearch.includes('family') || textToSearch.includes('kid') || textToSearch.includes('children')) 
    categories.push('family');
  if (textToSearch.includes('festival') || textToSearch.includes('celebration') || textToSearch.includes('party')) 
    categories.push('festival');
  
  // Remove duplicates
  return [...new Set(categories)];
}

// Extract price information
function extractPrice(text) {
  if (!text) return 'Free';
  
  text = text.toLowerCase();
  
  if (text.includes('free')) return 'Free';
  
  // Look for price patterns like $10, $10-$20, etc.
  const priceMatch = text.match(/\$(\d+)(?:\s*-\s*\$(\d+))?/);
  if (priceMatch) {
    if (priceMatch[2]) {
      return `$${priceMatch[1]}-$${priceMatch[2]}`;
    } else {
      return `$${priceMatch[1]}`;
    }
  }
  
  return 'See website for details';
}

// Main function to fetch and process Old Town Toronto events
async function scrapeOldTownEvents() {
  let addedEvents = 0;
  
  try {
    console.log('🚀 Starting Old Town Toronto events scraper');
    
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    // Fetch the events page
    console.log('🔍 Fetching Old Town Toronto events page...');
    const response = await axios.get(EVENTS_URL);
    const $ = cheerio.load(response.data);
    
    // Look for event containers - adjust selectors based on page structure
    const eventElements = $('.event, .tribe-events-list-event, .tribe-event-article, article.type-tribe_events, .type-event, .events-list .event, .events-list-item');
    
    console.log(`🔍 Found ${eventElements.length} event elements`);
    
    if (eventElements.length > 0) {
      // Process each event
      for (let i = 0; i < eventElements.length; i++) {
        try {
          const element = eventElements.eq(i);
          
          // Extract event data
          const titleElement = element.find('h2, h3, h4, .event-title, .tribe-events-list-event-title');
          let title = titleElement.text().trim();
          if (!title) title = element.find('a[href*="event"]').first().text().trim() || 'Old Town Toronto Event';
          
          // Get description
          let description = element.find('.description, .tribe-events-list-event-description, .event-description, .summary, .event-content').text().trim();
          if (!description) description = 'Visit the Old Town Toronto website for more details about this event.';
          
          // Get image
          let imageUrl = '';
          const imgElement = element.find('img');
          if (imgElement.length > 0) {
            imageUrl = imgElement.attr('src') || imgElement.attr('data-src') || '';
            
            // Ensure URL is absolute
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('/') ? `${BASE_URL}${imageUrl}` : `${BASE_URL}/${imageUrl}`;
            }
          }
          
          // Get event URL
          let eventUrl = '';
          if (titleElement.find('a').length > 0) {
            eventUrl = titleElement.find('a').attr('href') || '';
          } else {
            const linkElement = element.find('a[href*="event"]');
            if (linkElement.length > 0) {
              eventUrl = linkElement.attr('href') || '';
            }
          }
          
          // Ensure URL is absolute
          if (eventUrl && !eventUrl.startsWith('http')) {
            eventUrl = eventUrl.startsWith('/') ? `${BASE_URL}${eventUrl}` : `${BASE_URL}/${eventUrl}`;
          }
          
          // Get date information
          let dateText = element.find('.date, .tribe-event-date-start, .tribe-event-date, .tribe-events-start-date, time, .event-date').text().trim();
          const { startDate, endDate } = parseOldTownDate(dateText);
          
          // Get location/venue information
          let locationText = element.find('.location, .tribe-events-venue-details, .venue, .event-venue').text().trim();
          const venue = extractVenue(title, description, locationText);
          
          // Get price information
          let priceText = element.find('.price, .cost, .fee, .tribe-events-cost').text().trim();
          const price = extractPrice(priceText || description);
          
          // Generate event categories
          const categories = extractCategories(title, description);
          
          // Generate unique ID for the event
          const id = generateEventId(title, startDate);
          
          // Create the formatted event object
          const formattedEvent = {
            id: id,
            title: `Toronto - ${title}`,
            description: description,
            categories: categories,
            startDate: startDate,
            endDate: endDate,
            venue: venue,
            imageUrl: imageUrl,
            officialWebsite: eventUrl || EVENTS_URL,
            price: price,
            sourceURL: EVENTS_URL,
            lastUpdated: new Date()
          };
          
          // Check if event already exists to prevent duplicates
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
            // Insert the new event
            await eventsCollection.insertOne(formattedEvent);
            addedEvents++;
            console.log(`✅ Added event: ${formattedEvent.title}`);
          } else {
            console.log(`⏭️ Skipped duplicate event: ${formattedEvent.title}`);
          }
        } catch (eventError) {
          console.error(`❌ Error processing event:`, eventError);
        }
      }
    }
    
    // If no events found or few events found, try alternative approach
    if (addedEvents < 3) {
      console.log('⚠️ Few or no events found with primary selectors, trying alternative approach...');
      
      // Try different selector patterns
      const alternativeSelectors = [
        '.type-tribe_events',
        '.events-archive article',
        '.eventlist-event',
        '.calendar-event',
        'article[class*="event"]',
        '.post[class*="event"]',
        'div[class*="event-"]',
        '.event-listing'
      ];
      
      let events = [];
      
      for (const selector of alternativeSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          console.log(`🔍 Found ${elements.length} events with selector: ${selector}`);
          
          elements.each((i, el) => {
            const element = $(el);
            
            // Extract event data
            const title = element.find('h2, h3, h4, .title, [class*="title"], a').first().text().trim() || 'Old Town Toronto Event';
            const description = element.find('p, .description, [class*="description"], .summary, .content').text().trim() || 
                               'Visit the Old Town Toronto website for more details.';
            
            // Get image
            let imageUrl = '';
            const img = element.find('img');
            if (img.length > 0) {
              imageUrl = img.attr('src') || img.attr('data-src') || '';
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = imageUrl.startsWith('/') ? `${BASE_URL}${imageUrl}` : `${BASE_URL}/${imageUrl}`;
              }
            }
            
            // Get URL
            let eventUrl = '';
            const a = element.find('a');
            if (a.length > 0) {
              eventUrl = a.attr('href') || '';
              if (eventUrl && !eventUrl.startsWith('http')) {
                eventUrl = eventUrl.startsWith('/') ? `${BASE_URL}${eventUrl}` : `${BASE_URL}/${eventUrl}`;
              }
            }
            
            // Get date
            const dateText = element.find('.date, [class*="date"], time, [class*="time"]').text().trim();
            
            // Get location
            const locationText = element.find('.venue, .location, [class*="venue"], [class*="location"]').text().trim();
            
            events.push({
              title,
              description,
              imageUrl,
              eventUrl,
              dateText,
              locationText
            });
          });
          
          if (events.length > 0) break;
        }
      }
      
      // If still no events, look for event links
      if (events.length === 0) {
        console.log('⚠️ Still no events found, looking for event links...');
        
        // Try to find links to individual event pages
        $('a').each((i, el) => {
          const element = $(el);
          const href = element.attr('href') || '';
          const text = element.text().trim();
          
          // Skip navigation or generic links
          if (text.toLowerCase().includes('next') || 
              text.toLowerCase().includes('previous') ||
              text.toLowerCase().includes('home') ||
              text.toLowerCase() === 'events') return;
          
          // Look for links that might be events
          if ((href.includes('event') || href.includes('festival') || href.includes('market')) && text) {
            events.push({
              title: text,
              description: 'Visit the Old Town Toronto website for more details about this event.',
              imageUrl: '',
              eventUrl: href.startsWith('http') ? href : href.startsWith('/') ? `${BASE_URL}${href}` : `${BASE_URL}/${href}`,
              dateText: '',
              locationText: ''
            });
          }
        });
        
        // Filter out duplicates by title
        const uniqueTitles = new Set();
        events = events.filter(event => {
          if (uniqueTitles.has(event.title)) return false;
          uniqueTitles.add(event.title);
          return true;
        });
      }
      
      console.log(`🔍 Found ${events.length} events using alternative methods`);
      
      // Process these events
      for (const event of events) {
        try {
          // Set default dates if not found (next week)
          const now = new Date();
          const futureDate = new Date();
          futureDate.setDate(now.getDate() + 7);
          
          const { startDate, endDate } = event.dateText ? 
            parseOldTownDate(event.dateText) : 
            { startDate: now, endDate: futureDate };
          
          // Get venue information
          const venue = extractVenue(event.title, event.description, event.locationText);
          
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
            venue: venue,
            imageUrl: event.imageUrl,
            officialWebsite: event.eventUrl || EVENTS_URL,
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
        } catch (eventError) {
          console.error(`❌ Error processing alternative event:`, eventError);
        }
      }
    }
    
    console.log(`📊 Successfully added ${addedEvents} new Old Town Toronto events`);
    
  } catch (error) {
    console.error('❌ Error scraping Old Town Toronto events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeOldTownEvents()
  .then(addedEvents => {
    console.log(`✅ Old Town Toronto scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Old Town Toronto scraper:', error);
    process.exit(1);
  });
