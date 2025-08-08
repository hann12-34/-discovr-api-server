/**
 * Pandemonium Events Scraper
 * Based on events from https://pandemoniumto.com/shows/
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const PANDEMONIUM_URL = 'https://pandemoniumto.com/shows/';
const PANDEMONIUM_VENUE = {
  name: 'Pandemonium',
  address: '2920 Dundas St W, Toronto, ON M6P 1Y8',
  city: city,
  region: 'Ontario',
  country: 'Canada',
  postalCode: 'M6P 1Y8',
  url: 'https://pandemoniumto.com',
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
  const dataToHash = `${PANDEMONIUM_VENUE.name}-${title}-${startDate.toISOString()}`;
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

    // Common date formats: "January 15, 2025", "Jan 15, 2025", "2025-01-15"
    let startDate, endDate;

    // Check if it's a date range
    if (dateText.includes(' - ') || dateText.includes(' to ')) {
      // Handle date range format
      const separator = dateText.includes(' - ') ? ' - ' : ' to ';
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
      // Time formats: "7:00 PM", "7 PM", "19:00"
      const timeMatch = timeText.match(/(\d{1,2}:?(\d{2}?\s*(am|pm|AM|PM)?/);

      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

        // Convert to 24-hour format if needed
        if (period === 'pm' && hours < 12) hours += 12;
        if (period === 'am' && hours === 12) hours = 0;

        startDate.setHours(hours, minutes, 0, 0);

        // Default end time is 2 hours after start time for shows
        endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 2);
      } else {
        // Default times if parsing fails
        startDate.setHours(19, 0, 0, 0); // 7:00 PM default
        endDate.setHours(21, 0, 0, 0);   // 9:00 PM default
      }
    } else {
      // Default times if no time provided
      startDate.setHours(19, 0, 0, 0); // 7:00 PM default
      endDate.setHours(21, 0, 0, 0);   // 9:00 PM default
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
  const categories = ['Toronto', 'Entertainment'];

  // Add categories based on content
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description ? description.toLowerCase() : '';

  if (lowerTitle.includes('comedy') || lowerDesc.includes('comedy')) {
    categories.push('Comedy');
  }

  if (lowerTitle.includes('improv') || lowerDesc.includes('improv')) {
    categories.push('Improv');
  }

  if (lowerTitle.includes('stand-up') || lowerDesc.includes('stand-up') ||
      lowerTitle.includes('standup') || lowerDesc.includes('standup')) {
    categories.push('Stand-up');
  }

  if (lowerTitle.includes('show') || lowerDesc.includes('show')) {
    categories.push('Show');
  }

  if (lowerTitle.includes('game') || lowerDesc.includes('game')) {
    categories.push('Games');
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
  const priceMatches = text.match(/\$\d+(\.\d{2}?/g);
  if (priceMatches && priceMatches.length > 0) {
    return priceMatches.join(' - ');
  }

  return 'See website for details';
}

/**
 * Main function to scrape Pandemonium events
 */
