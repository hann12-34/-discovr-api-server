const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Function to generate unique event ID
function generateEventId(venueName, eventTitle, startDate) {
  const combined = `${venueName}-${eventTitle}-${startDate}`;
  return crypto.createHash('md5').update(combined).digest('hex');
}

// Function to parse date ranges like "May 20, 2025May 26, 2025" or "April 1, 2024July 4, 2025"
function parseDateRange(dateText) {
  console.log(`🔍 Parsing date: "${dateText}"`);
  
  // Handle concatenated dates like "May 20, 2025May 26, 2025"
  const concatenatedMatch = dateText.match(/([A-Za-z]+\s+\d{1,2},\s+\d{4})([A-Za-z]+\s+\d{1,2},\s+\d{4})/);
  if (concatenatedMatch) {
    const startDateStr = concatenatedMatch[1];
    const endDateStr = concatenatedMatch[2];
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      return { startDate, endDate };
    }
  }
  
  // Handle single dates
  const singleDateMatch = dateText.match(/([A-Za-z]+\s+\d{1,2},\s+\d{4})/);
  if (singleDateMatch) {
    const startDate = new Date(singleDateMatch[1]);
    if (!isNaN(startDate.getTime())) {
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 3); // Default 3-hour duration
      return { startDate, endDate };
    }
  }
  
  return null;
}

// Function to extract price from text
function extractPrice(text) {
  const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
  if (priceMatch) {
    return `$${priceMatch[1]}`;
  }
  
  if (text.toLowerCase().includes('free')) {
    return 'Free';
  }
  
  return 'Varies';
}

// Function to categorize events
function categorizeEvent(title, description) {
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  const combined = `${titleLower} ${descLower}`;
  
  if (combined.includes('music') || combined.includes('concert') || combined.includes('performance')) {
    return 'Music & Performance';
  }
  if (combined.includes('market') || combined.includes('holiday') || combined.includes('shopping')) {
    return 'Markets & Festivals';
  }
  if (combined.includes('pride') || combined.includes('community')) {
    return 'Community Events';
  }
  if (combined.includes('garden') || combined.includes('plant') || combined.includes('nature')) {
    return 'Nature & Gardens';
  }
  if (combined.includes('workshop') || combined.includes('class') || combined.includes('learn')) {
    return 'Educational';
  }
  
  return 'Special Events';
}

// Main scraping function
async function scrapeTBGEvents(eventsCollection) {
  const url = 'https://torontobotanicalgarden.ca/enjoy/events-at-the-garden/';
  const venueName = 'Toronto Botanical Garden';
  
  console.log('🔍 Fetching events from Toronto Botanical Garden...');
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    console.log('📋 Parsing event content...');
    const $ = cheerio.load(response.data);
    
    const events = [];
    const processedEventIds = new Set();
    
    // Look for event sections
    $('h3 a, .event-item, .wp-block-group').each((index, element) => {
      const $element = $(element);
      
      // Try to find event title and link
      let eventTitle = '';
      let eventUrl = '';
      let dateText = '';
      
      if ($element.is('a')) {
        eventTitle = $element.text().trim();
        eventUrl = $element.attr('href');
        
        // Look for date information in nearby elements
        const $parent = $element.closest('h3').parent();
        dateText = $parent.text().replace(eventTitle, '').trim();
      } else {
        // Look for title and date within the element
        const $titleLink = $element.find('a').first();
        if ($titleLink.length) {
          eventTitle = $titleLink.text().trim();
          eventUrl = $titleLink.attr('href');
        }
        dateText = $element.text().trim();
      }
      
      if (eventTitle && dateText) {
        console.log(`🔍 Processing: "${eventTitle}"`);
        
        const dates = parseDateRange(dateText);
        if (!dates) {
          console.log(`❌ Could not parse dates for: ${eventTitle}`);
          return;
        }
        
        console.log(`✅ Parsed dates - Start: ${dates.startDate.toISOString()}, End: ${dates.endDate.toISOString()}`);
        
        // Generate unique event ID
        const eventId = generateEventId(venueName, eventTitle, dates.startDate.toISOString());
        console.log(`🔑 Generated ID: ${eventId} for "${eventTitle}"`);
        
        if (processedEventIds.has(eventId)) {
          console.log(`⚠️ Duplicate event ID found, skipping: ${eventTitle}`);
          return;
        }
        processedEventIds.add(eventId);
        
        // Make URL absolute
        if (eventUrl && !eventUrl.startsWith('http')) {
          eventUrl = `https://torontobotanicalgarden.ca${eventUrl}`;
        }
        
        const event = {
          _id: eventId,
          id: eventId,
          title: eventTitle,
          description: `Join us at Toronto Botanical Garden for ${eventTitle}. Experience nature and beauty in the heart of Toronto.`,
          startDate: dates.startDate,
          endDate: dates.endDate,
          venue: {
            name: venueName,
            address: '777 Lawrence Avenue East, North York, ON M3C 1P2',
            city: 'Toronto',
            province: 'Ontario',
            country: 'Canada'
          },
          category: categorizeEvent(eventTitle, ''),
          price: extractPrice(dateText),
          url: eventUrl || url,
          source: venueName,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        events.push(event);
      }
    });
    
    // Insert events into MongoDB
    let addedCount = 0;
    for (const event of events) {
      try {
        await eventsCollection.replaceOne(
          { _id: event._id },
          event,
          { upsert: true }
        );
        console.log(`✅ Added/updated event: ${event.title} (${event.startDate.toDateString()})`);
        addedCount++;
      } catch (error) {
        console.error(`❌ Error inserting event ${event.title}:`, error.message);
      }
    }
    
    console.log(`📊 Successfully added ${addedCount} new Toronto Botanical Garden events`);
    return addedCount;
    
  } catch (error) {
    console.error('❌ Error scraping Toronto Botanical Garden events:', error.message);
    return 0;
  }
}

// Export the function for use in master scraper
module.exports = { scrapeTBGEvents };

// Run directly if this file is executed
if (require.main === module) {
  async function main() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const client = new MongoClient(mongoUri);
    
    try {
      console.log('🔗 Connecting to MongoDB...');
      await client.connect();
      
      const db = client.db('discovr');
      const eventsCollection = db.collection('events');
      
      console.log('🚀 Starting Toronto Botanical Garden event scraping...');
      const addedCount = await scrapeTBGEvents(eventsCollection);
      
      console.log('\n📈 Scraping completed!');
      console.log(`📊 Total events processed: Multiple`);
      console.log(`✅ New events added: ${addedCount}`);
      
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      console.log('🔌 MongoDB connection closed');
      await client.close();
    }
  }
  
  main();
}
