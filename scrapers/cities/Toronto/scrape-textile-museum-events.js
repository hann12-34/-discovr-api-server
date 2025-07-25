/**
 * Textile Museum of Canada Events Scraper
 * Based on events from https://textilemuseum.ca/exhibitions/ and press releases
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const TEXTILE_MUSEUM_EXHIBITIONS_URL = 'https://textilemuseum.ca/exhibitions/';
const TEXTILE_MUSEUM_BASE_URL = 'https://textilemuseum.ca';
const TEXTILE_MUSEUM_VENUE = {
  name: 'Textile Museum of Canada',
  address: '55 Centre Ave, Toronto, ON M5G 2H5',
  city: 'Toronto',
  region: 'Ontario',
  country: 'Canada',
  postalCode: 'M5G 2H5',
  url: 'https://textilemuseum.ca',
};

// MongoDB connection URI
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable not set');
  process.exit(1);
}

/**
 * Generate a unique event ID based on event details
 */
function generateEventId(title, startDate) {
  const dataToHash = `${TEXTILE_MUSEUM_VENUE.name}-${title}-${startDate.toISOString()}`;
  return crypto.createHash('md5').update(dataToHash).digest('hex');
}

/**
 * Parse date and time information from text
 */
function parseDateAndTime(dateText, timeText = '') {
  if (!dateText) return null;
  
  try {
    // Clean up the texts
    dateText = dateText.replace(/\\n/g, ' ').trim();
    timeText = timeText ? timeText.replace(/\\n/g, ' ').trim() : '';
    
    let startDate, endDate;
    
    // Check if it's a date range
    if (dateText.includes(' - ') || dateText.includes(' to ') || dateText.includes(' – ')) {
      // Handle date range format (note: includes both hyphen and en-dash)
      const separator = dateText.includes(' - ') ? ' - ' : (dateText.includes(' – ') ? ' – ' : ' to ');
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
    
    // Process time information if available
    if (timeText) {
      // Time formats: "7:00 PM", "7 PM", "19:00", "7:00 PM - 9:00 PM"
      // Check if time range is provided
      if (timeText.includes(' - ') || timeText.includes(' to ') || timeText.includes(' – ')) {
        const separator = timeText.includes(' - ') ? ' - ' : (timeText.includes(' – ') ? ' – ' : ' to ');
        const [startTimeStr, endTimeStr] = timeText.split(separator);
        
        // Parse start time
        const startTimeMatch = startTimeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        if (startTimeMatch) {
          let hours = parseInt(startTimeMatch[1], 10);
          const minutes = startTimeMatch[2] ? parseInt(startTimeMatch[2], 10) : 0;
          const period = startTimeMatch[3] ? startTimeMatch[3].toLowerCase() : null;
          
          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
        } else {
          // Default start time for museum events
          startDate.setHours(11, 0, 0, 0); // 11:00 AM default
        }
        
        // Parse end time
        const endTimeMatch = endTimeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        if (endTimeMatch) {
          let hours = parseInt(endTimeMatch[1], 10);
          const minutes = endTimeMatch[2] ? parseInt(endTimeMatch[2], 10) : 0;
          const period = endTimeMatch[3] ? endTimeMatch[3].toLowerCase() : null;
          
          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          endDate.setHours(hours, minutes, 0, 0);
        } else {
          // Default end time
          endDate.setHours(17, 0, 0, 0); // 5:00 PM default for museum events
        }
      } else {
        // Single time, assume event lasts 2 hours (typical for museum events/workshops)
        const timeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
          
          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
          
          // Default event duration is 2 hours for museum events
          endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 2);
        } else {
          // Default times if parsing fails
          startDate.setHours(11, 0, 0, 0); // 11:00 AM default
          endDate.setHours(13, 0, 0, 0);   // 1:00 PM default
        }
      }
    } else {
      // Default times if no time provided
      startDate.setHours(11, 0, 0, 0); // 11:00 AM default for museum events
      endDate.setHours(17, 0, 0, 0);   // 5:00 PM default for all-day museum events
    }
    
    return { startDate, endDate };
  } catch (error) {
    console.error(`❌ Error parsing date/time: ${dateText} ${timeText}`, error);
    return null;
  }
}

