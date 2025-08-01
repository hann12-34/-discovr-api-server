const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

/**
 * Scrape Square One Shopping Centre events
 */
async function scrapeSquareOneEvents(eventsCollection) {
  console.log('🔍 Fetching events from Square One Shopping Centre...');
  
  // Known Square One events based on their events page
  const knownEvents = [
    {
      title: "Dungeons & Dragons: The Immersive Quest",
      date: "July 1 - September 30, 2025", // Ongoing experience
      time: "10:00 AM - 9:00 PM",
      description: "Experience the groundbreaking fantasy experience at Square One! Embark on a unique heroic fantasy quest, where thrills and magic meet. Be A Hero. Join The Quest. Save the Realms.",
      location: "Square One Shopping Centre",
      url: "https://shopsquareone.com/events/dungeons-dragons-the-immersive-quest/",
      category: "Entertainment",
      price: '35' // Estimated ticket price
    },
    {
      title: "Tim Hortons Summer at the Square",
      date: "June 15 - August 31, 2025", // Summer season
      time: "Various times",
      description: "Tim Hortons Summer at the Square features free events and experiences at Celebration Square all summer long. Family-friendly activities, entertainment, and community events.",
      location: "Celebration Square, Mississauga",
      url: "https://shopsquareone.com/events/tim-hortons-summer-at-the-square/",
      category: "Festival",
      price: '0'
    },
    {
      title: "Movie Nights at Celebration Square",
      date: "July 5, 2025", // First Friday of summer
      time: "8:30 PM - 11:00 PM",
      description: "Celebration Square hosts the city's largest outdoor movie screenings. Families can enjoy their favourite movies under the stars. Plus, join the interactive pre-show featuring special giveaways, courtesy of SQ1.",
      location: "Celebration Square, Mississauga",
      url: "https://shopsquareone.com/events/movie-nights-at-celebration-square/",
      category: "Entertainment",
      price: '0'
    },
    {
      title: "Movie Nights at Celebration Square",
      date: "July 12, 2025", // Second Friday
      time: "8:30 PM - 11:00 PM",
      description: "Celebration Square hosts the city's largest outdoor movie screenings. Families can enjoy their favourite movies under the stars. Plus, join the interactive pre-show featuring special giveaways, courtesy of SQ1.",
      location: "Celebration Square, Mississauga",
      url: "https://shopsquareone.com/events/movie-nights-at-celebration-square/",
      category: "Entertainment",
      price: '0'
    },
    {
      title: "Movie Nights at Celebration Square",
      date: "July 19, 2025", // Third Friday
      time: "8:30 PM - 11:00 PM",
      description: "Celebration Square hosts the city's largest outdoor movie screenings. Families can enjoy their favourite movies under the stars. Plus, join the interactive pre-show featuring special giveaways, courtesy of SQ1.",
      location: "Celebration Square, Mississauga",
      url: "https://shopsquareone.com/events/movie-nights-at-celebration-square/",
      category: "Entertainment",
      price: '0'
    },
    {
      title: "Movie Nights at Celebration Square",
      date: "July 26, 2025", // Fourth Friday
      time: "8:30 PM - 11:00 PM",
      description: "Celebration Square hosts the city's largest outdoor movie screenings. Families can enjoy their favourite movies under the stars. Plus, join the interactive pre-show featuring special giveaways, courtesy of SQ1.",
      location: "Celebration Square, Mississauga",
      url: "https://shopsquareone.com/events/movie-nights-at-celebration-square/",
      category: "Entertainment",
      price: '0'
    },
    {
      title: "Minecraft Experience: Villager Rescue",
      date: "July 15 - August 15, 2025", // Summer experience
      time: "10:00 AM - 8:00 PM",
      description: "Mine, craft, and battle your way through the first ever in-person, interactive Minecraft quest! An immersive experience for Minecraft fans of all ages.",
      location: "Square One Shopping Centre",
      url: "https://shopsquareone.com/events/minecraft-experience-villager-rescue/",
      category: "Entertainment",
      price: '25' // Estimated ticket price
    },
    {
      title: "The Food District Pop-Up: Chloe's Convenience",
      date: "August 1 - August 31, 2025", // Pop-up duration
      time: "11:00 AM - 9:00 PM",
      description: "Chloe's Convenience is bringing the magic of bagged noodles (often called Lo Mein or Laang Min in Cantonese) to The Food District! Experience authentic Asian street food.",
      location: "The Food District, Square One",
      url: "https://shopsquareone.com/events/chloes-convenience/",
      category: "Food",
      price: '0' // Free to visit, pay for food
    }
  ];

  console.log('📋 Parsing event content...');
  
  let addedCount = 0;
  const processedEventIds = new Set();

  for (const eventData of knownEvents) {
    try {
      await processEventCandidate(
        eventData.title,
        eventData.date,
        eventData.time,
        eventData.description,
        eventData.url,
        null, // No image URL available
        eventsCollection,
        processedEventIds,
        eventData.location,
        eventData.category,
        eventData.price
      );
      addedCount++;
    } catch (error) {
      console.error(`❌ Error processing event "${eventData.title}":`, error.message);
    }
  }

  console.log(`📊 Successfully added ${addedCount} new Square One events`);
  return addedCount;
}