async function scrapePandemoniumEvents() {
  const city = city;
  if (!city) {
    console.error('❌ City argument is required. e.g. node scrape-pandemonium-events.js Toronto');
    process.exit(1);
  }
  let addedEvents = 0;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const database = client.db();
    const eventsCollection = databases');

    console.log('🔍 Fetching events from Pandemonium website...');

    // Fetch HTML content from Pandemonium website
    const response = await axios.get(PANDEMONIUM_URL);
    const html = response.data;
    const $ = cheerio.load(html);

    // Array to store events
    const events = [];

    // Find event containers on the page - adjust selectors based on actual website structure
    $('.show, .event, .event-item, article, .entry').each((i, el) => {
      try {
        const element = $(el);

        // Extract event details
        const title = element.find('h2, h3, h4, .title, .event-title').text().trim();
        const dateText = element.find('.date, .event-date, time, [class*="date"]').text().trim();
        const timeText = element.find('.time, .event-time, [class*="time"]').text().trim();

        // Extract description
        const description = element.find('p, .description, .event-description, .content, .excerpt').text().trim() ||
                           'Check out this live show at Pandemonium! Visit their website for more details.';

        // Extract image if available
        let imageUrl = '';
        const imageElement = element.find('img');
        if (imageElement.length > 0) {
          imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
          // Make URL absolute if relative
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('/')
              ? `https://pandemoniumto.com${imageUrl}`
              : `https://pandemoniumto.com/${imageUrl}`;
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
              ? `https://pandemoniumto.com${eventUrl}`
              : `https://pandemoniumto.com/${eventUrl}`;
          }
        }

        // Extract price information
        const priceText = element.find('.price, .event-price, [class*="price"]').text().trim();

        // Skip events without title
        if (!title) return;

        // Create event object
        events.push({
          title,
          dateText,
          timeText,
          description,
          imageUrl,
          eventUrl: eventUrl || PANDEMONIUM_URL,
          priceText
        };
      } catch (eventError) {
        console.error('❌ Error extracting event details:', eventError);
      }
    };

    console.log(`🔍 Found ${events.length} events on Pandemonium website`);

    // If no events found with primary selectors, try alternative selectors
    if (events.length === 0) {
      // Try other common selectors for different page layouts
      $('.event-list .event-item, .shows-list .show-item, .card, [class*="event"]').each((i, el) => {
        try {
          const element = $(el);

          const title = element.find('h2, h3, h4, .title').text().trim() || 'Pandemonium Show';
          const dateText = element.find('.date, time, [class*="date"]').text().trim();
          const timeText = element.find('.time, [class*="time"]').text().trim();
          const description = element.find('p, .description, .excerpt').text().trim() ||
                             'Check out this live show at Pandemonium! Visit their website for more details.';

          // Extract image if available
          let imageUrl = '';
          const imageElement = element.find('img');
          if (imageElement.length > 0) {
            imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
            // Make URL absolute if relative
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('/')
                ? `https://pandemoniumto.com${imageUrl}`
                : `https://pandemoniumto.com/${imageUrl}`;
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
                ? `https://pandemoniumto.com${eventUrl}`
                : `https://pandemoniumto.com/${eventUrl}`;
            }
          }

          // Extract price information
          const priceText = element.find('.price, [class*="price"]').text().trim();

          // Create event object
          events.push({
            title,
            dateText,
            timeText,
            description,
            imageUrl,
            eventUrl: eventUrl || PANDEMONIUM_URL,
            priceText
          };
        } catch (eventError) {
          console.error('❌ Error extracting event details with alternative selectors:', eventError);
        }
      };

      console.log(`🔍 Found ${events.length} events with alternative selectors`);
    }

    // Process each event
    for (const event of events) {
      try {
        // Parse date information
        const dateInfo = parseDateAndTime(event.dateText, event.timeText);

        // Skip events with missing or invalid dates
        if (!dateInfo || isNaN(dateInfo.startDate.getTime()) || isNaN(dateInfo.endDate.getTime())) {
          console.log(`⏭️ Skipping event with invalid date: ${event.title}`);
          continue;
        }

        // Generate unique ID
        const eventId = generateEventId(event.title, dateInfo.startDate);

        // Create formatted event
        const formattedEvent = {
          id: eventId,
          title: `Toronto - ${event.title}`,
          description: event.description,
          categories: extractCategories(event.title, event.description),
          startDate: dateInfo.startDate,
          endDate: dateInfo.endDate,
          venue: { ...RegExp.venue: { ...RegExp.venue: PANDEMONIUM_VENUE,, city }, city },,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || PANDEMONIUM_URL,
          price: event.priceText ? extractPrice(event.priceText) : 'See website for details',
          location: 'Toronto, Ontario',
          sourceURL: PANDEMONIUM_URL,
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
        };

        if (!existingEvent) {
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

    // Log warning if no events were found or added
    if (events.length === 0) {
      console.warn('⚠️ Warning: No events found on Pandemonium website. No events were added.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Pandemonium events`);
    }

  } catch (error) {
    console.error('❌ Error scraping Pandemonium events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }

  return addedEvents;
}

// Run the scraper
scrapePandemoniumEvents()
  .then(addedEvents => {
    console.log(`✅ Pandemonium scraper completed. Added ${addedEvents} new events.`);
  }
  .catch(error => {
    console.error('❌ Error running Pandemonium scraper:', error);
    process.exit(1);
  };


// Async function export added by targeted fixer
module.exports = scrapePandemoniumEvents;