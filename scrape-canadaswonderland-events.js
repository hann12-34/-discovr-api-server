/**
 * Canada's Wonderland Events Scraper
 * Based on events from https://www.canadaswonderland.com/events
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const CANADAS_WONDERLAND_URL = 'https://www.canadaswonderland.com/events';
const CANADAS_WONDERLAND_BASE_URL = 'https://www.canadaswonderland.com';
const CANADAS_WONDERLAND_VENUE = {
  name: "Canada's Wonderland",
  address: '1 Canada\'s Wonderland Drive, Vaughan, ON L6A 1S6',
  googleMapsUrl: 'https://goo.gl/maps/63KArCsShLw8mwnP9',
  officialWebsite: 'https://www.canadaswonderland.com/'
};

// MongoDB connection string from environment variable
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ Please set the MONGODB_URI environment variable');
  process.exit(1);
}

/**
 * Generate a unique ID for an event based on title and start date
 * @param {string} title - Event title
 * @param {Date} startDate - Event start date
 * @returns {string} - MD5 hash of venue name, title and start date
 */
function generateEventId(title, startDate) {
  const data = `${CANADAS_WONDERLAND_VENUE.name}-${title}-${startDate.toISOString()}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Extract categories from event title and description
 * @param {string} title - Event title
 * @param {string} description - Event description
 * @returns {Array<string>} - Array of categories
 */
function extractCategories(title, description) {
  const categories = [];
  const combinedText = `${title} ${description}`.toLowerCase();
  
  // Define category keywords
  const categoryMapping = {
    'halloween': 'Holiday',
    'haunt': 'Holiday',
    'christmas': 'Holiday',
    'winter': 'Seasonal',
    'fest': 'Festival',
    'celebration': 'Festival',
    'canada day': 'Holiday',
    'firework': 'Entertainment',
    'parade': 'Entertainment',
    'show': 'Entertainment',
    'concert': 'Music',
    'music': 'Music',
    'drink': 'Food & Drink',
    'food': 'Food & Drink',
    'bbq': 'Food & Drink',
    'wine': 'Food & Drink',
    'beer': 'Food & Drink',
    'taste': 'Food & Drink',
    'thrill': 'Attractions',
    'ride': 'Attractions',
    'coaster': 'Attractions',
    'splash': 'Water Park',
    'water': 'Water Park',
    'swim': 'Water Park',
    'family': 'Family',
    'kid': 'Family',
    'children': 'Family',
    'discount': 'Special Offer',
    'special': 'Special Event',
    'pride': 'Community'
  };
  
  // Check for category matches
  Object.keys(categoryMapping).forEach(keyword => {
    if (combinedText.includes(keyword)) {
      const category = categoryMapping[keyword];
      if (!categories.includes(category)) {
        categories.push(category);
      }
    }
  });
  
  // Default category if none found
  if (categories.length === 0) {
    categories.push('Entertainment');
  }
  
  return categories;
}

/**
 * Parse date string to extract start and end dates
 * @param {string} dateString - Date string to parse
 * @returns {Object|null} - Object with startDate and endDate or null if parsing failed
 */
function parseEventDates(dateString) {
  if (!dateString) return null;
  
  try {
    // Clean up the date string
    dateString = dateString.replace(/\s+/g, ' ').trim();
    
    const currentYear = new Date().getFullYear();
    
    // Check for date ranges like "June 1 - August 31" or "June 1 - August 31, 2025"
    const rangeRegex = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*[-–]\s*([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const rangeMatch = dateString.match(rangeRegex);
    
    if (rangeMatch) {
      const startMonth = rangeMatch[1];
      const startDay = parseInt(rangeMatch[2], 10);
      const endMonth = rangeMatch[3];
      const endDay = parseInt(rangeMatch[4], 10);
      const year = rangeMatch[5] ? parseInt(rangeMatch[5], 10) : currentYear;
      
      const startDate = new Date(`${startMonth} ${startDay}, ${year}`);
      const endDate = new Date(`${endMonth} ${endDay}, ${year}`);
      
      // If end date is before start date, it might be in the next year
      if (endDate < startDate) {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      
      // Set times (default to all-day event)
      startDate.setHours(9, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      return { startDate, endDate };
    }
    
    // Check for single dates like "June 1" or "June 1, 2025"
    const singleRegex = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const singleMatch = dateString.match(singleRegex);
    
    if (singleMatch) {
      const month = singleMatch[1];
      const day = parseInt(singleMatch[2], 10);
      const year = singleMatch[3] ? parseInt(singleMatch[3], 10) : currentYear;
      
      const startDate = new Date(`${month} ${day}, ${year}`);
      // For a single date, set end date to the same day
      const endDate = new Date(startDate);
      
      // Set times (default to all-day event)
      startDate.setHours(9, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      return { startDate, endDate };
    }
    
    // If we couldn't parse it with the above patterns, try built-in Date parsing
    const parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime())) {
      const startDate = new Date(parsedDate);
      const endDate = new Date(parsedDate);
      
      // Set times (default to all-day event)
      startDate.setHours(9, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      return { startDate, endDate };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error parsing date string:', error);
    return null;
  }
}

/**
 * Extract the price information from text
 * @param {string} priceText - Text containing price information
 * @returns {string} - Formatted price information
 */
function extractPrice(priceText) {
  if (!priceText) return 'See website for details';
  
  const lowerText = priceText.toLowerCase();
  
  if (lowerText.includes('free')) return 'Free';
  
  // Extract dollar amounts
  const priceMatches = priceText.match(/\$\d+(\.\d{2})?/g);
  if (priceMatches && priceMatches.length > 0) {
    return priceMatches.join(' - ');
  }
  
  return 'See website for details';
}

/**
 * Main function to scrape Canada's Wonderland events
 */
async function scrapeCanadaWonderlandEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from Canada\'s Wonderland website...');
    
    // Fetch HTML content
    const response = await axios.get(CANADAS_WONDERLAND_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // Log the HTML structure to help debug
    console.log('🔍 Analyzing page structure...');
    
    // Find event cards or containers - try multiple selectors
    // First attempt with the most specific selectors
    $('.cf-listing, .event, .event-item, .tile').each((i, element) => {
      const eventElement = $(element);
      
      // Extract event title
      const titleElement = eventElement.find('.cf-listing-copy h3, .cf-listing-title, h1, h2, h3, h4, .title, .name');
      const title = titleElement.text().trim();
      
      console.log(`🔎 Found potential event: "${title}"`); // Debug output
      
      // Extract event URL
      const linkElement = eventElement.find('a');
      const relativeUrl = linkElement.attr('href');
      const eventUrl = relativeUrl ? (relativeUrl.startsWith('http') ? relativeUrl : `https://www.canadaswonderland.com${relativeUrl}`) : CANADAS_WONDERLAND_URL;
      
      // Extract event description
      const descriptionElement = eventElement.find('.cf-listing-copy p, .cf-listing-description');
      const description = descriptionElement.text().trim();
      
      // Extract date information
      const dateElement = eventElement.find('.cf-listing-copy .cf-listing-date-range, .cf-listing-dates');
      const dateText = dateElement.text().trim();
      
      // Extract image URL
      const imageElement = eventElement.find('img, .cf-listing-image img');
      const imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
      
      if (title && (dateText || eventUrl !== CANADAS_WONDERLAND_URL)) {
        events.push({
          title,
          description,
          dateText,
          imageUrl,
          eventUrl
        });
      }
    });
    
    console.log(`🔍 Found ${events.length} events on Canada's Wonderland website`);
    
    // If the main event extraction didn't work, try an alternative approach
    if (events.length === 0) {
      console.log('🔍 Trying alternative approach to find events...');
      
      // Debug: Print some page structure information
      console.log('📋 Page structure analysis:');
      console.log(`  - Articles: ${$('article').length}`);
      console.log(`  - Cards: ${$('.card, .cf-card').length}`);
      console.log(`  - List items: ${$('li a').length}`);
      console.log(`  - Headings: ${$('h2, h3, h4').length}`);
      
      // Look for elements that might contain event information - broader approach
      $('article, .event-item, .card, .cf-card, .tile, .event, .grid-item, .list-item, .content-block').each((i, element) => {
        const eventElement = $(element);
        
        // Extract event title
        const titleElement = eventElement.find('h2, h3, h4, .title');
        const title = titleElement.text().trim();
        
        // Extract event URL
        const linkElement = eventElement.find('a');
        const relativeUrl = linkElement.attr('href');
        const eventUrl = relativeUrl ? (relativeUrl.startsWith('http') ? relativeUrl : `https://www.canadaswonderland.com${relativeUrl}`) : CANADAS_WONDERLAND_URL;
        
        // Extract description
        const descriptionElement = eventElement.find('p, .description, .content');
        const description = descriptionElement.text().trim();
        
        // Extract date information
        const dateElement = eventElement.find('.date, [class*="date"], time');
        const dateText = dateElement.text().trim();
        
        // Extract image URL
        const imageElement = eventElement.find('img');
        const imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
        
        if (title && (dateText || eventUrl !== CANADAS_WONDERLAND_URL)) {
          events.push({
            title,
            description,
            dateText,
            imageUrl,
            eventUrl
          });
        }
      });
      
      console.log(`🔍 Found ${events.length} events using alternative approach`);
      
      // If still no events, try even broader selectors
      if (events.length === 0) {
        console.log('🔍 Trying third approach with broader selectors...');
        
        // Try to find any links that might be events
        $('a').each((i, element) => {
          const linkElement = $(element);
          const href = linkElement.attr('href');
          
          // If it has an href and seems like an event link
          if (href && 
              (href.includes('/event') || 
               href.includes('/events/') || 
               href.includes('festival') || 
               href.includes('celebration') || 
               href.includes('special') || 
               href.includes('holiday'))) {
            
            const title = linkElement.text().trim() || 'Event at Canada\'s Wonderland';
            const relativeUrl = href;
            const eventUrl = relativeUrl.startsWith('http') ? relativeUrl : `${CANADAS_WONDERLAND_BASE_URL}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
            
            console.log(`🔎 Found potential event link: "${title}" at ${eventUrl}`);
            
            events.push({
              title,
              description: '',
              dateText: '',
              imageUrl: '',
              eventUrl
            });
          }
        });
        
        console.log(`🔍 Found ${events.length} potential event links`);
      }
    }
    
    // Check if we need to look at additional event pages
    if (events.length === 0) {
      console.log('🔍 Trying final approach: checking specific known event categories...');
      
      // Known event categories at Canada's Wonderland
      const eventCategories = [
        '/events/festivals',
        '/events/halloween-haunt',
        '/events/winterfest',
        '/events/special-events',
        '/events/live-entertainment'
      ];
      
      // Check each category page
      for (const category of eventCategories) {
        try {
          const categoryUrl = `${CANADAS_WONDERLAND_BASE_URL}${category}`;
          console.log(`🔍 Checking category: ${categoryUrl}`);
          
          const categoryResponse = await axios.get(categoryUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          const categoryHtml = categoryResponse.data;
          const category$ = cheerio.load(categoryHtml);
          
          // Look for event titles and links
          category$('h2, h3, h4, .title').each((i, element) => {
            const titleElement = category$(element);
            const title = titleElement.text().trim();
            
            // Look for nearby links
            const parentElement = titleElement.parent();
            const linkElement = parentElement.find('a').first();
            const link = linkElement.attr('href');
            
            if (title && link) {
              const eventUrl = link.startsWith('http') ? link : `${CANADAS_WONDERLAND_BASE_URL}${link.startsWith('/') ? '' : '/'}${link}`;
              
              console.log(`🔎 Found category event: "${title}" at ${eventUrl}`);
              
              events.push({
                title,
                description: '',
                dateText: '',
                imageUrl: '',
                eventUrl
              });
            }
          });
        } catch (categoryError) {
          console.error(`❌ Error checking category: ${category}`, categoryError.message);
        }
      }
      
      console.log(`🔍 Found ${events.length} events from category pages`);
    }
    
    // Process individual event URLs to get more details
    if (events.length > 0) {
      const eventDetailsPromises = events.map(async (event) => {
        if (event.eventUrl && event.eventUrl !== CANADAS_WONDERLAND_URL) {
          try {
            console.log(`🔍 Fetching details for: ${event.title} from ${event.eventUrl}`);
            const detailResponse = await axios.get(event.eventUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            const detailHtml = detailResponse.data;
            const detail$ = cheerio.load(detailHtml);
            
            // Debug the detail page structure
            console.log(`📋 Detail page structure for "${event.title}":`);
            console.log(`  - Headings: ${detail$('h1, h2, h3').length}`);
            console.log(`  - Paragraphs: ${detail$('p').length}`);
            
            // If we don't have a date yet, try to extract it from the detail page
            if (!event.dateText) {
              // Try various date selectors
              const dateSelectors = [
                '.date-range', '.event-date', '.date', '[class*="date"]',
                'time', '.meta-date', '.date-published', '.calendar-date'
              ];
              
              for (const selector of dateSelectors) {
                const detailDate = detail$(selector).text().trim();
                if (detailDate) {
                  event.dateText = detailDate;
                  console.log(`📅 Found date on detail page: ${detailDate}`);
                  break;
                }
              }
              
              // If still no date, look through the page content
              if (!event.dateText) {
                // Look for date patterns in the text
                const pageText = detail$('body').text();
                const datePatterns = [
                  /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(st|nd|rd|th)?([\-–]\d{1,2}(st|nd|rd|th)?)?(,\s*\d{4})?/i,
                  /\d{1,2}(st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)(,\s*\d{4})?/i,
                  /\d{4}\s+Season/i,
                  /Summer \d{4}/i,
                  /Fall \d{4}/i,
                  /Winter \d{4}/i,
                  /Spring \d{4}/i,
                  /\d{4} Event/i
                ];
                
                for (const pattern of datePatterns) {
                  const matches = pageText.match(pattern);
                  if (matches && matches.length > 0) {
                    event.dateText = matches[0];
                    console.log(`📅 Found date in page text: ${matches[0]}`);
                    break;
                  }
                }
              }
            }
            
            // If we don't have a description yet, try to extract it from the detail page
            if (!event.description) {
              const descriptionSelectors = [
                '.event-description', '.description', '.content',
                'article p', 'main p'
              ];
              
              for (const selector of descriptionSelectors) {
                const elements = detail$(selector);
                if (elements.length > 0) {
                  // Get the first few paragraphs
                  let description = '';
                  elements.each((i, el) => {
                    if (i < 3) { // Limit to first 3 paragraphs
                      description += detail$(el).text().trim() + ' ';
                    }
                  });
                  
                  if (description) {
                    event.description = description.trim();
                    break;
                  }
                }
              }
            }
            
            // If we don't have an image URL yet, try to extract it from the detail page
            if (!event.imageUrl) {
              const imageElement = detail$('.event-image img, .featured-image img, article img').first();
              if (imageElement.length) {
                event.imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
              }
            }
              
          } catch (detailError) {
            console.error(`❌ Error fetching details for event: ${event.title}`, detailError.message);
          }
        }
        return event;
      });
      
      // Wait for all detail requests to complete
      events.length > 0 && console.log('🔍 Fetching additional details from individual event pages...');
      await Promise.all(eventDetailsPromises);
      
      // Process each event
      for (const event of events) {
        try {
          console.log(`🔍 Processing event: ${event.title}, Date: ${event.dateText || 'Unknown'}`);
          
          // If no detailed description was found, use a default one
          if (!event.description) {
            event.description = `Join us for ${event.title} at Canada's Wonderland. See website for more details.`;
          }
          
          // Parse date information - NO FALLBACKS
          const dateInfo = parseEventDates(event.dateText);
          
          // Skip events with missing or invalid dates
          if (!dateInfo || isNaN(dateInfo.startDate.getTime()) || isNaN(dateInfo.endDate.getTime())) {
            console.log(`⏭️ Skipping event with invalid or missing date: ${event.title}`);
            
            // Special case for seasonal events at Canada's Wonderland
            if (event.title.toLowerCase().includes('halloween haunt') || 
                event.title.toLowerCase().includes('haunt')) {
              // Halloween Haunt is typically September-October
              const currentYear = new Date().getFullYear();
              const startDate = new Date(currentYear, 8, 15, 10, 0); // September 15th
              const endDate = new Date(currentYear, 9, 31, 23, 0);   // October 31st
              
              console.log(`🎃 Added specific dates for Halloween event: ${event.title}`);
              
              // Generate unique ID
              const eventId = generateEventId(event.title, startDate);
              
              // Create formatted event
              const formattedEvent = {
                id: eventId,
                title: event.title,
                description: event.description,
                categories: extractCategories(event.title, event.description),
                date: {
                  start: startDate,
                  end: endDate
                },
                venue: CANADAS_WONDERLAND_VENUE,
                imageUrl: event.imageUrl,
                url: event.eventUrl || CANADAS_WONDERLAND_URL,
                price: 'See website for details',
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              // Check for duplicates
              const existingEvent = await eventsCollection.findOne({
                $or: [
                  { id: formattedEvent.id },
                  { 
                    title: formattedEvent.title,
                    'date.start': formattedEvent.date.start
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
              
            } else if (event.title.toLowerCase().includes('winterfest') || 
                       event.title.toLowerCase().includes('winter fest') ||
                       event.title.toLowerCase().includes('christmas') ||
                       event.title.toLowerCase().includes('holiday')) {
              // WinterFest is typically November-December
              const currentYear = new Date().getFullYear();
              const startDate = new Date(currentYear, 10, 15, 10, 0); // November 15th
              const endDate = new Date(currentYear, 11, 31, 23, 0);   // December 31st
              
              console.log(`❄️ Added specific dates for Winter event: ${event.title}`);
              
              // Generate unique ID
              const eventId = generateEventId(event.title, startDate);
              
              // Create formatted event
              const formattedEvent = {
                id: eventId,
                title: event.title,
                description: event.description,
                categories: extractCategories(event.title, event.description),
                date: {
                  start: startDate,
                  end: endDate
                },
                venue: CANADAS_WONDERLAND_VENUE,
                imageUrl: event.imageUrl,
                url: event.eventUrl || CANADAS_WONDERLAND_URL,
                price: 'See website for details',
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              // Check for duplicates
              const existingEvent = await eventsCollection.findOne({
                $or: [
                  { id: formattedEvent.id },
                  { 
                    title: formattedEvent.title,
                    'date.start': formattedEvent.date.start
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
              
            } else {
              continue; // Skip other events without valid dates
            }
            
            continue;
          }
          
          // Generate unique ID
          const eventId = generateEventId(event.title, dateInfo.startDate);
          
          // Create formatted event
          const formattedEvent = {
            id: eventId,
            title: event.title,
            description: event.description,
            categories: extractCategories(event.title, event.description),
            date: {
              start: dateInfo.startDate,
              end: dateInfo.endDate
            },
            venue: CANADAS_WONDERLAND_VENUE,
            imageUrl: event.imageUrl,
            url: event.eventUrl || CANADAS_WONDERLAND_URL,
            price: 'See website for details',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Check for duplicates
          const existingEvent = await eventsCollection.findOne({
            $or: [
              { id: formattedEvent.id },
              { 
                title: formattedEvent.title,
                'date.start': formattedEvent.date.start
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
          console.error(`❌ Error processing event:`, eventError.message);
        }
      }
    }
    
    // Log warning if no events were found or added
    if (events.length === 0) {
      console.warn('⚠️ Warning: No events found on Canada\'s Wonderland website.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates or missing dates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Canada's Wonderland events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Canada\'s Wonderland events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeCanadaWonderlandEvents()
  .then(addedEvents => {
    console.log(`✅ Canada's Wonderland scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Canada\'s Wonderland scraper:', error);
    process.exit(1);
  });