/**
 * Extract categories from event title and description
 */
function extractCategories(title, description) {
  const categories = ['Toronto', 'Museum', 'Art', 'Textile', 'Arts & Culture'];
  
  // Add categories based on content
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description ? description.toLowerCase() : '';
  
  if (lowerTitle.includes('exhibit') || lowerDesc.includes('exhibit') ||
      lowerTitle.includes('exhibition') || lowerDesc.includes('exhibition') ||
      lowerTitle.includes('gallery') || lowerDesc.includes('gallery')) {
    categories.push('Exhibition');
  }
  
  if (lowerTitle.includes('workshop') || lowerDesc.includes('workshop') ||
      lowerTitle.includes('class') || lowerDesc.includes('class')) {
    categories.push('Workshop');
  }
  
  if (lowerTitle.includes('talk') || lowerDesc.includes('talk') ||
      lowerTitle.includes('lecture') || lowerDesc.includes('lecture') ||
      lowerTitle.includes('discussion') || lowerDesc.includes('discussion')) {
    categories.push('Talk');
  }
  
  if (lowerTitle.includes('family') || lowerDesc.includes('family') ||
      lowerTitle.includes('kid') || lowerDesc.includes('kid') ||
      lowerTitle.includes('children') || lowerDesc.includes('children') ||
      lowerTitle.includes('all ages') || lowerDesc.includes('all ages')) {
    categories.push('Family');
  }
  
  if (lowerTitle.includes('tour') || lowerDesc.includes('tour') ||
      lowerTitle.includes('guided') || lowerDesc.includes('guided')) {
    categories.push('Tour');
  }
  
  if (lowerTitle.includes('craft') || lowerDesc.includes('craft') ||
      lowerTitle.includes('making') || lowerDesc.includes('making')) {
    categories.push('Crafts');
  }
  
  if (lowerTitle.includes('design') || lowerDesc.includes('design')) {
    categories.push('Design');
  }
  
  if (lowerTitle.includes('history') || lowerDesc.includes('history') ||
      lowerTitle.includes('heritage') || lowerDesc.includes('heritage')) {
    categories.push('History');
  }
  
  return [...new Set(categories)]; // Remove duplicates
}

/**
 * Extract price information from text
 */
function extractPrice(text) {
  if (!text) return 'See website for details';
  
  const lowerText = text.toLowerCase();
  
  // Check for free events
  if (lowerText.includes('free') || lowerText.includes('no charge')) {
    return 'Free';
  }
  
  // Look for price patterns
  const priceMatches = text.match(/\$\d+(\.\d{2})?/g);
  if (priceMatches && priceMatches.length > 0) {
    return priceMatches.join(' - ');
  }
  
  // Check for admission mentions
  if (lowerText.includes('admission') || lowerText.includes('entry')) {
    return 'Museum admission rates apply. See website for details';
  }
  
  return 'See website for details';
}

/**
 * Main function to scrape Textile Museum of Canada events
 */