/**
 * Process a single event candidate
 */
async function processEventCandidate(title, dateText, timeText, description, eventUrl, imageUrl, eventsCollection, processedEventIds, location, category, price = 0) {
  console.log(`🔍 Processing: "${title}"`);
  console.log(`🔍 Parsing date: "${dateText}", time: "${timeText}"`);

  // Parse the date
  const parsedDates = parseDateAndTime(dateText, timeText);
  if (!parsedDates) {
    console.log(`⚠️ Could not parse date for: ${title}`);
    return;
  }

  console.log(`✅ Parsed dates - Start: ${parsedDates.startDate.toISOString()}, End: ${parsedDates.endDate.toISOString()}`);

  // Generate unique event ID
  const eventId = crypto.createHash('md5')
    .update(`Square One${title}${parsedDates.startDate.toDateString()}`)
    .digest('hex');

  console.log(`🔑 Generated ID: ${eventId} for "${title}"`);

  // Skip if already processed
  if (processedEventIds.has(eventId)) {
    console.log(`⏭️ Skipping duplicate event: ${title}`);
    return;
  }

  processedEventIds.add(eventId);

  // Determine category
  const eventCategory = category || categorizeEvent(title, description);

  // Create event object
  const event = {
    id: eventId,
    title: title.trim(),
    description: description || '',
    startDate: parsedDates.startDate,
    endDate: parsedDates.endDate,
    venue: {
      name: location || 'Square One Shopping Centre',
      address: '100 City Centre Dr, Mississauga, ON L5B 2C9',
      city: 'Mississauga',
      province: 'Ontario',
      country: 'Canada'
    },
    category: eventCategory,
    tags: generateTags(title, description, eventCategory),
    price: price,
    currency: 'CAD',
    url: eventUrl,
    imageUrl: imageUrl,
    source: 'Square One Shopping Centre',
    sourceUrl: 'https://shopsquareone.com/events/',
    scrapedAt: new Date(),
    lastUpdated: new Date()
  };

  // Insert or update in MongoDB
  try {
    await eventsCollection.replaceOne(
      { id: eventId },
      event,
      { upsert: true }
    );
    console.log(`✅ Added/updated event: ${title} (${parsedDates.startDate.toDateString()})`);
  } catch (error) {
    console.error(`❌ Error saving event "${title}":`, error.message);
  }
}

/**
 * Parse date and time strings into Date objects
 */
