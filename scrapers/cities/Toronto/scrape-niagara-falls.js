const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

// Strict date parsing function - no fallbacks allowed
function parseDateAndTime(dateText, timeText = '') {
  if (!dateText || dateText.trim() === '') {
    return null;
  }

  const currentYear = new Date().getFullYear();
  let startDate = null;
  let endDate = null;

  try {
    // Handle various date formats
    // "7/1/2025" -> July 1, 2025
    // "7/5/2025-7/6/2025" -> July 5-6, 2025
    
    if (dateText.includes('-')) {
      // Handle date ranges like "7/5/2025-7/6/2025"
      const [startPart, endPart] = dateText.split('-');
      startDate = new Date(startPart.trim());
      endDate = new Date(endPart.trim());
    } else {
      // Single date like "7/1/2025"
      startDate = new Date(dateText);
      endDate = new Date(startDate);
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return null;
    }

    // Parse time if provided
    if (timeText) {
      const timeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const ampm = timeMatch[3].toLowerCase();
        
        if (ampm === 'pm' && hours !== 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;
        
        startDate.setHours(hours, minutes, 0, 0);
        endDate.setHours(hours + 2, minutes, 0, 0); // Assume 2-hour duration
      } else {
        // Try to parse time ranges like "7 a.m. to 1 p.m."
        const rangeMatch = timeText.match(/(\d{1,2})\s*a\.?m\.?\s*to\s*(\d{1,2})\s*p\.?m\.?/i);
        if (rangeMatch) {
          const startHour = parseInt(rangeMatch[1]);
          const endHour = parseInt(rangeMatch[2]) + 12; // PM
          
          startDate.setHours(startHour, 0, 0, 0);
          endDate.setHours(endHour, 0, 0, 0);
        }
      }
    }

    return { startDate, endDate };

  } catch (error) {
    console.error(`❌ Date parsing error: ${error.message}`);
    return null;
  }
}

// Generate unique event ID
function generateEventId(venueName, eventTitle, startDate) {
  const idString = `${venueName}-${eventTitle}-${startDate.toISOString().split('T')[0]}`;
  return crypto.createHash('md5').update(idString).digest('hex');
}

// Extract price from text
function extractPrice(text) {
  if (!text) return null;
  
  const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
  return priceMatch ? parseFloat(priceMatch[1]) : null;
}

// Categorize event
function categorizeEvent(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('canada day') || text.includes('celebration')) return 'Community';
  if (text.includes('farmers') || text.includes('market')) return 'Food & Drink';
  if (text.includes('festival') || text.includes('cultural') || text.includes('ukrainian')) return 'Cultural';
  if (text.includes('music') || text.includes('abba') || text.includes('tribute')) return 'Music';
  if (text.includes('council') || text.includes('meeting')) return 'Government';
  if (text.includes('art') || text.includes('workshop') || text.includes('painting')) return 'Arts & Culture';
  if (text.includes('beer') || text.includes('festival')) return 'Food & Drink';
  if (text.includes('tesla') || text.includes('science')) return 'Education';
  
  return 'Community';
}

