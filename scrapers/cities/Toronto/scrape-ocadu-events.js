/**
 * OCAD University Events Scraper
 * 
 * This script extracts events from the OCAD University "What's On" page
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
const BASE_URL = 'https://www.ocadu.ca';
const EVENTS_URL = 'https://www.ocadu.ca/whats-on';

// Venue information for OCAD University
const OCADU_VENUE = {
  name: 'OCAD University',
  address: '100 McCaul St, Toronto, ON M5T 1W1',
  city: 'Toronto',
  province: 'ON',
  country: 'Canada',
  postalCode: 'M5T 1W1',
  coordinates: {
    latitude: 43.6532,
    longitude: -79.3911
  }
};

// Categories that are likely for OCADU events
const OCADU_CATEGORIES = ['art', 'design', 'education', 'exhibition', 'culture', 'toronto'];

// Function to generate a unique ID for events
function generateEventId(title, startDate) {
  const dateStr = startDate instanceof Date ? startDate.toISOString() : new Date().toISOString();
  const data = `ocadu-${title}-${dateStr}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

// Function to parse date strings from the website
function parseOcaduDate(dateStr) {
  if (!dateStr) return { startDate: new Date(), endDate: new Date() };
  
  try {
    // Remove any HTML tags
    dateStr = dateStr.replace(/<[^>]*>/g, '').trim();
    
    // Common patterns on OCADU website:
    // "July 25, 2025" (single day)
    // "July 25 - August 30, 2025" (date range)
    // "July 25, 2025 | 6:30 PM" (with time)
    
    let startDate, endDate;
    
    // Check for time information
    const hasTime = dateStr.includes('|') || dateStr.includes('PM') || dateStr.includes('AM');
    let timeStr = '';
    
    if (hasTime) {
      const parts = dateStr.split('|');
      if (parts.length > 1) {
        dateStr = parts[0].trim();
        timeStr = parts[1].trim();
      } else {
        // Try to extract time if formatted differently
        const timeParts = dateStr.match(/(\d{1,2}:\d{2}\s*(AM|PM))/i);
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

// Extract categories based on event text
function extractCategories(title, description) {
  const textToSearch = `${title} ${description}`.toLowerCase();
  const categories = [...OCADU_CATEGORIES]; // Start with default categories
  
  // Add specific categories based on keywords
  if (textToSearch.includes('workshop') || textToSearch.includes('class')) categories.push('workshop');
  if (textToSearch.includes('talk') || textToSearch.includes('lecture') || textToSearch.includes('panel')) categories.push('talk');
  if (textToSearch.includes('family') || textToSearch.includes('kid') || textToSearch.includes('children')) categories.push('family');
  if (textToSearch.includes('film') || textToSearch.includes('movie') || textToSearch.includes('screening')) categories.push('film');
  if (textToSearch.includes('performance') || textToSearch.includes('dance')) categories.push('performance');
  if (textToSearch.includes('music') || textToSearch.includes('concert')) categories.push('music');
  if (textToSearch.includes('alumni') || textToSearch.includes('graduate')) categories.push('education');
  
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

// Main function to fetch and process OCADU events
async function scrapeOcaduEvents() {
  let addedEvents = 0;
  
  try {
    console.log('🚀 Starting OCAD University events scraper');
    
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    // Fetch the events page
    console.log('🔍 Fetching OCADU events page...');
    const response = await axios.get(EVENTS_URL);
    const $ = cheerio.load(response.data);
    
    // Look for event containers - adjust selectors based on page structure
    const eventElements = $('.event-listing, .event-item, .events-list li, .whats-on-list li, article.event, .teaser-list .teaser');
    console.log(`🔍 Found ${eventElements.length} event elements`);
    
    if (eventElements.length > 0) {
      // Process each event
      for (let i = 0; i < eventElements.length; i++) {
        try {
          const element = eventElements.eq(i);
          
          // Extract event data
          const title = element.find('h2, h3, h4, .title, .event-title').first().text().trim() || 
                         element.find('a').first().text().trim();
          
          if (!title) continue; // Skip if no title found
          
          let description = element.find('.description, .summary, p, .event-description').text().trim();
          if (!description) description = 'Visit the OCAD University website for more details about this event.';
          
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
          const linkElement = element.find('a');
          if (linkElement.length > 0) {
            eventUrl = linkElement.attr('href') || '';
            
            // Ensure URL is absolute
            if (eventUrl && !eventUrl.startsWith('http')) {
              eventUrl = eventUrl.startsWith('/') ? `${BASE_URL}${eventUrl}` : `${BASE_URL}/${eventUrl}`;
            }
          }
          
          // Get date information
          let dateText = element.find('.date, time, .datetime, .event-date').text().trim();
          const { startDate, endDate } = parseOcaduDate(dateText);
          
          // Get price information
          let priceText = element.find('.price, .cost, .fee').text().trim();
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
            venue: OCADU_VENUE,
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
    } else {
      // If no events found with primary selectors, try alternative approach
      console.log('⚠️ No events found with primary selectors, trying alternative approach...');
      
      // Try different selector patterns
      const alternativeSelectors = [
        '.views-row',
        '.view-content .item',
        '.content-list li',
        '.node-event',
        '[data-type="event"]',
        '.upcoming-events li',
        '.item-list li',
        '.list-item',
        'div[class*="event"]'
      ];
      
      let events = [];
      
      for (const selector of alternativeSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          console.log(`🔍 Found ${elements.length} events with selector: ${selector}`);
          
          elements.each((i, el) => {
            const element = $(el);
            
            // Extract event data
            const title = element.find('h2, h3, h4, .title, [class*="title"], a').first().text().trim() || 'OCAD University Event';
            const description = element.find('p, .description, [class*="description"], .field-content').text().trim() || 
                               'Visit the OCAD University website for more details.';
            
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
            const dateText = element.find('.date, [class*="date"], time, .datetime, [class*="time"]').text().trim();
            
            events.push({
              title,
              description,
              imageUrl,
              eventUrl,
              dateText
            });
          });
          
          if (events.length > 0) break;
        }
      }
      
      // If still no events, try to find event links
      if (events.length === 0) {
        console.log('⚠️ Still no events found, looking for event links...');
        
        $('a').each((i, el) => {
          const element = $(el);
          const href = element.attr('href') || '';
          const text = element.text().trim();
          
          // Skip navigation or generic links
          if (text.toLowerCase().includes('next') || 
              text.toLowerCase().includes('previous') ||
              text.toLowerCase().includes('home') ||
              text.toLowerCase() === 'events' ||
              text.toLowerCase() === 'what\'s on') return;
          
          // Look for links that might be events
          if ((href.includes('event') || href.includes('exhibition') || href.includes('lecture') || 
               href.includes('workshop') || href.includes('show')) && text) {
            
            events.push({
              title: text,
              description: 'Visit the OCAD University website for more details about this event.',
              imageUrl: '',
              eventUrl: href.startsWith('http') ? href : href.startsWith('/') ? `${BASE_URL}${href}` : `${BASE_URL}/${href}`,
              dateText: ''
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
            parseOcaduDate(event.dateText) : 
            { startDate: now, endDate: futureDate };
          
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
            venue: OCADU_VENUE,
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
    
    console.log(`📊 Successfully added ${addedEvents} new OCADU events`);
    
  } catch (error) {
    console.error('❌ Error scraping OCADU events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeOcaduEvents()
  .then(addedEvents => {
    console.log(`✅ OCADU scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running OCADU scraper:', error);
    process.exit(1);
  });