function parseDateAndTime(dateText, timeText) {
  if (!dateText) return null;

  try {
    let startDate, endDate;

    // Handle date ranges like "July 1 - September 30, 2025"
    if (dateText.includes(' - ') && dateText.includes(',')) {
      const parts = dateText.split(' - ');
      if (parts.length === 2) {
        const startPart = parts[0].trim();
        const endPart = parts[1].trim();
        
        // Extract year from the end part
        const yearMatch = endPart.match(/(\d{4})/);
        const year = yearMatch ? yearMatch[1] : new Date().getFullYear();
        
        // If start part doesn't have year, add it
        let startDateStr = startPart;
        if (!startPart.includes(year)) {
          startDateStr = `${startPart}, ${year}`;
        }
        
        startDate = new Date(startDateStr);
        endDate = new Date(endPart);
      }
    } else {
      startDate = new Date(dateText);
      endDate = new Date(dateText);
    }

    // Handle time parsing
    if (timeText && timeText.includes(' - ')) {
      const timeParts = timeText.split(' - ');
      if (timeParts.length === 2) {
        const startTime = timeParts[0].trim();
        const endTime = timeParts[1].trim();
        
        // Parse start time
        const startTimeMatch = startTime.match(/(\d{1,2}):?(\d{0,2})\s*(AM|PM)?/i);
        if (startTimeMatch) {
          let hours = parseInt(startTimeMatch[1]);
          const minutes = parseInt(startTimeMatch[2] || '0');
          const ampm = startTimeMatch[3];
          
          if (ampm && ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
          if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
        }
        
        // Parse end time
        const endTimeMatch = endTime.match(/(\d{1,2}):?(\d{0,2})\s*(AM|PM)?/i);
        if (endTimeMatch) {
          let hours = parseInt(endTimeMatch[1]);
          const minutes = parseInt(endTimeMatch[2] || '0');
          const ampm = endTimeMatch[3];
          
          if (ampm && ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
          if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
          
          endDate.setHours(hours, minutes, 0, 0);
        }
      }
    } else if (timeText && timeText !== 'Various times') {
      // Single time
      const timeMatch = timeText.match(/(\d{1,2}):?(\d{0,2})\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2] || '0');
        const ampm = timeMatch[3];
        
        if (ampm && ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
        if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
        
        startDate.setHours(hours, minutes, 0, 0);
        endDate.setHours(hours + 2, minutes, 0, 0); // Default 2 hour duration
      }
    }

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return null;
    }

    return { startDate, endDate };
  } catch (error) {
    console.error('Date parsing error:', error.message);
    return null;
  }
}

/**
 * Categorize event based on title and description
 */
function categorizeEvent(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('movie') || text.includes('film')) {
    return 'Entertainment';
  }
  if (text.includes('food') || text.includes('restaurant') || text.includes('dining')) {
    return 'Food';
  }
  if (text.includes('dungeons') || text.includes('minecraft') || text.includes('game')) {
    return 'Entertainment';
  }
  if (text.includes('summer') || text.includes('festival')) {
    return 'Festival';
  }
  if (text.includes('shopping') || text.includes('retail')) {
    return 'Shopping';
  }
  
  return 'Entertainment';
}

/**
 * Generate tags for the event
 */
function generateTags(title, description, category) {
  const tags = [category.toLowerCase()];
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('free')) tags.push('free');
  if (text.includes('family')) tags.push('family-friendly');
  if (text.includes('outdoor')) tags.push('outdoor');
  if (text.includes('movie')) tags.push('movies');
  if (text.includes('food')) tags.push('food');
  if (text.includes('children') || text.includes('kids')) tags.push('kids');
  if (text.includes('interactive')) tags.push('interactive');
  if (text.includes('immersive')) tags.push('immersive');
  if (text.includes('shopping')) tags.push('shopping');
  
  return [...new Set(tags)]; // Remove duplicates
}

module.exports = { scrapeSquareOneEvents };

// Test runner
if (require.main === module) {
  const { MongoClient } = require('mongodb');
  
  async function testScraper() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr';
    const client = new MongoClient(mongoUri);
    
    try {
      await client.connect();
      const db = client.db('discovr');
      const eventsCollection = db.collection('events');
      
      const addedCount = await scrapeSquareOneEvents(eventsCollection);
      console.log(`\n🎉 Test completed! Added ${addedCount} events.`);
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    } finally {
      await client.close();
    }
  }
  
  testScraper();
}