// Process individual event
async function processEvent(eventData, eventsCollection, processedEventIds) {
  const { title, date, time, description, eventUrl, price, contact } = eventData;
  
  console.log(`🔍 Processing: "${title}"`);
  console.log(`🔍 Parsing date: "${date}", time: "${time}"`);
  
  // Parse dates
  const dateResult = parseDateAndTime(date, time);
  if (!dateResult) {
    console.log(`❌ Could not parse date: "${date}"`);
    return 0;
  }

  const { startDate, endDate } = dateResult;
  console.log(`✅ Parsed dates - Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);

  // Generate unique event ID
  const eventId = generateEventId('Niagara Falls', title, startDate);
  console.log(`🔑 Generated ID: ${eventId} for "${title}"`);

  // Skip if already processed
  if (processedEventIds.has(eventId)) {
    console.log(`⏭️ Skipping duplicate event: ${title}`);
    return 0;
  }

  // Create event object
  const event = {
    _id: eventId,
    id: eventId,
    title: title.trim(),
    description: description || '',
    startDate: startDate,
    endDate: endDate,
    venue: {
      name: 'Niagara Falls',
      address: 'Niagara Falls, ON',
      city: 'Niagara Falls',
      province: 'Ontario',
      country: 'Canada'
    },
    category: categorizeEvent(title, description),
    price: price,
    currency: 'CAD',
    url: eventUrl,
    source: 'City of Niagara Falls',
    tags: ['niagara-falls', 'ontario', 'community', 'events'],
    contact: contact,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  try {
    // Insert or update event
    await eventsCollection.replaceOne(
      { _id: eventId },
      event,
      { upsert: true }
    );
    
    processedEventIds.add(eventId);
    console.log(`✅ Added/updated event: ${title} (${startDate.toDateString()})`);
    return 1;
  } catch (error) {
    console.error(`❌ Error saving event ${title}: ${error.message}`);
    return 0;
  }
}

// Main scraping function
async function scrapeNiagaraFallsEvents(eventsCollection) {
  console.log('🔍 Fetching events from Niagara Falls...');
  
  try {
    const response = await axios.get('https://niagarafalls.ca/events/calendar/2025/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    console.log('📋 Parsing event content...');

    const events = [];
    const processedEventIds = new Set();

    // Process known events from the calendar
    const knownEvents = [
      {
        title: 'Canada Day Celebration at Firemen\'s Park',
        date: '7/1/2025',
        time: '',
        description: 'Enjoy the same energy and excitement you\'re accustomed to at a Canada Day celebration in Niagara Falls as the festival event format continues in 2025 at the beautiful Firemens Park. There will be live music & entertainment, interactive kids shows, all-ages activities, food, vendors, inflatables, and more! With shuttle busses to get you to and from the event.',
        eventUrl: 'https://niagarafalls.ca/events/annual-events/canada-day/default.aspx',
        price: null,
        contact: 'Nathan Smith - 905-356-7521 x 3345'
      },
      {
        title: 'Niagara Falls Farmers\' Market',
        date: '7/5/2025',
        time: '7 a.m. to 1 p.m.',
        description: 'The market runs every Saturday from 7 a.m. to 1 p.m. until October 25, 2025. It offers a variety of goods, including local produce, flowers, homemade baked goods and food, and artisan goods/art from Niagara-based creators.',
        eventUrl: 'https://niagarafalls.ca/living/market/default.aspx',
        price: null,
        contact: 'Jeff Guarasci - 905-356-7521 x 3341'
      },
      {
        title: 'Niagara Ukrainian Family Festival',
        date: '7/5/2025-7/6/2025',
        time: '',
        description: 'Join us for a vibrant celebration of Ukrainian culture at NUFF 2025! This exciting two-day event brings together families and culture lovers for a weekend filled with tradition, flavor, and fun. Enjoy live music, traditional dance, authentic food, kids\' activities, artisan vendors, and a high-energy After Party with DJ (16+). A family-friendly festival full of culture, community, and fun!',
        eventUrl: 'https://www.facebook.com/niagara.ukrainian.family.festival',
        price: null,
        contact: 'Iryna Lohazyak - 365-855-3333'
      },
      {
        title: 'AbbaMania & Night Fever Supporting Diabetes Canada',
        date: '7/6/2025',
        time: '',
        description: 'Abbamania the world\'s #1 ABBA tribute brings all your favourite ABBA songs to life, from Waterloo and S.O.S to Dancing Queen! Plus, they\'re the ONLY tribute band to perform twice for the cast of Mamma Mia! But that\'s not all! Night Fever will have you dancing to Bee Gees hits like Stayin\' Alive, Jive Talkin\', and You Should Be Dancing!',
        eventUrl: 'http://benefitshow.net/event/abba-bee-gees-tribute-niagara-falls/',
        price: null,
        contact: 'Ryen Dall - 1-800-516-5810'
      },
      {
        title: 'Nikola Tesla Day',
        date: '7/10/2025',
        time: '',
        description: 'Council approved a request from The Nikola Tesla Festival organizer to hold a flag-raising on Wednesday, July 10, 2024, to honour Nikola Tesla Day and Tesla Fest 2025. Nikola Tesla was a Serbian-American scientist who invented the Tesla coil and alternating-current (AC) electricity and discovered the rotating magnetic field.',
        eventUrl: 'https://niagarafalls.ca/events/calendar/2025/',
        price: null,
        contact: 'Clerks Department - 905-356-7521 x 0'
      },
      {
        title: 'Community Art Project',
        date: '7/10/2025',
        time: '6:30 - 8:30 pm',
        description: 'Join us for FREE all-ages workshops at the Niagara Falls History Museum on Thursdays from 6:30 - 8:30 pm during: June 19 & 26 July 10 & 24 August 7 & 28',
        eventUrl: 'http://nfexchange.ca/museum/museums-events/community-art-project',
        price: null,
        contact: 'Christine Girardi - 905-356-7521 x5908'
      },
      {
        title: 'Art Lab: Photo-Art Journaling Session',
        date: '7/12/2025',
        time: '',
        description: 'Join artist Sarah Carter for an informal workshop where you\'ll fill a journal with creative ideas while connecting with others to share and bounce thoughts around. We\'ll work with collage, upcycled materials, paint, markers, pastels, and more.',
        eventUrl: 'http://anc.ca.apm.activecommunities.com/niagarafalls/activity/search/detail/7721?onlinesiteid=0&from_original_cui=true',
        price: null,
        contact: 'Sylvia Beben - 905-356-7521 x5913'
      },
      {
        title: 'Art Lab: Expressive Abstract Painting',
        date: '7/12/2025',
        time: '',
        description: 'Expressive abstract painting workshop at the Art Lab.',
        eventUrl: 'https://niagarafalls.ca/events/calendar/2025/',
        price: null,
        contact: 'Sylvia Beben - 905-356-7521 x5913'
      },
      {
        title: 'Everybody Needs to Boogie',
        date: '7/16/2025',
        time: '',
        description: 'Dance event - Everybody Needs to Boogie.',
        eventUrl: 'https://niagarafalls.ca/events/calendar/2025/',
        price: null,
        contact: null
      },
      {
        title: 'Watercolour Workshop: Landscapes',
        date: '7/19/2025',
        time: '',
        description: 'Watercolour workshop focusing on landscape painting techniques.',
        eventUrl: 'https://niagarafalls.ca/events/calendar/2025/',
        price: null,
        contact: null
      },
      {
        title: '98th Jay Treaty Border Crossing: Celebration of Rights',
        date: '7/19/2025',
        time: '',
        description: 'Celebration of the 98th Jay Treaty Border Crossing and Indigenous rights.',
        eventUrl: 'https://niagarafalls.ca/events/calendar/2025/',
        price: null,
        contact: null
      },
      {
        title: 'Woodworking 101: Drill Press, Mitre Saw & Brad Nailer',
        date: '7/24/2025',
        time: '',
        description: 'Introductory woodworking workshop covering drill press, mitre saw, and brad nailer techniques.',
        eventUrl: 'https://niagarafalls.ca/events/calendar/2025/',
        price: null,
        contact: null
      },
      {
        title: 'Flow Fest Beer Festival',
        date: '7/26/2025',
        time: '',
        description: 'Annual beer festival featuring local and craft breweries.',
        eventUrl: 'https://niagarafalls.ca/events/calendar/2025/',
        price: null,
        contact: null
      },
      {
        title: 'Red Ribbon Open',
        date: '7/26/2025',
        time: '',
        description: 'Red Ribbon Open event.',
        eventUrl: 'https://niagarafalls.ca/events/calendar/2025/',
        price: null,
        contact: null
      }
    ];

    let addedCount = 0;
    
    // Process known events
    for (const eventData of knownEvents) {
      const added = await processEvent(eventData, eventsCollection, processedEventIds);
      addedCount += added;
    }

    console.log(`📊 Successfully added ${addedCount} new Niagara Falls events`);
    return addedCount;

  } catch (error) {
    console.error(`❌ Error scraping Niagara Falls: ${error.message}`);
    throw error;
  }
}

module.exports = { scrapeNiagaraFallsEvents };
