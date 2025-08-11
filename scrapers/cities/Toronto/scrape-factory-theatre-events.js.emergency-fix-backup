/**
 * Factory Theatre Events Scraper
 *
 * This script extracts events from the Factory Theatre website
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
const BASE_URL = 'https://www.factorytheatre.ca';
const EVENTS_URL = 'https://www.factorytheatre.ca/whats-on/';

// Venue information for Factory Theatre
const FACTORY_THEATRE_VENUE = {
  name: 'Factory Theatre',
  address: '125 Bathurst St, Toronto, ON M5V 2R2',
  city: city,
  province: 'ON',
  country: 'Canada',
  postalCode: 'M5V 2R2',
  coordinates: {
    latitude: 43.6458,
    longitude: -79.4039
  }
};

// Categories likely for Factory Theatre events
const THEATRE_CATEGORIES = ['theatre', 'performance', 'arts', 'toronto', 'culture'];

// Function to generate a unique ID for events
function generateEventId(title, startDate) {
  const dateStr = startDate instanceof Date ? startDate.toISOString() : new Date().toISOString();
  const data = `factory-${title}-${dateStr}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

// Function to extract categories based on event text
function extractCategories(title, description) {
  const textToSearch = `${title} ${description}`.toLowerCase();
  const categories = [...THEATRE_CATEGORIES]; // Start with default categories

  // Add specific categories based on keywords
  if (textToSearch.includes('festival')) categories.push('festival');
  if (textToSearch.includes('workshop') || textToSearch.includes('class')) categories.push('workshop');
  if (textToSearch.includes('musical') || textToSearch.includes('music')) categories.push('musical');
  if (textToSearch.includes('comedy') || textToSearch.includes('improv')) categories.push('comedy');
  if (textToSearch.includes('drama')) categories.push('drama');
  if (textToSearch.includes('dance')) categories.push('dance');
  if (textToSearch.includes('indigenous') || textToSearch.includes('first nation')) categories.push('indigenous');
  if (textToSearch.includes('family') || textToSearch.includes('children')) categories.push('family');
  if (textToSearch.includes('reading') || textToSearch.includes('book')) categories.push('reading');
  if (textToSearch.includes('new work') || textToSearch.includes('premiere')) categories.push('new work');

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
    // Factory Theatre typically shows date ranges like "September 19 – October 4 2025"
    const dateRangePattern = /([A-Za-z]+)\s+(\d{1,2}\s*[–-]\s*(?:([A-Za-z]+)\s+)?(\d{1,2}\s+(\d{4}/i;
    const match = dateText.match(dateRangePattern);

    if (match) {
      const startMonth = match[1];
      const startDay = parseInt(match[2]);
      const endMonth = match[3] || match[1]; // If no end month specified, use start month
      const endDay = parseInt(match[4]);
      const year = parseInt(match[5]);

      const startDate = new Date(`${startMonth} ${startDay}, ${year}`);
      startDate.setHours(19, 30, 0); // Default start time for theatre: 7:30pm

      const endDate = new Date(`${endMonth} ${endDay}, ${year}`);
      endDate.setHours(22, 0, 0); // Default end time: 10pm

      return { startDate, endDate };
    }

    // Try to match a single date with year pattern (e.g., "August 7 2025")
    const singleDatePattern = /([A-Za-z]+)\s+(\d{1,2}\s+(\d{4}/i;
    const singleMatch = dateText.match(singleDatePattern);

    if (singleMatch) {
      const month = singleMatch[1];
      const day = parseInt(singleMatch[2]);
      const year = parseInt(singleMatch[3]);

      const startDate = new Date(`${month} ${day}, ${year}`);
      startDate.setHours(19, 30, 0); // Default start time: 7:30pm

      const endDate = new Date(startDate);
      endDate.setHours(22, 0, 0); // Default end time: 10pm

      return { startDate, endDate };
    }

    // Last resort: try direct parsing
    const parsedDate = new Date(dateText);
    if (!isNaN(parsedDate.getTime())) {
      const startDate = parsedDate;
      startDate.setHours(19, 30, 0);

      const endDate = new Date(parsedDate);
      endDate.setHours(22, 0, 0);

      return { startDate, endDate };
    }
  } catch (error) {
    console.error(`❌ Failed to parse date: ${dateText}`, error);
  }

  // Default to current date if parsing fails
  const now = new Date();
  now.setHours(19, 30, 0);
  const endDate = new Date(now);
  endDate.setHours(22, 0, 0);
  return { startDate: now, endDate };
}

// Function to scrape show details from a show page
async function scrapeShowDetails(url) {
  const city = city;
  if (!city) {
    console.error('❌ City argument is required. e.g. node scrape-factory-theatre-events.js Toronto');
    process.exit(1);
  }
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Extract title
    const title = $('h1.entry-title').text().trim() || $('h1').first().text().trim();

    // Extract description
    let description = '';
    $('.entry-content p, .show-description p').each(function(i, elem) {
      const text = $(elem).text().trim();
      if (text && text.length > description.length) {
        description = text;
      }
    };

    // If description is still empty, try other selectors
    if (!description) {
      $('article p, .content p').each(function(i, elem) {
        const text = $(elem).text().trim();
        if (text && text.length > description.length) {
          description = text;
        }
      };
    }

    // Extract image URL
    let imageUrl = '';
    const img = $('.wp-post-image, .featured-image img, .show-image img').first();
    if (img.length) {
      imageUrl = img.attr('src') || img.attr('data-src') || '';
    }

    // Extract price information
    let price = 'See website for details';
    $('.price, .ticket-price, [class*="price"]').each(function(i, elem) {
      const text = $(elem).text().trim();
      if (text) {
        price = text;
      }
    };

    return {
      title,
      description,
      imageUrl,
      price
    };
  } catch (error) {
    console.error(`❌ Error scraping show details from ${url}:`, error.message);
    return {
      title: '',
      description: '',
      imageUrl: '',
      price: 'See website for details'
    };
  }
}

// Main function to fetch and process Factory Theatre events
async function scrapeFactoryTheatreEvents() {
  let addedEvents = 0;

  try {
    console.log('🔍 Starting Factory Theatre events scraper...');

    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const database = client.db('discovr');
    const eventsCollection = databases');

    // Fetch the events page
    const response = await axios.get(EVENTS_URL);
    const $ = cheerio.load(response.data);

    // Find show elements
    const shows = [];

    // Look for show links and dates
    $('a[href*="/shows/"]').each(function() {
      const link = $(this).attr('href');
      const parent = $(this).parent();

      // Extract the date text from nearby elements
      let dateText = '';

      // Try to find date text in sibling elements
      const nextEl = $(this).next();
      if (nextEl.length && nextEl.text().trim().match(/\d{4}/)) {
        dateText = nextEl.text().trim();
      }

      // If no date found, look for date pattern in parent text
      if (!dateText) {
        const parentText = parent.text();
        const dateMatch = parentText.match(/([A-Za-z]+\s+\d{1,2}\s*[–-]\s*(?:[A-Za-z]+\s+)?\d{1,2}\s+\d{4}/);
        if (dateMatch) {
          dateText = dateMatch[1];
        }
      }

      // If still no date, look for heading elements
      if (!dateText) {
        parent.find('h2, h3').each(function() {
          const text = $(this).text().trim();
          if (text.match(/\d{4}/)) {
            dateText = text;
          }
        };
      }

      if (link && !shows.some(show => show.url === link)) {
        shows.push({
          title: $(this).text().trim(),
          url: link,
          dateText
        };
      }
    };

    console.log(`🔍 Found ${shows.length} potential shows`);

    // Process each show
    for (const show of shows) {
      try {
        console.log(`🔍 Processing show: ${show.title} - ${show.url}`);

        // Get detailed information from the show page
        const absoluteUrl = show.url.startsWith('http') ? show.url : `${BASE_URL}${show.url}`;
        const details = await scrapeShowDetails(absoluteUrl);

        // Use the more detailed title if available
        const title = details.title || show.title;

        // Skip if title is missing
        if (!title) {
          console.log(`⏭️ Skipping: Missing title for ${show.url}`);
          continue;
        }

        // Parse dates
        const { startDate, endDate } = parseDateText(show.dateText);

        // Generate unique ID
        const id = generateEventId(title, startDate);

        // Create formatted event
        const formattedEvent = {
          id: id,
          title: `Toronto - ${title}`,
          description: details.description,
          categories: extractCategories(title, details.description),
          startDate: startDate,
          endDate: endDate,
          venue: FACTORY_THEATRE_VENUE,
          imageUrl: details.imageUrl,
          officialWebsite: absoluteUrl,
          price: details.price,
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
        };

        if (!existingEvent) {
          await eventsCollection.insertOne(formattedEvent);
          addedEvents++;
          console.log(`✅ Added event: ${formattedEvent.title}`);
        } else {
          console.log(`⏭️ Skipped duplicate event: ${formattedEvent.title}`);
        }
      } catch (error) {
        console.error(`❌ Error processing show:`, error);
      }
    }

    // If no events were found, log but do not create // REMOVED:  ( references)s
    if (addedEvents === 0) {
      console.log('⚠️ No events were found on the Factory Theatre website.');
    }

    console.log(`📊 Successfully added ${addedEvents} new Factory Theatre events`);

  } catch (error) {
    console.error('❌ Error scraping Factory Theatre events:', error);
  } finally {
    // Close MongoDB connection
    await client.close();
    console.log('✅ MongoDB connection closed');
  }

  return addedEvents;
}

// Run the scraper
scrapeFactoryTheatreEvents()
  .then(addedEvents => {
    console.log(`✅ Factory Theatre scraper completed. Added ${addedEvents} new events.`);
  }
  .catch(error => {
    console.error('❌ Error running Factory Theatre scraper:', error);
    process.exit(1);
  };


// Async function export added by targeted fixer
module.exports = scrapeShowDetails;