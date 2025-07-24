/**
 * Brampton Events Calendar Scraper
 * 
 * This script extracts events from the City of Brampton events calendar
 * and adds them to the MongoDB database in the appropriate format.
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');

// MongoDB connection URI from environment variable
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Base URL and events page URL
const BASE_URL = 'https://www.brampton.ca';
const EVENTS_URL = 'https://www.brampton.ca/EN/Arts-Culture-Tourism/Festivals-and-Events/Calendar/Pages/welcome.aspx';

// Venue information for Brampton (general - will be overridden if specific venue is found)
const BRAMPTON_VENUE = {
  name: 'City of Brampton',
  address: '2 Wellington St W, Brampton, ON L6Y 4R2',
  city: 'Brampton',
  province: 'ON',
  country: 'Canada',
  postalCode: 'L6Y 4R2',
  coordinates: {
    latitude: 43.6851,
    longitude: -79.7597
  }
};

// Categories that are likely for Brampton events
const BRAMPTON_CATEGORIES = ['brampton', 'community', 'festival', 'culture'];

// Function to generate a unique ID for events
function generateEventId(title, startDate) {
  const dateStr = startDate instanceof Date ? startDate.toISOString() : new Date().toISOString();
  const data = `brampton-${title}-${dateStr}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

// Function to extract categories based on event text
function extractCategories(title, description) {
  const textToSearch = `${title} ${description}`.toLowerCase();
  const categories = [...BRAMPTON_CATEGORIES]; // Start with default categories
  
  // Add specific categories based on keywords
  if (textToSearch.includes('movie') || textToSearch.includes('film') || textToSearch.includes('cinema')) categories.push('film');
  if (textToSearch.includes('workshop') || textToSearch.includes('learn') || textToSearch.includes('education')) categories.push('workshop');
  if (textToSearch.includes('concert') || textToSearch.includes('music')) categories.push('music');
  if (textToSearch.includes('art') || textToSearch.includes('exhibition')) categories.push('art');
  if (textToSearch.includes('market') || textToSearch.includes('fair')) categories.push('market');
  if (textToSearch.includes('sport') || textToSearch.includes('game') || textToSearch.includes('tournament')) categories.push('sports');
  if (textToSearch.includes('kids') || textToSearch.includes('children') || textToSearch.includes('family')) categories.push('family');
  if (textToSearch.includes('outdoor') || textToSearch.includes('park')) categories.push('outdoor');
  if (textToSearch.includes('food') || textToSearch.includes('taste')) categories.push('food');
  if (textToSearch.includes('business') || textToSearch.includes('entrepreneur')) categories.push('business');
  
  // Remove duplicates
  return [...new Set(categories)];
}

// Function to parse date text into JavaScript Date objects
function parseDateText(dateText) {
  if (!dateText) {
    const now = new Date();
    return { startDate: now, endDate: now };
  }
  
  // Clean and normalize the date text
  dateText = dateText.trim().replace(/\s+/g, ' ');
  
  try {
    // Try to handle various date formats
    
    // Check for date range with time (e.g., "July 16, 2025 8:00 PM - 10:00 PM")
    const rangeWithTimePattern = /([A-Za-z]+\s+\d{1,2},?\s*\d{4})?\s*(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i;
    const rangeWithTimeMatch = dateText.match(rangeWithTimePattern);
    
    if (rangeWithTimeMatch) {
      // If date is included
      let startDate;
      if (rangeWithTimeMatch[1]) {
        startDate = new Date(rangeWithTimeMatch[1]);
      } else {
        startDate = new Date(); // Default to today if no date
      }
      
      // Parse start time
      let startHours = parseInt(rangeWithTimeMatch[2]);
      const startMinutes = parseInt(rangeWithTimeMatch[3]);
      const startAmPm = rangeWithTimeMatch[4].toLowerCase();
      
      if (startAmPm === 'pm' && startHours < 12) {
        startHours += 12;
      } else if (startAmPm === 'am' && startHours === 12) {
        startHours = 0;
      }
      
      startDate.setHours(startHours, startMinutes, 0);
      
      // Parse end time
      const endDate = new Date(startDate);
      let endHours = parseInt(rangeWithTimeMatch[5]);
      const endMinutes = parseInt(rangeWithTimeMatch[6]);
      const endAmPm = rangeWithTimeMatch[7].toLowerCase();
      
      if (endAmPm === 'pm' && endHours < 12) {
        endHours += 12;
      } else if (endAmPm === 'am' && endHours === 12) {
        endHours = 0;
      }
      
      endDate.setHours(endHours, endMinutes, 0);
      
      return { startDate, endDate };
    }
    
    // Check for date range (e.g., "July 16 - July 20, 2025")
    const dateRangePattern = /([A-Za-z]+)\s+(\d{1,2})\s*-\s*([A-Za-z]+)?\s*(\d{1,2})?,?\s*(\d{4})/i;
    const dateRangeMatch = dateText.match(dateRangePattern);
    
    if (dateRangeMatch) {
      const startMonth = dateRangeMatch[1];
      const startDay = parseInt(dateRangeMatch[2]);
      const endMonth = dateRangeMatch[3] || startMonth;
      const endDay = parseInt(dateRangeMatch[4]);
      const year = parseInt(dateRangeMatch[5]);
      
      const startDate = new Date(`${startMonth} ${startDay}, ${year}`);
      startDate.setHours(9, 0, 0); // Default start time: 9 AM
      
      const endDate = new Date(`${endMonth} ${endDay}, ${year}`);
      endDate.setHours(17, 0, 0); // Default end time: 5 PM
      
      return { startDate, endDate };
    }
    
    // Check for single date with time (e.g., "July 16, 2025 7:00 PM")
    const dateTimePattern = /([A-Za-z]+\s+\d{1,2},?\s*\d{4})\s*(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i;
    const dateTimeMatch = dateText.match(dateTimePattern);
    
    if (dateTimeMatch) {
      const dateStr = dateTimeMatch[1];
      let hours = parseInt(dateTimeMatch[2]);
      const minutes = parseInt(dateTimeMatch[3]);
      const ampm = dateTimeMatch[4].toLowerCase();
      
      if (ampm === 'pm' && hours < 12) {
        hours += 12;
      } else if (ampm === 'am' && hours === 12) {
        hours = 0;
      }
      
      const startDate = new Date(dateStr);
      startDate.setHours(hours, minutes, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2); // Default duration: 2 hours
      
      return { startDate, endDate };
    }
    
    // Check for single date (e.g., "July 16, 2025")
    const singleDatePattern = /([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i;
    const singleDateMatch = dateText.match(singleDatePattern);
    
    if (singleDateMatch) {
      const dateStr = singleDateMatch[1];
      
      const startDate = new Date(dateStr);
      startDate.setHours(9, 0, 0); // Default start time: 9 AM
      
      const endDate = new Date(dateStr);
      endDate.setHours(17, 0, 0); // Default end time: 5 PM
      
      return { startDate, endDate };
    }
    
    // Last resort: try direct parsing
    const parsedDate = new Date(dateText);
    if (!isNaN(parsedDate.getTime())) {
      const startDate = parsedDate;
      const endDate = new Date(parsedDate);
      endDate.setHours(endDate.getHours() + 2); // Default duration: 2 hours
      
      return { startDate, endDate };
    }
  } catch (error) {
    console.error(`❌ Failed to parse date: ${dateText}`, error);
  }
  
  // Default to current date if parsing fails
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(now.getHours() + 2);
  return { startDate: now, endDate };
}

// Helper function to extract venue details from event page
function extractVenue(html) {
  const $ = cheerio.load(html);
  
  // Look for location information
  let venueName = '';
  let venueAddress = '';
  
  // Look for location details in various elements
  $('.event-location, .location, [class*="location"], [class*="venue"]').each(function() {
    const locationText = $(this).text().trim();
    if (locationText && locationText.length > 5) {
      venueName = locationText;
    }
  });
  
  // Look for address details
  $('.address, [class*="address"]').each(function() {
    const addressText = $(this).text().trim();
    if (addressText && addressText.length > 5) {
      venueAddress = addressText;
    }
  });
  
  // If no specific venue information found, use default
  if (!venueName && !venueAddress) {
    return BRAMPTON_VENUE;
  }
  
  // If we found some venue info but not a full address
  if (venueName && !venueAddress) {
    return {
      ...BRAMPTON_VENUE,
      name: venueName
    };
  }
  
  // Extract postal code if present
  const postalCodeMatch = venueAddress.match(/[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d/);
  const postalCode = postalCodeMatch ? postalCodeMatch[0] : BRAMPTON_VENUE.postalCode;
  
  // If we have both venue name and address
  return {
    name: venueName || 'City of Brampton',
    address: venueAddress,
    city: 'Brampton',
    province: 'ON',
    country: 'Canada',
    postalCode: postalCode,
    coordinates: BRAMPTON_VENUE.coordinates // Use default coordinates
  };
}

// Main function to fetch and process Brampton events
async function scrapeBramptonEvents() {
  let browser;
  let addedEvents = 0;
  
  try {
    console.log('🔍 Starting Brampton events scraper...');
    
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db('discovr');
    const eventsCollection = database.collection('events');
    
    // Launch puppeteer
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Navigate to the events page
    console.log(`🔍 Navigating to ${EVENTS_URL}...`);
    await page.goto(EVENTS_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Give the page extra time to load dynamic content
    await page.waitForTimeout(3000);
    
    // Extract event links from the main page
    console.log('🔍 Extracting event links...');
    const eventLinks = await page.evaluate(() => {
      const links = [];
      const allLinks = document.querySelectorAll('a[href*="Lists/events/DispForm.aspx"]');
      
      allLinks.forEach(link => {
        if (link.href && link.href.includes('ID=')) {
          links.push({
            title: link.textContent.trim(),
            url: link.href
          });
        }
      });
      
      return links;
    });
    
    console.log(`🔍 Found ${eventLinks.length} event links`);
    
    // Process each event link to get full details
    for (const eventLink of eventLinks) {
      try {
        console.log(`🔍 Processing event: ${eventLink.title}`);
        
        // Navigate to the event page
        await page.goto(eventLink.url, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForTimeout(1000);
        
        // Extract event details from the event page
        const eventDetails = await page.evaluate(() => {
          const title = document.querySelector('.ms-formtitle, h1, .event-title')?.textContent.trim() || '';
          
          // Get description - look for various elements that might contain it
          let description = '';
          document.querySelectorAll('.ms-formbody p, .event-description, .description').forEach(el => {
            if (el && el.textContent.trim().length > description.length) {
              description = el.textContent.trim();
            }
          });
          
          // Get date information
          let dateText = '';
          document.querySelectorAll('.ms-formbody [id*="Date"], [id*="date"], .event-date, .date, [class*="date"]').forEach(el => {
            if (el && el.textContent.trim()) {
              dateText += el.textContent.trim() + ' ';
            }
          });
          
          // Get location/venue information
          let location = '';
          document.querySelectorAll('.ms-formbody [id*="Location"], [id*="location"], .event-location, .location').forEach(el => {
            if (el && el.textContent.trim()) {
              location += el.textContent.trim() + ' ';
            }
          });
          
          // Get image
          const img = document.querySelector('.ms-formbody img, .event-image, .image');
          const imageUrl = img ? img.src : '';
          
          return {
            title: title || document.title.split('|')[0].trim(),
            description,
            dateText: dateText.trim(),
            location: location.trim(),
            imageUrl
          };
        });
        
        // Skip if title is missing or too short (likely not a real event)
        if (!eventDetails.title || eventDetails.title.length < 5) {
          console.log(`⏭️ Skipping: Missing or short title`);
          continue;
        }
        
        // Parse dates
        const { startDate, endDate } = parseDateText(eventDetails.dateText);
        
        // Get HTML content for venue extraction
        const pageContent = await page.content();
        const venue = extractVenue(pageContent);
        
        // Generate unique ID
        const id = generateEventId(eventDetails.title, startDate);
        
        // Create formatted event
        const formattedEvent = {
          id: id,
          title: `Brampton - ${eventDetails.title}`,
          description: eventDetails.description,
          categories: extractCategories(eventDetails.title, eventDetails.description),
          startDate: startDate,
          endDate: endDate,
          venue: venue,
          imageUrl: eventDetails.imageUrl,
          officialWebsite: eventLink.url,
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
      } catch (error) {
        console.error(`❌ Error processing event: ${eventLink.title}`, error);
      }
    }
    
    // If no events were found, log a warning but do not create sample events
    if (addedEvents === 0) {
      console.log('⚠️ No events were found on the Brampton events website.');
    }
    
    console.log(`📊 Successfully added ${addedEvents} new Brampton events`);
    
  } catch (error) {
    console.error('❌ Error scraping Brampton events:', error);
  } finally {
    // Close the browser
    if (browser) {
      await browser.close();
    }
    
    // Close MongoDB connection
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeBramptonEvents()
  .then(addedEvents => {
    console.log(`✅ Brampton scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Brampton scraper:', error);
    process.exit(1);
  });
