/**
 * MOCA Toronto Events Scraper
 * 
 * This script extracts events from the Museum of Contemporary Art Toronto website
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
const BASE_URL = 'https://moca.ca';
const EVENTS_URL = 'https://moca.ca/events/';

// Venue information for MOCA Toronto
const MOCA_VENUE = {
  name: 'Museum of Contemporary Art Toronto',
  address: '158 Sterling Road, Toronto, ON M6R 2B7',
  city: 'Toronto',
  province: 'ON',
  country: 'Canada',
  postalCode: 'M6R 2B7',
  coordinates: {
    latitude: 43.65438,
    longitude: -79.44235
  }
};

// Categories that are likely for MOCA events
const ART_CATEGORIES = ['art', 'exhibition', 'culture', 'museum', 'toronto'];

// Function to generate a unique ID for events
function generateEventId(title, startDate) {
  const dateStr = startDate instanceof Date ? startDate.toISOString() : new Date().toISOString();
  const data = `moca-${title}-${dateStr}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

// Function to parse date text into JavaScript Date objects
function parseDateText(dateText) {
  // Default to current date range if no dateText provided
  if (!dateText) {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 2);  // Default 2 month exhibition
    return { startDate: now, endDate };
  }
  
  // Clean and normalize the date text
  dateText = dateText.trim().replace(/\s+/g, ' ');
  
  // First, check for specific MOCA date formats
  // Format: "Month Day – Month Day, Year" (e.g., "June 1 – September 2, 2023")
  const rangePattern = /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\s*[–\-]\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))/i;
  
  // Format: "Month Day, Year – Month Day, Year"
  const fullRangePattern = /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?\s*[–\-]\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))/i;
  
  // Format: "Month Day, Year" (single date)
  const singleDatePattern = /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})/i;
  
  let startDate = null;
  let endDate = null;
  
  // Try the range pattern first (most specific)
  const rangeMatch = dateText.match(rangePattern);
  if (rangeMatch) {
    const startMonth = rangeMatch[1];
    const startDay = rangeMatch[2];
    const endMonth = rangeMatch[3];
    const endDay = rangeMatch[4];
    const year = rangeMatch[5];
    
    startDate = new Date(`${startMonth} ${startDay}, ${year}`);
    endDate = new Date(`${endMonth} ${endDay}, ${year}`);
  }
  
  // Try the full range pattern
  if (!startDate) {
    const fullRangeMatch = dateText.match(fullRangePattern);
    if (fullRangeMatch) {
      const startMonth = fullRangeMatch[1];
      const startDay = fullRangeMatch[2];
      const startYear = fullRangeMatch[3] || new Date().getFullYear();
      const endMonth = fullRangeMatch[4];
      const endDay = fullRangeMatch[5];
      const endYear = fullRangeMatch[6] || startYear;
      
      startDate = new Date(`${startMonth} ${startDay}, ${startYear}`);
      endDate = new Date(`${endMonth} ${endDay}, ${endYear}`);
    }
  }
  
  // Try the single date pattern
  if (!startDate) {
    const singleMatch = dateText.match(singleDatePattern);
    if (singleMatch) {
      const month = singleMatch[1];
      const day = singleMatch[2];
      const year = singleMatch[3];
      
      startDate = new Date(`${month} ${day}, ${year}`);
      
      // If we have a single date and text suggests exhibition, make it a longer event
      if (dateText.toLowerCase().includes('exhibition') || dateText.toLowerCase().includes('show')) {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 2);  // 2 month exhibition by default
      } else {
        // For regular events, same day
        endDate = new Date(startDate);
      }
    }
  }
  
  // If all pattern matching failed, try direct parsing
  if (!startDate) {
    try {
      startDate = new Date(dateText);
      if (isNaN(startDate.getTime())) {
        // If direct parsing failed, fall back to current date
        startDate = new Date();
      }
      
      // Default end date based on context
      endDate = new Date(startDate);
      if (dateText.toLowerCase().includes('exhibition')) {
        endDate.setMonth(endDate.getMonth() + 2);  // Exhibition-like events last longer
      }
    } catch (e) {
      console.error(`❌ Failed to parse date text: ${dateText}`);
      const now = new Date();
      startDate = now;
      endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);  // Default 1 month
    }
  }
  
  // Final validity check
  if (!startDate || isNaN(startDate.getTime())) {
    startDate = new Date();
  }
  if (!endDate || isNaN(endDate.getTime())) {
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
  }
  
  return { startDate, endDate };
}

// Function to extract price information
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

// Function to extract categories based on event text
function extractCategories(title, description) {
  const textToSearch = `${title} ${description}`.toLowerCase();
  const categories = [...ART_CATEGORIES]; // Start with default categories
  
  // Add specific categories based on keywords
  if (textToSearch.includes('workshop')) categories.push('workshop');
  if (textToSearch.includes('talk') || textToSearch.includes('lecture')) categories.push('talk');
  if (textToSearch.includes('family') || textToSearch.includes('kid') || textToSearch.includes('children')) categories.push('family');
  if (textToSearch.includes('film') || textToSearch.includes('movie') || textToSearch.includes('screening')) categories.push('film');
  if (textToSearch.includes('performance') || textToSearch.includes('dance')) categories.push('performance');
  if (textToSearch.includes('music') || textToSearch.includes('concert')) categories.push('music');
  
  // Remove duplicates
  return [...new Set(categories)];
}

// Function to check if title appears to be a navigation menu item
function isNavigationItem(title) {
  // Convert title to lowercase for case-insensitive comparison
  const lowerTitle = title.toLowerCase();
  
  // List of common navigation/menu item terms
  const navigationTerms = [
    'learn more', 'events calendar', 'events & public', 'exhibitions', 'projects', 
    'doors open', 'menu', 'navigation', 'home', 'about', 'plan your visit', 
    'explore', 'donate', 'support', 'contact', 'search', 'press', 'accessibility',
    'membership', 'shop', 'calendar', 'programme', 'community', 'visit', 'school',
    'teacher', 'education', 'learn', 'youth council', 'main menu', 'submenu'
  ];
  
  // Check if title is too short or is just a single word (likely a header)
  if (title.length < 5 || !title.includes(' ')) {
    return true;
  }
  
  // Return true if the title contains any navigation terms
  return navigationTerms.some(term => lowerTitle.includes(term)) || 
         // Also filter out if title is just 'Events' or 'Exhibitions'
         lowerTitle === 'events' || 
         lowerTitle === 'exhibitions';
}

// Main function to fetch and process MOCA events
async function scrapeMocaEvents() {
  let addedEvents = 0;
  try {
    console.log('🔍 Starting MOCA event scraper...');
    
    // Connect to MongoDB
    const client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db('discovr');
    const eventsCollection = database.collection('events');
    
    // URLs to scrape - both events and exhibitions
    const urlsToScrape = [
      `${BASE_URL}/events/`,
      `${BASE_URL}/exhibitions/`,
      `${BASE_URL}/exhibitions/current/`
    ];
    
    let events = [];
    
    // Scrape each URL
    for (const url of urlsToScrape) {
      console.log(`🔍 Scraping ${url}...`);
      
      try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        
        // Look for articles, posts, cards or grid items with content
        const contentSelectors = [
          '.elementor-posts-container .elementor-post',
          '.elementor-grid .elementor-grid-item',
          '.event-grid .event-item',
          '.program-grid .program-item',
          '.exhibition-item',
          '.elementor-widget-container article',
          '.card, .post',
          '[class*="event-"]',
          '[class*="exhibition-"]'
        ];
        
        for (const selector of contentSelectors) {
          const elements = $(selector);
          
          if (elements.length > 0) {
            console.log(`✅ Found ${elements.length} elements with selector: ${selector} at ${url}`);
            
            elements.each((i, el) => {
              // Try multiple selector patterns for title, description, etc.
              const titleElement = $(el).find('h1, h2, h3, h4, .title, [class*="title"]').first();
              const title = titleElement.text().trim();
              
              // Get description - try multiple patterns
              const descriptionElement = $(el).find('p, .description, .excerpt, .content, [class*="description"], [class*="content"]').first();
              const description = descriptionElement.text().trim();
              
              // Get image
              const imgElement = $(el).find('img');
              const imageUrl = imgElement.attr('src') || imgElement.attr('data-src') || '';
              
              // Get event URL
              const linkElement = titleElement.parent('a') || titleElement.find('a') || $(el).find('a').first();
              const eventUrl = (linkElement.attr('href') || '').startsWith('http') 
                ? linkElement.attr('href') 
                : `${BASE_URL}${linkElement.attr('href')}` || url;
              
              // Get date text
              const dateElement = $(el).find('.date, [class*="date"], time, .datetime, [class*="time"]').first();
              const dateText = dateElement.text().trim();
              
              // Only add if title exists and is not a navigation item
              if (title && !isNavigationItem(title)) {
                // Check for duplicates before adding
                if (!events.some(e => e.title === title)) {
                  events.push({
                    title,
                    description,
                    imageUrl,
                    eventUrl,
                    dateText
                  });
                }
              }
            });
          }
        }
      } catch (error) {
        console.error(`❌ Error scraping ${url}: ${error.message}`);
      }
    }
    
    // If no events found with primary scraping, try alternative methods
    if (events.length === 0) {
      console.log('⚠️ No events found with primary scraping, trying deep page parsing...');
      
      // Additional URLs for deep scraping
      const deepScrapeUrls = [
        `${BASE_URL}/programmes/`,
        `${BASE_URL}/learn/`,
        `${BASE_URL}/exhibitions/upcoming/`
      ];
      
      // Deep scrape looks at broader content patterns
      for (const url of deepScrapeUrls) {
        try {
          console.log(`🔍 Deep scraping: ${url}`);
          const response = await axios.get(url);
          const $ = cheerio.load(response.data);
          
          // Look for any content blocks that might represent events or exhibitions
          const contentBlocks = $('div, section, article').filter(function() {
            const html = $(this).html().toLowerCase();
            // Look for blocks that likely contain event info
            return (html.includes('date') || html.includes('time')) &&
                   (html.includes('exhibition') || html.includes('event') || 
                    html.includes('workshop') || html.includes('program'));
          });
          
          console.log(`🔍 Found ${contentBlocks.length} potential content blocks at ${url}`);
          
          contentBlocks.each((i, block) => {
            // Look for headings within this content block
            const title = $(block).find('h1, h2, h3, h4, h5, strong').first().text().trim();
            
            // Skip navigation items and empty titles
            if (!title || isNavigationItem(title)) return;
            
            // Get the most substantial paragraph as description
            const allParagraphs = $(block).find('p');
            let description = '';
            let maxLength = 0;
            
            allParagraphs.each((j, p) => {
              const text = $(p).text().trim();
              if (text.length > maxLength) {
                maxLength = text.length;
                description = text;
              }
            });
            
            // Get image if available
            const imageUrl = $(block).find('img').attr('src') || '';
            
            // Get link if available
            const eventUrl = $(block).find('a').attr('href') || url;
            
            // Look for date patterns
            const datePattern = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*[-–—]\s*\d{1,2}(?:st|nd|rd|th)?)?\s*,?\s*\d{4}|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}/i;
            
            const blockText = $(block).text();
            const dateMatch = blockText.match(datePattern);
            const dateText = dateMatch ? dateMatch[0] : '';
            
            // Check for duplicates before adding
            if (!events.some(e => e.title === title)) {
              events.push({
                title,
                description,
                imageUrl,
                eventUrl,
                dateText
              });
            }
          });
        } catch (err) {
          console.error(`❌ Error deep scraping ${url}: ${err.message}`);
        }
      }
    }
    
    // If still no events found, log but do not create sample events
    if (events.length === 0) {
      console.log('⚠️ No events were found on the MOCA website.');
    }
    
    console.log(`🔍 Found ${events.length} events using alternative methods`);
    
    // Process these events
    for (const event of events) {
      try {
        // Use provided dates if available, otherwise set default dates
        let startDate, endDate;
        
        if (event.startDate && event.endDate) {
          // If the event already has dates (from sample events)
          startDate = event.startDate;
          endDate = event.endDate;
        } else if (event.dateText) {
          // Try to parse dates from text
          const parsedDates = parseDateText(event.dateText);
          startDate = parsedDates.startDate;
          endDate = parsedDates.endDate;
        } else {
          // Default dates (current date + exhibition-length period)
          const now = new Date();
          const futureDate = new Date();
          futureDate.setDate(now.getDate() + 60); // Most exhibitions run for a couple of months
          startDate = now;
          endDate = futureDate;
        }
        
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
          venue: MOCA_VENUE,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || `${BASE_URL}/events/`,
          price: 'See website for details',
          sourceURL: `${BASE_URL}/events/`,
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
          console.log(`✅ Added event: ${formattedEvent.title}`);
        } else {
          console.log(`⏭️ Skipped duplicate event: ${formattedEvent.title}`);
        }
      } catch (eventError) {
        console.error(`❌ Error processing alternative event:`, eventError);
      }
    }
    
    // Display results
    console.log(`🔍 Found ${events.length} events using alternative methods`);
      
    // Process these events
    for (const event of events) {
      try {
        // Use provided dates if available, otherwise set default dates
        let startDate, endDate;
        
        if (event.startDate && event.endDate) {
          // If the event already has dates (from sample events)
          startDate = event.startDate;
          endDate = event.endDate;
        } else if (event.dateText) {
          // Try to parse dates from text
          const parsedDates = parseDateText(event.dateText);
          startDate = parsedDates.startDate;
          endDate = parsedDates.endDate;
        } else {
          // Default dates (current date + exhibition-length period)
          const now = new Date();
          const futureDate = new Date();
          futureDate.setDate(now.getDate() + 60); // Most exhibitions run for a couple of months
          startDate = now;
          endDate = futureDate;
        }
        
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
          venue: MOCA_VENUE,
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
    
    console.log(`📊 Successfully added ${addedEvents} new MOCA events`);
    
  } catch (error) {
    console.error('❌ Error scraping MOCA events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeMocaEvents()
  .then(addedEvents => {
    console.log(`✅ MOCA scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running MOCA scraper:', error);
    process.exit(1);
  });