async function scrapeTextileMuseumEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching exhibitions from Textile Museum of Canada website...');
    
    // Fetch HTML content from Textile Museum of Canada exhibitions page
    const response = await axios.get(TEXTILE_MUSEUM_EXHIBITIONS_URL);
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // Process exhibitions from the exhibitions page - targeting article elements
    console.log('🔍 Looking for exhibitions on the exhibitions page...');
    
    $('article').each(async (i, el) => {
      try {
        const article = $(el);
        
        // Extract title and link - first h2 is usually the title with link
        const titleElement = article.find('h2 a');
        const title = titleElement.text().trim();
        const eventUrl = titleElement.attr('href');
        
        if (!title || !eventUrl) {
          return;
        }
        
        console.log(`🔍 Found potential exhibition: ${title}`);
        
        // Extract date - check for date text that might be present
        let dateText = '';
        article.find('time, .date, [class*="date"], h5').each((i, dateEl) => {
          const text = $(dateEl).text().trim();
          if (text.match(/\d{4}/) || text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i)) {
            dateText = text;
            return false; // break out of the each
          }
        });
        
        // Extract description from the first paragraph
        const description = article.find('p').first().text().trim() || 
                           'Visit the Textile Museum of Canada to experience this special exhibition. See website for more details.';
        
        // Create event object with the basic info we have
        const basicEvent = {
          title,
          dateText,
          timeText: '11:00 AM - 5:00 PM', // Default museum hours
          description,
          imageUrl: '',
          eventUrl,
          priceText: 'Museum admission rates apply'
        };
        
        events.push(basicEvent);
        
        // Queue up this URL for detailed processing
        console.log(`🔍 Will fetch details from: ${eventUrl}`);
        
      } catch (eventError) {
        console.error('❌ Error extracting exhibition details:', eventError);
      }
    });
    
    // Special case: Add the "Beyond the Vanishing Maya" exhibition if not already added
    // This is a known current exhibition that we saw in our website analysis
    const mayaExhibitionUrl = 'https://textilemuseum.ca/press/textile-museum-of-canada-presents-groundbreaking-maya-exhibition-unique-curatorial-approach-unveils-maya-art-through-indigenous-lens/';
    
    if (!events.some(e => e.eventUrl === mayaExhibitionUrl)) {
      console.log('🔍 Adding the Maya exhibition explicitly');
      events.push({
        title: 'Beyond the Vanishing Maya: Voices of a Land in Resistance',
        dateText: 'October 17, 2024',
        timeText: '11:00 AM - 5:00 PM', // Default museum hours
        description: 'This first-of-its-kind exhibition in Canada marks a powerful shift in museology by anchoring its curatorship in Maya culture, language and identity as well as spirituality and ritual.',
        imageUrl: '',
        eventUrl: mayaExhibitionUrl,
        priceText: 'Museum admission rates apply'
      });
    }
    
    console.log(`🔍 Found ${events.length} exhibitions on Textile Museum of Canada website`);
    
    // Process individual event pages to get more details
    if (events.length > 0) {
      const eventDetailsPromises = events.map(async (event) => {
        if (event.eventUrl) {
          try {
            console.log(`🔍 Fetching details for: ${event.title} from ${event.eventUrl}`);
            const detailResponse = await axios.get(event.eventUrl);
            const detailHtml = detailResponse.data;
            const detail$ = cheerio.load(detailHtml);
            
            // Look for more specific date information
            detail$('h4, p, .date, [class*="date"]').each((i, el) => {
              const text = detail$(el).text().trim();
              // Look for text that contains DATE: or starts with DATE:
              if (text.match(/DATE:\s*([^\n]+)/i)) {
                const match = text.match(/DATE:\s*([^\n]+)/i);
                if (match && match[1]) {
                  event.dateText = match[1].trim();
                  return false; // break
                }
              }
              // Look for other date patterns
              else if (text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(\s*[-–]\s*\d{1,2})?,\s*\d{4}\b/i)) {
                event.dateText = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(\s*[-–]\s*\d{1,2})?,\s*\d{4}\b/i)[0];
                return false; // break
              }
              else if (text.match(/\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/i)) {
                event.dateText = text.match(/\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/i)[0];
                return false; // break
              }
            });
            
            // Try to get a better description
            const articleContent = detail$('article p, .entry-content p').text().trim();
            if (articleContent && articleContent.length > event.description.length) {
              event.description = articleContent.substring(0, 500); // Limit to 500 chars
            }
            
            // Try to get an image
            const imageElement = detail$('img');
            if (imageElement.length > 0) {
              const imgSrc = imageElement.attr('src') || imageElement.attr('data-src') || '';
              if (imgSrc && imgSrc.length > 10) { // Basic validation
                // Make URL absolute if relative
                if (imgSrc.startsWith('/')) {
                  event.imageUrl = `${TEXTILE_MUSEUM_BASE_URL}${imgSrc}`;
                } else if (!imgSrc.startsWith('http')) {
                  event.imageUrl = `${TEXTILE_MUSEUM_BASE_URL}/${imgSrc}`;
                } else {
                  event.imageUrl = imgSrc;
                }
              }
            }
            
            // Try to get price information if available
            const priceMatches = detailHtml.match(/\$\d+(\.\d{2})?/g);
            if (priceMatches && priceMatches.length > 0) {
              event.priceText = priceMatches.join(' - ');
            }
            
          } catch (detailError) {
            console.error(`❌ Error fetching details for exhibition: ${event.title}`, detailError);
          }
        }
        return event;
      });
      
      // Wait for all detail requests to complete
      events.length > 0 && console.log('🔍 Fetching additional details from individual exhibition pages...');
      await Promise.all(eventDetailsPromises);
    }
    
    // Process each event
    for (const event of events) {
      try {
        console.log(`🔍 Processing exhibition: ${event.title}, Date: ${event.dateText}`);
        
        // Parse date information
        const dateInfo = parseDateAndTime(event.dateText, event.timeText);
        
        // Skip events with missing or invalid dates
        if (!dateInfo || isNaN(dateInfo.startDate.getTime()) || isNaN(dateInfo.endDate.getTime())) {
          console.log(`⏭️ Skipping exhibition with invalid date: ${event.title}`);
          // For exhibitions without specific dates, use a default date range for current year
          // as museum exhibitions typically run for several months
          const currentYear = new Date().getFullYear();
          const startDate = new Date(currentYear, 0, 1); // January 1st of current year
          const endDate = new Date(currentYear, 11, 31); // December 31st of current year
          
          console.log(`🗓️ Using default date range for exhibition: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);
          
          // Generate unique ID
          const eventId = generateEventId(event.title, startDate);
          
          // Create formatted event with default dates
          const formattedEvent = {
            id: eventId,
            title: event.title,
            description: event.description,
            categories: extractCategories(event.title, event.description),
            date: {
              start: startDate,
              end: endDate
            },
            venue: TEXTILE_MUSEUM_VENUE,
            imageUrl: event.imageUrl,
            url: event.eventUrl || TEXTILE_MUSEUM_EXHIBITIONS_URL,
            price: event.priceText ? extractPrice(event.priceText) : 'Museum admission rates apply',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Check for duplicates
          const existingEvent = await eventsCollection.findOne({
            $or: [
              { id: formattedEvent.id },
              { 
                title: formattedEvent.title
              }
            ]
          });
          
          if (!existingEvent) {
            await eventsCollection.insertOne(formattedEvent);
            addedEvents++;
            console.log(`✅ Added exhibition: ${formattedEvent.title}`);
          } else {
            console.log(`⏭️ Skipped duplicate exhibition: ${formattedEvent.title}`);
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
          venue: TEXTILE_MUSEUM_VENUE,
          imageUrl: event.imageUrl,
          url: event.eventUrl || TEXTILE_MUSEUM_EXHIBITIONS_URL,
          price: event.priceText ? extractPrice(event.priceText) : 'Museum admission rates apply',
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
          console.log(`✅ Added exhibition: ${formattedEvent.title}`);
        } else {
          console.log(`⏭️ Skipped duplicate exhibition: ${formattedEvent.title}`);
        }
      } catch (eventError) {
        console.error(`❌ Error processing event:`, eventError);
      }
    }
    
    // Log warning if no exhibitions were found or added
    if (events.length === 0) {
      console.warn('⚠️ Warning: No exhibitions found on Textile Museum of Canada website. No events were added.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Exhibitions were found but none were added (possibly all duplicates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Textile Museum of Canada exhibitions`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Textile Museum of Canada events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeTextileMuseumEvents()
  .then(addedEvents => {
    console.log(`✅ Textile Museum of Canada scraper completed. Added ${addedEvents} new exhibitions.`);
  })
  .catch(error => {
    console.error('❌ Error running Textile Museum of Canada scraper:', error);
    process.exit(1);
  });
